import type { BrewPlan } from './types';
import {
  formatAiBrewTime,
  isIndonesianAiBrewLanguage,
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

function formatTime(totalSeconds: number) {
  return formatAiBrewTime(totalSeconds);
}

function getPlanTasteTimeSeconds(plan: BrewPlan) {
  return Math.max(0, Math.round(plan.extractionEndSeconds ?? plan.totalTimeSeconds));
}

const POUR_OVER_TIME_LABEL_FAMILIES = new Set<BrewPlan['methodFamily']>(['v60', 'chemex', 'kalita_wave', 'origami', 'april', 'melitta', 'kono']);

function getPlanTasteTimeLabel(plan: BrewPlan, language?: string) {
  const id = isIndonesianAiBrewLanguage(language);
  if (plan.methodFamily === 'espresso') return id ? 'waktu shot' : 'shot time';
  if (plan.methodFamily === 'cold_brew') return id ? 'rendam dingin' : 'cold steep';
  if (plan.methodFamily === 'french_press' || plan.methodFamily === 'clever_dripper') return id ? 'waktu rendam' : 'steep time';
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
      reasoning.push(`KH ${plan.waterMinerals.alkalinityPpm} ppm akan menahan acidity, jadi jaga drawdown tuntas dan grind tetap rapi.`);
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
    reasoning.push(`KH ${plan.waterMinerals.alkalinityPpm} ppm will cushion acidity, so keep drawdown complete and grind tidy.`);
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
  const lowerBound = Math.max(plan.totalTimeSeconds - 15, 60);
  const upperBound = plan.totalTimeSeconds + 15;
  const methodPoint = (() => {
    if (isIndonesianAiBrewLanguage(language)) {
      switch (plan.methodFamily) {
        case 'espresso':
          return 'Pantau yield, flow, dan stop cue shot; jangan menambah air seperti filter manual.';
        case 'aeropress':
          return 'Pantau steep, jumlah stir, durasi press, dan stop sebelum hiss terakhir dipaksa.';
        case 'french_press':
          return 'Pantau immersion, settle fines, dan decant; jangan cari drawdown atau pulse tuang.';
        case 'moka_pot':
          return 'Pantau basket rata, air boiler di bawah valve, heat stabil, dan stop sebelum sputter.';
        case 'siphon':
          return 'Pantau draw-up, stir singkat, extract di upper chamber, remove heat, lalu drawdown bersih.';
        case 'batch_brew':
          return 'Pantau dose per liter, volume mesin, spray pattern, drawdown, dan aduk batch sebelum service.';
        case 'cold_brew':
          return 'Pantau saturasi air dingin, steep panjang, lalu filtrasi bersih; jangan pakai workflow hot.';
        case 'chemex':
          return 'Jaga stream menjauh dari dinding filter tebal agar flow tetap terbuka sampai finish.';
        case 'clever_dripper':
          return 'Biarkan immersion tetap tenang lalu buka release dengan bersih tanpa mengaduk bed.';
        case 'april':
          return 'Jaga pulse tetap pendek dan rendah agitasi; jangan memanjangkan jeda hanya untuk mengejar body.';
        case 'kalita_wave':
          return 'Pastikan bed tetap rata di fase tengah; kalau bed miring, koreksi aliran sebelum ubah grind.';
        case 'melitta':
          return 'Jaga bed trapezoid tetap rata dan measured; hindari membebani satu sisi kertas di akhir.';
        case 'kono':
          return 'Pertahankan jalur tuang lebih terpusat di tengah supaya sweet contact tetap stabil.';
        case 'origami':
          return 'Jaga pulse tetap ringkas dan ringan agar flow cone yang cepat tidak berubah jadi bypass.';
        case 'v60':
        default:
          return 'Jaga stream tetap center-to-mid dan jangan mengejar dinding filter di fase akhir.';
      }
    }

    switch (plan.methodFamily) {
      case 'espresso':
        return 'Watch yield, flow, and shot stop cue; do not add water like a manual filter brew.';
      case 'aeropress':
        return 'Watch steep, stir count, press duration, and stop before forcing the final hiss.';
      case 'french_press':
        return 'Watch immersion, fines settling, and decanting; do not look for drawdown or pour pulses.';
      case 'moka_pot':
        return 'Watch a level basket, boiler water below the valve, stable heat, and stop before sputter.';
      case 'siphon':
        return 'Watch draw-up, brief stirring, upper-chamber extraction, heat removal, and clean drawdown.';
      case 'batch_brew':
        return 'Watch dose per liter, machine volume, spray pattern, drawdown, and batch mixing before service.';
      case 'cold_brew':
        return 'Watch cool-water saturation, long steeping, then clean filtration; do not use a hot workflow.';
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
          return 'Tambah steep 10-15 detik atau stir 1-2 kali lebih banyak sebelum press.';
        case 'french_press':
          return 'Tambah steep 20-30 detik sebelum settle, lalu tetap decant bersih.';
        case 'moka_pot':
          return 'Gunakan heat lebih stabil dan hentikan tepat sebelum sputter; jika masih asam, grind sedikit lebih halus.';
        case 'siphon':
          return 'Tambah extract 10-15 detik di upper chamber dan pertahankan stir singkat.';
        case 'batch_brew':
          return 'Grind sedikit lebih halus dan cek distribusi spray; suhu +1 C hanya jika cup berikutnya masih asam.';
        case 'cold_brew':
          return 'Tambah steep 1-2 jam atau perbaiki saturasi awal tanpa mengubah rasio concentrate.';
        case 'clever_dripper':
          return 'Tambahkan steep 10-15 detik sebelum release, atau jika steep sudah terasa pas, geser grinder 0.5 step lebih halus.';
        case 'chemex':
          return mayNeedTempNudge
            ? 'Geser grinder 0.5 step lebih halus, beri bloom sedikit lebih lama, lalu suhu +1 C hanya jika seduhan berikutnya masih asam.'
            : 'Geser grinder 0.5 step lebih halus dan beri bloom sedikit lebih lama sebelum build pour.';
        case 'april':
          return 'Geser grinder 0.5 step lebih halus dan buat pulse tengah sedikit lebih penuh tanpa menambah swirl.';
        case 'kalita_wave':
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
        return 'Add 10-15 seconds of steep or 1-2 more gentle stirs before pressing.';
      case 'french_press':
        return 'Add 20-30 seconds of steep before settling, then still decant cleanly.';
      case 'moka_pot':
        return 'Use steadier heat and stop just before sputter; if still sour, move the grind slightly finer.';
      case 'siphon':
        return 'Add 10-15 seconds of upper-chamber extraction and keep the stir brief.';
      case 'batch_brew':
        return 'Grind slightly finer and check spray distribution; use +1 C only if the next cup still tastes sour.';
      case 'cold_brew':
        return 'Add 1-2 hours of steep or improve initial saturation without changing the concentrate ratio.';
      case 'clever_dripper':
        return 'Add 10-15 seconds of steep before release, or if steep already feels right, move the grinder 0.5 step finer.';
      case 'chemex':
        return mayNeedTempNudge
          ? 'Move the grinder 0.5 step finer, give the bloom slightly more time, then use +1 C only if the next brew stays sour.'
          : 'Move the grinder 0.5 step finer and give the bloom slightly more time before the build pour.';
      case 'april':
        return 'Move the grinder 0.5 step finer and let the middle pulse land slightly fuller without adding swirl.';
      case 'kalita_wave':
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
          return 'Pendekkan steep 10-15 detik, kurangi stir, dan press tanpa memaksa hiss.';
        case 'french_press':
          return 'Decant lebih cepat setelah settle dan hindari menekan plunger sampai fines naik.';
        case 'moka_pot':
          return 'Turunkan heat, angkat sebelum sputter, dan dinginkan base jika flow mulai blonding.';
        case 'siphon':
          return 'Kurangi extract 10-15 detik atau remove heat lebih cepat sambil menjaga drawdown bersih.';
        case 'batch_brew':
          return 'Geser grind sedikit lebih kasar atau pendekkan cycle mesin tanpa mengubah volume brew.';
        case 'cold_brew':
          return 'Pendekkan steep 1-2 jam atau encerkan setelah filtrasi; jangan tambah agitasi.';
        case 'clever_dripper':
          return mayNeedTempDrop
            ? 'Geser grinder 0.5 step lebih kasar atau release 10 detik lebih cepat; suhu -1 C hanya jika masih kering.'
            : 'Geser grinder 0.5 step lebih kasar dan jaga release tetap tenang.';
        case 'chemex':
          return mayNeedTempDrop
            ? 'Geser grinder 0.5 step lebih kasar dan jaga stream menjauh dari dinding filter; suhu -1 C hanya jika masih kering.'
            : 'Geser grinder 0.5 sampai 1 step lebih kasar dan hindari membanjiri kertas di fase akhir.';
        case 'april':
          return 'Geser grinder 0.5 step lebih kasar dan pendekkan pulse agar contact tidak terlalu panjang.';
        case 'kalita_wave':
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
        return 'Shorten steep by 10-15 seconds, reduce stirring, and press without forcing the hiss.';
      case 'french_press':
        return 'Decant earlier after settling and avoid plunging hard enough to lift fines.';
      case 'moka_pot':
        return 'Lower heat, remove before sputter, and cool the base if flow starts blonding.';
      case 'siphon':
        return 'Shorten extraction by 10-15 seconds or remove heat earlier while keeping drawdown clean.';
      case 'batch_brew':
        return 'Move the grind slightly coarser or shorten the machine cycle without changing brew volume.';
      case 'cold_brew':
        return 'Shorten steep by 1-2 hours or dilute after filtration; do not add agitation.';
      case 'clever_dripper':
        return mayNeedTempDrop
          ? 'Move the grinder 0.5 step coarser or release 10 seconds earlier; use -1 C only if dryness remains.'
          : 'Move the grinder 0.5 step coarser and keep the release calm.';
      case 'chemex':
        return mayNeedTempDrop
          ? 'Move the grinder 0.5 step coarser and keep the stream off the thick filter wall; use -1 C only if dryness remains.'
          : 'Move the grinder 0.5 to 1 step coarser and avoid flooding the paper late in the brew.';
      case 'april':
        return 'Move the grinder 0.5 step coarser and shorten the pulses so contact does not run too long.';
      case 'kalita_wave':
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
      ? 'Rasa pahit dan kering di akhir biasanya berarti fase akhir seduhan menarik terlalu banyak dari fines atau contact time terlalu panjang.'
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
          return 'Pilih no-bypass, tingkatkan saturasi awal, dan press stabil tanpa mengubah rasio concentrate.';
        case 'french_press':
          return 'Cek decant agar tidak banyak bypass, lalu tambah contact singkat sebelum settle tanpa mengubah rasio.';
        case 'moka_pot':
          return 'Pastikan basket terisi rata sesuai plan; koreksi output dengan heat dan distribusi, bukan bypass.';
        case 'siphon':
          return 'Tambah extract singkat di upper chamber dan jaga drawdown bersih tanpa mengubah rasio.';
        case 'batch_brew':
          return 'Cek bypass basket, spray pattern, dan aduk batch sebelum service supaya konsentrasi merata.';
        case 'cold_brew':
          return 'Perbaiki saturasi awal dan filtrasi, lalu sajikan pada dilution plan yang sama.';
        case 'clever_dripper':
          return 'Pertahankan rasio dan tambah sedikit contact di steep sebelum release, bukan agitasi ekstra.';
        case 'chemex':
          return 'Pertahankan rasio yang sama dan buat build pour sedikit lebih stabil di tengah tanpa membanjiri filter.';
        case 'april':
          return 'Pertahankan rasio dan biarkan pulse kedua membawa contact sedikit lebih penuh tanpa menambah jeda.';
        case 'kalita_wave':
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
        return 'Choose no-bypass, improve initial saturation, and press steadily without changing the concentrate ratio.';
      case 'french_press':
        return 'Check decanting for bypass, then add a brief contact hold before settling without changing the ratio.';
      case 'moka_pot':
        return 'Make sure the basket is full and level; correct output with heat, not bypass.';
      case 'siphon':
        return 'Add a brief upper-chamber extraction hold and keep drawdown clean without changing the ratio.';
      case 'batch_brew':
        return 'Check basket bypass, spray pattern, and batch mixing before service so concentration is even.';
      case 'cold_brew':
        return 'Improve initial saturation and filtration, then serve at the same planned dilution.';
      case 'clever_dripper':
        return 'Keep the same ratio and add a touch more steep contact before release instead of extra agitation.';
      case 'chemex':
        return 'Keep the same ratio and make the build pour steadier through the middle without flooding the filter.';
      case 'april':
        return 'Keep the same ratio and let the second pulse carry slightly more contact without longer resets.';
      case 'kalita_wave':
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

  return {
    finalRead: buildFinalRead(plan, hardToExtract, easyToExtract, highBufferWater, softWater, language),
    recipeReasoning: buildRecipeReasoning(plan, hardToExtract, easyToExtract, highBufferWater, softWater, language),
    controlPoints: buildControlPoints(plan, language),
    adjustments: [
      buildSourAdjustment(plan, hardToExtract, highBufferWater, language),
      buildBitterAdjustment(plan, easyToExtract, language),
      buildThinAdjustment(plan, softWater, language),
    ],
  };
}
