import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  MokaPotRecipeStyle,
} from './types.ts';

export interface MokaPlanSelection {
  style: MokaPotRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isMokaPotDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  return haystack.includes('moka') || haystack.includes('bialetti');
}

export function resolveMokaPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): MokaPlanSelection {
  const { input, profile, doseG } = params;
  const targetId = params.targetProfile?.id || '';
  const style = input.mokaPotStyle || 'auto';

  // Resolve active style
  let activeStyle: MokaPotRecipeStyle = style;
  if (style === 'auto') {
    if (input.brewMode === 'iced') {
      activeStyle = 'iced_moka_concentrate';
    } else if (targetId === 'more_body' || targetId === 'dense_comforting') {
      activeStyle = 'high_yield_robust';
    } else if (targetId === 'more_sweetness') {
      if (input.roastLevel === 'light' || input.roastLevel === 'medium_light') {
        activeStyle = 'low_temp_controlled';
      } else {
        activeStyle = 'preheated_boiler';
      }
    } else if (targetId === 'balance_clean' || targetId === 'fruit_forward' || targetId === 'more_acidity' || targetId === 'floral_transparent') {
      activeStyle = 'low_temp_controlled';
    } else if (targetId === 'soft_round') {
      activeStyle = 'traditional_stovetop';
    } else {
      if (input.roastLevel === 'light' || input.roastLevel === 'medium_light') {
        activeStyle = 'low_temp_controlled';
      } else {
        activeStyle = 'traditional_stovetop';
      }
    }
  }

  const adjustedProfile: DeviceBrewProfile = {
    ...profile,
    steps: [],
  };

  const targetWarnings: string[] = [];
  if (targetId === 'more_acidity') {
    targetWarnings.push('Moka Pot is not ideal for high acidity coffees as the high stovetop pressure and temperature tend to suppress delicate acidity.');
  }
  if (targetId === 'fruit_forward') {
    targetWarnings.push('Medium confidence: Moka Pot extraction dynamics can suppress delicate fruit aromatics.');
  }
  if (targetId === 'floral_transparent') {
    targetWarnings.push('Low fit warning: Stovetop brewing is not well-suited for extracting highly transparent floral notes.');
  }

  let why = '';
  let watch = '';

  switch (activeStyle) {
    case 'traditional_stovetop':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'fill_boiler',
          label: 'Fill Boiler',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Fill the bottom chamber with room-temperature water up to just below the safety valve. Do not compress or tamp grounds.',
        },
        {
          id: 'heat_up',
          label: 'Heat Up',
          kind: 'heat',
          share: 0,
          startSeconds: 30,
          note: 'Place on medium heat with open lid. Wait for the coffee to start flowing smoothly into the upper chamber.',
        },
        {
          id: 'extraction',
          label: 'Extraction Rise',
          kind: 'serve',
          share: 0,
          startSeconds: 240,
          note: 'When the flow turns pale yellow/blonde or starts to sputter, immediately remove the pot from heat and cool the base.',
        },
      ];
      why = 'Traditional Stovetop style starts with room-temperature water in the boiler. Heat climbs slowly, producing a classic rich stovetop extraction.';
      watch = 'Avoid over-boiling. Sputtering/bubbling at the end extracts bitter woody compounds. Remove from heat early.';
      break;

    case 'preheated_boiler':
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = 5.0; // Higher initial temp
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'preheat_water',
          label: 'Preheat Boiler',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Fill bottom boiler with freshly boiled hot water up to the safety valve. Use silicone mitts or a dry towel to assemble the hot pot securely—do not tamp grounds.',
        },
        {
          id: 'fast_extraction',
          label: 'Fast Extraction',
          kind: 'heat',
          share: 0,
          startSeconds: 15,
          note: 'Place on medium-high heat with lid open. Flow should start within 30-45 seconds due to preheated steam pressure.',
        },
        {
          id: 'quench_finish',
          label: 'Quench Finish',
          kind: 'serve',
          share: 0,
          startSeconds: 90,
          note: 'As flow turns blond, immediately quench the bottom of the pot in cold water or wrap with a cold wet towel to stop extraction.',
        },
      ];
      why = 'Pre-heated Boiler uses boiling water in the bottom chamber to minimize contact time between dry grounds and the hot metal, preserving delicate sweetness.';
      watch = 'Pot gets extremely hot instantly during assembly. Use silicone mitts or a thick towel to tighten the base threads securely.';
      break;

    case 'low_temp_controlled':
      adjustedProfile.ratioDelta = 0.5;
      adjustedProfile.tempDeltaC = -2.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'paper_filter_setup',
          label: 'Filter Setup & Boiler',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Wet a paper Aeropress filter and stick it to the upper metal filter screen. Fill boiler with warm water (60°C) below the safety valve. Level coffee without tamping.',
        },
        {
          id: 'slow_cooking',
          label: 'Low Heat cooking',
          kind: 'heat',
          share: 0,
          startSeconds: 20,
          note: 'Place on ultra-low heat. The paper filter increases back-pressure, requiring a slower, gentler rise to extract cleaner oils.',
        },
        {
          id: 'delicate_pour',
          label: 'Delicate Yield',
          kind: 'serve',
          share: 0,
          startSeconds: 300,
          note: 'Allow the viscous concentrate to pool slowly. Remove from stove before the central steam column erupts.',
        },
      ];
      why = 'Low-Temperature Controlled utilizes an Aeropress paper filter on the metal screen to increase pressure and filter out sediment, yielding an incredibly clean cup.';
      watch = 'Flow rate is very slow. Do not increase the stove temperature to force it; excessive heat will burn the grounds against the paper filter.';
      break;

    case 'iced_moka_concentrate':
      adjustedProfile.ratioDelta = -2.0; // Very tight ratio for concentrate
      adjustedProfile.tempDeltaC = 4.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'iced_boiler',
          label: 'Boiler & Ice prep',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Fill boiler with hot water up to just below the safety valve. Put 120g of clean ice in a serving glass. This is an iced serving/concentrate, not a standard iced brew.',
        },
        {
          id: 'concentrated_rise',
          label: 'Concentrated Rise',
          kind: 'heat',
          share: 0,
          startSeconds: 15,
          note: 'Place pot on medium heat. Grind coffee finer to restrict flow and increase extraction solids.',
        },
        {
          id: 'decant_ice',
          label: 'Decant over Ice',
          kind: 'serve',
          share: 0,
          startSeconds: 100,
          note: 'Pour the first 60-80ml of dense concentrate directly over ice. Leave the tail sputter in the pot completely.',
        },
      ];
      why = 'Iced Moka Concentrate targets a hot-brewed concentrate served over ice (iced serving/concentrate, not a standard iced brew) to prevent ice melt dilution, delivering an intense, sweet, and cold beverage.';
      watch = 'Spill hazard. Moka concentrate is highly viscous; ensure the pouring spout is dry to avoid dripping hot coffee outside the ice cup.';
      break;

    case 'high_yield_robust':
      adjustedProfile.ratioDelta = 1.0;
      adjustedProfile.tempDeltaC = -2.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'large_fill',
          label: 'Robust Boiler Fill',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Fill boiler to just below the safety valve. Dose coffee and level without tamping. Warning: high heat might cause bitterness or burnt taste.',
        },
        {
          id: 'high_thermal',
          label: 'High Thermal Rise',
          kind: 'heat',
          share: 0,
          startSeconds: 20,
          note: 'Start on low-medium heat. Keep lid closed. Let pressure push a high-volume robust extraction through the basket.',
        },
        {
          id: 'full_draw',
          label: 'Full Chamber Draw',
          kind: 'serve',
          share: 0,
          startSeconds: 200,
          note: 'Allow pot to extract until the upper chamber is full. Quench base in cold water only if sputtering becomes too dry.',
        },
      ];
      why = 'High Yield Robust is optimized for dark roasts, using a coarser grind and larger volume to capture maximum body. Warning: higher temperature increases over-extraction and bitterness risk.';
      watch = 'Bitterness and over-extraction risk. Watch the color of the steam. If it turns colorless/white, remove the pot immediately to avoid excessive bitterness.';
      break;

    case 'auto':
      break;
  }

  // Roast Logic Adjustments
  switch (input.roastLevel) {
    case 'light':
      adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) + 1.0;
      if (adjustedProfile.grindBias === 'same') adjustedProfile.grindBias = 'finer';
      break;
    case 'medium_light':
      // Default baseline
      break;
    case 'medium':
      break;
    case 'medium_dark':
      adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 1.0;
      if (adjustedProfile.grindBias === 'same' || adjustedProfile.grindBias === 'finer') adjustedProfile.grindBias = 'coarser';
      break;
    case 'dark':
      adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 2.5;
      adjustedProfile.grindBias = 'coarser';
      break;
  }

  if (input.roastLevel === 'light') {
    const lightRoastNote = 'Light roast: Moka pot can suppress clarity for light roasts. Low-temperature controlled style with a paper filter is recommended to protect delicate acidity.';
    why = why ? `${lightRoastNote} ${why}` : lightRoastNote;
  } else if (input.roastLevel === 'dark') {
    const darkRoastWarning = 'Dark roast warning: Use low heat and stop the extraction early. Do not use high-yield style unless target is dense to protect sweetness and avoid burnt/bitter notes.';
    watch = watch ? `${darkRoastWarning} ${watch}` : darkRoastWarning;
  }

  if (targetWarnings.length > 0) {
    const joined = targetWarnings.join(' ');
    watch = watch ? `${joined} ${watch}` : joined;
  }

  adjustedProfile.recipeStyle = activeStyle as DeviceBrewProfile['recipeStyle'];
  adjustedProfile.label = `Moka Pot - ${activeStyle.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
