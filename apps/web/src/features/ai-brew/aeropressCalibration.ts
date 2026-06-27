import type { RoastLevel } from '../barista-tools/types.ts';
import type { AeroPressRecipeStyle, DeviceBrewProfile } from './types.ts';

export type ResolvedAeroPressStyle = Exclude<AeroPressRecipeStyle, 'auto'>;

export type AeroPressProductionTarget = {
  finalRatio: number;
  concentrateRatio: number | null;
  finishRangeSeconds: [number, number];
  tempRangeC: [number, number];
  bypassRangePercent?: [number, number];
  stirCount: string;
  targetNote?: string;
  targetCue: {
    en: string;
    id: string;
  };
  roastCue: {
    en: string;
    id: string;
  };
};

type AeroPressBaseTarget = Omit<AeroPressProductionTarget, 'targetCue' | 'roastCue'>;

type AeroPressTargetCalibration = {
  ratioDelta: number;
  timeDeltaSec: number;
  stirCount?: string;
  en: string;
  id: string;
  note: string;
};

export type AeroPressTargetIntent = {
  targetProfileId: string;
  sensoryIntent: string;
  extractionMove: string;
  guardrails: string[];
};

const AEROPRESS_CORE_GUARDRAILS = [
  'Keep upright chamber brew water at or below 240 ml.',
  'Keep inverted chamber brew water at or below 220 ml.',
  'Add bypass water only after pressing, never through the coffee bed.',
  'Stop before the dry hiss so late air pressure does not roughen the cup.',
  'If press resistance spikes, stop forcing and grind coarser next brew.',
  'Use measured iced dilution; do not add unplanned water outside the recipe.',
];

export const AEROPRESS_TARGET_INTENTS: Record<string, AeroPressTargetIntent> = {
  balance_clean: {
    targetProfileId: 'balance_clean',
    sensoryIntent: 'clean balance with even sweetness and no dry finish',
    extractionMove: 'moderate contact, moderate stir, smooth press',
    guardrails: AEROPRESS_CORE_GUARDRAILS,
  },
  more_sweetness: {
    targetProfileId: 'more_sweetness',
    sensoryIntent: 'more middle sweetness without bitter late pressure',
    extractionMove: 'slightly tighter ratio, slightly longer contact, gentle press',
    guardrails: AEROPRESS_CORE_GUARDRAILS,
  },
  more_acidity: {
    targetProfileId: 'more_acidity',
    sensoryIntent: 'brighter acidity with a clean lightweight finish',
    extractionMove: 'shorter contact, lighter stir, earlier stop',
    guardrails: AEROPRESS_CORE_GUARDRAILS,
  },
  more_body: {
    targetProfileId: 'more_body',
    sensoryIntent: 'more body, texture, and density without muddy grit',
    extractionMove: 'tighter ratio, deeper contact, slower controlled press',
    guardrails: AEROPRESS_CORE_GUARDRAILS,
  },
  floral_transparent: {
    targetProfileId: 'floral_transparent',
    sensoryIntent: 'transparent floral aromatics with minimal agitation',
    extractionMove: 'lowest practical stir, shorter contact, measured bypass when needed',
    guardrails: AEROPRESS_CORE_GUARDRAILS,
  },
  fruit_forward: {
    targetProfileId: 'fruit_forward',
    sensoryIntent: 'juicy fruit aromatics without heavy ferment edge',
    extractionMove: 'medium-low agitation, clean press, measured dilution when needed',
    guardrails: AEROPRESS_CORE_GUARDRAILS,
  },
  soft_round: {
    targetProfileId: 'soft_round',
    sensoryIntent: 'rounded sweetness and low harshness',
    extractionMove: 'baseline contact, gentle stir, low-pressure finish',
    guardrails: AEROPRESS_CORE_GUARDRAILS,
  },
  dense_comforting: {
    targetProfileId: 'dense_comforting',
    sensoryIntent: 'compact comforting body while guarding bitterness',
    extractionMove: 'tight ratio, longer contact, controlled stir without forcing air',
    guardrails: AEROPRESS_CORE_GUARDRAILS,
  },
};

export function resolveAeroPressTargetIntent(targetProfileId?: string): AeroPressTargetIntent {
  return AEROPRESS_TARGET_INTENTS[targetProfileId || 'balance_clean'] || AEROPRESS_TARGET_INTENTS.balance_clean;
}

