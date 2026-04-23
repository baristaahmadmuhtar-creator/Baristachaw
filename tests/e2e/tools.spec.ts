import { test, expect } from '@playwright/test';
import { qaLogin, qaLogout } from '../fixtures/auth';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';

test.beforeEach(async ({ page }) => {
  await qaLogout(page.request);
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

async function selectAiBrewWaterBrand(
  page: import('@playwright/test').Page,
  query: string,
  resultId: string,
) {
  await page.getByTestId('ai-brew-water-picker').click();
  await page.getByTestId('ai-brew-picker-search-water_brand').fill(query);

  const preferred = page.getByTestId(`ai-brew-picker-option-water_brand-${resultId}`);
  if (await preferred.count()) {
    await preferred.first().click();
    return;
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
  await page.waitForTimeout(1200);
  await expect(page.getByText('00:01')).toBeVisible();
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

test('ai brew pro keeps mineral editor collapsed by default for ready-brew brand water', async ({ page }) => {
  await openAiBrewProMode(page);
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');

  await expect(page.getByTestId('ai-brew-water-toggle-minerals')).toBeVisible();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);

  await page.getByTestId('ai-brew-water-toggle-minerals').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toBeVisible();

  await page.getByTestId('ai-brew-water-toggle-minerals').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);
});

test('ai brew water picker modal autofills a published brew-ready brand', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Volvic Search');
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');

  const waterSummary = page.getByTestId('ai-brew-water-summary');
  await expect(waterSummary).toBeVisible();
  await expect(waterSummary).toContainText(/TDS 130/i);
  await expect(waterSummary).toContainText(/Ready brew water/i);

  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toContainText('QA Volvic Search');
  await expect(page.getByTestId('ai-brew-result')).toContainText('Volvic');
});

test('ai brew water picker shows all deduped waters and keeps estimated brands visible', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-water-picker').click();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-volvic-sg')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-pure-life-global')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-aqua-id')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-cleo-id')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-le-minerale-id')).toBeVisible();
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-le-minerale-my')).toHaveCount(0);
  await expect(page.getByTestId('ai-brew-picker-option-water_brand-pure-life-sg')).toHaveCount(0);

  const optionOrder = await page.locator('[data-testid^="ai-brew-picker-option-water_brand-"]').evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.testid || '')
  );
  expect(optionOrder.indexOf('ai-brew-picker-option-water_brand-aqua-id')).toBeLessThan(optionOrder.indexOf('ai-brew-picker-option-water_brand-volvic-sg'));
  expect(optionOrder.indexOf('ai-brew-picker-option-water_brand-cleo-id')).toBeGreaterThan(optionOrder.indexOf('ai-brew-picker-option-water_brand-pure-life-global'));
});

test('ai brew selecting a published water autofills complete minerals and keeps the editor optional', async ({ page }) => {
  await openAiBrewProMode(page);
  await selectAiBrewWaterBrand(page, 'aqua', 'aqua-id');

  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Aqua/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Ready brew water/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/TDS 112/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/GH 79/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/KH 68\.3/i);
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);
  await page.getByTestId('ai-brew-water-toggle-minerals').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveValue('112');
  await expect(page.getByTestId('ai-brew-water-hardness')).toHaveValue('79');
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toHaveValue('68.3');
});

test('ai brew preloads known GH and KH values for partially mapped waters', async ({ page }) => {
  await openAiBrewProMode(page);
  await selectAiBrewWaterBrand(page, 'le', 'le-minerale-id');

  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Le Minerale/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/TDS 299/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/GH 211\.1/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/KH 182\.4/i);
  await page.getByTestId('ai-brew-water-toggle-minerals').click();
  await expect(page.getByTestId('ai-brew-water-hardness')).toHaveValue('211.1');
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toHaveValue('182.4');
});

