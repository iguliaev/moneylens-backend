-- 010_transactions_bank_account_fk.sql
-- Enforce bank account belongs to same user

create or replace function public.check_transaction_bank_account()
returns trigger
language plpgsql
-- Harden search_path: empty string; all references are schema-qualified or local NEW.*
set search_path = ''
as $$
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
$$;

drop trigger if exists transaction_bank_account_check on public.transactions;
create trigger transaction_bank_account_check
before insert or update on public.transactions
for each row execute function public.check_transaction_bank_account();
