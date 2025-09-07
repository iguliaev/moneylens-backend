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
set search_path = ''
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

-- Enforce that all tags used on a transaction exist in the user's tags dictionary
create or replace function public.enforce_known_tags()
returns trigger
language plpgsql
-- Harden search_path: restrict to ""; table refs are schema-qualified.
set search_path = ''
as $$
declare
  missing text;
begin
  -- Allow null or empty arrays
  if new.tags is null or array_length(new.tags, 1) is null then
    return new;
  end if;

  select t.tag into missing
  from unnest(new.tags) as t(tag)
  where not exists (
    select 1 from public.tags g
    where g.user_id = coalesce(auth.uid(), new.user_id) and g.name = t.tag
  )
  limit 1;

  if missing is not null then
    raise exception 'Unknown tag for this user: %', missing using errcode = '23514';
  end if;

  return new;
end$$;

drop trigger if exists enforce_known_tags_trg on public.transactions;
create trigger enforce_known_tags_trg
before insert or update on public.transactions
for each row execute function public.enforce_known_tags();
