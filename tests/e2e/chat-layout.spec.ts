import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/chat');
});

test('chat container uses zero top padding and keeps header controls visible', async ({ page }) => {
  const paddingTop = await page.locator('.chat-container').evaluate((node) => getComputedStyle(node).paddingTop);
  expect(paddingTop).toBe('0px');

  await expect(page.getByRole('heading', { name: 'Baristachaw' })).toBeVisible();
  await expect(page.locator('.chat-liquid-header button[title="New Chat"], .chat-liquid-header button[title="Send your first message before creating another chat"]')).toBeVisible();
  await expect(page.getByLabel('Normal mode')).toBeVisible();
});

test('mobile chat composer is flush to the bottom in pwa profile', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only chat composer contract');

  await page.goto('/chat?runtime=web_parity&ui_profile=pwa');
  const composerDock = page.getByTestId('chat-composer-dock');
  await expect(composerDock).toBeVisible();

  const metrics = await composerDock.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const dockStyle = getComputedStyle(el);
    return {
      bottomGap: Math.max(0, window.innerHeight - rect.bottom),
      cssBottom: dockStyle.bottom,
      paddingBottom: Number.parseFloat(dockStyle.paddingBottom || '0'),
      pwaBottomBleed: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pwa-bottom-bleed') || '0'),
      edgeSafeBottom: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge-safe-bottom') || '0'),
      isPwa: document.documentElement.hasAttribute('data-pwa'),
    };
  });

  expect(metrics.isPwa).toBe(true);
  expect(metrics.pwaBottomBleed).toBeLessThanOrEqual(0.5);
  expect(metrics.edgeSafeBottom).toBeLessThanOrEqual(0.5);
  expect(metrics.paddingBottom).toBeLessThanOrEqual(0.5);
  expect(metrics.bottomGap).toBeLessThanOrEqual(2);
  expect(Number.parseFloat(metrics.cssBottom)).toBeLessThanOrEqual(1);
});
