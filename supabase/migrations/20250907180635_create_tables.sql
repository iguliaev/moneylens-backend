create type "public"."transaction_type" as enum ('earn', 'spend', 'save');


  create table "public"."bank_accounts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."bank_accounts" enable row level security;


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


  create table "public"."tags" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tags" enable row level security;


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
    "updated_at" timestamp with time zone not null default now(),
    "bank_account_id" uuid
      );


alter table "public"."transactions" enable row level security;

CREATE UNIQUE INDEX bank_accounts_pkey ON public.bank_accounts USING btree (id);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE INDEX idx_bank_accounts_user ON public.bank_accounts USING btree (user_id);

CREATE INDEX idx_categories_user_type ON public.categories USING btree (user_id, type);

CREATE INDEX idx_tags_user ON public.tags USING btree (user_id);

CREATE UNIQUE INDEX tags_pkey ON public.tags USING btree (id);

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

CREATE UNIQUE INDEX unique_user_type_name ON public.categories USING btree (user_id, type, name);

CREATE UNIQUE INDEX uq_bank_accounts_user_name ON public.bank_accounts USING btree (user_id, name);

CREATE UNIQUE INDEX uq_tags_user_name ON public.tags USING btree (user_id, name);

alter table "public"."bank_accounts" add constraint "bank_accounts_pkey" PRIMARY KEY using index "bank_accounts_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."tags" add constraint "tags_pkey" PRIMARY KEY using index "tags_pkey";

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."bank_accounts" add constraint "bank_accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."bank_accounts" validate constraint "bank_accounts_user_id_fkey";

alter table "public"."bank_accounts" add constraint "uq_bank_accounts_user_name" UNIQUE using index "uq_bank_accounts_user_name";

alter table "public"."categories" add constraint "categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."categories" validate constraint "categories_user_id_fkey";

alter table "public"."categories" add constraint "unique_user_type_name" UNIQUE using index "unique_user_type_name";

alter table "public"."tags" add constraint "tags_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."tags" validate constraint "tags_user_id_fkey";

alter table "public"."tags" add constraint "uq_tags_user_name" UNIQUE using index "uq_tags_user_name";

alter table "public"."transactions" add constraint "transactions_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."transactions" validate constraint "transactions_amount_check";

alter table "public"."transactions" add constraint "transactions_bank_account_id_fkey" FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) not valid;

alter table "public"."transactions" validate constraint "transactions_bank_account_id_fkey";

alter table "public"."transactions" add constraint "transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) not valid;

alter table "public"."transactions" validate constraint "transactions_category_id_fkey";

alter table "public"."transactions" add constraint "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."transactions" validate constraint "transactions_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.bank_accounts_set_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.user_id is null then
    new.user_id := auth.uid(); -- schema-qualified call is safe with empty path
  end if;
  return new;
end;
$function$
;

create or replace view "public"."bank_accounts_with_usage" as  SELECT b.id,
    b.user_id,
    b.name,
    b.description,
    b.created_at,
    b.updated_at,
    COALESCE(u.cnt, (0)::bigint) AS in_use_count
   FROM (bank_accounts b
     LEFT JOIN ( SELECT transactions.user_id,
            transactions.bank_account_id,
            count(*) AS cnt
           FROM transactions
          WHERE (transactions.bank_account_id IS NOT NULL)
          GROUP BY transactions.user_id, transactions.bank_account_id) u ON (((u.user_id = b.user_id) AND (u.bank_account_id = b.id))));


CREATE OR REPLACE FUNCTION public.categories_set_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$function$
;

create or replace view "public"."categories_with_usage" as  SELECT c.id,
    c.user_id,
    c.type,
    c.name,
    c.description,
    c.created_at,
    c.updated_at,
    COALESCE(u.cnt, (0)::bigint) AS in_use_count
   FROM (categories c
     LEFT JOIN ( SELECT transactions.user_id,
            transactions.category_id,
            count(*) AS cnt
           FROM transactions
          WHERE (transactions.category_id IS NOT NULL)
          GROUP BY transactions.user_id, transactions.category_id) u ON (((u.user_id = c.user_id) AND (u.category_id = c.id))));


