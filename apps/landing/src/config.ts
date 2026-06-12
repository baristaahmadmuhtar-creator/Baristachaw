export const APP_ORIGIN = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://app.baristachaw.com').replace(/\/+$/, '');
export const MARKETING_ORIGIN = (import.meta.env.VITE_SITE_URL || 'https://baristachaw.com').replace(/\/+$/, '');
export const RELEASE_VERSION = 'v1.0.2';
export const APK_URL = import.meta.env.VITE_ANDROID_APK_URL
  || 'https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases/download/v1.0.2/BaristaChaw-v1.0.2.apk';
export const RELEASE_URL = 'https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases/tag/v1.0.2';
export const SUPPORT_ISSUE_URL = 'https://github.com/baristaahmadmuhtar-creator/Baristachaw/issues/new';

export const APP_LINKS = {
  home: APP_ORIGIN,
  aiBrew: `${APP_ORIGIN}/tools?tab=ai_brew`,
  login: `${APP_ORIGIN}/login`,
  register: `${APP_ORIGIN}/register`,
} as const;
