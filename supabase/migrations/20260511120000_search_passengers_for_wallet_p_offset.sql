-- Wallet directory + search: adds p_offset and returns all active passengers when query < 2 chars.
-- Run via Supabase SQL Editor or: supabase db push
-- Fixes PostgREST: "Could not find the function public.search_passengers_for_wallet(...)" when the project still had the old (text, integer) signature.

drop function if exists public.search_passengers_for_wallet(text, integer);
drop function if exists public.search_passengers_for_wallet(text, integer, integer);

create or replace function public.search_passengers_for_wallet(
  p_query text,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  full_name text,
  phone text,
  email text,
  wallet_id uuid,
  balance numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_q text := trim(coalesce(p_query, ''));
begin
  if auth.uid() is null or not public.can_manage_office_wallets() then
    raise exception 'FORBIDDEN';
  end if;

  if length(v_q) < 2 then
    return query
    select
      u.id,
      u.full_name,
      u.phone,
      u.email,
      w.id,
      coalesce(w.balance, 0)::numeric
    from public.users u
    left join public.wallets w on w.user_id = u.id
    where u.role = 'passenger'
      and u.status = 'active'
    order by u.full_name
    limit v_limit
    offset v_offset;
    return;
  end if;

  return query
  select
    u.id,
    u.full_name,
    u.phone,
    u.email,
    w.id,
    coalesce(w.balance, 0)::numeric
  from public.users u
  left join public.wallets w on w.user_id = u.id
  where u.role = 'passenger'
    and u.status = 'active'
    and (
      u.full_name ilike '%' || v_q || '%'
      or coalesce(u.phone, '') ilike '%' || v_q || '%'
      or coalesce(u.email, '') ilike '%' || v_q || '%'
    )
  order by u.full_name
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.search_passengers_for_wallet(text, integer, integer) from public;
grant execute on function public.search_passengers_for_wallet(text, integer, integer) to authenticated;
