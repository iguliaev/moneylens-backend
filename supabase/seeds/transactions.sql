
-- Seed transactions for 'spend' type
INSERT INTO transactions (id, user_id, date, type, category_id, amount, tags, notes, bank_account)
SELECT
  uuid_generate_v4(),
  u.id,
  CURRENT_DATE - (random() * 365)::int,
  'spend'::transaction_type,
  c.id,
  round((random() * 1000 + 10)::numeric, 2),
  ARRAY[(ARRAY['groceries', 'movie', 'bus', 'doctor', 'clothes'])[floor(random() * 5 + 1)]],
  'Sample spend note ' || gs,
  (ARRAY['Chase', 'Bank of America', 'Wells Fargo', 'Ally', 'Capital One', 'Revolut', 'Monzo', 'Wise'])[floor(random() * 8 + 1)]
FROM generate_series(1,33) gs
JOIN auth.users u ON u.email = 'user@example.com'
JOIN categories c ON c.user_id = u.id AND c.type = 'spend'::transaction_type
ORDER BY random() LIMIT 33;

-- Seed transactions for 'earn' type
INSERT INTO transactions (id, user_id, date, type, category_id, amount, tags, notes, bank_account)
SELECT
  uuid_generate_v4(),
  u.id,
  CURRENT_DATE - (random() * 365)::int,
  'earn'::transaction_type,
  c.id,
  round((random() * 1000 + 100)::numeric, 2),
  ARRAY[(ARRAY['salary', 'bonus', 'gift'])[floor(random() * 3 + 1)]],
  'Sample earn note ' || gs,
  (ARRAY['Chase', 'Bank of America', 'Wells Fargo', 'Ally', 'Capital One', 'Revolut', 'Monzo', 'Wise'])[floor(random() * 8 + 1)]
FROM generate_series(1,33) gs
JOIN auth.users u ON u.email = 'user@example.com'
JOIN categories c ON c.user_id = u.id AND c.type = 'earn'::transaction_type
ORDER BY random() LIMIT 33;

-- Seed transactions for 'save' type
INSERT INTO transactions (id, user_id, date, type, category_id, amount, tags, notes, bank_account)
SELECT
  uuid_generate_v4(),
  u.id,
  CURRENT_DATE - (random() * 365)::int,
  'save'::transaction_type,
  c.id,
  round((random() * 1000 + 50)::numeric, 2),
  ARRAY[(ARRAY['investment', 'retirement', 'vacation'])[floor(random() * 3 + 1)]],
  'Sample save note ' || gs,
  (ARRAY['Chase', 'Bank of America', 'Wells Fargo', 'Ally', 'Capital One', 'Revolut', 'Monzo', 'Wise'])[floor(random() * 8 + 1)]
FROM generate_series(1,34) gs
JOIN auth.users u ON u.email = 'user@example.com'
JOIN categories c ON c.user_id = u.id AND c.type = 'save'::transaction_type
ORDER BY random() LIMIT 34;
