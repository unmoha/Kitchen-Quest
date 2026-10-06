create type public.content_status as enum ('draft', 'review', 'published', 'archived');
create type public.difficulty_level as enum ('beginner', 'intermediate', 'advanced');
create type public.question_type as enum ('multiple_choice', 'true_false', 'ordering');
create type public.daily_challenge_type as enum ('recipe', 'learning_module', 'ingredient', 'technique');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  category text not null check (char_length(btrim(category)) between 1 and 60),
  image_url text,
  storage_information text not null,
  safety_information text not null,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  cuisine text not null check (char_length(btrim(cuisine)) between 1 and 100),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  difficulty public.difficulty_level not null,
  prep_time_minutes integer not null check (prep_time_minutes between 0 and 1440),
  cook_time_minutes integer not null check (cook_time_minutes between 0 and 1440),
  servings integer not null check (servings between 1 and 100),
  image_url text,
  educational_info text not null,
  safety_notes text not null,
  nutrition_info jsonb check (nutrition_info is null or jsonb_typeof(nutrition_info) = 'object'),
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  quantity numeric(10, 3) not null check (quantity > 0),
  unit text not null check (char_length(btrim(unit)) between 1 and 40),
  is_optional boolean not null default false,
  preparation_note text,
  primary key (recipe_id, ingredient_id)
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  step_number integer not null check (step_number > 0),
  instruction text not null check (char_length(btrim(instruction)) between 1 and 3000),
  time_minutes integer check (time_minutes is null or time_minutes between 0 and 1440),
  educational_note text,
  unique (recipe_id, step_number)
);

create table public.learning_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  category text not null check (category in ('ingredients', 'techniques', 'tools', 'food_safety', 'nutrition', 'world_cuisine')),
  difficulty public.difficulty_level not null,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  learning_module_id uuid references public.learning_modules (id) on delete set null,
  question_text text not null check (char_length(btrim(question_text)) between 1 and 2000),
  question_type public.question_type not null,
  explanation text not null check (char_length(btrim(explanation)) between 1 and 2000),
  difficulty public.difficulty_level not null,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  option_text text not null check (char_length(btrim(option_text)) between 1 and 1000),
  option_order integer not null check (option_order > 0),
  is_correct boolean not null default false,
  unique (question_id, option_order)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null check (char_length(btrim(description)) between 1 and 1000),
  icon text not null check (char_length(btrim(icon)) between 1 and 80),
  requirement jsonb not null check (jsonb_typeof(requirement) = 'object'),
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  challenge_type public.daily_challenge_type not null,
  recipe_id uuid references public.recipes (id) on delete restrict,
  learning_module_id uuid references public.learning_modules (id) on delete restrict,
  ingredient_id uuid references public.ingredients (id) on delete restrict,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  check (num_nonnulls(recipe_id, learning_module_id, ingredient_id) <= 1),
  check (
    (challenge_type = 'recipe' and recipe_id is not null and learning_module_id is null and ingredient_id is null)
    or (challenge_type = 'learning_module' and learning_module_id is not null and recipe_id is null and ingredient_id is null)
    or (challenge_type = 'ingredient' and ingredient_id is not null and recipe_id is null and learning_module_id is null)
    or (challenge_type = 'technique' and recipe_id is null and learning_module_id is null and ingredient_id is null)
  )
);

create index ingredients_status_name_idx on public.ingredients (status, name);
create index recipes_status_title_idx on public.recipes (status, title);
create index recipe_ingredients_ingredient_id_idx on public.recipe_ingredients (ingredient_id);
create index learning_modules_status_category_idx on public.learning_modules (status, category, title);
create index questions_module_status_idx on public.questions (learning_module_id, status);
create unique index question_options_one_correct_idx on public.question_options (question_id) where is_correct;
create index achievements_status_name_idx on public.achievements (status, name);
create index daily_challenges_status_date_idx on public.daily_challenges (status, challenge_date);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger ingredients_set_updated_at before update on public.ingredients
for each row execute function public.set_updated_at();
create trigger recipes_set_updated_at before update on public.recipes
for each row execute function public.set_updated_at();
create trigger learning_modules_set_updated_at before update on public.learning_modules
for each row execute function public.set_updated_at();
create trigger questions_set_updated_at before update on public.questions
for each row execute function public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
  if requested_name is null then
    requested_name := 'Home cook';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, left(requested_name, 40))
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, display_name)
select
  u.id,
  left(coalesce(nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''), 'Home cook'), 40)
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.learning_modules enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.achievements enable row level security;
alter table public.daily_challenges enable row level security;

revoke all on table
  public.profiles,
  public.ingredients,
  public.recipes,
  public.recipe_ingredients,
  public.recipe_steps,
  public.learning_modules,
  public.questions,
  public.question_options,
  public.achievements,
  public.daily_challenges
from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Profiles are private. The owning user can read their row and update only editable columns.
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url) on table public.profiles to authenticated;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Public roles receive read-only grants; these policies expose published content only.
grant select on table
  public.ingredients,
  public.recipes,
  public.recipe_ingredients,
  public.recipe_steps,
  public.learning_modules,
  public.achievements,
  public.daily_challenges
to anon, authenticated;

create policy "Published ingredients are readable"
on public.ingredients for select to anon, authenticated
using (status = 'published');
create policy "Published recipes are readable"
on public.recipes for select to anon, authenticated
using (status = 'published');
create policy "Published recipe ingredients are readable"
on public.recipe_ingredients for select to anon, authenticated
using (
  exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'published')
  and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.status = 'published')
);
create policy "Published recipe steps are readable"
on public.recipe_steps for select to anon, authenticated
using (exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'published'));
create policy "Published learning modules are readable"
on public.learning_modules for select to anon, authenticated
using (status = 'published');
create policy "Published achievement definitions are readable"
on public.achievements for select to anon, authenticated
using (status = 'published');
create policy "Published daily challenge definitions are readable"
on public.daily_challenges for select to anon, authenticated
using (
  status = 'published'
  and (
    (challenge_type = 'recipe' and exists (select 1 from public.recipes r where r.id = recipe_id and r.status = 'published'))
    or (challenge_type = 'learning_module' and exists (select 1 from public.learning_modules m where m.id = learning_module_id and m.status = 'published'))
    or (challenge_type = 'ingredient' and exists (select 1 from public.ingredients i where i.id = ingredient_id and i.status = 'published'))
    or challenge_type = 'technique'
  )
);

-- Question rows and answer options intentionally have no client grants or read policies.
-- Future game validation must use a trusted server operation and must not return is_correct.