import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  BatchBrewRecipeStyle,
} from './types.ts';

export interface BatchPlanSelection {
  style: BatchBrewRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isBatchBrewDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  return haystack.includes('batch') || haystack.includes('automatic') || haystack.includes('sca') || haystack.includes('brewer');
}

export function resolveBatchPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): BatchPlanSelection {
  const { input, profile, doseG } = params;
  const style = input.batchBrewStyle || 'auto';
  if (style === 'auto') {
    return {
      style: 'auto',
      adjustedProfile: profile,
      why: 'Batch Brewer Auto style utilizes the default catalog extraction profile to deliver a highly balanced cup.',
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
    case 'sca_gold_cup':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'filter_wash',
          label: 'Preheat & Rinse',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Rinse the large basket paper filter with hot water to remove raw paper taste. Pre-warm the glass/thermal carafe, then discard rinse water.',
        },
        {
          id: 'machine_bloom',
          label: 'Machine Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 10,
          note: 'Turn on brewer. The shower head executes the first spray cycle to wet the wide bed. Let bloom for 45 seconds.',
        },
        {
          id: 'continuous_spray',
          label: 'Main Shower Phase',
          kind: 'pour',
          share: 0.85,
          startSeconds: 55,
          note: 'Brewer runs the continuous spray program. The flat-bottom basket maintains a stable, level water column over grounds.',
        },
        {
          id: 'basket_drain',
          label: 'Basket Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 240,
          note: 'Allow the basket to drain completely. Swirl the carafe to integrate the stratified brew layers before serving.',
        },
      ];
      why = 'SCA Gold Cup utilizes standard flat-bottom geometry and controlled machine cycles to achieve a perfectly balanced 18-22% extraction yield.';
      watch = 'Check shower head alignment. Ensure the spray head is clean and level so water is distributed evenly across the wide bed.';
      break;

    case 'heavy_batch_catering':
      adjustedProfile.ratioDelta = 0.5; // Slightly higher ratio to avoid over-extraction
      adjustedProfile.tempDeltaC = -1.0; // Avoid bitterness in large batches
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'large_bed_setup',
          label: 'Large Bed Setup',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Rinse the heavy paper filter thoroughly. Shake the grounds in the basket to make the bed perfectly level. Do not dome in the center.',
        },
        {
          id: 'pre_wet_manually',
          label: 'Manual Initial wetting',
          kind: 'pour',
          share: 0.1,
          startSeconds: 15,
          note: 'Optional: Manually pour 100-200ml hot water on the bed to guarantee all dry spots are saturated before machine starts.',
        },
        {
          id: 'main_heavy_flow',
          label: 'Main Heavy Flow',
          kind: 'pour',
          share: 0.9,
          startSeconds: 60,
          note: 'Execute machine brew program. Water volume is high; monitor the basket to ensure it does not overflow.',
        },
        {
          id: 'slow_drain',
          label: 'Slow Large Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 360,
          note: 'Let the massive coffee bed drain slowly. Keep the thermal carafe lid sealed tight to preserve hot steam.',
        },
      ];
      why = 'Heavy Batch Catering adjusts the grind coarser and utilizes a slightly lower brewing temperature to prevent bitter over-extraction inside the thick coffee bed.';
      watch = 'Basket overflow. Fine grinds in large quantities can clog the basket exit hole. Keep grind coarse and watch the basket level.';
      break;

    case 'bright_light_roast_batch':
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = 2.0; // Higher temp for light roast extraction
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'rinse_spout',
          label: 'High Temp Rinse',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Rinse with boiling water to maximize initial machine temperature. Dose light-roast coffee ground finer.',
        },
        {
          id: 'pulsed_shower_1',
          label: 'Shower Pulse 1',
          kind: 'pour',
          share: 0.2,
          startSeconds: 10,
          note: 'First pulse cycle wets the bed. Higher temperature water breaks down hard organic compounds in light roast.',
        },
        {
          id: 'pulsed_shower_2',
          label: 'Shower Pulse 2 & 3',
          kind: 'pour',
          share: 0.5,
          startSeconds: 70,
          note: 'Machine runs secondary spray pulses. The intermittent pause cycles allow water to extract complex fruit acids.',
        },
        {
          id: 'pulsed_shower_3',
          label: 'Final Shower Pulse',
          kind: 'pour',
          share: 0.3,
          startSeconds: 150,
          note: 'Execute the final spray rinse. The high water column agitates the dense, hard light roast grounds.',
        },
        {
          id: 'fast_drawdown',
          label: 'Rapid Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 220,
          note: 'Drains quickly due to low soluble silt, resulting in high acidity and bright clarity.',
        },
      ];
      why = 'Bright Light Roast Batch optimizes temperature and introduces pulsed spray patterns to force high extraction yields from hard, high-density light-roast beans.';
      watch = 'Acidity balance. If the cup tastes sour or under-extracted, check the machine\'s actual heating element; weak heating will ruin light roasts.';
      break;

    case 'pre_wet_hybrid_batch':
      adjustedProfile.ratioDelta = -0.2;
      adjustedProfile.tempDeltaC = 0.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'hybrid_rinse',
          label: 'Hot Basket Rinse',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Wet the basket filter. Pre-warm the decanter. Put coffee in and flatten the bed.',
        },
        {
          id: 'manual_bloom_pour',
          label: 'Manual Bloom Pour',
          kind: 'pour',
          share: 0.2,
          startSeconds: 15,
          note: 'Manually pour hot water from a kettle over the bed, stirring gently with a spoon. Let bloom for 60 seconds with machine OFF.',
        },
        {
          id: 'start_machine',
          label: 'Activate Machine Shower',
          kind: 'pour',
          share: 0.8,
          startSeconds: 75,
          note: 'Turn the machine ON. The shower head continues the brew over a pre-wetted, fully degassed coffee bed.',
        },
        {
          id: 'final_draw',
          label: 'Drawdown Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: 260,
          note: 'Let the coffee drip through completely. Excellent hybrid extraction with no dry clumps.',
        },
      ];
      why = 'Pre-wet Hybrid Batch combines the precision of manual blooming with the convenience of automated shower percolation, eliminating dry pockets completely.';
      watch = 'Timing. Ensure the manual bloom starts exactly when the grounds are dry, and turn on the machine immediately after the 60-second bloom.';
      break;

    case 'high_extraction_thermos':
      adjustedProfile.ratioDelta = -0.8; // Stronger ratio
      adjustedProfile.tempDeltaC = 1.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'thermos_rinse',
          label: 'Preheat Thermos',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Fill the thermal thermos with hot water for 3 minutes, then empty it. This prevents the metal body from stealing coffee temperature.',
        },
        {
          id: 'dense_bloom',
          label: 'Concentrated Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 10,
          note: 'Shower spray starts. The fine grind restricts flow slightly to build extra dissolved solids.',
        },
        {
          id: 'dense_shower',
          label: 'Shower Percolation',
          kind: 'pour',
          share: 0.85,
          startSeconds: 55,
          note: 'Brewer runs spray program directly into the thermal thermos. Keep the thermos basket seal aligned.',
        },
        {
          id: 'clean_finish',
          label: 'Seal Thermos',
          kind: 'drawdown',
          share: 0,
          startSeconds: 230,
          note: 'Remove the brew basket immediately once flow stops, and seal the thermos lid tight to lock in volatiles.',
        },
      ];
      why = 'High Extraction Thermos creates a denser, stronger extraction profile designed to preserve structural intensity and sweet aroma over several hours of thermos storage.';
      watch = 'Stale aroma. If left with open lids, volatile aromatic compounds escape instantly. Seal the thermos immediately when the drawdown ends.';
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
