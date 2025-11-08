set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.bulk_upload_data(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_before_count bigint;
  v_after_count bigint;
  v_categories_inserted int := 0;
  v_bank_accounts_inserted int := 0;
  v_tags_inserted int := 0;
  v_transactions_inserted int := 0;
  v_tx_result jsonb;
BEGIN
  -- Authenticate caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'bulk_upload_data: not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Categories (if provided)
  IF p_payload ? 'categories' AND p_payload->'categories' IS NOT NULL THEN
    SELECT COUNT(*) FROM public.categories WHERE user_id = v_user_id INTO v_before_count;
    PERFORM public.insert_categories(v_user_id, p_payload->'categories');
    SELECT COUNT(*) FROM public.categories WHERE user_id = v_user_id INTO v_after_count;
    v_categories_inserted := GREATEST(v_after_count - v_before_count, 0);
  END IF;

  -- Bank accounts (if provided)
  IF p_payload ? 'bank_accounts' AND p_payload->'bank_accounts' IS NOT NULL THEN
    SELECT COUNT(*) FROM public.bank_accounts WHERE user_id = v_user_id INTO v_before_count;
    PERFORM public.insert_bank_accounts(v_user_id, p_payload->'bank_accounts');
    SELECT COUNT(*) FROM public.bank_accounts WHERE user_id = v_user_id INTO v_after_count;
    v_bank_accounts_inserted := GREATEST(v_after_count - v_before_count, 0);
  END IF;

  -- Tags (if provided)
  IF p_payload ? 'tags' AND p_payload->'tags' IS NOT NULL THEN
    SELECT COUNT(*) FROM public.tags WHERE user_id = v_user_id INTO v_before_count;
    PERFORM public.insert_tags(v_user_id, p_payload->'tags');
    SELECT COUNT(*) FROM public.tags WHERE user_id = v_user_id INTO v_after_count;
    v_tags_inserted := GREATEST(v_after_count - v_before_count, 0);
  END IF;

  -- Transactions (if provided) - delegate to existing bulk_insert_transactions
  IF p_payload ? 'transactions' AND p_payload->'transactions' IS NOT NULL THEN
    -- bulk_insert_transactions is SECURITY DEFINER and will itself authenticate using auth.uid()
    v_tx_result := public.bulk_insert_transactions(p_payload->'transactions');
    -- Extract inserted_count if present
    IF v_tx_result IS NOT NULL AND v_tx_result ? 'inserted_count' THEN
      v_transactions_inserted := (v_tx_result->>'inserted_count')::int;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'categories_inserted', v_categories_inserted,
    'bank_accounts_inserted', v_bank_accounts_inserted,
    'tags_inserted', v_tags_inserted,
    'transactions_inserted', v_transactions_inserted
  );
EXCEPTION
  WHEN SQLSTATE 'P0001' THEN
    -- validation exceptions raised by helpers - preserve them
    RAISE;
  WHEN others THEN
    RAISE EXCEPTION 'bulk_upload_data failed: %', SQLERRM;
END;
$function$
;


