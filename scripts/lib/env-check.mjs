import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const ENV_STATUS = {
  MISSING_KEY: 'missing_key',
  PRESENT_SENSITIVE: 'present_sensitive',
  PRESENT_RUNTIME: 'present_runtime',
  LOCAL_UNAVAILABLE_EXPECTED: 'local_unavailable_expected',
  AUTH_SMOKE_SKIPPED: 'auth_smoke_skipped',
};

export const APP_ENV_GROUPS = [
  { label: 'APP_URL', sets: [['APP_URL']], validate: 'httpsUrl' },
  { label: 'JWT_SECRET', sets: [['JWT_SECRET']], validate: { minLength: 32 } },
  { label: 'ADMIN_EMAILS', sets: [['ADMIN_EMAILS']] },
  { label: 'SUPABASE_URL', sets: [['SUPABASE_URL']], validate: 'httpsUrl' },
  { label: 'SUPABASE_SERVICE_ROLE_KEY', sets: [['SUPABASE_SERVICE_ROLE_KEY']], validate: 'supabaseServiceRoleKey' },
  { label: 'Supabase public key', sets: [['SUPABASE_PUBLISHABLE_KEY'], ['SUPABASE_ANON_KEY']] },
  { label: 'GEMINI_API_KEY', sets: [['GEMINI_API_KEY']] },
];

export const APP_OPTIONAL_ENV_GROUPS = [
  { label: 'ALLOWED_ORIGINS', sets: [['ALLOWED_ORIGINS']] },
  { label: 'HEALTHCHECK_TOKEN', sets: [['HEALTHCHECK_TOKEN']] },
  { label: 'SENTRY_DSN', sets: [['SENTRY_DSN']] },
  { label: 'SENTRY_RELEASE', sets: [['SENTRY_RELEASE'], ['VERCEL_GIT_COMMIT_SHA'], ['RELEASE_VERSION']] },
  { label: 'SENTRY_ENVIRONMENT', sets: [['SENTRY_ENVIRONMENT'], ['VERCEL_ENV'], ['APP_ENV']] },
  { label: 'SENTRY_USER_CONTEXT_READY', sets: [['SENTRY_USER_CONTEXT_READY'], ['TELEMETRY_USER_CONTEXT_READY']] },
];

export const MOBILE_ENV_GROUPS = [
  { label: 'Mobile EXPO_PUBLIC_API_BASE_URL', sets: [['EXPO_PUBLIC_API_BASE_URL']], validate: 'httpsUrl' },
  { label: 'Mobile EXPO_PUBLIC_WEB_APP_URL', sets: [['EXPO_PUBLIC_WEB_APP_URL']], validate: 'httpsUrl' },
  { label: 'Mobile EXPO_PUBLIC_APP_SCHEME', sets: [['EXPO_PUBLIC_APP_SCHEME']] },
  { label: 'Mobile EXPO_PUBLIC_SUPABASE_URL', sets: [['EXPO_PUBLIC_SUPABASE_URL']], validate: 'httpsUrl' },
  {
    label: 'Mobile Supabase public key',
    sets: [['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'], ['EXPO_PUBLIC_SUPABASE_ANON_KEY']],
  },
];

export const SMOKE_AUTH_ENV_GROUPS = [
  {
    label: 'Production smoke authenticated credential',
    sets: [
      ['PROD_SMOKE_BEARER_TOKEN'],
      ['SMOKE_BEARER_TOKEN'],
      ['PROD_SMOKE_EMAIL', 'PROD_SMOKE_PASSWORD'],
      ['SMOKE_EMAIL', 'SMOKE_PASSWORD'],
    ],
    auth: true,
  },
];

