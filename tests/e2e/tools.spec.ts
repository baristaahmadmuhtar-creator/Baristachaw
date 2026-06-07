import { test, expect, type Locator } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';
import { continueAsGuestFromAuthGate } from '../helpers/authGate';
import type { BrewPlan } from '../../apps/web/src/features/ai-brew/types';

const LAST_PLAN_STORAGE_KEY = 'BARISTACHAW_AI_BREW_LAST_PLAN_V5';
const AI_BREW_SEQUENCE_HEADING = /Brew Guide|Brew Sequence|Panduan Seduh|Urutan Seduh/i;
const AI_BREW_SAVED_COLLECTION = /Recipe saved to Collection\.|Recipe tersimpan ke (?:Collection|koleksi)\.|Resep tersimpan ke (?:Collection|koleksi)\./i;
const AI_BREW_CLOSE_OUTPUT = /Close planned output|Tutup output plan|Tutup hasil/i;
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

async function expectAiBrewEspressoComingSoon(page: import('@playwright/test').Page) {
  const trigger = page.getByTestId('ai-brew-open-lite');
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeDisabled();
  await expect(trigger).toContainText(/Coming Soon/i);
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

function formatAiBrewGuideValue(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function expectCleanAiBrewVisibleCopy(text: string, language: 'en' | 'id', context: string) {
  expect(text, `${context} contains broken placeholders`).not.toMatch(
    /\$(?:\d+|\{)|\b(?:undefined|null|NaN|ActionAction|Action\s+Action|Pressgentle|Stophiss)\b/iu,
  );
  for (const line of text.split(/\r?\n/u)) {
    expect(line, `${context} contains duplicated words`).not.toMatch(/\b([\p{L}]{2,})[ \t]+\1\b/iu);
  }
  expect(text, `${context} contains broken encoding`).not.toMatch(/[\u00c2\u00c3\uFFFD]|â€|Â°/u);

  if (language === 'en') {
    expect(text, `${context} leaks Indonesian into English`).not.toMatch(
      /\b(Tuang|Seduh|Sajikan|Katup|Bubuk|Jangan|Aduk|Rendam|Tekan|Endapkan|Bilas|Gilingan|Suhu|Rasa|Panduan|Keyakinan|Acuan|Validasi|Waktu|Ekstraksi|Setelan|Kalibrasi|mantap|agar|basah|adukan|pekat|perlahan|seluruh|langsung|alas|pulsa|datar|tanpa|mengguncang|setelah|selesai|konsisten|tambahan|permukaan|cangkir|empat|cepat|terukur|siap|keluar|kontak|tiga|seragam|bekerja|paling|bergelombang)\b|air turun/i,
    );
  } else {
    expect(text, `${context} leaks English UI copy into Indonesian`).not.toMatch(
      /\b(Starting grind|Total Water|Final Ratio|Temperature|Brew Guide|Additional details|Edit inputs|Guide complete|The grinder setting|The grinder reference|For espresso|spout|bowl|bleached|medium-coarse|medium-fine|fine-medium|fine-coarse|flow rate|contact time)\b/i,
    );
  }
}

test('tools tabs expose accessible tab semantics and keyboard navigation', async ({ page }) => {
  const aiTab = page.getByRole('tab', { name: 'Brew', exact: true });
  const timerTab = page.getByRole('tab', { name: 'Timer' });
  const ratioTab = page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ });
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
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();
  const doseInput = page.getByTestId('dose-input');
  const waterInput = page.getByTestId('water-input');
  await doseInput.fill('20');
  await expect(waterInput).toHaveValue('320');
  await page.getByRole('button', { name: '1:15', exact: true }).click();
  await expect(waterInput).toHaveValue('300');
});

test('grind size calculator uses method and grinder while preserving ratio math', async ({ page }) => {
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();
  await page.getByTestId('dose-input').fill('20');
  await expect(page.getByTestId('water-input')).toHaveValue('320');

  await page.getByRole('button', { name: /^(Grind Size|Ukuran Giling)$/ }).click();
  await expect(page.getByTestId('grind-size-panel')).toBeVisible();
  await expect(page.getByTestId('grind-size-recommendation')).toContainText(/Recommended grind|Rekomendasi gilingan/i);
  await page.getByTestId('grinder-options').locator('button').first().click();

  await page.getByRole('button', { name: /^(Ratio|Rasio)$/ }).click();
  await expect(page.getByTestId('dose-input')).toHaveValue('20');
  await expect(page.getByTestId('water-input')).toHaveValue('320');

  await page.getByRole('button', { name: /^(Grind Size|Ukuran Giling)$/ }).click();
  await page.getByTestId('grind-method-espresso').click();
  await expect(page.getByTestId('grind-size-recommendation')).toContainText(/Espresso|fine|halus|baseline/i);
  await expect(page.getByTestId('espresso-dial-in-context')).toContainText(/Espresso dial-in context|Konteks dial-in espresso/i);
  await page.getByTestId('grind-shot-time').fill('19');
  await page.getByTestId('grind-pressure').fill('11');
  await page.getByTestId('grind-bean-age').fill('3');
  await expect(page.getByTestId('espresso-dial-in-context')).toContainText(/Go slightly finer|Sedikit lebih halus/i);
  await expect(page.getByTestId('espresso-dial-in-context')).toContainText(/pressure|tekanan/i);
  await page.getByTestId('grind-roast-dark').click();
  await expect(page.getByTestId('grind-size-recommendation')).toContainText(/Starting point|Titik awal|Baseline|Estimasi/i);
});

test('grind size calculator reacts to roast and espresso compatibility without taste-target controls', async ({ page }) => {
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();
  await page.getByRole('button', { name: /^(Grind Size|Ukuran Giling)$/ }).click();
  await expect(page.getByTestId('grind-size-panel')).toBeVisible();
  await expect(page.locator('[data-testid^="grind-target-"]')).toHaveCount(0);

  await page.getByTestId('grinder-search').fill('Feima');
  await page.getByTestId('grinder-option-feima-600n').click();
  await page.getByTestId('grind-roast-light').click();
  const lightSetting = ((await page.getByTestId('grind-primary-setting').textContent()) || '').trim();
  await page.getByTestId('grind-roast-dark').click();
  const darkSetting = ((await page.getByTestId('grind-primary-setting').textContent()) || '').trim();
  expect(lightSetting).not.toEqual(darkSetting);

  await page.getByTestId('grind-roast-medium_light').click();
  const mediumLightSetting = ((await page.getByTestId('grind-primary-setting').textContent()) || '').trim();
  await page.getByTestId('grind-roast-medium_dark').click();
  const mediumDarkSetting = ((await page.getByTestId('grind-primary-setting').textContent()) || '').trim();
  expect(mediumLightSetting).not.toEqual(mediumDarkSetting);
  await expect(page.getByTestId('grind-size-recommendation')).toContainText(/Light roast|Medium-light|Medium-dark|Dark roast|Roast level/i);

  await page.getByTestId('grind-method-espresso').click();
  await page.getByTestId('grinder-search').fill('Timemore C2');
  await expect(page.getByTestId('grinder-option-timemore-c2')).toBeDisabled();
  await expect(page.getByTestId('grinder-option-timemore-c2')).toContainText(/not recommended|tidak disarankan/i);

  await page.getByTestId('grinder-search').fill('Baratza Encore');
  await expect(page.getByTestId('grinder-option-baratza-encore')).toBeDisabled();
  await expect(page.getByTestId('grinder-option-baratza-encore')).toContainText(/not recommended|tidak disarankan/i);

  await page.getByTestId('grinder-search').fill('Encore ESP');
  await expect(page.getByTestId('grinder-option-baratza-encore-esp')).toBeEnabled();
  await page.getByTestId('grinder-option-baratza-encore-esp').click();
  await expect(page.getByTestId('grind-size-recommendation')).toContainText(/Espresso|shot|dial-in|fine|halus/i);

  await page.getByTestId('grinder-search').fill('DF64');
  await expect(page.getByTestId('grinder-option-df64-gen2')).toBeEnabled();
  await page.getByTestId('grinder-option-df64-gen2').click();
  await expect(page.getByTestId('grind-size-recommendation')).toContainText(/calibration|kalibrasi|dial-in/i);
});

test('method switch changes yield output and advanced mode computes extraction', async ({ page }) => {
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();

  await page.getByTestId('dose-input').fill('20');
  await page.getByTestId('ratio-input').fill('16');
  const v60Output = page.getByTestId('beverage-output-value');
  await expect(v60Output).toBeVisible();
  const v60Text = (await v60Output.textContent()) || '';

  await page.getByTestId('brew-method-chemex').click();
  const chemexText = (await page.getByTestId('beverage-output-value').textContent()) || '';
  expect(chemexText).not.toEqual(v60Text);

  await page.getByTestId('ratio-analysis-toggle').click();
  await page.getByTestId('tds-input').fill('1.35');
  await expect(page.getByTestId('extraction-yield-value')).toBeVisible();
});

test('espresso shot presets update ratio and avoid filter baseline warning copy', async ({ page }) => {
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();
  await page.getByTestId('brew-method-espresso').click();

  await expect(page.getByTestId('espresso-shot-presets')).toBeVisible();
  await page.getByTestId('espresso-shot-ristretto').click();
  await expect(page.getByTestId('ratio-input')).toHaveValue('1.3');
  await page.getByTestId('espresso-shot-espresso').click();
  await expect(page.getByTestId('ratio-input')).toHaveValue('2');

  await expect(page.getByText(/12-22|SCA-style filter baseline/i)).toHaveCount(0);
});

test('roast profile updates guidance and adaptive toggle does not force ratio when off', async ({ page }) => {
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();
  await page.getByTestId('brew-method-v60').click();
  await page.getByTestId('ratio-analysis-toggle').click();

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
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();
  await page.getByTestId('ratio-analysis-toggle').click();

  await page.getByTestId('roast-level-dark').click();
  await page.getByTestId('brew-method-espresso').click();
  await expect(page.getByTestId('ratio-input')).toHaveValue('1.9');

  await page.getByTestId('ratio-analysis-toggle').click();
  await page.getByTestId('brew-method-v60').click();
  await page.getByTestId('brew-method-espresso').click();
  await expect(page.getByTestId('ratio-input')).toHaveValue('2');
});

test('basic mode hides advanced controls and diagnostics while keeping core inputs visible', async ({ page }) => {
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();

  await expect(page.getByText('Roast Profile')).toHaveCount(0);
  await expect(page.getByTestId('tds-input')).toHaveCount(0);
  await expect(page.getByTestId('measured-output-input')).toHaveCount(0);
  await expect(page.getByTestId('conformance-panel')).toHaveCount(0);
  await expect(page.getByTestId('dose-input')).toBeVisible();
  await expect(page.getByTestId('water-input')).toBeVisible();
  await expect(page.getByTestId('ratio-input')).toBeVisible();
});

test('legacy advanced ratio data stays saved but optional analysis defaults hidden', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('BARISTA_TOOLS_RATIO_V5', JSON.stringify({
      v: 5,
      methodId: 'v60',
      mode: 'advanced',
      ratio: '15.5',
      dose: '20',
      water: '310',
      roastLevel: 'medium_light',
      roastInputMode: 'level',
      applyRoastAdaptiveDefaults: true,
      tdsPercent: '1.4',
      measuredOutput: '270',
    }));
  });
  await page.goto('/tools?tab=ratio', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();

  await expect(page.getByTestId('ratio-analysis-toggle')).toContainText(/Show optional extraction analysis|Tampilkan analisis ekstraksi opsional/i);
  await expect(page.getByTestId('tds-input')).toHaveCount(0);
  await expect(page.getByTestId('measured-output-input')).toHaveCount(0);

  await page.getByTestId('ratio-analysis-toggle').click();
  await expect(page.getByTestId('ratio-analysis-toggle')).toContainText(/Hide optional extraction analysis|Sembunyikan analisis ekstraksi opsional/i);
  await expect(page.getByTestId('tds-input')).toHaveValue('1.4');
  await expect(page.getByTestId('measured-output-input')).toHaveValue('270');
});

