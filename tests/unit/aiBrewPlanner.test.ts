import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAiBrewOptimizationPatch,
  buildAiBrewPlan,
  buildAiBrewPlanProgressively,
  buildLocalizedPlanRecipeSteps,
  createDefaultAiBrewFormState,
  createQuickAiBrewFormState,
  resolveDeviceProfileSelection,
  resolveGrinderSettingReference,
  sanitizeAiBrewFormState,
  supportsAiBrewIcedMode,
  type AiBrewGenerationProgress,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import { buildExtractionFinisher } from '../../apps/web/src/features/ai-brew/extractionFinisher.ts';
import { buildDeterministicAiCoachMarkdown } from '../../apps/web/src/features/ai-brew/coachNotes.ts';
import {
  deriveAlkalinityFromBicarbonate,
  deriveHardnessFromCalciumMagnesium,
  inferDripperMethodFamily,
  parseNumericRange,
  validateWaterChemistryConsistency,
} from '../../apps/web/src/features/ai-brew/catalog.ts';
import {
  loadAiBrewFormDraft,
  loadCachedAiBrewCatalogSnapshot,
  loadLastGeneratedBrewPlan,
  saveAiBrewFormDraft,
  saveCachedAiBrewCatalogSnapshot,
  saveLastGeneratedBrewPlan,
} from '../../apps/web/src/features/ai-brew/storage.ts';
import type { AiBrewCatalog, AiBrewFormState, AiBrewMethodFamily } from '../../apps/web/src/features/ai-brew/types.ts';
import type { BrewMethodId } from '../../apps/web/src/features/barista-tools/types.ts';

