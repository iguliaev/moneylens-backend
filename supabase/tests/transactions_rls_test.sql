begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Create test supabase users
select tests.create_supabase_user('user1@test.com');
select tests.create_supabase_user('user2@test.com');

-- Create test transactions
insert into transactions (id, user_id, date, type, category, amount, tags, notes, bank_account) values
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), current_date, 'spend', 'test', 100.00, array['test'], 'Test transaction', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), current_date, 'earn', 'salary', 200.00, array['salary'], 'Salary payment', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), current_date - interval '1 day', 'save', 'investment', 150.00, array['stocks'], 'Investment in stocks', 'Test Bank');

-- as User 1
select tests.authenticate_as('user1@test.com');

-- Test 1: User 1 should only see their own transactions
select results_eq(
    'select count(*) from transactions',
    array[2::bigint],
    'User 1 should only see their 2 transactions'
);


-- Test 2: User 1 can create their own transaction
select lives_ok(
    $$insert into transactions (id, user_id, date, type, category, amount, tags, notes, bank_account)
      values (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), current_date, 'spend', 'groceries', 50.00, array['groceries'], 'grocery shopping', 'test bank')$$,
    'User 1 should be able to create a new transaction'
);

-- Test 3: User 1 cannot insert a transaction for another user
select throws_ok(
    $$insert into transactions (id, user_id, date, type, category, amount, tags, notes, bank_account)
      values (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), current_date, 'spend', 'groceries', 50.00, array['groceries'], 'grocery shopping', 'test bank')$$,
    '42501',
    'new row violates row-level security policy for table "transactions"',
    'User 1 should not be able to insert a transaction for another user'
);

-- as User 2
select tests.authenticate_as('user2@test.com');

-- Test 4: User 2 should only see their own transactions
select results_eq(
    'select count(*) from transactions',
    array[1::bigint],
    'User 2 should only see their 1 transaction'
);


-- Test 5: User 2 cannot modify User 1's transactions
select results_ne(
    $$ update transactions set notes = 'hacked!' where user_id = tests.get_supabase_uid('user1@test.com') returning 1 $$,
    $$ values(1) $$,
    'User 2 should not be able to modify User 1 transactions'
);



-- Test 6: User 2 can update their own transaction
select lives_ok(
    $$update transactions set notes = 'updated by user 2' where user_id = tests.get_supabase_uid('user2@test.com')$$,
    'User 2 should be able to update their own transaction'
);

-- Test 7: User 2 can delete their own transaction
select lives_ok(
    $$delete from transactions where user_id = tests.get_supabase_uid('user2@test.com')$$,
    'User 2 should be able to delete their own transaction'
);

-- Test 8: User 2 cannot set user_id to another user on insert
select throws_ok(
    $$insert into transactions (id, user_id, date, type, category, amount, tags, notes, bank_account)
      values (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), current_date, 'spend', 'groceries', 50.00, array['groceries'], 'grocery shopping', 'test bank')$$,
    '42501',
    'new row violates row-level security policy for table "transactions"',
    'User 2 should not be able to set user_id to another user on insert'
);

select * from finish();

rollback;