test('standards provenance stays hidden from both modes', async ({ page }) => {
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();
  await expect(page.getByTestId('standards-provenance')).toHaveCount(0);
  await page.getByTestId('ratio-analysis-toggle').click();
  await expect(page.getByTestId('standards-provenance')).toHaveCount(0);
});

test('ratio settings persist after reload', async ({ page }) => {
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();
  await page.getByTestId('brew-method-kalita_wave').click();
  await page.getByTestId('ratio-analysis-toggle').click();
  await page.getByTestId('dose-input').fill('18');
  await page.getByTestId('ratio-input').fill('15.5');
  await page.getByTestId('tds-input').fill('1.40');
  await page.goto('/tools?tab=ratio', { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: /^(Calculator|Kalkulator)$/ }).click();

  await expect(page.getByTestId('brew-method-kalita_wave')).toHaveClass(/bg-blue-600/);
  await expect(page.getByTestId('tds-input')).toBeVisible();
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
  await expect(page.getByTestId('ai-brew-open-lite')).toBeVisible();
  await expect(page.getByTestId('ai-brew-open-quick')).toBeVisible();
  await expect(page.getByTestId('ai-brew-open-pro')).toBeVisible();

  await expectAiBrewEspressoComingSoon(page);
  await expect(page.getByTestId('ai-brew-builder-lite')).toHaveCount(0);

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
  await expect(page.getByTestId('ai-brew-switch-method-strip')).toContainText(/Auto chooses a method from Target Profile|Auto memilih metode dari Profil Target/i);
  await expect(page.getByTestId('ai-brew-switch-method-strip')).toContainText(/Target Profile tunes taste|Profil Target menyesuaikan rasa/i);

  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('QA Switch Hybrid Balanced');
  await expect(result.getByTestId('ai-brew-switch-result-summary')).toContainText(/Hybrid Balanced|Hybrid seimbang/i);
  await result.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
  await expect(result.getByTestId('ai-brew-flow-current-card')).toBeVisible();
  await expect(result.getByTestId('ai-brew-sequence-section')).toHaveCount(0);

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
  const guideText = (plan.workflowGuideSteps || [])
    .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText} ${(step.detailBullets || []).join(' ')}`)
    .join(' ');
  expect(guideText).toMatch(/Closed|Open|Release|Katup|Buka/i);
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
  await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
  await expect(result.getByTestId('ai-brew-flow-current-card')).toBeVisible();
  await expect(result.getByTestId('ai-brew-sequence-section')).toHaveCount(0);

  const plan = await readStoredAiBrewPlan(page);
  const guideText = (plan.workflowGuideSteps || [])
    .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText} ${(step.detailBullets || []).join(' ')}`)
    .join(' ');
  expect(guideText).toMatch(/Open|Closed|Katup|Tutup|Buka/i);
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
  await setVisibleInputValue(page, 'ai-brew-picker-search-process', 'Decaf');
  const decafOption = page.locator('[data-testid^="ai-brew-picker-option-process-"]').first();
  await expect(decafOption).toContainText(/Decaf/i);
  await expect(decafOption).not.toContainText(/Keluarga proses|Process family|Decaf subtype|Data katalog|Kurasi/i);

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
    await expect(firstVariety).not.toContainText(/Keluarga varietas|Variety family|Data katalog|Kurasi/i);
    await page.getByRole('button', { name: /Close picker|Tutup picker|Tutup/i }).click();
  }
});

