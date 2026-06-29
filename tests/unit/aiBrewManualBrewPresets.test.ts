import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadAiBrewCatalog } from '../../apps/web/src/features/ai-brew/catalog.ts';
import {
  applyManualBrewPresetToFormState,
  buildAiBrewPlan,
  createDefaultAiBrewFormState,
  createQuickAiBrewFormState,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import { buildAiAssistPrompt } from '../../apps/web/src/features/ai-brew/prompts.ts';
import { getManualPresetDisplayCopy } from '../../apps/web/src/features/ai-brew/manualPresetLocalization.ts';
import { resolveManualPresetChange } from '../../apps/web/src/features/ai-brew/manualPresetChangeGuard.ts';
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

function assertPresetPlanEnvelope(plan: BrewPlan) {
  assert.ok(Number.isFinite(plan.doseG), 'dose should be finite');
  assert.ok(Number.isFinite(plan.totalWaterMl), 'total water should be finite');
  assert.ok(Number.isFinite(plan.recommendedRatio), 'ratio should be finite');
  assert.ok(plan.totalWaterMl > plan.doseG, 'water should exceed dose');
  assert.ok(plan.steps.length > 0, 'plan should include brew steps');
}

test('AI Brew manual brew preset catalog is safe, unique, and source-backed', async () => {
  const catalog = await loadCatalogForTest();
  const presets = catalog.manualBrewPresets || [];

  assert.equal(presets.length, 40, 'Production should ship 40 brew presets after expanded 2025/2026 source-backed coverage');
  assert.equal(new Set(presets.map((preset) => preset.id)).size, presets.length, 'Preset ids should be unique');
  assert.equal(new Set(presets.map((preset) => preset.safeLabel)).size, presets.length, 'Preset safe labels should be unique');
  assert.equal(presets.filter((preset) => preset.category === 'competition_inspired').length, 14);
  assert.equal(presets.filter((preset) => preset.category === 'global_classic').length, 21);
  assert.equal(presets.filter((preset) => preset.category === 'taste_target').length, 5);

  const dripperIds = new Set(catalog.drippers.map((dripper) => dripper.id));
  const targetProfileIds = new Set(catalog.targetProfiles.map((profile) => profile.id));
  for (const preset of presets) {
    assert.match(preset.safeLabel, /Inspired by|Style|Focus|Competition|Nordic|Fast|Classic|Ultimate|Better|Kyoto|Chemex|AeroPress|V60|OREA|Origami|Kalita|Switch|Clever|French Press|Moka|Iced|Siphon|Cold Brew|Manhattan|Coffee Collective|Rogue Wave/i);
    assert.doesNotMatch(preset.safeLabel, /\bofficial\b/i, `${preset.id} should not claim official ownership`);
    assert.ok(preset.sourceUrls.length > 0, `${preset.id} should keep source URLs`);
    assert.ok(preset.internalTips.length > 0, `${preset.id} should carry internal tips`);
    assert.ok(preset.guardrails.length > 0, `${preset.id} should carry guardrails`);
    assert.ok(targetProfileIds.has(preset.targetDefaults.targetProfileId), `${preset.id} target should resolve`);
    assert.ok(
      preset.targetDefaults.doseG >= 10 && (preset.targetDefaults.doseG <= 20 || preset.id === 'inspired-aeropress-cold-brew-express'),
      `${preset.id} default dose should stay inside the visible 10-20 g UI range unless source-backed cold extraction needs a larger dose`,
    );
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

test('all 40 manual brew presets expose complete Indonesian display copy without changing English source copy', async () => {
  const catalog = await loadCatalogForTest();
  const presets = catalog.manualBrewPresets || [];
  const avoidableEnglishSentence =
    /\b(inspired by|adapted as|adapted to|style for|reference|fallback|not currently|supported equipment|keep|use|do not|should|source-backed|guardrail)\b/i;
  const brokenCopy =
    /\$(?:\d+|\{)|\b(?:undefined|null|NaN|ActionAction|Action\s+Action|Pressgentle|Stophiss)\b|[\u00c2\u00c3\uFFFD]/u;

  assert.equal(presets.length, 40);
  for (const preset of presets) {
    const en = getManualPresetDisplayCopy(preset, 'en');
    const id = getManualPresetDisplayCopy(preset, 'id');

    assert.equal(en.label, preset.safeLabel, `${preset.id} English label must remain source-authored`);
    assert.equal(en.summary, preset.visibleSummary, `${preset.id} English summary must remain source-authored`);
    assert.equal(en.sourceAttribution, preset.sourceAttribution);
    assert.equal(en.fallbackReason, preset.fallbackReason || '');
    assert.deepEqual(en.guardrails, preset.guardrails);

    const idBodyFields = [
      id.summary,
      id.sourceAttribution,
      id.fallbackReason,
      ...id.guardrails,
    ].filter(Boolean);
    assert.ok(id.label.length > 3, `${preset.id} Indonesian label is required`);
    assert.ok(id.summary.length > 20, `${preset.id} Indonesian summary is required`);
    assert.ok(id.sourceAttribution.length > 10, `${preset.id} Indonesian source attribution is required`);
    assert.equal(id.guardrails.length, preset.guardrails.length, `${preset.id} must localize every guardrail`);

    assert.doesNotMatch(id.label, /^Inspired by\b|\bStyle$/i, `${preset.id} label must use Indonesian structure`);
    assert.doesNotMatch(id.label, brokenCopy, `${preset.id} contains a broken localized label`);
    for (const text of idBodyFields) {
      assert.doesNotMatch(text, avoidableEnglishSentence, `${preset.id} leaks an English sentence fragment: ${text}`);
      assert.doesNotMatch(text, brokenCopy, `${preset.id} contains broken localized copy: ${text}`);
      assert.doesNotMatch(text, /\b([\p{L}]{2,})\s+\1\b/iu, `${preset.id} repeats a localized word: ${text}`);
    }
  }
});

test('manual brew preset Indonesian localization source stays free of mojibake', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'apps/web/src/features/ai-brew/manualPresetLocalization.ts'),
    'utf8',
  );

  assert.doesNotMatch(source, /[\u00c2\u00c3\uFFFD]/u);
});

test('AI Brew manual brew presets carry source confidence through plan, prompt, and result UI', async () => {
  const catalog = await loadCatalogForTest();
  const plan = applyPreset(catalog, 'inspired-tetsu-kasuya-46');
  const prompt = buildAiAssistPrompt('ai_assist_deep_analysis', plan, 'en').body;
  const panelSource = fs.readFileSync(path.join(ROOT, 'apps/web/src/features/ai-brew/AiBrewPanel.tsx'), 'utf8');

  assert.equal(plan.manualPresetVerificationLevel, 'curated_reference');
  assert.match(plan.manualPresetSourceAttribution || '', /World Brewers Cup 2016|4:6|adapted/i);
  assert.match(prompt, /Manual brew preset source:.*curated_reference/i);
  assert.match(prompt, /Do not invent manual preset source names/i);
  assert.match(prompt, /Do not present curated_reference or internal_synthesis presets as official or exact/i);
  assert.match(panelSource, /data-testid="ai-brew-result-manual-preset-source"/);
  assert.match(panelSource, /manualPresetSourceBasis/);
});

test('manual brew preset source levels prevent public overclaims', async () => {
  const catalog = await loadCatalogForTest();
  const presets = catalog.manualBrewPresets || [];
  const officialHosts = new Set(['aeropress.com', 'worldaeropresschampionship.com']);

  assert.equal(presets.length, 40);
  for (const preset of presets) {
    const publicText = [
      preset.safeLabel,
      preset.sourceAttribution,
      preset.visibleSummary,
      preset.fallbackReason || '',
      ...preset.guardrails,
    ].join('\n');
    const positiveClaimText = publicText.replace(
      /\b(?:do not|not an?|never|without)\b[^\n.]*\b(?:official|exact|verified|world official)\b[^\n.]*[.\n]?/gi,
      '',
    );

    for (const sourceUrl of preset.sourceUrls) {
      const parsed = new URL(sourceUrl);
      assert.equal(parsed.protocol, 'https:', `${preset.id} source URL must be https`);
    }

    if (preset.verificationLevel === 'official_reference') {
      assert.ok(
        preset.sourceUrls.some((sourceUrl) => officialHosts.has(new URL(sourceUrl).hostname.replace(/^www\./, ''))),
        `${preset.id} official_reference must include a direct official source host`,
      );
    } else {
      assert.doesNotMatch(
        positiveClaimText,
        /\bofficial\b|\bexact recipe\b|\bverified\b|world official/i,
        `${preset.id} non-official preset must not overclaim source confidence`,
      );
    }

    if (preset.verificationLevel === 'internal_synthesis') {
      assert.match(
        publicText,
        /internal|synthesized|style|target|approach|reference|adapted|prefill/i,
        `${preset.id} internal synthesis must be transparent as a starting point`,
      );
      assert.doesNotMatch(positiveClaimText, /\bexact\b|\bofficial\b|\bverified\b/i);
    }

    if (preset.category === 'competition_inspired') {
      assert.match(
        publicText,
        /inspired|adapted|style|reference|prefill/i,
        `${preset.id} competition preset must stay framed as inspired/adapted/reference`,
      );
    }
  }
});

test('AI Brew AeroPress presets follow latest official WAC and Express Cold Brew references', async () => {
  const catalog = await loadCatalogForTest();
  const presets = catalog.manualBrewPresets || [];
  const wac = presets.find((preset) => preset.id === 'inspired-wac-championship-style');
  const cold = presets.find((preset) => preset.id === 'inspired-aeropress-cold-brew-express');

  assert.ok(wac, 'WAC championship preset should exist');
  assert.match(wac.safeLabel, /Nemo Pop|WAC 2025/i);
  assert.equal(wac.verificationLevel, 'official_reference');
  assert.equal(wac.targetDefaults.doseG, 18);
  assert.equal(wac.targetDefaults.targetWaterMl, 170);
  assert.equal(wac.targetDefaults.targetTempC, 84);
  assert.equal(wac.targetDefaults.aeropressStyle, 'bypass');
  assert.ok(wac.sourceUrls.some((url) => /1st-nemo-pop-australia-2025/.test(url)));
  assert.match(
    [wac.sourceAttribution, wac.visibleSummary, ...wac.internalTips, ...wac.guardrails].join('\n'),
    /70\s*g.*bypass|100\s*g.*brew|84.*C|NSNS-WEWE|Flow Control|double filter/i,
  );
  assert.doesNotMatch(JSON.stringify(wac), /25g|82.?C|George Stanica/i);

  const wacPlan = applyPreset(catalog, wac.id);
  const wacGuideText = (wacPlan.workflowGuideSteps || [])
    .map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''}`)
    .join('\n');
  assert.equal(wacPlan.manualPresetId, wac.id);
  assert.equal(wacPlan.doseG, 18);
  assert.ok(wacPlan.totalWaterMl >= 165 && wacPlan.totalWaterMl <= 175);
  assert.deepEqual(positivePours(wacPlan).map((step) => step.pourVolumeMl), [100]);
  assert.match(wacGuideText, /100\s*(g|ml)/i);
  assert.match(wacGuideText, /70\s*(g|ml).*bypass|bypass.*70\s*(g|ml)/i);
  assert.ok(wacPlan.waterTempC >= 82 && wacPlan.waterTempC <= 86);
  assert.match(
    [
      wacPlan.manualPresetSummary,
      ...wacPlan.notes,
      ...wacPlan.warnings,
      ...(wacPlan.workflowGuideSteps || []).map((step) => `${step.primaryText} ${step.secondaryText || ''}`),
    ].join('\n'),
    /WAC 2025|Nemo Pop|70\s*g.*bypass|100\s*(g|ml).*brew|bypass/i,
  );

  assert.ok(cold, 'Express Cold Brew preset should exist');
  assert.equal(cold.verificationLevel, 'official_reference');
  assert.equal(cold.targetDefaults.doseG, 30);
  assert.equal(cold.targetDefaults.targetWaterMl, 100);
  assert.ok(cold.targetDefaults.targetTempC >= 4 && cold.targetDefaults.targetTempC <= 25);
  assert.ok(cold.sourceUrls.some((url) => /express-cold-brew/.test(url)));
  assert.match(
    [cold.sourceAttribution, cold.visibleSummary, ...cold.internalTips, ...cold.guardrails].join('\n'),
    /30\s*g|100\s*ml|fine|2-minute|2 minutes|vigorous|ice/i,
  );

  const coldPlan = applyPreset(catalog, cold.id);
  assert.equal(coldPlan.manualPresetId, cold.id);
  assert.equal(coldPlan.doseG, 30);
  assert.ok(coldPlan.waterTempC >= 4 && coldPlan.waterTempC <= 25);
  assert.match([coldPlan.manualPresetSummary, ...coldPlan.notes, ...coldPlan.warnings].join('\n'), /cold|2-minute|fine/i);
});

test('AI Brew 2025 WAC runner-up and 2026 multi-pour presets stay source-scoped and guarded', async () => {
  const catalog = await loadCatalogForTest();
  const presets = catalog.manualBrewPresets || [];
  const jan = presets.find((preset) => preset.id === 'inspired-wac-2025-jan-ahrend');
  const dharun = presets.find((preset) => preset.id === 'inspired-wac-2025-dharun-vyas');
  const tetsuTen = presets.find((preset) => preset.id === 'inspired-tetsu-kasuya-2026-ten-pour');

  assert.ok(jan, 'Jan Ahrend WAC 2025 preset should exist');
  assert.equal(jan.verificationLevel, 'official_reference');
  assert.equal(jan.targetDefaults.doseG, 18);
  assert.equal(jan.targetDefaults.targetWaterMl, 152);
  assert.equal(jan.targetDefaults.targetTempC, 88);
  assert.equal(jan.targetDefaults.aeropressStyle, 'bypass');
  assert.ok(jan.sourceUrls.some((url) => /worldaeropresschampionship/.test(url)));

  const janPlan = applyPreset(catalog, jan.id);
  assert.equal(janPlan.manualPresetId, jan.id);
  assert.equal(janPlan.doseG, 18);
  assert.equal(janPlan.totalWaterMl, 152);
  assert.equal(Number((janPlan.totalWaterMl / janPlan.doseG).toFixed(1)), 8.4);
  assert.deepEqual(positivePours(janPlan).map((step) => step.pourVolumeMl), [100]);
  assert.match([janPlan.manualPresetSummary, ...janPlan.notes, ...janPlan.warnings].join('\n'), /152|dilute|bypass|output/i);

  assert.ok(dharun, 'Dharun Vyas WAC 2025 preset should exist');
  assert.equal(dharun.verificationLevel, 'official_reference');
  assert.equal(dharun.targetDefaults.doseG, 16);
  assert.equal(dharun.targetDefaults.targetWaterMl, 220);
  assert.equal(dharun.targetDefaults.targetTempC, 88);
  assert.equal(dharun.targetDefaults.aeropressStyle, 'inverted');
  assert.ok(dharun.sourceUrls.some((url) => /worldaeropresschampionship/.test(url)));

  const dharunPlan = applyPreset(catalog, dharun.id);
  assert.equal(dharunPlan.manualPresetId, dharun.id);
  assert.equal(dharunPlan.doseG, 16);
  assert.equal(dharunPlan.totalWaterMl, 220);
  assert.equal(Number((dharunPlan.totalWaterMl / dharunPlan.doseG).toFixed(1)), 13.8);
  assert.deepEqual(positivePours(dharunPlan).map((step) => step.pourVolumeMl), [208]);
  assert.match([dharunPlan.manualPresetSummary, ...dharunPlan.notes, ...dharunPlan.warnings].join('\n'), /12\s*(g|ml).*dilution|bypass split|consistent plunge/i);

  assert.ok(tetsuTen, 'Tetsu Kasuya 2026 10x pour preset should exist');
  assert.equal(tetsuTen.verificationLevel, 'curated_reference');
  assert.notEqual(tetsuTen.verificationLevel, 'official_reference');
  assert.match(tetsuTen.safeLabel, /2026 10x Pour/i);
  assert.match(tetsuTen.visibleSummary, /10x pour|ten 30g pours/i);
  assert.match(tetsuTen.visibleSummary, /Hario Neo.*V60.*compatible fallback/i);
  assert.equal(tetsuTen.targetDefaults.doseG, 20);
  assert.equal(tetsuTen.targetDefaults.targetWaterMl, 300);
  assert.equal(tetsuTen.targetDefaults.targetTempC, 96);
  assert.equal(
    tetsuTen.targetDefaults.presetPourCount,
    10,
    'Tetsu 2026 metadata must explicitly preserve the 10-pour preset count',
  );
  assert.equal(tetsuTen.techniquePattern, 'ten_pour_multi');
  assert.ok(tetsuTen.sourceUrls.some((url) => /roastaroma/.test(url)));
  assert.match(JSON.stringify(tetsuTen), /secondary public coverage|not an official/i);

  const tetsuPlan = applyPreset(catalog, tetsuTen.id);
  const tetsuPours = positivePours(tetsuPlan);
  assert.equal(tetsuPlan.manualPresetId, tetsuTen.id);
  assert.equal(tetsuPlan.dripper.id, 'hario-v60');
  assert.equal(tetsuPlan.doseG, 20);
  assert.equal(tetsuPlan.totalWaterMl, 300);
  assert.equal(Number((tetsuPlan.totalWaterMl / tetsuPlan.doseG).toFixed(1)), 15);
  assert.equal(tetsuPours.length, 10, 'Tetsu 2026 10x pour should create ten positive pours');
  assert.deepEqual(tetsuPours.map((step) => step.pourVolumeMl), Array.from({ length: 10 }, () => 30));
  assert.deepEqual(
    tetsuPours.map((step) => step.startSeconds),
    [0, 30, 45, 60, 75, 90, 105, 120, 135, 150],
    'Tetsu 2026 10x pour should keep its reported compact cadence instead of stretching beyond the live guide timer',
  );
  const tetsuGuidePours = (tetsuPlan.workflowGuideSteps || []).filter((step) => (step.pourVolumeMl || 0) > 0);
  assert.equal(tetsuGuidePours.length, 10, 'Tetsu workflow guide should expose all ten source pours');
  assert.deepEqual(
    tetsuGuidePours.map((step) => step.startSeconds),
    [0, 30, 45, 60, 75, 90, 105, 120, 135, 150],
    'Tetsu workflow guide should not place pours after serve/drawdown',
  );
  const tetsuDrawdown = tetsuPlan.workflowGuideSteps?.find((step) => step.actionType === 'drawdown');
  const tetsuServe = tetsuPlan.workflowGuideSteps?.find((step) => step.actionType === 'serve');
  assert.ok(tetsuDrawdown, 'Tetsu workflow guide should include drawdown');
  assert.ok(tetsuServe, 'Tetsu workflow guide should include serve');
  assert.ok((tetsuDrawdown.endSeconds || 0) >= tetsuDrawdown.startSeconds, 'Tetsu drawdown must not run backward');
  assert.ok(tetsuDrawdown.startSeconds >= tetsuGuidePours.at(-1)!.startSeconds, 'Tetsu drawdown should happen after the last pour starts');
  assert.ok(tetsuServe.startSeconds >= (tetsuDrawdown.endSeconds || tetsuDrawdown.startSeconds), 'Tetsu serve should happen after drawdown');
  const preservedSourceStepIds = new Set(
    (tetsuPlan.workflowGuideSteps || []).flatMap((step) => step.sourceStepIds || []),
  );
  for (const step of tetsuPours) {
    assert.ok(preservedSourceStepIds.has(step.id), `Tetsu workflow guide should preserve source step ${step.id}`);
  }
  assert.ok(tetsuPlan.totalTimeSeconds >= 210, 'Tetsu 10-pour should keep a realistic slow finish window');
  assert.match([tetsuPlan.manualPresetSummary, ...tetsuPlan.notes, ...tetsuPlan.warnings].join('\n'), /reported 2026|curated|secondary|10x pour|ten 30g pours|very coarse|Hario Neo.*V60/i);
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
  for (const key of ['doseG', 'targetWaterMl', 'targetTempC'] as const) {
    assert.deepEqual(resolveManualPresetChange({
      activePresetId: 'preset-1',
      key,
      value: '20',
    }), { kind: 'apply', clearPreset: false });
  }
  for (const [key, value] of [
    ['dripperId', 'chemex'],
    ['pourCount', '4'],
  ] as const) {
    assert.deepEqual(resolveManualPresetChange({
      activePresetId: 'preset-1',
      key,
      value,
    }), { kind: 'confirm_exit' });
  }
});

test('AI Brew manual brew preset dose edits from 17-20 g keep water scaled inside safe ratio bounds', async () => {
  const catalog = await loadCatalogForTest();
  const presetIds = [
    'inspired-tetsu-kasuya-46',
    'inspired-martin-woelfl-orea-v4',
    'inspired-carlos-medina-origami',
    'lance-style-two-pour-v60',
    'fast-brew',
  ];

  for (const presetId of presetIds) {
    const preset = catalog.manualBrewPresets?.find((item) => item.id === presetId);
    assert.ok(preset, `${presetId} should resolve`);
    const form = applyManualBrewPresetToFormState(createDefaultAiBrewFormState(catalog), catalog, presetId);
    const presetRatio = preset.targetDefaults.targetRatio
      || preset.targetDefaults.targetWaterMl / preset.targetDefaults.doseG;

    for (const doseG of [17, 18, 19, 20]) {
      const plan = buildAiBrewPlan({ ...form, doseG: String(doseG) }, catalog);
      const ratioDelta = Math.abs(plan.recommendedRatio - presetRatio);

      assert.equal(plan.doseG, doseG, `${presetId} should preserve edited ${doseG} g dose`);
      assert.ok(
        ratioDelta <= 0.55,
        `${presetId} ${doseG} g should preserve preset ratio direction, got 1:${plan.recommendedRatio}`,
      );
      assert.ok(plan.totalWaterMl >= doseG * (presetRatio - 0.7), `${presetId} should not keep stale low water at ${doseG} g`);
      assertPresetPlanEnvelope(plan);
    }
  }
});

test('AI Brew quick mode preserves manual preset ratio and temperature when dose is edited', async () => {
  const catalog = await loadCatalogForTest();
  const form = applyManualBrewPresetToFormState(
    createDefaultAiBrewFormState(catalog),
    catalog,
    'inspired-tetsu-kasuya-46',
  );
  const quickPlan = buildAiBrewPlan(createQuickAiBrewFormState({ ...form, doseG: '20' }, catalog), catalog);

  assert.equal(quickPlan.manualPresetId, 'inspired-tetsu-kasuya-46');
  assert.equal(quickPlan.doseG, 20);
  assert.equal(quickPlan.totalWaterMl, 300);
  assert.equal(quickPlan.recommendedRatio, 15);
  assert.equal(quickPlan.waterTempC, 92);
  assert.equal(positivePours(quickPlan).length, 5);
  assert.match(quickPlan.notes.join('\n'), /Manual brew preset adapted from the selected dose/i);
});

test('AI Brew manual brew presets are compact and user-toggleable in the builder UI', () => {
  const panelSource = fs.readFileSync(path.join(ROOT, 'apps/web/src/features/ai-brew/AiBrewPanel.tsx'), 'utf8');

  assert.match(panelSource, /manualPresetTitle:\s*'Brew Presets'/);
  assert.doesNotMatch(panelSource, /manualPresetTitle:\s*'Manual Brew Presets'/);
  assert.match(panelSource, /manualPresetExpanded/);
  assert.match(panelSource, /data-testid="ai-brew-manual-preset-toggle"/);
  assert.match(panelSource, /data-testid="ai-brew-manual-preset-list"/);
  assert.match(panelSource, /data-testid="ai-brew-manual-preset-compact-summary"/);
  assert.match(panelSource, /aria-expanded=\{manualPresetExpanded\}/);
});

test('AI Brew every brew preset generates a guarded recipe for source-backed real beans', async () => {
  const catalog = await loadCatalogForTest();
  const presets = catalog.manualBrewPresets || [];
  const sourceBackedBeans = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'tests/fixtures/ai-brew-source-backed-filter-beans.json'), 'utf8'),
  ) as {
    items: Array<{
      id: string;
      roaster?: string;
      lotName?: string;
      origin?: string;
      process?: string;
      variety?: string;
      roastLevel?: string;
    }>;
  };
  const processIds = new Set(catalog.processes.map((process) => process.id));
  const varietyIds = new Set(catalog.varieties.map((variety) => variety.id));
  const manualRequiredWater = {
    waterMode: 'manual' as const,
    waterCustomized: true,
    waterTdsPpm: '90',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '35',
  };

  presets.forEach((preset, index) => {
    const bean = sourceBackedBeans.items[index % sourceBackedBeans.items.length];
    const process = bean.process && processIds.has(bean.process) ? bean.process : bean.process ? 'custom' : '';
    const variety = bean.variety && varietyIds.has(bean.variety) ? bean.variety : bean.variety ? 'custom' : '';
    const baseForm = applyManualBrewPresetToFormState(
      {
        ...createDefaultAiBrewFormState(catalog),
        ...manualRequiredWater,
        coffeeName: `${bean.roaster || 'Source-backed'} ${bean.lotName || bean.id}`.trim(),
        origin: bean.origin || '',
        process,
        customProcess: process === 'custom' ? bean.process || '' : '',
        variety,
        customVariety: variety === 'custom' ? bean.variety || '' : '',
        roastLevel: (bean.roastLevel || 'medium_light') as AiBrewFormState['roastLevel'],
      },
      catalog,
      preset.id,
    );

    for (const doseG of [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
      const plan = buildAiBrewPlan({ ...baseForm, doseG: String(doseG) }, catalog);

      assert.equal(plan.manualPresetId, preset.id, `${preset.id} should remain attached at ${doseG} g`);
      assert.equal(plan.manualPresetLabel, preset.safeLabel, `${preset.id} label should reach result metadata`);
      assert.equal(plan.doseG, doseG, `${preset.id} should preserve edited ${doseG} g dose`);
      assert.ok(plan.manualPresetSummary, `${preset.id} should expose only a short public summary`);
      assert.ok(plan.workflowGuideSteps?.length, `${preset.id} should create public guide steps`);
      assertPresetPlanEnvelope(plan);
      const userFacingText = [
        plan.summary,
        plan.manualPresetSummary,
        ...plan.notes,
        ...plan.warnings,
        ...plan.steps.map((step) => [step.label, step.instruction, step.note].filter(Boolean).join(' ')),
        ...(plan.workflowGuideSteps || []).map((step) => [step.label, step.primaryText, step.secondaryText].filter(Boolean).join(' ')),
      ].join('\n');
      assert.ok(
        Math.abs(plan.recommendedRatio - (plan.totalWaterMl / plan.doseG)) <= 0.051,
        `${preset.id} ratio should match actual total water/dose math at ${doseG} g`,
      );
      assert.doesNotMatch(
        userFacingText,
        /\b100%\b|perfect extraction|guaranteed flavor|world official recipe|\b(?:undefined|NaN)\b|\$1 seconds|ActionAction|Action Action/i,
        `${preset.id} should not leak unsafe claims`,
      );
      if (plan.methodFamily === 'aeropress') {
        assert.doesNotMatch(userFacingText, /\bdrawdown\b|flat bed|final pour|V60/i, `${preset.id} should not leak pour-over language into AeroPress`);
      }
      if (plan.methodFamily === 'french_press') {
        assert.doesNotMatch(userFacingText, /\bdrawdown\b|\bbloom\b|pour map|flat bed|center-to-mid/i, `${preset.id} should not leak pour-over language into French Press`);
      }
    }
  });
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
  assert.match(panelSource, /Brew Presets|manualPresetTitle/);
  assert.doesNotMatch(panelSource, /Manual Brew Presets/);
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
