import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { mockAiApis } from '../helpers/network';
import { collectFatalBrowserErrors, expectNoHorizontalOverflow } from '../helpers/overflow';

const shouldRunReleaseProof = String(process.env.AI_BREW_RELEASE_PROOF || '').trim() === '1';
const releaseSha = process.env.RELEASE_PROOF_SHA
  || execSync('git rev-parse --short=12 HEAD', { encoding: 'utf8' }).trim();
const artifactDir = path.resolve('artifacts', 'ai-brew-audit', 'release-proof', releaseSha);

test.skip(!shouldRunReleaseProof, 'Set AI_BREW_RELEASE_PROOF=1 to capture the AI Brew release proof screenshots.');
test.setTimeout(240_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('BARISTA_LANGUAGE', 'id');
    localStorage.setItem('BARISTA_LANGUAGE_ID_DEFAULT_MIGRATED', '1');
  });
  await qaLogout(page.request);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await mockAiApis(page);
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

async function openTools(page: Page, width = 430, height = 932) {
  await page.setViewportSize({ width, height });
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('ai-brew-panel')).toBeVisible();
  await expectNoHorizontalOverflow(page, `loaded ${width}x${height}`);
}

async function setVisibleInputValue(page: Page, testId: string, value: string) {
  const input = page.getByTestId(testId);
  await expect(input).toBeVisible();
  await page.evaluate(({ nextTestId, nextValue }) => {
    const field = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      `[data-testid="${nextTestId}"]`,
    )).find((candidate) => candidate.offsetParent !== null);
    if (!field) throw new Error(`Missing visible field: ${nextTestId}`);
    const prototype = field instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (!descriptor?.set) throw new Error(`Missing input setter: ${nextTestId}`);
    field.scrollIntoView({ block: 'center', inline: 'nearest' });
    field.focus();
    descriptor.set.call(field, '');
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    descriptor.set.call(field, nextValue);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  }, { nextTestId: testId, nextValue: value });
  await expect(input).toHaveValue(value);
}

async function openProBuilder(page: Page) {
  await page.getByTestId('ai-brew-open-pro').click();
  await expect(page.getByTestId('ai-brew-builder-pro')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'pro builder opened');
}

async function openProSection(page: Page, section: 'recipe' | 'bean' | 'water' | 'grinder' | 'method' | 'confidence') {
  const trigger = page.getByTestId(`ai-brew-pro-accordion-trigger-${section}`);
  if ((await trigger.count()) === 0) return;
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click();
  }
  await expect(page.getByTestId(`ai-brew-pro-accordion-panel-${section}`)).toBeVisible();
}

async function selectDripper(page: Page, query: string, id: string) {
  await page.getByTestId('ai-brew-dripper-picker').click();
  await expect(page.getByTestId('ai-brew-picker-search-dripper')).toBeVisible();
  await setVisibleInputValue(page, 'ai-brew-picker-search-dripper', query);
  await page.getByTestId(`ai-brew-picker-option-dripper-${id}`).click();
  await expectNoHorizontalOverflow(page, `selected dripper ${id}`);
}

async function selectWaterBrand(page: Page, query = 'Volvic') {
  await openProSection(page, 'water');
  await page.getByTestId('ai-brew-water-picker').scrollIntoViewIfNeeded();
  await page.getByTestId('ai-brew-water-picker').click();
  await expect(page.getByTestId('ai-brew-picker-search-water_brand')).toBeVisible();
  await setVisibleInputValue(page, 'ai-brew-picker-search-water_brand', query);
  const firstMatch = page.locator('[data-testid^="ai-brew-picker-option-water_brand-"]').first();
  await expect(firstMatch).toBeVisible();
  await firstMatch.click();
  await expectNoHorizontalOverflow(page, `selected water ${query}`);
}

async function selectCustomBean(page: Page, process: string, variety: string) {
  await openProSection(page, 'bean');
  await page.getByTestId('ai-brew-process-picker').scrollIntoViewIfNeeded();
  await page.getByTestId('ai-brew-process-picker').click();
  await page.getByRole('button', { name: /Select custom process|Pilih proses manual|Pilih proses kustom/i }).click();
  await setVisibleInputValue(page, 'ai-brew-process-custom', process);
  await page.getByTestId('ai-brew-variety-picker').scrollIntoViewIfNeeded();
  await page.getByTestId('ai-brew-variety-picker').click();
  await page.getByRole('button', { name: /Select custom variety|Pilih varietas manual|Pilih varietas kustom/i }).click();
  await setVisibleInputValue(page, 'ai-brew-variety-custom', variety);
}

async function generatePlan(page: Page) {
  await page.getByTestId('ai-brew-generate').click();
  const result = page.getByTestId('ai-brew-result');
  await expect(result).toBeVisible();
  await expect(result.getByTestId('ai-brew-result-summary-panel')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'result opened');
  return result;
}

async function closeResult(page: Page) {
  const close = page.getByRole('button', { name: /Tutup output plan|Close planned output/i });
  if (await close.count()) {
    await close.click();
    await expect(page.getByTestId('ai-brew-result')).toHaveCount(0);
  }
}

