import { test, expect, type APIRequestContext, type Locator } from '@playwright/test';
import type { BrewPlan } from '../../apps/web/src/features/ai-brew/types';
import { qaLogin as qaLoginBase, qaLogout } from '../fixtures/auth';
import { buildQaUser } from '../fixtures/test-data';
import { mockAiApis } from '../helpers/network';
import { clearClientState } from '../helpers/cleanup';

test.describe.configure({ timeout: 180_000 });

const LAST_PLAN_STORAGE_KEY = 'BARISTACHAW_AI_BREW_LAST_PLAN_V5';

async function qaLogin(request: APIRequestContext) {
  await qaLoginBase(request, buildQaUser({ planCode: 'starter' }));
}

test.afterEach(async ({ page }) => {
  await qaLogout(page.request);
});

async function openQuickBuilder(page: import('@playwright/test').Page) {
  await page.goto('/tools');
  await clearClientState(page);
  await page.goto('/tools', { waitUntil: 'domcontentloaded' });
  const quickBuilderTrigger = page.getByTestId('ai-brew-open-quick');
  await expect(quickBuilderTrigger).toBeVisible();
  await expect(quickBuilderTrigger).toBeEnabled({ timeout: 60_000 });
  await quickBuilderTrigger.click();
  await expect(page.getByTestId('ai-brew-builder-quick')).toBeVisible({ timeout: 60_000 });
}

async function openProBuilder(page: import('@playwright/test').Page) {
  await page.goto('/tools');
  await clearClientState(page);
  await page.goto('/tools', { waitUntil: 'domcontentloaded' });
  const proBuilderTrigger = page.getByTestId('ai-brew-open-pro');
  await expect(proBuilderTrigger).toBeVisible();
  await expect(proBuilderTrigger).toBeEnabled({ timeout: 60_000 });
  await proBuilderTrigger.click();
  await expect(page.getByTestId('ai-brew-builder-pro')).toBeVisible({ timeout: 60_000 });
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

async function pickWater(page: import('@playwright/test').Page, query: string, id: string) {
  await page.getByTestId('ai-brew-water-picker').click();
  await page.getByTestId('ai-brew-picker-search-water_brand').fill(query);
  await page.getByTestId(`ai-brew-picker-option-water_brand-${id}`).first().click();
}

async function readStoredPlan(page: import('@playwright/test').Page): Promise<BrewPlan> {
  const raw = await page.evaluate((storageKey) => localStorage.getItem(storageKey), LAST_PLAN_STORAGE_KEY);
  if (!raw) {
    throw new Error('Missing stored AI Brew plan in localStorage.');
  }

  const parsed = JSON.parse(raw) as { payload?: BrewPlan };
  if (!parsed?.payload?.id || !Array.isArray(parsed.payload.steps)) {
    throw new Error('Stored AI Brew plan is malformed.');
  }

  return parsed.payload;
}

function readStoredSequenceMarkdown(plan: BrewPlan) {
  return plan.aiNotes.sequenceCanonical || plan.aiNotes.sequence || '';
}

function readStoredSequenceServicePattern(plan: BrewPlan) {
  return (plan.aiNotes.sequenceServicePattern || []).join('\n');
}

function readStoredSequenceWatch(plan: BrewPlan) {
  return (plan.aiNotes.sequenceWatch || []).join('\n');
}

function formatPlanTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

async function expectCanonicalSequencePrefixes(sequenceNote: Locator) {
  const plan = await readStoredPlan(sequenceNote.page());
  await expect(sequenceNote.locator('[data-testid^="ai-brew-step-card-"]')).toHaveCount(plan.steps.length);
  for (const [index, step] of plan.steps.entries()) {
    const stepCard = sequenceNote.getByTestId(`ai-brew-step-card-${index + 1}`);
    const kind = step.kind || 'pour';
    if (kind === 'pour') {
      await expect(stepCard).toContainText(`+${step.pourVolumeMl} ml`);
    } else {
      await expect(stepCard).toContainText(kind === 'release' ? /Lepas|Release/i : kind === 'drawdown' ? /Drawdown/i : /Tahan|Wait/i);
    }
    await expect(stepCard).toContainText(formatPlanTime(step.startSeconds));
    await expect(stepCard).toContainText(String(step.targetVolumeMl));
    await expect(stepCard.getByTestId(`ai-brew-step-detail-${index + 1}`)).toContainText(/Detail tambahan|Extra detail/i);
  }
}

async function clickTargetProfile(
  page: import('@playwright/test').Page,
  mode: 'quick' | 'pro',
  label: 'More Body' | 'More Acidity',
) {
  const activeMode = await page.evaluate((preferredMode) => {
    const orderedModes = [preferredMode, preferredMode === 'quick' ? 'pro' : 'quick'] as const;
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    for (const candidate of orderedModes) {
      const builder = document.querySelector<HTMLElement>(`[data-testid="ai-brew-builder-${candidate}"]`);
      if (builder && builder.offsetParent !== null && activeElement && builder.contains(activeElement)) {
        return candidate;
      }
    }

    for (const candidate of orderedModes) {
      const builder = document.querySelector<HTMLElement>(`[data-testid="ai-brew-builder-${candidate}"]`);
      if (builder && builder.offsetParent !== null) {
        return candidate;
      }
    }

    return null;
  }, mode);

  if (!activeMode) {
    throw new Error('No active AI Brew builder is visible.');
  }

  const labelPattern = label === 'More Body'
    ? /^(More Body|Body Lebih Tebal)\b/i
    : /^(More Acidity|Lebih Cerah)\b/i;

  await page
    .getByTestId(`ai-brew-builder-${activeMode}`)
    .getByRole('button', { name: labelPattern })
    .click();
}

async function expectDefaultHotDeterministicSequence(sequenceNote: Locator) {
  const plan = await readStoredPlan(sequenceNote.page());
  const result = sequenceNote.page().getByTestId('ai-brew-result');
  await expect(sequenceNote).toContainText(/Brew Sequence|Urutan Seduh/i);
  await expect(result).toContainText(`${plan.doseG} g`);
  await expect(result).toContainText(`${plan.totalWaterMl} ml`);
  await expect(result).toContainText(formatPlanTime(plan.totalTimeSeconds));
  await expect(result).toContainText(String(plan.waterTempC));
  await expectCanonicalSequencePrefixes(sequenceNote);
}

test('ai brew auto sequence keeps deterministic operational steps when mocked AI is generic', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});

