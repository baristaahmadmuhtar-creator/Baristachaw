const DEFAULT_API_BASE_URL = 'https://app.baristachaw.com';
const DEFAULT_WEB_APP_URL = 'https://app.baristachaw.com';
const DEFAULT_APP_SCHEME = 'baristachaw';
const DEFAULT_RELEASE_CHANNEL = 'mobile-local';
// MVP mobile ships web parity as the primary Android UI. Native screens remain
// available for explicit non-production builds, not as an automatic production fallback.
const DEFAULT_MOBILE_UI_MODE = 'web_parity';
const DEFAULT_PARITY_TIMEOUT_MS = 6_000;
const DEFAULT_ENABLE_PARITY_FALLBACK = false;
const DEFAULT_ENABLE_DEBUG_WEB_PARITY = false;
const DEFAULT_HARD_FAIL_TO_DEBUG_PARITY = false;
const DEFAULT_ENABLE_GUEST_MODE = false;
const DEFAULT_ENABLE_APPLE_SIGNIN = false;

type MobileUiMode = 'web_parity' | 'native';
type MobileRuntimePolicy = 'web_parity_primary' | 'native_primary' | 'native_debug_parity_enabled' | 'native_hard_fail_to_debug_parity';

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_API_BASE_URL;
  return trimmed.replace(/\/+$/, '');
}

function normalizeOptionalBaseUrl(raw: string | undefined): string {
  const trimmed = (raw || '').trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : '';
}

function normalizeScheme(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return DEFAULT_APP_SCHEME;
  if (!/^[a-z][a-z0-9+.-]*$/.test(trimmed)) return DEFAULT_APP_SCHEME;
  return trimmed;
}

function normalizeUiMode(raw: string): MobileUiMode {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'web_parity') return 'web_parity';
  return 'native';
}

function normalizeBoolean(raw: string | undefined, defaultValue: boolean): boolean {
  if (!raw) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function normalizeTimeoutMs(raw: string | undefined): number {
  const parsed = Number.parseInt((raw || '').trim(), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_PARITY_TIMEOUT_MS;
  return Math.max(2_000, Math.min(20_000, parsed));
}

function resolveRuntimePolicy(params: {
  uiMode: MobileUiMode;
  debugWebParityEnabled: boolean;
  hardFailToDebugParity: boolean;
}): MobileRuntimePolicy {
  if (params.hardFailToDebugParity) return 'native_hard_fail_to_debug_parity';
  if (params.uiMode === 'web_parity') return 'web_parity_primary';
  if (params.debugWebParityEnabled) return 'native_debug_parity_enabled';
  return 'native_primary';
}

const uiMode = normalizeUiMode(process.env.EXPO_PUBLIC_MOBILE_UI_MODE || DEFAULT_MOBILE_UI_MODE);
const debugWebParityEnabled = normalizeBoolean(
  process.env.EXPO_PUBLIC_DEBUG_WEB_PARITY_ENABLED,
  DEFAULT_ENABLE_DEBUG_WEB_PARITY,
);
const hardFailToDebugParity = normalizeBoolean(
  process.env.EXPO_PUBLIC_HARD_FAIL_TO_DEBUG_PARITY,
  DEFAULT_HARD_FAIL_TO_DEBUG_PARITY,
);
const runtimePolicy = resolveRuntimePolicy({ uiMode, debugWebParityEnabled, hardFailToDebugParity });
const apiBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL);
const webAppUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_WEB_APP_URL || DEFAULT_WEB_APP_URL);

export const mobileEnv = {
  apiBaseUrl,
  webAppUrl,
  appScheme: normalizeScheme(process.env.EXPO_PUBLIC_APP_SCHEME || DEFAULT_APP_SCHEME),
  supabaseUrl: normalizeOptionalBaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
  uiMode,
  runtimePolicy,
  webParityTimeoutMs: normalizeTimeoutMs(process.env.EXPO_PUBLIC_WEB_PARITY_TIMEOUT_MS),
  webParityFallbackEnabled: normalizeBoolean(process.env.EXPO_PUBLIC_WEB_PARITY_FALLBACK_ENABLED, DEFAULT_ENABLE_PARITY_FALLBACK),
  debugWebParityEnabled,
  hardFailToDebugParity,
  enableGuestMode: normalizeBoolean(process.env.EXPO_PUBLIC_ENABLE_GUEST_MODE, DEFAULT_ENABLE_GUEST_MODE),
  enableAppleSignIn: normalizeBoolean(process.env.EXPO_PUBLIC_ENABLE_APPLE_SIGNIN, DEFAULT_ENABLE_APPLE_SIGNIN),
  sentryDsn: (process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim(),
  release: (process.env.EXPO_PUBLIC_RELEASE || '').trim() || DEFAULT_RELEASE_CHANNEL,
} as const;

export const isSupabaseAuthConfigured = Boolean(
  mobileEnv.supabaseUrl &&
  mobileEnv.supabasePublishableKey &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(mobileEnv.supabaseUrl),
);