const catalog: AiBrewCatalog = {
  catalogVersion: 'test-v2',
  drippers: [
    {
      id: 'hario-v60',
      kind: 'dripper',
      name: 'Hario V60',
      brand: 'Hario',
      typeLabel: 'Cone Dripper',
      description: 'Cone baseline.',
      searchText: 'hario v60 cone dripper',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/v60'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      methodFamily: 'v60',
      defaultProfileId: 'profile_hario_v60_hot',
    },
    {
      id: 'latina-cono',
      kind: 'dripper',
      name: 'Latina Cono',
      brand: 'Latina',
      typeLabel: 'Cone Dripper',
      description: 'Niche cone dripper.',
      searchText: 'latina cono cone dripper',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/latina-cono'],
      verificationLevel: 'dataset_unverified',
      verifiedAt: '2026-03-09',
      popularityTier: 'niche',
      marketSegment: 'small_market',
      releaseStatus: 'established',
      confidence: 'low',
      methodFamily: 'v60',
    },
  ],
  grinders: [
    {
      id: '1zpresso-k-ultra',
      kind: 'grinder',
      name: '1Zpresso K-Ultra',
      brand: '1Zpresso',
      typeLabel: 'Hand Grinder',
      description: 'Official filter reference available.',
      searchText: '1zpresso k-ultra hand grinder',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/k-ultra'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      grindBands: {
        coarse: '9.5 - 10.5 numbers',
        medium: '8.0 - 9.0 numbers',
        fine: '7.0 - 8.0 numbers',
        parsedMedium: parseNumericRange('8.0 - 9.0 numbers'),
      },
    },
    {
      id: 'hario-mini-slim',
      kind: 'grinder',
      name: 'Hario Mini Slim+',
      brand: 'Hario',
      typeLabel: 'Hand Grinder',
      description: 'No verified filter reference.',
      searchText: 'hario mini slim hand grinder',
      catalogVersion: 'test-v2',
      source: 'test',
      sourceUrls: ['https://example.com/hario-mini'],
      verificationLevel: 'dataset_unverified',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'low',
      grindBands: {
        coarse: '11 - 14 clicks',
        medium: '8 - 10 clicks',
        fine: '5 - 7 clicks',
        parsedMedium: parseNumericRange('8 - 10 clicks'),
      },
    },
  ],
  processes: [
    {
      id: 'washed',
      label: 'Washed',
      group: 'classic',
      aliases: ['wet process'],
      searchText: 'washed wet process',
      source: 'test',
      sourceUrls: ['https://example.com/washed'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Classic washed baseline.'],
    },
    {
      id: 'natural',
      label: 'Natural',
      group: 'classic',
      aliases: ['dry process'],
      searchText: 'natural dry process',
      source: 'test',
      sourceUrls: ['https://example.com/natural'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Natural process reference.'],
    },
    {
      id: 'wet_hulled',
      label: 'Wet Hulled',
      group: 'regional',
      aliases: ['giling basah'],
      searchText: 'wet hulled giling basah',
      source: 'test',
      sourceUrls: ['https://example.com/wet-hulled'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Wet hulled reference.'],
    },
  ],
  varieties: [
    {
      id: 'bourbon',
      label: 'Bourbon',
      group: 'classic-arabica',
      aliases: [],
      searchText: 'bourbon',
      originNotes: 'Classic lineage.',
      source: 'test',
      sourceUrls: ['https://example.com/bourbon'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Bourbon lineage.'],
    },
    {
      id: 'geisha',
      label: 'Geisha / Gesha',
      group: 'specialty-reference',
      aliases: ['gesha'],
      searchText: 'geisha gesha',
      originNotes: 'Specialty reference.',
      source: 'test',
      sourceUrls: ['https://example.com/geisha'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Geisha lineage.'],
    },
    {
      id: 'pacamara',
      label: 'Pacamara',
      group: 'specialty-reference',
      aliases: [],
      searchText: 'pacamara',
      originNotes: 'Large-seed structured profile.',
      source: 'test',
      sourceUrls: ['https://example.com/pacamara'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'specialty_common',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      notes: ['Pacamara structure reference.'],
    },
  ],
  waterBrands: [
    {
      id: 'evian-sg',
      brandGroupId: 'evian',
      marketCode: 'sg',
      skuLabel: 'Evian Singapore',
      label: 'Evian Singapore',
      shortLabel: 'Evian',
      subtitle: 'Singapore Â· still mineral water',
      country: 'France',
      markets: ['sg'],
      searchText: 'evian singapore france mineral water',
      description: 'Label-backed mineral profile.',
      notes: ['Official mineral profile for brew autofill tests.'],
      presetStatus: 'autofill',
      publishState: 'published',
      isBrewReady: true,
      brewBlockReason: [],
      still: true,
      recommendedForFilter: true,
      classification: 'high_buffer',
      classificationLabel: 'High buffer',
      classificationNote: 'Buffer-heavy water that can mute acidity.',
      classificationCaution: 'Watch delicate coffees carefully.',
      chemistry: {
        tdsPpm: 345,
        calciumMgL: 80,
        magnesiumMgL: 26,
        bicarbonateMgL: 360,
      },
      resolvedMinerals: {
        tdsPpm: 345,
        hardnessPpm: deriveHardnessFromCalciumMagnesium(80, 26),
        alkalinityPpm: deriveAlkalinityFromBicarbonate(360),
        derivation: 'derived_from_ions',
      },
      source: 'test',
      sourceUrls: ['https://example.com/evian'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test-v2',
    },
    {
      id: 'aqua-id',
      brandGroupId: 'aqua',
      marketCode: 'id',
      skuLabel: 'Aqua Indonesia',
      label: 'Aqua Indonesia',
      shortLabel: 'Aqua',
      subtitle: 'Indonesia Â· provenance only',
      country: 'Indonesia',
      markets: ['id'],
      searchText: 'aqua indonesia mineral water',
      description: 'Tracked in catalog, but minerals require manual input.',
      notes: ['Public mineral panel is incomplete for brew autofill.'],
      presetStatus: 'manual_required',
      publishState: 'review_only',
      isBrewReady: false,
      brewBlockReason: ['Water minerals are incomplete in this test catalog.'],
      still: true,
      recommendedForFilter: true,
      classification: 'body_builder',
      classificationLabel: 'Body builder',
      classificationNote: 'Known as a broader body-first water in Indonesian brewing.',
      chemistry: {},
      resolvedMinerals: null,
      source: 'test',
      sourceUrls: ['https://example.com/aqua'],
      verificationLevel: 'curated',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'medium',
      catalogVersion: 'test-v2',
    },
  ],
  waterGuidance: {
    id: 'manual-water',
    label: 'Manual Water',
    description: 'Manual mineral input only.',
    recommended: {
      tdsPpm: [60, 140],
      hardnessPpm: [40, 80],
      alkalinityPpm: [30, 60],
    },
    caution: {
      tooSoft: 'Too soft.',
      tooHard: 'Too hard.',
      tooLowAlkalinity: 'Too low alkalinity.',
      tooHighAlkalinity: 'Too high alkalinity.',
    },
    notes: ['No bottled water presets are used.'],
    source: 'test',
    sourceUrls: ['https://example.com/water'],
    verificationLevel: 'official',
    verifiedAt: '2026-03-09',
    popularityTier: 'widely_used',
    marketSegment: 'mass_market',
    releaseStatus: 'established',
    confidence: 'high',
    catalogVersion: 'test-v2',
  },
  targetProfiles: [
    {
      id: 'balance_clean',
      label: 'Balance & Clean',
      description: 'Clean, repeatable baseline.',
      ratioDelta: 0,
      tempDeltaC: 0,
      brewTimeDeltaSec: 0,
      grindBias: 'same',
      notes: [],
      catalogVersion: 'test-v2',
    },
    {
      id: 'more_sweetness',
      label: 'More Sweetness',
      description: 'Deeper sweetness push.',
      ratioDelta: -0.2,
      tempDeltaC: 0.6,
      brewTimeDeltaSec: 10,
      grindBias: 'finer',
      notes: [],
      catalogVersion: 'test-v2',
    },
    {
      id: 'more_acidity',
      label: 'More Acidity',
      description: 'Brighter acidity push.',
      ratioDelta: 0.25,
      tempDeltaC: -0.5,
      brewTimeDeltaSec: -10,
      grindBias: 'coarser',
      notes: [],
      catalogVersion: 'test-v2',
    },
    {
      id: 'more_body',
      label: 'More Body',
      description: 'Denser body push.',
      ratioDelta: -0.35,
      tempDeltaC: 0.3,
      brewTimeDeltaSec: 12,
      grindBias: 'finer',
      notes: [],
      catalogVersion: 'test-v2',
    },
  ],
  deviceProfiles: [
    {
      id: 'profile_hario_v60_hot',
      label: 'Hario V60 Hot',
      brewMode: 'hot',
      dripperIds: ['hario-v60'],
      methodFamily: 'v60',
      brewMethodId: 'v60',
      exactMatch: true,
      filterStyle: 'cone',
      ratioDelta: 0,
      tempDeltaC: 0,
      brewTimeDeltaSec: 0,
      grindBias: 'same',
      note: 'Exact V60 baseline.',
      steps: [
        { id: 'bloom', label: 'Bloom', share: 0.2, startSeconds: 0, note: 'Saturate evenly.' },
        { id: 'main', label: 'Main Pour', share: 0.4, startSeconds: 35, note: 'Build the slurry.' },
        { id: 'finish', label: 'Finish', share: 0.4, startSeconds: 95, note: 'Finish clean.' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/v60-profile'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test-v2',
    },
    {
      id: 'profile_family_v60_hot',
      label: 'Cone Family Hot',
      brewMode: 'hot',
      dripperIds: [],
      methodFamily: 'v60',
      brewMethodId: 'v60',
      exactMatch: false,
      filterStyle: 'cone',
      ratioDelta: 0,
      tempDeltaC: 0,
      brewTimeDeltaSec: 0,
      grindBias: 'same',
      note: 'Fallback cone baseline.',
      steps: [
        { id: 'bloom', label: 'Bloom', share: 0.2, startSeconds: 0, note: 'Saturate evenly.' },
        { id: 'main', label: 'Main Pour', share: 0.4, startSeconds: 35, note: 'Build the slurry.' },
        { id: 'finish', label: 'Finish', share: 0.4, startSeconds: 95, note: 'Finish clean.' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/family-v60'],
      verificationLevel: 'fallback',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'medium',
      catalogVersion: 'test-v2',
    },
    {
      id: 'profile_family_v60_iced',
      label: 'Cone Family Iced',
      brewMode: 'iced',
      dripperIds: [],
      methodFamily: 'v60',
      brewMethodId: 'v60',
      exactMatch: false,
      filterStyle: 'cone',
      ratioDelta: -0.25,
      tempDeltaC: 0.5,
      brewTimeDeltaSec: -10,
      grindBias: 'finer',
      note: 'Fallback iced cone baseline.',
      steps: [
        { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Wet all grounds.' },
        { id: 'build_1', label: 'Center Pour', share: 0.28, startSeconds: 35, note: 'Keep center-focused.' },
        { id: 'build_2', label: 'Second Pulse', share: 0.24, startSeconds: 70, note: 'Keep slurry modest.' },
        { id: 'finish', label: 'Final Pour', share: 0.24, startSeconds: 105, note: 'Finish to hot-water target, then serve after drawdown.' },
      ],
      source: 'test',
      sourceUrls: ['https://example.com/family-v60-iced'],
      verificationLevel: 'fallback',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'mass_market',
      releaseStatus: 'established',
      confidence: 'medium',
      catalogVersion: 'test-v2',
    },
  ],
  grinderSettings: [
    {
      id: 'gs_k_ultra_cone',
      grinderId: '1zpresso-k-ultra',
      brewMode: 'both',
      profileIds: ['profile_family_v60_hot', 'profile_family_v60_iced'],
      rangeLabel: '8.0 - 9.0 numbers',
      parsedRange: parseNumericRange('8.0 - 9.0 numbers'),
      note: 'Official K-Ultra filter baseline.',
      source: 'test',
      sourceUrls: ['https://example.com/k-ultra-grind'],
      verificationLevel: 'official',
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used',
      marketSegment: 'specialty_mainstream',
      releaseStatus: 'established',
      confidence: 'high',
      catalogVersion: 'test-v2',
    },
  ],
};

function installLocalStorageMock(options?: { throwOnSetItem?: boolean }) {
  const shouldThrowOnSetItem = Boolean(options?.throwOnSetItem);
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      setItem(key: string, value: string) {
        if (shouldThrowOnSetItem) {
          throw new Error('storage blocked');
        }
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
    },
  });
}

function getBaristaVolumeIncrementMl(methodFamily: AiBrewMethodFamily) {
  if (methodFamily === 'espresso') return 1;
  if (methodFamily === 'cold_brew' || methodFamily === 'batch_brew') return 25;
  return 5;
}

function getBaristaTimeIncrementSeconds(methodFamily: AiBrewMethodFamily) {
  if (methodFamily === 'espresso') return 1;
  if (methodFamily === 'cold_brew') return 300;
  if (methodFamily === 'batch_brew') return 15;
  return 5;
}

function assertMultipleOf(value: number, increment: number, label: string) {
  const roundedQuotient = Math.round(value / increment);
  assert.ok(
    Math.abs(value - roundedQuotient * increment) < 1e-9,
    `${label} should be rounded to ${increment}, got ${value}`,
  );
}

function assertBaristaRoundedPlan(plan: ReturnType<typeof buildAiBrewPlan>) {
  const volumeIncrement = getBaristaVolumeIncrementMl(plan.methodFamily);
  const timeIncrement = getBaristaTimeIncrementSeconds(plan.methodFamily);

  assertMultipleOf(plan.totalWaterMl, volumeIncrement, 'total water');
  assertMultipleOf(plan.hotWaterMl, volumeIncrement, 'hot water');
  assertMultipleOf(plan.iceMl, volumeIncrement, 'ice');
  assertMultipleOf(plan.estimatedCupOutputMl, volumeIncrement, 'estimated cup output');
  assertMultipleOf(plan.totalTimeSeconds, timeIncrement, 'total time');

  for (const [index, step] of plan.steps.entries()) {
    assertMultipleOf(step.startSeconds, timeIncrement, `step ${index + 1} start time`);
    assertMultipleOf(step.pourVolumeMl, volumeIncrement, `step ${index + 1} pour volume`);
    assertMultipleOf(step.targetVolumeMl, volumeIncrement, `step ${index + 1} target volume`);
  }
}

function assertPlanEnvelope(plan: ReturnType<typeof buildAiBrewPlan>) {
  const totalPoured = plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0);
  const finalStep = plan.steps[plan.steps.length - 1];
  const finiteValues: Array<[string, number]> = [
    ['dose', plan.doseG],
    ['total water', plan.totalWaterMl],
    ['hot water', plan.hotWaterMl],
    ['ice', plan.iceMl],
    ['ratio', plan.recommendedRatio],
    ['hot extraction ratio', plan.hotExtractionRatio],
    ['temperature', plan.waterTempC],
    ['total time', plan.totalTimeSeconds],
    ['estimated cup output', plan.estimatedCupOutputMl],
  ];

  assertBaristaRoundedPlan(plan);
  for (const [label, value] of finiteValues) {
    assert.ok(Number.isFinite(value), `${label} should be finite`);
  }
  for (const [index, step] of plan.steps.entries()) {
    assert.ok(Number.isFinite(step.startSeconds), `step ${index + 1} start should be finite`);
    assert.ok(Number.isFinite(step.pourVolumeMl), `step ${index + 1} pour should be finite`);
    assert.ok(Number.isFinite(step.targetVolumeMl), `step ${index + 1} target should be finite`);
  }
  assert.equal(totalPoured, plan.hotWaterMl);
  assert.equal(finalStep?.targetVolumeMl, plan.hotWaterMl);
  assert.ok(plan.recommendedRatio > 0);
  assert.equal(plan.finalBeverageRatio, plan.recommendedRatio);
  assert.ok(plan.hotExtractionRatio > 0);
  assert.ok(plan.hotWaterSharePercent >= 0 && plan.hotWaterSharePercent <= 100);
  assert.ok(plan.iceSharePercent >= 0 && plan.iceSharePercent <= 100);
  assert.ok(plan.waterTempC >= 78 && plan.waterTempC <= 98);
  assert.ok(plan.totalTimeSeconds >= 75 && plan.totalTimeSeconds <= 420);
}

function getFinalWindowSeconds(plan: ReturnType<typeof buildAiBrewPlan>) {
  const finalStep = plan.steps[plan.steps.length - 1];
  return plan.totalTimeSeconds - (finalStep?.startSeconds || 0);
}

function getPourShareMap(plan: ReturnType<typeof buildAiBrewPlan>) {
  return plan.steps.map((step) => step.pourVolumeMl / plan.hotWaterMl);
}

const ALL_METHOD_FAMILY_CASES: Array<{
  family: AiBrewMethodFamily;
  dripperId: string;
  name: string;
  brand: string;
  typeLabel: string;
  cue: RegExp;
}> = [
  {
    family: 'v60',
    dripperId: 'matrix-v60-all',
    name: 'Hario V60 Matrix All',
    brand: 'Hario',
    typeLabel: 'Cone Dripper',
    cue: /cone drain cleanly|center-to-mid/i,
  },
  {
    family: 'origami',
    dripperId: 'matrix-origami-all',
    name: 'Origami Matrix All',
    brand: 'Origami',
    typeLabel: 'Cone Dripper',
    cue: /faster cone flow|compact pulses|flow agile/i,
  },
  {
    family: 'kono',
    dripperId: 'matrix-kono-all',
    name: 'Kono Matrix All',
    brand: 'Kono',
    typeLabel: 'Cone Dripper',
    cue: /sweet core|stable contact|centered and slightly deeper/i,
  },
  {
    family: 'kalita_wave',
    dripperId: 'matrix-kalita-all',
    name: 'Kalita Wave Matrix All',
    brand: 'Kalita',
    typeLabel: 'Flat Bottom Dripper',
    cue: /flat bed|bed level|edge to edge/i,
  },
  {
    family: 'melitta',
    dripperId: 'matrix-melitta-all',
    name: 'Melitta Matrix All',
    brand: 'Melitta',
    typeLabel: 'Trapezoid Dripper',
    cue: /trapezoid bed|forgiving|level and measured/i,
  },
  {
    family: 'april',
    dripperId: 'matrix-april-all',
    name: 'April Matrix All',
    brand: 'April',
    typeLabel: 'Flat Bottom Dripper',
    cue: /low-agitation|quick, settled opening|pulse/i,
  },
  {
    family: 'chemex',
    dripperId: 'matrix-chemex-all',
    name: 'Chemex Matrix All',
    brand: 'Chemex',
    typeLabel: 'Glass Brewer',
    cue: /thick chemex paper|thick filter|filter resistance/i,
  },
  {
    family: 'clever_dripper',
    dripperId: 'matrix-clever-all',
    name: 'Clever Dripper Matrix All',
    brand: 'Clever',
    typeLabel: 'Immersion Dripper',
    cue: /open the release|open the valve|bed release|immersion/i,
  },
];

const TARGET_PROFILE_MATRIX_IDS = [
  'balance_clean',
  'more_sweetness',
  'more_acidity',
  'more_body',
] as const;

function resolveExpectedMethodIdForFamily(family: AiBrewMethodFamily): BrewMethodId {
  switch (family) {
    case 'chemex':
      return 'chemex';
    case 'kalita_wave':
      return 'kalita_wave';
    case 'melitta':
      return 'melitta';
    case 'clever_dripper':
      return 'clever_dripper';
    case 'origami':
      return 'origami';
    case 'april':
      return 'april';
    case 'kono':
      return 'kono';
    case 'v60':
    default:
      return 'v60';
  }
}

function resolveExpectedRatioToolMethodIdForFamily(family: AiBrewMethodFamily, brewMode: 'hot' | 'iced'): BrewMethodId {
  if (brewMode === 'iced') {
    switch (family) {
      case 'chemex':
        return 'chemex_iced';
      case 'kalita_wave':
        return 'kalita_wave_iced';
      case 'melitta':
        return 'melitta_iced';
      case 'clever_dripper':
        return 'clever_dripper_iced';
      case 'origami':
        return 'origami_iced';
      case 'april':
        return 'april_iced';
      case 'kono':
        return 'kono_iced';
      case 'v60':
      default:
        return 'v60_japanese_iced';
    }
  }
  return resolveExpectedMethodIdForFamily(family);
}

function resolveFilterStyleForFamily(family: AiBrewMethodFamily): 'cone' | 'flat' | 'trapezoid' | 'immersion' {
  switch (family) {
    case 'kalita_wave':
    case 'april':
      return 'flat';
    case 'melitta':
      return 'trapezoid';
    case 'clever_dripper':
      return 'immersion';
    default:
      return 'cone';
  }
}

function buildProfileStepsForFamily(family: AiBrewMethodFamily, brewMode: 'hot' | 'iced') {
  switch (family) {
    case 'chemex':
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.25, startSeconds: 0, note: 'Wet thick filter and bed.' },
          { id: 'build', label: 'Build', share: 0.35, startSeconds: 50, note: 'Use steady stream.' },
          { id: 'finish', label: 'Finish', share: 0.4, startSeconds: 120, note: 'Finish before filter stalls.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Wet thick filter and bed.' },
          { id: 'build', label: 'Build', share: 0.33, startSeconds: 55, note: 'Use steady stream.' },
          { id: 'finish', label: 'Finish', share: 0.43, startSeconds: 145, note: 'Finish before filter stalls.' },
        ];
    case 'kalita_wave':
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Saturate the flat bed.' },
          { id: 'middle', label: 'Middle Pour', share: 0.38, startSeconds: 36, note: 'Keep bed level.' },
          { id: 'finish', label: 'Finish', share: 0.4, startSeconds: 92, note: 'Land the final water evenly.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Saturate the flat bed.' },
          { id: 'middle', label: 'Middle Pour', share: 0.4, startSeconds: 40, note: 'Keep bed level.' },
          { id: 'finish', label: 'Finish', share: 0.38, startSeconds: 105, note: 'Land the final water evenly.' },
        ];
    case 'melitta':
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Open the trapezoid bed evenly.' },
          { id: 'middle', label: 'Middle Pour', share: 0.36, startSeconds: 40, note: 'Keep the middle measured.' },
          { id: 'finish', label: 'Finish', share: 0.4, startSeconds: 102, note: 'Close with a tidy level pour.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Open the trapezoid bed evenly.' },
          { id: 'middle', label: 'Middle Pour', share: 0.37, startSeconds: 42, note: 'Keep the middle measured.' },
          { id: 'finish', label: 'Finish', share: 0.39, startSeconds: 110, note: 'Close with a tidy level pour.' },
        ];
    case 'april':
      return brewMode === 'iced'
        ? [
          { id: 'pulse_1', label: 'Pulse 1', share: 0.34, startSeconds: 0, note: 'Short settled opening.' },
          { id: 'pulse_2', label: 'Pulse 2', share: 0.33, startSeconds: 35, note: 'Keep pulses organized.' },
          { id: 'pulse_3', label: 'Pulse 3', share: 0.33, startSeconds: 80, note: 'Finish clean and fast.' },
        ]
        : [
          { id: 'pulse_1', label: 'Pulse 1', share: 0.34, startSeconds: 0, note: 'Short settled opening.' },
          { id: 'pulse_2', label: 'Pulse 2', share: 0.33, startSeconds: 38, note: 'Keep pulses organized.' },
          { id: 'pulse_3', label: 'Pulse 3', share: 0.33, startSeconds: 88, note: 'Finish clean and fast.' },
        ];
    case 'clever_dripper':
      return brewMode === 'iced'
        ? [
          { id: 'charge', label: 'Charge', share: 0.56, startSeconds: 0, note: 'Start immersion.' },
          { id: 'hold', label: 'Hold', share: 0.24, startSeconds: 55, note: 'Keep immersion calm.' },
          { id: 'release', label: 'Release', share: 0.2, startSeconds: 120, note: 'Release to cup.' },
        ]
        : [
          { id: 'charge', label: 'Charge', share: 0.52, startSeconds: 0, note: 'Start immersion.' },
          { id: 'hold', label: 'Hold', share: 0.28, startSeconds: 50, note: 'Keep immersion calm.' },
          { id: 'release', label: 'Release', share: 0.2, startSeconds: 130, note: 'Release to cup.' },
        ];
    case 'origami':
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Keep bloom light and even.' },
          { id: 'pulse', label: 'Pulse', share: 0.36, startSeconds: 30, note: 'Use compact pulses.' },
          { id: 'finish', label: 'Finish', share: 0.42, startSeconds: 84, note: 'Close with light finishing pour.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Keep bloom light and even.' },
          { id: 'pulse', label: 'Pulse', share: 0.35, startSeconds: 34, note: 'Use compact pulses.' },
          { id: 'finish', label: 'Finish', share: 0.43, startSeconds: 90, note: 'Close with light finishing pour.' },
        ];
    case 'kono':
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.26, startSeconds: 0, note: 'Build a sweet core early.' },
          { id: 'center', label: 'Center Pour', share: 0.38, startSeconds: 34, note: 'Keep the stream tight.' },
          { id: 'finish', label: 'Finish', share: 0.36, startSeconds: 94, note: 'Finish narrow and controlled.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.25, startSeconds: 0, note: 'Build a sweet core early.' },
          { id: 'center', label: 'Center Pour', share: 0.39, startSeconds: 38, note: 'Keep the stream tight.' },
          { id: 'finish', label: 'Finish', share: 0.36, startSeconds: 105, note: 'Finish narrow and controlled.' },
        ];
    case 'v60':
    default:
      return brewMode === 'iced'
        ? [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Open the bloom evenly.' },
          { id: 'build_1', label: 'Center Pour', share: 0.28, startSeconds: 35, note: 'Keep the cone walls quiet.' },
          { id: 'build_2', label: 'Second Pulse', share: 0.24, startSeconds: 70, note: 'Keep slurry modest.' },
          { id: 'finish', label: 'Final Pour', share: 0.24, startSeconds: 105, note: 'Finish calmly, then serve only after drawdown.' },
        ]
        : [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Open the bloom evenly.' },
          { id: 'center', label: 'Center Pour', share: 0.33, startSeconds: 35, note: 'Keep the cone walls quiet.' },
          { id: 'finish', label: 'Finish', share: 0.45, startSeconds: 95, note: 'Finish calmly and cleanly.' },
        ];
  }
}

function buildAllMethodFamilyCatalog(): AiBrewCatalog {
  const drippers = ALL_METHOD_FAMILY_CASES.map((entry) => ({
    id: entry.dripperId,
    kind: 'dripper' as const,
    name: entry.name,
    brand: entry.brand,
    typeLabel: entry.typeLabel,
    description: `${entry.name} test dripper.`,
    searchText: `${entry.name.toLowerCase()} ${entry.family} test dripper`,
    catalogVersion: 'test-v2',
    source: 'test',
    sourceUrls: [`https://example.com/${entry.dripperId}`],
    verificationLevel: 'official' as const,
    verifiedAt: '2026-03-09',
    popularityTier: 'widely_used' as const,
    marketSegment: 'specialty_mainstream' as const,
    releaseStatus: 'established' as const,
    confidence: 'high' as const,
    methodFamily: entry.family,
    defaultProfileId: `profile_${entry.dripperId}_hot`,
  }));

  const deviceProfiles = ALL_METHOD_FAMILY_CASES.flatMap((entry) => {
    const filterStyle = resolveFilterStyleForFamily(entry.family);
    return (['hot', 'iced'] as const).map((brewMode) => ({
      id: `profile_${entry.dripperId}_${brewMode}`,
      label: `${entry.name} ${brewMode === 'iced' ? 'Iced' : 'Hot'}`,
      brewMode,
      dripperIds: [entry.dripperId],
      methodFamily: entry.family,
      brewMethodId: resolveExpectedRatioToolMethodIdForFamily(entry.family, brewMode),
      exactMatch: true,
      filterStyle,
      ratioDelta: 0,
      tempDeltaC: 0,
      brewTimeDeltaSec: 0,
      grindBias: 'same' as const,
      note: `${entry.name} ${brewMode} baseline.`,
      steps: buildProfileStepsForFamily(entry.family, brewMode),
      source: 'test',
      sourceUrls: [`https://example.com/profile-${entry.dripperId}-${brewMode}`],
      verificationLevel: 'official' as const,
      verifiedAt: '2026-03-09',
      popularityTier: 'widely_used' as const,
      marketSegment: 'specialty_mainstream' as const,
      releaseStatus: 'established' as const,
      confidence: 'high' as const,
      catalogVersion: 'test-v2',
    }));
  });

  return {
    ...catalog,
    drippers: [...catalog.drippers, ...drippers],
    deviceProfiles: [...catalog.deviceProfiles, ...deviceProfiles],
  };
}

function collectPlanNarrative(plan: ReturnType<typeof buildAiBrewPlan>) {
  return plan.steps.map((step) => `${step.note} ${step.hybridInstruction || ''}`).join(' ');
}

test('AI Brew optimizer can adjust iced plans without breaking planner guardrails', () => {
  const baseline = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced',
    coffeeName: 'Iced Geisha Guardrail',
    doseG: '20',
    targetProfileId: 'more_sweetness',
    process: 'natural',
    variety: 'geisha',
    waterTdsPpm: '95',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '32',
  }, catalog);
  const result = applyAiBrewOptimizationPatch(baseline, {
    reason: 'Sweet high-grown coffee can take a slightly tighter iced extraction with compact pulses.',
    confidence: 0.92,
    recommendedRatio: baseline.recommendedRatio + 0.35,
    waterTempC: baseline.waterTempC + 1,
    totalTimeSeconds: baseline.totalTimeSeconds + 15,
    hotWaterSharePercent: 64,
    steps: baseline.steps.map((step, index) => ({
      index: index + 1,
      startSeconds: step.startSeconds + (index === 0 ? 0 : 5),
      pourVolumeMl: step.pourVolumeMl + (index === 0 ? 5 : 0),
      control: index === 0
        ? 'Buka bloom rata, lalu jaga aliran kecil dan bersih.'
        : 'Jaga pulse stabil; selesai tanpa mengaduk es terlalu keras.',
    })),
  });

  assert.equal(result.applied, true);
  assert.deepEqual(result.rejected, []);
  assertPlanEnvelope(result.plan);
  assert.equal(result.plan.brewMode, 'iced');
  assert.equal(result.plan.hotWaterMl + result.plan.iceMl, result.plan.totalWaterMl);
  assert.ok(result.plan.confidenceNotes.some((note) => /AI numeric optimizer accepted/i.test(note)));
  assert.ok(result.plan.steps.some((step) => /pulse|bloom|aliran/i.test(step.hybridInstruction || '')));
});

