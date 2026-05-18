import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('AI Brew real-world 1000 scenario gate is wired with curated coverage and honest reporting', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  assert.equal(
    packageJson.scripts['test:ai-brew:real-world-1000'],
    'node --experimental-strip-types --import ./tests/unit/register-sandbox-loader.mjs scripts/ai-brew-real-world-1000.mjs',
  );

  const script = fs.readFileSync('scripts/ai-brew-real-world-1000.mjs', 'utf8');
  assert.match(script, /SCENARIO_TOTAL\s*=\s*1000/);
  assert.match(script, /Panama Hacienda La Esmeralda Geisha Washed style/);
  assert.match(script, /Ethiopia Yirgacheffe Washed Landrace style/);
  assert.match(script, /Kenya AA SL28\/SL34 Washed style/);
  assert.match(script, /Sumatra Wet-Hulled style/);
  assert.match(script, /Indonesia Gayo Washed Ateng\/Typica style/);
  assert.match(script, /India Monsooned Malabar style/);
  assert.match(script, /Liberica \/ Excelsa specialty style/);
  assert.match(script, /Unknown origin\/process\/variety/);
  assert.match(script, /Aqua bottled water Indonesia style/);
  assert.match(script, /Pristine 8\.6\+ alkaline water Indonesia style/);
  assert.match(script, /Galon isi ulang \/ depot water Indonesia style/);
  assert.match(script, /REQUIRED_EXAMPLE_CASES/);
  assert.match(script, /AI BREW REAL-WORLD SCENARIO STRONG \/ REAL BREW VALIDATION REQUIRED/);
  assert.match(script, /real brew validation/i);
  assert.match(script, /zero-mineral/i);
  assert.match(script, /fallback grinder/i);
  assert.match(script, /target mismatch/i);
  assert.match(script, /workflowLanguageSafety/);
  assert.match(script, /scoreDistribution/);
  assert.match(script, /lowest-scores\.md/);
  assert.match(script, /method-language-safety\.md/);
  assert.match(script, /addRealWorldRiskWarnings/);
  assert.match(script, /methodFamilyMatches/);
  assert.match(script, /grinder_fixture_not_found/);
  assert.match(script, /methodAllowsLowerClarityFloor/);
  assert.match(script, /aeropress', 'hario_switch', 'siphon/);

  const requiredExamples = (script.match(/exampleId:\s*'/g) || []).length;
  assert.ok(requiredExamples >= 55, 'script should define at least 55 required example cases');
});
