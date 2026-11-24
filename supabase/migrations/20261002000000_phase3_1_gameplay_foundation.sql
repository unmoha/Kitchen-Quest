create type public.game_mode as enum (
  'ingredient_quiz',
  'recipe_builder',
  'cooking_order',
  'kitchen_challenge',
  'food_detective'
);

create type public.game_session_status as enum (
  'active',
  'completed',
  'abandoned'
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  game_mode public.game_mode not null,
  status public.game_session_status not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score integer not null default 0 check (score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or completed_at >= started_at)
);

create table public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  question_id uuid references public.questions (id) on delete set null,
  selected_option_id uuid references public.question_options (id) on delete set null,
  is_correct boolean not null,
  response_time_ms integer,
  created_at timestamptz not null default now(),
  check (question_id is not null or selected_option_id is null),
  check (response_time_ms is null or response_time_ms >= 0)
);

create table public.user_learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  learning_module_id uuid references public.learning_modules (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete cascade,
  mastery_score numeric(5,2) not null check (mastery_score >= 0 and mastery_score <= 100),
  completed_at timestamptz,
  last_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (learning_module_id is not null and recipe_id is null)
    or (learning_module_id is null and recipe_id is not null)
  ),
  check (completed_at is null or completed_at >= created_at)
);

create index game_sessions_user_status_started_idx
on public.game_sessions (user_id, status, started_at desc);

create index game_attempts_session_created_at_idx
on public.game_attempts (session_id, created_at desc);

create index game_attempts_question_created_at_idx
on public.game_attempts (question_id, created_at desc);

create unique index user_learning_progress_user_module_unique_idx
on public.user_learning_progress (user_id, learning_module_id)
where learning_module_id is not null;

create unique index user_learning_progress_user_recipe_unique_idx
on public.user_learning_progress (user_id, recipe_id)
where recipe_id is not null;

create index user_learning_progress_user_last_attempted_idx
on public.user_learning_progress (user_id, last_attempted_at desc);

create trigger game_sessions_set_updated_at before update on public.game_sessions
for each row execute function public.set_updated_at();

create trigger user_learning_progress_set_updated_at before update on public.user_learning_progress
for each row execute function public.set_updated_at();

alter table public.game_sessions enable row level security;
alter table public.game_attempts enable row level security;
alter table public.user_learning_progress enable row level security;

revoke all on table
  public.game_sessions,
  public.game_attempts,
  public.user_learning_progress
from anon, authenticated;

grant select, insert, update on table public.game_sessions to authenticated;
grant select, insert on table public.game_attempts to authenticated;
grant select, insert, update on table public.user_learning_progress to authenticated;

create policy "Users can view their own sessions"
on public.game_sessions for select to authenticated
using (user_id = auth.uid());

create policy "Users can insert their own sessions"
on public.game_sessions for insert to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own sessions"
on public.game_sessions for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can view attempts for their own sessions"
on public.game_attempts for select to authenticated
using (
  exists (
    select 1
    from public.game_sessions gs
    where gs.id = session_id
      and gs.user_id = auth.uid()
  )
);

create policy "Users can insert attempts for their own sessions"
on public.game_attempts for insert to authenticated
with check (
  exists (
    select 1
    from public.game_sessions gs
    where gs.id = session_id
      and gs.user_id = auth.uid()
  )
  and (question_id is not null or selected_option_id is null)
);

create policy "Users can view their own learning progress"
on public.user_learning_progress for select to authenticated
using (user_id = auth.uid());

create policy "Users can insert their own learning progress"
on public.user_learning_progress for insert to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own learning progress"
on public.user_learning_progress for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
