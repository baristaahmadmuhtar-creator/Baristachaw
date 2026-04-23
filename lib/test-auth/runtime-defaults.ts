export const LOCAL_DEV_JWT_SECRET = 'local-test-jwt-secret-32-chars-minimum';
export const LOCAL_TEST_AUTH_TOKEN = 'local-test-token';
export const LOCAL_TEST_AUTH_ENDPOINT_FLAG = '1';

type RuntimeDefaultsOptions = {
  isLocalRuntime: boolean;
  isProduction: boolean;
};

type RuntimeEnv = Record<string, string | undefined>;

function readTrimmed(env: RuntimeEnv, key: string): string {
  return String(env[key] || '').trim();
}

export function buildLocalRuntimeAuthDefaults(env: RuntimeEnv, options: RuntimeDefaultsOptions): RuntimeEnv {
  const next = { ...env };
  if (!options.isLocalRuntime || options.isProduction) return next;

  if (!readTrimmed(next, 'JWT_SECRET')) {
    next.JWT_SECRET = LOCAL_DEV_JWT_SECRET;
  }
  if (!readTrimmed(next, 'ENABLE_TEST_AUTH_ENDPOINT')) {
    next.ENABLE_TEST_AUTH_ENDPOINT = LOCAL_TEST_AUTH_ENDPOINT_FLAG;
  }
  if (!readTrimmed(next, 'TEST_AUTH_TOKEN')) {
    next.TEST_AUTH_TOKEN = LOCAL_TEST_AUTH_TOKEN;
  }

  return next;
}
