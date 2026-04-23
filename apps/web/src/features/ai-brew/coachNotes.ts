import type { BrewPlan } from './types';
import {
  formatAiBrewTime,
  isIndonesianAiBrewLanguage,
  localizeAiBrewSummary,
  localizeAiBrewTargetProfile,
} from './localization.ts';
import { buildExtractionFinisher } from './extractionFinisher.ts';

export type DeterministicAiCoachMode = 'explain' | 'troubleshoot' | 'adjust';

function getMethodFamilyServiceCue(plan: BrewPlan, language?: string) {
  if (isIndonesianAiBrewLanguage(language)) {
    switch (plan.methodFamily) {
      case 'chemex':
        return 'Kunci service pattern ada di flow yang tetap terbuka lewat kertas tebal; jangan dorong dinding filter.';
      case 'clever_dripper':
        return 'Kunci service pattern ada di steep yang tenang lalu release yang bersih; jangan mengejar turbulensi setelah charge.';
      case 'april':
        return 'Kunci service pattern ada di pulse pendek, reset cepat, dan agitasi rendah dari awal sampai akhir.';
      case 'kalita_wave':
        return 'Kunci service pattern ada di bed yang rata dan fase tengah yang stabil, bukan spiral besar.';
      case 'melitta':
        return 'Kunci service pattern ada di bed trapezoid yang level dan measured dari bloom sampai finish.';
      case 'kono':
        return 'Kunci service pattern ada di jalur tuang yang lebih terpusat untuk menjaga sweet contact di tengah.';
      case 'origami':
        return 'Kunci service pattern ada di pulse yang ringkas dan flow cone yang cepat tetapi tetap terkendali.';
      case 'v60':
      default:
        return 'Kunci service pattern ada di aliran center-to-mid yang bersih dengan dinding filter tetap tenang.';
    }
  }

  switch (plan.methodFamily) {
    case 'chemex':
      return 'The service pattern depends on keeping flow open through the thick filter; do not drive the brew against the paper wall.';
    case 'clever_dripper':
      return 'The service pattern depends on calm steeping and a clean release; do not chase turbulence after the charge.';
    case 'april':
      return 'The service pattern depends on short pulses, quick resets, and low agitation from start to finish.';
    case 'kalita_wave':
      return 'The service pattern depends on a level bed and a stable middle phase, not on dramatic spirals.';
    case 'melitta':
      return 'The service pattern depends on a level trapezoid bed and measured pours from bloom to finish.';
    case 'kono':
      return 'The service pattern depends on a tighter centered pour path to protect the sweeter middle contact.';
    case 'origami':
      return 'The service pattern depends on compact pulses and fast cone flow that still stays controlled.';
    case 'v60':
    default:
      return 'The service pattern depends on a clean center-to-mid stream with quiet filter walls.';
  }
}

function getBrewModeDialInCue(plan: BrewPlan, language?: string) {
  if (isIndonesianAiBrewLanguage(language)) {
    return plan.brewMode === 'iced'
      ? `Jangan ubah split ${plan.hotWaterMl} ml panas / ${plan.iceMl} ml es bersamaan dengan grind di ronde yang sama.`
      : `Jangan ubah suhu ${plan.waterTempC}°C dan grind bersamaan dalam satu ronde cupping.`;
  }
  return plan.brewMode === 'iced'
    ? `Do not change the ${plan.hotWaterMl} ml hot / ${plan.iceMl} ml ice split in the same round as the grind.`
    : `Do not change ${plan.waterTempC}°C water and the grind in the same cupping round.`;
}

function getBrighterShift(plan: BrewPlan, language?: string) {
  if (isIndonesianAiBrewLanguage(language)) {
    switch (plan.methodFamily) {
      case 'clever_dripper':
        return 'Lepas 10 detik lebih cepat atau geser grind 0.5 step lebih kasar sambil mempertahankan rasio.';
      case 'chemex':
        return 'Geser grind 0.5 step lebih kasar dan jaga build pour tetap jauh dari dinding filter.';
      case 'april':
        return 'Pendekkan pulse sedikit dan jaga jeda tetap singkat agar finish terasa lebih terbuka.';
      case 'kalita_wave':
      case 'melitta':
        return 'Geser grind 0.5 step lebih kasar dan kurangi beban fase tengah sedikit tanpa membuat bed miring.';
      case 'kono':
        return 'Buka jalur tuang sedikit lebih lebar di fase akhir atau geser grind 0.5 step lebih kasar.';
      case 'origami':
      case 'v60':
      default:
        return 'Geser grind 0.5 step lebih kasar dan buat fase akhir sedikit lebih ringan tanpa memburu dinding filter.';
    }
  }

  switch (plan.methodFamily) {
    case 'clever_dripper':
      return 'Release about 10 seconds earlier or move the grind 0.5 step coarser while keeping the same ratio.';
    case 'chemex':
      return 'Move the grind 0.5 step coarser and keep the build pour away from the filter wall.';
    case 'april':
      return 'Shorten the pulses slightly and keep the resets quick so the finish opens up.';
    case 'kalita_wave':
    case 'melitta':
      return 'Move the grind 0.5 step coarser and lighten the middle load slightly without tilting the bed.';
    case 'kono':
      return 'Open the pour path a little wider in the finish or move the grind 0.5 step coarser.';
    case 'origami':
    case 'v60':
    default:
      return 'Move the grind 0.5 step coarser and make the finish slightly lighter without chasing the filter wall.';
  }
}

