import fs from 'node:fs';
import path from 'node:path';
import { parse as parseEnv } from 'dotenv';

const ROOT = process.cwd();
const ENV_FILES = ['.vercel/.env.production.local', '.env.production.local', '.env.local'];

for (const file of ENV_FILES) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) {
    const parsed = parseEnv(fs.readFileSync(fullPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (!String(value || '').trim()) continue;
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function readEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function joinUrl(baseUrl, pathName) {
  return `${baseUrl.replace(/\/+$/, '')}${pathName.startsWith('/') ? pathName : `/${pathName}`}`;
}

async function main() {
  const supabaseUrl = readEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to verify production quota RPCs.');
  }

  const requestId = `baristachaw-quota-verify-${Date.now()}`;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  async function callRpc(name, body) {
    const response = await fetch(joinUrl(supabaseUrl, `/rest/v1/rpc/${name}`), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const message = typeof payload?.message === 'string' ? payload.message : text.slice(0, 180);
      throw new Error(`${name} RPC verification failed: http=${response.status} ${message}`);
    }

    const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
    return rows[0] || {};
  }

  const reserved = await callRpc('reserve_app_quota', {
    p_request_id: requestId,
    p_user_id: '__baristachaw_rpc_verify__',
    p_feature: 'ai',
    p_amount: 1,
    p_route: 'verify',
    p_action: 'supabase_quota_verify',
    p_mode: 'mock',
  });

  if (typeof reserved.allowed !== 'boolean' || typeof reserved.reason !== 'string') {
    throw new Error('reserve_app_quota RPC returned an unexpected payload shape.');
  }

  if (reserved.allowed) {
    const refunded = await callRpc('refund_app_quota', {
      p_request_id: requestId,
      p_reason: 'verification_refund',
    });
    if (refunded.refunded !== true) {
      throw new Error('refund_app_quota RPC returned an unexpected payload shape.');
    }
  }

  const legacyResponse = await fetch(joinUrl(supabaseUrl, '/rest/v1/rpc/consume_app_quota'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_user_id: '__baristachaw_rpc_verify__',
      p_feature: 'ai',
      p_amount: 1,
      p_total_tokens: 0,
      p_cost_usd: 0,
    }),
  });

  const text = await legacyResponse.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!legacyResponse.ok) {
    const message = typeof payload?.message === 'string' ? payload.message : text.slice(0, 180);
    throw new Error(`consume_app_quota RPC verification failed: http=${legacyResponse.status} ${message}`);
  }

  const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];
  const first = rows[0] || {};
  if (typeof first.allowed !== 'boolean' || typeof first.reason !== 'string') {
    throw new Error('consume_app_quota RPC returned an unexpected payload shape.');
  }

  console.log(`[supabase:quota] reserve/refund RPCs verified (${reserved.reason}); legacy consume_app_quota verified (${first.reason}).`);
}

main().catch((error) => {
  console.error('[supabase:quota] failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
