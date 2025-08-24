-- Enable Row-Level Security (RLS) for categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop legacy broad policy if present to avoid overlap
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'Allow owner full access'
    ) THEN
        EXECUTE 'DROP POLICY "Allow owner full access" ON public.categories';
    END IF;
END $$;

-- Owner-only CRUD policies
DROP POLICY IF EXISTS categories_select ON public.categories;
CREATE POLICY categories_select
ON public.categories
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS categories_insert ON public.categories;
CREATE POLICY categories_insert
ON public.categories
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS categories_update ON public.categories;
CREATE POLICY categories_update
ON public.categories
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS categories_delete ON public.categories;
CREATE POLICY categories_delete
ON public.categories
FOR DELETE
USING (user_id = auth.uid());

-- Auto-assign user_id from auth.uid() on INSERT so clients don't send it
CREATE OR REPLACE FUNCTION public.categories_set_user_id()
RETURNS trigger AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_user_id_on_categories ON public.categories;
CREATE TRIGGER set_user_id_on_categories
BEFORE INSERT ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.categories_set_user_id();

-- Keep updated_at fresh on UPDATE
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger AS $$
BEGIN
    -- clock_timestamp() returns the actual wall-clock time, not the transaction start time
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_on_categories ON public.categories;
CREATE TRIGGER set_updated_at_on_categories
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