function getSweeterShift(plan: BrewPlan, language?: string) {
  if (isIndonesianAiBrewLanguage(language)) {
    switch (plan.methodFamily) {
      case 'clever_dripper':
        return 'Tambah steep 10 detik sebelum release sambil mempertahankan air dan rasio yang sama.';
      case 'chemex':
        return 'Geser grind 0.5 step lebih halus atau naikkan suhu 1°C jika bloom sudah stabil.';
      case 'april':
        return 'Biarkan pulse tengah membawa sedikit volume lebih besar tanpa menambah swirl.';
      case 'kalita_wave':
      case 'melitta':
        return 'Geser sedikit lebih banyak air ke fase tengah sambil menjaga bed tetap rata.';
      case 'kono':
        return 'Pertahankan jalur tuang lebih terpusat sedikit lebih lama di tengah untuk memperpanjang sweet contact.';
      case 'origami':
      case 'v60':
      default:
        return 'Geser grind 0.5 step lebih halus atau buat fase tengah sedikit lebih penuh tanpa menambah bypass.';
    }
  }

  switch (plan.methodFamily) {
    case 'clever_dripper':
      return 'Add about 10 seconds of steep before release while keeping the same water and ratio.';
    case 'chemex':
      return 'Move the grind 0.5 step finer or raise water temperature by 1°C if the bloom is already stable.';
    case 'april':
      return 'Let the middle pulse carry slightly more volume without adding swirl.';
    case 'kalita_wave':
    case 'melitta':
      return 'Shift a little more water into the middle phase while keeping the bed level.';
    case 'kono':
      return 'Hold the pour path tighter in the center for a little longer through the middle to extend sweet contact.';
    case 'origami':
    case 'v60':
    default:
      return 'Move the grind 0.5 step finer or make the middle phase slightly fuller without adding bypass.';
  }
}

function getTighterShift(plan: BrewPlan, language?: string) {
  if (isIndonesianAiBrewLanguage(language)) {
    switch (plan.methodFamily) {
      case 'clever_dripper':
        return 'Perketat rasio 0.3 lalu tahan steep dan release tetap sama untuk satu seduhan uji.';
      case 'chemex':
        return 'Perketat rasio 0.3 sampai 0.5 dan biarkan build pour tetap stabil di tengah.';
      case 'april':
        return 'Perketat rasio 0.3 dan jaga pulse tetap pendek, bukan lebih agresif.';
      case 'kalita_wave':
      case 'melitta':
        return 'Perketat rasio 0.3 atau naikkan beban fase tengah sedikit sambil menjaga bed tetap rata.';
      case 'kono':
        return 'Perketat rasio 0.3 dan pertahankan jalur tuang yang lebih terpusat di tengah.';
      case 'origami':
      case 'v60':
      default:
        return 'Perketat rasio 0.3 sampai 0.5 dan pertahankan flow akhir tetap tenang.';
    }
  }

  switch (plan.methodFamily) {
    case 'clever_dripper':
      return 'Tighten the ratio by 0.3, then keep the same steep and release for one test brew.';
    case 'chemex':
      return 'Tighten the ratio by 0.3 to 0.5 and keep the build pour steady through the middle.';
    case 'april':
      return 'Tighten the ratio by 0.3 and keep the pulses short rather than more aggressive.';
    case 'kalita_wave':
    case 'melitta':
      return 'Tighten the ratio by 0.3 or load the middle phase slightly more while keeping the bed level.';
    case 'kono':
      return 'Tighten the ratio by 0.3 and keep the pour path more centered through the middle.';
    case 'origami':
    case 'v60':
    default:
      return 'Tighten the ratio by 0.3 to 0.5 and keep the finish calm.';
  }
}

