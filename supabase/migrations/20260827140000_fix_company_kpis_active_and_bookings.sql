-- Fix two accuracy bugs in the company dashboard KPI aggregate (get_company_kpis):
--
-- 1. "Active trips" counted every trip with status = 'active', including ones whose
--    expected_arrival_datetime is long past. As documented in
--    20260827120000_expire_stale_active_trips.sql, nothing flips a trip out of 'active'
--    except a staff member manually clicking "إنهاء الرحلة" (or the opportunistic sweep
--    fleet.service.ts runs before active-trip checks) -- so the dashboard's "active" count
--    drifted far above the trips that are actually still upcoming/in progress.
--
-- 2. Bookings/passengers/revenue were summed across every booking row regardless of
--    booking_status, so 'cancelled' (refunded) and 'pending' (never completed) bookings
--    inflated the totals. Every other place in the app that counts "real" bookings
--    (trip.service.ts's ACTIVE_BOOKING_STATUSES, getTripPassengerCount, getTripManifest)
--    excludes exactly those two statuses -- the dashboard aggregate should match.

create or replace function public.get_company_kpis(p_company_id uuid)
returns table (
  trips bigint,
  active_trips bigint,
  bookings bigint,
  passengers bigint,
  revenue numeric,
  rated_bookings bigint,
  avg_rating numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  -- Caller must own the company, be staff of it, or be a super admin.
  if not (
    exists (select 1 from companies c where c.id = p_company_id and c.owner_user_id = v_uid)
    or exists (
      select 1 from company_staff_permissions s
      where s.company_id = p_company_id and s.user_id = v_uid
    )
    or exists (select 1 from users u where u.id = v_uid and u.role::text = 'super_admin')
  ) then
    raise exception 'Not authorized for this company';
  end if;

  return query
  with company_trips as (
    select t.id, t.status, t.expected_arrival_datetime
    from trips t
    where t.company_id = p_company_id
  ),
  trip_totals as (
    select
      count(*)::bigint as total,
      count(*) filter (
        where status = 'active' and expected_arrival_datetime > now()
      )::bigint as active
    from company_trips
  ),
  booking_totals as (
    select
      count(*)::bigint as total,
      coalesce(sum(b.count_passengers), 0)::bigint as passengers,
      coalesce(sum(b.price_total), 0)::numeric as revenue,
      count(*) filter (where b.rating_value is not null)::bigint as rated,
      avg(b.rating_value)::numeric as avg_rating
    from bookings b
    join company_trips ct on ct.id = b.trip_id
    where b.booking_status in ('confirmed', 'partially_boarded', 'boarded', 'completed')
  )
  select
    trip_totals.total,
    trip_totals.active,
    booking_totals.total,
    booking_totals.passengers,
    booking_totals.revenue,
    booking_totals.rated,
    booking_totals.avg_rating
  from trip_totals, booking_totals;
end;
$$;
