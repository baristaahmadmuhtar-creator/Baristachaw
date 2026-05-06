import type { AiBrewPromptContext, BrewPlan } from './types';
import { buildExtractionFinisher } from './extractionFinisher';
import { formatAiBrewKnowledgeContext } from './knowledge.ts';
import { isIndonesianAiBrewLanguage } from './localization.ts';

function formatSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  if (safeSeconds >= 3600) {
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
  }
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatBaristaRatio(value: number) {
  if (!Number.isFinite(value)) return '--';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatBaristaTemperature(value: number) {
  if (!Number.isFinite(value)) return '--';
  return String(Math.round(value));
}

function buildPourProgressionProfile(plan: BrewPlan) {
  if (plan.steps.length === 0 || plan.hotWaterMl <= 0) return 'not_available';

  const pourSteps = plan.steps.filter((step) => {
    const kind = step.kind || 'pour';
    return kind === 'pour' || kind === 'extract';
  });
  const shares = (pourSteps.length > 0 ? pourSteps : plan.steps)
    .map((step) => step.pourVolumeMl / plan.hotWaterMl);
  const first = shares[0] || 0;
  const last = shares[shares.length - 1] || 0;
  const middle = shares.length > 2
    ? shares.slice(1, -1).reduce((sum, value) => sum + value, 0)
    : 0;

  if (first >= middle + last * 0.15) return 'front_loaded';
  if (last >= middle + first * 0.15) return 'back_loaded';
  if (middle > Math.max(first, last)) return 'mid_loaded';
  return 'even';
}


function buildCadenceProfile(plan: BrewPlan) {
  if (plan.steps.length < 2) return 'not_available';

  const checkpoints = plan.steps.map((step) => step.startSeconds);
  const intervals: number[] = [];
  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    intervals.push(Math.max(0, checkpoints[index + 1] - checkpoints[index]));
  }
  const finalWindow = Math.max(0, plan.totalTimeSeconds - checkpoints[checkpoints.length - 1]);
  intervals.push(finalWindow);

  const total = intervals.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return 'even_cadence';

  const first = intervals[0] / total;
  const last = intervals[intervals.length - 1] / total;
  const middle = intervals.length > 2
    ? intervals.slice(1, -1).reduce((sum, value) => sum + value, 0) / total
    : 0;

  if (first >= middle + last * 0.12) return 'front_cadence';
  if (last >= middle + first * 0.12) return 'back_cadence';
  if (middle > Math.max(first, last)) return 'mid_cadence';
  return 'even_cadence';
}

function buildExtractionPressureProfile(plan: BrewPlan) {
  let score = 0;
  if (plan.beanProfile.roastDevelopment === 'underdeveloped') score += 1;
  else if (plan.beanProfile.roastDevelopment === 'developed') score -= 1;
  if (plan.beanProfile.solubility === 'low') score += 1;
  else if (plan.beanProfile.solubility === 'high') score -= 1;
  if (plan.waterMinerals.hardnessPpm >= 120) score += 0.4;
  else if (plan.waterMinerals.hardnessPpm <= 45) score -= 0.3;
  if (plan.waterMinerals.alkalinityPpm >= 80) score += 0.3;
  else if (plan.waterMinerals.alkalinityPpm <= 30) score -= 0.2;

  if (score >= 1.4) return 'resistant_extraction';
  if (score <= -1.4) return 'easy_extraction';
  return 'neutral_extraction';
}

function formatStepOperation(step: BrewPlan['steps'][number]) {
  const kind = step.kind || 'pour';
  if (kind === 'release') return `open release at target ${step.targetVolumeMl} ml`;
  if (kind === 'wait') return `hold contact at target ${step.targetVolumeMl} ml`;
  if (kind === 'drawdown') return `let drawdown continue at target ${step.targetVolumeMl} ml`;
  if (kind === 'press') return `press slowly at target ${step.targetVolumeMl} ml`;
  if (kind === 'heat') return `heat steadily at target ${step.targetVolumeMl} ml`;
  if (kind === 'extract') return `extract to target yield ${step.targetVolumeMl} ml`;
  if (kind === 'serve') return `separate and serve at target ${step.targetVolumeMl} ml`;
  return `pour ${step.pourVolumeMl} ml to ${step.targetVolumeMl} ml`;
}

function hasExplicitGeishaVariety(plan: BrewPlan) {
  return /\b(?:geisha|gesha)\b/i.test(plan.variety || '');
}

function formatVarietyAwarePhrase(plan: BrewPlan) {
  if (hasExplicitGeishaVariety(plan)) return 'varietas Geisha/Gesha yang kompleks';
  if (plan.variety && !/^not specified$/i.test(plan.variety)) return `varietas ${plan.variety}`;
  return 'kopi ini';
}

