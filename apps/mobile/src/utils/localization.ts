import {
  getLanguageDirection,
  getLanguageLocale,
  getTranslations,
  isSupportedLanguage,
  type Translations,
} from '../web-shared/constants';
import type { Language } from '../web-shared/types';

type MobileHomeCopy = {
  quickPrompts: string[];
  searchStatus: {
    sending: string;
    checking: string;
    preparing: string;
    retry: string;
    ready: string;
    signIn: string;
  };
  auth: {
    offlineTitle: string;
    offlineBody: string;
    expiredTitle: string;
    expiredBody: string;
    signedInTitle: string;
    signInTitle: string;
    signInBodyGuest: string;
    signInBodyCloud: string;
  };
  search: {
    signInRequired: string;
    reconnectRequired: string;
    insufficientSources: string;
    retry: string;
    deepFallback: string;
    sources: (count: number) => string;
    groundedSources: (count: number) => string;
    groundedResult: string;
    retrieved: (time: string) => string;
  };
  sections: {
    quickPathsTitle: string;
    quickPathsSubtitle: string;
    accountTitle: string;
    accessTitle: string;
    guestAccessBody: string;
    latestResultTitle: string;
    latestResultSubtitle: string;
    openResult: string;
    saved: string;
    readyToSave: string;
    share: string;
    noResultYet: string;
    logOut: string;
    openingGoogle: string;
    openingApple: string;
  };
};

type MobileChatCopy = {
  helpers: {
    notSavedYet: string;
    deviceOnly: string;
    savedLocally: string;
    resetLocalDefaults: string;
    unsavedChanges: string;
    nearSafeLimit: string;
    transcriptAttached: string;
    you: string;
    more: string;
    playVoice: string;
    stopVoice: string;
    playAudio: string;
    stopAudio: string;
    open: string;
    save: string;
    rename: string;
    delete: string;
    add: string;
    noFolder: string;
    noFoldersYet: string;
    hideOptions: string;
    showOptions: string;
    saveMemory: string;
    saving: string;
    reset: string;
    savedLocallyButton: string;
    generate: string;
    generating: string;
    useInChat: string;
    noImagesYet: string;
    noImagesSubtitle: string;
    noImagesHint: string;
    sources: string;
    preview: string;
    previewSubtitle: string;
    sourcesSubtitle: string;
    messageActions: string;
    deepThinking: string;
    preparingResponse: string;
    preparingNextMessage: string;
    sendingMessage: string;
    processingRequest: string;
    sendMessage: string;
    openChatTools: string;
    recordVoiceNote: string;
    stopRecordingVoiceNote: string;
    voiceNote: string;
    image: string;
    gallery: string;
    camera: string;
    files: string;
    openMemory: string;
    useIndonesian: string;
    useEnglish: string;
    beConcise: string;
    beDetailed: string;
    yourName: string;
    assistantName: string;
    customLanguageCode: string;
    workspaceRole: string;
    workflowFocus: string;
    styleNotes: string;
    blockedWords: string;
    describeGeneratedImage: string;
    sessionsCount: (count: number) => string;
    languageAuto: string;
    defaultName: string;
    defaultAssistantName: string;
    adaptiveDetail: string;
    flexibleFormat: string;
    neutralTone: string;
    noWorkspaceRole: string;
    noWorkflowFocus: string;
    styleNoteSaved: string;
    noStyleNotes: string;
    defaultEmoji: string;
    blockedWordsCount: (count: number) => string;
    noBlockedWords: string;
    languageSummary: (code: string) => string;
    callYou: (name: string) => string;
    detailSummary: (value: string) => string;
    formatSummary: (value: string) => string;
    toneSummary: (value: string) => string;
    recordingVoiceNote: (elapsed: string) => string;
    stopVoiceNote: (elapsed: string) => string;
    sourcesCount: (count: number) => string;
  };
  header: {
    signedOut: string;
    offline: string;
    ready: string;
  };
  status: {
    needsAttention: string;
    signedOutBody: string;
    offlineTitle: string;
    offlineBody: string;
    savedTitle: string;
    savedBody: string;
  };
  sheets: {
    historySubtitle: string;
    newChatSubtitle: string;
    sessionsTitle: string;
    sessionsSubtitle: string;
    emptySessionPreview: string;
    renameSessionPlaceholder: string;
    foldersTitle: string;
    foldersSubtitle: string;
    folderNamePlaceholder: string;
    renameFolderPlaceholder: string;
    workspaceTitle: string;
    workspaceSubtitle: string;
    attachTitle: string;
    attachSubtitle: string;
    createTitle: string;
    createSubtitle: string;
    memoryTitle: string;
    memorySubtitle: string;
    latestReplyTitle: string;
    latestReplySubtitle: string;
    goToTitle: string;
    goToSubtitle: string;
    quickActionsTitle: string;
    quickActionsSubtitle: string;
    identityTitle: string;
    replyDefaultsTitle: string;
    workflowTitle: string;
    guardrailsTitle: string;
    applyChangesTitle: string;
    applyChangesSubtitle: string;
    imageStudioSubtitle: string;
    generateImageTitle: string;
    generateImageSubtitle: string;
  };
};

type MobileLocaleBundle = {
  home: MobileHomeCopy;
  chat: MobileChatCopy;
};

