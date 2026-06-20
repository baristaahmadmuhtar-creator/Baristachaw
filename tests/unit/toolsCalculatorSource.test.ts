import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const TOOLS_SOURCE = readFileSync('apps/web/src/pages/BaristaTools.tsx', 'utf8');

test('ratio method preset strip is hidden in grind-size mode but preserved for ratio mode', () => {
  assert.match(TOOLS_SOURCE, /calculatorPanel === 'ratio'[\s\S]*data-testid="brew-method-chips"/);
  assert.doesNotMatch(
    TOOLS_SOURCE,
    /<div className="space-y-3">\s*<div className="flex items-center justify-between gap-3">[\s\S]*data-testid="brew-method-chips"[\s\S]*<\/div>\s*<\/div>\s*\{calculatorPanel === 'ratio'/,
  );
});
