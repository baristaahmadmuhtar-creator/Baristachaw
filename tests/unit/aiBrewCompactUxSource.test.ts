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
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-result-action-start"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-action-save"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-action-edit"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-action-check-taste"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-check-taste"/);
});

test('AI Brew Pro mode uses compact summary and controlled accordions', () => {
  assert.match(SOURCE, /data-testid="ai-brew-pro-summary"/);
  assert.match(SOURCE, /data-testid=\{`ai-brew-pro-accordion-\$\{sectionId\}`\}/);
  for (const section of ['recipe', 'bean', 'water', 'grinder', 'method', 'confidence']) {
    assert.match(SOURCE, new RegExp(`sectionId="${section}"`));
  }
  assert.match(SOURCE, /aria-expanded=\{open\}/);
  assert.match(SOURCE, /activeSection === sectionId/);
});

test('AI Brew generated result uses compact tabs before dense detail', () => {
  assert.match(SOURCE, /data-testid="ai-brew-result-summary-panel"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-guide-panel"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-coach-panel"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-detail-panel"/);
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-result-guide-preview"/);
  assert.match(SOURCE, /setActiveTab\('plan'\)/);
  assert.match(SOURCE, /\{ id: 'details', label: copy\.detailTab \}/);
});

test('AI Brew Pro keeps advanced AI tools collapsed and no AI auto-run', () => {
  assert.match(SOURCE, /primaryAiAssistActions/);
  assert.match(SOURCE, /advancedAiAssistActions/);
  assert.match(SOURCE, /<details className="group mt-3 rounded-xl/);
  assert.doesNotMatch(SOURCE, /useEffect\(\(\) => \{\s*onRunAiCoach/s);
});
