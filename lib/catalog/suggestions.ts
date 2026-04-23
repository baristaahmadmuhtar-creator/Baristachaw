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

export async function persistCatalogSuggestion(
  input: Omit<CatalogSuggestionRecord, 'id' | 'submitted_at' | 'status' | 'durability'>,
): Promise<CatalogSuggestionRecord> {
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
