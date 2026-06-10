-- =========================================================
-- BOLMAN Intercity Bus Booking System
-- Supabase PostgreSQL Schema + Auth Integration + RLS Policies
-- النسخة المعتمدة للبدء بالباك-إند
-- =========================================================
-- IMPORTANT:
-- 1) This file is designed for a fresh Supabase project/database.
-- 2) public.users.id is linked to auth.users.id.
-- 3) Passwords are NOT stored in public.users. Supabase Auth manages passwords.
-- 4) Permissions are split into:
--      - system_staff_permissions
--      - company_staff_permissions
-- 5) Ratings are stored inside bookings as rating_value only. No comment field.
-- 6) bookings 1:N payments is supported.
-- 7) Group QR scan means all passengers in the booking boarded.
-- 8) Seat availability is segment-based using trip_stops.order_stop.
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- ENUM TYPES
-- =========================================================
do $$ begin create type user_role as enum ('super_admin','system_staff','company_owner','company_staff','driver','passenger'); exception when duplicate_object then null; end $$;
do $$ begin create type account_status as enum ('active','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type company_status as enum ('active','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type bus_layout_type as enum ('2_2','2_1'); exception when duplicate_object then null; end $$;
do $$ begin create type bus_status as enum ('available','in_service','inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type driver_status as enum ('active','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type trip_status as enum ('scheduled','active','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type stop_type as enum ('city','rest_stop'); exception when duplicate_object then null; end $$;
do $$ begin create type booking_status as enum ('pending','confirmed','partially_boarded','boarded','completed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_status as enum ('pending','success','failed','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('wallet','office_cash'); exception when duplicate_object then null; end $$;
do $$ begin create type booking_seat_status as enum ('confirmed','cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type wallet_transaction_type as enum ('credit','debit'); exception when duplicate_object then null; end $$;
do $$ begin create type wallet_source_type as enum ('mtn_cash','syriatel_cash','office_topup','office_withdrawal','booking','refund'); exception when duplicate_object then null; end $$;
do $$ begin create type transaction_status as enum ('pending','success','failed'); exception when duplicate_object then null; end $$;
do $$ begin create type ticket_status as enum ('issued','boarded','completed','cancelled','no_show'); exception when duplicate_object then null; end $$;
do $$ begin create type ticket_type as enum ('group','individual'); exception when duplicate_object then null; end $$;
do $$ begin create type qr_scan_result as enum ('valid','invalid','cancelled','already_boarded'); exception when duplicate_object then null; end $$;
do $$ begin create type seat_public_status as enum ('available','reserved','locked','inactive'); exception when duplicate_object then null; end $$;
do $$ begin create type device_platform as enum ('android','ios','web'); exception when duplicate_object then null; end $$;

-- =========================================================
-- COMMON UPDATED_AT TRIGGER
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- CORE USERS AND PERMISSIONS
-- =========================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text unique,
  email text unique,
  role user_role not null default 'passenger',
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_full_name_not_empty check (length(trim(full_name)) > 0),
  constraint users_email_not_empty check (email is null or length(trim(email)) > 0),
  constraint users_phone_not_empty check (phone is null or length(trim(phone)) > 0)
);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users for each row execute function public.set_updated_at();

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  logo_url text,
  status company_status not null default 'active',
  owner_user_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_name_not_empty check (length(trim(name)) > 0)
);

create index if not exists idx_companies_owner_user_id on public.companies(owner_user_id);
drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at before update on public.companies for each row execute function public.set_updated_at();

create table if not exists public.system_staff_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  can_manage_companies boolean not null default false,
  can_manage_cities boolean not null default false,
  can_view_reports boolean not null default false,
  can_manage_system_staff boolean not null default false,
  can_view_bookings boolean not null default false,
  can_view_trips boolean not null default false,
  can_view_scan_logs boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_system_staff_permissions_updated_at on public.system_staff_permissions;
create trigger trg_system_staff_permissions_updated_at before update on public.system_staff_permissions for each row execute function public.set_updated_at();

create table if not exists public.company_staff_permissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  can_manage_buses boolean not null default false,
  can_manage_trips boolean not null default false,
  can_manage_bookings boolean not null default false,
  can_manage_drivers boolean not null default false,
  can_view_reports boolean not null default false,
  can_send_notifications boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_company_staff_once unique (company_id, user_id)
);

create index if not exists idx_company_staff_permissions_user_id on public.company_staff_permissions(user_id);
create index if not exists idx_company_staff_permissions_company_id on public.company_staff_permissions(company_id);
drop trigger if exists trg_company_staff_permissions_updated_at on public.company_staff_permissions;
create trigger trg_company_staff_permissions_updated_at before update on public.company_staff_permissions for each row execute function public.set_updated_at();

-- =========================================================
-- GEOGRAPHY AND COMPANY OPERATIONS
-- =========================================================
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cities_name_not_empty check (length(trim(name)) > 0)
);

drop trigger if exists trg_cities_updated_at on public.cities;
create trigger trg_cities_updated_at before update on public.cities for each row execute function public.set_updated_at();

create table if not exists public.rest_stops (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rest_stops_name_not_empty check (length(trim(name)) > 0)
);

create index if not exists idx_rest_stops_company_id on public.rest_stops(company_id);
drop trigger if exists trg_rest_stops_updated_at on public.rest_stops;
create trigger trg_rest_stops_updated_at before update on public.rest_stops for each row execute function public.set_updated_at();

create table if not exists public.buses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  number_bus text not null,
  seat_layout_type bus_layout_type not null,
  total_seats integer not null check (total_seats > 0),
  status bus_status not null default 'available',
  current_city_id uuid references public.cities(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_bus_number_per_company unique (company_id, number_bus),
  constraint buses_number_not_empty check (length(trim(number_bus)) > 0)
);

create index if not exists idx_buses_company_id on public.buses(company_id);
create index if not exists idx_buses_current_city_id on public.buses(current_city_id);
drop trigger if exists trg_buses_updated_at on public.buses;
create trigger trg_buses_updated_at before update on public.buses for each row execute function public.set_updated_at();

create table if not exists public.bus_seats (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references public.buses(id) on delete cascade,
  seat_number integer not null check (seat_number > 0),
  column_position text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_bus_seat_number unique (bus_id, seat_number),
  constraint bus_seats_column_position_not_empty check (length(trim(column_position)) > 0)
);

create index if not exists idx_bus_seats_bus_id on public.bus_seats(bus_id);
drop trigger if exists trg_bus_seats_updated_at on public.bus_seats;
create trigger trg_bus_seats_updated_at before update on public.bus_seats for each row execute function public.set_updated_at();

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null unique references public.users(id) on delete cascade,
  license_number text not null,
  status driver_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_driver_license_per_company unique (company_id, license_number),
  constraint drivers_license_not_empty check (length(trim(license_number)) > 0)
);

create index if not exists idx_drivers_company_id on public.drivers(company_id);
create index if not exists idx_drivers_user_id on public.drivers(user_id);
drop trigger if exists trg_drivers_updated_at on public.drivers;
create trigger trg_drivers_updated_at before update on public.drivers for each row execute function public.set_updated_at();

-- =========================================================
-- TRIPS AND ROUTE STOPS
-- =========================================================
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bus_id uuid not null references public.buses(id) on delete restrict,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  origin_city_id uuid not null references public.cities(id) on delete restrict,
  destination_city_id uuid not null references public.cities(id) on delete restrict,
  departure_datetime timestamptz not null,
  expected_arrival_datetime timestamptz not null,
  price numeric(12,2) not null check (price >= 0),
  status trip_status not null default 'scheduled',
  offer_is boolean not null default false,
  price_offer numeric(12,2),
  title_offer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_time_valid check (expected_arrival_datetime > departure_datetime),
  constraint trips_cities_different check (origin_city_id <> destination_city_id),
  constraint trips_offer_price_valid check (
    (offer_is = false and price_offer is null and title_offer is null)
    or
    (offer_is = true and price_offer is not null and price_offer >= 0 and price_offer <= price and title_offer is not null and length(trim(title_offer)) > 0)
  )
);

