import { supabase } from '../lib/supabase';
import type { TripSearchRow } from '../types/domain';
import { getSeatsStatus } from './seat.service';
import { throwIfError } from './errors';

export type TripManifestRow = {
  booking_id: string;
  booking_created_at: string;
  passenger_id: string;
  ticket_id: string | null;
  passenger_name: string;
  passenger_phone: string | null;
  national_id: string;
  seat_number: number | null;
  ticket_status: string;
  boarded_at: string | null;
};

export type TripSeatSummary = {
  reserved: number;
  locked: number;
  available: number;
  inactive: number;
  total: number;
};

export const ACTIVE_BOOKING_STATUSES = ['confirmed', 'partially_boarded', 'boarded', 'completed'] as const;

export type TripsListFilters = {
  search?: string;
  status?: string;
  originCityId?: string;
  destinationCityId?: string;
  departureDateFrom?: string;
  departureDateTo?: string;
  offerFilter?: '' | 'yes' | 'no';
};

function tripDepartureDate(trip: { departure_datetime?: string | null }) {
  return trip.departure_datetime?.slice(0, 10) ?? '';
}

function tripSearchHaystack(trip: any) {
  return [
    trip.origin?.name,
    trip.destination?.name,
    trip.bus?.number_bus,
    trip.driver?.user?.full_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function sortTripsForList(trips: any[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return [...trips].sort((left, right) => {
    const leftDate = new Date(left.departure_datetime);
    const rightDate = new Date(right.departure_datetime);
    const leftRank =
      leftDate.getMonth() === currentMonth && leftDate.getFullYear() === currentYear ? 0 : 1;
    const rightRank =
      rightDate.getMonth() === currentMonth && rightDate.getFullYear() === currentYear ? 0 : 1;

    if (leftRank !== rightRank) return leftRank - rightRank;
    return leftDate.getTime() - rightDate.getTime();
  });
}

export async function searchTrips(input: {
  origin_city_id: string;
  destination_city_id: string;
  travel_date: string;
}): Promise<TripSearchRow[]> {
  const { data, error } = await supabase.rpc('search_trips', {
    p_origin_city_id: input.origin_city_id,
    p_destination_city_id: input.destination_city_id,
    p_travel_date: input.travel_date,
  });
  throwIfError(error);
  return (data ?? []) as TripSearchRow[];
}

export async function listTrips(companyId?: string | null, filters?: TripsListFilters) {
  let q = supabase
    .from('trips')
    .select('*, company:companies(name), bus:buses(number_bus), driver:drivers(user:users(full_name)), origin:cities!trips_origin_city_id_fkey(name), destination:cities!trips_destination_city_id_fkey(name)')
    .order('departure_datetime', { ascending: true });

  if (companyId) q = q.eq('company_id', companyId);

  const status = filters?.status?.trim();
  if (status) q = q.eq('status', status);

  const originCityId = filters?.originCityId?.trim();
  if (originCityId) q = q.eq('origin_city_id', originCityId);

  const destinationCityId = filters?.destinationCityId?.trim();
  if (destinationCityId) q = q.eq('destination_city_id', destinationCityId);

  const departureDateFrom = filters?.departureDateFrom?.trim();
  if (departureDateFrom) q = q.gte('departure_datetime', `${departureDateFrom}T00:00:00`);

  const departureDateTo = filters?.departureDateTo?.trim();
  if (departureDateTo) q = q.lte('departure_datetime', `${departureDateTo}T23:59:59.999`);

  if (filters?.offerFilter === 'yes') q = q.eq('offer_is', true);
  if (filters?.offerFilter === 'no') q = q.eq('offer_is', false);

  const { data, error } = await q;
  throwIfError(error);

  let rows = data ?? [];
  const search = filters?.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter((trip) => tripSearchHaystack(trip).includes(search));
  }

  return sortTripsForList(rows);
}

export async function getTripStops(tripId: string) {
  const { data, error } = await supabase.from('trip_stops').select('*, city:cities(name), rest_stop:rest_stops(name)').eq('trip_id', tripId).order('order_stop');
  throwIfError(error); return data ?? [];
}

export async function createTripWithStops(input: { trip: any; stops: any[] }) {
  const { data: tripId, error } = await supabase.rpc('create_trip_with_stops', {
    p_company_id: input.trip.company_id,
    p_bus_id: input.trip.bus_id,
    p_driver_id: input.trip.driver_id,
    p_origin_city_id: input.trip.origin_city_id,
    p_destination_city_id: input.trip.destination_city_id,
    p_departure_datetime: input.trip.departure_datetime,
    p_expected_arrival_datetime: input.trip.expected_arrival_datetime,
    p_price: input.trip.price,
    p_offer_is: input.trip.offer_is,
    p_price_offer: input.trip.offer_is ? input.trip.price_offer : null,
    p_title_offer: input.trip.offer_is ? input.trip.title_offer : null,
    p_stops: input.stops,
  });

  throwIfError(error);

  const trip = await getTripDetails(tripId as string);
  return trip;
}

export async function updateTrip(id: string, patch: any) {
  const { data, error } = await supabase.from('trips').update(patch).eq('id', id).select().single();
  throwIfError(error); return data;
}

export async function getTripDetails(id: string) {
  const { data, error } = await supabase
    .from('trips')
    .select('*, company:companies(name), bus:buses(number_bus), driver:drivers(id, user:users(full_name)), origin:cities!trips_origin_city_id_fkey(name), destination:cities!trips_destination_city_id_fkey(name)')
    .eq('id', id)
    .single();
  throwIfError(error);
  return data;
}

export async function getTripBookingCount(tripId: string) {
  const { count, error } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId)
    .neq('booking_status', 'cancelled');
  throwIfError(error);
  return count ?? 0;
}

export async function getTripPassengerCount(tripId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('booking_passengers(id)')
    .eq('trip_id', tripId)
    .in('booking_status', [...ACTIVE_BOOKING_STATUSES]);
  throwIfError(error);
  return (data ?? []).reduce((sum, booking) => sum + (booking.booking_passengers?.length ?? 0), 0);
}

export async function getTripSeatSummary(
  tripId: string,
  fromTripStopId: string,
  toTripStopId: string,
): Promise<TripSeatSummary> {
  const seats = await getSeatsStatus(tripId, fromTripStopId, toTripStopId);
  return seats.reduce<TripSeatSummary>(
    (summary, seat) => {
      summary.total += 1;
      if (seat.status === 'reserved') summary.reserved += 1;
      else if (seat.status === 'locked') summary.locked += 1;
      else if (seat.status === 'available') summary.available += 1;
      else if (seat.status === 'inactive') summary.inactive += 1;
      return summary;
    },
    { reserved: 0, locked: 0, available: 0, inactive: 0, total: 0 },
  );
}

export async function updateTripWithStops(input: { trip_id: string; trip: any; stops: any[] }) {
  const { data, error } = await supabase.rpc('update_trip_with_stops', {
    p_trip_id: input.trip_id,
    p_bus_id: input.trip.bus_id,
    p_driver_id: input.trip.driver_id,
    p_origin_city_id: input.trip.origin_city_id,
    p_destination_city_id: input.trip.destination_city_id,
    p_departure_datetime: input.trip.departure_datetime,
    p_expected_arrival_datetime: input.trip.expected_arrival_datetime,
    p_price: input.trip.price,
    p_offer_is: input.trip.offer_is,
    p_price_offer: input.trip.offer_is ? input.trip.price_offer : null,
    p_title_offer: input.trip.offer_is ? input.trip.title_offer : null,
    p_stops: input.stops,
  });
  throwIfError(error);
  return getTripDetails((data as string) || input.trip_id);
}

export async function updateTripOfferSettings(id: string, patch: { offer_is: boolean; price_offer: number | null; title_offer: string | null }) {
  const { data, error } = await supabase
    .from('trips')
    .update({
      offer_is: patch.offer_is,
      price_offer: patch.offer_is ? patch.price_offer : null,
      title_offer: patch.offer_is ? patch.title_offer : null,
    })
    .eq('id', id)
    .select()
    .single();
  throwIfError(error);
  return data;
}

export async function completeTrip(tripId: string) {
  const { data, error } = await supabase.rpc('complete_trip', {
    p_trip_id: tripId,
  });
  throwIfError(error);
  return data as string;
}

export async function getTripManifest(tripId: string): Promise<TripManifestRow[]> {
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      created_at,
      ticket_mode,
      booking_passengers(id, full_name, phone, national_id, created_at),
      booking_seats(id, bus_seat_id, created_at, seat:bus_seats(seat_number)),
      tickets(id, booking_passenger_id, status, boarded_at, ticket_type)
    `)
    .eq('trip_id', tripId)
    .in('booking_status', [...ACTIVE_BOOKING_STATUSES])
    .order('created_at', { ascending: false });

  throwIfError(error);

  const rows: TripManifestRow[] = [];

  for (const booking of bookings ?? []) {
    const passengers = [...(booking.booking_passengers ?? [])].sort(
      (left: { created_at?: string; id?: string }, right: { created_at?: string; id?: string }) =>
        compareByCreatedAtThenId(left, right),
    );
    const seats = [...(booking.booking_seats ?? [])].sort(
      (left: { created_at?: string; id?: string }, right: { created_at?: string; id?: string }) =>
        compareByCreatedAtThenId(left, right),
    );
    const tickets = booking.tickets ?? [];
    const groupTicket = tickets.find((ticket: { ticket_type?: string }) => ticket.ticket_type === 'group');

    passengers.forEach((passenger: {
      id: string;
      full_name: string;
      phone: string | null;
      national_id: string;
    }, index: number) => {
      const seat = seats[index] as { seat?: { seat_number?: number | null } } | undefined;
      const individualTicket = tickets.find(
        (ticket: { booking_passenger_id?: string | null }) => ticket.booking_passenger_id === passenger.id,
      );
      const ticket = individualTicket ?? groupTicket;

      rows.push({
        booking_id: booking.id,
        booking_created_at: booking.created_at as string,
        passenger_id: passenger.id,
        ticket_id: ticket?.id ?? null,
        passenger_name: passenger.full_name,
        passenger_phone: passenger.phone,
        national_id: passenger.national_id,
        seat_number: seat?.seat?.seat_number ?? null,
        ticket_status: ticket?.status ?? 'issued',
        boarded_at: ticket?.boarded_at ?? null,
      });
    });
  }

  return rows;
}

function compareByCreatedAtThenId(
  left: { created_at?: string; id?: string },
  right: { created_at?: string; id?: string },
) {
  const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
  const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
  if (leftTime !== rightTime) return leftTime - rightTime;
  return String(left.id ?? '').localeCompare(String(right.id ?? ''));
}