function buildDeterministicVocabularyRules(plan: BrewPlan) {
  const explicitGeisha = hasExplicitGeishaVariety(plan);
  return [
    'Deterministic vocabulary rules:',
    '- Never rename the coffee variety unless the deterministic context provides it.',
    explicitGeisha
      ? '- Variety is explicitly Geisha/Gesha; keep that label exact and do not broaden it.'
      : '- Never use premium variety names unless Variety explicitly provides them.',
    '- Never call total input "cup output".',
    '- For iced mode, totalWaterMl is total input, not final served cup output.',
    '- For iced mode, estimatedCupOutputMl is estimated served beverage after coffee retention.',
    '- For iced mode, iceMl must be shown operationally as grams of ice.',
    `- Variety-safe phrase for narrative: ${formatVarietyAwarePhrase(plan)}.`,
  ].join('\n');
}

function buildSharedContext(plan: BrewPlan) {
  const steps = plan.steps
    .map((step, index) => `${index + 1}. ${step.label} at ${formatSeconds(step.startSeconds)}: ${formatStepOperation(step)}. ${step.hybridInstruction || step.note}`)
    .join('\n');

  return [
    `Coffee: ${plan.coffeeName}`,
    `Mode: ${plan.brewMode}`,
    `Target profile: ${plan.targetProfileLabel}`,
    `Process: ${plan.process}`,
    `Variety: ${plan.variety}`,
    `Roast level: ${plan.roastLevel}`,
    `Bean profile: ${plan.beanProfile.active ? plan.beanProfile.summary : 'neutral'}`,
    `Brewer: ${plan.dripper.name}`,
    `Method family: ${plan.methodFamily}`,
    `Grinder: ${plan.grinder.name}`,
    `Water mode: ${plan.waterMode}`,
    `Water region: ${plan.waterRegion}`,
    `Water brand: ${plan.waterBrandLabel || 'manual'}`,
    `Water preset status: ${plan.waterPresetStatus || 'manual'}`,
    `Water publish state: ${plan.waterPublishState || 'manual'}`,
    `Water brew ready: ${plan.waterIsBrewReady ? 'yes' : 'no'}`,
    `Water customized: ${plan.waterCustomized ? 'yes' : 'no'}`,
    `Water minerals: TDS ${plan.waterMinerals.tdsPpm} ppm, hardness ${plan.waterMinerals.hardnessPpm} ppm, alkalinity ${plan.waterMinerals.alkalinityPpm} ppm (${plan.waterMinerals.styleLabel})`,
    `Operator knowledge: ${formatAiBrewKnowledgeContext(plan)}`,
    `Device profile: ${plan.deviceProfileLabel} (${plan.deviceProfileMode})`,
    `Grinder setting reference: ${plan.grindSettingReference} (${plan.grindSettingMode}, ${plan.grindSettingVerification})`,
    `Provenance attention needed: ${plan.provenanceAttentionNeeded ? 'yes' : 'no'}`,
    `Dose: ${plan.doseG} g`,
    `Final beverage ratio: 1:${formatBaristaRatio(plan.finalBeverageRatio)}`,
    `Hot extraction ratio: 1:${formatBaristaRatio(plan.hotExtractionRatio)}`,
    `Total input (totalWaterMl): ${plan.totalWaterMl} ml`,
    `Hot water: ${plan.hotWaterMl} ml`,
    `Ice in server: ${plan.iceMl} g`,
    `Estimated cup output after retention: ${plan.estimatedCupOutputMl} ml`,
    `Temperature: ${formatBaristaTemperature(plan.waterTempC)} C`,
    `Target brew time: ${formatSeconds(plan.totalTimeSeconds)}`,
    `Grind recommendation: ${plan.grindRecommendation}`,
    `Warnings: ${plan.guardrails.warnings.join(' | ') || 'none'}`,
    `Standards misses: ${plan.conformance.standardsMisses.join(' | ') || 'none'}`,
    `Confidence notes: ${plan.confidenceNotes.join(' | ') || 'none'}`,
    buildDeterministicVocabularyRules(plan),
    'Brew steps:',
    steps,
  ].join('\n');
}

function buildPlannerEnvelope(plan: BrewPlan) {
  const stepEnvelope = plan.steps
    .map((step) => `- ${step.label} @ ${formatSeconds(step.startSeconds)}: ${formatStepOperation(step)}`)
    .join('\n');

  return [
    'Deterministic envelope (source of truth):',
    `- dose: ${plan.doseG} g`,
    `- final beverage ratio: 1:${formatBaristaRatio(plan.finalBeverageRatio)}`,
    `- hot extraction ratio: 1:${formatBaristaRatio(plan.hotExtractionRatio)}`,
    `- total water: ${plan.totalWaterMl} ml`,
    `- hot water: ${plan.hotWaterMl} ml`,
    `- ice in server: ${plan.iceMl} g`,
    `- estimated cup output after retention: ${plan.estimatedCupOutputMl} ml`,
    `- temperature: ${formatBaristaTemperature(plan.waterTempC)} C`,
    `- brew time: ${formatSeconds(plan.totalTimeSeconds)}`,
    `- operation progression profile: ${buildPourProgressionProfile(plan)}`,
    `- extraction pressure profile: ${buildExtractionPressureProfile(plan)}`,
    `- cadence profile: ${buildCadenceProfile(plan)}`,
    '- sequence checkpoints:',
    stepEnvelope,
  ].join('\n');
}

