import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  OrigamiRecipeStyle,
} from './types.ts';

export interface OrigamiPlanSelection {
  style: OrigamiRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isOrigamiDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  return haystack.includes('origami');
}

export function resolveOrigamiPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): OrigamiPlanSelection {
  const { input, profile, doseG } = params;
  const style = input.origamiStyle || 'auto';
  if (style === 'auto') {
    return {
      style: 'auto',
      adjustedProfile: profile,
      why: 'Origami Auto style utilizes the default catalog extraction profile to deliver a highly balanced cup.',
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
    case 'cone_dripper_style':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.2,
          startSeconds: 0,
          note: 'Use a V60 cone paper filter. Wet all grounds quickly with tight concentric circles to initiate degassing. Wait 40 seconds.',
        },
        {
          id: 'second_pour',
          label: 'Second Pour',
          kind: 'pour',
          share: 0.45,
          startSeconds: 40,
          note: 'Pour in slow concentric rings; the 20 deep ribs allow air to vent rapidly, facilitating a fast flow rate.',
        },
        {
          id: 'final_pour',
          label: 'Final Pour',
          kind: 'pour',
          share: 0.35,
          startSeconds: 90,
          note: 'Complete the volume with a gentle center pour. Do not swirl the dripper to avoid clogging the exit hole.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 150,
          note: 'Let the brew drain rapidly. Cone filters highlight high brightness and sparkling acidity.',
        },
      ];
      why = 'Cone Dripper style utilizes standard conical papers and Origami\'s deep air channels to achieve a fast, high-flow drawdown, bringing out stellar floral acidity.';
      watch = 'Fast drawdown check. If the flow is too fast, grind slightly finer to build adequate contact pressure inside the cone bed.';
      break;

    case 'wave_dripper_style':
      adjustedProfile.ratioDelta = 0.2;
      adjustedProfile.tempDeltaC = -0.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Insert a flat-bottom Kalita Wave filter paper. Pour warm water over the center bed. Let it saturate evenly.',
        },
        {
          id: 'pulse_2',
          label: 'Pulse 2',
          kind: 'pour',
          share: 0.3,
          startSeconds: 35,
          note: 'Pour in a slow center concentric circle. The wave ridges restrict bypass flow, maintaining a deep coffee column.',
        },
        {
          id: 'pulse_3',
          label: 'Pulse 3',
          kind: 'pour',
          share: 0.3,
          startSeconds: 75,
          note: 'Pour gently in the center. The flat-bottom contact creates high extraction contact time, maximizing sweetness.',
        },
        {
          id: 'pulse_4',
          label: 'Final Pulse',
          kind: 'pour',
          share: 0.25,
          startSeconds: 110,
          note: 'Execute a calm concentric circle to rinse the coffee bed down level. Let drain.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 170,
          note: 'Flat-bottom extraction yields heavy body, deep chocolate sweetness, and low bitterness.',
        },
      ];
      why = 'Wave Dripper style mounts a flat-bottom filter to restrict water flow through the bottom flutes, extending extraction contact to maximize deep sugars and heavy body.';
      watch = 'Crushed ridges. Take care not to crush the wave filter\'s paper ridges during installation; deformed ridges will cause uneven side bypass.';
      break;

    case 'mugen_one_pour':
      adjustedProfile.ratioDelta = -0.4;
      adjustedProfile.tempDeltaC = 0.5;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'rinse_bed',
          label: 'Rinse & Setup',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Use a V60 cone paper. Rinse with hot water. Dose coffee slightly coarser, and make a small well in the center.',
        },
        {
          id: 'one_pour_phase',
          label: 'Continuous Slow Pour',
          kind: 'pour',
          share: 1.0,
          startSeconds: 10,
          note: 'Pour all water continuously in a highly controlled, very slow center stream. Total pour duration should take exactly 90 seconds.',
        },
        {
          id: 'drawdown_mugen',
          label: 'Slow Mugen Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 100,
          note: 'Let the water percolate through the bed completely. Heavy sweetness and extreme clarity due to zero agitation.',
        },
      ];
      why = 'Mugen One-Pour utilizes a slow, uninterrupted center stream with zero pulse agitations to produce a crystal-clear cup with sweet, delicate undertones.';
      watch = 'Pour speed. If you pour too fast, water will overflow the coffee bed. Keep the flow rate narrow and slow (approx. 2-3g/second).';
      break;

    case 'iced_origami':
      adjustedProfile.ratioDelta = -2.2;
      adjustedProfile.tempDeltaC = 2.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'ice_prep',
          label: 'Ice Setup & Bloom',
          kind: 'pour',
          share: 0.2,
          startSeconds: 0,
          note: 'Fit a cone filter. Place 130g of clean ice in the server. Wet grounds with aggressive high-temperature concentric circles.',
        },
        {
          id: 'heavy_pulse_1',
          label: 'Intense Pulse 1',
          kind: 'pour',
          share: 0.5,
          startSeconds: 30,
          note: 'Pour rapidly in the center. High flow rate is critical to dissolve dense solids before the ice melting begins.',
        },
        {
          id: 'heavy_pulse_2',
          label: 'Intense Pulse 2',
          kind: 'pour',
          share: 0.3,
          startSeconds: 65,
          note: 'Execute a fast final circle to top up the volume. The high water pressure agitates grounds deeply.',
        },
        {
          id: 'drawdown',
          label: 'Decant & Serve',
          kind: 'drawdown',
          share: 0,
          startSeconds: 110,
          note: 'The concentrate drips directly over ice, chilling instantly and preserving bright, citrusy acidity.',
        },
      ];
      why = 'Iced Origami leverages the fast flow rate of the cone filter to drip a rich, dense concentrate rapidly over ice, preserving sparkling volatiles.';
      watch = 'Ice volume. Ensure you weigh the ice accurately; excessive ice will dilute the concentrate, resulting in a thin, watery mouthfeel.';
      break;

    case 'competition_hybrid_flow':
      adjustedProfile.ratioDelta = 0.4;
      adjustedProfile.tempDeltaC = 1.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Turbulent Bloom',
          kind: 'pour',
          share: 0.2,
          startSeconds: 0,
          note: 'Use a V60 cone filter. Pour aggressively in center circles and stir gently 3 times with a spoon to wet all grounds. Let bloom 35 seconds.',
        },
        {
          id: 'pulse_concentric',
          label: 'Concentric Ring Pulse',
          kind: 'pour',
          share: 0.4,
          startSeconds: 35,
          note: 'Pour in rapid concentric circles, climbing up the dry filter walls to wash high grounds down into the slurry.',
        },
        {
          id: 'pulse_slow_center',
          label: 'Slow Center Finish',
          kind: 'pour',
          share: 0.4,
          startSeconds: 85,
          note: 'Pour the final portion in an extremely slow, calm center stream to let the fine bed settle and extract deep sweetness.',
        },
        {
          id: 'drawdown',
          label: 'Level Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 145,
          note: 'Allow the bed to settle completely flat. Excellent complex acidity coupled with a sweet, long finish.',
        },
      ];
      why = 'Competition Hybrid Flow combines aggressive high-flow turbulent pulses for brightness with a slow center-drip finish to extract sweet heavy oils.';
      watch = 'Over-agitation. Stirring too aggressively in the final phase will cause extreme bitterness and bypass clogging. Keep the final pour calm.';
      break;
  }

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