export const FORBIDDEN_PUBLIC_SECRET_GROUPS = [
  {
    label: 'Service role key must not use public env names',
    keys: ['VITE_SUPABASE_SERVICE_ROLE_KEY', 'EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'],
  },
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function redact(value) {
  return String(value || '').trim() ? '<redacted:present>' : '<missing>';
}

function parseEnvFile(root, relativePath) {
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

export function loadEnvFiles(paths, { root = process.cwd(), includeProcess = true } = {}) {
  const merged = {};
  for (const path of paths) {
    const parsed = parseEnvFile(root, path);
    for (const [key, value] of Object.entries(parsed)) {
      if (String(value || '').trim() || !(key in merged)) {
        merged[key] = value;
      }
    }
  }
  return includeProcess ? Object.assign(merged, process.env) : merged;
}

function normalizeGroup(group) {
  if (Array.isArray(group)) return { label: group.join(' + '), sets: [group] };
  if (Array.isArray(group.keys)) return { ...group, sets: [group.keys] };
  return { ...group, sets: group.sets || [] };
}

function hasValue(env, key) {
  return Boolean(String(env[key] || '').trim());
}

function validateValue(value, validate) {
  if (!validate) return { ok: true };
  const text = String(value || '').trim();
  const placeholderLike = /\b(your|placeholder|replace|example|changeme|dummy|fake|redacted)\b|service[-_ ]?role[-_ ]?key|anon[-_ ]?key/i.test(text);
  if (validate === 'httpsUrl') {
    try {
      const parsed = new URL(text);
      return { ok: parsed.protocol === 'https:', reason: 'must be a production https URL' };
    } catch {
      return { ok: false, reason: 'must be a production https URL' };
    }
  }
  if (typeof validate === 'object' && validate.minLength) {
    return {
      ok: text.length >= validate.minLength,
      reason: `must be at least ${validate.minLength} characters`,
    };
  }
  if (validate === 'supabaseServiceRoleKey') {
    const isSecretKey = /^sb_secret_[A-Za-z0-9_-]{20,}$/.test(text);
    const jwtParts = text.split('.');
    const isJwtServiceRole = jwtParts.length === 3 && text.length >= 120;
    const isFutureSecret = text.length >= 80 && !placeholderLike;
    return {
      ok: !placeholderLike && (isSecretKey || isJwtServiceRole || isFutureSecret),
      reason: 'must be a real Supabase secret/service-role key, not a placeholder or short test value',
    };
  }
  return { ok: true };
}

function findSatisfiedRuntimeSet(env, group) {
  for (const set of group.sets) {
    const present = set.filter(key => hasValue(env, key));
    if (present.length !== set.length) continue;
    const invalid = present
      .map(key => ({ key, validation: validateValue(env[key], group.validate) }))
      .filter(item => !item.validation.ok);
    if (!invalid.length) return { set, present, invalid: [] };
    return { set, present, invalid };
  }
  return null;
}

function findSatisfiedNameSet(names, group) {
  for (const set of group.sets) {
    const present = set.filter(key => names.has(key));
    if (present.length === set.length) return { set, present };
  }
  return null;
}

function buildReport({ mode, target, items, commandError }) {
  const errors = items.filter(item => item.level === 'fail');
  const warnings = items.filter(item => item.level === 'warn');
  return {
    ok: errors.length === 0 && !commandError,
    mode,
    target,
    items,
    errors,
    warnings,
    commandError,
  };
}

function readVercelEnvOutput(target, command, token) {
  const args = ['env', 'ls', target];
  if (String(token || '').trim() && process.platform !== 'win32') {
    args.push('--token', String(token).trim());
  }

  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], {
      encoding: 'utf8',
      env: process.env,
    })
    : spawnSync(command, args, {
      encoding: 'utf8',
      env: process.env,
    });

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      output,
      commandError: result.error?.message || output.trim() || `vercel env ls ${target} failed`,
    };
  }
  return { ok: true, output };
}

export function classifyEnvStatus({ present, sensitive, runtime, localUnavailable, authSkipped }) {
  if (authSkipped) return ENV_STATUS.AUTH_SMOKE_SKIPPED;
  if (runtime) return ENV_STATUS.PRESENT_RUNTIME;
  if (present && sensitive) return ENV_STATUS.PRESENT_SENSITIVE;
  if (localUnavailable) return ENV_STATUS.LOCAL_UNAVAILABLE_EXPECTED;
  return ENV_STATUS.MISSING_KEY;
}

export function checkRuntimeEnv(requiredGroups, {
  env = process.env,
  mode = 'runtime',
  target = 'process.env',
  allowLocalUnavailable = false,
} = {}) {
  const items = [];

  for (const rawGroup of requiredGroups.map(normalizeGroup)) {
    const satisfied = findSatisfiedRuntimeSet(env, rawGroup);
    if (satisfied && !satisfied.invalid.length) {
      items.push({
        level: 'pass',
        label: rawGroup.label,
        status: ENV_STATUS.PRESENT_RUNTIME,
        keys: satisfied.present,
        details: 'present in runtime env',
      });
      continue;
    }

    if (satisfied?.invalid.length) {
      items.push({
        level: 'fail',
        label: rawGroup.label,
        status: ENV_STATUS.MISSING_KEY,
        keys: satisfied.invalid.map(item => item.key),
        details: satisfied.invalid.map(item => `${item.key}: ${item.validation.reason}`).join('; '),
      });
      continue;
    }

    items.push({
      level: allowLocalUnavailable ? 'warn' : 'fail',
      label: rawGroup.label,
      status: rawGroup.auth ? ENV_STATUS.AUTH_SMOKE_SKIPPED : (
        allowLocalUnavailable ? ENV_STATUS.LOCAL_UNAVAILABLE_EXPECTED : ENV_STATUS.MISSING_KEY
      ),
      keys: rawGroup.sets.flat(),
      details: allowLocalUnavailable
        ? 'not available in this local process; required in secure final runtime'
        : 'missing from runtime env',
    });
  }

  return buildReport({ mode, target, items });
}