create index if not exists idx_trips_company_id on public.trips(company_id);
create index if not exists idx_trips_bus_id on public.trips(bus_id);
create index if not exists idx_trips_driver_id on public.trips(driver_id);
create index if not exists idx_trips_route_date on public.trips(origin_city_id, destination_city_id, departure_datetime);
create index if not exists idx_trips_status_date on public.trips(status, departure_datetime);
drop trigger if exists trg_trips_updated_at on public.trips;
create trigger trg_trips_updated_at before update on public.trips for each row execute function public.set_updated_at();

create table if not exists public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stop_type stop_type not null,
  city_id uuid references public.cities(id) on delete restrict,
  rest_stop_id uuid references public.rest_stops(id) on delete restrict,
  order_stop integer not null check (order_stop > 0),
  time_arrival timestamptz,
  time_departure timestamptz,
  is_boarding_allowed boolean not null default false,
  is_dropoff_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_trip_order_stop unique (trip_id, order_stop),
  constraint trip_stop_type_valid check (
    (stop_type = 'city' and city_id is not null and rest_stop_id is null)
    or
    (stop_type = 'rest_stop' and rest_stop_id is not null and city_id is null)
  ),
  constraint trip_stop_time_valid check (
    time_arrival is null or time_departure is null or time_departure >= time_arrival
  )
);

create index if not exists idx_trip_stops_trip_id on public.trip_stops(trip_id);
create index if not exists idx_trip_stops_city_id on public.trip_stops(city_id);
create index if not exists idx_trip_stops_rest_stop_id on public.trip_stops(rest_stop_id);
drop trigger if exists trg_trip_stops_updated_at on public.trip_stops;
create trigger trg_trip_stops_updated_at before update on public.trip_stops for each row execute function public.set_updated_at();

-- =========================================================
-- BOOKINGS, PASSENGERS, SEATS, LOCKS
-- =========================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete restrict,
  booker_user_id uuid references public.users(id) on delete set null,
  from_trip_stop_id uuid not null references public.trip_stops(id) on delete restrict,
  to_trip_stop_id uuid not null references public.trip_stops(id) on delete restrict,
  count_passengers integer not null check (count_passengers > 0),
  payment_status payment_status not null default 'pending',
  booking_status booking_status not null default 'pending',
  price_total numeric(12,2) not null check (price_total >= 0),
  created_by_user_id uuid references public.users(id) on delete set null,
  ticket_mode ticket_type not null default 'group',
  rating_value smallint check (rating_value between 1 and 5),
  rating_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_rating_time_valid check (
    (rating_value is null and rating_created_at is null)
    or
    (rating_value is not null and rating_created_at is not null)
  )
);

create index if not exists idx_bookings_trip_id on public.bookings(trip_id);
create index if not exists idx_bookings_booker_user_id on public.bookings(booker_user_id);
create index if not exists idx_bookings_created_by_user_id on public.bookings(created_by_user_id);
create index if not exists idx_bookings_from_to on public.bookings(from_trip_stop_id, to_trip_stop_id);
drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();

create table if not exists public.booking_passengers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  full_name text not null,
  phone text,
  national_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_passenger_name_not_empty check (length(trim(full_name)) > 0),
  constraint booking_passenger_national_id_not_empty check (length(trim(national_id)) > 0)
);

create index if not exists idx_booking_passengers_booking_id on public.booking_passengers(booking_id);
create index if not exists idx_booking_passengers_user_id on public.booking_passengers(user_id);
create index if not exists idx_booking_passengers_national_id on public.booking_passengers(national_id);
drop trigger if exists trg_booking_passengers_updated_at on public.booking_passengers;
create trigger trg_booking_passengers_updated_at before update on public.booking_passengers for each row execute function public.set_updated_at();

create table if not exists public.booking_seats (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  bus_seat_id uuid not null references public.bus_seats(id) on delete restrict,
  from_trip_stop_id uuid not null references public.trip_stops(id) on delete restrict,
  to_trip_stop_id uuid not null references public.trip_stops(id) on delete restrict,
  status booking_seat_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_booking_seats_booking_id on public.booking_seats(booking_id);
create index if not exists idx_booking_seats_bus_seat_id on public.booking_seats(bus_seat_id);
create index if not exists idx_booking_seats_from_to on public.booking_seats(from_trip_stop_id, to_trip_stop_id);
drop trigger if exists trg_booking_seats_updated_at on public.booking_seats;
create trigger trg_booking_seats_updated_at before update on public.booking_seats for each row execute function public.set_updated_at();

create table if not exists public.seat_locks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  bus_seat_id uuid not null references public.bus_seats(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  from_trip_stop_id uuid not null references public.trip_stops(id) on delete restrict,
  to_trip_stop_id uuid not null references public.trip_stops(id) on delete restrict,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint seat_locks_expiry_valid check (expires_at > created_at)
);

create index if not exists idx_seat_locks_trip_id on public.seat_locks(trip_id);
create index if not exists idx_seat_locks_bus_seat_id on public.seat_locks(bus_seat_id);
create index if not exists idx_seat_locks_user_id on public.seat_locks(user_id);
create index if not exists idx_seat_locks_active on public.seat_locks(trip_id, bus_seat_id, expires_at);

-- =========================================================
-- WALLETS, PAYMENTS, TICKETS, NOTIFICATIONS, SCAN LOGS, FCM
-- =========================================================
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wallets_user_id on public.wallets(user_id);
drop trigger if exists trg_wallets_updated_at on public.wallets;
create trigger trg_wallets_updated_at before update on public.wallets for each row execute function public.set_updated_at();

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete set null,
  transaction_type wallet_transaction_type not null,
  source_type wallet_source_type not null,
  amount numeric(12,2) not null check (amount > 0),
  status transaction_status not null default 'pending',
  transaction_reference text,
  performed_by_user_id uuid references public.users(id) on delete set null,
  notes text,
  balance_after numeric(12,2),
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_transactions_wallet_id on public.wallet_transactions(wallet_id);
create index if not exists idx_wallet_transactions_booking_id on public.wallet_transactions(booking_id);
create index if not exists idx_wallet_transactions_performed_by on public.wallet_transactions(performed_by_user_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method payment_method not null,
  status payment_status not null default 'pending',
  wallet_transaction_id uuid unique references public.wallet_transactions(id) on delete set null,
  paid_by_user_id uuid references public.users(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payments_method_valid check (
    (payment_method = 'wallet' and wallet_id is not null)
    or
    (payment_method = 'office_cash' and wallet_id is null and wallet_transaction_id is null)
  )
);

create index if not exists idx_payments_booking_id on public.payments(booking_id);
create index if not exists idx_payments_wallet_id on public.payments(wallet_id);
create index if not exists idx_payments_paid_by_user_id on public.payments(paid_by_user_id);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  booking_passenger_id uuid references public.booking_passengers(id) on delete cascade,
  ticket_type ticket_type not null default 'group',
  ticket_code text not null unique,
  qr_token text not null unique,
  status ticket_status not null default 'issued',
  boarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tickets_type_passenger_valid check (
    (ticket_type = 'group' and booking_passenger_id is null)
    or
    (ticket_type = 'individual' and booking_passenger_id is not null)
  )
);

create index if not exists idx_tickets_booking_id on public.tickets(booking_id);
create index if not exists idx_tickets_booking_passenger_id on public.tickets(booking_passenger_id);
create index if not exists idx_tickets_qr_token on public.tickets(qr_token);
drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at before update on public.tickets for each row execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  related_trip_id uuid references public.trips(id) on delete set null,
  related_booking_id uuid references public.bookings(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_related_trip_id on public.notifications(related_trip_id);
create index if not exists idx_notifications_related_booking_id on public.notifications(related_booking_id);

create table if not exists public.qr_scan_logs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  scan_result qr_scan_result not null,
  scanned_at timestamptz not null default now()
);

create index if not exists idx_qr_scan_logs_ticket_id on public.qr_scan_logs(ticket_id);
create index if not exists idx_qr_scan_logs_trip_id on public.qr_scan_logs(trip_id);
create index if not exists idx_qr_scan_logs_driver_id on public.qr_scan_logs(driver_id);

create table if not exists public.user_fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  platform device_platform not null,
  device_id text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_fcm_tokens_user_id on public.user_fcm_tokens(user_id);
drop trigger if exists trg_user_fcm_tokens_updated_at on public.user_fcm_tokens;
create trigger trg_user_fcm_tokens_updated_at before update on public.user_fcm_tokens for each row execute function public.set_updated_at();

-- =========================================================
-- AUTH SIGNUP TRIGGER
-- Creates public.users row automatically when auth.users is created.
-- Default role is passenger unless raw_user_meta_data.role is provided.
-- =========================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role user_role;
  v_full_name text;
  v_phone text;
  v_email text;
begin
  v_email := new.email;
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'مستخدم'), '@', 1));
  v_phone := coalesce(new.raw_user_meta_data->>'phone', new.phone);

  begin
    v_role := coalesce(nullif(new.raw_user_meta_data->>'role','')::user_role, 'passenger'::user_role);
  exception when others then
    v_role := 'passenger'::user_role;
  end;

  insert into public.users (id, full_name, phone, email, role, status)
  values (new.id, v_full_name, v_phone, v_email, v_role, 'active')
  on conflict (id) do update
  set email = excluded.email,
      phone = coalesce(public.users.phone, excluded.phone),
      full_name = coalesce(nullif(public.users.full_name,''), excluded.full_name),
      updated_at = now();

  -- Automatically create wallet for passengers.
  if v_role = 'passenger' then
    insert into public.wallets (user_id, balance)
    values (new.id, 0)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_bolman on auth.users;
