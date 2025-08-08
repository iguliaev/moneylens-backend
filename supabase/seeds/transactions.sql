INSERT INTO transactions (id, date, type, category, amount, tags, notes)
SELECT
  uuid_generate_v4(),
  CURRENT_DATE - (random() * 365)::int,
  (ARRAY['earn', 'spend', 'save'])[floor(random() * 3 + 1)],
  (ARRAY['food', 'salary', 'entertainment', 'transport', 'health', 'investment', 'gift', 'shopping'])[floor(random() * 8 + 1)],
  round((random() * 1000 + 10)::numeric, 2),
  ARRAY[
    (ARRAY['groceries', 'bonus', 'movie', 'bus', 'doctor', 'stocks', 'birthday', 'clothes'])[floor(random() * 8 + 1)]
  ],
  'Sample note ' || (generate_series(1,100))
FROM generate_series(1,100);
