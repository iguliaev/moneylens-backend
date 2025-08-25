-- Safe delete function for categories
-- Allows deletion only when the category is not referenced by any transactions
-- Returns ok=false and the referencing count instead of raising a foreign key error

create or replace function public.delete_category_safe(p_category_id uuid)
returns table(ok boolean, in_use_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  -- Ensure caller is authenticated
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Ensure the category exists and belongs to the caller
  if not exists (
    select 1 from public.categories c where c.id = p_category_id and c.user_id = v_uid
  ) then
    raise exception 'Category not found' using errcode = 'P0002';
  end if;

  -- Count references
  select count(*) into in_use_count
  from public.transactions t
  where t.category_id = p_category_id and t.user_id = v_uid;

  if in_use_count > 0 then
    ok := false;
    return;
  end if;

  -- Not referenced: delete it
  delete from public.categories c where c.id = p_category_id and c.user_id = v_uid;
  ok := true;
  in_use_count := 0;
  return;
end;
$$;

grant execute on function public.delete_category_safe(uuid) to authenticated;
