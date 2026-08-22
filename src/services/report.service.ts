import { supabase } from '../lib/supabase';
import { throwIfError } from './errors';

export type CompanyRouteReport = {
  route: string;
  trips: number;
  passengers: number;
  bookings: number;
  revenue: number;
  profit: number;
  occupancy: string;
};

export type CompanyPaymentBreakdown = {
  name: string;
  value: number;
  count: number;
  color: string;
};

export type CompanyReportsResult = {
  totalRevenue: number;
  totalBookings: number;
  totalPassengers: number;
  avgTicketPrice: number;
  occupancyRate: string;
  routeData: CompanyRouteReport[];
  paymentData: CompanyPaymentBreakdown[];
};

export async function getSystemKpis() {
  const [companies, users, trips, bookings, bookingPrices, scans] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('trips').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('price_total').limit(3000),
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

  const [tripsRes, activeTripsRes, bookingsRes] = await Promise.all([
    supabase.from('trips').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('trips').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
    supabase
      .from('bookings')
      .select('count_passengers, price_total, rating_value, trip:trips!inner(company_id)')
      .eq('trip.company_id', companyId),
  ]);

  const bookings = bookingsRes.data ?? [];

  const rated = bookings.filter((b) => b.rating_value != null);
  const avgRating = rated.length
    ? rated.reduce((sum, b) => sum + Number(b.rating_value), 0) / rated.length
    : null;

  return {
    trips: tripsRes.count ?? 0,
    activeTrips: activeTripsRes.count ?? 0,
    bookings: bookings.length,
    passengers: bookings.reduce((s, b) => s + Number(b.count_passengers || 0), 0),
    revenue: bookings.reduce((s, b) => s + Number(b.price_total || 0), 0),
    ratedBookings: rated.length,
    avgRating,
  };
}

