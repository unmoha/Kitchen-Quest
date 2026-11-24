alter table public.game_sessions
add column challenge_recipe_ids uuid[] not null default '{}';

alter table public.game_sessions
add constraint game_sessions_recipe_builder_challenges_check
check (
  cardinality(challenge_recipe_ids) <= 3
  and (cardinality(challenge_recipe_ids) = 0 or game_mode = 'recipe_builder')
);

alter table public.game_attempts
add column recipe_id uuid references public.recipes (id) on delete set null,
add column selected_ingredient_ids uuid[];

alter table public.game_attempts
add constraint game_attempts_recipe_builder_payload_check
check (
  (recipe_id is null and selected_ingredient_ids is null)
  or (
    recipe_id is not null
    and selected_ingredient_ids is not null
    and question_id is null
    and selected_option_id is null
    and cardinality(selected_ingredient_ids) between 1 and 40
  )
);

create unique index game_attempts_recipe_builder_once_per_challenge_idx
on public.game_attempts (session_id, recipe_id)
where recipe_id is not null;
