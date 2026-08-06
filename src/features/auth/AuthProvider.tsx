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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const registeredUserIdRef = useRef<string | null>(null);

  async function loadProfile(userId?: string) {
    const id = userId || session?.user.id;
    if (!id) { setProfile(null); return; }
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) throw error;
    setProfile(data as Profile);
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user.id) {
        try { await loadProfile(data.session.user.id); } catch (e) { console.error(e); }
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user.id) loadProfile(nextSession.user.id).catch(console.error);
      else setProfile(null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
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

  const value = useMemo<AuthContextValue>(() => ({
    session, profile, loading,
    signOut: async () => { await supabase.auth.signOut(); },
    refreshProfile: async () => loadProfile(),
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
