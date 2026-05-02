describe('mobile env defaults', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_WEB_PARITY_FALLBACK_ENABLED;
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    delete process.env.EXPO_PUBLIC_WEB_APP_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('keeps Android production on web parity without automatic native fallback', () => {
    const { mobileEnv } = require('../env');

    expect(mobileEnv.uiMode).toBe('web_parity');
    expect(mobileEnv.runtimePolicy).toBe('web_parity_primary');
    expect(mobileEnv.webParityFallbackEnabled).toBe(false);
  });

  test('allows an explicit native fallback opt-in for debug builds', () => {
    process.env.EXPO_PUBLIC_WEB_PARITY_FALLBACK_ENABLED = 'true';
    const { mobileEnv } = require('../env');

    expect(mobileEnv.webParityFallbackEnabled).toBe(true);
  });
});
