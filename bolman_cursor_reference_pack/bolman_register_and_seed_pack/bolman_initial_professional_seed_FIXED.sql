-- =========================================================
-- BOLMAN PROFESSIONAL INITIAL SEED DATA
-- Compatible with: bolman_supabase_auth_rls_complete.sql
-- الهدف:
-- 1) إنشاء حسابات Auth تجريبية قابلة لتسجيل الدخول.
-- كلمات السر هنا سهلة للتجريب فقط: 12345678
-- 2) إنشاء مدير نظام أساسي.
-- 3) إنشاء شركات نقل، أصحاب شركات، موظفين، سائقين.
-- 4) إنشاء مدن، استراحات، باصات، مقاعد، رحلات، محطات.
-- 5) إنشاء حجوزات وتجارب مقاعد للتجريب.
--
-- ملاحظات مهمة:
-- - هذا الملف مخصص لبيئة development/testing.
-- - شغّل ملف schema النهائي أولاً.
-- - يفضّل تشغيله على مشروع Supabase جديد.
-- - إذا فشل إدخال auth.users بسبب اختلاف داخلي في Supabase، أنشئ الحسابات من لوحة Authentication بنفس الإيميلات ثم شغّل قسم public seed فقط.
-- =========================================================

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- =========================================================
-- 0) Helper: seed auth users
-- =========================================================
create or replace function public.seed_auth_user(
  p_user_id uuid,
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text,
  p_role user_role
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_identity_has_provider_id boolean;
  v_identity_id_udt text;
  v_identity_data jsonb;
begin
  v_identity_data := jsonb_build_object(
    'sub', p_user_id::text,
    'email', p_email,
    'email_verified', true,
    'phone_verified', false
  );

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    p_user_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone, 'role', p_role::text),
    false,
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = now(),
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
  ) into v_identity_has_provider_id;

  select udt_name
  into v_identity_id_udt
  from information_schema.columns
  where table_schema = 'auth'
    and table_name = 'identities'
    and column_name = 'id'
  limit 1;

  if v_identity_has_provider_id then
    if v_identity_id_udt = 'uuid' then
      execute
      'insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
       values ($1, $2, $3, ''email'', $4, now(), now(), now())
       on conflict do nothing'
      using p_user_id, p_user_id, v_identity_data, p_email;
    else
      execute
      'insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
       values ($1, $2, $3, ''email'', $4, now(), now(), now())
       on conflict do nothing'
      using p_user_id::text, p_user_id, v_identity_data, p_email;
    end if;
  else
    if v_identity_id_udt = 'uuid' then
      execute
      'insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       values ($1, $2, $3, ''email'', now(), now(), now())
       on conflict do nothing'
      using p_user_id, p_user_id, v_identity_data;
    else
      execute
      'insert into auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       values ($1, $2, $3, ''email'', now(), now(), now())
       on conflict do nothing'
      using p_user_id::text, p_user_id, v_identity_data;
    end if;
  end if;

  insert into public.users (id, full_name, phone, email, role, status)
  values (p_user_id, p_full_name, p_phone, p_email, p_role, 'active')
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  if p_role = 'passenger' then
    insert into public.wallets (user_id, balance)
    values (p_user_id, 0)
    on conflict (user_id) do nothing;
  end if;
end;
$$;

-- =========================================================
-- 1) Auth users and login accounts
-- =========================================================
select public.seed_auth_user('b71992a8-5dbe-5d9a-9bf1-81c96feb8559','admin@bolman.com','12345678','مدير النظام الرئيسي','0990000001','super_admin');
select public.seed_auth_user('e090352b-1acb-5328-8281-bac74105395f','system@bolman.com','12345678','موظف نظام - رامي','0990000002','system_staff');

select public.seed_auth_user('24b1c439-753c-5578-9968-8ba290fd8980','owner.sham@bolman.com','12345678','صاحب شركة الشام','0990000010','company_owner');
select public.seed_auth_user('54bcb8f7-5b4c-541d-bb14-f90f53821c3f','owner.baraka@bolman.com','12345678','صاحب شركة البركة','0990000011','company_owner');

select public.seed_auth_user('fc15ddbf-82f8-5460-9299-0087d61837c0','staff.sham@bolman.com','12345678','موظف شركة الشام','0990000020','company_staff');
select public.seed_auth_user('a62dad36-9cbd-5d0e-99c9-374e214edb12','staff.baraka@bolman.com','12345678','موظف شركة البركة','0990000021','company_staff');

select public.seed_auth_user('ea761f3f-3911-53b0-9ac6-d83775ca8f51','driver.khaled@bolman.com','12345678','السائق خالد الشامي','0990000030','driver');
select public.seed_auth_user('22188071-4da3-5445-887c-5a8045dacd24','driver.samer@bolman.com','12345678','السائق سامر الشامي','0990000031','driver');
select public.seed_auth_user('f03f540f-4d7d-5389-914c-efca54f59dd4','driver.mazen@bolman.com','12345678','السائق مازن البركة','0990000032','driver');