test('ai brew applies published mineral values for low-mineral waters', async ({ page }) => {
  await openAiBrewProMode(page);
  await selectAiBrewWaterBrand(page, 'amidis', 'amidis-id');

  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Amidis/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/Ready brew water/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/TDS 2/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/GH 1\.4/i);
  await expect(page.getByTestId('ai-brew-water-summary')).toContainText(/KH 1\.2/i);
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveCount(0);
  await page.getByTestId('ai-brew-water-toggle-minerals').click();
  await expect(page.getByTestId('ai-brew-water-tds')).toHaveValue('2');
  await expect(page.getByTestId('ai-brew-water-hardness')).toHaveValue('1.4');
  await expect(page.getByTestId('ai-brew-water-alkalinity')).toHaveValue('1.2');
});

test('ai brew pro bean profile updates the analysis state while quick stays minimal', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await expect(page.getByTestId('ai-brew-bean-profile-toggle')).toHaveCount(0);
  await page.getByTestId('ai-brew-close-quick').click();

  await openAiBrewProMode(page);
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
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('QA Ethiopia Chelbesa');
  await expect(result.getByTestId('ai-brew-sequence-section')).toContainText('Brew Sequence');
  await expect(result.getByTestId('ai-brew-step-card-1')).toBeVisible();

  await page.getByTestId('ai-brew-save').click();
  await expect(page.getByText('Recipe saved to Collection.')).toBeVisible();
  await page.goto('/collection', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible();
  await expect(page.getByText('QA Ethiopia Chelbesa')).toBeVisible();
});

