begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- Create test supabase users
select tests.create_supabase_user('user1@test.com');
select tests.create_supabase_user('user2@test.com');

-- Insert test data for monthly totals
insert into transactions (id, user_id, date, type, category, amount, tags, notes, bank_account) values
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2025-08-01', 'spend', 'food', 100.00, array['groceries'], 'Lunch', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2025-08-02', 'spend', 'food', 50.00, array['groceries'], 'Dinner', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2025-08-03', 'earn', 'salary', 1000.00, array['salary'], 'August Salary', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2025-08-04', 'save', 'vacation', 150.00, array['groceries'], 'Vacation', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2025-08-01', 'spend', 'food', 200.00, array['groceries'], 'Lunch', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2025-08-02', 'spend', 'food', 100.00, array['groceries'], 'Dinner', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2025-08-03', 'earn', 'salary', 2000.00, array['salary'], 'August Salary', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2025-08-04', 'save', 'vacation', 150.00, array['groceries'], 'Vacation', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2025-07-01', 'spend', 'food', 100.00, array['groceries'], 'Lunch', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2025-06-02', 'spend', 'food', 50.00, array['groceries'], 'Dinner', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2025-05-03', 'earn', 'salary', 1000.00, array['salary'], 'August Salary', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2025-04-04', 'save', 'vacation', 150.00, array['groceries'], 'Vacation', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2025-07-01', 'spend', 'food', 200.00, array['groceries'], 'Lunch', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2025-06-02', 'spend', 'food', 100.00, array['groceries'], 'Dinner', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2025-05-03', 'earn', 'salary', 2000.00, array['salary'], 'August Salary', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2025-04-04', 'save', 'vacation', 150.00, array['groceries'], 'Vacation', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2024-08-01', 'spend', 'food', 100.00, array['groceries'], 'Lunch', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2024-08-02', 'spend', 'food', 50.00, array['groceries'], 'Dinner', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2024-08-03', 'earn', 'salary', 1000.00, array['salary'], 'August Salary', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user1@test.com'), '2024-08-04', 'save', 'vacation', 150.00, array['groceries'], 'Vacation', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2024-08-01', 'spend', 'food', 200.00, array['groceries'], 'Lunch', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2024-08-02', 'spend', 'food', 100.00, array['groceries'], 'Dinner', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2024-08-03', 'earn', 'salary', 2000.00, array['salary'], 'August Salary', 'Test Bank'),
    (gen_random_uuid(), tests.get_supabase_uid('user2@test.com'), '2024-08-04', 'save', 'vacation', 150.00, array['groceries'], 'Vacation', 'Test Bank');


-- as User 1
select tests.authenticate_as('user1@test.com');

-- Test 1: view_monthly_totals for August 2025, type 'spend'
select results_eq(
    $$ select total from view_monthly_totals where month = '2025-08-01' and type = 'spend' $$,
    array[150.00::numeric],
    'view_monthly_totals returns correct sum for August 2025, spend'
);

-- Test 2: view_monthly_totals for August 2025, type 'earn'
select results_eq(
    $$ select total from view_monthly_totals where month = '2025-08-01' and type = 'earn' $$,
    array[1000.00::numeric],
    'view_monthly_totals returns correct sum for August 2025, earn'
);

-- Test 3: view_monthly_totals for August 2025, type 'save'
select results_eq(
    $$ select total from view_monthly_totals where month = '2025-08-01' and type = 'save' $$,
    array[150.00::numeric],
    'view_monthly_totals returns correct sum for August 2025, save'
);

-- Test 4: view_yearly_totals for 2025, type 'spend'
select results_eq(
    $$ select total from view_yearly_totals where year = '2025-01-01' and type = 'spend' $$,
    array[300.00::numeric],
    'view_yearly_totals returns correct sum for 2025, spend'
);

-- Test 5: view_yearly_totals for 2025, type 'earn'
select results_eq(
    $$ select total from view_yearly_totals where year = '2025-01-01' and type = 'earn' $$,
    array[2000.00::numeric],
    'view_yearly_totals returns correct sum for 2025, earn'
);

-- Test 6: view_yearly_totals for 2025, type 'save'
select results_eq(
    $$ select total from view_yearly_totals where year = '2025-01-01' and type = 'save' $$,
    array[300.00::numeric],
    'view_yearly_totals returns correct sum for 2025, save'
);

-- Test 7: view_monthly_category_totals for August 2025, user1
select results_eq(
    $$
    select category, type::text as type, total
    from view_monthly_category_totals
    where month = '2025-08-01'
    order by category, type
    $$,
    $$
    select * from (values
      ('food'::text, 'spend'::text, 150.00::numeric),
      ('salary'::text, 'earn'::text, 1000.00::numeric),
      ('vacation'::text, 'save'::text, 150.00::numeric)
    ) as t(category, type, total)
    order by category, type
    $$,
    'view_monthly_category_totals returns correct per-category sums for August 2025, user1'
);

-- Test 8: view_yearly_category_totals for 2025, user1
select results_eq(
    $$
    select category, type::text as type, total
    from view_yearly_category_totals
    where year = '2025-01-01'
    order by category, type
    $$,
    $$
    select * from (values
      ('food'::text, 'spend'::text, 300.00::numeric),
      ('salary'::text, 'earn'::text, 2000.00::numeric),
      ('vacation'::text, 'save'::text, 300.00::numeric)
    ) as t(category, type, total)
    order by category, type
    $$,
    'view_yearly_category_totals returns correct per-category sums for 2025, user1'
);


select * from finish();
rollback;
