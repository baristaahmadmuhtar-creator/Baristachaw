// Keep runtime constants local to server-api so Vercel bundles do not depend on raw workspace .ts imports.
export const CHAT_INPUT_MAX_CHARS = 1800;
export const STRUCTURED_AI_PROMPT_MAX_CHARS = 12000;

export type {
  AgentBaristaSkillFocus,
  AgentProfileMemory,
  AiAction,
  AiChatIntent,
  AiToolSuggestion,
  AmbiguityPolicy,
  ChatAttachmentKind,
  ClientContext,
  ClientPlatform,
  ConversationContext,
  ConversationContextMessage,
  ExpectationProfile,
  ResolvedResponseProfile,
  ResponseFormat,
  ResponseProfile,
  ResponseTone,
  ResponseVerbosity,
  StructuredSearchSource,
} from '../packages/shared/src/domain.ts';
