import type { BrewPlan } from './types';

export type BrewHallucinationRisk =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'blocked';

export interface BrewGuardResult {
  allowed: boolean;
  risk: BrewHallucinationRisk;
  reason?: string;
  safeText?: string;
}

const PROCESS_FACT_PATTERN = /\b(washed|natural|honey|wet[-\s]?hulled|anaerobic|carbonic maceration)\b/gi;
const GEISHA_PATTERN = /\b(?:geisha|gesha)\b/gi;
const GEISHA_TEST_PATTERN = /\b(?:geisha|gesha)\b/i;
const ORIGIN_DETAIL_LINE_PATTERN = /^(?:.*\b(?:altitude|ketinggian|farm|estate|roaster|harvest|panen)\b.*)$/gim;
const READY_WATER_CLAIM_PATTERN = /\b(?:ideal|excellent|ready[-\s]?brew|brew[-\s]?ready|sangat cocok|sempurna)\b/gi;
const OFFICIAL_GRINDER_CLAIM_PATTERN = /\b(?:official grinder|official grind|verified grind reference|referensi grinder resmi|setting resmi)\b/gi;
const EXACT_BREWER_CLAIM_PATTERN = /\b(?:profil exact|exact profile|profil siap)\b/gi;
const PLACEHOLDER_OR_BROKEN_COPY_PATTERN = /\$(?:\d+|\{)|\b(?:undefined|null|NaN|\[object Object\]|ActionAction|Action\s+Action|Pressgentle|Stophiss|Programbloom|Valveset|Press35-45 seconds|Press \$1 seconds|Stophiss finished)\b|target-profile extraction pressure|deterministic planner numbers, not AI-invented copy|flow matched to french_press/i;
const BROKEN_MIXED_LANGUAGE_PATTERN = /\b(?:Valveset sebelum seduh|Programbloom then immersion|Serve setelah aliran finish cleanly|Level coffee bed datar|Let partikel coffee|Stir 2-3 times saja|stir\s+\d+(?:-\d+)?\s+times\s+saja|pour\s+air\s+\w+|dua\s+times|serve\s+setelah)\b/i;
function normalized(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function escapeRegExp(val: string): string {
  return val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripMetadataNames(text: string, plan: BrewPlan): string {
  let cleaned = text;
  const terms = [
    plan.dripper.name,
    plan.dripper.brand,
    plan.coffeeName,
  ].filter((t): t is string => Boolean(t) && typeof t === 'string' && t.trim().length > 0);

  for (const term of terms) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(term), 'gi'), '');
    const words = term.split(/\s+/);
    for (const word of words) {
      if (word.length >= 3) {
        cleaned = cleaned.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi'), '');
      }
    }
  }
  return cleaned;
}

function isUnknownValue(value?: string) {
  const n = normalized(value);
  return !n || n === 'not specified' || n === 'none' || n === '-' || n === 'unknown' || n === 'tidak dipilih';
}

function isLowTrustWater(plan: BrewPlan) {
  const blockText = `${plan.waterBrewBlockReason.join(' ')} ${plan.waterMinerals.styleLabel || ''}`.toLowerCase();
  return plan.waterPresetStatus === 'manual_required'
    || plan.waterMineralDerivation === 'estimated_from_classification'
    || plan.waterMineralDerivation === 'estimated_from_community_profile'
    || !plan.waterIsBrewReady
    || blockText.includes('zero')
    || blockText.includes('ro')
    || blockText.includes('low-mineral')
    || blockText.includes('rendah mineral')
    || plan.waterMinerals.tdsPpm <= 20
    || plan.waterMinerals.hardnessPpm <= 15
    || plan.waterMinerals.alkalinityPpm <= 10;
}

function brewerIsExact(plan: BrewPlan) {
  return plan.deviceProfileMode === 'exact'
    && plan.dripper.confidence === 'high';
}

export function isExplicitGeishaVariety(variety?: string): boolean {
  return GEISHA_TEST_PATTERN.test(String(variety || ''));
}

