import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  MelittaRecipeStyle,
} from './types.ts';

export interface MelittaPlanSelection {
  style: MelittaRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isMelittaDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  return haystack.includes('melitta') || haystack.includes('trapezoid') || haystack.includes('aromaboy');
}

export function resolveMelittaPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): MelittaPlanSelection {
  const { input, profile, doseG } = params;
  const style = input.melittaStyle || 'auto';
  if (style === 'auto') {
    return {
      style: 'auto',
      adjustedProfile: profile,
      why: 'Melitta Auto style utilizes the default catalog extraction profile to deliver a highly balanced cup.',
      watch: 'Ensure proper water distribution and level bed for even extraction.',
    };
  }

  const activeStyle = style;

  const adjustedProfile: DeviceBrewProfile = {
    ...profile,
    steps: [],
  };

  let why = '';
  let watch = '';

  switch (activeStyle) {
    case 'traditional_melitta_one_pour':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Wedge Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Wet the trapezoidal coffee bed evenly. Because the wedge bottom is narrow, ensure all dry corners in the bottom fold are wet. Bloom 35 seconds.',
        },
        {
          id: 'one_fill',
          label: 'Continuous Wedge Fill',
          kind: 'pour',
          share: 0.85,
          startSeconds: 35,
          note: 'Pour slowly in a long oval spiral (matching the wedge geometry) until the dripper is filled. Let it drain continuously.',
        },
        {
          id: 'slow_drain',
          label: 'Trapezoid Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 120,
          note: 'Allow water to drip through the 1 or 2 small holes at the bottom. The trapezoid shape provides stable, classic extraction.',
        },
      ];
      why = 'Traditional Melitta One-Pour relies on the restricted bottom hole flow rate and trapezoid wedge geometry to extract coffee evenly with minimal manual pouring effort.';
      watch = 'Check bottom hole blockage. Old coffee residues inside the tiny bottom hole will restrict drainage, making drawdown extremely slow and bitter. Clean thoroughly.';
      break;

    case 'aromaboy_style':
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = 1.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Micro Bloom',
          kind: 'pour',
          share: 0.2,
          startSeconds: 0,
          note: 'For small doses (8-10g), bloom gently with a tiny splash of water. Let sit for 30 seconds.',
        },
        {
          id: 'micro_pour_1',
          label: 'Micro Oval Pour 1',
          kind: 'pour',
          share: 0.4,
          startSeconds: 30,
          note: 'Pour in a small, tight oval circle in the center. The narrow wedge bed extracts solids efficiently.',
        },
        {
          id: 'micro_pour_2',
          label: 'Micro Oval Pour 2',
          kind: 'pour',
          share: 0.4,
          startSeconds: 65,
          note: 'Execute a final gentle oval pulse. Let the small column drain rapidly.',
        },
        {
          id: 'micro_drain',
          label: 'Aromaboy Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: 100,
          note: 'Let the small volume drain completely. Classic, cozy, and highly aromatic micro-brew.',
        },
      ];
      why = 'Aromaboy Style is custom-calibrated for tiny specialty coffee doses (8-12g), using micro oval pulses to keep the shallow bed hot and avoid under-extraction.';
      watch = 'Bed depth. Small doses create a very thin bed. Keep your pour flow extremely narrow to avoid piercing the paper filter.';
      break;

    case 'three_pour_melitta':
      adjustedProfile.ratioDelta = 0.3;
      adjustedProfile.tempDeltaC = -1.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Wedge Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Pour in an oval pattern. Wet all grounds and let bloom for 40 seconds.',
        },
        {
          id: 'pour_2',
          label: 'Oval Pour 2',
          kind: 'pour',
          share: 0.45,
          startSeconds: 40,
          note: 'Pour in slow oval circles. Keep water level medium. The flat wedge walls help to extract rich, sweet chocolate notes.',
        },
        {
          id: 'pour_3',
          label: 'Oval Pour 3',
          kind: 'pour',
          share: 0.4,
          startSeconds: 90,
          note: 'Pour the final portion in an oval concentric pattern. Settle the coffee bed level and let it drain.',
        },
        {
          id: 'drawdown',
          label: 'Stable Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 150,
          note: 'Trapezoidal wedge extraction filters out bitter tannins, delivering a smooth, comforting classic coffee.',
        },
      ];
      why = 'Three Pour Melitta splits water volume into three slow oval pulses to extend contact time, maximizing sweet chocolate oils and balancing rustic body.';
      watch = 'High water line. Avoid pouring too high on the trapezoid side ribs; water will bypass the bed entirely through the paper seams.';
      break;

    case 'iced_melitta_brew':
      adjustedProfile.ratioDelta = -2.0;
      adjustedProfile.tempDeltaC = 2.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'ice_setup',
          label: 'Wedge Ice Setup',
          kind: 'pour',
          share: 0.2,
          startSeconds: 0,
          note: 'Place 120g of clean ice in the server. Pour boiling water over grounds in an oval shape. Let bloom for 30 seconds.',
        },
        {
          id: 'ice_pour_1',
          label: 'Oval Concentrated Pour 1',
          kind: 'pour',
          share: 0.5,
          startSeconds: 30,
          note: 'Pour in rapid oval circles to extract deep sugars. Keep grind finer to resist flow and increase dissolved solids.',
        },
        {
          id: 'ice_pour_2',
          label: 'Oval Concentrated Pour 2',
          kind: 'pour',
          share: 0.3,
          startSeconds: 65,
          note: 'Pour the final portion in the center. The dense wedge concentrate drips directly over ice to chill instantly.',
        },
        {
          id: 'chill_finish',
          label: 'Trapezoid Iced Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: 110,
          note: 'Swirl the chilled coffee to melt the remaining ice, ensuring a rich, non-watery cold trapezoid pour-over.',
        },
      ];
      why = 'Iced Melitta Brew leverages the restricted bottom flow of the trapezoid wedge to extract a highly concentrated, rich coffee yield directly over ice.';
      watch = 'Ice volume. Ensure you weigh the ice accurately; excessive ice will dilute the concentrate, resulting in a thin, watery mouthfeel.';
      break;

    case 'dense_classic_extraction':
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = -1.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'dense_bloom',
          label: 'Dense Wedge Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Pour a tight center oval. Let bloom for 45 seconds. The fine grind requires extra time to degas properly.',
        },
        {
          id: 'slow_oval_pulse_1',
          label: 'Slow Oval Pulse 1',
          kind: 'pour',
          share: 0.45,
          startSeconds: 45,
          note: 'Pour in extremely slow concentric ovals. The fine grind restricts flow, causing water to build contact time.',
        },
        {
          id: 'slow_oval_pulse_2',
          label: 'Slow Oval Pulse 2',
          kind: 'pour',
          share: 0.4,
          startSeconds: 100,
          note: 'Pour final portion slowly in the center. Allow a long, slow percolation through the trapezoidal paper wedge.',
        },
        {
          id: 'long_drawdown',
          label: 'Long Drawdown Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: 175,
          note: 'Allow dripper to drain fully. The long extraction window captures rich bitter-chocolate and heavy sweet notes.',
        },
      ];
      why = 'Dense Classic Extraction utilizes a fine grind and extended contact time inside the trapezoid dripper to extract heavy sweet compounds, reminiscent of classic dark-chocolate roasts.';
      watch = 'Dry sputtering. If the drawdown takes too long (over 4 minutes), the coffee will turn dry and astringent. Coarsen grind slightly on next attempt.';
      break;
  }

  adjustedProfile.recipeStyle = activeStyle as DeviceBrewProfile['recipeStyle'];

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
