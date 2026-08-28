-- Bug: a bus's status never leaves 'available' once its trip goes active. The buses list
-- (src/features/company/BusesPage.tsx) only ever writes bus.status from the manual edit modal
-- or on creation (always 'available' -- src/services/fleet.service.ts createBusWithSeats), so a
-- bus attached to a trip that is running right now with real passengers on it still shows as
-- "متاح" (available) instead of "قيد الخدمة" (in service).
--
-- Fix: recompute a bus's status from the trips/bookings actually attached to it, and call that
-- recompute after anything that could change the answer -- a trip's status or bus_id changing,
-- or a booking on one of its trips being made/cancelled. "Active trip" means trips.status =
-- 'active'; "has bookings" means at least one non-cancelled row in bookings for that trip,
-- mirroring the definition already used by getTripBookingCount() in src/services/trip.service.ts
-- (booking_status <> 'cancelled').
--
-- A bus that's been manually set to 'inactive' (suspended) is left alone -- this only toggles
-- between 'available' and 'in_service'. Reverting happens the same way: once no active trip of
-- the bus has any live booking (trip completed/cancelled, bookings cancelled, or bus
-- reassigned), the bus falls back to 'available'.
--
-- This is trigger-based rather than done client-side so it stays correct regardless of which
-- path changes the underlying rows -- the create_trip_with_stops/update_trip_with_stops/
-- complete_trip RPCs (bodies deployed directly on the DB, not tracked in this repo) or any plain
-- client .update() such as trip.service.ts's updateTrip().

create or replace function public.refresh_bus_status(p_bus_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status bus_status;
  v_should_be_in_service boolean;
begin
  if p_bus_id is null then
    return;
  end if;

  select status into v_current_status from public.buses where id = p_bus_id;
  if v_current_status is null or v_current_status = 'inactive' then
    return; -- unknown bus, or manually suspended: never auto-flip out of 'inactive'
  end if;

  select exists (
    select 1
    from public.trips t
    where t.bus_id = p_bus_id
      and t.status = 'active'
      and exists (
        select 1 from public.bookings b
        where b.trip_id = t.id
          and b.booking_status <> 'cancelled'
      )
  ) into v_should_be_in_service;

  if v_should_be_in_service and v_current_status = 'available' then
    update public.buses set status = 'in_service' where id = p_bus_id;
  elsif not v_should_be_in_service and v_current_status = 'in_service' then
    update public.buses set status = 'available' where id = p_bus_id;
  end if;
end;
$$;

grant execute on function public.refresh_bus_status(uuid) to authenticated;

create or replace function public.trg_trips_refresh_bus_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_bus_status(old.bus_id);
    return old;
  end if;

  perform public.refresh_bus_status(new.bus_id);
  if tg_op = 'UPDATE' and old.bus_id is distinct from new.bus_id then
    perform public.refresh_bus_status(old.bus_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trips_refresh_bus_status on public.trips;
create trigger trips_refresh_bus_status
after insert or delete or update of status, bus_id on public.trips
for each row execute function public.trg_trips_refresh_bus_status();

create or replace function public.trg_bookings_refresh_bus_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_bus_id uuid;
begin
  v_trip_id := coalesce(new.trip_id, old.trip_id);
  if v_trip_id is not null then
    select bus_id into v_bus_id from public.trips where id = v_trip_id;
    perform public.refresh_bus_status(v_bus_id);
  end if;

  if tg_op = 'UPDATE' and old.trip_id is distinct from new.trip_id and old.trip_id is not null then
    select bus_id into v_bus_id from public.trips where id = old.trip_id;
    perform public.refresh_bus_status(v_bus_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists bookings_refresh_bus_status on public.bookings;
create trigger bookings_refresh_bus_status
after insert or delete or update of booking_status, trip_id on public.bookings
for each row execute function public.trg_bookings_refresh_bus_status();

-- One-time data fix: apply the correct status to every existing bus right now instead of
-- waiting for its next trip/booking change to trigger a recompute.
do $$
declare
  v_bus record;
begin
  for v_bus in select id from public.buses where status in ('available', 'in_service') loop
    perform public.refresh_bus_status(v_bus.id);
  end loop;
end;
$$;
