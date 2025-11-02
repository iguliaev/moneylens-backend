-- 014_tags_usage_and_rpc.sql
-- View tags_with_usage and delete_tag_safe RPC

create or replace view public.tags_with_usage
with (security_invoker = true) as
select
  g.id,
  g.user_id,
  g.name,
  g.description,
  g.created_at,
  g.updated_at,
  coalesce(u.cnt, 0)::bigint as in_use_count
from public.tags g
left join (
  select tr.user_id, x.tag, count(*)::bigint as cnt
  from public.transactions tr
  cross join lateral unnest(tr.tags) as x(tag)
  group by tr.user_id, x.tag
) u
  on u.user_id = g.user_id
 and u.tag = g.name;

comment on view public.tags_with_usage is 'Per-user tags with reference counts from transactions (in_use_count).';

-- Delete tag only when not used by any transaction of the current user
create or replace function public.delete_tag_safe(p_tag_id uuid)
returns table(ok boolean, in_use_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_in_use_count bigint;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select name into v_name
  from public.tags
  where id = p_tag_id and user_id = v_uid;

  if v_name is null then
    raise exception 'Tag not found' using errcode = 'P0002';
  end if;

  select count(*)::bigint into v_in_use_count
  from public.transactions tr
  where tr.user_id = v_uid
    and array_position(tr.tags, v_name) is not null;

  if v_in_use_count > 0 then
    return query select false as ok, v_in_use_count as in_use_count;
  end if;

  delete from public.tags where id = p_tag_id and user_id = v_uid;
  return query select true as ok, 0::bigint as in_use_count;
end;
$$;

grant execute on function public.delete_tag_safe(uuid) to authenticated;