function buildStepRoleMap(plan: BrewPlan) {
  const methodRole = (() => {
    switch (plan.methodFamily) {
      case 'espresso':
        return 'yield, flow, and shot-stop control';
      case 'moka_pot':
        return 'base-fill, moderate heat, and remove-before-boil control';
      case 'cold_brew':
        return 'full saturation, long steep, and clean filter control';
      case 'batch_brew':
        return 'basket distribution, machine cycle, and batch mixing control';
      case 'french_press':
        return 'immersion contact, slow press, and decant control';
      case 'aeropress':
        return 'short immersion and steady press control';
      case 'siphon':
        return 'heat, vacuum contact, and drawdown control';
      case 'clever_dripper':
        return 'immersion-contact control';
      case 'chemex':
        return 'thick-filter flow stability';
      case 'kalita_wave':
      case 'april':
      case 'melitta':
        return 'flat-bed pulse stability';
      default:
        return 'cone-flow clarity control';
    }
  })();

  const roleLines = plan.steps.map((step, index) => {
    const kind = step.kind || 'pour';
    const role = (() => {
      if (kind === 'extract') return 'start and stop extraction by target yield, time, and flow';
      if (kind === 'heat') return 'build heat steadily without boiling or harsh acceleration';
      if (kind === 'press') return 'press steadily and avoid forcing fines into the cup';
      if (kind === 'wait') return 'hold contact time stable without adding extra water';
      if (kind === 'release') return 'open release cleanly and protect drawdown';
      if (kind === 'drawdown') return 'let drawdown finish cleanly without extra agitation';
      if (kind === 'serve') return 'separate, filter, decant, or serve to stop extraction cleanly';
      return index === 0
        ? 'initiate full saturation and lock bed wetting uniformity'
        : index === plan.steps.length - 1
          ? 'close extraction and stabilize drawdown for clean finish'
          : 'manage mid-brew cadence and slurry height before next checkpoint';
    })();
    return `- ${step.label} @ ${formatSeconds(step.startSeconds)}: ${role}; keep ${methodRole}.`;
  });

  return [
    'Operational role map (must change wording by step phase):',
    ...roleLines,
  ].join('\n');
}

function buildMethodCueChecklist(plan: BrewPlan) {
  const lines = ['Method cue checklist (must appear in Sequence/Steps lines):'];

  switch (plan.methodFamily) {
    case 'espresso':
      lines.push('- Include espresso yield/shot/flow cue in at least two steps.');
      lines.push('- Final step must stop by target yield/time/flow, not by adding water.');
      return lines.join('\n');
    case 'moka_pot':
      lines.push('- Include base-fill or safety-valve cue early.');
      lines.push('- Include moderate heat and remove-before-boil/sputter cue late.');
      return lines.join('\n');
    case 'cold_brew':
      lines.push('- Include cool-water full-saturation cue early.');
      lines.push('- Include long steep and filter/decant separation cue by the final step.');
      return lines.join('\n');
    case 'batch_brew':
      lines.push('- Include basket/machine-cycle cue early or middle.');
      lines.push('- Include drawdown completion and batch mixing cue by the final step.');
      return lines.join('\n');
    case 'french_press':
      lines.push('- Include immersion/steep cue in entry step.');
      lines.push('- Include slow press and decant/separate cue in final step.');
      return lines.join('\n');
    case 'aeropress':
      lines.push('- Include AeroPress chamber immersion cue before pressing.');
      lines.push('- Include steady press/plunge cue in final step; avoid forcing the last hiss.');
      return lines.join('\n');
    case 'siphon':
      lines.push('- Include heat/vacuum/upper-chamber cue early.');
      lines.push('- Include cut-heat/drawdown cue in final step.');
      return lines.join('\n');
    case 'clever_dripper':
      lines.push('- Include immersion-contact cue in entry step (step 1).');
      lines.push('- Include release cue in final step (last step).');
      return lines.join('\n');
  }

  lines.push('- Include percolation flow cues (concentric/circle/pulse/center/bed settle) across multiple steps, not just one.');

  if (plan.methodFamily === 'chemex') {
    lines.push('- Include thick-filter control cues (filter wall/bypass/steady flow) across at least two steps.');
    lines.push('- Include Chemex setup cues when relevant: hard rinse, preheat glass, three-layer side toward spout, and open vent.');
    if (plan.brewMode === 'iced') {
      lines.push('- Chemex iced must stay hot concentrate over measured ice; do not add bypass/top-up water after drawdown.');
    }
  }
  if (plan.methodFamily === 'origami') {
    if (/wave/i.test(`${plan.deviceProfileId} ${plan.deviceProfileLabel}`)) {
      lines.push('- Origami wave filter must use flat-bed cues: level bed, centered pour, and no wide circular agitation.');
    } else {
      lines.push('- Origami cone filter must use cone-flow cues: compact pulses, agile flow, and no wall chasing.');
    }
  }
  if (plan.methodFamily === 'kalita_wave' || plan.methodFamily === 'april' || plan.methodFamily === 'melitta') {
    lines.push('- Include flat-bed control cues (flat bed/bed height/low-spout/even bed) across at least two steps.');
  }

  return lines.join('\n');
}