select public.seed_auth_user('b6bd9882-7fc7-592f-9ebe-ab34332660ce','ahmad@bolman.com','12345678','أحمد الحسن','0990000040','passenger');
select public.seed_auth_user('6a256dab-29fc-571d-aaed-d194186160cd','rana@bolman.com','12345678','رنا محمود','0990000041','passenger');
select public.seed_auth_user('9bf34d74-b181-5a95-95d0-5ad8fb54c994','laith@bolman.com','12345678','ليث العلي','0990000042','passenger');
select public.seed_auth_user('8d3a177d-eeab-598b-8f95-64ab6c05329a','nour@bolman.com','12345678','نور منصور','0990000043','passenger');

-- =========================================================
-- 2) Cities
-- =========================================================
insert into public.cities (id, name, is_active) values
('bfbd7652-e5c0-56ae-9eae-829ca8ea4275','حلب',true),
('83207626-d317-5ce5-ad1a-d1c82c5eaa40','حماة',true),
('0bbf8ef7-2c6b-5a79-927d-71e16c60ebd6','حمص',true),
('a3a40f1c-3baa-597f-9a5f-16f8680fc37d','دمشق',true),
('ebe05277-d53f-5eeb-a3cc-cc29a4811768','اللاذقية',true),
('c3ae623f-e72d-5226-810e-e4ce2577b611','طرطوس',true),
('fde33ef1-4922-555f-bcc4-053a967d0822','إدلب',true),
('3d8ddb3f-dafa-5aa8-ae9e-62ae30364887','الرقة',true),
('5ede8016-581d-5405-96b9-09269925152e','دير الزور',true),
('6fd234e3-bfbb-510e-a641-02a69d785868','السويداء',true)
on conflict (id) do update set name = excluded.name, is_active = excluded.is_active;

-- =========================================================
-- 3) Companies and permissions
-- =========================================================
insert into public.companies (id, name, phone, email, logo_url, status, owner_user_id) values
('d67910f5-6915-547f-90b1-916a26de51f5','شركة الشام للنقل','0111111111','info@sham-bus.test',null,'active','24b1c439-753c-5578-9968-8ba290fd8980'),
('f0d5547b-9e96-548f-abd1-faf85cb9c723','شركة البركة بولمان','0112222222','info@baraka-bus.test',null,'active','54bcb8f7-5b4c-541d-bb14-f90f53821c3f')
on conflict (id) do update set
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  status = excluded.status,
  owner_user_id = excluded.owner_user_id;

insert into public.system_staff_permissions (
  user_id, can_manage_companies, can_manage_cities, can_view_reports,
  can_manage_system_staff, can_view_bookings, can_view_trips, can_view_scan_logs
) values
('e090352b-1acb-5328-8281-bac74105395f',true,true,true,false,true,true,true)
on conflict (user_id) do update set
  can_manage_companies = excluded.can_manage_companies,
  can_manage_cities = excluded.can_manage_cities,
  can_view_reports = excluded.can_view_reports,
  can_manage_system_staff = excluded.can_manage_system_staff,
  can_view_bookings = excluded.can_view_bookings,
  can_view_trips = excluded.can_view_trips,
  can_view_scan_logs = excluded.can_view_scan_logs;

insert into public.company_staff_permissions (
  company_id, user_id, can_manage_buses, can_manage_trips, can_manage_bookings,
  can_manage_drivers, can_view_reports, can_send_notifications
) values
('d67910f5-6915-547f-90b1-916a26de51f5','fc15ddbf-82f8-5460-9299-0087d61837c0',true,true,true,true,true,true),
('f0d5547b-9e96-548f-abd1-faf85cb9c723','a62dad36-9cbd-5d0e-99c9-374e214edb12',true,true,true,true,true,true)
on conflict (company_id, user_id) do update set
  can_manage_buses = excluded.can_manage_buses,
  can_manage_trips = excluded.can_manage_trips,
  can_manage_bookings = excluded.can_manage_bookings,
  can_manage_drivers = excluded.can_manage_drivers,
  can_view_reports = excluded.can_view_reports,
  can_send_notifications = excluded.can_send_notifications;

-- =========================================================
-- 4) Rest stops
-- =========================================================
insert into public.rest_stops (id, company_id, name, address, phone, is_active) values
('63767532-61e1-52e9-a117-d09e6ff3fa72','d67910f5-6915-547f-90b1-916a26de51f5','استراحة النور','طريق حمص - دمشق','0113333333',true),
('350e8ed9-ca4f-5ca1-a1ca-302ad085579b','d67910f5-6915-547f-90b1-916a26de51f5','استراحة السلام','طريق حماة - حمص','0114444444',true),
('e710caa6-96be-5a0e-83c5-111a7ad197dd','f0d5547b-9e96-548f-abd1-faf85cb9c723','استراحة الساحل','طريق طرطوس - اللاذقية','0115555555',true)
on conflict (id) do update set name = excluded.name, address = excluded.address, phone = excluded.phone, is_active = excluded.is_active;

