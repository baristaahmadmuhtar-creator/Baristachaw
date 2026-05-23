import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadAiBrewCatalog } from '../../apps/web/src/features/ai-brew/catalog.ts';
import {
  applyManualBrewPresetToFormState,
  buildAiBrewPlan,
  createDefaultAiBrewFormState,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import { buildAiAssistPrompt } from '../../apps/web/src/features/ai-brew/prompts.ts';
import type { AiBrewCatalog, AiBrewFormState, BrewPlan } from '../../apps/web/src/features/ai-brew/types.ts';

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

async function loadCatalogForTest(): Promise<AiBrewCatalog> {
  const restore = installCatalogFetch();
  try {
    return await loadAiBrewCatalog();
  } finally {
    restore();
  }
}

function applyPreset(catalog: AiBrewCatalog, presetId: string, overrides: Partial<AiBrewFormState> = {}) {
  const form = applyManualBrewPresetToFormState(
    { ...createDefaultAiBrewFormState(catalog), ...overrides },
    catalog,
    presetId,
  );
  return buildAiBrewPlan(form, catalog);
}

function positivePours(plan: BrewPlan) {
  return plan.steps.filter((step) => (step.pourVolumeMl || 0) > 0);
}

test('AI Brew manual brew preset catalog is safe, unique, and source-backed', async () => {
  const catalog = await loadCatalogForTest();
  const presets = catalog.manualBrewPresets || [];

  assert.equal(presets.length, 25, 'MVP should ship exactly 25 manual brew presets');
  assert.equal(new Set(presets.map((preset) => preset.id)).size, presets.length, 'Preset ids should be unique');
  assert.equal(new Set(presets.map((preset) => preset.safeLabel)).size, presets.length, 'Preset safe labels should be unique');
  assert.equal(presets.filter((preset) => preset.category === 'competition_inspired').length, 10);
  assert.equal(presets.filter((preset) => preset.category === 'global_classic').length, 10);
  assert.equal(presets.filter((preset) => preset.category === 'taste_target').length, 5);

  const dripperIds = new Set(catalog.drippers.map((dripper) => dripper.id));
  const targetProfileIds = new Set(catalog.targetProfiles.map((profile) => profile.id));
  for (const preset of presets) {
    assert.match(preset.safeLabel, /Inspired by|Style|Focus|Competition|Nordic|Fast|Classic|Ultimate|Better|Kyoto|Chemex|AeroPress|V60|OREA|Origami|Kalita/i);
    assert.doesNotMatch(preset.safeLabel, /\bofficial\b/i, `${preset.id} should not claim official ownership`);
    assert.ok(preset.sourceUrls.length > 0, `${preset.id} should keep source URLs`);
    assert.ok(preset.internalTips.length > 0, `${preset.id} should carry internal tips`);
    assert.ok(preset.guardrails.length > 0, `${preset.id} should carry guardrails`);
    assert.ok(targetProfileIds.has(preset.targetDefaults.targetProfileId), `${preset.id} target should resolve`);
    for (const dripperId of preset.supportedDripperIds) {
      assert.ok(dripperIds.has(dripperId), `${preset.id} supported dripper ${dripperId} should resolve`);
    }
    if (preset.originalBrewerId && !dripperIds.has(preset.originalBrewerId)) {
      assert.ok(preset.fallbackDripperId, `${preset.id} should provide fallback for unsupported original brewer`);
      assert.ok(dripperIds.has(preset.fallbackDripperId), `${preset.id} fallback dripper should resolve`);
      assert.match(preset.fallbackReason || '', /fallback|not currently in catalog|safe/i);
    }
    assert.doesNotMatch(JSON.stringify(preset), /\b100%\b|perfect result|guaranteed/i);
  }
});

test('AI Brew manual brew presets prefill form state without generating automatically', async () => {
  const catalog = await loadCatalogForTest();
  const base = createDefaultAiBrewFormState(catalog);
  const next = applyManualBrewPresetToFormState(base, catalog, 'inspired-tetsu-kasuya-46');

  assert.equal(next.manualPresetId, 'inspired-tetsu-kasuya-46');
  assert.equal(next.dripperId, 'hario-v60');
  assert.equal(next.targetProfileId, 'more_sweetness');
  assert.equal(next.pourCount, '5');
  assert.equal(next.waterMode, 'manual');
  assert.ok(Number.parseFloat(next.targetWaterMl) > 0);
  assert.ok(Number.parseFloat(next.targetTempC) > 0);
  assert.equal(base.manualPresetId, undefined, 'base form should remain untouched');
});

test('AI Brew manual brew preset remains attached when users edit numeric prefill fields', () => {
  const panelSource = fs.readFileSync(path.join(ROOT, 'apps/web/src/features/ai-brew/AiBrewPanel.tsx'), 'utf8');
  const controlledSet = panelSource.match(/const MANUAL_PRESET_CONTROLLED_FIELDS[\s\S]*?\]\);/)?.[0] || '';

  assert.doesNotMatch(controlledSet, /'doseG'/, 'Dose edits should not detach the preset starting point');
  assert.doesNotMatch(controlledSet, /'targetWaterMl'/, 'Water edits should not detach the preset starting point');
  assert.doesNotMatch(controlledSet, /'targetTempC'/, 'Temperature edits should not detach the preset starting point');
  assert.match(controlledSet, /'dripperId'/, 'Brewer changes should still detach incompatible preset identity');
  assert.match(controlledSet, /'pourCount'/, 'Pour-count changes should detach technique-pattern identity');
});

