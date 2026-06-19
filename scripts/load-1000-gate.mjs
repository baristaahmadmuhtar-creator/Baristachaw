const ACCOUNT_COUNT = Number(process.env.LOAD_ACCOUNTS || 1000);
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 150);
const DAILY_QUOTA = Number(process.env.LOAD_DAILY_QUOTA || 60);
const ABUSE_REQUESTS = Number(process.env.LOAD_ABUSE_REQUESTS || 40);
const SPEND_BUDGET_USD = Number(process.env.LOAD_SPEND_BUDGET_USD || 2);

function makePrng(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const random = makePrng(20260619);

class QuotaSimulator {
  constructor() {
    this.usage = new Map();
    this.ledger = new Map();
  }

  reserve({ requestId, userId, route, mode }) {
    const used = this.usage.get(userId) || 0;
    const reserved = [...this.ledger.values()]
      .filter((entry) => entry.userId === userId && entry.status === 'reserved')
      .reduce((sum, entry) => sum + entry.units, 0);
    if (used + reserved + 1 > DAILY_QUOTA) {
      this.ledger.set(requestId, { requestId, userId, route, mode, units: 1, status: 'rejected', charged: 0 });
      return { allowed: false, used: used + reserved, limit: DAILY_QUOTA };
    }
    this.ledger.set(requestId, { requestId, userId, route, mode, units: 1, status: 'reserved', charged: 0 });
    return { allowed: true, used: used + reserved + 1, limit: DAILY_QUOTA };
  }

  commit(requestId, tokens, costUsd) {
    const entry = this.ledger.get(requestId);
    if (!entry || entry.status !== 'reserved') return false;
    entry.status = 'committed';
    entry.charged = entry.units;
    entry.tokens = tokens;
    entry.costUsd = costUsd;
    this.usage.set(entry.userId, (this.usage.get(entry.userId) || 0) + entry.units);
    return true;
  }

  refund(requestId, reason) {
    const entry = this.ledger.get(requestId);
    if (!entry || entry.status !== 'reserved') return false;
    entry.status = 'refunded';
    entry.reason = reason;
    entry.charged = 0;
    return true;
  }

  committedCount(userId) {
    return this.usage.get(userId) || 0;
  }

  totalCostUsd() {
    return [...this.ledger.values()].reduce((sum, entry) => sum + (entry.costUsd || 0), 0);
  }

  count(status) {
    return [...this.ledger.values()].filter((entry) => entry.status === status).length;
  }
}

class RateLimiter {
  constructor() {
    this.buckets = new Map();
  }

  check(key, nowMs) {
    const windowMs = 5 * 60 * 1000;
    const maxRequests = 30;
    const bucket = this.buckets.get(key) || { start: nowMs, count: 0 };
    if (nowMs - bucket.start >= windowMs) {
      bucket.start = nowMs;
      bucket.count = 0;
    }
    bucket.count += 1;
    this.buckets.set(key, bucket);
    return { allowed: bucket.count <= maxRequests, remaining: Math.max(0, maxRequests - bucket.count) };
  }
}

async function runPool(items, concurrency, worker) {
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(workers);
}

async function mockedProviderCall() {
  const latencyMs = 45 + Math.round(random() * 420);
  await new Promise((resolve) => setTimeout(resolve, Math.min(latencyMs, 8)));
  const failRoll = random();
  if (failRoll < 0.045) return { ok: false, latencyMs, outcome: 'provider_timeout' };
  const fallback = failRoll < 0.095;
  const inputTokens = 180 + Math.round(random() * 420);
  const outputTokens = 220 + Math.round(random() * 760);
  const costUsd = ((inputTokens * 0.3) + (outputTokens * 2.5)) / 1_000_000;
  return { ok: true, fallback, latencyMs, inputTokens, outputTokens, costUsd };
}

function percentile(values, p) {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] || 0;
}

async function main() {
  const quota = new QuotaSimulator();
  const limiter = new RateLimiter();
  const latencies = [];
  let providerFailures = 0;
  let fallbackSuccesses = 0;
  let rateLimited = 0;

  const requests = Array.from({ length: ACCOUNT_COUNT }, (_, index) => ({
    requestId: `load-user-${index + 1}-chat-1`,
    userId: `load-user-${index + 1}`,
    route: '/api/chat',
    mode: index % 11 === 0 ? 'deep' : 'normal',
    nowMs: index * 15,
  }));

  await runPool(requests, CONCURRENCY, async (request) => {
    const rate = limiter.check(`${request.route}:${request.userId}`, request.nowMs);
    if (!rate.allowed) {
      rateLimited += 1;
      return;
    }

    const reservation = quota.reserve(request);
    if (!reservation.allowed) return;

    const provider = await mockedProviderCall();
    latencies.push(provider.latencyMs);
    if (!provider.ok) {
      providerFailures += 1;
      quota.refund(request.requestId, provider.outcome);
      return;
    }
    if (provider.fallback) fallbackSuccesses += 1;
    quota.commit(request.requestId, provider.inputTokens + provider.outputTokens, provider.costUsd);
  });

  const raceUser = 'quota-race-user';
  const raceRequests = Array.from({ length: 200 }, (_, index) => ({
    requestId: `race-${index + 1}`,
    userId: raceUser,
    route: '/api/ai',
    mode: 'normal',
    nowMs: 900_000,
  }));
  await runPool(raceRequests, 200, async (request) => {
    const reservation = quota.reserve(request);
    if (!reservation.allowed) return;
    quota.commit(request.requestId, 600, 0.0009);
  });

  const abuseUser = 'rate-limit-abuse-user';
  for (let index = 0; index < ABUSE_REQUESTS; index += 1) {
    const rate = limiter.check(`/api/chat:${abuseUser}`, 1_200_000 + index * 100);
    if (!rate.allowed) {
      rateLimited += 1;
      continue;
    }
    const requestId = `abuse-${index + 1}`;
    const reservation = quota.reserve({ requestId, userId: abuseUser, route: '/api/chat', mode: 'normal' });
    if (reservation.allowed) quota.commit(requestId, 500, 0.00075);
  }

  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const totalCostUsd = quota.totalCostUsd();
  const fallbackRate = fallbackSuccesses / Math.max(1, quota.count('committed'));

  const assertions = [
    ['all single-account launch requests processed', quota.count('committed') + quota.count('refunded') + quota.count('rejected') >= ACCOUNT_COUNT],
    ['quota race capped at daily limit', quota.committedCount(raceUser) <= DAILY_QUOTA],
    ['provider failures refunded', quota.count('refunded') >= providerFailures],
    ['rate limiter produced 429s for abusive user', rateLimited >= ABUSE_REQUESTS - 30],
    ['p95 latency under mocked budget', p95 <= 450],
    ['p99 latency under mocked budget', p99 <= 470],
    ['fallback rate under 15%', fallbackRate <= 0.15],
    ['mocked spend under budget', totalCostUsd <= SPEND_BUDGET_USD],
  ];

  const failed = assertions.filter(([, ok]) => !ok);
  const summary = {
    accounts: ACCOUNT_COUNT,
    concurrency: CONCURRENCY,
    committed: quota.count('committed'),
    refunded: quota.count('refunded'),
    rejected: quota.count('rejected'),
    rateLimited,
    p95,
    p99,
    fallbackRate: Number(fallbackRate.toFixed(4)),
    totalCostUsd: Number(totalCostUsd.toFixed(6)),
  };

  console.log('[load:1000]', JSON.stringify(summary, null, 2));
  if (failed.length > 0) {
    for (const [name] of failed) console.error(`[load:1000] failed assertion: ${name}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[load:1000] failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