-- =========================================================
-- 5) Buses, seats, drivers
-- =========================================================
insert into public.buses (id, company_id, number_bus, seat_layout_type, total_seats, status, current_city_id) values
('0e760cf2-c234-5cbe-867d-a372ed957bfd','d67910f5-6915-547f-90b1-916a26de51f5','SHAM-101','2_2',45,'available','bfbd7652-e5c0-56ae-9eae-829ca8ea4275'),
('020e7246-fa16-514b-bf56-8a444c086f46','d67910f5-6915-547f-90b1-916a26de51f5','SHAM-202','2_1',30,'available','a3a40f1c-3baa-597f-9a5f-16f8680fc37d'),
('8208b800-be0d-5c19-94fa-93a5d6a16e68','f0d5547b-9e96-548f-abd1-faf85cb9c723','BARAKA-301','2_2',40,'available','0bbf8ef7-2c6b-5a79-927d-71e16c60ebd6')
on conflict (id) do update set
  company_id = excluded.company_id,
  number_bus = excluded.number_bus,
  seat_layout_type = excluded.seat_layout_type,
  total_seats = excluded.total_seats,
  status = excluded.status,
  current_city_id = excluded.current_city_id;

insert into public.bus_seats (bus_id, seat_number, column_position, is_active)
select '0e760cf2-c234-5cbe-867d-a372ed957bfd'::uuid, gs, (array['A','B','C','D'])[1 + ((gs - 1) % 4)], case when gs = 45 then false else true end
from generate_series(1,45) gs
on conflict (bus_id, seat_number) do update set column_position = excluded.column_position, is_active = excluded.is_active;

insert into public.bus_seats (bus_id, seat_number, column_position, is_active)
select '020e7246-fa16-514b-bf56-8a444c086f46'::uuid, gs, (array['A','B','C'])[1 + ((gs - 1) % 3)], true
from generate_series(1,30) gs
on conflict (bus_id, seat_number) do update set column_position = excluded.column_position, is_active = excluded.is_active;

insert into public.bus_seats (bus_id, seat_number, column_position, is_active)
select '8208b800-be0d-5c19-94fa-93a5d6a16e68'::uuid, gs, (array['A','B','C','D'])[1 + ((gs - 1) % 4)], true
from generate_series(1,40) gs
on conflict (bus_id, seat_number) do update set column_position = excluded.column_position, is_active = excluded.is_active;

insert into public.drivers (id, company_id, user_id, license_number, status) values
('6d124464-75b1-5067-9cc2-f4beaa03aaf5','d67910f5-6915-547f-90b1-916a26de51f5','ea761f3f-3911-53b0-9ac6-d83775ca8f51','LIC-SH-1001','active'),
('a7022bc7-ea97-5fb0-b8a7-e3bbf01ed034','d67910f5-6915-547f-90b1-916a26de51f5','22188071-4da3-5445-887c-5a8045dacd24','LIC-SH-1002','active'),
('72ce6cfb-689e-530e-a753-84b038d99dae','f0d5547b-9e96-548f-abd1-faf85cb9c723','f03f540f-4d7d-5389-914c-efca54f59dd4','LIC-BR-2001','active')
on conflict (id) do update set
  company_id = excluded.company_id,
  user_id = excluded.user_id,
  license_number = excluded.license_number,
  status = excluded.status;

-- Fix driver 3 company id if above typo branch already inserted from an old run.
update public.drivers
set company_id = 'f0d5547b-9e96-548f-abd1-faf85cb9c723'
where id = '72ce6cfb-689e-530e-a753-84b038d99dae';

