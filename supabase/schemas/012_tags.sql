-- 012_tags.sql
-- Base table for per-user Tags dictionary (no RLS/policies here; see next file)

create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint uq_tags_user_name unique (user_id, name)
);

create index if not exists idx_tags_user on public.tags (user_id);

comment on table public.tags is 'Per-user predefined tags (dictionary).';
comment on column public.tags.name is 'Tag label unique per user.';
