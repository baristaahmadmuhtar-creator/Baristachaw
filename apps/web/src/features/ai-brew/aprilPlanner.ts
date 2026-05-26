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
  const { input, profile, doseG } = params;
  const style = input.aprilStyle || 'auto';
  if (style === 'auto') {
    return {
      style: 'auto',
      adjustedProfile: profile,
      why: 'April Auto style utilizes the default catalog extraction profile to deliver a highly balanced cup.',
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
          note: 'Pour 50% circular and 50% center water. Wet grounds evenly and let bloom for 35 seconds to allow gas escape.',
        },
        {
          id: 'pulse_2',
          label: 'Pulse 2 (Circular)',
          kind: 'pour',
          share: 0.3,
          startSeconds: 35,
          note: 'Pour in medium concentric circles; keep water stream close to the coffee bed. Maintain slow, even flow.',
        },
        {
          id: 'pulse_3',
          label: 'Pulse 3 (Center)',
          kind: 'pour',
          share: 0.3,
          startSeconds: 70,
          note: 'Execute a straight center pour to push extraction in the deepest part of the flat-bottom bed.',
        },
        {
          id: 'pulse_4',
          label: 'Final Concentric Pulse',
          kind: 'pour',
          share: 0.2,
          startSeconds: 100,
          note: 'Pour the final portion in concentric rings to wash the bed flat. Let it drain completely.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 135,
          note: 'Drains slowly and evenly. Flat-bottom geometry yields exceptional sweetness and complex clean flavors.',
        },
      ];
      why = 'April Flat Bottom Standard utilizes April\'s signature 4-pulse pattern (balancing circular and center streams) to achieve high clarity and a beautiful, sweet balance.';
      watch = 'Keep stream low. Pouring from too high will agitate grounds excessively, pushing micro-fines into the bottom paper flutes and clogging drawdown.';
      break;

    case 'april_continuous_slow':
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = 0.5;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'rinse_bed',
          label: 'Rinse & Setup',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Rinse flat filter. Dose coffee slightly coarser. Flatten the bed with a gentle tap.',
        },
        {
          id: 'slow_stream',
          label: 'Slow Continuous Stream',
          kind: 'pour',
          share: 1.0,
          startSeconds: 10,
          note: 'Pour water continuously in a highly controlled, very slow center spiral. Avoid fast circles. Total stream should take exactly 100 seconds.',
        },
        {
          id: 'slow_draw',
          label: 'Sweet Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 110,
          note: 'Let the water drain through the bed completely. The continuous flow minimizes agitation, leading to maximum sweetness.',
        },
      ];
      why = 'April Continuous Slow relies on an extremely slow, stable pour with zero pauses to keep slurry temperature high, maximizing sweet sugar extraction.';
      watch = 'Slurry level. Keep the water level low and constant. If water rises too high, bypass will increase, weakening the extraction.';
      break;

    case 'competition_two_pour':
      adjustedProfile.ratioDelta = 0.3;
      adjustedProfile.tempDeltaC = 1.5; // High temperature
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Concentric Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Pour aggressively in concentric circles to wet all grounds quickly. Let bloom for 30 seconds.',
        },
        {
          id: 'large_pour_1',
          label: 'Large Concentric Pour',
          kind: 'pour',
          share: 0.45,
          startSeconds: 30,
          note: 'Pour 60% circular, 40% center rapidly. Build a high water column to agitate grounds deeply, forcing high acid release.',
        },
        {
          id: 'large_pour_2',
          label: 'Large Center Finish',
          kind: 'pour',
          share: 0.4,
          startSeconds: 75,
          note: 'Execute a fast, heavy center pour. The high head pressure extracts complex fruit notes. Let drain.',
        },
        {
          id: 'drawdown',
          label: 'Rapid Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 125,
          note: 'Allow the bed to settle completely flat. sparkling acidity and excellent fruit-forward brightness.',
        },
      ];
      why = 'Competition Two-Pour uses two large, heavy-flow pours to create intense slurry agitation, highlighting sparkling acidity and bright tropical notes.';
      watch = 'Channeling. If you pour too aggressively in one spot, you will carve a hole in the bed. Keep the circular pour uniform.';
      break;

    case 'iced_april_style':
      adjustedProfile.ratioDelta = -2.0;
      adjustedProfile.tempDeltaC = 2.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'ice_prep',
          label: 'Ice prep & Bloom',
          kind: 'pour',
          share: 0.2,
          startSeconds: 0,
          note: 'Place 120g of clean ice in the server. Pour boiling water over grounds in circular rings. Let bloom for 30 seconds.',
        },
        {
          id: 'concentrate_pour_1',
          label: 'Concentrate Circular Pour',
          kind: 'pour',
          share: 0.5,
          startSeconds: 30,
          note: 'Pour rapidly in tight concentric circles to extract dense sugars. Maintain a high temperature slurry.',
        },
        {
          id: 'concentrate_pour_2',
          label: 'Concentrate Center Pour',
          kind: 'pour',
          share: 0.3,
          startSeconds: 65,
          note: 'Pour the final portion in the center. The dense coffee concentrate drips directly over ice to chill instantly.',
        },
        {
          id: 'chill_finish',
          label: 'Instant Chill',
          kind: 'drawdown',
          share: 0,
          startSeconds: 105,
          note: 'Swirl the chilled coffee to melt the remaining ice, ensuring a rich, non-watery cold pour-over.',
        },
      ];
      why = 'Iced April Style extracts a highly concentrated, rich yield directly over ice, capturing sweet Scandinavian profiles in a cold, refreshing format.';
      watch = 'Ice melt rate. Ensure the ice is large and cold (not melting at room temp before start) to keep concentration ratio high.';
      break;

    case 'high_body_heavy_dose':
      adjustedProfile.ratioDelta = 0.5;
      adjustedProfile.tempDeltaC = -1.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'heavy_bloom',
          label: 'Heavy Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: 'Saturate the thick bed with concentric circles. Let bloom for 40 seconds to completely de-gas the heavy coffee dose.',
        },
        {
          id: 'tight_pulse_1',
          label: 'Tight Center Pulse 1',
          kind: 'pour',
          share: 0.3,
          startSeconds: 40,
          note: 'Pour in extremely tight concentric circles around the center. Avoid pouring near the edges to prevent bypass.',
        },
        {
          id: 'tight_pulse_2',
          label: 'Tight Center Pulse 2',
          kind: 'pour',
          share: 0.3,
          startSeconds: 80,
          note: 'Pour second portion in the center, keeping water level low to restrict bypass flow along the paper ribs.',
        },
        {
          id: 'tight_pulse_3',
          label: 'Tight Concentric Pulse 3',
          kind: 'pour',
          share: 0.25,
          startSeconds: 115,
          note: 'Final gentle circular pulse to settle the heavy bed level. Let drain completely.',
        },
        {
          id: 'heavy_drain',
          label: 'Slow Heavy Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 160,
          note: 'Let the heavy bed drain fully. Rich, creamy mouthfeel, low acidity, and heavy sweet body.',
        },
      ];
      why = 'High Body Heavy Dose leverages tight center pulses and restricted bypass to force water through the deep coffee column, extracting heavy, chocolate-sweet compounds.';
      watch = 'Bypass flow. If you pour close to the paper edges, water will run down the channels instead of through the coffee, resulting in a thin, sour cup.';
      break;
  }

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