export async function getCompanyReportsData(
  companyId?: string | null,
  period: 'month' | 'quarter' | 'year' = 'month',
  locale: 'ar' | 'en' = 'ar',
): Promise<CompanyReportsResult> {
  if (!companyId) {
    return {
      totalRevenue: 0,
      totalBookings: 0,
      totalPassengers: 0,
      avgTicketPrice: 0,
      occupancyRate: '0%',
      routeData: [],
      paymentData: [],
    };
  }

  // 1. Fetch all company trips with origin, destination, departure datetime, and bus total seats
  const [tripsRes, bookingsRes] = await Promise.all([
    supabase
      .from('trips')
      .select('id, departure_datetime, origin:cities!trips_origin_city_id_fkey(name), destination:cities!trips_destination_city_id_fkey(name), bus:buses!trips_bus_id_fkey(total_seats)')
      .eq('company_id', companyId),
    supabase
      .from('bookings')
      .select('id, trip_id, count_passengers, price_total, created_at, payments(payment_method), trip:trips!inner(company_id)')
      .eq('trip.company_id', companyId),
  ]);

  throwIfError(tripsRes.error);
  throwIfError(bookingsRes.error);

  const allTrips = tripsRes.data ?? [];
  const tripMap = new Map<string, (typeof allTrips)[0]>();
  allTrips.forEach((t) => tripMap.set(t.id, t));

  const allBookings: {
    id: string;
    trip_id: string;
    count_passengers: number;
    price_total: number;
    created_at: string;
    payments?: { payment_method: string }[];
  }[] = (bookingsRes.data as any) ?? [];


  // Determine date filtering based on period
  const now = new Date();
  let filterCutoffDate: Date | null = null;
  if (period === 'month') {
    filterCutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  } else if (period === 'quarter') {
    filterCutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  } else {
    filterCutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }

  // Filter trips and bookings by date if matching, or keep full set if none fall in range
  const filteredBookings = allBookings.filter((b) => {
    if (!filterCutoffDate) return true;
    const d = new Date(b.created_at);
    return !isNaN(d.getTime()) ? d >= filterCutoffDate : true;
  });

  const effectiveBookings = filteredBookings.length > 0 ? filteredBookings : allBookings;

  // 3. Aggregate Route Stats
  const routesMap = new Map<
    string,
    {
      route: string;
      trips: number;
      passengers: number;
      bookings: number;
      revenue: number;
      totalSeats: number;
    }
  >();

  allTrips.forEach((t) => {
    const originName = (t as any).origin?.name || (locale === 'ar' ? 'غير محدد' : 'Unknown');
    const destName = (t as any).destination?.name || (locale === 'ar' ? 'غير محدد' : 'Unknown');
    const routeKey = `${originName} — ${destName}`;

    if (!routesMap.has(routeKey)) {
      routesMap.set(routeKey, {
        route: routeKey,
        trips: 0,
        passengers: 0,
        bookings: 0,
        revenue: 0,
        totalSeats: 0,
      });
    }

    const item = routesMap.get(routeKey)!;
    item.trips += 1;
    item.totalSeats += Number((t as any).bus?.total_seats || 45);
  });

  let walletCount = 0;
  let officeCashCount = 0;
  let otherCount = 0;

  effectiveBookings.forEach((b) => {
    const t = tripMap.get(b.trip_id);
    if (t) {
      const originName = (t as any).origin?.name || (locale === 'ar' ? 'غير محدد' : 'Unknown');
      const destName = (t as any).destination?.name || (locale === 'ar' ? 'غير محدد' : 'Unknown');
      const routeKey = `${originName} — ${destName}`;
      const item = routesMap.get(routeKey);
      if (item) {
        item.bookings += 1;
        item.passengers += Number(b.count_passengers || 0);
        item.revenue += Number(b.price_total || 0);
      }
    }

    const pm = b.payments?.[0]?.payment_method || 'wallet';
    if (pm === 'wallet') walletCount++;
    else if (pm === 'office_cash') officeCashCount++;
    else otherCount++;
  });

  const routeData: CompanyRouteReport[] = Array.from(routesMap.values())
    .map((r) => {
      const occupancyRate = r.totalSeats > 0 ? Math.min(100, Math.round((r.passengers / r.totalSeats) * 100)) : 0;
      return {
        route: r.route,
        trips: r.trips,
        passengers: r.passengers,
        bookings: r.bookings,
        revenue: r.revenue,
        profit: Math.round(r.revenue * 0.8),
        occupancy: `${occupancyRate}%`,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = effectiveBookings.reduce((s, b) => s + Number(b.price_total || 0), 0);
  const totalBookings = effectiveBookings.length;
  const totalPassengers = effectiveBookings.reduce((s, b) => s + Number(b.count_passengers || 0), 0);
  const totalSeatsAllTrips = allTrips.reduce((s, t) => s + Number((t as any).bus?.total_seats || 45), 0);
  const avgOccupancy = totalSeatsAllTrips > 0 ? Math.min(100, Math.round((totalPassengers / totalSeatsAllTrips) * 100)) : 0;
  const avgTicketPrice = totalPassengers > 0 ? Math.round(totalRevenue / totalPassengers) : 0;

  const totalPayments = walletCount + officeCashCount + otherCount || 1;
  const walletPct = Math.round((walletCount / totalPayments) * 100);
  const officeCashPct = Math.round((officeCashCount / totalPayments) * 100);
  const otherPct = Math.max(0, 100 - walletPct - officeCashPct);

  const paymentData: CompanyPaymentBreakdown[] = [
    {
      name: locale === 'ar' ? 'محفظة بولمان' : 'Bolman Wallet',
      value: walletPct,
      count: walletCount,
      color: '#6C63FF',
    },
    {
      name: locale === 'ar' ? 'دفع مكتبي (نقد)' : 'Office Cash',
      value: officeCashPct,
      count: officeCashCount,
      color: '#10B981',
    },
    ...(otherCount > 0
      ? [
          {
            name: locale === 'ar' ? 'أخرى' : 'Other',
            value: otherPct,
            count: otherCount,
            color: '#F59E0B',
          },
        ]
      : []),
  ];

  return {
    totalRevenue,
    totalBookings,
    totalPassengers,
    avgTicketPrice,
    occupancyRate: `${avgOccupancy}%`,
    routeData,
    paymentData,
  };
}

