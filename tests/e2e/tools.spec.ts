import { test, expect, type Locator } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';
import { continueAsGuestFromAuthGate } from '../helpers/authGate';
import type { BrewPlan } from '../../apps/web/src/features/ai-brew/types';

const LAST_PLAN_STORAGE_KEY = 'BARISTACHAW_AI_BREW_LAST_PLAN_V5';
const AI_BREW_SEQUENCE_HEADING = /Brew Guide|Brew Sequence|Panduan Seduh|Urutan Seduh/i;
const AI_BREW_SAVED_COLLECTION = /Recipe saved to Collection\.|Recipe tersimpan ke Collection\./i;
const AI_BREW_CLOSE_OUTPUT = /Close planned output|Tutup output plan/i;
const AI_BREW_EXACT_PROFILE = /Exact profile|Profil exact/i;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('BARISTA_LANGUAGE', 'en');
    localStorage.setItem('BARISTA_LANGUAGE_ID_DEFAULT_MIGRATED', '1');
  });
  await qaLogout(page.request);
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await mockAiApis(page);
  await page.goto('/tools');
  await clearClientState(page);
  await page.goto('/tools', { waitUntil: 'domcontentloaded' });
});

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

async function switchAiBrewToManualWater(page: import('@playwright/test').Page, values?: {
  tds?: string;
  hardness?: string;
  alkalinity?: string;
}) {
  await page.getByTestId('ai-brew-water-mode-manual').click();
  const setNumericValue = async (testId: string, value: string) => {
    const input = page.getByTestId(testId);
    await expect(input).toBeVisible();
    await page.evaluate(({ nextTestId, nextValue }) => {
      const field = Array.from(document.querySelectorAll<HTMLInputElement>(`[data-testid="${nextTestId}"]`))
        .find((candidate) => candidate.offsetParent !== null);
      if (!field) throw new Error(`Missing field: ${nextTestId}`);
      const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
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
  };

  await expect(page.getByTestId('ai-brew-water-tds')).toBeVisible();
  if (values?.tds) {
    await setNumericValue('ai-brew-water-tds', values.tds);
  }
  if (values?.hardness) {
    await setNumericValue('ai-brew-water-hardness', values.hardness);
  }
  if (values?.alkalinity) {
    await setNumericValue('ai-brew-water-alkalinity', values.alkalinity);
  }
}

async function openAiBrewQuickMode(page: import('@playwright/test').Page) {
  await page.getByTestId('ai-brew-open-quick').click();
  await expect(page.getByTestId('ai-brew-builder-quick')).toBeVisible();
}

async function openAiBrewProMode(page: import('@playwright/test').Page) {
  await page.getByTestId('ai-brew-open-pro').click();
  await expect(page.getByTestId('ai-brew-builder-pro')).toBeVisible();
}

async function openAiBrewProSection(
  page: import('@playwright/test').Page,
  section: 'recipe' | 'bean' | 'water' | 'grinder' | 'method' | 'confidence',
) {
  const trigger = page.getByTestId(`ai-brew-pro-accordion-trigger-${section}`);
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click();
  }
  await expect(page.getByTestId(`ai-brew-pro-accordion-panel-${section}`)).toBeVisible();
}

async function selectAiBrewWaterBrand(
  page: import('@playwright/test').Page,
  query: string,
  resultId: string,
) {
  const waterPicker = page.getByTestId('ai-brew-water-picker');
  const search = page.getByTestId('ai-brew-picker-search-water_brand');

  await waterPicker.click();
  try {
    await expect(search).toBeVisible({ timeout: 5_000 });
  } catch {
    await waterPicker.click();
    await expect(search).toBeVisible({ timeout: 20_000 });
  }

  await setVisibleInputValue(page, 'ai-brew-picker-search-water_brand', query);

  const preferred = page.getByTestId(`ai-brew-picker-option-water_brand-${resultId}`);
  try {
    await expect(preferred.first()).toBeVisible({ timeout: 5_000 });
    await preferred.first().click();
    return;
  } catch {
    // Some local catalog snapshots may not include the preferred id; use the first visible match.
  }

  const fallback = page.locator('[data-testid^="ai-brew-picker-option-water_brand-"]').first();
  await expect(fallback).toBeVisible();
  await fallback.click();
}

async function setVisibleInputValue(
  page: import('@playwright/test').Page,
  testId: string,
  value: string,
) {
  const input = page.getByTestId(testId);
  await expect(input).toBeVisible();
  await page.evaluate(({ nextTestId, nextValue }) => {
    const field = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      `[data-testid="${nextTestId}"]`
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
  await expect(input).toHaveValue(value);
}

async function readStoredAiBrewPlan(page: import('@playwright/test').Page): Promise<BrewPlan> {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), LAST_PLAN_STORAGE_KEY);
  expect(raw).toBeTruthy();
  const parsed = JSON.parse(raw || '{}') as { payload?: BrewPlan };
  expect(parsed.payload?.id).toBeTruthy();
  return parsed.payload as BrewPlan;
}

function formatAiBrewDisplayRatio(value: number) {
  if (!Number.isFinite(value)) return '--';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatAiBrewTimerValue(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatAiBrewGuideValue(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

test('tools tabs expose accessible tab semantics and keyboard navigation', async ({ page }) => {
  const aiTab = page.getByRole('tab', { name: 'AI Brew' });
  const timerTab = page.getByRole('tab', { name: 'Timer' });
  const ratioTab = page.getByRole('tab', { name: 'Ratio' });
  const tasksTab = page.getByRole('tab', { name: 'Tasks' });

  await expect(aiTab).toHaveAttribute('aria-selected', 'true');
  await aiTab.press('ArrowRight');
  await expect(timerTab).toHaveAttribute('aria-selected', 'true');
  await timerTab.press('ArrowRight');
  await expect(ratioTab).toHaveAttribute('aria-selected', 'true');
  await ratioTab.press('End');
  await expect(tasksTab).toHaveAttribute('aria-selected', 'true');
  await tasksTab.press('Home');
  await expect(aiTab).toHaveAttribute('aria-selected', 'true');
});

test('timer controls work', async ({ page }) => {
  await page.getByRole('tab', { name: 'Timer' }).click();
  await page.getByRole('button', { name: '02:30' }).click();
  await page.locator('button.w-16.h-16.rounded-full.bg-blue-500').click();
  await expect(page.getByText(/00:0[1-9]/).first()).toBeVisible({ timeout: 10_000 });
});

test('ratio tab recalculates values', async ({ page }) => {
  await page.getByRole('tab', { name: 'Ratio' }).click();
  const doseInput = page.getByTestId('dose-input');
  const waterInput = page.getByTestId('water-input');
  await doseInput.fill('20');
  await expect(waterInput).toHaveValue('320');
  await page.getByRole('button', { name: '1:15', exact: true }).click();
  await expect(waterInput).toHaveValue('300');
});

test('method switch changes yield output and advanced mode computes extraction', async ({ page }) => {
  await page.getByRole('tab', { name: 'Ratio' }).click();

  await page.getByTestId('dose-input').fill('20');
  await page.getByTestId('ratio-input').fill('16');
  const v60Output = page.getByTestId('beverage-output-value');
  await expect(v60Output).toBeVisible();
  const v60Text = (await v60Output.textContent()) || '';

  await page.getByTestId('brew-method-chemex').click();
  const chemexText = (await page.getByTestId('beverage-output-value').textContent()) || '';
  expect(chemexText).not.toEqual(v60Text);

  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await page.getByTestId('tds-input').fill('1.35');
  await expect(page.getByTestId('extraction-yield-value')).toBeVisible();
});

test('espresso shot presets update ratio and avoid filter baseline warning copy', async ({ page }) => {
  await page.getByRole('tab', { name: 'Ratio' }).click();
  await page.getByTestId('brew-method-espresso').click();

  await expect(page.getByTestId('espresso-shot-presets')).toBeVisible();
  await page.getByTestId('espresso-shot-ristretto').click();
  await expect(page.getByTestId('ratio-input')).toHaveValue('1.3');
  await page.getByTestId('espresso-shot-espresso').click();
  await expect(page.getByTestId('ratio-input')).toHaveValue('2');

  await expect(page.getByText(/12-22|SCA-style filter baseline/i)).toHaveCount(0);
});

test('roast profile updates guidance and adaptive toggle does not force ratio when off', async ({ page }) => {
  await page.getByRole('tab', { name: 'Ratio' }).click();
  await page.getByTestId('brew-method-v60').click();
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();

  const ratioInput = page.getByTestId('ratio-input');
  await ratioInput.fill('16');
  await page.getByTestId('roast-level-light').click();
  await expect(page.getByText(/Roast-adjusted ratio target:/i)).toContainText(/light/i);

  await page.getByRole('checkbox').setChecked(false);
  await ratioInput.fill('15.7');
  await page.getByTestId('roast-level-dark').click();
  await expect(ratioInput).toHaveValue('15.7');

  await page.getByTestId('agtron-toggle').click();
  await page.getByTestId('agtron-input').fill('35');
  await expect(page.getByText(/Agtron maps to/i)).toBeVisible();
});

test('method switch uses medium defaults in basic and roast-aware defaults in advanced', async ({ page }) => {
  await page.getByRole('tab', { name: 'Ratio' }).click();
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();

  await page.getByTestId('roast-level-dark').click();
  await page.getByTestId('brew-method-espresso').click();
  await expect(page.getByTestId('ratio-input')).toHaveValue('1.9');

  await page.getByRole('button', { name: 'Basic', exact: true }).click();
  await page.getByTestId('brew-method-v60').click();
  await page.getByTestId('brew-method-espresso').click();
  await expect(page.getByTestId('ratio-input')).toHaveValue('2');
});

test('basic mode hides advanced controls and diagnostics while keeping core inputs visible', async ({ page }) => {
  await page.getByRole('tab', { name: 'Ratio' }).click();
  await page.getByRole('button', { name: 'Basic', exact: true }).click();

  await expect(page.getByText('Roast Profile')).toHaveCount(0);
  await expect(page.getByTestId('tds-input')).toHaveCount(0);
  await expect(page.getByTestId('measured-output-input')).toHaveCount(0);
  await expect(page.getByTestId('conformance-panel')).toHaveCount(0);
  await expect(page.getByTestId('dose-input')).toBeVisible();
  await expect(page.getByTestId('water-input')).toBeVisible();
  await expect(page.getByTestId('ratio-input')).toBeVisible();
});

test('standards provenance stays hidden from both modes', async ({ page }) => {
  await page.getByRole('tab', { name: 'Ratio' }).click();
  await expect(page.getByTestId('standards-provenance')).toHaveCount(0);
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await expect(page.getByTestId('standards-provenance')).toHaveCount(0);
});

test('ratio settings persist after reload', async ({ page }) => {
  await page.getByRole('tab', { name: 'Ratio' }).click();
  await page.getByTestId('brew-method-kalita_wave').click();
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await page.getByTestId('dose-input').fill('18');
  await page.getByTestId('ratio-input').fill('15.5');
  await page.getByTestId('tds-input').fill('1.40');
  await page.goto('/tools?tab=ratio', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Ratio' }).click();

  await expect(page.getByTestId('brew-method-kalita_wave')).toHaveClass(/bg-blue-600/);
  await expect(page.getByRole('button', { name: 'Advanced', exact: true })).toHaveClass(/bg-blue-600/);
  await expect(page.getByTestId('ratio-input')).toHaveValue('15.5');
});

test('tasks tab add toggle delete persists', async ({ page }) => {
  await page.getByRole('tab', { name: 'Tasks' }).click();
  const input = page.getByPlaceholder('Add a task...');
  await input.fill('qa_e2e task');
  await input.press('Enter');
  await expect(page.getByText('qa_e2e task')).toBeVisible();
  await page.goto('/tools?tab=todo', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Tasks' }).click();
  await expect(page.getByText('qa_e2e task')).toBeVisible();
});

test('ai brew reveals custom process, variety, and water inputs', async ({ page }) => {
  await expect(page.getByTestId('ai-brew-panel')).toBeVisible();
  await expect(page.getByTestId('ai-brew-coffee-name')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-open-quick')).toBeVisible();
  await expect(page.getByTestId('ai-brew-open-pro')).toBeVisible();

  await openAiBrewQuickMode(page);
  await expect(page.getByTestId('ai-brew-bean-details-summary')).toBeVisible();
  await expect(page.getByTestId('ai-brew-process-picker')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-variety-picker')).toHaveCount(0);
  await page.getByTestId('ai-brew-bean-details-toggle').click();
  await expect(page.getByTestId('ai-brew-process-picker')).toBeVisible();
  await expect(page.getByTestId('ai-brew-variety-picker')).toBeVisible();
  await expect(page.getByTestId('ai-brew-bean-profile-toggle')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-water-picker')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-mode-manual')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-toggle-minerals')).toHaveCount(0);
  await page.getByTestId('ai-brew-water-mode-manual').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-preset-ideal-filter')).toBeVisible();
  await expect(page.getByTestId('ai-brew-builder-quick').getByText(/Cepat -|Quick -/i)).toHaveCount(0);
  await page.getByTestId('ai-brew-close-quick').click();

  await openAiBrewProMode(page);
  await page.getByTestId('ai-brew-process-picker').click();
  await page.getByRole('button', { name: /Select custom process/i }).click();
  await expect(page.getByTestId('ai-brew-process-custom')).toBeVisible();

  await page.getByTestId('ai-brew-variety-picker').click();
  await page.getByRole('button', { name: /Select custom variety/i }).click();
  await expect(page.getByTestId('ai-brew-variety-custom')).toBeVisible();

  await expect(page.getByTestId('ai-brew-bean-profile-toggle')).toBeVisible();
  await expect(page.getByTestId('ai-brew-bean-altitude')).toHaveCount(0);
  await page.getByTestId('ai-brew-bean-profile-toggle').click();
  await expect(page.getByTestId('ai-brew-bean-altitude')).toBeVisible();
  await expect(page.getByTestId('ai-brew-bean-density')).toBeVisible();

  await switchAiBrewToManualWater(page);
  await expect(page.getByTestId('ai-brew-water-tds')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-hardness')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toBeVisible();
});

test('ai brew keeps pour controls out of quick mode and inside precision details', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await expect(page.getByTestId('ai-brew-pour-control-panel')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-method-option-panel')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-pour-style-auto')).toHaveCount(0);
  await page.getByTestId('ai-brew-close-quick').click();

  await openAiBrewProMode(page);
  await openAiBrewProSection(page, 'recipe');
  await expect(page.getByTestId('ai-brew-target-ratio')).toBeVisible();
  await expect(page.getByTestId('ai-brew-pour-control-panel')).toBeVisible();
  await expect(page.getByTestId('ai-brew-pour-style-auto')).toBeVisible();

  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByTestId('ai-brew-picker-search-dripper').fill('origami');
  await page.getByTestId('ai-brew-picker-option-dripper-origami-dripper-s-m').click();
  await openAiBrewProSection(page, 'method');
  await expect(page.getByTestId('ai-brew-method-option-panel')).toBeVisible();
  await page.getByTestId('ai-brew-origami-filter-wave').click();
  await expect(page.getByTestId('ai-brew-origami-filter-wave')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByTestId('ai-brew-picker-search-dripper').fill('aeropress');
  await page.getByTestId('ai-brew-picker-option-dripper-aeropress').click();
  await expect(page.getByTestId('ai-brew-method-option-panel')).toBeVisible();
  await page.getByTestId('ai-brew-aeropress-style-bypass').click();
  await expect(page.getByTestId('ai-brew-aeropress-style-bypass')).toHaveAttribute('aria-pressed', 'true');
});

test('ai brew brewer picker prioritizes complete method catalog and search aliases', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-dripper-picker').click();

  const picker = page.getByRole('dialog', { name: /Dripper|Alat seduh|Brewer/i });
  await expect(picker).toBeVisible();
  await expect(page.getByText(/Metode seduh inti|Core brew methods/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Dripper spesialti|Specialty drippers/i })).toContainText(/Tap to show more drippers|Ketuk untuk lihat/i);
  await expect(page.getByTestId('ai-brew-picker-option-dripper-espresso-machine')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-dripper-aeropress')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-dripper-french-press')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-dripper-hario-switch-02')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-dripper-hario-switch-03')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-dripper-mugen-x-switch')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-dripper-hario-switch')).toHaveCount(0);

  const search = page.getByTestId('ai-brew-picker-search-dripper');
  const searchCases = [
    ['espresso', 'espresso-machine'],
    ['aeropress', 'aeropress'],
    ['french press', 'french-press'],
    ['cold brew', 'toddy-cold-brew'],
    ['moka', 'bialetti-moka-pot'],
    ['batch', 'batch-brewer'],
    ['siphon', 'hario-siphon'],
    ['switch 03', 'hario-switch-03'],
    ['mugen switch', 'mugen-x-switch'],
  ] as const;

  for (const [query, expectedId] of searchCases) {
    await search.fill(query);
    await expect(page.getByTestId(`ai-brew-picker-option-dripper-${expectedId}`)).toBeVisible();
  }
});

test('ai brew Hario Switch quick plan defaults to safe Hybrid Balanced with valve checkpoints', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Switch Hybrid Balanced');
  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByTestId('ai-brew-picker-search-dripper').fill('switch 03');
  await page.getByTestId('ai-brew-picker-option-dripper-hario-switch-03').click();

  await expect(page.getByTestId('ai-brew-switch-section')).toBeVisible();
  await expect(page.getByTestId('ai-brew-switch-selected-size')).toContainText(/Switch 03/i);
  await expect(page.getByTestId('ai-brew-switch-size-hario-switch-03')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-switch-dose-15')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-dose-chip-15')).toBeVisible();
  await expect(page.getByTestId('ai-brew-brew-mode-method-panel')).toBeVisible();
  await expect(page.getByTestId('ai-brew-switch-preset-auto-inline')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('ai-brew-switch-method-strip')).toContainText(/Auto follows the taste target|Auto mengikuti target rasa|Auto ikut Profil Target/i);

  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('QA Switch Hybrid Balanced');
  await expect(result.getByTestId('ai-brew-switch-result-summary')).toContainText(/Hybrid Balanced|Hybrid seimbang/i);
  await result.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-sequence-section')).toContainText(/Closed|Open|Release|Katup|Buka/i);

  const plan = await readStoredAiBrewPlan(page);
  expect(plan.dripper.id).toBe('hario-switch-03');
  expect(plan.methodFamily).toBe('hario_switch');
  expect(plan.switchPresetId).toBe('hybrid_balanced');
  expect(plan.switchProvenance?.hardwareVerificationLevel).toBe('official');
  expect(plan.switchProvenance?.workflowVerificationLevel).toBe('curated_synthesis');
  expect(plan.switchCompatibility?.status).toBe('safe');
  expect(plan.switchStepValidation?.status).toBe('safe');
  expect(plan.switchTasteProgramme?.bloomMl).toBeGreaterThan(0);
  expect(plan.switchTasteProgramme?.closedPhaseMl).toBeGreaterThan(plan.switchTasteProgramme?.bloomMl || 0);
  expect(plan.switchTasteProgramme?.openPhaseMl).toBeGreaterThan(0);
  const sourceWaterSteps = plan.steps.filter((step) => (step.pourVolumeMl || 0) > 0);
  for (const sourceStep of sourceWaterSteps) {
    expect(plan.workflowGuideSteps?.some((guideStep) => guideStep.sourceStepIds?.includes(sourceStep.id))).toBe(true);
  }
  const guideWaterSteps = (plan.workflowGuideSteps || []).filter((step) => (step.pourVolumeMl || 0) > 0);
  expect(guideWaterSteps.every((step) => /\d+:\d{2}/.test(step.primaryText || ''))).toBe(true);
  expect(guideWaterSteps.every((step) => /tuang \d+ ml sampai \d+ ml/i.test(step.primaryText || ''))).toBe(true);
  expect(guideWaterSteps.some((step) => (step.techniqueChips || []).some((chip) => chip.key === 'chamber_load'))).toBe(true);
  expect(sourceWaterSteps.every((step) => step.flowRateMlPerSec && step.pourPath && step.agitationLevel)).toBe(true);
});

test('ai brew Hario Switch Auto follows taste target before method preference', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Switch Auto Bright');
  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByTestId('ai-brew-picker-search-dripper').fill('switch 03');
  await page.getByTestId('ai-brew-picker-option-dripper-hario-switch-03').click();

  await page.getByTestId('ai-brew-target-profile-floral_transparent').click();
  await expect(page.getByTestId('ai-brew-switch-preset-auto-inline')).toHaveAttribute('aria-pressed', 'true');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('QA Switch Auto Bright');
  await expect(result.getByTestId('ai-brew-switch-result-summary')).toContainText(/Bright Clean|cerah bersih|cerah/i);
  await result.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-sequence-section')).toContainText(/Open|Closed|Katup|Tutup|Buka/i);

  const plan = await readStoredAiBrewPlan(page);
  expect(plan.dripper.id).toBe('hario-switch-03');
  expect(plan.targetProfileId).toBe('floral_transparent');
  expect(plan.switchPresetId).toBe('hybrid_bright_clean');
  expect(plan.methodProgramme).toBe('percolation_then_immersion');
  expect(plan.switchTasteProgramme?.bloomRatio).toBeLessThanOrEqual(2.5);
  expect(plan.switchTasteProgramme?.openPhaseMl).toBeGreaterThan(plan.switchTasteProgramme?.closedPhaseMl || 0);
  expect(plan.expectedCupProfile?.clarity).toBeGreaterThanOrEqual(4);
  expect(plan.steps.filter((step) => (step.pourVolumeMl || 0) > 0).every((step) => step.flowRateMlPerSec && step.pourPath && step.agitationLevel)).toBe(true);
});