test('ai brew auto sequence keeps deterministic sequence when AI responses timeout', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: true, text: 'Request timed out after 30s. Please try again.' }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Timeout Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});


test('ai brew auto sequence falls back when mocked AI mixes conflicting method cues', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60 and Chemex profile.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance target with Volvic water and wait for bed expansion.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance target with bean roast context and level gently.',
            '## Watch',
            '- Keep V60 flow stable for balance target while avoiding Chemex bypass.',
            '- Keep Volvic mineral behavior and bean context stable.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Method-Conflict Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});


test('ai brew auto sequence falls back when AI references unsupported hardware tooling', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and use AeroPress plunger pressure to push flow.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
            '## Watch',
            '- Keep V60 flow stable for balance target and Volvic water.',
            '- Keep bean and water constraints stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Unsupported Hardware Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});
test('ai brew iced sequence falls back when AI omits explicit hot-ice split pairing', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string; prompt?: string };
    if (body.action === 'fast') {
      const prompt = body.prompt || '';
      const dripper = /Dripper:\s*(.+)/i.exec(prompt)?.[1]?.trim() || 'Hario V60';
      const targetProfile = /Target profile:\s*(.+)/i.exec(prompt)?.[1]?.trim() || 'Balance & Clean';
      const waterBrand = /Water brand:\s*(.+)/i.exec(prompt)?.[1]?.trim() || 'Volvic';
      const iceMl = /- ice:\s*(\d+(?:\.\d+)?)\s*ml/i.exec(prompt)?.[1] || '100';
      const stepLines = Array.from(prompt.matchAll(/^(\d+)\.\s+(.+?)\s+at\s+(\d{2}:\d{2}):\s+pour\s+(\d+(?:\.\d+)?)\s+ml\s+to\s+(\d+(?:\.\d+)?)\s+ml\./gim));

      const sequence = stepLines.slice(0, 3).map((entry) => {
        const index = entry[1];
        const label = entry[2];
        const time = entry[3];
        const pour = entry[4];
        const target = entry[5];
        const tail = index === '3'
          ? `for ${dripper} ${targetProfile} with ${waterBrand} water, then level gently before adding ${iceMl} ml ice.`
          : `for ${dripper} ${targetProfile} with ${waterBrand} water and hold stream calm.`;
        return `${index}. ${label} at ${time}: pour ${pour} ml to ${target} ml ${tail}`;
      });

      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            `- Balanced Cone Clarity Arc for ${dripper}.`,
            `- Iced mode active with ${waterBrand} constraints and ${targetProfile} target.`,
            '## Sequence',
            ...sequence,
            '## Watch',
            `- Keep ${dripper} flow stable for ${targetProfile} with ${waterBrand} water.`,
            '- Keep bean and water constraints stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await page.getByTestId('ai-brew-builder-mode-iced').click();
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Iced Split Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  const plan = await readStoredPlan(page);
  const result = page.getByTestId('ai-brew-result');
  await expect(result).toContainText(`${plan.hotWaterMl} ml`);
  await expect(result).toContainText(`${plan.iceMl} ml`);
  await expectCanonicalSequencePrefixes(sequenceNote);
});


test('ai brew auto sequence falls back when AI wait timing exceeds deterministic cadence', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for 95 seconds before next pulse.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance target with Volvic water and hold stream calm.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
            '## Watch',
            '- Keep V60 flow stable for balance target and Volvic water.',
            '- Keep bean and water constraints stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Cadence Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});

test('ai brew auto sequence falls back when AI repeats one template shell across all steps', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and hold stream calm before bed settle.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm before bed settle.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with Volvic water and hold stream calm before bed settle.',
            '## Watch',
            '- Keep Hario V60 flow stable for balance target with Volvic water.',
            '- Keep bean roast and mineral context stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Template-Shell Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});

test('ai brew auto sequence falls back when AI changes brew parameters mid-sequence', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and raise temperature to 95 C before next pulse.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
            '## Watch',
            '- Keep V60 flow stable for balance target and Volvic water.',
            '- Keep bean and water constraints stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Mid-Run Shift Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});

test('ai brew auto sequence falls back when AI chains second pour checkpoint inside one step', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water, then pour 15 ml to 165 ml before leveling.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
            '## Watch',
            '- Keep V60 flow stable for balance target and Volvic water.',
            '- Keep bean and water constraints stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Multi-Pour Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});


test('ai brew auto sequence falls back when step 1 carries closure-phase wording', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and finish drawdown quickly before pulse start.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
            '## Watch',
            '- Keep V60 flow stable for balance target and Volvic water.',
            '- Keep bean and water constraints stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Phase Intent Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});



test('ai brew auto sequence repairs weak watch section while preserving valid AI steps', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Start pour and wait for bloom expansion while keeping flow calm.',
            '2. Continue pour with centered cadence and hold stream steady for target profile.',
            '3. Finish the main pour calmly with spiral-lock settling for clean drawdown.',
            '4. Let drawdown finish cleanly while keeping the cup profile locked.',
            '## Watch',
            '- Keep flow stable.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Partial Repair');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectCanonicalSequencePrefixes(sequenceNote);
  const plan = await readStoredPlan(page);
  expect(readStoredSequenceServicePattern(plan)).toMatch(/Balanced Cone Clarity Arc for Hario V60/i);
  expect(readStoredSequenceWatch(plan)).toMatch(/Keep final envelope locked:/i);
});

test('ai brew auto sequence falls back when AI uses hedging language in sequence steps', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm if required by drawdown feel.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
            '## Watch',
            '- Keep Hario V60 flow stable for balance target with Volvic water.',
            '- Keep bean roast and mineral context stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Hedging Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});

test('ai brew auto sequence normalizes safe free-form AI steps into deterministic checkpoints', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Start pour and wait for bloom expansion while keeping flow calm.',
            '2. Continue pour with centered cadence and hold stream steady for target profile.',
            '3. Finish the main pour calmly and settle the bed for clean drawdown.',
            '4. Let drawdown finish cleanly while keeping the cup profile locked.',
            '## Watch',
            '- Keep flow stable.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Step Normalization Repair');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectCanonicalSequencePrefixes(sequenceNote);
  const plan = await readStoredPlan(page);
  expect(readStoredSequenceMarkdown(plan)).toMatch(/1\.\s+Bloom at 00:00:/i);
  expect(readStoredSequenceMarkdown(plan)).toMatch(/4\.\s+Finish at/i);
});



test('ai brew auto sequence repairs non-canonical deterministic prefix formatting from AI', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom: pour 42 ml to 42 ml at 00:00 for Hario V60 balance profile with Volvic water and wait for bed expansion.',
            '2. Second Pour: pour 86 ml to 128 ml at 00:30 for Hario V60 balance profile with Volvic water and hold stream calm.',
            '3. Final Pour: pour 89 ml to 217 ml at 01:10 for Hario V60 balance profile with bean roast context and settle bed.',
            '4. Finish: pour 23 ml to 240 ml at 02:12 for Hario V60 balance profile with bean roast context and drawdown settle.',
            '## Watch',
            '- Keep Hario V60 flow stable for balance target with Volvic water.',
            '- Keep bean roast and mineral context stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Prefix Normalization Repair');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectCanonicalSequencePrefixes(sequenceNote);
});

test('ai brew auto sequence repairs shifted deterministic timestamps from AI back to planner checkpoints', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:10: pour 42 ml to 42 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
            '2. Second Pour at 00:35: pour 86 ml to 128 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
            '3. Final Pour at 01:05: pour 89 ml to 217 ml for Hario V60 balance profile with bean roast context and settle bed.',
            '4. Finish at 02:05: pour 23 ml to 240 ml for Hario V60 balance profile with bean roast context and drawdown settle.',
            '## Watch',
            '- Keep Hario V60 flow stable for balance target with Volvic water.',
            '- Keep bean roast and mineral context stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Timestamp Checkpoint Repair');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectCanonicalSequencePrefixes(sequenceNote);
});

