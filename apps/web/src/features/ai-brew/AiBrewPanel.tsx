import { lazy, Suspense, useDeferredValue, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  AlertTriangle,
  Beaker,
  Bookmark,
  BookmarkCheck,
  Brain,
  Check,
  ChevronDown,
  Clock3,
  Coffee,
  Droplets,
  FlaskConical,
  Gauge,
  Info,
  Loader2,
  Pause,
  Play,
  Search,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Target,
  Thermometer,
  RotateCcw,
  Waves,
  X,
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalState';
import { useAuthModal } from '../../context/AuthModalContext';
import { useNavbar } from '../../context/NavbarContext';
import { useAiAccessGate } from '../../components/billing/AiAccessGate';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useRuntimeDisplayMode } from '../../hooks/useRuntimeDisplayMode';
import { reportClientError } from '../../services/errorReporting';
import { createRecipeCollectionItem, saveCollectionItem, saveRecipe } from '../../services/storageService';
import type { Recipe } from '../../types';
import { buildDeterministicAiCoachMarkdown } from './coachNotes';
import { sanitizeBrewNarrative } from './antiHallucination';
import { sanitizeAiCoachMarkdown } from './coachGuard';
import { resolveWaterMineralCompletion } from './waterMineralCompletion';
import {
  composeHybridSequenceOverlay,
  extractSequenceOverlayFromMarkdown,
} from './aiComposer';
import { syncAiBrewLibraryToCloud } from './cloudSync';
import {
  buildAiBrewTasteLoopMarkdown,
  buildTasteFeedbackCorrection,
  resolveAiBrewActionPriorities,
} from './experience';
import {
  getSwitchDoseRows,
  getSwitchPresets,
  getSwitchSizeLabel,
  isExactHarioSwitchDripperId,
} from './switchPlanner.ts';
import {
  isIndonesianAiBrewLanguage,
  localizeAiBrewDynamicText,
  localizeAiBrewRoastLabel,
  localizeAiBrewStageLabel,
  localizeAiBrewStepLabel,
  localizeAiBrewSummary,
  localizeAiBrewTargetProfile,
  localizeAiBrewWaterClassificationLabel,
  localizeAiBrewWaterStyle,
} from './localization.ts';
import {
  AI_BREW_GENERATION_STAGES,
  buildAiBrewPlan,
  buildAiBrewPlanProgressively,
  buildBrewPlanRecipeSignature,
  buildWorkflowAwareGuideSteps,
  buildLocalizedPlanRecipeDescription,
  buildLocalizedPlanRecipeName,
  buildLocalizedPlanRecipeSteps,
  buildPlanMethodBrief,
  buildPlanRecipeIngredients,
  buildPlanRecipeMetadata,
  applyAiBrewOptimizationPatch,
  createDefaultAiBrewFormState,
  createQuickAiBrewFormState,
  loadPlanIntoForm,
  resolveDefaultTargetProfileIdForBean,
  resolveDeviceProfileSelection,
  resolveGrinderSettingReference,
  sanitizeAiBrewFormState,
  supportsAiBrewIcedMode,
  type AiBrewGenerationProgress,
  type AiBrewGenerationStageId,
} from './planner';
import {
  formatBrewerProfileTrustDetail,
  formatBrewerProfileTrustLabel,
  resolveBrewerProfileTrustStatus,
  type BrewerProfileTrustStatus,
} from './catalogTrust.ts';
import {
  deleteBrewPreset,
  findBrewPresetByFingerprint,
  listBrewPresets,
  listRecentBrewJournalEntries,
  loadAiBrewFormDraft,
  loadCachedAiBrewCatalogSnapshot,
  loadLastGeneratedBrewPlan,
  saveAiBrewFormDraft,
  saveBrewJournalEntry,
  saveBrewPreset,
  saveCachedAiBrewCatalogSnapshot,
  saveLastGeneratedBrewPlan,
  updateBrewJournalAiNotes,
  updateBrewJournalFeedback,
} from './storage';
import { loadAiBrewCatalog } from './catalog';
import type {
  AiBrewCatalog,
  AiBrewFormState,
  AiBrewMethodFamily,
  BrewJournalEntry,
  BrewPlan,
  BrewPreset,
  BrewTasteFeedback,
  BrewTasteFeedbackRating,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  VarietyCatalogEntry,
  VerificationLevel,
  WaterBrandProfile,
  WaterMode,
  WaterPresetStatus,
  AiBrewEngineMode,
  WorkflowGuideStep,
  WorkflowGuideTechniqueChip,
  SwitchPublicPreset,
  SwitchPublicPresetId,
} from './types';

const CUSTOM_ENTRY_ID = 'custom';
const OMITTED_ENTRY_ID = '__omitted__';
const AI_BREW_HYBRID_OPTIMIZATION_TIMEOUT_MS = 4500;
const AI_BREW_HYBRID_SEQUENCE_TIMEOUT_MS = 4500;
const AI_BREW_HYBRID_REPAIR_TIMEOUT_MS = 3500;
const AI_BREW_SEQUENCE_TRANSLATION_TIMEOUT_MS = 1200;
const AI_BREW_COACH_FAST_TIMEOUT_MS = 5000;
const AI_BREW_COACH_DEEP_TIMEOUT_MS = 8500;
const AI_BREW_COACH_TRANSLATION_TIMEOUT_MS = 1200;
const AI_BREW_FEEDBACK_NOTE_MAX_LENGTH = 240;
const AI_BREW_ASSIST_PROMPT_VERSION = 'assist-v2026-05-06';
const LARGE_CATALOG_PICKER_KINDS = new Set<NonNullable<PickerKind>>(['process', 'variety']);
const LARGE_CATALOG_INITIAL_LIMIT = 140;
const LARGE_CATALOG_SEARCH_LIMIT = 96;
const Markdown = lazy(async () => ({ default: (await import('react-markdown')).default }));
const COPY = {
  en: {
    title: 'AI Brew',
    subtitle: 'Clean manual brew planner.',
    coffeeTitle: 'Coffee Context',
    equipmentTitle: 'Peralatan',
    brewerCoreSection: 'Core brew methods',
    brewerSpecialtySection: 'Specialty drippers',
    brewerVerifiedBadge: 'Ready profile',
    waterTitle: 'Water Minerals',
    waterSourceTitle: 'Water Source',
    waterBrand: 'Brand',
    waterManual: 'Manual mineral',
    waterBrandPicker: 'Water',
    waterQuickPicks: 'Suggested',
    waterQuickPicksDescription: '',
    quickMode: 'Cepat',
    proMode: 'Presisi',
    quickModeDescription: 'Fast default recipe builder for a reliable first cup.',
    proModeDescription: '',
    quickModeTrustHint: 'Best for speed and consistency. If bean profile and water stay neutral, Quick and Pro can land on the same plan.',
    proModeTrustHint: '',
    pourControlTitle: 'Pour control',
    pourStyleTitle: 'Interval style',
    pourCountTitle: 'Pour count',
    pourStyleAuto: 'Auto',
    pourStyleBalanced: 'Balanced',
    pourStylePulse: 'Pulse',
    pourStyleGentle: 'Gentle',
    pourCountAuto: 'Auto',
    pourCount3: '3 pours',
    pourCount4: '4 pours',
    pourCount5: '5 pours',
    pourControlHint: '',
    methodOptionTitle: 'Method setup',
    origamiFilterTitle: 'Origami filter',
    origamiFilterAuto: 'Auto',
    origamiFilterCone: 'Cone',
    origamiFilterWave: 'Wave',
    aeropressStyleTitle: 'AeroPress style',
    aeropressStyleAuto: 'Auto',
    aeropressStyleStandard: 'Standard',
    aeropressStyleInverted: 'Inverted',
    aeropressStyleBypass: 'Bypass',
    aeropressStyleNoBypass: 'No bypass',
    aeropressStyleBrightClean: 'Bright clean',
    aeropressStyleSweetBody: 'Sweet body',
    precisionControlTitle: 'Precision targets',
    precisionControlHint: 'Optional. Filter brewers work best around 1:13-1:17; Auto picks a safe default from the brewer, roast, and target.',
    targetRatio: 'Ratio target',
    targetRatioPlaceholder: 'Auto',
    targetRatioHint: 'Manual filter range: 1:13-1:17. Leave Auto when you want BaristaChaw to choose per method.',
    targetWaterMl: 'Total water (ml)',
    targetWaterMlPlaceholder: 'Auto',
    targetTempC: 'Temperature (C)',
    targetTempCPlaceholder: 'Auto',
    quickBuilderTitle: 'Quick Builder',
    proBuilderTitle: 'Precision Builder',
    closeBuilder: 'Close builder',
    historyStripDescription: 'Reuse saved brews.',
    proDetails: 'Pro brew details',
    beanProfileTitle: 'Bean profile',
    beanProfileDescription: 'Optional.',
    beanProfileShow: 'Show bean profile',
    beanProfileHide: 'Hide bean profile',
    beanProfileNeutral: 'No bean-profile modifier active yet.',
    beanProfileActive: 'Bean profile active',
    altitudeMasl: 'Altitude (masl)',
    beanDensity: 'Bean density (g/ml)',
    roastDevelopmentTitle: 'Roast development',
    roastDevelopmentUnderdeveloped: 'Underdeveloped',
    roastDevelopmentBalanced: 'Balanced',
    roastDevelopmentDeveloped: 'Developed',
    solubilityTitle: 'Kelarutan',
    solubilityLow: 'Low',
    solubilityMedium: 'Medium',
    solubilityHigh: 'High',
    sourceDetailsTitle: 'Source details',
    sourceDetailsDescription: '',
    sourceDetailsShow: 'Show source details',
    sourceDetailsHide: 'Hide source details',
    beanInfluenceTitle: 'Bean influence',
    beanInfluenceInactive: 'Neutral bean profile',
    inputAnalysis: 'Input analysis',
    inputAnalysisDescription: '',
    waterReadyNow: 'Water ready',
    waterNeedsInput: 'Minerals needed',
    waterStatusReady: 'Ready',
    waterStatusManualRequired: 'Manual Required',
    waterStatusHighBuffer: 'High Buffer',
    waterStatusZeroMineral: 'Zero Mineral',
    waterStatusEstimated: 'Estimated',
    grindVerified: 'Verified grind reference',
    grindOfficialReference: 'Official reference',
    grindCuratedReference: 'Curated reference',
    grindCommunityReference: 'Community reference',
    grindEstimatedBaseline: 'Estimated baseline',
    grindCalibrationNote: 'Grinder settings depend on burr zero point, calibration, roast, and dose. Start here, then adjust by drawdown and taste.',
    grindFallback: 'Grind fallback',
    profileExactStatus: 'Exact device profile',
    profileFallbackStatus: 'Family fallback profile',
    processOptionalNote: 'Process is optional. No automatic process modifier will be applied.',
    varietyOptionalNote: 'Variety is optional. No automatic variety modifier will be applied.',
    profileTitle: 'Target Profile',
    modeHot: 'Hot Brew',
    modeIced: 'Ice Brew',
    modeCold: 'Cold Brew',
    modeEspresso: 'Espresso',
    coffeeName: 'Coffee / origin',
    coffeeNamePlaceholder: 'e.g. Ethiopia Chelbesa, Gayo Washed, House Filter',
    dose: 'Dose (g)',
    doseRangeHint: 'Recommended working dose: 10-20 g. AI keeps 15 g as the stable starting point per brewer.',
    process: 'Process',
    variety: 'Variety',
    roast: 'Roast level',
    dripper: 'Brewer',
    grinder: 'Grinder',
    tds: 'TDS (ppm)',
    hardness: 'Hardness (ppm as CaCO3)',
    alkalinity: 'Alkalinity (ppm as CaCO3)',
    waterNotes: 'Water notes',
    waterNotesPlaceholder: 'Optional source / remineralization notes',
    waterGuidance: 'Target',
    waterPresetStatus: 'Preset status',
    waterAutofill: 'Autofill',
    waterManualRequired: 'Manual required',
    waterInfoOnly: 'Info only',
    waterNeedsMinerals: 'Needs minerals',
    waterSelectedBrand: 'Selected brand',
    waterSelectedManual: 'Manual mineral',
    waterNoBrand: 'Choose water.',
    waterBrandNeedsManual: 'Add minerals before brew.',
    waterBrandPartialFilled: 'Complete missing minerals.',
    waterBrandEstimated: 'Estimated - verify manually',
    waterBrandEstimatedNote: 'Estimated values are only a placeholder. Verify manually before brewing.',
    waterBrandAutofilled: 'Minerals loaded from the selected brand profile.',
    waterBrandCustomized: 'Brand minerals were adjusted manually for this brew.',
    waterDerivationDirect: 'Direct label/lab data',
    waterDerivationDerived: 'Derived from Ca/Mg/HCO3',
    waterDerivationEstimated: 'Estimated from classification',
    waterDerivationManual: 'Manual mineral input',
    waterUseAsRoBase: 'Use as RO base; add minerals manually.',
    waterHighBufferWarning: 'High alkalinity/buffer can mute acidity and flatten floral coffees. Use lower contact time or choose manual minerals for delicate beans.',
    waterAlkalineWarning: 'Alkaline water can mute acidity. Verify manually before treating it as filter friendly.',
    waterCompleteMinerals: 'Complete minerals',
    waterCompleteMineralsHint: 'Fills missing fields from catalog data, partial brand chemistry, or a conservative classification baseline. It remains manual until verified.',
    waterCompleteMineralsApplied: 'Minerals completed. Review the notes, then generate.',
    waterCompleteMineralsUnavailable: 'Choose a water brand first.',
    waterCompleteMineralsRoNote: 'For RO/low-mineral water, this is a remineralization target, not the original label profile.',
    waterCompleteMineralsEstimatedNote: 'Classification baseline - verify manually before publishing this as a brand profile.',
    waterWhyManualTitle: 'Why manual?',
    waterWhyManualBody: 'Manual is required when the mineral panel is incomplete, estimated, too low-mineral, alkaline/high-buffer, or not backed by a trusted public source. This prevents false "ready brew" claims and bad recipes.',
    waterEditMinerals: 'Edit minerals',
    waterHideMinerals: 'Hide minerals',
    waterPresetIdealFilter: 'Ideal filter',
    waterPresetHighBuffer: 'High buffer',
    waterPresetLowMineral: 'Low mineral',
    waterSummary: 'Minerals',
    waterReadyBrew: 'Ready brew water',
    waterReadyBrewDescription: '',
    waterMarkets: 'Markets',
    waterSourceTab: 'Source',
    waterOpenBrandPicker: 'Choose water brand',
    waterNotSpecified: 'Not specified',
    otherProcess: 'Custom process',
    otherVariety: 'Custom variety',
    openPicker: 'Choose',
    generate: 'Generate',
    generating: 'Building brew',
    reset: 'Reset',
    recent: 'Recent Brews',
    favorites: 'Favorites',
    latestPlan: 'Planned Output',
    openPlan: 'Open result',
    emptyRecent: 'Generate once to start your local journal.',
    emptyFavorites: 'Favorite a plan to pin it here.',
    emptyPlan: 'Pick Quick or Precision to build a brew.',
    actionPrioritiesTitle: 'Start here',
    actionPrioritiesDescription: 'Practical moves for the next brew. Change one variable at a time.',
    warningsDescription: 'Review before brewing. These notes follow the selected language and the current water, grinder, and brewer status.',
    summaryTitle: 'Result',
    methodBriefTitle: 'Method Focus',
    methodBriefPrimary: 'Primary number',
    methodBriefControl: 'Main control',
    methodBriefSuccess: 'Finish cue',
    methodBriefWatch: 'Watch',
    flowMetricDose: 'Dose',
    flowMetricNext: 'Next',
    flowMetricTotal: 'Total',
    totalWater: 'Total Water',
    finalRatio: 'Final Ratio',
    hotConcentrate: 'Hot Concentrate',
    iceSetupTitle: 'Ice brew setup',
    iceSetupDetail: 'Put ice in the server first, brew only to the hot-water target, let drawdown finish, then stir 5-8 seconds until the melt is even.',
    cupOutput: 'Estimated Cup Output',
    hotWater: 'Hot Water',
    ice: 'Ice',
    temp: 'Temperature',
    time: 'Brew Time',
    grind: 'Grind',
    recipe: 'Brew Guide',
    stepCountSuffix: 'steps',
    sopCard: 'Standard SOP',
    sopQuickDial: 'Quick Dial',
    sopSteps: 'Service Steps',
    rationale: 'Brew Notes',
    warnings: 'Warnings',
    standards: 'Standards',
    provenance: 'Provenance',
    confidence: 'Confidence',
    exactProfile: 'Exact profile',
    derivedTemplateProfile: 'Template-derived profile',
    fallbackProfile: 'Family fallback',
    useInTimer: 'Use in Timer',
    useInRatio: 'Use in Ratio',
    save: 'Save',
    saveToCollection: 'Save to Collection',
    saved: 'Saved',
    favorite: 'Favorite',
    unfavorite: 'Unfavorite',
    aiCoach: 'AI Coach',
    aiFinisher: 'Extraction Finisher',
    explain: 'Explain with AI',
    troubleshoot: 'Fix Taste',
    rewriteGuide: 'Make Guide Friendlier',
    deepAnalysis: 'Deep Brew Analysis',
    adjust: 'Safe AI Optimization',
    aiSop: 'Standardize SOP',
    aiGenerateBrief: 'AI Assist',
    aiSequenceGuide: 'AI Notes',
    aiGenerateLoading: 'Refreshing short notes...',
    aiEngineReady: 'AI Assist not used yet',
    aiEngineStrictReady: 'AI + Planner Validated',
    aiEngineStrictRequired: 'AI Assist unavailable',
    aiEngineProviderStack: '',
    aiFallbackDisabledByAdmin: 'AI is only used when you tap an AI Assist action.',
    aiEngineOnlineOptimized: 'AI + Planner Validated',
    aiEngineLocalValidated: 'Local Planner',
    aiEnginePrecisionPlanner: 'Precision Planner',
    aiEngineWorkingOnline: 'AI Assist working...',
    aiEngineWorkingLocal: 'Local Planner',
    aiPrecisionAssistNote: 'AI is only used when you tap an AI Assist action.',
    aiAssistNotUsed: 'AI Assist not used yet',
    aiAssistActive: 'AI Assist active',
    aiAssistUsedExplanation: 'AI used for explanation',
    aiAssistUsedTasteFix: 'AI used for taste fix',
    aiAssistUsedRewrite: 'Guide made friendlier by AI',
    aiAssistUsedDeepAnalysis: 'AI used for deep analysis',
    aiAssistCacheReused: 'Cached AI answer reused.',
    aiOptimizationAccepted: 'AI suggested a small adjustment and the planner validated it.',
    aiOptimizationRejectedProtected: 'AI suggestion was not used because it tried to change protected recipe numbers. The planner recipe was kept. Use this as your baseline and adjust one variable at a time.',
    updateNotes: 'Refresh Notes',
    updatingNotes: 'Refreshing Notes',
    aiNotesManualHint: 'Use AI only when needed.',
    aiNotesUpdated: 'AI Notes updated.',
    finisherCard: 'Extraction Finisher',
    finisherReasoning: 'Final Read',
    finisherControlPoints: 'Watch',
    finisherFallbackAdjustments: 'Taste Rescue',
    finisherAiTitle: 'AI',
    finisherAiEmpty: 'Run AI if you want more detail.',
    finisherAiGuest: 'Sign in to use AI.',
    finisherAiOffline: 'AI unavailable offline.',
    finisherAiLoading: 'AI working...',
    finisherTasteSour: 'Sour',
    finisherTasteBitter: 'Bitter',
    finisherTasteThin: 'Thin',
    finisherRefresh: 'Refresh AI',
    aiBusy: 'Writing a short brew note...',
    aiOffline: 'AI coaching is unavailable offline.',
    aiGuest: 'Sign in to use AI coaching for this brew plan.',
    load: 'Load',
    pickerSearch: 'Search catalog...',
    pickerSearchLabel: 'Search catalog',
    pickerHelp: '',
    pickerClose: 'Close picker',
    pickerCategoryAll: 'All',
    pickerCategoryCommon: 'Common',
    pickerCategoryFermented: 'Fermented',
    pickerCategoryRegional: 'Regional',
    pickerCategoryExperimental: 'Experimental',
    pickerCategorySpecial: 'Special',
    noPickerResults: 'No matching catalog entries.',
    generated: 'Brew plan saved to local history.',
    generatedAi: 'Brew plan saved. AI optimization applied.',
    generatedLocal: 'Brew plan saved with local planner.',
    aiOptimizationNoChange: 'AI suggestion was not used. The planner kept the safer recipe.',
    savedCollection: 'Recipe saved to Collection.',
    saveCollectionFailed: 'Unable to save this brew to Collection right now.',
    savedFavorite: 'Saved to favorites.',
    removedFavorite: 'Removed from favorites.',
    feedbackTitle: 'Taste Check',
    feedbackDescription: 'After brewing, mark the cup result. This keeps the local journal useful for the next adjustment.',
    feedbackGreat: 'Landed well',
    feedbackSour: 'Too sour',
    feedbackBitter: 'Too bitter',
    feedbackThin: 'Too thin',
    feedbackFlat: 'Flat / muted',
    feedbackMuddy: 'Muddy',
    feedbackAstringent: 'Astringent',
    feedbackNote: 'Short note',
    feedbackNotePlaceholder: 'e.g. drawdown was fast, cup felt sharp, grind one click finer next time',
    feedbackSaveNote: 'Save note',
    feedbackSaved: 'Taste feedback saved.',
    feedbackSaveFailed: 'Unable to save taste feedback right now.',
    feedbackCoachTitle: 'Next Brew Adjustment',
    feedbackCoachHint: 'Smallest safe correction for the next brew.',
    guideDensitySimple: 'Simple',
    guideDensityPro: 'Pro',
    guideDensitySimpleHint: 'Core steps for a quick brew.',
    guideDensityProHint: 'Full flow, path, pour height, and agitation detail.',
    switchSectionTitle: 'Switch method',
    switchSectionSummary: 'Choose Hot/Iced first, then leave Auto or pick the Switch method you want.',
    switchTeachingTitle: 'How Switch can brew',
    switchSizeTitle: 'Switch size',
    switchDoseTitle: 'Dose shortcuts',
    switchPresetTitle: 'Method',
    switchAutoPreset: 'Auto by taste target',
    switchChangePreset: 'Change method',
    switchSelectedSize: 'Selected size',
    switchDoseSafety: 'Dose safety',
    switchValvePath: 'Valve path',
    switchSafety: 'Safety',
    switchSafetySafe: 'Safe',
    switchSafetyCaution: 'Caution',
    switchSafetyBlocked: 'Blocked',
    switchAutoHybridBalanced: 'Auto: Hybrid Balanced',
    switchAutoIcedHybrid: 'Auto: Iced Hybrid',
    switchAutoMugenHybrid: 'Auto: MUGEN Everyday Hybrid',
    switchPresetSheetTitle: 'Choose Switch method',
    switchPresetSheetSummary: 'Auto follows the taste target. Pick a method only when you want a specific Switch behaviour.',
    switchPresetDetailToggle: 'Detail',
    switchPresetBestFor: 'Best for',
    switchPresetCupShape: 'Cup shape',
    switchPresetRisk: 'Risk',
    switchPresetAvoid: 'Avoid when',
    switchPresetSize: 'Safe size',
    switchWhyPreset: 'Why this method',
    switchWatch: 'What to watch',
    switchHardwareFactOfficial: 'Hardware fact: official HARIO.',
    switchWorkflowCurated: 'BaristaChaw curated method.',
    switchExpectedModel: 'Predicted cup, not a guarantee.',
    switchStudioTitle: 'Method detail',
    switchStudioSummary: 'Valve path, chamber load, programme, and release checkpoints stay organized here.',
    beanDetailsOptional: 'Bean details optional',
    beanDetailsHint: 'Natural, washed, variety, and origin improve accuracy, but Quick mode can generate without them.',
    beanDetailsAdd: 'Add bean detail',
    beanDetailsHide: 'Hide bean detail',
    quickSummaryAuto: 'Let Auto keep this brew safe.',
    moreAiTools: 'More AI tools',
    beanCoverageTitle: 'Bean coverage',
    beanCoverageFallback: 'Bean data is incomplete; AI Brew uses a safe baseline.',
    beanCoverageTasteLoop: 'Use taste feedback after brewing for the next correction.',
    expectedCupTitle: 'Expected Cup',
    cupAcidity: 'Acidity',
    cupSweetness: 'Sweetness',
    cupBody: 'Body',
    cupClarity: 'Clarity',
    cupBitterRisk: 'Bitter risk',
    cupAroma: 'Aroma',
    confidenceRecipe: 'Recipe Confidence',
    confidenceWater: 'Water Confidence',
    confidenceGrinder: 'Grinder Confidence',
    confidenceWorkflow: 'Workflow Confidence',
    confidenceCatalog: 'Catalog Confidence',
    unavailable: 'AI Brew catalog is unavailable right now.',
    loadingCatalog: 'Loading catalog...',
    restoredPlan: 'Restored your last AI Brew plan from this device.',
    offlineCatalog: 'Loaded cached AI Brew catalog for offline use.',
    loadFavorite: 'Load favorite brew',
    loadRecent: 'Load recent brew',
    aiSignIn: 'Sign in to enable AI coach',
    aiDisabledGuest: 'AI coach is disabled until you sign in.',
    aiDisabledOffline: 'AI coach is disabled while offline.',
    balance: 'Balance & Clean',
    sweetness: 'More Sweetness',
    acidity: 'More Acidity',
    body: 'More Body',
    floralTransparent: 'Floral & Transparent',
    fruitForward: 'Fruit-Forward',
    softRound: 'Soft & Round',
    denseComforting: 'Dense & Comforting',
    openResult: 'Open result workspace',
    editInputs: 'Edit inputs',
    closeResult: 'Close planned output',
    manualEntry: 'Other / Manual',
    notSpecified: 'Not specified',
    exactMatch: 'Exact match',
    fallbackUsed: 'Fallback used',
    verifiedOfficial: 'Official',
    verifiedCommunity: 'Community',
    verifiedCurated: 'Curated',
    verifiedDataset: 'Dataset',
    verifiedFallback: 'Fallback',
    lowConfidence: 'Low confidence',
    reviewFresh: 'Fresh',
    reviewNeedsReview: 'Needs review',
    reviewConflicting: 'Conflicting',
    reviewDeprecated: 'Deprecated',
    highVariability: 'High variability',
    autoTargetSuggested: 'Auto target suggested',
    species: 'Species',
    lineage: 'Lineage',
    processRisk: 'Process risk',
    widelyUsed: 'Widely used',
    specialtyCommon: 'Specialty common',
    emerging: 'Emerging',
    niche: 'Niche',
    processGroup: 'Process family',
    varietyGroup: 'Variety family',
    profileUsed: 'Profile used',
    grindSource: 'Grind source',
    grindCatalogReference: 'Catalog reference',
    grindDerivedBaseline: 'Derived baseline',
    confidenceNotes: 'Confidence notes',
    waterRequired: 'Manual mineral input is required before generating.',
    openProcessPicker: 'Choose process',
    openVarietyPicker: 'Choose variety',
    openDripperPicker: 'Choose brewer',
    icedUnavailable: 'Ice mode is not available for this brewer yet. Standard mode will be used.',
    icedUnavailableInline: 'Ice mode is intentionally locked for this brewer so BaristaChaw does not invent a fake iced recipe. Use hot mode for this method, or choose V60, Kalita, Chemex, April, Origami, Kono, Melitta, or Clever for Japanese-style ice brew.',
    openGrinderPicker: 'Choose grinder',
    showProvenance: 'Show provenance',
    hideProvenance: 'Hide provenance',
    sourceBadge: 'Source',
    popularityBadge: 'Popularity',
    generationStageLabel: 'Stage',
    planTab: 'Plan',
    flowTab: 'Brew Guide',
    coachTab: 'Coach',
    detailTab: 'Details',
    flowTitle: 'Guided brew',
    flowDescription: 'Stay on the active step. The timer keeps the brew moving with less guesswork.',
    flowReady: 'Ready to brew',
    flowRunning: 'Timer is running',
    flowPaused: 'Timer paused',
    flowFinished: 'Brew window complete',
    flowCurrentStep: 'Current step',
    flowNextStep: 'Next step',
    flowStart: 'Start',
    flowPause: 'Pause',
    flowReset: 'Reset',
    flowOpenTimer: 'Open timer',
    flowElapsed: 'Elapsed',
    flowRemaining: 'Remaining',
    flowDone: 'Done',
    flowNow: 'Now',
    flowUpNext: 'Up next',
    coachDescription: 'AI is optional. Use it only for a short fix or explanation.',
    coachCostHint: 'AI Assist runs only when you tap one of these actions.',
    coachEmpty: 'Choose one brief.',
    coachExplainHint: 'Why this plan fits the bean, water, and target.',
    coachTroubleshootHint: 'What to change first when the cup tastes off.',
    coachAdjustHint: 'How to push the cup brighter, sweeter, or tighter.',
    coachFallback: 'The extra AI layer stayed on the validated brew flow to keep the recipe stable.',
    waterSourceUsed: 'Water source used',
    waterSourceLinks: 'Source links',
    waterRecommended: 'Filter friendly',
    waterNotRecommended: 'Not recommended as-is',
    waterRegion: 'Water region',
    waterSearch: 'Search water',
    waterSearchPlaceholder: 'Type a water brand...',
    waterPublishedOnly: 'Published + brew-ready',
    waterManualOnly: 'Manual minerals required',
    waterNoPublishedMatches: 'No published brew-ready result for this region yet.',
    waterNoReviewMatches: 'No matching brand found in this region yet.',
    waterUseManual: 'Enter minerals manually',
    waterClassification: 'Water classification',
    waterSubmitSuggestion: 'Submit brand request',
    waterSuggestionSent: 'Brand request sent to the review queue.',
    marketIndonesia: 'Indonesia',
    marketSingapore: 'Singapore',
    marketBrunei: 'Brunei',
    marketMalaysia: 'Malaysia',
    noWaterSourceLinks: 'No source links stored for this brand yet.',
    pickerSkipProcess: 'Skip process',
    pickerSelectProcess: 'Select process {label}',
    pickerSelectCustomProcess: 'Select custom process',
    pickerSkipVariety: 'Skip variety',
    pickerSelectVariety: 'Select variety {label}',
    pickerSelectCustomVariety: 'Select custom variety',
    pickerSelectEquipment: 'Select {kind} {label}',
    pickerSelectWaterBrand: 'Select water brand {label}',
    pickerManualMineralsSuffix: ', manual minerals required',
    waterBadgeNeedsFullMinerals: 'Needs Full Minerals',
    waterBadgeDataMismatch: 'Data Mismatch',
    waterBadgeHardWater: 'Hard Water',
    waterBadgeSoftWater: 'Soft Water',
    waterBadgeBalancedWater: 'Balanced Water',
    waterBadgeIdealV60: 'Ideal for V60',
    waterBadgeHighBuffer: 'High Buffer',
    waterBadgeManualMinerals: 'Manual Minerals',
    noVerifiedGrinderSettingDetail: 'No verified grinder setting is stored for this grinder and profile yet.',
    noVerifiedGrinderSettingShort: 'No verified setting yet',
    aiGenerateFailed: 'AI is unavailable for this brew right now.',
    aiCoachFailed: 'AI Coach is unavailable right now.',
    ariaUseInTimer: 'Use {name} in timer',
    ariaUseInRatio: 'Use {name} in ratio calculator',
    ariaSaveToCollection: 'Save {name} to collection',
    ariaFavoriteAdd: 'Save {name} to favorites',
    ariaFavoriteRemove: 'Remove {name} from favorites',
  },
  id: {
    title: 'AI Brew',
    subtitle: 'Planner seduh yang bersih.',
    coffeeTitle: 'Konteks Kopi',
    equipmentTitle: 'Peralatan',
    brewerCoreSection: 'Metode seduh inti',
    brewerSpecialtySection: 'Dripper spesialti',
    brewerVerifiedBadge: 'Profil siap',
    waterTitle: 'Mineral Air',
    waterSourceTitle: 'Sumber Air',
    waterBrand: 'Brand air',
    waterManual: 'Mineral manual',
    waterBrandPicker: 'Air',
    waterQuickPicks: 'Saran',
    waterQuickPicksDescription: '',
    quickMode: 'Cepat',
    proMode: 'Presisi',
    quickModeDescription: 'Builder recipe default yang cepat untuk cangkir pertama yang stabil.',
    proModeDescription: '',
    quickModeTrustHint: 'Paling cocok untuk cepat dan konsisten. Kalau profil bean dan air masih netral, hasil Quick dan Pro bisa sama.',
    proModeTrustHint: '',
    pourControlTitle: 'Kontrol tuang',
    pourStyleTitle: 'Gaya interval',
    pourCountTitle: 'Jumlah tuang',
    pourStyleAuto: 'Auto',
    pourStyleBalanced: 'Seimbang',
    pourStylePulse: 'Pulse',
    pourStyleGentle: 'Halus',
    pourCountAuto: 'Auto',
    pourCount3: '3 tuang',
    pourCount4: '4 tuang',
    pourCount5: '5 tuang',
    pourControlHint: '',
    methodOptionTitle: 'Setelan metode',
    origamiFilterTitle: 'Filter Origami',
    origamiFilterAuto: 'Auto',
    origamiFilterCone: 'Cone',
    origamiFilterWave: 'Wave',
    aeropressStyleTitle: 'Gaya AeroPress',
    aeropressStyleAuto: 'Auto',
    aeropressStyleStandard: 'Standard',
    aeropressStyleInverted: 'Inverted',
    aeropressStyleBypass: 'Bypass',
    aeropressStyleNoBypass: 'Tanpa bypass',
    aeropressStyleBrightClean: 'Bright clean',
    aeropressStyleSweetBody: 'Sweet body',
    precisionControlTitle: 'Target presisi',
    precisionControlHint: 'Opsional. Filter manual paling aman di sekitar 1:13-1:17; Auto memilih default dari alat, sangrai, dan target.',
    targetRatio: 'Rasio target',
    targetRatioPlaceholder: 'Auto',
    targetRatioHint: 'Rentang filter manual: 1:13-1:17. Biarkan Auto kalau ingin BaristaChaw memilih per metode.',
    targetWaterMl: 'Total air (ml)',
    targetWaterMlPlaceholder: 'Auto',
    targetTempC: 'Suhu (C)',
    targetTempCPlaceholder: 'Auto',
    quickBuilderTitle: 'Builder Cepat',
    proBuilderTitle: 'Builder Presisi',
    closeBuilder: 'Tutup builder',
    historyStripDescription: 'Pakai lagi brew yang tersimpan.',
    proDetails: 'Detail brew presisi',
    beanProfileTitle: 'Profil bean',
    beanProfileDescription: 'Opsional.',
    beanProfileShow: 'Tampilkan profil bean',
    beanProfileHide: 'Sembunyikan profil bean',
    beanProfileNeutral: 'Belum ada modifier profil bean yang aktif.',
    beanProfileActive: 'Profil bean aktif',
    altitudeMasl: 'Altitude (mdpl)',
    beanDensity: 'Densitas bean (g/ml)',
    roastDevelopmentTitle: 'Perkembangan sangrai',
    roastDevelopmentUnderdeveloped: 'Kurang develop',
    roastDevelopmentBalanced: 'Seimbang',
    roastDevelopmentDeveloped: 'Lebih develop',
    solubilityTitle: 'Kelarutan',
    solubilityLow: 'Rendah',
    solubilityMedium: 'Sedang',
    solubilityHigh: 'Tinggi',
    sourceDetailsTitle: 'Detail sumber',
    sourceDetailsDescription: '',
    sourceDetailsShow: 'Tampilkan detail sumber',
    sourceDetailsHide: 'Sembunyikan detail sumber',
    beanInfluenceTitle: 'Pengaruh bean',
    beanInfluenceInactive: 'Profil bean netral',
    inputAnalysis: 'Analisis input',
    inputAnalysisDescription: '',
    waterReadyNow: 'Air siap',
    waterNeedsInput: 'Mineral wajib diisi',
    waterStatusReady: 'Siap seduh',
    waterStatusManualRequired: 'Perlu input manual',
    waterStatusHighBuffer: 'Buffer tinggi',
    waterStatusZeroMineral: 'Mineral nol / RO',
    waterStatusEstimated: 'Estimasi',
    grindVerified: 'Referensi grind terverifikasi',
    grindOfficialReference: 'Referensi resmi',
    grindCuratedReference: 'Referensi kurasi',
    grindCommunityReference: 'Referensi komunitas',
    grindEstimatedBaseline: 'Baseline estimasi',
    grindCalibrationNote: 'Setting grinder bergantung pada titik nol burr, kalibrasi, sangrai, dan dosis. Mulai dari sini, lalu koreksi dari air turun dan rasa.',
    grindFallback: 'Fallback grind',
    profileExactStatus: 'Profil alat exact',
    profileFallbackStatus: 'Profil fallback family',
    processOptionalNote: 'Proses opsional. Tidak ada modifier proses otomatis yang dipakai.',
    varietyOptionalNote: 'Varietas opsional. Tidak ada modifier varietas otomatis yang dipakai.',
    profileTitle: 'Profil Target',
    modeHot: 'Seduh Panas',
    modeIced: 'Seduh Es',
    modeCold: 'Seduh Dingin',
    modeEspresso: 'Espresso',
    coffeeName: 'Kopi / asal',
    coffeeNamePlaceholder: 'mis. Ethiopia Chelbesa, Gayo Washed, House Filter',
    dose: 'Dosis (g)',
    doseRangeHint: 'Dosis kerja disarankan: 10-20 g. AI memakai 15 g sebagai titik awal stabil per alat.',
    process: 'Proses',
    variety: 'Varietas',
    roast: 'Profil sangrai',
    dripper: 'Alat seduh',
    grinder: 'Grinder',
    tds: 'TDS (ppm)',
    hardness: 'Hardness (ppm sebagai CaCO3)',
    alkalinity: 'Alkalinitas (ppm sebagai CaCO3)',
    waterNotes: 'Catatan air',
    waterNotesPlaceholder: 'Catatan sumber air / remineralisasi opsional',
    waterGuidance: 'Target',
    waterPresetStatus: 'Status preset',
    waterAutofill: 'Autofill',
    waterManualRequired: 'Manual wajib',
    waterInfoOnly: 'Hanya info',
    waterNeedsMinerals: 'Perlu mineral',
    waterSelectedBrand: 'Brand terpilih',
    waterSelectedManual: 'Mineral manual',
    waterNoBrand: 'Pilih air.',
    waterBrandNeedsManual: 'Isi mineral dulu.',
    waterBrandPartialFilled: 'Lengkapi mineral yang kosong.',
    waterBrandEstimated: 'Estimasi - verifikasi manual',
    waterBrandEstimatedNote: 'Nilai estimasi hanya placeholder. Verifikasi manual sebelum seduh.',
    waterBrandAutofilled: 'Mineral dimuat dari profil brand terpilih.',
    waterBrandCustomized: 'Mineral brand sudah disesuaikan manual untuk brew ini.',
    waterDerivationDirect: 'Data label/lab langsung',
    waterDerivationDerived: 'Turunan dari Ca/Mg/HCO3',
    waterDerivationEstimated: 'Estimasi dari klasifikasi',
    waterDerivationManual: 'Input mineral manual',
    waterUseAsRoBase: 'Pakai sebagai base RO; tambahkan mineral manual.',
    waterHighBufferWarning: 'Alkalinitas/buffer tinggi bisa meredam acidity dan membuat kopi floral terasa datar. Pakai kontak lebih pendek atau mineral manual untuk bean delicate.',
    waterAlkalineWarning: 'Air alkaline bisa meredam acidity. Verifikasi manual sebelum dianggap ramah filter.',
    waterCompleteMinerals: 'Lengkapi mineral',
    waterCompleteMineralsHint: 'Mengisi field kosong dari data katalog, chemistry brand yang tersedia, atau baseline klasifikasi konservatif. Statusnya tetap manual sampai terverifikasi.',
    waterCompleteMineralsApplied: 'Mineral sudah dilengkapi. Cek catatan, lalu buat seduhan.',
    waterCompleteMineralsUnavailable: 'Pilih brand air dulu.',
    waterCompleteMineralsRoNote: 'Untuk air RO/low-mineral, ini target remineralisasi, bukan profil mineral asli label.',
    waterCompleteMineralsEstimatedNote: 'Baseline klasifikasi - verifikasi manual sebelum dipublikasikan sebagai profil brand.',
    waterWhyManualTitle: 'Kenapa manual?',
    waterWhyManualBody: 'Manual wajib ketika panel mineral belum lengkap, masih estimasi, terlalu rendah mineral, alkaline/high-buffer, atau belum didukung sumber publik tepercaya. Ini mencegah klaim "siap seduh" yang salah dan resep yang buruk.',
    waterEditMinerals: 'Edit mineral',
    waterHideMinerals: 'Sembunyikan mineral',
    waterPresetIdealFilter: 'Ideal filter',
    waterPresetHighBuffer: 'Buffer tinggi',
    waterPresetLowMineral: 'Mineral rendah',
    waterSummary: 'Mineral',
    waterReadyBrew: 'Air siap seduh',
    waterReadyBrewDescription: '',
    waterMarkets: 'Pasar',
    waterSourceTab: 'Sumber',
    waterOpenBrandPicker: 'Pilih brand air',
    waterNotSpecified: 'Belum ditentukan',
    otherProcess: 'Proses custom',
    otherVariety: 'Varietas custom',
    openPicker: 'Pilih',
    generate: 'Buat',
    generating: 'Menyusun seduh',
    reset: 'Reset',
    recent: 'Seduhan Terbaru',
    favorites: 'Favorit',
    latestPlan: 'Hasil Plan',
    openPlan: 'Buka hasil',
    emptyRecent: 'Buat satu seduhan untuk mulai jurnal lokal.',
    emptyFavorites: 'Tandai favorit agar resep muncul di sini.',
    emptyPlan: 'Pilih Cepat atau Presisi untuk menyusun seduhan.',
    actionPrioritiesTitle: 'Mulai dari sini',
    actionPrioritiesDescription: 'Aksi praktis untuk seduhan ini. Ubah satu variabel saja.',
    warningsDescription: 'Baca sebelum seduh. Catatan ini mengikuti bahasa aplikasi dan status air, grinder, serta alat yang dipakai.',
    summaryTitle: 'Hasil',
    methodBriefTitle: 'Kunci Metode',
    methodBriefPrimary: 'Angka utama',
    methodBriefControl: 'Kontrol utama',
    methodBriefSuccess: 'Tanda selesai',
    methodBriefWatch: 'Pantau',
    flowMetricDose: 'Dosis',
    flowMetricNext: 'Berikutnya',
    flowMetricTotal: 'Total',
    totalWater: 'Total Air',
    finalRatio: 'Rasio Final',
    hotConcentrate: 'Konsentrat Panas',
    iceSetupTitle: 'Setup seduh es',
    iceSetupDetail: 'Masukkan es ke server dulu, seduh hanya sampai target air panas, biarkan air turun selesai, lalu aduk 5-8 detik sampai lelehan merata.',
    cupOutput: 'Estimasi Hasil Cangkir',
    hotWater: 'Air Panas',
    ice: 'Es',
    temp: 'Suhu',
    time: 'Waktu Seduh',
    grind: 'Gilingan',
    recipe: 'Panduan Seduh',
    stepCountSuffix: 'langkah',
    sopCard: 'SOP Seduh',
    sopQuickDial: 'Ringkasan Cepat',
    sopSteps: 'Langkah Servis',
    rationale: 'Catatan Seduh',
    warnings: 'Peringatan',
    standards: 'Standar',
    provenance: 'Sumber Data',
    confidence: 'Keyakinan',
    exactProfile: 'Profil exact',
    derivedTemplateProfile: 'Profil turunan template',
    fallbackProfile: 'Fallback family',
    useInTimer: 'Pakai di Timer',
    useInRatio: 'Pakai di Ratio',
    save: 'Simpan',
    saveToCollection: 'Simpan Koleksi',
    saved: 'Tersimpan',
    favorite: 'Favorit',
    unfavorite: 'Hapus Favorit',
    aiCoach: 'Panduan AI',
    aiFinisher: 'Finalisasi Ekstraksi',
    explain: 'Jelaskan dengan AI',
    troubleshoot: 'Perbaiki Rasa',
    rewriteGuide: 'Buat Panduan Lebih Ramah',
    deepAnalysis: 'Analisis Dalam',
    adjust: 'Optimasi Aman AI',
    aiSop: 'Standarkan SOP',
    aiGenerateBrief: 'Asisten AI',
    aiSequenceGuide: 'Catatan AI',
    aiGenerateLoading: 'Memperbarui catatan singkat...',
    aiEngineReady: 'AI Assist belum dipakai',
    aiEngineStrictReady: 'AI + Tervalidasi Planner',
    aiEngineStrictRequired: 'AI Assist belum tersedia',
    aiEngineProviderStack: '',
    aiFallbackDisabledByAdmin: 'AI hanya dipakai saat kamu menekan tombol AI Assist.',
    aiEngineOnlineOptimized: 'AI + Tervalidasi Planner',
    aiEngineLocalValidated: 'Planner Lokal',
    aiEnginePrecisionPlanner: 'Planner Presisi',
    aiEngineWorkingOnline: 'AI Assist bekerja...',
    aiEngineWorkingLocal: 'Planner Lokal',
    aiPrecisionAssistNote: 'AI hanya dipakai saat kamu menekan tombol AI Assist.',
    aiAssistNotUsed: 'AI Assist belum dipakai',
    aiAssistActive: 'AI Assist aktif',
    aiAssistUsedExplanation: 'AI dipakai untuk penjelasan',
    aiAssistUsedTasteFix: 'AI dipakai untuk perbaikan rasa',
    aiAssistUsedRewrite: 'Panduan dibuat lebih ramah oleh AI',
    aiAssistUsedDeepAnalysis: 'AI dipakai untuk analisis dalam',
    aiAssistCacheReused: 'Jawaban AI sebelumnya digunakan ulang.',
    aiOptimizationAccepted: 'AI memberi penyesuaian kecil dan planner sudah memvalidasi hasilnya.',
    aiOptimizationRejectedProtected: 'Saran AI tidak dipakai karena mencoba mengubah angka penting. Resep planner tetap dipertahankan. Gunakan hasil ini sebagai baseline, lalu koreksi satu variabel saja.',
    updateNotes: 'Perbarui Catatan',
    updatingNotes: 'Memperbarui Catatan',
    aiNotesManualHint: 'Pakai AI hanya saat perlu.',
    aiNotesUpdated: 'AI Notes diperbarui.',
    finisherCard: 'Finalisasi Ekstraksi',
    finisherReasoning: 'Bacaan Akhir',
    finisherControlPoints: 'Perhatikan',
    finisherFallbackAdjustments: 'Penyelamatan Rasa',
    finisherAiTitle: 'AI',
    finisherAiEmpty: 'Jalankan AI jika butuh detail tambahan.',
    finisherAiGuest: 'Masuk untuk memakai AI.',
    finisherAiOffline: 'AI tidak tersedia saat offline.',
    finisherAiLoading: 'AI bekerja...',
    finisherTasteSour: 'Asam',
    finisherTasteBitter: 'Pahit',
    finisherTasteThin: 'Tipis',
    finisherRefresh: 'Muat ulang AI',
    aiBusy: 'Menulis catatan singkat...',
    aiOffline: 'AI coach tidak tersedia saat offline.',
    aiGuest: 'Masuk dulu untuk memakai AI coach pada brew plan ini.',
    load: 'Muat',
    pickerSearch: 'Cari katalog...',
    pickerSearchLabel: 'Cari katalog',
    pickerHelp: '',
    pickerClose: 'Tutup picker',
    pickerCategoryAll: 'Semua',
    pickerCategoryCommon: 'Common',
    pickerCategoryFermented: 'Fermentasi',
    pickerCategoryRegional: 'Regional',
    pickerCategoryExperimental: 'Eksperimental',
    pickerCategorySpecial: 'Khusus',
    noPickerResults: 'Tidak ada entri katalog yang cocok.',
    generated: 'Brew plan tersimpan ke history lokal.',
    generatedAi: 'Brew plan tersimpan. Optimasi AI diterapkan.',
    generatedLocal: 'Brew plan tersimpan dengan planner lokal.',
    aiOptimizationNoChange: 'Saran AI tidak dipakai. Planner mempertahankan resep yang lebih aman.',
    savedCollection: 'Recipe tersimpan ke Collection.',
    saveCollectionFailed: 'Recipe ini belum bisa disimpan ke Collection sekarang.',
    savedFavorite: 'Masuk ke favorit.',
    removedFavorite: 'Dihapus dari favorit.',
    feedbackTitle: 'Cek rasa',
    feedbackDescription: 'Setelah seduh, tandai hasil cangkir. Jurnal lokal jadi lebih berguna untuk penyesuaian berikutnya.',
    feedbackGreat: 'Sudah enak',
    feedbackSour: 'Terlalu asam',
    feedbackBitter: 'Terlalu pahit',
    feedbackThin: 'Terlalu tipis',
    feedbackFlat: 'Flat / muted',
    feedbackMuddy: 'Keruh / berat',
    feedbackAstringent: 'Sepat',
    feedbackNote: 'Catatan singkat',
    feedbackNotePlaceholder: 'mis. air turun cepat, rasa tajam, grind satu klik lebih halus',
    feedbackSaveNote: 'Simpan catatan',
    feedbackSaved: 'Catatan rasa tersimpan.',
    feedbackSaveFailed: 'Catatan rasa belum bisa disimpan sekarang.',
    feedbackCoachTitle: 'Koreksi Seduhan Berikutnya',
    feedbackCoachHint: 'Koreksi aman paling kecil untuk seduhan berikutnya.',
    guideDensitySimple: 'Ringkas',
    guideDensityPro: 'Pro',
    guideDensitySimpleHint: 'Langkah inti untuk cepat dipakai.',
    guideDensityProHint: 'Detail flow, jalur, tinggi tuang, dan agitasi.',
    switchSectionTitle: 'Metode Switch',
    switchSectionSummary: 'Pilih Panas/Es dulu, lalu biarkan Auto atau pilih metode Switch yang kamu mau.',
    switchTeachingTitle: 'Cara Switch bekerja',
    switchSizeTitle: 'Ukuran Switch',
    switchDoseTitle: 'Shortcut dosis',
    switchPresetTitle: 'Metode',
    switchAutoPreset: 'Auto ikut Profil Target',
    switchChangePreset: 'Ubah metode',
    switchSelectedSize: 'Ukuran terpilih',
    switchDoseSafety: 'Keamanan dosis',
    switchValvePath: 'Jalur katup',
    switchSafety: 'Keamanan',
    switchSafetySafe: 'Aman',
    switchSafetyCaution: 'Hati-hati',
    switchSafetyBlocked: 'Diblokir',
    switchAutoHybridBalanced: 'Auto: Hybrid seimbang',
    switchAutoIcedHybrid: 'Auto: Iced Hybrid',
    switchAutoMugenHybrid: 'Auto: MUGEN Everyday Hybrid',
    switchPresetSheetTitle: 'Pilih metode Switch',
    switchPresetSheetSummary: 'Auto mengikuti Profil Target. Pilih metode hanya kalau kamu mau karakter Switch tertentu.',
    switchPresetDetailToggle: 'Detail',
    switchPresetBestFor: 'Cocok untuk',
    switchPresetCupShape: 'Bentuk rasa',
    switchPresetRisk: 'Risiko',
    switchPresetAvoid: 'Jangan pakai saat',
    switchPresetSize: 'Ukuran aman',
    switchWhyPreset: 'Kenapa metode ini',
    switchWatch: 'Yang perlu diperhatikan',
    switchHardwareFactOfficial: 'Fakta hardware: resmi HARIO.',
    switchWorkflowCurated: 'Metode racikan BaristaChaw.',
    switchExpectedModel: 'Prediksi rasa, bukan jaminan.',
    switchStudioTitle: 'Detail metode',
    switchStudioSummary: 'Jalur katup, muatan ruang, program, dan titik buka katup disusun di sini.',
    beanDetailsOptional: 'Detail bean opsional',
    beanDetailsHint: 'Natural, washed, varietas, dan origin membuat resep lebih akurat, tapi mode Cepat tetap bisa jalan tanpa itu.',
    beanDetailsAdd: 'Tambah detail bean',
    beanDetailsHide: 'Sembunyikan detail bean',
    quickSummaryAuto: 'Biarkan Auto untuk hasil aman.',
    moreAiTools: 'Tool AI lainnya',
    beanCoverageTitle: 'Cakupan bean',
    beanCoverageFallback: 'Data beans tidak lengkap; AI Brew memakai baseline aman.',
    beanCoverageTasteLoop: 'Gunakan feedback rasa setelah seduh untuk koreksi berikutnya.',
    expectedCupTitle: 'Prediksi Rasa',
    cupAcidity: 'Asam',
    cupSweetness: 'Manis',
    cupBody: 'Body',
    cupClarity: 'Bersih / Jernih',
    cupBitterRisk: 'Risiko pahit',
    cupAroma: 'Aroma',
    confidenceRecipe: 'Keyakinan Resep',
    confidenceWater: 'Keyakinan Air',
    confidenceGrinder: 'Keyakinan Grinder',
    confidenceWorkflow: 'Keyakinan Panduan',
    confidenceCatalog: 'Keyakinan Data',
    unavailable: 'Katalog AI Brew belum bisa dimuat sekarang.',
    loadingCatalog: 'Memuat katalog...',
    restoredPlan: 'Plan terakhir dipulihkan.',
    offlineCatalog: 'Katalog offline siap.',
    loadFavorite: 'Muat brew favorit',
    loadRecent: 'Muat brew terbaru',
    aiSignIn: 'Masuk untuk AI',
    aiDisabledGuest: 'Masuk untuk memakai AI.',
    aiDisabledOffline: 'AI offline.',
    balance: 'Seimbang & Bersih',
    sweetness: 'Lebih Manis',
    acidity: 'Lebih Cerah',
    body: 'Body Lebih Tebal',
    floralTransparent: 'Floral & Transparan',
    fruitForward: 'Buah Lebih Menonjol',
    softRound: 'Lembut & Bulat',
    denseComforting: 'Tebal & Nyaman',
    openResult: 'Buka workspace hasil',
    editInputs: 'Edit input',
    closeResult: 'Tutup output plan',
    manualEntry: 'Lainnya / Manual',
    notSpecified: 'Belum ditentukan',
    exactMatch: 'Cocok exact',
    fallbackUsed: 'Fallback dipakai',
    verifiedOfficial: 'Resmi',
    verifiedCommunity: 'Komunitas',
    verifiedCurated: 'Kurasi',
    verifiedDataset: 'Dataset',
    verifiedFallback: 'Fallback',
    lowConfidence: 'Keyakinan rendah',
    reviewFresh: 'Terkini',
    reviewNeedsReview: 'Perlu ditinjau',
    reviewConflicting: 'Perlu dirapikan',
    reviewDeprecated: 'Deprecated',
    highVariability: 'Variabilitas tinggi',
    autoTargetSuggested: 'Target otomatis disarankan',
    species: 'Spesies',
    lineage: 'Garis keturunan',
    processRisk: 'Risiko proses',
    widelyUsed: 'Paling umum',
    specialtyCommon: 'Umum di specialty',
    emerging: 'Sedang naik',
    niche: 'Niche',
    processGroup: 'Keluarga proses',
    varietyGroup: 'Keluarga varietas',
    profileUsed: 'Profil yang dipakai',
    grindSource: 'Sumber setting grind',
    grindCatalogReference: 'Referensi katalog',
    grindDerivedBaseline: 'Baseline turunan',
    confidenceNotes: 'Catatan keyakinan',
    waterRequired: 'Input mineral manual wajib diisi sebelum generate.',
    openProcessPicker: 'Pilih proses',
    openVarietyPicker: 'Pilih varietas',
    openDripperPicker: 'Pilih alat seduh',
    icedUnavailable: 'Mode es belum tersedia untuk alat ini. Mode standar dipakai agar hasil tidak salah.',
    icedUnavailableInline: 'Mode es belum aman untuk alat ini. Pilih V60, Kalita, Chemex, April, Origami, Kono, Melitta, atau Clever.',
    openGrinderPicker: 'Pilih grinder',
    showProvenance: 'Tampilkan rujukan',
    hideProvenance: 'Sembunyikan rujukan',
    sourceBadge: 'Sumber',
    popularityBadge: 'Popularitas',
    generationStageLabel: 'Tahap',
    planTab: 'Ringkasan',
    flowTab: 'Panduan Seduh',
    coachTab: 'Panduan AI',
    detailTab: 'Detail',
    flowTitle: 'Panduan seduh',
    flowDescription: 'Fokus ke langkah aktif.',
    flowReady: 'Siap mulai seduh',
    flowRunning: 'Timer sedang berjalan',
    flowPaused: 'Timer dijeda',
    flowFinished: 'Jendela seduh selesai',
    flowCurrentStep: 'Langkah sekarang',
    flowNextStep: 'Langkah berikutnya',
    flowStart: 'Mulai',
    flowPause: 'Jeda',
    flowReset: 'Ulang',
    flowOpenTimer: 'Buka timer',
    flowElapsed: 'Berjalan',
    flowRemaining: 'Sisa',
    flowDone: 'Selesai',
    flowNow: 'Sekarang',
    flowUpNext: 'Berikutnya',
    coachDescription: 'AI opsional. Pakai hanya untuk penjelasan atau koreksi rasa singkat.',
    coachCostHint: 'AI Assist hanya berjalan saat kamu menekan salah satu aksi ini.',
    coachEmpty: 'Pilih satu brief.',
    coachExplainHint: 'Mengapa plan ini cocok dengan bean, air, dan target.',
    coachTroubleshootHint: 'Apa yang paling dulu diubah saat rasa mulai meleset.',
    coachAdjustHint: 'Cara mendorong cangkir jadi lebih cerah, manis, atau rapat.',
    coachFallback: 'Layer AI tambahan dialihkan ke flow tervalidasi agar recipe tetap aman dan stabil.',
    waterSourceUsed: 'Sumber air yang dipakai',
    waterSourceLinks: 'Tautan sumber',
    waterRecommended: 'Cocok untuk filter',
    waterNotRecommended: 'Tidak disarankan langsung',
    waterRegion: 'Wilayah air',
    waterSearch: 'Cari air',
    waterSearchPlaceholder: 'Ketik nama brand air...',
    waterPublishedOnly: 'Published + siap brew',
    waterManualOnly: 'Perlu mineral manual',
    waterNoPublishedMatches: 'Belum ada hasil published brew-ready untuk region ini.',
    waterNoReviewMatches: 'Belum ada brand yang cocok di region ini.',
    waterUseManual: 'Isi mineral manual',
    waterClassification: 'Klasifikasi air',
    waterSubmitSuggestion: 'Kirim permintaan brand',
    waterSuggestionSent: 'Permintaan brand sudah masuk ke antrean review.',
    marketIndonesia: 'Indonesia',
    marketSingapore: 'Singapura',
    marketBrunei: 'Brunei',
    marketMalaysia: 'Malaysia',
    noWaterSourceLinks: 'Belum ada link sumber tersimpan untuk brand ini.',
    pickerSkipProcess: 'Lewati proses',
    pickerSelectProcess: 'Pilih proses {label}',
    pickerSelectCustomProcess: 'Pilih proses kustom',
    pickerSkipVariety: 'Lewati varietas',
    pickerSelectVariety: 'Pilih varietas {label}',
    pickerSelectCustomVariety: 'Pilih varietas kustom',
    pickerSelectEquipment: 'Pilih {kind} {label}',
    pickerSelectWaterBrand: 'Pilih brand air {label}',
    pickerManualMineralsSuffix: ', perlu mineral manual',
    waterBadgeNeedsFullMinerals: 'Perlu mineral lengkap',
    waterBadgeDataMismatch: 'Data tidak konsisten',
    waterBadgeHardWater: 'Air keras',
    waterBadgeSoftWater: 'Air lunak',
    waterBadgeBalancedWater: 'Air seimbang',
    waterBadgeIdealV60: 'Ideal untuk V60',
    waterBadgeHighBuffer: 'Buffer tinggi',
    waterBadgeManualMinerals: 'Mineral manual',
    noVerifiedGrinderSettingDetail: 'Belum ada setting grinder terverifikasi untuk grinder dan profil ini.',
    noVerifiedGrinderSettingShort: 'Belum ada setting terverifikasi',
    aiGenerateFailed: 'AI belum bisa dipakai untuk brew ini sekarang.',
    aiCoachFailed: 'AI Coach belum bisa dipakai sekarang.',
    ariaUseInTimer: 'Gunakan {name} di timer',
    ariaUseInRatio: 'Gunakan {name} di kalkulator rasio',
    ariaSaveToCollection: 'Simpan {name} ke koleksi',
    ariaFavoriteAdd: 'Simpan {name} ke favorit',
    ariaFavoriteRemove: 'Hapus {name} dari favorit',
  },
} as const;

const ROAST_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'medium_light', label: 'Med-Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'medium_dark', label: 'Med-Dark' },
  { value: 'dark', label: 'Dark' },
] as const;

const ROAST_DEVELOPMENT_OPTIONS = [
  { value: 'underdeveloped', copyKey: 'roastDevelopmentUnderdeveloped' },
  { value: 'balanced', copyKey: 'roastDevelopmentBalanced' },
  { value: 'developed', copyKey: 'roastDevelopmentDeveloped' },
] as const;

const SOLUBILITY_OPTIONS = [
  { value: 'low', copyKey: 'solubilityLow' },
  { value: 'medium', copyKey: 'solubilityMedium' },
  { value: 'high', copyKey: 'solubilityHigh' },
] as const;

type PickerKind = 'process' | 'variety' | 'dripper' | 'grinder' | 'water_brand' | null;
type AiCoachMode = 'explain' | 'troubleshoot' | 'rewrite' | 'deep_analysis' | 'adjust';
type FormMode = 'quick' | 'pro';
type HistoryStripTab = 'latest' | 'favorites' | 'recent';
type ResultTab = 'plan' | 'flow' | 'coach' | 'details';
type AiBrewGuideDensity = 'basic' | 'pro';
type CopySet = Record<string, string>;
type ProcessPickerCategory = 'common' | 'fermented' | 'regional' | 'experimental' | 'special';
type ProBuilderSectionId = 'recipe' | 'bean' | 'water' | 'grinder' | 'method' | 'confidence';

const AI_BREW_POUR_CONTROL_FAMILIES = new Set<AiBrewMethodFamily>([
  'v60',
  'origami',
  'kono',
  'kalita_wave',
  'melitta',
  'april',
  'chemex',
]);

const PROCESS_PICKER_CATEGORIES: ProcessPickerCategory[] = ['common', 'fermented', 'regional', 'experimental', 'special'];
const COMMON_PROCESS_PRIORITY = new Map([
  ['washed', 0],
  ['natural', 1],
  ['honey', 2],
  ['wet_hulled', 3],
]);

interface PickerOption {
  id: string;
  label: string;
  subtitle?: string;
  description?: string;
  searchText: string;
  aliases?: string[];
  canonicalTerms?: string[];
  processCategory?: ProcessPickerCategory;
  section: string;
  badges: string[];
  ariaLabel: string;
  tone?: 'highlight' | 'muted' | 'default';
  trustStatus?: BrewerProfileTrustStatus;
}

const CORE_BREWER_IDS = [
  'espresso-machine',
  'aeropress',
  'french-press',
  'hario-v60',
  'hario-switch-02',
  'hario-switch-03',
  'mugen-x-switch',
  'kalita-wave-155-185',
  'chemex',
  'clever-dripper',
  'bialetti-moka-pot',
  'toddy-cold-brew',
  'batch-brewer',
  'hario-siphon',
  'origami-dripper-s-m',
  'april-brewer',
  'melitta',
  'kono-meimon',
] as const;

const CORE_BREWER_PRIORITY = new Map<string, number>(
  CORE_BREWER_IDS.map((id, index) => [id, index]),
);

const METHOD_FAMILY_SEARCH_ALIASES: Record<AiBrewMethodFamily, string> = {
  espresso: 'espresso machine shot spro portafilter pressure 9 bar',
  aeropress: 'aeropress immersion press pressure',
  french_press: 'french press press pot cafetiere immersion plunger',
  siphon: 'siphon syphon vacuum hario',
  moka_pot: 'moka pot bialetti stovetop moka express',
  cold_brew: 'cold brew toddy cold immersion concentrate',
  batch_brew: 'batch brewer batch brew automatic brewer sca golden cup',
  v60: 'v60 cone pour over pourover drip filter',
  chemex: 'chemex glass pour over thick paper',
  kalita_wave: 'kalita wave flat bottom wave filter',
  clever_dripper: 'clever dripper switch immersion release steep',
  hario_switch: 'hario switch mugen valve closed open immersion release hybrid',
  origami: 'origami cone wave folded dripper',
  april: 'april brewer flat bottom pulse',
  melitta: 'melitta trapezoid 102',
  kono: 'kono meimon cone dripper',
};

function scoreBrewerDisplayOrder(item: EquipmentCatalogEntry) {
  const exactPriority = CORE_BREWER_PRIORITY.get(item.id);
  if (exactPriority !== undefined) return exactPriority;
  const familyPriority = CORE_BREWER_IDS.length + (item.methodFamily ? Object.keys(METHOD_FAMILY_SEARCH_ALIASES).indexOf(item.methodFamily) : 99);
  return familyPriority + (item.verificationLevel === 'official' ? 0 : 50);
}

function scoreGrinderDisplayOrder(item: EquipmentCatalogEntry) {
  const name = `${item.name} ${item.brand || ''} ${item.typeLabel || ''}`.toLowerCase();
  let score = 0;

  if (name.includes('feima') || name.includes('600n')) score -= 150;
  if (name.includes('latina') || name.includes('flying eagle')) score -= 120;

  if (item.popularityTier === 'widely_used') score -= 90;
  else if (item.popularityTier === 'specialty_common') score -= 60;
  else if (item.popularityTier === 'emerging') score -= 25;

  if (item.marketSegment === 'mass_market') score -= 28;
  else if (item.marketSegment === 'specialty_mainstream') score -= 18;

  if (item.verificationLevel === 'official') score -= 22;
  else if (item.verificationLevel === 'community_verified') score -= 14;
  else if (item.verificationLevel === 'curated') score -= 8;
  else if (item.verificationLevel === 'dataset_unverified') score += 30;

  const brandPriority = [
    '1zpresso',
    'timemore',
    'kingrinder',
    'comandante',
    'baratza',
    'feima',
    'yang-chia',
    'latina',
    'fellow',
    'niche',
    'eureka',
    'mahlkonig',
    'df64',
  ].findIndex((brand) => name.includes(brand));
  if (brandPriority >= 0) score -= Math.max(0, 24 - brandPriority * 2);

  return score;
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  if (safeSeconds >= 3600) {
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
  }
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatGuideTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  if (safeSeconds >= 3600) {
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
  }
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getPlanExtractionSeconds(plan: BrewPlan) {
  return Math.max(0, Math.round(plan.extractionEndSeconds ?? plan.totalTimeSeconds));
}

function getPlanGuideEndSeconds(plan: BrewPlan) {
  return Math.max(getPlanExtractionSeconds(plan), Math.round(plan.guideEndSeconds ?? plan.totalTimeSeconds));
}

function getPlanPostExtractionSeconds(plan: BrewPlan) {
  return Math.max(0, Math.round(plan.postExtractionSeconds ?? (getPlanGuideEndSeconds(plan) - getPlanExtractionSeconds(plan))));
}

function getPlanTasteTimeRange(plan: BrewPlan): [number, number] {
  if (plan.tasteTimeRangeSeconds) return plan.tasteTimeRangeSeconds;
  const extraction = getPlanExtractionSeconds(plan);
  return [Math.max(0, extraction - 15), extraction + 20];
}

function getPlanExtractionLabel(plan: BrewPlan, language: string) {
  const id = isIndonesianAiBrewLanguage(language);
  if (plan.methodFamily === 'espresso') return id ? 'Shot' : 'Shot';
  if (plan.methodFamily === 'cold_brew') return id ? 'Steep dingin' : 'Cold steep';
  if (plan.methodFamily === 'french_press' || plan.methodFamily === 'clever_dripper') return id ? 'Steep' : 'Steep';
  if (plan.brewMode === 'iced') return id ? 'Ekstraksi panas' : 'Hot extraction';
  return id ? 'Ekstraksi' : 'Extraction';
}

function getPlanTimeHelperCopy(plan: BrewPlan, language: string) {
  const id = isIndonesianAiBrewLanguage(language);
  const post = getPlanPostExtractionSeconds(plan);
  if (post <= 0) {
    return id
      ? 'Waktu rasa dihitung sampai ekstraksi utama selesai.'
      : 'Taste time is counted until the main extraction is complete.';
  }
  if (plan.brewMode === 'iced') {
    return id
      ? 'Aduk es tidak menambah ekstraksi; ini hanya meratakan konsentrat panas dan lelehan es.'
      : 'Stirring ice does not add extraction; it only evens out the hot concentrate and melt.';
  }
  return id
    ? 'Ekstraksi adalah waktu yang paling memengaruhi rasa. Langkah aduk/sajikan hanya finishing.'
    : 'Extraction is the time that most affects taste. Stir/serve steps are only finishing.';
}

function formatDisplayNumber(value: number, maxFractionDigits = 0) {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function formatRoundedMl(value: number) {
  return `${formatDisplayNumber(Math.round(value))} ml`;
}

function escapeAiBrewRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compactResultSummaryForDisplay(summary: string, plan: BrewPlan, language: string) {
  const coffeeName = plan.coffeeName.trim();
  if (!coffeeName) return summary;
  const replacement = isIndonesianAiBrewLanguage(language) ? 'kopi ini' : 'this coffee';
  return summary.replace(new RegExp(escapeAiBrewRegExp(coffeeName), 'gi'), replacement);
}

function formatRoundedGrams(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const maxFractionDigits = Number.isInteger(rounded) ? 0 : 1;
  return `${formatDisplayNumber(rounded, maxFractionDigits)} g`;
}

function formatRoundedTemperature(value: number) {
  return `${formatDisplayNumber(Math.round(value))}\u00b0C`;
}

function formatPlanHeaderWater(plan: BrewPlan, language: string) {
  if (plan.iceMl > 0) {
    const id = isIndonesianAiBrewLanguage(language);
    return id
      ? `${formatRoundedMl(plan.hotWaterMl)} panas + ${formatRoundedGrams(plan.iceMl)} es`
      : `${formatRoundedMl(plan.hotWaterMl)} hot + ${formatRoundedGrams(plan.iceMl)} ice`;
  }
  return formatRoundedMl(plan.totalWaterMl);
}

function buildPremiumResultSummary(plan: BrewPlan, language: string) {
  const id = isIndonesianAiBrewLanguage(language);
  const target = localizeAiBrewTargetProfile(plan.targetProfileId, plan.targetProfileLabel, language).toLowerCase();
  const dose = formatRoundedGrams(plan.doseG);
  const temperature = formatRoundedTemperature(plan.waterTempC);
  const extractionTime = formatTime(getPlanExtractionSeconds(plan));
  const guideTime = formatTime(getPlanGuideEndSeconds(plan));
  const postSeconds = getPlanPostExtractionSeconds(plan);
  const postCopy = postSeconds > 0
    ? (id ? ` Aduk/sajikan +${formatGuideTime(postSeconds)}.` : ` Finish +${formatGuideTime(postSeconds)}.`)
    : '';

  if (plan.brewMode === 'iced') {
    const finalBeverage = formatRoundedMl(plan.totalWaterMl);
    const hotWater = formatRoundedMl(plan.hotWaterMl);
    const ice = formatRoundedGrams(plan.iceMl);
    const finalRatio = `1:${formatBrewRatio(plan.finalBeverageRatio)}`;
    const hotRatio = `1:${formatBrewRatio(plan.hotExtractionRatio)}`;
    const estimatedCup = formatRoundedMl(plan.estimatedCupOutputMl);
    return id
      ? `Dose ${dose}; final beverage/total input ${finalBeverage}; air panas ${hotWater}; es di server ${ice}; rasio final ${finalRatio}; rasio ekstraksi panas ${hotRatio}; estimasi hasil cangkir ${estimatedCup}. ${temperature}, ekstraksi panas ${extractionTime}; panduan selesai ${guideTime}.${postCopy}`
      : `Dose ${dose}; final beverage/total input ${finalBeverage}; hot water ${hotWater}; ice in server ${ice}; final ratio ${finalRatio}; hot extraction ratio ${hotRatio}; estimated cup output ${estimatedCup}. ${temperature}, hot extraction ${extractionTime}; guide done ${guideTime}.${postCopy}`;
  }

  return id
    ? `${dose} -> ${formatRoundedMl(plan.totalWaterMl)} air; 1:${formatBrewRatio(plan.recommendedRatio)}; ${temperature}; ekstraksi ${extractionTime}; panduan selesai ${guideTime}.${postCopy} Target ${target}.`
    : `${dose} -> ${formatRoundedMl(plan.totalWaterMl)} water; 1:${formatBrewRatio(plan.recommendedRatio)}; ${temperature}; extraction ${extractionTime}; guide done ${guideTime}.${postCopy} Target ${target}.`;
}

function planUsesOnlineAi(plan: BrewPlan) {
  return (
    plan.confidenceNotes.some((note) => /AI numeric optimizer accepted inside guardrails/i.test(note))
    || plan.notes.some((note) => /^AI optimizer:/i.test(note))
    || Boolean(plan.aiNotes?.sequenceCanonical || plan.aiNotes?.sequence)
  );
}

function formatBrewRatio(value: number) {
  if (!Number.isFinite(value)) return '--';
  const rounded = Math.round(value * 10) / 10;
  return formatDisplayNumber(rounded, Number.isInteger(rounded) ? 0 : 1);
}

function formatGrindSettingValue(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return value;
  const rounded = Math.round(parsed);
  return String(rounded);
}

function localizeGrindUnitLabel(value: string, language?: string) {
  const unit = value.toLowerCase();
  if (isIndonesianAiBrewLanguage(language || '')) {
    if (unit.startsWith('click')) return 'klik';
    if (unit.startsWith('turn')) return 'putaran';
    if (unit.startsWith('number')) return 'nomor';
    if (unit.startsWith('setting')) return 'setting';
    if (unit.startsWith('step')) return 'step';
    if (unit.startsWith('notch')) return 'notch';
  }
  if (unit === 'notches') return 'notches';
  if (unit === 'notch') return 'notch';
  return unit;
}

function formatGrindTextForDisplay(value: string, language?: string) {
  const id = isIndonesianAiBrewLanguage(language || '');
  return value
    .replace(
      /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(clicks|turns|numbers|settings|steps|notches|notch)\b/gi,
      (_match, min: string, max: string, unit: string) => {
        const label = localizeGrindUnitLabel(unit, language);
        const range = `${formatGrindSettingValue(min)}-${formatGrindSettingValue(max)}`;
        return id ? `${label} ${range}` : `${range} ${label}`;
      },
    )
    .replace(
      /\b(clicks|turns|numbers|settings|steps|notches|notch)\s+(\d+(?:\.\d+)?)(?!\s*-)/gi,
      (_match, unit: string, setting: string) => {
        const label = localizeGrindUnitLabel(unit, language);
        const formatted = formatGrindSettingValue(setting);
        return id ? `${label} ${formatted}` : `${formatted} ${label}`;
      },
    )
    .replace(/\b(clicks|turns|numbers|settings|steps|notches|notch)\b/gi, (unit) =>
      localizeGrindUnitLabel(unit, language),
    );
}

function formatGrindHeadlineForDisplay(value: string, language?: string) {
  const id = isIndonesianAiBrewLanguage(language || '');
  const firstSentence = value
    .split(/\.\s+(?:Correction range|If sour\/thin|If bitter\/dry\/stalled|Bias)\b/i)[0]
    ?.trim() || value.trim();
  return formatGrindTextForDisplay(firstSentence, language)
    .replace(/\bStarting grind:/gi, id ? 'Gilingan awal:' : 'Starting grind:')
    .replace(/\bReference official grinder chart\b/gi, id ? 'Lihat chart resmi grinder' : 'Reference official grinder chart');
}

function getAiCoachTitle(copy: CopySet, mode: AiCoachMode) {
  switch (mode) {
    case 'explain':
      return copy.explain;
    case 'troubleshoot':
      return copy.troubleshoot;
    case 'rewrite':
      return copy.rewriteGuide;
    case 'deep_analysis':
      return copy.deepAnalysis;
    case 'adjust':
    default:
      return copy.adjust;
  }
}

function mapCoachModeToGuardAction(mode: AiCoachMode): 'explain' | 'troubleshoot' | 'adjust' {
  if (mode === 'troubleshoot') return 'troubleshoot';
  if (mode === 'adjust') return 'adjust';
  return 'explain';
}

function mapCoachModeToAiNotesKey(mode: AiCoachMode): keyof NonNullable<BrewPlan['aiNotes']> {
  if (mode === 'rewrite') return 'rewrite';
  if (mode === 'deep_analysis') return 'deepAnalysis';
  return mode;
}

function mapCoachModeToEngineMode(mode: AiCoachMode): AiBrewEngineMode {
  switch (mode) {
    case 'troubleshoot':
      return 'ai_assist_taste_fix';
    case 'rewrite':
      return 'ai_assist_rewrite';
    case 'deep_analysis':
      return 'ai_assist_deep_analysis';
    case 'adjust':
      return 'strict_hybrid_optimization';
    case 'explain':
    default:
      return 'ai_assist_explain';
  }
}

function buildAiAssistCacheKey(plan: BrewPlan, mode: AiCoachMode, language: string) {
  return `${AI_BREW_ASSIST_PROMPT_VERSION}:${plan.fingerprint}:${mode}:${language}`;
}

function selectDefaultAiResponse(
  copy: CopySet,
  aiNotes?: BrewPlan['aiNotes'],
  plan?: BrewPlan,
  language?: string,
) {
  if (aiNotes) {
    const orderedModes: AiCoachMode[] = ['explain', 'troubleshoot', 'rewrite', 'deep_analysis', 'adjust'];
    for (const mode of orderedModes) {
      const markdown = aiNotes[mapCoachModeToAiNotesKey(mode)];
      if (typeof markdown !== 'string' || !markdown) continue;
      const guardAction = mapCoachModeToGuardAction(mode);
      const guarded = plan
        ? sanitizeAiCoachMarkdown({ action: guardAction, markdown, plan })
        : { markdown, risk: 'none' as const, replacements: [] };
      const localizedMarkdown = localizeAiBrewMarkdownLanguage(guarded.markdown, language);
      return {
        title: getAiCoachTitle(copy, mode),
        markdown: plan && hasAiBrewLanguageLeak(localizedMarkdown, language)
          ? buildDeterministicAiCoachMarkdown(plan, guardAction, language)
          : localizedMarkdown,
      };
    }
  }
  if (!plan) return null;
  return {
    title: getAiCoachTitle(copy, 'explain'),
    markdown: buildDeterministicAiCoachMarkdown(plan, 'explain', language),
  };
}

function mergeAiNotesIntoPlan(currentPlan: BrewPlan, patch: NonNullable<BrewPlan['aiNotes']>) {
  return {
    ...currentPlan,
    aiNotes: {
      ...(currentPlan.aiNotes || {}),
      ...patch,
    },
  } satisfies BrewPlan;
}

function createHybridAiSequenceProgress(
  plan: BrewPlan,
  previous: AiBrewGenerationProgress | null,
): AiBrewGenerationProgress {
  return {
    id: 'hybrid_ai_sequence',
    progressRatio: 6 / AI_BREW_GENERATION_STAGES.length,
    currentAccuracyScore: previous?.currentAccuracyScore ?? 92,
    confidenceBand: previous?.confidenceBand ?? 'high',
    inputFitScore: previous?.inputFitScore ?? 100,
    referenceStrengthScore: previous?.referenceStrengthScore ?? 92,
    standardsScore: previous?.standardsScore,
    metrics: {
      catalogVersion: plan.catalogVersion,
      normalizedInputCount: previous?.metrics.normalizedInputCount ?? 7,
      totalCoreInputs: previous?.metrics.totalCoreInputs ?? 7,
      optionalSignalCount: previous?.metrics.optionalSignalCount ?? 0,
      totalOptionalSignals: previous?.metrics.totalOptionalSignals ?? 7,
      resolvedReferenceCount: previous?.metrics.resolvedReferenceCount ?? 3,
      totalReferenceSignals: previous?.metrics.totalReferenceSignals ?? 3,
      waterReady: true,
      targetProfileId: plan.targetProfileId,
      targetProfileLabel: plan.targetProfileLabel,
      waterBrandLabel: plan.waterBrandLabel,
      deviceProfileMode: plan.deviceProfileMode,
      deviceProfileLabel: plan.deviceProfileLabel,
      grinderVerification: plan.grindSettingVerification,
      grinderRangeLabel: plan.grindBandLabel,
      ratio: plan.recommendedRatio,
      totalWaterMl: plan.totalWaterMl,
      waterTempC: plan.waterTempC,
      totalTimeSeconds: plan.totalTimeSeconds,
      stepCount: plan.steps.length,
      standardsHits: plan.conformance.standardsHits.length,
      standardsMisses: plan.conformance.standardsMisses.length,
      warningCount: plan.warnings.length,
    },
  };
}

function withLanguageLock(promptBody: string, language: string) {
  if (/^id(?:-|$)/i.test(language)) {
    return `${promptBody}\n\nKunci bahasa: jawab sepenuhnya dalam Bahasa Indonesia. Jangan gunakan bahasa lain untuk judul, bullet, label, catatan, maupun fallback. Nama alat, nama brand, istilah umum seperti bloom/server/bed, dan satuan tetap boleh dipertahankan. Gunakan "air turun" untuk drawdown dan "buka katup" untuk release. Pertahankan struktur heading, bullet, dan angka secara konsisten.`;
  }
  if (/^ar(?:-|$)/i.test(language)) {
    return `${promptBody}\n\nقفل اللغة: أجب بالكامل باللغة العربية. لا تستخدم أي لغة أخرى في العناوين أو النقاط أو التسميات أو الملاحظات أو النصوص الاحتياطية. حافظ على بنية العناوين والنقاط والأرقام كما هي.`;
  }
  return promptBody + '\n\nLanguage lock: respond fully in ' + language + '. Keep all headings, bullets, and numbers structurally consistent.';
}

function localizeAiBrewMarkdownLanguage(markdown: string, language: string) {
  if (!isIndonesianAiBrewLanguage(language) || !markdown.trim()) return markdown;
  const headingMap: Record<string, string> = {
    '## Service Pattern': '## Pola Seduh',
    '## Sequence': '## Urutan Seduh',
    '## Watch': '## Pantau',
    '## Quick Dial': '## Setelan Cepat',
    '## Control Points': '## Titik Kontrol',
    '## Why It Fits': '## Kenapa Cocok',
    '## Focus': '## Fokus',
    '## Steps': '## Langkah',
    '### Why it fits': '### Kenapa cocok',
    '### Why It Fits': '### Kenapa cocok',
    '### What to protect': '### Yang perlu dijaga',
    '### Source notes': '### Catatan sumber',
  };

  return markdown
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      const heading = headingMap[trimmed];
      if (heading) return line.replace(trimmed, heading);

      const prefixMatch = line.match(/^(\s*(?:[-*]\s+|\d+\.\s+)?)(.*)$/);
      const prefix = prefixMatch?.[1] || '';
      const body = prefixMatch?.[2] || line;
      const localizedBody = localizeAiBrewDynamicText(body, language)
        .replace(/\bStarting grind:/gi, 'Gilingan awal:')
        .replace(/\bCorrection range:/gi, 'Rentang koreksi:')
        .replace(/\bIf sour\/thin:/gi, 'Jika asam/tipis:')
        .replace(/\bIf bitter\/dry\/stalled:/gi, 'Jika pahit/kering/macet:')
        .replace(/\bIf bitter\/stalled:/gi, 'Jika pahit/macet:')
        .replace(/\bSource setting grind:/gi, 'Sumber setting grinder:')
        .replace(/\bGrind recommendation:/gi, 'Rekomendasi gilingan:')
        .replace(/\bTotal input\b/gi, 'Total input')
        .replace(/\bHot water\b/gi, 'Air panas')
        .replace(/\bIce in server\b/gi, 'Es di server')
        .replace(/\bEstimated cup output\b/gi, 'Estimasi hasil cangkir')
        .replace(/\bFinal ratio\b/gi, 'Rasio final')
        .replace(/\bBrew time\b/gi, 'Waktu seduh')
        .replace(/\bTemperature\b/gi, 'Suhu')
        .replace(/\bWatch\b/gi, 'Pantau')
        .replace(/\bService Pattern\b/gi, 'Pola seduh')
        .replace(/\bSequence\b/gi, 'Urutan seduh')
        .replace(/\bControl Points\b/gi, 'Titik kontrol')
        .replace(/\bQuick Dial\b/gi, 'Setelan cepat');
      return `${prefix}${localizedBody}`;
    })
    .join('\n');
}

function hasAiBrewLanguageLeak(markdown: string, language: string) {
  if (!isIndonesianAiBrewLanguage(language) || !markdown.trim()) return false;
  return [
    /^#{2,3}\s+(Service Pattern|Sequence|Watch|Quick Dial|Control Points|Why It Fits|Focus|Steps)\b/im,
    /\b(Starting grind|Correction range|If sour\/thin|If bitter\/dry\/stalled|Estimated cup output|Brew time|Hot water|Ice in server)\b/i,
    /\b(Answer|Analysis|Recommendation|Trade-off|What to watch)\b/i,
  ].some((pattern) => pattern.test(markdown));
}

function isAiBrewGenericFailureMarkdown(markdown: string) {
  const value = String(markdown || '').trim().toLowerCase();
  if (!value) return true;
  const firstBlock = value.split(/\n{2,}/)[0]?.trim() || value;
  if (firstBlock.length > 240) return false;
  return [
    'maaf, permintaan',
    'belum bisa diproses',
    'silakan coba lagi',
    'coba lagi ya',
    'sorry, i could not process',
    'please try again',
    'ai service unavailable',
    'layanan ai tidak tersedia',
    'deep mode is unavailable',
    'mode deep tidak tersedia',
  ].some((snippet) => firstBlock.includes(snippet));
}

async function normalizeMarkdownToLanguage(
  markdown: string,
  language: string,
  requestContext: any,
  options?: { timeoutMs?: number },
) {
  if (!markdown.trim()) return markdown;
  if (/^en(?:-|$)/i.test(language)) return markdown;
  const translationPrompt = [
    'Translate the markdown below fully into ' + language + ' using concise, natural barista language.',
    'Keep structure exactly: headings, list numbering, line breaks, and all numeric values unchanged.',
    'For Indonesian, keep it friendly and practical; avoid stiff literal wording.',
    'Do not add commentary. Return only translated markdown.',
    '',
    markdown,
  ].join('\n');
  try {
    const { raceChatResponse } = await import('../../services/gemini');
    const translated = await raceChatResponse(translationPrompt, requestContext, {
      timeoutMs: options?.timeoutMs,
      fallbackToStructured: false,
    });
    return localizeAiBrewMarkdownLanguage(translated?.trim() || markdown, language);
  } catch {
    return localizeAiBrewMarkdownLanguage(markdown, language);
  }
}

async function normalizeSequenceMarkdownToLanguage(
  markdown: string,
  language: string,
  requestContext: any,
  options?: { timeoutMs?: number },
) {
  if (!markdown.trim()) return markdown;
  if (/^en(?:-|$)/i.test(language)) return markdown;
  const translationPrompt = [
    'Translate the markdown below fully into ' + language + ' using concise, natural barista language.',
    'For Indonesian, translate these headings exactly as: ## Pola Seduh, ## Urutan Seduh, ## Pantau.',
    'For every numbered Sequence line, keep the deterministic checkpoint prefix unchanged through the operation text, including pour, wait, release, drawdown, and all ml/time targets.',
    'Translate only the control instruction after that fixed checkpoint prefix.',
    'Keep numbering, line order, and all numeric values unchanged.',
    'Use short service-ready sentences. For Indonesian, prefer natural terms like "tuang", "target", "bed", "server", "air turun", and "buka katup"; avoid stiff textbook phrasing.',
    'Return only translated markdown.',
    '',
    markdown,
  ].join('\n');
  try {
    const { raceChatResponse } = await import('../../services/gemini');
    const translated = await raceChatResponse(translationPrompt, requestContext, {
      timeoutMs: options?.timeoutMs,
    });
    return localizeAiBrewMarkdownLanguage(translated?.trim() || markdown, language);
  } catch {
    return localizeAiBrewMarkdownLanguage(markdown, language);
  }
}

function stripSequenceBullets(lines: string[]) {
  return lines
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter(Boolean);
}

function looksLikeUnstrippedSequenceInstruction(plan: BrewPlan, instruction: string, index: number) {
  const step = plan.steps[index];
  const normalized = instruction.trim().toLowerCase();
  if (!step || !normalized) return true;
  if (/^\d+\.\s+/.test(normalized)) return true;
  if (normalized.startsWith(`${step.label.toLowerCase()} at `)) return true;
  if (normalized.includes(formatTime(step.startSeconds)) && /\b(?:ml|pour|tuang|target|wait|hold|release|drawdown|buka|tahan)\b/i.test(normalized)) {
    return true;
  }
  return false;
}

function resolveDisplaySequenceOverlay(plan: BrewPlan, canonicalMarkdown: string, displayMarkdown: string, language: string) {
  const canonicalOverlay = extractSequenceOverlayFromMarkdown(plan, canonicalMarkdown);
  const localizedOverlay = extractSequenceOverlayFromMarkdown(plan, displayMarkdown);
  const canonicalServicePattern = stripSequenceBullets(canonicalOverlay.servicePattern);
  const canonicalWatch = stripSequenceBullets(canonicalOverlay.watch);
  const servicePattern = stripSequenceBullets(localizedOverlay.servicePattern);
  const watch = stripSequenceBullets(localizedOverlay.watch);

  return {
    servicePattern: servicePattern.length > 0 ? servicePattern : canonicalServicePattern,
    watch: watch.length > 0 ? watch : canonicalWatch,
    stepInstructions: localizedOverlay.steps.map((step, index) => {
      const fallbackInstruction = localizeAiBrewDynamicText(
        canonicalOverlay.steps[index]?.instruction || plan.steps[index]?.note || step.instruction,
        language,
      );
      if (looksLikeUnstrippedSequenceInstruction(plan, step.instruction, index)) {
        return fallbackInstruction;
      }
      return localizeAiBrewDynamicText(step.instruction, language);
    }),
  };
}

function applyHybridSequenceToPlan(
  currentPlan: BrewPlan,
  params: {
    canonicalMarkdown: string;
    displayMarkdown: string;
    servicePattern: string[];
    watch: string[];
    stepInstructions: string[];
  },
) {
  return {
    ...currentPlan,
    steps: currentPlan.steps.map((step, index) => ({
      ...step,
      hybridInstruction: params.stepInstructions[index] || step.hybridInstruction || step.note,
    })),
    aiNotes: {
      ...(currentPlan.aiNotes || {}),
      sequence: params.displayMarkdown,
      sequenceCanonical: params.canonicalMarkdown,
      sequenceServicePattern: params.servicePattern,
      sequenceWatch: params.watch,
    },
  } satisfies BrewPlan;
}

function shouldRetryHybridSequence(errors: string[]) {
  const joined = errors.join(' | ').toLowerCase();
  return Boolean(
    joined.includes('response is too short')
    || joined.includes('missing required heading')
    || joined.includes('got 0')
    || joined.includes('ai response indicated service unavailability')
    || joined.includes('ai response timed out'),
  );
}

async function runHybridSequenceUpdate(
  nextPlan: BrewPlan,
  options: {
    enabled: boolean;
    platform: 'web' | 'pwa';
    language: string;
  },
) {
  if (!options.enabled) return null;

  const canonicalRequestContext = {
    responseProfile: {
      language: 'en',
      verbosity: 'comprehensive' as const,
      format: 'steps' as const,
      tone: 'professional' as const,
    },
    clientContext: {
      platform: options.platform,
      surface: 'tools' as const,
      feature: 'ai_brew' as const,
      appLanguage: options.language,
    },
  };

  const { buildSequenceGuidePrompt, buildSequenceRepairPrompt } = await import('./prompts');
  const { balancedResponseDetailed, raceChatResponse } = await import('../../services/gemini');
  const sequencePrompt = buildSequenceGuidePrompt(nextPlan).body;
  let aiText = await raceChatResponse(
    sequencePrompt,
    canonicalRequestContext,
    {
      timeoutMs: AI_BREW_HYBRID_SEQUENCE_TIMEOUT_MS,
      fallbackToStructured: false,
    },
  );

  let canonicalOverlay = composeHybridSequenceOverlay(nextPlan, aiText);
  if (canonicalOverlay.usedFallback && shouldRetryHybridSequence(canonicalOverlay.validation.errors)) {
    try {
      const repairPrompt = buildSequenceRepairPrompt(
        nextPlan,
        canonicalOverlay.validation.errors,
        'en',
      ).body;
      const repair = await balancedResponseDetailed(
        repairPrompt,
        canonicalRequestContext,
        {
          timeoutMs: AI_BREW_HYBRID_REPAIR_TIMEOUT_MS,
          fallbackToChat: false,
        },
      );
      aiText = repair.text;
      canonicalOverlay = composeHybridSequenceOverlay(nextPlan, aiText);
    } catch {
      // Keep the deterministic fallback from the first pass.
    }
  }
  const displayMarkdown = await normalizeSequenceMarkdownToLanguage(
    canonicalOverlay.markdown,
    options.language,
    {
      ...canonicalRequestContext,
      responseProfile: {
        language: options.language,
        verbosity: 'comprehensive' as const,
        format: 'steps' as const,
        tone: 'professional' as const,
      },
    },
    { timeoutMs: AI_BREW_SEQUENCE_TRANSLATION_TIMEOUT_MS },
  );
  const guardedDisplay = sanitizeAiCoachMarkdown({
    action: 'sequence',
    markdown: displayMarkdown,
    plan: nextPlan,
  });
  const safeDisplayMarkdown = guardedDisplay.risk === 'high' || hasAiBrewLanguageLeak(guardedDisplay.markdown, options.language)
    ? localizeAiBrewMarkdownLanguage(canonicalOverlay.markdown, options.language)
    : guardedDisplay.markdown;
  const displayOverlay = resolveDisplaySequenceOverlay(nextPlan, canonicalOverlay.markdown, safeDisplayMarkdown, options.language);

  const fallbackDiagnostics = [
    ...(canonicalOverlay.usedFallback
      ? [
          `AI sequence fallback: ${canonicalOverlay.validation.errors.join(' | ') || canonicalOverlay.validation.warnings.join(' | ') || 'invalid_narrative'}.`,
        ]
      : []),
  ];

  return {
    markdown: safeDisplayMarkdown,
    canonicalMarkdown: canonicalOverlay.markdown,
    servicePattern: displayOverlay.servicePattern,
    watch: displayOverlay.watch,
    stepInstructions: displayOverlay.stepInstructions,
    fallbackDiagnostics,
  };
}

async function runHybridOptimizationUpdate(
  nextPlan: BrewPlan,
  options: {
    enabled: boolean;
    platform: 'web' | 'pwa';
    language: string;
    repair?: boolean;
  },
) {
  if (!options.enabled) {
    return applyAiBrewOptimizationPatch(nextPlan, null);
  }

  const canonicalRequestContext = {
    responseProfile: {
      language: 'en',
      verbosity: 'comprehensive' as const,
      format: 'plain' as const,
      tone: 'professional' as const,
    },
    clientContext: {
      platform: options.platform,
      surface: 'tools' as const,
      feature: 'ai_brew' as const,
      appLanguage: options.language,
    },
  };

  const { buildOptimizationPrompt } = await import('./prompts');
  const { raceChatResponse } = await import('../../services/gemini');
  const { parseAiBrewOptimizationPatch } = await import('./aiOptimizer');
  const aiText = await raceChatResponse(
    `${buildOptimizationPrompt(nextPlan, options.language).body}${
      options.repair
        ? '\n\nRepair pass: the previous response did not create a validated numeric delta. Return JSON only with at least one small safe numeric change inside the allowed guardrails.'
        : ''
    }`,
    canonicalRequestContext,
    {
      timeoutMs: AI_BREW_HYBRID_OPTIMIZATION_TIMEOUT_MS,
      fallbackToStructured: false,
    },
  );

  return applyAiBrewOptimizationPatch(nextPlan, parseAiBrewOptimizationPatch(aiText));
}

function nowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nextAnimationFrame(delayMs = 45) {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(resolve, delayMs);
    });
  });
}

function buildRecipeFromPlan(plan: BrewPlan, locale?: string): Recipe {
  return {
    name: buildLocalizedPlanRecipeName(plan, locale),
    description: buildLocalizedPlanRecipeDescription(plan, locale),
    ingredients: buildPlanRecipeIngredients(plan, locale),
    steps: buildLocalizedPlanRecipeSteps(plan, locale),
    difficulty: 'Medium',
    time: formatTime(getPlanExtractionSeconds(plan)),
    dose: formatRoundedGrams(plan.doseG),
    water: formatRoundedMl(plan.totalWaterMl),
    temperature: formatRoundedTemperature(plan.waterTempC),
    grind: formatGrindTextForDisplay(plan.grindRecommendation, locale),
    brewStyle: 'manual_brew',
    aiBrew: buildPlanRecipeMetadata(plan),
  };
}

function formatVerification(copy: CopySet, verification: VerificationLevel) {
  switch (verification) {
    case 'official':
      return copy.verifiedOfficial;
    case 'community_verified':
      return copy.verifiedCommunity;
    case 'curated':
      return copy.verifiedCurated;
    case 'fallback':
      return copy.verifiedFallback;
    case 'dataset_unverified':
    default:
      return copy.verifiedDataset;
  }
}

function formatReviewStatus(copy: CopySet, status?: BrewPlan['processReviewStatus']) {
  switch (status) {
    case 'fresh':
      return copy.reviewFresh;
    case 'needs_review':
      return copy.reviewNeedsReview;
    case 'conflicting':
      return copy.reviewConflicting;
    case 'deprecated':
      return copy.reviewDeprecated;
    default:
      return '';
  }
}

function formatTaxonomyBadge(value: string | undefined) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function buildProcessBadges(copy: CopySet, entry: ProcessCatalogEntry) {
  const badges = [
    formatVerification(copy, entry.verificationLevel),
    entry.confidence === 'low' ? copy.lowConfidence : '',
    formatReviewStatus(copy, entry.reviewStatus),
    entry.processRisk?.variability === 'high' ? copy.highVariability : '',
  ].filter(Boolean);
  return Array.from(new Set(badges)).slice(0, 4);
}

function buildVarietyBadges(copy: CopySet, entry: VarietyCatalogEntry) {
  const species = formatTaxonomyBadge(entry.taxonomy?.species);
  const lineage = formatTaxonomyBadge(entry.taxonomy?.lineageGroup);
  const badges = [
    formatVerification(copy, entry.verificationLevel),
    entry.confidence === 'low' ? copy.lowConfidence : '',
    formatReviewStatus(copy, entry.reviewStatus),
    species ? `${copy.species}: ${species}` : '',
    lineage && lineage !== 'Unknown' ? `${copy.lineage}: ${lineage}` : '',
  ].filter(Boolean);
  return Array.from(new Set(badges)).slice(0, 5);
}

function formatDeviceProfileMode(copy: CopySet, mode: BrewPlan['deviceProfileMode']) {
  switch (mode) {
    case 'derived_template':
      return copy.derivedTemplateProfile;
    case 'family_fallback':
      return copy.fallbackProfile;
    case 'exact':
    default:
      return copy.exactProfile;
  }
}

function formatGrindSettingMode(copy: CopySet, mode: BrewPlan['grindSettingMode']) {
  switch (mode) {
    case 'derived_baseline':
      return copy.grindDerivedBaseline;
    case 'catalog_reference':
    default:
      return copy.grindCatalogReference;
  }
}

function formatWaterPresetStatus(copy: CopySet, status: WaterPresetStatus) {
  switch (status) {
    case 'autofill':
      return copy.waterAutofill;
    case 'manual_required':
      return copy.waterManualRequired;
    case 'info_only':
    default:
      return copy.waterInfoOnly;
  }
}

function formatBrewFeedbackRating(copy: CopySet, rating: BrewTasteFeedbackRating) {
  switch (rating) {
    case 'great':
      return copy.feedbackGreat;
    case 'sour':
      return copy.feedbackSour;
    case 'bitter':
      return copy.feedbackBitter;
    case 'thin':
      return copy.feedbackThin;
    case 'flat':
      return copy.feedbackFlat;
    case 'muddy':
      return copy.feedbackMuddy;
    case 'astringent':
    default:
      return copy.feedbackAstringent;
  }
}

function sanitizeBrewFeedbackNote(value: string) {
  return value.trim().replace(/\s+/g, ' ').slice(0, AI_BREW_FEEDBACK_NOTE_MAX_LENGTH);
}

function translateTargetProfileLabel(copy: CopySet, profileId: string) {
  if (profileId === 'balance_clean') return copy.balance;
  if (profileId === 'more_sweetness') return copy.sweetness;
  if (profileId === 'more_acidity') return copy.acidity;
  if (profileId === 'more_body') return copy.body;
  if (profileId === 'floral_transparent') return copy.floralTransparent;
  if (profileId === 'fruit_forward') return copy.fruitForward;
  if (profileId === 'soft_round') return copy.softRound;
  if (profileId === 'dense_comforting') return copy.denseComforting;
  return copy.balance;
}

function formatGenerationRatio(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return `1:${value.toFixed(1)}`;
}

function getGenerationStageDetail(
  progress: AiBrewGenerationProgress | null,
  copy: CopySet,
  language: string,
) {
  if (!progress) {
    return isIndonesianAiBrewLanguage(language)
      ? 'Menyiapkan input.'
      : 'Preparing inputs.';
  }

  const id = isIndonesianAiBrewLanguage(language);
  const { metrics } = progress;
  const targetLabel = localizeAiBrewTargetProfile(metrics.targetProfileId, metrics.targetProfileLabel, language);
  const ratioLabel = formatGenerationRatio(metrics.ratio);
  const waterLabel = typeof metrics.totalWaterMl === 'number' ? formatRoundedMl(metrics.totalWaterMl) : '--';
  const tempLabel = typeof metrics.waterTempC === 'number' ? formatRoundedTemperature(metrics.waterTempC) : '--';
  const timeLabel = typeof metrics.totalTimeSeconds === 'number' ? formatGuideTime(metrics.totalTimeSeconds) : '--';
  const verificationLabel = metrics.grinderVerification
    ? formatVerification(copy, metrics.grinderVerification)
    : (id ? 'menunggu referensi grinder' : 'waiting for grinder reference');

  switch (progress.id) {
    case 'validate_input':
      return id
        ? `Cek input ${metrics.normalizedInputCount}/${metrics.totalCoreInputs}.`
        : `Checking ${metrics.normalizedInputCount}/${metrics.totalCoreInputs} inputs.`;
    case 'match_device_profile':
      return id
        ? `Target ${targetLabel}.`
        : `Target ${targetLabel}.`;
    case 'resolve_grinder_settings':
      return id
        ? `Giling ${metrics.grinderRangeLabel || verificationLabel}.`
        : `Grind ${metrics.grinderRangeLabel || verificationLabel}.`;
    case 'compute_brew_variables':
      return id
        ? `${ratioLabel} | ${waterLabel} | ${tempLabel} | ${timeLabel}.`
        : `${ratioLabel} | ${waterLabel} | ${tempLabel} | ${timeLabel}.`;
    case 'build_sequence':
      return id
        ? `${metrics.stepCount || 0} checkpoint siap.`
        : `${metrics.stepCount || 0} checkpoints ready.`;
    case 'hybrid_ai_sequence':
      return id
        ? 'AI mengoptimasi seduhan.'
        : 'AI is optimizing the brew.';
    case 'run_standards_checks':
    default:
      return id
        ? `Guardrail ${metrics.standardsHits || 0} lolos, ${metrics.warningCount || 0} catatan.`
        : `Guardrails ${metrics.standardsHits || 0} passed, ${metrics.warningCount || 0} notes.`;
  }
}

function normalizeAiBrewInstructionText(value: string) {
  return String(value || '')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type AiBrewDisplayStep = BrewPlan['steps'][number] | WorkflowGuideStep;

function isWorkflowGuideStep(step: AiBrewDisplayStep): step is WorkflowGuideStep {
  return Array.isArray((step as WorkflowGuideStep).sourceStepIds)
    && typeof (step as WorkflowGuideStep).actionType === 'string';
}

function getAiBrewWorkflowGuideSteps(plan: BrewPlan): WorkflowGuideStep[] {
  return plan.workflowGuideSteps?.length ? plan.workflowGuideSteps : buildWorkflowAwareGuideSteps(plan);
}

function getAiBrewStepKind(step: AiBrewDisplayStep) {
  return step.kind || 'pour';
}

function localizeWorkflowChipLabel(chip: WorkflowGuideTechniqueChip, language: string) {
  const id = isIndonesianAiBrewLanguage(language);
  if (!id) return chip.label;
  switch (chip.key) {
    case 'flow':
      return 'Aliran';
    case 'path':
      return 'Jalur';
    case 'height':
      return 'Tinggi';
    case 'agitation':
      return 'Agitasi';
    case 'charge':
      return 'Isi air';
    case 'stir':
      return 'Aduk';
    case 'swirl':
      return 'Swirl';
    case 'steep':
      return 'Rendam';
    case 'press':
      return 'Tekan';
    case 'stop':
      return 'Berhenti';
    case 'boiler':
      return 'Boiler';
    case 'basket':
      return 'Basket';
    case 'heat':
      return 'Panas';
    case 'flow_cue':
      return 'Cue aliran';
    case 'yield':
      return 'Hasil';
    case 'shot_time':
      return 'Waktu shot';
    case 'puck_prep':
      return 'Siapkan puck';
    case 'settle':
      return 'Endapkan';
    case 'decant':
      return 'Pindahkan';
    case 'release':
      return 'Buka katup';
    case 'valve':
      return 'Katup';
    case 'chamber':
      return 'Ruang';
    case 'chamber_load':
      return 'Muatan ruang';
    case 'programme':
      return 'Program';
    case 'drawdown':
      return 'Air turun';
    case 'draw_up':
      return 'Air naik';
    case 'contact':
      return 'Kontak';
    case 'dose_per_liter':
      return 'Dosis/L';
    case 'basket_prep':
      return 'Siapkan';
    case 'spray':
      return 'Semprotan';
    case 'mix_batch':
      return 'Aduk batch';
    case 'saturation':
      return 'Saturasi';
    case 'filter':
      return 'Saring';
    case 'dilution':
      return 'Dilusi';
    default:
      return chip.label;
  }
}

function localizeWorkflowChipValue(value: string, language: string) {
  if (!isIndonesianAiBrewLanguage(language)) {
    return value.replace(/_/g, '-');
  }
  return value
    .replace(/center_to_mid/g, 'tengah-ke-mid')
    .replace(/flat_center/g, 'flat-center')
    .replace(/compact_spiral/g, 'spiral ringkas')
    .replace(/immersion_charge/g, 'charge immersion')
    .replace(/heat_control/g, 'kontrol panas')
    .replace(/machine_flow/g, 'flow mesin')
    .replace(/closed/g, 'tertutup')
    .replace(/open/g, 'terbuka')
    .replace(/bloom then immersion/g, 'bloom lalu immersion')
    .replace(/immersion then percolation/g, 'immersion lalu perkolasi')
    .replace(/percolation then immersion/g, 'perkolasi lalu immersion')
    .replace(/temperature shift hybrid/g, 'hybrid suhu bertahap')
    .replace(/competition hybrid/g, 'hybrid kompetisi')
    .replace(/\blow\b/g, 'rendah')
    .replace(/\bmedium\b/g, 'sedang')
    .replace(/\bcontrolled\b/g, 'terkontrol')
    .replace(/before hiss/g, 'sebelum hiss')
    .replace(/before sputter/g, 'sebelum sputter')
    .replace(/below valve/g, 'di bawah valve')
    .replace(/di bawah valve/g, 'di bawah katup')
    .replace(/level, no tamp/g, 'rata, jangan tamp')
    .replace(/steady stream/g, 'aliran stabil')
    .replace(/after filtration/g, 'setelah filtrasi')
    .replace(/before service/g, 'sebelum sajikan')
    .replace(/open cleanly/g, 'buka bersih')
    .replace(/all grounds/g, 'semua bubuk');
}

function formatAiBrewConfidenceLabel(value: string | undefined, language: string) {
  if (!isIndonesianAiBrewLanguage(language)) return value || '';
  switch ((value || '').toLowerCase()) {
    case 'high':
      return 'tinggi';
    case 'medium':
      return 'sedang';
    case 'low':
      return 'rendah';
    default:
      return value || '';
  }
}

function formatBeanCoverageLabel(
  category: NonNullable<BrewPlan['beanCoverage']>['category'],
  fallbackLabel: string,
  language: string,
) {
  if (!isIndonesianAiBrewLanguage(language)) return fallbackLabel;
  switch (category) {
    case 'known_high':
      return 'Data bean lengkap';
    case 'partial_medium':
      return 'Data bean sebagian';
    case 'unknown_fallback':
      return 'Bean belum lengkap';
    case 'risk_caution':
      return 'Perlu hati-hati';
    case 'unsupported_unsafe':
      return 'Kombinasi tidak aman';
    default:
      return fallbackLabel;
  }
}

function buildWorkflowGuideActionText(step: WorkflowGuideStep, language: string, plan?: BrewPlan) {
  if (!isIndonesianAiBrewLanguage(language)) return step.primaryText;
  const target = formatRoundedMl(step.targetVolumeMl);
  const pour = formatRoundedMl(step.pourVolumeMl);
  switch (step.actionType) {
    case 'rinse_preheat':
    case 'setup':
      return plan?.brewMode === 'iced'
        ? `Bilas/panaskan alat, tara timbangan, lalu siapkan es ${formatRoundedGrams(plan.iceMl)} di server.`
        : 'Bilas/panaskan alat, tara timbangan, lalu siapkan metode sebelum seduh.';
    case 'dose':
      if (plan?.methodFamily === 'espresso') return `Dosis ${formatRoundedGrams(plan.doseG)}, distribusi rata, lalu tamp level.`;
      return `Dosis ${plan ? formatRoundedGrams(plan.doseG) : ''} dan siapkan bed sesuai metode.`;
    case 'puck_prep':
      return 'Distribusi rata, tamp level, dan bersihkan rim basket sebelum shot.';
    case 'bloom':
      return plan?.brewMode === 'iced'
        ? `Bloom ${pour}; target ${target} air panas.`
        : `Bloom ${pour}; berhenti di target ${target}.`;
    case 'pour':
      return plan?.brewMode === 'iced'
        ? `Tuang ${pour}; target ${target} air panas.`
        : `Tuang ${pour}; berhenti di target ${target}.`;
    case 'charge':
      return `Tuang ${pour || target} dan basahi bed merata.`;
    case 'stir':
      return 'Aduk 3-5x atau putar ringan, lalu hentikan agitasi.';
    case 'swirl':
      return 'Putar ringan sekali saja untuk meratakan slurry.';
    case 'steep':
      return step.endSeconds ? `Rendam sampai ${formatGuideTime(step.endSeconds)}; jangan tambah air.` : 'Rendam stabil; jangan tambah air.';
    case 'release':
      return 'Buka katup dengan bersih dan jangan aduk saat air turun.';
    case 'drawdown':
      return plan?.brewMode === 'iced'
        ? `Biarkan air turun selesai di target ${formatRoundedMl(plan.hotWaterMl)} air panas; jangan tambah bypass.`
        : 'Biarkan air turun selesai natural tanpa tuangan tambahan.';
    case 'press':
      return 'Tekan stabil 20-30 detik; berhenti sebelum hiss terasa kering.';
    case 'heat':
      return 'Pakai panas stabil dan moderat sesuai metode.';
    case 'monitor_flow':
      return 'Pantau aliran; jaga tetap stabil dan berhenti sesuai cue.';
    case 'extract':
      return plan?.methodFamily === 'espresso'
        ? `Mulai shot dan ekstrak sampai yield ${formatRoundedMl(plan.totalWaterMl)}.`
        : `Ekstrak sampai target ${target}.`;
    case 'stop':
      if (plan?.methodFamily === 'moka_pot') return 'Angkat sebelum sputter kasar atau rasa rebus muncul.';
      if (plan?.methodFamily === 'espresso') return `Berhenti di yield ${formatRoundedMl(plan.totalWaterMl)} sesuai window shot.`;
      return 'Berhenti sesuai cue metode; jangan paksa fase akhir.';
    case 'settle':
      return 'Pecah kerak atau skim pelan, lalu biarkan partikel halus mengendap.';
    case 'decant':
      return 'Pindahkan segera agar ekstraksi berhenti.';
    case 'filter':
      return 'Saring atau pindahkan bersih untuk memisahkan kopi dari ampas.';
    case 'dilute':
      return 'Dilusi hanya setelah filtrasi bila butuh kekuatan sajian lebih ringan.';
    case 'mix':
      return 'Aduk batch/carafe pelan sebelum evaluasi rasa atau sajikan.';
    case 'serve':
      return 'Sajikan setelah fase metode selesai bersih.';
    default:
      return localizeAiBrewDynamicText(step.primaryText, language);
  }
}

function resolveModeLabel(copy: CopySet, brewMode: string, methodFamily?: string) {
  if (methodFamily === 'cold_brew') return copy.modeCold;
  if (methodFamily === 'espresso') return copy.modeEspresso;
  return brewMode === 'iced' ? copy.modeIced : copy.modeHot;
}

function formatAiBrewStepBadge(step: AiBrewDisplayStep, language: string) {
  const id = isIndonesianAiBrewLanguage(language);
  if (isWorkflowGuideStep(step) && step.isOperationalOnly && step.pourVolumeMl <= 0) {
    switch (step.actionType) {
      case 'stir':
        return id ? 'Aduk' : 'Stir';
      case 'steep':
        return id ? 'Steep' : 'Steep';
      case 'press':
        return id ? 'Tekan' : 'Press';
      case 'heat':
        return id ? 'Panas' : 'Heat';
      case 'monitor_flow':
        return 'Flow';
      case 'stop':
        return 'Stop';
      case 'decant':
        return id ? 'Pindah' : 'Decant';
      case 'filter':
        return id ? 'Saring' : 'Filter';
      case 'dilute':
        return id ? 'Dilusi' : 'Dilute';
      case 'mix':
        return id ? 'Aduk' : 'Mix';
      default:
        return id ? 'Aksi' : 'Action';
    }
  }
  const kind = getAiBrewStepKind(step);
  if (kind === 'release') return id ? 'Buka katup' : 'Release';
  if (kind === 'wait') return id ? 'Tahan' : 'Wait';
  if (kind === 'drawdown') return id ? 'Air turun' : 'Drawdown';
  if (kind === 'press') return id ? 'Tekan' : 'Press';
  if (kind === 'heat') return id ? 'Panas' : 'Heat';
  if (kind === 'extract') return id ? 'Ekstrak' : 'Extract';
  if (kind === 'serve') return id ? 'Saji' : 'Serve';
  return `+${formatRoundedMl(step.pourVolumeMl)}`;
}

function buildAiBrewStepActionText(step: AiBrewDisplayStep, language: string, plan?: BrewPlan) {
  if (isWorkflowGuideStep(step)) return buildWorkflowGuideActionText(step, language, plan);
  const kind = getAiBrewStepKind(step);
  if (kind === 'release') {
    return isIndonesianAiBrewLanguage(language)
      ? `Buka katup dan biarkan kopi turun bersih di target ${formatRoundedMl(step.targetVolumeMl)}.`
      : `Open the release and let the brew drain cleanly at ${formatRoundedMl(step.targetVolumeMl)}.`;
  }
  if (kind === 'wait' || kind === 'drawdown') {
    return isIndonesianAiBrewLanguage(language)
      ? `Tahan kontak; jangan tambah air. Target tetap ${formatRoundedMl(step.targetVolumeMl)}.`
      : `Hold contact; do not add water. Target stays ${formatRoundedMl(step.targetVolumeMl)}.`;
  }
  if (kind === 'press') {
    return isIndonesianAiBrewLanguage(language)
      ? `Tekan perlahan; target tetap ${formatRoundedMl(step.targetVolumeMl)}.`
      : `Press slowly; target stays ${formatRoundedMl(step.targetVolumeMl)}.`;
  }
  if (kind === 'heat') {
    return isIndonesianAiBrewLanguage(language)
      ? `Panaskan stabil; target tetap ${formatRoundedMl(step.targetVolumeMl)}.`
      : `Heat steadily; target stays ${formatRoundedMl(step.targetVolumeMl)}.`;
  }
  if (kind === 'extract') {
    return isIndonesianAiBrewLanguage(language)
      ? `Ekstrak hingga yield target ${formatRoundedMl(step.targetVolumeMl)}.`
      : `Extract to target yield ${formatRoundedMl(step.targetVolumeMl)}.`;
  }
  if (kind === 'serve') {
    return isIndonesianAiBrewLanguage(language)
      ? `Pisahkan dari ampas dan sajikan. Target tetap ${formatRoundedMl(step.targetVolumeMl)}.`
      : `Separate from grounds and serve. Target stays ${formatRoundedMl(step.targetVolumeMl)}.`;
  }
  if (plan?.brewMode === 'iced' && step.pourVolumeMl > 0) {
    return isIndonesianAiBrewLanguage(language)
      ? `Tuang ${formatRoundedMl(step.pourVolumeMl)} hingga target ${formatRoundedMl(step.targetVolumeMl)} air panas.`
      : `Pour ${formatRoundedMl(step.pourVolumeMl)} to reach ${formatRoundedMl(step.targetVolumeMl)} hot water.`;
  }
  return isIndonesianAiBrewLanguage(language)
    ? `Tuang ${formatRoundedMl(step.pourVolumeMl)} hingga target ${formatRoundedMl(step.targetVolumeMl)}.`
    : `Pour ${formatRoundedMl(step.pourVolumeMl)} to reach ${formatRoundedMl(step.targetVolumeMl)}.`;
}

function buildAiBrewFlowStepSummary(step: AiBrewDisplayStep, language: string, plan?: BrewPlan) {
  if (isWorkflowGuideStep(step)) {
    const label = localizeAiBrewStepLabel(step.label, language);
    return `${formatGuideTime(step.startSeconds)} | ${label} | ${buildWorkflowGuideActionText(step, language, plan)}`;
  }
  const id = isIndonesianAiBrewLanguage(language);
  const kind = getAiBrewStepKind(step);
  if (kind === 'release') {
    return id
      ? `${formatGuideTime(step.startSeconds)} | buka katup | target ${formatRoundedMl(step.targetVolumeMl)}`
      : `${formatGuideTime(step.startSeconds)} | open release | target ${formatRoundedMl(step.targetVolumeMl)}`;
  }
  if (kind === 'wait' || kind === 'drawdown') {
    return id
      ? `${formatGuideTime(step.startSeconds)} | tahan kontak | target ${formatRoundedMl(step.targetVolumeMl)}`
      : `${formatGuideTime(step.startSeconds)} | hold contact | target ${formatRoundedMl(step.targetVolumeMl)}`;
  }
  if (kind === 'press') {
    return id
      ? `${formatGuideTime(step.startSeconds)} | tekan perlahan | target ${formatRoundedMl(step.targetVolumeMl)}`
      : `${formatGuideTime(step.startSeconds)} | press slowly | target ${formatRoundedMl(step.targetVolumeMl)}`;
  }
  if (kind === 'heat') {
    return id
      ? `${formatGuideTime(step.startSeconds)} | panaskan stabil | target ${formatRoundedMl(step.targetVolumeMl)}`
      : `${formatGuideTime(step.startSeconds)} | heat steadily | target ${formatRoundedMl(step.targetVolumeMl)}`;
  }
  if (kind === 'extract') {
    return id
      ? `${formatGuideTime(step.startSeconds)} | ekstrak | yield ${formatRoundedMl(step.targetVolumeMl)}`
      : `${formatGuideTime(step.startSeconds)} | extract | yield ${formatRoundedMl(step.targetVolumeMl)}`;
  }
  if (kind === 'serve') {
    return id
      ? `${formatGuideTime(step.startSeconds)} | sajikan | target ${formatRoundedMl(step.targetVolumeMl)}`
      : `${formatGuideTime(step.startSeconds)} | serve | target ${formatRoundedMl(step.targetVolumeMl)}`;
  }
  if (plan?.brewMode === 'iced' && step.pourVolumeMl > 0) {
    return id
      ? `${formatGuideTime(step.startSeconds)} | tuang +${formatRoundedMl(step.pourVolumeMl)} | target ${formatRoundedMl(step.targetVolumeMl)} air panas`
      : `${formatGuideTime(step.startSeconds)} | pour +${formatRoundedMl(step.pourVolumeMl)} | target ${formatRoundedMl(step.targetVolumeMl)} hot water`;
  }
  return id
    ? `${formatGuideTime(step.startSeconds)} | tuang +${formatRoundedMl(step.pourVolumeMl)} | target ${formatRoundedMl(step.targetVolumeMl)}`
    : `${formatGuideTime(step.startSeconds)} | pour +${formatRoundedMl(step.pourVolumeMl)} | target ${formatRoundedMl(step.targetVolumeMl)}`;
}

function buildAiBrewStepPrimaryCue(step: AiBrewDisplayStep, language: string, plan?: BrewPlan) {
  if (isWorkflowGuideStep(step)) return buildWorkflowGuideActionText(step, language, plan);
  const kind = getAiBrewStepKind(step);
  if (kind === 'release') {
    return isIndonesianAiBrewLanguage(language) ? 'Buka katup sekarang' : 'Open release now';
  }
  if (kind === 'wait' || kind === 'drawdown') {
    return isIndonesianAiBrewLanguage(language) ? 'Tahan, jangan tambah air' : 'Hold, no extra water';
  }
  if (kind === 'press') return isIndonesianAiBrewLanguage(language) ? 'Tekan perlahan sekarang' : 'Press slowly now';
  if (kind === 'heat') return isIndonesianAiBrewLanguage(language) ? 'Panaskan stabil' : 'Heat steadily';
  if (kind === 'extract') return isIndonesianAiBrewLanguage(language) ? 'Ekstrak sekarang' : 'Extract now';
  if (kind === 'serve') return isIndonesianAiBrewLanguage(language) ? 'Pisahkan dan sajikan' : 'Separate and serve';
  return isIndonesianAiBrewLanguage(language)
    ? `Tuang +${formatRoundedMl(step.pourVolumeMl)} sekarang`
    : `Pour +${formatRoundedMl(step.pourVolumeMl)} now`;
}

function buildAiBrewStepTargetCue(step: AiBrewDisplayStep, language: string, plan?: BrewPlan) {
  if (isWorkflowGuideStep(step)) {
    if (plan?.brewMode === 'iced' && step.pourVolumeMl > 0) {
      return isIndonesianAiBrewLanguage(language)
        ? `Target ${formatRoundedMl(step.targetVolumeMl)} air panas`
        : `Target ${formatRoundedMl(step.targetVolumeMl)} hot water`;
    }
    if (step.pourVolumeMl > 0 || step.targetVolumeMl > 0) {
      return isIndonesianAiBrewLanguage(language)
        ? `Target ${formatRoundedMl(step.targetVolumeMl)}`
        : `Target ${formatRoundedMl(step.targetVolumeMl)}`;
    }
    return isIndonesianAiBrewLanguage(language)
      ? 'Fase operasional tanpa tambah air'
      : 'Operational phase, no added water';
  }
  const kind = getAiBrewStepKind(step);
  if (kind === 'release') {
    return isIndonesianAiBrewLanguage(language)
      ? `Biarkan turun di ${formatRoundedMl(step.targetVolumeMl)}`
      : `Let it drain at ${formatRoundedMl(step.targetVolumeMl)}`;
  }
  if (kind === 'wait' || kind === 'drawdown') {
    return isIndonesianAiBrewLanguage(language)
      ? `Target tetap ${formatRoundedMl(step.targetVolumeMl)}`
      : `Target stays ${formatRoundedMl(step.targetVolumeMl)}`;
  }
  if (kind === 'extract') {
    return isIndonesianAiBrewLanguage(language)
      ? `Yield target ${formatRoundedMl(step.targetVolumeMl)}`
      : `Target yield ${formatRoundedMl(step.targetVolumeMl)}`;
  }
  if (kind === 'press' || kind === 'heat' || kind === 'serve') {
    return isIndonesianAiBrewLanguage(language)
      ? `Target tetap ${formatRoundedMl(step.targetVolumeMl)}`
      : `Target stays ${formatRoundedMl(step.targetVolumeMl)}`;
  }
  if (plan?.brewMode === 'iced' && step.pourVolumeMl > 0) {
    return isIndonesianAiBrewLanguage(language)
      ? `Berhenti di target ${formatRoundedMl(step.targetVolumeMl)} air panas`
      : `Stop at ${formatRoundedMl(step.targetVolumeMl)} hot water`;
  }
  return isIndonesianAiBrewLanguage(language)
    ? `Berhenti di target ${formatRoundedMl(step.targetVolumeMl)}`
    : `Stop at ${formatRoundedMl(step.targetVolumeMl)}`;
}

function buildAiBrewNextStepCue(step: AiBrewDisplayStep, remainingSeconds: number, language: string) {
  if (isWorkflowGuideStep(step)) {
    return isIndonesianAiBrewLanguage(language)
      ? `${localizeAiBrewStepLabel(step.label, language)} dalam ${formatGuideTime(remainingSeconds)}`
      : `${localizeAiBrewStepLabel(step.label, language)} in ${formatGuideTime(remainingSeconds)}`;
  }
  const kind = getAiBrewStepKind(step);
  if (kind === 'release') {
    return isIndonesianAiBrewLanguage(language)
      ? `Buka katup dalam ${formatGuideTime(remainingSeconds)}`
      : `Release in ${formatGuideTime(remainingSeconds)}`;
  }
  if (kind === 'wait' || kind === 'drawdown') {
    return isIndonesianAiBrewLanguage(language)
      ? `Fase tahan dalam ${formatGuideTime(remainingSeconds)}`
      : `Hold phase in ${formatGuideTime(remainingSeconds)}`;
  }
  if (kind === 'press') return isIndonesianAiBrewLanguage(language) ? `Tekan dalam ${formatGuideTime(remainingSeconds)}` : `Press in ${formatGuideTime(remainingSeconds)}`;
  if (kind === 'heat') return isIndonesianAiBrewLanguage(language) ? `Fase panas dalam ${formatGuideTime(remainingSeconds)}` : `Heat phase in ${formatGuideTime(remainingSeconds)}`;
  if (kind === 'extract') return isIndonesianAiBrewLanguage(language) ? `Ekstraksi dalam ${formatGuideTime(remainingSeconds)}` : `Extraction in ${formatGuideTime(remainingSeconds)}`;
  if (kind === 'serve') return isIndonesianAiBrewLanguage(language) ? `Sajikan dalam ${formatGuideTime(remainingSeconds)}` : `Serve in ${formatGuideTime(remainingSeconds)}`;
  return isIndonesianAiBrewLanguage(language)
    ? `Tuangan berikutnya dalam ${formatGuideTime(remainingSeconds)}`
    : `Next pour in ${formatGuideTime(remainingSeconds)}`;
}

function buildAiBrewStepQuickNote(step: AiBrewDisplayStep, language: string) {
  if (isWorkflowGuideStep(step)) return buildWorkflowGuideActionText(step, language);
  return normalizeAiBrewInstructionText(localizeAiBrewDynamicText(step.note, language));
}

function buildAiBrewStepMethodFocusCue(
  plan: BrewPlan,
  step: AiBrewDisplayStep,
  language: string,
) {
  if (isWorkflowGuideStep(step)) {
    return normalizeAiBrewInstructionText(localizeAiBrewDynamicText(step.secondaryText || step.primaryText, language));
  }
  const id = isIndonesianAiBrewLanguage(language);
  const kind = getAiBrewStepKind(step);

  switch (plan.methodFamily) {
    case 'espresso':
      if (kind === 'extract') return id ? 'Fokus: mulai shot, baca flow, dan stop hanya saat yield target tercapai.' : 'Focus: start the shot, read flow, and stop only when target yield lands.';
      return id ? 'Fokus: pisahkan espresso di target yield; jangan tambah volume setelah shot selesai.' : 'Focus: separate espresso at target yield; do not add volume after the shot.';
    case 'moka_pot':
      if (kind === 'heat') return id ? 'Fokus: panas moderat. Angkat sebelum sputter kasar atau rasa rebus muncul.' : 'Focus: moderate heat. Remove before harsh sputtering or boiled flavor appears.';
      return id ? 'Fokus: basket tetap loose, base di bawah safety valve, dan serve saat target tercapai.' : 'Focus: keep basket loose, base below safety valve, and serve when target lands.';
    case 'cold_brew':
      if (kind === 'wait') return id ? 'Fokus: steep stabil. Jangan tambah agitasi saat semua bed sudah basah.' : 'Focus: stable steep. Do not add agitation once the whole bed is wet.';
      if (kind === 'serve') return id ? 'Fokus: filter/decant bersih agar ekstraksi berhenti.' : 'Focus: filter/decant cleanly so extraction stops.';
      return id ? 'Fokus: hilangkan dry pocket sebelum steep panjang dimulai.' : 'Focus: remove dry pockets before the long steep starts.';
    case 'batch_brew':
      if (kind === 'drawdown' || kind === 'serve') return id ? 'Fokus: tunggu air turun selesai, lalu aduk batch sebelum cicip.' : 'Focus: wait for drawdown, then mix the batch before tasting.';
      return id ? 'Fokus: bed basket rata dan siklus mesin tidak diganggu.' : 'Focus: level basket bed and keep the machine cycle undisturbed.';
    case 'french_press':
      if (kind === 'press' || kind === 'serve') return id ? 'Fokus: press pelan lalu decant supaya fines berhenti mengekstrak.' : 'Focus: press slowly, then decant so fines stop extracting.';
      return id ? 'Fokus: immersion tenang. Jangan aduk agresif menjelang akhir.' : 'Focus: calm immersion. Avoid aggressive stirring near the end.';
    case 'aeropress':
      if (kind === 'press') return id ? 'Fokus: press stabil; berhenti sebelum hiss terakhir terasa dipaksa.' : 'Focus: steady press; stop before the final hiss feels forced.';
      return id ? 'Fokus: chamber basah rata dan steep tetap pendek.' : 'Focus: evenly wet chamber and keep the steep compact.';
    case 'siphon':
      if (kind === 'heat') return id ? 'Fokus: heat stabil sampai vacuum bekerja, bukan boiling agresif.' : 'Focus: stable heat until vacuum works, not aggressive boiling.';
      if (kind === 'drawdown' || kind === 'serve') return id ? 'Fokus: matikan panas dan biarkan air turun selesai tanpa agitasi tambahan.' : 'Focus: cut heat and let drawdown finish without extra agitation.';
      return id ? 'Fokus: agitasi singkat saat upper chamber aktif.' : 'Focus: brief agitation while the upper chamber is active.';
    case 'clever_dripper':
      if (kind === 'release' || kind === 'drawdown') return id ? 'Fokus: buka katup bersih dan jangan aduk saat air turun.' : 'Focus: clean release and no stirring during drawdown.';
      return id ? 'Fokus: contact time stabil; immersion jangan terlalu gelisah.' : 'Focus: stable contact time; keep immersion calm.';
    case 'chemex':
      return id ? 'Fokus: flow stabil dan hindari bypass dinding filter tebal.' : 'Focus: stable flow and avoid thick-filter wall bypass.';
    case 'kalita_wave':
    case 'april':
    case 'melitta':
      return id ? 'Fokus: flat bed tetap rata; pulse pendek lebih aman daripada flooding.' : 'Focus: keep the flat bed level; short pulses are safer than flooding.';
    default:
      return id ? 'Fokus: aliran dari tengah tetap stabil, bed rapi, dan air turun bersih.' : 'Focus: stable center-to-mid flow and clean drawdown.';
  }
}

function addUniqueAiBrewDetailPoint(points: string[], value: string) {
  const normalized = normalizeAiBrewInstructionText(value);
  if (!normalized) return;
  const key = normalized.toLowerCase();
  if (points.some((point) => point.toLowerCase() === key)) return;
  points.push(normalized);
}

function aiBrewUsesPaperFilter(plan: BrewPlan) {
  return [
    'v60',
    'chemex',
    'kalita_wave',
    'origami',
    'april',
    'melitta',
    'kono',
    'clever_dripper',
    'aeropress',
  ].includes(plan.methodFamily);
}

function buildAiBrewDeterministicStepDetailPoints(
  plan: BrewPlan,
  step: AiBrewDisplayStep,
  index: number,
  language: string,
) {
  if (isWorkflowGuideStep(step)) {
    const points: string[] = [];
    if (step.secondaryText) addUniqueAiBrewDetailPoint(points, localizeAiBrewDynamicText(step.secondaryText, language));
    if (step.warnings.length > 0) {
      step.warnings.forEach((warning) => addUniqueAiBrewDetailPoint(points, localizeAiBrewDynamicText(warning, language)));
    }
    if (plan.brewMode === 'iced' && step.pourVolumeMl > 0) {
      addUniqueAiBrewDetailPoint(
        points,
        isIndonesianAiBrewLanguage(language)
          ? `Target volume ini adalah air panas (${formatRoundedMl(plan.hotWaterMl)}), bukan total minuman.`
          : `This volume target is hot water (${formatRoundedMl(plan.hotWaterMl)}), not total beverage.`,
      );
    }
    return points.slice(0, 5);
  }
  const id = isIndonesianAiBrewLanguage(language);
  const kind = getAiBrewStepKind(step);
  const points: string[] = [];
  const isPourStep = kind === 'pour' || kind === 'extract';
  const isLastStep = index === plan.steps.length - 1;
  const isLastPour = step.pourVolumeMl > 0
    && !plan.steps.slice(index + 1).some((nextStep) => nextStep.pourVolumeMl > 0);
  const nextStep = plan.steps[index + 1];
  const isFirstPour = index === 0 && isPourStep;

  if (isFirstPour && aiBrewUsesPaperFilter(plan)) {
    addUniqueAiBrewDetailPoint(
      points,
      plan.methodFamily === 'chemex'
        ? (id
          ? 'Bilas filter Chemex sampai hangat, buang air bilasan, lalu tara timbangan sebelum kopi masuk.'
          : 'Rinse the Chemex filter until warm, discard rinse water, then tare the scale before adding coffee.')
        : (id
          ? 'Bilas filter dan panaskan alat/server dulu; buang air bilasan lalu tara timbangan sebelum mulai.'
          : 'Rinse the filter and preheat the brewer/server first; discard rinse water, then tare the scale before brewing.'),
    );
  }

  if (plan.brewMode === 'iced' && plan.iceMl > 0) {
    if (index === 0) {
      addUniqueAiBrewDetailPoint(
        points,
        id
          ? `Tara timbangan, lalu timbang ${formatRoundedGrams(plan.iceMl)} es di server sebelum mulai; bed kopi hanya menerima ${formatRoundedMl(plan.hotWaterMl)} air panas.`
          : `Tare the scale, then weigh ${formatRoundedGrams(plan.iceMl)} ice in the server before brewing; the bed only receives ${formatRoundedMl(plan.hotWaterMl)} hot water.`,
      );
    }

    if (isPourStep) {
      addUniqueAiBrewDetailPoint(
        points,
        id
          ? `Tuang ke target kumulatif ${formatRoundedMl(step.targetVolumeMl)}; jangan tambah bypass setelah target panas tercapai.`
          : `Pour to cumulative target ${formatRoundedMl(step.targetVolumeMl)}; do not add bypass after the hot target lands.`,
      );
    } else {
      addUniqueAiBrewDetailPoint(
        points,
        id
          ? `Target tetap ${formatRoundedMl(step.targetVolumeMl)}; fase ini untuk kontrol aliran, bukan menambah air.`
          : `Target stays ${formatRoundedMl(step.targetVolumeMl)}; this phase controls flow, not extra water.`,
      );
    }

    if (isLastPour || isLastStep || kind === 'drawdown' || kind === 'serve') {
      addUniqueAiBrewDetailPoint(
        points,
        id
          ? `Setelah tetesan akhir, aduk server 5-8 detik agar es dan konsentrat menyatu rata.`
          : `After the final drips, stir the server for 5-8 seconds so ice melt and concentrate integrate evenly.`,
      );
    } else if (index > 0) {
      addUniqueAiBrewDetailPoint(
        points,
        id
          ? `Jaga slurry stabil dan hindari dinding filter agar Japanese-style tetap bersih.`
          : `Keep slurry depth stable and avoid the filter wall so the Japanese-style cup stays clean.`,
      );
    }
  } else if (isPourStep) {
    addUniqueAiBrewDetailPoint(
      points,
      id
        ? `Tuangan ini harus berhenti di target kumulatif ${formatRoundedMl(step.targetVolumeMl)}.`
        : `This pour should stop at cumulative target ${formatRoundedMl(step.targetVolumeMl)}.`,
    );
  } else {
    addUniqueAiBrewDetailPoint(
      points,
      id
        ? `Jangan tambah air pada fase ini; ikuti waktu dan target yang sudah dihitung.`
        : `Do not add water in this phase; follow the calculated time and target.`,
    );
  }

  if (isFirstPour && nextStep) {
    const waitSeconds = Math.max(0, nextStep.startSeconds - step.startSeconds);
    addUniqueAiBrewDetailPoint(
      points,
      id
        ? `Bloom sampai ${formatGuideTime(nextStep.startSeconds)} sekitar ${formatGuideTime(waitSeconds)}; pastikan semua bubuk basah sebelum tuang berikutnya.`
        : `Bloom until ${formatGuideTime(nextStep.startSeconds)} for about ${formatGuideTime(waitSeconds)}; make sure all grounds are wet before the next pour.`,
    );
  }

  const methodFocusCue = buildAiBrewStepMethodFocusCue(plan, step, language);
  addUniqueAiBrewDetailPoint(points, methodFocusCue);

  return points;
}

function buildAiBrewStepDetailPoints(
  plan: BrewPlan,
  step: AiBrewDisplayStep,
  index: number,
  language: string,
) {
  const fallbackNote = buildAiBrewStepQuickNote(step, language).toLowerCase();
  const detailText = normalizeAiBrewInstructionText(
    localizeAiBrewDynamicText(step.hybridInstruction || '', language),
  );

  const points = buildAiBrewDeterministicStepDetailPoints(plan, step, index, language);

  if (!detailText || detailText.toLowerCase() === fallbackNote) return points.slice(0, 5);

  detailText
    .split(/;\s+|(?<=[.!?])\s+/)
    .map((part) => normalizeAiBrewInstructionText(part))
    .filter(Boolean)
    .filter((part) => part.toLowerCase() !== fallbackNote)
    .forEach((part) => addUniqueAiBrewDetailPoint(points, part));

  return points.slice(0, 5);
}

function formatAiBrewStepFlowRate(step: AiBrewDisplayStep) {
  const [min, max] = step.flowRateMlPerSec || [];
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '';
  return `${min}-${max} ml/s`;
}

function formatAiBrewPourPath(path: AiBrewDisplayStep['pourPath'], language: string) {
  const id = isIndonesianAiBrewLanguage(language);
  switch (path) {
    case 'center':
      return id ? 'tengah' : 'center';
    case 'center_to_mid':
      return id ? 'tengah-ke-mid' : 'center-to-mid';
    case 'flat_center':
      return 'flat-center';
    case 'compact_spiral':
      return id ? 'spiral ringkas' : 'compact spiral';
    case 'immersion_charge':
      return id ? 'charge immersion' : 'immersion charge';
    case 'press':
      return 'press';
    case 'heat_control':
      return id ? 'kontrol panas' : 'heat control';
    case 'machine_flow':
      return id ? 'flow mesin' : 'machine flow';
    default:
      return '';
  }
}

function formatAiBrewPourHeight(height: AiBrewDisplayStep['pourHeight'], language: string) {
  if (!height) return '';
  const id = isIndonesianAiBrewLanguage(language);
  return height === 'low' ? (id ? 'rendah' : 'low') : (id ? 'sedang' : 'medium');
}

function formatAiBrewAgitation(level: AiBrewDisplayStep['agitationLevel'], language: string) {
  if (!level) return '';
  const id = isIndonesianAiBrewLanguage(language);
  switch (level) {
    case 'minimal':
      return 'minimal';
    case 'low':
      return id ? 'rendah' : 'low';
    case 'controlled':
      return id ? 'terkontrol' : 'controlled';
    case 'medium':
      return id ? 'sedang' : 'medium';
    default:
      return '';
  }
}

function buildAiBrewStepMetrics(step: AiBrewDisplayStep, language: string, plan?: BrewPlan) {
  const id = isIndonesianAiBrewLanguage(language);
  const kind = getAiBrewStepKind(step);
  const icedHotTarget = plan?.brewMode === 'iced' && step.pourVolumeMl > 0;
  const metrics = [
    {
      label: id ? 'Mulai' : 'Start',
      value: formatGuideTime(step.startSeconds),
    },
  ];
  const showNumericTarget = !isWorkflowGuideStep(step) || step.pourVolumeMl > 0 || step.targetVolumeMl > 0;
  if (showNumericTarget) {
    metrics.push(
      {
        label: kind === 'pour' ? (id ? 'Tuang' : 'Pour') : kind === 'extract' ? (id ? 'Yield' : 'Yield') : (id ? 'Aksi' : 'Action'),
        value: kind === 'pour' || kind === 'extract' ? formatRoundedMl(step.pourVolumeMl) : formatAiBrewStepBadge(step, language),
      },
      {
        label: id ? 'Target' : 'Target',
        value: icedHotTarget
          ? `${formatRoundedMl(step.targetVolumeMl)} ${id ? 'air panas' : 'hot water'}`
          : formatRoundedMl(step.targetVolumeMl),
      },
    );
  }
  if (isWorkflowGuideStep(step) && step.techniqueChips.length > 0) {
    step.techniqueChips.forEach((item) => {
      metrics.push({
        label: localizeWorkflowChipLabel(item, language),
        value: localizeWorkflowChipValue(item.value, language),
      });
    });
    return metrics;
  }
  const flow = formatAiBrewStepFlowRate(step);
  const path = formatAiBrewPourPath(step.pourPath, language);
  const height = formatAiBrewPourHeight(step.pourHeight, language);
  const agitation = formatAiBrewAgitation(step.agitationLevel, language);
  if (flow) metrics.push({ label: 'Flow', value: flow });
  if (path) metrics.push({ label: id ? 'Jalur' : 'Path', value: path });
  if (height) metrics.push({ label: id ? 'Tinggi' : 'Height', value: height });
  if (agitation) metrics.push({ label: id ? 'Agitasi' : 'Agitation', value: agitation });
  return metrics;
}

function filterAiBrewStepMetricsForDensity(
  metrics: Array<{ label: string; value: string }>,
  density: AiBrewGuideDensity,
) {
  if (density === 'pro') return metrics;
  const keep = new Set(['Start', 'Mulai', 'Target', 'Pour', 'Tuang', 'Yield', 'Action', 'Aksi', 'Charge', 'Steep', 'Press', 'Stop', 'Tekan', 'Valve', 'Katup', 'Chamber', 'Ruang', 'Chamber load', 'Muatan', 'Muatan ruang', 'Programme', 'Program']);
  const filtered = metrics.filter((item) => keep.has(item.label));
  return filtered.length > 0 ? filtered.slice(0, 4) : metrics.slice(0, 2);
}

function splitAiBrewStepMetrics(
  metrics: Array<{ label: string; value: string }>,
) {
  const core = filterAiBrewStepMetricsForDensity(metrics, 'basic');
  const coreKeys = new Set(core.map((item) => `${item.label}:${item.value}`));
  const detail = metrics.filter((item) => !coreKeys.has(`${item.label}:${item.value}`));
  return { core, detail };
}

function compactAiBrewInstruction(text: string, maxLength = 132) {
  const normalized = normalizeAiBrewInstructionText(text);
  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;
  if (firstSentence.length <= maxLength) return firstSentence;
  return `${firstSentence.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function renderAiBrewStepMetricChips(
  metrics: Array<{ label: string; value: string }>,
  keyPrefix: string,
  options?: {
    className?: string;
    chipClassName?: string;
    testId?: string;
  },
) {
  if (metrics.length === 0) return null;
  const className = options?.className || 'flex flex-wrap gap-1.5';
  const chipClassName = options?.chipClassName || 'rounded-full border panel-divider-subtle bg-[var(--bg-base)] px-2.5 py-1 text-[11px] text-secondary';

  return (
    <div className={className} data-testid={options?.testId}>
      {metrics.map((item) => (
        <span
          key={`${keyPrefix}-${item.label}`}
          className={chipClassName}
        >
          <span className="mr-1 font-medium text-tertiary">{item.label}</span>
          <span className="font-semibold text-primary">{item.value}</span>
        </span>
      ))}
    </div>
  );
}

function renderAiBrewSequenceStepCard(
  plan: BrewPlan,
  step: AiBrewDisplayStep,
  index: number,
  language: string,
  density: AiBrewGuideDensity = 'pro',
  detailsDefaultOpen = false,
) {
  const localizedStepLabel = localizeAiBrewStepLabel(step.label, language);
  const stepActionText = buildAiBrewStepActionText(step, language, plan);
  const stepQuickNote = buildAiBrewStepQuickNote(step, language);
  const stepDetailPoints = buildAiBrewStepDetailPoints(plan, step, index, language);
  const stepMetrics = filterAiBrewStepMetricsForDensity(buildAiBrewStepMetrics(step, language, plan), density);
  const methodFocusCue = buildAiBrewStepMethodFocusCue(plan, step, language);
  const normalizedActionText = normalizeAiBrewInstructionText(stepActionText).toLowerCase();
  const conciseCue = methodFocusCue || stepQuickNote;
  const showConciseCue = Boolean(conciseCue) && conciseCue.toLowerCase() !== normalizedActionText;
  const stepCardClass = 'rounded-[1rem] border panel-divider-subtle panel-soft p-3 sm:p-3.5';

  return (
    <motion.div
      key={`step-card-${step.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.16 }}
      className={stepCardClass}
      data-testid={`ai-brew-step-card-${index + 1}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/12 text-xs font-semibold text-blue-700 dark:text-blue-300">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">{localizedStepLabel}</p>
              <p className="mt-1 text-sm text-secondary">{stepActionText}</p>
            </div>
            <span className="rounded-full border border-blue-500/18 bg-[var(--bg-base)] px-2.5 py-1 text-[11px] font-semibold text-primary">
              {formatAiBrewStepBadge(step, language)}
            </span>
          </div>

          {renderAiBrewStepMetricChips(stepMetrics, `${step.id}-sequence`, {
            testId: `ai-brew-step-technique-${index + 1}`,
          })}

          {showConciseCue && (
            <p className="rounded-xl border border-blue-500/14 bg-blue-500/[0.07] px-3 py-2 text-sm leading-5 text-blue-800 dark:text-blue-200">
              {conciseCue}
            </p>
          )}

          {density === 'pro' && stepDetailPoints.length > 0 && (
            <details
              open={detailsDefaultOpen}
              className="group rounded-xl border panel-divider-subtle bg-[var(--bg-base)]/72 px-3 py-2"
              data-testid={`ai-brew-step-detail-${index + 1}`}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-primary">
                <span>
                  {isIndonesianAiBrewLanguage(language) ? 'Detail tambahan' : 'Extra detail'}
                </span>
                <ArrowRight size={14} className="shrink-0 text-secondary transition-transform group-open:rotate-90" />
              </summary>
              <ul className="mt-2.5 space-y-2 text-sm leading-5 text-secondary">
                {stepDetailPoints.map((point) => (
                  <li key={`${step.id}-${point}`} className="flex items-start gap-2">
                    <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function getAiBrewFriendlyErrorMessage(
  error: unknown,
  language: string,
  fallback: string,
) {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();
  const id = isIndonesianAiBrewLanguage(language);

  if (!message.trim()) return fallback;
  if (
    normalized.includes('ai_brew_online_required')
    || normalized.includes('ai_brew_optimizer_unavailable')
    || normalized.includes('strict online ai')
  ) {
    return id
      ? 'Server AI sedang penuh. Resep belum dibuat agar hasil tidak memakai fallback lokal. Coba ulang sebentar lagi atau aktifkan AI Brew Fallback di Admin.'
      : 'AI servers are busy. The brew was not generated so it does not use local fallback. Try again shortly or re-enable AI Brew Fallback in Admin.';
  }
  if (normalized.includes('offline') || normalized.includes('network') || normalized.includes('fetch')) {
    return id
      ? 'Koneksi belum stabil. Coba lagi saat jaringan lebih aman.'
      : 'The connection is unstable. Try again on a steadier network.';
  }
  if (normalized.includes('401') || normalized.includes('403') || normalized.includes('unauthorized') || normalized.includes('auth')) {
    return id
      ? 'Masuk dulu untuk memakai fitur AI pada brew ini.'
      : 'Sign in first to use AI on this brew.';
  }
  if (normalized.includes('402') || normalized.includes('paid') || normalized.includes('plan') || normalized.includes('billing')) {
    return id
      ? 'AI Brew membutuhkan paket berbayar aktif. Upgrade ke paket Starter atau sinkronkan status paket Anda.'
      : 'AI Brew requires an active paid plan. Upgrade to Starter or sync your plan status.';
  }
  if (
    normalized.includes('timeout')
    || normalized.includes('provider')
    || normalized.includes('quota')
    || normalized.includes('model')
    || normalized.includes('unavailable')
    || normalized.includes('could not process')
    || normalized.includes('request_failed')
    || normalized.includes('no ai providers')
    || normalized.includes('all ai providers failed')
    || normalized.includes('empty response')
    || normalized.includes('belum bisa diproses')
    || normalized.includes('tidak tersedia')
    || normalized.includes('400')
    || normalized.includes('500')
  ) {
    return id
      ? 'Server AI sedang penuh. Coba ulang sebentar lagi.'
      : 'AI servers are busy right now. Please try again shortly.';
  }

  return fallback;
}

function getAiBrewSequenceFallbackMessage(language: string) {
  return isIndonesianAiBrewLanguage(language)
    ? 'Instruksi AI tambahan belum dipakai. Sistem memakai urutan seduh tervalidasi agar hasil tetap stabil.'
    : 'The extra AI layer was skipped. The validated brew sequence is being used to keep the result stable.';
}

function logAiBrewSequenceFallback(language: string, details: unknown) {
  if (import.meta.env.DEV) {
    console.warn(getAiBrewSequenceFallbackMessage(language), details);
  }
}

function getAiBrewOptimizationFallbackMessage(language: string) {
  return isIndonesianAiBrewLanguage(language)
    ? 'Optimasi AI belum dipakai. Planner lokal tetap menjaga angka seduh tervalidasi.'
    : 'AI optimization was skipped. The local planner kept the validated brew numbers.';
}

function compactAiBrewMonitoringDetails(details: unknown) {
  if (Array.isArray(details)) {
    return details.map((item) => String(item)).filter(Boolean).slice(0, 5).join(' | ').slice(0, 180);
  }
  if (details instanceof Error) return details.message.slice(0, 180);
  return String(details || 'no_detail').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function reportAiBrewRuntimeEvent({
  name,
  message,
  details,
  platform,
}: {
  name: 'ai_brew_optimizer_rejected' | 'ai_brew_optimizer_no_change' | 'ai_brew_sequence_fallback';
  message: string;
  details: unknown;
  platform: 'web' | 'pwa';
}) {
  reportClientError({
    name,
    message: `${message} details=${compactAiBrewMonitoringDetails(details)}`,
    component: 'AiBrewRuntime',
    source: platform,
    severity: 'warning',
    throttleMs: 0,
  });
}

function getFlowActiveStepIndex(steps: AiBrewDisplayStep[], elapsedSeconds: number) {
  if (steps.length === 0) return -1;

  for (let index = steps.length - 1; index >= 0; index -= 1) {
    if (elapsedSeconds >= steps[index].startSeconds) {
      return index;
    }
  }

  return 0;
}

function focusElement(target: HTMLElement) {
  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
}

function escapeAttributeValue(value: string) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

function resolveFocusRestoreTarget(target: HTMLElement) {
  if (target.isConnected) return target;

  const testId = target.getAttribute('data-testid');
  if (!testId) return null;

  return document.querySelector<HTMLElement>(`[data-testid="${escapeAttributeValue(testId)}"]`);
}

function scheduleFocusRestore(target: HTMLElement | null) {
  if (!target) return;

  const restoreFocus = () => {
    const nextTarget = resolveFocusRestoreTarget(target);
    if (!nextTarget) return;
    focusElement(nextTarget);
  };

  window.setTimeout(restoreFocus, 0);
  window.setTimeout(restoreFocus, 120);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(restoreFocus);
  });
}

function FocusLockedDialog({
  open,
  onClose,
  ariaLabel,
  ariaDescribedBy,
  restoreFocusTarget,
  className,
  style,
  disableMotionShift = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  ariaDescribedBy?: string;
  restoreFocusTarget?: HTMLElement | null;
  className: string;
  style?: CSSProperties;
  disableMotionShift?: boolean;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    restoreFocusRef.current = restoreFocusTarget || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    body.style.overscrollBehavior = 'none';
    const raf = window.requestAnimationFrame(() => {
      if (dialogRef.current?.contains(document.activeElement)) return;
      const autofocus = dialogRef.current?.querySelector<HTMLElement>('[data-autofocus="true"]');
      if (!autofocus) return;
      try {
        autofocus.focus({ preventScroll: true });
      } catch {
        autofocus.focus();
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('hidden') && element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const dialog = dialogRef.current;
    dialog?.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(raf);
      dialog?.removeEventListener('keydown', handleKeyDown);
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
      body.style.overscrollBehavior = previousBodyOverscroll;
      scheduleFocusRestore(restoreFocusRef.current);
    };
  }, [open, restoreFocusTarget]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: disableMotionShift ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: disableMotionShift ? 0 : 18 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            data-disable-page-swipe
            className={className}
            style={style}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getProcessPickerCategoryLabel(copy: CopySet, category: ProcessPickerCategory | 'all') {
  switch (category) {
    case 'common':
      return copy.pickerCategoryCommon;
    case 'fermented':
      return copy.pickerCategoryFermented;
    case 'regional':
      return copy.pickerCategoryRegional;
    case 'experimental':
      return copy.pickerCategoryExperimental;
    case 'special':
      return copy.pickerCategorySpecial;
    case 'all':
    default:
      return copy.pickerCategoryAll;
  }
}

function getProcessPickerCategory(entry: ProcessCatalogEntry): ProcessPickerCategory {
  const text = normalizeSearchText(`${entry.id} ${entry.label} ${entry.group} ${(entry.aliases || []).join(' ')}`);
  if (COMMON_PROCESS_PRIORITY.has(entry.id)) return 'common';
  if (/\b(washed|natural|honey|wet hulled|giling basah)\b/.test(text) && !/\b(anaerobic|carbonic|thermal|coferment|co ferment|infused|maceration|koji|enzyme|yeast|lactic)\b/.test(text)) {
    return 'common';
  }
  if (/\b(sumatra|gayo|mandheling|lintong|toraja|indonesia|semi washed|giling basah|wet hulled|monsooned)\b/.test(text)) {
    return 'regional';
  }
  if (/\b(coferment|co fermented|infused|fruit maceration|thermal shock|koji|enzyme|mossto)\b/.test(text)) {
    return 'experimental';
  }
  if (/\b(anaerobic|carbonic|lactic|yeast|fermentation|fermented|extended)\b/.test(text)) {
    return 'fermented';
  }
  return 'special';
}

function sortProcessEntriesForPicker(entries: ProcessCatalogEntry[]) {
  const categoryRank = new Map<ProcessPickerCategory, number>(
    PROCESS_PICKER_CATEGORIES.map((category, index) => [category, index]),
  );
  return [...entries].sort((left, right) => {
    const leftCategory = getProcessPickerCategory(left);
    const rightCategory = getProcessPickerCategory(right);
    const categoryDelta = (categoryRank.get(leftCategory) ?? 99) - (categoryRank.get(rightCategory) ?? 99);
    if (categoryDelta !== 0) return categoryDelta;
    const commonDelta = (COMMON_PROCESS_PRIORITY.get(left.id) ?? 99) - (COMMON_PROCESS_PRIORITY.get(right.id) ?? 99);
    if (commonDelta !== 0) return commonDelta;
    return left.label.localeCompare(right.label);
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPickerSearchScore(item: PickerOption, normalizedQuery: string, terms: string[]) {
  const label = normalizeSearchText(item.label);
  const id = normalizeSearchText(item.id);
  const aliases = (item.aliases || []).map(normalizeSearchText).filter(Boolean);
  const canonicalTerms = (item.canonicalTerms || []).map(normalizeSearchText).filter(Boolean);
  const haystack = normalizeSearchText([
    item.searchText,
    item.subtitle || '',
    item.description || '',
    item.section || '',
    aliases.join(' '),
    canonicalTerms.join(' '),
  ].join(' '));

  if (!terms.every((term) => haystack.includes(term))) return Number.POSITIVE_INFINITY;
  if (label === normalizedQuery) return 0;
  if (id === normalizedQuery || aliases.includes(normalizedQuery) || canonicalTerms.includes(normalizedQuery)) return 1;
  if (label.startsWith(normalizedQuery)) return 2;
  if (new RegExp(`(^|\\s)${escapeRegExp(normalizedQuery)}($|\\s)`).test(label)) return 3;
  if (canonicalTerms.some((term) => term.startsWith(normalizedQuery))) return 4;
  if (aliases.some((term) => term.includes(normalizedQuery))) return 5;
  const labelIndex = label.indexOf(normalizedQuery);
  if (labelIndex >= 0) return 6 + (labelIndex / 100);
  return 20;
}

function rankPickerOptionsForSearch(items: PickerOption[], normalizedQuery: string, limit: number) {
  const terms = normalizedQuery.split(/\s+/g).filter(Boolean).slice(0, 6);
  return items
    .map((item, index) => ({
      item,
      index,
      score: getPickerSearchScore(item, normalizedQuery, terms),
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => {
      const scoreDelta = left.score - right.score;
      if (scoreDelta !== 0) return scoreDelta;
      return left.index - right.index;
    })
    .slice(0, limit)
    .map((entry) => entry.item);
}

function MasterPickerDialog({
  open,
  kind,
  title,
  ariaLabel,
  closeLabel,
  searchLabel,
  description,
  language,
  searchPlaceholder,
  emptyText,
  items,
  restoreFocusTarget,
  onClose,
  onSelect,
}: {
  open: boolean;
  kind: NonNullable<PickerKind>;
  title: string;
  ariaLabel?: string;
  closeLabel: string;
  searchLabel: string;
  description: string;
  language?: string;
  searchPlaceholder: string;
  emptyText: string;
  items: PickerOption[];
  restoreFocusTarget?: HTMLElement | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [specialtyExpanded, setSpecialtyExpanded] = useState(false);
  const [activeProcessCategory, setActiveProcessCategory] = useState<ProcessPickerCategory | 'all'>('all');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopByKindRef = useRef<Record<string, number>>({});
  const descriptionId = useId();
  const searchInputId = useId();
  const hasDescription = description.trim().length > 0;
  const isLargeCatalog = LARGE_CATALOG_PICKER_KINDS.has(kind);
  const showProcessCategories = kind === 'process';

  function persistPickerScrollPosition() {
    if (!scrollContainerRef.current) return;
    lastScrollTopByKindRef.current[kind] = scrollContainerRef.current.scrollTop;
  }

  function closePickerDialog() {
    persistPickerScrollPosition();
    onClose();
  }

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSpecialtyExpanded(false);
      setActiveProcessCategory('all');
    }
    if (open) {
      window.setTimeout(() => {
        if (!scrollContainerRef.current) return;
        scrollContainerRef.current.scrollTop = lastScrollTopByKindRef.current[kind] || 0;
      }, 40);
    }
  }, [kind, open]);

  const filteredItems = useMemo(() => {
    const normalized = normalizeSearchText(deferredQuery);
    const categoryFilteredItems = showProcessCategories && activeProcessCategory !== 'all' && !normalized
      ? items.filter((item) => item.processCategory === activeProcessCategory)
      : items;
    if (!normalized) {
      return isLargeCatalog ? categoryFilteredItems.slice(0, LARGE_CATALOG_INITIAL_LIMIT) : categoryFilteredItems;
    }
    const limit = isLargeCatalog ? LARGE_CATALOG_SEARCH_LIMIT : Number.POSITIVE_INFINITY;
    return rankPickerOptionsForSearch(items, normalized, limit);
  }, [activeProcessCategory, deferredQuery, isLargeCatalog, items, showProcessCategories]);

  useEffect(() => {
    if (!open || !scrollContainerRef.current) return;
    if (!deferredQuery.trim() && activeProcessCategory === 'all') return;
    scrollContainerRef.current.scrollTop = 0;
  }, [activeProcessCategory, deferredQuery, open]);

  const sections = useMemo(() => {
    const map = new Map<string, PickerOption[]>();
    for (const item of filteredItems) {
      const next = map.get(item.section) || [];
      next.push(item);
      map.set(item.section, next);
    }
    return Array.from(map.entries());
  }, [filteredItems]);
  const showSectionHeaders = sections.length > 1 && sections.some(([section]) => section.trim().length > 0);

  return (
    <FocusLockedDialog
      open={open}
      onClose={closePickerDialog}
      ariaLabel={ariaLabel || title}
      ariaDescribedBy={hasDescription ? descriptionId : undefined}
      restoreFocusTarget={restoreFocusTarget}
      className="fixed inset-x-0 bottom-0 z-[111] mx-auto flex w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-t-[1.8rem] border border-glass bg-[var(--bg-base)]/96 px-4 pb-4 pt-4 shadow-[0_-18px_40px_rgba(0,0,0,0.24)] lg:bottom-auto lg:top-1/2 lg:max-w-3xl lg:-translate-y-1/2 lg:rounded-[1.8rem] lg:px-5"
      style={{
        maxHeight: 'min(88vh, calc(var(--fullscreen-modal-height, 100dvh) - var(--safe-top, 0px) - 12px))',
        paddingBottom: 'max(1rem, calc(var(--bottom-safe-capped, 0px) + 1rem))',
      }}
    >
      <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold text-primary">{title}</h3>
          {hasDescription && (
            <p id={descriptionId} className="break-words text-sm text-secondary">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={closePickerDialog}
          className="icon-touch-button glass-button"
          aria-label={closeLabel}
        >
          <X size={18} />
        </button>
      </div>

      <div className="relative mb-3">
        <label htmlFor={searchInputId} className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">
          {searchLabel}
        </label>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          id={searchInputId}
          data-testid={`ai-brew-picker-search-${kind}`}
          data-autofocus="true"
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (showProcessCategories) setActiveProcessCategory('all');
          }}
          placeholder={searchPlaceholder}
          className="glass-input h-11 w-full pl-10 pr-4 text-sm"
        />
      </div>

      {showProcessCategories && (
        <div
          className="mb-3 flex max-w-full gap-2 overflow-x-auto pb-1"
          data-testid="ai-brew-process-category-chips"
        >
          {(['all', ...PROCESS_PICKER_CATEGORIES] as const).map((category) => {
            const active = activeProcessCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setQuery('');
                  setActiveProcessCategory(category);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)]'
                    : 'bg-surface-alpha text-secondary hover:text-primary'
                }`}
                data-testid={`ai-brew-process-category-${category}`}
                aria-pressed={active}
              >
                {getProcessPickerCategoryLabel(COPY[language === 'id' ? 'id' : 'en'], category)}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="max-w-full overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border panel-divider-subtle panel-soft p-2"
        style={{
          maxHeight: 'min(68vh, calc(var(--fullscreen-modal-height, 100dvh) - var(--safe-top, 0px) - var(--bottom-safe-capped, 0px) - 12rem))',
          WebkitOverflowScrolling: 'touch',
        }}
        data-testid={`ai-brew-picker-${kind}`}
      >
        {sections.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-secondary">{emptyText}</p>
        ) : (
          sections.map(([section, sectionItems]) => {
            const isSpecialtySection = kind === 'dripper' && /specialty|spesialti/i.test(section);
            const collapsed = isSpecialtySection && deferredQuery.trim().length === 0 && !specialtyExpanded;
            return (
            <div key={section} className="mb-3 last:mb-0">
              {showSectionHeaders && section ? (
                isSpecialtySection ? (
                  <button
                    type="button"
                    onClick={() => setSpecialtyExpanded((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary transition-colors hover:bg-surface-alpha hover:text-primary"
                    aria-expanded={!collapsed}
                  >
                    <span className="min-w-0">
                      <span className="block">{section}</span>
                      <span className="mt-0.5 block text-[10px] normal-case tracking-normal text-tertiary">
                        {collapsed
                          ? (isIndonesianAiBrewLanguage(language) ? 'Ketuk untuk lihat dripper lain' : 'Tap to show more drippers')
                          : (isIndonesianAiBrewLanguage(language) ? 'Ketuk untuk sembunyikan' : 'Tap to collapse')}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-surface-alpha px-2 py-1 tracking-normal">
                      {sectionItems.length}
                      <ArrowRight size={14} className={`transition-transform ${collapsed ? 'rotate-90' : '-rotate-90'}`} />
                    </span>
                  </button>
                ) : (
                  <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
                    {section}
                  </div>
                )
              ) : null}
              <div className={`space-y-1 ${collapsed ? 'hidden' : ''}`}>
                {sectionItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      closePickerDialog();
                    }}
                    className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                      item.tone === 'highlight'
                        ? 'border border-blue-500/15 bg-blue-500/5 hover:bg-blue-500/10'
                        : item.tone === 'muted'
                          ? 'border border-[var(--panel-border-soft)] bg-[var(--bg-base)]/45 hover:bg-surface-alpha'
                          : 'hover:bg-surface-alpha'
                    }`}
                    aria-label={item.ariaLabel}
                    data-testid={`ai-brew-picker-option-${kind}-${item.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-primary">{item.label}</p>
                      {item.subtitle && (
                        <p className="mt-1 text-xs text-secondary">{item.subtitle}</p>
                      )}
                      {item.description && (
                        <p className="mt-1 text-xs leading-5 text-secondary">{item.description}</p>
                      )}
                      {item.badges.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.badges.map((badge) => (
                            <span key={`${item.id}-${badge}`} className="rounded-full bg-surface-alpha px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ArrowRight size={16} className="mt-1 shrink-0 text-secondary" />
                  </button>
                ))}
              </div>
            </div>
            );
          })
        )}
      </div>
    </FocusLockedDialog>
  );
}

function ResultDisclosureSection({
  title,
  summary,
  icon,
  children,
  defaultOpen = false,
  testId,
  tone = 'neutral',
}: {
  title: string;
  summary?: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  testId?: string;
  tone?: 'neutral' | 'blue' | 'amber';
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toneClass = tone === 'amber'
    ? 'border-amber-500/20 bg-amber-500/10'
    : tone === 'blue'
      ? 'border-blue-500/18 bg-blue-500/[0.07]'
      : 'panel-divider-subtle panel-soft';
  const iconClass = tone === 'amber'
    ? 'text-amber-600 dark:text-amber-300'
    : tone === 'blue'
      ? 'text-blue-500'
      : 'text-secondary';

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className={`group rounded-[1.4rem] border ${toneClass}`}
      data-testid={testId}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
        <span className="flex min-w-0 items-start gap-2.5">
          <span className={`mt-0.5 shrink-0 ${iconClass}`}>{icon}</span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold uppercase tracking-widest text-secondary">{title}</span>
            {summary && (
              <span className="mt-1 block text-xs leading-5 text-secondary">{summary}</span>
            )}
          </span>
        </span>
        <ChevronDown size={16} className="shrink-0 text-secondary transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">
        {children}
      </div>
    </details>
  );
}

function ProBuilderAccordion({
  sectionId,
  activeSection,
  onActiveSectionChange,
  title,
  summary,
  icon,
  children,
}: {
  sectionId: ProBuilderSectionId;
  activeSection: ProBuilderSectionId | null;
  onActiveSectionChange: (section: ProBuilderSectionId | null) => void;
  title: string;
  summary: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const open = activeSection === sectionId;
  const panelId = `ai-brew-pro-accordion-panel-${sectionId}`;
  const triggerId = `ai-brew-pro-accordion-trigger-${sectionId}`;

  return (
    <section
      className="min-w-0 max-w-full overflow-hidden rounded-[1.15rem] border panel-divider-subtle panel-soft"
      data-testid={`ai-brew-pro-accordion-${sectionId}`}
    >
      <button
        id={triggerId}
        type="button"
        onClick={() => onActiveSectionChange(open ? null : sectionId)}
        className="flex min-h-[56px] min-w-0 w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        data-testid={`ai-brew-pro-accordion-trigger-${sectionId}`}
      >
        <span className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 shrink-0 text-blue-500">{icon}</span>
          <span className="min-w-0">
            <span className="block break-words text-sm font-semibold text-primary">{title}</span>
            <span className="mt-0.5 block truncate text-xs text-secondary">{summary}</span>
          </span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="min-w-0 max-w-full overflow-x-clip border-t panel-divider-subtle px-3.5 pb-3.5 pt-3 [overflow-wrap:anywhere]"
          data-testid={`ai-brew-pro-accordion-panel-${sectionId}`}
        >
          {children}
        </div>
      )}
    </section>
  );
}

type TargetProfileCompareRow = {
  id: string;
  label: string;
  effect: string;
  finalComputed: string;
  why: string;
  active: boolean;
  sameRecipe: boolean;
};

function buildTargetProfileEffectText(targetProfileId: string, language: string) {
  const id = isIndonesianAiBrewLanguage(language);
  switch (targetProfileId) {
    case 'more_acidity':
      return id
        ? 'Efek target: rasio sedikit lebih panjang, suhu lebih rendah, waktu lebih cepat, grind sedikit lebih kasar, bloom singkat, agitasi minimal.'
        : 'Target effect: slightly longer ratio, lower temperature, faster time, slightly coarser grind, shorter bloom, minimal agitation.';
    case 'floral_transparent':
      return id
        ? 'Efek target: suhu lebih rendah, tuangan rendah, agitasi minimal, air turun lebih cepat untuk menjaga floral dan clarity.'
        : 'Target effect: lower heat, low pour height, minimal agitation, faster drawdown to protect florals and clarity.';
    case 'more_sweetness':
      return id
        ? 'Efek target: tuangan tengah lebih penuh, bloom 45 detik, agitasi rendah, akhir seduhan ringan agar sweetness tetap bersih.'
        : 'Target effect: fuller middle pour, 45 sec bloom, low agitation, lighter finish so sweetness stays clean.';
    case 'fruit_forward':
      return id
        ? 'Efek target: aroma dijaga, tuangan tengah penuh, suhu konservatif, dan proses aromatik tidak dibuat terlalu agresif.'
        : 'Target effect: preserve aroma, fuller middle pour, conservative temperature, avoid over-agitating aromatic processes.';
    case 'more_body':
      return id
        ? 'Efek target: bloom lebih penuh, kontak lebih lama, grind cenderung lebih halus, air turun lebih lambat, tuangan tetap rendah.'
        : 'Target effect: fuller bloom, longer contact, generally finer grind, slower drawdown.';
    case 'dense_comforting':
      return id
        ? 'Efek target: body lebih padat, bloom 2.3x, kontak terkontrol, tuangan rendah, lindungi pahit pada akhir seduhan.'
        : 'Target effect: denser body, 2.3x bloom, controlled contact, protect bitterness in the finish.';
    case 'soft_round':
      return id
        ? 'Efek target: bloom 2.1-2.2x, akhir seduhan lembut, sweetness/body naik tanpa membuat cup keruh.'
        : 'Target effect: 2.1-2.2x bloom, gentle finish, more sweetness/body without making the cup muddy.';
    case 'balance_clean':
    default:
      return id
        ? 'Efek target: baseline bersih, bloom 2x, pulse seimbang, agitasi rendah, air turun normal.'
        : 'Target effect: clean baseline, 2x bloom, balanced pulses, low agitation, normal drawdown.';
  }
}

function formatTargetProfileFinalComputed(plan: BrewPlan) {
  const ratio = plan.iceMl > 0
    ? `1:${formatBrewRatio(plan.finalBeverageRatio)} / panas 1:${formatBrewRatio(plan.hotExtractionRatio)}`
    : `1:${formatBrewRatio(plan.finalBeverageRatio)}`;
  const extractionLabel = plan.brewMode === 'iced' ? 'ekstraksi panas' : 'ekstraksi';
  return `${ratio} / ${formatRoundedTemperature(plan.waterTempC)} / ${extractionLabel} ${formatGuideTime(getPlanExtractionSeconds(plan))}`;
}

function buildTargetProfileCompareReason(plan: BrewPlan, balancePlan: BrewPlan | undefined, language: string) {
  const id = isIndonesianAiBrewLanguage(language);
  const targetId = plan.targetProfileId;
  const base = id
    ? 'Hasil final menggabungkan efek target dengan modifier bean, air, grinder, dan device.'
    : 'Final computed combines the target effect with bean, water, grinder, and device modifiers.';
  if (!balancePlan || targetId === 'balance_clean') return base;
  if (
    (targetId === 'more_acidity' || targetId === 'floral_transparent')
    && plan.waterTempC > balancePlan.waterTempC
  ) {
    return id
      ? 'Hasil final lebih panas karena modifier bean/device/air meminta tekanan ekstraksi lebih besar.'
      : 'Computed final is hotter because bean/device/water modifiers required more extraction pressure.';
  }
  if (
    (targetId === 'more_body' || targetId === 'dense_comforting')
    && plan.totalTimeSeconds < balancePlan.totalTimeSeconds
  ) {
    return id
      ? 'Peringatan: target body biasanya tidak boleh lebih cepat dari balance; cek modifier device atau override manual.'
      : 'Warning: body targets should not be faster than balance; check device modifiers or manual overrides.';
  }
  if (
    (targetId === 'more_sweetness' || targetId === 'fruit_forward')
    && plan.grindBias === 'coarser'
  ) {
    return id
      ? 'Hasil final memakai grind lebih kasar karena risiko proses/flow lebih tinggi; sweetness dijaga lewat tuangan tengah dan kontrol agitasi.'
      : 'Computed final uses a coarser grind because process/flow risk is higher; sweetness is protected through middle pour and agitation control.';
  }
  return base;
}

function buildTargetProfileCompareRows(targetComparePlans: BrewPlan[] | undefined, currentPlan: BrewPlan, language: string) {
  const plans = targetComparePlans && targetComparePlans.length > 0 ? targetComparePlans : [currentPlan];
  const balancePlan = plans.find((item) => item.targetProfileId === 'balance_clean');
  const groups = new Map<string, BrewPlan[]>();
  for (const item of plans) {
    const signature = buildBrewPlanRecipeSignature(item);
    groups.set(signature, [...(groups.get(signature) || []), item]);
  }

  return Array.from(groups.values()).map((group): TargetProfileCompareRow => {
    const representative = group.find((item) => item.targetProfileId === currentPlan.targetProfileId) || group[0];
    const labels = group.map((item) => localizeAiBrewTargetProfile(item.targetProfileId, item.targetProfileLabel, language));
    const uniqueLabels = Array.from(new Set(labels));
    return {
      id: group.map((item) => item.targetProfileId).join('__'),
      label: uniqueLabels.join(' / '),
      effect: buildTargetProfileEffectText(representative.targetProfileId, language),
      finalComputed: formatTargetProfileFinalComputed(representative),
      why: buildTargetProfileCompareReason(representative, balancePlan, language),
      active: group.some((item) => item.targetProfileId === currentPlan.targetProfileId),
      sameRecipe: group.length > 1,
    };
  });
}

function PlanResultDialog({
  open,
  language,
  copy,
  resultMode,
  plan,
  targetComparePlans,
  currentPreset,
  aiCoachDisabled,
  aiCoachReason,
  aiBusy,
  aiResponse,
  aiError,
  saving,
  saveSuccess,
  saveError,
  feedback,
  feedbackNoteDraft,
  showProvenance,
  isAuthenticated,
  isOffline,
  onClose,
  onEditInputs,
  onUseInTimer,
  onUseInRatio,
  onSaveRecipe,
  onToggleFavorite,
  onFeedbackNoteChange,
  onSaveFeedback,
  onRunAiCoach,
  onOpenAuth,
}: {
  open: boolean;
  language: string;
  copy: CopySet;
  resultMode: FormMode;
  plan: BrewPlan | null;
  targetComparePlans?: BrewPlan[];
  currentPreset?: BrewPreset;
  aiCoachDisabled: boolean;
  aiCoachReason: string | null;
  aiBusy: AiCoachMode | null;
  aiResponse: { title: string; markdown: string } | null;
  aiError: string | null;
  saving: boolean;
  saveSuccess: string | null;
  saveError: string | null;
  feedback: BrewTasteFeedback | null;
  feedbackNoteDraft: string;
  showProvenance: boolean;
  isAuthenticated: boolean;
  isOffline: boolean;
  onClose: () => void;
  onEditInputs: () => void;
  onUseInTimer: (durationSeconds: number) => void;
  onUseInRatio: (plan: BrewPlan) => void;
  onSaveRecipe: () => void;
  onToggleFavorite: () => void;
  onFeedbackNoteChange: (value: string) => void;
  onSaveFeedback: (rating: BrewTasteFeedbackRating) => void;
  onRunAiCoach: (mode: AiCoachMode) => void;
  onOpenAuth: () => void;
}) {
  const descriptionId = useId();
  const [activeTab, setActiveTab] = useState<ResultTab>('plan');
  const [flowElapsedSeconds, setFlowElapsedSeconds] = useState(0);
  const [flowAccumulatedSeconds, setFlowAccumulatedSeconds] = useState(0);
  const [flowRunning, setFlowRunning] = useState(false);
  const [flowStartedAtMs, setFlowStartedAtMs] = useState<number | null>(null);
  const isQuickResult = resultMode === 'quick';
  const [guideDensity, setGuideDensity] = useState<AiBrewGuideDensity>('basic');
  const pendingTasteFocusRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setActiveTab('plan');
    setGuideDensity(isQuickResult ? 'basic' : 'pro');
    setFlowElapsedSeconds(0);
    setFlowAccumulatedSeconds(0);
    setFlowRunning(false);
    setFlowStartedAtMs(null);
  }, [open, isQuickResult]);

  useEffect(() => {
    if (!open || activeTab !== 'details' || !pendingTasteFocusRef.current || typeof window === 'undefined') return;
    pendingTasteFocusRef.current = false;
    scrollTasteFeedbackIntoView();
  }, [activeTab, open]);

  useEffect(() => {
    setFlowElapsedSeconds(0);
    setFlowAccumulatedSeconds(0);
    setFlowRunning(false);
    setFlowStartedAtMs(null);
  }, [plan?.id]);

  useEffect(() => {
    if (!plan || !flowRunning || !flowStartedAtMs) return undefined;

    const updateElapsed = () => {
      const nextElapsed = Math.min(
        plan.totalTimeSeconds,
        flowAccumulatedSeconds + Math.floor((Date.now() - flowStartedAtMs) / 1000),
      );
      setFlowElapsedSeconds(nextElapsed);
      if (nextElapsed >= plan.totalTimeSeconds) {
        setFlowAccumulatedSeconds(plan.totalTimeSeconds);
        setFlowRunning(false);
        setFlowStartedAtMs(null);
      }
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(intervalId);
  }, [plan, flowAccumulatedSeconds, flowRunning, flowStartedAtMs]);

  const workflowGuideSteps = useMemo(() => (
    plan ? getAiBrewWorkflowGuideSteps(plan) : []
  ), [plan]);

  if (!plan) return null;

  const id = isIndonesianAiBrewLanguage(language);
  const resultTabs: Array<{ id: ResultTab; label: string }> = [
    { id: 'plan', label: copy.planTab },
    { id: 'flow', label: id ? 'Seduh' : copy.flowTab },
    { id: 'coach', label: id ? 'AI' : copy.coachTab },
    { id: 'details', label: copy.detailTab },
  ];
  const showLegacySourcesTab = false;
  const coachActions: Array<{ mode: AiCoachMode; label: string; hint: string }> = [
    { mode: 'explain', label: copy.explain, hint: copy.coachExplainHint },
    { mode: 'troubleshoot', label: copy.troubleshoot, hint: copy.coachTroubleshootHint },
    { mode: 'rewrite', label: copy.rewriteGuide, hint: copy.aiNotesManualHint },
    { mode: 'deep_analysis', label: copy.deepAnalysis, hint: copy.coachAdjustHint },
    { mode: 'adjust', label: copy.adjust, hint: copy.coachAdjustHint },
  ];
  const primaryAiAssistActions = coachActions.filter((action) => (
    action.mode === 'explain' || action.mode === 'troubleshoot' || action.mode === 'rewrite'
  ));
  const advancedAiAssistActions = coachActions.filter((action) => (
    action.mode === 'deep_analysis' || action.mode === 'adjust'
  ));
  const hasLowConfidenceCoachData = plan.provenanceAttentionNeeded
    || plan.grindSettingVerification !== 'official'
    || plan.deviceProfileMode !== 'exact'
    || plan.waterMineralDerivation === 'estimated_from_classification'
    || plan.waterPresetStatus === 'manual_required';

  const activeTabPanelId = `ai-brew-result-panel-${activeTab}`;
  const activeTabId = `ai-brew-result-tab-${activeTab}`;
  const resultSwitchValveStates = Array.from(new Set(workflowGuideSteps
    .map((step) => step.valveState)
    .filter((state): state is NonNullable<WorkflowGuideStep['valveState']> => Boolean(state))));
  const resultSwitchValvePathLabel = resultSwitchValveStates.length > 0
    ? resultSwitchValveStates.map((state) => {
      if (state === 'closed') return id ? 'Katup tertutup' : 'Valve closed';
      if (state === 'open') return id ? 'Katup terbuka' : 'Valve open';
      return String(state).replace(/_/g, ' ');
    }).join(' -> ')
    : (id ? 'Katup mengikuti preset' : 'Valve follows preset');
  const waterSourceLinks = plan.waterBrandSourceUrls || [];
  const workflowValidation = plan.workflowValidation;
  const workflowBlocked = workflowValidation?.status === 'blocked';
  const switchSafetyStatus = plan.switchStepValidation?.status || plan.switchCompatibility?.status;
  const switchSafetyMessage = plan.switchStepValidation?.message || plan.switchCompatibility?.message;
  const localizedTargetProfileLabel = localizeAiBrewTargetProfile(plan.targetProfileId, plan.targetProfileLabel, language);
  const displaySummary = compactResultSummaryForDisplay(buildPremiumResultSummary(plan, language), plan, language);
  const methodBrief = buildPlanMethodBrief(plan, language);
  const aiEngineOnline = planUsesOnlineAi(plan);
  const actionPriorities = resolveAiBrewActionPriorities(plan, language);
  const planHeaderWater = formatPlanHeaderWater(plan, language);
  const localizedWaterStyle = localizeAiBrewWaterStyle(plan.waterMinerals.styleLabel, language);
  const localizedGrindRecommendation = formatGrindTextForDisplay(plan.grindRecommendation, language);
  const localizedGrindHeadline = formatGrindHeadlineForDisplay(plan.grindRecommendation || plan.grindSettingReference, language);
  const localizedGrindBandLabel = formatGrindTextForDisplay(plan.grindBandLabel, language);
  const localizedGrindSettingReference = formatGrindTextForDisplay(plan.grindSettingReference, language);
  const extractionSeconds = getPlanExtractionSeconds(plan);
  const guideEndSeconds = getPlanGuideEndSeconds(plan);
  const postExtractionSeconds = getPlanPostExtractionSeconds(plan);
  const tasteTimeRange = getPlanTasteTimeRange(plan);
  const extractionTimeLabel = getPlanExtractionLabel(plan, language);
  const guideEndLabel = id ? 'Panduan selesai' : 'Guide complete';
  const postExtractionLabel = id ? 'Finishing' : 'Finishing';
  const timeHelperText = getPlanTimeHelperCopy(plan, language);
  const timeSummaryItems = [
    { id: 'extraction', label: extractionTimeLabel, value: formatGuideTime(extractionSeconds) },
    { id: 'guide', label: guideEndLabel, value: formatGuideTime(guideEndSeconds) },
    ...(postExtractionSeconds > 0
      ? [{ id: 'post', label: postExtractionLabel, value: `+${formatGuideTime(postExtractionSeconds)} ${id ? 'aduk/sajikan' : 'stir/serve'}` }]
      : []),
  ];
  const expectedCup = plan.expectedCupProfile;
  const localizedBeanCoverageLabel = plan.beanCoverage
    ? formatBeanCoverageLabel(plan.beanCoverage.category, plan.beanCoverage.label, language)
    : '';
  const localizedBeanCoverageConfidence = plan.beanCoverage
    ? formatAiBrewConfidenceLabel(plan.beanCoverage.confidence, language)
    : '';
  const localizedExpectedCupConfidence = expectedCup
    ? formatAiBrewConfidenceLabel(expectedCup.confidence, language)
    : '';
  const localizedWarnings = [
    ...plan.guardrails.errors.map((item) => localizeAiBrewDynamicText(item, language)),
    ...plan.warnings.map((item) => localizeAiBrewDynamicText(item, language)),
  ];
  const flowProgressSeconds = Math.min(plan.totalTimeSeconds, flowElapsedSeconds);
  const flowActiveStepIndex = getFlowActiveStepIndex(workflowGuideSteps, flowProgressSeconds);
  const flowCurrentStep = workflowGuideSteps[flowActiveStepIndex] || null;
  const flowNextStep = flowActiveStepIndex >= 0 ? workflowGuideSteps[flowActiveStepIndex + 1] || null : workflowGuideSteps[0] || null;
  const flowRemainingSeconds = Math.max(0, plan.totalTimeSeconds - flowProgressSeconds);
  const flowStepRemainingSeconds = flowNextStep
    ? Math.max(0, flowNextStep.startSeconds - flowProgressSeconds)
    : flowRemainingSeconds;
  const flowStatusLabel = flowRunning
    ? copy.flowRunning
    : flowProgressSeconds >= plan.totalTimeSeconds && plan.totalTimeSeconds > 0
      ? copy.flowFinished
      : flowProgressSeconds > 0
        ? copy.flowPaused
        : copy.flowReady;
  const flowCurrentCue = flowCurrentStep
    ? (buildAiBrewStepMethodFocusCue(plan, flowCurrentStep, language) || buildAiBrewStepQuickNote(flowCurrentStep, language))
    : displaySummary;
  const flowCurrentCompactCue = compactAiBrewInstruction(flowCurrentCue);
  const flowCurrentMetrics = flowCurrentStep
    ? splitAiBrewStepMetrics(buildAiBrewStepMetrics(flowCurrentStep, language, plan))
    : { core: [], detail: [] };
  const quickSetupItems = [
    { id: 'grind', label: copy.grind, value: localizedGrindHeadline },
    {
      id: 'water',
      label: plan.brewMode === 'iced' ? methodBrief.primaryLabel : copy.totalWater,
      value: plan.brewMode === 'iced' ? formatRoundedMl(plan.hotWaterMl) : formatRoundedMl(plan.totalWaterMl),
    },
    ...(plan.iceMl > 0
      ? [{ id: 'ice', label: copy.ice, value: formatRoundedGrams(plan.iceMl) }]
      : []),
    { id: 'ratio', label: copy.finalRatio, value: `1:${formatBrewRatio(plan.finalBeverageRatio)}` },
    { id: 'time', label: extractionTimeLabel, value: formatGuideTime(extractionSeconds) },
    { id: 'temp', label: copy.temp, value: formatRoundedTemperature(plan.waterTempC) },
  ];
  const quickPrepCue = plan.brewMode === 'iced'
    ? (id
      ? `Siapkan ${formatRoundedGrams(plan.iceMl)} es di server, seduh dengan ${formatRoundedMl(plan.hotWaterMl)} air panas, lalu aduk sebelum minum.`
      : `Set ${formatRoundedGrams(plan.iceMl)} ice in the server, brew with ${formatRoundedMl(plan.hotWaterMl)} hot water, then stir before drinking.`)
    : (id
      ? `Siapkan ${formatRoundedMl(plan.totalWaterMl)} air di ${formatRoundedTemperature(plan.waterTempC)}, mulai timer, lalu ikuti langkah dari atas.`
      : `Set ${formatRoundedMl(plan.totalWaterMl)} water at ${formatRoundedTemperature(plan.waterTempC)}, start the timer, then follow the steps top to bottom.`);
  const quickCorrectionCue = id
    ? 'Jika aliran terlalu cepat atau rasa asam tajam, sedikit lebih halus. Jika terlalu lambat, berat, atau pahit, sedikit lebih kasar.'
    : 'If flow runs too fast or tastes sharply sour, go slightly finer. If it stalls, feels heavy, or turns bitter, go slightly coarser.';
  const localizedProcessLabel = plan.process || copy.notSpecified;
  const localizedVarietyLabel = plan.variety || copy.notSpecified;
  const localizedRoastLabel = localizeAiBrewRoastLabel(plan.roastLevel, language);
  const waterToleranceMl = Math.max(5, Math.round(plan.totalWaterMl * 0.02));
  const hotWaterToleranceMl = Math.max(4, Math.round(plan.hotWaterMl * 0.02));
  const drawdownLowSeconds = tasteTimeRange[0];
  const drawdownHighSeconds = tasteTimeRange[1];
  const summaryWhyRecipeItems = [
    {
      label: id ? 'Target rasa' : 'Taste target',
      value: localizedTargetProfileLabel,
      detail: id
        ? `${buildTargetProfileEffectText(plan.targetProfileId, language)}${plan.targetProfileSuggestionReason ? ` ${localizeAiBrewDynamicText(plan.targetProfileSuggestionReason, language)}` : ''}`
        : `${buildTargetProfileEffectText(plan.targetProfileId, language)}${plan.targetProfileSuggestionReason ? ` ${plan.targetProfileSuggestionReason}` : ''}`,
    },
    {
      label: id ? 'Keseimbangan ekstraksi' : 'Extraction balance',
      value: `${plan.iceMl > 0 ? `1:${formatBrewRatio(plan.finalBeverageRatio)} / panas 1:${formatBrewRatio(plan.hotExtractionRatio)}` : `1:${formatBrewRatio(plan.finalBeverageRatio)}`} - ${formatRoundedTemperature(plan.waterTempC)} - ${extractionTimeLabel} ${formatGuideTime(extractionSeconds)}`,
      detail: id
        ? `${localizedRoastLabel}, proses ${localizedProcessLabel}, dan ${localizedWaterStyle} dibaca bersama supaya sweetness naik tanpa menutup clarity atau mendorong pahit.`
        : `${localizedRoastLabel} roast, ${localizedProcessLabel} process, and ${localizedWaterStyle} water are read together so sweetness can rise without muting clarity or pushing bitterness.`,
    },
    {
      label: id ? 'Air + grinder' : 'Water + grinder',
      value: `${plan.waterBrandLabel || copy.waterSelectedManual} · ${localizedGrindHeadline}`,
      detail: id
        ? `Air memakai TDS ${plan.waterMinerals.tdsPpm}, GH ${plan.waterMinerals.hardnessPpm}, KH ${plan.waterMinerals.alkalinityPpm}; grinder ditampilkan sebagai ${formatGrinderReferenceLabel(copy, plan.grindSettingVerification, plan.grindSettingMode)} agar tidak overclaim.`
        : `Water uses TDS ${plan.waterMinerals.tdsPpm}, GH ${plan.waterMinerals.hardnessPpm}, KH ${plan.waterMinerals.alkalinityPpm}; grinder is labelled ${formatGrinderReferenceLabel(copy, plan.grindSettingVerification, plan.grindSettingMode)} so the plan does not overclaim precision.`,
    },
    {
      label: id ? 'Alat & workflow' : 'Brewer workflow',
      value: plan.methodFamily === 'hario_switch'
        ? (plan.switchPresetLabel || plan.dripper.name)
        : plan.dripper.name,
      detail: plan.methodFamily === 'hario_switch'
        ? (id
          ? `${plan.switchWhy || 'Metode Switch mengikuti target rasa, ukuran alat, dan dosis.'} ${plan.switchWatch || plan.switchCompatibility?.message || 'Jaga angka ml, target kumulatif, dan status katup saat seduh.'}`
          : `${plan.switchWhy || 'Switch method follows the taste target, brewer size, and dose.'} ${plan.switchWatch || plan.switchCompatibility?.message || 'Keep ml, cumulative targets, and valve state visible while brewing.'}`)
        : (id
          ? `${methodBrief.primaryLabel}: ${methodBrief.watch[0] || 'Ikuti urutan dari atas; ubah satu variabel saja setelah mencicipi.'}`
          : `${methodBrief.primaryLabel}: ${methodBrief.watch[0] || 'Follow the guide top to bottom; change one variable only after tasting.'}`),
    },
  ];
  const targetProfileCompareRows = buildTargetProfileCompareRows(targetComparePlans, plan, language);
  const precisionToleranceItems = [
    {
      label: id ? 'Suhu' : 'Temperature',
      value: `${formatRoundedTemperature(plan.waterTempC)} \u00b11C`,
      detail: id ? 'Lewat dari range ini mulai ubah clarity dan bitterness.' : 'Outside this range, clarity and bitterness start to move.',
    },
    {
      label: id ? 'Air turun ideal' : 'Ideal drawdown',
      value: `${formatGuideTime(drawdownLowSeconds)}-${formatGuideTime(drawdownHighSeconds)}`,
      detail: id ? 'Finis lebih cepat: haluskan. Finis lebih lama: kasarkan.' : 'Faster finish: grind finer. Slower finish: grind coarser.',
    },
    {
      label: id ? 'Adjustment grind' : 'Grind adjustment',
      value: id ? '1-2 klik/angka' : '1-2 clicks/numbers',
      detail: id ? 'Ubah kecil dulu, lalu seduh ulang dengan air dan suhu yang sama.' : 'Move small first, then rebrew with the same water and temperature.',
    },
    {
      label: id ? 'Target air' : 'Water target',
      value: `${formatRoundedMl(Math.max(0, plan.totalWaterMl - waterToleranceMl))}-${formatRoundedMl(plan.totalWaterMl + waterToleranceMl)}`,
      detail: plan.iceMl > 0
        ? (id
          ? `Air panas aman ${formatRoundedMl(Math.max(0, plan.hotWaterMl - hotWaterToleranceMl))}-${formatRoundedMl(plan.hotWaterMl + hotWaterToleranceMl)}; es jaga sekitar ${formatRoundedGrams(plan.iceMl)}.`
          : `Safe hot water ${formatRoundedMl(Math.max(0, plan.hotWaterMl - hotWaterToleranceMl))}-${formatRoundedMl(plan.hotWaterMl + hotWaterToleranceMl)}; keep ice around ${formatRoundedGrams(plan.iceMl)}.`)
        : (id ? 'Target volume ini menjaga rasio akhir tetap konsisten.' : 'This target keeps the final ratio consistent.'),
    },
  ];
  const waterBeanIntelligenceItems = [
    {
      label: copy.waterSourceUsed,
      value: plan.waterBrandLabel || copy.waterSelectedManual,
      detail: `TDS ${plan.waterMinerals.tdsPpm} - GH ${plan.waterMinerals.hardnessPpm} - KH ${plan.waterMinerals.alkalinityPpm} - ${localizedWaterStyle}`,
    },
    {
      label: id ? 'Bean' : 'Bean',
      value: `${localizedProcessLabel} / ${localizedVarietyLabel}`,
      detail: id
        ? `${localizedRoastLabel}; altitude ${plan.beanProfile.altitudeMasl ? `${plan.beanProfile.altitudeMasl} mdpl` : copy.notSpecified}; densitas ${plan.beanProfile.beanDensityGml ? `${plan.beanProfile.beanDensityGml} g/ml` : copy.notSpecified}.`
        : `${localizedRoastLabel}; altitude ${plan.beanProfile.altitudeMasl ? `${plan.beanProfile.altitudeMasl} masl` : copy.notSpecified}; density ${plan.beanProfile.beanDensityGml ? `${plan.beanProfile.beanDensityGml} g/ml` : copy.notSpecified}.`,
    },
    {
      label: copy.dripper,
      value: plan.dripper.name,
      detail: id
        ? `Profil alat ${formatDeviceProfileMode(copy, plan.deviceProfileMode)}; flow disesuaikan dengan keluarga metode ${plan.methodFamily}.`
        : `Device profile is ${formatDeviceProfileMode(copy, plan.deviceProfileMode)}; flow is matched to ${plan.methodFamily}.`,
    },
    {
      label: copy.grinder,
      value: plan.grinder.name,
      detail: `${localizedGrindSettingReference} - ${formatGrinderReferenceLabel(copy, plan.grindSettingVerification, plan.grindSettingMode)}`,
    },
  ];
  const resultHeaderClass = 'relative min-w-0 max-w-full overflow-hidden rounded-[1.5rem] border panel-divider-subtle panel-soft px-4 pb-4 pt-5 lg:px-5';
  const resultMetricCardClass = 'min-w-0 max-w-full rounded-2xl border panel-divider-subtle bg-[var(--bg-base)]/84 p-3 [overflow-wrap:anywhere]';
  const resultChipClass = 'max-w-full rounded-full border panel-divider-subtle bg-[var(--bg-base)] px-2.5 py-1 text-[11px] font-medium text-secondary [overflow-wrap:anywhere]';
  const resultActionButtonClass = 'min-h-[44px] min-w-0 w-full rounded-xl border panel-divider-subtle bg-[var(--bg-base)] px-3 py-2 text-center text-[13px] font-medium leading-4 text-primary transition-colors hover:border-blue-500/20 hover:bg-surface-alpha sm:w-auto sm:text-sm sm:whitespace-nowrap';
  const saveButtonLabel = saving
    ? (id ? 'Menyimpan...' : 'Saving...')
    : saveSuccess
      ? copy.saved
      : copy.saveToCollection;
  const feedbackOptions: Array<{ rating: BrewTasteFeedbackRating; label: string }> = [
    { rating: 'great', label: copy.feedbackGreat },
    { rating: 'sour', label: copy.feedbackSour },
    { rating: 'bitter', label: copy.feedbackBitter },
    { rating: 'thin', label: copy.feedbackThin },
    { rating: 'flat', label: copy.feedbackFlat },
    { rating: 'muddy', label: copy.feedbackMuddy },
    { rating: 'astringent', label: copy.feedbackAstringent },
  ];
  const activeFeedbackCorrection = feedback ? buildTasteFeedbackCorrection(plan, feedback.rating, language) : null;
  const expectedCupItems = expectedCup ? [
    { label: copy.cupAcidity, value: expectedCup.acidity },
    { label: copy.cupSweetness, value: expectedCup.sweetness },
    { label: copy.cupBody, value: expectedCup.body },
    { label: copy.cupClarity, value: expectedCup.clarity },
    { label: copy.cupBitterRisk, value: expectedCup.bitterRisk },
    ...(typeof expectedCup.aromaIntensity === 'number' ? [{ label: copy.cupAroma, value: expectedCup.aromaIntensity }] : []),
  ] : [];
  const readinessItems = plan.readinessScores ? [
    { label: copy.confidenceRecipe, value: plan.readinessScores.recipe },
    { label: copy.confidenceWater, value: plan.readinessScores.water },
    { label: copy.confidenceGrinder, value: plan.readinessScores.grinder },
    { label: copy.confidenceWorkflow, value: plan.readinessScores.workflow },
    { label: copy.confidenceCatalog, value: plan.readinessScores.catalog },
  ] : [];
  const compactExpectedCupItems = expectedCupItems.slice(0, 4);
  const beanCoverageTone = plan.beanCoverage?.category === 'known_high'
    ? 'border-emerald-500/18 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : plan.beanCoverage?.category === 'unsupported_unsafe'
      ? 'border-rose-500/18 bg-rose-500/10 text-rose-700 dark:text-rose-300'
      : plan.beanCoverage?.category === 'risk_caution'
        ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'border-blue-500/18 bg-blue-500/10 text-blue-700 dark:text-blue-300';
  const guideDensityToggle = (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex rounded-full border panel-divider-subtle bg-[var(--bg-base)] p-1"
        data-testid="ai-brew-guide-density-toggle"
        aria-label={id ? 'Mode tampilan panduan' : 'Guide display mode'}
      >
        {([
          ['basic', copy.guideDensitySimple],
          ['pro', copy.guideDensityPro],
        ] as const).map(([density, label]) => (
          <button
            key={density}
            type="button"
            onClick={() => setGuideDensity(density)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              guideDensity === density
                ? 'bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)]'
                : 'text-secondary hover:text-primary'
            }`}
            data-testid={`ai-brew-guide-density-${density}`}
            aria-pressed={guideDensity === density}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="text-xs leading-5 text-secondary">
        {guideDensity === 'basic' ? copy.guideDensitySimpleHint : copy.guideDensityProHint}
      </span>
    </div>
  );

  function startFlowTimer() {
    if (flowProgressSeconds >= plan.totalTimeSeconds) {
      setFlowElapsedSeconds(0);
      setFlowAccumulatedSeconds(0);
    }
    setFlowRunning(true);
    setFlowStartedAtMs(Date.now());
  }

  function pauseFlowTimer() {
    setFlowAccumulatedSeconds(flowProgressSeconds);
    setFlowElapsedSeconds(flowProgressSeconds);
    setFlowRunning(false);
    setFlowStartedAtMs(null);
  }

  function resetFlowTimer() {
    setFlowElapsedSeconds(0);
    setFlowAccumulatedSeconds(0);
    setFlowRunning(false);
    setFlowStartedAtMs(null);
  }

  function scrollTasteFeedbackIntoView() {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const feedbackPanel = document.querySelector<HTMLElement>('[data-testid="ai-brew-taste-feedback"]');
      if (!feedbackPanel) return;
      feedbackPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusTarget = feedbackPanel.querySelector<HTMLElement>('button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
      focusTarget?.focus({ preventScroll: true });
    });
  }

  function openTasteFeedback() {
    pendingTasteFocusRef.current = true;
    if (activeTab === 'details') {
      pendingTasteFocusRef.current = false;
      scrollTasteFeedbackIntoView();
      return;
    }
    setActiveTab('details');
  }

  return (
    <FocusLockedDialog
      open={open}
      onClose={onClose}
      ariaLabel={copy.summaryTitle}
      ariaDescribedBy={descriptionId}
      className="fixed inset-0 z-[111] h-[var(--fullscreen-modal-height)] max-h-[var(--fullscreen-modal-height)] max-w-full overflow-hidden bg-[var(--bg-base)]/98 lg:inset-6 lg:mx-auto lg:h-auto lg:max-h-[calc(var(--fullscreen-modal-height)_-_3rem)] lg:max-w-6xl lg:rounded-[2rem] lg:border lg:border-glass lg:shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
    >
      <div className="flex h-full min-w-0 max-w-full flex-col overflow-hidden" data-testid="ai-brew-result">
        <div
          className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-6 pt-4 lg:px-6 lg:pb-8 lg:pt-6"
          style={{
            paddingTop: 'calc(16px + var(--safe-top, 0px))',
            paddingBottom: 'calc(28px + var(--bottom-safe-capped, 0px))',
          }}
          tabIndex={0}
          aria-labelledby={isQuickResult ? undefined : activeTabId}
        >
          <div className="space-y-5">
            <div className={resultHeaderClass}>
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--panel-border-soft)] lg:hidden" />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border panel-divider-subtle bg-[var(--bg-base)] text-primary transition-colors hover:bg-surface-alpha"
                aria-label={copy.closeResult}
              >
                <X size={18} />
              </button>
              <div className="min-w-0 pr-12">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {plan.deviceProfileMode !== 'exact' && (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      {formatDeviceProfileMode(copy, plan.deviceProfileMode)}
                    </span>
                  )}
                  <span className={resultChipClass}>
                    {plan.dripper.name}
                  </span>
                  <span className={resultChipClass}>
                    {localizedTargetProfileLabel}
                  </span>
                  {plan.targetProfileAutoSuggested && (
                    <span className={`${resultChipClass} border-emerald-500/18 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>
                      {copy.autoTargetSuggested}
                    </span>
                  )}
                  {plan.processRisk?.variability === 'high' && (
                    <span className={`${resultChipClass} border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300`}>
                      {copy.highVariability}
                    </span>
                  )}
                  <span className={`${resultChipClass} inline-flex items-center gap-1.5 ${
                    aiEngineOnline
                      ? 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      : 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}>
                    {aiEngineOnline ? <Brain size={12} /> : <Sparkles size={12} />}
                    {aiEngineOnline ? copy.aiEngineOnlineOptimized : copy.aiEngineLocalValidated}
                  </span>
                </div>
                <h3 className="break-words text-lg font-semibold tracking-tight text-primary sm:text-xl">{buildLocalizedPlanRecipeName(plan, language)}</h3>
                <p id={descriptionId} className="sr-only">
                  {isQuickResult
                    ? (id ? 'Hasil Quick AI Brew berisi urutan seduh ringkas dan kontrol barista inti.' : 'Quick AI Brew result with a compact brew sequence and core barista controls.')
                    : `${formatRoundedGrams(plan.doseG)} - ${planHeaderWater} - ${extractionTimeLabel} ${formatGuideTime(extractionSeconds)} - ${formatRoundedTemperature(plan.waterTempC)}`}
                </p>
                {(expectedCup || readinessItems.length > 0 || plan.beanCoverage) && (
                  <div
                    className="mt-3 min-w-0 max-w-full overflow-hidden rounded-[1rem] border panel-divider-subtle bg-[var(--bg-base)]/74 p-2.5 text-xs [overflow-wrap:anywhere]"
                    data-testid="ai-brew-expected-cup"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {plan.beanCoverage && (
                        <span
                          className={`rounded-full border px-2 py-1 font-semibold ${beanCoverageTone}`}
                          data-testid="ai-brew-bean-coverage"
                          aria-label={`${copy.beanCoverageTitle}: ${localizedBeanCoverageLabel}`}
                        >
                          {localizedBeanCoverageLabel}
                        </span>
                      )}
                      {expectedCup && (
                        <span className="rounded-full bg-surface-alpha px-2 py-1 font-semibold text-primary">
                          {copy.expectedCupTitle}: {localizedExpectedCupConfidence}
                        </span>
                      )}
                      {compactExpectedCupItems.map((item) => (
                        <span key={item.label} className="rounded-full border panel-divider-subtle bg-surface-alpha px-2 py-1 text-secondary">
                          <span className="mr-1 text-tertiary">{item.label}</span>
                          <span className="font-semibold text-primary">{item.value}/5</span>
                        </span>
                      ))}
                    </div>
                    {(readinessItems.length > 0 || expectedCup?.warnings[0] || expectedCup?.reasons[0] || plan.beanCoverage) && (
                      <details className="group mt-2 rounded-xl border panel-divider-subtle bg-surface-alpha px-3 py-2">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-primary">
                          <span>{id ? 'Detail prediksi & keyakinan' : 'Prediction & confidence detail'}</span>
                          <ArrowRight size={14} className="shrink-0 text-secondary transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {plan.beanCoverage && (
                            <div className="rounded-xl bg-[var(--bg-base)] px-3 py-2 text-[12px] leading-5 text-secondary" data-testid="ai-brew-bean-coverage-detail">
                              <p className="font-semibold text-primary">{copy.beanCoverageTitle}: {localizedBeanCoverageConfidence}</p>
                              <p className="mt-1">{localizeAiBrewDynamicText(plan.beanCoverage.warnings[0] || plan.beanCoverage.reasons[0] || copy.beanCoverageFallback, language)}</p>
                              <p className="mt-1">{localizeAiBrewDynamicText(plan.beanCoverage.nextAction || copy.beanCoverageTasteLoop, language)}</p>
                            </div>
                          )}
                          {(expectedCup?.warnings[0] || expectedCup?.reasons[0]) && (
                            <div className="rounded-xl bg-[var(--bg-base)] px-3 py-2 text-[12px] leading-5 text-secondary">
                              <p className="font-semibold text-primary">{copy.expectedCupTitle}</p>
                              <p className="mt-1">
                                {localizeAiBrewDynamicText((expectedCup?.warnings[0] || expectedCup?.reasons[0]) ?? '', language)}
                              </p>
                            </div>
                          )}
                          {readinessItems.length > 0 && (
                            <div className="grid gap-1.5">
                              {readinessItems.map((item) => (
                                <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                                  <span className="truncate text-secondary">{item.label}</span>
                                  <span className="font-semibold text-primary">{item.value}/100</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2" data-testid="ai-brew-result-primary-actions">
                  <button
                    type="button"
                    onClick={() => setActiveTab('flow')}
                    className="inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.2)]"
                    data-testid="ai-brew-open-flow"
                  >
                    <Play size={15} />
                    <span className="truncate">{copy.flowTab}</span>
                  </button>
                  <button
                    type="button"
                    onClick={openTasteFeedback}
                    className="inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border panel-divider-subtle bg-[var(--bg-base)] px-3 py-2 text-sm font-semibold text-primary"
                    data-testid="ai-brew-result-check-taste-primary"
                  >
                    <Sparkles size={15} />
                    <span className="truncate">{copy.feedbackTitle}</span>
                  </button>
                </div>
                <details className="group mt-2 rounded-xl border panel-divider-subtle bg-surface-alpha px-3 py-2" data-testid="ai-brew-result-secondary-actions">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-primary">
                    <span>{id ? 'Lainnya' : 'More actions'}</span>
                    <ArrowRight size={14} className="shrink-0 text-secondary transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="mt-2 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <button type="button" onClick={onEditInputs} className={resultActionButtonClass} data-testid="ai-brew-edit-inputs">
                      {copy.editInputs}
                    </button>
                    <button type="button" onClick={() => onUseInTimer(plan.totalTimeSeconds)} disabled={workflowBlocked} className={`${resultActionButtonClass} disabled:cursor-not-allowed disabled:opacity-55`} data-testid="ai-brew-use-timer" aria-label={copy.ariaUseInTimer.replace('{name}', buildLocalizedPlanRecipeName(plan, language))}>
                      {copy.useInTimer}
                    </button>
                    <button type="button" onClick={() => onUseInRatio(plan)} className={resultActionButtonClass} data-testid="ai-brew-use-ratio" aria-label={copy.ariaUseInRatio.replace('{name}', buildLocalizedPlanRecipeName(plan, language))}>
                      {copy.useInRatio}
                    </button>
                    <button type="button" onClick={onSaveRecipe} disabled={saving || workflowBlocked} className={`${resultActionButtonClass} disabled:cursor-not-allowed disabled:opacity-55`} data-testid="ai-brew-save" aria-label={copy.ariaSaveToCollection.replace('{name}', buildLocalizedPlanRecipeName(plan, language))}>
                      {saveButtonLabel}
                    </button>
                    <button type="button" onClick={onToggleFavorite} className={resultActionButtonClass} data-testid="ai-brew-favorite" aria-label={(currentPreset ? copy.ariaFavoriteRemove : copy.ariaFavoriteAdd).replace('{name}', buildLocalizedPlanRecipeName(plan, language))}>
                      <span className="inline-flex min-w-0 items-center justify-center gap-2">
                        {currentPreset ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                        <span className="truncate">{currentPreset ? copy.unfavorite : copy.favorite}</span>
                      </span>
                    </button>
                  </div>
                </details>
              </div>

              {resultTabs.length > 1 && (
                <div className="mt-3 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div
                  role="tablist"
                  aria-label={copy.summaryTitle}
                  className="grid min-w-0 w-full max-w-full grid-cols-[repeat(4,minmax(0,1fr))] gap-1.5 rounded-[0.95rem] panel-soft p-1.5 xl:max-w-lg"
                >
                  {resultTabs.map((tab) => (
                    <button
                      key={tab.id}
                      id={`ai-brew-result-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`ai-brew-result-panel-${tab.id}`}
                      tabIndex={activeTab === tab.id ? 0 : -1}
                      onClick={() => setActiveTab(tab.id)}
                      className={`min-w-0 overflow-hidden rounded-[0.8rem] px-2 py-2 text-xs font-medium leading-4 transition-all sm:px-2.5 sm:text-sm ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.2)]'
                          : 'text-secondary hover:text-primary'
                      }`}
                      data-testid={`ai-brew-result-tab-${tab.id}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                </div>
              )}

              {saveSuccess && (
                <div
                  className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300"
                  data-testid="ai-brew-save-success"
                >
                  <Check size={16} className="shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}
              {saveError && (
                <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-300">
                  {saveError}
                </div>
              )}
            </div>

            {activeTab === 'plan' && (
              <div
                id={activeTabPanelId}
                role="tabpanel"
                aria-labelledby={activeTabId}
                className="grid min-w-0 max-w-full gap-4 overflow-x-clip"
                data-testid="ai-brew-result-summary-panel"
              >
                <div className="min-w-0 max-w-full overflow-hidden rounded-[1.25rem] border border-blue-500/18 bg-blue-500/[0.07] p-3.5 lg:p-4">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                        {copy.planTab}
                      </p>
                      <h4 className="mt-1 break-words text-base font-semibold text-primary">
                        {buildLocalizedPlanRecipeName(plan, language)}
                      </h4>
                      <p className="mt-1 max-w-2xl break-words text-sm leading-5 text-secondary">
                        {displaySummary}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      workflowValidation?.status === 'blocked'
                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                        : workflowValidation?.status === 'ready' || !workflowValidation
                          ? 'border-emerald-500/18 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    }`}>
                      {workflowValidation?.status === 'blocked'
                        ? (id ? 'Diblokir' : 'Blocked')
                        : workflowValidation?.status === 'ready' || !workflowValidation
                          ? (id ? 'Aman' : 'Safe')
                          : (id ? 'Perlu review' : 'Needs review')}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 text-xs sm:grid-cols-[repeat(3,minmax(0,1fr))] lg:grid-cols-[repeat(6,minmax(0,1fr))]" data-testid="ai-brew-result-summary-metric-strip">
                    {[
                      { id: 'dose', label: copy.dose, value: formatRoundedGrams(plan.doseG) },
                      { id: 'water', label: plan.brewMode === 'iced' ? (id ? 'Input air' : 'Water input') : copy.totalWater, value: planHeaderWater },
                      { id: 'ratio', label: copy.finalRatio, value: `1:${formatBrewRatio(plan.finalBeverageRatio)}` },
                      { id: 'time', label: extractionTimeLabel, value: formatGuideTime(extractionSeconds) },
                      { id: 'temp', label: copy.temp, value: formatRoundedTemperature(plan.waterTempC) },
                      { id: 'grind', label: copy.grind, value: localizedGrindHeadline },
                    ].map((item) => (
                      <span key={item.id} className="min-w-0 max-w-full rounded-xl border panel-divider-subtle bg-[var(--bg-base)]/82 px-2.5 py-2 text-secondary">
                        <span className="block text-[10px] uppercase tracking-widest text-tertiary">{item.label}</span>
                        <span className="block break-words font-semibold text-primary">{item.value}</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 text-xs sm:grid-cols-[repeat(3,minmax(0,1fr))]" data-testid="ai-brew-time-semantics">
                    {timeSummaryItems.map((item) => (
                      <span key={item.id} className="min-w-0 rounded-xl border border-blue-500/14 bg-[var(--bg-base)]/78 px-2.5 py-2 text-secondary">
                        <span className="block text-[10px] uppercase tracking-widest text-tertiary">{item.label}</span>
                        <span className="block break-words font-semibold text-primary">{item.value}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 rounded-xl border border-blue-500/14 bg-blue-500/[0.07] px-3 py-2 text-xs leading-5 text-blue-800 dark:text-blue-200" data-testid="ai-brew-time-helper">
                    {timeHelperText}
                  </p>
                  {plan.methodFamily === 'hario_switch' && (
                    <div className="mt-3 flex min-w-0 max-w-full flex-wrap gap-1.5 text-xs" data-testid="ai-brew-switch-result-summary">
                      <span className={resultChipClass}>{plan.switchPresetLabel || (id ? 'Metode Switch' : 'Switch method')}</span>
                      <span className={resultChipClass}>{resultSwitchValvePathLabel}</span>
                      {switchSafetyMessage && (
                        <span className={`rounded-full border px-2.5 py-1 font-semibold ${
                          switchSafetyStatus === 'blocked'
                            ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            : switchSafetyStatus === 'caution'
                              ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'border-emerald-500/18 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {switchSafetyMessage}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <section
                  className="min-w-0 max-w-full overflow-hidden rounded-[1.1rem] border panel-divider-subtle bg-[var(--bg-base)]/78 p-3.5"
                  data-testid="ai-brew-pro-why-recipe"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">
                        {id ? 'Kenapa Resep Ini' : 'Why This Recipe'}
                      </h4>
                      <p className="mt-1 text-xs leading-5 text-secondary">
                        {id
                          ? 'Inti keputusan planner: target rasa, ekstraksi, air, grinder, dan workflow alat diringkas tanpa klaim 100% pasti.'
                          : 'Planner decision summary: taste target, extraction, water, grinder, and brewer workflow without claiming certainty.'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {summaryWhyRecipeItems.map((item) => (
                      <div key={item.label} className="min-w-0 rounded-xl bg-surface-alpha px-3 py-2.5 [overflow-wrap:anywhere]">
                        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-secondary">{item.label}</p>
                          <p className="min-w-0 break-words text-sm font-semibold text-primary">{item.value}</p>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-secondary">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {actionPriorities.length > 0 && (
                  <div
                    className="min-w-0 max-w-full overflow-hidden rounded-[1.1rem] border border-blue-500/18 bg-[var(--bg-base)]/78 p-3"
                    data-testid="ai-brew-action-priorities"
                  >
                    <div className="mb-2 flex min-w-0 items-start gap-2">
                      <Target size={15} className="mt-0.5 shrink-0 text-blue-500" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                          {copy.actionPrioritiesTitle}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-secondary">
                          {copy.actionPrioritiesDescription}
                        </p>
                      </div>
                    </div>
                    <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 text-[13px] leading-5 text-secondary sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                      {actionPriorities.slice(0, 3).map((item, index) => (
                        <li key={`${index}-${item}`} className="flex items-start gap-2 rounded-xl bg-surface-alpha px-3 py-2">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                            {index + 1}
                          </span>
                          <span className="min-w-0">{compactAiBrewInstruction(item, 96)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'details' && !isQuickResult && (
              <div
                id={activeTabPanelId}
                role="tabpanel"
                aria-labelledby={activeTabId}
                className="flex min-w-0 max-w-full flex-col gap-5 overflow-x-clip"
                data-testid="ai-brew-result-detail-panel"
              >
              <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2.5 sm:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(5,minmax(0,1fr))]">
                <div className={resultMetricCardClass}>
                  <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.cupOutput}</p>
                  <p className="mt-1 text-xl font-semibold text-primary sm:text-2xl">{formatRoundedMl(plan.estimatedCupOutputMl)}</p>
                </div>
                <div className={resultMetricCardClass}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-secondary">
                    <Thermometer size={12} />
                    <span>{copy.temp}</span>
                  </div>
                  <p className="mt-1 text-base font-semibold text-primary sm:text-lg">{formatRoundedTemperature(plan.waterTempC)}</p>
                </div>
                <div className={resultMetricCardClass}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-secondary">
                    <Clock3 size={12} />
                    <span>{extractionTimeLabel}</span>
                  </div>
                  <p className="mt-1 text-base font-semibold text-primary sm:text-lg">{formatGuideTime(extractionSeconds)}</p>
                  {guideEndSeconds > extractionSeconds && (
                    <p className="mt-1 text-xs text-secondary">{guideEndLabel}: {formatGuideTime(guideEndSeconds)}</p>
                  )}
                </div>
                <div className={resultMetricCardClass}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-secondary">
                    <Gauge size={12} />
                    <span>{copy.grind}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-primary">{localizedGrindHeadline}</p>
                  <p className="mt-1 text-xs text-secondary">{localizedGrindBandLabel}</p>
                </div>
                <div className={resultMetricCardClass}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-secondary">
                    <Droplets size={12} />
                    <span>{plan.brewMode === 'iced' ? copy.hotConcentrate : copy.totalWater}</span>
                  </div>
                  <p className="mt-1 text-base font-semibold text-primary sm:text-lg">{formatRoundedMl(plan.hotWaterMl)}</p>
                  {plan.iceMl > 0 && (
                    <p className="mt-1 text-xs text-secondary">1:{formatBrewRatio(plan.hotExtractionRatio)}{' - '}{copy.ice}: {formatRoundedGrams(plan.iceMl)}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <section
                  className="rounded-[1.2rem] border panel-divider-subtle bg-[var(--bg-base)]/74 p-4"
                  data-testid="ai-brew-pro-target-compare"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Target size={15} className="text-emerald-500" />
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">
                      {id ? 'Compare Target Profile' : 'Target Profile Compare'}
                    </h4>
                  </div>
                  <div className="grid gap-2">
                    {targetProfileCompareRows.map((item) => {
                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border px-3 py-2.5 ${
                            item.active
                              ? 'border-emerald-500/25 bg-emerald-500/10'
                              : 'panel-divider-subtle bg-surface-alpha'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-primary">{item.label}</p>
                            <p className="text-[11px] font-semibold text-secondary">
                              {item.finalComputed}
                            </p>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-secondary">
                            {item.effect}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-secondary">
                            {id ? 'Hasil final' : 'Final computed'}: {item.finalComputed}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-tertiary">
                            {id ? 'Alasan' : 'Why'}: {item.why}
                          </p>
                          {item.sameRecipe && (
                            <span className="mt-2 inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                              {id ? 'resep deterministik sama' : 'same deterministic recipe'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <section
                  className="rounded-[1.2rem] border panel-divider-subtle bg-[var(--bg-base)]/74 p-4"
                  data-testid="ai-brew-pro-precision-tolerance"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Gauge size={15} className="text-amber-500" />
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">
                      {id ? 'Precision Tolerance' : 'Precision Tolerance'}
                    </h4>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {precisionToleranceItems.map((item) => (
                      <div key={item.label} className="rounded-xl bg-surface-alpha px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-secondary">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-primary">{item.value}</p>
                        <p className="mt-1 text-xs leading-5 text-secondary">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  className="rounded-[1.2rem] border panel-divider-subtle bg-[var(--bg-base)]/74 p-4"
                  data-testid="ai-brew-pro-water-bean-intelligence"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <FlaskConical size={15} className="text-sky-500" />
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">
                      {id ? 'Water + Bean Intelligence' : 'Water + Bean Intelligence'}
                    </h4>
                  </div>
                  <div className="grid gap-2">
                    {waterBeanIntelligenceItems.map((item) => (
                      <div key={item.label} className="rounded-xl bg-surface-alpha px-3 py-2.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-secondary">{item.label}</p>
                          <p className="text-sm font-semibold text-primary">{item.value}</p>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-secondary">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {plan.iceMl > 0 && (
                <div
                  className="rounded-[1.2rem] border border-sky-500/20 bg-sky-500/[0.08] p-4"
                  data-testid="ai-brew-iced-calibration"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Snowflake size={16} className="text-sky-500" />
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.iceSetupTitle}</h4>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-secondary">{copy.iceSetupDetail}</p>
                      <p className="mt-2 rounded-xl border border-sky-500/15 bg-[var(--bg-base)]/70 px-3 py-2 text-sm font-medium leading-5 text-primary">
                        {id
                          ? `${formatRoundedGrams(plan.iceMl)} es di server + ${formatRoundedMl(plan.hotWaterMl)} air panas ke bed kopi. Berhenti di target panas, lalu aduk server sebelum minum.`
                          : `${formatRoundedGrams(plan.iceMl)} ice in the server + ${formatRoundedMl(plan.hotWaterMl)} hot water through the bed. Stop at the hot target, then stir the server before drinking.`}
                      </p>
                    </div>
                    <div className="grid w-full min-w-[12rem] grid-cols-1 gap-2 text-xs sm:w-auto sm:grid-cols-3">
                      <span className="rounded-xl bg-[var(--bg-base)] px-3 py-2 text-secondary">
                        <span className="block text-[10px] uppercase tracking-widest text-tertiary">{copy.finalRatio}</span>
                        <span className="font-semibold text-primary">1:{formatBrewRatio(plan.finalBeverageRatio)}</span>
                      </span>
                      <span className="rounded-xl bg-[var(--bg-base)] px-3 py-2 text-secondary">
                        <span className="block text-[10px] uppercase tracking-widest text-tertiary">{copy.hotConcentrate}</span>
                        <span className="font-semibold text-primary">1:{formatBrewRatio(plan.hotExtractionRatio)}</span>
                      </span>
                      <span className="rounded-xl bg-[var(--bg-base)] px-3 py-2 text-secondary">
                        <span className="block text-[10px] uppercase tracking-widest text-tertiary">{copy.ice}</span>
                        <span className="font-semibold text-primary">{formatRoundedGrams(plan.iceMl)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {false && (
                <>
                  <div className="rounded-[1.4rem] border panel-divider-subtle panel-soft p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                  <div className="rounded-2xl bg-surface-alpha p-4">
                    <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.sopQuickDial}</p>
                    <div className="mt-3 space-y-2 text-sm text-secondary">
                      <p>{plan.doseG} g coffee</p>
                      <p>{formatRoundedMl(plan.totalWaterMl)} water at {formatRoundedTemperature(plan.waterTempC)}</p>
                      <p>{copy.grind}: {localizedGrindRecommendation}</p>
                      <p>{id ? 'Ekstraksi' : 'Extraction'}: {formatTime(extractionSeconds)}</p>
                      <p>{plan.waterBrandLabel || copy.waterSelectedManual} - TDS {plan.waterMinerals.tdsPpm} - GH {plan.waterMinerals.hardnessPpm} - KH {plan.waterMinerals.alkalinityPpm}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-surface-alpha p-4">
                    <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.sopSteps}</p>
                    <div className="mt-3 space-y-2 text-sm text-secondary">
                      {plan.steps.map((step, index) => (
                        <p key={step.id}>
                          {index + 1}. {formatGuideTime(step.startSeconds)} - {localizeAiBrewStepLabel(step.label, language)} - {buildAiBrewStepActionText(step, language, plan)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

                </>
              )}

              <div className="order-1 grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)]">
                <div className="space-y-5">
                  <div
                    className="rounded-[1.2rem] border border-blue-500/18 bg-blue-500/[0.08] p-3.5 lg:p-4"
                    data-testid="ai-brew-sequence-section"
                  >
                    <div data-testid="ai-brew-sequence-note">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Waves size={17} className="text-blue-500" />
                          <h4 className="text-base font-semibold text-primary">{copy.recipe}</h4>
                        </div>
                        <p className="max-w-2xl text-sm text-secondary">
                          {isIndonesianAiBrewLanguage(language)
                            ? 'Ikuti timer. Angka penting tetap terlihat; detail teknik untuk Pro.'
                            : 'Follow the timer. Core numbers stay visible; technique detail is for Pro.'}
                        </p>
                        <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-secondary">
                          <span className={resultChipClass}>
                            {formatRoundedGrams(plan.doseG)}
                          </span>
                          <span className={resultChipClass}>
                            {formatRoundedMl(plan.totalWaterMl)}
                          </span>
                          <span className={resultChipClass}>
                            {extractionTimeLabel} {formatGuideTime(extractionSeconds)}
                          </span>
                          <span className={resultChipClass}>
                            {formatRoundedTemperature(plan.waterTempC)}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {guideDensityToggle}
                        <button
                          type="button"
                          onClick={onSaveRecipe}
                          disabled={saving || workflowBlocked}
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-blue-500/18 bg-[var(--bg-base)] px-3 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-500/30 hover:bg-blue-500/[0.08] disabled:cursor-not-allowed disabled:opacity-55 dark:text-blue-300"
                          data-testid="ai-brew-save-inline"
                          aria-label={copy.ariaSaveToCollection.replace('{name}', buildLocalizedPlanRecipeName(plan, language))}
                        >
                          {saveSuccess ? <Check size={14} /> : <Bookmark size={14} />}
                          {saveButtonLabel}
                        </button>
                        <span className="rounded-full border border-blue-500/18 bg-[var(--bg-base)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                          {workflowGuideSteps.length} {copy.stepCountSuffix}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {workflowGuideSteps.map((step, index) => renderAiBrewSequenceStepCard(plan, step, index, language, guideDensity, !isQuickResult && guideDensity === 'pro'))}
                      {/*
                      {plan.steps.map((step, index) => {
                        const localizedStepLabel = localizeAiBrewStepLabel(step.label, language);
                        const stepActionText = buildAiBrewStepActionText(step, language, plan);
                        const stepQuickNote = buildAiBrewStepQuickNote(step, language);
                        const stepDetailPoints = buildAiBrewStepDetailPoints(step, language);
                        const stepMetrics = buildAiBrewStepMetrics(step, language, plan);

                        return (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.16 }}
                          className="rounded-[1.2rem] border border-white/10 bg-[rgba(255,255,255,0.03)] p-3.5 sm:p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/12 text-sm font-semibold text-blue-400">
                              {index + 1}
                              <p className="text-xs text-secondary">{formatGuideTime(step.startSeconds)} - {formatRoundedMl(step.pourVolumeMl)} pour - {formatRoundedMl(step.targetVolumeMl)} target</p>
                            </div>
                            <span className="rounded-full border border-blue-500/12 bg-[var(--bg-base)] px-3.5 py-2 text-sm font-semibold text-primary shadow-[0_8px_18px_rgba(15,23,42,0.12)]">
                              {formatRoundedMl(step.pourVolumeMl)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-secondary">
                            {localizeAiBrewDynamicText(step.hybridInstruction || step.note, language)}
                          </p>
                        </motion.div>
                      */}
                    </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <ResultDisclosureSection
                    title={copy.methodBriefWatch}
                    summary={methodBrief.watch[0]}
                    icon={<Target size={15} />}
                    defaultOpen={false}
                    tone="blue"
                  >
                    <ul className="space-y-2 text-sm leading-5 text-secondary">
                      {methodBrief.watch.map((item) => (
                        <li key={item} className="rounded-xl bg-surface-alpha px-3 py-2">{item}</li>
                      ))}
                    </ul>
                  </ResultDisclosureSection>

                  <ResultDisclosureSection
                    title={copy.feedbackTitle}
                    summary={copy.feedbackDescription}
                    icon={<Coffee size={15} />}
                    defaultOpen
                    testId="ai-brew-taste-feedback"
                  >
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {feedbackOptions.map((item) => {
                        const selected = feedback?.rating === item.rating;
                        return (
                          <button
                            key={item.rating}
                            type="button"
                            onClick={() => onSaveFeedback(item.rating)}
                            className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                              selected
                                ? 'border-blue-500/25 bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]'
                                : 'panel-divider-subtle bg-[var(--bg-base)] text-primary hover:border-blue-500/20 hover:bg-surface-alpha'
                            }`}
                            aria-pressed={selected}
                            data-testid={`ai-brew-feedback-${item.rating}`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    <label className="mt-3 block">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-secondary">{copy.feedbackNote}</span>
                      <textarea
                        name="ai-brew-feedback-note"
                        value={feedbackNoteDraft}
                        onChange={(event) => onFeedbackNoteChange(event.target.value.slice(0, AI_BREW_FEEDBACK_NOTE_MAX_LENGTH))}
                        placeholder={copy.feedbackNotePlaceholder}
                        maxLength={AI_BREW_FEEDBACK_NOTE_MAX_LENGTH}
                        className="glass-input min-h-20 w-full resize-none px-3 py-2 text-sm leading-5"
                        data-testid="ai-brew-feedback-note"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => feedback && onSaveFeedback(feedback.rating)}
                      disabled={!feedback || saving}
                      className="mt-2 inline-flex min-h-[40px] items-center justify-center rounded-xl border panel-divider-subtle bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary transition-colors hover:border-blue-500/20 hover:bg-surface-alpha disabled:cursor-not-allowed disabled:opacity-55"
                      data-testid="ai-brew-feedback-save-note"
                    >
                      {copy.feedbackSaveNote}
                    </button>
                    {feedback && (
                      <div
                        className="chat-markdown prose prose-sm mt-3 max-w-none rounded-2xl border border-blue-500/14 bg-blue-500/[0.07] px-3 py-3 text-primary prose-headings:text-primary prose-strong:text-primary"
                        data-testid="ai-brew-taste-loop"
                      >
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                          {copy.feedbackCoachTitle}
                        </p>
                        {activeFeedbackCorrection && (
                          <div className="mb-2 grid gap-1.5 text-sm leading-5">
                            <p><strong>{id ? 'Langkah utama' : 'Primary move'}:</strong> {activeFeedbackCorrection.primaryCorrection}</p>
                            <p><strong>{id ? 'Cadangan' : 'Backup'}:</strong> {activeFeedbackCorrection.backupCorrection}</p>
                          </div>
                        )}
                        <Suspense fallback={<p className="text-sm text-secondary">{copy.loadingCatalog}</p>}>
                          <Markdown>{buildAiBrewTasteLoopMarkdown(plan, feedback, language)}</Markdown>
                        </Suspense>
                        <p className="mt-2 text-xs text-secondary">{copy.feedbackCoachHint}</p>
                      </div>
                    )}
                  </ResultDisclosureSection>

                  <ResultDisclosureSection
                    title={copy.waterSourceUsed}
                    summary={plan.waterBrandLabel || copy.waterSelectedManual}
                    icon={<FlaskConical size={15} />}
                    defaultOpen={false}
                  >
                    <div className="rounded-2xl bg-surface-alpha p-3">
                      <p className="text-sm font-semibold text-primary">{plan.waterBrandLabel || copy.waterSelectedManual}</p>
                      <p className="mt-1 text-xs text-secondary">
                        TDS {plan.waterMinerals.tdsPpm} - GH {plan.waterMinerals.hardnessPpm} - KH {plan.waterMinerals.alkalinityPpm}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-secondary">
                        <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">
                          {formatWaterReadinessStatus(copy, {
                            classification: plan.waterClassification,
                            presetStatus: plan.waterPresetStatus,
                            isBrewReady: plan.waterIsBrewReady,
                            mineralsReady: true,
                            mineralDerivation: plan.waterMineralDerivation,
                          })}
                        </span>
                        {plan.waterPresetStatus && (
                          <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">
                            {formatWaterPresetStatus(copy, plan.waterPresetStatus)}
                          </span>
                        )}
                        <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">
                          {plan.waterCustomized ? copy.waterBrandCustomized : localizedWaterStyle}
                        </span>
                        <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">
                          {formatWaterDerivationLabel(copy, plan.waterMineralDerivation)}
                        </span>
                      </div>
                    </div>
                  </ResultDisclosureSection>

                  {(showProvenance || plan.deviceProfileMode === 'exact' || plan.confidenceNotes.length > 0) && (
                    <ResultDisclosureSection
                      title={copy.provenance}
                      summary={`${formatDeviceProfileMode(copy, plan.deviceProfileMode)} - ${formatGrinderReferenceLabel(copy, plan.grindSettingVerification, plan.grindSettingMode)}`}
                      icon={<Info size={15} />}
                      defaultOpen={showProvenance}
                    >
                      <div className="space-y-3 text-sm text-secondary">
                        <div className="rounded-xl bg-surface-alpha px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.profileUsed}</p>
                          <p className="mt-1 font-medium text-primary">{plan.deviceProfileLabel}</p>
                          <p className="mt-1 text-xs">{formatDeviceProfileMode(copy, plan.deviceProfileMode)}</p>
                        </div>
                        <div className="rounded-xl bg-surface-alpha px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.grindSource}</p>
                          <p className="mt-1 font-medium text-primary">{localizedGrindSettingReference}</p>
                          <p className="mt-1 text-xs">{formatGrindSettingMode(copy, plan.grindSettingMode)} - {formatGrinderReferenceLabel(copy, plan.grindSettingVerification, plan.grindSettingMode)}</p>
                          <p className="mt-2 text-xs">{copy.grindCalibrationNote}</p>
                        </div>
                        <div className="rounded-xl bg-surface-alpha px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.confidenceNotes}</p>
                          <ul className="mt-2 space-y-2">
                            {plan.confidenceNotes.slice(0, 3).map((note) => (
                              <li key={note}>{localizeAiBrewDynamicText(note, language)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </ResultDisclosureSection>
                  )}

                  {false && (
                    <div className="rounded-[1.4rem] border panel-divider-subtle panel-soft p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Coffee size={15} className="text-amber-500" />
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.rationale}</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-secondary">
                        {plan.notes.map((note) => (
                          <li key={note} className="rounded-xl bg-surface-alpha px-3 py-2">{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(plan.guardrails.errors.length > 0 || plan.warnings.length > 0) && (
                    <ResultDisclosureSection
                      title={copy.warnings}
                      summary={copy.warningsDescription}
                      icon={<AlertTriangle size={15} />}
                      defaultOpen
                      tone="amber"
                    >
                      <div className="space-y-2 text-sm text-amber-700 dark:text-amber-200">
                        {localizedWarnings.map((warning, index) => (
                          <p key={`${warning}-${index}`} className="rounded-xl bg-[var(--bg-base)]/72 px-3 py-2 leading-5">{warning}</p>
                        ))}
                      </div>
                    </ResultDisclosureSection>
                  )}

                  {false && (plan.conformance.standardsHits.length > 0 || plan.conformance.standardsMisses.length > 0) && (
                    <div className="rounded-[1.4rem] border panel-divider-subtle panel-soft p-4">
                      <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.standards}</h4>
                      <div className="mt-2 space-y-2 text-sm">
                        {plan.conformance.standardsHits.map((item) => (
                          <p key={item} className="text-emerald-600 dark:text-emerald-300">? {item}</p>
                        ))}
                        {plan.conformance.standardsMisses.map((item) => (
                          <p key={item} className="text-amber-700 dark:text-amber-300">! {item}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
            )}

            {activeTab === 'details' && isQuickResult && (
              <div
                id={activeTabPanelId}
                role="tabpanel"
                aria-labelledby={activeTabId}
                className="grid gap-3"
                data-testid="ai-brew-result-detail-panel"
              >
                <ResultDisclosureSection
                  title={copy.provenance}
                  summary={`${formatDeviceProfileMode(copy, plan.deviceProfileMode)} - ${formatGrinderReferenceLabel(copy, plan.grindSettingVerification, plan.grindSettingMode)}`}
                  icon={<Info size={15} />}
                  defaultOpen={false}
                >
                  <div className="space-y-3 text-sm text-secondary">
                    <div className="rounded-xl bg-surface-alpha px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.profileUsed}</p>
                      <p className="mt-1 font-medium text-primary">{plan.deviceProfileLabel}</p>
                      <p className="mt-1 text-xs">{formatDeviceProfileMode(copy, plan.deviceProfileMode)}</p>
                    </div>
                    <div className="rounded-xl bg-surface-alpha px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.grindSource}</p>
                      <p className="mt-1 font-medium text-primary">{localizedGrindSettingReference}</p>
                      <p className="mt-1 text-xs">{formatGrinderReferenceLabel(copy, plan.grindSettingVerification, plan.grindSettingMode)}</p>
                    </div>
                  </div>
                </ResultDisclosureSection>
                <ResultDisclosureSection
                  title={copy.waterSourceUsed}
                  summary={plan.waterBrandLabel || copy.waterSelectedManual}
                  icon={<FlaskConical size={15} />}
                  defaultOpen={false}
                >
                  <p className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                    TDS {plan.waterMinerals.tdsPpm} - GH {plan.waterMinerals.hardnessPpm} - KH {plan.waterMinerals.alkalinityPpm} · {formatWaterDerivationLabel(copy, plan.waterMineralDerivation)}
                  </p>
                </ResultDisclosureSection>
              </div>
            )}

            {activeTab === 'flow' && (
              <div
                id={activeTabPanelId}
                role="tabpanel"
                aria-labelledby={activeTabId}
                className={isQuickResult ? 'grid gap-4' : 'grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'}
                data-testid="ai-brew-result-guide-panel"
              >
                <div className={isQuickResult ? 'order-2 space-y-5' : 'space-y-5'}>
                  <div className="rounded-[1.4rem] border border-blue-500/18 bg-blue-500/[0.08] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock3 size={16} className="text-blue-500" />
                          <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.flowTitle}</h4>
                        </div>
                      </div>
                      <span className="rounded-full border border-blue-500/18 bg-[var(--bg-base)] px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {flowStatusLabel}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      <div className="rounded-2xl bg-[var(--bg-base)]/82 p-3">
                        <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.flowElapsed}</p>
                        <p className="mt-1 text-3xl font-semibold text-primary">{formatGuideTime(flowProgressSeconds)}</p>
                      </div>
                      <div className="rounded-2xl bg-[var(--bg-base)]/82 p-3">
                        <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.flowMetricNext}</p>
                        <p className="mt-1 text-3xl font-semibold text-primary">{formatGuideTime(flowStepRemainingSeconds)}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-[var(--bg-base)]/88 p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                      <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.flowCurrentStep}</p>
                      <p className="mt-1 text-sm font-semibold text-primary">
                        {flowCurrentStep ? localizeAiBrewStepLabel(flowCurrentStep.label, language) : buildLocalizedPlanRecipeName(plan, language)}
                      </p>
                      <p className="mt-2 text-2xl font-semibold leading-tight text-primary sm:text-3xl">
                        {flowCurrentStep
                          ? buildAiBrewStepPrimaryCue(flowCurrentStep, language, plan)
                          : `${workflowGuideSteps.length} ${copy.stepCountSuffix}`}
                      </p>
                      <p className="mt-1 text-base font-semibold text-blue-700 dark:text-blue-300">
                        {flowCurrentStep
                          ? buildAiBrewStepTargetCue(flowCurrentStep, language, plan)
                          : displaySummary}
                      </p>
                      {flowCurrentStep && renderAiBrewStepMetricChips(
                        flowCurrentMetrics.core,
                        `${flowCurrentStep.id}-active`,
                        {
                          className: 'mt-3 flex flex-wrap gap-1.5',
                          testId: 'ai-brew-flow-current-step-technique',
                        },
                      )}
                      {isQuickResult ? (
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                          <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                            <span className="block text-[10px] uppercase tracking-widest text-tertiary">{copy.grind}</span>
                            <span className="font-semibold text-primary">{localizedGrindHeadline}</span>
                          </span>
                          <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                            <span className="block text-[10px] uppercase tracking-widest text-tertiary">{copy.finalRatio}</span>
                            <span className="font-semibold text-primary">1:{formatBrewRatio(plan.finalBeverageRatio)}</span>
                          </span>
                          <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary sm:col-span-1">
                            <span className="block text-[10px] uppercase tracking-widest text-tertiary">{id ? 'Kontrol' : 'Control'}</span>
                            <span className="font-semibold text-primary">{id ? 'Flow stabil + bed rata' : 'Stable flow + even bed'}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 xl:grid-cols-2">
                          <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                            <span className="block text-[10px] uppercase tracking-widest text-tertiary">{copy.flowMetricDose}</span>
                            <span className="font-semibold text-primary">{formatRoundedGrams(plan.doseG)}</span>
                          </span>
                          <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                            <span className="block text-[10px] uppercase tracking-widest text-tertiary">{methodBrief.primaryLabel}</span>
                            <span className="font-semibold text-primary">{methodBrief.primaryValue}</span>
                          </span>
                          {plan.iceMl > 0 && (
                            <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                              <span className="block text-[10px] uppercase tracking-widest text-tertiary">{copy.ice}</span>
                              <span className="font-semibold text-primary">{formatRoundedGrams(plan.iceMl)}</span>
                            </span>
                          )}
                          <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                            <span className="block text-[10px] uppercase tracking-widest text-tertiary">{copy.finalRatio}</span>
                            <span className="font-semibold text-primary">1:{formatBrewRatio(plan.finalBeverageRatio)}</span>
                          </span>
                          <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                            <span className="block text-[10px] uppercase tracking-widest text-tertiary">{copy.flowRemaining}</span>
                            <span className="font-semibold text-primary">{formatGuideTime(flowRemainingSeconds)}</span>
                          </span>
                          <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                            <span className="block text-[10px] uppercase tracking-widest text-tertiary">{extractionTimeLabel}</span>
                            <span className="font-semibold text-primary">{formatGuideTime(extractionSeconds)}</span>
                          </span>
                        </div>
                      )}
                      <p className="mt-3 rounded-xl border border-blue-500/14 bg-blue-500/[0.07] px-3 py-2 text-sm leading-5 text-blue-800 dark:text-blue-200">
                        {flowCurrentCompactCue}
                      </p>
                      {guideDensity === 'pro' && flowCurrentMetrics.detail.length > 0 && (
                        <details open={!isQuickResult && guideDensity === 'pro'} className="group mt-2 rounded-xl border panel-divider-subtle bg-surface-alpha px-3 py-2">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-primary">
                            <span>{id ? 'Detail teknik' : 'Technique detail'}</span>
                            <ArrowRight size={14} className="shrink-0 text-secondary transition-transform group-open:rotate-90" />
                          </summary>
                          {renderAiBrewStepMetricChips(flowCurrentMetrics.detail, `${flowCurrentStep?.id || 'current'}-active-detail`, {
                            className: 'mt-2 flex flex-wrap gap-1.5',
                            testId: 'ai-brew-flow-current-step-technique-detail',
                          })}
                        </details>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {guideDensityToggle}
                      <button
                        type="button"
                        onClick={flowRunning ? pauseFlowTimer : startFlowTimer}
                        disabled={workflowBlocked}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] disabled:cursor-not-allowed disabled:opacity-55"
                        data-testid="ai-brew-flow-toggle"
                      >
                        {flowRunning ? <Pause size={15} /> : <Play size={15} />}
                        {flowRunning ? copy.flowPause : copy.flowStart}
                      </button>
                      <button
                        type="button"
                        onClick={resetFlowTimer}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border panel-divider-subtle bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-primary"
                        data-testid="ai-brew-flow-reset"
                      >
                        <RotateCcw size={15} />
                        {copy.flowReset}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUseInTimer(plan.totalTimeSeconds)}
                        disabled={workflowBlocked}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border panel-divider-subtle bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-primary disabled:cursor-not-allowed disabled:opacity-55"
                        data-testid="ai-brew-flow-open-timer"
                      >
                        {copy.flowOpenTimer}
                      </button>
                    </div>

                    <div className="mt-4 rounded-2xl bg-[var(--bg-base)]/82 p-3.5">
                      <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.flowNextStep}</p>
                      <p className="mt-1 text-sm font-semibold text-primary">
                        {flowNextStep
                          ? `${formatGuideTime(flowNextStep.startSeconds)} | ${localizeAiBrewStepLabel(flowNextStep.label, language)}`
                          : copy.flowFinished}
                      </p>
                      <p className="mt-1 text-sm text-secondary">
                        {flowNextStep
                          ? buildAiBrewNextStepCue(flowNextStep, flowStepRemainingSeconds, language)
                          : (id
                            ? 'Seduh selesai. Cicipi hasilnya lalu simpan kalau sudah pas.'
                            : 'The brew is complete. Taste it, then save it if it lands well.')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={isQuickResult ? 'order-1 space-y-3' : 'space-y-3'} data-testid={isQuickResult ? 'ai-brew-sequence-section' : undefined}>
                  {isQuickResult && (
                    <div
                      className="rounded-[1.2rem] border border-blue-500/18 bg-blue-500/[0.08] p-3.5 shadow-[0_16px_34px_rgba(37,99,235,0.1)]"
                      data-testid="ai-brew-sequence-note"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Waves size={16} className="text-blue-500" />
                          <h4 className="text-sm font-semibold text-primary">{copy.recipe}</h4>
                        </div>
                        <span className="rounded-full border border-blue-500/18 bg-[var(--bg-base)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                          {workflowGuideSteps.length} {copy.stepCountSuffix}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-5 text-secondary">
                        {id
                          ? 'Ikuti langkah dari atas ke bawah. Fokus ke tuangan stabil, bed rata, dan cue koreksi yang muncul di tiap tahap.'
                          : 'Follow the steps from top to bottom. Focus on steady pouring, an even bed, and the correction cue inside each stage.'}
                      </p>
                      <div
                        className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-6"
                        data-testid="ai-brew-quick-setup"
                      >
                        {quickSetupItems.map((item) => (
                          <span
                            key={item.id}
                            className="rounded-xl bg-[var(--bg-base)]/84 px-2.5 py-2 text-secondary"
                            data-testid={`ai-brew-quick-setup-${item.id}`}
                          >
                            <span className="block text-[10px] uppercase tracking-widest text-tertiary">{item.label}</span>
                            <span className="font-semibold text-primary">{item.value}</span>
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-2 text-sm leading-5 sm:grid-cols-2" data-testid="ai-brew-quick-cues">
                        <div className="rounded-xl border border-blue-500/14 bg-[var(--bg-base)]/74 px-3 py-2.5">
                          <span className="block text-[10px] font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                            {id ? 'Setup' : 'Setup'}
                          </span>
                          <p className="mt-1 text-primary">{quickPrepCue}</p>
                        </div>
                        <div className="rounded-xl border panel-divider-subtle bg-[var(--bg-base)]/74 px-3 py-2.5">
                          <span className="block text-[10px] font-semibold uppercase tracking-widest text-tertiary">
                            {id ? 'Koreksi cepat' : 'Quick correction'}
                          </span>
                          <p className="mt-1 text-secondary">{quickCorrectionCue}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {workflowGuideSteps.map((step, index) => {
                    const state = index < flowActiveStepIndex
                      ? 'done'
                      : index === flowActiveStepIndex
                        ? 'current'
                        : 'next';
                    const quickNote = buildAiBrewStepQuickNote(step, language);
                    const methodFocusCue = buildAiBrewStepMethodFocusCue(plan, step, language);
                    const activeCue = methodFocusCue || quickNote;
                    const compactActiveCue = compactAiBrewInstruction(activeCue);
                    const showStepNote = state === 'current' && Boolean(compactActiveCue);
                    const stepDetailPoints = buildAiBrewStepDetailPoints(plan, step, index, language);
                    const stepMetricGroups = splitAiBrewStepMetrics(buildAiBrewStepMetrics(step, language, plan));

                    return (
                      <div
                        key={`flow-step-${step.id}`}
                        className={`rounded-[1.2rem] border p-3.5 transition-colors ${
                          state === 'current'
                            ? 'border-blue-500/24 bg-blue-500/[0.08]'
                            : state === 'done'
                              ? 'border-emerald-500/18 bg-emerald-500/[0.08]'
                              : 'panel-divider-subtle panel-soft'
                        }`}
                        data-testid={isQuickResult ? `ai-brew-step-card-${index + 1}` : `ai-brew-flow-step-${index + 1}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold ${
                                state === 'current'
                                  ? 'bg-blue-600 text-white'
                                  : state === 'done'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[var(--bg-base)] text-primary'
                              }`}>
                                {index + 1}
                              </span>
                              <p className="text-sm font-semibold text-primary">{localizeAiBrewStepLabel(step.label, language)}</p>
                            </div>
                            <p className="text-sm text-secondary">{buildAiBrewFlowStepSummary(step, language, plan)}</p>
                          </div>
                          <div className="space-y-1 text-right">
                            <span className="inline-flex rounded-full border panel-divider-subtle bg-[var(--bg-base)] px-2.5 py-1 text-[11px] font-semibold text-primary">
                              {state === 'done' ? copy.flowDone : state === 'current' ? copy.flowNow : copy.flowUpNext}
                            </span>
                          </div>
                        </div>
                        {renderAiBrewStepMetricChips(stepMetricGroups.core, `${step.id}-flow`, {
                          className: 'mt-2 flex flex-wrap gap-1.5',
                          testId: isQuickResult ? `ai-brew-quick-step-technique-${index + 1}` : `ai-brew-flow-step-technique-${index + 1}`,
                        })}
                        {showStepNote && (
                          <p className="mt-2 rounded-xl border border-blue-500/14 bg-blue-500/[0.07] px-3 py-2 text-sm leading-5 text-blue-800 dark:text-blue-200">{compactActiveCue}</p>
                        )}
                        {guideDensity === 'pro' && (stepDetailPoints.length > 0 || stepMetricGroups.detail.length > 0) && (
                          <details
                            open={!isQuickResult && guideDensity === 'pro'}
                            className="group mt-2 rounded-xl border panel-divider-subtle bg-[var(--bg-base)]/72 px-3 py-2"
                            data-testid={`ai-brew-flow-step-detail-${index + 1}`}
                          >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-primary">
                              <span>{id ? 'Detail tambahan' : 'Extra detail'}</span>
                              <ArrowRight size={14} className="shrink-0 text-secondary transition-transform group-open:rotate-90" />
                            </summary>
                            <ul className="mt-2.5 space-y-2 text-sm leading-5 text-secondary">
                              {stepMetricGroups.detail.length > 0 && (
                                <li className="block">
                                  {renderAiBrewStepMetricChips(stepMetricGroups.detail, `${step.id}-flow-detail`, {
                                    className: 'flex flex-wrap gap-1.5',
                                    testId: `ai-brew-flow-step-technique-detail-${index + 1}`,
                                  })}
                                </li>
                              )}
                              {stepDetailPoints.map((point) => (
                                <li key={`${step.id}-flow-${point}`} className="flex items-start gap-2">
                                  <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'coach' && (
              <div
                id={activeTabPanelId}
                role="tabpanel"
                aria-labelledby={activeTabId}
                className="min-w-0 max-w-full space-y-5 overflow-x-clip"
                data-testid="ai-brew-result-coach-panel"
              >
              <div className="min-w-0 max-w-full overflow-hidden rounded-[1.4rem] border panel-divider-subtle panel-soft p-4 [overflow-wrap:anywhere]">
                <div className="mb-3 flex items-center gap-2">
                  <Brain size={15} className="text-blue-500" />
                  <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.aiCoach}</h4>
                </div>
                <p className="text-sm text-secondary">{copy.coachDescription}</p>
                <div className="mt-3 space-y-1 rounded-xl border panel-divider-subtle bg-surface-alpha px-3 py-2 text-xs leading-5 text-secondary">
                  <p>{id ? 'Coach mengikuti planner deterministic. Angka resep tidak diubah oleh AI.' : 'Coach follows the deterministic planner. AI does not change recipe numbers.'}</p>
                  <p>{copy.coachCostHint}</p>
                  {hasLowConfidenceCoachData && (
                    <p>{id ? 'Sebagian data bersifat curated/estimated; gunakan sebagai baseline, bukan klaim final.' : 'Some data is curated/estimated; use it as a baseline, not a final factual claim.'}</p>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                  {primaryAiAssistActions.map((action) => (
                    <button
                      key={action.mode}
                      type="button"
                      onClick={() => onRunAiCoach(action.mode)}
                      disabled={aiCoachDisabled}
                      className="min-w-0 rounded-2xl border panel-divider-subtle bg-surface-alpha px-3 py-3 text-left transition-colors hover:bg-surface-alpha-hover disabled:cursor-not-allowed disabled:opacity-45"
                      data-testid={`ai-brew-ai-assist-${action.mode}`}
                    >
                      <p className="text-sm font-semibold text-primary">{action.label}</p>
                      <p className="mt-1 text-xs leading-5 text-secondary">{action.hint}</p>
                    </button>
                  ))}
                </div>
                {advancedAiAssistActions.length > 0 && (
                  <details className="group mt-3 rounded-xl border panel-divider-subtle bg-surface-alpha px-3 py-2">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-primary">
                      <span>{copy.moreAiTools}</span>
                      <ArrowRight size={14} className="shrink-0 text-secondary transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
                      {advancedAiAssistActions.map((action) => (
                        <button
                          key={action.mode}
                          type="button"
                          onClick={() => onRunAiCoach(action.mode)}
                          disabled={aiCoachDisabled}
                          className="min-w-0 rounded-xl border panel-divider-subtle bg-[var(--bg-base)] px-3 py-3 text-left transition-colors hover:bg-surface-alpha-hover disabled:cursor-not-allowed disabled:opacity-45"
                          data-testid={`ai-brew-ai-assist-${action.mode}`}
                        >
                          <p className="text-sm font-semibold text-primary">{action.label}</p>
                          <p className="mt-1 text-xs leading-5 text-secondary">{action.hint}</p>
                        </button>
                      ))}
                    </div>
                  </details>
                )}

                {aiCoachReason && !aiBusy && (
                  <div className="mt-3 rounded-xl border border-blue-500/15 bg-blue-500/10 px-3 py-2 text-sm text-blue-700 dark:text-blue-300" role="status" aria-live="polite" aria-atomic="true">
                    {aiCoachReason}
                  </div>
                )}

                {!isAuthenticated && !isOffline && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="mt-3 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)]"
                  >
                    {copy.aiSignIn}
                  </button>
                )}

                {aiBusy && (
                  <div className="mt-3 rounded-xl border panel-divider-subtle bg-surface-alpha px-3 py-3 text-sm text-secondary" role="status" aria-live="polite" aria-atomic="true">
                    <div className="flex items-center gap-2">
                      <Loader2 size={15} className="animate-spin" />
                      <span>{copy.aiBusy}</span>
                    </div>
                  </div>
                )}

                {aiError && !aiBusy && (
                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300" role="alert">
                    {aiError}
                  </div>
                )}

                {!aiResponse && !aiError && !aiBusy && !aiCoachReason && (
                  <div className="mt-3 rounded-xl border panel-divider-subtle bg-surface-alpha px-3 py-3 text-sm text-secondary">
                    {copy.coachEmpty}
                  </div>
                )}

                {aiResponse && !aiBusy && (
                  <div className="mt-4 min-w-0 max-w-full overflow-hidden rounded-[1.2rem] border panel-divider-subtle bg-[var(--bg-base)]/82 p-4 [overflow-wrap:anywhere]">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-secondary">{aiResponse.title}</p>
                    <div className="chat-markdown prose prose-sm mt-3 max-w-none break-words text-primary prose-headings:text-primary prose-strong:text-primary [overflow-wrap:anywhere]">
                      <Suspense fallback={<p className="text-sm text-secondary">{copy.aiBusy}</p>}>
                        <Markdown>{aiResponse.markdown}</Markdown>
                      </Suspense>
                    </div>
                  </div>
                )}
              </div>
              </div>
            )}

            {showLegacySourcesTab && (
              <div
                id={activeTabPanelId}
                role="tabpanel"
                aria-labelledby={activeTabId}
                className="grid min-w-0 max-w-full gap-5 overflow-x-clip xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.95fr)]"
              >
              <div className="space-y-5">
                <div className="rounded-[1.4rem] border panel-divider-subtle panel-soft p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Target size={15} className="text-emerald-500" />
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.provenance}</h4>
                  </div>
                  <div className="space-y-3 text-sm text-secondary">
                    <div className="rounded-xl bg-surface-alpha px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.profileUsed}</p>
                      <p className="mt-1 font-medium text-primary">{plan.deviceProfileLabel}</p>
                      <p className="mt-1 text-xs">
                        {plan.deviceProfileMode === 'exact'
                          ? copy.exactMatch
                          : plan.deviceProfileMode === 'derived_template'
                            ? copy.derivedTemplateProfile
                            : copy.fallbackUsed}
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-alpha px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.grindSource}</p>
                      <p className="mt-1 font-medium text-primary">{localizedGrindSettingReference}</p>
                      <p className="mt-1 text-xs">{formatGrindSettingMode(copy, plan.grindSettingMode)} - {formatGrinderReferenceLabel(copy, plan.grindSettingVerification, plan.grindSettingMode)}</p>
                      <p className="mt-2 text-xs">{copy.grindCalibrationNote}</p>
                    </div>
                    <div className="rounded-xl bg-surface-alpha px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.confidenceNotes}</p>
                      <ul className="mt-2 space-y-2">
                        {plan.confidenceNotes.map((note) => (
                          <li key={note}>{localizeAiBrewDynamicText(note, language)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[1.4rem] border panel-divider-subtle panel-soft p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FlaskConical size={15} className="text-sky-500" />
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.waterSourceUsed}</h4>
                  </div>
                    <div className="rounded-xl bg-surface-alpha px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-primary">{plan.waterBrandLabel || copy.waterSelectedManual}</p>
                        <span className="rounded-full bg-[var(--bg-base)] px-2 py-1 text-[11px] font-medium text-secondary">
                          {formatWaterReadinessStatus(copy, {
                            classification: plan.waterClassification,
                            presetStatus: plan.waterPresetStatus,
                            isBrewReady: plan.waterIsBrewReady,
                            mineralsReady: true,
                            mineralDerivation: plan.waterMineralDerivation,
                          })}
                        </span>
                        {plan.waterPresetStatus && (
                          <span className="rounded-full bg-[var(--bg-base)] px-2 py-1 text-[11px] font-medium text-secondary">
                            {formatWaterPresetStatus(copy, plan.waterPresetStatus)}
                          </span>
                        )}
                      </div>
                    <p className="mt-2 text-xs text-secondary">
                      TDS {plan.waterMinerals.tdsPpm} - GH {plan.waterMinerals.hardnessPpm} - KH {plan.waterMinerals.alkalinityPpm}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-secondary">
                      <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">
                        {plan.waterCustomized ? copy.waterBrandCustomized : localizedWaterStyle}
                      </span>
                      <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">
                        {formatWaterDerivationLabel(copy, plan.waterMineralDerivation)}
                      </span>
                    </div>
                    {plan.waterBrewBlockReason.length > 0 && (
                      <ul className="mt-3 space-y-2 text-xs text-secondary">
                        {plan.waterBrewBlockReason.map((reason) => (
                          <li key={reason} className="rounded-xl bg-[var(--bg-base)] px-3 py-2">{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.4rem] border panel-divider-subtle panel-soft p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Info size={15} className="text-blue-500" />
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.waterSourceLinks}</h4>
                  </div>
                  {waterSourceLinks.length === 0 ? (
                    <p className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">{copy.noWaterSourceLinks}</p>
                  ) : (
                    <div className="space-y-2">
                      {waterSourceLinks.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-start justify-between gap-3 rounded-xl bg-surface-alpha px-3 py-3 text-sm text-primary transition-colors hover:bg-surface-alpha-hover"
                        >
                          <span className="min-w-0 break-all">{url}</span>
                          <ArrowRight size={15} className="mt-0.5 shrink-0 text-secondary" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              </div>
            )}
          </div>
        </div>
        <div
          className="shrink-0 max-w-full overflow-hidden border-t panel-divider-subtle bg-[var(--bg-base)]/96 px-3 py-2 backdrop-blur lg:hidden"
          style={{ paddingBottom: 'calc(8px + var(--bottom-safe-capped, 0px))' }}
          data-testid="ai-brew-result-action-bar"
        >
          <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
            <button
              type="button"
              onClick={onSaveRecipe}
              disabled={saving || workflowBlocked}
              className="inline-flex min-h-[44px] min-w-0 items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
              data-testid="ai-brew-result-action-save"
            >
              {saveSuccess ? copy.saved : copy.save}
            </button>
            <button
              type="button"
              onClick={onEditInputs}
              className="inline-flex min-h-[44px] min-w-0 items-center justify-center rounded-xl border panel-divider-subtle bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary"
              data-testid="ai-brew-result-action-edit"
            >
              {copy.editInputs}
            </button>
            <button
              type="button"
              onClick={openTasteFeedback}
              className="inline-flex min-h-[44px] min-w-0 items-center justify-center rounded-xl border panel-divider-subtle bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary"
              data-testid="ai-brew-result-action-check-taste"
            >
              {copy.feedbackTitle}
            </button>
          </div>
        </div>
      </div>
    </FocusLockedDialog>
  );
}

function buildProcessPickerOptions(catalog: AiBrewCatalog, copy: CopySet) {
  const options: PickerOption[] = [{
    id: OMITTED_ENTRY_ID,
    label: copy.notSpecified,
    searchText: `${copy.notSpecified} process optional`.toLowerCase(),
    section: 'default',
    badges: [],
    ariaLabel: copy.pickerSkipProcess,
    processCategory: 'special',
  }];
  options.push(...sortProcessEntriesForPicker(catalog.processes).map((entry): PickerOption => {
    const category = getProcessPickerCategory(entry);
    return {
      id: entry.id,
      label: entry.label,
      subtitle: `${copy.processGroup}: ${entry.group}`,
      description: entry.notes[0],
      searchText: normalizeSearchText(`${entry.searchText} ${entry.group} ${entry.aliases.join(' ')}`),
      aliases: entry.aliases,
      canonicalTerms: [entry.id, entry.label, ...entry.aliases],
      processCategory: category,
      section: getProcessPickerCategoryLabel(copy, category),
      badges: buildProcessBadges(copy, entry),
      ariaLabel: copy.pickerSelectProcess.replace('{label}', entry.label),
    };
  }));
  options.push({
    id: CUSTOM_ENTRY_ID,
    label: copy.manualEntry,
    searchText: normalizeSearchText(`${copy.manualEntry} custom process`),
    aliases: ['custom process'],
    canonicalTerms: [CUSTOM_ENTRY_ID, copy.manualEntry],
    processCategory: 'special',
    section: getProcessPickerCategoryLabel(copy, 'special'),
    badges: [],
    ariaLabel: copy.pickerSelectCustomProcess,
  });
  return options;
}

function buildVarietyPickerOptions(catalog: AiBrewCatalog, copy: CopySet) {
  const options: PickerOption[] = [{
    id: OMITTED_ENTRY_ID,
    label: copy.notSpecified,
    searchText: `${copy.notSpecified} variety optional`.toLowerCase(),
    section: 'default',
    badges: [],
    ariaLabel: copy.pickerSkipVariety,
  }];
  options.push(...catalog.varieties.map((entry): PickerOption => ({
    id: entry.id,
    label: entry.label,
    subtitle: `${copy.varietyGroup}: ${entry.group}`,
    description: entry.originNotes,
    searchText: normalizeSearchText(`${entry.searchText} ${entry.group} ${entry.aliases.join(' ')}`),
    aliases: entry.aliases,
    canonicalTerms: [entry.id, entry.label, ...entry.aliases],
    section: entry.group,
    badges: buildVarietyBadges(copy, entry),
    ariaLabel: copy.pickerSelectVariety.replace('{label}', entry.label),
  })));
  options.push({
    id: CUSTOM_ENTRY_ID,
    label: copy.manualEntry,
    searchText: normalizeSearchText(`${copy.manualEntry} custom variety`),
    aliases: ['custom variety'],
    canonicalTerms: [CUSTOM_ENTRY_ID, copy.manualEntry],
    section: 'manual',
    badges: [],
    ariaLabel: copy.pickerSelectCustomVariety,
  });
  return options;
}

function buildEquipmentPickerOptions(items: EquipmentCatalogEntry[], copy: CopySet, kind: 'dripper' | 'grinder', language?: string) {
  const selectableItems = kind === 'dripper'
    ? items.filter((item) => !item.hidden)
    : items;
  const displayItems = kind === 'dripper'
    ? [...selectableItems].sort((a, b) => {
      const priorityDelta = scoreBrewerDisplayOrder(a) - scoreBrewerDisplayOrder(b);
      if (priorityDelta !== 0) return priorityDelta;
      return a.name.localeCompare(b.name);
    })
    : [...selectableItems].sort((a, b) => {
      const priorityDelta = scoreGrinderDisplayOrder(a) - scoreGrinderDisplayOrder(b);
      if (priorityDelta !== 0) return priorityDelta;
      return a.name.localeCompare(b.name);
    });

  return displayItems.map((item): PickerOption => {
    const isCoreBrewer = kind === 'dripper' && CORE_BREWER_PRIORITY.has(item.id);
    const trustStatus = kind === 'dripper'
      ? resolveBrewerProfileTrustStatus({
        deviceProfileMode: item.defaultProfileId || isCoreBrewer ? 'exact' : item.confidence === 'low' ? 'family_fallback' : 'derived_template',
        verificationLevel: item.verificationLevel,
        confidence: item.confidence,
        exactMatch: Boolean(item.defaultProfileId || isCoreBrewer),
        methodFamily: item.methodFamily,
        dripperId: item.id,
        dripperName: item.name,
      })
      : undefined;
    const trustDetail = trustStatus
      ? formatBrewerProfileTrustDetail({ status: trustStatus, dripperId: item.id, language })
      : '';
    const methodAliases = kind === 'dripper' && item.methodFamily
      ? METHOD_FAMILY_SEARCH_ALIASES[item.methodFamily]
      : '';
    const kindLabel = kind === 'dripper' ? copy.dripper.toLowerCase() : kind;
    const grinderReference = kind === 'grinder'
      ? formatGrinderReferenceLabel(copy, item.verificationLevel)
      : '';
    const subtitle = kind === 'grinder'
      ? [item.brand, item.typeLabel].filter(Boolean).join(' - ')
      : item.brand ? `${item.brand} - ${item.typeLabel}` : item.typeLabel;
    const description = kind === 'dripper'
      ? [trustDetail, item.description].filter(Boolean).join(' - ')
      : '';

    return {
      id: item.id,
      label: item.name,
      subtitle,
      description,
      searchText: `${item.searchText} ${methodAliases} ${item.methodFamily || ''}`.toLowerCase(),
      section: kind === 'dripper'
        ? isCoreBrewer
          ? copy.brewerCoreSection
          : copy.brewerSpecialtySection
        : '',
      badges: trustStatus ? [formatBrewerProfileTrustLabel(trustStatus, language)] : grinderReference ? [grinderReference] : [],
      ariaLabel: copy.pickerSelectEquipment.replace('{kind}', kindLabel).replace('{label}', item.name),
      tone: trustStatus === 'exact' ? 'highlight' : trustStatus === 'calibration_required' ? 'muted' : 'default',
      trustStatus,
    };
  });
}

function getWaterNumericProfile(item: WaterBrandProfile) {
  const tdsPpm = item.resolvedMinerals?.tdsPpm ?? item.chemistry.tdsPpm;
  const hardnessPpm = item.resolvedMinerals?.hardnessPpm ?? item.chemistry.hardnessPpm;
  const alkalinityPpm = item.resolvedMinerals?.alkalinityPpm ?? item.chemistry.alkalinityPpm;
  return {
    tdsPpm: tdsPpm !== undefined ? Number(tdsPpm) : null,
    hardnessPpm: hardnessPpm !== undefined ? Number(hardnessPpm) : null,
    alkalinityPpm: alkalinityPpm !== undefined ? Number(alkalinityPpm) : null,
  };
}

function buildWaterChemistryLabel(item: WaterBrandProfile, language?: string) {
  const profile = getWaterNumericProfile(item);
  const parts = [
    profile.tdsPpm !== null ? `TDS ${profile.tdsPpm}` : null,
    profile.hardnessPpm !== null ? `GH ${profile.hardnessPpm}` : null,
    profile.alkalinityPpm !== null ? `KH ${profile.alkalinityPpm}` : null,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(' - ');
  return localizeAiBrewWaterClassificationLabel(item.classificationLabel, language);
}

function buildWaterPickerSubtitle(item: WaterBrandProfile, copy: CopySet, language?: string) {
  const status = formatWaterReadinessStatus(copy, {
    classification: item.classification,
    presetStatus: item.presetStatus,
    isBrewReady: item.isBrewReady,
    mineralsReady: item.presetStatus === 'autofill',
    mineralDerivation: item.resolvedMinerals?.derivation,
  });
  const classification = localizeAiBrewWaterClassificationLabel(item.classificationLabel, language);
  return [
    status,
    classification,
    item.marketCode.toUpperCase(),
  ].filter(Boolean).join(' - ');
}

function rangePenalty(value: number, min: number, max: number) {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
}

function scoreWaterBrandForDisplay(item: WaterBrandProfile) {
  const profile = getWaterNumericProfile(item);
  const hasAllNumbers = profile.tdsPpm !== null && profile.hardnessPpm !== null && profile.alkalinityPpm !== null;
  const recommendationBonus = item.recommendedForFilter
    ? 24
    : item.isBrewReady
      ? 10
      : -12;

  let score = 0;
  if (item.publishState === 'published') score += 40;
  if (item.isBrewReady) score += 50;
  score += recommendationBonus;

  if (hasAllNumbers) {
    const tds = profile.tdsPpm as number;
    const gh = profile.hardnessPpm as number;
    const kh = profile.alkalinityPpm as number;

    const penalty =
      rangePenalty(tds, 60, 140)
      + (rangePenalty(gh, 40, 80) * 1.1)
      + (rangePenalty(kh, 30, 60) * 1.2);
    score += Math.max(0, 120 - (penalty * 1.2));

    if (tds > 200) score -= 40;
    if (gh > tds || kh > tds) score -= 120;
  } else {
    score -= 45;
  }

  if (item.verificationLevel === 'official') score += 5;
  if (item.verificationLevel === 'curated') score += 2;
  return score;
}

function getWaterMarketDisplayPriority(marketCode: WaterBrandProfile['marketCode']) {
  switch (marketCode) {
    case 'id':
      return 0;
    case 'sg':
      return 1;
    case 'global':
      return 2;
    case 'my':
      return 3;
    case 'bn':
      return 4;
    default:
      return 5;
  }
}

function compareWaterBrandDisplayPriority(left: WaterBrandProfile, right: WaterBrandProfile) {
  const scoreDelta = scoreWaterBrandForDisplay(right) - scoreWaterBrandForDisplay(left);
  if (scoreDelta !== 0) return scoreDelta;

  const marketDelta = getWaterMarketDisplayPriority(left.marketCode) - getWaterMarketDisplayPriority(right.marketCode);
  if (marketDelta !== 0) return marketDelta;

  return left.shortLabel.localeCompare(right.shortLabel);
}

function buildWaterFactBadges(item: WaterBrandProfile, copy: CopySet) {
  const profile = getWaterNumericProfile(item);
  const badges: string[] = [];
  if (item.resolvedMinerals?.derivation === 'estimated_from_classification') {
    badges.push(copy.waterBrandEstimated);
  }
  if (item.classification === 'zero_mineral_ro') {
    badges.push(copy.waterUseAsRoBase);
  }
  if (profile.tdsPpm === null || profile.hardnessPpm === null || profile.alkalinityPpm === null) {
    badges.push(copy.waterBadgeNeedsFullMinerals);
    return badges;
  }

  const tds = profile.tdsPpm;
  const gh = profile.hardnessPpm;
  const kh = profile.alkalinityPpm;

  if (gh > tds || kh > tds) {
    badges.push(copy.waterBadgeDataMismatch);
    return badges;
  }

  if (tds > 200) {
    badges.push(copy.waterBadgeHardWater);
  } else if (tds < 60 || gh < 40) {
    badges.push(copy.waterBadgeSoftWater);
  } else {
    badges.push(copy.waterBadgeBalancedWater);
  }

  const inIdealV60 = tds >= 60 && tds <= 140 && gh >= 40 && gh <= 80 && kh >= 30 && kh <= 60;
  if (inIdealV60) badges.push(copy.waterBadgeIdealV60);
  if (kh > 80) badges.push(copy.waterBadgeHighBuffer);
  if (!item.isBrewReady) badges.push(copy.waterBadgeManualMinerals);

  return badges;
}

function buildWaterPrefillValues(item: WaterBrandProfile | null | undefined) {
  if (!isWaterBrandAutofillAllowed(item)) {
    return {
      waterTdsPpm: '',
      waterHardnessPpm: '',
      waterAlkalinityPpm: '',
    };
  }
  const tdsPpm = item?.resolvedMinerals?.tdsPpm ?? item?.chemistry.tdsPpm;
  const hardnessPpm = item?.resolvedMinerals?.hardnessPpm ?? item?.chemistry.hardnessPpm;
  const alkalinityPpm = item?.resolvedMinerals?.alkalinityPpm ?? item?.chemistry.alkalinityPpm;
  return {
    waterTdsPpm: tdsPpm !== undefined ? String(tdsPpm) : '',
    waterHardnessPpm: hardnessPpm !== undefined ? String(hardnessPpm) : '',
    waterAlkalinityPpm: alkalinityPpm !== undefined ? String(alkalinityPpm) : '',
  };
}

function formatWaterMineralInput(value: number) {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function isWaterMineralInputInRange(value: string, min: number, max: number) {
  const parsed = Number(String(value || '').trim());
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
}

function areWaterMineralInputsReady(formState: Pick<AiBrewFormState, 'waterTdsPpm' | 'waterHardnessPpm' | 'waterAlkalinityPpm'>) {
  return (
    isWaterMineralInputInRange(formState.waterTdsPpm, 0, 600)
    && isWaterMineralInputInRange(formState.waterHardnessPpm, 0, 500)
    && isWaterMineralInputInRange(formState.waterAlkalinityPpm, 0, 400)
  );
}

function countKnownWaterFields(item: WaterBrandProfile | null | undefined) {
  if (!item) return 0;
  const profile = getWaterNumericProfile(item);
  return [profile.tdsPpm, profile.hardnessPpm, profile.alkalinityPpm].filter((value) => value !== null).length;
}

function isEstimatedWaterBaseline(item: WaterBrandProfile | null | undefined) {
  return item?.resolvedMinerals?.derivation === 'estimated_from_classification';
}

function isWaterBrandAutofillAllowed(item: WaterBrandProfile | null | undefined) {
  return Boolean(
    item
    && item.presetStatus === 'autofill'
    && item.isBrewReady
    && item.resolvedMinerals
    && item.resolvedMinerals.derivation !== 'estimated_from_classification',
  );
}

function formatWaterDerivationLabel(copy: CopySet, derivation: BrewPlan['waterMineralDerivation'] | undefined) {
  switch (derivation) {
    case 'direct':
      return copy.waterDerivationDirect;
    case 'derived_from_ions':
      return copy.waterDerivationDerived;
    case 'estimated_from_classification':
      return copy.waterDerivationEstimated;
    case 'manual':
    default:
      return copy.waterDerivationManual;
  }
}

function formatGrinderReferenceLabel(copy: CopySet, verification: VerificationLevel, mode?: BrewPlan['grindSettingMode']) {
  if (mode === 'derived_baseline' || verification === 'fallback' || verification === 'dataset_unverified') {
    return copy.grindEstimatedBaseline;
  }
  if (verification === 'official') return copy.grindOfficialReference;
  if (verification === 'community_verified') return copy.grindCommunityReference;
  return copy.grindCuratedReference;
}

function formatWaterReadinessStatus(copy: CopySet, params: {
  classification?: BrewPlan['waterClassification'];
  presetStatus?: BrewPlan['waterPresetStatus'];
  isBrewReady?: boolean;
  mineralsReady?: boolean;
  mineralDerivation?: BrewPlan['waterMineralDerivation'];
}) {
  if (params.classification === 'zero_mineral_ro') return copy.waterStatusZeroMineral;
  if (params.classification === 'high_buffer') return copy.waterStatusHighBuffer;
  if (params.mineralDerivation === 'manual') return copy.waterDerivationManual;
  if (params.mineralDerivation === 'estimated_from_classification') return copy.waterStatusEstimated;
  if (params.presetStatus === 'manual_required' || params.isBrewReady === false || params.mineralsReady === false) {
    return copy.waterStatusManualRequired;
  }
  return copy.waterStatusReady;
}

function buildWaterPolicyWarning(copy: CopySet, item: WaterBrandProfile) {
  if (item.classification === 'zero_mineral_ro') return copy.waterUseAsRoBase;
  if (item.classification === 'high_buffer') return copy.waterHighBufferWarning;
  if (item.classification === 'alkaline_caution') return copy.waterAlkalineWarning;
  if (isEstimatedWaterBaseline(item)) return copy.waterBrandEstimatedNote;
  return item.classificationCaution || '';
}

function buildWaterTargetFitHint(
  language: string,
  copy: CopySet,
  targetProfileId: string,
  waterBrand: WaterBrandProfile | null | undefined,
) {
  if (!waterBrand) return null;

  const profile = getWaterNumericProfile(waterBrand);
  const hardness = profile.hardnessPpm;
  const alkalinity = profile.alkalinityPpm;
  const target = String(targetProfileId || '').toLowerCase();

  if (target.includes('acid') && alkalinity !== null && alkalinity > 80) {
    return {
      tone: 'caution' as const,
      text: isIndonesianAiBrewLanguage(language)
        ? 'Air ini cenderung meredam acidity. Untuk hasil yang lebih terang dan hidup, pakai air dengan alkalinity lebih rendah atau manual minerals.'
        : 'This water will soften acidity. For a brighter cup, use lower-alkalinity water or switch to manual minerals.',
    };
  }

  if (target.includes('body') && hardness !== null && hardness < 45) {
    return {
      tone: 'caution' as const,
      text: isIndonesianAiBrewLanguage(language)
        ? 'Air ini cenderung membuat body terasa tipis. Untuk body yang lebih penuh, naikkan hardness atau pakai baseline mineral yang lebih kuat.'
        : 'This water can make body feel thin. For more weight, increase hardness or use a fuller mineral baseline.',
    };
  }

  if ((target.includes('balance') || target.includes('clean')) && alkalinity !== null && alkalinity > 90) {
    return {
      tone: 'caution' as const,
      text: isIndonesianAiBrewLanguage(language)
        ? 'Air ini aman dipakai, tapi alkalinity tinggi bisa membuat finish terasa lebih datar. Jaga agitasi tetap halus dan jangan buru-buru menaikkan suhu.'
        : 'This water is usable, but high alkalinity can flatten the finish. Keep agitation calm before raising temperature.',
    };
  }

  if (waterBrand.presetStatus === 'autofill' && waterBrand.isBrewReady && hardness !== null && alkalinity !== null) {
    return {
      tone: 'ok' as const,
      text: isIndonesianAiBrewLanguage(language)
        ? 'Baseline air ini cukup aman untuk mulai. Tuning berikutnya sebaiknya fokus ke grind, flow, dan target rasa sebelum mengubah mineral.'
        : 'This is a reliable starting water. Tune grind, flow, and taste target before changing minerals.',
    };
  }

  return null;
}

function getUserFacingWaterBrands(items: WaterBrandProfile[]) {
  const grouped = new Map<string, WaterBrandProfile>();
  const filtered = items.filter((item) => item.still);

  for (const item of filtered) {
    const key = item.brandGroupId || item.shortLabel.toLowerCase();
    const current = grouped.get(key);
    if (!current || compareWaterBrandDisplayPriority(item, current) < 0) {
      grouped.set(key, item);
    }
  }

  return [...grouped.values()].sort(compareWaterBrandDisplayPriority);
}

function getSuggestedWaterBrands(items: WaterBrandProfile[]) {
  return items
    .slice()
    .sort(compareWaterBrandDisplayPriority)
    .slice(0, 8);
}

function buildWaterPickerOptions(items: WaterBrandProfile[], copy: CopySet, language?: string) {
  return items.map((item): PickerOption => ({
    id: item.id,
    label: item.shortLabel,
    subtitle: buildWaterPickerSubtitle(item, copy, language),
    searchText: item.searchText,
    description: undefined,
    section: '',
    badges: buildWaterFactBadges(item, copy),
    ariaLabel: `${copy.pickerSelectWaterBrand.replace('{label}', item.shortLabel)}${item.isBrewReady ? '' : copy.pickerManualMineralsSuffix}`,
    tone: item.presetStatus === 'autofill' ? 'highlight' : 'default',
  }));
}
function normalizeSearchText(input: string) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = new Array(right.length + 1).fill(0).map((_, index) => index);
  const current = new Array(right.length + 1).fill(0);

  for (let i = 0; i < left.length; i += 1) {
    current[0] = i + 1;
    for (let j = 0; j < right.length; j += 1) {
      const cost = left[i] === right[j] ? 0 : 1;
      current[j + 1] = Math.min(current[j] + 1, previous[j + 1] + 1, previous[j] + cost);
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }

  return previous[right.length];
}

function fuzzyScore(left: string, right: string) {
  if (!left || !right) return 0;
  const distance = levenshteinDistance(left, right);
  return 1 - (distance / Math.max(left.length, right.length));
}

function selectEntryLabel<T extends { id: string; label?: string; name?: string }>(entries: T[], id: string, fallback: string) {
  if (!id) return fallback;
  if (id === CUSTOM_ENTRY_ID) return fallback;
  return entries.find((item) => item.id === id)?.label || entries.find((item) => item.id === id)?.name || fallback;
}

function inferPreferredBuilderMode(formState: AiBrewFormState): FormMode {
  return formState.process
    || formState.variety
    || formState.customProcess
    || formState.customVariety
    || formState.waterNotes
    || formState.altitudeMasl
    || formState.beanDensityGml
    || formState.roastDevelopment
    || formState.solubility
    ? 'pro'
    : 'quick';
}

function buildBeanProfileSummary(formState: AiBrewFormState) {
  return [
    formState.altitudeMasl ? `${formState.altitudeMasl} masl` : null,
    formState.beanDensityGml ? `${formState.beanDensityGml} g/ml` : null,
    formState.roastDevelopment ? formState.roastDevelopment.replace(/_/g, ' ') : null,
    formState.solubility || null,
  ].filter(Boolean).join(' - ');
}

function normalizeBeanProfileFieldMerge(next: AiBrewFormState, key: keyof AiBrewFormState) {
  if (key !== 'altitudeMasl') return next;
  const normalizedAltitude = String(next.altitudeMasl || '').trim();
  if (next.beanDensityGml || !normalizedAltitude.includes('.')) return next;
  const mergedMatch = normalizedAltitude.match(/^(\d{3,4})(0\.\d{1,2})$/);
  if (!mergedMatch) return next;
  return {
    ...next,
    altitudeMasl: mergedMatch[1],
    beanDensityGml: mergedMatch[2],
  };
}

export function AiBrewPanel({
  onUseInTimer,
  onUseInRatio,
}: {
  onUseInTimer: (durationSeconds: number) => void;
  onUseInRatio: (plan: BrewPlan) => void;
}) {
  const { language, t } = useGlobalState();
  const { isAuthenticated, openAuthModal } = useAuthModal();
  const { ensureAiAccess, hasPaidAiAccess, aiAccessGateModal } = useAiAccessGate('brew');
  const { hideNav, showNav } = useNavbar();
  const { isOffline } = useNetworkStatus();
  const { isPwa } = useRuntimeDisplayMode();
  const fallbackCopy = useMemo(() => ({
    ...COPY.en,
    title: t.toolsTabAiBrew || COPY.en.title,
    reset: t.reset || COPY.en.reset,
    generate: t.generate || COPY.en.generate,
    save: t.save || COPY.en.save,
    latestPlan: t.latestPlan || COPY.en.latestPlan,
    favorites: t.favorites || COPY.en.favorites,
    recent: t.recent || COPY.en.recent,
    recipe: t.recipe || COPY.en.recipe,
    warnings: t.warnings || COPY.en.warnings,
    standards: t.standards || COPY.en.standards,
    dose: t.dose || COPY.en.dose,
    water: t.water || COPY.en.waterTitle,
    ratio: t.ratio || COPY.en.profileTitle,
    temp: t.temp || COPY.en.temp,
    time: t.time || COPY.en.time,
    grind: t.grind || COPY.en.grind,
    closeResult: t.close || COPY.en.closeResult,
    pickerClose: t.close || COPY.en.pickerClose,
    noPickerResults: t.noPickerResults || COPY.en.noPickerResults,
    load: t.load || COPY.en.load,
    useInTimer: t.useInTimer || COPY.en.useInTimer,
    useInRatio: t.useInRatio || COPY.en.useInRatio,
    saved: t.saved || COPY.en.saved,
    favorite: t.favorite || COPY.en.favorite,
    unfavorite: t.unfavorite || COPY.en.unfavorite,
  }), [t]);
  const copy = useMemo(() => {
    if (isIndonesianAiBrewLanguage(language)) return COPY.id;
    return COPY[language as keyof typeof COPY] || fallbackCopy;
  }, [fallbackCopy, language]);
  const hasHydratedRef = useRef(false);

  const [catalog, setCatalog] = useState<AiBrewCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [formState, setFormState] = useState<AiBrewFormState>(() => loadAiBrewFormDraft(createDefaultAiBrewFormState()));
  const [targetProfileTouched, setTargetProfileTouched] = useState(false);
  const [activeBuilderModal, setActiveBuilderModal] = useState<FormMode | null>(null);
  const [historyStripTab, setHistoryStripTab] = useState<HistoryStripTab>('latest');
  const [plan, setPlan] = useState<BrewPlan | null>(null);
  const [pickerKind, setPickerKind] = useState<PickerKind>(null);
  const [pickerRestoreFocusTarget, setPickerRestoreFocusTarget] = useState<HTMLElement | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultMode, setResultMode] = useState<FormMode>('quick');
  const [showProvenance, setShowProvenance] = useState(false);
  const [journalEntries, setJournalEntries] = useState<BrewJournalEntry[]>([]);
  const [presets, setPresets] = useState<BrewPreset[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<BrewTasteFeedback | null>(null);
  const [feedbackNoteDraft, setFeedbackNoteDraft] = useState('');
  const [aiBusy, setAiBusy] = useState<AiCoachMode | null>(null);
  const [aiResponse, setAiResponse] = useState<{ title: string; markdown: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeJournalId, setActiveJournalId] = useState<string | null>(null);
  const [generationBusy, setGenerationBusy] = useState(false);
  const [generationStage, setGenerationStage] = useState<AiBrewGenerationStageId | null>(null);
  const [generationProgress, setGenerationProgress] = useState<AiBrewGenerationProgress | null>(null);
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);
  const [showMineralEditor, setShowMineralEditor] = useState(false);
  const [showBeanProfileEditor, setShowBeanProfileEditor] = useState(false);
  const [showQuickBeanDetails, setShowQuickBeanDetails] = useState(false);
  const [activeProSection, setActiveProSection] = useState<ProBuilderSectionId | null>(null);
  const generationStartedAtRef = useRef<number | null>(null);
  const aiAssistCacheRef = useRef(new Map<string, { title: string; markdown: string }>());

  useEffect(() => {
    if (!generationBusy) {
      generationStartedAtRef.current = null;
      setGenerationElapsedMs(0);
      return;
    }

    if (!generationStartedAtRef.current) {
      generationStartedAtRef.current = Date.now();
    }

    const updateElapsed = () => {
      if (!generationStartedAtRef.current) return;
      setGenerationElapsedMs(Date.now() - generationStartedAtRef.current);
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(intervalId);
  }, [generationBusy]);

  useEffect(() => {
    if (activeBuilderModal !== 'pro') {
      setActiveProSection(null);
    }
  }, [activeBuilderModal]);

  const shouldHideAppNav = activeBuilderModal !== null || pickerKind !== null || resultOpen || generationBusy;

  useEffect(() => {
    if (shouldHideAppNav) hideNav();
    else showNav();
    return () => showNav();
  }, [hideNav, showNav, shouldHideAppNav]);

  function restorePlanIntoView(nextCatalog: AiBrewCatalog, storedPlan: BrewPlan, shouldOpen = false) {
    setPlan(storedPlan);
    setActiveJournalId(storedPlan.id);
    const nextForm = sanitizeAiBrewFormState(loadPlanIntoForm(storedPlan), nextCatalog);
    setFormState(nextForm);
    setShowMineralEditor(nextForm.waterMode === 'manual' || nextForm.waterCustomized);
    setShowProvenance(storedPlan.provenanceAttentionNeeded);
    clearSaveFeedback();
    syncTasteFeedback(null);
    setActiveBuilderModal(null);
    setResultMode('quick');
    setResultOpen(shouldOpen);
    setAiResponse(selectDefaultAiResponse(copy, storedPlan.aiNotes, storedPlan, language));
  }

  function hydrateInitialState(nextCatalog: AiBrewCatalog) {
    if (hasHydratedRef.current) return;
    const storedPlan = loadLastGeneratedBrewPlan(nextCatalog.catalogVersion);
    if (storedPlan) {
      restorePlanIntoView(nextCatalog, storedPlan, false);
      setNotice(copy.restoredPlan);
    } else {
      const draft = loadAiBrewFormDraft(createDefaultAiBrewFormState(nextCatalog));
      const nextForm = sanitizeAiBrewFormState(draft, nextCatalog);
      setFormState(nextForm);
      setShowMineralEditor(nextForm.waterMode === 'manual' || nextForm.waterCustomized);
    }
    hasHydratedRef.current = true;
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setCatalogLoading(true);
      const cachedCatalog = loadCachedAiBrewCatalogSnapshot();
      if (cachedCatalog && !cancelled) {
        setCatalog(cachedCatalog);
        setCatalogError(null);
        hydrateInitialState(cachedCatalog);
        setCatalogLoading(false);
        if (isOffline) setNotice(copy.offlineCatalog);
      }

      if (isOffline) {
        if (!cachedCatalog && !cancelled) {
          setCatalogError(copy.unavailable);
          setCatalogLoading(false);
        }
        return;
      }

      try {
        const nextCatalog = await loadAiBrewCatalog();
        if (cancelled) return;
        setCatalog(nextCatalog);
        setCatalogError(null);
        saveCachedAiBrewCatalogSnapshot(nextCatalog);
        hydrateInitialState(nextCatalog);
      } catch (error) {
        if (cancelled) return;
        if (!cachedCatalog) {
          setCatalogError(error instanceof Error ? error.message : copy.unavailable);
        } else {
          setCatalogError(null);
          setNotice(copy.offlineCatalog);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [copy.offlineCatalog, copy.restoredPlan, copy.unavailable, isOffline]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [recent, nextPresets] = await Promise.all([
        listRecentBrewJournalEntries(),
        listBrewPresets(),
      ]);
      if (cancelled) return;
      setJournalEntries(recent);
      setPresets(nextPresets);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!catalog) return;
    saveAiBrewFormDraft(formState);
  }, [catalog, formState]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function clearSaveFeedback() {
    setSaveSuccess(null);
    setSaveError(null);
  }

  function syncTasteFeedback(feedback?: BrewTasteFeedback | null) {
    setActiveFeedback(feedback || null);
    setFeedbackNoteDraft(feedback?.note || '');
  }

  const selectedProcessLabel = useMemo(() => {
    if (!catalog) return copy.openPicker;
    if (!formState.process) return copy.notSpecified;
    return selectEntryLabel(catalog.processes, formState.process, formState.customProcess || copy.manualEntry);
  }, [catalog, copy.manualEntry, copy.notSpecified, copy.openPicker, formState.customProcess, formState.process]);

  const selectedVarietyLabel = useMemo(() => {
    if (!catalog) return copy.openPicker;
    if (!formState.variety) return copy.notSpecified;
    return selectEntryLabel(catalog.varieties, formState.variety, formState.customVariety || copy.manualEntry);
  }, [catalog, copy.manualEntry, copy.notSpecified, copy.openPicker, formState.customVariety, formState.variety]);

  const selectedDripper = useMemo(() => {
    if (!catalog) return null;
    return catalog.drippers.find((item) => item.id === formState.dripperId) || catalog.drippers[0] || null;
  }, [catalog, formState.dripperId]);

  const selectedDripperSupportsIced = useMemo(() => (
    selectedDripper ? supportsAiBrewIcedMode(catalog, selectedDripper.id) : true
  ), [catalog, selectedDripper]);

  const selectedDripperSupportsPourControl = Boolean(
    selectedDripper?.methodFamily && AI_BREW_POUR_CONTROL_FAMILIES.has(selectedDripper.methodFamily),
  );

  useEffect(() => {
    if (formState.brewMode !== 'iced' || selectedDripperSupportsIced) return;
    setFormState((prev) => (prev.brewMode === 'iced' ? { ...prev, brewMode: 'hot' } : prev));
    setNotice(copy.icedUnavailable);
  }, [copy.icedUnavailable, formState.brewMode, selectedDripperSupportsIced]);

  const selectedGrinder = useMemo(() => {
    if (!catalog) return null;
    return catalog.grinders.find((item) => item.id === formState.grinderId) || catalog.grinders[0] || null;
  }, [catalog, formState.grinderId]);

  const selectedTargetProfile = useMemo(() => {
    if (!catalog) return null;
    return catalog.targetProfiles.find((item) => item.id === formState.targetProfileId) || catalog.targetProfiles[0] || null;
  }, [catalog, formState.targetProfileId]);

  const targetComparePlans = useMemo(() => {
    if (!catalog || !plan) return [] as BrewPlan[];
    return catalog.targetProfiles.flatMap((profile) => {
      try {
        return [buildAiBrewPlan({ ...plan.formState, targetProfileId: profile.id }, catalog)];
      } catch {
        return [];
      }
    });
  }, [catalog, plan]);

  const selectedWaterBrand = useMemo(() => {
    if (!catalog || !formState.waterBrandId) return null;
    return catalog.waterBrands.find((item) => item.id === formState.waterBrandId) || null;
  }, [catalog, formState.waterBrandId]);

  const selectedWaterCompletion = useMemo(() => {
    if (!catalog || !selectedWaterBrand) return null;
    return resolveWaterMineralCompletion({
      waterBrand: selectedWaterBrand,
      guidance: catalog.waterGuidance,
      language,
      targetProfileId: formState.targetProfileId,
    });
  }, [catalog, formState.targetProfileId, language, selectedWaterBrand]);

  const waterTargetFitHint = useMemo(() => (
    buildWaterTargetFitHint(language, copy, formState.targetProfileId, selectedWaterBrand)
  ), [copy, formState.targetProfileId, language, selectedWaterBrand]);

  const userFacingWaterBrands = useMemo(() => {
    if (!catalog) return [];
    return getUserFacingWaterBrands(catalog.waterBrands);
  }, [catalog]);

  const quickSelectableWaterBrands = useMemo(() => (
    userFacingWaterBrands.filter((item) => isWaterBrandAutofillAllowed(item))
  ), [userFacingWaterBrands]);

  const builderWaterBrands = userFacingWaterBrands;

  const suggestedWaterBrands = useMemo(() => (
    getSuggestedWaterBrands(builderWaterBrands)
  ), [builderWaterBrands]);

  const pickerOptions = useMemo(() => {
    if (!catalog || !pickerKind) return [];
    if (pickerKind === 'process') return buildProcessPickerOptions(catalog, copy);
    if (pickerKind === 'variety') return buildVarietyPickerOptions(catalog, copy);
    if (pickerKind === 'water_brand') return buildWaterPickerOptions(builderWaterBrands, copy, language);
    if (pickerKind === 'dripper') return buildEquipmentPickerOptions(catalog.drippers, copy, 'dripper', language);
    return buildEquipmentPickerOptions(catalog.grinders, copy, 'grinder', language);
  }, [builderWaterBrands, catalog, copy, language, pickerKind]);

  const currentPreset = useMemo(() => {
    if (!plan) return undefined;
    return presets.find((preset) => preset.fingerprint === plan.fingerprint);
  }, [plan, presets]);

  const localizedSummary = useMemo(() => (
    plan ? localizeAiBrewSummary(plan, language) : null
  ), [language, plan]);

  const localizedTargetProfileLabel = useMemo(() => (
    plan ? localizeAiBrewTargetProfile(plan.targetProfileId, plan.targetProfileLabel, language) : null
  ), [language, plan]);

  const targetOptions = useMemo(() => {
    if (!catalog) return [];
    return catalog.targetProfiles.map((profile) => ({
      ...profile,
      translatedLabel: translateTargetProfileLabel(copy, profile.id),
    }));
  }, [
    catalog,
    copy.acidity,
    copy.balance,
    copy.body,
    copy.denseComforting,
    copy.floralTransparent,
    copy.fruitForward,
    copy.softRound,
    copy.sweetness,
  ]);

  const currentGenerationStage = generationProgress?.id || generationStage;
  const inputAnalysis = useMemo(() => {
    if (!catalog || !selectedDripper || !selectedGrinder) return null;
    try {
      const sanitized = sanitizeAiBrewFormState(formState, catalog);
      const nextMineralsReady = areWaterMineralInputsReady(sanitized);
      const previewDoseG = Number.parseFloat(sanitized.doseG);
      const deviceSelection = resolveDeviceProfileSelection(catalog, selectedDripper, sanitized.brewMode, {
        doseG: Number.isFinite(previewDoseG) ? previewDoseG : undefined,
        origamiFilterStyle: sanitized.origamiFilterStyle,
        aeropressStyle: sanitized.aeropressStyle,
        targetProfileId: sanitized.targetProfileId,
      });
      const grinderSetting = resolveGrinderSettingReference(catalog, selectedGrinder, deviceSelection.profile, sanitized.brewMode);
      const waterStatusLabel = formState.waterMode === 'brand' && selectedWaterBrand
        ? formatWaterReadinessStatus(copy, {
          classification: selectedWaterBrand.classification,
          presetStatus: selectedWaterBrand.presetStatus,
          isBrewReady: selectedWaterBrand.isBrewReady,
          mineralsReady: nextMineralsReady,
          mineralDerivation: selectedWaterBrand.resolvedMinerals?.derivation,
        })
        : formatWaterReadinessStatus(copy, { mineralsReady: nextMineralsReady, mineralDerivation: 'manual' });
      const waterNeedsAttention = waterStatusLabel !== copy.waterStatusReady;
      const waterStatusTone = nextMineralsReady && !waterNeedsAttention ? 'emerald' : 'amber';
      const waterDerivation = formState.waterMode === 'brand'
        ? selectedWaterBrand?.resolvedMinerals?.derivation
        : 'manual';
      const waterDetail = formState.waterMode === 'brand' && selectedWaterBrand
        ? `${buildWaterChemistryLabel(selectedWaterBrand, language)} - ${formatWaterDerivationLabel(copy, waterDerivation)}`
        : nextMineralsReady
          ? `TDS ${formState.waterTdsPpm} - GH ${formState.waterHardnessPpm} - KH ${formState.waterAlkalinityPpm}`
          : copy.waterRequired;
      const beanProfileSummary = buildBeanProfileSummary(formState);
      const beanProfileActive = Boolean(beanProfileSummary);
      const profileTrustStatus = resolveBrewerProfileTrustStatus({
        deviceProfileMode: deviceSelection.mode,
        verificationLevel: deviceSelection.profile.verificationLevel,
        confidence: deviceSelection.profile.confidence,
        exactMatch: deviceSelection.profile.exactMatch,
        methodFamily: deviceSelection.profile.methodFamily,
        dripperId: selectedDripper.id,
        dripperName: selectedDripper.name,
      });
      const notes = [
        !formState.process ? copy.processOptionalNote : '',
        !formState.variety ? copy.varietyOptionalNote : '',
        !grinderSetting ? copy.noVerifiedGrinderSettingDetail : '',
        !beanProfileActive ? copy.beanProfileNeutral : '',
      ].filter(Boolean);

      return {
        profileTone: profileTrustStatus === 'exact' ? 'blue' : profileTrustStatus === 'calibration_required' ? 'amber' : 'slate',
        profileStatus: formatBrewerProfileTrustLabel(profileTrustStatus, language),
        profileLabel: deviceSelection.profile.label,
        grindTone: grinderSetting ? 'blue' : 'amber',
        grindStatus: grinderSetting
          ? formatGrinderReferenceLabel(copy, grinderSetting.verificationLevel, 'catalog_reference')
          : copy.grindFallback,
        grindLabel: grinderSetting?.rangeLabel || copy.noVerifiedGrinderSettingShort,
        grindVerification: grinderSetting ? formatVerification(copy, grinderSetting.verificationLevel) : formatVerification(copy, 'fallback'),
        waterTone: waterStatusTone,
        waterStatus: waterStatusLabel,
        waterDetail,
        beanTone: beanProfileActive ? 'blue' : 'slate',
        beanStatus: beanProfileActive ? copy.beanProfileActive : copy.beanInfluenceInactive,
        beanDetail: beanProfileSummary || copy.beanProfileNeutral,
        notes,
      };
    } catch {
      return null;
    }
  }, [
    catalog,
    copy,
    formState,
    language,
    selectedDripper,
    selectedGrinder,
    selectedWaterBrand,
  ]);
  void inputAnalysis;
  const generationStageIndex = currentGenerationStage
    ? AI_BREW_GENERATION_STAGES.findIndex((item) => item.id === currentGenerationStage)
    : -1;
  const generationProgressPercent = Math.round(
    (
      generationProgress?.progressRatio
      ?? (generationStageIndex >= 0
        ? (generationStageIndex + 1) / AI_BREW_GENERATION_STAGES.length
        : 0)
    ) * 100,
  );
  const generationStageDetail = getGenerationStageDetail(generationProgress, copy, language);
  const canUsePaidAiBrew = hasPaidAiAccess && !isOffline;
  const canUseHybridAiSequence = false;
  const requireOnlineAiGenerate = false;
  const activeEngineMode: AiBrewEngineMode = activeBuilderModal === 'pro'
    ? 'precision_planner'
    : 'local_planner';
  const aiEngineReadyLabel = activeEngineMode === 'precision_planner'
    ? copy.aiEnginePrecisionPlanner
    : copy.aiEngineLocalValidated;
  const aiEngineWorkingLabel = aiEngineReadyLabel;
  const preferredBuilderMode = inferPreferredBuilderMode(formState);

  const isQuickBuilder = activeBuilderModal === 'quick';
  const mineralsReady = areWaterMineralInputsReady(formState);
  const selectedWaterBrandCanAutofill = isWaterBrandAutofillAllowed(selectedWaterBrand);
  const waterReadyForGeneration = mineralsReady && (
    formState.waterMode === 'manual'
    || selectedWaterBrandCanAutofill
    || formState.waterCustomized
  );
  const canCompleteWaterMinerals = Boolean(selectedWaterBrand && selectedWaterCompletion && !selectedWaterBrandCanAutofill);
  const waterNeedsManualEntry = formState.waterMode === 'manual'
    || !selectedWaterBrand
    || !selectedWaterBrandCanAutofill
    || formState.waterCustomized;
  const shouldShowMineralEditor = showMineralEditor || waterNeedsManualEntry;
  const canToggleMineralEditor = !isQuickBuilder
    && formState.waterMode === 'brand'
    && selectedWaterBrandCanAutofill;

  useEffect(() => {
    if (!catalog || formState.waterMode !== 'brand' || !formState.waterBrandId) return;
    const stillVisible = catalog.waterBrands.some((item) => item.id === formState.waterBrandId);
    if (stillVisible) return;
    setFormState((prev) => ({
      ...prev,
      waterBrandId: '',
      waterCustomized: false,
      waterTdsPpm: '',
      waterHardnessPpm: '',
      waterAlkalinityPpm: '',
      waterNotes: '',
    }));
    setShowMineralEditor(true);
  }, [catalog, formState.waterBrandId, formState.waterMode, userFacingWaterBrands]);

  async function refreshSavedViews() {
    const [recent, nextPresets] = await Promise.all([
      listRecentBrewJournalEntries(),
      listBrewPresets(),
    ]);
    setJournalEntries(recent);
    setPresets(nextPresets);
  }

  function updateForm<K extends keyof AiBrewFormState>(key: K, value: AiBrewFormState[K]) {
    if (key === 'targetProfileId') {
      setTargetProfileTouched(true);
    }
    setFormState((prev) => {
      let next = { ...prev, [key]: value };
      next = normalizeBeanProfileFieldMerge(next, key);
      if (
        catalog
        && !targetProfileTouched
        && key !== 'targetProfileId'
        && (
          key === 'coffeeName'
          || key === 'process'
          || key === 'customProcess'
          || key === 'variety'
          || key === 'customVariety'
          || key === 'roastLevel'
          || key === 'altitudeMasl'
        )
      ) {
        next.targetProfileId = resolveDefaultTargetProfileIdForBean(next, catalog) || next.targetProfileId;
      }
      if (
        key === 'waterTdsPpm'
        || key === 'waterHardnessPpm'
        || key === 'waterAlkalinityPpm'
        || key === 'waterNotes'
      ) {
        next.waterCustomized = prev.waterMode === 'brand' && Boolean(prev.waterBrandId);
      }
      if (key === 'waterMode' && value === 'manual') {
        next.waterCustomized = true;
      }
      return next;
    });
  }

  function setWaterMode(mode: WaterMode) {
    const fallbackBrand = catalog?.waterBrands.find((item) => item.id === formState.waterBrandId);
    const fallbackPrefill = buildWaterPrefillValues(fallbackBrand);
    const fallbackCanAutofill = isWaterBrandAutofillAllowed(fallbackBrand);
    setFormState((prev) => ({
      ...prev,
      waterMode: mode,
      waterCustomized: mode === 'manual' ? true : false,
      waterTdsPpm: mode === 'manual'
        ? ''
        : mode === 'brand' && fallbackBrand && fallbackCanAutofill
          ? fallbackPrefill.waterTdsPpm || prev.waterTdsPpm
          : prev.waterTdsPpm,
      waterHardnessPpm: mode === 'manual'
        ? ''
        : mode === 'brand' && fallbackBrand && fallbackCanAutofill
          ? fallbackPrefill.waterHardnessPpm || prev.waterHardnessPpm
          : prev.waterHardnessPpm,
      waterAlkalinityPpm: mode === 'manual'
        ? ''
        : mode === 'brand' && fallbackBrand && fallbackCanAutofill
          ? fallbackPrefill.waterAlkalinityPpm || prev.waterAlkalinityPpm
          : prev.waterAlkalinityPpm,
      waterNotes: mode === 'manual' ? '' : mode === 'brand' && fallbackBrand ? (fallbackBrand.notes[0] || '') : prev.waterNotes,
    }));
    setShowMineralEditor(mode === 'manual' || !fallbackCanAutofill);
  }

  function applyWaterBrandSelection(brandId: string) {
    if (!catalog) return;
    const brand = catalog.waterBrands.find((item) => item.id === brandId);
    if (!brand) return;
    const prefill = buildWaterPrefillValues(brand);
    const knownFieldCount = countKnownWaterFields(brand);
    const canAutofill = isWaterBrandAutofillAllowed(brand);

    setFormState((prev) => ({
      ...prev,
      waterMode: 'brand',
      waterRegion: brand.marketCode,
      waterBrandId: brand.id,
      waterCustomized: false,
      waterTdsPpm: prefill.waterTdsPpm,
      waterHardnessPpm: prefill.waterHardnessPpm,
      waterAlkalinityPpm: prefill.waterAlkalinityPpm,
      waterNotes: brand.notes[0] || '',
    }));
    setShowMineralEditor(!canAutofill);
    if (canAutofill) {
      setNotice(copy.waterBrandAutofilled);
    } else if (brand.classification === 'zero_mineral_ro') {
      setNotice(copy.waterUseAsRoBase);
    } else if (knownFieldCount > 0) {
      setNotice(copy.waterBrandPartialFilled);
    } else {
      setNotice(copy.waterBrandNeedsManual);
    }
  }

  function applyWaterMineralCompletion() {
    if (!selectedWaterBrand || !selectedWaterCompletion) {
      setNotice(copy.waterCompleteMineralsUnavailable);
      return;
    }

    const noteParts = [
      selectedWaterCompletion.note,
      ...selectedWaterCompletion.warnings,
    ].filter(Boolean);

    setFormState((prev) => ({
      ...prev,
      waterMode: 'brand',
      waterRegion: selectedWaterBrand.marketCode,
      waterBrandId: selectedWaterBrand.id,
      waterCustomized: true,
      waterTdsPpm: formatWaterMineralInput(selectedWaterCompletion.tdsPpm),
      waterHardnessPpm: formatWaterMineralInput(selectedWaterCompletion.hardnessPpm),
      waterAlkalinityPpm: formatWaterMineralInput(selectedWaterCompletion.alkalinityPpm),
      waterNotes: noteParts.join(' '),
    }));
    setShowMineralEditor(true);
    setFormError(null);
    setNotice(copy.waterCompleteMineralsApplied);
  }

  function applyManualWaterPreset(values: {
    tds: number;
    hardness: number;
    alkalinity: number;
    note: string;
  }) {
    setFormState((prev) => ({
      ...prev,
      waterMode: 'manual',
      waterBrandId: '',
      waterCustomized: true,
      waterTdsPpm: formatWaterMineralInput(values.tds),
      waterHardnessPpm: formatWaterMineralInput(values.hardness),
      waterAlkalinityPpm: formatWaterMineralInput(values.alkalinity),
      waterNotes: values.note,
    }));
    setShowMineralEditor(true);
    setFormError(null);
  }

  async function handleGeneratePlan() {
    if (!catalog) return;
    if (!ensureAiAccess('ai_brew_generate')) return;
    if (isOffline) {
      setFormError(copy.aiOffline);
      return;
    }
    setFormError(null);
    setAiResponse(null);
    setAiError(null);
    clearSaveFeedback();
    syncTasteFeedback(null);
    const generationMode = activeBuilderModal === 'quick' ? 'quick' : 'pro';
    const generationFormState = generationMode === 'quick'
      ? createQuickAiBrewFormState(formState, catalog)
      : sanitizeAiBrewFormState(formState, catalog);

    if (generationFormState.waterMode === 'brand' && !generationFormState.waterBrandId) {
      setFormError(copy.waterNoBrand);
      return;
    }

    if (!waterReadyForGeneration) {
      setFormError(
        generationFormState.waterMode === 'brand' && selectedWaterBrand?.presetStatus !== 'autofill'
          ? copy.waterBrandNeedsManual
          : copy.waterRequired,
      );
      return;
    }

    setGenerationBusy(true);
    setGenerationProgress(null);
    setGenerationStage('validate_input');
    try {
      await nextAnimationFrame(0);
      let latestProgress: AiBrewGenerationProgress | null = null;
      let nextPlan = await buildAiBrewPlanProgressively(generationFormState, catalog, async (progress) => {
        latestProgress = progress;
        setGenerationProgress(progress);
        setGenerationStage(progress.id);
        await nextAnimationFrame(110);
      });
      if (requireOnlineAiGenerate && !canUseHybridAiSequence) {
        throw new Error('ai_brew_online_required');
      }
      if (canUseHybridAiSequence) {
        setGenerationProgress(createHybridAiSequenceProgress(nextPlan, latestProgress));
        setGenerationStage('hybrid_ai_sequence');
        await nextAnimationFrame(140);
        let optimized: Awaited<ReturnType<typeof runHybridOptimizationUpdate>>;
        try {
          optimized = await runHybridOptimizationUpdate(nextPlan, {
            enabled: true,
            platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
            language,
          });
        } catch (error) {
          console.warn(
            getAiBrewOptimizationFallbackMessage(language),
            error instanceof Error ? error.message : String(error || 'request_failed'),
          );
          optimized = applyAiBrewOptimizationPatch(nextPlan, null);
        }

        if (!optimized.applied) {
          reportAiBrewRuntimeEvent({
            name: 'ai_brew_optimizer_rejected',
            message: getAiBrewOptimizationFallbackMessage(language),
            details: optimized.rejected.length > 0 ? optimized.rejected : optimized.diagnostics,
            platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
          });
          console.warn(
            getAiBrewOptimizationFallbackMessage(language),
            optimized.rejected.length > 0 ? optimized.rejected : optimized.diagnostics,
          );
          try {
            optimized = await runHybridOptimizationUpdate(nextPlan, {
              enabled: true,
              platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
              language,
              repair: true,
            });
          } catch (error) {
            console.warn(
              getAiBrewOptimizationFallbackMessage(language),
              error instanceof Error ? error.message : String(error || 'repair_failed'),
            );
            optimized = applyAiBrewOptimizationPatch(nextPlan, null);
          }
        }

        if (!optimized.applied) {
          if (requireOnlineAiGenerate) {
            throw new Error('ai_brew_optimizer_unavailable');
          }
          reportAiBrewRuntimeEvent({
            name: 'ai_brew_optimizer_no_change',
            message: copy.aiOptimizationNoChange,
            details: optimized.rejected.length > 0 ? optimized.rejected : optimized.diagnostics,
            platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
          });
          console.warn(
            copy.aiOptimizationNoChange,
            optimized.rejected.length > 0 ? optimized.rejected : optimized.diagnostics,
          );
        }

        if (optimized.applied) {
          nextPlan = optimized.plan;
          latestProgress = createHybridAiSequenceProgress(nextPlan, latestProgress);
          setGenerationProgress(latestProgress);
        }

        try {
          const hybridSequence = await runHybridSequenceUpdate(nextPlan, {
            enabled: true,
            platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
            language,
          });
          if (hybridSequence) {
            nextPlan = applyHybridSequenceToPlan(nextPlan, {
              canonicalMarkdown: hybridSequence.canonicalMarkdown,
              displayMarkdown: hybridSequence.markdown,
              servicePattern: hybridSequence.servicePattern,
              watch: hybridSequence.watch,
              stepInstructions: hybridSequence.stepInstructions,
            });
            if (hybridSequence.fallbackDiagnostics.length > 0) {
              logAiBrewSequenceFallback(language, hybridSequence.fallbackDiagnostics);
              reportAiBrewRuntimeEvent({
                name: 'ai_brew_sequence_fallback',
                message: getAiBrewSequenceFallbackMessage(language),
                details: hybridSequence.fallbackDiagnostics,
                platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
              });
            }
          }
        } catch (error) {
          logAiBrewSequenceFallback(language, error);
          reportAiBrewRuntimeEvent({
            name: 'ai_brew_sequence_fallback',
            message: getAiBrewSequenceFallbackMessage(language),
            details: error,
            platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
          });
        }
      }
      const journalEntry: BrewJournalEntry = {
        id: nextPlan.id,
        fingerprint: nextPlan.fingerprint,
        title: buildLocalizedPlanRecipeName(nextPlan, language),
        locale: language,
        createdAt: nextPlan.createdAt,
        updatedAt: nextPlan.createdAt,
        plan: nextPlan,
      };
      setPlan(nextPlan);
      setShowProvenance(nextPlan.provenanceAttentionNeeded);
      setActiveJournalId(journalEntry.id);
      setActiveBuilderModal(null);
      setResultMode(generationMode);
      setResultOpen(true);
      setFormState(generationFormState);
      saveLastGeneratedBrewPlan(nextPlan);
      await saveBrewJournalEntry(journalEntry);
      void syncAiBrewLibraryToCloud({ aiBrewJournal: [journalEntry] });
      await refreshSavedViews();
      setNotice(planUsesOnlineAi(nextPlan) ? copy.generatedAi : copy.generatedLocal);
    } catch (error) {
      setFormError(getAiBrewFriendlyErrorMessage(error, language, copy.aiGenerateFailed));
    } finally {
      setGenerationBusy(false);
      setGenerationStage(null);
      setGenerationProgress(null);
    }
  }

  function handleReset() {
    if (!catalog) return;
    setPlan(null);
    setResultOpen(false);
    setResultMode('quick');
    setShowProvenance(false);
    setAiResponse(null);
    setAiError(null);
    clearSaveFeedback();
    syncTasteFeedback(null);
    setFormError(null);
    setActiveJournalId(null);
    setShowMineralEditor(false);
    setShowBeanProfileEditor(false);
    setShowQuickBeanDetails(false);
    setTargetProfileTouched(false);
    setFormState(createDefaultAiBrewFormState(catalog));
  }

  async function handleSaveRecipe() {
    if (!plan || saving) return;
    if (plan.workflowValidation?.status === 'blocked') {
      setSaveError(isIndonesianAiBrewLanguage(language)
        ? 'Resep belum bisa disimpan karena panduan seduh masih diblokir.'
        : 'Recipe cannot be saved while the workflow guide is blocked.');
      return;
    }
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    const recipe = buildRecipeFromPlan(plan, language);
    const item = createRecipeCollectionItem({
      id: `recipe_${plan.fingerprint}`,
      title: buildLocalizedPlanRecipeName(plan, language),
      recipe,
    });
    try {
      await saveCollectionItem(item);
      await syncAiBrewLibraryToCloud({ collectionItems: [{ ...item, source: 'ai_brew' }] });
      setSaveSuccess(copy.savedCollection);
    } catch {
      try {
        saveRecipe(recipe);
        setSaveSuccess(copy.savedCollection);
      } catch {
        setSaveError(copy.saveCollectionFailed);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleFavorite() {
    if (!plan) return;
    const existing = await findBrewPresetByFingerprint(plan.fingerprint);
    if (existing) {
      await deleteBrewPreset(existing.id);
      await refreshSavedViews();
      setNotice(copy.removedFavorite);
      return;
    }
    await saveBrewPreset({
      id: nowId('preset'),
      fingerprint: plan.fingerprint,
      title: buildLocalizedPlanRecipeName(plan, language),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      plan,
    });
    await refreshSavedViews();
    setNotice(copy.savedFavorite);
  }

  async function runAiTasteFeedbackCoach(nextFeedback: BrewTasteFeedback) {
    if (!plan) return;
    const deterministicMarkdown = buildAiBrewTasteLoopMarkdown(plan, nextFeedback, language);
    setAiResponse({ title: copy.feedbackCoachTitle, markdown: deterministicMarkdown });

    const onlineTasteFeedbackAiEnabled = false;
    if (!onlineTasteFeedbackAiEnabled || nextFeedback.rating === 'great' || !canUsePaidAiBrew || aiBusy) return;

    setAiBusy('troubleshoot');
    setAiError(null);
    try {
      const { buildTroubleshootPrompt } = await import('./prompts');
      const { deepThinkingResponseDetailed } = await import('../../services/gemini');
      const basePrompt = buildTroubleshootPrompt(plan, language);
      const promptBody = [
        basePrompt.body,
        '',
        'Taste feedback context for this finished brew:',
        `- rating: ${nextFeedback.rating}`,
        `- user note: ${nextFeedback.note || 'none'}`,
        '',
        'Return only a next-brew adjustment. Do not rewrite the current recipe.',
        'Use this order: smallest grind correction, pouring/agitation, then temperature +/-1 C if still needed.',
        'Do not change dose or ratio. Do not invent bean facts.',
      ].join('\n');
      const requestContext = {
        responseProfile: {
          language,
          verbosity: 'short' as const,
          format: 'steps' as const,
          tone: 'professional' as const,
        },
        clientContext: {
          platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
          surface: 'tools' as const,
          feature: 'ai_brew' as const,
          appLanguage: language,
          action: 'taste_feedback',
        },
      };
      const rawMarkdown = (await deepThinkingResponseDetailed(withLanguageLock(promptBody, language), requestContext, {
        timeoutMs: AI_BREW_COACH_DEEP_TIMEOUT_MS,
      })).text;
      const markdown = await normalizeMarkdownToLanguage(rawMarkdown, language, requestContext, {
        timeoutMs: AI_BREW_COACH_TRANSLATION_TIMEOUT_MS,
      });
      const guarded = sanitizeAiCoachMarkdown({ action: 'troubleshoot', markdown, plan });
      const safeMarkdown = guarded.risk === 'high'
        || isAiBrewGenericFailureMarkdown(rawMarkdown)
        || isAiBrewGenericFailureMarkdown(markdown)
        || isAiBrewGenericFailureMarkdown(guarded.markdown)
        || hasAiBrewLanguageLeak(guarded.markdown, language)
        ? deterministicMarkdown
        : guarded.markdown;
      setAiResponse({ title: copy.feedbackCoachTitle, markdown: safeMarkdown });
      const nextPlan = mergeAiNotesIntoPlan(plan, { troubleshoot: safeMarkdown });
      setPlan(nextPlan);
      saveLastGeneratedBrewPlan(nextPlan);
      if (activeJournalId) {
        await updateBrewJournalAiNotes(activeJournalId, { troubleshoot: safeMarkdown });
      }
    } catch (error) {
      console.warn(copy.feedbackCoachHint, error);
      setAiResponse({ title: copy.feedbackCoachTitle, markdown: deterministicMarkdown });
    } finally {
      setAiBusy(null);
    }
  }

  async function handleSaveTasteFeedback(rating: BrewTasteFeedbackRating) {
    if (!plan || saving) return;
    const now = Date.now();
    const nextFeedback: BrewTasteFeedback = {
      rating,
      note: sanitizeBrewFeedbackNote(feedbackNoteDraft) || undefined,
      createdAt: activeFeedback?.createdAt || now,
      updatedAt: now,
    };
    const journalId = activeJournalId || plan.id;
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);
    try {
      const updated = await updateBrewJournalFeedback(journalId, nextFeedback);
      let entryForSync = updated;
      if (!updated) {
        const newEntry: BrewJournalEntry = {
          id: journalId,
          fingerprint: plan.fingerprint,
          title: buildLocalizedPlanRecipeName(plan, language),
          locale: language,
          createdAt: plan.createdAt,
          updatedAt: now,
          plan,
          aiNotes: plan.aiNotes,
          feedback: nextFeedback,
        };
        await saveBrewJournalEntry(newEntry);
        entryForSync = newEntry;
      }
      if (entryForSync) void syncAiBrewLibraryToCloud({ aiBrewJournal: [entryForSync] });
      setActiveJournalId(journalId);
      setActiveFeedback(nextFeedback);
      setFeedbackNoteDraft(nextFeedback.note || '');
      await refreshSavedViews();
      setSaveSuccess(copy.feedbackSaved);
      void runAiTasteFeedbackCoach(nextFeedback);
    } catch {
      setSaveError(copy.feedbackSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function runAiCoach(mode: AiCoachMode) {
    if (!plan) return;
    if (plan.workflowValidation?.status === 'blocked') {
      setAiError(isIndonesianAiBrewLanguage(language)
        ? 'AI Assist dikunci karena panduan seduh masih diblokir. Pilih ukuran Switch exact atau programme yang aman dulu.'
        : 'AI Assist is locked because the brew guide is blocked. Choose an exact Switch size or a safe programme first.');
      return;
    }
    if (!ensureAiAccess(`ai_brew_${mode}`)) return;
    if (isOffline) {
      setAiError(copy.aiOffline);
      return;
    }

    const engineMode = mapCoachModeToEngineMode(mode);
    const {
      buildAdjustPrompt,
      buildAiAssistPrompt,
      buildExplainPrompt,
      buildTroubleshootPrompt,
    } = await import('./prompts');
    const prompt =
      mode === 'explain'
        ? buildExplainPrompt(plan, language)
        : mode === 'troubleshoot'
          ? buildTroubleshootPrompt(plan, language)
          : mode === 'adjust'
            ? buildAdjustPrompt(plan, language)
            : buildAiAssistPrompt(engineMode, plan, language);
    const guardAction = mapCoachModeToGuardAction(mode);
    const notesKey = mapCoachModeToAiNotesKey(mode);
    const fallbackMarkdown = sanitizeAiCoachMarkdown({
      action: guardAction,
      markdown: sanitizeBrewNarrative(
        localizeAiBrewMarkdownLanguage(buildDeterministicAiCoachMarkdown(plan, guardAction, language), language),
        plan,
      ),
      plan,
    }).markdown;
    const cacheKey = buildAiAssistCacheKey(plan, mode, language);
    const cached = aiAssistCacheRef.current.get(cacheKey);
    if (cached) {
      setAiResponse(cached);
      setNotice(copy.aiAssistCacheReused);
      return;
    }

    const commitCoachMarkdown = async (markdown: string, currentPlan: BrewPlan = plan) => {
      const response = { title: prompt.title, markdown };
      setAiResponse(response);
      aiAssistCacheRef.current.set(cacheKey, response);
      const nextPlan = mergeAiNotesIntoPlan(currentPlan, { [notesKey]: markdown });
      setPlan(nextPlan);
      saveLastGeneratedBrewPlan(nextPlan);
      if (activeJournalId) {
        try {
          await updateBrewJournalAiNotes(activeJournalId, { [notesKey]: markdown });
          void syncAiBrewLibraryToCloud({
            aiBrewJournal: [{
              id: activeJournalId,
              fingerprint: nextPlan.fingerprint,
              title: buildLocalizedPlanRecipeName(nextPlan, language),
              locale: language,
              createdAt: nextPlan.createdAt,
              updatedAt: Date.now(),
              plan: nextPlan,
              aiNotes: nextPlan.aiNotes,
              feedback: activeFeedback || undefined,
            }],
          });
          await refreshSavedViews();
        } catch (storageError) {
          if (import.meta.env.DEV) {
            console.warn('AI Brew coach note save skipped.', storageError);
          }
        }
      }
    };

    setAiBusy(mode);
    setAiError(null);
    setAiResponse({ title: prompt.title, markdown: fallbackMarkdown });
    try {
      if (mode === 'adjust') {
        const optimized = await runHybridOptimizationUpdate(plan, {
          enabled: true,
          platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
          language,
        });
        const safeMarkdown = optimized.applied
          ? `### ${copy.aiEngineOnlineOptimized}\n${copy.aiOptimizationAccepted}`
          : `### ${copy.aiEngineLocalValidated}\n${copy.aiOptimizationRejectedProtected}`;
        if (optimized.applied) {
          await commitCoachMarkdown(safeMarkdown, optimized.plan);
        } else {
          reportAiBrewRuntimeEvent({
            name: 'ai_brew_optimizer_rejected',
            message: copy.aiOptimizationNoChange,
            details: optimized.rejected.length > 0 ? optimized.rejected : optimized.diagnostics,
            platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
          });
          await commitCoachMarkdown(safeMarkdown);
        }
        return;
      }

      const requestContext = {
        responseProfile: {
          language,
          verbosity: mode === 'deep_analysis' ? ('comprehensive' as const) : ('short' as const),
          format: mode === 'troubleshoot' ? ('steps' as const) : ('bullets' as const),
          tone: 'professional' as const,
        },
        clientContext: {
          platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
          surface: 'tools' as const,
          feature: 'ai_brew' as const,
          appLanguage: language,
        },
      };
      const lockedPrompt = withLanguageLock(prompt.body, language);
      const { deepThinkingResponseDetailed, raceChatResponse } = await import('../../services/gemini');
      const rawMarkdown = mode === 'troubleshoot' || mode === 'deep_analysis'
        ? (await deepThinkingResponseDetailed(lockedPrompt, requestContext, { timeoutMs: AI_BREW_COACH_DEEP_TIMEOUT_MS })).text
        : await raceChatResponse(lockedPrompt, requestContext, {
            timeoutMs: AI_BREW_COACH_FAST_TIMEOUT_MS,
            fallbackToStructured: false,
          });
      const markdown = await normalizeMarkdownToLanguage(rawMarkdown, language, requestContext, {
        timeoutMs: AI_BREW_COACH_TRANSLATION_TIMEOUT_MS,
      });
      const guarded = sanitizeAiCoachMarkdown({ action: guardAction, markdown, plan });
      const safeMarkdown = guarded.risk === 'high'
        || isAiBrewGenericFailureMarkdown(rawMarkdown)
        || isAiBrewGenericFailureMarkdown(markdown)
        || isAiBrewGenericFailureMarkdown(guarded.markdown)
        || hasAiBrewLanguageLeak(guarded.markdown, language)
        ? fallbackMarkdown
        : guarded.markdown;
      await commitCoachMarkdown(safeMarkdown);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(getAiBrewFriendlyErrorMessage(error, language, copy.coachFallback), error);
      }
      await commitCoachMarkdown(fallbackMarkdown);
    } finally {
      setAiBusy(null);
    }
  }

  function hydrateFromPlan(nextPlan: BrewPlan, feedback?: BrewTasteFeedback | null, journalId = nextPlan.id) {
    if (!catalog) return;
    const nextForm = sanitizeAiBrewFormState(loadPlanIntoForm(nextPlan), catalog);
    setFormState(nextForm);
    setShowMineralEditor(nextForm.waterMode === 'manual' || nextForm.waterCustomized);
    setPlan(nextPlan);
    setShowProvenance(nextPlan.provenanceAttentionNeeded);
    setActiveJournalId(journalId);
    clearSaveFeedback();
    syncTasteFeedback(feedback);
    setActiveBuilderModal(null);
    setResultMode(feedback ? 'pro' : 'quick');
    setResultOpen(true);
    saveLastGeneratedBrewPlan(nextPlan);
    setAiResponse(selectDefaultAiResponse(copy, nextPlan.aiNotes, nextPlan, language));
    setAiError(null);
  }

  function hydrateFromJournalEntry(entry: BrewJournalEntry) {
    hydrateFromPlan(entry.plan, entry.feedback, entry.id);
  }

  const pickerTitle = pickerKind
    ? pickerKind === 'process'
      ? copy.process
      : pickerKind === 'variety'
        ? copy.variety
        : pickerKind === 'water_brand'
          ? copy.waterBrandPicker
        : pickerKind === 'dripper'
          ? copy.dripper
          : copy.grinder
    : copy.process;
  const aiCoachDisabled = !plan || isOffline || aiBusy !== null || plan.workflowValidation?.status === 'blocked';
  const aiCoachReason = !plan
    ? null
    : isOffline
      ? copy.aiDisabledOffline
      : null;

  function openBuilder(mode: FormMode) {
    if (!catalog) return;
    if (!ensureAiAccess(`ai_brew_${mode}`)) return;
    if (isOffline) {
      setNotice(copy.aiOffline);
      return;
    }
    setFormError(null);
    setShowBeanProfileEditor(false);
    if (mode === 'quick') {
      const activeBrand = catalog.waterBrands.find((item) => item.id === formState.waterBrandId);
      const quickBrand = activeBrand && isWaterBrandAutofillAllowed(activeBrand)
        ? activeBrand
        : quickSelectableWaterBrands[0];
      if (quickBrand) {
        const prefill = buildWaterPrefillValues(quickBrand);
        setFormState((prev) => ({
          ...prev,
          waterMode: 'brand',
          waterRegion: quickBrand.marketCode,
          waterBrandId: quickBrand.id,
          waterCustomized: false,
          waterTdsPpm: prefill.waterTdsPpm,
          waterHardnessPpm: prefill.waterHardnessPpm,
          waterAlkalinityPpm: prefill.waterAlkalinityPpm,
          waterNotes: quickBrand.notes[0] || '',
        }));
      }
      setShowMineralEditor(false);
    }
    setActiveBuilderModal(mode);
  }

  function closeBuilder() {
    setActiveBuilderModal(null);
    setFormError(null);
    setShowBeanProfileEditor(false);
    setShowQuickBeanDetails(false);
  }

  function handleEditInputs() {
    setResultOpen(false);
    clearSaveFeedback();
    setShowBeanProfileEditor(false);
    setActiveBuilderModal(preferredBuilderMode);
  }

  function openPicker(kind: NonNullable<PickerKind>, trigger: HTMLButtonElement) {
    try {
      trigger.focus({ preventScroll: true });
    } catch {
      trigger.focus();
    }
    setPickerRestoreFocusTarget(trigger);
    setPickerKind(kind);
  }

  function renderFeedback(includeFormError: boolean) {
    if (!notice && !catalogError && (!includeFormError || !formError)) return null;

    return (
      <div className="space-y-3">
        {notice && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300" role="status" aria-live="polite" aria-atomic="true">
            {notice}
          </div>
        )}
        {includeFormError && formError && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300" role="alert">
            {formError}
          </div>
        )}
        {catalogError && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300" role="alert">
            {catalogError}
          </div>
        )}
      </div>
    );
  }

  function renderGenerationOverlay() {
    if (!generationBusy) return null;

    const id = isIndonesianAiBrewLanguage(language);
    const totalStages = AI_BREW_GENERATION_STAGES.length;
    const currentStageNumber = generationStageIndex >= 0 ? generationStageIndex + 1 : 1;
    const normalizedStageIndex = generationStageIndex >= 0 ? generationStageIndex : 0;
    const elapsedLabel = formatTime(Math.max(0, Math.floor(generationElapsedMs / 1000)));
    const EngineIcon = activeBuilderModal === 'pro' ? Brain : Sparkles;
    const engineLabel = aiEngineWorkingLabel;
    const loadingSteps = [
      {
        key: 'inputs',
        label: id ? 'Input' : 'Inputs',
        start: 0,
        end: 1,
      },
      {
        key: 'calibration',
        label: id ? 'Kalibrasi' : 'Calibration',
        start: 2,
        end: 3,
      },
      {
        key: 'sequence',
        label: activeBuilderModal === 'pro'
          ? (id ? 'Presisi' : 'Precision')
          : (id ? 'Urutan' : 'Sequence'),
        start: 4,
        end: totalStages - 1,
      },
    ];

    return (
      <div
        className="absolute inset-0 z-30 grid place-items-center bg-[rgba(2,6,23,0.62)] px-4 py-4 backdrop-blur-sm"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="ai-brew-generation-overlay"
        data-disable-page-swipe
      >
        <div
          className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-4 text-slate-950 shadow-[0_24px_64px_rgba(15,23,42,0.28)] dark:border-white/15 dark:bg-slate-950 dark:text-white dark:shadow-[0_28px_72px_rgba(0,0,0,0.45)] lg:p-5"
          data-testid="ai-brew-generation-card"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
            <Loader2 size={20} className="animate-spin" />
          </div>
          <div className="mx-auto mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-700 dark:border-blue-400/30 dark:bg-blue-950 dark:text-blue-100">
            <EngineIcon size={13} />
            <span>{engineLabel}</span>
          </div>

          <div className="mt-4 text-center">
            <p className="text-base font-semibold text-slate-950 dark:text-white">
              {id ? 'Menyusun seduhan' : 'Building your brew'}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">{generationStageDetail}</p>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:text-slate-200">
              <span>{id ? `Tahap ${currentStageNumber}/${totalStages}` : `Stage ${currentStageNumber}/${totalStages}`}</span>
              <span>{generationProgressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${generationProgressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {loadingSteps.map((step) => {
              const state = normalizedStageIndex > step.end
                ? 'done'
                : normalizedStageIndex >= step.start
                  ? 'active'
                  : 'pending';

              return (
                <div
                  key={step.key}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                    state === 'done'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-950 dark:text-emerald-100'
                      : state === 'active'
                        ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-400/30 dark:bg-blue-950 dark:text-blue-100'
                        : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {state === 'done' ? (
                      <Check size={15} />
                    ) : state === 'active' ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-current opacity-35" />
                    )}
                    <span className="font-medium">{step.label}</span>
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">
                    {state === 'done'
                      ? (id ? 'OK' : 'OK')
                      : state === 'active'
                        ? (id ? 'Aktif' : 'Active')
                        : (id ? 'Nanti' : 'Next')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-700 dark:text-slate-200">
            <Clock3 size={13} className="text-blue-500" />
            <span>{elapsedLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  function renderBuilderDialog(mode: FormMode) {
    const isPro = mode === 'pro';
    const pourStyleOptions = [
      { value: 'auto', label: copy.pourStyleAuto },
      { value: 'balanced', label: copy.pourStyleBalanced },
      { value: 'pulse', label: copy.pourStylePulse },
      { value: 'gentle', label: copy.pourStyleGentle },
    ] as const;
    const pourCountOptions = [
      { value: 'auto', label: copy.pourCountAuto },
      { value: '3', label: copy.pourCount3 },
      { value: '4', label: copy.pourCount4 },
      { value: '5', label: copy.pourCount5 },
    ] as const;
    const origamiFilterOptions = [
      { value: 'auto', label: copy.origamiFilterAuto },
      { value: 'cone', label: copy.origamiFilterCone },
      { value: 'wave', label: copy.origamiFilterWave },
    ] as const;
    const aeropressStyleOptions = [
      { value: 'auto', label: copy.aeropressStyleAuto },
      { value: 'standard', label: copy.aeropressStyleStandard },
      { value: 'inverted', label: copy.aeropressStyleInverted },
      { value: 'bypass', label: copy.aeropressStyleBypass },
      { value: 'no_bypass', label: copy.aeropressStyleNoBypass },
      { value: 'bright_clean', label: copy.aeropressStyleBrightClean },
      { value: 'sweet_body', label: copy.aeropressStyleSweetBody },
    ] as const;
    const dialogTitle = isPro ? `${copy.title} - ${copy.proBuilderTitle}` : copy.title;
    const showBeanDetailsControls = isPro || showQuickBeanDetails;
    const showOrigamiFilterControl = selectedDripper?.methodFamily === 'origami';
    const showAeroPressStyleControl = selectedDripper?.methodFamily === 'aeropress';
    const methodOptionPanel = showOrigamiFilterControl || showAeroPressStyleControl ? (
      <div className="rounded-[1.1rem] border panel-divider-subtle panel-soft p-3" data-testid="ai-brew-method-option-panel">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.methodOptionTitle}</h4>
        </div>
        <div className="mt-3 space-y-3">
          {showOrigamiFilterControl ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-secondary">{copy.origamiFilterTitle}</p>
              <div className="grid grid-cols-3 gap-2">
                {origamiFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm('origamiFilterStyle', option.value)}
                    className={`min-h-[42px] rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      formState.origamiFilterStyle === option.value
                        ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]'
                        : 'bg-[var(--bg-base)] text-secondary hover:text-primary'
                    }`}
                    aria-pressed={formState.origamiFilterStyle === option.value}
                    data-testid={`ai-brew-origami-filter-${option.value}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {showAeroPressStyleControl ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-secondary">{copy.aeropressStyleTitle}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {aeropressStyleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm('aeropressStyle', option.value)}
                    className={`min-h-[42px] rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      formState.aeropressStyle === option.value
                        ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]'
                        : 'bg-[var(--bg-base)] text-secondary hover:text-primary'
                    }`}
                    aria-pressed={formState.aeropressStyle === option.value}
                    data-testid={`ai-brew-aeropress-style-${option.value}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    ) : null;
    const pourControlPanel = selectedDripperSupportsPourControl ? (
      <div className="rounded-[1.1rem] panel-soft p-3" data-testid="ai-brew-pour-control-panel">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.pourControlTitle}</p>
          {copy.pourControlHint ? (
            <p className="text-xs leading-5 text-secondary">{copy.pourControlHint}</p>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-secondary">{copy.pourStyleTitle}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {pourStyleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateForm('pourStyle', option.value)}
                  className={`min-h-[42px] rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    formState.pourStyle === option.value
                      ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]'
                      : 'bg-[var(--bg-base)] text-secondary hover:text-primary'
                  }`}
                  aria-pressed={formState.pourStyle === option.value}
                  data-testid={`ai-brew-pour-style-${option.value}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-secondary">{copy.pourCountTitle}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {pourCountOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateForm('pourCount', option.value)}
                  className={`min-h-[42px] rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    formState.pourCount === option.value
                      ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]'
                      : 'bg-[var(--bg-base)] text-secondary hover:text-primary'
                  }`}
                  aria-pressed={formState.pourCount === option.value}
                  data-testid={`ai-brew-pour-count-${option.value}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    ) : null;

    const switchSizeOptions = (catalog?.drippers || []).filter((item) => (
      item.methodFamily === 'hario_switch' && isExactHarioSwitchDripperId(item.id) && !item.hidden
    ));
    const switchPresetOptions = getSwitchPresets(catalog || undefined)
      .filter((preset) => {
        if (!selectedDripper || !preset.compatibleDripperIds.includes(selectedDripper.id)) return false;
        if (!isPro && preset.proOnly) return false;
        if (preset.mugenOnly && selectedDripper.id !== 'mugen-x-switch') return false;
        if (selectedDripper.id !== 'mugen-x-switch' && preset.id === 'mugen_everyday_hybrid') return false;
        return true;
      })
      .filter((preset) => formState.brewMode === 'iced' ? preset.id === 'iced_hybrid' || preset.iced : !preset.iced)
      .slice(0, isPro ? 8 : 6);
    const switchDoseOptions = getSwitchDoseRows(catalog || undefined, selectedDripper?.id || '')
      .map((row) => row.doseG)
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort((a, b) => a - b);
    const selectedSwitchPreset = switchPresetOptions.find((preset) => preset.id === formState.switchPresetId)
      || getSwitchPresets(catalog || undefined).find((preset) => preset.id === formState.switchPresetId);
    const isSwitchDripper = selectedDripper?.methodFamily === 'hario_switch';
    const selectedSwitchIsExact = Boolean(selectedDripper?.id && isExactHarioSwitchDripperId(selectedDripper.id));
    const showSwitchSizeChooser = isSwitchDripper && !selectedSwitchIsExact;
    const parsedDoseG = Number.parseFloat(formState.doseG || '0');
    const selectedSwitchCapacity = selectedDripper?.physicalConstraints?.finishedCapacityMl;
    const selectedSwitchClosedMax = selectedDripper?.physicalConstraints?.recommendedClosedPhaseMaxMl;
    const selectedSwitchSizeLabel = selectedDripper ? getSwitchSizeLabel(selectedDripper) : copy.notSpecified;
    const selectedSwitchPresetLabel = selectedSwitchPreset
      ? (isIndonesianAiBrewLanguage(language) ? selectedSwitchPreset.labelId || selectedSwitchPreset.label : selectedSwitchPreset.label)
      : selectedDripper?.id === 'mugen-x-switch'
        ? copy.switchAutoMugenHybrid
        : formState.brewMode === 'iced'
          ? copy.switchAutoIcedHybrid
          : copy.switchAutoHybridBalanced;
    const switchValvePathLabel = formState.switchPresetId === 'v60_mode'
      ? (isIndonesianAiBrewLanguage(language) ? 'Katup terbuka dari awal' : 'Valve open from start')
      : formState.brewMode === 'iced' || formState.switchPresetId === 'iced_hybrid'
        ? (isIndonesianAiBrewLanguage(language) ? 'Katup tutup -> buka di atas es' : 'Closed -> release over ice')
        : (isIndonesianAiBrewLanguage(language) ? 'Katup tutup -> buka katup' : 'Closed -> open');
    const switchSafetyTone = selectedDripper?.id === 'hario-switch-02' && parsedDoseG >= 20
      ? 'caution'
      : selectedDripper?.id === 'mugen-x-switch' && parsedDoseG > 15
        ? 'caution'
        : 'safe';
    const switchSafetyLabel = switchSafetyTone === 'caution' ? copy.switchSafetyCaution : copy.switchSafetySafe;
    const switchSafetyMessage = switchSafetyTone === 'caution'
      ? (isIndonesianAiBrewLanguage(language)
        ? `${selectedSwitchSizeLabel}: ${formatRoundedGrams(parsedDoseG || 0)} butuh mode V60 atau hybrid konservatif.`
        : `${selectedSwitchSizeLabel}: ${formatRoundedGrams(parsedDoseG || 0)} needs V60 mode or a conservative hybrid.`)
      : (isIndonesianAiBrewLanguage(language)
        ? `${selectedSwitchSizeLabel} aman untuk dosis ini dengan Auto.`
        : `${selectedSwitchSizeLabel} is safe for this dose on Auto.`);
    const switchMethodLabel = (preset: SwitchPublicPreset) => {
      if (preset.id === 'immersion_sweet') return isIndonesianAiBrewLanguage(language) ? 'Manis' : 'Sweet';
      if (preset.id === 'immersion_heavy_body') return isIndonesianAiBrewLanguage(language) ? 'Body' : 'Body';
      if (preset.id === 'hybrid_balanced') return isIndonesianAiBrewLanguage(language) ? 'Seimbang' : 'Balanced';
      if (preset.id === 'hybrid_bright_clean') return isIndonesianAiBrewLanguage(language) ? 'Cerah' : 'Bright';
      if (preset.id === 'v60_mode') return isIndonesianAiBrewLanguage(language) ? 'V60' : 'V60';
      if (preset.id === 'iced_hybrid') return isIndonesianAiBrewLanguage(language) ? 'Es' : 'Iced';
      if (preset.id === 'mugen_everyday_hybrid') return isIndonesianAiBrewLanguage(language) ? 'MUGEN' : 'MUGEN';
      return isIndonesianAiBrewLanguage(language) ? preset.labelId || preset.label : preset.label;
    };
    const switchPanel = selectedDripper?.methodFamily === 'hario_switch' ? (
      <div className="min-w-0 max-w-full overflow-hidden rounded-[1rem] border panel-divider-subtle bg-surface-alpha px-3 py-3 [overflow-wrap:anywhere]" data-testid="ai-brew-switch-section">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-secondary">{copy.switchSectionTitle}</p>
            <div className="mt-1 flex min-w-0 max-w-full flex-wrap gap-1.5 text-[11px] font-semibold text-secondary" data-testid="ai-brew-switch-selected-size">
              <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">{selectedSwitchSizeLabel}</span>
              {selectedSwitchCapacity ? (
                <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">{selectedSwitchCapacity} ml</span>
              ) : null}
              {selectedSwitchClosedMax ? (
                <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">
                  {isIndonesianAiBrewLanguage(language) ? 'Max tutup' : 'Closed max'} {selectedSwitchClosedMax} ml
                </span>
              ) : null}
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            switchSafetyTone === 'caution'
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          }`} data-testid="ai-brew-switch-safety-summary">
            {switchSafetyLabel}
          </span>
        </div>

        {showSwitchSizeChooser && (
          <div className="mt-2 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5">
            {switchSizeOptions.map((item) => {
              const active = formState.dripperId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFormState((prev) => ({
                      ...prev,
                      dripperId: item.id,
                      switchPresetId: item.id === 'mugen-x-switch'
                        ? (prev.switchPresetId === 'iced_hybrid' ? 'iced_hybrid' : 'mugen_everyday_hybrid')
                        : prev.switchPresetId === 'mugen_everyday_hybrid'
                          ? ''
                          : prev.switchPresetId,
                    }));
                  }}
                  className={`min-h-[40px] min-w-0 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
                    active ? 'bg-blue-600 text-white' : 'bg-[var(--bg-base)] text-secondary hover:text-primary'
                  }`}
                  data-testid={`ai-brew-switch-size-${item.id}`}
                  aria-pressed={active}
                >
                  <span className="block truncate">{getSwitchSizeLabel(item)}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-2 min-w-0 max-w-full overflow-hidden" data-testid="ai-brew-switch-method-strip">
          <div className="ai-brew-contained-scroll flex w-full min-w-0 max-w-full gap-1.5 overflow-x-auto overscroll-x-contain pb-1 pr-1 [-webkit-overflow-scrolling:touch]" aria-label={isIndonesianAiBrewLanguage(language) ? 'Pilih metode Hario Switch' : 'Choose Hario Switch method'}>
            <button
              type="button"
              onClick={() => updateForm('switchPresetId', '')}
              className={`min-h-[40px] max-w-[7.5rem] shrink-0 truncate rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                !formState.switchPresetId ? 'bg-blue-600 text-white' : 'bg-[var(--bg-base)] text-primary hover:bg-surface-alpha-hover'
              }`}
              data-testid="ai-brew-switch-preset-auto-inline"
              aria-pressed={!formState.switchPresetId}
            >
              {isIndonesianAiBrewLanguage(language) ? 'Auto' : 'Auto'}
            </button>
            {switchPresetOptions.map((preset) => {
              const active = formState.switchPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setFormState((prev) => ({
                      ...prev,
                      switchPresetId: preset.id as SwitchPublicPresetId,
                      switchTeachingMode: preset.teachingMode,
                      brewMode: preset.iced ? 'iced' : prev.brewMode,
                    }));
                  }}
                  className={`min-h-[40px] max-w-[7.5rem] shrink-0 truncate rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                    active ? 'bg-blue-600 text-white' : 'bg-[var(--bg-base)] text-primary hover:bg-surface-alpha-hover'
                  }`}
                  data-testid={`ai-brew-switch-preset-inline-${preset.id}`}
                  aria-pressed={active}
                >
                  {switchMethodLabel(preset)}
                </button>
              );
            })}
          </div>
          <p className="mt-1 max-w-full break-words text-[11px] leading-4 text-secondary">
            {formState.switchPresetId
              ? `${selectedSwitchPresetLabel}: ${switchValvePathLabel}`
              : (isIndonesianAiBrewLanguage(language) ? 'Auto mengikuti Profil Target dan batas ukuran.' : 'Auto follows the taste target and size guardrails.')}
          </p>
        </div>
      </div>
    ) : null;
    const brewModeAndMethodPanel = selectedDripper ? (
      <div className="min-w-0 max-w-full overflow-hidden rounded-[1.1rem] border panel-divider-subtle panel-soft p-3" data-testid="ai-brew-brew-mode-method-panel">
        <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
            {isIndonesianAiBrewLanguage(language) ? 'Mode seduh' : 'Brew mode'}
          </p>
          <span className="rounded-full bg-[var(--bg-base)] px-2.5 py-1 text-[11px] font-semibold text-secondary">
            {selectedDripperSupportsIced
              ? (isIndonesianAiBrewLanguage(language) ? 'Panas / Es' : 'Hot / Iced')
              : (isIndonesianAiBrewLanguage(language) ? 'Panas saja' : 'Hot only')}
          </span>
        </div>
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 rounded-[1rem] bg-[var(--bg-base)] p-1.5">
          <button
            type="button"
            onClick={() => {
              setFormState((prev) => ({
                ...prev,
                brewMode: 'hot',
                switchPresetId: prev.switchPresetId === 'iced_hybrid' ? '' : prev.switchPresetId,
              }));
            }}
            className={`min-h-[44px] min-w-0 rounded-[0.9rem] px-3 py-2.5 text-sm font-semibold transition-all ${formState.brewMode === 'hot' ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]' : 'text-secondary hover:text-primary'}`}
            data-testid="ai-brew-builder-mode-hot"
            aria-pressed={formState.brewMode === 'hot'}
          >
            {resolveModeLabel(copy, 'hot', selectedDripper.methodFamily)}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!selectedDripperSupportsIced) {
                setNotice(copy.icedUnavailable);
                return;
              }
              setFormState((prev) => ({
                ...prev,
                brewMode: 'iced',
                switchPresetId: isSwitchDripper ? 'iced_hybrid' : prev.switchPresetId,
              }));
            }}
            disabled={!selectedDripperSupportsIced}
            aria-disabled={!selectedDripperSupportsIced}
            title={!selectedDripperSupportsIced ? copy.icedUnavailable : copy.modeIced}
            className={`min-h-[44px] min-w-0 rounded-[0.9rem] px-3 py-2.5 text-sm font-semibold transition-all ${formState.brewMode === 'iced' ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]' : 'text-secondary hover:text-primary'} ${!selectedDripperSupportsIced ? 'cursor-not-allowed opacity-45 hover:text-secondary' : ''}`}
            data-testid="ai-brew-builder-mode-iced"
            aria-pressed={formState.brewMode === 'iced'}
          >
            {copy.modeIced}
          </button>
        </div>
        {!selectedDripperSupportsIced ? (
          <p className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300" data-testid="ai-brew-iced-unavailable-note">
            {copy.icedUnavailableInline}
          </p>
        ) : null}
        <div className="mt-2 rounded-xl bg-[var(--bg-base)] px-3 py-2 text-xs leading-5 text-secondary" data-testid="ai-brew-method-summary">
          <span className="font-semibold text-primary">{selectedDripper.name}</span>
          {' - '}
          {isSwitchDripper
            ? (isIndonesianAiBrewLanguage(language) ? 'pilih metode di bawah.' : 'choose the method below.')
            : (isIndonesianAiBrewLanguage(language) ? 'metode otomatis dari profil alat.' : 'method comes from the brewer profile.')}
        </div>
        {switchPanel ? <div className="mt-2" data-testid="ai-brew-switch-inline-methods">{switchPanel}</div> : null}
        {!switchPanel && methodOptionPanel ? <div className="mt-2">{methodOptionPanel}</div> : null}
      </div>
    ) : null;

    return (
      <FocusLockedDialog
        open={activeBuilderModal === mode}
        onClose={() => {
          closeBuilder();
        }}
        ariaLabel={dialogTitle}
        className="fixed inset-0 z-[111] h-[calc(var(--fullscreen-modal-height)_+_1px)] max-h-[calc(var(--fullscreen-modal-height)_+_1px)] max-w-full overflow-hidden bg-[var(--bg-base)]/98 lg:inset-6 lg:mx-auto lg:h-auto lg:max-h-[calc(var(--fullscreen-modal-height)_-_3rem)] lg:max-w-5xl lg:rounded-[2rem] lg:border lg:border-glass lg:shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
        disableMotionShift
      >
        <div className="relative flex h-full min-w-0 max-w-full flex-col overflow-hidden" data-testid={`ai-brew-builder-${mode}`}>
          <div
            className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-3 pt-3 lg:px-6 lg:pb-6 lg:pt-6"
            style={{
              paddingTop: 'calc(12px + var(--safe-top, 0px))',
              paddingBottom: 'calc(28px + var(--bottom-safe-capped, 0px))',
            }}
          >
            <div className="min-w-0 max-w-full space-y-4">
              <div className="relative min-w-0 max-w-full overflow-hidden rounded-[1.25rem] border panel-divider-subtle bg-surface-alpha/75 px-3.5 pb-3.5 pt-4 lg:px-5 lg:pb-4 lg:pt-5">
                <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[var(--panel-border-soft)] lg:hidden" />
                <button
                  type="button"
                  onClick={closeBuilder}
                  className="absolute right-3 top-3 icon-touch-button glass-button"
                  aria-label={copy.closeBuilder}
                  data-testid={`ai-brew-close-${mode}`}
                  data-autofocus="true"
                >
                  <X size={18} />
                </button>
                <div className="min-w-0 pr-12">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                    {isPro ? <Brain size={13} /> : <Sparkles size={13} />}
                    <span>{isPro ? copy.proMode : copy.quickMode}</span>
                    <span className="opacity-70">
                      {aiEngineReadyLabel}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-primary lg:text-xl">{dialogTitle}</h3>
                  {isPro ? (
                    <p className="mt-1 text-xs leading-5 text-secondary">{copy.aiPrecisionAssistNote}</p>
                  ) : null}
                </div>

                {selectedTargetProfile && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary">
                      {copy.profileTitle}: {translateTargetProfileLabel(copy, selectedTargetProfile.id)}
                    </span>
                    <span className="rounded-full bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-secondary">
                      {isIndonesianAiBrewLanguage(language) ? 'Panas/Es dipilih setelah alat seduh.' : 'Hot/Iced is selected after the brewer.'}
                    </span>
                  </div>
                )}

              </div>

              {renderFeedback(true)}

              <div className={`grid gap-4 ${isPro ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}`}>
                <div className="glass-card p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Coffee size={16} className="text-blue-500" />
                    <h3 className="text-base font-semibold">{copy.coffeeTitle}</h3>
                  </div>
                  <div className="space-y-3.5">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.coffeeName}</label>
                      <input
                        name="ai-brew-coffee-name"
                        type="text"
                        value={formState.coffeeName}
                        onChange={(event) => updateForm('coffeeName', event.target.value)}
                        placeholder={copy.coffeeNamePlaceholder}
                        aria-label={copy.coffeeName}
                        className="glass-input h-12 w-full px-4 text-base"
                        data-testid="ai-brew-coffee-name"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.dose}</label>
                        <input
                          name="ai-brew-dose"
                          type="number"
                          min="10"
                          max="20"
                          step="0.1"
                          value={formState.doseG}
                          onChange={(event) => updateForm('doseG', event.target.value)}
                          aria-label={copy.dose}
                          className="glass-input h-12 w-full px-4 text-base"
                          data-testid="ai-brew-dose"
                        />
                        <p className="mt-1 text-xs leading-5 text-secondary" data-testid="ai-brew-dose-range-hint">{copy.doseRangeHint}</p>
                        {isSwitchDripper && switchDoseOptions.length > 0 ? (
                          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" data-testid="ai-brew-dose-shortcuts">
                            {switchDoseOptions.map((dose) => {
                              const active = Math.round(Number.parseFloat(formState.doseG || '0')) === dose;
                              return (
                                <button
                                  key={dose}
                                  type="button"
                                  onClick={() => updateForm('doseG', String(dose))}
                                  className={`min-h-[36px] shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                                    active ? 'bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.18)]' : 'bg-surface-alpha text-secondary hover:text-primary'
                                  }`}
                                  data-testid={`ai-brew-dose-chip-${dose}`}
                                  aria-pressed={active}
                                  aria-label={`${copy.dose} ${dose} g`}
                                >
                                  {dose} g
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                      <div className="min-w-0 max-w-full">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.roast}</label>
                        <div className="ai-brew-choice-grid ai-brew-choice-grid--roast" data-testid="ai-brew-roast-grid">
                          {ROAST_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateForm('roastLevel', option.value as AiBrewFormState['roastLevel'])}
                              className={`min-w-0 rounded-xl px-3 py-2 text-xs font-medium transition-all ${formState.roastLevel === option.value ? 'bg-blue-600 text-white' : 'bg-surface-alpha text-secondary hover:text-primary'}`}
                            >
                              <span className="block truncate">{localizeAiBrewRoastLabel(option.value, language)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 max-w-full overflow-hidden rounded-[1.1rem] border panel-divider-subtle panel-soft p-3" data-testid="ai-brew-target-profile-panel">
                      <div className="mb-3 flex items-center gap-2">
                        <Target size={15} className="text-emerald-500" />
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.profileTitle}</h4>
                      </div>
                      <div className="ai-brew-choice-grid ai-brew-choice-grid--targets" data-testid="ai-brew-target-profile-grid">
                        {targetOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => updateForm('targetProfileId', option.id)}
                            className={`min-w-0 rounded-[0.9rem] border p-3 text-left transition-all ${formState.targetProfileId === option.id ? 'border-blue-500/25 bg-blue-500/10 shadow-[0_12px_26px_rgba(37,99,235,0.14)]' : 'border-[var(--panel-border-soft)] bg-surface-alpha hover:border-blue-500/20'}`}
                            data-testid={`ai-brew-target-profile-${option.id}`}
                            aria-pressed={formState.targetProfileId === option.id}
                          >
                            <p className="min-w-0 break-words text-sm font-semibold leading-5">{option.translatedLabel}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {isPro && (
                      <div
                        className="rounded-[1.1rem] border border-blue-500/18 bg-blue-500/[0.06] p-3"
                        data-testid="ai-brew-pro-bean-required"
                      >
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Coffee size={15} className="text-blue-500" />
                              <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">
                                {isIndonesianAiBrewLanguage(language) ? 'Bean Detail' : 'Bean Detail'}
                              </h4>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-secondary">
                              {isIndonesianAiBrewLanguage(language)
                                ? 'Wajib untuk Presisi: proses dan varietas membantu target rasa lebih tepat.'
                                : 'Required for Precision: process and variety help the taste target land better.'}
                            </p>
                          </div>
                          <span className="rounded-full bg-[var(--bg-base)] px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                            {selectedProcessLabel || copy.notSpecified} · {selectedVarietyLabel || copy.notSpecified}
                          </span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.process}</label>
                            <button
                              type="button"
                              onClick={(event) => openPicker('process', event.currentTarget)}
                              className="glass-input flex h-12 w-full items-center justify-between gap-3 px-4 text-left"
                              data-testid="ai-brew-process-picker"
                              aria-haspopup="dialog"
                              aria-expanded={pickerKind === 'process'}
                              aria-label={copy.openProcessPicker}
                            >
                              <span className="truncate">{selectedProcessLabel}</span>
                              <ArrowRight size={16} className="shrink-0 text-secondary" />
                            </button>
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.variety}</label>
                            <button
                              type="button"
                              onClick={(event) => openPicker('variety', event.currentTarget)}
                              className="glass-input flex h-12 w-full items-center justify-between gap-3 px-4 text-left"
                              data-testid="ai-brew-variety-picker"
                              aria-haspopup="dialog"
                              aria-expanded={pickerKind === 'variety'}
                              aria-label={copy.openVarietyPicker}
                            >
                              <span className="truncate">{selectedVarietyLabel}</span>
                              <ArrowRight size={16} className="shrink-0 text-secondary" />
                            </button>
                          </div>
                        </div>

                        {formState.process === CUSTOM_ENTRY_ID && (
                          <div className="mt-3">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.otherProcess}</label>
                            <input
                              name="ai-brew-process-custom"
                              type="text"
                              value={formState.customProcess}
                              onChange={(event) => updateForm('customProcess', event.target.value)}
                              aria-label={copy.otherProcess}
                              className="glass-input h-12 w-full px-4 text-base"
                              data-testid="ai-brew-process-custom"
                            />
                          </div>
                        )}

                        {formState.variety === CUSTOM_ENTRY_ID && (
                          <div className="mt-3">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.otherVariety}</label>
                            <input
                              name="ai-brew-variety-custom"
                              type="text"
                              value={formState.customVariety}
                              onChange={(event) => updateForm('customVariety', event.target.value)}
                              aria-label={copy.otherVariety}
                              className="glass-input h-12 w-full px-4 text-base"
                              data-testid="ai-brew-variety-custom"
                            />
                          </div>
                        )}

                        <div className="mt-3 rounded-[1rem] border panel-divider-subtle panel-soft p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h5 className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.beanProfileTitle}</h5>
                              <p className="mt-1 text-xs leading-5 text-secondary">{copy.beanProfileNeutral}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowBeanProfileEditor((prev) => !prev)}
                              className="min-h-[44px] rounded-xl bg-[var(--bg-base)] px-3 py-2 text-sm font-medium text-primary"
                              data-testid="ai-brew-bean-profile-toggle"
                              aria-expanded={showBeanProfileEditor}
                            >
                              {showBeanProfileEditor ? copy.beanProfileHide : copy.beanProfileShow}
                            </button>
                          </div>

                          {showBeanProfileEditor ? (
                            <div className="mt-4 space-y-3.5">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.altitudeMasl}</label>
                                  <input
                                    name="ai-brew-bean-altitude"
                                    type="number"
                                    min="0"
                                    max="3200"
                                    step="10"
                                    value={formState.altitudeMasl}
                                    onChange={(event) => updateForm('altitudeMasl', event.target.value)}
                                    className="glass-input h-12 w-full px-4 text-base"
                                    data-testid="ai-brew-bean-altitude"
                                  />
                                </div>
                                <div>
                                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.beanDensity}</label>
                                  <input
                                    name="ai-brew-bean-density"
                                    type="number"
                                    min="0.55"
                                    max="0.95"
                                    step="0.01"
                                    value={formState.beanDensityGml}
                                    onChange={(event) => updateForm('beanDensityGml', event.target.value)}
                                    className="glass-input h-12 w-full px-4 text-base"
                                    data-testid="ai-brew-bean-density"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.roastDevelopmentTitle}</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {ROAST_DEVELOPMENT_OPTIONS.map((option) => {
                                    const label = option.value === 'underdeveloped'
                                      ? copy.roastDevelopmentUnderdeveloped
                                      : option.value === 'balanced'
                                        ? copy.roastDevelopmentBalanced
                                        : copy.roastDevelopmentDeveloped;
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => updateForm('roastDevelopment', formState.roastDevelopment === option.value ? '' : option.value)}
                                        className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium transition-all ${formState.roastDevelopment === option.value ? 'bg-blue-600 text-white' : 'bg-surface-alpha text-secondary hover:text-primary'}`}
                                        data-testid={`ai-brew-bean-roast-${option.value}`}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.solubilityTitle}</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {SOLUBILITY_OPTIONS.map((option) => {
                                    const label = option.value === 'low'
                                      ? copy.solubilityLow
                                      : option.value === 'medium'
                                        ? copy.solubilityMedium
                                        : copy.solubilityHigh;
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => updateForm('solubility', formState.solubility === option.value ? '' : option.value)}
                                        className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-medium transition-all ${formState.solubility === option.value ? 'bg-blue-600 text-white' : 'bg-surface-alpha text-secondary hover:text-primary'}`}
                                        data-testid={`ai-brew-bean-solubility-${option.value}`}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="rounded-xl bg-[var(--bg-base)] px-3 py-3 text-sm text-secondary" data-testid="ai-brew-bean-profile-summary">
                                {(buildBeanProfileSummary(formState).replace(' masl', ' m').replace(' g/ml', ' density')) || copy.beanProfileNeutral}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 rounded-xl bg-[var(--bg-base)] px-3 py-3 text-sm text-secondary" data-testid="ai-brew-bean-profile-summary">
                              {buildBeanProfileSummary(formState) || copy.beanProfileNeutral}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-card p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Beaker size={16} className="text-amber-500" />
                    <h3 className="text-base font-semibold">{copy.equipmentTitle}</h3>
                  </div>
                  <div className="space-y-3.5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.dripper}</label>
                        <button
                          type="button"
                          onClick={(event) => openPicker('dripper', event.currentTarget)}
                          className="glass-input flex h-12 w-full items-center justify-between gap-3 px-4 text-left"
                          data-testid="ai-brew-dripper-picker"
                          aria-haspopup="dialog"
                          aria-expanded={pickerKind === 'dripper'}
                          aria-label={copy.openDripperPicker}
                        >
                          <span className="truncate">{selectedDripper?.name || copy.openPicker}</span>
                          <ArrowRight size={16} className="shrink-0 text-secondary" />
                        </button>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.grinder}</label>
                        <button
                          type="button"
                          onClick={(event) => openPicker('grinder', event.currentTarget)}
                          className="glass-input flex h-12 w-full items-center justify-between gap-3 px-4 text-left"
                          data-testid="ai-brew-grinder-picker"
                          aria-haspopup="dialog"
                          aria-expanded={pickerKind === 'grinder'}
                          aria-label={copy.openGrinderPicker}
                        >
                          <span className="truncate">{selectedGrinder?.name || copy.openPicker}</span>
                          <ArrowRight size={16} className="shrink-0 text-secondary" />
                        </button>
                      </div>
                    </div>
                    {brewModeAndMethodPanel}

                    <div className="rounded-[1.1rem] border panel-divider-subtle panel-soft p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <Droplets size={15} className="text-blue-500" />
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.waterSourceTitle}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-[1rem] panel-soft p-1.5">
                        <button
                          type="button"
                          onClick={() => setWaterMode('brand')}
                          className={`rounded-[0.9rem] px-4 py-2.5 text-sm font-medium transition-all ${formState.waterMode === 'brand' ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]' : 'text-secondary hover:text-primary'}`}
                          data-testid="ai-brew-water-mode-brand"
                        >
                          {copy.waterBrand}
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaterMode('manual')}
                          className={`rounded-[0.9rem] px-4 py-2.5 text-sm font-medium transition-all ${formState.waterMode === 'manual' ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]' : 'text-secondary hover:text-primary'}`}
                          data-testid="ai-brew-water-mode-manual"
                        >
                          {copy.waterManual}
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {formState.waterMode === 'brand' ? (
                          <div className="space-y-3">
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.waterBrandPicker}</label>
                              <button
                                type="button"
                                onClick={(event) => openPicker('water_brand', event.currentTarget)}
                                className="glass-input flex h-12 w-full items-center justify-between gap-3 px-4 text-left"
                                data-testid="ai-brew-water-picker"
                                aria-haspopup="dialog"
                                aria-expanded={pickerKind === 'water_brand'}
                                aria-label={copy.waterOpenBrandPicker}
                              >
                                <span className="truncate">{selectedWaterBrand?.shortLabel || copy.waterOpenBrandPicker}</span>
                                <ArrowRight size={16} className="shrink-0 text-secondary" />
                              </button>
                            </div>

                            {suggestedWaterBrands.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {suggestedWaterBrands.map((item) => {
                                  const active = selectedWaterBrand?.id === item.id;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => applyWaterBrandSelection(item.id)}
                                      className={`rounded-full px-3 py-2 text-xs font-medium transition-all ${active ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]' : 'bg-[var(--bg-base)] text-primary'}`}
                                    >
                                      {item.shortLabel}
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => setWaterMode('manual')}
                                  className="rounded-full bg-[var(--bg-base)] px-3 py-2 text-xs font-medium text-primary transition-all"
                                >
                                  {copy.waterManual}
                                </button>
                              </div>
                            )}

                            {selectedWaterBrand ? (
                              <div className="rounded-2xl bg-surface-alpha p-4" data-testid="ai-brew-water-summary">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-primary">{selectedWaterBrand.shortLabel}</p>
                                      <span className="rounded-full bg-[var(--bg-base)] px-2 py-1 text-[11px] font-medium text-secondary">
                                        {formatWaterReadinessStatus(copy, {
                                          classification: selectedWaterBrand.classification,
                                          presetStatus: selectedWaterBrand.presetStatus,
                                          isBrewReady: selectedWaterBrand.isBrewReady,
                                          mineralsReady,
                                          mineralDerivation: selectedWaterBrand.resolvedMinerals?.derivation,
                                        })}
                                      </span>
                                      {isEstimatedWaterBaseline(selectedWaterBrand) && (
                                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                          {copy.waterBrandEstimated}
                                        </span>
                                      )}
                                      <span className="rounded-full bg-[var(--bg-base)] px-2 py-1 text-[11px] font-medium text-secondary">
                                        {formatWaterDerivationLabel(copy, selectedWaterBrand.resolvedMinerals?.derivation)}
                                      </span>
                                      <span className="rounded-full bg-[var(--bg-base)] px-2 py-1 text-[11px] font-medium text-secondary">
                                      {localizeAiBrewWaterClassificationLabel(selectedWaterBrand.classificationLabel, language)}
                                      </span>
                                    </div>
                                    {isPro ? (
                                      <p className="mt-1 text-xs text-secondary">{buildWaterChemistryLabel(selectedWaterBrand, language)}</p>
                                    ) : (
                                      <p className="mt-1 text-xs text-secondary">
                                        {buildWaterChemistryLabel(selectedWaterBrand, language)}
                                      </p>
                                    )}
                                    {buildWaterPolicyWarning(copy, selectedWaterBrand) && (
                                      <p className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                                        {buildWaterPolicyWarning(copy, selectedWaterBrand)}
                                      </p>
                                    )}
                                    {!selectedWaterBrandCanAutofill && (
                                      <div className="mt-2 rounded-xl bg-[var(--bg-base)] px-3 py-2 text-xs text-secondary">
                                        <p className="font-semibold text-primary">{copy.waterWhyManualTitle}</p>
                                        <p className="mt-1">{copy.waterWhyManualBody}</p>
                                      </div>
                                    )}
                                    {isPro && waterTargetFitHint && (
                                      <div
                                        className={`mt-3 rounded-xl px-3 py-3 text-xs ${
                                          waterTargetFitHint.tone === 'caution'
                                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                        }`}
                                        data-testid="ai-brew-water-target-fit"
                                      >
                                        {waterTargetFitHint.text}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                                    {canCompleteWaterMinerals && (
                                      <button
                                        type="button"
                                        onClick={applyWaterMineralCompletion}
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]"
                                        data-testid="ai-brew-water-complete-minerals"
                                      >
                                        <SlidersHorizontal size={14} />
                                        {copy.waterCompleteMinerals}
                                      </button>
                                    )}
                                    {canToggleMineralEditor && (
                                      <button
                                        type="button"
                                        onClick={() => setShowMineralEditor((prev) => !prev)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-base)] px-3 py-2 text-sm font-medium text-primary"
                                        data-testid="ai-brew-water-toggle-minerals"
                                      >
                                        <SlidersHorizontal size={14} />
                                        {shouldShowMineralEditor ? copy.waterHideMinerals : copy.waterEditMinerals}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-2xl bg-surface-alpha px-4 py-4 text-sm text-secondary">
                                {copy.waterNoBrand}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-surface-alpha p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                              <FlaskConical size={15} className="text-sky-500" />
                              <span>{copy.waterSelectedManual}</span>
                            </div>
                          </div>
                        )}

                        {shouldShowMineralEditor && (
                          <div className="rounded-2xl border panel-divider-subtle bg-[var(--bg-base)]/78 p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <SlidersHorizontal size={15} className="text-blue-500" />
                              <h5 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.waterSummary}</h5>
                            </div>
                            {formState.waterMode === 'manual' && (
                              <div className="mb-3 flex flex-wrap gap-2" data-testid="ai-brew-water-manual-presets">
                                {[
                                  { id: 'ideal-filter', label: copy.waterPresetIdealFilter, tds: 90, hardness: 55, alkalinity: 40 },
                                  { id: 'high-buffer', label: copy.waterPresetHighBuffer, tds: 220, hardness: 120, alkalinity: 120 },
                                  { id: 'low-mineral', label: copy.waterPresetLowMineral, tds: 5, hardness: 2, alkalinity: 1 },
                                ].map((preset) => (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => applyManualWaterPreset({
                                      tds: preset.tds,
                                      hardness: preset.hardness,
                                      alkalinity: preset.alkalinity,
                                      note: preset.label,
                                    })}
                                    className="rounded-full bg-surface-alpha px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface-alpha-hover"
                                    data-testid={`ai-brew-water-preset-${preset.id}`}
                                  >
                                    {preset.label}: TDS {preset.tds} / GH {preset.hardness} / KH {preset.alkalinity}
                                  </button>
                                ))}
                              </div>
                            )}
                            {canCompleteWaterMinerals && selectedWaterCompletion && (
                              <div
                                className="mb-3 rounded-xl bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-200"
                                data-testid="ai-brew-water-complete-minerals-hint"
                              >
                                <p className="font-semibold text-primary">{copy.waterCompleteMineralsHint}</p>
                                <p className="mt-1">
                                  {selectedWaterCompletion.mode === 'remineralization_target'
                                    ? copy.waterCompleteMineralsRoNote
                                    : selectedWaterCompletion.mode === 'classification_baseline'
                                      ? copy.waterCompleteMineralsEstimatedNote
                                      : selectedWaterCompletion.note}
                                </p>
                              </div>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.tds}</label>
                                <input
                                  name="ai-brew-water-tds"
                                  type="number"
                                  min="0"
                                  max="600"
                                  step="1"
                                  value={formState.waterTdsPpm}
                                  onChange={(event) => updateForm('waterTdsPpm', event.target.value)}
                                  aria-label={copy.tds}
                                  className="glass-input h-12 w-full px-4 text-base"
                                  data-testid="ai-brew-water-tds"
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.hardness}</label>
                                <input
                                  name="ai-brew-water-hardness"
                                  type="number"
                                  min="0"
                                  max="500"
                                  step="1"
                                  value={formState.waterHardnessPpm}
                                  onChange={(event) => updateForm('waterHardnessPpm', event.target.value)}
                                  aria-label={copy.hardness}
                                  className="glass-input h-12 w-full px-4 text-base"
                                  data-testid="ai-brew-water-hardness"
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.alkalinity}</label>
                                <input
                                  name="ai-brew-water-alkalinity"
                                  type="number"
                                  min="0"
                                  max="400"
                                  step="1"
                                  value={formState.waterAlkalinityPpm}
                                  onChange={(event) => updateForm('waterAlkalinityPpm', event.target.value)}
                                  aria-label={copy.alkalinity}
                                  className="glass-input h-12 w-full px-4 text-base"
                                  data-testid="ai-brew-water-alkalinity"
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.waterNotes}</label>
                                <input
                                  name="ai-brew-water-notes"
                                  type="text"
                                  value={formState.waterNotes}
                                  onChange={(event) => updateForm('waterNotes', event.target.value)}
                                  placeholder={copy.waterNotesPlaceholder}
                                  className="glass-input h-12 w-full px-4 text-base"
                                  data-testid="ai-brew-water-notes"
                                />
                              </div>
                            </div>
                            {catalog && (
                              <div className="mt-3 rounded-xl bg-surface-alpha px-3 py-3 text-xs text-secondary">
                                <p className="font-semibold text-primary">{copy.waterGuidance}</p>
                                <p className="mt-1">
                                  TDS {catalog.waterGuidance.recommended.tdsPpm[0]}-{catalog.waterGuidance.recommended.tdsPpm[1]}
                                  {' - '}GH {catalog.waterGuidance.recommended.hardnessPpm[0]}-{catalog.waterGuidance.recommended.hardnessPpm[1]}
                                  {' - '}KH {catalog.waterGuidance.recommended.alkalinityPpm[0]}-{catalog.waterGuidance.recommended.alkalinityPpm[1]}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {isPro && (
                <div className="space-y-3" data-testid="ai-brew-pro-advanced-sections">
                  <ProBuilderAccordion
                    sectionId="recipe"
                    activeSection={activeProSection}
                    onActiveSectionChange={setActiveProSection}
                    title={isIndonesianAiBrewLanguage(language) ? 'Resep Utama' : 'Core Recipe'}
                    summary={`${copy.finalRatio} ${formState.targetRatio || 'auto'} - ${copy.temp} ${formState.targetTempC || 'auto'} - ${copy.totalWater} ${formState.targetWaterMl || 'auto'}`}
                    icon={<Gauge size={15} />}
                  >
                    <div className="rounded-[1.1rem] border panel-divider-subtle panel-soft p-3">
                      <div className="flex flex-col gap-1">
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.precisionControlTitle}</h4>
                        <p className="text-xs leading-5 text-secondary">{copy.precisionControlHint}</p>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.targetRatio}</label>
                          <input
                            name="ai-brew-target-ratio"
                            type="number"
                            min="13"
                            max="17"
                            step="0.1"
                            inputMode="decimal"
                            value={formState.targetRatio}
                            onChange={(event) => updateForm('targetRatio', event.target.value)}
                            placeholder={copy.targetRatioPlaceholder}
                            aria-label={copy.targetRatio}
                            className="glass-input h-12 w-full px-4 text-base"
                            data-testid="ai-brew-target-ratio"
                          />
                          <p className="mt-1 text-xs leading-5 text-secondary" data-testid="ai-brew-target-ratio-hint">{copy.targetRatioHint}</p>
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.targetWaterMl}</label>
                          <input
                            name="ai-brew-target-water"
                            type="number"
                            min="15"
                            max="2500"
                            step="5"
                            inputMode="numeric"
                            value={formState.targetWaterMl}
                            onChange={(event) => updateForm('targetWaterMl', event.target.value)}
                            placeholder={copy.targetWaterMlPlaceholder}
                            aria-label={copy.targetWaterMl}
                            className="glass-input h-12 w-full px-4 text-base"
                            data-testid="ai-brew-target-water"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.targetTempC}</label>
                          <input
                            name="ai-brew-target-temp"
                            type="number"
                            min="4"
                            max="98"
                            step="1"
                            inputMode="numeric"
                            value={formState.targetTempC}
                            onChange={(event) => updateForm('targetTempC', event.target.value)}
                            placeholder={copy.targetTempCPlaceholder}
                            aria-label={copy.targetTempC}
                            className="glass-input h-12 w-full px-4 text-base"
                            data-testid="ai-brew-target-temp"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      {pourControlPanel}
                    </div>
                  </ProBuilderAccordion>

                  <ProBuilderAccordion
                    sectionId="water"
                    activeSection={activeProSection}
                    onActiveSectionChange={setActiveProSection}
                    title={copy.waterSourceTitle}
                    summary={formState.waterMode === 'manual' ? copy.waterSelectedManual : (selectedWaterBrand?.shortLabel || copy.waterBrand)}
                    icon={<Droplets size={15} />}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                        <p className="font-semibold text-primary">{formState.waterMode === 'manual' ? copy.waterSelectedManual : (selectedWaterBrand?.shortLabel || copy.waterBrand)}</p>
                        <p className="mt-1">TDS {formState.waterTdsPpm || '-'} - GH {formState.waterHardnessPpm || '-'} - KH {formState.waterAlkalinityPpm || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                        <p className="font-semibold text-primary">{copy.waterGuidance}</p>
                        <p className="mt-1">{waterTargetFitHint?.text || (isIndonesianAiBrewLanguage(language) ? 'Buka kartu air di atas jika perlu edit mineral.' : 'Use the water card above to edit minerals when needed.')}</p>
                      </div>
                    </div>
                  </ProBuilderAccordion>

                  <ProBuilderAccordion
                    sectionId="grinder"
                    activeSection={activeProSection}
                    onActiveSectionChange={setActiveProSection}
                    title={copy.grinder}
                    summary={`${selectedGrinder?.name || copy.notSpecified} - ${selectedGrinder?.verificationLevel || 'curated'}`}
                    icon={<SlidersHorizontal size={15} />}
                  >
                    <div className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                      <p className="font-semibold text-primary">{selectedGrinder?.name || copy.notSpecified}</p>
                      <p className="mt-1">{selectedGrinder?.verificationLevel ? formatGrinderReferenceLabel(copy, selectedGrinder.verificationLevel) : copy.grindCuratedReference}</p>
                      <p className="mt-2 text-xs">{copy.grindCalibrationNote}</p>
                    </div>
                  </ProBuilderAccordion>

                  <ProBuilderAccordion
                    sectionId="method"
                    activeSection={activeProSection}
                    onActiveSectionChange={setActiveProSection}
                    title={isIndonesianAiBrewLanguage(language) ? 'Detail metode' : 'Method detail'}
                    summary={isSwitchDripper ? `${selectedSwitchSizeLabel} - ${selectedSwitchPresetLabel}` : `${selectedDripper?.name || copy.notSpecified} - ${resolveModeLabel(copy, formState.brewMode, selectedDripper?.methodFamily)}`}
                    icon={<Waves size={15} />}
                  >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-tertiary">{copy.dripper}</p>
                        <p className="mt-1 font-semibold text-primary">{selectedDripper?.name || copy.notSpecified}</p>
                      </div>
                      <div className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-tertiary">
                          {isIndonesianAiBrewLanguage(language) ? 'Mode' : 'Mode'}
                        </p>
                        <p className="mt-1 font-semibold text-primary">{resolveModeLabel(copy, formState.brewMode, selectedDripper?.methodFamily)}</p>
                      </div>
                      <div className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-tertiary">{copy.switchPresetTitle}</p>
                        <p className="mt-1 font-semibold text-primary">{isSwitchDripper ? selectedSwitchPresetLabel : (selectedDripper?.methodFamily || copy.notSpecified)}</p>
                      </div>
                      <div className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-tertiary">{copy.switchSafety}</p>
                        <p className="mt-1 font-semibold text-primary">{isSwitchDripper ? switchSafetyLabel : (selectedDripperSupportsIced ? 'OK' : (isIndonesianAiBrewLanguage(language) ? 'Panas saja' : 'Hot only'))}</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl bg-[var(--bg-base)] px-3 py-3 text-xs leading-5 text-secondary">
                      {isSwitchDripper ? (
                        <>
                          <p><span className="font-semibold text-primary">{copy.switchValvePath}:</span> {switchValvePathLabel}</p>
                          <p className="mt-1"><span className="font-semibold text-primary">{copy.switchWhyPreset}:</span> {selectedSwitchPreset?.why || (isIndonesianAiBrewLanguage(language) ? 'Auto mengikuti Profil Target, ukuran alat, dan dosis.' : 'Auto follows the taste target, brewer size, and dose.')}</p>
                          <p className="mt-1"><span className="font-semibold text-primary">{copy.switchWatch}:</span> {switchSafetyMessage}</p>
                        </>
                      ) : (
                        <p>
                          {isIndonesianAiBrewLanguage(language)
                            ? 'Kontrol metode utama ada langsung setelah alat seduh. Detail ini hanya ringkasan agar layar tetap bersih.'
                            : 'Primary method controls live right after the brewer. This section stays as a clean summary.'}
                        </p>
                      )}
                    </div>
                  </ProBuilderAccordion>

                  <ProBuilderAccordion
                    sectionId="confidence"
                    activeSection={activeProSection}
                    onActiveSectionChange={setActiveProSection}
                    title={isIndonesianAiBrewLanguage(language) ? 'Keyakinan & Sumber' : 'Confidence & Source'}
                    summary={isIndonesianAiBrewLanguage(language) ? 'Prediksi rasa, bukan jaminan.' : 'Taste prediction, not a guarantee.'}
                    icon={<Info size={15} />}
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                        <p className="font-semibold text-primary">{copy.dripper}</p>
                        <p className="mt-1">{selectedDripper?.methodFamily || copy.notSpecified}</p>
                      </div>
                      <div className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                        <p className="font-semibold text-primary">{copy.waterSourceTitle}</p>
                        <p className="mt-1">{formState.waterMode === 'manual' ? copy.waterDerivationManual : (selectedWaterBrand?.verificationLevel || copy.waterStatusEstimated)}</p>
                      </div>
                      <div className="rounded-xl bg-surface-alpha px-3 py-3 text-sm text-secondary">
                        <p className="font-semibold text-primary">{copy.grinder}</p>
                        <p className="mt-1">{selectedGrinder?.verificationLevel || copy.grindCuratedReference}</p>
                      </div>
                    </div>
                  </ProBuilderAccordion>
                </div>
              )}

              {!isPro && (
              <div className="glass-card p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <SlidersHorizontal size={16} className="mt-0.5 shrink-0 text-blue-500" />
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">
                        {isPro ? copy.proDetails : copy.beanDetailsOptional}
                      </h3>
                      {!isPro && (
                        <p className="mt-1 text-xs leading-5 text-secondary">{copy.beanDetailsHint}</p>
                      )}
                    </div>
                  </div>
                  {!isPro && (
                    <button
                      type="button"
                      onClick={() => setShowQuickBeanDetails((prev) => !prev)}
                      className="min-h-[44px] rounded-xl bg-[var(--bg-base)] px-3 py-2 text-sm font-semibold text-primary"
                      data-testid="ai-brew-bean-details-toggle"
                      aria-expanded={showQuickBeanDetails}
                    >
                      {showQuickBeanDetails ? copy.beanDetailsHide : copy.beanDetailsAdd}
                    </button>
                  )}
                </div>
                {!showBeanDetailsControls ? (
                  <div className="rounded-[1.1rem] border panel-divider-subtle bg-[var(--bg-base)]/78 px-3 py-3 text-sm text-secondary" data-testid="ai-brew-bean-details-summary">
                    <span className="font-semibold text-primary">{copy.quickSummaryAuto}</span>{' '}
                    {copy.process}: {selectedProcessLabel || copy.notSpecified}; {copy.variety}: {selectedVarietyLabel || copy.notSpecified}.
                  </div>
                ) : (
                <div className={`grid gap-4 ${isPro ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]' : ''}`}>
                    <div className="space-y-3.5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.process}</label>
                          <button
                            type="button"
                            onClick={(event) => openPicker('process', event.currentTarget)}
                            className="glass-input flex h-12 w-full items-center justify-between gap-3 px-4 text-left"
                            data-testid="ai-brew-process-picker"
                            aria-haspopup="dialog"
                            aria-expanded={pickerKind === 'process'}
                            aria-label={copy.openProcessPicker}
                          >
                            <span className="truncate">{selectedProcessLabel}</span>
                            <ArrowRight size={16} className="shrink-0 text-secondary" />
                          </button>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.variety}</label>
                          <button
                            type="button"
                            onClick={(event) => openPicker('variety', event.currentTarget)}
                            className="glass-input flex h-12 w-full items-center justify-between gap-3 px-4 text-left"
                            data-testid="ai-brew-variety-picker"
                            aria-haspopup="dialog"
                            aria-expanded={pickerKind === 'variety'}
                            aria-label={copy.openVarietyPicker}
                          >
                            <span className="truncate">{selectedVarietyLabel}</span>
                            <ArrowRight size={16} className="shrink-0 text-secondary" />
                          </button>
                        </div>
                      </div>

                      {formState.process === CUSTOM_ENTRY_ID && (
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.otherProcess}</label>
                          <input
                            name="ai-brew-process-custom"
                            type="text"
                            value={formState.customProcess}
                            onChange={(event) => updateForm('customProcess', event.target.value)}
                            aria-label={copy.otherProcess}
                            className="glass-input h-12 w-full px-4 text-base"
                            data-testid="ai-brew-process-custom"
                          />
                        </div>
                      )}

                      {formState.variety === CUSTOM_ENTRY_ID && (
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.otherVariety}</label>
                          <input
                            name="ai-brew-variety-custom"
                            type="text"
                            value={formState.customVariety}
                            onChange={(event) => updateForm('customVariety', event.target.value)}
                            aria-label={copy.otherVariety}
                            className="glass-input h-12 w-full px-4 text-base"
                            data-testid="ai-brew-variety-custom"
                          />
                        </div>
                      )}

                      {isPro && (
                        <>
                          <div className="rounded-[1.1rem] border panel-divider-subtle panel-soft p-3">
                            <div className="flex flex-col gap-1">
                              <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.precisionControlTitle}</h4>
                              <p className="text-xs leading-5 text-secondary">{copy.precisionControlHint}</p>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                              <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.targetRatio}</label>
                                <input
                                  name="ai-brew-target-ratio"
                                  type="number"
                                  min="13"
                                  max="17"
                                  step="0.1"
                                  inputMode="decimal"
                                  value={formState.targetRatio}
                                  onChange={(event) => updateForm('targetRatio', event.target.value)}
                                  placeholder={copy.targetRatioPlaceholder}
                                  aria-label={copy.targetRatio}
                                  className="glass-input h-12 w-full px-4 text-base"
                                  data-testid="ai-brew-target-ratio"
                                />
                                <p className="mt-1 text-xs leading-5 text-secondary" data-testid="ai-brew-target-ratio-hint">{copy.targetRatioHint}</p>
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.targetWaterMl}</label>
                                <input
                                  name="ai-brew-target-water"
                                  type="number"
                                  min="15"
                                  max="2500"
                                  step="5"
                                  inputMode="numeric"
                                  value={formState.targetWaterMl}
                                  onChange={(event) => updateForm('targetWaterMl', event.target.value)}
                                  placeholder={copy.targetWaterMlPlaceholder}
                                  aria-label={copy.targetWaterMl}
                                  className="glass-input h-12 w-full px-4 text-base"
                                  data-testid="ai-brew-target-water"
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.targetTempC}</label>
                                <input
                                  name="ai-brew-target-temp"
                                  type="number"
                                  min="4"
                                  max="98"
                                  step="1"
                                  inputMode="numeric"
                                  value={formState.targetTempC}
                                  onChange={(event) => updateForm('targetTempC', event.target.value)}
                                  placeholder={copy.targetTempCPlaceholder}
                                  aria-label={copy.targetTempC}
                                  className="glass-input h-12 w-full px-4 text-base"
                                  data-testid="ai-brew-target-temp"
                                />
                              </div>
                            </div>
                          </div>

                          {pourControlPanel}
                          {methodOptionPanel}

                          <div className="rounded-[1.1rem] border panel-divider-subtle panel-soft p-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.beanProfileTitle}</h4>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowBeanProfileEditor((prev) => !prev)}
                                className="rounded-xl bg-[var(--bg-base)] px-3 py-2 text-sm font-medium text-primary"
                                data-testid="ai-brew-bean-profile-toggle"
                              >
                                {showBeanProfileEditor ? copy.beanProfileHide : copy.beanProfileShow}
                              </button>
                            </div>

                            {showBeanProfileEditor ? (
                              <div className="mt-4 space-y-3.5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.altitudeMasl}</label>
                                    <input
                                      name="ai-brew-bean-altitude"
                                      type="number"
                                      min="0"
                                      max="3200"
                                      step="10"
                                      value={formState.altitudeMasl}
                                      onChange={(event) => updateForm('altitudeMasl', event.target.value)}
                                      className="glass-input h-12 w-full px-4 text-base"
                                      data-testid="ai-brew-bean-altitude"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.beanDensity}</label>
                                    <input
                                      name="ai-brew-bean-density"
                                      type="number"
                                      min="0.55"
                                      max="0.95"
                                      step="0.01"
                                      value={formState.beanDensityGml}
                                      onChange={(event) => updateForm('beanDensityGml', event.target.value)}
                                      className="glass-input h-12 w-full px-4 text-base"
                                      data-testid="ai-brew-bean-density"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.roastDevelopmentTitle}</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {ROAST_DEVELOPMENT_OPTIONS.map((option) => {
                                      const label = option.value === 'underdeveloped'
                                        ? copy.roastDevelopmentUnderdeveloped
                                        : option.value === 'balanced'
                                          ? copy.roastDevelopmentBalanced
                                          : copy.roastDevelopmentDeveloped;
                                      return (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() => updateForm('roastDevelopment', formState.roastDevelopment === option.value ? '' : option.value)}
                                          className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${formState.roastDevelopment === option.value ? 'bg-blue-600 text-white' : 'bg-surface-alpha text-secondary hover:text-primary'}`}
                                          data-testid={`ai-brew-bean-roast-${option.value}`}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.solubilityTitle}</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {SOLUBILITY_OPTIONS.map((option) => {
                                      const label = option.value === 'low'
                                        ? copy.solubilityLow
                                        : option.value === 'medium'
                                          ? copy.solubilityMedium
                                          : copy.solubilityHigh;
                                      return (
                                        <button
                                          key={option.value}
                                          type="button"
                                          onClick={() => updateForm('solubility', formState.solubility === option.value ? '' : option.value)}
                                          className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${formState.solubility === option.value ? 'bg-blue-600 text-white' : 'bg-surface-alpha text-secondary hover:text-primary'}`}
                                          data-testid={`ai-brew-bean-solubility-${option.value}`}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="rounded-xl bg-[var(--bg-base)] px-3 py-3 text-sm text-secondary" data-testid="ai-brew-bean-profile-summary">
                                  {(buildBeanProfileSummary(formState)
                                    .replace(' masl', ' m')
                                    .replace(' g/ml', ' density')
                                  ) || copy.beanProfileNeutral}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4 rounded-xl bg-[var(--bg-base)] px-3 py-3 text-sm text-secondary" data-testid="ai-brew-bean-profile-summary">
                                {buildBeanProfileSummary(formState) || copy.beanProfileNeutral}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                    </div>
                  </div>
                )}
                </div>
              )}

            </div>
          </div>
          <div
            className="shrink-0 max-w-full overflow-hidden border-t panel-divider-subtle bg-[var(--bg-base)] px-3 py-3 lg:px-6 lg:py-4"
            style={{ paddingBottom: 'calc(12px + var(--bottom-safe-capped, 0px))' }}
            data-testid="ai-brew-builder-footer"
          >
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2.5" data-testid="ai-brew-mobile-generate-bar">
              <button
                type="button"
                onClick={() => { void handleGeneratePlan(); }}
                disabled={!catalog || generationBusy || !waterReadyForGeneration}
                className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(37,99,235,0.24)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-55 sm:min-w-[10rem] sm:flex-none"
                data-testid="ai-brew-generate"
              >
                {generationBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{generationBusy ? copy.generating : copy.generate}</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-12 items-center justify-center rounded-xl glass-button px-5 text-sm font-medium"
              >
                {copy.reset}
              </button>
              {!waterReadyForGeneration && (
                <div className="w-full rounded-xl bg-[var(--bg-base)] px-3 py-2.5 text-xs text-secondary sm:w-auto">
                  {copy.waterRequired}
                </div>
              )}
            </div>
          </div>
          {renderGenerationOverlay()}
        </div>
      </FocusLockedDialog>
    );
  }

  return (
    <div className="ai-brew-compact-shell space-y-5 pb-28 lg:pb-0" data-testid="ai-brew-panel">
      {aiAccessGateModal}
      <div aria-hidden={activeBuilderModal !== null || resultOpen} className="mx-auto max-w-4xl space-y-5">
        <div className="glass-card p-5 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-blue-500/10 text-blue-500 shadow-inner">
              <Sparkles size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-semibold tracking-tight">{copy.title}</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => openBuilder('quick')}
                disabled={!catalog}
                className="rounded-[1.4rem] border border-blue-500/15 bg-blue-500/5 p-4 text-left transition-all hover:border-blue-500/35 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="ai-brew-open-quick"
              >
                <div className="text-base font-semibold text-primary">{copy.quickMode}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                  <Sparkles size={12} />
                  {copy.aiEngineLocalValidated}
                </div>
              </button>
              <button
                type="button"
                onClick={() => openBuilder('pro')}
                disabled={!catalog}
                className="rounded-[1.4rem] border border-blue-500/15 bg-blue-500/5 p-4 text-left transition-all hover:border-blue-500/35 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="ai-brew-open-pro"
              >
                <div className="text-base font-semibold text-primary">{copy.proMode}</div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-300">
                  <Brain size={12} />
                  {copy.aiEnginePrecisionPlanner}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 lg:p-5" data-testid="ai-brew-history-strip">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.latestPlan} / {copy.favorites} / {copy.recent}</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-[1rem] panel-soft p-1.5">
              <button
                type="button"
                onClick={() => setHistoryStripTab('latest')}
                className={`rounded-[0.9rem] px-3 py-2 text-sm font-medium transition-all ${historyStripTab === 'latest' ? 'shadow-[0_10px_24px_rgba(37,99,235,0.12)]' : 'text-secondary hover:text-primary'}`}
                style={historyStripTab === 'latest' ? { backgroundColor: '#dbeafe', color: '#172554' } : undefined}
                data-testid="ai-brew-history-tab-latest"
              >
                {copy.latestPlan}
              </button>
              <button
                type="button"
                onClick={() => setHistoryStripTab('favorites')}
                className={`rounded-[0.9rem] px-3 py-2 text-sm font-medium transition-all ${historyStripTab === 'favorites' ? 'shadow-[0_10px_24px_rgba(37,99,235,0.12)]' : 'text-secondary hover:text-primary'}`}
                style={historyStripTab === 'favorites' ? { backgroundColor: '#dbeafe', color: '#172554' } : undefined}
                data-testid="ai-brew-history-tab-favorites"
              >
                {copy.favorites}
              </button>
              <button
                type="button"
                onClick={() => setHistoryStripTab('recent')}
                className={`rounded-[0.9rem] px-3 py-2 text-sm font-medium transition-all ${historyStripTab === 'recent' ? 'shadow-[0_10px_24px_rgba(37,99,235,0.12)]' : 'text-secondary hover:text-primary'}`}
                style={historyStripTab === 'recent' ? { backgroundColor: '#dbeafe', color: '#172554' } : undefined}
                data-testid="ai-brew-history-tab-recent"
              >
                {copy.recent}
              </button>
            </div>
          </div>

          <div className="mt-4">
            {historyStripTab === 'latest' ? (
              plan ? (
                <div className="flex flex-col gap-3 rounded-[1.35rem] border panel-divider-subtle panel-soft p-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">{buildLocalizedPlanRecipeName(plan, language)}</p>
                    <p className="mt-1 text-xs text-secondary">{localizedSummary}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-surface-alpha px-2 py-1 text-[11px] font-medium text-secondary">
                    {resolveModeLabel(copy, plan.brewMode, plan.methodFamily)}
                      </span>
                      <span className="rounded-full bg-surface-alpha px-2 py-1 text-[11px] font-medium text-secondary">
                        {plan.dripper.name}
                      </span>
                      <span className="rounded-full bg-surface-alpha px-2 py-1 text-[11px] font-medium text-secondary">
                        {localizedTargetProfileLabel}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResultOpen(true)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(37,99,235,0.24)]"
                    data-testid="ai-brew-open-result"
                  >
                    <ArrowRight size={16} />
                    {copy.openPlan}
                  </button>
                </div>
              ) : (
                <div
                  className="rounded-[1.35rem] border panel-divider-subtle panel-soft p-4 text-sm text-secondary"
                  role={catalogLoading ? 'status' : undefined}
                  aria-live={catalogLoading ? 'polite' : undefined}
                  aria-atomic={catalogLoading ? 'true' : undefined}
                >
                  {catalogLoading ? copy.loadingCatalog : copy.emptyPlan}
                </div>
              )
            ) : historyStripTab === 'favorites' ? (
              presets.length === 0 ? (
                <p className="rounded-[1.35rem] border panel-divider-subtle panel-soft p-4 text-sm text-secondary">{copy.emptyFavorites}</p>
              ) : (
                <div className="space-y-2">
                  {presets.slice(0, 3).map((preset, index) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => hydrateFromPlan(preset.plan)}
                      className="flex w-full items-start justify-between gap-3 rounded-2xl bg-surface-alpha px-3 py-3 text-left transition-colors hover:bg-surface-alpha-hover"
                      aria-label={`${copy.loadFavorite}: ${preset.title}`}
                      data-testid={`ai-brew-history-load-favorite-${index}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-primary">{preset.title}</p>
                        <p className="mt-1 text-xs text-secondary">{preset.plan.dripper.name} - {localizeAiBrewTargetProfile(preset.plan.targetProfileId, preset.plan.targetProfileLabel, language)}</p>
                      </div>
                      <span className="rounded-xl bg-[var(--bg-base)] px-2 py-1 text-[11px] font-medium text-secondary">{copy.load}</span>
                    </button>
                  ))}
                </div>
              )
            ) : journalEntries.length === 0 ? (
              <p className="rounded-[1.35rem] border panel-divider-subtle panel-soft p-4 text-sm text-secondary">{copy.emptyRecent}</p>
            ) : (
              <div className="space-y-2">
                {journalEntries.slice(0, 3).map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => hydrateFromJournalEntry(entry)}
                    className="flex w-full items-start justify-between gap-3 rounded-2xl bg-surface-alpha px-3 py-3 text-left transition-colors hover:bg-surface-alpha-hover"
                    data-testid={index === 0 ? 'ai-brew-history-item' : `ai-brew-history-item-${index}`}
                    aria-label={`${copy.loadRecent}: ${entry.title}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary">{entry.title}</p>
                      <p className="mt-1 text-xs text-secondary">{resolveModeLabel(copy, entry.plan.brewMode, entry.plan.methodFamily)} - {entry.plan.dripper.name}</p>
                      {entry.feedback && (
                        <p className="mt-2 inline-flex rounded-full bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                          {formatBrewFeedbackRating(copy, entry.feedback.rating)}
                        </p>
                      )}
                    </div>
                    <span className="rounded-xl bg-[var(--bg-base)] px-2 py-1 text-[11px] font-medium text-secondary">{copy.load}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {renderFeedback(false)}
      </div>

      {renderBuilderDialog('quick')}
      {renderBuilderDialog('pro')}

      {pickerKind && (
        <MasterPickerDialog
          open={pickerKind !== null}
          kind={pickerKind}
          title={pickerTitle}
          ariaLabel={pickerKind === 'dripper' ? 'Dripper' : pickerTitle}
          closeLabel={copy.pickerClose}
          searchLabel={copy.pickerSearchLabel}
          description={copy.pickerHelp}
          language={language}
          searchPlaceholder={copy.pickerSearch}
          emptyText={copy.noPickerResults}
          items={pickerOptions}
          restoreFocusTarget={pickerRestoreFocusTarget}
          onClose={() => {
            const restoreTarget = pickerRestoreFocusTarget;
            setPickerKind(null);
            scheduleFocusRestore(restoreTarget);
            window.setTimeout(() => {
              setPickerRestoreFocusTarget((current) => (current === restoreTarget ? null : current));
            }, 180);
          }}
          onSelect={(id) => {
            if (pickerKind === 'process') updateForm('process', id === OMITTED_ENTRY_ID ? '' : id);
            if (pickerKind === 'variety') updateForm('variety', id === OMITTED_ENTRY_ID ? '' : id);
            if (pickerKind === 'grinder') updateForm('grinderId', id);
            if (pickerKind === 'dripper') updateForm('dripperId', id);
            if (pickerKind === 'water_brand') applyWaterBrandSelection(id);
          }}
        />
      )}

      <PlanResultDialog
        open={resultOpen}
        language={language}
        copy={copy}
        resultMode={resultMode}
        plan={plan}
        targetComparePlans={targetComparePlans}
        currentPreset={currentPreset}
        aiCoachDisabled={aiCoachDisabled}
        aiCoachReason={aiCoachReason}
        aiBusy={aiBusy}
        aiResponse={aiResponse}
        aiError={aiError}
        saving={saving}
        saveSuccess={saveSuccess}
        saveError={saveError}
        feedback={activeFeedback}
        feedbackNoteDraft={feedbackNoteDraft}
        showProvenance={showProvenance}
        isAuthenticated={isAuthenticated}
        isOffline={isOffline}
        onClose={() => {
          clearSaveFeedback();
          setResultOpen(false);
        }}
        onEditInputs={handleEditInputs}
        onUseInTimer={onUseInTimer}
        onUseInRatio={onUseInRatio}
        onSaveRecipe={() => { void handleSaveRecipe(); }}
        onToggleFavorite={() => { void handleToggleFavorite(); }}
        onFeedbackNoteChange={setFeedbackNoteDraft}
        onSaveFeedback={(rating) => { void handleSaveTasteFeedback(rating); }}
        onRunAiCoach={(mode) => { void runAiCoach(mode); }}
        onOpenAuth={() => openAuthModal({ source: 'ai_brew' })}
      />
    </div>
  );
}




























