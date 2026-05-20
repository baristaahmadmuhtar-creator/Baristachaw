import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const SOURCE = readFileSync('apps/web/src/features/ai-brew/AiBrewPanel.tsx', 'utf8');
const AI_ACCESS_GATE_SOURCE = readFileSync('apps/web/src/components/billing/AiAccessGate.tsx', 'utf8');
const BOTTOM_NAV_SOURCE = readFileSync('apps/web/src/components/BottomNav.tsx', 'utf8');

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
  assert.match(SOURCE, /Detail kopi tetap opsional; hasil ini masih baseline/);
  assert.doesNotMatch(SOURCE, /Biarkan Auto untuk hasil aman/);
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
  assert.match(SOURCE, /setGuideDensity\('basic'\)/);
  assert.match(SOURCE, /\{ id: 'details', label: copy\.detailTab \}/);
});

test('AI Brew Brew Guide has Lite and Pro modes with Lite as the safe default', () => {
  assert.match(SOURCE, /guideDensitySimple: 'Lite'/);
  assert.match(SOURCE, /guideDensityPro: 'Pro'/);
  assert.match(SOURCE, /guideDensitySimpleHint: 'Focused timer and current step\.'/);
  assert.match(SOURCE, /guideDensityProHint: 'Full brew guide with barista detail\.'/);
  assert.match(SOURCE, /data-testid="ai-brew-lite-guide-panel"/);
  assert.match(SOURCE, /ai-brew-lite-progress-ring/);
  assert.match(SOURCE, /data-testid="ai-brew-lite-next-step"/);
  assert.match(SOURCE, /Pakai timbangan asli/);
  assert.match(SOURCE, /Use your real scale/);
  assert.match(SOURCE, /setGuideDensity\('basic'\)/);
});