test('AI Brew manual brew preset technique patterns affect planner steps inside guardrails', async () => {
  const catalog = await loadCatalogForTest();

  const tetsu = applyPreset(catalog, 'inspired-tetsu-kasuya-46');
  assert.equal(tetsu.manualPresetId, 'inspired-tetsu-kasuya-46');
  assert.equal(positivePours(tetsu).length, 5, 'Tetsu 4:6 preset should create five positive pours');
  assert.match(tetsu.notes.join('\n'), /4:6|Kasuya/i);

  const martin = applyPreset(catalog, 'inspired-martin-woelfl-orea-v4');
  assert.equal(martin.dripper.id, 'orea-v3-v4');
  assert.equal(positivePours(martin).length, 4, 'Martin OREA preset should create four flat-bottom pours');
  assert.match(martin.notes.join('\n'), /flat-bottom|OREA|fast/i);

  const carlos = applyPreset(catalog, 'inspired-carlos-medina-origami');
  const carlosPours = positivePours(carlos);
  assert.equal(carlos.dripper.id, 'origami-dripper-s-m');
  assert.equal(carlosPours.length, 5, 'Carlos Origami preset should create five equal pours');
  const volumes = carlosPours.map((step) => step.pourVolumeMl || 0);
  assert.ok(Math.max(...volumes) - Math.min(...volumes) <= 10, 'Carlos equal-pour volumes should stay near-even');

  const lance = applyPreset(catalog, 'lance-style-two-pour-v60');
  assert.equal(positivePours(lance).length, 2, 'Lance preset should create a long bloom plus one extraction pour');

  const fast = applyPreset(catalog, 'fast-brew');
  const baseline = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    dripperId: fast.dripper.id,
    grinderId: fast.grinder.id,
    waterMode: 'manual',
    waterCustomized: true,
    waterTdsPpm: '90',
    waterHardnessPpm: '50',
    waterAlkalinityPpm: '35',
    targetProfileId: 'balance_clean',
  }, catalog);
  assert.ok(fast.totalTimeSeconds < baseline.totalTimeSeconds, 'Fast Brew should shorten the baseline safely');
  assert.ok(fast.totalTimeSeconds >= 120, 'Fast Brew should not become an unsafe ultra-short filter recipe');
});

test('AI Brew manual brew preset guidance is hidden in prompts and not exposed through process or variety pickers', async () => {
  const catalog = await loadCatalogForTest();
  const plan = applyPreset(catalog, 'inspired-tetsu-kasuya-46');
  const prompt = buildAiAssistPrompt('ai_assist_deep_analysis', plan, 'id').body;

  assert.match(prompt, /Manual brew preset guidance/i);
  assert.match(prompt, /Tetsu|4:6/i);
  assert.match(prompt, /Do not expose internal|Jangan tampilkan/i);
  assert.match(prompt, /Do not promise 100%|Jangan menjanjikan 100%/i);

  const panelSource = fs.readFileSync(path.join(ROOT, 'apps/web/src/features/ai-brew/AiBrewPanel.tsx'), 'utf8');
  assert.match(panelSource, /data-testid="ai-brew-manual-preset-panel"/);
  assert.match(panelSource, /Manual Brew Presets|manualPresetTitle/);
  assert.doesNotMatch(
    panelSource.match(/function buildProcessPickerOptions[\s\S]*?function buildVarietyPickerOptions/)?.[0] || '',
    /extractionProfile|expertDescription/,
    'Process picker must not expose internal profile text',
  );
  assert.doesNotMatch(
    panelSource.match(/function buildVarietyPickerOptions[\s\S]*?function buildEquipmentPickerOptions/)?.[0] || '',
    /extractionProfile|expertDescription/,
    'Variety picker must not expose internal profile text',
  );
});
