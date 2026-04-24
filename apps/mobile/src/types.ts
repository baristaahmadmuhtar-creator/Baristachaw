import type {
  AgentProfileMemory,
  AiAction,
  AuthProvider,
  AuthSession,
  ChatAttachment,
  ChatResponseMode,
  ConversationContext,
  ChatFolderRecord,
  ChatMessageRecord,
  ChatSessionRecord,
  CollectionFolderRecord,
  CollectionItemRecord,
  ClientContext,
  ExpectationProfile,
  ParityTodoItem,
  ResponseProfile,
  StructuredAiResponse,
  UserProfile,
} from '@baristachaw/shared';

export type {
  AgentProfileMemory,
  AiAction,
  AuthProvider,
  AuthSession,
  ChatAttachment,
  ChatResponseMode,
  ConversationContext,
  ChatFolderRecord,
  ChatMessageRecord,
  ChatSessionRecord,
  CollectionFolderRecord,
  CollectionItemRecord,
  ClientContext,
  ExpectationProfile,
  ParityTodoItem,
  ResponseProfile,
  StructuredAiResponse,
  UserProfile,
};

export interface MobileOAuthStartResponse {
  ok: boolean;
  requestId: string;
  url: string;
  state: string;
  redirectUri: string;
  appScheme: string;
}

export interface MobileOAuthExchangeResponse {
  ok: boolean;
  requestId: string;
  accessToken: string;
  expiresAt: number;
  user: UserProfile;
}

export interface MobileAppleExchangeRequest {
  identityToken: string;
  authorizationCode?: string;
  email?: string;
  name?: string;
}

export interface MobileSupabaseExchangeRequest {
  accessToken: string;
}

export interface EmailAuthPayload {
  mode: 'signIn' | 'signUp';
  email: string;
  password: string;
  displayName?: string;
}

export type EmailAuthResult =
  | { status: 'signed_in'; session: AuthSession }
  | { status: 'confirmation_required'; email: string; message: string };

export interface PasswordResetPayload {
  email: string;
}

export interface PasswordUpdatePayload {
  password: string;
}

export type SupabaseDeepLinkResult =
  | { kind: 'signIn'; session: AuthSession }
  | { kind: 'passwordRecovery'; email?: string }
  | null;

export interface MobileStoreState {
  schemaVersion: 2;
  chatSessions: ChatSessionRecord[];
  chatMessages: ChatMessageRecord[];
  chatFolders: ChatFolderRecord[];
  collectionFolders: CollectionFolderRecord[];
  collectionItems: CollectionItemRecord[];
  todos: ParityTodoItem[];
}

export type MobileQuickSaveSource = 'home' | 'chat' | 'scanner';

export interface MobileQuickSavePayload {
  title: string;
  markdown: string;
  source: MobileQuickSaveSource;
  sources?: string[];
  sessionId?: string;
  messageId?: string;
}

export interface ApiErrorEnvelope {
  message: string;
  requestId?: string;
  errorCode?: string;
  retryable?: boolean;
  details?: string;
  status: number;
}

export interface ApiRequestOptions {
  retries?: number;
  timeoutMs?: number;
  useAuth?: boolean;
}

export type AccountStatusValue = 'active' | 'trialing' | 'past_due' | 'suspended' | 'deleted';
export type AccountPlanCode = 'free' | 'starter' | 'pro' | 'team' | 'enterprise';
export type AccountFeatureFlagStatus = 'available' | 'maintenance' | 'disabled';
export type AccountFeatureSurface = 'global' | 'web' | 'pwa' | 'mobile' | 'admin';

export interface AccountFeatureFlag {
  key: string;
  label: string;
  status: AccountFeatureFlagStatus;
  message: string;
  surfaces: AccountFeatureSurface[];
  updatedAt: string;
}

export interface AccountStatusResponse {
  ok: true;
  requestId: string;
  generatedAt: string;
  dataMode: 'supabase' | 'runtime_fallback';
  user: {
    id: string;
    email?: string;
    name: string;
    picture?: string;
    role: string;
    status: AccountStatusValue;
    planCode: AccountPlanCode;
    planName: string;
    lastSeenAt: string;
  };
  plan: {
    code: AccountPlanCode;
    name: string;
    description: string;
    aiDailyLimit: number;
    deepDailyLimit: number;
    scannerDailyLimit: number;
    storageMb: number;
    seats: number;
    supportSlaHours: number;
    features: string[];
  };
  featureFlags: AccountFeatureFlag[];
  maintenance: AccountFeatureFlag[];
  appAccess: {
    status: 'ok' | 'limited' | 'blocked';
    message: string;
  };
  warnings: string[];
  realtime: {
    strategy: 'polling';
    intervalSec: number;
  };
}

export interface AiActionRequest {
  action: AiAction;
  prompt: string;
  image?: string;
  mimeType?: string;
  textContent?: string;
  model?: string;
  responseProfile?: ResponseProfile;
  clientContext?: ClientContext;
  conversationContext?: ConversationContext;
  agentProfile?: AgentProfileMemory;
}
