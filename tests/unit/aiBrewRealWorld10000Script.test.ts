import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('AI Brew real-world 10000 scenario gate expands curated coffee coverage honestly', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  assert.equal(
    packageJson.scripts['test:ai-brew:real-world-10000'],
    'node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs scripts/ai-brew-real-world-1000.mjs --scenarios=10000',
  );

  const script = fs.readFileSync('scripts/ai-brew-real-world-1000.mjs', 'utf8');
  assert.match(script, /parseScenarioTotal/);
  assert.match(script, /SCENARIO_TOTAL\s*=\s*parseScenarioTotal/);
  assert.match(script, /real-world-\$\{summary\.scenarioCount\}/);
  assert.match(script, /ai-brew-real-world-\$\{summary\.scenarioCount\}-report\.md/);
  assert.match(script, /Indonesia Kerinci Honey Sigararutang style/);
  assert.match(script, /Indonesia Papua Wamena Washed Typica style/);
  assert.match(script, /Indonesia Bajawa Flores Natural Catimor style/);
  assert.match(script, /Indonesia Java Preanger Washed S795 style/);
  assert.match(script, /Mexico Chiapas Washed Bourbon style/);
  assert.match(script, /Peru Cajamarca Washed Typica style/);
  assert.match(script, /Bolivia Caranavi Washed Caturra style/);
  assert.match(script, /Uganda Natural SL14\/SL28 style/);
  assert.match(script, /Nicaragua Maracaturra Washed style/);
  assert.match(script, /Honduras Parainema Honey style/);
  assert.match(script, /Thailand Doi Chang Washed Catimor style/);
  assert.match(script, /Laos Bolaven Washed Catimor style/);
  assert.match(script, /caseVarietySignature/);
  assert.match(script, /uniqueCoffeeInputs/);
  assert.match(script, /coverageDensity/);
  assert.match(script, /This is a 10,000-case software\/barista scenario gate/);
  assert.match(script, /not 10,000 physical brews/);
});
