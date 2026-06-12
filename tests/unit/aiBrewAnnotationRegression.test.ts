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

test('first-run onboarding uses BaristaChaw logo and custom equipment pickers', async () => {
  const onboarding = await readFile(onboardingPath, 'utf8');

  assert.match(onboarding, /src="\/icons\/icon-192\.png"/);
  assert.match(onboarding, /data-testid="onboarding-logo"/);
  assert.match(onboarding, /data-testid="onboarding-language-logo"/);
  assert.doesNotMatch(onboarding, /<Languages\b/);
  assert.doesNotMatch(onboarding, /<select\b/);
  assert.match(onboarding, /data-testid="onboarding-dripper-picker"/);
  assert.match(onboarding, /data-testid="onboarding-grinder-picker"/);
  assert.match(onboarding, /favoriteFirstEquipment/);
  assert.match(onboarding, /Alat seduh tidak ada\? Tulis model alat seduh Anda/);
  assert.match(onboarding, /Grinder tidak ada\? Tulis model grinder Anda/);
  assert.match(onboarding, /Brewer not listed\? Enter your brewer model/);
  assert.match(onboarding, /Grinder not listed\? Enter your grinder model/);
});

test('AI Brew result exposes physical real-brew log capture separately from prediction', async () => {
  const panel = await readFile(panelPath, 'utf8');

  assert.match(panel, /buildRealBrewLogEntry/);
  assert.match(panel, /saveRealBrewLogEntry/);
  assert.match(panel, /testId="ai-brew-real-brew-log"/);
  assert.match(panel, /data-testid="ai-brew-real-output"/);
  assert.match(panel, /data-testid="ai-brew-real-sensory"/);
  assert.match(panel, /Record physical brew evidence separately from software prediction/);
  assert.match(panel, /Catat bukti seduh fisik terpisah dari prediksi software/);
});

test('AI Brew Advanced Brew exposes grinder calibration profile fields', async () => {
  const panel = await readFile(panelPath, 'utf8');

  assert.match(panel, /BARISTACHAW_GRINDER_CALIBRATION_V1/);
  assert.match(panel, /data-testid="ai-brew-grinder-calibration"/);
  assert.match(panel, /data-testid="ai-brew-grinder-zero-point"/);
  assert.match(panel, /data-testid="ai-brew-grinder-burr-offset"/);
  assert.match(panel, /data-testid="ai-brew-grinder-drawdown"/);
  assert.match(panel, /data-testid="ai-brew-grinder-taste-correction"/);
  assert.match(panel, /This only upgrades confidence when complete/);
  assert.match(panel, /hanya menaikkan confidence jika lengkap/);
});

test('AI Brew water chemistry labels include practical mineral units', async () => {
  const panel = await readFile(panelPath, 'utf8');

  assert.match(panel, /TDS \$\{plan\.waterMinerals\.tdsPpm\} ppm/);
  assert.match(panel, /GH \$\{plan\.waterMinerals\.hardnessPpm\} ppm as CaCO3/);
  assert.match(panel, /KH \$\{plan\.waterMinerals\.alkalinityPpm\} ppm as CaCO3/);
  assert.match(panel, /TDS \$\{profile\.tdsPpm\} ppm/);
});
