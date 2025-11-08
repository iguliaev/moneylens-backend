-- 016_bulk_upload_entities.sql
-- Helper functions for bulk upload (entities)
-- Task 1.1: insert_categories

CREATE OR REPLACE FUNCTION insert_categories(
  p_user_id uuid,
  p_categories jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_missing_count int;
  v_invalid_type text;
BEGIN
  -- Nothing to do for NULL or empty input
  IF p_categories IS NULL OR jsonb_array_length(p_categories) = 0 THEN
    RETURN;
  END IF;

  -- Validate required fields: every element must have name and type
  SELECT COUNT(*) INTO v_missing_count
  FROM jsonb_array_elements(p_categories) AS elem
  WHERE (elem->>'name') IS NULL OR (elem->>'type') IS NULL;

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION 'insert_categories: one or more items are missing required fields "name" or "type"';
  END IF;

  -- Validate that provided type values are members of transaction_type enum
  WITH types AS (
    SELECT DISTINCT (elem->>'type') AS typ
    FROM jsonb_array_elements(p_categories) AS elem
  ), invalid AS (
    SELECT typ
    FROM types
    WHERE typ NOT IN (
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = 'transaction_type'::regtype
    )
  )
  SELECT typ INTO v_invalid_type FROM invalid LIMIT 1;

  IF v_invalid_type IS NOT NULL THEN
    RAISE EXCEPTION 'insert_categories: invalid transaction_type: %', v_invalid_type;
  END IF;

  -- Batch insert using JSONB array elements. Use explicit p_user_id and
  -- ON CONFLICT DO NOTHING to avoid duplicates.
  INSERT INTO public.categories (user_id, type, name, description)
  SELECT
    p_user_id,
    (elem->>'type')::transaction_type,
    elem->>'name',
    CASE WHEN (elem ? 'description') THEN (elem->>'description') ELSE NULL END
  FROM jsonb_array_elements(p_categories) AS elem
  WHERE elem->>'name' IS NOT NULL
    AND elem->>'type' IS NOT NULL
  ON CONFLICT (user_id, type, name) DO NOTHING;

  RETURN;
EXCEPTION
  WHEN others THEN
    -- Keep the exception message clear for callers
    RAISE EXCEPTION 'insert_categories failed: %', SQLERRM;
END;
$$;

-- Granting execute to authenticated role is handled in migration file