CREATE OR REPLACE FUNCTION public.check_transaction_bank_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.bank_account_id is not null then
    if not exists (
      select 1 from public.bank_accounts b
      where b.id = new.bank_account_id and b.user_id = new.user_id
    ) then
      raise exception 'Bank account does not belong to the user' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_transaction_category_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    IF NEW.type IS DISTINCT FROM (SELECT type FROM public.categories WHERE id = NEW.category_id) THEN
      RAISE EXCEPTION 'Transaction type (%) does not match category type (%)', NEW.type, (SELECT type FROM public.categories WHERE id = NEW.category_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_bank_account_safe(p_bank_account_id uuid)
 RETURNS TABLE(ok boolean, in_use_count bigint)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.delete_category_safe(p_category_id uuid)
 RETURNS TABLE(ok boolean, in_use_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.delete_tag_safe(p_tag_id uuid)
 RETURNS TABLE(ok boolean, in_use_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_known_tags()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
end$function$
;

CREATE OR REPLACE FUNCTION public.sum_transactions_amount(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_type transaction_type DEFAULT NULL::transaction_type, p_category_id uuid DEFAULT NULL::uuid, p_bank_account text DEFAULT NULL::text, p_tags_any text[] DEFAULT NULL::text[], p_tags_all text[] DEFAULT NULL::text[])
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.tags_set_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end$function$
;

create or replace view "public"."tags_with_usage" as  SELECT g.id,
    g.user_id,
    g.name,
    g.description,
    g.created_at,
    g.updated_at,
    COALESCE(u.cnt, (0)::bigint) AS in_use_count
   FROM (tags g
     LEFT JOIN ( SELECT tr.user_id,
            x.tag,
            count(*) AS cnt
           FROM (transactions tr
             CROSS JOIN LATERAL unnest(tr.tags) x(tag))
          GROUP BY tr.user_id, x.tag) u ON (((u.user_id = g.user_id) AND (u.tag = g.name))));


CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
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


grant delete on table "public"."bank_accounts" to "anon";

grant insert on table "public"."bank_accounts" to "anon";

grant references on table "public"."bank_accounts" to "anon";

grant select on table "public"."bank_accounts" to "anon";

grant trigger on table "public"."bank_accounts" to "anon";

grant truncate on table "public"."bank_accounts" to "anon";

grant update on table "public"."bank_accounts" to "anon";

grant delete on table "public"."bank_accounts" to "authenticated";

grant insert on table "public"."bank_accounts" to "authenticated";

grant references on table "public"."bank_accounts" to "authenticated";

grant select on table "public"."bank_accounts" to "authenticated";

grant trigger on table "public"."bank_accounts" to "authenticated";

grant truncate on table "public"."bank_accounts" to "authenticated";

grant update on table "public"."bank_accounts" to "authenticated";

grant delete on table "public"."bank_accounts" to "service_role";

grant insert on table "public"."bank_accounts" to "service_role";

grant references on table "public"."bank_accounts" to "service_role";

grant select on table "public"."bank_accounts" to "service_role";

grant trigger on table "public"."bank_accounts" to "service_role";

grant truncate on table "public"."bank_accounts" to "service_role";

grant update on table "public"."bank_accounts" to "service_role";

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

grant delete on table "public"."tags" to "anon";

grant insert on table "public"."tags" to "anon";

grant references on table "public"."tags" to "anon";

grant select on table "public"."tags" to "anon";

grant trigger on table "public"."tags" to "anon";

grant truncate on table "public"."tags" to "anon";

grant update on table "public"."tags" to "anon";

grant delete on table "public"."tags" to "authenticated";

grant insert on table "public"."tags" to "authenticated";

grant references on table "public"."tags" to "authenticated";

grant select on table "public"."tags" to "authenticated";

grant trigger on table "public"."tags" to "authenticated";

grant truncate on table "public"."tags" to "authenticated";

grant update on table "public"."tags" to "authenticated";

grant delete on table "public"."tags" to "service_role";

grant insert on table "public"."tags" to "service_role";

grant references on table "public"."tags" to "service_role";

grant select on table "public"."tags" to "service_role";

grant trigger on table "public"."tags" to "service_role";

grant truncate on table "public"."tags" to "service_role";

grant update on table "public"."tags" to "service_role";

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


  create policy "bank_accounts_delete"
  on "public"."bank_accounts"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "bank_accounts_insert"
  on "public"."bank_accounts"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "bank_accounts_select"
  on "public"."bank_accounts"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "bank_accounts_update"
  on "public"."bank_accounts"
  as permissive
  for update
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



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



  create policy "tags_delete"
  on "public"."tags"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "tags_insert"
  on "public"."tags"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "tags_select"
  on "public"."tags"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "tags_update"
  on "public"."tags"
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


CREATE TRIGGER set_updated_at_on_bank_accounts BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

CREATE TRIGGER set_user_id_on_bank_accounts BEFORE INSERT ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION bank_accounts_set_user_id();

CREATE TRIGGER set_updated_at_on_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

CREATE TRIGGER set_user_id_on_categories BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION categories_set_user_id();

CREATE TRIGGER set_updated_at_on_tags BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();

CREATE TRIGGER set_user_id_on_tags BEFORE INSERT ON public.tags FOR EACH ROW EXECUTE FUNCTION tags_set_user_id();

CREATE TRIGGER enforce_known_tags_trg BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION enforce_known_tags();

CREATE TRIGGER transaction_bank_account_check BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION check_transaction_bank_account();

CREATE TRIGGER transaction_category_type_trigger BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION check_transaction_category_type();


