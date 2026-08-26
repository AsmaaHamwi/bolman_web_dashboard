import { getMessages } from '../i18n';
import { supabase } from '../lib/supabase';
import { useUiStore } from '../stores/useUiStore';
import { throwIfError } from './errors';
import { createCompanyWithOwner as createCompanyWithOwnerViaEdge } from './auth.service';

export async function listCompanies() {
  const { data, error } = await supabase.from('companies').select('*, owner:users!companies_owner_user_id_fkey(full_name,email,phone)').order('created_at', { ascending: false });
  throwIfError(error); return data ?? [];
}

export async function createCompanyWithOwner(input: {
  company: { name: string; phone?: string; email?: string; logo_url?: string | null };
  owner: { full_name: string; phone?: string; email: string; password: string };
}) {
  return createCompanyWithOwnerViaEdge(input);
}

export async function updateCompany(id: string, patch: any) {
  const { data, error } = await supabase.from('companies').update(patch).eq('id', id).select().single();
  throwIfError(error); return data;
}

/**
 * Postgres blocks the delete with 23503 whenever another table (trips, bookings, buses, drivers, staff...)
 * still references this company. Selecting the deleted row back also catches the RLS case where Postgrest
 * silently deletes 0 rows and returns success instead of an error (no DELETE policy match for the caller).
 */
export async function deleteCompany(id: string) {
  const { data, error } = await supabase.from('companies').delete().eq('id', id).select('id');
  if (error?.code === '23503') {
    throw new Error(getMessages(useUiStore.getState().locale).system.companies.cannotDeleteHasData);
  }
  throwIfError(error);
  if (!data || data.length === 0) {
    throw new Error(getMessages(useUiStore.getState().locale).system.companies.deleteNotPermitted);
  }
}

export async function getMyCompanyId(userId: string, role: string) {
  if (role === 'company_owner') {
    const { data, error } = await supabase.from('companies').select('id').eq('owner_user_id', userId).limit(1).maybeSingle();
    throwIfError(error); return data?.id ?? null;
  }
  if (role === 'company_staff') {
    const { data, error } = await supabase.from('company_staff_permissions').select('company_id').eq('user_id', userId).limit(1).maybeSingle();
    throwIfError(error); return data?.company_id ?? null;
  }
  return null;
}

export async function getCompanyById(id: string) {
  const { data, error } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
  throwIfError(error); return data;
}
