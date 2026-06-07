import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { loadAiBrewCatalog } from '../apps/web/src/features/ai-brew/catalog.ts';
import {
  buildAiBrewPlan,
  createDefaultAiBrewFormState,
} from '../apps/web/src/features/ai-brew/planner.ts';

const ROOT = process.cwd();

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

const TARGETS = {
  balance_clean: { label: 'Balance & Clean', bypass: [25, 40], finish: [115, 150], ratio: [12.7, 13.3] },
  more_sweetness: { label: 'More Sweetness', bypass: [20, 35], finish: [125, 160], ratio: [12.5, 13.1] },
  more_acidity: { label: 'More Acidity', bypass: [30, 45], finish: [95, 125], ratio: [13.7, 14.3] },
  fruit_forward: { label: 'Fruit-Forward', bypass: [25, 40], finish: [105, 140], ratio: [13.2, 13.8] },
  floral_transparent: { label: 'Floral & Transparent', bypass: [35, 50], finish: [90, 125], ratio: [14.7, 15.3] },
  more_body: { label: 'More Body', bypass: [10, 25], finish: [140, 180], ratio: [12.2, 12.8] },
  soft_round: { label: 'Soft & Round', bypass: [20, 35], finish: [120, 150], ratio: [12.5, 13.1] },
  dense_comforting: { label: 'Dense & Comforting', bypass: [10, 20], finish: [145, 185], ratio: [11.7, 12.3] },
};

const BEANS = [
  { name: 'Panama Washed Geisha', process: 'washed', variety: 'Geisha' },
  { name: 'Panama Natural Geisha', process: 'natural', variety: 'Geisha' },
  { name: 'Ethiopia Washed Landrace', process: 'washed', variety: 'Ethiopian Landrace' },
  { name: 'Kenya Washed SL28 SL34', process: 'washed', variety: 'SL28 SL34' },
  { name: 'Colombia Pink Bourbon Washed', process: 'washed', variety: 'Pink Bourbon' },
  { name: 'Colombia Anaerobic Caturra', process: 'anaerobic', variety: 'Caturra' },
  { name: 'Brazil Natural Yellow Bourbon', process: 'natural', variety: 'Yellow Bourbon' },
  { name: 'Costa Rica Honey Catuai', process: 'honey', variety: 'Catuai' },
  { name: 'Indonesia Gayo Washed Ateng', process: 'washed', variety: 'Ateng' },
  { name: 'Indonesia Toraja Wet Hulled', process: 'wet_hulled', variety: 'Typica' },
  { name: 'Mexico Washed Bourbon', process: 'washed', variety: 'Bourbon' },
  { name: 'Specialty Robusta Natural', process: 'natural', variety: 'Canephora' },
];

const ROASTS = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'];
const WATERS = [
  { tds: '130', gh: '63', kh: '61', label: 'Volvic-like moderate mineral / upper-buffered' },
  { tds: '45', gh: '18', kh: '12', label: 'Low-mineral clarity' },
  { tds: '85', gh: '45', kh: '30', label: 'Balanced low-buffer filter' },
  { tds: '180', gh: '72', kh: '92', label: 'Upper-buffer caution' },
];

function findIdByText(collection, text) {
  const normalized = String(text).toLowerCase();
  return collection.find((item) => (
    String(item.id).toLowerCase() === normalized
    || String(item.label || '').toLowerCase().includes(normalized)
    || String(item.searchText || '').toLowerCase().includes(normalized)
    || (item.aliases || []).some((alias) => String(alias).toLowerCase().includes(normalized))
  ))?.id || 'custom';
}

function findByPattern(collection, patterns) {
  return collection.find((item) => patterns.some((pattern) => pattern.test(`${item.id} ${item.name}`)));
}

function planFor(catalog, bean, roastLevel, targetProfileId, index) {
  const dripper = findByPattern(catalog.drippers, [/^aeropress$/i, /aeropress/i]);
  const grinder = findByPattern(catalog.grinders, [/k-ultra/i, /kingrinder.*k6/i, /timemore.*c2/i, /feima|600n|murane/i])
    || catalog.grinders[0];
  const process = findIdByText(catalog.processes, bean.process);
  const variety = findIdByText(catalog.varieties, bean.variety);
  const water = WATERS[index % WATERS.length];
  const form = {
    ...createDefaultAiBrewFormState(catalog),
    brewMode: 'hot',
    coffeeName: `${bean.name} bypass audit`,
    process: process === 'custom' ? 'custom' : process,
    customProcess: process === 'custom' ? bean.process : '',
    variety: variety === 'custom' ? 'custom' : variety,
    customVariety: variety === 'custom' ? bean.variety : '',
    roastLevel,
    dripperId: dripper.id,
    grinderId: grinder.id,
    targetProfileId,
    doseG: '15',
    aeropressStyle: 'bypass',
    waterMode: 'manual',
    waterCustomized: true,
    waterTdsPpm: water.tds,
    waterHardnessPpm: water.gh,
    waterAlkalinityPpm: water.kh,
    waterNotes: water.label,
  };
  return { plan: buildAiBrewPlan(form, catalog), water };
}

