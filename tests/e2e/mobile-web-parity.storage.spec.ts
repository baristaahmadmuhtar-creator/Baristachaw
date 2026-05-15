import { test, expect, type Page } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { expectMobileParityPageHealthy, mobileParityPath } from '../helpers/mobileParity';

test.beforeEach(async ({ page }) => {
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

test('saved AI Brew recipe survives reload and appears in mobile collection parity route', async ({ page }, testInfo) => {
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
  await fillVisibleInputByTestId(page, 'ai-brew-coffee-name', 'Parity Saved Recipe');
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toBeVisible();
  await page.getByTestId('ai-brew-result-action-save').click();

  await page.reload({ waitUntil: 'domcontentloaded' });
  const storedPlan = await page.evaluate(() => {
    const raw = localStorage.getItem('BARISTACHAW_AI_BREW_LAST_PLAN_V5');
    return raw ? JSON.parse(raw).payload : null;
  });
  expect(storedPlan?.coffeeName).toBe('Parity Saved Recipe');

  await page.goto(mobileParityPath('/collection', { platform: 'ios', language: 'id', hostSafeBottom: 34 }), {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByText(/Parity Saved/i).first()).toBeVisible();
  await expectMobileParityPageHealthy(page, 'saved recipe collection restore');
});