const EN_HOME: MobileHomeCopy = {
  quickPrompts: [
    'Latest hand brew grinder recommendations',
    'Compare V60 vs April dripper tradeoffs',
    'Current arabica coffee price trend',
    'Best workflow to dial in espresso faster',
  ],
  searchStatus: {
    sending: 'Sending request',
    checking: 'Checking sources',
    preparing: 'Preparing answer',
    retry: 'Needs retry',
    ready: 'Ready to search',
    signIn: 'Sign in to search',
  },
  auth: {
    offlineTitle: 'Offline mode',
    offlineBody: 'Cached access is still open. Live search resumes after reconnect.',
    expiredTitle: 'Session expired',
    expiredBody: 'Sign in again to restore live search and cloud save.',
    signedInTitle: 'Signed in',
    signInTitle: 'Sign in for live search',
    signInBodyGuest: 'Guest tools stay open.',
    signInBodyCloud: 'Cloud actions need sign in.',
  },
  search: {
    signInRequired: 'Please sign in to search live sources.',
    reconnectRequired: 'Live web search unavailable. Please reconnect and retry.',
    insufficientSources: 'Insufficient live sources.',
    retry: 'Live search unavailable. Please retry.',
    deepFallback: 'Live web search unavailable. Showing Deep fallback.',
    sources: (count) => `${count} sources`,
    groundedSources: (count) => `${count} grounded sources`,
    groundedResult: 'Grounded result',
    retrieved: (time) => `Retrieved ${time}`,
  },
  sections: {
    quickPathsTitle: 'Quick paths',
    quickPathsSubtitle: 'Jump straight into the main workflows.',
    accountTitle: 'Account',
    accessTitle: 'Access',
    guestAccessBody: 'Guest tools stay available. Sign in to search and save.',
    latestResultTitle: 'Latest result',
    latestResultSubtitle: 'Open the full result sheet',
    openResult: 'Open result',
    saved: 'Saved',
    readyToSave: 'Ready to save',
    share: 'Share',
    noResultYet: 'No result yet.',
    logOut: 'Log out',
    openingGoogle: 'Opening Google...',
    openingApple: 'Opening Apple...',
  },
};

const EN_CHAT: MobileChatCopy = {
  helpers: {
    notSavedYet: 'Not saved yet',
    deviceOnly: 'Stored on this device only.',
    savedLocally: 'Saved locally',
    resetLocalDefaults: 'Reset to local defaults',
    unsavedChanges: 'Unsaved changes',
    nearSafeLimit: 'Near the safe input limit.',
    transcriptAttached: 'Transcript attached',
    you: 'You',
    more: 'More',
    playVoice: 'Play Voice',
    stopVoice: 'Stop Voice',
    playAudio: 'Play Audio',
    stopAudio: 'Stop Audio',
    open: 'Open',
    save: 'Save',
    rename: 'Rename',
    delete: 'Delete',
    add: 'Add',
    noFolder: 'No Folder',
    noFoldersYet: 'No folders yet.',
    hideOptions: 'Hide options',
    showOptions: 'Show options',
    saveMemory: 'Save Memory',
    saving: 'Saving...',
    reset: 'Reset',
    savedLocallyButton: 'Saved Locally',
    generate: 'Generate',
    generating: 'Generating...',
    useInChat: 'Use in Chat',
    noImagesYet: 'No images yet',
    noImagesSubtitle: 'Generated images will appear here.',
    noImagesHint: 'Use a short prompt and keep it aligned with the chat task.',
    sources: 'Sources',
    preview: 'Preview',
    previewSubtitle: 'Secondary actions move here instead of crowding the thread.',
    sourcesSubtitle: 'Open the grounded references.',
    messageActions: 'Message Actions',
    deepThinking: 'Deep Thinking',
    preparingResponse: 'Preparing response',
    preparingNextMessage: 'Preparing the next message.',
    sendingMessage: 'Sending your message...',
    processingRequest: 'Processing your request...',
    sendMessage: 'Send message',
    openChatTools: 'Open chat tools',
    recordVoiceNote: 'Record voice note',
    stopRecordingVoiceNote: 'Stop recording voice note',
    voiceNote: 'Voice Note',
    image: 'Image',
    gallery: 'Gallery',
    camera: 'Camera',
    files: 'Files',
    openMemory: 'Open Memory',
    useIndonesian: 'Use Indonesian',
    useEnglish: 'Use English',
    beConcise: 'Be concise',
    beDetailed: 'Be detailed',
    yourName: 'Your name',
    assistantName: 'Assistant name',
    customLanguageCode: 'Custom language code',
    workspaceRole: 'Workspace role',
    workflowFocus: 'Workflow focus',
    styleNotes: 'Style notes',
    blockedWords: 'Blocked words',
    describeGeneratedImage: 'Describe generated coffee image...',
    sessionsCount: (count) => `${count} sessions`,
    languageAuto: 'Auto language',
    defaultName: 'Default name',
    defaultAssistantName: 'Default assistant name',
    adaptiveDetail: 'Adaptive detail',
    flexibleFormat: 'Flexible format',
    neutralTone: 'Neutral tone',
    noWorkspaceRole: 'No workspace role',
    noWorkflowFocus: 'No workflow focus',
    styleNoteSaved: 'Style note saved',
    noStyleNotes: 'No style notes',
    defaultEmoji: 'Default emoji',
    blockedWordsCount: (count) => `${count} blocked words`,
    noBlockedWords: 'No blocked words',
    languageSummary: (code) => `Language ${code.toUpperCase()}`,
    callYou: (name) => `Call you ${name}`,
    detailSummary: (value) => `${value} detail`,
    formatSummary: (value) => `${value} format`,
    toneSummary: (value) => `${value} tone`,
    recordingVoiceNote: (elapsed) => `Recording voice note • ${elapsed}`,
    stopVoiceNote: (elapsed) => `Stop ${elapsed}`,
    sourcesCount: (count) => `${count} sources`,
  },
  header: {
    signedOut: 'Sign in to send messages, save replies, and keep chat history.',
    offline: 'Reconnect to send, speak, or generate.',
    ready: 'Ask for recipes, troubleshooting, or workflow review.',
  },
  status: {
    needsAttention: 'Needs attention',
    signedOutBody: 'History stays visible, but send, voice, and image tools still require sign in.',
    offlineTitle: 'Offline mode',
    offlineBody: 'You can browse sessions, but send, voice, and image features wait for reconnect.',
    savedTitle: 'Saved to Collection',
    savedBody: 'Latest assistant response is ready in Collection.',
  },
  sheets: {
    historySubtitle: 'Sessions and folders',
    newChatSubtitle: 'Create and switch threads.',
    sessionsTitle: 'Sessions',
    sessionsSubtitle: 'Move, rename, or open a thread.',
    emptySessionPreview: 'Start a message to build this thread.',
    renameSessionPlaceholder: 'Rename session',
    foldersTitle: 'Folders',
    foldersSubtitle: 'Group sessions without leaving chat.',
    folderNamePlaceholder: 'Folder name',
    renameFolderPlaceholder: 'Rename folder',
    workspaceTitle: 'Workspace',
    workspaceSubtitle: 'Attach, save, or jump to another tab.',
    attachTitle: 'Attach',
    attachSubtitle: 'Keep media and files close.',
    createTitle: 'Create',
    createSubtitle: 'Voice and image tools stay off the thread.',
    memoryTitle: 'Memory & Identity',
    memorySubtitle: 'Stored on this device only.',
    latestReplyTitle: 'Latest reply',
    latestReplySubtitle: 'Reuse the newest response.',
    goToTitle: 'Go To',
    goToSubtitle: 'Keep navigation parity with the web app.',
    quickActionsTitle: 'Quick actions',
    quickActionsSubtitle: 'Apply durable defaults across new chats.',
    identityTitle: 'Identity',
    replyDefaultsTitle: 'Reply Defaults',
    workflowTitle: 'Workflow Context',
    guardrailsTitle: 'Guardrails',
    applyChangesTitle: 'Apply Changes',
    applyChangesSubtitle: 'Saved to this device only. Reinstall or another device starts fresh.',
    imageStudioSubtitle: 'Generate and reuse visuals in the same thread.',
    generateImageTitle: 'Generate Image',
    generateImageSubtitle: 'Keep prompts short and production-ready.',
  },
};

