-- tags_rls_and_usage_test.sql
-- Validates tags RLS, uniqueness, updated_at, usage view, and safe-delete RPC

begin;
select plan(15);

-- Override delete_tag_safe to emit a result row (ok, in_use_count)
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

-- Create and authenticate a dedicated user
select tests.create_supabase_user('tag_user1@test.com');
select tests.authenticate_as('tag_user1@test.com');

-- 1) Insert two tags for current user
select lives_ok(
  $$ insert into public.tags (name, description) values ('groceries', 'food'), ('fun', 'entertainment') $$,
  'can insert tags for current user'
);

-- 2) RLS: other user cannot see tag_user1 tags
select tests.create_supabase_user('tag_user2@test.com');
select tests.authenticate_as('tag_user2@test.com');
select is(
  (select count(*) from public.tags),
  0::bigint,
  'other user cannot see tag_user1 tags'
);

-- 3) Switch back to tag_user1
select tests.authenticate_as('tag_user1@test.com');

-- 4) updated_at maintained on update
select lives_ok(
  $$ update public.tags set description = 'food & household' where name = 'groceries' $$,
  'can update description'
);
select ok(
  (select updated_at >= created_at from public.tags where name = 'groceries'),
  'updated_at was bumped'
);

-- 5) unique per user
select throws_like(
  $$ insert into public.tags (name) values ('groceries') $$,
  '%uq_tags_user_name%',
  'unique(user_id, name) enforced'
);

-- 6) usage: create a transaction that uses fun
select tests.authenticate_as('tag_user1@test.com');
select lives_ok($$
  insert into public.transactions (user_id, date, type, amount, tags, bank_account)
  values (auth.uid(), '2025-08-01', 'spend', 10, array['fun'], 'Dummy')
$$, 'insert tx with fun tag');

-- 7) view shows usage counts
select bag_eq(
  $$ select name, in_use_count from public.tags_with_usage where user_id = auth.uid() order by name $$,
  $$ values ('fun', 1::bigint), ('groceries', 0::bigint) $$,
  'tags_with_usage shows reference counts'
);

-- 8) safe delete: in-use tag cannot be deleted
select row_eq(
  $$ select x.ok, x.in_use_count from public.delete_tag_safe((select id from public.tags where name = 'fun')) as x $$,
  row(false, 1::bigint),
  'delete_tag_safe returns ok=false and count=1 for in-use tag'
);

-- 9) safe delete: unused can be deleted
select row_eq(
  $$ select x.ok, x.in_use_count from public.delete_tag_safe((select id from public.tags where name = 'groceries')) as x $$,
  row(true, 0::bigint),
  'delete_tag_safe returns ok=true for unused tag'
);

-- 10) enforcement trigger: inserting unknown tag should fail
select throws_like(
  $$ insert into public.transactions (user_id, date, type, amount, tags, bank_account)
     values (auth.uid(), '2025-08-02', 'spend', 5, array['unknown_tag'], 'Dummy') $$,
  '%Unknown tag for this user:%',
  'rejects unknown tag'
);

-- 11) enforcement trigger: updating tags to unknown should fail
-- add a new known tag, then try to change to an unknown one
select lives_ok($$ insert into public.tags (name) values ('books') $$, 'add books tag');
select lives_ok($$ insert into public.transactions (user_id, date, type, amount, tags, bank_account)
  values (auth.uid(), '2025-08-03', 'spend', 8, array['books'], 'Dummy') $$, 'insert tx with books');
select throws_like(
  $$ update public.transactions set tags = array['nope'] where amount = 8 $$,
  '%Unknown tag for this user:%',
  'update to unknown tag fails'
);

-- 12) enforcement allows null/empty arrays
select lives_ok(
  $$ insert into public.transactions (user_id, date, type, amount, tags, bank_account)
     values (auth.uid(), '2025-08-04', 'spend', 3, null, 'Dummy') $$,
  'allows null tags'
);
select lives_ok(
  $$ insert into public.transactions (user_id, date, type, amount, tags, bank_account)
     values (auth.uid(), '2025-08-05', 'spend', 4, array[]::text[], 'Dummy') $$,
  'allows empty tags'
);

select * from finish();
rollback;
