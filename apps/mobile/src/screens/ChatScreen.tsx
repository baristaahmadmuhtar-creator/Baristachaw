import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useIsFocused, useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import {
  extractDurablePreferenceUpdates,
  CHAT_INPUT_MAX_CHARS,
  CHAT_INPUT_WARNING_CHARS,
  CHAT_DEEP_THINKING_PHASES,
  CHAT_PARITY,
  appendAttachmentResponseStyle,
  buildAttachmentSmartPrompt,
  buildConversationContext,
  buildResponseOrchestration,
  genId,
  isReusableDraftSession,
  normalizeAgentProfileMemory,
  type AgentBaristaSkillFocus,
  type ChatAttachmentKind,
  type DeepResponseMeta,
  type AgentProfileMemory,
  type ResponseMode,
  type StructuredSearchSource,
} from '@baristachaw/shared';
import {
  ActionButton,
  AppShell,
  ComposerDock,
  HeroHeader,
  InfoPill,
  ResultSheet,
  SectionCard,
  SegmentedControl,
} from '../design-system';
import { DEFAULT_LANGUAGE, LANGUAGE_META } from '../web-shared/constants';
import { ApiClient, ApiError } from '../services/apiClient';
import { readAgentProfileMemory, resetAgentProfileMemory, saveAgentProfileMemory } from '../services/agentProfileStore';
import {
  appendMessage,
  createChatFolder,
  createChatSession,
  listChatFolders,
  listChatSessions,
  listMessagesForSession,
  moveChatSession,
  renameChatFolder,
  renameChatSession,
  softDeleteChatFolder,
  softDeleteChatSession,
} from '../services/mobileStore';
import { hapticImpactLight, hapticSuccess } from '../services/haptics';
import { ensureCameraPermission, ensureMediaLibraryPermission } from '../services/permissions';
import { captureError, trackEvent } from '../services/telemetry';
import { uiTokens } from '../theme/tokens';
import { usePreferredMobileLanguage } from '../hooks/usePreferredMobileLanguage';
import { getMobileLocalization } from '../utils/localization';
import { CHAT_VOICE_NOTE_MAX_DURATION_MS, computeComposerBottomOffset } from './chatComposerLayout';
import type {
  AuthSession,
  ChatFolderRecord,
  ChatMessageRecord,
  ChatSessionRecord,
  MobileQuickSavePayload,
} from '../types';

type ChatMode = 'normal' | 'fast' | 'deep';
type ChatLoadingPhase = 'idle' | 'sending' | 'thinking' | 'rendering';
type ChatSurface = 'none' | 'history' | 'tools' | 'imageStudio' | 'messageActions' | 'memory';
type MemorySection = 'identity' | 'reply' | 'workflow' | 'guardrails';

const MEMORY_SKILL_OPTIONS: Array<{ value: AgentBaristaSkillFocus; label: string }> = [
  { value: 'espresso_dial_in', label: 'Espresso' },
  { value: 'brew_recipe_design', label: 'Recipe' },
  { value: 'sensory_cupping', label: 'Sensory' },
  { value: 'milk_latte_art', label: 'Milk' },
  { value: 'water_chemistry', label: 'Water' },
  { value: 'grinder_equipment', label: 'Equipment' },
  { value: 'cafe_operations', label: 'Cafe ops' },
  { value: 'training_coaching', label: 'Training' },
  { value: 'menu_costing', label: 'Costing' },
  { value: 'coffee_origin_roast', label: 'Origin/roast' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
];

type AssistantResponsePayload = {
  text: string;
  provider?: string;
  degraded?: boolean;
  details?: string;
  sourceDetails?: StructuredSearchSource[];
  deepMeta?: DeepResponseMeta;
  preferredLanguage?: string;
};

type DraftAttachment = {
  kind: ChatAttachmentKind;
  fileName: string;
  mimeType: string;
  base64: string;
  textContent?: string;
};

type ChatScreenProps = {
  apiClient: ApiClient;
  session: AuthSession | null;
  isOnline: boolean;
  guestModeEnabled: boolean;
  onSaveToCollection: (payload: MobileQuickSavePayload) => Promise<void>;
};

const MAX_INLINE_ATTACHMENT_LABEL = '2.5MB';
const MAX_ATTACHMENT_BYTES = 2_500_000;

function estimateBase64ByteSize(base64: string): number {
  const normalized = String(base64 || '').replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function snapshotMemory(profile: AgentProfileMemory): string {
  return JSON.stringify({
    preferredLanguage: profile.preferredLanguage || '',
    userDisplayName: profile.userDisplayName || '',
    assistantName: profile.assistantName || '',
    responseStyle: profile.responseStyle || '',
    tonePreference: profile.tonePreference || '',
    detailPreference: profile.detailPreference || '',
    workspaceRole: profile.workspaceRole || '',
    workflowFocus: profile.workflowFocus || '',
    skillFocus: profile.skillFocus || [],
    emojiPolicy: profile.emojiPolicy || '',
    blockedWords: profile.blockedWords || [],
    styleNotes: profile.styleNotes || '',
  });
}

function formatMemoryUpdatedAt(timestamp: number | undefined, emptyLabel: string, updatedLabel: string): string {
  if (!timestamp || !Number.isFinite(timestamp)) return emptyLabel;
  return `${updatedLabel} ${new Date(timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}`;
}

async function readBase64FromUri(uri: string): Promise<string> {
  return new FileSystem.File(uri).base64();
}

function titleFromInput(input: string): string {
  const trimmed = input.trim();
  return trimmed ? trimmed.slice(0, 60) : CHAT_PARITY.newChat;
}

function toResponseMode(mode: ChatMode): ResponseMode {
  if (mode === 'fast') return 'fast';
  if (mode === 'deep') return 'deep';
  return 'normal';
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatMessageTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildBodyPreview(text: string, max = 170): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > max ? `${compact.slice(0, max - 3).trim()}...` : compact;
}

function buildChatInputLimitMessage(limit: number, message: string): string {
  void limit;
  return message;
}

function clampChatPayloadText(value: string): string {
  const normalized = String(value || '').replace(/\r\n/g, '\n').trim();
  if (normalized.length <= CHAT_INPUT_MAX_CHARS) return normalized;
  return normalized.slice(0, CHAT_INPUT_MAX_CHARS);
}

function attachmentIconName(kind: ChatAttachmentKind): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'audio':
      return 'mic-outline';
    case 'camera':
      return 'camera-outline';
    case 'file':
    case 'pdf':
    case 'txt':
      return 'document-text-outline';
    case 'video':
      return 'videocam-outline';
    default:
      return 'image-outline';
  }
}

function resolveAttachmentAudioUri(message: ChatMessageRecord): string | null {
  if (typeof message.audioDataUrl === 'string' && message.audioDataUrl.trim()) {
    return message.audioDataUrl.trim();
  }

  const audioAttachment = message.attachments?.find((attachment) => attachment.kind === 'audio' && attachment.inlineBase64);
  if (!audioAttachment?.inlineBase64) return null;
  return `data:${audioAttachment.mimeType || 'audio/m4a'};base64,${audioAttachment.inlineBase64}`;
}

