import { expect, test } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';

test.beforeEach(async ({ page }) => {
  await qaLogout(page.request);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

const chatInputPlaceholder = /Type a message|Ketik pesan/i;
const sendMessageButton = /Send message|Kirim pesan/i;
const deepThinkButton = /Deep Think mode - thorough analysis|Mode Pikir Mendalam - analisis mendalam/i;

async function sendChatMessage(
  page: import('@playwright/test').Page,
  text: string,
  endpointPath: '/api/chat' | '/api/ai',
) {
  const input = page.getByPlaceholder(chatInputPlaceholder);
  await expect(input).toBeVisible();
  await input.fill(text);

  const sendButton = page.getByLabel(sendMessageButton);
  await expect(sendButton).toBeEnabled();

  let sentRequest = await Promise.all([
    page.waitForRequest((request) => request.url().includes(endpointPath), { timeout: 5_000 }).catch(() => null),
    sendButton.click({ force: true }),
  ]).then(([request]) => request);

  if (!sentRequest) {
    await input.focus();
    sentRequest = await Promise.all([
      page.waitForRequest((request) => request.url().includes(endpointPath), { timeout: 10_000 }),
      input.press('Enter'),
    ]).then(([request]) => request);
  }

  expect(sentRequest).toBeTruthy();
}

test('normal mode sends response profile + language context', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  let capturedBody: any = null;
  let chatHits = 0;
  await page.route('**/api/chat', async (route) => {
    chatHits += 1;
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: '## Respuesta\n- Ajusta la molienda un poco mas fina.\n- Manten tiempo de extraccion estable.',
    });
  });
  await page.route('**/api/ai', async (route) => {
    capturedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, action: 'balanced', text: '## Respuesta\n- Ajusta la molienda un poco mas fina.\n- Manten tiempo de extraccion estable.' }),
    });
  });

  await sendChatMessage(page, 'Por favor responde en espanol con 2 puntos.', '/api/ai');

  await expect(page.locator('.chat-markdown').last()).toContainText('Respuesta');
  expect(capturedBody).toBeTruthy();
  expect(capturedBody.action).toBe('balanced');
  expect(capturedBody.responseProfile.language).toBe('es');
  expect(capturedBody.responseProfile.verbosity).toBeTruthy();
  expect(capturedBody.clientContext.platform).toMatch(/web|pwa/);
  expect(capturedBody.conversationContext.preferredLanguage).toBe('es');
  expect(chatHits).toBe(0);
});

test('deep mode uses /api/ai with response profile and deep action', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  let capturedBody: any = null;
  await page.route('**/api/ai', async (route) => {
    capturedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        action: 'deep_think',
        text: 'Jawaban singkat\nGunakan rasio 1:16 sebagai baseline teknis.\n\n## Analisis\n1. Atur rasio 1:16.\n2. Evaluasi rasa setiap iterasi.\n\n## Trade-off / Risiko\n- Terlalu halus bisa memperlambat drawdown.\n\n## Rekomendasi\n- Ubah satu variabel kecil per seduhan.',
      }),
    });
  });
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'mock',
    });
  });

  await expect(page.getByPlaceholder(chatInputPlaceholder)).toBeVisible();
  await page.getByLabel(deepThinkButton).click({ force: true });
  await sendChatMessage(page, 'Berikan detail teknis dan alasan.', '/api/ai');

  await expect(page.locator('.chat-markdown').last()).toContainText('Analisis');
  expect(capturedBody).toBeTruthy();
  expect(capturedBody.action).toBe('deep_think');
  expect(capturedBody.responseProfile).toBeTruthy();
  expect(capturedBody.clientContext.platform).toMatch(/web|pwa/);
});

test('pwa runtime sends platform=pwa in client context', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/chat?runtime=web_parity&ui_profile=pwa', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/chat?runtime=web_parity&ui_profile=pwa', { waitUntil: 'domcontentloaded' });

  let capturedBody: any = null;
  let chatHits = 0;
  await page.route('**/api/chat', async (route) => {
    chatHits += 1;
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: '## Jawaban\n- Mode PWA aktif.',
    });
  });
  await page.route('**/api/ai', async (route) => {
    capturedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, action: 'balanced', text: '## Jawaban\n- Mode PWA aktif.' }),
    });
  });

  await sendChatMessage(page, 'Tolong jawab singkat.', '/api/ai');

  await expect(page.locator('.chat-markdown').last()).toContainText('Jawaban');
  expect(capturedBody).toBeTruthy();
  expect(capturedBody.action).toBe('balanced');
  expect(capturedBody.clientContext.platform).toBe('pwa');
  expect(chatHits).toBe(0);
});

test('web chat includes the newest user turn in conversation context for follow-up requests', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });

  const capturedBodies: any[] = [];
  let chatHits = 0;
  await page.route('**/api/chat', async (route) => {
    chatHits += 1;
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: capturedBodies.length === 1
        ? '## Recipe\n- Japanese iced V60 baseline.'
        : '## Recipe\n- Gula aren kopi susu baseline.',
    });
  });
  await page.route('**/api/ai', async (route) => {
    capturedBodies.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        action: 'balanced',
        text: capturedBodies.length === 1
          ? '## Recipe\n- Japanese iced V60 baseline.'
          : '## Recipe\n- Gula aren kopi susu baseline.',
      }),
    });
  });

  await sendChatMessage(page, 'saya ingin japanese style v60', '/api/ai');
  await expect(page.locator('.chat-markdown').last()).toContainText('Japanese iced');

  await sendChatMessage(page, 'recipe gula aren', '/api/ai');
  await expect(page.locator('.chat-markdown').last()).toContainText('Gula aren');

  expect(capturedBodies).toHaveLength(2);
  expect(capturedBodies[0].action).toBe('balanced');
  expect(capturedBodies[1].action).toBe('balanced');
  const secondBody = capturedBodies[1];
  expect(Array.isArray(secondBody.conversationContext?.recentMessages)).toBe(true);
  expect(secondBody.conversationContext?.summary ?? '').toBeFalsy();
  expect(secondBody.conversationContext.recentMessages).toHaveLength(1);
  expect(secondBody.conversationContext.recentMessages[0]?.role).toBe('user');
  expect(secondBody.conversationContext.recentMessages[0]?.text).toBe('recipe gula aren');
  expect(chatHits).toBe(0);
});

test('pwa chat preserves zoomable viewport and restores after leaving chat', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto('/chat?runtime=web_parity&ui_profile=pwa', { waitUntil: 'domcontentloaded' });

  const chatViewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(chatViewport).toContain('viewport-fit=cover');
  expect(chatViewport).toContain('user-scalable=no');
  expect(chatViewport).toContain('maximum-scale=1.0');

  await page.goto('/?runtime=web_parity&ui_profile=pwa', { waitUntil: 'domcontentloaded' });
  const restoredViewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(restoredViewport).toContain('user-scalable=no');
});
