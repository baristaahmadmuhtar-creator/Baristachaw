import type { BrewPlan } from './types';
import {
  formatAiBrewTime,
  isIndonesianAiBrewLanguage,
  localizeAiBrewSummary,
  localizeAiBrewTargetProfile,
} from './localization.ts';
import { buildExtractionFinisher } from './extractionFinisher.ts';

export type DeterministicAiCoachMode = 'explain' | 'troubleshoot' | 'adjust';

function formatCoachRatio(value: number) {
  if (!Number.isFinite(value)) return '--';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function getPlanTasteTimeSeconds(plan: BrewPlan) {
  return Math.max(0, Math.round(plan.extractionEndSeconds ?? plan.totalTimeSeconds));
}

const POUR_OVER_TIME_LABEL_FAMILIES = new Set<BrewPlan['methodFamily']>(['v60', 'chemex', 'kalita_wave', 'origami', 'april', 'melitta', 'kono']);

function getPlanTasteTimeLabel(plan: BrewPlan, language?: string) {
  const id = isIndonesianAiBrewLanguage(language);
  if (plan.methodFamily === 'espresso') return id ? 'waktu ekstraksi espresso' : 'shot time';
  if (plan.methodFamily === 'cold_brew') return id ? 'rendam dingin' : 'cold steep';
  if (plan.methodFamily === 'french_press' || plan.methodFamily === 'clever_dripper') return id ? 'waktu rendam' : 'steep time';
  if (POUR_OVER_TIME_LABEL_FAMILIES.has(plan.methodFamily)) return id ? 'air turun selesai' : (plan.brewMode === 'iced' ? 'hot drawdown finish' : 'drawdown finish');
  if (plan.brewMode === 'iced') return id ? 'waktu ekstraksi panas' : 'hot extraction time';
  return id ? 'waktu ekstraksi' : 'extraction time';
}

function isOrigamiWavePlan(plan: BrewPlan) {
  return plan.formState.origamiFilterStyle === 'wave'
    || /origami.*wave|_wave_/i.test(`${plan.deviceProfileId} ${plan.deviceProfileLabel}`);
}

function getLockedRecipeCue(plan: BrewPlan, language?: string) {
  const ratioText = plan.brewMode === 'iced'
    ? `1:${formatCoachRatio(plan.finalBeverageRatio)} final / 1:${formatCoachRatio(plan.hotExtractionRatio)} hot concentrate`
    : `1:${formatCoachRatio(plan.recommendedRatio)}`;
  const waterText = plan.brewMode === 'iced'
    ? `${plan.hotWaterMl} ml hot / ${plan.iceMl} g ice`
    : `${plan.totalWaterMl} ml water`;
  const manualCue = String(plan.formState.targetRatio || '').trim()
    ? ' User-set target ratio is locked.'
    : '';

  if (isIndonesianAiBrewLanguage(language)) {
    const manualText = String(plan.formState.targetRatio || '').trim()
      ? ' Target ratio manual dikunci.'
      : '';
    return `Dosis ${plan.doseG} g, rasio ${ratioText}, ${waterText}, suhu ${plan.waterTempC}°C, gilingan ${plan.grindSettingReference}, ${getPlanTasteTimeLabel(plan, language)} ${formatAiBrewTime(getPlanTasteTimeSeconds(plan))}, dan jadwal langkah dikunci dari rencana deterministik; AI Coach tidak mengubah rasio/dosis.${manualText}`;
  }

  return `Dose ${plan.doseG} g, ratio ${ratioText}, ${waterText}, ${plan.waterTempC}°C, grind ${plan.grindSettingReference}, ${getPlanTasteTimeLabel(plan, language)} ${formatAiBrewTime(getPlanTasteTimeSeconds(plan))}, and step timing are locked from the deterministic plan; coach does not change ratio/dose.${manualCue}`;
}

function getMethodFamilyServiceCue(plan: BrewPlan, language?: string) {
  if (isIndonesianAiBrewLanguage(language)) {
    switch (plan.methodFamily) {
      case 'espresso':
        return 'Kunci eksekusi ada di hasil ekstraksi, aliran, dan tanda berhenti espresso; jangan pakai pola filter manual.';
      case 'aeropress': {
        const style = plan.recipeStyle || 'standard';
        switch (style) {
          case 'inverted':
            return 'Kunci eksekusi ada di persiapan terbalik, penekan masuk minimal 2 cm, 4x adukan tenang, balikkan mantap, dan tekan stabil.';
          case 'bypass':
            return 'Kunci eksekusi ada di pembuatan konsentrat pekat, 3x adukan awal, berhenti menekan sebelum desis, lalu tambahkan bypass terukur setelahnya.';
          case 'no_bypass':
            return 'Kunci eksekusi ada di penyeduhan seluruh air langsung di ruang seduh, 3x adukan lembut, rendam penuh, dan tekan melewati desis.';
          case 'bright_clean':
            return 'Kunci eksekusi ada di kertas filter ganda bila tersedia, agitasi rendah dengan 2-3x adukan ringan, dan berhenti menekan sebelum desis pertama.';
          case 'sweet_body':
            return 'Kunci eksekusi ada di ruang seduh yang sudah hangat, 5x adukan silang untuk tekstur manis, rendam lebih panjang, dan tekan melewati desis.';
          default:
            return 'Kunci eksekusi ada di rendaman singkat, 3x adukan tenang, tekanan stabil, dan tekan melewati desis.';
        }
      }
      case 'french_press': {
        const style = plan.recipeStyle || 'traditional';
        let cue = 'Kunci eksekusi: rendaman tenang, kerak kopi dibiarkan utuh pada awal seduh, partikel halus diberi waktu mengendap, lalu seduhan dituang pisah.';
        cue += ' Wadah kaca biasanya kehilangan panas lebih cepat daripada baja berinsulasi; panaskan alat dan wadah saji sebelum seduh agar ekstraksi lebih konsisten.';
        if (style === 'double_filter') {
          cue += ' Gaya filter ganda memakai kertas untuk mengurangi sedimen dan menahan lebih banyak minyak kopi dibanding jaring logam saja. Tekan sangat pelan 45-60 detik agar kertas tidak robek atau tersumbat partikel halus.';
        } else {
          cue += ' Catatan kesehatan: French Press tanpa kertas dapat membawa lebih banyak cafestol dan kahweol daripada kopi yang disaring kertas; gunakan filter ganda bila ingin mengurangi paparan lipid kopi.';
        }
        return cue;
      }
      case 'moka_pot':
        return 'Kunci eksekusi ada di keranjang yang rata, air boiler di bawah katup, panas stabil, dan berhenti sebelum semburan akhir.';
      case 'siphon':
        return 'Kunci eksekusi ada di panas stabil, air naik dengan bersih, adukan singkat, lalu air turun setelah sumber panas dilepas.';
      case 'batch_brew':
        return 'Kunci eksekusi ada di dosis per liter, distribusi semprotan mesin, waktu air turun, dan aduk seduhan batch sebelum disajikan.';
      case 'cold_brew':
        return 'Kunci eksekusi ada di saturasi air dingin, rendaman panjang, lalu filtrasi atau tuang pisah dengan bersih.';
      case 'chemex':
        return 'Kunci eksekusi ada di aliran yang tetap terbuka lewat kertas tebal; jangan dorong air ke dinding filter.';
      case 'clever_dripper':
        return 'Kunci eksekusi ada di rendaman yang tenang lalu buka katup dengan bersih; jangan mengejar turbulensi setelah air masuk.';
      case 'april':
        return 'Kunci eksekusi ada di tuangan pendek, jeda cepat, dan agitasi rendah dari awal sampai akhir.';
      case 'kalita_wave':
        return 'Kunci eksekusi ada di hamparan kopi yang rata dan fase tengah yang stabil, bukan putaran besar.';
      case 'melitta':
        return 'Kunci eksekusi ada di hamparan kopi trapezoid yang rata dan terukur dari blooming sampai akhir.';
      case 'kono':
        return 'Kunci eksekusi ada di jalur tuang yang lebih terpusat untuk menjaga kontak manis di tengah.';
      case 'origami':
        if (isOrigamiWavePlan(plan)) {
          return 'Kunci eksekusi ada di hamparan kopi wave yang rata, tuangan tengah, dan air turun tenang seperti alat beralas datar.';
        }
        return 'Kunci eksekusi ada di tuangan ringkas dan aliran cone yang cepat tetapi tetap terkendali.';
      case 'v60':
      default:
        return 'Kunci eksekusi ada di aliran dari tengah ke sekeliling bagian tengah, dengan dinding filter tetap tenang.';
    }
  }

  switch (plan.methodFamily) {
    case 'espresso':
      return 'The service pattern depends on shot yield, flow, and stop cue; do not treat it like a manual filter brew.';
    case 'aeropress': {
      const style = plan.recipeStyle || 'standard';
      switch (style) {
        case 'inverted':
          return 'The service pattern depends on inverted assembly, a secure 2 cm plunger safety depth, 4 calm stirs, a stable flip, and pressing through the hiss.';
        case 'bypass':
          return 'The service pattern depends on brewing a compact concentrate, 3 initial stirs, stopping the press before the hiss, then diluting with measured bypass water.';
        case 'no_bypass':
          return 'The service pattern depends on adding all recipe water to the chamber directly, 3 gentle stirs, a complete steep, and pressing through the hiss.';
        case 'bright_clean':
          return 'The service pattern depends on optional double papers, low agitation with 2-3 light stirs, and stopping the press before the first dry hiss.';
        case 'sweet_body':
          return 'The service pattern depends on a preheated chamber, 5 cross-stirs to build sweet texture, a longer steep, and pressing through the hiss.';
        default:
          return 'The service pattern depends on a short steep, 3 calm stirs, steady pressing, and pressing through the hiss.';
      }
    }
    case 'french_press': {
      const style = plan.recipeStyle || 'traditional';
      let cue = 'The service pattern depends on calm immersion, preserving the crust early, giving fines time to settle, and decanting cleanly.';
      cue += ' Glass vessels usually lose heat faster than insulated stainless steel, so preheat the brewer and serving vessel for repeatable extraction.';
      if (style === 'double_filter') {
        cue += ' Double Filter style uses paper to reduce sediment and retain more coffee oils than metal mesh alone. Press very slowly for 45-60 seconds to avoid tearing or clogging the paper.';
      } else {
        cue += ' Health note: unfiltered French Press can carry more cafestol and kahweol than paper-filtered coffee; use Double Filter when lower coffee-lipid exposure is preferred.';
      }
      return cue;
    }
    case 'moka_pot':
      return 'The service pattern depends on a level basket, boiler water below the valve, stable heat, and stopping before sputter.';
    case 'siphon':
      return 'The service pattern depends on stable heat, clean draw-up, brief stirring, then drawdown after removing heat.';
    case 'batch_brew':
      return 'The service pattern depends on dose per liter, machine spray distribution, drawdown, and mixing the batch before service.';
    case 'cold_brew':
      return 'The service pattern depends on cool-water saturation, long steeping, then clean filtration or decanting.';
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
      if (isOrigamiWavePlan(plan)) {
        return 'The service pattern depends on a level wave-filter bed, centered pours, and calm flat-bottom drawdown.';
      }
      return 'The service pattern depends on compact pulses and fast cone flow that still stays controlled.';
    case 'v60':
    default:
      return 'The service pattern depends on a clean center-to-mid stream with quiet filter walls.';
  }
}

function getBrewModeDialInCue(plan: BrewPlan, language?: string) {
  if (isIndonesianAiBrewLanguage(language)) {
    return plan.brewMode === 'iced'
      ? `Jangan ubah pembagian ${plan.hotWaterMl} ml air panas / ${plan.iceMl} ml es bersamaan dengan gilingan di ronde yang sama.`
      : `Jangan ubah suhu ${plan.waterTempC}°C dan gilingan bersamaan dalam satu ronde uji rasa.`;
  }
  return plan.brewMode === 'iced'
    ? `Do not change the ${plan.hotWaterMl} ml hot / ${plan.iceMl} ml ice split in the same round as the grind.`
    : `Do not change ${plan.waterTempC}°C water and the grind in the same cupping round.`;
}

function getBrighterShift(plan: BrewPlan, language?: string) {
  if (isIndonesianAiBrewLanguage(language)) {
    switch (plan.methodFamily) {
      case 'espresso':
        return 'Hentikan ekstraksi 2-3 detik lebih cepat pada tanda berhenti yang sama sambil mempertahankan dosis dan hasil ekstraksi rencana.';
      case 'aeropress':
        return 'Pendekkan rendaman 8-12 detik atau tekan sedikit lebih cepat tanpa memaksa desis.';
      case 'french_press':
        return 'Tuang pisah 15 detik lebih cepat setelah partikel halus mengendap, atau geser gilingan 0.5 step lebih kasar.';
      case 'moka_pot':
        return 'Turunkan panas sedikit dan hentikan lebih cepat sebelum semburan akhir supaya akhir rasa lebih bersih.';
      case 'siphon':
        return 'Kurangi waktu ekstraksi 8-12 detik sebelum melepas sumber panas, lalu jaga air turun tetap bersih.';
      case 'batch_brew':
        return 'Pendekkan siklus mesin sedikit atau rapikan distribusi semprotan tanpa mengubah dosis per liter.';
      case 'cold_brew':
        return 'Pendekkan rendaman 1-2 jam atau encerkan konsentrat setelah filtrasi, bukan saat penyeduhan.';
      case 'clever_dripper':
        return 'Buka katup 10 detik lebih cepat atau geser gilingan 0.5 step lebih kasar sambil mempertahankan rasio.';
      case 'chemex':
        return 'Geser gilingan 0.5 step lebih kasar dan jaga tuangan pembentuk tetap jauh dari dinding filter.';
      case 'april':
        return 'Pendekkan tuangan bertahap sedikit dan jaga jeda tetap singkat agar akhir rasa terasa lebih terbuka.';
      case 'kalita_wave':
      case 'melitta':
        return 'Geser gilingan 0.5 step lebih kasar dan kurangi beban fase tengah sedikit tanpa membuat hamparan kopi miring.';
      case 'kono':
        return 'Buka jalur tuang sedikit lebih lebar di fase akhir atau geser gilingan 0.5 step lebih kasar.';
      case 'origami':
      case 'v60':
      default:
        return 'Geser gilingan 0.5 step lebih kasar dan buat fase akhir sedikit lebih ringan tanpa memburu dinding filter.';
    }
  }

  switch (plan.methodFamily) {
    case 'espresso':
      return 'Stop the shot 2-3 seconds earlier at the same stop cue while keeping the planned dose and yield fixed.';
    case 'aeropress':
      return 'Shorten steep by 8-12 seconds or press a little faster without forcing the hiss.';
    case 'french_press':
      return 'Decant 15 seconds earlier after settling, or move the grind 0.5 step coarser.';
    case 'moka_pot':
      return 'Lower heat slightly and stop earlier before sputter for a cleaner finish.';
    case 'siphon':
      return 'Shorten extraction by 8-12 seconds before removing heat, then keep drawdown clean.';
    case 'batch_brew':
      return 'Shorten the machine cycle slightly or clean up spray distribution without changing dose per liter.';
    case 'cold_brew':
      return 'Shorten steep by 1-2 hours or dilute the concentrate after filtration, not during brewing.';
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
      case 'espresso':
        return 'Geser gilingan lebih halus sampai aliran tetap stabil tanpa mengubah target hasil ekstraksi.';
      case 'aeropress':
        return 'Tambah rendaman 10 detik atau aduk 1-2 kali lebih banyak sebelum menekan stabil.';
      case 'french_press':
        return 'Tambah rendaman 15-20 detik lalu tetap tuang pisah dengan bersih setelah partikel halus mengendap.';
      case 'moka_pot':
        return 'Jaga panas lebih stabil dan hentikan tepat sebelum semburan akhir agar rasa manis tidak terbakar.';
      case 'siphon':
        return 'Tambah ekstraksi 8-12 detik di ruang atas dengan adukan singkat yang tetap lembut.';
      case 'batch_brew':
        return 'Geser gilingan sedikit lebih halus atau rapikan distribusi semprotan sambil menjaga dosis per liter tetap sama.';
      case 'cold_brew':
        return 'Tambah rendaman 1-2 jam atau tingkatkan saturasi awal tanpa mengubah rasio konsentrat.';
      case 'clever_dripper':
        return 'Tambah rendaman 10 detik sebelum membuka katup sambil mempertahankan air dan rasio yang sama.';
      case 'chemex':
        return 'Geser gilingan 0.5 step lebih halus atau naikkan suhu 1°C jika blooming sudah stabil.';
      case 'april':
        return 'Biarkan tuangan tengah membawa sedikit volume lebih besar tanpa menambah goyangan.';
      case 'kalita_wave':
      case 'melitta':
        return 'Geser sedikit lebih banyak air ke fase tengah sambil menjaga hamparan kopi tetap rata.';
      case 'kono':
        return 'Pertahankan jalur tuang lebih terpusat sedikit lebih lama di tengah untuk memperpanjang kontak manis.';
      case 'origami':
      case 'v60':
      default:
        return 'Geser gilingan 0.5 step lebih halus atau buat fase tengah sedikit lebih penuh tanpa menambah bypass.';
    }
  }

  switch (plan.methodFamily) {
    case 'espresso':
      return 'Move the grind finer while keeping flow stable and the planned yield fixed.';
    case 'aeropress':
      return 'Add 10 seconds of steep or 1-2 more gentle stirs before the steady press.';
    case 'french_press':
      return 'Add 15-20 seconds of steep, then still decant cleanly after fines settle.';
    case 'moka_pot':
      return 'Keep heat steadier and stop just before sputter so sweetness does not scorch.';
    case 'siphon':
      return 'Add 8-12 seconds of upper-chamber extraction with a brief, gentle stir.';
    case 'batch_brew':
      return 'Move the grind slightly finer or clean up spray distribution while keeping dose per liter fixed.';
    case 'cold_brew':
      return 'Add 1-2 hours of steep or improve initial saturation without changing the concentrate ratio.';
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
      case 'espresso':
        return 'Rapikan aliran dan tanda berhenti espresso tanpa mengubah target hasil ekstraksi atau menambah air.';
      case 'aeropress':
        return 'Pakai gaya no-bypass dan tekan tetap stabil tanpa mengubah rasio konsentrat.';
      case 'french_press':
        return 'Kurangi bypass saat tuang pisah, biarkan partikel halus mengendap, dan perpanjang kontak singkat bila masih tipis.';
      case 'moka_pot':
        return 'Gunakan basket penuh rata dan jangan encerkan hasil di brewer.';
      case 'siphon':
        return 'Tambah kontak singkat di ruang atas dan pertahankan air turun yang bersih.';
      case 'batch_brew':
        return 'Rapikan distribusi keranjang dan aduk seduhan batch sebelum disajikan agar konsentrasi merata.';
      case 'cold_brew':
        return 'Perbaiki saturasi awal dan filtrasi, lalu sajikan pada dilution plan yang sama.';
      case 'clever_dripper':
        return 'Tahan rendaman sedikit lebih stabil dan buka katup tetap bersih pada rasio yang sama.';
      case 'chemex':
        return 'Buat tuangan pembentuk lebih stabil di tengah dan hindari aliran di dinding filter pada rasio yang sama.';
      case 'april':
        return 'Jaga tuangan bertahap tetap pendek dan sedikit lebih terpusat, bukan lebih agresif.';
      case 'kalita_wave':
      case 'melitta':
        return 'Naikkan kontak fase tengah sedikit sambil menjaga hamparan kopi tetap rata dan rasio tetap sama.';
      case 'kono':
        return 'Pertahankan jalur tuang yang lebih terpusat di tengah tanpa mengubah rasio.';
      case 'origami':
      case 'v60':
      default:
        return 'Pertahankan aliran akhir tetap tenang dan buat kontak tengah lebih konsisten tanpa mengubah rasio.';
    }
  }

  switch (plan.methodFamily) {
    case 'espresso':
      return 'Clean up flow and stop cue without changing the planned yield target or adding water.';
    case 'aeropress':
      return 'Use a no-bypass style and keep the press steady without changing the concentrate ratio.';
    case 'french_press':
      return 'Reduce bypass while decanting, let fines settle, and add a brief contact hold if it still tastes thin.';
    case 'moka_pot':
      return 'Use a full, level basket and do not dilute inside the brewer.';
    case 'siphon':
      return 'Add a brief upper-chamber contact hold and keep the drawdown clean.';
    case 'batch_brew':
      return 'Improve basket distribution and mix the batch before service so concentration is even.';
    case 'cold_brew':
      return 'Improve initial saturation and filtration, then serve at the same planned dilution.';
    case 'clever_dripper':
      return 'Hold steeping a little steadier and keep the release clean at the same ratio.';
    case 'chemex':
      return 'Make the build pour steadier through the middle and avoid wall flow at the same ratio.';
    case 'april':
      return 'Keep the pulses short and slightly more centered rather than more aggressive.';
    case 'kalita_wave':
    case 'melitta':
      return 'Add a little middle-phase contact while keeping the bed level and the ratio unchanged.';
    case 'kono':
      return 'Keep the pour path more centered through the middle without changing the ratio.';
    case 'origami':
    case 'v60':
    default:
      return 'Keep the finish calm and make middle contact more consistent without changing the ratio.';
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
        `- ${getLockedRecipeCue(plan, language)}`,
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
      `- ${getLockedRecipeCue(plan, language)}`,
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
        `- ${getLockedRecipeCue(plan, language)}`,
        '- Ubah satu variabel per cangkir: gilingan, suhu ±1°C, pola tuang/aliran, atau waktu kontak.',
        `- Tahan air tetap sama dan validasi ulang di jendela ${formatAiBrewTime(Math.max(getPlanTasteTimeSeconds(plan) - 15, 60))}-${formatAiBrewTime(getPlanTasteTimeSeconds(plan) + 15)}.`,
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
      `- ${getLockedRecipeCue(plan, language)}`,
      '- Change one knob per cup: grind, temperature ±1°C, pour/flow structure, or contact time.',
      `- Hold the water constant and re-check inside the ${formatAiBrewTime(Math.max(getPlanTasteTimeSeconds(plan) - 15, 60))}-${formatAiBrewTime(getPlanTasteTimeSeconds(plan) + 15)} window.`,
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
      `- ${getLockedRecipeCue(plan, language)}`,
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
    `- ${getLockedRecipeCue(plan, language)}`,
    `- ${getBrewModeDialInCue(plan, language)}`,
    `- ${finisher.controlPoints[0] || ''}`,
    `- ${finisher.controlPoints[1] || ''}`,
  ].join('\n');
}
