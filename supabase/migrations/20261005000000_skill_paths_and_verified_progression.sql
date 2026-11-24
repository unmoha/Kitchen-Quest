alter table public.game_sessions
  add column completion_verified_at timestamptz;
alter table public.game_attempts
  add column server_verified boolean not null default false;
create or replace function public.skill_fnv1a_32(p_value text)
returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_hash bigint := 2166136261;
  v_bytes bytea := convert_to(p_value, 'UTF8');
  v_index integer;
begin
  for v_index in 0..length(v_bytes) - 1 loop
    v_hash := ((v_hash # get_byte(v_bytes, v_index)::bigint) * 16777619) % 4294967296;
  end loop;
  return v_hash;
end;
$$;
revoke all on function public.skill_fnv1a_32(text) from public, anon, authenticated;
create or replace function public.validate_game_session_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipe_id uuid;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'A game session must belong to the authenticated user';
  end if;

  if new.status <> 'active' or new.score <> 0 or new.completed_at is not null
    or new.completion_verified_at is not null then
    raise exception 'New game sessions must start active with no score';
  end if;

  if new.game_mode in ('recipe_builder', 'cooking_order') then
    if cardinality(new.challenge_recipe_ids) not between 1 and 3
      or cardinality(array(select distinct unnest(new.challenge_recipe_ids))) <> cardinality(new.challenge_recipe_ids) then
      raise exception 'Recipe games require one to three distinct challenges';
    end if;

    foreach v_recipe_id in array new.challenge_recipe_ids loop
      if new.game_mode = 'recipe_builder' and not exists (
        select 1
        from public.recipes r
        join public.recipe_ingredients ri on ri.recipe_id = r.id
        join public.ingredients i on i.id = ri.ingredient_id
        where r.id = v_recipe_id
          and r.status = 'published'
        group by r.id
        having count(*) >= 3 and bool_and(i.status = 'published')
      ) then
        raise exception 'Recipe Builder challenge is not eligible';
      end if;

      if new.game_mode = 'cooking_order' and not exists (
        select 1
        from public.recipes r
        join public.recipe_steps rs on rs.recipe_id = r.id
        where r.id = v_recipe_id
          and r.status = 'published'
        group by r.id
        having count(*) >= 2
          and min(rs.step_number) = 1
          and max(rs.step_number) = count(*)
      ) then
        raise exception 'Cooking Order challenge is not eligible';
      end if;
    end loop;
  elsif cardinality(new.challenge_recipe_ids) <> 0 then
    raise exception 'This game mode does not accept recipe challenges';
  end if;

  return new;
end;
$$;
create trigger game_sessions_validate_insert
before insert on public.game_sessions
for each row execute function public.validate_game_session_insert();
revoke all on function public.validate_game_session_insert() from public, anon, authenticated;
create or replace function public.validate_and_score_game_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.game_sessions%rowtype;
  v_category text;
  v_required_ids uuid[];
  v_selected_ids uuid[];
  v_expected_steps uuid[];
  v_correct_option boolean;
begin
  select * into v_session
  from public.game_sessions
  where id = new.session_id
  for update;

  if auth.uid() is null or not found or v_session.user_id is distinct from auth.uid() or v_session.status <> 'active' then
    raise exception 'Game attempts require an active session owned by the authenticated user';
  end if;

  if new.response_time_ms is not null and new.response_time_ms < 0 then
    raise exception 'Response time cannot be negative';
  end if;

  if v_session.game_mode in ('ingredient_quiz', 'kitchen_challenge', 'food_detective') then
    v_category := case v_session.game_mode
      when 'ingredient_quiz' then 'ingredients'
      when 'kitchen_challenge' then 'food_safety'
      else 'techniques'
    end;

    if new.question_id is null or new.selected_option_id is null
      or new.recipe_id is not null
      or new.selected_ingredient_ids is not null
      or new.selected_recipe_step_ids is not null then
      raise exception 'Question game attempt payload is invalid';
    end if;

    select qo.is_correct into v_correct_option
    from public.questions q
    join public.learning_modules lm on lm.id = q.learning_module_id
    join public.question_options qo on qo.question_id = q.id
    where q.id = new.question_id
      and qo.id = new.selected_option_id
      and q.status = 'published'
      and lm.status = 'published'
      and lm.category = v_category;

    if not found then
      raise exception 'Question or answer option is not eligible for this game';
    end if;

    if exists (
      select 1 from public.game_attempts ga
      where ga.session_id = new.session_id and ga.question_id = new.question_id
    ) then
      raise exception 'Question has already been attempted in this session';
    end if;

    new.is_correct := v_correct_option;
  elsif v_session.game_mode = 'recipe_builder' then
    if new.recipe_id is null or new.question_id is not null or new.selected_option_id is not null
      or new.selected_ingredient_ids is null or new.selected_recipe_step_ids is not null
      or not (new.recipe_id = any(v_session.challenge_recipe_ids))
      or cardinality(new.selected_ingredient_ids) not between 1 and 40
      or cardinality(array(select distinct unnest(new.selected_ingredient_ids))) <> cardinality(new.selected_ingredient_ids) then
      raise exception 'Recipe Builder attempt payload is invalid';
    end if;

    if not exists (
      select 1 from public.recipes r
      join public.recipe_ingredients ri on ri.recipe_id = r.id
      join public.ingredients i on i.id = ri.ingredient_id
      where r.id = new.recipe_id and r.status = 'published'
      group by r.id
      having count(*) >= 3 and bool_and(i.status = 'published')
    ) then
      raise exception 'Recipe Builder recipe is not eligible';
    end if;

    if exists (
      select 1 from public.game_attempts ga
      where ga.session_id = new.session_id and ga.recipe_id = new.recipe_id
    ) then
      raise exception 'Recipe has already been attempted in this session';
    end if;

    if exists (
      select 1
      from unnest(new.selected_ingredient_ids) selected(id)
      where not exists (
        select 1
        from public.recipe_ingredients ri
        join public.ingredients i on i.id = ri.ingredient_id
        where ri.recipe_id = new.recipe_id
          and ri.ingredient_id = selected.id
          and i.status = 'published'
      )
    ) then
      raise exception 'Recipe Builder selection contains an unavailable ingredient';
    end if;

    select array_agg(required.ingredient_id order by required.ingredient_id)
    into v_required_ids
    from (
      select ri.ingredient_id
      from public.recipe_ingredients ri
      where ri.recipe_id = new.recipe_id
      order by public.skill_fnv1a_32(
        v_session.id::text || ':' || new.recipe_id::text || ':' || ri.ingredient_id::text
      ), ri.ingredient_id
      limit 3
    ) required;

    select array_agg(selected.id order by selected.id)
    into v_selected_ids
    from unnest(new.selected_ingredient_ids) selected(id);

    new.is_correct := v_selected_ids = v_required_ids;
  else
    if new.recipe_id is null or new.question_id is not null or new.selected_option_id is not null
      or new.selected_ingredient_ids is not null or new.selected_recipe_step_ids is null
      or not (new.recipe_id = any(v_session.challenge_recipe_ids))
      or cardinality(new.selected_recipe_step_ids) not between 2 and 40
      or cardinality(array(select distinct unnest(new.selected_recipe_step_ids))) <> cardinality(new.selected_recipe_step_ids) then
      raise exception 'Cooking Order attempt payload is invalid';
    end if;

    if exists (
      select 1 from public.game_attempts ga
      where ga.session_id = new.session_id and ga.recipe_id = new.recipe_id
    ) then
      raise exception 'Recipe has already been attempted in this session';
    end if;

    select array_agg(rs.id order by rs.step_number)
    into v_expected_steps
    from public.recipe_steps rs
    join public.recipes r on r.id = rs.recipe_id
    where rs.recipe_id = new.recipe_id
      and r.status = 'published';

    if v_expected_steps is null or cardinality(v_expected_steps) < 2
      or cardinality(new.selected_recipe_step_ids) <> cardinality(v_expected_steps)
      or exists (
        select 1 from unnest(new.selected_recipe_step_ids) selected(id)
        where not (selected.id = any(v_expected_steps))
      ) then
      raise exception 'Cooking Order selection does not contain every published step';
    end if;

    new.is_correct := new.selected_recipe_step_ids = v_expected_steps;
  end if;

  new.server_verified := true;

  update public.game_sessions
  set score = score + case when new.is_correct then 10 else 0 end,
      updated_at = now()
  where id = new.session_id;

  return new;
end;
$$;
create trigger game_attempts_validate_and_score
before insert on public.game_attempts
for each row execute function public.validate_and_score_game_attempt();
revoke all on function public.validate_and_score_game_attempt() from public, anon, authenticated;
create unique index game_attempts_one_question_per_session_idx
on public.game_attempts (session_id, question_id)
where question_id is not null;
drop policy if exists "Users can update their own sessions" on public.game_sessions;
revoke insert, update, delete on public.game_sessions from anon, authenticated, public;
grant select on public.game_sessions to authenticated;
grant insert (id, user_id, game_mode, challenge_recipe_ids) on public.game_sessions to authenticated;
drop policy if exists "Users can insert attempts for their own sessions" on public.game_attempts;
revoke insert, update, delete on public.game_attempts from anon, authenticated, public;
grant select on public.game_attempts to authenticated;
grant insert (
  session_id,
  question_id,
  selected_option_id,
  recipe_id,
  selected_ingredient_ids,
  selected_recipe_step_ids,
  response_time_ms
) on public.game_attempts to authenticated;
create or replace function public.transition_game_session(p_session_id uuid, p_action text)
returns public.game_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.game_sessions%rowtype;
  v_attempt_count integer;
  v_challenge_count integer;
begin
  if auth.uid() is null or p_action is null or p_action not in ('completed', 'abandoned') then
    raise exception 'Invalid game session transition';
  end if;

  select * into v_session
  from public.game_sessions
  where id = p_session_id and user_id = auth.uid()
  for update;

  if not found or v_session.status <> 'active' then
    raise exception 'Game session is not active or is not owned by the caller';
  end if;

  if p_action = 'completed' then
    if v_session.game_mode in ('recipe_builder', 'cooking_order') then
      select count(distinct ga.recipe_id) into v_attempt_count
      from public.game_attempts ga
      where ga.session_id = p_session_id
        and ga.server_verified;
      v_challenge_count := cardinality(v_session.challenge_recipe_ids);

      if v_challenge_count < 1 or v_attempt_count <> v_challenge_count then
        raise exception 'Every recipe challenge must be submitted before completion';
      end if;
    else
      select count(*) into v_attempt_count
      from public.game_attempts ga
      where ga.session_id = p_session_id and ga.server_verified;

      if v_attempt_count < 3 then
        raise exception 'At least three validated answers are required to complete this session';
      end if;
    end if;

    update public.game_sessions
    set status = 'completed',
        completed_at = now(),
        completion_verified_at = now()
    where id = p_session_id
    returning * into v_session;
  else
    update public.game_sessions
    set status = 'abandoned',
        completed_at = now()
    where id = p_session_id
    returning * into v_session;
  end if;

  return v_session;
end;
$$;
revoke all on function public.transition_game_session(uuid, text) from public, anon;
grant execute on function public.transition_game_session(uuid, text) to authenticated;
create or replace function public.validate_user_learning_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mastery numeric(5,2) := 0;
  v_last_attempted_at timestamptz;
  v_completed_at timestamptz;
begin
  if auth.uid() is null or new.user_id is distinct from auth.uid() then
    raise exception 'Learning progress must belong to the authenticated user';
  end if;

  if new.learning_module_id is not null then
    select
      coalesce(max(round(100.0 * session_stats.correct_count / session_stats.total_count)), 0),
      max(session_stats.completed_at),
      min(session_stats.completed_at) filter (
        where round(100.0 * session_stats.correct_count / session_stats.total_count) >= 70
      )
    into v_mastery, v_last_attempted_at, v_completed_at
    from (
      select
        session.id,
        session.completed_at,
        count(attempt.id) as total_count,
        count(attempt.id) filter (where attempt.is_correct) as correct_count
      from public.game_sessions session
      join public.game_attempts attempt on attempt.session_id = session.id
      join public.questions question on question.id = attempt.question_id
      where session.user_id = new.user_id
        and session.status = 'completed'
        and session.completion_verified_at is not null
        and attempt.server_verified
        and question.learning_module_id = new.learning_module_id
      group by session.id, session.completed_at
    ) session_stats;
  else
    select
      coalesce(max(case when attempt.is_correct then 100 else 0 end), 0),
      max(session.completed_at),
      min(session.completed_at) filter (where attempt.is_correct)
    into v_mastery, v_last_attempted_at, v_completed_at
    from public.game_sessions session
    join public.game_attempts attempt on attempt.session_id = session.id
    where session.user_id = new.user_id
      and session.status = 'completed'
      and session.completion_verified_at is not null
      and attempt.server_verified
      and attempt.recipe_id = new.recipe_id;
  end if;

  if v_completed_at is not null then
    v_completed_at := greatest(v_completed_at, new.created_at);
  end if;

  new.mastery_score := v_mastery;
  new.last_attempted_at := v_last_attempted_at;
  new.completed_at := v_completed_at;
  return new;
end;
$$;
revoke all on function public.validate_user_learning_progress() from public, anon, authenticated;
create trigger user_learning_progress_validate_evidence
before insert or update on public.user_learning_progress
for each row execute function public.validate_user_learning_progress();
create type public.skill_progress_status as enum ('in_progress', 'completed');
create table public.skill_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.skill_nodes (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.skill_paths (id) on delete cascade,
  position integer not null check (position > 0),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  learning_module_id uuid references public.learning_modules (id) on delete restrict,
  game_mode public.game_mode,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (path_id, position),
  check (learning_module_id is not null or game_mode is not null)
);
create table public.skill_node_prerequisites (
  node_id uuid not null references public.skill_nodes (id) on delete cascade,
  prerequisite_node_id uuid not null references public.skill_nodes (id) on delete cascade,
  primary key (node_id, prerequisite_node_id),
  check (node_id <> prerequisite_node_id)
);
create table public.user_skill_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  node_id uuid not null references public.skill_nodes (id) on delete cascade,
  status public.skill_progress_status not null default 'in_progress',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, node_id),
  check ((status = 'completed') = (completed_at is not null))
);
create index skill_paths_status_title_idx on public.skill_paths (status, title);
create index skill_nodes_path_position_idx on public.skill_nodes (path_id, position);
create index skill_nodes_module_idx on public.skill_nodes (learning_module_id) where learning_module_id is not null;
create index skill_nodes_game_mode_idx on public.skill_nodes (game_mode) where game_mode is not null;
create index skill_node_prerequisites_prerequisite_idx on public.skill_node_prerequisites (prerequisite_node_id);
create index user_skill_progress_user_status_idx on public.user_skill_progress (user_id, status);
create index user_skill_progress_node_idx on public.user_skill_progress (node_id);
create trigger skill_paths_set_updated_at before update on public.skill_paths
for each row execute function public.set_updated_at();
create trigger skill_nodes_set_updated_at before update on public.skill_nodes
for each row execute function public.set_updated_at();
create trigger user_skill_progress_set_updated_at before update on public.user_skill_progress
for each row execute function public.set_updated_at();
alter table public.skill_paths enable row level security;
alter table public.skill_nodes enable row level security;
alter table public.skill_node_prerequisites enable row level security;
alter table public.user_skill_progress enable row level security;
revoke all on table public.skill_paths, public.skill_nodes, public.skill_node_prerequisites, public.user_skill_progress from anon, authenticated, public;
grant select on table public.skill_paths, public.skill_nodes, public.skill_node_prerequisites to anon, authenticated;
grant select on table public.user_skill_progress to authenticated;
create policy "Published skill paths are readable"
on public.skill_paths for select to anon, authenticated
using (status = 'published' or public.is_admin());
create policy "Admins can manage skill paths"
on public.skill_paths for all to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Published skill nodes are readable"
on public.skill_nodes for select to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.skill_paths sp
    where sp.id = path_id and sp.status = 'published'
  )
);
create policy "Admins can manage skill nodes"
on public.skill_nodes for all to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Published skill prerequisites are readable"
on public.skill_node_prerequisites for select to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.skill_nodes node
    join public.skill_nodes prerequisite on prerequisite.id = prerequisite_node_id
    join public.skill_paths path on path.id = node.path_id
    where node.id = node_id
      and prerequisite.path_id = node.path_id
      and path.status = 'published'
  )
);
create policy "Admins can manage skill prerequisites"
on public.skill_node_prerequisites for all to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Users can view their own skill progress"
on public.user_skill_progress for select to authenticated
using (user_id = (select auth.uid()));
create or replace function public.start_skill_node(p_node_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path_id uuid;
begin
  if auth.uid() is null then
    return 'unauthenticated';
  end if;

  select node.path_id into v_path_id
  from public.skill_nodes node
  join public.skill_paths path on path.id = node.path_id
  where node.id = p_node_id and path.status = 'published';

  if not found then
    return 'not_found';
  end if;

  if exists (
    select 1
    from public.skill_node_prerequisites prerequisite
    left join public.user_skill_progress progress
      on progress.user_id = auth.uid()
      and progress.node_id = prerequisite.prerequisite_node_id
      and progress.status = 'completed'
    where prerequisite.node_id = p_node_id
      and progress.node_id is null
  ) then
    return 'locked';
  end if;

  insert into public.user_skill_progress (user_id, node_id, status)
  values (auth.uid(), p_node_id, 'in_progress')
  on conflict (user_id, node_id) do nothing;

  return 'started';
end;
$$;
create or replace function public.complete_skill_node(p_node_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path_id uuid;
  v_learning_module_id uuid;
  v_game_mode public.game_mode;
  v_newly_completed boolean := false;
begin
  if auth.uid() is null then
    return 'unauthenticated';
  end if;

  select node.path_id, node.learning_module_id, node.game_mode
  into v_path_id, v_learning_module_id, v_game_mode
  from public.skill_nodes node
  join public.skill_paths path on path.id = node.path_id
  where node.id = p_node_id and path.status = 'published';

  if not found then
    return 'not_found';
  end if;

  if exists (
    select 1
    from public.skill_node_prerequisites prerequisite
    left join public.user_skill_progress progress
      on progress.user_id = auth.uid()
      and progress.node_id = prerequisite.prerequisite_node_id
      and progress.status = 'completed'
    where prerequisite.node_id = p_node_id
      and progress.node_id is null
  ) then
    return 'locked';
  end if;

  if v_learning_module_id is not null and not exists (
    select 1
    from public.game_sessions session
    join public.game_attempts attempt on attempt.session_id = session.id
    join public.questions question on question.id = attempt.question_id
    where session.user_id = auth.uid()
      and session.status = 'completed'
      and session.completion_verified_at is not null
      and session.game_mode in ('ingredient_quiz', 'kitchen_challenge', 'food_detective')
      and (v_game_mode is null or session.game_mode = v_game_mode)
      and attempt.server_verified
      and question.learning_module_id = v_learning_module_id
    group by session.id
    having count(*) >= 3
      and round(100.0 * count(*) filter (where attempt.is_correct) / count(*)) >= 70
  ) then
    return 'missing_evidence';
  end if;

  if v_learning_module_id is null and v_game_mode is not null and not exists (
    select 1
    from public.game_sessions session
    where session.user_id = auth.uid()
      and session.game_mode = v_game_mode
      and session.status = 'completed'
      and session.completion_verified_at is not null
  ) then
    return 'missing_evidence';
  end if;

  insert into public.user_skill_progress (user_id, node_id, status, completed_at)
  values (auth.uid(), p_node_id, 'completed', now())
  on conflict (user_id, node_id) do update
  set status = 'completed',
      completed_at = coalesce(public.user_skill_progress.completed_at, now()),
      updated_at = now()
  where public.user_skill_progress.status <> 'completed'
  returning true into v_newly_completed;

  if coalesce(v_newly_completed, false) then
    perform public.award_user_xp(
      auth.uid(),
      15,
      'skill_node_completion',
      p_node_id::text,
      'Completed a skill path node'
    );
    return 'completed';
  end if;

  return 'already_completed';
end;
$$;
revoke all on function public.start_skill_node(uuid) from public, anon;
revoke all on function public.complete_skill_node(uuid) from public, anon;
grant execute on function public.start_skill_node(uuid) to authenticated;
grant execute on function public.complete_skill_node(uuid) to authenticated;
alter table public.user_xp_transactions
  drop constraint if exists user_xp_transactions_source_type_check;
alter table public.user_xp_transactions
  add constraint user_xp_transactions_source_type_check
  check (source_type in ('game_answer', 'game_session_completion', 'learning_completion', 'skill_node_completion'));
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
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized: Caller cannot award XP for a different user';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid XP amount';
  end if;

  if p_source_type not in ('game_answer', 'game_session_completion', 'learning_completion', 'skill_node_completion') then
    raise exception 'Invalid XP source type';
  end if;

  if p_source_type = 'game_answer' and (
    p_amount <> 10
    or not exists (
    select 1
    from public.game_attempts attempt
    join public.game_sessions session on session.id = attempt.session_id
    where attempt.id::text = p_source_id
      and attempt.server_verified
      and attempt.is_correct
      and session.user_id = p_user_id
    )
  ) then
    raise exception 'Invalid or unverified game answer for XP award';
  elsif p_source_type = 'game_session_completion' and (
    p_amount <> 25
    or not exists (
    select 1
    from public.game_sessions session
    where session.id::text = p_source_id
      and session.user_id = p_user_id
      and session.status = 'completed'
      and session.completion_verified_at is not null
    )
  ) then
    raise exception 'Invalid or unverified game session for XP award';
  elsif p_source_type = 'learning_completion' and (
    p_amount <> 25
    or not exists (
    select 1
    from public.user_learning_progress progress
    where progress.user_id = p_user_id
      and (progress.learning_module_id::text = p_source_id or progress.recipe_id::text = p_source_id)
      and progress.completed_at is not null
      and (
        (progress.learning_module_id is not null and exists (
          select 1
          from public.game_sessions session
          join public.game_attempts attempt on attempt.session_id = session.id
          join public.questions question on question.id = attempt.question_id
          where session.user_id = p_user_id
            and session.status = 'completed'
            and session.completion_verified_at is not null
            and attempt.server_verified
            and question.learning_module_id = progress.learning_module_id
          group by session.id
          having count(*) >= 3
            and round(100.0 * count(*) filter (where attempt.is_correct) / count(*)) >= 70
        ))
        or (progress.recipe_id is not null and exists (
          select 1
          from public.game_sessions session
          join public.game_attempts attempt on attempt.session_id = session.id
          where session.user_id = p_user_id
            and session.status = 'completed'
            and session.completion_verified_at is not null
            and attempt.server_verified
            and attempt.recipe_id = progress.recipe_id
            and attempt.is_correct
        ))
      )
    )
  ) then
    raise exception 'Invalid or unverified learning completion for XP award';
  elsif p_source_type = 'skill_node_completion' and (
    p_amount <> 15
    or not exists (
      select 1 from public.user_skill_progress progress
      where progress.user_id = p_user_id
        and progress.node_id::text = p_source_id
        and progress.status = 'completed'
    )
  ) then
    raise exception 'Invalid or unverified skill node completion for XP award';
  end if;

  insert into public.user_xp_transactions (user_id, amount, source_type, source_id, description)
  values (p_user_id, p_amount, p_source_type, p_source_id, coalesce(p_description, 'XP Award'))
  on conflict (user_id, source_type, source_id) do nothing
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function public.award_user_xp(uuid, integer, text, text, text) from public, anon;
grant execute on function public.award_user_xp(uuid, integer, text, text, text) to authenticated;
create or replace function public.get_published_game_questions(p_game_mode public.game_mode)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return (
    select coalesce(jsonb_agg(published.question order by published.created_at desc, published.id), '[]'::jsonb)
    from (
      select
        question.id,
        question.created_at,
        jsonb_build_object(
          'id', question.id,
          'slug', question.slug,
          'learning_module_id', question.learning_module_id,
          'learning_module_category', module.category,
          'learning_module_status', module.status,
          'question_text', question.question_text,
          'question_type', question.question_type,
          'explanation', question.explanation,
          'difficulty', question.difficulty,
          'status', question.status,
          'created_at', question.created_at,
          'updated_at', question.updated_at,
          'options', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', answer_option.id,
                'question_id', answer_option.question_id,
                'option_text', answer_option.option_text,
                'option_order', answer_option.option_order
              )
              order by answer_option.option_order
            )
            from public.question_options answer_option
            where answer_option.question_id = question.id
          ), '[]'::jsonb)
        ) as question
      from public.questions question
      join public.learning_modules module on module.id = question.learning_module_id
      where question.status = 'published'
        and module.status = 'published'
        and (
          (p_game_mode = 'ingredient_quiz' and module.category = 'ingredients')
          or (p_game_mode = 'kitchen_challenge' and module.category = 'food_safety')
          or (p_game_mode = 'food_detective' and module.category = 'techniques')
        )
    ) published
  );
end;
$$;
revoke all on function public.get_published_game_questions(public.game_mode) from public, anon;
grant execute on function public.get_published_game_questions(public.game_mode) to authenticated;
create or replace function public.get_question_module_map(p_question_ids uuid[])
returns table (question_id uuid, learning_module_id uuid, module_title text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  select question.id, module.id, module.title
  from public.questions question
  join public.learning_modules module on module.id = question.learning_module_id
  where question.id = any(coalesce(p_question_ids, '{}'::uuid[]))
    and question.status = 'published'
    and module.status = 'published';
end;
$$;
revoke all on function public.get_question_module_map(uuid[]) from public, anon;
grant execute on function public.get_question_module_map(uuid[]) to authenticated;
