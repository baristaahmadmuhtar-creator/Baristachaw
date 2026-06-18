import { test, expect, type Page } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';
import { expectAccountModal } from '../helpers/authGate';

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
  const libraryTab = page.getByRole('tab', { name: libraryButtonName }).first();
  await expect(libraryTab).toBeVisible({ timeout: 10_000 });
  await libraryTab.click();
  await expect(libraryTab).toHaveAttribute('aria-selected', 'true');
}

async function openChatWorkspace(page: Page) {
  const isMobileLayout = await page.evaluate(() => window.innerWidth < 768);
  const mobileToggle = page.getByRole('button', { name: toggleSidebarLabel }).first();
  const visibleSearch = page.locator(chatSearchSelector).first();
  if (isMobileLayout) {
    await expect(mobileToggle).toBeVisible({ timeout: 10_000 });
    const toggleBox = await mobileToggle.boundingBox();
    expect(toggleBox?.width ?? 0).toBeGreaterThanOrEqual(40);
    expect(toggleBox?.height ?? 0).toBeGreaterThanOrEqual(40);
    await mobileToggle.click();
    await expect(page.getByRole('dialog', { name: /Chat workspace|Ruang kerja chat/i })).toBeVisible();
    return;
  }

  const desktopChatNavLink = page.getByRole('navigation').first().getByRole('link', { name: chatNavName });
  if (!(await visibleSearch.isVisible())) {
    await desktopChatNavLink.click();
  }
  if (!(await visibleSearch.isVisible())) {
    await desktopChatNavLink.click();
  }
  await expect(visibleSearch).toBeVisible();
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

test('keeps chat browseable and asks for an account only when sending unauthenticated', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Baristachaw' })).toBeVisible({ timeout: 30_000 });
  const input = page.getByPlaceholder(chatInputPlaceholder);
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill('qa_e2e preview chat');
  await page.getByLabel(sendMessageLabel).click();

  await expectAccountModal(page);
});

test('shows upgrade gate for free users before AI chat runs', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  const input = page.getByPlaceholder(chatInputPlaceholder);
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill('qa_e2e free chat');
  await page.getByLabel(sendMessageLabel).click();

  await expect(page.getByTestId('ai-access-gate-modal')).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Obrolan AI dibuka mulai Barista Starter|AI Chat starts on Barista Starter|Obrolan AI dibuka mulai paket Starter|AI Chat starts on Starter/i })).toBeVisible();
});

test('supports send message, mode switch, save/copy actions', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  await expect(page.getByLabel(flashModeLabel)).toBeVisible();
  await page.getByLabel(flashModeLabel).click();
  await page.getByLabel(normalModeLabel).click();
  await page.getByLabel(deepModeLabel).click();
  await page.getByLabel(normalModeLabel).click();

  const input = page.getByPlaceholder(chatInputPlaceholder);
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill('qa_e2e please provide recipe');
  await page.getByLabel(sendMessageLabel).click();

  await expect(page.locator('.chat-markdown').last()).toContainText(/mock default|Mocked Response|Mocked AI|TL;DR|Normal Mode/i, { timeout: 30_000 });

  await page.locator('[title="Copy"], [title="Salin"]').last().click();
});

test('fast mode relevance guard answers method comparison without stale recipe template', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.route('**/api/ai', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        action: 'fast',
        text: [
          '- V60: clarity tinggi; air balanced, gilingan medium-fine, suhu 92-94C, waktu 2:30-3:05.',
          '- Chemex: cup bersih-body ringan; air jangan terlalu low mineral, gilingan medium, suhu 93-95C, waktu 3:30-4:30.',
          '- Kalita: sweetness stabil; air balanced, gilingan medium, suhu 92-94C, waktu 2:45-3:30.',
          '- AeroPress: body lebih tebal; air fleksibel, gilingan medium-fine, suhu 85-92C, waktu 1:30-2:30.',
        ].join('\n'),
      }),
    });
  });
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(flashModeLabel).click();
  const input = page.getByPlaceholder(chatInputPlaceholder);
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill('Bandingkan V60, Chemex, Kalita, AeroPress dari profil rasa, air, grind, suhu, waktu.');
  await page.getByLabel(sendMessageLabel).click();

  const answer = page.locator('.chat-markdown').last();
  await expect(answer).toContainText(/V60/i, { timeout: 30_000 });
  await expect(answer).toContainText(/Chemex/i);
  await expect(answer).toContainText(/Kalita/i);
  await expect(answer).toContainText(/AeroPress/i);
  await expect(answer).not.toContainText(/Ethiopia Yirgacheffe/i);
});

