-- Views for spendings, earnings, and savings (using enum comparison)
CREATE OR REPLACE VIEW transactions_spend
WITH(security_invoker = true) AS
SELECT
  t.id,
  t.user_id,
  t.date,
  t.type,
  t.category_id,
  COALESCE(t.category, c.name) AS category,
  t.bank_account_id,
  COALESCE(t.bank_account, b.name) AS bank_account,
  t.amount,
  t.tags,
  t.notes,
  t.created_at,
  t.updated_at
FROM transactions t
LEFT JOIN bank_accounts b ON t.bank_account_id = b.id
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.type = 'spend'::transaction_type;

CREATE OR REPLACE VIEW transactions_earn
WITH(security_invoker = true) AS
SELECT
  t.id,
  t.user_id,
  t.date,
  t.type,
  t.category_id,
  COALESCE(t.category, c.name) AS category,
  t.bank_account_id,
  COALESCE(t.bank_account, b.name) AS bank_account,
  t.amount,
  t.tags,
  t.notes,
  t.created_at,
  t.updated_at
FROM transactions t
LEFT JOIN bank_accounts b ON t.bank_account_id = b.id
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.type = 'earn'::transaction_type;

CREATE OR REPLACE VIEW transactions_save
WITH(security_invoker = true) AS
SELECT
  t.id,
  t.user_id,
  t.date,
  t.type,
  t.category_id,
  COALESCE(t.category, c.name) AS category,
  t.bank_account_id,
  COALESCE(t.bank_account, b.name) AS bank_account,
  t.amount,
  t.tags,
  t.notes,
  t.created_at,
  t.updated_at
FROM transactions t
LEFT JOIN bank_accounts b ON t.bank_account_id = b.id
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.type = 'save'::transaction_type;

-- ============================================================================
CREATE OR REPLACE VIEW view_monthly_totals
WITH(security_invoker = true)
AS SELECT
  user_id,
  date_trunc('month', date) AS month,
  type,
  SUM(amount) AS total
FROM transactions
GROUP BY user_id, month, type
ORDER BY user_id, month DESC, type;

-- ============================================
CREATE OR REPLACE VIEW view_yearly_totals
WITH(security_invoker = true)
AS SELECT
  user_id,
  date_trunc('year', date) AS year,
  type,
  SUM(amount) AS total
FROM transactions
GROUP BY user_id, year, type
ORDER BY user_id, year DESC, type;

-- ============================================================================
CREATE OR REPLACE VIEW view_monthly_category_totals
WITH(security_invoker = true)
AS
SELECT
  t.user_id,
  date_trunc('month', t.date) AS month,
  c.name AS category,
  t.type,
  SUM(t.amount) AS total
FROM transactions t
JOIN categories c ON t.category_id = c.id
GROUP BY t.user_id, date_trunc('month', t.date), c.name, t.type
ORDER BY t.user_id, month DESC, category, t.type;
-- ============================================================================
CREATE OR REPLACE VIEW view_yearly_category_totals
WITH(security_invoker = true)
AS
SELECT
  t.user_id,
  date_trunc('year', t.date) AS year,
  c.name AS category,
  t.type,
  SUM(t.amount) AS total
FROM transactions t
JOIN categories c ON t.category_id = c.id
GROUP BY t.user_id, date_trunc('year', t.date), c.name, t.type
ORDER BY t.user_id, year DESC, category, t.type;
-- ============================================================================
CREATE OR REPLACE VIEW view_monthly_tagged_type_totals
WITH(security_invoker = true)
AS WITH transaction_tags_array AS (
  SELECT
    t.id,
    t.user_id,
    t.date,
    t.type,
    t.amount,
    array_remove(array_agg(DISTINCT tg.name ORDER BY tg.name), NULL) AS tags
  FROM transactions t
  LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
  LEFT JOIN tags tg ON tt.tag_id = tg.id
  GROUP BY t.id, t.user_id, t.date, t.type, t.amount
)
SELECT
  user_id,
  date_trunc('month', date) AS month,
  type,
  tags,
  SUM(amount) AS total
FROM transaction_tags_array
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
GROUP BY user_id, date_trunc('month', date), type, tags;

-- ============================================================================
CREATE OR REPLACE VIEW view_yearly_tagged_type_totals
WITH(security_invoker = true)
AS WITH transaction_tags_array AS (
  SELECT
    t.id,
    t.user_id,
    t.date,
    t.type,
    t.amount,
    array_remove(array_agg(DISTINCT tg.name ORDER BY tg.name), NULL) AS tags
  FROM transactions t
  LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
  LEFT JOIN tags tg ON tt.tag_id = tg.id
  GROUP BY t.id, t.user_id, t.date, t.type, t.amount
)
SELECT
  user_id,
  date_trunc('year', date) AS year,
  type,
  tags,
  SUM(amount) AS total
FROM transaction_tags_array
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
GROUP BY user_id, date_trunc('year', date), type, tags;

-- ============================================================================
CREATE OR REPLACE VIEW view_tagged_type_totals
WITH(security_invoker = true)
AS WITH transaction_tags_array AS (
  SELECT
    t.id,
    t.user_id,
    t.type,
    t.amount,
    array_remove(array_agg(DISTINCT tg.name ORDER BY tg.name), NULL) AS tags
  FROM transactions t
  LEFT JOIN transaction_tags tt ON t.id = tt.transaction_id
  LEFT JOIN tags tg ON tt.tag_id = tg.id
  GROUP BY t.id, t.user_id, t.type, t.amount
)
SELECT
  user_id,
  type,
  tags,
  SUM(amount) AS total
FROM transaction_tags_array
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
GROUP BY user_id, type, tags;