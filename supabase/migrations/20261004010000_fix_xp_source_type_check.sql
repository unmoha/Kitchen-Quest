alter table public.user_xp_transactions
  drop constraint if exists user_xp_transactions_source_type_check;

alter table public.user_xp_transactions
  add constraint user_xp_transactions_source_type_check
  check (source_type in ('game_answer', 'game_session_completion', 'learning_completion'));
