-- DELTA فقط — إذا نفّذت bolman_bookings_list_perf.sql سابقاً فالفهارس موجودة.
-- هذا الملف يحدّث ترتيب get_bookings_page_ids فقط:
--   قبل: month_rank, departure_datetime asc, created_at desc
--   بعد: created_at desc (أحدث حجز أولاً)

create or replace function public.get_bookings_page_ids(
  p_company_id uuid default null,
  p_limit integer default 30,
  p_offset integer default 0,
  p_search text default null,
  p_booking_status text default null,
  p_payment_status text default null,
  p_payment_method text default null,
  p_ticket_mode text default null,
  p_trip_date_from date default null,
  p_trip_date_to date default null
)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select
      b.id,
      b.created_at
    from public.bookings b
    inner join public.trips t on t.id = b.trip_id
    where (p_company_id is null or t.company_id = p_company_id)
      and (p_booking_status is null or b.booking_status = p_booking_status::booking_status)
      and (p_payment_status is null or b.payment_status = p_payment_status::payment_status)
      and (p_ticket_mode is null or b.ticket_mode = p_ticket_mode::ticket_type)
      and (p_trip_date_from is null or t.departure_datetime::date >= p_trip_date_from)
      and (p_trip_date_to is null or t.departure_datetime::date <= p_trip_date_to)
      and (
        p_payment_method is null
        or exists (
          select 1
          from public.payments p
          where p.booking_id = b.id
            and p.payment_method = p_payment_method::payment_method
        )
      )
      and (
        p_search is null
        or btrim(p_search) = ''
        or b.id::text ilike '%' || btrim(p_search) || '%'
        or exists (
          select 1
          from public.users u
          where u.id in (b.booker_user_id, b.created_by_user_id)
            and u.full_name ilike '%' || btrim(p_search) || '%'
        )
      )
  ),
  ranked as (
    select id
    from filtered
    order by created_at desc
    limit greatest(p_limit, 0)
    offset greatest(p_offset, 0)
  ),
  cnt as (
    select count(*)::bigint as total
    from filtered
  )
  select json_build_object(
    'total', (select total from cnt),
    'ids', coalesce((select json_agg(id) from ranked), '[]'::json)
  );
$$;

notify pgrst, 'reload schema';
