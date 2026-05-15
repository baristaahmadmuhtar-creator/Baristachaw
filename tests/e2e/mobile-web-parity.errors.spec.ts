import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { expectMobileParityPageHealthy, mobileParityPath } from '../helpers/mobileParity';

test.beforeEach(async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

test('invalid mobile tools tab recovers to a populated tools surface instead of a blank state', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.goto(mobileParityPath('/tools?tab=not-a-real-tab', { platform: 'ios', language: 'id', hostSafeBottom: 34 }), {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByRole('heading', { name: /Alat Barista|Barista Tools/i })).toBeVisible();
  await expect(page.getByRole('tab', { name: /AI Brew|AI Seduh|Kalkulator|Rasio/i }).first()).toBeVisible();
  await expectMobileParityPageHealthy(page, 'invalid tools tab recovery');
});

test('unknown bean AI Brew path keeps safe fallback language visible instead of raw errors', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.goto(mobileParityPath('/tools?tab=ai-brew', { platform: 'android', language: 'id', hostSafeBottom: 28 }), {
    waitUntil: 'domcontentloaded',
  });
  await page.getByTestId('ai-brew-open-quick').click();
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toBeVisible();
  await expect(result).toContainText(/Baseline aman|Bean belum lengkap|Data bean/i);
  await expect(result).not.toContainText(/TypeError|ReferenceError|\bNaN\b|\bundefined\b/i);
  await expectMobileParityPageHealthy(page, 'unknown bean safe fallback');
});
