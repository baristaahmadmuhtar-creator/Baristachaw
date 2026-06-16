import type { BrewPlan, BrewTasteFeedback, BrewTasteFeedbackCorrection, BrewTasteFeedbackRating } from './types';

export type AiBrewConfidenceTone = 'blue' | 'emerald' | 'amber' | 'slate';

export interface AiBrewConfidenceBadge {
  label: string;
  tone: AiBrewConfidenceTone;
}

function isIndonesian(language: string) {
  return /^id(?:-|$)/i.test(language);
}

function hasOnlineAiOptimization(plan: BrewPlan) {
  return (
    plan.confidenceNotes.some((note) => /AI numeric optimizer accepted inside guardrails/i.test(note))
    || plan.notes.some((note) => /^AI optimizer:/i.test(note))
    || Boolean(plan.aiNotes?.sequenceCanonical || plan.aiNotes?.sequence)
  );
}

function grinderStatusLabel(plan: BrewPlan, language: string) {
  const id = isIndonesian(language);
  if (plan.grindCalibrationRequired || plan.grindSettingMode === 'derived_baseline' || plan.grindSettingVerification === 'fallback') {
    return id ? 'Acuan grinder' : 'Baseline grinder';
  }
  if (plan.grindSettingVerification === 'official') return id ? 'Grinder resmi' : 'Grinder Official';
  if (plan.grindSettingVerification === 'community_verified' || plan.grindSettingVerification === 'curated') {
    return id ? 'Grinder kurasi' : 'Grinder Curated';
  }
  return id ? 'Grinder estimasi' : 'Grinder Estimated';
}

function waterStatusLabel(plan: BrewPlan, language: string) {
  const id = isIndonesian(language);
  if (plan.waterClassification === 'zero_mineral_ro') return id ? 'Mineral nol (RO)' : 'Zero Mineral / RO';
  if (plan.waterClassification === 'low_mineral_clarity') return id ? 'Mineral rendah / jernih' : 'Low-Mineral Clarity';
  if (plan.waterClassification === 'demineral_direct_experiment') return id ? 'Eksperimen demineral' : 'Demineral Experiment';
  if (plan.waterClassification === 'high_buffer') return id ? 'Buffer tinggi' : 'High Buffer';
  if (plan.waterPresetStatus === 'manual_required' || !plan.waterIsBrewReady) {
    return id ? 'Perlu input manual' : 'Manual Required';
  }
  if (plan.waterMineralDerivation === 'estimated_from_classification') return id ? 'Estimasi' : 'Estimated';
  return id ? 'Siap' : 'Ready';
}

function brewerStatusLabel(plan: BrewPlan, language: string) {
  const id = isIndonesian(language);
  if (plan.deviceProfileMode === 'exact') return id ? 'Profil alat presisi' : 'Device Exact';
  if (plan.deviceProfileMode === 'derived_template') return id ? 'Template turunan' : 'Derived Template';
  return id ? 'Profil keluarga alat' : 'Family Fallback';
}

export function resolveAiBrewConfidenceBadges(plan: BrewPlan, language: string): AiBrewConfidenceBadge[] {
  return [
    hasOnlineAiOptimization(plan)
      ? { label: isIndonesian(language) ? 'AI + Planner Tervalidasi' : 'AI + Planner Validated', tone: 'blue' as const }
      : { label: isIndonesian(language) ? 'Planner Lokal' : 'Local Planner', tone: 'slate' as const },
    {
      label: waterStatusLabel(plan, language),
      tone: plan.waterPresetStatus === 'manual_required' || !plan.waterIsBrewReady
        ? 'amber'
        : plan.waterClassification === 'zero_mineral_ro'
          || plan.waterClassification === 'high_buffer'
          || plan.waterClassification === 'demineral_direct_experiment'
          || plan.waterMineralDerivation === 'estimated_from_community_profile'
          || plan.waterMineralDerivation === 'estimated_from_classification'
          ? 'amber'
          : 'emerald',
    },
    {
      label: grinderStatusLabel(plan, language),
      tone: plan.grindSettingVerification === 'official' && plan.grindSettingMode !== 'derived_baseline' && !plan.grindCalibrationRequired
        ? 'emerald'
        : (plan.grindSettingVerification === 'curated' || plan.grindSettingVerification === 'community_verified') && !plan.grindCalibrationRequired
          ? 'blue'
          : 'amber',
    },
    {
      label: brewerStatusLabel(plan, language),
      tone: plan.deviceProfileMode === 'exact'
        ? 'emerald'
        : plan.deviceProfileMode === 'derived_template'
          ? 'blue'
          : 'amber',
    },
  ];
}

