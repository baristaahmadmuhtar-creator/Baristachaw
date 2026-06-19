import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  requireAuth,
  sanitizeErrorDetails,
} from '../_shared.js';
import {
  getSupabaseAdminConfig,
  hashRequestIp,
  insertAdminAuditEvent,
  supabaseAdminRest,
} from '../_supabaseAdmin.js';

const LIBRARY_SYNC_RATE_LIMIT = {
  maxRequests: 120,
  windowMs: 60 * 60 * 1000,
  burstMaxRequests: 24,
  burstWindowMs: 60 * 1000,
} as const;

const MAX_JOURNAL_ITEMS = 20;
const MAX_COLLECTION_ITEMS = 40;
const MAX_PLAN_JSON_CHARS = 140_000;
const MAX_COLLECTION_JSON_CHARS = 90_000;
const MAX_TEXT_SHORT = 180;
const MAX_TEXT_LONG = 800;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function text(value: unknown, fallback = '', maxLength = MAX_TEXT_SHORT): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function intValue(value: unknown, fallback = 0): number {
  return Math.round(numberValue(value, fallback));
}

function boolValue(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

function isoFromMs(value: unknown, fallbackMs = Date.now()): string {
  const ms = numberValue(value, fallbackMs);
  const safeMs = ms > 0 ? ms : fallbackMs;
  return new Date(safeMs).toISOString();
}

function safeBoundedJson(value: unknown, maxChars: number): unknown {
  try {
    const json = JSON.stringify(value ?? {});
    if (json.length <= maxChars) return JSON.parse(json);
    return {
      truncated: true,
      originalBytes: json.length,
      preview: json.slice(0, Math.min(maxChars, 6000)),
    };
  } catch {
    return {};
  }
}

function clampList(value: unknown, maxItems: number): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).slice(0, maxItems);
}

function normalizeFeedbackRating(value: unknown): string | null {
  const normalized = text(value).toLowerCase();
  if (normalized === 'great' || normalized === 'sour' || normalized === 'bitter' || normalized === 'thin') {
    return normalized;
  }
  return null;
}

function normalizeCollectionType(value: unknown): 'recipe' | 'ai_canvas' {
  return text(value).toLowerCase() === 'ai_canvas' ? 'ai_canvas' : 'recipe';
}

function normalizeRecipeSource(value: unknown): 'collection' | 'ai_brew' | 'import' {
  const normalized = text(value).toLowerCase();
  if (normalized === 'ai_brew' || normalized === 'import') return normalized;
  return 'collection';
}

function scopedLibraryId(userId: string, id: string): string {
  return `${userId}:${id}`.slice(0, 240);
}

function isGuestAuth(userId: string, user: Record<string, unknown> | undefined): boolean {
  const provider = text(user?.provider).toLowerCase();
  return provider === 'guest' || userId.startsWith('guest_') || boolValue(user?.isGuest);
}

function journalRowFromPayload(item: JsonRecord, userId: string) {
  const plan = isRecord(item.plan) ? item.plan : {};
  const dripper = isRecord(plan.dripper) ? plan.dripper : {};
  const grinder = isRecord(plan.grinder) ? plan.grinder : {};
  const feedback = isRecord(item.feedback) ? item.feedback : {};
  const aiNotes = isRecord(item.aiNotes) ? item.aiNotes : isRecord(plan.aiNotes) ? plan.aiNotes : {};
  const feedbackRating = normalizeFeedbackRating(feedback.rating);
  const id = text(item.id || plan.id, '', 120);
  if (!id) return null;

  return {
    id: scopedLibraryId(userId, id),
    user_id: userId,
    fingerprint: text(item.fingerprint || plan.fingerprint, id, 160),
    title: text(item.title, text(plan.coffeeName, 'AI Brew', 120), 160),
    locale: text(item.locale, 'id', 16),
    brew_mode: text(plan.brewMode, 'hot', 12) === 'iced' ? 'iced' : 'hot',
    method_family: text(plan.methodFamily, '', 80),
    method_id: text(plan.methodId, '', 120),
    coffee_name: text(plan.coffeeName, '', 180),
    process: text(plan.process, '', 120),
    variety: text(plan.variety, '', 120),
    roast_level: text(plan.roastLevel, '', 80),
    target_profile_id: text(plan.targetProfileId, '', 120),
    target_profile_label: text(plan.targetProfileLabel, '', 180),
    dripper_name: text(dripper.name, '', 180),
    grinder_name: text(grinder.name, '', 180),
    dose_g: Math.round(numberValue(plan.doseG) * 10) / 10,
    total_water_ml: intValue(plan.totalWaterMl),
    hot_water_ml: intValue(plan.hotWaterMl),
    ice_ml: intValue(plan.iceMl),
    water_temp_c: intValue(plan.waterTempC),
    total_time_seconds: intValue(plan.totalTimeSeconds),
    final_beverage_ratio: Math.round(numberValue(plan.finalBeverageRatio) * 10) / 10,
    ai_optimized: Boolean(plan.aiNotes) || Boolean(plan.aiOptimizationApplied) || Boolean(plan.aiSequenceApplied),
    feedback_rating: feedbackRating,
    feedback_note: text(feedback.note, '', MAX_TEXT_LONG),
    plan: safeBoundedJson(plan, MAX_PLAN_JSON_CHARS),
    ai_notes: safeBoundedJson(aiNotes, 32_000),
    feedback: safeBoundedJson(feedback, 16_000),
    metadata: {
      catalogVersion: text(plan.catalogVersion, '', 80),
      fallbackUsed: Boolean(plan.fallbackUsed),
      provenanceAttentionNeeded: Boolean(plan.provenanceAttentionNeeded),
      syncedFrom: 'web',
    },
    created_at: isoFromMs(item.createdAt || plan.createdAt),
    updated_at: isoFromMs(item.updatedAt || plan.updatedAt || item.createdAt || plan.createdAt),
  };
}

