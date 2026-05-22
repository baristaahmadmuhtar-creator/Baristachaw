export enum ViewState {
    HOME = 'HOME',
    BARISTA_TOOLS = 'BARISTA_TOOLS',
    RECIPE_GEN = 'RECIPE_GEN',
    BEAN_SCAN = 'BEAN_SCAN',
    CHAT = 'CHAT',
    SAVED = 'SAVED',
    SETTINGS = 'SETTINGS',
}

export type Language = 'en' | 'id' | 'ar' | 'zh' | 'ja' | 'ko' | 'th' | 'vi' | 'ms';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ChatEngine = 'default' | 'barista_claw';
export type ChatProfile = 'speed_default' | 'quality_strict';

export interface ProToolsSettings {
    baristaOps: boolean;
    scannerVision: boolean;
    sensoryStudio: boolean;
}

export interface AiSettings {
    name: string;
    proMode?: boolean;
    proPreset?: 'fast' | 'strict';
    proTools?: ProToolsSettings;
    chatEngine?: ChatEngine;
    tone: 'Professional' | 'Friendly' | 'Enthusiastic' | 'Sarcastic' | 'Free AI' | 'Free AI + Strict Agent';
    language: Language;
    kbEnabled?: boolean;
    kbTopK?: number;
}

export type AgentIntentMode = 'TEACH' | 'FIX' | 'BUILD' | 'CONSULT' | 'GEEK' | 'FAST';

