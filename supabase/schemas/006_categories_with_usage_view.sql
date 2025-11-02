-- View: categories_with_usage
-- Exposes per-user usage counts (number of transactions referencing each category)

create or replace view public.categories_with_usage
with (security_invoker = true) as
select
  c.id,
  c.user_id,
  c.type,
  c.name,
  c.description,
  c.created_at,
  c.updated_at,
  coalesce(u.cnt, 0)::bigint as in_use_count
from public.categories c
left join (
  select user_id, category_id, count(*)::bigint as cnt
  from public.transactions
  where category_id is not null
  group by user_id, category_id
) u
  on u.user_id = c.user_id
 and u.category_id = c.id;

comment on view public.categories_with_usage is 'Per-user categories with reference counts from transactions (in_use_count).';
