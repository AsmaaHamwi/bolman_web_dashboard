import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';

export type WalletPassengerSearchResult = {
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  wallet_id: string | null;
  balance: number;
};

export type WalletSummary = WalletPassengerSearchResult;

export type WalletTransaction = {
  transaction_id: string;
  wallet_id: string;
  booking_id: string | null;
  transaction_type: 'credit' | 'debit';
  source_type: 'mtn_cash' | 'syriatel_cash' | 'office_topup' | 'office_withdrawal' | 'booking' | 'refund';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  transaction_reference: string | null;
  performed_by_user_id: string | null;
  performed_by_name: string | null;
  notes: string | null;
  balance_after: number | null;
  created_at: string;
};

const WALLET_PASSENGER_PAGE_SIZE = 40;

function isMissingWalletSearchRpc(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  const m = error.message;
  return (
    /Could not find the function/i.test(m) ||
    /schema cache/i.test(m) ||
    /\bPGRST202\b/i.test(m) ||
    /42883/i.test(m)
  );
}

export async function searchPassengersForWallet(
  query: string,
  opts?: { limit?: number; offset?: number },
) {
  const trimmed = query.trim();
  const limit = opts?.limit ?? WALLET_PASSENGER_PAGE_SIZE;
  const offset = opts?.offset ?? 0;

  const primary = await supabase.rpc('search_passengers_for_wallet', {
    p_query: trimmed,
    p_limit: limit,
    p_offset: offset,
  });

  if (!primary.error) {
    return (primary.data ?? []) as WalletPassengerSearchResult[];
  }

  if (isMissingWalletSearchRpc(primary.error)) {
    if (offset > 0) {
      return [] as WalletPassengerSearchResult[];
    }

    const legacy = await supabase.rpc('search_passengers_for_wallet', {
      p_query: trimmed,
      p_limit: Math.min(limit, 50),
    });

    throwIfError(legacy.error);
    return (legacy.data ?? []) as WalletPassengerSearchResult[];
  }

  throwIfError(primary.error);
}

export const walletPassengerPageSize = WALLET_PASSENGER_PAGE_SIZE;

export async function getPassengerWalletSummary(userId: string) {
  const { data, error } = await supabase.rpc('get_passenger_wallet_summary', {
    p_user_id: userId,
  });

  throwIfError(error);
  const rows = (data ?? []) as WalletSummary[];
  return rows[0] ?? null;
}

export async function getPassengerWalletTransactions(userId: string, limit = 50, offset = 0) {
  const { data, error } = await supabase.rpc('get_passenger_wallet_transactions', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: offset,
  });

  throwIfError(error);
  return (data ?? []) as WalletTransaction[];
}

export async function officeWalletTopup(userId: string, amount: number, notes?: string) {
  const { data, error } = await supabase.rpc('office_wallet_topup', {
    p_target_user_id: userId,
    p_amount: amount,
    p_notes: notes?.trim() || null,
  });

  throwIfError(error);
  return data;
}

export async function officeWalletWithdraw(userId: string, amount: number, notes?: string) {
  const { data, error } = await supabase.rpc('office_wallet_withdraw', {
    p_target_user_id: userId,
    p_amount: amount,
    p_notes: notes?.trim() || null,
  });

  throwIfError(error);
  return data;
}
