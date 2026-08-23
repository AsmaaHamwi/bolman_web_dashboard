import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { registerWebFcmToken } from '../../lib/firebase';
import { useAuth } from './AuthProvider';
import { HeroBanner } from '../../components/animations/HeroBanner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { useUiStore } from '../../stores/useUiStore';
import { getDefaultDashboardPath } from '../../config/permissions';
import { useI18n } from '../../hooks/useI18n';

const marqueeCities = ['دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 'إدلب', 'الرقة', 'دير الزور', 'السويداء'];

export function LoginPage() {
  const { session, profile, loading: authLoading } = useAuth();
  const { theme, toggleTheme } = useUiStore();
  const { locale, messages, toggleLocale } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) {
    if (authLoading || !profile) {
      return (
        <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-bolman-dark text-bolman-purple">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm font-medium">{messages.common.loading}</span>
          </div>
        </div>
      );
    }
    return <Navigate to={getDefaultDashboardPath(profile)} replace />;
  }

  function getFormattedErrorMessage(rawMessage?: string): string {
    if (!rawMessage) return messages.auth.errorGeneric;
    const msg = rawMessage.toLowerCase();

    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch failed')) {
      return messages.auth.errorFailedToFetch;
    }
    if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
      return messages.auth.errorInvalidCredentials;
    }
    if (msg.includes('email not confirmed')) {
      return messages.auth.errorEmailNotConfirmed;
    }
    if (msg.includes('user not found') || msg.includes('user_not_found')) {
      return messages.auth.errorUserNotFound;
    }
    if (msg.includes('too many requests') || msg.includes('rate limit')) {
      return messages.auth.errorTooManyRequests;
    }
    return rawMessage;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(getFormattedErrorMessage(error.message));
        return;
      }

      if ('Notification' in window) {
        const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
        if (permission === 'granted') {
          await registerWebFcmToken();
        }
      }
    } catch (err: any) {
      setError(getFormattedErrorMessage(err?.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(184,176,255,.25),transparent_28%),linear-gradient(135deg,#f7f7fb,#ecebff)] p-6 dark:bg-[radial-gradient(circle_at_top_left,rgba(108,99,255,.25),transparent_25%),linear-gradient(135deg,#12131A,#1B1D27)]">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-2">
          <div className="hidden flex-col justify-center lg:flex">
            <HeroBanner
              title={messages.auth.heroTitle}
              phrases={[messages.auth.heroPhrase1, messages.auth.heroPhrase2, messages.auth.heroPhrase3]}
              marqueeItems={marqueeCities}
            />
            <p className="mt-5 max-w-lg text-base text-slate-600 dark:text-slate-300">{messages.auth.heroSubtitle}</p>
            <div className="mt-6 flex gap-3">
              <span className="rounded-full bg-bolman-softMint px-4 py-2 text-sm font-bold text-bolman-deep">{messages.auth.authChip}</span>
              <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-bolman-deep dark:bg-white/10 dark:text-violet-200">{messages.auth.uiChip}</span>
            </div>
          </div>
          <Card className="bolman-fade-up mx-auto w-full max-w-md p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">{messages.auth.loginTitle}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{messages.auth.loginSubtitle}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={toggleLocale}>
                  {locale.toUpperCase()}
                </Button>
                <Button type="button" variant="secondary" onClick={toggleTheme}>
                  {theme === 'dark' ? '☀️' : '🌙'}
                </Button>
              </div>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <Field label={messages.auth.emailLabel}>
                <div className="relative">
                  <Mail className="absolute start-3 top-3.5 text-slate-400" size={18} />
                  <Input className="ps-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </Field>
              <Field label={messages.auth.passwordLabel}>
                <div className="relative">
                  <Lock className="absolute start-3 top-3.5 text-slate-400" size={18} />
                  <Input className="ps-10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </Field>
              {error && <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
              <Button className="w-full transition-transform active:scale-[0.98]" disabled={loading}>
                {loading ? messages.auth.loggingIn : messages.auth.loginButton}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
