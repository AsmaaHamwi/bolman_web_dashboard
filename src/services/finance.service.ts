import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';

export async function listPayments() {
  const { data, error } = await supabase.from('payments').select('*, booking:bookings(id, price_total), paid_by:users(full_name)').order('paid_at', { ascending: false });
  throwIfError(error); return data ?? [];
}

export async function listWalletTransactions(walletId?: string) {
  let q = supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false });
  if (walletId) q = q.eq('wallet_id', walletId);
  const { data, error } = await q;
  throwIfError(error); return data ?? [];
}
