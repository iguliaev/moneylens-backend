-- Seed data for categories table
-- Example user
WITH user_row AS (
  SELECT id AS user_id FROM auth.users WHERE email = 'user@example.com'
)
INSERT INTO categories (id, user_id, type, name, description, created_at, updated_at)
VALUES
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'earn'::transaction_type, 'gift', 'Gift income', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'earn'::transaction_type, 'salary', 'Salary income', now(), now()),

  (gen_random_uuid(), (SELECT user_id FROM user_row), 'spend'::transaction_type, 'entertainment', 'Movies, concerts, etc.', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'spend'::transaction_type, 'transport', 'Transport & commuting', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'spend'::transaction_type, 'health', 'Healthcare expenses', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'spend'::transaction_type, 'food', 'Food & groceries', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'spend'::transaction_type, 'shopping', 'Shopping & retail', now(), now()),

  (gen_random_uuid(), (SELECT user_id FROM user_row), 'save'::transaction_type, 'investment', 'Investments & savings', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'save'::transaction_type, 'retirement', 'Retirement savings', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'save'::transaction_type, 'vacation', 'Vacation & travel', now(), now());

