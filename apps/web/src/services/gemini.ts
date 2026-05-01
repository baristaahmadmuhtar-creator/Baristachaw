import type { ChatAttachmentKind } from "../types";
import type {
  AgentProfileMemory,
  AiErrorCode,
  ClientContext,
  ConversationContext,
  DeepResponseMeta,
  ResponseProfile,
  StructuredSearchSource,
} from '@baristachaw/shared';

/**
 * Baristachaw AI Service (Server-Only)
 *
 * All AI operations must run through server endpoints:
 * - /api/chat for conversational messages
 * - /api/ai for structured actions
 */

const USER_NAME_STORAGE = "BARISTA_USER_NAME";
const USER_BIO_STORAGE = "BARISTA_USER_BIO";
const AUTH_MODE_STORAGE = "BARISTA_AUTH_MODE";
const CLIENT_KEY_DISABLED_MESSAGE = "Client-side API keys are disabled. Please use server authentication.";
const MULTIMODAL_AI_ACTIONS = new Set(["analyze_image", "analyze_attachment", "edit_latte_art", "transcribe"]);
const SERVER_CHAT_DEFAULT_MESSAGE_MAX_CHARS = 1800;
const SERVER_CHAT_TOOLS_MESSAGE_MAX_CHARS = 12000;

function getAppLanguage() {
  if (typeof document !== "undefined" && document.documentElement?.lang) {
    return document.documentElement.lang;
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en";
}

function isIndonesianLanguage(language?: string) {
  return /^id(?:-|$)/i.test((language || "").trim());
}

function isArabicLanguage(language?: string) {
  return /^ar(?:-|$)/i.test((language || "").trim());
}

function localize(enText: string, idText: string, arText: string) {
  const current = getAppLanguage();
  if (isIndonesianLanguage(current)) return idText;
  if (isArabicLanguage(current)) return arText;
  return enText;
}

export interface ChatRequestContextPayload {
  responseProfile?: ResponseProfile;
  clientContext?: ClientContext;
  conversationContext?: ConversationContext;
  agentProfile?: AgentProfileMemory;
}

type AuthMode = "server" | "openai" | "firebase" | "api_key";
let _authMode: AuthMode | null = null;
const ALLOWED_AUTH_MODES = new Set<AuthMode>(["server", "openai", "firebase", "api_key"]);

function readStorageItem(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(key: string, value: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // no-op to keep runtime crash-free when storage is blocked/quota-limited
  }
}

function removeStorageItem(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op to keep runtime crash-free when storage is blocked/quota-limited
  }
}

function normalizeAuthMode(value: string | null): AuthMode | null {
  if (!value) return null;
  return ALLOWED_AUTH_MODES.has(value as AuthMode) ? (value as AuthMode) : null;
}

/**
 * Legacy BYOK helpers intentionally kept as no-op for compatibility.
 * Client-side key storage/calls are disabled by policy.
 */
export function saveApiKey(_key: string) {
  if (import.meta.env.DEV) {
    console.warn("[gemini] saveApiKey ignored: BYOK is disabled");
  }
}

export function getApiKey(): string {
  return "";
}

export function removeApiKey() {
  // no-op
}

export function setAuthMode(mode: AuthMode) {
  _authMode = mode;
  writeStorageItem(AUTH_MODE_STORAGE, mode);
}

export function getAuthMode(): AuthMode | null {
  if (_authMode) return _authMode;
  const stored = normalizeAuthMode(readStorageItem(AUTH_MODE_STORAGE));
  if (stored) _authMode = stored;
  return _authMode;
}

export function hasActiveAuthSession(): boolean {
  return true;
}

export function clearAuthSession() {
  _authMode = null;
  removeStorageItem(AUTH_MODE_STORAGE);
}

export function markServerLogin() {
  setAuthMode("server");
}

export function markOpenAILogin() {
  setAuthMode("openai");
}

export function saveUserName(name: string) {
  writeStorageItem(USER_NAME_STORAGE, name.trim());
}

export function getStoredUserName(): string {
  return readStorageItem(USER_NAME_STORAGE) || "";
}

export const getUserName = getStoredUserName;

