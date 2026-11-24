-- Phase 4.1 Security Fix: Lock down user_xp_transactions against client modifications
-- Ensure XP awarding is strictly server-authoritative

-- 1. Revoke INSERT, UPDATE, DELETE permissions from anon, authenticated, and public
revoke insert, update, delete on table public.user_xp_transactions from anon, authenticated, public;

-- 2. Explicitly grant SELECT only to authenticated users
grant select on table public.user_xp_transactions to authenticated;

-- 3. Drop the client insert policy
drop policy if exists "Users can insert their own xp transactions" on public.user_xp_transactions;

-- 4. Ensure SELECT policy strictly restricts viewing to user's own transactions
drop policy if exists "Users can view their own xp transactions" on public.user_xp_transactions;
create policy "Users can view their own xp transactions"
on public.user_xp_transactions for select to authenticated
using (user_id = auth.uid());

-- 5. Create secure server-authoritative RPC function for legitimate XP awarding
create or replace function public.award_user_xp(
  p_user_id uuid,
  p_amount integer,
  p_source_type text,
  p_source_id text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
begin
  -- Validate caller is authenticated and matches target user
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized: Caller cannot award XP for a different user';
  end if;

  if p_amount <= 0 then
    raise exception 'Invalid XP amount: %', p_amount;
  end if;

  if p_source_type not in ('game_answer', 'game_session_completion', 'learning_completion') then
    raise exception 'Invalid XP source type: %', p_source_type;
  end if;

  -- Verify legitimacy against actual gameplay / learning data:
  if p_source_type = 'game_answer' then
    if not exists (
      select 1 from public.game_attempts ga
      join public.game_sessions gs on gs.id = ga.session_id
      where ga.id::text = p_source_id
        and gs.user_id = p_user_id
        and ga.is_correct = true
    ) then
      raise exception 'Invalid or unverified game answer for XP award';
    end if;
  elsif p_source_type = 'game_session_completion' then
    if not exists (
      select 1 from public.game_sessions gs
      where gs.id::text = p_source_id
        and gs.user_id = p_user_id
        and gs.status = 'completed'
    ) then
      raise exception 'Invalid or uncompleted game session for XP award';
    end if;
  elsif p_source_type = 'learning_completion' then
    if not exists (
      select 1 from public.user_learning_progress ulp
      where ulp.user_id = p_user_id
        and (ulp.learning_module_id::text = p_source_id or ulp.recipe_id::text = p_source_id)
        and ulp.completed_at is not null
    ) then
      raise exception 'Invalid or uncompleted learning progress for XP award';
    end if;
  end if;

  insert into public.user_xp_transactions (
    user_id,
    amount,
    source_type,
    source_id,
    description
  ) values (
    p_user_id,
    p_amount,
    p_source_type,
    p_source_id,
    coalesce(p_description, 'XP Award')
  )
  on conflict (user_id, source_type, source_id) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.award_user_xp from public, anon;
grant execute on function public.award_user_xp to authenticated;
