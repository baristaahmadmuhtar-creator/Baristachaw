import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CatalogSuggestionRecord } from './types.js';

function resolveSuggestionLogPath(): { path: string; durability: CatalogSuggestionRecord['durability'] } {
  const override = (process.env.CATALOG_SUGGESTION_LOG_PATH || '').trim();
  if (override) return { path: override, durability: 'file' };

  if (process.env.VERCEL) {
    return { path: '/tmp/baristachaw-brand-suggestions.ndjson', durability: 'ephemeral' };
  }

  return {
    path: path.resolve(process.cwd(), 'data/catalog/reports/brand-suggestions.ndjson'),
    durability: 'file',
  };
}

function readSupabaseConfig(): { url: string; serviceRoleKey: string } | null {
  const url = String(process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SECRET_KEY
    || '',
  ).trim();
  return url && serviceRoleKey ? { url, serviceRoleKey } : null;
}

async function persistSuggestionToSupabase(
  input: Omit<CatalogSuggestionRecord, 'id' | 'submitted_at' | 'status' | 'durability'>,
): Promise<CatalogSuggestionRecord | null> {
  const config = readSupabaseConfig();
  if (!config || process.env.CATALOG_SUGGESTION_LOG_PATH) return null;

  const response = await fetch(
    `${config.url}/rest/v1/brand_suggestions?select=id,kind,brand,model,region,notes,status,created_at`,
    {
      method: 'POST',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([{
        kind: input.kind,
        brand: input.brand,
        model: input.model || null,
        region: input.region,
        notes: input.notes || null,
        status: 'queued',
      }]),
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase brand_suggestions returned ${response.status}.`);
  }
  const rows = await response.json() as Array<{
    id: string;
    kind: CatalogSuggestionRecord['kind'];
    brand: string;
    model?: string | null;
    region: CatalogSuggestionRecord['region'];
    notes?: string | null;
    status: 'queued';
    created_at: string;
  }>;
  const row = rows[0];
  if (!row?.id) throw new Error('Supabase brand_suggestions returned no record.');
  return {
    id: row.id,
    kind: row.kind,
    brand: row.brand,
    model: row.model || undefined,
    region: row.region,
    notes: row.notes || undefined,
    submitted_at: row.created_at,
    status: 'queued',
    durability: 'supabase',
  };
}

export async function persistCatalogSuggestion(
  input: Omit<CatalogSuggestionRecord, 'id' | 'submitted_at' | 'status' | 'durability'>,
): Promise<CatalogSuggestionRecord> {
  try {
    const durableRecord = await persistSuggestionToSupabase(input);
    if (durableRecord) return durableRecord;
  } catch (error) {
    console.error('[catalog-suggestion] durable persistence failed; using fallback', error);
  }

  const target = resolveSuggestionLogPath();
  const record: CatalogSuggestionRecord = {
    id: randomUUID(),
    submitted_at: new Date().toISOString(),
    status: 'queued',
    durability: target.durability,
    ...input,
  };

  await mkdir(path.dirname(target.path), { recursive: true });
  await appendFile(target.path, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}
