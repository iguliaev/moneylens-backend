-- 016_bulk_upload_entities_test.sql
-- Unit tests for insert_categories(p_user_id uuid, p_categories jsonb)
-- Use pgtap and test helpers for user creation/authentication

begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- Create test users
select tests.create_supabase_user('user1@test.com');
select tests.create_supabase_user('user2@test.com');
select tests.create_supabase_user('user3@test.com');
select tests.create_supabase_user('user4@test.com');
select tests.create_supabase_user('user5@test.com');
select tests.create_supabase_user('user6@test.com');

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

select * from finish();
rollback;
