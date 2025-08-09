
-- ============================================================================
-- View: view_monthly_totals
-- Description:
--   Aggregates transaction amounts by month and type.
--   For each month and transaction type, calculates the total sum of amounts.
--
-- Columns:
--   month   - The first day of the month (timestamp) representing the aggregation period.
--   type    - The type/category of the transaction (e.g., 'income', 'expense').
--   total   - The total sum of transaction amounts for the given month and type.
--
-- Example Query:
--   SELECT * FROM view_monthly_totals
--   WHERE month >= date_trunc('month', CURRENT_DATE) - INTERVAL '6 months'
--   ORDER BY month DESC, type;
-- ============================================================================
CREATE OR REPLACE VIEW view_monthly_totals AS
SELECT
  date_trunc('month', date) AS month,
  type,
  SUM(amount) AS total
FROM transactions
GROUP BY month, type
ORDER BY month DESC, type;


-- ============================================
-- View: view_yearly_totals
-- Description:
--   Aggregates transaction amounts by year and type.
--   For each year and transaction type, calculates the total amount.
--
-- Columns:
--   year   - The year extracted from the transaction date (timestamp).
--   type   - The type/category of the transaction.
--   total  - The sum of amounts for the given year and type.
--
-- Example Query:
--   SELECT year, type, total
--   FROM view_yearly_totals
--   WHERE year = date_trunc('year', CURRENT_DATE)
--   ORDER BY type;
-- ============================================
CREATE OR REPLACE VIEW view_yearly_totals AS
SELECT
  date_trunc('year', date) AS year,
  type,
  SUM(amount) AS total
FROM transactions
GROUP BY year, type
ORDER BY year DESC, type;


-- ============================================================================
-- View: view_current_month_category_totals
-- Description:
--   Aggregates transaction amounts by category and type for the current month.
--   For each category and transaction type, calculates the total sum of amounts
--   for transactions occurring in the current month.
--
-- Columns:
--   category - The category of the transaction.
--   type     - The type/category of the transaction (e.g., 'income', 'expense').
--   total    - The total sum of transaction amounts for the given category and type in the current month.
--
-- Example Query:
--   SELECT category, type, total
--   FROM view_current_month_category_totals
--   WHERE type = 'expense'
--   ORDER BY total DESC;
-- ============================================================================
CREATE OR REPLACE VIEW view_current_month_category_totals AS
SELECT
  category,
  type,
  SUM(amount) AS total
FROM transactions
WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
GROUP BY category, type
ORDER BY total DESC;

-- ============================================================================
-- View: view_current_year_category_totals
-- Description:
--   Aggregates transaction amounts by category and type for the current year.
--   For each category and transaction type, calculates the total sum of amounts
--   for transactions occurring in the current year.
--
-- Columns:
--   category - The category of the transaction.
--   type     - The type/category of the transaction (e.g., 'income', 'expense').
--   total    - The total sum of transaction amounts for the given category and type in the current year.
--
-- Example Query:
--   SELECT category, type, total
--   FROM view_current_year_category_totals
--   WHERE type = 'expense'
--   ORDER BY total DESC;
-- ============================================================================
CREATE OR REPLACE VIEW view_current_year_category_totals AS
SELECT
  category,
  type,
  SUM(amount) AS total
FROM transactions
WHERE date_trunc('year', date) = date_trunc('year', CURRENT_DATE)
GROUP BY category, type
ORDER BY total DESC;
