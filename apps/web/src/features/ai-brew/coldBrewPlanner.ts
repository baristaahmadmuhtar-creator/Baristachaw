import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  ColdBrewRecipeStyle,
} from './types.ts';

export interface ColdBrewPlanSelection {
  style: ColdBrewRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isColdBrewDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  if (haystack.includes('matrix')) return false;
  return haystack.includes('cold') || haystack.includes('toddy') || haystack.includes('immersion') || haystack.includes('drip');
}

export function resolveColdBrewPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): ColdBrewPlanSelection {
  const { input, dripper, profile, doseG } = params;
  const targetId = params.targetProfile?.id || '';
  const style = input.coldBrewStyle || 'auto';

  // Resolve active style
  let activeStyle: ColdBrewRecipeStyle = style;
  if (style === 'auto') {
    if (targetId === 'more_body' || targetId === 'dense_comforting') {
      activeStyle = 'double_extraction_concentrate';
    } else {
      activeStyle = 'classic_toddy_immersion';
    }
  }

  // Toddy safety/layout: cold_drip_tower and japanese_slow_drip cannot be active for Toddy immersion default
  const isToddy = dripper.id === 'toddy-cold-brew' || dripper.id.toLowerCase().includes('toddy');
  if (isToddy && (activeStyle === 'cold_drip_tower' || activeStyle === 'japanese_slow_drip')) {
    activeStyle = 'classic_toddy_immersion';
  }

  const adjustedProfile: DeviceBrewProfile = {
    ...profile,
    steps: [],
  };

  const targetWarnings: string[] = [];
  if (targetId === 'more_acidity') {
    targetWarnings.push('Warning: Cold brew extraction naturally mutes delicate acidity.');
  }
  if (targetId === 'fruit_forward') {
    targetWarnings.push('Medium confidence: Cold brew immersion can suppress bright fruit acidity and clarity.');
  }
  if (targetId === 'floral_transparent') {
    targetWarnings.push('Low fit warning: Immersion cold brew concentrate is not ideal for highly transparent floral notes.');
  }

  let why = '';
  let watch = '';

  // Roast-aware Steep Times
  let steepHours = 16;
  if (input.roastLevel === 'light') {
    steepHours = 22; // Longer steep for light
  } else if (input.roastLevel === 'medium_light') {
    steepHours = 18;
  } else if (input.roastLevel === 'medium') {
    steepHours = 16;
  } else if (input.roastLevel === 'medium_dark') {
    steepHours = 14;
  } else if (input.roastLevel === 'dark') {
    steepHours = 12;
  }

  const isHotServing = input.brewMode === 'hot';

  switch (activeStyle) {
    case 'classic_toddy_immersion':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'pour_wet',
          label: 'Setup & Layer Water/Coffee',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Secure the rubber stopper and insert the reusable felt filter. Grind coarse. Add coffee and cold water in alternating stages to prevent dry pockets. Do not stir aggressively.',
        },
        {
          id: 'steep_infuse',
          label: 'Steep Infusion',
          kind: 'wait',
          share: 0,
          startSeconds: 120,
          note: `Cover and steep at room temperature or fridge for ${steepHours} hours. Do not use heated water during extraction.`,
        },
        {
          id: 'release_decant',
          label: 'Decant & Dilute',
          kind: 'serve',
          share: 0,
          startSeconds: steepHours * 3600,
          note: isHotServing
            ? 'Pull stopper plug to let concentrate drain slowly. For hot serving: dilute 1 part concentrate with 2 parts heated water (75-80°C). Dilution only, no hot brewing.'
            : 'Pull stopper plug to let concentrate drain slowly. Dilute 1 part concentrate with 2 parts water or milk over ice as starting point. Store concentrate cold.',
        },
      ];
      why = `Classic Toddy Immersion uses a ${steepHours}-hour cold immersion and felt filter to deliver a sweet, low-acid, full-bodied concentrate.`;
      watch = 'Do not stir aggressively. Agitating the immersion will clog the felt filter, causing extremely slow drainage. Store concentrate cold.';
      break;

    case 'cold_drip_tower':
      adjustedProfile.ratioDelta = -1.0;
      adjustedProfile.tempDeltaC = -15.0; // Cold ice water
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'bed_saturate',
          label: 'Bed Saturation',
          kind: 'pour',
          share: 0.1,
          startSeconds: 0,
          note: 'Place coarse grounds in the drip column. Pre-wet and place a paper filter disk on top of the bed.',
        },
        {
          id: 'ice_chamber',
          label: 'Chamber Ice setup',
          kind: 'pour',
          share: 0.9,
          startSeconds: 60,
          note: 'Fill the upper chamber with 50% ice and 50% cold water. Adjust drip valve to 1 drop every 1.5 seconds.',
        },
        {
          id: 'dripping_fase',
          label: 'Slow Drip percolation',
          kind: 'wait',
          share: 0,
          startSeconds: 300,
          note: 'Allow ice water to drip continuously over 4 to 6 hours. Adjust flow rate mid-way if temp changes shift flow.',
        },
      ];
      why = 'Cold Drip Tower percolates ice water drop-by-drop through a paper-capped coffee bed to extract clean, aromatic, and lighter-bodied cold drip.';
      watch = 'Drip rate drift. The valve can slow down or freeze as water cools or drains. Check drip rhythm hourly.';
      break;

    case 'double_extraction_concentrate':
      adjustedProfile.ratioDelta = -3.0; // Very high coffee ratio
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'finer';

      const firstStageHours = Math.round(steepHours * 0.4);

      adjustedProfile.steps = [
        {
          id: 'first_immersion',
          label: 'First Immersion Step',
          kind: 'pour',
          share: 0.5,
          startSeconds: 0,
          note: 'Secure rubber stopper and filter. Load coarse coffee and cold water in alternating stages to prevent dry pockets. Let steep for 8 hours.',
        },
        {
          id: 'second_addition',
          label: 'Second Contact Step',
          kind: 'pour',
          share: 0.5,
          startSeconds: firstStageHours * 3600,
          note: 'Add the remaining coarse coffee and cold water. Let steep for an additional 12 hours. Do not use heated water.',
        },
        {
          id: 'final_drain',
          label: 'Extract Concentrate',
          kind: 'serve',
          share: 0,
          startSeconds: steepHours * 3600,
          note: isHotServing
            ? 'Decant completely. For hot serving: dilute 1 part concentrate with 2 parts heated water. Dilution only, no hot brewing.'
            : 'Decant completely. Dilute concentrate 1:2 or 1:3 with cold water or milk over ice. Keep concentrate cold.',
        },
      ];
      why = 'Double Extraction Concentrate uses two separate coffee contact stages over a 20-hour window to push concentrate solids to the absolute maximum.';
      watch = 'Spoilage risk. Because this immersion is highly concentrated and runs for a long time, steep in a cool environment or fridge. Dilution required.';
      break;

    case 'accelerated_room_temp':
      adjustedProfile.ratioDelta = 0.5;
      adjustedProfile.tempDeltaC = 4.0; // Warm room-temp water
      adjustedProfile.grindBias = 'finer';

      // 4 hours default, adjusted slightly
      const accHours = Math.max(3, Math.round(steepHours * 0.25));

      adjustedProfile.steps = [
        {
          id: 'stir_saturate',
          label: 'Saturate & Rest',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Secure Toddy stopper and felt filter. Add coarse coffee and ambient room-temperature water in stages to prevent dry pockets. Gentle stir once at start.',
        },
        {
          id: 'rest_period',
          label: 'Resting phase',
          kind: 'pour',
          share: 0,
          startSeconds: 120,
          note: `Cover and let steep for ${accHours} hours at room temperature. Do not agitate repeatedly.`,
        },
        {
          id: 'paper_filtration',
          label: 'Double Filter Decant',
          kind: 'serve',
          share: 0,
          startSeconds: accHours * 3600,
          note: isHotServing
            ? 'Pull stopper and drain. For hot serving: dilute 1 part concentrate with 2 parts heated water. Dilution only, no hot brewing.'
            : 'Pull stopper and drain. Serve diluted (e.g., 1 part concentrate to 2 parts water/milk) over ice. Keep concentrate cold.',
        },
      ];
      why = 'Accelerated Room Temp uses ambient water to speed up diffusion, cutting steep time significantly while maintaining chocolatey sweet notes.';
      watch = 'Lower confidence. Faster room-temp styles do not extract the same complexity as full overnight cold brews. Watch out for sediment.';
      break;

    case 'japanese_slow_drip':
      adjustedProfile.ratioDelta = -1.5;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'drip_setup',
          label: 'Setup Drip Column',
          kind: 'pour',
          share: 0.1,
          startSeconds: 0,
          note: 'Moisten coarse grounds inside the dripper column. Lay a pre-wet paper disk on top.',
        },
        {
          id: 'cold_reservoir',
          label: 'Cold Reservoir',
          kind: 'pour',
          share: 0.9,
          startSeconds: 30,
          note: 'Fill top reservoir with ice water. Calibrate slow drip valve to 1 drop every 2 seconds.',
        },
        {
          id: 'direct_serve',
          label: 'Percolate to server',
          kind: 'serve',
          share: 0,
          startSeconds: 120,
          note: 'Let the drip run directly into a sealed glass bottle in the fridge. Total duration should be around 8 hours.',
        },
      ];
      why = 'Japanese Slow Drip drips ice-cold water directly through a narrow coffee column without recirculation to yield a crystal-clear cup.';
      watch = 'Drip block. Evaporation or ambient room temperature changes can stop the drip valve. Check rate regularly.';
      break;
  }

  // Roast level feedback warnings:
  if (input.roastLevel === 'light') {
    const lightWarning = 'Light roast: Cold brew acidity remains muted. A longer steeping window is used. Confidence is medium.';
    why = why ? `${lightWarning} ${why}` : lightWarning;
  } else if (input.roastLevel === 'dark') {
    const darkWarning = 'Dark roast warning: Watch out for bitter or roasty notes in the concentrate. A shorter steeping window is used.';
    watch = watch ? `${darkWarning} ${watch}` : darkWarning;
  }

  // Missing data check (lower confidence if origin/variety or process is unknown)
  const isUnknownVariety = !input.variety || input.variety === 'custom' || input.variety === 'unknown';
  const isUnknownProcess = !input.process || input.process === 'custom' || input.process === 'unknown';
  if (isUnknownVariety || isUnknownProcess) {
    const missingWarning = 'Missing exact bean taxonomy (variety or process) reduces flavor alignment precision. Confidence: low.';
    why = why ? `${missingWarning} ${why}` : missingWarning;
  }

  if (targetWarnings.length > 0) {
    const joined = targetWarnings.join(' ');
    watch = watch ? `${joined} ${watch}` : joined;
  }

  adjustedProfile.recipeStyle = activeStyle as DeviceBrewProfile['recipeStyle'];
  adjustedProfile.label = `Cold Brew - ${activeStyle.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}

