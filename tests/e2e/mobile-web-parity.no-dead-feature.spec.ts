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

test('all visible Barista Tools tabs open populated panels in native shell mode', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.goto(mobileParityPath('/tools', { platform: 'ios', language: 'id', hostSafeBottom: 34 }), {
    waitUntil: 'domcontentloaded',
  });

  const tabs = [
    { id: 'ai_brew', panel: 'ai_brew', text: /Brew|AI Brew|AI Seduh|Buat/i },
    { id: 'timer', panel: 'timer', button: /Mulai|Start/i },
    { id: 'ratio', panel: 'ratio', text: /Rasio|Ukuran Giling|Dosis/i },
    { id: 'todo', panel: 'todo', text: /Tugas|Tambah/i },
  ];

  for (const tab of tabs) {
    await page.locator(`#tools-tab-${tab.id}`).click();
    const panel = page.locator(`#tools-panel-${tab.panel}`);
    await expect(panel).toBeVisible();
    if ('button' in tab) {
      await expect(panel.getByRole('button', { name: tab.button }).first()).toBeVisible();
    } else {
      await expect(panel.getByText(tab.text).first()).toBeVisible();
    }
    await expectMobileParityPageHealthy(page, `tools tab ${tab.id}`);
  }
});

test('visible primary controls do not open blank modal or unsupported production feature', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.goto(mobileParityPath('/tools?tab=ratio', { platform: 'android', language: 'id', hostSafeBottom: 28 }), {
    waitUntil: 'domcontentloaded',
  });

  await page.getByRole('button', { name: /Ukuran Giling/i }).click();
  await expect(page.getByText(/Rekomendasi|Gilingan|Grinder|Ukuran Giling/i).first()).toBeVisible();
  await expectMobileParityPageHealthy(page, 'grind size panel');

  await page.getByRole('button', { name: /Rasio/i }).click();
  await expect(page.getByRole('button', { name: /Tampilkan analisis ekstraksi opsional/i })).toBeVisible();
  await page.getByRole('button', { name: /Tampilkan analisis ekstraksi opsional/i }).click();
  await expect(page.getByRole('button', { name: /Sembunyikan analisis ekstraksi opsional/i })).toBeVisible();
  await expectMobileParityPageHealthy(page, 'ratio optional analysis');
});
