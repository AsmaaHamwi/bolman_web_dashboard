import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { registerWebFcmToken } from '../../lib/firebase';
import type { Profile } from '../../types/domain';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True while the profile row is being fetched, independent of the boot `loading` flag. */
  profileLoading: boolean;
  /** Set when the profile fetch failed; the dashboard renders empty without a profile. */
  profileError: string | null;
  /**
   * Set when the boot session check failed while a token is still stored locally. The user is
   * NOT signed out in that case, so routes must offer a retry instead of sending them to /login.
   */
  sessionError: string | null;
  retrySession: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CACHED_PROFILE_KEY = 'bolman_cached_profile';
const PROFILE_FETCH_TIMEOUT_MS = 12_000;
const SESSION_FETCH_TIMEOUT_MS = 15_000;

/**
 * The Supabase client call has no built-in timeout, so a stalled/dropped connection (seen
 * intermittently against this backend) leaves the awaiting promise pending forever. That used
 * to freeze `loadProfile` mid-flight with no error and no way out other than a manual refresh.
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function hasStoredSupabaseSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token')) && key.endsWith('-auth-token')) {
        const item = localStorage.getItem(key);
        if (item && item.includes('access_token')) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function getCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(CACHED_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cachedProfile = getCachedProfile();

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  /**
   * Boot gate. It has to stay `true` until `getSession()` actually answers: the stored token is
   * only readable asynchronously, so clearing this early leaves `session` looking `null` and
   * sends an already signed-in user to /login on every refresh.
   */
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const registeredUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  /** User id whose profile is already loaded/loading, so token refreshes don't refetch it. */
  const profileUserIdRef = useRef<string | null>(cachedProfile?.id ?? null);
  const profileRef = useRef<Profile | null>(cachedProfile);
  profileRef.current = profile;

  const loadProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      profileUserIdRef.current = null;
      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      localStorage.removeItem(CACHED_PROFILE_KEY);
      return;
    }
    profileUserIdRef.current = userId;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { data, error } = await withTimeout(
        supabase.from('users').select('*').eq('id', userId).single(),
        PROFILE_FETCH_TIMEOUT_MS,
        'انتهت مهلة الاتصال بالخادم أثناء تحميل ملفك الشخصي. تحقّق من اتصال الإنترنت وحاول مجددًا.',
      );
      if (!mountedRef.current) return;
      if (error) {
        // Without a profile the layout has no role to work with and renders an empty shell,
        // so the failure has to reach the UI instead of only the console.
        console.error('loadProfile error:', error);
        setProfileError(error.message);
        return;
      }
      setProfile(data as Profile);
      setProfileError(null);
      try {
        localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    } catch (e) {
      console.error('loadProfile unexpected error:', e);
      if (mountedRef.current) setProfileError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setProfileLoading(false);
    }
  }, []);

  const checkSession = useCallback(async () => {
    setSessionError(null);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_FETCH_TIMEOUT_MS,
        'انتهت مهلة التحقق من الجلسة.',
      );
      if (!mountedRef.current) return;
      if (error) throw error;

      setSession(data.session);
      await loadProfile(data.session?.user.id ?? null);
    } catch (err) {
      console.error('getSession error:', err);
      if (!mountedRef.current) return;
      // A failed check is not a sign-out. Only fall through to /login when there is genuinely no
      // token on this device; otherwise surface a retry so the session is kept.
      if (hasStoredSupabaseSession()) {
        setSessionError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    mountedRef.current = true;
    void checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mountedRef.current) return;

      setSession(nextSession);
      // Only lift the boot gate on a definite answer — an event carrying no session before
      // `getSession()` has replied must not be read as "signed out".
      if (nextSession || event === 'SIGNED_OUT') setLoading(false);
      if (nextSession) setSessionError(null);

      const userId = nextSession?.user.id ?? null;
      if (!userId) {
        if (event === 'SIGNED_OUT') void loadProfile(null);
        return;
      }
      // A token refresh (fired whenever the tab regains focus) carries the same user; refetching
      // the profile there is what used to freeze the dashboard on a full-screen spinner.
      if (profileUserIdRef.current === userId && profileRef.current) return;

      // Marked synchronously so routes show a spinner instead of the "profile failed" screen
      // during the deferred fetch below.
      setProfileLoading(true);
      // Supabase holds its auth lock for the duration of this callback, so any `supabase.*` call
      // made inside it deadlocks. Defer the query out of the callback.
      setTimeout(() => {
        if (!mountedRef.current) return;
        void loadProfile(userId);
      }, 0);
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, [checkSession, loadProfile]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      registeredUserIdRef.current = null;
      return;
    }
    if (registeredUserIdRef.current === userId) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    registeredUserIdRef.current = userId;
    registerWebFcmToken().catch((error) => console.error('FCM registration failed', error));
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      profileLoading,
      profileError,
      sessionError,
      retrySession: async () => {
        setLoading(true);
        await checkSession();
      },
      signOut: async () => {
        try {
          localStorage.removeItem(CACHED_PROFILE_KEY);
          localStorage.removeItem('bolman_cached_company_id');
        } catch {
          // ignore
        }
        profileUserIdRef.current = null;
        setProfile(null);
        setProfileError(null);
        setSessionError(null);
        setSession(null);
        await supabase.auth.signOut().catch((err) => console.error('signOut error:', err));
      },
      refreshProfile: async () => loadProfile(session?.user.id ?? profileUserIdRef.current),
    }),
    [session, profile, loading, profileLoading, profileError, sessionError, checkSession, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
