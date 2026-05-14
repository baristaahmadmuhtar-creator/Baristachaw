import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const SOURCE = readFileSync('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'utf8');

test('AI Brew quick mode keeps Switch setup compact and single-source-of-truth', () => {
  assert.match(SOURCE, /data-testid="ai-brew-brew-mode-method-panel"/);
  assert.match(SOURCE, /data-testid="ai-brew-switch-method-strip"/);
  assert.match(SOURCE, /data-testid="ai-brew-switch-preset-auto-inline"/);
  assert.match(SOURCE, /data-testid="ai-brew-switch-selected-size"/);
  assert.match(SOURCE, /data-testid="ai-brew-switch-method-summary"/);
  assert.match(SOURCE, /data-testid="ai-brew-switch-target-clarifier"/);
  assert.match(SOURCE, /data-testid="ai-brew-dose-shortcuts"/);
  assert.doesNotMatch(SOURCE, /data-testid=\{`ai-brew-switch-dose-/);
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-switch-preset-toggle"/);
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
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-result-primary-actions"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-secondary-actions"/);
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-result-check-taste-primary"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-action-save"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-action-guide"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-action-edit"/);
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-result-action-check-taste"/);
  assert.match(SOURCE, /setActiveTab\('flow'\)/);
});

test('AI Brew Pro mode uses visible bean detail and controlled accordions', () => {
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-pro-summary"/);
  assert.match(SOURCE, /data-testid="ai-brew-pro-bean-required"/);
  assert.match(SOURCE, /data-testid="ai-brew-switch-inline-methods"/);
  assert.match(SOURCE, /brewModeAndMethodPanel/);
  assert.doesNotMatch(SOURCE, /\{switchPanel\}\s*\{methodOptionPanel\}/);
  assert.match(SOURCE, /data-testid=\{`ai-brew-pro-accordion-\$\{sectionId\}`\}/);
  for (const section of ['recipe', 'water', 'grinder', 'method', 'confidence']) {
    assert.match(SOURCE, new RegExp(`sectionId="${section}"`));
  }
  assert.doesNotMatch(SOURCE, /sectionId="bean"/);
  assert.match(SOURCE, /aria-expanded=\{open\}/);
  assert.match(SOURCE, /activeSection === sectionId/);
});

test('AI Brew generated result uses compact tabs before dense detail', () => {
  assert.match(SOURCE, /data-testid="ai-brew-result-summary-panel"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-guide-panel"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-coach-panel"/);
  assert.match(SOURCE, /data-testid="ai-brew-result-detail-panel"/);
  assert.match(SOURCE, /data-testid="ai-brew-pro-why-recipe"/);
  assert.match(SOURCE, /summaryWhyRecipeItems/);
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-confidence-labels"/);
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-result-metric-strip"/);
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-result-guide-preview"/);
  assert.doesNotMatch(SOURCE, /expectedCupItems\.map\(\(item\) =>/);
  assert.match(SOURCE, /setActiveTab\('plan'\)/);
  assert.match(SOURCE, /setGuideDensity\(isQuickResult \? 'basic' : 'pro'\)/);
  assert.match(SOURCE, /\{ id: 'details', label: copy\.detailTab \}/);
});

test('AI Brew Pro keeps advanced AI tools collapsed and no AI auto-run', () => {
  assert.match(SOURCE, /primaryAiAssistActions/);
  assert.match(SOURCE, /advancedAiAssistActions/);
  assert.match(SOURCE, /<details className="group mt-3 rounded-xl/);
  assert.doesNotMatch(SOURCE, /useEffect\(\(\) => \{\s*onRunAiCoach/s);
});

test('AI Brew Indonesian release copy localizes critical trust and safety labels', () => {
  for (const copy of [
    'Data bean lengkap',
    'Data bean sebagian',
    'Bean belum lengkap',
    'Perlu hati-hati',
    'Kombinasi tidak aman',
    'Prediksi rasa, bukan jaminan',
    'Keyakinan & Sumber',
    'Keamanan',
    'Katup tutup',
    'buka katup',
    'Muatan ruang',
    'air turun',
    'Ekstraksi',
    'Panduan selesai',
    'Aduk es tidak menambah ekstraksi',
    'Profil Target menyesuaikan rasa, bukan mengganti metode Switch',
    'Auto memilih metode dari Profil Target, dosis, ukuran alat, dan batas aman',
    'Metode manual tetap dipakai kalau aman',
    'Manual',
    'Hybrid es',
    'MUGEN hybrid',
  ]) {
    assert.match(SOURCE, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(SOURCE, /formatBeanCoverageLabel/);
  assert.match(SOURCE, /formatAiBrewConfidenceLabel/);
  assert.match(SOURCE, /Jelaskan dengan AI/);
  assert.match(SOURCE, /Perbaiki Rasa/);
  assert.match(SOURCE, /Buat Panduan Lebih Ramah/);
  assert.match(SOURCE, /Tool AI lainnya/);
});

test('AI Brew exposes explicit mobile time semantics instead of one misleading total', () => {
  assert.match(SOURCE, /getPlanExtractionSeconds/);
  assert.match(SOURCE, /getPlanGuideEndSeconds/);
  assert.match(SOURCE, /getPlanPostExtractionSeconds/);
  assert.match(SOURCE, /data-testid="ai-brew-time-semantics"/);
  assert.match(SOURCE, /data-testid="ai-brew-time-helper"/);
  assert.match(SOURCE, /extractionTimeLabel/);
  assert.match(SOURCE, /guideEndLabel/);
  assert.match(SOURCE, /flowStepRemaining/);
  assert.match(SOURCE, /flowTotalRemaining/);
  assert.match(SOURCE, /data-testid="ai-brew-flow-remaining-status"/);
});

test('AI Brew guide details stay deduped and barista-actionable', () => {
  assert.match(SOURCE, /normalizeAiBrewDetailKey/);
  assert.match(SOURCE, /isAiBrewDetailCovered/);
  assert.match(SOURCE, /points\.slice\(0, 3\)/);
  assert.match(SOURCE, /Tuang tenang dari tengah ke tengah-luar/);
  assert.match(SOURCE, /Setup: bilas filter, panaskan brewer\/server/);
  assert.match(SOURCE, /Kontrol seduh: mulai dari tengah/);
  assert.match(SOURCE, /Koreksi kalau meleset/);
  assert.match(SOURCE, /summaryFocusHint/);
});
