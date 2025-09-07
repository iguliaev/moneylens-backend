-- 011_bank_accounts_usage_and_rpc.sql
-- View bank_accounts_with_usage and delete_bank_account_safe RPC

create or replace view public.bank_accounts_with_usage as
select
  b.id,
  b.user_id,
  b.name,
  b.description,
  b.created_at,
  b.updated_at,
  coalesce(u.cnt, 0)::bigint as in_use_count
from public.bank_accounts b
left join (
  select user_id, bank_account_id, count(*)::bigint as cnt
  from public.transactions
  where bank_account_id is not null
  group by user_id, bank_account_id
) u
  on u.user_id = b.user_id
 and u.bank_account_id = b.id;

comment on view public.bank_accounts_with_usage is 'Per-user bank accounts with reference counts from transactions (in_use_count).';

create or replace function public.delete_bank_account_safe(p_bank_account_id uuid)
returns table(ok boolean, in_use_count bigint)
 language plpgsql
 set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.bank_accounts b where b.id = p_bank_account_id and b.user_id = v_uid
  ) then
    raise exception 'Bank account not found' using errcode = 'P0002';
  end if;

  select count(*) into in_use_count
  from public.transactions t
  where t.bank_account_id = p_bank_account_id and t.user_id = v_uid;

  if in_use_count > 0 then
    -- Emit a single row indicating it's in use
    return query select false::boolean as ok, in_use_count::bigint;
    return;
  end if;

  delete from public.bank_accounts b where b.id = p_bank_account_id and b.user_id = v_uid;
  -- Emit success row
  return query select true::boolean as ok, 0::bigint as in_use_count;
  return;
end;
$$;

grant execute on function public.delete_bank_account_safe(uuid) to authenticated;
