import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCors,
  createRequestId,
  enforceTrustedRequestOrigin,
  sanitizeErrorDetails,
} from '../_shared.js';
import { requireAdmin } from './_access.js';
import { getSupabaseAdminConfig, supabaseAdminRest, insertAdminAuditEvent, hashRequestIp } from '../_supabaseAdmin.js';

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

  const config = getSupabaseAdminConfig();
  if (!config.configured) {
    return res.status(500).json({ ok: false, requestId, error: 'Database not configured' });
  }

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname.replace(/^\/api\/admin\/pricing/, '');

    if (req.method === 'GET') {
      if (path === '/promos') {
        const data = await supabaseAdminRest(config, 'promo_codes?select=*&order=created_at.desc');
        return res.status(200).json({ ok: true, data });
      }
      if (path === '/prices') {
        const data = await supabaseAdminRest(config, 'plan_prices?select=*&order=created_at.desc');
        return res.status(200).json({ ok: true, data });
      }
    }

    if (req.method === 'POST') {
      if (path === '/promos') {
        const payload = req.body;
        const data = await supabaseAdminRest<any[]>(config, 'promo_codes?select=*', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify([payload])
        });
        await insertAdminAuditEvent(config, {
          action: 'create_promo_code',
          actor_user_id: access.auth.userId,
          target_type: 'promo_codes',
          detail: `Created promo code: ${data[0].code}`,
          request_id: requestId,
          ip_hash: hashRequestIp(req),
        });
        return res.status(200).json({ ok: true, data: data[0] });
      }
      if (path === '/prices') {
        const payload = req.body;
        const data = await supabaseAdminRest<any[]>(config, 'plan_prices?select=*', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify([payload])
        });
        await insertAdminAuditEvent(config, {
          action: 'create_plan_price',
          actor_user_id: access.auth.userId,
          target_type: 'plan_prices',
          detail: `Created price for plan: ${data[0].plan_code}`,
          request_id: requestId,
          ip_hash: hashRequestIp(req),
        });
        return res.status(200).json({ ok: true, data: data[0] });
      }
    }

    if (req.method === 'PUT') {
      if (path.startsWith('/promos/')) {
        const code = path.replace('/promos/', '');
        const payload = req.body;
        const data = await supabaseAdminRest<any[]>(config, `promo_codes?code=eq.${code}&select=*`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload)
        });
        await insertAdminAuditEvent(config, {
          action: 'update_promo_code',
          actor_user_id: access.auth.userId,
          target_type: 'promo_codes',
          detail: `Updated promo code: ${code}`,
          request_id: requestId,
          ip_hash: hashRequestIp(req),
        });
        return res.status(200).json({ ok: true, data: data[0] });
      }
      if (path.startsWith('/prices/')) {
        const id = path.replace('/prices/', '');
        const payload = req.body;
        const data = await supabaseAdminRest<any[]>(config, `plan_prices?id=eq.${id}&select=*`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload)
        });
        await insertAdminAuditEvent(config, {
          action: 'update_plan_price',
          actor_user_id: access.auth.userId,
          target_type: 'plan_prices',
          detail: `Updated plan price ID: ${id}`,
          request_id: requestId,
          ip_hash: hashRequestIp(req),
        });
        return res.status(200).json({ ok: true, data: data[0] });
      }
    }

    if (req.method === 'DELETE') {
      if (path.startsWith('/promos/')) {
        const code = path.replace('/promos/', '');
        await supabaseAdminRest(config, `promo_codes?code=eq.${code}`, {
          method: 'DELETE'
        });
        return res.status(200).json({ ok: true });
      }
      if (path.startsWith('/prices/')) {
        const id = path.replace('/prices/', '');
        await supabaseAdminRest(config, `plan_prices?id=eq.${id}`, {
          method: 'DELETE'
        });
        return res.status(200).json({ ok: true });
      }
    }

    return res.status(404).json({ ok: false, requestId, error: 'Not found' });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      requestId,
      error: 'Pricing management failed',
      details: sanitizeErrorDetails(error, 220),
    });
  }
}
