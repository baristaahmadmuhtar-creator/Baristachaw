import { expect, type Page, test } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { clearClientState } from '../helpers/cleanup';
import { mockAiApis } from '../helpers/network';
import { collectFatalBrowserErrors, expectNoHorizontalOverflow } from '../helpers/overflow';

test.setTimeout(180_000);

const MOBILE_VIEWPORTS = [
  { label: 'android-small-360', width: 360, height: 780 },
  { label: 'iphone-se-375', width: 375, height: 667 },
  { label: 'iphone-13-390', width: 390, height: 844 },
  { label: 'android-common-393', width: 393, height: 851 },
  { label: 'iphone-pro-max-430', width: 430, height: 932 },
  { label: 'tablet-portrait-768', width: 768, height: 1024 },
] as const;

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

async function resetTools(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });
  await expectNoHorizontalOverflow(page, `tools loaded ${width}x${height}`);
}

async function setVisibleInputValue(page: Page, testId: string, value: string) {
  await expect(page.getByTestId(testId)).toBeVisible();
  await page.evaluate(({ nextTestId, nextValue }) => {
    const field = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      `[data-testid="${nextTestId}"]`,
    )).find((candidate) => candidate.offsetParent !== null);
    if (!field) throw new Error(`Missing field: ${nextTestId}`);
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
  await expect(page.getByTestId(testId)).toHaveValue(value);
}

async function openProBuilder(page: Page) {
  await page.getByTestId('ai-brew-open-pro').click();
  await expect(page.getByTestId('ai-brew-builder-pro')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'pro builder opened');
}

async function openQuickBuilder(page: Page) {
  await page.getByTestId('ai-brew-open-quick').click();
  await expect(page.getByTestId('ai-brew-builder-quick')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'quick builder opened');
}

async function selectDripper(page: Page, query: string, id: string) {
  await page.getByTestId('ai-brew-dripper-picker').click();
  await expect(page.getByTestId('ai-brew-picker-search-dripper')).toBeVisible();
  await setVisibleInputValue(page, 'ai-brew-picker-search-dripper', query);
  await page.getByTestId(`ai-brew-picker-option-dripper-${id}`).click();
  await expect(page.getByTestId('ai-brew-dripper-picker')).toContainText(new RegExp(query.replace(/\s+/g, '.*'), 'i'));
  await expectNoHorizontalOverflow(page, `selected dripper ${id}`);
}

async function openProSection(page: Page, section: 'recipe' | 'bean' | 'water' | 'grinder' | 'method' | 'confidence') {
  const trigger = page.getByTestId(`ai-brew-pro-accordion-trigger-${section}`);
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page.getByTestId(`ai-brew-pro-accordion-panel-${section}`)).toBeVisible();
  await expectNoHorizontalOverflow(page, `opened pro section ${section}`);
}

async function selectWaterBrand(page: Page, name = 'Volvic') {
  await openProSection(page, 'water');
  await page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).click();
  await expectNoHorizontalOverflow(page, `selected water ${name}`);
}

async function selectCustomProcessAndVariety(page: Page, process: string, variety: string) {
  await page.getByTestId('ai-brew-process-picker').click();
  await page.getByRole('button', { name: /Select custom process|Pilih proses manual|Pilih proses kustom/i }).click();
  await setVisibleInputValue(page, 'ai-brew-process-custom', process);
  await page.getByTestId('ai-brew-variety-picker').click();
  await page.getByRole('button', { name: /Select custom variety|Pilih varietas manual|Pilih varietas kustom/i }).click();
  await setVisibleInputValue(page, 'ai-brew-variety-custom', variety);
  await expectNoHorizontalOverflow(page, 'selected custom bean details');
}

async function closeBuilder(page: Page) {
  if ((await page.getByTestId('ai-brew-builder-pro').count()) === 0) return;
  await page.getByTestId('ai-brew-close-pro').click();
  await expect(page.getByTestId('ai-brew-builder-pro')).toHaveCount(0);
}

