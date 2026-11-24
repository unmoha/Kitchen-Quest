-- Phase 4.4: Server-Authoritative Leaderboards
-- Read-only cumulative XP leaderboard with standard competitive ranking (RANK() OVER)
-- Privacy-safe: only exposes display_name, avatar_url, total_xp, rank

-- 1. Index for efficient XP aggregation
create index if not exists user_xp_transactions_user_amount_idx
on public.user_xp_transactions (user_id, amount);

-- 2. Function: get_leaderboard
create or replace function public.get_leaderboard(
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  user_id uuid,
  rank bigint,
  display_name text,
  avatar_url text,
  total_xp bigint,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_page integer;
  v_page_size integer;
  v_offset integer;
begin
  v_page := greatest(1, coalesce(p_page, 1));
  v_page_size := least(100, greatest(1, coalesce(p_page_size, 20)));
  v_offset := (v_page - 1) * v_page_size;

  return query
  with user_aggregates as (
    select
      t.user_id,
      sum(t.amount)::bigint as total_xp,
      min(t.created_at) as first_earned_at
    from public.user_xp_transactions t
    group by t.user_id
    having sum(t.amount) > 0
  ),
  ranked_users as (
    select
      p.id as user_id,
      rank() over (order by ua.total_xp desc) as rank,
      p.display_name,
      p.avatar_url,
      ua.total_xp,
      count(*) over () as total_count,
      ua.first_earned_at
    from user_aggregates ua
    join public.profiles p on p.id = ua.user_id
  )
  select
    ru.user_id,
    ru.rank,
    ru.display_name,
    ru.avatar_url,
    ru.total_xp,
    ru.total_count
  from ranked_users ru
  order by ru.total_xp desc, ru.first_earned_at asc, ru.user_id asc
  limit v_page_size offset v_offset;
end;
$$;

revoke all on function public.get_leaderboard from public;
grant execute on function public.get_leaderboard to authenticated, anon;

-- 3. Function: get_user_leaderboard_rank
create or replace function public.get_user_leaderboard_rank(
  p_user_id uuid
)
returns table (
  rank bigint,
  total_xp bigint,
  total_players bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Enforce caller ownership: user can only query their own rank summary
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized: Caller cannot query rank for a different user';
  end if;

  return query
  with user_aggregates as (
    select
      t.user_id,
      sum(t.amount)::bigint as total_xp
    from public.user_xp_transactions t
    group by t.user_id
    having sum(t.amount) > 0
  ),
  ranked_users as (
    select
      ua.user_id,
      rank() over (order by ua.total_xp desc) as rank,
      ua.total_xp,
      count(*) over () as total_players
    from user_aggregates ua
  )
  select
    ru.rank,
    ru.total_xp,
    ru.total_players
  from ranked_users ru
  where ru.user_id = p_user_id;
end;
$$;

revoke all on function public.get_user_leaderboard_rank from public, anon;
grant execute on function public.get_user_leaderboard_rank to authenticated;
