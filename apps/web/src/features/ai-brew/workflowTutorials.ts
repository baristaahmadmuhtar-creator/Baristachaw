import type {
  AiBrewMethodFamily,
  WorkflowGuideActionType,
} from './types.ts';

type WorkflowTutorialCopy = {
  en: string;
  id: string;
};

type WorkflowTutorialPhase =
  | 'setup'
  | 'entry'
  | 'main'
  | 'release'
  | 'finish';

type WorkflowTutorialProfile = Record<WorkflowTutorialPhase, WorkflowTutorialCopy> & {
  iced?: Partial<Record<WorkflowTutorialPhase, WorkflowTutorialCopy>>;
  actions?: Partial<Record<WorkflowGuideActionType, WorkflowTutorialCopy>>;
};

export type WorkflowTutorialLanguage = 'en' | 'id';

export interface WorkflowTutorialContext {
  methodFamily: AiBrewMethodFamily;
  actionType: WorkflowGuideActionType;
  brewMode: 'hot' | 'iced';
  language?: string;
  hasWarning?: boolean;
}

export const AI_BREW_WORKFLOW_TUTORIAL_METHODS = [
  'v60',
  'chemex',
  'kalita_wave',
  'origami',
  'april',
  'melitta',
  'kono',
  'hario_switch',
  'clever_dripper',
  'aeropress',
  'french_press',
  'espresso',
  'moka_pot',
  'siphon',
  'cold_brew',
  'batch_brew',
] as const satisfies readonly AiBrewMethodFamily[];

const PAPER_FILTER_ICED: Partial<Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  setup: {
    en: 'Put ice in the server first; the coffee bed should only receive the planned hot water.',
    id: 'Masukkan es ke server lebih dulu; bed kopi hanya menerima air panas yang sudah dihitung.',
  },
  main: {
    en: 'Keep the pour calm and stop at the hot-water target so the ice melt balances the cup.',
    id: 'Jaga tuangan tenang dan berhenti di target air panas agar lelehan es menyeimbangkan cup.',
  },
  finish: {
    en: 'Swirl the server briefly so concentrate and melted ice taste even before serving.',
    id: 'Putar server sebentar agar konsentrat dan es leleh menyatu sebelum disajikan.',
  },
};

