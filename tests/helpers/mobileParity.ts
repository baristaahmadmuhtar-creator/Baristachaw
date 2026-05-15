import { expect, type Page } from '@playwright/test';

export type NativeShellPlatform = 'ios' | 'android';

export function mobileParityPath(
  route: string,
  options: {
    platform?: NativeShellPlatform;
    language?: 'id' | 'en';
    hostSafeBottom?: number;
    guestMode?: boolean;
  } = {},
) {
  const platform = options.platform || 'ios';
  const language = options.language || 'id';
  const hostSafeBottom = String(options.hostSafeBottom ?? (platform === 'ios' ? 34 : 28));
  const [path, query = ''] = route.split('?');
  const params = new URLSearchParams(query);
  params.set('runtime', 'web_parity');
  params.set('ui_profile', 'native_shell');
  params.set('native_shell', platform);
  params.set('host_safe_bottom', hostSafeBottom);
  params.set('theme', 'system');
  params.set('language', language);
  if (options.guestMode) params.set('guest_mode', '1');
  return `${path}?${params.toString()}`;
}

export async function expectMobileParityPageHealthy(page: Page, label: string) {
  await expect(page.locator('body'), `${label}: body is visible`).toBeVisible();

  const result = await page.evaluate(() => {
    const text = document.body.innerText.replace(/\s+/g, ' ').trim();
    const root = document.documentElement;
    return {
      text,
      textLength: text.length,
      htmlAttrs: {
        webParity: root.hasAttribute('data-web-parity'),
        nativeIos: root.hasAttribute('data-native-ios-shell'),
        nativeAndroid: root.hasAttribute('data-native-android-shell'),
      },
      docClientWidth: root.clientWidth,
      docScrollWidth: root.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    };
  });

  expect(result.textLength, `${label}: meaningful body text`).toBeGreaterThan(80);
  expect(result.text, `${label}: no framework/runtime error copy`).not.toMatch(
    /Application error|Failed to fetch dynamically imported module|Cannot read properties|TypeError:|ReferenceError:|404 Not Found/i,
  );
  expect(result.docScrollWidth, `${label}: document horizontal overflow`).toBeLessThanOrEqual(result.docClientWidth + 1);
  expect(result.bodyScrollWidth, `${label}: body horizontal overflow`).toBeLessThanOrEqual(result.bodyClientWidth + 1);
}

export async function expectNoCriticalIndonesianEnglishLeak(page: Page, label: string) {
  const visibleText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
  const forbidden = [
    'Additional details',
    'Brew Guide',
    'Expected cup',
    'Confidence',
    'Safety',
    'Release',
    'Drawdown',
    'Blocked',
    'Unknown fallback',
    'Known high',
    'Partial medium',
    'Manual Required',
    'High Buffer',
    'Zero Mineral',
    'Taste feedback required',
    'Barista Tools',
    'Calculator',
    'Tasks',
    'Grind Size',
    'Show optional extraction analysis',
    'Brew Method Presets',
    'Dose (g)',
    'Water (ml)',
  ];

  for (const phrase of forbidden) {
    expect(visibleText, `${label}: forbidden visible English phrase "${phrase}"`).not.toContain(phrase);
  }
}
