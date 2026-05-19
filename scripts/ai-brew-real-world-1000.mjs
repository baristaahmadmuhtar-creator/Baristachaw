import fs from 'node:fs';
import { execSync } from 'node:child_process';
import {
  buildAiBrewPlan,
  buildWorkflowAwareGuideSteps,
  createDefaultAiBrewFormState,
  supportsAiBrewIcedMode,
} from '../apps/web/src/features/ai-brew/planner.ts';
import { validateBrewPlanOutput } from '../apps/web/src/features/ai-brew/antiHallucination.ts';
import { buildTasteFeedbackCorrection } from '../apps/web/src/features/ai-brew/experience.ts';
import { localizeAiBrewDynamicText } from '../apps/web/src/features/ai-brew/localization.ts';
import { buildProductionAiBrewCatalogForStress } from '../tests/helpers/aiBrewStressMatrix.ts';

function parseScenarioTotal() {
  const argValue = process.argv.find((arg) => arg.startsWith('--scenarios='))?.split('=')[1]
    || process.env.AI_BREW_REAL_WORLD_SCENARIOS;
  const parsed = Number.parseInt(String(argValue || '1000'), 10);
  if (!Number.isFinite(parsed) || parsed < 1000 || parsed > 100000) return 1000;
  return parsed;
}

function parseScenarioProfile() {
  const argValue = process.argv.find((arg) => arg.startsWith('--profile='))?.split('=')[1]
    || process.env.AI_BREW_REAL_WORLD_PROFILE
    || 'default';
  return argValue === 'filter-source-backed' ? 'filter-source-backed' : 'default';
}

const SCENARIO_TOTAL = parseScenarioTotal();
const SCENARIO_PROFILE = parseScenarioProfile();
const SOURCE_BACKED_FILTER_BEAN_FIXTURE = 'tests/fixtures/ai-brew-source-backed-filter-beans.json';
const STRONG_VERDICT = 'AI BREW REAL-WORLD SCENARIO STRONG / REAL BREW VALIDATION REQUIRED';
const NEEDS_REFINEMENT_VERDICT = 'AI BREW NEEDS REFINEMENT BEFORE PRODUCTION';
const NOT_READY_VERDICT = 'AI BREW NOT READY';

const TARGET_PROFILE_IDS = [
  'balance_clean',
  'more_sweetness',
  'more_acidity',
  'fruit_forward',
  'floral_transparent',
  'more_body',
  'soft_round',
  'dense_comforting',
];

const ROAST_LEVELS = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];

const SCORE_KEYS = [
  'recipeSafety',
  'methodFit',
  'targetFit',
  'beanFit',
  'roastFit',
  'processFit',
  'varietyFit',
  'waterHonesty',
  'grinderHonesty',
  'temperatureLogic',
  'grindLogic',
  'extractionTimeLogic',
  'workflowLanguageSafety',
  'pourFlowLogic',
  'bloomLogic',
  'expectedCupHonesty',
  'warningQuality',
  'mobileCopyQuality',
  'overclaimRisk',
];

const GUARDRAIL_SEVERITY_POLICY = {
  numeric_nan: 'fail',
  numeric_negative: 'fail',
  impossible_ratio: 'fail',
  iced_split_wrong: 'fail',
  method_leak_espresso: 'fail',
  water_risk_high_confidence: 'fail',
  fallback_grinder_high_confidence: 'fail',
  zero_mineral_brew_ready: 'fail',
  'target mismatch': 'warn',
  fallback_grinder_calibration_risk: 'warn',
  water_manual_verification_risk: 'warn',
  low_mineral_filter_clarity_risk: 'warn',
  dark_floral_target_risk: 'warn',
  real_brew_validation_pending: 'warn',
};