test('ai brew MUGEN x SWITCH keeps its own preset and 200 ml compatibility model', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA MUGEN Switch');
  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByTestId('ai-brew-picker-search-dripper').fill('mugen switch');
  await page.getByTestId('ai-brew-picker-option-dripper-mugen-x-switch').click();

  await expect(page.getByTestId('ai-brew-switch-section')).toBeVisible();
  await expect(page.getByTestId('ai-brew-switch-selected-size')).toContainText(/MUGEN/i);
  await expect(page.getByTestId('ai-brew-switch-size-mugen-x-switch')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-switch-preset-inline-mugen_everyday_hybrid')).toBeVisible();

  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toContainText('QA MUGEN Switch', { timeout: 30_000 });

  const plan = await readStoredAiBrewPlan(page);
  expect(plan.dripper.id).toBe('mugen-x-switch');
  expect(plan.methodFamily).toBe('hario_switch');
  expect(plan.switchPresetId).toBe('mugen_everyday_hybrid');
  expect(plan.switchCompatibility?.status).toBe('safe');
  expect(plan.switchCompatibility?.sizeLabel).toMatch(/MUGEN/i);
  expect(plan.devicePhysicalConstraints?.finishedCapacityMl).toBe(200);
  expect(plan.switchStepValidation?.maxClosedLoadMl).toBeLessThan(320);
  expect(plan.switchStepValidation?.peakClosedLoadMl).toBeLessThanOrEqual(plan.switchStepValidation?.maxClosedLoadMl || 0);
  expect(plan.switchWhy || '').toMatch(/MUGEN|low-bypass|hybrid/i);
  await expect(page.getByTestId('ai-brew-result').getByTestId('ai-brew-switch-result-summary')).toContainText(/MUGEN/i);
});

