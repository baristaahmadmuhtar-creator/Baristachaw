import type {
  AiBrewMethodFamily,
  BrewPlan,
  BrewPlanStep,
  MethodWorkflowValidationResult,
  SwitchBrewProgramme,
  SwitchChamberState,
  SwitchValveState,
  WorkflowGuideActionType,
  WorkflowGuideStep,
  WorkflowGuideTechniqueChip,
  WorkflowGuideChipKey,
} from './types.ts';

const POUROVER_FAMILIES = new Set<AiBrewMethodFamily>([
  'v60',
  'chemex',
  'kalita_wave',
  'origami',
  'april',
  'melitta',
  'kono',
]);

function formatMl(value: number) {
  return `${Math.round(value)} ml`;
}

function formatGrams(value: number) {
  return `${Math.round(value)} g`;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function compactGuideText(value?: string, maxLength = 240) {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length <= maxLength) return text || undefined;
  const sentence = text.split(/(?<=[.!?])\s+/).find((part) => part.length >= 24 && part.length <= maxLength);
  if (sentence) return sentence.trim();
  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 120 ? lastSpace : maxLength).trim()}...`;
}

function chip(key: WorkflowGuideChipKey, label: string, value: string): WorkflowGuideTechniqueChip {
  return { key, label, value };
}

function formatPourPath(value?: string) {
  if (!value) return '';
  return value
    .replace(/center_to_mid/g, 'tengah-ke-tengah-luar')
    .replace(/center/g, 'tengah')
    .replace(/spiral/g, 'spiral')
    .replace(/wall/g, 'dinding')
    .replace(/_/g, ' ');
}

function formatPourHeight(value?: string) {
  if (!value) return '';
  return value
    .replace(/low/g, 'rendah')
    .replace(/medium/g, 'sedang')
    .replace(/high/g, 'tinggi')
    .replace(/_/g, ' ');
}

function formatAgitation(value?: string) {
  if (!value) return '';
  return value
    .replace(/minimal/g, 'minimal')
    .replace(/low/g, 'rendah')
    .replace(/medium/g, 'sedang')
    .replace(/high/g, 'tinggi')
    .replace(/_/g, ' ');
}

function formatValve(value?: string) {
  if (!value) return '';
  return value
    .replace(/closed/g, 'tutup')
    .replace(/open/g, 'buka')
    .replace(/_/g, ' ');
}

function formatChamber(value?: string) {
  if (!value) return '';
  return value
    .replace(/empty/g, 'kosong')
    .replace(/served/g, 'selesai')
    .replace(/immersion/g, 'immersion')
    .replace(/percolation/g, 'perkolasi')
    .replace(/_/g, ' ');
}

function flowChip(step: BrewPlanStep) {
  const [min, max] = step.flowRateMlPerSec || [];
  return Number.isFinite(min) && Number.isFinite(max)
    ? chip('flow', 'Aliran', `${min}-${max} ml/s`)
    : null;
}

function pathChip(step: BrewPlanStep) {
  return step.pourPath ? chip('path', 'Jalur', formatPourPath(step.pourPath)) : null;
}

function heightChip(step: BrewPlanStep) {
  return step.pourHeight ? chip('height', 'Tinggi', formatPourHeight(step.pourHeight)) : null;
}

function agitationChip(step: BrewPlanStep) {
  return step.agitationLevel ? chip('agitation', 'Agitasi', formatAgitation(step.agitationLevel)) : null;
}

function formatSwitchProgramme(programme: SwitchBrewProgramme | string) {
  return String(programme).replace(/_/g, ' ');
}

function techniqueChipsFromStep(step: BrewPlanStep): WorkflowGuideTechniqueChip[] {
  return [
    flowChip(step),
    pathChip(step),
    heightChip(step),
    agitationChip(step),
    step.valveState ? chip('valve', 'Katup', formatValve(step.valveState)) : null,
    step.chamberState ? chip('chamber', 'Ruang', formatChamber(step.chamberState)) : null,
    Number.isFinite(step.chamberLoadMl) ? chip('chamber_load', 'Muatan ruang', formatMl(step.chamberLoadMl || 0)) : null,
    step.switchProgramme ? chip('programme', 'Program', formatSwitchProgramme(step.switchProgramme)) : null,
  ].filter(Boolean) as WorkflowGuideTechniqueChip[];
}

function normalizeStart(seconds: number) {
  return Math.max(0, Math.round(seconds));
}

function sourceStep(
  actionType: WorkflowGuideActionType,
  step: BrewPlanStep,
  params: {
    id?: string;
    label?: string;
    primaryText: string;
    secondaryText?: string;
    techniqueChips?: WorkflowGuideTechniqueChip[];
    warnings?: string[];
    isOperationalOnly?: boolean;
    endSeconds?: number;
  },
): WorkflowGuideStep {
  return {
    ...step,
    id: params.id || `guide_${actionType}_${step.id}`,
    label: params.label || step.label,
    actionType,
    primaryText: params.primaryText,
    secondaryText: compactGuideText(params.secondaryText),
    endSeconds: params.endSeconds,
    techniqueChips: params.techniqueChips || techniqueChipsFromStep(step),
    warnings: params.warnings || [],
    sourceStepIds: [step.id],
    isOperationalOnly: Boolean(params.isOperationalOnly),
    note: params.primaryText,
    hybridInstruction: compactGuideText(params.secondaryText) || step.hybridInstruction,
  };
}

function operationalStep(params: {
  id: string;
  label: string;
  actionType: WorkflowGuideActionType;
  startSeconds: number;
  endSeconds?: number;
  targetVolumeMl?: number;
  pourVolumeMl?: number;
  primaryText: string;
  secondaryText?: string;
  techniqueChips?: WorkflowGuideTechniqueChip[];
  warnings?: string[];
  sourceStepIds?: string[];
  kind?: BrewPlanStep['kind'];
  valveState?: SwitchValveState;
  chamberState?: SwitchChamberState;
  chamberLoadMl?: number;
  switchProgramme?: SwitchBrewProgramme;
}): WorkflowGuideStep {
  return {
    id: params.id,
    label: params.label,
    kind: params.kind || (params.actionType === 'serve' ? 'serve' : params.actionType === 'press' ? 'press' : params.actionType === 'heat' ? 'heat' : 'wait'),
    startSeconds: normalizeStart(params.startSeconds),
    endSeconds: typeof params.endSeconds === 'number' ? normalizeStart(params.endSeconds) : undefined,
    targetVolumeMl: Math.max(0, Math.round(params.targetVolumeMl || 0)),
    pourVolumeMl: Math.max(0, Math.round(params.pourVolumeMl || 0)),
    valveState: params.valveState,
    chamberState: params.chamberState,
    chamberLoadMl: params.chamberLoadMl,
    switchProgramme: params.switchProgramme,
    actionType: params.actionType,
    primaryText: params.primaryText,
    secondaryText: compactGuideText(params.secondaryText),
    techniqueChips: params.techniqueChips || [],
    warnings: params.warnings || [],
    sourceStepIds: params.sourceStepIds || [],
    isOperationalOnly: true,
    note: params.primaryText,
    hybridInstruction: compactGuideText(params.secondaryText),
  };
}

function firstVolumeStep(plan: BrewPlan) {
  return plan.steps.find((step) => step.pourVolumeMl > 0) || plan.steps[0];
}

function lastVolumeStep(plan: BrewPlan) {
  return [...plan.steps].reverse().find((step) => step.pourVolumeMl > 0) || plan.steps.at(-1);
}

function findKind(plan: BrewPlan, kind: BrewPlanStep['kind']) {
  return plan.steps.find((step) => (step.kind || 'pour') === kind);
}

function stepsSorted(steps: WorkflowGuideStep[]) {
  return steps
    .map((step, index) => ({ step, index }))
    .sort((a, b) => a.step.startSeconds - b.step.startSeconds || a.index - b.index)
    .map(({ step }) => step);
}

function buildPouroverGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const first = firstVolumeStep(plan);
  const last = lastVolumeStep(plan);
  const isIced = plan.brewMode === 'iced';
  const methodLower = plan.methodFamily.replace(/_/g, ' ');
  const prepText = plan.methodFamily === 'chemex'
    ? 'Bilas filter tebal, panaskan kaca, dan pastikan jalur udara terbuka.'
    : plan.methodFamily === 'kalita_wave' || plan.methodFamily === 'april' || plan.methodFamily === 'melitta'
      ? 'Bilas dan panaskan alat, ratakan bed, lalu siapkan pulse rendah.'
      : 'Bilas filter, panaskan brewer/server, buang air bilas, lalu tara timbangan.';
  const guide: WorkflowGuideStep[] = [
    operationalStep({
      id: `guide_${plan.methodFamily}_setup`,
      label: 'Setup',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: isIced
        ? `${prepText} Masukkan ${formatGrams(plan.iceMl)} es ke server. Seduh air panas saja; es bypass terukur.`
        : prepText,
      techniqueChips: [
        chip('basket_prep', 'Persiapan', plan.methodFamily === 'chemex' ? 'filter tebal + vent terbuka' : `${methodLower} siap`),
      ],
    }),
  ];

  plan.steps.forEach((step, index) => {
    const isFirstPour = step.pourVolumeMl > 0 && step.id === first?.id;
    const isLastPour = step.pourVolumeMl > 0 && step.id === last?.id;
    const actionType: WorkflowGuideActionType = isFirstPour ? 'bloom' : (step.kind || 'pour') === 'drawdown' ? 'drawdown' : 'pour';
    const label = isFirstPour ? 'Bloom' : isLastPour ? 'Tuang akhir' : index <= 1 ? 'Tuang tengah' : step.label;
    const targetText = isIced && step.pourVolumeMl > 0
      ? `Target ${formatMl(step.targetVolumeMl)} air panas.`
      : `Target ${formatMl(step.targetVolumeMl)}.`;
    const familyCue = plan.methodFamily === 'chemex'
      ? 'Jaga aliran stabil dan biarkan vent filter tetap terbuka.'
      : plan.methodFamily === 'kalita_wave' || plan.methodFamily === 'april' || plan.methodFamily === 'melitta'
        ? 'Jaga bed rata dengan pulse rendah dari tengah.'
        : plan.methodFamily === 'kono'
          ? 'Tuang fokus di tengah dengan ritme tenang.'
          : 'Tuang tenang dari tengah ke tengah-luar.';
    guide.push(sourceStep(actionType, step, {
      label,
      primaryText: step.pourVolumeMl > 0
        ? `Tuang ${formatMl(step.pourVolumeMl)}. ${targetText}`
        : targetText,
      secondaryText: familyCue,
    }));
  });

  guide.push(operationalStep({
    id: `guide_${plan.methodFamily}_drawdown`,
    label: 'Air turun',
    actionType: 'drawdown',
      startSeconds: Math.max(last?.startSeconds || 0, plan.totalTimeSeconds - 20),
      endSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: isIced
      ? `Biarkan air turun di atas es sampai target ${formatMl(plan.hotWaterMl)} air panas. Seduh target air panas saja; jangan tambah bypass air.`
      : 'Biarkan air turun alami; hindari bilas dinding atau swirl berat di akhir.',
    techniqueChips: [
      chip('drawdown', 'Air turun', formatTime(plan.totalTimeSeconds)),
      ...(isIced ? [chip('stop', 'Berhenti', `${formatMl(plan.hotWaterMl)} air panas`)] : []),
    ],
    sourceStepIds: last ? [last.id] : [],
  }));

  guide.push(operationalStep({
    id: `guide_${plan.methodFamily}_serve`,
    label: 'Sajikan',
    actionType: 'serve',
    startSeconds: plan.totalTimeSeconds,
    targetVolumeMl: plan.hotWaterMl,
    primaryText: isIced
      ? 'Aduk es 5-8 detik agar konsentrat panas rata. Aduk es tidak menambah ekstraksi; ini hanya finishing.'
      : 'Sajikan setelah bed turun bersih.',
    techniqueChips: isIced ? [chip('mix_batch', 'Aduk', '5-8 detik')] : [],
  }));

  return stepsSorted(guide);
}

function buildAeroPressGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const charge = firstVolumeStep(plan);
  const press = findKind(plan, 'press');
  const pressStart = press?.startSeconds ?? Math.max(45, plan.totalTimeSeconds - 30);
  const chargeTarget = charge?.targetVolumeMl || plan.hotWaterMl;
  return stepsSorted([
    operationalStep({
      id: 'guide_aeropress_setup',
      label: 'Setup',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: 'Panaskan chamber, bilas filter/cap, rakit aman, lalu tara timbangan.',
      techniqueChips: [chip('basket_prep', 'Persiapan', 'filter/cap dibilas')],
    }),
    charge ? sourceStep('charge', charge, {
      label: 'Isi air',
      primaryText: `Masukkan ${formatMl(charge.pourVolumeMl || chargeTarget)} ke chamber dan basahi bed merata.`,
      secondaryText: 'Basahi bed merata; jangan tambah agitasi berat.',
      techniqueChips: [
        chip('charge', 'Isi', formatMl(charge.pourVolumeMl || chargeTarget)),
        ...techniqueChipsFromStep(charge),
      ],
    }) : operationalStep({
      id: 'guide_aeropress_charge',
      label: 'Isi air',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `Masukkan ${formatMl(plan.hotWaterMl)} ke chamber dan basahi bed merata.`,
      techniqueChips: [chip('charge', 'Isi', formatMl(plan.hotWaterMl))],
    }),
    operationalStep({
      id: 'guide_aeropress_stir',
      label: 'Aduk ringan',
      actionType: 'stir',
      startSeconds: Math.min(Math.max(10, charge?.startSeconds || 0), Math.max(10, pressStart - 45)),
      targetVolumeMl: chargeTarget,
      primaryText: 'Aduk 3-5 kali atau swirl ringan sekali, lalu hentikan agitasi.',
      techniqueChips: [chip('stir', 'Aduk', '3-5x')],
      sourceStepIds: charge ? [charge.id] : [],
    }),
    operationalStep({
      id: 'guide_aeropress_steep',
      label: 'Rendam',
      actionType: 'steep',
      startSeconds: Math.max(15, Math.min(pressStart - 35, Math.round(pressStart * 0.45))),
      endSeconds: pressStart,
      targetVolumeMl: chargeTarget,
      primaryText: `Rendam sampai ${formatTime(pressStart)}; jaga chamber stabil dan tertutup.`,
      techniqueChips: [chip('steep', 'Rendam', formatTime(Math.max(10, pressStart)))],
    }),
    press ? sourceStep('press', press, {
      label: 'Tekan',
      primaryText: 'Tekan stabil selama 20-30 detik.',
      secondaryText: 'Jaga tekanan stabil dan berhenti sebelum hiss kering.',
      techniqueChips: [chip('press', 'Tekan', '20-30 detik'), chip('stop', 'Berhenti', 'sebelum hiss')],
    }) : operationalStep({
      id: 'guide_aeropress_press',
      label: 'Tekan',
      actionType: 'press',
      kind: 'press',
      startSeconds: pressStart,
      endSeconds: Math.min(plan.totalTimeSeconds, pressStart + 30),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Tekan stabil selama 20-30 detik.',
      techniqueChips: [chip('press', 'Tekan', '20-30 detik'), chip('stop', 'Berhenti', 'sebelum hiss')],
    }),
    operationalStep({
      id: 'guide_aeropress_stop',
      label: 'Berhenti sebelum hiss',
      actionType: 'stop',
      startSeconds: Math.min(plan.totalTimeSeconds, pressStart + 25),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Berhenti sebelum suara hiss kering terasa kasar, lalu pisahkan brewer dari cup.',
      techniqueChips: [chip('stop', 'Berhenti', 'sebelum hiss')],
      sourceStepIds: press ? [press.id] : [],
    }),
    operationalStep({
      id: 'guide_aeropress_serve',
      label: 'Sajikan',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: plan.notes.join(' ').toLowerCase().includes('bypass')
        ? 'Tambahkan bypass hanya setelah tekan jika style resep memerlukannya, lalu sajikan.'
        : 'Swirl cup pelan, lalu sajikan.',
      techniqueChips: plan.notes.join(' ').toLowerCase().includes('bypass')
        ? [chip('dilution', 'Bypass', 'setelah tekan saja')]
        : [],
    }),
  ]);
}

function buildFrenchPressGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const charge = firstVolumeStep(plan);
  const serve = findKind(plan, 'serve') || plan.steps.at(-1);
  const steepStart = Math.min(60, Math.max(20, Math.round(plan.totalTimeSeconds * 0.2)));
  const settleStart = Math.max(steepStart + 30, Math.round(plan.totalTimeSeconds * 0.72));
  const pressStart = Math.max(settleStart + 15, (serve?.startSeconds || plan.totalTimeSeconds) - 30);
  return stepsSorted([
    operationalStep({
      id: 'guide_french_press_setup',
      label: 'Panaskan alat',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: 'Panaskan press, tara timbangan, dan gunakan gilingan kasar yang merata.',
      techniqueChips: [chip('basket_prep', 'Persiapan', 'gilingan kasar rata')],
    }),
    charge ? sourceStep('charge', charge, {
      label: 'Isi air',
      primaryText: `Masukkan ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)} dan basahi semua bubuk.`,
      secondaryText: 'Pastikan semua bubuk basah sebelum fase rendam.',
      techniqueChips: [chip('charge', 'Isi', formatMl(charge.pourVolumeMl || plan.hotWaterMl))],
    }) : operationalStep({
      id: 'guide_french_press_charge',
      label: 'Isi air',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `Masukkan ${formatMl(plan.hotWaterMl)} dan basahi semua bubuk.`,
      techniqueChips: [chip('charge', 'Isi', formatMl(plan.hotWaterMl))],
    }),
    operationalStep({
      id: 'guide_french_press_steep',
      label: 'Rendam',
      actionType: 'steep',
      startSeconds: steepStart,
      endSeconds: settleStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Rendam tenang; jangan terus diaduk setelah semua bubuk basah.',
      techniqueChips: [chip('steep', 'Rendam', formatTime(Math.max(0, settleStart - steepStart)))],
    }),
    operationalStep({
      id: 'guide_french_press_settle',
      label: 'Endapkan',
      actionType: 'settle',
      startSeconds: settleStart,
      endSeconds: pressStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Pecah crust pelan atau buang foam, lalu biarkan fines turun.',
      techniqueChips: [chip('settle', 'Endapkan', 'pelan')],
    }),
    operationalStep({
      id: 'guide_french_press_press',
      label: 'Tekan pelan',
      actionType: 'press',
      kind: 'press',
      startSeconds: pressStart,
      endSeconds: serve?.startSeconds || plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Tekan pelan; jangan memeras bed.',
      techniqueChips: [chip('press', 'Tekan', 'pelan')],
    }),
    operationalStep({
      id: 'guide_french_press_decant',
      label: 'Tuang pisah',
      actionType: 'decant',
      startSeconds: serve?.startSeconds || plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Tuang pisah segera untuk menghentikan ekstraksi, lalu sajikan.',
      techniqueChips: [chip('decant', 'Tuang pisah', 'hentikan ekstraksi')],
      sourceStepIds: serve ? [serve.id] : [],
    }),
  ]);
}

function buildCleverGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const charge = firstVolumeStep(plan);
  const release = findKind(plan, 'release');
  const drawdown = findKind(plan, 'drawdown');
  const releaseStart = release?.startSeconds || Math.max(60, plan.totalTimeSeconds - 70);
  return stepsSorted([
    operationalStep({
      id: 'guide_clever_setup',
      label: 'Bilas dan panaskan',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: 'Bilas filter, panaskan brewer/server, pastikan jalur bawah siap, lalu tara timbangan.',
      techniqueChips: [chip('basket_prep', 'Persiapan', 'release siap')],
    }),
    charge ? sourceStep('charge', charge, {
      label: 'Isi air',
      primaryText: `Masukkan ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)} dan basahi bed merata.`,
      secondaryText: 'Basahi bed merata; biarkan immersion mulai bekerja.',
      techniqueChips: [chip('charge', 'Isi', formatMl(charge.pourVolumeMl || plan.hotWaterMl))],
    }) : operationalStep({
      id: 'guide_clever_charge',
      label: 'Isi air',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `Masukkan ${formatMl(plan.hotWaterMl)} dan basahi bed merata.`,
      techniqueChips: [chip('charge', 'Isi', formatMl(plan.hotWaterMl))],
    }),
    operationalStep({
      id: 'guide_clever_steep',
      label: 'Rendam',
      actionType: 'steep',
      startSeconds: Math.min(45, releaseStart),
      endSeconds: releaseStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Rendam tenang; waktu kontak adalah kontrol ekstraksi utama.',
      techniqueChips: [chip('steep', 'Rendam', formatTime(releaseStart))],
    }),
    release ? sourceStep('release', release, {
      label: 'Alirkan keluar',
      primaryText: 'Mulai alirkan kopi keluar dan jangan aduk saat air turun.',
      secondaryText: 'Biarkan aliran keluar bersih tanpa topping up.',
      techniqueChips: [chip('release', 'Alirkan', 'bersih')],
    }) : operationalStep({
      id: 'guide_clever_release',
      label: 'Alirkan keluar',
      actionType: 'release',
      kind: 'release',
      startSeconds: releaseStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Mulai alirkan kopi keluar dan jangan aduk saat air turun.',
      techniqueChips: [chip('release', 'Alirkan', 'bersih')],
    }),
    drawdown ? sourceStep('drawdown', drawdown, {
      label: 'Air turun',
      primaryText: 'Biarkan air turun selesai tanpa tambah air.',
      techniqueChips: [chip('drawdown', 'Air turun', formatTime(plan.totalTimeSeconds))],
    }) : operationalStep({
      id: 'guide_clever_drawdown',
      label: 'Air turun',
      actionType: 'drawdown',
      kind: 'drawdown',
      startSeconds: Math.min(plan.totalTimeSeconds, releaseStart + 20),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Biarkan air turun selesai tanpa tambah air.',
      techniqueChips: [chip('drawdown', 'Air turun', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_clever_serve',
      label: 'Sajikan',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Sajikan setelah bed turun bersih.',
    }),
  ]);
}

function switchActionType(step: BrewPlanStep): WorkflowGuideActionType {
  if (step.kind === 'release') return 'release';
  if (step.kind === 'drawdown') return 'drawdown';
  if (step.kind === 'serve') return 'serve';
  if (step.kind === 'wait') return 'steep';
  return step.pourVolumeMl > 0 ? 'charge' : 'wait';
}

function buildSwitchPrimaryText(plan: BrewPlan, step: BrewPlanStep) {
  const time = formatTime(step.startSeconds);
  const valve = step.valveState === 'closed'
    ? 'Katup tutup'
    : step.valveState === 'open'
      ? 'Katup buka'
      : 'Katup sesuai mode';
  const chamber = Number.isFinite(step.chamberLoadMl) && step.valveState === 'closed'
    ? ` · muatan ruang ${formatMl(step.chamberLoadMl || 0)}`
    : '';
  const targetLabel = plan.brewMode === 'iced' ? 'target panas' : 'target';
  if (step.pourVolumeMl > 0) {
    return `${time} · ${valve} · tuang ${formatMl(step.pourVolumeMl)} sampai ${formatMl(step.targetVolumeMl)} ${targetLabel}${chamber}.`;
  }
  if (step.kind === 'release') {
    return `${time} · ${valve} · buka katup di ${formatMl(step.targetVolumeMl || plan.hotWaterMl)}; biarkan air turun bersih.`;
  }
  if (step.kind === 'drawdown') {
    return `${time} · ${valve} · air turun sampai selesai tanpa tambah air.`;
  }
  if (step.kind === 'serve') {
    return `${time} · sajikan setelah air turun; jangan tambah bypass di luar plan.`;
  }
  return `${time} · ${valve} · tahan kontak; jaga muatan ruang stabil.`;
}

function buildHarioSwitchGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const programme = (plan.methodProgramme || 'auto') as SwitchBrewProgramme;
  const guideSteps: WorkflowGuideStep[] = [
    operationalStep({
      id: 'guide_hario_switch_setup',
      label: 'Bilas, panaskan, set katup',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: plan.brewMode === 'iced'
        ? `Bilas kertas V60, panaskan brewer/server, tare timbangan, lalu masukkan ${formatGrams(plan.iceMl)} es ke server. Seduh target air panas saja; es adalah bypass terukur.`
        : 'Bilas kertas V60, panaskan brewer/server, tare timbangan, lalu set katup Switch sesuai program.',
      techniqueChips: [
        chip('programme', 'Program', formatSwitchProgramme(programme)),
        chip('valve', 'Katup', 'set sebelum seduh'),
      ],
      switchProgramme: programme,
      valveState: 'closed',
      chamberState: 'empty',
    }),
  ];

  for (const step of plan.steps) {
    const switchChips = techniqueChipsFromStep({
      ...step,
      switchProgramme: step.switchProgramme || programme,
    });
    const warnings = plan.switchStepValidation?.unsafeStepIds.includes(step.id)
      ? [plan.switchStepValidation.message]
      : [];
    guideSteps.push(sourceStep(switchActionType(step), step, {
      id: `guide_hario_switch_${step.id}`,
      label: step.label,
      primaryText: buildSwitchPrimaryText(plan, step),
      secondaryText: step.hybridInstruction || step.note,
      techniqueChips: switchChips,
      warnings,
    }));
  }

  if (!guideSteps.some((step) => step.actionType === 'serve')) {
    guideSteps.push(operationalStep({
      id: 'guide_hario_switch_serve',
      label: 'Sajikan',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: plan.brewMode === 'iced'
        ? 'Aduk es 5-8 detik setelah air turun. Aduk es tidak menambah ekstraksi; catat waktu buka katup untuk dial-in berikutnya.'
        : 'Sajikan setelah air turun dan catat timing muatan ruang untuk dial-in berikutnya.',
      techniqueChips: [
        chip('programme', 'Program', formatSwitchProgramme(programme)),
        chip('chamber', 'Ruang', 'selesai'),
      ],
      switchProgramme: programme,
      valveState: 'open',
      chamberState: 'served',
    }));
  }

  return stepsSorted(guideSteps);
}

function buildMokaGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const heat = findKind(plan, 'heat');
  const serve = findKind(plan, 'serve') || plan.steps.at(-1);
  const heatStart = heat?.startSeconds || Math.max(30, Math.round(plan.totalTimeSeconds * 0.25));
  return stepsSorted([
    operationalStep({
      id: 'guide_moka_boiler',
      label: 'Isi boiler',
      actionType: 'setup',
      startSeconds: 0,
      primaryText: 'Isi boiler di bawah safety valve.',
      techniqueChips: [chip('boiler', 'Boiler', 'di bawah valve')],
    }),
    operationalStep({
      id: 'guide_moka_basket',
      label: 'Ratakan basket',
      actionType: 'dose',
      startSeconds: 0,
      primaryText: 'Isi dan ratakan basket; jangan tamp.',
      techniqueChips: [chip('basket', 'Basket', 'rata, tanpa tamp')],
    }),
    heat ? sourceStep('heat', heat, {
      label: 'Panas sedang',
      primaryText: 'Gunakan panas sedang dan jaga aliran tetap tenang.',
      secondaryText: 'Turunkan panas jika aliran mulai agresif.',
      techniqueChips: [chip('heat', 'Panas', 'sedang')],
    }) : operationalStep({
      id: 'guide_moka_heat',
      label: 'Panas sedang',
      actionType: 'heat',
      kind: 'heat',
      startSeconds: heatStart,
      primaryText: 'Gunakan panas sedang dan jaga aliran tetap tenang.',
      techniqueChips: [chip('heat', 'Panas', 'sedang')],
    }),
    operationalStep({
      id: 'guide_moka_monitor',
      label: 'Pantau aliran',
      actionType: 'monitor_flow',
      startSeconds: Math.min(plan.totalTimeSeconds, heatStart + 30),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Cari aliran stabil; hindari sputter kasar.',
      techniqueChips: [chip('flow_cue', 'Tanda aliran', 'stabil')],
    }),
    operationalStep({
      id: 'guide_moka_stop',
      label: 'Berhenti sebelum sputter',
      actionType: 'stop',
      startSeconds: serve?.startSeconds || plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Angkat dari panas sebelum sputter kasar atau rasa matang muncul.',
      techniqueChips: [chip('stop', 'Berhenti', 'sebelum sputter')],
      sourceStepIds: serve ? [serve.id] : [],
    }),
  ]);
}

function buildEspressoGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const extract = findKind(plan, 'extract') || firstVolumeStep(plan);
  const serve = findKind(plan, 'serve') || plan.steps.at(-1);
  return stepsSorted([
    operationalStep({
      id: 'guide_espresso_dose',
      label: 'Dose',
      actionType: 'dose',
      startSeconds: 0,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: `Dose ${formatGrams(plan.doseG)} dan siapkan basket.`,
      techniqueChips: [chip('dose', 'Dose', formatGrams(plan.doseG))],
    }),
    operationalStep({
      id: 'guide_espresso_puck_prep',
      label: 'Distribusi dan tamp',
      actionType: 'puck_prep',
      startSeconds: 0,
      primaryText: 'Distribusi rata, tamp level, dan bersihkan bibir basket.',
      techniqueChips: [chip('puck_prep', 'Prep puck', 'tamp rata')],
    }),
    extract ? sourceStep('extract', extract, {
      label: 'Mulai shot',
      primaryText: `Mulai shot dan ekstrak sampai yield ${formatMl(plan.totalWaterMl)}.`,
      secondaryText: 'Jaga aliran stabil; hentikan jika channeling berat.',
      techniqueChips: [
        chip('yield', 'Output', formatMl(plan.totalWaterMl)),
        chip('shot_time', 'Waktu shot', formatTime(plan.totalTimeSeconds)),
        ...techniqueChipsFromStep(extract),
      ],
    }) : operationalStep({
      id: 'guide_espresso_extract',
      label: 'Mulai shot',
      actionType: 'extract',
      kind: 'extract',
      startSeconds: 0,
      pourVolumeMl: plan.totalWaterMl,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: `Mulai shot dan ekstrak sampai yield ${formatMl(plan.totalWaterMl)}.`,
      techniqueChips: [chip('yield', 'Output', formatMl(plan.totalWaterMl)), chip('shot_time', 'Waktu shot', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_espresso_monitor',
      label: 'Pantau aliran',
      actionType: 'monitor_flow',
      startSeconds: Math.max(1, Math.round(plan.totalTimeSeconds * 0.35)),
      targetVolumeMl: plan.totalWaterMl,
      primaryText: 'Baca aliran dan channeling; berhenti di yield, jangan memanjangkan shot yang buruk.',
      techniqueChips: [chip('flow_cue', 'Aliran', 'stabil')],
    }),
    operationalStep({
      id: 'guide_espresso_stop',
      label: 'Berhenti di yield',
      actionType: 'stop',
      startSeconds: serve?.startSeconds || plan.totalTimeSeconds,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: `Berhenti di yield ${formatMl(plan.totalWaterMl)} dalam jendela waktu shot.`,
      techniqueChips: [chip('stop', 'Berhenti', 'di yield')],
      sourceStepIds: serve ? [serve.id] : [],
    }),
  ]);
}

function buildSiphonGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const charge = firstVolumeStep(plan);
  const heat = findKind(plan, 'heat');
  const drawdown = findKind(plan, 'drawdown');
  const heatStart = heat?.startSeconds || 60;
  const drawdownStart = drawdown?.startSeconds || Math.max(heatStart + 60, plan.totalTimeSeconds - 45);
  return stepsSorted([
    charge ? sourceStep('charge', charge, {
      label: 'Panaskan air',
      primaryText: `Masukkan ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)} air dan mulai panaskan.`,
      techniqueChips: [chip('heat', 'Panas', 'stabil')],
    }) : operationalStep({
      id: 'guide_siphon_heat_water',
      label: 'Panaskan air',
      actionType: 'heat',
      startSeconds: 0,
      primaryText: `Masukkan ${formatMl(plan.hotWaterMl)} air dan mulai panaskan.`,
      techniqueChips: [chip('heat', 'Panas', 'stabil')],
    }),
    operationalStep({
      id: 'guide_siphon_draw_up',
      label: 'Air naik',
      actionType: 'heat',
      kind: 'heat',
      startSeconds: heatStart,
      primaryText: 'Biarkan air naik penuh sebelum menambahkan kopi.',
      techniqueChips: [chip('draw_up', 'Air naik', 'penuh')],
      sourceStepIds: heat ? [heat.id] : [],
    }),
    operationalStep({
      id: 'guide_siphon_add_stir',
      label: 'Masukkan kopi dan aduk',
      actionType: 'stir',
      startSeconds: Math.min(drawdownStart - 45, heatStart + 20),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Masukkan kopi dan aduk singkat agar bed chamber atas basah.',
      techniqueChips: [chip('stir', 'Aduk', 'singkat')],
    }),
    operationalStep({
      id: 'guide_siphon_contact',
      label: 'Kontak atas',
      actionType: 'steep',
      startSeconds: Math.min(drawdownStart - 25, heatStart + 45),
      endSeconds: drawdownStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Jaga kontak di chamber atas tanpa aduk berlebihan.',
      techniqueChips: [chip('contact', 'Kontak', formatTime(Math.max(20, drawdownStart - heatStart)))],
    }),
    drawdown ? sourceStep('drawdown', drawdown, {
      label: 'Matikan panas dan air turun',
      primaryText: 'Matikan panas dan biarkan air turun alami.',
      secondaryText: 'Biarkan vakum menarik kopi turun tanpa aduk tambahan.',
      techniqueChips: [chip('drawdown', 'Air turun', 'alami')],
    }) : operationalStep({
      id: 'guide_siphon_drawdown',
      label: 'Matikan panas dan air turun',
      actionType: 'drawdown',
      kind: 'drawdown',
      startSeconds: drawdownStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Matikan panas dan biarkan air turun alami.',
      techniqueChips: [chip('drawdown', 'Air turun', 'alami')],
    }),
    operationalStep({
      id: 'guide_siphon_serve',
      label: 'Sajikan',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Sajikan segera setelah air turun bersih.',
    }),
  ]);
}

function buildBatchGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const start = firstVolumeStep(plan);
  const drawdown = findKind(plan, 'drawdown');
  return stepsSorted([
    operationalStep({
      id: 'guide_batch_dose',
      label: 'Dose per liter',
      actionType: 'dose',
      startSeconds: 0,
      primaryText: `Set dose per liter dan target air siklus mesin ${formatMl(plan.totalWaterMl)}.`,
      techniqueChips: [chip('dose_per_liter', 'Dose/L', `${formatGrams(plan.doseG)} / ${formatMl(plan.totalWaterMl)}`)],
    }),
    operationalStep({
      id: 'guide_batch_basket',
      label: 'Prep basket',
      actionType: 'setup',
      startSeconds: 0,
      primaryText: 'Pasang filter, ratakan bed basket, lalu mulai siklus mesin.',
      techniqueChips: [chip('basket_prep', 'Basket', 'bed rata')],
    }),
    start ? sourceStep('charge', start, {
      label: 'Siklus mesin',
      primaryText: 'Biarkan brewer menjalankan siklus spray; jangan ganggu basket.',
      secondaryText: 'Jaga basket stabil sampai siklus mesin selesai.',
      techniqueChips: [chip('spray', 'Spray', 'aliran mesin')],
    }) : operationalStep({
      id: 'guide_batch_cycle',
      label: 'Siklus mesin',
      actionType: 'charge',
      startSeconds: 0,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: 'Biarkan brewer menjalankan siklus spray; jangan ganggu basket.',
      techniqueChips: [chip('spray', 'Spray', 'aliran mesin')],
    }),
    drawdown ? sourceStep('drawdown', drawdown, {
      label: 'Air turun',
      primaryText: 'Biarkan air turun di basket selesai sebelum servis.',
      secondaryText: 'Jangan aduk basket saat fase akhir.',
      techniqueChips: [chip('drawdown', 'Air turun', formatTime(plan.totalTimeSeconds))],
    }) : operationalStep({
      id: 'guide_batch_drawdown',
      label: 'Air turun',
      actionType: 'drawdown',
      kind: 'drawdown',
      startSeconds: Math.max(0, plan.totalTimeSeconds - 45),
      targetVolumeMl: plan.totalWaterMl,
      primaryText: 'Biarkan air turun di basket selesai sebelum servis.',
      techniqueChips: [chip('drawdown', 'Air turun', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_batch_mix',
      label: 'Aduk batch',
      actionType: 'mix',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: 'Aduk batch pelan sebelum tasting atau servis.',
      techniqueChips: [chip('mix_batch', 'Aduk batch', 'sebelum servis')],
    }),
  ]);
}

function buildColdBrewGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const charge = firstVolumeStep(plan);
  const filterStart = Math.max(0, plan.totalTimeSeconds - 300);
  return stepsSorted([
    operationalStep({
      id: 'guide_cold_brew_dose',
      label: 'Dose',
      actionType: 'dose',
      startSeconds: 0,
      primaryText: `Dose ${formatGrams(plan.doseG)} kopi kasar dan siapkan air dingin.`,
      techniqueChips: [chip('dose', 'Dose', formatGrams(plan.doseG))],
    }),
    charge ? sourceStep('charge', charge, {
      label: 'Basahi merata',
      primaryText: `Basahi semua bubuk dengan ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)} air dingin; hilangkan bagian kering.`,
      secondaryText: 'Pastikan tidak ada dry pocket sebelum steep panjang.',
      techniqueChips: [chip('saturation', 'Basahi', 'semua bubuk')],
    }) : operationalStep({
      id: 'guide_cold_brew_saturate',
      label: 'Basahi merata',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `Basahi semua bubuk dengan ${formatMl(plan.hotWaterMl)} air dingin; hilangkan bagian kering.`,
      techniqueChips: [chip('saturation', 'Basahi', 'semua bubuk')],
    }),
    operationalStep({
      id: 'guide_cold_brew_steep',
      label: 'Rendam dingin',
      actionType: 'steep',
      startSeconds: 300,
      endSeconds: filterStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `Rendam dingin selama ${formatTime(plan.totalTimeSeconds)} tanpa panas atau agitasi berulang.`,
      techniqueChips: [chip('steep', 'Rendam', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_cold_brew_filter',
      label: 'Filter atau tuang pisah',
      actionType: 'filter',
      startSeconds: filterStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Filter atau tuang pisah dengan bersih untuk memisahkan kopi dari bubuk.',
      techniqueChips: [chip('filter', 'Filter', 'bersih')],
    }),
    operationalStep({
      id: 'guide_cold_brew_dilute',
      label: 'Dilusi setelah filter',
      actionType: 'dilute',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Dilusi hanya setelah filtrasi jika kekuatan saji perlu disesuaikan.',
      techniqueChips: [chip('dilution', 'Dilusi', 'setelah filtrasi')],
    }),
  ]);
}

export function buildWorkflowAwareGuideSteps(plan: BrewPlan): WorkflowGuideStep[] {
  if (plan.methodFamily === 'aeropress') return buildAeroPressGuide(plan);
  if (plan.methodFamily === 'french_press') return buildFrenchPressGuide(plan);
  if (plan.methodFamily === 'hario_switch') return buildHarioSwitchGuide(plan);
  if (plan.methodFamily === 'clever_dripper') return buildCleverGuide(plan);
  if (plan.methodFamily === 'moka_pot') return buildMokaGuide(plan);
  if (plan.methodFamily === 'espresso') return buildEspressoGuide(plan);
  if (plan.methodFamily === 'siphon') return buildSiphonGuide(plan);
  if (plan.methodFamily === 'batch_brew') return buildBatchGuide(plan);
  if (plan.methodFamily === 'cold_brew') return buildColdBrewGuide(plan);
  if (POUROVER_FAMILIES.has(plan.methodFamily)) return buildPouroverGuide(plan);

  return plan.steps.map((step) => sourceStep(step.kind || 'pour', step, {
    primaryText: step.note,
    secondaryText: step.hybridInstruction,
  }));
}

function phaseSet(guideSteps: WorkflowGuideStep[]) {
  const text = guideSteps.map((step) => `${step.actionType} ${step.label} ${step.primaryText} ${step.secondaryText || ''} ${step.techniqueChips.map((chipItem) => `${chipItem.key} ${chipItem.value}`).join(' ')}`.toLowerCase());
  const has = (phase: string | RegExp) => typeof phase === 'string'
    ? text.some((item) => item.includes(phase))
    : text.some((item) => phase.test(item));
  return { text, has };
}

function requirePhase(
  result: { missingPhases: string[]; blockingErrors: string[] },
  phases: ReturnType<typeof phaseSet>,
  label: string,
  matcher: string | RegExp,
) {
  if (!phases.has(matcher)) {
    result.missingPhases.push(label);
    result.blockingErrors.push(`Fase panduan seduh belum lengkap: ${label}.`);
  }
}

function validateIcedEnvelope(plan: BrewPlan, blockingErrors: string[]) {
  if (plan.brewMode !== 'iced') return;
  const hotIceTotal = Math.round(plan.hotWaterMl + plan.iceMl);
  if (hotIceTotal !== Math.round(plan.totalWaterMl)) {
    blockingErrors.push(`Split seduh es tidak cocok: air panas ${plan.hotWaterMl} ml + es ${plan.iceMl} g harus sama dengan total ${plan.totalWaterMl} ml.`);
  }
  if (!(plan.estimatedCupOutputMl < plan.totalWaterMl)) {
    blockingErrors.push('Output cangkir seduh es harus lebih rendah dari total input setelah retensi.');
  }
  const volumeSteps = plan.steps.filter((step) => step.pourVolumeMl > 0 || step.kind === 'extract');
  const lastVolumeStep = volumeSteps.at(-1);
  if (lastVolumeStep && Math.round(lastVolumeStep.targetVolumeMl) !== Math.round(plan.hotWaterMl)) {
    blockingErrors.push(`Target air panas terakhir ${lastVolumeStep.targetVolumeMl} ml harus sama dengan air panas ${plan.hotWaterMl} ml.`);
  }
  const poured = Math.round(volumeSteps.reduce((sum, step) => sum + Math.max(0, step.pourVolumeMl), 0));
  if (Math.abs(poured - Math.round(plan.hotWaterMl)) > 1) {
    blockingErrors.push(`Total tuangan seduh es ${poured} ml harus sama dengan air panas ${plan.hotWaterMl} ml dalam toleransi 1 ml.`);
  }
}

function validateHarioSwitchWorkflow(plan: BrewPlan, guideSteps: WorkflowGuideStep[], blockingErrors: string[], warnings: string[]) {
  if (plan.dripper.id === 'hario-switch') {
    blockingErrors.push('Profil Hario Switch lama masih ambigu ukuran. Pilih Switch 02, Switch 03, atau MUGEN x SWITCH sebelum seduh.');
  }

  const preservedStepIds = new Set(guideSteps.flatMap((step) => step.sourceStepIds));
  const missingVolumeSteps = plan.steps
    .filter((step) => step.pourVolumeMl > 0)
    .filter((step) => !preservedStepIds.has(step.id));
  if (missingVolumeSteps.length > 0) {
    blockingErrors.push(`Panduan Hario Switch melewatkan checkpoint volume: ${missingVolumeSteps.map((step) => step.id).join(', ')}.`);
  }

  const constraints = plan.devicePhysicalConstraints;
  const closedLimit = constraints?.recommendedClosedPhaseMaxMl || constraints?.finishedCapacityMl;
  if (!closedLimit) {
    blockingErrors.push('Profil Hario Switch belum punya batas muatan ruang.');
    return;
  }

  const closedLoads = plan.steps
    .filter((step) => step.valveState === 'closed')
    .map((step) => step.chamberLoadMl ?? step.targetVolumeMl)
    .filter((value) => Number.isFinite(value) && value > 0);
  const maxClosedLoad = Math.max(0, ...closedLoads);
  if (maxClosedLoad > closedLimit + 1) {
    blockingErrors.push(`Muatan ruang Hario Switch saat katup tertutup ${Math.round(maxClosedLoad)} ml melewati batas aman ${Math.round(closedLimit)} ml. Pilih Switch 03 atau program hybrid.`);
  }

  if (String(plan.methodProgramme || '').startsWith('full_immersion') && plan.hotWaterMl > closedLimit + 1) {
    blockingErrors.push(`Program full immersion Switch butuh kapasitas tertutup ${Math.round(plan.hotWaterMl)} ml, di atas batas aman ${Math.round(closedLimit)} ml.`);
  }

  if (plan.switchStepValidation?.status === 'blocked') {
    blockingErrors.push(plan.switchStepValidation.message);
  } else if (plan.switchStepValidation?.status === 'caution') {
    warnings.push(plan.switchStepValidation.message);
  }

  if (!constraints.finishedCapacityMl || !constraints.filterSize) {
    warnings.push('Profil Hario Switch butuh bukti kapasitas dan ukuran filter lengkap sebelum keyakinan publik dianggap kuat.');
  }
}

export function validateMethodWorkflowGuide(plan: BrewPlan, guideSteps: WorkflowGuideStep[]): MethodWorkflowValidationResult {
  const missingPhases: string[] = [];
  const warnings: string[] = [];
  const blockingErrors: string[] = [];
  const phases = phaseSet(guideSteps);
  const accumulator = { missingPhases, blockingErrors };

  if (guideSteps.length === 0) {
    blockingErrors.push('Panduan seduh kosong.');
  }

  validateIcedEnvelope(plan, blockingErrors);

  if (POUROVER_FAMILIES.has(plan.methodFamily)) {
    requirePhase(accumulator, phases, 'rinse/preheat', /rinse|preheat|filter|bilas|panas/);
    requirePhase(accumulator, phases, 'bloom', 'bloom');
    requirePhase(accumulator, phases, 'pour', /pour|tuang/);
    requirePhase(accumulator, phases, 'drawdown', /drawdown|air turun/);
    requirePhase(accumulator, phases, 'serve', /serve|sajikan/);
    if (plan.brewMode === 'iced') requirePhase(accumulator, phases, 'hot-water target', /hot water|air panas/);
  }

  switch (plan.methodFamily) {
    case 'hario_switch':
      requirePhase(accumulator, phases, 'valve state', /valve|katup|closed|open|tutup|buka/);
      requirePhase(accumulator, phases, 'chamber state', /chamber|ruang|immersion|percolation|perkolasi/);
      if (plan.methodProgramme === 'full_percolation_v60_mode' || plan.switchPresetId === 'v60_mode') {
        requirePhase(accumulator, phases, 'open percolation', /open|buka|percolation|perkolasi/);
      } else {
        requirePhase(accumulator, phases, 'release/open', /release|open|buka katup|katup buka/);
      }
      requirePhase(accumulator, phases, 'serve', /serve|sajikan/);
      validateHarioSwitchWorkflow(plan, guideSteps, blockingErrors, warnings);
      if (phases.has(/generic clever only|single charge only/)) blockingErrors.push('Panduan Hario Switch tidak boleh berubah menjadi panduan Clever satu kali isi yang generik.');
      break;
    case 'aeropress':
      requirePhase(accumulator, phases, 'charge', /charge|isi|air|masukkan/);
      requirePhase(accumulator, phases, 'stir/swirl', /stir|swirl|aduk/);
      requirePhase(accumulator, phases, 'steep', /steep|rendam/);
      requirePhase(accumulator, phases, 'press', /press|tekan/);
      requirePhase(accumulator, phases, 'stop before hiss', /before hiss|sebelum hiss|hiss/);
      if (guideSteps.filter((step) => !step.isOperationalOnly || step.actionType !== 'setup').length < 5) {
        blockingErrors.push('Panduan AeroPress tidak boleh tampil sebagai satu langkah operasional saja.');
      }
      if (phases.has(/final pour|drawdown bed|center-to-mid stream/)) {
        blockingErrors.push('Panduan AeroPress mengandung bahasa pour-over.');
      }
      break;
    case 'french_press':
      requirePhase(accumulator, phases, 'charge', /charge|isi|masukkan/);
      requirePhase(accumulator, phases, 'steep', /steep|rendam/);
      requirePhase(accumulator, phases, 'settle/decant', /settle|endapkan|decant|tuang pisah|crust/);
      requirePhase(accumulator, phases, 'press', /press|tekan/);
      if (phases.has(/final pour|bloom|drawdown bed/)) blockingErrors.push('Panduan French Press mengandung bahasa pour-over.');
      break;
    case 'clever_dripper':
      requirePhase(accumulator, phases, 'charge', /charge|isi|masukkan/);
      requirePhase(accumulator, phases, 'steep', /steep|rendam/);
      requirePhase(accumulator, phases, 'release', /release|buka katup/);
      requirePhase(accumulator, phases, 'drawdown', /drawdown|air turun/);
      break;
    case 'moka_pot':
      requirePhase(accumulator, phases, 'boiler below valve', /below valve|di bawah valve|boiler/);
      requirePhase(accumulator, phases, 'level basket', /basket|no tamp|tanpa tamp|jangan tamp/);
      requirePhase(accumulator, phases, 'heat', /heat|panas/);
      requirePhase(accumulator, phases, 'stop before sputter', /sputter|stop|berhenti/);
      if (phases.has(/bloom|final pour|center-to-mid/)) blockingErrors.push('Panduan Moka Pot mengandung bahasa pour-over.');
      break;
    case 'espresso':
      requirePhase(accumulator, phases, 'dose', 'dose');
      requirePhase(accumulator, phases, 'puck prep', /puck|tamp|distribute|distribusi/);
      requirePhase(accumulator, phases, 'shot/yield', /shot|yield|extract|ekstrak/);
      requirePhase(accumulator, phases, 'flow', /flow|aliran/);
      requirePhase(accumulator, phases, 'stop', /stop|berhenti/);
      if (phases.has(/bloom|kettle|filter wall|final pour/)) blockingErrors.push('Panduan Espresso mengandung bahasa seduh filter.');
      break;
    case 'siphon':
      requirePhase(accumulator, phases, 'heat/draw-up', /heat|panas|draw-up|draw up|air naik/);
      requirePhase(accumulator, phases, 'stir', /stir|aduk/);
      requirePhase(accumulator, phases, 'contact', /contact|kontak/);
      requirePhase(accumulator, phases, 'drawdown', /drawdown|air turun/);
      break;
    case 'batch_brew':
      requirePhase(accumulator, phases, 'dose per liter', /dose\/l|dose per liter/);
      requirePhase(accumulator, phases, 'machine/spray', /machine|spray/);
      requirePhase(accumulator, phases, 'drawdown', /drawdown|air turun/);
      requirePhase(accumulator, phases, 'mix batch', /mix batch|aduk batch|carafe/);
      if (phases.has(/manual pour|bloom pour|center-to-mid/)) blockingErrors.push('Panduan Batch Brewer mengandung bahasa pour-over manual.');
      break;
    case 'cold_brew':
      requirePhase(accumulator, phases, 'saturate', /saturate|basahi|dry pocket|bagian kering/);
      requirePhase(accumulator, phases, 'steep hours', /steep|rendam|h/);
      requirePhase(accumulator, phases, 'filter/decant', /filter|decant|tuang pisah/);
      requirePhase(accumulator, phases, 'dilute after filtration', /after filtration|setelah filtrasi|dilute|dilusi/);
      if (phases.has(/hot pour|kettle|bloom/)) blockingErrors.push('Panduan Cold Brew mengandung bahasa pour-over panas.');
      break;
    default:
      break;
  }

  if (!phases.has(/rinse|preheat|setup|prep|dose|boiler|basket|bilas|panaskan|persiapan/)) {
    warnings.push('Panduan seduh belum punya cue persiapan.');
  }
  if (plan.fallbackUsed) warnings.push('Referensi fallback alat/grinder perlu validasi rasa.');
  if (plan.waterPresetStatus === 'manual_required' || plan.waterMineralDerivation === 'estimated_from_classification') {
    warnings.push('Mineral air perlu verifikasi manual sebelum keyakinan publik dianggap kuat.');
  }

  const uniqueBlockingErrors = Array.from(new Set(blockingErrors));
  const uniqueMissingPhases = Array.from(new Set(missingPhases));
  const uniqueWarnings = Array.from(new Set(warnings));
  const readinessScore = Math.max(
    0,
    Math.min(100, 100 - uniqueBlockingErrors.length * 18 - uniqueWarnings.length * 5),
  );
  const status = uniqueBlockingErrors.length > 0 ? 'blocked' : uniqueWarnings.length > 0 ? 'needs_review' : 'ready';
  return {
    passed: uniqueBlockingErrors.length === 0,
    status,
    missingPhases: uniqueMissingPhases,
    warnings: uniqueWarnings,
    blockingErrors: uniqueBlockingErrors,
    readinessScore,
  };
}