test('normal and deep mode contracts stay relevant for method comparison', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
  await page.route('**/api/ai', async (route) => {
    const body = route.request().postDataJSON() as { action?: string };
    const text = body.action === 'deep_think'
      ? [
          'Jawaban singkat: V60 paling clarity, Chemex paling bersih, Kalita paling manis stabil, AeroPress paling body.',
          '',
          '## Analisis',
          '- V60: profil rasa clean; air balanced, grind medium-fine, suhu 92-94C, waktu 2:30-3:05.',
          '- Chemex: profil rasa ringan dan bersih; air jangan terlalu soft, grind medium, suhu 93-95C, waktu 3:30-4:30.',
          '- Kalita: sweetness dan body stabil; air balanced, grind medium, suhu 92-94C, waktu 2:45-3:30.',
          '- AeroPress: body dan sweetness cepat; air fleksibel, grind medium-fine, suhu 85-92C, waktu 1:30-2:30.',
          '',
          '## Trade-off / Risiko',
          '- Chemex mudah stall; AeroPress mudah over-agitate.',
          '',
          '## Rekomendasi',
          '- Untuk clean pilih V60/Chemex, untuk stabil pilih Kalita, untuk body pilih AeroPress.',
        ].join('\n')
      : [
          '## Perbandingan',
          '| Metode | Profil rasa | Air | Grind | Suhu | Waktu |',
          '|---|---|---|---|---|---|',
          '| V60 | clarity | balanced | medium-fine | 92-94C | 2:30-3:05 |',
          '| Chemex | clean ringan | balanced | medium | 93-95C | 3:30-4:30 |',
          '| Kalita | sweet stabil | balanced | medium | 92-94C | 2:45-3:30 |',
          '| AeroPress | body tebal | fleksibel | medium-fine | 85-92C | 1:30-2:30 |',
        ].join('\n');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, text }) });
  });
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  const prompt = 'Bandingkan V60, Chemex, Kalita, AeroPress dari profil rasa, air, grind, suhu, waktu.';
  const input = page.getByPlaceholder(chatInputPlaceholder);
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill(prompt);
  const sendButton = page.getByLabel(sendMessageLabel).last();
  await expect(sendButton).toBeEnabled({ timeout: 30_000 });
  await sendButton.click();
  const normalAnswer = page.locator('.chat-markdown').filter({ hasText: /Perbandingan/i }).last();
  await expect(normalAnswer).toBeVisible({ timeout: 30_000 });
  await expect(normalAnswer).toContainText(/AeroPress/i);

  const previousAnswerCount = await page.locator('.chat-markdown').count();
  await page.getByLabel(deepModeLabel).click();
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.click();
  await input.fill(prompt);
  await expect(sendButton).toBeEnabled({ timeout: 30_000 });
  await sendButton.click();
  await expect(page.locator('.chat-markdown')).toHaveCount(previousAnswerCount + 1, { timeout: 30_000 });
  const deepAnswer = page.locator('.chat-markdown').filter({ hasText: /Jawaban singkat/i }).last();
  await expect(deepAnswer).toBeVisible({ timeout: 30_000 });
  await expect(deepAnswer).toContainText(/Analisis/i);
  await expect(deepAnswer).toContainText(/V60/i);
  await expect(deepAnswer).toContainText(/Chemex/i);
  await expect(deepAnswer).toContainText(/Kalita/i);
  await expect(deepAnswer).toContainText(/AeroPress/i);
  await expect(deepAnswer).not.toContainText(/wizard/i);
});

test('irrelevance and current-data guards regenerate or fall back safely', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  let apiCall = 0;
  await page.route('**/api/ai', async (route) => {
    apiCall += 1;
    const body = route.request().postDataJSON() as { prompt?: string };
    const prompt = String(body.prompt || '');
    if (prompt.includes('harga terbaru')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, text: 'Harga terbaru kopi X hari ini Rp123.000.' }),
      });
      return;
    }
    const text = apiCall === 1 && !prompt.includes('Jawab pertanyaan user secara langsung')
      ? 'Resep V60 Ethiopia Yirgacheffe: gunakan 15g kopi dan 240g air.'
      : 'V60, Chemex, Kalita, dan AeroPress berbeda pada profil rasa, air, grind, suhu, dan waktu; pilih V60 untuk clarity, Chemex untuk clean cup, Kalita untuk sweetness stabil, AeroPress untuk body.';
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, text }) });
  });
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  const input = page.getByPlaceholder(chatInputPlaceholder);
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill('Bandingkan V60, Chemex, Kalita, AeroPress dari profil rasa, air, grind, suhu, waktu.');
  await page.getByLabel(sendMessageLabel).click();
  const correctedAnswer = page.locator('.chat-markdown').last();
  await expect(correctedAnswer).toContainText(/Chemex/i, { timeout: 30_000 });
  await expect(correctedAnswer).not.toContainText(/Ethiopia Yirgacheffe/i);
  await expect(page.getByText(/regenerated:\s*yes/i).last()).toBeVisible();

  await input.fill('Berapa harga terbaru kopi X hari ini?');
  await page.getByLabel(sendMessageLabel).click();
  const guardedCurrent = page.locator('.chat-markdown').last();
  await expect(guardedCurrent).toContainText(/tidak bisa memastikan data terbaru|sumber live/i, { timeout: 30_000 });
  await expect(guardedCurrent).not.toContainText(/Rp123\.000/i);
});