test('ai brew process and variety picker search prioritizes exact canonical matches', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-bean-details-toggle').click();

  await page.getByTestId('ai-brew-process-picker').click();
  await expect(page.getByTestId('ai-brew-process-category-chips')).toBeVisible();
  await setVisibleInputValue(page, 'ai-brew-picker-search-process', 'Natural');
  await expect(page.locator('[data-testid^="ai-brew-picker-option-process-"]').first()).toHaveAttribute('data-testid', 'ai-brew-picker-option-process-natural');
  await page.getByTestId('ai-brew-picker-option-process-natural').click();
  await expect(page.getByTestId('ai-brew-process-picker')).toContainText(/Natural/i);

  await page.getByTestId('ai-brew-process-picker').click();
  await setVisibleInputValue(page, 'ai-brew-picker-search-process', 'Giling Basah');
  await expect(page.locator('[data-testid^="ai-brew-picker-option-process-"]').first()).toHaveAttribute('data-testid', 'ai-brew-picker-option-process-wet_hulled');
  await page.getByTestId('ai-brew-picker-option-process-wet_hulled').click();
  await expect(page.getByTestId('ai-brew-process-picker')).toContainText(/Wet Hulled|Giling Basah/i);

  const varietyCases = [
    ['Ethiopian', /Ethiopian|Landrace|Heirloom/i],
    ['Bourbon', /Bourbon/i],
    ['Caturra', /Caturra/i],
    ['Geisha', /Geisha|Gesha/i],
    ['Gesha', /Geisha|Gesha/i],
  ] as const;

  for (const [query, expectedText] of varietyCases) {
    await page.getByTestId('ai-brew-variety-picker').click();
    await setVisibleInputValue(page, 'ai-brew-picker-search-variety', query);
    const firstVariety = page.locator('[data-testid^="ai-brew-picker-option-variety-"]').first();
    await expect(firstVariety).toBeVisible();
    await expect(firstVariety).toContainText(expectedText);
    await page.getByRole('button', { name: /Close picker|Tutup picker|Tutup/i }).click();
  }
});

