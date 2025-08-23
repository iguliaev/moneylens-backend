create type "public"."transaction_type" as enum ('earn', 'spend', 'save');


  create table "public"."transactions" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "date" date not null,
    "type" transaction_type not null,
    "category" text,
    "amount" numeric(12,2) not null,
    "tags" text[],
    "notes" text,
    "bank_account" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."transactions" enable row level security;

CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

alter table "public"."transactions" add constraint "transactions_pkey" PRIMARY KEY using index "transactions_pkey";

alter table "public"."transactions" add constraint "transactions_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."transactions" validate constraint "transactions_amount_check";

alter table "public"."transactions" add constraint "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."transactions" validate constraint "transactions_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sum_transactions_amount(p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_type transaction_type DEFAULT NULL::transaction_type, p_category text DEFAULT NULL::text, p_bank_account text DEFAULT NULL::text, p_tags_any text[] DEFAULT NULL::text[], p_tags_all text[] DEFAULT NULL::text[])
 RETURNS numeric
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(sum(t.amount), 0)::numeric
  from public.transactions t
  where (p_from is null or t.date >= p_from)
    and (p_to is null or t.date <= p_to)
    and (p_type is null or t.type = p_type)
    and (p_category is null or t.category = p_category)
    and (p_bank_account is null or t.bank_account = p_bank_account)
    and (p_tags_any is null or t.tags && p_tags_any)
    and (p_tags_all is null or t.tags @> p_tags_all);
$function$
;

create or replace view "public"."transactions_earn" as  SELECT id,
    user_id,
    date,
    type,
    category,
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
    amount,
    tags,
    notes,
    bank_account,
    created_at,
    updated_at
   FROM transactions
  WHERE (type = 'spend'::transaction_type);


create or replace view "public"."view_monthly_category_totals" as  SELECT date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    category,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY (date_trunc('month'::text, (date)::timestamp with time zone)), category, type
  ORDER BY (date_trunc('month'::text, (date)::timestamp with time zone)) DESC, category, type;


create or replace view "public"."view_monthly_tagged_type_totals" as  SELECT date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    type,
    tags,
    sum(amount) AS total
   FROM transactions
  GROUP BY (date_trunc('month'::text, (date)::timestamp with time zone)), type, tags;


create or replace view "public"."view_monthly_totals" as  SELECT date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY (date_trunc('month'::text, (date)::timestamp with time zone)), type
  ORDER BY (date_trunc('month'::text, (date)::timestamp with time zone)) DESC, type;


create or replace view "public"."view_tagged_type_totals" as  SELECT type,
    tags,
    sum(amount) AS total
   FROM transactions
  GROUP BY type, tags;


create or replace view "public"."view_yearly_category_totals" as  SELECT date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    category,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY (date_trunc('year'::text, (date)::timestamp with time zone)), category, type
  ORDER BY (date_trunc('year'::text, (date)::timestamp with time zone)) DESC, category, type;


create or replace view "public"."view_yearly_tagged_type_totals" as  SELECT date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    type,
    tags,
    sum(amount) AS total
   FROM transactions
  GROUP BY (date_trunc('year'::text, (date)::timestamp with time zone)), type, tags;


create or replace view "public"."view_yearly_totals" as  SELECT date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY (date_trunc('year'::text, (date)::timestamp with time zone)), type
  ORDER BY (date_trunc('year'::text, (date)::timestamp with time zone)) DESC, type;


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



