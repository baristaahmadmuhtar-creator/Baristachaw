import { expect, type APIRequestContext } from '@playwright/test';
import { buildQaUser } from './test-data';

function normalizeLoopbackBaseUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
    }
    return parsed.origin;
  } catch {
    return value;
  }
}

function getBaseUrl(): string {
  return normalizeLoopbackBaseUrl(process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3000');
}

function testToken(): string {
  return process.env.TEST_AUTH_TOKEN || 'local-test-token';
}

function isTransientRequestError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up/i.test(error.message);
}

async function postTestAuthWithRetry(
  request: APIRequestContext,
  path: '/api/test-auth/login' | '/api/test-auth/logout',
  data: Record<string, unknown>,
) {
  const baseUrl = getBaseUrl();
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await request.post(`${baseUrl}${path}`, {
        headers: {
          'x-test-token': testToken(),
          origin: baseUrl,
          'content-type': 'application/json',
        },
        data,
      });
    } catch (error) {
      lastError = error;
      if (!isTransientRequestError(error) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to POST ${path}`);
}

export async function qaLogin(request: APIRequestContext): Promise<void> {
  const response = await postTestAuthWithRetry(request, '/api/test-auth/login', buildQaUser());
  const body = await response.text();
  expect(response.ok(), `qa login failed: ${response.status()} ${body}`).toBeTruthy();
}

export async function qaLogout(request: APIRequestContext): Promise<void> {
  await postTestAuthWithRetry(request, '/api/test-auth/logout', {});
}

