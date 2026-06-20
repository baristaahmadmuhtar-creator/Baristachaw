import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { collectFatalBrowserErrors, expectNoHorizontalOverflow } from '../helpers/overflow';

test.beforeEach(async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/chat');
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('chat container uses zero top padding and keeps header controls visible', async ({ page }) => {
  const paddingTop = await page.locator('.chat-container').evaluate((node) => getComputedStyle(node).paddingTop);
  expect(paddingTop).toBe('0px');

  await expect(page.getByRole('heading', { name: 'Baristachaw' })).toBeVisible();
  await expect(page.locator('.chat-liquid-header').getByRole('button', {
    name: /New Chat|Obrolan Baru|Current draft must be used before creating another chat|Draf saat ini harus dipakai sebelum membuat chat baru/i,
  }).first()).toBeVisible();
  await expect(page.getByLabel(/Normal mode|Mode normal/i)).toBeVisible();
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

test('mobile chat quick actions, composer, and new messages stay inside the viewport', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only chat layout contract');

  const browserErrors = collectFatalBrowserErrors(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await clearClientState(page);
  await page.route('**/api/ai', async (route) => {
    const longToken = 'baristachaw-mobile-overflow-token-'.repeat(8);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        text: [
          '## Mobile overflow QA',
          'Use a calm baseline and change one variable at a time.',
          '',
          '| Field | Value |',
          '|---|---|',
          `| Long marker | ${longToken} |`,
          `| Long URL | https://example.com/${longToken} |`,
          '',
          `Inline code: \`${longToken}\``,
        ].join('\n'),
        sources: [
          {
            uri: `https://example.com/${longToken}`,
            title: `Source ${longToken}`,
            domain: 'example.com',
          },
        ],
      }),
    });
  });

  await page.goto('/chat?runtime=web_parity&ui_profile=pwa', { waitUntil: 'domcontentloaded' });
  await expectNoHorizontalOverflow(page, 'mobile chat loaded');

  const quickPrompts = page.getByTestId('chat-quick-prompts');
  await expect(quickPrompts).toBeVisible();
  const quickMetrics = await quickPrompts.locator('button').evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height, right: rect.right };
  }));
  expect(quickMetrics).toHaveLength(3);
  for (const metric of quickMetrics) {
    expect(metric.width).toBeGreaterThan(72);
    expect(metric.height).toBeLessThanOrEqual(44);
    expect(metric.right).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth + 1));
  }

  const input = page.getByPlaceholder(/Type a message|Ketik pesan/i);
  await page.getByTestId('chat-quick-prompt-explain_recipe').click();
  await expect(input).toHaveValue(/recipe|resep|resipi/i);
  await expectNoHorizontalOverflow(page, 'mobile chat quick prompt applied');

  await input.fill('qa_e2e mobile overflow message for a long recipe table and source URL');
  await page.getByLabel(/Send message|Kirim pesan/i).click();
  await expect(page.locator('.chat-markdown').last()).toContainText(/Mobile overflow QA/i, { timeout: 30_000 });
  await expectNoHorizontalOverflow(page, 'mobile chat after assistant message');

  const composerBounds = await page.getByTestId('chat-composer-dock').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      viewport: window.innerWidth,
    };
  });
  expect(composerBounds.left).toBeGreaterThanOrEqual(-1);
  expect(composerBounds.right).toBeLessThanOrEqual(composerBounds.viewport + 1);
  expect(composerBounds.width).toBeLessThanOrEqual(composerBounds.viewport + 1);
  browserErrors.expectNoFatalErrors('mobile chat quick actions');
});
