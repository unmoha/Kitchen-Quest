alter table public.recipes
  add column if not exists tips jsonb not null default '[]'::jsonb,
  add column if not exists tags text[] not null default '{}'::text[];
alter table public.recipes
  add constraint recipes_tips_is_array
  check (jsonb_typeof(tips) = 'array');