test('AI Brew optimizer preserves hot and iced envelopes across core dripper families', () => {
  const matrixCatalog = buildAllMethodFamilyCatalog();

  for (const entry of ALL_METHOD_FAMILY_CASES) {
    for (const brewMode of ['hot', 'iced'] as const) {
      const baseline = buildAiBrewPlan({
        ...createDefaultAiBrewFormState(matrixCatalog),
        brewMode,
        coffeeName: `${entry.name} optimizer matrix`,
        dripperId: entry.dripperId,
        targetProfileId: brewMode === 'iced' ? 'more_sweetness' : 'balance_clean',
        roastLevel: 'medium_light',
        doseG: '18',
        waterTdsPpm: '92',
        waterHardnessPpm: '48',
        waterAlkalinityPpm: '34',
      }, matrixCatalog);
      const result = applyAiBrewOptimizationPatch(baseline, {
        reason: `${entry.family} ${brewMode} micro adjustment inside validated service range.`,
        confidence: 87,
        recommendedRatio: baseline.recommendedRatio + (brewMode === 'iced' ? 0.25 : -0.25),
        waterTempC: baseline.waterTempC + 1,
        totalTimeSeconds: baseline.totalTimeSeconds + 10,
        hotWaterSharePercent: brewMode === 'iced' ? 66 : undefined,
        steps: baseline.steps.map((step, index) => ({
          index: index + 1,
          startSeconds: step.startSeconds + (index === 0 ? 0 : 5),
          pourVolumeMl: step.pourVolumeMl,
          control: `Keep ${entry.family.replace(/_/g, ' ')} ${brewMode} control on checkpoint ${index + 1}.`,
        })),
      });

      assert.deepEqual(result.rejected, [], `${entry.family} ${brewMode} should not reject optimizer patch`);
      assertPlanEnvelope(result.plan);
      assert.equal(result.plan.brewMode, brewMode);
      assert.equal(result.plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0), result.plan.hotWaterMl);
      assert.equal(result.plan.steps[result.plan.steps.length - 1]?.targetVolumeMl, result.plan.hotWaterMl);
      if (brewMode === 'iced') {
        assert.equal(result.plan.hotWaterMl + result.plan.iceMl, result.plan.totalWaterMl);
      }
    }
  }
});

test('parseNumericRange extracts numeric grinder bands and units', () => {
  const parsed = parseNumericRange('20-24 clicks');
  assert.deepEqual(parsed, {
    min: 20,
    max: 24,
    unitLabel: 'clicks',
    precision: 0,
  });

  const parsedTurns = parseNumericRange('2.3 sampai 3.1 putaran');
  assert.deepEqual(parsedTurns, {
    min: 2.3,
    max: 3.1,
    unitLabel: 'turns',
    precision: 1,
  });

  const parsedParenthetical = parseNumericRange('30 - 39 clicks (1.0 - 1.3 turns)');
  assert.deepEqual(parsedParenthetical, {
    min: 30,
    max: 39,
    unitLabel: 'clicks',
    precision: 0,
  });

  const parsedCommaDecimals = parseNumericRange('1,4 - 1,8 putaran');
  assert.deepEqual(parsedCommaDecimals, {
    min: 1.4,
    max: 1.8,
    unitLabel: 'turns',
    precision: 1,
  });

  const parsedMajorDial = parseNumericRange('2.0 - 3.5 major');
  assert.deepEqual(parsedMajorDial, {
    min: 2,
    max: 3.5,
    unitLabel: 'numbers',
    precision: 1,
  });
});

test('inferDripperMethodFamily maps common dripper names to brew families', () => {
  assert.equal(inferDripperMethodFamily('Chemex', 'Glass Brewer'), 'chemex');
  assert.equal(inferDripperMethodFamily('ORIGAMI Dripper Air S', 'Cone Dripper'), 'origami');
  assert.equal(inferDripperMethodFamily('Clever Dripper', 'Immersion Dripper'), 'clever_dripper');
  assert.equal(inferDripperMethodFamily('Melitta 1x2', 'Trapezoid Dripper'), 'melitta');
  assert.equal(inferDripperMethodFamily('French Press', 'Full Immersion Press Brewer'), 'french_press');
  assert.equal(inferDripperMethodFamily('AeroPress', 'Pressure-Assisted Immersion Brewer'), 'aeropress');
  assert.equal(inferDripperMethodFamily('Hario Siphon', 'Vacuum Brewer'), 'siphon');
  assert.equal(inferDripperMethodFamily('Bialetti Moka Pot', 'Stovetop Brewer'), 'moka_pot');
  assert.equal(inferDripperMethodFamily('Toddy Cold Brew', 'Cold Brew Immersion Brewer'), 'cold_brew');
  assert.equal(inferDripperMethodFamily('Batch Brewer', 'Automatic Brewer'), 'batch_brew');
});

test('non-dripper method profiles generate action-safe AI Brew plans without fake iced mode', () => {
  const cases = [
    {
      family: 'espresso',
      methodId: 'espresso',
      dripperId: 'matrix-espresso',
      name: 'Espresso Machine Matrix',
      typeLabel: 'Pressure Espresso Brewer',
      filterStyle: 'pressure',
      steps: [
        { id: 'extract', label: 'Extract', kind: 'extract', share: 1, startSeconds: 0, note: 'Start the shot and track yield.' },
        { id: 'stop', label: 'Stop', kind: 'serve', share: 0, startSeconds: 28, note: 'Stop at target yield.' },
      ],
      expectedKinds: ['extract', 'serve'],
    },
    {
      family: 'french_press',
      methodId: 'french_press',
      dripperId: 'matrix-french-press',
      name: 'French Press Matrix',
      typeLabel: 'Full Immersion Press Brewer',
      filterStyle: 'immersion',
      steps: [
        { id: 'charge', label: 'Charge', kind: 'pour', share: 1, startSeconds: 0, note: 'Add all water evenly.' },
        { id: 'steep', label: 'Steep', kind: 'wait', share: 0, startSeconds: 240, note: 'Hold immersion.' },
        { id: 'press', label: 'Press', kind: 'press', share: 0, startSeconds: 270, note: 'Press slowly.' },
      ],
      expectedKinds: ['pour', 'wait', 'press'],
    },
    {
      family: 'aeropress',
      methodId: 'aeropress',
      dripperId: 'matrix-aeropress',
      name: 'AeroPress Matrix',
      typeLabel: 'Pressure-Assisted Immersion Brewer',
      filterStyle: 'pressure',
      steps: [
        { id: 'charge', label: 'Charge', kind: 'pour', share: 1, startSeconds: 0, note: 'Wet compact bed.' },
        { id: 'press', label: 'Press', kind: 'press', share: 0, startSeconds: 90, note: 'Press steadily.' },
      ],
      expectedKinds: ['pour', 'press'],
    },
    {
      family: 'siphon',
      methodId: 'siphon',
      dripperId: 'matrix-siphon',
      name: 'Siphon Matrix',
      typeLabel: 'Vacuum Siphon Brewer',
      filterStyle: 'vacuum',
      steps: [
        { id: 'charge', label: 'Charge', kind: 'pour', share: 1, startSeconds: 0, note: 'Load water.' },
        { id: 'heat', label: 'Heat', kind: 'heat', share: 0, startSeconds: 60, note: 'Hold heat.' },
        { id: 'drawdown', label: 'Drawdown', kind: 'drawdown', share: 0, startSeconds: 150, note: 'Let coffee draw down.' },
      ],
      expectedKinds: ['pour', 'heat', 'drawdown'],
    },
    {
      family: 'moka_pot',
      methodId: 'moka_pot',
      dripperId: 'matrix-moka-pot',
      name: 'Moka Pot Matrix',
      typeLabel: 'Stovetop Pressure Brewer',
      filterStyle: 'stovetop',
      steps: [
        { id: 'fill_base', label: 'Charge', kind: 'pour', share: 1, startSeconds: 0, note: 'Fill below the valve.' },
        { id: 'heat', label: 'Heat', kind: 'heat', share: 0, startSeconds: 60, note: 'Use low heat.' },
        { id: 'stop', label: 'Stop', kind: 'serve', share: 0, startSeconds: 180, note: 'Remove from heat.' },
      ],
      expectedKinds: ['pour', 'heat', 'serve'],
    },
    {
      family: 'cold_brew',
      methodId: 'cold_brew',
      dripperId: 'matrix-cold-brew',
      name: 'Cold Brew Matrix',
      typeLabel: 'Cold Brew Immersion Brewer',
      filterStyle: 'cold_immersion',
      steps: [
        { id: 'charge', label: 'Charge', kind: 'pour', share: 1, startSeconds: 0, note: 'Add cool water.' },
        { id: 'steep', label: 'Steep', kind: 'wait', share: 0, startSeconds: 300, note: 'Steep cold.' },
        { id: 'filter', label: 'Filter', kind: 'serve', share: 0, startSeconds: 43200, note: 'Filter cleanly.' },
      ],
      expectedKinds: ['pour', 'wait', 'serve'],
    },
    {
      family: 'batch_brew',
      methodId: 'batch_brew',
      dripperId: 'matrix-batch-brewer',
      name: 'Batch Brewer Matrix',
      typeLabel: 'Automatic Batch Brewer',
      filterStyle: 'batch',
      steps: [
        { id: 'start_brew', label: 'Start Brew', kind: 'pour', share: 1, startSeconds: 0, note: 'Start brew cycle.' },
        { id: 'drawdown', label: 'Drawdown', kind: 'drawdown', share: 0, startSeconds: 270, note: 'Let drawdown finish.' },
      ],
      expectedKinds: ['pour', 'drawdown'],
    },
  ] as const;

  const expandedCatalog: AiBrewCatalog = {
    ...catalog,
    drippers: [
      ...catalog.drippers,
      ...cases.map((entry) => ({
        id: entry.dripperId,
        kind: 'dripper' as const,
        name: entry.name,
        brand: 'QA',
        typeLabel: entry.typeLabel,
        description: `${entry.name} QA brewer.`,
        searchText: entry.name.toLowerCase(),
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: [`https://example.com/${entry.dripperId}`],
        verificationLevel: 'official' as const,
        verifiedAt: '2026-05-01',
        popularityTier: 'widely_used' as const,
        marketSegment: 'specialty_mainstream' as const,
        releaseStatus: 'established' as const,
        confidence: 'high' as const,
        methodFamily: entry.family as AiBrewMethodFamily,
      })),
    ],
    deviceProfiles: [
      ...catalog.deviceProfiles,
      ...cases.map((entry) => ({
        id: `profile_${entry.dripperId}_hot`,
        label: `${entry.name} Hot`,
        brewMode: 'hot' as const,
        dripperIds: [entry.dripperId],
        methodFamily: entry.family as AiBrewMethodFamily,
        brewMethodId: entry.methodId as BrewMethodId,
        exactMatch: true,
        filterStyle: entry.filterStyle,
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same' as const,
        note: `${entry.name} QA baseline.`,
        steps: entry.steps,
        source: 'test',
        sourceUrls: [`https://example.com/profile-${entry.dripperId}`],
        verificationLevel: 'official' as const,
        verifiedAt: '2026-05-01',
        popularityTier: 'widely_used' as const,
        marketSegment: 'specialty_mainstream' as const,
        releaseStatus: 'established' as const,
        confidence: 'high' as const,
        catalogVersion: 'test-v2',
      })),
    ],
  };

  for (const entry of cases) {
    assert.equal(supportsAiBrewIcedMode(expandedCatalog, entry.dripperId), false);

    const input = {
      ...createDefaultAiBrewFormState(expandedCatalog),
      brewMode: 'iced' as const,
      dripperId: entry.dripperId,
      coffeeName: `${entry.name} QA`,
      doseG: entry.family === 'cold_brew' ? '60' : entry.family === 'batch_brew' ? '55' : '18',
      waterTdsPpm: '95',
      waterHardnessPpm: '55',
      waterAlkalinityPpm: '40',
      targetProfileId: 'balance_clean',
    };
    const sanitized = sanitizeAiBrewFormState(input, expandedCatalog);
    assert.equal(sanitized.brewMode, 'hot');

    const plan = buildAiBrewPlan(input, expandedCatalog);
    if (entry.family !== 'cold_brew' && entry.family !== 'espresso') {
      assertPlanEnvelope(plan);
    } else {
      assertBaristaRoundedPlan(plan);
      const totalPoured = plan.steps.reduce((sum, step) => sum + step.pourVolumeMl, 0);
      assert.equal(totalPoured, plan.hotWaterMl);
      assert.equal(plan.steps.at(-1)?.targetVolumeMl, plan.hotWaterMl);
      assert.ok(plan.recommendedRatio > 0);
      assert.equal(plan.finalBeverageRatio, plan.recommendedRatio);
      assert.ok(plan.iceMl === 0);
      if (entry.family === 'cold_brew') {
        assert.ok(plan.waterTempC >= 4 && plan.waterTempC <= 25);
        assert.ok(plan.totalTimeSeconds >= 21600);
      } else {
        assert.ok(plan.waterTempC >= 88 && plan.waterTempC <= 98);
        assert.ok(plan.totalTimeSeconds >= 20 && plan.totalTimeSeconds <= 45);
      }
    }
    assert.equal(plan.brewMode, 'hot');
    assert.equal(plan.methodFamily, entry.family);
    assert.equal(plan.methodId, entry.methodId);
    assert.equal(plan.ratioToolMethodId, entry.methodId);
    assert.deepEqual(plan.steps.map((step) => step.kind), entry.expectedKinds);
    assert.doesNotMatch(buildLocalizedPlanRecipeSteps(plan, 'id').join('\n'), /\btuang\s+0\b|\bpour\s+0\b/i);
    assert.ok(plan.confidenceNotes.some((note) =>
      note.toLowerCase().includes(`method-family signature active: ${entry.family.replace(/_/g, ' ')}`),
    ));

    if (entry.family === 'cold_brew') {
      assert.match(plan.summary, /Cold brew plan/i);
      assert.match(buildLocalizedPlanRecipeSteps(plan, 'id').join('\n'), /\d+j/);
    }
    if (entry.family === 'espresso') {
      assert.ok(plan.steps.some((step) => step.kind === 'extract' && step.pourVolumeMl > 0));
      assert.match(plan.summary, /Espresso plan/i);
    }
  }

  assert.equal(supportsAiBrewIcedMode(expandedCatalog, 'hario-v60'), true);
});

