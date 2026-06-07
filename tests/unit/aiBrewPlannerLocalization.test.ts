import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAiBrewPlan,
  buildPlanRecipeDescription,
  buildPlanRecipeIngredients,
  buildPlanRecipeName,
  buildPlanRecipeSteps,
  createDefaultAiBrewFormState,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import {
  localizeAiBrewDynamicText,
  localizeAiBrewStepLabel,
  localizeAiBrewSummary,
  validateLocalizedAiBrewCopy,
} from '../../apps/web/src/features/ai-brew/localization.ts';
import { buildProductionAiBrewCatalogForStress } from '../helpers/aiBrewStressMatrix.ts';

const mockPlan: any = {
  coffeeName: '',
  targetProfileLabel: 'Lebih Manis',
  dripper: { name: 'V60' },
  grinder: { name: 'Comandante' },
  brewMode: 'hot',
  methodFamily: 'v60',
  iceMl: 80,
  hotWaterMl: 220,
  finalBeverageRatio: 20,
  hotExtractionRatio: 14.67,
  recommendedRatio: 15,
  waterTempC: 93,
  totalTimeSeconds: 180,
  extractionEndSeconds: 180,
  waterBrandLabel: 'Aqua',
  waterCustomized: true,
  summary: 'Resep ringkas.',
  steps: [
    { label: 'Bloom', startSeconds: 0, pourVolumeMl: 60, targetVolumeMl: 60, note: 'Aduk pelan.' },
  ],
  doseG: 15,
  totalWaterMl: 300,
  waterMinerals: {
    tdsPpm: 90,
    hardnessPpm: 50,
    alkalinityPpm: 40,
  },
};

test('ai brew recipe copy switches to indonesian when locale=id', () => {
  const name = buildPlanRecipeName(mockPlan, 'id');
  const description = buildPlanRecipeDescription(mockPlan, 'id');
  const steps = buildPlanRecipeSteps(mockPlan, 'id');
  const ingredients = buildPlanRecipeIngredients(mockPlan, 'id');

  assert.match(name, /AI Seduh|Lebih Manis/);
  assert.match(description, /Perangkat:/);
  assert.match(description, /Air:/);
  assert.match(steps[0], /tuang/);
  assert.equal(ingredients[0].name, 'Kopi');
  assert.equal(ingredients[1].name, 'Total air akhir');
  assert.equal(ingredients[2].name, 'Air panas seduh');
  assert.equal(ingredients[3].name, 'Sumber air');
  assert.equal(ingredients[4].name, 'Mineral air');
  assert.equal(ingredients[5].name, 'Es');
});

test('AI Brew localized summaries use clean temperature text and no encoding artifacts', () => {
  const idSummary = localizeAiBrewSummary(mockPlan, 'id');
  const enSummary = localizeAiBrewSummary(mockPlan, 'en');

  assert.match(idSummary, /93°C|93 C/);
  assert.match(enSummary, /93°C|93 C/);
  assert.match(idSummary, /^Rencana\b/);
  assert.doesNotMatch(idSummary, /\bPlan\b/);
  assert.doesNotMatch(`${idSummary} ${enSummary}`, /\u00c2|\u00c3|â€|�/);
  assert.doesNotMatch(idSummary, /\b(hot drawdown finish|extraction time|this coffee)\b/i);
  assert.doesNotMatch(enSummary, /\b(seduh|air turun|kopi ini)\b/i);
});

test('AI Brew English dynamic copy translates complete Indonesian grinder warnings', () => {
  const cases = [
    [
      'Acuan grinder menurunkan keyakinan; validasi dari waktu ekstraksi dan rasa.',
      'The grinder reference has lower confidence; validate it against brew time and taste.',
    ],
    [
      'Setelan grinder masih estimasi/fallback; kalibrasi dari waktu ekstraksi dan rasa.',
      'The grinder setting is still an estimate; calibrate it against brew time and taste.',
    ],
    [
      'Setelan grinder memakai baseline metode; kalibrasi titik nol dan rasa sebelum dianggap presisi.',
      'The grinder setting uses a method baseline; calibrate the zero point and taste before treating it as precise.',
    ],
    [
      'Espresso dengan acuan grinder pengganti atau grinder yang belum terverifikasi hanya boleh dipakai sebagai titik awal kalibrasi, bukan prediksi ekstraksi yang pasti.',
      'For espresso, a fallback or unverified grinder reference is only a calibration starting point, not a guaranteed extraction prediction.',
    ],
  ] as const;

  for (const [source, expected] of cases) {
    const localized = localizeAiBrewDynamicText(source, 'en');
    assert.equal(localized, expected);
    assert.doesNotMatch(localized, /\b(acuan|menurunkan|keyakinan|validasi|waktu|ekstraksi|rasa|setelan|masih|kalibrasi|belum|hanya|dipakai)\b/i);
  }
});

