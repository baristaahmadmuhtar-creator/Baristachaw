import type { BrewPlan } from './types';

export type AiBrewNarrativeMode = 'generate' | 'sequence' | 'sop';

export interface AiBrewNarrativeValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalized: string;
}

export interface HybridNarrativeResult {
  markdown: string;
  usedFallback: boolean;
  validation: AiBrewNarrativeValidation;
  fallbackReason?: 'ai_unavailable' | 'ai_timeout' | 'invalid_narrative';
}

export interface HybridSequenceStepOverlay {
  rawLine: string;
  instruction: string;
}

export interface HybridSequenceOverlay {
  markdown: string;
  usedFallback: boolean;
  validation: AiBrewNarrativeValidation;
  servicePattern: string[];
  watch: string[];
  steps: HybridSequenceStepOverlay[];
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function normalizeText(text: string) {
  return text.replace(/\r\n/g, '\n').trim();
}

function normalizeWatchBulletFingerprint(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/\bwater is\b/g, ' ')
    .replace(/\bwater profile is\b/g, ' ')
    .replace(/\bwith buffered water\b/g, 'buffered water')
    .replace(/\bwith softer water\b/g, 'softer water')
    .replace(/\bkeep flow focused\b/g, 'keep tight flow')
    .replace(/\bkeep flow tighter\b/g, 'keep tight flow')
    .replace(/\bflattening?\s+(?:the\s+)?cup(?:\s+structure)?\b/g, 'flatten cup')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeBulletLines(lines: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const line of lines) {
    const fingerprint = normalizeWatchBulletFingerprint(line);
    if (!fingerprint || seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    output.push(line);
  }

  return output;
}

function sanitizeAiText(mode: AiBrewNarrativeMode, raw: string) {
  const normalized = normalizeText(raw)
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^`(?:markdown|md)?\s*/i, '')
    .replace(/`$/i, '')
    .trim();
  if (!normalized) return normalized;

