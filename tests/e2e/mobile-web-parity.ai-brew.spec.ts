import { test, expect, type Page } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import {
  expectMobileParityPageHealthy,
  expectNoCriticalIndonesianEnglishLeak,
  mobileParityPath,
} from '../helpers/mobileParity';

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

async function fillVisibleInputByTestId(page: Page, testId: string, value: string) {
  await page.evaluate(({ testId: nextTestId, value: nextValue }) => {
    const field = Array.from(document.querySelectorAll<HTMLInputElement>(`[data-testid="${nextTestId}"]`))
      .find((candidate) => candidate.offsetParent !== null);
    if (!field) throw new Error(`Missing visible input: ${nextTestId}`);
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (!descriptor?.set) throw new Error(`Missing input setter: ${nextTestId}`);
    field.scrollIntoView({ block: 'center', inline: 'nearest' });
    field.focus();
    descriptor.set.call(field, nextValue);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  }, { testId, value });
}

test('AI Brew V60 iced native shell keeps protected recipe values and Indonesian guide copy', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.goto(mobileParityPath('/tools?tab=ai-brew', { platform: 'ios', language: 'id', hostSafeBottom: 34 }), {
    waitUntil: 'domcontentloaded',
  });
  await clearClientState(page);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto(mobileParityPath('/tools?tab=ai-brew', { platform: 'ios', language: 'id', hostSafeBottom: 34 }), {
    waitUntil: 'domcontentloaded',
  });

  await page.getByTestId('ai-brew-open-quick').click();
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await fillVisibleInputByTestId(page, 'ai-brew-coffee-name', 'Parity V60 Iced');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toBeVisible();
  await expect(result).toContainText(/Parity V60 es|Parity V60 Iced/i);
  await expect(result).toContainText(/Air panas|Es|Rasio final|Ekstraksi|Setelah ekstraksi/i);
  await expect(result).not.toContainText(/Ekstraksi panas/i);
  await expect(result).not.toContainText(/Katup|Buka katup/i);
  await page.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
  await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/Berikutnya|Sisa total/i);
  await expectNoCriticalIndonesianEnglishLeak(page, 'V60 iced AI Brew result');

  const storedPlan = await page.evaluate(() => {
    const raw = localStorage.getItem('BARISTACHAW_AI_BREW_LAST_PLAN_V5');
    return raw ? JSON.parse(raw).payload : null;
  });

  expect(storedPlan?.coffeeName).toBe('Parity V60 Iced');
  expect(storedPlan?.brewMode).toBe('iced');
  expect(storedPlan?.iceMl).toBeGreaterThan(0);
  expect(storedPlan?.hotWaterMl + storedPlan?.iceMl).toBe(storedPlan?.totalWaterMl);
  expect(storedPlan?.steps.reduce((sum: number, step: { pourVolumeMl?: number }) => sum + (step.pourVolumeMl || 0), 0))
    .toBe(storedPlan?.hotWaterMl);
  expect(storedPlan?.extractionEndSeconds).toBeLessThanOrEqual(storedPlan?.guideEndSeconds);
  await expectMobileParityPageHealthy(page, 'V60 iced AI Brew result');
});

test('AI Brew Hario Switch iced native shell keeps valve safety and timer semantics', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('Mobile'), 'mobile parity shell is a mobile-store gate');

  await page.goto(mobileParityPath('/tools?tab=ai-brew', { platform: 'android', language: 'id', hostSafeBottom: 28 }), {
    waitUntil: 'domcontentloaded',
  });
  await page.getByTestId('ai-brew-open-quick').click();
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByTestId('ai-brew-picker-option-dripper-hario-switch-02').click();
  await fillVisibleInputByTestId(page, 'ai-brew-coffee-name', 'Parity Switch Iced');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toBeVisible();
  await expect(result).toContainText(/Parity Switch es|Parity Switch Iced/i);
  await expect(result).toContainText(/Katup|Buka katup|Muatan ruang|Air turun/i);
  await page.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
  await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/Berikutnya|Sisa total/i);

  const storedPlan = await page.evaluate(() => {
    const raw = localStorage.getItem('BARISTACHAW_AI_BREW_LAST_PLAN_V5');
    return raw ? JSON.parse(raw).payload : null;
  });

  expect(storedPlan?.coffeeName).toBe('Parity Switch Iced');
  expect(storedPlan?.brewMode).toBe('iced');
  expect(String(storedPlan?.methodFamily || '')).toMatch(/switch/i);
  expect(storedPlan?.switchCompatibility?.status || storedPlan?.guardrails?.status).toBeTruthy();
  expect(storedPlan?.extractionEndSeconds).toBeLessThanOrEqual(storedPlan?.guideEndSeconds);
  await expectMobileParityPageHealthy(page, 'Switch iced AI Brew result');
});
