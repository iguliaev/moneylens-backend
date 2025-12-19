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


  create table "public"."transaction_tags" (
    "id" uuid not null default gen_random_uuid(),
    "transaction_id" uuid not null,
    "tag_id" uuid not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."transaction_tags" enable row level security;

CREATE INDEX idx_transaction_tags_tag ON public.transaction_tags USING btree (tag_id);

CREATE INDEX idx_transaction_tags_transaction ON public.transaction_tags USING btree (transaction_id);

CREATE UNIQUE INDEX transaction_tags_pkey ON public.transaction_tags USING btree (id);

CREATE UNIQUE INDEX uq_transaction_tag ON public.transaction_tags USING btree (transaction_id, tag_id);

alter table "public"."transaction_tags" add constraint "transaction_tags_pkey" PRIMARY KEY using index "transaction_tags_pkey";

alter table "public"."transaction_tags" add constraint "transaction_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE not valid;

alter table "public"."transaction_tags" validate constraint "transaction_tags_tag_id_fkey";

alter table "public"."transaction_tags" add constraint "transaction_tags_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE not valid;

alter table "public"."transaction_tags" validate constraint "transaction_tags_transaction_id_fkey";

alter table "public"."transaction_tags" add constraint "uq_transaction_tag" UNIQUE using index "uq_transaction_tag";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_transaction_tags(p_transaction_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'description', t.description
            ) ORDER BY t.name
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::jsonb
    )
    FROM public.transaction_tags tt
    JOIN public.tags t ON tt.tag_id = t.id
    WHERE tt.transaction_id = p_transaction_id;
$function$
;

CREATE OR REPLACE FUNCTION public.set_transaction_tags(p_transaction_id uuid, p_tag_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Verify caller owns the transaction
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions WHERE id = p_transaction_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Transaction not found or access denied' USING ERRCODE = '42501';
  END IF;

  -- Delete existing associations
  DELETE FROM public.transaction_tags WHERE transaction_id = p_transaction_id;

  -- Insert new associations when provided
  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
    INSERT INTO public.transaction_tags (transaction_id, tag_id)
    SELECT p_transaction_id, unnest(p_tag_ids)
    ON CONFLICT (transaction_id, tag_id) DO NOTHING;
  END IF;
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


CREATE OR REPLACE FUNCTION public.bulk_insert_transactions(p_transactions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_tx jsonb;
  v_category_id uuid;
  v_bank_account_id uuid;
  v_tx_id uuid;
  v_inserted_count integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_idx integer := 0;
  v_type public.transaction_type;
  v_tag text;
  v_tag_exists boolean;
BEGIN
  -- Authenticate
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Ensure input is an array
  IF p_transactions IS NULL OR jsonb_typeof(p_transactions) <> 'array' THEN
    RAISE EXCEPTION 'p_transactions must be a JSON array' USING ERRCODE = '22023';
  END IF;

  -- Iterate through each element
  FOR v_tx IN SELECT * FROM jsonb_array_elements(p_transactions)
  LOOP
    v_idx := v_idx + 1;

    BEGIN
      -- Required fields
      -- Check for missing required fields and build specific error message
      DECLARE
        v_missing_fields text[] := ARRAY[]::text[];
        v_error_msg text;
      BEGIN
        IF v_tx->>'date' IS NULL THEN
          v_missing_fields := array_append(v_missing_fields, 'date');
        END IF;
        IF v_tx->>'type' IS NULL THEN
          v_missing_fields := array_append(v_missing_fields, 'type');
        END IF;
        IF v_tx->>'amount' IS NULL THEN
          v_missing_fields := array_append(v_missing_fields, 'amount');
        END IF;
        IF array_length(v_missing_fields, 1) IS NOT NULL THEN
          IF array_length(v_missing_fields, 1) = 1 THEN
            v_error_msg := format('Missing required field: %s', v_missing_fields[1]);
          ELSE
            v_error_msg := format('Missing required fields: %s', array_to_string(v_missing_fields, ', '));
          END IF;
          v_errors := v_errors || jsonb_build_object(
            'index', v_idx,
            'error', v_error_msg
          );
          CONTINUE;
        END IF;
      END;

      -- Type validation (casts to enum)
      BEGIN
        v_type := (v_tx->>'type')::public.transaction_type;
      EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors || jsonb_build_object(
          'index', v_idx,
          'error', format('Invalid transaction type: "%s"', v_tx->>'type')
        );
        CONTINUE;
      END;

      -- Resolve category name -> id if provided
      v_category_id := NULL;
      IF v_tx->>'category' IS NOT NULL THEN
        SELECT id INTO v_category_id
        FROM public.categories
        WHERE user_id = v_user_id
          AND type = v_type
          AND name = v_tx->>'category'
        LIMIT 1;

        IF v_category_id IS NULL THEN
          v_errors := v_errors || jsonb_build_object(
            'index', v_idx,
            'error', format('Category "%s" not found for type "%s"', v_tx->>'category', v_type)
          );
          CONTINUE;
        END IF;
      END IF;

      -- Resolve bank account name -> id if provided
      v_bank_account_id := NULL;
      IF v_tx->>'bank_account' IS NOT NULL THEN
        SELECT id INTO v_bank_account_id
        FROM public.bank_accounts
        WHERE user_id = v_user_id
          AND name = v_tx->>'bank_account'
        LIMIT 1;

        IF v_bank_account_id IS NULL THEN
          v_errors := v_errors || jsonb_build_object(
            'index', v_idx,
            'error', format('Bank account "%s" not found', v_tx->>'bank_account')
          );
          CONTINUE;
        END IF;
      END IF;

      -- Validate tags exist (if provided)
      IF v_tx->'tags' IS NOT NULL THEN
        FOR v_tag IN SELECT jsonb_array_elements_text(v_tx->'tags')
        LOOP
          SELECT EXISTS(
            SELECT 1 FROM public.tags WHERE user_id = v_user_id AND name = v_tag
          ) INTO v_tag_exists;

          IF NOT v_tag_exists THEN
            v_errors := v_errors || jsonb_build_object(
              'index', v_idx,
              'error', format('Tag "%s" not found', v_tag)
            );
            -- skip remaining tags and this transaction
            EXIT;
          END IF;
        END LOOP;

        -- If last error belongs to current index, skip insert
        IF jsonb_array_length(v_errors) > 0 AND (v_errors->-1->>'index')::integer = v_idx THEN
          CONTINUE;
        END IF;
      END IF;

      -- Insert transaction
      INSERT INTO public.transactions (
        user_id,
        date,
        type,
        category_id,
        bank_account_id,
        amount,
        tags,
        notes
      ) VALUES (
        v_user_id,
        (v_tx->>'date')::date,
        v_type,
        v_category_id,
        v_bank_account_id,
        (v_tx->>'amount')::numeric,
        CASE WHEN v_tx->'tags' IS NOT NULL THEN (SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_tx->'tags')) ELSE NULL END,
        v_tx->>'notes'
      )
      RETURNING id INTO v_tx_id;

      v_inserted_count := v_inserted_count + 1;

      -- Insert tag associations into transaction_tags (map tag names -> tag ids)
      IF v_tx->'tags' IS NOT NULL THEN
        INSERT INTO public.transaction_tags (transaction_id, tag_id)
        SELECT DISTINCT
          v_tx_id,
          tg.id
        FROM jsonb_array_elements_text(v_tx->'tags') AS jt(tag_name)
        JOIN public.tags tg ON tg.user_id = v_user_id AND tg.name = jt.tag_name
        ON CONFLICT (transaction_id, tag_id) DO NOTHING;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'index', v_idx,
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      );
      -- continue to next element
    END;

  END LOOP;

  -- If any errors collected, raise exception with details so client can parse
  IF jsonb_array_length(v_errors) > 0 THEN
    RAISE EXCEPTION 'Bulk insert failed with % error(s)', jsonb_array_length(v_errors)
      USING DETAIL = v_errors::text;
  END IF;

  -- success
  RETURN jsonb_build_object(
    'success', true,
    'inserted_count', v_inserted_count,
    'total_count', v_idx
  );
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
   FROM (public.categories c
     LEFT JOIN ( SELECT transactions.user_id,
            transactions.category_id,
            count(*) AS cnt
           FROM public.transactions
          WHERE (transactions.category_id IS NOT NULL)
          GROUP BY transactions.user_id, transactions.category_id) u ON (((u.user_id = c.user_id) AND (u.category_id = c.id))));


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