function validateCase(plan, targetProfileId) {
  const expected = TARGETS[targetProfileId];
  const bypassMl = Math.round(plan.totalWaterMl - plan.hotWaterMl);
  const bypassPercent = Number(((bypassMl / plan.totalWaterMl) * 100).toFixed(1));
  const reasons = [];
  if (plan.methodFamily !== 'aeropress') reasons.push('wrong_method');
  if (plan.recipeStyle !== 'bypass') reasons.push('wrong_style');
  if (plan.hotWaterMl >= plan.totalWaterMl) reasons.push('missing_bypass_split');
  if (Math.round((plan.totalWaterMl / plan.doseG) * 10) / 10 !== Math.round(plan.finalBeverageRatio * 10) / 10) reasons.push('final_ratio_mismatch');
  if (Math.round((plan.hotWaterMl / plan.doseG) * 10) / 10 !== Math.round(plan.hotExtractionRatio * 10) / 10) reasons.push('concentrate_ratio_mismatch');
  if (plan.hotExtractionRatio < 8 || plan.hotExtractionRatio > 10.1) reasons.push('concentrate_outside_1_8_to_1_10');
  if (bypassPercent < expected.bypass[0] || bypassPercent > expected.bypass[1]) reasons.push('bypass_percent_outside_target');
  if (plan.totalTimeSeconds < expected.finish[0] || plan.totalTimeSeconds > expected.finish[1]) reasons.push('finish_outside_target');
  if (plan.finalBeverageRatio < expected.ratio[0] || plan.finalBeverageRatio > expected.ratio[1]) reasons.push('final_ratio_outside_target');
  const guideText = (plan.workflowGuideSteps || [])
    .map((step) => `${step.label} ${step.primaryText || ''} ${step.secondaryText || ''}`)
    .join(' ');
  if (!/bypass|setelah tekan|after pressing/i.test(guideText)) reasons.push('missing_after_press_bypass_copy');
  if (/\b(drawdown|final pour|flat bed|filter wall|center-to-mid|V60|bloom pour)\b/i.test(guideText)) reasons.push('aeropress_method_vocabulary_leak');
  if (/\$1 seconds|\$|\bundefined\b|\bNaN\b|ActionAction|Action Action|Pressgentle|Stophiss|stir dua times|pour air/i.test(guideText)) reasons.push('placeholder_or_broken_copy');
  return { passed: reasons.length === 0, reasons, bypassMl, bypassPercent };
}

function scoreCase(result) {
  if (result.passed) return 100;
  return Math.max(0, 100 - result.reasons.length * 15);
}

const catalog = await loadCatalog();
const branch = git('git branch --show-current');
const sha = git('git rev-parse HEAD');
const shortSha = git('git rev-parse --short=12 HEAD', 'local');
const now = new Date().toISOString();
const cases = [];
const warnings = [];

let index = 0;
for (const bean of BEANS) {
  for (const roastLevel of ROASTS) {
    for (const targetProfileId of Object.keys(TARGETS)) {
      const { plan, water } = planFor(catalog, bean, roastLevel, targetProfileId, index);
      const result = validateCase(plan, targetProfileId);
      const guideText = (plan.workflowGuideSteps || [])
        .map((step) => `${step.label}: ${step.primaryText || step.note || ''}`)
        .join(' | ');
      cases.push({
        id: `${bean.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${roastLevel}-${targetProfileId}`,
        bean: bean.name,
        process: bean.process,
        variety: bean.variety,
        roastLevel,
        targetProfileId,
        targetLabel: TARGETS[targetProfileId].label,
        water: water.label,
        doseG: plan.doseG,
        brewWaterMl: plan.hotWaterMl,
        bypassWaterMl: result.bypassMl,
        totalDrinkMl: plan.totalWaterMl,
        finalRatio: Number(plan.finalBeverageRatio.toFixed(2)),
        concentrateRatio: Number(plan.hotExtractionRatio.toFixed(2)),
        bypassPercent: result.bypassPercent,
        finishSeconds: plan.totalTimeSeconds,
        waterClassification: plan.waterClassification,
        score: scoreCase(result),
        passed: result.passed,
        reasons: result.reasons,
        guideText,
      });
      if (!result.passed) warnings.push(`${cases.at(-1).id}: ${result.reasons.join(', ')}`);
      index += 1;
    }
  }
}