test('sanitizeAiBrewFormState falls back to valid defaults for unsupported values', () => {
  const sanitized = sanitizeAiBrewFormState({
    brewMode: 'hot',
    process: 'invalid-process',
    variety: 'invalid-variety',
    roastLevel: 'ultra_light' as AiBrewFormState['roastLevel'],
    waterMode: 'sparkling' as AiBrewFormState['waterMode'],
    waterBrandId: 'unknown-brand',
    dripperId: '',
    grinderId: '',
  }, catalog);

  assert.equal(sanitized.process, '');
  assert.equal(sanitized.variety, '');
  assert.equal(sanitized.roastLevel, 'medium');
  assert.equal(sanitized.waterMode, 'brand');
  assert.equal(sanitized.waterBrandId, '');
  assert.equal(sanitized.dripperId, 'hario-v60');
  assert.equal(sanitized.grinderId, '1zpresso-k-ultra');
});

test('resolveDeviceProfileSelection prefers exact profile and derives a device template when exact is missing', () => {
  const exact = resolveDeviceProfileSelection(catalog, catalog.drippers[0], 'hot');
  assert.equal(exact.profile.id, 'profile_hario_v60_hot');
  assert.equal(exact.mode, 'exact');

  const derived = resolveDeviceProfileSelection(catalog, catalog.drippers[1], 'hot');
  assert.equal(derived.mode, 'derived_template');
  assert.equal(derived.profile.id, 'profile_derived_latina-cono_hot');
  assert.equal(derived.profile.verificationLevel, 'fallback');
});

test('resolveGrinderSettingReference uses family fallback ids when no exact grinder match exists', () => {
  const deviceSelection = resolveDeviceProfileSelection(catalog, catalog.drippers[0], 'hot');
  const grinderSetting = resolveGrinderSettingReference(catalog, catalog.grinders[0], deviceSelection.profile, 'hot');
  assert.equal(grinderSetting?.id, 'gs_k_ultra_cone');
});

test('resolveGrinderSettingReference derives a grinder baseline when no catalog chart exists', () => {
  const deviceSelection = resolveDeviceProfileSelection(catalog, catalog.drippers[0], 'hot');
  const grinderSetting = resolveGrinderSettingReference(catalog, catalog.grinders[1], deviceSelection.profile, 'hot');
  assert.equal(grinderSetting?.id, 'derived_hario-mini-slim_hot');
  assert.equal(grinderSetting?.verificationLevel, 'fallback');
});

test('resolveGrinderSettingReference promotes curated grinder bands when provenance exists', () => {
  const deviceSelection = resolveDeviceProfileSelection(catalog, catalog.drippers[0], 'hot');
  const curatedGrinder = {
    ...catalog.grinders[1],
    verificationLevel: 'curated' as const,
    confidence: 'medium' as const,
    source: 'brewlogic-curated',
  };
  const grinderSetting = resolveGrinderSettingReference(catalog, curatedGrinder, deviceSelection.profile, 'hot');
  assert.equal(grinderSetting?.id, 'catalog_hario-mini-slim_hot');
  assert.equal(grinderSetting?.verificationLevel, 'curated');
  assert.match(grinderSetting?.note || '', /published pour-over band/i);
});

test('buildAiBrewPlan creates a hot brew plan with deterministic outputs and provenance', () => {
  const form = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'QA Ethiopia',
    doseG: '15',
    waterTdsPpm: '90',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const plan = buildAiBrewPlan(form, catalog);

  assert.equal(plan.brewMode, 'hot');
  assert.equal(plan.methodId, 'v60');
  assert.equal(plan.ratioToolMethodId, 'v60');
  assert.equal(plan.hotWaterMl, plan.totalWaterMl);
  assert.equal(plan.iceMl, 0);
  assert.equal(plan.deviceProfileId, 'profile_hario_v60_hot');
  assert.equal(plan.deviceProfileMode, 'exact');
  assert.equal(plan.grindSettingMode, 'catalog_reference');
  assert.equal(plan.grindSettingVerification, 'official');
  assert.equal(plan.provenanceAttentionNeeded, false);
  assert.match(plan.grindRecommendation, /numbers/);
  assert.equal(plan.waterMinerals.tdsPpm, 90);
  assert.equal(plan.process, 'Not specified');
  assert.equal(plan.variety, 'Not specified');
  assert.ok(plan.notes.some((note) => /No automatic process modifier/i.test(note)));
  assert.match(plan.summary, /QA Ethiopia/);
});

test('buildAiBrewPlan applies operator knowledge seed notes from knowledge_v1 workbook', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Gayo Washed QA',
    dripperId: 'hario-v60',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.ok(plan.notes.some((note) => /Knowledge v1 - Gayo/i.test(note)));
  assert.ok(plan.notes.some((note) => /Knowledge v1 - V60/i.test(note)));
  assert.ok(plan.confidenceNotes.some((note) => /knowledge_v1\.xlsx/i.test(note)));
});

test('buildAiBrewPlanProgressively emits factual generation progress with increasing system signals', async () => {
  const progressEvents: AiBrewGenerationProgress[] = [];
  const plan = await buildAiBrewPlanProgressively({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Progress QA',
    doseG: '15',
    waterBrandId: 'evian-sg',
    process: 'washed',
    variety: 'bourbon',
    altitudeMasl: '1650',
    beanDensityGml: '0.71',
    roastDevelopment: 'light_roast',
    solubility: 'average',
  }, catalog, (progress) => {
    progressEvents.push(progress);
  });

  assert.equal(progressEvents.length, 6);
  assert.equal(progressEvents[0]?.id, 'validate_input');
  assert.equal(progressEvents[progressEvents.length - 1]?.id, 'run_standards_checks');
  assert.equal(progressEvents[0]?.metrics.resolvedReferenceCount, 1);
  assert.equal(progressEvents[2]?.metrics.resolvedReferenceCount, 3);
  assert.equal(progressEvents[3]?.metrics.totalWaterMl, plan.totalWaterMl);
  assert.equal(progressEvents[4]?.metrics.stepCount, plan.steps.length);
  assert.equal(progressEvents[5]?.metrics.stepCount, plan.steps.length);
  assert.ok((progressEvents[2]?.referenceStrengthScore || 0) >= (progressEvents[0]?.referenceStrengthScore || 0));
  assert.equal(progressEvents[5]?.progressRatio, 1);
  assert.equal(Number.isFinite(progressEvents[5]?.standardsScore || NaN), true);
});

test('buildAiBrewPlan keeps final step envelope aligned even with skewed profile shares', () => {
  const skewedCatalog = {
    ...catalog,
    deviceProfiles: catalog.deviceProfiles.map((profile) =>
      profile.id === 'profile_hario_v60_hot'
        ? {
            ...profile,
            steps: [
              { id: 'bloom', label: 'Bloom', share: 0.5, startSeconds: 0, note: 'Saturate evenly.' },
              { id: 'main', label: 'Main Pour', share: 0.5, startSeconds: 35, note: 'Build the slurry.' },
              { id: 'finish', label: 'Finish', share: 0.5, startSeconds: 95, note: 'Finish clean.' },
            ],
          }
        : profile,
    ),
  } as AiBrewCatalog;

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(skewedCatalog),
    coffeeName: 'Skewed Envelope QA',
    waterTdsPpm: '90',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, skewedCatalog);

  const summedPour = plan.steps.reduce((total, step) => total + step.pourVolumeMl, 0);
  const finalStep = plan.steps[plan.steps.length - 1];

  assert.equal(summedPour, plan.hotWaterMl);
  assert.equal(finalStep.targetVolumeMl, plan.hotWaterMl);
});

test('buildAiBrewPlan keeps brew temperature inside the real computed range', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Temperature Guard',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.equal(plan.waterTempC, 93);
  assert.ok(plan.waterTempC > 78);
});

test('buildAiBrewPlan keeps neutral quick and neutral pro-style inputs on the same deterministic core plan', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Quick Pro Neutral QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const quickLike = buildAiBrewPlan(baseInput, catalog);
  const proNeutral = buildAiBrewPlan({
    ...baseInput,
    process: '',
    variety: '',
    customProcess: '',
    customVariety: '',
    altitudeMasl: '',
    beanDensityGml: '',
    roastDevelopment: '',
    solubility: '',
    waterNotes: '',
  }, catalog);

  assert.equal(quickLike.recommendedRatio, proNeutral.recommendedRatio);
  assert.equal(quickLike.waterTempC, proNeutral.waterTempC);
  assert.equal(quickLike.totalTimeSeconds, proNeutral.totalTimeSeconds);
  assert.deepEqual(
    quickLike.steps.map((step) => [step.startSeconds, step.pourVolumeMl, step.targetVolumeMl]),
    proNeutral.steps.map((step) => [step.startSeconds, step.pourVolumeMl, step.targetVolumeMl]),
  );
});

test('createQuickAiBrewFormState strips hidden precision-only modifiers before generation', () => {
  const quickInput = createQuickAiBrewFormState({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Quick Sanitizer QA',
    brewMode: 'iced',
    process: 'natural',
    customProcess: 'experimental anaerobic',
    variety: 'geisha',
    customVariety: 'rare cultivar',
    altitudeMasl: '1950',
    beanDensityGml: '0.74',
    roastDevelopment: 'underdeveloped',
    solubility: 'low',
    waterNotes: 'extra buffer',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.equal(quickInput.brewMode, 'iced');
  assert.equal(quickInput.process, '');
  assert.equal(quickInput.customProcess, '');
  assert.equal(quickInput.variety, '');
  assert.equal(quickInput.customVariety, '');
  assert.equal(quickInput.altitudeMasl, '');
  assert.equal(quickInput.beanDensityGml, '');
  assert.equal(quickInput.roastDevelopment, '');
  assert.equal(quickInput.solubility, '');
  assert.equal(quickInput.waterNotes, '');
  assert.equal(quickInput.waterTdsPpm, '95');
});

test('buildAiBrewPlan roast level shifts extraction envelope in a sensible direction', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Roast Envelope QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
    process: 'washed',
  };

  const light = buildAiBrewPlan({
    ...baseInput,
    roastLevel: 'light',
  }, catalog);
  const medium = buildAiBrewPlan({
    ...baseInput,
    roastLevel: 'medium',
  }, catalog);
  const dark = buildAiBrewPlan({
    ...baseInput,
    roastLevel: 'dark',
  }, catalog);

  assertPlanEnvelope(light);
  assertPlanEnvelope(medium);
  assertPlanEnvelope(dark);

  assert.ok(light.waterTempC > medium.waterTempC);
  assert.ok(medium.waterTempC > dark.waterTempC);
  assert.ok(light.totalTimeSeconds > medium.totalTimeSeconds);
  assert.ok(medium.totalTimeSeconds > dark.totalTimeSeconds);
  assert.ok(light.recommendedRatio < medium.recommendedRatio);
  assert.ok(medium.recommendedRatio < dark.recommendedRatio);
  assert.equal(light.grindBias, 'finer');
  assert.equal(dark.grindBias, 'coarser');
});

test('buildAiBrewPlan creates a japanese iced plan with split water and derived template disclosure', () => {
  const form = {
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'iced' as const,
    dripperId: 'latina-cono',
    coffeeName: 'QA Iced',
    doseG: '20',
    targetProfileId: 'more_sweetness',
    waterTdsPpm: '70',
    waterHardnessPpm: '35',
    waterAlkalinityPpm: '25',
  };

  const plan = buildAiBrewPlan(form, catalog);

  assert.equal(plan.brewMode, 'iced');
  assert.equal(plan.methodId, 'v60_japanese_iced');
  assert.equal(plan.ratioToolMethodId, 'v60_japanese_iced');
  assert.ok(plan.iceMl > 0);
  assert.ok(plan.hotWaterMl < plan.totalWaterMl);
  assert.equal(plan.finalBeverageRatio, plan.recommendedRatio);
  assert.equal(plan.hotExtractionRatio, Number((plan.hotWaterMl / plan.doseG).toFixed(2)));
  assert.ok(plan.hotExtractionRatio >= 8.8, `Expected hot concentrate >= 1:8.8, got 1:${plan.hotExtractionRatio} (${plan.hotWaterMl} ml / ${plan.doseG} g)`);
  assert.ok(plan.hotExtractionRatio <= 10.8);
  assert.ok(plan.hotWaterSharePercent >= 54);
  assert.ok(plan.hotWaterSharePercent <= 70);
  assert.equal(plan.steps.length, 4);
  assert.deepEqual(plan.steps.map((step) => step.kind), ['pour', 'pour', 'pour', 'pour']);
  assert.ok(plan.steps.every((step) => step.pourVolumeMl > 0), 'Iced V60 hot-water checkpoints should all be real pour steps');
  assert.match(plan.steps[plan.steps.length - 1]?.label || '', /Final Pour/i);
  assert.doesNotMatch(
    buildLocalizedPlanRecipeSteps(plan, 'id').join('\n'),
    /sajikan|pisahkan/i,
    'Iced V60 recipe steps should not turn the final pour into a serve step',
  );
  assert.equal(plan.deviceProfileMode, 'derived_template');
  assert.equal(plan.provenanceAttentionNeeded, true);
  assert.ok(plan.notes.some((note) => /hot concentrate extracts/i.test(note)));
  assert.ok(plan.confidenceNotes.some((note) => /generated from the v60 family template/i.test(note)));
});

