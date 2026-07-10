-- Office manual booking paid from a registered passenger's wallet (staff debits booker wallet).

create or replace function public.confirm_office_wallet_booking(
  p_booker_user_id uuid,
  p_trip_id uuid,
  p_from_trip_stop_id uuid,
  p_to_trip_stop_id uuid,
  p_bus_seat_ids uuid[],
  p_passengers jsonb,
  p_ticket_mode ticket_type default 'group'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff_user_id uuid := auth.uid();
  v_trip_company uuid;
  v_passenger_count int;
  v_seat_count int;
  v_trip_price numeric(12,2);
  v_price_total numeric(12,2);
  v_wallet_id uuid;
  v_wallet_balance numeric(12,2);
  v_booking_id uuid;
  v_wallet_transaction_id uuid;
  v_seat_id uuid;
  v_passenger jsonb;
  v_passenger_id uuid;
  v_passenger_ids uuid[] := '{}';
  v_available_count int;
begin
  if v_staff_user_id is null or not public.is_active_user() then
    raise exception 'Authentication required';
  end if;

  if p_booker_user_id is null then
    raise exception 'Booker user is required for wallet payment';
  end if;

  perform 1
  from public.users u
  where u.id = p_booker_user_id
    and u.role = 'passenger'
    and u.status = 'active';

  if not found then
    raise exception 'Booker must be an active registered passenger';
  end if;

  select company_id into v_trip_company from public.trips where id = p_trip_id;
  if v_trip_company is null then
    raise exception 'Trip not found';
  end if;

  if not public.has_company_permission(v_trip_company, 'manage_bookings') then
    raise exception 'You do not have permission to create office bookings for this company';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_trip_id::text, 0));

  if jsonb_typeof(p_passengers) <> 'array' then
    raise exception 'p_passengers must be a JSON array';
  end if;

  v_passenger_count := jsonb_array_length(p_passengers);
  v_seat_count := array_length(p_bus_seat_ids, 1);

  if v_passenger_count <= 0 or v_seat_count is null or v_seat_count <> v_passenger_count then
    raise exception 'Seat count must equal passenger count';
  end if;

  select count(*) into v_available_count
  from public.get_seats_status(p_trip_id, p_from_trip_stop_id, p_to_trip_stop_id)
  where bus_seat_id = any(p_bus_seat_ids)
    and status = 'available';

  if v_available_count <> v_seat_count then
    raise exception 'One or more selected seats are not available';
  end if;

  select coalesce(price_offer, price) into v_trip_price
  from public.trips
  where id = p_trip_id
    and status in ('scheduled', 'active');

  if v_trip_price is null then
    raise exception 'Trip not found or not available for booking';
  end if;

  v_price_total := v_trip_price * v_passenger_count;

  select id, balance into v_wallet_id, v_wallet_balance
  from public.wallets
  where user_id = p_booker_user_id
  for update;

  if v_wallet_id is null then
    raise exception 'Wallet not found';
  end if;

  if v_wallet_balance < v_price_total then
    raise exception 'Insufficient wallet balance';
  end if;

  insert into public.bookings (
    trip_id, booker_user_id, from_trip_stop_id, to_trip_stop_id,
    count_passengers, payment_status, booking_status, price_total,
    created_by_user_id, ticket_mode
  ) values (
    p_trip_id, p_booker_user_id, p_from_trip_stop_id, p_to_trip_stop_id,
    v_passenger_count, 'success', 'confirmed', v_price_total,
    v_staff_user_id, p_ticket_mode
  ) returning id into v_booking_id;

  for v_passenger in select * from jsonb_array_elements(p_passengers)
  loop
    if coalesce(v_passenger->>'full_name','') = '' or coalesce(v_passenger->>'national_id','') = '' then
      raise exception 'Each passenger must have full_name and national_id';
    end if;

    insert into public.booking_passengers (booking_id, user_id, full_name, phone, national_id)
    values (
      v_booking_id,
      nullif(v_passenger->>'user_id','')::uuid,
      v_passenger->>'full_name',
      nullif(v_passenger->>'phone',''),
      v_passenger->>'national_id'
    ) returning id into v_passenger_id;

    v_passenger_ids := array_append(v_passenger_ids, v_passenger_id);
  end loop;

  foreach v_seat_id in array p_bus_seat_ids loop
    insert into public.booking_seats (booking_id, bus_seat_id, from_trip_stop_id, to_trip_stop_id, status)
    values (v_booking_id, v_seat_id, p_from_trip_stop_id, p_to_trip_stop_id, 'confirmed');
  end loop;

  update public.wallets
  set balance = balance - v_price_total
  where id = v_wallet_id;

  insert into public.wallet_transactions (
    wallet_id, booking_id, transaction_type, source_type,
    amount, status, transaction_reference, performed_by_user_id,
    notes, balance_after
  ) values (
    v_wallet_id, v_booking_id, 'debit', 'booking',
    v_price_total, 'success', 'BOOKING-' || v_booking_id::text, v_staff_user_id,
    'Office wallet payment for booking', v_wallet_balance - v_price_total
  ) returning id into v_wallet_transaction_id;

  insert into public.payments (
    booking_id, wallet_id, amount, payment_method, status,
    wallet_transaction_id, paid_by_user_id, paid_at
  ) values (
    v_booking_id, v_wallet_id, v_price_total, 'wallet', 'success',
    v_wallet_transaction_id, p_booker_user_id, now()
  );

  if p_ticket_mode = 'group' then
    insert into public.tickets (booking_id, booking_passenger_id, ticket_type, ticket_code, qr_token, status)
    values (v_booking_id, null, 'group', public.generate_ticket_code(), public.generate_qr_token(), 'issued');
  else
    foreach v_passenger_id in array v_passenger_ids loop
      insert into public.tickets (booking_id, booking_passenger_id, ticket_type, ticket_code, qr_token, status)
      values (v_booking_id, v_passenger_id, 'individual', public.generate_ticket_code(), public.generate_qr_token(), 'issued');
    end loop;
  end if;

  return v_booking_id;
end;
$$;

revoke all on function public.confirm_office_wallet_booking(uuid, uuid, uuid, uuid, uuid[], jsonb, ticket_type) from public;
grant execute on function public.confirm_office_wallet_booking(uuid, uuid, uuid, uuid, uuid[], jsonb, ticket_type) to authenticated;
