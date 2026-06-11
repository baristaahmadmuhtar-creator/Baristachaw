import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  AprilRecipeStyle,
} from './types.ts';

export interface AprilPlanSelection {
  style: AprilRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isAprilDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  return haystack.includes('april');
}

export function resolveAprilPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): AprilPlanSelection {
  const { input, dripper, profile, doseG } = params;
  const targetId = params.targetProfile?.id || '';
  const style = input.aprilStyle || 'auto';

  let activeStyle = style;
  if (style === 'auto') {
    if (input.brewMode === 'iced') {
      activeStyle = 'iced_april_style';
    } else if (targetId === 'more_body' || targetId === 'dense_comforting' || doseG >= 24) {
      activeStyle = 'high_body_heavy_dose';
    } else if (targetId === 'more_sweetness' || targetId === 'soft_round') {
      activeStyle = 'april_continuous_slow';
    } else if (targetId === 'more_acidity' || targetId === 'fruit_forward' || targetId === 'floral_transparent') {
      activeStyle = 'competition_two_pour';
    } else if (targetId === 'balance_clean') {
      activeStyle = 'april_flat_bottom_standard';
    } else {
      // Fallback based on roast
      if (input.roastLevel === 'light') {
        activeStyle = 'april_flat_bottom_standard';
      } else if (input.roastLevel === 'medium') {
        activeStyle = 'april_continuous_slow';
      } else {
        activeStyle = 'april_flat_bottom_standard';
      }
    }
  }

  const adjustedProfile: DeviceBrewProfile = {
    ...profile,
    steps: [],
  };

  let why = '';
  let watch = '';

  // Extract material flow profile note
  let materialNote = '';
  const dripperName = (dripper.name || '').toLowerCase();
  const dripperDesc = (dripper.description || '').toLowerCase();
  const profileNote = (profile.note || '').toLowerCase();
  const dripperText = `${dripperName} ${dripperDesc} ${profileNote}`;
  
  if (dripperText.includes('ceramic') || dripperText.includes('keramik')) {
    materialNote = 'Material note: Ceramic body retains heat well but requires extensive preheating to prevent flow profile drops.';
  } else if (dripperText.includes('plastic') || dripperText.includes('plastik')) {
    materialNote = 'Material note: Plastic body offers excellent thermal stability and faster, more consistent flow.';
  } else if (dripperText.includes('glass') || dripperText.includes('kaca')) {
    materialNote = 'Material note: Glass body provides clean flavor separation and moderate heat retention.';
  } else if (dripperText.includes('metal') || dripperText.includes('logam') || dripperText.includes('steel') || dripperText.includes('aluminum')) {
    materialNote = 'Material note: Metal body draws heat quickly; ensure extensive preheating to prevent flow restriction.';
  } else if (dripperText.includes('hybrid') || dripperText.includes('hibrida')) {
    materialNote = 'Material note: Hybrid material configuration provides a balanced flow profile.';
  }

  switch (activeStyle) {
    case 'april_flat_bottom_standard':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Circular Bloom',
          kind: 'pour',
          share: 0.2,
          startSeconds: 0,
          note: 'Bloom with a gentle circular pour to wet grounds evenly. Maintain a low pour and low agitation, letting the flat bed bloom for 35 seconds.',
        },
        {
          id: 'pulse_2',
          label: 'Pulse 2 (Circular)',
          kind: 'pour',
          share: 0.3,
          startSeconds: 35,
          note: 'Pour in medium concentric circles close to the bed. Keep the flow stable to maintain a low agitation flat bed extraction.',
        },
        {
          id: 'pulse_3',
          label: 'Pulse 3 (Center)',
          kind: 'pour',
          share: 0.3,
          startSeconds: 70,
          note: 'Execute a straight center pour. Maintain a low height and stable stream to extract sweetness from the flat bed.',
        },
        {
          id: 'pulse_4',
          label: 'Final Concentric Pulse',
          kind: 'pour',
          share: 0.2,
          startSeconds: 100,
          note: 'Pour the final portion in concentric rings to wash the bed flat. Let it drain with no excessive swirl.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 135,
          note: 'Allow the bed to settle flat. Flat-bottom geometry with April paper filter yields exceptional sweetness and balanced, clean flavor.',
        },
      ];
      why = 'April Flat Bottom Standard style focuses on low agitation and a flat bed to deliver balanced sweetness and clear flavor structure.';
      watch = 'Avoid high pouring heights. High agitation will push fines into the flutes of the April paper filter, clogging the drawdown.';
      break;

    case 'april_continuous_slow':
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = 0.5;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Low Agitation Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Wet the bed evenly with a slow center pour. Let bloom for 35 seconds with no agitation or swirl.',
        },
        {
          id: 'slow_stream_1',
          label: 'Slow Continuous Stream 1',
          kind: 'pour',
          share: 0.45,
          startSeconds: 35,
          note: 'Pour continuously in a highly controlled, slow center-focused stream.',
        },
        {
          id: 'slow_stream_2',
          label: 'Slow Continuous Stream 2',
          kind: 'pour',
          share: 0.40,
          startSeconds: 75,
          note: 'Continue pouring in a slow, stable center stream. Keep a low height to prevent churning the coffee bed.',
        },
        {
          id: 'slow_draw',
          label: 'Sweet Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 125,
          note: 'Let the water drain through the bed completely. The continuous slow stream minimizes agitation, yielding maximum sweetness and soft round notes.',
        },
      ];
      why = 'April Continuous Slow style uses a slow, continuous center pour with zero pauses to keep slurry temperature stable, maximizing sweet sugar extraction.';
      watch = 'Slurry level. Keep the pour stable and low. If the water level rises too high, bypass will increase, softening the cup profile.';
      break;

    case 'competition_two_pour':
      adjustedProfile.ratioDelta = 0.3;
      adjustedProfile.tempDeltaC = 1.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Precision Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Bloom with a gentle circular pour to saturate the bed. Keep agitation low. Bloom for 30 seconds.',
        },
        {
          id: 'large_pour_1',
          label: 'First Structured Pour',
          kind: 'pour',
          share: 0.45,
          startSeconds: 30,
          note: 'Pour 60% circular, 40% center. Maintain a stable low height to drive precise extraction across the flat bed.',
        },
        {
          id: 'large_pour_2',
          label: 'Second Center Pour',
          kind: 'pour',
          share: 0.4,
          startSeconds: 75,
          note: 'Execute a steady center pour. Maintain a low height and stable stream. Let the bed settle flat with no swirl.',
        },
        {
          id: 'drawdown',
          label: 'Clean Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 125,
          note: 'Allow the bed to settle completely flat. Flat bed extraction highlights sparkling acidity and fruit-forward clarity.',
        },
      ];
      why = 'Competition Two-Pour uses two structured, stable pours to extract bright fruit-forward and floral transparent acidity.';
      watch = 'Pour symmetry. Ensure water is distributed evenly to prevent channel cracks in the flat bed.';
      break;

    case 'iced_april_style':
      adjustedProfile.ratioDelta = 0.0;
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
            note: 'Pour hot water in a slow circular ring. Bloom for 30 seconds. Keep the extraction concentrated directly over ice.',
          },
          {
            id: 'concentrate_pour_1',
            label: 'Concentrated Pulse 1',
            kind: 'pour',
            share: 0.25,
            startSeconds: 30,
            note: 'Pour hot water in a slow concentric pattern. Keep a low pouring height to prevent flat-bed clogging.',
          },
          {
            id: 'concentrate_pour_2',
            label: 'Concentrated Pulse 2',
            kind: 'pour',
            share: 0.20,
            startSeconds: 55,
            note: 'Pour hot water in concentric circles. Maintain low agitation to keep the flat bed uniform.',
          },
          {
            id: 'concentrate_pour_3',
            label: 'Concentrated Pulse 3',
            kind: 'pour',
            share: 0.20,
            startSeconds: 80,
            note: 'Pour hot water in a slow concentric pattern. Keep the slurry deep over the ice.',
          },
          {
            id: 'concentrate_pour_4',
            label: 'Center Finish',
            kind: 'pour',
            share: 0.20,
            startSeconds: 105,
            note: 'Pour the final hot water portion in the center. Allow the hot extract to drip directly over ice to chill instantly.',
          },
          {
            id: 'chill_finish',
            label: 'Chilled Drawdown',
            kind: 'drawdown',
            share: 0,
            startSeconds: 140,
            note: 'Let the bed settle flat. Swirl the chilled coffee to melt the remaining ice, ensuring a rich, sweet iced cup.',
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
            note: 'Pour hot water in a slow circular ring. Bloom for 30 seconds. Keep the extraction concentrated directly over ice.',
          },
          {
            id: 'concentrate_pour_1',
            label: 'Concentrated Pulse',
            kind: 'pour',
            share: 0.5,
            startSeconds: 30,
            note: 'Pour hot water in a slow concentric pattern. Keep a low pouring height to prevent flat-bed clogging.',
          },
          {
            id: 'concentrate_pour_2',
            label: 'Center Finish',
            kind: 'pour',
            share: 0.3,
            startSeconds: 65,
            note: 'Pour the final hot water portion in the center. Allow the hot extract to drip directly over ice to chill instantly.',
          },
          {
            id: 'chill_finish',
            label: 'Chilled Drawdown',
            kind: 'drawdown',
            share: 0,
            startSeconds: 105,
            note: 'Let the bed settle flat. Swirl the chilled coffee to melt the remaining ice, ensuring a rich, sweet iced cup.',
          },
        ];
      }
      why = 'Iced April Style extracts a concentrated hot yield directly over ice to lock in sweet Scandinavian fruit profiles.';
      watch = 'Ice and water split. Verify that the hot water volume is correctly split from the ice in the server to prevent dilution.';
      break;

    case 'high_body_heavy_dose':
      adjustedProfile.ratioDelta = 0.5;
      adjustedProfile.tempDeltaC = -1.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'heavy_bloom',
          label: 'Heavy Bed Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Bloom the heavy bed with a slow concentric pour. Let bloom for 40 seconds to completely saturate the deep bed.',
        },
        {
          id: 'tight_pulse_1',
          label: 'Tight Center Pulse 1',
          kind: 'pour',
          share: 0.3,
          startSeconds: 40,
          note: 'Pour in a slow, tight circle. Warning: Heavy dose increases slow flow and clog risk. Keep agitation low.',
        },
        {
          id: 'tight_pulse_2',
          label: 'Tight Center Pulse 2',
          kind: 'pour',
          share: 0.3,
          startSeconds: 80,
          note: 'Pour second portion in the center, keeping a low water column. Slow flow is expected. Do not swirl.',
        },
        {
          id: 'tight_pulse_3',
          label: 'Tight Pulse 3',
          kind: 'pour',
          share: 0.25,
          startSeconds: 115,
          note: 'Pour final portion in concentric rings. Let the heavy bed settle flat.',
        },
        {
          id: 'heavy_drain',
          label: 'Slow Heavy Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 160,
          note: 'Let the heavy bed drain fully. Warning: Slow flow and clogging are common with high doses; grind coarser if drawdown stalls. Expect a heavy finish.',
        },
      ];
      why = 'High-Body Heavy Dose style uses multiple center pulses to extract a deep, chocolate-sweet body from a heavy dose.';
      watch = 'Clog risk and slow flow. The deep bed restricts flow. Avoid edge pouring or swirling, which pushes fines into paper flutes.';
      break;
  }

  // Apply Roast Level adjustments
  if (input.roastLevel === 'light') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) + 1.5;
    const lightRoastNote = 'Light roast: higher temperature applied to push extraction of dense cells.';
    why = why ? `${lightRoastNote} ${why}` : lightRoastNote;
  } else if (input.roastLevel === 'medium_dark') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 1.0;
    const medDarkNote = 'Medium-dark roast: lower temperature and low agitation applied to avoid extraction harshness.';
    why = why ? `${medDarkNote} ${why}` : medDarkNote;
  } else if (input.roastLevel === 'dark') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 2.0;
    adjustedProfile.grindBias = 'coarser';
    const darkRoastNote = 'Dark roast: low temperature and short contact time applied to prevent over-extracted bitterness.';
    watch = watch ? `${darkRoastNote} ${watch}` : darkRoastNote;
  }

  // Append material note to watch/why if present
  if (materialNote) {
    watch = watch ? `${materialNote} ${watch}` : materialNote;
  }

  adjustedProfile.recipeStyle = activeStyle as DeviceBrewProfile['recipeStyle'];

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
