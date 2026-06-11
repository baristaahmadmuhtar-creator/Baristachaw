import type { BrewPlan } from './types';
import {
  formatAiBrewTime,
  isIndonesianAiBrewLanguage,
  localizeAiBrewDynamicText,
  localizeAiBrewTargetProfile,
} from './localization.ts';

export type ExtractionTasteIssue = 'sour' | 'bitter' | 'thin';

export interface ExtractionTasteAdjustment {
  taste: ExtractionTasteIssue;
  action: string;
  why: string;
}

export interface BrewExtractionFinisher {
  finalRead: string;
  recipeReasoning: string[];
  controlPoints: string[];
  adjustments: ExtractionTasteAdjustment[];
}

function polishFinisherText(value: string, language?: string) {
  return isIndonesianAiBrewLanguage(language) ? localizeAiBrewDynamicText(value, language) : value;
}

function formatTime(totalSeconds: number) {
  return formatAiBrewTime(totalSeconds);
}

function getPlanTasteTimeSeconds(plan: BrewPlan) {
  return Math.max(0, Math.round(plan.extractionEndSeconds ?? plan.totalTimeSeconds));
}

const POUR_OVER_TIME_LABEL_FAMILIES = new Set<BrewPlan['methodFamily']>(['v60', 'chemex', 'kalita_wave', 'origami', 'april', 'melitta', 'kono']);

function getPlanTasteTimeLabel(plan: BrewPlan, language?: string) {
  const id = isIndonesianAiBrewLanguage(language);
  if (plan.methodFamily === 'espresso') return id ? 'waktu ekstraksi espresso' : 'shot time';
  if (plan.methodFamily === 'cold_brew') return id ? 'rendam dingin' : 'cold steep';
  if (plan.methodFamily === 'french_press') return id ? 'waktu tuang pisah' : 'decant time';
  if (plan.methodFamily === 'aeropress') return id ? 'waktu selesai tekan' : 'press finish';
  if (plan.methodFamily === 'clever_dripper') return id ? 'waktu buka katup' : 'release finish';
  if (POUR_OVER_TIME_LABEL_FAMILIES.has(plan.methodFamily)) return id ? 'air turun selesai' : (plan.brewMode === 'iced' ? 'hot drawdown finish' : 'drawdown finish');
  if (plan.brewMode === 'iced') return id ? 'waktu ekstraksi panas' : 'hot extraction time';
  return id ? 'waktu ekstraksi' : 'extraction time';
}

function formatBaristaTemperature(value: number) {
  if (!Number.isFinite(value)) return '--';
  return String(Math.round(value));
}

function needsMoreExtraction(plan: BrewPlan) {
  return plan.roastLevel === 'light'
    || plan.roastLevel === 'medium_light'
    || plan.beanProfile.roastDevelopment === 'underdeveloped'
    || plan.beanProfile.solubility === 'low'
    || (plan.beanProfile.altitudeMasl || 0) >= 1800;
}

function extractsEasily(plan: BrewPlan) {
  return plan.roastLevel === 'medium_dark'
    || plan.roastLevel === 'dark'
    || plan.beanProfile.roastDevelopment === 'developed'
    || plan.beanProfile.solubility === 'high';
}

function hasHighBufferWater(plan: BrewPlan) {
  return plan.waterMinerals.alkalinityPpm >= 75;
}

function hasSoftWater(plan: BrewPlan) {
  return plan.waterMinerals.hardnessPpm <= 45 || plan.waterMinerals.alkalinityPpm <= 30;
}

function usesManualDrawdown(plan: BrewPlan) {
  return [
    'v60',
    'origami',
    'kono',
    'kalita_wave',
    'melitta',
    'april',
    'chemex',
    'clever_dripper',
  ].includes(plan.methodFamily);
}

function buildTargetTone(plan: BrewPlan, language?: string) {
  if (isIndonesianAiBrewLanguage(language)) {
    switch (plan.targetProfileId) {
      case 'more_sweetness':
        return 'cangkir yang lebih manis dan bulat';
      case 'more_acidity':
        return 'cangkir yang lebih cerah dan bersih';
      case 'more_body':
        return 'cangkir yang lebih padat dan tebal';
      case 'balance_clean':
      default:
        return 'cangkir yang seimbang dan bersih';
    }
  }

  switch (plan.targetProfileId) {
    case 'more_sweetness':
      return 'a sweeter, rounder cup';
    case 'more_acidity':
      return 'a brighter, cleaner cup';
    case 'more_body':
      return 'a denser, more tactile cup';
    case 'balance_clean':
    default:
      return 'a balanced, clean cup';
  }
}

function buildFinalRead(
  plan: BrewPlan,
  hardToExtract: boolean,
  easyToExtract: boolean,
  highBufferWater: boolean,
  softWater: boolean,
  language?: string,
) {
  const targetTone = buildTargetTone(plan, language);
  if (isIndonesianAiBrewLanguage(language)) {
    if (plan.brewMode === 'iced') {
      return `Dibangun untuk ${targetTone}, dengan fase panas menjaga manis sebelum es mengunci pengenceran akhir.`;
    }
    if (hardToExtract) {
      return `Dibangun untuk ${targetTone} sambil tetap membuka kopi yang lebih sulit larut.`;
    }
    if (easyToExtract) {
      return `Dibangun untuk ${targetTone} dengan kontrol lebih rapat untuk roast yang lebih mudah terekstrak.`;
    }
    if (highBufferWater) {
      return `Dibangun untuk ${targetTone}, tetapi air berbuffer menuntut eksekusi yang rapi.`;
    }
    if (softWater) {
      return `Dibangun untuk ${targetTone}, dengan air lunak yang lebih menghargai tuangan tenang dan repeatable.`;
    }
    return usesManualDrawdown(plan)
      ? `Dibangun untuk ${targetTone} dengan rasio, profil air, dan jendela drawdown yang stabil.`
      : `Dibangun untuk ${targetTone} dengan rasio, profil air, dan workflow ${plan.dripper.name} yang stabil.`;
  }

  if (plan.brewMode === 'iced') {
    return `Built for ${targetTone}, with the hot phase holding sweetness before the ice sets final dilution.`;
  }
  if (hardToExtract) {
    return `Built for ${targetTone} while still opening a harder-to-dissolve coffee.`;
  }
  if (easyToExtract) {
    return `Built for ${targetTone} with tighter control for an easier-to-extract roast.`;
  }
  if (highBufferWater) {
    return `Built for ${targetTone}, but buffered water means execution must stay tidy.`;
  }
  if (softWater) {
    return `Built for ${targetTone}, with soft water rewarding calm, repeatable pours.`;
  }
  return usesManualDrawdown(plan)
    ? `Built for ${targetTone} with a stable ratio, water profile, and drawdown window.`
    : `Built for ${targetTone} with a stable ratio, water profile, and ${plan.dripper.name} workflow.`;
}

function buildRecipeReasoning(
  plan: BrewPlan,
  hardToExtract: boolean,
  easyToExtract: boolean,
  highBufferWater: boolean,
  softWater: boolean,
  language?: string,
) {
  if (isIndonesianAiBrewLanguage(language)) {
    const reasoning = [
      plan.brewMode === 'iced'
        ? `${plan.hotWaterMl} ml panas / ${plan.iceMl} ml es menjaga konsentrasi sebelum pengenceran akhir.`
        : `${plan.totalWaterMl} ml pada ${formatBaristaTemperature(plan.waterTempC)} C menargetkan ${getPlanTasteTimeLabel(plan, language)} ${formatTime(getPlanTasteTimeSeconds(plan))} untuk ${plan.dripper.name}.`,
    ];

    if (highBufferWater) {
      reasoning.push(usesManualDrawdown(plan)
        ? `KH ${plan.waterMinerals.alkalinityPpm} ppm akan menahan acidity, jadi jaga drawdown tuntas dan grind tetap rapi.`
        : `KH ${plan.waterMinerals.alkalinityPpm} ppm akan menahan acidity, jadi jaga waktu kontak dan grind tetap rapi.`);
    } else if (softWater) {
      reasoning.push(`GH ${plan.waterMinerals.hardnessPpm} / KH ${plan.waterMinerals.alkalinityPpm} tergolong lunak, jadi clarity cepat muncul tetapi harshness juga lebih cepat terlihat.`);
    } else {
      reasoning.push(`GH ${plan.waterMinerals.hardnessPpm} / KH ${plan.waterMinerals.alkalinityPpm} masih di zona kerja yang aman, jadi utamakan tuning grind, suhu, dan pola tuang lebih dulu.`);
    }

    if (hardToExtract) {
      reasoning.push('Roast dan profil bean cenderung lebih sulit larut, jadi pakai suhu dan contact time stabil daripada agitasi agresif.');
    } else if (easyToExtract) {
      reasoning.push('Roast dan profil bean cenderung lebih mudah larut, jadi jaga clarity dengan menghindari contact time berlebih.');
    } else {
      reasoning.push('Roast ada di jendela ekstraksi tengah, jadi repeatability datang dari grind dan ritme tuang yang stabil.');
    }

    reasoning.push(
      plan.deviceProfileMode === 'exact'
        ? `Profil alat exact untuk ${plan.dripper.name}, jadi feedback rasa seharusnya tinggal kalibrasi halus.`
        : `Profil alat ${plan.deviceProfileMode === 'derived_template' ? 'berasal dari template' : 'fallback family'}, jadi ubah sedikit demi sedikit lalu validasi lewat cangkir.`,
    );

    return reasoning;
  }

  const reasoning = [
    plan.brewMode === 'iced'
      ? `${plan.hotWaterMl} ml hot / ${plan.iceMl} ml ice keeps concentration up before dilution.`
      : `${plan.totalWaterMl} ml at ${formatBaristaTemperature(plan.waterTempC)} C targets ${getPlanTasteTimeLabel(plan, language)} ${formatTime(getPlanTasteTimeSeconds(plan))} for ${plan.dripper.name}.`,
  ];

  if (highBufferWater) {
    reasoning.push(usesManualDrawdown(plan)
      ? `KH ${plan.waterMinerals.alkalinityPpm} ppm will cushion acidity, so keep drawdown complete and grind tidy.`
      : `KH ${plan.waterMinerals.alkalinityPpm} ppm will cushion acidity, so keep contact time and grind tidy.`);
  } else if (softWater) {
    reasoning.push(`GH ${plan.waterMinerals.hardnessPpm} / KH ${plan.waterMinerals.alkalinityPpm} is soft, so clarity comes fast but harshness shows quickly too.`);
  } else {
    reasoning.push(`GH ${plan.waterMinerals.hardnessPpm} / KH ${plan.waterMinerals.alkalinityPpm} sits in a workable middle zone, so tune grind, temp, and pours first.`);
  }

  if (hardToExtract) {
    reasoning.push(
      'The roast and bean profile read harder to dissolve, so use temperature and steady contact time instead of aggressive agitation.',
    );
  } else if (easyToExtract) {
    reasoning.push(
      'The roast and bean profile read easier to dissolve, so protect clarity by avoiding excess contact time.',
    );
  } else {
    reasoning.push(
      'The roast sits near a middle extraction window, so repeatability comes from holding grind and pour rhythm steady.',
    );
  }

  reasoning.push(
    plan.deviceProfileMode === 'exact'
      ? `The device profile is exact for ${plan.dripper.name}, so taste feedback should be a fine calibration.`
      : `The device profile is ${plan.deviceProfileMode === 'derived_template' ? 'template-derived' : 'family-fallback'}, so keep changes small and validate by cup.`,
  );

  return reasoning;
}