const BEAN_ARCHETYPES = [
  {
    id: 'panama-washed-geisha',
    label: 'Panama Hacienda La Esmeralda Geisha Washed style',
    origin: 'Panama',
    process: 'washed',
    customProcess: '',
    variety: 'gesha',
    customVariety: '',
    defaultRoasts: ['light', 'medium_light'],
    fitTargets: ['floral_transparent', 'fruit_forward', 'balance_clean', 'more_sweetness'],
    mismatchTargets: ['more_body', 'dense_comforting'],
    expectation: 'premium_floral',
    expected: 'high clarity, jasmine/floral, bergamot, tea-like acidity',
  },
  {
    id: 'panama-natural-geisha',
    label: 'Panama Elida Estate Natural Geisha style',
    origin: 'Panama',
    process: 'natural',
    customProcess: '',
    variety: 'gesha',
    customVariety: '',
    defaultRoasts: ['light', 'medium_light'],
    fitTargets: ['fruit_forward', 'floral_transparent', 'more_sweetness'],
    mismatchTargets: ['dense_comforting', 'more_body'],
    expectation: 'premium_ferment_risk',
    expected: 'tropical fruit, florals, winey risk, heavier natural sweetness',
  },
  {
    id: 'ethiopia-washed-landrace',
    label: 'Ethiopia Yirgacheffe Washed Landrace style',
    origin: 'Ethiopia',
    process: 'washed',
    customProcess: '',
    variety: 'ethiopian_heirloom',
    customVariety: '',
    defaultRoasts: ['light', 'medium_light'],
    fitTargets: ['more_acidity', 'floral_transparent', 'balance_clean'],
    mismatchTargets: ['dense_comforting'],
    expectation: 'washed_floral',
    expected: 'citrus, tea-like florals, clean acidity',
  },
  {
    id: 'ethiopia-natural-landrace',
    label: 'Ethiopia Guji Natural Landrace style',
    origin: 'Ethiopia',
    process: 'natural',
    customProcess: '',
    variety: 'ethiopian_heirloom',
    customVariety: '',
    defaultRoasts: ['light', 'medium_light', 'medium'],
    fitTargets: ['fruit_forward', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'natural_ferment',
    expected: 'berry, tropical fruit, winey/ferment risk if over-agitated',
  },
  {
    id: 'kenya-washed-sl',
    label: 'Kenya AA SL28/SL34 Washed style',
    origin: 'Kenya',
    process: 'washed',
    customProcess: '',
    variety: 'sl28',
    customVariety: 'SL28 / SL34',
    defaultRoasts: ['light', 'medium_light'],
    fitTargets: ['more_acidity', 'balance_clean', 'more_sweetness'],
    mismatchTargets: ['dense_comforting'],
    expectation: 'bright_acidity',
    expected: 'blackcurrant, citrus, bright acidity, strong structure',
  },
  {
    id: 'colombia-pink-bourbon',
    label: 'Colombia Pink Bourbon Washed style',
    origin: 'Colombia',
    process: 'washed',
    customProcess: '',
    variety: 'pink_bourbon',
    customVariety: '',
    defaultRoasts: ['light', 'medium_light', 'medium'],
    fitTargets: ['more_sweetness', 'floral_transparent', 'balance_clean'],
    mismatchTargets: ['dense_comforting'],
    expectation: 'sweet_floral',
    expected: 'sweet citrus, florals, clean sweetness',
  },
  {
    id: 'colombia-washed-caturra-castillo',
    label: 'Colombia Caturra/Castillo Washed style',
    origin: 'Colombia',
    process: 'washed',
    customProcess: '',
    variety: 'castillo',
    customVariety: 'Caturra / Castillo',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['more_sweetness', 'balance_clean', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'balanced_sweet',
    expected: 'caramel, red fruit, clean cup',
  },
  {
    id: 'colombia-thermal-shock',
    label: 'Colombia Thermal Shock Caturra style',
    origin: 'Colombia',
    process: 'custom',
    customProcess: 'thermal shock anaerobic',
    variety: 'caturra',
    customVariety: '',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['fruit_forward', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'experimental_ferment',
    expected: 'intense fruit, ferment risk, avoid over-extraction',
  },
  {
    id: 'costa-rica-honey-natural',
    label: 'Costa Rica Honey/Natural style',
    origin: 'Costa Rica',
    process: 'honey',
    customProcess: '',
    variety: 'catuai',
    customVariety: '',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['more_sweetness', 'fruit_forward', 'balance_clean'],
    mismatchTargets: ['more_acidity'],
    expectation: 'sweet_honey',
    expected: 'honey sweetness, red fruit, medium body',
  },
  {
    id: 'brazil-natural-yellow-bourbon',
    label: 'Brazil Natural Yellow Bourbon/Catuai style',
    origin: 'Brazil',
    process: 'natural',
    customProcess: '',
    variety: 'yellow_bourbon',
    customVariety: 'Yellow Bourbon / Catuai',
    defaultRoasts: ['medium', 'medium_dark'],
    fitTargets: ['dense_comforting', 'more_body', 'soft_round', 'more_sweetness'],
    mismatchTargets: ['floral_transparent', 'more_acidity'],
    expectation: 'low_acid_body',
    expected: 'nutty, chocolate, low acidity, body',
  },
  {
    id: 'guatemala-washed-bourbon-caturra',
    label: 'Guatemala Washed Bourbon/Caturra style',
    origin: 'Guatemala',
    process: 'washed',
    customProcess: '',
    variety: 'bourbon',
    customVariety: 'Bourbon / Caturra',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['balance_clean', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'balanced_sweet',
    expected: 'chocolate, citrus, balanced acidity',
  },
  {
    id: 'sumatra-wet-hulled',
    label: 'Sumatra Wet-Hulled style',
    origin: 'Indonesia',
    process: 'wet_hulled',
    customProcess: '',
    variety: 'ateng_super',
    customVariety: 'Ateng / Mandheling regional lot',
    defaultRoasts: ['medium', 'medium_dark'],
    fitTargets: ['more_body', 'dense_comforting', 'soft_round'],
    mismatchTargets: ['floral_transparent', 'more_acidity'],
    expectation: 'wet_hulled_body',
    expected: 'spice, earth, body, lower clarity',
  },
  {
    id: 'indonesia-gayo-washed',
    label: 'Indonesia Gayo Washed Ateng/Typica style',
    origin: 'Indonesia',
    process: 'washed',
    customProcess: '',
    variety: 'custom',
    customVariety: 'Ateng / Typica',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['balance_clean', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'indonesia_clean_sweet',
    expected: 'herbal citrus, cocoa sweetness, medium body',
  },
  {
    id: 'indonesia-toraja-washed',
    label: 'Indonesia Toraja Washed Typica style',
    origin: 'Indonesia',
    process: 'washed',
    customProcess: '',
    variety: 'custom',
    customVariety: 'Toraja Typica style',
    defaultRoasts: ['medium', 'medium_dark'],
    fitTargets: ['more_body', 'dense_comforting', 'soft_round'],
    mismatchTargets: ['floral_transparent', 'more_acidity'],
    expectation: 'indonesia_body_spice',
    expected: 'sweet spice, cocoa, body, moderate clarity',
  },
  {
    id: 'indonesia-java-washed',
    label: 'Indonesia Java Washed Typica style',
    origin: 'Indonesia',
    process: 'washed',
    customProcess: '',
    variety: 'custom',
    customVariety: 'Java Typica style',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['balance_clean', 'more_sweetness', 'more_body'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'indonesia_balanced',
    expected: 'cocoa, gentle citrus, balanced sweetness',
  },
  {
    id: 'indonesia-bali-natural',
    label: 'Indonesia Bali Natural/Kintamani style',
    origin: 'Indonesia',
    process: 'natural',
    customProcess: '',
    variety: 'custom',
    customVariety: 'Kintamani regional lot',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['fruit_forward', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'indonesia_fruit_variable',
    expected: 'orange-like fruit, chocolate, natural-process variability',
  },
  {
    id: 'indonesia-flores-wet-hulled',
    label: 'Indonesia Flores Wet-Hulled style',
    origin: 'Indonesia',
    process: 'wet_hulled',
    customProcess: '',
    variety: 'custom',
    customVariety: 'Flores regional lot',
    defaultRoasts: ['medium', 'medium_dark'],
    fitTargets: ['more_body', 'dense_comforting', 'soft_round'],
    mismatchTargets: ['floral_transparent', 'more_acidity'],
    expectation: 'wet_hulled_body',
    expected: 'spice, cocoa, body, lower clarity',
  },
  {
    id: 'indonesia-kerinci-honey',
    label: 'Indonesia Kerinci Honey Sigararutang style',
    origin: 'Indonesia',
    process: 'honey',
    customProcess: '',
    variety: 'custom',
    customVariety: 'Sigararutang / Andungsari regional lot',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['more_sweetness', 'fruit_forward', 'balance_clean'],
    mismatchTargets: ['dense_comforting'],
    expectation: 'indonesia_fruit_sweet',
    expected: 'red fruit, brown sugar, citrus lift, medium body',
  },
  {
    id: 'indonesia-papua-washed',
    label: 'Indonesia Papua Wamena Washed Typica style',
    origin: 'Indonesia',
    process: 'washed',
    customProcess: '',
    variety: 'custom',
    customVariety: 'Typica / S795 highland lot',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['balance_clean', 'more_sweetness', 'more_acidity'],
    mismatchTargets: ['dense_comforting'],
    expectation: 'indonesia_clean_sweet',
    expected: 'sweet spice, orange-like acidity, clean medium body',
  },
  {
    id: 'indonesia-bajawa-natural',
    label: 'Indonesia Bajawa Flores Natural Catimor style',
    origin: 'Indonesia',
    process: 'natural',
    customProcess: '',
    variety: 'catimor',
    customVariety: 'Bajawa Catimor / S795 regional lot',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['fruit_forward', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'indonesia_fruit_variable',
    expected: 'cocoa, tropical fruit, spice, natural-process variability',
  },
  {
    id: 'indonesia-java-preanger',
    label: 'Indonesia Java Preanger Washed S795 style',
    origin: 'Indonesia',
    process: 'washed',
    customProcess: '',
    variety: 's795',
    customVariety: '',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['balance_clean', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'indonesia_balanced',
    expected: 'cocoa, spice, soft citrus, balanced sweetness',
  },
  {
    id: 'mexico-chiapas-washed',
    label: 'Mexico Chiapas Washed Bourbon style',
    origin: 'Mexico',
    process: 'washed',
    customProcess: '',
    variety: 'bourbon',
    customVariety: 'Bourbon / Typica',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['balance_clean', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['dense_comforting'],
    expectation: 'balanced_sweet',
    expected: 'milk chocolate, citrus, approachable sweetness',
  },
  {
    id: 'peru-cajamarca-washed',
    label: 'Peru Cajamarca Washed Typica style',
    origin: 'Peru',
    process: 'washed',
    customProcess: '',
    variety: 'typica',
    customVariety: 'Typica / Caturra',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['balance_clean', 'more_sweetness', 'more_acidity'],
    mismatchTargets: ['dense_comforting'],
    expectation: 'washed_acid_sweet',
    expected: 'citrus, caramel, clean sweetness',
  },
  {
    id: 'bolivia-caranavi-washed',
    label: 'Bolivia Caranavi Washed Caturra style',
    origin: 'Bolivia',
    process: 'washed',
    customProcess: '',
    variety: 'caturra',
    customVariety: '',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['more_sweetness', 'balance_clean', 'floral_transparent'],
    mismatchTargets: ['dense_comforting'],
    expectation: 'sweet_floral',
    expected: 'stone fruit, florals, clean caramel sweetness',
  },
  {
    id: 'uganda-natural-sl',
    label: 'Uganda Natural SL14/SL28 style',
    origin: 'Uganda',
    process: 'natural',
    customProcess: '',
    variety: 'custom',
    customVariety: 'SL14 / SL28',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['fruit_forward', 'more_sweetness', 'more_body'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'natural_ferment',
    expected: 'red fruit, cocoa, natural-process ferment risk',
  },
  {
    id: 'nicaragua-maracaturra-washed',
    label: 'Nicaragua Maracaturra Washed style',
    origin: 'Nicaragua',
    process: 'washed',
    customProcess: '',
    variety: 'custom',
    customVariety: 'Maracaturra',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['balance_clean', 'more_sweetness', 'more_acidity'],
    mismatchTargets: ['dense_comforting'],
    expectation: 'balanced_sweet',
    expected: 'citrus, cocoa, rounded sweetness',
  },
  {
    id: 'honduras-parainema-honey',
    label: 'Honduras Parainema Honey style',
    origin: 'Honduras',
    process: 'honey',
    customProcess: '',
    variety: 'custom',
    customVariety: 'Parainema',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['more_sweetness', 'fruit_forward', 'balance_clean'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'sweet_honey',
    expected: 'honey sweetness, tropical fruit, medium body',
  },
  {
    id: 'thailand-doi-chang-washed',
    label: 'Thailand Doi Chang Washed Catimor style',
    origin: 'Thailand',
    process: 'washed',
    customProcess: '',
    variety: 'catimor',
    customVariety: 'Catimor / Typica regional lot',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['balance_clean', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'balanced_sweet',
    expected: 'citrus, nutty sweetness, clean medium body',
  },
  {
    id: 'laos-bolaven-washed',
    label: 'Laos Bolaven Washed Catimor style',
    origin: 'Laos',
    process: 'washed',
    customProcess: '',
    variety: 'catimor',
    customVariety: '',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['balance_clean', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'balanced_sweet',
    expected: 'cocoa, citrus, soft herbal sweetness',
  },
  {
    id: 'rwanda-burundi-washed',
    label: 'Rwanda/Burundi Washed Bourbon style',
    origin: 'Rwanda / Burundi',
    process: 'washed',
    customProcess: '',
    variety: 'red_bourbon',
    customVariety: '',
    defaultRoasts: ['light', 'medium_light'],
    fitTargets: ['more_acidity', 'more_sweetness', 'balance_clean'],
    mismatchTargets: ['dense_comforting'],
    expectation: 'washed_acid_sweet',
    expected: 'red fruit, citrus, tea-like sweetness',
  },
  {
    id: 'yemen-natural-traditional',
    label: 'Yemen Natural Traditional style',
    origin: 'Yemen',
    process: 'natural',
    customProcess: 'traditional natural',
    variety: 'bourbon',
    customVariety: 'Yemeni landrace style',
    defaultRoasts: ['medium_light', 'medium'],
    fitTargets: ['dense_comforting', 'fruit_forward', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'rustic_variable',
    expected: 'spice, dried fruit, rustic cup, variability warning',
  },
  {
    id: 'colombia-decaf',
    label: 'Colombia Sugarcane Decaf style',
    origin: 'Colombia',
    process: 'sugarcane_decaf',
    customProcess: 'sugarcane EA decaf',
    variety: 'caturra',
    customVariety: '',
    defaultRoasts: ['medium', 'medium_dark'],
    fitTargets: ['soft_round', 'more_sweetness'],
    mismatchTargets: ['more_acidity'],
    expectation: 'decaf_sensitive',
    expected: 'lower confidence, decaf-sensitive extraction',
  },
  {
    id: 'specialty-robusta',
    label: 'Specialty Robusta/Canephora style',
    origin: 'Vietnam',
    process: 'custom',
    customProcess: 'washed canephora',
    variety: 'custom',
    customVariety: 'specialty robusta canephora',
    defaultRoasts: ['medium', 'medium_dark'],
    fitTargets: ['more_body', 'dense_comforting', 'soft_round'],
    mismatchTargets: ['floral_transparent', 'more_acidity'],
    expectation: 'non_arabica',
    expected: 'lower acidity, strong body, non-arabica warning',
  },
  {
    id: 'india-monsooned-malabar',
    label: 'India Monsooned Malabar style',
    origin: 'India',
    process: 'custom',
    customProcess: 'monsooned',
    variety: 'custom',
    customVariety: 'Arabica monsooned lot',
    defaultRoasts: ['medium', 'medium_dark', 'dark'],
    fitTargets: ['more_body', 'dense_comforting', 'soft_round'],
    mismatchTargets: ['floral_transparent', 'more_acidity'],
    expectation: 'low_acid_body',
    expected: 'low acidity, spice, heavy body, rustic cup risk',
  },
  {
    id: 'liberica-excelsa',
    label: 'Liberica / Excelsa specialty style',
    origin: 'Southeast Asia',
    process: 'custom',
    customProcess: 'natural liberica/excelsa',
    variety: 'custom',
    customVariety: 'Liberica / Excelsa',
    defaultRoasts: ['medium', 'medium_dark'],
    fitTargets: ['more_body', 'dense_comforting', 'fruit_forward'],
    mismatchTargets: ['floral_transparent', 'more_acidity'],
    expectation: 'non_arabica',
    expected: 'distinct fruit, woody sweetness, strong body, lower confidence',
  },
  {
    id: 'unknown-bean',
    label: 'Unknown origin/process/variety',
    origin: 'Unknown',
    process: '',
    customProcess: '',
    variety: '',
    customVariety: '',
    defaultRoasts: ['medium'],
    fitTargets: ['balance_clean', 'soft_round'],
    mismatchTargets: ['floral_transparent'],
    expectation: 'unknown',
    expected: 'safe baseline, lower confidence, no specific flavor overclaim',
  },
  {
    id: 'espresso-roast-blend',
    label: 'Espresso roast blend style',
    origin: 'Blend',
    process: 'washed',
    customProcess: '',
    variety: '',
    customVariety: 'espresso blend',
    defaultRoasts: ['medium_dark', 'dark'],
    fitTargets: ['soft_round', 'dense_comforting', 'more_body'],
    mismatchTargets: ['floral_transparent', 'more_acidity'],
    expectation: 'dark_blend',
    expected: 'round chocolate, lower acidity, espresso dial-in required',
  },
];

const WATER_CASES = [
  {
    id: 'volvic-style',
    label: 'Volvic style bottled water',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '130', waterHardnessPpm: '63', waterAlkalinityPpm: '61', waterCustomized: true, waterNotes: 'Volvic style balanced bottled water' },
    risk: 'balanced',
    expected: 'usable bottled water, not a perfect floral clarity guarantee',
  },
  {
    id: 'tww-balanced',
    label: 'Third Wave Water / remineralized balanced',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '120', waterHardnessPpm: '68', waterAlkalinityPpm: '40', waterCustomized: true, waterNotes: 'remineralized balanced brew water' },
    risk: 'balanced',
    expected: 'clarity-friendly if minerals are measured correctly',
  },
  {
    id: 'low-buffer-clarity',
    label: 'Low buffer clarity water',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '70', waterHardnessPpm: '40', waterAlkalinityPpm: '18', waterCustomized: true, waterNotes: 'low buffer clarity water' },
    risk: 'low_buffer',
    expected: 'helps acidity/floral, can taste sharp if alkalinity too low',
  },
  {
    id: 'high-buffer-alkaline',
    label: 'High buffer alkaline water',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '185', waterHardnessPpm: '85', waterAlkalinityPpm: '120', waterCustomized: true, waterNotes: 'high buffer alkaline water' },
    risk: 'high_buffer',
    expected: 'mutes acidity/floral and lowers confidence',
  },
  {
    id: 'zero-mineral-ro',
    label: 'zero-mineral RO / distilled water',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '0', waterHardnessPpm: '0', waterAlkalinityPpm: '0', waterCustomized: true, waterNotes: 'zero-mineral RO base water' },
    risk: 'zero_mineral',
    expected: 'must block or warn until remineralized',
  },
  {
    id: 'hard-water',
    label: 'Hard water',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '280', waterHardnessPpm: '170', waterAlkalinityPpm: '105', waterCustomized: true, waterNotes: 'hard water scaling and dull cup risk' },
    risk: 'hard',
    expected: 'warn about dull/heavy cup and espresso machine risk',
  },
  {
    id: 'unknown-bottled-estimated',
    label: 'Unknown estimated bottled water',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '95', waterHardnessPpm: '55', waterAlkalinityPpm: '45', waterCustomized: true, waterNotes: 'estimated bottled water, verify label manually' },
    risk: 'estimated',
    expected: 'medium confidence, verify manually',
  },
  {
    id: 'espresso-safe',
    label: 'Espresso-safe water',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '90', waterHardnessPpm: '45', waterAlkalinityPpm: '35', waterCustomized: true, waterNotes: 'espresso-safe water range, still check machine spec' },
    risk: 'espresso_safe',
    expected: 'usable for espresso with machine-safety caveat',
  },
  {
    id: 'aqua-indonesia',
    label: 'Aqua bottled water Indonesia style',
    input: { waterMode: 'brand', waterBrandId: 'aqua-id', waterTdsPpm: '', waterHardnessPpm: '', waterAlkalinityPpm: '', waterCustomized: false, waterNotes: 'community_barista_autofill: Aqua bottled baseline; verify current label and local batch' },
    risk: 'balanced_bottled_baseline',
    expected: 'community barista autofill; accessible bottled-water baseline, not a perfect official claim',
  },
  {
    id: 'le-minerale-indonesia',
    label: 'Le Minerale bottled water Indonesia style',
    input: { waterMode: 'brand', waterBrandId: 'le-minerale-id', waterTdsPpm: '', waterHardnessPpm: '', waterAlkalinityPpm: '', waterCustomized: false, waterNotes: 'community_barista_autofill: Le Minerale bottled mineral baseline; verify label and batch' },
    risk: 'mineral_bottled_body',
    expected: 'community barista autofill; can support body/sweetness but may mute delicate acidity',
  },
  {
    id: 'ades-indonesia',
    label: 'Ades bottled water Indonesia style',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '100', waterHardnessPpm: '50', waterAlkalinityPpm: '40', waterCustomized: true, waterNotes: 'Ades-style Indonesian bottled water; verify current label' },
    risk: 'indonesia_bottled_balanced',
    expected: 'estimated balanced bottled water; manual mineral check still preferred',
  },
  {
    id: 'club-indonesia',
    label: 'Club bottled water Indonesia style',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '135', waterHardnessPpm: '70', waterAlkalinityPpm: '55', waterCustomized: true, waterNotes: 'Club-style Indonesian bottled water; verify current label' },
    risk: 'indonesia_bottled_body',
    expected: 'usable with body bias; verify GH/KH for floral coffees',
  },
  {
    id: 'equil-indonesia',
    label: 'Equil mineral water Indonesia style',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '220', waterHardnessPpm: '120', waterAlkalinityPpm: '110', waterCustomized: true, waterNotes: 'Equil-style higher mineral water; verify label before espresso machine use' },
    risk: 'high_buffer',
    expected: 'higher mineral/buffer risk; may mute acidity/floral and raise espresso scaling concern',
  },
  {
    id: 'cleo-indonesia',
    label: 'Cleo low-mineral water Indonesia style',
    input: { waterMode: 'brand', waterBrandId: 'cleo-id', waterTdsPpm: '', waterHardnessPpm: '', waterAlkalinityPpm: '', waterCustomized: false, waterNotes: 'community_barista_autofill: Cleo low-mineral clarity water for filter; verify taste and body' },
    risk: 'low_mineral_filter_clarity',
    expected: 'filter autofill allowed with thin/sharp body warning and capped confidence',
  },
  {
    id: 'amidis-indonesia',
    label: 'Amidis demineralized water Indonesia style',
    input: { waterMode: 'brand', waterBrandId: 'amidis-id', waterTdsPpm: '', waterHardnessPpm: '', waterAlkalinityPpm: '', waterCustomized: false, waterNotes: 'community_barista_autofill: Amidis direct low-mineral filter experiment; remineralize for repeatability' },
    risk: 'demineral_direct_filter_experimental',
    expected: 'filter autofill allowed as low-confidence experiment; espresso still unsafe without minerals',
  },
  {
    id: 'super-o2-indonesia',
    label: 'Super O2 low-mineral water Indonesia style',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '25', waterHardnessPpm: '8', waterAlkalinityPpm: '5', waterCustomized: true, waterNotes: 'Super O2-style low-mineral water; verify current mineral label' },
    risk: 'zero_mineral',
    expected: 'likely needs mineral verification or remineralization for consistent brewing',
  },
  {
    id: 'pristine-alkaline-indonesia',
    label: 'Pristine 8.6+ alkaline water Indonesia style',
    input: { waterMode: 'brand', waterBrandId: 'pristine-8-6-plus-id', waterTdsPpm: '', waterHardnessPpm: '', waterAlkalinityPpm: '', waterCustomized: false, waterNotes: 'community_barista_autofill: Pristine alkaline/high-buffer caution; high buffer can mute acidity/florals' },
    risk: 'alkaline_high_buffer_floral_mismatch',
    expected: 'high-buffer warning for acidity/floral targets',
  },
  {
    id: 'galon-depot-indonesia',
    label: 'Galon isi ulang / depot water Indonesia style',
    input: { waterMode: 'manual', waterBrandId: '', waterTdsPpm: '95', waterHardnessPpm: '45', waterAlkalinityPpm: '35', waterCustomized: true, waterNotes: 'galon depot water estimate; require manual TDS/GH/KH because depot treatment varies' },
    risk: 'manual_required',
    expected: 'manual verification required; no high confidence without TDS/GH/KH check',
  },
];

const GRINDER_CASES = [
  { id: 'k-ultra', label: '1Zpresso K-Ultra', patterns: [/k-ultra/i], class: 'official_high', espresso: 'caution' },
  { id: 'c40', label: 'Comandante C40', patterns: [/comandante.*c40/i], class: 'official_high', espresso: 'caution' },
  { id: 'encore-esp', label: 'Baratza Encore ESP', patterns: [/encore.*esp/i], class: 'espresso_capable', espresso: 'compatible' },
  { id: 'df64', label: 'DF64 espresso/filter hybrid', syntheticId: 'df64-synthetic', class: 'espresso_capable_unverified', espresso: 'compatible' },
  { id: 'kingrinder-k6', label: 'Kingrinder K6', patterns: [/kingrinder.*k6/i], class: 'curated', espresso: 'caution' },
  { id: 'timemore-c2', label: 'Timemore C2', patterns: [/timemore.*c2/i], class: 'curated_filter', espresso: 'not_recommended' },
  { id: 'timemore-c3', label: 'Timemore C3', patterns: [/timemore.*c3(?!.*esp)/i], class: 'curated_filter', espresso: 'not_recommended' },
  { id: 'fellow-ode', label: 'Fellow Ode Gen 2', patterns: [/fellow.*ode/i], class: 'curated_filter', espresso: 'not_recommended' },
  { id: 'baratza-encore', label: 'Baratza Encore', patterns: [/baratza.*encore(?!.*esp)/i], class: 'curated_filter', espresso: 'not_recommended' },
  { id: 'feima-600n', label: 'Feima 600N / Murane B600BN / Latina 600N / Flying Eagle 600N / Fomac / Kova 600N', patterns: [/feima.*600n/i, /murane/i, /latina/i, /flying.*eagle/i, /fomac/i, /kova/i], class: 'community_600n', espresso: 'not_recommended' },
  { id: 'unknown-manual-grinder', label: 'Unknown manual grinder', syntheticId: 'unknown-manual-grinder', class: 'fallback grinder', espresso: 'not_recommended' },
  { id: 'unknown-electric-grinder', label: 'Unknown electric grinder', syntheticId: 'unknown-electric-grinder', class: 'fallback grinder', espresso: 'not_recommended' },
  { id: 'espresso-zero-point-unknown', label: 'Espresso grinder zero-point unknown', syntheticId: 'espresso-zero-point-unknown', class: 'fallback grinder', espresso: 'caution' },
];

const METHOD_CASES = [
  { id: 'v60-hot', label: 'V60 hot', mode: 'hot', family: 'v60', dripperPatterns: [/v60/i] },
  { id: 'v60-iced', label: 'V60 iced', mode: 'iced', family: 'v60', dripperPatterns: [/v60/i] },
  { id: 'switch-02-hot', label: 'Hario Switch 02 hot', mode: 'hot', family: 'hario_switch', dripperPatterns: [/switch.*02/i] },
  { id: 'switch-02-iced', label: 'Hario Switch 02 iced', mode: 'iced', family: 'hario_switch', dripperPatterns: [/switch.*02/i] },
  { id: 'switch-03-hot', label: 'Hario Switch 03 hot', mode: 'hot', family: 'hario_switch', dripperPatterns: [/switch.*03/i] },
  { id: 'switch-03-iced', label: 'Hario Switch 03 iced', mode: 'iced', family: 'hario_switch', dripperPatterns: [/switch.*03/i] },
  { id: 'mugen-switch', label: 'MUGEN x Switch', mode: 'hot', family: 'hario_switch', dripperPatterns: [/mugen.*switch/i] },
  { id: 'chemex', label: 'Chemex', mode: 'hot', family: 'chemex', dripperPatterns: [/chemex/i] },
  { id: 'origami', label: 'Origami', mode: 'hot', family: 'origami', dripperPatterns: [/origami/i] },
  { id: 'kono', label: 'Kono', mode: 'hot', family: 'kono', dripperPatterns: [/kono/i] },
  { id: 'melitta', label: 'Melitta', mode: 'hot', family: 'melitta', dripperPatterns: [/melitta/i] },
  { id: 'kalita-flat', label: 'Kalita / flat-bottom', mode: 'hot', family: 'kalita_wave', dripperPatterns: [/kalita|wave/i] },
  { id: 'april-orea-b75', label: 'April / Orea / B75 style flat-bottom', mode: 'hot', family: 'april', dripperPatterns: [/april|orea|b75/i] },
  { id: 'clever', label: 'Clever Dripper', mode: 'hot', family: 'clever_dripper', dripperPatterns: [/clever/i] },
  { id: 'aeropress', label: 'AeroPress', mode: 'hot', family: 'aeropress', dripperPatterns: [/aeropress/i] },
  { id: 'french-press', label: 'French Press', mode: 'hot', family: 'french_press', dripperPatterns: [/french/i] },
  { id: 'espresso', label: 'Espresso', mode: 'hot', family: 'espresso', dripperPatterns: [/espresso/i] },
  { id: 'moka-pot', label: 'Moka Pot', mode: 'hot', family: 'moka_pot', dripperPatterns: [/moka/i] },
  { id: 'cold-brew', label: 'Cold Brew', mode: 'hot', family: 'cold_brew', dripperPatterns: [/cold|toddy/i] },
  { id: 'batch-brewer', label: 'Batch Brewer', mode: 'hot', family: 'batch_brew', dripperPatterns: [/batch/i] },
  { id: 'siphon', label: 'Siphon', mode: 'hot', family: 'siphon', dripperPatterns: [/siphon/i] },
];

const REQUIRED_EXAMPLE_CASES = [
  { exampleId: '01-panama-washed-geisha-v60-floral', beanId: 'panama-washed-geisha', methodId: 'v60-hot', targetProfileId: 'floral_transparent', grinderId: 'k-ultra', waterId: 'low-buffer-clarity', roastLevel: 'light' },
  { exampleId: '02-panama-natural-geisha-v60-iced-fruit', beanId: 'panama-natural-geisha', methodId: 'v60-iced', targetProfileId: 'fruit_forward', grinderId: 'c40', waterId: 'tww-balanced', roastLevel: 'light' },
  { exampleId: '03-panama-natural-geisha-more-body-mismatch', beanId: 'panama-natural-geisha', methodId: 'v60-hot', targetProfileId: 'more_body', grinderId: 'k-ultra', waterId: 'volvic-style', roastLevel: 'medium_light' },
  { exampleId: '04-ethiopia-washed-v60-acidity', beanId: 'ethiopia-washed-landrace', methodId: 'v60-hot', targetProfileId: 'more_acidity', grinderId: 'k-ultra', waterId: 'low-buffer-clarity', roastLevel: 'light' },
  { exampleId: '05-ethiopia-natural-switch-fruit', beanId: 'ethiopia-natural-landrace', methodId: 'switch-02-hot', targetProfileId: 'fruit_forward', grinderId: 'kingrinder-k6', waterId: 'tww-balanced', roastLevel: 'medium_light' },
  { exampleId: '06-kenya-washed-chemex-acidity', beanId: 'kenya-washed-sl', methodId: 'chemex', targetProfileId: 'more_acidity', grinderId: 'c40', waterId: 'low-buffer-clarity', roastLevel: 'light' },
  { exampleId: '07-colombia-pink-bourbon-kalita-sweetness', beanId: 'colombia-pink-bourbon', methodId: 'kalita-flat', targetProfileId: 'more_sweetness', grinderId: 'k-ultra', waterId: 'volvic-style', roastLevel: 'medium_light' },
  { exampleId: '08-colombia-anaerobic-v60-fruit', beanId: 'colombia-thermal-shock', methodId: 'v60-hot', targetProfileId: 'fruit_forward', grinderId: 'c40', waterId: 'tww-balanced', roastLevel: 'medium_light' },
  { exampleId: '09-brazil-natural-french-press-dense', beanId: 'brazil-natural-yellow-bourbon', methodId: 'french-press', targetProfileId: 'dense_comforting', grinderId: 'baratza-encore', waterId: 'volvic-style', roastLevel: 'medium' },
  { exampleId: '10-indonesia-wet-hulled-clever-body', beanId: 'sumatra-wet-hulled', methodId: 'clever', targetProfileId: 'more_body', grinderId: 'feima-600n', waterId: 'unknown-bottled-estimated', roastLevel: 'medium' },
  { exampleId: '11-costa-rica-honey-aeropress-sweetness', beanId: 'costa-rica-honey-natural', methodId: 'aeropress', targetProfileId: 'more_sweetness', grinderId: 'kingrinder-k6', waterId: 'tww-balanced', roastLevel: 'medium_light' },
  { exampleId: '12-guatemala-washed-v60-balance', beanId: 'guatemala-washed-bourbon-caturra', methodId: 'v60-hot', targetProfileId: 'balance_clean', grinderId: 'timemore-c3', waterId: 'volvic-style', roastLevel: 'medium' },
  { exampleId: '13-rwanda-washed-origami-acidity', beanId: 'rwanda-burundi-washed', methodId: 'origami', targetProfileId: 'more_acidity', grinderId: 'k-ultra', waterId: 'low-buffer-clarity', roastLevel: 'light' },
  { exampleId: '14-yemen-natural-v60-dense', beanId: 'yemen-natural-traditional', methodId: 'v60-hot', targetProfileId: 'dense_comforting', grinderId: 'c40', waterId: 'unknown-bottled-estimated', roastLevel: 'medium' },
  { exampleId: '15-decaf-colombia-v60-soft', beanId: 'colombia-decaf', methodId: 'v60-hot', targetProfileId: 'soft_round', grinderId: 'timemore-c2', waterId: 'volvic-style', roastLevel: 'medium' },
  { exampleId: '16-robusta-french-press-body', beanId: 'specialty-robusta', methodId: 'french-press', targetProfileId: 'more_body', grinderId: 'baratza-encore', waterId: 'hard-water', roastLevel: 'medium_dark' },
  { exampleId: '17-dark-roast-espresso-encore-esp-soft', beanId: 'espresso-roast-blend', methodId: 'espresso', targetProfileId: 'soft_round', grinderId: 'encore-esp', waterId: 'espresso-safe', roastLevel: 'dark' },
  { exampleId: '18-timemore-c2-espresso-blocked', beanId: 'espresso-roast-blend', methodId: 'espresso', targetProfileId: 'soft_round', grinderId: 'timemore-c2', waterId: 'espresso-safe', roastLevel: 'medium_dark' },
  { exampleId: '19-fellow-ode-espresso-blocked', beanId: 'espresso-roast-blend', methodId: 'espresso', targetProfileId: 'soft_round', grinderId: 'fellow-ode', waterId: 'espresso-safe', roastLevel: 'medium_dark' },
  { exampleId: '20-unknown-grinder-espresso-low-confidence', beanId: 'espresso-roast-blend', methodId: 'espresso', targetProfileId: 'soft_round', grinderId: 'unknown-electric-grinder', waterId: 'espresso-safe', roastLevel: 'medium_dark' },
  { exampleId: '21-unknown-bean-v60-baseline', beanId: 'unknown-bean', methodId: 'v60-hot', targetProfileId: 'balance_clean', grinderId: 'unknown-manual-grinder', waterId: 'unknown-bottled-estimated', roastLevel: 'medium' },
  { exampleId: '22-volvic-geisha-floral', beanId: 'panama-washed-geisha', methodId: 'v60-hot', targetProfileId: 'floral_transparent', grinderId: 'k-ultra', waterId: 'volvic-style', roastLevel: 'light' },
  { exampleId: '23-high-buffer-water-floral-warning', beanId: 'panama-washed-geisha', methodId: 'v60-hot', targetProfileId: 'floral_transparent', grinderId: 'k-ultra', waterId: 'high-buffer-alkaline', roastLevel: 'light' },
  { exampleId: '24-zero-mineral-water-block', beanId: 'ethiopia-washed-landrace', methodId: 'v60-hot', targetProfileId: 'floral_transparent', grinderId: 'k-ultra', waterId: 'zero-mineral-ro', roastLevel: 'light' },
  { exampleId: '25-low-buffer-acidity-sharpness-warning', beanId: 'kenya-washed-sl', methodId: 'v60-hot', targetProfileId: 'more_acidity', grinderId: 'c40', waterId: 'low-buffer-clarity', roastLevel: 'light' },
  { exampleId: '26-cold-brew-brazil-natural', beanId: 'brazil-natural-yellow-bourbon', methodId: 'cold-brew', targetProfileId: 'dense_comforting', grinderId: 'baratza-encore', waterId: 'volvic-style', roastLevel: 'medium' },
  { exampleId: '27-cold-brew-floral-target-warning', beanId: 'panama-washed-geisha', methodId: 'cold-brew', targetProfileId: 'floral_transparent', grinderId: 'baratza-encore', waterId: 'low-buffer-clarity', roastLevel: 'light' },
  { exampleId: '28-moka-dark-roast', beanId: 'espresso-roast-blend', methodId: 'moka-pot', targetProfileId: 'soft_round', grinderId: 'encore-esp', waterId: 'volvic-style', roastLevel: 'dark' },
  { exampleId: '29-batch-brewer-medium-roast-blend', beanId: 'guatemala-washed-bourbon-caturra', methodId: 'batch-brewer', targetProfileId: 'balance_clean', grinderId: 'baratza-encore', waterId: 'tww-balanced', roastLevel: 'medium' },
  { exampleId: '30-siphon-washed-ethiopia', beanId: 'ethiopia-washed-landrace', methodId: 'siphon', targetProfileId: 'floral_transparent', grinderId: 'c40', waterId: 'tww-balanced', roastLevel: 'light' },
  { exampleId: '31-switch-02-chamber-safety', beanId: 'ethiopia-natural-landrace', methodId: 'switch-02-hot', targetProfileId: 'more_sweetness', grinderId: 'k-ultra', waterId: 'volvic-style', roastLevel: 'medium_light', doseG: '20', targetWaterMl: '320' },
  { exampleId: '32-switch-03-chamber-safety', beanId: 'ethiopia-natural-landrace', methodId: 'switch-03-hot', targetProfileId: 'more_sweetness', grinderId: 'k-ultra', waterId: 'volvic-style', roastLevel: 'medium_light', doseG: '25', targetWaterMl: '400' },
  { exampleId: '33-mugen-x-switch-profile', beanId: 'guatemala-washed-bourbon-caturra', methodId: 'mugen-switch', targetProfileId: 'balance_clean', grinderId: 'feima-600n', waterId: 'unknown-bottled-estimated', roastLevel: 'medium' },
  { exampleId: '34-chemex-30g-larger-dose', beanId: 'kenya-washed-sl', methodId: 'chemex', targetProfileId: 'balance_clean', grinderId: 'c40', waterId: 'volvic-style', roastLevel: 'medium_light', doseG: '30', targetWaterMl: '500' },
  { exampleId: '35-v60-12g-small-dose', beanId: 'ethiopia-washed-landrace', methodId: 'v60-hot', targetProfileId: 'floral_transparent', grinderId: 'k-ultra', waterId: 'low-buffer-clarity', roastLevel: 'light', doseG: '12', targetWaterMl: '200' },
  { exampleId: '36-aeropress-bypass-style', beanId: 'costa-rica-honey-natural', methodId: 'aeropress', targetProfileId: 'more_sweetness', grinderId: 'kingrinder-k6', waterId: 'tww-balanced', roastLevel: 'medium_light', aeropressStyle: 'bypass' },
  { exampleId: '37-french-press-decant-warning', beanId: 'brazil-natural-yellow-bourbon', methodId: 'french-press', targetProfileId: 'dense_comforting', grinderId: 'baratza-encore', waterId: 'hard-water', roastLevel: 'medium_dark' },
  { exampleId: '38-espresso-fast-shot-correction', beanId: 'espresso-roast-blend', methodId: 'espresso', targetProfileId: 'soft_round', grinderId: 'encore-esp', waterId: 'espresso-safe', roastLevel: 'medium_dark', tasteFeedback: 'sour' },
  { exampleId: '39-espresso-slow-shot-correction', beanId: 'espresso-roast-blend', methodId: 'espresso', targetProfileId: 'dense_comforting', grinderId: 'encore-esp', waterId: 'espresso-safe', roastLevel: 'dark', tasteFeedback: 'bitter' },
  { exampleId: '40-iced-v60-water-ice-split-correctness', beanId: 'panama-natural-geisha', methodId: 'v60-iced', targetProfileId: 'fruit_forward', grinderId: 'k-ultra', waterId: 'tww-balanced', roastLevel: 'light', doseG: '15', targetWaterMl: '235' },
  { exampleId: '41-feima-600n-espresso-hard-warning', beanId: 'espresso-roast-blend', methodId: 'espresso', targetProfileId: 'soft_round', grinderId: 'feima-600n', waterId: 'espresso-safe', roastLevel: 'medium_dark' },
  { exampleId: '42-galon-depot-v60-manual-water', beanId: 'indonesia-gayo-washed', methodId: 'v60-hot', targetProfileId: 'balance_clean', grinderId: 'timemore-c3', waterId: 'galon-depot-indonesia', roastLevel: 'medium' },
  { exampleId: '43-pristine-alkaline-geisha-floral-warning', beanId: 'panama-washed-geisha', methodId: 'v60-hot', targetProfileId: 'floral_transparent', grinderId: 'k-ultra', waterId: 'pristine-alkaline-indonesia', roastLevel: 'light' },
  { exampleId: '44-dark-roast-floral-target-mismatch', beanId: 'espresso-roast-blend', methodId: 'v60-hot', targetProfileId: 'floral_transparent', grinderId: 'c40', waterId: 'volvic-style', roastLevel: 'dark' },
  { exampleId: '45-geisha-dense-target-clarity-tradeoff', beanId: 'panama-washed-geisha', methodId: 'chemex', targetProfileId: 'dense_comforting', grinderId: 'c40', waterId: 'low-buffer-clarity', roastLevel: 'medium_light' },
  { exampleId: '46-anaerobic-long-fine-risk', beanId: 'colombia-thermal-shock', methodId: 'switch-03-hot', targetProfileId: 'dense_comforting', grinderId: 'k-ultra', waterId: 'tww-balanced', roastLevel: 'medium', doseG: '22', targetWaterMl: '350' },
  { exampleId: '47-indonesia-toraja-clever-body', beanId: 'indonesia-toraja-washed', methodId: 'clever', targetProfileId: 'more_body', grinderId: 'feima-600n', waterId: 'aqua-indonesia', roastLevel: 'medium_dark' },
  { exampleId: '48-indonesia-bali-natural-aeropress-fruit', beanId: 'indonesia-bali-natural', methodId: 'aeropress', targetProfileId: 'fruit_forward', grinderId: 'kingrinder-k6', waterId: 'le-minerale-indonesia', roastLevel: 'medium' },
  { exampleId: '49-india-monsooned-french-press-dense', beanId: 'india-monsooned-malabar', methodId: 'french-press', targetProfileId: 'dense_comforting', grinderId: 'baratza-encore', waterId: 'club-indonesia', roastLevel: 'medium_dark' },
  { exampleId: '50-liberica-excelsa-moka-body', beanId: 'liberica-excelsa', methodId: 'moka-pot', targetProfileId: 'more_body', grinderId: 'encore-esp', waterId: 'ades-indonesia', roastLevel: 'medium_dark' },
  { exampleId: '51-df64-espresso-soft-dial-in', beanId: 'espresso-roast-blend', methodId: 'espresso', targetProfileId: 'soft_round', grinderId: 'df64', waterId: 'espresso-safe', roastLevel: 'medium_dark' },
  { exampleId: '52-amidis-v60-remineralize-required', beanId: 'ethiopia-washed-landrace', methodId: 'v60-hot', targetProfileId: 'floral_transparent', grinderId: 'k-ultra', waterId: 'amidis-indonesia', roastLevel: 'light' },
  { exampleId: '53-super-o2-chemex-low-mineral-warning', beanId: 'kenya-washed-sl', methodId: 'chemex', targetProfileId: 'more_acidity', grinderId: 'c40', waterId: 'super-o2-indonesia', roastLevel: 'light' },
  { exampleId: '54-equil-floral-muted-warning', beanId: 'colombia-pink-bourbon', methodId: 'origami', targetProfileId: 'floral_transparent', grinderId: 'k-ultra', waterId: 'equil-indonesia', roastLevel: 'medium_light' },
  { exampleId: '55-batch-brewer-java-balanced', beanId: 'indonesia-java-washed', methodId: 'batch-brewer', targetProfileId: 'balance_clean', grinderId: 'baratza-encore', waterId: 'aqua-indonesia', roastLevel: 'medium' },
];

function gitSha(short = false) {
  try {
    return execSync(short ? 'git rev-parse --short=12 HEAD' : 'git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
}

function gitText(command, fallback = 'unknown') {
  try {
    return execSync(command, { encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function gitContext() {
  return {
    branch: gitText('git branch --show-current'),
    head: gitText('git rev-parse HEAD'),
    originMain: gitText('git rev-parse origin/main'),
    status: gitText('git status --short', 'clean'),
  };
}

function cloneCatalogWithFallbackGrinders(catalog) {
  const provenance = {
    source: 'real-world-1000-synthetic-fallback',
    sourceUrls: [],
    verificationLevel: 'fallback',
    verifiedAt: '2026-05-18',
    popularityTier: 'widely_used',
    marketSegment: 'mass_market',
    releaseStatus: 'established',
    confidence: 'low',
    catalogVersion: catalog.catalogVersion,
  };
  const fallbackGrinders = [
    {
      id: 'unknown-manual-grinder',
      kind: 'grinder',
      name: 'Unknown manual grinder',
      brand: 'Unknown',
      typeLabel: 'Fallback manual grinder',
      searchText: 'unknown manual fallback grinder calibration required',
      grindBands: { fine: 'manual calibration', medium: 'manual calibration', coarse: 'manual calibration', parsedFine: null, parsedMedium: null, parsedCoarse: null },
      ...provenance,
    },
    {
      id: 'unknown-electric-grinder',
      kind: 'grinder',
      name: 'Unknown electric grinder',
      brand: 'Unknown',
      typeLabel: 'Fallback electric grinder',
      searchText: 'unknown electric fallback grinder calibration required',
      grindBands: { fine: 'manual calibration', medium: 'manual calibration', coarse: 'manual calibration', parsedFine: null, parsedMedium: null, parsedCoarse: null },
      ...provenance,
    },
    {
      id: 'espresso-zero-point-unknown',
      kind: 'grinder',
      name: 'Espresso grinder zero-point unknown',
      brand: 'Unknown',
      typeLabel: 'Espresso fallback grinder',
      searchText: 'espresso grinder zero point unknown fallback calibration required',
      grindBands: { fine: 'dial-in from zero point', medium: 'not enough data', coarse: 'not enough data', parsedFine: null, parsedMedium: null, parsedCoarse: null },
      ...provenance,
    },
    {
      id: 'df64-synthetic',
      kind: 'grinder',
      name: 'DF64 espresso/filter hybrid',
      brand: 'DF64',
      typeLabel: 'Espresso/filter hybrid grinder reference',
      searchText: 'df64 espresso filter hybrid grinder real world scenario placeholder calibration required',
      grindBands: { fine: 'espresso range, dial-in required', medium: 'filter range, dial-in required', coarse: 'coarse filter range, verify burrs', parsedFine: null, parsedMedium: null, parsedCoarse: null },
      ...provenance,
      verificationLevel: 'dataset_unverified',
      confidence: 'low',
    },
  ];
  const existingIds = new Set(catalog.grinders.map((grinder) => grinder.id));
  return {
    ...catalog,
    grinders: [
      ...catalog.grinders,
      ...fallbackGrinders.filter((grinder) => !existingIds.has(grinder.id)),
    ],
  };
}

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function textMatch(item, patterns) {
  const text = `${item.id || ''} ${item.name || ''} ${item.label || ''} ${item.brand || ''} ${item.typeLabel || ''}`.toLowerCase();
  return patterns.some((pattern) => pattern.test(text));
}

function methodFamilyMatches(dripper, methodCase) {
  return String(dripper.methodFamily || '') === String(methodCase.family || '');
}

function findDripper(catalog, methodCase) {
  const visible = catalog.drippers.filter((dripper) => !dripper.hidden && !dripper.deprecated);
  return visible.find((dripper) => methodFamilyMatches(dripper, methodCase) && textMatch(dripper, methodCase.dripperPatterns))
    || visible.find((dripper) => methodFamilyMatches(dripper, methodCase))
    || visible.find((dripper) => textMatch(dripper, methodCase.dripperPatterns))
    || visible[0];
}

function resolveGrinderSelection(catalog, grinderCase) {
  if (grinderCase.syntheticId) {
    const grinder = byId(catalog.grinders, grinderCase.syntheticId);
    return {
      grinder: grinder || byId(catalog.grinders, 'unknown-electric-grinder') || catalog.grinders[0],
      matched: Boolean(grinder),
    };
  }
  const grinder = catalog.grinders.find((item) => textMatch(item, grinderCase.patterns || []));
  return {
    grinder: grinder || byId(catalog.grinders, 'unknown-electric-grinder') || catalog.grinders[0],
    matched: Boolean(grinder),
  };
}

function exactWater(waterId) {
  return WATER_CASES.find((water) => water.id === waterId) || WATER_CASES[0];
}

function exactBean(beanId) {
  return BEAN_ARCHETYPES.find((bean) => bean.id === beanId) || BEAN_ARCHETYPES[0];
}

function caseVarietySignature(index, bean, roastLevel, targetProfileId, methodCase, waterCase, grinderCase) {
  const regionTag = String(bean.label)
    .replace(/\s+style$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const targetTag = String(targetProfileId).replace(/_/g, '-');
  return `${regionTag}-${roastLevel}-${targetTag}-${methodCase.id}-${waterCase.id}-${grinderCase.id}-${String(index + 1).padStart(5, '0')}`;
}

function exactMethod(methodId) {
  return METHOD_CASES.find((method) => method.id === methodId) || METHOD_CASES[0];
}

function exactGrinder(grinderId) {
  return GRINDER_CASES.find((grinder) => grinder.id === grinderId) || GRINDER_CASES[0];
}

const FILTER_SOURCE_METHOD_IDS = new Set([
  'v60-hot',
  'v60-iced',
  'switch-02-hot',
  'switch-02-iced',
  'switch-03-hot',
  'switch-03-iced',
  'mugen-switch',
  'chemex',
  'origami',
  'kono',
  'melitta',
  'kalita-flat',
  'april-orea-b75',
  'clever',
  'aeropress',
  'french-press',
  'cold-brew',
]);

const FILTER_SOURCE_GRINDER_IDS = new Set([
  'k-ultra',
  'c40',
  'kingrinder-k6',
  'timemore-c2',
  'timemore-c3',
  'fellow-ode',
  'baratza-encore',
  'feima-600n',
  'df64',
  'unknown-manual-grinder',
  'unknown-electric-grinder',
]);

function sourceBackedFilterBeans() {
  const parsed = JSON.parse(fs.readFileSync(SOURCE_BACKED_FILTER_BEAN_FIXTURE, 'utf8'));
  return Array.isArray(parsed.items) ? parsed.items : [];
}

function fixtureExpectation(item) {
  const text = `${item.process || ''} ${item.variety || ''} ${item.expectedCharacter || ''}`.toLowerCase();
  if (/unknown/.test(text)) return 'unknown';
  if (/decaf|robusta|canephora|liberica|excelsa|wet[_\s-]?hulled|monsooned|ferment|anaerobic|natural_extended|extended|wine|rustic/.test(text)) {
    return 'source_backed_risk';
  }
  if (/geisha|gesha|heirloom|floral|washed|sl28|sl34|pink_bourbon/.test(text)) return 'source_backed_clarity';
  return 'source_backed_balanced';
}

function fixtureTargets(item) {
  const expectation = fixtureExpectation(item);
  if (expectation === 'source_backed_clarity') {
    return {
      fitTargets: ['floral_transparent', 'fruit_forward', 'more_acidity', 'balance_clean'],
      mismatchTargets: ['dense_comforting'],
    };
  }
  if (expectation === 'source_backed_risk') {
    return {
      fitTargets: ['more_body', 'dense_comforting', 'soft_round', 'more_sweetness'],
      mismatchTargets: ['floral_transparent', 'more_acidity'],
    };
  }
  return {
    fitTargets: ['balance_clean', 'more_sweetness', 'soft_round'],
    mismatchTargets: ['dense_comforting'],
  };
}

function roastPoolForSourceBean(item) {
  if (item.roastLevel && ROAST_LEVELS.includes(item.roastLevel)) return [item.roastLevel, ...ROAST_LEVELS.filter((roast) => roast !== item.roastLevel)];
  return ['medium_light', 'medium', 'light', 'medium_dark', 'dark'];
}

function normalizeCatalogValue(catalogItems, value) {
  const raw = String(value || '').trim();
  if (!raw) return { id: '', custom: '' };
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const aliases = {
    geisha: 'geisha',
    gesha: 'geisha',
    heirloom: 'ethiopian_heirloom',
    landrace: 'ethiopian_landrace',
    extended_natural: 'natural_extended_fermentation',
    extended_fermentation_natural: 'natural_extended_fermentation',
    fully_washed: 'washed',
    wet_hulled: 'wet_hulled',
    black_honey: 'black_honey',
  };
  const candidate = aliases[slug] || slug;
  if (catalogItems.some((item) => item.id === candidate)) return { id: candidate, custom: '' };
  return { id: 'custom', custom: raw };
}

function beanFromSourceFixture(item) {
  const targetInfo = fixtureTargets(item);
  return {
    id: item.id,
    label: `${item.roaster} ${item.lotName}`,
    origin: item.origin,
    process: item.process || '',
    customProcess: item.process || '',
    variety: item.variety || '',
    customVariety: item.variety || '',
    defaultRoasts: roastPoolForSourceBean(item),
    fitTargets: targetInfo.fitTargets,
    mismatchTargets: targetInfo.mismatchTargets,
    expectation: fixtureExpectation(item),
    expected: item.expectedCharacter || 'source-backed bean data; missing fields must stay conservative',
    sourceBacked: true,
    sourceMeta: item,
  };
}

function sanitizeProcess(catalog, processId) {
  if (!processId || processId === 'custom') return processId || '';
  return catalog.processes.some((process) => process.id === processId) ? processId : 'custom';
}

function sanitizeVariety(catalog, varietyId) {
  if (!varietyId || varietyId === 'custom') return varietyId || '';
  return catalog.varieties.some((variety) => variety.id === varietyId) ? varietyId : 'custom';
}

function buildScenarioFromSpec(catalog, spec, index) {
  const bean = exactBean(spec.beanId);
  const methodCase = exactMethod(spec.methodId);
  const grinderCase = exactGrinder(spec.grinderId);
  const waterCase = exactWater(spec.waterId);
  const dripper = findDripper(catalog, methodCase);
  const grinderSelection = resolveGrinderSelection(catalog, grinderCase);
  const grinder = grinderSelection.grinder;
  const process = sanitizeProcess(catalog, bean.process);
  const variety = sanitizeVariety(catalog, bean.variety);
  const doseG = spec.doseG || defaultDoseForMethod(methodCase.family, index);
  const targetWaterMl = spec.targetWaterMl || defaultWaterForMethod(methodCase.family, doseG);
  return {
    index,
    exampleId: spec.exampleId,
    curated: true,
    bean,
    methodCase,
    grinderCase,
    grinderMatched: grinderSelection.matched,
    waterCase,
    dripper,
    grinder,
    inputPatch: {
      ...waterCase.input,
      brewMode: methodCase.mode,
      dripperId: dripper.id,
      grinderId: grinder.id,
      coffeeName: bean.label,
      process,
      customProcess: process === 'custom' ? bean.customProcess || bean.label : bean.customProcess || '',
      variety,
      customVariety: variety === 'custom' ? bean.customVariety || bean.label : bean.customVariety || '',
      roastLevel: spec.roastLevel,
      targetProfileId: spec.targetProfileId,
      doseG,
      targetWaterMl,
      aeropressStyle: spec.aeropressStyle || 'auto',
    },
    tasteFeedback: spec.tasteFeedback || 'sour',
  };
}

function defaultDoseForMethod(family, index) {
  if (family === 'espresso') return '18';
  if (family === 'cold_brew') return '60';
  if (family === 'batch_brew') return '40';
  if (family === 'chemex') return index % 3 === 0 ? '30' : '20';
  if (family === 'french_press') return index % 2 === 0 ? '30' : '18';
  if (family === 'moka_pot') return '18';
  return String([12, 15, 18, 20][index % 4]);
}

function defaultWaterForMethod(family, doseG) {
  const dose = Number(doseG) || 15;
  if (family === 'espresso') return '40';
  if (family === 'cold_brew') return String(Math.round(dose * 10));
  if (family === 'batch_brew') return '650';
  if (family === 'moka_pot') return '180';
  if (family === 'chemex') return String(Math.round(dose * 16.5));
  return '';
}

function buildGeneratedScenario(catalog, index) {
  const visibleDrippers = catalog.drippers.filter((dripper) => !dripper.hidden && !dripper.deprecated);
  const bean = BEAN_ARCHETYPES[index % BEAN_ARCHETYPES.length];
  const dripper = visibleDrippers[(index * 7) % visibleDrippers.length];
  const methodCase = METHOD_CASES.find((method) => method.family === dripper.methodFamily)
    || { id: String(dripper.methodFamily || dripper.id), label: dripper.name, mode: supportsAiBrewIcedMode(catalog, dripper.id) && index % 3 === 0 ? 'iced' : 'hot', family: dripper.methodFamily || 'v60', dripperPatterns: [] };
  const mode = supportsAiBrewIcedMode(catalog, dripper.id) && index % 4 === 0 ? 'iced' : methodCase.mode;
  const targetProfileId = TARGET_PROFILE_IDS[Math.floor(index / 3) % TARGET_PROFILE_IDS.length];
  const roastPool = [...bean.defaultRoasts, ...ROAST_LEVELS];
  const roastLevel = roastPool[Math.floor(index / 11) % roastPool.length];
  const grinderCase = GRINDER_CASES[Math.floor(index / 5) % GRINDER_CASES.length];
  const grinderSelection = resolveGrinderSelection(catalog, grinderCase);
  const grinder = grinderSelection.grinder;
  const waterCase = WATER_CASES[Math.floor(index / 13) % WATER_CASES.length];
  const process = bean.process === 'custom' ? 'custom' : sanitizeProcess(catalog, bean.process);
  const variety = bean.variety === 'custom' ? 'custom' : sanitizeVariety(catalog, bean.variety);
  const family = dripper.methodFamily || methodCase.family || 'v60';
  const doseG = defaultDoseForMethod(family, index);
  return {
    index,
    exampleId: `generated-${String(index + 1).padStart(4, '0')}`,
    curated: false,
    bean,
    methodCase: { ...methodCase, mode, family },
    grinderCase,
    grinderMatched: grinderSelection.matched,
    waterCase,
    dripper,
    grinder,
    inputPatch: {
      ...waterCase.input,
      brewMode: mode,
      dripperId: dripper.id,
      grinderId: grinder.id,
      coffeeName: `${bean.label} | ${caseVarietySignature(index, bean, roastLevel, targetProfileId, methodCase, waterCase, grinderCase)}`,
      process,
      customProcess: process === 'custom' ? bean.customProcess || bean.label : bean.customProcess || '',
      variety,
      customVariety: variety === 'custom' ? bean.customVariety || bean.label : bean.customVariety || '',
      roastLevel,
      targetProfileId,
      doseG,
      targetWaterMl: defaultWaterForMethod(family, doseG),
      aeropressStyle: family === 'aeropress' && index % 9 === 0 ? 'bypass' : 'auto',
    },
    tasteFeedback: index % 2 === 0 ? 'sour' : 'bitter',
  };
}

function buildFilterSourceBackedScenario(catalog, index) {
  const fixtureItems = sourceBackedFilterBeans();
  const sourceItem = fixtureItems[index % fixtureItems.length];
  const bean = beanFromSourceFixture(sourceItem);
  const filterMethods = METHOD_CASES.filter((method) => FILTER_SOURCE_METHOD_IDS.has(method.id));
  const methodCase = filterMethods[Math.floor(index / 2) % filterMethods.length];
  const visibleDrippers = catalog.drippers.filter((dripper) => !dripper.hidden && !dripper.deprecated);
  const dripper = findDripper({ ...catalog, drippers: visibleDrippers }, methodCase);
  const mode = supportsAiBrewIcedMode(catalog, dripper.id) && index % 5 === 0 ? 'iced' : methodCase.mode;
  const filterGrinders = GRINDER_CASES.filter((grinder) => FILTER_SOURCE_GRINDER_IDS.has(grinder.id));
  const grinderCase = filterGrinders[Math.floor(index / 7) % filterGrinders.length];
  const grinderSelection = resolveGrinderSelection(catalog, grinderCase);
  const grinder = grinderSelection.grinder;
  const waterCase = WATER_CASES[Math.floor(index / 11) % WATER_CASES.length];
  const targetProfileId = TARGET_PROFILE_IDS[Math.floor(index / 13) % TARGET_PROFILE_IDS.length];
  const roastPool = bean.defaultRoasts.length ? bean.defaultRoasts : ROAST_LEVELS;
  const roastLevel = roastPool[Math.floor(index / 17) % roastPool.length];
  const processValue = normalizeCatalogValue(catalog.processes, bean.process);
  const varietyValue = normalizeCatalogValue(catalog.varieties, bean.variety);
  const family = dripper.methodFamily || methodCase.family || 'v60';
  const doseG = defaultDoseForMethod(family, index);
  const sourceTag = `${sourceItem.id}-${String(index + 1).padStart(5, '0')}`;
  return {
    index,
    exampleId: `source-backed-${String(index + 1).padStart(5, '0')}`,
    curated: index < 120,
    sourceBacked: true,
    sourceBean: sourceItem,
    bean,
    methodCase: { ...methodCase, mode, family },
    grinderCase,
    grinderMatched: grinderSelection.matched,
    waterCase,
    dripper,
    grinder,
    inputPatch: {
      ...waterCase.input,
      brewMode: mode,
      dripperId: dripper.id,
      grinderId: grinder.id,
      coffeeName: `${bean.label} | source-backed ${sourceTag}`,
      process: processValue.id,
      customProcess: processValue.custom,
      variety: varietyValue.id,
      customVariety: varietyValue.custom,
      roastLevel,
      targetProfileId,
      doseG,
      targetWaterMl: defaultWaterForMethod(family, doseG),
      aeropressStyle: family === 'aeropress' && index % 9 === 0 ? 'bypass' : 'auto',
    },
    tasteFeedback: index % 2 === 0 ? 'sour' : 'bitter',
  };
}

function buildScenarios(catalog) {
  if (SCENARIO_PROFILE === 'filter-source-backed') {
    const scenarios = [];
    for (let index = 0; index < SCENARIO_TOTAL; index += 1) {
      scenarios.push(buildFilterSourceBackedScenario(catalog, index));
    }
    return scenarios;
  }
  const scenarios = REQUIRED_EXAMPLE_CASES.map((spec, index) => buildScenarioFromSpec(catalog, spec, index));
  for (let index = scenarios.length; index < SCENARIO_TOTAL; index += 1) {
    scenarios.push(buildGeneratedScenario(catalog, index));
  }
  return scenarios;
}

function secondsToLabel(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function compactText(plan) {
  const guide = plan.workflowGuideSteps?.length ? plan.workflowGuideSteps : buildWorkflowAwareGuideSteps(plan);
  return [
    plan.summary,
    ...(plan.notes || []),
    ...(plan.warnings || []),
    ...(plan.confidenceNotes || []),
    ...(plan.beanCoverage?.warnings || []),
    ...(plan.expectedCupProfile?.warnings || []),
    ...plan.steps.map((step) => `${step.label} ${step.kind || ''} ${step.note || ''} ${step.hybridInstruction || ''}`),
    ...guide.map((step) => `${step.label} ${step.actionType} ${step.primaryText} ${step.secondaryText || ''} ${step.techniqueChips?.map((chip) => `${chip.label} ${chip.value}`).join(' ') || ''}`),
  ].join('\n');
}

function outputSummary(plan) {
  const cup = plan.expectedCupProfile;
  return {
    brewMode: plan.brewMode,
    methodFamily: plan.methodFamily,
    dripper: plan.dripper.name,
    grinder: plan.grinder.name,
    doseG: plan.doseG,
    totalWaterMl: plan.totalWaterMl,
    hotWaterMl: plan.hotWaterMl,
    iceMl: plan.iceMl,
    finalRatio: plan.finalBeverageRatio,
    hotExtractionRatio: plan.hotExtractionRatio,
    tempC: plan.waterTempC,
    grind: plan.grindRecommendation,
    extractionEnd: secondsToLabel(plan.extractionEndSeconds),
    guideEnd: secondsToLabel(plan.guideEndSeconds),
    expectedCup: cup ? {
      acidity: cup.acidity,
      sweetness: cup.sweetness,
      body: cup.body,
      clarity: cup.clarity,
      bitternessRisk: cup.bitterRisk,
      aromaIntensity: cup.aromaIntensity,
      confidence: cup.confidence,
    } : null,
    beanCoverage: plan.beanCoverage?.category,
    water: {
      classification: plan.waterClassification,
      status: plan.waterPresetStatus,
      ready: plan.waterIsBrewReady,
    },
    grinderVerification: plan.grindSettingVerification,
    grinderCalibrationRequired: plan.grindCalibrationRequired,
    warnings: [
      ...(plan.warnings || []),
      ...(plan.confidenceNotes || []),
      ...(plan.beanCoverage?.warnings || []),
      ...(plan.expectedCupProfile?.warnings || []),
    ].slice(0, 8),
  };
}

function addReason(reasons, code, severity, message) {
  reasons.push({ code, severity, message });
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function validateNumerics(plan, scenario, reasons) {
  const numbers = [
    ['dose', plan.doseG],
    ['total water', plan.totalWaterMl],
    ['hot water', plan.hotWaterMl],
    ['ice', plan.iceMl],
    ['temperature', plan.waterTempC],
    ['ratio', plan.finalBeverageRatio],
    ['hot extraction ratio', plan.hotExtractionRatio],
    ['total time', plan.totalTimeSeconds],
    ['extraction end', plan.extractionEndSeconds],
    ['guide end', plan.guideEndSeconds],
    ['estimated cup', plan.estimatedCupOutputMl],
  ];
  for (const [label, value] of numbers) {
    if (!Number.isFinite(Number(value))) addReason(reasons, 'numeric_nan', 'fail', `${label} is not finite`);
    if (Number(value) < 0) addReason(reasons, 'numeric_negative', 'fail', `${label} is negative`);
  }
  if (plan.finalBeverageRatio <= 0 || plan.finalBeverageRatio > 30) addReason(reasons, 'impossible_ratio', 'fail', `ratio out of envelope: ${plan.finalBeverageRatio}`);
  if (plan.methodFamily !== 'cold_brew' && (plan.waterTempC < 78 || plan.waterTempC > 98)) addReason(reasons, 'unsafe_temperature', 'fail', `temperature out of envelope: ${plan.waterTempC}`);
  if (!plan.steps.length) addReason(reasons, 'missing_guide', 'fail', 'recipe has no steps');
  if ((plan.extractionEndSeconds || 0) > (plan.guideEndSeconds || 0)) addReason(reasons, 'time_semantics', 'fail', 'extraction end exceeds guide end');
  const poured = plan.steps.reduce((sum, step) => sum + Number(step.pourVolumeMl || 0), 0);
  if (Math.abs(poured - plan.hotWaterMl) > 1) addReason(reasons, 'pour_sum', 'fail', `pour/extract volume ${poured} does not match hot water ${plan.hotWaterMl}`);
  if (scenario.inputPatch.brewMode === 'hot') {
    if (plan.iceMl !== 0) addReason(reasons, 'hot_has_ice', 'fail', 'hot request produced ice');
    if (plan.hotWaterMl !== plan.totalWaterMl) addReason(reasons, 'hot_split_wrong', 'fail', 'hot request split hot water from total water');
  }
  if (scenario.inputPatch.brewMode === 'iced' && plan.brewMode === 'iced') {
    if (Math.abs(plan.hotWaterMl + plan.iceMl - plan.totalWaterMl) > 1) addReason(reasons, 'iced_split_wrong', 'fail', 'iced hot water + ice does not equal total');
    if (plan.iceMl <= 0) addReason(reasons, 'iced_missing_ice', 'fail', 'iced plan has no measured ice');
  }
  if (scenario.inputPatch.brewMode === 'iced' && plan.brewMode === 'hot' && supportsAiBrewIcedMode(globalCatalog, scenario.dripper.id)) {
    addReason(reasons, 'iced_supported_fell_back', 'fail', 'iced-supported method fell back to hot');
  }
}

function validateExpectedCup(plan, scenario, reasons) {
  const cup = plan.expectedCupProfile;
  if (!cup) {
    addReason(reasons, 'missing_expected_cup', 'fail', 'expected cup profile is missing');
    return;
  }
  for (const [key, value] of Object.entries({
    acidity: cup.acidity,
    sweetness: cup.sweetness,
    body: cup.body,
    clarity: cup.clarity,
    bitterRisk: cup.bitterRisk,
    aromaIntensity: cup.aromaIntensity,
  })) {
    if (!Number.isFinite(value) || value < 0 || value > 5) addReason(reasons, 'expected_cup_bounds', 'fail', `${key} is out of bounds: ${value}`);
  }
  if (scenario.bean.expectation === 'unknown' && cup.confidence === 'high') {
    addReason(reasons, 'unknown_bean_high_confidence', 'fail', 'unknown bean produced high expected-cup confidence');
  }
  if (scenario.grinderCase.class.includes('fallback') && cup.confidence === 'high') {
    addReason(reasons, 'fallback_grinder_high_confidence', 'fail', 'fallback grinder produced high confidence');
  }
  if (plan.methodFamily === 'espresso' && scenario.grinderCase.espresso !== 'compatible' && cup.confidence !== 'low') {
    addReason(reasons, 'espresso_risky_grinder_confidence', 'fail', `${scenario.grinderCase.label} espresso must stay low confidence`);
  }
  const highRiskWaterBuckets = new Set([
    'zero_mineral',
    'high_buffer',
    'alkaline_high_buffer_floral_mismatch',
    'low_mineral_filter_clarity',
    'demineral_direct_filter_experimental',
  ]);
  if (highRiskWaterBuckets.has(scenario.waterCase.risk) && cup.confidence === 'high') {
    addReason(reasons, 'water_risk_high_confidence', 'fail', `${scenario.waterCase.risk} water produced high confidence`);
  }
  if (scenario.waterCase.risk === 'zero_mineral' && plan.waterIsBrewReady) {
    addReason(reasons, 'zero_mineral_brew_ready', 'fail', 'zero-mineral water was treated as brew-ready');
  }
}

function validateMethodCopy(plan, scenario, reasons) {
  const text = compactText(plan);
  const method = plan.methodFamily;
  if (method === 'hario_switch') {
    if (!hasAny(text, [/katup|valve|chamber|ruang|air turun|release/i])) addReason(reasons, 'switch_missing_valve', 'fail', 'Switch plan lacks valve/chamber language');
  } else if (hasAny(text, [/katup|muatan ruang|Switch 02|Switch 03|MUGEN x SWITCH/i])) {
    addReason(reasons, 'method_leak_switch', 'fail', 'non-Switch plan leaks Switch language');
  }
  if (method === 'french_press') {
    if (hasAny(text, [/drawdown bed|center-to-mid|wall rinse|final pour|tuang akhir|bloom pour/i])) addReason(reasons, 'method_leak_french_press', 'fail', 'French Press leaks pour-over language');
    if (!hasAny(text, [/steep|rendam|settle|endapkan|press|tekan|decant|tuang pisah/i])) addReason(reasons, 'french_press_missing_workflow', 'fail', 'French Press missing steep/press/decant workflow');
  }
  if (method === 'espresso') {
    if (hasAny(text, [/bloom|drawdown|tuang|kettle|air turun|spiral|filter wall|dinding filter|slurry|bed\b|bypass|server|valve|katup|pour-over|v60/i])) addReason(reasons, 'method_leak_espresso', 'fail', 'Espresso leaks filter workflow');
    if (!hasAny(text, [/shot|yield|dial|puck|starting point|rasio espresso|flow|aliran/i])) addReason(reasons, 'espresso_missing_guard', 'fail', 'Espresso missing dial-in guardrail copy');
    if (scenario.grinderCase.espresso === 'not_recommended' && !hasAny(text, [/not recommended|not suitable|tidak disarankan|belum terverifikasi|espresso-capable|grinder espresso/i])) {
      addReason(reasons, 'espresso_incompatible_grinder_warning', 'fail', `${scenario.grinderCase.label} espresso lacks hard not-recommended warning`);
    }
  }
  if (method === 'moka_pot') {
    if (hasAny(text, [/bloom|drawdown|final pour|tuang akhir|spiral|v60|bed\b/i])) addReason(reasons, 'method_leak_moka', 'fail', 'Moka leaks filter workflow');
    if (hasAny(text, [/\btamp\b/i]) && !hasAny(text, [/no tamp|jangan tamp/i])) addReason(reasons, 'moka_tamp_risk', 'fail', 'Moka mentions tamp without no-tamp guard');
    if (!hasAny(text, [/sputter|sembur|mendidih|boiler|basket/i])) addReason(reasons, 'moka_missing_stop', 'warn', 'Moka should mention stop before sputter or basket/boiler handling');
  }
  if (method === 'cold_brew' && hasAny(text, [/hot extraction|ekstraksi panas|hot bloom|bloom|kettle|drawdown|spiral/i])) {
    addReason(reasons, 'method_leak_cold_brew', 'fail', 'Cold Brew leaks hot extraction language');
  }
  if (method === 'batch_brew' && hasAny(text, [/bloom pour|tuang tengah|center-to-mid/i])) {
    addReason(reasons, 'method_leak_batch', 'fail', 'Batch Brewer leaks manual pour workflow');
  }
  if (scenario.inputPatch.brewMode === 'iced' && plan.brewMode === 'iced' && !hasAny(text, [/ice|es|hot water|air panas|konsentrat|server/i])) {
    addReason(reasons, 'iced_copy_missing', 'fail', 'Iced plan lacks hot water/ice guidance');
  }
}

function hasReason(reasons, code) {
  return reasons.some((reason) => reason.code === code);
}

function addRiskWarning(reasons, code, message) {
  if (!hasReason(reasons, code)) addReason(reasons, code, 'warn', message);
}

function validateBaristaFit(plan, scenario, reasons) {
  const text = compactText(plan);
  const target = plan.targetProfileId;
  const roast = scenario.inputPatch.roastLevel;
  const beanText = `${scenario.bean.label} ${scenario.bean.expectation} ${scenario.bean.expected}`.toLowerCase();
  const targetMismatch = scenario.bean.mismatchTargets.includes(target);
  if (targetMismatch && !hasAny(text, [/target|mismatch|clarity|body|floral|expectation|ekspektasi|target rasa|turun|berkurang|feedback/i])) {
    addReason(reasons, 'target mismatch', 'warn', `${scenario.bean.label} has a target mismatch with ${target} but little warning copy`);
  }
  if ((beanText.includes('geisha') || beanText.includes('gesha')) && (target === 'more_body' || target === 'dense_comforting') && !hasAny(text, [/clarity|floral|body|target|feedback|berkurang|turun/i])) {
    addReason(reasons, 'geisha_body_warning', 'warn', 'Geisha + body/dense target should warn clarity/floral may reduce');
  }
  if (plan.methodFamily !== 'cold_brew' && (beanText.includes('washed') || beanText.includes('floral') || beanText.includes('geisha')) && roast === 'light' && ['floral_transparent', 'more_acidity'].includes(target)) {
    const methodAllowsLowerClarityFloor = ['aeropress', 'hario_switch', 'siphon'].includes(plan.methodFamily);
    const clarityTempFloor = methodAllowsLowerClarityFloor ? 91 : 92;
    const hardFailFloor = methodAllowsLowerClarityFloor ? 89.5 : 90.5;
    if (plan.waterTempC < clarityTempFloor && !hasAny(text, [/ferment|dark|pahit/i])) {
      addReason(
        reasons,
        'washed_light_temp_too_low',
        plan.waterTempC < hardFailFloor ? 'fail' : 'warn',
        `washed/light/floral case defaulted below the usual ${clarityTempFloor}-96C window: ${plan.waterTempC}C`,
      );
    }
  }
  if (roast === 'dark' && ['floral_transparent', 'more_acidity'].includes(target) && !hasAny(text, [/dark|gelap|roast|floral|acidity|asam|harsh|pahit|expectation|ekspektasi/i])) {
    addReason(reasons, 'dark_floral_overclaim', 'fail', 'dark roast floral/acidity target lacks warning');
  }
  if (['high_buffer', 'alkaline_high_buffer_floral_mismatch'].includes(scenario.waterCase.risk) && ['floral_transparent', 'more_acidity'].includes(target) && !hasAny(text, [/buffer|alkalin|alkalinity|muted|tertahan|asam|floral|clarity|jernih/i])) {
    addReason(reasons, 'high_buffer_target_warning', 'fail', 'high-buffer water lacks muted-acidity/floral warning');
  }
  if (scenario.waterCase.risk === 'zero_mineral' && !hasAny(text, [/zero|mineral|RO|remineral|manual|nol|distilled/i])) {
    addReason(reasons, 'zero-mineral', 'fail', 'zero-mineral water lacks remineralization warning');
  }
  if (scenario.waterCase.risk === 'low_mineral_filter_clarity' && !hasAny(text, [/low[-\s]?mineral|rendah mineral|thin|tipis|sharp|tajam|body|acidity|clean/i])) {
    addReason(reasons, 'low_mineral_filter_warning', 'fail', 'low-mineral filter water lacks thin/sharp/body warning');
  }
  if (scenario.waterCase.risk === 'demineral_direct_filter_experimental' && !hasAny(text, [/demineral|experimental|eksperimen|hollow|thin|tipis|remineral|blend|body/i])) {
    addReason(reasons, 'demineral_direct_warning', 'fail', 'demineral direct filter experiment lacks low-confidence/remineralization warning');
  }
  if (plan.methodFamily === 'v60' && Number(plan.doseG) <= 15 && ['more_sweetness', 'more_body'].includes(target) && plan.extractionEndSeconds > 240) {
    const overBy = plan.extractionEndSeconds - 240;
    addReason(
      reasons,
      'v60_15g_over_4min',
      overBy > 15 ? 'fail' : 'warn',
      `15g V60 sweetness/body exceeds 4:00 by ${overBy}s; verify this with real brew before changing recipe math`,
    );
  }
}

function addRealWorldRiskWarnings(plan, scenario, reasons) {
  const target = scenario.inputPatch.targetProfileId;
  const roast = scenario.inputPatch.roastLevel;
  const beanExpectation = scenario.bean.expectation;
  const method = plan.methodFamily;
  if (/fallback|unknown|600n|unverified/i.test(scenario.grinderCase.class)) {
    addRiskWarning(
      reasons,
      'fallback_grinder_calibration_risk',
      `${scenario.grinderCase.label} needs calibration; settings are starting points, not exact burr-zero truth.`,
    );
  }
  if (method === 'espresso' && scenario.grinderCase.espresso !== 'compatible') {
    addRiskWarning(
      reasons,
      'espresso_not_recommended_grinder_risk',
      `${scenario.grinderCase.label} is not a reliable espresso grinder choice; keep confidence low and use a real espresso-capable grinder.`,
    );
  }
  if (scenario.waterCase.risk === 'manual_required' || scenario.waterCase.risk === 'estimated') {
    addRiskWarning(
      reasons,
      'water_manual_verification_risk',
      `${scenario.waterCase.label} needs manual TDS/GH/KH verification before high confidence.`,
    );
  }
  if (scenario.waterCase.risk === 'zero_mineral') {
    addRiskWarning(
      reasons,
      'zero_mineral_remineralize_risk',
      `${scenario.waterCase.label} is not brew-ready without minerals.`,
    );
  }
  if (scenario.waterCase.risk === 'low_mineral_filter_clarity') {
    addRiskWarning(
      reasons,
      'low_mineral_filter_clarity_risk',
      `${scenario.waterCase.label} can work for clean filter cups, but body can be thin and acidity sharper.`,
    );
  }
  if (scenario.waterCase.risk === 'demineral_direct_filter_experimental') {
    addRiskWarning(
      reasons,
      'demineral_direct_filter_experiment_risk',
      `${scenario.waterCase.label} is a low-confidence direct filter experiment; remineralize or blend for repeatability.`,
    );
  }
  if (['high_buffer', 'alkaline_high_buffer_floral_mismatch'].includes(scenario.waterCase.risk) && ['floral_transparent', 'more_acidity', 'fruit_forward'].includes(target)) {
    addRiskWarning(
      reasons,
      'high_buffer_target_risk',
      `${scenario.waterCase.label} can mute acidity, florals, and clarity for this target.`,
    );
  }
  if (beanExpectation === 'unknown') {
    addRiskWarning(
      reasons,
      'unknown_bean_conservative_risk',
      'Bean data is incomplete, so this recipe should stay conservative and avoid specific flavor certainty.',
    );
  }
  if (/ferment|experimental|fruit_variable|rustic_variable/.test(beanExpectation)) {
    addRiskWarning(
      reasons,
      'experimental_process_feedback_risk',
      `${scenario.bean.label} can become winey/heavy if extraction is pushed too far; real taste feedback matters.`,
    );
  }
  if (/geisha|gesha/i.test(scenario.bean.label) && ['more_body', 'dense_comforting'].includes(target)) {
    addRiskWarning(
      reasons,
      'geisha_body_target_risk',
      'Body/dense target can reduce Geisha floral clarity; use Floral & Transparent or Fruit-Forward for a more classic Geisha cup.',
    );
  }
  if (roast === 'dark' && ['floral_transparent', 'more_acidity'].includes(target)) {
    addRiskWarning(
      reasons,
      'dark_floral_target_risk',
      'Dark roast limits floral/acidity ceiling; the target is possible only as a softer expectation.',
    );
  }
  if (method === 'cold_brew' && ['floral_transparent', 'more_acidity'].includes(target)) {
    addRiskWarning(
      reasons,
      'cold_brew_floral_expectation_risk',
      'Cold brew can be sweet and clean, but sparkling hot-brew florals/acidity should be a lower expectation.',
    );
  }
  if (method === 'batch_brew') {
    addRiskWarning(
      reasons,
      'batch_model_validation_risk',
      'Batch brewer flow, basket depth, and spray pattern need model-specific validation.',
    );
  }
  if (method === 'moka_pot') {
    addRiskWarning(
      reasons,
      'moka_stall_bitterness_risk',
      'Moka grind must avoid espresso-powder fineness; stop before sputter to control bitterness.',
    );
  }
  if (method === 'french_press' && ['floral_transparent', 'more_acidity'].includes(target)) {
    addRiskWarning(
      reasons,
      'french_press_clarity_softening_risk',
      'French Press can soften clarity; decant cleanly and avoid stirring up fines.',
    );
  }
  if (SCENARIO_PROFILE === 'filter-source-backed') {
    addRiskWarning(
      reasons,
      'real_brew_validation_pending',
      'Source-backed software validation is not physical brewing; confirm with real brew logs before making taste-certainty claims.',
    );
  }
}

function validateGuardrails(plan, scenario, reasons) {
  const guard = validateBrewPlanOutput(plan);
  if (!guard.allowed) addReason(reasons, 'anti_hallucination_guard', 'fail', guard.reason || 'anti-hallucination guard blocked plan');
  const correction = buildTasteFeedbackCorrection(plan, scenario.tasteFeedback, 'en');
  if (!correction.protectedNumbersLocked) addReason(reasons, 'correction_unlocked_numbers', 'fail', 'taste correction does not lock protected numbers');
  const correctionText = `${correction.primaryCorrection} ${correction.backupCorrection}`;
  if (plan.methodFamily === 'espresso' && hasAny(correctionText, [/bloom|pour|kettle/i])) addReason(reasons, 'espresso_correction_leak', 'fail', 'espresso correction leaks filter language');
  if (plan.methodFamily === 'moka_pot' && hasAny(correctionText, [/bloom|drawdown|final pour/i])) addReason(reasons, 'moka_correction_leak', 'fail', 'moka correction leaks filter language');
  const idText = localizeAiBrewDynamicText([plan.summary, ...(plan.warnings || []), ...(plan.confidenceNotes || [])].join(' '), 'id');
  if (hasAny(idText, [/Additional details|Brew Guide|Expected cup|Confidence|Manual Required|Drawdown/i])) {
    addReason(reasons, 'id_language_leak', 'fail', 'Indonesian localized sample leaks critical English');
  }
}

function scoreCase(plan, scenario, reasons) {
  const failCodes = new Set(reasons.filter((reason) => reason.severity === 'fail').map((reason) => reason.code));
  const warnCodes = new Set(reasons.filter((reason) => reason.severity === 'warn').map((reason) => reason.code));
  const score = Object.fromEntries(SCORE_KEYS.map((key) => [key, 100]));
  const reduce = (key, amount) => {
    score[key] = Math.max(0, score[key] - amount);
  };
  for (const reason of reasons) {
    const penalty = reason.severity === 'fail' ? 22 : 8;
    if (/numeric|ratio|temperature|split|sum|time|guide|water/.test(reason.code)) reduce('recipeSafety', penalty);
    if (/method|switch|espresso|moka|french|cold|batch/.test(reason.code)) reduce('methodFit', penalty);
    if (/target|geisha|dark|high_buffer/.test(reason.code)) reduce('targetFit', penalty);
    if (/bean|geisha|dark|decaf|robusta|unknown/.test(reason.code)) reduce('beanFit', penalty);
    if (/roast|dark|temp/.test(reason.code)) reduce('roastFit', penalty);
    if (/ferment|decaf|natural|process/.test(reason.code)) reduce('processFit', penalty);
    if (/geisha|variety|unknown/.test(reason.code)) reduce('varietyFit', penalty);
    if (/water|buffer|zero/.test(reason.code)) reduce('waterHonesty', penalty);
    if (/grinder|espresso|fallback/.test(reason.code)) reduce('grinderHonesty', penalty);
    if (/temp/.test(reason.code)) reduce('temperatureLogic', penalty);
    if (/grind|grinder/.test(reason.code)) reduce('grindLogic', penalty);
    if (/time|4min|extraction/.test(reason.code)) reduce('extractionTimeLogic', penalty);
    if (/method|language|leak|copy|espresso|moka|french|cold|batch|workflow/.test(reason.code)) reduce('workflowLanguageSafety', penalty);
    if (/pour|flow|batch|french|moka|espresso/.test(reason.code)) reduce('pourFlowLogic', penalty);
    if (/bloom|cold|espresso|french/.test(reason.code)) reduce('bloomLogic', penalty);
    if (/confidence|expected|unknown|overclaim|target/.test(reason.code)) reduce('expectedCupHonesty', penalty);
    if (/warning|guard|target|water|zero|buffer/.test(reason.code)) reduce('warningQuality', penalty);
    if (/language|copy|leak/.test(reason.code)) reduce('mobileCopyQuality', penalty);
    if (/overclaim|confidence|unknown|fallback|geisha|zero|mineral|dark/.test(reason.code)) reduce('overclaimRisk', penalty);
  }

  const text = compactText(plan);
  if (scenario.bean.expectation.includes('ferment') && !hasAny(text, [/ferment|winey|muddy|agitation|agitasi|feedback/i])) {
    reduce('processFit', 6);
    warnCodes.add('ferment_copy_soft');
  }
  if (scenario.bean.expectation.includes('unknown') && plan.expectedCupProfile?.confidence !== 'high') {
    score.overclaimRisk = Math.min(score.overclaimRisk, 94);
    score.expectedCupHonesty = Math.min(score.expectedCupHonesty, 96);
  }
  const average = SCORE_KEYS.reduce((sum, key) => sum + score[key], 0) / SCORE_KEYS.length;
  return {
    ...score,
    average: Math.round(average * 10) / 10,
    hasFailure: failCodes.size > 0,
    warningCount: warnCodes.size,
  };
}

let globalCatalog;

function runScenario(catalog, scenario) {
  const base = createDefaultAiBrewFormState(catalog);
  const input = {
    ...base,
    ...scenario.inputPatch,
  };
  const reasons = [];
  let plan = null;
  try {
    plan = buildAiBrewPlan(input, catalog);
    validateNumerics(plan, scenario, reasons);
    validateExpectedCup(plan, scenario, reasons);
    validateMethodCopy(plan, scenario, reasons);
    validateBaristaFit(plan, scenario, reasons);
    if (!scenario.grinderMatched) {
      addReason(
        reasons,
        'grinder_fixture_not_found',
        'warn',
        `${scenario.grinderCase.label} is not present in the current AI Brew grinder catalog; the stress gate used ${scenario.grinder.name} as a low-confidence fallback.`,
      );
    }
    addRealWorldRiskWarnings(plan, scenario, reasons);
    validateGuardrails(plan, scenario, reasons);
  } catch (error) {
    addReason(reasons, 'planner_throw', 'fail', error instanceof Error ? error.message : String(error));
  }
  const scores = plan
    ? scoreCase(plan, scenario, reasons)
    : { ...Object.fromEntries(SCORE_KEYS.map((key) => [key, 0])), average: 0, hasFailure: true, warningCount: 0 };
  return {
    index: scenario.index,
    exampleId: scenario.exampleId,
    curated: scenario.curated,
    input: {
      bean: scenario.bean.label,
      coffeeName: scenario.inputPatch.coffeeName,
      expectedBeanCharacter: scenario.bean.expected,
      method: scenario.methodCase.label,
      dripper: scenario.dripper.name,
      requestedMode: scenario.inputPatch.brewMode,
      targetProfileId: scenario.inputPatch.targetProfileId,
      roastLevel: scenario.inputPatch.roastLevel,
      requestedGrinder: scenario.grinderCase.label,
      grinder: scenario.grinder.name,
      grinderMatched: scenario.grinderMatched,
      grinderClass: scenario.grinderCase.class,
      water: scenario.waterCase.label,
      waterRisk: scenario.waterCase.risk,
      doseG: scenario.inputPatch.doseG,
      targetWaterMl: scenario.inputPatch.targetWaterMl || null,
      process: scenario.inputPatch.process || 'unknown',
      variety: scenario.inputPatch.variety || 'unknown',
      sourceBacked: Boolean(scenario.sourceBacked),
      sourceRoaster: scenario.sourceBean?.roaster || null,
      sourceLotName: scenario.sourceBean?.lotName || null,
      sourceUrl: scenario.sourceBean?.sourceUrl || null,
      sourceEvidenceLevel: scenario.sourceBean?.evidenceLevel || null,
      sourceMissingFields: scenario.sourceBean?.missingFields || [],
    },
    output: plan ? outputSummary(plan) : null,
    reasons,
    scores,
  };
}

function increment(map, key) {
  map[key || 'unknown'] = (map[key || 'unknown'] || 0) + 1;
}

function bucketLowScores(results, groupSelector) {
  const buckets = new Map();
  for (const result of results) {
    const key = groupSelector(result);
    if (!buckets.has(key)) buckets.set(key, { key, count: 0, failures: 0, warnings: 0, minScore: 100, totalScore: 0 });
    const bucket = buckets.get(key);
    bucket.count += 1;
    bucket.failures += result.scores.hasFailure ? 1 : 0;
    bucket.warnings += result.reasons.filter((reason) => reason.severity === 'warn').length;
    bucket.minScore = Math.min(bucket.minScore, result.scores.average);
    bucket.totalScore += result.scores.average;
  }
  return Array.from(buckets.values())
    .map((bucket) => ({ ...bucket, averageScore: Math.round((bucket.totalScore / bucket.count) * 10) / 10 }))
    .sort((a, b) => a.averageScore - b.averageScore || b.failures - a.failures);
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return Math.round(sorted[lower] * 10) / 10;
  const weighted = sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  return Math.round(weighted * 10) / 10;
}

function topReasonCategories(results, severity = 'warn') {
  const counts = new Map();
  for (const result of results) {
    for (const reason of result.reasons.filter((item) => item.severity === severity)) {
      const current = counts.get(reason.code) || { code: reason.code, count: 0, examples: [] };
      current.count += 1;
      if (current.examples.length < 5) current.examples.push(result.exampleId);
      counts.set(reason.code, current);
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

function summarize(results, sha) {
  const passCount = results.filter((result) => !result.scores.hasFailure).length;
  const failures = results.filter((result) => result.scores.hasFailure);
  const warnings = results.flatMap((result) => result.reasons
    .filter((reason) => reason.severity === 'warn')
    .map((reason) => ({ index: result.index, exampleId: result.exampleId, code: reason.code, message: reason.message })));
  const scoreTotals = Object.fromEntries(SCORE_KEYS.map((key) => [key, 0]));
  const scoreMinimums = Object.fromEntries(SCORE_KEYS.map((key) => [key, 100]));
  const coverage = {
    beans: {},
    methods: {},
    grinders: {},
    waters: {},
    targets: {},
    roasts: {},
    sources: {},
  };
  for (const result of results) {
    for (const key of SCORE_KEYS) {
      scoreTotals[key] += result.scores[key];
      scoreMinimums[key] = Math.min(scoreMinimums[key], result.scores[key]);
    }
    increment(coverage.beans, result.input.bean);
    increment(coverage.methods, result.output?.methodFamily || result.input.method);
    increment(coverage.grinders, result.input.grinder);
    increment(coverage.waters, result.input.water);
    increment(coverage.targets, result.input.targetProfileId);
    increment(coverage.roasts, result.input.roastLevel);
    if (result.input.sourceRoaster) increment(coverage.sources, `${result.input.sourceRoaster} | ${result.input.sourceLotName}`);
  }
  const uniqueCoffeeInputs = new Set(results.map((result) => [
    result.input.coffeeName,
    result.input.bean,
    result.input.method,
    result.input.requestedMode,
    result.input.grinder,
    result.input.water,
    result.input.targetProfileId,
    result.input.roastLevel,
    result.input.process,
    result.input.variety,
    result.input.doseG,
    result.input.targetWaterMl || 'auto',
  ].join(' | '))).size;
  const coverageDensity = {
    uniqueCoffeeInputs,
    beanArchetypes: Object.keys(coverage.beans).length,
    methods: Object.keys(coverage.methods).length,
    grinders: Object.keys(coverage.grinders).length,
    waters: Object.keys(coverage.waters).length,
    targets: Object.keys(coverage.targets).length,
    roasts: Object.keys(coverage.roasts).length,
    sourceBackedLots: Object.keys(coverage.sources).length,
  };
  const averages = Object.fromEntries(SCORE_KEYS.map((key) => [key, Math.round((scoreTotals[key] / results.length) * 10) / 10]));
  const overallAverage = Math.round((results.reduce((sum, result) => sum + result.scores.average, 0) / results.length) * 10) / 10;
  const lowest = [...results].sort((a, b) => a.scores.average - b.scores.average).slice(0, 20);
  const averageScores = results.map((result) => result.scores.average);
  const methodBuckets = bucketLowScores(results, (result) => result.output?.methodFamily || result.input.method);
  const grinderBuckets = bucketLowScores(results, (result) => result.input.grinder);
  const waterBuckets = bucketLowScores(results, (result) => result.input.waterRisk);
  const targetBuckets = bucketLowScores(results, (result) => result.input.targetProfileId);
  const verdict = failures.length > 0
    ? failures.some((failure) => failure.reasons.length > 3) ? NOT_READY_VERDICT : NEEDS_REFINEMENT_VERDICT
    : STRONG_VERDICT;
  return {
    sha,
    git: gitContext(),
    date: new Date().toISOString(),
    profile: SCENARIO_PROFILE,
    scenarioCount: results.length,
    passed: passCount,
    failed: failures.length,
    warnings: warnings.length,
    averageScore: overallAverage,
    scoreDistribution: {
      min: Math.min(...averageScores),
      p10: percentile(averageScores, 0.1),
      p50: percentile(averageScores, 0.5),
      p90: percentile(averageScores, 0.9),
      max: Math.max(...averageScores),
    },
    scoreAverages: averages,
    scoreMinimums,
    coverage,
    coverageDensity,
    lowestScoringCases: lowest.map((result) => ({
      index: result.index,
      exampleId: result.exampleId,
      bean: result.input.bean,
      method: result.input.method,
      grinder: result.input.grinder,
      water: result.input.water,
      target: result.input.targetProfileId,
      score: result.scores.average,
      reasons: result.reasons,
    })),
    buckets: {
      methods: methodBuckets,
      grinders: grinderBuckets,
      waters: waterBuckets,
      targets: targetBuckets,
    },
    topWarningCategories: topReasonCategories(results, 'warn'),
    topFailureCategories: topReasonCategories(results, 'fail'),
    topMethodRiskCategories: methodBuckets
      .filter((bucket) => bucket.warnings > 0 || bucket.failures > 0 || bucket.averageScore < 98)
      .slice(0, 12),
    verdict,
    claim: 'AI Brew creates strong starting recipes and dial-in guidance; physical real brew validation is still required for real-world taste certainty.',
  };
}

function writeJson(path, data) {
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function warningsMarkdown(summary, results) {
  const warnings = results.flatMap((result) => result.reasons
    .filter((reason) => reason.severity === 'warn')
    .map((reason) => ({ result, reason })));
  return [
    `# AI Brew Real-World ${summary.scenarioCount} Warnings`,
    '',
    `SHA: ${summary.sha}`,
    `Scenario count: ${summary.scenarioCount}`,
    `Warnings: ${warnings.length}`,
    '',
    ...warnings.slice(0, 200).map(({ result, reason }) => `- Case ${result.index} (${result.exampleId}) ${result.input.bean} / ${result.input.method}: ${reason.code} - ${reason.message}`),
    warnings.length > 200 ? `- ${warnings.length - 200} additional warnings omitted from markdown; see cases.json.` : '',
    '',
  ].join('\n');
}

function lowestScoresMarkdown(summary) {
  return [
    `# AI Brew Real-World ${summary.scenarioCount} Lowest Scores`,
    '',
    `SHA: ${summary.sha}`,
    `Average score: ${summary.averageScore}`,
    `Distribution: min ${summary.scoreDistribution.min}; p10 ${summary.scoreDistribution.p10}; p50 ${summary.scoreDistribution.p50}; p90 ${summary.scoreDistribution.p90}; max ${summary.scoreDistribution.max}`,
    '',
    '| Case | Bean | Method | Grinder | Water | Target | Score | Reasons |',
    '|---|---|---|---|---|---|---:|---|',
    ...summary.lowestScoringCases.map((item) => `| ${item.exampleId} | ${item.bean.replace(/\|/g, '/')} | ${item.method.replace(/\|/g, '/')} | ${item.grinder.replace(/\|/g, '/')} | ${item.water.replace(/\|/g, '/')} | ${item.target} | ${item.score} | ${(item.reasons.map((reason) => reason.code).join(', ') || 'no failure').replace(/\|/g, '/')} |`),
    '',
  ].join('\n');
}

function methodLanguageSafetyMarkdown(summary, results) {
  const blockedCodes = [
    'method_leak_espresso',
    'method_leak_moka',
    'method_leak_cold_brew',
    'method_leak_french_press',
    'method_leak_batch',
    'switch_missing_valve',
    'espresso_missing_guard',
    'espresso_incompatible_grinder_warning',
  ];
  const failures = results.filter((result) => result.reasons.some((reason) => blockedCodes.includes(reason.code)));
  const methodBuckets = summary.buckets.methods.map((bucket) => `- ${bucket.key}: avg ${bucket.averageScore}; min ${bucket.minScore}; failures ${bucket.failures}; warnings ${bucket.warnings}`);
  return [
    '# AI Brew Method-Language Safety',
    '',
    `SHA: ${summary.sha}`,
    `Workflow language safety average: ${summary.scoreAverages.workflowLanguageSafety}`,
    `Workflow language safety minimum: ${summary.scoreMinimums.workflowLanguageSafety}`,
    '',
    '## Hard Blocks Checked',
    '- Espresso: no V60/filter workflow leakage; dial-in guard required.',
    '- Moka: no pour-over workflow leakage; stop-before-sputter/no-tamp guard required.',
    '- French Press: steep/press/decant language; no drawdown/pour spiral workflow.',
    '- Cold Brew: no hot bloom/kettle/drawdown/spiral language.',
    '- Batch Brew: no manual spiral-pour language unless intentionally modeled.',
    '- Switch/Clever: valve/release/immersion language remains method-specific.',
    '',
    '## Result',
    failures.length === 0
      ? 'No method-language hard-block failure found.'
      : failures.map((result) => `- ${result.exampleId}: ${result.reasons.filter((reason) => blockedCodes.includes(reason.code)).map((reason) => `${reason.code} - ${reason.message}`).join('; ')}`).join('\n'),
    '',
    '## Method Buckets',
    ...methodBuckets,
    '',
  ].join('\n');
}

function waterRealityAuditMarkdown(summary, results) {
  const byRisk = new Map();
  for (const result of results) {
    const key = result.input.waterRisk || 'unknown';
    const bucket = byRisk.get(key) || { count: 0, warnings: 0, failures: 0, examples: [] };
    bucket.count += 1;
    bucket.warnings += result.reasons.filter((reason) => reason.severity === 'warn').length;
    bucket.failures += result.reasons.filter((reason) => reason.severity === 'fail').length;
    if (bucket.examples.length < 5) bucket.examples.push(result.exampleId);
    byRisk.set(key, bucket);
  }
  const rows = Array.from(byRisk.entries())
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
    .map(([risk, bucket]) => `| ${risk} | ${bucket.count} | ${bucket.warnings} | ${bucket.failures} | ${bucket.examples.join(', ')} |`);
  return [
    '# AI Brew Water Reality Audit',
    '',
    `SHA: ${summary.sha}`,
    `Scenario count: ${summary.scenarioCount}`,
    '',
    '## Policy',
    '- `community_barista_autofill` may unlock filter/pour-over starting profiles for coffee-community-backed bottled waters.',
    '- Autofill is not an official perfect mineral claim; confidence remains capped and warnings remain visible.',
    '- Cleo-style low-mineral water is allowed for filter clarity with thin/sharp/body risk.',
    '- Amidis-style demineral water is allowed only as a low-confidence direct filter experiment or remineralization base.',
    '- Aqua/Le Minerale/Nestle/Volvic style bottled waters are starting points, not universal best-water claims.',
    '- Pristine/alkaline/high-buffer water can mute acidity and florals.',
    '- Galon/depot/refill water remains manual-required unless measured TDS/GH/KH are provided.',
    '- Espresso safety is stricter: low/de-mineral water is not espresso-safe unless remineralized and machine-safe.',
    '',
    '## Risk Buckets',
    '| Bucket | Cases | Warnings | Failures | Examples |',
    '|---|---:|---:|---:|---|',
    ...rows,
    '',
    '## Result',
    summary.failed === 0
      ? 'No water hard-block failure remained. Water warnings are treated as honest risk communication, not hidden failures.'
      : 'Water-related failures remain; inspect failures.json before release.',
    '',
  ].join('\n');
}

function guardrailBreakdownMarkdown(summary, results) {
  const failRows = summary.topFailureCategories.map((item) => `| ${item.code} | ${item.count} | ${item.examples.join(', ')} |`);
  const warnRows = summary.topWarningCategories.map((item) => `| ${item.code} | ${item.count} | ${item.examples.join(', ')} |`);
  return [
    `# AI Brew Guardrail Breakdown (${summary.scenarioCount})`,
    '',
    `SHA: ${summary.sha}`,
    `Profile: ${summary.profile}`,
    '',
    '## Severity Policy',
    '- Hard failures block readiness: impossible numbers, broken iced split, method-language leakage, high-confidence unsafe water/grinder, and zero-mineral brew-ready claims.',
    '- Warnings are honest risk communication: target mismatch, water/grinder/bean uncertainty, source gaps, and real brew validation pending.',
    '',
    '## Hard Failures',
    '| Code | Count | Examples |',
    '|---|---:|---|',
    ...(failRows.length ? failRows : ['| none | 0 | - |']),
    '',
    '## Warnings',
    '| Code | Count | Examples |',
    '|---|---:|---|',
    ...(warnRows.length ? warnRows.slice(0, 40) : ['| none | 0 | - |']),
    '',
  ].join('\n');
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function beanSourceCoverageCsv(results) {
  const rows = [];
  const seen = new Set();
  for (const result of results) {
    if (!result.input.sourceBacked || !result.input.sourceUrl) continue;
    const key = `${result.input.sourceRoaster}|${result.input.sourceLotName}|${result.input.sourceUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      roaster: result.input.sourceRoaster,
      lotName: result.input.sourceLotName,
      bean: result.input.bean,
      sourceUrl: result.input.sourceUrl,
      evidenceLevel: result.input.sourceEvidenceLevel,
      missingFields: (result.input.sourceMissingFields || []).join(';'),
    });
  }
  const headers = ['roaster', 'lotName', 'bean', 'sourceUrl', 'evidenceLevel', 'missingFields'];
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n') + '\n';
}

function hotIcedBloomPourWaterRegressionMarkdown(summary, results) {
  const modeCounts = {};
  const bloomWarnings = [];
  const waterWarnings = {};
  for (const result of results) {
    increment(modeCounts, `${result.input.requestedMode}->${result.output?.brewMode || 'no-output'}`);
    for (const reason of result.reasons) {
      if (/bloom|pour|split|hot|iced/.test(reason.code)) bloomWarnings.push(`${result.exampleId}: ${reason.code}`);
      if (/water|buffer|mineral|demineral|low_mineral/.test(reason.code)) increment(waterWarnings, reason.code);
    }
  }
  return [
    `# Hot/Iced/Bloom/Pour/Water Regression (${summary.scenarioCount})`,
    '',
    `SHA: ${summary.sha}`,
    `Profile: ${summary.profile}`,
    '',
    '## Mode Counts',
    ...Object.entries(modeCounts).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Bloom/Pour/Iced Findings',
    ...(bloomWarnings.length ? bloomWarnings.slice(0, 80).map((item) => `- ${item}`) : ['- No hard bloom/pour/iced split failure recorded.']),
    '',
    '## Water Findings',
    ...(Object.keys(waterWarnings).length
      ? Object.entries(waterWarnings).map(([key, value]) => `- ${key}: ${value}`)
      : ['- No water warning/failure bucket recorded.']),
    '',
  ].join('\n');
}

function improvementPrompt(summary) {
  const weakBuckets = [
    ...summary.buckets.methods.filter((bucket) => bucket.averageScore < 94 || bucket.failures > 0).map((bucket) => ({ type: 'method', ...bucket })),
    ...summary.buckets.grinders.filter((bucket) => bucket.averageScore < 94 || bucket.failures > 0).map((bucket) => ({ type: 'grinder', ...bucket })),
    ...summary.buckets.waters.filter((bucket) => bucket.averageScore < 94 || bucket.failures > 0).map((bucket) => ({ type: 'water', ...bucket })),
    ...summary.buckets.targets.filter((bucket) => bucket.averageScore < 94 || bucket.failures > 0).map((bucket) => ({ type: 'target', ...bucket })),
  ];
  return [
    `# AI Brew Real-World ${summary.scenarioCount} Improvement Prompt`,
    '',
    `Total cases: ${summary.scenarioCount}; passed: ${summary.passed}; failures: ${summary.failed}; warnings: ${summary.warnings}.`,
    `Average score: ${summary.averageScore}.`,
    `Score distribution: min ${summary.scoreDistribution.min}; p10 ${summary.scoreDistribution.p10}; p50 ${summary.scoreDistribution.p50}; p90 ${summary.scoreDistribution.p90}; max ${summary.scoreDistribution.max}.`,
    '',
    'Strict rule: do not change recipe math unless a recorded failure proves a numeric envelope bug.',
    'This gate is real-world scenario validation and barista reasoning, not physical brew proof.',
    'If no failures remain, prioritize physical brew validation, field feedback, grinder calibration logs, and documentation.',
    '',
    'Failure/risk keywords covered by this gate: zero-mineral water, fallback grinder, target mismatch, high-buffer water, dark roast floral mismatch, incompatible espresso grinders.',
    '',
    '## Weak Buckets',
    weakBuckets.length === 0
      ? 'No weak software bucket under threshold. Continue with real brew validation.'
      : weakBuckets.slice(0, 40).map((bucket) => `- ${bucket.type}: ${bucket.key}; avg ${bucket.averageScore}; min ${bucket.minScore}; failures ${bucket.failures}; warnings ${bucket.warnings}`).join('\n'),
    '',
    '## Top Warning Categories',
    ...(summary.topWarningCategories.length
      ? summary.topWarningCategories.slice(0, 20).map((item) => `- ${item.code}: ${item.count}; examples ${item.examples.join(', ')}`)
      : ['- No warning category recorded.']),
    '',
    '## Lowest Cases',
    ...summary.lowestScoringCases.slice(0, 20).map((item) => `- ${item.exampleId}: ${item.bean} / ${item.method} / ${item.grinder} / ${item.water}; score ${item.score}; ${item.reasons.map((reason) => reason.code).join(', ') || 'no failure'}`),
    '',
  ].join('\n');
}

function exampleTable(results, limit = 40) {
  const required = results.filter((result) => result.curated).slice(0, limit);
  return [
    '| # | Scenario | Method | Grinder | Water | Output | Score | Finding |',
    '|---:|---|---|---|---|---|---:|---|',
    ...required.map((result, index) => {
      const output = result.output
        ? `${result.output.doseG}g, ${result.output.totalWaterMl}ml, ${result.output.tempC}C, ${result.output.grind}, ${result.output.extractionEnd}`
        : 'no output';
      const finding = result.reasons.length
        ? result.reasons.map((reason) => reason.code).join('; ')
        : 'Pass; software recipe safe, real brew validation still required';
      return `| ${index + 1} | ${result.input.bean} -> ${result.input.targetProfileId} | ${result.input.method} | ${result.input.grinder} | ${result.input.water} | ${output.replace(/\|/g, '/')} | ${result.scores.average} | ${finding.replace(/\|/g, '/')} |`;
    }),
  ].join('\n');
}

function reportMarkdown(summary, results) {
  const failures = results.filter((result) => result.scores.hasFailure);
  const warningRows = results
    .filter((result) => result.reasons.some((reason) => reason.severity === 'warn'))
    .slice(0, 20)
    .map((result) => `- ${result.exampleId}: ${result.reasons.filter((reason) => reason.severity === 'warn').map((reason) => reason.message).join('; ')}`);
  const excellent = results
    .filter((result) => !result.scores.hasFailure && result.scores.average >= 98)
    .slice(0, 12)
    .map((result) => `- ${result.exampleId}: ${result.input.bean} with ${result.input.method} scored ${result.scores.average}.`);
  const questionable = results
    .filter((result) => !result.scores.hasFailure && result.scores.average < 96)
    .slice(0, 12)
    .map((result) => `- ${result.exampleId}: ${result.input.bean} with ${result.input.method} scored ${result.scores.average}; review warnings/copy before physical validation.`);
  return [
    `# AI Brew Real-World ${summary.scenarioCount} Report`,
    '',
    `Latest SHA: ${summary.sha}`,
    `Local branch: ${summary.git.branch}`,
    `Origin main: ${summary.git.originMain}`,
    `Local status: ${summary.git.status === 'clean' ? 'clean' : 'dirty (local validation changes present)'}`,
    `Date: ${summary.date}`,
    `Scenario count: ${summary.scenarioCount}`,
    '',
    '## Honesty Boundary',
    'This is a curated real-world software/barista reasoning gate. It did not physically brew coffee and it must not be used as sensory certainty. AI Brew creates strong starting recipes and dial-in guidance; physical real brew validation is still required.',
    summary.profile === 'filter-source-backed'
      ? 'This is a source-backed software scenario gate built from real roastery/community coffee seeds and deterministic combinations. It is not 20,000 unique physical coffee lots and not 20,000 physical brews.'
      : '',
    summary.scenarioCount >= 10000
      ? `This is a ${summary.scenarioCount.toLocaleString('en-US')}-case software/barista scenario gate, not ${summary.scenarioCount.toLocaleString('en-US')} physical brews or verified current-lot sensory data.`
      : 'This is not physical brew proof or verified current-lot sensory data.',
    '',
    '## Bean Coverage',
    ...Object.entries(summary.coverage.beans).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Method Coverage',
    ...Object.entries(summary.coverage.methods).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Grinder Coverage',
    ...Object.entries(summary.coverage.grinders).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Water Coverage',
    ...Object.entries(summary.coverage.waters).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Target Coverage',
    ...Object.entries(summary.coverage.targets).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Score Summary',
    `Passed: ${summary.passed}/${summary.scenarioCount}`,
    `Failures: ${summary.failed}`,
    `Warnings: ${summary.warnings}`,
    `Average score: ${summary.averageScore}`,
    `Score distribution: min ${summary.scoreDistribution.min}; p10 ${summary.scoreDistribution.p10}; p50 ${summary.scoreDistribution.p50}; p90 ${summary.scoreDistribution.p90}; max ${summary.scoreDistribution.max}`,
    `Unique coffee input combinations: ${summary.coverageDensity.uniqueCoffeeInputs}`,
    `Coverage density: ${summary.coverageDensity.beanArchetypes} bean archetypes, ${summary.coverageDensity.methods} methods, ${summary.coverageDensity.grinders} grinders, ${summary.coverageDensity.waters} waters, ${summary.coverageDensity.targets} targets, ${summary.coverageDensity.roasts} roast levels.`,
    summary.profile === 'filter-source-backed' ? `Source-backed seed lots: ${summary.coverageDensity.sourceBackedLots}` : '',
    '',
    '| Category | Average | Minimum |',
    '|---|---:|---:|',
    ...SCORE_KEYS.map((key) => `| ${key} | ${summary.scoreAverages[key]} | ${summary.scoreMinimums[key]} |`),
    '',
    '## Lowest Scoring Cases',
    ...summary.lowestScoringCases.slice(0, 12).map((item) => `- ${item.exampleId}: ${item.bean} / ${item.method} / ${item.grinder} / ${item.water}; score ${item.score}; ${item.reasons.map((reason) => `${reason.code}: ${reason.message}`).join('; ') || 'no failure'}`),
    '',
    '## Top Failures',
    failures.length === 0 ? 'No blocking software failure found.' : failures.slice(0, 20).map((result) => `- ${result.exampleId}: ${result.reasons.filter((reason) => reason.severity === 'fail').map((reason) => `${reason.code}: ${reason.message}`).join('; ')}`).join('\n'),
    '',
    '## Top Warnings',
    warningRows.length === 0 ? 'No warning bucket required immediate software patch.' : warningRows.join('\n'),
    '',
    '## Top Warning Causes',
    ...(summary.topWarningCategories.length
      ? summary.topWarningCategories.slice(0, 12).map((item) => `- ${item.code}: ${item.count} cases; examples ${item.examples.join(', ')}`)
      : ['- No warning category recorded.']),
    '',
    '## Top Method-Risk Categories',
    ...(summary.topMethodRiskCategories.length
      ? summary.topMethodRiskCategories.map((item) => `- ${item.key}: avg ${item.averageScore}; min ${item.minScore}; warnings ${item.warnings}; failures ${item.failures}`)
      : ['- No method bucket fell under the risk reporting threshold.']),
    '',
    '## Barista Interpretation',
    '- Premium washed/floral coffees are evaluated for higher temperature, clarity, water-buffer honesty, and target mismatch warnings.',
    '- Natural, anaerobic, decaf, non-arabica, wet-hulled, dark roast, and unknown inputs are scored for conservative confidence and non-overclaim behavior.',
    '- Espresso is judged as a starting-point/dial-in workflow, not a guaranteed shot recipe.',
    '- Cold brew, moka, French Press, batch brewer, and siphon are checked for method-specific language instead of V60 copy leakage.',
    '',
    '## What Outputs Were Excellent',
    ...(excellent.length ? excellent : ['- Strong cases kept safe numeric envelopes, method-specific workflow, honest expected-cup confidence, and clear grinder/water caveats.']),
    '',
    '## What Outputs Were Questionable',
    ...(questionable.length ? questionable : ['- No low-scoring non-failing bucket was found in this run.']),
    '',
    '## What Outputs Were Wrong',
    failures.length === 0 ? '- No blocking wrong output was found in this software gate.' : failures.slice(0, 20).map((result) => `- ${result.exampleId}: ${result.reasons.map((reason) => reason.message).join('; ')}`).join('\n'),
    '',
    '## Required Example Cases',
    exampleTable(results, 55),
    '',
    '## Recommended Fixes',
    summary.failed === 0
      ? '- No planner recipe-math patch is justified by this run. Prioritize physical brew validation, field feedback capture, grinder calibration logs, and continued copy QA.'
      : '- Patch only the failure buckets listed above. Do not change recipe math unless the failure proves a numeric envelope bug.',
    '',
    '## Patch Summary',
    '- Added this deterministic real-world 1,000-scenario gate and artifact/report generator.',
    '- Added honest non-perfect scoring for acceptable real-world risks, including fallback grinders, Indonesian water estimates, target mismatches, and method-specific limitations.',
    '- Added method-language safety reporting so espresso, moka, cold brew, French Press, and batch brew cannot silently inherit pour-over wording.',
    '- Hardened the gate so not-recommended espresso grinders must carry a hard warning and low expected-cup confidence.',
    '- Hardened the gate so zero-mineral/manual RO water cannot be treated as brew-ready.',
    '- No AI Brew recipe math is changed by this report generator.',
    '',
    '## Retest Results',
    `- Real-world 1000 gate verdict: ${summary.verdict}.`,
    '',
    '## Remaining Real-World Limits',
    '- No physical brew logs, refractometer readings, grinder zero-point logs, roast-date measurements, or sensory panel notes are included.',
    '- Roastery-style labels in the matrix are archetypes, not verified current-lot lab data.',
    '- Grinder settings remain starting points that require calibration by burr alignment, zero point, dose, and flow.',
    '- Water label data can be incomplete; manual GH/KH/TDS checks remain the best validation path.',
    '',
    '## Final Verdict',
    summary.verdict,
    '',
  ].join('\n');
}

function writeArtifacts(summary, results, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const failures = results.filter((result) => result.scores.hasFailure);
  const files = {
    summary: `${dir}/summary.json`,
    cases: `${dir}/cases.json`,
    failures: `${dir}/failures.json`,
    warnings: `${dir}/warnings.md`,
    lowestScores: `${dir}/lowest-scores.md`,
    methodLanguageSafety: `${dir}/method-language-safety.md`,
    waterRealityAudit: `${dir}/water-reality-audit.md`,
    guardrailBreakdown: `${dir}/guardrail-breakdown.md`,
    beanSourceCoverage: `${dir}/bean-source-coverage.csv`,
    hotIcedBloomPourWaterRegression: `${dir}/hot-iced-bloom-pour-water-regression.md`,
    improvementPrompt: `${dir}/improvement-prompt.md`,
    report: `docs/ai-brew-real-world-${summary.scenarioCount}-report.md`,
  };
  writeJson(files.summary, summary);
  writeJson(files.cases, results);
  writeJson(files.failures, failures);
  fs.writeFileSync(files.warnings, warningsMarkdown(summary, results), 'utf8');
  fs.writeFileSync(files.lowestScores, lowestScoresMarkdown(summary), 'utf8');
  fs.writeFileSync(files.methodLanguageSafety, methodLanguageSafetyMarkdown(summary, results), 'utf8');
  fs.writeFileSync(files.waterRealityAudit, waterRealityAuditMarkdown(summary, results), 'utf8');
  fs.writeFileSync(files.guardrailBreakdown, guardrailBreakdownMarkdown(summary, results), 'utf8');
  fs.writeFileSync(files.beanSourceCoverage, beanSourceCoverageCsv(results), 'utf8');
  fs.writeFileSync(files.hotIcedBloomPourWaterRegression, hotIcedBloomPourWaterRegressionMarkdown(summary, results), 'utf8');
  fs.writeFileSync(files.improvementPrompt, improvementPrompt(summary), 'utf8');
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(files.report, reportMarkdown(summary, results), 'utf8');
  return files;
}

function main() {
  const sha = gitSha(false);
  globalCatalog = cloneCatalogWithFallbackGrinders(buildProductionAiBrewCatalogForStress());
  const scenarios = buildScenarios(globalCatalog);
  const results = scenarios.map((scenario) => runScenario(globalCatalog, scenario));
  const summary = summarize(results, sha);
  const artifactSlug = SCENARIO_PROFILE === 'filter-source-backed'
    ? `filter-real-world-${summary.scenarioCount}`
    : `real-world-${summary.scenarioCount}`;
  const dir = `artifacts/ai-brew-audit/${artifactSlug}/${gitSha(true)}`;
  const files = writeArtifacts(summary, results, dir);
  console.log(JSON.stringify({
    sha,
    scenarios: summary.scenarioCount,
    passed: summary.passed,
    failed: summary.failed,
    warnings: summary.warnings,
    averageScore: summary.averageScore,
    scoreDistribution: summary.scoreDistribution,
    verdict: summary.verdict,
    artifacts: files,
  }, null, 2));
  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main();
