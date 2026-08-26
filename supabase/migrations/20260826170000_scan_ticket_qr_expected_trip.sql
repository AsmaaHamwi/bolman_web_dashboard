-- The driver app has always sent `p_expected_trip_id` alongside `p_qr_token` (see
-- lib/data/repositories.dart -> DriverRepo.scan), but the only deployed overload is
-- scan_ticket_qr(p_qr_token text). PostgREST resolves an RPC by its *named argument set*,
-- so every scan made from the driver's scan screen returned
--   PGRST202 "Could not find the function public.scan_ticket_qr(p_expected_trip_id, p_qr_token)"
-- ...and since ScanScreen always resolves a scan-context trip (active trip, else the nearest
-- upcoming one), the argument was present on effectively every scan. Net effect: QR boarding
-- never worked from the app, no matter how the ticket was issued or shared.
--
-- This adds p_expected_trip_id as an optional trailing argument so the driver app resolves,
-- while a bare {p_qr_token} call (dashboard, src/services/qr.service.ts) keeps working via the
-- default. The single-argument overload MUST be dropped: leaving both in place would make a
-- bare {p_qr_token} call ambiguous (PGRST203) and break the dashboard instead.
--
-- Everything else is the currently deployed body, preserved verbatim -- including the
-- passenger_name column that bolman_scan_ticket_qr_fix.sql in the reference pack would have
-- dropped, and the individual-ticket passenger_count of 1.

drop function if exists public.scan_ticket_qr(text);
drop function if exists public.scan_ticket_qr(text, uuid);

create or replace function public.scan_ticket_qr(
  p_qr_token text,
  p_expected_trip_id uuid default null
)
returns table (
  scan_result qr_scan_result,
  booking_id uuid,
  ticket_id uuid,
  ticket_type ticket_type,
  booking_status booking_status,
  passenger_count integer,
  passenger_name text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_driver_id uuid;
  v_token text;
  v_ticket public.tickets%rowtype;
  v_booking public.bookings%rowtype;
  v_trip_id uuid;
  v_driver_trip_count int;
  v_total_tickets int;
  v_boarded_tickets int;
  v_passenger_name text;
  v_reported_count int;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Authentication required';
  end if;

  select d.id into v_driver_id
  from public.drivers d
  where d.user_id = v_user_id
    and d.status = 'active';

  if v_driver_id is null then
    raise exception 'Current user is not an active driver';
  end if;

  -- Tokens arrive from a camera decode, a manual keyboard entry, or text pasted out of a share
  -- message, so strip whitespace the barcode payload never carried instead of reporting a bogus
  -- "QR غير صالح".
  v_token := regexp_replace(coalesce(p_qr_token, ''), '\s', '', 'g');

  if v_token = '' then
    return query select 'invalid'::qr_scan_result, null::uuid, null::uuid, null::ticket_type, null::booking_status, 0, null::text, 'QR غير صالح'::text;
    return;
  end if;

  select * into v_ticket from public.tickets where qr_token = v_token;

  if v_ticket.id is null then
    return query select 'invalid'::qr_scan_result, null::uuid, null::uuid, null::ticket_type, null::booking_status, 0, null::text, 'QR غير صالح'::text;
    return;
  end if;

  if v_ticket.booking_passenger_id is not null then
    select bp.full_name into v_passenger_name
    from public.booking_passengers bp
    where bp.id = v_ticket.booking_passenger_id;
  end if;

  v_reported_count := case
    when v_ticket.ticket_type = 'individual' then 1
    else (select b.count_passengers from public.bookings b where b.id = v_ticket.booking_id)
  end;

  select * into v_booking from public.bookings where id = v_ticket.booking_id;
  v_trip_id := v_booking.trip_id;

  select count(*) into v_driver_trip_count
  from public.trips
  where id = v_trip_id and driver_id = v_driver_id;

  if v_driver_trip_count = 0 then
    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'invalid');

    return query select 'invalid'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, v_booking.booking_status, v_reported_count, v_passenger_name, 'السائق غير مكلّف بهذه الرحلة'::text;
    return;
  end if;

  if p_expected_trip_id is not null and v_trip_id is distinct from p_expected_trip_id then
    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'invalid');

    return query select 'invalid'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, v_booking.booking_status, v_reported_count, v_passenger_name, 'هذه التذكرة لرحلة أخرى. افتح صفحة الرحلة الصحيحة ثم امسح مجدداً'::text;
    return;
  end if;

  if v_ticket.status = 'cancelled' then
    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'cancelled');

    return query select 'cancelled'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, v_booking.booking_status, v_reported_count, v_passenger_name, 'التذكرة ملغاة'::text;
    return;
  end if;

  if v_ticket.status in ('boarded','completed') then
    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'already_boarded');

    return query select 'already_boarded'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, v_booking.booking_status, v_reported_count, v_passenger_name, 'تم استخدام التذكرة مسبقاً'::text;
    return;
  end if;

  if v_ticket.status <> 'issued' then
    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'invalid');

    return query select 'invalid'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, v_booking.booking_status, v_reported_count, v_passenger_name, 'حالة التذكرة غير صالحة للصعود'::text;
    return;
  end if;

  if v_ticket.ticket_type = 'group' then
    update public.tickets
    set status = 'boarded', boarded_at = now()
    where id = v_ticket.id;

    update public.bookings
    set booking_status = 'boarded'
    where id = v_booking.id;

    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'valid');

    return query select 'valid'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, 'boarded'::booking_status, v_booking.count_passengers, null::text, 'تم تأكيد صعود جميع ركاب الحجز الجماعي'::text;
    return;
  end if;

  update public.tickets
  set status = 'boarded', boarded_at = now()
  where id = v_ticket.id;

  select count(*) into v_total_tickets
  from public.tickets t
  where t.booking_id = v_booking.id
    and t.ticket_type = 'individual'
    and t.status <> 'cancelled';

  select count(*) into v_boarded_tickets
  from public.tickets t
  where t.booking_id = v_booking.id
    and t.ticket_type = 'individual'
    and t.status in ('boarded', 'completed');

  if v_total_tickets = v_boarded_tickets then
    update public.bookings set booking_status = 'boarded' where id = v_booking.id;
  else
    update public.bookings set booking_status = 'partially_boarded' where id = v_booking.id;
  end if;

  insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
  values (v_ticket.id, v_trip_id, v_driver_id, 'valid');

  return query select 'valid'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type,
    (select b.booking_status from public.bookings b where b.id = v_booking.id),
    1,
    v_passenger_name,
    ('تم تأكيد صعود الراكب' || case when v_passenger_name is null then '' else ': ' || v_passenger_name end)::text;
  return;
end;
$$;

-- drop/create resets the ACL to the default (execute to PUBLIC), matching what is deployed today.
-- The grant is spelled out only so the intended caller is explicit; the function still refuses
-- anyone who is not an active driver.
grant execute on function public.scan_ticket_qr(text, uuid) to authenticated;
