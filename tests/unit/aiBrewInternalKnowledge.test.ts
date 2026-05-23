import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadAiBrewCatalog } from '../../apps/web/src/features/ai-brew/catalog.ts';
import { buildAiAssistPrompt, buildSequenceGuidePrompt } from '../../apps/web/src/features/ai-brew/prompts.ts';
import type { AiBrewCatalog, BrewPlan, EquipmentCatalogEntry, ProcessCatalogEntry, VarietyCatalogEntry } from '../../apps/web/src/features/ai-brew/types.ts';

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

function assertInternalExpertDescription(entry: ProcessCatalogEntry | VarietyCatalogEntry) {
  assert.ok(entry.expertDescription, `${entry.id} should expose internal expertDescription`);
  assert.match(entry.expertDescription || '', /Extraction role:/, `${entry.id} should explain extraction role`);
  assert.match(entry.expertDescription || '', /Guardrail:/, `${entry.id} should carry a guardrail`);
  assert.doesNotMatch(entry.expertDescription || '', /\b100%\b|perfect result|guaranteed/i, `${entry.id} must not promise perfect results`);
}

test('AI Brew catalog normalizes internal expert guidance for every process, variety, and grinder', async () => {
  const catalog = await loadCatalogForTest();

  assert.ok(catalog.processes.length > 0);
  assert.ok(catalog.varieties.length > 0);
  assert.ok(catalog.grinders.length > 0);

  for (const entry of catalog.processes) assertInternalExpertDescription(entry);
  for (const entry of catalog.varieties) assertInternalExpertDescription(entry);

  for (const grinder of catalog.grinders) {
    assert.ok(grinder.expertDescription, `${grinder.id} should expose internal grinder expertDescription`);
    assert.match(grinder.expertDescription || '', /Burr\/setting role:/, `${grinder.id} should explain burr or setting behavior`);
    assert.match(grinder.expertDescription || '', /Calibration guardrail:/, `${grinder.id} should carry calibration guardrail`);
    assert.doesNotMatch(grinder.expertDescription || '', /\b100%\b|perfect result|guaranteed/i, `${grinder.id} must not promise perfect results`);
  }
});

