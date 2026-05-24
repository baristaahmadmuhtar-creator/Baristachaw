import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewPlanStep,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  KalitaWaveRecipeStyle,
} from './types.ts';

export interface KalitaPlanSelection {
  style: KalitaWaveRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isKalitaWaveDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  return haystack.includes('kalita') && haystack.includes('wave');
}

export function resolveKalitaPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): KalitaPlanSelection {
  const { input, profile, doseG } = params;
  const style = input.kalitaWaveStyle || 'auto';
  
  // Resolve active style
  let activeStyle: KalitaWaveRecipeStyle = style;
  if (style === 'auto') {
    if (input.brewMode === 'iced') {
      activeStyle = 'iced_wave';
    } else if (doseG >= 24) {
      activeStyle = 'high_dose_concentrate';
    } else {
      activeStyle = 'traditional_flat_three';
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
    case 'traditional_flat_three':
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
          note: 'Saturate the small wave bed edge to edge and let it settle level.',
        },
        {
          id: 'second_pour',
          label: 'Second Pour',
          kind: 'pour',
          share: 0.45,
          startSeconds: 35,
          note: 'Pour mostly center with a small ring; keep slurry low and the bed flat.',
        },
        {
          id: 'final_pour',
          label: 'Final Pour',
          kind: 'pour',
          share: 0.35,
          startSeconds: 85,
          note: 'Top up evenly without a wide spiral or last-second swirl.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 155,
          note: 'Let it finish flat and tidy before serving.',
        },
      ];
      why = 'Traditional Flat Three-Pour uses three distinct, calm pours to keep a flat bed and a consistent, clean extraction. Ideal for balanced sweetness.';
      watch = 'Watch for side-channeling. Do not pour too close to the filter paper ridges to preserve the wave bypass effect.';
      break;

    case 'competition_fast_four':
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
          note: 'Pour aggressively in center circles to wet all grounds quickly.',
        },
        {
          id: 'pulse_2',
          label: 'Pulse 2',
          kind: 'pour',
          share: 0.30,
          startSeconds: 30,
          note: 'Pour with high flow rate in tight center concentric circles to agitate deeply.',
        },
        {
          id: 'pulse_3',
          label: 'Pulse 3',
          kind: 'pour',
          share: 0.30,
          startSeconds: 60,
          note: 'Pour with high flow rate in tight center concentric circles, creating high extraction velocity.',
        },
        {
          id: 'pulse_4',
          label: 'Pulse 4',
          kind: 'pour',
          share: 0.25,
          startSeconds: 90,
          note: 'Final rapid concentric pulse, keeping the water level low to drain quickly.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 125,
          note: 'Let it drain rapidly; the bed must settle perfectly flat.',
        },
      ];
      why = 'Competition Fast Four-Pour utilizes four fast concentric pulses to maximize water-coffee agitation, bringing out high acidity and bright clarity.';
      watch = 'Slurry level control is critical. Do not let the water level rise too high, or the fast drawdown will become muddy.';
      break;

    case 'continuous_slow_stream':
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
          note: 'Pour gently in the center to pre-wet the grounds.',
        },
        {
          id: 'continuous_slow_pour',
          label: 'Continuous Slow Pour',
          kind: 'pour',
          share: 0.85,
          startSeconds: 35,
          note: 'Maintain an extremely low, slow, continuous centered flow. Keep a constant water column.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 175,
          note: 'Stop pouring and let the level column drain slowly for heavy body and high sweetness.',
        },
      ];
      why = 'Continuous Slow Stream keeps a constant water column using a gentle, slow centered flow, yielding an exceptionally sweet cup with a velvety body.';
      watch = 'Maintain a steady hand. Fluctuations in flow rate will disturb the flat bed structure and ruin extraction balance.';
      break;

    case 'iced_wave':
      adjustedProfile.ratioDelta = -0.65; // High concentration split
      adjustedProfile.tempDeltaC = 1.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.20,
          startSeconds: 0,
          note: 'Bloom hot onto the dry bed; let gassing complete quickly.',
        },
        {
          id: 'concentric_pour_1',
          label: 'Concentric Pour 1',
          kind: 'pour',
          share: 0.40,
          startSeconds: 30,
          note: 'Pour hot water in quick center circles, keeping slurry low and extraction concentrated.',
        },
        {
          id: 'concentric_pour_2',
          label: 'Concentric Pour 2',
          kind: 'pour',
          share: 0.40,
          startSeconds: 70,
          note: 'Final concentric hot pour, draining rapidly directly onto the ice bed.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 115,
          note: 'Let the final drops drain and swirl the server to melt the remaining ice completely.',
        },
      ];
      why = 'Iced Wave uses a concentrated hot extraction poured directly over pre-weighed ice, preserving bright, volatile fruit acids and clean sweetness.';
      watch = 'Drip path control. Ensure the hot concentrate drips directly onto the ice core for immediate thermal locking and aroma preservation.';
      break;

    case 'high_dose_concentrate':
      adjustedProfile.ratioDelta = -2.5; // Intense tight ratio
      adjustedProfile.tempDeltaC = -1.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.20,
          startSeconds: 0,
          note: 'Wet the thick bed slowly; let gas release from the high dose.',
        },
        {
          id: 'concentrate_pour_1',
          label: 'Concentrate Pour 1',
          kind: 'pour',
          share: 0.40,
          startSeconds: 40,
          note: 'Pour in slow center concentric rings, keeping the slurry level low to avoid bypass.',
        },
        {
          id: 'concentrate_pour_2',
          label: 'Concentrate Pour 2',
          kind: 'pour',
          share: 0.40,
          startSeconds: 90,
          note: 'Final slow concentric pour to wash the bed; avoid agitating the filter paper walls.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 145,
          note: 'Let the thick, rich concentrate finish draining. Serve neat or dilute with fresh water.',
        },
      ];
      why = 'High-Dose Concentrate extracts a rich, heavy coffee essence using a large coffee dose and a tight water ratio. Offers deep sweetness and huge mouthfeel.';
      watch = 'Prevent clogging. A coarser grind and zero circular agitation are required to stop the large coffee bed from stalling at the bottom holes.';
      break;
  }

  // Adjust label
  const dripperLabel = adjustedProfile.label.includes('155') ? '155' : '185';
  adjustedProfile.label = `Kalita Wave ${dripperLabel} - ${activeStyle.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
  adjustedProfile.recipeStyle = activeStyle as any;

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
