begin;

create extension if not exists pgtap with schema extensions;

select plan(3);

-- Create test user
select tests.create_supabase_user('ba_user3@test.com');
select tests.authenticate_as('ba_user3@test.com');

-- Create bank accounts
insert into public.bank_accounts (name) values ('Checking');
insert into public.bank_accounts (name) values ('Card');

-- Fetch ids
with ids as (
  select
    (select id from public.bank_accounts where name = 'Checking') as checking_id,
    (select id from public.bank_accounts where name = 'Card') as card_id,
  auth.uid() as uid
)
-- Insert transactions referencing only Card
insert into public.transactions (user_id, date, type, amount, bank_account_id)
select uid, current_date, 'spend', 10, card_id from ids;

-- 1) Usage view shows counts: Card=1, Checking=0
select results_eq(
  $$ select name, in_use_count from public.bank_accounts_with_usage order by name $$,
  $$ values ('Card', 1::bigint), ('Checking', 0::bigint) $$,
  'Usage view counts match'
);

-- 2) Safe delete prevents deleting Card
select results_eq(
  $$ select x.ok, x.in_use_count from public.delete_bank_account_safe((select id from public.bank_accounts where name = 'Card')) as x $$,
  $$ values (false, 1::bigint) $$,
  'Cannot delete account in use'
);

-- 3) Safe delete allows deleting Checking
select results_eq(
  $$ select x.ok, x.in_use_count from public.delete_bank_account_safe((select id from public.bank_accounts where name = 'Checking')) as x $$,
  $$ values (true, 0::bigint) $$,
  'Can delete account not in use'
);

select * from finish();

rollback;
