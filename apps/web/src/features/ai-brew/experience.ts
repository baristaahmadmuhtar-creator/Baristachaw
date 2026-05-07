import type { BrewPlan, BrewTasteFeedback, BrewTasteFeedbackRating } from './types';

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
  if (plan.grindSettingMode === 'derived_baseline' || plan.grindSettingVerification === 'fallback') {
    return id ? 'Grinder Fallback' : 'Grinder Fallback';
  }
  if (plan.grindSettingVerification === 'official') return id ? 'Grinder Official' : 'Grinder Official';
  if (plan.grindSettingVerification === 'community_verified' || plan.grindSettingVerification === 'curated') {
    return id ? 'Grinder Curated' : 'Grinder Curated';
  }
  return id ? 'Grinder Estimated' : 'Grinder Estimated';
}

function waterStatusLabel(plan: BrewPlan, language: string) {
  const id = isIndonesian(language);
  if (plan.waterClassification === 'zero_mineral_ro') return id ? 'Zero Mineral / RO' : 'Zero Mineral / RO';
  if (plan.waterClassification === 'high_buffer') return id ? 'High Buffer' : 'High Buffer';
  if (plan.waterPresetStatus === 'manual_required' || !plan.waterIsBrewReady) {
    return id ? 'Manual Required' : 'Manual Required';
  }
  if (plan.waterMineralDerivation === 'estimated_from_classification') return id ? 'Estimated' : 'Estimated';
  return id ? 'Ready' : 'Ready';
}

function brewerStatusLabel(plan: BrewPlan, language: string) {
  const id = isIndonesian(language);
  if (plan.deviceProfileMode === 'exact') return id ? 'Device Exact' : 'Device Exact';
  if (plan.deviceProfileMode === 'derived_template') return id ? 'Derived Template' : 'Derived Template';
  return id ? 'Family Fallback' : 'Family Fallback';
}

export function resolveAiBrewConfidenceBadges(plan: BrewPlan, language: string): AiBrewConfidenceBadge[] {
  return [
    hasOnlineAiOptimization(plan)
      ? { label: isIndonesian(language) ? 'AI + Tervalidasi Planner' : 'AI + Planner Validated', tone: 'blue' as const }
      : { label: isIndonesian(language) ? 'Planner Lokal' : 'Local Planner', tone: 'slate' as const },
    {
      label: waterStatusLabel(plan, language),
      tone: plan.waterPresetStatus === 'manual_required' || !plan.waterIsBrewReady
        ? 'amber'
        : plan.waterClassification === 'high_buffer' || plan.waterMineralDerivation === 'estimated_from_classification'
          ? 'amber'
          : 'emerald',
    },
    {
      label: grinderStatusLabel(plan, language),
      tone: plan.grindSettingVerification === 'official' && plan.grindSettingMode !== 'derived_baseline'
        ? 'emerald'
        : plan.grindSettingVerification === 'curated' || plan.grindSettingVerification === 'community_verified'
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
      ? 'Input mengarah ke kopi berstruktur. Jaga body, sweetness, dan spice; jangan buru-buru menaikkan suhu kalau finish mulai seret.'
      : 'The input points to a structured coffee. Protect body, sweetness, and spice; avoid raising temperature too fast if the finish turns dry.');
  }

  if (/\b(natural|honey|anaerobic|carbonic|lactic|winey|ferment)\b/i.test(text)) {
    insights.push(id
      ? 'Sinyal proses cenderung manis/fermentatif. Prioritaskan flow stabil dan agitasi rapi agar sweetness tidak berubah jadi muddy.'
      : 'The process cue leans sweet/ferment-forward. Keep flow stable and agitation clean so sweetness does not turn muddy.');
  }

  if (/\b(washed|fully\s+washed|wet\s+process|ethiopia|kenya|panama|gesha|geisha|high\s+altitude|highland)\b/i.test(text)) {
    insights.push(id
      ? 'Sinyal washed/highland cenderung butuh clarity. Jaga bed rata dan hindari bypass agar acidity tetap bersih.'
      : 'The washed/highland cue tends to need clarity. Keep the bed even and avoid bypass so acidity stays clean.');
  }

  if (insights.length === 0) {
    insights.push(id
      ? 'Karakter bean belum dikunci penuh. AI memakai roast, target rasa, air, dan alat sebagai baseline aman.'
      : 'Bean character is not fully locked. AI uses roast, taste target, water, and equipment as a safe baseline.');
  }

  return insights.slice(0, 2);
}

