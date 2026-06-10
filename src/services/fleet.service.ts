import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';

export async function listBuses(
  companyId?: string | null,
  filters?: { originCityId?: string | null; status?: string | null },
) {
  let q = supabase.from('buses').select('*, current_city:cities(name), company:companies(name)').order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  if (filters?.originCityId) q = q.eq('current_city_id', filters.originCityId);
  if (filters?.status) q = q.eq('status', filters.status);
  const { data, error } = await q;
  throwIfError(error); return data ?? [];
}

export async function createBusWithSeats(input: { company_id: string; number_bus: string; seat_layout_type: '2_2' | '2_1'; total_seats: number; current_city_id?: string | null }) {
  const { data: busId, error } = await supabase.rpc('create_bus_with_seats', {
    p_company_id: input.company_id,
    p_number_bus: input.number_bus,
    p_seat_layout_type: input.seat_layout_type,
    p_total_seats: input.total_seats,
    p_current_city_id: input.current_city_id ?? null,
    p_status: 'available',
  });

  throwIfError(error);

  const { data: bus, error: fetchError } = await supabase
    .from('buses')
    .select('*, current_city:cities(name), company:companies(name)')
    .eq('id', busId)
    .single();

  throwIfError(fetchError);
  return bus;
}

export async function listBusSeats(busId: string) {
  const { data, error } = await supabase.from('bus_seats').select('*').eq('bus_id', busId).order('seat_number');
  throwIfError(error); return data ?? [];
}

export async function listDrivers(companyId?: string | null) {
  let q = supabase.from('drivers').select('*, user:users(id,full_name,phone,email), company:companies(name)').order('created_at', { ascending: false });
  if (companyId) q = q.eq('company_id', companyId);
  const { data, error } = await q;
  throwIfError(error); return data ?? [];
}

export async function hasActiveTripForBus(busId: string) {
  const { data, error } = await supabase.from('trips').select('id').eq('bus_id', busId).eq('status', 'active').limit(1);
  throwIfError(error);
  return (data?.length ?? 0) > 0;
}

export async function hasActiveTripForDriver(driverId: string) {
  const { data, error } = await supabase.from('trips').select('id').eq('driver_id', driverId).eq('status', 'active').limit(1);
  throwIfError(error);
  return (data?.length ?? 0) > 0;
}

export async function updateBusRecord(id: string, patch: { status?: string; current_city_id?: string | null }) {
  const { data, error } = await supabase.from('buses').update(patch).eq('id', id).select().single();
  throwIfError(error);
  return data;
}

export async function updateDriverRecord(id: string, patch: { license_number?: string; status?: string }) {
  const { data, error } = await supabase.from('drivers').update(patch).eq('id', id).select().single();
  throwIfError(error);
  return data;
}

export async function updateUserProfile(userId: string, patch: { full_name?: string; phone?: string | null }) {
  const { data, error } = await supabase.from('users').update(patch).eq('id', userId).select().single();
  throwIfError(error);
  return data;
}

export async function createDriver(input: { company_id: string; user_id: string; license_number: string }) {
  const { data, error } = await supabase.from('drivers').insert(input).select().single();
  throwIfError(error); return data;
}

export async function listRestStops(companyId: string) {
  const { data, error } = await supabase.from('rest_stops').select('*').eq('company_id', companyId).order('name');
  throwIfError(error); return data ?? [];
}

export async function createRestStop(input: { company_id: string; name: string; address?: string; phone?: string }) {
  const { data, error } = await supabase.from('rest_stops').insert(input).select().single();
  throwIfError(error); return data;
}
