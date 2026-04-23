import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  normalizeAgentProfileMemory,
  resolveAgentProfileNamespace,
  type AgentProfileMemory,
} from '@baristaclaw/shared';

const AGENT_PROFILE_MEMORY_KEY_PREFIX = 'BARISTACLAW_AGENT_PROFILE_MEMORY::';

function getStorageKey(userId?: string | null): string {
  return `${AGENT_PROFILE_MEMORY_KEY_PREFIX}${resolveAgentProfileNamespace(userId)}`;
}

function buildDefaultProfile(seed?: Partial<AgentProfileMemory>): AgentProfileMemory {
  return normalizeAgentProfileMemory({
    preferredLanguage: 'en',
    assistantName: 'BaristaClaw',
    ...(seed || {}),
    updatedAt: Date.now(),
  });
}

export async function readAgentProfileMemory(
  userId?: string | null,
  seed?: Partial<AgentProfileMemory>,
): Promise<AgentProfileMemory> {
  const key = getStorageKey(userId);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      return normalizeAgentProfileMemory(JSON.parse(raw));
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
  const next = normalizeAgentProfileMemory({
    ...current,
    ...(patch || {}),
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