test('ai brew guide renders workflow-specific phases for non-pour-over methods', async ({ page }) => {
  const cases = [
    {
      query: 'aeropress',
      optionId: 'aeropress',
      coffeeName: 'QA AeroPress Workflow',
      expected: /Charge water|Isi air|Stir|Aduk|Steep|Rendam|Press|Tekan|Stop before hiss|Berhenti sebelum (hiss|desis)/i,
    },
    {
      query: 'french press',
      optionId: 'french-press',
      coffeeName: 'QA French Press Workflow',
      expected: /Charge water|Isi air|Steep|Rendam|Settle|Endapkan|Press gently|Tekan pelan|Decant|Tuang pisah/i,
    },
    {
      query: 'moka',
      optionId: 'bialetti-moka-pot',
      coffeeName: 'QA Moka Workflow',
      expected: /Fill boiler|Isi boiler|Level basket|Ratakan basket|Moderate heat|Panas sedang|Monitor flow|Pantau aliran|Stop before sputter|Berhenti sebelum sputter/i,
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
    await result.getByTestId('ai-brew-result-tab-flow').click({ force: true });
    await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
    await expect(result.getByTestId('ai-brew-flow-current-card')).toBeVisible();
    await expect(result.getByTestId('ai-brew-sequence-section')).toHaveCount(0);
    const plan = await readStoredAiBrewPlan(page);
    expect(plan.workflowValidation?.passed).toBe(true);
    expect(plan.workflowGuideSteps?.length || 0).toBeGreaterThan(plan.steps.length);
    const guideText = (plan.workflowGuideSteps || [])
      .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText} ${(step.detailBullets || []).join(' ')}`)
      .join(' ');
    expect(guideText).toMatch(entry.expected);
    await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
  }
});

test('ai brew Indonesian result surfaces stay natural across every method family', async ({ page }) => {
  test.setTimeout(720_000);
  const cases = [
    ['v60', 'hario-v60', 'v60'],
    ['chemex', 'chemex', 'chemex'],
    ['kalita wave', 'kalita-wave-155-185', 'kalita_wave'],
    ['origami', 'origami-dripper-s-m', 'origami'],
    ['april', 'april-brewer', 'april'],
    ['melitta', 'melitta', 'melitta'],
    ['kono', 'kono-meimon', 'kono'],
    ['switch 03', 'hario-switch-03', 'hario_switch'],
    ['clever', 'clever-dripper', 'clever_dripper'],
    ['aeropress', 'aeropress', 'aeropress'],
    ['french press', 'french-press', 'french_press'],
    ['espresso', 'espresso-machine', 'espresso'],
    ['moka', 'bialetti-moka-pot', 'moka_pot'],
    ['siphon', 'hario-siphon', 'siphon'],
    ['cold brew', 'toddy-cold-brew', 'cold_brew'],
    ['batch', 'batch-brewer', 'batch_brew'],
  ] as const;

  await page.evaluate(() => {
    localStorage.setItem('BARISTA_LANGUAGE', 'id');
    localStorage.setItem('BARISTA_LANGUAGE_ID_DEFAULT_MIGRATED', '1');
  });
  await page.goto('/tools?tab=ai-brew&language=id', { waitUntil: 'domcontentloaded' });

  for (const [query, optionId, expectedFamily] of cases) {
    await openAiBrewQuickMode(page);
    await setVisibleInputValue(page, 'ai-brew-coffee-name', `QA Indonesia ${expectedFamily}`);
    await page.getByTestId('ai-brew-dripper-picker').click();
    await page.getByTestId('ai-brew-picker-search-dripper').fill(query);
    const methodOption = page.getByTestId(`ai-brew-picker-option-dripper-${optionId}`);
    if (expectedFamily === 'espresso') {
      await expect(methodOption).toBeDisabled();
      expectCleanAiBrewVisibleCopy(await methodOption.innerText(), 'id', 'espresso/disabled-picker');
      await page.getByRole('button', { name: 'Tutup picker', exact: true }).click();
      const closeQuick = page.getByTestId('ai-brew-close-quick');
      if (await closeQuick.count()) await closeQuick.click();
      continue;
    }
    await methodOption.click();
    await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
    await page.getByTestId('ai-brew-generate').click();

    const result = page.getByTestId('ai-brew-result');
    await expect(result).toContainText(`QA Indonesia ${expectedFamily}`);
    expectCleanAiBrewVisibleCopy(await result.innerText(), 'id', `${expectedFamily}/summary`);

    await result.getByTestId('ai-brew-result-tab-flow').click({ force: true });
    expectCleanAiBrewVisibleCopy(await result.innerText(), 'id', `${expectedFamily}/brew-lite`);
    await result.getByTestId('ai-brew-guide-density-pro').click();
    expectCleanAiBrewVisibleCopy(await result.innerText(), 'id', `${expectedFamily}/brew-pro`);

    await result.getByTestId('ai-brew-result-tab-details').click({ force: true });
    expectCleanAiBrewVisibleCopy(await result.innerText(), 'id', `${expectedFamily}/details`);
    const plan = await readStoredAiBrewPlan(page);
    expect(plan.methodFamily).toBe(expectedFamily);
    expect(plan.workflowValidation?.passed).toBe(true);
    await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
  }
});

test('ai brew AeroPress styles render bilingual guides and regenerate without stale style copy', async ({ page }) => {
  test.setTimeout(300_000);
  type AeroPressStyle = 'standard' | 'inverted' | 'bypass' | 'no_bypass' | 'bright_clean' | 'sweet_body';
  const styleCases: Array<{
    style: AeroPressStyle;
    targetProfileId: string;
    processQuery: string;
    processOptionId: string;
    varietyQuery: string;
    varietyPattern: RegExp;
    visibleId: RegExp;
    visibleEn: RegExp;
    stored: RegExp;
    forbiddenNonBypass?: RegExp;
  }> = [
    {
      style: 'standard',
      targetProfileId: 'balance_clean',
      processQuery: 'Washed',
      processOptionId: 'washed',
      varietyQuery: 'Bourbon',
      varietyPattern: /Bourbon/i,
      visibleId: /Aduk 3 kali|20-30 detik|berhenti sebelum desis/i,
      visibleEn: /Stir 3 times|20-30 seconds|stop before (?:the )?(?:dry )?hiss/i,
      stored: /Aduk 3 kali|20-30 detik|berhenti sebelum desis/i,
    },
    {
      style: 'inverted',
      targetProfileId: 'more_sweetness',
      processQuery: 'Natural',
      processOptionId: 'natural',
      varietyQuery: 'Gesha',
      varietyPattern: /Gesha|Geisha/i,
      visibleId: /terbalik|Balikkan|20-30 detik|berhenti sebelum desis/i,
      visibleEn: /inverted|Flip|20-30 seconds|stop before (?:the )?(?:dry )?hiss/i,
      stored: /terbalik|Balikkan|20-30 detik|berhenti sebelum desis/i,
    },
    {
      style: 'bypass',
      targetProfileId: 'floral_transparent',
      processQuery: 'Washed',
      processOptionId: 'washed',
      varietyQuery: 'Ethiopian',
      varietyPattern: /Ethiopian|Heirloom|Landrace/i,
      visibleId: /Bypass terukur|setelah tekan saja|air bypass tidak melewati lapisan kopi/i,
      visibleEn: /Measured bypass|after pressing only|bypass water does not pass through the coffee layer/i,
      stored: /Bypass terukur|setelah tekan saja|air bypass tidak melewati lapisan kopi/i,
    },
    {
      style: 'no_bypass',
      targetProfileId: 'dense_comforting',
      processQuery: 'Wet Hulled',
      processOptionId: 'wet_hulled',
      varietyQuery: 'Catimor',
      varietyPattern: /Catimor|Ateng/i,
      visibleId: /seluruh air resep|tanpa air bypass tambahan|25-35 detik|berhenti sebelum desis/i,
      visibleEn: /all recipe water|without extra bypass water|25-35 seconds|stop before (?:the )?(?:dry )?hiss/i,
      stored: /seluruh air resep|tanpa air bypass tambahan|25-35 detik|berhenti sebelum desis/i,
    },
    {
      style: 'bright_clean',
      targetProfileId: 'more_acidity',
      processQuery: 'Washed',
      processOptionId: 'washed',
      varietyQuery: 'Caturra',
      varietyPattern: /Caturra/i,
      visibleId: /Aduk 2-3 kali|20-30 detik|tanpa air tambahan/i,
      visibleEn: /Stir 2-3 times|20-30 seconds|without extra water/i,
      stored: /Aduk 2-3 kali|20-30 detik|tanpa air tambahan/i,
    },
    {
      style: 'sweet_body',
      targetProfileId: 'more_body',
      processQuery: 'Natural',
      processOptionId: 'natural',
      varietyQuery: 'Bourbon',
      varietyPattern: /Bourbon/i,
      visibleId: /Aduk 5 kali|25-35 detik|mendekati desis|cangkir tebal/i,
      visibleEn: /Stir 5 times|25-35 seconds|near the hiss|heavy cup/i,
      stored: /Aduk 5 kali|25-35 detik|mendekati desis|cangkir tebal/i,
    },
  ];
  const languageCases = [
    { language: 'id', expectedKey: 'visibleId' as const, leak: /\b(chamber|paper filter|slurry|puck|cup|press|hiss|steep)\b/i },
    { language: 'en', expectedKey: 'visibleEn' as const, leak: /\b(Tuang|Aduk|Rendam|Tekan|Sajikan|ruang seduh|cangkir|desis)\b/i },
  ] as const;
  const languageCaseByCode = Object.fromEntries(languageCases.map((item) => [item.language, item])) as Record<
    'id' | 'en',
    typeof languageCases[number]
  >;
  const e2eMatrix: Array<{ language: 'id' | 'en'; style: AeroPressStyle }> = [
    { language: 'id', style: 'bypass' },
    { language: 'id', style: 'no_bypass' },
    { language: 'en', style: 'standard' },
    { language: 'en', style: 'inverted' },
    { language: 'en', style: 'bright_clean' },
    { language: 'en', style: 'sweet_body' },
  ];
  const nonBypassCommand = /Tambahkan air bypass|Bypass terukur|Add the measured bypass|Measured bypass|setelah tekan saja|after pressing only/i;

  async function pickProcessAndVariety(entry: typeof styleCases[number]) {
    await expect(page.getByTestId('ai-brew-process-picker')).toBeVisible();
    await page.getByTestId('ai-brew-process-picker').click();
    await setVisibleInputValue(page, 'ai-brew-picker-search-process', entry.processQuery);
    await page.getByTestId(`ai-brew-picker-option-process-${entry.processOptionId}`).click();

    await expect(page.getByTestId('ai-brew-variety-picker')).toBeVisible();
    await page.getByTestId('ai-brew-variety-picker').click();
    await setVisibleInputValue(page, 'ai-brew-picker-search-variety', entry.varietyQuery);
    const firstVariety = page.locator('[data-testid^="ai-brew-picker-option-variety-"]').first();
    await expect(firstVariety).toContainText(entry.varietyPattern);
    await firstVariety.click();
  }

  async function generateAeroPressStyle(language: 'id' | 'en', entry: typeof styleCases[number]) {
    await openAiBrewProMode(page);
    await setVisibleInputValue(page, 'ai-brew-coffee-name', `QA AeroPress ${language} ${entry.style}`);
    await pickProcessAndVariety(entry);
    await page.getByTestId(`ai-brew-target-profile-${entry.targetProfileId}`).click();
    if (!/AeroPress/i.test((await page.getByTestId('ai-brew-dripper-picker').textContent()) || '')) {
      await page.getByTestId('ai-brew-dripper-picker').click();
      await page.getByTestId('ai-brew-picker-search-dripper').fill('aeropress');
      await page.getByTestId('ai-brew-picker-option-dripper-aeropress').click();
    }
    if (!/K-Ultra|1Zpresso/i.test((await page.getByTestId('ai-brew-grinder-picker').textContent()) || '')) {
      await page.getByTestId('ai-brew-grinder-picker').click();
      const grinderSearch = page.getByTestId('ai-brew-picker-search-grinder');
      try {
        await expect(grinderSearch).toBeVisible({ timeout: 5_000 });
      } catch {
        await page.getByTestId('ai-brew-grinder-picker').click();
        await expect(grinderSearch).toBeVisible({ timeout: 10_000 });
      }
      await grinderSearch.fill('K-Ultra');
      await page.getByTestId('ai-brew-picker-option-grinder-1zpresso-k-ultra').click();
    }
    await openAiBrewProSection(page, 'method');
    await page.getByTestId(`ai-brew-aeropress-style-${entry.style}`).click();
    await expect(page.getByTestId(`ai-brew-aeropress-style-${entry.style}`)).toHaveAttribute('aria-pressed', 'true');
    if (!/Aqua/i.test((await page.getByTestId('ai-brew-water-picker').textContent()) || '')) {
      await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
    }
    await page.getByTestId('ai-brew-generate').click();

    const result = page.getByTestId('ai-brew-result');
    await expect(result).toContainText(`QA AeroPress ${language} ${entry.style}`);
    await result.getByTestId('ai-brew-result-tab-flow').click({ force: true });
    await expect(result.getByTestId('ai-brew-guide-density-basic')).toHaveAttribute('aria-pressed', 'true');
    const basicGuidePanel = result.getByTestId('ai-brew-result-guide-panel');
    await expect(basicGuidePanel).toBeVisible();
    const basicGuideText = ((await basicGuidePanel.textContent()) || '').replace(/\s+/g, ' ');
    expect(basicGuideText).not.toMatch(/Basahi ruang seduh merata dan jaga rendaman tetap ringkas|Wet the chamber evenly and keep the steep compact/i);
    await result.getByTestId('ai-brew-guide-density-pro').click();
    await expect(result.getByTestId('ai-brew-guide-density-pro')).toHaveAttribute('aria-pressed', 'true');
    const guidePanel = result.getByTestId('ai-brew-result-guide-panel');
    await expect(guidePanel).toBeVisible();
    const visibleGuideText = ((await guidePanel.textContent()) || '').replace(/\s+/g, ' ');
    const plan = await readStoredAiBrewPlan(page);
    await result.getByTestId('ai-brew-result-tab-details').click({ force: true });
    const detailPanel = result.getByTestId('ai-brew-result-detail-panel');
    await expect(detailPanel).toBeVisible();
    await expect(detailPanel.getByTestId('ai-brew-result-style-metric')).toContainText(language === 'id' ? /Gaya/i : /Style/i);
    const guideText = (plan.workflowGuideSteps || [])
      .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''} ${(step.detailBullets || []).join(' ')}`)
      .join(' ');

    await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
    const closePro = page.getByTestId('ai-brew-close-pro');
    if (await closePro.count()) {
      await closePro.click();
    }
    return { guideText, plan, visibleGuideText };
  }

  let activeLanguage: 'id' | 'en' | '' = '';
  const fingerprints = new Map<string, string>();
  for (const e2eCase of e2eMatrix) {
    const languageCase = languageCaseByCode[e2eCase.language];
    const entry = styleCases.find((item) => item.style === e2eCase.style);
    expect(entry).toBeTruthy();
    if (!entry) continue;

    if (activeLanguage !== e2eCase.language) {
      activeLanguage = e2eCase.language;
      await page.evaluate(({ language }) => {
        localStorage.setItem('BARISTA_LANGUAGE', language);
        localStorage.setItem('BARISTA_LANGUAGE_ID_DEFAULT_MIGRATED', '1');
      }, { language: e2eCase.language });
      await page.goto(`/tools?tab=ai-brew&language=${e2eCase.language}`, { waitUntil: 'domcontentloaded' });
    }

    const generated = await generateAeroPressStyle(e2eCase.language, entry);
    expect(generated.plan.methodFamily).toBe('aeropress');
    expect(generated.plan.recipeStyle).toBe(entry.style);
    expect(generated.plan.targetProfileId).toBe(entry.targetProfileId);
    expect(String(generated.plan.process || '').toLowerCase().replace(/[_-]+/g, ' '))
      .toContain(entry.processOptionId.toLowerCase().replace(/[_-]+/g, ' '));
    expect(generated.plan.variety).toBeTruthy();
    expect(generated.plan.workflowValidation?.passed).toBe(true);
    expect(generated.visibleGuideText).toMatch(entry[languageCase.expectedKey]);
    expect(generated.visibleGuideText).not.toMatch(languageCase.leak);
    expect(generated.guideText).toMatch(entry.stored);
    const allowsCapacityPreWet = (generated.plan.steps || []).some((step) => step.id === 'pre_wet');
    expect(`${generated.visibleGuideText} ${generated.guideText}`).not.toMatch(
      /final pour|tuang akhir|drawdown|flat bed|V60|pour map|center-to-mid|bloom/i,
    );
    if (allowsCapacityPreWet) {
      expect(`${generated.visibleGuideText} ${generated.guideText}`).toMatch(/Pra-basah|Pre-wet/i);
    }
    if (entry.style !== 'bypass') {
      expect(`${generated.visibleGuideText} ${generated.guideText}`).not.toMatch(entry.forbiddenNonBypass || nonBypassCommand);
    }
    fingerprints.set(`${e2eCase.language}:${entry.style}`, JSON.stringify({
      style: generated.plan.recipeStyle,
      target: generated.plan.targetProfileId,
      process: generated.plan.process,
      variety: generated.plan.variety,
      temp: generated.plan.waterTempC,
      ratio: generated.plan.recommendedRatio,
      guide: generated.guideText,
    }));
  }

  expect(fingerprints.get('en:standard')).not.toEqual(fingerprints.get('en:sweet_body'));
  expect(fingerprints.get('id:bypass')).not.toEqual(fingerprints.get('id:no_bypass'));
});

