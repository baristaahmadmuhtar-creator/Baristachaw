import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { validateBrewPlanOutput } from '../../apps/web/src/features/ai-brew/antiHallucination.ts';
import { loadAiBrewCatalog } from '../../apps/web/src/features/ai-brew/catalog.ts';
import {
  applyManualBrewPresetToFormState,
  buildAiBrewPlan,
  createDefaultAiBrewFormState,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import type { AiBrewCatalog, BrewPlan } from '../../apps/web/src/features/ai-brew/types.ts';

const ROOT = process.cwd();

function installCatalogFetch() {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    const filePath = url.startsWith('/data/')
      ? path.join(ROOT, 'apps/web/public', url)
      : path.join(ROOT, url);
    const body = await fs.promises.readFile(filePath, 'utf8');
    return {
      ok: true,
      json: async () => JSON.parse(body),
    } as Response;
  }) as typeof fetch;
  return () => {
    globalThis.fetch = previousFetch;
  };
}

async function buildTetsuPlan(): Promise<BrewPlan> {
  const restore = installCatalogFetch();
  try {
    const catalog: AiBrewCatalog = await loadAiBrewCatalog();
    const form = applyManualBrewPresetToFormState(
      createDefaultAiBrewFormState(catalog),
      catalog,
      'inspired-tetsu-kasuya-2026-ten-pour',
    );
    return buildAiBrewPlan(form, catalog);
  } finally {
    restore();
  }
}

function clonePlan(plan: BrewPlan): BrewPlan {
  return structuredClone(plan) as BrewPlan;
}

test('strict AI Brew plan integrity accepts a valid 10-pour plan', async () => {
  const plan = await buildTetsuPlan();
  const result = validateBrewPlanOutput(plan);

  assert.equal(result.allowed, true, result.reason || 'valid plan should pass');
});

test('strict AI Brew plan integrity blocks non-finite and negative step values', async () => {
  const plan = clonePlan(await buildTetsuPlan());
  plan.steps[2] = {
    ...plan.steps[2],
    pourVolumeMl: Number.NaN,
    targetVolumeMl: -10,
  };

  const result = validateBrewPlanOutput(plan);

  assert.equal(result.allowed, false);
  assert.match(result.reason || '', /steps\[2\]\.pourVolumeMl is not finite/);
  assert.match(result.reason || '', /steps\[2\]\.targetVolumeMl cannot be negative/);
});

test('strict AI Brew plan integrity blocks impossible ratios and negative water', async () => {
  const plan = clonePlan(await buildTetsuPlan());
  plan.hotWaterMl = -1;
  plan.finalBeverageRatio = 99;
  plan.hotExtractionRatio = 0;

  const result = validateBrewPlanOutput(plan);

  assert.equal(result.allowed, false);
  assert.match(result.reason || '', /hotWaterMl cannot be negative/);
  assert.match(result.reason || '', /finalBeverageRatio is outside practical bounds/);
  assert.match(result.reason || '', /hotExtractionRatio is outside practical bounds/);
});

test('strict AI Brew plan integrity blocks non-monotonic cumulative targets', async () => {
  const plan = clonePlan(await buildTetsuPlan());
  plan.steps[4] = {
    ...plan.steps[4],
    targetVolumeMl: 40,
  };

  const result = validateBrewPlanOutput(plan);

  assert.equal(result.allowed, false);
  assert.match(result.reason || '', /cumulative target must be monotonic/);
});

test('strict AI Brew plan integrity blocks workflow guides that drop source pour IDs', async () => {
  const plan = clonePlan(await buildTetsuPlan());
  plan.workflowGuideSteps = (plan.workflowGuideSteps || []).filter((step) => (
    !(step.sourceStepIds || []).includes('pulse_4')
  ));

  const result = validateBrewPlanOutput(plan);

  assert.equal(result.allowed, false);
  assert.match(result.reason || '', /workflow guide missing source step pulse_4/);
});