export function saveUserBio(bio: string) {
  writeStorageItem(USER_BIO_STORAGE, bio.trim());
}

export function getUserBio(): string {
  return readStorageItem(USER_BIO_STORAGE) || "";
}

export interface ServerAiResponse {
  ok?: boolean;
  requestId?: string;
  action?: string;
  text?: string;
  chunks?: any[];
  sources?: StructuredSearchSource[];
  sourceCount?: number;
  retrievedAt?: number;
  imageDataUrl?: string;
  audioDataUrl?: string;
  error?: string;
  errorCode?: AiErrorCode | string;
  retryable?: boolean;
  provider?: string;
  degraded?: boolean;
  details?: string;
  deepMeta?: DeepResponseMeta;
}

class ServerAiError extends Error {
  requestId?: string;
  errorCode?: AiErrorCode | string;
  retryable?: boolean;
  provider?: string;
  status?: number;
  degraded?: boolean;

  constructor(message: string, data?: Partial<ServerAiError>) {
    super(message);
    this.name = "ServerAiError";
    this.requestId = data?.requestId;
    this.errorCode = data?.errorCode;
    this.retryable = data?.retryable;
    this.provider = data?.provider;
    this.status = data?.status;
    this.degraded = data?.degraded;
  }
}

export type SearchErrorCode = 'search_unavailable' | 'insufficient_sources';

export interface SearchResultPayload {
  text: string;
  chunks: any[];
  sources: StructuredSearchSource[];
  sourceCount: number;
  retrievedAt: number;
  provider?: string;
  degraded?: boolean;
  details?: string;
  deepMeta?: DeepResponseMeta;
  fallbackMode?: 'search' | 'deep';
  liveSearchUnavailable?: boolean;
}

export interface DeepThinkingDetailedPayload {
  text: string;
  provider?: string;
  degraded?: boolean;
  details?: string;
  sources?: StructuredSearchSource[];
  deepMeta?: DeepResponseMeta;
  requestId?: string;
}

export interface StructuredTextDetailedPayload {
  text: string;
  provider?: string;
  degraded?: boolean;
  details?: string;
  requestId?: string;
}

export class SearchWebError extends Error {
  code: SearchErrorCode;
  requestId?: string;
  retryable?: boolean;
  details?: string;

  constructor(message: string, params: { code: SearchErrorCode; requestId?: string; retryable?: boolean; details?: string }) {
    super(message);
    this.name = 'SearchWebError';
    this.code = params.code;
    this.requestId = params.requestId;
    this.retryable = params.retryable;
    this.details = params.details;
  }
}

export class DeepThinkingError extends Error {
  requestId?: string;
  errorCode?: AiErrorCode | string;
  retryable?: boolean;
  provider?: string;
  degraded?: boolean;
  details?: string;

  constructor(message: string, data?: Partial<DeepThinkingError>) {
    super(message);
    this.name = 'DeepThinkingError';
    this.requestId = data?.requestId;
    this.errorCode = data?.errorCode;
    this.retryable = data?.retryable;
    this.provider = data?.provider;
    this.degraded = data?.degraded;
    this.details = data?.details;
  }
}

export class StructuredTextModeError extends Error {
  requestId?: string;
  errorCode?: AiErrorCode | string;
  retryable?: boolean;
  provider?: string;
  degraded?: boolean;
  details?: string;

  constructor(message: string, data?: Partial<StructuredTextModeError>) {
    super(message);
    this.name = "StructuredTextModeError";
    this.requestId = data?.requestId;
    this.errorCode = data?.errorCode;
    this.retryable = data?.retryable;
    this.provider = data?.provider;
    this.degraded = data?.degraded;
    this.details = data?.details;
  }
}

function logDev(message: string, data?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.debug(message, data || {});
  }
}

