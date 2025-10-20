set check_function_bodies = off;

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
      IF v_tx->>'date' IS NULL OR v_tx->>'type' IS NULL OR v_tx->>'amount' IS NULL THEN
        v_errors := v_errors || jsonb_build_object(
          'index', v_idx,
          'error', 'Missing required field: date, type, or amount'
        );
        CONTINUE;
      END IF;

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
      );

      v_inserted_count := v_inserted_count + 1;

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


