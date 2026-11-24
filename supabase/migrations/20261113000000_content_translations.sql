create table if not exists public.content_translations (
  entity_type text not null check (entity_type in (
    'ingredient',
    'recipe',
    'recipe_ingredient',
    'recipe_step',
    'learning_module',
    'question',
    'question_option',
    'achievement',
    'daily_challenge',
    'skill_path',
    'skill_node'
  )),
  entity_id uuid not null,
  field_name text not null check (length(trim(field_name)) > 0),
  locale text not null check (locale in ('en', 'am')),
  translated_text text not null check (length(trim(translated_text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (entity_type, entity_id, field_name, locale)
);
create index if not exists content_translations_locale_entity_lookup_idx
  on public.content_translations (locale, entity_type, entity_id, field_name);
create trigger content_translations_set_updated_at
  before update on public.content_translations
  for each row execute function public.set_updated_at();
create or replace function public.content_translation_question_is_published(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_entity_type = 'question' then
    return exists (
      select 1
      from public.questions q
      where q.id = p_entity_id and q.status = 'published'
    );
  end if;

  if p_entity_type = 'question_option' then
    return exists (
      select 1
      from public.question_options o
      join public.questions q on q.id = o.question_id
      where o.id = p_entity_id and q.status = 'published'
    );
  end if;

  return false;
end;
$$;
revoke all on function public.content_translation_question_is_published(text, uuid)
  from public, anon, authenticated;
grant execute on function public.content_translation_question_is_published(text, uuid)
  to authenticated;
alter table public.content_translations enable row level security;
revoke all on public.content_translations from public, anon, authenticated;
grant select on public.content_translations to anon, authenticated;
grant insert, update, delete on public.content_translations to authenticated;
create policy "Published content translations are readable"
  on public.content_translations
  for select
  to anon, authenticated
  using (
    entity_type not in ('question', 'question_option')
    and case entity_type
      when 'ingredient' then exists (
        select 1 from public.ingredients i
        where i.id = entity_id and i.status = 'published'
      )
      when 'recipe' then exists (
        select 1 from public.recipes r
        where r.id = entity_id and r.status = 'published'
      )
      when 'recipe_ingredient' then exists (
        select 1 from public.recipes r
        where r.id = entity_id and r.status = 'published'
      )
      when 'recipe_step' then exists (
        select 1 from public.recipe_steps s
        join public.recipes r on r.id = s.recipe_id
        where s.id = entity_id and r.status = 'published'
      )
      when 'learning_module' then exists (
        select 1 from public.learning_modules m
        where m.id = entity_id and m.status = 'published'
      )
      when 'achievement' then exists (
        select 1 from public.achievements a
        where a.id = entity_id and a.status = 'published'
      )
      when 'daily_challenge' then exists (
        select 1 from public.daily_challenges d
        where d.id = entity_id and d.status = 'published'
      )
      when 'skill_path' then exists (
        select 1 from public.skill_paths p
        where p.id = entity_id and p.status = 'published'
      )
      when 'skill_node' then exists (
        select 1 from public.skill_nodes n
        join public.skill_paths p on p.id = n.path_id
        where n.id = entity_id and p.status = 'published'
      )
      else false
    end
  );
create policy "Authenticated users can read published question translations"
  on public.content_translations
  for select
  to authenticated
  using (
    entity_type in ('question', 'question_option')
    and public.content_translation_question_is_published(entity_type, entity_id)
  );
create policy "Admins can manage content translations"
  on public.content_translations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
