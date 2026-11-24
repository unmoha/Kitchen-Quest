-- Phase 4.2: Achievements & User Unlocks
-- Append-only user achievement unlocks with strict server-authoritative security

-- 1. Create user_achievements table
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint user_achievements_user_achievement_unique unique (user_id, achievement_id)
);

create index if not exists user_achievements_user_unlocked_idx
on public.user_achievements (user_id, unlocked_at desc);

create index if not exists user_achievements_achievement_id_idx
on public.user_achievements (achievement_id);

-- 2. Seed additional gameplay and progression achievement definitions
insert into public.achievements (name, slug, description, icon, requirement, status)
values
  ('First Quest', 'first-quest', 'Complete your first game session.', 'award', '{"kind":"game_sessions_completed","count":1}', 'published'),
  ('Game Explorer', 'game-explorer', 'Play and complete at least 3 distinct game modes.', 'compass', '{"kind":"distinct_game_modes","count":3}', 'published'),
  ('Prep Cook Rank', 'prep-cook-rank', 'Reach Chef Level 2 with 100+ XP.', 'chef-hat', '{"kind":"min_level","level":2}', 'published'),
  ('Mastery Achiever', 'mastery-achiever', 'Reach 100% mastery on any recipe or learning lesson.', 'trophy', '{"kind":"mastery_score","min_score":100}', 'published')
on conflict (slug) do nothing;

-- 3. Configure Row-Level Security
alter table public.user_achievements enable row level security;

revoke all on table public.user_achievements from anon, authenticated, public;

-- Grant SELECT only to authenticated users for their own unlocks
grant select on table public.user_achievements to authenticated;

create policy "Users can view their own achievements"
on public.user_achievements for select to authenticated
using (user_id = auth.uid());

-- 4. Server-authoritative RPC for unlocking achievements
create or replace function public.unlock_user_achievement(
  p_user_id uuid,
  p_achievement_id uuid
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
    raise exception 'Unauthorized: Caller cannot unlock achievements for a different user';
  end if;

  -- Verify achievement exists and is published
  if not exists (
    select 1 from public.achievements a
    where a.id = p_achievement_id
      and a.status = 'published'
  ) then
    raise exception 'Invalid or unpublished achievement ID: %', p_achievement_id;
  end if;

  insert into public.user_achievements (
    user_id,
    achievement_id,
    unlocked_at
  ) values (
    p_user_id,
    p_achievement_id,
    timezone('utc'::text, now())
  )
  on conflict (user_id, achievement_id) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.unlock_user_achievement from public, anon;
grant execute on function public.unlock_user_achievement to authenticated;