  const primaryHeading = mode === 'generate'
    ? '## Why It Fits'
    : mode === 'sequence'
      ? '## Service Pattern'
      : '## Quick Dial';
  const firstHeadingIndex = normalized.search(/^##\s+/m);
  const headingIndex = normalized.indexOf(primaryHeading);
  if (headingIndex > 0 && (firstHeadingIndex === -1 || headingIndex <= firstHeadingIndex)) {
    return normalized.slice(headingIndex).trim();
  }
  return normalized;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const AI_UNAVAILABLE_PATTERNS = [
  /sorry,\s*i could not process your request/i,
  /\b(?:please|kindly)?\s*try again(?: later)?\b/i,
  /service unavailable/i,
  /request timed out/i,
  /\bi can('?| )?t (assist|help|complete) (with )?this request\b/i,
  /\btemporarily unable to (respond|generate)\b/i,
  /\bmodel (is )?currently overloaded\b/i,
];

const AI_TIMEOUT_PATTERNS = [
  /\brequest timed out\b/i,
  /\btimeout\b/i,
  /\bdeadline exceeded\b/i,
  /\btook too long\b/i,
  /\btime limit exceeded\b/i,
];

const STEP_ACTION_VERB_PATTERN = /\b(pour|wait|swirl|stir|hold|level(?:ing)?|bloom|pulse|release|drawdown|finish|keep(?:ing)?|sett(?:le|ling)|agitate|pause|rest|spin|tap|drain|immerse|steep|press|plunge|heat|extract|serve|decant|filter)\b/gi;
const IMMERSION_WORKFLOW_PATTERN = /\b(immersion|immerse|steep|steeping|hold\s+for\s+\d+\s*(?:sec|s|min|minutes?)|release\s+valve|plunge)\b/i;
const PERCOLATION_WORKFLOW_PATTERN = /\b(concentric|circle|spiral|pulse(?:\s+pour)?|ring\s+pour)\b/i;
const HOLD_DURATION_PATTERN = /\b(?:wait|hold|pause|rest)\s+(?:for\s+)?(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)\b/gi;
const ENTRY_PHASE_CUE_PATTERN = /\b(bloom|wet|saturat|immerse|steep|soak|contact\s*time)\b/i;
const MID_PHASE_CUE_PATTERN = /\b(pulse|cadence|stable|maintain|height|center|flow|stream|hold)\b/i;
const FINAL_PHASE_CUE_PATTERN = /\b(finish|final|drawdown|close|sett(?:le|ling)|release|drain|level(?:ing)?|serve|plunge)\b/i;
const HARD_ENTRY_PHASE_CUE_PATTERN = /\b(bloom|initial\s+saturat|first\s+wet|immerse|steep|soak|contact\s*time)\b/i;
const HARD_FINAL_PHASE_CUE_PATTERN = /\b(finish|final|drawdown|close|release|drain|serve|plunge)\b/i;
const STEP_PARAMETER_SHIFT_VERB_PATTERN = /\b(increase|decrease|raise|lower|coarsen|coarser|finer|tighten|loosen|change|adjust|bump|drop|reduce)\b/i;
const STEP_PARAMETER_SHIFT_TARGET_PATTERN = /\b(grind|temperature|temp|ratio|dose|water|brew\s*time|time)\b/i;
const STEP_HEDGING_PATTERN = /\b(if needed|if required|if possible|optional|to taste|as desired|at your discretion|adjust accordingly|adjust based on feel)\b/i;
const STEP_APPROXIMATION_PATTERN = /\b(roughly|approximately|approx\.?|estimate(?:d)?)\b/i;
const STEP_FAKE_EXECUTION_PATTERN = /\b(?:simulate|simulasi|pretend|imagine|hypothetical|as if|fiktif|dummy)\b/i;
const STEP_OUT_OF_RUN_ADVICE_PATTERN = /\b(if\s+sour|if\s+bitter|if\s+thin|if\s+muddy|if\s+hollow|next\s+cup|next\s+brew|on\s+the\s+next\s+cup|on\s+the\s+next\s+brew|for\s+the\s+next\s+cup|for\s+the\s+next\s+brew)\b/i;
const STEP_POST_BREW_DILUTION_PATTERN = /\b(?:add|top[\s-]?up|dilute|bypass(?:\s+with)?)\s+(?:\d+(?:\.\d+)?\s*ml\s+(?:of\s+)?)?(?:hot\s+)?(?:water|ice)\s+\d+(?:\.\d+)?\s*ml\b|\b(?:add|top[\s-]?up|dilute|bypass(?:\s+with)?)\s+\d+(?:\.\d+)?\s*ml\s+(?:of\s+)?(?:hot\s+)?(?:water|ice)\b/i;
const STEP_CLOCK_TIME_PATTERN = /\b(\d{1,2}):([0-5]\d)\b/g;
const STEP_UNSUPPORTED_HARDWARE_PATTERN = /\b(aeropress|french\s+press|moka\s+pot|portafilter|espresso\s+machine|steam\s+wand)\b/i;
const STEP_NON_IMMERSION_RELEASE_HARDWARE_PATTERN = /\b(release\s+valve|open\s+valve|plunger|plunge|open\s+switch|switch\s+release|clever\s+switch)\b/i;
const RESISTANT_EXTRACTION_CONFLICT_PATTERN = /\b(short(?:en)?\s+contact|quick(?:en)?\s+drawdown|faster\s+flow|reduce\s+slurry\s+contact)\b/i;
const EASY_EXTRACTION_CONFLICT_PATTERN = /\b(extend(?:ed)?\s+contact|slow(?:er)?\s+drawdown|long(?:er)?\s+slurry\s+hold|increase\s+contact\s+time)\b/i;
const SERVICE_PATTERN_GENERIC_PATTERN = /\b(default|standard|generic|flexible|simple)\s+(style|pattern)\b/i;
const FLAT_BED_METHODS = new Set<BrewPlan['methodFamily']>(['kalita_wave', 'april', 'melitta']);
const RELEASE_HARDWARE_METHODS = new Set<BrewPlan['methodFamily']>(['clever_dripper', 'aeropress', 'french_press']);
const IMMERSION_WORKFLOW_METHODS = new Set<BrewPlan['methodFamily']>(['clever_dripper', 'french_press', 'aeropress', 'cold_brew']);
const RELATIVE_VALUE_CONTEXT_PATTERN = /\b(by|raise|raised|increase|increased|decrease|decreased|lower|lowered|higher|hotter|cooler|drop|dropped|bump|bumped|more|less)\b/i;
const TEMPLATE_STOPWORDS = new Set([
  'the', 'and', 'with', 'for', 'from', 'that', 'this', 'then', 'into', 'while', 'keep', 'pour', 'step', 'profile',
  'target', 'water', 'bean', 'roast', 'balance', 'clean', 'mode', 'active', 'hold', 'wait', 'level', 'stream',
  'stable', 'calm', 'before', 'after', 'through', 'during', 'across', 'using', 'same', 'line', 'flow',
]);
const METHOD_FAMILY_ALIASES: Record<BrewPlan['methodFamily'], string[]> = {
  v60: ['v60', 'hario v60'],
  chemex: ['chemex'],
  kalita_wave: ['kalita', 'kalita wave'],
  clever_dripper: ['clever dripper', 'clever'],
  origami: ['origami'],
  april: ['april dripper', 'april brewer', 'april'],
  melitta: ['melitta'],
  kono: ['kono'],
  french_press: ['french press', 'press pot'],
  aeropress: ['aeropress'],
  siphon: ['siphon', 'syphon', 'vacuum brewer'],
  moka_pot: ['moka pot', 'moka'],
  cold_brew: ['cold brew', 'toddy'],
  batch_brew: ['batch brewer', 'batch brew'],
  espresso: ['espresso', 'espresso machine', 'portafilter'],
};

function referencesUnsupportedHardware(plan: BrewPlan, line: string) {
  let lowered = line.toLowerCase();
  for (const alias of METHOD_FAMILY_ALIASES[plan.methodFamily] || []) {
    lowered = lowered.replace(new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'gi'), ' ');
  }
  return STEP_UNSUPPORTED_HARDWARE_PATTERN.test(lowered);
}

type TargetIntent = 'acidity' | 'body' | 'sweetness' | 'balanced';

const TARGET_INTENT_POSITIVE_PATTERNS: Record<TargetIntent, RegExp> = {
  acidity: /\b(acidity|acidic|clarity|bright|brightness|crisp|clean(?:er)?\s+finish)\b/i,
  body: /\b(body|depth|syrup(?:y)?|texture|weight|heavier|full(?:er)?\s+mouthfeel)\b/i,
  sweetness: /\b(sweet|sweetness|sugar|syrup(?:y)?\s+center|honey|caramel|round(?:ness)?)\b/i,
  balanced: /\b(balance|balanced|clean|clarity|sweet(?:ness)?|round(?:ness)?)\b/i,
};

const TARGET_INTENT_CONFLICT_PATTERNS: Record<TargetIntent, RegExp> = {
  acidity: /\b(body|depth|syrup(?:y)?|heavy|weighty)\b/i,
  body: /\b(acidity|acidic|bright|brightness|crisp|high[\s-]?tone|clarity)\b/i,
  sweetness: /\b(harsh|sharp|thin|hollow|dry|astringent)\b/i,
  balanced: /\b(n\/a)\b/i,
};

function looksLikeAiUnavailableText(text: string) {
  const normalized = normalizeText(text);
  return AI_UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function looksLikeAiTimeoutText(text: string) {
  const normalized = normalizeText(text);
  return AI_TIMEOUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function resolveTargetIntent(plan: BrewPlan): TargetIntent {
  const target = plan.targetProfileLabel.toLowerCase();
  if (target.includes('acid')) return 'acidity';
  if (target.includes('body') || target.includes('depth')) return 'body';
  if (target.includes('sweet')) return 'sweetness';
  return 'balanced';
}

type ExtractionPressureProfile = 'resistant_extraction' | 'easy_extraction' | 'neutral_extraction';


type CadenceProfile = 'front_cadence' | 'back_cadence' | 'mid_cadence' | 'even_cadence';

function resolveCadenceProfile(plan: BrewPlan): CadenceProfile {
  if (plan.steps.length < 2) return 'even_cadence';

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
function resolveExtractionPressureProfile(plan: BrewPlan): ExtractionPressureProfile {
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

function hasTargetIntentCue(plan: BrewPlan, line: string) {
  const intent = resolveTargetIntent(plan);
  const normalizedTail = normalizeTailForIntentValidation(plan, line);
  return TARGET_INTENT_POSITIVE_PATTERNS[intent].test(normalizedTail);
}


function hasOpposingTasteCueInSingleStep(plan: BrewPlan, line: string) {
  const normalizedTail = normalizeTailForIntentValidation(plan, line);
  if (!normalizedTail) return false;

  const hasAcidityCue = TARGET_INTENT_POSITIVE_PATTERNS.acidity.test(normalizedTail);
  const hasBodyCue = TARGET_INTENT_POSITIVE_PATTERNS.body.test(normalizedTail);
  if (hasAcidityCue && hasBodyCue) return true;

  const intent = resolveTargetIntent(plan);
  if (intent === 'balanced') return false;

  const positivePattern = TARGET_INTENT_POSITIVE_PATTERNS[intent];
  const conflictPattern = TARGET_INTENT_CONFLICT_PATTERNS[intent];
  return positivePattern.test(normalizedTail) && conflictPattern.test(normalizedTail);
}
function buildTargetIntentCuePatch(plan: BrewPlan, index: number, totalSteps: number) {
  const intent = resolveTargetIntent(plan);
  const phase = totalSteps <= 1 ? 'single' : index === 0 ? 'entry' : index === totalSteps - 1 ? 'final' : 'middle';

  if (intent === 'acidity') {
    if (phase === 'entry') return 'keep bloom turbulence low to lift clean acidity';
    if (phase === 'final') return 'close with calm bed settling so bright finish stays crisp';
    return 'maintain short pulse windows to protect clarity and acidity definition';
  }

  if (intent === 'body') {
    if (phase === 'entry') return 'hold saturation slightly longer to build body depth';
    if (phase === 'final') return 'finish with steady flow to keep texture and depth intact';
    return 'keep slurry contact stable to reinforce syrupy body through mid extraction';
  }

  if (intent === 'sweetness') {
    if (phase === 'entry') return 'focus on uniform wetting to unlock sweetness development';
    if (phase === 'final') return 'close gently to keep sweetness round and clean';
    return 'maintain even pulse cadence to build a sweeter center without harshness';
  }

  if (phase === 'entry') return 'open with calm wetting to keep balance and clarity aligned';
  if (phase === 'final') return 'finish quietly to preserve balanced sweetness and clean finish';
  return 'hold steady cadence so balance stays even through the middle phase';
}

function normalizeTailForIntentValidation(plan: BrewPlan, line: string) {
  let normalized = extractStepTailAfterCheckpoint(line).toLowerCase();
  normalized = normalized.replace(/\b(acidity|acidic|body|sweet(?:ness)?|balance|balanced)\s+profile\b/g, ' ');
  const targetTokens = plan.targetProfileLabel.toLowerCase().split(/[^\w]+/).filter((token) => token.length > 3);
  for (const token of targetTokens) {
    normalized = normalized.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, 'g'), ' ');
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

function normalizeActionVerb(raw: string) {
  const lowered = raw.toLowerCase();
  if (lowered.startsWith('keep')) return 'keep';
  if (lowered.startsWith('level')) return 'level';
  return lowered;
}

function collectActionVerbs(line: string) {
  return Array.from(line.matchAll(STEP_ACTION_VERB_PATTERN))
    .map((match) => normalizeActionVerb(match[1]));
}

function normalizeStepTextForSimilarity(plan: BrewPlan, line: string) {
  let normalized = line
    .toLowerCase()
    .replace(/^\d+\.\s+/, '')
    .replace(/\b\d{1,2}:[0-5]\d\b/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:ml|g|c|sec|secs|second|seconds|min|mins|minute|minutes)\b/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\b/g, ' ');

  const removableTokens = new Set<string>([
    plan.methodFamily.replace(/_/g, ' ').toLowerCase(),
    plan.dripper.name.toLowerCase(),
    ...plan.steps.map((step) => step.label.toLowerCase()),
    ...plan.targetProfileLabel.toLowerCase().split(/[^\w]+/).filter((token) => token.length > 2),
  ]);

  for (const token of removableTokens) {
    normalized = normalized.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, 'g'), ' ');
  }

  return new Set(
    normalized
      .split(/[^a-z]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !TEMPLATE_STOPWORDS.has(token)),
  );
}

function jaccardSimilarity(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  const union = left.size + right.size - overlap;
  return union > 0 ? overlap / union : 0;
}

function parseDurationSeconds(rawValue: string, unit: string) {
  const value = Number.parseFloat(rawValue);
  if (!Number.isFinite(value)) return null;
  const lowered = unit.toLowerCase();
  const multiplier = lowered.startsWith('m') ? 60 : 1;
  return Math.round(value * multiplier);
}

function extractClockTimesInSeconds(text: string) {
  return Array.from(text.matchAll(STEP_CLOCK_TIME_PATTERN)).map((match) => {
    const minutes = Number.parseInt(match[1], 10);
    const seconds = Number.parseInt(match[2], 10);
    return minutes * 60 + seconds;
  });
}

function stripStepNumberPrefix(line: string) {
  return line.replace(/^\d+\.\s*/, '').trim();
}

function hasStepContextAnchors(plan: BrewPlan, line: string) {
  const lowered = line.toLowerCase();
  const methodToken = plan.methodFamily.replace(/_/g, ' ').toLowerCase();
  const targetTokens = plan.targetProfileLabel.toLowerCase().split(/[^\w]+/).filter((token) => token.length > 3);
  const hasMethod = lowered.includes(methodToken) || lowered.includes(plan.dripper.name.toLowerCase());
  const hasTarget = targetTokens.some((token) => lowered.includes(token));
  const hasWaterOrBean = /(water|tds|gh|kh|alkalinity|hardness|bean|roast|solubility|altitude)/i.test(line);
  return hasMethod && hasTarget && hasWaterOrBean;
}

function buildStepContextAnchorPatch(plan: BrewPlan, index: number, totalSteps: number) {
  const methodToken = plan.methodFamily.replace(/_/g, ' ');
  const target = plan.targetProfileLabel.toLowerCase();
  const waterStyle = plan.waterMinerals.styleLabel.toLowerCase();
  const beanAnchor = plan.beanProfile.active
    ? `bean ${plan.beanProfile.summary.toLowerCase()}`
    : 'bean roast context';
  const phase = totalSteps <= 1 ? 'single' : index === 0 ? 'entry' : index === totalSteps - 1 ? 'final' : 'middle';

  if (phase === 'entry') {
    return `for ${plan.dripper.name} ${methodToken} entry control to open ${target} extraction with ${waterStyle} water and ${beanAnchor}`;
  }
  if (phase === 'final') {
    return `for ${plan.dripper.name} ${methodToken} closure control to finish ${target} cleanly while ${waterStyle} water and ${beanAnchor} stay locked`;
  }
  return `for ${plan.dripper.name} ${methodToken} cadence control to maintain ${target} through ${waterStyle} water and ${beanAnchor}`;
}

function buildStepFallbackControlCue(plan: BrewPlan, index: number, totalSteps: number) {
  if (totalSteps <= 1) {
    return plan.methodFamily === 'clever_dripper'
      ? 'hold contact time steady, then release for a clean drawdown'
      : 'wait for bloom expansion, then level the bed before drawdown';
  }
  if (index === 0) {
    return plan.methodFamily === 'clever_dripper'
      ? 'hold immersion contact briefly before the next checkpoint'
      : 'wait for bloom expansion before the next checkpoint';
  }
  if (index === totalSteps - 1) {
    return plan.methodFamily === 'clever_dripper'
      ? 'release and drain cleanly to close extraction'
      : 'level the bed and let drawdown finish cleanly';
  }
  return 'hold stream cadence steady before the next checkpoint';
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

function isStepLineRepairSafe(plan: BrewPlan, line: string) {
  const normalized = stripStepNumberPrefix(line);
  if (!normalized) return false;
  if (/\b(?:tbd|todo|placeholder|lorem ipsum|\.\.\.)\b/i.test(normalized)) return false;
  if (STEP_HEDGING_PATTERN.test(normalized) || STEP_APPROXIMATION_PATTERN.test(normalized) || STEP_FAKE_EXECUTION_PATTERN.test(normalized)) return false;
  if (STEP_OUT_OF_RUN_ADVICE_PATTERN.test(normalized)) return false;
  if (STEP_POST_BREW_DILUTION_PATTERN.test(normalized)) return false;
  if (referencesUnsupportedHardware(plan, normalized)) return false;
  if (!RELEASE_HARDWARE_METHODS.has(plan.methodFamily) && STEP_NON_IMMERSION_RELEASE_HARDWARE_PATTERN.test(normalized)) return false;
  if (hasOpposingTasteCueInSingleStep(plan, line)) return false;
  if (extractClockTimesInSeconds(line).length > 1) return false;

  const pourMatches = Array.from(normalized.matchAll(/\bpour\s+\d+(?:\.\d+)?\s*ml\b/gi)).length;
  const targetMatches = Array.from(normalized.matchAll(/\b(?:to|reach|target)\s+\d+(?:\.\d+)?\s*ml\b/gi)).length;
  if (pourMatches > 1 || targetMatches > 1) return false;

  const lowered = normalized.toLowerCase();
  if (STEP_PARAMETER_SHIFT_VERB_PATTERN.test(lowered) && STEP_PARAMETER_SHIFT_TARGET_PATTERN.test(lowered)) return false;
  if (plan.methodFamily === 'clever_dripper' && PERCOLATION_WORKFLOW_PATTERN.test(normalized)) return false;
  if (!IMMERSION_WORKFLOW_METHODS.has(plan.methodFamily) && IMMERSION_WORKFLOW_PATTERN.test(normalized)) return false;
  return true;
}

function extractStepTailAfterCheckpoint(line: string) {
  const withoutPrefix = stripStepNumberPrefix(line);
  const checkpoint = withoutPrefix.match(/\b(?:to|reach|target)\s+\d+(?:\.\d+)?\s*ml\b/i);
  if (!checkpoint || checkpoint.index === undefined) return withoutPrefix;
  const tail = withoutPrefix.slice(checkpoint.index + checkpoint[0].length).trim();
  return tail.replace(/^[,;:\-]\s*/, '').trim();
}

function rebuildStepLineWithinEnvelope(
  plan: BrewPlan,
  step: BrewPlan['steps'][number],
  index: number,
  totalSteps: number,
  aiLine: string,
) {
  const actions = collectActionVerbs(aiLine);
  const hasPostPourAction = actions.some((verb) => verb !== 'pour');
  const rawTail = extractStepTailAfterCheckpoint(aiLine);
  const cleanedTail = rawTail
    .replace(/\b\d{1,2}:[0-5]\d\b/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^and\s+/i, '')
    .trim();
  const phaseControl = hasPostPourAction ? '' : buildStepFallbackControlCue(plan, index, totalSteps);
  const contextPatch = hasStepContextAnchors(plan, aiLine) ? '' : buildStepContextAnchorPatch(plan, index, totalSteps);
  const targetIntentPatch = hasTargetIntentCue(plan, aiLine) ? '' : buildTargetIntentCuePatch(plan, index, totalSteps);

  const tailParts = [cleanedTail, phaseControl, contextPatch, targetIntentPatch]
    .map((part) => part.trim())
    .filter(Boolean);
  const tail = (tailParts.join('; ') || buildStepFallbackControlCue(plan, index, totalSteps))
    .replace(/\s+/g, ' ')
    .replace(/[.;,\s]+$/g, '')
    .trim();

  return `${index + 1}. ${step.label} at ${formatSeconds(step.startSeconds)}: ${formatStepOperation(step)} ${tail}.`;
}

function repairOperationalStepLines(plan: BrewPlan, lines: string[]) {
  if (lines.length !== plan.steps.length) return null;
  const repaired: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const step = plan.steps[index];
    if (!step || !isStepLineRepairSafe(plan, line)) return null;
    repaired.push(rebuildStepLineWithinEnvelope(plan, step, index, plan.steps.length, line));
  }
  return repaired;
}
function getStepSectionLines(mode: AiBrewNarrativeMode, normalized: string) {
  if (mode === 'generate') return [] as string[];
  const heading = mode === 'sop' ? '## Steps' : '## Sequence';
  const sectionLines = getSectionLines(normalized, heading);
  return sectionLines.filter((line) => /^\d+\.\s+/.test(line));
}

function collectTechniqueNotes(plan: BrewPlan) {
  const notes: string[] = [];
  if (plan.brewMode === 'iced') {
    notes.push('Keep pours compact and controlled to avoid melting ice too early.');
  }
  switch (plan.methodFamily) {
    case 'kalita_wave':
    case 'april':
      notes.push('Keep the kettle low and use short, center-focused pulses for flat-bed evenness.');
      break;
    case 'clever_dripper':
      notes.push('Treat contact time and release timing as critical; avoid unnecessary agitation before release.');
      break;
    case 'chemex':
      notes.push('Pour steadily and avoid aggressive turbulence to keep drawdown consistent through thicker filters.');
      break;
    case 'origami':
      notes.push('Use smooth concentric pours and maintain a stable bed height between pulses.');
      break;
    case 'melitta':
      notes.push('Use gentle pulse pours and avoid overfilling near the seam channels.');
      break;
    case 'kono':
      notes.push('Keep the center focused early, then widen only slightly to preserve sweetness.');
      break;
    case 'v60':
    default:
      notes.push('Use concentric pours with controlled agitation; avoid late-stage turbulence.');
      break;
  }
  return notes;
}

function deriveServicePattern(plan: BrewPlan) {
  const target = plan.targetProfileLabel.toLowerCase();
  const softWater = /soft|low/i.test(plan.waterMinerals.styleLabel);
  const hardWater = /hard|buffer/i.test(plan.waterMinerals.styleLabel);
  const beanFragile = plan.beanProfile.active
    && (plan.beanProfile.solubility === 'low' || plan.beanProfile.roastDevelopment === 'underdeveloped');
  const beanDense = plan.beanProfile.active
    && (plan.beanProfile.solubility === 'high' || plan.beanProfile.roastDevelopment === 'developed');
  const targetLabel = target.includes('acidity')
    ? 'Acidity'
    : target.includes('body')
      ? 'Body'
      : target.includes('sweetness')
        ? 'Sweetness'
        : 'Balanced';

  const methodPattern = (() => {
    switch (plan.methodFamily) {
      case 'kalita_wave':
      case 'april':
      case 'melitta':
        return {
          name: 'Flat-Bed Ladder',
          actions: [
            'wide and even wetting with low-spout control',
            'short stable pulses to preserve a flat bed',
            'quiet close with center lock before drawdown',
          ],
        };
      case 'clever_dripper':
        return {
          name: 'Immersion Release Control',
          actions: [
            'full saturation then calm hold during immersion',
            'minimal agitation while maintaining slurry temperature',
            'clean release timing with stable outflow finish',
          ],
        };
      case 'chemex':
        return {
          name: 'Thick-Filter Drawdown',
          actions: [
            'thorough wetting while keeping turbulence restrained',
            'steady mid-pour to avoid filter wall bypass',
            'gentle final pour with no aggressive swirl',
          ],
        };
      case 'origami':
      case 'kono':
      case 'v60':
      default:
        return {
          name: 'Cone Clarity Arc',
          actions: [
            'fast center wetting with clean bloom expansion',
            'controlled concentric pulses with stable bed height',
            'narrow finishing stream and immediate bed settle',
          ],
        };
    }
  })();

  const targetOverlay = plan.methodFamily === 'clever_dripper'
    ? (target.includes('acidity')
      ? [
        'keep early turbulence low for clarity lift',
        'protect clean acidity with a restrained hold window',
        'avoid late agitation during release to prevent harsh finish',
      ]
      : target.includes('body')
        ? [
          'hold full saturation longer to build extraction depth',
          'extend middle contact slightly for body retention',
          'finish with steady release depth to avoid hollow cups',
        ]
        : target.includes('sweetness')
          ? [
            'focus on uniform saturation for sugar development',
            'keep immersion tempo stable to build syrupy center',
            'close quietly to preserve sweetness and roundness',
          ]
        : [
            'prioritize repeatable saturation and contact',
            'maintain consistent mid-brew immersion flow',
            'finish calmly to keep clarity and sweetness aligned',
          ])
    : target.includes('acidity')
      ? [
        'keep early turbulence low for clarity lift',
        'protect clean acidity with short pulse windows',
        'avoid late agitation to prevent harsh finish',
      ]
      : target.includes('body')
        ? [
          'hold bloom saturation longer to build extraction depth',
          'extend middle contact slightly for body retention',
          'finish with steady depth to avoid hollow cups',
        ]
        : target.includes('sweetness')
          ? [
            'focus on uniform wetting for sugar development',
            'keep pulse tempo stable to build syrupy center',
            'close quietly to preserve sweetness and roundness',
          ]
        : [
            'prioritize repeatable bloom expansion',
            'maintain consistent mid-brew flow',
            'finish calmly to keep clarity and sweetness aligned',
          ];

  const sequenceName = `${targetLabel} ${methodPattern.name} for ${plan.dripper.name}`;
  const rhythmOverlay = plan.methodFamily === 'clever_dripper'
    ? (beanFragile
      ? [
        'keep immersion entry gentle to avoid sharp extraction spikes',
        'hold a calm contact transition to protect sweetness',
        'close softly and avoid aggressive release turbulence',
      ]
      : beanDense
        ? [
          'make early saturation complete to unlock denser soluble layers',
          'sustain mid-brew contact slightly longer before draining',
          'close with deliberate release to avoid underdeveloped finish',
        ]
        : [
          'keep early saturation complete and repeatable',
          'hold mid-brew contact stable through the immersion phase',
          'close with controlled release and minimal disturbance',
        ])
    : beanFragile
      ? [
        'keep pulse entry gentle to avoid sharp extraction spikes',
        'hold a calm stream transition to protect sweetness',
        'close softly and avoid aggressive final turbulence',
      ]
      : beanDense
        ? [
          'push early wetting complete to unlock denser soluble layers',
          'sustain mid-brew contact slightly longer before settling',
          'close with deliberate flow to avoid underdeveloped finish',
        ]
        : [
          'keep early wetting complete and repeatable',
          'hold mid-brew flow stable through each pulse',
          'close with controlled flow and minimal disturbance',
        ];
  const waterOverlay = plan.methodFamily === 'clever_dripper'
    ? (softWater
      ? [
        'keep contact calm to prevent over-bright edge',
        'avoid abrupt agitation in the middle phase',
        'finish with low turbulence before release drawdown',
      ]
      : hardWater
        ? [
          'keep contact steady longer to resist flat buffering',
          'limit unnecessary stirring that can mute clarity',
          'finish with focused release to keep structure alive',
        ]
        : [
          'maintain stable immersion contact for balance',
          'hold the contact windows even from step to step',
          'finish with calm release and no late swirl',
        ])
    : softWater
      ? [
        'use narrower stream width to prevent over-bright edge',
        'avoid abrupt kettle acceleration in the middle phase',
        'finish with low turbulence before drawdown',
      ]
      : hardWater
        ? [
          'keep center-lock longer to resist flat buffering',
          'limit wide-ring pours that mute clarity',
          'finish with focused stream to keep structure alive',
        ]
        : [
          'maintain centered-to-mid flow arc for stability',
          'hold pulse windows even from step to step',
          'finish with calm bed leveling and no late swirl',
        ];
  const phaseTemplates = plan.methodFamily === 'clever_dripper'
    ? [
      'calibrate entry contact and wet grounds evenly without agitation shock',
      'stabilize slurry contact before the next hold checkpoint',
      'protect immersion tempo while keeping extraction repeatable',
      'tighten release readiness and protect drawdown momentum',
      'settle bed quietly and lock final extraction before release ends',
    ]
    : [
      'calibrate entry flow and wet grounds edge-to-edge without channel shock',
      'stabilize slurry height before opening the next pulse window',
      'push center-to-mid pour arc while keeping extraction tempo repeatable',
      'tighten stream focus and protect drawdown momentum',
      'settle bed quietly and lock final extraction before drawdown ends',
    ];
  const variantSeed = `${plan.methodFamily}|${plan.targetProfileLabel}|${plan.brewMode}|${plan.waterMinerals.styleLabel}|${plan.beanProfile.summary || ''}`
    .split('')
    .reduce((total, char) => total + char.charCodeAt(0), 0);
  const pickVariant = (items: string[], index: number) => {
    if (items.length === 0) return '';
    return items[(variantSeed + index) % items.length];
  };
  const methodPhaseActions = (() => {
    switch (plan.methodFamily) {
      case 'clever_dripper':
        return {
          entry: [
            'immerse all grounds evenly, then hold contact without stirring',
            'open with full immersion contact and keep slurry calm before the hold window',
            'saturate fully, then keep immersion still to stabilize extraction entry',
          ],
          middle: [
            'maintain immersion contact time and avoid agitation spikes between checkpoints',
            'keep slurry temperature stable while preserving clean immersion cadence',
            'hold immersion quietly and prepare a clean finishing window',
          ],
          final: [
            'trigger release cleanly and let outflow finish without turbulence',
            'open release timing deliberately, then drain to a quiet finish',
            'close with controlled release and no extra agitation during drain',
          ],
        };
      case 'chemex':
        return {
          entry: [
            'wet all grounds while keeping filter wall bypass under control',
            'open with steady center wetting and no abrupt filter wall turbulence',
            'saturate cleanly while protecting thick-filter flow stability',
          ],
          middle: [
            'hold steady stream height and keep bypass risk low through the filter wall',
            'run controlled pulses to maintain drawdown speed through thick filter resistance',
            'maintain flow continuity and avoid aggressive wall wash in mid extraction',
          ],
          final: [
            'tighten stream and settle bed gently before final drawdown',
            'finish with low-turbulence flow so thick-filter drawdown stays consistent',
            'close quietly and protect final drawdown clarity through the filter',
          ],
        };
      case 'kalita_wave':
      case 'april':
      case 'melitta':
        return {
          entry: [
            'open with low-spout wetting to set a flat and even bed',
            'start with broad but gentle wetting so flat-bed height stays stable',
            'build entry saturation evenly to prevent flat-bed channeling',
          ],
          middle: [
            'keep short pulse cadence and protect flat-bed height between pours',
            'maintain low-spout pulses so bed height and flow stay even',
            'run controlled center pulses and keep flat-bed surface calm',
          ],
          final: [
            'tighten final pulse and level bed quietly before drawdown',
            'close with gentle leveling so flat-bed extraction ends evenly',
            'finish with calm stream and lock even bed settlement',
          ],
        };
      case 'origami':
      case 'kono':
      case 'v60':
      default:
        return {
          entry: [
            'open with centered wetting and controlled bloom turbulence',
            'start with clean center saturation before widening pour path',
            'build bloom contact quickly while keeping entry flow controlled',
          ],
          middle: [
            'maintain concentric pulse cadence and stable slurry height',
            'hold center-to-mid stream arc to keep percolation tempo repeatable',
            'run even pulse windows and keep bed height stable through the middle',
          ],
          final: [
            'narrow stream and level bed softly before drawdown close',
            'close with calm settling so final drawdown stays clean',
            'finish with low-turbulence flow and lock bed settlement',
          ],
        };
    }
  })();
  const hasStepLabel = (step: BrewPlan['steps'][number], pattern: RegExp) => pattern.test(step.label.toLowerCase());
  const stepActions = plan.steps.map((step, index) => {
    const isFirst = index === 0;
    const isFinal = index === plan.steps.length - 1;
    const phaseKey = isFirst ? 'entry' : isFinal ? 'final' : 'middle';
    const position = plan.steps.length > 1 ? index / (plan.steps.length - 1) : 0;
    const phaseIndex = Math.min(phaseTemplates.length - 1, Math.round(position * (phaseTemplates.length - 1)));
    const methodCue = methodPattern.actions[Math.min(index, methodPattern.actions.length - 1)];
    const methodPhaseCue = pickVariant(methodPhaseActions[phaseKey], index);
    const targetCue = targetOverlay[Math.min(index, targetOverlay.length - 1)];
    const rhythmCue = rhythmOverlay[Math.min(index, rhythmOverlay.length - 1)];
    const waterCueDetail = waterOverlay[Math.min(index, waterOverlay.length - 1)];
    const stepKind = step.kind || 'pour';
    const stageCue = (() => {
      if (stepKind === 'release' || stepKind === 'drawdown' || stepKind === 'serve' || hasStepLabel(step, /release|finish|final|drawdown|close|serve|filter/)) {
        return 'close with calm turbulence to protect aftertaste';
      }
      if (stepKind === 'press') return 'press with steady pressure and avoid stirring fines into the cup';
      if (stepKind === 'heat') return 'hold heat steady and avoid harsh acceleration';
      if (stepKind === 'extract') return 'track yield and flow instead of extending a harsh extraction';
      if (hasStepLabel(step, /bloom|wet/)) return 'build full bloom saturation before progressing';
      if (hasStepLabel(step, /pulse|middle|main/)) return 'hold pulse cadence and avoid abrupt kettle acceleration';
      return phaseTemplates[phaseIndex];
    })();
    return `${methodCue}; ${methodPhaseCue}; ${stageCue}; ${targetCue}; ${rhythmCue}; ${waterCueDetail}`;
  });
  const waterCue = softWater
    ? 'Water is soft/low-buffer, so keep agitation moderate to avoid sharp edges.'
    : hardWater
      ? 'Water is buffered, so keep flow focused to avoid flattening the cup.'
      : 'Water is balanced, so prioritize repeatable pour tempo.';
  const modeCue = plan.brewMode === 'iced'
    ? `Iced mode active: front-load extraction and keep pour windows compact before dilution; lock split at ${plan.hotWaterMl} ml hot / ${plan.iceMl} ml ice.`
    : 'Hot mode active: preserve thermal stability and hit each checkpoint on time.';

  return {
    sequenceName,
    stepActions,
    waterCue,
    modeCue,
  };
}

function getContextControlPoints(plan: BrewPlan) {
  const points: string[] = [];
  const target = plan.targetProfileLabel.toLowerCase();
  const softWater = /soft|low/i.test(plan.waterMinerals.styleLabel);
  const bufferedWater = /hard|buffer/i.test(plan.waterMinerals.styleLabel);

  if (target.includes('acidity')) {
    points.push('Prioritize cleaner early flow and avoid over-agitation after the midpoint.');
  } else if (target.includes('body')) {
    points.push('Keep slurry depth stable and avoid stalling between pulses to preserve body.');
  } else if (target.includes('sweetness')) {
    points.push('Keep the bed calm late in the brew to lock in sweetness and avoid bitterness.');
  } else {
    points.push('Balance clarity and sweetness by holding consistent center-to-mid pour paths.');
  }

  if (target.includes('acidity') && bufferedWater) {
    points.push('Buffered water will mute this acidity target; for the best next cup, use lower-alkalinity brew water or manual minerals before pushing temperature higher.');
  } else if (target.includes('body') && softWater) {
    points.push('Softer water can thin this body target; for the best next cup, raise hardness slightly or reduce agitation before changing ratio.');
  } else if (!softWater && !bufferedWater) {
    points.push('Water profile is balanced, so prioritize repeatable flow and stable drawdown rhythm.');
  }

  if (plan.beanProfile.active) {
    points.push(`Bean profile active (${plan.beanProfile.summary}); keep midpoint extraction checks tighter than usual.`);
  }
  return points;
}

function getSourFix(plan: BrewPlan) {
  if (plan.grindBias === 'coarser') {
    return 'Tighten grind by 0.5-1 step, keep temperature fixed, and repeat the same pour map.';
  }
  if (plan.targetProfileLabel.toLowerCase().includes('acidity')) {
    return 'Keep ratio fixed and add one slightly longer mid-pour pulse before final leveling.';
  }
  return 'Raise temperature by 1 C first while preserving dose, ratio, and timing.';
}

function getBitterFix(plan: BrewPlan) {
  if (plan.grindBias === 'finer') {
    return 'Coarsen grind by 0.5-1 step, then keep the same pulse timing and total water.';
  }
  if (plan.targetProfileLabel.toLowerCase().includes('body')) {
    return 'Lower final-pour intensity and keep end-bed agitation minimal on the next cup.';
  }
  return 'Lower temperature by 1 C first and keep grind unchanged for the next cup.';
}

export function buildDeterministicNarrative(plan: BrewPlan, mode: AiBrewNarrativeMode): string {
  const servicePattern = deriveServicePattern(plan);
  const stepLines = plan.steps.map((step, index) => {
    const stepCue = servicePattern.stepActions[Math.min(index, servicePattern.stepActions.length - 1)];
    const contextPatch = buildStepContextAnchorPatch(plan, index, plan.steps.length);
    return `${index + 1}. ${step.label} at ${formatSeconds(step.startSeconds)}: ${formatStepOperation(step)} ${stepCue}; ${contextPatch}. ${step.note}`;
  });
  const techniqueNotes = collectTechniqueNotes(plan);
  const sourFix = getSourFix(plan);
  const bitterFix = getBitterFix(plan);
  const controlPoints = getContextControlPoints(plan);
  const watchBullets = dedupeBulletLines([
    servicePattern.waterCue,
    ...techniqueNotes,
    ...controlPoints,
  ]);

  if (mode === 'generate') {
    const ratioLine = plan.brewMode === 'iced'
      ? `final ratio 1:${plan.finalBeverageRatio} with a hot concentrate at 1:${plan.hotExtractionRatio}`
      : `ratio 1:${plan.recommendedRatio}`;
    return [
      '## Why It Fits',
      `This plan targets ${plan.targetProfileLabel.toLowerCase()} with ${plan.dripper.name} using ${ratioLine} at ${plan.waterTempC} C and a ${formatSeconds(plan.totalTimeSeconds)} service window. The sequence is anchored to deterministic water split (${plan.hotWaterMl} ml hot${plan.iceMl > 0 ? ` / ${plan.iceMl} ml ice` : ''}) and grinder bias (${plan.grindBias}) for repeatable extraction.`,
      '## Focus',
      `- Execute each pour at its planned timestamp; do not shift total hot water beyond ${plan.hotWaterMl} ml.`,
      '- Track drawdown behavior and keep adjustments micro: grind step, 1 C temperature, or minor center-pour flow change.',
    ].join('\n');
  }

  if (mode === 'sop') {
    return [
      '## Quick Dial',
      `- dose: ${plan.doseG} g`,
      `- final ratio: 1:${plan.finalBeverageRatio}${plan.iceMl > 0 ? `; hot concentrate: 1:${plan.hotExtractionRatio}` : ''}`,
      `- total water: ${plan.totalWaterMl} ml (${plan.hotWaterMl} ml hot${plan.iceMl > 0 ? ` / ${plan.iceMl} ml ice` : ''})`,
      `- temperature: ${plan.waterTempC} C`,
      `- grind: ${plan.grindRecommendation}`,
      `- total time: ${formatSeconds(plan.totalTimeSeconds)}`,
      '## Service Pattern',
      `- ${servicePattern.sequenceName}`,
      `- ${servicePattern.modeCue}`,
      '## Steps',
      ...stepLines,
      '## Control Points',
      `- ${servicePattern.waterCue}`,
      `- Keep cumulative water aligned with step targets; final hot water must land at ${plan.hotWaterMl} ml.`,
      ...controlPoints.slice(0, 2).map((point) => `- ${point}`),
      `- If cup is sour: ${sourFix}`,
      `- If cup is bitter: ${bitterFix}`,
    ].join('\n');
  }

  return [
    '## Service Pattern',
    `- ${servicePattern.sequenceName}`,
    `- ${servicePattern.modeCue}`,
    '## Sequence',
    ...stepLines,
    '## Watch',
    ...watchBullets.map((bullet) => `- ${bullet}`),
    `- Keep final envelope locked: dose ${plan.doseG} g, final ratio 1:${plan.finalBeverageRatio}${plan.iceMl > 0 ? `, hot concentrate 1:${plan.hotExtractionRatio}` : ''}, water ${plan.totalWaterMl} ml (${plan.hotWaterMl} ml hot${plan.iceMl > 0 ? ` / ${plan.iceMl} ml ice` : ''}), temp ${plan.waterTempC} C, brew time ${formatSeconds(plan.totalTimeSeconds)}.`
  ].join('\n');
}

function validateHeadingStructure(normalized: string, mode: AiBrewNarrativeMode, errors: string[]) {
  const requires: Record<AiBrewNarrativeMode, string[]> = {
    generate: ['## Why It Fits', '## Focus'],
    sequence: ['## Service Pattern', '## Sequence', '## Watch'],
    sop: ['## Quick Dial', '## Service Pattern', '## Steps', '## Control Points'],
  };
  for (const heading of requires[mode]) {
    if (!normalized.includes(heading)) {
      errors.push(`Missing required heading: ${heading}.`);
    }
  }
}

function validateHeadingOrder(normalized: string, mode: AiBrewNarrativeMode, errors: string[]) {
  const requiredOrder: Record<AiBrewNarrativeMode, string[]> = {
    generate: ['## Why It Fits', '## Focus'],
    sequence: ['## Service Pattern', '## Sequence', '## Watch'],
    sop: ['## Quick Dial', '## Service Pattern', '## Steps', '## Control Points'],
  };
  let cursor = -1;
  for (const heading of requiredOrder[mode]) {
    const found = normalized.indexOf(heading);
    if (found === -1) continue;
    if (found < cursor) {
      errors.push(`Heading order is invalid around "${heading}".`);
      return;
    }
    cursor = found;
  }
}

function validatePlaceholders(normalized: string, errors: string[]) {
  const banned = [
    /\.\.\./i,
    /\b(lorem ipsum|tbd|todo)\b/i,
    /\b(as needed|etc\.?)\b/i,
    /\bplaceholder\b/i,
    /\b(adjust to taste|feel free|optional step)\b/i,
    /\b(do what feels right|keep it flexible)\b/i,
    /\b(insert|replace)\s+\[[^\]]+\]/i,
  ];
  if (banned.some((pattern) => pattern.test(normalized))) {
    errors.push('Contains placeholder or non-executable wording.');
  }
}

function validateForbiddenInstructions(normalized: string, errors: string[]) {
  const forbidden = [
    /\b(espresso machine|portafilter|steam wand|backflush)\b/i,
    /\b(pressure\s*\d+\s*bar)\b/i,
    /\b(boil(ed)?\s+water\s+to\s+\d{3,})\b/i,
    /\b(skip\s+to\s+the\s+next\s+step\s+if\s+needed)\b/i,
    /\b(use\s+any\s+ratio\s+you\s+like)\b/i,
    /\b(ask\s+the\s+manager|call\s+support|check\s+the\s+manual)\b/i,
    /\b(skip\s+this\s+step)\b/i,
    /\b(ignore\s+(the\s+)?planned\s+step)\b/i,
    /\b(simulate|pretend|imagine)\s+(the\s+)?(?:brew|pour|step|result)\b/i,
    /\bhypothetical\b/i,
    STEP_POST_BREW_DILUTION_PATTERN,
  ];
  if (forbidden.some((pattern) => pattern.test(normalized))) {
    errors.push('Contains instructions that do not match manual-brew workflow.');
  }
}

function validateNumericEnvelope(
  plan: BrewPlan,
  mode: AiBrewNarrativeMode,
  normalized: string,
  errors: string[],
  warnings: string[],
) {
  const ratioMatches = normalized
    .split('\n')
    .filter((line) => /\bratio\b|\bwater\s*:\s*coffee\b/i.test(line))
    .flatMap((line) => [...line.matchAll(/\b1\s*:\s*(\d+(?:\.\d+)?)\b/gi)].map((match) => ({ match, line })));
  for (const { match, line } of ratioMatches) {
    const ratio = Number.parseFloat(match[1]);
    if (!Number.isFinite(ratio)) continue;
    const acceptsHotExtractionRatio = plan.brewMode === 'iced'
      && /\b(hot|concentrate|extraction|panas|konsentrat)\b/i.test(line)
      && Math.abs(ratio - plan.hotExtractionRatio) <= 0.25;
    const acceptsFinalRatio = Math.abs(ratio - plan.finalBeverageRatio) <= 0.25;
    if (!acceptsHotExtractionRatio && !acceptsFinalRatio) {
      errors.push(`Ratio ${ratio} is outside deterministic envelope final 1:${plan.finalBeverageRatio}${plan.brewMode === 'iced' ? ` / hot 1:${plan.hotExtractionRatio}` : ''}.`);
      break;
    }
  }

  const tempMatches = normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:c|\u00b0c|\u2103)\b/gi);
  for (const item of tempMatches) {
    const matchStart = item.index ?? 0;
    const matchEnd = matchStart + item[0].length;
    const context = normalized.slice(Math.max(0, matchStart - 20), Math.min(normalized.length, matchEnd + 24));
    if (RELATIVE_VALUE_CONTEXT_PATTERN.test(context)) continue;
    const value = Number.parseFloat(item[1]);
    if (!Number.isFinite(value)) continue;
    if (Math.abs(value - plan.waterTempC) > 1.5) {
      errors.push(`Temperature ${value} C is outside deterministic envelope ${plan.waterTempC} C.`);
      break;
    }
  }

