-- Enforce that transaction type matches category type using a trigger
CREATE OR REPLACE FUNCTION check_transaction_category_type()
RETURNS TRIGGER
LANGUAGE plpgsql
-- Harden search_path: restrict to pg_catalog; schema-qualify table references.
SET search_path = ''
AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    IF NEW.type IS DISTINCT FROM (SELECT type FROM public.categories WHERE id = NEW.category_id) THEN
      RAISE EXCEPTION 'Transaction type (%) does not match category type (%)', NEW.type, (SELECT type FROM public.categories WHERE id = NEW.category_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER transaction_category_type_trigger
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION check_transaction_category_type();