create trigger on_auth_user_created_bolman
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- =========================================================
-- DATA INTEGRITY TRIGGERS
-- =========================================================
create or replace function public.validate_company_owner_role()
returns trigger
language plpgsql
as $$
declare
  v_role user_role;
begin
  select role into v_role from public.users where id = new.owner_user_id;
  if v_role <> 'company_owner' then
    raise exception 'companies.owner_user_id must reference a user with role=company_owner';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_company_owner_role on public.companies;
create trigger trg_validate_company_owner_role before insert or update on public.companies for each row execute function public.validate_company_owner_role();

create or replace function public.validate_user_role_extensions()
returns trigger
language plpgsql
as $$
declare
  v_role user_role;
begin
  select role into v_role from public.users where id = new.user_id;

  if tg_table_name = 'drivers' and v_role <> 'driver' then
    raise exception 'drivers.user_id must reference a user with role=driver';
  end if;

  if tg_table_name = 'system_staff_permissions' and v_role <> 'system_staff' then
    raise exception 'system_staff_permissions.user_id must reference a user with role=system_staff';
  end if;

  if tg_table_name = 'company_staff_permissions' and v_role <> 'company_staff' then
    raise exception 'company_staff_permissions.user_id must reference a user with role=company_staff';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_driver_user_role on public.drivers;
create trigger trg_validate_driver_user_role before insert or update on public.drivers for each row execute function public.validate_user_role_extensions();

drop trigger if exists trg_validate_system_staff_user_role on public.system_staff_permissions;
create trigger trg_validate_system_staff_user_role before insert or update on public.system_staff_permissions for each row execute function public.validate_user_role_extensions();

drop trigger if exists trg_validate_company_staff_user_role on public.company_staff_permissions;
create trigger trg_validate_company_staff_user_role before insert or update on public.company_staff_permissions for each row execute function public.validate_user_role_extensions();

create or replace function public.validate_trip_company_consistency()
returns trigger
language plpgsql
as $$
declare
  v_bus_company uuid;
  v_driver_company uuid;
begin
  select company_id into v_bus_company from public.buses where id = new.bus_id;
  select company_id into v_driver_company from public.drivers where id = new.driver_id;

  if v_bus_company <> new.company_id then
    raise exception 'trip.bus_id must belong to same company as trip.company_id';
  end if;

  if v_driver_company <> new.company_id then
    raise exception 'trip.driver_id must belong to same company as trip.company_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_trip_company_consistency on public.trips;
create trigger trg_validate_trip_company_consistency before insert or update on public.trips for each row execute function public.validate_trip_company_consistency();

create or replace function public.validate_trip_stop_company_consistency()
returns trigger
language plpgsql
as $$
declare
  v_trip_company uuid;
  v_rest_company uuid;
begin
  if new.stop_type = 'rest_stop' then
    select company_id into v_trip_company from public.trips where id = new.trip_id;
    select company_id into v_rest_company from public.rest_stops where id = new.rest_stop_id;
    if v_trip_company <> v_rest_company then
      raise exception 'rest_stop_id must belong to same company as trip';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_trip_stop_company_consistency on public.trip_stops;
create trigger trg_validate_trip_stop_company_consistency before insert or update on public.trip_stops for each row execute function public.validate_trip_stop_company_consistency();

create or replace function public.validate_segment_same_trip()
returns trigger
language plpgsql
as $$
declare
  v_from_trip uuid;
  v_to_trip uuid;
  v_from_order int;
  v_to_order int;
  v_booking_trip uuid;
  v_booking_bus uuid;
  v_seat_bus uuid;
begin
  select trip_id, order_stop into v_from_trip, v_from_order from public.trip_stops where id = new.from_trip_stop_id;
  select trip_id, order_stop into v_to_trip, v_to_order from public.trip_stops where id = new.to_trip_stop_id;

  if v_from_trip is null or v_to_trip is null or v_from_trip <> v_to_trip then
    raise exception 'from_trip_stop_id and to_trip_stop_id must belong to the same trip';
  end if;

  if v_from_order >= v_to_order then
    raise exception 'from_trip_stop order must be less than to_trip_stop order';
  end if;

  if tg_table_name = 'bookings' then
    if new.trip_id <> v_from_trip then
      raise exception 'booking.trip_id must match trip_stops trip_id';
    end if;
  elsif tg_table_name = 'booking_seats' then
    select b.trip_id, t.bus_id into v_booking_trip, v_booking_bus
    from public.bookings b
    join public.trips t on t.id = b.trip_id
    where b.id = new.booking_id;

    if v_booking_trip <> v_from_trip then
      raise exception 'booking_seats segment must match booking trip';
    end if;

    select bus_id into v_seat_bus from public.bus_seats where id = new.bus_seat_id;
    if v_seat_bus <> v_booking_bus then
      raise exception 'booking_seats.bus_seat_id must belong to the trip bus';
    end if;
  elsif tg_table_name = 'seat_locks' then
    if new.trip_id <> v_from_trip then
      raise exception 'seat_locks.trip_id must match trip_stops trip_id';
    end if;

    select t.bus_id into v_booking_bus from public.trips t where t.id = new.trip_id;
    select bus_id into v_seat_bus from public.bus_seats where id = new.bus_seat_id;
    if v_seat_bus <> v_booking_bus then
      raise exception 'seat_locks.bus_seat_id must belong to the trip bus';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_booking_segment on public.bookings;
create trigger trg_validate_booking_segment before insert or update on public.bookings for each row execute function public.validate_segment_same_trip();

drop trigger if exists trg_validate_booking_seat_segment on public.booking_seats;
create trigger trg_validate_booking_seat_segment before insert or update on public.booking_seats for each row execute function public.validate_segment_same_trip();

drop trigger if exists trg_validate_seat_lock_segment on public.seat_locks;
create trigger trg_validate_seat_lock_segment before insert or update on public.seat_locks for each row execute function public.validate_segment_same_trip();

create or replace function public.validate_ticket_passenger_booking()
returns trigger
language plpgsql
as $$
declare
  v_passenger_booking uuid;
