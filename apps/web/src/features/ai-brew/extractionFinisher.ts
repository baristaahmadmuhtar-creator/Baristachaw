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
    return `Dibangun untuk ${targetTone} dengan rasio, profil air, dan jendela drawdown yang stabil.`;
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
  return `Built for ${targetTone} with a stable ratio, water profile, and drawdown window.`;
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
        : `${plan.totalWaterMl} ml pada ${plan.waterTempC} C menargetkan finish ${formatTime(plan.totalTimeSeconds)} untuk ${plan.dripper.name}.`,
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
      : `${plan.totalWaterMl} ml at ${plan.waterTempC} C targets a ${formatTime(plan.totalTimeSeconds)} finish for ${plan.dripper.name}.`,
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
      `Selesaikan antara ${formatTime(lowerBound)} dan ${formatTime(upperBound)}. Perbaiki flow sebelum mengubah rasio.`,
      methodPoint,
      plan.waterMode === 'manual' || plan.waterCustomized
        ? 'Jangan ubah air dan grind dalam ronde cupping yang sama.'
        : `Pertahankan ${plan.waterBrandLabel || 'air yang dipilih'} tetap sama saat membandingkan perubahan rasa.`,
    ];
  }

  return [
    `Finish between ${formatTime(lowerBound)} and ${formatTime(upperBound)}. Fix flow before changing ratio.`,
    methodPoint,
    plan.waterMode === 'manual' || plan.waterCustomized
      ? 'Do not change water and grind in the same tasting round.'
      : `Keep ${plan.waterBrandLabel || 'the selected water'} constant while comparing taste changes.`,
  ];
}

