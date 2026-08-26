import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';
import { localDayEndIso, localDayStartIso } from '../utils/format';

export async function scanTicketQr(qrToken: string) {
  const { data, error } = await supabase.rpc('scan_ticket_qr', { p_qr_token: qrToken });
  throwIfError(error); return data?.[0] ?? null;
}

export const SCAN_LOGS_PAGE_SIZE = 25;

export type ScanLogsFilters = {
  search?: string;
  companyId?: string;
  scannedDateFrom?: string;
  scannedDateTo?: string;
};

export type ScanLogsResult = {
  rows: any[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function normalizeFilterValue(value?: string | null) {
  return String(value ?? '').trim();
}

/** Strip the characters PostgREST reads as pattern/list syntax so a code search stays literal. */
function sanitizeIlikeTerm(value: string) {
  return value.replace(/[%*,()]/g, '');
}

export async function listScanLogs(
  companyId?: string | null,
  options?: { page?: number; pageSize?: number; filters?: ScanLogsFilters },
): Promise<ScanLogsResult> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? SCAN_LOGS_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const filters = options?.filters;

  const search = sanitizeIlikeTerm(normalizeFilterValue(filters?.search));
  const company = normalizeFilterValue(companyId) || normalizeFilterValue(filters?.companyId);
  const dateFrom = localDayStartIso(normalizeFilterValue(filters?.scannedDateFrom));
  const dateTo = localDayEndIso(normalizeFilterValue(filters?.scannedDateTo));

  // `!inner` is required whenever we filter through an embed: without it PostgREST
  // only nulls out the embedded row and still returns every parent log.
  const ticketEmbed = `ticket:tickets${search ? '!inner' : ''}(ticket_code)`;
  const tripEmbed = `trip:trips${company ? '!inner' : ''}(company_id, origin:cities!trips_origin_city_id_fkey(name), destination:cities!trips_destination_city_id_fkey(name))`;

  let q = supabase
    .from('qr_scan_logs')
    .select(`*, ${ticketEmbed}, ${tripEmbed}, driver:drivers(user:users(full_name))`, { count: 'exact' })
    .order('scanned_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (company) q = q.eq('trip.company_id', company);
  if (dateFrom) q = q.gte('scanned_at', dateFrom);
  if (dateTo) q = q.lte('scanned_at', dateTo);
  if (search) q = q.ilike('ticket.ticket_code', `%${search}%`);

  const { data, error, count } = await q;
  throwIfError(error);

  const total = count ?? 0;

  return {
    rows: data ?? [],
    page,
    pageSize,
    total,
    totalPages: total > 0 ? Math.ceil(total / pageSize) : 0,
  };
}
