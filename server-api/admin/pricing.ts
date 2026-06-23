import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  applyRateLimitHeaders,
  checkRateLimit,
  createRequestId,
  enforceTrustedRequestOrigin,
  sanitizeErrorDetails,
} from '../_shared.js';
import { requireAdmin } from './_access.js';
import { getSupabaseAdminConfig, supabaseAdminRest, insertAdminAuditEvent, hashRequestIp } from '../_supabaseAdmin.js';

const ADMIN_PRICING_RATE_LIMIT = {
  maxRequests: 80,
  windowMs: 5 * 60 * 1000,
  burstMaxRequests: 20,
  burstWindowMs: 10 * 1000,
} as const;

const VALID_PRICE_DURATIONS = new Set(['monthly', 'quarterly', 'yearly', 'lifetime']);
const VALID_PROMO_DURATIONS = new Set(['monthly', 'quarterly', 'yearly']);
const VALID_PROMO_DISCOUNT_TYPES = new Set(['percentage', 'fixed_amount']);
const VALID_PLAN_CODES = new Set(['free', 'starter', 'pro', 'team', 'enterprise']);
const OPERATOR_NOTE_MIN_LENGTH = 12;

type PriceRow = {
  id?: string;
  plan_code?: string;
  duration?: string;
  currency?: string;
  original_price?: number | string | null;
  discount_price?: number | string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type PromoRow = {
  id?: string;
  code?: string;
  discount_type?: string;
  discount_value?: number | string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  max_uses?: number | string | null;
  current_uses?: number | string | null;
  valid_plan_codes?: string[] | null;
  valid_durations?: string[] | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

type ValidationResult<T> =
  | { ok: true; payload: T; operatorNote: string }
  | { ok: false; statusCode: 400; error: string; errorCode: string; details?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function firstQueryValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean).join('/');
  return typeof value === 'string' ? value.trim() : '';
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePricingRoute(req: VercelRequest): string[] {
  const query = req.query || {};
  const queryPath = firstQueryValue(query.path);
  const queryRoute = firstQueryValue(query.route);
  let raw = queryPath || queryRoute;

  if (!raw) {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    raw = url.pathname;
  }

  let path = raw.split('?')[0].trim().replace(/^\/+|\/+$/g, '');
  path = path
    .replace(/^api\/admin\/pricing\/?/i, '')
    .replace(/^api\/admin\/?/i, '')
    .replace(/^admin\/pricing\/?/i, '')
    .replace(/^pricing\/?/i, '');

  return path
    .split('/')
    .map((segment) => decodePathSegment(segment.trim()))
    .filter(Boolean);
}

function encodeFilterValue(value: string): string {
  return encodeURIComponent(value.trim());
}

function normalizeString(value: unknown, maxLength = 120): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';
}

function normalizeCode(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40).toUpperCase() : '';
}

function normalizeNumber(value: unknown, options: { required?: boolean; integer?: boolean; min?: number } = {}): number | null {
  if (value === null || value === undefined || value === '') return options.required ? Number.NaN : null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return Number.NaN;
  const min = options.min ?? 0;
  if (parsed < min) return Number.NaN;
  return options.integer ? Math.round(parsed) : Math.round(parsed * 100) / 100;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return undefined;
}

function normalizeDate(value: unknown): string | null | undefined {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}

function normalizeStringList(value: unknown, allowed?: Set<string>): string[] | undefined {
  if (value === null || value === undefined || value === '') return [];
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .map((item) => normalizeString(item, 40).toLowerCase())
    .filter(Boolean);
  if (allowed && cleaned.some((item) => !allowed.has(item))) return undefined;
  return [...new Set(cleaned)];
}

function validateKnownFields(body: Record<string, unknown>, allowed: Set<string>): string[] {
  return Object.keys(body).filter((key) => !allowed.has(key));
}

function requireOperatorNote(body: Record<string, unknown>): ValidationResult<never> | { ok: true; operatorNote: string } {
  const operatorNote = normalizeString(body.operatorNote, 500);
  if (operatorNote.length < OPERATOR_NOTE_MIN_LENGTH) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Operator note is required for pricing changes',
      errorCode: 'operator_reason_required',
      details: `operatorNote must be at least ${OPERATOR_NOTE_MIN_LENGTH} characters.`,
    };
  }
  return { ok: true, operatorNote };
}