test('ai brew guide renders workflow-specific phases for non-pour-over methods', async ({ page }) => {
  const cases = [
    {
      query: 'aeropress',
      optionId: 'aeropress',
      coffeeName: 'QA AeroPress Workflow',
      expected: /Charge water|Stir|Steep|Press|Stop before hiss/i,
    },
    {
      query: 'french press',
      optionId: 'french-press',
      coffeeName: 'QA French Press Workflow',
      expected: /Charge water|Steep|Settle|Press gently|Decant/i,
    },
    {
      query: 'moka',
      optionId: 'bialetti-moka-pot',
      coffeeName: 'QA Moka Workflow',
      expected: /Fill boiler|Level basket|Moderate heat|Monitor flow|Stop before sputter/i,
    },
  ] as const;

  for (const entry of cases) {
    await openAiBrewQuickMode(page);
    await setVisibleInputValue(page, 'ai-brew-coffee-name', entry.coffeeName);
    await page.getByTestId('ai-brew-dripper-picker').click();
    await page.getByTestId('ai-brew-picker-search-dripper').fill(entry.query);
    await page.getByTestId(`ai-brew-picker-option-dripper-${entry.optionId}`).click();
    await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
    await page.getByTestId('ai-brew-generate').click();

    const result = page.getByTestId('ai-brew-result');
    await expect(result).toContainText(entry.coffeeName);
    await result.getByTestId('ai-brew-result-tab-flow').click();
    await expect(result.getByTestId('ai-brew-sequence-section')).toContainText(entry.expected);
    const plan = await readStoredAiBrewPlan(page);
    expect(plan.workflowValidation?.passed).toBe(true);
    expect(plan.workflowGuideSteps?.length || 0).toBeGreaterThan(plan.steps.length);
    await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
  }
});