test('ai brew auto sequence falls back when AI injects extra absolute clock time inside step tails', async ({ page }) => {

  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion until 00:25.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm until 01:10.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed by 02:10.',
            '## Watch',
            '- Keep Hario V60 flow stable for balance target with Volvic water.',
            '- Keep bean roast and mineral context stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Extra Clock Tail Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});
test('ai brew auto sequence falls back when balanced target drifts into body-only operational cues', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and hold heavier body texture from entry.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and keep syrupy depth through middle cadence.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and close with weighty body finish.',
            '## Watch',
            '- Keep V60 flow stable for balance target and Volvic water.',
            '- Keep bean and water constraints stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Balanced Drift Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});

test('ai brew auto sequence repairs conflicting method cues in support sections without full fallback', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string; prompt?: string };
    if (body.action === 'fast') {
      const prompt = body.prompt || '';
      const dripper = /Dripper:\s*(.+)/i.exec(prompt)?.[1]?.trim() || 'Hario V60';
      const targetProfile = /Target profile:\s*(.+)/i.exec(prompt)?.[1]?.trim() || 'Balance & Clean';
      const waterBrand = /Water brand:\s*(.+)/i.exec(prompt)?.[1]?.trim() || 'Volvic';
      const stepLines = Array.from(prompt.matchAll(/^(\d+)\.\s+(.+?)\s+at\s+(\d{2}:\d{2}):\s+pour\s+(\d+(?:\.\d+)?)\s+ml\s+to\s+(\d+(?:\.\d+)?)\s+ml\./gim));

      const sequence = stepLines.map((entry) => {
        const index = entry[1];
        const label = entry[2];
        const time = entry[3];
        const pour = entry[4];
        const target = entry[5];
        const tail = index === '2'
          ? `for ${dripper} ${targetProfile} with ${waterBrand} water and spiral-lock cadence control.`
          : `for ${dripper} ${targetProfile} with ${waterBrand} water and hold stream calm.`;
        return `${index}. ${label} at ${time}: pour ${pour} ml to ${target} ml ${tail}`;
      });

      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            `- Balanced Cone Clarity Arc for ${dripper} and Chemex profile.`,
            `- Hot mode active with ${waterBrand} constraints.`,
            '## Sequence',
            ...sequence,
            '## Watch',
            `- Keep ${dripper} flow stable for ${targetProfile} with ${waterBrand} water.`,
            '- Keep bean and water constraints stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Method Cue Repair');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectCanonicalSequencePrefixes(sequenceNote);
  const plan = await readStoredPlan(page);
  expect(readStoredSequenceServicePattern(plan)).toMatch(/Balanced Cone Clarity Arc for Hario V60/i);
  expect(readStoredSequenceServicePattern(plan)).not.toMatch(/Chemex profile/i);
});

test('ai brew auto sequence falls back when body target mixes conflicting acidity cues in AI steps', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Depth Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 body profile with Volvic water and keep body depth while preserving bright clarity.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 body profile with Volvic water and hold syrupy texture while pushing crisp acidity.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 body profile with bean roast context and close with heavier body plus bright finish.',
            '## Watch',
            '- Keep V60 flow stable for body target and Volvic water.',
            '- Keep bean and water constraints stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Body Conflict Fallback');
  await clickTargetProfile(page, 'quick', 'More Body');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});