function normalizeProfileText(plan: BrewPlan) {
  return [
    plan.coffeeName,
    plan.process,
    plan.variety,
    plan.formState.customProcess,
    plan.formState.customVariety,
    plan.roastLevel,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function resolveAiBrewBeanCharacterInsights(plan: BrewPlan, language: string) {
  const id = isIndonesian(language);
  const text = normalizeProfileText(plan);
  const insights: string[] = [];

  if (/\b(sumatra|lintong|mandheling|gayo|lake\s*toba|toba|wet[-\s_]?hulled|giling\s+basah)\b/i.test(text)) {
    insights.push(id
      ? 'Input mengarah ke kopi berstruktur. Jaga body, sweetness, dan karakter rempah; jangan buru-buru menaikkan suhu jika rasa akhir mulai kering.'
      : 'The input points to a structured coffee. Protect body, sweetness, and spice; avoid raising temperature too fast if the finish turns dry.');
  }

  if (/\b(natural|honey|anaerobic|carbonic|lactic|winey|ferment)\b/i.test(text)) {
    insights.push(id
      ? 'Sinyal proses cenderung manis/fermentatif. Prioritaskan aliran stabil dan agitasi rapi agar rasa manis tidak berubah jadi keruh.'
      : 'The process cue leans sweet/ferment-forward. Keep flow stable and agitation clean so sweetness does not turn muddy.');
  }

  if (/\b(washed|fully\s+washed|wet\s+process|ethiopia|kenya|panama|gesha|geisha|high\s+altitude|highland)\b/i.test(text)) {
    insights.push(id
      ? 'Karakter washed atau dataran tinggi cenderung membutuhkan kejernihan. Jaga hamparan kopi tetap rata dan hindari bypass agar acidity terasa bersih.'
      : 'The washed/highland cue tends to need clarity. Keep the bed even and avoid bypass so acidity stays clean.');
  }

  if (insights.length === 0) {
    insights.push(id
      ? 'Karakter bean belum diketahui sepenuhnya. AI memakai roast, target rasa, air, dan alat sebagai acuan awal yang aman.'
      : 'Bean character is not fully locked. AI uses roast, taste target, water, and equipment as a safe baseline.');
  }

  return insights.slice(0, 2);
}

export function resolveAiBrewActionPriorities(plan: BrewPlan, language: string) {
  const id = isIndonesian(language);
  const mainWater = plan.brewMode === 'iced'
    ? `${plan.hotWaterMl} ml ${id ? 'air panas + ' : 'hot water + '}${plan.iceMl} g ${id ? 'es' : 'ice'}`
    : `${plan.totalWaterMl} ml ${id ? 'air seduh' : 'brew water'}`;
  const tasteTimeSeconds = Math.max(0, Math.round(plan.extractionEndSeconds ?? plan.totalTimeSeconds));
  const timeLabel = plan.methodFamily === 'espresso'
    ? (id ? 'waktu ekstraksi' : 'shot')
    : plan.methodFamily === 'cold_brew'
      ? (id ? 'rendam dingin' : 'cold steep')
      : plan.methodFamily === 'french_press' || plan.methodFamily === 'clever_dripper'
        ? (id ? 'rendam' : 'steep')
        : (id ? 'ekstraksi' : 'extraction');
  const beanCue = resolveAiBrewBeanCharacterInsights(plan, language)[0];
  const priorities = [
    id
      ? `Ikuti angka utama: ${mainWater}, ${Math.round(plan.waterTempC)}°C, ${timeLabel} sekitar ${formatTimeLabel(tasteTimeSeconds)}.`
      : `Brew the main numbers first: ${mainWater}, ${Math.round(plan.waterTempC)}°C, ${timeLabel} around ${formatTimeLabel(tasteTimeSeconds)}.`,
    id
      ? 'Gunakan setelan awal grinder sebagai acuan; ubah satu variabel saja setelah melihat aliran dan mencicipi hasilnya.'
      : 'Use the starting grinder setting as the baseline; make small corrections only after drawdown and tasting.',
    id
      ? 'Jika asam/tipis: sedikit lebih halus atau pulse ringan. Jika pahit/macet: sedikit lebih kasar atau kurangi agitasi.'
      : 'If sour/thin: slightly finer or light pulse. If bitter/stalled: slightly coarser or less agitation.',
  ];

  if (plan.waterClassification === 'zero_mineral_ro') {
    priorities.push(id
      ? 'Cocok sebagai dasar untuk meracik air sendiri; jangan dipakai langsung tanpa remineralisasi.'
      : 'Useful as a custom-water base; do not brew directly without remineralization.');
  } else if (plan.waterClassification === 'low_mineral_clarity') {
    priorities.push(id
      ? 'Air rendah mineral bisa clean, tapi body dapat tipis; validasi rasa sebelum menjadikannya default.'
      : 'Low-mineral water can taste clean, but body may be thin; taste-check before making it the default.');
  } else if (plan.waterClassification === 'demineral_direct_experiment') {
    priorities.push(id
      ? 'Air demineral yang dipakai langsung hanya cocok sebagai eksperimen filter; jika hasilnya terasa kosong, remineralisasi atau campur dengan air bermineral.'
      : 'Direct demineral brewing is only a filter experiment; if the cup tastes hollow, remineralize or blend.');
  } else if (plan.waterPresetStatus === 'manual_required' || !plan.waterIsBrewReady) {
    priorities.push(id
      ? 'Data air belum siap otomatis; isi mineral manual atau pakai air siap seduh sebelum menilai resep.'
      : 'Water data is not ready for autofill; enter manual minerals or use brew-ready water before judging the recipe.');
  } else if (plan.waterClassification === 'high_buffer') {
    priorities.push(id
      ? 'Air berbuffer tinggi bisa membuat acidity/floral lebih tertahan.'
      : 'High-buffer water can make acidity/floral taste more muted.');
  } else if (plan.waterMineralDerivation === 'estimated_from_classification') {
    priorities.push(id
      ? 'Mineral air masih estimasi; verifikasi manual sebelum menganggapnya siap seduh.'
      : 'Water minerals are estimated; verify manually before treating it as brew-ready.');
  } else if (plan.waterMineralDerivation === 'estimated_from_community_profile') {
    priorities.push(id
      ? 'Profil air memakai rujukan komunitas kopi; cukup sebagai titik awal, tetapi tetap perlu divalidasi dari rasa.'
      : 'Water profile uses coffee-community evidence; good for a starting point, still taste-check.');
  }

  if (plan.deviceProfileMode !== 'exact') {
    priorities.push(id
      ? 'Profil alat belum presisi; gunakan sebagai acuan, lalu kalibrasi dari rasa hasil seduhan.'
      : 'Brewer profile is not exact; use this as a baseline and calibrate with actual taste.');
  }

  if (plan.grindCalibrationRequired || plan.grindSettingMode === 'derived_baseline' || plan.grindSettingVerification === 'fallback') {
    priorities.push(id
      ? 'Ini acuan awal, bukan setelan presisi. Validasi dengan waktu ekstraksi dan rasa.'
      : 'Estimated starting point, not an exact setting. Validate with drawdown, method time, and taste.');
  } else if (plan.grindSettingVerification === 'dataset_unverified') {
    priorities.push(id
      ? 'Setelan grinder masih estimasi. Validasi dengan air turun dan rasa.'
      : 'Grinder setting is estimated. Validate with drawdown and taste.');
  }

  if (beanCue && priorities.length < 4) priorities.push(beanCue);

  return priorities.slice(0, 4);
}

function formatTimeLabel(seconds: number) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainder = Math.max(0, seconds) % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function feedbackLabel(rating: BrewTasteFeedbackRating, language: string) {
  const id = isIndonesian(language);
  if (rating === 'great') return id ? 'sudah enak' : 'landed well';
  if (rating === 'sour') return id ? 'terlalu asam' : 'too sour';
  if (rating === 'bitter') return id ? 'terlalu pahit' : 'too bitter';
  if (rating === 'thin') return id ? 'terlalu tipis' : 'too thin';
  if (rating === 'flat') return id ? 'datar/tertahan' : 'flat/muted';
  if (rating === 'muddy') return id ? 'keruh/berat' : 'muddy/heavy';
  return id ? 'sepat/astringent' : 'astringent';
}

function protectedGuardrail(language: string) {
  return isIndonesian(language)
    ? 'Ubah satu variabel dulu. Dosis, rasio, total air, air panas/es, mode seduh, alat, grinder, dan waktu langkah tetap dikunci.'
    : 'Dose, ratio, total water, hot water/ice, brew mode, brewer, grinder, and step timing stay locked.';
}

function localizeGrindReference(text: string, language: string) {
  if (!isIndonesian(language)) return text;
  return text
    .replace(/\bStarting grind:/gi, 'Gilingan awal:')
    .replace(/\bCorrection range:/gi, 'Rentang koreksi:')
    .replace(/\bIf sour\/thin:/gi, 'Jika asam/tipis:')
    .replace(/\bIf bitter\/dry\/stalled:/gi, 'Jika pahit/kering/macet:')
    .replace(/\bnumbers\b/gi, 'angka')
    .replace(/\bsteps\b/gi, 'langkah');
}

function methodCorrection(
  plan: BrewPlan,
  rating: BrewTasteFeedbackRating,
  language: string,
): Pick<BrewTasteFeedbackCorrection, 'primaryCorrection' | 'backupCorrection'> {
  const id = isIndonesian(language);
  const grind = localizeGrindReference(plan.grindRecommendation || plan.grindSettingReference, language);
  const waterWarning = plan.waterClassification === 'high_buffer'
    ? (id ? 'Cek air dulu: buffer tinggi bisa membuat acidity/floral tertahan.' : 'Check water first: high buffer can mute acidity/floral.')
    : plan.waterClassification === 'zero_mineral_ro'
      ? (id ? 'Cek air dulu: RO/zero mineral perlu remineralisasi.' : 'Check water first: RO/zero-mineral water needs remineralization.')
      : plan.waterClassification === 'low_mineral_clarity'
        ? (id ? 'Cek air dulu: air rendah mineral bisa membuat body tipis dan acidity lebih tajam.' : 'Check water first: low-mineral water can make body thin and acidity sharper.')
        : plan.waterClassification === 'demineral_direct_experiment'
          ? (id ? 'Cek air dulu: air demineral yang dipakai langsung bisa terasa clean tetapi kosong; remineralisasi jika perlu.' : 'Check water first: direct demineral can taste clean but hollow; remineralize if needed.')
        : '';

  const generic = {
    great: {
      primaryCorrection: id ? `Pertahankan ${grind} dan ulangi aliran yang sama.` : `Keep ${grind} and repeat the same flow.`,
      backupCorrection: id ? 'Simpan rencana ini sebagai acuan untuk bean yang sama.' : 'Save this plan as the baseline for the same bean.',
    },
    sour: {
      primaryCorrection: id ? `Coba sedikit lebih halus, sekitar 0.5 step dari ${grind}.` : `Try slightly finer, about 0.5 step from ${grind}.`,
      backupCorrection: id ? 'Jika aliran sudah benar tapi masih tajam, naikkan suhu 1C pada seduhan berikutnya.' : 'If flow is correct but still sharp, raise temperature 1C on the next brew.',
    },
    bitter: {
      primaryCorrection: id ? `Coba 0.5 step lebih kasar dari ${grind}.` : `Try 0.5 step coarser than ${grind}.`,
      backupCorrection: id ? 'Kurangi agitasi akhir; suhu turun 1C hanya jika akhir rasa tetap kering.' : 'Reduce final agitation; lower temperature 1C only if the finish stays dry.',
    },
    thin: {
      primaryCorrection: id ? `Jangan ubah dosis/rasio; coba sedikit lebih halus, sekitar 0.5 step dari ${grind}.` : `Do not change dose/ratio; try slightly finer, about 0.5 step from ${grind}.`,
      backupCorrection: id ? 'Perbaiki bloom/saturasi dan jaga kontak tengah lebih stabil.' : 'Improve bloom/saturation and keep middle contact steadier.',
    },
    flat: {
      primaryCorrection: waterWarning || (id ? 'Kurangi kontak sedikit atau pilih target lebih cerah untuk seduhan berikutnya.' : 'Reduce contact slightly or choose a brighter target next brew.'),
      backupCorrection: id ? 'Jaga tuangan lebih tenang; jangan tambah agitasi besar.' : 'Keep pouring calmer; do not add heavy agitation.',
    },
    muddy: {
      primaryCorrection: id ? 'Kurangi agitasi dan hindari mengejar dinding filter.' : 'Reduce agitation and avoid chasing the filter wall.',
      backupCorrection: id ? `Jika masih keruh, coba 0.5 step lebih kasar dari ${grind}.` : `If it stays muddy, try 0.5 step coarser than ${grind}.`,
    },
    astringent: {
      primaryCorrection: id ? `Coba 0.5 step lebih kasar dari ${grind} dan jaga tuangan akhir lebih lembut.` : `Try 0.5 step coarser than ${grind} and keep the final pour gentler.`,
      backupCorrection: id ? 'Turunkan suhu 1C hanya jika akhir rasa tetap sepat setelah aliran rapi.' : 'Lower temperature 1C only if the finish stays astringent after flow is clean.',
    },
  } satisfies Record<BrewTasteFeedbackRating, Pick<BrewTasteFeedbackCorrection, 'primaryCorrection' | 'backupCorrection'>>;

  if (plan.brewMode === 'iced' && (rating === 'sour' || rating === 'thin' || rating === 'flat')) {
    return {
      primaryCorrection: id
        ? `Jaga ${plan.hotWaterMl} ml air panas dan ${plan.iceMl} g es tetap sama; coba 0.5 step lebih halus dari ${grind}.`
        : `Keep ${plan.hotWaterMl} ml hot water and ${plan.iceMl} g ice unchanged; try 0.5 step finer than ${grind}.`,
      backupCorrection: id
        ? `Jika masih tipis setelah satu brew, rapatkan rasio final sedikit dari 1:${plan.finalBeverageRatio} tanpa menambah air setelah seduh.`
        : `If it is still thin after one brew, tighten final ratio slightly from 1:${plan.finalBeverageRatio} without adding water after brewing.`,
    };
  }

  if (plan.methodFamily === 'hario_switch') {
    if (rating === 'great') return {
      primaryCorrection: id ? 'Pertahankan gilingan, titik buka katup, dan jalur katup yang sama.' : 'Keep the same grind, release checkpoint, and valve path.',
      backupCorrection: id ? 'Catat muatan ruang, waktu air turun, air, dan grinder sebagai acuan Switch.' : 'Record chamber load, drawdown, water, and grinder as the Switch baseline.',
    };
    if (rating === 'sour' || rating === 'thin') return {
      primaryCorrection: id
        ? `Coba sedikit lebih halus dari ${grind}, atau tambah kontak tertutup 10 detik jika muatan ruang masih aman.`
        : `Try slightly finer than ${grind}, or add 10 seconds closed contact if chamber load remains safe.`,
      backupCorrection: id
        ? 'Jika Mode V60 terasa tipis, pindah ke Hybrid seimbang sebelum mengubah dosis/rasio.'
        : 'If V60 Mode tastes thin, move to Hybrid Balanced before changing dose/ratio.',
    };
    if (rating === 'bitter' || rating === 'astringent') return {
      primaryCorrection: id
        ? 'Buka katup 10 detik lebih awal atau coba 0.5 step lebih kasar.'
        : 'Open/release 10 seconds earlier or try 0.5 step coarser.',
      backupCorrection: id
        ? 'Kurangi agitasi akhir; jangan tahan ruang tertutup penuh terlalu lama.'
        : 'Reduce final agitation; do not hold a full closed chamber too long.',
    };
    if (rating === 'muddy') return {
      primaryCorrection: id
        ? 'Kurangi muatan ruang tertutup atau buka lebih awal; jaga slurry lebih tenang.'
        : 'Reduce closed chamber load or open earlier; keep the slurry calmer.',
      backupCorrection: id
        ? 'Coba sedikit lebih kasar dan hindari swirl setelah buka katup.'
        : 'Try slightly coarser and avoid swirl after release.',
    };
    if (rating === 'flat') return {
      primaryCorrection: waterWarning || (id
        ? 'Buka katup lebih awal atau gunakan Hybrid Cerah Bersih untuk meningkatkan kejernihan.'
        : 'Release earlier or use Hybrid Bright Clean to lift clarity.'),
      backupCorrection: id
        ? 'Cek KH/alkalinity dan gunakan mineral manual sebelum mengubah rasio.'
        : 'Check KH/alkalinity and use manual minerals before changing ratio.',
    };
  }

  if (plan.methodFamily === 'aeropress') {
    if (rating === 'sour') return {
      primaryCorrection: id ? `Coba sedikit lebih halus, sekitar 0.5 step dari ${grind}.` : `Try slightly finer, about 0.5 step from ${grind}.`,
      backupCorrection: id ? 'Atau tambah waktu rendam 10 detik; jangan ubah dosis/rasio.' : 'Or add 10 seconds steep; do not change dose/ratio.',
    };
    if (rating === 'bitter' || rating === 'astringent') return {
      primaryCorrection: id ? 'Kurangi waktu rendam 10 detik atau tekan lebih pelan.' : 'Reduce steep by 10 seconds or press more gently.',
      backupCorrection: id ? 'Berhenti sebelum hiss; jangan tekan sampai kering.' : 'Stop before hiss; do not press the puck dry.',
    };
    if (rating === 'thin') return {
      primaryCorrection: id ? 'Gunakan no-bypass atau tekanan lebih stabil pada seduhan berikutnya.' : 'Use no-bypass or a steadier press next brew.',
      backupCorrection: id ? `Jika masih tipis, coba 0.5 step lebih halus dari ${grind}.` : `If still thin, try 0.5 step finer than ${grind}.`,
    };
    if (rating === 'muddy') return {
      primaryCorrection: id ? 'Kurangi stir count; cukup 3 adukan ringan.' : 'Reduce stir count; keep it to 3 gentle stirs.',
      backupCorrection: id ? 'Tekan lebih pelan dan berhenti sebelum hiss.' : 'Press more gently and stop before hiss.',
    };
  }

  if (plan.methodFamily === 'french_press') {
    if (rating === 'sour') return {
      primaryCorrection: id ? 'Tambah waktu rendam 15-20 detik pada seduhan berikutnya.' : 'Add 15-20 seconds steep on the next brew.',
      backupCorrection: id ? `Jika masih tajam, coba sedikit lebih halus dari ${grind}.` : `If still sharp, try slightly finer than ${grind}.`,
    };
    if (rating === 'bitter' || rating === 'astringent') return {
      primaryCorrection: id ? 'Decant lebih cepat dan jangan ganggu fines saat pindah.' : 'Decant earlier and avoid disturbing fines.',
      backupCorrection: id ? 'Tekan plunger pelan; jangan tekan berlebihan.' : 'Press the plunger gently; do not over-plunge.',
    };
    if (rating === 'muddy') return {
      primaryCorrection: id ? 'Diamkan settle lebih lama sebelum decant.' : 'Let it settle longer before decanting.',
      backupCorrection: id ? 'Pindahkan lebih bersih dan jangan aduk ulang crust/fines.' : 'Decant cleaner and do not re-stir crust/fines.',
    };
  }

  if (plan.methodFamily === 'moka_pot') {
    if (rating === 'sour' || rating === 'thin') return {
      primaryCorrection: id ? `Coba sedikit lebih halus dari ${grind}.` : `Try slightly finer than ${grind}.`,
      backupCorrection: id ? 'Stabilkan panas; jangan terlalu rendah sampai aliran putus.' : 'Stabilize heat; do not run so low that flow breaks.',
    };
    if (rating === 'bitter' || rating === 'muddy' || rating === 'astringent') return {
      primaryCorrection: id ? 'Turunkan panas dan berhenti sebelum sputter.' : 'Lower heat and stop before sputter.',
      backupCorrection: id ? 'Jaga basket rata penuh; jangan tamp.' : 'Keep the basket level and full; use no tamp.',
    };
  }

  if (plan.methodFamily === 'espresso') {
    if (rating === 'sour') return {
      primaryCorrection: id ? `Coba sedikit lebih halus, sekitar 0.5 step dari ${grind}.` : `Try slightly finer, about 0.5 step from ${grind}.`,
      backupCorrection: id ? 'Perbaiki distribusi/tamp agar aliran lebih stabil.' : 'Improve distribution/tamp so flow stabilizes.',
    };
    if (rating === 'bitter' || rating === 'astringent') return {
      primaryCorrection: id ? `Coba 0.5 step lebih kasar dari ${grind}.` : `Try 0.5 step coarser than ${grind}.`,
      backupCorrection: id ? 'Berhenti tepat di target hasil; target minuman tetap dikunci.' : 'Stop at yield; keep the beverage target locked.',
    };
    if (rating === 'thin') return {
      primaryCorrection: id ? 'Perbaiki persiapan puck dan stabilkan aliran.' : 'Improve puck prep and stabilize flow.',
      backupCorrection: id ? `Jika masih cepat/tipis, coba 0.5 step lebih halus dari ${grind}.` : `If still fast/thin, try 0.5 step finer than ${grind}.`,
    };
  }

  if (plan.methodFamily === 'cold_brew') {
    if (rating === 'sour' || rating === 'thin') return {
      primaryCorrection: id ? 'Perbaiki saturasi awal dan tambah waktu rendam 2 jam.' : 'Improve initial saturation and add 2 hours steep.',
      backupCorrection: id ? 'Atur dilution setelah filtrasi saja; jangan tambah air saat brewing.' : 'Adjust dilution after filtration only; do not add water during brewing.',
    };
    if (rating === 'bitter' || rating === 'muddy' || rating === 'astringent') return {
      primaryCorrection: id ? 'Kurangi waktu rendam 2 jam atau pakai gilingan sedikit lebih kasar.' : 'Reduce steep by 2 hours or grind slightly coarser.',
      backupCorrection: id ? 'Filtrasi lebih bersih sebelum dilution.' : 'Filter cleaner before dilution.',
    };
  }

  return generic[rating];
}

export function buildTasteFeedbackCorrection(
  plan: BrewPlan,
  rating: BrewTasteFeedbackRating,
  language = 'id',
): BrewTasteFeedbackCorrection {
  const correction = methodCorrection(plan, rating, language);
  return {
    rating,
    methodFamily: plan.methodFamily,
    primaryCorrection: correction.primaryCorrection,
    backupCorrection: correction.backupCorrection,
    guardrail: protectedGuardrail(language),
    protectedNumbersLocked: true,
  };
}

export function buildAiBrewTasteLoopMarkdown(
  plan: BrewPlan,
  feedback: Pick<BrewTasteFeedback, 'rating' | 'note'>,
  language: string,
) {
  const id = isIndonesian(language);
  const note = feedback.note?.trim();
  const correction = buildTasteFeedbackCorrection(plan, feedback.rating, language);
  const title = id ? '## Koreksi seduhan berikutnya' : '## Next brew adjustment';
  const intro = id
    ? `Hasil dicatat sebagai **${feedbackLabel(feedback.rating, language)}**. Mulai dari perubahan terkecil dulu.`
    : `The cup was marked **${feedbackLabel(feedback.rating, language)}**. Start with the smallest change first.`;

  return [
    title,
    intro,
    '',
    `- ${id ? 'Langkah utama' : 'Primary move'}: ${correction.primaryCorrection}`,
    `- ${id ? 'Cadangan' : 'Backup'}: ${correction.backupCorrection}`,
    `- ${id ? 'Batas aman' : 'Guardrail'}: ${correction.guardrail}`,
    note ? `\n${id ? 'Catatan user' : 'User note'}: ${note}` : '',
  ].filter(Boolean).join('\n');
}
