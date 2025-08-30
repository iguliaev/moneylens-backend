begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Create test supabase users
select tests.create_supabase_user('u1@test.com');
select tests.create_supabase_user('u2@test.com');

-- Seed required tags per user for enforce_known_tags
insert into public.tags (user_id, name)
values
  (tests.get_supabase_uid('u1@test.com'), 'groceries'),
  (tests.get_supabase_uid('u1@test.com'), 'fun'),
  (tests.get_supabase_uid('u1@test.com'), 'salary'),
  (tests.get_supabase_uid('u1@test.com'), 'misc'),
  (tests.get_supabase_uid('u2@test.com'), 'groceries');

-- Create categories for users
insert into categories (user_id, type, name)
values
  (tests.get_supabase_uid('u1@test.com'), 'spend', 'food'),
  (tests.get_supabase_uid('u1@test.com'), 'earn',  'salary'),
  (tests.get_supabase_uid('u2@test.com'), 'spend', 'food');

-- Seed transactions that reference category_id (category text may be null)
insert into transactions (id, user_id, date, type, category, category_id, amount, tags, notes, bank_account) values
    (gen_random_uuid(), tests.get_supabase_uid('u1@test.com'), '2025-08-01', 'spend', null, (select id from categories where user_id = tests.get_supabase_uid('u1@test.com') and type='spend' and name='food'), 100.00, array['groceries'], 'U1 A', 'Bank A'),
    (gen_random_uuid(), tests.get_supabase_uid('u1@test.com'), '2025-08-02', 'spend', null, (select id from categories where user_id = tests.get_supabase_uid('u1@test.com') and type='spend' and name='food'), 50.00, array['groceries','fun'], 'U1 B', 'Bank B'),
    (gen_random_uuid(), tests.get_supabase_uid('u1@test.com'), '2025-08-03', 'earn',  null, (select id from categories where user_id = tests.get_supabase_uid('u1@test.com') and type='earn' and name='salary'), 1000.00, array['salary'], 'U1 C', 'Bank A'),
    (gen_random_uuid(), tests.get_supabase_uid('u1@test.com'), '2025-07-10', 'spend', null, (select id from categories where user_id = tests.get_supabase_uid('u1@test.com') and type='spend' and name='food'), 20.00, array['misc'], 'U1 D', 'Bank A'),

    (gen_random_uuid(), tests.get_supabase_uid('u2@test.com'), '2025-08-01', 'spend', null, (select id from categories where user_id = tests.get_supabase_uid('u2@test.com') and type='spend' and name='food'), 70.00, array['groceries'], 'U2 A', 'Bank A'),
    (gen_random_uuid(), tests.get_supabase_uid('u2@test.com'), '2025-08-02', 'spend', null, (select id from categories where user_id = tests.get_supabase_uid('u2@test.com') and type='spend' and name='food'), 30.00, null, 'U2 B', 'Bank A');

-- Authenticate as user 1
select tests.authenticate_as('u1@test.com');

-- 1) August 2025 spend total for user1
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, null, null, null),
  150.00::numeric,
  'v2: returns 150 for user1 August 2025 spend'
);

-- 2) Filter by bank account (Bank A) in August 2025
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, 'Bank A', null, null),
  100.00::numeric,
  'v2: filters by bank account Bank A'
);

-- 3) tagsAny: fun in August 2025
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, null, array['fun'], null),
  50.00::numeric,
  'v2: filters by tagsAny fun'
);

-- 4) tagsAll: groceries & fun in August 2025
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, null, null, array['groceries','fun']),
  50.00::numeric,
  'v2: filters by tagsAll groceries+fun'
);

-- 5) Filter by category_id for food in August 2025
select is(
  public.sum_transactions_amount(
    '2025-08-01', '2025-08-31', 'spend',
    (select id from categories where user_id = tests.get_supabase_uid('u1@test.com') and type='spend' and name='food'),
    null, null, null
  ),
  150.00::numeric,
  'v2: filters by category_id food'
);

-- 6) July 2025 spend only
select is(
  public.sum_transactions_amount('2025-07-01', '2025-07-31', 'spend', null, null, null, null),
  20.00::numeric,
  'v2: July 2025 spend 20 for user1'
);

-- 7) All-time spend for user1 (null dates)
select is(
  public.sum_transactions_amount(null, null, 'spend', null, null, null, null),
  170.00::numeric,
  'v2: all-time spend 170 for user1'
);

-- 8) No matches case (spend with tag salary)
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, null, array['salary'], null),
  0.00::numeric,
  'v2: returns 0 when no matching rows (salary tag with spend)'
);

-- 9) RLS isolation: authenticate as user2, August 2025 spend
select tests.authenticate_as('u2@test.com');
select is(
  public.sum_transactions_amount('2025-08-01', '2025-08-31', 'spend', null, null, null, null),
  100.00::numeric,
  'v2: returns 100 for user2 August 2025 spend under RLS'
);

select * from finish();
rollback;
