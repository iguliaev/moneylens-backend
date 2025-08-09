CREATE OR REPLACE VIEW view_monthly_totals AS
SELECT
  date_trunc('month', date) AS month,
  type,
  SUM(amount) AS total
FROM transactions
GROUP BY month, type
ORDER BY month DESC, type;


CREATE OR REPLACE VIEW view_yearly_totals AS
SELECT
  date_trunc('year', date) AS year,
  type,
  SUM(amount) AS total
FROM transactions
GROUP BY year, type
ORDER BY year DESC, type;