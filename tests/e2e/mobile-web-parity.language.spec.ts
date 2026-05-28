import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import {
  expectMobileParityPageHealthy,
  expectNoCriticalIndonesianEnglishLeak,
  mobileParityPath,
} from '../helpers/mobileParity';

test.beforeEach(async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('Indonesian web parity shell keeps critical tools and AI Brew copy localized', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.goto(mobileParityPath('/tools?tab=ratio', { platform: 'ios', language: 'id', hostSafeBottom: 34 }), {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByRole('heading', { name: /Alat Barista/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Kalkulator/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Tugas/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Rasio$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Ukuran Giling/i })).toBeVisible();
  await expect(page.getByText(/Preset Metode Seduh/i)).toBeVisible();
  await expect(page.getByText(/Dosis \(g\)/i)).toBeVisible();
  await expect(page.getByText(/Air \(ml\)/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Tampilkan analisis ekstraksi opsional/i })).toBeVisible();

  await expectMobileParityPageHealthy(page, 'Indonesian tools parity');
  await expectNoCriticalIndonesianEnglishLeak(page, 'Indonesian tools parity');

  await page.getByRole('tab', { name: /Brew|AI Brew|AI Seduh/i }).click();
  await expect(page.getByTestId('ai-brew-open-quick')).toBeVisible();
  await expectNoCriticalIndonesianEnglishLeak(page, 'Indonesian AI Brew landing');
});

test('English web parity shell remains English when language is explicitly en', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.goto(mobileParityPath('/tools?tab=ratio', { platform: 'android', language: 'en', hostSafeBottom: 28 }), {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByRole('heading', { name: /Barista Tools/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Calculator/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Ratio$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Grind Size/i })).toBeVisible();
  await expect(page.getByText(/Brew Method Presets/i)).toBeVisible();
  await expectMobileParityPageHealthy(page, 'English tools parity');
});
