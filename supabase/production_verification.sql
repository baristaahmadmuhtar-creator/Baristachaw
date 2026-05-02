-- Baristachaw production verification queries.
-- Run after admin_management.sql, catalog_platform.sql, and ai_brew_recipe_library.sql.

select
  'tables' as check_name,
  count(*) as found_count
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'app_plans',
    'app_users',
    'app_usage_daily',
    'user_entitlements',
    'payment_receipts',
    'app_feature_flags',
    'admin_audit_events',
    'waters',
    'water_sources',
    'drippers',
    'dripper_sources',
    'grinders',
    'grinder_sources',
    'brand_suggestions',
    'catalog_review_queue',
    'ingest_runs',
    'ai_brew_journal',
    'recipe_library_items'
  );

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'app_plans',
    'app_users',
    'app_usage_daily',
    'user_entitlements',
    'payment_receipts',
    'app_feature_flags',
    'admin_audit_events',
    'waters',
    'water_sources',
    'drippers',
    'dripper_sources',
    'grinders',
    'grinder_sources',
    'brand_suggestions',
    'catalog_review_queue',
    'ingest_runs',
    'ai_brew_journal',
    'recipe_library_items'
  )
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select
  grantee,
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated', 'service_role')
group by grantee, table_name
order by table_name, grantee;

select
  code,
  name,
  price_monthly_usd,
  ai_daily_limit,
  scanner_daily_limit,
  billing_provider,
  checkout_mode,
  display_price
from public.app_plans
order by display_order;

select
  status,
  count(*) as receipt_count
from public.payment_receipts
group by status
order by status;

select
  review_status,
  count(*) as catalog_review_count
from public.catalog_review_queue
group by review_status
order by review_status;

select
  'ai_brew_journal' as table_name,
  count(*) as row_count
from public.ai_brew_journal
union all
select
  'recipe_library_items' as table_name,
  count(*) as row_count
from public.recipe_library_items;