function validatePriceBody(rawBody: unknown, mode: 'create' | 'update'): ValidationResult<Partial<PriceRow>> {
  if (!isRecord(rawBody)) {
    return { ok: false, statusCode: 400, error: 'Request body must be an object', errorCode: 'validation_error' };
  }
  const body = rawBody;
  const allowed = new Set(['planCode', 'duration', 'currency', 'originalPrice', 'discountPrice', 'isActive', 'operatorNote']);
  const unknownFields = validateKnownFields(body, allowed);
  if (unknownFields.length > 0) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Unknown pricing fields',
      errorCode: 'validation_error',
      details: `Unknown fields: ${unknownFields.join(', ')}`,
    };
  }

  const note = requireOperatorNote(body);
  if (note.ok === false) return note;

  const payload: Partial<PriceRow> = {};
  if ('planCode' in body || mode === 'create') {
    const planCode = normalizeString(body.planCode, 40).toLowerCase();
    if (!VALID_PLAN_CODES.has(planCode) || planCode === 'free') {
      return { ok: false, statusCode: 400, error: 'Invalid planCode', errorCode: 'validation_error' };
    }
    payload.plan_code = planCode;
  }
  if ('duration' in body || mode === 'create') {
    const duration = normalizeString(body.duration, 20).toLowerCase();
    if (!VALID_PRICE_DURATIONS.has(duration)) {
      return { ok: false, statusCode: 400, error: 'Invalid duration', errorCode: 'validation_error' };
    }
    payload.duration = duration;
  }
  if ('currency' in body || mode === 'create') {
    const currency = normalizeString(body.currency, 12).toLowerCase();
    if (!/^[a-z]{3}$/.test(currency)) {
      return { ok: false, statusCode: 400, error: 'Invalid currency', errorCode: 'validation_error' };
    }
    payload.currency = currency;
  }
  if ('originalPrice' in body || mode === 'create') {
    const originalPrice = normalizeNumber(body.originalPrice, { required: true, min: 0 });
    if (!Number.isFinite(originalPrice)) {
      return { ok: false, statusCode: 400, error: 'Invalid originalPrice', errorCode: 'validation_error' };
    }
    payload.original_price = originalPrice;
  }
  if ('discountPrice' in body) {
    const discountPrice = normalizeNumber(body.discountPrice, { min: 0 });
    if (Number.isNaN(discountPrice)) {
      return { ok: false, statusCode: 400, error: 'Invalid discountPrice', errorCode: 'validation_error' };
    }
    payload.discount_price = discountPrice;
  }
  if ('isActive' in body) {
    const isActive = normalizeBoolean(body.isActive);
    if (typeof isActive !== 'boolean') {
      return { ok: false, statusCode: 400, error: 'Invalid isActive', errorCode: 'validation_error' };
    }
    payload.is_active = isActive;
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, statusCode: 400, error: 'No pricing fields to update', errorCode: 'validation_error' };
  }

  return { ok: true, payload, operatorNote: note.operatorNote };
}