function buildTargetIntentChecklist(plan: BrewPlan) {
  const target = plan.targetProfileLabel.toLowerCase();

  if (target.includes('acid')) {
    return [
      'Target-intent checklist (must appear in Sequence/Steps lines):',
      '- Include acidity/clarity control cues in at least two steps (for example bright, crisp, clean finish).',
      '- Avoid body-heavy wording as the dominant cue set.',
    ].join('\n');
  }

  if (target.includes('body') || target.includes('depth')) {
    return [
      'Target-intent checklist (must appear in Sequence/Steps lines):',
      '- Include body/depth control cues in at least two steps (for example texture, syrupy center, extraction depth).',
      '- Avoid acidity-dominant wording as the dominant cue set.',
    ].join('\n');
  }

  if (target.includes('sweet')) {
    return [
      'Target-intent checklist (must appear in Sequence/Steps lines):',
      '- Include sweetness-preservation cues in at least two steps (for example sweetness, round finish, sugar development).',
      '- Avoid harsh/dry/astringent cue language as the dominant direction.',
    ].join('\n');
  }

  return [
    'Target-intent checklist (must appear in Sequence/Steps lines):',
    '- For balanced targets, avoid one-sided body-only or acidity-only phrasing across all steps.',
    '- Keep cues mixed so clarity and sweetness stay aligned through entry, middle, and closure phases.',
  ].join('\n');
}

export function buildExplainPrompt(plan: BrewPlan, language?: string): AiBrewPromptContext {
  return {
    title: isIndonesianAiBrewLanguage(language) ? 'Jelaskan Resep' : 'Explain Plan',
    body: [
      'Explain why this brew plan should work.',
      'Focus on extraction logic, roast fit, target profile, and why the chosen grind/temperature/ratio make sense.',
      'Keep it practical for a barista and use short sections.',
      'Do not suggest new numeric parameters. Explain only using deterministic plan values.',
      'If variety, process, water, grinder, or brewer source is unknown/estimated/curated, state that uncertainty instead of inventing facts.',
      'Use sections exactly: ### Kenapa cocok, ### Hal yang perlu dijaga, ### Catatan sumber data.',
      '',
      buildSharedContext(plan),
    ].join('\n'),
  };
}

export function buildGenerateBriefPrompt(plan: BrewPlan, language?: string): AiBrewPromptContext {
  return {
    title: isIndonesianAiBrewLanguage(language) ? 'Asisten AI' : 'AI Brew Read',
    body: [
      'You are the AI Brew sequence composer.',
      'Write a compact operational brief for a working barista, not a generic explanation.',
      'Follow deterministic planner envelope exactly; do not change any numeric values.',
      'Keep it concise, practical, and reproducible during service. Stay under 120 words total.',
      'Use this structure exactly:',
      '## Why It Fits',
      '- one short paragraph under 55 words',
      '## Focus',
      '- point 1',
      '- point 2',
      'Requirements:',
      '- Both focus points must be executable actions.',
      '- Explicitly mention the active target profile and one method-specific control behavior.',
      '- Explicitly mention at least one water/bean context constraint from the plan.',
      '- Do not invent equipment, chemistry values, or placeholder text.',
      '',
      buildPlannerEnvelope(plan),
      '',
      buildSharedContext(plan),
    ].join('\n'),
  };
}

