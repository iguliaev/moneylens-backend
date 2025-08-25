-- 010_transactions_bank_account_fk.sql
-- Add bank_account_id to transactions and enforce it belongs to same user

alter table if exists public.transactions
  add column if not exists bank_account_id uuid references public.bank_accounts(id);

create or replace function public.check_transaction_bank_account()
returns trigger as $$
begin
  if new.bank_account_id is not null then
    if not exists (
      select 1 from public.bank_accounts b
      where b.id = new.bank_account_id and b.user_id = new.user_id
    ) then
      raise exception 'Bank account does not belong to the user' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists transaction_bank_account_check on public.transactions;
create trigger transaction_bank_account_check
before insert or update on public.transactions
for each row execute function public.check_transaction_bank_account();
