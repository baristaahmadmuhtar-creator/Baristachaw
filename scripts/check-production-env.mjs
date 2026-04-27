import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function parseEnvFile(relativePath) {
  const fullPath = resolve(root, relativePath);
  if (!existsSync(fullPath)) return {};

  const parsed = {};
  const raw = readFileSync(fullPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    parsed[key] = value;
  }
  return parsed;
}

function loadEnv(paths) {
  return Object.assign({}, ...paths.map(parseEnvFile), process.env);
}

function hasValue(env, key) {
  return Boolean(String(env[key] || '').trim());
}

function firstValue(env, keys) {
  for (const key of keys) {
    const value = String(env[key] || '').trim();
    if (value) return { key, value };
  }
  return null;
}

function isHttpsUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function addMissing(list, env, keys, label, details = '') {
  if (!firstValue(env, keys)) {
    list.push({ label, keys, details });
  }
}

function checkUrl(list, env, keys, label) {
  const item = firstValue(env, keys);
  if (!item) return;
  if (!isHttpsUrl(item.value)) {
    list.push({ label, keys: [item.key], details: 'harus URL https production' });
  }
}

const serverEnv = loadEnv(['.env.production.local', '.env.local', '.env']);
const mobileEnv = loadEnv(['apps/mobile/.env']);

const errors = [];
const warnings = [];

addMissing(errors, serverEnv, ['APP_URL'], 'APP_URL');
addMissing(errors, serverEnv, ['JWT_SECRET'], 'JWT_SECRET', 'minimal 32 karakter random');
addMissing(errors, serverEnv, ['ADMIN_EMAILS'], 'ADMIN_EMAILS', 'email owner/admin dipisah koma');
addMissing(errors, serverEnv, ['SUPABASE_URL'], 'SUPABASE_URL');
addMissing(errors, serverEnv, ['SUPABASE_SERVICE_ROLE_KEY'], 'SUPABASE_SERVICE_ROLE_KEY', 'server-only, jangan pakai prefix public');
addMissing(errors, serverEnv, ['SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'], 'SUPABASE public key');
addMissing(errors, serverEnv, ['GEMINI_API_KEY'], 'GEMINI_API_KEY');

checkUrl(errors, serverEnv, ['APP_URL'], 'APP_URL');
checkUrl(errors, serverEnv, ['SUPABASE_URL'], 'SUPABASE_URL');

const jwtSecret = String(serverEnv.JWT_SECRET || '');
if (jwtSecret && jwtSecret.length < 32) {
  errors.push({ label: 'JWT_SECRET terlalu pendek', keys: ['JWT_SECRET'], details: 'gunakan 32 karakter atau lebih' });
}

if (hasValue(serverEnv, 'VITE_SUPABASE_SERVICE_ROLE_KEY') || hasValue(serverEnv, 'EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')) {
  errors.push({
    label: 'Service role key bocor ke env publik',
    keys: ['VITE_SUPABASE_SERVICE_ROLE_KEY', 'EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'],
    details: 'hapus env publik ini dan rotasi service role key',
  });
}

addMissing(warnings, serverEnv, ['ALLOWED_ORIGINS'], 'ALLOWED_ORIGINS', 'disarankan sama dengan domain production');
addMissing(warnings, serverEnv, ['HEALTHCHECK_TOKEN'], 'HEALTHCHECK_TOKEN', 'disarankan untuk deep health check');
addMissing(warnings, serverEnv, ['SENTRY_DSN'], 'SENTRY_DSN', 'disarankan untuk error monitoring server');

const checkoutKeys = [
  'BILLING_CHECKOUT_URL',
  'BILLING_CHECKOUT_URL_STARTER',
  'BILLING_CHECKOUT_URL_PRO',
  'BILLING_CHECKOUT_URL_TEAM',
  'STRIPE_CHECKOUT_URL_STARTER',
  'STRIPE_CHECKOUT_URL_PRO',
  'STRIPE_CHECKOUT_URL_TEAM',
  'REVENUECAT_CHECKOUT_URL_STARTER',
  'REVENUECAT_CHECKOUT_URL_PRO',
  'REVENUECAT_CHECKOUT_URL_TEAM',
];
if (!firstValue(serverEnv, checkoutKeys)) {
  warnings.push({
    label: 'Checkout URL belum disiapkan',
    keys: checkoutKeys,
    details: 'upgrade plan akan tetap fallback ke manual/not configured sampai URL provider dipasang',
  });
}

