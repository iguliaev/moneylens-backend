create extension if not exists "pg_net" with schema "extensions";

drop view if exists "public"."bank_accounts_with_usage";

drop view if exists "public"."categories_with_usage";

drop view if exists "public"."tags_with_usage";

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

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.reset_user_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid;
  v_transactions_deleted bigint := 0;
  v_categories_deleted bigint := 0;
  v_tags_deleted bigint := 0;
  v_bank_accounts_deleted bigint := 0;
BEGIN
  -- Get authenticated user
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'reset_user_data: not authenticated' USING ERRCODE = '28000';
  END IF;

  -- Delete in correct order to avoid FK constraint violations
  -- 1. Transactions first (has FKs to categories and bank_accounts)
  DELETE FROM public.transactions WHERE user_id = v_uid;
  GET DIAGNOSTICS v_transactions_deleted = ROW_COUNT;

  -- 2. Categories (no FKs after transactions deleted)
  DELETE FROM public.categories WHERE user_id = v_uid;
  GET DIAGNOSTICS v_categories_deleted = ROW_COUNT;

  -- 3. Tags (referenced in transactions.tags array, but transaction already deleted)
  DELETE FROM public.tags WHERE user_id = v_uid;
  GET DIAGNOSTICS v_tags_deleted = ROW_COUNT;

  -- 4. Bank accounts (no FKs after transactions deleted)
  DELETE FROM public.bank_accounts WHERE user_id = v_uid;
  GET DIAGNOSTICS v_bank_accounts_deleted = ROW_COUNT;

  -- Return summary of deleted records
  RETURN jsonb_build_object(
    'success', true,
    'transactions_deleted', v_transactions_deleted,
    'categories_deleted', v_categories_deleted,
    'tags_deleted', v_tags_deleted,
    'bank_accounts_deleted', v_bank_accounts_deleted
  );
END;
$function$
;

create or replace view "public"."bank_accounts_with_usage" as  SELECT b.id,
    b.user_id,
    b.name,
    b.description,
    b.created_at,
    b.updated_at,
    COALESCE(u.cnt, (0)::bigint) AS in_use_count
   FROM (public.bank_accounts b
     LEFT JOIN ( SELECT transactions.user_id,
            transactions.bank_account_id,
            count(*) AS cnt
           FROM public.transactions
          WHERE (transactions.bank_account_id IS NOT NULL)
          GROUP BY transactions.user_id, transactions.bank_account_id) u ON (((u.user_id = b.user_id) AND (u.bank_account_id = b.id))));


create or replace view "public"."categories_with_usage" as  SELECT c.id,
    c.user_id,
    c.type,
    c.name,
    c.description,
    c.created_at,
    c.updated_at,
    COALESCE(u.cnt, (0)::bigint) AS in_use_count
   FROM (public.categories c
     LEFT JOIN ( SELECT transactions.user_id,
            transactions.category_id,
            count(*) AS cnt
           FROM public.transactions
          WHERE (transactions.category_id IS NOT NULL)
          GROUP BY transactions.user_id, transactions.category_id) u ON (((u.user_id = c.user_id) AND (u.category_id = c.id))));


create or replace view "public"."tags_with_usage" as  SELECT g.id,
    g.user_id,
    g.name,
    g.description,
    g.created_at,
    g.updated_at,
    COALESCE(u.cnt, (0)::bigint) AS in_use_count
   FROM (public.tags g
     LEFT JOIN ( SELECT tr.user_id,
            x.tag,
            count(*) AS cnt
           FROM (public.transactions tr
             CROSS JOIN LATERAL unnest(tr.tags) x(tag))
          GROUP BY tr.user_id, x.tag) u ON (((u.user_id = g.user_id) AND (u.tag = g.name))));


