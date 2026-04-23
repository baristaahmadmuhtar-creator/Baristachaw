export const PARITY_NAV_ORDER = ['Home', 'Scanner', 'Tools', 'Collection', 'Chat'] as const;

export type ParityRouteName = typeof PARITY_NAV_ORDER[number];
export type ParityNavId = 'home' | 'scanner' | 'tools' | 'collection' | 'chat';

export const PARITY_NAV_META: Record<ParityRouteName, {
  navId: ParityNavId;
  path: string;
  label: string;
  headerTitle: string;
}> = {
  Home: {
    navId: 'home',
    path: '/',
    label: 'Home',
    headerTitle: 'Baristachaw',
  },
  Scanner: {
    navId: 'scanner',
    path: '/scanner',
    label: 'Scan',
    headerTitle: 'Vision Scan',
  },
  Tools: {
    navId: 'tools',
    path: '/tools',
    label: 'Tools',
    headerTitle: 'Barista Tools',
  },
  Collection: {
    navId: 'collection',
    path: '/collection',
    label: 'Collection',
    headerTitle: 'Collection',
  },
  Chat: {
    navId: 'chat',
    path: '/chat',
    label: 'Chat',
    headerTitle: 'Baristachaw',
  },
};

export const PARITY_NAV_ITEMS = PARITY_NAV_ORDER.map((routeName) => ({
  routeName,
  ...PARITY_NAV_META[routeName],
}));

export const HOME_PARITY = {
  brand: 'Baristachaw',
  subtitle: 'What would you like to do today?',
  searchSectionTitle: 'Ask Baristachaw',
  signedInPlaceholder: 'Search the web...',
  signedOutPlaceholder: 'Sign in to search...',
  searchResultTitle: 'Search Result',
  saveAction: 'Save to Collection',
  featureCards: [
    {
      routeName: 'Chat',
      title: 'Ask Baristachaw',
      subtitle: 'Recipes, troubleshooting, and workflow help',
    },
    {
      routeName: 'Scanner',
      title: 'Vision Scan',
      subtitle: 'Coffee, labels, and brew review',
    },
    {
      routeName: 'Tools',
      title: 'AI Brew',
      subtitle: 'Deterministic hot and iced filter planning',
    },
    {
      routeName: 'Tools',
      title: 'Barista Tools',
      subtitle: 'AI Brew, timer, ratio, and service tasks',
    },
    {
      routeName: 'Collection',
      title: 'Collection',
      subtitle: 'Your saved items & creations',
    },
  ] as const,
} as const;

export const SCANNER_PARITY = {
  title: 'Vision Scan',
  modes: {
    auto: 'Coffee Analysis',
    ocr: 'Read Label',
    video: 'Brew Video',
  },
  saveAction: 'Save to Collection',
  resultTitle: 'Scan Result',
  mediaInputTitle: 'Media Input',
  authHint: 'Sign in to scan and save results.',
} as const;

export const COLLECTION_PARITY = {
  title: 'Collection',
  subtitle: 'Your saved items & creations',
  filters: {
    all: 'All Items',
    recipe: 'Recipes',
    ai_canvas: 'Canvas',
    note: 'Notes',
  },
  newNote: 'New Note',
  createFolder: 'Create Folder',
  searchPlaceholder: 'Search notes...',
  noFolder: 'No Folder',
  saveNote: 'Save Note',
  updateNote: 'Update Note',
  guestReadOnly: 'Read-only',
  editableReady: 'Collection ready',
} as const;

export const TOOLS_PARITY = {
  title: 'Barista Tools',
  subtitle: 'AI Brew, timer, ratio, and shift tasks.',
  tabs: {
    ai_brew: 'AI Brew',
    timer: 'Timer',
    ratio: 'Ratio',
    todo: 'Tasks',
  },
  timerTitle: 'Brew Timer',
  ratioTitle: 'Ratio Calculator',
  taskTitle: 'Tasks',
  taskPlaceholder: 'Add a task...',
} as const;

export const CHAT_PARITY = {
  title: 'Baristachaw',
  modes: {
    fast: 'Flash',
    normal: 'Normal',
    deep: 'Deep',
  },
  historyTitle: 'Chat History',
  newChat: 'New Chat',
  saveToCollection: 'Save to Collection',
  saveLastResponse: 'Save Last Response',
  savedLastResponse: 'Saved Last Response',
  shareLastResponse: 'Share Last Response',
  inputPlaceholder: 'Type a message...',
  emptyGuestTitle: 'Sign in for full chat',
  emptyGuestText: 'Sign in to send messages, save replies, and reuse chat history.',
  emptyTitle: 'Start a new chat',
  emptyText: 'Ask for a recipe, troubleshooting plan, or workflow review.',
  menuTitle: 'Chat Actions',
  historyMenuLabel: 'Chat History',
  imageStudio: 'Image Studio',
} as const;

export const CHAT_INPUT_MAX_CHARS = 1800;
export const CHAT_INPUT_WARNING_CHARS = 1500;

export const CHAT_DEEP_THINKING_PHASES = [
  'Understanding the context',
  'Building the analysis',
  'Comparing options and tradeoffs',
  'Formatting the final answer',
] as const;

export function getHomeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning.';
  if (hour < 18) return 'Good afternoon.';
  return 'Good evening.';
}
