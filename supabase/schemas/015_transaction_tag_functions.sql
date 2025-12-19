-- 015_transaction_tag_functions.sql
-- Helper functions for transaction tags

-- Returns tags for a transaction as JSON array of objects {id, name, description}
CREATE OR REPLACE FUNCTION public.get_transaction_tags(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Replaces all tags for a transaction. Only the owning user may call this (auth.uid() check).
CREATE OR REPLACE FUNCTION public.set_transaction_tags(
  p_transaction_id uuid,
  p_tag_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

COMMENT ON FUNCTION public.get_transaction_tags IS 'Returns tags for a transaction as JSON array';
COMMENT ON FUNCTION public.set_transaction_tags IS 'Replaces all tags for a transaction';

-- Grant execute to authenticated role will be set in migrations
GRANT EXECUTE ON FUNCTION public.get_transaction_tags(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_transaction_tags(uuid, uuid[]) TO authenticated;