function buildControlPoints(plan: BrewPlan, language?: string) {
  const tasteTimeSeconds = getPlanTasteTimeSeconds(plan);
  const lowerBound = Math.max(tasteTimeSeconds - 15, 60);
  const upperBound = tasteTimeSeconds + 15;
  const methodPoint = (() => {
    if (isIndonesianAiBrewLanguage(language)) {
      switch (plan.methodFamily) {
        case 'espresso':
          return 'Pantau hasil ekstraksi, aliran, dan tanda berhenti espresso; jangan menambah air seperti filter manual.';
        case 'aeropress':
          return 'Pantau waktu rendam, jumlah adukan, durasi tekan, dan berhenti sebelum desis terakhir dipaksa.';
        case 'french_press':
          return 'Pantau rendaman, endapan partikel halus, dan tuang pisah; jangan cari air turun atau tuangan bertahap.';
        case 'moka_pot':
          return 'Pantau keranjang rata, air boiler di bawah katup, panas stabil, dan berhenti sebelum semburan akhir.';
        case 'siphon':
          return 'Pantau air naik, adukan singkat, ekstraksi di ruang atas, lepas sumber panas, lalu air turun bersih.';
        case 'batch_brew':
          return 'Pantau dosis per liter, volume mesin, pola semprotan, air turun, dan aduk seduhan batch sebelum disajikan.';
        case 'cold_brew':
          return 'Pantau saturasi air dingin, rendaman panjang, lalu filtrasi bersih; jangan pakai alur seduh panas.';
        case 'hario_switch':
          return 'Pantau posisi katup, muatan ruang tertutup, waktu buka katup, dan laju tuang.';
        case 'chemex':
          return 'Jaga aliran menjauh dari dinding filter tebal agar air tetap turun lancar sampai akhir.';
        case 'clever_dripper':
          return 'Biarkan rendaman tetap tenang lalu buka katup dengan bersih tanpa mengaduk hamparan kopi.';
        case 'april':
          return 'Jaga tuangan bertahap tetap pendek dan rendah agitasi; jangan memanjangkan jeda hanya untuk mengejar body.';
        case 'kalita_wave':
          return 'Pastikan hamparan kopi tetap rata di fase tengah; kalau miring, koreksi aliran sebelum mengubah gilingan.';
        case 'melitta':
          return 'Jaga hamparan kopi trapezoid tetap rata dan terukur; hindari membebani satu sisi kertas di akhir.';
        case 'kono':
          return 'Pertahankan jalur tuang lebih terpusat di tengah supaya kontak manis tetap stabil.';
        case 'origami':
          return 'Jaga tuangan bertahap tetap ringkas dan ringan agar aliran cone yang cepat tidak berubah jadi bypass.';
        case 'v60':
        default:
          return 'Jaga aliran tetap dari tengah ke sekeliling bagian tengah dan jangan mengejar dinding filter di fase akhir.';
      }
    }

    switch (plan.methodFamily) {
      case 'espresso':
        return 'Watch yield, flow, and shot stop cue; do not add water like a manual filter brew.';
      case 'aeropress':
        return 'Watch steep, stir count, press duration, and stop before forcing the final hiss.';
        case 'french_press':
          return 'Watch immersion, fines settling, and decanting; do not look for pour-over flow cues.';
      case 'moka_pot':
        return 'Watch a level basket, boiler water below the valve, stable heat, and stop before sputter.';
      case 'siphon':
        return 'Watch draw-up, brief stirring, upper-chamber extraction, heat removal, and clean drawdown.';
      case 'batch_brew':
        return 'Watch dose per liter, machine volume, spray pattern, drawdown, and batch mixing before service.';
      case 'cold_brew':
        return 'Watch cool-water saturation, long steeping, then clean filtration; do not use a hot workflow.';
      case 'hario_switch':
        return 'Watch valve state, closed chamber capacity, release timing, and pour flow rates.';
      case 'chemex':
        return 'Keep the stream off the thick filter wall so flow stays open through the finish.';
      case 'clever_dripper':
        return 'Let immersion stay calm, then open the release cleanly without stirring the bed.';
      case 'april':
        return 'Keep the pulses short and low-agitation; do not stretch resets just to chase more body.';
      case 'kalita_wave':
        return 'Keep the bed level through the middle; if it tilts, fix the flow before changing grind.';
      case 'melitta':
        return 'Keep the trapezoid bed level and measured; do not overload one paper wall late in the brew.';
      case 'kono':
        return 'Hold the pour path tighter in the center so the sweeter contact path stays stable.';
      case 'origami':
        return 'Keep the pulses compact and light so the faster cone flow does not turn into bypass.';
      case 'v60':
      default:
        return 'Keep the stream center-to-mid and do not chase the filter wall during the finish.';
    }
  })();

  if (isIndonesianAiBrewLanguage(language)) {
    return [
      `Selesaikan antara ${formatTime(lowerBound)} dan ${formatTime(upperBound)}. Rasio, dosis, air, suhu, dan timing plan dikunci; perbaiki flow dulu.`,
      methodPoint,
      plan.waterMode === 'manual' || plan.waterCustomized
        ? 'Jangan ubah air dan grind dalam ronde cupping yang sama.'
        : `Pertahankan ${plan.waterBrandLabel || 'air yang dipilih'} tetap sama saat membandingkan perubahan rasa.`,
    ];
  }

  return [
    `Finish between ${formatTime(lowerBound)} and ${formatTime(upperBound)}. Ratio, dose, water, temperature, and plan timing are locked; fix flow first.`,
    methodPoint,
    plan.waterMode === 'manual' || plan.waterCustomized
      ? 'Do not change water and grind in the same tasting round.'
      : `Keep ${plan.waterBrandLabel || 'the selected water'} constant while comparing taste changes.`,
  ];
}

