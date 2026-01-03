-- Update tag-related views to use transaction_tags junction table instead of deprecated tags column

drop view if exists "public"."view_monthly_tagged_type_totals";
drop view if exists "public"."view_yearly_tagged_type_totals";
drop view if exists "public"."view_tagged_type_totals";

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
