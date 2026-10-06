-- Phase 4.4 Security Hardening: Enforce auth.uid() on get_user_leaderboard_rank and revoke anon access
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
