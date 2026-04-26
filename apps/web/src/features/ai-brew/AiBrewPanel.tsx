import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Markdown from 'react-markdown';
import {
  ArrowRight,
  Beaker,
  Bookmark,
  BookmarkCheck,
  Brain,
  Check,
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
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useRuntimeDisplayMode } from '../../hooks/useRuntimeDisplayMode';
import { raceChatResponse, deepThinkingResponseDetailed } from '../../services/gemini';
import { createRecipeCollectionItem, saveCollectionItem, saveRecipe } from '../../services/storageService';
import type { Recipe } from '../../types';
import {
  buildAdjustPrompt,
  buildExplainPrompt,
  buildSequenceGuidePrompt,
  buildTroubleshootPrompt,
} from './prompts';
import { buildDeterministicAiCoachMarkdown } from './coachNotes';
import {
  composeHybridSequenceOverlay,
  extractSequenceOverlayFromMarkdown,
} from './aiComposer';
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
  buildAiBrewPlanProgressively,
  buildLocalizedPlanRecipeDescription,
  buildLocalizedPlanRecipeName,
  buildLocalizedPlanRecipeSteps,
  buildPlanRecipeIngredients,
  buildPlanRecipeMetadata,
  createDefaultAiBrewFormState,
  loadPlanIntoForm,
  resolveDeviceProfileSelection,
  resolveGrinderSettingReference,
  sanitizeAiBrewFormState,
  type AiBrewGenerationProgress,
  type AiBrewGenerationStageId,
} from './planner';
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
} from './storage';
import { loadAiBrewCatalog } from './catalog';
import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewJournalEntry,
  BrewPlan,
  BrewPreset,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  VarietyCatalogEntry,
  VerificationLevel,
  WaterBrandProfile,
  WaterMode,
  WaterPresetStatus,
} from './types';

