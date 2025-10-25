-- Keep updated_at fresh on UPDATE
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- clock_timestamp() returns the actual wall-clock time, not the transaction start time
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

-- Auto-assign user_id from auth.uid() on INSERT so clients don't send it
CREATE OR REPLACE FUNCTION public.tg_set_user_id()
RETURNS trigger
LANGUAGE plpgsql
-- Harden search_path (Option: empty) so only fully-qualified names resolve.
SET search_path = ''
AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;