create or replace view "public"."transactions_earn" as  SELECT t.id,
    t.user_id,
    t.date,
    t.type,
    t.category_id,
    COALESCE(t.category, c.name) AS category,
    t.bank_account_id,
    COALESCE(t.bank_account, b.name) AS bank_account,
    t.amount,
    t.tags,
    t.notes,
    t.created_at,
    t.updated_at
   FROM ((public.transactions t
     LEFT JOIN public.bank_accounts b ON ((t.bank_account_id = b.id)))
     LEFT JOIN public.categories c ON ((t.category_id = c.id)))
  WHERE (t.type = 'earn'::public.transaction_type);


create or replace view "public"."transactions_save" as  SELECT t.id,
    t.user_id,
    t.date,
    t.type,
    t.category_id,
    COALESCE(t.category, c.name) AS category,
    t.bank_account_id,
    COALESCE(t.bank_account, b.name) AS bank_account,
    t.amount,
    t.tags,
    t.notes,
    t.created_at,
    t.updated_at
   FROM ((public.transactions t
     LEFT JOIN public.bank_accounts b ON ((t.bank_account_id = b.id)))
     LEFT JOIN public.categories c ON ((t.category_id = c.id)))
  WHERE (t.type = 'save'::public.transaction_type);


create or replace view "public"."transactions_spend" as  SELECT t.id,
    t.user_id,
    t.date,
    t.type,
    t.category_id,
    COALESCE(t.category, c.name) AS category,
    t.bank_account_id,
    COALESCE(t.bank_account, b.name) AS bank_account,
    t.amount,
    t.tags,
    t.notes,
    t.created_at,
    t.updated_at
   FROM ((public.transactions t
     LEFT JOIN public.bank_accounts b ON ((t.bank_account_id = b.id)))
     LEFT JOIN public.categories c ON ((t.category_id = c.id)))
  WHERE (t.type = 'spend'::public.transaction_type);


create or replace view "public"."view_monthly_category_totals" as  SELECT t.user_id,
    date_trunc('month'::text, (t.date)::timestamp with time zone) AS month,
    c.name AS category,
    t.type,
    sum(t.amount) AS total
   FROM (public.transactions t
     JOIN public.categories c ON ((t.category_id = c.id)))
  GROUP BY t.user_id, (date_trunc('month'::text, (t.date)::timestamp with time zone)), c.name, t.type
  ORDER BY t.user_id, (date_trunc('month'::text, (t.date)::timestamp with time zone)) DESC, c.name, t.type;


create or replace view "public"."view_monthly_tagged_type_totals" as  SELECT user_id,
    date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    type,
    tags,
    sum(amount) AS total
   FROM public.transactions
  GROUP BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)), type, tags;


create or replace view "public"."view_monthly_totals" as  SELECT user_id,
    date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    type,
    sum(amount) AS total
   FROM public.transactions
  GROUP BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)), type
  ORDER BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)) DESC, type;


create or replace view "public"."view_tagged_type_totals" as  SELECT user_id,
    type,
    tags,
    sum(amount) AS total
   FROM public.transactions
  GROUP BY user_id, type, tags;


create or replace view "public"."view_yearly_category_totals" as  SELECT t.user_id,
    date_trunc('year'::text, (t.date)::timestamp with time zone) AS year,
    c.name AS category,
    t.type,
    sum(t.amount) AS total
   FROM (public.transactions t
     JOIN public.categories c ON ((t.category_id = c.id)))
  GROUP BY t.user_id, (date_trunc('year'::text, (t.date)::timestamp with time zone)), c.name, t.type
  ORDER BY t.user_id, (date_trunc('year'::text, (t.date)::timestamp with time zone)) DESC, c.name, t.type;


create or replace view "public"."view_yearly_tagged_type_totals" as  SELECT user_id,
    date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    type,
    tags,
    sum(amount) AS total
   FROM public.transactions
  GROUP BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)), type, tags;


create or replace view "public"."view_yearly_totals" as  SELECT user_id,
    date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    type,
    sum(amount) AS total
   FROM public.transactions
  GROUP BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)), type
  ORDER BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)) DESC, type;