export function ChatScreen({ apiClient, session, isOnline, guestModeEnabled, onSaveToCollection }: ChatScreenProps) {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const threadRef = useRef<FlatList<ChatMessageRecord> | null>(null);

  const [input, setInput] = useState('');
  const [inputLimitNotice, setInputLimitNotice] = useState('');
  const [mode, setMode] = useState<ChatMode>('normal');
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [folders, setFolders] = useState<ChatFolderRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<ChatLoadingPhase>('idle');
  const [activeRequestMode, setActiveRequestMode] = useState<ChatMode | null>(null);
  const [deepThinkingPhaseIndex, setDeepThinkingPhaseIndex] = useState(0);
  const [error, setError] = useState('');
  const [savedLast, setSavedLast] = useState(false);
  const [draftAttachment, setDraftAttachment] = useState<DraftAttachment | null>(null);
  const [imgPrompt, setImgPrompt] = useState('');
  const [imgLoading, setImgLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ id: string; prompt: string; imageDataUrl: string }>>([]);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(140);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceElapsedMs, setVoiceElapsedMs] = useState(0);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingSessionId, setRenamingSessionId] = useState('');
  const [sessionRenameValue, setSessionRenameValue] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState('');
  const [folderRenameValue, setFolderRenameValue] = useState('');
  const [activeSurface, setActiveSurface] = useState<ChatSurface>('none');
  const [selectedAssistantMessage, setSelectedAssistantMessage] = useState<ChatMessageRecord | null>(null);
  const preferredMobileLanguage = usePreferredMobileLanguage(session?.user.id);
  const preferredLocaleState = useMemo(() => getMobileLocalization(preferredMobileLanguage), [preferredMobileLanguage]);
  const preferredLanguage = preferredLocaleState.language;
  const [agentProfile, setAgentProfile] = useState<AgentProfileMemory>(() => normalizeAgentProfileMemory({
    preferredLanguage,
    assistantName: 'Baristachaw',
    userDisplayName: session?.user.name,
  }));
  const [savedAgentProfile, setSavedAgentProfile] = useState<AgentProfileMemory>(() => normalizeAgentProfileMemory({
    preferredLanguage,
    assistantName: 'Baristachaw',
    userDisplayName: session?.user.name,
  }));
  const localeState = useMemo(() => getMobileLocalization(agentProfile.preferredLanguage), [agentProfile.preferredLanguage]);
  const { direction } = localeState;
  const webT = localeState.web;
  const chatCopy = localeState.copy.chat;
  const modeItems = useMemo(() => ([
    { value: 'fast' as const, label: webT.fastMode },
    { value: 'normal' as const, label: CHAT_PARITY.modes.normal },
    { value: 'deep' as const, label: webT.deepThink },
  ]), [webT.deepThink, webT.fastMode]);
  const memoryLanguageItems = useMemo(() => ([
    ...Object.entries(LANGUAGE_META).map(([value, meta]) => ({ value, label: meta.nativeLabel })),
  ]), []);
  const memoryDetailItems = useMemo(() => ([
    { value: 'short' as const, label: webT.chatBeConcise || chatCopy.helpers.beConcise },
    { value: 'balanced' as const, label: webT.chatDetailBalanced || 'Balanced' },
    { value: 'comprehensive' as const, label: webT.chatBeDetailed || chatCopy.helpers.beDetailed },
  ]), [chatCopy.helpers.beConcise, chatCopy.helpers.beDetailed, webT.chatBeConcise, webT.chatBeDetailed, webT.chatDetailBalanced]);
  const memoryFormatItems = useMemo(() => ([
    { value: 'plain' as const, label: webT.chatFormatPlain || 'Plain' },
    { value: 'bullets' as const, label: webT.chatFormatBullets || 'Bullets' },
    { value: 'steps' as const, label: webT.chatSteps || 'Steps' },
    { value: 'table' as const, label: webT.chatFormatTable || 'Table' },
  ]), [webT.chatFormatBullets, webT.chatFormatPlain, webT.chatFormatTable, webT.chatSteps]);
  const memoryToneItems = useMemo(() => ([
    { value: 'neutral' as const, label: webT.chatToneNeutral || 'Neutral' },
    { value: 'professional' as const, label: webT.chatToneProfessional || 'Professional' },
    { value: 'friendly' as const, label: webT.chatToneFriendly || 'Friendly' },
  ]), [webT.chatToneFriendly, webT.chatToneNeutral, webT.chatToneProfessional]);
  const memoryEmojiItems = useMemo(() => ([
    { value: 'default' as const, label: webT.chatEmojiDefault || 'Normal emoji' },
    { value: 'minimal' as const, label: webT.chatEmojiMinimal || 'Minimal emoji' },
    { value: 'none' as const, label: webT.chatEmojiNone || 'No emoji' },
  ]), [webT.chatEmojiDefault, webT.chatEmojiMinimal, webT.chatEmojiNone]);
  const legacyChatUi = useMemo(() => {
    if (localeState.language === 'id') {
      return {
        notSavedYet: 'Belum disimpan',
        updated: 'Diperbarui',
        loadHistoryFailed: 'Gagal memuat riwayat chat.',
        cameraPermission: 'Izin kamera diperlukan untuk mengambil lampiran foto.',
        libraryPermission: 'Izin galeri diperlukan untuk memilih media.',
        readAttachmentFailed: 'Lampiran terpilih tidak bisa dibaca.',
        attachmentTooLarge: `Lampiran terlalu besar (maks ${MAX_INLINE_ATTACHMENT_LABEL}).`,
        signInForChatTools: 'Masuk untuk memakai alat chat.',
        offlineSend: 'Anda sedang offline. Sambungkan lagi untuk mengirim pesan.',
        shareTitle: 'Respons Chat Baristachaw',
        signInForImages: 'Masuk untuk memakai alat gambar.',
        offlineImages: 'Anda sedang offline. Sambungkan lagi untuk membuat gambar.',
        generatedImageReuseFailed: 'Gambar hasil tidak bisa dipakai ulang.',
        offlineSpeech: 'Anda sedang offline. Sambungkan lagi untuk memutar audio suara.',
        voiceUnavailable: 'Audio catatan suara tidak tersedia di perangkat ini.',
        openSourceUnsupported: 'Tautan sumber tidak bisa dibuka di perangkat ini.',
        openSourceFailed: 'Tautan sumber tidak bisa dibuka.',
        voiceEmpty: 'Catatan suara kosong. Coba lagi.',
        voiceTooLarge: `Catatan suara terlalu besar (maks ${MAX_INLINE_ATTACHMENT_LABEL}).`,
        voiceProcessFailed: 'Catatan suara tidak bisa diproses. Coba lagi.',
        signInForVoice: 'Masuk untuk memakai catatan suara.',
        offlineVoice: 'Anda sedang offline. Catatan suara butuh internet untuk diproses.',
        microphonePermission: 'Izin mikrofon diperlukan untuk catatan suara.',
        startRecordingFailed: 'Tidak bisa memulai rekaman.',
        sendFailed: 'Gagal mengirim pesan.',
        share: 'Bagikan',
        deep: 'Deep',
        noResponseReturned: 'Tidak ada respons yang dikembalikan.',
      };
    }
    if (localeState.language === 'ar') {
      return {
        notSavedYet: 'لم يتم الحفظ بعد',
        updated: 'تم التحديث',
        loadHistoryFailed: 'تعذر تحميل سجل المحادثة.',
        cameraPermission: 'مطلوب إذن الكاميرا لالتقاط مرفق صورة.',
        libraryPermission: 'مطلوب إذن مكتبة الصور لاختيار الوسائط.',
        readAttachmentFailed: 'تعذر قراءة المرفق المحدد.',
        attachmentTooLarge: `المرفق كبير جدًا (الحد الأقصى ${MAX_INLINE_ATTACHMENT_LABEL}).`,
        signInForChatTools: 'سجّل الدخول لاستخدام أدوات المحادثة.',
        offlineSend: 'أنت غير متصل. أعد الاتصال لإرسال الرسائل.',
        shareTitle: 'رد دردشة Baristachaw',
        signInForImages: 'سجّل الدخول لاستخدام أدوات الصور.',
        offlineImages: 'أنت غير متصل. أعد الاتصال لإنشاء الصور.',
        generatedImageReuseFailed: 'تعذر إعادة استخدام الصورة المُنشأة.',
        offlineSpeech: 'أنت غير متصل. أعد الاتصال لتشغيل الصوت المنطوق.',
        voiceUnavailable: 'صوت الملاحظة الصوتية غير متاح على هذا الجهاز.',
        openSourceUnsupported: 'تعذر فتح رابط المصدر على هذا الجهاز.',
        openSourceFailed: 'تعذر فتح رابط المصدر.',
        voiceEmpty: 'كانت الملاحظة الصوتية فارغة. حاول مرة أخرى.',
        voiceTooLarge: `الملاحظة الصوتية كبيرة جدًا (الحد الأقصى ${MAX_INLINE_ATTACHMENT_LABEL}).`,
        voiceProcessFailed: 'تعذر معالجة الملاحظة الصوتية. حاول مرة أخرى.',
        signInForVoice: 'سجّل الدخول لاستخدام الملاحظة الصوتية.',
        offlineVoice: 'أنت غير متصل. تحتاج الملاحظة الصوتية إلى الإنترنت للمعالجة.',
        microphonePermission: 'مطلوب إذن الميكروفون للملاحظة الصوتية.',
        startRecordingFailed: 'تعذر بدء التسجيل.',
        sendFailed: 'تعذر إرسال الرسالة.',
        share: 'مشاركة',
        deep: 'عميق',
      };
    }
    return {
      notSavedYet: 'Not saved yet',
      updated: 'Updated',
      loadHistoryFailed: 'Failed to load chat history.',
      cameraPermission: 'Camera permission is required to take a photo attachment.',
      libraryPermission: 'Photo library permission is required to choose media.',
      readAttachmentFailed: 'Unable to read selected attachment.',
      attachmentTooLarge: `Attachment too large (max ${MAX_INLINE_ATTACHMENT_LABEL}).`,
      signInForChatTools: 'Please sign in to use chat tools.',
      offlineSend: 'You are offline. Reconnect to send messages.',
      shareTitle: 'Baristachaw Chat Response',
      signInForImages: 'Please sign in to use image tools.',
      offlineImages: 'You are offline. Reconnect to generate images.',
      generatedImageReuseFailed: 'Generated image could not be reused.',
      offlineSpeech: 'You are offline. Reconnect to play speech audio.',
      voiceUnavailable: 'Voice note audio is unavailable on this device.',
      openSourceUnsupported: 'Cannot open source link on this device.',
      openSourceFailed: 'Unable to open source link.',
      voiceEmpty: 'Voice note was empty. Please retry.',
      voiceTooLarge: `Voice note too large (max ${MAX_INLINE_ATTACHMENT_LABEL}).`,
      voiceProcessFailed: 'Unable to process voice note. Please retry.',
      signInForVoice: 'Please sign in to use voice note.',
      offlineVoice: 'You are offline. Voice note needs internet to process.',
      microphonePermission: 'Microphone permission is required for voice note.',
      startRecordingFailed: 'Unable to start recording.',
        sendFailed: 'Failed to send message.',
        share: 'Share',
        deep: 'Deep',
        noResponseReturned: 'No response returned.',
      };
  }, [localeState.language]);
  void legacyChatUi;
  const chatUi = useMemo(() => {
    const manualByLanguage = {
      en: {
        notSavedYet: 'Not saved yet',
        updated: 'Updated',
        loadHistoryFailed: 'Failed to load chat history.',
        shareTitle: 'Baristachaw Chat Response',
        generatedImageReuseFailed: 'Generated image could not be reused.',
        offlineSpeech: 'You are offline. Reconnect to play speech audio.',
        voiceUnavailable: 'Voice note audio is unavailable on this device.',
        openSourceUnsupported: 'Cannot open source link on this device.',
        openSourceFailed: 'Unable to open source link.',
        microphonePermission: 'Microphone permission is required for voice note.',
        startRecordingFailed: 'Unable to start recording.',
        sendFailed: 'Failed to send message.',
        share: 'Share',
        create: 'Create',
        reuseDraft: 'Reuse Draft',
        noResponseReturned: 'No response returned.',
      },
      id: {
        notSavedYet: 'Belum disimpan',
        updated: 'Diperbarui',
        loadHistoryFailed: 'Gagal memuat riwayat chat.',
        shareTitle: 'Respons Chat Baristachaw',
        generatedImageReuseFailed: 'Gambar hasil tidak bisa dipakai ulang.',
        offlineSpeech: 'Anda sedang offline. Sambungkan lagi untuk memutar audio suara.',
        voiceUnavailable: 'Audio catatan suara tidak tersedia di perangkat ini.',
        openSourceUnsupported: 'Tautan sumber tidak bisa dibuka di perangkat ini.',
        openSourceFailed: 'Tautan sumber tidak bisa dibuka.',
        microphonePermission: 'Izin mikrofon diperlukan untuk catatan suara.',
        startRecordingFailed: 'Tidak bisa memulai rekaman.',
        sendFailed: 'Gagal mengirim pesan.',
        share: 'Bagikan',
        create: 'Buat',
        reuseDraft: 'Pakai Draft',
        noResponseReturned: 'Tidak ada respons yang dikembalikan.',
      },
      ar: {
        notSavedYet: 'لم يتم الحفظ بعد',
        updated: 'تم التحديث',
        loadHistoryFailed: 'تعذر تحميل سجل المحادثة.',
        shareTitle: 'رد دردشة Baristachaw',
        generatedImageReuseFailed: 'تعذر إعادة استخدام الصورة التي تم إنشاؤها.',
        offlineSpeech: 'أنت غير متصل. أعد الاتصال لتشغيل الصوت.',
        voiceUnavailable: 'صوت الملاحظة الصوتية غير متاح على هذا الجهاز.',
        openSourceUnsupported: 'تعذر فتح رابط المصدر على هذا الجهاز.',
        openSourceFailed: 'تعذر فتح رابط المصدر.',
        microphonePermission: 'إذن الميكروفون مطلوب للملاحظة الصوتية.',
        startRecordingFailed: 'تعذر بدء التسجيل.',
        sendFailed: 'تعذر إرسال الرسالة.',
        share: 'مشاركة',
        create: 'إنشاء',
        reuseDraft: 'إعادة استخدام المسودة',
      },
      zh: {
        notSavedYet: '尚未保存',
        updated: '已更新',
        loadHistoryFailed: '无法加载聊天记录。',
        shareTitle: 'Baristachaw 聊天回复',
        generatedImageReuseFailed: '无法复用已生成的图片。',
        offlineSpeech: '你当前离线。请重新连接后播放语音。',
        voiceUnavailable: '此设备不支持语音便笺音频。',
        openSourceUnsupported: '此设备无法打开来源链接。',
        openSourceFailed: '无法打开来源链接。',
        microphonePermission: '语音便笺需要麦克风权限。',
        startRecordingFailed: '无法开始录音。',
        sendFailed: '发送消息失败。',
        share: '分享',
        create: '创建',
        reuseDraft: '复用草稿',
      },
      ja: {
        notSavedYet: 'まだ保存されていません',
        updated: '更新済み',
        loadHistoryFailed: 'チャット履歴を読み込めませんでした。',
        shareTitle: 'Baristachaw チャット返信',
        generatedImageReuseFailed: '生成した画像を再利用できませんでした。',
        offlineSpeech: 'オフラインです。音声を再生するには再接続してください。',
        voiceUnavailable: 'この端末では音声メモを再生できません。',
        openSourceUnsupported: 'この端末ではソースリンクを開けません。',
        openSourceFailed: 'ソースリンクを開けませんでした。',
        microphonePermission: '音声メモにはマイク権限が必要です。',
        startRecordingFailed: '録音を開始できませんでした。',
        sendFailed: 'メッセージを送信できませんでした。',
        share: '共有',
        create: '作成',
        reuseDraft: '下書きを再利用',
      },
      ko: {
        notSavedYet: '아직 저장되지 않음',
        updated: '업데이트됨',
        loadHistoryFailed: '채팅 기록을 불러오지 못했습니다.',
        shareTitle: 'Baristachaw 채팅 응답',
        generatedImageReuseFailed: '생성된 이미지를 다시 사용할 수 없습니다.',
        offlineSpeech: '오프라인 상태입니다. 음성을 재생하려면 다시 연결하세요.',
        voiceUnavailable: '이 기기에서는 음성 메모 오디오를 사용할 수 없습니다.',
        openSourceUnsupported: '이 기기에서는 소스 링크를 열 수 없습니다.',
        openSourceFailed: '소스 링크를 열 수 없습니다.',
        microphonePermission: '음성 메모에는 마이크 권한이 필요합니다.',
        startRecordingFailed: '녹음을 시작할 수 없습니다.',
        sendFailed: '메시지 전송에 실패했습니다.',
        share: '공유',
        create: '만들기',
        reuseDraft: '초안 재사용',
      },
      th: {
        notSavedYet: 'ยังไม่บันทึก',
        updated: 'อัปเดตแล้ว',
        loadHistoryFailed: 'โหลดประวัติแชตไม่สำเร็จ',
        shareTitle: 'คำตอบแชต Baristachaw',
        generatedImageReuseFailed: 'ไม่สามารถนำภาพที่สร้างแล้วกลับมาใช้ได้',
        offlineSpeech: 'คุณออฟไลน์อยู่ เชื่อมต่ออีกครั้งเพื่อเล่นเสียง',
        voiceUnavailable: 'อุปกรณ์นี้ไม่รองรับเสียงบันทึกข้อความ',
        openSourceUnsupported: 'อุปกรณ์นี้ไม่สามารถเปิดลิงก์แหล่งที่มาได้',
        openSourceFailed: 'เปิดลิงก์แหล่งที่มาไม่สำเร็จ',
        microphonePermission: 'ต้องอนุญาตไมโครโฟนสำหรับข้อความเสียง',
        startRecordingFailed: 'เริ่มบันทึกเสียงไม่สำเร็จ',
        sendFailed: 'ส่งข้อความไม่สำเร็จ',
        share: 'แชร์',
        create: 'สร้าง',
        reuseDraft: 'ใช้ฉบับร่างเดิม',
      },
      vi: {
        notSavedYet: 'Chưa lưu',
        updated: 'Đã cập nhật',
        loadHistoryFailed: 'Không thể tải lịch sử chat.',
        shareTitle: 'Phản hồi chat Baristachaw',
        generatedImageReuseFailed: 'Không thể dùng lại ảnh đã tạo.',
        offlineSpeech: 'Bạn đang ngoại tuyến. Hãy kết nối lại để phát âm thanh.',
        voiceUnavailable: 'Thiết bị này không hỗ trợ âm thanh ghi chú thoại.',
        openSourceUnsupported: 'Thiết bị này không thể mở liên kết nguồn.',
        openSourceFailed: 'Không thể mở liên kết nguồn.',
        microphonePermission: 'Ghi chú thoại cần quyền micro.',
        startRecordingFailed: 'Không thể bắt đầu ghi âm.',
        sendFailed: 'Không thể gửi tin nhắn.',
        share: 'Chia sẻ',
        create: 'Tạo',
        reuseDraft: 'Dùng lại bản nháp',
      },
      ms: {
        notSavedYet: 'Belum disimpan',
        updated: 'Dikemas kini',
        loadHistoryFailed: 'Gagal memuatkan sejarah sembang.',
        shareTitle: 'Respons sembang Baristachaw',
        generatedImageReuseFailed: 'Imej yang dijana tidak dapat digunakan semula.',
        offlineSpeech: 'Anda di luar talian. Sambung semula untuk memainkan audio.',
        voiceUnavailable: 'Audio mesej suara tidak tersedia pada peranti ini.',
        openSourceUnsupported: 'Pautan sumber tidak boleh dibuka pada peranti ini.',
        openSourceFailed: 'Tidak dapat membuka pautan sumber.',
        microphonePermission: 'Kebenaran mikrofon diperlukan untuk mesej suara.',
        startRecordingFailed: 'Tidak dapat memulakan rakaman.',
        sendFailed: 'Gagal menghantar mesej.',
        share: 'Kongsi',
        create: 'Cipta',
        reuseDraft: 'Guna Semula Draf',
      },
    } as const;

    const manual = manualByLanguage[localeState.language] || manualByLanguage.en;

    return {
      ...manual,
      cameraPermission: webT.chatCameraDeniedUsePhotoFile || manual.openSourceFailed,
      libraryPermission: webT.chatCameraDeniedUsePhotoFile || manual.openSourceFailed,
      readAttachmentFailed: webT.chatAttachmentPayloadUnavailable || manual.openSourceFailed,
      attachmentTooLarge: webT.chatAttachmentFileTooLarge || manual.sendFailed,
      signInForChatTools: webT.signInRequired || manual.create,
      offlineSend: webT.chatOfflineSendUnavailable || manual.sendFailed,
      signInForImages: webT.chatImageSigninRequired || webT.signInRequired || manual.create,
      offlineImages: webT.chatImageOffline || manual.offlineSpeech,
      voiceEmpty: webT.chatVoiceTranscriptionUnclear || manual.voiceUnavailable,
      voiceTooLarge: webT.chatVoiceTooLarge || manual.voiceUnavailable,
      voiceProcessFailed: webT.chatVoiceProcessFailed || manual.voiceUnavailable,
      signInForVoice: webT.chatVoiceSigninRequired || webT.signInRequired || manual.create,
      offlineVoice: webT.chatVoiceOffline || manual.offlineSpeech,
      deep: webT.deepThink || 'Deep',
    };
  }, [localeState.language, webT]);
  const noResponseReturned = localeState.language === 'id'
    ? 'Tidak ada respons yang dikembalikan.'
    : 'No response returned.';
  const [memoryStatus, setMemoryStatus] = useState('');
  const [memorySaving, setMemorySaving] = useState(false);
  const [openMemorySection, setOpenMemorySection] = useState<MemorySection | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingAutoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartRef = useRef(0);
  const recordingStoppingRef = useRef(false);

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readAgentProfileMemory(session?.user.id, {
        preferredLanguage,
        assistantName: 'Baristachaw',
        userDisplayName: session?.user.name,
      });
      if (!cancelled) {
        setAgentProfile(stored);
        setSavedAgentProfile(stored);
        setMemoryStatus(chatCopy.helpers.deviceOnly);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatCopy.helpers.deviceOnly, preferredLanguage, session?.user.id, session?.user.name]);

  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant' || message.role === 'model') || null,
    [messages],
  );

  const clearRecordingTimers = useCallback(() => {
    if (recordingTickRef.current) {
      clearInterval(recordingTickRef.current);
      recordingTickRef.current = null;
    }
    if (recordingAutoStopRef.current) {
      clearTimeout(recordingAutoStopRef.current);
      recordingAutoStopRef.current = null;
    }
  }, []);

  const reloadHistory = useCallback(async (preferredSessionId?: string) => {
    const [nextSessions, nextFolders] = await Promise.all([
      listChatSessions(),
      listChatFolders(),
    ]);

    let resolvedSessionId = preferredSessionId || activeSessionId;
    if (!resolvedSessionId || !nextSessions.find((item) => item.id === resolvedSessionId)) {
      resolvedSessionId = nextSessions[0]?.id || '';
    }

    let resolvedSessions = nextSessions;
    if (!resolvedSessionId) {
      const created = await createChatSession(CHAT_PARITY.newChat);
      resolvedSessionId = created.id;
      resolvedSessions = await listChatSessions();
    }

    setSessions(resolvedSessions);
    setFolders(nextFolders);
    setActiveSessionId(resolvedSessionId);

    if (resolvedSessionId) {
      const nextMessages = await listMessagesForSession(resolvedSessionId);
      setMessages(nextMessages);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!isFocused) return;
    trackEvent('screen_ready', { screen: 'chat', hasSession: Boolean(session) });
    void reloadHistory().catch((err) => {
      captureError(err, { phase: 'chat_reload_history' });
      setError(chatUi.loadHistoryFailed);
    });
  }, [chatUi.loadHistoryFailed, isFocused, reloadHistory, session]);

  useEffect(() => {
    if (!session) {
      trackEvent('auth_gate_seen', { surface: 'chat', guestModeEnabled });
    }
  }, [guestModeEnabled, session]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (event) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });

    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(() => {
    if (!audioSound) return;
    return () => {
      void audioSound.unloadAsync().catch(() => undefined);
    };
  }, [audioSound]);

  useEffect(() => {
    return () => {
      clearRecordingTimers();
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
      }
      if (audioSound) {
        void audioSound.unloadAsync().catch(() => undefined);
      }
    };
  }, [audioSound, clearRecordingTimers]);

  useEffect(() => {
    if (!loading || loadingPhase !== 'sending') return;
    const timer = setTimeout(() => setLoadingPhase('thinking'), 220);
    return () => clearTimeout(timer);
  }, [loading, loadingPhase]);

  useEffect(() => {
    if (!loading || loadingPhase !== 'thinking') return;
    if (activeRequestMode !== 'deep') {
      setDeepThinkingPhaseIndex(0);
      return;
    }

    setDeepThinkingPhaseIndex(0);
    const timer = setInterval(() => {
      setDeepThinkingPhaseIndex((prev) => Math.min(prev + 1, CHAT_DEEP_THINKING_PHASES.length - 1));
    }, 2000);

    return () => clearInterval(timer);
  }, [activeRequestMode, loading, loadingPhase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      threadRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length, loadingPhase, activeSessionId]);

  useEffect(() => {
    if (activeSurface !== 'messageActions') {
      setSelectedAssistantMessage(null);
    }
  }, [activeSurface]);

  const pickMediaAttachment = async (source: 'camera' | 'library') => {
    setError('');

    if (source === 'camera') {
      const cameraPermission = await ensureCameraPermission();
      if (!cameraPermission.granted) {
        setError(chatUi.cameraPermission);
        return;
      }
    } else {
      const mediaPermission = await ensureMediaLibraryPermission();
      if (!mediaPermission.granted) {
        setError(chatUi.libraryPermission);
        return;
      }
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      allowsEditing: false,
      base64: true,
      quality: 0.55,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
    };

    const response = source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (response.canceled || !response.assets.length) return;
    const asset = response.assets[0];

    let base64 = asset.base64 || '';
    if (!base64 && asset.uri) {
      base64 = await readBase64FromUri(asset.uri);
    }
    if (!base64) {
      setError(chatUi.readAttachmentFailed);
      return;
    }

    const byteSize = estimateBase64ByteSize(base64);
    if (byteSize > MAX_ATTACHMENT_BYTES) {
      setError(chatUi.attachmentTooLarge);
      return;
    }

    const isVideo = asset.type === 'video';
    setDraftAttachment({
      kind: isVideo ? 'video' : 'image',
      fileName: isVideo ? `video-${Date.now()}.mp4` : `image-${Date.now()}.jpg`,
      mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
      base64,
    });
  };

  const pickDocumentAttachment = async () => {
    setError('');

    const response = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['*/*'],
    });

    if (response.canceled || !response.assets.length) return;
    const asset = response.assets[0];

    const base64 = await readBase64FromUri(asset.uri);
    const byteSize = estimateBase64ByteSize(base64);
    if (byteSize > MAX_ATTACHMENT_BYTES) {
      setError(chatUi.attachmentTooLarge);
      return;
    }

    let kind: ChatAttachmentKind = 'file';
    const mime = asset.mimeType || 'application/octet-stream';
    if (mime.startsWith('audio/')) kind = 'audio';
    else if (mime === 'application/pdf') kind = 'pdf';
    else if (mime.startsWith('text/')) kind = 'txt';
    else if (mime.startsWith('image/')) kind = 'image';
    else if (mime.startsWith('video/')) kind = 'video';

    let textContent: string | undefined;
    if (kind === 'txt') {
      try {
        textContent = await new FileSystem.File(asset.uri).text();
      } catch {
        textContent = undefined;
      }
    }

    setDraftAttachment({
      kind,
      fileName: asset.name || `file-${Date.now()}`,
      mimeType: mime,
      base64,
      textContent,
    });
  };

  const applyInputLimit = useCallback((nextValue: string) => {
    const normalized = nextValue.replace(/\r\n/g, '\n');
    if (normalized.length > CHAT_INPUT_MAX_CHARS) {
      setInput(normalized.slice(0, CHAT_INPUT_MAX_CHARS));
      setInputLimitNotice(buildChatInputLimitMessage(CHAT_INPUT_MAX_CHARS, webT.chatInputTooLong));
      return;
    }
    setInput(normalized);
    setInputLimitNotice('');
  }, []);

  const updateAgentProfileDraft = useCallback((patch: Partial<AgentProfileMemory>) => {
    setMemoryStatus(chatCopy.helpers.unsavedChanges);
    setAgentProfile((current) => normalizeAgentProfileMemory({
      ...current,
      ...patch,
    }));
  }, []);

  const persistAgentProfile = useCallback(async (patch: Partial<AgentProfileMemory>) => {
    setMemorySaving(true);
    try {
      const next = await saveAgentProfileMemory(session?.user.id, {
        ...patch,
        assistantName: patch.assistantName || agentProfile.assistantName || 'Baristachaw',
        userDisplayName: patch.userDisplayName || agentProfile.userDisplayName || session?.user.name,
        preferredLanguage: patch.preferredLanguage || agentProfile.preferredLanguage || DEFAULT_LANGUAGE,
      });
      setAgentProfile(next);
      setSavedAgentProfile(next);
      setMemoryStatus(chatCopy.helpers.savedLocally);
      return next;
    } finally {
      setMemorySaving(false);
    }
  }, [agentProfile, session?.user.id, session?.user.name]);

  const forgetAgentProfile = useCallback(async () => {
    setMemorySaving(true);
    try {
      const next = await resetAgentProfileMemory(session?.user.id, {
        preferredLanguage: DEFAULT_LANGUAGE,
        assistantName: 'Baristachaw',
        userDisplayName: session?.user.name,
      });
      setAgentProfile(next);
      setSavedAgentProfile(next);
      setMemoryStatus(chatCopy.helpers.resetLocalDefaults);
      return next;
    } finally {
      setMemorySaving(false);
    }
  }, [session?.user.id, session?.user.name]);

  const buildRequestPayload = useCallback((
    sourceText: string,
    responseMode: ResponseMode,
    historyMessages: Array<Pick<ChatMessageRecord, 'role' | 'text'>>,
    profileOverride?: AgentProfileMemory,
  ) => {
    const boundedSourceText = clampChatPayloadText(sourceText);
    const effectiveAgentProfile = normalizeAgentProfileMemory(profileOverride || agentProfile);
    const acceptLanguage = localeState.locale;
    const appLanguage = localeState.language;
    const conversationContext = buildConversationContext({
      messages: historyMessages,
      summary: activeSession?.summary,
      preferredLanguage: activeSession?.preferredResponseLanguage || effectiveAgentProfile.preferredLanguage,
      sessionTitle: activeSession?.title,
      recentCount: 10,
      latestUserText: boundedSourceText,
      mode: responseMode,
    });
    const resolved = buildResponseOrchestration(boundedSourceText, responseMode, undefined, {
      platform: 'mobile',
      appLanguage,
      acceptLanguage,
    }, conversationContext, effectiveAgentProfile);

    return {
      responseProfile: {
        language: resolved.language,
        verbosity: resolved.expectation.verbosity,
        format: resolved.expectation.format,
        tone: resolved.expectation.tone,
        ambiguityPolicy: resolved.expectation.ambiguityPolicy,
      },
      clientContext: {
        platform: 'mobile' as const,
        appLanguage,
        acceptLanguage,
        surface: 'chat' as const,
      },
      conversationContext: {
        ...conversationContext,
        preferredLanguage: resolved.language,
      },
      agentProfile: effectiveAgentProfile,
    };
  }, [activeSession?.preferredResponseLanguage, activeSession?.summary, activeSession?.title, agentProfile, localeState.language, localeState.locale]);

  const runAssistantResponse = async (
    userText: string,
    attachment?: DraftAttachment,
    historyMessages: Array<Pick<ChatMessageRecord, 'role' | 'text'>> = messages,
    requestPayloadOverride?: ReturnType<typeof buildRequestPayload>,
  ): Promise<AssistantResponsePayload> => {
    const boundedUserText = clampChatPayloadText(userText);
    const responseMode = toResponseMode(mode);
    const requestPayload = requestPayloadOverride || buildRequestPayload(boundedUserText, responseMode, historyMessages);
    const runBalancedResponse = async (
      sourceText: string,
      payloadOverride?: ReturnType<typeof buildRequestPayload>,
    ): Promise<AssistantResponsePayload> => {
      const boundedSourceText = clampChatPayloadText(sourceText);
      const payload = payloadOverride || requestPayload;
      try {
        const response = await apiClient.runAiAction('balanced', boundedSourceText, payload);
        const text = response.text?.trim() || '';
        if (response.ok === false || !text) {
          throw new Error(response.error || response.details || 'balanced_unavailable');
        }
        return {
          text,
          provider: response.provider,
          degraded: response.degraded,
          details: response.details,
          preferredLanguage: payload.conversationContext?.preferredLanguage,
        };
      } catch (error) {
        const fallbackText = await apiClient.sendChatWithProfile(boundedSourceText, 'race', payload);
        return {
          text: fallbackText.trim() || noResponseReturned,
          provider: 'chat_race',
          degraded: true,
          details: `balanced_fallback:${error instanceof Error ? error.message : 'request_failed'}`,
          preferredLanguage: payload.conversationContext?.preferredLanguage,
        };
      }
    };
    const runDeepFallback = async (
      sourceText: string,
      reason: string,
      payloadOverride?: ReturnType<typeof buildRequestPayload>,
    ): Promise<AssistantResponsePayload> => {
      const boundedSourceText = clampChatPayloadText(sourceText);
      const fallbackPayload = payloadOverride || requestPayload;
      const fallbackText = await apiClient.sendChatWithProfile(boundedSourceText, 'race', fallbackPayload);
      return {
        text: fallbackText.trim() || noResponseReturned,
        provider: 'chat_race',
        degraded: true,
        details: `deep_fallback:${reason}`,
        deepMeta: {
          mode: 'deep',
          grounded: false,
          degraded: true,
          fallbackUsed: true,
          qualityPass: true,
          latencyMs: 0,
          sourceCount: 0,
        },
        preferredLanguage: fallbackPayload.conversationContext?.preferredLanguage,
      };
    };

    if (attachment) {
      const styledPrompt = appendAttachmentResponseStyle(
        buildAttachmentSmartPrompt(attachment.kind, attachment.fileName, boundedUserText),
        mode,
      );

      if (attachment.kind === 'txt' && attachment.textContent) {
        const response = await apiClient.runAiAction('analyze_text', styledPrompt, {
          textContent: attachment.textContent,
          ...requestPayload,
        });
        return {
          text: response.text?.trim() || response.error || noResponseReturned,
          preferredLanguage: requestPayload.conversationContext?.preferredLanguage,
        };
      }

      if (attachment.kind === 'audio') {
        const transcript = await apiClient.runAiAction('transcribe', 'Please transcribe this audio accurately.', {
          image: attachment.base64,
          mimeType: attachment.mimeType,
          ...requestPayload,
        });
        const transcriptText = transcript.text?.trim() || transcript.error || '';
        if (transcriptText) {
          const followupPrompt = clampChatPayloadText(`[Transcribed voice] ${transcriptText}`);
          const followupProfilePatch = extractDurablePreferenceUpdates(followupPrompt, agentProfile);
          const followupProfile = Object.keys(followupProfilePatch).length
            ? await persistAgentProfile(followupProfilePatch)
            : agentProfile;
          const followupPayload = buildRequestPayload(followupPrompt, responseMode, [
            ...historyMessages,
            { role: 'user', text: followupPrompt },
          ], followupProfile);
          if (mode === 'normal') {
            return runBalancedResponse(followupPrompt, followupPayload);
          }
          const action = mode === 'fast' ? 'fast' : 'deep_think';
          let enriched;
          try {
            enriched = await apiClient.runAiAction(action, followupPrompt, followupPayload);
          } catch (error) {
            if (action === 'deep_think') {
              return runDeepFallback(
                followupPrompt,
                error instanceof Error ? error.message : 'request_failed',
                followupPayload,
              );
            }
            throw error;
          }
          if (action === 'deep_think') {
            if (enriched.ok === false) {
              return runDeepFallback(
                followupPrompt,
                enriched.error || enriched.details || 'deep_unavailable',
                followupPayload,
              );
            }
            const sourceDetails = Array.isArray(enriched.sources)
              ? enriched.sources.filter((source) => typeof source?.uri === 'string' && source.uri.trim().length > 0)
              : [];
            return {
              text: enriched.text?.trim() || enriched.error || transcriptText,
              provider: enriched.provider,
              degraded: enriched.degraded,
              details: enriched.details,
              sourceDetails,
              deepMeta: enriched.deepMeta,
              preferredLanguage: followupPayload.conversationContext?.preferredLanguage,
            };
          }
          return {
            text: enriched.text?.trim() || enriched.error || transcriptText,
            preferredLanguage: followupPayload.conversationContext?.preferredLanguage,
          };
        }
      }

      const response = await apiClient.runAiAction('analyze_attachment', styledPrompt, {
        image: attachment.base64,
        mimeType: attachment.mimeType,
        ...requestPayload,
      });
      return {
        text: response.text?.trim() || response.error || noResponseReturned,
        preferredLanguage: requestPayload.conversationContext?.preferredLanguage,
      };
    }

    if (mode === 'normal') {
      return runBalancedResponse(boundedUserText, requestPayload);
    }

    const action = mode === 'fast' ? 'fast' : 'deep_think';
    let response;
    try {
      response = await apiClient.runAiAction(action, boundedUserText, requestPayload);
    } catch (error) {
      if (action === 'deep_think') {
        return runDeepFallback(boundedUserText, error instanceof Error ? error.message : 'request_failed');
      }
      throw error;
    }
    if (action !== 'deep_think') {
      return {
        text: response.text?.trim() || response.error || noResponseReturned,
        preferredLanguage: requestPayload.conversationContext?.preferredLanguage,
      };
    }
    if (response.ok === false) {
      return runDeepFallback(boundedUserText, response.error || response.details || 'deep_unavailable');
    }
    const sourceDetails = Array.isArray(response.sources)
      ? response.sources.filter((source) => typeof source?.uri === 'string' && source.uri.trim().length > 0)
      : [];
    return {
      text: response.text?.trim() || response.error || noResponseReturned,
      provider: response.provider,
      degraded: response.degraded,
      details: response.details,
      sourceDetails,
      deepMeta: response.deepMeta,
      preferredLanguage: requestPayload.conversationContext?.preferredLanguage,
    };
  };

  const sendMessage = async () => {
    if (!session) {
      setError(chatUi.signInForChatTools);
      return;
    }

    if (!isOnline) {
      setError(chatUi.offlineSend);
      return;
    }

    const text = input.trim();
    if (!text && !draftAttachment) return;
    if (text.length > CHAT_INPUT_MAX_CHARS) {
      setInputLimitNotice(buildChatInputLimitMessage(CHAT_INPUT_MAX_CHARS, webT.chatInputTooLong));
      return;
    }

    const sessionId = activeSessionId || (await createChatSession(titleFromInput(text))).id;
    if (!activeSessionId) {
      setActiveSessionId(sessionId);
    }

    const userMessageText = text || `[Attachment] ${draftAttachment?.fileName || 'file'}`;
    const nextConversationMessages = [...messages, { role: 'user' as const, text: userMessageText }];
    const profilePatch = extractDurablePreferenceUpdates(text, agentProfile);
    const effectiveAgentProfile = Object.keys(profilePatch).length
      ? await persistAgentProfile(profilePatch)
      : agentProfile;
    const requestPayload = buildRequestPayload(
      userMessageText,
      toResponseMode(mode),
      nextConversationMessages,
      effectiveAgentProfile,
    );
    const preferredLanguage = requestPayload.conversationContext?.preferredLanguage;
    const userMessage = await appendMessage({
      sessionId,
      role: 'user',
      text: userMessageText,
      attachments: draftAttachment
        ? [{
          id: genId('att'),
          kind: draftAttachment.kind,
          fileName: draftAttachment.fileName,
          mimeType: draftAttachment.mimeType,
          sizeBytes: estimateBase64ByteSize(draftAttachment.base64),
          inlineBase64: draftAttachment.base64,
        }]
        : undefined,
      transcriptText: draftAttachment?.textContent,
    }, {
      preferredLanguage,
    });

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setInputLimitNotice('');
    setSavedLast(false);
    setLoading(true);
    setLoadingPhase('sending');
    setActiveRequestMode(mode);
    setDeepThinkingPhaseIndex(0);
    setError('');

    try {
      const assistantResponse = await runAssistantResponse(
        text,
        draftAttachment || undefined,
        nextConversationMessages,
        requestPayload,
      );
      setLoadingPhase('rendering');
      const deepMeta = assistantResponse.deepMeta
        ? {
            ...assistantResponse.deepMeta,
            degraded: assistantResponse.deepMeta.degraded || Boolean(assistantResponse.degraded),
          }
        : (mode === 'deep'
          ? {
              mode: 'deep' as const,
              grounded: Boolean(assistantResponse.sourceDetails?.length),
              degraded: Boolean(assistantResponse.degraded),
              fallbackUsed: Boolean(assistantResponse.degraded),
              qualityPass: !assistantResponse.degraded,
              latencyMs: 0,
              sourceCount: assistantResponse.sourceDetails?.length || 0,
            }
          : undefined);
      const assistant = await appendMessage({
        sessionId,
        role: 'assistant',
        text: assistantResponse.text,
        provider: assistantResponse.provider,
        sources: assistantResponse.sourceDetails?.map((source) => source.uri),
        sourceDetails: assistantResponse.sourceDetails,
        deepMeta,
      }, {
        preferredLanguage: assistantResponse.preferredLanguage || preferredLanguage,
      });

      if (assistantResponse.degraded || deepMeta?.degraded) {
        trackEvent('degraded_response_seen', {
          surface: 'chat',
          provider: assistantResponse.provider || 'unknown',
          sourceCount: assistantResponse.sourceDetails?.length || 0,
          details: assistantResponse.details || 'degraded',
        });
      }

      trackEvent('action_succeeded', {
        action: 'chat_send_message',
        mode,
        hasAttachment: Boolean(draftAttachment),
      });

      setMessages((prev) => [...prev, assistant]);
      setDraftAttachment(null);
      await reloadHistory(sessionId);
    } catch (err) {
      captureError(err, { phase: 'chat_send_message' });
      trackEvent('action_failed', {
        action: 'chat_send_message',
        mode,
        errorCode: err instanceof ApiError ? err.errorCode || 'api_error' : 'unknown',
      });
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : chatUi.sendFailed);
      }
    } finally {
      setLoading(false);
      setLoadingPhase('idle');
      setActiveRequestMode(null);
      setDeepThinkingPhaseIndex(0);
    }
  };

  const saveAssistantMessage = async (message: ChatMessageRecord) => {
    if (!message.text.trim()) return;
    await onSaveToCollection({
      title: message.sessionId === activeSessionId ? (activeSession?.title || 'Chat Insight') : 'Chat Insight',
      markdown: message.text,
      source: 'chat',
      sessionId: message.sessionId,
      messageId: message.id,
      sources: message.sources || message.sourceDetails?.map((source) => source.uri),
    });
    if (lastAssistantMessage?.id === message.id) {
      setSavedLast(true);
    }
    await hapticSuccess();
  };

  const shareAssistantMessage = async (message: ChatMessageRecord) => {
    if (!message.text.trim()) return;
    await Share.share({
      title: chatUi.shareTitle,
      message: message.text,
    });
  };

  const createSessionFromInput = async () => {
    const normalizedTitle = titleFromInput(newSessionTitle);
    const reusableSession = isReusableDraftSession(activeSession) ? activeSession : null;
    if (reusableSession) {
      if (normalizedTitle && normalizedTitle !== reusableSession.title) {
        await renameChatSession(reusableSession.id, normalizedTitle);
      }
      setNewSessionTitle('');
      await reloadHistory(reusableSession.id);
      return;
    }

    const created = await createChatSession(normalizedTitle);
    setNewSessionTitle('');
    await reloadHistory(created.id);
  };

  const onSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    const nextMessages = await listMessagesForSession(sessionId);
    setMessages(nextMessages);
    setActiveSurface('none');
  };

  const handleRenameSession = async (sessionId: string) => {
    await renameChatSession(sessionId, sessionRenameValue);
    setRenamingSessionId('');
    setSessionRenameValue('');
    await reloadHistory(sessionId);
  };

  const handleRenameFolder = async (folderId: string) => {
    await renameChatFolder(folderId, folderRenameValue);
    setRenamingFolderId('');
    setFolderRenameValue('');
    await reloadHistory(activeSessionId);
  };

  const generateImage = async () => {
    if (!session) {
      setError(chatUi.signInForImages);
      return;
    }

    if (!isOnline) {
      setError(chatUi.offlineImages);
      return;
    }

    const prompt = imgPrompt.trim();
    if (!prompt) return;

    setImgLoading(true);
    setError('');

    try {
      const response = await apiClient.runAiAction('generate_image', `High quality professional coffee photography. ${prompt}`);
      if (!response.imageDataUrl) {
        throw new Error('Image generation returned no image.');
      }

      setGeneratedImages((prev) => [{ id: genId('img'), prompt, imageDataUrl: response.imageDataUrl! }, ...prev]);
      setImgPrompt('');
      await hapticSuccess();
    } catch (err) {
      captureError(err, { phase: 'chat_generate_image' });
      setError(err instanceof Error ? err.message : webT.connectionFailed);
    } finally {
      setImgLoading(false);
    }
  };

  const useGeneratedImage = (entry: { prompt: string; imageDataUrl: string }) => {
    const [, meta = '', payload = ''] = entry.imageDataUrl.match(/^data:(.*?);base64,(.*)$/) || [];
    if (!payload) {
      setError(chatUi.generatedImageReuseFailed);
      return;
    }
    if (estimateBase64ByteSize(payload) > MAX_ATTACHMENT_BYTES) {
      setError(chatUi.attachmentTooLarge);
      return;
    }

    setDraftAttachment({
      kind: 'image',
      fileName: `generated-${Date.now()}.png`,
      mimeType: meta || 'image/png',
      base64: payload,
    });
    setInput((current) => {
      const next = current || entry.prompt;
      if (next.length > CHAT_INPUT_MAX_CHARS) {
        setInputLimitNotice(buildChatInputLimitMessage(CHAT_INPUT_MAX_CHARS, webT.chatInputTooLong));
        return next.slice(0, CHAT_INPUT_MAX_CHARS);
      }
      setInputLimitNotice('');
      return next;
    });
    setActiveSurface('none');
  };

  const playTts = async (message: ChatMessageRecord) => {
    if (!message.text.trim()) return;

    if (!isOnline) {
      setError(chatUi.offlineSpeech);
      return;
    }

    try {
      if (audioSound) {
        await audioSound.stopAsync();
        await audioSound.unloadAsync();
        setAudioSound(null);
      }

      if (playingMessageId === message.id) {
        setPlayingMessageId(null);
        return;
      }

      setPlayingMessageId(message.id);
      const response = await apiClient.runAiAction('generate_speech', message.text);
      const audioDataUrl = response.audioDataUrl;

      if (!audioDataUrl) {
        throw new Error('Speech generation returned no audio.');
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioDataUrl },
        { shouldPlay: true },
      );

      setAudioSound(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || status.didJustFinish) {
          setPlayingMessageId(null);
        }
      });
    } catch (err) {
      captureError(err, { phase: 'chat_tts' });
      setPlayingMessageId(null);
      setError(err instanceof Error ? err.message : webT.connectionFailed);
    }
  };

  const playVoiceAttachment = useCallback(async (message: ChatMessageRecord) => {
    const audioUri = resolveAttachmentAudioUri(message);
    if (!audioUri) {
      setError(chatUi.voiceUnavailable);
      return;
    }

    try {
      if (audioSound) {
        await audioSound.stopAsync();
        await audioSound.unloadAsync();
        setAudioSound(null);
      }

      if (playingMessageId === message.id) {
        setPlayingMessageId(null);
        return;
      }

      setPlayingMessageId(message.id);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
      );

      setAudioSound(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || status.didJustFinish) {
          setPlayingMessageId(null);
        }
      });
    } catch (err) {
      captureError(err, { phase: 'chat_play_voice_attachment' });
      setPlayingMessageId(null);
      setError(err instanceof Error ? err.message : webT.connectionFailed);
    }
  }, [audioSound, playingMessageId]);

  const openSourceLink = async (uri: string) => {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (!canOpen) {
        setError(chatUi.openSourceUnsupported);
        return;
      }
      await Linking.openURL(uri);
    } catch (err) {
      captureError(err, { phase: 'chat_open_source', uri });
      setError(chatUi.openSourceFailed);
    }
  };

  const stopVoiceRecording = useCallback(async () => {
    if (recordingStoppingRef.current) return;
    const activeRecording = recordingRef.current;
    if (!activeRecording) return;

    recordingStoppingRef.current = true;
    clearRecordingTimers();

    try {
      await activeRecording.stopAndUnloadAsync();
    } catch {
      // Ignore stop races.
    }

    recordingRef.current = null;
    setIsVoiceRecording(false);

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch {
      // no-op
    }

    try {
      const uri = activeRecording.getURI();
      if (!uri) {
        setError(chatUi.voiceEmpty);
        return;
      }

      const base64 = await readBase64FromUri(uri);
      const byteSize = estimateBase64ByteSize(base64);
      if (byteSize > MAX_ATTACHMENT_BYTES) {
        setError(chatUi.voiceTooLarge);
        return;
      }

      setDraftAttachment({
        kind: 'audio',
        fileName: `voice-${Date.now()}.m4a`,
        mimeType: 'audio/m4a',
        base64,
      });
      await hapticSuccess();
    } catch (err) {
      captureError(err, { phase: 'chat_voice_stop' });
      setError(chatUi.voiceProcessFailed);
    } finally {
      setVoiceElapsedMs(0);
      recordingStoppingRef.current = false;
    }
  }, [clearRecordingTimers]);

  const startVoiceRecording = useCallback(async () => {
    if (!session) {
      setError(chatUi.signInForVoice);
      return;
    }

    if (!isOnline) {
      setError(chatUi.offlineVoice);
      return;
    }

    if (isVoiceRecording || recordingRef.current) {
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError(chatUi.microphonePermission);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      recordingStartRef.current = Date.now();
      setVoiceElapsedMs(0);
      setIsVoiceRecording(true);
      setError('');
      trackEvent('feature_used', { feature: 'chat_voice_start' });
      await hapticImpactLight();

      recordingTickRef.current = setInterval(() => {
        setVoiceElapsedMs(Math.max(0, Date.now() - recordingStartRef.current));
      }, 240);

      recordingAutoStopRef.current = setTimeout(() => {
        void stopVoiceRecording();
      }, CHAT_VOICE_NOTE_MAX_DURATION_MS);
    } catch (err) {
      captureError(err, { phase: 'chat_voice_start' });
      trackEvent('action_failed', {
        action: 'chat_voice_start',
        errorCode: err instanceof Error ? err.message : 'voice_start_failed',
      });
      setIsVoiceRecording(false);
      setVoiceElapsedMs(0);
      clearRecordingTimers();
      setError(err instanceof Error ? err.message : chatUi.startRecordingFailed);
    }
  }, [clearRecordingTimers, isOnline, isVoiceRecording, session, stopVoiceRecording]);

  const toggleVoiceRecording = useCallback(async () => {
    if (isVoiceRecording) {
      await stopVoiceRecording();
      return;
    }
    await startVoiceRecording();
  }, [isVoiceRecording, startVoiceRecording, stopVoiceRecording]);

  const handleComposerLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.height;
    if (measured > 0 && Math.abs(measured - composerHeight) > 2) {
      setComposerHeight(measured);
    }
  }, [composerHeight]);

  const openHistory = useCallback(() => setActiveSurface('history'), []);
  const openTools = useCallback(() => setActiveSurface('tools'), []);
  const openMemory = useCallback(() => setActiveSurface('memory'), []);
  const openImageStudio = useCallback(() => setActiveSurface('imageStudio'), []);
  const closeSurface = useCallback(() => setActiveSurface('none'), []);

  const launchToolAction = useCallback((action: () => void) => {
    setActiveSurface('none');
    action();
  }, []);

  const selectedMessageSources = useMemo(() => {
    if (!selectedAssistantMessage) return [];
    if (Array.isArray(selectedAssistantMessage.sourceDetails) && selectedAssistantMessage.sourceDetails.length > 0) {
      return selectedAssistantMessage.sourceDetails;
    }
    return (selectedAssistantMessage.sources || [])
      .filter((uri): uri is string => typeof uri === 'string' && /^https?:\/\//i.test(uri))
      .map((uri) => ({ uri, title: undefined, domain: undefined }));
  }, [selectedAssistantMessage]);

  const memoryDirty = useMemo(
    () => snapshotMemory(agentProfile) !== snapshotMemory(savedAgentProfile),
    [agentProfile, savedAgentProfile],
  );

  const memorySummary = useMemo(() => [
    agentProfile.preferredLanguage ? chatCopy.helpers.languageSummary(agentProfile.preferredLanguage) : chatCopy.helpers.languageAuto,
    agentProfile.detailPreference ? chatCopy.helpers.detailSummary(agentProfile.detailPreference) : chatCopy.helpers.adaptiveDetail,
    agentProfile.responseStyle ? chatCopy.helpers.formatSummary(agentProfile.responseStyle) : chatCopy.helpers.flexibleFormat,
    agentProfile.tonePreference ? chatCopy.helpers.toneSummary(agentProfile.tonePreference) : chatCopy.helpers.neutralTone,
  ].join(' • '), [agentProfile]);
  const memoryIdentitySummary = useMemo(() => [
    agentProfile.preferredLanguage ? agentProfile.preferredLanguage.toUpperCase() : chatCopy.helpers.languageAuto,
    agentProfile.userDisplayName ? chatCopy.helpers.callYou(agentProfile.userDisplayName) : chatCopy.helpers.defaultName,
    agentProfile.assistantName ? agentProfile.assistantName : chatCopy.helpers.defaultAssistantName,
  ].join(' • '), [agentProfile.assistantName, agentProfile.preferredLanguage, agentProfile.userDisplayName]);
  const memoryReplySummary = useMemo(() => [
    agentProfile.detailPreference || chatCopy.helpers.adaptiveDetail,
    agentProfile.responseStyle || chatCopy.helpers.flexibleFormat,
    agentProfile.tonePreference || chatCopy.helpers.neutralTone,
  ].join(' • '), [agentProfile.detailPreference, agentProfile.responseStyle, agentProfile.tonePreference]);
  const memoryWorkflowSummary = useMemo(() => [
    agentProfile.workspaceRole || chatCopy.helpers.noWorkspaceRole,
    agentProfile.workflowFocus || chatCopy.helpers.noWorkflowFocus,
    agentProfile.skillFocus?.length
      ? `Skill focus: ${MEMORY_SKILL_OPTIONS
          .filter((option) => agentProfile.skillFocus?.includes(option.value))
          .map((option) => option.label)
          .join(', ')}`
      : 'No skill focus',
    agentProfile.styleNotes ? chatCopy.helpers.styleNoteSaved : chatCopy.helpers.noStyleNotes,
  ].join(' • '), [agentProfile.skillFocus, agentProfile.styleNotes, agentProfile.workflowFocus, agentProfile.workspaceRole]);
  const memoryGuardrailSummary = useMemo(() => [
    agentProfile.emojiPolicy || chatCopy.helpers.defaultEmoji,
    (agentProfile.blockedWords?.length || 0) > 0 ? chatCopy.helpers.blockedWordsCount(agentProfile.blockedWords?.length || 0) : chatCopy.helpers.noBlockedWords,
  ].join(' • '), [agentProfile.blockedWords, agentProfile.emojiPolicy]);
  const toggleMemorySection = useCallback((section: MemorySection) => {
    setOpenMemorySection((current) => (current === section ? null : section));
  }, []);

  const deepRequestInFlight = loading && activeRequestMode === 'deep';
  const deepThinkingLabel = CHAT_DEEP_THINKING_PHASES[Math.min(deepThinkingPhaseIndex, CHAT_DEEP_THINKING_PHASES.length - 1)];
  const composerBottomOffset = computeComposerBottomOffset({
    insetsBottom: insets.bottom,
    keyboardHeight,
    keyboardVisible,
    dockedInset: keyboardVisible ? 0 : 74,
  });
  const listBottomPadding = composerBottomOffset + composerHeight + 28;

  const headerSubtitle = useMemo(() => {
    if (!session) return chatCopy.header.signedOut;
    if (!isOnline) return chatCopy.header.offline;
    if (activeSession?.preview) return buildBodyPreview(activeSession.preview, 92);
    return chatCopy.header.ready;
  }, [activeSession?.preview, chatCopy.header, isOnline, session]);
  const composerDisabled = loading || !isOnline || !session;

  const statusCard = useMemo(() => {
    if (error) {
      return {
        tone: 'warning' as const,
        title: chatCopy.status.needsAttention,
        subtitle: error,
      };
    }
    if (!session) {
      return {
        tone: 'accent' as const,
        title: CHAT_PARITY.emptyGuestTitle,
        subtitle: chatCopy.status.signedOutBody,
      };
    }
    if (!isOnline) {
      return {
        tone: 'warning' as const,
        title: chatCopy.status.offlineTitle,
        subtitle: chatCopy.status.offlineBody,
      };
    }
    if (savedLast) {
      return {
        tone: 'success' as const,
        title: chatCopy.status.savedTitle,
        subtitle: chatCopy.status.savedBody,
      };
    }
    if (!messages.length) {
      return {
        tone: 'subtle' as const,
        title: CHAT_PARITY.emptyTitle,
        subtitle: CHAT_PARITY.emptyText,
      };
    }
    return null;
  }, [chatCopy.status, error, isOnline, messages.length, savedLast, session]);

  const attachmentPreviewItems = useMemo(() => {
    if (!draftAttachment) return [];
    return [{
      key: draftAttachment.fileName,
      label: draftAttachment.fileName,
      icon: <Ionicons name={attachmentIconName(draftAttachment.kind)} size={uiTokens.icon.xs} color={uiTokens.text.secondary} />,
      onRemove: () => setDraftAttachment(null),
    }];
  }, [draftAttachment]);
  const newSessionActionLabel = isReusableDraftSession(activeSession) ? chatUi.reuseDraft : chatUi.create;

  const renderMessage = useCallback(({ item }: { item: ChatMessageRecord }) => {
    const assistantMessage = item.role !== 'user';
    const sourceCount = item.sourceDetails?.length || item.sources?.length || 0;
    const hasVoiceAttachment = Boolean(resolveAttachmentAudioUri(item));

    return (
      <View style={[styles.messageRow, assistantMessage ? styles.messageRowStart : styles.messageRowEnd]}>
        <View style={[styles.messageBubble, assistantMessage ? styles.assistantBubble : styles.userBubble]}>
          <View style={styles.messageMeta}>
            <Text style={[styles.messageAuthor, assistantMessage ? styles.assistantAuthor : styles.userAuthor]}>
              {assistantMessage ? CHAT_PARITY.title : chatCopy.helpers.you}
            </Text>
            <Text style={[styles.messageTime, assistantMessage ? styles.assistantTime : styles.userTime]}>
              {formatMessageTimestamp(item.timestamp)}
            </Text>
          </View>

          <Text style={[styles.messageText, assistantMessage ? styles.assistantText : styles.userText]}>
            {item.text}
          </Text>

          {item.attachments?.length ? (
            <View style={styles.attachmentChipRow}>
              {item.attachments.map((attachment) => (
                <InfoPill
                  key={attachment.id}
                  label={attachment.fileName}
                  tone={assistantMessage ? 'neutral' : 'accent'}
                  style={styles.inlinePill}
                />
              ))}
            </View>
          ) : null}

          {item.transcriptText ? (
            <Text style={[styles.messageNote, assistantMessage ? styles.assistantNote : styles.userNote]}>
              {chatCopy.helpers.transcriptAttached}
            </Text>
          ) : null}

          {!assistantMessage && hasVoiceAttachment ? (
            <View style={styles.messageActions}>
              <ActionButton
                label={playingMessageId === item.id ? chatCopy.helpers.stopVoice : chatCopy.helpers.playVoice}
                tone="ghost"
                compact
                onPress={() => void playVoiceAttachment(item)}
              />
            </View>
          ) : null}

          {assistantMessage ? (
            <View style={styles.messageActions}>
              {sourceCount > 0 ? <Text style={styles.messageActionMeta}>{chatCopy.helpers.sourcesCount(sourceCount)}</Text> : null}
              {item.deepMeta?.mode === 'deep' ? <Text style={styles.messageActionMeta}>{chatUi.deep}</Text> : null}
              <ActionButton
                label={playingMessageId === item.id ? chatCopy.helpers.stopAudio : chatCopy.helpers.playAudio}
                tone="ghost"
                compact
                onPress={() => void playTts(item)}
              />
              <ActionButton
                label={chatCopy.helpers.more}
                tone="ghost"
                compact
                onPress={() => {
                  setSelectedAssistantMessage(item);
                  setActiveSurface('messageActions');
                }}
              />
            </View>
          ) : null}
        </View>
      </View>
    );
  }, [chatCopy.helpers.more, chatCopy.helpers.playAudio, chatCopy.helpers.playVoice, chatCopy.helpers.sourcesCount, chatCopy.helpers.stopAudio, chatCopy.helpers.stopVoice, chatUi.deep, playTts, playVoiceAttachment, playingMessageId]);

  return (
    <>
      <AppShell
        scrollable={false}
        header={(
          <HeroHeader
            eyebrow={CHAT_PARITY.title}
            title={activeSession?.title || CHAT_PARITY.title}
            subtitle={headerSubtitle}
            direction={direction}
            status={(
              <InfoPill label={modeItems.find((item) => item.value === mode)?.label || CHAT_PARITY.modes.normal} tone="accent" />
            )}
            trailing={(
              <Pressable style={styles.headerAction} onPress={openHistory}>
                <Ionicons name="albums-outline" size={uiTokens.icon.md} color={uiTokens.colors.accent} />
              </Pressable>
            )}
          />
        )}
        contentStyle={styles.shellContent}
      >
        <View style={styles.threadStage}>
          {statusCard ? (
            <SectionCard tone={statusCard.tone} title={statusCard.title} subtitle={statusCard.subtitle} compact />
          ) : null}

          <SegmentedControl items={modeItems} value={mode} onChange={setMode} direction={direction} />

          <View style={styles.threadFrame}>
            <FlatList
              ref={threadRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.threadListContent, { paddingBottom: listBottomPadding }]}
              ItemSeparatorComponent={() => <View style={styles.threadSeparator} />}
              ListEmptyComponent={(
                <SectionCard
                  tone="subtle"
                  title={!session && guestModeEnabled ? CHAT_PARITY.emptyGuestTitle : CHAT_PARITY.emptyTitle}
                  subtitle={!session && guestModeEnabled ? CHAT_PARITY.emptyGuestText : CHAT_PARITY.emptyText}
                  compact
                />
              )}
              ListFooterComponent={loading ? (
                <SectionCard
                  tone="accent"
                  compact
                  title={deepRequestInFlight ? chatCopy.helpers.deepThinking : chatCopy.helpers.preparingResponse}
                  subtitle={deepRequestInFlight ? deepThinkingLabel : chatCopy.helpers.preparingNextMessage}
                >
                  {deepRequestInFlight ? (
                    <View style={styles.thinkingDots}>
                      {CHAT_DEEP_THINKING_PHASES.map((phase, idx) => (
                        <View
                          key={phase}
                          style={[
                            styles.thinkingDot,
                            idx <= deepThinkingPhaseIndex ? styles.thinkingDotActive : null,
                          ]}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={uiTokens.colors.accent} />
                      <Text style={styles.loadingText}>
                        {loadingPhase === 'sending' ? chatCopy.helpers.sendingMessage : chatCopy.helpers.processingRequest}
                      </Text>
                    </View>
                  )}
                </SectionCard>
              ) : <View style={styles.footerSpacer} />}
            />
          </View>
        </View>
      </AppShell>

      <View
        onLayout={handleComposerLayout}
        style={[
          styles.composerWrap,
          {
            bottom: composerBottomOffset,
            left: Math.max(uiTokens.spacing.page, insets.left + 10),
            right: Math.max(uiTokens.spacing.page, insets.right + 10),
          },
        ]}
      >
        <ComposerDock
          value={input}
          onChangeText={applyInputLimit}
          onSend={() => void sendMessage()}
          attachments={attachmentPreviewItems}
          busy={loading}
          error={error || undefined}
          helperText={inputLimitNotice || (input.length >= CHAT_INPUT_WARNING_CHARS ? chatCopy.helpers.nearSafeLimit : undefined)}
          helperTone={inputLimitNotice || input.length >= CHAT_INPUT_WARNING_CHARS ? 'warning' : 'default'}
          characterLimit={CHAT_INPUT_MAX_CHARS}
          placeholder={webT.typeMessage}
          sendLabel={chatCopy.helpers.sendMessage}
          recordingState={isVoiceRecording ? { label: chatCopy.helpers.recordingVoiceNote(formatElapsed(voiceElapsedMs)), onPress: () => { void toggleVoiceRecording(); } } : null}
          canSend={Boolean(input.trim() || draftAttachment)}
          menuAction={{
            onPress: openTools,
            accessibilityLabel: chatCopy.helpers.openChatTools,
            icon: <Ionicons name="add" size={uiTokens.icon.sm} color={uiTokens.text.primary} />,
            disabled: composerDisabled,
          }}
          voiceAction={{
            onPress: () => { void toggleVoiceRecording(); },
            accessibilityLabel: isVoiceRecording ? chatCopy.helpers.stopRecordingVoiceNote : chatCopy.helpers.recordVoiceNote,
            icon: (
              <Ionicons
                name={isVoiceRecording ? 'stop-circle-outline' : 'mic-outline'}
                size={uiTokens.icon.sm}
                color={isVoiceRecording ? uiTokens.colors.warning : uiTokens.text.primary}
              />
            ),
            active: isVoiceRecording,
            disabled: composerDisabled,
          }}
        />
      </View>

      <ResultSheet
        visible={activeSurface === 'history'}
        direction={direction}
        title={webT.chatHistory}
        subtitle={chatCopy.sheets.historySubtitle}
        onClose={closeSurface}
        content={(
          <View style={styles.sheetStack}>
            <SectionCard title={webT.newChat} subtitle={chatCopy.sheets.newChatSubtitle} compact>
              <View style={styles.inlineInputRow}>
                <TextInput
                  value={newSessionTitle}
                  onChangeText={setNewSessionTitle}
                  placeholder={chatCopy.sheets.renameSessionPlaceholder}
                  placeholderTextColor={uiTokens.text.muted}
                  style={styles.sheetInput}
                />
                <ActionButton label={newSessionActionLabel} tone="primary" onPress={() => void createSessionFromInput()} />
              </View>
            </SectionCard>

            <SectionCard title={chatCopy.sheets.sessionsTitle} subtitle={chatCopy.sheets.sessionsSubtitle} compact>
              <View style={styles.historyList}>
                {sessions.map((item) => (
                  <View key={item.id} style={[styles.sessionCard, item.id === activeSessionId ? styles.sessionCardActive : null]}>
                    <Pressable onPress={() => void onSelectSession(item.id)} style={styles.sessionHeader}>
                      <View style={styles.sessionCopy}>
                        <Text style={styles.sessionTitle}>{item.title}</Text>
                        <Text style={styles.sessionPreview}>{item.preview || chatCopy.sheets.emptySessionPreview}</Text>
                      </View>
                      {item.id === activeSessionId ? <InfoPill label={chatCopy.helpers.open} tone="accent" style={styles.inlinePill} /> : null}
                    </Pressable>

                    {renamingSessionId === item.id ? (
                      <View style={styles.inlineInputRow}>
                        <TextInput
                          value={sessionRenameValue}
                          onChangeText={setSessionRenameValue}
                          placeholder={chatCopy.sheets.renameSessionPlaceholder}
                          placeholderTextColor={uiTokens.text.muted}
                          style={styles.sheetInput}
                        />
                        <ActionButton label={chatCopy.helpers.save} tone="primary" onPress={() => void handleRenameSession(item.id)} />
                      </View>
                    ) : (
                      <View style={styles.inlineButtonRow}>
                        <ActionButton
                          label={chatCopy.helpers.rename}
                          tone="ghost"
                          compact
                          onPress={() => {
                            setRenamingSessionId(item.id);
                            setSessionRenameValue(item.title);
                          }}
                        />
                        <ActionButton
                          label={chatCopy.helpers.delete}
                          tone="danger"
                          compact
                          onPress={() => void softDeleteChatSession(item.id).then(() => reloadHistory(activeSessionId))}
                        />
                      </View>
                    )}

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderChipRow}>
                      <Pressable
                        style={[styles.folderChip, !item.folderId ? styles.folderChipActive : null]}
                        onPress={() => void moveChatSession(item.id, undefined).then(() => reloadHistory(item.id))}
                      >
                        <Text style={[styles.folderChipText, !item.folderId ? styles.folderChipTextActive : null]}>{chatCopy.helpers.noFolder}</Text>
                      </Pressable>
                      {folders.map((folder) => (
                        <Pressable
                          key={folder.id}
                          style={[styles.folderChip, item.folderId === folder.id ? styles.folderChipActive : null]}
                          onPress={() => void moveChatSession(item.id, folder.id).then(() => reloadHistory(item.id))}
                        >
                          <Text style={[styles.folderChipText, item.folderId === folder.id ? styles.folderChipTextActive : null]}>{folder.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ))}
              </View>
            </SectionCard>

            <SectionCard title={chatCopy.sheets.foldersTitle} subtitle={chatCopy.sheets.foldersSubtitle} compact>
              <View style={styles.inlineInputRow}>
                <TextInput
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  placeholder={chatCopy.sheets.folderNamePlaceholder}
                  placeholderTextColor={uiTokens.text.muted}
                  style={styles.sheetInput}
                />
                <ActionButton
                  label={chatCopy.helpers.add}
                  tone="primary"
                  onPress={() => void createChatFolder(newFolderName).then(() => {
                    setNewFolderName('');
                    return reloadHistory(activeSessionId);
                  })}
                />
              </View>

              {folders.length > 0 ? (
                <View style={styles.historyList}>
                  {folders.map((folder) => (
                    <View key={folder.id} style={styles.folderManagerCard}>
                      {renamingFolderId === folder.id ? (
                        <View style={styles.inlineInputRow}>
                          <TextInput
                            value={folderRenameValue}
                            onChangeText={setFolderRenameValue}
                            placeholder={chatCopy.sheets.renameFolderPlaceholder}
                            placeholderTextColor={uiTokens.text.muted}
                            style={styles.sheetInput}
                          />
                          <ActionButton label={chatCopy.helpers.save} tone="primary" onPress={() => void handleRenameFolder(folder.id)} />
                        </View>
                      ) : (
                        <View style={styles.folderManagerHeader}>
                          <View style={styles.folderManagerCopy}>
                            <Text style={styles.sessionTitle}>{folder.name}</Text>
                            <Text style={styles.sessionPreview}>
                              {chatCopy.helpers.sessionsCount(sessions.filter((sessionItem) => sessionItem.folderId === folder.id).length)}
                            </Text>
                          </View>
                          <View style={styles.inlineButtonRow}>
                            <ActionButton
                              label={chatCopy.helpers.rename}
                              tone="ghost"
                              compact
                              onPress={() => {
                                setRenamingFolderId(folder.id);
                                setFolderRenameValue(folder.name);
                              }}
                            />
                            <ActionButton
                              label={chatCopy.helpers.delete}
                              tone="danger"
                              compact
                              onPress={() => void softDeleteChatFolder(folder.id).then(() => reloadHistory(activeSessionId))}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.sheetHint}>{chatCopy.helpers.noFoldersYet}</Text>
              )}
            </SectionCard>
          </View>
        )}
      />

      <ResultSheet
        visible={activeSurface === 'tools'}
        direction={direction}
        title={chatCopy.sheets.workspaceTitle}
        subtitle={chatCopy.sheets.workspaceSubtitle}
        onClose={closeSurface}
        content={(
          <View style={styles.sheetStack}>
            <SectionCard title={chatCopy.sheets.attachTitle} subtitle={chatCopy.sheets.attachSubtitle} compact>
              <View style={styles.inlineButtonRow}>
                <ActionButton label={chatCopy.helpers.gallery} tone="ghost" compact onPress={() => launchToolAction(() => { void pickMediaAttachment('library'); })} />
                <ActionButton label={chatCopy.helpers.camera} tone="ghost" compact onPress={() => launchToolAction(() => { void pickMediaAttachment('camera'); })} />
                <ActionButton label={chatCopy.helpers.files} tone="ghost" compact onPress={() => launchToolAction(() => { void pickDocumentAttachment(); })} />
              </View>
            </SectionCard>

            <SectionCard title={chatCopy.sheets.createTitle} subtitle={chatCopy.sheets.createSubtitle} compact>
              <View style={styles.inlineButtonRow}>
                <ActionButton label={isVoiceRecording ? chatCopy.helpers.stopVoiceNote(formatElapsed(voiceElapsedMs)) : chatCopy.helpers.voiceNote} tone="ghost" compact onPress={() => launchToolAction(() => { void toggleVoiceRecording(); })} />
                <ActionButton label={chatCopy.helpers.image} tone="ghost" compact onPress={openImageStudio} />
              </View>
            </SectionCard>

            <SectionCard title={chatCopy.sheets.memoryTitle} subtitle={chatCopy.sheets.memorySubtitle} compact>
              <View style={styles.inlineButtonRow}>
                <ActionButton label={chatCopy.helpers.openMemory} tone="ghost" compact onPress={openMemory} />
                <ActionButton label={chatCopy.helpers.useIndonesian} tone="ghost" compact onPress={() => launchToolAction(() => { void persistAgentProfile({ preferredLanguage: 'id' }); })} />
                <ActionButton label={chatCopy.helpers.beConcise} tone="ghost" compact onPress={() => launchToolAction(() => { void persistAgentProfile({ detailPreference: 'short' }); })} />
              </View>
            </SectionCard>

            <SectionCard title={chatCopy.sheets.latestReplyTitle} subtitle={chatCopy.sheets.latestReplySubtitle} compact>
              <View style={styles.inlineButtonRow}>
                <ActionButton
                  label={savedLast ? CHAT_PARITY.savedLastResponse : CHAT_PARITY.saveLastResponse}
                  tone="ghost"
                  compact
                  onPress={() => launchToolAction(() => {
                    if (lastAssistantMessage) {
                      void saveAssistantMessage(lastAssistantMessage);
                    }
                  })}
                  disabled={!lastAssistantMessage}
                />
                <ActionButton
                  label={CHAT_PARITY.shareLastResponse}
                  tone="ghost"
                  compact
                  onPress={() => launchToolAction(() => {
                    if (lastAssistantMessage) {
                      void shareAssistantMessage(lastAssistantMessage);
                    }
                  })}
                  disabled={!lastAssistantMessage}
                />
              </View>
            </SectionCard>

            <SectionCard title={chatCopy.sheets.goToTitle} subtitle={chatCopy.sheets.goToSubtitle} compact>
              <View style={styles.inlineButtonRow}>
                <ActionButton label={webT.scanner} tone="ghost" compact onPress={() => launchToolAction(() => navigation.navigate('Scanner'))} />
                <ActionButton label={webT.collection} tone="ghost" compact onPress={() => launchToolAction(() => navigation.navigate('Collection'))} />
                <ActionButton label={webT.tools} tone="ghost" compact onPress={() => launchToolAction(() => navigation.navigate('Tools'))} />
              </View>
            </SectionCard>
          </View>
        )}
      />

      <ResultSheet
        visible={activeSurface === 'memory'}
        direction={direction}
        title={chatCopy.sheets.memoryTitle}
        subtitle={chatCopy.sheets.memorySubtitle}
        onClose={closeSurface}
        content={(
          <View style={styles.sheetStack}>
            <SectionCard compact>
              <Text style={styles.sheetBodyText}>{memorySummary}</Text>
              <View style={styles.memoryMetaStack}>
                <Text style={[styles.memoryMetaText, memoryDirty ? styles.memoryMetaWarning : styles.memoryMetaSuccess]}>
                  {memoryDirty ? chatCopy.helpers.unsavedChanges : chatCopy.helpers.savedLocally}
                </Text>
                <Text style={styles.memoryMetaText}>{memoryStatus}</Text>
                <Text style={styles.memoryMetaText}>{formatMemoryUpdatedAt(savedAgentProfile.updatedAt, chatUi.notSavedYet, chatUi.updated)}</Text>
              </View>
            </SectionCard>

            <SectionCard title={chatCopy.sheets.quickActionsTitle} subtitle={chatCopy.sheets.quickActionsSubtitle} compact>
              <View style={styles.inlineButtonRow}>
                <ActionButton label={chatCopy.helpers.useIndonesian} tone={agentProfile.preferredLanguage === 'id' ? 'primary' : 'secondary'} compact style={agentProfile.preferredLanguage === 'id' ? undefined : styles.memoryChoiceButtonMuted} onPress={() => void persistAgentProfile({ preferredLanguage: 'id' })} />
                <ActionButton label={chatCopy.helpers.useEnglish} tone={agentProfile.preferredLanguage === 'en' ? 'primary' : 'secondary'} compact style={agentProfile.preferredLanguage === 'en' ? undefined : styles.memoryChoiceButtonMuted} onPress={() => void persistAgentProfile({ preferredLanguage: 'en' })} />
                <ActionButton label={chatCopy.helpers.beConcise} tone={agentProfile.detailPreference === 'short' ? 'primary' : 'secondary'} compact style={agentProfile.detailPreference === 'short' ? undefined : styles.memoryChoiceButtonMuted} onPress={() => void persistAgentProfile({ detailPreference: 'short' })} />
                <ActionButton label={chatCopy.helpers.beDetailed} tone={agentProfile.detailPreference === 'comprehensive' ? 'primary' : 'secondary'} compact style={agentProfile.detailPreference === 'comprehensive' ? undefined : styles.memoryChoiceButtonMuted} onPress={() => void persistAgentProfile({ detailPreference: 'comprehensive' })} />
              </View>
            </SectionCard>

            <SectionCard title={chatCopy.sheets.identityTitle} subtitle={memoryIdentitySummary} compact>
              <Pressable style={styles.memorySectionTrigger} onPress={() => toggleMemorySection('identity')}>
                <Text style={styles.memorySectionTriggerLabel}>{openMemorySection === 'identity' ? chatCopy.helpers.hideOptions : chatCopy.helpers.showOptions}</Text>
                <Ionicons name={openMemorySection === 'identity' ? 'chevron-down' : 'chevron-forward'} size={uiTokens.icon.sm} color={uiTokens.text.secondary} />
              </Pressable>
              {openMemorySection === 'identity' ? (
                <View style={styles.memorySectionBody}>
                  <TextInput value={agentProfile.userDisplayName || ''} onChangeText={(value) => updateAgentProfileDraft({ userDisplayName: value })} placeholder={chatCopy.helpers.yourName} placeholderTextColor={uiTokens.text.muted} style={styles.sheetInput} />
                  <TextInput value={agentProfile.assistantName || ''} onChangeText={(value) => updateAgentProfileDraft({ assistantName: value })} placeholder={chatCopy.helpers.assistantName} placeholderTextColor={uiTokens.text.muted} style={styles.sheetInput} />
                  <View style={styles.inlineButtonRow}>
                    {memoryLanguageItems.map((item) => (
                      <ActionButton
                        key={item.value}
                        label={item.label}
                        tone={agentProfile.preferredLanguage === item.value ? 'primary' : 'secondary'}
                        compact
                        style={agentProfile.preferredLanguage === item.value ? undefined : styles.memoryChoiceButtonMuted}
                        onPress={() => updateAgentProfileDraft({ preferredLanguage: item.value })}
                      />
                    ))}
                  </View>
                  <TextInput value={agentProfile.preferredLanguage || ''} onChangeText={(value) => updateAgentProfileDraft({ preferredLanguage: value })} placeholder={webT.chatLanguageCodePlaceholder || chatCopy.helpers.customLanguageCode} placeholderTextColor={uiTokens.text.muted} style={styles.sheetInput} />
                </View>
              ) : null}
            </SectionCard>

            <SectionCard title={chatCopy.sheets.replyDefaultsTitle} subtitle={memoryReplySummary} compact>
              <Pressable style={styles.memorySectionTrigger} onPress={() => toggleMemorySection('reply')}>
                <Text style={styles.memorySectionTriggerLabel}>{openMemorySection === 'reply' ? chatCopy.helpers.hideOptions : chatCopy.helpers.showOptions}</Text>
                <Ionicons name={openMemorySection === 'reply' ? 'chevron-down' : 'chevron-forward'} size={uiTokens.icon.sm} color={uiTokens.text.secondary} />
              </Pressable>
              {openMemorySection === 'reply' ? (
                <View style={styles.memorySectionBody}>
                  <View style={styles.inlineButtonRow}>
                    {memoryDetailItems.map((item) => (
                      <ActionButton
                        key={item.value}
                        label={item.label}
                        tone={agentProfile.detailPreference === item.value ? 'primary' : 'secondary'}
                        compact
                        style={agentProfile.detailPreference === item.value ? undefined : styles.memoryChoiceButtonMuted}
                        onPress={() => updateAgentProfileDraft({ detailPreference: item.value })}
                      />
                    ))}
                  </View>
                  <View style={styles.inlineButtonRow}>
                    {memoryFormatItems.map((item) => (
                      <ActionButton
                        key={item.value}
                        label={item.label}
                        tone={agentProfile.responseStyle === item.value ? 'primary' : 'secondary'}
                        compact
                        style={agentProfile.responseStyle === item.value ? undefined : styles.memoryChoiceButtonMuted}
                        onPress={() => updateAgentProfileDraft({ responseStyle: item.value })}
                      />
                    ))}
                  </View>
                  <View style={styles.inlineButtonRow}>
                    {memoryToneItems.map((item) => (
                      <ActionButton
                        key={item.value}
                        label={item.label}
                        tone={agentProfile.tonePreference === item.value ? 'primary' : 'secondary'}
                        compact
                        style={agentProfile.tonePreference === item.value ? undefined : styles.memoryChoiceButtonMuted}
                        onPress={() => updateAgentProfileDraft({ tonePreference: item.value })}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </SectionCard>

            <SectionCard title={chatCopy.sheets.workflowTitle} subtitle={memoryWorkflowSummary} compact>
              <Pressable style={styles.memorySectionTrigger} onPress={() => toggleMemorySection('workflow')}>
                <Text style={styles.memorySectionTriggerLabel}>{openMemorySection === 'workflow' ? chatCopy.helpers.hideOptions : chatCopy.helpers.showOptions}</Text>
                <Ionicons name={openMemorySection === 'workflow' ? 'chevron-down' : 'chevron-forward'} size={uiTokens.icon.sm} color={uiTokens.text.secondary} />
              </Pressable>
              {openMemorySection === 'workflow' ? (
                <View style={styles.memorySectionBody}>
                  <TextInput value={agentProfile.workspaceRole || ''} onChangeText={(value) => updateAgentProfileDraft({ workspaceRole: value })} placeholder={chatCopy.helpers.workspaceRole} placeholderTextColor={uiTokens.text.muted} style={styles.sheetInput} />
                  <TextInput value={agentProfile.workflowFocus || ''} onChangeText={(value) => updateAgentProfileDraft({ workflowFocus: value })} placeholder={chatCopy.helpers.workflowFocus} placeholderTextColor={uiTokens.text.muted} style={styles.sheetInput} />
                  <View style={styles.inlineButtonRow}>
                    {MEMORY_SKILL_OPTIONS.map((item) => {
                      const active = Boolean(agentProfile.skillFocus?.includes(item.value));
                      return (
                        <ActionButton
                          key={item.value}
                          label={item.label}
                          tone={active ? 'primary' : 'secondary'}
                          compact
                          style={active ? undefined : styles.memoryChoiceButtonMuted}
                          onPress={() => {
                            const next = new Set(agentProfile.skillFocus || []);
                            if (next.has(item.value)) next.delete(item.value);
                            else next.add(item.value);
                            updateAgentProfileDraft({ skillFocus: [...next] });
                          }}
                        />
                      );
                    })}
                  </View>
                  <TextInput value={agentProfile.styleNotes || ''} onChangeText={(value) => updateAgentProfileDraft({ styleNotes: value })} placeholder={chatCopy.helpers.styleNotes} placeholderTextColor={uiTokens.text.muted} style={styles.sheetMultilineInput} multiline />
                </View>
              ) : null}
            </SectionCard>

            <SectionCard title={chatCopy.sheets.guardrailsTitle} subtitle={memoryGuardrailSummary} compact>
              <Pressable style={styles.memorySectionTrigger} onPress={() => toggleMemorySection('guardrails')}>
                <Text style={styles.memorySectionTriggerLabel}>{openMemorySection === 'guardrails' ? chatCopy.helpers.hideOptions : chatCopy.helpers.showOptions}</Text>
                <Ionicons name={openMemorySection === 'guardrails' ? 'chevron-down' : 'chevron-forward'} size={uiTokens.icon.sm} color={uiTokens.text.secondary} />
              </Pressable>
              {openMemorySection === 'guardrails' ? (
                <View style={styles.memorySectionBody}>
                  <View style={styles.inlineButtonRow}>
                    {memoryEmojiItems.map((item) => (
                      <ActionButton
                        key={item.value}
                        label={item.label}
                        tone={agentProfile.emojiPolicy === item.value ? 'primary' : 'secondary'}
                        compact
                        style={agentProfile.emojiPolicy === item.value ? undefined : styles.memoryChoiceButtonMuted}
                        onPress={() => updateAgentProfileDraft({ emojiPolicy: item.value })}
                      />
                    ))}
                  </View>
                  <TextInput value={(agentProfile.blockedWords || []).join(', ')} onChangeText={(value) => updateAgentProfileDraft({ blockedWords: value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder={chatCopy.helpers.blockedWords} placeholderTextColor={uiTokens.text.muted} style={styles.sheetInput} />
                </View>
              ) : null}
            </SectionCard>

            <SectionCard title={chatCopy.sheets.applyChangesTitle} subtitle={chatCopy.sheets.applyChangesSubtitle} compact>
              <View style={styles.inlineButtonRow}>
                <ActionButton label={memorySaving ? chatCopy.helpers.saving : memoryDirty ? chatCopy.helpers.saveMemory : chatCopy.helpers.savedLocallyButton} tone="primary" compact onPress={() => void persistAgentProfile(agentProfile)} disabled={memorySaving || !memoryDirty} />
                <ActionButton label={chatCopy.helpers.reset} tone="danger" compact onPress={() => void forgetAgentProfile()} disabled={memorySaving} />
              </View>
            </SectionCard>
          </View>
        )}
      />

      <ResultSheet
        visible={activeSurface === 'imageStudio'}
        direction={direction}
        title={CHAT_PARITY.imageStudio}
        subtitle={chatCopy.sheets.imageStudioSubtitle}
        onClose={closeSurface}
        content={(
          <View style={styles.sheetStack}>
            <SectionCard title={chatCopy.sheets.generateImageTitle} subtitle={chatCopy.sheets.generateImageSubtitle} compact>
              <TextInput
                value={imgPrompt}
                onChangeText={setImgPrompt}
                placeholder={chatCopy.helpers.describeGeneratedImage}
                placeholderTextColor={uiTokens.text.muted}
                style={styles.sheetMultilineInput}
                multiline
              />
              <ActionButton label={imgLoading ? chatCopy.helpers.generating : chatCopy.helpers.generate} tone="primary" onPress={() => void generateImage()} disabled={imgLoading} />
            </SectionCard>

            {generatedImages.length > 0 ? (
              <View style={styles.generatedList}>
                {generatedImages.map((item) => (
                  <SectionCard key={item.id} title={item.prompt} compact>
                    <Image source={{ uri: item.imageDataUrl }} style={styles.generatedImage} resizeMode="cover" />
                    <View style={styles.inlineButtonRow}>
                      <ActionButton label={chatCopy.helpers.useInChat} tone="primary" compact onPress={() => useGeneratedImage(item)} />
                    </View>
                  </SectionCard>
                ))}
              </View>
            ) : (
              <SectionCard tone="subtle" title={chatCopy.helpers.noImagesYet} subtitle={chatCopy.helpers.noImagesSubtitle} compact>
                <Text style={styles.sheetHint}>{chatCopy.helpers.noImagesHint}</Text>
              </SectionCard>
            )}
          </View>
        )}
      />

      <ResultSheet
        visible={activeSurface === 'messageActions' && Boolean(selectedAssistantMessage)}
        direction={direction}
        title={chatCopy.helpers.messageActions}
        subtitle={selectedAssistantMessage ? formatMessageTimestamp(selectedAssistantMessage.timestamp) : undefined}
        onClose={closeSurface}
        actions={selectedAssistantMessage ? [
          {
            label: webT.saveToCollection,
            tone: 'primary',
            onPress: () => {
              void saveAssistantMessage(selectedAssistantMessage).then(() => setActiveSurface('none'));
            },
          },
          {
            label: chatUi.share,
            onPress: () => {
              void shareAssistantMessage(selectedAssistantMessage).then(() => setActiveSurface('none'));
            },
          },
          {
            label: playingMessageId === selectedAssistantMessage.id ? chatCopy.helpers.stopAudio : chatCopy.helpers.playAudio,
            onPress: () => {
              void playTts(selectedAssistantMessage);
            },
          },
        ] : []}
        content={selectedAssistantMessage ? (
          <View style={styles.sheetStack}>
              <SectionCard title={chatCopy.helpers.preview} subtitle={chatCopy.helpers.previewSubtitle} compact>
              <Text style={styles.sheetBodyText}>{buildBodyPreview(selectedAssistantMessage.text, 280)}</Text>
            </SectionCard>
            {selectedMessageSources.length > 0 ? (
              <SectionCard title={chatCopy.helpers.sources} subtitle={chatCopy.helpers.sourcesSubtitle} compact>
                <View style={styles.sourceList}>
                  {selectedMessageSources.map((source, index) => (
                    <Pressable key={`${source.uri}_${index}`} style={styles.sourceRow} onPress={() => void openSourceLink(source.uri)}>
                      <View style={styles.sourceCopy}>
                        <Text style={styles.sourceTitle}>{source.title?.trim() || source.domain || `Source ${index + 1}`}</Text>
                        <Text style={styles.sourceDomain}>{source.domain || source.uri}</Text>
                      </View>
                      <Ionicons name="arrow-forward-outline" size={uiTokens.icon.sm} color={uiTokens.colors.accent} />
                    </Pressable>
                  ))}
                </View>
              </SectionCard>
            ) : null}
          </View>
        ) : <View />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  shellContent: {
    flex: 1,
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: uiTokens.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: uiTokens.surface.strong,
    borderWidth: 1,
    borderColor: uiTokens.border.strong,
  },
  threadStage: {
    flex: 1,
    gap: uiTokens.spacing.block,
  },
  statusCopy: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  threadFrame: {
    flex: 1,
    borderRadius: uiTokens.radius.card,
    backgroundColor: uiTokens.surface.strong,
    borderWidth: 1,
    borderColor: uiTokens.border.strong,
    overflow: 'hidden',
    ...uiTokens.elevation.panel,
  },
  threadListContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 180,
    flexGrow: 1,
  },
  threadSeparator: {
    height: 18,
  },
  messageRow: {
    width: '100%',
  },
  messageRowStart: {
    justifyContent: 'flex-start',
  },
  messageRowEnd: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    width: '100%',
    maxWidth: '100%',
    paddingHorizontal: 2,
    paddingVertical: 2,
    gap: 8,
  },
  assistantBubble: {
    borderLeftWidth: 2,
    borderLeftColor: uiTokens.colors.accent,
    paddingLeft: 12,
  },
  userBubble: {
    borderLeftWidth: 2,
    borderLeftColor: uiTokens.border.strong,
    paddingLeft: 12,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  messageAuthor: {
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
    fontWeight: '600',
  },
  assistantAuthor: {
    color: uiTokens.text.secondary,
  },
  userAuthor: {
    color: uiTokens.colors.accent,
  },
  messageTime: {
    fontSize: uiTokens.typography.chip.fontSize,
    lineHeight: uiTokens.typography.chip.lineHeight,
  },
  assistantTime: {
    color: uiTokens.text.muted,
  },
  userTime: {
    color: uiTokens.text.muted,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  assistantText: {
    color: uiTokens.text.primary,
  },
  userText: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.medium,
  },
  attachmentChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  messageNote: {
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
    fontFamily: uiTokens.fontFamily.medium,
  },
  assistantNote: {
    color: uiTokens.text.secondary,
  },
  userNote: {
    color: uiTokens.text.secondary,
  },
  messageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  messageActionMeta: {
    color: uiTokens.text.muted,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  inlinePill: {
    alignSelf: 'flex-start',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  thinkingDot: {
    width: 18,
    height: 6,
    borderRadius: uiTokens.radius.pill,
    backgroundColor: uiTokens.border.strong,
  },
  thinkingDotActive: {
    width: 26,
    backgroundColor: uiTokens.colors.accent,
  },
  footerSpacer: {
    height: 6,
  },
  composerWrap: {
    position: 'absolute',
    zIndex: 20,
  },
  sheetStack: {
    gap: 12,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memoryMetaStack: {
    gap: 6,
    marginTop: 10,
  },
  memoryMetaText: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  memoryMetaSuccess: {
    color: uiTokens.colors.success,
  },
  memoryMetaWarning: {
    color: uiTokens.colors.warning,
  },
  memoryChoiceButtonMuted: {
    backgroundColor: 'transparent',
    borderColor: uiTokens.border.soft,
  },
  memorySectionTrigger: {
    minHeight: 44,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.soft,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  memorySectionTriggerLabel: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  memorySectionBody: {
    gap: 10,
  },
  sheetInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.strong,
    paddingHorizontal: 14,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  sheetMultilineInput: {
    minHeight: 94,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.strong,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
    textAlignVertical: 'top',
  },
  historyList: {
    gap: 10,
  },
  sessionCard: {
    borderRadius: uiTokens.radius.card,
    backgroundColor: uiTokens.surface.strong,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    padding: 14,
    gap: 10,
  },
  sessionCardActive: {
    borderColor: uiTokens.colors.accent,
    backgroundColor: uiTokens.surface.accent,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sessionCopy: {
    flex: 1,
    gap: 4,
  },
  sessionTitle: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.semibold,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
    fontWeight: '600',
  },
  sessionPreview: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  folderChipRow: {
    gap: 8,
  },
  folderChip: {
    minHeight: 32,
    borderRadius: uiTokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.soft,
    justifyContent: 'center',
  },
  folderChipActive: {
    borderColor: uiTokens.colors.accent,
    backgroundColor: uiTokens.surface.accent,
  },
  folderChipText: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
  folderChipTextActive: {
    color: uiTokens.colors.accent,
  },
  folderManagerCard: {
    borderRadius: uiTokens.radius.card,
    backgroundColor: uiTokens.surface.strong,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    padding: 14,
    gap: 10,
  },
  folderManagerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  folderManagerCopy: {
    flex: 1,
    gap: 4,
  },
  sheetHint: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  generatedList: {
    gap: 10,
  },
  generatedImage: {
    width: '100%',
    height: 180,
    borderRadius: uiTokens.radius.input,
    backgroundColor: uiTokens.surface.soft,
  },
  sheetBodyText: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight + 2,
  },
  sourceList: {
    gap: 8,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: uiTokens.radius.input,
    borderWidth: 1,
    borderColor: uiTokens.border.soft,
    backgroundColor: uiTokens.surface.strong,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sourceCopy: {
    flex: 1,
    gap: 4,
  },
  sourceTitle: {
    color: uiTokens.text.primary,
    fontFamily: uiTokens.fontFamily.medium,
    fontSize: uiTokens.typography.body.fontSize,
    lineHeight: uiTokens.typography.body.lineHeight,
  },
  sourceDomain: {
    color: uiTokens.text.secondary,
    fontFamily: uiTokens.fontFamily.regular,
    fontSize: uiTokens.typography.caption.fontSize,
    lineHeight: uiTokens.typography.caption.lineHeight,
  },
});
