-- 009_bank_accounts_rls.sql
-- Enable RLS and owner-only policies for bank_accounts; add user_id and updated_at triggers

alter table if exists public.bank_accounts enable row level security;

drop policy if exists bank_accounts_select on public.bank_accounts;
create policy bank_accounts_select
on public.bank_accounts
for select
using (user_id = auth.uid());

drop policy if exists bank_accounts_insert on public.bank_accounts;
create policy bank_accounts_insert
on public.bank_accounts
for insert
with check (user_id = auth.uid());

drop policy if exists bank_accounts_update on public.bank_accounts;
create policy bank_accounts_update
on public.bank_accounts
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists bank_accounts_delete on public.bank_accounts;
create policy bank_accounts_delete
on public.bank_accounts
for delete
using (user_id = auth.uid());

-- Auto-assign user_id
create or replace function public.bank_accounts_set_user_id()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_user_id_on_bank_accounts on public.bank_accounts;
create trigger set_user_id_on_bank_accounts
before insert on public.bank_accounts
for each row execute function public.bank_accounts_set_user_id();

-- Keep updated_at fresh on UPDATE (reuse tg_set_updated_at from categories)
drop trigger if exists set_updated_at_on_bank_accounts on public.bank_accounts;
create trigger set_updated_at_on_bank_accounts
before update on public.bank_accounts
for each row execute function public.tg_set_updated_at();
