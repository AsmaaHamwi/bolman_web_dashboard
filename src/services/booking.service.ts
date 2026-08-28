import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';
import type { BookingPassengerInput, TicketType } from '../types/domain';
import { getLocalDateInputValue } from '../utils/format';

/** Lightweight list payload — avoids timeout with dense seed data. */
const BOOKING_LIST_SELECT = `
  id,
  trip_id,
  count_passengers,
  price_total,
  payment_status,
  booking_status,
  ticket_mode,
  rating_value,
  rating_created_at,
  created_at,
  booker:users!bookings_booker_user_id_fkey(id,full_name),
  creator:users!bookings_created_by_user_id_fkey(id,full_name),
  booking_passengers(full_name, created_at),
  booking_seats(seat:bus_seats(seat_number)),
  payments(payment_method)
`;

const TRIP_LIST_FIELDS = `
  id,
  company_id,
  departure_datetime,
  origin:cities!trips_origin_city_id_fkey(name),
  destination:cities!trips_destination_city_id_fkey(name)
`;

export const BOOKINGS_PAGE_SIZE = 30;

export type BookingsListFilters = {
  search?: string;
  bookingStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  ticketMode?: string;
  tripDateFrom?: string;
  tripDateTo?: string;
  /** Bypasses the "hide past trips by default" rule below when no explicit date range is set. */
  includePastTrips?: boolean;
};

