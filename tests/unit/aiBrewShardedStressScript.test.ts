import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('AI Brew 10M and grinder 1M sharded stress gates are wired as on-demand scripts', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  assert.equal(
    packageJson.scripts['test:ai-brew:10m-shard'],
    'node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs scripts/ai-brew-sharded-stress.mjs --mode=brew10m --total=10000000 --shards=100 --shard=0',
  );
  assert.equal(
    packageJson.scripts['test:ai-brew:10m-smoke'],
    'node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs scripts/ai-brew-sharded-stress.mjs --mode=brew10m --total=10000 --shards=100 --shard=0',
  );
  assert.equal(
    packageJson.scripts['test:grind-size:1m-shard'],
    'node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs scripts/ai-brew-sharded-stress.mjs --mode=grinder1m --total=1000000 --shards=50 --shard=0',
  );
  assert.equal(
    packageJson.scripts['test:grind-size:1m-smoke'],
    'node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs scripts/ai-brew-sharded-stress.mjs --mode=grinder1m --total=10000 --shards=50 --shard=0',
  );

  const script = fs.readFileSync('scripts/ai-brew-sharded-stress.mjs', 'utf8');
  assert.match(script, /parseShardedOptions/);
  assert.match(script, /brew10m/);
  assert.match(script, /grinder1m/);
  assert.match(script, /AI_BREW_STRESS_TOTAL/);
  assert.match(script, /AI_BREW_STRESS_SHARDS/);
  assert.match(script, /AI_BREW_STRESS_SHARD/);
  assert.match(script, /tests\/fixtures\/ai-brew-indonesia-real-beans\.json/);
  assert.match(script, /brew-10m-sharded/);
  assert.match(script, /grinder-1m-sharded/);
});

test('Indonesia real bean fixture covers MVP source-backed origins without inventing missing fields', () => {
  const fixture = JSON.parse(
    fs.readFileSync('tests/fixtures/ai-brew-indonesia-real-beans.json', 'utf8'),
  ) as {
    items: Array<{
      id: string;
      origin: string;
      region: string;
      process?: string;
      variety?: string;
      sourceUrls: string[];
      evidenceLevel: string;
      missingFields: string[];
    }>;
  };

  assert.ok(fixture.items.length >= 12, 'fixture should cover enough Indonesian seed lots');
  const ids = new Set<string>();
  const requiredRegions = ['Gayo', 'Java', 'Kintamani', 'Flores', 'Toraja', 'Kerinci'];
  const regionText = fixture.items.map((item) => item.region).join(' ');
  let explicitMissingFields = 0;

  for (const item of fixture.items) {
    assert.ok(item.id && !ids.has(item.id), `duplicate or missing id: ${item.id}`);
    ids.add(item.id);
    assert.equal(item.origin, 'Indonesia');
    assert.ok(item.region, `${item.id} must carry region`);
    assert.ok(['roaster_page', 'green_importer_page', 'producer_exporter_page', 'industry_reference'].includes(item.evidenceLevel));
    assert.ok(Array.isArray(item.sourceUrls) && item.sourceUrls.length > 0, `${item.id} must keep source URLs`);
    for (const url of item.sourceUrls) assert.match(url, /^https?:\/\//i, `${item.id} has invalid source URL`);
    assert.ok(Array.isArray(item.missingFields), `${item.id} must explicitly track unknown fields`);
    if (item.missingFields.length > 0) explicitMissingFields += 1;
  }

  for (const region of requiredRegions) assert.match(regionText, new RegExp(region, 'i'), `missing Indonesian region: ${region}`);
  assert.ok(explicitMissingFields > 0, 'fixture should be honest about missing real-world lot details');
});