export function checkForbiddenRuntimeEnv(forbiddenGroups, {
  env = process.env,
  mode = 'runtime',
  target = 'process.env',
} = {}) {
  const items = [];
  for (const group of forbiddenGroups) {
    const present = group.keys.filter(key => hasValue(env, key));
    if (present.length) {
      items.push({
        level: 'fail',
        label: group.label,
        status: ENV_STATUS.MISSING_KEY,
        keys: present,
        details: 'forbidden public secret env is present',
      });
    } else {
      items.push({
        level: 'pass',
        label: group.label,
        status: 'not_present',
        keys: group.keys,
        details: 'forbidden public secret env names are absent',
      });
    }
  }
  return buildReport({ mode, target, items });
}

export function checkVercelEnvNames(requiredGroups, target = 'production', {
  command = 'vercel',
  token = process.env.VERCEL_TOKEN,
} = {}) {
  const { ok, output, commandError } = readVercelEnvOutput(target, command, token);
  if (!ok) {
    return buildReport({
      mode: 'vercel',
      target,
      commandError,
      items: [],
    });
  }

  const names = new Set();
  for (const rawGroup of requiredGroups.map(normalizeGroup)) {
    for (const key of rawGroup.sets.flat()) {
      if (new RegExp(`(^|\\s)${escapeRegExp(key)}(\\s|$)`, 'm').test(output)) {
        names.add(key);
      }
    }
  }

  const items = [];
  for (const rawGroup of requiredGroups.map(normalizeGroup)) {
    const satisfied = findSatisfiedNameSet(names, rawGroup);
    if (satisfied) {
      items.push({
        level: 'pass',
        label: rawGroup.label,
        status: ENV_STATUS.PRESENT_SENSITIVE,
        keys: satisfied.present,
        details: `name exists in Vercel ${target}; value may be encrypted/write-only`,
      });
    } else {
      items.push({
        level: 'fail',
        label: rawGroup.label,
        status: ENV_STATUS.MISSING_KEY,
        keys: rawGroup.sets.flat(),
        details: `name not found in Vercel ${target}`,
      });
    }
  }

  return buildReport({ mode: 'vercel', target, items });
}

export function checkForbiddenVercelEnvNames(forbiddenGroups, target = 'production', {
  command = 'vercel',
  token = process.env.VERCEL_TOKEN,
} = {}) {
  const { ok, output, commandError } = readVercelEnvOutput(target, command, token);
  if (!ok) {
    return buildReport({
      mode: 'vercel',
      target,
      commandError,
      items: [],
    });
  }

  const items = [];
  for (const group of forbiddenGroups) {
    const present = group.keys.filter(key => new RegExp(`(^|\\s)${escapeRegExp(key)}(\\s|$)`, 'm').test(output));
    if (present.length) {
      items.push({
        level: 'fail',
        label: group.label,
        status: ENV_STATUS.MISSING_KEY,
        keys: present,
        details: `forbidden public secret env name exists in Vercel ${target}`,
      });
    } else {
      items.push({
        level: 'pass',
        label: group.label,
        status: 'not_present',
        keys: group.keys,
        details: `forbidden public secret env names are absent in Vercel ${target}`,
      });
    }
  }

  return buildReport({ mode: 'vercel', target, items });
}

export function printSafeEnvReport(report, {
  title = 'Baristachaw environment check',
} = {}) {
  console.log(`${title} (${report.mode}${report.target ? `:${report.target}` : ''})`);
  if (report.commandError) {
    console.log(`[FAIL] command -> ${String(report.commandError).slice(0, 240)}`);
  }
  for (const item of report.items) {
    const prefix = item.level === 'pass' ? 'PASS' : item.level === 'warn' ? 'WARN' : 'FAIL';
    const keys = [...new Set(item.keys || [])].join(' / ');
    console.log(`[${prefix}] ${item.label} -> ${item.status}; keys=${keys}; ${item.details}`);
  }
  if (report.ok) {
    console.log('Status: pass.');
  } else {
    console.log('Status: fail.');
  }
}
