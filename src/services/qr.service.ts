import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';

export async function scanTicketQr(qrToken: string) {
  const { data, error } = await supabase.rpc('scan_ticket_qr', { p_qr_token: qrToken });
  throwIfError(error); return data?.[0] ?? null;
}

export async function listScanLogs(companyId?: string | null) {
  let q = supabase.from('qr_scan_logs').select('*, ticket:tickets(ticket_code), trip:trips(company_id, origin:cities!trips_origin_city_id_fkey(name), destination:cities!trips_destination_city_id_fkey(name)), driver:drivers(user:users(full_name))').order('scanned_at', { ascending: false });
  if (companyId) q = q.eq('trip.company_id', companyId);
  const { data, error } = await q;
  throwIfError(error); return data ?? [];
}