test('AI Brew Hario Switch Presisi builder and result never create page-level horizontal overflow', async ({ page }, testInfo) => {
  const browserErrors = collectFatalBrowserErrors(page);
  const viewports = testInfo.project.name === 'chromium'
    ? MOBILE_VIEWPORTS
    : [{ label: testInfo.project.name, width: page.viewportSize()?.width ?? 390, height: page.viewportSize()?.height ?? 844 }];

  for (const viewport of viewports) {
    await resetTools(page, viewport.width, viewport.height);
    await openProBuilder(page);
    await setVisibleInputValue(page, 'ai-brew-coffee-name', `Overflow Switch ${viewport.label}`);
    await selectDripper(page, 'switch 03', 'hario-switch-03');
    await setVisibleInputValue(page, 'ai-brew-dose', '20');
    await page.getByTestId('ai-brew-target-profile-floral_transparent').click();
    await expect(page.getByTestId('ai-brew-switch-preset-auto-inline')).toHaveAttribute('aria-pressed', 'true');
    await expectNoHorizontalOverflow(page, `${viewport.label} target-driven switch auto`);
    await selectWaterBrand(page);
    await expect(page.getByTestId('ai-brew-switch-inline-methods')).toBeVisible();
    await expect(page.getByTestId('ai-brew-switch-method-strip')).toBeVisible();
    await expect(page.getByTestId('ai-brew-switch-size-hario-switch-03')).toHaveCount(0);
    await expect(page.getByTestId('ai-brew-switch-dose-20')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, `${viewport.label} switch 03 configured`);

    for (const section of ['recipe', 'water', 'grinder', 'method', 'confidence'] as const) {
      await openProSection(page, section);
    }

    await page.getByTestId('ai-brew-generate').click();
    const result = page.getByTestId('ai-brew-result');
    await expect(result).toBeVisible();
    await expect(result.getByTestId('ai-brew-result-summary-panel')).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label} result summary`);

    await result.getByTestId('ai-brew-result-tab-flow').click();
    await expect(result.getByTestId('ai-brew-result-guide-panel')).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label} guide tab`);
    await result.getByTestId('ai-brew-guide-density-pro').click();
    await expectNoHorizontalOverflow(page, `${viewport.label} pro guide`);

    await result.getByTestId('ai-brew-result-tab-coach').click();
    await expect(result.getByTestId('ai-brew-result-coach-panel')).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label} coach tab`);
    const moreAiTools = result.getByText(/Tool AI lainnya|More AI tools/i);
    if (await moreAiTools.count()) {
      await moreAiTools.click();
      await expectNoHorizontalOverflow(page, `${viewport.label} more ai tools`);
    }

    await result.getByTestId('ai-brew-result-tab-details').click();
    await expect(result.getByTestId('ai-brew-result-detail-panel')).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label} detail tab`);
    await page.getByRole('button', { name: /Tutup hasil|Tutup output plan|Close planned output/i }).click();
    browserErrors.expectNoFatalErrors(viewport.label);
  }
});

test('AI Brew Switch variants and inline method strip stay bounded on mobile', async ({ page }) => {
  const browserErrors = collectFatalBrowserErrors(page);
  await resetTools(page, 390, 844);

  await openProBuilder(page);
  await selectDripper(page, 'switch 02', 'hario-switch-02');
  await page.getByTestId('ai-brew-builder-mode-hot').click();
  await setVisibleInputValue(page, 'ai-brew-dose', '20');
  await expect(page.getByTestId('ai-brew-roast-grid')).toBeVisible();
  await expect(page.getByTestId('ai-brew-target-profile-grid')).toBeVisible();
  await expect(page.getByTestId('ai-brew-brew-mode-method-panel')).toBeVisible();
  await expect(page.getByTestId('ai-brew-switch-method-strip')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'switch 02 hot builder target and method controls');
  await expect(page.getByTestId('ai-brew-switch-safety-summary')).toContainText(/caution|hati|review|perlu|V60|hybrid/i);
  await expect(page.getByTestId('ai-brew-switch-size-hario-switch-02')).toHaveCount(0);
  await expectNoHorizontalOverflow(page, 'switch 02 caution');
  await closeBuilder(page);

  await openProBuilder(page);
  await selectDripper(page, 'mugen switch', 'mugen-x-switch');
  await setVisibleInputValue(page, 'ai-brew-dose', '18');
  await expect(page.getByTestId('ai-brew-switch-selected-size')).toContainText(/MUGEN/i);
  await expect(page.getByTestId('ai-brew-switch-section')).not.toContainText(/360 ml|Switch 03 capacity/i);
  await expectNoHorizontalOverflow(page, 'mugen switch configured');
  await closeBuilder(page);

  await openQuickBuilder(page);
  await selectDripper(page, 'switch 03', 'hario-switch-03');
  await expect(page.getByTestId('ai-brew-brew-mode-method-panel')).toBeVisible();
  await expect(page.getByTestId('ai-brew-switch-method-strip')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'switch method strip open');
  await page.getByTestId('ai-brew-switch-preset-auto-inline').click();

  for (const method of ['immersion_sweet', 'immersion_heavy_body', 'hybrid_balanced', 'hybrid_bright_clean', 'v60_mode', 'iced_hybrid'] as const) {
    if (method === 'iced_hybrid') {
      await page.getByTestId('ai-brew-builder-mode-iced').click();
    } else {
      await page.getByTestId('ai-brew-builder-mode-hot').click();
    }
    await expect(page.getByTestId(`ai-brew-switch-preset-inline-${method}`)).toBeVisible();
    await page.getByTestId(`ai-brew-switch-preset-inline-${method}`).click();
    await expectNoHorizontalOverflow(page, `switch inline method ${method}`);
  }

  browserErrors.expectNoFatalErrors('switch method strip');
});

