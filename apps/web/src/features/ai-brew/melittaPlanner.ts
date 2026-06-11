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
  const { input, dripper, profile, doseG } = params;
  const targetId = params.targetProfile?.id || '';
  const style = input.melittaStyle || 'auto';
  const isAromaboy = dripper.id.toLowerCase().includes('aromaboy') || dripper.name.toLowerCase().includes('aromaboy');

  let activeStyle = style;
  if (style === 'auto') {
    if (isAromaboy) {
      activeStyle = 'aromaboy_style';
    } else if (input.brewMode === 'iced') {
      activeStyle = 'iced_melitta_brew';
    } else if (targetId === 'more_body' || targetId === 'dense_comforting') {
      activeStyle = 'dense_classic_extraction';
    } else if (targetId === 'more_sweetness' || targetId === 'fruit_forward' || targetId === 'more_acidity') {
      activeStyle = 'three_pour_melitta';
    } else if (targetId === 'balance_clean' || targetId === 'soft_round' || targetId === 'floral_transparent') {
      activeStyle = 'traditional_melitta_one_pour';
    } else {
      // Fallback based on roast
      if (input.roastLevel === 'light') {
        activeStyle = 'three_pour_melitta';
      } else {
        activeStyle = 'traditional_melitta_one_pour';
      }
    }
  }

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
          note: 'Bloom by pouring water from the center line outward. Wet the trapezoid bed evenly. Let bloom for 35 seconds.',
        },
        {
          id: 'one_fill',
          label: 'Continuous Center Fill',
          kind: 'pour',
          share: 0.85,
          startSeconds: 35,
          note: 'Pour slowly and compactly along the center line. Do not pour too close to the edges. Let the trapezoid geometry manage the flow rate.',
        },
        {
          id: 'slow_drain',
          label: 'Trapezoid Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 120,
          note: 'Allow water to drip through the bottom holes. The trapezoid shape provides stable, classic extraction. Mix the server.',
        },
      ];
      why = 'Traditional Melitta One-Pour uses classic trapezoid wedge geometry and center pouring to yield a balanced cup with rounded sweetness.';
      watch = 'Check exit holes. Coffee residues can restrict drainage. Avoid high edge pouring to prevent water bypassing the bed through filter seams.';
      break;

    case 'aromaboy_style':
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = 1.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'machine_cycle',
          label: 'Start Machine Cycle',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Start the machine. The water reservoir heats up and drips water automatically over the coffee bed. Let the automated machine-controlled flow run.',
        },
        {
          id: 'micro_drain',
          label: 'Aromaboy Finish & Mix',
          kind: 'serve',
          share: 0,
          startSeconds: 100,
          note: 'Wait for the automated cycle to finish. Once brewing is complete, mix the brewed coffee in the server to integrate the extraction.',
        },
      ];
      why = 'Aromaboy Style uses automatic small-batch workflow, relying on the machine-controlled flow cycle to deliver a simple daily brew.';
      watch = 'Aromaboy has machine-controlled flow. Do not use manual pulse-pours or try to agitate during the cycle.';
      break;

    case 'three_pour_melitta':
      adjustedProfile.ratioDelta = 0.3;
      adjustedProfile.tempDeltaC = -1.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Center Line Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Bloom from the center line outward. Ensure all corners in the narrow trapezoid bed are wet. Let bloom for 40 seconds.',
        },
        {
          id: 'pour_2',
          label: 'Center Pulse 2',
          kind: 'pour',
          share: 0.45,
          startSeconds: 40,
          note: 'Pour compact pulses along the center line. Keep water off the edges to protect sweetness. Let it drain slightly.',
        },
        {
          id: 'pour_3',
          label: 'Center Pulse 3',
          kind: 'pour',
          share: 0.4,
          startSeconds: 90,
          note: 'Pour the final portion in a tight line along the center. Settle the bed level and let it drain.',
        },
        {
          id: 'drawdown',
          label: 'Stable Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 150,
          note: 'Let the trapezoid bed drain completely without scraping the paper. Mix the server thoroughly.',
        },
      ];
      why = 'Three Pour Melitta splits water volume into three center-line pulses to prolong contact, extracting high sweetness and fruit-forward flavor.';
      watch = 'High water level. Avoid edge pouring to prevent water bypassing the coffee bed entirely through the trapezoid seams.';
      break;

    case 'iced_melitta_brew':
      adjustedProfile.ratioDelta = -2.0;
      adjustedProfile.tempDeltaC = 2.0;
      adjustedProfile.grindBias = 'finer';
      if (doseG >= 24) {
        adjustedProfile.steps = [
          {
            id: 'bloom',
            label: 'Concentrated Bloom',
            kind: 'pour',
            share: 0.15,
            startSeconds: 0,
            note: 'Bloom from the center line outward with hot water. Keep the extraction concentrated directly over ice. Let bloom for 30 seconds.',
          },
          {
            id: 'ice_pour_1',
            label: 'Center line Pulse 1',
            kind: 'pour',
            share: 0.25,
            startSeconds: 30,
            note: 'Pour hot water in compact center-line pulses. Keep water off the edges.',
          },
          {
            id: 'ice_pour_2',
            label: 'Center line Pulse 2',
            kind: 'pour',
            share: 0.20,
            startSeconds: 55,
            note: 'Pour hot water along the center line to prevent bypass through trapezoid seams.',
          },
          {
            id: 'ice_pour_3',
            label: 'Center line Pulse 3',
            kind: 'pour',
            share: 0.20,
            startSeconds: 80,
            note: 'Pour hot water in compact center-line pulses to keep the narrow bed saturated.',
          },
          {
            id: 'ice_pour_4',
            label: 'Center Finish',
            kind: 'pour',
            share: 0.20,
            startSeconds: 105,
            note: 'Pour the final hot water portion along the center line. The concentrate drips directly over ice to chill instantly.',
          },
          {
            id: 'chill_finish',
            label: 'Trapezoid Iced Finish',
            kind: 'drawdown',
            share: 0,
            startSeconds: 140,
            note: 'Swirl the server to melt the remaining ice, ensuring a rich, non-watery cold trapezoid pour-over.',
          },
        ];
      } else {
        adjustedProfile.steps = [
          {
            id: 'bloom',
            label: 'Concentrated Bloom',
            kind: 'pour',
            share: 0.2,
            startSeconds: 0,
            note: 'Bloom from the center line outward with hot water. Keep the extraction concentrated directly over ice. Let bloom for 30 seconds.',
          },
          {
            id: 'ice_pour_1',
            label: 'Center line Pulse',
            kind: 'pour',
            share: 0.5,
            startSeconds: 30,
            note: 'Pour hot water in compact center-line pulses. Keep water off the edges. The narrow bed extracts high solids.',
          },
          {
            id: 'ice_pour_2',
            label: 'Center Finish',
            kind: 'pour',
            share: 0.3,
            startSeconds: 65,
            note: 'Pour the final hot water portion along the center line. The concentrate drips directly over ice to chill instantly.',
          },
          {
            id: 'chill_finish',
            label: 'Trapezoid Iced Finish',
            kind: 'drawdown',
            share: 0,
            startSeconds: 110,
            note: 'Swirl the server to melt the remaining ice, ensuring a rich, non-watery cold trapezoid pour-over.',
          },
        ];
      }
      why = 'Iced Melitta Brew extracts a concentrated hot yield along the center line of the trapezoid wedge directly over ice.';
      watch = 'Hot water and ice split. Verify that the hot water volume is correctly split from the ice to prevent a watery brew.';
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
          note: 'Bloom from the center line outward with a slow center pour. Let bloom for 45 seconds. Do not stir to avoid clogging.',
        },
        {
          id: 'slow_oval_pulse_1',
          label: 'Slow Center Pulse 1',
          kind: 'pour',
          share: 0.45,
          startSeconds: 45,
          note: 'Pour slowly along the center line. Warning: Bitterness and narrow bed over-extraction risk. Keep pulses tight.',
        },
        {
          id: 'slow_oval_pulse_2',
          label: 'Slow Center Pulse 2',
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
          note: 'Allow dripper to drain fully. Warning: Bitterness and astringency may occur if flow stalls completely. Mix the server.',
        },
      ];
      why = 'Dense Classic Extraction uses a fine grind and extended contact time to extract a deep body and dense chocolatey sweetness.';
      watch = 'Bitterness and over-extraction. The narrow trapezoid bed has higher risk of over-extraction. Grind slightly coarser if bitterness is too high.';
      break;
  }

  // Apply Roast Level adjustments
  if (input.roastLevel === 'light') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) + 1.5;
    const lightRoastNote = 'Light roast: higher temperature applied to help extraction in the trapezoid bed.';
    why = why ? `${lightRoastNote} ${why}` : lightRoastNote;
  } else if (input.roastLevel === 'medium_dark') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 1.0;
    const medDarkNote = 'Medium-dark roast: lower temperature applied to reduce bitter compounds extraction.';
    why = why ? `${medDarkNote} ${why}` : medDarkNote;
  } else if (input.roastLevel === 'dark') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 2.0;
    adjustedProfile.grindBias = 'coarser';
    const darkRoastNote = 'Dark roast: lower temperature and short contact time applied to avoid extracting rustic bitterness.';
    watch = watch ? `${darkRoastNote} ${watch}` : darkRoastNote;
  }

  // Aromaboy iced server safety warning
  if (isAromaboy && input.brewMode === 'iced') {
    const safetyWarn = 'Aromaboy Iced warning: Ensure your glass server is safe for direct icing; automatic flow could cause thermal shock if safety is not verified.';
    watch = watch ? `${safetyWarn} ${watch}` : safetyWarn;
  }

  // Floral target suitability warning
  if (targetId === 'floral_transparent') {
    const suitabilityWarn = 'Warning: Melitta trapezoid brewer has lower suitability/fit for delicate floral profiles than V60 or Origami cone drippers.';
    watch = watch ? `${suitabilityWarn} ${watch}` : suitabilityWarn;
  }

  adjustedProfile.recipeStyle = activeStyle as DeviceBrewProfile['recipeStyle'];

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
