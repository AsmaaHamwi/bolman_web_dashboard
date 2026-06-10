import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Bus, Lock, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthProvider';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Input';
import { useUiStore } from '../../stores/useUiStore';
import { getDefaultDashboardPath } from '../../config/permissions';
import { useI18n } from '../../hooks/useI18n';

export function LoginPage() {
  const { session, profile } = useAuth();
  const { theme, toggleTheme } = useUiStore();
  const { locale, messages, toggleLocale } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to={getDefaultDashboardPath(profile)} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(139,233,193,.25),transparent_28%),linear-gradient(135deg,#f7f7fb,#ecebff)] p-6 dark:bg-[radial-gradient(circle_at_top_left,rgba(108,99,255,.25),transparent_25%),linear-gradient(135deg,#12131A,#1B1D27)]">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-2">
          <div className="hidden flex-col justify-center lg:flex">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-bolman-purple text-white shadow-glow">
              <Bus />
            </div>
            <h1 className="max-w-xl text-5xl font-black leading-tight text-slate-950 dark:text-white">{messages.auth.heroTitle}</h1>
            <p className="mt-5 max-w-lg text-lg text-slate-600 dark:text-slate-300">{messages.auth.heroSubtitle}</p>
            <div className="mt-8 flex gap-3">
              <span className="rounded-full bg-bolman-softMint px-4 py-2 text-sm font-bold text-emerald-700">{messages.auth.authChip}</span>
              <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-bolman-deep dark:bg-white/10 dark:text-violet-200">{messages.auth.uiChip}</span>
            </div>
          </div>
          <Card className="mx-auto w-full max-w-md p-8">
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
              <Button className="w-full" disabled={loading}>
                {loading ? messages.auth.loggingIn : messages.auth.loginButton}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