  const volumeMatches = normalized.matchAll(/(\d+(?:\.\d+)?)\s*ml\b/gi);
  const upperVolume = Math.max(plan.totalWaterMl + 10, plan.totalWaterMl * 1.08);
  for (const item of volumeMatches) {
    const value = Number.parseFloat(item[1]);
    if (!Number.isFinite(value)) continue;
    if (value > upperVolume) {
      errors.push(`Volume ${value} ml exceeds deterministic envelope max ${Math.round(upperVolume)} ml.`);
      break;
    }
  }

  const timeMatches = mode === 'generate'
    ? []
    : getStepSectionLines(mode, normalized)
      .flatMap((line) => [...line.matchAll(/\b(\d{1,2}):([0-5]\d)\b/g)]);
  if (timeMatches.length > 1) {
    let last = -1;
    for (const match of timeMatches) {
      const total = Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
      if (total < last) {
        errors.push('Found non-monotonic step timing order.');
        break;
      }
      last = total;
    }
    const final = Number.parseInt(timeMatches[timeMatches.length - 1][1], 10) * 60
      + Number.parseInt(timeMatches[timeMatches.length - 1][2], 10);
    if (Math.abs(final - plan.totalTimeSeconds) > 45) {
      warnings.push('Final referenced time is far from deterministic total brew time.');
    }
  }
}

