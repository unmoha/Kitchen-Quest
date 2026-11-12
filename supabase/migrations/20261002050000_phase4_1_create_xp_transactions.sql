-- Creates the XP ledger table that the empty phase4_1 migration never created.
create table if not exists public.user_xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount > 0),
  source_type text not null check (
    source_type in ('game_answer', 'game_session_completion', 'learning_completion')
  ),
  source_id text not null,
  description text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists user_xp_transactions_unique_source_idx
  on public.user_xp_transactions (user_id, source_type, source_id);

create index if not exists user_xp_transactions_user_created_idx
  on public.user_xp_transactions (user_id, created_at desc);

alter table public.user_xp_transactions enable row level security;