test('ai brew grinder picker keeps Feima 600N searchable without exposing alias noise', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-grinder-picker').click();
  await page.getByTestId('ai-brew-picker-search-grinder').fill('Feima 600N');

  const feima = page.getByTestId('ai-brew-picker-option-grinder-feima-600n');
  await expect(feima).toBeVisible();
  await expect(feima).toContainText(/Feima 600N/i);
  await expect(feima).toContainText(/Curated reference|Community reference|Referensi kurasi|Referensi komunitas/i);
  await expect(feima).not.toContainText(/Latina 600N|Flying Eagle 600N|Murane B600BN/i);
});

test('ai brew locks ice mode for methods that should stay hot or dedicated cold', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByTestId('ai-brew-picker-search-dripper').fill('espresso');
  await page.getByTestId('ai-brew-picker-option-dripper-espresso-machine').click();

  await expect(page.getByTestId('ai-brew-builder-mode-iced')).toBeDisabled();
  await expect(page.getByTestId('ai-brew-iced-unavailable-note')).toBeVisible();
  await expect(page.getByTestId('ai-brew-iced-unavailable-note')).toContainText(/fake iced recipe|resep es palsu/i);
});

test('ai brew pro keeps mineral editor collapsed by default for ready-brew brand water', async ({ page }) => {
  await openAiBrewProMode(page);
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');

  await expect(page.getByTestId('ai-brew-water-toggle-minerals')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);

  await page.getByTestId('ai-brew-water-toggle-minerals').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toBeVisible();

  await page.getByTestId('ai-brew-water-toggle-minerals').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);
});

test('ai brew water picker modal autofills a published brew-ready brand', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Aqua Search');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');

  const waterSummary = page.getByTestId('ai-brew-water-summary');
  await expect(waterSummary).toBeVisible();
  await expect(waterSummary).toContainText(/TDS 112/i);
  await expect(waterSummary).toContainText(/Ready/i);

  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toContainText('QA Aqua Search');
  await expect(page.getByTestId('ai-brew-result')).toContainText('Aqua');
});

test('ai brew quick manual mineral presets can generate safe water baselines', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Manual Minerals Quick');
  await switchAiBrewToManualWater(page);
  await page.getByTestId('ai-brew-water-preset-ideal-filter').click();

  await expect(page.getByTestId('ai-brew-water-tds')).toHaveValue('90');
  await expect(page.getByTestId('ai-brew-water-hardness')).toHaveValue('55');
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toHaveValue('40');
  await expect(page.getByTestId('ai-brew-generate')).toBeEnabled();

  await page.getByTestId('ai-brew-generate').click();
  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('QA Manual Minerals Quick');
  await expect(result).toContainText(/Manual mineral/i);
  const plan = await readStoredAiBrewPlan(page);
  expect(plan.waterMode).toBe('manual');
  expect(plan.waterMinerals.tdsPpm).toBe(90);
  expect(plan.waterMinerals.hardnessPpm).toBe(55);
  expect(plan.waterMinerals.alkalinityPpm).toBe(40);
});

test('ai brew quick water picker stays simple while pro keeps full water coverage', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-water-picker').click();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-pure-life-global')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-aqua-id')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-aqua-id')).not.toContainText(/TDS|GH|KH/i);
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-le-minerale-id')).toBeVisible();

  await page.getByTestId('ai-brew-picker-search-water_brand').fill('volvic');
  await expect(page.getByRole('button', { name: /Select water brand Volvic/i })).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-volvic-sg')).toBeVisible();

  await page.getByRole('button', { name: /Close picker|Tutup picker|Tutup/i }).click();
  await page.getByTestId('ai-brew-close-quick').click();

  await openAiBrewProMode(page);
  await page.getByTestId('ai-brew-water-picker').click();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-le-minerale-id')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-le-minerale-my')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-pure-life-sg')).toHaveCount(0);
  await page.getByTestId('ai-brew-picker-search-water_brand').fill('heysong');
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-heysong-water-sg')).toBeVisible();
});

test('ai brew selecting a published water autofills complete minerals and keeps the editor optional', async ({ page }) => {
  await openAiBrewProMode(page);
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');

  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Aqua/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Ready/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/TDS 112/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/GH 79/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/KH 68\.3/i);
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);
  await page.getByTestId('ai-brew-water-toggle-minerals').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveValue('112');
  await expect(page.getByTestId('ai-brew-water-hardness')).toHaveValue('79');
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toHaveValue('68.3');

  await page.getByTestId('ai-brew-water-mode-manual').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveValue('');
  await expect(page.getByTestId('ai-brew-water-hardness')).toHaveValue('');
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toHaveValue('');
});

test('ai brew preloads known GH and KH values for partially mapped waters', async ({ page }) => {
  await openAiBrewProMode(page);
  await selectAiBrewWaterBrand(page, 'le', 'le-minerale-id');

  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Le Minerale/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/High alkalinity|Alkalinitas/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/TDS 299/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/GH 211\.1/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/KH 182\.4/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/High Buffer/i);
  await expect(page.getByTestId('ai-brew-generate')).toBeEnabled();
});

test('ai brew blocks low-mineral waters until manual minerals are entered', async ({ page }) => {
  await openAiBrewProMode(page);
  await selectAiBrewWaterBrand(page, 'amidis', 'amidis-id');

  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Amidis/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Needs minerals|Manual required|Use as RO base/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/TDS 2/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/GH 1\.4/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/KH 1\.2/i);
  await expect(page.getByTestId('ai-brew-generate')).toBeDisabled();
  await expect(page.getByTestId('ai-brew-water-tds')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveValue('');
  await expect(page.getByTestId('ai-brew-water-hardness')).toHaveValue('');
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toHaveValue('');

  await expect(page.getByTestId('ai-brew-water-complete-minerals')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-complete-minerals-hint')).toContainText(/RO|low-mineral|remineralization/i);
  await page.getByTestId('ai-brew-water-complete-minerals').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveValue(/\d+/);
  await expect(page.getByTestId('ai-brew-water-hardness')).toHaveValue(/\d+/);
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toHaveValue(/\d+/);
  await expect(page.getByTestId('ai-brew-generate')).toBeEnabled();

  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toContainText(/Amidis/i);
  await expect(page.getByTestId('ai-brew-result')).toContainText(/low-mineral|minerals|mineral/i);
});

test('ai brew labels estimated water as manual verification only', async ({ page }) => {
  await openAiBrewProMode(page);
  await selectAiBrewWaterBrand(page, 'heysong', 'heysong-water-sg');

  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/HeySong/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Estimated.*verify manually|Estimated.*manual/i);
  await expect(page.getByTestId('ai-brew-generate')).toBeDisabled();
  await expect(page.getByTestId('ai-brew-water-complete-minerals')).toBeVisible();
  await page.getByTestId('ai-brew-water-complete-minerals').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveValue(/\d+/);
  await expect(page.getByTestId('ai-brew-water-hardness')).toHaveValue(/\d+/);
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toHaveValue(/\d+/);
  await expect(page.getByTestId('ai-brew-generate')).toBeEnabled();
  await expect(page.getByText(/local:\/Users\/Alpha/i)).toHaveCount(0);
});