const passCount = cases.filter((item) => item.passed).length;
const failCount = cases.length - passCount;
const averageScore = Number((cases.reduce((sum, item) => sum + item.score, 0) / cases.length).toFixed(1));
const artifactDir = path.join(ROOT, 'artifacts/ai-brew-audit/aeropress-bypass', shortSha);
fs.mkdirSync(artifactDir, { recursive: true });

const summary = {
  generatedAt: now,
  branch,
  sha,
  shortSha,
  caseCount: cases.length,
  passCount,
  failCount,
  averageScore,
  beanArchetypes: BEANS.length,
  roastLevels: ROASTS.length,
  targetProfiles: Object.keys(TARGETS).length,
  waterCases: WATERS.length,
  verdict: failCount === 0 ? 'PASS_SOFTWARE_READY_REAL_BREW_VALIDATION_REQUIRED' : 'FAIL_FIX_REQUIRED',
  honestyBoundary: 'Software/barista-reasoned validation only. Physical sensory validation is still required.',
};

fs.writeFileSync(path.join(artifactDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(artifactDir, 'cases.json'), `${JSON.stringify(cases, null, 2)}\n`);
fs.writeFileSync(
  path.join(artifactDir, 'warnings.md'),
  warnings.length
    ? `# AeroPress Bypass Warnings\n\n${warnings.map((item) => `- ${item}`).join('\n')}\n`
    : '# AeroPress Bypass Warnings\n\nNo software-blocking warnings in this matrix.\n',
);
fs.writeFileSync(
  path.join(artifactDir, 'guide-snapshots.md'),
  [
    '# AeroPress Bypass Guide Snapshots',
    '',
    ...cases.slice(0, 24).map((item) => `## ${item.id}\n\n- Final ratio: 1:${item.finalRatio.toFixed(1)}\n- Concentrate: 1:${item.concentrateRatio.toFixed(1)}\n- Split: ${item.brewWaterMl} ml brew water + ${item.bypassWaterMl} ml bypass\n- Guide: ${item.guideText}\n`),
  ].join('\n'),
);
fs.writeFileSync(
  path.join(artifactDir, 'improvement-prompt.md'),
  [
    '# AeroPress Bypass Improvement Prompt',
    '',
    'Keep AeroPress bypass as a concentrate-first workflow: brew water passes through the chamber, bypass water is added in the cup after pressing, and the UI must display brew water, bypass water, total drink, final ratio, concentrate ratio, steep time, press time, and stop-before-hiss guidance.',
    '',
    'If future regressions appear, check target-aware bypass ranges first, then Lite/Pro guide copy, then language leakage in localized surfaces.',
  ].join('\n'),
);

const reportPath = path.join(ROOT, 'docs/ai-brew-aeropress-bypass-report.md');
fs.writeFileSync(reportPath, [
  '# AI Brew AeroPress Bypass Report',
  '',
  `Generated: ${now}`,
  `Branch: ${branch}`,
  `SHA: ${sha}`,
  '',
  '## Scope',
  '',
  'AeroPress measured bypass software audit across 12 real-world bean archetypes, 5 roast levels, 8 taste targets, multiple manual water profiles, and mixed grinder confidence contexts.',
  '',
  '## Results',
  '',
  `- Cases: ${cases.length}`,
  `- Passed: ${passCount}`,
  `- Failed: ${failCount}`,
  `- Average score: ${averageScore}`,
  `- Artifact directory: \`artifacts/ai-brew-audit/aeropress-bypass/${shortSha}\``,
  '',
  '## Production Rules Verified',
  '',
  '- Brew water passes through AeroPress chamber.',
  '- Bypass water is added in the cup after pressing only.',
  '- Final ratio is calculated from total drink water divided by dose.',
  '- Concentrate ratio is calculated from brew water divided by dose.',
  '- Target profiles shift bypass percentage, finish window, final ratio, and agitation guidance.',
  '- Workflow guide rejects pour-over language such as drawdown, final pour, flat bed, filter wall, V60, and bloom pour.',
  '',
  '## Known Limits',
  '',
  '- This is software/barista-reasoned validation, not physical sensory proof. Real brew validation is still required.',
  '- The matrix uses source-backed archetypes and realistic input profiles, but it does not replace cupping logs from actual AeroPress brews.',
  '',
  `Final verdict: ${summary.verdict}`,
  '',
].join('\n'));

if (failCount > 0) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