export function buildOptimizationPrompt(plan: BrewPlan, language?: string): AiBrewPromptContext {
  const controlLanguage = isIndonesianAiBrewLanguage(language)
    ? 'Bahasa Indonesia natural, pendek, dan siap dipakai barista.'
    : `${language || 'English'} with concise service-ready wording.`;
  const timeDelta = plan.methodFamily === 'espresso'
    ? 5
    : plan.methodFamily === 'cold_brew'
      ? 3600
      : plan.methodFamily === 'batch_brew'
        ? 60
        : 10;
  const ratioDelta = plan.methodFamily === 'cold_brew'
    ? 1.2
    : plan.methodFamily === 'batch_brew'
      ? 0.7
      : plan.methodFamily === 'espresso'
        ? 0.25
        : 0.25;
  const tempDelta = plan.methodFamily === 'cold_brew'
    ? 4
    : plan.methodFamily === 'espresso'
      ? 1.5
      : 1;

  return {
    title: isIndonesianAiBrewLanguage(language) ? 'Optimasi AI' : 'AI Optimization',
    body: [
      'You are the AI Brew numeric optimizer. Return JSON only.',
      'Your job is to optimize the deterministic planner envelope, not merely rewrite narrative.',
      'Use current coffee/barista knowledge for origin, process, variety, roast, water, method family, and target profile. If the bean is unknown, infer conservatively from the provided name and catalog context.',
      'The local planner will validate, clamp, round, and reject unsafe values. Stay close to the baseline so the result is production-safe.',
      'You must return at least one safe controlled patch that changes the baseline or step controls. Do not answer with narrative-only optimization. If the baseline is already strong, choose the smallest justified shift inside guardrails.',
      '',
      'Never change: dose, brew mode, brewer, grinder, water minerals, method family, or selected step count.',
      `Allowed max shift from baseline: ratio ±${ratioDelta}, temperature ±${tempDelta} C, brew time ±${timeDelta} seconds.`,
      'Prefer controlled micro-patches: light pulse / balanced cadence cues, target time around +10 seconds when useful, temperature only +/-1 C, and grind guidance as text only.',
      'Do not create a new grinder setting. Grind guidance must say finer/coarser relative to the deterministic grind recommendation.',
      'For iced mode, keep Japanese-style flash brew: hot concentrate is poured over measured ice, with no late bypass or top-up. hotWaterSharePercent may shift only inside a realistic concentrate split. The validator will preserve hot water + ice = total water.',
      'Never invent variety, process, origin, roaster, farm, altitude, water status, grinder source, brewer trust, or claims not present in deterministic context.',
      'If the patch is not safe, the app will keep the deterministic planner and show a safe fallback.',
      'All numbers must be finite. Do not use null, NaN, Infinity, comments, markdown, code fences, or extra prose.',
      `Step control text language: ${controlLanguage}`,
      'Step control text must be short and must not contain new numeric targets, dose, ratio, temperature, grind changes, or next-cup troubleshooting.',
      '',
      'Return exactly this JSON shape with only keys you can justify:',
      '{',
      '  "reason": "one short reason",',
      '  "confidence": 0.0,',
      '  "recommendedRatio": 15.5,',
      '  "waterTempC": 92,',
      '  "totalTimeSeconds": 165,',
      '  "hotWaterSharePercent": 63,',
      '  "pourStyleHint": "balanced|pulse_light|gentle",',
      '  "grindGuidance": "short relative grind cue; no new numeric setting",',
      '  "steps": [',
      '    { "index": 1, "startSeconds": 0, "pourVolumeMl": 50, "control": "short phase cue" }',
      '  ]',
      '}',
      '',
      buildPlannerEnvelope(plan),
      '',
      buildSharedContext(plan),
    ].join('\n'),
  };
}

export function buildTroubleshootPrompt(plan: BrewPlan, language?: string): AiBrewPromptContext {
  return {
    title: isIndonesianAiBrewLanguage(language) ? 'Perbaiki Rasa' : 'Fix Taste',
    body: [
      'Create a troubleshooting guide for this brew plan.',
      'Cover sour, bitter, thin, muddy, hollow, and stalled drawdown outcomes.',
      'Give concrete one-step adjustments first, then explain tradeoffs.',
      'Recommend one smallest change first. Always include: "Mulai dari perubahan terkecil dulu."',
      'Use this order: small grind correction, pouring/agitation/contact control, then small temperature correction only if needed.',
      'Never overwrite current plan numbers. Dose, ratio, total water, hot/ice split, temperature, grind range, total time, and step timing are deterministic source-of-truth.',
      'Do not recommend changing dose, ratio, target yield, bypass water, or serving dilution as the first move.',
      '',
      buildSharedContext(plan),
    ].join('\n'),
  };
}

