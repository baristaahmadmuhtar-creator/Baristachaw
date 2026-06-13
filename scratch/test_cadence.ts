import fs from 'node:fs';
import path from 'node:path';
import { loadAiBrewCatalog } from '../apps/web/src/features/ai-brew/catalog.ts';
import { buildAiBrewPlan, createDefaultAiBrewFormState } from '../apps/web/src/features/ai-brew/planner.ts';

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

const fullFamilyCatalog = await loadAiBrewCatalog();
globalThis.fetch = previousFetch;

const base = {
  ...createDefaultAiBrewFormState(fullFamilyCatalog),
  brewMode: 'iced' as const,
  coffeeName: `April high dose iced QA`,
  dripperId: 'april-brewer',
  doseG: '30',
  targetProfileId: 'balance_clean',
  roastLevel: 'medium_light' as const,
  waterMode: 'manual' as const,
  waterTdsPpm: '92',
  waterHardnessPpm: '46',
  waterAlkalinityPpm: '32',
};
const plan = buildAiBrewPlan(base, fullFamilyCatalog);
console.log('Steps:');
for (const step of plan.steps) {
  console.log(`- ID: ${step.id}, Kind: ${step.kind}, share: ${step.share}, pourVolumeMl: ${step.pourVolumeMl}`);
}
