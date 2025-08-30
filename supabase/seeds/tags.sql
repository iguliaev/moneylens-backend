-- Optional seed for tags
-- For the demo user used elsewhere in seeds (user@example.com), insert some tags

do $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = 'user@example.com';
  if v_uid is not null then
    -- Ensure all tags referenced by seeds/transactions.sql exist
    insert into public.tags (user_id, name, description)
    values
      (v_uid, 'groceries', 'Food & household'),
      (v_uid, 'movie', 'Entertainment'),
      (v_uid, 'bus', 'Transport'),
      (v_uid, 'doctor', 'Healthcare'),
      (v_uid, 'clothes', 'Apparel'),
      (v_uid, 'salary', 'Income'),
      (v_uid, 'bonus', 'Income'),
      (v_uid, 'gift', 'Income'),
      (v_uid, 'investment', 'Savings/Investing'),
      (v_uid, 'retirement', 'Savings/Investing'),
      (v_uid, 'vacation', 'Savings/Goals')
    on conflict (user_id, name) do nothing;
  end if;
end$$;