function buildSourAdjustment(plan: BrewPlan, hardToExtract: boolean, highBufferWater: boolean, language?: string): ExtractionTasteAdjustment {
  const mayNeedTempNudge = plan.waterTempC <= 90 || (hardToExtract && plan.waterTempC < 93);
  const action = (() => {
    if (isIndonesianAiBrewLanguage(language)) {
      switch (plan.methodFamily) {
        case 'espresso':
          return 'Geser grinder sedikit lebih halus dulu; jaga yield target plan dan hanya rapikan flow bila shot masih asam.';
        case 'aeropress':
          if (plan.recipeStyle === 'inverted') {
            return 'Tambah rendam 10-15 detik di chamber terbalik, atau lakukan 1 adukan ekstra sebelum membalikkan alat.';
          } else if (plan.recipeStyle === 'bypass') {
            return 'Geser grind 0.5 step lebih halus pada konsentrat, atau kurangi sedikit porsi air bypass agar rasa manis lebih pekat.';
          } else if (plan.recipeStyle === 'no_bypass') {
            return 'Tambah rendam 15-20 detik dan pasang plunger lebih rapat; jika masih asam, geser grind 0.5 step lebih halus.';
          } else if (plan.recipeStyle === 'bright_clean') {
            return 'Geser grind 0.5 step lebih halus dan tuangkan air lebih lambat untuk memperpanjang waktu kontak tanpa agitasi ekstra.';
          } else if (plan.recipeStyle === 'sweet_body') {
            return 'Aduk memutar 2 kali ekstra di fase awal dan gunakan air dengan suhu +1 C lebih panas.';
          } else {
            return 'Tambah rendam 10-15 detik di fase vakum, atau aduk perlahan 1-2 kali ekstra sebelum memasang plunger.';
          }
        case 'french_press': {
          const style = plan.recipeStyle || 'traditional';
          if (style === 'clean_decant') {
            return 'Perpanjang waktu rendam awal menjadi 5 menit sebelum membersihkan crust, lalu biarkan mengendap bersih.';
          } else if (style === 'double_filter') {
            return 'Tambah steep 20 detik, gunakan air mendidih penuh, dan pastikan double filter sudah dibilas air panas.';
          } else if (style === 'heavy_concentrate') {
            return 'Aduk lebih kuat 5-6 kali setelah air dituang, dan tambah steep 30 detik untuk melarutkan sari kopi padat.';
          } else if (style === 'sweet_immersion') {
            return 'Tingkatkan suhu air +1 C, dan perpanjang waktu rendam tenang 20-30 detik sebelum ditekan lembut.';
          } else {
            return 'Tambah steep 20-30 detik sebelum settle, lalu tetap decant bersih.';
          }
        }
        case 'hario_switch': {
          const style = plan.recipeStyle || 'hybrid_balanced';
          if (style === 'hybrid_balanced') {
            return 'Perpanjang fase katup tertutup selama 15-20 detik sebelum release, atau giling 0.5 step lebih halus untuk membuka rasa manis.';
          } else if (style === 'hybrid_bright_clean') {
            return 'Tutup katup 10 detik lebih awal saat capture pertengahan seduh, atau naikkan suhu air sebesar +1 C.';
          } else if (style === 'immersion_sweet') {
            return 'Perpanjang total rendaman tenang selama 20-30 detik, atau giling 0.5 step lebih halus; jangan aduk kopi secara kasar.';
          } else if (style === 'immersion_heavy_body') {
            return 'Aduk perlahan 1-2 kali ekstra saat bloom, dan perpanjang durasi rendam tertutup selama 30 detik untuk kelarutan pekat.';
          } else if (style === 'v60_mode') {
            return 'Giling 0.5 step lebih halus, dan jaga tuangan rapat dekat tengah untuk memperpanjang waktu turun air perkolasi.';
          } else if (style === 'iced_hybrid') {
            return 'Perpanjang rendam konsentrat tertutup 20-30 detik, atau kurangi sedikit volume air panas sambil menjaga berat es tetap.';
          } else if (style === 'mugen_everyday_hybrid') {
            return 'Perpanjang rendam fase tertutup selama 20 detik, atau tuang lebih lambat untuk memperpanjang waktu kontak di MUGEN.';
          } else {
            return 'Perpanjang fase katup tertutup 15-20 detik sebelum membuka katup, atau giling 0.5 step lebih halus.';
          }
        }
        case 'moka_pot':
          return 'Gunakan heat lebih stabil dan hentikan tepat sebelum sputter; jika masih asam, grind sedikit lebih halus.';
        case 'siphon':
          return 'Tambah extract 10-15 detik di upper chamber dan pertahankan stir singkat.';
        case 'batch_brew':
          return 'Grind sedikit lebih halus dan cek distribusi spray; suhu +1 C hanya jika cup berikutnya masih asam.';
        case 'cold_brew':
          return 'Tambah steep 1-2 jam atau perbaiki saturasi awal tanpa mengubah rasio concentrate.';
        case 'clever_dripper': {
          const style = plan.cleverDripperStyle || 'auto';
          if (style === 'reverse_water_first') {
            return 'Giling 0.5 step lebih halus, dan pastikan kopi bubuk ditaburkan dengan sangat rata tanpa diaduk agar penyerapan air konsisten.';
          } else if (style === 'double_stage_hybrid') {
            return 'Tutup katup bloom 10 detik lebih lama, atau tingkatkan porsi air di fase rendam tertutup akhir untuk mengangkat ekstraksi manis.';
          } else if (style === 'iced_clever') {
            return 'Perpanjang rendaman panas tertutup 20 detik sebelum release, atau gunakan air mendidih untuk mengekstrak rasa manis buah secara maksimal.';
          } else if (style === 'high_dose_concentrate') {
            return 'Perpanjang waktu rendam hingga 4 menit penuh, aduk lembut 2 kali di fase awal, dan pastikan suhu kettle di atas 93 C.';
          } else {
            return 'Tambahkan steep 10-15 detik sebelum release, atau jika steep sudah terasa pas, geser grinder 0.5 step lebih halus.';
          }
        }
        case 'chemex': {
          const style = plan.chemexStyle || 'auto';
          if (style === 'competition_multi_pulse') {
            return 'Giling 0.5 step lebih halus, dan naikkan suhu air +1 C untuk meningkatkan kelarutan pada aliran pulse yang cepat.';
          } else if (style === 'continuous_center_pour') {
            return 'Tingkatkan suhu air +1 C, dan perkecil diameter aliran air tengah agar air turun tetap lambat dan meresap sempurna.';
          } else if (style === 'iced_chemex') {
            return 'Giling sedikit lebih halus untuk fase panas, dan pastikan air panas dituang secara lambat menjauh dari paper filter tebal.';
          } else if (style === 'high_dose_heavy_body') {
            return 'Perpanjang durasi bloom menjadi 50 detik, tuang air panas sangat lambat di tengah bed, dan pastikan suhu kettle minimal 93 C.';
          } else {
            return mayNeedTempNudge
              ? 'Geser grinder 0.5 step lebih halus, beri bloom sedikit lebih lama, lalu suhu +1 C hanya jika seduhan berikutnya masih asam.'
              : 'Geser grinder 0.5 step lebih halus dan beri bloom sedikit lebih lama sebelum build pour.';
          }
        }
        case 'april':
          return 'Geser grinder 0.5 step lebih halus dan buat pulse tengah sedikit lebih penuh tanpa menambah swirl.';
        case 'kalita_wave': {
          const style = plan.kalitaWaveStyle || 'auto';
          if (style === 'competition_fast_four') {
            return 'Geser grind 0.5 step lebih halus, dan naikkan suhu air +1 C untuk meningkatkan kelarutan pada aliran cepat.';
          } else if (style === 'continuous_slow_stream') {
            return 'Tingkatkan suhu air +1 C, dan perkecil laju aliran tengah agar kontak kolom air tetap maksimal.';
          } else if (style === 'iced_wave') {
            return 'Geser gilingan sedikit lebih halus pada fase panas, atau gunakan air mendidih untuk memaksimalkan konsentrat.';
          } else if (style === 'high_dose_concentrate') {
            return 'Perpanjang bloom 15 detik, dan tuangkan air lebih lambat di pusat untuk melarutkan bagian dalam kopi padat.';
          } else {
            return 'Geser grinder 0.5 step lebih halus dan buat tuangan kedua sedikit lebih penuh sambil menjaga bed tetap rata.';
          }
        }
        case 'melitta':
          return 'Geser grinder 0.5 step lebih halus dan buat fase tengah sedikit lebih penuh sambil menjaga bed tetap rata.';
        case 'kono':
          return 'Geser grinder 0.5 step lebih halus atau tahan contact tengah 5-8 detik lebih lama sebelum finish.';
        case 'origami':
          return mayNeedTempNudge
            ? 'Geser grinder 0.5 step lebih halus, jaga pulse tetap ringkas, lalu suhu +1 C hanya jika masih asam.'
            : 'Geser grinder 0.5 step lebih halus dan tetap jaga pulse singkat.';
        case 'v60':
        default:
          return mayNeedTempNudge
            ? 'Geser grinder 0.5 step lebih halus dulu; suhu +1 C hanya jika flow dan contact sudah benar tapi cup masih asam.'
            : 'Geser grinder 0.5 sampai 1 step lebih halus dan pertahankan pola tuang yang sama.';
      }
    }

    switch (plan.methodFamily) {
      case 'espresso':
        return 'Move the grinder slightly finer first; keep the planned target yield and only tidy flow if the shot stays sour.';
      case 'aeropress':
        if (plan.recipeStyle === 'inverted') {
          return 'Add 10-15 seconds of steep in the inverted chamber, or use 1 extra gentle stir before the flip.';
        } else if (plan.recipeStyle === 'bypass') {
          return 'Move the grind 0.5 step finer on your concentrate, or slightly reduce the bypass water volume to concentrate sweetness.';
        } else if (plan.recipeStyle === 'no_bypass') {
          return 'Add 15-20 seconds of steep and seal tighter; if still sour, move the grind 0.5 step finer.';
        } else if (plan.recipeStyle === 'bright_clean') {
          return 'Move the grind 0.5 step finer and pour slower to extend contact time without adding agitation.';
        } else if (plan.recipeStyle === 'sweet_body') {
          return 'Use 2 extra active stirs in the bloom phase and push water temperature +1 C warmer.';
        } else {
          return 'Add 10-15 seconds of steep in the vacuum phase, or stir gently 1-2 extra times before sealing.';
        }
      case 'french_press': {
        const style = plan.recipeStyle || 'traditional';
        if (style === 'clean_decant') {
          return 'Extend the initial steep to 5 minutes before breaking the crust, then let settle cleanly.';
        } else if (style === 'double_filter') {
          return 'Add 20 seconds of steep, use boiling water, and make sure the double filter is pre-heated.';
        } else if (style === 'heavy_concentrate') {
          return 'Stir more vigorously 5-6 times right after pouring, and add 30 seconds of steep to dissolve heavy solubles.';
        } else if (style === 'sweet_immersion') {
          return 'Increase water temperature by +1 C, and extend the quiet steep by 20-30 seconds before plunging gently.';
        } else {
          return 'Add 20-30 seconds of steep before settling, then still decant cleanly.';
        }
      }
      case 'hario_switch': {
        const style = plan.recipeStyle || 'hybrid_balanced';
        if (style === 'hybrid_balanced') {
          return 'Extend the closed valve phase by 15-20 seconds before releasing, or grind 0.5 step finer to unlock sweetness.';
        } else if (style === 'hybrid_bright_clean') {
          return 'Close the valve 10 seconds earlier during the mid-brew capture, or increase your water temperature by +1 C.';
        } else if (style === 'immersion_sweet') {
          return 'Extend the total quiet steep by 20-30 seconds, or grind 0.5 step finer; do not stir aggressively.';
        } else if (style === 'immersion_heavy_body') {
          return 'Stir 1-2 extra times gently during bloom, and extend the closed steep duration by 30 seconds for deep solubles.';
        } else if (style === 'v60_mode') {
          return 'Grind 0.5 step finer, and keep pours compact near center to extend the percolation drawdown time.';
        } else if (style === 'iced_hybrid') {
          return 'Extend the closed concentrate steep by 20-30 seconds, or slightly reduce hot water volume while keeping ice constant.';
        } else if (style === 'mugen_everyday_hybrid') {
          return 'Extend the closed phase steep by 20 seconds, or pour even slower to increase contact time in MUGEN.';
        } else {
          return 'Extend the closed phase by 15-20 seconds before opening the valve, or move your grind 0.5 step finer.';
        }
      }
      case 'moka_pot':
        return 'Use steadier heat and stop just before sputter; if still sour, move the grind slightly finer.';
      case 'siphon':
        return 'Add 10-15 seconds of upper-chamber extraction and keep the stir brief.';
      case 'batch_brew':
        return 'Grind slightly finer and check spray distribution; use +1 C only if the next cup still tastes sour.';
      case 'cold_brew':
        return 'Add 1-2 hours of steep or improve initial saturation without changing the concentrate ratio.';
      case 'clever_dripper': {
        const style = plan.cleverDripperStyle || 'auto';
        if (style === 'reverse_water_first') {
          return 'Move the grind 0.5 step finer, and ensure coffee is scattered perfectly level without stirring to maintain uniform absorption.';
        } else if (style === 'double_stage_hybrid') {
          return 'Extend the closed bloom phase by 10 seconds, or slightly increase the water volume of the final closed immersion stage to boost sweet extraction.';
        } else if (style === 'iced_clever') {
          return 'Extend the hot closed steep by 20 seconds before release, or use boiling water to extract maximum fruit sweetness.';
        } else if (style === 'high_dose_concentrate') {
          return 'Extend the steep to a full 4 minutes, stir gently twice in the early phase, and ensure kettle temperature is above 93 C.';
        } else {
          return 'Add 10-15 seconds of steep before release, or if steep already feels right, move the grinder 0.5 step finer.';
        }
      }
      case 'chemex': {
        const style = plan.chemexStyle || 'auto';
        if (style === 'competition_multi_pulse') {
          return 'Move the grind 0.5 step finer, and increase water temperature by +1 C to raise solubility on fast pulse flow.';
        } else if (style === 'continuous_center_pour') {
          return 'Increase water temperature by +1 C, and make the centered stream even slower to keep the drawdown slow and fully saturated.';
        } else if (style === 'iced_chemex') {
          return 'Grind slightly finer for the hot phase, and ensure hot water is poured slowly, keeping it away from the thick paper filter.';
        } else if (style === 'high_dose_heavy_body') {
          return 'Extend the bloom duration to 50 seconds, pour hot water very slowly in the center of the bed, and ensure kettle temperature is at least 93 C.';
        } else {
          return mayNeedTempNudge
            ? 'Move the grinder 0.5 step finer, give the bloom slightly more time, then use +1 C only if the next brew stays sour.'
            : 'Move the grinder 0.5 step finer and give the bloom slightly more time before the build pour.';
        }
      }
      case 'april':
        return 'Move the grinder 0.5 step finer and let the middle pulse land slightly fuller without adding swirl.';
      case 'kalita_wave': {
        const style = plan.kalitaWaveStyle || 'auto';
        if (style === 'competition_fast_four') {
          return 'Move the grind 0.5 step finer, and increase water temperature by +1 C to raise solubility on fast flow.';
        } else if (style === 'continuous_slow_stream') {
          return 'Increase water temperature by +1 C, and make the centered flow rate even slower to maximize column contact.';
        } else if (style === 'iced_wave') {
          return 'Grind slightly finer for the hot phase, or use boiling water to maximize concentrate extraction.';
        } else if (style === 'high_dose_concentrate') {
          return 'Extend bloom by 15 seconds, and pour slower in the center to dissolve the deep core of the high-dose bed.';
        } else {
          return 'Move the grinder 0.5 step finer and make the second pour slightly fuller while keeping the bed level.';
        }
      }
      case 'melitta':
        return 'Move the grinder 0.5 step finer and make the middle phase slightly fuller while keeping the bed level.';
      case 'kono':
        return 'Move the grinder 0.5 step finer or hold the centered middle contact 5-8 seconds longer before the finish.';
      case 'origami':
        return mayNeedTempNudge
          ? 'Move the grinder 0.5 step finer, keep the pulses compact, then use +1 C only if sourness remains.'
          : 'Move the grinder 0.5 step finer and keep the pulses short.';
      case 'v60':
      default:
        return mayNeedTempNudge
          ? 'Move the grinder 0.5 step finer first; use +1 C only after flow and contact are already correct but the cup stays sour.'
          : 'Move the grinder 0.5 to 1 step finer and keep the same pour pattern.';
    }
  })();
  return {
    taste: 'sour',
    action,
    why: isIndonesianAiBrewLanguage(language)
      ? (highBufferWater
        ? 'Dengan air berbuffer, rasa asam biasanya berarti kopi masih belum terekstrak cukup dalam untuk menembus bantalan buffer.'
        : 'Asam yang tajam dan asin pada resep ini biasanya menandakan under-extraction terhadap contact time saat ini.')
      : highBufferWater
        ? 'With buffered water, sourness usually means the coffee still did not extract deeply enough to break through the cushion.'
        : 'Sharp, salty acidity on this recipe usually points to under-extraction relative to the current contact time.',
  };
}

