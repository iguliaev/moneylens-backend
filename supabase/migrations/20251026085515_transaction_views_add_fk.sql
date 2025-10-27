drop view if exists "public"."transactions_earn";

drop view if exists "public"."transactions_save";

drop view if exists "public"."transactions_spend";

create or replace view "public"."transactions_earn"
with(security_invoker = true) as
  SELECT t.id,
    t.user_id,
    t.date,
    t.type,
    t.category_id,
    COALESCE(t.category, c.name) AS category,
    t.bank_account_id,
    COALESCE(t.bank_account, b.name) AS bank_account,
    t.amount,
    t.tags,
    t.notes,
    t.created_at,
    t.updated_at
   FROM ((transactions t
     LEFT JOIN bank_accounts b ON ((t.bank_account_id = b.id)))
     LEFT JOIN categories c ON ((t.category_id = c.id)))
  WHERE (t.type = 'earn'::transaction_type);


create or replace view "public"."transactions_save"
with(security_invoker = true) as
  SELECT t.id,
    t.user_id,
    t.date,
    t.type,
    t.category_id,
    COALESCE(t.category, c.name) AS category,
    t.bank_account_id,
    COALESCE(t.bank_account, b.name) AS bank_account,
    t.amount,
    t.tags,
    t.notes,
    t.created_at,
    t.updated_at
   FROM ((transactions t
     LEFT JOIN bank_accounts b ON ((t.bank_account_id = b.id)))
     LEFT JOIN categories c ON ((t.category_id = c.id)))
  WHERE (t.type = 'save'::transaction_type);


create or replace view "public"."transactions_spend"
with(security_invoker = true) as
  SELECT t.id,
    t.user_id,
    t.date,
    t.type,
    t.category_id,
    COALESCE(t.category, c.name) AS category,
    t.bank_account_id,
    COALESCE(t.bank_account, b.name) AS bank_account,
    t.amount,
    t.tags,
    t.notes,
    t.created_at,
    t.updated_at
   FROM ((transactions t
     LEFT JOIN bank_accounts b ON ((t.bank_account_id = b.id)))
     LEFT JOIN categories c ON ((t.category_id = c.id)))
  WHERE (t.type = 'spend'::transaction_type);