function buildDerivedHomeCopy(language: Language): MobileHomeCopy {
  const web = getTranslations(language);
  return {
    ...EN_HOME,
    searchStatus: {
      ...EN_HOME.searchStatus,
      preparing: web.analyzing || EN_HOME.searchStatus.preparing,
      retry: web.retry || EN_HOME.searchStatus.retry,
      signIn: web.signIn || EN_HOME.searchStatus.signIn,
    },
    auth: {
      ...EN_HOME.auth,
      signedInTitle: web.signedIn || EN_HOME.auth.signedInTitle,
      signInTitle: web.signInRequired || EN_HOME.auth.signInTitle,
      signInBodyCloud: web.chatSigninRequiredMessage || EN_HOME.auth.signInBodyCloud,
    },
    search: {
      ...EN_HOME.search,
      signInRequired: web.chatSigninRequiredMessage || web.authModalTitle || EN_HOME.search.signInRequired,
      retry: web.homeLiveSearchRetry || EN_HOME.search.retry,
      deepFallback: web.homeLiveSearchUnavailable || EN_HOME.search.deepFallback,
      groundedResult: web.homeAiSummary || EN_HOME.search.groundedResult,
    },
    sections: {
      ...EN_HOME.sections,
      accountTitle: web.signedIn || EN_HOME.sections.accountTitle,
      accessTitle: web.signIn || EN_HOME.sections.accessTitle,
      latestResultTitle: web.homeSearchResult || EN_HOME.sections.latestResultTitle,
      openResult: web.opening || EN_HOME.sections.openResult,
      logOut: web.signOut || EN_HOME.sections.logOut,
    },
  };
}

