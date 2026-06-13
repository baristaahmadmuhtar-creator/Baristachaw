import fs from 'node:fs';
import path from 'node:path';
import { loadAiBrewCatalog } from '../apps/web/src/features/ai-brew/catalog.ts';
import { buildAiBrewPlan } from '../apps/web/src/features/ai-brew/planner.ts';
import { validateBrewPlanOutput } from '../apps/web/src/features/ai-brew/antiHallucination.ts';

const ROOT = process.cwd();

const previousFetch = globalThis.fetch;
globalThis.fetch = (async (input) => {
  const url = String(input);
  const filePath = url.startsWith('/data/')
    ? path.join(ROOT, 'apps/web/public', url)
    : path.join(ROOT, url);
  const body = fs.readFileSync(filePath, 'utf8');
  return { ok: true, json: async () => JSON.parse(body) } as any;
});

const stressCatalog = await loadAiBrewCatalog();
globalThis.fetch = previousFetch;

const visibleDrippers = stressCatalog.drippers.filter((dripper) => !dripper.hidden && !dripper.deprecated);
const targetProfileIds = [
  'balance_clean',
  'more_sweetness',
  'more_acidity',
  'more_body',
  'floral_transparent',
  'fruit_forward',
  'soft_round',
  'dense_comforting',
];
const roastLevels = ['light', 'medium_light', 'medium', 'medium_dark', 'dark'] as const;
const processEntries = stressCatalog.processes.filter((entry) => entry.id);
const varietyEntries = stressCatalog.varieties.filter((entry) => entry.id);

const grinderIds = [
  '1zpresso-k-ultra',
  'comandante-c40-mk4',
  'timemore-c3',
  'kingrinder-k6',
  'df64-gen2',
  'feima-600n',
].filter((id) => stressCatalog.grinders.some((grinder) => grinder.id === id));

const index = 0;
const dripper = visibleDrippers[index % visibleDrippers.length];
const targetProfileId = targetProfileIds[Math.floor(index / visibleDrippers.length) % targetProfileIds.length];
const processEntry = processEntries[index % processEntries.length];
const varietyEntry = varietyEntries[Math.floor(index / processEntries.length) % varietyEntries.length];
const roastLevel = roastLevels[Math.floor(index / (visibleDrippers.length * targetProfileIds.length)) % roastLevels.length];
const waterMode = 'manual';
const waterTdsPpm = '95';
const waterHardnessPpm = '55';
const waterAlkalinityPpm = '40';
const waterCustomized = true;
const waterNotes = 'balanced iced stress water';

const doseG = '15';
const targetWaterMl = '';
const coffeeName = `${processEntry.label} ${varietyEntry.label} ${roastLevel} iced stress`;

const formState = {
  brewMode: 'iced' as const,
  dripperId: dripper.id,
  targetProfileId,
  doseG,
  targetWaterMl,
  grinderId: grinderIds[index % grinderIds.length],
  coffeeName,
  process: processEntry.id,
  variety: varietyEntry.id,
  roastLevel,
  waterMode: waterMode as any,
  waterBrandId: '',
  waterTdsPpm,
  waterHardnessPpm,
  waterAlkalinityPpm,
  waterCustomized,
  waterNotes,
};

console.log('Dripper ID:', dripper.id);
console.log('Dripper Name:', dripper.name);
console.log('Target:', targetProfileId);
console.log('Process:', processEntry.id);
console.log('Variety:', varietyEntry.id);
console.log('Roast:', roastLevel);

const plan = buildAiBrewPlan(formState, stressCatalog);
console.log('Method Family:', plan.methodFamily);
console.log('Recipe Style:', plan.recipeStyle);
console.log('Narrative watch/why:', plan.warnings, plan.notes);

const guardResult = validateBrewPlanOutput(plan);
console.log('Guard Result:', guardResult);
