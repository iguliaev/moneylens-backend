begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(8);

insert into auth.users (id, email) values
    ('123e4567-e89b-12d3-a456-426614174000', 'user1@test.com'),
    ('987fcdeb-51a2-43d7-9012-345678901234', 'user2@test.com');

insert into transactions (id, user_id, date, type, category, amount, tags, notes, bank_account) values
    (gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', current_date, 'spend', 'test', 100.00, array['test'], 'Test transaction', 'Test Bank'),
    (gen_random_uuid(), '987fcdeb-51a2-43d7-9012-345678901234', current_date, 'earn', 'salary', 200.00, array['salary'], 'Salary payment', 'Test Bank'),
    (gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', current_date - interval '1 day', 'save', 'investment', 150.00, array['stocks'], 'Investment in stocks', 'Test Bank');

-- as User 1
set local role authenticated;
set local request.jwt.claim.sub = '123e4567-e89b-12d3-a456-426614174000';

-- Test 1: User 1 should only see their own transactions
select results_eq(
    'select count(*) from transactions',
    array[2::bigint],
    'User 1 should only see their 2 transactions'
);


-- Test 2: User 1 can create their own transaction
select lives_ok(
    $$insert into transactions (id, user_id, date, type, category, amount, tags, notes, bank_account)
      values (gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', current_date, 'spend', 'groceries', 50.00, array['groceries'], 'grocery shopping', 'test bank')$$,
    'User 1 should be able to create a new transaction'
);

-- Test 3: User 1 cannot insert a transaction for another user
select throws_ok(
    $$insert into transactions (id, user_id, date, type, category, amount, tags, notes, bank_account)
      values (gen_random_uuid(), '987fcdeb-51a2-43d7-9012-345678901234', current_date, 'spend', 'groceries', 50.00, array['groceries'], 'grocery shopping', 'test bank')$$,
    '42501',
    'new row violates row-level security policy for table "transactions"',
    'User 1 should not be able to insert a transaction for another user'
);

-- as User 2
set local request.jwt.claim.sub = '987fcdeb-51a2-43d7-9012-345678901234';

-- Test 4: User 2 should only see their own transactions
select results_eq(
    'select count(*) from transactions',
    array[1::bigint],
    'User 2 should only see their 1 transaction'
);


-- Test 5: User 2 cannot modify User 1's transactions
select results_ne(
    $$ update transactions set notes = 'hacked!' where user_id = '123e4567-e89b-12d3-a456-426614174000'::uuid returning 1 $$,
    $$ values(1) $$,
    'User 2 should not be able to modify User 1 transactions'
);



-- Test 6: User 2 can update their own transaction
select lives_ok(
    $$update transactions set notes = 'updated by user 2' where user_id = '987fcdeb-51a2-43d7-9012-345678901234'$$,
    'User 2 should be able to update their own transaction'
);

-- Test 7: User 2 can delete their own transaction
select lives_ok(
    $$delete from transactions where user_id = '987fcdeb-51a2-43d7-9012-345678901234'$$,
    'User 2 should be able to delete their own transaction'
);

-- Test 8: User 2 cannot set user_id to another user on insert
select throws_ok(
    $$insert into transactions (id, user_id, date, type, category, amount, tags, notes, bank_account)
      values (gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', current_date, 'spend', 'groceries', 50.00, array['groceries'], 'grocery shopping', 'test bank')$$,
    '42501',
    'new row violates row-level security policy for table "transactions"',
    'User 2 should not be able to set user_id to another user on insert'
);

select * from finish();

rollback;