function buildSourAdjustment(plan: BrewPlan, hardToExtract: boolean, highBufferWater: boolean, language?: string): ExtractionTasteAdjustment {
  const useTempFirst = plan.waterTempC <= 90 || (hardToExtract && plan.waterTempC < 93);
  const action = (() => {
    if (isIndonesianAiBrewLanguage(language)) {
      switch (plan.methodFamily) {
        case 'clever_dripper':
          return 'Tambahkan steep 10-15 detik sebelum release, atau jika steep sudah terasa pas, geser grinder 0.5 step lebih halus.';
        case 'chemex':
          return useTempFirst
            ? 'Naikkan suhu air 1 C dan biarkan bloom membuka 5-10 detik lebih lama sambil menjaga stream menjauh dari dinding filter.'
            : 'Geser grinder 0.5 step lebih halus dan beri bloom sedikit lebih lama sebelum build pour.';
        case 'april':
          return 'Geser grinder 0.5 step lebih halus dan buat pulse tengah sedikit lebih penuh tanpa menambah swirl.';
        case 'kalita_wave':
        case 'melitta':
          return 'Geser grinder 0.5 step lebih halus dan buat fase tengah sedikit lebih penuh sambil menjaga bed tetap rata.';
        case 'kono':
          return 'Geser grinder 0.5 step lebih halus atau tahan contact tengah 5-8 detik lebih lama sebelum finish.';
        case 'origami':
          return useTempFirst
            ? 'Naikkan suhu air 1 C dan pertahankan pulse tetap ringkas.'
            : 'Geser grinder 0.5 step lebih halus dan tetap jaga pulse singkat.';
        case 'v60':
        default:
          return useTempFirst
            ? 'Naikkan suhu air 1 C untuk seduhan berikutnya dan pertahankan grind yang sama.'
            : 'Geser grinder 0.5 sampai 1 step lebih halus dan pertahankan pola tuang yang sama.';
      }
    }

    switch (plan.methodFamily) {
      case 'clever_dripper':
        return 'Add 10-15 seconds of steep before release, or if steep already feels right, move the grinder 0.5 step finer.';
      case 'chemex':
        return useTempFirst
          ? 'Raise water temperature by 1 C and let the bloom open 5-10 seconds longer while keeping the stream off the filter wall.'
          : 'Move the grinder 0.5 step finer and give the bloom slightly more time before the build pour.';
      case 'april':
        return 'Move the grinder 0.5 step finer and let the middle pulse land slightly fuller without adding swirl.';
      case 'kalita_wave':
      case 'melitta':
        return 'Move the grinder 0.5 step finer and make the middle phase slightly fuller while keeping the bed level.';
      case 'kono':
        return 'Move the grinder 0.5 step finer or hold the centered middle contact 5-8 seconds longer before the finish.';
      case 'origami':
        return useTempFirst
          ? 'Raise water temperature by 1 C and keep the pulses compact.'
          : 'Move the grinder 0.5 step finer and keep the pulses short.';
      case 'v60':
      default:
        return useTempFirst
          ? 'Raise water temperature by 1 C for the next brew and keep the same grind.'
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
  const coolFirst = (easyToExtract && plan.waterTempC >= 91) || plan.waterTempC >= 94;
  const action = (() => {
    if (isIndonesianAiBrewLanguage(language)) {
      switch (plan.methodFamily) {
        case 'clever_dripper':
          return coolFirst
            ? 'Turunkan suhu air 1 C atau release 10 detik lebih cepat sebelum mengubah grind.'
            : 'Geser grinder 0.5 step lebih kasar dan jaga release tetap tenang.';
        case 'chemex':
          return coolFirst
            ? 'Turunkan suhu air 1 C dan jaga stream menjauh dari dinding filter tebal di fase build.'
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
          return coolFirst
            ? 'Turunkan suhu air 1 C sebelum mengubah grind.'
            : 'Geser grinder 0.5 sampai 1 step lebih kasar dan buat tuangan akhir lebih lembut.';
      }
    }

    switch (plan.methodFamily) {
      case 'clever_dripper':
        return coolFirst
          ? 'Lower water temperature by 1 C or release 10 seconds earlier before changing the grind.'
          : 'Move the grinder 0.5 step coarser and keep the release calm.';
      case 'chemex':
        return coolFirst
          ? 'Lower water temperature by 1 C and keep the stream off the thick filter wall during the build.'
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
        return coolFirst
          ? 'Lower water temperature by 1 C before changing the grind.'
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

function buildThinAdjustment(plan: BrewPlan, softWater: boolean, language?: string): ExtractionTasteAdjustment {
  const tightenRatioFirst = plan.recommendedRatio >= 16.2 || plan.brewMode === 'iced' || softWater;
  const action = (() => {
    if (isIndonesianAiBrewLanguage(language)) {
      switch (plan.methodFamily) {
        case 'clever_dripper':
          return tightenRatioFirst
            ? 'Perketat rasio 0.3 sampai 0.5 dan pertahankan steep yang sama untuk satu seduhan uji.'
            : 'Pertahankan rasio dan tambah sedikit contact di steep sebelum release, bukan agitasi ekstra.';
        case 'chemex':
          return tightenRatioFirst
            ? 'Perketat rasio 0.3 sampai 0.5 dan pertahankan grind yang sama untuk satu seduhan uji.'
            : 'Pertahankan rasio yang sama dan buat build pour sedikit lebih stabil di tengah tanpa membanjiri filter.';
        case 'april':
          return tightenRatioFirst
            ? 'Perketat rasio 0.3 dan pertahankan grind yang sama.'
            : 'Pertahankan rasio dan biarkan pulse kedua membawa sedikit volume lebih besar tanpa menambah jeda.';
        case 'kalita_wave':
        case 'melitta':
          return tightenRatioFirst
            ? 'Perketat rasio 0.3 sampai 0.5 dan pertahankan grind yang sama untuk satu seduhan uji.'
            : 'Pertahankan rasio dan geser sedikit lebih banyak air ke fase tengah sambil menjaga bed tetap rata.';
        case 'v60':
        case 'origami':
        case 'kono':
        default:
          return tightenRatioFirst
            ? 'Perketat rasio seduh 0.3 sampai 0.5 dan pertahankan grind yang sama untuk satu seduhan uji.'
            : 'Pertahankan rasio yang sama dan buat tuangan tengah sedikit lebih penuh untuk menaikkan konsentrasi tanpa menyeret finish.';
      }
    }

    switch (plan.methodFamily) {
      case 'clever_dripper':
        return tightenRatioFirst
          ? 'Tighten the ratio by 0.3 to 0.5 and keep the same steep time for one test brew.'
          : 'Keep the same ratio and add a touch more steep contact before release instead of extra agitation.';
      case 'chemex':
        return tightenRatioFirst
          ? 'Tighten the ratio by 0.3 to 0.5 and keep the same grind for one test brew.'
          : 'Keep the same ratio and make the build pour steadier through the middle without flooding the filter.';
      case 'april':
        return tightenRatioFirst
          ? 'Tighten the ratio by 0.3 and keep the same grind.'
          : 'Keep the same ratio and let the second pulse carry slightly more volume without longer resets.';
      case 'kalita_wave':
      case 'melitta':
        return tightenRatioFirst
          ? 'Tighten the ratio by 0.3 to 0.5 and keep the same grind for one test brew.'
          : 'Keep the same ratio and shift a little more water into the middle phase while the bed stays level.';
      case 'v60':
      case 'origami':
      case 'kono':
      default:
        return tightenRatioFirst
          ? 'Tighten the brew ratio by 0.3 to 0.5 and keep the same grind for one test brew.'
          : 'Keep the same ratio and make the middle pour slightly fuller to raise concentration without dragging the finish.';
    }
  })();
  return {
    taste: 'thin',
    action,
    why: isIndonesianAiBrewLanguage(language)
      ? 'Cangkir yang tipis dari setup ini biasanya datang dari konsentrasi rendah atau bypass, bukan hanya dari ukuran grind.'
      : 'Thin cups from this setup usually come from low concentration or bypass, not only from grind size.',
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
