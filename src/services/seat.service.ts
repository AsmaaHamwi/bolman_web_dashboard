import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';
import type { SeatStatusRow } from '../types/domain';

export async function getSeatsStatus(tripId: string, fromTripStopId: string, toTripStopId: string): Promise<SeatStatusRow[]> {
  const { data, error } = await supabase.rpc('get_seats_status', {
    p_trip_id: tripId,
    p_from_trip_stop_id: fromTripStopId,
    p_to_trip_stop_id: toTripStopId,
  });
  throwIfError(error); return (data ?? []) as SeatStatusRow[];
}

export async function lockSeats(input: { trip_id: string; from_trip_stop_id: string; to_trip_stop_id: string; bus_seat_ids: string[]; ttl_minutes?: number }) {
  const { data, error } = await supabase.rpc('lock_seats', {
    p_trip_id: input.trip_id,
    p_from_trip_stop_id: input.from_trip_stop_id,
    p_to_trip_stop_id: input.to_trip_stop_id,
    p_bus_seat_ids: input.bus_seat_ids,
    p_ttl_minutes: input.ttl_minutes ?? 10,
  });
  throwIfError(error); return data ?? [];
}