const STYLE_BASE: Record<ResolvedAeroPressStyle, AeroPressBaseTarget> = {
  standard: {
    finalRatio: 13.5,
    concentrateRatio: null,
    finishRangeSeconds: [110, 150],
    tempRangeC: [88, 90],
    stirCount: '3x',
  },
  inverted: {
    finalRatio: 13.5,
    concentrateRatio: null,
    finishRangeSeconds: [125, 165],
    tempRangeC: [88, 90],
    stirCount: '4x',
  },
  bypass: {
    finalRatio: 13,
    concentrateRatio: 9,
    finishRangeSeconds: [115, 150],
    tempRangeC: [88, 90],
    bypassRangePercent: [25, 40],
    stirCount: '3x',
  },
  no_bypass: {
    finalRatio: 14,
    concentrateRatio: null,
    finishRangeSeconds: [140, 180],
    tempRangeC: [88, 90],
    stirCount: '3x',
  },
  bright_clean: {
    finalRatio: 14.5,
    concentrateRatio: null,
    finishRangeSeconds: [90, 130],
    tempRangeC: [90, 92],
    stirCount: '2-3x',
  },
  sweet_body: {
    finalRatio: 12.5,
    concentrateRatio: null,
    finishRangeSeconds: [150, 195],
    tempRangeC: [88, 90],
    stirCount: '5x',
  },
};

const TARGET_CALIBRATION: Record<string, AeroPressTargetCalibration> = {
  balance_clean: {
    ratioDelta: 0,
    timeDeltaSec: 0,
    stirCount: '3x',
    en: 'balance target keeps even contact, clean sweetness, and a controlled finish',
    id: 'target seimbang menjaga kontak merata, manis bersih, dan akhir rasa terkendali',
    note: 'AeroPress balance target: keep even wetting, moderate agitation, and a clean stop before the hiss.',
  },
  more_sweetness: {
    ratioDelta: -0.3,
    timeDeltaSec: 10,
    stirCount: '3-4x',
    en: 'sweetness target builds the middle extraction without forcing a dry finish',
    id: 'target manis membangun ekstraksi tengah tanpa memaksa akhir rasa menjadi kering',
    note: 'AeroPress sweetness target: give the slurry slightly more contact and keep late pressure gentle.',
  },
  more_acidity: {
    ratioDelta: 0.5,
    timeDeltaSec: -20,
    stirCount: '2-3x',
    en: 'acidity target keeps the cup bright with shorter contact and light agitation',
    id: 'target keasaman menjaga cangkir tetap cerah dengan kontak lebih singkat dan agitasi ringan',
    note: 'AeroPress acidity target: keep contact shorter, agitation lighter, and do not chase body with extra pressure.',
  },
  fruit_forward: {
    ratioDelta: 0.6,
    timeDeltaSec: -15,
    stirCount: '2-3x',
    en: 'fruit-forward target protects aromatics with medium-low agitation',
    id: 'target buah menjaga aroma tetap hidup dengan agitasi rendah-sedang',
    note: 'AeroPress fruit-forward target: protect aromatics and avoid pushing natural or fermented coffees into a heavy ferment edge.',
  },
  floral_transparent: {
    ratioDelta: 0.7,
    timeDeltaSec: -30,
    stirCount: '2x',
    en: 'floral transparent target protects clarity with the lowest practical agitation',
    id: 'target floral transparan menjaga kejernihan dengan agitasi praktis paling rendah',
    note: 'AeroPress floral target: protect delicate aromatics with the lightest practical agitation and a clean early stop.',
  },
  more_body: {
    ratioDelta: -0.6,
    timeDeltaSec: 30,
    stirCount: '4x',
    en: 'body target builds texture with deeper contact and a slower press',
    id: 'target body membangun tekstur dengan kontak lebih dalam dan tekanan lebih pelan',
    note: 'AeroPress body target: build texture through contact and controlled stirring, not by forcing air through the coffee.',
  },
  soft_round: {
    ratioDelta: -0.2,
    timeDeltaSec: 5,
    stirCount: '3x',
    en: 'soft round target keeps sweetness gentle and pressure smooth',
    id: 'target bulat lembut menjaga manis tetap halus dan tekanan tetap mulus',
    note: 'AeroPress soft-round target: keep pressure smooth and avoid sharp late agitation.',
  },
  dense_comforting: {
    ratioDelta: -0.7,
    timeDeltaSec: 30,
    stirCount: '4x',
    en: 'dense comforting target builds a compact body while guarding bitterness',
    id: 'target padat nyaman membangun body kompak sambil menjaga risiko pahit',
    note: 'AeroPress dense target: build a compact body, but keep dark or earthy coffees protected from bitterness and grit.',
  },
};