function createPromptPlan(overrides: Partial<BrewPlan> = {}): BrewPlan {
  const grinder: EquipmentCatalogEntry = {
    id: 'prompt-grinder',
    kind: 'grinder',
    name: 'Prompt Grinder',
    brand: 'Prompt',
    typeLabel: 'Clicks (Internal)',
    searchText: 'prompt grinder clicks internal',
    description: 'Picker-visible description should not be required for hidden prompt context.',
    expertDescription: 'Burr/setting role: moderate fines require calm final pours. Calibration guardrail: confirm zero point and use taste feedback.',
    grindBands: { coarse: '28 - 34 clicks', medium: '18 - 24 clicks', fine: '8 - 12 clicks' },
    source: 'test',
    sourceUrls: ['https://example.com/grinder'],
    verificationLevel: 'curated',
    verifiedAt: '2026-05-23',
    popularityTier: 'specialty_common',
    marketSegment: 'specialty_mainstream',
    releaseStatus: 'established',
    confidence: 'medium',
    catalogVersion: 'test',
  };

  const processEntry: ProcessCatalogEntry = {
    id: 'prompt_process',
    label: 'Prompt Process',
    group: 'fermented',
    aliases: [],
    searchText: 'prompt process fermented',
    source: 'test',
    sourceUrls: ['https://example.com/process'],
    verificationLevel: 'curated',
    verifiedAt: '2026-05-23',
    popularityTier: 'emerging',
    marketSegment: 'specialty_mainstream',
    releaseStatus: 'new',
    confidence: 'medium',
    catalogVersion: 'test',
    notes: ['Process note for visible planner notes.'],
    expertDescription: 'Extraction role: aromatic, soluble process; keep agitation low. Guardrail: use taste feedback before extraction pressure increases.',
  };

  const varietyEntry: VarietyCatalogEntry = {
    id: 'prompt_variety',
    label: 'Prompt Variety',
    group: 'specialty-reference',
    aliases: [],
    searchText: 'prompt variety specialty',
    source: 'test',
    sourceUrls: ['https://example.com/variety'],
    verificationLevel: 'curated',
    verifiedAt: '2026-05-23',
    popularityTier: 'niche',
    marketSegment: 'small_market',
    releaseStatus: 'new',
    confidence: 'low',
    catalogVersion: 'test',
    notes: ['Variety note for visible planner notes.'],
    expertDescription: 'Extraction role: delicate aromatics and clarity potential. Guardrail: do not infer premium flavor without cup feedback.',
  };

  return {
    id: 'prompt_plan',
    fingerprint: 'prompt_plan',
    createdAt: Date.now(),
    catalogVersion: 'test',
    formState: {} as BrewPlan['formState'],
    brewMode: 'hot',
    methodFamily: 'v60',
    methodId: 'v60',
    ratioToolMethodId: 'v60',
    coffeeName: 'Prompt Coffee',
    process: 'Prompt Process',
    processEntry,
    variety: 'Prompt Variety',
    varietyEntry,
    roastLevel: 'light',
    beanProfile: {
      active: true,
      summary: 'light / low solubility',
      notes: [],
      roastDevelopment: 'underdeveloped',
      solubility: 'low',
    },
    targetProfileId: 'balance_clean',
    targetProfileLabel: 'Balance & Clean',
    dripper: {
      id: 'hario-v60',
      kind: 'dripper',
      name: 'Hario V60',
      typeLabel: 'Cone',
      searchText: 'hario v60',
      source: 'test',
      sourceUrls: ['https://example.com/v60'],
      verificationLevel: 'official',
      verifiedAt: '2026-05-23',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test',
      methodFamily: 'v60',
    },
    grinder,
    waterMode: 'manual',
    waterRegion: 'global',
    waterBrandId: '',
    waterBrandLabel: 'manual',
    waterPresetStatus: 'manual',
    waterPublishState: 'manual',
    waterIsBrewReady: true,
    waterBrewBlockReason: [],
    waterBrandMarkets: ['global'],
    waterBrandSourceUrls: [],
    waterCustomized: true,
    waterMinerals: { tdsPpm: 95, hardnessPpm: 50, alkalinityPpm: 35, styleLabel: 'balanced manual water' },
    waterGuidance: {} as BrewPlan['waterGuidance'],
    totalWaterMl: 250,
    hotWaterMl: 250,
    iceMl: 0,
    recommendedRatio: 15.6,
    finalBeverageRatio: 15.6,
    hotExtractionRatio: 15.6,
    hotWaterSharePercent: 100,
    iceSharePercent: 0,
    doseG: 16,
    waterTempC: 92,
    totalTimeSeconds: 170,
    estimatedCupOutputMl: 216,
    estimatedBrewOutputMl: 216,
    estimatedBeverageOutputMl: 216,
    grindBias: 'same',
    grindRecommendation: 'Starting grind: 21 clicks. Correction range: 19 to 23 clicks.',
    grindBandLabel: '18 - 24 clicks',
    summary: 'Prompt plan',
    steps: [
      { id: 'bloom', label: 'Bloom', startSeconds: 0, pourVolumeMl: 45, targetVolumeMl: 45, note: 'Wet all grounds.' },
      { id: 'pulse_1', label: 'Pulse 1', startSeconds: 40, pourVolumeMl: 95, targetVolumeMl: 140, note: 'Keep flow centered.' },
      { id: 'finish', label: 'Finish', startSeconds: 95, pourVolumeMl: 110, targetVolumeMl: 250, note: 'Settle bed gently.' },
    ],
    notes: [],
    warnings: [],
    extractionRationale: {} as BrewPlan['extractionRationale'],
    guardrails: { errors: [], warnings: [] },
    conformance: { warnings: [], standardsHits: [], standardsMisses: [] },
    deviceProfileId: 'profile_hario_v60_hot',
    deviceProfileLabel: 'Hario V60 Hot',
    deviceProfileMode: 'exact',
    grindSettingReference: '18 - 24 clicks',
    grindSettingMode: 'catalog_reference',
    grindSettingVerification: 'curated',
    fallbackUsed: false,
    provenanceAttentionNeeded: false,
    confidenceNotes: [],
    ...overrides,
  } as BrewPlan;
}

test('AI Brew prompts use hidden expert guidance without allowing raw UI exposure or perfect-result claims', () => {
  const plan = createPromptPlan();
  const sequencePrompt = buildSequenceGuidePrompt(plan, 'id').body;
  const assistPrompt = buildAiAssistPrompt('ai_assist_deep_analysis', plan, 'id').body;

  assert.match(sequencePrompt, /Expert Barista Background Notes/);
  assert.match(sequencePrompt, /do NOT show this section/i);
  assert.match(sequencePrompt, /Burr\/setting role: moderate fines/i);
  assert.match(sequencePrompt, /Extraction role: aromatic/i);
  assert.match(sequencePrompt, /Extraction role: delicate aromatics/i);
  assert.match(sequencePrompt, /Never promise 100%|Do not promise 100%/i);

  assert.match(assistPrompt, /Internal extraction guidance/i);
  assert.match(assistPrompt, /Burr\/setting role: moderate fines/i);
  assert.match(assistPrompt, /Extraction role: aromatic/i);
  assert.match(assistPrompt, /Do not expose internal|Jangan tampilkan/i);
  assert.match(assistPrompt, /Do not promise 100%|Jangan menjanjikan 100%/i);
});

test('AI Brew picker source keeps process and variety descriptions out of the visible UI list', () => {
  const panelSource = fs.readFileSync(path.join(ROOT, 'apps/web/src/features/ai-brew/AiBrewPanel.tsx'), 'utf8');

  assert.match(
    panelSource,
    /function buildProcessPickerOptions[\s\S]*?description: undefined,[\s\S]*?function buildVarietyPickerOptions/,
    'Process picker should not surface internal expert descriptions',
  );
  assert.match(
    panelSource,
    /function buildVarietyPickerOptions[\s\S]*?description: undefined,[\s\S]*?function buildEquipmentPickerOptions/,
    'Variety picker should not surface internal expert descriptions',
  );
});
