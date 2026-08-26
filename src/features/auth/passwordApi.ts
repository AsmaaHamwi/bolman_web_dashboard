import { supabase } from '../../lib/supabase';
import type { Messages } from '../../i18n';

/** Matches the minimum the mobile app enforces, and Supabase's own default. */
export const MIN_PASSWORD_LENGTH = 8;

/** Absolute URL the recovery email should send the user back to. */
export function passwordResetRedirectUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${window.location.origin}${prefix}reset-password`;
}

/**
 * Changes the password of the signed-in user after re-verifying the current one.
 *
 * `updateUser` alone accepts any new password for an open session, which would let anyone using an
 * unattended browser take over the account. Re-signing in with the current password first is the
 * same guard the mobile app applies.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const email = data.session?.user.email;
  if (!email) throw new Error('AUTHENTICATION_REQUIRED');

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  // A failed sign-in leaves the existing session untouched, so the user stays logged in.
  if (signInError) throw signInError;

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Sends the recovery email (6-digit code and/or link, per the Supabase email template). */
export async function sendPasswordResetCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: passwordResetRedirectUrl(),
  });
  if (error) throw error;
}

/**
 * Verifies a recovery code and sets the new password.
 *
 * Accepts either the numeric `{{ .Token }}` from the email, or — so the flow still works with
 * Supabase's default link-only template — a pasted reset link or raw token hash.
 */
export async function confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
  const input = code.trim();
  // Digits only; spaces and dashes are tolerated because the email renders the code letter-spaced.
  // Supabase's OTP length is configurable (6-10), so it must not be hard-coded to 6.
  const compact = input.replace(/[\s‐-―−-]/g, '');

  if (/^\d{6,10}$/.test(compact)) {
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', email: email.trim(), token: compact });
    if (error) throw error;
  } else {
    const hash = extractTokenHash(input);
    if (!hash) throw new Error('INVALID_RESET_CODE');
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: hash });
    if (error) throw error;
  }

  // verifyOtp already persisted a real session. If setting the password now fails, that session has
  // to go: otherwise the tab is left signed in with the OLD password still in force.
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    await supabase.auth.signOut().catch(() => undefined);
    throw error;
  }
}

/** Sets the password for the recovery session opened by clicking the link in the email. */
export async function applyRecoveryPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Pulls the recovery token out of a pasted Supabase verify link, or accepts a bare token hash. */
export function extractTokenHash(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return null;
    }
    for (const key of ['token', 'token_hash', 'confirmation_token']) {
      const value = url.searchParams.get(key)?.trim();
      if (value) return value;
    }
    const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    if (fragment) {
      const parsed = new URLSearchParams(fragment);
      for (const key of ['token', 'token_hash']) {
        const value = parsed.get(key)?.trim();
        if (value) return value;
      }
    }
    return null;
  }
  // A bare token hash pasted on its own.
  return /^[A-Za-z0-9_-]{16,}$/.test(trimmed) ? trimmed : null;
}

/** Client-side checks shared by every password form. Returns a localized message, or null if valid. */
export function validateNewPassword(
  next: string,
  confirm: string,
  messages: Messages,
): string | null {
  if (next.length < MIN_PASSWORD_LENGTH) return messages.auth.errorPasswordShort;
  if (next !== confirm) return messages.auth.errorPasswordMismatch;
  return null;
}

/** Maps a Supabase auth error onto the dictionary, mirroring the mobile app's `mapError`. */
export function mapPasswordError(error: unknown, messages: Messages): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const m = raw.toLowerCase();
  if (!m) return messages.common.unexpectedError;

  if (m.includes('failed to fetch') || m.includes('network') || m.includes('fetch failed')) {
    return messages.auth.errorFailedToFetch;
  }
  if (m.includes('authentication_required') || m.includes('authentication required')) {
    return messages.auth.errorAuthRequired;
  }
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return messages.settings.errorCurrentPasswordWrong;
  }
  if (
    m.includes('invalid_reset_code') ||
    m.includes('token has expired or is invalid') ||
    m.includes('otp_expired') ||
    m.includes('invalid or has expired')
  ) {
    return messages.auth.errorResetCodeInvalid;
  }
  if (m.includes('new password should be different')) return messages.settings.errorSamePassword;
  if (m.includes('password should be at least') || m.includes('password_too_short')) {
    return messages.auth.errorPasswordShort;
  }
  if (m.includes('for security purposes') || m.includes('over_email_send_rate_limit')) {
    return messages.auth.errorEmailRateLimited;
  }
  if (m.includes('too many requests') || m.includes('rate limit')) return messages.auth.errorTooManyRequests;
  if (m.includes('user not found') || m.includes('user_not_found')) return messages.auth.errorUserNotFound;
  if (m.includes('same_password')) return messages.settings.errorSamePassword;
  return raw;
}