export function resolveAiBrewActionPriorities(plan: BrewPlan, language: string) {
  const id = isIndonesian(language);
  const mainWater = plan.brewMode === 'iced'
    ? `${plan.hotWaterMl} ml ${id ? 'air panas + ' : 'hot water + '}${plan.iceMl} g ${id ? 'es' : 'ice'}`
    : `${plan.totalWaterMl} ml ${id ? 'air seduh' : 'brew water'}`;
  const beanCue = resolveAiBrewBeanCharacterInsights(plan, language)[0];
  const priorities = [
    id
      ? `Ikuti output utama: ${mainWater}, ${Math.round(plan.waterTempC)}°C, selesai sekitar ${formatTimeLabel(plan.totalTimeSeconds)}.`
      : `Brew the main numbers first: ${mainWater}, ${Math.round(plan.waterTempC)}°C, finish around ${formatTimeLabel(plan.totalTimeSeconds)}.`,
    id
      ? 'Pakai setting grinder awal sebagai baseline; ubah satu variabel dulu setelah melihat drawdown dan rasa.'
      : 'Use the starting grinder setting as the baseline; make small corrections only after drawdown and tasting.',
    id
      ? 'Jika asam/tipis: sedikit lebih halus atau pulse ringan. Jika pahit/macet: sedikit lebih kasar atau kurangi agitasi.'
      : 'If sour/thin: slightly finer or light pulse. If bitter/stalled: slightly coarser or less agitation.',
  ];

  if (plan.waterClassification === 'zero_mineral_ro') {
    priorities.push(id
      ? 'Jangan dipakai tanpa remineralisasi.'
      : 'Do not use zero-mineral/RO water without remineralization.');
  } else if (plan.waterPresetStatus === 'manual_required' || !plan.waterIsBrewReady) {
    priorities.push(id
      ? 'Data air belum siap otomatis; isi mineral manual atau pakai air brew-ready sebelum menilai resep.'
      : 'Water data is not ready for autofill; enter manual minerals or use brew-ready water before judging the recipe.');
  } else if (plan.waterClassification === 'high_buffer') {
    priorities.push(id
      ? 'Air berbuffer tinggi bisa membuat acidity/floral lebih muted.'
      : 'High-buffer water can make acidity/floral taste more muted.');
  } else if (plan.waterMineralDerivation === 'estimated_from_classification') {
    priorities.push(id
      ? 'Mineral air masih estimated; verifikasi manual sebelum menganggapnya brew-ready.'
      : 'Water minerals are estimated; verify manually before treating it as brew-ready.');
  }

  if (plan.deviceProfileMode !== 'exact') {
    priorities.push(id
      ? 'Profil alat bukan exact; jadikan ini baseline dan kalibrasi dengan rasa aktual.'
      : 'Brewer profile is not exact; use this as a baseline and calibrate with actual taste.');
  }

  if (plan.grindSettingMode === 'derived_baseline' || plan.grindSettingVerification === 'fallback') {
    priorities.push(id
      ? 'Estimasi awal, bukan setting resmi. Validasi dengan drawdown dan rasa.'
      : 'Estimated starting point, not an official setting. Validate with drawdown and taste.');
  } else if (plan.grindSettingVerification === 'dataset_unverified') {
    priorities.push(id
      ? 'Setting grinder masih estimated. Validasi dengan drawdown dan rasa.'
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

function formatTempDelta(plan: BrewPlan, delta: number, language: string) {
  const next = Math.round(plan.waterTempC + delta);
  return isIndonesian(language) ? `${next}C` : `${next}C`;
}

function feedbackLabel(rating: BrewTasteFeedbackRating, language: string) {
  const id = isIndonesian(language);
  if (rating === 'great') return id ? 'sudah enak' : 'landed well';
  if (rating === 'sour') return id ? 'terlalu asam' : 'too sour';
  if (rating === 'bitter') return id ? 'terlalu pahit' : 'too bitter';
  return id ? 'terlalu tipis' : 'too thin';
}

export function buildAiBrewTasteLoopMarkdown(
  plan: BrewPlan,
  feedback: Pick<BrewTasteFeedback, 'rating' | 'note'>,
  language: string,
) {
  const id = isIndonesian(language);
  const grind = plan.grindRecommendation || plan.grindSettingReference;
  const note = feedback.note?.trim();
  const title = id ? '## Koreksi seduhan berikutnya' : '## Next brew adjustment';
  const intro = id
    ? `Hasil dicatat sebagai **${feedbackLabel(feedback.rating, language)}**. Mulai dari perubahan terkecil dulu.`
    : `The cup was marked **${feedbackLabel(feedback.rating, language)}**. Start with the smallest change first.`;

  const lines = (() => {
    if (feedback.rating === 'great') {
      return id
        ? [
            `Pertahankan ${grind}.`,
            `Jangan ubah rasio, dosis, atau suhu. Simpan plan ini sebagai baseline.`,
            'Ulangi flow yang sama untuk memastikan konsisten.',
          ]
        : [
            `Keep ${grind}.`,
            'Do not change ratio, dose, or temperature. Save this plan as the baseline.',
            'Repeat the same flow once to confirm consistency.',
          ];
    }
    if (feedback.rating === 'sour') {
      return id
        ? [
            `Coba sedikit lebih halus dari ${grind}.`,
            'Jaga tuangan lebih stabil; kalau perlu pakai pulse ringan, bukan agitasi besar.',
            `Jika masih tajam setelah tasting kedua, naikkan suhu kecil ke ${formatTempDelta(plan, 1, language)}.`,
          ]
        : [
            `Try slightly finer than ${grind}.`,
            'Keep pouring steadier; use light pulse rather than heavy agitation.',
            `If it is still sharp after the second tasting, raise temperature slightly to ${formatTempDelta(plan, 1, language)}.`,
          ];
    }
    if (feedback.rating === 'bitter') {
      return id
        ? [
            `Coba sedikit lebih kasar dari ${grind}.`,
            'Kurangi agitasi dan jaga spout lebih rendah agar bed tidak pecah.',
            `Jika finish tetap seret, turunkan suhu kecil ke ${formatTempDelta(plan, -1, language)}.`,
          ]
        : [
            `Try slightly coarser than ${grind}.`,
            'Reduce agitation and keep the spout lower so the bed does not break.',
            `If the finish stays dry, lower temperature slightly to ${formatTempDelta(plan, -1, language)}.`,
          ];
    }
    return id
      ? [
          `Pertahankan dosis dan rasio; coba sedikit lebih halus dari ${grind}.`,
          'Pakai pulse ringan agar kontak air lebih merata.',
          `Jika masih watery, tambah target waktu sekitar 10 detik pada seduhan berikutnya.`,
        ]
      : [
          `Keep dose and ratio; try slightly finer than ${grind}.`,
          'Use light pulse so water contact is more even.',
          'If it is still watery, add about 10 seconds to the next brew target.',
        ];
  })();

  return [
    title,
    intro,
    '',
    ...lines.map((line) => `- ${line}`),
    note ? `\n${id ? 'Catatan user' : 'User note'}: ${note}` : '',
  ].filter(Boolean).join('\n');
}
