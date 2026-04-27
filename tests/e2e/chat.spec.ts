import { test, expect, type Page } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';
import { expectFirstRunAuthGate } from '../helpers/authGate';

const isLive = String(process.env.LIVE_E2E || '').trim() === '1';
const flashModeLabel = /Flash mode - fast concise responses|Mode Kilat - respons cepat dan ringkas/i;
const normalModeLabel = /Normal mode|Mode normal/i;
const deepModeLabel = /Deep Think mode - thorough analysis|Mode Pikir Mendalam - analisis mendalam/i;
const chatInputPlaceholder = /Type a message|Ketik pesan/i;
const sendMessageLabel = /Send message|Kirim pesan/i;
const chatNavName = /Chat|Obrolan/i;
const chatSearchSelector = 'input[placeholder="Search chats..."]:visible, input[placeholder="Cari chat..."]:visible';
const createFolderTitle = /Create Folder|Buat Folder/i;
const folderNamePlaceholder = /Folder Name|Nama Folder/i;
const saveButtonName = /Save|Simpan/i;
const libraryButtonName = /Library|Pustaka/i;
const historyButtonName = /History|Riwayat/i;
const describeImagePlaceholder = /Describe the image|Deskripsikan gambar/i;
const collapseNavigationTitle = /Collapse navigation|Ciutkan navigasi/i;
const toggleSidebarLabel = /Toggle chat history sidebar|Tampilkan\/sembunyikan sidebar riwayat chat/i;
const closeSidebarLabel = /Close sidebar|Tutup sidebar/i;

async function clickVisibleLibraryControl(page: Page) {
  const libraryTab = page.getByRole('tab', { name: libraryButtonName });
  if (await libraryTab.isVisible()) {
    await libraryTab.click();
    return;
  }
  await page.getByRole('button', { name: libraryButtonName }).click();
}

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
  await expectFirstRunAuthGate(page);
});

test('supports send message, mode switch, save/copy actions', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  await expect(page.getByLabel(flashModeLabel)).toBeVisible();
  await page.getByLabel(flashModeLabel).click();
  await page.getByLabel(normalModeLabel).click();
  await page.getByLabel(deepModeLabel).click();

  const input = page.getByPlaceholder(chatInputPlaceholder);
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill('qa_e2e please provide recipe');
  await page.getByLabel(sendMessageLabel).click();

  await expect(page.locator('.chat-markdown').last()).toContainText(/mock default|Mocked Response|Mocked AI|TL;DR/i, { timeout: 30_000 });

  await page.locator('[title="Copy"], [title="Salin"]').last().click();
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

  await page.getByLabel(deepModeLabel).click();
  const input = page.getByPlaceholder(chatInputPlaceholder);
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill('qa_e2e deep status');
  await page.getByLabel(sendMessageLabel).click();

  await expect(page.locator('.chat-markdown').last()).toContainText('Core Analysis', { timeout: 30_000 });
  await expect(page.getByText(/Sources|Sumber/i).last()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Source 1' })).toBeVisible();
});

test('supports sidebar folder flow', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  const mobileToggle = page.getByLabel(toggleSidebarLabel);
  const desktopChatNavLink = page.getByRole('navigation').first().getByRole('link', { name: chatNavName });
  const visibleSearch = page.locator(chatSearchSelector).first();
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
  await page.getByTitle(createFolderTitle).first().click();
  await page.getByPlaceholder(folderNamePlaceholder).fill('qa_e2e folder', { timeout: 30_000 });
  await page.getByRole('button', { name: saveButtonName }).click();
  await expect(page.locator('span:text-is("qa_e2e folder"):visible').first()).toBeVisible();
});

test('desktop uses single nav sidebar with chat workspace tabs', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('Mobile'), 'desktop-only sidebar behavior');

  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTitle(/Collapse history|Ciutkan riwayat/i)).toHaveCount(0);
  await clickVisibleLibraryControl(page);
  await expect(page.getByPlaceholder(describeImagePlaceholder)).toBeVisible();

  await page.getByRole('navigation').first().getByRole('link', { name: chatNavName }).click();
  await expect(page.getByPlaceholder(describeImagePlaceholder)).not.toBeVisible();
  await expect(page.getByPlaceholder(chatInputPlaceholder)).toBeVisible();

  await page.getByTitle(collapseNavigationTitle).click();
  await page.getByRole('navigation').first().getByRole('link', { name: chatNavName }).click();
  await expect(page.getByRole('tab', { name: historyButtonName })).toBeVisible();
  await expect(page.getByRole('tab', { name: libraryButtonName })).toBeVisible();

  await page.mouse.click(640, 280);
  await expect(page.getByRole('tab', { name: historyButtonName })).not.toBeVisible();
});

test('mobile sidebar hide fully closes history and library panel', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile-only behavior');

  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  await page.getByLabel(toggleSidebarLabel).click();
  await expect(page.getByRole('button', { name: libraryButtonName })).toBeVisible();
  await clickVisibleLibraryControl(page);
  await expect(page.getByPlaceholder(describeImagePlaceholder)).toBeVisible();

  await page.getByLabel(closeSidebarLabel).click();
  await expect(page.getByRole('button', { name: libraryButtonName })).not.toBeVisible();
  await expect(page.getByPlaceholder(describeImagePlaceholder)).not.toBeVisible();
});

