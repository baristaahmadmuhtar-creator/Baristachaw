import { mobileEnv } from '../config/env';
import type {
  AgentProfileMemory,
  AiAction,
  ApiRequestOptions,
  MobileAppleExchangeRequest,
  ChatResponseMode,
  ConversationContext,
  MobileOAuthExchangeResponse,
  MobileOAuthStartResponse,
  MobileSupabaseExchangeRequest,
  ResponseProfile,
  ClientContext,
  StructuredAiResponse,
  AccountStatusResponse,
  UserProfile,
} from '../types';

export class ApiError extends Error {
  status: number;
  requestId?: string;
  errorCode?: string;
  retryable?: boolean;
  details?: string;

  constructor(message: string, params: { status: number; requestId?: string; errorCode?: string; retryable?: boolean; details?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = params.status;
    this.requestId = params.requestId;
    this.errorCode = params.errorCode;
    this.retryable = params.retryable;
    this.details = params.details;
  }
}

type ApiClientOptions = {
  getAccessToken: () => string | null;
};

const MULTIMODAL_AI_ACTIONS = new Set<AiAction>(['analyze_image', 'analyze_attachment', 'edit_latte_art', 'transcribe']);
const DEFAULT_REQUEST_TIMEOUT_MS = 25_000;
const CHAT_TEXT_TIMEOUT_MS = 50_000;
const AI_FAST_TIMEOUT_MS = 40_000;
const AI_BALANCED_TIMEOUT_MS = 50_000;
const AI_DEEP_TIMEOUT_MS = 55_000;
const AI_SEARCH_TIMEOUT_MS = 55_000;
const AI_TEXT_ATTACHMENT_TIMEOUT_MS = 50_000;
const AI_MULTIMODAL_TIMEOUT_MS = 55_000;

export function resolveMobileAiActionTimeoutMs(action: AiAction, explicitTimeoutMs?: number): number {
  if (Number.isFinite(explicitTimeoutMs) && Number(explicitTimeoutMs) > 0) {
    return Math.max(2_000, Number(explicitTimeoutMs));
  }

  if (action === 'fast') return AI_FAST_TIMEOUT_MS;
  if (action === 'balanced') return AI_BALANCED_TIMEOUT_MS;
  if (action === 'deep_think') return AI_DEEP_TIMEOUT_MS;
  if (action === 'search') return AI_SEARCH_TIMEOUT_MS;
  if (action === 'analyze_text') return AI_TEXT_ATTACHMENT_TIMEOUT_MS;
  if (MULTIMODAL_AI_ACTIONS.has(action)) return AI_MULTIMODAL_TIMEOUT_MS;
  return DEFAULT_REQUEST_TIMEOUT_MS;
}

function toAbsoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${mobileEnv.apiBaseUrl}${normalizedPath}`;
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseError(response: Response): Promise<ApiError> {
  const status = response.status;
  const requestId = response.headers.get('x-request-id') || undefined;
  const textBody = await response.text().catch(() => '');

  let jsonBody: any = null;
  try {
    jsonBody = textBody ? JSON.parse(textBody) : null;
  } catch {
    jsonBody = null;
  }

  const message =
    jsonBody?.error ||
    jsonBody?.message ||
    textBody ||
    `Request failed with status ${status}`;

  return new ApiError(String(message), {
    status,
    requestId,
    errorCode: typeof jsonBody?.errorCode === 'string' ? jsonBody.errorCode : undefined,
    retryable: typeof jsonBody?.retryable === 'boolean' ? jsonBody.retryable : undefined,
    details: typeof jsonBody?.details === 'string' ? jsonBody.details : undefined,
  });
}

function normalizeUnknownError(error: unknown, useAuth: boolean): ApiError {
  if (error instanceof ApiError) {
    if (useAuth && error.status === 401 && !error.errorCode) {
      return new ApiError('Your session expired. Please sign in again.', {
        status: 401,
        requestId: error.requestId,
        retryable: false,
        details: error.details,
      });
    }
    return error;
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError('Request timed out. Please retry.', {
      status: 0,
      retryable: true,
      errorCode: 'timeout',
    });
  }

  if (error instanceof TypeError) {
    return new ApiError('Unable to reach Baristachaw. Check your connection and retry.', {
      status: 0,
      retryable: true,
      errorCode: 'network_unreachable',
    });
  }

  return new ApiError(error instanceof Error ? error.message : 'Network request failed', {
    status: 0,
    retryable: true,
  });
}

async function withTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export class ApiClient {
  private readonly getAccessToken: () => string | null;

  constructor(options: ApiClientOptions) {
    this.getAccessToken = options.getAccessToken;
  }

  private buildHeaders(initHeaders?: HeadersInit, useAuth = true): Headers {
    const headers = new Headers(initHeaders || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (useAuth) {
      const token = this.getAccessToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private async requestRaw(
    path: string,
    init: RequestInit = {},
    options: ApiRequestOptions = {},
  ): Promise<Response> {
    const useAuth = options.useAuth ?? true;
    const retries = Math.max(0, Math.min(3, options.retries ?? 1));
    const timeoutMs = Math.max(2_000, options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);

    let attempt = 0;
    while (true) {
      try {
        const response = await withTimeout(toAbsoluteUrl(path), {
          ...init,
          headers: this.buildHeaders(init.headers, useAuth),
        }, timeoutMs);

        if (response.ok) return response;

        const err = await parseError(response);
        if (attempt < retries && (err.retryable || isTransientStatus(err.status))) {
          attempt += 1;
          await delay(220 * attempt);
          continue;
        }
        throw err;
      } catch (error) {
        const normalizedError = normalizeUnknownError(error, useAuth);
        const canRetry =
          attempt < retries &&
          (normalizedError.retryable || isTransientStatus(normalizedError.status));

        if (!canRetry) throw normalizedError;

        attempt += 1;
        await delay(220 * attempt);
      }
    }
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit = {},
    options: ApiRequestOptions = {},
  ): Promise<T> {
    const response = await this.requestRaw(path, init, options);
    return response.json() as Promise<T>;
  }

  private async requestText(
    path: string,
    init: RequestInit = {},
    options: ApiRequestOptions = {},
  ): Promise<string> {
    const response = await this.requestRaw(path, init, options);
    return response.text();
  }

  async startMobileOAuth(): Promise<MobileOAuthStartResponse> {
    return this.requestJson<MobileOAuthStartResponse>('/api/auth/mobile/start', { method: 'GET' }, { useAuth: false, retries: 0 });
  }

  async exchangeMobileGrant(grantId: string): Promise<MobileOAuthExchangeResponse> {
    return this.requestJson<MobileOAuthExchangeResponse>(
      '/api/auth/mobile/exchange',
      {
        method: 'POST',
        body: JSON.stringify({ grantId }),
      },
      { useAuth: false, retries: 0 },
    );
  }

  async exchangeMobileAppleToken(payload: MobileAppleExchangeRequest): Promise<MobileOAuthExchangeResponse> {
    return this.requestJson<MobileOAuthExchangeResponse>(
      '/api/auth/mobile/apple/exchange',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { useAuth: false, retries: 0 },
    );
  }

  async exchangeMobileSupabaseToken(payload: MobileSupabaseExchangeRequest): Promise<MobileOAuthExchangeResponse> {
    return this.requestJson<MobileOAuthExchangeResponse>(
      '/api/auth/mobile/supabase/exchange',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { useAuth: false, retries: 0 },
    );
  }

  async getAuthMe(options: ApiRequestOptions = {}): Promise<UserProfile> {
    const data = await this.requestJson<{ user: UserProfile }>('/api/auth/me', { method: 'GET' }, options);
    return data.user;
  }

  async getAccountStatus(): Promise<AccountStatusResponse> {
    return this.requestJson<AccountStatusResponse>('/api/account/status?surface=mobile', { method: 'GET' }, { retries: 1, timeoutMs: 12_000 });
  }

  async logout(): Promise<void> {
    await this.requestJson('/api/auth/logout', { method: 'POST' });
  }

  async sendChat(message: string, mode: ChatResponseMode = 'race'): Promise<string> {
    return this.sendChatWithProfile(message, mode);
  }

  async sendChatWithProfile(
    message: string,
    mode: ChatResponseMode = 'race',
    payload?: {
      responseProfile?: ResponseProfile;
      clientContext?: ClientContext;
      conversationContext?: ConversationContext;
      agentProfile?: AgentProfileMemory;
    },
    options: ApiRequestOptions = {},
  ): Promise<string> {
    return this.requestText(
      '/api/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          mode,
          responseProfile: payload?.responseProfile,
          clientContext: payload?.clientContext,
          conversationContext: payload?.conversationContext,
          agentProfile: payload?.agentProfile,
        }),
      },
      { retries: 1, timeoutMs: CHAT_TEXT_TIMEOUT_MS, ...options },
    );
  }

  async runAiAction(
    action: AiAction,
    prompt: string,
    extra?: (Record<string, unknown> & {
      responseProfile?: ResponseProfile;
      clientContext?: ClientContext;
      conversationContext?: ConversationContext;
      agentProfile?: AgentProfileMemory;
    }),
    options: ApiRequestOptions = {},
  ): Promise<StructuredAiResponse> {
    const timeoutMs = resolveMobileAiActionTimeoutMs(action, options.timeoutMs);
    const retries = options.retries ?? (action === 'deep_think' ? 0 : 1);
    return this.requestJson<StructuredAiResponse>(
      '/api/ai',
      {
        method: 'POST',
        body: JSON.stringify({ action, prompt, ...(extra || {}) }),
      },
      { retries, timeoutMs, ...options },
    );
  }
}