begin
  if new.ticket_type = 'individual' then
    select booking_id into v_passenger_booking from public.booking_passengers where id = new.booking_passenger_id;
    if v_passenger_booking <> new.booking_id then
      raise exception 'ticket.booking_passenger_id must belong to same booking';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_ticket_passenger_booking on public.tickets;
create trigger trg_validate_ticket_passenger_booking before insert or update on public.tickets for each row execute function public.validate_ticket_passenger_booking();

create or replace function public.validate_booking_rating()
returns trigger
language plpgsql
as $$
begin
  if new.rating_value is not null and new.booking_status <> 'completed' then
    raise exception 'booking can be rated only when booking_status=completed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_booking_rating on public.bookings;
create trigger trg_validate_booking_rating before insert or update on public.bookings for each row execute function public.validate_booking_rating();

-- =========================================================
-- RLS HELPER FUNCTIONS FOR PERMISSIONS
-- SECURITY DEFINER is used to avoid recursive RLS checks.
-- =========================================================
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
    and u.status = 'active'
  limit 1;
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.status = 'active'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role = 'super_admin'
      and u.status = 'active'
  );
$$;

create or replace function public.has_system_permission(p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_allowed boolean := false;
begin
  if public.is_super_admin() then
    return true;
  end if;

  select case p_permission
    when 'manage_companies' then s.can_manage_companies
    when 'manage_cities' then s.can_manage_cities
    when 'view_reports' then s.can_view_reports
    when 'manage_system_staff' then s.can_manage_system_staff
    when 'view_bookings' then s.can_view_bookings
    when 'view_trips' then s.can_view_trips
    when 'view_scan_logs' then s.can_view_scan_logs
    else false
  end
  into v_allowed
  from public.system_staff_permissions s
  join public.users u on u.id = s.user_id
  where s.user_id = auth.uid()
    and u.role = 'system_staff'
    and u.status = 'active';

  return coalesce(v_allowed, false);
end;
$$;

create or replace function public.is_company_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    join public.users u on u.id = c.owner_user_id
    where c.id = p_company_id
      and c.owner_user_id = auth.uid()
      and c.status = 'active'
      and u.role = 'company_owner'
      and u.status = 'active'
  );
$$;

