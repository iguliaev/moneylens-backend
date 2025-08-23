drop view if exists "public"."view_monthly_category_totals";

drop view if exists "public"."view_monthly_tagged_type_totals";

drop view if exists "public"."view_monthly_totals";

drop view if exists "public"."view_tagged_type_totals";

drop view if exists "public"."view_yearly_category_totals";

drop view if exists "public"."view_yearly_tagged_type_totals";

drop view if exists "public"."view_yearly_totals";

create or replace view "public"."view_monthly_category_totals" as  SELECT user_id,
    date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    category,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)), category, type
  ORDER BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)) DESC, category, type;


create or replace view "public"."view_monthly_tagged_type_totals" as  SELECT user_id,
    date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    type,
    tags,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)), type, tags;


create or replace view "public"."view_monthly_totals" as  SELECT user_id,
    date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)), type
  ORDER BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone)) DESC, type;


create or replace view "public"."view_tagged_type_totals" as  SELECT user_id,
    type,
    tags,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, type, tags;


create or replace view "public"."view_yearly_category_totals" as  SELECT user_id,
    date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    category,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)), category, type
  ORDER BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)) DESC, category, type;


create or replace view "public"."view_yearly_tagged_type_totals" as  SELECT user_id,
    date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    type,
    tags,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)), type, tags;


create or replace view "public"."view_yearly_totals" as  SELECT user_id,
    date_trunc('year'::text, (date)::timestamp with time zone) AS year,
    type,
    sum(amount) AS total
   FROM transactions
  GROUP BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)), type
  ORDER BY user_id, (date_trunc('year'::text, (date)::timestamp with time zone)) DESC, type;