const WORKFLOW_TUTORIALS: Record<AiBrewMethodFamily, WorkflowTutorialProfile> = {
  v60: {
    setup: {
      en: 'Rinse the paper, warm the brewer and server, then level the dry bed before the first pour.',
      id: 'Bilas filter, panaskan brewer dan server, lalu ratakan bed kering sebelum tuangan pertama.',
    },
    entry: {
      en: 'Bloom with a gentle pour across the bed, then let gas escape before building flow.',
      id: 'Bloom dengan tuangan lembut ke seluruh bed, lalu beri waktu gas keluar sebelum aliran utama.',
    },
    main: {
      en: 'Pour low and steady from center to mid; keep the bed even and avoid chasing the wall.',
      id: 'Tuang rendah dan stabil dari tengah ke tengah-luar; bed tetap rata dan jangan kejar dinding filter.',
    },
    release: {
      en: 'Let drawdown finish naturally; a flat, calm bed is more useful than extra agitation.',
      id: 'Biarkan fase turun selesai natural; bed yang rata dan tenang lebih berguna daripada agitasi tambahan.',
    },
    finish: {
      en: 'Swirl the server once, then serve while aromatics are still clear.',
      id: 'Putar server sekali, lalu sajikan saat aroma masih jernih.',
    },
    iced: PAPER_FILTER_ICED,
  },
  chemex: {
    setup: {
      en: 'Rinse the thick paper thoroughly and keep the spout vent open so flow can breathe.',
      id: 'Bilas paper tebal sampai bersih dan pastikan jalur spout terbuka agar aliran tidak tertahan.',
    },
    entry: {
      en: 'Bloom patiently; Chemex paper slows flow, so full wetting matters more than speed.',
      id: 'Bloom dengan sabar; paper Chemex menahan aliran, jadi pembasahan merata lebih penting dari cepat.',
    },
    main: {
      en: 'Use measured pulses and keep water off the wall; Chemex rewards calm, patient flow.',
      id: 'Gunakan pulse terukur dan hindari dinding filter; Chemex lebih enak dengan aliran tenang.',
    },
    release: {
      en: 'Allow the longer drawdown window; intervene only if the surface stalls completely.',
      id: 'Beri ruang fase turun lebih panjang; intervensi hanya bila permukaan benar-benar macet.',
    },
    finish: {
      en: 'Mix the carafe gently before pouring because Chemex layers the brew by time.',
      id: 'Aduk karafe perlahan sebelum menuang karena Chemex bisa membentuk lapisan rasa.',
    },
    iced: PAPER_FILTER_ICED,
  },
  kalita_wave: {
    setup: {
      en: 'Seat the wave filter neatly and level the bed so all three holes share the flow.',
      id: 'Pasang filter wave dengan rapi dan ratakan bed agar tiga lubang berbagi aliran.',
    },
    entry: {
      en: 'Bloom evenly without flooding one side; flat-bottom brewers need a level start.',
      id: 'Bloom merata tanpa membanjiri satu sisi; flat-bottom butuh awal yang rata.',
    },
    main: {
      en: 'Use short centered pulses and keep the slurry level, not deep on one side.',
      id: 'Gunakan pulse pendek dari tengah dan jaga slurry rata, bukan menumpuk di satu sisi.',
    },
    release: {
      en: 'Let the flat bed drain cleanly; do not shake fines into the holes.',
      id: 'Biarkan bed rata turun bersih; jangan mengguncang fines ke lubang bawah.',
    },
    finish: {
      en: 'Serve after a light mix so the sweet flat-bottom body is even.',
      id: 'Sajikan setelah aduk ringan agar body manis flat-bottom terasa rata.',
    },
    iced: PAPER_FILTER_ICED,
  },
  origami: {
    setup: {
      en: 'Match the filter style to the recipe, then seat it evenly so the ribs do not collapse.',
      id: 'Sesuaikan filter dengan resep, lalu pasang rata agar lipatan tidak kolaps.',
    },
    entry: {
      en: 'Bloom across the bed; Origami flows fast when dry pockets remain.',
      id: 'Bloom merata ke seluruh bed; Origami bisa terlalu cepat bila masih ada bagian kering.',
    },
    main: {
      en: 'Keep the pour compact and stable; let the filter style decide how open the flow feels.',
      id: 'Jaga tuangan ringkas dan stabil; biarkan gaya filter menentukan seberapa terbuka alirannya.',
    },
    release: {
      en: 'Let the ribs clear the last water without shaking the bed.',
      id: 'Biarkan rib melepas air terakhir tanpa mengguncang bed.',
    },
    finish: {
      en: 'Mix gently, then taste for clarity before changing technique next time.',
      id: 'Aduk pelan, lalu nilai kejernihan sebelum mengubah teknik seduhan berikutnya.',
    },
    iced: PAPER_FILTER_ICED,
  },
  april: {
    setup: {
      en: 'Level the bed and center the dripper; this flat brewer works best when flow stays balanced.',
      id: 'Ratakan bed dan posisikan dripper di tengah; flat brewer ini paling stabil saat aliran seimbang.',
    },
    entry: {
      en: 'Wet the bed evenly, then keep the first pause clean and calm.',
      id: 'Basahi bed merata, lalu jaga jeda pertama bersih dan tenang.',
    },
    main: {
      en: 'Pour in centered pulses with a steady height; avoid pushing water to one edge.',
      id: 'Tuang pulse dari tengah dengan tinggi stabil; jangan dorong air ke satu sisi.',
    },
    release: {
      en: 'Let the bed settle flat before the next action or serve.',
      id: 'Biarkan bed kembali rata sebelum aksi berikutnya atau disajikan.',
    },
    finish: {
      en: 'Mix once and serve; the goal is even sweetness, not a heavy finish.',
      id: 'Aduk sekali lalu sajikan; targetnya manis rata, bukan finish yang berat.',
    },
    iced: PAPER_FILTER_ICED,
  },
  melitta: {
    setup: {
      en: 'Fold and seat the trapezoid paper cleanly, then level the bed along the long axis.',
      id: 'Lipat dan pasang paper trapezoid dengan rapi, lalu ratakan bed mengikuti sisi panjang.',
    },
    entry: {
      en: 'Bloom from the center line outward so the narrow bed wakes evenly.',
      id: 'Bloom dari garis tengah ke luar agar bed yang sempit basah merata.',
    },
    main: {
      en: 'Keep pulses compact along the center line; too much edge pouring can flatten sweetness.',
      id: 'Jaga pulse ringkas di garis tengah; terlalu banyak ke tepi bisa menipiskan manis.',
    },
    release: {
      en: 'Let the trapezoid bed drain without scraping the paper.',
      id: 'Biarkan bed trapezoid turun tanpa menggesek paper.',
    },
    finish: {
      en: 'Serve after a gentle mix so the cup does not taste layered.',
      id: 'Sajikan setelah aduk lembut agar cup tidak terasa berlapis.',
    },
    iced: PAPER_FILTER_ICED,
  },
  kono: {
    setup: {
      en: 'Seat the paper tightly and level the bed; Kono rewards a centered, sweet flow.',
      id: 'Pasang paper rapat dan ratakan bed; Kono paling enak dengan aliran tengah yang manis.',
    },
    entry: {
      en: 'Bloom compactly so the lower cone saturates before faster flow begins.',
      id: 'Bloom secara ringkas agar bagian bawah cone jenuh sebelum aliran utama mulai.',
    },
    main: {
      en: 'Pour mostly near the center and open only enough to keep the bed breathing.',
      id: 'Tuang dominan di tengah dan buka secukupnya agar bed tetap bernapas.',
    },
    release: {
      en: 'Let the cone finish cleanly; avoid late turbulence that can roughen the cup.',
      id: 'Biarkan cone selesai bersih; hindari turbulensi akhir yang membuat cup kasar.',
    },
    finish: {
      en: 'Swirl lightly and serve while sweetness is still focused.',
      id: 'Putar ringan dan sajikan saat manis masih fokus.',
    },
    iced: PAPER_FILTER_ICED,
  },
  hario_switch: {
    setup: {
      en: 'Confirm the valve position and chamber load before water goes in.',
      id: 'Pastikan posisi katup dan muatan ruang sebelum air masuk.',
    },
    entry: {
      en: 'Charge the chamber cleanly and keep the bed submerged without aggressive stirring.',
      id: 'Isi ruang dengan bersih dan jaga bed terendam tanpa adukan agresif.',
    },
    main: {
      en: 'During steep, keep the Switch still so immersion extracts evenly.',
      id: 'Saat rendam, biarkan Switch diam agar immersion mengekstrak merata.',
    },
    release: {
      en: 'Open the valve once, then let the water fall without stirring again.',
      id: 'Buka katup sekali, lalu biarkan air turun tanpa aduk ulang.',
    },
    finish: {
      en: 'Serve after the chamber clears and the server is mixed evenly.',
      id: 'Sajikan setelah ruang kosong dan server tercampur rata.',
    },
    iced: {
      setup: {
        en: 'Place ice in the server first and keep chamber load within the safe limit.',
        id: 'Letakkan es di server lebih dulu dan pastikan muatan ruang tetap aman.',
      },
      finish: {
        en: 'Mix the chilled concentrate thoroughly before serving.',
        id: 'Aduk konsentrat dingin sampai rata sebelum disajikan.',
      },
    },
  },
  clever_dripper: {
    setup: {
      en: 'Rinse the paper, close the base on a flat surface, and level the coffee bed.',
      id: 'Bilas paper, tutup dasar di permukaan rata, lalu ratakan bed kopi.',
    },
    entry: {
      en: 'Add water cleanly and saturate all grounds before the steep begins.',
      id: 'Masukkan air dengan bersih dan basahi semua bubuk sebelum rendaman dimulai.',
    },
    main: {
      en: 'Let the steep do the work; extra movement is not needed once the slurry is even.',
      id: 'Biarkan rendaman bekerja; gerakan tambahan tidak perlu setelah slurry rata.',
    },
    release: {
      en: 'Set the Clever on the server and let release separate coffee from grounds.',
      id: 'Letakkan Clever di server dan biarkan fase turun memisahkan kopi dari bubuk.',
    },
    finish: {
      en: 'Remove the brewer, mix the server once, and serve cleanly.',
      id: 'Angkat brewer, aduk server sekali, lalu sajikan bersih.',
    },
    iced: {
      setup: {
        en: 'Put ice in the server and keep the steep water separate from the final beverage volume.',
        id: 'Masukkan es ke server dan pisahkan air rendam dari volume akhir minuman.',
      },
    },
  },
  aeropress: {
    setup: {
      en: 'Rinse the cap filter, lock the parts firmly, and keep the chamber stable.',
      id: 'Bilas filter cap, kunci komponen dengan rapat, dan jaga chamber stabil.',
    },
    entry: {
      en: 'Wet the coffee evenly before the steep timer takes over.',
      id: 'Basahi kopi merata sebelum timer rendaman mengambil alih.',
    },
    main: {
      en: 'Steep calmly; AeroPress gets clarity from even contact, not heavy movement.',
      id: 'Rendam dengan tenang; AeroPress mendapat kejernihan dari kontak merata, bukan gerakan berat.',
    },
    release: {
      en: 'Press with steady pressure and stop before forcing the final hiss.',
      id: 'Tekan dengan tekanan stabil dan berhenti sebelum memaksa hiss terakhir.',
    },
    finish: {
      en: 'Stir the cup or bypass gently only when the recipe calls for it.',
      id: 'Aduk cup atau tambah bypass perlahan hanya bila resep memintanya.',
    },
    iced: {
      finish: {
        en: 'Combine concentrate and ice evenly so the final cup is not top-heavy.',
        id: 'Satukan konsentrat dan es sampai rata agar cup akhir tidak berat di atas.',
      },
    },
  },
  french_press: {
    setup: {
      en: 'Warm the beaker, add coarse coffee, and start with a calm, even charge.',
      id: 'Hangatkan beaker, masukkan kopi kasar, lalu mulai dengan isi air yang tenang dan merata.',
    },
    entry: {
      en: 'Make sure all grounds are wet, then leave the slurry quiet for the steep.',
      id: 'Pastikan semua bubuk basah, lalu biarkan slurry tenang selama rendaman.',
    },
    main: {
      en: 'Keep the steep still; clarity comes from patience and fines settling.',
      id: 'Jaga rendaman tetap diam; kejernihan datang dari sabar dan fines yang mengendap.',
    },
    release: {
      en: 'Plunge slowly to the surface of the grounds, then decant instead of squeezing.',
      id: 'Tekan plunger pelan sampai permukaan ampas, lalu tuang pindah tanpa memeras.',
    },
    finish: {
      en: 'Decant fully so extraction stops and the last cup stays clean.',
      id: 'Pindahkan seluruh kopi agar ekstraksi berhenti dan cup terakhir tetap bersih.',
    },
  },
  espresso: {
    setup: {
      en: 'Dose into a dry basket and keep the puck prep repeatable before locking in.',
      id: 'Masukkan dose ke basket kering dan buat puck prep konsisten sebelum portafilter dikunci.',
    },
    entry: {
      en: 'Distribute evenly, tamp level, and keep the rim clean for a stable seal.',
      id: 'Ratakan distribusi, tamp datar, dan bersihkan bibir basket agar seal stabil.',
    },
    main: {
      en: 'Watch the stream, yield, and time together; this is a starting point, not a shot guarantee.',
      id: 'Pantau aliran, yield, dan waktu bersamaan; ini titik awal, bukan jaminan shot.',
    },
    release: {
      en: 'Stop at the planned yield, then read the stream pattern before changing grind.',
      id: 'Berhenti di yield rencana, lalu baca pola aliran sebelum mengubah grind.',
    },
    finish: {
      en: 'Stir the espresso once before tasting so crema and liquid are balanced.',
      id: 'Aduk espresso sekali sebelum dicicip agar crema dan cairan seimbang.',
    },
  },
  moka_pot: {
    setup: {
      en: 'Fill water below the safety line, add loose coffee, level it gently, and no tamp.',
      id: 'Isi air di bawah batas aman, masukkan kopi longgar, ratakan lembut, dan jangan tamp.',
    },
    entry: {
      en: 'Assemble tightly and start on medium heat so pressure builds smoothly.',
      id: 'Rakit rapat dan mulai dengan panas sedang agar tekanan naik halus.',
    },
    main: {
      en: 'Watch the stream; a steady honey-like flow is the goal.',
      id: 'Pantau aliran; targetnya keluar stabil seperti madu cair.',
    },
    release: {
      en: 'Stop before sputter, then cool the base to protect sweetness.',
      id: 'Hentikan sebelum sputter, lalu dinginkan bagian bawah untuk menjaga manis.',
    },
    finish: {
      en: 'Mix the upper chamber before serving because the first and last liquid differ.',
      id: 'Aduk ruang atas sebelum saji karena cairan awal dan akhir berbeda.',
    },
  },
  siphon: {
    setup: {
      en: 'Secure the filter, preheat evenly, and keep the stand stable before draw-up.',
      id: 'Kunci filter, panaskan merata, dan pastikan stand stabil sebelum air naik.',
    },
    entry: {
      en: 'Let water rise fully before adding coffee, then wet the bed with a brief stir.',
      id: 'Biarkan air naik penuh sebelum kopi masuk, lalu basahi bed dengan adukan singkat.',
    },
    main: {
      en: 'Hold steady heat; siphon clarity depends on stable contact, not boiling hard.',
      id: 'Jaga panas stabil; kejernihan siphon bergantung pada kontak stabil, bukan mendidih keras.',
    },
    release: {
      en: 'Cut heat and let drawdown pull cleanly through the filter.',
      id: 'Matikan panas dan biarkan air turun bersih melewati filter.',
    },
    finish: {
      en: 'Serve after a gentle mix once the lower bowl is complete.',
      id: 'Sajikan setelah aduk lembut saat bowl bawah sudah penuh.',
    },
  },
  cold_brew: {
    setup: {
      en: 'Use coarse coffee and a clean vessel with enough room for full saturation.',
      id: 'Gunakan kopi kasar dan wadah bersih dengan ruang cukup untuk pembasahan penuh.',
    },
    entry: {
      en: 'Add water slowly and fold dry pockets under the surface.',
      id: 'Masukkan air perlahan dan tenggelamkan bagian kering ke bawah permukaan.',
    },
    main: {
      en: 'Steep cold and steady; long contact should stay calm, not stirred repeatedly.',
      id: 'Rendam dingin dan stabil; kontak panjang harus tenang, bukan sering diaduk.',
    },
    release: {
      en: 'Filter gently so sediment stays behind and the concentrate stays clean.',
      id: 'Saring perlahan agar sedimen tertahan dan konsentrat tetap bersih.',
    },
    finish: {
      en: 'Dilute or serve after filtering, then mix before drinking.',
      id: 'Encerkan atau sajikan setelah filtrasi, lalu aduk sebelum diminum.',
    },
  },
  batch_brew: {
    setup: {
      en: 'Level the basket bed and confirm the brewer volume fits the recipe.',
      id: 'Ratakan bed di basket dan pastikan kapasitas brewer sesuai resep.',
    },
    entry: {
      en: 'Let the spray head wet the bed evenly before the main cycle settles in.',
      id: 'Biarkan spray head membasahi bed merata sebelum siklus utama stabil.',
    },
    main: {
      en: 'Monitor basket depth and flow; the machine should distribute water evenly.',
      id: 'Pantau kedalaman basket dan aliran; mesin harus mendistribusikan air merata.',
    },
    release: {
      en: 'Let the brew basket finish dripping before removing it.',
      id: 'Biarkan basket selesai menetes sebelum diangkat.',
    },
    finish: {
      en: 'Mix the batch gently so cups from the first and last pour taste consistent.',
      id: 'Aduk batch perlahan agar cup pertama dan terakhir terasa konsisten.',
    },
  },
};

