import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, Mail, MailCheck } from 'lucide-react';
import { AuthAlert, AuthShell } from './AuthShell';
import { Button } from '../../components/ui/Button';
import { Field, Input, PasswordInput } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import {
  confirmPasswordReset,
  mapPasswordError,
  sendPasswordResetCode,
  validateNewPassword,
} from './passwordApi';

type Step = 'email' | 'code' | 'done';

/**
 * Public two-step password recovery, matching the mobile app's flow: request a code by email, then
 * enter that code together with the new password. The code field also accepts the reset link (or a
 * bare token) pasted from the email, so the flow works whichever Supabase template is configured.
 */
export function ForgotPasswordPage() {
  const { messages } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(messages.common.invalidEmail);
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetCode(trimmed);
      setSentTo(trimmed);
      setStep('code');
      setNotice(messages.auth.codeSent);
    } catch (err) {
      setError(mapPasswordError(err, messages));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await sendPasswordResetCode(sentTo);
      setNotice(messages.auth.codeSent);
    } catch (err) {
      setError(mapPasswordError(err, messages));
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!code.trim()) {
      setError(messages.auth.errorCodeRequired);
      return;
    }
    const invalid = validateNewPassword(password, confirm, messages);
    if (invalid) {
      setError(invalid);
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(sentTo, code, password);
      setStep('done');
    } catch (err) {
      setError(mapPasswordError(err, messages));
    } finally {
      setLoading(false);
    }
  }

  function backToEmail() {
    setCode('');
    setPassword('');
    setConfirm('');
    setError(null);
    setNotice(null);
    setStep('email');
  }

  if (step === 'done') {
    return (
      <AuthShell
        title={messages.auth.passwordResetSuccess}
        subtitle={messages.auth.passwordResetSuccessHint}
        icon={<CheckCircle2 size={44} className="text-emerald-500" />}
      >
        {/* verifyOtp opened a real session, so the dashboard is reachable straight away. */}
        <Button className="w-full" onClick={() => navigate('/', { replace: true })}>
          {messages.auth.goToDashboard}
        </Button>
      </AuthShell>
    );
  }

  if (step === 'code') {
    return (
      <AuthShell
        title={messages.auth.enterCodeTitle}
        subtitle={messages.auth.enterCodeSubtitle}
        icon={<MailCheck size={44} />}
      >
        <p className="mb-4 truncate text-sm font-bold text-bolman-purple dark:text-violet-300">{sentTo}</p>
        <form onSubmit={confirmReset} className="space-y-4">
          <Field label={messages.auth.codeLabel}>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              inputMode="text"
              required
            />
          </Field>
          <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">{messages.auth.codeHint}</p>
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
          {!error && notice && <AuthAlert tone="success">{notice}</AuthAlert>}
          <Button className="w-full" loading={loading}>
            {loading ? messages.auth.saving : messages.auth.setNewPassword}
          </Button>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={resend} disabled={loading}>
              {messages.auth.resendCode}
            </Button>
            <Button type="button" variant="ghost" onClick={backToEmail} disabled={loading}>
              {messages.auth.changeEmail}
            </Button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={messages.auth.forgotTitle} subtitle={messages.auth.forgotSubtitle} icon={<KeyRound size={44} />}>
      <form onSubmit={sendCode} className="space-y-4">
        <Field label={messages.auth.emailLabel}>
          <div className="relative">
            <Mail className="absolute start-3 top-3.5 text-slate-400" size={18} aria-hidden />
            <Input
              className="ps-10"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </Field>
        {error && <AuthAlert tone="error">{error}</AuthAlert>}
        <Button className="w-full" loading={loading}>
          {loading ? messages.auth.sending : messages.auth.sendResetCode}
        </Button>
        <Link
          to="/login"
          className="block text-center text-sm font-semibold text-bolman-purple hover:underline dark:text-violet-300"
        >
          {messages.auth.backToLogin}
        </Link>
      </form>
    </AuthShell>
  );
}
