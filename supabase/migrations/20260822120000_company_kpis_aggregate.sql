-- Company dashboard KPIs: aggregate on the server instead of downloading every booking row.
--
-- The dashboard used to pull all company bookings to the browser and sum them in JS, which
-- takes ~18s for a mid-size company (and times out entirely when the filter is expressed as
-- a PostgREST embedded join on trips). This function does the whole thing in one query.

-- Indexes the aggregation (and the client-side fallback) rely on.
create index if not exists idx_bookings_trip_id on public.bookings (trip_id);
create index if not exists idx_trips_company_id on public.trips (company_id);
create index if not exists idx_trips_company_id_status on public.trips (company_id, status);

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
    select t.id, t.status
    from trips t
    where t.company_id = p_company_id
  ),
  trip_totals as (
    select
      count(*)::bigint as total,
      count(*) filter (where status = 'active')::bigint as active
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

grant execute on function public.get_company_kpis(uuid) to authenticated;
