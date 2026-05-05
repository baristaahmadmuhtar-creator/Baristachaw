export type FeatureFlagStatus = 'available' | 'maintenance' | 'disabled';
export type FeatureSurface = 'global' | 'web' | 'pwa' | 'mobile' | 'admin';

export type AdminFeatureFlag = {
  key: string;
  label: string;
  status: FeatureFlagStatus;
  message: string;
  surfaces: FeatureSurface[];
  updatedAt: string;
};

export type FeatureFlagPatch = Partial<{
  status: FeatureFlagStatus;
  message: string;
  surfaces: FeatureSurface[];
}>;

export const RUNTIME_FEATURE_FLAG_PATCHES = new Map<string, FeatureFlagPatch>();
export const FEATURE_FLAG_STATUSES: FeatureFlagStatus[] = ['available', 'maintenance', 'disabled'];
export const FEATURE_FLAG_SURFACES: FeatureSurface[] = ['global', 'web', 'pwa', 'mobile', 'admin'];

const DEFAULT_FEATURE_FLAGS: AdminFeatureFlag[] = [
  {
    key: 'global_app',
    label: 'Global App',
    status: 'available',
    message: '',
    surfaces: ['global'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'chat',
    label: 'AI Chat',
    status: 'available',
    message: '',
    surfaces: ['web', 'pwa', 'mobile'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'scanner',
    label: 'Vision Scanner',
    status: 'available',
    message: '',
    surfaces: ['web', 'pwa', 'mobile'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'ai_brew',
    label: 'AI Brew',
    status: 'available',
    message: '',
    surfaces: ['web', 'pwa', 'mobile'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'ai_brew_fallback',
    label: 'AI Brew Fallback',
    status: 'available',
    message: 'Allows AI Brew to keep a validated deterministic planner result when the online AI optimizer is unavailable. Disable for strict online-AI generation.',
    surfaces: ['web', 'pwa', 'mobile', 'admin'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'ai_provider_groq',
    label: 'AI Provider: Groq',
    status: 'available',
    message: '',
    surfaces: ['web', 'pwa', 'mobile', 'admin'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'ai_provider_gemini',
    label: 'AI Provider: Gemini',
    status: 'available',
    message: '',
    surfaces: ['web', 'pwa', 'mobile', 'admin'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'ai_provider_deepseek',
    label: 'AI Provider: DeepSeek',
    status: 'available',
    message: '',
    surfaces: ['web', 'pwa', 'mobile', 'admin'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'ai_provider_mistral',
    label: 'AI Provider: Mistral',
    status: 'available',
    message: '',
    surfaces: ['web', 'pwa', 'mobile', 'admin'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'ai_provider_openai',
    label: 'AI Provider: OpenAI',
    status: 'available',
    message: '',
    surfaces: ['web', 'pwa', 'mobile', 'admin'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'ai_provider_openrouter',
    label: 'AI Provider: OpenRouter',
    status: 'available',
    message: '',
    surfaces: ['web', 'pwa', 'mobile', 'admin'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'collection',
    label: 'Collection',
    status: 'available',
    message: '',
    surfaces: ['web', 'pwa', 'mobile'],
    updatedAt: new Date(0).toISOString(),
  },
  {
    key: 'admin_console',
    label: 'Admin Console',
    status: 'available',
    message: '',
    surfaces: ['admin'],
    updatedAt: new Date(0).toISOString(),
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function envEnabled(name: string): boolean {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function parseEnvList(...names: string[]): Set<string> {
  const values = names.map((name) => String(process.env[name] || '')).join(',');
  return new Set(
    values
      .split(/[\n,;]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function normalizeFeatureFlagStatus(value: unknown): FeatureFlagStatus {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'maintenance' || raw === 'disabled') return raw;
  return 'available';
}

export function normalizeFeatureSurface(value: unknown): FeatureSurface | null {
  const raw = normalizeText(value).toLowerCase();
  if ((FEATURE_FLAG_SURFACES as string[]).includes(raw)) return raw as FeatureSurface;
  return null;
}

export function normalizeFeatureSurfaces(value: unknown): FeatureSurface[] {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,;]+/)
      : [];
  const surfaces = rawItems
    .map((item) => normalizeFeatureSurface(item))
    .filter((item): item is FeatureSurface => Boolean(item));
  return [...new Set(surfaces)].slice(0, 5);
}

export function normalizeFeatureFlagKey(value: unknown): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export function normalizeFeatureFlagPatch(rawPatch: unknown): FeatureFlagPatch {
  const raw = rawPatch && typeof rawPatch === 'object' ? rawPatch as Record<string, unknown> : {};
  const patch: FeatureFlagPatch = {};
  if ('status' in raw) patch.status = normalizeFeatureFlagStatus(raw.status);
  if ('message' in raw) patch.message = normalizeText(raw.message).slice(0, 240);
  if ('surfaces' in raw) {
    const surfaces = normalizeFeatureSurfaces(raw.surfaces);
    if (surfaces.length) patch.surfaces = surfaces;
  }
  return patch;
}

function flagEnvAliases(flag: AdminFeatureFlag): string[] {
  const aliases = [flag.key];
  if (flag.key.startsWith('ai_provider_')) {
    aliases.push(flag.key.replace(/^ai_provider_/, ''));
  }
  return aliases;
}

function envListHasFlag(list: Set<string>, flag: AdminFeatureFlag): boolean {
  return flagEnvAliases(flag).some((alias) => list.has(alias));
}

export function featureFlagFromSupabase(row: any): AdminFeatureFlag {
  const key = normalizeFeatureFlagKey(row.key || row.flag_key);
  const defaultFlag = DEFAULT_FEATURE_FLAGS.find((flag) => flag.key === key);
  return {
    key: key || defaultFlag?.key || 'unknown',
    label: normalizeText(row.label, defaultFlag?.label || key || 'Feature'),
    status: normalizeFeatureFlagStatus(row.status),
    message: normalizeText(row.message),
    surfaces: normalizeFeatureSurfaces(row.surfaces).length
      ? normalizeFeatureSurfaces(row.surfaces)
      : defaultFlag?.surfaces || ['global'],
    updatedAt: normalizeText(row.updated_at || row.updatedAt, nowIso()),
  };
}

export function buildRuntimeFeatureFlags(patches?: Map<string, FeatureFlagPatch>): AdminFeatureFlag[] {
  const maintenanceKeys = parseEnvList('MAINTENANCE_FEATURES', 'APP_MAINTENANCE_FEATURES');
  const disabledKeys = parseEnvList('DISABLED_FEATURES', 'APP_DISABLED_FEATURES');
  const globalMaintenance = envEnabled('APP_MAINTENANCE_ENABLED') || envEnabled('MAINTENANCE_MODE');
  const globalMessage = readEnv('APP_MAINTENANCE_MESSAGE', 'MAINTENANCE_MESSAGE')
    || 'Some Baristachaw features are temporarily under maintenance.';

  return DEFAULT_FEATURE_FLAGS.map((flag) => {
    const patch = patches?.get(flag.key);
    const statusFromEnv =
      (globalMaintenance && flag.key === 'global_app') || envListHasFlag(maintenanceKeys, flag)
        ? 'maintenance'
        : envListHasFlag(disabledKeys, flag)
          ? 'disabled'
          : flag.status;
    const messageFromEnv = statusFromEnv === 'available'
      ? flag.message
      : flag.key === 'global_app'
        ? globalMessage
        : `${flag.label} is temporarily ${statusFromEnv}.`;
    const status = patch?.status || statusFromEnv;
    return {
      ...flag,
      status,
      message: typeof patch?.message === 'string'
        ? patch.message
        : messageFromEnv,
      surfaces: patch?.surfaces?.length ? patch.surfaces : flag.surfaces,
      updatedAt: patch ? nowIso() : flag.updatedAt,
    };
  });
}

export function mergeFeatureFlagsWithDefaults(
  rows: any[] | null | undefined,
  patches?: Map<string, FeatureFlagPatch>,
): AdminFeatureFlag[] {
  const defaults = buildRuntimeFeatureFlags(patches);
  const merged = new Map(defaults.map((flag) => [flag.key, flag]));
  const extraOrder: string[] = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const flag = featureFlagFromSupabase(row);
    if (!flag.key || flag.key === 'unknown') continue;
    const existing = merged.get(flag.key);
    if (!existing) extraOrder.push(flag.key);
    merged.set(flag.key, {
      ...(existing || flag),
      ...flag,
      label: flag.label || existing?.label || flag.key.replace(/[_:-]+/g, ' '),
      message: flag.message || existing?.message || '',
      surfaces: flag.surfaces.length ? flag.surfaces : existing?.surfaces || ['global'],
    });
  }

  return [
    ...defaults.map((flag) => merged.get(flag.key)).filter((flag): flag is AdminFeatureFlag => Boolean(flag)),
    ...extraOrder.map((key) => merged.get(key)).filter((flag): flag is AdminFeatureFlag => Boolean(flag)),
  ];
}

export function flagsForSurface(flags: AdminFeatureFlag[], surface: FeatureSurface): AdminFeatureFlag[] {
  return flags.filter((flag) =>
    flag.surfaces.includes('global') ||
    flag.surfaces.includes(surface) ||
    surface === 'admin' && flag.surfaces.includes('admin')
  );
}

export function activeOperationalFlags(flags: AdminFeatureFlag[], surface: FeatureSurface): AdminFeatureFlag[] {
  return flagsForSurface(flags, surface).filter((flag) => flag.status === 'maintenance' || flag.status === 'disabled');
}