test('AI Brew English workflow labels cover every method-specific operational phase', () => {
  const labels = [
    'Aduk batch',
    'Air naik',
    'Balikkan aman',
    'Berhenti di target hasil',
    'Berhenti sebelum sputter',
    'Bypass terukur',
    'Distribusi dan tamp',
    'Dose per liter',
    'Isi boiler',
    'Kontak atas',
    'Masukkan kopi dan aduk',
    'Matikan panas dan air turun',
    'Mulai ekstraksi',
    'Panas sedang',
    'Panaskan air',
    'Pantau aliran',
    'Prep basket',
    'Ratakan basket',
    'Siklus mesin',
  ];
  const localized = labels.map((label) => localizeAiBrewStepLabel(label, 'en')).join(' ');

  assert.doesNotMatch(
    localized,
    /\b(aduk|air naik|balikkan|berhenti|hasil|sebelum|bypass terukur|distribusi|isi|kontak|masukkan|matikan|mulai|panas|panaskan|pantau|ratakan|siklus|mesin)\b/i,
  );
});

test('AI Brew Indonesian dynamic copy polishes avoidable raw English brewing terms', () => {
  const raw = [
    'Put measured ice in the server, wet the coffee bed, and keep the slurry calm during drawdown.',
    'Use short pulses and avoid flooding the flat bed before service.',
    'Extend steep contact time before release, then stir server 5-8 seconds.',
  ].map((item) => localizeAiBrewDynamicText(item, 'id')).join(' ');

  assert.doesNotMatch(raw, /\b(server|coffee bed|bed|slurry|drawdown|flooding|steep|contact time|release|service)\b/i);
  assert.match(raw, /wadah saji/);
  assert.match(raw, /hamparan kopi|hamparan flat-bottom/);
  assert.match(raw, /campuran kopi/);
  assert.match(raw, /air turun/);
});

test('AI Brew Indonesian dynamic copy remains idempotent and never repeats translated nouns', () => {
  const localized = [
    'Ratakan bed kopi sebelum tuangan pertama.',
    'Pastikan flutes lekukan Origami terpasang rapi.',
    'Saring dengan mesh saringan sebelum filter kertas.',
  ].map((item) => localizeAiBrewDynamicText(item, 'id')).join(' ');

  assert.doesNotMatch(localized, /\b([\p{L}]{2,})\s+\1\b/iu);
  assert.match(localized, /Ratakan hamparan kopi sebelum tuangan pertama\./);
  assert.match(localized, /lekukan Origami/);
  assert.match(localized, /saringan sebelum filter kertas/);
});

test('AI Brew Indonesian copy normalizes avoidable equipment and grind terms idempotently', () => {
  const source = [
    'Align the triple fold with the spout and use a medium-coarse grind.',
    'Set the upper bowl over the lower bowl with a fine-medium grind.',
    'Load bleached paper in the spray head brewer.',
    'Use the exact flow rate cue and collect feedback after the contact time.',
    'Use a medium grind for the next cup.',
  ].join(' ');
  const once = localizeAiBrewDynamicText(source, 'id');
  const twice = localizeAiBrewDynamicText(once, 'id');

  assert.equal(twice, once);
  assert.match(once, /cerat/);
  assert.match(once, /tabung bawah|wadah bawah/);
  assert.match(once, /sedang cenderung kasar/);
  assert.match(once, /halus cenderung sedang|sedang cenderung halus/);
  assert.match(once, /filter kertas putih/);
  assert.match(once, /laju aliran|laju tuang/);
  assert.match(once, /petunjuk/);
  assert.match(once, /evaluasi rasa/);
  assert.match(once, /waktu kontak/);
  assert.match(once, /gilingan sedang/);
  assert.doesNotMatch(
    once,
    /\b(spout|bowl|bleached|medium-coarse|fine-medium|cue|feedback|flow rate|contact time)\b|\bgilingan medium\b/i,
  );
});

test('localized AI Brew copy validator rejects leakage, placeholders, duplication, and wrong-method terms', () => {
  const safeId = validateLocalizedAiBrewCopy({
    text: 'Tuang perlahan hingga seluruh bubuk basah merata.',
    language: 'id',
    methodFamily: 'v60',
    surface: 'tutorial',
  });
  assert.equal(safeId.valid, true);

  const brokenId = validateLocalizedAiBrewCopy({
    text: 'Stir dua times saja lalu tunggu undefined.',
    language: 'id',
    methodFamily: 'aeropress',
    surface: 'guide',
  });
  assert.equal(brokenId.valid, false);
  assert.match(brokenId.safeText, /disederhanakan|disesuaikan/i);
  assert.doesNotMatch(brokenId.safeText, /\b(stir|undefined)\b/i);

  const brokenEn = validateLocalizedAiBrewCopy({
    text: 'Aduk perlahan, then press $1 seconds.',
    language: 'en',
    methodFamily: 'aeropress',
    surface: 'guide',
  });
  assert.equal(brokenEn.valid, false);
  assert.match(brokenEn.safeText, /adjusted|simplified/i);
  assert.doesNotMatch(brokenEn.safeText, /\b(aduk|\$1)\b/i);

  const wrongMethod = validateLocalizedAiBrewCopy({
    text: 'Biarkan drawdown selesai sebelum French Press disajikan.',
    language: 'id',
    methodFamily: 'french_press',
    surface: 'tutorial',
  });
  assert.equal(wrongMethod.valid, false);
});

