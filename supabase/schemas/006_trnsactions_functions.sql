-- Sum filtered transactions amount by category_id (RLS-aware)
-- New RPC that prefers category_id over legacy text category.
create or replace function public.sum_transactions_amount(
  p_from date default null,
  p_to date default null,
  p_type public.transaction_type default null,
  p_category_id uuid default null,
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
    and (p_category_id is null or t.category_id = p_category_id)
    and (p_bank_account is null or t.bank_account = p_bank_account)
    and (p_tags_any is null or t.tags && p_tags_any)
    and (p_tags_all is null or t.tags @> p_tags_all);
$$;

-- Permissions
grant execute on function public.sum_transactions_amount(date, date, public.transaction_type, uuid, text, text[], text[]) to authenticated;