function resolveWorkflowTutorialLanguage(language?: string): WorkflowTutorialLanguage {
  return language?.toLowerCase().startsWith('id') ? 'id' : 'en';
}

function resolveWorkflowTutorialPhase(actionType: WorkflowGuideActionType): WorkflowTutorialPhase {
  switch (actionType) {
    case 'setup':
    case 'rinse_preheat':
    case 'dose':
    case 'puck_prep':
      return 'setup';
    case 'bloom':
    case 'charge':
    case 'stir':
    case 'swirl':
    case 'heat':
      return 'entry';
    case 'pour':
    case 'steep':
    case 'wait':
    case 'extract':
    case 'monitor_flow':
      return 'main';
    case 'release':
    case 'drawdown':
    case 'press':
    case 'settle':
    case 'filter':
      return 'release';
    case 'stop':
    case 'decant':
    case 'dilute':
    case 'mix':
    case 'serve':
      return 'finish';
    default:
      return 'main';
  }
}

export function resolveWorkflowTutorialDetail(context: WorkflowTutorialContext) {
  const profile = WORKFLOW_TUTORIALS[context.methodFamily] || WORKFLOW_TUTORIALS.v60;
  const phase = resolveWorkflowTutorialPhase(context.actionType);
  const copy = profile.actions?.[context.actionType]
    || (context.brewMode === 'iced' ? profile.iced?.[phase] : undefined)
    || profile[phase]
    || profile.main;
  const language = resolveWorkflowTutorialLanguage(context.language);

  return copy[language].replace(/\s+/g, ' ').trim();
}