function validateStepCoverage(plan: BrewPlan, normalized: string, mode: AiBrewNarrativeMode, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  if (numberedSteps.length < plan.steps.length) {
    errors.push(`Instruction steps are incomplete: expected at least ${plan.steps.length}, got ${numberedSteps.length}.`);
    return;
  }
  if (numberedSteps.length > plan.steps.length) {
    errors.push(`Instruction steps exceed deterministic sequence: expected ${plan.steps.length}, got ${numberedSteps.length}.`);
    return;
  }
  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index];
    const line = numberedSteps[index] || '';
    const stepName = step.label.toLowerCase();
    const stepTime = formatSeconds(step.startSeconds);
    const hasReference = line.toLowerCase().includes(stepName) || line.includes(stepTime);
    if (!hasReference) {
      errors.push(`Step ${index + 1} does not reference deterministic step "${step.label}" (${stepTime}).`);
      break;
    }
  }
}

function validateStepLabelContinuity(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  for (let index = 0; index < Math.min(numberedSteps.length, plan.steps.length); index += 1) {
    const line = numberedSteps[index].toLowerCase();
    const expectedLabel = plan.steps[index]?.label.toLowerCase();
    if (!expectedLabel) continue;
    if (line.includes(expectedLabel)) continue;

    const conflicting = plan.steps
      .filter((_, stepIndex) => stepIndex !== index)
      .find((step) => line.includes(step.label.toLowerCase()));
    if (conflicting) {
      errors.push(
        `Step ${index + 1} references "${conflicting.label}" but must follow deterministic label "${plan.steps[index].label}".`,
      );
      return;
    }

    errors.push(`Step ${index + 1} must reference deterministic step label "${plan.steps[index].label}".`);
    return;
  }
}

function validateStepNumbering(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  for (let index = 0; index < Math.min(numberedSteps.length, plan.steps.length); index += 1) {
    const line = numberedSteps[index];
    const match = line.match(/^(\d+)\./);
    const expected = index + 1;
    if (!match || Number.parseInt(match[1], 10) !== expected) {
      errors.push(`Sequence numbering is invalid at step ${expected}.`);
      return;
    }
  }
}

function validateStepExecutionLanguage(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  for (let index = 0; index < numberedSteps.length; index += 1) {
    const line = numberedSteps[index];
    const expectedKind = plan.steps[index]?.kind || 'pour';
    const verbs = collectActionVerbs(line);
    if (expectedKind === 'pour' && !verbs.includes('pour')) {
      errors.push(`Step must include deterministic pour action: "${line}".`);
      break;
    }
    if (expectedKind !== 'pour' && !verbs.some((verb) => ['wait', 'hold', 'release', 'drawdown', 'drain', 'steep'].includes(verb))) {
      errors.push(`Step must include deterministic ${expectedKind} action: "${line}".`);
      break;
    }
    const controlVerbs = collectActionVerbs(extractStepTailAfterCheckpoint(line)).filter((verb) => verb !== 'pour');
    if (controlVerbs.length === 0) {
      errors.push(`Step must include a post-pour control action or post-checkpoint action (wait/hold/level/release/etc): "${line}".`);
      break;
    }
  }
}

function validateStepInRunOnlyInstructions(mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  for (let index = 0; index < stepLines.length; index += 1) {
    const line = stepLines[index];
    if (STEP_OUT_OF_RUN_ADVICE_PATTERN.test(line)) {
      errors.push(`Step ${index + 1} contains next-cup troubleshooting guidance; operational steps must be executable in-run and immediate.`);
      return;
    }
  }
}
function validateStepParameterShiftInstructions(mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  for (const line of stepLines) {
    const lowered = line.toLowerCase();
    if (STEP_PARAMETER_SHIFT_VERB_PATTERN.test(lowered) && STEP_PARAMETER_SHIFT_TARGET_PATTERN.test(lowered)) {
      errors.push(`Step contains mid-brew parameter shift instruction that is not executable in-run: "${line}".`);
      return;
    }
  }
}

function validateStepEnvelopeCoverage(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index];
    const line = numberedSteps[index] || '';
    const pourPattern = new RegExp('\\b' + escapeRegExp(String(step.pourVolumeMl)) + '\\s*ml\\b', 'i');
    const targetPattern = new RegExp('\\b' + escapeRegExp(String(step.targetVolumeMl)) + '\\s*ml\\b', 'i');
    if ((step.kind || 'pour') === 'pour' && (!pourPattern.test(line) || !targetPattern.test(line))) {
      errors.push('Step [' + step.label + '] must include deterministic pour volume and cumulative target volume.');
      return;
    }
    if (!targetPattern.test(line)) {
      errors.push('Step [' + step.label + '] must include deterministic cumulative target volume.');
      return;
    }
  }
}

