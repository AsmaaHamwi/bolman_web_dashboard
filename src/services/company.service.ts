import { supabase } from '../lib/supabase';
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
