begin;

select plan(20);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'phase2-owner@kitchen.quest', '{"display_name":"Kitchen Owner"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'phase2-stranger@kitchen.quest', '{"display_name":"Another Cook"}'::jsonb)
on conflict (id) do nothing;

insert into public.recipes (
  title, slug, description, cuisine, category, difficulty,
  prep_time_minutes, cook_time_minutes, servings, educational_info, safety_notes, status
)
values
  ('Published RLS fixture', 'phase2-rls-published-recipe', 'A test recipe for publication policy checks.', 'Test cuisine', 'Test', 'beginner', 1, 1, 1, 'Test note.', 'Test safety note.', 'published'),
  ('Draft RLS fixture', 'phase2-rls-draft-recipe', 'A test draft that must remain private.', 'Test cuisine', 'Test', 'beginner', 1, 1, 1, 'Test note.', 'Test safety note.', 'draft');

insert into public.learning_modules (title, slug, description, category, difficulty, content, status)
values
  ('Published RLS lesson', 'phase2-rls-published-module', 'A test lesson for publication policy checks.', 'ingredients', 'beginner', '{"sections":[]}'::jsonb, 'published'),
  ('Draft RLS lesson', 'phase2-rls-draft-module', 'A test draft that must remain private.', 'ingredients', 'beginner', '{"sections":[]}'::jsonb, 'draft');

insert into public.daily_challenges (challenge_date, title, slug, description, challenge_type, recipe_id, status)
select '2026-10-20', 'Published linked challenge', 'phase2-rls-published-challenge', 'A challenge linked to a published recipe.', 'recipe', id, 'published'
from public.recipes where slug = 'phase2-rls-published-recipe';
insert into public.daily_challenges (challenge_date, title, slug, description, challenge_type, recipe_id, status)
select '2026-10-21', 'Draft linked challenge', 'phase2-rls-draft-linked-challenge', 'A challenge linked to a draft recipe.', 'recipe', id, 'published'
from public.recipes where slug = 'phase2-rls-draft-recipe';

select ok(
  (select count(*) = 10 and bool_and(relrowsecurity)
   from pg_class
   where relnamespace = 'public'::regnamespace
     and relname = any(array[
       'profiles', 'ingredients', 'recipes', 'recipe_ingredients', 'recipe_steps',
       'learning_modules', 'questions', 'question_options', 'achievements', 'daily_challenges'
     ])),
  'RLS is enabled on every Phase 2 table'
);
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anonymous users cannot read profiles');
select ok(not has_table_privilege('anon', 'public.profiles', 'UPDATE'), 'anonymous users cannot update profiles');

set local role anon;
select results_eq(
  $$select slug from public.recipes where slug = 'phase2-rls-published-recipe'$$,
  array['phase2-rls-published-recipe'::text],
  'anonymous users can read a published recipe'
);
select is_empty(
  $$select slug from public.recipes where slug = 'phase2-rls-draft-recipe'$$,
  'anonymous users cannot read a draft recipe'
);
select results_eq(
  $$select slug from public.learning_modules where slug = 'phase2-rls-published-module'$$,
  array['phase2-rls-published-module'::text],
  'anonymous users can read a published learning module'
);
select is_empty(
  $$select slug from public.learning_modules where slug = 'phase2-rls-draft-module'$$,
  'anonymous users cannot read a draft learning module'
);
select results_eq(
  $$select slug from public.daily_challenges where slug = 'phase2-rls-published-challenge'$$,
  array['phase2-rls-published-challenge'::text],
  'anonymous users can read a published challenge linked to published content'
);
select is_empty(
  $$select slug from public.daily_challenges where slug = 'phase2-rls-draft-linked-challenge'$$,
  'published challenges linked to draft content remain hidden'
);
select ok(not has_table_privilege('anon', 'public.recipes', 'INSERT'), 'anonymous users cannot insert recipe content');
select ok(not has_table_privilege('anon', 'public.questions', 'SELECT'), 'anonymous users cannot read question definitions');
select ok(not has_table_privilege('anon', 'public.question_options', 'SELECT'), 'anonymous users cannot read answer options');
reset role;

set local role authenticated;
select ok(not has_table_privilege('authenticated', 'public.recipes', 'INSERT'), 'authenticated users cannot insert recipe content');
select ok(not has_table_privilege('authenticated', 'public.question_options', 'SELECT'), 'authenticated users cannot read answer options');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE'), 'authenticated users cannot reassign profile ids');
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select results_eq(
  $$select display_name from public.profiles where id = '11111111-1111-4111-8111-111111111111'$$,
  array['Kitchen Owner'::text],
  'a user can read their own profile'
);
select results_eq(
  $$update public.profiles set display_name = 'Updated Kitchen Owner' where id = '11111111-1111-4111-8111-111111111111' returning display_name$$,
  array['Updated Kitchen Owner'::text],
  'a user can update their own profile'
);
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select is_empty(
  $$select id from public.profiles where id = '11111111-1111-4111-8111-111111111111'$$,
  'another user cannot read the owner profile'
);
select is_empty(
  $$update public.profiles set display_name = 'Tampered' where id = '11111111-1111-4111-8111-111111111111' returning id$$,
  'another user cannot update the owner profile'
);
reset role;

select results_eq(
  $$select display_name from public.profiles where id = '11111111-1111-4111-8111-111111111111'$$,
  array['Updated Kitchen Owner'::text],
  'a denied cross-user update leaves the owner profile unchanged'
);

select * from finish();
rollback;
