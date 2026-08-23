-- Makes the dashboard → mobile notification path self-contained.
--
-- Three things the push feature depends on that were never guaranteed by a
-- migration (they only existed in bolman_cursor_reference_pack/*.sql, which is a
-- reference dump, not an applied migration):
--
--   1. public.user_fcm_tokens        — where devices register
--   2. public.register_fcm_token()   — the RPC both clients call
--   3. the supabase_realtime publication carrying public.notifications, which the
--      mobile app's in-app realtime listener needs
--
-- Everything below is idempotent and safe to re-run.

-- ── 1. Device platform enum ──────────────────────────────────────────────────
do $$ begin
  create type device_platform as enum ('android', 'ios', 'web');
exception
  when duplicate_object then null;
end $$;

-- ── 2. Token table ───────────────────────────────────────────────────────────
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

-- Lookup path used by send-trip-notification on every send.
create index if not exists idx_user_fcm_tokens_active_user
  on public.user_fcm_tokens(user_id) where is_active;

-- ── 3. Registration RPC ──────────────────────────────────────────────────────
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
  set user_id      = excluded.user_id,
      platform     = excluded.platform,
      device_id    = excluded.device_id,
      is_active    = true,
      last_seen_at = now(),
      updated_at   = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.register_fcm_token(text, device_platform, text) from public;
revoke all on function public.register_fcm_token(text, device_platform, text) from anon;
grant execute on function public.register_fcm_token(text, device_platform, text) to authenticated;

-- ── 4. RLS on the token table ────────────────────────────────────────────────
alter table public.user_fcm_tokens enable row level security;

drop policy if exists user_fcm_tokens_own_select on public.user_fcm_tokens;
create policy user_fcm_tokens_own_select on public.user_fcm_tokens
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_fcm_tokens_own_write on public.user_fcm_tokens;
create policy user_fcm_tokens_own_write on public.user_fcm_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_fcm_tokens_own_delete on public.user_fcm_tokens;
create policy user_fcm_tokens_own_delete on public.user_fcm_tokens
  for delete to authenticated using (user_id = auth.uid());

grant select, update, delete on public.user_fcm_tokens to authenticated;

-- ── 5. Realtime for in-app notifications ─────────────────────────────────────
-- Without this the mobile app's postgres_changes subscription on
-- public.notifications never fires, so the in-app fallback is silent whenever
-- push does not land.
alter table public.notifications replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