function validateStepCanonicalPrefix(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  for (let index = 0; index < Math.min(stepLines.length, plan.steps.length); index += 1) {
    const step = plan.steps[index];
    const line = stepLines[index];
    const expectedTime = formatSeconds(step.startSeconds);
    const [minutePart, secondPart] = expectedTime.split(':');
    const minuteValue = Number.parseInt(minutePart || '0', 10);
    const minutePattern = minuteValue < 10 ? `(?:0?${minuteValue})` : escapeRegExp(String(minuteValue));
    const secondPattern = escapeRegExp(secondPart || '00');
    const prefixPattern = new RegExp(
      '^' + (index + 1)
        + '\\.\\s+'
        + escapeRegExp(step.label)
        + '\\s+at\\s+'
        + minutePattern
        + ':'
        + secondPattern
        + ':\\s+'
        + escapeRegExp(formatStepOperation(step))
        + '\\b',
      'i',
    );
    if (!prefixPattern.test(line)) {
      errors.push(`Step ${index + 1} must start with deterministic canonical prefix "${step.label} at ${expectedTime}: ${formatStepOperation(step)}".`);
      return;
    }
  }
}
function validateStepCheckpointIntegrity(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  for (let index = 0; index < Math.min(numberedSteps.length, plan.steps.length); index += 1) {
    const line = numberedSteps[index];
    const expected = plan.steps[index];
    const pourMatches = Array.from(line.matchAll(/\bpour\s+(\d+(?:\.\d+)?)\s*ml\b/gi));
    const targetMatches = Array.from(line.matchAll(/\b(?:to|reach|target)\s+(\d+(?:\.\d+)?)\s*ml\b/gi));

    if (pourMatches.length > 1) {
      errors.push(`Step ${index + 1} contains multiple pour checkpoints; keep exactly one deterministic pour volume per step.`);
      return;
    }
    if (targetMatches.length > 1) {
      errors.push(`Step ${index + 1} contains multiple cumulative target checkpoints; keep exactly one deterministic target volume per step.`);
      return;
    }

    if ((expected.kind || 'pour') !== 'pour' && pourMatches.length > 0) {
      errors.push(`Step ${index + 1} is a ${expected.kind} checkpoint and must not introduce a pour volume.`);
      return;
    }
    if (pourMatches.length === 1) {
      const pourValue = Number.parseFloat(pourMatches[0][1]);
      if (Number.isFinite(pourValue) && Math.abs(pourValue - expected.pourVolumeMl) > 2) {
        errors.push(`Step ${index + 1} pour volume ${pourValue} ml must match deterministic checkpoint ${expected.pourVolumeMl} ml.`);
        return;
      }
    }
    if (targetMatches.length === 1) {
      const targetValue = Number.parseFloat(targetMatches[0][1]);
      if (Number.isFinite(targetValue) && Math.abs(targetValue - expected.targetVolumeMl) > 2) {
        errors.push(`Step ${index + 1} cumulative target ${targetValue} ml must match deterministic checkpoint ${expected.targetVolumeMl} ml.`);
        return;
      }
    }
  }
}

function validateStepCumulativeTargets(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  let previousTarget = -1;

  for (let index = 0; index < Math.min(numberedSteps.length, plan.steps.length); index += 1) {
    const line = numberedSteps[index];
    const expected = plan.steps[index];
    const targetMatch = line.match(/\b(?:to|reach|target)\s+(\d+(?:\.\d+)?)\s*ml\b/i);
    if (!targetMatch) {
      errors.push(`Step ${index + 1} is missing cumulative volume checkpoint.`);
      return;
    }
    const target = Number.parseFloat(targetMatch[1]);
    if (!Number.isFinite(target)) continue;
    if (target < previousTarget) {
      errors.push(`Step ${index + 1} cumulative volume is not monotonic.`);
      return;
    }
    if (Math.abs(target - expected.targetVolumeMl) > 6) {
      errors.push(`Step ${index + 1} cumulative volume ${target} ml drifts from deterministic checkpoint ${expected.targetVolumeMl} ml.`);
      return;
    }
    previousTarget = target;
  }

  if (previousTarget >= 0 && Math.abs(previousTarget - plan.hotWaterMl) > 6) {
    errors.push(`Final cumulative hot water ${previousTarget} ml must match deterministic envelope ${plan.hotWaterMl} ml.`);
  }
}

function validateStepTimeline(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  let previous = -1;
  let previousExpected = -1;
  for (let index = 0; index < Math.min(numberedSteps.length, plan.steps.length); index += 1) {
    const line = numberedSteps[index];
    const match = line.match(/\b(\d{1,2}):([0-5]\d)\b/);
    if (!match) {
      errors.push(`Step ${index + 1} is missing timing reference.`);
      return;
    }
    const total = Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
    if (total < previous) {
      errors.push('Found non-monotonic step timing order.');
      return;
    }
    const expected = plan.steps[index]?.startSeconds;
    if (typeof expected === 'number' && Math.abs(total - expected) > 20) {
      errors.push(`Step ${index + 1} time ${formatSeconds(total)} drifts from deterministic checkpoint ${formatSeconds(expected)}.`);
      return;
    }
    if (typeof expected === 'number' && previous >= 0 && previousExpected >= 0) {
      const expectedGap = expected - previousExpected;
      const actualGap = total - previous;
      if (Math.abs(actualGap - expectedGap) > 22) {
        errors.push(`Step ${index + 1} cadence gap ${actualGap}s drifts from deterministic tempo ${expectedGap}s.`);
        return;
      }
    }
    previous = total;
    previousExpected = typeof expected === 'number' ? expected : previousExpected;
  }
}

function validateStepAdditionalClockTimes(mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  for (let index = 0; index < numberedSteps.length; index += 1) {
    const line = numberedSteps[index];
    if (extractClockTimesInSeconds(line).length > 1) {
      errors.push(`Step ${index + 1} includes extra absolute clock time beyond the deterministic prefix; keep only one MM:SS timestamp per step and use relative hold durations.`);
      return;
    }
  }
}

function validateChemistryAnchors(plan: BrewPlan, normalized: string, errors: string[]) {
  const checks = [
    {
      label: 'TDS',
      expected: plan.waterMinerals.tdsPpm,
      pattern: /\btds\b[^\d\n]{0,16}(\d+(?:\.\d+)?)/gi,
    },
    {
      label: 'hardness/GH',
      expected: plan.waterMinerals.hardnessPpm,
      pattern: /\b(?:hardness|gh)\b[^\d\n]{0,16}(\d+(?:\.\d+)?)/gi,
    },
    {
      label: 'alkalinity/KH',
      expected: plan.waterMinerals.alkalinityPpm,
      pattern: /\b(?:alkalinity|kh)\b[^\d\n]{0,16}(\d+(?:\.\d+)?)/gi,
    },
  ] as const;

  for (const check of checks) {
    const matches = normalized.matchAll(check.pattern);
    for (const match of matches) {
      const value = Number.parseFloat(match[1]);
      if (!Number.isFinite(value)) continue;
      if (Math.abs(value - check.expected) > 15) {
        errors.push(`${check.label} value ${value} is outside deterministic water envelope ${check.expected}.`);
        return;
      }
    }
  }
}

function validateModeEnvelope(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  if (plan.brewMode === 'iced') {
    const hasHotValue = new RegExp(`\\b${escapeRegExp(String(plan.hotWaterMl))}\\s*ml\\b`, 'i').test(normalized);
    const hasIceValue = new RegExp(`\\b${escapeRegExp(String(plan.iceMl))}\\s*ml\\s*ice\\b`, 'i').test(normalized);
    const hasExplicitSplit = new RegExp(
      `(?:\\b${escapeRegExp(String(plan.hotWaterMl))}\\s*ml\\s*(?:hot|water)\\b[^\\n]*\\b${escapeRegExp(String(plan.iceMl))}\\s*ml\\s*ice\\b)|(?:\\b${escapeRegExp(String(plan.iceMl))}\\s*ml\\s*ice\\b[^\\n]*\\b${escapeRegExp(String(plan.hotWaterMl))}\\s*ml\\s*(?:hot|water)\\b)`,
      'i',
    ).test(normalized);

    if (plan.iceMl > 0 && (!hasHotValue || !hasIceValue || !hasExplicitSplit)) {
      errors.push(`Iced workflow must include deterministic split ${plan.hotWaterMl} ml hot / ${plan.iceMl} ml ice.`);
    }
    return;
  }

  const mentionsIceDose = /\b\d+(?:\.\d+)?\s*ml\s*(?:\/\s*g\s*)?ice\b/i.test(normalized);
  if (mentionsIceDose) {
    errors.push('Hot workflow must not add ice split instructions.');
  }
}

function validateStepActionDiversity(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  if (numberedSteps.length < 3 || plan.steps.length < 3) return;
  const uniqueSecondaryVerbs = new Set(
    numberedSteps.flatMap((line) => collectActionVerbs(extractStepTailAfterCheckpoint(line)).filter((verb) => verb !== 'pour')),
  );
  const uniqueVerbCount = uniqueSecondaryVerbs.size;
  if (uniqueVerbCount < 2) {
    errors.push('Sequence actions are too monotonous; use at least two different non-pour control verbs across steps.');
  }
}

function validateStepHoldDurations(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  if (stepLines.length < 1) return;

  const maxIndex = Math.min(stepLines.length, plan.steps.length);
  for (let index = 0; index < maxIndex; index += 1) {
    const line = stepLines[index];
    const deterministicGap = index < plan.steps.length - 1
      ? plan.steps[index + 1].startSeconds - plan.steps[index].startSeconds
      : Math.max(0, plan.totalTimeSeconds - plan.steps[index].startSeconds);
    if (!Number.isFinite(deterministicGap) || deterministicGap <= 0) continue;

    const durations = Array.from(line.matchAll(HOLD_DURATION_PATTERN))
      .map((match) => parseDurationSeconds(match[1], match[2]))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (durations.length === 0) continue;

    const maxDuration = Math.max(...durations);
    const totalDuration = durations.reduce((total, value) => total + value, 0);
    if (maxDuration > deterministicGap + 5) {
      errors.push(`Step ${index + 1} wait/hold duration ${maxDuration}s exceeds deterministic cadence gap ${deterministicGap}s.`);
      return;
    }
    if (totalDuration > deterministicGap + 5) {
      errors.push(`Step ${index + 1} combined wait/hold duration ${totalDuration}s exceeds deterministic cadence gap ${deterministicGap}s.`);
      return;
    }
  }
}

function validateStepPhaseControl(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  if (stepLines.length < 2) return;
  const firstLine = stepLines[0];
  if (!ENTRY_PHASE_CUE_PATTERN.test(firstLine)) {
    errors.push('Step 1 must include an entry-phase cue (bloom/wet/saturation/immersion contact).');
    return;
  }
  const finalLine = stepLines[stepLines.length - 1];
  if (!FINAL_PHASE_CUE_PATTERN.test(finalLine)) {
    errors.push('Final step must include closure cue (finish/drawdown/settle/release/level).');
    return;
  }
  if (stepLines.length > 2) {
    const middleLines = stepLines.slice(1, -1);
    const hasMidCue = middleLines.some((line) => MID_PHASE_CUE_PATTERN.test(line));
    if (!hasMidCue) {
      errors.push('Middle steps must include cadence-flow control cues (pulse/cadence/stream/bed-height control).');
    }
  }
}
function validateStepPhaseIntentConsistency(mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  if (stepLines.length < 2) return;
  const firstLine = stepLines[0];
  if (HARD_FINAL_PHASE_CUE_PATTERN.test(firstLine)) {
    errors.push('Step 1 contains closure-phase wording (finish/final/drawdown/release) that conflicts with entry intent.');
    return;
  }
  const finalLine = stepLines[stepLines.length - 1];
  if (HARD_ENTRY_PHASE_CUE_PATTERN.test(finalLine)) {
    errors.push('Final step contains entry-phase wording (bloom/initial saturation/immersion) that conflicts with closure intent.');
    return;
  }
  if (stepLines.length <= 2) return;
  for (let index = 1; index < stepLines.length - 1; index += 1) {
    const line = stepLines[index];
    const hasHardEntryCue = HARD_ENTRY_PHASE_CUE_PATTERN.test(line);
    const hasHardFinalCue = HARD_FINAL_PHASE_CUE_PATTERN.test(line);
    const hasMidCue = MID_PHASE_CUE_PATTERN.test(line);
    if ((hasHardEntryCue || hasHardFinalCue) && !hasMidCue) {
      errors.push('Middle step drifts from cadence-flow intent; keep middle steps focused on mid-phase control.');
      return;
    }
  }
}
function validateStepDeterminismLanguage(mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  for (const line of stepLines) {
    if (STEP_HEDGING_PATTERN.test(line) || STEP_APPROXIMATION_PATTERN.test(line) || STEP_FAKE_EXECUTION_PATTERN.test(line)) {
      errors.push(`Step contains ambiguous or non-deterministic wording that is not reproducible for service: "${line}".`);
      return;
    }
  }
}


function validateStepDilutionInstructions(mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  for (let index = 0; index < stepLines.length; index += 1) {
    const line = stepLines[index];
    if (STEP_POST_BREW_DILUTION_PATTERN.test(line)) {
      errors.push(`Step ${index + 1} injects post-brew dilution/top-up instruction (add/top-up/bypass water or ice), which breaks deterministic envelope execution.`);
      return;
    }
  }
}
function validateStepUnsupportedHardwareInstructions(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  for (let index = 0; index < stepLines.length; index += 1) {
    const line = stepLines[index];
    if (referencesUnsupportedHardware(plan, line)) {
      errors.push(`Step ${index + 1} references unsupported hardware/tooling (${line}); keep instructions executable on the selected brew setup only.`);
      return;
    }
    if (!RELEASE_HARDWARE_METHODS.has(plan.methodFamily) && STEP_NON_IMMERSION_RELEASE_HARDWARE_PATTERN.test(line)) {
      errors.push(`Step ${index + 1} references release hardware cues (valve/plunger/switch) that are not available on ${plan.dripper.name}.`);
      return;
    }
  }
}
function validateStepOpposingTasteCueMix(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  for (let index = 0; index < stepLines.length; index += 1) {
    const line = stepLines[index];
    if (hasOpposingTasteCueInSingleStep(plan, line)) {
      errors.push(`Step ${index + 1} mixes opposing taste-direction cues in one line; split or remove conflicting acidity/body intent.`);
      return;
    }
  }
}

