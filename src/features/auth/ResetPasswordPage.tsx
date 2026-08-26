import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';
import { AuthAlert, AuthShell } from './AuthShell';
import { Button } from '../../components/ui/Button';
import { Field, PasswordInput } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { useAuth } from './AuthProvider';
import { clearRecoveryRedirect, recoveryLink } from './recoveryLink';
import { applyRecoveryPassword, mapPasswordError, validateNewPassword } from './passwordApi';

/**
 * Landing page for the link in the recovery email. The Supabase client turns the token in the URL
 * into a session on boot, so all that is left here is collecting the new password. Users who type
 * the 6-digit code instead go through ForgotPasswordPage.
 */
export function ResetPasswordPage() {
  const { messages } = useI18n();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Reaching this page consumes the recovery marker, so navigating away doesn't bounce back here.
  useEffect(() => clearRecoveryRedirect(), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const invalid = validateNewPassword(password, confirm, messages);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    try {
      await applyRecoveryPassword(password);
      setDone(true);
    } catch (err) {
      setError(mapPasswordError(err, messages));
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        title={messages.auth.passwordResetSuccess}
        subtitle={messages.auth.passwordResetSuccessHint}
        icon={<CheckCircle2 size={44} className="text-emerald-500" />}
      >
        <Button className="w-full" onClick={() => navigate('/', { replace: true })}>
          {messages.auth.goToDashboard}
        </Button>
      </AuthShell>
    );
  }

  if (authLoading) {
    return (
      <AuthShell title={messages.auth.resetLinkTitle} subtitle={messages.auth.verifyingLink}>
        <div className="grid place-items-center py-6 text-bolman-purple">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AuthShell>
    );
  }

  // No session once the boot check has answered means the link was already used, expired, or was
  // never a recovery link at all. Supabase's own reason, when it sent one, is worth showing.
  if (!session) {
    return (
      <AuthShell
        title={messages.auth.resetLinkInvalidTitle}
        subtitle={messages.auth.resetLinkInvalid}
        icon={<ShieldAlert size={44} className="text-red-500" />}
      >
        <div className="space-y-4">
          {recoveryLink?.error && <AuthAlert tone="error">{recoveryLink.error}</AuthAlert>}
          <Link to="/forgot-password">
            <Button className="w-full">{messages.auth.requestNewCode}</Button>
          </Link>
          <Link
            to="/login"
            className="block text-center text-sm font-semibold text-bolman-purple hover:underline dark:text-violet-300"
          >
            {messages.auth.backToLogin}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={messages.auth.resetLinkTitle}
      subtitle={messages.auth.resetLinkSubtitle}
      icon={<LockKeyhole size={44} />}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={messages.auth.newPasswordLabel}>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            showLabel={messages.auth.showPassword}
            hideLabel={messages.auth.hidePassword}
            required
          />
        </Field>
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">{messages.auth.passwordHint}</p>
        <Field label={messages.auth.confirmPasswordLabel}>
          <PasswordInput
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            showLabel={messages.auth.showPassword}
            hideLabel={messages.auth.hidePassword}
            required
          />
        </Field>
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <Button className="w-full" loading={saving}>
          {saving ? messages.auth.saving : messages.auth.setNewPassword}
        </Button>
      </form>
    </AuthShell>
  );
}
