create type "public"."transaction_type" as enum ('earn', 'spend', 'save');


  create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "type" transaction_type not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."categories" enable row level security;


  create table "public"."transactions" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "date" date not null,
    "type" transaction_type not null,
    "category" text,
    "category_id" uuid,
    "amount" numeric(12,2) not null,
    "tags" text[],
    "notes" text,
    "bank_account" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."transactions" enable row level security;

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE INDEX idx_categories_user_type ON public.categories USING btree (user_id, type);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

CREATE UNIQUE INDEX unique_user_type_name ON public.categories USING btree (user_id, type, name);

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."categories" add constraint "categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."categories" validate constraint "categories_user_id_fkey";

alter table "public"."categories" add constraint "unique_user_type_name" UNIQUE using index "unique_user_type_name";

alter table "public"."transactions" add constraint "transactions_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."transactions" validate constraint "transactions_amount_check";

alter table "public"."transactions" add constraint "transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) not valid;

alter table "public"."transactions" validate constraint "transactions_category_id_fkey";

alter table "public"."transactions" add constraint "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."transactions" validate constraint "transactions_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.categories_set_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_transaction_category_type()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    IF NEW.type IS DISTINCT FROM (SELECT type FROM categories WHERE id = NEW.category_id) THEN
      RAISE EXCEPTION 'Transaction type (%) does not match category type (%)', NEW.type, (SELECT type FROM categories WHERE id = NEW.category_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_category_safe(p_category_id uuid)
 RETURNS TABLE(ok boolean, in_use_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.sum_transactions_amount(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_type transaction_type DEFAULT NULL::transaction_type, p_category_id uuid DEFAULT NULL::uuid, p_bank_account text DEFAULT NULL::text, p_tags_any text[] DEFAULT NULL::text[], p_tags_all text[] DEFAULT NULL::text[])
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(sum(t.amount), 0)::numeric
  from public.transactions t
  where (p_from is null or t.date >= p_from)
    and (p_to is null or t.date <= p_to)
    and (p_type is null or t.type = p_type)
    and (p_category_id is null or t.category_id = p_category_id)
    and (p_bank_account is null or t.bank_account = p_bank_account)
    and (p_tags_any is null or t.tags && p_tags_any)
    and (p_tags_all is null or t.tags @> p_tags_all);
$function$
;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- clock_timestamp() returns the actual wall-clock time, not the transaction start time
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$function$
;

create or replace view "public"."transactions_earn" as  SELECT id,
    user_id,
    date,
    type,
    category,
    category_id,
    amount,
    tags,
    notes,
    bank_account,
    created_at,
    updated_at
   FROM transactions
  WHERE (type = 'earn'::transaction_type);


create or replace view "public"."transactions_save" as  SELECT id,
    user_id,
    date,
    type,
    category,
    category_id,
    amount,
    tags,
    notes,
    bank_account,
    created_at,
    updated_at
   FROM transactions
  WHERE (type = 'save'::transaction_type);


create or replace view "public"."transactions_spend" as  SELECT id,
    user_id,
    date,
    type,
    category,
    category_id,
    amount,
    tags,
    notes,
    bank_account,
    created_at,
    updated_at
   FROM transactions
  WHERE (type = 'spend'::transaction_type);


create or replace view "public"."view_monthly_category_totals" as  SELECT t.user_id,
    date_trunc('month'::text, (t.date)::timestamp with time zone) AS month,
    c.name AS category,
    t.type,
    sum(t.amount) AS total
   FROM (transactions t
     JOIN categories c ON ((t.category_id = c.id)))
  GROUP BY t.user_id, (date_trunc('month'::text, (t.date)::timestamp with time zone)), c.name, t.type
  ORDER BY t.user_id, (date_trunc('month'::text, (t.date)::timestamp with time zone)) DESC, c.name, t.type;


create or replace view "public"."view_monthly_tagged_type_totals" as  SELECT user_id,
    date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    type,
    tags,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)), type, tags;


create or replace view "public"."view_monthly_totals" as  SELECT user_id,
    date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)), type
  ORDER BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)) DESC, type;


create or replace view "public"."view_tagged_type_totals" as  SELECT user_id,
    type,
    tags,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, type, tags;


create or replace view "public"."view_yearly_category_totals" as  SELECT t.user_id,
    date_trunc('year'::text, (t.date)::timestamp with time zone) AS year,
    c.name AS category,
    t.type,
    sum(t.amount) AS total
   FROM (transactions t
     JOIN categories c ON ((t.category_id = c.id)))
  GROUP BY t.user_id, (date_trunc('year'::text, (t.date)::timestamp with time zone)), c.name, t.type
  ORDER BY t.user_id, (date_trunc('year'::text, (t.date)::timestamp with time zone)) DESC, c.name, t.type;


create or replace view "public"."view_yearly_tagged_type_totals" as  SELECT user_id,
    date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    type,
    tags,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)), type, tags;


create or replace view "public"."view_yearly_totals" as  SELECT user_id,
    date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)), type
  ORDER BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)) DESC, type;


grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."transactions" to "anon";

grant insert on table "public"."transactions" to "anon";

grant references on table "public"."transactions" to "anon";

grant select on table "public"."transactions" to "anon";

grant trigger on table "public"."transactions" to "anon";

grant truncate on table "public"."transactions" to "anon";

grant update on table "public"."transactions" to "anon";

grant delete on table "public"."transactions" to "authenticated";

grant insert on table "public"."transactions" to "authenticated";

grant references on table "public"."transactions" to "authenticated";

grant select on table "public"."transactions" to "authenticated";

grant trigger on table "public"."transactions" to "authenticated";

grant truncate on table "public"."transactions" to "authenticated";

grant update on table "public"."transactions" to "authenticated";

grant delete on table "public"."transactions" to "service_role";

grant insert on table "public"."transactions" to "service_role";

grant references on table "public"."transactions" to "service_role";

grant select on table "public"."transactions" to "service_role";

grant trigger on table "public"."transactions" to "service_role";

grant truncate on table "public"."transactions" to "service_role";

grant update on table "public"."transactions" to "service_role";


  create policy "categories_delete"
  on "public"."categories"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "categories_insert"
  on "public"."categories"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "categories_select"
  on "public"."categories"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "categories_update"
  on "public"."categories"
  as permissive
  for update
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "Users can delete their own transactions"
  on "public"."transactions"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own transactions"
  on "public"."transactions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own transactions"
  on "public"."transactions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own transactions"
  on "public"."transactions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER set_updated_at_on_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

CREATE TRIGGER set_user_id_on_categories BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION categories_set_user_id();

CREATE TRIGGER transaction_category_type_trigger BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION check_transaction_category_type();


