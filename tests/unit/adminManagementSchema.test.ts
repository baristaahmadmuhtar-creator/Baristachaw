import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const schemaPath = path.resolve('supabase/admin_management.sql');
const productionVerificationPath = path.resolve('supabase/production_verification.sql');

function schemaText() {
  return fs.readFileSync(schemaPath, 'utf8');
}

function productionVerificationText() {
  return fs.readFileSync(productionVerificationPath, 'utf8');
}

test('admin management schema includes billing-ready plan and user columns', () => {
  const sql = schemaText();
  assert.match(sql, /create table if not exists public\.app_plans/i);
  assert.match(sql, /billing_provider text not null default 'none'/i);
  assert.match(sql, /billing_product_id text not null default ''/i);
  assert.match(sql, /revenuecat_entitlement_id text not null default ''/i);
  assert.match(sql, /payment_methods text\[\] not null default/i);
  assert.match(sql, /create table if not exists public\.app_users/i);
  assert.match(sql, /billing_status text not null default 'none'/i);
  assert.match(sql, /billing_market text not null default 'unknown'/i);
  assert.match(sql, /payment_action_required boolean not null default false/i);
});

test('admin management schema supports app store and realtime entitlement sync', () => {
  const sql = schemaText();
  assert.match(sql, /source in \('admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual', 'midtrans', 'xendit'\)/i);
  assert.match(sql, /create index if not exists user_entitlements_external_subscription_idx/i);
  assert.match(sql, /alter publication supabase_realtime add table public\.user_entitlements/i);
  assert.match(sql, /alter publication supabase_realtime add table public\.app_plans/i);
});

test('admin management schema includes durable AI quota reservation ledgers', () => {
  const sql = schemaText();
  assert.match(sql, /create table if not exists public\.ai_quota_ledger/i);
  assert.match(sql, /request_id text primary key/i);
  assert.match(sql, /reservation_status text not null/i);
  assert.match(sql, /charged_units integer not null default 0/i);
  assert.match(sql, /create table if not exists public\.ai_provider_events/i);
  assert.match(sql, /attempt_order integer not null/i);
  assert.match(sql, /aborted boolean not null default false/i);
  assert.match(sql, /create table if not exists public\.app_rate_limits/i);
  assert.match(sql, /bucket_key text primary key/i);
});

test('admin management schema includes reservation commit refund quota RPCs', () => {
  const sql = schemaText();
  assert.match(sql, /create or replace function public\.reserve_app_quota/i);
  assert.match(sql, /create or replace function public\.commit_app_quota/i);
  assert.match(sql, /create or replace function public\.refund_app_quota/i);
  assert.match(sql, /create or replace function public\.consume_app_quota/i);
  assert.match(sql, /security definer\s+set search_path = ''/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /ai_requests = ai_requests \+ v_amount/i);
  assert.match(sql, /deep_requests = deep_requests \+ v_amount/i);
  assert.match(sql, /scanner_runs = scanner_runs \+ v_amount/i);
  assert.match(sql, /insert into public\.ai_quota_ledger/i);
  assert.match(sql, /update public\.ai_quota_ledger/i);
  assert.match(sql, /reservation_status = 'committed'/i);
  assert.match(sql, /reservation_status = 'refunded'/i);
  assert.match(sql, /grant execute on function public\.reserve_app_quota/i);
  assert.match(sql, /grant execute on function public\.commit_app_quota/i);
  assert.match(sql, /grant execute on function public\.refund_app_quota/i);
  assert.match(sql, /grant execute on function public\.consume_app_quota/i);
});

test('production verification explicitly checks quota ledgers and RPCs', () => {
  const sql = productionVerificationText();
  assert.match(sql, /ai_quota_ledger_table/i);
  assert.match(sql, /ai_provider_events_table/i);
  assert.match(sql, /app_rate_limits_table/i);
  assert.match(sql, /reserve_app_quota_rpc/i);
  assert.match(sql, /commit_app_quota_rpc/i);
  assert.match(sql, /refund_app_quota_rpc/i);
  assert.match(sql, /consume_app_quota_rpc/i);
  assert.match(sql, /information_schema\.routines/i);
  assert.match(sql, /routine_name = 'reserve_app_quota'/i);
  assert.match(sql, /routine_name = 'commit_app_quota'/i);
  assert.match(sql, /routine_name = 'refund_app_quota'/i);
  assert.match(sql, /routine_name = 'consume_app_quota'/i);
});
