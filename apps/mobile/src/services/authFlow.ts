import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { mobileEnv } from '../config/env';
import { ApiClient } from './apiClient';
import { getSupabaseClient, getSupabaseRedirectUri, signOutSupabaseClient } from './supabaseClient';
import type {
  AuthSession,
  EmailAuthPayload,
  EmailAuthResult,
  SupabaseDeepLinkResult,
} from '../types';

WebBrowser.maybeCompleteAuthSession();

function toSession(exchange: { accessToken: string; expiresAt: number; user: AuthSession['user'] }, fallbackProvider: 'google' | 'apple' | 'email'): AuthSession {
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

function parseAuthCallbackParams(url: string): URLSearchParams {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }
  return params;
}

function normalizeSupabaseAuthError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : '';
  if (isOfflineLikeError(error)) {
    return 'Koneksi internet belum stabil. Sambungkan lagi lalu coba ulang.';
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Email atau password belum sesuai.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'Email belum diverifikasi. Buka email verifikasi lalu masuk lagi.';
  }
  if (/password/i.test(message) && /short|weak|characters/i.test(message)) {
    return 'Gunakan password minimal 8 karakter.';
  }
  return message || fallback;
}

async function exchangeSupabaseSessionForApiSession(apiClient: ApiClient, fallbackProvider: 'google' | 'email'): Promise<AuthSession> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  let supabaseSession = sessionData.session;
  const expiresAtMs = Number(supabaseSession?.expires_at || 0) * 1000;
  if (supabaseSession && expiresAtMs > 0 && expiresAtMs - Date.now() < 60_000) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    supabaseSession = refreshed.data.session;
  }

  const accessToken = supabaseSession?.access_token?.trim();
  if (!accessToken) {
    throw new Error('Sesi login belum terbentuk. Coba masuk ulang.');
  }

  const exchange = await apiClient.exchangeMobileSupabaseToken({ accessToken });
  if (!exchange?.accessToken || !exchange?.user?.id) {
    throw new Error('Sesi Baristachaw belum bisa dibuat. Coba ulang.');
  }

  return toSession(exchange, fallbackProvider);
}

async function completeSupabaseOAuthCallback(url: string): Promise<{ type: string }> {
  const supabase = getSupabaseClient();
  const params = parseAuthCallbackParams(url);
  const error = params.get('error_description') || params.get('error');
  if (error) {
    throw new Error(error);
  }

  const type = (params.get('type') || '').trim().toLowerCase();
  const code = params.get('code');
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return { type };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw sessionError;
    return { type };
  }

  throw new Error('Login belum bisa diselesaikan. Coba buka tautan dari HP ini sekali lagi.');
}

export function isSupabaseMobileAuthUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
    const hostOrPath = parsed.hostname || parsed.pathname.replace(/^\/+/, '');
    if (scheme !== mobileEnv.appScheme || hostOrPath !== 'auth') return false;

    const params = parseAuthCallbackParams(url);
    return Boolean(
      params.has('code') ||
      params.has('access_token') ||
      params.has('refresh_token') ||
      params.has('error') ||
      params.has('error_description')
    );
  } catch {
    return false;
  }
}

function isOfflineLikeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /network request failed|networkerror|offline|timed out|abort/i.test(message);
}

function toGoogleErrorMessage(error: unknown): string {
  if (isOfflineLikeError(error)) {
    return 'Koneksi internet belum stabil. Sambungkan lagi lalu coba ulang.';
  }
  const message = error instanceof Error ? error.message.trim() : '';
  if (/cancel/i.test(message)) {
    return 'Masuk dengan Google dibatalkan sebelum selesai.';
  }
  if (/grant/i.test(message)) {
    return 'Masuk dengan Google belum lengkap. Coba ulang sekali lagi.';
  }
  return message || 'Gagal masuk dengan Google.';
}

export async function startGoogleMobileOAuth(apiClient: ApiClient): Promise<AuthSession> {
  try {
    const start = await apiClient.startMobileOAuth();
    if (!start?.url) {
      throw new Error('Login belum siap. Coba ulang beberapa saat lagi.');
    }

    const callbackUrl = `${mobileEnv.appScheme}://auth`;
    const authResult = await WebBrowser.openAuthSessionAsync(start.url, callbackUrl);

    if (authResult.type !== 'success' || !authResult.url) {
      throw new Error('Login dibatalkan atau belum selesai.');
    }

    const parsed = Linking.parse(authResult.url);
    const grantId = typeof parsed.queryParams?.grant === 'string' ? parsed.queryParams.grant.trim() : '';
    if (!grantId) {
      throw new Error('Login belum lengkap. Coba ulang sekali lagi.');
    }

    const exchange = await apiClient.exchangeMobileGrant(grantId);
    if (!exchange?.accessToken || !exchange?.user?.id) {
      throw new Error('Sesi login belum bisa dibuat. Coba ulang.');
    }

    return toSession(exchange, 'google');
  } catch (error) {
    throw new Error(toGoogleErrorMessage(error));
  }
}

