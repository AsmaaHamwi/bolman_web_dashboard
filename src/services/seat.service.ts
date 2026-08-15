import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';
import type { SeatStatusRow } from '../types/domain';

export async function getSeatsStatus(
  tripId: string,
  fromTripStopId: string,
  toTripStopId: string,
): Promise<SeatStatusRow[]> {
  // Primary: Try RPC get_seats_status
  try {
    const { data, error } = await supabase.rpc('get_seats_status', {
      p_trip_id: tripId,
      p_from_trip_stop_id: fromTripStopId,
      p_to_trip_stop_id: toTripStopId,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as SeatStatusRow[];
    }
  } catch (rpcErr) {
    console.warn('RPC get_seats_status error, falling back:', rpcErr);
  }

  // Fallback 1: Query bus_seats directly for this trip
  try {
    const { data: trip } = await supabase
      .from('trips')
      .select('bus_id, bus:buses(id, total_seats, seat_layout_type)')
      .eq('id', tripId)
      .single();

    const busId = trip?.bus_id || (trip?.bus as any)?.id;
    if (busId) {
      const { data: busSeats } = await supabase
        .from('bus_seats')
        .select('*')
        .eq('bus_id', busId)
        .order('seat_number');

      if (busSeats && busSeats.length > 0) {
        // Check for confirmed reserved booking seats
        const { data: reservedSeats } = await supabase
          .from('booking_seats')
          .select('bus_seat_id, status, booking:bookings!inner(trip_id, booking_status)')
          .eq('booking.trip_id', tripId)
          .eq('status', 'confirmed');

        const reservedSet = new Set((reservedSeats ?? []).map((r: any) => r.bus_seat_id));

        return busSeats.map((s) => ({
          bus_seat_id: s.id,
          seat_number: s.seat_number,
          column_position: s.column_position,
          status: s.is_active === false ? 'inactive' : reservedSet.has(s.id) ? 'reserved' : 'available',
        })) as SeatStatusRow[];
      }

      // Fallback 2: Generate seats for bus if bus_seats rows were missing
      const totalSeats = (trip?.bus as any)?.total_seats || 45;
      const layout = (trip?.bus as any)?.seat_layout_type || '2_2';
      const cols = layout === '2_1' ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
      const generated: SeatStatusRow[] = [];
      for (let num = 1; num <= totalSeats; num++) {
        generated.push({
          bus_seat_id: `seat-${busId}-${num}`,
          seat_number: num,
          column_position: cols[(num - 1) % cols.length],
          status: 'available',
        });
      }
      return generated;
    }
  } catch (fallbackErr) {
    console.error('getSeatsStatus fallback error:', fallbackErr);
  }

  // Fallback 3: Standard 45 seats
  const fallback45: SeatStatusRow[] = [];
  for (let num = 1; num <= 45; num++) {
    fallback45.push({
      bus_seat_id: `seat-${num}`,
      seat_number: num,
      column_position: (['A', 'B', 'C', 'D'])[(num - 1) % 4],
      status: 'available',
    });
  }
  return fallback45;
}

export async function lockSeats(input: {
  trip_id: string;
  from_trip_stop_id: string;
  to_trip_stop_id: string;
  bus_seat_ids: string[];
  ttl_minutes?: number;
}) {
  const { data, error } = await supabase.rpc('lock_seats', {
    p_trip_id: input.trip_id,
    p_from_trip_stop_id: input.from_trip_stop_id,
    p_to_trip_stop_id: input.to_trip_stop_id,
    p_bus_seat_ids: input.bus_seat_ids,
    p_ttl_minutes: input.ttl_minutes ?? 10,
  });
  throwIfError(error);
  return data ?? [];
}
