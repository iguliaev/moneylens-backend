-- 016_bulk_upload_entities_test.sql
-- Unit tests for insert_categories(p_user_id uuid, p_categories jsonb)
-- Use pgtap and test helpers for user creation/authentication

begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- Create test users
select tests.create_supabase_user('user1@test.com');
select tests.create_supabase_user('user2@test.com');
select tests.create_supabase_user('user3@test.com');
select tests.create_supabase_user('user4@test.com');
select tests.create_supabase_user('user5@test.com');
select tests.create_supabase_user('user6@test.com');
select tests.create_supabase_user('user7@test.com');
select tests.create_supabase_user('user8@test.com');
select tests.create_supabase_user('user9@test.com');
select tests.create_supabase_user('user10@test.com');
select tests.create_supabase_user('user11@test.com');
select tests.create_supabase_user('user12@test.com');
select tests.create_supabase_user('user13@test.com');
select tests.create_supabase_user('user14@test.com');

-- Authenticate as user1 when helpful (not required for insert_categories which uses explicit user_id)
select tests.authenticate_as('user1@test.com');

-- Test 1: Insert New Categories
SELECT insert_categories(tests.get_supabase_uid('user1@test.com'),
  '[
    {"type": "spend", "name": "Groceries", "description": "Food"},
    {"type": "earn", "name": "Salary", "description": null},
    {"type": "save", "name": "Emergency", "description": "Rainy day"}
  ]'::jsonb);

SELECT is(
  (SELECT COUNT(*) FROM categories WHERE user_id = tests.get_supabase_uid('user1@test.com')),
  3::bigint,
  'Insert New Categories: 3 rows inserted'
);

-- Test 2: Skip Duplicate Categories
select tests.authenticate_as('user2@test.com');
SELECT insert_categories(tests.get_supabase_uid('user2@test.com'), '[{"type":"spend","name":"Groceries","description":"Food"}]'::jsonb);
SELECT insert_categories(tests.get_supabase_uid('user2@test.com'), '[{"type":"spend","name":"Groceries","description":"Food"}]'::jsonb);

SELECT is(
  (SELECT COUNT(*) FROM categories WHERE user_id = tests.get_supabase_uid('user2@test.com') AND name = 'Groceries'),
  1::bigint,
  'Skip Duplicate Categories: duplicates are not created'
);

-- Test 3: Missing Required Field - name (should raise)
select tests.authenticate_as('user3@test.com');
SELECT throws_like(
  $$ SELECT insert_categories(tests.get_supabase_uid('user3@test.com'), '[{"type":"spend","description":"no name"}]'::jsonb) $$,
  '%missing required fields%',
  'Missing name should raise a validation error'
);

-- Test 4: Missing Required Field - type (should raise)
select tests.authenticate_as('user4@test.com');
SELECT throws_like(
  $$ SELECT insert_categories(tests.get_supabase_uid('user4@test.com'), '[{"name":"NoType","description":"no type"}]'::jsonb) $$,
  '%missing required fields%',
  'Missing type should raise a validation error'
);

-- Test 5: Invalid Type Enum (should raise and mention the invalid value)
select tests.authenticate_as('user5@test.com');
SELECT throws_like(
  $$ SELECT insert_categories(tests.get_supabase_uid('user5@test.com'), '[{"type":"invalid","name":"BadType","description":null}]'::jsonb) $$,
  '%invalid transaction_type%',
  'Invalid enum value should raise invalid transaction_type error'
);

-- Test 6: NULL Description Handling
select tests.authenticate_as('user6@test.com');
SELECT insert_categories(tests.get_supabase_uid('user6@test.com'), '[{"type":"spend","name":"NullDesc","description": null}]'::jsonb);

SELECT ok(
  (SELECT description IS NULL FROM categories WHERE user_id = tests.get_supabase_uid('user6@test.com') AND name = 'NullDesc'),
  'NULL description handled correctly'
);

-- continue with other tests below; finish/rollback will be at end

-- Unit tests for insert_bank_accounts(p_user_id uuid, p_bank_accounts jsonb)