function validateTargetIntentConsistency(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  if (stepLines.length < 2) return;

  const intent = resolveTargetIntent(plan);
  const requiredMentions = Math.min(2, stepLines.length);
  const positivePattern = TARGET_INTENT_POSITIVE_PATTERNS[intent];
  const conflictPattern = TARGET_INTENT_CONFLICT_PATTERNS[intent];

  const normalizedTails = stepLines.map((line) => normalizeTailForIntentValidation(plan, line));

  const positiveMentions = normalizedTails
    .filter((line) => positivePattern.test(line))
    .length;

  if (intent === 'balanced') {
    const acidityMentions = normalizedTails.filter((line) => TARGET_INTENT_POSITIVE_PATTERNS.acidity.test(line)).length;
    const bodyMentions = normalizedTails.filter((line) => TARGET_INTENT_POSITIVE_PATTERNS.body.test(line)).length;
    const sweetMentions = normalizedTails.filter((line) => TARGET_INTENT_POSITIVE_PATTERNS.sweetness.test(line)).length;

    if (bodyMentions >= requiredMentions && acidityMentions === 0 && sweetMentions === 0) {
      errors.push('Balanced target drifts into body-only language; include acidity/clarity or sweetness-balancing cues in operational steps.');
    }
    if (acidityMentions >= requiredMentions && bodyMentions === 0 && sweetMentions === 0) {
      errors.push('Balanced target drifts into acidity-only language; include body/sweetness-balancing cues in operational steps.');
    }
    return;
  }

  if (positiveMentions < requiredMentions) {
    errors.push(`Target profile intent (${intent}) is under-specified in operational steps; include at least ${requiredMentions} intent-specific control cues.`);
    return;
  }

  const conflictMentions = normalizedTails
    .filter((line) => conflictPattern.test(line))
    .length;

  if (conflictMentions >= requiredMentions) {
    errors.push(`Operational steps conflict with target profile intent (${intent}); remove opposite extraction cues.`);
  }
}

function validateExtractionPressureConsistency(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const profile = resolveExtractionPressureProfile(plan);
  if (profile === 'neutral_extraction') return;

  const stepLines = getStepSectionLines(mode, normalized);
  if (stepLines.length === 0) return;

  const conflictPattern = profile === 'resistant_extraction'
    ? RESISTANT_EXTRACTION_CONFLICT_PATTERN
    : EASY_EXTRACTION_CONFLICT_PATTERN;

  for (let index = 0; index < stepLines.length; index += 1) {
    const line = stepLines[index];
    if (conflictPattern.test(line)) {
      errors.push(`Step ${index + 1} conflicts with deterministic extraction pressure profile (${profile}); keep step intensity aligned to planner context.`);
      return;
    }
  }
}


function validateCadenceProfileConsistency(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;

  const profile = resolveCadenceProfile(plan);
  if (profile === 'even_cadence') return;

  const stepLines = getStepSectionLines(mode, normalized);
  if (stepLines.length < 2) return;

  const totalSlots = Math.max(1, stepLines.length - 1);
  const durationByStep = stepLines.map((line) =>
    Array.from(line.matchAll(HOLD_DURATION_PATTERN))
      .map((match) => parseDurationSeconds(match[1], match[2]))
      .filter((value): value is number => value !== null && value > 0)
      .reduce((sum, value) => sum + value, 0));

  const totalDuration = durationByStep.reduce((sum, value) => sum + value, 0);
  if (totalDuration >= 10) {
    const weightedCenter = durationByStep.reduce((sum, duration, index) => {
      const position = index / totalSlots;
      return sum + duration * position;
    }, 0) / totalDuration;

    if (profile === 'front_cadence' && weightedCenter > 0.6) {
      errors.push('Step hold/wait durations are concentrated too late for deterministic cadence profile (front_cadence).');
      return;
    }
    if (profile === 'back_cadence' && weightedCenter < 0.4) {
      errors.push('Step hold/wait durations are concentrated too early for deterministic cadence profile (back_cadence).');
      return;
    }
    if (profile === 'mid_cadence' && (weightedCenter < 0.35 || weightedCenter > 0.65)) {
      errors.push('Step hold/wait durations drift away from deterministic cadence profile (mid_cadence).');
      return;
    }
  }

  const firstLine = stepLines[0] || '';
  const finalLine = stepLines[stepLines.length - 1] || '';
  if (profile === 'front_cadence' && /\b(?:extend|prolong|slower?)\s+(?:final|drawdown|finish)\b/i.test(finalLine)) {
    errors.push('Final-step language conflicts with deterministic front_cadence profile; avoid extending late-stage contact.');
    return;
  }
  if (profile === 'back_cadence' && /\b(?:quicken|rush|shorten|cut)\s+(?:final|drawdown|finish)\b/i.test(finalLine)) {
    errors.push('Final-step language conflicts with deterministic back_cadence profile; avoid rushing late-stage contact.');
    return;
  }
  if (profile === 'back_cadence' && /\b(?:hold|wait|pause|rest)\s+(?:for\s+)?(?:[4-9]\d|\d{3,})\s*(?:s|sec|secs|second|seconds|min|mins|minute|minutes)\b/i.test(firstLine)) {
    errors.push('Entry-step hold/wait duration is too heavy for deterministic back_cadence profile; keep early phase compact.');
  }
}
function validateMethodCueDistribution(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  if (stepLines.length < 2) return;

  if (plan.methodFamily === 'clever_dripper') {
    const firstLine = stepLines[0] || '';
    const finalLine = stepLines[stepLines.length - 1] || '';
    const hasEntryImmersionCue = /\b(immersion|immerse|steep|steeping|contact\s*time|soak)\b/i.test(firstLine);
    const hasFinalReleaseCue = /\b(release|open\s+valve|drawdown|drain|plunge)\b/i.test(finalLine);
    if (!hasEntryImmersionCue || !hasFinalReleaseCue) {
      errors.push('Clever Dripper cues must be phase-distributed: entry step needs immersion-contact cue and final step needs release cue.');
    }
    return;
  }

  const requiredMentions = Math.min(2, stepLines.length);
  const percolationPattern = /\b(concentric|circle|spiral|pulse|center(?:ed)?|ring\s+pour|drawdown|flow|bed\s+(?:level|settle)|(?:level(?:ing)?|settle)\s+bed|stream)\b/i;
  const percolationMentions = stepLines.filter((line) => percolationPattern.test(line)).length;
  if (percolationMentions < requiredMentions) {
    errors.push(`Method flow cues are too concentrated; include percolation control cues in at least ${requiredMentions} steps.`);
    return;
  }

  if (FLAT_BED_METHODS.has(plan.methodFamily)) {
    const flatBedPattern = /\b(flat[\s-]?bed|bed\s+height|center-focused|low-spout|even\s+bed)\b/i;
    const flatBedMentions = stepLines.filter((line) => flatBedPattern.test(line)).length;
    if (flatBedMentions < requiredMentions) {
      errors.push(`Flat-bed cues are too concentrated; include flat-bed control cues in at least ${requiredMentions} steps.`);
      return;
    }
  }

  if (plan.methodFamily === 'chemex') {
    const chemexPattern = /\b(filter|bypass|wall|thick\s*filter|steady)\b/i;
    const chemexMentions = stepLines.filter((line) => chemexPattern.test(line)).length;
    if (chemexMentions < requiredMentions) {
      errors.push(`Chemex thick-filter cues are too concentrated; include filter-flow control cues in at least ${requiredMentions} steps.`);
    }
  }
}
function validateMethodWorkflowConstraints(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const numberedSteps = getStepSectionLines(mode, normalized);
  if (numberedSteps.length === 0) return;
  const stepText = numberedSteps.join('\n');

  if (plan.methodFamily === 'clever_dripper') {
    if (PERCOLATION_WORKFLOW_PATTERN.test(stepText)) {
      errors.push('Clever Dripper workflow must not rely on cone pulse/concentric pour language.');
    }
    return;
  }

  if (!IMMERSION_WORKFLOW_METHODS.has(plan.methodFamily) && IMMERSION_WORKFLOW_PATTERN.test(stepText)) {
    errors.push(`${plan.dripper.name} workflow must not include immersion/release-only instructions.`);
  }
}

function validateMethodSpecificOperationalCues(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepText = getStepSectionLines(mode, normalized).join('\n');
  if (!stepText) return;

  if (plan.methodFamily === 'clever_dripper') {
    const hasImmersionCue = /\b(immersion|immerse|steep|steeping|contact\s*time|soak)\b/i.test(stepText);
    const hasReleaseCue = /\b(release|open\s+valve|drawdown|drain|plunge)\b/i.test(stepText);
    if (!hasImmersionCue || !hasReleaseCue) {
      errors.push('Clever Dripper sequence must include both immersion-contact cue and release cue in operational steps.');
    }
    return;
  }

  const hasPercolationCue = /\b(concentric|circle|spiral|pulse|center(?:ed)?|ring\s+pour|drawdown|flow|bed\s+(?:level|settle)|(?:level(?:ing)?|settle)\s+bed|stream)\b/i.test(stepText);
  if (!hasPercolationCue) {
    errors.push(`${plan.dripper.name} sequence must include explicit percolation flow cues (for example concentric/pulse/center/bed-settle).`);
  }

  if (FLAT_BED_METHODS.has(plan.methodFamily)) {
    const hasFlatBedCue = /\b(flat[\s-]?bed|bed\s+height|center-focused|low-spout|even\s+bed)\b/i.test(stepText);
    if (!hasFlatBedCue) {
      errors.push(`${plan.dripper.name} sequence must include flat-bed control cues (flat bed, bed height, low-spout, or even bed).`);
    }
  }

  if (plan.methodFamily === 'chemex') {
    const hasChemexCue = /\b(filter|bypass|wall|thick\s*filter|steady)\b/i.test(stepText);
    if (!hasChemexCue) {
      errors.push('Chemex sequence must include thick-filter flow cues (filter wall, bypass control, or steady flow).');
    }
  }
}

function validateStepTemplateRepetition(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepLines = getStepSectionLines(mode, normalized);
  if (stepLines.length < 3) return;

  const normalizedSteps = stepLines.map((line) => normalizeStepTextForSimilarity(plan, line));
  const adjacentSimilarities: number[] = [];
  for (let index = 0; index < normalizedSteps.length - 1; index += 1) {
    adjacentSimilarities.push(jaccardSimilarity(normalizedSteps[index], normalizedSteps[index + 1]));
  }
  if (adjacentSimilarities.length === 0) return;

  const avgSimilarity = adjacentSimilarities.reduce((total, value) => total + value, 0) / adjacentSimilarities.length;
  const minSimilarity = Math.min(...adjacentSimilarities);
  const verbBlueprints = new Set(
    stepLines.map((line) => {
      const verbs = Array.from(new Set(collectActionVerbs(line).filter((verb) => verb !== 'pour'))).sort();
      return verbs.join('+');
    }),
  );

  if ((avgSimilarity >= 0.72 && minSimilarity >= 0.66 && verbBlueprints.size <= 2) || minSimilarity >= 0.84) {
    errors.push('Sequence lines are too templated across steps; vary operational structure by phase, not only labels or numbers.');
    return;
  }

  const tailBlueprints = new Set(
    stepLines.map((line) => extractStepTailAfterCheckpoint(line)
      .toLowerCase()
      .replace(/\b\d+(?:\.\d+)?\b/g, 'n')
      .replace(/\b(mm:ss|ml|sec|secs|second|seconds|min|mins|minute|minutes)\b/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()),
  );
  if (stepLines.length >= 4 && tailBlueprints.size <= 2) {
    errors.push('Sequence lines reuse the same operational tail blueprint across phases; vary control intent per step.');
  }
}
function validateContextAnchors(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const lowered = normalized.toLowerCase();
  const methodToken = plan.methodFamily.replace(/_/g, ' ').toLowerCase();
  const targetTokens = plan.targetProfileLabel.toLowerCase().split(/[^\w]+/).filter((token) => token.length > 3);
  const hasMethodAnchor = lowered.includes(methodToken) || lowered.includes(plan.dripper.name.toLowerCase());
  const hasTargetAnchor = targetTokens.some((token) => lowered.includes(token));
  const hasWaterOrBeanAnchor = /(water|tds|gh|kh|alkalinity|hardness|bean|roast|solubility|altitude)/i.test(normalized);

  if (!hasMethodAnchor) {
    errors.push('Missing method/device context anchor in sequence narrative.');
  }
  if (!hasTargetAnchor) {
    errors.push('Missing target profile context anchor in sequence narrative.');
  }
  if (!hasWaterOrBeanAnchor) {
    errors.push('Missing water or bean context anchor in sequence narrative.');
  }
}

function validateServicePatternSection(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const bullets = getSectionLines(normalized, '## Service Pattern')
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, '').trim());

  if (bullets.length < 2) {
    errors.push('Service Pattern section must include at least two operational bullets (style + mode behavior).');
    return;
  }

  const styleLine = bullets[0] || '';
  const modeLine = bullets[1] || '';
  const styleLower = styleLine.toLowerCase();
  const modeLower = modeLine.toLowerCase();
  const methodToken = plan.methodFamily.replace(/_/g, ' ').toLowerCase();
  const targetTokens = plan.targetProfileLabel.toLowerCase().split(/[^\w]+/).filter((token) => token.length > 3);

  if (SERVICE_PATTERN_GENERIC_PATTERN.test(styleLine)) {
    errors.push('Service Pattern style line is too generic/template; use context-specific sequence naming.');
    return;
  }

  const modePattern = plan.brewMode === 'iced' ? /\biced\b/i : /\bhot\b/i;
  if (!modePattern.test(modeLower)) {
    errors.push(`Service Pattern mode line must explicitly mention ${plan.brewMode} mode behavior.`);
  }
}
function validateStepContextAnchors(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') return;
  const stepText = getStepSectionLines(mode, normalized).join('\n').toLowerCase();
  if (!stepText) return;

  const methodToken = plan.methodFamily.replace(/_/g, ' ').toLowerCase();
  const targetTokens = plan.targetProfileLabel.toLowerCase().split(/[^\w]+/).filter((token) => token.length > 3);
  const hasMethodAnchor = stepText.includes(methodToken) || stepText.includes(plan.dripper.name.toLowerCase());
  const hasTargetAnchor = targetTokens.some((token) => stepText.includes(token));
  const hasWaterOrBeanAnchor = /(water|tds|gh|kh|alkalinity|hardness|bean|roast|solubility|altitude)/i.test(stepText);

  if (!hasMethodAnchor || !hasTargetAnchor || !hasWaterOrBeanAnchor) {
    errors.push('Sequence steps must include method/device, target, and water/bean context anchors inside operational lines.');
  }
}

