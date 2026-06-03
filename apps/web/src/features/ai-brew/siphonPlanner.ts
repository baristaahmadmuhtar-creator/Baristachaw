import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  SiphonRecipeStyle,
} from './types.ts';

export interface SiphonPlanSelection {
  style: SiphonRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
}

export function isSiphonDripperId(id: string): boolean {
  const haystack = id.toLowerCase();
  return haystack.includes('siphon') || haystack.includes('vacuum') || haystack.includes('hario');
}

export function resolveSiphonPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): SiphonPlanSelection {
  const { input, profile, doseG } = params;
  const style = input.siphonStyle || 'auto';
  if (style === 'auto') {
    return {
      style: 'auto',
      adjustedProfile: profile,
      why: 'Siphon Auto style utilizes the default catalog extraction profile to deliver a highly balanced cup.',
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
    case 'traditional_vacuum_siphon':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'bottom_boil',
          label: 'Preheat & Vapor Rise',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Fill bottom bulb with preheated water. Fit the top chamber securely with pre-wet cloth filter. Heat bottom until water rises.',
        },
        {
          id: 'dose_stir_1',
          label: 'Dose & First Agitation',
          kind: 'pour',
          share: 0,
          startSeconds: 45,
          note: 'Add coffee grounds to the upper water column. Execute a calm, circular stir with a bamboo paddle to wet all coffee. Let steep.',
        },
        {
          id: 'second_stir',
          label: 'Second Stir Infusion',
          kind: 'pour',
          share: 0,
          startSeconds: 90,
          note: 'Stir gently one more time to break the coffee crust. Keep heat stable to hold water in the upper chamber.',
        },
        {
          id: 'kill_heat_draw',
          label: 'Vapor Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 120,
          note: 'Remove the heat source. Execute a final rapid paddle swirl to create a vortex. The coffee drains down as the bottom bulb cools.',
        },
      ];
      why = 'Traditional Vacuum Siphon uses two balanced paddle agitations and cloth filtration to produce an exceptionally clean, sweet, and hot cup.';
      watch = 'Cloth filter care. The cloth filter must be washed and stored in water in the fridge to avoid rancid coffee oil odors.';
      break;

    case 'competition_triple_agitation':
      adjustedProfile.ratioDelta = 0.2;
      adjustedProfile.tempDeltaC = 1.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'vapor_rise',
          label: 'Preheat & Rise',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Heat the bottom chamber. Let water rise. Lower butane flame slightly to stabilize water temperature around 92°C.',
        },
        {
          id: 'turbo_stir_1',
          label: 'Aggressive Stir 1',
          kind: 'pour',
          share: 0,
          startSeconds: 30,
          note: 'Dump coffee in and execute a rapid back-and-forth cross stir for 10 seconds to maximize extraction velocity.',
        },
        {
          id: 'turbo_stir_2',
          label: 'Turbulence Stir 2',
          kind: 'pour',
          share: 0,
          startSeconds: 65,
          note: 'Perform a fast concentric paddle swirl to incorporate dense coffee oils floating on the slurry surface.',
        },
        {
          id: 'turbo_stir_3',
          label: 'Final Vortex Swirl',
          kind: 'pour',
          share: 0,
          startSeconds: 100,
          note: 'Remove heat. Immediately stir in a circle 10 times to form a perfect central dome. Let vacuum suction pull the brew down.',
        },
        {
          id: 'fast_draw',
          label: 'Suction Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: 130,
          note: 'Wait for the final foam dome to form in the top chamber as air bubbles hiss into the bottom bulb.',
        },
      ];
      why = 'Competition Triple Agitation introduces three separate, intense paddle agitations to maximize solubles extraction, yielding massive body and intense sweetness.';
      watch = 'Dome checking. Ensure the dome is uniform at the end. An uneven dome indicates structural channeling inside the cloth filter.';
      break;

    case 'low_temp_delicate':
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = -4.0; // Lower extraction temp
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'low_rise',
          label: 'Controlled Temperature Rise',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Let water rise. Turn heat down significantly so the water column rests at a gentle 85-88°C (ideal for geishas).',
        },
        {
          id: 'gentle_folding',
          label: 'Gentle Paddle Fold',
          kind: 'pour',
          share: 0,
          startSeconds: 45,
          note: 'Slowly fold the coffee grounds into the water with minimal agitation. Keep the lid on to preserve volatile jasmine aromas.',
        },
        {
          id: 'slow_vacuum',
          label: 'Delicate Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 135,
          note: 'Remove flame. Wrap the bottom chamber with a damp cool cloth to gently accelerate the siphon suction without burning the coffee.',
        },
      ];
      why = 'Low Temperature Delicate reduces heating to brew fragile light roasts at a cooler 86°C, highlighting floral, tea-like, and highly volatile flavor profiles.';
      watch = 'Premature drop. If you lower the heat too much, the water column will drop back to the bottom bulb before you finish brewing. Keep heat stable.';
      break;

    case 'high_body_fast_drawdown':
      adjustedProfile.ratioDelta = -1.0;
      adjustedProfile.tempDeltaC = 2.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'hot_rise',
          label: 'Vapor Hot Rise',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Boil bottom chamber aggressively. Let water rise. Grind coffee coarse (French Press size) to ensure an ultra-fast drawdown.',
        },
        {
          id: 'fast_steep',
          label: 'Short Contact Infusion',
          kind: 'pour',
          share: 0,
          startSeconds: 30,
          note: 'Dose grounds. Stir 5 times in a cross pattern. Let steep for only 30 seconds to capture sweet primary solids.',
        },
        {
          id: 'vortex_pull',
          label: 'Vortex Pull',
          kind: 'drawdown',
          share: 0,
          startSeconds: 70,
          note: 'Kill heat. Stir vigorously in circles to create a strong vortex. The coarse grounds drain down in under 20 seconds.',
        },
      ];
      why = 'High Body Fast Drawdown utilizes a coarse grind and a rapid, short extraction window to capture rich aromatic oils without pulling bitter heavy tannins.';
      watch = 'Vortex power. Coarse grounds settle quickly. If the vortex is too weak, grounds will trap water in the upper chamber. Swirl firmly.';
      break;

    case 'spirit_infusion_style':
      adjustedProfile.ratioDelta = 0.5;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'botanical_setup',
          label: 'Botanical Chamber Setup',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Add preheated water and clean dried orange peels or botanical herbs into the bottom bulb. Heat until the vapor rises.',
        },
        {
          id: 'grounds_dose',
          label: 'Grounds Wetting',
          kind: 'pour',
          share: 0,
          startSeconds: 45,
          note: 'Add coffee grounds to the top chamber. The steam rising from the bottom carries botanical volatile oils into the coffee bed.',
        },
        {
          id: 'infusion_mix',
          label: 'Botanical Steeping',
          kind: 'pour',
          share: 0,
          startSeconds: 95,
          note: 'Execute two gentle paddle folds. Let the hybrid mixture steep. The bottom liquid will boil and distill compounds.',
        },
        {
          id: 'vacuum_wash',
          label: 'Botanical Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 140,
          note: 'Kill heat. Swirl paddle and let the vapor cool. The final cup is a rich, spiced, and beautifully infused beverage.',
        },
      ];
      why = 'Spirit Infusion Style introduces organic botanicals or spices directly into the bottom boiler bulb, using vapor distillation to naturally infuse the coffee.';
      watch = 'Boiler stains. Avoid using sticky sugary syrups inside the bottom bulb; high heat will burn the sugar, leaving persistent stains and cracking the glass.';
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