test('ai brew pro bean profile updates the analysis state while quick stays minimal', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await expect(page.getByTestId('ai-brew-bean-profile-toggle')).toHaveCount(0);
  await page.getByTestId('ai-brew-close-quick').click();

  await openAiBrewProMode(page);
  await expect(page.getByTestId('ai-brew-pro-bean-required')).toBeVisible();
  await page.getByTestId('ai-brew-bean-profile-toggle').click();
  await expect(page.getByTestId('ai-brew-bean-altitude')).toBeVisible();
  await expect(page.getByTestId('ai-brew-bean-density')).toBeVisible();
  await page.getByTestId('ai-brew-bean-altitude').fill('1850');
  await page.getByTestId('ai-brew-bean-density').fill('0.73');
  await page.getByTestId('ai-brew-bean-roast-underdeveloped').click();
  await page.getByTestId('ai-brew-bean-solubility-low').click();
});

test('ai brew generates a hot brew plan and saves it to collection', async ({ page }) => {
  await expect(page.getByTestId('ai-brew-panel')).toBeVisible();

  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Ethiopia Chelbesa');
  await page.getByTestId('ai-brew-dose').fill('18');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('QA Ethiopia Chelbesa');
  await result.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-sequence-section')).toContainText(AI_BREW_SEQUENCE_HEADING);
  await expect(result.getByTestId('ai-brew-step-card-1')).toBeVisible();
  const hotPlan = await readStoredAiBrewPlan(page);
  const quickSetup = result.getByTestId('ai-brew-quick-setup');
  await expect(quickSetup.getByTestId('ai-brew-quick-setup-grind')).toBeVisible();
  await expect(quickSetup.getByTestId('ai-brew-quick-setup-water')).toContainText(`${hotPlan.totalWaterMl} ml`);
  await expect(quickSetup.getByTestId('ai-brew-quick-setup-ratio')).toContainText(`1:${formatAiBrewDisplayRatio(hotPlan.finalBeverageRatio)}`);
  await expect(quickSetup.getByTestId('ai-brew-quick-setup-time')).toContainText(formatAiBrewGuideValue(hotPlan.extractionEndSeconds ?? hotPlan.totalTimeSeconds));
  await expect(quickSetup.getByTestId('ai-brew-quick-setup-temp')).toContainText(/°C/);
  await expect(result.getByTestId('ai-brew-quick-cues')).toContainText(/Setup|Quick correction|Koreksi cepat/i);

  await result.getByTestId('ai-brew-result-secondary-actions').locator('summary').click();
  await result.getByTestId('ai-brew-save').click();
  await expect(page.getByText(AI_BREW_SAVED_COLLECTION)).toBeVisible();
  await page.goto('/collection', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Collection|Koleksi/i })).toBeVisible();
  await expect(page.getByText('QA Ethiopia Chelbesa')).toBeVisible();
});

test('ai brew quick and pro modes honor target profile changes in the generated result', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Target Quick');
  await expect(page.getByTestId('ai-brew-dose')).toHaveAttribute('min', '10');
  await expect(page.getByTestId('ai-brew-dose')).toHaveAttribute('max', '20');
  await expect(page.getByTestId('ai-brew-dose-range-hint')).toContainText(/10-20/);
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByRole('button', { name: /More Acidity|Lebih Cerah/i }).click();
  await page.getByTestId('ai-brew-generate').click();

  const quickResult = page.getByTestId('ai-brew-result');
  await expect(quickResult).toContainText(/More Acidity|Lebih Cerah/i);
  await expect(quickResult.getByTestId('ai-brew-result-metric-strip')).toHaveCount(0);
  const quickPlan = await readStoredAiBrewPlan(page);
  const quickWater = quickPlan.totalWaterMl;
  const quickTemp = quickPlan.waterTempC;
  const quickTime = quickPlan.totalTimeSeconds;
  expect(quickWater).toBeGreaterThan(0);
  expect(quickTemp).toBeGreaterThan(0);
  expect(quickTime).toBeGreaterThan(0);

  await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();

  await openAiBrewProMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Target Pro');
  await openAiBrewProSection(page, 'recipe');
  await expect(page.getByTestId('ai-brew-target-ratio')).toHaveAttribute('min', '13');
  await expect(page.getByTestId('ai-brew-target-ratio')).toHaveAttribute('max', '17');
  await expect(page.getByTestId('ai-brew-target-ratio-hint')).toContainText(/1:13-1:17/);
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByRole('button', { name: /More Body|Body Lebih Tebal/i }).click();
  await page.getByTestId('ai-brew-generate').click();

  const proResult = page.getByTestId('ai-brew-result');
  await expect(proResult).toContainText(/More Body|Body Lebih Tebal/i);
  await expect(proResult.getByTestId('ai-brew-result-metric-strip')).toHaveCount(0);
  await expect(proResult.getByTestId('ai-brew-result-summary-metric-strip')).toBeVisible();
  await expect(proResult.getByTestId('ai-brew-pro-why-recipe')).toBeVisible();
  await proResult.getByTestId('ai-brew-result-tab-details').click();
  await expect(proResult.getByTestId('ai-brew-pro-target-compare')).toContainText(/More Acidity|Lebih Cerah/i);
  await expect(proResult.getByTestId('ai-brew-pro-precision-tolerance')).toContainText(/Precision Tolerance|1C|Suhu/i);
  await expect(proResult.getByTestId('ai-brew-pro-water-bean-intelligence')).toContainText(/TDS|GH|KH|Water|Air/i);
  await expect(proResult.getByTestId('ai-brew-taste-feedback')).toBeVisible();
  await expect(proResult.getByTestId('ai-brew-feedback-note')).toBeVisible();
  const proPlan = await readStoredAiBrewPlan(page);
  const proWater = proPlan.totalWaterMl;
  const proTemp = proPlan.waterTempC;
  const proTime = proPlan.totalTimeSeconds;
  expect(proWater).toBeGreaterThan(0);
  expect(proTemp).toBeGreaterThan(0);
  expect(proTime).toBeGreaterThan(0);

  expect(proWater).toBeLessThan(quickWater);
  expect(proTemp).toBeGreaterThanOrEqual(quickTemp);
  expect(proTime).toBeGreaterThan(quickTime);
});

