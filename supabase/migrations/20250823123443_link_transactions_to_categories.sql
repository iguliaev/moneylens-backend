drop view if exists "public"."transactions_earn";

drop view if exists "public"."transactions_save";

drop view if exists "public"."transactions_spend";

drop view if exists "public"."view_monthly_category_totals";

drop view if exists "public"."view_monthly_tagged_type_totals";

drop view if exists "public"."view_monthly_totals";

drop view if exists "public"."view_tagged_type_totals";

drop view if exists "public"."view_yearly_category_totals";

drop view if exists "public"."view_yearly_tagged_type_totals";

drop view if exists "public"."view_yearly_totals";

alter table "public"."transactions" add column "category_id" uuid;

alter table "public"."transactions" add constraint "transactions_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) not valid;

alter table "public"."transactions" validate constraint "transactions_category_id_fkey";

set check_function_bodies = off;

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


create or replace view "public"."view_monthly_category_totals" as  SELECT user_id,
    date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    category,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)), category, type
  ORDER BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)) DESC, category, type;


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


create or replace view "public"."view_yearly_category_totals" as  SELECT user_id,
    date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    category,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)), category, type
  ORDER BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)) DESC, category, type;


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


CREATE TRIGGER transaction_category_type_trigger BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION check_transaction_category_type();


