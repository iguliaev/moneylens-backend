drop trigger if exists "set_user_id_on_bank_accounts" on "public"."bank_accounts";

drop trigger if exists "set_user_id_on_categories" on "public"."categories";

drop trigger if exists "set_user_id_on_tags" on "public"."tags";

drop function if exists "public"."bank_accounts_set_user_id"();

drop function if exists "public"."categories_set_user_id"();

drop function if exists "public"."tags_set_user_id"();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.tg_set_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE TRIGGER set_user_id_on_bank_accounts BEFORE INSERT ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION tg_set_user_id();

CREATE TRIGGER set_user_id_on_categories BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION tg_set_user_id();

CREATE TRIGGER set_user_id_on_tags BEFORE INSERT ON public.tags FOR EACH ROW EXECUTE FUNCTION tg_set_user_id();


