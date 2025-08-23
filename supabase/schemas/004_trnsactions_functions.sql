-- Sum filtered transactions amount (RLS-aware)
-- Computes total for current user (due to RLS) matching optional filters.
create or replace function public.sum_transactions_amount(
  p_from date default null,
  p_to date default null,
  p_type public.transaction_type default null,
  p_category text default null,
  p_bank_account text default null,
  p_tags_any text[] default null,
  p_tags_all text[] default null
) returns numeric
language sql
stable
as $$
  select coalesce(sum(t.amount), 0)::numeric
  from public.transactions t
  where (p_from is null or t.date >= p_from)
    and (p_to is null or t.date <= p_to)
    and (p_type is null or t.type = p_type)
    and (p_category is null or t.category = p_category)
    and (p_bank_account is null or t.bank_account = p_bank_account)
    and (p_tags_any is null or t.tags && p_tags_any)
    and (p_tags_all is null or t.tags @> p_tags_all);
$$;

-- Permissions: allow authenticated users to execute
grant execute on function public.sum_transactions_amount(date, date, public.transaction_type, text, text, text[], text[]) to authenticated;
