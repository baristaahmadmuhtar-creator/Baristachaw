export function normalizeLoopbackBaseUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (parsed.hostname === 'localhost') {
      parsed.hostname = '127.0.0.1';
    }
    return parsed.origin;
  } catch {
    return String(value || '').trim();
  }
}

export function buildLocalQaEnv(baseEnv, baseUrl) {
  const normalizedBaseUrl = normalizeLoopbackBaseUrl(baseUrl);
  return {
    ...baseEnv,
    BASE_URL: baseEnv.BASE_URL || normalizedBaseUrl,
    ENABLE_TEST_AUTH_ENDPOINT: baseEnv.ENABLE_TEST_AUTH_ENDPOINT || '1',
    TEST_AUTH_TOKEN: baseEnv.TEST_AUTH_TOKEN || 'local-test-token',
    QA_ALLOWED_ORIGINS: baseEnv.QA_ALLOWED_ORIGINS || normalizedBaseUrl,
    APP_URL: baseEnv.APP_URL || normalizedBaseUrl,
  };
}