function buildDerivedChatCopy(language: Language): MobileChatCopy {
  const web = getTranslations(language);
  const blockedWordsTemplate = web.chatMemoryBlockedWordsCount || '';
  return {
    ...EN_CHAT,
    helpers: {
      ...EN_CHAT.helpers,
      notSavedYet: web.chatMemoryNotSavedYet || EN_CHAT.helpers.notSavedYet,
      savedLocally: web.chatMemorySaved || EN_CHAT.helpers.savedLocally,
      resetLocalDefaults: web.chatMemoryResetLocalDefaults || EN_CHAT.helpers.resetLocalDefaults,
      unsavedChanges: web.chatMemoryUnsavedChanges || EN_CHAT.helpers.unsavedChanges,
      save: web.save || EN_CHAT.helpers.save,
      rename: web.collectionRename || web.edit || EN_CHAT.helpers.rename,
      delete: web.delete || EN_CHAT.helpers.delete,
      add: web.confirm || EN_CHAT.helpers.add,
      noFolder: web.noFolder || EN_CHAT.helpers.noFolder,
      noFoldersYet: web.noItems || EN_CHAT.helpers.noFoldersYet,
      hideOptions: web.cancel || EN_CHAT.helpers.hideOptions,
      saveMemory: web.save || EN_CHAT.helpers.saveMemory,
      saving: web.connecting || EN_CHAT.helpers.saving,
      reset: web.reset || EN_CHAT.helpers.reset,
      savedLocallyButton: web.chatMemorySaved || EN_CHAT.helpers.savedLocallyButton,
      generate: web.chatGenerateImage || EN_CHAT.helpers.generate,
      generating: web.chatGeneratingImage || EN_CHAT.helpers.generating,
      sources: web.chatSources || EN_CHAT.helpers.sources,
      deepThinking: web.deepThink || EN_CHAT.helpers.deepThinking,
      sendMessage: web.chatSendMessageAria || EN_CHAT.helpers.sendMessage,
      gallery: web.chatComposerPhoto || EN_CHAT.helpers.gallery,
      camera: web.chatComposerCamera || EN_CHAT.helpers.camera,
      files: web.chatComposerFile || EN_CHAT.helpers.files,
      useIndonesian: web.chatLanguagePresetId || EN_CHAT.helpers.useIndonesian,
      useEnglish: web.chatLanguagePresetEn || EN_CHAT.helpers.useEnglish,
      beConcise: web.chatBeConcise || EN_CHAT.helpers.beConcise,
      beDetailed: web.chatBeDetailed || EN_CHAT.helpers.beDetailed,
      yourName: web.yourName || EN_CHAT.helpers.yourName,
      assistantName: web.assistantName || EN_CHAT.helpers.assistantName,
      customLanguageCode: web.chatLanguageCodePlaceholder || EN_CHAT.helpers.customLanguageCode,
      languageAuto: web.chatMemoryLanguageAuto || EN_CHAT.helpers.languageAuto,
      noWorkspaceRole: web.chatMemoryNoWorkspaceRole || EN_CHAT.helpers.noWorkspaceRole,
      noWorkflowFocus: web.chatMemoryNoWorkflowFocus || EN_CHAT.helpers.noWorkflowFocus,
      styleNoteSaved: web.chatMemoryStyleNoteSaved || EN_CHAT.helpers.styleNoteSaved,
      noStyleNotes: web.chatMemoryNoStyleNotes || EN_CHAT.helpers.noStyleNotes,
      blockedWordsCount: (count) => blockedWordsTemplate
        ? blockedWordsTemplate.replace('{count}', String(count))
        : EN_CHAT.helpers.blockedWordsCount(count),
      noBlockedWords: web.chatMemoryNoBlockedWords || EN_CHAT.helpers.noBlockedWords,
      sourcesSubtitle: web.chatSources || EN_CHAT.helpers.sourcesSubtitle,
    },
    header: {
      ...EN_CHAT.header,
      signedOut: web.chatSigninRequiredMessage || EN_CHAT.header.signedOut,
    },
    status: {
      ...EN_CHAT.status,
      signedOutBody: web.chatSigninRequiredMessage || EN_CHAT.status.signedOutBody,
      savedTitle: web.chatSavedToCollection || EN_CHAT.status.savedTitle,
    },
    sheets: {
      ...EN_CHAT.sheets,
      renameSessionPlaceholder: web.collectionRename || EN_CHAT.sheets.renameSessionPlaceholder,
      foldersTitle: web.folderLabel || EN_CHAT.sheets.foldersTitle,
      folderNamePlaceholder: web.folderName || EN_CHAT.sheets.folderNamePlaceholder,
      renameFolderPlaceholder: web.collectionRename || EN_CHAT.sheets.renameFolderPlaceholder,
      memoryTitle: web.chatIdentity || EN_CHAT.sheets.memoryTitle,
      identityTitle: web.chatIdentity || EN_CHAT.sheets.identityTitle,
      replyDefaultsTitle: web.chatReplyDefaults || EN_CHAT.sheets.replyDefaultsTitle,
      guardrailsTitle: web.settings || EN_CHAT.sheets.guardrailsTitle,
      generateImageTitle: web.chatGenerateImage || EN_CHAT.sheets.generateImageTitle,
    },
  };
}

