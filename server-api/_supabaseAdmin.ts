import { createHash } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';

export type SupabaseAdminConfig = {
  configured: true;
  url: string;
  serviceRoleKey: string;
} | {
  configured: false;
};

type AdminAuditEventInput = {
  actor_user_id?: string | null;
  actor_email?: string | null;
  target_type: string;
  target_id?: string;
  action: string;
  detail?: string;
  before?: unknown;
  after?: unknown;
  severity?: 'info' | 'warning' | 'critical';
  request_id?: string;
  ip_hash?: string;
  metadata?: Record<string, unknown>;
};

function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function firstHeaderValue(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return '';
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig {
  const url = readEnv('SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL').replace(/\/+$/, '');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_SECRET_KEY');
  if (!url || !serviceRoleKey) return { configured: false };
  return { configured: true, url, serviceRoleKey };
}

export async function supabaseAdminRest<T>(
  config: Extract<SupabaseAdminConfig, { configured: true }>,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...((init.headers || {}) as Record<string, string>),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${path} returned ${response.status}: ${text.slice(0, 180)}`);
  }
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

export async function createSignedUploadUrl(
  config: Extract<SupabaseAdminConfig, { configured: true }>,
  bucket: string,
  path: string,
): Promise<{ signedUrl: string; path: string }> {
  const response = await fetch(`${config.url}/storage/v1/object/upload/sign/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase upload sign returned ${response.status}: ${text.slice(0, 180)}`);
  }
  
  const data = JSON.parse(text) as { url: string };
  return {
    signedUrl: `${config.url}/storage/v1${data.url}`,
    path: path
  };
}

export function hashRequestIp(req: VercelRequest): string {
  const forwarded = firstHeaderValue(req.headers['x-forwarded-for']);
  const ip = (
    forwarded.split(',')[0]?.trim()
    || firstHeaderValue(req.headers['x-real-ip']).trim()
    || req.socket?.remoteAddress
    || 'unknown'
  ).replace(/^::ffff:/, '');
  const salt = readEnv('AUDIT_HASH_SALT', 'JWT_SECRET', 'HEALTHCHECK_TOKEN') || 'baristachaw-audit';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export async function insertAdminAuditEvent(
  config: Extract<SupabaseAdminConfig, { configured: true }>,
  event: AdminAuditEventInput,
): Promise<void> {
  await supabaseAdminRest(config, 'admin_audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify([{
      actor_user_id: event.actor_user_id || null,
      actor_email: event.actor_email || null,
      target_type: event.target_type,
      target_id: event.target_id || '',
      action: event.action,
      detail: event.detail || '',
      before: event.before ?? null,
      after: event.after ?? null,
      severity: event.severity || 'info',
      request_id: event.request_id,
      ip_hash: event.ip_hash,
      metadata: event.metadata || {},
    }]),
  });
}
