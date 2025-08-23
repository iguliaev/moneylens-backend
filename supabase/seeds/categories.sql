-- Seed data for categories table
-- Example user
WITH user_row AS (
  SELECT id AS user_id FROM auth.users WHERE email = 'user@example.com'
)
INSERT INTO categories (id, user_id, type, name, description, created_at, updated_at)
VALUES
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'spend', 'food', 'Food & groceries', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'earn', 'salary', 'Salary income', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'spend', 'entertainment', 'Movies, concerts, etc.', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'spend', 'transport', 'Transport & commuting', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'spend', 'health', 'Healthcare expenses', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'save', 'investment', 'Investments & savings', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'earn', 'gift', 'Gift income', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'spend', 'shopping', 'Shopping & retail', now(), now());
