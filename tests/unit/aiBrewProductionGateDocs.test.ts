import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const REQUIRED_DOCS = [
  'docs/ai-brew-production-gate.md',
  'docs/ai-brew-method-matrix.md',
  'docs/ai-brew-grinder-matrix.md',
  'docs/ai-brew-water-matrix.md',
  'docs/ai-brew-real-world-validation-matrix.md',
  'docs/ai-brew-stress-test-history.md',
  'docs/ai-brew-known-limits.md',
  'docs/ai-brew-public-claim-safe-copy.md',
];

test('AI Brew production gate documentation is complete and honest', () => {
  for (const file of REQUIRED_DOCS) {
    assert.equal(fs.existsSync(file), true, `${file} must exist`);
    const text = fs.readFileSync(file, 'utf8');
    assert.match(text, /AI Brew/i, `${file} should identify AI Brew scope`);
    assert.doesNotMatch(text, /100%\s*(akurat|pasti|perfect|sempurna)|sudah dites 1 juta beans nyata/i, `${file} must not overclaim real-world accuracy`);
  }

  const methodMatrix = fs.readFileSync('docs/ai-brew-method-matrix.md', 'utf8');
  for (const method of ['V60', 'Hario Switch', 'Chemex', 'Flat-bottom', 'Clever', 'AeroPress', 'French Press', 'Espresso', 'Moka', 'Cold Brew', 'Batch Brewer', 'Siphon']) {
    assert.match(methodMatrix, new RegExp(method.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `method matrix should include ${method}`);
  }
  assert.match(methodMatrix, /REAL-WORLD VALIDATION NEEDED|PRODUCTION STRONG|PRODUCTION BASELINE/i);

  const stressHistory = fs.readFileSync('docs/ai-brew-stress-test-history.md', 'utf8');
  assert.match(stressHistory, /10,?000/i, 'stress history should document the global 10k matrix');
  assert.match(stressHistory, /100,?000/i, 'stress history should document the iced 100k matrix');
  assert.match(stressHistory, /physical brew|seduh fisik|real-world validation/i, 'stress history should keep physical validation separate');
});

test('package exposes explicit AI Brew matrix and stress gate scripts', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> };
  for (const script of ['test:ai-brew:matrix', 'test:ai-brew:stress', 'test:ai-brew:deep', 'test:ai-brew:report']) {
    assert.ok(pkg.scripts?.[script], `missing package script ${script}`);
  }
});
