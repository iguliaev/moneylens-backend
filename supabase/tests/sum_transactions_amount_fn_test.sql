begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Create test supabase users
select tests.create_supabase_user('u1@test.com');
select tests.create_supabase_user('u2@test.com');

-- Seed minimal transactions for function tests
insert into transactions (id, user_id, date, type, category, amount, tags, notes, bank_account) values
    (gen_random_uuid(), tests.get_supabase_uid('u1@test.com'), '2025-08-01', 'spend', 'food', 100.00, array['groceries'], 'U1 A', 'Bank A'),
    (gen_random_uuid(), tests.get_supabase_uid('u1@test.com'), '2025-08-02', 'spend', 'food', 50.00, array['groceries','fun'], 'U1 B', 'Bank B'),
    (gen_random_uuid(), tests.get_supabase_uid('u1@test.com'), '2025-08-03', 'earn',  'salary', 1000.00, array['salary'], 'U1 C', 'Bank A'),
    (gen_random_uuid(), tests.get_supabase_uid('u1@test.com'), '2025-07-10', 'spend', 'food', 20.00, array['misc'], 'U1 D', 'Bank A'),

    (gen_random_uuid(), tests.get_supabase_uid('u2@test.com'), '2025-08-01', 'spend', 'food', 70.00, array['groceries'], 'U2 A', 'Bank A'),
    (gen_random_uuid(), tests.get_supabase_uid('u2@test.com'), '2025-08-02', 'spend', 'food', 30.00, null, 'U2 B', 'Bank A');

-- Authenticate as user 1
select tests.authenticate_as('u1@test.com');

-- 1) August 2025 spend total for user1
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, null, null, null),
  150.00::numeric,
  'sum_transactions_amount returns 150 for user1 August 2025 spend'
);

-- 2) Filter by bank account (Bank A) in August 2025
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, 'Bank A', null, null),
  100.00::numeric,
  'sum_transactions_amount filters by bank account Bank A'
);

-- 3) tagsAny: fun in August 2025
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, null, array['fun'], null),
  50.00::numeric,
  'sum_transactions_amount filters by tagsAny fun'
);

-- 4) tagsAll: groceries & fun in August 2025
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, null, null, array['groceries','fun']),
  50.00::numeric,
  'sum_transactions_amount filters by tagsAll groceries+fun'
);

-- 5) Filter by category food in August 2025
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', 'food', null, null, null),
  150.00::numeric,
  'sum_transactions_amount filters by category food'
);

-- 6) July 2025 spend only
select is(
  public.sum_transactions_amount('2025-07-01', '2025-07-31', 'spend', null, null, null, null),
  20.00::numeric,
  'sum_transactions_amount returns July 2025 spend 20 for user1'
);

-- 7) All-time spend for user1 (null dates)
select is(
  public.sum_transactions_amount(null, null, 'spend', null, null, null, null),
  170.00::numeric,
  'sum_transactions_amount returns all-time spend 170 for user1'
);

-- 8) No matches case (spend with tag salary)
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, null, array['salary'], null),
  0.00::numeric,
  'sum_transactions_amount returns 0 when no matching rows (salary tag with spend)'
);

-- 9) RLS isolation: authenticate as user2, August 2025 spend
select tests.authenticate_as('u2@test.com');
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, null, null, null),
  100.00::numeric,
  'sum_transactions_amount returns 100 for user2 August 2025 spend under RLS'
);

select * from finish();
rollback;