test('ai brew auto sequence falls back when one body-target step mixes opposing taste cues', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Depth Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 body profile with Volvic water and keep syrupy body while preserving bright clarity.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 body profile with Volvic water and hold deeper texture through mid extraction.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 body profile with bean roast context and close with fuller mouthfeel.',
            '## Watch',
            '- Keep V60 flow stable for body target and Volvic water.',
            '- Keep bean and water constraints stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Single-Line Body Conflict');
  await clickTargetProfile(page, 'quick', 'More Body');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});
















test('ai brew auto sequence falls back when AI injects post-brew dilution top-up instruction', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and add 20 ml hot water as bypass top-up before serving.',
            '## Watch',
            '- Keep Hario V60 flow stable for balance target with Volvic water.',
            '- Keep bean roast and mineral context stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Dilution Topup Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});
test('ai brew auto sequence falls back when AI injects next-cup troubleshooting inside step lines', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and if sour on the next cup tighten grind by 0.5 step.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
            '## Watch',
            '- Keep Hario V60 flow stable for balance target with Volvic water.',
            '- Keep bean roast and mineral context stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Next-Cup Step Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});


test('ai brew deterministic sequence changes checkpoint timeline across target contexts', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Timeline Context Shift');
  await pickWater(page, 'volvic', 'volvic-sg');

  await page.getByTestId('ai-brew-generate').click();
  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  const baselinePlan = await readStoredPlan(page);
  const baselineTimes = baselinePlan.steps.map((step) => step.startSeconds);
  const baselinePours = baselinePlan.steps.map((step) => `${step.pourVolumeMl}->${step.targetVolumeMl}`);
  await expect(baselineTimes.length).toBeGreaterThan(2);
  await expect(baselinePours.length).toBeGreaterThan(2);

  await page.getByRole('button', { name: /Edit input|Edit inputs|Ubah input/i }).click();
  await clickTargetProfile(page, 'quick', 'More Body');
  await page.getByTestId('ai-brew-generate').click();
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  const bodyPlan = await readStoredPlan(page);
  const bodyTimes = bodyPlan.steps.map((step) => step.startSeconds);
  const bodyPours = bodyPlan.steps.map((step) => `${step.pourVolumeMl}->${step.targetVolumeMl}`);
  await expect(bodyTimes.length).toBeGreaterThan(2);
  await expect(bodyPours.length).toBeGreaterThan(2);
  await expect(bodyTimes).not.toEqual(baselineTimes);
  await expect(bodyPours).not.toEqual(baselinePours);
});




test('ai brew deterministic sequence changes pour-map structure across bean extraction contexts', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await openProBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Bean Context Shift');
  await pickWater(page, 'volvic', 'volvic-sg');

  await page.getByTestId('ai-brew-generate').click();
  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  const baselinePlan = await readStoredPlan(page);
  const baselinePours = baselinePlan.steps.map((step) => step.pourVolumeMl);
  const baselineShares = baselinePlan.steps.map((step) => step.pourVolumeMl / baselinePlan.hotWaterMl);
  await expect(baselinePours.length).toBeGreaterThan(2);

  await page.getByRole('button', { name: 'Edit inputs' }).click();
  await page.getByTestId('ai-brew-bean-profile-toggle').click();
  await page.getByTestId('ai-brew-bean-roast-underdeveloped').click();
  await page.getByTestId('ai-brew-bean-solubility-low').click();
  await page.getByTestId('ai-brew-generate').click();
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  const resistantPlan = await readStoredPlan(page);
  const resistantPours = resistantPlan.steps.map((step) => step.pourVolumeMl);
  const resistantShares = resistantPlan.steps.map((step) => step.pourVolumeMl / resistantPlan.hotWaterMl);

  await expect(resistantPours.length).toBeGreaterThan(2);
  await expect(resistantPours).not.toEqual(baselinePours);
  await expect(resistantShares[0]).toBeLessThan(baselineShares[0]);
  await expect(resistantShares[resistantShares.length - 1]).toBeGreaterThan(baselineShares[baselineShares.length - 1]);
});
test('ai brew auto sequence falls back when AI conflicts with easy extraction pressure profile', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 balance profile with Volvic water and extend contact time before the next pulse.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 balance profile with Volvic water and keep flow calm.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 balance profile with bean roast context and settle bed.',
            '## Watch',
            '- Keep Hario V60 flow stable for balance target with Volvic water.',
            '- Keep bean roast and mineral context stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openProBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Extraction-Pressure Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-bean-profile-toggle').click();
  await page.getByTestId('ai-brew-bean-roast-developed').click();
  await page.getByTestId('ai-brew-bean-solubility-high').click();
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});