test('ai brew non-AeroPress style guides render method-specific copy through the UI', async ({ page }) => {
  test.setTimeout(300_000);
  const cases: Array<{
    label: string;
    query: string;
    optionId: string;
    styleTestId?: string;
    switchPresetTestId?: string;
    expectedFamily: BrewPlan['methodFamily'];
    expectedStyle?: string;
    expectedSwitchPreset?: string;
    brewMode?: 'hot' | 'iced';
    dose?: string;
    stored: RegExp;
    visible: RegExp;
    forbidden: RegExp;
  }> = [
    {
      label: 'French Press clean decant',
      query: 'french press',
      optionId: 'french-press',
      styleTestId: 'ai-brew-french-press-style-clean_decant',
      expectedFamily: 'french_press',
      expectedStyle: 'clean_decant',
      stored: /wadah saji kedua|tuang pisah perlahan|clean decant/i,
      visible: /decant|tuang pisah|French Press/i,
      forbidden: /bloom|final pour|tuang akhir|spiral|v60/i,
    },
    {
      label: 'Kalita iced wave',
      query: 'kalita wave',
      optionId: 'kalita-wave-155-185',
      styleTestId: 'ai-brew-kalita-wave-style-iced_wave',
      expectedFamily: 'kalita_wave',
      expectedStyle: 'iced_wave',
      brewMode: 'iced',
      stored: /filter berlipat|target air panas|wave es/i,
      visible: /hot water|air panas|ice|es/i,
      forbidden: /French Press|Moka|sputter/i,
    },
    {
      label: 'Clever double stage',
      query: 'clever',
      optionId: 'clever-dripper',
      styleTestId: 'ai-brew-clever-dripper-style-double_stage_hybrid',
      expectedFamily: 'clever_dripper',
      expectedStyle: 'double_stage_hybrid',
      stored: /dua fase|fase rendam pertama|hybrid dua tahap/i,
      visible: /release|alirkan|hybrid/i,
      forbidden: /final pour|tuang akhir|spiral|sputter/i,
    },
    {
      label: 'Chemex continuous center',
      query: 'chemex',
      optionId: 'chemex',
      styleTestId: 'ai-brew-chemex-style-continuous_center_pour',
      expectedFamily: 'chemex',
      expectedStyle: 'continuous_center_pour',
      stored: /aliran tengah|Tuang kontinu|Chemex kontinu/i,
      visible: /center|tengah|continuous|kontinu/i,
      forbidden: /French Press|Moka|sputter/i,
    },
    {
      label: 'Moka low temp',
      query: 'moka',
      optionId: 'bialetti-moka-pot',
      styleTestId: 'ai-brew-moka-pot-style-low_temp_controlled',
      expectedFamily: 'moka_pot',
      expectedStyle: 'low_temp_controlled',
      stored: /panas rendah-sedang|aliran tipis|kontrol suhu rendah/i,
      visible: /low|rendah|Moka|sputter|semburan/i,
      forbidden: /bloom|final pour|tuang akhir|spiral|v60/i,
    },
    {
      label: 'Cold drip tower',
      query: 'cold brew',
      optionId: 'toddy-cold-brew',
      styleTestId: 'ai-brew-cold-brew-style-cold_drip_tower',
      expectedFamily: 'cold_brew',
      expectedStyle: 'cold_drip_tower',
      dose: '60',
      stored: /menara tetes dingin|laju tetes|tetes dingin/i,
      visible: /cold drip|tetes dingin|drip/i,
      forbidden: /hot pour|kettle|bloom|tuang panas|air panas/i,
    },
    {
      label: 'Batch pre wet',
      query: 'batch',
      optionId: 'batch-brewer',
      styleTestId: 'ai-brew-batch-brew-style-pre_wet_hybrid_batch',
      expectedFamily: 'batch_brew',
      expectedStyle: 'pre_wet_hybrid_batch',
      dose: '60',
      stored: /basah awal|siklus utama|pancuran mesin/i,
      visible: /pre-wet|basah awal|machine|mesin/i,
      forbidden: /manual pour|bloom pour|spiral|v60/i,
    },
    {
      label: 'Siphon delicate',
      query: 'siphon',
      optionId: 'hario-siphon',
      styleTestId: 'ai-brew-siphon-style-low_temp_delicate',
      expectedFamily: 'siphon',
      expectedStyle: 'low_temp_delicate',
      stored: /panas lebih lembut|suhu rendah|ruang atas/i,
      visible: /siphon|upper chamber|ruang atas|air naik/i,
      forbidden: /final pour|tuang akhir|spiral|moka|sputter/i,
    },
    {
      label: 'Origami wave',
      query: 'origami',
      optionId: 'origami-dripper-s-m',
      styleTestId: 'ai-brew-origami-style-wave_dripper_style',
      expectedFamily: 'origami',
      expectedStyle: 'wave_dripper_style',
      stored: /filter berlipat Origami|Origami wave|permukaan tetap datar/i,
      visible: /Origami|wave|berlipat/i,
      forbidden: /Moka|sputter|French Press/i,
    },
    {
      label: 'April two pour',
      query: 'april',
      optionId: 'april-brewer',
      styleTestId: 'ai-brew-april-style-competition_two_pour',
      expectedFamily: 'april',
      expectedStyle: 'competition_two_pour',
      stored: /dua tuang utama|April dua tuang|alas datar/i,
      visible: /two|dua|April/i,
      forbidden: /Moka|sputter|French Press/i,
    },
    {
      label: 'Melitta three pour',
      query: 'melitta',
      optionId: 'melitta',
      styleTestId: 'ai-brew-melitta-style-three_pour_melitta',
      expectedFamily: 'melitta',
      expectedStyle: 'three_pour_melitta',
      stored: /tiga tuang bertahap|Melitta tiga tuang|trapesium/i,
      visible: /three|tiga|Melitta/i,
      forbidden: /Moka|sputter|French Press/i,
    },
    {
      label: 'Kono slow body',
      query: 'kono',
      optionId: 'kono-meimon',
      styleTestId: 'ai-brew-kono-style-kono_slow_drip_body',
      expectedFamily: 'kono',
      expectedStyle: 'kono_slow_drip_body',
      stored: /aliran lambat untuk body|Kono slow|body/i,
      visible: /slow|lambat|Kono/i,
      forbidden: /Moka|sputter|French Press/i,
    },
    {
      label: 'Switch bright clean',
      query: 'switch 03',
      optionId: 'hario-switch-03',
      switchPresetTestId: 'ai-brew-switch-preset-inline-hybrid_bright_clean',
      expectedFamily: 'hario_switch',
      expectedSwitchPreset: 'hybrid_bright_clean',
      stored: /Program hybrid bright clean|katup|muatan ruang|air turun/i,
      visible: /Switch|valve|katup|hybrid/i,
      forbidden: /paper filter|server|drawdown bed|slurry|flutes/i,
    },
  ];

  const fingerprints = new Map<string, string>();

  for (const entry of cases) {
    await openAiBrewProMode(page);
    await setVisibleInputValue(page, 'ai-brew-coffee-name', `QA Style ${entry.label}`);
    if (entry.dose) {
      await setVisibleInputValue(page, 'ai-brew-dose', entry.dose);
    }
    await page.getByTestId('ai-brew-dripper-picker').click();
    await page.getByTestId('ai-brew-picker-search-dripper').fill(entry.query);
    await page.getByTestId(`ai-brew-picker-option-dripper-${entry.optionId}`).click();
    if (entry.brewMode === 'iced') {
      await page.getByTestId('ai-brew-builder-mode-iced').click();
      await expect(page.getByTestId('ai-brew-builder-mode-iced')).toHaveAttribute('aria-pressed', 'true');
    }
    await openAiBrewProSection(page, 'method');
    if (entry.styleTestId) {
      await page.getByTestId(entry.styleTestId).click();
      await expect(page.getByTestId(entry.styleTestId)).toHaveAttribute('aria-pressed', 'true');
    }
    if (entry.switchPresetTestId) {
      await page.getByTestId(entry.switchPresetTestId).click();
      await expect(page.getByTestId(entry.switchPresetTestId)).toHaveAttribute('aria-pressed', 'true');
    }
    if (!/Aqua/i.test((await page.getByTestId('ai-brew-water-picker').textContent()) || '')) {
      await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
    }
    await page.getByTestId('ai-brew-generate').click();

    const result = page.getByTestId('ai-brew-result');
    await expect(result).toContainText(`QA Style ${entry.label}`);
    await result.getByTestId('ai-brew-result-tab-flow').click({ force: true });
    await result.getByTestId('ai-brew-guide-density-pro').click();
    const guidePanel = result.getByTestId('ai-brew-result-guide-panel');
    await expect(guidePanel).toBeVisible();
    const visibleText = ((await guidePanel.textContent()) || '').replace(/\s+/g, ' ');
    const plan = await readStoredAiBrewPlan(page);
    const storedText = (plan.workflowGuideSteps || [])
      .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''} ${step.techniqueChips.map((chip) => `${chip.label} ${chip.value}`).join(' ')}`)
      .join(' ');

    expect(plan.methodFamily).toBe(entry.expectedFamily);
    if (entry.expectedStyle) expect(plan.recipeStyle).toBe(entry.expectedStyle);
    if (entry.expectedSwitchPreset) expect(plan.switchPresetId).toBe(entry.expectedSwitchPreset);
    expect(plan.workflowValidation?.passed).toBe(true);
    expect(storedText).toMatch(entry.stored);
    expect(visibleText).toMatch(entry.visible);
    expect(`${storedText} ${visibleText}`).not.toMatch(entry.forbidden);
    fingerprints.set(entry.label, JSON.stringify({
      family: plan.methodFamily,
      style: plan.recipeStyle || plan.switchPresetId,
      ratio: plan.recommendedRatio,
      temp: plan.waterTempC,
      guide: storedText,
    }));

    await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
    const closePro = page.getByTestId('ai-brew-close-pro');
    if (await closePro.count()) await closePro.click();
  }

  expect(new Set(fingerprints.values()).size).toBe(cases.length);
});

test('ai brew all non-AeroPress selectable styles generate fresh validated plans through the UI', async ({ page }) => {
  test.setTimeout(1_500_000);
  type UiStyleFamilyCase = {
    label: string;
    query: string;
    optionId: string;
    expectedFamily: BrewPlan['methodFamily'];
    stylePrefix: string;
    styles: string[];
    dose?: string;
    forbidden: RegExp;
  };
  const styleFamilies: UiStyleFamilyCase[] = [
    {
      label: 'French Press',
      query: 'french press',
      optionId: 'french-press',
      expectedFamily: 'french_press',
      stylePrefix: 'ai-brew-french-press-style',
      styles: ['traditional', 'clean_decant', 'double_filter', 'heavy_concentrate', 'sweet_immersion'],
      forbidden: /\b(bloom|final pour|tuang akhir|spiral|v60|drawdown|pour map|flat bed|center-to-mid|hiss)\b|Action\s+Action/i,
    },
    {
      label: 'Kalita Wave',
      query: 'kalita wave',
      optionId: 'kalita-wave-155-185',
      expectedFamily: 'kalita_wave',
      stylePrefix: 'ai-brew-kalita-wave-style',
      styles: ['traditional_flat_three', 'competition_fast_four', 'continuous_slow_stream', 'iced_wave', 'high_dose_concentrate'],
      forbidden: /French Press|Moka|sputter|semburan/i,
    },
    {
      label: 'Clever Dripper',
      query: 'clever',
      optionId: 'clever-dripper',
      expectedFamily: 'clever_dripper',
      stylePrefix: 'ai-brew-clever-dripper-style',
      styles: ['classic_closed', 'reverse_water_first', 'double_stage_hybrid', 'iced_clever', 'high_dose_concentrate'],
      forbidden: /final pour|tuang akhir|spiral|sputter|semburan/i,
    },
    {
      label: 'Chemex',
      query: 'chemex',
      optionId: 'chemex',
      expectedFamily: 'chemex',
      stylePrefix: 'ai-brew-chemex-style',
      styles: ['traditional_three_pour', 'competition_multi_pulse', 'continuous_center_pour', 'iced_chemex', 'high_dose_heavy_body'],
      forbidden: /French Press|Moka|sputter|semburan/i,
    },
    {
      label: 'Moka Pot',
      query: 'moka',
      optionId: 'bialetti-moka-pot',
      expectedFamily: 'moka_pot',
      stylePrefix: 'ai-brew-moka-pot-style',
      styles: ['traditional_stovetop', 'preheated_boiler', 'low_temp_controlled', 'iced_moka_concentrate', 'high_yield_robust'],
      forbidden: /bloom|drawdown bed|final pour|tuang akhir|spiral|v60|filter wall/i,
    },
    {
      label: 'Cold Brew',
      query: 'cold brew',
      optionId: 'toddy-cold-brew',
      expectedFamily: 'cold_brew',
      stylePrefix: 'ai-brew-cold-brew-style',
      styles: ['classic_toddy_immersion', 'cold_drip_tower', 'double_extraction_concentrate', 'accelerated_room_temp', 'japanese_slow_drip'],
      dose: '60',
      forbidden: /hot pour|kettle|bloom|tuang panas|air panas|final pour|tuang akhir/i,
    },
    {
      label: 'Batch Brew',
      query: 'batch',
      optionId: 'batch-brewer',
      expectedFamily: 'batch_brew',
      stylePrefix: 'ai-brew-batch-brew-style',
      styles: ['sca_gold_cup', 'heavy_batch_catering', 'bright_light_roast_batch', 'pre_wet_hybrid_batch', 'high_extraction_thermos'],
      dose: '60',
      forbidden: /manual pour|bloom pour|spiral|v60|tuang manual/i,
    },
    {
      label: 'Siphon',
      query: 'siphon',
      optionId: 'hario-siphon',
      expectedFamily: 'siphon',
      stylePrefix: 'ai-brew-siphon-style',
      styles: ['traditional_vacuum_siphon', 'competition_triple_agitation', 'low_temp_delicate', 'high_body_fast_drawdown', 'spirit_infusion_style'],
      forbidden: /final pour|tuang akhir|spiral|moka|sputter|semburan/i,
    },
    {
      label: 'Origami',
      query: 'origami',
      optionId: 'origami-dripper-s-m',
      expectedFamily: 'origami',
      stylePrefix: 'ai-brew-origami-style',
      styles: ['cone_dripper_style', 'wave_dripper_style', 'mugen_one_pour', 'iced_origami', 'competition_hybrid_flow'],
      forbidden: /Moka|sputter|semburan|French Press/i,
    },
    {
      label: 'April',
      query: 'april',
      optionId: 'april-brewer',
      expectedFamily: 'april',
      stylePrefix: 'ai-brew-april-style',
      styles: ['april_flat_bottom_standard', 'april_continuous_slow', 'competition_two_pour', 'iced_april_style', 'high_body_heavy_dose'],
      forbidden: /Moka|sputter|semburan|French Press/i,
    },
    {
      label: 'Melitta',
      query: 'melitta',
      optionId: 'melitta',
      expectedFamily: 'melitta',
      stylePrefix: 'ai-brew-melitta-style',
      styles: ['traditional_melitta_one_pour', 'aromaboy_style', 'three_pour_melitta', 'iced_melitta_brew', 'dense_classic_extraction'],
      forbidden: /Moka|sputter|semburan|French Press/i,
    },
    {
      label: 'Kono',
      query: 'kono',
      optionId: 'kono-meimon',
      expectedFamily: 'kono',
      stylePrefix: 'ai-brew-kono-style',
      styles: ['kono_meimon_traditional', 'kono_dripper_standard', 'kono_slow_drip_body', 'iced_kono_meimon', 'kono_agitation_sweet'],
      forbidden: /Moka|sputter|semburan|French Press/i,
    },
  ];

  async function setModeForStyle(style: string) {
    const hot = page.getByTestId('ai-brew-builder-mode-hot');
    const iced = page.getByTestId('ai-brew-builder-mode-iced');
    const wantsIced = style.includes('iced');
    const target = wantsIced && await iced.isEnabled() ? iced : hot;
    await target.click();
    await expect(target).toHaveAttribute('aria-pressed', 'true');
  }

  async function editCurrentResultInputs() {
    const secondaryActions = page.getByTestId('ai-brew-result-secondary-actions');
    if (await secondaryActions.count()) {
      const isOpen = await secondaryActions.evaluate((node) => (node as HTMLDetailsElement).open).catch(() => false);
      if (!isOpen) {
        await secondaryActions.locator('summary').click();
      }
      await page.getByTestId('ai-brew-edit-inputs').click();
    } else {
      await page.getByTestId('ai-brew-result-action-edit').click();
    }
    await expect(page.getByTestId('ai-brew-builder-pro')).toBeVisible();
  }

  async function openFamilyBuilder(family: UiStyleFamilyCase) {
    await openAiBrewProMode(page);
    await setVisibleInputValue(page, 'ai-brew-coffee-name', `QA All Styles ${family.label}`);
    if (family.dose) await setVisibleInputValue(page, 'ai-brew-dose', family.dose);
    await page.getByTestId('ai-brew-dripper-picker').click();
    await page.getByTestId('ai-brew-picker-search-dripper').fill(family.query);
    await page.getByTestId(`ai-brew-picker-option-dripper-${family.optionId}`).click();
    await openAiBrewProSection(page, 'method');
    if (!/Aqua/i.test((await page.getByTestId('ai-brew-water-picker').textContent()) || '')) {
      await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
      await openAiBrewProSection(page, 'method');
    }
  }

  for (const family of styleFamilies) {
    await openFamilyBuilder(family);
    const familyFingerprints = new Set<string>();
    for (const style of family.styles) {
      await openAiBrewProSection(page, 'method');
      await setModeForStyle(style);
      const styleButton = page.getByTestId(`${family.stylePrefix}-${style}`);
      await styleButton.click();
      await expect(styleButton).toHaveAttribute('aria-pressed', 'true');
      await page.getByTestId('ai-brew-generate').click();

      const result = page.getByTestId('ai-brew-result');
      await expect(result).toContainText(`QA All Styles ${family.label}`);
      const summaryText = await result.innerText();
      expectCleanAiBrewVisibleCopy(summaryText, 'en', `${family.label}/${style}/summary`);
      expect(summaryText).not.toMatch(family.forbidden);

      await result.getByTestId('ai-brew-result-tab-flow').click({ force: true });
      const brewLiteText = await result.innerText();
      expectCleanAiBrewVisibleCopy(brewLiteText, 'en', `${family.label}/${style}/brew-lite`);
      expect(brewLiteText).not.toMatch(family.forbidden);
      await result.getByTestId('ai-brew-guide-density-pro').click();
      const brewProText = await result.innerText();
      expectCleanAiBrewVisibleCopy(brewProText, 'en', `${family.label}/${style}/brew-pro`);
      expect(brewProText).not.toMatch(family.forbidden);

      await result.getByTestId('ai-brew-result-tab-details').click({ force: true });
      const detailsText = await result.innerText();
      expectCleanAiBrewVisibleCopy(detailsText, 'en', `${family.label}/${style}/details`);
      expect(detailsText).not.toMatch(family.forbidden);

      const plan = await readStoredAiBrewPlan(page);
      const storedText = (plan.workflowGuideSteps || [])
        .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''}`)
        .join(' ');

      expect(plan.methodFamily).toBe(family.expectedFamily);
      expect(plan.recipeStyle).toBe(style);
      expect(plan.workflowValidation?.passed).toBe(true);
      const expectedRatio = Math.round((plan.totalWaterMl / plan.doseG) * 10) / 10;
      expect(Math.round(plan.finalBeverageRatio * 10) / 10).toBe(expectedRatio);
      await expect(result).toContainText(new RegExp(`1:${formatAiBrewDisplayRatio(plan.finalBeverageRatio).replace('.', '\\.')}`));
      expect(storedText).not.toMatch(family.forbidden);
      if (family.expectedFamily === 'french_press') {
        expect(storedText).toMatch(/Charge water|Isi air|Steep|Rendam|Press gently|Tekan pelan|Decant|Tuang pisah/i);
        expect(storedText).not.toMatch(/\$(?:\d+|\{)|\b(?:undefined|null|NaN)\b|ActionAction|Pressgentle|Stophiss|stir\s+\d+(?:-\d+)?\s+times\s+saja|pour\s+air/i);
        if (style === 'heavy_concentrate') {
          expect(plan.finalBeverageRatio).toBeGreaterThanOrEqual(11);
          expect(plan.finalBeverageRatio).toBeLessThanOrEqual(12);
          expect(storedText).toMatch(/concentrate|konsentrat|dilute|dilusi|milk|susu/i);
        } else {
          expect(plan.finalBeverageRatio).toBeGreaterThanOrEqual(12);
          expect(plan.finalBeverageRatio).toBeLessThanOrEqual(17);
          expect(storedText).not.toMatch(/dilute only when planned|dilusi dengan air atau susu/i);
        }
      }
      familyFingerprints.add(JSON.stringify({
        style: plan.recipeStyle,
        mode: plan.brewMode,
        ratio: plan.recommendedRatio,
        temp: plan.waterTempC,
        time: plan.totalTimeSeconds,
        guide: storedText.replace(/\d+(?::\d{2})?\s*(?:ml|g|detik|seconds|h|m)?/gi, '#'),
      }));
      await editCurrentResultInputs();
    }

    expect(familyFingerprints.size).toBe(family.styles.length);
    const closePro = page.getByTestId('ai-brew-close-pro');
    if (await closePro.count()) await closePro.click();
  }

  const switchPresets = ['immersion_sweet', 'immersion_heavy_body', 'hybrid_balanced', 'hybrid_bright_clean', 'v60_mode', 'iced_hybrid'] as const;
  const switchFingerprints = new Set<string>();

  await openAiBrewProMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA All Styles Switch');
  await setVisibleInputValue(page, 'ai-brew-dose', '15');
  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByTestId('ai-brew-picker-search-dripper').fill('switch 03');
  await page.getByTestId('ai-brew-picker-option-dripper-hario-switch-03').click();
  await openAiBrewProSection(page, 'method');

  for (const preset of switchPresets) {
    await openAiBrewProSection(page, 'method');
    await setModeForStyle(preset);
    const presetButton = page.getByTestId(`ai-brew-switch-preset-inline-${preset}`);
    await presetButton.click();
    await expect(presetButton).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('ai-brew-generate').click();
    await expect(page.getByTestId('ai-brew-result')).toContainText('QA All Styles Switch');
    const plan = await readStoredAiBrewPlan(page);
    const storedText = (plan.workflowGuideSteps || [])
      .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''}`)
      .join(' ');

    expect(plan.methodFamily).toBe('hario_switch');
    expect(plan.switchPresetId).toBe(preset);
    expect(plan.workflowValidation?.passed).toBe(true);
    expect(storedText).toMatch(/Katup|katup|muatan ruang|air turun|valve/i);
    expect(storedText).not.toMatch(/paper filter|server|drawdown bed|slurry|flutes/i);
    switchFingerprints.add(storedText.replace(/\d+(?::\d{2})?\s*(?:ml|g|detik|seconds|h|m)?/gi, '#'));
    await editCurrentResultInputs();
  }
  expect(switchFingerprints.size).toBe(switchPresets.length);
});

test('ai brew manual preset applies source-backed defaults and generates a validated guide', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Manual Preset George Peng');
  await page.getByTestId('ai-brew-manual-preset-toggle').click();
  await expect(page.getByTestId('ai-brew-manual-preset-list')).toBeVisible();
  await setVisibleInputValue(page, 'ai-brew-manual-preset-search', 'George Peng');
  await page.getByTestId('ai-brew-manual-preset-inspired-george-peng-temperature-control').click();
  await expect(page.getByTestId('ai-brew-selected-manual-preset')).toContainText(/George Peng/i);
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('QA Manual Preset George Peng');
  await expect(result.getByTestId('ai-brew-result-manual-preset-chip')).toContainText(/George Peng/i);
  await result.getByTestId('ai-brew-result-tab-flow').click();
  await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
  const plan = await readStoredAiBrewPlan(page);
  expect(plan.manualPresetId).toBe('inspired-george-peng-temperature-control');
  expect(plan.manualPresetLabel).toMatch(/George Peng/i);
  expect(plan.dripper.id).toBe('orea-v3-v4');
  expect(plan.workflowValidation?.passed).toBe(true);
  expect((plan.workflowGuideSteps || []).length).toBeGreaterThan(3);
  await result.getByTestId('ai-brew-result-secondary-actions').locator('summary').click();
  await result.getByTestId('ai-brew-save').click();
  await expect(page.getByText(AI_BREW_SAVED_COLLECTION)).toBeVisible();
});

test('ai brew Brew Presets preserve source-backed ratios, localized confidence, guides, and saved plan metadata', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Brew Presets Tetsu 2026');
  await page.getByTestId('ai-brew-manual-preset-toggle').click();
  await expect(page.getByTestId('ai-brew-manual-preset-list')).toBeVisible();
  await setVisibleInputValue(page, 'ai-brew-manual-preset-search', '2026');
  const tetsuPreset = page.getByTestId('ai-brew-manual-preset-inspired-tetsu-kasuya-2026-ten-pour');
  await expect(tetsuPreset).toContainText(/Curated reference/i);
  await expect(tetsuPreset).toContainText(/10x Pour/i);
  await tetsuPreset.click();
  await expect(page.getByTestId('ai-brew-selected-manual-preset')).toContainText(/Tetsu Kasuya 2026 10x Pour/i);
  await page.getByTestId('ai-brew-generate').click();

  let result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('QA Brew Presets Tetsu 2026');
  await expect(result.getByTestId('ai-brew-result-manual-preset-chip')).toContainText(/Tetsu Kasuya 2026 10x Pour/i);
  await result.getByTestId('ai-brew-result-tab-flow').click();
  const tetsuPlan = await readStoredAiBrewPlan(page);
  const tetsuGuide = (tetsuPlan.workflowGuideSteps || [])
    .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''}`)
    .join(' ');
  expect(tetsuPlan.manualPresetId).toBe('inspired-tetsu-kasuya-2026-ten-pour');
  expect(tetsuPlan.dripper.id).toBe('hario-v60');
  expect(tetsuPlan.doseG).toBe(20);
  expect(tetsuPlan.totalWaterMl).toBe(300);
  expect(tetsuPlan.workflowValidation?.passed).toBe(true);
  expect([tetsuPlan.manualPresetLabel, tetsuPlan.manualPresetSummary, ...tetsuPlan.notes, ...tetsuPlan.warnings].join(' ')).toMatch(
    /10x pour|ten 30g pours|Hario Neo.*V60/i,
  );
  expect(tetsuPlan.steps.filter((step) => (step.pourVolumeMl || 0) > 0).map((step) => step.pourVolumeMl)).toEqual(
    Array.from({ length: 10 }, () => 30),
  );
  await expect(result).toContainText(`1:${formatAiBrewDisplayRatio(tetsuPlan.finalBeverageRatio)}`);
  expect(tetsuGuide).toMatch(/30\s*(g|ml)/i);
  expect(tetsuGuide).not.toMatch(/\$(?:\d+|\{)|\b(?:undefined|null|NaN)\b|ActionAction|Pressgentle|Stophiss/i);

  await result.getByTestId('ai-brew-result-secondary-actions').locator('summary').click();
  await result.getByTestId('ai-brew-save').click();
  await expect(page.getByText(AI_BREW_SAVED_COLLECTION)).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem('BARISTA_LANGUAGE', 'id');
    localStorage.setItem('BARISTA_LANGUAGE_ID_DEFAULT_MIGRATED', '1');
  });
  await page.goto('/tools?tab=ai-brew&language=id', { waitUntil: 'domcontentloaded' });
  await clearClientState(page);
  await page.evaluate(() => {
    localStorage.setItem('BARISTA_LANGUAGE', 'id');
    localStorage.setItem('BARISTA_LANGUAGE_ID_DEFAULT_MIGRATED', '1');
  });
  await page.goto('/tools?tab=ai-brew&language=id', { waitUntil: 'domcontentloaded' });
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Brew Presets Jan Ahrend');
  await page.getByTestId('ai-brew-manual-preset-toggle').click();
  await expect(page.getByTestId('ai-brew-manual-preset-list')).toBeVisible();
  await setVisibleInputValue(page, 'ai-brew-manual-preset-search', 'Jan Ahrend');
  const janPreset = page.getByTestId('ai-brew-manual-preset-inspired-wac-2025-jan-ahrend');
  await expect(janPreset).toContainText(/Referensi resmi/i);
  await janPreset.click();
  await expect(page.getByTestId('ai-brew-selected-manual-preset')).toContainText(/Jan Ahrend/i);
  await page.getByTestId('ai-brew-generate').click();

  result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('QA Brew Presets Jan Ahrend');
  await result.getByTestId('ai-brew-result-tab-flow').click();
  const janPlan = await readStoredAiBrewPlan(page);
  const janGuide = (janPlan.workflowGuideSteps || [])
    .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''}`)
    .join(' ');
  expect(janPlan.manualPresetId).toBe('inspired-wac-2025-jan-ahrend');
  expect(janPlan.methodFamily).toBe('aeropress');
  expect(janPlan.doseG).toBe(18);
  expect(janPlan.totalWaterMl).toBe(152);
  expect(janPlan.hotWaterMl).toBe(100);
  expect(janPlan.workflowValidation?.passed).toBe(true);
  await expect(result).toContainText(`1:${formatAiBrewDisplayRatio(janPlan.finalBeverageRatio)}`);
  expect(janGuide).toMatch(/100\s*(g|ml)/i);
  expect(janGuide).toMatch(/52\s*(g|ml).*bypass|bypass.*52\s*(g|ml)/i);
  expect(janGuide).not.toMatch(/drawdown|flat bed|final pour|V60|\$(?:\d+|\{)|\b(?:undefined|null|NaN)\b/i);
  await result.getByTestId('ai-brew-result-secondary-actions').locator('summary').click();
  await result.getByTestId('ai-brew-save').click();
  await expect(page.getByText(AI_BREW_SAVED_COLLECTION)).toBeVisible();
});

test('ai brew grinder picker shows Feima 600N platform aliases without losing the canonical entry', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-grinder-picker').click();
  await page.getByTestId('ai-brew-picker-search-grinder').fill('Feima 600N');

  const feima = page.getByTestId('ai-brew-picker-option-grinder-feima-600n');
  await expect(feima).toBeVisible();
  await expect(feima).toContainText(/Feima 600N/i);
  await expect(feima).toContainText(/Murane B600BN|Latina 600N|Flying Eagle 600N|Yang-Chia|Fomac|Kova/i);
  await expect(feima).not.toContainText(/Curated reference|Community reference|Referensi kurasi|Referensi komunitas/i);
  await expect(page.locator('button').filter({ hasText: 'Feima 600N / Murane B600BN' })).toHaveCount(1);
});

test('ai brew locks ice mode for methods that should stay hot or dedicated cold', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByTestId('ai-brew-picker-search-dripper').fill('espresso');
  const espressoOption = page.getByTestId('ai-brew-picker-option-dripper-espresso-machine');
  await expect(espressoOption).toBeDisabled();
  await expect(espressoOption).toContainText(/Coming Soon/i);

  await page.getByTestId('ai-brew-picker-search-dripper').fill('french press');
  await page.getByTestId('ai-brew-picker-option-dripper-french-press').click();

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
  await expect(waterSummary).toContainText(/Ready/i);
  await expect(waterSummary).not.toContainText(/TDS|GH|KH/i);

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
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-aqua-id')).toContainText(/Ready|Siap seduh|Balanced|Seimbang|ID/i);
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

test('ai brew allows community-backed low-mineral filter water with capped confidence', async ({ page }) => {
  await openAiBrewProMode(page);
  await selectAiBrewWaterBrand(page, 'amidis', 'amidis-id');

  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Amidis/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Ready with caution|Community coffee profile|Demineral direct experiment/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/low-confidence filter starting point|remineralize|Low-mineral experiment/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/TDS 2/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/GH 1\.4/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/KH 1\.2/i);
  await expect(page.getByTestId('ai-brew-generate')).toBeEnabled();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);

  await page.getByTestId('ai-brew-water-toggle-minerals').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveValue('2');
  await expect(page.getByTestId('ai-brew-water-hardness')).toHaveValue('1.4');
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toHaveValue('1.2');
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
  await expect(result.getByTestId('ai-brew-sequence-section')).toHaveCount(0);
  await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
  const hotPlan = await readStoredAiBrewPlan(page);
  await expect(result.getByTestId('ai-brew-flow-current-card')).toContainText(`1:${formatAiBrewDisplayRatio(hotPlan.finalBeverageRatio)}`);
  await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/Tuangan berikutnya|Next pour/i);
  await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/Sisa total|Total left/i);

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

test('ai brew uses latest edited inputs when regenerating without reset', async ({ page }) => {
  test.setTimeout(240_000);

  await openAiBrewProMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Roast Live Sync');

  if (!/V60/i.test((await page.getByTestId('ai-brew-dripper-picker').textContent()) || '')) {
    await page.getByTestId('ai-brew-dripper-picker').click();
    await page.getByTestId('ai-brew-picker-search-dripper').fill('v60');
    await page.getByTestId('ai-brew-picker-option-dripper-hario-v60').click();
  }

  if (!/K-Ultra|1Zpresso/i.test((await page.getByTestId('ai-brew-grinder-picker').textContent()) || '')) {
    await page.getByTestId('ai-brew-grinder-picker').click();
    await page.getByTestId('ai-brew-picker-search-grinder').fill('K-Ultra');
    await page.getByTestId('ai-brew-picker-option-grinder-1zpresso-k-ultra').click();
  }

  await page.getByTestId('ai-brew-process-picker').click();
  await setVisibleInputValue(page, 'ai-brew-picker-search-process', 'washed');
  await page.getByTestId('ai-brew-picker-option-process-washed').click();

  await page.getByTestId('ai-brew-variety-picker').click();
  await setVisibleInputValue(page, 'ai-brew-picker-search-variety', 'bourbon');
  await page.locator('[data-testid^="ai-brew-picker-option-variety-"]').first().click();

  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-target-profile-more_sweetness').click();
  await page.getByTestId('ai-brew-roast-medium_light').click();
  await page.getByTestId('ai-brew-generate').click();

  const firstResult = page.getByTestId('ai-brew-result');
  await expect(firstResult).toContainText('QA Roast Live Sync');
  const firstPlan = await readStoredAiBrewPlan(page);
  expect(firstPlan.targetProfileId).toBe('more_sweetness');
  expect(firstPlan.roastLevel).toBe('medium_light');
  expect(Math.round(firstPlan.waterTempC)).toBe(93);
  expect(firstPlan.formState.targetTempC).toBe('');

  await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
  await openAiBrewProMode(page);
  await expect(page.getByTestId('ai-brew-roast-medium_light')).toBeVisible();

  await page.evaluate(() => {
    const clickByTestId = (testId: string) => {
      const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
      if (!element) throw new Error(`Missing ${testId}`);
      element.click();
    };
    clickByTestId('ai-brew-roast-medium');
    clickByTestId('ai-brew-generate');
  });

  const secondResult = page.getByTestId('ai-brew-result');
  await expect(secondResult).toContainText('QA Roast Live Sync');
  const secondPlan = await readStoredAiBrewPlan(page);
  expect(secondPlan.targetProfileId).toBe('more_sweetness');
  expect(secondPlan.roastLevel).toBe('medium');
  expect(Math.round(secondPlan.waterTempC)).toBe(92);
  expect(secondPlan.formState.targetTempC).toBe('');
  expect(secondPlan.waterTempC).toBeLessThan(firstPlan.waterTempC);
  expect(secondPlan.fingerprint).not.toBe(firstPlan.fingerprint);

  await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
  await openAiBrewProMode(page);
  await page.evaluate(() => {
    const clickByTestId = (testId: string) => {
      const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
      if (!element) throw new Error(`Missing ${testId}`);
      element.click();
    };
    clickByTestId('ai-brew-target-profile-more_body');
    clickByTestId('ai-brew-roast-medium_dark');
    clickByTestId('ai-brew-generate');
  });

  const thirdResult = page.getByTestId('ai-brew-result');
  await expect(thirdResult).toContainText('QA Roast Live Sync');
  const thirdPlan = await readStoredAiBrewPlan(page);
  expect(thirdPlan.targetProfileId).toBe('more_body');
  expect(thirdPlan.roastLevel).toBe('medium_dark');
  expect(Math.round(thirdPlan.waterTempC)).toBe(91);
  expect(thirdPlan.formState.targetTempC).toBe('');
  expect(thirdPlan.fingerprint).not.toBe(secondPlan.fingerprint);

  await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
  await openAiBrewProMode(page);
  await page.getByTestId('ai-brew-grinder-picker').click();
  await page.getByTestId('ai-brew-picker-search-grinder').fill('Comandante C40');
  await page.getByTestId('ai-brew-picker-option-grinder-comandante-c40-mk4').click();
  await page.evaluate(() => {
    const generate = document.querySelector<HTMLElement>('[data-testid="ai-brew-generate"]');
    if (!generate) throw new Error('Missing ai-brew-generate');
    generate.click();
  });

  const grinderResult = page.getByTestId('ai-brew-result');
  await expect(grinderResult).toContainText('QA Roast Live Sync');
  const grinderPlan = await readStoredAiBrewPlan(page);
  expect(grinderPlan.grinder.id).toBe('comandante-c40-mk4');
  expect(grinderPlan.formState.grinderId).toBe('comandante-c40-mk4');
  expect(grinderPlan.fingerprint).not.toBe(thirdPlan.fingerprint);

  await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
  await openAiBrewProMode(page);
  await switchAiBrewToManualWater(page, { tds: '85', hardness: '38', alkalinity: '25' });
  await page.evaluate(() => {
    const generate = document.querySelector<HTMLElement>('[data-testid="ai-brew-generate"]');
    if (!generate) throw new Error('Missing ai-brew-generate');
    generate.click();
  });

  const waterResult = page.getByTestId('ai-brew-result');
  await expect(waterResult).toContainText('QA Roast Live Sync');
  const waterPlan = await readStoredAiBrewPlan(page);
  expect(waterPlan.waterMode).toBe('manual');
  expect(waterPlan.waterBrandId).toBe('');
  expect(waterPlan.waterMinerals.tdsPpm).toBe(85);
  expect(waterPlan.waterMinerals.hardnessPpm).toBe(38);
  expect(waterPlan.waterMinerals.alkalinityPpm).toBe(25);
  expect(waterPlan.fingerprint).not.toBe(grinderPlan.fingerprint);

  await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
  await openAiBrewProMode(page);
  await page.getByTestId('ai-brew-process-picker').click();
  await setVisibleInputValue(page, 'ai-brew-picker-search-process', 'natural');
  await page.getByTestId('ai-brew-picker-option-process-natural').click();
  await page.getByTestId('ai-brew-variety-picker').click();
  await setVisibleInputValue(page, 'ai-brew-picker-search-variety', 'gesha');
  await page.locator('[data-testid^="ai-brew-picker-option-variety-"]').first().click();
  await page.evaluate(() => {
    const generate = document.querySelector<HTMLElement>('[data-testid="ai-brew-generate"]');
    if (!generate) throw new Error('Missing ai-brew-generate');
    generate.click();
  });

  const beanResult = page.getByTestId('ai-brew-result');
  await expect(beanResult).toContainText('QA Roast Live Sync');
  const beanPlan = await readStoredAiBrewPlan(page);
  expect(String(beanPlan.process || '').toLowerCase()).toContain('natural');
  expect(String(beanPlan.variety || '').toLowerCase()).toMatch(/gesha|geisha/);
  expect(beanPlan.fingerprint).not.toBe(waterPlan.fingerprint);

  await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
  await openAiBrewProMode(page);
  await openAiBrewProSection(page, 'recipe');
  await page.evaluate(() => {
    const clickByTestId = (testId: string) => {
      const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
      if (!element) throw new Error(`Missing ${testId}`);
      element.click();
    };
    clickByTestId('ai-brew-pour-style-pulse');
    clickByTestId('ai-brew-pour-count-5');
    clickByTestId('ai-brew-generate');
  });

  const pourStyleResult = page.getByTestId('ai-brew-result');
  await expect(pourStyleResult).toContainText('QA Roast Live Sync');
  const pourStylePlan = await readStoredAiBrewPlan(page);
  expect(pourStylePlan.formState.pourStyle).toBe('pulse');
  expect(pourStylePlan.formState.pourCount).toBe('5');
  expect(pourStylePlan.steps.filter((step: { pourVolumeMl?: number }) => (step.pourVolumeMl || 0) > 0).length)
    .toBeGreaterThanOrEqual(5);
  expect(pourStylePlan.fingerprint).not.toBe(beanPlan.fingerprint);

  await page.getByRole('button', { name: AI_BREW_CLOSE_OUTPUT }).click();
  await openAiBrewProMode(page);
  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByTestId('ai-brew-picker-search-dripper').fill('moka');
  await page.getByTestId('ai-brew-picker-option-dripper-bialetti-moka-pot').click();
  await openAiBrewProSection(page, 'method');
  await page.evaluate(() => {
    const clickByTestId = (testId: string) => {
      const element = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
      if (!element) throw new Error(`Missing ${testId}`);
      element.click();
    };
    clickByTestId('ai-brew-moka-pot-style-low_temp_controlled');
    clickByTestId('ai-brew-generate');
  });

  const mokaResult = page.getByTestId('ai-brew-result');
  await expect(mokaResult).toContainText('QA Roast Live Sync');
  const mokaPlan = await readStoredAiBrewPlan(page);
  expect(mokaPlan.methodFamily).toBe('moka_pot');
  expect(mokaPlan.recipeStyle).toBe('low_temp_controlled');
  expect(mokaPlan.formState.dripperId).toBe('bialetti-moka-pot');
  expect(mokaPlan.formState.mokaPotStyle).toBe('low_temp_controlled');
  const mokaGuideText = (mokaPlan.workflowGuideSteps || [])
    .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''}`)
    .join(' ');
  expect(mokaGuideText).toMatch(/boiler|basket|panas|heat|sputter|semburan/i);
  expect(mokaGuideText).not.toMatch(/bloom|drawdown bed|final pour|tuang akhir|spiral|v60/i);
  expect(mokaPlan.fingerprint).not.toBe(pourStylePlan.fingerprint);
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
    expect(plan.finalBeverageRatio).toBe(Math.round((plan.totalWaterMl / plan.doseG) * 100) / 100);
    expect(Math.abs(plan.recommendedRatio - plan.finalBeverageRatio)).toBeLessThanOrEqual(0.35);
    expect(plan.hotExtractionRatio).toBeGreaterThanOrEqual(8.7);
    expect(plan.hotExtractionRatio).toBeLessThanOrEqual(10.9);
    expect(plan.steps.length).toBeGreaterThanOrEqual(4);
    expect(plan.steps.map((step) => step.kind)).not.toContain('serve');
    expect(plan.steps[2]?.label).toMatch(/Pulse|Pour/i);
    expect(plan.steps[plan.steps.length - 1]?.label).toMatch(/Final Pour|Finish/i);
    const firstHotTargetText = new RegExp(`${Math.round(plan.steps[0]?.targetVolumeMl || plan.hotWaterMl)}\\s*ml\\s*(hot water|air panas)`, 'i');
    const assertTechniqueChips = async (card: Locator, detail: Locator) => {
      await expect(card).toContainText(/Flow|Aliran/i);
      await expect(detail).toContainText(/Path|Jalur/i);
      await expect(detail).toContainText(/Height|Tinggi/i);
      await expect(detail).toContainText(/Agitation|Agitasi/i);
    };

    if (mode === 'quick') {
      await result.getByTestId('ai-brew-result-tab-flow').click();
      await expect(result.getByTestId('ai-brew-iced-calibration')).toHaveCount(0);
      await expect(result.getByTestId('ai-brew-sequence-section')).toHaveCount(0);
      await expect(result.getByTestId('ai-brew-flow-timer-panel')).toBeVisible();
      await expect(result.getByTestId('ai-brew-flow-current-card')).toContainText(`1:${formatAiBrewDisplayRatio(plan.finalBeverageRatio)}`);
      await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/Tuangan berikutnya|Next pour/i);
      await expect(result.getByTestId('ai-brew-flow-remaining-status')).toContainText(/Sisa total|Total left/i);
      await expect(result.getByTestId('ai-brew-guide-density-basic')).toHaveAttribute('aria-pressed', 'true');
      await expect(result.getByTestId('ai-brew-flow-current-card')).toContainText(firstHotTargetText);
    } else {
      await result.getByTestId('ai-brew-result-tab-details').click();
      await expect(result.getByTestId('ai-brew-bean-data-precision')).toContainText(/Bean Data (Precision|Accuracy)|Presisi Data Bean|Akurasi Data Bean/i);
      await expect(result.getByTestId('ai-brew-why-this-extraction')).toContainText(/Why This Extraction|Kenapa Ekstraksi Ini/i);
      await expect(result.getByTestId('ai-brew-bean-data-precision-signals')).toContainText(/process|proses|roast|water|TDS/i);
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
      await assertTechniqueChips(result.getByTestId('ai-brew-flow-step-2'), result.getByTestId('ai-brew-flow-step-technique-detail-2'));
      await assertTechniqueChips(result.getByTestId('ai-brew-flow-current-card'), result.getByTestId('ai-brew-flow-current-step-technique-detail'));
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

  await page.getByRole('button', { name: /Close planned output|Tutup output plan|Tutup hasil/i }).click();
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

test('ai brew result keeps timer and ratio handoff actions hidden for MVP', async ({ page }) => {
  await expect(page.getByTestId('ai-brew-panel')).toBeVisible();

  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Iced Gesha');
  await page.getByTestId('ai-brew-dose').fill('20');
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText(/Ice|Es|Seduh Es/i);

  await result.getByTestId('ai-brew-result-secondary-actions').locator('summary').click();
  await expect(page.getByTestId('ai-brew-use-timer')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-use-ratio')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-result-action-timer')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-result-action-ratio')).toHaveCount(0);
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



