/**
 * Capture of the Supabase recovery link the browser was opened with.
 *
 * The recovery email always redirects to a URL on the project's allow-list — often the site root
 * rather than /reset-password. The tokens ride in the URL hash (implicit flow) or the query
 * (`token_hash` / `code` verify links), and the Supabase client strips them from the address bar
 * as soon as it initialises. So the detection has to happen at import time: this module is
 * imported before the Supabase client is created (see main.tsx) and only reads `window.location`.
 *
 * The captured value is a *marker*: it tells the router to land on /reset-password. Establishing
 * the session itself is still the Supabase client's job (`detectSessionInUrl`).
 */

export interface RecoveryLink {
  /** Supabase's own error from the redirect (expired link, already-used token, …), if any. */
  error: string | null;
}

function readParams(): { hash: URLSearchParams; query: URLSearchParams } {
  const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  return { hash: new URLSearchParams(rawHash), query: new URLSearchParams(window.location.search) };
}

function detect(): RecoveryLink | null {
  if (typeof window === 'undefined') return null;
  let params: { hash: URLSearchParams; query: URLSearchParams };
  try {
    params = readParams();
  } catch {
    return null;
  }
  const { hash, query } = params;

  const isRecovery = hash.get('type') === 'recovery' || query.get('type') === 'recovery';
  // An auth redirect error carries no `type`. The dashboard has no other link-based auth flow, so
  // an error landing here is a dead recovery link — worth routing to the page that can explain it.
  // Keyed on `error_code`, which Supabase always sends, rather than a bare `error` param that any
  // other page could legitimately carry.
  const errorCode = hash.get('error_code') ?? query.get('error_code');

  if (!isRecovery && !errorCode) return null;

  return { error: hash.get('error_description') ?? query.get('error_description') ?? errorCode ?? null };
}

export const recoveryLink: RecoveryLink | null = detect();

/** Cleared once /reset-password has been reached, so leaving that page doesn't bounce back to it. */
let redirectPending = recoveryLink !== null;

export function isRecoveryRedirectPending(): boolean {
  return redirectPending;
}

export function clearRecoveryRedirect(): void {
  redirectPending = false;
}
