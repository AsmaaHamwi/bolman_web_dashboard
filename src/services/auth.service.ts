import { FunctionsHttpError } from '@supabase/supabase-js';
import { getMessages } from '../i18n';
import { supabase } from '../lib/supabase';
import { useUiStore } from '../stores/useUiStore';
import { throwIfError } from './errors';
import type { UserRole } from '../types/domain';

/** Strip bidi marks / ZWSP that often break GoTrue validation when pasting in RTL fields. */
export function normalizeAuthEmail(email: string): string {
  return String(email ?? '')
    .replace(/[\u200e\u200f\u202a-\u202e\ufeff\u200b-\u200d]/g, '')
    .trim()
    .toLowerCase();
}

const REASONABLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Surfaces `{ error: string }` JSON from Edge Functions instead of a generic non-2xx message. */
export async function throwIfInvokeError<T>(result: { data: T | null; error: Error | null }): Promise<T> {
  const { data, error } = result;
  if (!error) return data as T;
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response | undefined;
    if (res) {
      let messageFromBody: string | null = null;
      try {
        const body = (await res.clone().json()) as { error?: string };
        if (typeof body?.error === 'string' && body.error.trim()) messageFromBody = body.error.trim();
      } catch {
        /* non-JSON body */
      }
      if (messageFromBody) throw new Error(messageFromBody);
    }
  }
  throwIfError(error);
  return data as T;
}

export async function createUserViaEdge(input: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  status?: 'active' | 'suspended';
  company_id?: string;
  permissions?: Record<string, boolean>;
  license_number?: string;
}) {
  const email = normalizeAuthEmail(input.email);
  if (!email || !REASONABLE_EMAIL.test(email)) {
    throw new Error(getMessages(useUiStore.getState().locale).common.invalidEmail);
  }
  const normalized = {
    ...input,
    email,
    full_name: String(input.full_name ?? '').trim(),
    phone: input.phone != null && String(input.phone).trim() !== '' ? String(input.phone).trim() : undefined,
  };
  const result = await supabase.functions.invoke('admin-create-user', { body: normalized });
  return throwIfInvokeError(result);
}

export async function createCompanyWithOwner(input: {
  company: { name: string; phone?: string; email?: string; logo_url?: string | null };
  owner: { full_name: string; phone?: string; email: string; password: string };
}) {
  const result = await supabase.functions.invoke('create-company-with-owner', { body: input });
  return throwIfInvokeError(result);
}

export async function updateUserStatusViaEdge(input: { user_id: string; status: 'active' | 'suspended' }) {
  const result = await supabase.functions.invoke('admin-update-user-status', { body: input });
  return throwIfInvokeError(result);
}
