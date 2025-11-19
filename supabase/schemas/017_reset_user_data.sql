-- 017_reset_user_data.sql
-- Resets all user data: transactions, categories, tags, bank accounts
-- This is a destructive operation that permanently deletes all personal financial data

CREATE OR REPLACE FUNCTION public.reset_user_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reset_user_data() TO authenticated;

-- Document the function
COMMENT ON FUNCTION public.reset_user_data() IS 
'Permanently deletes all personal financial data for the authenticated user, including:
- All transactions
- All categories
- All tags
- All bank accounts

This operation is atomic (all-or-nothing) and cannot be undone. Deletes in order:
transactions → categories → tags → bank_accounts to avoid FK constraint violations.

Returns JSON object with deletion counts:
{
  "success": boolean,
  "transactions_deleted": number,
  "categories_deleted": number,
  "tags_deleted": number,
  "bank_accounts_deleted": number
}';
