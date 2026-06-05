import type {
  AiBrewMethodFamily,
  BrewPlan,
  BrewPlanStep,
  MethodWorkflowValidationResult,
  SwitchBrewProgramme,
  SwitchChamberState,
  SwitchValveState,
  WorkflowGuideActionType,
  WorkflowGuideStep,
  WorkflowGuideTechniqueChip,
  WorkflowGuideChipKey,
} from './types.ts';

const POUROVER_FAMILIES = new Set<AiBrewMethodFamily>([
  'v60',
  'chemex',
  'kalita_wave',
  'origami',
  'april',
  'melitta',
  'kono',
]);

function formatMl(value: number) {
  return `${Math.round(value)} ml`;
}

function formatGrams(value: number) {
  return `${Math.round(value)} g`;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function compactGuideText(value?: string, maxLength = 240) {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length <= maxLength) return text || undefined;
  const sentence = text.split(/(?<=[.!?])\s+/).find((part) => part.length >= 24 && part.length <= maxLength);
  if (sentence) return sentence.trim();
  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 120 ? lastSpace : maxLength).trim()}...`;
}

function chip(key: WorkflowGuideChipKey, label: string, value: string): WorkflowGuideTechniqueChip {
  return { key, label, value };
}

function formatPourPath(value?: string) {
  if (!value) return '';
  return value
    .replace(/center_to_mid/g, 'tengah-ke-tengah-luar')
    .replace(/center/g, 'tengah')
    .replace(/spiral/g, 'spiral')
    .replace(/wall/g, 'dinding')
    .replace(/_/g, ' ');
}

function formatPourHeight(value?: string) {
  if (!value) return '';
  return value
    .replace(/low/g, 'rendah')
    .replace(/medium/g, 'sedang')
    .replace(/high/g, 'tinggi')
    .replace(/_/g, ' ');
}

function formatAgitation(value?: string) {
  if (!value) return '';
  return value
    .replace(/minimal/g, 'minimal')
    .replace(/low/g, 'rendah')
    .replace(/medium/g, 'sedang')
    .replace(/high/g, 'tinggi')
    .replace(/_/g, ' ');
}

function formatValve(value?: string) {
  if (!value) return '';
  return value
    .replace(/closed/g, 'tutup')
    .replace(/open/g, 'buka')
    .replace(/_/g, ' ');
}

function formatChamber(value?: string) {
  if (!value) return '';
  return value
    .replace(/empty/g, 'kosong')
    .replace(/served/g, 'selesai')
    .replace(/immersion/g, 'immersion')
    .replace(/percolation/g, 'perkolasi')
    .replace(/_/g, ' ');
}

function flowChip(step: BrewPlanStep) {
  const [min, max] = step.flowRateMlPerSec || [];
  return Number.isFinite(min) && Number.isFinite(max)
    ? chip('flow', 'Aliran', `${min}-${max} ml/s`)
    : null;
}

function pathChip(step: BrewPlanStep) {
  return step.pourPath ? chip('path', 'Jalur', formatPourPath(step.pourPath)) : null;
}

function heightChip(step: BrewPlanStep) {
  return step.pourHeight ? chip('height', 'Tinggi', formatPourHeight(step.pourHeight)) : null;
}

function agitationChip(step: BrewPlanStep) {
  return step.agitationLevel ? chip('agitation', 'Agitasi', formatAgitation(step.agitationLevel)) : null;
}

function formatSwitchProgramme(programme: SwitchBrewProgramme | string) {
  return String(programme).replace(/_/g, ' ');
}

function techniqueChipsFromStep(step: BrewPlanStep): WorkflowGuideTechniqueChip[] {
  return [
    flowChip(step),
    pathChip(step),
    heightChip(step),
    agitationChip(step),
    step.valveState ? chip('valve', 'Katup', formatValve(step.valveState)) : null,
    step.chamberState ? chip('chamber', 'Ruang', formatChamber(step.chamberState)) : null,
    Number.isFinite(step.chamberLoadMl) ? chip('chamber_load', 'Muatan ruang', formatMl(step.chamberLoadMl || 0)) : null,
    step.switchProgramme ? chip('programme', 'Program', formatSwitchProgramme(step.switchProgramme)) : null,
  ].filter(Boolean) as WorkflowGuideTechniqueChip[];
}

function normalizeStart(seconds: number) {
  return Math.max(0, Math.round(seconds));
}

function sourceStep(
  actionType: WorkflowGuideActionType,
  step: BrewPlanStep,
  params: {
    id?: string;
    label?: string;
    primaryText: string;
    secondaryText?: string;
    techniqueChips?: WorkflowGuideTechniqueChip[];
    warnings?: string[];
    isOperationalOnly?: boolean;
    endSeconds?: number;
    targetVolumeMl?: number;
  },
): WorkflowGuideStep {
  return {
    ...step,
    id: params.id || `guide_${actionType}_${step.id}`,
    label: params.label || step.label,
    actionType,
    primaryText: params.primaryText,
    secondaryText: compactGuideText(params.secondaryText),
    endSeconds: params.endSeconds,
    targetVolumeMl: typeof params.targetVolumeMl === 'number' ? Math.max(0, Math.round(params.targetVolumeMl)) : step.targetVolumeMl,
    techniqueChips: params.techniqueChips || techniqueChipsFromStep(step),
    warnings: params.warnings || [],
    sourceStepIds: [step.id],
    isOperationalOnly: Boolean(params.isOperationalOnly),
    note: params.primaryText,
    hybridInstruction: compactGuideText(params.secondaryText) || step.hybridInstruction,
  };
}

function operationalStep(params: {
  id: string;
  label: string;
  actionType: WorkflowGuideActionType;
  startSeconds: number;
  endSeconds?: number;
  targetVolumeMl?: number;
  pourVolumeMl?: number;
  primaryText: string;
  secondaryText?: string;
  techniqueChips?: WorkflowGuideTechniqueChip[];
  warnings?: string[];
  sourceStepIds?: string[];
  kind?: BrewPlanStep['kind'];
  valveState?: SwitchValveState;
  chamberState?: SwitchChamberState;
  chamberLoadMl?: number;
  switchProgramme?: SwitchBrewProgramme;
}): WorkflowGuideStep {
  return {
    id: params.id,
    label: params.label,
    kind: params.kind || (params.actionType === 'serve' ? 'serve' : params.actionType === 'press' ? 'press' : params.actionType === 'heat' ? 'heat' : 'wait'),
    startSeconds: normalizeStart(params.startSeconds),
    endSeconds: typeof params.endSeconds === 'number' ? normalizeStart(params.endSeconds) : undefined,
    targetVolumeMl: Math.max(0, Math.round(params.targetVolumeMl || 0)),
    pourVolumeMl: Math.max(0, Math.round(params.pourVolumeMl || 0)),
    valveState: params.valveState,
    chamberState: params.chamberState,
    chamberLoadMl: params.chamberLoadMl,
    switchProgramme: params.switchProgramme,
    actionType: params.actionType,
    primaryText: params.primaryText,
    secondaryText: compactGuideText(params.secondaryText),
    techniqueChips: params.techniqueChips || [],
    warnings: params.warnings || [],
    sourceStepIds: params.sourceStepIds || [],
    isOperationalOnly: true,
    note: params.primaryText,
    hybridInstruction: compactGuideText(params.secondaryText),
  };
}

function firstVolumeStep(plan: BrewPlan) {
  return plan.steps.find((step) => step.pourVolumeMl > 0) || plan.steps[0];
}

function lastVolumeStep(plan: BrewPlan) {
  return [...plan.steps].reverse().find((step) => step.pourVolumeMl > 0) || plan.steps.at(-1);
}

function findKind(plan: BrewPlan, kind: BrewPlanStep['kind']) {
  return plan.steps.find((step) => (step.kind || 'pour') === kind);
}

type AeroPressGuideStyle = 'standard' | 'inverted' | 'bypass' | 'no_bypass' | 'bright_clean' | 'sweet_body';

function resolveAeroPressGuideStyle(plan: BrewPlan): AeroPressGuideStyle {
  switch (plan.recipeStyle) {
    case 'inverted':
    case 'bypass':
    case 'no_bypass':
    case 'bright_clean':
    case 'sweet_body':
      return plan.recipeStyle;
    default:
      return 'standard';
  }
}

function buildAeroPressStyleGuideCopy(style: AeroPressGuideStyle) {
  switch (style) {
    case 'inverted':
      return {
        setup: 'Rakit posisi terbalik di permukaan rata, bilas filter dan tutup, lalu pastikan penekan masuk minimal 2 cm sebelum air masuk.',
        charge: 'Tuang air ke ruang seduh terbalik, basahi semua bubuk, dan jaga alat tetap tegak.',
        stir: 'Aduk 4 kali, pasang tutup rapat, lalu hentikan agitasi.',
        steep: 'Rendam sampai waktu balik; ruang seduh tetap diam supaya ekstraksi merata.',
        flip: 'Balikkan ke atas cangkir dalam satu gerakan mantap, tanpa mengguncang bubur kopi.',
        press: 'Tekan stabil 20-30 detik dan berhenti sebelum desis terasa kering.',
        stop: 'Berhenti sebelum desis kering, lalu angkat alat dari cangkir.',
        serve: 'Aduk cangkir pelan, lalu sajikan hasil rendaman penuh selagi aroma masih hidup.',
        stirChip: '4x',
        pressChip: '20-30 detik',
        stopChip: 'sebelum desis',
      };
    case 'bypass':
      return {
        setup: 'Siapkan AeroPress tegak, bilas filter dan tutup, lalu pisahkan air bypass untuk setelah tekan saja.',
        charge: 'Tuang air konsentrat ke ruang seduh dan basahi bubuk merata; air bypass tidak melewati lapisan kopi.',
        stir: 'Aduk 3 kali untuk ekstraksi awal, lalu biarkan bubur kopi tenang singkat.',
        steep: 'Rendam singkat sebagai konsentrat; jaga kontak padat tanpa agitasi tambahan.',
        flip: '',
        press: 'Tekan konsentrat 20-30 detik dan berhenti sebelum desis.',
        stop: 'Berhenti sebelum desis kering agar konsentrat tidak menjadi kasar.',
        serve: 'Tambahkan air bypass terukur setelah tekan saja, aduk cangkir sampai rata, lalu sajikan.',
        stirChip: '3x',
        pressChip: '20-30 detik',
        stopChip: 'sebelum desis',
      };
    case 'no_bypass':
      return {
        setup: 'Siapkan AeroPress tegak, bilas filter dan tutup, lalu pastikan semua air resep memang masuk ruang seduh.',
        charge: 'Tuang seluruh air resep ke ruang seduh; tidak ada air bypass tambahan setelah tekan.',
        stir: 'Aduk 3 kali, lalu biarkan bubur kopi tenang agar fase tekan tetap bersih.',
        steep: 'Rendam lebih panjang sampai semua air di ruang seduh mengekstrak merata.',
        flip: '',
        press: 'Tekan pelan 25-35 detik dan berhenti sebelum desis terasa kering; biarkan volume penuh turun bersih.',
        stop: 'Berhenti sebelum desis kering agar hasil penuh tetap bersih tanpa tambahan air.',
        serve: 'Aduk cangkir pelan dan sajikan tanpa air bypass tambahan.',
        stirChip: '3x',
        pressChip: '25-35 detik',
        stopChip: 'sebelum desis',
      };
    case 'bright_clean':
      return {
        setup: 'Bilas filter dan tutup, gunakan segel rapi, dan siapkan gaya bersih dengan agitasi rendah.',
        charge: 'Tuang air cepat dan merata ke ruang seduh agar bubuk basah lengkap tanpa gerakan berat.',
        stir: 'Aduk 2-3 kali saja, lalu hentikan agitasi agar kejernihan tetap tinggi.',
        steep: 'Rendam singkat; kontak cukup untuk kejernihan tanpa membuat cangkir terasa berat.',
        flip: '',
        press: 'Tekan sangat stabil 20-30 detik dengan tenaga ringan.',
        stop: 'Berhenti sebelum desis pertama agar akhir rasa tetap bersih.',
        serve: 'Aduk cangkir sekali dan sajikan tanpa air tambahan.',
        stirChip: '2-3x',
        pressChip: '20-30 detik',
        stopChip: 'sebelum desis',
      };
    case 'sweet_body':
      return {
        setup: 'Hangatkan ruang seduh, bilas filter dan tutup, lalu siapkan gaya seduh untuk tekstur manis.',
        charge: 'Tuang air ke ruang seduh dan basahi bubuk sampai penuh merata.',
        stir: 'Aduk silang 5 kali untuk membangun tekstur, lalu biarkan bubur kopi tenang.',
        steep: 'Rendam lebih panjang agar rasa manis dan tekstur terkumpul.',
        flip: '',
        press: 'Tekan pelan 25-35 detik sampai mendekati desis; jangan paksa tekanan bila rasa mulai pahit atau kering.',
        stop: 'Berhenti mendekati desis. Gaya ini mengejar body, tetapi tekanan berlebih bisa membawa fines dan rasa pahit.',
        serve: 'Aduk cangkir pelan dan sajikan sebagai cangkir tebal tanpa air tambahan.',
        stirChip: '5x',
        pressChip: '25-35 detik',
        stopChip: 'mendekati desis',
      };
    default:
      return {
        setup: 'Siapkan AeroPress tegak di atas cangkir, bilas filter dan tutup, pastikan segel rapat, lalu tara timbangan.',
        charge: 'Tuang air ke ruang seduh dan basahi bubuk kopi merata.',
        stir: 'Aduk 3 kali atau swirl ringan sekali, lalu hentikan agitasi.',
        steep: 'Rendam sampai waktu tekan; ruang seduh tetap stabil dan tertutup.',
        flip: '',
        press: 'Tekan stabil 20-30 detik dan berhenti sebelum desis terasa kering.',
        stop: 'Berhenti sebelum desis kering, lalu pisahkan alat dari cangkir.',
        serve: 'Aduk cangkir pelan, lalu sajikan.',
        stirChip: '3x',
        pressChip: '20-30 detik',
        stopChip: 'sebelum desis',
      };
  }
}

function stepsSorted(steps: WorkflowGuideStep[]) {
  return steps
    .map((step, index) => ({ step, index }))
    .sort((a, b) => a.step.startSeconds - b.step.startSeconds || a.index - b.index)
    .map(({ step }) => step);
}

function styleKey(plan: BrewPlan) {
  return String(plan.recipeStyle || 'auto');
}

type MethodStyleGuideCopy = {
  setup: string;
  charge: string;
  main: string;
  release: string;
  finish: string;
  chip: string;
};

function pickStyleCopy(
  plan: BrewPlan,
  copies: Record<string, MethodStyleGuideCopy>,
  fallback: MethodStyleGuideCopy,
) {
  return copies[styleKey(plan)] || fallback;
}

function buildPouroverStyleGuideCopy(plan: BrewPlan): MethodStyleGuideCopy {
  const defaultCopy: MethodStyleGuideCopy = {
    setup: 'Bilas filter, panaskan alat dan wadah saji, buang air bilas, lalu tara timbangan.',
    charge: 'Tuang dengan ritme stabil dari tengah ke tengah-luar.',
    main: 'Jaga hamparan kopi rata dan jangan mengejar rasa dengan agitasi berlebihan.',
    release: 'Biarkan air turun alami sampai target selesai.',
    finish: 'Sajikan setelah air turun bersih.',
    chip: plan.methodFamily.replace(/_/g, ' '),
  };
  const chemex: Record<string, MethodStyleGuideCopy> = {
    traditional_three_pour: {
      setup: 'Bilas filter Chemex tebal, panaskan kaca, dan pastikan jalur udara filter tetap terbuka.',
      charge: 'Pakai pola tiga tuang: bloom, tuang utama, lalu tuang penutup dengan aliran stabil.',
      main: 'Jaga tuangan lembut agar filter tebal tidak melambat berlebihan.',
      release: 'Biarkan air turun tanpa menutup jalur udara filter.',
      finish: 'Aduk teko kaca pelan sebelum disajikan.',
      chip: 'Chemex tiga tuang',
    },
    competition_multi_pulse: {
      setup: 'Bilas filter Chemex tebal, panaskan kaca, dan siapkan beberapa pulsa kecil.',
      charge: 'Gunakan pulsa pendek yang rapi; tunggu permukaan turun sedikit sebelum pulsa berikutnya.',
      main: 'Jaga tinggi air sedang agar ekstraksi tetap bersih di filter tebal.',
      release: 'Biarkan air turun penuh sebelum evaluasi waktu akhir.',
      finish: 'Aduk teko kaca pelan supaya lapisan rasa menyatu.',
      chip: 'Chemex multi-pulse',
    },
    continuous_center_pour: {
      setup: 'Bilas filter Chemex tebal, panaskan kaca, dan siapkan aliran tengah yang tenang.',
      charge: 'Tuang kontinu dari tengah dengan aliran kecil dan stabil.',
      main: 'Jangan menyapu dinding filter; biarkan pusat aliran menjaga kestabilan.',
      release: 'Biarkan air turun alami tanpa koreksi berat di akhir.',
      finish: 'Sajikan setelah aliran berhenti bersih.',
      chip: 'Chemex kontinu',
    },
    iced_chemex: {
      setup: 'Bilas filter Chemex, masukkan es ke wadah saji, lalu seduh hanya sampai target air panas.',
      charge: 'Tuang lebih fokus dan sedikit lebih halus untuk mengimbangi air panas yang lebih sedikit.',
      main: 'Jaga target air panas; es hanya mendinginkan dan mengencerkan sesuai resep.',
      release: 'Berhenti di target air panas, lalu biarkan tetesan akhir turun ke atas es.',
      finish: 'Aduk es 5-8 detik sampai suhu merata.',
      chip: 'Chemex es',
    },
    high_dose_heavy_body: {
      setup: 'Bilas filter Chemex, panaskan kaca, dan ratakan dosis tinggi sebelum bloom.',
      charge: 'Tuang perlahan agar hamparan kopi tinggi tetap terbuka.',
      main: 'Jaga aliran rendah; jangan menambah agitasi bila waktu sudah melambat.',
      release: 'Biarkan air turun penuh tanpa menekan filter.',
      finish: 'Aduk teko kaca pelan untuk menyatukan body.',
      chip: 'Chemex body',
    },
  };
  const flatBottom: Record<string, MethodStyleGuideCopy> = {
    traditional_flat_three: {
      setup: 'Bilas filter berlipat, panaskan alat, lalu ratakan hamparan kopi datar.',
      charge: 'Pakai tiga pulsa rendah dari tengah agar permukaan tetap rata.',
      main: 'Jaga pulsa seragam; alat alas datar bekerja paling stabil saat permukaan tidak bergelombang.',
      release: 'Biarkan air turun tanpa mengguncang alat.',
      finish: 'Sajikan setelah aliran selesai bersih.',
      chip: 'alas datar 3 pulsa',
    },
    competition_fast_four: {
      setup: 'Bilas filter berlipat, panaskan alat, dan siapkan empat pulsa cepat yang terukur.',
      charge: 'Tuang empat pulsa pendek; setiap pulsa masuk sebelum permukaan terlalu kering.',
      main: 'Jaga tempo cepat tetapi tidak kasar agar hamparan kopi tetap rata.',
      release: 'Biarkan fase turun selesai tanpa tambahan air.',
      finish: 'Aduk cangkir pelan sebelum evaluasi.',
      chip: '4 pulsa cepat',
    },
    continuous_slow_stream: {
      setup: 'Bilas filter berlipat, panaskan alat, dan siapkan aliran kecil yang konsisten.',
      charge: 'Tuang kontinu lambat dari tengah; biarkan alat alas datar menjaga sebaran air.',
      main: 'Pertahankan tinggi air rendah supaya ekstraksi tidak berat sebelah.',
      release: 'Biarkan air turun alami sampai waktu akhir.',
      finish: 'Sajikan setelah permukaan selesai turun.',
      chip: 'kontinu lambat',
    },
    iced_wave: {
      setup: 'Bilas filter berlipat, masukkan es ke wadah saji, lalu targetkan air panas saja.',
      charge: 'Tuang pulsa lebih rapat agar ekstraksi cukup sebelum kopi menyentuh es.',
      main: 'Jaga hamparan kopi rata dan hentikan tuang tepat di target air panas.',
      release: 'Biarkan tetesan akhir turun ke atas es tanpa air tambahan.',
      finish: 'Aduk es 5-8 detik sebelum diminum.',
      chip: 'wave es',
    },
    high_dose_concentrate: {
      setup: 'Bilas filter berlipat, panaskan alat, dan ratakan dosis tinggi dengan lembut.',
      charge: 'Tuang pendek dan terukur agar konsentrat tetap stabil.',
      main: 'Jaga aliran rendah; dosis tinggi butuh kontrol, bukan agitasi kasar.',
      release: 'Biarkan air turun penuh sebelum disajikan.',
      finish: 'Aduk hasil seduh pelan agar konsentrat merata.',
      chip: 'dosis tinggi',
    },
    april_flat_bottom_standard: {
      setup: 'Bilas filter April, panaskan alat, lalu ratakan hamparan kopi datar.',
      charge: 'Gunakan pulsa bersih dan simetris dari tengah.',
      main: 'Jaga permukaan rendah dan rata; April mengutamakan kontrol pulsa yang sederhana.',
      release: 'Biarkan air turun tanpa koreksi berat di akhir.',
      finish: 'Sajikan setelah fase turun selesai bersih.',
      chip: 'April standar',
    },
    april_continuous_slow: {
      setup: 'Bilas filter April, panaskan alat, dan siapkan aliran lambat yang stabil.',
      charge: 'Tuang kontinu kecil; jangan biarkan permukaan naik terlalu tinggi.',
      main: 'Pertahankan ritme tenang agar ekstraksi halus dan mudah diulang.',
      release: 'Biarkan air turun alami sampai target waktu.',
      finish: 'Sajikan setelah seduhan merata.',
      chip: 'April kontinu',
    },
    competition_two_pour: {
      setup: 'Bilas filter April, panaskan alat, dan siapkan dua tuang utama yang tegas.',
      charge: 'Tuang pertama membasahi penuh; tuang kedua menyelesaikan target dengan stabil.',
      main: 'Jaga jeda antar tuang konsisten supaya alas datar tetap merata.',
      release: 'Biarkan air turun bersih tanpa pulsa tambahan.',
      finish: 'Aduk cangkir pelan sebelum dicicipi.',
      chip: 'April dua tuang',
    },
    iced_april_style: {
      setup: 'Bilas filter April, masukkan es ke wadah saji, lalu seduh target air panas saja.',
      charge: 'Tuang lebih fokus dan sedikit lebih cepat agar rasa tidak kosong setelah es mencair.',
      main: 'Jaga target air panas; jangan menambah air di luar split es.',
      release: 'Biarkan tetesan akhir turun ke atas es.',
      finish: 'Aduk es 5-8 detik sampai suhu rata.',
      chip: 'April es',
    },
    high_body_heavy_dose: {
      setup: 'Bilas filter April, panaskan alat, dan ratakan dosis besar tanpa memadatkan.',
      charge: 'Tuang pendek dengan aliran lembut agar body terbentuk tanpa macet.',
      main: 'Jaga tinggi air rendah; dosis besar butuh kontrol aliran.',
      release: 'Biarkan air turun penuh sebelum disajikan.',
      finish: 'Aduk hasil seduh pelan untuk menyatukan tekstur.',
      chip: 'April body',
    },
    traditional_melitta_one_pour: {
      setup: 'Bilas filter Melitta, panaskan alat, lalu ratakan hamparan kopi trapesium.',
      charge: 'Gunakan satu tuang utama setelah bloom dengan aliran lembut.',
      main: 'Jaga pusat tuangan stabil; bentuk trapesium mudah terkuras dari tengah.',
      release: 'Biarkan air turun bersih tanpa pulsa tambahan.',
      finish: 'Sajikan segera setelah tetesan selesai.',
      chip: 'Melitta satu tuang',
    },
    aromaboy_style: {
      setup: 'Bilas filter kecil, panaskan alat, dan gunakan dosis ringan yang merata.',
      charge: 'Tuang pendek dan hati-hati agar alat kecil tidak meluap.',
      main: 'Jaga kontak singkat dan bersih untuk seduhan kecil harian.',
      release: 'Biarkan air turun penuh sebelum diangkat.',
      finish: 'Sajikan langsung selagi hangat.',
      chip: 'Aromaboy',
    },
    three_pour_melitta: {
      setup: 'Bilas filter Melitta, panaskan alat, dan siapkan tiga tuang bertahap.',
      charge: 'Bagi tuang menjadi tiga tahap kecil setelah bloom.',
      main: 'Jaga jeda antar tuang supaya hamparan kopi tetap terbuka.',
      release: 'Biarkan air turun alami tanpa bilas dinding berat.',
      finish: 'Sajikan setelah tetesan akhir bersih.',
      chip: 'Melitta tiga tuang',
    },
    iced_melitta_brew: {
      setup: 'Bilas filter Melitta, masukkan es ke wadah saji, lalu seduh target air panas saja.',
      charge: 'Tuang lebih fokus agar ekstraksi cukup sebelum pendinginan.',
      main: 'Berhenti tepat di target air panas; es menyelesaikan suhu dan volume.',
      release: 'Biarkan tetesan akhir turun ke atas es.',
      finish: 'Aduk es 5-8 detik hingga rata.',
      chip: 'Melitta es',
    },
    dense_classic_extraction: {
      setup: 'Bilas filter Melitta, panaskan alat, dan siapkan hamparan kopi sedikit lebih padat.',
      charge: 'Tuang lembut dengan target body klasik, bukan aliran cepat.',
      main: 'Jaga tuangan rendah dan hindari koreksi kasar.',
      release: 'Biarkan air turun penuh sebelum disajikan.',
      finish: 'Aduk cangkir pelan untuk menyatukan rasa.',
      chip: 'Melitta klasik',
    },
  };
  const origami: Record<string, MethodStyleGuideCopy> = {
    cone_dripper_style: {
      setup: 'Pilih filter kerucut Origami, bilas, panaskan alat, lalu tara timbangan.',
      charge: 'Tuang dari tengah ke tengah-luar dengan kontrol presisi seperti alat kerucut.',
      main: 'Jaga aliran rapi; filter kerucut memberi ruang untuk kontrol rasa yang detail.',
      release: 'Biarkan air turun alami tanpa menyapu dinding berlebihan.',
      finish: 'Sajikan setelah tetesan akhir bersih.',
      chip: 'Origami kerucut',
    },
    wave_dripper_style: {
      setup: 'Pilih filter berlipat Origami, bilas, panaskan alat, lalu ratakan permukaan kopi.',
      charge: 'Gunakan pulsa rendah agar permukaan tetap datar.',
      main: 'Manfaatkan filter berlipat untuk aliran stabil dan mudah diulang.',
      release: 'Biarkan air turun bersih tanpa mengangkat alat terlalu cepat.',
      finish: 'Aduk cangkir pelan sebelum dicicipi.',
      chip: 'Origami wave',
    },
    mugen_one_pour: {
      setup: 'Bilas filter, panaskan alat, lalu siapkan satu tuang utama yang stabil.',
      charge: 'Setelah bloom, selesaikan target dengan satu tuang panjang yang tenang.',
      main: 'Jangan memecah ritme dengan pulsa kecil; gaya ini mengandalkan konsistensi aliran.',
      release: 'Biarkan air turun alami sampai akhir.',
      finish: 'Sajikan setelah aliran berhenti bersih.',
      chip: 'satu tuang',
    },
    iced_origami: {
      setup: 'Bilas filter Origami, masukkan es ke wadah saji, lalu targetkan air panas saja.',
      charge: 'Tuang lebih rapat dan fokus agar ekstraksi cukup sebelum kopi menyentuh es.',
      main: 'Jaga target air panas; es adalah bagian resep, bukan koreksi dadakan.',
      release: 'Biarkan tetesan akhir turun ke atas es.',
      finish: 'Aduk es 5-8 detik sampai seduhan merata.',
      chip: 'Origami es',
    },
    competition_hybrid_flow: {
      setup: 'Pilih filter sesuai tujuan, bilas, panaskan alat, lalu siapkan ritme hybrid.',
      charge: 'Gabungkan bloom presisi dengan pulsa terukur dan aliran tengah yang stabil.',
      main: 'Jaga perubahan ritme tetap sengaja; jangan menambah agitasi acak.',
      release: 'Biarkan air turun tanpa koreksi berlebihan.',
      finish: 'Aduk cangkir pelan sebelum evaluasi.',
      chip: 'hybrid kompetisi',
    },
  };
  const kono: Record<string, MethodStyleGuideCopy> = {
    kono_meimon_traditional: {
      setup: 'Bilas filter Kono, panaskan alat, lalu ratakan kopi tanpa memadatkan.',
      charge: 'Bangun ekstraksi dari pusat dengan tuangan kecil dan tenang.',
      main: 'Jaga tuangan di tengah; alur Kono bekerja baik saat sisi tidak terlalu dibanjiri.',
      release: 'Biarkan air turun alami sampai akhir.',
      finish: 'Sajikan setelah aliran bersih.',
      chip: 'Kono Meimon',
    },
    kono_dripper_standard: {
      setup: 'Bilas filter Kono, panaskan alat, dan siapkan ritme filter kerucut standar.',
      charge: 'Tuang dari tengah ke tengah-luar dengan aliran sedang.',
      main: 'Jaga hamparan kopi tidak terlalu tinggi agar rasa tetap bersih.',
      release: 'Biarkan air turun tanpa putaran berat.',
      finish: 'Aduk cangkir pelan dan sajikan.',
      chip: 'Kono standar',
    },
    kono_slow_drip_body: {
      setup: 'Bilas filter Kono, panaskan alat, lalu siapkan aliran lambat untuk body.',
      charge: 'Tuang kecil dan lambat dari tengah agar kontak lebih panjang.',
      main: 'Pertahankan aliran rendah; jangan sampai permukaan kopi tenggelam terlalu lama.',
      release: 'Biarkan air turun penuh tanpa tekanan tambahan.',
      finish: 'Aduk cangkir pelan untuk menyatukan body.',
      chip: 'Kono slow',
    },
    iced_kono_meimon: {
      setup: 'Bilas filter Kono, masukkan es ke wadah saji, lalu seduh target air panas saja.',
      charge: 'Tuang fokus di tengah dengan gilingan sedikit lebih halus.',
      main: 'Berhenti di target air panas; es menyelesaikan volume dan suhu.',
      release: 'Biarkan tetesan akhir turun ke atas es.',
      finish: 'Aduk es 5-8 detik sebelum disajikan.',
      chip: 'Kono es',
    },
    kono_agitation_sweet: {
      setup: 'Bilas filter Kono, panaskan alat, dan siapkan agitasi lembut yang terukur.',
      charge: 'Tuang awal merata, lalu gunakan putaran ringan hanya bila permukaan tidak rata.',
      main: 'Jaga agitasi kecil; tujuannya meratakan ekstraksi, bukan membuat aliran kacau.',
      release: 'Biarkan air turun alami setelah koreksi kecil selesai.',
      finish: 'Sajikan setelah tetesan akhir bersih.',
      chip: 'Kono sweet',
    },
  };

  if (plan.methodFamily === 'chemex') return pickStyleCopy(plan, chemex, chemex.traditional_three_pour);
  if (plan.methodFamily === 'origami') return pickStyleCopy(plan, origami, origami.cone_dripper_style);
  if (plan.methodFamily === 'kono') return pickStyleCopy(plan, kono, kono.kono_meimon_traditional);
  if (plan.methodFamily === 'kalita_wave') return pickStyleCopy(plan, flatBottom, flatBottom.traditional_flat_three);
  if (plan.methodFamily === 'april') return pickStyleCopy(plan, flatBottom, flatBottom.april_flat_bottom_standard);
  if (plan.methodFamily === 'melitta') return pickStyleCopy(plan, flatBottom, flatBottom.traditional_melitta_one_pour);
  return defaultCopy;
}

function buildPouroverGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const first = firstVolumeStep(plan);
  const last = lastVolumeStep(plan);
  const isIced = plan.brewMode === 'iced';
  const methodLower = plan.methodFamily.replace(/_/g, ' ');
  const styleCopy = buildPouroverStyleGuideCopy(plan);
  const guide: WorkflowGuideStep[] = [
    operationalStep({
      id: `guide_${plan.methodFamily}_setup`,
      label: 'Setup',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: isIced
        ? `${styleCopy.setup} Masukkan ${formatGrams(plan.iceMl)} es ke wadah saji. Seduh target air panas saja.`
        : styleCopy.setup,
      techniqueChips: [
        chip('basket_prep', 'Persiapan', styleCopy.chip || `${methodLower} siap`),
      ],
    }),
  ];

  plan.steps.forEach((step, index) => {
    if (step.pourVolumeMl <= 0) return;
    const isFirstPour = step.pourVolumeMl > 0 && step.id === first?.id;
    const isLastPour = step.pourVolumeMl > 0 && step.id === last?.id;
    const actionType: WorkflowGuideActionType = isFirstPour ? 'bloom' : (step.kind || 'pour') === 'drawdown' ? 'drawdown' : 'pour';
    const label = isFirstPour ? 'Bloom' : isLastPour ? 'Tuang penutup' : index <= 1 ? 'Tuang tahap tengah' : step.label;
    const targetText = isIced && step.pourVolumeMl > 0
      ? `Target ${formatMl(step.targetVolumeMl)} air panas.`
      : `Target ${formatMl(step.targetVolumeMl)}.`;
    const familyCue = isFirstPour ? styleCopy.charge : isLastPour ? styleCopy.release : styleCopy.main;
    guide.push(sourceStep(actionType, step, {
      label,
      primaryText: step.pourVolumeMl > 0
        ? `Tuang ${formatMl(step.pourVolumeMl)}. ${targetText}`
        : targetText,
      secondaryText: familyCue,
    }));
  });

  guide.push(operationalStep({
    id: `guide_${plan.methodFamily}_drawdown`,
    label: 'Air turun selesai',
    actionType: 'drawdown',
      startSeconds: Math.max(last?.startSeconds || 0, plan.totalTimeSeconds - 20),
      endSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: isIced
      ? `Biarkan air turun di atas es sampai target ${formatMl(plan.hotWaterMl)} air panas. ${styleCopy.release}`
      : styleCopy.release,
    techniqueChips: [
      chip('drawdown', 'Air turun', formatTime(plan.totalTimeSeconds)),
      ...(isIced ? [chip('stop', 'Berhenti', `${formatMl(plan.hotWaterMl)} air panas`)] : []),
    ],
    sourceStepIds: last ? [last.id] : [],
  }));

  guide.push(operationalStep({
    id: `guide_${plan.methodFamily}_serve`,
    label: 'Sajikan',
    actionType: 'serve',
    startSeconds: plan.totalTimeSeconds,
    targetVolumeMl: plan.hotWaterMl,
    primaryText: isIced
      ? `${styleCopy.finish} Aduk es tidak menambah ekstraksi; ini hanya penyelesaian sajian.`
      : styleCopy.finish,
    techniqueChips: isIced ? [chip('mix_batch', 'Aduk', '5-8 detik')] : [],
  }));

  return stepsSorted(guide);
}

function buildAeroPressGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const style = resolveAeroPressGuideStyle(plan);
  const styleCopy = buildAeroPressStyleGuideCopy(style);
  const volumeSteps = plan.steps.filter((step) => step.pourVolumeMl > 0);
  const charge = volumeSteps[0] || firstVolumeStep(plan);
  const finalCharge = volumeSteps.length > 0 ? volumeSteps[volumeSteps.length - 1] : charge;
  const press = findKind(plan, 'press');
  const serve = findKind(plan, 'serve');
  const flip = plan.steps.find((step) => step.id === 'flip');
  const pressStart = press?.startSeconds ?? Math.max(45, plan.totalTimeSeconds - 30);
  const steepEnd = style === 'inverted' && flip ? flip.startSeconds : pressStart;
  const chargeTarget = finalCharge?.targetVolumeMl || charge?.targetVolumeMl || plan.hotWaterMl;
  const hasCapacityPreWet = volumeSteps.some((step) => step.id === 'pre_wet');
  const bypassWaterMl = style === 'bypass' && plan.totalWaterMl > plan.hotWaterMl
    ? Math.round(plan.totalWaterMl - plan.hotWaterMl)
    : 0;
  const guide: WorkflowGuideStep[] = [
    operationalStep({
      id: 'guide_aeropress_setup',
      label: 'Setup',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: styleCopy.setup,
      techniqueChips: [chip('basket_prep', 'Persiapan', 'filter + tutup dibilas')],
    }),
  ];

  if (volumeSteps.length > 0) {
    volumeSteps.forEach((step, index) => {
      const amount = step.pourVolumeMl || step.targetVolumeMl || chargeTarget;
      const isCapacityPreWet = hasCapacityPreWet && step.id === 'pre_wet';
      const isMainCharge = hasCapacityPreWet && step.id === 'charge';
      guide.push(sourceStep('charge', step, {
        label: isCapacityPreWet ? 'Pra-basah' : isMainCharge ? 'Isi air utama' : 'Isi air',
        primaryText: isCapacityPreWet
          ? `Pra-basah ${formatMl(amount)} selama 20 detik untuk membasahi dan menyusutkan bubuk kopi. Target ${formatMl(step.targetVolumeMl || amount)}.`
          : isMainCharge
            ? `Tuang sisa air ${formatMl(amount)} sampai target ${formatMl(step.targetVolumeMl || chargeTarget)}. ${styleCopy.charge}`
            : `${styleCopy.charge} Target ${formatMl(amount)}.`,
        secondaryText: isCapacityPreWet
          ? 'Fase ini khusus mencegah luapan pada AeroPress tegak bervolume tinggi.'
          : style === 'bypass'
            ? 'Buat konsentrat dulu; bypass hanya setelah tekan.'
            : index > 0
              ? 'Lanjutkan isi air utama setelah pra-basah, tetap rendah dan stabil.'
              : 'Basahi semua bubuk secara merata tanpa agitasi berlebihan.',
        techniqueChips: [
          chip(isCapacityPreWet ? 'saturation' : 'charge', isCapacityPreWet ? 'Pra-basah' : 'Isi', formatMl(amount)),
          ...techniqueChipsFromStep(step),
        ],
      }));
    });
  } else {
    guide.push(operationalStep({
      id: 'guide_aeropress_charge',
      label: 'Isi air',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `${styleCopy.charge} Target ${formatMl(plan.hotWaterMl)}.`,
      techniqueChips: [chip('charge', 'Isi', formatMl(plan.hotWaterMl))],
    }));
  }

  guide.push(
    operationalStep({
      id: 'guide_aeropress_stir',
      label: 'Aduk ringan',
      actionType: 'stir',
      startSeconds: Math.min(Math.max(10, charge?.startSeconds || 0), Math.max(10, pressStart - 45)),
      targetVolumeMl: chargeTarget,
      primaryText: styleCopy.stir,
      techniqueChips: [chip('stir', 'Aduk', styleCopy.stirChip)],
      sourceStepIds: charge ? [charge.id] : [],
    }),
    operationalStep({
      id: 'guide_aeropress_steep',
      label: 'Rendam',
      actionType: 'steep',
      startSeconds: Math.max(15, Math.min(pressStart - 35, Math.round(pressStart * 0.45))),
      endSeconds: steepEnd,
      targetVolumeMl: chargeTarget,
      primaryText: `${styleCopy.steep} Target waktu ${formatTime(steepEnd)}.`,
      techniqueChips: [chip('steep', 'Rendam', formatTime(Math.max(10, steepEnd)))],
    }),
  );

  if (style === 'inverted') {
    guide.push(flip ? sourceStep('wait', flip, {
      label: 'Balikkan aman',
      primaryText: styleCopy.flip,
      secondaryText: 'Pegang ruang seduh dan cangkir bersama supaya segel tidak lepas.',
      techniqueChips: [chip('stop', 'Aman', 'balikkan mantap')],
    }) : operationalStep({
      id: 'guide_aeropress_flip',
      label: 'Balikkan aman',
      actionType: 'wait',
      startSeconds: Math.max(0, pressStart - 20),
      targetVolumeMl: chargeTarget,
      primaryText: styleCopy.flip,
      techniqueChips: [chip('stop', 'Aman', 'balikkan mantap')],
    }));
  }

  guide.push(
    press ? sourceStep('press', press, {
      label: 'Tekan',
      primaryText: styleCopy.press,
      secondaryText: style === 'bypass'
        ? 'Tekan konsentrat dulu; air bypass tetap terpisah sampai selesai tekan.'
        : style === 'bright_clean'
          ? 'Jaga tekanan ringan dan berhenti tepat sebelum desis pertama.'
          : style === 'sweet_body'
            ? 'Jaga tekanan stabil sampai mendekati desis; hentikan bila terasa berat, pahit, atau kering.'
            : 'Jaga tekanan stabil dan berhenti sebelum desis terasa kering.',
      techniqueChips: [chip('press', 'Tekan', styleCopy.pressChip), chip('stop', 'Berhenti', styleCopy.stopChip)],
    }) : operationalStep({
      id: 'guide_aeropress_press',
      label: 'Tekan',
      actionType: 'press',
      kind: 'press',
      startSeconds: pressStart,
      endSeconds: Math.min(plan.totalTimeSeconds, pressStart + 30),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.press,
      techniqueChips: [chip('press', 'Tekan', styleCopy.pressChip), chip('stop', 'Berhenti', styleCopy.stopChip)],
    }),
    operationalStep({
      id: 'guide_aeropress_stop',
      label: styleCopy.stopChip === 'sebelum desis' ? 'Berhenti sebelum desis' : 'Tekan sampai selesai',
      actionType: 'stop',
      startSeconds: Math.min(plan.totalTimeSeconds, pressStart + 25),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.stop,
      techniqueChips: [chip('stop', 'Berhenti', styleCopy.stopChip)],
      sourceStepIds: press ? [press.id] : [],
    }));

  if (style === 'bypass') {
    const bypassPrimaryText = bypassWaterMl > 0
      ? `Seduh ${formatMl(plan.hotWaterMl)} air konsentrat di ruang seduh, lalu tambahkan ${formatMl(bypassWaterMl)} air bypass terukur di cangkir setelah tekan saja. Aduk sampai rata, lalu sajikan.`
      : styleCopy.serve;
    guide.push(serve ? sourceStep('dilute', serve, {
      label: 'Bypass terukur',
      targetVolumeMl: plan.totalWaterMl,
      primaryText: bypassPrimaryText,
      secondaryText: 'Air bypass adalah bagian resep setelah tekan, bukan air tambahan di luar rencana.',
      techniqueChips: [chip('dilution', 'Bypass', 'setelah tekan saja')],
    }) : operationalStep({
      id: 'guide_aeropress_bypass_dilute',
      label: 'Bypass terukur',
      actionType: 'dilute',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: bypassPrimaryText,
      secondaryText: 'Air bypass adalah bagian resep setelah tekan, bukan air tambahan di luar rencana.',
      techniqueChips: [chip('dilution', 'Bypass', 'setelah tekan saja')],
    }));
  }

  guide.push(
    operationalStep({
      id: 'guide_aeropress_serve',
      label: 'Sajikan',
      actionType: 'serve',
      startSeconds: style === 'bypass' ? plan.totalTimeSeconds + 5 : plan.totalTimeSeconds,
      targetVolumeMl: style === 'bypass' ? plan.totalWaterMl : plan.hotWaterMl,
      primaryText: style === 'bypass'
        ? 'Sajikan setelah konsentrat dan bypass menyatu.'
        : styleCopy.serve,
      techniqueChips: [],
    }));

  return stepsSorted(guide);
}

function buildFrenchPressStyleGuideCopy(plan: BrewPlan): MethodStyleGuideCopy {
  const copies: Record<string, MethodStyleGuideCopy> = {
    traditional: {
      setup: 'Panaskan French Press dan wadah saji, lalu gunakan gilingan kasar yang merata.',
      charge: 'Tuang air panas dengan mantap agar semua bubuk basah tanpa perlu adukan berat.',
      main: 'Rendam tenang; biarkan kerak kopi terbentuk utuh pada awal seduh sebagai penahan panas alami.',
      release: 'Pecah kerak perlahan, bersihkan busa kasar bila perlu, lalu beri waktu partikel halus mengendap.',
      finish: 'Tekan penekan perlahan hanya untuk menahan bubuk, lalu tuang pisah segera agar ekstraksi berhenti.',
      chip: 'tradisional',
    },
    clean_decant: {
      setup: 'Panaskan French Press dan wadah saji terpisah, lalu gunakan gilingan kasar sampai medium-kasar.',
      charge: 'Tuang air panas cepat dan merata agar semua bubuk basah tanpa membuat rendaman terlalu keruh.',
      main: 'Rendam 4 menit, lalu jaga alat tetap diam agar partikel halus mulai turun.',
      release: 'Pecah kerak perlahan, bersihkan busa kasar, lalu diamkan 5-8 menit agar sedimen mengendap.',
      finish: 'Posisikan penekan tepat di bawah permukaan cairan tanpa menekan ke dasar, lalu tuang pisah sangat perlahan.',
      chip: 'clean decant',
    },
    double_filter: {
      setup: 'Bilas filter kertas bila dipakai, pasang rapi pada penekan, lalu gunakan gilingan sedang sampai medium-halus.',
      charge: 'Tuang air awal untuk membasahi semua bubuk, lalu lanjutkan sisa air dengan aliran mantap.',
      main: 'Rendam singkat dan jaga permukaan tetap tenang; filter tambahan membutuhkan campuran yang tidak terlalu berdebu.',
      release: 'Pasang penekan berfilter kertas secara tegak lurus dan tekan sangat lambat 45-60 detik agar tidak robek atau tersumbat.',
      finish: 'Tuang bersih ke wadah saji. Kertas membantu mengurangi sedimen dan menahan lebih banyak lipid kopi dibanding jaring logam saja.',
      chip: 'dua saringan',
    },
    heavy_concentrate: {
      setup: 'Panaskan French Press dan siapkan dosis tinggi dengan ruang aduk aman.',
      charge: 'Tuang air panas cepat agar dosis besar basah penuh sejak awal.',
      main: 'Rendam 4-5 menit agar konsentrat punya body, manis, dan tekstur untuk susu atau es.',
      release: 'Aduk permukaan perlahan bila ada bagian kering, lalu biarkan partikel halus turun.',
      finish: 'Tekan plunger secara mantap ke dasar wadah, tuang pisah segera sebagai basis minuman susu atau kopi es.',
      chip: 'konsentrat body',
    },
    sweet_immersion: {
      setup: 'Panaskan French Press dan gunakan air sedikit lebih rendah untuk menjaga rasa manis tetap lembut.',
      charge: 'Tuang air lembut dan merata, lalu aduk perlahan dua kali saja.',
      main: 'Rendam tenang sekitar 5 menit; kontak stabil memberi rasa manis tanpa agitasi akhir yang kasar.',
      release: 'Aduk permukaan secara sangat perlahan, lalu biarkan partikel kopi mengendap alami selama 1-2 menit.',
      finish: 'Tekan plunger sangat perlahan selama 30 detik dengan tekanan minimal. Tuang pisah segera ke cangkir saji.',
      chip: 'immersion manis',
    },
  };
  return pickStyleCopy(plan, copies, copies.traditional);
}

function buildFrenchPressGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const charge = firstVolumeStep(plan);
  const serve = findKind(plan, 'serve') || plan.steps.at(-1);
  const style = plan.recipeStyle || 'traditional';
  const styleCopy = buildFrenchPressStyleGuideCopy(plan);

  let steepStart = Math.min(60, Math.max(20, Math.round(plan.totalTimeSeconds * 0.2)));
  let settleStart = Math.max(steepStart + 30, Math.round(plan.totalTimeSeconds * 0.72));
  let pressStart = Math.max(settleStart + 15, (serve?.startSeconds || plan.totalTimeSeconds) - 30);

  if (style === 'clean_decant') {
    steepStart = 15;
    settleStart = 240;
    pressStart = plan.totalTimeSeconds - 20;
  } else if (style === 'double_filter') {
    steepStart = 30;
    settleStart = 90;
    pressStart = plan.totalTimeSeconds - 45;
  }

  const steps: WorkflowGuideStep[] = [
    operationalStep({
      id: 'guide_french_press_setup',
      label: 'Panaskan alat',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: styleCopy.setup,
      techniqueChips: [chip('basket_prep', 'Persiapan', styleCopy.chip)],
    }),
  ];

  if (charge) {
    steps.push(sourceStep('charge', charge, {
      label: 'Isi air',
      primaryText: `${styleCopy.charge} Target ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)}.`,
      secondaryText: style === 'double_filter' ? 'Basahi awal 30 detik untuk pelepasan CO2, lalu tuang sisa air secara cepat.' : 'Pastikan semua bubuk basah sebelum fase rendam.',
      techniqueChips: [chip('charge', 'Isi', formatMl(charge.pourVolumeMl || plan.hotWaterMl))],
    }));
  } else {
    steps.push(operationalStep({
      id: 'guide_french_press_charge',
      label: 'Isi air',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `${styleCopy.charge} Target ${formatMl(plan.hotWaterMl)}.`,
      techniqueChips: [chip('charge', 'Isi', formatMl(plan.hotWaterMl))],
    }));
  }

  steps.push(operationalStep({
    id: 'guide_french_press_steep',
    label: 'Rendam',
    actionType: 'steep',
    startSeconds: steepStart,
    endSeconds: settleStart,
    targetVolumeMl: plan.hotWaterMl,
    primaryText: styleCopy.main,
    techniqueChips: [chip('steep', 'Rendam', formatTime(Math.max(0, settleStart - steepStart)))],
  }));

  steps.push(operationalStep({
    id: 'guide_french_press_settle',
    label: style === 'clean_decant' ? 'Skim & Settle' : 'Endapkan',
    actionType: 'settle',
    startSeconds: settleStart,
    endSeconds: pressStart,
    targetVolumeMl: plan.hotWaterMl,
    primaryText: styleCopy.release,
    techniqueChips: [chip('settle', 'Endapkan', style === 'clean_decant' ? '5-8 menit' : 'pelan')],
  }));

  steps.push(operationalStep({
    id: 'guide_french_press_press',
    label: style === 'clean_decant' ? 'Apungkan penekan' : 'Tekan pelan',
    actionType: style === 'clean_decant' ? 'settle' : 'press',
    kind: 'press',
    startSeconds: pressStart,
    endSeconds: serve?.startSeconds || plan.totalTimeSeconds,
    targetVolumeMl: plan.hotWaterMl,
    primaryText: style === 'clean_decant'
      ? 'Posisikan plunger tepat di bawah permukaan cairan kopi. JANGAN ditekan ke dasar agar partikel halus dasar tidak keruh.'
      : style === 'double_filter'
        ? 'Tekan plunger berfilter kertas secara tegak lurus dan sangat lambat (45-60 detik) sesuai Hukum Darcy.'
        : 'Tekan penekan (plunger) perlahan; jangan memeras hamparan kopi.',
    techniqueChips: [chip('press', style === 'clean_decant' ? 'Apungkan' : 'Tekan', style === 'double_filter' ? '45-60s' : 'pelan')],
  }));

  steps.push(operationalStep({
    id: 'guide_french_press_decant',
    label: 'Tuang pisah',
    actionType: 'decant',
    startSeconds: serve?.startSeconds || plan.totalTimeSeconds,
    targetVolumeMl: plan.hotWaterMl,
    primaryText: styleCopy.finish,
    techniqueChips: [chip('decant', 'Tuang pisah', 'hentikan ekstraksi')],
    sourceStepIds: serve ? [serve.id] : [],
  }));

  return stepsSorted(steps);
}

function buildCleverStyleGuideCopy(plan: BrewPlan): MethodStyleGuideCopy {
  const copies: Record<string, MethodStyleGuideCopy> = {
    classic_closed: {
      setup: 'Bilas filter, panaskan Clever dan wadah saji, lalu pastikan alas pelepas siap.',
      charge: 'Masukkan air dan kopi di ruang tertutup, lalu basahi hamparan kopi merata.',
      main: 'Rendam tenang; waktu kontak adalah kontrol utama.',
      release: 'Letakkan di atas wadah saji untuk membuka pelepas, lalu jangan aduk saat air turun.',
      finish: 'Sajikan setelah air turun bersih.',
      chip: 'tertutup klasik',
    },
    reverse_water_first: {
      setup: 'Bilas filter, panaskan Clever, lalu siapkan air lebih dulu di ruang seduh.',
      charge: 'Masukkan air dulu, taburkan kopi merata, lalu aduk ringan agar semua bubuk basah.',
      main: 'Rendam tanpa gangguan; gaya ini menekan gumpalan kering.',
      release: 'Buka pelepas setelah rendam selesai dan biarkan aliran keluar bersih.',
      finish: 'Sajikan setelah air turun penuh.',
      chip: 'air dulu',
    },
    double_stage_hybrid: {
      setup: 'Bilas filter, panaskan Clever, dan siapkan dua fase: rendam lalu alirkan.',
      charge: 'Isi fase rendam pertama, basahi semua bubuk, lalu tahan kontak.',
      main: 'Tambahkan sisa air sesuai target sebelum pelepas dibuka.',
      release: 'Buka pelepas dan biarkan gaya gravitasi menyelesaikan fase turun.',
      finish: 'Aduk cangkir pelan sebelum disajikan.',
      chip: 'hybrid dua tahap',
    },
    iced_clever: {
      setup: 'Bilas filter, masukkan es ke wadah saji, dan siapkan Clever untuk air panas target.',
      charge: 'Rendam dengan air panas yang lebih sedikit agar konsentrat cukup kuat.',
      main: 'Jaga waktu kontak; es hanya mendinginkan dan mengencerkan sesuai resep.',
      release: 'Buka pelepas ke atas es dan berhenti di target air panas.',
      finish: 'Aduk es 5-8 detik sampai seduhan merata.',
      chip: 'Clever es',
    },
    high_dose_concentrate: {
      setup: 'Bilas filter, panaskan Clever, dan siapkan dosis tinggi tanpa memadatkan.',
      charge: 'Masukkan air dan kopi dengan ruang aman agar rendaman tidak meluap.',
      main: 'Rendam stabil untuk konsentrat; jangan menambah agitasi kasar.',
      release: 'Buka pelepas saat waktu tercapai dan biarkan aliran turun penuh.',
      finish: 'Aduk hasil seduh pelan agar konsentrat merata.',
      chip: 'konsentrat tinggi',
    },
  };
  return pickStyleCopy(plan, copies, copies.classic_closed);
}

function buildCleverGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const charge = firstVolumeStep(plan);
  const release = findKind(plan, 'release');
  const drawdown = findKind(plan, 'drawdown');
  const releaseStart = release?.startSeconds || Math.max(60, plan.totalTimeSeconds - 70);
  const styleCopy = buildCleverStyleGuideCopy(plan);
  return stepsSorted([
    operationalStep({
      id: 'guide_clever_setup',
      label: 'Bilas dan panaskan',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: styleCopy.setup,
      techniqueChips: [chip('basket_prep', 'Persiapan', styleCopy.chip)],
    }),
    charge ? sourceStep('charge', charge, {
      label: 'Isi air',
      primaryText: `${styleCopy.charge} Target ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)}.`,
      secondaryText: 'Basahi hamparan kopi merata; biarkan rendaman mulai bekerja.',
      techniqueChips: [chip('charge', 'Isi', formatMl(charge.pourVolumeMl || plan.hotWaterMl))],
    }) : operationalStep({
      id: 'guide_clever_charge',
      label: 'Isi air',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `${styleCopy.charge} Target ${formatMl(plan.hotWaterMl)}.`,
      techniqueChips: [chip('charge', 'Isi', formatMl(plan.hotWaterMl))],
    }),
    operationalStep({
      id: 'guide_clever_steep',
      label: 'Rendam',
      actionType: 'steep',
      startSeconds: Math.min(45, releaseStart),
      endSeconds: releaseStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.main,
      techniqueChips: [chip('steep', 'Rendam', formatTime(releaseStart))],
    }),
    release ? sourceStep('release', release, {
      label: 'Alirkan keluar',
      primaryText: styleCopy.release,
      secondaryText: 'Biarkan aliran keluar bersih tanpa tambahan air.',
      techniqueChips: [chip('release', 'Alirkan', 'bersih')],
    }) : operationalStep({
      id: 'guide_clever_release',
      label: 'Alirkan keluar',
      actionType: 'release',
      kind: 'release',
      startSeconds: releaseStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.release,
      techniqueChips: [chip('release', 'Alirkan', 'bersih')],
    }),
    drawdown ? sourceStep('drawdown', drawdown, {
      label: 'Air turun',
      primaryText: 'Biarkan air turun selesai tanpa tambah air.',
      techniqueChips: [chip('drawdown', 'Air turun', formatTime(plan.totalTimeSeconds))],
    }) : operationalStep({
      id: 'guide_clever_drawdown',
      label: 'Air turun',
      actionType: 'drawdown',
      kind: 'drawdown',
      startSeconds: Math.min(plan.totalTimeSeconds, releaseStart + 20),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: 'Biarkan air turun selesai tanpa tambah air.',
      techniqueChips: [chip('drawdown', 'Air turun', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_clever_serve',
      label: 'Sajikan',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.finish,
    }),
  ]);
}

function switchActionType(step: BrewPlanStep): WorkflowGuideActionType {
  if (step.kind === 'release') return 'release';
  if (step.kind === 'drawdown') return 'drawdown';
  if (step.kind === 'serve') return 'serve';
  if (step.kind === 'wait') return 'steep';
  return step.pourVolumeMl > 0 ? 'charge' : 'wait';
}

function buildSwitchPrimaryText(plan: BrewPlan, step: BrewPlanStep) {
  const time = formatTime(step.startSeconds);
  const valve = step.valveState === 'closed'
    ? 'Katup tutup'
    : step.valveState === 'open'
      ? 'Katup buka'
      : 'Katup sesuai mode';
  const chamber = Number.isFinite(step.chamberLoadMl) && step.valveState === 'closed'
    ? ` - muatan ruang ${formatMl(step.chamberLoadMl || 0)}`
    : '';
  const targetLabel = plan.brewMode === 'iced' ? 'target panas' : 'target';
  if (step.pourVolumeMl > 0) {
    return `${time} - ${valve} - tuang ${formatMl(step.pourVolumeMl)} sampai ${formatMl(step.targetVolumeMl)} ${targetLabel}${chamber}.`;
  }
  if (step.kind === 'release') {
    return `${time} - ${valve} - buka katup di ${formatMl(step.targetVolumeMl || plan.hotWaterMl)}; biarkan air turun bersih.`;
  }
  if (step.kind === 'drawdown') {
    return `${time} - ${valve} - air turun sampai selesai tanpa tambah air.`;
  }
  if (step.kind === 'serve') {
    return `${time} - sajikan setelah air turun; jangan tambah air di luar resep.`;
  }
  return `${time} - ${valve} - tahan kontak; jaga muatan ruang stabil.`;
}

function buildSwitchSecondaryText(plan: BrewPlan, step: BrewPlanStep) {
  const programme = formatSwitchProgramme(step.switchProgramme || plan.methodProgramme || 'auto');
  if (step.pourVolumeMl > 0 && step.valveState === 'closed') {
    return `Program ${programme}: isi ruang seduh pelan dan jaga muatan tetap di bawah batas aman.`;
  }
  if (step.pourVolumeMl > 0 && step.valveState === 'open') {
    return `Program ${programme}: fase perkolasi terbuka; jaga tuangan rapi sampai target.`;
  }
  if (step.kind === 'release') {
    return `Program ${programme}: buka katup bersih dan biarkan aliran turun tanpa agitasi tambahan.`;
  }
  if (step.kind === 'drawdown') {
    return `Program ${programme}: tunggu air turun selesai sebelum alat diangkat.`;
  }
  if (step.kind === 'serve') {
    return plan.brewMode === 'iced'
      ? 'Aduk es 5-8 detik sampai suhu merata, lalu sajikan.'
      : 'Aduk cangkir atau wadah saji pelan, lalu sajikan.';
  }
  return `Program ${programme}: tahan kontak sesuai waktu, lalu lanjut ke fase berikutnya.`;
}

function buildHarioSwitchGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const programme = (plan.methodProgramme || 'auto') as SwitchBrewProgramme;
  const guideSteps: WorkflowGuideStep[] = [
    operationalStep({
      id: 'guide_hario_switch_setup',
      label: 'Bilas, panaskan, set katup',
      actionType: 'rinse_preheat',
      startSeconds: 0,
      primaryText: plan.brewMode === 'iced'
        ? `Bilas kertas V60, panaskan alat dan wadah saji, tara timbangan, lalu masukkan ${formatGrams(plan.iceMl)} es ke wadah saji. Seduh target air panas saja.`
        : 'Bilas kertas V60, panaskan alat dan wadah saji, tara timbangan, lalu setel katup Switch sesuai program.',
      techniqueChips: [
        chip('programme', 'Program', formatSwitchProgramme(programme)),
        chip('valve', 'Katup', 'set sebelum seduh'),
      ],
      switchProgramme: programme,
      valveState: 'closed',
      chamberState: 'empty',
    }),
  ];

  for (const step of plan.steps) {
    const switchChips = techniqueChipsFromStep({
      ...step,
      switchProgramme: step.switchProgramme || programme,
    });
    const warnings = plan.switchStepValidation?.unsafeStepIds.includes(step.id)
      ? [plan.switchStepValidation.message]
      : [];
    guideSteps.push(sourceStep(switchActionType(step), step, {
      id: `guide_hario_switch_${step.id}`,
      label: step.label,
      primaryText: buildSwitchPrimaryText(plan, step),
      secondaryText: buildSwitchSecondaryText(plan, step),
      techniqueChips: switchChips,
      warnings,
    }));
  }

  if (!guideSteps.some((step) => step.actionType === 'serve')) {
    guideSteps.push(operationalStep({
      id: 'guide_hario_switch_serve',
      label: 'Sajikan',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: plan.brewMode === 'iced'
        ? 'Aduk es 5-8 detik setelah air turun. Aduk es tidak menambah ekstraksi; catat waktu buka katup untuk dial-in berikutnya.'
        : 'Sajikan setelah air turun dan catat timing muatan ruang untuk dial-in berikutnya.',
      techniqueChips: [
        chip('programme', 'Program', formatSwitchProgramme(programme)),
        chip('chamber', 'Ruang', 'selesai'),
      ],
      switchProgramme: programme,
      valveState: 'open',
      chamberState: 'served',
    }));
  }

  return stepsSorted(guideSteps);
}

function buildMokaStyleGuideCopy(plan: BrewPlan): MethodStyleGuideCopy {
  const copies: Record<string, MethodStyleGuideCopy> = {
    traditional_stovetop: {
      setup: 'Isi ruang air di bawah garis aman dan siapkan api sedang.',
      charge: 'Isi basket moka rata sampai penuh alami; jangan tamp.',
      main: 'Pakai panas sedang sampai aliran kopi stabil keluar.',
      release: 'Turunkan panas bila aliran mulai agresif atau putus-putus.',
      finish: 'Angkat sebelum semburan kasar, lalu sajikan.',
      chip: 'stovetop tradisional',
    },
    preheated_boiler: {
      setup: 'Isi ruang air dengan air panas, rakit moka memakai kain pelindung, lalu nyalakan panas lebih rendah.',
      charge: 'Ratakan basket tanpa tamp agar tekanan tetap aman.',
      main: 'Ekstraksi harus mulai lebih cepat; jaga panas rendah agar aliran tidak liar.',
      release: 'Kecilkan atau matikan panas saat aliran mulai penuh.',
      finish: 'Angkat sebelum semburan kasar dan dinginkan dasar sebentar bila perlu.',
      chip: 'air awal panas',
    },
    low_temp_controlled: {
      setup: 'Isi ruang air di bawah garis aman dan mulai dengan panas rendah-sedang.',
      charge: 'Ratakan basket moka longgar; jangan padatkan bubuk.',
      main: 'Jaga aliran tipis dan tenang untuk menghindari rasa rebus.',
      release: 'Angkat lebih awal saat aliran mulai menebal.',
      finish: 'Sajikan segera setelah aliran stabil berhenti sebelum semburan kasar.',
      chip: 'kontrol suhu rendah',
    },
    iced_moka_concentrate: {
      setup: 'Siapkan moka panas dan es di gelas saji terpisah.',
      charge: 'Isi basket rata tanpa tamp; targetnya konsentrat panas pendek.',
      main: 'Ekstrak di panas sedang sampai konsentrat keluar stabil.',
      release: 'Angkat sebelum semburan kasar agar konsentrat tidak terasa matang.',
      finish: 'Tuang konsentrat ke atas es dan aduk 5-8 detik.',
      chip: 'moka es',
    },
    high_yield_robust: {
      setup: 'Isi ruang air di bawah garis aman dan siapkan panas sedang stabil.',
      charge: 'Isi basket rata dan sedikit longgar; jangan menekan bubuk.',
      main: 'Pertahankan aliran stabil untuk hasil lebih besar tanpa semburan kasar.',
      release: 'Kecilkan panas saat aliran memucat atau mulai putus-putus.',
      finish: 'Angkat sebelum semburan kasar, aduk hasil moka pelan, lalu sajikan.',
      chip: 'hasil tinggi',
    },
  };
  return pickStyleCopy(plan, copies, copies.traditional_stovetop);
}

function buildMokaGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const heat = findKind(plan, 'heat');
  const serve = findKind(plan, 'serve') || plan.steps.at(-1);
  const heatStart = heat?.startSeconds || Math.max(30, Math.round(plan.totalTimeSeconds * 0.25));
  const stopStart = Math.max(plan.totalTimeSeconds, serve?.startSeconds || 0);
  const styleCopy = buildMokaStyleGuideCopy(plan);
  return stepsSorted([
    operationalStep({
      id: 'guide_moka_boiler',
      label: 'Isi boiler',
      actionType: 'setup',
      startSeconds: 0,
      primaryText: styleCopy.setup,
      techniqueChips: [chip('boiler', 'Boiler', 'garis aman')],
    }),
    operationalStep({
      id: 'guide_moka_basket',
      label: 'Ratakan basket',
      actionType: 'dose',
      startSeconds: 0,
      primaryText: styleCopy.charge,
      techniqueChips: [chip('basket', 'Basket', styleCopy.chip)],
    }),
    heat ? sourceStep('heat', heat, {
      label: 'Panas sedang',
      primaryText: styleCopy.main,
      secondaryText: styleCopy.release,
      techniqueChips: [chip('heat', 'Panas', 'sedang')],
    }) : operationalStep({
      id: 'guide_moka_heat',
      label: 'Panas sedang',
      actionType: 'heat',
      kind: 'heat',
      startSeconds: heatStart,
      primaryText: styleCopy.main,
      techniqueChips: [chip('heat', 'Panas', 'sedang')],
    }),
    operationalStep({
      id: 'guide_moka_monitor',
      label: 'Pantau aliran',
      actionType: 'monitor_flow',
      startSeconds: Math.min(plan.totalTimeSeconds, heatStart + 30),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.release,
      techniqueChips: [chip('flow_cue', 'Tanda aliran', 'stabil')],
    }),
    operationalStep({
      id: 'guide_moka_stop',
      label: 'Berhenti sebelum sputter',
      actionType: 'stop',
      startSeconds: stopStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.finish,
      techniqueChips: [chip('stop', 'Berhenti', 'sebelum sputter')],
      sourceStepIds: serve ? [serve.id] : [],
    }),
  ]);
}

function buildEspressoGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const extract = findKind(plan, 'extract') || firstVolumeStep(plan);
  const serve = findKind(plan, 'serve') || plan.steps.at(-1);
  return stepsSorted([
    operationalStep({
      id: 'guide_espresso_dose',
      label: 'Dose',
      actionType: 'dose',
      startSeconds: 0,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: `Dose ${formatGrams(plan.doseG)} dan siapkan basket.`,
      techniqueChips: [chip('dose', 'Dose', formatGrams(plan.doseG))],
    }),
    operationalStep({
      id: 'guide_espresso_puck_prep',
      label: 'Distribusi dan tamp',
      actionType: 'puck_prep',
      startSeconds: 0,
      primaryText: 'Distribusi rata, tamp level, dan bersihkan bibir basket.',
      techniqueChips: [chip('puck_prep', 'Prep puck', 'tamp rata')],
    }),
    extract ? sourceStep('extract', extract, {
      label: 'Mulai ekstraksi',
      primaryText: `Mulai ekstraksi espresso dan hentikan di hasil ${formatMl(plan.totalWaterMl)}.`,
      secondaryText: 'Jaga aliran stabil; hentikan jika channeling berat.',
      techniqueChips: [
        chip('yield', 'Hasil', formatMl(plan.totalWaterMl)),
        chip('shot_time', 'Waktu ekstraksi', formatTime(plan.totalTimeSeconds)),
        ...techniqueChipsFromStep(extract),
      ],
    }) : operationalStep({
      id: 'guide_espresso_extract',
      label: 'Mulai ekstraksi',
      actionType: 'extract',
      kind: 'extract',
      startSeconds: 0,
      pourVolumeMl: plan.totalWaterMl,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: `Mulai ekstraksi espresso dan hentikan di hasil ${formatMl(plan.totalWaterMl)}.`,
      techniqueChips: [chip('yield', 'Hasil', formatMl(plan.totalWaterMl)), chip('shot_time', 'Waktu ekstraksi', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_espresso_monitor',
      label: 'Pantau aliran',
      actionType: 'monitor_flow',
      startSeconds: Math.max(1, Math.round(plan.totalTimeSeconds * 0.35)),
      targetVolumeMl: plan.totalWaterMl,
      primaryText: 'Baca aliran dan channeling; berhenti di target hasil, jangan memanjangkan ekstraksi yang buruk.',
      techniqueChips: [chip('flow_cue', 'Aliran', 'stabil')],
    }),
    operationalStep({
      id: 'guide_espresso_stop',
      label: 'Berhenti di target hasil',
      actionType: 'stop',
      startSeconds: serve?.startSeconds || plan.totalTimeSeconds,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: `Berhenti di hasil ${formatMl(plan.totalWaterMl)} dalam jendela waktu ekstraksi.`,
      techniqueChips: [chip('stop', 'Berhenti', 'di hasil')],
      sourceStepIds: serve ? [serve.id] : [],
    }),
  ]);
}

function buildSiphonStyleGuideCopy(plan: BrewPlan): MethodStyleGuideCopy {
  const copies: Record<string, MethodStyleGuideCopy> = {
    traditional_vacuum_siphon: {
      setup: 'Pasang filter siphon, isi air, dan panaskan sampai air naik penuh.',
      charge: 'Masukkan kopi saat ruang atas sudah panas, lalu aduk singkat.',
      main: 'Jaga kontak stabil di ruang atas tanpa adukan berulang.',
      release: 'Matikan panas agar vakum menarik kopi turun alami.',
      finish: 'Sajikan segera setelah air turun bersih.',
      chip: 'vacuum tradisional',
    },
    competition_triple_agitation: {
      setup: 'Pasang filter siphon, panaskan air, dan siapkan tiga agitasi kecil yang terukur.',
      charge: 'Masukkan kopi saat air naik, lalu aduk pertama untuk pembasahan merata.',
      main: 'Gunakan agitasi kedua dan ketiga secara ringan, bukan mengocok ruang atas.',
      release: 'Matikan panas tepat waktu agar air turun bersih.',
      finish: 'Sajikan setelah seduhan turun dan permukaan tenang.',
      chip: 'tiga agitasi',
    },
    low_temp_delicate: {
      setup: 'Pasang filter siphon dan jaga panas lebih lembut untuk kopi halus.',
      charge: 'Masukkan kopi setelah air naik stabil, lalu aduk sangat singkat.',
      main: 'Jaga kontak lebih tenang agar rasa ringan tidak tertutup body.',
      release: 'Matikan panas sedikit lebih awal untuk fase turun yang lembut.',
      finish: 'Sajikan segera setelah air turun bersih.',
      chip: 'suhu rendah',
    },
    high_body_fast_drawdown: {
      setup: 'Pasang filter siphon, panaskan stabil, dan siapkan kontak singkat berenergi.',
      charge: 'Masukkan kopi dan aduk mantap di awal.',
      main: 'Jaga kontak padat tetapi singkat supaya body terbentuk tanpa rasa rebus.',
      release: 'Matikan panas dan dorong fase turun cepat dengan vakum bersih.',
      finish: 'Aduk hasil seduh pelan sebelum disajikan.',
      chip: 'body cepat',
    },
    spirit_infusion_style: {
      setup: 'Pasang filter siphon dan siapkan ruang atas bersih untuk infusi aromatik.',
      charge: 'Masukkan kopi saat air naik, lalu aduk ringan agar aromatik tidak rusak.',
      main: 'Jaga kontak halus; tambahan aromatik hanya boleh terukur dan aman pangan.',
      release: 'Matikan panas dan biarkan vakum menyaring seduhan turun.',
      finish: 'Sajikan segera; jangan menambah panas setelah fase turun.',
      chip: 'infusi aromatik',
    },
  };
  return pickStyleCopy(plan, copies, copies.traditional_vacuum_siphon);
}

function buildSiphonGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const charge = firstVolumeStep(plan);
  const heat = findKind(plan, 'heat');
  const drawdown = findKind(plan, 'drawdown');
  const heatStart = heat?.startSeconds || 60;
  const drawdownStart = drawdown?.startSeconds || Math.max(heatStart + 60, plan.totalTimeSeconds - 45);
  const styleCopy = buildSiphonStyleGuideCopy(plan);
  return stepsSorted([
    charge ? sourceStep('charge', charge, {
      label: 'Panaskan air',
      primaryText: `${styleCopy.setup} Target ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)}.`,
      techniqueChips: [chip('heat', 'Panas', styleCopy.chip)],
    }) : operationalStep({
      id: 'guide_siphon_heat_water',
      label: 'Panaskan air',
      actionType: 'heat',
      startSeconds: 0,
      primaryText: `${styleCopy.setup} Target ${formatMl(plan.hotWaterMl)}.`,
      techniqueChips: [chip('heat', 'Panas', styleCopy.chip)],
    }),
    operationalStep({
      id: 'guide_siphon_draw_up',
      label: 'Air naik',
      actionType: 'heat',
      kind: 'heat',
      startSeconds: heatStart,
      primaryText: 'Biarkan air naik penuh sebelum menambahkan kopi.',
      techniqueChips: [chip('draw_up', 'Air naik', 'penuh')],
      sourceStepIds: heat ? [heat.id] : [],
    }),
    operationalStep({
      id: 'guide_siphon_add_stir',
      label: 'Masukkan kopi dan aduk',
      actionType: 'stir',
      startSeconds: Math.min(drawdownStart - 45, heatStart + 20),
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.charge,
      techniqueChips: [chip('stir', 'Aduk', 'singkat')],
    }),
    operationalStep({
      id: 'guide_siphon_contact',
      label: 'Kontak atas',
      actionType: 'steep',
      startSeconds: Math.min(drawdownStart - 25, heatStart + 45),
      endSeconds: drawdownStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.main,
      techniqueChips: [chip('contact', 'Kontak', formatTime(Math.max(20, drawdownStart - heatStart)))],
    }),
    drawdown ? sourceStep('drawdown', drawdown, {
      label: 'Matikan panas dan air turun',
      primaryText: styleCopy.release,
      secondaryText: 'Biarkan vakum menarik kopi turun tanpa aduk tambahan.',
      techniqueChips: [chip('drawdown', 'Air turun', 'alami')],
    }) : operationalStep({
      id: 'guide_siphon_drawdown',
      label: 'Matikan panas dan air turun',
      actionType: 'drawdown',
      kind: 'drawdown',
      startSeconds: drawdownStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.release,
      techniqueChips: [chip('drawdown', 'Air turun', 'alami')],
    }),
    operationalStep({
      id: 'guide_siphon_serve',
      label: 'Sajikan',
      actionType: 'serve',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.finish,
    }),
  ]);
}

function buildBatchStyleGuideCopy(plan: BrewPlan): MethodStyleGuideCopy {
  const copies: Record<string, MethodStyleGuideCopy> = {
    sca_gold_cup: {
      setup: 'Setel dosis per liter, pasang filter, dan ratakan hamparan kopi di keranjang mesin.',
      charge: 'Mulai siklus pancuran mesin dan jangan ganggu keranjang.',
      main: 'Biarkan mesin menjaga sebaran air dan suhu sesuai setelan.',
      release: 'Biarkan air turun selesai sebelum teko diangkat.',
      finish: 'Aduk batch pelan sebelum evaluasi rasa atau servis.',
      chip: 'gold cup',
    },
    heavy_batch_catering: {
      setup: 'Setel dosis lebih tinggi, pasang filter kuat, dan ratakan hamparan kopi untuk batch besar.',
      charge: 'Mulai siklus mesin; pastikan teko punya kapasitas aman.',
      main: 'Jaga batch tidak dipindah saat air masih turun.',
      release: 'Tunggu fase turun selesai agar konsentrasi tidak berlapis.',
      finish: 'Aduk batch pelan sebelum masuk termos atau servis.',
      chip: 'batch besar',
    },
    bright_light_roast_batch: {
      setup: 'Setel dosis per liter untuk sangrai ringan dan pastikan suhu mesin stabil.',
      charge: 'Mulai siklus pancuran mesin tanpa membuka tutup keranjang.',
      main: 'Biarkan kontak cukup panjang; jangan mengurangi siklus saat kopi masih muda.',
      release: 'Tunggu air turun selesai sebelum mencicipi.',
      finish: 'Aduk batch pelan agar cangkir pertama dan terakhir konsisten.',
      chip: 'sangrai ringan',
    },
    pre_wet_hybrid_batch: {
      setup: 'Setel fase basah awal mesin, pasang filter, dan ratakan hamparan kopi.',
      charge: 'Biarkan mesin melakukan basah awal sebelum siklus utama.',
      main: 'Jaga jeda basah awal singkat dan konsisten.',
      release: 'Biarkan siklus utama dan fase turun selesai tanpa intervensi manual.',
      finish: 'Aduk batch pelan sebelum servis.',
      chip: 'basah awal',
    },
    high_extraction_thermos: {
      setup: 'Setel dosis per liter, panaskan termos, dan pastikan filter terpasang rapi.',
      charge: 'Mulai siklus mesin menuju termos yang sudah panas.',
      main: 'Jaga waktu kontak cukup untuk ekstraksi tinggi tanpa membuka keranjang.',
      release: 'Tunggu air turun selesai sebelum tutup termos.',
      finish: 'Aduk batch pelan lalu tutup termos untuk servis.',
      chip: 'termos',
    },
  };
  return pickStyleCopy(plan, copies, copies.sca_gold_cup);
}

function buildBatchGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const start = firstVolumeStep(plan);
  const drawdown = findKind(plan, 'drawdown');
  const styleCopy = buildBatchStyleGuideCopy(plan);
  return stepsSorted([
    operationalStep({
      id: 'guide_batch_dose',
      label: 'Dose per liter',
      actionType: 'dose',
      startSeconds: 0,
      primaryText: `${styleCopy.setup} Target air siklus mesin ${formatMl(plan.totalWaterMl)}.`,
      techniqueChips: [chip('dose_per_liter', 'Dose/L', `${formatGrams(plan.doseG)} / ${formatMl(plan.totalWaterMl)}`)],
    }),
    operationalStep({
      id: 'guide_batch_basket',
      label: 'Prep basket',
      actionType: 'setup',
      startSeconds: 0,
      primaryText: styleCopy.setup,
      techniqueChips: [chip('basket_prep', 'Keranjang', styleCopy.chip)],
    }),
    start ? sourceStep('charge', start, {
      label: 'Siklus mesin',
      primaryText: styleCopy.charge,
      secondaryText: styleCopy.main,
      techniqueChips: [chip('spray', 'Pancuran', 'aliran mesin')],
    }) : operationalStep({
      id: 'guide_batch_cycle',
      label: 'Siklus mesin',
      actionType: 'charge',
      startSeconds: 0,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: styleCopy.charge,
      techniqueChips: [chip('spray', 'Pancuran', 'aliran mesin')],
    }),
    drawdown ? sourceStep('drawdown', drawdown, {
      label: 'Air turun',
      primaryText: styleCopy.release,
      secondaryText: 'Jangan aduk keranjang saat fase akhir.',
      techniqueChips: [chip('drawdown', 'Air turun', formatTime(plan.totalTimeSeconds))],
    }) : operationalStep({
      id: 'guide_batch_drawdown',
      label: 'Air turun',
      actionType: 'drawdown',
      kind: 'drawdown',
      startSeconds: Math.max(0, plan.totalTimeSeconds - 45),
      targetVolumeMl: plan.totalWaterMl,
      primaryText: styleCopy.release,
      techniqueChips: [chip('drawdown', 'Air turun', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_batch_mix',
      label: 'Aduk batch',
      actionType: 'mix',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.totalWaterMl,
      primaryText: styleCopy.finish,
      techniqueChips: [chip('mix_batch', 'Aduk batch', 'sebelum servis')],
    }),
  ]);
}

function buildColdBrewStyleGuideCopy(plan: BrewPlan): MethodStyleGuideCopy {
  const copies: Record<string, MethodStyleGuideCopy> = {
    classic_toddy_immersion: {
      setup: 'Siapkan wadah cold brew, filter, kopi kasar, dan air dingin.',
      charge: 'Basahi semua bubuk dengan air dingin sampai tidak ada bagian kering.',
      main: 'Rendam dingin panjang tanpa panas dan tanpa agitasi berulang.',
      release: 'Saring atau tuang pisah dengan bersih setelah waktu tercapai.',
      finish: 'Encerkan hanya setelah tersaring bila kekuatan sajian perlu disesuaikan.',
      chip: 'immersion klasik',
    },
    cold_drip_tower: {
      setup: 'Siapkan menara tetes dingin, kopi kasar, dan laju tetes yang stabil.',
      charge: 'Basahi awal bubuk kopi secukupnya agar tetesan pertama tidak membuat jalur kering.',
      main: 'Jaga laju tetes konsisten; koreksi dari pengatur tetes, bukan dari adukan.',
      release: 'Selesaikan ketika volume target terkumpul dan bubuk tidak lagi tertetes merata.',
      finish: 'Aduk hasil cold drip pelan sebelum disimpan atau disajikan.',
      chip: 'tetes dingin',
    },
    double_extraction_concentrate: {
      setup: 'Siapkan wadah cold brew dan rencana konsentrat dua tahap.',
      charge: 'Basahi bubuk dengan air dingin tahap pertama sampai merata.',
      main: 'Tambahkan tahap kedua sesuai target untuk menguatkan konsentrat tanpa panas.',
      release: 'Saring bersih setelah kontak selesai.',
      finish: 'Encerkan setelah tersaring sesuai kekuatan saji.',
      chip: 'dua tahap',
    },
    accelerated_room_temp: {
      setup: 'Siapkan wadah tertutup, kopi kasar, dan air suhu ruang.',
      charge: 'Basahi semua bubuk merata dengan air suhu ruang.',
      main: 'Rendam lebih singkat dari cold brew kulkas; catat waktu karena ekstraksi berjalan lebih cepat.',
      release: 'Saring segera saat target tercapai agar rasa tidak berat.',
      finish: 'Dinginkan setelah tersaring atau sajikan dengan es.',
      chip: 'suhu ruang',
    },
    japanese_slow_drip: {
      setup: 'Siapkan tetes dingin gaya Jepang dengan air dingin dan laju tetes stabil.',
      charge: 'Basahi permukaan kopi perlahan agar tetesan tidak membuat jalur pintas.',
      main: 'Jaga ritme tetes rendah dan konsisten sampai volume target.',
      release: 'Hentikan saat target terkumpul; jangan memeras bubuk.',
      finish: 'Aduk hasil tetes dingin pelan sebelum disajikan.',
      chip: 'slow drip',
    },
  };
  return pickStyleCopy(plan, copies, copies.classic_toddy_immersion);
}

function buildColdBrewGuide(plan: BrewPlan): WorkflowGuideStep[] {
  const charge = firstVolumeStep(plan);
  const filterStart = Math.max(0, plan.totalTimeSeconds - 300);
  const styleCopy = buildColdBrewStyleGuideCopy(plan);
  return stepsSorted([
    operationalStep({
      id: 'guide_cold_brew_dose',
      label: 'Dose',
      actionType: 'dose',
      startSeconds: 0,
      primaryText: `Dosis ${formatGrams(plan.doseG)}. ${styleCopy.setup}`,
      techniqueChips: [chip('dose', 'Dosis', `${formatGrams(plan.doseG)} - ${styleCopy.chip}`)],
    }),
    charge ? sourceStep('charge', charge, {
      label: 'Basahi merata',
      primaryText: `${styleCopy.charge} Target ${formatMl(charge.pourVolumeMl || plan.hotWaterMl)}.`,
      secondaryText: 'Pastikan tidak ada bagian kering sebelum rendam panjang.',
      techniqueChips: [chip('saturation', 'Basahi', 'semua bubuk')],
    }) : operationalStep({
      id: 'guide_cold_brew_saturate',
      label: 'Basahi merata',
      actionType: 'charge',
      startSeconds: 0,
      pourVolumeMl: plan.hotWaterMl,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `${styleCopy.charge} Target ${formatMl(plan.hotWaterMl)}.`,
      techniqueChips: [chip('saturation', 'Basahi', 'semua bubuk')],
    }),
    operationalStep({
      id: 'guide_cold_brew_steep',
      label: 'Rendam dingin',
      actionType: 'steep',
      startSeconds: 300,
      endSeconds: filterStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: `${styleCopy.main} Target waktu ${formatTime(plan.totalTimeSeconds)}.`,
      techniqueChips: [chip('steep', 'Rendam', formatTime(plan.totalTimeSeconds))],
    }),
    operationalStep({
      id: 'guide_cold_brew_filter',
      label: 'Filter atau tuang pisah',
      actionType: 'filter',
      startSeconds: filterStart,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.release,
      techniqueChips: [chip('filter', 'Saring', 'bersih')],
    }),
    operationalStep({
      id: 'guide_cold_brew_dilute',
      label: 'Dilusi setelah filter',
      actionType: 'dilute',
      startSeconds: plan.totalTimeSeconds,
      targetVolumeMl: plan.hotWaterMl,
      primaryText: styleCopy.finish,
      techniqueChips: [chip('dilution', 'Encerkan', 'setelah tersaring')],
    }),
  ]);
}

export function buildWorkflowAwareGuideSteps(plan: BrewPlan): WorkflowGuideStep[] {
  if (plan.methodFamily === 'aeropress') return buildAeroPressGuide(plan);
  if (plan.methodFamily === 'french_press') return buildFrenchPressGuide(plan);
  if (plan.methodFamily === 'hario_switch') return buildHarioSwitchGuide(plan);
  if (plan.methodFamily === 'clever_dripper') return buildCleverGuide(plan);
  if (plan.methodFamily === 'moka_pot') return buildMokaGuide(plan);
  if (plan.methodFamily === 'espresso') return buildEspressoGuide(plan);
  if (plan.methodFamily === 'siphon') return buildSiphonGuide(plan);
  if (plan.methodFamily === 'batch_brew') return buildBatchGuide(plan);
  if (plan.methodFamily === 'cold_brew') return buildColdBrewGuide(plan);
  if (POUROVER_FAMILIES.has(plan.methodFamily)) return buildPouroverGuide(plan);

  return plan.steps.map((step) => sourceStep(step.kind || 'pour', step, {
    primaryText: step.note,
    secondaryText: step.hybridInstruction,
  }));
}

function phaseSet(guideSteps: WorkflowGuideStep[]) {
  const text = guideSteps.map((step) => `${step.actionType} ${step.label} ${step.primaryText} ${step.secondaryText || ''} ${step.techniqueChips.map((chipItem) => `${chipItem.key} ${chipItem.value}`).join(' ')}`.toLowerCase());
  const has = (phase: string | RegExp) => typeof phase === 'string'
    ? text.some((item) => item.includes(phase))
    : text.some((item) => phase.test(item));
  return { text, has };
}

function requirePhase(
  result: { missingPhases: string[]; blockingErrors: string[] },
  phases: ReturnType<typeof phaseSet>,
  label: string,
  matcher: string | RegExp,
) {
  if (!phases.has(matcher)) {
    result.missingPhases.push(label);
    result.blockingErrors.push(`Fase panduan seduh belum lengkap: ${label}.`);
  }
}

function validateIcedEnvelope(plan: BrewPlan, blockingErrors: string[]) {
  if (plan.brewMode !== 'iced') return;
  const hotIceTotal = Math.round(plan.hotWaterMl + plan.iceMl);
  if (hotIceTotal !== Math.round(plan.totalWaterMl)) {
    blockingErrors.push(`Split seduh es tidak cocok: air panas ${plan.hotWaterMl} ml + es ${plan.iceMl} g harus sama dengan total ${plan.totalWaterMl} ml.`);
  }
  if (!(plan.estimatedCupOutputMl < plan.totalWaterMl)) {
    blockingErrors.push('Output cangkir seduh es harus lebih rendah dari total input setelah retensi.');
  }
  const volumeSteps = plan.steps.filter((step) => step.pourVolumeMl > 0 || step.kind === 'extract');
  const lastVolumeStep = volumeSteps.at(-1);
  if (lastVolumeStep && Math.round(lastVolumeStep.targetVolumeMl) !== Math.round(plan.hotWaterMl)) {
    blockingErrors.push(`Target air panas terakhir ${lastVolumeStep.targetVolumeMl} ml harus sama dengan air panas ${plan.hotWaterMl} ml.`);
  }
  const poured = Math.round(volumeSteps.reduce((sum, step) => sum + Math.max(0, step.pourVolumeMl), 0));
  if (Math.abs(poured - Math.round(plan.hotWaterMl)) > 1) {
    blockingErrors.push(`Total tuangan seduh es ${poured} ml harus sama dengan air panas ${plan.hotWaterMl} ml dalam toleransi 1 ml.`);
  }
}

function validateHarioSwitchWorkflow(plan: BrewPlan, guideSteps: WorkflowGuideStep[], blockingErrors: string[], warnings: string[]) {
  if (plan.dripper.id === 'hario-switch') {
    blockingErrors.push('Profil Hario Switch lama masih ambigu ukuran. Pilih Switch 02, Switch 03, atau MUGEN x SWITCH sebelum seduh.');
  }

  const preservedStepIds = new Set(guideSteps.flatMap((step) => step.sourceStepIds));
  const missingVolumeSteps = plan.steps
    .filter((step) => step.pourVolumeMl > 0)
    .filter((step) => !preservedStepIds.has(step.id));
  if (missingVolumeSteps.length > 0) {
    blockingErrors.push(`Panduan Hario Switch melewatkan checkpoint volume: ${missingVolumeSteps.map((step) => step.id).join(', ')}.`);
  }

  const constraints = plan.devicePhysicalConstraints;
  const closedLimit = constraints?.recommendedClosedPhaseMaxMl || constraints?.finishedCapacityMl;
  if (!closedLimit) {
    blockingErrors.push('Profil Hario Switch belum punya batas muatan ruang.');
    return;
  }

  const closedLoads = plan.steps
    .filter((step) => step.valveState === 'closed')
    .map((step) => step.chamberLoadMl ?? step.targetVolumeMl)
    .filter((value) => Number.isFinite(value) && value > 0);
  const maxClosedLoad = Math.max(0, ...closedLoads);
  if (maxClosedLoad > closedLimit + 1) {
    blockingErrors.push(`Muatan ruang Hario Switch saat katup tertutup ${Math.round(maxClosedLoad)} ml melewati batas aman ${Math.round(closedLimit)} ml. Pilih Switch 03 atau program hybrid.`);
  }

  if (String(plan.methodProgramme || '').startsWith('full_immersion') && plan.hotWaterMl > closedLimit + 1) {
    blockingErrors.push(`Program full immersion Switch butuh kapasitas tertutup ${Math.round(plan.hotWaterMl)} ml, di atas batas aman ${Math.round(closedLimit)} ml.`);
  }

  if (plan.switchStepValidation?.status === 'blocked') {
    blockingErrors.push(plan.switchStepValidation.message);
  } else if (plan.switchStepValidation?.status === 'caution') {
    warnings.push(plan.switchStepValidation.message);
  }

  if (!constraints.finishedCapacityMl || !constraints.filterSize) {
    warnings.push('Profil Hario Switch butuh bukti kapasitas dan ukuran filter lengkap sebelum keyakinan publik dianggap kuat.');
  }
}

export function validateMethodWorkflowGuide(plan: BrewPlan, guideSteps: WorkflowGuideStep[]): MethodWorkflowValidationResult {
  const missingPhases: string[] = [];
  const warnings: string[] = [];
  const blockingErrors: string[] = [];
  const phases = phaseSet(guideSteps);
  const accumulator = { missingPhases, blockingErrors };

  if (guideSteps.length === 0) {
    blockingErrors.push('Panduan seduh kosong.');
  }

  validateIcedEnvelope(plan, blockingErrors);

  if (POUROVER_FAMILIES.has(plan.methodFamily)) {
    requirePhase(accumulator, phases, 'rinse/preheat', /rinse|preheat|filter|bilas|panas/);
    requirePhase(accumulator, phases, 'bloom', 'bloom');
    requirePhase(accumulator, phases, 'pour', /pour|tuang/);
    requirePhase(accumulator, phases, 'drawdown', /drawdown|air turun/);
    requirePhase(accumulator, phases, 'serve', /serve|sajikan/);
    if (plan.brewMode === 'iced') requirePhase(accumulator, phases, 'hot-water target', /hot water|air panas/);
  }

  switch (plan.methodFamily) {
    case 'hario_switch':
      requirePhase(accumulator, phases, 'valve state', /valve|katup|closed|open|tutup|buka/);
      requirePhase(accumulator, phases, 'chamber state', /chamber|ruang|immersion|percolation|perkolasi/);
      if (plan.methodProgramme === 'full_percolation_v60_mode' || plan.switchPresetId === 'v60_mode') {
        requirePhase(accumulator, phases, 'open percolation', /open|buka|percolation|perkolasi/);
      } else {
        requirePhase(accumulator, phases, 'release/open', /release|open|buka katup|katup buka/);
      }
      requirePhase(accumulator, phases, 'serve', /serve|sajikan/);
      validateHarioSwitchWorkflow(plan, guideSteps, blockingErrors, warnings);
      if (phases.has(/generic clever only|single charge only/)) blockingErrors.push('Panduan Hario Switch tidak boleh berubah menjadi panduan Clever satu kali isi yang generik.');
      break;
    case 'aeropress':
      requirePhase(accumulator, phases, 'charge', /charge|isi|air|masukkan/);
      requirePhase(accumulator, phases, 'stir/swirl', /stir|swirl|aduk/);
      requirePhase(accumulator, phases, 'steep', /steep|rendam/);
      requirePhase(accumulator, phases, 'press', /press|tekan/);
      requirePhase(accumulator, phases, 'stop before hiss', /before hiss|sebelum hiss|hiss|before desis|sebelum desis|desis/);
      if (guideSteps.filter((step) => !step.isOperationalOnly || step.actionType !== 'setup').length < 5) {
        blockingErrors.push('Panduan AeroPress tidak boleh tampil sebagai satu langkah operasional saja.');
      }
      if (phases.has(/\b(final pour|drawdown|flat bed|v60|pour map|bloom)\b|center-to-mid stream/i)) {
        blockingErrors.push('Panduan AeroPress mengandung bahasa pour-over.');
      }
      break;
    case 'french_press':
      requirePhase(accumulator, phases, 'charge', /charge|isi|masukkan/);
      requirePhase(accumulator, phases, 'steep', /steep|rendam/);
      requirePhase(accumulator, phases, 'settle/decant', /settle|endapkan|decant|tuang pisah|crust/);
      requirePhase(accumulator, phases, 'press', /press|tekan/);
      if (phases.has(/final pour|bloom|drawdown bed/)) blockingErrors.push('Panduan French Press mengandung bahasa pour-over.');
      break;
    case 'clever_dripper':
      requirePhase(accumulator, phases, 'charge', /charge|isi|masukkan/);
      requirePhase(accumulator, phases, 'steep', /steep|rendam/);
      requirePhase(accumulator, phases, 'release', /release|buka katup/);
      requirePhase(accumulator, phases, 'drawdown', /drawdown|air turun/);
      break;
    case 'moka_pot':
      requirePhase(accumulator, phases, 'boiler below valve', /below valve|di bawah valve|boiler/);
      requirePhase(accumulator, phases, 'level basket', /basket|no tamp|tanpa tamp|jangan tamp/);
      requirePhase(accumulator, phases, 'heat', /heat|panas/);
      requirePhase(accumulator, phases, 'stop before sputter', /sputter|stop|berhenti/);
      if (phases.has(/bloom|final pour|center-to-mid/)) blockingErrors.push('Panduan Moka Pot mengandung bahasa pour-over.');
      break;
    case 'espresso':
      requirePhase(accumulator, phases, 'dose', 'dose');
      requirePhase(accumulator, phases, 'puck prep', /puck|tamp|distribute|distribusi/);
      requirePhase(accumulator, phases, 'shot/yield', /shot|yield|extract|ekstrak/);
      requirePhase(accumulator, phases, 'flow', /flow|aliran/);
      requirePhase(accumulator, phases, 'stop', /stop|berhenti/);
      if (phases.has(/bloom|kettle|filter wall|final pour/)) blockingErrors.push('Panduan Espresso mengandung bahasa seduh filter.');
      break;
    case 'siphon':
      requirePhase(accumulator, phases, 'heat/draw-up', /heat|panas|draw-up|draw up|air naik/);
      requirePhase(accumulator, phases, 'stir', /stir|aduk/);
      requirePhase(accumulator, phases, 'contact', /contact|kontak/);
      requirePhase(accumulator, phases, 'drawdown', /drawdown|air turun/);
      break;
    case 'batch_brew':
      requirePhase(accumulator, phases, 'dose per liter', /dose\/l|dose per liter/);
      requirePhase(accumulator, phases, 'machine/spray', /machine|spray/);
      requirePhase(accumulator, phases, 'drawdown', /drawdown|air turun/);
      requirePhase(accumulator, phases, 'mix batch', /mix batch|aduk batch|carafe/);
      if (phases.has(/manual pour|bloom pour|center-to-mid/)) blockingErrors.push('Panduan Batch Brewer mengandung bahasa pour-over manual.');
      break;
    case 'cold_brew':
      requirePhase(accumulator, phases, 'saturate', /saturate|basahi|dry pocket|bagian kering/);
      requirePhase(accumulator, phases, 'steep hours', /steep|rendam|h/);
      requirePhase(accumulator, phases, 'filter/decant', /filter|decant|tuang pisah/);
      requirePhase(accumulator, phases, 'dilute after filtration', /after filtration|setelah filtrasi|dilute|dilusi/);
      if (phases.has(/hot pour|kettle|bloom/)) blockingErrors.push('Panduan Cold Brew mengandung bahasa pour-over panas.');
      break;
    default:
      break;
  }

  if (!phases.has(/rinse|preheat|setup|prep|dose|boiler|basket|bilas|panaskan|persiapan/)) {
    warnings.push('Panduan seduh belum punya cue persiapan.');
  }
  if (plan.fallbackUsed) warnings.push('Referensi fallback alat/grinder perlu validasi rasa.');
  if (
    plan.waterPresetStatus === 'manual_required'
    || plan.waterMineralDerivation === 'estimated_from_classification'
    || plan.waterMineralDerivation === 'estimated_from_community_profile'
  ) {
    warnings.push('Mineral air perlu verifikasi manual sebelum keyakinan publik dianggap kuat.');
  }

  const uniqueBlockingErrors = Array.from(new Set(blockingErrors));
  const uniqueMissingPhases = Array.from(new Set(missingPhases));
  const uniqueWarnings = Array.from(new Set(warnings));
  const readinessScore = Math.max(
    0,
    Math.min(100, 100 - uniqueBlockingErrors.length * 18 - uniqueWarnings.length * 5),
  );
  const status = uniqueBlockingErrors.length > 0 ? 'blocked' : uniqueWarnings.length > 0 ? 'needs_review' : 'ready';
  return {
    passed: uniqueBlockingErrors.length === 0,
    status,
    missingPhases: uniqueMissingPhases,
    warnings: uniqueWarnings,
    blockingErrors: uniqueBlockingErrors,
    readinessScore,
  };
}