const CUSTOM_ENTRY_ID = 'custom';
const OMITTED_ENTRY_ID = '__omitted__';
const COPY = {
  en: {
    title: 'AI Brew',
    subtitle: 'Clean manual brew planner.',
    coffeeTitle: 'Coffee Context',
    equipmentTitle: 'Peralatan',
    waterTitle: 'Water Minerals',
    waterSourceTitle: 'Water Source',
    waterBrand: 'Merek',
    waterManual: 'Manual',
    waterBrandPicker: 'Water',
    waterQuickPicks: 'Suggested',
    waterQuickPicksDescription: '',
    quickMode: 'Cepat',
    proMode: 'Presisi',
    quickModeDescription: 'Fast default recipe builder for a reliable first cup.',
    proModeDescription: '',
    quickModeTrustHint: 'Best for speed and consistency. If bean profile and water stay neutral, Quick and Pro can land on the same plan.',
    proModeTrustHint: '',
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
    grindVerified: 'Verified grind reference',
    grindFallback: 'Grind fallback',
    profileExactStatus: 'Exact device profile',
    profileFallbackStatus: 'Family fallback profile',
    processOptionalNote: 'Process is optional. No automatic process modifier will be applied.',
    varietyOptionalNote: 'Variety is optional. No automatic variety modifier will be applied.',
    profileTitle: 'Target Profile',
    modeHot: 'Hot Brew',
    modeIced: 'Ice Brew',
    coffeeName: 'Coffee / origin',
    coffeeNamePlaceholder: 'e.g. Ethiopia Chelbesa, Gayo Washed, House Filter',
    dose: 'Dose (g)',
    process: 'Process',
    variety: 'Variety',
    roast: 'Roast level',
    dripper: 'Dripper',
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
    waterSelectedManual: 'Manual mineral input',
    waterNoBrand: 'Choose water.',
    waterBrandNeedsManual: 'Add minerals before brew.',
    waterBrandPartialFilled: 'Complete missing minerals.',
    waterBrandEstimated: 'Estimate',
    waterBrandEstimatedNote: '',
    waterBrandAutofilled: 'Minerals loaded from the selected brand profile.',
    waterBrandCustomized: 'Brand minerals were adjusted manually for this brew.',
    waterEditMinerals: 'Edit minerals',
    waterHideMinerals: 'Hide minerals',
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
    generating: 'Generating plan',
    reset: 'Reset',
    recent: 'Recent Brews',
    favorites: 'Favorites',
    latestPlan: 'Planned Output',
    openPlan: 'Open result',
    emptyRecent: 'Generate a brew plan to start building a local journal.',
    emptyFavorites: 'Favorite a plan to pin it here.',
    emptyPlan: 'Complete the form and generate a plan to open the focus workspace.',
    summaryTitle: 'Result',
    totalWater: 'Total Water',
    cupOutput: 'Estimated Cup Output',
    hotWater: 'Hot Water',
    ice: 'Ice',
    temp: 'Temperature',
    time: 'Brew Time',
    grind: 'Grind',
    recipe: 'Brew Sequence',
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
    saved: 'Saved',
    favorite: 'Favorite',
    unfavorite: 'Unfavorite',
    aiCoach: 'AI Coach',
    aiFinisher: 'Extraction Finisher',
    explain: 'Explain Plan',
    troubleshoot: 'Fix Taste',
    adjust: 'Push Target',
    aiSop: 'Standardize SOP',
    aiGenerateBrief: 'AI Assist',
    aiSequenceGuide: 'AI Notes',
    aiGenerateLoading: 'Updating concise AI notes...',
    updateNotes: 'Refresh Notes',
    updatingNotes: 'Refreshing Notes',
    aiNotesManualHint: 'Refresh the short AI brief when needed.',
    aiNotesUpdated: 'AI Notes updated.',
    finisherCard: 'Extraction Finisher',
    finisherReasoning: 'Final Read',
    finisherControlPoints: 'Watch',
    finisherFallbackAdjustments: 'Taste Rescue',
    finisherAiTitle: 'AI',
    finisherAiEmpty: 'Run AI if you want more detail.',
    finisherAiGuest: 'Sign in to use AI.',
    finisherAiOffline: 'AI unavailable offline.',
    finisherAiLoading: 'AI is working...',
    finisherTasteSour: 'Sour',
    finisherTasteBitter: 'Bitter',
    finisherTasteThin: 'Thin',
    finisherRefresh: 'Refresh AI',
    aiBusy: 'Reviewing this brew plan...',
    aiOffline: 'AI coaching is unavailable offline.',
    aiGuest: 'Sign in to use AI coaching for this brew plan.',
    load: 'Load',
    pickerSearch: 'Search catalog...',
    pickerSearchLabel: 'Search AI Brew catalog',
    pickerHelp: '',
    pickerClose: 'Close picker',
    noPickerResults: 'No matching catalog entries.',
    generated: 'Brew plan saved to local history.',
    savedCollection: 'Recipe saved to Collection.',
    saveCollectionFailed: 'Unable to save this brew to Collection right now.',
    savedFavorite: 'Saved to favorites.',
    removedFavorite: 'Removed from favorites.',
    unavailable: 'AI Brew catalog is unavailable right now.',
    loadingCatalog: 'Loading AI Brew catalog...',
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
    openDripperPicker: 'Choose dripper',
    openGrinderPicker: 'Choose grinder',
    showProvenance: 'Show provenance',
    hideProvenance: 'Hide provenance',
    sourceBadge: 'Source',
    popularityBadge: 'Popularity',
    generationStageLabel: 'Generation stage',
    planTab: 'Plan',
    flowTab: 'Brew Guide',
    coachTab: 'Coach',
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
    coachDescription: 'Use AI only when you need a short explanation, a taste fix, or a tighter target adjustment.',
    coachEmpty: 'Choose one action to get a short bar-ready brief.',
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
    waterTitle: 'Mineral Air',
    waterSourceTitle: 'Sumber Air',
    waterBrand: 'Merek',
    waterManual: 'Manual',
    waterBrandPicker: 'Air',
    waterQuickPicks: 'Saran',
    waterQuickPicksDescription: '',
    quickMode: 'Cepat',
    proMode: 'Presisi',
    quickModeDescription: 'Builder recipe default yang cepat untuk cangkir pertama yang stabil.',
    proModeDescription: '',
    quickModeTrustHint: 'Paling cocok untuk cepat dan konsisten. Kalau profil bean dan air masih netral, hasil Quick dan Pro bisa sama.',
    proModeTrustHint: '',
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
    grindVerified: 'Referensi grind terverifikasi',
    grindFallback: 'Fallback grind',
    profileExactStatus: 'Profil alat exact',
    profileFallbackStatus: 'Profil fallback family',
    processOptionalNote: 'Proses opsional. Tidak ada modifier proses otomatis yang dipakai.',
    varietyOptionalNote: 'Varietas opsional. Tidak ada modifier varietas otomatis yang dipakai.',
    profileTitle: 'Profil Target',
    modeHot: 'Seduh Panas',
    modeIced: 'Seduh Es',
    coffeeName: 'Kopi / asal',
    coffeeNamePlaceholder: 'mis. Ethiopia Chelbesa, Gayo Washed, House Filter',
    dose: 'Dosis (g)',
    process: 'Proses',
    variety: 'Varietas',
    roast: 'Profil sangrai',
    dripper: 'Dripper',
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
    waterSelectedManual: 'Input mineral manual',
    waterNoBrand: 'Pilih air.',
    waterBrandNeedsManual: 'Isi mineral dulu.',
    waterBrandPartialFilled: 'Lengkapi mineral yang kosong.',
    waterBrandEstimated: 'Estimasi',
    waterBrandEstimatedNote: '',
    waterBrandAutofilled: 'Mineral dimuat dari profil brand terpilih.',
    waterBrandCustomized: 'Mineral brand sudah disesuaikan manual untuk brew ini.',
    waterEditMinerals: 'Edit mineral',
    waterHideMinerals: 'Sembunyikan mineral',
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
    generating: 'Sedang membuat plan',
    reset: 'Reset',
    recent: 'Seduhan Terbaru',
    favorites: 'Favorit',
    latestPlan: 'Hasil Plan',
    openPlan: 'Buka hasil',
    emptyRecent: 'Buat brew plan dulu untuk mulai membangun jurnal lokal.',
    emptyFavorites: 'Tandai favorit agar resep muncul di sini.',
    emptyPlan: 'Lengkapi form lalu buat plan untuk membuka workspace hasil.',
    summaryTitle: 'Hasil',
    totalWater: 'Total Air',
    cupOutput: 'Estimasi Hasil Cangkir',
    hotWater: 'Air Panas',
    ice: 'Es',
    temp: 'Suhu',
    time: 'Waktu Seduh',
    grind: 'Gilingan',
    recipe: 'Urutan Seduh',
    stepCountSuffix: 'langkah',
    sopCard: 'SOP Seduh',
    sopQuickDial: 'Ringkasan Cepat',
    sopSteps: 'Langkah Servis',
    rationale: 'Catatan Seduh',
    warnings: 'Peringatan',
    standards: 'Standar',
    provenance: 'Sumber Data',
    confidence: 'Kepercayaan',
    exactProfile: 'Profil exact',
    derivedTemplateProfile: 'Profil turunan template',
    fallbackProfile: 'Fallback family',
    useInTimer: 'Pakai di Timer',
    useInRatio: 'Pakai di Ratio',
    save: 'Simpan',
    saved: 'Tersimpan',
    favorite: 'Favorit',
    unfavorite: 'Hapus Favorit',
    aiCoach: 'Panduan AI',
    aiFinisher: 'Finalisasi Ekstraksi',
    explain: 'Jelaskan Resep',
    troubleshoot: 'Perbaiki Rasa',
    adjust: 'Dorong Target',
    aiSop: 'Standarkan SOP',
    aiGenerateBrief: 'Asisten AI',
    aiSequenceGuide: 'Catatan AI',
    aiGenerateLoading: 'Memperbarui AI Notes ringkas...',
    updateNotes: 'Perbarui Catatan',
    updatingNotes: 'Memperbarui Catatan',
    aiNotesManualHint: 'Perbarui catatan singkat saat perlu.',
    aiNotesUpdated: 'AI Notes diperbarui.',
    finisherCard: 'Finalisasi Ekstraksi',
    finisherReasoning: 'Bacaan Akhir',
    finisherControlPoints: 'Perhatikan',
    finisherFallbackAdjustments: 'Penyelamatan Rasa',
    finisherAiTitle: 'AI',
    finisherAiEmpty: 'Jalankan AI jika butuh detail tambahan.',
    finisherAiGuest: 'Masuk untuk memakai AI.',
    finisherAiOffline: 'AI tidak tersedia saat offline.',
    finisherAiLoading: 'AI sedang bekerja...',
    finisherTasteSour: 'Asam',
    finisherTasteBitter: 'Pahit',
    finisherTasteThin: 'Tipis',
    finisherRefresh: 'Muat ulang AI',
    aiBusy: 'AI sedang meninjau brew plan...',
    aiOffline: 'AI coach tidak tersedia saat offline.',
    aiGuest: 'Masuk dulu untuk memakai AI coach pada brew plan ini.',
    load: 'Muat',
    pickerSearch: 'Cari catalog...',
    pickerSearchLabel: 'Cari catalog AI Brew',
    pickerHelp: '',
    pickerClose: 'Tutup picker',
    noPickerResults: 'Tidak ada entry catalog yang cocok.',
    generated: 'Brew plan tersimpan ke history lokal.',
    savedCollection: 'Recipe tersimpan ke Collection.',
    saveCollectionFailed: 'Recipe ini belum bisa disimpan ke Collection sekarang.',
    savedFavorite: 'Masuk ke favorit.',
    removedFavorite: 'Dihapus dari favorit.',
    unavailable: 'Catalog AI Brew belum bisa dimuat sekarang.',
    loadingCatalog: 'Sedang memuat catalog AI Brew...',
    restoredPlan: 'Brew plan terakhir berhasil dipulihkan dari device ini.',
    offlineCatalog: 'Catalog AI Brew cache berhasil dimuat untuk mode offline.',
    loadFavorite: 'Muat brew favorit',
    loadRecent: 'Muat brew terbaru',
    aiSignIn: 'Masuk untuk mengaktifkan AI coach',
    aiDisabledGuest: 'AI coach dinonaktifkan sampai Anda masuk.',
    aiDisabledOffline: 'AI coach dinonaktifkan saat offline.',
    balance: 'Seimbang & Bersih',
    sweetness: 'Lebih Manis',
    acidity: 'Lebih Cerah',
    body: 'Body Lebih Tebal',
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
    confidenceNotes: 'Catatan kepercayaan',
    waterRequired: 'Input mineral manual wajib diisi sebelum generate.',
    openProcessPicker: 'Pilih proses',
    openVarietyPicker: 'Pilih varietas',
    openDripperPicker: 'Pilih dripper',
    openGrinderPicker: 'Pilih grinder',
    showProvenance: 'Tampilkan rujukan',
    hideProvenance: 'Sembunyikan rujukan',
    sourceBadge: 'Sumber',
    popularityBadge: 'Popularitas',
    generationStageLabel: 'Tahap generate',
    planTab: 'Ringkasan',
    flowTab: 'Panduan Seduh',
    coachTab: 'Panduan AI',
    flowTitle: 'Panduan seduh',
    flowDescription: 'Fokus ke langkah yang sedang berjalan. Timer menjaga ritme seduh tanpa bikin ribet.',
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
    coachDescription: 'Pakai AI hanya saat butuh penjelasan singkat, koreksi rasa, atau penyesuaian target.',
    coachEmpty: 'Pilih satu aksi untuk mendapat brief singkat yang siap dipakai saat seduh.',
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
type AiCoachMode = 'explain' | 'troubleshoot' | 'adjust';
type FormMode = 'quick' | 'pro';
type HistoryStripTab = 'latest' | 'favorites' | 'recent';
type ResultTab = 'plan' | 'flow' | 'coach';
type CopySet = Record<string, string>;

interface PickerOption {
  id: string;
  label: string;
  subtitle?: string;
  description?: string;
  searchText: string;
  section: string;
  badges: string[];
  ariaLabel: string;
  tone?: 'highlight' | 'muted' | 'default';
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatGuideTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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

function formatRoundedGrams(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const maxFractionDigits = Number.isInteger(rounded) ? 0 : 1;
  return `${formatDisplayNumber(rounded, maxFractionDigits)} g`;
}

function formatRoundedTemperature(value: number) {
  return `${formatDisplayNumber(Math.round(value))}\u00b0C`;
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

function getAiCoachTitle(copy: CopySet, mode: AiCoachMode) {
  switch (mode) {
    case 'explain':
      return copy.explain;
    case 'troubleshoot':
      return copy.troubleshoot;
    case 'adjust':
    default:
      return copy.adjust;
  }
}

function selectDefaultAiResponse(
  copy: CopySet,
  aiNotes?: BrewPlan['aiNotes'],
  plan?: BrewPlan,
  language?: string,
) {
  if (aiNotes) {
    const orderedModes: AiCoachMode[] = ['explain', 'troubleshoot', 'adjust'];
    for (const mode of orderedModes) {
      const markdown = aiNotes[mode];
      if (!markdown) continue;
      return {
        title: getAiCoachTitle(copy, mode),
        markdown,
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
    return `${promptBody}\n\nKunci bahasa: jawab sepenuhnya dalam Bahasa Indonesia. Jangan gunakan bahasa lain untuk judul, bullet, label, catatan, maupun fallback. Pertahankan struktur heading, bullet, dan angka secara konsisten.`;
  }
  if (/^ar(?:-|$)/i.test(language)) {
    return `${promptBody}\n\nقفل اللغة: أجب بالكامل باللغة العربية. لا تستخدم أي لغة أخرى في العناوين أو النقاط أو التسميات أو الملاحظات أو النصوص الاحتياطية. حافظ على بنية العناوين والنقاط والأرقام كما هي.`;
  }
  return promptBody + '\n\nLanguage lock: respond fully in ' + language + '. Keep all headings, bullets, and numbers structurally consistent.';
}

async function normalizeMarkdownToLanguage(
  markdown: string,
  language: string,
  requestContext: any,
) {
  if (!markdown.trim()) return markdown;
  if (/^en(?:-|$)/i.test(language)) return markdown;
  const translationPrompt = [
    'Translate the markdown below fully into ' + language + '.',
    'Keep structure exactly: headings, list numbering, line breaks, and all numeric values unchanged.',
    'Do not add commentary. Return only translated markdown.',
    '',
    markdown,
  ].join('\n');
  try {
    const translated = await raceChatResponse(translationPrompt, requestContext);
    return translated?.trim() || markdown;
  } catch {
    return markdown;
  }
}

async function normalizeSequenceMarkdownToLanguage(
  markdown: string,
  language: string,
  requestContext: any,
) {
  if (!markdown.trim()) return markdown;
  if (/^en(?:-|$)/i.test(language)) return markdown;
  const translationPrompt = [
    'Translate the markdown below fully into ' + language + '.',
    'Keep these headings exactly unchanged:',
    '## Service Pattern',
    '## Sequence',
    '## Watch',
    'For every numbered Sequence line, keep the deterministic checkpoint prefix unchanged through "pour X ml to Y ml".',
    'Translate only the control instruction after that fixed checkpoint prefix.',
    'Keep numbering, line order, and all numeric values unchanged.',
    'Return only translated markdown.',
    '',
    markdown,
  ].join('\n');
  try {
    const translated = await raceChatResponse(translationPrompt, requestContext);
    return translated?.trim() || markdown;
  } catch {
    return markdown;
  }
}

function stripSequenceBullets(lines: string[]) {
  return lines
    .map((line) => line.replace(/^-\s+/, '').trim())
    .filter(Boolean);
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
      appLanguage: options.language,
    },
  };

  const aiText = await raceChatResponse(buildSequenceGuidePrompt(nextPlan).body, canonicalRequestContext);
  const canonicalOverlay = composeHybridSequenceOverlay(nextPlan, aiText);
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
  );
  const localizedOverlay = extractSequenceOverlayFromMarkdown(nextPlan, displayMarkdown);

  const fallbackDiagnostics = [
    ...(canonicalOverlay.usedFallback
      ? [
          `AI sequence fallback: ${canonicalOverlay.validation.errors.join(' | ') || canonicalOverlay.validation.warnings.join(' | ') || 'invalid_narrative'}.`,
        ]
      : []),
  ];

  return {
    markdown: displayMarkdown,
    canonicalMarkdown: canonicalOverlay.markdown,
    servicePattern: stripSequenceBullets(localizedOverlay.servicePattern),
    watch: stripSequenceBullets(localizedOverlay.watch),
    stepInstructions: localizedOverlay.steps.map((step) => step.instruction),
    fallbackDiagnostics,
  };
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
    time: formatTime(plan.totalTimeSeconds),
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

function translateTargetProfileLabel(copy: CopySet, profileId: string) {
  if (profileId === 'balance_clean') return copy.balance;
  if (profileId === 'more_sweetness') return copy.sweetness;
  if (profileId === 'more_acidity') return copy.acidity;
  return copy.body;
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
      ? 'Menyiapkan input brew sebelum recipe dihitung.'
      : 'Preparing brew inputs before the recipe is computed.';
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
        ? `Memeriksa ${metrics.normalizedInputCount}/${metrics.totalCoreInputs} input inti dan ${metrics.optionalSignalCount}/${metrics.totalOptionalSignals} sinyal tambahan.`
        : `Checking ${metrics.normalizedInputCount}/${metrics.totalCoreInputs} core inputs and ${metrics.optionalSignalCount}/${metrics.totalOptionalSignals} extra signals.`;
    case 'match_device_profile':
      return id
        ? `Mencocokkan alat dengan profil seduh untuk target ${targetLabel}.`
        : `Matching the brewer with the brew profile for the ${targetLabel} target.`;
    case 'resolve_grinder_settings':
      return id
        ? `Mencari baseline giling ${metrics.grinderRangeLabel || 'dari katalog'} dengan status ${verificationLabel}.`
        : `Finding the ${metrics.grinderRangeLabel || 'catalog'} grind baseline with ${verificationLabel} status.`;
    case 'compute_brew_variables':
      return id
        ? `Menghitung rasio ${ratioLabel}, air ${waterLabel}, suhu ${tempLabel}, dan waktu ${timeLabel}.`
        : `Computing ratio ${ratioLabel}, water ${waterLabel}, temperature ${tempLabel}, and time ${timeLabel}.`;
    case 'build_sequence':
      return id
        ? `Menyusun ${metrics.stepCount || 0} checkpoint tuang dan target volume tiap fase.`
        : `Building ${metrics.stepCount || 0} pour checkpoints and target volumes for each phase.`;
    case 'hybrid_ai_sequence':
      return id
        ? 'AI sedang menyusun instruksi servis di atas checkpoint planner yang sudah terkunci.'
        : 'AI is composing service instructions on top of the locked planner checkpoints.';
    case 'run_standards_checks':
    default:
      return id
        ? `Menjalankan guardrail dan standar ekstraksi: ${metrics.standardsHits || 0} lolos, ${metrics.standardsMisses || 0} miss, ${metrics.warningCount || 0} warning.`
        : `Running guardrails and extraction standards: ${metrics.standardsHits || 0} passed, ${metrics.standardsMisses || 0} missed, ${metrics.warningCount || 0} warnings.`;
  }
}

function normalizeAiBrewInstructionText(value: string) {
  return String(value || '')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAiBrewStepActionText(step: BrewPlan['steps'][number], language: string) {
  return isIndonesianAiBrewLanguage(language)
    ? `Tuang ${formatRoundedMl(step.pourVolumeMl)} hingga target ${formatRoundedMl(step.targetVolumeMl)}.`
    : `Pour ${formatRoundedMl(step.pourVolumeMl)} to reach ${formatRoundedMl(step.targetVolumeMl)}.`;
}

function buildAiBrewFlowStepSummary(step: BrewPlan['steps'][number], language: string) {
  const id = isIndonesianAiBrewLanguage(language);
  return id
    ? `${formatGuideTime(step.startSeconds)} | tuang +${formatRoundedMl(step.pourVolumeMl)} | target ${formatRoundedMl(step.targetVolumeMl)}`
    : `${formatGuideTime(step.startSeconds)} | pour +${formatRoundedMl(step.pourVolumeMl)} | target ${formatRoundedMl(step.targetVolumeMl)}`;
}

function buildAiBrewStepPrimaryCue(step: BrewPlan['steps'][number], language: string) {
  return isIndonesianAiBrewLanguage(language)
    ? `Tuang +${formatRoundedMl(step.pourVolumeMl)} sekarang`
    : `Pour +${formatRoundedMl(step.pourVolumeMl)} now`;
}

function buildAiBrewStepTargetCue(step: BrewPlan['steps'][number], language: string) {
  return isIndonesianAiBrewLanguage(language)
    ? `Berhenti di target ${formatRoundedMl(step.targetVolumeMl)}`
    : `Stop at ${formatRoundedMl(step.targetVolumeMl)}`;
}

function buildAiBrewNextStepCue(step: BrewPlan['steps'][number], remainingSeconds: number, language: string) {
  return isIndonesianAiBrewLanguage(language)
    ? `Tuangan berikutnya dalam ${formatGuideTime(remainingSeconds)}`
    : `Next pour in ${formatGuideTime(remainingSeconds)}`;
}

function buildAiBrewStepQuickNote(step: BrewPlan['steps'][number], language: string) {
  return normalizeAiBrewInstructionText(localizeAiBrewDynamicText(step.note, language));
}

function buildAiBrewStepDetailPoints(step: BrewPlan['steps'][number], language: string) {
  const fallbackNote = buildAiBrewStepQuickNote(step, language).toLowerCase();
  const detailText = normalizeAiBrewInstructionText(
    localizeAiBrewDynamicText(step.hybridInstruction || '', language),
  );

  if (!detailText || detailText.toLowerCase() === fallbackNote) return [];

  const points = detailText
    .split(/;\s+|(?<=[.!?])\s+/)
    .map((part) => normalizeAiBrewInstructionText(part))
    .filter(Boolean)
    .filter((part) => part.toLowerCase() !== fallbackNote);

  return Array.from(new Set(points)).slice(0, 5);
}

function buildAiBrewStepMetrics(step: BrewPlan['steps'][number], language: string) {
  const id = isIndonesianAiBrewLanguage(language);
  return [
    {
      label: id ? 'Mulai' : 'Start',
      value: formatGuideTime(step.startSeconds),
    },
    {
      label: id ? 'Tuang' : 'Pour',
      value: formatRoundedMl(step.pourVolumeMl),
    },
    {
      label: id ? 'Target' : 'Target',
      value: formatRoundedMl(step.targetVolumeMl),
    },
  ];
}

function renderAiBrewSequenceStepCard(
  step: BrewPlan['steps'][number],
  index: number,
  language: string,
) {
  const localizedStepLabel = localizeAiBrewStepLabel(step.label, language);
  const stepActionText = buildAiBrewStepActionText(step, language);
  const stepQuickNote = buildAiBrewStepQuickNote(step, language);
  const stepDetailPoints = buildAiBrewStepDetailPoints(step, language);
  const stepMetrics = buildAiBrewStepMetrics(step, language);
  const normalizedActionText = normalizeAiBrewInstructionText(stepActionText).toLowerCase();
  const showQuickNote = Boolean(stepQuickNote) && stepQuickNote.toLowerCase() !== normalizedActionText;
  const stepCardClass = 'rounded-[1rem] border panel-divider-subtle panel-soft p-3 sm:p-3.5';
  const metricChipClass = 'rounded-full border panel-divider-subtle bg-[var(--bg-base)] px-2.5 py-1 text-[11px] text-secondary';

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
              +{formatRoundedMl(step.pourVolumeMl)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {stepMetrics.map((item) => (
              <span
                key={`${step.id}-${item.label}`}
                className={metricChipClass}
              >
                <span className="mr-1 font-medium text-tertiary">
                  {item.label}
                </span>
                <span className="font-semibold text-primary">{item.value}</span>
              </span>
            ))}
          </div>

          {showQuickNote && (
            <p className="text-sm leading-5 text-secondary">{stepQuickNote}</p>
          )}

          {stepDetailPoints.length > 0 && (
            <details className="group rounded-xl border panel-divider-subtle bg-[var(--bg-base)]/72 px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-primary">
                <span>
                  {isIndonesianAiBrewLanguage(language) ? 'Buka detail langkah' : 'Open step detail'}
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
  if (normalized.includes('timeout') || normalized.includes('provider') || normalized.includes('quota') || normalized.includes('model') || normalized.includes('400') || normalized.includes('500')) {
    return id
      ? 'AI sedang sibuk. Coba ulang sebentar lagi.'
      : 'AI is busy right now. Please try again shortly.';
  }

  return fallback;
}

function getAiBrewSequenceFallbackMessage(language: string) {
  return isIndonesianAiBrewLanguage(language)
    ? 'Instruksi AI tambahan belum dipakai. Sistem memakai urutan seduh tervalidasi agar hasil tetap stabil.'
    : 'The extra AI layer was skipped. The validated brew sequence is being used to keep the result stable.';
}

function getFlowActiveStepIndex(plan: BrewPlan, elapsedSeconds: number) {
  if (plan.steps.length === 0) return -1;

  for (let index = plan.steps.length - 1; index >= 0; index -= 1) {
    if (elapsedSeconds >= plan.steps[index].startSeconds) {
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
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  ariaDescribedBy?: string;
  restoreFocusTarget?: HTMLElement | null;
  className: string;
  style?: CSSProperties;
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
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

function MasterPickerDialog({
  open,
  kind,
  title,
  closeLabel,
  searchLabel,
  description,
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
  closeLabel: string;
  searchLabel: string;
  description: string;
  searchPlaceholder: string;
  emptyText: string;
  items: PickerOption[];
  restoreFocusTarget?: HTMLElement | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const descriptionId = useId();
  const searchInputId = useId();
  const hasDescription = description.trim().length > 0;

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => item.searchText.includes(normalized));
  }, [items, query]);

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
      onClose={onClose}
      ariaLabel={title}
      ariaDescribedBy={hasDescription ? descriptionId : undefined}
      restoreFocusTarget={restoreFocusTarget}
      className="fixed inset-x-0 bottom-0 z-[111] mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.8rem] border border-glass bg-[var(--bg-base)]/96 px-4 pb-4 pt-4 shadow-[0_-18px_40px_rgba(0,0,0,0.24)] lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-[1.8rem] lg:px-5"
      style={{
        maxHeight: 'min(88vh, calc(var(--fullscreen-modal-height, 100dvh) - var(--safe-top, 0px) - 12px))',
        paddingBottom: 'max(1rem, calc(var(--bottom-safe-capped, 0px) + 1rem))',
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-primary">{title}</h3>
          {hasDescription && (
            <p id={descriptionId} className="text-sm text-secondary">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
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
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="glass-input h-11 w-full pl-10 pr-4 text-sm"
        />
      </div>

      <div
        className="overflow-y-auto overscroll-contain rounded-2xl border panel-divider-subtle panel-soft p-2"
        style={{
          maxHeight: 'min(68vh, calc(var(--fullscreen-modal-height, 100dvh) - var(--safe-top, 0px) - var(--bottom-safe-capped, 0px) - 12rem))',
        }}
        data-testid={`ai-brew-picker-${kind}`}
      >
        {sections.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-secondary">{emptyText}</p>
        ) : (
          sections.map(([section, sectionItems]) => (
            <div key={section} className="mb-3 last:mb-0">
              {showSectionHeaders && section ? (
                <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-secondary">
                  {section}
                </div>
              ) : null}
              <div className="space-y-1">
                {sectionItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      onClose();
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
                        <p className="mt-1 text-xs text-secondary">{item.description}</p>
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
          ))
        )}
      </div>
    </FocusLockedDialog>
  );
}

function PlanResultDialog({
  open,
  language,
  copy,
  plan,
  currentPreset,
  aiCoachDisabled,
  aiCoachReason,
  aiBusy,
  aiResponse,
  aiError,
  saving,
  saveSuccess,
  saveError,
  showProvenance,
  isAuthenticated,
  isOffline,
  onClose,
  onEditInputs,
  onUseInTimer,
  onUseInRatio,
  onSaveRecipe,
  onToggleFavorite,
  onRunAiCoach,
  onOpenAuth,
}: {
  open: boolean;
  language: string;
  copy: CopySet;
  plan: BrewPlan | null;
  currentPreset?: BrewPreset;
  aiCoachDisabled: boolean;
  aiCoachReason: string | null;
  aiBusy: AiCoachMode | null;
  aiResponse: { title: string; markdown: string } | null;
  aiError: string | null;
  saving: boolean;
  saveSuccess: string | null;
  saveError: string | null;
  showProvenance: boolean;
  isAuthenticated: boolean;
  isOffline: boolean;
  onClose: () => void;
  onEditInputs: () => void;
  onUseInTimer: (durationSeconds: number) => void;
  onUseInRatio: (plan: BrewPlan) => void;
  onSaveRecipe: () => void;
  onToggleFavorite: () => void;
  onRunAiCoach: (mode: AiCoachMode) => void;
  onOpenAuth: () => void;
}) {
  const descriptionId = useId();
  const [activeTab, setActiveTab] = useState<ResultTab>('plan');
  const [flowElapsedSeconds, setFlowElapsedSeconds] = useState(0);
  const [flowAccumulatedSeconds, setFlowAccumulatedSeconds] = useState(0);
  const [flowRunning, setFlowRunning] = useState(false);
  const [flowStartedAtMs, setFlowStartedAtMs] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveTab('plan');
    setFlowElapsedSeconds(0);
    setFlowAccumulatedSeconds(0);
    setFlowRunning(false);
    setFlowStartedAtMs(null);
  }, [open]);

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

  if (!plan) return null;

  const resultTabs: Array<{ id: ResultTab; label: string }> = [
    { id: 'plan', label: copy.planTab },
    { id: 'flow', label: copy.flowTab },
    { id: 'coach', label: copy.coachTab },
  ];
  const showLegacySourcesTab = false;
  const coachActions: Array<{ mode: AiCoachMode; label: string; hint: string }> = [
    { mode: 'explain', label: copy.explain, hint: copy.coachExplainHint },
    { mode: 'troubleshoot', label: copy.troubleshoot, hint: copy.coachTroubleshootHint },
    { mode: 'adjust', label: copy.adjust, hint: copy.coachAdjustHint },
  ];

  const activeTabPanelId = `ai-brew-result-panel-${activeTab}`;
  const activeTabId = `ai-brew-result-tab-${activeTab}`;
  const id = isIndonesianAiBrewLanguage(language);
  const waterSourceLinks = plan.waterBrandSourceUrls || [];
  const localizedTargetProfileLabel = localizeAiBrewTargetProfile(plan.targetProfileId, plan.targetProfileLabel, language);
  const localizedSummary = localizeAiBrewSummary(plan, language);
  const localizedWaterStyle = localizeAiBrewWaterStyle(plan.waterMinerals.styleLabel, language);
  const localizedGrindRecommendation = formatGrindTextForDisplay(plan.grindRecommendation, language);
  const localizedGrindBandLabel = formatGrindTextForDisplay(plan.grindBandLabel, language);
  const localizedGrindSettingReference = formatGrindTextForDisplay(plan.grindSettingReference, language);
  const localizedWarnings = [
    ...plan.guardrails.errors.map((item) => localizeAiBrewDynamicText(item, language)),
    ...plan.warnings.map((item) => localizeAiBrewDynamicText(item, language)),
  ];
  const flowProgressSeconds = Math.min(plan.totalTimeSeconds, flowElapsedSeconds);
  const flowActiveStepIndex = getFlowActiveStepIndex(plan, flowProgressSeconds);
  const flowCurrentStep = plan.steps[flowActiveStepIndex] || null;
  const flowNextStep = flowActiveStepIndex >= 0 ? plan.steps[flowActiveStepIndex + 1] || null : plan.steps[0] || null;
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
  const resultHeaderClass = 'relative rounded-[1.5rem] border panel-divider-subtle panel-soft px-4 pb-4 pt-5 lg:px-5';
  const resultMetricCardClass = 'rounded-2xl border panel-divider-subtle bg-[var(--bg-base)]/84 p-3';
  const resultChipClass = 'rounded-full border panel-divider-subtle bg-[var(--bg-base)] px-2.5 py-1 text-[11px] font-medium text-secondary';
  const resultActionButtonClass = 'min-h-[44px] w-full rounded-xl border panel-divider-subtle bg-[var(--bg-base)] px-3 py-2 text-center text-[13px] font-medium leading-4 text-primary transition-colors hover:border-blue-500/20 hover:bg-surface-alpha sm:w-auto sm:text-sm sm:whitespace-nowrap';
  const saveButtonLabel = saving
    ? (id ? 'Menyimpan...' : 'Saving...')
    : saveSuccess
      ? copy.saved
      : copy.save;

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

  return (
    <FocusLockedDialog
      open={open}
      onClose={onClose}
      ariaLabel={copy.summaryTitle}
      ariaDescribedBy={descriptionId}
      className="fixed inset-0 z-[111] h-[var(--fullscreen-modal-height)] max-h-[var(--fullscreen-modal-height)] overflow-hidden bg-[var(--bg-base)]/98 lg:inset-6 lg:mx-auto lg:h-auto lg:max-h-[calc(var(--fullscreen-modal-height)_-_3rem)] lg:max-w-6xl lg:rounded-[2rem] lg:border lg:border-glass lg:shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
    >
      <div className="flex h-full flex-col" data-testid="ai-brew-result">
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4 lg:px-6 lg:pb-8 lg:pt-6"
          style={{
            paddingTop: 'calc(16px + var(--safe-top, 0px))',
            paddingBottom: 'calc(28px + var(--bottom-safe-capped, 0px))',
          }}
          tabIndex={0}
          aria-labelledby={activeTabId}
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
              <div className="pr-12">
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
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-primary sm:text-xl">{buildLocalizedPlanRecipeName(plan, language)}</h3>
                <p className="mt-1 text-sm text-secondary">
                  {formatRoundedGrams(plan.doseG)} | {formatRoundedMl(plan.totalWaterMl)} | {formatGuideTime(plan.totalTimeSeconds)} | {formatRoundedTemperature(plan.waterTempC)}
                </p>
                <p id={descriptionId} className="sr-only">
                  {plan.doseG} g · {plan.totalWaterMl} ml · {formatTime(plan.totalTimeSeconds)} · {plan.waterTempC}°C
                </p>
              </div>

              <div className="mt-3 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div
                  role="tablist"
                  aria-label={copy.summaryTitle}
                  className="grid w-full grid-cols-3 gap-1.5 rounded-[0.95rem] panel-soft p-1.5 xl:max-w-md"
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
                      className={`rounded-[0.8rem] px-2.5 py-2 text-sm font-medium transition-all ${
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
                <div className={`${resultChipClass} rounded-xl px-3 py-2 text-xs`}>
                  {copy.grind}: {localizedGrindRecommendation}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <button type="button" onClick={onEditInputs} className={resultActionButtonClass}>
                    {copy.editInputs}
                  </button>
                  <button type="button" onClick={() => onUseInTimer(plan.totalTimeSeconds)} className={resultActionButtonClass} data-testid="ai-brew-use-timer" aria-label={copy.ariaUseInTimer.replace('{name}', buildLocalizedPlanRecipeName(plan, language))}>
                    {copy.useInTimer}
                  </button>
                  <button type="button" onClick={() => onUseInRatio(plan)} className={resultActionButtonClass} data-testid="ai-brew-use-ratio" aria-label={copy.ariaUseInRatio.replace('{name}', buildLocalizedPlanRecipeName(plan, language))}>
                    {copy.useInRatio}
                  </button>
                  <button type="button" onClick={onSaveRecipe} disabled={saving} className={`${resultActionButtonClass} disabled:cursor-not-allowed disabled:opacity-55`} data-testid="ai-brew-save" aria-label={copy.ariaSaveToCollection.replace('{name}', buildLocalizedPlanRecipeName(plan, language))}>
                    {saveButtonLabel}
                  </button>
                  <button type="button" onClick={onToggleFavorite} className={resultActionButtonClass} data-testid="ai-brew-favorite" aria-label={(currentPreset ? copy.ariaFavoriteRemove : copy.ariaFavoriteAdd).replace('{name}', buildLocalizedPlanRecipeName(plan, language))}>
                    <span className="inline-flex items-center justify-center gap-2">
                      {currentPreset ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                      {currentPreset ? copy.unfavorite : copy.favorite}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('flow')}
                    className={resultActionButtonClass}
                    data-testid="ai-brew-open-flow"
                  >
                    {copy.flowTab}
                  </button>
              </div>
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
                className="flex flex-col gap-5"
              >
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 xl:grid-cols-6">
                <div className={resultMetricCardClass}>
                  <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.totalWater}</p>
                  <p className="mt-1 text-xl font-semibold text-primary sm:text-2xl">{formatRoundedMl(plan.totalWaterMl)}</p>
                </div>
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
                    <span>{copy.time}</span>
                  </div>
                  <p className="mt-1 text-base font-semibold text-primary sm:text-lg">{formatGuideTime(plan.totalTimeSeconds)}</p>
                </div>
                <div className={resultMetricCardClass}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-secondary">
                    <Gauge size={12} />
                    <span>{copy.grind}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-primary">{localizedGrindRecommendation}</p>
                  <p className="mt-1 text-xs text-secondary">{localizedGrindBandLabel}</p>
                </div>
                <div className={resultMetricCardClass}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-secondary">
                    <Droplets size={12} />
                    <span>{plan.brewMode === 'iced' ? copy.hotWater : copy.totalWater}</span>
                  </div>
                  <p className="mt-1 text-base font-semibold text-primary sm:text-lg">{formatRoundedMl(plan.hotWaterMl)}</p>
                  {plan.iceMl > 0 && (
                    <p className="mt-1 text-xs text-secondary">{copy.ice}: {formatRoundedMl(plan.iceMl)}</p>
                  )}
                </div>
              </div>

              {false && (
                <>
                  <div className="rounded-[1.4rem] border panel-divider-subtle panel-soft p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
                  <div className="rounded-2xl bg-surface-alpha p-4">
                    <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.sopQuickDial}</p>
                    <div className="mt-3 space-y-2 text-sm text-secondary">
                      <p>{plan.doseG} g coffee</p>
                      <p>{plan.totalWaterMl} ml water at {plan.waterTempC}°C</p>
                      <p>{copy.grind}: {localizedGrindRecommendation}</p>
                      <p>{copy.time}: {formatTime(plan.totalTimeSeconds)}</p>
                      <p>{plan.waterBrandLabel || copy.waterSelectedManual} · TDS {plan.waterMinerals.tdsPpm} · GH {plan.waterMinerals.hardnessPpm} · KH {plan.waterMinerals.alkalinityPpm}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-surface-alpha p-4">
                    <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.sopSteps}</p>
                    <div className="mt-3 space-y-2 text-sm text-secondary">
                      {plan.steps.map((step, index) => (
                        <p key={step.id}>
                          {index + 1}. {formatTime(step.startSeconds)} · {localizeAiBrewStepLabel(step.label, language)} · {step.pourVolumeMl} ml to {step.targetVolumeMl} ml
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
                            ? 'Ikuti dari atas ke bawah. Detail tambahan hanya dibuka saat perlu.'
                            : 'Follow top to bottom. Open extra detail only when needed.'}
                        </p>
                        <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-secondary">
                          <span className={resultChipClass}>
                            {formatRoundedGrams(plan.doseG)}
                          </span>
                          <span className={resultChipClass}>
                            {formatRoundedMl(plan.totalWaterMl)}
                          </span>
                          <span className={resultChipClass}>
                            {formatGuideTime(plan.totalTimeSeconds)}
                          </span>
                          <span className={resultChipClass}>
                            {formatRoundedTemperature(plan.waterTempC)}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full border border-blue-500/18 bg-[var(--bg-base)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                        {plan.steps.length} {copy.stepCountSuffix}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {plan.steps.map((step, index) => renderAiBrewSequenceStepCard(step, index, language))}
                      {/*
                      {plan.steps.map((step, index) => {
                        const localizedStepLabel = localizeAiBrewStepLabel(step.label, language);
                        const stepActionText = buildAiBrewStepActionText(step, language);
                        const stepQuickNote = buildAiBrewStepQuickNote(step, language);
                        const stepDetailPoints = buildAiBrewStepDetailPoints(step, language);
                        const stepMetrics = buildAiBrewStepMetrics(step, language);

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
                              <p className="text-xs text-secondary">{formatTime(step.startSeconds)} · {step.pourVolumeMl} ml pour · {step.targetVolumeMl} ml target</p>
                            </div>
                            <span className="rounded-full border border-blue-500/12 bg-[var(--bg-base)] px-3.5 py-2 text-sm font-semibold text-primary shadow-[0_8px_18px_rgba(15,23,42,0.12)]">
                              {step.pourVolumeMl} ml
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
                  <div className="rounded-[1.4rem] border panel-divider-subtle panel-soft p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <FlaskConical size={15} className="text-sky-500" />
                      <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.waterSourceUsed}</h4>
                    </div>
                    <div className="rounded-2xl bg-surface-alpha p-3">
                      <p className="text-sm font-semibold text-primary">{plan.waterBrandLabel || copy.waterSelectedManual}</p>
                      <p className="mt-1 text-xs text-secondary">
                        TDS {plan.waterMinerals.tdsPpm} · GH {plan.waterMinerals.hardnessPpm} · KH {plan.waterMinerals.alkalinityPpm}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-secondary">
                        {plan.waterPresetStatus && (
                          <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">
                            {formatWaterPresetStatus(copy, plan.waterPresetStatus)}
                          </span>
                        )}
                        <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">
                          {plan.waterCustomized ? copy.waterBrandCustomized : localizedWaterStyle}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(showProvenance || plan.deviceProfileMode === 'exact' || plan.confidenceNotes.length > 0) && (
                    <div className="rounded-[1.4rem] border panel-divider-subtle panel-soft p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Info size={15} className="text-blue-500" />
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.provenance}</h4>
                      </div>
                      <div className="space-y-3 text-sm text-secondary">
                        <div className="rounded-xl bg-surface-alpha px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.profileUsed}</p>
                          <p className="mt-1 font-medium text-primary">{plan.deviceProfileLabel}</p>
                          <p className="mt-1 text-xs">{formatDeviceProfileMode(copy, plan.deviceProfileMode)}</p>
                        </div>
                        <div className="rounded-xl bg-surface-alpha px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{copy.grindSource}</p>
                          <p className="mt-1 font-medium text-primary">{localizedGrindSettingReference}</p>
                          <p className="mt-1 text-xs">{formatGrindSettingMode(copy, plan.grindSettingMode)} · {formatVerification(copy, plan.grindSettingVerification)}</p>
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
                    </div>
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
                    <div className="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/10 p-4">
                      <h4 className="text-sm font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">{copy.warnings}</h4>
                      <div className="mt-2 space-y-2 text-sm text-amber-700 dark:text-amber-200">
                        {localizedWarnings.map((warning, index) => (
                          <p key={`${warning}-${index}`}>{warning}</p>
                        ))}
                      </div>
                    </div>
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

            {activeTab === 'flow' && (
              <div
                id={activeTabPanelId}
                role="tabpanel"
                aria-labelledby={activeTabId}
                className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
              >
                <div className="space-y-5">
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
                        <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.flowRemaining}</p>
                        <p className="mt-1 text-3xl font-semibold text-primary">{formatGuideTime(flowRemainingSeconds)}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-[var(--bg-base)]/88 p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                      <p className="text-[11px] uppercase tracking-widest text-secondary">{copy.flowCurrentStep}</p>
                      <p className="mt-1 text-sm font-semibold text-primary">
                        {flowCurrentStep ? localizeAiBrewStepLabel(flowCurrentStep.label, language) : buildLocalizedPlanRecipeName(plan, language)}
                      </p>
                      <p className="mt-2 text-2xl font-semibold leading-tight text-primary sm:text-3xl">
                        {flowCurrentStep
                          ? buildAiBrewStepPrimaryCue(flowCurrentStep, language)
                          : `${plan.steps.length} ${copy.stepCountSuffix}`}
                      </p>
                      <p className="mt-1 text-base font-semibold text-blue-700 dark:text-blue-300">
                        {flowCurrentStep
                          ? buildAiBrewStepTargetCue(flowCurrentStep, language)
                          : localizedSummary}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 xl:grid-cols-2">
                        <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                          <span className="block text-[10px] uppercase tracking-widest text-tertiary">Dose</span>
                          <span className="font-semibold text-primary">{formatRoundedGrams(plan.doseG)}</span>
                        </span>
                        <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                          <span className="block text-[10px] uppercase tracking-widest text-tertiary">Water</span>
                          <span className="font-semibold text-primary">{formatRoundedMl(plan.totalWaterMl)}</span>
                        </span>
                        <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                          <span className="block text-[10px] uppercase tracking-widest text-tertiary">Next</span>
                          <span className="font-semibold text-primary">{formatGuideTime(flowStepRemainingSeconds)}</span>
                        </span>
                        <span className="rounded-xl border panel-divider-subtle bg-surface-alpha px-2.5 py-2 text-secondary">
                          <span className="block text-[10px] uppercase tracking-widest text-tertiary">Total</span>
                          <span className="font-semibold text-primary">{formatGuideTime(plan.totalTimeSeconds)}</span>
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-5 text-secondary">
                        {flowCurrentStep
                          ? buildAiBrewStepQuickNote(flowCurrentStep, language)
                          : localizedSummary}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={flowRunning ? pauseFlowTimer : startFlowTimer}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]"
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
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border panel-divider-subtle bg-[var(--bg-base)] px-4 py-2 text-sm font-medium text-primary"
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

                <div className="space-y-3">
                  {plan.steps.map((step, index) => {
                    const state = index < flowActiveStepIndex
                      ? 'done'
                      : index === flowActiveStepIndex
                        ? 'current'
                        : 'next';
                    const quickNote = buildAiBrewStepQuickNote(step, language);
                    const showStepNote = state === 'current' && Boolean(quickNote);

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
                        data-testid={`ai-brew-flow-step-${index + 1}`}
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
                            <p className="text-sm text-secondary">{buildAiBrewFlowStepSummary(step, language)}</p>
                          </div>
                          <div className="space-y-1 text-right">
                            <span className="inline-flex rounded-full border panel-divider-subtle bg-[var(--bg-base)] px-2.5 py-1 text-[11px] font-semibold text-primary">
                              {state === 'done' ? copy.flowDone : state === 'current' ? copy.flowNow : copy.flowUpNext}
                            </span>
                          </div>
                        </div>
                        {showStepNote && (
                          <p className="mt-2 text-sm leading-5 text-secondary">{quickNote}</p>
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
                className="space-y-5"
              >
              <div className="rounded-[1.4rem] border panel-divider-subtle panel-soft p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Brain size={15} className="text-blue-500" />
                  <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.aiCoach}</h4>
                </div>
                <p className="text-sm text-secondary">{copy.coachDescription}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {coachActions.map((action) => (
                    <button
                      key={action.mode}
                      type="button"
                      onClick={() => onRunAiCoach(action.mode)}
                      disabled={aiCoachDisabled}
                      className="rounded-2xl border panel-divider-subtle bg-surface-alpha px-3 py-3 text-left transition-colors hover:bg-surface-alpha-hover disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <p className="text-sm font-semibold text-primary">{action.label}</p>
                      <p className="mt-1 text-xs leading-5 text-secondary">{action.hint}</p>
                    </button>
                  ))}
                </div>

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
                  <div className="mt-4 rounded-[1.2rem] border panel-divider-subtle bg-[var(--bg-base)]/82 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-secondary">{aiResponse.title}</p>
                    <div className="chat-markdown prose prose-sm mt-3 max-w-none text-primary prose-headings:text-primary prose-strong:text-primary">
                      <Markdown>{aiResponse.markdown}</Markdown>
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
                className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.95fr)]"
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
                      <p className="mt-1 text-xs">{formatGrindSettingMode(copy, plan.grindSettingMode)} · {formatVerification(copy, plan.grindSettingVerification)}</p>
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
                        {plan.waterPresetStatus && (
                          <span className="rounded-full bg-[var(--bg-base)] px-2 py-1 text-[11px] font-medium text-secondary">
                            {formatWaterPresetStatus(copy, plan.waterPresetStatus)}
                          </span>
                        )}
                      </div>
                    <p className="mt-2 text-xs text-secondary">
                      TDS {plan.waterMinerals.tdsPpm} · GH {plan.waterMinerals.hardnessPpm} · KH {plan.waterMinerals.alkalinityPpm}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-secondary">
                      <span className="rounded-full bg-[var(--bg-base)] px-2 py-1">
                        {plan.waterCustomized ? copy.waterBrandCustomized : localizedWaterStyle}
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
  }];
  options.push(...catalog.processes.map((entry): PickerOption => ({
    id: entry.id,
    label: entry.label,
    subtitle: `${copy.processGroup}: ${entry.group}`,
    description: entry.notes[0],
    searchText: `${entry.searchText} ${entry.group} ${entry.aliases.join(' ')}`.toLowerCase(),
    section: entry.group,
    badges: [formatVerification(copy, entry.verificationLevel)],
    ariaLabel: copy.pickerSelectProcess.replace('{label}', entry.label),
  })));
  options.push({
    id: CUSTOM_ENTRY_ID,
    label: copy.manualEntry,
    searchText: `${copy.manualEntry} custom process`.toLowerCase(),
    section: 'manual',
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
    searchText: `${entry.searchText} ${entry.group} ${entry.aliases.join(' ')}`.toLowerCase(),
    section: entry.group,
    badges: [formatVerification(copy, entry.verificationLevel)],
    ariaLabel: copy.pickerSelectVariety.replace('{label}', entry.label),
  })));
  options.push({
    id: CUSTOM_ENTRY_ID,
    label: copy.manualEntry,
    searchText: `${copy.manualEntry} custom variety`.toLowerCase(),
    section: 'manual',
    badges: [],
    ariaLabel: copy.pickerSelectCustomVariety,
  });
  return options;
}

function buildEquipmentPickerOptions(items: EquipmentCatalogEntry[], copy: CopySet, kind: 'dripper' | 'grinder') {
  return items.map((item): PickerOption => ({
    id: item.id,
    label: item.name,
    subtitle: item.brand ? `${item.brand} · ${item.typeLabel}` : item.typeLabel,
    description: item.description,
    searchText: item.searchText,
    section: '',
    badges: [],
    ariaLabel: copy.pickerSelectEquipment.replace('{kind}', kind).replace('{label}', item.name),
  }));
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
  if (parts.length > 0) return parts.join(' · ');
  return localizeAiBrewWaterClassificationLabel(item.classificationLabel, language);
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
  const tdsPpm = item?.resolvedMinerals?.tdsPpm ?? item?.chemistry.tdsPpm;
  const hardnessPpm = item?.resolvedMinerals?.hardnessPpm ?? item?.chemistry.hardnessPpm;
  const alkalinityPpm = item?.resolvedMinerals?.alkalinityPpm ?? item?.chemistry.alkalinityPpm;
  return {
    waterTdsPpm: tdsPpm !== undefined ? String(tdsPpm) : '',
    waterHardnessPpm: hardnessPpm !== undefined ? String(hardnessPpm) : '',
    waterAlkalinityPpm: alkalinityPpm !== undefined ? String(alkalinityPpm) : '',
  };
}

function countKnownWaterFields(item: WaterBrandProfile | null | undefined) {
  const values = buildWaterPrefillValues(item);
  return [values.waterTdsPpm, values.waterHardnessPpm, values.waterAlkalinityPpm].filter(Boolean).length;
}

function isEstimatedWaterBaseline(item: WaterBrandProfile | null | undefined) {
  return item?.resolvedMinerals?.derivation === 'estimated_from_classification';
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
    subtitle: buildWaterChemistryLabel(item, language),
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
  ].filter(Boolean).join(' · ');
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
  const [activeBuilderModal, setActiveBuilderModal] = useState<FormMode | null>(null);
  const [historyStripTab, setHistoryStripTab] = useState<HistoryStripTab>('latest');
  const [plan, setPlan] = useState<BrewPlan | null>(null);
  const [pickerKind, setPickerKind] = useState<PickerKind>(null);
  const [pickerRestoreFocusTarget, setPickerRestoreFocusTarget] = useState<HTMLElement | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [showProvenance, setShowProvenance] = useState(false);
  const [journalEntries, setJournalEntries] = useState<BrewJournalEntry[]>([]);
  const [presets, setPresets] = useState<BrewPreset[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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
  const generationStartedAtRef = useRef<number | null>(null);

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
    setActiveBuilderModal(null);
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

  const selectedGrinder = useMemo(() => {
    if (!catalog) return null;
    return catalog.grinders.find((item) => item.id === formState.grinderId) || catalog.grinders[0] || null;
  }, [catalog, formState.grinderId]);

  const selectedTargetProfile = useMemo(() => {
    if (!catalog) return null;
    return catalog.targetProfiles.find((item) => item.id === formState.targetProfileId) || catalog.targetProfiles[0] || null;
  }, [catalog, formState.targetProfileId]);

  const selectedWaterBrand = useMemo(() => {
    if (!catalog || !formState.waterBrandId) return null;
    return catalog.waterBrands.find((item) => item.id === formState.waterBrandId) || null;
  }, [catalog, formState.waterBrandId]);

  const waterTargetFitHint = useMemo(() => (
    buildWaterTargetFitHint(language, copy, formState.targetProfileId, selectedWaterBrand)
  ), [copy, formState.targetProfileId, language, selectedWaterBrand]);

  const userFacingWaterBrands = useMemo(() => {
    if (!catalog) return [];
    return getUserFacingWaterBrands(catalog.waterBrands);
  }, [catalog]);

  const suggestedWaterBrands = useMemo(() => (
    getSuggestedWaterBrands(userFacingWaterBrands)
  ), [userFacingWaterBrands]);

  const pickerOptions = useMemo(() => {
    if (!catalog || !pickerKind) return [];
    if (pickerKind === 'process') return buildProcessPickerOptions(catalog, copy);
    if (pickerKind === 'variety') return buildVarietyPickerOptions(catalog, copy);
    if (pickerKind === 'water_brand') return buildWaterPickerOptions(userFacingWaterBrands, copy, language);
    if (pickerKind === 'dripper') return buildEquipmentPickerOptions(catalog.drippers, copy, 'dripper');
    return buildEquipmentPickerOptions(catalog.grinders, copy, 'grinder');
  }, [catalog, copy, pickerKind, userFacingWaterBrands]);

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
  }, [catalog, copy.acidity, copy.balance, copy.body, copy.sweetness]);

  const currentGenerationStage = generationProgress?.id || generationStage;
  const inputAnalysis = useMemo(() => {
    if (!catalog || !selectedDripper || !selectedGrinder) return null;
    try {
      const sanitized = sanitizeAiBrewFormState(formState, catalog);
      const nextMineralsReady = Boolean(
        sanitized.waterTdsPpm
        && sanitized.waterHardnessPpm
        && sanitized.waterAlkalinityPpm,
      );
      const deviceSelection = resolveDeviceProfileSelection(catalog, selectedDripper, sanitized.brewMode);
      const grinderSetting = resolveGrinderSettingReference(catalog, selectedGrinder, deviceSelection.profile, sanitized.brewMode);
      const waterStatusLabel = nextMineralsReady ? copy.waterReadyNow : copy.waterNeedsInput;
      const waterStatusTone = nextMineralsReady ? 'emerald' : 'amber';
      const waterDetail = formState.waterMode === 'brand' && selectedWaterBrand
        ? buildWaterChemistryLabel(selectedWaterBrand, language)
        : nextMineralsReady
          ? `TDS ${formState.waterTdsPpm} · GH ${formState.waterHardnessPpm} · KH ${formState.waterAlkalinityPpm}`
          : copy.waterRequired;
      const beanProfileSummary = buildBeanProfileSummary(formState);
      const beanProfileActive = Boolean(beanProfileSummary);
      const notes = [
        !formState.process ? copy.processOptionalNote : '',
        !formState.variety ? copy.varietyOptionalNote : '',
        !grinderSetting ? copy.noVerifiedGrinderSettingDetail : '',
        !beanProfileActive ? copy.beanProfileNeutral : '',
      ].filter(Boolean);

      return {
        profileTone: deviceSelection.mode === 'exact' ? 'blue' : 'amber',
        profileStatus: deviceSelection.mode === 'exact' ? copy.profileExactStatus : copy.profileFallbackStatus,
        profileLabel: deviceSelection.profile.label,
        grindTone: grinderSetting ? 'blue' : 'amber',
        grindStatus: grinderSetting ? copy.grindVerified : copy.grindFallback,
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
  const preferredBuilderMode = inferPreferredBuilderMode(formState);

  const mineralsReady = Boolean(formState.waterTdsPpm && formState.waterHardnessPpm && formState.waterAlkalinityPpm);
  const waterNeedsManualEntry = formState.waterMode === 'manual'
    || !selectedWaterBrand
    || selectedWaterBrand.presetStatus !== 'autofill'
    || formState.waterCustomized;
  const shouldShowMineralEditor = showMineralEditor || waterNeedsManualEntry;
  const canToggleMineralEditor = formState.waterMode === 'brand'
    && selectedWaterBrand?.presetStatus === 'autofill';

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
    setFormState((prev) => {
      let next = { ...prev, [key]: value };
      next = normalizeBeanProfileFieldMerge(next, key);
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
    setFormState((prev) => ({
      ...prev,
      waterMode: mode,
      waterCustomized: mode === 'manual' ? true : false,
      waterTdsPpm: mode === 'brand' && fallbackBrand
        ? fallbackPrefill.waterTdsPpm || prev.waterTdsPpm
        : prev.waterTdsPpm,
      waterHardnessPpm: mode === 'brand' && fallbackBrand
        ? fallbackPrefill.waterHardnessPpm || prev.waterHardnessPpm
        : prev.waterHardnessPpm,
      waterAlkalinityPpm: mode === 'brand' && fallbackBrand
        ? fallbackPrefill.waterAlkalinityPpm || prev.waterAlkalinityPpm
        : prev.waterAlkalinityPpm,
      waterNotes: mode === 'brand' && fallbackBrand ? (fallbackBrand.notes[0] || '') : prev.waterNotes,
    }));
    setShowMineralEditor(mode === 'manual' || fallbackBrand?.presetStatus !== 'autofill');
  }

  function applyWaterBrandSelection(brandId: string) {
    if (!catalog) return;
    const brand = catalog.waterBrands.find((item) => item.id === brandId);
    if (!brand) return;
    const prefill = buildWaterPrefillValues(brand);
    const knownFieldCount = countKnownWaterFields(brand);

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
    setShowMineralEditor(brand.presetStatus !== 'autofill');
    if (brand.presetStatus === 'autofill') {
      setNotice(copy.waterBrandAutofilled);
    } else if (knownFieldCount > 0) {
      setNotice(copy.waterBrandPartialFilled);
    } else {
      setNotice(copy.waterBrandNeedsManual);
    }
  }

  async function handleGeneratePlan() {
    if (!catalog) return;
    setFormError(null);
    setAiResponse(null);
    setAiError(null);
    clearSaveFeedback();

    if (formState.waterMode === 'brand' && !formState.waterBrandId) {
      setFormError(copy.waterNoBrand);
      return;
    }

    if (!mineralsReady) {
      setFormError(
        formState.waterMode === 'brand' && selectedWaterBrand?.presetStatus !== 'autofill'
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
      let nextPlan = await buildAiBrewPlanProgressively(formState, catalog, async (progress) => {
        latestProgress = progress;
        setGenerationProgress(progress);
        setGenerationStage(progress.id);
        await nextAnimationFrame(110);
      });
      if (isAuthenticated && !isOffline) {
        setGenerationProgress(createHybridAiSequenceProgress(nextPlan, latestProgress));
        setGenerationStage('hybrid_ai_sequence');
        await nextAnimationFrame(140);
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
              console.warn(getAiBrewSequenceFallbackMessage(language), hybridSequence.fallbackDiagnostics);
            }
          }
        } catch (error) {
          console.warn(getAiBrewSequenceFallbackMessage(language), error);
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
      setResultOpen(true);
      saveLastGeneratedBrewPlan(nextPlan);
      await saveBrewJournalEntry(journalEntry);
      await refreshSavedViews();
      setNotice(copy.generated);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : copy.unavailable);
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
    setShowProvenance(false);
    setAiResponse(null);
    setAiError(null);
    clearSaveFeedback();
    setFormError(null);
    setActiveJournalId(null);
    setShowMineralEditor(false);
    setShowBeanProfileEditor(false);
    setFormState(createDefaultAiBrewFormState(catalog));
  }

  async function handleSaveRecipe() {
    if (!plan || saving) return;
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

  async function runAiCoach(mode: AiCoachMode) {
    if (!plan) return;
    if (!isAuthenticated) {
      openAuthModal({ source: 'ai_brew' });
      setAiError(copy.aiGuest);
      return;
    }
    if (isOffline) {
      setAiError(copy.aiOffline);
      return;
    }

    setAiBusy(mode);
    setAiError(null);
    try {
      const prompt =
        mode === 'explain'
          ? buildExplainPrompt(plan, language)
          : mode === 'troubleshoot'
            ? buildTroubleshootPrompt(plan, language)
            : buildAdjustPrompt(plan, language);
      const requestContext = {
        responseProfile: {
          language,
          verbosity: 'comprehensive' as const,
          format: mode === 'troubleshoot' ? ('steps' as const) : ('bullets' as const),
          tone: 'professional' as const,
        },
        clientContext: {
          platform: (isPwa ? 'pwa' : 'web') as 'web' | 'pwa',
          surface: 'tools' as const,
          appLanguage: language,
        },
      };
      const lockedPrompt = withLanguageLock(prompt.body, language);
      const rawMarkdown = mode === 'troubleshoot'
        ? (await deepThinkingResponseDetailed(lockedPrompt, requestContext)).text
        : await raceChatResponse(lockedPrompt, requestContext);
      const markdown = await normalizeMarkdownToLanguage(rawMarkdown, language, requestContext);
      setAiResponse({ title: prompt.title, markdown });
      const nextPlan = mergeAiNotesIntoPlan(plan, { [mode]: markdown });
      setPlan(nextPlan);
      saveLastGeneratedBrewPlan(nextPlan);
      if (activeJournalId) {
        await updateBrewJournalAiNotes(activeJournalId, { [mode]: markdown });
        await refreshSavedViews();
      }
    } catch (error) {
      const fallbackMarkdown = buildDeterministicAiCoachMarkdown(plan, mode, language);
      setAiResponse({ title: getAiCoachTitle(copy, mode), markdown: fallbackMarkdown });
      const nextPlan = mergeAiNotesIntoPlan(plan, { [mode]: fallbackMarkdown });
      setPlan(nextPlan);
      saveLastGeneratedBrewPlan(nextPlan);
      if (activeJournalId) {
        await updateBrewJournalAiNotes(activeJournalId, { [mode]: fallbackMarkdown });
        await refreshSavedViews();
      }
      setAiError(null);
    } finally {
      setAiBusy(null);
    }
  }

  function hydrateFromPlan(nextPlan: BrewPlan) {
    if (!catalog) return;
    const nextForm = sanitizeAiBrewFormState(loadPlanIntoForm(nextPlan), catalog);
    setFormState(nextForm);
    setShowMineralEditor(nextForm.waterMode === 'manual' || nextForm.waterCustomized);
    setPlan(nextPlan);
    setShowProvenance(nextPlan.provenanceAttentionNeeded);
    setActiveJournalId(nextPlan.id);
    clearSaveFeedback();
    setActiveBuilderModal(null);
    setResultOpen(true);
    saveLastGeneratedBrewPlan(nextPlan);
    setAiResponse(selectDefaultAiResponse(copy, nextPlan.aiNotes, nextPlan, language));
    setAiError(null);
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
  const aiCoachDisabled = !plan || !isAuthenticated || isOffline || aiBusy !== null;
  const aiCoachReason = !plan
    ? null
    : isOffline
      ? copy.aiDisabledOffline
      : !isAuthenticated
        ? copy.aiDisabledGuest
        : null;

  function openBuilder(mode: FormMode) {
    if (!catalog) return;
    setFormError(null);
    setShowBeanProfileEditor(false);
    setActiveBuilderModal(mode);
  }

  function closeBuilder() {
    setActiveBuilderModal(null);
    setFormError(null);
    setShowBeanProfileEditor(false);
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
    const loadingSteps = [
      {
        key: 'inputs',
        label: id ? 'Memeriksa input dan alat' : 'Checking inputs and gear',
        start: 0,
        end: 1,
      },
      {
        key: 'calibration',
        label: id ? 'Menyesuaikan rasio, suhu, dan gilingan' : 'Calibrating ratio, temperature, and grind',
        start: 2,
        end: 3,
      },
      {
        key: 'sequence',
        label: id ? 'Menyusun urutan seduh final' : 'Building the final brew sequence',
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
          className="w-full max-w-md rounded-[1.5rem] border panel-divider-subtle bg-[var(--bg-base)] p-4 shadow-[0_24px_64px_rgba(15,23,42,0.28)] dark:shadow-[0_28px_72px_rgba(0,0,0,0.45)] lg:p-5"
          data-testid="ai-brew-generation-card"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
            <Loader2 size={20} className="animate-spin" />
          </div>

          <div className="mt-4 text-center">
            <p className="text-base font-semibold text-primary">
              {id ? 'Menyiapkan recipe brew' : 'Preparing your brew plan'}
            </p>
            <p className="mt-1 text-sm leading-6 text-secondary">{generationStageDetail}</p>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
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
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : state === 'active'
                        ? 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-200'
                        : 'border-slate-200/80 bg-white/80 text-secondary dark:border-white/10 dark:bg-white/5'
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
                      ? (id ? 'Selesai' : 'Done')
                      : state === 'active'
                        ? (id ? 'Berjalan' : 'Working')
                        : (id ? 'Berikutnya' : 'Next')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-secondary">
            <Clock3 size={13} className="text-blue-500" />
            <span>
              {id
                ? `Waktu ${elapsedLabel}. Hasil akan tampil otomatis saat siap.`
                : `Elapsed ${elapsedLabel}. Your brew plan will appear automatically when ready.`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  function renderBuilderDialog(mode: FormMode) {
    const isPro = mode === 'pro';
    const dialogTitle = `${copy.title} · ${isPro ? copy.proBuilderTitle : copy.quickBuilderTitle}`;

    return (
      <FocusLockedDialog
        open={activeBuilderModal === mode}
        onClose={closeBuilder}
        ariaLabel={dialogTitle}
        className="fixed inset-0 z-[111] h-[var(--fullscreen-modal-height)] max-h-[var(--fullscreen-modal-height)] overflow-hidden bg-[var(--bg-base)]/98 lg:inset-6 lg:mx-auto lg:h-auto lg:max-h-[calc(var(--fullscreen-modal-height)_-_3rem)] lg:max-w-5xl lg:rounded-[2rem] lg:border lg:border-glass lg:shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
      >
        <div className="relative flex h-full flex-col" data-testid={`ai-brew-builder-${mode}`}>
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3 pt-3 lg:px-6 lg:pb-6 lg:pt-6"
            style={{
              paddingTop: 'calc(12px + var(--safe-top, 0px))',
              paddingBottom: 'calc(28px + var(--bottom-safe-capped, 0px))',
            }}
          >
            <div className="space-y-4">
              <div className="relative rounded-[1.25rem] border panel-divider-subtle bg-surface-alpha/75 px-3.5 pb-3.5 pt-4 lg:px-5 lg:pb-4 lg:pt-5">
                <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[var(--panel-border-soft)] lg:hidden" />
                <button
                  type="button"
                  onClick={closeBuilder}
                  className="absolute right-3 top-3 icon-touch-button glass-button"
                  aria-label={copy.closeBuilder}
                  data-testid={`ai-brew-close-${mode}`}
                >
                  <X size={18} />
                </button>
                <div className="pr-12">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                    <Sparkles size={13} />
                    {isPro ? copy.proMode : copy.quickMode}
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-primary lg:text-xl">{dialogTitle}</h3>
                </div>

                <div className="mt-3 flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="w-full max-w-md">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary">{copy.modeHot} / {copy.modeIced}</p>
                    <div className="grid grid-cols-2 gap-2 rounded-[1.1rem] panel-soft p-1.5">
                      <button
                        type="button"
                        onClick={() => updateForm('brewMode', 'hot')}
                        className={`rounded-[0.95rem] px-4 py-2.5 text-sm font-medium transition-all ${formState.brewMode === 'hot' ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]' : 'text-secondary hover:text-primary'}`}
                        data-testid="ai-brew-builder-mode-hot"
                      >
                        {copy.modeHot}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateForm('brewMode', 'iced')}
                        className={`rounded-[0.95rem] px-4 py-2.5 text-sm font-medium transition-all ${formState.brewMode === 'iced' ? 'bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]' : 'text-secondary hover:text-primary'}`}
                        data-testid="ai-brew-builder-mode-iced"
                      >
                        {copy.modeIced}
                      </button>
                    </div>
                  </div>

                  {selectedTargetProfile && (
                    <div className="rounded-full bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-primary lg:max-w-xs">
                      {translateTargetProfileLabel(copy, selectedTargetProfile.id)}
                    </div>
                  )}
                </div>
              </div>

              {renderFeedback(true)}

              <div className={`grid gap-4 ${isPro ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}`}>
                <div className="glass-card p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Coffee size={16} className="text-blue-500" />
                    <h3 className="text-base font-semibold">{copy.quickMode} · {copy.coffeeTitle}</h3>
                  </div>
                  <div className="space-y-3.5">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.coffeeName}</label>
                      <input
                        type="text"
                        value={formState.coffeeName}
                        onChange={(event) => updateForm('coffeeName', event.target.value)}
                        placeholder={copy.coffeeNamePlaceholder}
                        aria-label={copy.coffeeName}
                        className="glass-input h-12 w-full px-4 text-base"
                        data-testid="ai-brew-coffee-name"
                        data-autofocus="true"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.dose}</label>
                        <input
                          type="number"
                          min="8"
                          max="40"
                          step="0.1"
                          value={formState.doseG}
                          onChange={(event) => updateForm('doseG', event.target.value)}
                          aria-label={copy.dose}
                          className="glass-input h-12 w-full px-4 text-base"
                          data-testid="ai-brew-dose"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.roast}</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {ROAST_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateForm('roastLevel', option.value as AiBrewFormState['roastLevel'])}
                              className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${formState.roastLevel === option.value ? 'bg-blue-600 text-white' : 'bg-surface-alpha text-secondary hover:text-primary'}`}
                            >
                              {localizeAiBrewRoastLabel(option.value, language)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.1rem] border panel-divider-subtle panel-soft p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <Target size={15} className="text-emerald-500" />
                        <h4 className="text-sm font-semibold uppercase tracking-widest text-secondary">{copy.profileTitle}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {targetOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => updateForm('targetProfileId', option.id)}
                            className={`rounded-[0.9rem] border p-3 text-left transition-all ${formState.targetProfileId === option.id ? 'border-blue-500/25 bg-blue-500/10 shadow-[0_12px_26px_rgba(37,99,235,0.14)]' : 'border-[var(--panel-border-soft)] bg-surface-alpha hover:border-blue-500/20'}`}
                          >
                            <p className="text-sm font-semibold leading-5">{option.translatedLabel}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Beaker size={16} className="text-amber-500" />
                    <h3 className="text-base font-semibold">{copy.quickMode} · {copy.equipmentTitle}</h3>
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
                                        {selectedWaterBrand.presetStatus === 'autofill' ? copy.waterReadyBrew : copy.waterNeedsMinerals}
                                      </span>
                                      {isEstimatedWaterBaseline(selectedWaterBrand) && (
                                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                          {copy.waterBrandEstimated}
                                        </span>
                                      )}
                                      <span className="rounded-full bg-[var(--bg-base)] px-2 py-1 text-[11px] font-medium text-secondary">
                                      {localizeAiBrewWaterClassificationLabel(selectedWaterBrand.classificationLabel, language)}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-xs text-secondary">{buildWaterChemistryLabel(selectedWaterBrand, language)}</p>
                                    {waterTargetFitHint && (
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
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.tds}</label>
                                <input
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
                              {isPro && (
                                <div>
                                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-secondary">{copy.waterNotes}</label>
                                  <input
                                    type="text"
                                    value={formState.waterNotes}
                                    onChange={(event) => updateForm('waterNotes', event.target.value)}
                                    placeholder={copy.waterNotesPlaceholder}
                                    className="glass-input h-12 w-full px-4 text-base"
                                    data-testid="ai-brew-water-notes"
                                  />
                                </div>
                              )}
                            </div>
                            {catalog && (
                              <div className="mt-3 rounded-xl bg-surface-alpha px-3 py-3 text-xs text-secondary">
                                <p className="font-semibold text-primary">{copy.waterGuidance}</p>
                                <p className="mt-1">
                                  TDS {catalog.waterGuidance.recommended.tdsPpm[0]}-{catalog.waterGuidance.recommended.tdsPpm[1]}
                                  {' · '}GH {catalog.waterGuidance.recommended.hardnessPpm[0]}-{catalog.waterGuidance.recommended.hardnessPpm[1]}
                                  {' · '}KH {catalog.waterGuidance.recommended.alkalinityPpm[0]}-{catalog.waterGuidance.recommended.alkalinityPpm[1]}
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
                <div className="glass-card p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-blue-500" />
                    <h3 className="text-base font-semibold">{copy.proDetails}</h3>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
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
                            type="text"
                            value={formState.customVariety}
                            onChange={(event) => updateForm('customVariety', event.target.value)}
                            aria-label={copy.otherVariety}
                            className="glass-input h-12 w-full px-4 text-base"
                            data-testid="ai-brew-variety-custom"
                          />
                        </div>
                      )}

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

                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
          <div
            className="shrink-0 border-t panel-divider-subtle bg-[var(--bg-base)] px-3 py-3 lg:px-6 lg:py-4"
            style={{ paddingBottom: 'calc(12px + var(--bottom-safe-capped, 0px))' }}
            data-testid="ai-brew-builder-footer"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => { void handleGeneratePlan(); }}
                disabled={!catalog || generationBusy}
                className="inline-flex h-12 min-w-[10rem] flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(37,99,235,0.24)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-55 sm:flex-none"
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
              {!mineralsReady && (
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
    <div className="space-y-5" data-testid="ai-brew-panel">
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
                className="rounded-[1.4rem] border border-blue-500/20 bg-blue-500/10 p-4 text-left transition-all hover:border-blue-500/35 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="ai-brew-open-quick"
              >
                <div className="text-base font-semibold text-primary">{copy.quickMode}</div>
              </button>
              <button
                type="button"
                onClick={() => openBuilder('pro')}
                disabled={!catalog}
                className="rounded-[1.4rem] border border-[var(--panel-border-soft)] bg-surface-alpha p-4 text-left transition-all hover:border-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="ai-brew-open-pro"
              >
                <div className="text-base font-semibold text-primary">{copy.proMode}</div>
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
                        {plan.brewMode === 'iced' ? copy.modeIced : copy.modeHot}
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
                        <p className="mt-1 text-xs text-secondary">{preset.plan.dripper.name} · {localizeAiBrewTargetProfile(preset.plan.targetProfileId, preset.plan.targetProfileLabel, language)}</p>
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
                    onClick={() => hydrateFromPlan(entry.plan)}
                    className="flex w-full items-start justify-between gap-3 rounded-2xl bg-surface-alpha px-3 py-3 text-left transition-colors hover:bg-surface-alpha-hover"
                    data-testid={index === 0 ? 'ai-brew-history-item' : `ai-brew-history-item-${index}`}
                    aria-label={`${copy.loadRecent}: ${entry.title}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-primary">{entry.title}</p>
                      <p className="mt-1 text-xs text-secondary">{entry.plan.brewMode === 'iced' ? copy.modeIced : copy.modeHot} · {entry.plan.dripper.name}</p>
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
          closeLabel={copy.pickerClose}
          searchLabel={copy.pickerSearchLabel}
          description={copy.pickerHelp}
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
        plan={plan}
        currentPreset={currentPreset}
        aiCoachDisabled={aiCoachDisabled}
        aiCoachReason={aiCoachReason}
        aiBusy={aiBusy}
        aiResponse={aiResponse}
        aiError={aiError}
        saving={saving}
        saveSuccess={saveSuccess}
        saveError={saveError}
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
        onRunAiCoach={(mode) => { void runAiCoach(mode); }}
        onOpenAuth={() => openAuthModal({ source: 'ai_brew' })}
      />
    </div>
  );
}




