function buildBitterAdjustment(plan: BrewPlan, easyToExtract: boolean, language?: string): ExtractionTasteAdjustment {
  const mayNeedTempDrop = (easyToExtract && plan.waterTempC >= 91) || plan.waterTempC >= 94;
  const action = (() => {
    if (isIndonesianAiBrewLanguage(language)) {
      switch (plan.methodFamily) {
        case 'espresso':
          return mayNeedTempDrop
            ? 'Geser grinder sedikit lebih kasar dan kurangi channeling; suhu -1 C hanya jika shot berikutnya tetap pahit.'
            : 'Geser grinder sedikit lebih kasar dan hentikan shot di yield target.';
        case 'aeropress':
          if (plan.recipeStyle === 'inverted') {
            return 'Pendekkan steep 10-15 detik di posisi inverted, kurangi agitasi adukan, dan balikkan secara tenang.';
          } else if (plan.recipeStyle === 'bypass') {
            return 'Geser grind 0.5 step lebih kasar pada konsentrat, atau hentikan press secara ketat sebelum hiss kering.';
          } else if (plan.recipeStyle === 'no_bypass') {
            return 'Geser grind 0.5 sampai 1 step lebih kasar untuk mencegah mampet, dan kurangi steep 15 detik.';
          } else if (plan.recipeStyle === 'bright_clean') {
            return 'Geser grind 0.5 step lebih kasar dan pastikan penekanan dilakukan sangat lembut tanpa tenaga tambahan.';
          } else if (plan.recipeStyle === 'sweet_body') {
            return 'Hentikan press tepat pada hiss awal dan kurangi durasi steep 10 detik agar rasa pahit gosong tidak keluar.';
          } else {
            return 'Pendekkan steep 10-15 detik, kurangi adukan awal, dan hentikan press tepat pada desis pertama.';
          }
        case 'french_press': {
          const style = plan.recipeStyle || 'traditional';
          if (style === 'clean_decant') {
            return 'Decant sisa cairan lebih awal secara perlahan, pastikan sisa lumpur (silt) di dasar beaker tidak ikut tertuang.';
          } else if (style === 'double_filter') {
            return 'Tekan plunger lebih lambat (minimal 35-40 detik) dengan tenaga sangat ringan untuk menahan fines di double mesh.';
          } else if (style === 'heavy_concentrate') {
            return 'Kurangi agitasi adukan menjadi 3 kali adukan perlahan, atau tambahkan air bypass hangat di akhir untuk mengencerkan cup.';
          } else if (style === 'sweet_immersion') {
            return 'Turunkan suhu air -1 C, dan pastikan plunger ditekan secara ultra-lembut tanpa mengguncang bed kopi.';
          } else {
            return 'Decant lebih cepat setelah settle dan hindari menekan plunger sampai fines naik.';
          }
        }
        case 'hario_switch': {
          const style = plan.recipeStyle || 'hybrid_balanced';
          if (style === 'hybrid_balanced') {
            return 'Buka katup 15-20 detik lebih awal untuk mempersingkat kontak immersion, atau giling 0.5 step lebih kasar.';
          } else if (style === 'hybrid_bright_clean') {
            return 'Kurangi durasi capture tertutup di pertengahan seduh selama 10 detik, atau turunkan sedikit suhu air -1 C.';
          } else if (style === 'immersion_sweet') {
            return 'Buka katup 15-20 detik lebih awal, dan pastikan tidak ada bubuk kopi kering yang bypass atau suhu kettle terlalu tinggi.';
          } else if (style === 'immersion_heavy_body') {
            return 'Perpendek waktu rendam selama 30 detik, giling 0.5 step lebih kasar, dan hindari adukan atau putaran yang kuat.';
          } else if (style === 'v60_mode') {
            return 'Giling 0.5 step lebih kasar, atau kurangi tinggi tuangan untuk meminimalkan terbentuknya alur air (channeling).';
          } else if (style === 'iced_hybrid') {
            return 'Buka katup 15-20 detik lebih awal, dan periksa apakah es yang mencair telah mengencerkan target resep Anda.';
          } else if (style === 'mugen_everyday_hybrid') {
            return 'Buka katup 15 detik lebih awal, atau giling 0.5 step lebih kasar untuk mencegah ekstraksi berlebih pada MUGEN.';
          } else {
            return 'Buka katup 15-20 detik lebih awal untuk mempersingkat kontak tertutup, atau giling 0.5 step lebih kasar.';
          }
        }
        case 'moka_pot': {
          const style = plan.mokaPotStyle || 'auto';
          if (style === 'preheated_boiler') {
            return 'Gunakan air pra-didih yang bersuhu sedikit lebih rendah (90-92 C) untuk mengisi boiler, dan kecilkan api kompor.';
          } else if (style === 'low_temp_controlled') {
            return 'Kurangi panas kompor ke tingkat minimal, dan bungkus boiler dengan kain basah dingin saat blonding pertama.';
          } else if (style === 'iced_moka_concentrate') {
            return 'Angkat pot dari kompor tepat sebelum sputter pertama, dan swirl konsentrat kental di atas es.';
          } else if (style === 'high_yield_robust') {
            return 'Turunkan api kompor ke medium pada pertengahan jalan, dan dinginkan dasar pot di air mengalir dingin.';
          } else {
            return 'Turunkan heat, angkat sebelum sputter, dan dinginkan base jika flow mulai blonding.';
          }
        }
        case 'siphon': {
          const style = plan.siphonStyle || 'auto';
          if (style === 'competition_triple_agitation') {
            return 'Kurangi waktu rendam di upper chamber sebanyak 10 detik, dan lakukan adukan turbin akhir dengan sangat lembut.';
          } else if (style === 'low_temp_delicate') {
            return 'Giling kopi 0.5 step lebih kasar, dan pastikan filter kertas adaptor siphon terpasang dengan bersih.';
          } else if (style === 'high_body_fast_drawdown') {
            return 'Kurangi waktu rendam di upper chamber menjadi 35 detik, atau gunakan gilingan sedikit lebih kasar.';
          } else if (style === 'spirit_infusion_style') {
            return 'Perkecil porsi rempah atau buah kering di bowl bawah agar aroma tidak berubah menjadi tajam pahit.';
          } else {
            return 'Kurangi extract 10-15 detik atau remove heat lebih cepat sambil menjaga drawdown bersih.';
          }
        }
        case 'batch_brew': {
          const style = plan.batchBrewStyle || 'auto';
          if (style === 'heavy_batch_catering') {
            return 'Giling 0.5 step lebih kasar untuk melonggarkan bed besar, atau kurangi volume seduh mesin sebesar 50 ml.';
          } else if (style === 'bright_light_roast_batch') {
            return 'Giling 0.5 step lebih kasar, dan kurangi suhu air mesin jika roast terasa terlalu kering.';
          } else if (style === 'pre_wet_hybrid_batch') {
            return 'Kurangi porsi air panas pra-basah manual, atau giling kopi sedikit lebih kasar.';
          } else if (style === 'high_extraction_thermos') {
            return 'Giling kopi 0.5 step lebih kasar untuk melonggarkan filtrasi, dan kurangi suhu air kettle -1 C.';
          } else {
            return 'Geser grind sedikit lebih kasar atau pendekkan cycle mesin tanpa mengubah volume brew.';
          }
        }
        case 'cold_brew': {
          const style = plan.coldBrewStyle || 'auto';
          if (style === 'cold_drip_tower') {
            return 'Percepat tetesan air menjadi 1 tetes per 1 detik, atau giling 0.5 step lebih kasar.';
          } else if (style === 'double_extraction_concentrate') {
            return 'Perpendek total rendaman dingin selama 4 jam di kulkas, atau gunakan gilingan yang lebih kasar.';
          } else if (style === 'accelerated_room_temp') {
            return 'Perpendek waktu rendam di suhu ruang menjadi 6 jam, atau giling kopi 0.5 step lebih kasar.';
          } else if (style === 'japanese_slow_drip') {
            return 'Giling 0.5 step lebih kasar, dan pastikan tetesan air dingin tidak mampet di dasar kerucut.';
          } else {
            return 'Pendekkan steep 1-2 jam atau encerkan setelah filtrasi; jangan tambah agitasi.';
          }
        }
        case 'clever_dripper': {
          const style = plan.cleverDripperStyle || 'auto';
          if (style === 'reverse_water_first') {
            return 'Giling 0.5 step lebih kasar agar bubuk kopi mengendap lebih longgar, dan kurangi waktu rendam 15 detik.';
          } else if (style === 'double_stage_hybrid') {
            return 'Buka katup bloom 10 detik lebih cepat, atau perkecil porsi air pada fase rendam tertutup akhir agar tidak terlalu kering.';
          } else if (style === 'iced_clever') {
            return 'Buka katup 15 detik lebih cepat, dan pastikan es batu tidak sepenuhnya meleleh sebelum ekstraksi selesai.';
          } else if (style === 'high_dose_concentrate') {
            return 'Giling 0.5 step lebih kasar untuk mencegah penyumbatan hamparan kopi tebal, dan kurangi waktu rendam total selama 30 detik.';
          } else {
            return mayNeedTempDrop
              ? 'Geser grinder 0.5 step lebih kasar atau buka katup 10 detik lebih cepat; suhu -1 C hanya jika masih kering.'
              : 'Geser grinder 0.5 step lebih kasar dan jaga fase buka katup tetap tenang.';
          }
        }
        case 'chemex': {
          const style = plan.chemexStyle || 'auto';
          if (style === 'competition_multi_pulse') {
            return 'Giling 0.5 step lebih kasar untuk membiarkan air turun lebih cepat, dan kurangi kecepatan penuangan di pusat.';
          } else if (style === 'continuous_center_pour') {
            return 'Giling 0.5 step lebih kasar, atau turunkan suhu air sebesar -1 C untuk mengurangi ekstraksi berlebih dari kontak lambat.';
          } else if (style === 'iced_chemex') {
            return 'Giling 0.5 step lebih kasar pada fase panas, dan pastikan es batu di dalam wadah saji belum sepenuhnya mencair saat seduh selesai.';
          } else if (style === 'high_dose_heavy_body') {
            return 'Giling 0.5 sampai 1 step lebih kasar untuk melonggarkan hamparan kopi, dan kurangi porsi air di fase tengah agar air turun tidak mampet.';
          } else {
            return mayNeedTempDrop
              ? 'Geser grinder 0.5 step lebih kasar dan jaga aliran menjauh dari dinding filter; suhu -1 C hanya jika masih kering.'
              : 'Geser grinder 0.5 sampai 1 step lebih kasar dan hindari membanjiri kertas di fase akhir.';
          }
        }
        case 'april':
          return 'Geser grinder 0.5 step lebih kasar dan pendekkan pulse agar contact tidak terlalu panjang.';
        case 'kalita_wave': {
          const style = plan.kalitaWaveStyle || 'auto';
          if (style === 'competition_fast_four') {
            return 'Geser grind 0.5 step lebih kasar, dan kurangi kecepatan aliran sirkuler di tengah untuk memperlambat drawdown.';
          } else if (style === 'continuous_slow_stream') {
            return 'Geser grind 0.5 step lebih kasar, atau turunkan suhu air -1 C untuk mengurangi ekstraksi berlebih dari kontak lambat.';
          } else if (style === 'iced_wave') {
            return 'Geser grind 0.5 step lebih kasar pada fase panas, dan percepat drawdown ke es agar rasa ashar tidak keluar.';
          } else if (style === 'high_dose_concentrate') {
            return 'Geser grind 0.5 step lebih kasar untuk melonggarkan fluks, dan turunkan suhu air sebesar -1.5 C.';
          } else {
            return 'Geser grinder 0.5 step lebih kasar dan hindari menuang terlalu dekat dengan tepi fluted kertas filter.';
          }
        }
        case 'melitta':
          return 'Geser grinder 0.5 step lebih kasar dan ratakan bed lebih cepat supaya fase tengah tidak terlalu berat.';
        case 'kono':
          return 'Geser grinder 0.5 step lebih kasar dan buka jalur tuang sedikit lebih lebar di fase akhir.';
        case 'origami':
        case 'v60':
        default:
          return mayNeedTempDrop
            ? 'Geser grinder 0.5 step lebih kasar dan kurangi agitasi; suhu -1 C hanya jika masih kering.'
            : 'Geser grinder 0.5 sampai 1 step lebih kasar dan buat tuangan akhir lebih lembut.';
      }
    }

    switch (plan.methodFamily) {
      case 'espresso':
        return mayNeedTempDrop
          ? 'Move the grinder slightly coarser and reduce channeling; use -1 C only if the next shot stays bitter.'
          : 'Move the grinder slightly coarser and stop the shot at target yield.';
      case 'aeropress':
        if (plan.recipeStyle === 'inverted') {
          return 'Shorten steep by 10-15 seconds in the inverted position, reduce stir agitation, and flip gently.';
        } else if (plan.recipeStyle === 'bypass') {
          return 'Move the grind 0.5 step coarser on the concentrate, or stop the plunge strictly before the dry hiss.';
        } else if (plan.recipeStyle === 'no_bypass') {
          return 'Move the grind 0.5 to 1 step coarser to prevent choking, and shorten the steep by 15 seconds.';
        } else if (plan.recipeStyle === 'bright_clean') {
          return 'Move the grind 0.5 step coarser and ensure the plunge is extremely gentle with minimal force.';
        } else if (plan.recipeStyle === 'sweet_body') {
          return 'Stop the press strictly at the first hiss and reduce the steep duration by 10 seconds to avoid bitter ashiness.';
        } else {
          return 'Shorten steep by 10-15 seconds, reduce initial stirring, and stop the plunge strictly at the first hiss.';
        }
      case 'french_press': {
        const style = plan.recipeStyle || 'traditional';
        if (style === 'clean_decant') {
          return 'Decant the liquid earlier and more gently, making sure to leave all settled silt inside the beaker.';
        } else if (style === 'double_filter') {
          return 'Plunge even slower (at least 35-40 seconds) with feather-light force to trap fines in the double filter.';
        } else if (style === 'heavy_concentrate') {
          return 'Reduce stir agitation to 3 gentle stirs, or add warm bypass water at the end to balance the heavy cup.';
        } else if (style === 'sweet_immersion') {
          return 'Lower water temperature by -1 C, and ensure the plunge is ultra-gentle without disrupting the bed.';
        } else {
          return 'Decant earlier after settling and avoid plunging hard enough to lift fines.';
        }
      }
      case 'hario_switch': {
        const style = plan.recipeStyle || 'hybrid_balanced';
        if (style === 'hybrid_balanced') {
          return 'Open the valve 15-20 seconds earlier to shorten immersion contact, or move your grind 0.5 step coarser.';
        } else if (style === 'hybrid_bright_clean') {
          return 'Reduce the mid-brew closed capture duration by 10 seconds, or slightly lower water temperature by -1 C.';
        } else if (style === 'immersion_sweet') {
          return 'Release the valve 15-20 seconds earlier, and ensure no dry grounds bypass or kettle temperature is too high.';
        } else if (style === 'immersion_heavy_body') {
          return 'Shorten the steep time by 30 seconds, grind 0.5 step coarser, and avoid any vigorous stirring or swirling.';
        } else if (style === 'v60_mode') {
          return 'Grind 0.5 step coarser, or reduce pour height to minimize channel formation in the coffee bed.';
        } else if (style === 'iced_hybrid') {
          return 'Open the valve 15-20 seconds earlier, and check if melting ice has watered down your recipe targets.';
        } else if (style === 'mugen_everyday_hybrid') {
          return 'Open the valve 15 seconds earlier, or move the grind 0.5 step coarser to prevent low-bypass over-extraction.';
        } else {
          return 'Open the valve 15-20 seconds earlier to shorten closed contact, or move your grind 0.5 step coarser.';
        }
      }
      case 'moka_pot':
        return 'Lower heat, remove before sputter, and cool the base if flow starts blonding.';
      case 'siphon':
        return 'Shorten extraction by 10-15 seconds or remove heat earlier while keeping drawdown clean.';
      case 'batch_brew':
        return 'Move the grind slightly coarser or shorten the machine cycle without changing brew volume.';
      case 'cold_brew':
        return 'Shorten steep by 1-2 hours or dilute after filtration; do not add agitation.';
      case 'clever_dripper': {
        const style = plan.cleverDripperStyle || 'auto';
        if (style === 'reverse_water_first') {
          return 'Move the grind 0.5 step coarser to let grounds settle with larger spaces, and reduce steep time by 15 seconds.';
        } else if (style === 'double_stage_hybrid') {
          return 'Release the bloom 10 seconds earlier, or decrease the water volume of the final closed immersion stage to avoid dryness.';
        } else if (style === 'iced_clever') {
          return 'Open the release valve 15 seconds earlier, and ensure the hot concentrate drips directly onto the ice cubes for an instant chill.';
        } else if (style === 'high_dose_concentrate') {
          return 'Move the grind 0.5 step coarser to prevent the dense bed from clogging, and shorten the total steep time by 30 seconds.';
        } else {
          return mayNeedTempDrop
            ? 'Move the grinder 0.5 step coarser or release 10 seconds earlier; use -1 C only if dryness remains.'
            : 'Move the grinder 0.5 step coarser and keep the release calm.';
        }
      }
      case 'chemex': {
        const style = plan.chemexStyle || 'auto';
        if (style === 'competition_multi_pulse') {
          return 'Move the grind 0.5 step coarser, reduce center-pour velocity, and keep the late pulses off the thick paper wall.';
        } else if (style === 'continuous_center_pour') {
          return 'Move the grind 0.5 step coarser, and lower your water temperature by -1 C to reduce over-extraction from long contact.';
        } else if (style === 'iced_chemex') {
          return 'Move the grind 0.5 step coarser for the hot phase, and ensure the ice in the carafe has not fully melted by the end of the brew.';
        } else if (style === 'high_dose_heavy_body') {
          return 'Move the grind 0.5 to 1 step coarser to loosen the bed, and reduce water share in the middle phase to avoid stalling drawdown.';
        } else {
          return mayNeedTempDrop
            ? 'Move the grinder 0.5 step coarser and keep the stream off the thick filter wall; use -1 C only if dryness remains.'
            : 'Move the grinder 0.5 to 1 step coarser and avoid flooding the paper late in the brew.';
        }
      }
      case 'april':
        return 'Move the grinder 0.5 step coarser and shorten the pulses so contact does not run too long.';
      case 'kalita_wave': {
        const style = plan.kalitaWaveStyle || 'auto';
        if (style === 'competition_fast_four') {
          return 'Move the grind 0.5 step coarser, and reduce circular flow speed in the center to slow drawdown.';
        } else if (style === 'continuous_slow_stream') {
          return 'Move the grind 0.5 step coarser, or lower water temperature by -1 C to reduce over-extraction from long contact.';
        } else if (style === 'iced_wave') {
          return 'Move the grind 0.5 step coarser for the hot phase, and speed up drawdown onto ice to avoid ashiness.';
        } else if (style === 'high_dose_concentrate') {
          return 'Move the grind 0.5 step coarser to loosen the pack, and lower water temperature by -1.5 C.';
        } else {
          return 'Move the grinder 0.5 step coarser and avoid pouring too close to the fluted edges of the wave filter.';
        }
      }
      case 'melitta':
        return 'Move the grinder 0.5 step coarser and settle the bed earlier so the middle phase does not run too heavy.';
      case 'kono':
        return 'Move the grinder 0.5 step coarser and open the pour path slightly wider during the finish.';
      case 'origami':
      case 'v60':
      default:
        return mayNeedTempDrop
          ? 'Move the grinder 0.5 step coarser and reduce agitation; use -1 C only if the finish still dries out.'
          : 'Move the grinder 0.5 to 1 step coarser and keep the last pour gentler.';
    }
  })();
  return {
    taste: 'bitter',
    action,
    why: isIndonesianAiBrewLanguage(language)
      ? 'Rasa pahit dan kering di akhir biasanya berarti fase akhir seduhan menarik terlalu banyak dari partikel halus atau waktu kontak terlalu panjang.'
      : 'A bitter, drying finish here usually means the tail end of the brew is pulling too much from fines or overlong contact time.',
  };
}

