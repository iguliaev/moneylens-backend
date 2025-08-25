-- 008_bank_accounts.sql
-- Per-user bank accounts dictionary

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_bank_accounts_user_name unique (user_id, name)
);

create index if not exists idx_bank_accounts_user on public.bank_accounts (user_id);