test('AI Brew Pro keeps advanced AI tools collapsed and no AI auto-run', () => {
  assert.match(SOURCE, /primaryAiAssistActions/);
  assert.match(SOURCE, /advancedAiAssistActions/);
  assert.match(SOURCE, /<details className="group mt-3 rounded-xl/);
  assert.doesNotMatch(SOURCE, /useEffect\(\(\) => \{\s*onRunAiCoach/s);
});

test('AI Brew Indonesian release copy localizes critical trust and safety labels', () => {
  for (const copy of [
    'Data kopi lengkap',
    'Data kopi sebagian',
    'Data kopi belum lengkap',
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
    'Setelah ekstraksi',
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
  assert.match(SOURCE, /Alat AI lainnya/);
});

test('AI Brew exposes explicit mobile time semantics instead of one misleading total', () => {
  assert.match(SOURCE, /getPlanExtractionSeconds/);
  assert.match(SOURCE, /getPlanGuideEndSeconds/);
  assert.match(SOURCE, /getPlanPostExtractionSeconds/);
  assert.match(SOURCE, /getPlanTimerSeconds/);
  assert.match(SOURCE, /data-testid="ai-brew-time-semantics"/);
  assert.doesNotMatch(SOURCE, /data-testid="ai-brew-time-helper"/);
  assert.match(SOURCE, /extractionTimeLabel/);
  assert.doesNotMatch(SOURCE, /guideEndLabel/);
  assert.match(SOURCE, /flowStepRemaining/);
  assert.match(SOURCE, /flowTotalRemaining/);
  assert.match(SOURCE, /flowNextPour/);
  assert.match(SOURCE, /data-testid="ai-brew-flow-remaining-status"/);
  assert.match(SOURCE, /data-testid="ai-brew-flow-timer-panel"/);
  assert.match(SOURCE, /data-testid="ai-brew-flow-current-card"/);
});

test('AI Brew public timing copy and timer handoff use extraction time, not guide finish time', () => {
  assert.match(SOURCE, /getPlanTimerSeconds/);
  assert.doesNotMatch(SOURCE, /panduan selesai \$\{guideTime\}/i);
  assert.doesNotMatch(SOURCE, /guide done \$\{guideTime\}/i);
  assert.doesNotMatch(SOURCE, /onUseInTimer\(plan\.totalTimeSeconds\)/);
  assert.doesNotMatch(SOURCE, /flowProgressSeconds = Math\.min\(plan\.totalTimeSeconds/);
  assert.match(SOURCE, /flowProgressSeconds = Math\.min\(timerTargetSeconds/);
});

test('AI Brew shows main recipe time and completion time as separate public metrics', () => {
  assert.match(SOURCE, /getPlanGuideEndSeconds/);
  assert.match(SOURCE, /completionTimeLabel/);
  assert.match(SOURCE, /completionTimeItem/);
  assert.match(SOURCE, /Selesai/);
  assert.match(SOURCE, /Complete/);
  assert.match(SOURCE, /summaryHighlightItemsWithCompletion/);
});

test('AI Brew pour-over timing labels drawdown finish instead of generic extraction', () => {
  assert.match(SOURCE, /AI_BREW_POUR_CONTROL_FAMILIES\.has\(plan\.methodFamily\)/);
  assert.match(SOURCE, /Air turun selesai/);
  assert.match(SOURCE, /Drawdown finish/);
  assert.match(SOURCE, /bukan waktu sajikan/);
});

test('AI Brew guide details stay deduped and barista-actionable', () => {
  assert.match(SOURCE, /normalizeAiBrewDetailKey/);
  assert.match(SOURCE, /isAiBrewDetailCovered/);
  assert.match(SOURCE, /points\.slice\(0, 1\)/);
  assert.match(SOURCE, /Tuang rendah dan stabil dari tengah ke tengah-luar/);
  assert.match(SOURCE, /Siapkan filter rata/);
  assert.match(SOURCE, /buildAiBrewWorkflowControlDetail/);
  assert.match(SOURCE, /buildAiBrewBeanContextDetail/);
  assert.doesNotMatch(SOURCE, /buildAiBrewTargetCorrectionDetail/);
  assert.doesNotMatch(SOURCE, /Koreksi manis:/);
  assert.doesNotMatch(SOURCE, /copy\.summaryFocusHint/);
});

test('AI Brew pickers keep catalog metadata out of user-facing choice rows', () => {
  assert.match(SOURCE, /function buildProcessPickerOptions/);
  assert.match(SOURCE, /function buildVarietyPickerOptions/);
  assert.match(SOURCE, /function buildWaterPickerSubtitle/);
  assert.doesNotMatch(SOURCE, /subtitle: `\$\{copy\.processGroup\}/);
  assert.doesNotMatch(SOURCE, /subtitle: `\$\{copy\.varietyGroup\}/);
  assert.doesNotMatch(SOURCE, /description: entry\.originNotes/);
  assert.doesNotMatch(SOURCE, /description: entry\.notes\[0\]/);
  assert.match(SOURCE, /badges: \[\]/);
  assert.match(SOURCE, /badges: buildWaterFactBadges\(item, copy\)/);
  assert.doesNotMatch(SOURCE, /grinderReference \?/);
  assert.doesNotMatch(SOURCE, /return `\$\{status\} - \$\{minerals\}`/);
});

test('AI Brew quick Seduh tab stays timer-first without duplicate process list', () => {
  assert.match(SOURCE, /!isQuickResult && \(/);
  assert.match(SOURCE, /data-testid="ai-brew-sequence-section"/);
  assert.match(SOURCE, /flowNextPourValue/);
  assert.match(SOURCE, /copy\.flowNextPour/);
});

test('AI Brew result metrics use one consistent production order', () => {
  assert.match(SOURCE, /buildAiBrewCoreMetricItems/);
  assert.match(SOURCE, /id: 'dose'/);
  assert.match(SOURCE, /id: 'water'/);
  assert.match(SOURCE, /id: 'ratio'/);
  assert.match(SOURCE, /id: 'temp'/);
  assert.match(SOURCE, /id: 'grind'/);
  assert.match(SOURCE, /id: 'extraction'/);
  assert.doesNotMatch(SOURCE, /actionPrioritiesTitle: 'Mulai dari sini'/);
});

test('AI Brew fullscreen builders can suppress the mobile bottom nav in iOS PWA', () => {
  assert.match(SOURCE, /data-ai-brew-modal-open/);
  assert.match(BOTTOM_NAV_SOURCE, /readBottomNavSuppressedFromRoot/);
  assert.match(BOTTOM_NAV_SOURCE, /MutationObserver/);
  assert.match(BOTTOM_NAV_SOURCE, /bottomNavSuppressed/);
});

test('AI Brew quick water summary hides raw mineral chemistry', () => {
  assert.match(SOURCE, /isPro \? \(\s*<p className="mt-1 text-xs text-secondary">\{buildWaterChemistryLabel\(selectedWaterBrand, language\)\}<\/p>\s*\) : null/);
});

test('AI access gate refresh has a visible sync state', () => {
  assert.match(AI_ACCESS_GATE_SOURCE, /refreshBusy/);
  assert.match(AI_ACCESS_GATE_SOURCE, /aria-busy=\{refreshBusy\}/);
  assert.match(AI_ACCESS_GATE_SOURCE, /className=\{refreshBusy \? 'animate-spin' : undefined\}/);
  assert.match(AI_ACCESS_GATE_SOURCE, /await refreshAccountStatus\(\)/);
});