test('AI Brew Indonesian legacy dripper tutorials do not leak English sentence fragments', () => {
  const rawTutorials = [
    'Pour 50% circular and 50% center water. Wet grounds evenly and let bloom for 35 seconds to allow gas escape.',
    'Swirl the chilled coffee to melt the remaining ice, ensuring a rich, non-watery cold pour-over.',
    'Wet the trapezoidal coffee bed evenly. Because the wedge bottom is narrow, ensure all dry corners in the bottom fold are wet. Bloom 35 seconds.',
    'Pour in an oval pattern. Wet all grounds and let bloom for 40 seconds.',
    'Swirl the chilled coffee to melt the remaining ice, ensuring a rich, non-watery cold trapezoid pour-over.',
    'Pour rapidly in the center. Stir gently 3 times with a spoon to agitate all grounds. Let bloom for 35 seconds.',
  ];
  const localized = rawTutorials.map((item) => localizeAiBrewDynamicText(item, 'id')).join(' ');

  assert.doesNotMatch(localized, /\b(?:and|let|seconds|cold|wedge|stir|grounds)\b/i);
  assert.doesNotMatch(localized, /\.\s+[a-zà-öø-ÿ]/u);
  assert.match(localized, /Biarkan blooming 35 detik/);
  assert.match(localized, /seduhan pour-over dingin/);
});

test('AI Brew visible result copy stays clean in English and Indonesian across every method family', () => {
  const catalog = buildProductionAiBrewCatalogForStress();
  const methodFamilies = [
    'v60',
    'chemex',
    'kalita_wave',
    'origami',
    'april',
    'melitta',
    'kono',
    'hario_switch',
    'clever_dripper',
    'aeropress',
    'french_press',
    'espresso',
    'moka_pot',
    'siphon',
    'cold_brew',
    'batch_brew',
  ] as const;
  const firstVisibleGrinder = catalog.grinders.find((grinder) => !grinder.hidden);
  assert.ok(firstVisibleGrinder, 'a visible grinder is required for bilingual result coverage');

  for (const methodFamily of methodFamilies) {
    const dripper = catalog.drippers.find((item) => (
      !item.hidden
      && !item.deprecated
      && item.methodFamily === methodFamily
    ));
    assert.ok(dripper, `${methodFamily} requires a visible brewer`);

    const plan = buildAiBrewPlan({
      ...createDefaultAiBrewFormState(catalog),
      coffeeName: 'QA Natural Catuai',
      dripperId: dripper.id,
      grinderId: firstVisibleGrinder.id,
      process: 'natural',
      variety: 'red catuai',
      roastLevel: 'medium_light',
      waterMode: 'manual',
      waterTdsPpm: '130',
      waterHardnessPpm: '62.9',
      waterAlkalinityPpm: '60.7',
    }, catalog);

    const visibleSourceText = [
      plan.summary,
      plan.grindRecommendation,
      plan.grindBandLabel,
      plan.grindSettingReference,
      ...plan.warnings,
      ...plan.confidenceNotes,
      ...plan.guardrails.errors,
      ...plan.guardrails.warnings,
      ...(plan.extractionRationale?.warnings || []),
      ...(plan.extractionRationale?.items || []).flatMap((item) => [item.label, item.value, item.detail]),
      ...(plan.expectedCupProfile?.warnings || []),
      ...(plan.expectedCupProfile?.reasons || []),
      ...(plan.beanCoverage?.warnings || []),
      ...(plan.beanCoverage?.reasons || []),
    ].filter((value): value is string => typeof value === 'string');

    for (const language of ['en', 'id'] as const) {
      const localized = [
        localizeAiBrewSummary(plan, language),
        ...visibleSourceText.map((value) => localizeAiBrewDynamicText(value, language)),
      ].join(' ');

      assert.doesNotMatch(localized, /\b([\p{L}]{2,})\s+\1\b/iu, `${methodFamily}/${language} repeats user-facing words`);
      assert.doesNotMatch(localized, /[\u00c2\u00c3\uFFFD]|â€|Â°/u, `${methodFamily}/${language} contains broken encoding`);
      assert.doesNotMatch(localized, /\$(?:\d+|\{)|\b(?:undefined|null|NaN|ActionAction|Pressgentle|Stophiss)\b/i);

      if (language === 'en') {
        assert.doesNotMatch(
          localized,
          /\b(tuang|seduh|sajikan|katup|bubuk|jangan|aduk|rendam|tekan|endapkan|bilas|gilingan|suhu|rasa|panduan|keyakinan|acuan|validasi|waktu|ekstraksi|setelan|kalibrasi)\b|air turun/i,
          `${methodFamily}/en leaks Indonesian`,
        );
      }
    }
  }
});

