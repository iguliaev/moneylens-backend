-- 013_tags_rls.sql
-- Enable RLS and owner-only policies for tags; add user_id and updated_at triggers

alter table if exists public.tags enable row level security;

-- Policies
drop policy if exists tags_select on public.tags;
create policy tags_select
on public.tags
for select
using (user_id = auth.uid());

drop policy if exists tags_insert on public.tags;
create policy tags_insert
on public.tags
for insert
with check (user_id = auth.uid());

drop policy if exists tags_update on public.tags;
create policy tags_update
on public.tags
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists tags_delete on public.tags;
create policy tags_delete
on public.tags
for delete
using (user_id = auth.uid());

-- Set user_id automatically if missing
create or replace function public.tags_set_user_id()
returns trigger language plpgsql as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end$$;

drop trigger if exists set_user_id_on_tags on public.tags;
create trigger set_user_id_on_tags
before insert on public.tags
for each row execute function public.tags_set_user_id();

-- Keep updated_at fresh on UPDATE (reuse tg_set_updated_at from categories)
drop trigger if exists set_updated_at_on_tags on public.tags;
create trigger set_updated_at_on_tags
before update on public.tags
for each row execute function public.tg_set_updated_at();