-- =========================================================
-- 6) Trips
-- =========================================================
insert into public.trips (
  id, company_id, bus_id, driver_id, origin_city_id, destination_city_id,
  departure_datetime, expected_arrival_datetime, price, status,
  offer_is, price_offer, title_offer
) values
('2c16e152-c87b-535d-972a-369970f2807d','d67910f5-6915-547f-90b1-916a26de51f5','0e760cf2-c234-5cbe-867d-a372ed957bfd','6d124464-75b1-5067-9cc2-f4beaa03aaf5','bfbd7652-e5c0-56ae-9eae-829ca8ea4275','a3a40f1c-3baa-597f-9a5f-16f8680fc37d', now() + interval '2 days', now() + interval '2 days 7 hours', 75000, 'scheduled', false, null, null),
('cc4dd611-a5cc-5bfd-b520-bdc7ae593f3b','d67910f5-6915-547f-90b1-916a26de51f5','020e7246-fa16-514b-bf56-8a444c086f46','a7022bc7-ea97-5fb0-b8a7-e3bbf01ed034','a3a40f1c-3baa-597f-9a5f-16f8680fc37d','bfbd7652-e5c0-56ae-9eae-829ca8ea4275', now() + interval '3 days', now() + interval '3 days 7 hours', 70000, 'scheduled', true, 60000, 'عرض العودة إلى حلب'),
('fc563e05-9e34-59ab-87f5-611439efd87a','f0d5547b-9e96-548f-abd1-faf85cb9c723','8208b800-be0d-5c19-94fa-93a5d6a16e68','72ce6cfb-689e-530e-a753-84b038d99dae','0bbf8ef7-2c6b-5a79-927d-71e16c60ebd6','ebe05277-d53f-5eeb-a3cc-cc29a4811768', now() + interval '4 days', now() + interval '4 days 5 hours', 65000, 'scheduled', false, null, null),
('65d0291e-de44-5f9d-b77b-b9c791d7a3de','d67910f5-6915-547f-90b1-916a26de51f5','020e7246-fa16-514b-bf56-8a444c086f46','a7022bc7-ea97-5fb0-b8a7-e3bbf01ed034','a3a40f1c-3baa-597f-9a5f-16f8680fc37d','bfbd7652-e5c0-56ae-9eae-829ca8ea4275', now() - interval '3 days', now() - interval '3 days' + interval '7 hours', 70000, 'completed', false, null, null)
on conflict (id) do update set
  departure_datetime = excluded.departure_datetime,
  expected_arrival_datetime = excluded.expected_arrival_datetime,
  price = excluded.price,
  status = excluded.status,
  offer_is = excluded.offer_is,
  price_offer = excluded.price_offer,
  title_offer = excluded.title_offer;

-- Trip 1 stops: حلب -> حماة -> استراحة السلام -> حمص -> دمشق
insert into public.trip_stops (id, trip_id, stop_type, city_id, rest_stop_id, order_stop, time_arrival, time_departure, is_boarding_allowed, is_dropoff_allowed) values
('7299ac67-e635-5869-8190-74890cb422ac','2c16e152-c87b-535d-972a-369970f2807d','city','bfbd7652-e5c0-56ae-9eae-829ca8ea4275',null,1,null,now() + interval '2 days',true,false),
('dd89c729-9cb6-53b2-b1fa-f91e2b42e2bb','2c16e152-c87b-535d-972a-369970f2807d','city','83207626-d317-5ce5-ad1a-d1c82c5eaa40',null,2,now() + interval '2 days 2 hours',now() + interval '2 days 2 hours 10 minutes',true,true),
('cc1910d5-4cc7-511f-9e88-81343c8b677f','2c16e152-c87b-535d-972a-369970f2807d','rest_stop',null,'350e8ed9-ca4f-5ca1-a1ca-302ad085579b',3,now() + interval '2 days 3 hours',now() + interval '2 days 3 hours 20 minutes',false,false),
('1bbac934-4b56-587a-a2a8-914b0053b97a','2c16e152-c87b-535d-972a-369970f2807d','city','0bbf8ef7-2c6b-5a79-927d-71e16c60ebd6',null,4,now() + interval '2 days 4 hours',now() + interval '2 days 4 hours 15 minutes',true,true),
('601940a6-dcaf-554f-b52d-7f8994054c92','2c16e152-c87b-535d-972a-369970f2807d','city','a3a40f1c-3baa-597f-9a5f-16f8680fc37d',null,5,now() + interval '2 days 7 hours',null,false,true)
on conflict (id) do update set time_arrival = excluded.time_arrival, time_departure = excluded.time_departure;