test('ai brew auto sequence falls back when AI hold distribution conflicts with deterministic cadence profile', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Bright Cone Clarity Arc for Hario V60 and acidity target.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 60 ml to 60 ml for Hario V60 acidity target with hard-water context and wait for 55 seconds before next pulse.',
            '2. Pulse 1 at 00:40: pour 90 ml to 150 ml for Hario V60 acidity target with bean roast context and hold for 5 seconds to keep flow calm.',
            '3. Pulse 2 at 01:30: pour 120 ml to 270 ml for Hario V60 acidity target with Volvic water context and wait for 5 seconds before serving.',
            '## Watch',
            '- Keep Hario V60 flow stable for acidity target with Volvic water.',
            '- Keep ratio and total time locked for this bean roast context.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openProBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Cadence-Profile Fallback');
  await pickWater(page, 'volvic', 'volvic-sg');
  await clickTargetProfile(page, 'pro', 'More Acidity');
  await page.getByTestId('ai-brew-bean-profile-toggle').click();
  await page.getByTestId('ai-brew-bean-roast-underdeveloped').click();
  await page.getByTestId('ai-brew-bean-solubility-low').click();
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectDefaultHotDeterministicSequence(sequenceNote);
});

test('ai brew auto sequence repairs generic service pattern while preserving valid AI steps', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Default pattern for this brew.',
            '- Do the run as usual.',
            '## Sequence',
            '1. Bloom at 00:00: pour 50 ml to 50 ml for Hario V60 balance profile with Volvic water and wait for bloom expansion.',
            '2. Second Pour at 00:30: pour 70 ml to 120 ml for Hario V60 balance profile with Volvic water and hold stream cadence stable.',
            '3. Final Pour at 01:15: pour 80 ml to 200 ml for Hario V60 balance profile with Volvic water and keep bed level calm.',
            '4. Finish at 02:30: pour 0 ml to 200 ml for Hario V60 balance profile with bean roast context and quiet spiral-lock settling.',
            '## Watch',
            '- Keep Hario V60 flow stable for balance target with Volvic water.',
            '- Keep bean roast and mineral context stable through extraction.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Service Pattern Repair');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectCanonicalSequencePrefixes(sequenceNote);
  const plan = await readStoredPlan(page);
  expect(readStoredSequenceServicePattern(plan)).toMatch(/Balanced Cone Clarity Arc for Hario V60/i);
  expect(readStoredSequenceServicePattern(plan)).not.toMatch(/Default pattern for this brew/i);
});