test('ai brew quick and pro modes honor target profile changes in the generated result', async ({ page }) => {
  const parseMetric = (text: string, label: string) => {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`${escapedLabel}\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i'));
    return match ? Number(match[1]) : null;
  };
  const parseTimeSeconds = (text: string) => {
    const match = text.match(/Brew Time\s*(\d{2}):(\d{2})/i);
    return match ? (Number(match[1]) * 60) + Number(match[2]) : null;
  };

  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Target Quick');
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');
  await page.getByRole('button', { name: 'More Acidity' }).click();
  await page.getByTestId('ai-brew-generate').click();

  const quickResult = page.getByTestId('ai-brew-result');
  await expect(quickResult).toContainText('More Acidity');
  const quickText = (await quickResult.textContent()) || '';
  const quickWater = parseMetric(quickText, 'Total Water');
  const quickTemp = parseMetric(quickText, 'Temperature');
  const quickTime = parseTimeSeconds(quickText);
  expect(quickWater).toBeTruthy();
  expect(quickTemp).toBeTruthy();
  expect(quickTime).toBeTruthy();

  await page.getByRole('button', { name: 'Close planned output' }).click();

  await openAiBrewProMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Target Pro');
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');
  await page.getByRole('button', { name: 'More Body' }).click();
  await page.getByTestId('ai-brew-generate').click();

  const proResult = page.getByTestId('ai-brew-result');
  await expect(proResult).toContainText('More Body');
  const proText = (await proResult.textContent()) || '';
  const proWater = parseMetric(proText, 'Total Water');
  const proTemp = parseMetric(proText, 'Temperature');
  const proTime = parseTimeSeconds(proText);
  expect(proWater).toBeTruthy();
  expect(proTemp).toBeTruthy();
  expect(proTime).toBeTruthy();

  expect(proWater!).toBeLessThan(quickWater!);
  expect(proTemp!).toBeGreaterThanOrEqual(quickTemp!);
  expect(proTime!).toBeGreaterThan(quickTime!);
});

test('ai brew can hand off an iced plan into timer and ratio tools', async ({ page }) => {
  await expect(page.getByTestId('ai-brew-panel')).toBeVisible();

  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Iced Gesha');
  await page.getByTestId('ai-brew-dose').fill('20');
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('Ice');
  const brewTimeText = ((await result.textContent()) || '').match(/(\d{2}:\d{2})/)?.[1];
  expect(brewTimeText).toBeTruthy();

  await page.getByTestId('ai-brew-use-timer').click();
  await expect(page.getByRole('tab', { name: 'Timer', exact: true })).toHaveClass(/bg-white/);
  await expect(page.locator('#tools-panel-timer span.text-sm.text-secondary.mt-1')).toHaveText(brewTimeText!);

  await page.goto('/tools?tab=ai-brew');
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Iced Gesha');
  await page.getByTestId('ai-brew-dose').fill('20');
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();
  await page.getByTestId('ai-brew-use-ratio').click();

  await expect(page.getByRole('tab', { name: 'Ratio', exact: true })).toHaveClass(/bg-white/);
  await expect(page.getByRole('button', { name: 'V60 Ice Brew' })).toHaveClass(/bg-blue-600/);
  await expect(page.getByTestId('dose-input')).toHaveValue('20');
  await expect(page.getByTestId('ratio-input')).not.toHaveValue('16');
});

test('guest users are gated only when requesting ai coaching', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Guest Brew');
  await switchAiBrewToManualWater(page, { tds: '90', hardness: '55', alkalinity: '40' });
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toBeVisible();
  await expect(page.getByTestId('ai-brew-sequence-note')).toContainText(/Brew Sequence|Urutan Seduh/i);
  await expect(page.getByRole('button', { name: 'Sign in to enable AI coach' })).toHaveCount(0);
  await page.getByTestId('ai-brew-result-tab-coach').click();
  await expect(page.getByRole('button', { name: 'Explain Plan' })).toBeDisabled();
  await expect(page.getByText('AI coach is disabled until you sign in.')).toBeVisible();
  await page.getByRole('button', { name: 'Sign in to enable AI coach' }).click();

  const dialog = page.getByRole('dialog', { name: 'Sign in' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('AI Brew requires an authenticated account.');
});

test('authenticated users can request ai coaching manually from the result panel', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });

  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Manual Coach');
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toBeVisible();
  await expect(page.getByTestId('ai-brew-sequence-note')).toContainText(/Brew Sequence|Urutan Seduh/i);

  await page.getByTestId('ai-brew-result-tab-coach').click();
  await page.getByRole('button', { name: 'Explain Plan' }).click();
  await expect(page.getByText(/Mocked Response/i).first()).toBeVisible();
  await expect(page.getByText(/qa_e2e mocked response for UI flow validation/i).first()).toBeVisible();
});

test('ai brew discloses exact-profile provenance when a niche dripper now has a curated match', async ({ page }) => {
  await openAiBrewQuickMode(page);
  await page.getByTestId('ai-brew-dripper-picker').click();
  await page.getByLabel('Search AI Brew catalog').fill('Latina');
  await page.getByRole('button', { name: /Select dripper Latina Cono/i }).click();
  await expect(page.getByTestId('ai-brew-picker-dripper')).toHaveCount(0);

  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Fallback Brew');
  await switchAiBrewToManualWater(page, { tds: '88', hardness: '52', alkalinity: '38' });
  await page.getByTestId('ai-brew-generate').click();

  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText('Exact profile');
  await expect(result).toContainText(/Exact device profile matched: Latina Cono Hot\./i);
});

test('ai brew restores cached catalog and last plan when catalog assets are unavailable after warm load', async ({ page, context }) => {
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Offline Cache');
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toContainText('QA Offline Cache');
  await page.getByRole('button', { name: 'Close planned output' }).click();

  await page.route('**/data/ai-brew/**', async (route) => {
    await route.abort();
  });

  await page.goto('/tools', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('QA Offline Cache').first()).toBeVisible();
  await expect(page.getByTestId('ai-brew-open-result')).toBeVisible();

  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Offline Reload');
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toContainText('QA Offline Reload');
  await page.getByRole('button', { name: 'Close planned output' }).click();

  await context.setOffline(true);
  await openAiBrewQuickMode(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Offline Deterministic');
  await selectAiBrewWaterBrand(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();
  await expect(page.getByTestId('ai-brew-result')).toContainText('QA Offline Deterministic');
  await page.getByTestId('ai-brew-result-tab-coach').click();
  await expect(page.getByRole('button', { name: 'Explain Plan' })).toBeDisabled();
  await expect(page.getByText('AI coach is disabled while offline.')).toBeVisible();
  await context.setOffline(false);
});