-- Trip 2 stops: دمشق -> حمص -> استراحة النور -> حماة -> حلب
insert into public.trip_stops (id, trip_id, stop_type, city_id, rest_stop_id, order_stop, time_arrival, time_departure, is_boarding_allowed, is_dropoff_allowed) values
('3151b34d-a094-528d-a8ba-bc03b83b13bd','cc4dd611-a5cc-5bfd-b520-bdc7ae593f3b','city','a3a40f1c-3baa-597f-9a5f-16f8680fc37d',null,1,null,now() + interval '3 days',true,false),
('54d28dae-2a5f-5a46-b05e-22a7fc2acae0','cc4dd611-a5cc-5bfd-b520-bdc7ae593f3b','city','0bbf8ef7-2c6b-5a79-927d-71e16c60ebd6',null,2,now() + interval '3 days 3 hours',now() + interval '3 days 3 hours 10 minutes',true,true),
('b507f335-fb7c-55f3-851f-072c027ba682','cc4dd611-a5cc-5bfd-b520-bdc7ae593f3b','rest_stop',null,'63767532-61e1-52e9-a117-d09e6ff3fa72',3,now() + interval '3 days 4 hours',now() + interval '3 days 4 hours 15 minutes',false,false),
('929cfbd8-bbcf-53e8-a666-b2afbfb662da','cc4dd611-a5cc-5bfd-b520-bdc7ae593f3b','city','83207626-d317-5ce5-ad1a-d1c82c5eaa40',null,4,now() + interval '3 days 5 hours',now() + interval '3 days 5 hours 10 minutes',true,true),
('b0d0668a-0c4f-505b-b29f-0da184c5d343','cc4dd611-a5cc-5bfd-b520-bdc7ae593f3b','city','bfbd7652-e5c0-56ae-9eae-829ca8ea4275',null,5,now() + interval '3 days 7 hours',null,false,true)
on conflict (id) do update set time_arrival = excluded.time_arrival, time_departure = excluded.time_departure;

-- Trip 3 stops: حمص -> طرطوس -> استراحة الساحل -> اللاذقية
insert into public.trip_stops (id, trip_id, stop_type, city_id, rest_stop_id, order_stop, time_arrival, time_departure, is_boarding_allowed, is_dropoff_allowed) values
('d4752a11-00eb-58e2-9734-037f8d03ab52','fc563e05-9e34-59ab-87f5-611439efd87a','city','0bbf8ef7-2c6b-5a79-927d-71e16c60ebd6',null,1,null,now() + interval '4 days',true,false),
('4ab0e07f-466d-5fff-896f-b6f49ba58ef9','fc563e05-9e34-59ab-87f5-611439efd87a','city','c3ae623f-e72d-5226-810e-e4ce2577b611',null,2,now() + interval '4 days 3 hours',now() + interval '4 days 3 hours 10 minutes',true,true),
('913da25c-7e13-596a-aca7-0e88a10a4ea2','fc563e05-9e34-59ab-87f5-611439efd87a','rest_stop',null,'e710caa6-96be-5a0e-83c5-111a7ad197dd',3,now() + interval '4 days 4 hours',now() + interval '4 days 4 hours 15 minutes',false,false),
('9368fd2b-5194-5b99-b1b4-d786ca51b3cd','fc563e05-9e34-59ab-87f5-611439efd87a','city','ebe05277-d53f-5eeb-a3cc-cc29a4811768',null,4,now() + interval '4 days 5 hours',null,false,true)
on conflict (id) do update set time_arrival = excluded.time_arrival, time_departure = excluded.time_departure;

-- Trip 4 completed stops: دمشق -> حمص -> حماة -> حلب
insert into public.trip_stops (id, trip_id, stop_type, city_id, rest_stop_id, order_stop, time_arrival, time_departure, is_boarding_allowed, is_dropoff_allowed) values
('4ead7ea9-6e53-555c-9911-68db14efb137','65d0291e-de44-5f9d-b77b-b9c791d7a3de','city','a3a40f1c-3baa-597f-9a5f-16f8680fc37d',null,1,null,now() - interval '3 days',true,false),
('b31d45d8-a67e-5f73-8de4-5896633f7bf4','65d0291e-de44-5f9d-b77b-b9c791d7a3de','city','0bbf8ef7-2c6b-5a79-927d-71e16c60ebd6',null,2,now() - interval '3 days' + interval '3 hours',now() - interval '3 days' + interval '3 hours 10 minutes',true,true),
('8211fe51-93f8-55d2-bafe-7e440d9fde12','65d0291e-de44-5f9d-b77b-b9c791d7a3de','city','83207626-d317-5ce5-ad1a-d1c82c5eaa40',null,3,now() - interval '3 days' + interval '5 hours',now() - interval '3 days' + interval '5 hours 10 minutes',true,true),
('b9d5cac2-0f3c-58f5-88f8-094432782823','65d0291e-de44-5f9d-b77b-b9c791d7a3de','city','bfbd7652-e5c0-56ae-9eae-829ca8ea4275',null,4,now() - interval '3 days' + interval '7 hours',null,false,true)
on conflict (id) do update set time_arrival = excluded.time_arrival, time_departure = excluded.time_departure;

-- =========================================================
-- 7) Wallet balances and transactions
-- =========================================================
insert into public.wallets (user_id, balance) values
('b6bd9882-7fc7-592f-9ebe-ab34332660ce',150000),
('6a256dab-29fc-571d-aaed-d194186160cd',125000),
('9bf34d74-b181-5a95-95d0-5ad8fb54c994',80000),
('8d3a177d-eeab-598b-8f95-64ab6c05329a',50000)
on conflict (user_id) do update set balance = excluded.balance;

