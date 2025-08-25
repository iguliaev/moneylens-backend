begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

-- Create two test users
select tests.create_supabase_user('ba_user1@test.com');
select tests.create_supabase_user('ba_user2@test.com');

-- As User 1
select tests.authenticate_as('ba_user1@test.com');

-- 1) Insert without user_id should succeed and set user_id = auth.uid()
select lives_ok(
    $$ insert into public.bank_accounts (name, description) values ('Checking', 'Main account') $$,
    'Insert without user_id auto-assigns from auth.uid()'
);

-- 2) Selecting bank accounts returns only user1 rows
select results_eq(
    $$ select count(*) from public.bank_accounts $$,
    array[1::bigint],
    'User 1 sees only their bank accounts'
);

-- 3) updated_at should change on update
select lives_ok(
    $$ update public.bank_accounts set description = 'Updated desc' where name = 'Checking' $$,
    'User 1 can update their bank account'
);

select ok(
    (select updated_at >= created_at from public.bank_accounts where name = 'Checking'),
    'updated_at is >= created_at after update'
);

-- As User 2
select tests.authenticate_as('ba_user2@test.com');

-- 4) User 2 cannot see user 1 bank accounts
select results_eq(
    $$ select count(*) from public.bank_accounts $$,
    array[0::bigint],
    'User 2 sees none of user 1 bank accounts'
);

-- 5) User 2 can insert their own bank account (no user_id provided)
select lives_ok(
    $$ insert into public.bank_accounts (name) values ('Savings') $$,
    'User 2 can insert their own bank account with auto user_id'
);

-- 6) User 2 cannot update user 1 bank account (should affect 0 rows due to RLS)
select is_empty(
    $$ update public.bank_accounts set description = 'hacked' where name = 'Checking' returning 1 $$,
    'User 2 update on user 1 bank account affects 0 rows'
);

-- 7) User 2 can update their own bank account
select lives_ok(
    $$ update public.bank_accounts set description = 'personal' where name = 'Savings' $$,
    'User 2 can update their own bank account'
);

-- 8) User 2 cannot delete user 1 bank account (should affect 0 rows)
select is_empty(
    $$ delete from public.bank_accounts where name = 'Checking' returning 1 $$,
    'User 2 delete on user 1 bank account affects 0 rows'
);

-- 9) User 2 can delete their own bank account
select lives_ok(
    $$ delete from public.bank_accounts where name = 'Savings' $$,
    'User 2 can delete their own bank account'
);

-- 10) Unique name per user enforced
select tests.authenticate_as('ba_user1@test.com');
select throws_like(
    $$ insert into public.bank_accounts (name) values ('Checking') $$,
    '%uq_bank_accounts_user_name%',
    'Unique constraint on (user_id, name) is enforced'
);

select * from finish();

rollback;
