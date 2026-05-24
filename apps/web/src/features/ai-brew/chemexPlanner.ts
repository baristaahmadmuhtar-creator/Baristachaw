import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewPlanStep,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  ChemexRecipeStyle,
} from './types.ts';

export interface ChemexPlanSelection {
  style: ChemexRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isChemexDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  return haystack.includes('chemex');
}

export function resolveChemexPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): ChemexPlanSelection {
  const { input, profile, doseG } = params;
  const style = input.chemexStyle || 'auto';
  
  // Resolve active style
  let activeStyle: ChemexRecipeStyle = style;
  if (style === 'auto') {
    if (input.brewMode === 'iced') {
      activeStyle = 'iced_chemex';
    } else if (doseG >= 24) {
      activeStyle = 'high_dose_heavy_body';
    } else {
      activeStyle = 'traditional_three_pour';
    }
  }

  // Clone profile to avoid modifying catalog
  const adjustedProfile: DeviceBrewProfile = {
    ...profile,
    steps: [],
  };

  let why = '';
  let watch = '';

  switch (activeStyle) {
    case 'traditional_three_pour':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.20,
          startSeconds: 0,
          note: 'Wet all grounds gently. Keep the bloom level and wait for gas escape.',
        },
        {
          id: 'second_pour',
          label: 'Second Pour',
          kind: 'pour',
          share: 0.45, // Set slightly higher to match sweet centered flat-cone extraction physics
          startSeconds: 40,
          note: 'Pour in slow concentric rings; keep water off the thick paper walls.',
        },
        {
          id: 'final_pour',
          label: 'Final Pour',
          kind: 'pour',
          share: 0.35,
          startSeconds: 90,
          note: 'Gently top up in the center; allow a slow percolation through thick wood-fiber.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 165,
          note: 'Let it drain completely. The thick filter will ensure maximum clarity.',
        },
      ];
      why = 'Traditional Three-Pour utilizes three balanced pours to extract sweet, clean, and clear flavors through Chemex\'s dense filter.';
      watch = 'Paper stick. Ensure the 3-fold side of the filter is aligned with the pouring spout to avoid blocking air venting.';
      break;

    case 'competition_multi_pulse':
      adjustedProfile.ratioDelta = 0.2;
      adjustedProfile.tempDeltaC = 1.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Pour aggressively in tight center circles to agitate all grounds.',
        },
        {
          id: 'pulse_2',
          label: 'Pulse 2',
          kind: 'pour',
          share: 0.25,
          startSeconds: 30,
          note: 'Pour quickly in the center; keep flow rate high to create extraction velocity.',
        },
        {
          id: 'pulse_3',
          label: 'Pulse 3',
          kind: 'pour',
          share: 0.20,
          startSeconds: 55,
          note: 'Execute a rapid concentric pulse. The high water column will push extraction through the paper.',
        },
        {
          id: 'pulse_4',
          label: 'Pulse 4',
          kind: 'pour',
          share: 0.20,
          startSeconds: 80,
          note: 'Fourth quick pulse; keep the center bed agitated.',
        },
        {
          id: 'pulse_5',
          label: 'Pulse 5',
          kind: 'pour',
          share: 0.20,
          startSeconds: 105,
          note: 'Final fast concentric pulse. Keep the slurry low at the end.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 145,
          note: 'Snappy drawdown finishes with a perfectly level bed.',
        },
      ];
      why = 'Competition Fast Multiple-Pulse uses five fast pulses to keep water velocity high, counteracting the thick filter paper to capture vibrant fruit acids.';
      watch = 'Clogging. If your grind is too fine, the multiple agitations will cause fine particles to lock the paper, stalling the flow.';
      break;

    case 'continuous_center_pour':
      adjustedProfile.ratioDelta = -0.3;
      adjustedProfile.tempDeltaC = -1.5;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Wet the grounds with a gentle center pour; do not swirl.',
        },
        {
          id: 'continuous_pour',
          label: 'Continuous Pour',
          kind: 'pour',
          share: 0.85,
          startSeconds: 35,
          note: 'Pour in a tiny, constant centered stream. Do not let the water level rise too high.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 180,
          note: 'Stop pouring and let the heavy water column settle for sweet, syrupy clarity.',
        },
      ];
      why = 'Continuous Center-Pour maintains a steady, slow centered stream to minimize bypass through the thick paper, producing a sweet and highly balanced cup.';
      watch = 'Steady flow rate is crucial. A fluctuating stream will break the coffee bed structure and create uneven extraction lanes.';
      break;

    case 'iced_chemex':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 1.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.20,
          startSeconds: 0,
          note: 'Pour hot over dry grounds. Ensure the glass carafe is pre-loaded with ice.',
        },
        {
          id: 'iced_pour_1',
          label: 'Iced Pour 1',
          kind: 'pour',
          share: 0.40,
          startSeconds: 35,
          note: 'Pour hot concentrate in concentric circles; keep water off the thick paper.',
        },
        {
          id: 'iced_pour_2',
          label: 'Iced Pour 2',
          kind: 'pour',
          share: 0.40,
          startSeconds: 75,
          note: 'Final slow center pour. The hot liquor will drip directly over the ice.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 120,
          note: 'Let the final drops drain and swirl the carafe to melt remaining ice.',
        },
      ];
      why = 'Iced Chemex uses a concentrated hot percolation dripping directly onto ice inside the elegant glass carafe, sealing in bright, crisp aromatics.';
      watch = 'Ice melting rate. Ensure ice is fully pre-weighed so the final iced ratio matches your target profile.';
      break;

    case 'high_dose_heavy_body':
      adjustedProfile.ratioDelta = -2.2;
      adjustedProfile.tempDeltaC = -1.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.20,
          startSeconds: 0,
          note: 'Wet the thick bed slowly; let the large dose degas completely.',
        },
        {
          id: 'body_pour_1',
          label: 'Body Pour 1',
          kind: 'pour',
          share: 0.40,
          startSeconds: 45,
          note: 'Pour in slow, thick center rings. A coarser grind is used to prevent bypass.',
        },
        {
          id: 'body_pour_2',
          label: 'Body Pour 2',
          kind: 'pour',
          share: 0.40,
          startSeconds: 95,
          note: 'Final slow center pour to wash the heavy bed without agitating the walls.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 155,
          note: 'Allow a slow, heavy drawdown to finish. Yields maximum body.',
        },
      ];
      why = 'High-Dose Heavy-Body extracts a deep, syrupy mouthfeel by combining a large coffee dose, a coarse grind, and slow centered pulses.';
      watch = 'Spout bypass. Do not pour too close to the three-fold filter spout to keep bypass water from diluting the syrupy body.';
      break;
  }

  // Adjust label
  adjustedProfile.label = `Chemex - ${activeStyle.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