function collectionRowFromPayload(item: JsonRecord, userId: string) {
  const id = text(item.id, '', 120);
  if (!id) return null;
  const content = item.content ?? {};
  const metadata = isRecord(item.metadata) ? item.metadata : {};
  const type = normalizeCollectionType(item.type);
  const title = text(item.title, type === 'recipe' ? text((content as JsonRecord)?.name, 'Recipe', 120) : 'Collection item', 160);

  return {
    id: scopedLibraryId(userId, id),
    user_id: userId,
    source: normalizeRecipeSource(item.source),
    item_type: type,
    title,
    folder_id: text(item.folderId, '', 120) || null,
    content: safeBoundedJson(content, MAX_COLLECTION_JSON_CHARS),
    metadata: safeBoundedJson({
      ...metadata,
      cardColor: text(item.cardColor, '', 32) || undefined,
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : undefined,
      syncedFrom: 'web',
    }, 24_000),
    deleted_at: item.deletedAt ? isoFromMs(item.deletedAt) : null,
    created_at: isoFromMs(item.createdAt),
    updated_at: isoFromMs(item.updatedAt || item.createdAt),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'POST, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, requestId, error: 'Method not allowed' });
  }
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return undefined;

  const authResult = requireAuth(req);
  if (authResult.ok === false) {
    return res.status(authResult.statusCode).json({
      ok: false,
      requestId,
      error: authResult.error,
      errorCode: authResult.errorCode,
    });
  }

  const userId = authResult.auth.userId;
  if (isGuestAuth(userId, authResult.auth.user)) {
    return res.status(200).json({
      ok: true,
      requestId,
      synced: false,
      reason: 'guest_local_only',
      journalCount: 0,
      collectionCount: 0,
    });
  }

  const limit = checkRateLimit(req, '/api/library/sync', userId, LIBRARY_SYNC_RATE_LIMIT);
  applyRateLimitHeaders(res, limit);
  if (!limit.allowed) {
    return res.status(429).json({
      ok: false,
      requestId,
      error: 'Rate limit exceeded',
      errorCode: 'rate_limited',
      retryAfterSec: limit.retryAfterSec,
    });
  }

  const config = getSupabaseAdminConfig();
  if (!config.configured) {
    return res.status(503).json({
      ok: false,
      requestId,
      error: 'Recipe library sync is not configured',
      errorCode: 'supabase_not_configured',
    });
  }

  const body = isRecord(req.body) ? req.body : {};
  const journalRows = clampList(body.aiBrewJournal, MAX_JOURNAL_ITEMS)
    .map((item) => journalRowFromPayload(item, userId))
    .filter((row): row is NonNullable<ReturnType<typeof journalRowFromPayload>> => Boolean(row));
  const collectionRows = clampList(body.collectionItems, MAX_COLLECTION_ITEMS)
    .map((item) => collectionRowFromPayload(item, userId))
    .filter((row): row is NonNullable<ReturnType<typeof collectionRowFromPayload>> => Boolean(row));

  if (!journalRows.length && !collectionRows.length) {
    return res.status(200).json({
      ok: true,
      requestId,
      synced: false,
      reason: 'empty_payload',
      journalCount: 0,
      collectionCount: 0,
    });
  }

  try {
    if (journalRows.length) {
      await supabaseAdminRest(config, 'ai_brew_journal?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(journalRows),
      });
    }

    if (collectionRows.length) {
      await supabaseAdminRest(config, 'recipe_library_items?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(collectionRows),
      });
    }

    await insertAdminAuditEvent(config, {
      actor_user_id: userId,
      actor_email: text(authResult.auth.user?.email) || null,
      target_type: 'recipe_library',
      target_id: userId,
      action: 'recipe_library_synced',
      detail: `Synced ${journalRows.length} AI Brew journal row(s) and ${collectionRows.length} collection item(s).`,
      severity: 'info',
      request_id: requestId,
      ip_hash: hashRequestIp(req),
      metadata: {
        journalCount: journalRows.length,
        collectionCount: collectionRows.length,
      },
    }).catch(() => {
      // Audit writes must not block user save.
    });

    return res.status(200).json({
      ok: true,
      requestId,
      synced: true,
      journalCount: journalRows.length,
      collectionCount: collectionRows.length,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Recipe library sync failed',
      errorCode: 'internal_error',
      details: sanitizeErrorDetails(error, 220),
    });
  }
}