test('ai brew quick and pro iced modes show final ratio and hot concentrate split', async ({ page }) => {
  const assertIcedResult = async (coffeeName: string, mode: 'quick' | 'pro') => {
    const result = page.getByTestId('ai-brew-result');
    await expect(result).toContainText(coffeeName);
    await expect(result).toContainText(/Ice|Es|Seduh Es/i);

    const plan = await readStoredAiBrewPlan(page);
    expect(plan.brewMode).toBe('iced');
    expect(plan.iceMl).toBeGreaterThan(0);
    expect(plan.hotWaterMl).toBeGreaterThan(0);
    expect(plan.hotWaterMl).toBeLessThan(plan.totalWaterMl);
    expect(plan.finalBeverageRatio).toBe(plan.recommendedRatio);
    expect(plan.hotExtractionRatio).toBeGreaterThanOrEqual(8.7);
    expect(plan.hotExtractionRatio).toBeLessThanOrEqual(10.9);
    expect(plan.steps.length).toBeGreaterThanOrEqual(4);
    expect(plan.steps.map((step) => step.kind)).not.toContain('serve');
    expect(plan.steps[2]?.label).toMatch(/Pulse|Pour/i);
    expect(plan.steps[plan.steps.length - 1]?.label).toMatch(/Final Pour|Finish/i);
    const firstHotTargetText = new RegExp(`${Math.round(plan.steps[0]?.targetVolumeMl || plan.hotWaterMl)}\\s*ml\\s*(hot water|air panas)`, 'i');
    const assertTechniqueChips = async (container: Locator) => {
      await expect(container).toContainText(/Flow/i);
      await expect(container).toContainText(/Path|Jalur/i);
      await expect(container).toContainText(/Height|Tinggi/i);
      await expect(container).toContainText(/Agitation|Agitasi/i);
    };

    if (mode === 'quick') {
      await result.getByTestId('ai-brew-result-tab-flow').click();
      await expect(result.getByTestId('ai-brew-iced-calibration')).toHaveCount(0);
      const quickSetup = result.getByTestId('ai-brew-quick-setup');
      await expect(quickSetup.getByTestId('ai-brew-quick-setup-water')).toContainText(`${plan.hotWaterMl} ml`);
      await expect(quickSetup.getByTestId('ai-brew-quick-setup-ice')).toContainText(new RegExp(`${plan.iceMl}\\s*(ml|g)`, 'i'));
      await expect(quickSetup.getByTestId('ai-brew-quick-setup-ratio')).toContainText(`1:${formatAiBrewDisplayRatio(plan.finalBeverageRatio)}`);
      await expect(quickSetup.getByTestId('ai-brew-quick-setup-time')).toContainText(formatAiBrewGuideValue(plan.totalTimeSeconds));
      await expect(result.getByTestId('ai-brew-quick-cues')).toContainText(`${plan.hotWaterMl} ml`);
      await expect(result.getByTestId('ai-brew-quick-cues')).toContainText(new RegExp(`${plan.iceMl}\\s*(ml|g)`, 'i'));
      await expect(result.getByTestId('ai-brew-sequence-section')).toContainText(/Final pour|Final Pour|Tuang Akhir|Drawdown/i);
      await expect(result.getByTestId('ai-brew-guide-density-basic')).toHaveAttribute('aria-pressed', 'true');
      await result.getByTestId('ai-brew-guide-density-pro').click();
      await assertTechniqueChips(result.getByTestId('ai-brew-step-card-2'));
      await expect(result.getByTestId('ai-brew-step-card-2')).toContainText(firstHotTargetText);
    } else {
      await result.getByTestId('ai-brew-result-tab-details').click();
      await expect(result.getByTestId('ai-brew-iced-calibration')).toContainText(/Final ratio|Rasio Final/i);
      await expect(result.getByTestId('ai-brew-iced-calibration')).toContainText(/Hot concentrate|Konsentrat Panas/i);
      await expect(result).toContainText(`1:${formatAiBrewDisplayRatio(plan.finalBeverageRatio)}`);
      await expect(result).toContainText(`1:${formatAiBrewDisplayRatio(plan.hotExtractionRatio)}`);
      await expect(result).toContainText(`${plan.hotWaterMl} ml`);
      await expect(result).toContainText(new RegExp(`${plan.iceMl}\\s*(ml|g)`, 'i'));
      await result.getByTestId('ai-brew-result-tab-flow').click();
      await result.getByTestId('ai-brew-guide-density-pro').click();
      await expect(result.getByTestId('ai-brew-guide-density-pro')).toHaveAttribute('aria-pressed', 'true');
      await result.getByTestId('ai-brew-flow-step-detail-2').locator('summary').click();
      await result.locator('details:has([data-testid="ai-brew-flow-current-step-technique-detail"]) summary').click();
      await assertTechniqueChips(result.getByTestId('ai-brew-flow-step-technique-detail-2'));
      await assertTechniqueChips(result.getByTestId('ai-brew-flow-current-step-technique-detail'));
      await expect(result.getByTestId('ai-brew-flow-step-2')).toContainText(firstHotTargetText);
    }

    return plan;
  };

  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Quick Ice Split');
  await page.getByTestId('ai-brew-dose').fill('20');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();
  const quickPlan = await assertIcedResult('QA Quick Ice Split', 'quick');

  await page.getByRole('button', { name: /Close planned output|Tutup output plan/i }).click();
  await openAiBrewProMode(page);
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Pro Ice Split');
  await page.getByTestId('ai-brew-dose').fill('20');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByRole('button', { name: /More Body|Body Lebih Tebal/i }).click();
  await page.getByTestId('ai-brew-generate').click();
  const proPlan = await assertIcedResult('QA Pro Ice Split', 'pro');

  expect(proPlan.targetProfileLabel).toMatch(/Body/i);
  expect(proPlan.fingerprint).not.toBe(quickPlan.fingerprint);
});