const portalKeys = ['BILLING_PORTAL_URL', 'STRIPE_CUSTOMER_PORTAL_URL', 'REVENUECAT_CUSTOMER_CENTER_URL'];
if (!firstValue(serverEnv, portalKeys)) {
  warnings.push({
    label: 'Billing portal belum disiapkan',
    keys: portalKeys,
    details: 'user belum bisa self-service kelola langganan',
  });
}

const providerSecretKeys = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MIDTRANS_SERVER_KEY',
  'MIDTRANS_WEBHOOK_SECRET',
  'XENDIT_SECRET_KEY',
  'XENDIT_WEBHOOK_TOKEN',
  'REVENUECAT_API_KEY',
  'REVENUECAT_WEBHOOK_SECRET',
];
if (!firstValue(serverEnv, providerSecretKeys)) {
  warnings.push({
    label: 'Secret payment provider belum ada',
    keys: providerSecretKeys,
    details: 'boleh untuk MVP link manual, wajib sebelum webhook live',
  });
}

addMissing(errors, mobileEnv, ['EXPO_PUBLIC_API_BASE_URL'], 'Mobile EXPO_PUBLIC_API_BASE_URL');
addMissing(errors, mobileEnv, ['EXPO_PUBLIC_WEB_APP_URL'], 'Mobile EXPO_PUBLIC_WEB_APP_URL');
addMissing(errors, mobileEnv, ['EXPO_PUBLIC_APP_SCHEME'], 'Mobile EXPO_PUBLIC_APP_SCHEME');
addMissing(errors, mobileEnv, ['EXPO_PUBLIC_SUPABASE_URL'], 'Mobile EXPO_PUBLIC_SUPABASE_URL');
addMissing(errors, mobileEnv, ['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'], 'Mobile Supabase public key');

checkUrl(errors, mobileEnv, ['EXPO_PUBLIC_API_BASE_URL'], 'Mobile API base URL');
checkUrl(errors, mobileEnv, ['EXPO_PUBLIC_WEB_APP_URL'], 'Mobile web app URL');
checkUrl(errors, mobileEnv, ['EXPO_PUBLIC_SUPABASE_URL'], 'Mobile Supabase URL');

if (String(mobileEnv.EXPO_PUBLIC_MOBILE_UI_MODE || '').trim() !== 'web_parity') {
  warnings.push({
    label: 'Mobile UI mode bukan web_parity',
    keys: ['EXPO_PUBLIC_MOBILE_UI_MODE'],
    details: 'launch Android parity saat ini memakai web_parity',
  });
}

if (!hasValue(mobileEnv, 'EXPO_PUBLIC_SENTRY_DSN')) {
  warnings.push({
    label: 'Mobile Sentry DSN belum ada',
    keys: ['EXPO_PUBLIC_SENTRY_DSN'],
    details: 'crash report mobile belum aktif',
  });
}

console.log('Baristachaw production environment check');
console.log(`Server env sources: .env.production.local, .env.local, .env, process.env`);
console.log(`Mobile env source: apps/mobile/.env`);

if (errors.length) {
  console.log('\nBlocker:');
  for (const item of errors) {
    console.log(`- ${item.label}: ${item.keys.join(' atau ')}${item.details ? ` (${item.details})` : ''}`);
  }
}

if (warnings.length) {
  console.log('\nPerhatian:');
  for (const item of warnings) {
    console.log(`- ${item.label}: ${item.keys.slice(0, 4).join(' atau ')}${item.keys.length > 4 ? ' ...' : ''}${item.details ? ` (${item.details})` : ''}`);
  }
}

if (!errors.length && !warnings.length) {
  console.log('\nStatus: siap untuk smoke test production.');
} else if (!errors.length) {
  console.log('\nStatus: tidak ada blocker env utama, tetapi warning di atas perlu ditutup sebelum launch publik.');
} else {
  console.log('\nStatus: belum siap production. Isi env blocker lalu jalankan lagi: npm run prod:env:check');
}

process.exitCode = errors.length ? 1 : 0;