create or replace function public.has_company_permission(p_company_id uuid, p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_allowed boolean := false;
begin
  if public.is_super_admin() then
    return true;
  end if;

  if public.is_company_owner(p_company_id) then
    return true;
  end if;

  select case p_permission
    when 'manage_buses' then csp.can_manage_buses
    when 'manage_trips' then csp.can_manage_trips
    when 'manage_bookings' then csp.can_manage_bookings
    when 'manage_drivers' then csp.can_manage_drivers
    when 'view_reports' then csp.can_view_reports
    when 'send_notifications' then csp.can_send_notifications
    else false
  end
  into v_allowed
  from public.company_staff_permissions csp
  join public.users u on u.id = csp.user_id
  where csp.user_id = auth.uid()
    and csp.company_id = p_company_id
    and u.role = 'company_staff'
    and u.status = 'active';

  return coalesce(v_allowed, false);
end;
$$;

create or replace function public.can_view_company_data(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
      or public.has_system_permission('view_reports')
      or public.has_system_permission('view_trips')
      or public.has_system_permission('view_bookings')
      or public.has_system_permission('view_scan_logs')
      or public.has_company_permission(p_company_id, 'view_reports')
      or public.has_company_permission(p_company_id, 'manage_buses')
      or public.has_company_permission(p_company_id, 'manage_trips')
      or public.has_company_permission(p_company_id, 'manage_bookings')
      or public.has_company_permission(p_company_id, 'manage_drivers')
      or public.has_company_permission(p_company_id, 'send_notifications');
$$;

create or replace function public.trip_company_id(p_trip_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.company_id from public.trips t where t.id = p_trip_id;
$$;

create or replace function public.booking_company_id(p_booking_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.company_id
  from public.bookings b
  join public.trips t on t.id = b.trip_id
  where b.id = p_booking_id;
$$;

create or replace function public.ticket_company_id(p_ticket_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.company_id
  from public.tickets tk
  join public.bookings b on b.id = tk.booking_id
  join public.trips t on t.id = b.trip_id
  where tk.id = p_ticket_id;
$$;

create or replace function public.is_driver_for_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    join public.drivers d on d.id = t.driver_id
    join public.users u on u.id = d.user_id
    where t.id = p_trip_id
      and d.user_id = auth.uid()
      and d.status = 'active'
      and u.status = 'active'
      and u.role = 'driver'
  );
$$;

create or replace function public.user_owns_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and b.booker_user_id = auth.uid()
  );
$$;

create or replace function public.can_read_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_owns_booking(p_booking_id)
      or public.has_system_permission('view_bookings')
      or public.has_company_permission(public.booking_company_id(p_booking_id), 'manage_bookings')
      or exists (
        select 1
        from public.bookings b
        where b.id = p_booking_id
          and public.is_driver_for_trip(b.trip_id)
      );
$$;

-- =========================================================
-- BUSINESS HELPER FUNCTIONS / RPC
-- =========================================================
create or replace function public.generate_ticket_code()
returns text
language plpgsql
as $$
begin
  return 'TCK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
end;
$$;

create or replace function public.generate_qr_token()
returns text
language plpgsql
as $$
begin
  return encode(gen_random_bytes(32), 'hex');
end;
$$;

create or replace function public.segments_overlap(
  existing_from_order int,
  existing_to_order int,
  requested_from_order int,
  requested_to_order int
)
returns boolean
language plpgsql
immutable
as $$
begin
  return existing_from_order < requested_to_order
     and existing_to_order > requested_from_order;
end;
$$;

-- SeatAvailabilityService equivalent.
create or replace function public.get_seats_status(
  p_trip_id uuid,
  p_from_trip_stop_id uuid,
  p_to_trip_stop_id uuid
)
returns table (
  bus_seat_id uuid,
  seat_number integer,
  column_position text,
  status seat_public_status
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_bus_id uuid;
  v_req_from_order int;
  v_req_to_order int;
begin
  if not public.is_active_user() then
    raise exception 'Authentication required';
  end if;

  select bus_id into v_bus_id from public.trips where id = p_trip_id;
  if v_bus_id is null then
    raise exception 'Trip not found';
  end if;

  select order_stop into v_req_from_order from public.trip_stops where id = p_from_trip_stop_id and trip_id = p_trip_id;
  select order_stop into v_req_to_order from public.trip_stops where id = p_to_trip_stop_id and trip_id = p_trip_id;

  if v_req_from_order is null or v_req_to_order is null then
    raise exception 'Invalid trip stops for this trip';
  end if;

  if v_req_from_order >= v_req_to_order then
    raise exception 'Invalid segment: from stop must be before to stop';
  end if;

  return query
  with requested as (
    select v_req_from_order as from_order, v_req_to_order as to_order
  ), reserved as (
    select distinct bs.bus_seat_id
    from public.booking_seats bs
    join public.bookings b on b.id = bs.booking_id
    join public.trip_stops ex_from on ex_from.id = bs.from_trip_stop_id
    join public.trip_stops ex_to on ex_to.id = bs.to_trip_stop_id
    cross join requested r
    where b.trip_id = p_trip_id
      and bs.status = 'confirmed'
      and b.booking_status in ('confirmed','partially_boarded','boarded','completed')
      and public.segments_overlap(ex_from.order_stop, ex_to.order_stop, r.from_order, r.to_order)
  ), locked as (
    select distinct sl.bus_seat_id
    from public.seat_locks sl
    join public.trip_stops ex_from on ex_from.id = sl.from_trip_stop_id
    join public.trip_stops ex_to on ex_to.id = sl.to_trip_stop_id
    cross join requested r
    where sl.trip_id = p_trip_id
      and sl.expires_at > now()
      and public.segments_overlap(ex_from.order_stop, ex_to.order_stop, r.from_order, r.to_order)
  )
  select
    s.id,
    s.seat_number,
    s.column_position,
    case
      when s.is_active = false then 'inactive'::seat_public_status
      when exists (select 1 from reserved r where r.bus_seat_id = s.id) then 'reserved'::seat_public_status
      when exists (select 1 from locked l where l.bus_seat_id = s.id) then 'locked'::seat_public_status
      else 'available'::seat_public_status
    end as status
  from public.bus_seats s
  where s.bus_id = v_bus_id
  order by s.seat_number;
end;
$$;

-- Lock seats before payment. Uses auth.uid(), not a passed user_id.
create or replace function public.lock_seats(
  p_trip_id uuid,
  p_from_trip_stop_id uuid,
  p_to_trip_stop_id uuid,
  p_bus_seat_ids uuid[],
  p_ttl_minutes int default 10
)
returns table (
  bus_seat_id uuid,
  status seat_public_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status record;
  v_locked_count int := 0;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Authentication required';
  end if;

  if p_ttl_minutes < 1 or p_ttl_minutes > 30 then
    raise exception 'Lock TTL must be between 1 and 30 minutes';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_trip_id::text, 0));

  delete from public.seat_locks where expires_at <= now();

  for v_status in
    select * from public.get_seats_status(p_trip_id, p_from_trip_stop_id, p_to_trip_stop_id)
    where bus_seat_id = any(p_bus_seat_ids)
  loop
    if v_status.status <> 'available' then
      raise exception 'Seat % is not available. Current status: %', v_status.seat_number, v_status.status;
    end if;
    v_locked_count := v_locked_count + 1;
  end loop;

  if v_locked_count <> array_length(p_bus_seat_ids, 1) then
    raise exception 'One or more seats do not belong to the trip bus';
  end if;

  delete from public.seat_locks
  where user_id = v_user_id
    and trip_id = p_trip_id
    and bus_seat_id = any(p_bus_seat_ids);

  insert into public.seat_locks (trip_id, bus_seat_id, user_id, from_trip_stop_id, to_trip_stop_id, expires_at)
  select p_trip_id, unnest(p_bus_seat_ids), v_user_id, p_from_trip_stop_id, p_to_trip_stop_id, now() + make_interval(mins => p_ttl_minutes);

  return query
  select g.bus_seat_id, g.status
  from public.get_seats_status(p_trip_id, p_from_trip_stop_id, p_to_trip_stop_id) g
  where g.bus_seat_id = any(p_bus_seat_ids);
end;
$$;

-- Confirm booking by wallet. Uses auth.uid() as booker.
-- p_passengers JSONB format:
-- [
--   {"full_name":"أحمد", "phone":"09...", "national_id":"123", "user_id":null},
--   {"full_name":"سارة", "national_id":"456"}
-- ]
create or replace function public.confirm_wallet_booking(
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
  v_user_id uuid := auth.uid();
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
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_trip_id::text, 0));

  if jsonb_typeof(p_passengers) <> 'array' then
    raise exception 'p_passengers must be a JSON array';
  end if;

  v_passenger_count := jsonb_array_length(p_passengers);
  v_seat_count := array_length(p_bus_seat_ids, 1);

  if v_passenger_count <= 0 then
    raise exception 'Passenger count must be greater than zero';
  end if;

  if v_seat_count is null or v_seat_count <> v_passenger_count then
    raise exception 'Seat count must equal passenger count';
  end if;

  perform 1
  from public.seat_locks
  where user_id = v_user_id
    and trip_id = p_trip_id
    and from_trip_stop_id = p_from_trip_stop_id
    and to_trip_stop_id = p_to_trip_stop_id
    and bus_seat_id = any(p_bus_seat_ids)
    and expires_at > now()
  for update;

  select count(*) into v_available_count
  from public.seat_locks
  where user_id = v_user_id
    and trip_id = p_trip_id
    and from_trip_stop_id = p_from_trip_stop_id
    and to_trip_stop_id = p_to_trip_stop_id
    and bus_seat_id = any(p_bus_seat_ids)
    and expires_at > now();

  if v_available_count <> v_seat_count then
    raise exception 'Valid seat locks are required for all selected seats';
  end if;

  select coalesce(price_offer, price) into v_trip_price
  from public.trips
  where id = p_trip_id
    and status = 'scheduled';

  if v_trip_price is null then
    raise exception 'Trip not found or not available for booking';
  end if;

  v_price_total := v_trip_price * v_passenger_count;

  select id, balance into v_wallet_id, v_wallet_balance
  from public.wallets
  where user_id = v_user_id
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
    p_trip_id, v_user_id, p_from_trip_stop_id, p_to_trip_stop_id,
    v_passenger_count, 'success', 'confirmed', v_price_total,
    v_user_id, p_ticket_mode
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
    v_price_total, 'success', 'BOOKING-' || v_booking_id::text, v_user_id,
    'Wallet payment for booking', v_wallet_balance - v_price_total
  ) returning id into v_wallet_transaction_id;

  insert into public.payments (
    booking_id, wallet_id, amount, payment_method, status,
    wallet_transaction_id, paid_by_user_id, paid_at
  ) values (
    v_booking_id, v_wallet_id, v_price_total, 'wallet', 'success',
    v_wallet_transaction_id, v_user_id, now()
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

  delete from public.seat_locks
  where user_id = v_user_id
    and trip_id = p_trip_id
    and bus_seat_id = any(p_bus_seat_ids);

  return v_booking_id;
end;
$$;

-- Confirm office cash booking. Uses auth.uid() as staff user.
create or replace function public.confirm_office_cash_booking(
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
  v_booking_id uuid;
  v_seat_id uuid;
  v_passenger jsonb;
  v_passenger_id uuid;
  v_passenger_ids uuid[] := '{}';
  v_available_count int;
begin
  if v_staff_user_id is null or not public.is_active_user() then
    raise exception 'Authentication required';
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
    and status = 'scheduled';

  if v_trip_price is null then
    raise exception 'Trip not found or not available for booking';
  end if;

  v_price_total := v_trip_price * v_passenger_count;

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

  insert into public.payments (
    booking_id, wallet_id, amount, payment_method, status,
    wallet_transaction_id, paid_by_user_id, paid_at
  ) values (
    v_booking_id, null, v_price_total, 'office_cash', 'success',
    null, v_staff_user_id, now()
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

-- Driver QR scan. Uses auth.uid() to identify driver.
create or replace function public.scan_ticket_qr(p_qr_token text)
returns table (
  scan_result qr_scan_result,
  booking_id uuid,
  ticket_id uuid,
  ticket_type ticket_type,
  booking_status booking_status,
  passenger_count integer,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_driver_id uuid;
  v_ticket public.tickets%rowtype;
  v_booking public.bookings%rowtype;
  v_trip_id uuid;
  v_driver_trip_count int;
  v_total_tickets int;
  v_boarded_tickets int;
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

  select * into v_ticket from public.tickets where qr_token = p_qr_token;

  if v_ticket.id is null then
    return query select 'invalid'::qr_scan_result, null::uuid, null::uuid, null::ticket_type, null::booking_status, 0, 'QR غير صالح'::text;
    return;
  end if;

  select * into v_booking from public.bookings where id = v_ticket.booking_id;
  v_trip_id := v_booking.trip_id;

  select count(*) into v_driver_trip_count
  from public.trips
  where id = v_trip_id and driver_id = v_driver_id;

  if v_driver_trip_count = 0 then
    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'invalid');

    return query select 'invalid'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, v_booking.booking_status, v_booking.count_passengers, 'السائق غير مكلّف بهذه الرحلة'::text;
    return;
  end if;

  if v_ticket.status = 'cancelled' then
    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'cancelled');

    return query select 'cancelled'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, v_booking.booking_status, v_booking.count_passengers, 'التذكرة ملغاة'::text;
    return;
  end if;

  if v_ticket.status in ('boarded','completed') then
    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'already_boarded');

    return query select 'already_boarded'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, v_booking.booking_status, v_booking.count_passengers, 'تم استخدام التذكرة مسبقاً'::text;
    return;
  end if;

  if v_ticket.status <> 'issued' then
    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'invalid');

    return query select 'invalid'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, v_booking.booking_status, v_booking.count_passengers, 'حالة التذكرة غير صالحة للصعود'::text;
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

    return query select 'valid'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type, 'boarded'::booking_status, v_booking.count_passengers, 'تم تأكيد صعود جميع ركاب الحجز الجماعي'::text;
    return;
  else
    update public.tickets
    set status = 'boarded', boarded_at = now()
    where id = v_ticket.id;

    select count(*) into v_total_tickets from public.tickets where booking_id = v_booking.id and ticket_type = 'individual' and status <> 'cancelled';
    select count(*) into v_boarded_tickets from public.tickets where booking_id = v_booking.id and ticket_type = 'individual' and status in ('boarded','completed');

    if v_total_tickets = v_boarded_tickets then
      update public.bookings set booking_status = 'boarded' where id = v_booking.id;
    else
      update public.bookings set booking_status = 'partially_boarded' where id = v_booking.id;
    end if;

    insert into public.qr_scan_logs(ticket_id, trip_id, driver_id, scan_result)
    values (v_ticket.id, v_trip_id, v_driver_id, 'valid');

    return query select 'valid'::qr_scan_result, v_booking.id, v_ticket.id, v_ticket.ticket_type,
      (select b.booking_status from public.bookings b where b.id = v_booking.id),
      v_booking.count_passengers,
      'تم تأكيد صعود الراكب'::text;
    return;
  end if;
end;
$$;

create or replace function public.rate_booking(p_booking_id uuid, p_rating_value smallint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_booking public.bookings%rowtype;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Authentication required';
  end if;

  if p_rating_value < 1 or p_rating_value > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;

  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  if v_booking.booker_user_id <> v_user_id then
    raise exception 'Only booking owner can rate this booking';
  end if;

  if v_booking.booking_status <> 'completed' then
    raise exception 'Booking can be rated only after completion';
  end if;

  if v_booking.rating_value is not null then
    raise exception 'Booking already rated';
  end if;

  update public.bookings
  set rating_value = p_rating_value,
      rating_created_at = now()
  where id = p_booking_id;
end;
$$;

-- Register or refresh Firebase FCM token for current user.
create or replace function public.register_fcm_token(
  p_token text,
  p_platform device_platform,
  p_device_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Authentication required';
  end if;

  insert into public.user_fcm_tokens (user_id, token, platform, device_id, is_active, last_seen_at)
  values (v_user_id, p_token, p_platform, p_device_id, true, now())
  on conflict (token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      device_id = excluded.device_id,
      is_active = true,
      last_seen_at = now(),
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- =========================================================
-- ENABLE RLS
-- =========================================================
alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.system_staff_permissions enable row level security;
alter table public.company_staff_permissions enable row level security;
alter table public.cities enable row level security;
alter table public.rest_stops enable row level security;
alter table public.buses enable row level security;
alter table public.bus_seats enable row level security;
alter table public.drivers enable row level security;
alter table public.trips enable row level security;
alter table public.trip_stops enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_passengers enable row level security;
alter table public.booking_seats enable row level security;
alter table public.seat_locks enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.tickets enable row level security;
alter table public.notifications enable row level security;
alter table public.qr_scan_logs enable row level security;
alter table public.user_fcm_tokens enable row level security;

-- =========================================================
-- RLS POLICIES
-- =========================================================
-- USERS
DROP POLICY IF EXISTS users_select_policy ON public.users;
CREATE POLICY users_select_policy ON public.users
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  or public.is_super_admin()
  or public.has_system_permission('manage_system_staff')
  or public.has_system_permission('view_bookings')
  or public.has_system_permission('view_trips')
  or public.has_company_permission(
    (select c.id from public.companies c where c.owner_user_id = users.id limit 1),
    'view_reports'
  )
  or exists (
    select 1
    from public.company_staff_permissions csp
    where csp.user_id = users.id
      and public.can_view_company_data(csp.company_id)
  )
  or exists (
    select 1
    from public.drivers d
    where d.user_id = users.id
      and public.can_view_company_data(d.company_id)
  )
);

DROP POLICY IF EXISTS users_update_own_policy ON public.users;
CREATE POLICY users_update_own_policy ON public.users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Company owners / staff with manage_drivers may edit driver profile fields
-- (full_name, phone, etc.) for users linked to their company's drivers row.
-- Role must stay driver; privilege changes remain service-role only.
DROP POLICY IF EXISTS users_update_company_driver_profile_policy ON public.users;
CREATE POLICY users_update_company_driver_profile_policy ON public.users
FOR UPDATE TO authenticated
USING (
  role = 'driver'
  and exists (
    select 1
    from public.drivers d
    where d.user_id = users.id
      and public.has_company_permission(d.company_id, 'manage_drivers')
  )
)
WITH CHECK (
  role = 'driver'
  and exists (
    select 1
    from public.drivers d
    where d.user_id = users.id
      and public.has_company_permission(d.company_id, 'manage_drivers')
  )
);

-- role changes should be done by service role/admin functions only.

-- COMPANIES
DROP POLICY IF EXISTS companies_select_policy ON public.companies;
CREATE POLICY companies_select_policy ON public.companies
FOR SELECT TO authenticated
USING (status = 'active' or public.can_view_company_data(id) or public.has_system_permission('manage_companies'));

DROP POLICY IF EXISTS companies_insert_policy ON public.companies;
CREATE POLICY companies_insert_policy ON public.companies
FOR INSERT TO authenticated
WITH CHECK (public.has_system_permission('manage_companies'));

DROP POLICY IF EXISTS companies_update_policy ON public.companies;
CREATE POLICY companies_update_policy ON public.companies
FOR UPDATE TO authenticated
USING (public.has_system_permission('manage_companies') or public.is_company_owner(id))
WITH CHECK (public.has_system_permission('manage_companies') or public.is_company_owner(id));

-- SYSTEM STAFF PERMISSIONS
DROP POLICY IF EXISTS system_staff_permissions_select_policy ON public.system_staff_permissions;
CREATE POLICY system_staff_permissions_select_policy ON public.system_staff_permissions
FOR SELECT TO authenticated
USING (user_id = auth.uid() or public.has_system_permission('manage_system_staff'));

DROP POLICY IF EXISTS system_staff_permissions_manage_policy ON public.system_staff_permissions;
CREATE POLICY system_staff_permissions_manage_policy ON public.system_staff_permissions
FOR ALL TO authenticated
USING (public.has_system_permission('manage_system_staff'))
WITH CHECK (public.has_system_permission('manage_system_staff'));

-- COMPANY STAFF PERMISSIONS
DROP POLICY IF EXISTS company_staff_permissions_select_policy ON public.company_staff_permissions;
CREATE POLICY company_staff_permissions_select_policy ON public.company_staff_permissions
FOR SELECT TO authenticated
USING (user_id = auth.uid() or public.is_company_owner(company_id) or public.has_company_permission(company_id, 'view_reports') or public.has_system_permission('manage_companies'));

DROP POLICY IF EXISTS company_staff_permissions_manage_policy ON public.company_staff_permissions;
CREATE POLICY company_staff_permissions_manage_policy ON public.company_staff_permissions
FOR ALL TO authenticated
USING (public.is_company_owner(company_id) or public.has_system_permission('manage_companies'))
WITH CHECK (public.is_company_owner(company_id) or public.has_system_permission('manage_companies'));

-- CITIES
DROP POLICY IF EXISTS cities_select_policy ON public.cities;
CREATE POLICY cities_select_policy ON public.cities
FOR SELECT TO authenticated
USING (is_active = true or public.has_system_permission('manage_cities'));

DROP POLICY IF EXISTS cities_manage_policy ON public.cities;
CREATE POLICY cities_manage_policy ON public.cities
FOR ALL TO authenticated
USING (public.has_system_permission('manage_cities'))
WITH CHECK (public.has_system_permission('manage_cities'));

-- REST STOPS
DROP POLICY IF EXISTS rest_stops_select_policy ON public.rest_stops;
CREATE POLICY rest_stops_select_policy ON public.rest_stops
FOR SELECT TO authenticated
USING (is_active = true or public.can_view_company_data(company_id));

DROP POLICY IF EXISTS rest_stops_manage_policy ON public.rest_stops;
CREATE POLICY rest_stops_manage_policy ON public.rest_stops
FOR ALL TO authenticated
USING (public.has_company_permission(company_id, 'manage_trips'))
WITH CHECK (public.has_company_permission(company_id, 'manage_trips'));

-- BUSES
DROP POLICY IF EXISTS buses_select_policy ON public.buses;
CREATE POLICY buses_select_policy ON public.buses
FOR SELECT TO authenticated
USING (status <> 'inactive' or public.can_view_company_data(company_id));

DROP POLICY IF EXISTS buses_manage_policy ON public.buses;
CREATE POLICY buses_manage_policy ON public.buses
FOR ALL TO authenticated
USING (public.has_company_permission(company_id, 'manage_buses'))
WITH CHECK (public.has_company_permission(company_id, 'manage_buses'));

-- BUS SEATS
DROP POLICY IF EXISTS bus_seats_select_policy ON public.bus_seats;
CREATE POLICY bus_seats_select_policy ON public.bus_seats
FOR SELECT TO authenticated
USING (
  exists (
    select 1 from public.buses b
    where b.id = bus_seats.bus_id
      and (b.status <> 'inactive' or public.can_view_company_data(b.company_id))
  )
);

DROP POLICY IF EXISTS bus_seats_manage_policy ON public.bus_seats;
CREATE POLICY bus_seats_manage_policy ON public.bus_seats
FOR ALL TO authenticated
USING (
  exists (select 1 from public.buses b where b.id = bus_seats.bus_id and public.has_company_permission(b.company_id, 'manage_buses'))
)
WITH CHECK (
  exists (select 1 from public.buses b where b.id = bus_seats.bus_id and public.has_company_permission(b.company_id, 'manage_buses'))
);

-- DRIVERS
DROP POLICY IF EXISTS drivers_select_policy ON public.drivers;
CREATE POLICY drivers_select_policy ON public.drivers
FOR SELECT TO authenticated
USING (user_id = auth.uid() or public.can_view_company_data(company_id));

DROP POLICY IF EXISTS drivers_manage_policy ON public.drivers;
CREATE POLICY drivers_manage_policy ON public.drivers
FOR ALL TO authenticated
USING (public.has_company_permission(company_id, 'manage_drivers'))
WITH CHECK (public.has_company_permission(company_id, 'manage_drivers'));

-- TRIPS
DROP POLICY IF EXISTS trips_select_policy ON public.trips;
CREATE POLICY trips_select_policy ON public.trips
FOR SELECT TO authenticated
USING (status in ('scheduled','active','completed') or public.can_view_company_data(company_id));

DROP POLICY IF EXISTS trips_manage_policy ON public.trips;
CREATE POLICY trips_manage_policy ON public.trips
FOR ALL TO authenticated
USING (public.has_company_permission(company_id, 'manage_trips'))
WITH CHECK (public.has_company_permission(company_id, 'manage_trips'));

-- TRIP STOPS
DROP POLICY IF EXISTS trip_stops_select_policy ON public.trip_stops;
CREATE POLICY trip_stops_select_policy ON public.trip_stops
FOR SELECT TO authenticated
USING (
  exists (select 1 from public.trips t where t.id = trip_stops.trip_id and (t.status in ('scheduled','active','completed') or public.can_view_company_data(t.company_id)))
);

DROP POLICY IF EXISTS trip_stops_manage_policy ON public.trip_stops;
CREATE POLICY trip_stops_manage_policy ON public.trip_stops
FOR ALL TO authenticated
USING (public.has_company_permission(public.trip_company_id(trip_id), 'manage_trips'))
WITH CHECK (public.has_company_permission(public.trip_company_id(trip_id), 'manage_trips'));

-- BOOKINGS
DROP POLICY IF EXISTS bookings_select_policy ON public.bookings;
CREATE POLICY bookings_select_policy ON public.bookings
FOR SELECT TO authenticated
USING (public.can_read_booking(id));

DROP POLICY IF EXISTS bookings_company_update_policy ON public.bookings;
CREATE POLICY bookings_company_update_policy ON public.bookings
FOR UPDATE TO authenticated
USING (public.has_company_permission(public.booking_company_id(id), 'manage_bookings'))
WITH CHECK (public.has_company_permission(public.booking_company_id(id), 'manage_bookings'));

-- Inserts are performed by SECURITY DEFINER RPC functions.

-- BOOKING PASSENGERS
DROP POLICY IF EXISTS booking_passengers_select_policy ON public.booking_passengers;
CREATE POLICY booking_passengers_select_policy ON public.booking_passengers
FOR SELECT TO authenticated
USING (public.can_read_booking(booking_id));

DROP POLICY IF EXISTS booking_passengers_company_update_policy ON public.booking_passengers;
CREATE POLICY booking_passengers_company_update_policy ON public.booking_passengers
FOR UPDATE TO authenticated
USING (public.has_company_permission(public.booking_company_id(booking_id), 'manage_bookings'))
WITH CHECK (public.has_company_permission(public.booking_company_id(booking_id), 'manage_bookings'));

-- BOOKING SEATS
DROP POLICY IF EXISTS booking_seats_select_policy ON public.booking_seats;
CREATE POLICY booking_seats_select_policy ON public.booking_seats
FOR SELECT TO authenticated
USING (public.can_read_booking(booking_id));

DROP POLICY IF EXISTS booking_seats_company_update_policy ON public.booking_seats;
CREATE POLICY booking_seats_company_update_policy ON public.booking_seats
FOR UPDATE TO authenticated
USING (public.has_company_permission(public.booking_company_id(booking_id), 'manage_bookings'))
WITH CHECK (public.has_company_permission(public.booking_company_id(booking_id), 'manage_bookings'));

-- SEAT LOCKS
DROP POLICY IF EXISTS seat_locks_select_policy ON public.seat_locks;
CREATE POLICY seat_locks_select_policy ON public.seat_locks
FOR SELECT TO authenticated
USING (user_id = auth.uid() or public.can_view_company_data(public.trip_company_id(trip_id)));

DROP POLICY IF EXISTS seat_locks_delete_own_policy ON public.seat_locks;
CREATE POLICY seat_locks_delete_own_policy ON public.seat_locks
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Inserts are performed by lock_seats RPC.

-- WALLETS
DROP POLICY IF EXISTS wallets_select_policy ON public.wallets;
CREATE POLICY wallets_select_policy ON public.wallets
FOR SELECT TO authenticated
USING (user_id = auth.uid() or public.has_system_permission('view_bookings'));

DROP POLICY IF EXISTS wallets_insert_own_policy ON public.wallets;
CREATE POLICY wallets_insert_own_policy ON public.wallets
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Direct wallet balance updates are not allowed from client; use RPC/Edge Function.

-- WALLET TRANSACTIONS
DROP POLICY IF EXISTS wallet_transactions_select_policy ON public.wallet_transactions;
CREATE POLICY wallet_transactions_select_policy ON public.wallet_transactions
FOR SELECT TO authenticated
USING (
  exists (select 1 from public.wallets w where w.id = wallet_transactions.wallet_id and w.user_id = auth.uid())
  or public.has_system_permission('view_bookings')
  or (booking_id is not null and public.has_company_permission(public.booking_company_id(booking_id), 'manage_bookings'))
);

-- PAYMENT records
DROP POLICY IF EXISTS payments_select_policy ON public.payments;
CREATE POLICY payments_select_policy ON public.payments
FOR SELECT TO authenticated
USING (public.can_read_booking(booking_id));

-- TICKETS
DROP POLICY IF EXISTS tickets_select_policy ON public.tickets;
CREATE POLICY tickets_select_policy ON public.tickets
FOR SELECT TO authenticated
USING (public.can_read_booking(booking_id));

-- NOTIFICATIONS
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own_policy ON public.notifications;
CREATE POLICY notifications_update_own_policy ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_insert_company_or_system_policy ON public.notifications;
CREATE POLICY notifications_insert_company_or_system_policy ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin()
  or public.has_system_permission('manage_companies')
  or (related_trip_id is not null and public.has_company_permission(public.trip_company_id(related_trip_id), 'send_notifications'))
);

-- QR SCAN LOGS
DROP POLICY IF EXISTS qr_scan_logs_select_policy ON public.qr_scan_logs;
CREATE POLICY qr_scan_logs_select_policy ON public.qr_scan_logs
FOR SELECT TO authenticated
USING (
  public.has_system_permission('view_scan_logs')
  or (trip_id is not null and public.can_view_company_data(public.trip_company_id(trip_id)))
  or exists (select 1 from public.drivers d where d.id = qr_scan_logs.driver_id and d.user_id = auth.uid())
);

-- USER FCM TOKENS
DROP POLICY IF EXISTS user_fcm_tokens_select_policy ON public.user_fcm_tokens;
CREATE POLICY user_fcm_tokens_select_policy ON public.user_fcm_tokens
FOR SELECT TO authenticated
USING (user_id = auth.uid() or public.has_system_permission('manage_companies'));

DROP POLICY IF EXISTS user_fcm_tokens_insert_policy ON public.user_fcm_tokens;
CREATE POLICY user_fcm_tokens_insert_policy ON public.user_fcm_tokens
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_fcm_tokens_update_policy ON public.user_fcm_tokens;
CREATE POLICY user_fcm_tokens_update_policy ON public.user_fcm_tokens
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_fcm_tokens_delete_policy ON public.user_fcm_tokens;
CREATE POLICY user_fcm_tokens_delete_policy ON public.user_fcm_tokens
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- =========================================================
-- GRANTS FOR SUPABASE CLIENT ROLES
-- =========================================================
grant usage on schema public to anon, authenticated;
grant select on public.cities, public.companies, public.trips, public.trip_stops, public.rest_stops, public.buses, public.bus_seats to authenticated;
grant select, update on public.users to authenticated;
grant select on public.system_staff_permissions, public.company_staff_permissions to authenticated;
grant select on public.drivers to authenticated;
grant select on public.bookings, public.booking_passengers, public.booking_seats, public.payments, public.tickets to authenticated;
grant select, insert, update, delete on public.user_fcm_tokens to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.wallets, public.wallet_transactions, public.qr_scan_logs, public.seat_locks to authenticated;

grant insert, update, delete on public.companies, public.cities, public.rest_stops, public.buses, public.bus_seats, public.drivers, public.trips, public.trip_stops, public.system_staff_permissions, public.company_staff_permissions, public.bookings, public.booking_passengers, public.booking_seats, public.notifications, public.seat_locks to authenticated;

-- RPC grants.
revoke all on function public.get_seats_status(uuid, uuid, uuid) from public;
revoke all on function public.lock_seats(uuid, uuid, uuid, uuid[], int) from public;
revoke all on function public.confirm_wallet_booking(uuid, uuid, uuid, uuid[], jsonb, ticket_type) from public;
revoke all on function public.confirm_office_cash_booking(uuid, uuid, uuid, uuid, uuid[], jsonb, ticket_type) from public;
revoke all on function public.scan_ticket_qr(text) from public;
revoke all on function public.rate_booking(uuid, smallint) from public;
revoke all on function public.register_fcm_token(text, device_platform, text) from public;

grant execute on function public.get_seats_status(uuid, uuid, uuid) to authenticated;
grant execute on function public.lock_seats(uuid, uuid, uuid, uuid[], int) to authenticated;
grant execute on function public.confirm_wallet_booking(uuid, uuid, uuid, uuid[], jsonb, ticket_type) to authenticated;
grant execute on function public.confirm_office_cash_booking(uuid, uuid, uuid, uuid, uuid[], jsonb, ticket_type) to authenticated;
grant execute on function public.scan_ticket_qr(text) to authenticated;
grant execute on function public.rate_booking(uuid, smallint) to authenticated;
grant execute on function public.register_fcm_token(text, device_platform, text) to authenticated;

-- =========================================================
-- IMPORTANT RPC SUMMARY FOR FRONTEND/BACKEND DEVELOPERS
-- =========================================================
-- Passenger:
--   select cities where is_active=true
--   search trips by origin/destination/date + trip_stops
--   select * from get_seats_status(trip_id, from_trip_stop_id, to_trip_stop_id)
--   select * from lock_seats(trip_id, from_trip_stop_id, to_trip_stop_id, seat_ids, 10)
--   select confirm_wallet_booking(trip_id, from_trip_stop_id, to_trip_stop_id, seat_ids, passengers_jsonb, 'group')
--   select rate_booking(booking_id, rating_value)
--
-- Driver:
--   select driver trips where drivers.user_id = auth.uid()
--   select * from scan_ticket_qr(qr_token)
--
-- Company dashboard:
--   CRUD via tables, protected by company_staff_permissions/company_owner RLS.
--   Office booking: select confirm_office_cash_booking(booker_user_id, trip_id, from_stop, to_stop, seat_ids, passengers_jsonb, 'group')
--
-- Firebase:
--   select register_fcm_token(token, platform, device_id)
--   sending push notifications should be done by Edge Function / server using Firebase Admin SDK.
-- =========================================================

-- =========================================================
-- OPTIONAL BUT RECOMMENDED: Trip search RPC for passenger app
-- Search by from city, to city, and travel date. Supports partial trips.
-- =========================================================
create or replace function public.search_trips(
  p_origin_city_id uuid,
  p_destination_city_id uuid,
  p_travel_date date
)
returns table (
  trip_id uuid,
  company_id uuid,
  company_name text,
  bus_id uuid,
  from_trip_stop_id uuid,
  to_trip_stop_id uuid,
  from_city_name text,
  to_city_name text,
  departure_time timestamptz,
  arrival_time timestamptz,
  base_price numeric,
  final_price numeric,
  offer_is boolean,
  title_offer text,
  available_seats_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Authentication required';
  end if;

  return query
  select
    t.id as trip_id,
    t.company_id,
    c.name as company_name,
    t.bus_id,
    fs.id as from_trip_stop_id,
    ts.id as to_trip_stop_id,
    fc.name as from_city_name,
    tc.name as to_city_name,
    coalesce(fs.time_departure, t.departure_datetime) as departure_time,
    coalesce(ts.time_arrival, t.expected_arrival_datetime) as arrival_time,
    t.price as base_price,
    coalesce(t.price_offer, t.price) as final_price,
    t.offer_is,
    t.title_offer,
    (
      select count(*)
      from public.get_seats_status(t.id, fs.id, ts.id) ss
      where ss.status = 'available'
    ) as available_seats_count
  from public.trips t
  join public.companies c on c.id = t.company_id
  join public.trip_stops fs on fs.trip_id = t.id
  join public.trip_stops ts on ts.trip_id = t.id
  join public.cities fc on fc.id = fs.city_id
  join public.cities tc on tc.id = ts.city_id
  where t.status = 'scheduled'
    and c.status = 'active'
    and fs.stop_type = 'city'
    and ts.stop_type = 'city'
    and fs.city_id = p_origin_city_id
    and ts.city_id = p_destination_city_id
    and fs.is_boarding_allowed = true
    and ts.is_dropoff_allowed = true
    and fs.order_stop < ts.order_stop
    and coalesce(fs.time_departure, t.departure_datetime)::date = p_travel_date
  order by coalesce(fs.time_departure, t.departure_datetime) asc;
end;
$$;

revoke all on function public.search_trips(uuid, uuid, date) from public;
grant execute on function public.search_trips(uuid, uuid, date) to authenticated;

-- Passenger trip search:
--   select * from public.search_trips(origin_city_id, destination_city_id, travel_date);