export interface UserSkillProfile {
    extraction: number;
    espressoDialIn: number;
    manualBrewControl: number;
    sensory: number;
    milkTexturing: number;
    cafeWorkflow: number;
    confidence: number;
    evidenceCount: number;
    detectedLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface PersonalityEvolutionState {
    interactionCount: number;
    preferredCoachingStyle: 'direct' | 'mentor' | 'technical';
    detailTolerance: 'low' | 'medium' | 'high';
    frequentlyUsedBrewMethod?: string;
    commandUsage: Partial<Record<AgentIntentMode, number>>;
    lastIntentMode?: AgentIntentMode;
    adaptiveDepthBias: number;
    updatedAt: number;
}

export interface AgentBrainState {
    version: 2;
    profile: UserSkillProfile;
    evolution: PersonalityEvolutionState;
    updatedAt: number;
}

export interface AgentCalibration {
    schemaVersion?: 1 | 2;
    userName?: string;
    callName?: string;
    alternateName?: string;
    aiName?: string;
    preferredLanguage?: Language;
    timeZone?: string;
    responseStyle?: string;
    allowedEmojis: string[];
    blockedWords: string[];
    styleNotes?: string;
    onboardingAskedAt?: number;
    onboardingCompletedAt?: number;
    skippedAt?: number;
    lastIntentMode?: AgentIntentMode;
    interactionCount?: number;
    skillProfile?: UserSkillProfile;
    personalityEvolution?: PersonalityEvolutionState;
    updatedAt: number;
}

export type ChatMessageStatus = 'pending' | 'streaming' | 'sent' | 'error';

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

export type ChatAttachmentKind = 'image' | 'camera' | 'file' | 'audio';
export type ChatAttachmentStatus = 'draft' | 'sending' | 'sent' | 'error';
export type ChatAttachmentAiMode = 'smart_analyze' | 'transcribe' | 'caption_only';

export type ChatErrorCode =
    | 'NETWORK_INTERRUPTED'
    | 'IMAGE_TOO_LARGE'
    | 'INVALID_API_KEY'
    | 'AUTH_EXPIRED'
    | 'PROVIDER_UNAVAILABLE'
    | 'FEATURE_UNAVAILABLE'
    | 'QUOTA_EXCEEDED'
    | 'TIMEOUT'
    | 'UNKNOWN';

export interface AttachmentMeta {
    mimeType: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
    fileName?: string;
}

export interface ChatAttachment {
    id: string;
    kind: ChatAttachmentKind;
    mimeType: string;
    fileName: string;
    sizeBytes: number;
    status?: ChatAttachmentStatus;
    previewDataUrl?: string;
    objectUrl?: string; // runtime only, do not persist
    inlineBase64?: string;
    extractedText?: string;
    durationMs?: number;
    width?: number;
    height?: number;
    aiMode?: ChatAttachmentAiMode;
}

export interface ChatMessage {
    id: string;
    sessionId?: string;
    role: 'user' | 'model';
    text: string;
    image?: string;
    audioUrl?: string;
    attachments?: ChatAttachment[];
    transcriptText?: string;
    attachmentPrompt?: string;
    provider?: string;
    sources?: string[];
    sourceDetails?: StructuredSearchSource[];
    deepMeta?: DeepResponseMeta;
    timestamp: number;
    status?: ChatMessageStatus;
    errorCode?: ChatErrorCode;
    attachmentMeta?: AttachmentMeta;
    deletedAt?: number;
}

export interface ChatFolder {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number;
}

export interface ChatSession {
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

export type SavedChatSession = ChatSession;

export interface Folder {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    deletedAt?: number;
}

export type CollectionFolder = Folder;

export interface Ingredient {
    name: string;
    amount: string;
}

export type RecipeBrewStyle = 'espresso' | 'manual_brew' | 'milk_based' | 'cold_brew' | 'tea_based' | 'unknown';

export interface AiBrewRecipeStepMeta {
    id: string;
    label: string;
    kind?: string;
    startSeconds: number;
    targetVolumeMl: number;
    pourVolumeMl: number;
    flowRateMlPerSec?: [number, number];
    pourPath?: string;
    pourHeight?: string;
    agitationLevel?: string;
    hybridInstruction?: string;
}

export interface AiBrewRecipeMeta {
    planId: string;
    fingerprint: string;
    brewMode: 'hot' | 'iced';
    process: string;
    variety: string;
    roastLevel: string;
    beanAltitudeMasl?: number | null;
    beanDensityGml?: number | null;
    beanRoastDevelopment?: string;
    beanSolubility?: string;
    beanProfileSummary?: string;
    targetProfileId: string;
    targetProfileLabel: string;
    dripperId: string;
    dripperName: string;
    grinderId: string;
    grinderName: string;
    waterMode: 'brand' | 'manual';
    waterRegion: 'id' | 'sg' | 'bn' | 'my' | 'global';
    waterBrandId?: string;
    waterBrandLabel?: string;
    waterPresetStatus?: 'autofill' | 'manual_required' | 'info_only';
    waterPublishState?: 'published' | 'review_only' | 'rejected';
    waterIsBrewReady: boolean;
    waterBrewBlockReason: string[];
    waterBrandMarkets: Array<'id' | 'sg' | 'bn' | 'my' | 'global'>;
    waterBrandVerification?: 'official' | 'community_verified' | 'curated' | 'dataset_unverified' | 'fallback';
    waterBrandSourceUrls: string[];
    waterCustomized: boolean;
    waterStyleLabel: string;
    waterTdsPpm: number;
    waterHardnessPpm: number;
    waterAlkalinityPpm: number;
    deviceProfileId: string;
    deviceProfileLabel: string;
    deviceProfileMode: 'exact' | 'derived_template' | 'family_fallback';
    grindSettingReference: string;
    catalogVersion: string;
    totalTimeSeconds: number;
    totalWaterMl: number;
    hotWaterMl: number;
    iceMl: number;
    waterTempC: number;
    ratio: number;
    finalBeverageRatio?: number;
    hotExtractionRatio?: number;
    hotWaterSharePercent?: number;
    iceSharePercent?: number;
    warnings?: string[];
    confidenceNotes?: string[];
    extractionRationale?: {
        ratio: string;
        temperature: string;
        time: string;
        grind: string;
        pour: string;
        iceSplit?: string;
        beanPrecision: {
            summary: string;
            signals: string[];
        };
        warnings: string[];
    };
    steps: AiBrewRecipeStepMeta[];
}

export interface Recipe {
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
    brewStyle?: RecipeBrewStyle;
    aiBrew?: AiBrewRecipeMeta;
}

export interface CollectionItemBase {
    id: string;
    type: 'recipe' | 'ai_canvas';
    folderId?: string;
    title: string;
    content: unknown;
    sortOrder?: number;
    cardColor?: 'amber' | 'sky' | 'emerald' | 'rose' | 'slate';
    createdAt: number;
    updatedAt: number;
    deletedAt?: number;
}

export interface RecipeCollectionItem extends CollectionItemBase {
    type: 'recipe';
    content: Recipe;
}

export interface AiCanvasCollectionItem extends CollectionItemBase {
    type: 'ai_canvas';
    content: {
        markdown: string;
        prompt?: string;
        imageDataUrl?: string;
        kind?: 'recipe_sop' | 'brew_guide' | 'qa_context' | 'note' | 'latte_art';
        sessionId?: string;
        messageId?: string;
        sources?: string[];
    };
}

export type CollectionItem = RecipeCollectionItem | AiCanvasCollectionItem;

export type CollectionUpdateEntity = 'folder' | 'item' | 'recipe';
export type CollectionUpdateAction = 'create' | 'update' | 'delete' | 'move' | 'restore';

export interface CollectionUpdateEventDetail {
    entity: CollectionUpdateEntity;
    action: CollectionUpdateAction;
    id?: string;
    folderId?: string;
    itemType?: CollectionItem['type'];
    timestamp: number;
}

export interface BrewingGuide {
    method: string;
    dose: string;
    water: string;
    ratio: string;
    temperature: string;
    grindSize: string;
    totalTime: string;
    steps: string[];
}

export interface BeanAnalysis {
    objectCategory?: 'coffee_beans' | 'coffee_menu' | 'coffee_equipment' | 'non_coffee' | 'unknown';
    coffeeRelevance?: 'high' | 'medium' | 'low';
    beanTypeGuess?: string;
    primaryDisplayName?: string;
    nonCoffeeSummary?: string;
    roasterName?: string;
    beanName?: string;
    roastDate?: string;
    roastLevel: string;
    originGuess?: string;
    processGuess?: string;
    densityEstimate?: string;
    tastingNotes: string[];
    brewingGuides: BrewingGuide[];
    confidence: number;
}

