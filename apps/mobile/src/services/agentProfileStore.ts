import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  normalizeAgentProfileMemory,
  resolveAgentProfileNamespace,
  type AgentProfileMemory,
} from '@baristachaw/shared';
import { DEFAULT_LANGUAGE } from '../web-shared/constants';

const AGENT_PROFILE_MEMORY_KEY_PREFIX = 'BARISTACHAW_AGENT_PROFILE_MEMORY::';

function getStorageKey(userId?: string | null): string {
  return `${AGENT_PROFILE_MEMORY_KEY_PREFIX}${resolveAgentProfileNamespace(userId)}`;
}

function buildDefaultProfile(seed?: Partial<AgentProfileMemory>): AgentProfileMemory {
  return normalizeAgentProfileMemory({
    preferredLanguage: DEFAULT_LANGUAGE,
    languageSource: 'global',
    assistantName: 'Baristachaw',
    ...(seed || {}),
    updatedAt: Date.now(),
  });
}

function migrateLegacyDefaultLanguage(
  profile: AgentProfileMemory,
  seed?: Partial<AgentProfileMemory>,
): { profile: AgentProfileMemory; changed: boolean } {
  const seedLanguage = seed?.preferredLanguage || DEFAULT_LANGUAGE;
  const isLegacyImplicitEnglish = profile.preferredLanguage === 'en' && !profile.languageSource;
  if (DEFAULT_LANGUAGE === 'id' && seedLanguage === DEFAULT_LANGUAGE && isLegacyImplicitEnglish) {
    return {
      profile: normalizeAgentProfileMemory({
        ...profile,
        preferredLanguage: DEFAULT_LANGUAGE,
        languageSource: 'global',
        updatedAt: Date.now(),
      }),
      changed: true,
    };
  }
  return { profile, changed: false };
}

export async function readAgentProfileMemory(
  userId?: string | null,
  seed?: Partial<AgentProfileMemory>,
): Promise<AgentProfileMemory> {
  const key = getStorageKey(userId);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const migrated = migrateLegacyDefaultLanguage(normalizeAgentProfileMemory(JSON.parse(raw)), seed);
      if (migrated.changed) {
        await AsyncStorage.setItem(key, JSON.stringify(migrated.profile));
      }
      return migrated.profile;
    }
  } catch {
    // Ignore broken local data and return a fresh profile.
  }
  return buildDefaultProfile(seed);
}

export async function saveAgentProfileMemory(
  userId?: string | null,
  patch?: Partial<AgentProfileMemory>,
): Promise<AgentProfileMemory> {
  const current = await readAgentProfileMemory(userId);
  const normalizedPatch = patch?.preferredLanguage
    ? { languageSource: 'manual' as const, ...patch }
    : patch;
  const next = normalizeAgentProfileMemory({
    ...current,
    ...(normalizedPatch || {}),
    updatedAt: Date.now(),
  });
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(next));
  return next;
}

export async function resetAgentProfileMemory(
  userId?: string | null,
  seed?: Partial<AgentProfileMemory>,
): Promise<AgentProfileMemory> {
  const next = buildDefaultProfile(seed);
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(next));
  return next;
}
