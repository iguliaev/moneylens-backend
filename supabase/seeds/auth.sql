insert into auth.users (id, email, encrypted_password, instance_id, aud, role, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
values (
  'eae9a6b6-46c0-42ec-ab00-358eaac243c5',
  'user@example.com',
  '', -- leave blank for dev
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  now(),
  '{}',
  '{}',
  false,
  now(),
  now()
);