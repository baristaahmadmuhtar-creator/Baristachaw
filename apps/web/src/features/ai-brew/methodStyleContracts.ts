import type { AiBrewMethodFamily, AiBrewMode } from './types.ts';

export type AiBrewTargetProfileId =
  | 'balance_clean'
  | 'more_sweetness'
  | 'more_acidity'
  | 'more_body'
  | 'floral_transparent'
  | 'fruit_forward'
  | 'soft_round'
  | 'dense_comforting';

export const AI_BREW_TARGET_PROFILE_IDS: AiBrewTargetProfileId[] = [
  'balance_clean',
  'more_sweetness',
  'more_acidity',
  'more_body',
  'floral_transparent',
  'fruit_forward',
  'soft_round',
  'dense_comforting',
];

export const AI_BREW_METHOD_FAMILIES: AiBrewMethodFamily[] = [
  'v60',
  'chemex',
  'kalita_wave',
  'clever_dripper',
  'hario_switch',
  'origami',
  'april',
  'melitta',
  'kono',
  'french_press',
  'aeropress',
  'siphon',
  'moka_pot',
  'cold_brew',
  'batch_brew',
  'espresso',
];

export type MethodStyleTargetMap = Record<AiBrewTargetProfileId, string>;

export interface MethodStyleEnvelope {
  ratio: [number, number];
  temperatureC: [number, number];
  timeSeconds: [number, number];
  grind: 'extra_fine' | 'fine' | 'medium_fine' | 'medium' | 'medium_coarse' | 'coarse';
}

export interface MethodStyleDefinition {
  id: string;
  label: string;
  labelId: string;
  targetIntent: string;
}

export interface MethodStyleContract {
  methodFamily: AiBrewMethodFamily;
  formField: string;
  styleSource: string;
  labels: {
    en: string;
    id: string;
  };
  styles: MethodStyleDefinition[];
  defaultStyleByTarget: MethodStyleTargetMap;
  compatibleDripperIds: string[];
  requiredWorkflowPhases: string[];
  forbiddenVocabulary: string[];
  envelope: MethodStyleEnvelope;
  supportsIced: boolean;
  supportsBypass: boolean;
  outputFields: string[];
  honestyBoundary: string;
}

const COMMON_OUTPUT_FIELDS = [
  'methodFamily',
  'recipeStyle',
  'expectedCupProfile',
  'workflowGuideSteps',
  'workflowValidation',
  'guardrails',
];

const SOFTWARE_HONESTY_BOUNDARY =
  'Software/barista-reasoned validation only; physical cup validation requires real brew logs.';

function style(id: string, label: string, labelId: string, targetIntent: string): MethodStyleDefinition {
  return { id, label, labelId, targetIntent };
}

function targetMap(values: MethodStyleTargetMap): MethodStyleTargetMap {
  return values;
}