-- Test 7: Insert New Bank Accounts
select tests.authenticate_as('user7@test.com');
SELECT insert_bank_accounts(tests.get_supabase_uid('user7@test.com'),
  '[
    {"name": "Monzo", "description": "Monzo Current Account"},
    {"name": "Revolut", "description": null}
  ]'::jsonb);

SELECT is(
  (SELECT COUNT(*) FROM bank_accounts WHERE user_id = tests.get_supabase_uid('user7@test.com')),
  2::bigint,
  'Insert New Bank Accounts: 2 rows inserted'
);

-- Test 8: Skip Duplicate Bank Accounts
select tests.authenticate_as('user8@test.com');
SELECT insert_bank_accounts(tests.get_supabase_uid('user8@test.com'), '[{"name":"Monzo","description":"Monzo Current Account"}]'::jsonb);
SELECT insert_bank_accounts(tests.get_supabase_uid('user8@test.com'), '[{"name":"Monzo","description":"Monzo Current Account"}]'::jsonb);

SELECT is(
  (SELECT COUNT(*) FROM bank_accounts WHERE user_id = tests.get_supabase_uid('user8@test.com') AND name = 'Monzo'),
  1::bigint,
  'Skip Duplicate Bank Accounts: duplicates are not created'
);

-- Test 9: Missing Required Field - name (should raise)
select tests.authenticate_as('user9@test.com');
SELECT throws_like(
  $$ SELECT insert_bank_accounts(tests.get_supabase_uid('user9@test.com'), '[{"description":"no name"}]'::jsonb) $$,
  '%missing required field%',
  'Missing name should raise a validation error for bank accounts'
);

-- Test 10: NULL Description Handling
select tests.authenticate_as('user10@test.com');
SELECT insert_bank_accounts(tests.get_supabase_uid('user10@test.com'), '[{"name":"NullDescAccount","description": null}]'::jsonb);

SELECT ok(
  (SELECT description IS NULL FROM bank_accounts WHERE user_id = tests.get_supabase_uid('user10@test.com') AND name = 'NullDescAccount'),
  'NULL description handled correctly for bank accounts'
);

-- Unit tests for insert_tags(p_user_id uuid, p_tags jsonb)

-- Test 11: Insert New Tags
select tests.authenticate_as('user11@test.com');
SELECT insert_tags(tests.get_supabase_uid('user11@test.com'),
  '[
    {"name": "essentials", "description": "Essential expenses"},
    {"name": "monthly", "description": null},
    {"name": "one-off", "description": "One-off purchases"}
  ]'::jsonb);

SELECT is(
  (SELECT COUNT(*) FROM tags WHERE user_id = tests.get_supabase_uid('user11@test.com')),
  3::bigint,
  'Insert New Tags: 3 rows inserted'
);

-- Test 12: Skip Duplicate Tags
select tests.authenticate_as('user12@test.com');
SELECT insert_tags(tests.get_supabase_uid('user12@test.com'), '[{"name":"essentials","description":"Essential expenses"}]'::jsonb);
SELECT insert_tags(tests.get_supabase_uid('user12@test.com'), '[{"name":"essentials","description":"Essential expenses"}]'::jsonb);

SELECT is(
  (SELECT COUNT(*) FROM tags WHERE user_id = tests.get_supabase_uid('user12@test.com') AND name = 'essentials'),
  1::bigint,
  'Skip Duplicate Tags: duplicates are not created'
);

-- Test 13: Missing Required Field - name (should raise)
select tests.authenticate_as('user13@test.com');
SELECT throws_like(
  $$ SELECT insert_tags(tests.get_supabase_uid('user13@test.com'), '[{"description":"no name"}]'::jsonb) $$,
  '%missing required field%',
  'Missing name should raise a validation error for tags'
);

-- Test 14: NULL Description Handling
select tests.authenticate_as('user14@test.com');
SELECT insert_tags(tests.get_supabase_uid('user14@test.com'), '[{"name":"NullDescTag","description": null}]'::jsonb);

SELECT ok(
  (SELECT description IS NULL FROM tags WHERE user_id = tests.get_supabase_uid('user14@test.com') AND name = 'NullDescTag'),
  'NULL description handled correctly for tags'
);

select * from finish();
rollback;