export function buildSequenceGuidePrompt(plan: BrewPlan, language?: string): AiBrewPromptContext {
  return {
    title: isIndonesianAiBrewLanguage(language) ? 'Catatan AI' : 'AI Sequence',
    body: [
      'You are the AI Brew sequence composer.',
      'Compose an operational sequence for bar service using deterministic checkpoints as fixed boundaries.',
      'Include every deterministic checkpoint step in chronological order and do not add extra steps.',
      `Use exactly ${plan.steps.length} numbered steps in the Sequence section.`,
      'Use this structure exactly:',
      '## Service Pattern',
      '- one line naming the sequence style for this context',
      '- one line describing mode behavior (hot/iced)',
      '## Sequence',
      '1. ...',
      '2. ...',
      '3. ...',
      '## Watch',
      '- point 1',
      '- point 2',
      'Requirements:',
      '- Every sequence line must include executable action and timing reference.',
      '- Service Pattern style line must explicitly include selected method/device and target profile anchors.',
      '- Service Pattern style line must not use generic labels like "default pattern" or "flexible style".',
      '- Service Pattern mode line must explicitly mention the active brew mode (hot or iced).',
      '- Every sequence line must reference the deterministic step label (e.g., Bloom, Pulse 1, Finish) for that step index.',
      '- Every sequence line must include the deterministic operation and target checkpoint from the planner envelope on the same line.',
      '- Start every sequence line with deterministic exact prefix from the envelope: "<step label> at exact planner time MM:SS: <deterministic operation>" before control instructions.',
      '- For pour checkpoints, include exactly one pour volume and one cumulative target. For non-pour checkpoints, do not invent a pour volume; keep the target/yield/action from the envelope.',
      '- Every sequence line must include at least one post-checkpoint control action (wait/hold/level/swirl/release/press/stop/filter/etc).',
      '- Any explicit wait/hold/pause/rest durations in one step must fit that step\'s deterministic cadence window to the next checkpoint.',
      '- Do not add a second absolute clock timestamp (MM:SS) inside the same step line; only the deterministic prefix time is allowed.',
      '- Avoid hedging terms in step lines (if needed/optional/approximate/to taste/at your discretion).',
      '- Do not use simulated or hypothetical execution wording (simulate/pretend/imagine/hypothetical).',
      '- Do not place next-cup troubleshooting phrases (if sour/if bitter/next cup/next brew) inside sequence steps; keep every step immediately executable in-run.',
      '- Do not inject post-brew dilution or top-up instructions (add/top-up/bypass X ml water or ice) outside deterministic checkpoints.',
      '- Do not reference hardware or tools that conflict with the selected brewer/method; the selected brewer itself is allowed.',
      '- Do not change grind, temperature, ratio, dose, total water, or brew time inside sequence steps; keep the envelope locked during the run.',
      '- Sequence must reflect phase control: entry cue in step 1, cadence-flow cue in middle steps, and closure cue in final step.',
      '- Keep operational intent aligned with deterministic progression profile (front_loaded/back_loaded/mid_loaded/even) from the planner envelope.',
      '- Keep step intensity language aligned with extraction pressure profile (resistant_extraction/easy_extraction/neutral_extraction) from the planner envelope.',
      '- Keep hold/wait emphasis aligned with cadence profile (front_cadence/back_cadence/mid_cadence/even_cadence) from the planner envelope.',
      '- Step 1 must not include closure-phase words (finish/final/drawdown/release/drain).',
      '- Final step must not reintroduce entry-phase words (bloom/initial saturation/immersion/soak).',
      '- Sequence lines (not only Watch bullets) must include method/device, target-profile, and water/bean context anchors across the full step set.',
      '- Spread method, target, and water/bean anchors across multiple steps (not concentrated in just one line).',
      '- Avoid repetitive wording across all steps; vary operational verbs while keeping deterministic checkpoints fixed.',
      '- Step phrasing must not share the same template shell across adjacent steps; change control intent by phase (entry/mid/final).',
      '- Watch section must include at least one method+target anchored monitoring bullet (not generic wording).',
      '- Watch section must include at least one deterministic envelope checkpoint with numeric anchors (dose/ratio/water/temp/time).',
      '- Keep heading order fixed as written: Service Pattern -> Sequence -> Watch.',
      '- Explicitly anchor to method/device, target profile, and at least one water/bean context constraint.',
      '- Reflect context explicitly (method family, brew mode, target profile, and water/bean constraints) so structure changes when context changes.',
      '- Operational steps must carry target-intent cues (acidity/body/sweetness/balance) and avoid drifting into opposite taste-direction language.',
      '- Do not combine opposing taste-direction cues in the same step line (for example body-depth and bright-acidity in one instruction).',
      '- If mentioning TDS/GH/KH or hardness/alkalinity values, copy the exact deterministic values only.',
      '- For iced mode, explicitly include deterministic hot-water and ice split in the narrative.',
      '- For iced mode, at least one Sequence line must state both hot and ice split values on the same line (X ml hot / Y ml ice).',
      '- Keep all numbers inside deterministic envelope.',
      '- Return markdown only, starting at the first required heading; do not add preface or code fences.',
      '- Do not include immersion/release-only instructions for non-immersion brewers.',
      '- Do not mention or imply another brewer/method family that conflicts with the deterministic plan.',
      '- Do not invent extra steps, equipment, chemistry data, or placeholders.',
      '',
      buildPlannerEnvelope(plan),
      '',
      buildStepRoleMap(plan),
      '',
      buildMethodCueChecklist(plan),
      '',
      buildTargetIntentChecklist(plan),
      '',
      buildSharedContext(plan),
    ].join('\n'),
  };
}

