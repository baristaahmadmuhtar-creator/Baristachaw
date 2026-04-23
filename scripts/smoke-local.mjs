import { normalizeLoopbackBaseUrl } from './local-qa-env.mjs';
import { runSmoke } from './smoke-runner.mjs';

const baseUrl = normalizeLoopbackBaseUrl(process.env.BASE_URL || 'http://127.0.0.1:3000');
const deepHealthToken = process.env.HEALTHCHECK_TOKEN || '';
const requireServer = ['1', 'true', 'yes', 'on'].includes(String(process.env.SMOKE_REQUIRE_SERVER || '').toLowerCase());
const testAuthSetting = String(process.env.ENABLE_TEST_AUTH_ENDPOINT || '').toLowerCase();
const enableTestAuth = ['1', 'true', 'yes', 'on'].includes(testAuthSetting);
const disableTestAuth = ['0', 'false', 'no', 'off'].includes(testAuthSetting);
const isLoopbackBaseUrl = (() => {
  try {
    const parsed = new URL(baseUrl);
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '::1' || parsed.hostname === '[::1]';
  } catch {
    return false;
  }
})();
const probeLocalTestAuth = !enableTestAuth && !disableTestAuth && isLoopbackBaseUrl;
const testAuthToken = (enableTestAuth || probeLocalTestAuth)
  ? String(process.env.TEST_AUTH_TOKEN || 'local-test-token').trim()
  : '';
const useE2eMock = !['0', 'false', 'no', 'off'].includes(String(process.env.SMOKE_USE_E2E_MOCK || '1').toLowerCase());

async function isServerReachable(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${url.replace(/\/+$/, '')}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

const reachable = await isServerReachable(baseUrl);
if (!reachable && !requireServer) {
  console.log(
    `[smoke:local] skipped: ${baseUrl} is not reachable. ` +
    'Set SMOKE_REQUIRE_SERVER=1 to fail when server is offline.',
  );
} else {
  runSmoke({
    baseUrl,
    label: 'local',
    deepHealthToken: deepHealthToken || undefined,
    testAuthToken: testAuthToken || undefined,
    allowUnavailableTestAuth: probeLocalTestAuth,
    useE2eMock,
  }).catch(error => {
    console.error('[smoke:local] failed:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
