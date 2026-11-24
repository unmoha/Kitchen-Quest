-- The verified-progression migration revoked table-level insert and granted
-- column-level insert, but dropped the only INSERT policy without replacing it,
-- so RLS rejected every attempt. Restore it, scoped to the user's own sessions.
drop policy if exists "Users can insert attempts for their own sessions" on public.game_attempts;
create policy "Users can insert attempts for their own sessions"
on public.game_attempts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.game_sessions gs
    where gs.id = session_id
      and gs.user_id = (select auth.uid())
  )
  and (question_id is not null or selected_option_id is null)
);