const BYPASS_TARGETS: Record<string, AeroPressBaseTarget> = {
  more_acidity: {
    finalRatio: 14,
    concentrateRatio: 9,
    finishRangeSeconds: [95, 125],
    tempRangeC: [88, 90],
    bypassRangePercent: [30, 45],
    stirCount: '2-3x',
    targetNote: 'AeroPress bypass acidity target: keep contact short, bypass measured after pressing, and correct thin cups by reducing bypass before adding agitation.',
  },
  floral_transparent: {
    finalRatio: 15,
    concentrateRatio: 8.5,
    finishRangeSeconds: [90, 125],
    tempRangeC: [88, 90],
    bypassRangePercent: [35, 50],
    stirCount: '2x',
    targetNote: 'AeroPress bypass floral target: use the highest bypass share with low agitation so floral clarity is not flattened by a heavy chamber extraction.',
  },
  fruit_forward: {
    finalRatio: 13.5,
    concentrateRatio: 9,
    finishRangeSeconds: [105, 115],
    tempRangeC: [88, 90],
    bypassRangePercent: [25, 40],
    stirCount: '2-3x',
    targetNote: 'AeroPress bypass fruit-forward target: protect aromatics with medium-low agitation; for natural or fermented coffees, avoid pushing the cup into a heavy ferment edge.',
  },
  more_body: {
    finalRatio: 12.5,
    concentrateRatio: 10,
    finishRangeSeconds: [140, 180],
    tempRangeC: [88, 90],
    bypassRangePercent: [10, 25],
    stirCount: '4x',
    targetNote: 'AeroPress bypass body target: keep bypass low; if the cup still feels too light, no-bypass or sweet-body style may fit better.',
  },
  soft_round: {
    finalRatio: 12.8,
    concentrateRatio: 9.2,
    finishRangeSeconds: [120, 150],
    tempRangeC: [88, 90],
    bypassRangePercent: [20, 35],
    stirCount: '3x',
    targetNote: 'AeroPress bypass soft-round target: keep bypass moderate, press gently, and lower temperature for darker roasts.',
  },
  dense_comforting: {
    finalRatio: 12,
    concentrateRatio: 10,
    finishRangeSeconds: [145, 185],
    tempRangeC: [88, 90],
    bypassRangePercent: [10, 20],
    stirCount: '4x',
    targetNote: 'AeroPress bypass dense target: keep bypass very low because measured dilution can reduce dense body.',
  },
  more_sweetness: {
    finalRatio: 12.8,
    concentrateRatio: 9.2,
    finishRangeSeconds: [125, 160],
    tempRangeC: [88, 90],
    bypassRangePercent: [20, 35],
    stirCount: '3-4x',
    targetNote: 'AeroPress bypass sweetness target: use less bypass than acidity or floral styles and give the concentrate enough contact to build sweetness.',
  },
  balance_clean: {
    finalRatio: 13,
    concentrateRatio: 9,
    finishRangeSeconds: [115, 150],
    tempRangeC: [88, 90],
    bypassRangePercent: [25, 40],
    stirCount: '3x',
    targetNote: 'AeroPress bypass balance target: brew a clean concentrate, then add measured bypass after pressing to land strength without overworking the coffee bed.',
  },
};

export function isResolvedAeroPressStyle(value?: string): value is ResolvedAeroPressStyle {
  return ['standard', 'inverted', 'bypass', 'no_bypass', 'bright_clean', 'sweet_body'].includes(String(value));
}

export function resolveAeroPressAutoStyle(targetProfileId?: string): ResolvedAeroPressStyle {
  if (targetProfileId === 'more_acidity' || targetProfileId === 'floral_transparent' || targetProfileId === 'fruit_forward') {
    return 'bright_clean';
  }
  if (targetProfileId === 'more_body' || targetProfileId === 'dense_comforting') {
    return 'sweet_body';
  }
  return 'standard';
}

export function resolveEffectiveAeroPressStyle(
  profile: Pick<DeviceBrewProfile, 'recipeStyle'>,
  targetProfileId?: string,
): ResolvedAeroPressStyle {
  return isResolvedAeroPressStyle(profile.recipeStyle)
    ? profile.recipeStyle
    : resolveAeroPressAutoStyle(targetProfileId);
}

function resolveTargetCalibration(targetProfileId?: string) {
  return TARGET_CALIBRATION[targetProfileId || 'balance_clean'] || TARGET_CALIBRATION.balance_clean;
}

function resolveAeroPressRoastCue(roastLevel?: RoastLevel) {
  switch (roastLevel) {
    case 'light':
    case 'medium_light':
      return {
        en: 'light roast needs enough heat and restrained pressure',
        id: 'roast terang butuh suhu cukup dan tekanan tertahan',
      };
    case 'medium_dark':
      return {
        en: 'medium-dark roast needs lower heat and gentle agitation',
        id: 'roast medium-dark butuh suhu rendah dan agitasi lembut',
      };
    case 'dark':
      return {
        en: 'dark roast needs lower heat and the gentlest pressure',
        id: 'roast gelap butuh suhu rendah dan tekanan paling lembut',
      };
    case 'medium':
    default:
      return {
        en: 'medium roast stays near baseline',
        id: 'roast medium tetap dekat baseline',
      };
  }
}

