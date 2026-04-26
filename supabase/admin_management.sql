create extension if not exists pgcrypto;

create table if not exists public.app_plans (
  code text primary key check (code in ('free', 'starter', 'pro', 'team', 'enterprise')),
  name text not null,
  description text not null default '',
  price_monthly_usd numeric not null default 0,
  ai_daily_limit integer not null default 0,
  deep_daily_limit integer not null default 0,
  scanner_daily_limit integer not null default 0,
  storage_mb integer not null default 64,
  seats integer not null default 1,
  support_sla_hours integer not null default 72,
  features text[] not null default '{}',
  recommended boolean not null default false,
  billing_provider text not null default 'none' check (billing_provider in ('none', 'admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual')),
  billing_product_id text not null default '',
  billing_price_id text not null default '',
  revenuecat_entitlement_id text not null default '',
  market text not null default 'global' check (market in ('indonesia', 'brunei', 'global', 'unknown')),
  display_price text not null default '',
  checkout_mode text not null default 'disabled' check (checkout_mode in ('disabled', 'external', 'stripe_checkout', 'play_billing', 'app_store', 'manual_invoice')),
  payment_methods text[] not null default '{}',
  display_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_plans
  add column if not exists billing_provider text not null default 'none' check (billing_provider in ('none', 'admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual')),
  add column if not exists billing_product_id text not null default '',
  add column if not exists billing_price_id text not null default '',
  add column if not exists revenuecat_entitlement_id text not null default '',
  add column if not exists market text not null default 'global' check (market in ('indonesia', 'brunei', 'global', 'unknown')),
  add column if not exists display_price text not null default '',
  add column if not exists checkout_mode text not null default 'disabled' check (checkout_mode in ('disabled', 'external', 'stripe_checkout', 'play_billing', 'app_store', 'manual_invoice')),
  add column if not exists payment_methods text[] not null default '{}';

insert into public.app_plans (
  code,
  name,
  description,
  price_monthly_usd,
  ai_daily_limit,
  deep_daily_limit,
  scanner_daily_limit,
  storage_mb,
  seats,
  support_sla_hours,
  features,
  recommended,
  billing_provider,
  billing_product_id,
  billing_price_id,
  revenuecat_entitlement_id,
  market,
  display_price,
  checkout_mode,
  payment_methods,
  display_order
) values
  ('free', 'Free', 'Protected trial surface for app review and new users.', 0, 12, 2, 2, 64, 1, 72, array['Chat', 'basic scanner', 'local collection'], false, 'none', '', '', '', 'global', 'Free', 'disabled', '{}', 10),
  ('starter', 'Starter', 'Entry paid plan for serious home baristas.', 4.99, 60, 10, 12, 512, 1, 48, array['Higher AI quota', 'AI Brew journal', 'scanner history'], false, 'revenuecat', 'baristachaw_starter_monthly', 'STRIPE_PRICE_STARTER_MONTHLY', 'starter', 'global', '$4.99 / Rp79k / B$7 monthly', 'external', array['Google Play', 'App Store', 'Stripe Checkout'], 20),
  ('pro', 'Pro', 'Full workflow plan for baristas and creators.', 9.99, 180, 40, 60, 2048, 1, 24, array['Deep mode', 'latte art edit', 'advanced collections', 'priority AI'], true, 'revenuecat', 'baristachaw_pro_monthly', 'STRIPE_PRICE_PRO_MONTHLY', 'pro', 'global', '$9.99 / Rp159k / B$14 monthly', 'external', array['Google Play', 'App Store', 'Stripe Checkout'], 30),
  ('team', 'Team', 'Cafe teams with shared operations and training.', 29.99, 800, 160, 240, 10240, 8, 12, array['Team seats', 'training notes', 'manager controls', 'audit export'], false, 'revenuecat', 'baristachaw_team_monthly', 'STRIPE_PRICE_TEAM_MONTHLY', 'team', 'global', '$29.99 / Rp479k / B$42 monthly', 'external', array['Google Play', 'App Store', 'Stripe Checkout', 'Manual invoice'], 40),
  ('enterprise', 'Enterprise', 'Custom commercial deployment and support.', 0, 5000, 1000, 1000, 102400, 50, 4, array['Custom quota', 'dedicated support', 'SLA review', 'private rollout'], false, 'manual', 'baristachaw_enterprise', '', 'enterprise', 'global', 'Custom invoice', 'manual_invoice', array['Manual invoice', 'Bank transfer'], 50)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_monthly_usd = excluded.price_monthly_usd,
  ai_daily_limit = excluded.ai_daily_limit,
  deep_daily_limit = excluded.deep_daily_limit,
  scanner_daily_limit = excluded.scanner_daily_limit,
  storage_mb = excluded.storage_mb,
  seats = excluded.seats,
  support_sla_hours = excluded.support_sla_hours,
  features = excluded.features,
  recommended = excluded.recommended,
  billing_provider = excluded.billing_provider,
  billing_product_id = excluded.billing_product_id,
  billing_price_id = excluded.billing_price_id,
  revenuecat_entitlement_id = excluded.revenuecat_entitlement_id,
  market = excluded.market,
  display_price = excluded.display_price,
  checkout_mode = excluded.checkout_mode,
  payment_methods = excluded.payment_methods,
  display_order = excluded.display_order,
  updated_at = now();

create table if not exists public.app_users (
  id text primary key,
  email text not null,
  display_name text not null default '',
  username text not null default '',
  avatar_url text not null default '',
  provider text not null default 'unknown' check (provider in ('google', 'apple', 'email', 'guest', 'unknown')),
  role text not null default 'user' check (role in ('owner', 'admin', 'support', 'analyst', 'user')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'suspended', 'deleted')),
  plan_code text not null default 'free' references public.app_plans(code),
  locale text,
  platform text check (platform in ('web', 'pwa', 'mobile', 'unknown')),
  country text,
  billing_status text not null default 'none' check (billing_status in ('none', 'active', 'trialing', 'past_due', 'cancelled', 'expired', 'refunded')),
  billing_provider text not null default 'none' check (billing_provider in ('none', 'admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual')),
  billing_market text not null default 'unknown' check (billing_market in ('indonesia', 'brunei', 'global', 'unknown')),
  billing_customer_id text not null default '',
  billing_subscription_id text not null default '',
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  billing_last_event_at timestamptz,
  payment_action_required boolean not null default false,
  last_seen_at timestamptz not null default now(),
  usage_today jsonb not null default '{}'::jsonb,
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  flags text[] not null default '{}',
  notes text not null default '',
  account_recovery_status text not null default 'none' check (account_recovery_status in ('none', 'requested', 'verified', 'resolved', 'rejected')),
  support_note text not null default '',
  support_locked_until timestamptz,
  last_recovery_request_at timestamptz,
  password_reset_required boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users
  add column if not exists username text not null default '',
  add column if not exists account_recovery_status text not null default 'none' check (account_recovery_status in ('none', 'requested', 'verified', 'resolved', 'rejected')),
  add column if not exists support_note text not null default '',
  add column if not exists support_locked_until timestamptz,
  add column if not exists last_recovery_request_at timestamptz,
  add column if not exists password_reset_required boolean not null default false,
  add column if not exists billing_status text not null default 'none' check (billing_status in ('none', 'active', 'trialing', 'past_due', 'cancelled', 'expired', 'refunded')),
  add column if not exists billing_provider text not null default 'none' check (billing_provider in ('none', 'admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual')),
  add column if not exists billing_market text not null default 'unknown' check (billing_market in ('indonesia', 'brunei', 'global', 'unknown')),
  add column if not exists billing_customer_id text not null default '',
  add column if not exists billing_subscription_id text not null default '',
  add column if not exists billing_period_start timestamptz,
  add column if not exists billing_period_end timestamptz,
  add column if not exists billing_last_event_at timestamptz,
  add column if not exists payment_action_required boolean not null default false;

create table if not exists public.app_usage_daily (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.app_users(id) on delete cascade,
  usage_date date not null default current_date,
  ai_requests integer not null default 0,
  deep_requests integer not null default 0,
  scanner_runs integer not null default 0,
  collection_writes integer not null default 0,
  image_edits integer not null default 0,
  speech_seconds integer not null default 0,
  total_tokens integer not null default 0,
  cost_usd numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.app_users(id) on delete cascade,
  plan_code text not null references public.app_plans(code),
  source text not null default 'admin' check (source in ('admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'cancelled', 'expired', 'refunded')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  external_customer_id text,
  external_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_entitlements
  drop constraint if exists user_entitlements_source_check;

alter table public.user_entitlements
  add constraint user_entitlements_source_check
  check (source in ('admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual'));

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.app_users(id) on delete cascade,
  requested_plan_code text not null references public.app_plans(code),
  receipt_url text not null default '',
  receipt_reference text not null default '',
  status text not null default 'queued' check (status in ('queued', 'auto_accepted', 'manual_review', 'rejected', 'applied')),
  reviewed_by text,
  reviewed_at timestamptz,
  apply_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_feature_flags (
  key text primary key,
  label text not null,
  status text not null default 'available' check (status in ('available', 'maintenance', 'disabled')),
  message text not null default '',
  surfaces text[] not null default array['global'],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_feature_flags (key, label, status, message, surfaces) values
  ('global_app', 'Global App', 'available', '', array['global']),
  ('chat', 'AI Chat', 'available', '', array['web', 'pwa', 'mobile']),
  ('scanner', 'Vision Scanner', 'available', '', array['web', 'pwa', 'mobile']),
  ('ai_brew', 'AI Brew', 'available', '', array['web', 'pwa', 'mobile']),
  ('collection', 'Collection', 'available', '', array['web', 'pwa', 'mobile']),
  ('admin_console', 'Admin Console', 'available', '', array['admin'])
on conflict (key) do update set
  label = excluded.label,
  surfaces = excluded.surfaces,
  updated_at = now();

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text,
  actor_email text,
  target_type text not null default 'platform',
  target_id text not null default '',
  action text not null,
  detail text not null default '',
  before jsonb,
  after jsonb,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  request_id text,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_users_email_idx on public.app_users (lower(email));
create index if not exists app_users_username_idx on public.app_users (lower(username));
create unique index if not exists app_users_username_unique_idx on public.app_users (lower(username)) where username <> '';
create index if not exists app_users_status_plan_idx on public.app_users (status, plan_code, updated_at desc);
create index if not exists app_users_role_idx on public.app_users (role, updated_at desc);
create index if not exists app_users_recovery_idx on public.app_users (account_recovery_status, updated_at desc);
create index if not exists app_users_billing_idx on public.app_users (billing_status, billing_provider, updated_at desc);
create index if not exists app_users_payment_action_idx on public.app_users (payment_action_required, updated_at desc) where payment_action_required = true;
create index if not exists app_usage_daily_user_date_idx on public.app_usage_daily (user_id, usage_date desc);
create index if not exists user_entitlements_user_status_idx on public.user_entitlements (user_id, status, updated_at desc);
create index if not exists user_entitlements_external_subscription_idx on public.user_entitlements (external_subscription_id) where external_subscription_id is not null;
create index if not exists payment_receipts_user_status_idx on public.payment_receipts (user_id, status, updated_at desc);
create index if not exists payment_receipts_review_queue_idx on public.payment_receipts (status, created_at desc) where status in ('queued', 'auto_accepted', 'manual_review');
create index if not exists app_feature_flags_status_idx on public.app_feature_flags (status, updated_at desc);
create index if not exists admin_audit_events_created_idx on public.admin_audit_events (created_at desc);
create index if not exists admin_audit_events_target_idx on public.admin_audit_events (target_type, target_id, created_at desc);

create or replace function public.set_admin_management_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_plans_updated_at on public.app_plans;
create trigger app_plans_updated_at
before update on public.app_plans
for each row execute function public.set_admin_management_updated_at();

drop trigger if exists app_users_updated_at on public.app_users;
create trigger app_users_updated_at
before update on public.app_users
for each row execute function public.set_admin_management_updated_at();

drop trigger if exists app_usage_daily_updated_at on public.app_usage_daily;
create trigger app_usage_daily_updated_at
before update on public.app_usage_daily
for each row execute function public.set_admin_management_updated_at();

drop trigger if exists user_entitlements_updated_at on public.user_entitlements;
create trigger user_entitlements_updated_at
before update on public.user_entitlements
for each row execute function public.set_admin_management_updated_at();

drop trigger if exists payment_receipts_updated_at on public.payment_receipts;
create trigger payment_receipts_updated_at
before update on public.payment_receipts
for each row execute function public.set_admin_management_updated_at();

drop trigger if exists app_feature_flags_updated_at on public.app_feature_flags;
create trigger app_feature_flags_updated_at
before update on public.app_feature_flags
for each row execute function public.set_admin_management_updated_at();

alter table public.app_plans enable row level security;
alter table public.app_users enable row level security;
alter table public.app_usage_daily enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.app_feature_flags enable row level security;
alter table public.admin_audit_events enable row level security;

drop policy if exists "service role manages app plans" on public.app_plans;
create policy "service role manages app plans" on public.app_plans
  for all to service_role using (true) with check (true);

drop policy if exists "service role manages app users" on public.app_users;
create policy "service role manages app users" on public.app_users
  for all to service_role using (true) with check (true);

drop policy if exists "service role manages app usage" on public.app_usage_daily;
create policy "service role manages app usage" on public.app_usage_daily
  for all to service_role using (true) with check (true);

drop policy if exists "service role manages entitlements" on public.user_entitlements;
create policy "service role manages entitlements" on public.user_entitlements
  for all to service_role using (true) with check (true);

drop policy if exists "service role manages payment receipts" on public.payment_receipts;
create policy "service role manages payment receipts" on public.payment_receipts
  for all to service_role using (true) with check (true);

drop policy if exists "service role manages feature flags" on public.app_feature_flags;
create policy "service role manages feature flags" on public.app_feature_flags
  for all to service_role using (true) with check (true);

drop policy if exists "service role manages admin audit" on public.admin_audit_events;
create policy "service role manages admin audit" on public.admin_audit_events
  for all to service_role using (true) with check (true);

drop policy if exists "authenticated users read own profile" on public.app_users;
create policy "authenticated users read own profile" on public.app_users
  for select to authenticated
  using (id = auth.uid()::text);

drop policy if exists "authenticated users read own usage" on public.app_usage_daily;
create policy "authenticated users read own usage" on public.app_usage_daily
  for select to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists "authenticated users read own entitlements" on public.user_entitlements;
create policy "authenticated users read own entitlements" on public.user_entitlements
  for select to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists "authenticated users read own payment receipts" on public.payment_receipts;
create policy "authenticated users read own payment receipts" on public.payment_receipts
  for select to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists "authenticated users create own payment receipts" on public.payment_receipts;
create policy "authenticated users create own payment receipts" on public.payment_receipts
  for insert to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists "authenticated users read feature flags" on public.app_feature_flags;
create policy "authenticated users read feature flags" on public.app_feature_flags
  for select to authenticated
  using (true);

do $$
begin
  alter publication supabase_realtime add table public.app_users;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.admin_audit_events;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.user_entitlements;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.payment_receipts;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.app_plans;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.app_feature_flags;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