function validateStepAnchorDistribution(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate' || plan.steps.length < 3) return;
  const stepLines = getStepSectionLines(mode, normalized);
  if (!stepLines.length) return;

  const methodToken = plan.methodFamily.replace(/_/g, ' ').toLowerCase();
  const dripperToken = plan.dripper.name.toLowerCase();
  const targetTokens = plan.targetProfileLabel.toLowerCase().split(/[^\w]+/).filter((token) => token.length > 3);
  const waterOrBeanPattern = /(water|tds|gh|kh|alkalinity|hardness|bean|roast|solubility|altitude)/i;
  const requiredMentions = Math.min(2, stepLines.length);

  let methodMentions = 0;
  let targetMentions = 0;
  let waterOrBeanMentions = 0;

  for (const rawLine of stepLines) {
    const line = rawLine.toLowerCase();
    if (line.includes(methodToken) || line.includes(dripperToken)) methodMentions += 1;
    if (targetTokens.some((token) => line.includes(token))) targetMentions += 1;
    if (waterOrBeanPattern.test(rawLine)) waterOrBeanMentions += 1;
  }

  if (methodMentions < requiredMentions || targetMentions < requiredMentions || waterOrBeanMentions < requiredMentions) {
    errors.push(`Sequence context anchors are too concentrated; spread method, target, and water/bean anchors across at least ${requiredMentions} steps.`);
  }
}
function validateWatchSectionQuality(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode !== 'sequence') return;
  const bullets = getSectionLines(normalized, '## Watch')
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, '').trim());
  if (bullets.length === 0) return;

  const methodToken = plan.methodFamily.replace(/_/g, ' ').toLowerCase();
  const dripperToken = plan.dripper.name.toLowerCase();
  const targetTokens = plan.targetProfileLabel.toLowerCase().split(/[^\w]+/).filter((token) => token.length > 3);

  const hasDeterministicEnvelopeBullet = bullets.some((line) => {
    const hasEnvelopeCue = /\b(dose|ratio|water|temperature|temp|brew\s*time|hot|ice|cumulative|target volume)\b/i.test(line);
    const hasNumericAnchor = /\b(?:\d+(?:\.\d+)?\s*(?:ml|g|c)|1:\d+(?:\.\d+)?|\d{2}:[0-5]\d)\b/i.test(line);
    return hasEnvelopeCue && hasNumericAnchor;
  });
  const hasWaterOrBeanAnchor = bullets.some((line) => /\b(water|tds|gh|kh|alkalinity|hardness|bean|roast|solubility|altitude)\b/i.test(line));
  if (!hasDeterministicEnvelopeBullet && !hasWaterOrBeanAnchor) {
    errors.push('Watch section must include at least one deterministic envelope checkpoint with numeric anchors (dose/ratio/water/temp/time).');
  }
}

function validateControlPointTroubleshootingCoverage(mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode !== 'sop') return;
  const bullets = getSectionLines(normalized, '## Control Points')
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, '').trim());
  if (bullets.length === 0) return;

  const sourLine = bullets.find((line) => /\bsour\b/i.test(line));
  const bitterLine = bullets.find((line) => /\bbitter\b/i.test(line));
  if (!sourLine || !bitterLine) {
    errors.push('Control Points must include both sour and bitter corrective bullets.');
  }

  const actionablePattern = /\b(tighten|coarsen|raise|lower|increase|decrease|reduce|extend|shorten|shift|adjust|hold|keep)\b/i;
  const controlKnobPattern = /\b(grind|temperature|temp|ratio|pour|pulse|time|flow|agitation|water|bed)\b/i;
  if (sourLine && (!actionablePattern.test(sourLine) || !controlKnobPattern.test(sourLine))) {
    errors.push('Sour corrective bullet must include an actionable adjustment on a controllable brewing knob.');
  }
  if (bitterLine && (!actionablePattern.test(bitterLine) || !controlKnobPattern.test(bitterLine))) {
    errors.push('Bitter corrective bullet must include an actionable adjustment on a controllable brewing knob.');
  }
}
function validateMethodIdentityConsistency(plan: BrewPlan, normalized: string, errors: string[]) {
  const lowered = normalized.toLowerCase();
  const selectedAliases = METHOD_FAMILY_ALIASES[plan.methodFamily] || [];
  const hasSelectedAnchor = selectedAliases.some((alias) => lowered.includes(alias))
    || lowered.includes(plan.dripper.name.toLowerCase());

  if (!hasSelectedAnchor) {
    errors.push(`Narrative must explicitly anchor the selected method/device (${plan.dripper.name}).`);
    return;
  }

  const conflictingFamilies = Object.entries(METHOD_FAMILY_ALIASES)
    .filter(([family]) => family !== plan.methodFamily)
    .filter(([, aliases]) => aliases.some((alias) => lowered.includes(alias)))
    .map(([family]) => family.replace(/_/g, ' '));

  if (conflictingFamilies.length > 0) {
    const unique = Array.from(new Set(conflictingFamilies)).slice(0, 3).join(', ');
    errors.push(
      `Narrative references conflicting method/device cues (${unique}); keep method identity aligned with ${plan.dripper.name}.`,
    );
  }
}

function getSectionLines(normalized: string, heading: string) {
  const lines = normalized.split('\n');
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  if (startIndex < 0) return [] as string[];
  const section: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (/^##\s+/.test(line)) break;
    if (line) section.push(line);
  }
  return section;
}


const NARRATIVE_HEADING_ALIASES: Record<string, string> = {
  '## Pola Servis': '## Service Pattern',
  '## Pola Layanan': '## Service Pattern',
  '## Pola Penyajian': '## Service Pattern',
  '## Pola Seduh': '## Service Pattern',
  '## Urutan': '## Sequence',
  '## Urutan Seduh': '## Sequence',
  '## Sekuens': '## Sequence',
  '## Langkah': '## Sequence',
  '## Pantau': '## Watch',
  '## Perhatikan': '## Watch',
  '## Yang Dipantau': '## Watch',
  '## Titik Pantau': '## Watch',
};

function normalizeNarrativeHeading(line: string) {
  const compact = line.replace(/\s+/g, ' ').trim();
  return NARRATIVE_HEADING_ALIASES[compact] ?? compact;
}

function parseNarrativeSections(markdown: string) {
  const sections: Record<string, string[]> = {};
  const lines = normalizeText(markdown).split('\n');
  let currentHeading = '';
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^##\s+/.test(line)) {
      currentHeading = normalizeNarrativeHeading(line);
      if (!sections[currentHeading]) sections[currentHeading] = [];
      continue;
    }
    if (!currentHeading) continue;
    sections[currentHeading].push(line);
  }
  return sections;
}
function buildNarrativeFromSections(order: string[], sections: Record<string, string[]>) {
  const output: string[] = [];
  for (const heading of order) {
    const lines = sections[heading];
    if (!lines || lines.length === 0) return null;
    output.push(heading, ...lines);
  }
  return output.join('\n');
}
function pushUniqueCandidate(candidates: string[][], lines: string[]) {
  if (lines.length === 0) return;
  const fingerprint = lines.join('\n').trim().toLowerCase();
  if (!fingerprint) return;
  if (!candidates.some((candidate) => candidate.join('\n').trim().toLowerCase() === fingerprint)) {
    candidates.push(lines);
  }
}
function attemptHybridSectionRepair(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string): HybridNarrativeResult | null {
  if (mode === 'generate') return null;
  const deterministic = buildDeterministicNarrative(plan, mode);
  const deterministicSections = parseNarrativeSections(deterministic);
  const aiSections = parseNarrativeSections(normalized);

  if (mode === 'sequence') {
    const aiStepLines = (aiSections['## Sequence'] || []).filter((line) => /^\d+\.\s+/.test(line));
    if (aiStepLines.length !== plan.steps.length) return null;

    const stepCandidates: Array<{ lines: string[]; normalizedToEnvelope: boolean }> = [
      { lines: aiStepLines, normalizedToEnvelope: false },
    ];
    const repairedStepLines = repairOperationalStepLines(plan, aiStepLines);
    if (repairedStepLines && repairedStepLines.join('\n') !== aiStepLines.join('\n')) {
      stepCandidates.push({ lines: repairedStepLines, normalizedToEnvelope: true });
    }

    const deterministicServicePattern = (deterministicSections['## Service Pattern'] || []).filter((line) => /^-\s+/.test(line));
    const serviceCandidates: string[][] = [];
    pushUniqueCandidate(serviceCandidates, (aiSections['## Service Pattern'] || []).filter((line) => /^-\s+/.test(line)).slice(0, 2));
    pushUniqueCandidate(serviceCandidates, deterministicServicePattern.slice(0, 2));

    const deterministicWatch = (deterministicSections['## Watch'] || []).filter((line) => /^-\s+/.test(line));
    const watchCandidates: string[][] = [];
    pushUniqueCandidate(watchCandidates, (aiSections['## Watch'] || []).filter((line) => /^-\s+/.test(line)));
    pushUniqueCandidate(watchCandidates, deterministicWatch);

    for (const servicePattern of serviceCandidates) {
      for (const watch of watchCandidates) {
        for (const stepCandidate of stepCandidates) {
          const usingDeterministicService = deterministicServicePattern.join('\n').trim() === servicePattern.join('\n').trim();
          const usingDeterministicWatch = deterministicWatch.join('\n').trim() === watch.join('\n').trim();
          const supportSections = [
            usingDeterministicService ? 'Service Pattern' : '',
            usingDeterministicWatch ? 'Watch' : '',
          ].filter(Boolean);

          const repaired = buildNarrativeFromSections(
            ['## Service Pattern', '## Sequence', '## Watch'],
            {
              '## Service Pattern': servicePattern,
              '## Sequence': stepCandidate.lines,
              '## Watch': watch,
            },
          );
          if (!repaired) continue;

          const validation = validateAiNarrative(plan, mode, repaired);
          if (!validation.valid) continue;

          const repairWarnings: string[] = [];
          if (supportSections.length > 0) {
            const deterministicLabel = usingDeterministicWatch ? 'Service Pattern + Watch' : supportSections.join(' + ');
            repairWarnings.push(`AI narrative repaired with deterministic ${deterministicLabel} while preserving validated operational steps.`);
          } else {
            repairWarnings.push('AI narrative repaired while preserving validated operational steps.');
          }
          if (stepCandidate.normalizedToEnvelope) {
            repairWarnings.push('AI step lines were normalized to deterministic checkpoints (label/time/volume) before final validation.');
          }

          return {
            markdown: validation.normalized,
            usedFallback: false,
            validation: {
              ...validation,
              warnings: [
                ...validation.warnings,
                ...repairWarnings,
              ],
            },
          };
        }
      }
    }

    return null;
  }

  const aiStepLines = (aiSections['## Steps'] || []).filter((line) => /^\d+\.\s+/.test(line));
  if (aiStepLines.length !== plan.steps.length) return null;

  const stepCandidates: Array<{ lines: string[]; normalizedToEnvelope: boolean }> = [
    { lines: aiStepLines, normalizedToEnvelope: false },
  ];
  const repairedStepLines = repairOperationalStepLines(plan, aiStepLines);
  if (repairedStepLines && repairedStepLines.join('\n') !== aiStepLines.join('\n')) {
    stepCandidates.push({ lines: repairedStepLines, normalizedToEnvelope: true });
  }

  const deterministicQuickDial = deterministicSections['## Quick Dial'] || [];
  const deterministicServicePattern = (deterministicSections['## Service Pattern'] || []).filter((line) => /^-\s+/.test(line));
  const deterministicControlPoints = (deterministicSections['## Control Points'] || []).filter((line) => /^-\s+/.test(line));

  const quickDialCandidates: string[][] = [];
  pushUniqueCandidate(quickDialCandidates, aiSections['## Quick Dial'] || []);
  pushUniqueCandidate(quickDialCandidates, deterministicQuickDial);

  const serviceCandidates: string[][] = [];
  pushUniqueCandidate(serviceCandidates, (aiSections['## Service Pattern'] || []).filter((line) => /^-\s+/.test(line)).slice(0, 2));
  pushUniqueCandidate(serviceCandidates, deterministicServicePattern.slice(0, 2));

  const controlPointCandidates: string[][] = [];
  pushUniqueCandidate(controlPointCandidates, (aiSections['## Control Points'] || []).filter((line) => /^-\s+/.test(line)));
  pushUniqueCandidate(controlPointCandidates, deterministicControlPoints);

  for (const quickDial of quickDialCandidates) {
    for (const servicePattern of serviceCandidates) {
      for (const controlPoints of controlPointCandidates) {
        for (const stepCandidate of stepCandidates) {
          const usingDeterministicQuickDial = deterministicQuickDial.join('\n').trim() === quickDial.join('\n').trim();
          const usingDeterministicService = deterministicServicePattern.join('\n').trim() === servicePattern.join('\n').trim();
          const usingDeterministicControlPoints = deterministicControlPoints.join('\n').trim() === controlPoints.join('\n').trim();
          const replacedSections = [
            usingDeterministicQuickDial ? 'Quick Dial' : '',
            usingDeterministicService ? 'Service Pattern' : '',
            usingDeterministicControlPoints ? 'Control Points' : '',
          ].filter(Boolean);

          const repaired = buildNarrativeFromSections(
            ['## Quick Dial', '## Service Pattern', '## Steps', '## Control Points'],
            {
              '## Quick Dial': quickDial,
              '## Service Pattern': servicePattern,
              '## Steps': stepCandidate.lines,
              '## Control Points': controlPoints,
            },
          );
          if (!repaired) continue;

          const validation = validateAiNarrative(plan, mode, repaired);
          if (!validation.valid) continue;

          const repairWarnings: string[] = [];
          if (replacedSections.length > 0) {
            repairWarnings.push(`AI SOP repaired with deterministic ${replacedSections.join(' + ')} while preserving validated operational steps.`);
          } else {
            repairWarnings.push('AI SOP repaired while preserving validated operational steps.');
          }
          if (stepCandidate.normalizedToEnvelope) {
            repairWarnings.push('AI SOP step lines were normalized to deterministic checkpoints (label/time/volume) before final validation.');
          }

          return {
            markdown: validation.normalized,
            usedFallback: false,
            validation: {
              ...validation,
              warnings: [
                ...validation.warnings,
                ...repairWarnings,
              ],
            },
          };
        }
      }
    }
  }

  return null;
}
function parseFirstNumericValue(line: string): number | null {
  const match = line.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateSopQuickDialEnvelope(plan: BrewPlan, mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode !== 'sop') return;

  const quickDialLines = getSectionLines(normalized, '## Quick Dial').map((line) => line.toLowerCase());
  if (quickDialLines.length === 0) return;

  const doseLine = quickDialLines.find((line) => line.includes('dose'));
  const totalWaterLine = quickDialLines.find((line) => line.includes('total water'));
  const tempLine = quickDialLines.find((line) => line.includes('temperature'));
  const grindLine = quickDialLines.find((line) => line.includes('grind'));
  const totalTimeLine = quickDialLines.find((line) => line.includes('total time'));

  if (!doseLine || !totalWaterLine || !tempLine || !grindLine || !totalTimeLine) {
    errors.push('Quick Dial must include dose, total water, temperature, grind, and total time.');
    return;
  }

  const doseValue = parseFirstNumericValue(doseLine);
  if (doseValue === null || Math.abs(doseValue - plan.doseG) > 0.3) {
    errors.push(`Quick Dial dose must match deterministic value ${plan.doseG} g.`);
    return;
  }

  const waterValues = Array.from(totalWaterLine.matchAll(/(\d+(?:\.\d+)?)\s*ml/gi)).map((match) => Number.parseFloat(match[1]));
  if (waterValues.length === 0 || !waterValues.some((value) => Math.abs(value - plan.totalWaterMl) <= 2)) {
    errors.push(`Quick Dial total water must match deterministic value ${plan.totalWaterMl} ml.`);
    return;
  }
  if (plan.iceMl > 0) {
    const hasHot = waterValues.some((value) => Math.abs(value - plan.hotWaterMl) <= 2);
    const hasIce = waterValues.some((value) => Math.abs(value - plan.iceMl) <= 2);
    if (!hasHot || !hasIce) {
      errors.push(`Quick Dial iced split must include ${plan.hotWaterMl} ml hot and ${plan.iceMl} ml ice.`);
      return;
    }
  }

  const tempValue = parseFirstNumericValue(tempLine);
  if (tempValue === null || Math.abs(tempValue - plan.waterTempC) > 0.5) {
    errors.push(`Quick Dial temperature must match deterministic value ${plan.waterTempC} C.`);
    return;
  }

  const expectedTime = formatSeconds(plan.totalTimeSeconds).toLowerCase();
  if (!totalTimeLine.includes(expectedTime)) {
    errors.push(`Quick Dial total time must match deterministic value ${formatSeconds(plan.totalTimeSeconds)}.`);
    return;
  }

  if (!grindLine.includes(plan.grindRecommendation.toLowerCase())) {
    errors.push(`Quick Dial grind must include deterministic recommendation "${plan.grindRecommendation}".`);
  }
}