export function buildSequenceRepairPrompt(
  plan: BrewPlan,
  errors: string[] = [],
  language?: string,
): AiBrewPromptContext {
  const failureSummary = errors
    .slice(0, 6)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' | ') || 'invalid or incomplete sequence response';

  return {
    title: isIndonesianAiBrewLanguage(language) ? 'Perbaikan Catatan AI' : 'AI Sequence Repair',
    body: [
      'You are the AI Brew sequence repair composer. Return markdown only.',
      `Repair these validation failures: ${failureSummary}`,
      '',
      'Use this exact structure and no extra headings:',
      '## Service Pattern',
      '- style bullet anchored to brewer/method and target profile',
      '- mode bullet anchored to hot/iced behavior and water/bean context',
      '## Sequence',
      `Use exactly ${plan.steps.length} numbered steps, one per deterministic checkpoint.`,
      '## Watch',
      '- method+target monitoring bullet',
      '- deterministic envelope monitoring bullet with numeric anchors',
      '',
      'Hard rules:',
      '- Start each Sequence line with the exact deterministic checkpoint prefix from the envelope.',
      '- Keep every dose, ratio, water, ice, temperature, time, and cumulative target unchanged.',
      '- Do not add steps, bypass/top-up water, extra ice, extra equipment, another brewer, or next-cup troubleshooting.',
      '- Sequence lines must spread method/device, target-profile, and water/bean anchors across multiple steps.',
      '- Vary phase language: entry cue first, cadence/flow cues in middle, closure cue last.',
      '- Return complete markdown only, starting with ## Service Pattern.',
      '',
      `Context anchors: brewer=${plan.dripper.name}; method=${plan.methodFamily}; mode=${plan.brewMode}; target=${plan.targetProfileLabel}; coffee=${plan.coffeeName}; process=${plan.process}; variety=${plan.variety}; roast=${plan.roastLevel}; water=${plan.waterBrandLabel || plan.waterMode}; minerals=TDS ${plan.waterMinerals.tdsPpm} ppm, hardness ${plan.waterMinerals.hardnessPpm} ppm, alkalinity ${plan.waterMinerals.alkalinityPpm} ppm; bean=${plan.beanProfile.active ? plan.beanProfile.summary : 'neutral'}.`,
      '',
      buildPlannerEnvelope(plan),
      '',
      buildStepRoleMap(plan),
      '',
      buildMethodCueChecklist(plan),
      '',
      buildTargetIntentChecklist(plan),
    ].join('\n'),
  };
}

export function buildAdjustPrompt(plan: BrewPlan, language?: string): AiBrewPromptContext {
  return {
    title: isIndonesianAiBrewLanguage(language) ? 'Dorong Target' : 'Push Target',
    body: [
      'Suggest how to push this brew toward the selected target profile even harder without breaking balance.',
      'Return only actionable adjustments to grind, temperature, pour structure, flow, or contact time.',
      'Treat suggestions as next-brew adjustments, not changes to the current deterministic plan.',
      'Stay inside safe guardrails. Do not suggest ratio changes, dose changes, extreme temperature, top-up, bypass, or extra water unless deterministic steps include it.',
      'Do not invent variety, process, origin, roaster, farm, altitude, water status, grinder source, or brewer trust.',
      '',
      buildSharedContext(plan),
    ].join('\n'),
  };
}

