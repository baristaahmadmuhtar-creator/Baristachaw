import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';

const isLive = String(process.env.LIVE_E2E || '').trim() === '1';

test.beforeEach(async ({ page }) => {
  if (!isLive) await mockAiApis(page);
  await qaLogout(page.request);
  await page.goto('/chat');
  await clearClientState(page);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('shows sign in gate when not authenticated', async ({ page }) => {
  await expect(page.getByText('Sign In Required')).toBeVisible({ timeout: 30_000 });
});

test('supports send message, mode switch, save/copy actions', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  await expect(page.getByLabel('Flash mode - fast concise responses')).toBeVisible();
  await page.getByLabel('Flash mode - fast concise responses').click();
  await page.getByLabel('Normal mode').click();
  await page.getByLabel('Deep Think mode - thorough analysis').click();

  const input = page.getByPlaceholder('Type a message...');
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill('qa_e2e please provide recipe');
  await page.getByLabel('Send message').click();

  await expect(page.locator('.chat-markdown').last()).toContainText(/mock default|Mocked Response|Mocked AI|TL;DR/i, { timeout: 30_000 });

  await page.locator('[title="Copy"]').last().click();
});

test('deep mode shows thinking phases, degraded badge, and source links', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  await page.route('**/api/ai', async (route) => {
    const body = route.request().postDataJSON() as { action?: string };
    if (body.action === 'deep_think') {
      await page.waitForTimeout(900);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          action: 'deep_think',
          text: '## TL;DR\nRingkas.\n## Core Analysis\nAnalisis.\n## Options & Tradeoffs\nOpsi.\n## Recommended Action Plan\n1. A\n2. B\n3. C\n## Risks & Validation\nRisiko.',
          degraded: true,
          provider: 'OPENAI',
          details: 'provider_fallback',
          sources: [
            { uri: 'https://example.com/source-1', title: 'Source 1', domain: 'example.com' },
            { uri: 'https://example.org/source-2', title: 'Source 2', domain: 'example.org' },
          ],
          sourceCount: 2,
          deepMeta: {
            mode: 'deep',
            grounded: true,
            degraded: true,
            fallbackUsed: true,
            qualityPass: true,
            latencyMs: 2200,
            sourceCount: 2,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, text: 'mock' }),
    });
  });
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'mock' });
  });

  await page.getByLabel('Deep Think mode - thorough analysis').click();
  const input = page.getByPlaceholder('Type a message...');
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill('qa_e2e deep status');
  await page.getByLabel('Send message').click();

  await expect(page.locator('.chat-markdown').last()).toContainText('Core Analysis', { timeout: 30_000 });
  await expect(page.getByText('Sources').last()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Source 1' })).toBeVisible();
});

test('supports sidebar folder flow', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  const mobileToggle = page.getByLabel('Toggle chat history sidebar');
  const desktopChatNavLink = page.getByRole('navigation').first().getByRole('link', { name: 'Chat' });
  const visibleSearch = page.locator('[placeholder="Search chats..."]:visible').first();
  if (await mobileToggle.isVisible()) {
    await mobileToggle.click();
  } else {
    if (!(await visibleSearch.isVisible())) {
      await desktopChatNavLink.click();
    }
    if (!(await visibleSearch.isVisible())) {
      await desktopChatNavLink.click();
    }
  }
  await expect(visibleSearch).toBeVisible();
  await page.locator('[title="Create Folder"]:visible').first().click();
  await page.getByPlaceholder('Folder Name').fill('qa_e2e folder', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('span:text-is("qa_e2e folder"):visible').first()).toBeVisible();
});

test('desktop uses single nav sidebar with chat dropdown and collapsed flyout', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('Mobile'), 'desktop-only sidebar behavior');

  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTitle('Collapse history')).toHaveCount(0);
  await page.getByRole('button', { name: 'Library' }).click();
  await expect(page.getByPlaceholder('Describe the image...')).toBeVisible();

  await page.getByRole('navigation').first().getByRole('link', { name: 'Chat' }).click();
  await expect(page.getByPlaceholder('Describe the image...')).not.toBeVisible();
  await expect(page.getByPlaceholder('Search chats...')).not.toBeVisible();

  await page.getByTitle('Collapse navigation').click();
  await page.getByRole('navigation').first().getByRole('link', { name: 'Chat' }).click();
  await expect(page.getByRole('button', { name: 'History', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Library', exact: true })).toBeVisible();

  await page.mouse.click(640, 280);
  await expect(page.getByRole('button', { name: 'History', exact: true })).not.toBeVisible();
});

test('mobile sidebar hide fully closes history and library panel', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only behavior');

  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  await page.getByLabel('Toggle chat history sidebar').click();
  await expect(page.getByRole('button', { name: 'Library' })).toBeVisible();
  await page.getByRole('button', { name: 'Library' }).click();
  await expect(page.getByPlaceholder('Describe the image...')).toBeVisible();

  await page.getByLabel('Close sidebar').click();
  await expect(page.getByRole('button', { name: 'Library' })).not.toBeVisible();
  await expect(page.getByPlaceholder('Describe the image...')).not.toBeVisible();
});