function looksLikeStructuredNarrative(mode: AiBrewNarrativeMode, text: string) {
  const normalized = sanitizeAiText(mode, text);
  if (!normalized) return false;

  const requiredHeadings: Record<AiBrewNarrativeMode, string[]> = {
    generate: ['## Why It Fits', '## Focus'],
    sequence: ['## Service Pattern', '## Sequence', '## Watch'],
    sop: ['## Quick Dial', '## Service Pattern', '## Steps', '## Control Points'],
  };
  return requiredHeadings[mode].every((heading) => normalized.includes(heading));
}
function validateOperationalSections(mode: AiBrewNarrativeMode, normalized: string, errors: string[]) {
  if (mode === 'generate') {
    const focusLines = getSectionLines(normalized, '## Focus');
    const bullets = focusLines.filter((line) => /^-\s+/.test(line));
    if (bullets.length < 2) {
      errors.push('Focus section must include at least two executable bullets.');
    }
    return;
  }

  if (mode === 'sequence') {
    const watchLines = getSectionLines(normalized, '## Watch');
    const bullets = watchLines.filter((line) => /^-\s+/.test(line));
    if (bullets.length < 2) {
      errors.push('Watch section must include at least two operational bullets.');
    }
    return;
  }

  const controlLines = getSectionLines(normalized, '## Control Points');
  const bullets = controlLines.filter((line) => /^-\s+/.test(line));
  if (bullets.length < 4) {
    errors.push('Control Points section must include at least four operational bullets.');
  }
}

export function validateAiNarrative(plan: BrewPlan, mode: AiBrewNarrativeMode, raw: string): AiBrewNarrativeValidation {
  const normalized = sanitizeAiText(mode, raw);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!normalized) {
    errors.push('Response is empty.');
    return { valid: false, errors, warnings, normalized };
  }
  if (normalized.length < 90) {
    errors.push('Response is too short for operational use.');
  }

  validateHeadingStructure(normalized, mode, errors);
  validateHeadingOrder(normalized, mode, errors);
  validatePlaceholders(normalized, errors);
  validateForbiddenInstructions(normalized, errors);
  validateNumericEnvelope(plan, mode, normalized, errors, warnings);
  validateStepCoverage(plan, normalized, mode, errors);
  validateStepLabelContinuity(plan, mode, normalized, errors);
  validateStepNumbering(plan, mode, normalized, errors);
  validateStepExecutionLanguage(plan, mode, normalized, errors);
  validateStepInRunOnlyInstructions(mode, normalized, errors);
  validateStepParameterShiftInstructions(mode, normalized, errors);
  validateStepEnvelopeCoverage(plan, mode, normalized, errors);
  validateStepCanonicalPrefix(plan, mode, normalized, errors);
  validateStepCheckpointIntegrity(plan, mode, normalized, errors);
  validateStepCumulativeTargets(plan, mode, normalized, errors);
  validateStepTimeline(plan, mode, normalized, errors);
  validateStepAdditionalClockTimes(mode, normalized, errors);
  validateStepActionDiversity(plan, mode, normalized, errors);
  validateStepHoldDurations(plan, mode, normalized, errors);
  validateStepPhaseControl(plan, mode, normalized, errors);
  validateStepPhaseIntentConsistency(mode, normalized, errors);
  validateStepDeterminismLanguage(mode, normalized, errors);
  validateStepDilutionInstructions(mode, normalized, errors);
  validateStepUnsupportedHardwareInstructions(plan, mode, normalized, errors);
  validateStepOpposingTasteCueMix(plan, mode, normalized, errors);
  validateTargetIntentConsistency(plan, mode, normalized, errors);
  validateExtractionPressureConsistency(plan, mode, normalized, errors);
  validateCadenceProfileConsistency(plan, mode, normalized, errors);
  validateMethodWorkflowConstraints(plan, mode, normalized, errors);
  validateMethodSpecificOperationalCues(plan, mode, normalized, errors);
  validateMethodCueDistribution(plan, mode, normalized, errors);
  validateStepTemplateRepetition(plan, mode, normalized, errors);
  validateChemistryAnchors(plan, normalized, errors);
  validateModeEnvelope(plan, mode, normalized, errors);
  validateServicePatternSection(plan, mode, normalized, errors);
  validateContextAnchors(plan, mode, normalized, errors);
  validateStepContextAnchors(plan, mode, normalized, errors);
  validateStepAnchorDistribution(plan, mode, normalized, errors);
  validateWatchSectionQuality(plan, mode, normalized, errors);
  validateMethodIdentityConsistency(plan, normalized, errors);
  validateOperationalSections(mode, normalized, errors);
  validateControlPointTroubleshootingCoverage(mode, normalized, errors);
  validateSopQuickDialEnvelope(plan, mode, normalized, errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized,
  };
}

export function composeHybridNarrative(
  plan: BrewPlan,
  mode: AiBrewNarrativeMode,
  aiText: string | null | undefined,
): HybridNarrativeResult {
  if (!aiText || !aiText.trim()) {
    const fallback = buildDeterministicNarrative(plan, mode);
    return {
      markdown: fallback,
      usedFallback: true,
      fallbackReason: 'ai_unavailable',
      validation: {
        valid: false,
        errors: ['AI response unavailable.'],
        warnings: [],
        normalized: '',
      },
    };
  }

  if ((looksLikeAiUnavailableText(aiText) || looksLikeAiTimeoutText(aiText)) && !looksLikeStructuredNarrative(mode, aiText)) {
    const fallbackReason = looksLikeAiTimeoutText(aiText) ? 'ai_timeout' : 'ai_unavailable';
    const fallback = buildDeterministicNarrative(plan, mode);
    return {
      markdown: fallback,
      usedFallback: true,
      fallbackReason,
      validation: {
        valid: false,
        errors: [fallbackReason === 'ai_timeout' ? 'AI response timed out.' : 'AI response indicated service unavailability.'],
        warnings: [],
        normalized: normalizeText(aiText),
      },
    };
  }

  const cleanedText = sanitizeAiText(mode, aiText);
  const validation = validateAiNarrative(plan, mode, cleanedText);
  if (!validation.valid) {
    const hasNonRepairableSemanticError = validation.errors.some((item) => /too templated across steps|thick-filter cues are too concentrated|iced workflow must include deterministic split/i.test(item));
    const repaired = hasNonRepairableSemanticError ? null : attemptHybridSectionRepair(plan, mode, validation.normalized);
    if (repaired) return repaired;
    return {
      markdown: buildDeterministicNarrative(plan, mode),
      usedFallback: true,
      fallbackReason: 'invalid_narrative',
      validation,
    };
  }

  return {
    markdown: validation.normalized,
    usedFallback: false,
    validation,
  };
}

function stripSequenceLinePrefix(plan: BrewPlan, line: string, index: number) {
  const step = plan.steps[index];
  if (!step) return line.replace(/^\d+\.\s*/, '').trim();

  let next = line.replace(/^\d+\.\s*/, '').trim();
  const canonicalPrefix = new RegExp(
    `^${escapeRegExp(step.label)}\\s+at(?:\\s+exact\\s+planner\\s+time)?\\s+${escapeRegExp(formatSeconds(step.startSeconds))}:\\s+${escapeRegExp(formatStepOperation(step))}\\b`,
    'i',
  );
  const legacyCanonicalPrefix = new RegExp(
    `^${escapeRegExp(step.label)}\\s+at(?:\\s+exact\\s+planner\\s+time)?\\s+${escapeRegExp(formatSeconds(step.startSeconds))}:\\s+pour\\s+${step.pourVolumeMl}\\s*ml\\s+to\\s+${step.targetVolumeMl}\\s*ml\\b`,
    'i',
  );
  next = next.replace(canonicalPrefix, '').trim();
  next = next.replace(legacyCanonicalPrefix, '').trim();
  next = next.replace(/^[\s,.;:–—-]+/, '').trim();
  return next || step.note;
}

export function composeHybridSequenceOverlay(
  plan: BrewPlan,
  aiText: string | null | undefined,
): HybridSequenceOverlay {
  const hybrid = composeHybridNarrative(plan, 'sequence', aiText);
  return {
    markdown: hybrid.markdown,
    usedFallback: hybrid.usedFallback,
    validation: hybrid.validation,
    ...extractSequenceOverlayFromMarkdown(plan, hybrid.markdown),
  };
}

export function extractSequenceOverlayFromMarkdown(
  plan: BrewPlan,
  markdown: string,
): Pick<HybridSequenceOverlay, 'servicePattern' | 'watch' | 'steps'> {
  const sections = parseNarrativeSections(markdown);
  const servicePattern = (sections['## Service Pattern'] || []).filter((line) => /^-\s+/.test(line));
  const watch = (sections['## Watch'] || []).filter((line) => /^-\s+/.test(line));
  const stepLines = (sections['## Sequence'] || []).filter((line) => /^\d+\.\s+/.test(line));

  const steps = plan.steps.map((step, index) => {
    const rawLine = stepLines[index] || `${index + 1}. ${step.label} at ${formatSeconds(step.startSeconds)}: ${formatStepOperation(step)}. ${step.note}`;
    return {
      rawLine,
      instruction: stripSequenceLinePrefix(plan, rawLine, index),
    };
  });

  return {
    servicePattern,
    watch,
    steps,
  };
}
























































































