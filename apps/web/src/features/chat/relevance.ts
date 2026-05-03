export interface CoffeeEntities {
  methods: string[];
  dimensions: string[];
  origins: string[];
  processes: string[];
}

const METHOD_ALIASES: Record<string, RegExp> = {
  v60: /\bv\s*60\b|\bhario\s+v60\b/i,
  chemex: /\bchemex\b/i,
  kalita: /\bkalita(?:\s+wave)?\b/i,
  aeropress: /\baero\s*press\b|\baeropress\b/i,
  'french press': /\bfrench\s+press\b/i,
  espresso: /\bespresso\b/i,
  'cold brew': /\bcold\s+brew\b/i,
  'moka pot': /\bmoka\s+pot\b|\bbialetti\b/i,
};

const DIMENSION_ALIASES: Record<string, RegExp> = {
  ratio: /\bratio\b|\brasio\b/i,
  temperature: /\bsuhu\b|\btemperature\b|\btemp\b/i,
  grind: /\bgrind\b|\bgilingan\b/i,
  time: /\bwaktu\b|\btime\b|\bdurasi\b/i,
  water: /\bair\b|\bwater\b/i,
  body: /\bbody\b|\bbodi\b/i,
  acidity: /\bacidity\b|\basam\b|\bkeasaman\b/i,
  sweetness: /\bsweetness\b|\bmanis\b/i,
  clarity: /\bclarity\b|\bclean\b|\bjernih\b|\bbersih\b/i,
};

const ORIGIN_ALIASES: Record<string, RegExp> = {
  ethiopia: /\bethiopia\b|\byirgacheffe\b|\bchelbesa\b/i,
  kenya: /\bkenya\b/i,
  panama: /\bpanama\b|\bboquete\b/i,
  colombia: /\bcolombia\b|\bkolombia\b/i,
  indonesia: /\bindonesia\b|\bgayo\b|\bsumatra\b|\bjava\b/i,
  brazil: /\bbrazil\b|\bbrasil\b/i,
  bolivia: /\bbolivia\b|\bbolinda\b|\bcaranavi\b|\bla\s+paz\b/i,
  costa_rica: /\bcosta\s+rica\b|\btarrazu\b/i,
};

const PROCESS_ALIASES: Record<string, RegExp> = {
  washed: /\bwashed\b|\bwet\s+process\b/i,
  natural: /\bnatural\b|\bdry\s+process\b/i,
  honey: /\bhoney\b/i,
  'wet-hulled': /\bwet[-\s]?hulled\b|\bgiling\s+basah\b/i,
  anaerobic: /\banaerobic\b|\banaerobik\b/i,
};

function collectMatches(text: string, aliases: Record<string, RegExp>) {
  return Object.entries(aliases)
    .filter(([, pattern]) => pattern.test(text))
    .map(([key]) => key);
}

export function extractCoffeeEntities(text: string): CoffeeEntities {
  const value = String(text || '');
  return {
    methods: collectMatches(value, METHOD_ALIASES),
    dimensions: collectMatches(value, DIMENSION_ALIASES),
    origins: collectMatches(value, ORIGIN_ALIASES),
    processes: collectMatches(value, PROCESS_ALIASES),
  };
}

function asksComparison(text: string) {
  return /\b(?:bandingkan|perbandingan|compare|versus|vs\.?|beda|difference)\b/i.test(text);
}

export function scoreAnswerRelevance(userMessage: string, answer: string): {
  score: number;
  missingRequiredEntities: string[];
  risk: 'low' | 'medium' | 'high';
} {
  const user = extractCoffeeEntities(userMessage);
  const response = extractCoffeeEntities(answer);
  const missingRequiredEntities: string[] = [];

  for (const method of user.methods) {
    if (!response.methods.includes(method)) missingRequiredEntities.push(method);
  }

  if (asksComparison(userMessage)) {
    for (const dimension of user.dimensions) {
      if (!response.dimensions.includes(dimension)) missingRequiredEntities.push(dimension);
    }
  }

  const requiredCount = user.methods.length + (asksComparison(userMessage) ? user.dimensions.length : 0);
  const answeredCount = Math.max(0, requiredCount - missingRequiredEntities.length);
  const baseScore = requiredCount === 0 ? 0.75 : answeredCount / requiredCount;

  const answerLower = answer.toLowerCase();
  const userLower = userMessage.toLowerCase();
  const templateLeak = (
    /\bethiopia\s+yirgacheffe\b|\bresep\s+v60\b|\bv60\s+ethiopia\b/i.test(answerLower)
    && !/\bethiopia\s+yirgacheffe\b|\bresep\s+v60\b|\bv60\b/i.test(userLower)
  );
  const lowMethodOverlap = user.methods.length > 0
    && response.methods.filter((method) => user.methods.includes(method)).length === 0;

  let score = baseScore;
  if (templateLeak) score -= 0.45;
  if (lowMethodOverlap) score -= 0.35;
  score = Math.max(0, Math.min(1, score));

  const risk = templateLeak || missingRequiredEntities.length > 0 && user.methods.length > 0
    ? 'high'
    : score < 0.55
      ? 'medium'
      : 'low';

  return {
    score,
    missingRequiredEntities,
    risk,
  };
}