test('buildAiBrewPlan treats iced pour-over no-volume finish as drawdown, not a serve step', () => {
  const icedCatalog: AiBrewCatalog = {
    ...catalog,
    drippers: [
      ...catalog.drippers,
      {
        ...catalog.drippers[0],
        id: 'test-v60-iced-finish',
        name: 'Test V60 Iced Finish',
        searchText: 'test v60 iced finish',
        defaultProfileId: 'profile_test_v60_iced_finish',
      },
    ],
    deviceProfiles: [
      ...catalog.deviceProfiles,
      {
        ...catalog.deviceProfiles[0],
        id: 'profile_test_v60_iced_finish',
        label: 'Test V60 Iced Finish',
        brewMode: 'iced',
        dripperIds: ['test-v60-iced-finish'],
        methodFamily: 'v60',
        brewMethodId: 'v60_japanese_iced' as BrewMethodId,
        exactMatch: true,
        ratioDelta: -0.2,
        tempDeltaC: 0.4,
        brewTimeDeltaSec: -8,
        grindBias: 'finer',
        note: 'QA iced profile with a no-volume finish step.',
        steps: [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Wet all grounds.' },
          { id: 'middle', label: 'Middle Pour', share: 0.76, startSeconds: 35, note: 'Build the hot concentrate.' },
          { id: 'serve', label: 'Serve', share: 0, startSeconds: 110, note: 'Let the bed finish draining and serve.' },
        ],
      },
    ],
  };

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(icedCatalog),
    brewMode: 'iced',
    dripperId: 'test-v60-iced-finish',
    coffeeName: 'Iced Drawdown QA',
    doseG: '20',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, icedCatalog);

  const finalStep = plan.steps[plan.steps.length - 1];
  assert.equal(finalStep.kind, 'drawdown');
  assert.equal(finalStep.pourVolumeMl, 0);
  assert.match(finalStep.hybridInstruction || finalStep.note, /drawdown|stir|measured ice/i);
  assert.ok(plan.steps.slice(0, -1).some((step) => step.pourVolumeMl > 0));
});

test('buildAiBrewPlan flags derived grinder baselines for provenance', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Derived Grind',
    grinderId: 'hario-mini-slim',
    waterTdsPpm: '90',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.equal(plan.deviceProfileMode, 'exact');
  assert.equal(plan.grindSettingMode, 'derived_baseline');
  assert.equal(plan.grindSettingVerification, 'fallback');
  assert.equal(plan.provenanceAttentionNeeded, true);
});

test('buildAiBrewPlan target profiles shift ratio, time, and deterministic pour-map structure in the expected direction', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Target Profile QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const balance = buildAiBrewPlan({
    ...baseInput,
    targetProfileId: 'balance_clean',
  }, catalog);
  const sweetness = buildAiBrewPlan({
    ...baseInput,
    targetProfileId: 'more_sweetness',
  }, catalog);
  const acidity = buildAiBrewPlan({
    ...baseInput,
    targetProfileId: 'more_acidity',
  }, catalog);
  const body = buildAiBrewPlan({
    ...baseInput,
    targetProfileId: 'more_body',
  }, catalog);

  assert.equal(balance.targetProfileLabel, 'Balance & Clean');
  assert.equal(sweetness.targetProfileLabel, 'More Sweetness');
  assert.equal(acidity.targetProfileLabel, 'More Acidity');
  assert.equal(body.targetProfileLabel, 'More Body');

  assert.ok(sweetness.recommendedRatio < balance.recommendedRatio);
  assert.ok(body.recommendedRatio < sweetness.recommendedRatio);
  assert.ok(acidity.recommendedRatio > balance.recommendedRatio);

  assert.ok(sweetness.waterTempC >= balance.waterTempC);
  assert.ok(body.waterTempC >= balance.waterTempC);
  assert.ok(acidity.waterTempC <= balance.waterTempC);

  assert.ok(sweetness.totalTimeSeconds > balance.totalTimeSeconds);
  assert.ok(body.totalTimeSeconds >= sweetness.totalTimeSeconds);
  assert.ok(acidity.totalTimeSeconds < balance.totalTimeSeconds);

  const balanceStepStarts = balance.steps.map((step) => step.startSeconds);
  const sweetnessStepStarts = sweetness.steps.map((step) => step.startSeconds);
  const acidityStepStarts = acidity.steps.map((step) => step.startSeconds);

  assert.notDeepEqual(sweetnessStepStarts, balanceStepStarts);
  assert.notDeepEqual(acidityStepStarts, balanceStepStarts);
  assert.ok(sweetnessStepStarts[sweetnessStepStarts.length - 1] > balanceStepStarts[balanceStepStarts.length - 1]);
  assert.ok(acidityStepStarts[acidityStepStarts.length - 1] < balanceStepStarts[balanceStepStarts.length - 1]);

  const getCadenceIntervals = (plan: ReturnType<typeof buildAiBrewPlan>) => {
    const starts = plan.steps.map((step) => step.startSeconds);
    const intervals: number[] = [];
    for (let index = 0; index < starts.length - 1; index += 1) {
      intervals.push(starts[index + 1] - starts[index]);
    }
    intervals.push(plan.totalTimeSeconds - starts[starts.length - 1]);
    return intervals;
  };

  const acidityIntervals = getCadenceIntervals(acidity);
  const bodyIntervals = getCadenceIntervals(body);
  assert.ok(acidityIntervals[acidityIntervals.length - 1] > bodyIntervals[bodyIntervals.length - 1]);
  assert.ok(bodyIntervals[0] >= acidityIntervals[0]);

  const getShareMap = (plan: ReturnType<typeof buildAiBrewPlan>) => plan.steps.map((step) => step.pourVolumeMl / plan.hotWaterMl);
  const balanceShares = getShareMap(balance);
  const sweetnessShares = getShareMap(sweetness);
  const acidityShares = getShareMap(acidity);
  const bodyShares = getShareMap(body);

  assert.ok(bodyShares[0] > balanceShares[0]);
  assert.ok(bodyShares[bodyShares.length - 1] < balanceShares[balanceShares.length - 1]);
  assert.ok(acidityShares[0] < balanceShares[0]);
  assert.ok(acidityShares[acidityShares.length - 1] > balanceShares[balanceShares.length - 1]);
  assert.ok(sweetnessShares[1] > balanceShares[1]);

  assert.match(sweetness.summary, /more sweetness/i);
  assert.match(acidity.summary, /more acidity/i);
  assert.match(body.summary, /more body/i);
});

test('target profile calibration follows stable ids when labels are localized or customized', () => {
  const localizedCatalog: AiBrewCatalog = {
    ...catalog,
    targetProfiles: catalog.targetProfiles?.map((profile) => ({
      ...profile,
      label: profile.id === 'more_acidity'
        ? 'Terang Juicy'
        : profile.id === 'more_body'
          ? 'Tekstur Tebal'
          : profile.id === 'more_sweetness'
            ? 'Manis Bersih'
            : 'Seimbang Harian',
    })),
  };
  const baseInput = {
    ...createDefaultAiBrewFormState(localizedCatalog),
    coffeeName: 'Localized Target QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  };

  const balance = buildAiBrewPlan({ ...baseInput, targetProfileId: 'balance_clean' }, localizedCatalog);
  const acidity = buildAiBrewPlan({ ...baseInput, targetProfileId: 'more_acidity' }, localizedCatalog);
  const sweetness = buildAiBrewPlan({ ...baseInput, targetProfileId: 'more_sweetness' }, localizedCatalog);
  const body = buildAiBrewPlan({ ...baseInput, targetProfileId: 'more_body' }, localizedCatalog);

  assert.equal(acidity.targetProfileLabel, 'Terang Juicy');
  assert.equal(body.targetProfileLabel, 'Tekstur Tebal');
  assert.ok(acidity.recommendedRatio > balance.recommendedRatio);
  assert.ok(body.recommendedRatio < sweetness.recommendedRatio);
  assert.ok(getFinalWindowSeconds(acidity) > getFinalWindowSeconds(body));
  assert.ok(getPourShareMap(body)[0] > getPourShareMap(acidity)[0]);
  assert.ok(getPourShareMap(sweetness)[1] >= getPourShareMap(balance)[1]);
});

test('buildAiBrewPlan requires manual mineral inputs', () => {
  assert.throws(() => {
    buildAiBrewPlan({
      ...createDefaultAiBrewFormState(catalog),
      coffeeName: 'Missing Minerals',
    }, catalog);
  }, /Water TDS is required/);
});

test('buildAiBrewPlan uses autofill brand chemistry and tracks customization provenance', () => {
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Brand Autofill Brew',
    waterBrandId: 'evian-sg',
  }, catalog);

  assert.equal(plan.waterMode, 'brand');
  assert.equal(plan.waterBrandId, 'evian-sg');
  assert.equal(plan.waterBrandLabel, 'Evian');
  assert.equal(plan.waterPresetStatus, 'autofill');
  assert.equal(plan.waterMinerals.tdsPpm, 345);
  assert.ok(plan.confidenceNotes.some((note) => /Water source: Evian/i.test(note)));

  const customized = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Brand Customized Brew',
    waterBrandId: 'evian-sg',
    waterCustomized: true,
    waterTdsPpm: '120',
    waterHardnessPpm: '65',
    waterAlkalinityPpm: '45',
  }, catalog);

  assert.equal(customized.waterCustomized, true);
  assert.equal(customized.waterMinerals.tdsPpm, 120);
  assert.ok(customized.notes.some((note) => /adjusted manually/i.test(note)));
});

test('manual-required water brands preserve provenance but still require minerals', () => {
  assert.throws(() => {
    buildAiBrewPlan({
      ...createDefaultAiBrewFormState(catalog),
      coffeeName: 'Aqua Manual Required',
      waterBrandId: 'aqua-id',
    }, catalog);
  }, /Water TDS is required/);

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Aqua Manual Ready',
    waterBrandId: 'aqua-id',
    waterTdsPpm: '92',
    waterHardnessPpm: '54',
    waterAlkalinityPpm: '38',
  }, catalog);

  assert.equal(plan.waterBrandLabel, 'Aqua');
  assert.equal(plan.waterPresetStatus, 'manual_required');
});

test('bean profile fields apply bounded deterministic modifiers', () => {
  const baseline = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Bean Baseline',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  const adjusted = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Bean Adjusted',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    altitudeMasl: '1950',
    beanDensityGml: '0.74',
    roastDevelopment: 'underdeveloped',
    solubility: 'low',
  }, catalog);

  assert.equal(adjusted.beanProfile.active, true);
  assert.equal(adjusted.beanProfile.roastDevelopment, 'underdeveloped');
  assert.equal(adjusted.beanProfile.solubility, 'low');
  assert.notEqual(adjusted.recommendedRatio, baseline.recommendedRatio);
  assert.notEqual(adjusted.totalTimeSeconds, baseline.totalTimeSeconds);
  assert.notEqual(adjusted.grindBias, baseline.grindBias);

  const baselineShares = baseline.steps.map((step) => step.pourVolumeMl / baseline.hotWaterMl);
  const adjustedShares = adjusted.steps.map((step) => step.pourVolumeMl / adjusted.hotWaterMl);
  assert.ok(adjustedShares[0] < baselineShares[0]);
  assert.ok(adjustedShares[adjustedShares.length - 1] > baselineShares[baselineShares.length - 1]);

  const easyExtraction = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Bean Easy Extraction',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    roastDevelopment: 'developed',
    solubility: 'high',
  }, catalog);

  const easyShares = easyExtraction.steps.map((step) => step.pourVolumeMl / easyExtraction.hotWaterMl);
  assert.ok(easyShares[0] > baselineShares[0]);
  assert.ok(easyShares[easyShares.length - 1] < baselineShares[baselineShares.length - 1]);

  const adjustedAgain = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Bean Adjusted',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    altitudeMasl: '1950',
    beanDensityGml: '0.74',
    roastDevelopment: 'underdeveloped',
    solubility: 'low',
  }, catalog);

  assert.equal(adjusted.recommendedRatio, adjustedAgain.recommendedRatio);
  assert.equal(adjusted.waterTempC, adjustedAgain.waterTempC);
  assert.equal(adjusted.totalTimeSeconds, adjustedAgain.totalTimeSeconds);
  assert.equal(adjusted.grindRecommendation, adjustedAgain.grindRecommendation);
  assert.deepEqual(adjusted.steps.map((step) => step.pourVolumeMl), adjustedAgain.steps.map((step) => step.pourVolumeMl));
});

test('curated process and variety rules affect recipe math when available', () => {
  const neutral = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Neutral Brew',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  const expressive = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Expressive Brew',
    process: 'natural',
    variety: 'geisha',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.notEqual(expressive.recommendedRatio, neutral.recommendedRatio);
  assert.notEqual(expressive.totalTimeSeconds, neutral.totalTimeSeconds);
  assert.notEqual(expressive.grindBias, neutral.grindBias);
});

test('coffee origin cues steer neutral AI Brew plans in sensible directions', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
  };

  const eastAfrica = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Ethiopia Yirgacheffe QA',
  }, catalog);
  const brazil = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Brazil Cerrado QA',
  }, catalog);

  assertPlanEnvelope(eastAfrica);
  assertPlanEnvelope(brazil);
  assert.ok(eastAfrica.recommendedRatio > brazil.recommendedRatio);
  assert.ok(eastAfrica.waterTempC <= brazil.waterTempC);
  assert.ok(eastAfrica.totalTimeSeconds <= brazil.totalTimeSeconds);
  assert.ok(eastAfrica.confidenceNotes.some((note) => /origin cue recognized/i.test(note)));
  assert.ok(brazil.confidenceNotes.some((note) => /origin cue recognized/i.test(note)));
});