export async function startGoogleSupabaseOAuth(apiClient: ApiClient): Promise<AuthSession> {
  try {
    const supabase = getSupabaseClient();
    const redirectTo = getSupabaseRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) throw error;
    if (!data?.url) {
      throw new Error('Login Google belum siap. Coba ulang beberapa saat lagi.');
    }

    const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      createTask: false,
      showTitle: false,
    });

    if (authResult.type !== 'success' || !authResult.url) {
      throw new Error('Masuk dengan Google dibatalkan sebelum selesai.');
    }

    await completeSupabaseOAuthCallback(authResult.url);
    return await exchangeSupabaseSessionForApiSession(apiClient, 'google');
  } catch (error) {
    throw new Error(normalizeSupabaseAuthError(error, 'Gagal masuk dengan Google.'));
  }
}

export async function startEmailSupabaseAuth(apiClient: ApiClient, payload: EmailAuthPayload): Promise<EmailAuthResult> {
  const supabase = getSupabaseClient();
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;
  const displayName = payload.displayName?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Masukkan email yang valid.');
  }
  if (password.length < 8) {
    throw new Error('Gunakan password minimal 8 karakter.');
  }

  try {
    if (payload.mode === 'signUp') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: displayName ? { full_name: displayName, name: displayName } : undefined,
          emailRedirectTo: getSupabaseRedirectUri(),
        },
      });
      if (error) throw error;
      if (!data.session) {
        return {
          status: 'confirmation_required',
          email,
          message: 'Akun sudah dibuat. Buka email verifikasi, lalu masuk kembali.',
        };
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }

    return {
      status: 'signed_in',
      session: await exchangeSupabaseSessionForApiSession(apiClient, 'email'),
    };
  } catch (error) {
    throw new Error(normalizeSupabaseAuthError(error, payload.mode === 'signUp' ? 'Gagal membuat akun.' : 'Gagal masuk.'));
  }
}

export async function sendPasswordResetSupabaseEmail(emailInput: string): Promise<{ message: string }> {
  const supabase = getSupabaseClient();
  const email = emailInput.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Masukkan email yang valid.');
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getSupabaseRedirectUri(),
    });
    if (error) throw error;

    return {
      message: 'Jika email terdaftar, tautan pemulihan sudah dikirim. Buka email tersebut dari HP ini.',
    };
  } catch (error) {
    throw new Error(normalizeSupabaseAuthError(error, 'Gagal mengirim tautan pemulihan.'));
  }
}

export async function updateSupabasePassword(apiClient: ApiClient, password: string): Promise<AuthSession> {
  if (password.length < 8) {
    throw new Error('Gunakan password minimal 8 karakter.');
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    return await exchangeSupabaseSessionForApiSession(apiClient, 'email');
  } catch (error) {
    throw new Error(normalizeSupabaseAuthError(error, 'Gagal menyimpan password baru.'));
  }
}

export async function restoreSupabaseMobileSession(apiClient: ApiClient): Promise<AuthSession | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) return null;

  const provider = data.session.user?.app_metadata?.provider === 'google' ? 'google' : 'email';
  return exchangeSupabaseSessionForApiSession(apiClient, provider);
}

export async function completeSupabaseDeepLink(apiClient: ApiClient, url: string): Promise<SupabaseDeepLinkResult> {
  if (!isSupabaseMobileAuthUrl(url)) return null;
  const callback = await completeSupabaseOAuthCallback(url);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  if (callback.type === 'recovery') {
    return { kind: 'passwordRecovery', email: data.session?.user?.email || undefined };
  }

  const provider = data.session?.user?.app_metadata?.provider === 'google' ? 'google' : 'email';
  const session = await exchangeSupabaseSessionForApiSession(apiClient, provider);
  return { kind: 'signIn', session };
}

export async function clearSupabaseMobileSession(): Promise<void> {
  await signOutSupabaseClient();
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
    return 'Masuk dengan Apple dibatalkan.';
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Gagal masuk dengan Apple.';
}

export async function startAppleMobileOAuth(apiClient: ApiClient): Promise<AuthSession> {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Masuk dengan Apple tidak tersedia di perangkat ini.');
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
      throw new Error('Masuk dengan Apple belum mengembalikan identitas yang valid.');
    }

    const exchange = await apiClient.exchangeMobileAppleToken({
      identityToken,
      authorizationCode: credential.authorizationCode || undefined,
      email: credential.email || undefined,
      name: buildAppleDisplayName(credential.fullName),
    });

    if (!exchange?.accessToken || !exchange?.user?.id) {
      throw new Error('Sesi login belum bisa dibuat. Coba ulang.');
    }

    return toSession(exchange, 'apple');
  } catch (error) {
    throw new Error(toAppleErrorMessage(error));
  }
}
