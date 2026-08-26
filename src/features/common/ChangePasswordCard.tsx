import { useState } from 'react';
import { ChevronDown, KeyRound } from 'lucide-react';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field, PasswordInput } from '../../components/ui/Input';
import { useI18n } from '../../hooks/useI18n';
import { changePassword, mapPasswordError, validateNewPassword } from '../auth/passwordApi';

/**
 * Password change for the signed-in user; the current password is re-verified before the swap.
 * Collapsed by default — this is a rarely-used action, so the form only expands on demand instead
 * of taking up permanent space on the settings page.
 */
export function ChangePasswordCard() {
  const { messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!current) {
      setError(messages.settings.errorCurrentPasswordRequired);
      return;
    }
    const invalid = validateNewPassword(next, confirm, messages);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (next === current) {
      setError(messages.settings.errorSamePassword);
      return;
    }

    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setSuccess(true);
    } catch (err) {
      setError(mapPasswordError(err, messages));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-start"
      >
        <CardTitle>{messages.settings.passwordTitle}</CardTitle>
        <ChevronDown
          size={20}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open && (
        <>
          <p className="my-3 text-sm text-slate-500 dark:text-slate-400">{messages.settings.passwordDescription}</p>
          <form onSubmit={submit} className="space-y-4">
            <Field label={messages.settings.currentPassword}>
              <PasswordInput
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                showLabel={messages.auth.showPassword}
                hideLabel={messages.auth.hidePassword}
              />
            </Field>
            <Field label={messages.settings.newPassword}>
              <PasswordInput
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                showLabel={messages.auth.showPassword}
                hideLabel={messages.auth.hidePassword}
              />
            </Field>
            <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">{messages.auth.passwordHint}</p>
            <Field label={messages.settings.confirmNewPassword}>
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                showLabel={messages.auth.showPassword}
                hideLabel={messages.auth.hidePassword}
              />
            </Field>
            {error && (
              <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                {messages.settings.passwordChanged}
              </div>
            )}
            <Button className="w-full sm:w-auto" loading={saving}>
              <KeyRound size={18} />
              {saving ? messages.auth.saving : messages.settings.savePassword}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
