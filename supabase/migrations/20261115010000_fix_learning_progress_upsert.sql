-- ON CONFLICT (user_id, learning_module_id) needs a non-partial unique index.
-- NULLs are distinct in Postgres, so rows without a module/recipe don't collide.
drop index if exists public.user_learning_progress_user_module_unique_idx;
drop index if exists public.user_learning_progress_user_recipe_unique_idx;
create unique index user_learning_progress_user_module_unique_idx
on public.user_learning_progress (user_id, learning_module_id);
create unique index user_learning_progress_user_recipe_unique_idx
on public.user_learning_progress (user_id, recipe_id);
