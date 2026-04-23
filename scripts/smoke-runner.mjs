const DEFAULT_TIMEOUT_MS = 30000;

function joinUrl(baseUrl, path) {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function numberFromEnv(raw, fallback) {
  const parsed = Number.parseInt(String(raw || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  const clamped = Math.max(0, Math.min(sorted.length - 1, idx));
  return sorted[clamped];
}

function summarizeLatency(values) {
  if (!values.length) return 'samples=0';
  const p50 = percentile(values, 50);
  const p95 = percentile(values, 95);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return `samples=${values.length} min=${min}ms p50=${p50}ms p95=${p95}ms max=${max}ms`;
}

function detectResponseLanguage(text) {
  const value = String(text || '').trim();
  if (!value) return 'unknown';
  if (/[\u3040-\u30ff]/u.test(value)) return 'ja';
  if (/[\u4e00-\u9fff]/u.test(value)) return 'zh';
  if (/[\u0600-\u06ff]/u.test(value)) return 'ar';
  const lowered = value.toLowerCase();
  if (/\b(el|la|los|las|respuesta|pasos|gracias|hola)\b/.test(lowered)) return 'es';
  if (/\b(the|and|with|for|you)\b/.test(lowered)) return 'en';
  return 'unknown';
}

function hasBalancedCodeFences(text) {
  const matches = String(text || '').match(/```/g);
  return ((matches && matches.length) || 0) % 2 === 0;
}

function extractMarkdownSection(text, headingPattern) {
  const value = String(text || '');
  const match = headingPattern.exec(value);
  if (!match || typeof match.index !== 'number') return '';
  const start = match.index + match[0].length;
  const rest = value.slice(start);
  const nextHeadingMatch = /(^|\n)##\s+\S+/g.exec(rest);
  const end = nextHeadingMatch && typeof nextHeadingMatch.index === 'number'
    ? start + nextHeadingMatch.index
    : value.length;
  return value.slice(start, end).trim();
}

function deepQualityCheck(text) {
  const value = String(text || '').trim();
  if (!value) return { ok: false, reason: 'empty' };
  if (value.includes('\uFFFD')) return { ok: false, reason: 'utf8_corrupt' };
  if (!hasBalancedCodeFences(value)) return { ok: false, reason: 'markdown_unbalanced' };
  const hasTldr = /(^|\n)##\s*TL;DR\s*$/im.test(value);
  const hasCore = /(^|\n)##\s*Core Analysis\s*$/im.test(value);
  const hasOptions = /(^|\n)##\s*Options\s*&\s*Tradeoffs\s*$/im.test(value);
  const hasPlan = /(^|\n)##\s*Recommended Action Plan\s*$/im.test(value);
  const hasRisks = /(^|\n)##\s*Risks\s*&\s*Validation\s*$/im.test(value);
  const sectionCount = [hasTldr, hasCore, hasOptions, hasPlan, hasRisks].filter(Boolean).length;
  if (sectionCount < 4) return { ok: false, reason: 'sections_lt4' };
  if (!hasOptions) return { ok: false, reason: 'options_tradeoffs_missing' };
  const actionPlan = extractMarkdownSection(value, /(^|\n)##\s*Recommended Action Plan\s*$/im);
  const actionSteps = (actionPlan.match(/(^|\n)\s*\d+\.\s+\S+/g) || []).length;
  if (actionSteps < 3) return { ok: false, reason: 'action_plan_lt3' };
  const wordCount = (value.match(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu) || []).length;
  if (wordCount < 120) return { ok: false, reason: 'too_short' };
  return { ok: true, reason: 'ok' };
}

function parseTokenList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function splitSetCookieHeader(value) {
  return String(value || '')
    .split(/,(?=\s*[^;,=\s]+=[^;,]*)/g)
    .map(item => item.trim())
    .filter(Boolean);
}

function readSetCookieValues(headers) {
  if (headers && typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie().filter(Boolean).flatMap(splitSetCookieHeader);
    if (values.length) return values;
  }
  const single = headers?.get?.('set-cookie');
  if (!single) return [];
  return splitSetCookieHeader(single);
}

function extractCookieHeader(response) {
  const cookies = [];
  for (const setCookie of readSetCookieValues(response.headers)) {
    const cookiePair = String(setCookie).split(';')[0]?.trim();
    if (cookiePair) cookies.push(cookiePair);
  }
  return cookies.join('; ');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function requestAny(baseUrl, path, options = {}) {
  const url = joinUrl(baseUrl, path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
      signal: controller.signal,
    });
    const text = await response.text();
    const durationMs = Date.now() - startedAt;
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { response, text, json, durationMs };
  } finally {
    clearTimeout(timeout);
  }
}

function pass(results, name, details) {
  results.push({ ok: true, name, details });
}

function fail(results, name, details) {
  results.push({ ok: false, name, details });
}

function summarize(results, label, baseUrl) {
  const passed = results.filter(item => item.ok).length;
  const failed = results.length - passed;

  console.log(`\n[smoke] ${label} - ${baseUrl}`);
  for (const result of results) {
    const prefix = result.ok ? 'PASS' : 'FAIL';
    console.log(`[${prefix}] ${result.name} -> ${result.details}`);
  }
  console.log(`[smoke] total=${results.length} passed=${passed} failed=${failed}`);

  if (failed > 0) {
    throw new Error(`Smoke test failed with ${failed} failing checks.`);
  }
}

function hasSecurityHeaders(response) {
  const required = [
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'strict-transport-security',
    'content-security-policy',
  ];
  const missing = required.filter(key => !response.headers.get(key));
  return { ok: missing.length === 0, missing };
}

async function runUnauthSecurityChecks(baseUrl, results, expectTestAuthDisabled) {
  const unauthChat = await requestAny(baseUrl, '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Smoke unauth ping', mode: 'race' }),
  });
  if (unauthChat.response.status === 401 && unauthChat.json?.errorCode === 'auth_required') {
    pass(results, 'POST /api/chat no-auth', '401 auth_required');
  } else {
    fail(
      results,
      'POST /api/chat no-auth',
      `http=${unauthChat.response.status} body=${unauthChat.text.slice(0, 160)}`,
    );
  }

  const unauthAi = await requestAny(baseUrl, '/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'fast', prompt: 'Smoke unauth ping' }),
  });
  if (unauthAi.response.status === 401 && unauthAi.json?.errorCode === 'auth_required') {
    pass(results, 'POST /api/ai no-auth', '401 auth_required');
  } else {
    fail(
      results,
      'POST /api/ai no-auth',
      `http=${unauthAi.response.status} body=${unauthAi.text.slice(0, 160)}`,
    );
  }

  if (expectTestAuthDisabled) {
    const testAuth = await requestAny(baseUrl, '/api/test-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-token': 'smoke' },
      body: JSON.stringify({ id: 'smoke-prod', email: 'smoke@example.com', name: 'Smoke' }),
    });
    if (testAuth.response.status === 404) {
      pass(results, 'POST /api/test-auth/login', '404 disabled in production');
    } else {
      fail(
        results,
        'POST /api/test-auth/login',
        `http=${testAuth.response.status} body=${testAuth.text.slice(0, 160)}`,
      );
    }
  }
}

async function runAuthenticatedModeChecks({
  baseUrl,
  results,
  bearerToken,
  samples,
  targets,
  aiDelayMs,
  useE2eMock,
}) {
  const tokens = parseTokenList(bearerToken);
  if (!tokens.length) {
    fail(results, 'auth token', 'no bearer token provided for authenticated checks');
    return;
  }
  const normalToken = tokens[0];
  const fastToken = tokens[0];
  const deepToken = tokens[1] || tokens[0];

  const timings = {
    normal: [],
    fast: [],
    deep: [],
    search: [],
  };
  const deepQualityFailures = [];
  const chatTimeoutMs = 45000;
  const aiTimeoutMs = 65000;
  const mockHeaders = useE2eMock ? { 'x-e2e-mock': '1' } : {};

  try {
    const me = await requestAny(baseUrl, '/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${normalToken}`,
      },
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
    if (me.response.status === 200 && me.json?.user?.id) {
      pass(results, 'GET /api/auth/me', `user=${String(me.json.user.id).slice(0, 48)}`);
    } else {
      fail(results, 'GET /api/auth/me', `http=${me.response.status} body=${me.text.slice(0, 160)}`);
    }
  } catch (error) {
    fail(results, 'GET /api/auth/me', `request_failed=${String(error instanceof Error ? error.message : error).slice(0, 160)}`);
  }

  for (let i = 1; i <= samples; i++) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${normalToken}`,
      ...mockHeaders,
    };
    try {
      const normal = await requestAny(baseUrl, '/api/chat', {
        method: 'POST',
        headers,
        timeoutMs: chatTimeoutMs,
        body: JSON.stringify({
          message: `Smoke NORMAL sample ${i}: reply with exactly one short sentence giving one coffee brewing tip.`,
          mode: 'race',
          responseProfile: {
            language: 'en',
            verbosity: 'balanced',
            format: 'plain',
            tone: 'neutral',
            ambiguityPolicy: 'ask_first',
          },
          clientContext: {
            platform: 'web',
            surface: 'chat',
            appLanguage: 'en',
            acceptLanguage: 'en-US,en;q=0.9',
          },
        }),
      });
      if (normal.response.status !== 200 || !normal.text.trim()) {
        fail(
          results,
          `mode normal sample ${i}`,
          `http=${normal.response.status} body=${normal.text.slice(0, 160)}`,
        );
        continue;
      }
      timings.normal.push(normal.durationMs);
    } catch (error) {
      fail(results, `mode normal sample ${i}`, `request_failed=${String(error instanceof Error ? error.message : error).slice(0, 160)}`);
    }
  }

  for (let i = 1; i <= samples; i++) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${normalToken}`,
      ...mockHeaders,
    };
    try {
      const search = await requestAny(baseUrl, '/api/ai', {
        method: 'POST',
        headers,
        timeoutMs: aiTimeoutMs,
        body: JSON.stringify({
          action: 'search',
          prompt: `Smoke SEARCH sample ${i}: latest practical coffee brewing insights with current web references.`,
          responseProfile: {
            language: 'en',
            verbosity: 'comprehensive',
            format: 'steps',
            tone: 'professional',
            ambiguityPolicy: 'assume',
          },
          clientContext: {
            platform: 'web',
            surface: 'home',
            appLanguage: 'en',
            acceptLanguage: 'en-US,en;q=0.9',
          },
        }),
      });
      const sourceCount = Number(search.json?.sourceCount || 0);
      const sourcesLength = Array.isArray(search.json?.sources) ? search.json.sources.length : 0;
      const text = String(search.json?.text || '').trim();
      const ok = search.response.status === 200 && search.json?.ok !== false && text && sourceCount >= 2 && sourcesLength >= 2;
      if (!ok) {
        fail(
          results,
          `mode search sample ${i}`,
          `http=${search.response.status} ok=${String(search.json?.ok)} sourceCount=${sourceCount} sources=${sourcesLength} body=${search.text.slice(0, 160)}`,
        );
        continue;
      }
      timings.search.push(search.durationMs);
    } catch (error) {
      fail(results, `mode search sample ${i}`, `request_failed=${String(error instanceof Error ? error.message : error).slice(0, 160)}`);
    }
    if (aiDelayMs > 0 && i < samples) await sleep(aiDelayMs);
  }

  for (let i = 1; i <= samples; i++) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fastToken}`,
      ...mockHeaders,
    };
    try {
      const fast = await requestAny(baseUrl, '/api/ai', {
        method: 'POST',
        headers,
        timeoutMs: aiTimeoutMs,
        body: JSON.stringify({
          action: 'fast',
          prompt: `Smoke FAST sample ${i}: return one short sentence (max 18 words) with an espresso adjustment tip.`,
          responseProfile: {
            language: 'en',
            verbosity: 'short',
            format: 'bullets',
            tone: 'neutral',
            ambiguityPolicy: 'assume',
          },
          clientContext: {
            platform: 'web',
            surface: 'chat',
            appLanguage: 'en',
            acceptLanguage: 'en-US,en;q=0.9',
          },
        }),
      });
      if (fast.response.status !== 200 || fast.json?.ok === false || !String(fast.json?.text || '').trim()) {
        fail(
          results,
          `mode fast sample ${i}`,
          `http=${fast.response.status} body=${fast.text.slice(0, 160)}`,
        );
        continue;
      }
      timings.fast.push(fast.durationMs);
    } catch (error) {
      fail(results, `mode fast sample ${i}`, `request_failed=${String(error instanceof Error ? error.message : error).slice(0, 160)}`);
    }
    if (aiDelayMs > 0 && i < samples) await sleep(aiDelayMs);
  }

  for (let i = 1; i <= samples; i++) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${deepToken}`,
      ...mockHeaders,
    };
    try {
      const deep = await requestAny(baseUrl, '/api/ai', {
        method: 'POST',
        headers,
        timeoutMs: aiTimeoutMs,
        body: JSON.stringify({
          action: 'deep_think',
          prompt: `Smoke DEEP sample ${i}: analyze V60 brew-ratio tradeoffs and provide practical recommendations.`,
          responseProfile: {
            language: 'en',
            verbosity: 'comprehensive',
            format: 'steps',
            tone: 'professional',
            ambiguityPolicy: 'ask_first',
          },
          clientContext: {
            platform: 'web',
            surface: 'chat',
            appLanguage: 'en',
            acceptLanguage: 'en-US,en;q=0.9',
          },
        }),
      });
      if (deep.response.status !== 200 || deep.json?.ok === false || !String(deep.json?.text || '').trim()) {
        fail(
          results,
          `mode deep sample ${i}`,
          `http=${deep.response.status} body=${deep.text.slice(0, 160)}`,
        );
        continue;
      }
      timings.deep.push(deep.durationMs);
      const quality = deepQualityCheck(String(deep.json?.text || ''));
      const deepQualityHeader = String(deep.response.headers.get('x-deep-quality-pass') || '').toLowerCase();
      if (!quality.ok || deepQualityHeader === 'false') {
        deepQualityFailures.push(
          `sample=${i} quality=${quality.reason} header=${deepQualityHeader || 'n/a'}`,
        );
      }
      if (deep.json?.degraded === true && !String(deep.json?.details || '').trim()) {
        deepQualityFailures.push(`sample=${i} degraded_without_details`);
      }
      if (deep.json?.deepMeta) {
        const meta = deep.json.deepMeta;
        if (meta.mode !== 'deep') deepQualityFailures.push(`sample=${i} deepMeta_mode_invalid`);
        if (typeof meta.qualityPass !== 'boolean') deepQualityFailures.push(`sample=${i} deepMeta_quality_missing`);
        if (typeof meta.fallbackUsed !== 'boolean') deepQualityFailures.push(`sample=${i} deepMeta_fallback_missing`);
      }
    } catch (error) {
      fail(results, `mode deep sample ${i}`, `request_failed=${String(error instanceof Error ? error.message : error).slice(0, 160)}`);
    }
    if (aiDelayMs > 0 && i < samples) await sleep(aiDelayMs);
  }

  const languageScenarios = [
    {
      id: 'es',
      prompt: 'Por favor responde en español con dos consejos breves para mejorar espresso.',
      acceptLanguage: 'es-ES,es;q=0.9,en;q=0.6',
    },
    {
      id: 'ja',
      prompt: '日本語で、ハンドドリップを改善する短いポイントを2つ教えてください。',
      acceptLanguage: 'ja-JP,ja;q=0.9,en;q=0.6',
    },
  ];

  for (const scenario of languageScenarios) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${fastToken}`,
      ...mockHeaders,
    };
    try {
      const resp = await requestAny(baseUrl, '/api/ai', {
        method: 'POST',
        headers,
        timeoutMs: aiTimeoutMs,
        body: JSON.stringify({
          action: 'fast',
          prompt: scenario.prompt,
          responseProfile: {
            language: scenario.id,
            verbosity: 'short',
            format: 'bullets',
            tone: 'neutral',
            ambiguityPolicy: 'assume',
          },
          clientContext: {
            platform: 'web',
            surface: 'chat',
            appLanguage: scenario.id,
            acceptLanguage: scenario.acceptLanguage,
          },
        }),
      });
      const text = String(resp.json?.text || '');
      const detected = detectResponseLanguage(text);
      if (resp.response.status === 200 && resp.json?.ok !== false && detected === scenario.id) {
        pass(results, `language adherence ${scenario.id}`, `detected=${detected}`);
      } else {
        fail(
          results,
          `language adherence ${scenario.id}`,
          `http=${resp.response.status} detected=${detected} body=${text.slice(0, 120)}`,
        );
      }
    } catch (error) {
      fail(results, `language adherence ${scenario.id}`, `request_failed=${String(error instanceof Error ? error.message : error).slice(0, 160)}`);
    }
    if (aiDelayMs > 0) await sleep(Math.max(200, Math.floor(aiDelayMs / 2)));
  }

  const p95Normal = percentile(timings.normal, 95);
  const p95Fast = percentile(timings.fast, 95);

  if (timings.normal.length === samples) {
    if (p95Normal <= targets.normalMs) {
      pass(results, 'mode normal p95', `${summarizeLatency(timings.normal)} threshold=${targets.normalMs}ms`);
    } else {
      fail(results, 'mode normal p95', `${summarizeLatency(timings.normal)} threshold=${targets.normalMs}ms`);
    }
  } else {
    fail(results, 'mode normal completeness', `passed_samples=${timings.normal.length}/${samples}`);
  }

  if (timings.fast.length === samples) {
    if (p95Fast <= targets.fastMs) {
      pass(results, 'mode fast p95', `${summarizeLatency(timings.fast)} threshold=${targets.fastMs}ms`);
    } else {
      fail(results, 'mode fast p95', `${summarizeLatency(timings.fast)} threshold=${targets.fastMs}ms`);
    }
  } else {
    fail(results, 'mode fast completeness', `passed_samples=${timings.fast.length}/${samples}`);
  }

  if (timings.deep.length === samples) {
    pass(results, 'mode deep latency info', `${summarizeLatency(timings.deep)} advisory_threshold=${targets.deepMs}ms`);
  } else {
    fail(results, 'mode deep completeness', `passed_samples=${timings.deep.length}/${samples}`);
  }

  if (timings.search.length === samples) {
    pass(results, 'mode search latency info', `${summarizeLatency(timings.search)} advisory_threshold=${targets.normalMs}ms`);
    pass(results, 'mode search source gate', `samples=${timings.search.length}/${samples} sourceCount>=2`);
  } else {
    fail(results, 'mode search completeness', `passed_samples=${timings.search.length}/${samples}`);
  }

  if (deepQualityFailures.length === 0) {
    pass(results, 'mode deep quality gate', `samples=${timings.deep.length}/${samples} passed`);
  } else {
    fail(results, 'mode deep quality gate', deepQualityFailures.join(' | ').slice(0, 220));
  }
}

async function runQaCookieAuthChecks({
  baseUrl,
  results,
  testAuthToken,
  useE2eMock,
  allowUnavailableTestAuth,
}) {
  const origin = baseUrl.replace(/\/+$/, '');
  const login = await requestAny(baseUrl, '/api/test-auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-token': testAuthToken,
      Origin: origin,
    },
    body: JSON.stringify({
      id: 'smoke-local-qa',
      email: 'smoke-local@example.com',
      name: 'Smoke Local QA',
    }),
  });

  if (login.response.status !== 200 || login.json?.ok !== true) {
    if (allowUnavailableTestAuth && (login.response.status === 403 || login.response.status === 404)) {
      pass(results, 'authenticated mode checks', `skipped (QA test auth unavailable http=${login.response.status})`);
      return;
    }
    fail(results, 'POST /api/test-auth/login', `http=${login.response.status} body=${login.text.slice(0, 160)}`);
    return;
  }

  const cookieHeader = extractCookieHeader(login.response);
  if (!cookieHeader || !/auth_token=/.test(cookieHeader)) {
    fail(results, 'QA auth cookie', 'missing auth_token cookie from test-auth login');
    return;
  }
  pass(results, 'POST /api/test-auth/login', '200 qa cookie issued');

  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
    Origin: origin,
    ...(useE2eMock ? { 'x-e2e-mock': '1' } : {}),
  };

  try {
    const me = await requestAny(baseUrl, '/api/auth/me', {
      method: 'GET',
      headers: authHeaders,
    });
    if (me.response.status === 200 && me.json?.authenticated === true && me.json?.user?.id) {
      pass(results, 'GET /api/auth/me qa-cookie', `user=${String(me.json.user.id).slice(0, 48)}`);
    } else {
      fail(results, 'GET /api/auth/me qa-cookie', `http=${me.response.status} body=${me.text.slice(0, 160)}`);
    }

    const normal = await requestAny(baseUrl, '/api/chat', {
      method: 'POST',
      headers: authHeaders,
      timeoutMs: 45000,
      body: JSON.stringify({
        message: 'Smoke local QA auth: reply with one short coffee brewing tip.',
        mode: 'race',
        responseProfile: {
          language: 'en',
          verbosity: 'short',
          format: 'plain',
          tone: 'neutral',
          ambiguityPolicy: 'assume',
        },
        clientContext: {
          platform: 'web',
          surface: 'chat',
          appLanguage: 'en',
          acceptLanguage: 'en-US,en;q=0.9',
        },
      }),
    });
    if (normal.response.status === 200 && normal.text.trim()) {
      pass(results, 'POST /api/chat qa-cookie', `text=${normal.text.slice(0, 80).replace(/\s+/g, ' ')}`);
    } else {
      fail(results, 'POST /api/chat qa-cookie', `http=${normal.response.status} body=${normal.text.slice(0, 160)}`);
    }

    const fast = await requestAny(baseUrl, '/api/ai', {
      method: 'POST',
      headers: authHeaders,
      timeoutMs: 65000,
      body: JSON.stringify({
        action: 'fast',
        prompt: 'Smoke local QA auth: give one short espresso adjustment tip.',
        responseProfile: {
          language: 'en',
          verbosity: 'short',
          format: 'bullets',
          tone: 'neutral',
          ambiguityPolicy: 'assume',
        },
        clientContext: {
          platform: 'web',
          surface: 'chat',
          appLanguage: 'en',
          acceptLanguage: 'en-US,en;q=0.9',
        },
      }),
    });
    if (fast.response.status === 200 && fast.json?.ok !== false && String(fast.json?.text || '').trim()) {
      pass(results, 'POST /api/ai fast qa-cookie', `text=${String(fast.json.text).slice(0, 80).replace(/\s+/g, ' ')}`);
    } else {
      fail(results, 'POST /api/ai fast qa-cookie', `http=${fast.response.status} body=${fast.text.slice(0, 160)}`);
    }

    const deep = await requestAny(baseUrl, '/api/ai', {
      method: 'POST',
      headers: authHeaders,
      timeoutMs: 65000,
      body: JSON.stringify({
        action: 'deep_think',
        prompt: 'Smoke local QA auth: analyze V60 brew-ratio tradeoffs and give a practical plan.',
        responseProfile: {
          language: 'en',
          verbosity: 'comprehensive',
          format: 'steps',
          tone: 'professional',
          ambiguityPolicy: 'ask_first',
        },
        clientContext: {
          platform: 'web',
          surface: 'chat',
          appLanguage: 'en',
          acceptLanguage: 'en-US,en;q=0.9',
        },
      }),
    });
    const deepText = String(deep.json?.text || '').trim();
    if (
      deep.response.status === 200
      && deep.json?.ok !== false
      && deepText
      && deepQualityCheck(deepText).ok
      && String(deep.response.headers.get('x-deep-quality-pass') || '').toLowerCase() !== 'false'
    ) {
      pass(results, 'POST /api/ai deep qa-cookie', 'deep quality gate passed');
    } else {
      fail(results, 'POST /api/ai deep qa-cookie', `http=${deep.response.status} body=${deep.text.slice(0, 160)}`);
    }

    const search = await requestAny(baseUrl, '/api/ai', {
      method: 'POST',
      headers: authHeaders,
      timeoutMs: 65000,
      body: JSON.stringify({
        action: 'search',
        prompt: 'Smoke local QA auth: latest coffee brewing references with current sources.',
        responseProfile: {
          language: 'en',
          verbosity: 'comprehensive',
          format: 'steps',
          tone: 'professional',
          ambiguityPolicy: 'assume',
        },
        clientContext: {
          platform: 'web',
          surface: 'home',
          appLanguage: 'en',
          acceptLanguage: 'en-US,en;q=0.9',
        },
      }),
    });
    const searchSourceCount = Number(search.json?.sourceCount || 0);
    const searchSourcesLength = Array.isArray(search.json?.sources) ? search.json.sources.length : 0;
    if (
      search.response.status === 200
      && search.json?.ok !== false
      && String(search.json?.text || '').trim()
      && searchSourceCount >= 2
      && searchSourcesLength >= 2
    ) {
      pass(results, 'POST /api/ai search qa-cookie', `sources=${searchSourceCount}`);
    } else {
      fail(results, 'POST /api/ai search qa-cookie', `http=${search.response.status} body=${search.text.slice(0, 160)}`);
    }
  } finally {
    const appLogout = await requestAny(baseUrl, '/api/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
        Origin: origin,
      },
    }).catch(error => ({
      response: { status: -1 },
      text: String(error instanceof Error ? error.message : error),
      json: null,
    }));

    if (appLogout.response.status === 200 && appLogout.json?.success === true) {
      pass(results, 'POST /api/auth/logout qa-cookie', '200 app auth cookie cleared');
    } else {
      fail(results, 'POST /api/auth/logout qa-cookie', `http=${appLogout.response.status} body=${String(appLogout.text || '').slice(0, 160)}`);
      return;
    }

    const clearedCookieHeader = extractCookieHeader(appLogout.response);
    const hasClearedAuthCookie = /(^|;\s*)auth_token=(;|$)/.test(clearedCookieHeader);
    const hasClearedOauthState = /(^|;\s*)oauth_state=(;|$)/.test(clearedCookieHeader);
    const hasClearedOauthReturnTo = /(^|;\s*)oauth_return_to=(;|$)/.test(clearedCookieHeader);
    if (!hasClearedAuthCookie || !hasClearedOauthState || !hasClearedOauthReturnTo) {
      fail(results, 'QA app logout cookies', `missing cleared cookies (${clearedCookieHeader || 'empty'})`);
      return;
    }
    pass(results, 'QA app logout cookies', 'auth and oauth cookies cleared');

    const postLogoutMe = await requestAny(baseUrl, '/api/auth/me', {
      method: 'GET',
      headers: {
        Cookie: clearedCookieHeader,
        Origin: origin,
      },
    });

    if (postLogoutMe.response.status === 401) {
      pass(results, 'GET /api/auth/me after app logout', '401 unauthenticated');
    } else {
      fail(results, 'GET /api/auth/me after app logout', `http=${postLogoutMe.response.status} body=${postLogoutMe.text.slice(0, 160)}`);
      return;
    }

    const logout = await requestAny(baseUrl, '/api/test-auth/logout', {
      method: 'POST',
      headers: {
        Cookie: clearedCookieHeader || cookieHeader,
        Origin: origin,
        'x-test-token': testAuthToken,
      },
    }).catch(error => ({
      response: { status: -1 },
      text: String(error instanceof Error ? error.message : error),
      json: null,
    }));

    if (logout.response.status === 200 && logout.json?.ok === true) {
      pass(results, 'POST /api/test-auth/logout', '200 qa cookie cleared');
    } else {
      fail(results, 'POST /api/test-auth/logout', `http=${logout.response.status} body=${String(logout.text || '').slice(0, 160)}`);
      return;
    }
  }
}

export async function runSmoke({
  baseUrl,
  label,
  deepHealthToken,
  bearerToken,
  testAuthToken,
  useE2eMock,
  samples,
  p95FastMs,
  p95NormalMs,
  p95DeepMs,
  expectTestAuthDisabled,
  allowUnavailableTestAuth,
  aiDelayMs,
}) {
  const results = [];
  const effectiveSamples = numberFromEnv(samples, 15);
  const effectiveAiDelayMs = numberFromEnv(aiDelayMs, 2200);
  const targets = {
    fastMs: numberFromEnv(p95FastMs, 2000),
    normalMs: numberFromEnv(p95NormalMs, 4000),
    deepMs: numberFromEnv(p95DeepMs, 8000),
  };

  const healthPath = deepHealthToken ? '/api/health?deep=1' : '/api/health';
  const healthHeaders = deepHealthToken ? { 'x-health-token': deepHealthToken } : {};
  const health = await requestAny(baseUrl, healthPath, { headers: healthHeaders });
  if (health.response.ok && health.json?.status) {
    pass(results, 'GET /api/health', `status=${health.json.status}`);
  } else {
    fail(results, 'GET /api/health', `http=${health.response.status} body=${health.text.slice(0, 160)}`);
  }

  const headersState = hasSecurityHeaders(health.response);
  if (headersState.ok) {
    pass(results, 'security headers', 'required headers present');
  } else {
    fail(results, 'security headers', `missing=${headersState.missing.join(',')}`);
  }

  const deepWithoutToken = await requestAny(baseUrl, '/api/health?deep=1');
  if (deepWithoutToken.response.status === 403) {
    pass(results, 'GET /api/health?deep=1 no token', '403 forbidden');
  } else {
    fail(
      results,
      'GET /api/health?deep=1 no token',
      `http=${deepWithoutToken.response.status} body=${deepWithoutToken.text.slice(0, 160)}`,
    );
  }

  await runUnauthSecurityChecks(baseUrl, results, Boolean(expectTestAuthDisabled));

  if (bearerToken && String(bearerToken).trim()) {
    await runAuthenticatedModeChecks({
      baseUrl,
      results,
      bearerToken: String(bearerToken).trim(),
      samples: effectiveSamples,
      targets,
      aiDelayMs: effectiveAiDelayMs,
      useE2eMock: Boolean(useE2eMock),
    });
  } else if (!expectTestAuthDisabled && testAuthToken && String(testAuthToken).trim()) {
    await runQaCookieAuthChecks({
      baseUrl,
      results,
      testAuthToken: String(testAuthToken).trim(),
      useE2eMock: Boolean(useE2eMock),
      allowUnavailableTestAuth: Boolean(allowUnavailableTestAuth),
    });
  } else {
    pass(results, 'authenticated mode checks', 'skipped (no bearer token or QA test auth provided)');
  }

  summarize(results, label, baseUrl);
}
