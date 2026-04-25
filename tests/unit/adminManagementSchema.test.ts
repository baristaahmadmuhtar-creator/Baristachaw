import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const schemaPath = path.resolve('supabase/admin_management.sql');

function schemaText() {
  return fs.readFileSync(schemaPath, 'utf8');
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
  assert.match(sql, /source in \('admin', 'google_play', 'app_store', 'stripe', 'revenuecat', 'manual'\)/i);
  assert.match(sql, /create index if not exists user_entitlements_external_subscription_idx/i);
  assert.match(sql, /alter publication supabase_realtime add table public\.user_entitlements/i);
  assert.match(sql, /alter publication supabase_realtime add table public\.app_plans/i);
});
