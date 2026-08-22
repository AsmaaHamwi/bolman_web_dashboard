import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { registerWebFcmToken } from '../../lib/firebase';
import type { Profile } from '../../types/domain';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const CACHED_PROFILE_KEY = 'bolman_cached_profile';

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
  const hasLocalToken = hasStoredSupabaseSession();
  const cachedProfile = getCachedProfile();

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  // Only show loading on boot if there is an actual token in localStorage to verify
  const [loading, setLoading] = useState(hasLocalToken && !cachedProfile);
  const registeredUserIdRef = useRef<string | null>(null);

  async function loadProfile(userId?: string) {
    const id = userId || session?.user.id;
    if (!id) {
      setProfile(null);
      localStorage.removeItem(CACHED_PROFILE_KEY);
      return;
    }
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
      if (error) {
        console.error('loadProfile error:', error);
        return;
      }
      setProfile(data as Profile);
      try {
        localStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(data));
      } catch {
        // ignore
      }
    } catch (e) {
      console.error('loadProfile unexpected error:', e);
    }
  }

  useEffect(() => {
    let mounted = true;

    // Safety timeout: Never leave the user stuck on loading for more than 2.5s
    const timeout = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2500);

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user.id) {
          try {
            await loadProfile(data.session.user.id);
          } catch (e) {
            console.error(e);
          }
        } else {
          setProfile(null);
          localStorage.removeItem(CACHED_PROFILE_KEY);
        }
      })
      .catch((err) => {
        console.error('getSession error:', err);
      })
      .finally(() => {
        if (mounted) {
          window.clearTimeout(timeout);
          setLoading(false);
        }
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      if (nextSession?.user.id) {
        setLoading(true);
        try {
          await loadProfile(nextSession.user.id);
        } catch (e) {
          console.error(e);
        } finally {
          if (mounted) {
            setSession(nextSession);
            setLoading(false);
          }
        }
      } else {
        setSession(null);
        setProfile(null);
        localStorage.removeItem(CACHED_PROFILE_KEY);
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);


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
      signOut: async () => {
        try {
          localStorage.removeItem(CACHED_PROFILE_KEY);
          localStorage.removeItem('bolman_cached_company_id');
        } catch {
          // ignore
        }
        setProfile(null);
        setSession(null);
        await supabase.auth.signOut().catch((err) => console.error('signOut error:', err));
      },
      refreshProfile: async () => loadProfile(),
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

