import * as SecureStore from 'expo-secure-store';
import type { AuthSession } from '../types';

const AUTH_SESSION_KEY = 'BARISTACHAW_MOBILE_AUTH_SESSION_V1';

export type AuthSessionReadResult =
  | { status: 'missing'; session: null }
  | { status: 'active'; session: AuthSession }
  | { status: 'expired'; session: null }
  | { status: 'invalid'; session: null };

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function inspectAuthSession(): Promise<AuthSessionReadResult> {
  const raw = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
  if (!raw) return { status: 'missing', session: null };

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed?.accessToken || !parsed?.expiresAt || !parsed?.user?.id) {
      return { status: 'invalid', session: null };
    }
    const expiresAt = Number(parsed.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      return { status: 'invalid', session: null };
    }
    if (expiresAt <= Date.now()) {
      return { status: 'expired', session: null };
    }
    return {
      status: 'active',
      session: {
        accessToken: String(parsed.accessToken),
        expiresAt,
        provider: parsed.provider,
        user: parsed.user,
      },
    };
  } catch {
    return { status: 'invalid', session: null };
  }
}

export async function readAuthSession(): Promise<AuthSession | null> {
  const result = await inspectAuthSession();
  return result.status === 'active' ? result.session : null;
}

export async function clearAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}