function applyRoastTemperatureRange(
  tempRangeC: [number, number],
  style: ResolvedAeroPressStyle,
  roastLevel?: RoastLevel,
): [number, number] {
  let [min, max] = tempRangeC;
  const brightStyle = style === 'bright_clean';
  if (roastLevel === 'light' || roastLevel === 'medium_light') {
    min = Math.max(min, brightStyle ? 91 : 90);
    max = Math.max(max, brightStyle ? 92 : 91);
  } else if (roastLevel === 'medium_dark') {
    max = Math.min(max, brightStyle ? 90 : 89);
    min = Math.min(min, max);
  } else if (roastLevel === 'dark') {
    max = Math.min(max, brightStyle ? 89 : 88);
    min = Math.min(min, max);
  }
  return [min, max];
}

function resolveStyleTargetStirCount(
  style: ResolvedAeroPressStyle,
  targetProfileId?: string,
  targetStirCount?: string,
) {
  if (style === 'sweet_body' && (targetProfileId === 'more_sweetness' || targetProfileId === 'more_body' || targetProfileId === 'dense_comforting')) {
    return '5x';
  }
  if (style === 'inverted' && !targetStirCount) return '4x';
  return targetStirCount || STYLE_BASE[style].stirCount;
}

export function resolveAeroPressProductionTarget(
  style: ResolvedAeroPressStyle,
  targetProfileId?: string,
  roastLevel?: RoastLevel,
  brewMode: 'hot' | 'iced' = 'hot',
): AeroPressProductionTarget {
  const target = resolveTargetCalibration(targetProfileId);
  const base = style === 'bypass'
    ? BYPASS_TARGETS[targetProfileId || 'balance_clean'] || BYPASS_TARGETS.balance_clean
    : STYLE_BASE[style];
  const targetNote = base.targetNote || target.note;
  let stirCount = resolveStyleTargetStirCount(
    style,
    targetProfileId,
    style === 'bypass' ? base.stirCount : target.stirCount,
  );
  if (brewMode === 'iced') {
    stirCount = stirCount === '0x' ? '2x' : stirCount === '2x' ? '4x' : '5x';
  }
  let ratio = style === 'bypass' ? base.finalRatio : base.finalRatio + target.ratioDelta;
  if (brewMode === 'iced' && style !== 'bypass') {
    ratio -= 1.0; // Iced mode requires a tighter extraction base ratio
  }
  const finishRangeSeconds: [number, number] = style === 'bypass'
    ? base.finishRangeSeconds
    : brewMode === 'iced'
      ? [
        Math.max(60, base.finishRangeSeconds[0] + target.timeDeltaSec - 20),
        Math.max(70, base.finishRangeSeconds[1] + target.timeDeltaSec - 20),
      ]
      : [
        Math.max(75, base.finishRangeSeconds[0] + target.timeDeltaSec),
        Math.max(85, base.finishRangeSeconds[1] + target.timeDeltaSec),
      ];
  if (style !== 'bypass') {
    if (targetProfileId === 'more_acidity') {
      finishRangeSeconds[1] = Math.max(finishRangeSeconds[0], Math.min(finishRangeSeconds[1], base.finishRangeSeconds[0] - 5));
    } else if (targetProfileId === 'floral_transparent') {
      finishRangeSeconds[1] = Math.max(finishRangeSeconds[0], Math.min(finishRangeSeconds[1], base.finishRangeSeconds[0] - 10));
    } else if (targetProfileId === 'fruit_forward') {
      finishRangeSeconds[1] = Math.max(finishRangeSeconds[0], Math.min(finishRangeSeconds[1], base.finishRangeSeconds[0]));
    } else if (targetProfileId === 'more_body') {
      finishRangeSeconds[0] = Math.min(finishRangeSeconds[1], Math.max(finishRangeSeconds[0], base.finishRangeSeconds[0] + 30));
    } else if (targetProfileId === 'dense_comforting') {
      finishRangeSeconds[0] = Math.min(finishRangeSeconds[1], Math.max(finishRangeSeconds[0], base.finishRangeSeconds[0] + 35));
    }
  }
  return {
    ...base,
    finalRatio: Number(ratio.toFixed(2)),
    finishRangeSeconds,
    tempRangeC: brewMode === 'iced'
      ? [Math.min(98, base.tempRangeC[0] + 2), Math.min(98, base.tempRangeC[1] + 2)]
      : applyRoastTemperatureRange(base.tempRangeC, style, roastLevel),
    stirCount,
    targetNote: `${targetNote} Roast guard: ${resolveAeroPressRoastCue(roastLevel).en}.${brewMode === 'iced' ? ' Iced mode tightens ratio and adds agitation.' : ''}`,
    targetCue: {
      en: target.en,
      id: target.id,
    },
    roastCue: resolveAeroPressRoastCue(roastLevel),
  };
}