insert into public.wallet_transactions (id, wallet_id, booking_id, transaction_type, source_type, amount, status, transaction_reference, performed_by_user_id, notes, balance_after)
select '4ff9352e-3b9d-5758-b36b-119c2723fc0b', w.id, null, 'credit', 'office_topup', 300000, 'success', 'INIT-AHMAD', 'fc15ddbf-82f8-5460-9299-0087d61837c0', 'رصيد افتتاحي للتجريب', 300000
from public.wallets w where w.user_id = 'b6bd9882-7fc7-592f-9ebe-ab34332660ce'
on conflict (id) do nothing;

insert into public.wallet_transactions (id, wallet_id, booking_id, transaction_type, source_type, amount, status, transaction_reference, performed_by_user_id, notes, balance_after)
select 'cc709019-5984-57d2-868e-835b902cb0fb', w.id, null, 'credit', 'office_topup', 200000, 'success', 'INIT-RANA', 'fc15ddbf-82f8-5460-9299-0087d61837c0', 'رصيد افتتاحي للتجريب', 200000
from public.wallets w where w.user_id = '6a256dab-29fc-571d-aaed-d194186160cd'
on conflict (id) do nothing;

-- =========================================================
-- 8) Bookings for testing
-- =========================================================

-- Booking 1: أحمد، مقطع حلب -> حمص، مقعدان 1 و2
insert into public.bookings (id, trip_id, booker_user_id, from_trip_stop_id, to_trip_stop_id, count_passengers, payment_status, booking_status, price_total, created_by_user_id, ticket_mode)
values ('4bb51723-2a2b-53fa-a752-ec13d40c9201','2c16e152-c87b-535d-972a-369970f2807d','b6bd9882-7fc7-592f-9ebe-ab34332660ce','7299ac67-e635-5869-8190-74890cb422ac','1bbac934-4b56-587a-a2a8-914b0053b97a',2,'success','confirmed',150000,'b6bd9882-7fc7-592f-9ebe-ab34332660ce','group')
on conflict (id) do update set booking_status = excluded.booking_status;

insert into public.booking_passengers (id, booking_id, user_id, full_name, phone, national_id) values
('6b3b3a40-6b69-5ed5-9d7e-ef447e8511e2','4bb51723-2a2b-53fa-a752-ec13d40c9201','b6bd9882-7fc7-592f-9ebe-ab34332660ce','أحمد الحسن','0990000040','10020030001'),
('31ff2f05-942c-5c99-9041-33d71a61a269','4bb51723-2a2b-53fa-a752-ec13d40c9201',null,'سامر الحسن','0990000045','10020030002')
on conflict (id) do update set full_name = excluded.full_name, national_id = excluded.national_id;

insert into public.booking_seats (booking_id, bus_seat_id, from_trip_stop_id, to_trip_stop_id, status)
select '4bb51723-2a2b-53fa-a752-ec13d40c9201', s.id, '7299ac67-e635-5869-8190-74890cb422ac','1bbac934-4b56-587a-a2a8-914b0053b97a','confirmed'
from public.bus_seats s where s.bus_id = '0e760cf2-c234-5cbe-867d-a372ed957bfd' and s.seat_number in (1,2)
on conflict do nothing;

insert into public.tickets (id, booking_id, booking_passenger_id, ticket_type, ticket_code, qr_token, status)
values ('68f67611-e4dc-5737-92ca-e7083d172289','4bb51723-2a2b-53fa-a752-ec13d40c9201',null,'group','BOL-GRP-0001','QR-GROUP-AHMAD-0001','issued')
on conflict (id) do update set status = excluded.status;

-- Booking 2: رنا، إعادة استخدام المقعد 1 من حمص -> دمشق، غير متداخل مع حجز أحمد
insert into public.bookings (id, trip_id, booker_user_id, from_trip_stop_id, to_trip_stop_id, count_passengers, payment_status, booking_status, price_total, created_by_user_id, ticket_mode)
values ('dcb49ec7-656e-5f5f-afae-3f3c68256d48','2c16e152-c87b-535d-972a-369970f2807d','6a256dab-29fc-571d-aaed-d194186160cd','1bbac934-4b56-587a-a2a8-914b0053b97a','601940a6-dcaf-554f-b52d-7f8994054c92',1,'success','confirmed',75000,'6a256dab-29fc-571d-aaed-d194186160cd','individual')
on conflict (id) do update set booking_status = excluded.booking_status;

insert into public.booking_passengers (id, booking_id, user_id, full_name, phone, national_id) values
('46ecab31-1d96-5650-bbba-f5783068db6e','dcb49ec7-656e-5f5f-afae-3f3c68256d48','6a256dab-29fc-571d-aaed-d194186160cd','رنا محمود','0990000041','10020030003')
on conflict (id) do update set full_name = excluded.full_name, national_id = excluded.national_id;

