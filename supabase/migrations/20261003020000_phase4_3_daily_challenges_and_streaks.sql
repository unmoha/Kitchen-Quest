-- Phase 4.3: Daily Challenges and Streaks Foundation

-- 1. Create user_streaks table
create table if not exists public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create user_daily_challenges table
create table if not exists public.user_daily_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  daily_challenge_id uuid not null references public.daily_challenges (id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_daily_challenges_user_challenge_unique unique (user_id, daily_challenge_id)
);

create index if not exists user_daily_challenges_user_idx on public.user_daily_challenges (user_id);
create index if not exists user_streaks_user_idx on public.user_streaks (user_id);

-- 3. Enable RLS
alter table public.user_streaks enable row level security;
alter table public.user_daily_challenges enable row level security;

-- 4. Revoke direct mutations from anon, authenticated, public
revoke all on table public.user_streaks from anon, authenticated, public;
revoke all on table public.user_daily_challenges from anon, authenticated, public;

-- 5. Grant SELECT only to authenticated users
grant select on table public.user_streaks to authenticated;
grant select on table public.user_daily_challenges to authenticated;

-- 6. Define SELECT RLS policies
drop policy if exists "Users can view their own streak" on public.user_streaks;
create policy "Users can view their own streak"
on public.user_streaks for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can view their own daily challenges" on public.user_daily_challenges;
create policy "Users can view their own daily challenges"
on public.user_daily_challenges for select to authenticated
using (user_id = (select auth.uid()));

-- 7. Server-Authoritative RPC: record_user_streak
create or replace function public.record_user_streak(
  p_user_id uuid,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_session record;
  v_activity_date date;
  v_existing record;
  v_new_current integer;
  v_new_longest integer;
  v_incremented boolean := false;
begin
  -- Validate caller
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized: Caller cannot update streaks for a different user';
  end if;

  -- Validate session is completed and owned by user
  select id, user_id, status, completed_at into v_session
  from public.game_sessions
  where id = p_session_id and user_id = p_user_id;

  if not found or v_session.status <> 'completed' then
    raise exception 'Invalid or uncompleted game session for streak recording';
  end if;

  v_activity_date := (coalesce(v_session.completed_at, now()) at time zone 'UTC')::date;

  select current_streak, longest_streak, last_activity_date into v_existing
  from public.user_streaks
  where user_id = p_user_id
  for update;

  if not found then
    -- First qualifying day
    insert into public.user_streaks (
      user_id,
      current_streak,
      longest_streak,
      last_activity_date,
      created_at,
      updated_at
    ) values (
      p_user_id,
      1,
      1,
      v_activity_date,
      now(),
      now()
    );
    return jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'last_activity_date', v_activity_date::text,
      'incremented', true
    );
  end if;

  if v_existing.last_activity_date = v_activity_date then
    -- Same day repeated activity - idempotent, no change
    return jsonb_build_object(
      'current_streak', v_existing.current_streak,
      'longest_streak', v_existing.longest_streak,
      'last_activity_date', v_existing.last_activity_date::text,
      'incremented', false
    );
  elsif v_existing.last_activity_date = (v_activity_date - integer '1') then
    -- Consecutive calendar day
    v_new_current := v_existing.current_streak + 1;
    v_new_longest := greatest(v_existing.longest_streak, v_new_current);
    v_incremented := true;
  else
    -- Streak broken (missed at least one day)
    v_new_current := 1;
    v_new_longest := greatest(v_existing.longest_streak, 1);
    v_incremented := true;
  end if;

  update public.user_streaks
  set
    current_streak = v_new_current,
    longest_streak = v_new_longest,
    last_activity_date = v_activity_date,
    updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object(
    'current_streak', v_new_current,
    'longest_streak', v_new_longest,
    'last_activity_date', v_activity_date::text,
    'incremented', v_incremented
  );
end;
$$;

revoke all on function public.record_user_streak from public, anon;
grant execute on function public.record_user_streak to authenticated;

-- 8. Server-Authoritative RPC: complete_user_daily_challenge
create or replace function public.complete_user_daily_challenge(
  p_user_id uuid,
  p_daily_challenge_id uuid,
  p_session_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_session record;
  v_challenge record;
  v_inserted_id uuid;
begin
  -- Validate caller
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized: Caller cannot complete daily challenges for a different user';
  end if;

  -- Validate session is completed and owned by user
  select id, user_id, status, game_mode, challenge_recipe_ids into v_session
  from public.game_sessions
  where id = p_session_id and user_id = p_user_id;

  if not found or v_session.status <> 'completed' then
    raise exception 'Invalid or uncompleted game session for daily challenge completion';
  end if;

  -- Validate daily challenge is published
  select id, challenge_date, challenge_type, recipe_id, learning_module_id, ingredient_id
  into v_challenge
  from public.daily_challenges
  where id = p_daily_challenge_id and status = 'published';

  if not found then
    raise exception 'Daily challenge not found or not published';
  end if;

  -- Record completion idempotently
  insert into public.user_daily_challenges (
    user_id,
    daily_challenge_id,
    completed_at
  ) values (
    p_user_id,
    p_daily_challenge_id,
    now()
  )
  on conflict (user_id, daily_challenge_id) do nothing
  returning id into v_inserted_id;

  return v_inserted_id is not null;
end;
$$;

revoke all on function public.complete_user_daily_challenge from public, anon;
grant execute on function public.complete_user_daily_challenge to authenticated;