test('ai brew auto sequence repairs watch section without deterministic envelope checkpoint anchors', async ({ page }) => {
  await qaLogin(page.request);
  await mockAiApis(page);

  await page.route('**/api/ai', async (route) => {
    const body = (route.request().postDataJSON() || {}) as { action?: string };
    if (body.action === 'fast') {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          text: [
            '## Service Pattern',
            '- Balanced Cone Clarity Arc for Hario V60 balance profile.',
            '- Hot mode active with Volvic constraints.',
            '## Sequence',
            '1. Bloom at 00:00: pour 42 ml to 42 ml for Hario V60 balance profile with Volvic water and wait for bed expansion.',
            '2. Second Pour at 00:30: pour 86 ml to 128 ml for Hario V60 balance profile with Volvic water and hold stream calm.',
            '3. Final Pour at 01:10: pour 89 ml to 217 ml for Hario V60 balance profile with bean roast context and spiral-lock settling.',
            '4. Finish at 02:12: pour 23 ml to 240 ml for Hario V60 balance profile with bean roast context and drawdown settle.',
            '## Watch',
            '- Monitor Hario V60 flow for the balance target profile through each pulse.',
            '- Track drawdown behavior and keep extraction calm for this target.',
          ].join('\n'),
        }),
      });
      return;
    }
    await route.continue();
  });

  await openQuickBuilder(page);
  await setVisibleInputValue(page, 'ai-brew-coffee-name', 'QA Hybrid Watch Envelope Repair');
  await pickWater(page, 'volvic', 'volvic-sg');
  await page.getByTestId('ai-brew-generate').click();

  const sequenceNote = page.getByTestId('ai-brew-sequence-note');
  await expect(sequenceNote).toBeVisible({ timeout: 60_000 });
  await expectCanonicalSequencePrefixes(sequenceNote);
  const plan = await readStoredPlan(page);
  expect(readStoredSequenceWatch(plan)).toMatch(/Keep final envelope locked:/i);
});