export const METHOD_STYLE_CONTRACTS: Record<AiBrewMethodFamily, MethodStyleContract> = {
  v60: {
    methodFamily: 'v60',
    formField: 'virtualStyle',
    styleSource: 'target-pour pattern',
    labels: { en: 'V60 / cone pour-over', id: 'V60 / seduh tuang cone' },
    styles: [
      style('classic_bloom_pulse', 'Classic bloom and pulse', 'Bloom dan pulse klasik', 'balanced clarity'),
      style('continuous_low_agitation', 'Continuous low agitation', 'Tuang kontinu agitasi rendah', 'soft clarity'),
      style('four_six_inspired', '4:6 inspired', 'Terinspirasi 4:6', 'structured sweetness'),
      style('high_extraction_light_roast', 'High extraction light roast', 'Ekstraksi tinggi light roast', 'bright extraction'),
      style('sweet_body', 'Sweet/body', 'Manis dan body', 'sweet body'),
      style('floral_clarity', 'Floral/clarity', 'Floral dan jernih', 'floral clarity'),
      style('japanese_iced', 'Japanese iced', 'Japanese iced', 'flash-chilled clarity'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'classic_bloom_pulse',
      more_sweetness: 'four_six_inspired',
      more_acidity: 'high_extraction_light_roast',
      more_body: 'sweet_body',
      floral_transparent: 'floral_clarity',
      fruit_forward: 'classic_bloom_pulse',
      soft_round: 'continuous_low_agitation',
      dense_comforting: 'sweet_body',
    }),
    compatibleDripperIds: ['hario-v60-01', 'hario-v60-02', 'hario-v60-03'],
    requiredWorkflowPhases: ['rinse', 'bloom', 'pulse-pour', 'drawdown', 'serve'],
    forbiddenVocabulary: ['valve', 'press plunger', 'sputter', 'vacuum drawdown'],
    envelope: { ratio: [14, 17.5], temperatureC: [88, 96], timeSeconds: [120, 240], grind: 'medium_fine' },
    supportsIced: true,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'pourBehavior'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  hario_switch: {
    methodFamily: 'hario_switch',
    formField: 'switchPresetId',
    styleSource: 'switch preset',
    labels: { en: 'Hario Switch', id: 'Hario Switch' },
    styles: [
      style('immersion_sweet', 'Switch immersion sweet', 'Switch imersi manis', 'sweet immersion'),
      style('immersion_heavy_body', 'Switch immersion heavy body', 'Switch imersi body berat', 'dense immersion'),
      style('hybrid_balanced', 'Switch hybrid balanced', 'Switch hybrid seimbang', 'balanced hybrid'),
      style('hybrid_bright_clean', 'Switch hybrid bright clean', 'Switch hybrid cerah bersih', 'bright hybrid'),
      style('v60_mode', 'Switch V60 mode', 'Switch mode V60', 'percolation clarity'),
      style('iced_hybrid', 'Switch iced hybrid', 'Switch iced hybrid', 'flash-chilled hybrid'),
      style('mugen_everyday_hybrid', 'MUGEN x SWITCH everyday hybrid', 'MUGEN x SWITCH hybrid harian', 'controlled hybrid'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'hybrid_balanced',
      more_sweetness: 'immersion_sweet',
      more_acidity: 'hybrid_bright_clean',
      more_body: 'immersion_heavy_body',
      floral_transparent: 'hybrid_bright_clean',
      fruit_forward: 'hybrid_balanced',
      soft_round: 'immersion_sweet',
      dense_comforting: 'immersion_heavy_body',
    }),
    compatibleDripperIds: ['hario-switch-02', 'hario-switch-03', 'mugen-x-switch'],
    requiredWorkflowPhases: ['valve-closed', 'immersion-fill', 'release', 'drawdown', 'serve'],
    forbiddenVocabulary: ['Clever dripper only', 'press plunger', 'sputter', 'espresso yield'],
    envelope: { ratio: [13, 17], temperatureC: [88, 96], timeSeconds: [120, 300], grind: 'medium_fine' },
    supportsIced: true,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'switchPresetId', 'switchTasteProgramme', 'switchStepValidation'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  chemex: {
    methodFamily: 'chemex',
    formField: 'chemexStyle',
    styleSource: 'chemex style',
    labels: { en: 'Chemex', id: 'Chemex' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('traditional_three_pour', 'Traditional three-pour clarity', 'Tiga tuang klasik bersih', 'clean clarity'),
      style('competition_multi_pulse', 'Competition multi-pulse', 'Multi-pulse kompetisi', 'layered clarity'),
      style('continuous_center_pour', 'Continuous center pour clarity', 'Tuang tengah kontinu', 'gentle clarity'),
      style('iced_chemex', 'Iced flash concentrate', 'Konsentrat iced Chemex', 'flash-chilled clarity'),
      style('high_dose_heavy_body', 'High-dose thick-filter heavy', 'Dosis tinggi filter tebal', 'heavy body'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'traditional_three_pour',
      more_sweetness: 'competition_multi_pulse',
      more_acidity: 'continuous_center_pour',
      more_body: 'high_dose_heavy_body',
      floral_transparent: 'continuous_center_pour',
      fruit_forward: 'competition_multi_pulse',
      soft_round: 'traditional_three_pour',
      dense_comforting: 'high_dose_heavy_body',
    }),
    compatibleDripperIds: ['chemex-6-cup'],
    requiredWorkflowPhases: ['rinse-thick-filter', 'bloom', 'center-pour', 'drawdown', 'serve'],
    forbiddenVocabulary: ['valve', 'press plunger', 'sputter', 'vacuum drawdown'],
    envelope: { ratio: [13.5, 17], temperatureC: [88, 96], timeSeconds: [210, 360], grind: 'medium_coarse' },
    supportsIced: true,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'chemexStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  kalita_wave: {
    methodFamily: 'kalita_wave',
    formField: 'kalitaWaveStyle',
    styleSource: 'kalita style',
    labels: { en: 'Kalita Wave', id: 'Kalita Wave' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('traditional_flat_three', 'Traditional flat three-pour', 'Flat tiga tuang klasik', 'balanced flat bed'),
      style('competition_fast_four', 'Competition fast four-pour', 'Empat tuang cepat kompetisi', 'fast sweet clarity'),
      style('continuous_slow_stream', 'Continuous slow stream', 'Aliran kontinu pelan', 'soft flat-bed clarity'),
      style('iced_wave', 'Iced Wave', 'Iced Wave', 'flash-chilled flat bed'),
      style('high_dose_concentrate', 'High-dose concentrate', 'Konsentrat dosis tinggi', 'dense flat body'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'traditional_flat_three',
      more_sweetness: 'competition_fast_four',
      more_acidity: 'continuous_slow_stream',
      more_body: 'high_dose_concentrate',
      floral_transparent: 'continuous_slow_stream',
      fruit_forward: 'competition_fast_four',
      soft_round: 'traditional_flat_three',
      dense_comforting: 'high_dose_concentrate',
    }),
    compatibleDripperIds: ['kalita-wave-155-185'],
    requiredWorkflowPhases: ['rinse', 'bloom', 'flat-bed-pulses', 'drawdown', 'serve'],
    forbiddenVocabulary: ['valve', 'press plunger', 'sputter', 'vacuum drawdown'],
    envelope: { ratio: [13.5, 17], temperatureC: [88, 96], timeSeconds: [140, 260], grind: 'medium_fine' },
    supportsIced: true,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'kalitaWaveStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  clever_dripper: {
    methodFamily: 'clever_dripper',
    formField: 'cleverDripperStyle',
    styleSource: 'clever style',
    labels: { en: 'Clever Dripper', id: 'Clever Dripper' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('classic_closed', 'Classic immersion bloom', 'Imersi klasik tertutup', 'balanced immersion'),
      style('reverse_water_first', 'Reverse water first', 'Air dulu lalu kopi', 'clean low agitation'),
      style('double_stage_hybrid', 'Double-stage hybrid', 'Hybrid dua tahap', 'layered hybrid'),
      style('iced_clever', 'Iced flash immersion', 'Iced imersi cepat', 'flash-chilled immersion'),
      style('high_dose_concentrate', 'High-dose ultra immersion', 'Imersi pekat dosis tinggi', 'heavy immersion'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'classic_closed',
      more_sweetness: 'double_stage_hybrid',
      more_acidity: 'reverse_water_first',
      more_body: 'high_dose_concentrate',
      floral_transparent: 'reverse_water_first',
      fruit_forward: 'double_stage_hybrid',
      soft_round: 'classic_closed',
      dense_comforting: 'high_dose_concentrate',
    }),
    compatibleDripperIds: ['clever-dripper-large', 'clever-dripper-small'],
    requiredWorkflowPhases: ['valve-closed', 'steep', 'release', 'drawdown', 'serve'],
    forbiddenVocabulary: ['Switch 02 only', 'press plunger', 'sputter', 'espresso yield'],
    envelope: { ratio: [12, 16.5], temperatureC: [86, 95], timeSeconds: [150, 330], grind: 'medium' },
    supportsIced: true,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'cleverDripperStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  origami: {
    methodFamily: 'origami',
    formField: 'origamiStyle',
    styleSource: 'origami style',
    labels: { en: 'Origami', id: 'Origami' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('cone_dripper_style', 'Cone dripper style', 'Gaya filter cone', 'cone clarity'),
      style('wave_dripper_style', 'Wave dripper style', 'Gaya filter wave', 'flat-bed sweetness'),
      style('mugen_one_pour', 'Mugen one-pour', 'Mugen satu tuang', 'low agitation'),
      style('iced_origami', 'Iced Origami', 'Iced Origami', 'flash-chilled hybrid'),
      style('competition_hybrid_flow', 'Competition hybrid flow', 'Hybrid kompetisi', 'hybrid clarity'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'cone_dripper_style',
      more_sweetness: 'wave_dripper_style',
      more_acidity: 'cone_dripper_style',
      more_body: 'wave_dripper_style',
      floral_transparent: 'cone_dripper_style',
      fruit_forward: 'competition_hybrid_flow',
      soft_round: 'mugen_one_pour',
      dense_comforting: 'wave_dripper_style',
    }),
    compatibleDripperIds: ['origami-s', 'origami-m'],
    requiredWorkflowPhases: ['filter-choice', 'bloom', 'pour-control', 'drawdown', 'serve'],
    forbiddenVocabulary: ['valve', 'press plunger', 'sputter', 'vacuum drawdown'],
    envelope: { ratio: [13.5, 17.5], temperatureC: [88, 96], timeSeconds: [120, 260], grind: 'medium_fine' },
    supportsIced: true,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'origamiStyle', 'origamiFilterStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  april: {
    methodFamily: 'april',
    formField: 'aprilStyle',
    styleSource: 'flat-bottom style',
    labels: { en: 'April Brewer', id: 'April Brewer' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('april_flat_bottom_standard', 'April flat-bottom standard', 'Flat-bottom April standar', 'balanced flat bed'),
      style('april_continuous_slow', 'April continuous slow', 'April kontinu pelan', 'soft clarity'),
      style('competition_two_pour', 'Competition two-pour', 'Dua tuang kompetisi', 'sweet clarity'),
      style('iced_april_style', 'Iced April style', 'Iced April', 'flash-chilled flat bed'),
      style('high_body_heavy_dose', 'High-body heavy dose', 'Dosis berat body tinggi', 'dense flat body'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'april_flat_bottom_standard',
      more_sweetness: 'competition_two_pour',
      more_acidity: 'april_continuous_slow',
      more_body: 'high_body_heavy_dose',
      floral_transparent: 'april_continuous_slow',
      fruit_forward: 'competition_two_pour',
      soft_round: 'april_flat_bottom_standard',
      dense_comforting: 'high_body_heavy_dose',
    }),
    compatibleDripperIds: ['april-brewer'],
    requiredWorkflowPhases: ['rinse', 'bloom', 'flat-bed-pour', 'drawdown', 'serve'],
    forbiddenVocabulary: ['valve', 'press plunger', 'sputter', 'vacuum drawdown'],
    envelope: { ratio: [13.5, 17], temperatureC: [88, 96], timeSeconds: [120, 260], grind: 'medium_fine' },
    supportsIced: true,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'aprilStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  melitta: {
    methodFamily: 'melitta',
    formField: 'melittaStyle',
    styleSource: 'melitta style',
    labels: { en: 'Melitta', id: 'Melitta' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('traditional_melitta_one_pour', 'Traditional Melitta one-pour', 'Melitta satu tuang klasik', 'classic sweetness'),
      style('aromaboy_style', 'Aromaboy style', 'Gaya Aromaboy', 'small-batch comfort'),
      style('three_pour_melitta', 'Three-pour Melitta', 'Melitta tiga tuang', 'balanced clarity'),
      style('iced_melitta_brew', 'Iced Melitta brew', 'Iced Melitta', 'flash-chilled classic'),
      style('dense_classic_extraction', 'Dense classic extraction', 'Ekstraksi klasik padat', 'dense comfort'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'three_pour_melitta',
      more_sweetness: 'traditional_melitta_one_pour',
      more_acidity: 'three_pour_melitta',
      more_body: 'dense_classic_extraction',
      floral_transparent: 'three_pour_melitta',
      fruit_forward: 'traditional_melitta_one_pour',
      soft_round: 'aromaboy_style',
      dense_comforting: 'dense_classic_extraction',
    }),
    compatibleDripperIds: ['melitta-1x2'],
    requiredWorkflowPhases: ['rinse', 'bloom', 'trapezoid-pour', 'drawdown', 'serve'],
    forbiddenVocabulary: ['valve', 'press plunger', 'sputter', 'vacuum drawdown'],
    envelope: { ratio: [13, 17], temperatureC: [87, 95], timeSeconds: [120, 260], grind: 'medium' },
    supportsIced: true,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'melittaStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  kono: {
    methodFamily: 'kono',
    formField: 'konoStyle',
    styleSource: 'kono style',
    labels: { en: 'Kono', id: 'Kono' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('kono_meimon_traditional', 'Kono Meimon traditional', 'Kono Meimon klasik', 'classic center flow'),
      style('kono_dripper_standard', 'Kono dripper standard', 'Kono standar', 'balanced cone'),
      style('kono_slow_drip_body', 'Kono slow-drip body', 'Kono slow drip body', 'sweet body'),
      style('iced_kono_meimon', 'Iced Kono Meimon', 'Iced Kono Meimon', 'flash-chilled center flow'),
      style('kono_agitation_sweet', 'Kono agitation sweet', 'Kono agitasi manis', 'agitated sweetness'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'kono_dripper_standard',
      more_sweetness: 'kono_agitation_sweet',
      more_acidity: 'kono_meimon_traditional',
      more_body: 'kono_slow_drip_body',
      floral_transparent: 'kono_meimon_traditional',
      fruit_forward: 'kono_agitation_sweet',
      soft_round: 'kono_dripper_standard',
      dense_comforting: 'kono_slow_drip_body',
    }),
    compatibleDripperIds: ['kono-meimon'],
    requiredWorkflowPhases: ['rinse', 'center-pour', 'controlled-widening', 'drawdown', 'serve'],
    forbiddenVocabulary: ['valve', 'press plunger', 'sputter', 'vacuum drawdown'],
    envelope: { ratio: [13.5, 17], temperatureC: [88, 95], timeSeconds: [130, 280], grind: 'medium_fine' },
    supportsIced: true,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'konoStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  french_press: {
    methodFamily: 'french_press',
    formField: 'frenchPressStyle',
    styleSource: 'french press style',
    labels: { en: 'French Press', id: 'French Press' },
    styles: [
      style('auto', 'Auto traditional', 'Otomatis klasik', 'target selected'),
      style('traditional', 'Traditional', 'Klasik', 'balanced immersion'),
      style('clean_decant', 'Clean decant', 'Tuang pisah bersih', 'clean immersion'),
      style('double_filter', 'Double filter', 'Filter ganda', 'clean body'),
      style('heavy_concentrate', 'Heavy concentrate', 'Konsentrat berat', 'heavy body'),
      style('sweet_immersion', 'Sweet immersion', 'Imersi manis', 'sweet body'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'traditional',
      more_sweetness: 'sweet_immersion',
      more_acidity: 'clean_decant',
      more_body: 'sweet_immersion',
      floral_transparent: 'clean_decant',
      fruit_forward: 'clean_decant',
      soft_round: 'sweet_immersion',
      dense_comforting: 'sweet_immersion',
    }),
    compatibleDripperIds: ['french-press'],
    requiredWorkflowPhases: ['dose', 'full-immersion', 'steep', 'press', 'decant'],
    forbiddenVocabulary: ['valve', 'spiral pour', 'sputter', 'espresso yield'],
    envelope: { ratio: [12, 16], temperatureC: [84, 94], timeSeconds: [240, 720], grind: 'coarse' },
    supportsIced: false,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'frenchPressStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  aeropress: {
    methodFamily: 'aeropress',
    formField: 'aeropressStyle',
    styleSource: 'aeropress style',
    labels: { en: 'AeroPress', id: 'AeroPress' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('standard', 'Standard', 'Standar', 'balanced pressure immersion'),
      style('inverted', 'Inverted', 'Inverted', 'longer immersion'),
      style('bypass', 'Measured bypass', 'Bypass terukur', 'clean bypass'),
      style('no_bypass', 'No bypass', 'Tanpa bypass', 'dense direct cup'),
      style('bright_clean', 'Bright clean', 'Cerah bersih', 'bright clarity'),
      style('sweet_body', 'Sweet body', 'Manis body', 'sweet body'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'standard',
      more_sweetness: 'sweet_body',
      more_acidity: 'bright_clean',
      more_body: 'no_bypass',
      floral_transparent: 'bypass',
      fruit_forward: 'bypass',
      soft_round: 'standard',
      dense_comforting: 'sweet_body',
    }),
    compatibleDripperIds: ['aeropress'],
    requiredWorkflowPhases: ['setup', 'charge', 'stir', 'steep', 'press', 'stop-before-hiss', 'serve'],
    forbiddenVocabulary: ['spiral pour', 'drawdown bed', 'sputter', 'vacuum drawdown'],
    envelope: { ratio: [8, 16], temperatureC: [82, 94], timeSeconds: [60, 210], grind: 'medium_fine' },
    supportsIced: true,
    supportsBypass: true,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'aeropressStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  siphon: {
    methodFamily: 'siphon',
    formField: 'siphonStyle',
    styleSource: 'siphon style',
    labels: { en: 'Siphon', id: 'Siphon' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('traditional_vacuum_siphon', 'Traditional vacuum siphon', 'Vakum siphon klasik', 'balanced vacuum'),
      style('competition_triple_agitation', 'Competition triple agitation', 'Tiga agitasi kompetisi', 'high extraction clarity'),
      style('low_temp_delicate', 'Low-temperature delicate', 'Suhu rendah halus', 'delicate clarity'),
      style('high_body_fast_drawdown', 'High-body fast drawdown', 'Body tinggi drawdown cepat', 'dense vacuum'),
      style('spirit_infusion_style', 'Spirit infusion style', 'Gaya infusi spirit', 'aromatic infusion'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'traditional_vacuum_siphon',
      more_sweetness: 'competition_triple_agitation',
      more_acidity: 'low_temp_delicate',
      more_body: 'high_body_fast_drawdown',
      floral_transparent: 'low_temp_delicate',
      fruit_forward: 'competition_triple_agitation',
      soft_round: 'traditional_vacuum_siphon',
      dense_comforting: 'high_body_fast_drawdown',
    }),
    compatibleDripperIds: ['hario-siphon'],
    requiredWorkflowPhases: ['heat', 'vacuum-rise', 'agitate', 'heat-off', 'drawdown', 'serve'],
    forbiddenVocabulary: ['valve release', 'press plunger', 'spiral pour', 'espresso yield'],
    envelope: { ratio: [13, 16.5], temperatureC: [86, 94], timeSeconds: [90, 240], grind: 'medium' },
    supportsIced: false,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'siphonStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  moka_pot: {
    methodFamily: 'moka_pot',
    formField: 'mokaPotStyle',
    styleSource: 'moka style',
    labels: { en: 'Moka Pot', id: 'Moka Pot' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('traditional_stovetop', 'Traditional stovetop', 'Stovetop klasik', 'balanced moka'),
      style('preheated_boiler', 'Preheated boiler', 'Boiler dipanaskan dulu', 'cleaner moka'),
      style('low_temp_controlled', 'Low-temp controlled', 'Suhu rendah terkendali', 'soft moka'),
      style('iced_moka_concentrate', 'Iced moka concentrate', 'Konsentrat iced moka', 'iced concentrate'),
      style('high_yield_robust', 'High-yield robust', 'Yield tinggi robust', 'dense moka'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'traditional_stovetop',
      more_sweetness: 'preheated_boiler',
      more_acidity: 'low_temp_controlled',
      more_body: 'high_yield_robust',
      floral_transparent: 'low_temp_controlled',
      fruit_forward: 'preheated_boiler',
      soft_round: 'low_temp_controlled',
      dense_comforting: 'high_yield_robust',
    }),
    compatibleDripperIds: ['bialetti-moka-pot'],
    requiredWorkflowPhases: ['base-fill', 'basket-dose', 'heat', 'flow-watch', 'sputter-stop', 'serve'],
    forbiddenVocabulary: ['espresso yield target', 'paper drawdown', 'valve release', 'press plunger'],
    envelope: { ratio: [5.5, 10], temperatureC: [90, 98], timeSeconds: [180, 420], grind: 'fine' },
    supportsIced: true,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'mokaPotStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  cold_brew: {
    methodFamily: 'cold_brew',
    formField: 'coldBrewStyle',
    styleSource: 'cold brew style',
    labels: { en: 'Cold Brew', id: 'Cold Brew' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('classic_toddy_immersion', 'Classic Toddy immersion', 'Toddy imersi klasik', 'classic immersion'),
      style('cold_drip_tower', 'Cold drip tower', 'Menara cold drip', 'slow drip clarity'),
      style('double_extraction_concentrate', 'Double extraction concentrate', 'Konsentrat ekstraksi ganda', 'dense concentrate'),
      style('accelerated_room_temp', 'Accelerated room temp', 'Room temp dipercepat', 'faster immersion'),
      style('japanese_slow_drip', 'Japanese slow drip', 'Japanese slow drip', 'slow chilled clarity'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'classic_toddy_immersion',
      more_sweetness: 'double_extraction_concentrate',
      more_acidity: 'cold_drip_tower',
      more_body: 'double_extraction_concentrate',
      floral_transparent: 'japanese_slow_drip',
      fruit_forward: 'cold_drip_tower',
      soft_round: 'classic_toddy_immersion',
      dense_comforting: 'double_extraction_concentrate',
    }),
    compatibleDripperIds: ['toddy-cold-brew', 'hario-cold-drip'],
    requiredWorkflowPhases: ['coarse-dose', 'saturate', 'steep-or-drip', 'filter', 'dilute', 'serve'],
    forbiddenVocabulary: ['hot bloom', 'espresso yield', 'press plunger', 'sputter'],
    envelope: { ratio: [8, 16], temperatureC: [4, 25], timeSeconds: [14400, 72000], grind: 'coarse' },
    supportsIced: true,
    supportsBypass: true,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'coldBrewStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  batch_brew: {
    methodFamily: 'batch_brew',
    formField: 'batchBrewStyle',
    styleSource: 'batch brew style',
    labels: { en: 'Batch Brew', id: 'Batch Brew' },
    styles: [
      style('auto', 'Auto', 'Otomatis', 'target selected'),
      style('sca_gold_cup', 'SCA Gold Cup', 'SCA Gold Cup', 'balanced batch'),
      style('heavy_batch_catering', 'Heavy batch catering', 'Batch catering berat', 'service body'),
      style('bright_light_roast_batch', 'Bright light-roast batch', 'Batch light roast cerah', 'bright batch'),
      style('pre_wet_hybrid_batch', 'Pre-wet hybrid batch', 'Batch hybrid pre-wet', 'even saturation'),
      style('high_extraction_thermos', 'High extraction thermos', 'Termos ekstraksi tinggi', 'holding-safe extraction'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'sca_gold_cup',
      more_sweetness: 'pre_wet_hybrid_batch',
      more_acidity: 'bright_light_roast_batch',
      more_body: 'heavy_batch_catering',
      floral_transparent: 'bright_light_roast_batch',
      fruit_forward: 'pre_wet_hybrid_batch',
      soft_round: 'sca_gold_cup',
      dense_comforting: 'heavy_batch_catering',
    }),
    compatibleDripperIds: ['batch-brewer'],
    requiredWorkflowPhases: ['basket-prep', 'level-bed', 'machine-cycle', 'drawdown', 'mix-carafe', 'serve'],
    forbiddenVocabulary: ['hand spiral only', 'press plunger', 'sputter', 'vacuum drawdown'],
    envelope: { ratio: [14, 17.5], temperatureC: [88, 96], timeSeconds: [240, 480], grind: 'medium' },
    supportsIced: false,
    supportsBypass: true,
    outputFields: [...COMMON_OUTPUT_FIELDS, 'batchBrewStyle'],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
  espresso: {
    methodFamily: 'espresso',
    formField: 'virtualStyle',
    styleSource: 'target espresso dial-in style',
    labels: { en: 'Espresso', id: 'Espresso' },
    styles: [
      style('standard_dial_in', 'Standard dial-in', 'Dial-in standar', 'balanced shot'),
      style('bright_modern', 'Bright modern', 'Modern cerah', 'bright shot'),
      style('soft_round', 'Soft round', 'Lembut bulat', 'soft shot'),
      style('milk_base', 'Milk base', 'Basis susu', 'milk service'),
      style('ristretto_safe', 'Ristretto-ish safe', 'Ristretto aman', 'short dense shot'),
      style('lungo_safe', 'Lungo-ish safe', 'Lungo aman', 'longer clean shot'),
    ],
    defaultStyleByTarget: targetMap({
      balance_clean: 'standard_dial_in',
      more_sweetness: 'soft_round',
      more_acidity: 'bright_modern',
      more_body: 'ristretto_safe',
      floral_transparent: 'bright_modern',
      fruit_forward: 'standard_dial_in',
      soft_round: 'soft_round',
      dense_comforting: 'milk_base',
    }),
    compatibleDripperIds: ['espresso-machine'],
    requiredWorkflowPhases: ['dose', 'distribute', 'tamp', 'extract', 'yield-stop', 'serve'],
    forbiddenVocabulary: ['pour-over drawdown', 'valve release', 'press plunger', 'cold steep'],
    envelope: { ratio: [1.5, 3.2], temperatureC: [88, 96], timeSeconds: [20, 40], grind: 'extra_fine' },
    supportsIced: false,
    supportsBypass: false,
    outputFields: [...COMMON_OUTPUT_FIELDS],
    honestyBoundary: SOFTWARE_HONESTY_BOUNDARY,
  },
};

export function getMethodStyleContract(methodFamily: AiBrewMethodFamily): MethodStyleContract {
  return METHOD_STYLE_CONTRACTS[methodFamily];
}

export function getMethodStyle(methodFamily: AiBrewMethodFamily, styleId?: string): MethodStyleDefinition | undefined {
  const contract = getMethodStyleContract(methodFamily);
  return contract.styles.find((item) => item.id === styleId);
}

export function resolveDefaultStyleForTarget(
  methodFamily: AiBrewMethodFamily,
  targetProfileId?: string,
  context?: { brewMode?: AiBrewMode; requestedStyleId?: string },
): string {
  const contract = getMethodStyleContract(methodFamily);
  if (context?.requestedStyleId && context.requestedStyleId !== 'auto' && getMethodStyle(methodFamily, context.requestedStyleId)) {
    return context.requestedStyleId;
  }
  if (context?.brewMode === 'iced') {
    const icedStyle = contract.styles.find((item) => /iced|japanese/i.test(item.id));
    if (icedStyle) return icedStyle.id;
  }
  const targetId = AI_BREW_TARGET_PROFILE_IDS.includes(targetProfileId as AiBrewTargetProfileId)
    ? targetProfileId as AiBrewTargetProfileId
    : 'balance_clean';
  return contract.defaultStyleByTarget[targetId];
}

export function listAllMethodStyleCases() {
  return AI_BREW_METHOD_FAMILIES.flatMap((methodFamily) => {
    const contract = getMethodStyleContract(methodFamily);
    return contract.styles.map((methodStyle) => ({
      methodFamily,
      styleId: methodStyle.id,
      styleLabel: methodStyle.label,
      styleLabelId: methodStyle.labelId,
      styleSource: contract.styleSource,
      formField: contract.formField,
      supportsIced: contract.supportsIced,
      supportsBypass: contract.supportsBypass,
      requiredWorkflowPhases: contract.requiredWorkflowPhases,
    }));
  });
}

export function getMethodStyleAuditConfig() {
  return Object.fromEntries(
    AI_BREW_METHOD_FAMILIES.map((methodFamily) => {
      const contract = getMethodStyleContract(methodFamily);
      return [
        methodFamily,
        {
          field: contract.formField,
          styleSource: contract.styleSource,
          styles: contract.styles.map((methodStyle) => [methodStyle.id, methodStyle.label]),
        },
      ];
    }),
  ) as Record<AiBrewMethodFamily, { field: string; styleSource: string; styles: Array<[string, string]> }>;
}

export function validatePlanAgainstMethodStyleContract(plan: {
  methodFamily?: AiBrewMethodFamily;
  recipeStyle?: string;
  targetProfileId?: string;
  workflowGuideSteps?: Array<{ kind?: string; label?: string; note?: string }>;
  workflowValidation?: { status?: string; readinessScore?: number };
  guardrails?: { errors?: string[]; warnings?: string[] };
}) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!plan.methodFamily || !METHOD_STYLE_CONTRACTS[plan.methodFamily]) {
    return { passed: false, errors: ['Plan has no supported method family.'], warnings };
  }

  const contract = getMethodStyleContract(plan.methodFamily);
  const styleId = plan.recipeStyle || resolveDefaultStyleForTarget(plan.methodFamily, plan.targetProfileId);
  if (!getMethodStyle(plan.methodFamily, styleId)) {
    errors.push(`Unsupported ${plan.methodFamily} style: ${styleId}`);
  }
  if (!plan.workflowGuideSteps || plan.workflowGuideSteps.length === 0) {
    errors.push(`Missing workflow guide steps for ${plan.methodFamily}.`);
  }
  if (!plan.workflowValidation) {
    warnings.push(`Missing workflow validation object for ${plan.methodFamily}.`);
  }
  for (const field of contract.outputFields) {
    if (field === 'recipeStyle' && !styleId) errors.push(`Missing output field ${field}.`);
  }
  return { passed: errors.length === 0, errors, warnings, contract, styleId };
}
