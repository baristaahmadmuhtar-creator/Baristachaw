import type {
  AiBrewCatalog,
  AiBrewFormState,
  BrewTemplateStep,
  DeviceBrewProfile,
  EquipmentCatalogEntry,
  ProcessCatalogEntry,
  TargetProfile,
  OrigamiRecipeStyle,
  OrigamiFilterStyle,
} from './types.ts';

export interface OrigamiPlanSelection {
  style: OrigamiRecipeStyle;
  adjustedProfile: DeviceBrewProfile;
  why: string;
  watch: string;
  resolvedFilterStyle: 'cone' | 'wave';
}

export function isOrigamiDripperId(id: string | number): boolean {
  const haystack = String(id).toLowerCase();
  return haystack.includes('origami') || haystack === '53';
}

export function resolveOrigamiPlanSelection(params: {
  input: AiBrewFormState;
  catalog: AiBrewCatalog;
  dripper: EquipmentCatalogEntry;
  profile: DeviceBrewProfile;
  targetProfile?: TargetProfile;
  processEntry?: ProcessCatalogEntry;
  doseG: number;
}): OrigamiPlanSelection {
  const { input, profile, doseG } = params;
  const style = input.origamiStyle || 'auto';

  // 1. Resolve Active Filter Style
  let activeFilter: 'cone' | 'wave' = 'cone';
  if (input.origamiFilterStyle === 'cone') {
    activeFilter = 'cone';
  } else if (input.origamiFilterStyle === 'wave') {
    activeFilter = 'wave';
  } else {
    // auto filter style: resolve based on target rasa or roast or process
    const targetId = params.targetProfile?.id || '';
    if (targetId === 'more_acidity' || targetId === 'floral_transparent') {
      activeFilter = 'cone';
    } else if (targetId === 'more_sweetness' || targetId === 'more_body' || targetId === 'soft_round' || targetId === 'dense_comforting') {
      activeFilter = 'wave';
    } else if (targetId === 'fruit_forward') {
      activeFilter = 'cone';
    } else if (targetId === 'balance_clean') {
      const proc = params.processEntry?.id || '';
      if (proc === 'washed') {
        activeFilter = 'cone';
      } else {
        activeFilter = 'wave';
      }
    } else {
      if (input.roastLevel === 'light') {
        activeFilter = 'cone';
      } else if (input.roastLevel === 'medium_dark' || input.roastLevel === 'dark') {
        activeFilter = 'wave';
      } else {
        activeFilter = 'cone';
      }
    }
  }

  // 2. Resolve Active Recipe Style
  let activeStyle = style;
  if (style === 'auto') {
    if (input.brewMode === 'iced') {
      activeStyle = 'iced_origami';
    } else {
      const targetId = params.targetProfile?.id || '';
      if (targetId === 'more_acidity' || targetId === 'floral_transparent') {
        activeStyle = 'cone_dripper_style';
      } else if (targetId === 'more_sweetness' || targetId === 'more_body' || targetId === 'soft_round' || targetId === 'dense_comforting') {
        activeStyle = 'wave_dripper_style';
      } else if (targetId === 'fruit_forward') {
        activeStyle = 'competition_hybrid_flow';
      } else if (targetId === 'balance_clean') {
        const proc = params.processEntry?.id || '';
        if (proc === 'washed') {
          activeStyle = 'cone_dripper_style';
        } else {
          activeStyle = 'wave_dripper_style';
        }
      } else {
        if (input.roastLevel === 'light') {
          activeStyle = 'cone_dripper_style';
        } else if (input.roastLevel === 'medium_dark' || input.roastLevel === 'dark') {
          activeStyle = 'wave_dripper_style';
        } else {
          activeStyle = 'cone_dripper_style';
        }
      }
    }
  }

  // 3. Inherit Base Profile dynamically based on active filter
  const isIced = input.brewMode === 'iced';
  const resolvedProfileId = activeFilter === 'wave'
    ? (isIced ? 'profile_origami_wave_iced' : 'profile_origami_wave_hot')
    : (isIced ? 'profile_origami_iced' : 'profile_origami_hot');

  const catalogProfile = params.catalog.deviceProfiles.find(p => p.id === resolvedProfileId);
  const baseProfile = catalogProfile || profile;

  const adjustedProfile: DeviceBrewProfile = {
    ...baseProfile,
    steps: [],
  };

  let why = '';
  let watch = '';

  const safetyWarning = 'Warning: Ensure dripper collar/holder is stable. Seat the filter paper flat and flush into the ceramic ridges before brewing.';

  switch (activeStyle) {
    case 'cone_dripper_style': {
      adjustedProfile.ratioDelta = baseProfile.ratioDelta;
      adjustedProfile.tempDeltaC = baseProfile.tempDeltaC;
      adjustedProfile.grindBias = baseProfile.grindBias;
      
      let bloomSeconds = 40;
      let agitationNote = 'Pour in slow concentric rings; the 20 deep ribs allow air to vent rapidly, facilitating a fast flow rate.';
      
      if (input.roastLevel === 'light') {
        adjustedProfile.tempDeltaC = baseProfile.tempDeltaC + 1.0;
        adjustedProfile.grindBias = 'same';
      } else if (input.roastLevel === 'medium_dark') {
        adjustedProfile.tempDeltaC = baseProfile.tempDeltaC - 1.0;
      } else if (input.roastLevel === 'dark') {
        adjustedProfile.tempDeltaC = baseProfile.tempDeltaC - 2.5;
        adjustedProfile.grindBias = 'coarser';
        adjustedProfile.ratioDelta = baseProfile.ratioDelta - 0.5;
        bloomSeconds = 30;
        agitationNote = 'Lower agitation dark roast: Pour very gently in slow center-focused circles to minimize bitterness extraction.';
      }

      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.2,
          startSeconds: 0,
          note: `Use a cone paper filter. Wet all grounds quickly with tight concentric circles to initiate degassing. Seat filter flat and flush on a stable holder. Wait ${bloomSeconds} seconds.`,
        },
        {
          id: 'second_pour',
          label: 'Second Pour',
          kind: 'pour',
          share: 0.45,
          startSeconds: bloomSeconds,
          note: agitationNote,
        },
        {
          id: 'final_pour',
          label: 'Final Pour',
          kind: 'pour',
          share: 0.35,
          startSeconds: bloomSeconds + 50,
          note: 'Complete the volume with a gentle center pour. Do not swirl the dripper to avoid clogging the exit hole.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: bloomSeconds + 110,
          note: 'Let the brew drain rapidly. Cone filter style active, highlighting high brightness and sparkling acidity with a faster cone flow. Ensure the collar holder is stable.',
        },
      ];
      why = 'Cone Dripper style utilizes standard conical papers and Origami\'s deep air channels to achieve a fast, high-flow drawdown, bringing out stellar floral acidity.';
      watch = `Fast drawdown check. If the flow is too fast, grind slightly finer to build adequate contact pressure inside the cone bed. ${safetyWarning}`;
      break;
    }

    case 'wave_dripper_style': {
      adjustedProfile.ratioDelta = baseProfile.ratioDelta;
      adjustedProfile.tempDeltaC = baseProfile.tempDeltaC;
      adjustedProfile.grindBias = 'finer';
      
      let bloomSeconds = 35;
      let agitationNote = 'Pour in a slow center concentric circle. Flat-bed wave filter ridges restrict bypass flow, maintaining a deep coffee column.';
      
      if (input.roastLevel === 'light') {
        adjustedProfile.tempDeltaC = baseProfile.tempDeltaC + 0.7;
        adjustedProfile.grindBias = 'same';
      } else if (input.roastLevel === 'medium_dark') {
        adjustedProfile.tempDeltaC = baseProfile.tempDeltaC - 1.3;
      } else if (input.roastLevel === 'dark') {
        adjustedProfile.tempDeltaC = baseProfile.tempDeltaC - 3.3;
        adjustedProfile.grindBias = 'coarser';
        adjustedProfile.ratioDelta = baseProfile.ratioDelta - 0.5;
        bloomSeconds = 30;
        agitationNote = 'Low agitation: Pour very gently in center-only pulses. Do not stir to prevent choking/muddy bed.';
      }

      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.15,
          startSeconds: 0,
          note: `Insert a flat-bottom wave filter paper. Seat it flat and flush on a stable holder. Pour warm water over the center bed. Let it saturate evenly. Wait ${bloomSeconds} seconds.`,
        },
        {
          id: 'pulse_2',
          label: 'Pulse 2',
          kind: 'pour',
          share: 0.3,
          startSeconds: bloomSeconds,
          note: agitationNote,
        },
        {
          id: 'pulse_3',
          label: 'Pulse 3',
          kind: 'pour',
          share: 0.3,
          startSeconds: bloomSeconds + 40,
          note: 'Pour gently in the center flutes. The flat-bottom contact creates high extraction contact time, maximizing sweetness.',
        },
        {
          id: 'pulse_4',
          label: 'Final Pulse',
          kind: 'pour',
          share: 0.25,
          startSeconds: bloomSeconds + 75,
          note: 'Execute a calm concentric circle to rinse the coffee bed down level. Keep slurry flat.',
        },
        {
          id: 'drawdown',
          label: 'Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: bloomSeconds + 135,
          note: 'Flat-bottom wave filter extraction active, yielding heavy body, deep chocolate sweetness, low bitterness. Maintain compact pulses for balanced extraction. Ensure dripper is stable on the collar.',
        },
      ];
      why = 'Wave Dripper style mounts a flat-bottom filter to restrict water flow through the bottom flutes, extending extraction contact to maximize deep sugars and heavy body.';
      watch = `Crushed ridges. Take care not to crush the wave filter's paper ridges during installation; deformed ridges will cause uneven side bypass. ${safetyWarning}`;
      break;
    }

    case 'mugen_one_pour': {
      adjustedProfile.ratioDelta = baseProfile.ratioDelta - 0.4;
      adjustedProfile.tempDeltaC = baseProfile.tempDeltaC + 3.0;
      adjustedProfile.grindBias = 'coarser';
      
      let pourTime = 90;
      if (input.roastLevel === 'dark') {
        adjustedProfile.tempDeltaC = baseProfile.tempDeltaC - 1.5;
        adjustedProfile.grindBias = 'coarser';
        adjustedProfile.ratioDelta = baseProfile.ratioDelta - 0.5;
        pourTime = 75;
      }

      adjustedProfile.steps = [
        {
          id: 'rinse_bed',
          label: 'Rinse & Setup',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Use a V60 cone paper. Rinse with hot water. Seat filter flat and flush on a stable holder. Dose coffee slightly coarser, and make a small well in the center.',
        },
        {
          id: 'one_pour_phase',
          label: 'Continuous Slow Pour',
          kind: 'pour',
          share: 1.0,
          startSeconds: 10,
          note: `Pour all water continuously in a highly controlled, very slow center stream. Total pour duration should take exactly ${pourTime} seconds.`,
        },
        {
          id: 'drawdown_mugen',
          label: 'Slow Mugen Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: pourTime + 10,
          note: 'Let the water percolate through the bed completely. Cone filter active. Heavy sweetness and extreme clarity due to zero agitation with flow agile draw. Check holder stability.',
        },
      ];
      why = 'Mugen One-Pour utilizes a slow, uninterrupted center stream with zero pulse agitations to produce a crystal-clear cup with sweet, delicate undertones.';
      watch = `Pour speed. If you pour too fast, water will overflow the coffee bed. Keep the flow rate narrow and slow (approx. 2-3g/second). ${safetyWarning} Conical filter only, wave filter is incompatible.`;
      break;
    }

    case 'iced_origami': {
      adjustedProfile.ratioDelta = baseProfile.ratioDelta;
      adjustedProfile.tempDeltaC = baseProfile.tempDeltaC;
      adjustedProfile.grindBias = 'finer';
      
      if (input.roastLevel === 'dark') {
        adjustedProfile.tempDeltaC = baseProfile.tempDeltaC - 4.0;
        adjustedProfile.grindBias = 'same';
      }

      if (doseG >= 24) {
        adjustedProfile.steps = [
          {
            id: 'ice_prep',
            label: 'Ice Setup & Bloom',
            kind: 'pour',
            share: 0.15,
            startSeconds: 0,
            note: `Fit a ${activeFilter === 'wave' ? 'wave' : 'cone'} filter. Seat filter flat on a stable holder. Place measured ice in the server. Wet grounds with aggressive high-temperature concentric circles.`,
          },
          {
            id: 'heavy_pulse_1',
            label: 'Intense Pulse 1',
            kind: 'pour',
            share: 0.25,
            startSeconds: 30,
            note: 'Pour rapidly in the center flutes. High flow rate is critical to dissolve dense solids before the ice melting begins.',
          },
          {
            id: 'heavy_pulse_2',
            label: 'Intense Pulse 2',
            kind: 'pour',
            share: 0.20,
            startSeconds: 55,
            note: 'Execute a fast second concentric circle to keep water pressure high.',
          },
          {
            id: 'heavy_pulse_3',
            label: 'Intense Pulse 3',
            kind: 'pour',
            share: 0.20,
            startSeconds: 80,
            note: 'Execute a third concentric circle to extract deep sugars.',
          },
          {
            id: 'heavy_pulse_4',
            label: 'Intense Pulse 4',
            kind: 'pour',
            share: 0.20,
            startSeconds: 105,
            note: 'Execute a fast final circle to top up the volume. The high water pressure agitates grounds deeply.',
          },
          {
            id: 'drawdown',
            label: 'Decant & Serve',
            kind: 'drawdown',
            share: 0,
            startSeconds: 140,
            note: `The concentrate drips directly over ice, chilling instantly and preserving bright, citrusy acidity. Active filter style: ${activeFilter === 'wave' ? 'wave/flat-bottom' : 'cone'}. Maintain compact pulses or faster cone flow as appropriate.`,
          },
        ];
      } else {
        adjustedProfile.steps = [
          {
            id: 'ice_prep',
            label: 'Ice Setup & Bloom',
            kind: 'pour',
            share: 0.2,
            startSeconds: 0,
            note: `Fit a ${activeFilter === 'wave' ? 'wave' : 'cone'} filter. Seat filter flat on a stable holder. Place measured ice in the server. Wet grounds with aggressive high-temperature concentric circles.`,
          },
          {
            id: 'heavy_pulse_1',
            label: 'Intense Pulse 1',
            kind: 'pour',
            share: 0.5,
            startSeconds: 30,
            note: 'Pour rapidly in the center flutes. High flow rate is critical to dissolve dense solids before the ice melting begins.',
          },
          {
            id: 'heavy_pulse_2',
            label: 'Intense Pulse 2',
            kind: 'pour',
            share: 0.3,
            startSeconds: 65,
            note: 'Execute a fast final circle to top up the volume. The high water pressure agitates grounds deeply.',
          },
          {
            id: 'drawdown',
            label: 'Decant & Serve',
            kind: 'drawdown',
            share: 0,
            startSeconds: 110,
            note: `The concentrate drips directly over ice, chilling instantly and preserving bright, citrusy acidity. Active filter style: ${activeFilter === 'wave' ? 'wave/flat-bottom' : 'cone'}. Maintain compact pulses or faster cone flow as appropriate.`,
          },
        ];
      }
      why = 'Iced Origami leverages the fast flow rate of the cone filter to drip a rich, dense concentrate rapidly over ice, preserving sparkling volatiles.';
      watch = `Ice volume. Ensure you weigh the ice accurately; excessive ice will dilute the concentrate, resulting in a thin, watery mouthfeel. ${safetyWarning}`;
      break;
    }

    case 'competition_hybrid_flow': {
      adjustedProfile.ratioDelta = baseProfile.ratioDelta + 0.4;
      adjustedProfile.tempDeltaC = baseProfile.tempDeltaC + 1.0;
      adjustedProfile.grindBias = 'finer';
      
      let bloomStirs = 3;
      if (input.roastLevel === 'dark') {
        adjustedProfile.tempDeltaC = baseProfile.tempDeltaC - 0.5;
        adjustedProfile.grindBias = 'coarser';
        adjustedProfile.ratioDelta = baseProfile.ratioDelta - 0.5;
        bloomStirs = 1;
      }

      adjustedProfile.steps = [
        {
          id: 'bloom',
          label: 'Bloom',
          kind: 'pour',
          share: 0.2,
          startSeconds: 0,
          note: `Use a ${activeFilter === 'wave' ? 'wave' : 'cone'} filter. Seat filter on a stable holder. Pour aggressively in center circles and stir gently ${bloomStirs} times to wet all grounds. Let bloom 35 seconds.`,
        },
        {
          id: 'pulse_concentric',
          label: 'Concentric Ring Pulse',
          kind: 'pour',
          share: 0.4,
          startSeconds: 35,
          note: 'Pour in rapid concentric circles, climbing up the dry filter walls to wash high grounds down into the slurry.',
        },
        {
          id: 'pulse_slow_center',
          label: 'Slow Center Finish',
          kind: 'pour',
          share: 0.4,
          startSeconds: 85,
          note: 'Pour the final portion in an extremely slow, calm center stream to let the fine bed settle and extract deep sweetness.',
        },
        {
          id: 'drawdown',
          label: 'Level Drawdown',
          kind: 'drawdown',
          share: 0,
          startSeconds: 145,
          note: `Allow the bed to settle completely flat. Hybrid style active (resolved filter: ${activeFilter}). Excellent complex acidity coupled with a sweet, long finish. Flow agile draw. Ensure holder stability.`,
        },
      ];
      why = 'Competition Hybrid Flow combines aggressive high-flow turbulent pulses for brightness with a slow center-drip finish to extract sweet heavy oils.';
      watch = `Over-agitation. Stirring too aggressively in the final phase will cause extreme bitterness and bypass clogging. Keep the final pour calm. ${safetyWarning}`;
      break;
    }
  }

  adjustedProfile.recipeStyle = activeStyle as DeviceBrewProfile['recipeStyle'];

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
    resolvedFilterStyle: activeFilter,
  };
}
