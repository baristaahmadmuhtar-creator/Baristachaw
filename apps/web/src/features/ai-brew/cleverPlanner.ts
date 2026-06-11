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
  const targetId = params.targetProfile?.id || '';
  const style = input.cleverDripperStyle || 'auto';
  
  // Resolve active style
  let activeStyle: CleverDripperRecipeStyle = style;
  if (style === 'auto') {
    if (input.brewMode === 'iced') {
      activeStyle = 'iced_clever';
    } else if (targetId === 'more_body' || targetId === 'dense_comforting' || doseG >= 24) {
      activeStyle = 'high_dose_concentrate';
    } else if (targetId === 'more_acidity' || targetId === 'floral_transparent' || targetId === 'balance_clean') {
      activeStyle = 'reverse_water_first';
    } else if (targetId === 'fruit_forward') {
      activeStyle = 'double_stage_hybrid';
    } else if (targetId === 'soft_round') {
      activeStyle = 'classic_closed';
    } else if (targetId === 'more_sweetness') {
      if (input.roastLevel === 'light' || input.roastLevel === 'medium_light') {
        activeStyle = 'double_stage_hybrid';
      } else {
        activeStyle = 'classic_closed';
      }
    } else {
      if (input.roastLevel === 'light') {
        activeStyle = 'reverse_water_first';
      } else if (input.roastLevel === 'medium_light') {
        activeStyle = 'double_stage_hybrid';
      } else {
        activeStyle = 'classic_closed';
      }
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
    case 'classic_closed': {
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      
      let steepSec = 180;
      if (input.roastLevel === 'light') {
        steepSec = 240;
      } else if (input.roastLevel === 'medium_light') {
        steepSec = 210;
      } else if (input.roastLevel === 'medium') {
        steepSec = 180;
      } else if (input.roastLevel === 'medium_dark') {
        steepSec = 165;
      } else if (input.roastLevel === 'dark') {
        steepSec = 150;
      }
      
      adjustedProfile.steps = [
        {
          id: 'charge',
          label: 'Charge Closed',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Pour all hot water slowly over grounds with the valve closed to start immersion.',
        },
        {
          id: 'steep',
          label: 'Steep',
          kind: 'wait',
          share: 0,
          startSeconds: 30,
          note: `Keep the lid closed and steep quietly for ${Math.floor(steepSec / 60)}:${(steepSec % 60).toString().padStart(2, '0')} to build body and sweetness.`,
        },
        {
          id: 'release',
          label: 'Release',
          kind: 'release',
          share: 0,
          startSeconds: 30 + steepSec,
          note: 'Place the Clever on the server to open the release valve and drain.',
        },
        {
          id: 'serve',
          label: 'Serve',
          kind: 'serve',
          share: 0,
          startSeconds: 30 + steepSec + 55,
          note: 'Remove dripper. Swirl the server gently to integrate extraction before serving.',
        },
      ];
      why = 'Classic Closed Immersion steeps the coffee fully closed with zero agitation to yield a sweet, balanced, and round body.';
      watch = 'Make sure the lid is tight during steep to retain heat. Do not agitate during the draw to keep clarity high.';
      break;
    }

    case 'reverse_water_first': {
      adjustedProfile.ratioDelta = -0.2;
      adjustedProfile.tempDeltaC = 0.5;
      adjustedProfile.grindBias = 'finer';
      
      let rwSteepSec = 165;
      if (input.roastLevel === 'light') {
        rwSteepSec = 195;
      } else if (input.roastLevel === 'medium_light') {
        rwSteepSec = 180;
      } else if (input.roastLevel === 'medium') {
        rwSteepSec = 165;
      } else if (input.roastLevel === 'medium_dark') {
        rwSteepSec = 135;
      } else if (input.roastLevel === 'dark') {
        rwSteepSec = 115;
      }
      if (targetId === 'more_acidity') {
        rwSteepSec -= 15;
      }
      
      adjustedProfile.steps = [
        {
          id: 'water_pour',
          label: 'Water First',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Pour the entire planned water volume into the closed Clever Dripper first (water-first method).',
        },
        {
          id: 'coffee_add',
          label: 'Add Coffee',
          kind: 'wait',
          share: 0,
          startSeconds: 25,
          note: 'Gently add the coffee grounds on top of the water. Let them float and sink naturally; do not stir to avoid filter clogging.',
        },
        {
          id: 'steep',
          label: 'Closed Steep',
          kind: 'wait',
          share: 0,
          startSeconds: 45,
          note: `Close the lid and let the coffee sink and steep for ${Math.floor(rwSteepSec / 60)}:${(rwSteepSec % 60).toString().padStart(2, '0')}.`,
        },
        {
          id: 'release',
          label: 'Release Valve',
          kind: 'release',
          share: 0,
          startSeconds: 45 + rwSteepSec,
          note: 'Place on server to activate release valve and drain.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 45 + rwSteepSec + 55,
          note: 'Watch the fast, clean drawdown run through the unclogged paper pores.',
        },
      ];
      why = 'Reverse Water-First Steep pours the water first, letting coffee grounds extract gently as they sink. This eliminates filter clogging and achieves brilliant clarity.';
      watch = 'Avoid any stirring or swirling when adding coffee. The grounds must float and sink naturally.';
      break;
    }

    case 'double_stage_hybrid': {
      adjustedProfile.ratioDelta = 0.2;
      adjustedProfile.tempDeltaC = -1.0;
      adjustedProfile.grindBias = 'same';
      
      let bloomSec = 30;
      let secondSteepSec = 90;
      if (input.roastLevel === 'light') {
        bloomSec = 45;
        secondSteepSec = 120;
      } else if (input.roastLevel === 'medium_light') {
        bloomSec = 40;
        secondSteepSec = 105;
      } else if (input.roastLevel === 'medium') {
        bloomSec = 30;
        secondSteepSec = 90;
      } else if (input.roastLevel === 'medium_dark') {
        bloomSec = 30;
        secondSteepSec = 75;
      } else if (input.roastLevel === 'dark') {
        bloomSec = 30;
        secondSteepSec = 60;
      }
      
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
          note: 'Place on the server to release the sweet bloom extract.',
        },
        {
          id: 'second_charge',
          label: 'Second Charge',
          kind: 'pour',
          share: 0.50,
          startSeconds: 30 + bloomSec,
          note: 'Lift the Clever to close the valve, then pour the second water portion in spirals.',
        },
        {
          id: 'immersion_charge',
          label: 'Immersion Top Up',
          kind: 'pour',
          share: 0.30,
          startSeconds: 30 + bloomSec + 40,
          note: 'Pour the final water portion with the valve closed to top up the immersion chamber.',
        },
        {
          id: 'steep',
          label: 'Immersion Steep',
          kind: 'wait',
          share: 0,
          startSeconds: 30 + bloomSec + 40 + 20,
          note: `Close the lid and let the immersion steep for ${secondSteepSec} seconds.`,
        },
        {
          id: 'final_release',
          label: 'Final Release',
          kind: 'release',
          share: 0,
          startSeconds: 30 + bloomSec + 40 + 20 + secondSteepSec,
          note: 'Place back on the server to open the valve and release the sweet concentrate.',
        },
        {
          id: 'drawdown',
          label: 'Drain',
          kind: 'drawdown',
          share: 0,
          startSeconds: 30 + bloomSec + 40 + 20 + secondSteepSec + 10,
          note: 'Let the remaining extraction drain completely into the server.',
        },
      ];
      why = 'Double-Stage Hybrid uses two closed immersion charges with a controlled release between them, keeping sweetness while improving clarity.';
      watch = 'Release timing is key. Lift the Clever cleanly to stop the first flow, then return it only when the second steep is finished.';
      break;
    }

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
          note: 'Pour all hot water rapidly into the closed chamber to wet the grounds. Do not merge ice into brew water.',
        },
        {
          id: 'steep',
          label: 'Steep',
          kind: 'wait',
          share: 0,
          startSeconds: 25,
          note: 'Close the lid and steep. Prepare your server with pre-weighed ice separately. The coffee bed receives hot water only.',
        },
        {
          id: 'release',
          label: 'Release Over Ice',
          kind: 'release',
          share: 0,
          startSeconds: 25 + 95,
          note: 'Place the Clever on the server to activate the release valve. Hot concentrate will drain directly over the ice.',
        },
        {
          id: 'finish',
          label: 'Stir Server',
          kind: 'serve',
          share: 0,
          startSeconds: 25 + 95 + 10 + 45,
          note: 'Let the concentrate drain completely. Swirl the server to melt the ice evenly and integrate.',
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
          startSeconds: 30,
          note: 'Close the lid and let steep. High dose creates a thick bed that extracts slowly via diffusion. Watch for a dense, muddy bed.',
        },
        {
          id: 'release',
          label: 'Release Valve',
          kind: 'release',
          share: 0,
          startSeconds: 30 + 180,
          note: 'Place on server. Warning: high dose may cause a slow, muddy release; do not shake the brewer to prevent over-extraction.',
        },
        {
          id: 'serve',
          label: 'Serve',
          kind: 'serve',
          share: 0,
          startSeconds: 30 + 180 + 10 + 60,
          note: 'Let the rich, syrupy concentrate drain. Serve neat or dilute with milk.',
        },
      ];
      why = 'High-Dose Concentrate uses a massive coffee-to-water ratio and an extended steep to brew a heavy, syrupy liquor. Warning: final clarity will decrease due to filter saturation from the heavy bed, and there is a high risk of over-extraction.';
      watch = 'Muddy bed and slow drain risk. The massive dose increases flow resistance through the bottom valve. Avoid any agitation/swirling during release to prevent fine particles from blocking filter pores.';
      break;
  }

  // Roast Logic Adjustments
  switch (input.roastLevel) {
    case 'light':
      adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) + 1.5;
      if (adjustedProfile.grindBias === 'same') adjustedProfile.grindBias = 'finer';
      break;
    case 'medium_light':
      // Default baseline
      break;
    case 'medium':
      break;
    case 'medium_dark':
      adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 1.5;
      if (adjustedProfile.grindBias === 'same' || adjustedProfile.grindBias === 'finer') adjustedProfile.grindBias = 'coarser';
      break;
    case 'dark':
      adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 3.0;
      adjustedProfile.grindBias = 'coarser';
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
