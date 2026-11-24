-- Phase 4.6 — Admin & Content Management Foundation

-- 1. Add role to profiles
alter table public.profiles
add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

create index if not exists profiles_role_idx on public.profiles (role) where role = 'admin';

-- 2. Helper function to check if caller is an admin
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists(
    select 1
    from public.profiles
    where id = coalesce(p_user_id, auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin from public, anon;
grant execute on function public.is_admin to authenticated;

-- 3. Create admin audit log table
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (char_length(btrim(action)) between 1 and 100),
  entity_type text not null check (entity_type in ('ingredient', 'recipe', 'learning_module', 'question', 'achievement', 'daily_challenge')),
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_admin_user_idx on public.admin_audit_logs (admin_user_id);
create index if not exists admin_audit_logs_entity_idx on public.admin_audit_logs (entity_type, entity_id);

alter table public.admin_audit_logs enable row level security;

revoke all on table public.admin_audit_logs from anon, authenticated;
grant select, insert on table public.admin_audit_logs to authenticated;

create policy "Admins can view audit logs"
on public.admin_audit_logs for select to authenticated
using (public.is_admin());

create policy "Admins can insert audit logs"
on public.admin_audit_logs for insert to authenticated
with check (public.is_admin() and admin_user_id = auth.uid());

-- 4. Content tables admin grants and policies
grant insert, update, delete on table
  public.ingredients,
  public.recipes,
  public.recipe_ingredients,
  public.recipe_steps,
  public.learning_modules,
  public.achievements,
  public.daily_challenges
to authenticated;

grant select, insert, update, delete on table
  public.questions,
  public.question_options
to authenticated;

-- Admin policies
create policy "Admins have full access to ingredients"
on public.ingredients for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins have full access to recipes"
on public.recipes for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins have full access to recipe ingredients"
on public.recipe_ingredients for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins have full access to recipe steps"
on public.recipe_steps for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins have full access to learning modules"
on public.learning_modules for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins have full access to questions"
on public.questions for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins have full access to question options"
on public.question_options for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins have full access to achievements"
on public.achievements for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins have full access to daily challenges"
on public.daily_challenges for all to authenticated
using (public.is_admin())
with check (public.is_admin());
