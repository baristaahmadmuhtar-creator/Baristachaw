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

function chip(key: WorkflowGuideChipKey, label: string, value: string): WorkflowGuideTechniqueChip {
  return { key, label, value };
}

function flowChip(step: BrewPlanStep) {
  const [min, max] = step.flowRateMlPerSec || [];
  return Number.isFinite(min) && Number.isFinite(max)
    ? chip('flow', 'Flow', `${min}-${max} ml/s`)
    : null;
}

function pathChip(step: BrewPlanStep) {
  return step.pourPath ? chip('path', 'Path', step.pourPath) : null;
}

function heightChip(step: BrewPlanStep) {
  return step.pourHeight ? chip('height', 'Height', step.pourHeight) : null;
}

function agitationChip(step: BrewPlanStep) {
  return step.agitationLevel ? chip('agitation', 'Agitation', step.agitationLevel) : null;
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
    step.valveState ? chip('valve', 'Valve', step.valveState) : null,
    step.chamberState ? chip('chamber', 'Chamber', step.chamberState) : null,
    Number.isFinite(step.chamberLoadMl) ? chip('chamber_load', 'Chamber load', formatMl(step.chamberLoadMl || 0)) : null,
    step.switchProgramme ? chip('programme', 'Programme', formatSwitchProgramme(step.switchProgramme)) : null,
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
    secondaryText: params.secondaryText,
    endSeconds: params.endSeconds,
    techniqueChips: params.techniqueChips || techniqueChipsFromStep(step),
    warnings: params.warnings || [],
    sourceStepIds: [step.id],
    isOperationalOnly: Boolean(params.isOperationalOnly),
    note: params.primaryText,
    hybridInstruction: params.secondaryText || step.hybridInstruction,
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
    secondaryText: params.secondaryText,
    techniqueChips: params.techniqueChips || [],
    warnings: params.warnings || [],
    sourceStepIds: params.sourceStepIds || [],
    isOperationalOnly: true,
    note: params.primaryText,
    hybridInstruction: params.secondaryText,
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
    ? 'Rinse the thick paper hard, preheat the glass, keep the three-layer side toward the spout, and leave the vent open.'
    : plan.methodFamily === 'kalita_wave' || plan.methodFamily === 'april' || plan.methodFamily === 'melitta'
      ? 'Rinse/preheat, level the flat bed, and keep the brewer ready for low, even pulses.'
      : 'Rinse the filter, preheat brewer/server, discard rinse water, tare the scale, then dose coffee.';
  const guide: WorkflowGuideStep[] = [
    operationalStep({
      id: `guide_${plan.methodFamily}_setup`,
      label: 'Setup',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: isIced
        ? `${prepText} Put ${formatGrams(plan.iceMl)} ice in the server before brewing.`
        : prepText,
      techniqueChips: [
        chip('basket_prep', 'Prep', plan.methodFamily === 'chemex' ? 'thick filter + open vent' : `${methodLower} ready`),
      ],
    }),
  ];

  plan.steps.forEach((step, index) => {
    const isFirstPour = step.pourVolumeMl > 0 && step.id === first?.id;
    const isLastPour = step.pourVolumeMl > 0 && step.id === last?.id;
    const actionType: WorkflowGuideActionType = isFirstPour ? 'bloom' : (step.kind || 'pour') === 'drawdown' ? 'drawdown' : 'pour';
    const label = isFirstPour ? 'Bloom' : isLastPour ? 'Final pour' : index <= 1 ? 'Middle pour' : step.label;
    const targetText = isIced && step.pourVolumeMl > 0
      ? `Target ${formatMl(step.targetVolumeMl)} hot water.`
      : `Target ${formatMl(step.targetVolumeMl)}.`;
    const familyCue = plan.methodFamily === 'chemex'
      ? 'Keep the stream stable and do not chase the filter wall.'
      : plan.methodFamily === 'kalita_wave' || plan.methodFamily === 'april' || plan.methodFamily === 'melitta'
        ? 'Keep the bed level with a low, flat-center pour.'
        : plan.methodFamily === 'kono'
          ? 'Keep the pour center-focused and controlled.'
          : 'Use a clean center-to-mid path and avoid wall rinsing.';
    guide.push(sourceStep(actionType, step, {
      label,
      primaryText: step.pourVolumeMl > 0
        ? `Pour ${formatMl(step.pourVolumeMl)}. ${targetText}`
        : targetText,
      secondaryText: `${familyCue} ${step.hybridInstruction || step.note || ''}`.trim(),
    }));
  });

  guide.push(operationalStep({
    id: `guide_${plan.methodFamily}_drawdown`,
    label: 'Drawdown',
    actionType: 'drawdown',
    startSeconds: Math.max(last?.startSeconds || 0, plan.totalTimeSeconds - 20),
    endSeconds: plan.totalTimeSeconds,
    targetVolumeMl: plan.hotWaterMl,
    primaryText: isIced
      ? `Let drawdown finish over ice at ${formatMl(plan.hotWaterMl)} hot water; do not add bypass water.`
      : 'Let drawdown finish naturally; avoid late wall rinsing or heavy swirl.',
    techniqueChips: [
      chip('drawdown', 'Drawdown', formatTime(plan.totalTimeSeconds)),
      ...(isIced ? [chip('stop', 'Stop', `${formatMl(plan.hotWaterMl)} hot water`)] : []),
    ],
    sourceStepIds: last ? [last.id] : [],
  }));

  guide.push(operationalStep({
    id: `guide_${plan.methodFamily}_serve`,
    label: 'Serve',
    actionType: 'serve',
    startSeconds: plan.totalTimeSeconds,
    targetVolumeMl: plan.hotWaterMl,
    primaryText: isIced
      ? 'Stir the server 5-8 seconds so hot concentrate and ice melt integrate evenly, then serve.'
      : 'Serve once the bed has drained cleanly.',
    techniqueChips: isIced ? [chip('mix_batch', 'Mix', 'stir 5-8s')] : [],
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
      primaryText: 'Preheat the chamber, rinse the cap/filter, assemble safely, and tare the scale.',
      techniqueChips: [chip('basket_prep', 'Prep', 'cap/filter rinsed')],
    }),
    charge ? sourceStep('charge', charge, {
      label: 'Charge water',
      primaryText: `Charge ${formatMl(charge.pourVolumeMl || chargeTarget)} into the chamber and wet the compact bed evenly.`,
      secondaryText: charge.hybridInstruction || charge.note,
      techniqueChips: [
        chip('charge', 'Charge', formatMl(charge.pourVolumeMl || chargeTarget)),
        ...techniqueChipsFromStep(charge),
      ],
    }) : operationalStep({
      id: 'guide_aeropress_charge',
      label: 'Charge water',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `Charge ${formatMl(plan.hotWaterMl)} into the chamber and wet the compact bed evenly.`,
      techniqueChips: [chip('charge', 'Charge', formatMl(plan.hotWaterMl))],
    }),
    operationalStep({
      id: 'guide_aeropress_stir',
      label: 'Stir or swirl',
      actionType: 'stir',
      startSeconds: Math.min(Math.max(10, charge?.startSeconds || 0), Math.max(10, pressStart - 45)),
      targetVolumeMl: chargeTarget,
      primaryText: 'Stir 3-5 times or use one gentle swirl, then stop agitation.',
      techniqueChips: [chip('stir', 'Stir', '3-5x')],
      sourceStepIds: charge ? [charge.id] : [],
    }),
    operationalStep({
      id: 'guide_aeropress_steep',
      label: 'Steep',
      actionType: 'steep',
      startSeconds: Math.max(15, Math.min(pressStart - 35, Math.round(pressStart * 0.45))),
      endSeconds: pressStart,
      targetVolumeMl: chargeTarget,
      primaryText: `Steep until ${formatTime(pressStart)}; keep the chamber stable and covered.`,
      techniqueChips: [chip('steep', 'Steep', formatTime(Math.max(10, pressStart)))],
    }),
    press ? sourceStep('press', press, {
      label: 'Press',
      primaryText: 'Press with steady pressure for 20-30 seconds.',
      secondaryText: press.hybridInstruction || press.note,
      techniqueChips: [chip('press', 'Press', '20-30s'), chip('stop', 'Stop', 'before hiss')],
    }) : operationalStep({
      id: 'guide_aeropress_press',
      label: 'Press',
      actionType: 'press',
      kind: 'press',
      startSeconds: pressStart,
      endSeconds: Math.min(plan.totalTimeSeconds, pressStart + 30),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Press with steady pressure for 20-30 seconds.',
      techniqueChips: [chip('press', 'Press', '20-30s'), chip('stop', 'Stop', 'before hiss')],
    }),
    operationalStep({
      id: 'guide_aeropress_stop',
      label: 'Stop before hiss',
      actionType: 'stop',
      startSeconds: Math.min(plan.totalTimeSeconds, pressStart + 25),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Stop before the dry hiss turns harsh, then separate the brewer from the cup.',
      techniqueChips: [chip('stop', 'Stop', 'before hiss')],
      sourceStepIds: press ? [press.id] : [],
    }),
    operationalStep({
      id: 'guide_aeropress_serve',
      label: 'Serve',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: plan.notes.join(' ').toLowerCase().includes('bypass')
        ? 'Dilute only after pressing if the recipe style calls for bypass, then serve.'
        : 'Swirl the cup gently and serve.',
      techniqueChips: plan.notes.join(' ').toLowerCase().includes('bypass')
        ? [chip('dilution', 'Dilution', 'after press only')]
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
      label: 'Preheat',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: 'Preheat the press, tare the scale, and use a coarse even grind.',
      techniqueChips: [chip('basket_prep', 'Prep', 'coarse even grind')],
    }),
    charge ? sourceStep('charge', charge, {
      label: 'Charge water',
      primaryText: `Charge ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)} and saturate all grounds.`,
      secondaryText: charge.hybridInstruction || charge.note,
      techniqueChips: [chip('charge', 'Charge', formatMl(charge.pourVolumeMl || plan.hotWaterMl))],
    }) : operationalStep({
      id: 'guide_french_press_charge',
      label: 'Charge water',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `Charge ${formatMl(plan.hotWaterMl)} and saturate all grounds.`,
      techniqueChips: [chip('charge', 'Charge', formatMl(plan.hotWaterMl))],
    }),
    operationalStep({
      id: 'guide_french_press_steep',
      label: 'Steep',
      actionType: 'steep',
      startSeconds: steepStart,
      endSeconds: settleStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Steep quietly; do not keep stirring once all grounds are wet.',
      techniqueChips: [chip('steep', 'Steep', formatTime(Math.max(0, settleStart - steepStart)))],
    }),
    operationalStep({
      id: 'guide_french_press_settle',
      label: 'Settle',
      actionType: 'settle',
      startSeconds: settleStart,
      endSeconds: pressStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Break the crust gently or skim foam, then let fines settle.',
      techniqueChips: [chip('settle', 'Settle', 'gentle')],
    }),
    operationalStep({
      id: 'guide_french_press_press',
      label: 'Press gently',
      actionType: 'press',
      kind: 'press',
      startSeconds: pressStart,
      endSeconds: serve?.startSeconds || plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Press slowly; do not squeeze the bed.',
      techniqueChips: [chip('press', 'Press', 'slow')],
    }),
    operationalStep({
      id: 'guide_french_press_decant',
      label: 'Decant',
      actionType: 'decant',
      startSeconds: serve?.startSeconds || plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Decant immediately to stop extraction, then serve.',
      techniqueChips: [chip('decant', 'Decant', 'stop extraction')],
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
      label: 'Rinse and preheat',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: 'Rinse the filter, preheat the brewer/server, close the valve if needed, and tare the scale.',
      techniqueChips: [chip('basket_prep', 'Prep', 'valve ready')],
    }),
    charge ? sourceStep('charge', charge, {
      label: 'Charge water',
      primaryText: `Charge ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)} and saturate the bed.`,
      secondaryText: charge.hybridInstruction || charge.note,
      techniqueChips: [chip('charge', 'Charge', formatMl(charge.pourVolumeMl || plan.hotWaterMl))],
    }) : operationalStep({
      id: 'guide_clever_charge',
      label: 'Charge water',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `Charge ${formatMl(plan.hotWaterMl)} and saturate the bed.`,
      techniqueChips: [chip('charge', 'Charge', formatMl(plan.hotWaterMl))],
    }),
    operationalStep({
      id: 'guide_clever_steep',
      label: 'Steep',
      actionType: 'steep',
      startSeconds: Math.min(45, releaseStart),
      endSeconds: releaseStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Steep calmly; contact time is the main extraction control.',
      techniqueChips: [chip('steep', 'Steep', formatTime(releaseStart))],
    }),
    release ? sourceStep('release', release, {
      label: 'Release',
      primaryText: 'Open the release cleanly and avoid stirring during drain.',
      secondaryText: release.hybridInstruction || release.note,
      techniqueChips: [chip('release', 'Release', 'open cleanly')],
    }) : operationalStep({
      id: 'guide_clever_release',
      label: 'Release',
      actionType: 'release',
      kind: 'release',
      startSeconds: releaseStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Open the release cleanly and avoid stirring during drain.',
      techniqueChips: [chip('release', 'Release', 'open cleanly')],
    }),
    drawdown ? sourceStep('drawdown', drawdown, {
      label: 'Drawdown',
      primaryText: 'Let drawdown finish without adding water.',
      techniqueChips: [chip('drawdown', 'Drawdown', formatTime(plan.totalTimeSeconds))],
    }) : operationalStep({
      id: 'guide_clever_drawdown',
      label: 'Drawdown',
      actionType: 'drawdown',
      kind: 'drawdown',
      startSeconds: Math.min(plan.totalTimeSeconds, releaseStart + 20),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Let drawdown finish without adding water.',
      techniqueChips: [chip('drawdown', 'Drawdown', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_clever_serve',
      label: 'Serve',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Serve after the bed drains cleanly.',
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
      label: 'Rinse, preheat, and set valve',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: 'Rinse the V60 paper, preheat brewer/server, tare the scale, and set the Switch valve for the programme.',
      techniqueChips: [
        chip('programme', 'Programme', formatSwitchProgramme(programme)),
        chip('valve', 'Valve', 'set before brewing'),
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
      label: 'Serve',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Serve after drawdown and record chamber timing for the next dial-in.',
      techniqueChips: [
        chip('programme', 'Programme', formatSwitchProgramme(programme)),
        chip('chamber', 'Chamber', 'served'),
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
      label: 'Fill boiler',
      actionType: 'setup',
      startSeconds: 0,
      primaryText: 'Fill the boiler below the safety valve.',
      techniqueChips: [chip('boiler', 'Boiler', 'below valve')],
    }),
    operationalStep({
      id: 'guide_moka_basket',
      label: 'Level basket',
      actionType: 'dose',
      startSeconds: 0,
      primaryText: 'Fill and level the basket; do not tamp.',
      techniqueChips: [chip('basket', 'Basket', 'level, no tamp')],
    }),
    heat ? sourceStep('heat', heat, {
      label: 'Moderate heat',
      primaryText: 'Use moderate heat and keep the flow calm.',
      secondaryText: heat.hybridInstruction || heat.note,
      techniqueChips: [chip('heat', 'Heat', 'moderate')],
    }) : operationalStep({
      id: 'guide_moka_heat',
      label: 'Moderate heat',
      actionType: 'heat',
      kind: 'heat',
      startSeconds: heatStart,
      primaryText: 'Use moderate heat and keep the flow calm.',
      techniqueChips: [chip('heat', 'Heat', 'moderate')],
    }),
    operationalStep({
      id: 'guide_moka_monitor',
      label: 'Monitor flow',
      actionType: 'monitor_flow',
      startSeconds: Math.min(plan.totalTimeSeconds, heatStart + 30),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Watch for a steady stream; avoid harsh sputtering.',
      techniqueChips: [chip('flow_cue', 'Flow cue', 'steady stream')],
    }),
    operationalStep({
      id: 'guide_moka_stop',
      label: 'Stop before sputter',
      actionType: 'stop',
      startSeconds: serve?.startSeconds || plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Remove from heat before coarse sputter or cooked flavor appears.',
      techniqueChips: [chip('stop', 'Stop', 'before sputter')],
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
      primaryText: `Dose ${formatGrams(plan.doseG)} and prepare the basket.`,
      techniqueChips: [chip('dose', 'Dose', formatGrams(plan.doseG))],
    }),
    operationalStep({
      id: 'guide_espresso_puck_prep',
      label: 'Distribute and tamp',
      actionType: 'puck_prep',
      startSeconds: 0,
      primaryText: 'Distribute evenly, tamp level, and clear the basket rim.',
      techniqueChips: [chip('puck_prep', 'Puck prep', 'level tamp')],
    }),
    extract ? sourceStep('extract', extract, {
      label: 'Start shot',
      primaryText: `Start the shot and extract to ${formatMl(plan.totalWaterMl)} yield.`,
      secondaryText: extract.hybridInstruction || extract.note,
      techniqueChips: [
        chip('yield', 'Yield', formatMl(plan.totalWaterMl)),
        chip('shot_time', 'Shot time', formatTime(plan.totalTimeSeconds)),
        ...techniqueChipsFromStep(extract),
      ],
    }) : operationalStep({
      id: 'guide_espresso_extract',
      label: 'Start shot',
      actionType: 'extract',
      kind: 'extract',
      startSeconds: 0,
      pourVolumeMl: plan.totalWaterMl,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: `Start the shot and extract to ${formatMl(plan.totalWaterMl)} yield.`,
      techniqueChips: [chip('yield', 'Yield', formatMl(plan.totalWaterMl)), chip('shot_time', 'Shot time', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_espresso_monitor',
      label: 'Monitor flow',
      actionType: 'monitor_flow',
      startSeconds: Math.max(1, Math.round(plan.totalTimeSeconds * 0.35)),
      targetVolumeMl: plan.totalWaterMl,
      primaryText: 'Read flow and channeling; stop at yield instead of extending a bad shot.',
      techniqueChips: [chip('flow_cue', 'Flow', 'stable')],
    }),
    operationalStep({
      id: 'guide_espresso_stop',
      label: 'Stop at yield',
      actionType: 'stop',
      startSeconds: serve?.startSeconds || plan.totalTimeSeconds,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: `Stop at ${formatMl(plan.totalWaterMl)} yield inside the shot time window.`,
      techniqueChips: [chip('stop', 'Stop', 'at yield')],
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
      label: 'Heat water',
      primaryText: `Load ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)} water and begin heating.`,
      techniqueChips: [chip('heat', 'Heat', 'stable')],
    }) : operationalStep({
      id: 'guide_siphon_heat_water',
      label: 'Heat water',
      actionType: 'heat',
      startSeconds: 0,
      primaryText: `Load ${formatMl(plan.hotWaterMl)} water and begin heating.`,
      techniqueChips: [chip('heat', 'Heat', 'stable')],
    }),
    operationalStep({
      id: 'guide_siphon_draw_up',
      label: 'Draw-up',
      actionType: 'heat',
      kind: 'heat',
      startSeconds: heatStart,
      primaryText: 'Let water draw up fully before adding coffee.',
      techniqueChips: [chip('draw_up', 'Draw-up', 'complete')],
      sourceStepIds: heat ? [heat.id] : [],
    }),
    operationalStep({
      id: 'guide_siphon_add_stir',
      label: 'Add coffee and stir',
      actionType: 'stir',
      startSeconds: Math.min(drawdownStart - 45, heatStart + 20),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Add coffee and stir briefly to wet the upper chamber bed.',
      techniqueChips: [chip('stir', 'Stir', 'brief')],
    }),
    operationalStep({
      id: 'guide_siphon_contact',
      label: 'Upper contact',
      actionType: 'steep',
      startSeconds: Math.min(drawdownStart - 25, heatStart + 45),
      endSeconds: drawdownStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Hold upper-chamber contact without over-stirring.',
      techniqueChips: [chip('contact', 'Contact', formatTime(Math.max(20, drawdownStart - heatStart)))],
    }),
    drawdown ? sourceStep('drawdown', drawdown, {
      label: 'Remove heat and drawdown',
      primaryText: 'Remove heat and let drawdown finish naturally.',
      secondaryText: drawdown.hybridInstruction || drawdown.note,
      techniqueChips: [chip('drawdown', 'Drawdown', 'natural')],
    }) : operationalStep({
      id: 'guide_siphon_drawdown',
      label: 'Remove heat and drawdown',
      actionType: 'drawdown',
      kind: 'drawdown',
      startSeconds: drawdownStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Remove heat and let drawdown finish naturally.',
      techniqueChips: [chip('drawdown', 'Drawdown', 'natural')],
    }),
    operationalStep({
      id: 'guide_siphon_serve',
      label: 'Serve',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Serve promptly after drawdown clears.',
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
      primaryText: `Set dose per liter and target ${formatMl(plan.totalWaterMl)} machine cycle water.`,
      techniqueChips: [chip('dose_per_liter', 'Dose/L', `${formatGrams(plan.doseG)} / ${formatMl(plan.totalWaterMl)}`)],
    }),
    operationalStep({
      id: 'guide_batch_basket',
      label: 'Basket prep',
      actionType: 'setup',
      startSeconds: 0,
      primaryText: 'Seat the filter, level the basket bed, and start the machine cycle.',
      techniqueChips: [chip('basket_prep', 'Basket', 'level bed')],
    }),
    start ? sourceStep('charge', start, {
      label: 'Machine cycle',
      primaryText: 'Let the brewer run the programmed spray cycle; do not disturb the basket.',
      secondaryText: start.hybridInstruction || start.note,
      techniqueChips: [chip('spray', 'Spray', 'machine flow')],
    }) : operationalStep({
      id: 'guide_batch_cycle',
      label: 'Machine cycle',
      actionType: 'charge',
      startSeconds: 0,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: 'Let the brewer run the programmed spray cycle; do not disturb the basket.',
      techniqueChips: [chip('spray', 'Spray', 'machine flow')],
    }),
    drawdown ? sourceStep('drawdown', drawdown, {
      label: 'Drawdown',
      primaryText: 'Let basket drawdown finish before service.',
      secondaryText: drawdown.hybridInstruction || drawdown.note,
      techniqueChips: [chip('drawdown', 'Drawdown', formatTime(plan.totalTimeSeconds))],
    }) : operationalStep({
      id: 'guide_batch_drawdown',
      label: 'Drawdown',
      actionType: 'drawdown',
      kind: 'drawdown',
      startSeconds: Math.max(0, plan.totalTimeSeconds - 45),
      targetVolumeMl: plan.totalWaterMl,
      primaryText: 'Let basket drawdown finish before service.',
      techniqueChips: [chip('drawdown', 'Drawdown', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_batch_mix',
      label: 'Mix batch',
      actionType: 'mix',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: 'Gently mix the batch before tasting or serving.',
      techniqueChips: [chip('mix_batch', 'Mix batch', 'before service')],
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
      primaryText: `Dose ${formatGrams(plan.doseG)} coarse coffee and prepare cool water.`,
      techniqueChips: [chip('dose', 'Dose', formatGrams(plan.doseG))],
    }),
    charge ? sourceStep('charge', charge, {
      label: 'Saturate',
      primaryText: `Saturate all grounds with ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)} cool water; remove dry pockets.`,
      secondaryText: charge.hybridInstruction || charge.note,
      techniqueChips: [chip('saturation', 'Saturate', 'all grounds')],
    }) : operationalStep({
      id: 'guide_cold_brew_saturate',
      label: 'Saturate',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `Saturate all grounds with ${formatMl(plan.hotWaterMl)} cool water; remove dry pockets.`,
      techniqueChips: [chip('saturation', 'Saturate', 'all grounds')],
    }),
    operationalStep({
      id: 'guide_cold_brew_steep',
      label: 'Steep',
      actionType: 'steep',
      startSeconds: 300,
      endSeconds: filterStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `Steep cold for ${formatTime(plan.totalTimeSeconds)} without heat or repeated agitation.`,
      techniqueChips: [chip('steep', 'Steep', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_cold_brew_filter',
      label: 'Filter or decant',
      actionType: 'filter',
      startSeconds: filterStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Filter or decant cleanly to separate coffee from grounds.',
      techniqueChips: [chip('filter', 'Filter', 'clean')],
    }),
    operationalStep({
      id: 'guide_cold_brew_dilute',
      label: 'Dilute after filtration',
      actionType: 'dilute',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Dilute only after filtration if serving strength needs it.',
      techniqueChips: [chip('dilution', 'Dilute', 'after filtration')],
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
    result.blockingErrors.push(`Missing workflow phase: ${label}.`);
  }
}

function validateIcedEnvelope(plan: BrewPlan, blockingErrors: string[]) {
  if (plan.brewMode !== 'iced') return;
  const hotIceTotal = Math.round(plan.hotWaterMl + plan.iceMl);
  if (hotIceTotal !== Math.round(plan.totalWaterMl)) {
    blockingErrors.push(`Iced split mismatch: hot water ${plan.hotWaterMl} ml + ice ${plan.iceMl} g must equal total ${plan.totalWaterMl} ml.`);
  }
  if (!(plan.estimatedCupOutputMl < plan.totalWaterMl)) {
    blockingErrors.push('Iced cup output must be lower than total input after retention.');
  }
  const volumeSteps = plan.steps.filter((step) => step.pourVolumeMl > 0 || step.kind === 'extract');
  const lastVolumeStep = volumeSteps.at(-1);
  if (lastVolumeStep && Math.round(lastVolumeStep.targetVolumeMl) !== Math.round(plan.hotWaterMl)) {
    blockingErrors.push(`Last hot-water target ${lastVolumeStep.targetVolumeMl} ml must equal hot water ${plan.hotWaterMl} ml.`);
  }
  const poured = Math.round(volumeSteps.reduce((sum, step) => sum + Math.max(0, step.pourVolumeMl), 0));
  if (Math.abs(poured - Math.round(plan.hotWaterMl)) > 1) {
    blockingErrors.push(`Iced pour sum ${poured} ml must equal hot water ${plan.hotWaterMl} ml within 1 ml.`);
  }
}

function validateHarioSwitchWorkflow(plan: BrewPlan, guideSteps: WorkflowGuideStep[], blockingErrors: string[], warnings: string[]) {
  if (plan.dripper.id === 'hario-switch') {
    blockingErrors.push('Legacy Hario Switch profile is size-ambiguous. Choose Switch 02, Switch 03, or MUGEN x SWITCH before brewing.');
  }

  const preservedStepIds = new Set(guideSteps.flatMap((step) => step.sourceStepIds));
  const missingVolumeSteps = plan.steps
    .filter((step) => step.pourVolumeMl > 0)
    .filter((step) => !preservedStepIds.has(step.id));
  if (missingVolumeSteps.length > 0) {
    blockingErrors.push(`Hario Switch guide dropped volume checkpoint(s): ${missingVolumeSteps.map((step) => step.id).join(', ')}.`);
  }

  const constraints = plan.devicePhysicalConstraints;
  const closedLimit = constraints?.recommendedClosedPhaseMaxMl || constraints?.finishedCapacityMl;
  if (!closedLimit) {
    blockingErrors.push('Hario Switch exact profile is missing chamber capacity constraints.');
    return;
  }

  const closedLoads = plan.steps
    .filter((step) => step.valveState === 'closed')
    .map((step) => step.chamberLoadMl ?? step.targetVolumeMl)
    .filter((value) => Number.isFinite(value) && value > 0);
  const maxClosedLoad = Math.max(0, ...closedLoads);
  if (maxClosedLoad > closedLimit + 1) {
    blockingErrors.push(`Hario Switch closed chamber load ${Math.round(maxClosedLoad)} ml exceeds safe ${Math.round(closedLimit)} ml. Choose Switch 03 or a hybrid programme.`);
  }

  if (String(plan.methodProgramme || '').startsWith('full_immersion') && plan.hotWaterMl > closedLimit + 1) {
    blockingErrors.push(`Full-immersion Switch programme needs ${Math.round(plan.hotWaterMl)} ml closed capacity, above safe ${Math.round(closedLimit)} ml.`);
  }

  if (plan.switchStepValidation?.status === 'blocked') {
    blockingErrors.push(plan.switchStepValidation.message);
  } else if (plan.switchStepValidation?.status === 'caution') {
    warnings.push(plan.switchStepValidation.message);
  }

  if (!constraints.finishedCapacityMl || !constraints.filterSize) {
    warnings.push('Hario Switch profile needs complete capacity and filter-size evidence before public-ready confidence.');
  }
}

export function validateMethodWorkflowGuide(plan: BrewPlan, guideSteps: WorkflowGuideStep[]): MethodWorkflowValidationResult {
  const missingPhases: string[] = [];
  const warnings: string[] = [];
  const blockingErrors: string[] = [];
  const phases = phaseSet(guideSteps);
  const accumulator = { missingPhases, blockingErrors };

  if (guideSteps.length === 0) {
    blockingErrors.push('Workflow guide is empty.');
  }

  validateIcedEnvelope(plan, blockingErrors);

  if (POUROVER_FAMILIES.has(plan.methodFamily)) {
    requirePhase(accumulator, phases, 'rinse/preheat', /rinse|preheat|filter|bilas|panas/);
    requirePhase(accumulator, phases, 'bloom', 'bloom');
    requirePhase(accumulator, phases, 'pour', 'pour');
    requirePhase(accumulator, phases, 'drawdown', 'drawdown');
    requirePhase(accumulator, phases, 'serve', 'serve');
    if (plan.brewMode === 'iced') requirePhase(accumulator, phases, 'hot-water target', /hot water|air panas/);
  }

  switch (plan.methodFamily) {
    case 'hario_switch':
      requirePhase(accumulator, phases, 'valve state', /valve|closed|open/);
      requirePhase(accumulator, phases, 'chamber state', /chamber|immersion|percolation/);
      if (plan.methodProgramme === 'full_percolation_v60_mode' || plan.switchPresetId === 'v60_mode') {
        requirePhase(accumulator, phases, 'open percolation', /open|percolation/);
      } else {
        requirePhase(accumulator, phases, 'release/open', /release|open/);
      }
      requirePhase(accumulator, phases, 'serve', 'serve');
      validateHarioSwitchWorkflow(plan, guideSteps, blockingErrors, warnings);
      if (phases.has(/generic clever only|single charge only/)) blockingErrors.push('Hario Switch workflow must not collapse to a generic single-charge Clever guide.');
      break;
    case 'aeropress':
      requirePhase(accumulator, phases, 'charge', /charge|water/);
      requirePhase(accumulator, phases, 'stir/swirl', /stir|swirl/);
      requirePhase(accumulator, phases, 'steep', 'steep');
      requirePhase(accumulator, phases, 'press', 'press');
      requirePhase(accumulator, phases, 'stop before hiss', /before hiss|hiss/);
      if (guideSteps.filter((step) => !step.isOperationalOnly || step.actionType !== 'setup').length < 5) {
        blockingErrors.push('AeroPress workflow must not render as a single operational step.');
      }
      if (phases.has(/final pour|drawdown bed|center-to-mid stream/)) {
        blockingErrors.push('AeroPress workflow contains pour-over wording.');
      }
      break;
    case 'french_press':
      requirePhase(accumulator, phases, 'charge', 'charge');
      requirePhase(accumulator, phases, 'steep', 'steep');
      requirePhase(accumulator, phases, 'settle/decant', /settle|decant|crust/);
      requirePhase(accumulator, phases, 'press', 'press');
      if (phases.has(/final pour|bloom|drawdown bed/)) blockingErrors.push('French Press workflow contains pour-over wording.');
      break;
    case 'clever_dripper':
      requirePhase(accumulator, phases, 'charge', 'charge');
      requirePhase(accumulator, phases, 'steep', 'steep');
      requirePhase(accumulator, phases, 'release', 'release');
      requirePhase(accumulator, phases, 'drawdown', 'drawdown');
      break;
    case 'moka_pot':
      requirePhase(accumulator, phases, 'boiler below valve', /below valve|boiler/);
      requirePhase(accumulator, phases, 'level basket', /basket|no tamp/);
      requirePhase(accumulator, phases, 'heat', 'heat');
      requirePhase(accumulator, phases, 'stop before sputter', /sputter|stop/);
      if (phases.has(/bloom|final pour|center-to-mid/)) blockingErrors.push('Moka Pot workflow contains pour-over wording.');
      break;
    case 'espresso':
      requirePhase(accumulator, phases, 'dose', 'dose');
      requirePhase(accumulator, phases, 'puck prep', /puck|tamp|distribute/);
      requirePhase(accumulator, phases, 'shot/yield', /shot|yield|extract/);
      requirePhase(accumulator, phases, 'flow', 'flow');
      requirePhase(accumulator, phases, 'stop', 'stop');
      if (phases.has(/bloom|kettle|filter wall|final pour/)) blockingErrors.push('Espresso workflow contains filter-brew wording.');
      break;
    case 'siphon':
      requirePhase(accumulator, phases, 'heat/draw-up', /heat|draw-up|draw up/);
      requirePhase(accumulator, phases, 'stir', 'stir');
      requirePhase(accumulator, phases, 'contact', 'contact');
      requirePhase(accumulator, phases, 'drawdown', 'drawdown');
      break;
    case 'batch_brew':
      requirePhase(accumulator, phases, 'dose per liter', /dose\/l|dose per liter/);
      requirePhase(accumulator, phases, 'machine/spray', /machine|spray/);
      requirePhase(accumulator, phases, 'drawdown', 'drawdown');
      requirePhase(accumulator, phases, 'mix batch', /mix batch|carafe/);
      if (phases.has(/manual pour|bloom pour|center-to-mid/)) blockingErrors.push('Batch brewer workflow contains manual pour-over wording.');
      break;
    case 'cold_brew':
      requirePhase(accumulator, phases, 'saturate', /saturate|dry pocket/);
      requirePhase(accumulator, phases, 'steep hours', /steep|h/);
      requirePhase(accumulator, phases, 'filter/decant', /filter|decant/);
      requirePhase(accumulator, phases, 'dilute after filtration', /after filtration|dilute/);
      if (phases.has(/hot pour|kettle|bloom/)) blockingErrors.push('Cold Brew workflow contains hot pour-over wording.');
      break;
    default:
      break;
  }

  if (!phases.has(/rinse|preheat|setup|prep|dose|boiler|basket/)) {
    warnings.push('Workflow guide is missing a setup/prep cue.');
  }
  if (plan.fallbackUsed) warnings.push('Fallback equipment/grinder reference needs taste validation.');
  if (plan.waterPresetStatus === 'manual_required' || plan.waterMineralDerivation === 'estimated_from_classification') {
    warnings.push('Water minerals require manual verification before public-ready confidence.');
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