test('dose size calibrates ratio, temperature, time, and grind direction', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Dose Calibration QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
  };

  const lowDose = buildAiBrewPlan({
    ...baseInput,
    doseG: '12',
  }, catalog);
  const highDose = buildAiBrewPlan({
    ...baseInput,
    doseG: '24',
  }, catalog);

  assertPlanEnvelope(lowDose);
  assertPlanEnvelope(highDose);
  assert.ok(lowDose.recommendedRatio < highDose.recommendedRatio);
  assert.ok(lowDose.waterTempC > highDose.waterTempC);
  assert.ok(lowDose.totalTimeSeconds > highDose.totalTimeSeconds);
  assert.notEqual(lowDose.grindBias, highDose.grindBias);
  assert.ok(lowDose.confidenceNotes.some((note) => /dose calibration active/i.test(note)));
  assert.ok(highDose.confidenceNotes.some((note) => /dose calibration active/i.test(note)));
});

test('iced split adapts to target and coffee context instead of staying static', () => {
  const clarityIced = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Ethiopia Yirgacheffe Iced',
    brewMode: 'iced',
    roastLevel: 'light',
    targetProfileId: 'more_acidity',
    process: 'washed',
    waterMode: 'manual',
    waterTdsPpm: '80',
    waterHardnessPpm: '40',
    waterAlkalinityPpm: '28',
  }, catalog);
  const sweetnessIced = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Brazil Cerrado Iced',
    brewMode: 'iced',
    roastLevel: 'medium',
    targetProfileId: 'more_sweetness',
    process: 'natural',
    waterMode: 'manual',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  const clarityShare = clarityIced.hotWaterMl / clarityIced.totalWaterMl;
  const sweetnessShare = sweetnessIced.hotWaterMl / sweetnessIced.totalWaterMl;

  assert.ok(clarityShare < sweetnessShare);
  assert.ok(clarityIced.iceMl > 0);
  assert.ok(sweetnessIced.iceMl > 0);
});

test('method-family signatures produce distinct AI Brew envelopes and sequence maps', () => {
  const familyCatalog: AiBrewCatalog = {
    ...catalog,
    drippers: [
      ...catalog.drippers,
      {
        id: 'chemex-three-cup',
        kind: 'dripper',
        name: 'Chemex Three Cup',
        brand: 'Chemex',
        typeLabel: 'Glass Brewer',
        description: 'Test Chemex brewer.',
        searchText: 'chemex three cup glass brewer',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/chemex'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'chemex',
        defaultProfileId: 'profile_chemex_hot',
      },
      {
        id: 'kalita-wave-185',
        kind: 'dripper',
        name: 'Kalita Wave 185',
        brand: 'Kalita',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Test Kalita brewer.',
        searchText: 'kalita wave 185 flat bottom dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/kalita'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'kalita_wave',
        defaultProfileId: 'profile_kalita_hot',
      },
      {
        id: 'april-brewer-test',
        kind: 'dripper',
        name: 'April Brewer Test',
        brand: 'April',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Test April brewer.',
        searchText: 'april brewer flat bottom dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/april'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'april',
        defaultProfileId: 'profile_april_hot',
      },
      {
        id: 'clever-dripper-test',
        kind: 'dripper',
        name: 'Clever Dripper Test',
        brand: 'Clever',
        typeLabel: 'Immersion Dripper',
        description: 'Test Clever brewer.',
        searchText: 'clever dripper immersion',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/clever'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'clever_dripper',
        defaultProfileId: 'profile_clever_hot',
      },
    ],
    deviceProfiles: [
      ...catalog.deviceProfiles,
      {
        id: 'profile_chemex_hot',
        label: 'Chemex Hot',
        brewMode: 'hot',
        dripperIds: ['chemex-three-cup'],
        methodFamily: 'chemex',
        brewMethodId: 'chemex',
        exactMatch: true,
        filterStyle: 'cone',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Chemex baseline.',
        steps: [
          { id: 'bloom', label: 'Bloom', share: 0.24, startSeconds: 0, note: 'Charge evenly.' },
          { id: 'main_1', label: 'Main Pour', share: 0.38, startSeconds: 45, note: 'Build the slurry.' },
          { id: 'main_2', label: 'Second Main', share: 0.22, startSeconds: 110, note: 'Keep filter wall clean.' },
          { id: 'finish', label: 'Finish', share: 0.16, startSeconds: 170, note: 'Finish to target.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/chemex-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_kalita_hot',
        label: 'Kalita Hot',
        brewMode: 'hot',
        dripperIds: ['kalita-wave-185'],
        methodFamily: 'kalita_wave',
        brewMethodId: 'kalita_wave',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Kalita baseline.',
        steps: [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Even saturation.' },
          { id: 'center', label: 'Center Pour', share: 0.39, startSeconds: 38, note: 'Keep bed level.' },
          { id: 'finish', label: 'Finish', share: 0.39, startSeconds: 98, note: 'Close evenly.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/kalita-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_april_hot',
        label: 'April Hot',
        brewMode: 'hot',
        dripperIds: ['april-brewer-test'],
        methodFamily: 'april',
        brewMethodId: 'april',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact April baseline.',
        steps: [
          { id: 'pulse_1', label: 'Pulse 1', share: 0.34, startSeconds: 0, note: 'First pulse.' },
          { id: 'pulse_2', label: 'Pulse 2', share: 0.33, startSeconds: 38, note: 'Second pulse.' },
          { id: 'pulse_3', label: 'Pulse 3', share: 0.33, startSeconds: 82, note: 'Third pulse.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/april-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_clever_hot',
        label: 'Clever Hot',
        brewMode: 'hot',
        dripperIds: ['clever-dripper-test'],
        methodFamily: 'clever_dripper',
        brewMethodId: 'clever_dripper',
        exactMatch: true,
        filterStyle: 'immersion',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Clever baseline.',
        steps: [
          { id: 'charge', label: 'Charge', share: 0.5, startSeconds: 0, note: 'Start immersion.' },
          { id: 'top_up', label: 'Top Up', share: 0.3, startSeconds: 45, note: 'Complete water charge.' },
          { id: 'release', label: 'Release', share: 0.2, startSeconds: 120, note: 'Release to cup.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/clever-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
    ],
  };

  const baseInput = {
    ...createDefaultAiBrewFormState(familyCatalog),
    coffeeName: 'Family Signature QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
    roastLevel: 'medium_light' as const,
    doseG: '15',
  };

  const v60 = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'hario-v60',
  }, familyCatalog);
  const chemex = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'chemex-three-cup',
  }, familyCatalog);
  const kalita = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'kalita-wave-185',
  }, familyCatalog);
  const april = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'april-brewer-test',
  }, familyCatalog);
  const clever = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'clever-dripper-test',
  }, familyCatalog);

  assertPlanEnvelope(v60);
  assertPlanEnvelope(chemex);
  assertPlanEnvelope(kalita);
  assertPlanEnvelope(april);
  assertPlanEnvelope(clever);

  assert.ok(chemex.recommendedRatio > v60.recommendedRatio);
  assert.ok(chemex.totalTimeSeconds > v60.totalTimeSeconds);
  assert.ok(april.totalTimeSeconds < kalita.totalTimeSeconds);
  assert.ok(april.recommendedRatio > kalita.recommendedRatio);
  assert.ok(clever.recommendedRatio < v60.recommendedRatio);
  assert.ok(clever.totalTimeSeconds > v60.totalTimeSeconds);

  const v60Shares = v60.steps.map((step) => step.pourVolumeMl / v60.hotWaterMl);
  const kalitaShares = kalita.steps.map((step) => step.pourVolumeMl / kalita.hotWaterMl);
  const cleverShares = clever.steps.map((step) => step.pourVolumeMl / clever.hotWaterMl);

  assert.ok(v60Shares[v60Shares.length - 1] > v60Shares[0]);
  assert.ok(kalitaShares[1] > v60Shares[1]);
  assert.ok(cleverShares[0] > cleverShares[cleverShares.length - 1]);

  assert.match(v60.steps[0].note, /cone drain cleanly/i);
  assert.match(kalita.steps[1].hybridInstruction || '', /flat bed|bed level/i);
  assert.match(april.steps[1].hybridInstruction || '', /low-agitation|quick, settled opening|pulse/i);
  assert.match(chemex.steps[0].hybridInstruction || '', /thick chemex paper|thick filter/i);
  assert.match(clever.steps[clever.steps.length - 1].hybridInstruction || '', /open the valve|bed release/i);
  assert.notEqual(v60.steps[0].note, chemex.steps[0].note);
  assert.notEqual(kalita.steps[kalita.steps.length - 1].note, april.steps[april.steps.length - 1].note);

  assert.ok(chemex.confidenceNotes.some((note) => /method-family signature active: chemex/i.test(note)));
  assert.ok(april.confidenceNotes.some((note) => /method-family signature active: april/i.test(note)));
  assert.ok(clever.confidenceNotes.some((note) => /method-family signature active: clever dripper/i.test(note)));
});

test('all supported dripper families stay production-safe across hot and iced flows', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const baseInput = {
    ...createDefaultAiBrewFormState(fullFamilyCatalog),
    coffeeName: 'All Family QA',
    process: 'washed',
    variety: 'bourbon',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    targetProfileId: 'balance_clean',
    roastLevel: 'medium_light' as const,
    doseG: '15',
  };

  const plans = new Map<string, ReturnType<typeof buildAiBrewPlan>>();

  for (const targetProfileId of TARGET_PROFILE_MATRIX_IDS) {
    for (const brewMode of ['hot', 'iced'] as const) {
      for (const familyCase of ALL_METHOD_FAMILY_CASES) {
        const plan = buildAiBrewPlan({
          ...baseInput,
          targetProfileId,
          brewMode,
          dripperId: familyCase.dripperId,
        }, fullFamilyCatalog);

        plans.set(`${targetProfileId}:${brewMode}:${familyCase.family}`, plan);

        assertPlanEnvelope(plan);
        assert.equal(plan.methodFamily, familyCase.family);
        assert.equal(plan.targetProfileId, targetProfileId);
        assert.equal(
          plan.methodId,
          resolveExpectedRatioToolMethodIdForFamily(familyCase.family, brewMode),
        );
        assert.equal(
          plan.ratioToolMethodId,
          resolveExpectedRatioToolMethodIdForFamily(familyCase.family, brewMode),
        );
        assert.match(collectPlanNarrative(plan), familyCase.cue);
        assert.ok(
          plan.confidenceNotes.some((note) =>
            note.toLowerCase().includes(`method-family signature active: ${familyCase.family.replace(/_/g, ' ')}`)
          ),
        );

        if (brewMode === 'hot') {
          assert.equal(plan.iceMl, 0);
          assert.equal(plan.hotWaterMl, plan.totalWaterMl);
          assert.equal(plan.hotExtractionRatio, plan.recommendedRatio);
        } else {
          assert.ok(plan.iceMl > 0);
          assert.ok(plan.hotWaterMl < plan.totalWaterMl);
          assert.ok(plan.hotExtractionRatio < plan.finalBeverageRatio);
          assert.match(plan.summary, /final ratio 1:[\d.]+ with hot concentrate 1:[\d.]+/i);
        }

        const indonesianRecipeSteps = buildLocalizedPlanRecipeSteps(plan, 'id').join('\n');
        assert.doesNotMatch(indonesianRecipeSteps, /\btuang\s+0\b|\bpour\s+0\b/i);

        if (familyCase.family === 'clever_dripper') {
          const pourSteps = plan.steps.filter((step) => (step.kind || 'pour') === 'pour');
          assert.equal(pourSteps.length, 1);
          assert.equal(pourSteps[0].pourVolumeMl, plan.hotWaterMl);
          assert.ok(plan.steps.some((step) => step.kind === 'wait'));
          assert.ok(plan.steps.some((step) => step.kind === 'release'));
          assert.ok(plan.steps.every((step) => step.kind === 'pour' || step.pourVolumeMl === 0));
          assert.match(indonesianRecipeSteps, /tahan kontak|buka release/i);
        } else {
          assert.ok(plan.steps.every((step) => (step.kind || 'pour') === 'pour'));
          assert.ok(plan.steps.every((step) => step.pourVolumeMl > 0));
          assert.ok(getFinalWindowSeconds(plan) >= (brewMode === 'iced' ? 24 : 28));
        }
      }
    }
  }

  const getPlan = (brewMode: 'hot' | 'iced', family: AiBrewMethodFamily, targetProfileId = 'balance_clean') =>
    plans.get(`${targetProfileId}:${brewMode}:${family}`)!;
  const getIcedShare = (family: AiBrewMethodFamily) => getPlan('iced', family).hotWaterMl / getPlan('iced', family).totalWaterMl;

  assert.ok(getIcedShare('chemex') > getIcedShare('v60'));
  assert.ok(getIcedShare('clever_dripper') > getIcedShare('april'));
  assert.ok(getIcedShare('melitta') > getIcedShare('origami'));
  assert.ok(
    getIcedShare('kono') > getIcedShare('origami'),
    `Expected rounded Kono hot split to stay above Origami, got Kono ${getIcedShare('kono')} and Origami ${getIcedShare('origami')}`,
  );

  assert.ok(getPlan('hot', 'chemex').recommendedRatio > getPlan('hot', 'v60').recommendedRatio);
  assert.ok(getPlan('hot', 'april').totalTimeSeconds < getPlan('hot', 'kalita_wave').totalTimeSeconds);
  assert.ok(getPlan('hot', 'clever_dripper').totalTimeSeconds > getPlan('hot', 'v60').totalTimeSeconds);
  assert.ok(getPlan('hot', 'kono').totalTimeSeconds > getPlan('hot', 'origami').totalTimeSeconds);
  assert.ok(getPlan('hot', 'melitta').totalTimeSeconds >= getPlan('hot', 'kalita_wave').totalTimeSeconds);
  assert.ok(getFinalWindowSeconds(getPlan('hot', 'v60', 'more_acidity')) > getFinalWindowSeconds(getPlan('hot', 'v60', 'more_body')));
  assert.ok(getPourShareMap(getPlan('hot', 'v60', 'more_body'))[0] > getPourShareMap(getPlan('hot', 'v60', 'more_acidity'))[0]);
});