test('deep mode shows thinking phases, degraded badge, and source links', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
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
  const sendButton = page.getByLabel(sendMessageLabel).last();
  await expect(sendButton).toBeEnabled();
  await sendButton.click();

  const deepAnswer = page.locator('.chat-markdown').filter({ hasText: 'Core Analysis' }).last();
  await expect(deepAnswer).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('link', { name: 'Source 1' })).toBeVisible({ timeout: 30_000 });
});

test('deep mode waits for long-running responses without rendering timeout error', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'pro' }));
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  let sawDeepRequest = false;
  await page.route('**/api/ai', async (route) => {
    const body = route.request().postDataJSON() as { action?: string };
    if (body.action === 'deep_think') {
      sawDeepRequest = true;
      await page.waitForTimeout(36_000);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          action: 'deep_think',
          text: '## TL;DR\nWaited successfully.\n## Core Analysis\nThe UI held the deep request open without showing a timeout error.\n## Options & Tradeoffs\nLong deep requests trade speed for stronger reasoning.\n## Recommended Action Plan\n1. Keep waiting.\n2. Render one final answer.\n3. Avoid duplicate timeout messages.\n## Risks & Validation\nValidate that no timeout copy remains visible.',
          degraded: false,
          provider: 'GEMINI',
          sourceCount: 0,
          deepMeta: {
            mode: 'deep',
            grounded: false,
            degraded: false,
            fallbackUsed: false,
            qualityPass: true,
            latencyMs: 36_000,
            sourceCount: 0,
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
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'mock fallback' });
  });

  await page.getByLabel(deepModeLabel).click();
  const input = page.getByPlaceholder(chatInputPlaceholder);
  await expect(input).toBeEnabled({ timeout: 30_000 });
  await input.fill('qa_e2e deep slow response');
  await page.getByLabel(sendMessageLabel).click();

  await expect(page.locator('.chat-markdown').last()).toContainText('Core Analysis', { timeout: 60_000 });
  await expect(page.getByText(/Response took too long|Respons terlalu lama/i)).toHaveCount(0);
  expect(sawDeepRequest).toBe(true);
});

test('supports sidebar folder flow', async ({ page }) => {
  await qaLogin(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  const visibleSearch = page.locator(chatSearchSelector).first();
  await openChatWorkspace(page);
  await expect(visibleSearch).toBeVisible();
  const workspace = page.getByRole('dialog', { name: /Chat workspace|Ruang kerja chat/i });
  const createFolderButton = await workspace.isVisible()
    ? workspace.getByRole('button', { name: createFolderTitle }).first()
    : page.getByTitle(createFolderTitle).first();
  await createFolderButton.click();
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

  await openChatWorkspace(page);
  const workspace = page.getByRole('dialog', { name: /Chat workspace|Ruang kerja chat/i });
  await expect(workspace.getByRole('tab', { name: historyButtonName })).toHaveAttribute('aria-selected', 'true');
  await clickVisibleLibraryControl(page);
  await expect(page.getByPlaceholder(describeImagePlaceholder)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(workspace).toHaveCount(0);
  await expect(page.getByPlaceholder(describeImagePlaceholder)).not.toBeVisible();

  await openChatWorkspace(page);
  await clickVisibleLibraryControl(page);
  await expect(page.getByPlaceholder(describeImagePlaceholder)).toBeVisible();
  await page.getByLabel(closeSidebarLabel).click();
  await expect(workspace).toHaveCount(0);
  await expect(page.getByRole('tab', { name: libraryButtonName })).not.toBeVisible();
  await expect(page.getByPlaceholder(describeImagePlaceholder)).not.toBeVisible();
});

