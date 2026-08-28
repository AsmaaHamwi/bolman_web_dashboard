-- Bug: clicking "إنهاء الرحلة" on the company web dashboard (CompanyTripDetailsPage.tsx,
-- src/services/trip.service.ts's completeTrip) always fails for company staff/owners.
--
-- complete_trip(p_trip_id) only ever authorizes the call by looking up an *active driver row*
-- for auth.uid() and requiring that driver to be the trip's assigned driver -- it was written for
-- the driver mobile app, not the company dashboard. A company staff/owner user has no row in
-- public.drivers, so v_driver_id is always null and the RPC raises 'Current user is not an active
-- driver' (or, if they somehow did have a driver row, 'Trip not found or not assigned to this
-- driver') no matter what the trip's status is. Every path in the dashboard that ends up calling
-- this RPC -- both the "إنهاء الرحلة" button and setting status to "completed" from "تعديل حالة
-- الرحلة" -- is broken the same way.
--
-- Every other trip mutation the company dashboard performs (trip.service.ts's updateTrip,
-- updateTripWithStops, updateTripOfferSettings) goes through a plain client .update() gated by the
-- trips_manage_policy RLS policy, i.e. has_company_permission(company_id, 'manage_trips'). This
-- fix adds that same check as a second, independent way to authorize complete_trip: a caller who
-- is staff/owner of the trip's company with manage_trips permission (or a super admin, per
-- has_company_permission) may complete the trip, in addition to the trip's own assigned driver.
-- The driver path's behavior (including the deliberately vague "not found or not assigned" error)
-- is unchanged.

create or replace function public.complete_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_driver_id uuid;
  v_trip public.trips%rowtype;
  v_is_staff boolean := false;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Authentication required';
  end if;

  select * into v_trip
  from public.trips
  where id = p_trip_id
  for update;

  if v_trip.id is null then
    raise exception 'Trip not found';
  end if;

  v_is_staff := public.has_company_permission(v_trip.company_id, 'manage_trips');

  if not v_is_staff then
    select d.id into v_driver_id
    from public.drivers d
    where d.user_id = v_user_id
      and d.status = 'active';

    if v_driver_id is null or v_trip.driver_id is distinct from v_driver_id then
      raise exception 'Trip not found or not assigned to this driver';
    end if;
  end if;

  if v_trip.status not in ('active', 'scheduled') then
    raise exception 'Trip cannot be completed from status %', v_trip.status;
  end if;

  update public.trips
  set status = 'completed',
      updated_at = now()
  where id = p_trip_id;

  update public.bookings
  set booking_status = 'completed',
      updated_at = now()
  where trip_id = p_trip_id
    and booking_status in ('boarded', 'partially_boarded');

  update public.tickets t
  set status = 'completed',
      updated_at = now()
  from public.bookings b
  where t.booking_id = b.id
    and b.trip_id = p_trip_id
    and t.status in ('boarded', 'issued');
end;
$$;