export type BookingsListResult = {
  rows: unknown[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function normalizeFilterValue(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function applyBookingListFilters<T extends { eq: Function; gte: Function; lte: Function; filter: Function; or: Function }>(
  query: T,
  companyId: string | null | undefined,
  filters?: BookingsListFilters,
) {
  let q = query;

  if (companyId) {
    q = q.eq('trip.company_id', companyId) as T;
  }

  const bookingStatus = normalizeFilterValue(filters?.bookingStatus);
  if (bookingStatus) q = q.eq('booking_status', bookingStatus) as T;

  const paymentStatus = normalizeFilterValue(filters?.paymentStatus);
  if (paymentStatus) q = q.eq('payment_status', paymentStatus) as T;

  const ticketMode = normalizeFilterValue(filters?.ticketMode);
  if (ticketMode) q = q.eq('ticket_mode', ticketMode) as T;

  const tripDateTo = normalizeFilterValue(filters?.tripDateTo);
  const search = normalizeFilterValue(filters?.search);
  const tripDateFromRaw = normalizeFilterValue(filters?.tripDateFrom);
  // Hide bookings for past trips by default; once the user searches, sets an explicit date range, or opts in via includePastTrips, show everything they asked for.
  const tripDateFrom = tripDateFromRaw
    || (!search && !tripDateTo && !filters?.includePastTrips ? getLocalDateInputValue(new Date()) : null);
  if (tripDateFrom) q = q.gte('trip.departure_datetime', `${tripDateFrom}T00:00:00`) as T;

  if (tripDateTo) q = q.lte('trip.departure_datetime', `${tripDateTo}T23:59:59.999`) as T;

  const paymentMethod = normalizeFilterValue(filters?.paymentMethod);
  if (paymentMethod) q = q.filter('payments.payment_method', 'eq', paymentMethod) as T;

  if (search) q = q.or(`id.ilike.%${search}%`) as T;

  return q;
}

export async function listBookings(
  companyId?: string | null,
  options?: { page?: number; pageSize?: number; filters?: BookingsListFilters },
): Promise<BookingsListResult> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? BOOKINGS_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const filters = options?.filters;
  const tripEmbed = `trip:trips!inner(${TRIP_LIST_FIELDS})`;

  let listQuery = supabase
    .from('bookings')
    .select(`${BOOKING_LIST_SELECT}, ${tripEmbed}`, { count: 'exact' })
    .order('departure_datetime', { foreignTable: 'trip', ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  listQuery = applyBookingListFilters(listQuery, companyId, filters);

  const { data, error, count } = await listQuery;
  throwIfError(error);

  const total = count ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    rows: data ?? [],
    page,
    pageSize,
    total,
    totalPages,
  };
}

export async function confirmWalletBooking(input: { trip_id: string; from_trip_stop_id: string; to_trip_stop_id: string; bus_seat_ids: string[]; passengers: BookingPassengerInput[]; ticket_mode: TicketType }) {
  const { data, error } = await supabase.rpc('confirm_wallet_booking', {
    p_trip_id: input.trip_id,
    p_from_trip_stop_id: input.from_trip_stop_id,
    p_to_trip_stop_id: input.to_trip_stop_id,
    p_bus_seat_ids: input.bus_seat_ids,
    p_passengers: input.passengers,
    p_ticket_mode: input.ticket_mode,
  });
  throwIfError(error); return data as string;
}

export async function confirmOfficeCashBooking(input: { booker_user_id?: string | null; trip_id: string; from_trip_stop_id: string; to_trip_stop_id: string; bus_seat_ids: string[]; passengers: BookingPassengerInput[]; ticket_mode: TicketType }) {
  const { data, error } = await supabase.rpc('confirm_office_cash_booking', {
    p_booker_user_id: input.booker_user_id ?? null,
    p_trip_id: input.trip_id,
    p_from_trip_stop_id: input.from_trip_stop_id,
    p_to_trip_stop_id: input.to_trip_stop_id,
    p_bus_seat_ids: input.bus_seat_ids,
    p_passengers: input.passengers,
    p_ticket_mode: input.ticket_mode,
  });
  throwIfError(error); return data as string;
}

export async function confirmOfficeWalletBooking(input: {
  booker_user_id: string;
  trip_id: string;
  from_trip_stop_id: string;
  to_trip_stop_id: string;
  bus_seat_ids: string[];
  passengers: BookingPassengerInput[];
  ticket_mode: TicketType;
}) {
  const { data, error } = await supabase.rpc('confirm_office_wallet_booking', {
    p_booker_user_id: input.booker_user_id,
    p_trip_id: input.trip_id,
    p_from_trip_stop_id: input.from_trip_stop_id,
    p_to_trip_stop_id: input.to_trip_stop_id,
    p_bus_seat_ids: input.bus_seat_ids,
    p_passengers: input.passengers,
    p_ticket_mode: input.ticket_mode,
  });
  throwIfError(error);
  return data as string;
}

export async function getBookingDetails(id: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, trip:trips(*, company:companies(name), bus:buses(number_bus), driver:drivers(id, user:users(full_name)), origin:cities!trips_origin_city_id_fkey(name), destination:cities!trips_destination_city_id_fkey(name)), booker:users!bookings_booker_user_id_fkey(id,full_name,phone,email), creator:users!bookings_created_by_user_id_fkey(id,full_name,email), booking_passengers(*), booking_seats(*, seat:bus_seats(*)), tickets(*, passenger:booking_passengers(full_name)), payments(*)')
    .eq('id', id)
    .single();
  throwIfError(error); return data;
}

export async function cancelBookingWithRefund(bookingId: string) {
  const { data, error } = await supabase.rpc('cancel_booking_with_refund', {
    p_booking_id: bookingId,
  });
  throwIfError(error);
  return data as string;
}

export async function modifyBookingBeforeCutoff(input: {
  booking_id: string;
  from_trip_stop_id: string;
  to_trip_stop_id: string;
  bus_seat_ids: string[];
  passengers: BookingPassengerInput[];
  ticket_mode: TicketType;
}) {
  const { data, error } = await supabase.rpc('modify_booking_before_cutoff', {
    p_booking_id: input.booking_id,
    p_from_trip_stop_id: input.from_trip_stop_id,
    p_to_trip_stop_id: input.to_trip_stop_id,
    p_bus_seat_ids: input.bus_seat_ids,
    p_passengers: input.passengers,
    p_ticket_mode: input.ticket_mode,
  });
  throwIfError(error);
  return data as string;
}
