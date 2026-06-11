import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  KonoRecipeStyle,
} from './types.ts';

export interface KonoPlanSelection {
  style: KonoRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isKonoDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  return haystack.includes('kono') || haystack.includes('meimon');
}

export function resolveKonoPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): KonoPlanSelection {
  const { input, dripper, profile, doseG } = params;
  const targetId = params.targetProfile?.id || '';
  const style = input.konoStyle || 'auto';

  let activeStyle = style;
  if (style === 'auto') {
    if (input.brewMode === 'iced') {
      activeStyle = 'iced_kono_meimon';
    } else if (targetId === 'more_body' || targetId === 'dense_comforting') {
      activeStyle = 'kono_slow_drip_body';
    } else if (targetId === 'more_sweetness' || targetId === 'soft_round') {
      activeStyle = 'kono_meimon_traditional';
    } else if (targetId === 'fruit_forward') {
      activeStyle = 'kono_agitation_sweet';
    } else if (targetId === 'balance_clean' || targetId === 'more_acidity' || targetId === 'floral_transparent') {
      activeStyle = 'kono_dripper_standard';
    } else {
      // Fallback based on roast
      if (input.roastLevel === 'light') {
        activeStyle = 'kono_dripper_standard';
      } else if (input.roastLevel === 'medium_light') {
        activeStyle = 'kono_meimon_traditional';
      } else {
        activeStyle = 'kono_dripper_standard';
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
    case 'kono_meimon_traditional':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'center_drip_bloom',
          label: 'Center Drip Bloom',
          kind: 'pour',
          share: 0.1,
          startSeconds: 0,
          note: 'Bloom compactly. Drip water slowly in the absolute center. Establish stable contact to build a sweet core early. Keep upper paper walls dry to control bypass. Bloom for 40 seconds.',
        },
        {
          id: 'center_expansion',
          label: 'Center Expansion',
          kind: 'pour',
          share: 0.25,
          startSeconds: 40,
          note: 'Pour strictly in a tiny coin-sized center circle. Do not use V60-style wide spirals. The coffee bed swells forming a dome.',
        },
        {
          id: 'spiral_extension',
          label: 'Center Core Pour',
          kind: 'pour',
          share: 0.45,
          startSeconds: 85,
          note: 'Pour in a slow center-focused circle. Buka sedikit to mid only to keep bed breathing, avoiding wall-washing. Let water permeate.',
        },
        {
          id: 'fast_flush',
          label: 'Final Flush',
          kind: 'pour',
          share: 0.2,
          startSeconds: 120,
          note: 'Pour the final portion in the center to flush. Settle the bed level and let it drain. Swirl the server gently.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: 155,
          note: 'Let the cone finish cleanly. The lack of upper ribs forces water through the central core to maximize sweetness.',
        },
      ];
      why = 'Kono Meimon Traditional uses Kono\'s signature center-core sweetness method, focusing the pour in the center of the cone to extract deep sugars.';
      watch = 'Keep pour center-focused. Do not wash the upper walls as Kono relies on an airtight upper seal to limit bypass and regulate flow rate.';
      break;

    case 'kono_dripper_standard':
      adjustedProfile.ratioDelta = 0.2;
      adjustedProfile.tempDeltaC = -0.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Concentric Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Bloom compactly with a gentle center pour. Establish stable contact to build a sweet core. Wet all grounds. Let bloom for 40 seconds.',
        },
        {
          id: 'pulse_2',
          label: 'Concentric Pulse 2',
          kind: 'pour',
          share: 0.45,
          startSeconds: 40,
          note: 'Pour in tight center concentric circles. Avoid washing the filter edges. The short lower ribs slow drawdown.',
        },
        {
          id: 'pulse_3',
          label: 'Concentric Pulse 3',
          kind: 'pour',
          share: 0.4,
          startSeconds: 95,
          note: 'Pour the final portion along the center core. Let the bed settle flat. Swirl server lightly.',
        },
        {
          id: 'drawdown',
          label: 'Stable Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 155,
          note: 'Let the bed drain completely. Standard Kono extraction delivers a balanced cup with clean finish.',
        },
      ];
      why = 'Kono Dripper Standard utilizes standard center-focused pulsing and Kono\'s short bottom ribs to slow flow and balance acidity.';
      watch = 'Wall washing. Avoid aggressive spiral pours close to the paper edges to prevent high bypass through the smooth upper walls.';
      break;

    case 'kono_slow_drip_body':
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = -1.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'extreme_drip_bloom',
          label: 'Extreme Drip Bloom',
          kind: 'pour',
          share: 0.1,
          startSeconds: 0,
          note: 'Drip water slowly in the absolute center. Maintain a centered and slightly deeper pour. Warning: Slow drip style has over-extraction risk if too slow. Drip for 60 seconds.',
        },
        {
          id: 'slow_coin_spiral_1',
          label: 'Slow Center Drip',
          kind: 'pour',
          share: 0.35,
          startSeconds: 60,
          note: 'Pour in an extremely slow coin-sized center stream. Avoid edge pouring. Let the water seep slowly.',
        },
        {
          id: 'slow_coin_spiral_2',
          label: 'Center Core Drip 2',
          kind: 'pour',
          share: 0.35,
          startSeconds: 110,
          note: 'Pour second slow center-focused stream. Maintain a low height and stable water column. Keep agitation low.',
        },
        {
          id: 'final_wash',
          label: 'Final Flush',
          kind: 'pour',
          share: 0.2,
          startSeconds: 155,
          note: 'Pour final portion in the center to flush the bed. Settle the bed level and let it drain. Swirl server lightly.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: 195,
          note: 'Let drawdown finish. Warning: Monitor total extraction time to prevent over-extracted bitterness. Target is viscous sweet body.',
        },
      ];
      why = 'Kono Slow Drip Body mimics cold-drip percolation by slowly dripping hot water through the center of the bed, extracting dense, comforting sweetness.';
      watch = 'Over-extraction. Extremely slow flow can cause late bitter extraction. Ensure the final flush is completed promptly to clean the cup.';
      break;

    case 'iced_kono_meimon':
      adjustedProfile.ratioDelta = -2.2;
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
            note: 'Bloom hot and center-focused with drop-by-drop boiling water. Establish stable contact to build a sweet core. Keep the extraction concentrated. Let bloom for 35 seconds.',
          },
          {
            id: 'concentrate_spiral_1',
            label: 'Center Core Pulse 1',
            kind: 'pour',
            share: 0.25,
            startSeconds: 35,
            note: 'Pour hot water in a slow, tight coin-sized center spiral. Keep water off the upper walls.',
          },
          {
            id: 'concentrate_spiral_2',
            label: 'Center Core Pulse 2',
            kind: 'pour',
            share: 0.20,
            startSeconds: 60,
            note: 'Pour hot water in a tight center concentric pattern to maintain ribs control.',
          },
          {
            id: 'concentrate_spiral_3',
            label: 'Center Core Pulse 3',
            kind: 'pour',
            share: 0.20,
            startSeconds: 85,
            note: 'Pour hot water along the center core to keep the upper walls dry.',
          },
          {
            id: 'concentrate_spiral_4',
            label: 'Center Finish',
            kind: 'pour',
            share: 0.20,
            startSeconds: 110,
            note: 'Pour final hot water portion in the center. The concentrate drips directly over ice to chill instantly.',
          },
          {
            id: 'chill_finish',
            label: 'Chilled Drawdown',
            kind: 'drawdown',
            share: 0,
            startSeconds: 145,
            note: 'Let the bed drain. Swirl the server to melt the remaining ice, locking in focused center-core sweetness.',
          },
        ];
      } else {
        adjustedProfile.steps = [
          {
            id: 'bloom',
            label: 'Concentrated Bloom',
            kind: 'pour',
            share: 0.15,
            startSeconds: 0,
            note: 'Bloom hot and center-focused with drop-by-drop boiling water. Establish stable contact to build a sweet core. Keep the extraction concentrated. Let bloom for 35 seconds.',
          },
          {
            id: 'concentrate_spiral_1',
            label: 'Center Core Pulse',
            kind: 'pour',
            share: 0.5,
            startSeconds: 35,
            note: 'Pour hot water in a slow, tight coin-sized center spiral. Keep water off the upper walls to maintain ribs control.',
          },
          {
            id: 'concentrate_spiral_2',
            label: 'Center Finish',
            kind: 'pour',
            share: 0.35,
            startSeconds: 80,
            note: 'Pour final hot water portion in the center. The concentrate drips directly over ice to chill instantly.',
          },
          {
            id: 'chill_finish',
            label: 'Chilled Drawdown',
            kind: 'drawdown',
            share: 0,
            startSeconds: 120,
            note: 'Let the bed drain. Swirl the server to melt the remaining ice, locking in focused center-core sweetness.',
          },
        ];
      }
      why = 'Iced Kono Meimon extracts a concentrated hot yield along the center core directly over ice, capturing focused fruit sweetness.';
      watch = 'Ice and water split. Verify that hot water is correctly split from ice in the server to prevent dilution.';
      break;

    case 'kono_agitation_sweet':
      adjustedProfile.ratioDelta = 0.3;
      adjustedProfile.tempDeltaC = 0.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Turbulent Center Bloom',
          kind: 'pour',
          share: 0.2,
          startSeconds: 0,
          note: 'Pour rapidly in the center. Stir gently 3 times with a spoon to agitate all grounds. Bloom for 35 seconds.',
        },
        {
          id: 'agitated_pour_1',
          label: 'Agitated Pulse',
          kind: 'pour',
          share: 0.45,
          startSeconds: 35,
          note: 'Pour in slow concentric circles to wet grounds. Maintain a centered and slightly deeper stream for stable contact, keeping water off the smooth upper walls.',
        },
        {
          id: 'slow_wash',
          label: 'Center Core Wash',
          kind: 'pour',
          share: 0.35,
          startSeconds: 85,
          note: 'Pour the final portion in a slow center stream to settle the coffee bed flat and wash grounds down.',
        },
        {
          id: 'drawdown',
          label: 'Level Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 135,
          note: 'Let the bed settle flat. Swirl server lightly. Settle the bed for a sweet, fruit-forward cup.',
        },
      ];
      why = 'Kono Agitation Sweet uses controlled agitation in the center bloom followed by a slow center core finish to extract sweet fruit notes.';
      watch = 'Late agitation. Do not agitate in the final pour; keep it calm and center-focused to prevent over-extracting bitter compounds.';
      break;
  }

  // Apply Roast Level adjustments
  if (input.roastLevel === 'light') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) + 1.5;
    const lightRoastNote = 'Light roast: higher temperature applied to push extraction.';
    why = why ? `${lightRoastNote} ${why}` : lightRoastNote;
  } else if (input.roastLevel === 'medium_dark') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 1.0;
    const medDarkNote = 'Medium-dark roast: lower temperature and less agitation applied to avoid extraction harshness.';
    why = why ? `${medDarkNote} ${why}` : medDarkNote;
  } else if (input.roastLevel === 'dark') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 2.0;
    adjustedProfile.grindBias = 'coarser';
    const darkRoastNote = 'Dark roast: lower temperature applied to prevent slow over-extraction and bitterness.';
    watch = watch ? `${darkRoastNote} ${watch}` : darkRoastNote;
  }

  // Low confidence warning for light-roast floral target
  const isUnknownVariety = !input.variety || input.variety === 'custom' || input.variety === 'unknown';
  const isUnknownProcess = !input.process || input.process === 'custom' || input.process === 'unknown';
  const isUnknownName = !input.coffeeName || input.coffeeName === 'custom' || input.coffeeName === 'unknown';
  if (targetId === 'floral_transparent' && input.roastLevel === 'light' && (isUnknownVariety || isUnknownProcess || isUnknownName)) {
    const floralConfidenceWarn = 'Floral target on light roast has lower confidence due to missing specific bean variety, name, or process information.';
    watch = watch ? `${floralConfidenceWarn} ${watch}` : floralConfidenceWarn;
  }

  // Suitability warning for floral target
  if (targetId === 'floral_transparent') {
    const suitabilityWarn = 'Warning: Kono Meimon has lower suitability/fit for delicate floral clarity than open cone drippers.';
    watch = watch ? `${suitabilityWarn} ${watch}` : suitabilityWarn;
  }

  // Roast mismatch for acidity/floral
  if (input.roastLevel === 'dark' && (targetId === 'more_acidity' || targetId === 'floral_transparent')) {
    const mismatchWarn = 'Warning: Floral or acidity targets have low extraction alignment with dark roasts.';
    watch = watch ? `${mismatchWarn} ${watch}` : mismatchWarn;
  }

  adjustedProfile.recipeStyle = activeStyle as DeviceBrewProfile['recipeStyle'];

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