async function readJsonSafe(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function resolveClientContext(input?: ClientContext): ClientContext | undefined {
  const base: ClientContext = { ...(input || {}) };
  if (!base.acceptLanguage && typeof navigator !== 'undefined') {
    base.acceptLanguage = navigator.languages?.join(',') || navigator.language || undefined;
  }
  if (!base.appLanguage && typeof document !== 'undefined') {
    base.appLanguage = document.documentElement.lang || undefined;
  }
  const hasValue = Boolean(base.platform || base.surface || base.appLanguage || base.acceptLanguage);
  return hasValue ? base : undefined;
}

function normalizeServerError(
  payload: ServerAiResponse | null,
  status: number,
  fallbackMessage: string,
  headers?: Headers,
): ServerAiError {
  const requestId = payload?.requestId || headers?.get("x-request-id") || undefined;
  const detail = payload?.details ? ` (${payload.details})` : "";
  const message = payload?.error || payload?.text || fallbackMessage;
  return new ServerAiError(`${message}${detail}`.trim(), {
    requestId,
    errorCode: payload?.errorCode,
    retryable: payload?.retryable,
    provider: payload?.provider || headers?.get("x-provider") || undefined,
    status,
    degraded: payload?.degraded,
  });
}

async function serverAi(
  action: string,
  prompt: string,
  extra?: Record<string, any>,
  context?: ChatRequestContextPayload,
  options?: { timeoutMs?: number },
): Promise<ServerAiResponse> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs || (MULTIMODAL_AI_ACTIONS.has(action) ? 55000 : 30000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const clientContext = resolveClientContext(context?.clientContext);
    const response = await fetch("/api/ai", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        prompt,
        ...extra,
        responseProfile: context?.responseProfile,
        clientContext,
        conversationContext: context?.conversationContext,
        agentProfile: context?.agentProfile,
      }),
      signal: controller.signal,
    });

    const data = await readJsonSafe(response) as ServerAiResponse | null;
    if (!response.ok) {
      throw normalizeServerError(data, response.status, `Server AI returned ${response.status}`, response.headers);
    }
    if (!data) {
      throw new ServerAiError("Invalid JSON response from /api/ai");
    }
    if (data.ok === false || data.error) {
      throw normalizeServerError(data, response.status, "Structured AI operation failed", response.headers);
    }

    logDev("[gemini] /api/ai success", {
      action,
      requestId: data.requestId || response.headers.get("x-request-id") || undefined,
      provider: data.provider || undefined,
    });
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function serverChat(
  message: string,
  context?: ChatRequestContextPayload,
  options?: { timeoutMs?: number },
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 30000);
  try {
    const clientContext = resolveClientContext(context?.clientContext);
    const response = await fetch("/api/chat", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        mode: "race",
        responseProfile: context?.responseProfile,
        clientContext,
        conversationContext: context?.conversationContext,
        agentProfile: context?.agentProfile,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      const parsed = (() => {
        try { return JSON.parse(errBody); } catch { return null; }
      })();
      throw normalizeServerError(
        parsed,
        response.status,
        parsed?.error || errBody || `Server chat returned ${response.status}`,
        response.headers,
      );
    }
    const text = await response.text();
    if (!text || text.trim().length === 0) throw new Error("Empty response from server");

    logDev("[gemini] /api/chat success", {
      requestId: response.headers.get("x-request-id") || undefined,
      provider: response.headers.get("x-provider") || undefined,
      model: response.headers.get("x-model") || undefined,
      raceLatency: response.headers.get("x-race-latency") || undefined,
    });
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function raceChatResponse(
  prompt: string,
  requestContext?: ChatRequestContextPayload,
  options?: {
    model?: string;
    timeoutMs?: number;
  },
) {
  const fallbackMessage = localize(
    "Sorry, I could not process your request. Please try again.",
    "Maaf, permintaan Anda belum bisa diproses. Silakan coba lagi.",
    "عذرًا، تعذرت معالجة طلبك. يرجى المحاولة مرة أخرى.",
  );
  const normalizedPrompt = String(prompt || "");
  const targetChatLimit = requestContext?.clientContext?.surface === "tools"
    ? SERVER_CHAT_TOOLS_MESSAGE_MAX_CHARS
    : SERVER_CHAT_DEFAULT_MESSAGE_MAX_CHARS;
  const shouldBypassChatRoute = normalizedPrompt.trim().length > targetChatLimit;

  if (!shouldBypassChatRoute) {
    try {
      return await serverChat(normalizedPrompt, requestContext, { timeoutMs: options?.timeoutMs });
    } catch {
      // fall through to structured AI fallback
    }
  }

  try {
    const result = await serverAi(
      "fast",
      normalizedPrompt,
      options?.model ? { model: options.model } : undefined,
      requestContext,
      { timeoutMs: options?.timeoutMs },
    );
    return result.text || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function validateConnectivity(): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await serverAi("fast", "ping");
    if (!data?.text && data.ok !== true) {
      return { ok: false, error: data?.error || localize("AI service unavailable", "Layanan AI tidak tersedia", "خدمة الذكاء الاصطناعي غير متاحة") };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : localize("Server unreachable", "Server tidak dapat dijangkau", "لا يمكن الوصول إلى الخادم") };
  }
}

export async function validateServerConnectivity(): Promise<{ ok: boolean; error?: string }> {
  return validateConnectivity();
}

export function resetAiClient() {
  // no-op
}

export function createChatSession() {
  return {
    __hydraKey: null as string | null,
    __isServerProxy: true,
    async sendMessage({
      message,
      requestContext,
    }: {
      message: string;
      requestContext?: ChatRequestContextPayload;
    }): Promise<{ text: string }> {
      const text = await serverChat(message, requestContext);
      return { text };
    },
  };
}

export async function sendMessageSafe(
  chatSession: any,
  message: string,
  onSessionRecreated?: (newSession: any) => void,
  requestContext?: ChatRequestContextPayload,
): Promise<{ text: string; session: any }> {
  try {
    const response = await chatSession.sendMessage({ message, requestContext });
    return { text: response.text || "", session: chatSession };
  } catch {
    const newSession = createChatSession();
    onSessionRecreated?.(newSession);
    const text = await serverChat(message, requestContext);
    return { text, session: newSession };
  }
}

export async function searchWithGemini(prompt: string, context?: ChatRequestContextPayload): Promise<SearchResultPayload> {
  const requestContext: ChatRequestContextPayload = {
    ...(context || {}),
    responseProfile: {
      ...(context?.responseProfile || {}),
      verbosity: 'comprehensive',
      format: 'steps',
      tone: 'professional',
      ambiguityPolicy: 'assume',
    },
    clientContext: resolveClientContext(context?.clientContext),
  };

  try {
    const data = await serverAi(
      "search",
      prompt,
      undefined,
      requestContext,
    );
    const text = String(data.text || '').trim();
    const sources = (data.sources || []).filter(source => typeof source?.uri === 'string' && source.uri.trim().length > 0);
    const sourceCount = Number.isFinite(data.sourceCount) ? Number(data.sourceCount) : sources.length;
    if (!text) {
      throw new SearchWebError(localize('Live web search unavailable. Please retry.', 'Pencarian web langsung tidak tersedia. Silakan coba lagi.', 'بحث الويب المباشر غير متاح. يرجى المحاولة مرة أخرى.'), {
        code: 'search_unavailable',
        requestId: data.requestId,
        retryable: true,
        details: 'empty_text',
      });
    }
    if (sourceCount < 2 || sources.length < 2) {
      throw new SearchWebError(localize('Insufficient live sources (min 2).', 'Sumber langsung tidak mencukupi (minimal 2).', 'المصادر المباشرة غير كافية (الحد الأدنى 2).'), {
        code: 'insufficient_sources',
        requestId: data.requestId,
        retryable: true,
        details: `source_count=${sourceCount}`,
      });
    }
    return {
      text,
      chunks: data.chunks || [],
      sources,
      sourceCount,
      retrievedAt: typeof data.retrievedAt === 'number' ? data.retrievedAt : Date.now(),
      provider: data.provider,
      degraded: Boolean(data.degraded),
      details: data.details,
      fallbackMode: 'search',
      liveSearchUnavailable: false,
    } as SearchResultPayload;
  } catch (error) {
    const normalizedError = (() => {
      if (error instanceof SearchWebError) return error;
      if (error instanceof ServerAiError) {
        const code = error.errorCode === 'insufficient_sources' ? 'insufficient_sources' : 'search_unavailable';
        const message = code === 'insufficient_sources'
          ? localize('Insufficient live sources (min 2).', 'Sumber langsung tidak mencukupi (minimal 2).', 'المصادر المباشرة غير كافية (الحد الأدنى 2).')
          : localize('Live web search unavailable. Please retry.', 'Pencarian web langsung tidak tersedia. Silakan coba lagi.', 'بحث الويب المباشر غير متاح. يرجى المحاولة مرة أخرى.');
        return new SearchWebError(message, {
          code,
          requestId: error.requestId,
          retryable: error.retryable,
          details: error.message,
        });
      }
      return new SearchWebError(localize('Live web search unavailable. Please retry.', 'Pencarian web langsung tidak tersedia. Silakan coba lagi.', 'بحث الويب المباشر غير متاح. يرجى المحاولة مرة أخرى.'), {
        code: 'search_unavailable',
        retryable: true,
        details: error instanceof Error ? error.message : CLIENT_KEY_DISABLED_MESSAGE,
      });
    })();

    try {
      const deep = await deepThinkingResponseDetailed(prompt, requestContext);
      return {
        text: deep.text,
        chunks: [],
        sources: deep.sources || [],
        sourceCount: deep.sources?.length || 0,
        retrievedAt: Date.now(),
        provider: deep.provider,
        degraded: true,
        details: normalizedError.message,
        deepMeta: deep.deepMeta,
        fallbackMode: 'deep',
        liveSearchUnavailable: true,
      };
    } catch {
      throw normalizedError;
    }
  }
}

export async function searchNearbyWithGemini(prompt: string, lat: number, lng: number) {
  try {
    const data = await serverAi(
      "search",
      `${prompt}\n\nUse these coordinates as context when relevant: latitude=${lat}, longitude=${lng}.`,
    );
    return { text: data.text || localize("No answer available.", "Belum ada jawaban yang tersedia.", "لا توجد إجابة متاحة."), chunks: data.chunks || [] };
  } catch (error) {
    return { text: error instanceof Error ? error.message : CLIENT_KEY_DISABLED_MESSAGE, chunks: [] };
  }
}

export async function analyzeImage(
  base64Image: string,
  mimeType: string,
  prompt: string,
  requestContext?: ChatRequestContextPayload,
) {
  try {
    const result = await serverAi("analyze_image", prompt, { image: base64Image, mimeType }, requestContext);
    return result.text || localize("Image analysis returned no text.", "Analisis gambar tidak mengembalikan teks.", "لم يُرجع تحليل الصورة أي نص.");
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error(localize("Image analysis unavailable. Please try again.", "Analisis gambar tidak tersedia. Silakan coba lagi.", "تحليل الصورة غير متاح. يرجى المحاولة مرة أخرى."));
  }
}

export function buildAttachmentSmartPrompt(
  kind: ChatAttachmentKind | "pdf" | "txt",
  fileName?: string,
  userCaption?: string,
) {
  const caption = (userCaption || "").trim();
  const appLanguage = getAppLanguage();
  const useId = isIndonesianLanguage(appLanguage);
  const useAr = isArabicLanguage(appLanguage);
  if (caption) {
    if (useId) {
      return `Anda adalah Baristachaw, asisten kopi ahli yang mengikuti standar SCA. Analisis lampiran jenis ${kind} ini dan jawab permintaan pengguna secara presisi.\n\nPermintaan pengguna: ${caption}`;
    }
    if (useAr) {
      return `أنت Baristachaw، مساعد قهوة خبير يتبع معايير SCA. حلّل هذا المرفق من النوع ${kind} وأجب عن طلب المستخدم بدقة.\n\nطلب المستخدم: ${caption}`;
    }
    return `You are Baristachaw, an expert coffee assistant following SCA standards. Analyze this ${kind} attachment and answer the user's request precisely.\n\nUser request: ${caption}`;
  }

  const subjectLabel = fileName
    ? (useId ? `Berkas: ${fileName}` : useAr ? `ملف: ${fileName}` : `File: ${fileName}`)
    : (useId ? "Lampiran pengguna" : useAr ? "مرفق المستخدم" : "User attachment");
  if (kind === "txt" || kind === "file" || kind === "pdf") {
    if (useId) {
      return `Anda adalah Baristachaw, asisten kopi ahli yang mengikuti standar SCA.
Analisis dokumen terlampir dan berikan:
1) ringkasan singkat
2) poin penting / sorotan
3) risiko atau ketidakkonsistenan
4) rekomendasi atau langkah lanjut yang dapat dijalankan
5) pertanyaan lanjutan yang relevan bila perlu

${subjectLabel}`;
    }
    if (useAr) {
      return `أنت Baristachaw، مساعد قهوة خبير يتبع معايير SCA.
حلّل المستند المرفق وقدّم:
1) ملخصًا موجزًا
2) النقاط الأساسية / أبرز الملاحظات
3) المخاطر أو حالات عدم الاتساق
4) توصيات عملية / خطوات تالية قابلة للتنفيذ
5) أسئلة متابعة مقترحة عند الحاجة

${subjectLabel}`;
    }
    return `You are Baristachaw, an expert coffee assistant following SCA standards.
Analyze the attached document and provide:
1) concise summary
2) key points / highlights
3) risks or inconsistencies
4) actionable recommendations / next steps
5) suggested follow-up questions if useful

${subjectLabel}`;
  }

  if (useId) {
    return `Anda adalah Baristachaw, asisten kopi ahli yang mengikuti standar SCA.
Analisis gambar terlampir secara teliti dan berikan:
1) apa yang terlihat
2) observasi kopi/barista yang relevan
3) isu kualitas atau saran perbaikan
4) langkah lanjut praktis

${subjectLabel}`;
  }
  if (useAr) {
    return `أنت Baristachaw، مساعد قهوة خبير يتبع معايير SCA.
حلّل الصورة المرفقة بعناية وقدّم:
1) ما هو ظاهر في الصورة
2) ملاحظات مرتبطة بالقهوة/الباريستا
3) مشكلات الجودة أو اقتراحات التحسين
4) خطوات عملية تالية

${subjectLabel}`;
  }
  return `You are Baristachaw, an expert coffee assistant following SCA standards.
Analyze the attached image carefully and provide:
1) what is visible
2) relevant coffee/barista observations
3) quality issues or improvement suggestions
4) practical next actions

${subjectLabel}`;
}

export async function analyzeAttachment(
  base64Data: string,
  mimeType: string,
  prompt: string,
  requestContext?: ChatRequestContextPayload,
) {
  try {
    const result = await serverAi("analyze_attachment", prompt, { image: base64Data, mimeType }, requestContext);
    return result.text || localize("Attachment analysis returned no text.", "Analisis lampiran tidak mengembalikan teks.", "لم يُرجع تحليل المرفق أي نص.");
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error(localize("Attachment analysis unavailable. Please try again.", "Analisis lampiran tidak tersedia. Silakan coba lagi.", "تحليل المرفق غير متاح. يرجى المحاولة مرة أخرى."));
  }
}

export async function analyzeTextDocument(
  textContent: string,
  prompt: string,
  requestContext?: ChatRequestContextPayload,
) {
  try {
    const result = await serverAi("analyze_text", prompt, { textContent }, requestContext);
    return result.text || localize("Document analysis returned no text.", "Analisis dokumen tidak mengembalikan teks.", "لم يُرجع تحليل المستند أي نص.");
  } catch {
    try {
      return await serverChat(`${prompt}\n\nDocument content:\n${textContent}`, requestContext);
    } catch (error) {
      return error instanceof Error ? error.message : localize("Document analysis unavailable. Please try again.", "Analisis dokumen tidak tersedia. Silakan coba lagi.", "تحليل المستند غير متاح. يرجى المحاولة مرة أخرى.");
    }
  }
}

export async function generateImage(prompt: string) {
  try {
    const result = await serverAi("generate_image", prompt);
    return result.imageDataUrl || null;
  } catch {
    return null;
  }
}

export async function editLatteArtImage(
  base64Image: string,
  mimeType: string,
  prompt: string,
  requestContext?: ChatRequestContextPayload,
) {
  const result = await serverAi("edit_latte_art", prompt, { image: base64Image, mimeType }, requestContext);
  if (!result.imageDataUrl) {
    throw new Error(localize(
      "AI latte art returned no image. Please try again.",
      "AI latte art tidak mengembalikan gambar. Silakan coba lagi.",
      "لم تُرجِع ميزة فن اللاتيه المدعومة بالذكاء الاصطناعي صورة. يرجى المحاولة مرة أخرى.",
    ));
  }
  return result.imageDataUrl;
}

async function structuredTextResponseDetailed(
  action: "fast" | "balanced",
  prompt: string,
  requestContext?: ChatRequestContextPayload,
  options?: {
    model?: string;
  },
): Promise<StructuredTextDetailedPayload> {
  const fallbackMessage = localize(
    "Sorry, I could not process your request. Please try again.",
    "Maaf, permintaan Anda belum bisa diproses. Silakan coba lagi.",
    "Ø¹Ø°Ø±Ù‹Ø§ØŒ ØªØ¹Ø°Ø±Øª Ù…Ø¹Ø§Ù„Ø¬Ø© Ø·Ù„Ø¨Ùƒ. ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.",
  );

  try {
    const result = await serverAi(
      action,
      prompt,
      options?.model ? { model: options.model } : undefined,
      requestContext,
    );
    const text = String(result.text || '').trim();
    if (!text) {
      throw new StructuredTextModeError(`${action} response was empty.`, {
        requestId: result.requestId,
        provider: result.provider,
        degraded: result.degraded,
        details: result.details,
      });
    }
    return {
      text,
      provider: result.provider,
      degraded: result.degraded,
      details: result.details,
      requestId: result.requestId,
    };
  } catch (error) {
    try {
      const fallbackText = await serverChat(prompt, requestContext);
      const text = String(fallbackText || '').trim();
      if (text) {
        return {
          text,
          provider: "chat_race",
          degraded: true,
          details: `${action}_fallback:${error instanceof Error ? error.message : "request_failed"}`,
        };
      }
    } catch (fallbackError) {
      if (error instanceof StructuredTextModeError) throw error;
      if (error instanceof ServerAiError) {
        throw new StructuredTextModeError(error.message, {
          requestId: error.requestId,
          errorCode: error.errorCode,
          retryable: error.retryable,
          provider: error.provider,
          degraded: error.degraded,
          details: fallbackError instanceof Error ? fallbackError.message : error.message,
        });
      }
    }

    throw new StructuredTextModeError(fallbackMessage, {
      retryable: true,
      details: error instanceof Error ? error.message : CLIENT_KEY_DISABLED_MESSAGE,
    });
  }
}

export async function fastResponseDetailed(
  prompt: string,
  requestContext?: ChatRequestContextPayload,
  options?: {
    model?: string;
  },
): Promise<StructuredTextDetailedPayload> {
  return structuredTextResponseDetailed("fast", prompt, requestContext, options);
}

export async function balancedResponseDetailed(
  prompt: string,
  requestContext?: ChatRequestContextPayload,
  options?: {
    model?: string;
  },
): Promise<StructuredTextDetailedPayload> {
  return structuredTextResponseDetailed("balanced", prompt, requestContext, options);
}

export async function fastResponseLegacy(
  prompt: string,
  requestContext?: ChatRequestContextPayload,
  options?: {
    model?: string;
  },
) {
  try {
    const result = await serverAi(
      "fast",
      prompt,
      options?.model ? { model: options.model } : undefined,
      requestContext,
    );
    return result.text || localize("Sorry, I could not process your request. Please try again.", "Maaf, permintaan Anda belum bisa diproses. Silakan coba lagi.", "عذرًا، تعذرت معالجة طلبك. يرجى المحاولة مرة أخرى.");
  } catch {
    try {
      return await serverChat(prompt, requestContext);
    } catch {
      return localize("Sorry, I could not process your request. Please try again.", "Maaf, permintaan Anda belum bisa diproses. Silakan coba lagi.", "عذرًا، تعذرت معالجة طلبك. يرجى المحاولة مرة أخرى.");
    }
  }
}

export async function fastResponse(
  prompt: string,
  requestContext?: ChatRequestContextPayload,
  options?: {
    model?: string;
  },
) {
  const result = await fastResponseDetailed(prompt, requestContext, options);
  return result.text;
}

export async function analyzeVideoFrames(frames: { data: string; mimeType: string }[], prompt: string) {
  const first = frames[0];
  if (!first?.data || !first?.mimeType) return localize("Video analysis unavailable. Please try again.", "Analisis video tidak tersedia. Silakan coba lagi.", "تحليل الفيديو غير متاح. يرجى المحاولة مرة أخرى.");
  try {
    const result = await serverAi("analyze_attachment", prompt, { image: first.data, mimeType: first.mimeType });
    return result.text || localize("Video analysis returned no text.", "Analisis video tidak mengembalikan teks.", "لم يُرجع تحليل الفيديو أي نص.");
  } catch (error) {
    return error instanceof Error ? error.message : localize("Video analysis unavailable. Please try again.", "Analisis video tidak tersedia. Silakan coba lagi.", "تحليل الفيديو غير متاح. يرجى المحاولة مرة أخرى.");
  }
}

export async function transcribeAudio(base64Audio: string, mimeType: string) {
  try {
    const result = await serverAi("transcribe", "Transcribe this audio accurately.", {
      image: base64Audio,
      mimeType,
    });
    return result.text || localize("Transcription returned no text.", "Transkripsi tidak mengembalikan teks.", "لم تُرجع عملية التفريغ أي نص.");
  } catch (error) {
    return error instanceof Error ? error.message : localize("Transcription unavailable.", "Transkripsi tidak tersedia.", "التفريغ غير متاح.");
  }
}

export async function deepThinkingResponse(prompt: string, requestContext?: ChatRequestContextPayload) {
  try {
    const result = await deepThinkingResponseDetailed(prompt, requestContext);
    return result.text;
  } catch {
    return localize("Sorry, I could not process your request. Please try again.", "Maaf, permintaan Anda belum bisa diproses. Silakan coba lagi.", "عذرًا، تعذرت معالجة طلبك. يرجى المحاولة مرة أخرى.");
  }
}

export async function deepThinkingResponseDetailed(
  prompt: string,
  requestContext?: ChatRequestContextPayload,
): Promise<DeepThinkingDetailedPayload> {
  try {
    const result = await serverAi("deep_think", prompt, undefined, requestContext);
    const text = String(result.text || '').trim();
    if (!text) {
      throw new DeepThinkingError('Deep response was empty.', {
        requestId: result.requestId,
        provider: result.provider,
        degraded: result.degraded,
        details: result.details,
      });
    }
    return {
      text,
      provider: result.provider,
      degraded: result.degraded,
      details: result.details,
      sources: Array.isArray(result.sources)
        ? result.sources.filter(source => typeof source?.uri === 'string' && source.uri.trim().length > 0)
        : [],
      deepMeta: result.deepMeta,
      requestId: result.requestId,
    };
  } catch (error) {
    if (error instanceof DeepThinkingError) throw error;
    if (error instanceof ServerAiError) {
      throw new DeepThinkingError(error.message, {
        requestId: error.requestId,
        errorCode: error.errorCode,
        retryable: error.retryable,
        provider: error.provider,
        degraded: error.degraded,
        details: error.message,
      });
    }
    throw new DeepThinkingError(localize('Deep mode is unavailable. Please retry.', 'Mode Deep tidak tersedia. Silakan coba lagi.', 'وضع التحليل العميق غير متاح. يرجى إعادة المحاولة.'), {
      retryable: true,
      details: error instanceof Error ? error.message : CLIENT_KEY_DISABLED_MESSAGE,
    });
  }
}

export async function generateSpeech(text: string) {
  try {
    const result = await serverAi("generate_speech", text);
    return result.audioDataUrl || null;
  } catch {
    return null;
  }
}

export function getVaultStatus() {
  return { disabled: true, reason: "client_keys_disabled" };
}

export function getFullVaultStatus() {
  return { GEMINI: { total: 0, active: 0, cooldown: 0, blacklisted: 0 } };
}

export function getAvailableProviders() {
  return [] as string[];
}

