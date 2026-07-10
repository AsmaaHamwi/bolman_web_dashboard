import { supabase } from '../lib/supabase';

export async function getSystemKpis() {
  const [companies, users, trips, bookings, bookingPrices, scans] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('trips').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('price_total'),
    supabase.from('qr_scan_logs').select('id', { count: 'exact', head: true }),
  ]);
  const revenue = (bookingPrices.data ?? []).reduce((s: number, b: any) => s + Number(b.price_total || 0), 0);
  return {
    companies: companies.count ?? 0,
    users: users.count ?? 0,
    trips: trips.count ?? 0,
    bookings: bookings.count ?? 0,
    revenue,
    scans: scans.count ?? 0,
  };
}

export async function getCompanyKpis(companyId?: string | null) {
  if (!companyId) {
    return { trips: 0, bookings: 0, passengers: 0, revenue: 0, activeTrips: 0, ratedBookings: 0, avgRating: null };
  }
  const { data: trips } = await supabase.from('trips').select('id,status').eq('company_id', companyId);
  const tripIds = (trips ?? []).map((t: any) => t.id);
  let bookings: any[] = [];
  if (tripIds.length) {
    const { data } = await supabase
      .from('bookings')
      .select('id,count_passengers,price_total,booking_status,rating_value')
      .in('trip_id', tripIds);
    bookings = data ?? [];
  }
  const rated = bookings.filter((b) => b.rating_value != null);
  const avgRating = rated.length
    ? rated.reduce((sum, b) => sum + Number(b.rating_value), 0) / rated.length
    : null;
  return {
    trips: trips?.length ?? 0,
    activeTrips: (trips ?? []).filter((t: any) => t.status === 'active').length,
    bookings: bookings.length,
    passengers: bookings.reduce((s, b) => s + Number(b.count_passengers || 0), 0),
    revenue: bookings.reduce((s, b) => s + Number(b.price_total || 0), 0),
    ratedBookings: rated.length,
    avgRating,
  };
}