function buildThinAdjustment(plan: BrewPlan, _softWater: boolean, language?: string): ExtractionTasteAdjustment {
  const action = (() => {
    if (isIndonesianAiBrewLanguage(language)) {
      switch (plan.methodFamily) {
        case 'espresso':
          return 'Cek channeling dan distribusi puck; geser grind lebih halus sedikit bila flow terlalu cepat, tanpa mengubah yield atau dose.';
        case 'aeropress':
          if (plan.recipeStyle === 'inverted') {
            return 'Gunakan gilingan sedikit lebih halus, maksimalkan adukan awal, dan pastikan tidak ada air yang menetes sebelum dibalik.';
          } else if (plan.recipeStyle === 'bypass') {
            return 'Kurangi porsi air bypass sebanyak 15-20 ml untuk meningkatkan kepekatan, dan jaga rasio concentrate tetap terkunci.';
          } else if (plan.recipeStyle === 'no_bypass') {
            return 'Perpanjang rendam 20 detik untuk ekstraksi lebih dalam, dan aduk memutar campuran kopi secara konsisten.';
          } else if (plan.recipeStyle === 'bright_clean') {
            return 'Gunakan filter kertas ganda yang dibilas sangat bersih, aduk perlahan 1 kali ekstra, dan tekan dengan sangat stabil.';
          } else if (plan.recipeStyle === 'sweet_body') {
            return 'Gunakan gilingan halus yang presisi, aduk kuat 6 kali untuk meningkatkan kontak, dan peras puck kopi sepenuhnya.';
          } else {
            return 'Gunakan no-bypass atau kurangi sedikit air bypass, perbaiki saturasi awal bed, dan tekan secara stabil.';
          }
        case 'french_press': {
          const style = plan.recipeStyle || 'traditional';
          if (style === 'clean_decant') {
            return 'Tingkatkan agitasi dengan mengaduk pelan crust 3 kali saat menit ke-4 sebelum disaring bersih.';
          } else if (style === 'double_filter') {
            return 'Geser gilingan 0.5 step lebih halus, dan berikan goyangan memutar (swirl) wadah sebelum mesh diturunkan.';
          } else if (style === 'heavy_concentrate') {
            return 'Tingkatkan dosis kopi sebesar 1-2g atau gunakan gilingan sedikit lebih halus untuk menaikkan TDS.';
          } else if (style === 'sweet_immersion') {
            return 'Aduk perlahan 1 kali ekstra saat bloom, dan biarkan rendaman tenang lebih lama 30 detik.';
          } else {
            return 'Cek tuang pisah agar tidak banyak bypass, lalu tambah waktu kontak singkat sebelum endap tanpa mengubah rasio.';
          }
        }
        case 'hario_switch': {
          const style = plan.recipeStyle || 'hybrid_balanced';
          if (style === 'hybrid_balanced') {
            return 'Perpanjang bloom/rendaman tertutup 15-20 detik, atau naikkan sedikit proporsi air panas di fase tertutup.';
          } else if (style === 'hybrid_bright_clean') {
            return 'Perpanjang capture tertutup di pertengahan seduh selama 15 detik, atau naikkan sedikit proporsi air fase tertutup.';
          } else if (style === 'immersion_sweet') {
            return 'Perpanjang total rendaman selama 25-30 detik, dan pastikan alat kaca sudah dihangatkan dengan baik.';
          } else if (style === 'immersion_heavy_body') {
            return 'Perpanjang waktu rendam 30 detik, aduk perlahan 2-3 kali saat bloom, dan gunakan suhu kettle sedikit lebih panas.';
          } else if (style === 'v60_mode') {
            return 'Giling 0.5 step lebih halus, dan gunakan tuangan pulse pendek untuk memperpanjang waktu kontak total.';
          } else if (style === 'iced_hybrid') {
            return 'Perpanjang rendam fase tertutup 20-30 detik untuk mendapat konsentrat tinggi, pastikan target es tidak terlampaui.';
          } else if (style === 'mugen_everyday_hybrid') {
            return 'Perpanjang rendam tertutup 20 detik, atau giling 0.5 step lebih halus untuk menaikkan kelarutan kopi di MUGEN.';
          } else {
            return 'Perpanjang fase rendam tertutup selama 15-20 detik untuk meningkatkan ekstraksi sari kopi sebelum buka katup.';
          }
        }
        case 'moka_pot': {
          const style = plan.mokaPotStyle || 'auto';
          if (style === 'preheated_boiler') {
            return 'Giling 0.5 step lebih halus, dan pastikan basket corong terisi penuh hingga bibir keranjang.';
          } else if (style === 'low_temp_controlled') {
            return 'Pertahankan api sangat kecil untuk memaksimalkan kontak tekanan lambat kompor, dan giling sedikit lebih halus.';
          } else if (style === 'iced_moka_concentrate') {
            return 'Giling 0.5 step lebih halus untuk meningkatkan TDS, dan kurangi es di wadah saji sebanyak 10g.';
          } else if (style === 'high_yield_robust') {
            return 'Giling 0.5 step lebih halus, dan pastikan kopi bubuk diratakan secara merata di keranjang corong.';
          } else {
            return 'Pastikan keranjang terisi rata sesuai rencana; koreksi hasil dengan panas dan distribusi, bukan bypass.';
          }
        }
        case 'siphon': {
          const style = plan.siphonStyle || 'auto';
          if (style === 'competition_triple_agitation') {
            return 'Perpanjang waktu rendam di ruang atas selama 10 detik, dan lakukan adukan zig-zag lebih aktif di fase awal.';
          } else if (style === 'low_temp_delicate') {
            return 'Giling kopi 0.5 step lebih halus, dan pertahankan agitasi spiral lembut untuk menjaga kelarutan manis.';
          } else if (style === 'high_body_fast_drawdown') {
            return 'Giling kopi sedikit lebih halus, dan aduk memutar 5 kali kuat saat air naik ke wadah atas.';
          } else if (style === 'spirit_infusion_style') {
            return 'Tingkatkan dosis kopi sebesar 1g, dan pastikan filter kain siphon terpasang dengan kencang.';
          } else {
            return 'Tambah ekstraksi singkat di ruang atas dan jaga air turun tetap bersih tanpa mengubah rasio.';
          }
        }
        case 'batch_brew': {
          const style = plan.batchBrewStyle || 'auto';
          if (style === 'heavy_batch_catering') {
            return 'Giling 0.5 step lebih halus untuk memperlama waktu kontak, atau naikkan dosis kopi sebesar 3g.';
          } else if (style === 'bright_light_roast_batch') {
            return 'Giling sedikit lebih halus, dan pastikan semprotan air membasahi seluruh hamparan kopi secara merata.';
          } else if (style === 'pre_wet_hybrid_batch') {
            return 'Perpanjang durasi pra-basah (pre-wet) manual kopi bubuk selama 15 detik sebelum mesin dinyalakan.';
          } else if (style === 'high_extraction_thermos') {
            return 'Giling kopi 0.5 step lebih halus, dan pastikan kepala semprot mesin menyiram merata.';
          } else {
            return 'Cek bypass keranjang, pola semprotan, dan aduk batch sebelum disajikan supaya konsentrasi merata.';
          }
        }
        case 'cold_brew': {
          const style = plan.coldBrewStyle || 'auto';
          if (style === 'cold_drip_tower') {
            return 'Giling kopi 0.5 step lebih halus pada kolom kaca, dan perlambat tetesan air menjadi 1 tetes per 2 detik.';
          } else if (style === 'double_extraction_concentrate') {
            return 'Tingkatkan dosis kopi kasar sebesar 5g, dan aduk campuran kopi lebih aktif saat awal pencampuran.';
          } else if (style === 'accelerated_room_temp') {
            return 'Giling kopi 0.5 step lebih halus, dan pastikan kopi basah merata sejak awal.';
          } else if (style === 'japanese_slow_drip') {
            return 'Giling kopi sedikit lebih halus, dan kurangi volume es batu di wadah saji sebanyak 10g.';
          } else {
            return 'Perbaiki saturasi awal dan filtrasi, lalu sajikan pada rencana dilusi yang sama.';
          }
        }
        case 'clever_dripper': {
          const style = plan.cleverDripperStyle || 'auto';
          if (style === 'reverse_water_first') {
            return 'Geser gilingan sedikit lebih halus, dan biarkan rendaman tenang lebih lama 15 detik agar air mengekstrak sari kopi dengan merata.';
          } else if (style === 'double_stage_hybrid') {
            return 'Tutup katup bloom 15 detik lebih lama, atau geser sedikit gilingan lebih halus untuk menaikkan TDS konsentrat.';
          } else if (style === 'iced_clever') {
            return 'Perpanjang rendaman panas tertutup 20 detik untuk menghasilkan konsentrat pekat, pastikan es batu ditimbang secara akurat.';
          } else if (style === 'high_dose_concentrate') {
            return 'Geser grind 0.5 step lebih halus, aduk melingkar lembut di fase awal, dan hindari penambahan air bypass (dilusi) di akhir.';
          } else {
            return 'Pertahankan rasio dan tambah sedikit waktu kontak saat rendam sebelum buka katup, bukan agitasi ekstra.';
          }
        }
        case 'chemex': {
          const style = plan.chemexStyle || 'auto';
          if (style === 'competition_multi_pulse') {
            return 'Perlambat tuangan pulse keempat dan kelima sebanyak 5 detik untuk memperpanjang contact time di dalam kertas tebal.';
          } else if (style === 'continuous_center_pour') {
            return 'Pertahankan aliran stream tetap stabil tanpa jeda, dan pastikan tinggi kolom air konstan untuk memaksimalkan kelarutan di pusat bed.';
          } else if (style === 'iced_chemex') {
            return 'Perpanjang durasi bloom panas selama 15 detik, dan pastikan aliran air panas dituang secara lambat dan sempit di pusat bed.';
          } else if (style === 'high_dose_heavy_body') {
            return 'Giling sedikit lebih halus, dan tuangkan air lebih lambat untuk memaksimalkan kontak dengan dosis besar, pertahankan murni tanpa dilusi.';
          } else {
            return 'Pertahankan rasio yang sama dan buat build pour sedikit lebih stabil di tengah tanpa membanjiri filter.';
          }
        }
        case 'april':
          return 'Pertahankan rasio dan biarkan pulse kedua membawa contact sedikit lebih penuh tanpa menambah jeda.';
        case 'kalita_wave': {
          const style = plan.kalitaWaveStyle || 'auto';
          if (style === 'competition_fast_four') {
            return 'Perlambat tuangan pulse ketiga sebanyak 10 detik untuk menambah contact time tanpa menambah bypass pinggir.';
          } else if (style === 'continuous_slow_stream') {
            return 'Pertahankan aliran tetap stabil tanpa interupsi, dan pastikan tinggi air konstan untuk meningkatkan ekstraksi padat.';
          } else if (style === 'iced_wave') {
            return 'Perpanjang waktu bloom panas selama 10 detik, dan kurangi sedikit volume air panas sambil menjaga berat es tetap.';
          } else if (style === 'high_dose_concentrate') {
            return 'Geser grind 0.5 step lebih halus, dan tuang sangat perlahan dekat pusat untuk menghindari bypass celah samping.';
          } else {
            return 'Pertahankan rasio dan jaga air tuangan tetap terpusat di tengah agar ekstraksi terekstrak merata tanpa bypass air samping.';
          }
        }
        case 'melitta':
          return 'Pertahankan rasio dan geser sedikit lebih banyak contact ke fase tengah sambil menjaga bed tetap rata.';
        case 'v60':
        case 'origami':
        case 'kono':
        default:
          return 'Pertahankan rasio yang sama dan buat tuangan tengah sedikit lebih penuh untuk menaikkan contact tanpa menyeret finish.';
      }
    }

    switch (plan.methodFamily) {
      case 'espresso':
        return 'Check channeling and puck distribution; move the grind slightly finer if flow runs fast, without changing yield or dose.';
      case 'aeropress':
        if (plan.recipeStyle === 'inverted') {
          return 'Use a slightly finer grind, maximize initial stirring, and ensure zero premature leakage before the flip.';
        } else if (plan.recipeStyle === 'bypass') {
          return 'Reduce the bypass water volume by 15-20 ml to increase density, keeping the concentrate ratio locked.';
        } else if (plan.recipeStyle === 'no_bypass') {
          return 'Extend steep by 20 seconds for deeper extraction, and use a consistent circular stir to mix the slurry.';
        } else if (plan.recipeStyle === 'bright_clean') {
          return 'Use double rinsed filters, add 1 extra gentle stir, and keep the plunge extremely stable.';
        } else if (plan.recipeStyle === 'sweet_body') {
          return 'Use a precise fine grind, stir vigorously 6 times to maximize contact, and plunge fully down to squeeze the puck.';
        } else {
          return 'Choose no-bypass or reduce bypass volume slightly, improve initial saturation, and press steadily.';
        }
      case 'french_press': {
        const style = plan.recipeStyle || 'traditional';
        if (style === 'clean_decant') {
          return 'Increase agitation by gently stirring the crust 3 times at the 4-minute mark before skimming.';
        } else if (style === 'double_filter') {
          return 'Move the grind 0.5 step finer, and give the beaker a gentle swirl before plunging.';
        } else if (style === 'heavy_concentrate') {
          return 'Increase coffee dose by 1-2g or use a slightly finer grind to push total dissolved solids (TDS).';
        } else if (style === 'sweet_immersion') {
          return 'Stir gently 1 extra time during bloom, and let the quiet steep run 30 seconds longer.';
        } else {
          return 'Check decanting for bypass, then add a brief contact hold before settling without changing the ratio.';
        }
      }
      case 'hario_switch': {
        const style = plan.recipeStyle || 'hybrid_balanced';
        if (style === 'hybrid_balanced') {
          return 'Extend the closed bloom/immersion by 15-20 seconds, or slightly increase hot water share in the closed phase.';
        } else if (style === 'hybrid_bright_clean') {
          return 'Extend the mid-brew closed capture by 15 seconds, or increase the closed phase water proportion slightly.';
        } else if (style === 'immersion_sweet') {
          return 'Extend the total immersion steep by 25-30 seconds, and ensure you preheated the glass brewer thoroughly.';
        } else if (style === 'immersion_heavy_body') {
          return 'Extend steep time by 30 seconds, stir 2-3 times gently during bloom, and use a slightly warmer kettle temperature.';
        } else if (style === 'v60_mode') {
          return 'Grind 0.5 step finer, and use shorter pulse pours to increase total contact time.';
        } else if (style === 'iced_hybrid') {
          return 'Extend closed contact steep by 20-30 seconds to brew a higher concentrate, ensuring ice target is not exceeded.';
        } else if (style === 'mugen_everyday_hybrid') {
          return 'Extend closed steep by 20 seconds, or grind 0.5 step finer to increase solubles capture in MUGEN.';
        } else {
          return 'Extend closed steep phase by 15-20 seconds to raise solubles extraction before releasing.';
        }
      }
      case 'moka_pot':
        return 'Make sure the basket is full and level; correct output with heat, not bypass.';
      case 'siphon':
        return 'Add a brief upper-chamber extraction hold and keep drawdown clean without changing the ratio.';
      case 'batch_brew':
        return 'Check basket bypass, spray pattern, and batch mixing before service so concentration is even.';
      case 'cold_brew':
        return 'Improve initial saturation and filtration, then serve at the same planned dilution.';
      case 'clever_dripper': {
        const style = plan.cleverDripperStyle || 'auto';
        if (style === 'reverse_water_first') {
          return 'Move the grind slightly finer, and extend the steep by 15 seconds to let water dissolve soluble coffee layers evenly.';
        } else if (style === 'double_stage_hybrid') {
          return 'Keep the valve closed 15 seconds longer during bloom, or move your grind slightly finer to raise concentrate TDS.';
        } else if (style === 'iced_clever') {
          return 'Extend hot closed steep by 20 seconds to brew a higher concentrate, ensuring the ice target is weighed accurately.';
        } else if (style === 'high_dose_concentrate') {
          return 'Move the grind 0.5 step finer, stir gently in circles during the early phase, and avoid adding bypass water at the end.';
        } else {
          return 'Keep the same ratio and add a touch more steep contact before release instead of extra agitation.';
        }
      }
      case 'chemex': {
        const style = plan.chemexStyle || 'auto';
        if (style === 'competition_multi_pulse') {
          return 'Slow down the fourth and fifth pulse pours by 5 seconds to extend contact time inside the thick paper.';
        } else if (style === 'continuous_center_pour') {
          return 'Keep the stream completely steady without interruption, and ensure a constant water column height to maximize center bed solubility.';
        } else if (style === 'iced_chemex') {
          return 'Extend the hot bloom duration by 15 seconds, and ensure the hot stream is poured slowly and narrowly in the center.';
        } else if (style === 'high_dose_heavy_body') {
          return 'Move the grind slightly finer, and pour even slower to maximize contact with the large dose, keeping it neat without bypass.';
        } else {
          return 'Keep the same ratio and make the build pour steadier through the middle without flooding the filter.';
        }
      }
      case 'april':
        return 'Keep the same ratio and let the second pulse carry slightly more contact without longer resets.';
      case 'kalita_wave': {
        const style = plan.kalitaWaveStyle || 'auto';
        if (style === 'competition_fast_four') {
          return 'Slow down the third pulse pour by 10 seconds to add contact time without increasing side bypass.';
        } else if (style === 'continuous_slow_stream') {
          return 'Keep the flow completely steady without interruption, and ensure a constant water height to increase dense extraction.';
        } else if (style === 'iced_wave') {
          return 'Extend hot bloom by 10 seconds, and slightly reduce hot water volume while keeping ice weight constant.';
        } else if (style === 'high_dose_concentrate') {
          return 'Move the grind 0.5 step finer, and pour very slowly near the center to avoid fluted edge bypass.';
        } else {
          return 'Keep the same ratio and keep the pour stream tightly centered to ensure even extraction without side bypass water.';
        }
      }
      case 'melitta':
        return 'Keep the same ratio and shift a little more contact into the middle phase while the bed stays level.';
      case 'v60':
      case 'origami':
      case 'kono':
      default:
        return 'Keep the same ratio and make the middle pour slightly fuller to raise contact without dragging the finish.';
    }
  })();
  return {
    taste: 'thin',
    action,
    why: isIndonesianAiBrewLanguage(language)
      ? 'Cangkir yang tipis dari setup ini biasanya datang dari bypass, flow terlalu cepat, atau contact tengah kurang stabil, bukan alasan untuk langsung mengubah rasio/dosis.'
      : 'Thin cups from this setup usually come from bypass, fast flow, or unstable middle contact, not a reason to change ratio/dose first.',
  };
}