insert into public.booking_seats (booking_id, bus_seat_id, from_trip_stop_id, to_trip_stop_id, status)
select 'dcb49ec7-656e-5f5f-afae-3f3c68256d48', s.id, '1bbac934-4b56-587a-a2a8-914b0053b97a','601940a6-dcaf-554f-b52d-7f8994054c92','confirmed'
from public.bus_seats s where s.bus_id = '0e760cf2-c234-5cbe-867d-a372ed957bfd' and s.seat_number = 1
on conflict do nothing;

insert into public.tickets (id, booking_id, booking_passenger_id, ticket_type, ticket_code, qr_token, status)
values ('e9cc4e3c-42fb-5191-bf8e-29a1e076d2c0','dcb49ec7-656e-5f5f-afae-3f3c68256d48','46ecab31-1d96-5650-bbba-f5783068db6e','individual','BOL-IND-0002','QR-RANA-0002','issued')
on conflict (id) do update set status = excluded.status;

-- Booking 3: حجز مكتبي كاش على رحلة العرض
insert into public.bookings (id, trip_id, booker_user_id, from_trip_stop_id, to_trip_stop_id, count_passengers, payment_status, booking_status, price_total, created_by_user_id, ticket_mode)
values ('5c5f64e1-d203-5f17-8989-4d9f75f82d55','cc4dd611-a5cc-5bfd-b520-bdc7ae593f3b',null,'3151b34d-a094-528d-a8ba-bc03b83b13bd','b0d0668a-0c4f-505b-b29f-0da184c5d343',2,'success','confirmed',120000,'fc15ddbf-82f8-5460-9299-0087d61837c0','group')
on conflict (id) do update set booking_status = excluded.booking_status;

insert into public.booking_passengers (id, booking_id, user_id, full_name, phone, national_id) values
('b0c125c2-0707-5426-868b-e2d44228c2d2','5c5f64e1-d203-5f17-8989-4d9f75f82d55',null,'محمد خالد','0991111001','20030040001'),
('d0599960-d07a-57c3-8b85-a4deca13f44d','5c5f64e1-d203-5f17-8989-4d9f75f82d55',null,'ليلى خالد','0991111002','20030040002')
on conflict (id) do update set full_name = excluded.full_name, national_id = excluded.national_id;

insert into public.booking_seats (booking_id, bus_seat_id, from_trip_stop_id, to_trip_stop_id, status)
select '5c5f64e1-d203-5f17-8989-4d9f75f82d55', s.id, '3151b34d-a094-528d-a8ba-bc03b83b13bd','b0d0668a-0c4f-505b-b29f-0da184c5d343','confirmed'
from public.bus_seats s where s.bus_id = '020e7246-fa16-514b-bf56-8a444c086f46' and s.seat_number in (7,8)
on conflict do nothing;

insert into public.payments (id, booking_id, wallet_id, amount, payment_method, status, wallet_transaction_id, paid_by_user_id, paid_at)
values ('4a66e809-f8b5-52f6-8a73-d8aeb22919fb','5c5f64e1-d203-5f17-8989-4d9f75f82d55',null,120000,'office_cash','success',null,'fc15ddbf-82f8-5460-9299-0087d61837c0',now())
on conflict (id) do update set status = excluded.status;

insert into public.tickets (id, booking_id, booking_passenger_id, ticket_type, ticket_code, qr_token, status)
values ('ac3590b3-cc09-50d9-af04-ff07f5834e80','5c5f64e1-d203-5f17-8989-4d9f75f82d55',null,'group','BOL-GRP-0003','QR-OFFICE-0003','issued')
on conflict (id) do update set status = excluded.status;

-- Booking 4: حجز مكتمل مع تقييم لاختبار التقييم
insert into public.bookings (id, trip_id, booker_user_id, from_trip_stop_id, to_trip_stop_id, count_passengers, payment_status, booking_status, price_total, created_by_user_id, ticket_mode, rating_value, rating_created_at)
values ('ba35c2e0-441c-5f0a-bd7a-5a9d53c210a6','65d0291e-de44-5f9d-b77b-b9c791d7a3de','8d3a177d-eeab-598b-8f95-64ab6c05329a','4ead7ea9-6e53-555c-9911-68db14efb137','b9d5cac2-0f3c-58f5-88f8-094432782823',1,'success','completed',70000,'8d3a177d-eeab-598b-8f95-64ab6c05329a','group',5,now() - interval '1 day')
on conflict (id) do update set booking_status = excluded.booking_status, rating_value = excluded.rating_value, rating_created_at = excluded.rating_created_at;

insert into public.booking_passengers (id, booking_id, user_id, full_name, phone, national_id) values
('9306e9cd-4da7-566e-805f-a77c4dcb3eba','ba35c2e0-441c-5f0a-bd7a-5a9d53c210a6','8d3a177d-eeab-598b-8f95-64ab6c05329a','نور منصور','0990000043','30040050001')
on conflict (id) do update set full_name = excluded.full_name, national_id = excluded.national_id;

