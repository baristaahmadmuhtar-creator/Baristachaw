import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { mobileEnv } from '../config/env';
import { ApiClient } from './apiClient';
import type { AuthSession } from '../types';

WebBrowser.maybeCompleteAuthSession();

function toSession(exchange: { accessToken: string; expiresAt: number; user: AuthSession['user'] }, fallbackProvider: 'google' | 'apple'): AuthSession {
  const provider = exchange.user.provider || fallbackProvider;
  return {
    accessToken: exchange.accessToken,
    expiresAt: Number(exchange.expiresAt || Date.now() + 60 * 60 * 1000),
    provider,
    user: {
      ...exchange.user,
      provider,
    },
  };
}

function isOfflineLikeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /network request failed|networkerror|offline|timed out|abort/i.test(message);
}

function toGoogleErrorMessage(error: unknown): string {
  if (isOfflineLikeError(error)) {
    return 'Google sign-in needs a stable internet connection. Please reconnect and retry.';
  }
  const message = error instanceof Error ? error.message.trim() : '';
  if (/cancel/i.test(message)) {
    return 'Google sign-in was cancelled before completion.';
  }
  if (/grant/i.test(message)) {
    return 'Google sign-in finished, but the mobile auth grant was missing. Please retry.';
  }
  return message || 'Failed to sign in with Google.';
}

export async function startGoogleMobileOAuth(apiClient: ApiClient): Promise<AuthSession> {
  try {
    const start = await apiClient.startMobileOAuth();
    if (!start?.url) {
      throw new Error('Server did not return OAuth URL.');
    }

    const callbackUrl = `${mobileEnv.appScheme}://auth`;
    const authResult = await WebBrowser.openAuthSessionAsync(start.url, callbackUrl);

    if (authResult.type !== 'success' || !authResult.url) {
      throw new Error('Login was cancelled or did not complete.');
    }

    const parsed = Linking.parse(authResult.url);
    const grantId = typeof parsed.queryParams?.grant === 'string' ? parsed.queryParams.grant.trim() : '';
    if (!grantId) {
      throw new Error('Missing mobile auth grant from callback URL.');
    }

    const exchange = await apiClient.exchangeMobileGrant(grantId);
    if (!exchange?.accessToken || !exchange?.user?.id) {
      throw new Error('Failed to establish authenticated session.');
    }

    return toSession(exchange, 'google');
  } catch (error) {
    throw new Error(toGoogleErrorMessage(error));
  }
}

function buildAppleDisplayName(fullName: AppleAuthentication.AppleAuthenticationFullName | null | undefined): string | undefined {
  if (!fullName) return undefined;
  const joined = [fullName.givenName, fullName.middleName, fullName.familyName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  return joined || undefined;
}

function toAppleErrorMessage(error: unknown): string {
  const rawCode = typeof error === 'object' && error && 'code' in error ? String((error as any).code) : '';
  if (rawCode === 'ERR_REQUEST_CANCELED') {
    return 'Apple sign-in was canceled.';
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Failed to sign in with Apple.';
}

export async function startAppleMobileOAuth(apiClient: ApiClient): Promise<AuthSession> {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const identityToken = (credential.identityToken || '').trim();
    if (!identityToken) {
      throw new Error('Apple sign-in did not return a valid identity token.');
    }

    const exchange = await apiClient.exchangeMobileAppleToken({
      identityToken,
      authorizationCode: credential.authorizationCode || undefined,
      email: credential.email || undefined,
      name: buildAppleDisplayName(credential.fullName),
    });

    if (!exchange?.accessToken || !exchange?.user?.id) {
      throw new Error('Failed to establish authenticated session.');
    }

    return toSession(exchange, 'apple');
  } catch (error) {
    throw new Error(toAppleErrorMessage(error));
  }
}
