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
  const { input, profile, doseG } = params;
  const style = input.konoStyle || 'auto';
  if (style === 'auto') {
    return {
      style: 'auto',
      adjustedProfile: profile,
      why: 'Kono Auto style utilizes the default catalog extraction profile to deliver a highly balanced cup.',
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
          note: 'Drip hot water drop-by-drop strictly in the absolute center of the bed. The top paper walls must stay completely dry. Continue for 40 seconds.',
        },
        {
          id: 'center_expansion',
          label: 'Center Expansion',
          kind: 'pour',
          share: 0.25,
          startSeconds: 40,
          note: 'Gradually increase flow rate in a tiny center circle (size of a coin). The coffee bed swells and forms a dome. Let it build.',
        },
        {
          id: 'spiral_extension',
          label: 'Spiral Extension',
          kind: 'pour',
          share: 0.45,
          startSeconds: 85,
          note: 'Pour in a slow widening spiral. Do not touch the filter paper. The water level rises, washing sweet coffee oils down.',
        },
        {
          id: 'fast_flush',
          label: 'Fast Spiral Flush',
          kind: 'pour',
          share: 0.2,
          startSeconds: 120,
          note: 'Pour rapidly in a wide spiral to flush the final volume. The smooth upper cone acts like a funnel, draining fast.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: 155,
          note: 'Allow drawdown to drain. Since the ribs are only at the bottom, water is forced through the central column, maximizing sweetness.',
        },
      ];
      why = 'Kono Meimon Traditional uses Kono\'s signature "center dripping" method. Wetting only the center initially forces water through the deepest coffee column, delivering unparalleled sweetness and heavy body.';
      watch = 'Spill out of center. If you pour water outside the center early on, it will bypass through the smooth upper paper, resulting in a thin, watery cup.';
      break;

    case 'kono_dripper_standard':
      adjustedProfile.ratioDelta = 0.2;
      adjustedProfile.tempDeltaC = -0.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Slow Circle Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Wet grounds in slow concentric circles. Wait 40 seconds. Kono\'s short ribs slow the drawdown compared to V60.',
        },
        {
          id: 'pulse_2',
          label: 'Concentric Pulse 2',
          kind: 'pour',
          share: 0.45,
          startSeconds: 40,
          note: 'Pour in tight center concentric circles. The slurry rises, extracting rich, sweet chocolate notes.',
        },
        {
          id: 'pulse_3',
          label: 'Concentric Pulse 3',
          kind: 'pour',
          share: 0.4,
          startSeconds: 95,
          note: 'Pour the final portion evenly. Settle the bed level and let it drain.',
        },
        {
          id: 'drawdown',
          label: 'Stable Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 155,
          note: 'Let the bed drain completely. Exceptional sweetness and thick, coating mouthfeel.',
        },
      ];
      why = 'Kono Dripper Standard utilizes standard concentric pulsing but leverages Kono\'s short bottom ribs to slow down the flow rate, enhancing mouthfeel and sweetness.';
      watch = 'Bypass control. Keep the water level moderate to avoid high-level bypass through the smooth upper cone wall.';
      break;

    case 'kono_slow_drip_body':
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = -1.5; // Cooler temp for slow extraction
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'extreme_drip_bloom',
          label: 'Extreme Drip Bloom',
          kind: 'pour',
          share: 0.1,
          startSeconds: 0,
          note: 'Drip water slowly in the absolute center. Keep this dripping cadence for 60 seconds to pre-extract rich oils.',
        },
        {
          id: 'slow_coin_spiral_1',
          label: 'Slow Coin Spiral 1',
          kind: 'pour',
          share: 0.35,
          startSeconds: 60,
          note: 'Pour in a slow coin-sized spiral. The water level must rise very slowly, keeping the slurry thick and highly concentrated.',
        },
        {
          id: 'slow_coin_spiral_2',
          label: 'Slow Coin Spiral 2',
          kind: 'pour',
          share: 0.35,
          startSeconds: 110,
          note: 'Pour a second coin-sized spiral, holding the flow rate low. Agitation is minimal.',
        },
        {
          id: 'final_wash',
          label: 'Final Dilution Flush',
          kind: 'pour',
          share: 0.2,
          startSeconds: 155,
          note: 'Pour rapidly in a wide concentric ring to flush the remaining volume. Allow drawdown to drain.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: 195,
          note: 'Drains slowly. Massive body, viscous texture, and highly sweet syrupy finish.',
        },
      ];
      why = 'Kono Slow Drip Body mimics cold-drip percolation by dripping hot water slowly through a tight central column, delivering a highly syrupy, heavy-bodied cup.';
      watch = 'Bitter over-extraction. Because the flow is very slow, ensure the final flush is fast and quick to prevent late bitter compounds from extracting.';
      break;

    case 'iced_kono_meimon':
      adjustedProfile.ratioDelta = -2.2;
      adjustedProfile.tempDeltaC = 2.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'ice_setup_bloom',
          label: 'Center Drip over Ice',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Place 130g of clean ice in the server. Wet the center bed with drop-by-drop boiling water. Let bloom for 35 seconds.',
        },
        {
          id: 'concentrate_spiral_1',
          label: 'Concentrate Spiral 1',
          kind: 'pour',
          share: 0.5,
          startSeconds: 35,
          note: 'Pour in a slow, tight coin-sized center spiral to extract dense sugars. Maintain a high temperature slurry.',
        },
        {
          id: 'concentrate_spiral_2',
          label: 'Concentrate spiral 2',
          kind: 'pour',
          share: 0.35,
          startSeconds: 80,
          note: 'Pour a final rapid concentric ring to flush the concentrate. Let the rich extract drop directly over ice.',
        },
        {
          id: 'chill_finish',
          label: 'Instant Chill Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: 120,
          note: 'Swirl the server to melt ice. Rich, aromatic, and exceptionally sweet iced Kono pour-over.',
        },
      ];
      why = 'Iced Kono Meimon utilizes the slow center-dripping method directly over ice to extract an incredibly sweet, syrupy concentrate before ice dilution takes place.';
      watch = 'Ice melting. Use solid cold ice cubes; weak ice melts instantly during center dripping, making the beverage watery.';
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
          note: 'Pour rapidly in the center. Stir gently 3 times with a spoon to agitate all grounds. Let bloom for 35 seconds.',
        },
        {
          id: 'agitated_pour_1',
          label: 'Agitated Pulse 1',
          kind: 'pour',
          share: 0.45,
          startSeconds: 35,
          note: 'Pour in rapid circular rings, creating turbulence inside the Kono bottom. The short ribs keep slurry high.',
        },
        {
          id: 'slow_wash',
          label: 'Slow Center Wash',
          kind: 'pour',
          share: 0.35,
          startSeconds: 85,
          note: 'Pour the final portion in an extremely slow center stream to settle the coffee bed flat and wash grounds down.',
        },
        {
          id: 'drawdown',
          label: 'Level Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 135,
          note: 'Let the bed settle completely flat. Beautiful complex sweetness, balanced acidity, and heavy mouthfeel.',
        },
      ];
      why = 'Kono Agitation Sweet combines initial turbulent agitation with a slow center-drip finish to extract highly volatile sweet aromatics and complex organic oils.';
      watch = 'Bitter tail. Do not agitate in the final pour; keep it calm and center-focused to avoid extracting late bitter chlorogenic acids.';
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
