-- 014_transaction_tags_policies.sql
-- Row Level Security policies for transaction_tags

-- Enable RLS
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;

-- Users can view their own transaction-tag associations
CREATE POLICY "Users can view own transaction tags"
ON public.transaction_tags
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.transactions
        WHERE transactions.id = transaction_tags.transaction_id
        AND transactions.user_id = auth.uid()
    )
);

-- Users can insert their own transaction-tag associations
CREATE POLICY "Users can insert own transaction tags"
ON public.transaction_tags
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.transactions
        WHERE transactions.id = transaction_tags.transaction_id
        AND transactions.user_id = auth.uid()
    )
    AND
    EXISTS (
        SELECT 1 FROM public.tags
        WHERE tags.id = transaction_tags.tag_id
        AND tags.user_id = auth.uid()
    )
);

-- Users can delete their own transaction-tag associations
CREATE POLICY "Users can delete own transaction tags"
ON public.transaction_tags
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.transactions
        WHERE transactions.id = transaction_tags.transaction_id
        AND transactions.user_id = auth.uid()
    )
);

-- Note: No UPDATE policy needed - associations are immutable (delete + insert instead)