insert into public.booking_seats (booking_id, bus_seat_id, from_trip_stop_id, to_trip_stop_id, status)
select 'ba35c2e0-441c-5f0a-bd7a-5a9d53c210a6', s.id, '4ead7ea9-6e53-555c-9911-68db14efb137','b9d5cac2-0f3c-58f5-88f8-094432782823','confirmed'
from public.bus_seats s where s.bus_id = '020e7246-fa16-514b-bf56-8a444c086f46' and s.seat_number = 3
on conflict do nothing;

insert into public.tickets (id, booking_id, booking_passenger_id, ticket_type, ticket_code, qr_token, status, boarded_at)
values ('c279bf0f-6ef4-51c8-a74f-b53a7292d0df','ba35c2e0-441c-5f0a-bd7a-5a9d53c210a6',null,'group','BOL-GRP-0004','QR-COMPLETED-0004','completed',now() - interval '3 days')
on conflict (id) do update set status = excluded.status, boarded_at = excluded.boarded_at;

insert into public.qr_scan_logs (id, ticket_id, trip_id, driver_id, scan_result, scanned_at)
values ('89673b7f-9b0a-5fa1-92dc-7c7d34e72184','c279bf0f-6ef4-51c8-a74f-b53a7292d0df','65d0291e-de44-5f9d-b77b-b9c791d7a3de','a7022bc7-ea97-5fb0-b8a7-e3bbf01ed034','valid',now() - interval '3 days')
on conflict (id) do nothing;

-- Lock active to test locked seat: ليث قفل المقعد 10 من حمص إلى دمشق في Trip 1
delete from public.seat_locks where id = 'c711e1db-df34-5291-8bb2-b2a2e0d0d111';
insert into public.seat_locks (id, trip_id, bus_seat_id, user_id, from_trip_stop_id, to_trip_stop_id, expires_at)
select 'c711e1db-df34-5291-8bb2-b2a2e0d0d111', '2c16e152-c87b-535d-972a-369970f2807d', s.id, '9bf34d74-b181-5a95-95d0-5ad8fb54c994', '1bbac934-4b56-587a-a2a8-914b0053b97a', '601940a6-dcaf-554f-b52d-7f8994054c92', now() + interval '20 minutes'
from public.bus_seats s
where s.bus_id = '0e760cf2-c234-5cbe-867d-a372ed957bfd'
  and s.seat_number = 10;

-- Notifications
insert into public.notifications (id, user_id, title, message, type, related_trip_id, related_booking_id, is_read) values
('a2d82070-35e9-57ed-94dd-970930a661a8','b6bd9882-7fc7-592f-9ebe-ab34332660ce','تم تأكيد الحجز','تم تأكيد حجزك على رحلة حلب إلى دمشق.','booking_confirmed','2c16e152-c87b-535d-972a-369970f2807d','4bb51723-2a2b-53fa-a752-ec13d40c9201',false),
('dcd05b63-3709-5c70-a8d2-27ac7ce377a5','6a256dab-29fc-571d-aaed-d194186160cd','تذكير بالرحلة','رحلتك بعد يومين، يرجى الحضور قبل الموعد.','trip_reminder','2c16e152-c87b-535d-972a-369970f2807d','dcb49ec7-656e-5f5f-afae-3f3c68256d48',false)
on conflict (id) do nothing;

drop function if exists public.seed_auth_user(uuid, text, text, text, text, user_role);

commit;

-- =========================================================
-- TEST QUERIES
-- =========================================================
-- 1) تسجيل دخول مدير النظام:
--    email: admin@bolman.com
--    password: 12345678
--
-- 2) تسجيل دخول موظف شركة الشام:
--    email: staff.sham@bolman.com
--    password: 12345678
--
-- 3) تسجيل دخول السائق خالد:
--    email: driver.khaled@bolman.com
--    password: 12345678
--
-- 4) تسجيل دخول الراكب أحمد:
--    email: ahmad@bolman.com
--    password: 12345678
--
-- 5) اختبار حالة المقاعد:
-- select * from public.get_seats_status(
--   '2c16e152-c87b-535d-972a-369970f2807d',
--   '1bbac934-4b56-587a-a2a8-914b0053b97a',
--   '601940a6-dcaf-554f-b52d-7f8994054c92'
-- ) order by seat_number;
--
-- متوقع:
-- - seat 1 reserved إذا كان المقطع يتداخل أو متاح إذا لا يتداخل حسب from/to.
-- - seat 10 locked.
-- - seat 45 inactive.
--
-- 6) QR جماعي جاهز للتجريب:
--    QR-GROUP-AHMAD-0001
