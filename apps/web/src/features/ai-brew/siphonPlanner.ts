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

const SIPHON_GLASS_HEAT_SAFETY_WARNING = 'Peringatan keselamatan siphon: alat memakai panas dan kaca. Jaga panas stabil. Untuk mencegah kejutan termal dan kaca retak, bowl bawah dan globe tidak boleh diisi es atau air dingin langsung. Jika ingin efek dingin, tuang hasil seduhan ke server kaca terpisah yang aman untuk es.';
const SIPHON_HIGH_AGITATION_WARNING = 'Peringatan agitasi siphon: agitasi tinggi dapat membuat rasa kasar, kering, atau pahit. Pastikan kubah bubuk merata dan hentikan pengadukan setelah aliran turun stabil.';
const SIPHON_PREMATURE_DROPDOWN_WARNING = 'Peringatan siphon: jaga panas stabil agar air tetap berada di ruang atas sampai fase kontak selesai.';
const SIPHON_MUDDY_FINE_GRIND_WARNING = 'Peringatan siphon: risiko rasa berlumpur atau kasar tinggi jika gilingan terlalu halus atau agitasi berlebihan. Putar paddle secukupnya untuk membentuk pusaran yang stabil.';
const SIPHON_BLOCKED_SPIRIT_WARNING = 'Diblokir. Jangan mencoba infusi alkohol di siphon karena uap alkohol mudah terbakar dan berisiko ledakan.';

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
  const { input, dripper, profile, doseG } = params;
  const style = input.siphonStyle || 'auto';
  
  let activeStyle = style;
  if (style === 'auto') {
    const targetId = params.targetProfile?.id || '';
    if (targetId === 'more_body' || targetId === 'dense_comforting') {
      activeStyle = 'high_body_fast_drawdown';
    } else if (targetId === 'more_sweetness' || targetId === 'fruit_forward') {
      activeStyle = 'competition_triple_agitation';
    } else if (targetId === 'more_acidity' || targetId === 'floral_transparent') {
      activeStyle = 'low_temp_delicate';
    } else if (targetId === 'balance_clean' || targetId === 'soft_round') {
      activeStyle = 'traditional_vacuum_siphon';
    } else {
      if (input.roastLevel === 'light') {
        activeStyle = 'low_temp_delicate';
      } else {
        activeStyle = 'traditional_vacuum_siphon';
      }
    }
  }

  if (dripper.id !== 'hario-siphon') {
    return {
      style: activeStyle,
      adjustedProfile: {
        ...profile,
        recipeStyle: activeStyle as DeviceBrewProfile['recipeStyle'],
      },
      why: 'Vacuum siphon brewing extracts a very clean, sweet, and hot cup.',
      watch: SIPHON_GLASS_HEAT_SAFETY_WARNING,
    };
  }

  const adjustedProfile: DeviceBrewProfile = {
    ...profile,
    steps: [],
  };

  let why = '';
  let watch = '';

  const safetyWarning = SIPHON_GLASS_HEAT_SAFETY_WARNING;

  switch (activeStyle) {
    case 'traditional_vacuum_siphon': {
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      
      let drawdownStart = 120;
      let agitationNote = 'Stir gently one more time to break the coffee crust. Keep heat stable to hold water in the upper chamber.';
      
      if (input.roastLevel === 'medium_dark') {
        drawdownStart = 105;
        agitationNote = 'Lower agitation: Stir very gently one more time to break the crust. Keep heat stable to hold water in the upper chamber.';
      } else if (input.roastLevel === 'dark') {
        adjustedProfile.tempDeltaC = -3.0;
        adjustedProfile.grindBias = 'coarser';
        drawdownStart = 100;
        agitationNote = 'Minimal agitation: Fold the crust very gently with a single pass to minimize bitterness extraction. Keep heat stable.';
      } else if (input.roastLevel === 'light') {
        agitationNote = 'Stir gently one more time to break the crust. Keep heat source stable and steady to hold water in the upper chamber.';
      }

      adjustedProfile.steps = [
        {
          id: 'bottom_boil',
          label: 'Preheat Lower Bowl',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Fill bottom bulb with preheated water. Fit the top chamber securely with pre-wet cloth filter. Heat bottom until water rises.',
        },
        {
          id: 'vapor_rise',
          label: 'Vapor Rise',
          kind: 'heat',
          share: 0,
          startSeconds: 45,
          note: 'Wait for water to rise completely. Adjust heat to stabilize the water column.',
        },
        {
          id: 'dose_stir_1',
          label: 'Dose & Stir',
          kind: 'wait',
          share: 0,
          startSeconds: 90,
          note: 'Add coffee grounds to the upper water column. Execute a calm, circular stir with a bamboo paddle to wet all coffee. Let steep.',
        },
        {
          id: 'second_stir',
          label: 'Second Stir',
          kind: 'wait',
          share: 0,
          startSeconds: Math.min(110, drawdownStart - 10),
          note: agitationNote,
        },
        {
          id: 'kill_heat_draw',
          label: 'Vapor Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: drawdownStart,
          note: 'Remove the heat source. Execute a final rapid paddle swirl to create a vortex. The coffee drains down as the bottom bulb cools.',
        },
        {
          id: 'serve',
          label: 'Serve',
          kind: 'serve',
          share: 0,
          startSeconds: drawdownStart + 40,
          note: 'Carefully remove upper chamber and serve.',
        },
      ];
      why = 'Traditional Vacuum Siphon uses two balanced paddle agitations and cloth filtration to produce an exceptionally clean, sweet, and hot cup.';
      watch = safetyWarning;
      break;
    }

    case 'competition_triple_agitation': {
      adjustedProfile.ratioDelta = 0.2;
      adjustedProfile.tempDeltaC = 1.0;
      adjustedProfile.grindBias = 'finer';
      
      let drawdownStart = 130;
      let stir1Note = 'Dump coffee in and execute a rapid back-and-forth cross stir for 10 seconds to maximize extraction velocity.';
      let stir2Note = 'Perform a fast concentric paddle swirl to incorporate dense coffee oils floating on the slurry surface.';
      let stir3Note = 'Remove heat. Immediately stir in a circle 10 times to form a perfect central dome. Let vacuum suction pull the brew down.';
      
      if (input.roastLevel === 'medium_dark') {
        drawdownStart = 115;
        stir2Note = 'Perform a gentle concentric paddle swirl to incorporate coffee oils with lower agitation.';
      } else if (input.roastLevel === 'dark') {
        adjustedProfile.tempDeltaC = -3.0;
        adjustedProfile.grindBias = 'coarser';
        drawdownStart = 100;
        stir1Note = 'Dump coffee in and stir very gently to wet grounds with minimal agitation.';
        stir2Note = 'Perform a very slow, single folding swirl to incorporate coffee oils.';
        stir3Note = 'Remove heat. Stir gently 3 times to form a dome. Let vacuum suction pull the brew down.';
      }

      adjustedProfile.steps = [
        {
          id: 'bottom_boil',
          label: 'Preheat Lower Bowl',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Heat the bottom chamber. Let water rise. Lower butane flame slightly to stabilize water temperature around 92°C.',
        },
        {
          id: 'vapor_rise',
          label: 'Vapor Rise',
          kind: 'heat',
          share: 0,
          startSeconds: 30,
          note: 'Let water rise and stabilize in the upper chamber before dosing.',
        },
        {
          id: 'turbo_stir_1',
          label: 'Aggressive Stir 1',
          kind: 'wait',
          share: 0,
          startSeconds: 45,
          note: stir1Note,
        },
        {
          id: 'turbo_stir_2',
          label: 'Turbulence Stir 2',
          kind: 'wait',
          share: 0,
          startSeconds: Math.min(80, drawdownStart - 35),
          note: stir2Note,
        },
        {
          id: 'fast_draw',
          label: 'Suction Finish',
          kind: 'drawdown',
          share: 0,
          startSeconds: drawdownStart,
          note: stir3Note,
        },
        {
          id: 'serve',
          label: 'Serve',
          kind: 'serve',
          share: 0,
          startSeconds: drawdownStart + 40,
          note: 'Wait for the final foam dome to form. Carefully remove upper chamber and serve.',
        },
      ];
      why = 'Competition Triple Agitation introduces three separate, intense paddle agitations to maximize solubles extraction, yielding massive body and intense sweetness.';
      watch = `${safetyWarning} ${SIPHON_HIGH_AGITATION_WARNING}`;
      break;
    }

    case 'low_temp_delicate': {
      adjustedProfile.ratioDelta = -0.5;
      adjustedProfile.tempDeltaC = -4.0;
      adjustedProfile.grindBias = 'finer';
      
      let drawdownStart = 135;
      let stabilizationNote = 'Monitor water column temperature, ensuring it rests at a gentle 85-88C.';
      let whyTemperature = 'a cooler 86C';
      let delicateNote = 'Let water rise. Turn heat down significantly so the water column rests at a gentle 85-88°C (ideal for geishas). Keep heat source stable and not boiling hard.';
      
      if (input.roastLevel === 'light' && params.processEntry?.id === 'washed') {
        adjustedProfile.tempDeltaC = -1.0;
        delicateNote = 'Let water rise. Turn heat down modestly so the water column rests around 91-93C for washed light coffee clarity. Keep heat source stable and not boiling hard.';
        stabilizationNote = 'Monitor water column temperature, keeping a steady 91-93C range for washed light coffee.';
        whyTemperature = 'a controlled 91-93C';
      }

      if (input.roastLevel === 'medium_dark') {
        drawdownStart = 120;
      } else if (input.roastLevel === 'dark') {
        adjustedProfile.tempDeltaC = -3.0;
        adjustedProfile.grindBias = 'coarser';
        drawdownStart = 110;
        delicateNote = 'Let water rise. Lower heat significantly to rest at a cooler temperature. Keep heat source stable and not boiling hard to hold the water column.';
      }

      adjustedProfile.steps = [
        {
          id: 'bottom_boil',
          label: 'Preheat Lower Bowl',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: delicateNote,
        },
        {
          id: 'vapor_rise',
          label: 'Controlled Temp Stabilization',
          kind: 'heat',
          share: 0,
          startSeconds: 45,
          note: stabilizationNote,
        },
        {
          id: 'gentle_folding',
          label: 'Gentle Paddle Fold',
          kind: 'wait',
          share: 0,
          startSeconds: 75,
          note: 'Slowly fold the coffee grounds into the water with minimal agitation. Keep the lid on to preserve volatile jasmine aromas.',
        },
        {
          id: 'steep_infusion',
          label: 'Delicate Steeping',
          kind: 'wait',
          share: 0,
          startSeconds: Math.min(110, drawdownStart - 20),
          note: 'Allow coffee to steep gently. Maintain stable low heat to prevent premature drawdown.',
        },
        {
          id: 'slow_vacuum',
          label: 'Delicate Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: drawdownStart,
          note: 'Remove flame. Wrap the bottom chamber with a damp cool cloth to gently accelerate the siphon suction without burning the coffee.',
        },
        {
          id: 'serve',
          label: 'Serve',
          kind: 'serve',
          share: 0,
          startSeconds: drawdownStart + 45,
          note: 'Carefully remove upper chamber and serve.',
        },
      ];
      why = `Low Temperature Delicate reduces heating to brew fragile light roasts at ${whyTemperature}, highlighting floral, tea-like, and highly volatile flavor profiles.`;
      watch = `${safetyWarning} ${SIPHON_PREMATURE_DROPDOWN_WARNING}`;
      break;
    }

    case 'high_body_fast_drawdown': {
      adjustedProfile.ratioDelta = -1.0;
      adjustedProfile.tempDeltaC = 2.0;
      adjustedProfile.grindBias = 'coarser';
      
      let drawdownStart = 70;
      
      if (input.roastLevel === 'medium_dark') {
        drawdownStart = 60;
      } else if (input.roastLevel === 'dark') {
        adjustedProfile.tempDeltaC = -3.0;
        adjustedProfile.grindBias = 'coarser';
        drawdownStart = 55;
      }

      adjustedProfile.steps = [
        {
          id: 'bottom_boil',
          label: 'Preheat Lower Bowl',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Boil bottom chamber aggressively. Let water rise. Grind coffee coarse (French Press size) to ensure an ultra-fast drawdown.',
        },
        {
          id: 'vapor_rise',
          label: 'Vapor Hot Rise',
          kind: 'heat',
          share: 0,
          startSeconds: 20,
          note: 'Stabilize heat at peak boiling point to prepare for quick extraction.',
        },
        {
          id: 'fast_steep',
          label: 'Short Contact Infusion',
          kind: 'wait',
          share: 0,
          startSeconds: 30,
          note: 'Dose grounds. Stir 5 times in a cross pattern. Let steep for only 30 seconds to capture sweet primary solids.',
        },
        {
          id: 'steep_infusion',
          label: 'Brief Steeping',
          kind: 'wait',
          share: 0,
          startSeconds: Math.min(50, drawdownStart - 10),
          note: 'Keep heat stable and let the coffee steep briefly before terminating the extraction.',
        },
        {
          id: 'vortex_pull',
          label: 'Vortex Pull',
          kind: 'drawdown',
          share: 0,
          startSeconds: drawdownStart,
          note: 'Kill heat. Stir vigorously in circles to create a strong vortex. The coarse grounds drain down in under 20 seconds.',
        },
        {
          id: 'serve',
          label: 'Serve',
          kind: 'serve',
          share: 0,
          startSeconds: drawdownStart + 30,
          note: 'Carefully remove upper chamber and serve.',
        },
      ];
      why = 'High Body Fast Drawdown utilizes a coarse grind and a rapid, short extraction window to capture rich aromatic oils without pulling bitter heavy tannins.';
      watch = `${safetyWarning} ${SIPHON_MUDDY_FINE_GRIND_WARNING}`;
      break;
    }

    case 'spirit_infusion_style': {
      adjustedProfile.ratioDelta = 0.5;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'bottom_boil',
          label: 'Preheat Lower Bowl',
          kind: 'pour',
          share: 1.0,
          startSeconds: 0,
          note: 'Add preheated water and clean dried orange peels or botanical herbs into the bottom bulb. Heat until the vapor rises.',
        },
        {
          id: 'vapor_rise',
          label: 'Botanical Chamber Setup',
          kind: 'heat',
          share: 0,
          startSeconds: 45,
          note: 'Let vapor rise to preheat the upper chamber and carry volatile oils.',
        },
        {
          id: 'grounds_dose',
          label: 'Grounds Wetting',
          kind: 'wait',
          share: 0,
          startSeconds: 75,
          note: 'Add coffee grounds to the top chamber. The steam rising from the bottom carries botanical volatile oils into the coffee bed.',
        },
        {
          id: 'infusion_mix',
          label: 'Botanical Steeping',
          kind: 'wait',
          share: 0,
          startSeconds: 110,
          note: 'Execute two gentle paddle folds. Let the hybrid mixture steep. The bottom liquid will boil and distill compounds.',
        },
        {
          id: 'vacuum_wash',
          label: 'Botanical Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 140,
          note: 'Kill heat. Swirl paddle and let the vapor cool.',
        },
        {
          id: 'serve',
          label: 'Serve',
          kind: 'serve',
          share: 0,
          startSeconds: 190,
          note: 'Carefully remove upper chamber and serve.',
        },
      ];
      why = 'Spirit Infusion Style is blocked by default due to alcohol vapor flammability and food safety risks.';
      watch = `${SIPHON_BLOCKED_SPIRIT_WARNING} (spirit_infusion_style)`;
      break;
    }
  }

  adjustedProfile.recipeStyle = activeStyle as DeviceBrewProfile['recipeStyle'];

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
