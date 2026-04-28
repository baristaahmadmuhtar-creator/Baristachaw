export type AiAction =
  | 'search'
  | 'analyze_image'
  | 'analyze_attachment'
  | 'edit_latte_art'
  | 'fast'
  | 'balanced'
  | 'deep_think'
  | 'transcribe'
  | 'analyze_text'
  | 'generate_image'
  | 'generate_speech';

export type ChatResponseMode = 'race' | 'target';

export type ResponseVerbosity = 'short' | 'balanced' | 'comprehensive';
export type ResponseFormat = 'plain' | 'bullets' | 'steps' | 'table';
export type ResponseTone = 'neutral' | 'professional' | 'friendly';
export type AmbiguityPolicy = 'ask_first' | 'assume' | 'multi_option';
export type AmbiguityRisk = 'low' | 'high';
export type DomainDepth = 'basic' | 'advanced';
export type AgentBaristaSkillFocus =
  | 'espresso_dial_in'
  | 'brew_recipe_design'
  | 'sensory_cupping'
  | 'milk_latte_art'
  | 'water_chemistry'
  | 'grinder_equipment'
  | 'cafe_operations'
  | 'training_coaching'
  | 'menu_costing'
  | 'coffee_origin_roast'
  | 'troubleshooting';
export type AiChatIntent =
  | 'greeting'
  | 'question'
  | 'command'
  | 'recipe_request'
  | 'diagnostic'
  | 'app_support'
  | 'tool_command'
  | 'save_command'
  | 'persona_memory'
  | 'open_ended';
export type AiToolSuggestion =
  | 'ai_brew'
  | 'brew_timer'
  | 'ratio_calculator'
  | 'vision_scan'
  | 'save_to_collection'
  | 'chat_memory'
  | 'home_language'
  | 'deep_mode'
  | 'web_search';
export type ClientPlatform = 'web' | 'pwa' | 'mobile';
export type ClientSurface = 'home' | 'chat' | 'scanner' | 'collection' | 'tools' | 'auth';

export interface ResponseProfile {
  language?: string;
  verbosity?: ResponseVerbosity;
  format?: ResponseFormat;
  tone?: ResponseTone;
  ambiguityPolicy?: AmbiguityPolicy;
}

export interface ClientContext {
  platform?: ClientPlatform;
  appLanguage?: string;
  acceptLanguage?: string;
  surface?: ClientSurface;
}

export interface ConversationContextMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface ConversationContext {
  summary?: string;
  preferredLanguage?: string;
  recentMessages: ConversationContextMessage[];
  sessionTitle?: string;
}

export type AgentEmojiPolicy = 'default' | 'minimal' | 'none';
export type AgentLanguageSource = 'global' | 'manual';

export interface AgentProfileMemory {
  preferredLanguage?: string;
  languageSource?: AgentLanguageSource;
  userDisplayName?: string;
  assistantName?: string;
  responseStyle?: ResponseFormat;
  tonePreference?: ResponseTone;
  detailPreference?: ResponseVerbosity;
  workspaceRole?: string;
  workflowFocus?: string;
  skillFocus?: AgentBaristaSkillFocus[];
  emojiPolicy?: AgentEmojiPolicy;
  blockedWords?: string[];
  styleNotes?: string;
  updatedAt: number;
}

export interface ExpectationProfile {
  verbosity: ResponseVerbosity;
  format: ResponseFormat;
  domainDepth: DomainDepth;
  tone: ResponseTone;
  ambiguityRisk: AmbiguityRisk;
  ambiguityPolicy: AmbiguityPolicy;
}

export interface ResolvedResponseProfile {
  language: string;
  expectation: ExpectationProfile;
}

export type AuthProvider = 'google' | 'facebook' | 'apple' | 'email' | 'guest';

export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  provider?: AuthProvider;
  isPrivateEmail?: boolean;
}

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
  provider?: AuthProvider;
  user: UserProfile;
}

export type AiErrorCode =
  | 'invalid_key'
  | 'quota_exceeded'
  | 'provider_timeout'
  | 'bad_request'
  | 'unsupported_model'
  | 'provider_error'
  | 'internal_error'
  | 'no_key'
  | 'unknown_action'
  | 'validation_error'
  | 'auth_required'
  | 'rate_limited'
  | 'server_misconfigured'
  | 'search_unavailable'
  | 'insufficient_sources';

export interface StructuredSearchSource {
  uri: string;
  title?: string;
  domain?: string;
}

export interface DeepResponseMeta {
  mode: 'deep';
  grounded: boolean;
  degraded: boolean;
  fallbackUsed: boolean;
  qualityPass: boolean;
  latencyMs: number;
  sourceCount: number;
}

export interface StructuredAiResponse {
  ok?: boolean;
  requestId?: string;
  action?: AiAction;
  text?: string;
  chunks?: Array<{ web?: { uri?: string; title?: string } }>;
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

export type ChatAttachmentKind = 'image' | 'camera' | 'file' | 'audio' | 'video' | 'pdf' | 'txt';
export type ChatAttachmentAiMode = 'smart_analyze' | 'transcribe' | 'caption_only';

export interface ChatAttachment {
  id: string;
  kind: ChatAttachmentKind;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  previewDataUrl?: string;
  inlineBase64?: string;
  extractedText?: string;
  durationMs?: number;
  width?: number;
  height?: number;
  aiMode?: ChatAttachmentAiMode;
}

export type ChatMessageRole = 'user' | 'assistant' | 'model';

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  role: ChatMessageRole;
  text: string;
  timestamp: number;
  audioDataUrl?: string;
  attachments?: ChatAttachment[];
  transcriptText?: string;
  attachmentPrompt?: string;
  provider?: string;
  sources?: string[];
  sourceDetails?: StructuredSearchSource[];
  deepMeta?: DeepResponseMeta;
  deletedAt?: number;
}

export interface ChatSessionRecord {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessageAt: number;
  folderId?: string;
  summary?: string;
  preferredResponseLanguage?: string;
  hasUserMessage?: boolean;
  deletedAt?: number;
}

export interface ChatFolderRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface CollectionFolderRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface RecipeData {
  id?: string;
  createdAt?: number;
  folderId?: string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  time: string;
  dose?: string;
  water?: string;
  temperature?: string;
  grind?: string;
  brewStyle?: 'espresso' | 'manual_brew' | 'milk_based' | 'cold_brew' | 'tea_based' | 'unknown';
}

export interface CollectionItemBase {
  id: string;
  type: 'recipe' | 'ai_canvas';
  folderId?: string;
  title: string;
  sortOrder?: number;
  cardColor?: 'amber' | 'sky' | 'emerald' | 'rose' | 'slate';
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface RecipeCollectionItem extends CollectionItemBase {
  type: 'recipe';
  content: RecipeData;
}

export interface AiCanvasCollectionItem extends CollectionItemBase {
  type: 'ai_canvas';
  content: {
    markdown: string;
    prompt?: string;
    kind?: 'recipe_sop' | 'brew_guide' | 'qa_context' | 'note';
    sessionId?: string;
    messageId?: string;
    sources?: string[];
  };
}

export type CollectionItemRecord = RecipeCollectionItem | AiCanvasCollectionItem;

export interface ParityTodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
}

export function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
