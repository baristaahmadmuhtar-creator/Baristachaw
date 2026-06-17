import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('AI Brew filter real-world 20000 gate is wired to source-backed coffee fixtures', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  assert.equal(
    packageJson.scripts['test:ai-brew:filter-real-world-20000'],
    'node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs scripts/ai-brew-real-world-1000.mjs --profile=filter-source-backed --scenarios=20000',
  );
  assert.equal(
    packageJson.scripts['test:ai-brew:guardrails'],
    'node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs --test tests/unit/aiBrewGuardrailClassification.test.ts tests/unit/aiBrewFilterRealWorld20000Script.test.ts',
  );

  const script = fs.readFileSync('scripts/ai-brew-real-world-1000.mjs', 'utf8');
  assert.match(script, /parseScenarioProfile/);
  assert.match(script, /filter-source-backed/);
  assert.match(script, /sourceBackedFilterBeans/);
  assert.match(script, /filter-real-world-\$\{summary\.scenarioCount\}/);
  assert.match(script, /guardrail-breakdown\.md/);
  assert.match(script, /bean-source-coverage\.csv/);
  assert.match(script, /hot-iced-bloom-pour-water-regression\.md/);
  assert.match(script, /source-backed software scenario gate/i);
  assert.match(script, /not 20,000 unique physical coffee lots/i);
});

test('source-backed filter bean fixture keeps real source URLs and missing fields explicit', () => {
  const fixture = JSON.parse(
    fs.readFileSync('tests/fixtures/ai-brew-source-backed-filter-beans.json', 'utf8'),
  ) as {
    items: Array<{
      id: string;
      roaster: string;
      lotName: string;
      origin: string;
      process?: string;
      variety?: string;
      roastLevel?: string;
      sourceUrl: string;
      capturedAt: string;
      evidenceLevel: string;
      missingFields: string[];
    }>;
  };

  assert.ok(fixture.items.length >= 24, 'fixture should include enough source-backed seed beans');
  const ids = new Set<string>();
  const requiredOrigins = new Set(['Indonesia', 'Ethiopia', 'Kenya', 'Colombia', 'Panama', 'Brazil']);
  const seenOrigins = new Set<string>();
  let indonesiaCount = 0;
  let explicitMissingFieldCount = 0;

  for (const item of fixture.items) {
    assert.ok(item.id && !ids.has(item.id), `duplicate or missing id: ${item.id}`);
    ids.add(item.id);
    assert.ok(item.roaster, `${item.id} must keep roaster name`);
    assert.ok(item.lotName, `${item.id} must keep lot name`);
    assert.ok(item.origin, `${item.id} must keep origin`);
    assert.match(item.sourceUrl, /^https?:\/\//i, `${item.id} must keep public sourceUrl`);
    assert.match(item.capturedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(['roaster_page', 'roaster_article', 'coffee_community_reference'].includes(item.evidenceLevel));
    assert.ok(Array.isArray(item.missingFields));
    if (item.origin === 'Indonesia') indonesiaCount += 1;
    if (requiredOrigins.has(item.origin)) seenOrigins.add(item.origin);
    if (item.missingFields.length > 0) explicitMissingFieldCount += 1;
  }

  assert.ok(indonesiaCount >= 8, 'fixture should prioritize Indonesian beans');
  for (const origin of requiredOrigins) assert.ok(seenOrigins.has(origin), `missing origin coverage: ${origin}`);
  assert.ok(explicitMissingFieldCount > 0, 'fixture should not invent missing process/variety/roast data');
});