test('ai brew can hand off an iced plan into timer and ratio tools', async ({ page }) => {
  await expect(page.getByTestId('ai-brew-panel')).toBeVisible();

  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Iced Gesha');
  await page.getByTestId('ai-brew-dose').fill('20');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText(/Ice|Es|Seduh Es/i);
  const timerPlan = await readStoredAiBrewPlan(page);
  const brewTimeText = formatAiBrewTimerValue(timerPlan.totalTimeSeconds);

  await result.getByTestId('ai-brew-result-secondary-actions').locator('summary').click();
  await page.getByTestId('ai-brew-use-timer').click();
  await expect(page.getByRole('tab', { name: /^(Timer|Pengatur Waktu)$/i })).toHaveClass(/bg-white/);
  await expect(page.locator('#tools-panel-timer span.text-sm.text-secondary.mt-1')).toHaveText(brewTimeText!);

  await page.goto('/tools?tab=ai-brew');
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Iced Gesha');
  await page.getByTestId('ai-brew-dose').fill('20');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();
  const ratioPlan = await readStoredAiBrewPlan(page);
  await page.getByTestId('ai-brew-result').getByTestId('ai-brew-result-secondary-actions').locator('summary').click();
  await page.getByTestId('ai-brew-use-ratio').click();

  await expect(page.getByRole('tab', { name: /^(Ratio|Rasio)$/i })).toHaveClass(/bg-white/);
  await expect(page.getByRole('button', { name: /^V60 (Ice Brew|Seduh Es)$/i })).toHaveClass(/bg-blue-600/);
  await expect(page.getByTestId('dose-input')).toHaveValue('20');
  await expect(page.getByTestId('water-input')).toHaveValue(String(ratioPlan.totalWaterMl));
  await expect(page.getByTestId('ratio-input')).toHaveValue(formatAiBrewDisplayRatio(ratioPlan.finalBeverageRatio));
  await expect(page.getByTestId('ai-brew-iced-ratio-split')).toContainText(`${Math.round(ratioPlan.hotWaterMl)} ml air panas`);
  await expect(page.getByTestId('ai-brew-iced-ratio-split')).toContainText(`${Math.round(ratioPlan.iceMl)} ml es`);
  await expect(page.getByTestId('ai-brew-iced-ratio-split')).toContainText(`1:${formatAiBrewDisplayRatio(ratioPlan.hotExtractionRatio)}`);
});

test('guest users are gated before opening ai brew builders', async ({ page }) => {
  await qaLogout(page.request);
  await page.goto('/tools');
  await clearClientState(page);
  await page.goto('/tools', { waitUntil: 'domcontentloaded' });
  await continueAsGuestFromAuthGate(page);

  await page.getByTestId('ai-brew-open-quick').click();

  const dialog = page.getByTestId('ai-access-gate-modal');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Sign in to use AI Brew|Masuk untuk memakai Seduh AI/i);
  await expect(page.getByTestId('ai-brew-builder-quick')).toHaveCount(0);
});

test('authenticated users can request ai coaching manually from the result panel', async ({ page }) => {
  await qaLogin(page.request, buildQaUser({ planCode: 'starter' }));
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  await openAiBrewProMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Manual Coach');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toBeVisible();
  await page.getByTestId('ai-brew-result').getByTestId('ai-brew-result-tab-details').click();
  await expect(page.getByTestId('ai-brew-sequence-note')).toContainText(AI_BREW_SEQUENCE_HEADING);

  await page.getByTestId('ai-brew-result-tab-coach').click();
  await page.getByTestId('ai-brew-ai-assist-explain').click();
  await expect(page.getByText(/Mocked Response/i).first()).toBeVisible();
  await expect(page.getByText(/qa_e2e mocked response for UI flow validation/i).first()).toBeVisible();
});

test('ai brew coach guard blocks unsafe AI claims and keeps deterministic values', async ({ page }) => {
  await openAiBrewProMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'Bolinda Caranavi Coach Guard');
  await switchAiBrewToManualWater(page, { tds: '9', hardness: '6.6', alkalinity: '5.5' });
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toBeVisible({ timeout: 30_000 });
  const plan = await readStoredAiBrewPlan(page);

  await page.unroute('**/api/chat');
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: `### Kenapa cocok\nGeisha washed ini memakai ideal water. Profil exact. Total water 999 ml. Suhu 99C. Grind setting 9.`,
    });
  });

  await page.getByTestId('ai-brew-result-tab-coach').click();
  await expect(page.getByText(/Coach follows the deterministic planner|Coach mengikuti planner deterministic/i)).toBeVisible();
  await page.getByTestId('ai-brew-ai-assist-explain').click();
  const coachPanel = page.locator('.chat-markdown').last();
  await expect(coachPanel).toBeVisible({ timeout: 30_000 });
  await expect(coachPanel).not.toContainText(/Geisha|Gesha|ideal water|Profil exact|999 ml|setting 9/i);
  await expect(coachPanel).toContainText(new RegExp(String(plan.totalWaterMl)));
  await expect(coachPanel).toContainText(/Kalibrasi dengan drawdown dan rasa|calibrate by drawdown and taste|planner/i);
});

test('ai brew discloses exact-profile provenance when a niche dripper now has a curated match', async ({ page }) => {
  await openAiBrewProMode(page);
  await page.getByTestId('ai-brew-dripper-picker').click();
  const brewerDialog = page.getByRole('dialog', { name: /Brewer|Dripper|Alat seduh/i });
  const brewerSearch = brewerDialog.getByTestId('ai-brew-picker-search-dripper');
  await expect(brewerSearch).toBeVisible();
  await setVisibleInputValue(page, 'ai-brew-picker-search-dripper', 'Latina');
  await expect(brewerSearch).toHaveValue('Latina');
  await page.getByTestId('ai-brew-picker-option-dripper-latina-cono').click();
  await expect(page.getByTestId('ai-brew-picker-dripper')).toHaveCount(0);

  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Fallback Brew');
  await switchAiBrewToManualWater(page, { tds: '88', hardness: '52', alkalinity: '38' });
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await result.getByTestId('ai-brew-result-tab-details').click();
  await expect(result).toContainText(AI_BREW_EXACT_PROFILE);
  await expect(result).toContainText(/Exact device profile matched: Latina Cono Hot\.|Profil exact cocok: Latina Cono Hot\./i);
});

test('ai brew restores cached catalog and last plan when catalog assets are unavailable after warm load', async ({ page, context }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Offline Cache');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toContainText('QA Offline Cache');
  await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();

  await page.route('**/data/ai-brew/**', async (route) => {
    await route.abort();
  });

  await page.goto('/tools', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('QA Offline Cache').first()).toBeVisible();
  await expect(page.getByTestId('ai-brew-open-result')).toBeVisible();

  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Offline Reload');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toContainText('QA Offline Reload');
  await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();

  await context.setOffline(true);
  await page.getByTestId('ai-brew-open-quick').click();
  await expect(page.getByText(/AI coaching is unavailable offline\.|AI coach tidak tersedia saat offline\./i)).toBeVisible();
  await expect(page.getByTestId('ai-brew-builder-quick')).toHaveCount(0);
  await context.setOffline(false);
});