function isIndonesianLanguage(language?: string) {
  return !language || String(language).toLowerCase().startsWith('id');
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function formatRatio(value: number) {
  if (!Number.isFinite(value)) return '--';
  return roundToOneDecimal(value).toFixed(1);
}

function canonicalFinishSeconds(plan: BrewPlan) {
  return Math.max(0, Math.round(plan.extractionEndSeconds ?? plan.totalTimeSeconds));
}

function collectUserFacingRecipeTextParts(plan: BrewPlan) {
  return [
    plan.summary,
    plan.grindRecommendation,
    plan.waterMinerals.styleLabel,
    plan.extractionRationale?.ratio,
    plan.extractionRationale?.temperature,
    plan.extractionRationale?.time,
    plan.extractionRationale?.grind,
    plan.extractionRationale?.pour,
    ...(plan.extractionRationale?.warnings || []),
    ...plan.notes,
    ...plan.warnings,
    ...plan.steps.flatMap((step) => [step.label, step.note, step.hybridInstruction || '']),
    ...(plan.workflowGuideSteps || []).flatMap((step) => [
      step.label,
      step.primaryText,
      step.secondaryText || '',
      ...step.techniqueChips.flatMap((chip) => [chip.label, chip.value]),
      ...step.warnings,
    ]),
    ...(plan.aiNotes ? Object.values(plan.aiNotes).filter(Boolean) : []),
  ].filter((value): value is string => Boolean(value));
}

function collectUserFacingRecipeText(plan: BrewPlan) {
  return collectUserFacingRecipeTextParts(plan).join('\n');
}

function hasUnintentionalDuplicateWord(value: string) {
  for (const match of value.matchAll(/\b([\p{L}]{2,})\s+\1\b/giu)) {
    return true;
  }
  return false;
}

function validateBrewPlanRatioInvariants(plan: BrewPlan) {
  const reasons: string[] = [];
  if (Number.isFinite(plan.doseG) && plan.doseG > 0) {
    const expectedFinal = plan.totalWaterMl / plan.doseG;
    const expectedHot = plan.hotWaterMl / plan.doseG;
    if (Math.abs(plan.finalBeverageRatio - expectedFinal) > 0.05) {
      reasons.push(`final ratio mismatch: expected 1:${formatRatio(expectedFinal)}, got 1:${formatRatio(plan.finalBeverageRatio)}`);
    }
    if (Math.abs(plan.hotExtractionRatio - expectedHot) > 0.05) {
      reasons.push(`hot extraction ratio mismatch: expected 1:${formatRatio(expectedHot)}, got 1:${formatRatio(plan.hotExtractionRatio)}`);
    }
    const ratioText = collectUserFacingRecipeText(plan);
    if (!ratioText.includes(`1:${formatRatio(expectedFinal)}`)) {
      reasons.push(`user-facing ratio text does not include canonical final ratio 1:${formatRatio(expectedFinal)}`);
    }
  }
  return reasons;
}

export function validateBrewPlanTiming(plan: BrewPlan): BrewGuardResult {
  const reasons: string[] = [];
  const finish = canonicalFinishSeconds(plan);
  if (typeof plan.serveStartSeconds === 'number' && Number.isFinite(plan.serveStartSeconds) && plan.serveStartSeconds < finish) {
    reasons.push(`serve starts before canonical finish (${plan.serveStartSeconds}s < ${finish}s)`);
  }
  const guideSteps = plan.workflowGuideSteps || [];
  const finalGuideStep = guideSteps[guideSteps.length - 1];
  if (finalGuideStep && /serve|sajikan|decant|tuang/i.test(`${finalGuideStep.label} ${finalGuideStep.primaryText}`) && finalGuideStep.startSeconds < finish) {
    reasons.push(`workflow final service step starts before canonical finish (${finalGuideStep.startSeconds}s < ${finish}s)`);
  }
  const rationaleTime = plan.extractionRationale?.time || '';
  if (rationaleTime && !rationaleTime.includes(formatSafeBrewTime(finish))) {
    reasons.push(`extraction rationale time does not match canonical finish ${formatSafeBrewTime(finish)}`);
  }
  if (
    typeof plan.extractionEndSeconds === 'number'
    && Math.abs(plan.totalTimeSeconds - plan.extractionEndSeconds) > 45
    && !plan.timeDisplayMode
  ) {
    reasons.push('totalTimeSeconds differs from extractionEndSeconds without timeDisplayMode');
  }
  return {
    allowed: reasons.length === 0,
    risk: reasons.length === 0 ? 'none' : 'blocked',
    reason: reasons.join('; ') || undefined,
    safeText: formatSafeBrewCaveat(plan),
  };
}

function formatSafeBrewTime(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function stripGrinderCalibrationNotes(text: string): string {
  return text.split('\n').filter((line) => !/grinder-calibration/i.test(line)).join('\n');
}

export function validateUserFacingRecipeText(plan: BrewPlan): BrewGuardResult {
  const reasons: string[] = [];
  const textParts = collectUserFacingRecipeTextParts(plan);
  const rawText = stripGrinderCalibrationNotes(collectUserFacingRecipeText(plan));
  const text = stripMetadataNames(rawText, plan);
  const summaryWithoutCoffeeName = plan.coffeeName
    ? plan.summary.split(plan.coffeeName).join('')
    : plan.summary;
  const duplicateCheckParts = textParts.map((part) => (
    part === plan.summary ? summaryWithoutCoffeeName : part
  ));
  if (
    PLACEHOLDER_OR_BROKEN_COPY_PATTERN.test(text)
    || BROKEN_MIXED_LANGUAGE_PATTERN.test(text)
    || duplicateCheckParts.some(hasUnintentionalDuplicateWord)
  ) {
    reasons.push('user-facing text contains placeholder, broken concatenation, or developer copy');
  }
  if (
    /Hard \/ buffered water/i.test(text)
    && plan.waterMinerals.hardnessPpm < 90
    && plan.waterMinerals.alkalinityPpm < 85
  ) {
    reasons.push('moderate hardness/alkalinity water is mislabeled as hard buffered water');
  }
  if (plan.methodFamily === 'aeropress' && /\b(drawdown|pour map|bloom pour|bloom phase|let bloom|blooming|programbloom|final pour|flat bed|bed drawdown|center-to-mid|v60)\b/i.test(text)) {
    reasons.push('AeroPress text contains pour-over workflow vocabulary');
  }
  if (plan.methodFamily === 'french_press' && /\b(drawdown|pour map|bloom|final pour|flat bed|center-to-mid|hiss|flow matched to french_press)\b/i.test(text)) {
    reasons.push('French Press text contains pour-over workflow vocabulary');
  }
  if (plan.methodFamily === 'espresso' && /\b(bloom|kettle pour|filter wall|add water like manual brew)\b/i.test(text)) {
    reasons.push('Espresso text contains manual brew workflow vocabulary');
  }
  if (plan.methodFamily === 'moka_pot' && /\b(bloom|pour pulses|drawdown bed|final pour|pulse pour|pulse-pour|drawdown)\b/i.test(text)) {
    reasons.push('Moka Pot text contains forbidden pour-over/V60 vocabulary (bloom, pulse pour, drawdown bed)');
  }
  if (plan.methodFamily === 'moka_pot' && /\b(true espresso|real espresso|espresso asli|espresso sejati)\b/i.test(text)) {
    reasons.push('Moka Pot text contains false true espresso claim');
  }
  if (plan.methodFamily === 'moka_pot' && !/\b(no tamp|jangan di-tamp|tanpa di-tamp|do not tamp|tidak di-tamp|dont tamp)\b/i.test(text)) {
    reasons.push('Moka Pot text is missing no tamp instruction');
  }
  if (plan.methodFamily === 'moka_pot' && !/\b(safety valve|katup pengaman|katup aman|safety-valve)\b/i.test(text)) {
    reasons.push('Moka Pot text is missing safety valve reference');
  }
  if (plan.methodFamily === 'moka_pot' && plan.brewMode === 'iced' && !/\b(iced serving|iced concentrate|konsentrat es|penyajian es)\b/i.test(text)) {
    reasons.push('Iced Moka text is missing iced serving/concentrate label');
  }
  if (plan.methodFamily === 'cold_brew' && /\b(hot bloom|kettle temperature|hot pour)\b/i.test(text)) {
    reasons.push('Cold Brew text contains hot brew workflow vocabulary');
  }
  if (plan.methodFamily === 'cold_brew') {
    const isToddy = plan.dripper.id === 'toddy-cold-brew' || (plan.dripper.name && plan.dripper.name.toLowerCase().includes('toddy'));
    if (isToddy) {
      if (plan.recipeStyle === 'cold_drip_tower' || plan.recipeStyle === 'japanese_slow_drip') {
        reasons.push('Toddy cannot use drip-style recipes (cold_drip_tower, japanese_slow_drip)');
      }
      if (/\b(hot bloom|bloom panas|kettle temperature|kettle temp|suhu teko|suhu ceret)\b/i.test(text)) {
        reasons.push('Toddy cold brew must not contain hot bloom or kettle temperature');
      }
      if (plan.brewMode === 'hot') {
        if (!/\b(hot serving|serving|dilute|dilution|encerkan|sajian panas|campur|tambah air panas)\b/i.test(text)) {
          reasons.push('Toddy hot mode must be hot serving/dilution only');
        }
      }
    }
  }
  if (plan.methodFamily === 'kalita_wave' && /\b(cone|spiral|kerucut|v60)\b/i.test(text)) {
    reasons.push('Kalita Wave text contains cone/spiral V60 workflow vocabulary');
  }
  if (plan.methodFamily === 'kalita_wave' && plan.doseG >= 24 && !/\b(clog|fines|menyumbat|tersumbat)\b/i.test(text)) {
    reasons.push('High dose Kalita Wave text is missing clog/fines warning');
  }
  if (plan.methodFamily === 'chemex' && /\b(v60 timing|small dripper|quick drawdown|thin paper|single layer filter)\b/i.test(text)) {
    reasons.push('Chemex text contains non-Chemex vocabulary (V60 timing, thin paper, quick drawdown)');
  }
  if (plan.methodFamily === 'chemex' && !/\b(thick paper|thick filter|bonded paper|filter resistance|kertas tebal|filter tebal)\b/i.test(text)) {
    reasons.push('Chemex text is missing thick paper/filter resistance reference');
  }
  if (plan.methodFamily === 'chemex' && plan.brewMode === 'iced' && !/\b(ice|es|hot water.*ice|air panas.*es|concentrate|konsentrat)\b/i.test(text)) {
    reasons.push('Iced Chemex text is missing ice/hot water split reference');
  }
  if (plan.methodFamily === 'chemex' && plan.doseG >= 24 && !/\b(clog|stall|slow drawdown|long drawdown|heavy bed|thick bed|tersumbat|macet|lambat|tebal)\b/i.test(text)) {
    reasons.push('High dose Chemex text is missing clog/stall/slow drawdown warning');
  }
  if (plan.methodFamily === 'origami') {
    if (plan.origamiFilterStyle === 'cone') {
      if (!/\b(cone|conical|kerucut)\b/i.test(text)) {
        reasons.push('Cone filter Origami recipe must mention cone/conical filter');
      }
    } else if (plan.origamiFilterStyle === 'wave') {
      if (!/\b(wave|flat-bottom|flat|gelombang|datar)\b/i.test(text)) {
        reasons.push('Wave filter Origami recipe must mention wave/flat-bottom filter');
      }
    }
    if (plan.recipeStyle === 'mugen_one_pour' && plan.origamiFilterStyle === 'wave') {
      reasons.push('Mugen one-pour style is incompatible with wave filter style');
    }
    if (!/\b(holder|collar|dudukan|stabil)\b/i.test(text)) {
      reasons.push('Origami recipe is missing holder/collar stability warning');
    }
    if (!/\b(seat|seating|flat|ridges|keramik|rata|lipatan)\b/i.test(text)) {
      reasons.push('Origami recipe is missing filter seating instructions');
    }
    if (/\b(v60 dripper|v60 brewer|v60 method|v60 device|seduh dengan v60|alat v60|v60 alat|saringan v60)\b/i.test(text)) {
      reasons.push('Origami text contains V60 dripper/brewer references');
    }
    if (plan.brewMode === 'iced' && !/\b(ice|es|hot water.*ice|air panas.*es|concentrate|konsentrat)\b/i.test(text)) {
      reasons.push('Iced Origami text is missing ice/hot water split reference');
    }
  }
  if (plan.methodFamily === 'april') {
    if (/\b(kalita|wave|generic kalita|kalita copy|wave copy)\b/i.test(text)) {
      reasons.push('April text contains generic Kalita vocabulary');
    }
    if (!/\b(flat-bed|flat bed|alas datar|rata)\b/i.test(text)) {
      reasons.push('April text is missing flat-bed reference');
    }
    if (!/\b(low agitation|low-agitation|agitasi rendah|tanpa aduk berlebih)\b/i.test(text)) {
      reasons.push('April text is missing low agitation reference');
    }
    if (plan.brewMode === 'iced' && !/\b(ice|es|hot water.*ice|air panas.*es|concentrate|konsentrat)\b/i.test(text)) {
      reasons.push('Iced April text is missing ice/hot water split reference');
    }
    if (plan.recipeStyle === 'high_body_heavy_dose' && !/\b(clog|slow flow|slow drawdown|slow drain|tersumbat|lambat|mampet)\b/i.test(text)) {
      reasons.push('High body April text is missing clog/slow flow warning');
    }
  }
  if (plan.methodFamily === 'melitta') {
    if (plan.recipeStyle === 'aromaboy_style' && /\b(pulse|pulse-pour|manual pour|manual pulse|kettle pour|oval pour)\b/i.test(text)) {
      reasons.push('Aromaboy style text contains manual pour-over vocabulary');
    }
    if (plan.recipeStyle !== 'aromaboy_style' && !/\b(trapezoid|trapezoidal|wedge|seam|fold|lipat|keliman|lipatan)\b/i.test(text)) {
      reasons.push('Manual Melitta text is missing trapezoid/filter seam reference');
    }
    if (plan.brewMode === 'iced' && !/\b(ice|es|hot water.*ice|air panas.*es|concentrate|konsentrat)\b/i.test(text)) {
      reasons.push('Iced Melitta text is missing ice/hot water split reference');
    }
    if (plan.recipeStyle === 'dense_classic_extraction' && !/\b(bitter|bitterness|pahit|sepat|astringent)\b/i.test(text)) {
      reasons.push('Dense Melitta text is missing bitterness warning');
    }
  }
  if (plan.methodFamily === 'kono') {
    if (/\b(v60 timing|spiral pour|wall wash|generic v60)\b/i.test(text)) {
      reasons.push('Kono text contains generic V60 vocabulary');
    }
    if (!/\b(center pour|center-core|core sweetness|tengah|pusat)\b/i.test(text)) {
      reasons.push('Kono text is missing center pour/core sweetness reference');
    }
    if (plan.brewMode === 'iced' && !/\b(ice|es|hot water.*ice|air panas.*es|concentrate|konsentrat)\b/i.test(text)) {
      reasons.push('Iced Kono text is missing ice/hot water split reference');
    }
    if (plan.recipeStyle === 'kono_slow_drip_body' && !/\b(over-extraction|over-extract|ekstraksi berlebih|pahit|bitter)\b/i.test(text)) {
      reasons.push('Slow body Kono text is missing over-extraction warning');
    }
  }
  if (plan.methodFamily === 'clever_dripper' && /\b(v60 timing|pulse pour|generic pour-over|spiral pour|wall pouring|pulse pour to final drawdown)\b/i.test(text)) {
    reasons.push('Clever Dripper text contains generic pour-over/V60 vocabulary');
  }
  if (plan.methodFamily === 'clever_dripper' && !/\b(valve|release|drain|immersion|katup|lepas|tiris|rendam)\b/i.test(text)) {
    reasons.push('Clever Dripper text is missing valve/release/drain/immersion reference');
  }
  if (plan.methodFamily === 'clever_dripper' && plan.brewMode === 'iced' && !/\b(ice|es|hot water.*ice|air panas.*es|concentrate|konsentrat)\b/i.test(text)) {
    reasons.push('Iced Clever text is missing ice/hot water split reference');
  }
  if (plan.methodFamily === 'clever_dripper' && plan.doseG >= 24 && !/\b(muddy|slow drain|slow release|over-extract|lumpur|tersumbat|lambat|ekstraksi berlebih)\b/i.test(text)) {
    reasons.push('High dose Clever text is missing muddy/slow-drain/over-extraction warning');
  }
  if (plan.methodFamily === 'batch_brew') {
    if (/\b(manual pour|manual pulse|pulse-pour|pulse pour|gooseneck|kettle|teko ceret|ceret|manual bloom|spiral)\b/i.test(text)) {
      reasons.push('Batch Brewer text contains manual pour-over vocabulary (manual pour, kettle, gooseneck, spiral)');
    }
    if (!/\b(basket|keranjang)\b/i.test(text)) {
      reasons.push('Batch Brewer text is missing basket reference');
    }
    if (!/\b(machine cycle|siklus mesin)\b/i.test(text)) {
      reasons.push('Batch Brewer text is missing machine cycle reference');
    }
    if (!/\b(carafe mix|carafe|aduk.*carafe|mix.*carafe|airpot|teko)\b/i.test(text)) {
      reasons.push('Batch Brewer text is missing carafe mix reference');
    }
    if (plan.recipeStyle === 'pre_wet_hybrid_batch' && !/\b(machine specs|fitur|pre-wet|bloom|spesifikasi)\b/i.test(text)) {
      reasons.push('Pre-wet hybrid batch is missing machine capability warning');
    }
    if (plan.brewMode === 'iced' && !/\b(server safety|thermal shock|carafe safety|aman|pecah|shock)\b/i.test(text)) {
      reasons.push('Iced batch is missing server safety warning');
    }
  }
  if (plan.methodFamily === 'siphon') {
    if (/\b(v60 timing|flat bed|pour map|gooseneck|bloom pour|center-to-mid|pulse pour|pulse-pour|generic pour-over|spiral pour|wall pouring)\b/i.test(text)) {
      reasons.push('Siphon text contains non-Siphon pour-over/V60 vocabulary');
    }
    if (/\b(?:ice|iced|es)\b.*\b(lower|bottom|bawah|bulb|globe)\b/i.test(text)) {
      reasons.push('Siphon text suggests adding ice to the lower bowl');
    }
    if (!/\b(heat|panas|api)\b/i.test(text) || !/\b(rise|naik)\b/i.test(text) || !/\b(heat off|remove heat|cut heat|matikan panas|matikan api|off)\b/i.test(text) || !/\b(drawdown|turun)\b/i.test(text)) {
      reasons.push('Siphon text is missing core siphon steps (heat, rise, heat off, drawdown)');
    }
    if (!/\b(safety|warning|caution|hazard|pecah|shock|retak|bahaya|aman|perhatian)\b/i.test(text)) {
      reasons.push('Siphon text is missing safety warnings');
    }
    if (plan.recipeStyle === 'spirit_infusion_style') {
      reasons.push('Spirit infusion style is blocked due to safety/legality concerns (spirit_infusion_style)');
    }
  }
  return {
    allowed: reasons.length === 0,
    risk: reasons.length === 0 ? 'none' : 'blocked',
    reason: reasons.join('; ') || undefined,
    safeText: reasons.length
      ? plan.methodFamily === 'french_press'
        ? 'Recipe adjusted to keep ratio, steep timing, and French Press workflow consistent.'
        : 'Recipe adjusted to keep timing, ratio, and device safety consistent.'
      : undefined,
  };
}

export function formatSafeBrewCaveat(plan: BrewPlan, language?: string): string {
  const caveats: string[] = [];
  const id = isIndonesianLanguage(language);
  if (!isExplicitGeishaVariety(plan.variety)) {
    caveats.push(id
      ? 'Data varietas belum dikunci; sistem tidak akan mengarang varietas.'
      : 'Variety data is not locked; the system will not invent it.');
  }
  if (isUnknownValue(plan.process)) {
    caveats.push(id
      ? 'Data proses belum lengkap; resep memakai acuan tingkat sangrai dan profil target.'
      : 'Process data is not locked; the recipe uses roast level and target profile as the baseline.');
  }
  if (isLowTrustWater(plan)) {
    caveats.push(id
      ? 'Air ini rendah mineral atau butuh input manual; gunakan sebagai base remineralisasi atau isi mineral manual.'
      : 'This water is low-mineral or needs manual input; use it as a remineralization base or enter minerals manually.');
  }
  if (plan.grindSettingVerification !== 'official') {
    const calibrationCue = plan.methodFamily === 'aeropress'
      ? (id ? 'waktu rendam, durasi tekan, dan rasa' : 'steep time, press duration, and taste')
      : plan.methodFamily === 'french_press'
        ? (id ? 'waktu rendam, kejernihan tuang pisah, dan rasa' : 'steep time, clean decanting, and taste')
        : plan.methodFamily === 'espresso'
          ? (id ? 'yield, flow, dan rasa' : 'yield, flow, and taste')
          : plan.methodFamily === 'cold_brew'
            ? (id ? 'waktu rendam dan rasa' : 'steep time and taste')
            : plan.methodFamily === 'moka_pot'
              ? (id ? 'waktu mengalir dan rasa' : 'flow time and taste')
              : (id ? 'air turun dan rasa' : 'drawdown and taste');
    caveats.push(id
      ? `Setelan grinder adalah titik awal; kalibrasi dengan ${calibrationCue}.`
      : `The grinder setting is a starting point; calibrate by ${calibrationCue}.`);
  }
  if (!brewerIsExact(plan)) {
    caveats.push(id
      ? 'Profil alat ini turunan/eksperimental; lakukan kalibrasi rasa.'
      : 'This brewer profile is derived or experimental; calibrate from the cup.');
  }

  if (
    plan.targetProfileId === 'floral_transparent' &&
    plan.formState.roastLevel === 'light' &&
    (isUnknownValue(plan.formState.variety) || isUnknownValue(plan.formState.coffeeName) || isUnknownValue(plan.formState.process))
  ) {
    caveats.push(id
      ? 'Target floral pada light roast butuh data bean valid (origin/varietas). Keakuratan floral mungkin menurun tanpa data sumber.'
      : 'Floral target on light roast requires valid bean data (origin/variety). Floral accuracy may drop without source data.');
  }

  if (caveats.length === 0) {
    return id
      ? '✓ Logika software/barista lulus. Bukti fisik seduhan (real brew validation) tetap disarankan.'
      : '✓ Software/barista reasoning passed. Real brew validation is still required.';
  }

  return caveats.join('\n');
}

export function sanitizeBrewNarrative(text: string, plan: BrewPlan, language?: string): string {
  let output = String(text || '');
  if (!output.trim()) return output;
  const id = isIndonesianLanguage(language);

  if (!isExplicitGeishaVariety(plan.variety)) {
    output = output.replace(GEISHA_PATTERN, id ? 'kopi ini' : 'this coffee');
  }

  if (isUnknownValue(plan.process)) {
    output = output.replace(PROCESS_FACT_PATTERN, id ? 'proses belum dikunci' : 'process not locked');
  }

  output = output.replace(
    ORIGIN_DETAIL_LINE_PATTERN,
    id ? 'Catatan asal detail belum dikunci di planner.' : 'Detailed origin notes are not locked in the planner.',
  );

  if (isLowTrustWater(plan)) {
    output = output.replace(READY_WATER_CLAIM_PATTERN, id ? 'butuh verifikasi mineral' : 'needs mineral verification');
    if (!/rendah mineral|manual|required|remineral/i.test(output)) {
      output += `\n\n${formatSafeBrewCaveat(plan, language).split('\n').find((line) => /air|water/i.test(line)) || (id ? 'Air perlu diverifikasi manual sebelum dianggap siap seduh.' : 'Water needs manual verification before it is treated as brew-ready.')}`;
    }
  }

  if (plan.grindSettingVerification !== 'official') {
    output = output.replace(OFFICIAL_GRINDER_CLAIM_PATTERN, 'referensi grinder curated');
  }

  if (!brewerIsExact(plan)) {
    const label = plan.deviceProfileMode === 'family_fallback'
      ? (id ? 'Butuh kalibrasi' : 'Needs calibration')
      : (id ? 'Profil turunan' : 'Derived profile');
    output = output.replace(EXACT_BREWER_CLAIM_PATTERN, label);
  }

  if (plan.brewMode === 'iced') {
    const totalPattern = new RegExp(`(?:hasil cangkir|cup output|final output)[^\\n]{0,40}\\b${plan.totalWaterMl}\\b\\s*(?:ml|g)?`, 'gi');
    output = output.replace(totalPattern, `estimasi hasil cangkir ±${plan.estimatedCupOutputMl} ml setelah retensi kopi`);
  }

  return output;
}

export function validateBrewPlanOutput(plan: BrewPlan): BrewGuardResult {
  const reasons: string[] = [];
  const numericFields = [
    ['doseG', plan.doseG],
    ['totalWaterMl', plan.totalWaterMl],
    ['hotWaterMl', plan.hotWaterMl],
    ['iceMl', plan.iceMl],
    ['waterTempC', plan.waterTempC],
    ['totalTimeSeconds', plan.totalTimeSeconds],
    ['finalBeverageRatio', plan.finalBeverageRatio],
    ['hotExtractionRatio', plan.hotExtractionRatio],
  ] as const;

  for (const [field, value] of numericFields) {
    if (!Number.isFinite(value)) reasons.push(`${field} is not finite`);
  }
  reasons.push(...validateBrewPlanRatioInvariants(plan));

  if (plan.brewMode === 'iced') {
    if (Math.abs((plan.hotWaterMl + plan.iceMl) - plan.totalWaterMl) > 1) {
      reasons.push('iced hotWaterMl + iceMl must equal totalWaterMl');
    }
    if (!(plan.estimatedCupOutputMl < plan.totalWaterMl)) {
      reasons.push('iced estimatedCupOutputMl must be lower than totalWaterMl');
    }
    const volumeTargetSteps = plan.steps.filter((step) => {
      const kind = step.kind || 'pour';
      return (kind === 'pour' || kind === 'extract') && step.pourVolumeMl > 0;
    });
    const lastVolumeTargetStep = volumeTargetSteps[volumeTargetSteps.length - 1];
    const totalPouredHotWaterMl = volumeTargetSteps.reduce((sum, step) => sum + step.pourVolumeMl, 0);
    if (!lastVolumeTargetStep || Math.abs(lastVolumeTargetStep.targetVolumeMl - plan.hotWaterMl) > 1) {
      reasons.push('iced last hot-water target step must equal hotWaterMl');
    }
    if (Math.abs(totalPouredHotWaterMl - plan.hotWaterMl) > 1) {
      reasons.push('iced pour/extract volume sum must equal hotWaterMl');
    }
  }

  let narrative = stripGrinderCalibrationNotes([
    plan.summary,
    ...plan.notes,
    ...plan.warnings,
    ...(plan.workflowGuideSteps || []).map((step) => `${step.label} ${step.primaryText} ${step.secondaryText || ''}`),
    ...(plan.aiNotes ? Object.values(plan.aiNotes).filter(Boolean) : []),
  ].join('\n'));
  const sanitized = sanitizeBrewNarrative(narrative, plan);
  if (sanitized !== narrative && /geisha|gesha|official grind|profil exact|ready[-\s]?brew/i.test(narrative)) {
    reasons.push('stored narrative contains unsafe factual claims');
  }
  narrative = stripMetadataNames(narrative, plan);

  const timingValidation = validateBrewPlanTiming(plan);
  if (!timingValidation.allowed && timingValidation.reason) reasons.push(timingValidation.reason);
  const textValidation = validateUserFacingRecipeText(plan);
  if (!textValidation.allowed && textValidation.reason) reasons.push(textValidation.reason);

  if (isLowTrustWater(plan) && /ideal|excellent|ready[-\s]?brew|sangat cocok/i.test(narrative)) {
    reasons.push('low-trust water narrative claims ready-brew status');
  }

  if (plan.grindRecommendation && /Gilingan:\s*setting 4-4[\s\S]*Sumber.*setting 4-5/i.test(plan.grindRecommendation)) {
    reasons.push('conflicting grind display');
  }

  if (plan.workflowValidation && !plan.workflowValidation.passed) {
    reasons.push(`workflow guide failed validation: ${plan.workflowValidation.blockingErrors.join(', ')}`);
  }

  if (plan.methodFamily === 'aeropress' && /final pour|drawdown bed|wall rinse/i.test(narrative)) {
    reasons.push('AeroPress narrative contains pour-over workflow wording');
  }
  if (plan.methodFamily === 'french_press' && /drawdown|pour map|bloom|final pour|flat bed|center-to-mid|hiss/i.test(narrative)) {
    reasons.push('French Press narrative contains pour-over workflow wording');
  }
  if (plan.methodFamily === 'moka_pot' && (/bloom|final pour|center-to-mid|kettle pour|pulse pour|pulse-pour|drawdown/i.test(narrative) || /\b(true espresso|real espresso|espresso asli|espresso sejati)\b/i.test(narrative))) {
    reasons.push('Moka Pot narrative contains pour-over/espresso wording');
  }
  if (plan.methodFamily === 'espresso' && /bloom|kettle|filter wall|final pour|add water/i.test(narrative)) {
    reasons.push('Espresso narrative contains filter-brew workflow wording');
  }
  if (plan.methodFamily === 'cold_brew' && /hot bloom|kettle temperature|hot pour/i.test(narrative)) {
    reasons.push('Cold Brew narrative contains hot workflow wording');
  }
  if (plan.methodFamily === 'cold_brew') {
    const isToddy = plan.dripper.id === 'toddy-cold-brew' || (plan.dripper.name && plan.dripper.name.toLowerCase().includes('toddy'));
    if (isToddy) {
      if (plan.recipeStyle === 'cold_drip_tower' || plan.recipeStyle === 'japanese_slow_drip') {
        reasons.push('Toddy cannot use drip-style recipes');
      }
      if (/hot bloom|bloom panas|kettle temperature|kettle temp|suhu teko|suhu ceret/i.test(narrative)) {
        reasons.push('Toddy cold brew narrative contains hot bloom or kettle temperature');
      }
      if (plan.brewMode === 'hot') {
        if (!/\b(hot serving|serving|dilute|dilution|encerkan|sajian panas|campur|tambah air panas)\b/i.test(narrative)) {
          reasons.push('Toddy hot mode narrative must be hot serving/dilution only');
        }
      }
    }
  }
  if (plan.methodFamily === 'chemex' && /\b(v60 timing|small dripper|quick drawdown|thin paper)\b/i.test(narrative)) {
    reasons.push('Chemex narrative contains non-Chemex vocabulary');
  }
  if (plan.methodFamily === 'origami') {
    if (plan.origamiFilterStyle === 'cone') {
      if (!/\b(cone|conical|kerucut)\b/i.test(narrative)) {
        reasons.push('Cone filter Origami recipe must mention cone/conical filter');
      }
    } else if (plan.origamiFilterStyle === 'wave') {
      if (!/\b(wave|flat-bottom|flat|gelombang|datar)\b/i.test(narrative)) {
        reasons.push('Wave filter Origami recipe must mention wave/flat-bottom filter');
      }
    }
    if (plan.recipeStyle === 'mugen_one_pour' && plan.origamiFilterStyle === 'wave') {
      reasons.push('Mugen one-pour style is incompatible with wave filter style');
    }
    if (/\b(v60 dripper|v60 brewer|v60 method|v60 device|seduh dengan v60|alat v60|v60 alat|saringan v60)\b/i.test(narrative)) {
      reasons.push('Origami narrative contains V60 dripper/brewer references');
    }
    if (!/\b(holder|collar|dudukan|stabil)\b/i.test(narrative)) {
      reasons.push('Origami narrative is missing holder/collar stability warning');
    }
    if (!/\b(seat|seating|flat|ridges|keramik|rata|lipatan)\b/i.test(narrative)) {
      reasons.push('Origami narrative is missing filter seating instructions');
    }
  }
  if (plan.methodFamily === 'april') {
    if (/\b(kalita|wave|generic kalita|kalita copy|wave copy)\b/i.test(narrative)) {
      reasons.push('April narrative contains generic Kalita vocabulary');
    }
  }
  if (plan.methodFamily === 'melitta') {
    if (plan.recipeStyle === 'aromaboy_style' && /\b(pulse|pulse-pour|manual pour|manual pulse|kettle pour|oval pour)\b/i.test(narrative)) {
      reasons.push('Aromaboy narrative contains manual pour-over vocabulary');
    }
  }
  if (plan.methodFamily === 'kono') {
    if (/\b(v60 timing|spiral pour|wall wash|generic v60)\b/i.test(narrative)) {
      reasons.push('Kono narrative contains generic V60 vocabulary');
    }
  }
  if (plan.methodFamily === 'clever_dripper' && /\b(v60 timing|pulse pour|generic pour-over|pulse-pour|generic clever)\b/i.test(narrative)) {
    reasons.push('Clever Dripper narrative contains non-Clever generic pour-over vocabulary');
  }
  if (plan.methodFamily === 'batch_brew' && /\b(manual pour|manual pulse|pulse-pour|pulse pour|gooseneck|kettle|teko ceret|ceret|manual bloom|spiral)\b/i.test(narrative)) {
    reasons.push('Batch Brewer narrative contains manual pour-over vocabulary');
  }
  if (plan.methodFamily === 'siphon') {
    if (/\b(v60 timing|flat bed|pour map|gooseneck|bloom pour|center-to-mid|pulse pour|pulse-pour|generic pour-over|spiral pour|wall pouring)\b/i.test(narrative)) {
      reasons.push('Siphon narrative contains non-Siphon pour-over/V60 vocabulary');
    }
    if (/\b(?:ice|iced|es)\b.*\b(lower|bottom|bawah|bulb|globe)\b/i.test(narrative)) {
      reasons.push('Siphon narrative suggests adding ice to the lower bowl');
    }
    if (plan.recipeStyle === 'spirit_infusion_style') {
      reasons.push('Spirit infusion style is blocked due to safety/legality concerns (spirit_infusion_style)');
    }
  }

  const blocked = reasons.some((reason) => /not finite|must equal|must be lower|conflicting|workflow guide failed|workflow wording|ratio mismatch|canonical|placeholder|developer copy|mislabeled|vocabulary|starts before|spirit_infusion_style|spirit infusion|incompatible|Origami/i.test(reason));
  return {
    allowed: !blocked,
    risk: reasons.length === 0 ? 'none' : blocked ? 'blocked' : 'medium',
    reason: reasons.join('; ') || undefined,
    safeText: reasons.length ? formatSafeBrewCaveat(plan) : undefined,
  };
}