test('AI Brew Hario Switch iced mode keeps builder, method strip, and result modal bounded', async ({ page }) => {
  const browserErrors = collectFatalBrowserErrors(page);

  for (const viewport of [
    { label: 'iphone-se-375', width: 375, height: 812 },
    { label: 'iphone-13-390', width: 390, height: 844 },
    { label: 'iphone-pro-max-430', width: 430, height: 932 },
  ] as const) {
    await resetTools(page, viewport.width, viewport.height);
    await openProBuilder(page);
    await setVisibleInputValue(page, 'ai-brew-coffee-name', `Switch Iced ${viewport.label}`);
    await selectDripper(page, 'switch 02', 'hario-switch-02');
    await setVisibleInputValue(page, 'ai-brew-dose', '20');
    await page.getByTestId('ai-brew-builder-mode-iced').click();
    await expect(page.getByTestId('ai-brew-switch-method-strip')).toBeVisible();
    await expect(page.getByTestId('ai-brew-switch-selected-size')).toContainText(/Switch 02/i);
    await expect(page.getByTestId('ai-brew-switch-selected-size')).toContainText(/Max tutup|Closed max/i);
    await expectNoHorizontalOverflow(page, `${viewport.label} switch 02 iced method strip`);
    await selectWaterBrand(page);

    await page.getByTestId('ai-brew-generate').click();
    const result = page.getByTestId('ai-brew-result');
    await expect(result).toBeVisible();
    await expect(result.getByTestId('ai-brew-time-semantics')).toContainText(/Ekstraksi panas|Hot extraction/i);
    await expect(result.getByTestId('ai-brew-time-helper')).toContainText(/Aduk es tidak menambah ekstraksi|Stirring ice does not add extraction/i);
    await expect(result.getByTestId('ai-brew-result-primary-actions')).toBeVisible();
    await expect(result.getByTestId('ai-brew-result-action-bar')).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label} switch iced summary`);

    await result.getByTestId('ai-brew-result-tab-flow').click();
    await expect(result.getByTestId('ai-brew-result-guide-panel')).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label} switch iced guide`);

    await result.getByTestId('ai-brew-result-tab-coach').click();
    await expect(result.getByTestId('ai-brew-result-coach-panel')).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label} switch iced ai`);

    await result.getByTestId('ai-brew-result-tab-details').click();
    await expect(result.getByTestId('ai-brew-result-detail-panel')).toBeVisible();
    await expectNoHorizontalOverflow(page, `${viewport.label} switch iced detail`);
    await page.getByRole('button', { name: /Tutup hasil|Tutup output plan|Close planned output/i }).click();
  }

  browserErrors.expectNoFatalErrors('switch iced mobile');
});

test('AI Brew long-text and non-Switch flows stay within viewport', async ({ page }) => {
  const browserErrors = collectFatalBrowserErrors(page);
  await resetTools(page, 375, 812);

  await openProBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'Extremely Long Origin Name With Producer Cooperative Experimental Lot And Multi Region Traceability For Overflow QA');
  await selectCustomProcessAndVariety(
    page,
    'Anaerobic natural thermal shock coferment extended fermentation with very long process descriptor',
    'Ethiopian heirloom gesha bourbon caturra typica long cultivar blend',
  );
  await selectWaterBrand(page);
  await selectDripper(page, 'v60', 'hario-v60');
  await expectNoHorizontalOverflow(page, 'long text v60 input');
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'long text result');
  await page.getByRole('button', { name: /Tutup hasil|Tutup output plan|Close planned output/i }).click();
  await closeBuilder(page);

  for (const [query, id] of [
    ['kalita', 'kalita-wave-155-185'],
    ['chemex', 'chemex'],
    ['aeropress', 'aeropress'],
    ['french press', 'french-press'],
    ['moka', 'bialetti-moka-pot'],
    ['cold brew', 'toddy-cold-brew'],
  ] as const) {
    await openProBuilder(page);
    await selectDripper(page, query, id);
    await expectNoHorizontalOverflow(page, `non-switch ${id}`);
    await closeBuilder(page);
  }

  browserErrors.expectNoFatalErrors('long text and non-switch');
});
