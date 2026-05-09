import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const SOURCE = readFileSync('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'utf8');

test('AI Brew quick mode keeps Switch setup compact and single-source-of-truth', () => {
  assert.match(SOURCE, /data-testid="ai-brew-switch-preset-toggle"/);
  assert.match(SOURCE, /data-testid="ai-brew-switch-selected-size"/);
  assert.match(SOURCE, /data-testid="ai-brew-dose-shortcuts"/);
  assert.doesNotMatch(SOURCE, /data-testid=\{`ai-brew-switch-dose-/);
});

test('AI Brew quick mode keeps optional bean detail and AI tools collapsed', () => {
  assert.match(SOURCE, /data-testid="ai-brew-bean-details-toggle"/);
  assert.match(SOURCE, /data-testid="ai-brew-bean-details-summary"/);
  assert.match(SOURCE, /primaryAiAssistActions/);
  assert.match(SOURCE, /advancedAiAssistActions/);
  assert.match(SOURCE, /copy\.moreAiTools/);
});

test('AI Brew mobile result has a compact action bar', () => {
  assert.match(SOURCE, /data-testid="ai-brew-result-action-bar"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-action-start"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-action-save"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-action-edit"/);
});
