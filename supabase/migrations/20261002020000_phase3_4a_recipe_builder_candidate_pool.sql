alter table public.game_sessions
add column challenge_ingredient_option_ids jsonb not null default '{}'::jsonb;

alter table public.game_sessions
add constraint game_sessions_recipe_builder_candidate_pool_check
check (
  jsonb_typeof(challenge_ingredient_option_ids) = 'object'
  and (challenge_ingredient_option_ids = '{}'::jsonb or game_mode = 'recipe_builder')
);
