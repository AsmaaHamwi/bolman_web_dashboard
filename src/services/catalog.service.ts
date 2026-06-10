import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';

export async function listCities() {
  const { data, error } = await supabase.from('cities').select('*').order('name');
  throwIfError(error); return data ?? [];
}

export async function createCity(name: string) {
  const { data, error } = await supabase.from('cities').insert({ name }).select().single();
  throwIfError(error); return data;
}

export async function updateCity(id: string, patch: { name?: string; is_active?: boolean }) {
  const { data, error } = await supabase.from('cities').update(patch).eq('id', id).select().single();
  throwIfError(error); return data;
}
