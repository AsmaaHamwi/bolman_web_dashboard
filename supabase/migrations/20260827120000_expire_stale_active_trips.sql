-- Bug: trips are only ever moved to 'completed' when staff click "إنهاء الرحلة"
-- (the complete_trip RPC, called from CompanyTripDetailsPage.tsx). Nothing compares
-- expected_arrival_datetime against now() anywhere -- src/services/fleet.service.ts's
-- hasActiveTripForDriver/hasActiveTripForBus/getActiveTripForDriver only checked
-- status = 'active'. So a trip whose arrival time has long passed but that nobody manually
-- completed stays 'active' forever, and the driver/bus attached to it can never be suspended
-- or edited (dashboard shows "السائق لديه رحلة نشطة حالياً" even after the trip is long over).
--
-- The same thing happens to trips that were left in 'scheduled' -- e.g. nobody ever flipped
-- them to 'active' when the trip actually departed. Those never match status = 'active' at all,
-- so they show up in the trips list as "مجدولة" forever even a week after they happened. Anything
-- whose expected_arrival_datetime is in the past is over, regardless of which of these two
-- non-terminal statuses it was left in, so both are swept here.
--
-- This adds a sweep that flips stale 'scheduled'/'active' trips to 'completed' by calling the
-- existing, already-deployed complete_trip RPC (reusing whatever bookkeeping it performs, rather
-- than guessing at it here) for every trip whose expected_arrival_datetime is in the past.
-- complete_trip's own internals aren't in this repo (deployed-only) and may assume status =
-- 'active' going in, so if it raises for a 'scheduled' row this falls back to a plain status
-- update for that row rather than leaving it stuck. One bad trip failing both paths must not
-- abort the rest of the sweep, hence the per-row exception guards.
--
-- src/services/fleet.service.ts calls this RPC opportunistically before every active-trip check,
-- so the fix is self-healing without requiring pg_cron or any external scheduler. If pg_cron is
-- enabled on this project, the commented block at the bottom additionally schedules it so the
-- trips list itself flips to "completed" promptly even when nobody opens the Drivers/Buses page.

create or replace function public.expire_stale_active_trips()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip record;
  v_count integer := 0;
begin
  for v_trip in
    select id, status
    from public.trips
    where status in ('scheduled', 'active')
      and expected_arrival_datetime < now()
  loop
    begin
      perform public.complete_trip(v_trip.id);
      v_count := v_count + 1;
    exception when others then
      begin
        -- complete_trip may refuse a row that was never 'active' (e.g. it expects the trip to
        -- already be in progress) -- fall back to a direct status flip so it doesn't stay stuck.
        update public.trips set status = 'completed' where id = v_trip.id and status = v_trip.status;
        v_count := v_count + 1;
      exception when others then
        -- don't let one trip's failure block the rest of the sweep
        null;
      end;
    end;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.expire_stale_active_trips() to authenticated;

-- One-time data fix: clears the backlog of trips already stuck in 'scheduled' or 'active' past
-- their arrival time right now, instead of waiting for the next driver/bus active-trip check to
-- trigger the sweep above.
select public.expire_stale_active_trips();

-- Optional: if pg_cron is enabled on this project, uncomment to also sweep every 5 minutes so the
-- trips list itself reflects "completed" promptly even when nobody opens the Drivers/Buses page:
--
-- select cron.schedule(
--   'expire-stale-active-trips',
--   '*/5 * * * *',
--   $$select public.expire_stale_active_trips();$$
-- );
