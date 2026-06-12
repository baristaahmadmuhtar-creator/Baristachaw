import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { expectMobileParityPageHealthy, mobileParityPath } from '../helpers/mobileParity';

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('iOS native shell safe-area keeps bottom nav above home indicator and content scrollable', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(mobileParityPath('/tools', { platform: 'ios', language: 'id', hostSafeBottom: 34 }), {
    waitUntil: 'domcontentloaded',
  });
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--safe-bottom', '34px');
    document.documentElement.style.setProperty('--device-safe-bottom', '34px');
    document.documentElement.style.setProperty('--host-safe-bottom', '34px');
  });
  await page.waitForTimeout(120);

  const metrics = await page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('[data-testid="mobile-bottom-nav"]');
    const surface = document.querySelector<HTMLElement>('[data-testid="mobile-bottom-nav-surface"]');
    const pageContainer = document.querySelector<HTMLElement>('.page-container');
    if (!nav || !surface) return null;
    const navStyle = getComputedStyle(nav);
    const surfaceRect = surface.getBoundingClientRect();
    const pageStyle = pageContainer ? getComputedStyle(pageContainer) : null;
    return {
      nativeShellProfile: document.documentElement.hasAttribute('data-native-shell-profile'),
      navPaddingBottom: Number.parseFloat(navStyle.paddingBottom || '0'),
      surfaceBottomGap: Math.max(0, window.innerHeight - surfaceRect.bottom),
      pagePaddingBottom: pageStyle ? Number.parseFloat(pageStyle.paddingBottom || '0') : null,
      docClientWidth: document.documentElement.clientWidth,
      docScrollWidth: document.documentElement.scrollWidth,
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics?.nativeShellProfile).toBe(true);
  expect(metrics?.navPaddingBottom ?? 0).toBeGreaterThanOrEqual(30);
  expect(metrics?.surfaceBottomGap ?? 0).toBeGreaterThanOrEqual(30);
  if (metrics?.pagePaddingBottom !== null) {
    expect(metrics?.pagePaddingBottom ?? 0).toBeGreaterThanOrEqual(88);
  }
  expect(metrics?.docScrollWidth ?? 999).toBeLessThanOrEqual((metrics?.docClientWidth ?? 0) + 1);
  await expectMobileParityPageHealthy(page, 'iOS native shell safe-area');
});

test('native shell viewport recovers after portrait landscape portrait orientation changes', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(mobileParityPath('/tools', { platform: 'ios', language: 'id', hostSafeBottom: 34 }), {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);

  const metrics = await page.evaluate(() => {
    const root = document.getElementById('root');
    const nav = document.querySelector<HTMLElement>('[data-testid="mobile-bottom-nav-surface"]');
    if (!root || !nav) return null;
    const rootRect = root.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    return {
      appHeight: getComputedStyle(document.documentElement).getPropertyValue('--app-height').trim(),
      viewportHeight: window.innerHeight,
      rootBottomGap: Math.max(0, window.innerHeight - rootRect.bottom),
      navBottomGap: Math.max(0, window.innerHeight - navRect.bottom),
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics?.rootBottomGap ?? 99).toBeLessThanOrEqual(2);
  expect(metrics?.navBottomGap ?? 99).toBeLessThanOrEqual(40);
  expect(metrics?.appHeight).toBe(`${metrics?.viewportHeight}px`);
  await expectMobileParityPageHealthy(page, 'orientation recovery');
});

test('keyboard-open metrics hide bottom nav without breaking the page width', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.goto(mobileParityPath('/tools?tab=ratio', { platform: 'android', language: 'id', hostSafeBottom: 28 }), {
    waitUntil: 'domcontentloaded',
  });
  const nav = page.getByTestId('mobile-bottom-nav');
  await expect(nav).toBeVisible();

  const firstInput = page.locator('input, textarea, [contenteditable="true"]').first();
  await expect(firstInput).toBeVisible();
  await firstInput.focus();

  const keyboardHiddenState = await page.evaluate(() => {
    document.documentElement.dataset.keyboardOpen = 'true';
    document.documentElement.style.setProperty('--keyboard-offset', '280px');
    window.dispatchEvent(new CustomEvent('app:viewport-metrics', {
      detail: { keyboardOpen: true, keyboardOffset: 280 },
    }));
    const navEl = document.querySelector<HTMLElement>('[data-testid="mobile-bottom-nav"]');
    if (!navEl) return null;
    const style = getComputedStyle(navEl);
    return {
      datasetKeyboardOpen: document.documentElement.dataset.keyboardOpen,
      opacity: style.opacity,
      visibility: style.visibility,
      pointerEvents: style.pointerEvents,
      transform: style.transform,
    };
  });
  expect(keyboardHiddenState).not.toBeNull();
  expect(keyboardHiddenState?.datasetKeyboardOpen).toBe('true');
  expect(keyboardHiddenState?.visibility).toBe('hidden');

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    document.documentElement.dataset.keyboardOpen = 'false';
    document.documentElement.style.setProperty('--keyboard-offset', '0px');
    window.dispatchEvent(new CustomEvent('app:viewport-metrics', {
      detail: { keyboardOpen: false, keyboardOffset: 0 },
    }));
  });
  await expect(nav).toBeVisible();
  await expectMobileParityPageHealthy(page, 'keyboard metrics recovery');
});