async function capture(page: Page, fileName: string, label: string) {
  mkdirSync(artifactDir, { recursive: true });
  await expectNoHorizontalOverflow(page, label);
  await page.screenshot({
    path: path.join(artifactDir, fileName),
    fullPage: true,
    animations: 'disabled',
  });
}

test('captures AI Brew final release proof screenshots in Indonesian', async ({ page }) => {
  const browserErrors = collectFatalBrowserErrors(page);

  await openTools(page, 430, 932);
  await openProBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'Bean Belum Lengkap');
  await selectDripper(page, 'v60', 'hario-v60');
  await selectWaterBrand(page);
  await generatePlan(page);
  await expect(page.getByTestId('ai-brew-result')).toContainText(/Bean belum lengkap|Data bean sebagian|baseline aman/i);
  await capture(page, 'unknown-bean-fallback.png', 'unknown bean fallback');
  await closeResult(page);

  await openTools(page, 430, 932);
  await openProBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'Anaerobic Risk Switch');
  await selectCustomBean(page, 'Anaerobic natural extended fermentation', 'Robusta canephora blend');
  await selectDripper(page, 'switch 03', 'hario-switch-03');
  await selectWaterBrand(page);
  await page.getByTestId('ai-brew-target-profile-fruit_forward').click();
  await generatePlan(page);
  await expect(page.getByTestId('ai-brew-result')).toContainText(/Perlu hati-hati|feedback rasa|Prediksi rasa/i);
  await capture(page, 'risk-bean-caution.png', 'risk bean caution');
  await closeResult(page);

  await openTools(page, 430, 932);
  await openProBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'Washed Ethiopia High Confidence');
  await selectCustomBean(page, 'Washed', 'Gesha');
  await selectDripper(page, 'v60', 'hario-v60');
  await selectWaterBrand(page);
  await generatePlan(page);
  await expect(page.getByTestId('ai-brew-result')).toContainText(/Data bean lengkap|Data bean sebagian|Keyakinan/i);
  await capture(page, 'known-bean-high-confidence.png', 'known bean confidence');
  await closeResult(page);

  await openTools(page, 430, 932);
  await openProBuilder(page);
  await selectDripper(page, 'switch 02', 'hario-switch-02');
  await selectWaterBrand(page);
  await setVisibleInputValue(page, 'ai-brew-dose', '20');
  await page.getByTestId('ai-brew-target-profile-more_body').click();
  await generatePlan(page);
  await expect(page.getByTestId('ai-brew-result')).toContainText(/Hati-hati|Diblokir|Kombinasi tidak aman|katup/i);
  await capture(page, 'switch02-20g-caution.png', 'switch 02 caution');
  await closeResult(page);

  await openTools(page, 430, 932);
  await openProBuilder(page);
  await selectDripper(page, 'switch 03', 'hario-switch-03');
  await selectWaterBrand(page);
  await setVisibleInputValue(page, 'ai-brew-dose', '20');
  await generatePlan(page);
  await expect(page.getByTestId('ai-brew-result')).toContainText(/Aman|katup/i);
  await capture(page, 'switch03-20g-safe.png', 'switch 03 safe');
  await closeResult(page);

  await openTools(page, 430, 932);
  await openProBuilder(page);
  await selectDripper(page, 'mugen switch', 'mugen-x-switch');
  await selectWaterBrand(page);
  await setVisibleInputValue(page, 'ai-brew-dose', '18');
  await generatePlan(page);
  await expect(page.getByTestId('ai-brew-result')).toContainText(/MUGEN|muatan ruang|katup/i);
  await capture(page, 'mugen-18g-safe.png', 'mugen 18g');
  await closeResult(page);

  await openTools(page, 430, 932);
  await openProBuilder(page);
  await selectDripper(page, 'v60', 'hario-v60');
  await selectWaterBrand(page);
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await generatePlan(page);
  await expect(page.getByTestId('ai-brew-result')).toContainText(/air panas|es|rasio final/i);
  await capture(page, 'v60-iced-split.png', 'v60 iced split');
  await page.getByTestId('ai-brew-result-tab-flow').click();
  await expect(page.getByTestId('ai-brew-result-guide-panel')).toBeVisible();
  await capture(page, 'panduan-ringkas.png', 'panduan ringkas');
  await page.getByTestId('ai-brew-result-tab-details').click();
  await expect(page.getByTestId('ai-brew-result-detail-panel')).toBeVisible();
  await capture(page, 'detail-confidence-provenance.png', 'detail confidence provenance');
  await closeResult(page);

  await openTools(page, 390, 844);
  await openProBuilder(page);
  await selectDripper(page, 'switch 03', 'hario-switch-03');
  await selectWaterBrand(page);
  await setVisibleInputValue(page, 'ai-brew-dose', '20');
  await generatePlan(page);
  await capture(page, 'mobile-result-no-overflow.png', 'mobile result no overflow');
  browserErrors.expectNoFatalErrors('release proof');
});