export function buildDeterministicAiCoachMarkdown(plan: BrewPlan, mode: DeterministicAiCoachMode, language?: string) {
  const finisher = buildExtractionFinisher(plan, language);
  const summary = localizeAiBrewSummary(plan, language);
  const localizedTarget = localizeAiBrewTargetProfile(plan.targetProfileId, plan.targetProfileLabel, language);

  if (mode === 'troubleshoot') {
    const sour = finisher.adjustments.find((item) => item.taste === 'sour');
    const bitter = finisher.adjustments.find((item) => item.taste === 'bitter');
    const thin = finisher.adjustments.find((item) => item.taste === 'thin');
    if (isIndonesianAiBrewLanguage(language)) {
      return [
        '## Watchpoint',
        ...finisher.controlPoints.map((item) => `- ${item}`),
        `- ${getBrewModeDialInCue(plan, language)}`,
        '',
        '## Jika Asam',
        `- Langkah pertama: ${sour?.action || '-'}`,
        `- Kenapa: ${sour?.why || '-'}`,
        '',
        '## Jika Pahit / Kering',
        `- Langkah pertama: ${bitter?.action || '-'}`,
        `- Kenapa: ${bitter?.why || '-'}`,
        '',
        '## Jika Tipis',
        `- Langkah pertama: ${thin?.action || '-'}`,
        `- Kenapa: ${thin?.why || '-'}`,
      ].join('\n');
    }

    return [
      '## Watchpoints',
      ...finisher.controlPoints.map((item) => `- ${item}`),
      `- ${getBrewModeDialInCue(plan, language)}`,
      '',
      '## If The Cup Tastes Sour',
      `- First move: ${sour?.action || '-'}`,
      `- Why: ${sour?.why || '-'}`,
      '',
      '## If The Cup Tastes Bitter / Dry',
      `- First move: ${bitter?.action || '-'}`,
      `- Why: ${bitter?.why || '-'}`,
      '',
      '## If The Cup Feels Thin',
      `- First move: ${thin?.action || '-'}`,
      `- Why: ${thin?.why || '-'}`,
    ].join('\n');
  }

  if (mode === 'adjust') {
    if (isIndonesianAiBrewLanguage(language)) {
      return [
        `## Geser dari ${localizedTarget}`,
        `- Lebih cerah: ${getBrighterShift(plan, language)}`,
        `- Lebih manis: ${getSweeterShift(plan, language)}`,
        `- Lebih rapat: ${getTighterShift(plan, language)}`,
        '',
        '## Aturan Dial-In',
        '- Ubah satu knob per cangkir: grind, suhu, pola tuang, atau rasio.',
        `- Tahan air tetap sama dan validasi ulang di jendela ${formatAiBrewTime(Math.max(plan.totalTimeSeconds - 15, 60))}-${formatAiBrewTime(plan.totalTimeSeconds + 15)}.`,
        `- ${getMethodFamilyServiceCue(plan, language)}`,
      ].join('\n');
    }

    return [
      `## Shift From ${localizedTarget}`,
      `- Brighter: ${getBrighterShift(plan, language)}`,
      `- Sweeter: ${getSweeterShift(plan, language)}`,
      `- Tighter: ${getTighterShift(plan, language)}`,
      '',
      '## Dial-In Rules',
      '- Change one knob per cup: grind, temperature, pour structure, or ratio.',
      `- Hold the water constant and re-check inside the ${formatAiBrewTime(Math.max(plan.totalTimeSeconds - 15, 60))}-${formatAiBrewTime(plan.totalTimeSeconds + 15)} window.`,
      `- ${getMethodFamilyServiceCue(plan, language)}`,
    ].join('\n');
  }

  if (isIndonesianAiBrewLanguage(language)) {
    return [
      '## Ringkasan',
      `${finisher.finalRead}`,
      '',
      '## Mengapa Plan Ini Masuk Akal',
      `- ${summary}`,
      ...finisher.recipeReasoning.map((item) => `- ${item}`),
      `- ${getMethodFamilyServiceCue(plan, language)}`,
      '',
      '## Fokus Dial-In Pertama',
      `- ${getBrewModeDialInCue(plan, language)}`,
      `- ${finisher.controlPoints[0] || ''}`,
      `- ${finisher.controlPoints[1] || ''}`,
    ].join('\n');
  }

  return [
    '## Read',
    `${finisher.finalRead}`,
    '',
    '## Why This Plan Should Work',
    `- ${summary}`,
    ...finisher.recipeReasoning.map((item) => `- ${item}`),
    `- ${getMethodFamilyServiceCue(plan, language)}`,
    '',
    '## First Dial-In Focus',
    `- ${getBrewModeDialInCue(plan, language)}`,
    `- ${finisher.controlPoints[0] || ''}`,
    `- ${finisher.controlPoints[1] || ''}`,
  ].join('\n');
}