test('exact device profiles can own the ratio tool method id without losing family cues', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const sourceProfile = fullFamilyCatalog.deviceProfiles.find((profile) => profile.id === 'profile_matrix-v60-all_hot');
  assert.ok(sourceProfile);

  const overrideCatalog: AiBrewCatalog = {
    ...fullFamilyCatalog,
    drippers: fullFamilyCatalog.drippers.map((dripper) =>
      dripper.id === 'matrix-v60-all'
        ? { ...dripper, defaultProfileId: 'profile_matrix-v60-flat-override_hot' }
        : dripper
    ),
    deviceProfiles: [
      ...fullFamilyCatalog.deviceProfiles,
      {
        ...sourceProfile,
        id: 'profile_matrix-v60-flat-override_hot',
        label: 'V60 Flat Filter Override Hot',
        dripperIds: ['matrix-v60-all'],
        methodFamily: 'v60',
        brewMethodId: 'kalita_wave',
        filterStyle: 'flat',
        exactMatch: true,
      },
    ],
  };

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(overrideCatalog),
    coffeeName: 'Profile Override QA',
    dripperId: 'matrix-v60-all',
    targetProfileId: 'balance_clean',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, overrideCatalog);

  assert.equal(plan.methodFamily, 'v60');
  assert.equal(plan.methodId, 'kalita_wave');
  assert.equal(plan.ratioToolMethodId, 'kalita_wave');
  assert.match(collectPlanNarrative(plan), /cone drain cleanly|center-to-mid/i);
});

test('single-step clever charge-release profiles expand into timer-safe hold and release checkpoints', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const overrideCatalog: AiBrewCatalog = {
    ...fullFamilyCatalog,
    deviceProfiles: fullFamilyCatalog.deviceProfiles.map((profile) =>
      profile.id === 'profile_matrix-clever-all_iced'
        ? {
          ...profile,
          steps: [
            {
              id: 'charge_release',
              label: 'Charge and Release',
              share: 1,
              startSeconds: 0,
              note: 'Charge full hot-water target, steep briefly, then release over ice.',
            },
          ],
        }
        : profile
    ),
  };

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(overrideCatalog),
    coffeeName: 'Single Step Clever QA',
    brewMode: 'iced',
    dripperId: 'matrix-clever-all',
    targetProfileId: 'balance_clean',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, overrideCatalog);

  assertPlanEnvelope(plan);
  assert.deepEqual(plan.steps.map((step) => step.kind), ['pour', 'wait', 'release']);
  assert.equal(plan.steps[0].pourVolumeMl, plan.hotWaterMl);
  assert.equal(plan.steps[1].pourVolumeMl, 0);
  assert.equal(plan.steps[2].pourVolumeMl, 0);
  assert.ok(plan.steps[1].startSeconds > 0);
  assert.ok(plan.steps[2].startSeconds > plan.steps[1].startSeconds);
  assert.doesNotMatch(buildLocalizedPlanRecipeSteps(plan, 'id').join('\n'), /\btuang\s+0\b|\bpour\s+0\b/i);
});

test('extraction finisher adapts watchpoints and rescue actions by dripper family', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const baseInput = {
    ...createDefaultAiBrewFormState(fullFamilyCatalog),
    coffeeName: 'Family Dial-In QA',
    process: 'washed',
    variety: 'bourbon',
    targetProfileId: 'more_sweetness',
    roastLevel: 'medium_light' as const,
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    doseG: '15',
  };

  const chemexHot = buildAiBrewPlan({
    ...baseInput,
    brewMode: 'hot',
    dripperId: 'matrix-chemex-all',
  }, fullFamilyCatalog);
  const cleverIced = buildAiBrewPlan({
    ...baseInput,
    brewMode: 'iced',
    dripperId: 'matrix-clever-all',
  }, fullFamilyCatalog);

  const chemexFinisher = buildExtractionFinisher(chemexHot, 'en');
  const cleverFinisher = buildExtractionFinisher(cleverIced, 'en');

  assert.ok(chemexFinisher.controlPoints.some((item) => /thick filter wall|thick filter/i.test(item)));
  assert.ok(cleverFinisher.controlPoints.some((item) => /immersion stay calm|release cleanly/i.test(item)));

  const chemexSour = chemexFinisher.adjustments.find((item) => item.taste === 'sour');
  const cleverSour = cleverFinisher.adjustments.find((item) => item.taste === 'sour');
  const chemexBitter = chemexFinisher.adjustments.find((item) => item.taste === 'bitter');
  const cleverBitter = cleverFinisher.adjustments.find((item) => item.taste === 'bitter');

  assert.match(chemexSour?.action || '', /bloom|filter wall|temperature/i);
  assert.match(cleverSour?.action || '', /steep|release/i);
  assert.match(chemexBitter?.action || '', /filter wall|paper|temperature/i);
  assert.match(cleverBitter?.action || '', /release|temperature/i);
  assert.notEqual(chemexSour?.action, cleverSour?.action);
  assert.notEqual(chemexBitter?.action, cleverBitter?.action);
});

test('deterministic ai coach markdown stays localized and family-aware', () => {
  const fullFamilyCatalog = buildAllMethodFamilyCatalog();
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(fullFamilyCatalog),
    coffeeName: 'Kono QA',
    process: 'washed',
    variety: 'bourbon',
    brewMode: 'iced',
    dripperId: 'matrix-kono-all',
    targetProfileId: 'more_sweetness',
    roastLevel: 'medium_light',
    waterTdsPpm: '92',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '38',
    doseG: '15',
  }, fullFamilyCatalog);

  const explainMarkdown = buildDeterministicAiCoachMarkdown(plan, 'explain', 'id');
  const troubleshootMarkdown = buildDeterministicAiCoachMarkdown(plan, 'troubleshoot', 'id');
  const adjustMarkdown = buildDeterministicAiCoachMarkdown(plan, 'adjust', 'id');

  assert.match(explainMarkdown, /## Ringkasan/);
  assert.match(explainMarkdown, /jalur tuang lebih terpusat|sweet contact/i);
  assert.match(troubleshootMarkdown, /## Watchpoint/);
  assert.match(troubleshootMarkdown, /## Jika Asam/);
  assert.match(troubleshootMarkdown, /panas \/ .* es|Jangan ubah split/i);
  assert.match(adjustMarkdown, /## Geser dari/);
  assert.match(adjustMarkdown, /## Aturan Dial-In/);
  assert.match(adjustMarkdown, /lebih terpusat|sweet contact/i);
});

test('target-method calibration makes the same target behave differently across dripper families', () => {
  const matrixCatalog: AiBrewCatalog = {
    ...catalog,
    drippers: [
      ...catalog.drippers,
      {
        id: 'kalita-wave-185-matrix',
        kind: 'dripper',
        name: 'Kalita Wave 185 Matrix',
        brand: 'Kalita',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Matrix Kalita brewer.',
        searchText: 'kalita wave 185 matrix dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/kalita-matrix'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'kalita_wave',
        defaultProfileId: 'profile_kalita_hot_matrix',
      },
      {
        id: 'april-brewer-matrix',
        kind: 'dripper',
        name: 'April Brewer Matrix',
        brand: 'April',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Matrix April brewer.',
        searchText: 'april brewer matrix dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/april-matrix'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'april',
        defaultProfileId: 'profile_april_hot_matrix',
      },
      {
        id: 'clever-dripper-matrix',
        kind: 'dripper',
        name: 'Clever Dripper Matrix',
        brand: 'Clever',
        typeLabel: 'Immersion Dripper',
        description: 'Matrix Clever brewer.',
        searchText: 'clever dripper matrix immersion',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/clever-matrix'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'clever_dripper',
        defaultProfileId: 'profile_clever_hot_matrix',
      },
    ],
    deviceProfiles: [
      ...catalog.deviceProfiles,
      {
        id: 'profile_kalita_hot_matrix',
        label: 'Kalita Hot Matrix',
        brewMode: 'hot',
        dripperIds: ['kalita-wave-185-matrix'],
        methodFamily: 'kalita_wave',
        brewMethodId: 'kalita_wave',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Kalita matrix baseline.',
        steps: [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Even saturation.' },
          { id: 'center', label: 'Center Pour', share: 0.39, startSeconds: 38, note: 'Keep bed level.' },
          { id: 'finish', label: 'Finish', share: 0.39, startSeconds: 98, note: 'Close evenly.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/kalita-matrix-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_april_hot_matrix',
        label: 'April Hot Matrix',
        brewMode: 'hot',
        dripperIds: ['april-brewer-matrix'],
        methodFamily: 'april',
        brewMethodId: 'april',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact April matrix baseline.',
        steps: [
          { id: 'pulse_1', label: 'Pulse 1', share: 0.34, startSeconds: 0, note: 'First pulse.' },
          { id: 'pulse_2', label: 'Pulse 2', share: 0.33, startSeconds: 38, note: 'Second pulse.' },
          { id: 'pulse_3', label: 'Pulse 3', share: 0.33, startSeconds: 82, note: 'Third pulse.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/april-matrix-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_clever_hot_matrix',
        label: 'Clever Hot Matrix',
        brewMode: 'hot',
        dripperIds: ['clever-dripper-matrix'],
        methodFamily: 'clever_dripper',
        brewMethodId: 'clever_dripper',
        exactMatch: true,
        filterStyle: 'immersion',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Clever matrix baseline.',
        steps: [
          { id: 'charge', label: 'Charge', share: 0.5, startSeconds: 0, note: 'Start immersion.' },
          { id: 'top_up', label: 'Top Up', share: 0.3, startSeconds: 45, note: 'Complete water charge.' },
          { id: 'release', label: 'Release', share: 0.2, startSeconds: 120, note: 'Release to cup.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/clever-matrix-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
    ],
  };

  const baseInput = {
    ...createDefaultAiBrewFormState(matrixCatalog),
    coffeeName: 'Target Method Matrix QA',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    roastLevel: 'medium_light' as const,
    doseG: '15',
  };

  const v60Acidity = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'hario-v60',
    targetProfileId: 'more_acidity',
  }, matrixCatalog);
  const kalitaAcidity = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'kalita-wave-185-matrix',
    targetProfileId: 'more_acidity',
  }, matrixCatalog);
  const v60Body = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'hario-v60',
    targetProfileId: 'more_body',
  }, matrixCatalog);
  const kalitaBody = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'kalita-wave-185-matrix',
    targetProfileId: 'more_body',
  }, matrixCatalog);
  const aprilSweetness = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'april-brewer-matrix',
    targetProfileId: 'more_sweetness',
  }, matrixCatalog);
  const cleverSweetness = buildAiBrewPlan({
    ...baseInput,
    dripperId: 'clever-dripper-matrix',
    targetProfileId: 'more_sweetness',
  }, matrixCatalog);

  assertPlanEnvelope(v60Acidity);
  assertPlanEnvelope(kalitaAcidity);
  assertPlanEnvelope(v60Body);
  assertPlanEnvelope(kalitaBody);
  assertPlanEnvelope(aprilSweetness);
  assertPlanEnvelope(cleverSweetness);

  const getShareMap = (plan: ReturnType<typeof buildAiBrewPlan>) => plan.steps.map((step) => step.pourVolumeMl / plan.hotWaterMl);
  const v60AcidityShares = getShareMap(v60Acidity);
  const kalitaAcidityShares = getShareMap(kalitaAcidity);
  const v60BodyShares = getShareMap(v60Body);
  const kalitaBodyShares = getShareMap(kalitaBody);
  const aprilSweetnessShares = getShareMap(aprilSweetness);
  const cleverSweetnessShares = getShareMap(cleverSweetness);

  assert.ok(v60Acidity.recommendedRatio > kalitaAcidity.recommendedRatio);
  assert.ok(v60AcidityShares[v60AcidityShares.length - 1] > kalitaAcidityShares[kalitaAcidityShares.length - 1]);
  assert.ok(kalitaBody.totalTimeSeconds > v60Body.totalTimeSeconds);
  assert.ok(kalitaBodyShares[1] > v60BodyShares[1]);
  assert.ok(aprilSweetness.totalTimeSeconds < cleverSweetness.totalTimeSeconds);
  assert.ok(cleverSweetnessShares[0] > aprilSweetnessShares[0]);
  assert.ok(aprilSweetnessShares[1] >= cleverSweetnessShares[1]);

  assert.ok(kalitaBody.confidenceNotes.some((note) => /target-method calibration active: body x kalita wave/i.test(note)));
  assert.ok(aprilSweetness.confidenceNotes.some((note) => /target-method calibration active: sweetness x april/i.test(note)));
  assert.ok(cleverSweetness.confidenceNotes.some((note) => /target-method calibration active: sweetness x clever dripper/i.test(note)));
});