const MOBILE_LOCALE_BUNDLES: Record<Language, MobileLocaleBundle> = {
  en: { home: EN_HOME, chat: EN_CHAT },
  id: {
    home: {
      ...EN_HOME,
      quickPrompts: [
        'Rekomendasi grinder hand brew terbaru',
        'Bandingkan tradeoff V60 vs April dripper',
        'Tren harga kopi arabika saat ini',
        'Workflow terbaik untuk dial in espresso lebih cepat',
      ],
      searchStatus: {
        sending: 'Mengirim permintaan',
        checking: 'Memeriksa sumber',
        preparing: 'Menyiapkan jawaban',
        retry: 'Perlu coba lagi',
        ready: 'Siap mencari',
        signIn: 'Masuk untuk mencari',
      },
      auth: {
        offlineTitle: 'Mode offline',
        offlineBody: 'Akses cache masih terbuka. Pencarian langsung kembali setelah tersambung.',
        expiredTitle: 'Sesi berakhir',
        expiredBody: 'Masuk lagi untuk memulihkan pencarian langsung dan simpan cloud.',
        signedInTitle: 'Sudah masuk',
        signInTitle: 'Masuk untuk pencarian langsung',
        signInBodyGuest: 'Alat tamu tetap terbuka.',
        signInBodyCloud: 'Aksi cloud memerlukan masuk.',
      },
      search: {
        signInRequired: 'Silakan masuk untuk mencari sumber langsung.',
        reconnectRequired: 'Pencarian web langsung tidak tersedia. Sambungkan kembali lalu coba lagi.',
        insufficientSources: 'Sumber langsung tidak mencukupi.',
        retry: 'Pencarian langsung tidak tersedia. Silakan coba lagi.',
        deepFallback: 'Pencarian web langsung tidak tersedia. Menampilkan fallback Deep.',
        sources: (count) => `${count} sumber`,
        groundedSources: (count) => `${count} sumber terverifikasi`,
        groundedResult: 'Hasil terverifikasi',
        retrieved: (time) => `Diambil ${time}`,
      },
      sections: {
        quickPathsTitle: 'Jalur cepat',
        quickPathsSubtitle: 'Masuk langsung ke workflow utama.',
        accountTitle: 'Akun',
        accessTitle: 'Akses',
        guestAccessBody: 'Alat tamu tetap tersedia. Masuk untuk mencari dan menyimpan.',
        latestResultTitle: 'Hasil terbaru',
        latestResultSubtitle: 'Buka lembar hasil lengkap',
        openResult: 'Buka hasil',
        saved: 'Tersimpan',
        readyToSave: 'Siap disimpan',
        share: 'Bagikan',
        noResultYet: 'Belum ada hasil.',
        logOut: 'Keluar',
        openingGoogle: 'Membuka Google...',
        openingApple: 'Membuka Apple...',
      },
    },
    chat: {
      ...EN_CHAT,
      helpers: {
        ...EN_CHAT.helpers,
        notSavedYet: 'Belum disimpan',
        deviceOnly: 'Tersimpan hanya di perangkat ini.',
        savedLocally: 'Tersimpan lokal',
        resetLocalDefaults: 'Direset ke default lokal',
        unsavedChanges: 'Perubahan belum disimpan',
        nearSafeLimit: 'Mendekati batas input aman.',
        transcriptAttached: 'Transkrip terlampir',
        more: 'Lainnya',
        playVoice: 'Putar suara',
        stopVoice: 'Hentikan suara',
        playAudio: 'Putar audio',
        stopAudio: 'Hentikan audio',
        open: 'Buka',
        save: 'Simpan',
        rename: 'Ubah nama',
        delete: 'Hapus',
        add: 'Tambah',
        noFolder: 'Tanpa folder',
        noFoldersYet: 'Belum ada folder.',
        hideOptions: 'Sembunyikan opsi',
        showOptions: 'Tampilkan opsi',
        saveMemory: 'Simpan memori',
        saving: 'Menyimpan...',
        reset: 'Reset',
        savedLocallyButton: 'Tersimpan lokal',
        generate: 'Buat',
        generating: 'Membuat...',
        useInChat: 'Pakai di chat',
        noImagesYet: 'Belum ada gambar',
        noImagesSubtitle: 'Gambar hasil akan muncul di sini.',
        noImagesHint: 'Gunakan prompt singkat dan tetap selaras dengan tugas chat.',
        sources: 'Sumber',
        preview: 'Pratinjau',
        previewSubtitle: 'Aksi sekunder dipindah ke sini agar thread tetap rapi.',
        sourcesSubtitle: 'Buka referensi yang menjadi dasar jawaban.',
        messageActions: 'Aksi pesan',
        deepThinking: 'Deep Thinking',
        preparingResponse: 'Menyiapkan respons',
        preparingNextMessage: 'Menyiapkan pesan berikutnya.',
        sendingMessage: 'Mengirim pesan Anda...',
        processingRequest: 'Memproses permintaan Anda...',
        sendMessage: 'Kirim pesan',
        openChatTools: 'Buka alat chat',
        recordVoiceNote: 'Rekam catatan suara',
        stopRecordingVoiceNote: 'Hentikan rekam catatan suara',
        voiceNote: 'Catatan suara',
        image: 'Gambar',
        gallery: 'Galeri',
        camera: 'Kamera',
        files: 'Berkas',
        openMemory: 'Buka memori',
        useIndonesian: 'Pakai Bahasa Indonesia',
        useEnglish: 'Pakai bahasa Inggris',
        beConcise: 'Buat ringkas',
        beDetailed: 'Buat detail',
        yourName: 'Nama Anda',
        assistantName: 'Nama asisten',
        customLanguageCode: 'Kode bahasa khusus',
        workspaceRole: 'Peran workspace',
        workflowFocus: 'Fokus workflow',
        styleNotes: 'Catatan gaya',
        blockedWords: 'Kata yang diblokir',
        describeGeneratedImage: 'Jelaskan gambar kopi yang ingin dibuat...',
        sessionsCount: (count) => `${count} sesi`,
        languageAuto: 'Bahasa otomatis',
        defaultName: 'Nama default',
        defaultAssistantName: 'Nama asisten default',
        adaptiveDetail: 'Detail adaptif',
        flexibleFormat: 'Format fleksibel',
        neutralTone: 'Nada netral',
        noWorkspaceRole: 'Belum ada peran workspace',
        noWorkflowFocus: 'Belum ada fokus workflow',
        styleNoteSaved: 'Catatan gaya tersimpan',
        noStyleNotes: 'Belum ada catatan gaya',
        defaultEmoji: 'Emoji default',
        blockedWordsCount: (count) => `${count} kata diblokir`,
        noBlockedWords: 'Tidak ada kata diblokir',
        languageSummary: (code) => `Bahasa ${code.toUpperCase()}`,
        callYou: (name) => `Panggil Anda ${name}`,
        detailSummary: (value) => `detail ${value}`,
        formatSummary: (value) => `format ${value}`,
        toneSummary: (value) => `nada ${value}`,
        recordingVoiceNote: (elapsed) => `Merekam catatan suara • ${elapsed}`,
        stopVoiceNote: (elapsed) => `Hentikan ${elapsed}`,
        sourcesCount: (count) => `${count} sumber`,
      },
      header: {
        signedOut: 'Masuk untuk mengirim pesan, menyimpan balasan, dan menyimpan riwayat chat.',
        offline: 'Sambungkan kembali untuk mengirim, berbicara, atau membuat gambar.',
        ready: 'Minta resep, troubleshooting, atau review workflow.',
      },
      status: {
        needsAttention: 'Perlu perhatian',
        signedOutBody: 'Riwayat tetap terlihat, tetapi alat kirim, suara, dan gambar tetap memerlukan masuk.',
        offlineTitle: 'Mode offline',
        offlineBody: 'Anda masih bisa melihat sesi, tetapi fitur kirim, suara, dan gambar menunggu koneksi kembali.',
        savedTitle: 'Tersimpan ke Collection',
        savedBody: 'Respons asisten terbaru siap di Collection.',
      },
      sheets: {
        ...EN_CHAT.sheets,
        historySubtitle: 'Sesi dan folder',
        newChatSubtitle: 'Buat dan pindah thread.',
        sessionsTitle: 'Sesi',
        sessionsSubtitle: 'Pindahkan, ubah nama, atau buka thread.',
        emptySessionPreview: 'Mulai pesan untuk membangun thread ini.',
        renameSessionPlaceholder: 'Ubah nama sesi',
        foldersTitle: 'Folder',
        foldersSubtitle: 'Kelompokkan sesi tanpa keluar dari chat.',
        folderNamePlaceholder: 'Nama folder',
        renameFolderPlaceholder: 'Ubah nama folder',
        workspaceTitle: 'Workspace',
        workspaceSubtitle: 'Lampirkan, simpan, atau lompat ke tab lain.',
        attachTitle: 'Lampirkan',
        attachSubtitle: 'Simpan media dan berkas tetap dekat.',
        createTitle: 'Buat',
        createSubtitle: 'Alat suara dan gambar tetap di luar thread.',
        memoryTitle: 'Memori & Identitas',
        memorySubtitle: 'Tersimpan hanya di perangkat ini.',
        latestReplyTitle: 'Balasan terbaru',
        latestReplySubtitle: 'Gunakan kembali respons terbaru.',
        goToTitle: 'Pergi ke',
        goToSubtitle: 'Jaga paritas navigasi dengan aplikasi web.',
        quickActionsTitle: 'Aksi cepat',
        quickActionsSubtitle: 'Terapkan default tahan lama untuk chat baru.',
        identityTitle: 'Identitas',
        replyDefaultsTitle: 'Default balasan',
        workflowTitle: 'Konteks workflow',
        guardrailsTitle: 'Guardrail',
        applyChangesTitle: 'Terapkan perubahan',
        applyChangesSubtitle: 'Tersimpan hanya di perangkat ini. Instal ulang atau perangkat lain akan mulai dari awal.',
        imageStudioSubtitle: 'Buat dan pakai ulang visual di thread yang sama.',
        generateImageTitle: 'Buat gambar',
        generateImageSubtitle: 'Jaga prompt tetap singkat dan siap produksi.',
      },
    },
  },
  ar: {
    home: {
      ...EN_HOME,
      quickPrompts: [
        'أحدث توصيات مطاحن التحضير اليدوي',
        'قارن بين مزايا وعيوب V60 وApril',
        'اتجاه سعر قهوة الأرابيكا الحالي',
        'أفضل سير عمل لضبط الإسبريسو بسرعة',
      ],
      searchStatus: {
        sending: 'جارٍ إرسال الطلب',
        checking: 'جارٍ التحقق من المصادر',
        preparing: 'جارٍ تجهيز الإجابة',
        retry: 'يحتاج إلى إعادة المحاولة',
        ready: 'جاهز للبحث',
        signIn: 'سجّل الدخول للبحث',
      },
      auth: {
        offlineTitle: 'وضع عدم الاتصال',
        offlineBody: 'لا يزال الوصول المخزن متاحًا. يعود البحث المباشر بعد إعادة الاتصال.',
        expiredTitle: 'انتهت الجلسة',
        expiredBody: 'سجّل الدخول مرة أخرى لاستعادة البحث المباشر والحفظ السحابي.',
        signedInTitle: 'تم تسجيل الدخول',
        signInTitle: 'سجّل الدخول للبحث المباشر',
        signInBodyGuest: 'أدوات الضيف تبقى متاحة.',
        signInBodyCloud: 'الإجراءات السحابية تتطلب تسجيل الدخول.',
      },
      search: {
        signInRequired: 'يرجى تسجيل الدخول للبحث في المصادر المباشرة.',
        reconnectRequired: 'البحث المباشر غير متاح. أعد الاتصال ثم حاول مرة أخرى.',
        insufficientSources: 'المصادر المباشرة غير كافية.',
        retry: 'البحث المباشر غير متاح. حاول مرة أخرى.',
        deepFallback: 'البحث المباشر غير متاح. يتم عرض بديل Deep.',
        sources: (count) => `${count} مصادر`,
        groundedSources: (count) => `${count} مصادر موثقة`,
        groundedResult: 'نتيجة موثقة',
        retrieved: (time) => `تم الجلب ${time}`,
      },
      sections: {
        quickPathsTitle: 'مسارات سريعة',
        quickPathsSubtitle: 'انتقل مباشرة إلى سير العمل الأساسي.',
        accountTitle: 'الحساب',
        accessTitle: 'الوصول',
        guestAccessBody: 'تظل أدوات الضيف متاحة. سجّل الدخول للبحث والحفظ.',
        latestResultTitle: 'أحدث نتيجة',
        latestResultSubtitle: 'افتح لوحة النتيجة الكاملة',
        openResult: 'افتح النتيجة',
        saved: 'تم الحفظ',
        readyToSave: 'جاهز للحفظ',
        share: 'مشاركة',
        noResultYet: 'لا توجد نتيجة بعد.',
        logOut: 'تسجيل الخروج',
        openingGoogle: 'جارٍ فتح Google...',
        openingApple: 'جارٍ فتح Apple...',
      },
    },
    chat: {
      ...EN_CHAT,
      helpers: {
        ...EN_CHAT.helpers,
        notSavedYet: 'لم يتم الحفظ بعد',
        deviceOnly: 'محفوظ على هذا الجهاز فقط.',
        savedLocally: 'محفوظ محليًا',
        resetLocalDefaults: 'تمت الإعادة إلى الإعدادات المحلية',
        unsavedChanges: 'تغييرات غير محفوظة',
        nearSafeLimit: 'اقتربت من حد الإدخال الآمن.',
        transcriptAttached: 'تم إرفاق النص',
        you: 'أنت',
        more: 'المزيد',
        playVoice: 'تشغيل الصوت',
        stopVoice: 'إيقاف الصوت',
        playAudio: 'تشغيل الصوت',
        stopAudio: 'إيقاف الصوت',
        open: 'فتح',
        save: 'حفظ',
        rename: 'إعادة تسمية',
        delete: 'حذف',
        add: 'إضافة',
        noFolder: 'بدون مجلد',
        noFoldersYet: 'لا توجد مجلدات بعد.',
        hideOptions: 'إخفاء الخيارات',
        showOptions: 'إظهار الخيارات',
        saveMemory: 'حفظ الذاكرة',
        saving: 'جارٍ الحفظ...',
        reset: 'إعادة ضبط',
        savedLocallyButton: 'محفوظ محليًا',
        generate: 'إنشاء',
        generating: 'جارٍ الإنشاء...',
        useInChat: 'استخدم في المحادثة',
        noImagesYet: 'لا توجد صور بعد',
        noImagesSubtitle: 'ستظهر الصور المولدة هنا.',
        noImagesHint: 'استخدم مطالبة قصيرة وابقها متوافقة مع مهمة المحادثة.',
        sources: 'المصادر',
        preview: 'معاينة',
        previewSubtitle: 'تنتقل الإجراءات الثانوية إلى هنا بدلًا من ازدحام السلسلة.',
        sourcesSubtitle: 'افتح المراجع التي بُنيت عليها الإجابة.',
        messageActions: 'إجراءات الرسالة',
        preparingResponse: 'جارٍ تجهيز الرد',
        preparingNextMessage: 'جارٍ تجهيز الرسالة التالية.',
        sendingMessage: 'جارٍ إرسال رسالتك...',
        processingRequest: 'جارٍ معالجة طلبك...',
        sendMessage: 'إرسال رسالة',
        openChatTools: 'فتح أدوات المحادثة',
        recordVoiceNote: 'تسجيل ملاحظة صوتية',
        stopRecordingVoiceNote: 'إيقاف تسجيل الملاحظة الصوتية',
        voiceNote: 'ملاحظة صوتية',
        image: 'صورة',
        gallery: 'الصور',
        camera: 'الكاميرا',
        files: 'الملفات',
        openMemory: 'فتح الذاكرة',
        useIndonesian: 'استخدام الإندونيسية',
        useEnglish: 'استخدام الإنجليزية',
        beConcise: 'اجعلها موجزة',
        beDetailed: 'اجعلها مفصلة',
        yourName: 'اسمك',
        assistantName: 'اسم المساعد',
        customLanguageCode: 'رمز لغة مخصص',
        workspaceRole: 'دور مساحة العمل',
        workflowFocus: 'تركيز سير العمل',
        styleNotes: 'ملاحظات الأسلوب',
        blockedWords: 'كلمات محظورة',
        describeGeneratedImage: 'صف صورة القهوة المطلوبة...',
        sessionsCount: (count) => `${count} جلسات`,
        languageAuto: 'لغة تلقائية',
        defaultName: 'الاسم الافتراضي',
        defaultAssistantName: 'اسم المساعد الافتراضي',
        adaptiveDetail: 'تفصيل تكيفي',
        flexibleFormat: 'تنسيق مرن',
        neutralTone: 'نبرة محايدة',
        noWorkspaceRole: 'لا يوجد دور لمساحة العمل',
        noWorkflowFocus: 'لا يوجد تركيز لسير العمل',
        styleNoteSaved: 'تم حفظ ملاحظة الأسلوب',
        noStyleNotes: 'لا توجد ملاحظات أسلوب',
        defaultEmoji: 'رموز تعبيرية افتراضية',
        blockedWordsCount: (count) => `${count} كلمات محظورة`,
        noBlockedWords: 'لا توجد كلمات محظورة',
        languageSummary: (code) => `اللغة ${code.toUpperCase()}`,
        callYou: (name) => `أناديك ${name}`,
        detailSummary: (value) => `تفصيل ${value}`,
        formatSummary: (value) => `تنسيق ${value}`,
        toneSummary: (value) => `نبرة ${value}`,
        recordingVoiceNote: (elapsed) => `تسجيل ملاحظة صوتية • ${elapsed}`,
        stopVoiceNote: (elapsed) => `إيقاف ${elapsed}`,
        sourcesCount: (count) => `${count} مصادر`,
      },
      header: {
        signedOut: 'سجّل الدخول لإرسال الرسائل وحفظ الردود والاحتفاظ بالسجل.',
        offline: 'أعد الاتصال للإرسال أو التحدث أو إنشاء الصور.',
        ready: 'اطلب وصفة أو خطة حل مشكلات أو مراجعة سير عمل.',
      },
      status: {
        needsAttention: 'يتطلب الانتباه',
        signedOutBody: 'يبقى السجل مرئيًا، لكن الإرسال والصوت والصور لا تزال تتطلب تسجيل الدخول.',
        offlineTitle: 'وضع عدم الاتصال',
        offlineBody: 'يمكنك تصفح الجلسات، لكن الإرسال والصوت والصور تنتظر إعادة الاتصال.',
        savedTitle: 'تم الحفظ في Collection',
        savedBody: 'أصبح أحدث رد للمساعد جاهزًا في Collection.',
      },
      sheets: {
        ...EN_CHAT.sheets,
        historySubtitle: 'الجلسات والمجلدات',
        newChatSubtitle: 'أنشئ سلاسل جديدة وبدّل بينها.',
        sessionsTitle: 'الجلسات',
        sessionsSubtitle: 'انقل سلسلة أو أعد تسميتها أو افتحها.',
        emptySessionPreview: 'ابدأ رسالة لبناء هذه السلسلة.',
        renameSessionPlaceholder: 'أعد تسمية الجلسة',
        foldersTitle: 'المجلدات',
        foldersSubtitle: 'نظّم الجلسات من دون مغادرة المحادثة.',
        folderNamePlaceholder: 'اسم المجلد',
        renameFolderPlaceholder: 'أعد تسمية المجلد',
        workspaceTitle: 'مساحة العمل',
        workspaceSubtitle: 'أرفق أو احفظ أو انتقل إلى تبويب آخر.',
        attachTitle: 'إرفاق',
        attachSubtitle: 'أبقِ الوسائط والملفات قريبة.',
        createTitle: 'إنشاء',
        createSubtitle: 'تبقى أدوات الصوت والصور خارج السلسلة.',
        memoryTitle: 'الذاكرة والهوية',
        memorySubtitle: 'محفوظة على هذا الجهاز فقط.',
        latestReplyTitle: 'أحدث رد',
        latestReplySubtitle: 'أعد استخدام أحدث استجابة.',
        goToTitle: 'اذهب إلى',
        goToSubtitle: 'حافظ على تكافؤ التنقل مع تطبيق الويب.',
        quickActionsTitle: 'إجراءات سريعة',
        quickActionsSubtitle: 'طبّق إعدادات دائمة على المحادثات الجديدة.',
        identityTitle: 'الهوية',
        replyDefaultsTitle: 'إعدادات الرد الافتراضية',
        workflowTitle: 'سياق سير العمل',
        guardrailsTitle: 'الضوابط',
        applyChangesTitle: 'تطبيق التغييرات',
        applyChangesSubtitle: 'محفوظة على هذا الجهاز فقط. ستبدأ إعادة التثبيت أو الجهاز الآخر من جديد.',
        imageStudioSubtitle: 'أنشئ الصور وأعد استخدامها داخل السلسلة نفسها.',
        generateImageTitle: 'إنشاء صورة',
        generateImageSubtitle: 'اجعل المطالبات قصيرة وجاهزة للإنتاج.',
      },
    },
  },
  zh: { home: buildDerivedHomeCopy('zh'), chat: buildDerivedChatCopy('zh') },
  ja: { home: buildDerivedHomeCopy('ja'), chat: buildDerivedChatCopy('ja') },
  ko: { home: buildDerivedHomeCopy('ko'), chat: buildDerivedChatCopy('ko') },
  th: { home: buildDerivedHomeCopy('th'), chat: buildDerivedChatCopy('th') },
  vi: { home: buildDerivedHomeCopy('vi'), chat: buildDerivedChatCopy('vi') },
  ms: { home: buildDerivedHomeCopy('ms'), chat: buildDerivedChatCopy('ms') },
};

export function resolveMobileLanguage(value?: string | null): Language {
  const normalized = String(value || '').trim();
  const short = normalized.toLowerCase().split(/[-_]/)[0];
  return isSupportedLanguage(short) ? short : 'en';
}

export function getMobileLocalization(value?: string | null): {
  language: Language;
  locale: string;
  direction: 'ltr' | 'rtl';
  web: Translations;
  copy: MobileLocaleBundle;
} {
  const language = resolveMobileLanguage(value);
  return {
    language,
    locale: getLanguageLocale(language),
    direction: getLanguageDirection(language),
    web: getTranslations(language),
    copy: MOBILE_LOCALE_BUNDLES[language] || MOBILE_LOCALE_BUNDLES.en,
  };
}