export function buildExtractionFinisher(plan: BrewPlan, language?: string): BrewExtractionFinisher {
  const hardToExtract = needsMoreExtraction(plan);
  const easyToExtract = extractsEasily(plan);
  const highBufferWater = hasHighBufferWater(plan);
  const softWater = hasSoftWater(plan);

  const finisher = {
    finalRead: buildFinalRead(plan, hardToExtract, easyToExtract, highBufferWater, softWater, language),
    recipeReasoning: buildRecipeReasoning(plan, hardToExtract, easyToExtract, highBufferWater, softWater, language),
    controlPoints: buildControlPoints(plan, language),
    adjustments: [
      buildSourAdjustment(plan, hardToExtract, highBufferWater, language),
      buildBitterAdjustment(plan, easyToExtract, language),
      buildThinAdjustment(plan, softWater, language),
    ],
  };
  if (!isIndonesianAiBrewLanguage(language)) return finisher;
  return {
    finalRead: polishFinisherText(finisher.finalRead, language),
    recipeReasoning: finisher.recipeReasoning.map((item) => polishFinisherText(item, language)),
    controlPoints: finisher.controlPoints.map((item) => polishFinisherText(item, language)),
    adjustments: finisher.adjustments.map((item) => ({
      ...item,
      action: polishFinisherText(item.action, language),
      why: polishFinisherText(item.why, language),
    })),
  };
}
