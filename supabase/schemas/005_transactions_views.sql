-- Views for spendings, earnings, and savings (using enum comparison)
CREATE OR REPLACE VIEW transactions_spend AS
SELECT * FROM transactions WHERE type = 'spend'::transaction_type;

CREATE OR REPLACE VIEW transactions_earn AS
SELECT * FROM transactions WHERE type = 'earn'::transaction_type;

CREATE OR REPLACE VIEW transactions_save AS
SELECT * FROM transactions WHERE type = 'save'::transaction_type;

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
AS SELECT
  user_id,
  date_trunc('month', date) AS month,
  category,
  type,
  SUM(amount) AS total
FROM transactions
GROUP BY user_id, month, category, type
ORDER BY user_id, month DESC, category, type;
-- ============================================================================
CREATE OR REPLACE VIEW view_yearly_category_totals
WITH(security_invoker = true)
AS SELECT
  user_id,
  date_trunc('year', date) AS year,
  category,
  type,
  SUM(amount) AS total
FROM transactions
GROUP BY user_id, year, category, type
ORDER BY user_id, year DESC, category, type;
-- ============================================================================
CREATE OR REPLACE VIEW view_monthly_tagged_type_totals
WITH(security_invoker = true)
AS SELECT
  user_id,
  date_trunc('month', date) AS month,
  type,
  tags,
  SUM(amount) AS total
FROM transactions
GROUP BY user_id, month, type, tags;

-- ============================================================================
CREATE OR REPLACE VIEW view_yearly_tagged_type_totals
WITH(security_invoker = true)
AS SELECT
  user_id,
  date_trunc('year', date) AS year,
  type,
  tags,
  SUM(amount) AS total
FROM transactions
GROUP BY user_id, year, type, tags;

-- ============================================================================
CREATE OR REPLACE VIEW view_tagged_type_totals
WITH(security_invoker = true)
AS SELECT
  user_id,
  type,
  tags,
  SUM(amount) AS total
FROM transactions
GROUP BY user_id, type, tags;