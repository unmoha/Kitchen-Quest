alter table public.game_sessions
 drop constraint game_sessions_recipe_builder_challenges_check;

alter table public.game_sessions
 add constraint game_sessions_recipe_challenges_check
 check (
   cardinality(challenge_recipe_ids) <= 3
   and (
     cardinality(challenge_recipe_ids) = 0
     or game_mode in ('recipe_builder', 'cooking_order')
   )
 );

alter table public.game_attempts
 add column selected_recipe_step_ids uuid[];

alter table public.game_attempts
 drop constraint game_attempts_recipe_builder_payload_check;

alter table public.game_attempts
 add constraint game_attempts_recipe_game_payload_check
 check (
   (
     recipe_id is null
     and selected_ingredient_ids is null
     and selected_recipe_step_ids is null
   )
   or (
     recipe_id is not null
     and selected_ingredient_ids is not null
     and selected_recipe_step_ids is null
     and question_id is null
     and selected_option_id is null
     and cardinality(selected_ingredient_ids) between 1 and 40
   )
   or (
     recipe_id is not null
     and selected_ingredient_ids is null
     and selected_recipe_step_ids is not null
     and question_id is null
     and selected_option_id is null
     and cardinality(selected_recipe_step_ids) between 2 and 40
   )
 );