test('origin-target-method calibration makes origin cues react differently across dripper families', () => {
  const originCatalog: AiBrewCatalog = {
    ...catalog,
    drippers: [
      ...catalog.drippers,
      {
        id: 'kalita-wave-185-origin',
        kind: 'dripper',
        name: 'Kalita Wave 185 Origin',
        brand: 'Kalita',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Origin Kalita brewer.',
        searchText: 'kalita wave 185 origin dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/kalita-origin'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'kalita_wave',
        defaultProfileId: 'profile_kalita_hot_origin',
      },
      {
        id: 'april-brewer-origin',
        kind: 'dripper',
        name: 'April Brewer Origin',
        brand: 'April',
        typeLabel: 'Flat Bottom Dripper',
        description: 'Origin April brewer.',
        searchText: 'april brewer origin dripper',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/april-origin'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'april',
        defaultProfileId: 'profile_april_hot_origin',
      },
      {
        id: 'clever-dripper-origin',
        kind: 'dripper',
        name: 'Clever Dripper Origin',
        brand: 'Clever',
        typeLabel: 'Immersion Dripper',
        description: 'Origin Clever brewer.',
        searchText: 'clever dripper origin immersion',
        catalogVersion: 'test-v2',
        source: 'test',
        sourceUrls: ['https://example.com/clever-origin'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        methodFamily: 'clever_dripper',
        defaultProfileId: 'profile_clever_hot_origin',
      },
    ],
    deviceProfiles: [
      ...catalog.deviceProfiles,
      {
        id: 'profile_kalita_hot_origin',
        label: 'Kalita Hot Origin',
        brewMode: 'hot',
        dripperIds: ['kalita-wave-185-origin'],
        methodFamily: 'kalita_wave',
        brewMethodId: 'kalita_wave',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Kalita origin baseline.',
        steps: [
          { id: 'bloom', label: 'Bloom', share: 0.22, startSeconds: 0, note: 'Even saturation.' },
          { id: 'center', label: 'Center Pour', share: 0.39, startSeconds: 38, note: 'Keep bed level.' },
          { id: 'finish', label: 'Finish', share: 0.39, startSeconds: 98, note: 'Close evenly.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/kalita-origin-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_april_hot_origin',
        label: 'April Hot Origin',
        brewMode: 'hot',
        dripperIds: ['april-brewer-origin'],
        methodFamily: 'april',
        brewMethodId: 'april',
        exactMatch: true,
        filterStyle: 'flat',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact April origin baseline.',
        steps: [
          { id: 'pulse_1', label: 'Pulse 1', share: 0.34, startSeconds: 0, note: 'First pulse.' },
          { id: 'pulse_2', label: 'Pulse 2', share: 0.33, startSeconds: 38, note: 'Second pulse.' },
          { id: 'pulse_3', label: 'Pulse 3', share: 0.33, startSeconds: 82, note: 'Third pulse.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/april-origin-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'specialty_common',
        marketSegment: 'specialty_mainstream',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
      {
        id: 'profile_clever_hot_origin',
        label: 'Clever Hot Origin',
        brewMode: 'hot',
        dripperIds: ['clever-dripper-origin'],
        methodFamily: 'clever_dripper',
        brewMethodId: 'clever_dripper',
        exactMatch: true,
        filterStyle: 'immersion',
        ratioDelta: 0,
        tempDeltaC: 0,
        brewTimeDeltaSec: 0,
        grindBias: 'same',
        note: 'Exact Clever origin baseline.',
        steps: [
          { id: 'charge', label: 'Charge', share: 0.5, startSeconds: 0, note: 'Start immersion.' },
          { id: 'top_up', label: 'Top Up', share: 0.3, startSeconds: 45, note: 'Complete water charge.' },
          { id: 'release', label: 'Release', share: 0.2, startSeconds: 120, note: 'Release to cup.' },
        ],
        source: 'test',
        sourceUrls: ['https://example.com/clever-origin-profile'],
        verificationLevel: 'official',
        verifiedAt: '2026-03-09',
        popularityTier: 'widely_used',
        marketSegment: 'mass_market',
        releaseStatus: 'established',
        confidence: 'high',
        catalogVersion: 'test-v2',
      },
    ],
  };

  const baseInput = {
    ...createDefaultAiBrewFormState(originCatalog),
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
    roastLevel: 'medium_light' as const,
    doseG: '15',
  };

  const ethiopiaV60Acidity = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Ethiopia Yirgacheffe QA',
    dripperId: 'hario-v60',
    targetProfileId: 'more_acidity',
  }, originCatalog);
  const ethiopiaKalitaAcidity = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Ethiopia Yirgacheffe QA',
    dripperId: 'kalita-wave-185-origin',
    targetProfileId: 'more_acidity',
  }, originCatalog);
  const brazilAprilSweetness = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Brazil Cerrado QA',
    dripperId: 'april-brewer-origin',
    targetProfileId: 'more_sweetness',
  }, originCatalog);
  const brazilCleverSweetness = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Brazil Cerrado QA',
    dripperId: 'clever-dripper-origin',
    targetProfileId: 'more_sweetness',
  }, originCatalog);
  const gayoV60Body = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Gayo Sumatra QA',
    dripperId: 'hario-v60',
    targetProfileId: 'more_body',
  }, originCatalog);
  const gayoKalitaBody = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Gayo Sumatra QA',
    dripperId: 'kalita-wave-185-origin',
    targetProfileId: 'more_body',
  }, originCatalog);
  const yunnanV60Balanced = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Yunnan China QA',
    dripperId: 'hario-v60',
    targetProfileId: 'balance_clean',
  }, originCatalog);
  const yunnanKalitaBalanced = buildAiBrewPlan({
    ...baseInput,
    coffeeName: 'Yunnan China QA',
    dripperId: 'kalita-wave-185-origin',
    targetProfileId: 'balance_clean',
  }, originCatalog);

  assertPlanEnvelope(ethiopiaV60Acidity);
  assertPlanEnvelope(ethiopiaKalitaAcidity);
  assertPlanEnvelope(brazilAprilSweetness);
  assertPlanEnvelope(brazilCleverSweetness);
  assertPlanEnvelope(gayoV60Body);
  assertPlanEnvelope(gayoKalitaBody);
  assertPlanEnvelope(yunnanV60Balanced);
  assertPlanEnvelope(yunnanKalitaBalanced);

  const getShareMap = (plan: ReturnType<typeof buildAiBrewPlan>) => plan.steps.map((step) => step.pourVolumeMl / plan.hotWaterMl);

  const ethiopiaV60Shares = getShareMap(ethiopiaV60Acidity);
  const ethiopiaKalitaShares = getShareMap(ethiopiaKalitaAcidity);
  const brazilAprilShares = getShareMap(brazilAprilSweetness);
  const brazilCleverShares = getShareMap(brazilCleverSweetness);
  const gayoV60Shares = getShareMap(gayoV60Body);
  const gayoKalitaShares = getShareMap(gayoKalitaBody);
  const yunnanV60Shares = getShareMap(yunnanV60Balanced);
  const yunnanKalitaShares = getShareMap(yunnanKalitaBalanced);

  assert.ok(ethiopiaV60Acidity.recommendedRatio > ethiopiaKalitaAcidity.recommendedRatio);
  assert.ok(ethiopiaV60Shares[ethiopiaV60Shares.length - 1] > ethiopiaKalitaShares[ethiopiaKalitaShares.length - 1]);
  assert.ok(brazilCleverSweetness.totalTimeSeconds > brazilAprilSweetness.totalTimeSeconds);
  assert.ok(brazilCleverShares[0] > brazilAprilShares[0]);
  assert.ok(gayoKalitaBody.totalTimeSeconds > gayoV60Body.totalTimeSeconds);
  assert.ok(gayoKalitaShares[1] > gayoV60Shares[1]);
  assert.ok(yunnanV60Balanced.recommendedRatio > yunnanKalitaBalanced.recommendedRatio);
  assert.ok(yunnanV60Shares[yunnanV60Shares.length - 1] > yunnanKalitaShares[yunnanKalitaShares.length - 1]);

  assert.ok(ethiopiaV60Acidity.confidenceNotes.some((note) => /origin-method calibration active: east africa floral x acidity x v60/i.test(note)));
  assert.ok(brazilCleverSweetness.confidenceNotes.some((note) => /origin-method calibration active: brazil sweet x sweetness x clever dripper/i.test(note)));
  assert.ok(gayoKalitaBody.confidenceNotes.some((note) => /origin-method calibration active: indonesia structured x body x kalita wave/i.test(note)));
  assert.ok(yunnanV60Balanced.confidenceNotes.some((note) => /origin-method calibration active: asia highland x balanced x v60/i.test(note)));
});

test('water chemistry extremes push AI Brew in opposite extraction directions', () => {
  const baseInput = {
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Water Extremes QA',
    waterMode: 'manual' as const,
  };

  const softWater = buildAiBrewPlan({
    ...baseInput,
    waterTdsPpm: '65',
    waterHardnessPpm: '25',
    waterAlkalinityPpm: '20',
  }, catalog);
  const hardBufferedWater = buildAiBrewPlan({
    ...baseInput,
    waterTdsPpm: '180',
    waterHardnessPpm: '120',
    waterAlkalinityPpm: '85',
  }, catalog);

  assertPlanEnvelope(softWater);
  assertPlanEnvelope(hardBufferedWater);
  assert.ok(softWater.waterTempC > hardBufferedWater.waterTempC);
  assert.ok(softWater.recommendedRatio < hardBufferedWater.recommendedRatio);
  assert.ok(softWater.totalTimeSeconds < hardBufferedWater.totalTimeSeconds);
  assert.ok(softWater.warnings.some((note) => /too soft|too low alkalinity/i.test(note)));
  assert.ok(hardBufferedWater.warnings.some((note) => /too hard|too high alkalinity/i.test(note)));
});

test('AI Brew matrix stays deterministic across roast, target, water, process, and variety combinations', () => {
  const scenarios = [
    {
      name: 'clarity_geisha_soft',
      input: {
        ...createDefaultAiBrewFormState(catalog),
        coffeeName: 'Clarity Geisha',
        roastLevel: 'light' as const,
        targetProfileId: 'more_acidity',
        process: 'natural',
        variety: 'geisha',
        waterMode: 'manual' as const,
        waterTdsPpm: '70',
        waterHardnessPpm: '35',
        waterAlkalinityPpm: '24',
        altitudeMasl: '1900',
        roastDevelopment: 'underdeveloped' as const,
        solubility: 'low' as const,
      },
    },
    {
      name: 'sweet_bourbon_balanced',
      input: {
        ...createDefaultAiBrewFormState(catalog),
        coffeeName: 'Sweet Bourbon',
        roastLevel: 'medium_light' as const,
        targetProfileId: 'more_sweetness',
        process: 'washed',
        variety: 'bourbon',
        waterMode: 'manual' as const,
        waterTdsPpm: '95',
        waterHardnessPpm: '55',
        waterAlkalinityPpm: '40',
        roastDevelopment: 'balanced' as const,
        solubility: 'medium' as const,
      },
    },
    {
      name: 'body_pacamara_buffered',
      input: {
        ...createDefaultAiBrewFormState(catalog),
        coffeeName: 'Body Pacamara',
        roastLevel: 'medium_dark' as const,
        targetProfileId: 'more_body',
        process: 'wet_hulled',
        variety: 'pacamara',
        waterMode: 'manual' as const,
        waterTdsPpm: '170',
        waterHardnessPpm: '110',
        waterAlkalinityPpm: '82',
        roastDevelopment: 'developed' as const,
        solubility: 'high' as const,
      },
    },
    {
      name: 'iced_geisha_sweet',
      input: {
        ...createDefaultAiBrewFormState(catalog),
        coffeeName: 'Iced Geisha',
        brewMode: 'iced' as const,
        targetProfileId: 'more_sweetness',
        process: 'natural',
        variety: 'geisha',
        waterMode: 'manual' as const,
        waterTdsPpm: '85',
        waterHardnessPpm: '45',
        waterAlkalinityPpm: '32',
        roastLevel: 'light' as const,
        roastDevelopment: 'underdeveloped' as const,
        solubility: 'low' as const,
      },
    },
  ];

  const results = scenarios.map((scenario) => ({
    name: scenario.name,
    first: buildAiBrewPlan(scenario.input, catalog),
    second: buildAiBrewPlan(scenario.input, catalog),
  }));

  for (const result of results) {
    assertPlanEnvelope(result.first);
    assert.equal(result.first.fingerprint, result.second.fingerprint);
    assert.equal(result.first.recommendedRatio, result.second.recommendedRatio);
    assert.equal(result.first.waterTempC, result.second.waterTempC);
    assert.equal(result.first.totalTimeSeconds, result.second.totalTimeSeconds);
    assert.deepEqual(
      result.first.steps.map((step) => [step.startSeconds, step.pourVolumeMl, step.targetVolumeMl]),
      result.second.steps.map((step) => [step.startSeconds, step.pourVolumeMl, step.targetVolumeMl]),
    );
  }

  const clarity = results.find((result) => result.name === 'clarity_geisha_soft')!.first;
  const sweetness = results.find((result) => result.name === 'sweet_bourbon_balanced')!.first;
  const body = results.find((result) => result.name === 'body_pacamara_buffered')!.first;
  const iced = results.find((result) => result.name === 'iced_geisha_sweet')!.first;

  assert.ok(clarity.recommendedRatio > sweetness.recommendedRatio);
  assert.ok(clarity.grindBias === 'coarser');
  assert.ok(clarity.warnings.some((note) => /too soft|too low alkalinity/i.test(note)));
  assert.ok(sweetness.grindBias === 'finer');
  assert.ok(body.waterTempC < sweetness.waterTempC);
  assert.ok(body.totalTimeSeconds <= sweetness.totalTimeSeconds);
  assert.ok(body.warnings.some((note) => /too hard|too high alkalinity/i.test(note)));
  assert.ok(iced.iceMl > 0);
  assert.ok(iced.hotWaterMl < iced.totalWaterMl);
  assert.ok(iced.grindBias === 'finer');
});

test('ai brew draft storage persists and merges with fallback defaults', () => {
  installLocalStorageMock();
  saveAiBrewFormDraft<Partial<AiBrewFormState>>({
    brewMode: 'iced',
    coffeeName: 'Stored Brew',
    doseG: '19',
  });

  const loaded = loadAiBrewFormDraft(createDefaultAiBrewFormState(catalog));
  assert.equal(loaded.brewMode, 'iced');
  assert.equal(loaded.coffeeName, 'Stored Brew');
  assert.equal(loaded.doseG, '19');
  assert.equal(loaded.dripperId, 'hario-v60');
});

test('ai brew catalog snapshot storage restores the last cached catalog', () => {
  installLocalStorageMock();
  saveCachedAiBrewCatalogSnapshot(catalog);

  const loaded = loadCachedAiBrewCatalogSnapshot();
  assert.ok(loaded);
  assert.equal(loaded?.catalogVersion, 'test-v2');
  assert.equal(loaded?.drippers[0]?.name, 'Hario V60');
  assert.equal(loaded?.processes[0]?.id, 'washed');
});

test('ai brew catalog snapshot storage rejects stale snapshots that miss target profiles', () => {
  installLocalStorageMock();
  localStorage.setItem('BARISTACHAW_AI_BREW_CATALOG_SNAPSHOT_V5', JSON.stringify({
    schemaVersion: 5,
    savedAt: Date.now(),
    payload: {
      ...catalog,
      targetProfiles: undefined,
    },
  }));

  assert.equal(loadCachedAiBrewCatalogSnapshot(), null);
});

test('last generated brew plan storage restores matching catalog versions only', () => {
  installLocalStorageMock();
  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Stored Plan',
    waterTdsPpm: '90',
    waterHardnessPpm: '50',
    waterAlkalinityPpm: '40',
  }, catalog);

  saveLastGeneratedBrewPlan(plan);

  assert.equal(loadLastGeneratedBrewPlan('test-v2')?.coffeeName, 'Stored Plan');
  assert.equal(loadLastGeneratedBrewPlan('other-version'), null);
});

test('ai brew storage write helpers stay crash-free when localStorage throws', () => {
  installLocalStorageMock({ throwOnSetItem: true });

  assert.doesNotThrow(() => {
    saveAiBrewFormDraft<Partial<AiBrewFormState>>({
      brewMode: 'hot',
      coffeeName: 'Storage blocked',
    });
  });

  assert.doesNotThrow(() => {
    saveCachedAiBrewCatalogSnapshot(catalog);
  });

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Blocked save plan',
    waterTdsPpm: '95',
    waterHardnessPpm: '55',
    waterAlkalinityPpm: '40',
  }, catalog);

  assert.doesNotThrow(() => {
    saveLastGeneratedBrewPlan(plan);
  });
});


test('water chemistry formulas use requested GH/KH coefficients', () => {
  assert.equal(deriveHardnessFromCalciumMagnesium(22.4, 5.6), 79);
  assert.equal(deriveAlkalinityFromBicarbonate(56), 45.9);
});

test('validateWaterChemistryConsistency flags GH or KH above TDS', () => {
  const invalid = validateWaterChemistryConsistency(50, 55.1, 40);
  assert.match(invalid.join(' | '), /GH \(55.1\) exceeds TDS \(50\)/);

  const invalidKh = validateWaterChemistryConsistency(50, 40, 51.2);
  assert.match(invalidKh.join(' | '), /KH \(51.2\) exceeds TDS \(50\)/);

  const ok = validateWaterChemistryConsistency(120, 65, 44);
  assert.equal(ok.length, 0);
});
