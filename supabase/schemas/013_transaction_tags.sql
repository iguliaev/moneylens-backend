-- 013_transaction_tags.sql
-- Junction table for many-to-many relationship between transactions and tags

CREATE TABLE IF NOT EXISTS public.transaction_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_transaction_tag UNIQUE (transaction_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction 
ON public.transaction_tags(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag 
ON public.transaction_tags(tag_id);

-- Add comments
COMMENT ON TABLE public.transaction_tags IS 'Many-to-many relationship between transactions and tags';
COMMENT ON COLUMN public.transaction_tags.transaction_id IS 'Reference to transaction';
COMMENT ON COLUMN public.transaction_tags.tag_id IS 'Reference to tag';