export function buildSopPrompt(plan: BrewPlan, language?: string): AiBrewPromptContext {
  return {
    title: isIndonesianAiBrewLanguage(language) ? 'SOP AI' : 'AI SOP',
    body: [
      'Rewrite this brew plan as a simple standard operating procedure for a barista.',
      'Keep it short, practical, and consistent with manual-brew training language.',
      'Keep output compact: Quick Dial 5 bullets, Service Pattern 2 bullets, Steps one sentence each, Control Points 5 bullets maximum.',
      'Focus only on quick dial, service pattern, sequence execution, and extraction-finisher watchpoints.',
      'Use this structure exactly:',
      '## Quick Dial',
      '- dose',
      '- total water',
      '- temperature',
      '- grind',
      '- total time',
      '## Service Pattern',
      '- one context-specific sequence style line',
      '- one mode behavior line',
      '## Steps',
      '1. ...',
      '2. ...',
      '3. ...',
      '## Control Points',
      '- what to watch during execution',
      '- one method- or target-specific watchpoint tied to this plan context',
      '- one water or bean-context watchpoint tied to this plan context',
      '- one adjustment if the cup tastes sour',
      '- one adjustment if the cup tastes bitter',
      '- both sour and bitter adjustments must be actionable (verb + controllable knob: grind/temp/pour/flow/contact time)',
      '- include one concise extraction-finisher watchpoint from the plan context',
      '- do not add extra sections, long explanations, or background education',
      'Prefer concrete numbers already present in the plan. Do not invent new equipment or chemistry data.',
      'Service Pattern style line must explicitly include selected method/device and target profile anchors.',
      'Service Pattern style line must not use generic labels like "default pattern" or "flexible style".',
      'Service Pattern mode line must explicitly mention the active brew mode (hot or iced).',
      'Quick Dial must mirror deterministic values exactly for dose, total water (and iced split when present), temperature, grind recommendation, and total time.',
      'Do not round, estimate, or substitute Quick Dial values with alternatives.',
      `Use exactly ${plan.steps.length} numbered steps in the Steps section.`,
      'Each step must include the deterministic operation and target checkpoint from the planner envelope on the same line.',
      'Start every step with deterministic exact prefix from the envelope: "<step label> at exact planner time MM:SS: <deterministic operation>" before control instructions.',
      'For pour checkpoints, include exactly one pour volume and one cumulative target. For non-pour checkpoints, do not invent a pour volume; keep the target/yield/action from the envelope.',
      'Each step must reference the deterministic step label for its index (e.g., Bloom, Pulse 1, Finish).',
      'Each step must include at least one post-checkpoint control action (wait/hold/level/swirl/release/press/stop/filter/etc).',
      'Any explicit wait/hold/pause/rest durations in one step must fit that step\'s deterministic cadence window to the next checkpoint.',
      'Do not add a second absolute clock timestamp (MM:SS) inside the same step line; only the deterministic prefix time is allowed.',
      'Avoid hedging terms in step lines (if needed/optional/approximate/to taste/at your discretion).',
      'Do not use simulated or hypothetical execution wording (simulate/pretend/imagine/hypothetical).',
      'Do not place next-cup troubleshooting phrases (if sour/if bitter/next cup/next brew) inside Steps; keep every step immediately executable in-run.',
      'Do not inject post-brew dilution or top-up instructions (add/top-up/bypass X ml water or ice) outside deterministic checkpoints.',
      'Do not reference hardware or tools that conflict with the selected brewer/method; the selected brewer itself is allowed.',
      'Do not change grind, temperature, ratio, dose, total water, or brew time inside Steps; all parameter shifts belong to next-cup troubleshooting only.',
      'Steps must reflect phase control: entry cue in step 1, cadence-flow cue in middle steps, and closure cue in final step.',
      '- Keep operational intent aligned with deterministic progression profile (front_loaded/back_loaded/mid_loaded/even) from the planner envelope.',
      '- Keep step intensity language aligned with extraction pressure profile (resistant_extraction/easy_extraction/neutral_extraction) from the planner envelope.',
      '- Keep hold/wait emphasis aligned with cadence profile (front_cadence/back_cadence/mid_cadence/even_cadence) from the planner envelope.',
      'Step 1 must not include closure-phase words (finish/final/drawdown/release/drain).',
      'Final step must not reintroduce entry-phase words (bloom/initial saturation/immersion/soak).',
      'Steps section must carry context anchors (method/device + target profile + water/bean) in operational lines, not only in Control Points.',
      '- For iced mode, include deterministic hot/ice split explicitly in Steps or Control Points using both values (X ml hot / Y ml ice).',
      'Spread method, target, and water/bean anchors across multiple step lines so SOP remains adaptive and non-template.',
      'Avoid repetitive step phrasing; vary actionable verbs while preserving deterministic checkpoints.',
      '- Keep heading order fixed as written: Quick Dial -> Service Pattern -> Steps -> Control Points.',
      '- Return markdown only, starting at the first required heading; do not add preface or code fences.',
      '- For non-immersion brewers, avoid immersion/release-only instructions inside Steps.',
      '- Do not mention or imply another brewer/method family that conflicts with the deterministic plan.',
      'If chemistry values are mentioned (TDS/GH/KH), they must match deterministic planner values exactly.',
      'Do not use generic language like "adjust as needed"; every point must be executable in bar workflow.',
      'Control Points must explicitly contain one sour corrective bullet and one bitter corrective bullet.',
      'Each sour/bitter corrective bullet must include an actionable verb and a controllable brewing knob (grind/temp/pour/time/flow/contact).',
      'Operational steps must include target-intent cues and avoid opposite taste-direction language for the selected profile.',
      'Do not combine opposing taste-direction cues in the same step line (for example body-depth and bright-acidity in one instruction).',
      '- Step phrasing must change by phase and cannot reuse one template shell for all steps.',
      '',
      buildPlannerEnvelope(plan),
      '',
      buildStepRoleMap(plan),
      '',
      buildMethodCueChecklist(plan),
      '',
      buildTargetIntentChecklist(plan),
      '',
      buildSharedContext(plan),
    ].join('\n'),
  };
}

export function buildExtractionFinisherPrompt(plan: BrewPlan, language?: string): AiBrewPromptContext {
  const finisher = buildExtractionFinisher(plan, language);
  return {
    title: isIndonesianAiBrewLanguage(language) ? 'Finalisasi Ekstraksi' : 'Extraction Finisher',
    body: [
      'Create a concise extraction finisher for this brew plan.',
      'Read the plan, water chemistry, roast, and bean profile before giving the final recommendation.',
      'Stay inside the current recipe envelope. Only use micro-adjustments to grind, temperature, pour structure, flow, or contact time.',
      'Use this structure exactly:',
      '## Final Read',
      '- one compact paragraph under 70 words',
      '## Recipe Reasoning',
      '- point 1',
      '- point 2',
      '- point 3',
      '## Control Points',
      '- point 1',
      '- point 2',
      '- point 3',
      '## Taste Rescue',
      '### Sour',
      '- First move: ...',
      '- Why: ...',
      '### Bitter',
      '- First move: ...',
      '- Why: ...',
      '### Thin',
      '- First move: ...',
      '- Why: ...',
      'Do not invent new equipment, water values, or sensory claims beyond the provided plan.',
      '',
      'Local baseline to preserve:',
      `Final read: ${finisher.finalRead}`,
      ...finisher.recipeReasoning.map((item) => `Reasoning: ${item}`),
      ...finisher.controlPoints.map((item) => `Control point: ${item}`),
      ...finisher.adjustments.map((item) => `${item.taste}: ${item.action} Why: ${item.why}`),
      '',
      buildSharedContext(plan),
    ].join('\n'),
  };
}





























