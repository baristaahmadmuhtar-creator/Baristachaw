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
    'ai_quota_ledger',
    'ai_provider_events',
    'app_rate_limits',
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
  'ai_quota_ledger_table' as check_name,
  count(*) as found_count
from information_schema.tables
where table_schema = 'public'
  and table_name = 'ai_quota_ledger';

select
  'ai_provider_events_table' as check_name,
  count(*) as found_count
from information_schema.tables
where table_schema = 'public'
  and table_name = 'ai_provider_events';

select
  'app_rate_limits_table' as check_name,
  count(*) as found_count
from information_schema.tables
where table_schema = 'public'
  and table_name = 'app_rate_limits';

select
  'reserve_app_quota_rpc' as check_name,
  count(*) as found_count
from information_schema.routines
where specific_schema = 'public'
  and routine_name = 'reserve_app_quota'
  and routine_type = 'FUNCTION';

select
  'commit_app_quota_rpc' as check_name,
  count(*) as found_count
from information_schema.routines
where specific_schema = 'public'
  and routine_name = 'commit_app_quota'
  and routine_type = 'FUNCTION';

select
  'refund_app_quota_rpc' as check_name,
  count(*) as found_count
from information_schema.routines
where specific_schema = 'public'
  and routine_name = 'refund_app_quota'
  and routine_type = 'FUNCTION';

select
  'consume_app_quota_rpc' as check_name,
  count(*) as found_count
from information_schema.routines
where specific_schema = 'public'
  and routine_name = 'consume_app_quota'
  and routine_type = 'FUNCTION';

select
  routine_schema,
  routine_name,
  data_type,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('reserve_app_quota', 'commit_app_quota', 'refund_app_quota', 'consume_app_quota');

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
    'ai_quota_ledger',
    'ai_provider_events',
    'app_rate_limits',
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
  coalesce(metadata->>'manualStatus', status) as manual_status,
  count(*) as receipt_count
from public.payment_receipts
group by status, coalesce(metadata->>'manualStatus', status)
order by status, manual_status;

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