function validatePromoBody(rawBody: unknown, mode: 'create' | 'update'): ValidationResult<Partial<PromoRow>> {
  if (!isRecord(rawBody)) {
    return { ok: false, statusCode: 400, error: 'Request body must be an object', errorCode: 'validation_error' };
  }
  const body = rawBody;
  const allowed = new Set([
    'code',
    'discountType',
    'discountValue',
    'validFrom',
    'validUntil',
    'maxUses',
    'currentUses',
    'validPlanCodes',
    'validDurations',
    'isActive',
    'operatorNote',
  ]);
  const unknownFields = validateKnownFields(body, allowed);
  if (unknownFields.length > 0) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Unknown promo fields',
      errorCode: 'validation_error',
      details: `Unknown fields: ${unknownFields.join(', ')}`,
    };
  }

  const note = requireOperatorNote(body);
  if (note.ok === false) return note;

  const payload: Partial<PromoRow> = {};
  if ('code' in body || mode === 'create') {
    const code = normalizeCode(body.code);
    if (code.length < 4) {
      return { ok: false, statusCode: 400, error: 'Invalid promo code', errorCode: 'validation_error' };
    }
    payload.code = code;
  }
  if ('discountType' in body || mode === 'create') {
    const discountType = normalizeString(body.discountType, 32).toLowerCase();
    if (!VALID_PROMO_DISCOUNT_TYPES.has(discountType)) {
      return { ok: false, statusCode: 400, error: 'Invalid discountType', errorCode: 'validation_error' };
    }
    payload.discount_type = discountType;
  }
  if ('discountValue' in body || mode === 'create') {
    const discountValue = normalizeNumber(body.discountValue, { required: true, min: 0.01 });
    if (!Number.isFinite(discountValue)) {
      return { ok: false, statusCode: 400, error: 'Invalid discountValue', errorCode: 'validation_error' };
    }
    payload.discount_value = discountValue;
  }
  if ('validFrom' in body) {
    const validFrom = normalizeDate(body.validFrom);
    if (validFrom === undefined) {
      return { ok: false, statusCode: 400, error: 'Invalid validFrom', errorCode: 'validation_error' };
    }
    payload.valid_from = validFrom;
  }
  if ('validUntil' in body) {
    const validUntil = normalizeDate(body.validUntil);
    if (validUntil === undefined) {
      return { ok: false, statusCode: 400, error: 'Invalid validUntil', errorCode: 'validation_error' };
    }
    payload.valid_until = validUntil;
  }
  if ('maxUses' in body) {
    const maxUses = normalizeNumber(body.maxUses, { integer: true, min: 1 });
    if (Number.isNaN(maxUses)) {
      return { ok: false, statusCode: 400, error: 'Invalid maxUses', errorCode: 'validation_error' };
    }
    payload.max_uses = maxUses;
  }
  if ('currentUses' in body) {
    const currentUses = normalizeNumber(body.currentUses, { integer: true, min: 0 });
    if (!Number.isFinite(currentUses)) {
      return { ok: false, statusCode: 400, error: 'Invalid currentUses', errorCode: 'validation_error' };
    }
    payload.current_uses = currentUses;
  }
  if ('validPlanCodes' in body) {
    const validPlanCodes = normalizeStringList(body.validPlanCodes, VALID_PLAN_CODES);
    if (!validPlanCodes) {
      return { ok: false, statusCode: 400, error: 'Invalid validPlanCodes', errorCode: 'validation_error' };
    }
    payload.valid_plan_codes = validPlanCodes;
  }
  if ('validDurations' in body) {
    const validDurations = normalizeStringList(body.validDurations, VALID_PROMO_DURATIONS);
    if (!validDurations) {
      return { ok: false, statusCode: 400, error: 'Invalid validDurations', errorCode: 'validation_error' };
    }
    payload.valid_durations = validDurations;
  }
  if ('isActive' in body) {
    const isActive = normalizeBoolean(body.isActive);
    if (typeof isActive !== 'boolean') {
      return { ok: false, statusCode: 400, error: 'Invalid isActive', errorCode: 'validation_error' };
    }
    payload.is_active = isActive;
  }

  if (Object.keys(payload).length === 0) {
    return { ok: false, statusCode: 400, error: 'No promo fields to update', errorCode: 'validation_error' };
  }

  return { ok: true, payload, operatorNote: note.operatorNote };
}

function mapPrice(row: PriceRow) {
  return {
    id: String(row.id || ''),
    planCode: String(row.plan_code || ''),
    duration: String(row.duration || ''),
    currency: String(row.currency || '').toLowerCase(),
    originalPrice: Number(row.original_price ?? 0),
    discountPrice: row.discount_price === null || row.discount_price === undefined ? null : Number(row.discount_price),
    isActive: row.is_active !== false,
    ...(row.created_at ? { createdAt: row.created_at } : {}),
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
  };
}

