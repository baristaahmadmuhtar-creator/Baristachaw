import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const panelPath = new URL('../../apps/web/src/features/ai-brew/AiBrewPanel.tsx', import.meta.url);
const constantsPath = new URL('../../apps/web/src/constants.ts', import.meta.url);
const onboardingPath = new URL('../../apps/web/src/components/onboarding/FirstRunOnboarding.tsx', import.meta.url);
const appPath = new URL('../../apps/web/src/App.tsx', import.meta.url);

test('AI Brew removes annotated filler copy and keeps professional tools subtitle', async () => {
  const [panel, constants] = await Promise.all([
    readFile(panelPath, 'utf8'),
    readFile(constantsPath, 'utf8'),
  ]);

  const removedCopy = [
    'AI Brew dulu, lalu timer, analisis rasio, dan tugas giliran dalam satu ruang kerja.',
    'Rencana lanjutan',
    'AI hanya dipakai saat kamu menekan tombol asisten.',
    'Data label/lab langsung',
    'Belum ada penyesuaian profil kopi yang aktif.',
    'Panas/Es dipilih setelah alat seduh.',
    'Profil Target:',
    'Timer dan langkah aktif tetap di atas.',
    'Siap mulai seduh',
    'AI opsional. Pakai hanya untuk penjelasan atau koreksi rasa singkat.',
    'metode otomatis dari profil alat.',
    'Edit input',
    'Edit inputs',
  ];

  for (const copy of removedCopy) {
    assert.doesNotMatch(panel, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(
    constants,
    /toolsSubtitle:\s*'Rancang resep, ikuti panduan seduh, gunakan timer, dan evaluasi hasil dalam satu ruang kerja\.'/,
  );
});

test('AI Brew annotated result cleanup and preset guard are wired', async () => {
  const panel = await readFile(panelPath, 'utf8');

  assert.doesNotMatch(panel, /data-testid="ai-brew-edit-inputs"/);
  assert.doesNotMatch(panel, /data-testid="ai-brew-result-action-edit"/);
  assert.match(panel, /data-testid="ai-brew-prediction-precision"/);
  assert.match(panel, /data-testid="ai-brew-target-compare-toggle"/);
  assert.match(panel, /data-testid="ai-brew-preset-change-confirm"/);
  assert.match(panel, /data-testid="ai-brew-brew-mode-status"/);
  assert.match(panel, /data-testid="ai-brew-ice-accent"/);
  assert.match(panel, /data-testid="ai-brew-aeropress-bypass-guide"/);
  assert.match(panel, /Tahap bypass: setelah menekan, tambahkan/);
  assert.match(panel, /Bypass step: after pressing, add/);
  assert.match(panel, /Add brew water for an aromatic concentrate/);
});

test('first-run onboarding is mounted and covers language plus equipment preferences', async () => {
  const [onboarding, app] = await Promise.all([
    readFile(onboardingPath, 'utf8'),
    readFile(appPath, 'utf8'),
  ]);

  assert.match(app, /<FirstRunOnboarding\s*\/>/);
  assert.match(onboarding, /data-testid="first-run-onboarding"/);
  assert.match(onboarding, /data-testid="onboarding-language-step"/);
  assert.match(onboarding, /data-testid="onboarding-equipment-step"/);
  assert.match(onboarding, /data-testid="onboarding-skip-equipment"/);
  assert.match(onboarding, /submitCatalogSuggestion/);
});
