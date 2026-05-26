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
  const { input, profile, doseG } = params;
  const style = input.coldBrewStyle || 'auto';
  if (style === 'auto') {
    return {
      style: 'auto',
      adjustedProfile: profile,
      why: 'Cold Brew Auto style utilizes the default catalog extraction profile to deliver a highly balanced cup.',
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
    case 'classic_toddy_immersion':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'filter_prep',
          label: 'Filter Setup',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Insert the reusable felt filter into the Toddy bottom. Pour a small splash of cold water to wet the felt.',
        },
        {
          id: 'pour_wet',
          label: 'Layer Water & Grounds',
          kind: 'pour',
          share: 1.0,
          startSeconds: 15,
          note: 'Pour 20% of your cold water, then add half the grounds. Continue layering water and grounds gently without stirring.',
        },
        {
          id: 'steep_infuse',
          label: 'Steep Infusion',
          kind: 'drawdown',
          share: 0,
          startSeconds: 120,
          note: 'Cover and let the mixture steep at room temperature (18-22°C) or in the fridge for 12 to 24 hours.',
        },
        {
          id: 'release_decant',
          label: 'Decant Concentrate',
          kind: 'drawdown',
          share: 0,
          startSeconds: 57600, // 16 hours reference
          note: 'Pull the stopper plug from the bottom and let the clean concentrate drain into the glass decanter.',
        },
      ];
      why = 'Classic Toddy Immersion utilizes slow room-temperature steeping and felt-filter filtration to deliver a sweet, heavy-bodied, low-acid concentrate.';
      watch = 'Do not stir. Agitating the mixture during immersion forces fine particles into the felt filter, causing clogging and extremely slow drainage.';
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
          note: 'Place grounds in the middle column. Saturate with a small amount of water and put a paper filter disk on top of the bed.',
        },
        {
          id: 'ice_chamber',
          label: 'Chamber Ice setup',
          kind: 'pour',
          share: 0.9,
          startSeconds: 60,
          note: 'Fill the upper chamber with 50% ice and 50% cold water. Adjust the drip valve to 1 drop every 1.5 seconds.',
        },
        {
          id: 'dripping_fase',
          label: 'Slow Drip percolation',
          kind: 'drawdown',
          share: 0,
          startSeconds: 300,
          note: 'Allow ice water to drip continuously over 4 to 6 hours. Adjust flow rate mid-way if temperature changes shift flow.',
        },
      ];
      why = 'Cold Drip Tower forces ice-cold water to percolate through the bed drop-by-drop, creating beautiful floral notes and a highly aromatic, lighter-bodied cold brew.';
      watch = 'Valve freeze. The drip rate can slow down or stop entirely as the water cools or gets empty. Monitor the drip rate every hour.';
      break;

    case 'double_extraction_concentrate':
      adjustedProfile.ratioDelta = -3.0; // Extremely high coffee dose ratio
      adjustedProfile.tempDeltaC = 2.0; // Warm room temperature
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'first_immersion',
          label: 'First Immersion Step',
          kind: 'pour',
          share: 0.5,
          startSeconds: 0,
          note: 'Wet half the grounds with 50% water. Let steep for 8 hours for initial sugar extraction.',
        },
        {
          id: 'second_addition',
          label: 'Second Contact Step',
          kind: 'pour',
          share: 0.5,
          startSeconds: 28800, // 8 hours
          note: 'Add the remaining grounds and cold water. Let steep for an additional 12 hours to compile extra high dissolved solids.',
        },
        {
          id: 'final_drain',
          label: 'Extract Concentrate',
          kind: 'drawdown',
          share: 0,
          startSeconds: 72000, // 20 hours total
          note: 'Decant completely. Dilute concentrate 1:2 or 1:3 with water or milk before serving.',
        },
      ];
      why = 'Double Extraction Concentrate uses two separate coffee contact stages to bypass solubility saturation limits, producing an ultra-strong, thick concentrate.';
      watch = 'Spoilage risk. Because this immersion is highly concentrated and runs for 20 hours, execute all steps in a cool environment or refrigerator.';
      break;

    case 'accelerated_room_temp':
      adjustedProfile.ratioDelta = 0.5;
      adjustedProfile.tempDeltaC = 4.0; // Warm ambient water
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'stir_saturate',
          label: 'Stir & Saturate',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Combine all grounds and warm room-temperature water (24°C). Stir vigorously for 60 seconds to initiate fast extraction.',
        },
        {
          id: 'rest_period',
          label: 'Rest & Gentle Swirl',
          kind: 'pour',
          share: 0,
          startSeconds: 120,
          note: 'Cover and let steep for 4 hours. Give a very gentle swirl at the 2-hour mark to keep particles suspended.',
        },
        {
          id: 'paper_filtration',
          label: 'Double Filter Decant',
          kind: 'drawdown',
          share: 0,
          startSeconds: 14400, // 4 hours
          note: 'Pour the slurry through a fine mesh metal sieve, then pass it through a V60 paper filter to remove fine silt.',
        },
      ];
      why = 'Accelerated Room Temp uses agitation and slightly warmer starting water to cut steeping time from 16 hours to 4 hours while retaining sweet chocolate notes.';
      watch = 'Sediment. Since we stir at the start, there are many suspended micro-fines. A paper filter polish is mandatory to avoid a muddy cup.';
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
          note: 'Moisten grounds inside the dripper column. Tap to align flat. Lay a pre-wet paper disk on top.',
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
          kind: 'drawdown',
          share: 0,
          startSeconds: 120,
          note: 'Let the drip run directly into a sealed glass bottle in the fridge. Total duration should be around 8 hours.',
        },
      ];
      why = 'Japanese Slow Drip provides a crystal-clear, clean-tasting cold brew by dripping cold water directly through a narrow coffee column without recirculating.';
      watch = 'Drip block. Evaporation or temperature variance in the room can cause the valve to stop. Adjust the nozzle if the drip rate stops.';
      break;
  }

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
