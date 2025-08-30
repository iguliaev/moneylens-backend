-- Seed data for bank_accounts table
-- Example user
WITH user_row AS (
  SELECT id AS user_id FROM auth.users WHERE email = 'user@example.com'
)
INSERT INTO bank_accounts (id, user_id, name, description, created_at, updated_at)
VALUES
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'Chase', 'Chase Bank', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'Bank of America', 'Bank of America', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'Wells Fargo', 'Wells Fargo', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'Ally', 'Ally', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'Capital One', 'Capital One', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'Revolut', 'Revolut', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'Monzo', 'Monzo', now(), now()),
  (gen_random_uuid(), (SELECT user_id FROM user_row), 'Wise', 'Wise', now(), now());
