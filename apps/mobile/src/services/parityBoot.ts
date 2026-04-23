import AsyncStorage from '@react-native-async-storage/async-storage';

const PARITY_FALLBACK_UNTIL_KEY = 'BARISTA_PARITY_FALLBACK_UNTIL';
const FALLBACK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type ParityFallbackReason = 'timeout' | 'error' | 'http_error' | 'load_error';

export function getParityFallbackStorageKey(): string {
  return PARITY_FALLBACK_UNTIL_KEY;
}

export function getParityFallbackCooldownMs(): number {
  return FALLBACK_COOLDOWN_MS;
}

export async function readParityFallbackUntil(): Promise<number> {
  const raw = (await AsyncStorage.getItem(PARITY_FALLBACK_UNTIL_KEY)) || '';
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export async function setParityFallbackCooldown(now = Date.now()): Promise<number> {
  const until = now + FALLBACK_COOLDOWN_MS;
  await AsyncStorage.setItem(PARITY_FALLBACK_UNTIL_KEY, String(until));
  return until;
}

export async function clearParityFallbackCooldown(): Promise<void> {
  await AsyncStorage.removeItem(PARITY_FALLBACK_UNTIL_KEY);
}