function mapPromo(row: PromoRow) {
  const code = String(row.code || '');
  return {
    id: String(row.id || code),
    code,
    discountType: row.discount_type === 'fixed_amount' ? 'fixed_amount' : 'percentage',
    discountValue: Number(row.discount_value ?? 0),
    validFrom: row.valid_from || null,
    validUntil: row.valid_until || null,
    maxUses: row.max_uses === null || row.max_uses === undefined ? null : Number(row.max_uses),
    currentUses: Number(row.current_uses ?? 0),
    validPlanCodes: Array.isArray(row.valid_plan_codes) ? row.valid_plan_codes : [],
    validDurations: Array.isArray(row.valid_durations) ? row.valid_durations : [],
    isActive: row.is_active !== false,
    ...(row.created_at ? { createdAt: row.created_at } : {}),
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
  };
}

function validationErrorResponse(res: VercelResponse, requestId: string, result: Extract<ValidationResult<unknown>, { ok: false }>) {
  return res.status(result.statusCode).json({
    ok: false,
    requestId,
    error: result.error,
    errorCode: result.errorCode,
    ...(result.details ? { details: result.details } : {}),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = createRequestId(req);
  applyCors(req, res, 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (!enforceTrustedRequestOrigin(req, res, requestId)) return;

  const access = requireAdmin(req);
  if (access.ok === false) {
    return res.status(access.statusCode).json({
      ok: false,
      requestId,
      error: access.error,
      errorCode: access.errorCode,
    });
  }

  const limit = checkRateLimit(req, '/api/admin/pricing', access.auth.userId, ADMIN_PRICING_RATE_LIMIT);
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
    return res.status(500).json({ ok: false, requestId, error: 'Database not configured', errorCode: 'server_misconfigured' });
  }

  try {
    const route = normalizePricingRoute(req);
    const [resource, itemId] = route;

    if (req.method === 'GET') {
      if (resource === 'promos' && route.length === 1) {
        const data = await supabaseAdminRest<PromoRow[]>(config, 'promo_codes?select=*&order=created_at.desc');
        return res.status(200).json({ ok: true, requestId, data: (data || []).map(mapPromo) });
      }
      if (resource === 'prices' && route.length === 1) {
        const data = await supabaseAdminRest<PriceRow[]>(config, 'plan_prices?select=*&order=created_at.desc');
        return res.status(200).json({ ok: true, requestId, data: (data || []).map(mapPrice) });
      }
    }

    if (req.method === 'POST') {
      if (resource === 'promos' && route.length === 1) {
        const validation = validatePromoBody(req.body, 'create');
        if (validation.ok === false) return validationErrorResponse(res, requestId, validation);
        const data = await supabaseAdminRest<PromoRow[]>(config, 'promo_codes?select=*', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify([validation.payload]),
        });
        const created = data?.[0];
        await insertAdminAuditEvent(config, {
          action: 'create_promo_code',
          actor_user_id: access.auth.userId,
          target_type: 'promo_codes',
          target_id: String(created?.code || validation.payload.code || ''),
          detail: `Created promo code: ${created?.code || validation.payload.code}. ${validation.operatorNote}`,
          after: created,
          request_id: requestId,
          ip_hash: hashRequestIp(req),
        });
        return res.status(200).json({ ok: true, requestId, data: mapPromo(created || validation.payload) });
      }
      if (resource === 'prices' && route.length === 1) {
        const validation = validatePriceBody(req.body, 'create');
        if (validation.ok === false) return validationErrorResponse(res, requestId, validation);
        const data = await supabaseAdminRest<PriceRow[]>(config, 'plan_prices?select=*', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify([validation.payload]),
        });
        const created = data?.[0];
        await insertAdminAuditEvent(config, {
          action: 'create_plan_price',
          actor_user_id: access.auth.userId,
          target_type: 'plan_prices',
          target_id: String(created?.id || ''),
          detail: `Created price for plan: ${created?.plan_code || validation.payload.plan_code}. ${validation.operatorNote}`,
          after: created,
          request_id: requestId,
          ip_hash: hashRequestIp(req),
        });
        return res.status(200).json({ ok: true, requestId, data: mapPrice(created || validation.payload) });
      }
    }

    if (req.method === 'PUT') {
      if (resource === 'promos' && itemId && route.length === 2) {
        const validation = validatePromoBody(req.body, 'update');
        if (validation.ok === false) return validationErrorResponse(res, requestId, validation);
        const code = normalizeCode(itemId);
        const data = await supabaseAdminRest<PromoRow[]>(config, `promo_codes?code=eq.${encodeFilterValue(code)}&select=*`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(validation.payload),
        });
        const updated = data?.[0];
        if (!updated) return res.status(404).json({ ok: false, requestId, error: 'Promo code not found', errorCode: 'not_found' });
        await insertAdminAuditEvent(config, {
          action: 'update_promo_code',
          actor_user_id: access.auth.userId,
          target_type: 'promo_codes',
          target_id: code,
          detail: `Updated promo code: ${code}. ${validation.operatorNote}`,
          after: updated,
          request_id: requestId,
          ip_hash: hashRequestIp(req),
        });
        return res.status(200).json({ ok: true, requestId, data: mapPromo(updated) });
      }
      if (resource === 'prices' && itemId && route.length === 2) {
        const validation = validatePriceBody(req.body, 'update');
        if (validation.ok === false) return validationErrorResponse(res, requestId, validation);
        const id = itemId.trim();
        const data = await supabaseAdminRest<PriceRow[]>(config, `plan_prices?id=eq.${encodeFilterValue(id)}&select=*`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(validation.payload),
        });
        const updated = data?.[0];
        if (!updated) return res.status(404).json({ ok: false, requestId, error: 'Plan price not found', errorCode: 'not_found' });
        await insertAdminAuditEvent(config, {
          action: 'update_plan_price',
          actor_user_id: access.auth.userId,
          target_type: 'plan_prices',
          target_id: id,
          detail: `Updated plan price ID: ${id}. ${validation.operatorNote}`,
          after: updated,
          request_id: requestId,
          ip_hash: hashRequestIp(req),
        });
        return res.status(200).json({ ok: true, requestId, data: mapPrice(updated) });
      }
    }

    if (req.method === 'DELETE') {
      if (!isRecord(req.body)) {
        return res.status(400).json({ ok: false, requestId, error: 'Request body must be an object', errorCode: 'validation_error' });
      }
      const note = requireOperatorNote(req.body);
      if (note.ok === false) return validationErrorResponse(res, requestId, note);

      if (resource === 'promos' && itemId && route.length === 2) {
        const code = normalizeCode(itemId);
        const existing = await supabaseAdminRest<PromoRow[]>(config, `promo_codes?code=eq.${encodeFilterValue(code)}&select=*&limit=1`);
        if (!existing?.[0]) return res.status(404).json({ ok: false, requestId, error: 'Promo code not found', errorCode: 'not_found' });
        await supabaseAdminRest(config, `promo_codes?code=eq.${encodeFilterValue(code)}`, { method: 'DELETE' });
        await insertAdminAuditEvent(config, {
          action: 'delete_promo_code',
          actor_user_id: access.auth.userId,
          target_type: 'promo_codes',
          target_id: code,
          detail: `Deleted promo code: ${code}. ${note.operatorNote}`,
          before: existing[0],
          request_id: requestId,
          ip_hash: hashRequestIp(req),
        });
        return res.status(200).json({ ok: true, requestId });
      }
      if (resource === 'prices' && itemId && route.length === 2) {
        const id = itemId.trim();
        const existing = await supabaseAdminRest<PriceRow[]>(config, `plan_prices?id=eq.${encodeFilterValue(id)}&select=*&limit=1`);
        if (!existing?.[0]) return res.status(404).json({ ok: false, requestId, error: 'Plan price not found', errorCode: 'not_found' });
        await supabaseAdminRest(config, `plan_prices?id=eq.${encodeFilterValue(id)}`, { method: 'DELETE' });
        await insertAdminAuditEvent(config, {
          action: 'delete_plan_price',
          actor_user_id: access.auth.userId,
          target_type: 'plan_prices',
          target_id: id,
          detail: `Deleted plan price ID: ${id}. ${note.operatorNote}`,
          before: existing[0],
          request_id: requestId,
          ip_hash: hashRequestIp(req),
        });
        return res.status(200).json({ ok: true, requestId });
      }
    }

    return res.status(404).json({ ok: false, requestId, error: 'Not found', errorCode: 'not_found' });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Pricing management failed',
      errorCode: 'pricing_management_failed',
      details: sanitizeErrorDetails(error, 220),
    });
  }
}
