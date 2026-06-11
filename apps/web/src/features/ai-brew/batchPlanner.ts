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
  const { input, dripper, profile, doseG } = params;
  const targetId = params.targetProfile?.id || '';
  const style = input.batchBrewStyle || 'auto';

  // Resolve active style
  let activeStyle: BatchBrewRecipeStyle = style;
  if (style === 'auto') {
    if (targetId === 'more_body' || targetId === 'dense_comforting') {
      activeStyle = 'heavy_batch_catering';
    } else if (targetId === 'more_sweetness' || targetId === 'soft_round') {
      activeStyle = 'high_extraction_thermos';
    } else if (targetId === 'more_acidity' || targetId === 'fruit_forward' || targetId === 'floral_transparent') {
      activeStyle = 'bright_light_roast_batch';
    } else if (input.roastLevel === 'light') {
      activeStyle = 'bright_light_roast_batch';
    } else {
      activeStyle = 'sca_gold_cup';
    }
  }

  const adjustedProfile: DeviceBrewProfile = {
    ...profile,
    steps: [],
  };

  const targetWarnings: string[] = [];
  if (targetId === 'floral_transparent') {
    targetWarnings.push('Warning: Floral notes have lower clarity and extraction confidence in a batch brewer.');
  } else if (targetId === 'more_acidity' || targetId === 'fruit_forward') {
    targetWarnings.push('Warning: Batch brewing mutes bright fruit acidity compared to manual cone drippers.');
  }

  // Pre-wet hybrid batch capability check
  const isPreWetCapable = dripper.id.toLowerCase().includes('precision') || 
                          dripper.name.toLowerCase().includes('precision') || 
                          (dripper.expertDescription && dripper.expertDescription.toLowerCase().includes('pre-wet')) ||
                          (dripper.description && dripper.description.toLowerCase().includes('pre-wet'));

  const isIced = input.brewMode === 'iced';
  const serverSafetyWarning = isIced ? 'Server safety warning: Ensure your carafe/server is safe for direct icing (thermal shock hazard).' : '';

  let why = '';
  let watch = '';

  switch (activeStyle) {
    case 'sca_gold_cup':
      // 55 g/L default guideline ratio (which corresponds to 18.18 ratio).
      // Since default ratioDefault is 16.5, ratioDelta of 1.68 achieves 18.18.
      adjustedProfile.ratioDelta = 1.68;
      adjustedProfile.tempDeltaC = 0.0;
      adjustedProfile.grindBias = 'same';
      adjustedProfile.steps = [
        {
          id: 'prep_basket',
          label: 'Dose & Prep Basket',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Pilih filter sesuai basket. Timbang coffee sesuai batch size. Bilas filter jika memungkinkan, lalu ratakan bed di keranjang basket.',
        },
        {
          id: 'start_cycle',
          label: 'Siklus Mesin',
          kind: 'pour',
          share: 1.0,
          startSeconds: 15,
          note: isIced
            ? `Isi reservoir sesuai volume. Start cycle. Spray head menyebarkan air panas ke keranjang basket langsung di atas es. ${serverSafetyWarning}`
            : 'Isi reservoir sesuai volume. Start cycle. Pancuran spray head menyebarkan air panas merata ke keranjang basket.',
        },
        {
          id: 'drawdown',
          label: 'Air Turun',
          kind: 'drawdown',
          share: 0,
          startSeconds: 240,
          note: 'Jangan remove basket sebelum cycle selesai. Biarkan air turun selesai alami.',
        },
        {
          id: 'carafe_mix',
          label: 'Aduk Batch',
          kind: 'serve',
          share: 0,
          startSeconds: 300,
          note: 'Setelah selesai, mix carafe/airpot agar larutan rata. Holding quality warning: sajikan segera untuk kesegaran optimal.',
        },
      ];
      why = 'SCA Gold Cup utilizes standard basket filtration and calibrated spray cycles to deliver a balanced cafe standard.';
      watch = 'Align the spray head evenly. Always mix the carafe after the cycle completes to distribute the stratified extraction.';
      break;

    case 'heavy_batch_catering':
      adjustedProfile.ratioDelta = -1.5; // Stronger ratio (e.g. 15.0)
      adjustedProfile.tempDeltaC = -1.0;
      adjustedProfile.grindBias = 'coarser';
      adjustedProfile.steps = [
        {
          id: 'catering_prep',
          label: 'Prep Large Basket',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Pilih filter tebal sesuai basket. Timbang dosis katering besar, ratakan bed di keranjang basket (jangan menggunung).',
        },
        {
          id: 'heavy_cycle',
          label: 'Siklus Mesin',
          kind: 'pour',
          share: 1.0,
          startSeconds: 15,
          note: isIced
            ? `Isi reservoir sesuai volume. Start cycle. Pancuran spray head menyebarkan air volume tinggi langsung di atas es. Monitor basket agar tidak meluap. ${serverSafetyWarning}`
            : 'Isi reservoir sesuai volume. Start cycle. Pancuran spray head menyebarkan air volume tinggi. Monitor basket agar tidak meluap.',
        },
        {
          id: 'heavy_drawdown',
          label: 'Air Turun',
          kind: 'drawdown',
          share: 0,
          startSeconds: 360,
          note: 'Jangan remove basket sebelum cycle selesai. Biarkan bed tebal meniris perlahan.',
        },
        {
          id: 'catering_mix',
          label: 'Aduk Batch',
          kind: 'serve',
          share: 0,
          startSeconds: 420,
          note: 'Setelah selesai, mix carafe/airpot secara ekstensif. Holding quality warning: rasa akan terdegradasi seiring waktu penyimpanan.',
        },
      ];
      why = 'Heavy Batch Catering adjusts the grind coarser and lowers temperature slightly to prevent over-extraction in high-volume catering brews.';
      watch = 'Basket overflow risk. Keep grounds level and monitor flow rate. Holding warning: large catering batches experience lower clarity and faster flavor degradation.';
      break;

    case 'bright_light_roast_batch':
      adjustedProfile.ratioDelta = 0.0;
      adjustedProfile.tempDeltaC = 2.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'light_prep',
          label: 'Prep Light Basket',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Pilih filter sesuai basket, bilas filter. Timbang kopi sangrai ringan (light roast), ratakan bed di keranjang basket.',
        },
        {
          id: 'light_cycle',
          label: 'Siklus Mesin',
          kind: 'pour',
          share: 1.0,
          startSeconds: 15,
          note: isIced
            ? `Isi reservoir. Start cycle. Air suhu tinggi disemprotkan lewat spray head langsung di atas es. ${serverSafetyWarning}`
            : 'Isi reservoir. Start cycle. Air suhu tinggi disemprotkan lewat spray head untuk mendobrak selular kopi yang padat.',
        },
        {
          id: 'light_drawdown',
          label: 'Air Turun',
          kind: 'drawdown',
          share: 0,
          startSeconds: 220,
          note: 'Jangan remove basket sebelum cycle selesai. Aliran cepat karena sedikit soluble silt, menghasilkan asiditas cerah.',
        },
        {
          id: 'light_mix',
          label: 'Aduk Batch',
          kind: 'serve',
          share: 0,
          startSeconds: 280,
          note: 'Setelah selesai, mix carafe/airpot. Sajikan segera untuk menjaga aroma buah yang kompleks.',
        },
      ];
      why = 'Bright Light-Roast Batch uses higher temperature and finer medium-fine grind to force extraction from high-density light-roast beans.';
      watch = 'Flow rate bypass. Monitor the extraction; weak machine heating elements will fail to extract bright acids and cause sourness.';
      break;

    case 'pre_wet_hybrid_batch':
      adjustedProfile.ratioDelta = -0.2;
      adjustedProfile.tempDeltaC = 0.5;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'hybrid_prep',
          label: 'Prep & Pre-wet Basket',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Pilih filter sesuai basket, bilas filter. Timbang kopi, ratakan bed di basket.',
        },
        {
          id: 'machine_pre_wet',
          label: 'Siklus Mesin Bloom',
          kind: 'pour',
          share: 0.25,
          startSeconds: 15,
          note: 'Mesin menjalankan siklus pre-wet / bloom otomatis. Biarkan hamparan kopi mekar selama 45-60 detik. Warning: Pastikan mesin memiliki fitur pre-wet / bloom; tidak semua batch brewer bisa bloom.',
        },
        {
          id: 'machine_main',
          label: 'Siklus Mesin Utama',
          kind: 'pour',
          share: 0.75,
          startSeconds: 75,
          note: isIced
            ? `Siklus shower utama mesin berlanjut langsung di atas es. Jangan buka tutup keranjang basket. ${serverSafetyWarning}`
            : 'Siklus shower utama mesin berlanjut di atas hamparan kopi yang sudah basah merata.',
        },
        {
          id: 'hybrid_drawdown',
          label: 'Air Turun',
          kind: 'drawdown',
          share: 0,
          startSeconds: 260,
          note: 'Jangan remove basket sebelum cycle selesai. Biarkan air turun selesai alami.',
        },
        {
          id: 'hybrid_mix',
          label: 'Aduk Batch',
          kind: 'serve',
          share: 0,
          startSeconds: 320,
          note: 'Setelah selesai, mix carafe/airpot. Nikmati ekstraksi rata tanpa dry pockets.',
        },
      ];
      why = 'Pre-wet Hybrid Batch leverages programmable pre-wetting or machine bloom cycles to fully saturate grounds before percolation starts.';
      watch = 'Machine capability check required. Warning: Ensure your machine has pre-wet capability; do not claim all batch brewers can bloom. Timing is automatically controlled.';
      break;

    case 'high_extraction_thermos':
      adjustedProfile.ratioDelta = -0.8;
      adjustedProfile.tempDeltaC = 1.0;
      adjustedProfile.grindBias = 'finer';
      adjustedProfile.steps = [
        {
          id: 'thermos_prep',
          label: 'Preheat Thermos & Prep',
          kind: 'pour',
          share: 0,
          startSeconds: 0,
          note: 'Panaskan wadah thermos/airpot dengan air panas selama 3-5 menit, lalu kosongkan. Pilih filter, ratakan bed di basket.',
        },
        {
          id: 'thermos_cycle',
          label: 'Siklus Mesin',
          kind: 'pour',
          share: 1.0,
          startSeconds: 15,
          note: isIced
            ? `Isi reservoir. Start cycle. Air disemprotkan lewat spray head langsung ke dalam thermos berisi es. ${serverSafetyWarning}`
            : 'Isi reservoir. Start cycle. Semprotan spray head langsung menuju ke dalam airpot termos yang sudah dipanaskan.',
        },
        {
          id: 'thermos_drawdown',
          label: 'Air Turun',
          kind: 'drawdown',
          share: 0,
          startSeconds: 240,
          note: 'Jangan remove basket sebelum cycle selesai. Biarkan air meniris seluruhnya.',
        },
        {
          id: 'thermos_mix',
          label: 'Aduk & Tutup Termos',
          kind: 'serve',
          share: 0,
          startSeconds: 300,
          note: 'Setelah selesai, mix airpot/termos, lalu segera pasang tutup rapat agar panas dan aromatik terjaga. Warning: Thermos holding time affects quality.',
        },
      ];
      why = 'High Extraction Thermos designs a tighter ratio and pre-heats the airpot to preserve high extraction sweetness over long holding times.';
      watch = 'Thermos holding decay. While the insulated thermos keeps coffee hot, holding it for over 1.5 hours will degrade delicate acidity and sweetness. Seal immediately.';
      break;
  }

  // Apply Roast Level Logic
  if (input.roastLevel === 'light') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) + 1.5;
    if (adjustedProfile.grindBias === 'same') {
      adjustedProfile.grindBias = 'finer'; // Medium-fine sesuai basket
    }
    const lightRoastNote = 'Light roast: optimal extraction requires high temperature and medium-fine grind size.';
    why = why ? `${lightRoastNote} ${why}` : lightRoastNote;
  } else if (input.roastLevel === 'medium_dark') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 1.0;
    const medDarkNote = 'Medium-dark roast: lower temperature applied to reduce bitter extraction push.';
    why = why ? `${medDarkNote} ${why}` : medDarkNote;
  } else if (input.roastLevel === 'dark') {
    adjustedProfile.tempDeltaC = (adjustedProfile.tempDeltaC || 0) - 2.5;
    adjustedProfile.grindBias = 'coarser';
    adjustedProfile.ratioDelta = (adjustedProfile.ratioDelta || 0) + 0.5; // less extraction push
    const darkRoastNote = 'Dark roast warning: avoid high extraction to reduce bitterness; coarser grind and lower temperature used.';
    watch = watch ? `${darkRoastNote} ${watch}` : darkRoastNote;
  }

  // Pre-wet Hybrid capability warning
  if (activeStyle === 'pre_wet_hybrid_batch' && !isPreWetCapable) {
    const preWetWarning = 'Warning: Your batch brewer model may not support automated pre-wet/bloom capability. Check machine specs before selecting this style.';
    watch = watch ? `${preWetWarning} ${watch}` : preWetWarning;
  }

  // Iced server safety warning
  if (isIced) {
    const icedSafety = 'Server safety warning: Verify that your carafe/server is safe for brewing directly over ice to prevent thermal shock breakage.';
    watch = watch ? `${icedSafety} ${watch}` : icedSafety;
  }

  // Missing bean taxonomy warning
  const isUnknownVariety = !input.variety || input.variety === 'custom' || input.variety === 'unknown';
  const isUnknownProcess = !input.process || input.process === 'custom' || input.process === 'unknown';
  if (isUnknownVariety || isUnknownProcess) {
    const missingWarning = 'Missing exact bean variety or process reduces profile alignment accuracy. Confidence: low.';
    why = why ? `${missingWarning} ${why}` : missingWarning;
  }

  if (targetWarnings.length > 0) {
    const joined = targetWarnings.join(' ');
    watch = watch ? `${joined} ${watch}` : joined;
  }

  adjustedProfile.label = `Batch Brew - ${activeStyle.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
  adjustedProfile.recipeStyle = activeStyle as DeviceBrewProfile['recipeStyle'];

  return {
    style: activeStyle,
    adjustedProfile,
    why,
    watch,
  };
}