grant delete on table "public"."transaction_tags" to "anon";

grant insert on table "public"."transaction_tags" to "anon";

grant references on table "public"."transaction_tags" to "anon";

grant select on table "public"."transaction_tags" to "anon";

grant trigger on table "public"."transaction_tags" to "anon";

grant truncate on table "public"."transaction_tags" to "anon";

grant update on table "public"."transaction_tags" to "anon";

grant delete on table "public"."transaction_tags" to "authenticated";

grant insert on table "public"."transaction_tags" to "authenticated";

grant references on table "public"."transaction_tags" to "authenticated";

grant select on table "public"."transaction_tags" to "authenticated";

grant trigger on table "public"."transaction_tags" to "authenticated";

grant truncate on table "public"."transaction_tags" to "authenticated";

grant update on table "public"."transaction_tags" to "authenticated";

grant delete on table "public"."transaction_tags" to "service_role";

grant insert on table "public"."transaction_tags" to "service_role";

grant references on table "public"."transaction_tags" to "service_role";

grant select on table "public"."transaction_tags" to "service_role";

grant trigger on table "public"."transaction_tags" to "service_role";

grant truncate on table "public"."transaction_tags" to "service_role";

grant update on table "public"."transaction_tags" to "service_role";


  create policy "Users can delete own transaction tags"
  on "public"."transaction_tags"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.transactions
  WHERE ((transactions.id = transaction_tags.transaction_id) AND (transactions.user_id = auth.uid())))));



  create policy "Users can insert own transaction tags"
  on "public"."transaction_tags"
  as permissive
  for insert
  to public
with check (((EXISTS ( SELECT 1
   FROM public.transactions
  WHERE ((transactions.id = transaction_tags.transaction_id) AND (transactions.user_id = auth.uid())))) AND (EXISTS ( SELECT 1
   FROM public.tags
  WHERE ((tags.id = transaction_tags.tag_id) AND (tags.user_id = auth.uid()))))));



  create policy "Users can view own transaction tags"
  on "public"."transaction_tags"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.transactions
  WHERE ((transactions.id = transaction_tags.transaction_id) AND (transactions.user_id = auth.uid())))));



