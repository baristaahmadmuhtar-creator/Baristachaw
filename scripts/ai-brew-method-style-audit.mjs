import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { loadAiBrewCatalog } from '../apps/web/src/features/ai-brew/catalog.ts';
import {
  buildAiBrewPlan,
  buildWorkflowAwareGuideSteps,
  createDefaultAiBrewFormState,
  supportsAiBrewIcedMode,
} from '../apps/web/src/features/ai-brew/planner.ts';
import {
  formatAiBrewTime,
  localizeAiBrewDynamicText,
  localizeAiBrewStepLabel,
} from '../apps/web/src/features/ai-brew/localization.ts';
import { resolveWorkflowTutorialDetail } from '../apps/web/src/features/ai-brew/workflowTutorials.ts';

const ROOT = process.cwd();

const MODE = readArg('mode', 'all');
const CASE_LIMIT = Math.max(1000, Number(readArg('case-limit', '1000')) || 1000);
const ARTIFACT_SUFFIX = readArg('artifact-suffix', '');
const METHOD_FILTER = new Set(
  String(readArg('method', '') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const NO_DOCS = hasFlag('no-docs');

const STYLE_CONFIG = {
  v60: {
    field: 'virtualStyle',
    styleSource: 'target-pour pattern',
    styles: [
      ['classic_bloom_pulse', 'Classic bloom and pulse'],
      ['continuous_low_agitation', 'Continuous low agitation'],
      ['four_six_inspired', '4:6 inspired'],
      ['high_extraction_light_roast', 'High extraction light roast'],
      ['sweet_body', 'Sweet/body'],
      ['floral_clarity', 'Floral/clarity'],
      ['japanese_iced', 'Japanese iced'],
    ],
  },
  hario_switch: {
    field: 'switchPresetId',
    styleSource: 'switch preset',
    styles: [
      ['immersion_sweet', 'Switch immersion sweet'],
      ['immersion_heavy_body', 'Switch immersion heavy body'],
      ['hybrid_balanced', 'Switch hybrid balanced'],
      ['hybrid_bright_clean', 'Switch hybrid bright clean'],
      ['v60_mode', 'Switch V60 mode'],
      ['iced_hybrid', 'Switch iced hybrid'],
      ['mugen_everyday_hybrid', 'MUGEN x SWITCH everyday hybrid'],
    ],
  },
  chemex: {
    field: 'chemexStyle',
    styleSource: 'chemex style',
    styles: [
      ['auto', 'Auto'],
      ['traditional_three_pour', 'Traditional three-pour clarity'],
      ['competition_multi_pulse', 'Competition multi-pulse'],
      ['continuous_center_pour', 'Continuous center pour clarity'],
      ['iced_chemex', 'Iced flash concentrate'],
      ['high_dose_heavy_body', 'High-dose thick-filter heavy'],
    ],
  },
  kalita_wave: {
    field: 'kalitaWaveStyle',
    styleSource: 'kalita style',
    styles: [
      ['auto', 'Auto'],
      ['traditional_flat_three', 'Traditional flat three-pour'],
      ['competition_fast_four', 'Competition fast four-pour'],
      ['continuous_slow_stream', 'Continuous slow stream'],
      ['iced_wave', 'Iced Wave'],
      ['high_dose_concentrate', 'High-dose concentrate'],
    ],
  },
  origami: {
    field: 'origamiStyle',
    styleSource: 'origami style',
    styles: [
      ['auto', 'Auto'],
      ['cone_dripper_style', 'Cone dripper style'],
      ['wave_dripper_style', 'Wave dripper style'],
      ['mugen_one_pour', 'Mugen one-pour'],
      ['iced_origami', 'Iced Origami'],
      ['competition_hybrid_flow', 'Competition hybrid flow'],
    ],
  },
  april: {
    field: 'aprilStyle',
    styleSource: 'flat-bottom style',
    styles: [
      ['auto', 'Auto'],
      ['april_flat_bottom_standard', 'April flat-bottom standard'],
      ['april_continuous_slow', 'April continuous slow'],
      ['competition_two_pour', 'Competition two-pour'],
      ['iced_april_style', 'Iced April style'],
      ['high_body_heavy_dose', 'High-body heavy dose'],
    ],
  },
  melitta: {
    field: 'melittaStyle',
    styleSource: 'melitta style',
    styles: [
      ['auto', 'Auto'],
      ['traditional_melitta_one_pour', 'Traditional Melitta one-pour'],
      ['aromaboy_style', 'Aromaboy style'],
      ['three_pour_melitta', 'Three-pour Melitta'],
      ['iced_melitta_brew', 'Iced Melitta brew'],
      ['dense_classic_extraction', 'Dense classic extraction'],
    ],
  },
  kono: {
    field: 'konoStyle',
    styleSource: 'kono style',
    styles: [
      ['auto', 'Auto'],
      ['kono_meimon_traditional', 'Kono Meimon traditional'],
      ['kono_dripper_standard', 'Kono dripper standard'],
      ['kono_slow_drip_body', 'Kono slow-drip body'],
      ['iced_kono_meimon', 'Iced Kono Meimon'],
      ['kono_agitation_sweet', 'Kono agitation sweet'],
    ],
  },
  clever_dripper: {
    field: 'cleverDripperStyle',
    styleSource: 'clever style',
    styles: [
      ['auto', 'Auto'],
      ['classic_closed', 'Classic immersion bloom'],
      ['reverse_water_first', 'Reverse water first'],
      ['double_stage_hybrid', 'Double-stage hybrid'],
      ['iced_clever', 'Iced flash immersion'],
      ['high_dose_concentrate', 'High-dose ultra immersion'],
    ],
  },
  aeropress: {
    field: 'aeropressStyle',
    styleSource: 'aeropress style',
    styles: [
      ['auto', 'Auto'],
      ['standard', 'Standard'],
      ['inverted', 'Inverted'],
      ['bypass', 'Measured bypass'],
      ['no_bypass', 'No bypass'],
      ['bright_clean', 'Bright clean'],
      ['sweet_body', 'Sweet body'],
    ],
  },
  french_press: {
    field: 'frenchPressStyle',
    styleSource: 'french press style',
    styles: [
      ['auto', 'Auto traditional'],
      ['traditional', 'Traditional'],
      ['clean_decant', 'Clean decant'],
      ['double_filter', 'Double filter'],
      ['heavy_concentrate', 'Heavy concentrate'],
      ['sweet_immersion', 'Sweet immersion'],
    ],
  },
  espresso: {
    field: 'virtualStyle',
    styleSource: 'target espresso dial-in style',
    styles: [
      ['standard_dial_in', 'Standard dial-in'],
      ['bright_modern', 'Bright modern'],
      ['soft_round', 'Soft round'],
      ['milk_base', 'Milk base'],
      ['ristretto_safe', 'Ristretto-ish safe'],
      ['lungo_safe', 'Lungo-ish safe'],
    ],
  },
  moka_pot: {
    field: 'mokaPotStyle',
    styleSource: 'moka style',
    styles: [
      ['auto', 'Auto'],
      ['traditional_stovetop', 'Traditional stovetop'],
      ['preheated_boiler', 'Preheated boiler'],
      ['low_temp_controlled', 'Low-temp controlled'],
      ['iced_moka_concentrate', 'Iced moka concentrate'],
      ['high_yield_robust', 'High-yield robust'],
    ],
  },
  cold_brew: {
    field: 'coldBrewStyle',
    styleSource: 'cold brew style',
    styles: [
      ['auto', 'Auto'],
      ['classic_toddy_immersion', 'Classic Toddy immersion'],
      ['cold_drip_tower', 'Cold drip tower'],
      ['double_extraction_concentrate', 'Double extraction concentrate'],
      ['accelerated_room_temp', 'Accelerated room temp'],
      ['japanese_slow_drip', 'Japanese slow drip'],
    ],
  },
  batch_brew: {
    field: 'batchBrewStyle',
    styleSource: 'batch brew style',
    styles: [
      ['auto', 'Auto'],
      ['sca_gold_cup', 'SCA Gold Cup'],
      ['heavy_batch_catering', 'Heavy batch catering'],
      ['bright_light_roast_batch', 'Bright light-roast batch'],
      ['pre_wet_hybrid_batch', 'Pre-wet hybrid batch'],
      ['high_extraction_thermos', 'High extraction thermos'],
    ],
  },
  siphon: {
    field: 'siphonStyle',
    styleSource: 'siphon style',
    styles: [
      ['auto', 'Auto'],
      ['traditional_vacuum_siphon', 'Traditional vacuum siphon'],
      ['competition_triple_agitation', 'Competition triple agitation'],
      ['low_temp_delicate', 'Low-temperature delicate'],
      ['high_body_fast_drawdown', 'High-body fast drawdown'],
      ['spirit_infusion_style', 'Spirit infusion style'],
    ],
  },
};

const HIGH_RISK_METHODS = new Set([
  'hario_switch',
  'aeropress',
  'french_press',
  'espresso',
  'moka_pot',
  'cold_brew',
  'batch_brew',
]);

const BEANS = [
  { name: 'Panama Washed Geisha', process: 'washed', variety: 'Geisha', origin: 'Panama' },
  { name: 'Panama Natural Geisha', process: 'natural', variety: 'Geisha', origin: 'Panama' },
  { name: 'Ethiopia Washed Landrace', process: 'washed', variety: 'Ethiopian Landrace', origin: 'Ethiopia' },
  { name: 'Ethiopia Natural Landrace', process: 'natural', variety: 'Ethiopian Landrace', origin: 'Ethiopia' },
  { name: 'Kenya Washed SL28 SL34', process: 'washed', variety: 'SL28 SL34', origin: 'Kenya' },
  { name: 'Colombia Pink Bourbon Washed', process: 'washed', variety: 'Pink Bourbon', origin: 'Colombia' },
  { name: 'Colombia Caturra Castillo Washed', process: 'washed', variety: 'Castillo', origin: 'Colombia' },
  { name: 'Colombia Anaerobic Thermal Shock', process: 'anaerobic_thermal_shock', variety: 'Caturra', origin: 'Colombia' },
  { name: 'Brazil Natural Yellow Bourbon', process: 'natural', variety: 'Yellow Bourbon', origin: 'Brazil' },
  { name: 'Brazil Natural Catuai', process: 'natural', variety: 'Catuai', origin: 'Brazil' },
  { name: 'Guatemala Washed Bourbon', process: 'washed', variety: 'Bourbon', origin: 'Guatemala' },
  { name: 'Costa Rica Honey Catuai', process: 'honey', variety: 'Catuai', origin: 'Costa Rica' },
  { name: 'Rwanda Washed Bourbon', process: 'washed', variety: 'Bourbon', origin: 'Rwanda' },
  { name: 'Burundi Washed Bourbon', process: 'washed', variety: 'Bourbon', origin: 'Burundi' },
  { name: 'Indonesia Sumatra Wet-Hulled', process: 'wet_hulled', variety: 'Ateng', origin: 'Indonesia' },
  { name: 'Indonesia Gayo Washed', process: 'washed', variety: 'Ateng', origin: 'Indonesia' },
  { name: 'Indonesia Toraja Wet-Hulled', process: 'wet_hulled', variety: 'Typica', origin: 'Indonesia' },
  { name: 'Indonesia Bali Kintamani', process: 'washed', variety: 'Typica', origin: 'Indonesia' },
  { name: 'Indonesia Java Washed', process: 'washed', variety: 'Typica', origin: 'Indonesia' },
  { name: 'Indonesia Papua Wamena', process: 'washed', variety: 'Typica', origin: 'Indonesia' },
  { name: 'Yemen Natural Traditional', process: 'natural', variety: 'Typica', origin: 'Yemen' },
  { name: 'India Monsooned Malabar', process: 'monsooned', variety: 'Kent', origin: 'India' },
  { name: 'Mexico Washed Bourbon', process: 'washed', variety: 'Bourbon', origin: 'Mexico' },
  { name: 'Peru Washed Caturra', process: 'washed', variety: 'Caturra', origin: 'Peru' },
  { name: 'Bolivia Washed Caturra', process: 'washed', variety: 'Caturra', origin: 'Bolivia' },
  { name: 'Uganda Natural SL14', process: 'natural', variety: 'SL14', origin: 'Uganda' },
  { name: 'Thailand Washed Catimor', process: 'washed', variety: 'Catimor', origin: 'Thailand' },
  { name: 'Laos Washed Catimor', process: 'washed', variety: 'Catimor', origin: 'Laos' },
  { name: 'Colombia Decaf Washed', process: 'decaf', variety: 'Castillo', origin: 'Colombia' },
  { name: 'Specialty Robusta Canephora', process: 'natural', variety: 'Canephora', origin: 'Indonesia' },
  { name: 'Borneo Liberica', process: 'natural', variety: 'Borneo Liberica', origin: 'Indonesia' },
  { name: 'Excelsa Natural', process: 'natural', variety: 'Excelsa', origin: 'Southeast Asia' },
  { name: 'Unknown Origin Coffee', process: 'custom', variety: 'custom', origin: 'Unknown' },
];

const ROASTS = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];
const WATER_CASES = [
  { id: 'volvic-like', label: 'Volvic-like moderate mineral / upper-buffered', tds: 130, gh: 63, kh: 61 },
  { id: 'aqua-like', label: 'Aqua-like balanced bottled', tds: 105, gh: 55, kh: 38 },
  { id: 'le-minerale-like', label: 'Le Minerale-like balanced mineral', tds: 135, gh: 65, kh: 45 },
  { id: 'cleo-like', label: 'Cleo-like low-mineral clarity', tds: 35, gh: 12, kh: 8 },
  { id: 'amidis-ro', label: 'Amidis / RO / demineral base', tds: 5, gh: 2, kh: 2 },
  { id: 'super-o2-like', label: 'Super O2-like low-mineral', tds: 42, gh: 16, kh: 12 },
  { id: 'pristine-alkaline', label: 'Pristine 8.6+ high-buffer alkaline', tds: 150, gh: 40, kh: 120 },
  { id: 'galon-depot', label: 'Galon isi ulang / depot unknown', tds: 90, gh: 35, kh: 30, manualRequired: true },
  { id: 'hard-water', label: 'Hard mineral water', tds: 260, gh: 145, kh: 85 },
  { id: 'unknown-bottled', label: 'Unknown bottled water', tds: 110, gh: 45, kh: 45, manualRequired: true },
  { id: 'espresso-safe', label: 'Espresso-safe balanced water', tds: 95, gh: 55, kh: 35 },
];
const GRINDER_PATTERNS = [
  /1zpresso-k-ultra/i,
  /comandante-c40/i,
  /kingrinder-k6/i,
  /timemore-c2/i,
  /timemore-c3/i,
  /baratza-encore\b/i,
  /encore-esp/i,
  /fellow-ode/i,
  /df64/i,
  /feima|murane|600n/i,
  /unknown-manual/i,
  /unknown-electric/i,
];

const METHOD_WORD_RULES = {
  aeropress: {
    allowed: ['steep', 'stir', 'swirl', 'press', 'plunger', 'filter cap', 'bypass', 'inverted', 'flip', 'chamber', 'hiss', 'concentrate', 'dilute'],
    forbidden: /\b(drawdown|air turun|final pour|tuang akhir|bloom pour|blooming|v60|center-to-mid|filter wall|bed drawdown|wall chasing)\b/i,
  },
  french_press: {
    allowed: ['steep', 'crust', 'break crust', 'settle', 'press', 'decant', 'fines', 'double filter'],
    forbidden: /\b(drawdown|air turun|bloom|final pour|tuang akhir|v60|center-to-mid|hiss|desis|pour map|flat bed)\b/i,
  },
  espresso: {
    allowed: ['dose', 'yield', 'shot time', 'puck prep', 'distribution', 'tamp', 'channeling', 'pressure', 'flow', 'crema', 'dial-in'],
    forbidden: /\b(bloom|kettle pour|drawdown|v60|bypass water|steep chamber|tuang spiral|air turun)\b/i,
  },
  moka_pot: {
    allowed: ['basket', 'water chamber', 'safety valve', 'heat', 'no tamp', 'sputter', 'cool base'],
    forbidden: /\b(bloom|spiral pour|drawdown|v60|press plunger|tuang spiral|air turun)\b/i,
  },
  cold_brew: {
    allowed: ['immersion', 'coarse grind', 'steep', 'concentrate', 'ready-to-drink', 'dilution', 'filtration'],
    forbidden: /\b(hot bloom|kettle pour|drawdown|spiral pour|espresso shot|tuang spiral|air turun)\b/i,
  },
  batch_brew: {
    allowed: ['basket', 'spray pattern', 'bed depth', 'batch size', 'filter fit'],
    forbidden: /\b(aeropress press|moka heat|press plunger|stop before hiss)\b/i,
  },
  siphon: {
    allowed: ['upper chamber', 'lower globe', 'vacuum draw', 'heat source', 'agitation'],
    forbidden: /\b(v60 pour map|aeropress press|moka sputter|stop before hiss)\b/i,
  },
};

const BROKEN_COPY_PATTERN = /\$(?:\d+|\{)|\b(?:undefined|null|NaN|\[object Object\]|ActionAction|Action\s+Action|Aksi\s+Aksi|Pressgentle|Stophiss|Programbloom|Valveset|Press\s+\$1\s+seconds)\b|(?:2:0|1:5|3:0)\b/i;
const ENGLISH_LEAK_IN_ID = /\b(?:Starting grind|Total Water|Final Ratio|Temperature|Brew Guide|Additional details|Edit inputs|Guide complete|community\/profile autofill|Verify by rasa or meter|Water hardness is rendah|low-mineral clarity water|Bean Data Accuracy|Risk bean|Fully Washed|Moderate mineral|upper-buffered water|flow rate|contact time)\b/i;
const INDONESIAN_LEAK_IN_EN = /\b(?:Seduh|Gilingan|Air turun|Tambah|Simpan|Rasa|Suhu|Keyakinan|Panduan|Catatan|Koleksi|Tuang|Aduk|Rendam|Tekan|Sajikan)\b/i;

function hasFlag(flag) {
  return process.argv.includes(`--${flag}`);
}

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function git(command, fallback = 'unknown') {
  try {
    return execSync(command, { cwd: ROOT, encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function installCatalogFetch() {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    const filePath = url.startsWith('/data/')
      ? path.join(ROOT, 'apps/web/public', url)
      : path.join(ROOT, url);
    const body = await fs.promises.readFile(filePath, 'utf8');
    return { ok: true, json: async () => JSON.parse(body) };
  });
  return () => {
    globalThis.fetch = previousFetch;
  };
}

async function loadCatalog() {
  const restore = installCatalogFetch();
  try {
    return await loadAiBrewCatalog();
  } finally {
    restore();
  }
}

function normalize(value) {
  return String(value || '').toLowerCase();
}

function findByText(collection, text) {
  const needle = normalize(text).replace(/[^a-z0-9]+/g, ' ').trim();
  return collection.find((item) => {
    const haystack = [
      item.id,
      item.name,
      item.label,
      item.searchText,
      ...(item.aliases || []),
    ].map(normalize).join(' ').replace(/[^a-z0-9]+/g, ' ');
    return haystack.includes(needle) || needle.includes(normalize(item.id).replace(/[^a-z0-9]+/g, ' '));
  });
}

function findByPatterns(collection, patterns) {
  return collection.find((item) => patterns.some((pattern) => pattern.test(`${item.id} ${item.name || ''} ${item.label || ''}`)));
}
function findDripperForFamily(catalog, family, styleId) {
  if (family === 'hario_switch' && styleId === 'mugen_everyday_hybrid') {
    return catalog.drippers.find((item) => item.id === 'mugen-x-switch');
  }
  if (family === 'hario_switch' && /immersion_(sweet|heavy_body)/.test(String(styleId))) {
    return catalog.drippers.find((item) => item.id === 'hario-switch-03')
      || catalog.drippers.find((item) => item.id === 'hario-switch');
  }
  if (family === 'cold_brew' && (styleId === 'cold_drip_tower' || styleId === 'japanese_slow_drip')) {
    return catalog.drippers.find((item) => item.id === 'cold-drip-tower');
  }
  const exactPreference = {
    v60: ['hario-v60', 'cafec-flower-dripper'],
    hario_switch: ['hario-switch-02', 'hario-switch-03', 'hario-switch'],
    chemex: ['chemex'],
    kalita_wave: ['kalita-wave-155-185'],
    origami: ['origami-dripper-s-m'],
    april: ['april-brewer', 'orea-v3-v4', 'timemore-b75'],
    melitta: ['melitta', 'hario-pegasus', 'kalita-102'],
    kono: ['kono-meimon'],
    clever_dripper: ['clever-dripper', 'nextlevel-pulsar'],
    aeropress: ['aeropress'],
    french_press: ['french-press'],
    espresso: ['espresso-machine'],
    moka_pot: ['bialetti-moka-pot'],
    cold_brew: ['toddy-cold-brew'],
    batch_brew: ['batch-brewer'],
    siphon: ['hario-siphon'],
  }[family] || [];
  for (const id of exactPreference) {
    const found = catalog.drippers.find((item) => item.id === id);
    if (found) return found;
  }
  return catalog.drippers.find((item) => item.methodFamily === family);
}

function chooseGrinder(catalog, index) {
  const pattern = GRINDER_PATTERNS[index % GRINDER_PATTERNS.length];
  return findByPatterns(catalog.grinders, [pattern]) || catalog.grinders[index % catalog.grinders.length];
}

function targetWaterFor(family, styleId, targetProfileId) {
  if (family === 'espresso') return 36;
  if (family === 'moka_pot') return 95;
  if (family === 'cold_brew') return styleId?.includes('concentrate') ? 240 : 300;
  if (family === 'batch_brew') return 480;
  if (family === 'french_press') {
    if (styleId === 'heavy_concentrate') return 180;
    if (styleId === 'clean_decant' || targetProfileId === 'floral_transparent') return 230;
    return 215;
  }
  if (family === 'aeropress') {
    if (styleId === 'bypass') return targetProfileId === 'floral_transparent' ? 225 : 195;
    if (styleId === 'sweet_body') return 185;
    if (styleId === 'bright_clean') return 210;
    return 195;
  }
  if (family === 'chemex') return styleId === 'high_dose_heavy_body' ? 260 : 240;
  if (family === 'kalita_wave') return 235;
  return targetProfileId === 'more_acidity' || targetProfileId === 'floral_transparent' ? 235 : 230;
}

function doseFor(family, styleId) {
  if (family === 'espresso') return 18;
  if (family === 'cold_brew') return styleId?.includes('concentrate') ? 20 : 18;
  if (family === 'batch_brew') return 30;
  if (family === 'moka_pot') return 15;
  if (family === 'french_press' && styleId === 'heavy_concentrate') return 15;
  return 15;
}

function deriveBrewMode(catalog, dripperId, family, styleId, index) {
  const styleIced = /iced|japanese/.test(String(styleId));
  if (!styleIced && index % 5 !== 0) return 'hot';
  return supportsAiBrewIcedMode(catalog, dripperId) ? 'iced' : 'hot';
}

function createStyleOptions(catalog) {
  const options = [];
  const presentFamilies = new Set(catalog.drippers.map((item) => item.methodFamily).filter(Boolean));
  for (const [family, config] of Object.entries(STYLE_CONFIG)) {
    if (!presentFamilies.has(family)) continue;
    for (const [id, label] of config.styles) {
      const dripper = findDripperForFamily(catalog, family, id);
      if (!dripper) continue;
      options.push({
        family,
        field: config.field,
        styleSource: config.styleSource,
        styleId: id,
        styleLabel: label,
        dripperId: dripper.id,
        dripperName: dripper.name,
      });
    }
  }
  return options;
}

function applyStyleToForm(form, option) {
  if (option.field === 'virtualStyle') return form;
  if (option.field === 'switchPresetId') {
    form.switchPresetId = option.styleId;
    return form;
  }
  form[option.field] = option.styleId;
  return form;
}

function buildForm(catalog, option, targetProfileId, index) {
  const bean = BEANS[index % BEANS.length];
  const roastLevel = ROASTS[Math.floor(index / BEANS.length) % ROASTS.length];
  const water = WATER_CASES[Math.floor(index / (BEANS.length * ROASTS.length)) % WATER_CASES.length];
  const grinder = chooseGrinder(catalog, index);
  const process = findByText(catalog.processes, bean.process);
  const variety = findByText(catalog.varieties, bean.variety);
  const dose = doseFor(option.family, option.styleId);
  const totalWater = targetWaterFor(option.family, option.styleId, targetProfileId);
  const brewMode = deriveBrewMode(catalog, option.dripperId, option.family, option.styleId, index);
  const form = {
    ...createDefaultAiBrewFormState(catalog),
    brewMode,
    coffeeName: `${bean.name} ${option.styleLabel}`,
    dripperId: option.dripperId,
    grinderId: grinder?.id || createDefaultAiBrewFormState(catalog).grinderId,
    targetProfileId,
    doseG: String(dose),
    targetWaterMl: String(totalWater),
    roastLevel,
    waterMode: 'manual',
    waterCustomized: true,
    waterTdsPpm: String(water.tds),
    waterHardnessPpm: String(water.gh),
    waterAlkalinityPpm: String(water.kh),
    waterNotes: water.label,
    process: process?.id || 'custom',
    customProcess: process?.id ? '' : bean.process,
    variety: variety?.id || 'custom',
    customVariety: variety?.id ? '' : bean.variety,
  };
  applyStyleToForm(form, option);
  return { form, bean, water, grinder, roastLevel, brewMode };
}

function resolveGuideTutorials(plan, guide) {
  return (guide || []).map((step) => {
    const context = {
      methodFamily: plan.methodFamily,
      recipeStyle: plan.recipeStyle,
      actionType: step.actionType,
      brewMode: plan.brewMode,
      hasWarning: (step.warnings || []).length > 0,
      targetProfileId: plan.targetProfileId,
      roastLevel: plan.roastLevel,
    };
    return {
      actionType: step.actionType,
      label: step.label,
      en: resolveWorkflowTutorialDetail({ ...context, language: 'en' }),
      id: resolveWorkflowTutorialDetail({ ...context, language: 'id' }),
    };
  });
}

function collectText(plan, guide, language, tutorialEntries = []) {
  const parts = [
    plan.summary,
    plan.grindRecommendation,
    plan.waterMinerals?.styleLabel,
    plan.extractionRationale?.ratio,
    plan.extractionRationale?.temperature,
    plan.extractionRationale?.time,
    plan.extractionRationale?.grind,
    plan.extractionRationale?.pour,
    ...(plan.extractionRationale?.warnings || []),
    ...plan.notes,
    ...plan.warnings,
    ...(plan.confidenceNotes || []),
    ...(guide || []).flatMap((step) => [
      localizeAiBrewStepLabel(step.label, language),
      step.primaryText,
      step.secondaryText || '',
      step.note || '',
      step.hybridInstruction || '',
      ...(step.techniqueChips || []).flatMap((chip) => [chip.label, chip.value]),
      ...(step.warnings || []),
    ]),
    ...tutorialEntries.map((entry) => language === 'id' ? entry.id : entry.en),
    plan.manualPresetLabel,
    plan.manualPresetSummary,
    plan.targetProfileLabel,
    plan.switchPresetLabel,
  ].filter(Boolean);
  return parts.map((part) => localizeAiBrewDynamicText(String(part), language)).join('\n');
}

function collectRawText(plan, guide, tutorialEntries = []) {
  return [
    plan.summary,
    plan.grindRecommendation,
    plan.waterMinerals?.styleLabel,
    plan.extractionRationale?.ratio,
    plan.extractionRationale?.temperature,
    plan.extractionRationale?.time,
    plan.extractionRationale?.grind,
    plan.extractionRationale?.pour,
    ...(plan.extractionRationale?.warnings || []),
    ...plan.notes,
    ...plan.warnings,
    ...(plan.confidenceNotes || []),
    ...(guide || []).flatMap((step) => [
      step.label,
      step.primaryText,
      step.secondaryText || '',
      step.note || '',
      step.hybridInstruction || '',
      ...(step.techniqueChips || []).flatMap((chip) => [chip.label, chip.value]),
      ...(step.warnings || []),
    ]),
    ...tutorialEntries.flatMap((entry) => [entry.en, entry.id]),
  ].filter(Boolean).join('\n');
}

function validateTutorialSync(plan, tutorialEntries) {
  const reasons = [];
  if (plan.methodFamily === 'aeropress') {
    const tutorialText = tutorialEntries.map((entry) => `${entry.en} ${entry.id}`).join(' ');
    if (plan.targetProfileId === 'more_acidity' && !/\b(acidity|keasaman|bright|cerah)\b/i.test(tutorialText)) {
      reasons.push('AeroPress target/roast mismatch: acidity cue missing');
    }
    if (plan.targetProfileId === 'floral_transparent' && !/\b(floral|transparent|transparan|clarity|kejernihan)\b/i.test(tutorialText)) {
      reasons.push('AeroPress target/roast mismatch: floral clarity cue missing');
    }
    if (plan.targetProfileId === 'fruit_forward' && !/\b(fruit|buah|aroma|aromatics)\b/i.test(tutorialText)) {
      reasons.push('AeroPress target/roast mismatch: fruit-forward cue missing');
    }
    if ((plan.targetProfileId === 'more_sweetness' || plan.targetProfileId === 'soft_round') && !/\b(sweet|manis|round|bulat|lembut)\b/i.test(tutorialText)) {
      reasons.push('AeroPress target/roast mismatch: sweetness/round cue missing');
    }
    if ((plan.targetProfileId === 'more_body' || plan.targetProfileId === 'dense_comforting') && !/\b(body|tekstur|dense|padat|comfort)\b/i.test(tutorialText)) {
      reasons.push('AeroPress target/roast mismatch: body/dense cue missing');
    }
    if ((plan.roastLevel === 'light' || plan.roastLevel === 'medium_light') && !/\b(light roast|roast terang|enough heat|suhu cukup)\b/i.test(tutorialText)) {
      reasons.push('AeroPress target/roast mismatch: light roast cue missing');
    }
    if ((plan.roastLevel === 'medium_dark' || plan.roastLevel === 'dark') && !/\b(dark roast|medium-dark|roast gelap|suhu lebih rendah|lower heat|gentlest pressure)\b/i.test(tutorialText)) {
      reasons.push('AeroPress target/roast mismatch: darker roast cue missing');
    }
  }
  for (const entry of tutorialEntries) {
    const combined = `${entry.en} ${entry.id}`;
    if (!entry.en || entry.en.length < 20 || entry.en.length > 220) {
      reasons.push(`${entry.actionType} English tutorial length invalid`);
    }
    if (!entry.id || entry.id.length < 20 || entry.id.length > 240) {
      reasons.push(`${entry.actionType} Indonesian tutorial length invalid`);
    }
    if (BROKEN_COPY_PATTERN.test(combined)) {
      reasons.push(`${entry.actionType} tutorial has broken copy`);
    }

    if (plan.methodFamily === 'aeropress') {
      if (entry.actionType === 'stir') {
        if (!/\b(stir|swirl|stroke|strokes)\b/i.test(entry.en)) {
          reasons.push('AeroPress stir tutorial missing stir cue');
        }
        if (/\b(add water|concentrate water|recipe water|bypass water)\b/i.test(entry.en)) {
          reasons.push('AeroPress stir tutorial reuses charge copy');
        }
      }
      if (entry.actionType === 'stop') {
        if (!/\b(stop|hiss|pressure|pressing)\b/i.test(entry.en)) {
          reasons.push('AeroPress stop tutorial missing stop cue');
        }
        if (/\b(add .*bypass|measured bypass|serve|swirl the cup|mix the cup)\b/i.test(entry.en)) {
          reasons.push('AeroPress stop tutorial reuses dilute/serve copy');
        }
      }
      if (entry.actionType === 'dilute') {
        if (plan.recipeStyle !== 'bypass') reasons.push(`AeroPress non-bypass style generated dilute tutorial (${plan.recipeStyle})`);
        if (!/\b(bypass|after pressing|mix)\b/i.test(entry.en)) {
          reasons.push('AeroPress bypass dilute tutorial missing post-press bypass cue');
        }
      }
      if (entry.actionType === 'wait') {
        if (plan.recipeStyle !== 'inverted') reasons.push(`AeroPress non-inverted style generated wait tutorial (${plan.recipeStyle})`);
        if (!/\b(flip|inverted|cap)\b/i.test(entry.en)) {
          reasons.push('AeroPress wait tutorial missing safe flip cue');
        }
      }
      if (entry.actionType === 'serve' && plan.recipeStyle !== 'bypass' && /\b(add .*bypass|measured bypass)\b/i.test(entry.en)) {
        reasons.push('AeroPress non-bypass serve tutorial adds bypass');
      }
    }
  }
  return reasons;
}

function ratioMismatch(plan) {
  if (!Number.isFinite(plan.doseG) || plan.doseG <= 0) return true;
  const expectedFinal = plan.totalWaterMl / plan.doseG;
  const expectedHot = plan.hotWaterMl / plan.doseG;
  return Math.abs(plan.finalBeverageRatio - expectedFinal) > 0.06
    || Math.abs(plan.hotExtractionRatio - expectedHot) > 0.06;
}

function validateCase({ plan, option, guide, textId, textEn, rawText, tutorialMismatchReasons }) {
  const failures = [];
  const warnings = [];
  const uiWarnings = [];

  const numericFields = [
    ['doseG', plan.doseG],
    ['totalWaterMl', plan.totalWaterMl],
    ['hotWaterMl', plan.hotWaterMl],
    ['waterTempC', plan.waterTempC],
    ['totalTimeSeconds', plan.totalTimeSeconds],
    ['finalBeverageRatio', plan.finalBeverageRatio],
    ['hotExtractionRatio', plan.hotExtractionRatio],
  ];
  for (const [field, value] of numericFields) {
    if (!Number.isFinite(value)) failures.push(`${field} is not finite`);
  }
  if (plan.doseG <= 0 || plan.totalWaterMl <= 0 || plan.hotWaterMl < 0) failures.push('invalid dose or water volume');
  if (plan.finalBeverageRatio < 1 || plan.finalBeverageRatio > 35) failures.push(`impossible final ratio ${plan.finalBeverageRatio}`);
  if (plan.waterTempC < 0 || plan.waterTempC > 99) failures.push(`unsafe temperature ${plan.waterTempC}`);
  if (ratioMismatch(plan)) failures.push('ratio invariant mismatch');
  if (!plan.summary || !plan.summary.trim()) failures.push('missing recipe summary');
  if (!guide.length) failures.push('empty workflow guide');
  if (guide.length < 3) warnings.push('workflow guide is shallow');
  if (!plan.methodFamily || plan.methodFamily !== option.family) {
    if (option.family !== 'hario_switch' || plan.methodFamily !== 'hario_switch') failures.push(`method family mismatch ${plan.methodFamily} != ${option.family}`);
  }
  if (BROKEN_COPY_PATTERN.test(rawText) || BROKEN_COPY_PATTERN.test(textId) || BROKEN_COPY_PATTERN.test(textEn)) {
    failures.push('placeholder or broken copy found');
  }

  const methodRule = METHOD_WORD_RULES[plan.methodFamily];
  if (methodRule?.forbidden.test(rawText)) failures.push(`${plan.methodFamily} method vocabulary leak`);
  if (ENGLISH_LEAK_IN_ID.test(textId)) failures.push('English leakage in Indonesian localized output');
  if (INDONESIAN_LEAK_IN_EN.test(textEn)) failures.push('Indonesian leakage in English localized output');

  const guideStartLabels = guide.map((step) => step.label).join(' / ');
  if (plan.methodFamily === 'aeropress' && !/setup|isi|charge|aduk|stir|rendam|steep|press|tekan/i.test(guideStartLabels + rawText)) {
    failures.push('AeroPress guide missing setup/charge/stir/steep/press sequence');
  }
  if (plan.methodFamily === 'french_press' && !/charge|isi|steep|rendam|settle|endap|press|tekan|decant|tuang/i.test(guideStartLabels + rawText)) {
    failures.push('French Press guide missing steep/settle/press/decant sequence');
  }
  if (plan.methodFamily === 'espresso') {
    const grinderText = [
      plan.grinder?.name || '',
      plan.grindRecommendation || '',
      ...(plan.warnings || []),
      ...(plan.confidenceNotes || []),
      plan.grindSettingVerification || '',
      plan.grindCalibrationRequired ? 'calibration required low confidence' : '',
    ].join(' ');
    if (/(timemore c2|fellow ode|feima|600n|murane)/i.test(grinderText) && !/(not recommended|tidak direkomendasikan|low confidence|rendah|hard warning|warning|peringatan)/i.test(grinderText)) {
      failures.push('espresso incompatible grinder without hard warning');
    }
  }
  if (plan.waterMinerals?.tdsPpm <= 10 && plan.waterIsBrewReady && !/remineral|manual|low|rendah|base/i.test(rawText)) {
    failures.push('zero-mineral water treated as high-confidence brew-ready');
  }
  if (/unknown/i.test(plan.coffeeName || '') && /\b(geisha|jasmine|bergamot|blueberry|mango|winey|floral certainty|guaranteed flavor|pasti floral)\b/i.test(rawText)) {
    failures.push('unknown bean gets specific flavor certainty');
  }
  if (HIGH_RISK_METHODS.has(plan.methodFamily) && guide.length < 5) warnings.push('high-risk method guide should be more explicit');
  if (plan.workflowValidation && !plan.workflowValidation.passed) failures.push(`workflow validation failed: ${plan.workflowValidation.blockingErrors?.join(', ') || 'unknown'}`);
  if (tutorialMismatchReasons.length > 0) failures.push(`tutorial/action mismatch: ${tutorialMismatchReasons.join(', ')}`);
  if (new Set(plan.warnings).size < plan.warnings.length) uiWarnings.push('duplicate warnings should be deduped in UI');
  if (rawText.length > 12000) uiWarnings.push('guide/detail text may be too dense for mobile');

  return { failures, warnings, uiWarnings };
}

function generateCases(catalog, styleOptions, targetProfiles) {
  const cases = [];
  const failures = [];
  const warnings = [];
  const methodScores = new Map();
  const styleScores = new Map();
  let index = 0;

  while (cases.length < CASE_LIMIT) {
    for (const option of styleOptions) {
      if (cases.length >= CASE_LIMIT) break;
      for (const target of targetProfiles) {
        if (cases.length >= CASE_LIMIT) break;
        const { form, bean, water, grinder, roastLevel, brewMode } = buildForm(catalog, option, target.id, index);
        let plan;
        try {
          plan = buildAiBrewPlan(form, catalog);
        } catch (error) {
          const caseId = `${option.family}-${option.styleId}-${target.id}-${index}`;
          const failure = {
            id: caseId,
            methodFamily: option.family,
            styleId: option.styleId,
            targetProfileId: target.id,
            failureReasons: [`crash: ${error?.message || String(error)}`],
            warningReasons: [],
            uiWarnings: [],
            languageLeakId: false,
            languageLeakEn: false,
            methodVocabularyLeak: false,
            tutorialActionCount: 0,
            tutorialMismatchReasons: ['case crashed before tutorial sync audit'],
            tutorialSnapshot: '',
            hasLiteGuide: false,
            hasProGuide: false,
            hasUiSummary: false,
          };
          failures.push(failure);
          cases.push({ ...failure, passed: false, score: 0 });
          index += 1;
          continue;
        }
        const guide = plan.workflowGuideSteps?.length ? plan.workflowGuideSteps : buildWorkflowAwareGuideSteps(plan);
        const tutorialEntries = resolveGuideTutorials(plan, guide);
        const tutorialMismatchReasons = validateTutorialSync(plan, tutorialEntries);
        const textId = collectText(plan, guide, 'id', tutorialEntries);
        const textEn = collectText(plan, guide, 'en', tutorialEntries);
        const rawText = collectRawText(plan, guide, tutorialEntries);
        const validation = validateCase({ plan, option, guide, textId, textEn, rawText, tutorialMismatchReasons });
        const failureCount = validation.failures.length;
        const warningCount = validation.warnings.length + validation.uiWarnings.length;
        const score = Math.max(0, 100 - failureCount * 30 - warningCount * 4);
        const caseId = `${option.family}-${option.styleId}-${target.id}-${index}`;
        const caseRecord = {
          id: caseId,
          methodFamily: plan.methodFamily,
          methodDripperId: option.dripperId,
          methodDripperName: option.dripperName,
          styleId: option.styleId,
          styleLabel: option.styleLabel,
          styleSource: option.styleSource,
          targetProfileId: target.id,
          targetProfileLabel: target.label,
          bean: bean.name,
          process: bean.process,
          variety: bean.variety,
          roastLevel,
          water: water.label,
          grinder: grinder?.label || grinder?.name || grinder?.id || 'unknown',
          brewMode,
          doseG: plan.doseG,
          hotWaterMl: plan.hotWaterMl,
          totalWaterMl: plan.totalWaterMl,
          finalRatio: Number(plan.finalBeverageRatio.toFixed(2)),
          hotRatio: Number(plan.hotExtractionRatio.toFixed(2)),
          temperatureC: plan.waterTempC,
          finishSeconds: plan.extractionEndSeconds ?? plan.totalTimeSeconds,
          workflowStepCount: guide.length,
          tutorialActionCount: tutorialEntries.length,
          tutorialMismatchReasons,
          hasLiteGuide: guide.length > 0,
          hasProGuide: rawText.length > 200,
          hasUiSummary: Boolean(plan.summary && plan.doseG && plan.totalWaterMl && plan.finalBeverageRatio),
          languageLeakId: ENGLISH_LEAK_IN_ID.test(textId),
          languageLeakEn: INDONESIAN_LEAK_IN_EN.test(textEn),
          methodVocabularyLeak: METHOD_WORD_RULES[plan.methodFamily]?.forbidden.test(rawText) || false,
          failureReasons: validation.failures,
          warningReasons: validation.warnings,
          uiWarnings: validation.uiWarnings,
          score,
          passed: validation.failures.length === 0,
          guideSnapshot: guide.slice(0, 8).map((step) => `${formatAiBrewTime(step.startSeconds)} ${step.label}: ${step.primaryText || step.note || ''}`).join(' | '),
          tutorialSnapshot: tutorialEntries.slice(0, 8).map((entry) => `${entry.actionType}: ${entry.en}`).join(' | '),
        };
        cases.push(caseRecord);
        if (!caseRecord.passed) failures.push(caseRecord);
        for (const reason of [...validation.warnings, ...validation.uiWarnings]) {
          warnings.push(`${caseId}: ${reason}`);
        }
        addScore(methodScores, caseRecord.methodFamily, score);
        addScore(styleScores, `${caseRecord.methodFamily}:${caseRecord.styleId}`, score);
        index += 1;
      }
    }
  }

  return {
    cases,
    failures,
    warnings,
    methodScores: summarizeScores(methodScores),
    styleScores: summarizeScores(styleScores),
  };
}

function addScore(map, key, score) {
  const item = map.get(key) || { key, count: 0, total: 0, min: 100, max: 0 };
  item.count += 1;
  item.total += score;
  item.min = Math.min(item.min, score);
  item.max = Math.max(item.max, score);
  map.set(key, item);
}

function summarizeScores(map) {
  return [...map.values()]
    .map((item) => ({
      key: item.key,
      count: item.count,
      averageScore: Number((item.total / item.count).toFixed(1)),
      minScore: item.min,
      maxScore: item.max,
      classification: classifyScore(item.total / item.count, item.min),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function classifyScore(avg, min) {
  if (min < 80 || avg < 88) return 'WEAK';
  if (avg < 94) return 'OK';
  return 'STRONG';
}

function buildInventory(catalog, styleOptions, cases, methodScores, styleScores) {
  const families = [...new Set(catalog.drippers.map((item) => item.methodFamily).filter(Boolean))].sort();
  return families.map((family) => {
    const drippers = catalog.drippers.filter((item) => item.methodFamily === family);
    const options = styleOptions.filter((item) => item.family === family);
    const methodCases = cases.filter((item) => item.methodFamily === family);
    const score = methodScores.find((item) => item.key === family);
    const manualPresets = (catalog.manualBrewPresets || []).filter((preset) => (
      preset.supportedDripperIds || []
    ).some((id) => drippers.some((dripper) => dripper.id === id)));
    return {
      family,
      visibleMethods: drippers.map((item) => `${item.name} (${item.id})`),
      styleCount: options.length,
      styles: options.map((item) => `${item.styleLabel} (${item.styleId})`),
      manualPresetCount: manualPresets.length,
      manualPresets: manualPresets.map((item) => `${item.safeLabel || item.id} (${item.id})`),
      hotSupport: true,
      icedSupport: drippers.some((item) => supportsAiBrewIcedMode(catalog, item.id)),
      liteGuideStatus: methodCases.every((item) => item.hasLiteGuide) ? 'covered' : 'weak',
      proGuideStatus: methodCases.every((item) => item.hasProGuide) ? 'covered' : 'weak',
      uiResultCardStatus: methodCases.every((item) => item.hasUiSummary) ? 'covered' : 'weak',
      targetRasaStatus: new Set(methodCases.map((item) => item.targetProfileId)).size >= catalog.targetProfiles.length ? 'covered' : 'weak',
      waterGrinderBeanRoastAwareness: methodCases.length > 0 ? 'covered in matrix' : 'missing',
      languageStatus: methodCases.some((item) => item.languageLeakId || item.languageLeakEn) ? 'leak detected' : 'covered',
      existingTestStatus: methodCases.length > 0 ? 'method-style audit' : 'missing',
      classification: score?.classification || 'MISSING GUIDE',
      averageScore: score?.averageScore || 0,
      weakStyles: styleScores.filter((item) => item.key.startsWith(`${family}:`) && item.classification !== 'STRONG').map((item) => item.key.split(':')[1]),
    };
  });
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeArtifacts({ artifactDir, summary, cases, failures, warnings, methodScores, styleScores }) {
  writeJson(path.join(artifactDir, 'summary.json'), summary);
  writeJson(path.join(artifactDir, 'cases.json'), cases);
  writeJson(path.join(artifactDir, 'failures.json'), failures);
  fs.writeFileSync(
    path.join(artifactDir, 'warnings.md'),
    warnings.length
      ? `# AI Brew Method-Style Warnings\n\n${warnings.slice(0, 500).map((item) => `- ${item}`).join('\n')}\n`
      : '# AI Brew Method-Style Warnings\n\nNo warning-level findings in this matrix.\n',
  );
  fs.writeFileSync(path.join(artifactDir, 'method-scores.csv'), scoresToCsv(methodScores));
  fs.writeFileSync(path.join(artifactDir, 'style-scores.csv'), scoresToCsv(styleScores));
  fs.writeFileSync(
    path.join(artifactDir, 'guide-snapshots.md'),
    [
      '# AI Brew Method-Style Guide Snapshots',
      '',
      ...cases.slice(0, 160).map((item) => `## ${item.id}\n\n- Method: ${item.methodFamily}\n- Style: ${item.styleLabel}\n- Ratio: 1:${item.finalRatio.toFixed(1)}\n- Temp: ${item.temperatureC}C\n- Finish: ${formatAiBrewTime(item.finishSeconds)}\n- Guide: ${item.guideSnapshot}\n`),
    ].join('\n'),
  );
  const leakage = cases.filter((item) => item.languageLeakId || item.languageLeakEn || item.methodVocabularyLeak);
  fs.writeFileSync(
    path.join(artifactDir, 'language-leakage.md'),
    leakage.length
      ? `# Language / Method Leakage\n\n${leakage.map((item) => `- ${item.id}: ID leak=${item.languageLeakId}, EN leak=${item.languageLeakEn}, method leak=${item.methodVocabularyLeak}`).join('\n')}\n`
      : '# Language / Method Leakage\n\nNo hard language or method-vocabulary leakage found in localized audit surfaces.\n',
  );
  const uiRisks = cases.filter((item) => item.uiWarnings.length > 0);
  fs.writeFileSync(
    path.join(artifactDir, 'ui-ux-risk.md'),
    uiRisks.length
      ? `# UI/UX Risk\n\n${uiRisks.slice(0, 300).map((item) => `- ${item.id}: ${item.uiWarnings.join(', ')}`).join('\n')}\n`
      : '# UI/UX Risk\n\nNo high-priority UI/UX risk found by deterministic method-style audit.\n',
  );
  fs.writeFileSync(
    path.join(artifactDir, 'improvement-prompt.md'),
    [
      '# AI Brew Method-Style Improvement Prompt',
      '',
      summary.failCount === 0
        ? 'Current hard blockers are clear. Future improvement should reduce warning-level density, add more browser evidence per method family, and feed real human brew logs back into target/style tuning.'
        : 'Fix the listed hard failures first. Do not ship a method/style if it has impossible math, empty guides, method vocabulary leakage, broken placeholders, or language leakage.',
      '',
      'Maintain the honesty boundary: this is deterministic software/barista-reasoned validation, not physical sensory proof.',
    ].join('\n'),
  );
}

function scoresToCsv(scores) {
  return [
    'key,count,averageScore,minScore,maxScore,classification',
    ...scores.map((item) => `${item.key},${item.count},${item.averageScore},${item.minScore},${item.maxScore},${item.classification}`),
    '',
  ].join('\n');
}

function writeDocs({ docs, summary, inventory, cases, failures, warnings, methodScores, styleScores, artifactDir }) {
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  const honesty = 'This is software/barista-reasoned validation, not physical sensory proof. Real brew validation is still required.';
  const commonHeader = [
    `Generated: ${summary.generatedAt}`,
    `Local SHA: ${summary.sha}`,
    `Remote main SHA: ${summary.remoteMainSha}`,
    `Branch: ${summary.branch}`,
    `Working tree status at generation: ${summary.workingTreeStatus}`,
    `Artifact directory: \`${artifactDir.replaceAll('\\', '/')}\``,
    '',
    honesty,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(ROOT, 'docs/ai-brew-method-style-inventory.md'), [
    '# AI Brew Method + Style Inventory',
    '',
    commonHeader,
    '## Inventory',
    '',
    ...inventory.map((item) => [
      `### ${item.family}`,
      '',
      `- Classification: ${item.classification}`,
      `- Average score: ${item.averageScore}`,
      `- Visible methods: ${item.visibleMethods.join('; ')}`,
      `- Styles/gaya: ${item.styles.join('; ') || 'None exposed'}`,
      `- Manual presets: ${item.manualPresetCount}`,
      `- Hot support: ${item.hotSupport ? 'yes' : 'no'}`,
      `- Iced support: ${item.icedSupport ? 'yes' : 'no'}`,
      `- Lite guide: ${item.liteGuideStatus}`,
      `- Pro guide: ${item.proGuideStatus}`,
      `- Result card: ${item.uiResultCardStatus}`,
      `- Target-rasa mapping: ${item.targetRasaStatus}`,
      `- Water/grinder/bean/roast awareness: ${item.waterGrinderBeanRoastAwareness}`,
      `- Language/i18n: ${item.languageStatus}`,
      `- Weak styles: ${item.weakStyles.length ? item.weakStyles.join(', ') : 'none'}`,
      '',
    ].join('\n')),
  ].join('\n'));

  fs.writeFileSync(path.join(ROOT, 'docs/ai-brew-method-style-coverage-report.md'), [
    '# AI Brew Method + Style Coverage Report',
    '',
    commonHeader,
    '## Summary',
    '',
    `- Methods discovered: ${summary.methodCount}`,
    `- Styles discovered: ${summary.styleCount}`,
    `- Scenarios: ${summary.caseCount}`,
    `- Passed: ${summary.passCount}`,
    `- Failed: ${summary.failCount}`,
    `- Warnings: ${summary.warningCount}`,
    `- Average score: ${summary.averageScore}`,
    `- Final verdict: ${summary.verdict}`,
    '',
    '## Method Scores',
    '',
    '| Method | Cases | Avg | Min | Classification |',
    '| --- | ---: | ---: | ---: | --- |',
    ...methodScores.map((item) => `| ${item.key} | ${item.count} | ${item.averageScore} | ${item.minScore} | ${item.classification} |`),
    '',
    '## Lowest Scoring Cases',
    '',
    ...cases.slice().sort((a, b) => a.score - b.score).slice(0, 20).map((item) => `- ${item.id}: ${item.score} (${[...item.failureReasons, ...item.warningReasons, ...item.uiWarnings].join('; ') || 'no finding'})`),
    '',
  ].join('\n'));

  fs.writeFileSync(path.join(ROOT, 'docs/ai-brew-method-style-ui-ux-report.md'), [
    '# AI Brew Method + Style UI/UX Report',
    '',
    commonHeader,
    '## Result Card Coverage',
    '',
    `- UI result surfaces checked: ${summary.uiCheckedCount}`,
    `- Guide surfaces checked: ${summary.guideCheckedCount}`,
    `- UI warning count: ${summary.uiWarningCount}`,
    '',
    '## Mobile/Workflow Risks',
    '',
    summary.uiWarningCount
      ? warnings.filter((item) => /UI|dense|duplicate/i.test(item)).slice(0, 80).map((item) => `- ${item}`).join('\n')
      : 'No high-priority deterministic UI/UX risk found.',
    '',
    '## Remaining UI Risk',
    '',
    '- Browser-level visual QA is still required after deployment for every viewport, especially long Pro guide copy.',
    '- Physical barista use in service remains a human validation task.',
    '',
  ].join('\n'));

  fs.writeFileSync(path.join(ROOT, 'docs/ai-brew-method-style-final-verdict.md'), [
    '# AI Brew Method + Style Final Verdict',
    '',
    commonHeader,
    '## Verdict',
    '',
    summary.verdict,
    '',
    '## Evidence',
    '',
    `- Hard failures: ${summary.failCount}`,
    `- Language leakage hard failures: ${summary.languageLeakCount}`,
    `- Method vocabulary hard failures: ${summary.methodLeakCount}`,
    `- Average score: ${summary.averageScore}`,
    `- CI status for latest remote main before this audit: ${summary.ciStatus}`,
    '',
    '## Blockers',
    '',
    failures.length ? failures.map((item) => `- ${item.id}: ${item.failureReasons.join('; ')}`).join('\n') : 'No software hard blockers found in this audit matrix.',
    '',
    '## Known Risks',
    '',
    '- This gate is deterministic and broad, but it is not physical sensory proof.',
    '- The production deployment is not updated by this script; live proof must be verified separately when deployment is requested.',
    '- Warning-level items should be reviewed before claiming broader product maturity beyond MVP software readiness.',
    '',
  ].join('\n'));

  if (docs.realWorldReport) {
    updateRealWorldReport(summary);
  }
}

function updateRealWorldReport(summary) {
  const reportPath = path.join(ROOT, 'docs/ai-brew-real-world-1000-report.md');
  if (!fs.existsSync(reportPath)) return;
  const existing = fs.readFileSync(reportPath, 'utf8');
  const header = [
    '# AI Brew Real-World 1000 Report',
    '',
    `Regenerated metadata: ${summary.generatedAt}`,
    `Local SHA: ${summary.sha}`,
    `Remote main SHA: ${summary.remoteMainSha}`,
    `Branch: ${summary.branch}`,
    `Working tree status at generation: ${summary.workingTreeStatus}`,
    '',
    'This is software/barista-reasoned validation, not physical sensory proof. Real brew validation is still required.',
    '',
    '---',
    '',
  ].join('\n');
  const body = existing.replace(/^# AI Brew Real-World 1000 Report[\s\S]*?(?=^## |\z)/m, '');
  fs.writeFileSync(reportPath, `${header}${body.trimStart()}`);
}

function checkCiStatus(sha) {
  try {
    const output = execSync(
      `gh run list --commit ${sha} --limit 1 --json status,conclusion,name,databaseId,url`,
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const runs = JSON.parse(output || '[]');
    if (!runs.length) return 'CI LATEST UNVERIFIED';
    const run = runs[0];
    return `${run.name || 'workflow'} ${run.status}/${run.conclusion || 'pending'} (${run.databaseId || 'no-id'})`;
  } catch {
    return 'CI LATEST UNVERIFIED';
  }
}

const catalog = await loadCatalog();
const sha = git('git rev-parse HEAD');
const shortSha = git('git rev-parse --short=12 HEAD', 'local');
const remoteMainSha = git('git rev-parse origin/main');
const branch = git('git branch --show-current');
const workingTreeStatus = git('git status --short', 'clean') || 'clean';
const generatedAt = new Date().toISOString();
const styleOptionsAll = createStyleOptions(catalog);
const styleOptions = METHOD_FILTER.size
  ? styleOptionsAll.filter((item) => METHOD_FILTER.has(item.family))
  : styleOptionsAll;
const targetProfiles = catalog.targetProfiles;
const artifactName = `${shortSha}${ARTIFACT_SUFFIX ? `-${ARTIFACT_SUFFIX}` : ''}`;
const artifactDirRel = path.join('artifacts', 'ai-brew-audit', 'method-styles', artifactName);
const artifactDir = path.join(ROOT, artifactDirRel);

const { cases, failures, warnings, methodScores, styleScores } = generateCases(catalog, styleOptions, targetProfiles);
const methodCount = new Set(styleOptionsAll.map((item) => item.family)).size;
const styleCount = styleOptionsAll.length;
const languageLeakCount = cases.filter((item) => item.languageLeakId || item.languageLeakEn).length;
const methodLeakCount = cases.filter((item) => item.methodVocabularyLeak).length;
const tutorialMismatchCount = cases.reduce((sum, item) => sum + (item.tutorialMismatchReasons || []).length, 0);
const aeropressTargetRoastMismatchCount = cases.reduce(
  (sum, item) => sum + (item.methodFamily === 'aeropress'
    ? (item.tutorialMismatchReasons || []).filter((reason) => /target\/roast mismatch/i.test(reason)).length
    : 0),
  0,
);
const uiWarningCount = cases.reduce((sum, item) => sum + (item.uiWarnings || []).length, 0);
const warningCount = warnings.length + cases.reduce((sum, item) => sum + (item.warningReasons || []).length, 0);
const averageScore = Number((cases.reduce((sum, item) => sum + item.score, 0) / cases.length).toFixed(1));
const passCount = cases.filter((item) => item.passed).length;
const failCount = failures.length;
const verdict = failCount === 0
  ? 'AI BREW METHOD STYLE COVERAGE STRONG / REAL BREW VALIDATION REQUIRED'
  : 'AI BREW METHOD STYLE NEEDS MORE REFINEMENT';
const summary = {
  generatedAt,
  sha,
  shortSha,
  remoteMainSha,
  branch,
  workingTreeStatus,
  ciStatus: checkCiStatus(sha),
  artifactDir: artifactDirRel.replaceAll('\\', '/'),
  mode: MODE,
  caseCount: cases.length,
  passCount,
  failCount,
  warningCount,
  averageScore,
  methodCount,
  styleCount,
  guideCheckedCount: cases.filter((item) => item.hasLiteGuide && item.hasProGuide).length,
  uiCheckedCount: cases.filter((item) => item.hasUiSummary).length,
  languageLeakCount,
  methodLeakCount,
  tutorialMismatchCount,
  aeropressTargetRoastMismatchCount,
  uiWarningCount,
  verdict,
  honestyBoundary: 'This is software/barista-reasoned validation, not physical sensory proof. Real brew validation is still required.',
};

writeArtifacts({ artifactDir, summary, cases, failures, warnings, methodScores, styleScores });

if (!NO_DOCS && (MODE === 'all' || MODE === 'report' || MODE === 'matrix')) {
  const inventory = buildInventory(catalog, styleOptionsAll, cases, methodScores, styleScores);
  writeDocs({
    docs: { realWorldReport: true },
    summary,
    inventory,
    cases,
    failures,
    warnings,
    methodScores,
    styleScores,
    artifactDir: artifactDirRel,
  });
}

if (failCount > 0) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary));
