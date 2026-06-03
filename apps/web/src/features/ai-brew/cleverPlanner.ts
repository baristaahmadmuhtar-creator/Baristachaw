import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewPlanStep,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  CleverDripperRecipeStyle,
} from './types.ts';

export interface CleverPlanSelection {
  style: CleverDripperRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isCleverDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  return (haystack.includes('clever') || haystack.includes('trap')) && !haystack.includes('matrix');
}

export function resolveCleverPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): CleverPlanSelection {
  const { input, profile, doseG } = params;
  const style = input.cleverDripperStyle || 'auto';
  
  // Resolve active style
  let activeStyle: CleverDripperRecipeStyle = style;
  if (style === 'auto') {
    if (input.brewMode === 'iced') {
      activeStyle = 'iced_clever';
    } else if (doseG >= 24) {
      activeStyle = 'high_dose_concentrate';
    } else {
      activeStyle = 'classic_closed';
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
    case 'classic_closed':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'charge',
          label: 'Charge Closed',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Pour all hot water slowly over grounds. Close the lid and let steep.',
        },
        {
          id: 'steep',
          label: 'Steep',
          kind: 'wait',
          share: 0,
          startSeconds: 120,
          note: 'Hold immersion contact without more pouring or repeated stirring.',
        },
        {
          id: 'release',
          label: 'Release',
          kind: 'release',
          share: 0,
          startSeconds: 180,
          note: 'Open the valve over the server and let the bed drain cleanly.',
        },
        {
          id: 'serve',
          label: 'Serve',
          kind: 'serve',
          share: 0,
          startSeconds: 235,
          note: 'Serve after drawdown; if muddy, go slightly coarser next brew.',
        },
      ];
      why = 'Classic Closed Immersion steeps the coffee fully closed with zero agitation to yield a sweet, balanced, and round body.';
      watch = 'Make sure the lid is tight during steep to retain heat. Do not agitate during the draw to keep clarity high.';
      break;

    case 'reverse_water_first':
      adjustedProfile.ratioDelta = -0.2;
      adjustedProfile.tempDeltaC = 0.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'water_pour',
          label: 'Water First',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Pour all hot water into the closed chamber first.',
        },
        {
          id: 'coffee_add',
          label: 'Add Coffee',
          kind: 'wait',
          share: 0,
          startSeconds: 15,
          note: 'Gently scatter all coffee grounds onto the water surface. Do not stir!',
        },
        {
          id: 'steep',
          label: 'Closed Steep',
          kind: 'wait',
          share: 0,
          startSeconds: 45,
          note: 'Close the lid and steep. The coffee will sink slowly and extract with absolute clarity.',
        },
        {
          id: 'release',
          label: 'Release Valve',
          kind: 'release',
          share: 0,
          startSeconds: 180,
          note: 'Place on server to activate release valve.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 235,
          note: 'Let the clean liquor drain completely.',
        },
      ];
      why = 'Reverse Water-First Steep pours the water first, letting coffee grounds extract gently as they sink. This eliminates filter clogging and achieves brilliant clarity.';
      watch = 'Avoid any stirring or swirling when adding coffee. The grounds must float and sink naturally.';
      break;

    case 'double_stage_hybrid':
      adjustedProfile.ratioDelta = 0.2;
      adjustedProfile.tempDeltaC = -1.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'first_charge',
          label: 'First Charge',
          kind: 'pour',
          share: 0.20,
          startSeconds: 0,
          note: 'Add the first hot-water charge with the release closed. Wet all grounds evenly.',
        },
        {
          id: 'first_release',
          label: 'First Release',
          kind: 'release',
          share: 0,
          startSeconds: 30,
          note: 'Place on the serving vessel to release the first sweet liquor.',
        },
        {
          id: 'second_charge',
          label: 'Second Charge',
          kind: 'pour',
          share: 0.50,
          startSeconds: 50,
          note: 'Remove the Clever so the release closes, then add the next water portion calmly.',
        },
        {
          id: 'immersion_charge',
          label: 'Immersion Top Up',
          kind: 'pour',
          share: 0.30,
          startSeconds: 100,
          note: 'Finish the planned hot-water charge while the release stays closed.',
        },
        {
          id: 'steep',
          label: 'Immersion Steep',
          kind: 'wait',
          share: 0,
          startSeconds: 120,
          note: 'Let it steep closed for 40 seconds to build body and sweetness.',
        },
        {
          id: 'final_release',
          label: 'Final Release',
          kind: 'release',
          share: 0,
          startSeconds: 160,
          note: 'Place back on the serving vessel to release the final rich liquor.',
        },
        {
          id: 'drawdown',
          label: 'Drain',
          kind: 'drawdown',
          share: 0,
          startSeconds: 215,
          note: 'Let the flow finish cleanly without adding more water.',
        },
      ];
      why = 'Double-Stage Hybrid uses two closed immersion charges with a controlled release between them, keeping sweetness while improving clarity.';
      watch = 'Release timing is key. Lift the Clever cleanly to stop the first flow, then return it only when the second steep is finished.';
      break;

    case 'iced_clever':
      adjustedProfile.ratioDelta = -0.6;
      adjustedProfile.tempDeltaC = 1.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'charge',
          label: 'Charge Closed',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Pour all hot water rapidly into the closed chamber. Stir 3 times.',
        },
        {
          id: 'steep',
          label: 'Steep',
          kind: 'wait',
          share: 0,
          startSeconds: 15,
          note: 'Close the lid and steep. Prepare your server with pre-weighed ice.',
        },
        {
          id: 'release',
          label: 'Release Over Ice',
          kind: 'release',
          share: 0,
          startSeconds: 140,
          note: 'Place the dripper on the ice server. Release the hot concentrate directly over the ice.',
        },
        {
          id: 'finish',
          label: 'Stir Server',
          kind: 'serve',
          share: 0,
          startSeconds: 195,
          note: 'Let it drain completely. Swirl the server to melt the ice evenly.',
        },
      ];
      why = 'Iced Clever steeps a tight, high-heat concentrate in a fully closed chamber before releasing it directly over ice, capturing all volatile fruit aromatics.';
      watch = 'Thermal shock. Ensure the release occurs directly over the ice cubes for immediate cooling.';
      break;

    case 'high_dose_concentrate':
      adjustedProfile.ratioDelta = -2.0;
      adjustedProfile.tempDeltaC = -1.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'charge',
          label: 'High Dose Pour',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Pour all hot water slowly in circular paths over the high-dose bed. Stir gently.',
        },
        {
          id: 'steep',
          label: 'Extended Steep',
          kind: 'wait',
          share: 0,
          startSeconds: 20,
          note: 'Close the lid and let steep for an extended 3.5 minutes to maximize density.',
        },
        {
          id: 'release',
          label: 'Release Valve',
          kind: 'release',
          share: 0,
          startSeconds: 230,
          note: 'Place on server. The coarse grind will prevent the heavy bed from clogging.',
        },
        {
          id: 'serve',
          label: 'Serve',
          kind: 'serve',
          share: 0,
          startSeconds: 300,
          note: 'Let the rich, syrupy concentrate drain. Serve neat or dilute with bypass.',
        },
      ];
      why = 'High-Dose Concentrate uses a massive coffee-to-water ratio and an extended steep to brew a heavy, syrupy liquor reminiscent of siphon or espresso.';
      watch = 'Prevent choking. Do not swirl or shake the dripper during release, or the fine particles will clog the paper holes.';
      break;
  }

  // Adjust label
  adjustedProfile.label = `Clever Dripper - ${activeStyle.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
  adjustedProfile.recipeStyle = activeStyle as any;

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
