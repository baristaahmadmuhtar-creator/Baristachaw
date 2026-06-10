import type {
  RoastLevel,
} from '../barista-tools/types.ts';
import {
  isResolvedAeroPressStyle,
  resolveAeroPressAutoStyle,
  resolveAeroPressProductionTarget,
} from './aeropressCalibration.ts';
import type {
  AiBrewMethodFamily,
  WorkflowGuideActionType,
  KalitaWaveRecipeStyle,
  CleverDripperRecipeStyle,
  ChemexRecipeStyle,
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
  recipeStyle?: string;
  targetProfileId?: string;
  roastLevel?: RoastLevel;
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
    id: 'Masukkan es ke wadah saji lebih dulu; hamparan kopi hanya menerima air panas yang sudah dihitung.',
  },
  main: {
    en: 'Keep the pour calm and stop at the hot-water target so the ice melt balances the cup.',
    id: 'Jaga tuangan tenang dan berhenti di target air panas agar lelehan es menyeimbangkan cangkir.',
  },
  finish: {
    en: 'Swirl the server briefly so concentrate and melted ice taste even before serving.',
    id: 'Putar wadah saji sebentar agar konsentrat dan es leleh menyatu sebelum disajikan.',
  },
};

const WORKFLOW_TUTORIALS: Record<AiBrewMethodFamily, WorkflowTutorialProfile> = {
  v60: {
    setup: {
      en: 'Rinse the paper filter, preheat the brewer and server, tare the scale, then level the dry bed before the first pour.',
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
      id: 'Bilas filter pada tutup, kunci komponen dengan rapat, dan jaga ruang seduh stabil.',
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
      en: 'Press with steady pressure and follow the active style cue; clarity styles stop earlier, body styles press through.',
      id: 'Tekan dengan tekanan stabil dan ikuti cue gaya aktif; gaya jernih berhenti lebih awal, gaya body menekan sampai selesai.',
    },
    finish: {
      en: 'Stir the cup or bypass gently only when the recipe calls for it.',
      id: 'Aduk cangkir atau tambah air bypass perlahan hanya bila resep memintanya.',
    },
    iced: {
      finish: {
        en: 'Combine concentrate and ice evenly so the final cup is not top-heavy.',
        id: 'Satukan konsentrat dan es sampai rata agar cangkir akhir tidak berat di atas.',
      },
    },
  },
  french_press: {
    setup: {
      en: 'Warm the French Press, add coarse coffee, and start with a calm, even charge.',
      id: 'Hangatkan French Press, masukkan kopi kasar, lalu mulai dengan isi air yang tenang dan merata.',
    },
    entry: {
      en: 'Make sure all grounds are wet, then leave the mixture quiet for the steep.',
      id: 'Pastikan semua bubuk basah, lalu biarkan campuran kopi tenang selama rendaman.',
    },
    main: {
      en: 'Keep the steep still; clarity comes from patience and fines settling.',
      id: 'Jaga rendaman tetap diam; kejernihan datang dari kesabaran dan partikel halus yang mengendap.',
    },
    release: {
      en: 'Plunge slowly to the surface of the grounds, then decant instead of squeezing.',
      id: 'Tekan penekan pelan sampai permukaan ampas, lalu tuang pisah tanpa memeras.',
    },
    finish: {
      en: 'Decant fully so extraction stops and the last cup stays clean.',
      id: 'Tuang pisah seluruh kopi agar ekstraksi berhenti dan cangkir terakhir tetap bersih.',
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
      en: 'Watch the stream, yield, and time together; this is a starting point, not an absolute certainty.',
      id: 'Pantau aliran, hasil ekstraksi, dan waktu bersamaan; ini titik awal, bukan jaminan espresso.',
    },
    release: {
      en: 'Stop at the planned yield, then read the stream pattern before changing grind.',
      id: 'Berhenti di hasil rencana, lalu baca pola aliran sebelum mengubah gilingan.',
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

function normalizeWorkflowTutorialCopy(value: string, language: WorkflowTutorialLanguage) {
  let text = value.replace(/\s+/g, ' ').trim();
  if (language !== 'id') return text;

  const replacements: Array<[RegExp, string]> = [
    [/\bmedium[-\s]?coarse\b/gi, 'sedang cenderung kasar'],
    [/\bmedium[-\s]?fine\b/gi, 'sedang cenderung halus'],
    [/\bfine[-\s]?medium\b/gi, 'halus cenderung sedang'],
    [/\bfine[-\s]?coarse\b/gi, 'halus cenderung kasar'],
    [/\bgilingan medium\b/gi, 'gilingan sedang'],
    [/\bgilingan coarse\b/gi, 'gilingan kasar'],
    [/\bgilingan fine\b/gi, 'gilingan halus'],
    [/\bkopi medium\b/gi, 'kopi gilingan sedang'],
    [/\bkopi coarse\b/gi, 'kopi gilingan kasar'],
    [/\bkopi fine\b/gi, 'kopi gilingan halus'],
    [/\bbleached paper filter\b/gi, 'filter kertas putih'],
    [/\bbleached paper\b/gi, 'filter kertas putih'],
    [/\bbleached filter\b/gi, 'filter kertas putih'],
    [/\bfilter kertas bleached\b/gi, 'filter kertas putih'],
    [/\bkertas bleached\b/gi, 'kertas putih'],
    [/\bupper bowl\b/gi, 'tabung atas'],
    [/\blower bowl\b/gi, 'tabung bawah'],
    [/\bbase bowl\b/gi, 'wadah bawah'],
    [/\bbottom bowl\b/gi, 'tabung bawah'],
    [/\bbowl bawah\b/gi, 'tabung bawah'],
    [/\bbowl dasar\b/gi, 'wadah bawah'],
    [/\bbowl\b/gi, 'wadah'],
    [/\bspout\b/gi, 'cerat'],
    [/\bcue\b/gi, 'petunjuk'],
    [/\bflow rate\b/gi, 'laju aliran'],
    [/\bcontact time\b/gi, 'waktu kontak'],
    [/\bfeedback\b/gi, 'evaluasi rasa'],
    [/\bexact\b/gi, 'presisi'],
    [/\bfallback\b/gi, 'pengganti'],
    [/\bpaper filter\b/gi, 'filter kertas'],
    [/\bfilter cap\b/gi, 'tutup filter'],
    [/\bdry pockets?\b/gi, 'bagian kering'],
    [/\bbrewer\b/gi, 'alat seduh'],
    [/\bspray head\b/gi, 'pancuran mesin'],
    [/\broom temp\b/gi, 'suhu ruang'],
    [/\bpre-wet\b/gi, 'basahi awal'],
    [/\bpaper\b/gi, 'kertas'],
    [/\bbed\b/gi, 'hamparan kopi'],
    [/\bdripper\b/gi, 'alat seduh'],
    [/\bserver\b/gi, 'wadah saji'],
    [/\bdrawdown\b/gi, 'fase turun'],
    [/\bcarafe\b/gi, 'teko kaca'],
    [/\ba large dose of medium grounds, and\b/gi, 'bubuk kopi dosis besar gilingan medium, lalu'],
    [/\bgrounds\b/gi, 'bubuk kopi'],
    [/\bpreheat\b/gi, 'hangatkan'],
    [/\bglass\b/gi, 'kaca'],
    [/\bclay-blue\b/gi, 'keramik'],
    [/\byield\b/gi, 'hasil ekstraksi'],
    [/\bshot\b/gi, 'ekstraksi espresso'],
    [/\bgrind\b/gi, 'gilingan'],
    [/\bmouthfeel\b/gi, 'sensasi mulut'],
    [/\bacidity\b/gi, 'keasaman'],
    [/\bpulses\b/gi, 'tuangan bertahap'],
    [/\bpulse\b/gi, 'tuangan bertahap'],
    [/\bspray head\b/gi, 'pancuran mesin'],
    [/\bspray\b/gi, 'semprotan'],
    [/\bcarafe\b/gi, 'wadah saji'],
    [/\bflow\b/gi, 'aliran'],
    [/\bstream\b/gi, 'aliran'],
    [/\bdrain\b/gi, 'tiris'],
    [/\bdrips\b/gi, 'tetesan'],
    [/\bdrip\b/gi, 'tetes'],
    [/\bBloom\b/g, 'Lakukan blooming'],
    [/\bbloom\b/g, 'blooming'],
    [/\bdose\b/gi, 'dosis'],
    [/\bload\b/gi, 'masukkan'],
    [/\bsec\b/gi, 'detik'],
    [/\bslurry\b/gi, 'campuran kopi'],
    [/\bflutes\b/gi, 'lekukan'],
    [/\bribs?\b/gi, 'alur'],
    [/\bflat-bottom\b/gi, 'alas datar'],
    [/\bwave\b/gi, 'berlipat'],
    [/\bcone\b/gi, 'kerucut'],
    [/\bpuck\b/gi, 'lapisan kopi'],
    [/\bchamber\b/gi, 'ruang seduh'],
    [/\bhiss\b/gi, 'desis'],
    [/\bnatural\b/gi, 'alami'],
    [/\bmesh\b/gi, 'saringan'],
    [/\bplunger\b/gi, 'penekan'],
    [/\u00c2°C/g, '°C'],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  return text
    .replace(/\b([\p{L}]{2,})\s+\1\b/giu, '$1')
    .replace(/\s+/g, ' ')
    .trim();
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

function resolveProfileTutorialCopy(
  profile: WorkflowTutorialProfile,
  context: WorkflowTutorialContext,
  phase: WorkflowTutorialPhase,
) {
  return profile.actions?.[context.actionType]
    || (context.brewMode === 'iced' ? profile.iced?.[phase] : undefined)
    || profile[phase]
    || profile.main;
}

function formatAeroPressStirCountEn(value: string) {
  return value.replace(/x$/i, ' times');
}

function formatAeroPressStirCountId(value: string) {
  return value.replace(/x$/i, ' kali');
}

function resolveAeroPressShortTargetCue(targetProfileId?: string) {
  switch (targetProfileId) {
    case 'more_acidity':
      return { en: 'keep acidity bright', id: 'menjaga keasaman tetap cerah' };
    case 'floral_transparent':
      return { en: 'protect floral clarity', id: 'menjaga floral dan kejernihan' };
    case 'fruit_forward':
      return { en: 'protect fruit aromatics', id: 'menjaga aroma buah' };
    case 'more_sweetness':
      return { en: 'build sweetness', id: 'membangun rasa manis' };
    case 'soft_round':
      return { en: 'keep sweetness round', id: 'menjaga manis tetap bulat' };
    case 'more_body':
      return { en: 'build body and texture', id: 'membangun body dan tekstur' };
    case 'dense_comforting':
      return { en: 'build dense body', id: 'membangun body padat' };
    case 'balance_clean':
    default:
      return { en: 'keep balance clean', id: 'menjaga seimbang dan bersih' };
  }
}

function resolveAeroPressShortRoastCue(roastLevel?: RoastLevel) {
  switch (roastLevel) {
    case 'light':
    case 'medium_light':
      return { en: 'light roast needs enough heat', id: 'roast terang perlu suhu cukup' };
    case 'medium_dark':
      return { en: 'medium-dark roast needs lower heat', id: 'roast medium-dark perlu suhu rendah' };
    case 'dark':
      return { en: 'dark roast needs lower heat and gentle pressure', id: 'roast gelap perlu suhu rendah dan tekanan lembut' };
    case 'medium':
    default:
      return { en: 'medium roast baseline', id: 'roast medium baseline' };
  }
}

function resolveContextualAeroPressTutorialCopy(
  context: WorkflowTutorialContext,
  fallback: WorkflowTutorialCopy,
): WorkflowTutorialCopy {
  if (!context.targetProfileId && !context.roastLevel) return fallback;
  const style = isResolvedAeroPressStyle(context.recipeStyle)
    ? context.recipeStyle
    : resolveAeroPressAutoStyle(context.targetProfileId);
  const calibration = resolveAeroPressProductionTarget(style, context.targetProfileId, context.roastLevel);
  const stirEn = formatAeroPressStirCountEn(calibration.stirCount);
  const stirId = formatAeroPressStirCountId(calibration.stirCount);
  const targetCue = resolveAeroPressShortTargetCue(context.targetProfileId);
  const roastCue = resolveAeroPressShortRoastCue(context.roastLevel);
  switch (context.actionType) {
    case 'stir':
      return {
        en: `Stir ${stirEn} to ${targetCue.en}; avoid extra agitation.`,
        id: `Aduk ${stirId} untuk ${targetCue.id}; hindari agitasi tambahan.`,
      };
    case 'steep':
      return {
        en: `Hold the steep to ${targetCue.en}.`,
        id: `Tahan rendaman untuk ${targetCue.id}.`,
      };
    case 'wait':
      return {
        en: `Flip the inverted AeroPress safely after the steep; ${roastCue.en}.`,
        id: `Balikkan AeroPress terbalik dengan aman setelah rendaman; ${roastCue.id}.`,
      };
    case 'press':
      return {
        en: `Press with gentle pressure to ${targetCue.en}; ${roastCue.en}.`,
        id: `Tekan lembut untuk ${targetCue.id}; ${roastCue.id}.`,
      };
    case 'stop':
      return {
        en: `Stop before the dry hiss; ${roastCue.en}.`,
        id: `Berhenti sebelum desis kering; ${roastCue.id}.`,
      };
    case 'dilute':
      return {
        en: 'Add measured bypass only after pressing.',
        id: 'Tambahkan bypass terukur hanya setelah tekan.',
      };
    case 'serve':
      return {
        en: 'Mix the cup, then serve.',
        id: 'Aduk cangkir, lalu sajikan.',
      };
    case 'rinse_preheat':
    case 'charge':
    default:
      return fallback;
  }
}

function resolveFrenchPressShortTargetCue(targetProfileId?: string) {
  switch (targetProfileId) {
    case 'more_body':
      return { en: 'build a heavy, syrupy texture', id: 'membangun tekstur berat seperti sirup' };
    case 'more_sweetness':
      return { en: 'extract deep, viscous sweetness', id: 'mengekstrak rasa manis pekat dan kental' };
    case 'floral_transparent':
      return { en: 'protect delicate floral clarity', id: 'melindungi kejernihan floral yang lembut' };
    case 'fruit_forward':
      return { en: 'elevate vibrant fruit notes', id: 'mengangkat profil buah yang cerah' };
    case 'more_acidity':
      return { en: 'preserve bright structural acidity', id: 'mempertahankan keasaman terstruktur yang cerah' };
    case 'soft_round':
      return { en: 'create a smooth, rounded mouthfeel', id: 'menciptakan sensasi mulut yang halus dan bulat' };
    case 'dense_comforting':
      return { en: 'build a dense, comforting profile', id: 'membangun profil padat yang menenangkan' };
    case 'balance_clean':
    default:
      return { en: 'maintain absolute structural balance', id: 'mempertahankan keseimbangan struktural absolut' };
  }
}

function resolveFrenchPressShortRoastCue(roastLevel?: RoastLevel) {
  switch (roastLevel) {
    case 'light':
    case 'medium_light':
      return { en: 'maximize thermal mass for light roasts', id: 'maksimalkan massa termal untuk sangrai terang' };
    case 'medium_dark':
      return { en: 'manage extraction cautiously for medium-dark', id: 'kelola ekstraksi secara hati-hati untuk medium-gelap' };
    case 'dark':
      return { en: 'minimize agitation to prevent dark roast harshness', id: 'minimalkan agitasi untuk mencegah kepahitan sangrai gelap' };
    case 'medium':
    default:
      return { en: 'hold steady parameters for medium roast', id: 'tahan parameter stabil untuk sangrai medium' };
  }
}

function resolveContextualFrenchPressTutorialCopy(
  context: WorkflowTutorialContext,
  fallback: WorkflowTutorialCopy,
): WorkflowTutorialCopy {
  if (!context.targetProfileId && !context.roastLevel) return fallback;
  
  const targetCue = resolveFrenchPressShortTargetCue(context.targetProfileId);
  const roastCue = resolveFrenchPressShortRoastCue(context.roastLevel);
  
  switch (context.actionType) {
    case 'stir':
      return {
        en: `Agitate precisely to ${targetCue.en}; ${roastCue.en}.`,
        id: `Agitasi secara presisi untuk ${targetCue.id}; ${roastCue.id}.`,
      };
    case 'steep':
      return {
        en: `Maintain undisturbed immersion to ${targetCue.en}.`,
        id: `Pertahankan imersi tanpa gangguan untuk ${targetCue.id}.`,
      };
    case 'settle':
      return {
        en: `Break the crust decisively to ${targetCue.en}; remove excess foam if necessary.`,
        id: `Pecah kerak secara tegas untuk ${targetCue.id}; angkat busa berlebih jika perlu.`,
      };
    case 'decant':
      return {
        en: `Decant with absolute control to ${targetCue.en}; leave the silty sludge behind.`,
        id: `Tuang dengan kontrol mutlak untuk ${targetCue.id}; tinggalkan endapan lumpur di dasar.`,
      };
    case 'rinse_preheat':
    case 'charge':
    case 'wait':
    case 'serve':
    default:
      return fallback;
  }
}

const FRENCH_PRESS_STYLE_TUTORIALS: Record<string, WorkflowTutorialProfile> = {
  auto: {
    setup: {
      en: 'Auto Traditional calculates the precise immersion lane based on target, dose, roast, and water chemistry; preheat the vessel thoroughly.',
      id: 'Auto Tradisional mengalkulasi jalur imersi presisi berdasarkan target, dosis, profil sangrai, dan kimia air; panaskan bejana secara menyeluruh.',
    },
    entry: {
      en: 'Charge the full volume of water aggressively to ensure instantaneous saturation across the coffee bed.',
      id: 'Tuangkan seluruh volume air dengan agresif untuk memastikan saturasi instan di seluruh hamparan kopi.',
    },
    main: {
      en: 'Allow the extraction to progress via quiet diffusion; undisturbed thermal retention is the foundation of French Press clarity.',
      id: 'Biarkan ekstraksi berproses melalui difusi tenang; retensi termal tanpa gangguan adalah fondasi kejernihan French Press.',
    },
    release: {
      en: 'Lower the mesh just below the liquid surface without compressing the grounds; floating the plunger protects the settled fines.',
      id: 'Turunkan jaring tepat di bawah permukaan cairan tanpa menekan bubuk; mengapungkan plunger melindungi sedimen halus.',
    },
    finish: {
      en: 'Decant immediately to halt extraction; evaluate the lipid and sediment carryover against your chosen mesh.',
      id: 'Tuang pisah segera untuk menghentikan ekstraksi; evaluasi bawaan lipid dan sedimen terhadap jaring yang dipilih.',
    },
    actions: {}
  },
  traditional: {
    setup: {
      en: 'Preheat the French Press rigorously, discard the thermal charge, and dose coarse, uniform grounds for classic full-immersion extraction.',
      id: 'Panaskan French Press secara ketat, buang air pemanas, dan masukkan gilingan kasar seragam untuk ekstraksi imersi penuh klasik.',
    },
    entry: {
      en: 'Execute a rapid, high-turbulence pour to force all grounds into immediate contact with the brewing water.',
      id: 'Eksekusi tuangan cepat dengan turbulensi tinggi untuk memaksa semua bubuk kopi langsung berkontak dengan air seduh.',
    },
    main: {
      en: 'Secure the lid to trap heat and strictly avoid secondary agitation; profound sweetness relies on a completely static steeping phase.',
      id: 'Pasang tutup rapat untuk menahan panas dan hindari agitasi sekunder; rasa manis mendalam bergantung pada fase rendaman yang sepenuhnya statis.',
    },
    release: {
      en: 'Execute a gentle crust break, skim the astringent foam layer, and apply zero downward force on the bottom sediment.',
      id: 'Pecah kerak dengan lembut, angkat lapisan busa sepat, dan jangan berikan tekanan ke bawah pada sedimen dasar.',
    },
    finish: {
      en: 'Decant with absolute immediacy into a clean serving vessel; leaving coffee in the press causes severe over-extraction.',
      id: 'Tuang pisah seketika ke dalam bejana saji bersih; membiarkan kopi di alat menyebabkan ekstraksi berlebih.',
    },
    actions: {}
  },
  clean_decant: {
    setup: {
      en: 'Preheat the press and stage a secondary decanting vessel; the Hoffmann method prioritizes gravitational settling over mechanical filtration.',
      id: 'Panaskan alat dan siapkan bejana tuang kedua; metode Hoffmann mengutamakan pengendapan gravitasi dibanding filtrasi mekanis.',
    },
    entry: {
      en: 'Saturate the grounds swiftly with a turbulent pour, then immediately cease all movement to initiate the settling phase.',
      id: 'Saturasi bubuk dengan cepat melalui tuangan turbulen, lalu segera hentikan semua gerakan untuk memulai fase pengendapan.',
    },
    main: {
      en: 'Following the initial steep, execute a delicate crust break and allow several minutes of complete stillness for maximum clarity.',
      id: 'Setelah rendaman awal, eksekusi pemecahan kerak yang halus dan biarkan diam total selama beberapa menit untuk kejernihan maksimal.',
    },
    release: {
      en: 'Rest the plunger squarely at the meniscus layer; plunging forces microscopic fines back into suspension.',
      id: 'Istirahatkan plunger tepat di lapisan meniskus; menekan akan memaksa partikel mikroskopis kembali tersuspensi.',
    },
    finish: {
      en: 'Execute an excruciatingly slow decant, leaving the final silty sludge trapped in the brewing chamber.',
      id: 'Eksekusi tuangan yang sangat lambat, meninggalkan endapan lumpur akhir terperangkap di dalam bilik seduh.',
    },
    actions: {}
  },
  double_filter: {
    setup: {
      en: 'Preheat the brewer, rinse the supplementary paper filter meticulously, and align it perfectly to ensure vertical plunger travel.',
      id: 'Panaskan alat, bilas filter kertas tambahan secara teliti, dan sejajarkan dengan sempurna untuk memastikan pergerakan plunger vertikal.',
    },
    entry: {
      en: 'Saturate the bed comprehensively; a high-fines grind distribution will catastrophically clog the paper matrix.',
      id: 'Saturasi hamparan secara menyeluruh; distribusi gilingan dengan fines tinggi akan menyumbat matriks kertas secara fatal.',
    },
    main: {
      en: 'Maintain a calm, compact steep. The added paper radically increases hydrodynamic resistance, demanding tightly controlled agitation.',
      id: 'Pertahankan rendaman yang tenang dan padat. Kertas tambahan secara radikal meningkatkan resistensi hidrodinamik, menuntut agitasi yang dikontrol ketat.',
    },
    release: {
      en: 'Apply incredibly light, continuous force for 45-60 seconds; aggressive pressure will bypass or tear the paper filter.',
      id: 'Berikan tenaga sangat ringan dan berkelanjutan selama 45-60 detik; tekanan agresif akan membypass atau merobek filter kertas.',
    },
    finish: {
      en: 'Decant the exceptionally clean yield; paper filtration aggressively strips diterpenes and insoluble sediment from the final cup.',
      id: 'Tuang hasil seduhan yang luar biasa bersih; filtrasi kertas melucuti diterpena dan sedimen tidak larut dari cangkir akhir secara agresif.',
    },
    actions: {}
  },
  heavy_concentrate: {
    setup: {
      en: 'Preheat intensely and ensure adequate volumetric headroom; this protocol is engineered for massive dose strength and structural density.',
      id: 'Panaskan secara intensif dan pastikan ruang volumetrik memadai; protokol ini direkayasa untuk dosis masif dan kepadatan struktural.',
    },
    entry: {
      en: 'Blast the water over the massive dose and execute 5-6 vigorous stirs to violently eradicate all dry pockets.',
      id: 'Hentakkan air ke atas dosis masif dan eksekusi 5-6 adukan kuat untuk menghancurkan semua ruang kering dengan keras.',
    },
    main: {
      en: 'Steep extensively to construct a colossal, chocolate-toned body, but strictly prohibit late-stage agitation.',
      id: 'Rendam secara ekstensif untuk membangun body kolosal bernuansa cokelat, tetapi larang keras agitasi di tahap akhir.',
    },
    release: {
      en: 'Enforce a brief settling phase prior to pressing; plunging a chaotic suspension generates severe astringency.',
      id: 'Terapkan fase pengendapan singkat sebelum menekan; menekan suspensi kacau akan menghasilkan rasa sepat yang parah.',
    },
    finish: {
      en: 'Decant as a pure concentrate designed for milk integration or precise dilution, then rigorously log the final TDS.',
      id: 'Tuang sebagai konsentrat murni yang dirancang untuk integrasi susu atau dilusi presisi, lalu catat TDS akhir secara ketat.',
    },
    actions: {}
  },
  sweet_immersion: {
    setup: {
      en: 'Preheat the brewer and deploy a lowered thermal target with extremely uniform coarse grounds to engineer a plush, delicate profile.',
      id: 'Panaskan alat dan terapkan suhu yang diturunkan dengan gilingan kasar sangat seragam untuk merekayasa profil empuk dan halus.',
    },
    entry: {
      en: 'Execute a laminar, gentle pour followed by exactly two stirs; the objective is total saturation without destructive turbulence.',
      id: 'Eksekusi tuangan laminar yang lembut diikuti tepat dua adukan; tujuannya adalah saturasi total tanpa turbulensi destruktif.',
    },
    main: {
      en: 'Enforce absolute stillness during the steep; this maximizes carbohydrate extraction while suppressing late-stage tannins.',
      id: 'Terapkan keheningan mutlak selama rendaman; ini memaksimalkan ekstraksi karbohidrat sambil menekan tanin tahap akhir.',
    },
    release: {
      en: 'Apply near-zero downward force; allow the metal mesh to shepherd the grounds downward without compressing the bed.',
      id: 'Berikan tenaga dorong mendekati nol; biarkan jaring logam menggiring bubuk ke bawah tanpa memadatkan hamparan.',
    },
    finish: {
      en: 'Decant instantaneously to capture the rounded sweetness before continuous immersion pulls woody bitterness into the cup.',
      id: 'Tuang secara instan untuk menangkap rasa manis bulat sebelum imersi berkelanjutan menarik rasa pahit kayu ke dalam cangkir.',
    },
    actions: {}
  },
};

const AEROPRESS_STYLE_TUTORIALS: Record<string, WorkflowTutorialProfile> = {
  standard: {
    setup: {
      en: 'Rinse the paper filter, lock the cap, place the chamber upright on the cup, and tare before dosing.',
      id: 'Bilas filter kertas, kunci tutup, posisikan ruang seduh tegak di atas cangkir, lalu tara sebelum dosis.',
    },
    entry: {
      en: 'Add water decisively so every ground is wet before the short steep begins.',
      id: 'Tuang air dengan mantap sampai semua bubuk basah sebelum rendaman singkat dimulai.',
    },
    main: {
      en: 'Stir three calm strokes, seal with the plunger, and let the coffee steep without extra movement.',
      id: 'Aduk tiga gerakan tenang, segel dengan penekan, lalu biarkan kopi merendam tanpa gerakan tambahan.',
    },
    release: {
      en: 'Press smoothly for 20-30 seconds and stop before the dry hiss for a clean balanced cup.',
      id: 'Tekan halus 20-30 detik dan berhenti sebelum desis kering untuk cangkir seimbang yang bersih.',
    },
    finish: {
      en: 'Swirl the cup once so the short immersion tastes even.',
      id: 'Putar cangkir sekali agar hasil rendaman singkat terasa rata.',
    },
    actions: {
      stir: {
        en: 'Stir three calm strokes or use one light swirl, then stop agitation before the steep.',
        id: 'Aduk tiga gerakan tenang atau putar ringan sekali, lalu hentikan agitasi sebelum rendaman.',
      },
      steep: {
        en: 'Seal with the plunger and let the short upright steep finish without extra movement.',
        id: 'Segel dengan penekan dan biarkan rendaman singkat tegak selesai tanpa gerakan tambahan.',
      },
      stop: {
        en: 'Stop before the dry hiss and lift the AeroPress away so the final pressure does not roughen the cup.',
        id: 'Berhenti sebelum desis kering dan angkat AeroPress agar tekanan akhir tidak membuat cangkir kasar.',
      },
      serve: {
        en: 'Swirl the cup once and serve the short immersion while it tastes even.',
        id: 'Putar cangkir sekali lalu sajikan hasil rendaman singkat saat rasanya sudah rata.',
      },
    },
  },
  inverted: {
    setup: {
      en: 'Assemble the inverted chamber on a level surface, rinse the filter cap, and check the plunger seal.',
      id: 'Rakit ruang seduh terbalik di permukaan rata, bilas tutup filter, dan pastikan penekan masuk minimal 2 cm.',
    },
    entry: {
      en: 'Add water steadily and wet the coffee edge to edge while the brewer stays stable.',
      id: 'Tuang air stabil dan basahi kopi dari tepi ke tepi sambil menjaga alat tetap tegak.',
    },
    main: {
      en: 'Stir four times, fasten the cap, steep calmly, then flip onto the cup in one confident motion.',
      id: 'Aduk empat kali, pasang tutup, rendam tenang, lalu balikkan ke cangkir dalam satu gerakan mantap.',
    },
    release: {
      en: 'Press slowly for 20-30 seconds and stop before the dry hiss, keeping the cup and chamber aligned.',
      id: 'Tekan perlahan 20-30 detik dan berhenti sebelum desis kering sambil menjaga cangkir dan ruang seduh sejajar.',
    },
    finish: {
      en: 'Serve the full-immersion cup while the sweet aromatics are still fresh.',
      id: 'Sajikan hasil rendaman penuh selagi aroma manisnya masih segar.',
    },
    actions: {
      stir: {
        en: 'Stir four times, fasten the cap, and keep the inverted brewer steady before the flip.',
        id: 'Aduk empat kali, pasang tutup, dan jaga alat terbalik tetap stabil sebelum dibalik.',
      },
      steep: {
        en: 'Steep calmly in the inverted chamber until the planned flip time.',
        id: 'Rendam tenang dalam posisi terbalik sampai waktu balik yang direncanakan.',
      },
      wait: {
        en: 'Flip onto the cup in one steady motion while holding the cap and chamber together.',
        id: 'Balikkan ke atas cangkir dalam satu gerakan stabil sambil menahan tutup dan ruang seduh.',
      },
      stop: {
        en: 'Stop before the dry hiss, then remove the brewer without shaking the spent coffee.',
        id: 'Berhenti sebelum desis kering, lalu angkat alat tanpa mengguncang ampas kopi.',
      },
      serve: {
        en: 'Serve the full-immersion cup after the flip and press are complete.',
        id: 'Sajikan hasil rendaman penuh setelah fase balik dan tekan selesai.',
      },
    },
  },
  bypass: {
    setup: {
      en: 'Prepare an upright AeroPress and keep measured bypass water separate until after pressing.',
      id: 'Siapkan AeroPress tegak dan pisahkan air bypass terukur sampai fase tekan selesai.',
    },
    entry: {
      en: 'Use the planned concentrate water only; do not push bypass water through the coffee layer.',
      id: 'Gunakan air konsentrat sesuai rencana; jangan dorong air bypass melewati lapisan kopi.',
    },
    main: {
      en: 'Stir three times and steep briefly so the concentrate stays sweet and clear.',
      id: 'Aduk tiga kali dan rendam singkat agar konsentrat tetap manis dan jernih.',
    },
    release: {
      en: 'Press the concentrate steadily for 20-30 seconds and stop before the dry hiss.',
      id: 'Tekan konsentrat stabil 20-30 detik dan berhenti sebelum desis kering.',
    },
    finish: {
      en: 'Add the measured bypass water after pressing only, mix the cup, then serve.',
      id: 'Tambahkan air bypass terukur hanya setelah tekan, aduk cangkir, lalu sajikan.',
    },
    actions: {
      stir: {
        en: 'Stir the concentrate lightly 2-3 strokes, then leave the coffee calm until pressing.',
        id: 'Aduk konsentrat ringan 2-3 kali, lalu biarkan kopi tenang sampai ditekan.',
      },
      steep: {
        en: 'Steep the concentrate briefly so it stays clear before the press.',
        id: 'Rendam konsentrat secara singkat agar tetap jernih sebelum ditekan.',
      },
      stop: {
        en: 'Stop before the dry hiss; this ends the press before any bypass water is added.',
        id: 'Berhenti sebelum desis kering; ini mengakhiri fase tekan sebelum air bypass ditambahkan.',
      },
      dilute: {
        en: 'Add the measured bypass water after pressing only, mix the cup evenly, then serve.',
        id: 'Tambahkan air bypass terukur hanya setelah tekan, aduk cangkir sampai rata, lalu sajikan.',
      },
      serve: {
        en: 'Serve after the concentrate and measured bypass water are fully mixed.',
        id: 'Sajikan setelah konsentrat dan air bypass terukur tercampur rata.',
      },
    },
  },
  no_bypass: {
    setup: {
      en: 'Set up upright and confirm the full recipe water will go into the chamber.',
      id: 'Siapkan posisi tegak dan pastikan seluruh air resep masuk ke ruang seduh.',
    },
    entry: {
      en: 'Add all recipe water to the chamber and wet the coffee fully at once.',
      id: 'Tuang seluruh air resep ke ruang seduh dan basahi kopi penuh sekaligus.',
    },
    main: {
      en: 'Stir three gentle strokes, seal, and steep longer for a complete single-volume extraction.',
      id: 'Aduk tiga gerakan lembut, segel, dan rendam lebih lama untuk ekstraksi satu volume yang utuh.',
    },
    release: {
      en: 'Press slowly for 25-35 seconds and stop before the dry hiss so the full chamber volume stays clean.',
      id: 'Tekan perlahan 25-35 detik dan berhenti sebelum desis kering agar seluruh volume ruang seduh tetap bersih.',
    },
    finish: {
      en: 'Serve without extra water so the cup reflects the full chamber extraction.',
      id: 'Sajikan tanpa air tambahan agar cangkir mencerminkan ekstraksi penuh dari ruang seduh.',
    },
    actions: {
      stir: {
        en: 'Stir three gentle strokes, seal, and let the coffee settle before the longer steep.',
        id: 'Aduk tiga gerakan lembut, segel, lalu biarkan kopi tenang sebelum rendaman lebih panjang.',
      },
      steep: {
        en: 'Steep longer so the single full-water volume extracts evenly before pressing.',
        id: 'Rendam lebih lama agar satu volume air penuh mengekstrak merata sebelum ditekan.',
      },
      stop: {
        en: 'Stop before the dry hiss so the full chamber extraction stays clean without added water.',
        id: 'Berhenti sebelum desis kering agar ekstraksi penuh tetap bersih tanpa air tambahan.',
      },
      serve: {
        en: 'Serve without extra water after the full chamber press is complete.',
        id: 'Sajikan tanpa air tambahan setelah tekanan ruang seduh penuh selesai.',
      },
    },
  },
  bright_clean: {
    setup: {
      en: 'Use a clean paper-filter seal and low-agitation setup for a clear cup.',
      id: 'Gunakan segel filter kertas yang rapi dan persiapan rendah agitasi untuk cangkir jernih.',
    },
    entry: {
      en: 'Add water quickly and evenly so the coffee wets fully without heavy movement.',
      id: 'Tuang air cepat dan merata agar kopi basah penuh tanpa gerakan berat.',
    },
    main: {
      en: 'Stir only 2-3 light strokes and keep the steep short to protect clarity.',
      id: 'Aduk ringan 2-3 kali saja dan jaga rendaman singkat untuk melindungi kejernihan.',
    },
    release: {
      en: 'Press lightly for 20-30 seconds and stop before the first dry hiss.',
      id: 'Tekan ringan 20-30 detik dan berhenti sebelum desis kering pertama.',
    },
    finish: {
      en: 'Swirl once and serve a clean, bright cup without extra water.',
      id: 'Putar sekali lalu sajikan cangkir bersih dan cerah tanpa air tambahan.',
    },
    actions: {
      stir: {
        en: 'Stir only 2-3 light strokes, then stop agitation to protect clarity.',
        id: 'Aduk ringan 2-3 kali saja, lalu hentikan agitasi untuk menjaga kejernihan.',
      },
      steep: {
        en: 'Keep the steep short and calm so clarity stays ahead of body.',
        id: 'Jaga rendaman singkat dan tenang agar kejernihan tetap lebih dominan dari body.',
      },
      stop: {
        en: 'Stop at the first dry hiss cue before late pressure clouds the finish.',
        id: 'Berhenti pada cue desis kering pertama sebelum tekanan akhir mengeruhkan hasil.',
      },
      serve: {
        en: 'Swirl once and serve the clean AeroPress cup without extra water.',
        id: 'Putar sekali lalu sajikan cangkir AeroPress jernih tanpa air tambahan.',
      },
    },
  },
  sweet_body: {
    setup: {
      en: 'Preheat the chamber, rinse the filter cap, and prepare for a sweeter, heavier texture.',
      id: 'Hangatkan ruang seduh, bilas tutup filter, dan siapkan tekstur yang lebih manis dan tebal.',
    },
    entry: {
      en: 'Add water evenly and make sure the coffee is fully saturated before agitation.',
      id: 'Tuang air merata dan pastikan kopi basah penuh sebelum agitasi.',
    },
    main: {
      en: 'Stir five full strokes, seal, and steep longer to build sweetness and body.',
      id: 'Aduk penuh lima kali, segel, dan rendam lebih lama untuk membangun manis dan tekstur.',
    },
    release: {
      en: 'Press slowly for 25-35 seconds near the hiss; stop before the finish turns dry, gritty, or bitter.',
      id: 'Tekan perlahan 25-35 detik mendekati desis; berhenti sebelum akhir rasa berubah kering, berpasir, atau pahit.',
    },
    finish: {
      en: 'Mix the cup gently and serve a dense, sweet AeroPress without extra water.',
      id: 'Aduk cangkir pelan dan sajikan AeroPress tebal-manis tanpa air tambahan.',
    },
    actions: {
      stir: {
        en: 'Stir five full strokes to build sweetness and body, then let the coffee settle before pressing.',
        id: 'Aduk penuh lima kali untuk membangun manis dan tekstur, lalu biarkan kopi tenang sebelum ditekan.',
      },
      steep: {
        en: 'Steep longer so sweetness and body build before the slow press.',
        id: 'Rendam lebih lama agar manis dan tekstur terbentuk sebelum tekanan pelan.',
      },
      stop: {
        en: 'Stop near the hiss before extra pressure makes the finish dry, gritty, or bitter.',
        id: 'Berhenti mendekati desis sebelum tekanan tambahan membuat akhir rasa kering, berpasir, atau pahit.',
      },
      serve: {
        en: 'Mix the cup gently and serve the dense, sweet AeroPress without extra water.',
        id: 'Aduk cangkir pelan lalu sajikan AeroPress tebal-manis tanpa air tambahan.',
      },
    },
  },
};

const SWITCH_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {

  hybrid_bright_clean: {
    setup: {
      en: 'Ensure the valve is closed and pre-wet the filter to wash away papery notes.',
      id: 'Pastikan katup tertutup dan basahi filter untuk membuang aroma kertas.'
    },
    entry: {
      en: 'Bloom with the valve closed to trap aromatics and saturate the bed fully.',
      id: 'Lakukan blooming dengan katup tertutup untuk menjebak aromatik dan membasahi kopi seutuhnya.'
    },
    main: {
      en: 'Open the valve and pour aggressively to lift the bed and drive bright acidity.',
      id: 'Buka katup dan tuang secara agresif untuk mengangkat kopi dan mendorong keasaman yang cerah.'
    },
    release: {
      en: 'Allow the percolation to drain completely through the filter.',
      id: 'Biarkan perkolasi meniris sepenuhnya melewati filter.'
    },
    finish: {
      en: 'Serve a clean, vibrant cup with pronounced acidity.',
      id: 'Sajikan seduhan yang bersih, ceria, dengan keasaman yang tegas.'
    }
  },
  immersion_sweet: {
    setup: {
      en: 'Lock the valve securely; we are maximizing contact time for sweetness.',
      id: 'Kunci katup dengan rapat; kita akan memaksimalkan waktu kontak demi rasa manis.'
    },
    entry: {
      en: 'Pour the full volume gently to submerge the bed without excessive turbulence.',
      id: 'Tuang seluruh volume dengan lembut untuk menenggelamkan kopi tanpa turbulensi berlebih.'
    },
    main: {
      en: 'Steep patiently; the long immersion extracts deep sugars.',
      id: 'Rendam dengan sabar; imersi yang panjang akan mengekstrak gula yang dalam.'
    },
    release: {
      en: 'Open the valve and let gravity pull the sweet liquor down.',
      id: 'Buka katup dan biarkan gravitasi menarik cairan manis ke bawah.'
    },
    finish: {
      en: 'Swirl to integrate the syrupy extraction before serving.',
      id: 'Putar perlahan untuk menyatukan ekstraksi yang kental sebelum disajikan.'
    }
  },
  immersion_heavy_body: {
    setup: {
      en: 'Keep the valve closed and prepare for a dense, full-immersion brew.',
      id: 'Biarkan katup tertutup dan bersiaplah untuk seduhan imersi penuh yang pekat.'
    },
    entry: {
      en: 'Add water quickly and stir vigorously to maximize initial extraction.',
      id: 'Tambahkan air dengan cepat dan aduk kuat untuk memaksimalkan ekstraksi awal.'
    },
    main: {
      en: 'Maintain the steep; the suspended particles will build a heavy mouthfeel.',
      id: 'Pertahankan rendaman; partikel yang tersuspensi akan membangun sensasi mulut yang berat.'
    },
    release: {
      en: 'Release the valve, filtering out only the largest particles.',
      id: 'Buka katup, menyaring hanya partikel-partikel terbesar.'
    },
    finish: {
      en: 'Enjoy a robust, heavy-bodied cup with intense flavor.',
      id: 'Nikmati secangkir kopi ber-body berat, kokoh, dengan rasa yang intens.'
    }
  },
  v60_mode: {
    setup: {
      en: 'Leave the valve open; treat the Switch strictly as a standard V60 dripper.',
      id: 'Biarkan katup terbuka; perlakukan Switch murni sebagai alat seduh V60 standar.'
    },
    entry: {
      en: 'Pour a traditional bloom, allowing gases to escape freely through the open bottom.',
      id: 'Tuang blooming tradisional, biarkan gas keluar bebas lewat celah bawah yang terbuka.'
    },
    main: {
      en: 'Pour in concentric circles to maintain a steady percolation rate.',
      id: 'Tuang dalam lingkaran konsentris untuk mempertahankan laju perkolasi yang stabil.'
    },
    release: {
      en: 'Wait for the continuous drawdown to finish without any immersion hold.',
      id: 'Tunggu fase turun kontinu selesai tanpa ada penahanan imersi sama sekali.'
    },
    finish: {
      en: 'Serve a delicate and articulate cup typical of pure percolation.',
      id: 'Sajikan cangkir yang lembut dan terartikulasi khas perkolasi murni.'
    }
  },
  iced_hybrid: {
    setup: {
      en: 'Fill the server with ice; close the valve to build a potent hot concentrate.',
      id: 'Isi wadah saji dengan es; tutup katup untuk membangun konsentrat panas yang kuat.'
    },
    entry: {
      en: 'Steep the grounds in minimal water to rapidly extract intense aromatics.',
      id: 'Rendam kopi dalam air minimal untuk mengekstrak aromatik intens dengan cepat.'
    },
    main: {
      en: 'Stir to ensure the dense concentrate is fully developed before the chill.',
      id: 'Aduk untuk memastikan konsentrat pekat berkembang sempurna sebelum pendinginan.'
    },
    release: {
      en: 'Open the valve to flash-chill the concentrate directly over the ice.',
      id: 'Buka katup untuk mendinginkan kilat konsentrat langsung di atas es.'
    },
    finish: {
      en: 'Mix well until the thermal shock is complete and the drink is ice cold.',
      id: 'Aduk rata sampai kejutan termal selesai dan minuman menjadi sangat dingin.'
    }
  },
  mugen_everyday_hybrid: {
    setup: {
      en: 'Close the valve; this Mugen-inspired method requires a single, continuous pour.',
      id: 'Tutup katup; metode terinspirasi Mugen ini butuh satu tuangan kontinu.'
    },
    entry: {
      en: 'Pour the entire water volume in one smooth motion without stopping for a separate bloom.',
      id: 'Tuang seluruh volume air dalam satu gerakan mulus tanpa berhenti untuk blooming terpisah.'
    },
    main: {
      en: 'Let the full volume steep briefly, utilizing the restricted flow geometry.',
      id: 'Biarkan seluruh volume merendam sebentar, memanfaatkan geometri aliran yang terbatas.'
    },
    release: {
      en: 'Open the valve and allow the steady, unified drawdown to complete.',
      id: 'Buka katup dan biarkan fase turun yang stabil dan menyatu selesai.'
    },
    finish: {
      en: 'Serve a reliably balanced, low-effort daily cup.',
      id: 'Sajikan secangkir kopi harian yang seimbang dan andal dengan sedikit usaha.'
    }
  },

  hybrid_balanced: {
    setup: {
      en: 'Verify the pneumatic valve is sealed and preheat the thermal mass.',
      id: 'Verifikasi katup pneumatik tertutup rapat dan panaskan massa termal.'
    },
    entry: {
      en: 'Execute a comprehensive immersion bloom, ensuring immediate and total saturation without aggressive mechanical stirring.',
      id: 'Lakukan blooming imersi yang komprehensif, pastikan saturasi langsung dan total tanpa pengadukan mekanis agresif.'
    },
    main: {
      en: 'Maintain a static steep; undisturbed immersion yields pristine clarity compared to turbulent agitation.',
      id: 'Pertahankan rendaman statis; imersi tanpa gangguan menghasilkan kejernihan murni dibandingkan agitasi yang turbulen.'
    },
    release: {
      en: 'Actuate the release switch decisively; allow the hybrid percolation phase to draw down through the settled bed.',
      id: 'Aktifkan tuas pelepas dengan tegas; biarkan fase perkolasi hibrida meniris melewati hamparan kopi yang telah mengendap.'
    },
    finish: {
      en: 'Decant the balanced hybrid extraction and evaluate the clarity.',
      id: 'Tuang pisah ekstraksi hibrida yang seimbang dan evaluasi kejernihannya.'
    }
  },
  immersion_first: {
    setup: {
      en: 'Lock the pneumatic valve and ensure the brewing chamber is fully preheated.',
      id: 'Kunci katup pneumatik dan pastikan ruang seduh dipanaskan sepenuhnya.'
    },
    entry: {
      en: 'Charge the full volume immediately; fold the dry pockets rapidly beneath the surface.',
      id: 'Isi seluruh volume seketika; lipat bagian kering dengan cepat ke bawah permukaan.'
    },
    main: {
      en: 'Hold the static steep to extract the dense, syrupy immersion body without introducing harsh fines into suspension.',
      id: 'Tahan rendaman statis untuk mengekstrak body imersi yang padat tanpa memasukkan partikel halus kasar ke dalam suspensi.'
    },
    release: {
      en: 'Release the valve; the rapid percolation phase will filter the heavy suspension through the paper matrix.',
      id: 'Buka katup; fase perkolasi cepat akan menyaring suspensi padat melewati matriks kertas.'
    },
    finish: {
      en: 'Homogenize thoroughly; this profile yields massive body and muted acidity.',
      id: 'Homogenisasi secara menyeluruh; profil ini menghasilkan body masif dan keasaman yang diredam.'
    }
  },
  percolation_first: {
    setup: {
      en: 'Leave the pneumatic valve open; initiate the brew strictly as a percolation process.',
      id: 'Biarkan katup pneumatik terbuka; mulai penyeduhan murni sebagai proses perkolasi.'
    },
    entry: {
      en: 'Execute a standard V60-style bloom to establish initial clarity and articulate delicate acidity.',
      id: 'Lakukan blooming standar bergaya V60 untuk membangun kejernihan awal dan mengartikulasikan keasaman lembut.'
    },
    main: {
      en: 'Seal the valve midway through the cycle; transition to an immersion steep to build body beneath the acidic structure.',
      id: 'Tutup katup di pertengahan siklus; transisikan ke rendaman imersi untuk membangun body di bawah struktur asam.'
    },
    release: {
      en: 'Open the valve for the final drawdown; allow the integrated layers to filter completely.',
      id: 'Buka katup untuk fase turun akhir; biarkan lapisan terintegrasi tersaring sepenuhnya.'
    },
    finish: {
      en: 'Serve a structurally complex cup featuring bright front-end acidity and a heavy, comforting finish.',
      id: 'Sajikan cangkir yang kompleks secara struktural dengan keasaman awal cerah dan akhiran yang berat dan menenangkan.'
    }
  }
};

const KALITA_WAVE_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_flat_three: {
    setup: {
      en: 'Seat the fluted wave filter precisely and rinse gently to preheat the dripper without collapsing the structural ridges.',
      id: 'Pasang filter bergelombang dengan presisi dan bilas perlahan untuk memanaskan dripper tanpa merusak struktur lipatannya.'
    },
    entry: {
      en: 'Saturate uniformly. The 3-hole base restricts flow, so wet all grounds without flooding the bypass zones.',
      id: 'Saturasi seragam. Dasar 3 lubang menahan aliran, pastikan bubuk basah tanpa membanjiri bypass.'
    },
    main: {
      en: 'Deploy three concentric, low-agitation pulses. This ensures even extraction across the flat bed.',
      id: 'Terapkan 3 tuang konsentris rendah agitasi. Ini memastikan ekstraksi merata di alas datar.'
    },
    release: {
      en: 'Permit the bed to drain unimpeded through all three ports. A flat, tidy bed is the ultimate visual proof of hydrodynamic balance.',
      id: 'Biarkan seduhan meniris tanpa hambatan melalui ketiga lubang. Hamparan datar dan rapi adalah bukti mutlak dari keseimbangan hidrodinamis.'
    },
    finish: {
      en: 'Swirl to integrate the consistently sweet flat-bottom body. The Kalita geometry naturally filters out astringency.',
      id: 'Putar perlahan untuk mengintegrasikan body manis dari ekstraksi alas datar. Geometri Kalita secara alami menyaring rasa sepat.'
    }
  },
  competition_fast_four: {
    setup: {
      en: 'Seat the wave filter meticulously. Ensure the geometric ridges remain completely uncompressed to maximize lateral thermal retention and bypass flow.',
      id: 'Pasang filter gelombang dengan teliti. Pastikan lipatan geometris sama sekali tidak tertekan untuk memaksimalkan retensi panas dan aliran bypass tepi.'
    },
    entry: {
      en: 'Execute a rapid, aggressive bloom pour to force total saturation instantly. Fast extraction demands immediate total contact.',
      id: 'Lakukan blooming cepat dan agresif untuk saturasi total. Ekstraksi cepat butuh kontak menyeluruh sejak awal.'
    },
    main: {
      en: 'Deliver four rapid, tight concentric pulses. The filter geometry mitigates bypass while we churn the center.',
      id: 'Tuang 4 pulsa konsentris cepat. Geometri filter meredam bypass saat kita mengaduk kuat area tengah.'
    },
    release: {
      en: 'Watch for a hyper-fast drawdown. The high pulse energy keeps fines suspended, preventing choked drainage at the base.',
      id: 'Perhatikan penurunan air yang sangat cepat. Energi tuangan tinggi menjaga partikel halus tetap melayang, mencegah penyumbatan di dasar.'
    },
    finish: {
      en: 'Expect a bright, high-clarity cup with soaring acidity and pinpoint flavor separation, driven by the rapid pulsed extraction.',
      id: 'Hasilkan cangkir cerah berkejernihan tinggi dengan asiditas menjulang dan separasi rasa tajam, didorong oleh ekstraksi pulsa cepat.'
    }
  },
  continuous_slow_stream: {
    setup: {
      en: 'Prepare the Wave filter carefully. The upcoming slow flow relies entirely on the paper ridges holding heat and regulating the drip speed.',
      id: 'Siapkan filter Wave dengan hati-hati. Aliran lambat ini sangat bergantung pada lipatan kertas untuk menahan panas dan mengatur kecepatan tetesan.'
    },
    entry: {
      en: 'Wet the bed gently. Do not agitate, let the slurry settle into a compact puck.',
      id: 'Basahi kopi dengan lembut. Jangan lakukan agitasi, biarkan seduhan memadat jadi lapisan dalam.'
    },
    main: {
      en: 'Maintain a slow center stream. We utilize the water weight to drive extraction without turbulence.',
      id: 'Pertahankan aliran lambat di tengah. Kita pakai berat air untuk ekstraksi tanpa turbulensi mekanis.'
    },
    release: {
      en: 'Let the final water column sink slowly through the dense coffee bed. The long contact time will extract deep, complex sugars.',
      id: 'Biarkan sisa air turun perlahan melewati hamparan kopi yang padat. Waktu kontak yang lama akan mengekstrak gula kompleks yang dalam.'
    },
    finish: {
      en: 'Serve a remarkably sweet, highly structured cup with a velvety mouthfeel and absolute clarity of roast expression.',
      id: 'Sajikan hasil seduhan yang luar biasa manis dan terstruktur dengan tekstur lembut serta kejernihan karakter sangrai yang absolut.'
    }
  },
  iced_wave: {
    setup: {
      en: 'Load the carafe with precise ice weight. Seat the wave filter gently; we are building a concentrated, rapid-drain setup.',
      id: 'Isi wadah dengan takaran es yang presisi. Pasang filter wave; kita sedang menyusun alat untuk konsentrat yang meniris cepat.'
    },
    entry: {
      en: 'Bloom the high-density bed with intense hot water to immediately unlock vibrant, volatile fruit aromatics.',
      id: 'Blooming hamparan kopi padat dengan air panas intensif untuk seketika melepaskan aroma buah volatil yang cerah.'
    },
    main: {
      en: 'Pour short, hot pulses. The flat bottom limits channeling, forcing water heavily through the grounds.',
      id: 'Tuang air panas dalam pulsa pendek dan pekat. Alas datar mencegah channeling, memaksa setiap tetes membasuh kuat bubuk kopi.'
    },
    release: {
      en: 'Watch the thick hot concentrate melt directly into the ice structure below, flash-chilling instantly to lock in freshness.',
      id: 'Perhatikan konsentrat panas kental meleleh langsung ke dalam struktur es, melakukan flash-chilling seketika untuk mengunci kesegaran.'
    },
    finish: {
      en: 'Swirl the carafe vigorously to complete the thermal exchange. Serve an intensely bright, pristine iced brew.',
      id: 'Putar wadah dengan kuat untuk menyelesaikan pertukaran suhu. Sajikan kopi es yang sangat cerah dan murni.'
    }
  },
  high_dose_concentrate: {
    setup: {
      en: 'Set the Kalita 185 with a coarse grind. The high mass requires maximum permeability to avoid choking the small exit holes.',
      id: 'Siapkan Kalita 185 dengan gilingan kasar. Massa kopi tinggi membutuhkan permeabilitas maksimal agar tidak menyumbat lubang pembuangan.'
    },
    entry: {
      en: 'Conduct a massive, slow bloom. A large dose traps a lot of gas, so ensure total saturation without overflowing the filter.',
      id: 'Lakukan blooming lambat yang masif. Dosis besar menyimpan banyak gas, jadi pastikan saturasi total tanpa meluber keluar filter.'
    },
    main: {
      en: 'Pour slowly and centrally. Avoid swirling, which drives fines to the bottom and halts drawdown.',
      id: 'Tuang perlahan di tengah. Hindari putaran yang akan mendorong partikel halus ke dasar.'
    },
    release: {
      en: 'Patience is paramount. The heavy bed acts as its own restriction valve, creating a dense, syrupy extraction over time.',
      id: 'Kesabaran adalah kunci. Hamparan tebal berfungsi sebagai katup penahannya sendiri, menciptakan ekstraksi kental dan pekat seiring waktu.'
    },
    finish: {
      en: 'Serve an immensely rich, heavy-bodied concentrate. Perfect for milk pairings or dilution with fresh hot water.',
      id: 'Sajikan konsentrat yang luar biasa kaya dan ber-body tebal. Sangat cocok dicampur susu atau diencerkan dengan air panas segar.'
    }
  }
};;

const CLEVER_DRIPPER_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  classic_closed: {
    setup: {
      en: 'Set the Clever on a flat scale surface with the release valve firmly closed. Rinse the filter to preheat the chamber.',
      id: 'Letakkan Clever di atas permukaan timbangan datar dengan katup pelepas tertutup rapat. Bilas filter untuk memanaskan ruang seduh.'
    },
    entry: {
      en: 'Pour all hot water into the coffee bed immediately to trigger a full-contact immersion extraction.',
      id: 'Tuangkan seluruh air panas ke atas kopi segera untuk memicu ekstraksi imersi kontak penuh.'
    },
    main: {
      en: 'Stir gently to ensure total saturation, then cover with the lid to lock in thermal energy and halt evaporation.',
      id: 'Aduk lembut untuk memastikan saturasi total, lalu tutup untuk mengunci energi termal dan menghentikan penguapan.'
    },
    release: {
      en: 'At the exact target time, place the Clever seamlessly onto the server to activate the release valve. Do not shake it.',
      id: 'Pada waktu target yang tepat, letakkan Clever ke atas server untuk mengaktifkan katup. Jangan diguncang.'
    },
    finish: {
      en: 'Wait for a complete, undisturbed drawdown. The result is a profoundly sweet, full-bodied cup with zero bypass channeling.',
      id: 'Tunggu hingga air turun sepenuhnya tanpa gangguan. Hasilnya adalah cangkir ber-body penuh yang sangat manis tanpa kebocoran bypass.'
    }
  },
  reverse_water_first: {
    setup: {
      en: 'Place the filter and rinse. Crucially, leave the coffee aside—we are pouring the entire water volume into the empty filter first.',
      id: 'Pasang filter dan bilas. Sangat penting, sisihkan kopinya—kita akan menuang seluruh air ke dalam filter kosong terlebih dahulu.'
    },
    entry: {
      en: 'Add coffee grounds gently onto the hot water. Fold them in with no aggressive stirring to prevent migration.',
      id: 'Tambahkan kopi lembut ke permukaan air. Lipat tanpa adukan agresif untuk mencegah migrasi partikel.'
    },
    main: {
      en: 'Cover and steep. The coffee particles will slowly hydrate and sink naturally, extracting gently without ever clogging the bottom filter pores.',
      id: 'Tutup dan diamkan. Partikel kopi akan terhidrasi dan tenggelam secara alami, terekstraksi lembut tanpa pernah menyumbat pori filter bawah.'
    },
    release: {
      en: 'Engage the release valve on your decanter. Expect an incredibly fast, frictionless drawdown.',
      id: 'Aktifkan katup pada wadah server Anda. Harapkan aliran turun yang luar biasa cepat dan tanpa hambatan.'
    },
    finish: {
      en: 'This reverse-steep physics yields unprecedented clarity and pristine flavor separation, rivaling the cleanest pour-overs.',
      id: 'Fisika seduh terbalik ini menghasilkan kejernihan dan separasi rasa yang belum pernah ada, menyaingi pour-over terbersih sekalipun.'
    }
  },
  double_stage_hybrid: {
    setup: {
      en: 'Prepare the Clever with the valve closed. This advanced hybrid technique combines pour-over flushing with immersion steeping.',
      id: 'Siapkan Clever dengan katup tertutup. Teknik hibrida lanjutan ini menggabungkan bilasan pour-over dengan perendaman imersi.'
    },
    entry: {
      en: 'Execute a fast pour with the valve closed to saturate the bed, then place on server to drain bloom.',
      id: 'Lakukan tuangan cepat dengan katup tertutup untuk saturasi, lalu letakkan di server untuk menguras.'
    },
    main: {
      en: 'Remove from server to shut valve. Pour remaining volume and steep. We flushed gases and now extract sweetness.',
      id: 'Angkat dari server untuk menutup katup. Tuang sisa volume dan rendam. Kita mengekstrak kemanisan murni.'
    },
    release: {
      en: 'Trigger the final release. The bed is already pre-extracted, so the secondary drawdown pulls out deep structural body.',
      id: 'Picu pelepasan akhir. Kopi telah terekstraksi awal, sehingga penirisan kedua ini menarik body struktural yang dalam.'
    },
    finish: {
      en: 'Integrate the two distinct extraction stages in the carafe. This yields massive complexity and a dense, layered profile.',
      id: 'Satukan dua tahap ekstraksi berbeda ini di dalam karafe. Ini menghasilkan kompleksitas masif dan profil berlapis yang padat.'
    }
  },
  iced_clever: {
    setup: {
      en: 'Prep the Clever Dripper. Separately, load your serving vessel with hard, large-format ice to receive the flash extraction.',
      id: 'Siapkan Clever Dripper. Secara terpisah, isi wadah saji Anda dengan es batu besar dan keras untuk menerima ekstraksi kilat.'
    },
    entry: {
      en: 'Pour the hot concentrate volume aggressively. We must extract all soluble aromatics quickly before the short steep finishes.',
      id: 'Tuang air panas agresif. Ekstrak aromatik cepat sebelum rendaman singkat habis.'
    },
    main: {
      en: 'Stir vigorously and cover. The high heat and high agitation in a closed environment force a massive extraction yield.',
      id: 'Aduk kuat dan tutup. Panas dan agitasi tinggi di lingkungan tertutup memaksa hasil ekstraksi (yield) yang masif.'
    },
    release: {
      en: 'Slam the valve open directly over the ice. The violent thermal shock instantly locks in the bright, volatile acidity.',
      id: 'Buka katup langsung di atas es. Kejutan termal yang instan akan mengunci asiditas cerah dan volatil seketika.'
    },
    finish: {
      en: 'Stir the iced vessel until perfectly chilled. The Clever guarantees no messy channeling during this intense concentrate brew.',
      id: 'Aduk wadah es hingga dingin sempurna. Clever memastikan tidak ada channeling berantakan selama seduhan konsentrat intens ini.'
    }
  },
  high_dose_concentrate: {
    setup: {
      en: 'Load a massive coffee dose. Ensure a coarse grind—immersion limits over-extraction, but fine particles will choke the final release.',
      id: 'Masukkan dosis kopi masif. Pastikan gilingan kasar—imersi membatasi over-ekstraksi, namun partikel halus akan menyumbat pelepasan akhir.'
    },
    entry: {
      en: 'Pour the tight water ratio slowly, ensuring every dry pocket is hydrated in the thick, heavy slurry.',
      id: 'Tuang rasio air ketat dengan lambat, pastikan setiap kantong kering terhidrasi dalam campuran yang kental dan berat.'
    },
    main: {
      en: 'Seal the lid and execute a prolonged steep. We are relying on diffusion to slowly pull heavy sugars and lipids out of the dense bed.',
      id: 'Tutup rapat dan lakukan perendaman panjang. Kita mengandalkan difusi untuk perlahan menarik gula dan lipid berat dari hamparan padat.'
    },
    release: {
      en: 'Engage the release carefully. Do not swirl or tap the brewer, let the heavy liquor seep through the undisturbed filter.',
      id: 'Aktifkan pelepasan dengan hati-hati. Jangan memutar atau mengetuk brewer, biarkan cairan berat meresap melewati filter yang tak terganggu.'
    },
    finish: {
      en: 'Enjoy a brutally rich, espresso-like density. Perfect for milk or drinking neat as a heavy sensory experience.',
      id: 'Nikmati kepadatan yang luar biasa kaya menyerupai espresso. Sempurna untuk susu atau diminum langsung sebagai pengalaman sensorik berat.'
    }
  }
};;

const CHEMEX_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_three_pour: {
    setup: {
      en: 'Place the thick bonded filter precisely, aligning the triple-fold against the pouring spout. Rinse extensively with hot water to remove paper taste and preheat the heavy glass.',
      id: 'Pasang filter tebal Chemex dengan presisi, sejajarkan lipatan tiga di cerat. Gunakan gilingan sedang cenderung kasar. Bilas ekstensif untuk memanaskan kaca tebal.'
    },
    entry: {
      en: 'Bloom patiently. Heavy Chemex paper naturally restricts flow, so deep saturation matters more than speed.',
      id: 'Bloom dengan sabar. Kertas Chemex alami menahan aliran, jadi saturasi total jauh lebih penting dari kecepatan.'
    },
    main: {
      en: 'Pulse rhythmically. Keep water off the walls; Chemex rewards a calm, centered flow utilizing the deep cone.',
      id: 'Lakukan tuangan terukur. Jauhkan air dari dinding; Chemex menghargai aliran tengah yang tenang di kerucut dalam.'
    },
    release: {
      en: 'Allow the thick filter to do the work. It will strip out all oils and fine insolubles, leaving an intensely clean liquid.',
      id: 'Biarkan filter tebal bekerja. Filter ini akan menyaring seluruh minyak dan partikel tak larut, menyisakan cairan yang sangat bersih.'
    },
    finish: {
      en: 'Mix the carafe thoroughly. The Chemex layers flavor and density heavily over time, so integrating the brew is mandatory for balance.',
      id: 'Aduk karafe secara menyeluruh. Chemex melapiskan rasa dan kepadatan seiring waktu, sehingga integrasi seduhan wajib dilakukan demi keseimbangan.'
    }
  },
  competition_multi_pulse: {
    setup: {
      en: 'Set the Chemex filter and rinse aggressively. We need the glass entirely heat-soaked to sustain energy during the multi-pulse sequence.',
      id: 'Pasang filter Chemex dan bilas agresif. Kita butuh kaca menyerap panas sempurna untuk mempertahankan energi selama urutan multi-pulsa.'
    },
    entry: {
      en: 'Drive an energetic bloom to rapidly degas the coffee, forcing immediate heat penetration into the core of the slurry.',
      id: 'Lakukan blooming bertenaga untuk mendegas kopi secara cepat, memaksa penetrasi panas seketika ke inti campuran.'
    },
    main: {
      en: 'Pulse frequently to maintain high slurry temp and agitation. The thick filter catches suspended fines.',
      id: 'Tuang sering untuk jaga suhu dan agitasi konstan. Filter tebal menangkap partikel halus yang terangkat.'
    },
    release: {
      en: 'Maintain the pulse rhythm until the target weight. The rapid succession creates a dynamic, high-extraction drawdown.',
      id: 'Pertahankan ritme pulsa hingga bobot target. Urutan cepat ini menciptakan ekstraksi dinamis yang tinggi selama air meniris.'
    },
    finish: {
      en: 'Expect extreme flavor separation and a vibrant, tea-like clarity. The intensive agitation is polished perfectly by the heavy paper.',
      id: 'Harapkan separasi rasa ekstrem dan kejernihan layaknya teh. Agitasi intensif ini dipoles sempurna oleh tebalnya kertas.'
    }
  },
  continuous_center_pour: {
    setup: {
      en: 'Seat the Chemex filter and rinse. Prepare for a meditative, unbroken extraction path relying entirely on gravity and bed depth.',
      id: 'Pasang filter Chemex dan bilas. Bersiaplah untuk jalur ekstraksi yang tenang dan tak terputus, mengandalkan gravitasi dan kedalaman bed.'
    },
    entry: {
      en: 'Saturate the grounds entirely but gently. The goal is to establish a cohesive, unbroken coffee mass.',
      id: 'Saturasi bubuk sepenuhnya namun lembut. Tujuannya adalah membangun massa kopi yang kohesif dan tak terputus.'
    },
    main: {
      en: 'Maintain a slow center pour. By avoiding edges, we force water down the deepest path.',
      id: 'Jaga tuangan tengah lambat. Tanpa sentuh tepi, kita memaksa air turun ke kerucut terdalam.'
    },
    release: {
      en: 'Let the tall water column sink slowly. The absence of turbulence prevents fines migration, ensuring the filter never clogs.',
      id: 'Biarkan kolom air yang tinggi turun perlahan. Ketiadaan turbulensi mencegah migrasi partikel halus, memastikan filter tidak pernah tersumbat.'
    },
    finish: {
      en: 'Swirl to integrate. This method produces the ultimate expression of clean, delicate, and highly articulate coffee.',
      id: 'Putar untuk menyatukan rasa. Metode ini menghasilkan ekspresi tertinggi dari kopi yang bersih, lembut, dan sangat artikulatif.'
    }
  },
  iced_chemex: {
    setup: {
      en: 'Load the massive Chemex basin with fresh, high-quality ice. Ensure the triple-fold paper faces the spout to allow venting over the chilled air.',
      id: 'Isi wadah Chemex yang besar dengan es segar berkualitas tinggi. Pastikan lipatan tiga filter menghadap jalur tuang agar udara dingin bisa keluar.'
    },
    entry: {
      en: 'Bloom the high-dose bed with hot water. The thick filter requires slightly more water to saturate fully without stalling.',
      id: 'Blooming hamparan dosis tinggi dengan air panas. Filter tebal butuh sedikit lebih banyak air untuk saturasi total tanpa macet.'
    },
    main: {
      en: 'Pour in sustained pulses. We extract a dense concentrate strong enough to survive ice dilution.',
      id: 'Tuang pulsa konstan. Kita mengekstrak konsentrat padat yang cukup kuat menahan dilusi es.'
    },
    release: {
      en: 'Watch the thick, syrupy concentrate drop directly onto the ice boulders, flash-chilling instantly to lock in aromatics.',
      id: 'Perhatikan konsentrat kental jatuh langsung ke atas bongkahan es, mendingin seketika untuk mengunci seluruh aroma.'
    },
    finish: {
      en: 'Swirl the Chemex aggressively until the exterior fogs over. Serve a pristine, oil-free, incredibly refreshing iced brew.',
      id: 'Putar Chemex dengan agresif hingga bagian luarnya berembun. Sajikan kopi es yang murni, bebas minyak, dan luar biasa menyegarkan.'
    }
  },
  high_dose_heavy_body: {
    setup: {
      en: 'Prepare a coarse grind for the Chemex to handle the immense dose. Rinse the paper heavily to heat the massive glass frame.',
      id: 'Siapkan gilingan kasar agar Chemex sanggup menangani dosis masif ini. Bilas kertas dengan banyak air untuk memanaskan bingkai kaca yang tebal.'
    },
    entry: {
      en: 'Execute a massive bloom. Stirring with a paddle is highly recommended to ensure no dry pockets survive in the deep cone.',
      id: 'Lakukan blooming masif. Mengaduk dengan dayung sangat disarankan untuk memastikan tidak ada kantong kering di kerucut yang dalam.'
    },
    main: {
      en: 'Pour heavily and rhythmically in the center. Avoid washing the high walls, which risks bypassing water around the thick bed.',
      id: 'Tuang ritmis di tengah. Hindari dinding tinggi agar air tidak mem-bypass bed yang tebal.'
    },
    release: {
      en: 'Allow for a long, slow, syrupy drawdown. The thick paper and massive dose act as a severe flow restrictor.',
      id: 'Biarkan proses turun air yang panjang, lambat, dan kental. Kertas tebal dan dosis masif bertindak sebagai penahan aliran yang kuat.'
    },
    finish: {
      en: 'Integrate the heavy liquid thoroughly. This brew delivers the maximum possible body and sweetness achievable with paper filtration.',
      id: 'Integrasikan cairan berat ini secara menyeluruh. Seduhan ini memberikan body dan rasa manis maksimal yang bisa dicapai dengan penyaringan kertas.'
    }
  }
};;

const MOKA_POT_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_stovetop: {
    setup: {
      en: 'Fill the lower boiler with boiling water directly below the safety valve. Drop the coffee into the basket loosely—do not tamp it under any circumstance.',
      id: 'Isi boiler bawah dengan air mendidih tepat di bawah katup pengaman. Masukkan kopi ke keranjang dengan longgar—jangan pernah memadatkannya.'
    },
    entry: {
      en: 'Assemble the hot unit using a towel. Place it on low-to-medium heat. The pre-heated base water provides immediate pressure rather than baking the coffee.',
      id: 'Rakit alat panas ini menggunakan handuk. Letakkan di atas api kecil-sedang. Air yang sudah mendidih memberi tekanan instan tanpa memanggang kopi.'
    },
    main: {
      en: 'Watch the chimney closely with the lid open. The extraction should emerge as a slow, dark, syrupy ooze. If it spits or surges violently, reduce the heat instantly.',
      id: 'Awasi corong dengan tutup terbuka. Ekstraksi harus muncul perlahan seperti sirup gelap. Jika menyembur atau melonjak keras, segera kecilkan api.'
    },
    release: {
      en: 'Listen for the tell-tale gurgling sound. The exact moment the stream turns blond and bubbly, remove the pot completely from the heat.',
      id: 'Dengarkan suara mendidih yang khas. Tepat saat aliran berubah menjadi pucat dan bergelembung, angkat pot sepenuhnya dari sumber panas.'
    },
    finish: {
      en: 'Quench the boiler base with a wet towel or cold water stream to halt the extraction instantly. Serve a thick, profoundly rich Italian concentrate.',
      id: 'Dinginkan dasar boiler dengan handuk basah atau aliran air dingin untuk menghentikan ekstraksi seketika. Sajikan konsentrat Italia yang kental dan luar biasa kaya.'
    }
  },
  preheated_boiler: {
    setup: {
      en: 'Preheat the water to exactly 95°C before filling the base. Load the coffee evenly.',
      id: 'Panaskan air hingga tepat 95°C sebelum mengisi dasar boiler. Isi kopi secara merata.'
    },
    entry: {
      en: 'Seal the top chamber tightly. Set to a moderate heat source to drive an accelerated but stable pressure ramp.',
      id: 'Tutup ruang atas dengan rapat. Gunakan sumber panas sedang untuk mendorong tekanan yang dipercepat namun stabil.'
    },
    main: {
      en: 'Monitor the liquid emerging. It should be thick, rich, and deeply aromatic, free from burnt ash notes.',
      id: 'Pantau cairan yang keluar. Harus kental, kaya, dan sangat aromatik, bebas dari aroma gosong abu.'
    },
    release: {
      en: 'Pull off the heat just before the final sputter. The high starting temp ensures total extraction without stalling.',
      id: 'Angkat dari sumber panas tepat sebelum semburan akhir. Suhu awal tinggi memastikan ekstraksi total tanpa tersendat.'
    },
    finish: {
      en: 'Halt the brew with cold water on the base. The result is a profoundly sweet, high-clarity espresso alternative.',
      id: 'Hentikan seduhan dengan air dingin di alasnya. Hasilnya adalah alternatif espresso yang sangat manis dan berkejernihan tinggi.'
    }
  },
  low_temp_controlled: {
    setup: {
      en: 'Start with 70°C water in the base. This slower, gentler approach targets a brighter, lighter-bodied extraction.',
      id: 'Mulai dengan air 70°C di dasar. Pendekatan yang lebih lambat dan lembut ini menargetkan ekstraksi ber-body lebih ringan dan cerah.'
    },
    entry: {
      en: 'Place on very low heat. The prolonged buildup gently hydrates the coffee puck before the heavy pressure forces liquid through.',
      id: 'Letakkan di atas api sangat kecil. Penumpukan perlahan menghidrasi kopi sebelum tekanan berat memaksa cairan keluar.'
    },
    main: {
      en: 'Expect a very delayed start to the flow. When it appears, it will be thinner but vibrantly bright.',
      id: 'Harapkan aliran yang sangat tertunda. Saat muncul, ia akan lebih tipis namun cerah memukau.'
    },
    release: {
      en: 'Cut the heat early to prevent the slower brew from bringing out late-stage bitterness.',
      id: 'Matikan api lebih awal untuk mencegah seduhan lambat ini menarik rasa pahit akhir.'
    },
    finish: {
      en: 'Cool the base. Serve a remarkably delicate and articulate Moka Pot brew that resembles a dense pour-over.',
      id: 'Dinginkan alas. Sajikan seduhan Moka Pot yang sangat lembut dan artikulatif, menyerupai pour-over padat.'
    }
  },
  iced_moka_concentrate: {
    setup: {
      en: 'Load a high dose into the basket. Pack your serving vessel with heavy ice chunks.',
      id: 'Masukkan dosis tinggi ke keranjang. Isi wadah saji Anda dengan bongkahan es berat.'
    },
    entry: {
      en: 'Brew over medium heat. The intense concentrate will strip all soluble solids quickly.',
      id: 'Seduh di atas api sedang. Konsentrat intens ini akan menarik seluruh padatan larut dengan cepat.'
    },
    main: {
      en: 'Let the thick dark liquor flow into the top chamber, capturing the heavy crema-like foam.',
      id: 'Biarkan cairan gelap pekat mengalir ke ruang atas, menangkap busa kental layaknya crema.'
    },
    release: {
      en: 'Pour the hot concentrate aggressively and immediately over the ice bed.',
      id: 'Tuang konsentrat panas secara agresif dan segera ke atas hamparan es.'
    },
    finish: {
      en: 'Swirl to crash-cool. This locks in the volatile aromatics, yielding a powerful, punchy iced coffee.',
      id: 'Putar untuk mendinginkan kilat. Ini mengunci aromatik volatil, menghasilkan kopi es yang kuat dan menonjol.'
    }
  },
  high_yield_robust: {
    setup: {
      en: 'Pack the basket tightly with a slightly finer grind to drastically increase flow resistance and extraction yield.',
      id: 'Isi keranjang dengan padat menggunakan gilingan sedikit lebih halus untuk secara drastis meningkatkan hambatan aliran dan hasil ekstraksi.'
    },
    entry: {
      en: 'Utilize high heat. We are deliberately pushing the Moka Pot to its structural pressure limits.',
      id: 'Gunakan panas tinggi. Kita sengaja mendorong Moka Pot hingga batas tekanan strukturalnya.'
    },
    main: {
      en: 'The flow will struggle, then burst through as a dense, oily, incredibly heavy liquid.',
      id: 'Aliran akan tertahan, lalu menyembur sebagai cairan yang sangat berat, berminyak, dan padat.'
    },
    release: {
      en: 'Cut the heat the instant the flow accelerates to avoid catastrophic over-extraction.',
      id: 'Matikan api seketika saat aliran mulai melaju cepat untuk menghindari over-ekstraksi parah.'
    },
    finish: {
      en: 'Quench immediately. The resulting brew is intensely robust, designed to cut through milk or heavy syrups easily.',
      id: 'Dinginkan seketika. Seduhan ini luar biasa kuat, dirancang untuk menembus susu atau sirup kental dengan mudah.'
    }
  }
};;;

const COLD_BREW_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  classic_toddy_immersion: {
    setup: {
      en: 'Secure the rubber stopper and insert a wet felt filter. Add alternating layers of coarse coffee and cold water to prevent dry pockets.',
      id: 'Pasang penutup karet dan masukkan filter kain basah. Tambahkan lapisan kopi kasar dan air dingin bergantian untuk mencegah kantong kering.'
    },
    entry: {
      en: 'Ensure total saturation without vigorous stirring, which clogs the thick felt filter.',
      id: 'Pastikan saturasi total tanpa adukan kuat, yang dapat menyumbat filter kain tebal.'
    },
    main: {
      en: 'Steep at ambient room temperature or in a refrigerator for 12 to 24 hours. The slow diffusion extracts only the sweetest, lowest-acidity compounds.',
      id: 'Rendam di suhu ruang atau di lemari es selama 12 hingga 24 jam. Difusi lambat hanya mengekstrak senyawa yang paling manis dan rendah asam.'
    },
    release: {
      en: 'Remove the stopper over a glass decanter. Allow gravity to slowly pull the heavy concentrate through the deep coffee bed and felt pad.',
      id: 'Cabut penutup karet di atas wadah kaca. Biarkan gravitasi perlahan menarik konsentrat kental melewati hamparan kopi dan bantalan kain.'
    },
    finish: {
      en: 'The result is a remarkably smooth, chocolate-heavy cold concentrate. Dilute with water or milk to serve.',
      id: 'Hasilnya adalah konsentrat dingin yang sangat mulus dan dominan cokelat. Encerkan dengan air atau susu untuk disajikan.'
    }
  },
  cold_drip_tower: {
    setup: {
      en: 'Assemble the glass tower. Pre-wet the paper filter over the coffee bed to ensure perfectly even water distribution from the upper valve.',
      id: 'Rakit menara kaca. Basahi filter kertas di atas hamparan kopi untuk memastikan distribusi air yang sampurna dari katup atas.'
    },
    entry: {
      en: 'Set the upper dripper valve to exactly one drop per second. The initial drops must slowly hydrate the entire column of grounds.',
      id: 'Atur katup penetes atas ke tepat satu tetes per detik. Tetesan awal harus perlahan menghidrasi seluruh kolom bubuk kopi.'
    },
    main: {
      en: 'Monitor the drip rate periodically. Changes in water column pressure will naturally slow the drip, so adjust the valve to maintain the rhythm.',
      id: 'Pantau laju tetesan secara berkala. Perubahan tekanan kolom air secara alami akan melambatkan tetesan, jadi sesuaikan katup untuk menjaga ritme.'
    },
    release: {
      en: 'Allow the 6-12 hour extraction to finish naturally. The percolative nature extracts vibrant, wine-like clarity unlike standard immersion.',
      id: 'Biarkan ekstraksi 6-12 jam ini selesai secara alami. Sifat perkolasi ini mengekstrak kejernihan seperti anggur (wine) yang cerah, berbeda dari imersi biasa.'
    },
    finish: {
      en: 'Swirl the final carafe. Serve neat or over ice for a profoundly complex, highly articulate cold brew experience.',
      id: 'Putar karafe akhir. Sajikan murni atau dengan es untuk pengalaman cold brew yang luar biasa kompleks dan sangat artikulatif.'
    }
  },
  double_extraction_concentrate: {
    setup: {
      en: 'Prepare a massive dose of coffee. We are aiming for a hyper-concentrated yield, so use a dual-filtration setup if possible.',
      id: 'Siapkan dosis kopi masif. Kita menargetkan hasil yang super-terkonsentrasi, jadi gunakan pengaturan penyaringan ganda jika memungkinkan.'
    },
    entry: {
      en: 'Add a small amount of warm water first to rapidly degas, then immediately shock it with the remaining icy water.',
      id: 'Tambahkan sedikit air hangat lebih dulu untuk mendegas cepat, lalu kejutkan seketika dengan sisa air sedingin es.'
    },
    main: {
      en: 'Steep for a full 24 hours. The hybrid hot-bloom cold-steep pulls deep structural lipids alongside bright aromatics.',
      id: 'Rendam selama 24 jam penuh. Hibrida bloom-panas dan rendam-dingin ini menarik lipid struktural yang dalam bersama aromatik cerah.'
    },
    release: {
      en: 'Drain the heavy concentrate. It will be thick, syrupy, and naturally resistant to oxidation.',
      id: 'Tiriskan konsentrat berat ini. Cairan akan kental, bersirup, dan secara alami tahan terhadap oksidasi.'
    },
    finish: {
      en: 'Bottle and refrigerate. This dense liquid is meant to be heavily diluted, providing extreme versatility in iced lattes.',
      id: 'Botolkan dan simpan di kulkas. Cairan pekat ini dirancang untuk diencerkan secara berat, memberi keserbagunaan ekstrem untuk iced latte.'
    }
  },
  accelerated_room_temp: {
    setup: {
      en: 'Use a slightly finer grind and ambient room-temperature water. The higher thermal energy will accelerate diffusion dramatically.',
      id: 'Gunakan gilingan sedikit lebih halus dan air bersuhu ruang. Energi termal yang lebih tinggi akan mempercepat difusi secara dramatis.'
    },
    entry: {
      en: 'Submerge all grounds immediately. Agitate the slurry thoroughly to maximize early surface-area contact.',
      id: 'Tenggelamkan semua bubuk seketika. Aduk campuran secara menyeluruh untuk memaksimalkan kontak luas permukaan awal.'
    },
    main: {
      en: 'Steep for only 8 to 12 hours. The warmer temperature extracts rapidly, so pushing past 12 hours risks flat, woody bitterness.',
      id: 'Rendam hanya 8 hingga 12 jam. Suhu yang lebih hangat mengekstrak dengan cepat, jadi melewati 12 jam berisiko memunculkan rasa kayu yang pahit dan hambar.'
    },
    release: {
      en: 'Filter cleanly. The accelerated extraction yields a round, comforting profile that favors nutty and chocolate notes.',
      id: 'Saring dengan bersih. Ekstraksi yang dipercepat ini menghasilkan profil bulat dan nyaman yang menonjolkan aroma kacang dan cokelat.'
    },
    finish: {
      en: 'Chill immediately to halt any lingering oxidation. Serve over ice for a robust daily cold brew.',
      id: 'Dinginkan seketika untuk menghentikan sisa oksidasi. Sajikan dengan es sebagai cold brew harian yang kokoh.'
    }
  },
  japanese_slow_drip: {
    setup: {
      en: 'Set up an iced V60 or flat-bottom dripper directly over an ice bed. This is not immersion; this is rapid hot extraction over ice.',
      id: 'Siapkan V60 atau dripper alas datar langsung di atas hamparan es. Ini bukan imersi; ini adalah ekstraksi panas cepat di atas es.'
    },
    entry: {
      en: 'Hydrate aggressively. We must extract all acidity and fruit notes instantly before the rapid drip ends.',
      id: 'Lakukan hidrasi dengan agresif. Kita harus mengekstrak seluruh asiditas dan aroma buah seketika sebelum aliran cepat berakhir.'
    },
    main: {
      en: 'Pour the hot concentrate seamlessly. Let the hot liquid fall directly onto the ice, flash-chilling on impact.',
      id: 'Tuang konsentrat panas secara berkesinambungan. Biarkan cairan panas jatuh langsung ke atas es, mendingin kilat saat bertabrakan.'
    },
    release: {
      en: 'Allow the short, intense brew to finish draining. The total contact time should be under 3 minutes.',
      id: 'Biarkan seduhan singkat dan intens ini selesai meniris. Total waktu kontak harus di bawah 3 menit.'
    },
    finish: {
      en: 'Swirl the carafe. This method locks in extreme volatile aromatics, delivering a crystalline, juicy iced coffee.',
      id: 'Putar karafe. Metode ini mengunci aromatik volatil ekstrem, memberikan kopi es yang sangat jernih (crystalline) dan berair (juicy).'
    }
  }
};;

const BATCH_BREW_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  sca_gold_cup: {
    setup: {
      en: 'Seat the massive paper filter carefully against the brew basket walls. Load an even, level bed of precisely ground coffee to guarantee uniform flow geometry.',
      id: 'Pasang filter kertas besar dengan hati-hati merapat ke dinding keranjang seduh. Ratakan hamparan kopi yang digiling presisi untuk menjamin geometri aliran seragam.'
    },
    entry: {
      en: 'Engage brew cycle. Machine delivers a calibrated spray, ensuring every quadrant is saturated simultaneously.',
      id: 'Mulai siklus seduh. Mesin memberi dispersi kepala penyemprot terkalibrasi, memastikan tiap kuadran tersaturasi.'
    },
    main: {
      en: 'Let automated pulse-brew manage slurry depth. Cycle optimized to maintain 93°C environment.',
      id: 'Biarkan seduh-pulsa otomatis mengelola cairan. Siklus dioptimalkan menjaga suhu 93°C tanpa intervensi.'
    },
    release: {
      en: 'Wait for the final drawdown phase after the spray head ceases. The flat-bottom basket will drain evenly, avoiding localized channeling.',
      id: 'Tunggu fase penirisan akhir setelah kepala penyemprot berhenti. Keranjang alas datar akan meniris rata, menghindari channeling terlokalisasi.'
    },
    finish: {
      en: 'Tap the thermal carafe to gently integrate the dense lower layers with the brighter upper layers. Serve a mathematically perfect Gold Cup standard brew.',
      id: 'Tepuk ringan wadah termal untuk menyatukan lapisan bawah yang pekat dengan lapisan atas yang cerah. Sajikan seduhan standar Gold Cup yang sempurna secara matematis.'
    }
  },
  heavy_batch_catering: {
    setup: {
      en: 'Load a massive catering-scale dose. Grind significantly coarser to accommodate the sheer volume and weight of the deep coffee bed.',
      id: 'Masukkan dosis skala katering yang masif. Giling jauh lebih kasar untuk mengakomodasi volume dan beban hamparan kopi yang sangat dalam.'
    },
    entry: {
      en: 'Initiate the long brew cycle. The initial water volume is vast, creating a prolonged, deep immersion zone within the basket.',
      id: 'Mulai siklus seduh panjang. Volume air awal sangat besar, menciptakan zona imersi dalam yang berkepanjangan di keranjang.'
    },
    main: {
      en: 'The deep bed acts as a powerful flow restrictor. The machine will pulse slowly, relying on bed depth to force high extraction yields.',
      id: 'Hamparan dalam berfungsi sebagai penahan aliran yang kuat. Mesin akan memompa perlahan, mengandalkan kedalaman bed untuk memaksa hasil ekstraksi tinggi.'
    },
    release: {
      en: 'Permit a prolonged drawdown. Do not rush or pull the carafe early, as the final liquids contain vital balancing sugars.',
      id: 'Biarkan penirisan memakan waktu lama. Jangan terburu-buru menarik karafe lebih awal, karena cairan terakhir mengandung gula penyeimbang yang vital.'
    },
    finish: {
      en: 'Stir the heavy urn extensively. This yields an exceptionally dense, chocolate-forward batch designed to maintain structural integrity for hours.',
      id: 'Aduk tangki besar ini secara ekstensif. Ini menghasilkan batch yang sangat padat dan dominan cokelat, dirancang untuk menjaga integritas struktural berjam-jam.'
    }
  },
  bright_light_roast_batch: {
    setup: {
      en: 'Prepare the basket with a finer grind to tackle dense light roasts. Ensure the machine is fully pre-heated to deliver maximum thermal energy.',
      id: 'Siapkan keranjang dengan gilingan lebih halus. Gunakan filter kertas putih. Pastikan mesin sudah dipanaskan penuh untuk panas maksimal.'
    },
    entry: {
      en: 'Start cycle. Machine fires high-temperature water to crash through the dense cellular structure.',
      id: 'Mulai siklus. Mesin seketika menembak air panas untuk mendobrak struktur seluler padat.'
    },
    main: {
      en: 'Spray head pulses rapidly to maintain high temperature and agitation, maximizing extraction.',
      id: 'Kepala semprot memompa cepat untuk menjaga suhu dan agitasi konstan, memaksimalkan ekstraksi.'
    },
    release: {
      en: 'Monitor the drawdown. A slightly slower drain is expected and necessary to pull sufficient sweetness to balance the soaring acidity.',
      id: 'Pantau penurunan air. Aliran yang sedikit lebih lambat adalah wajar dan diperlukan untuk menarik cukup kemanisan guna menyeimbangkan asiditas yang menjulang.'
    },
    finish: {
      en: 'Integrate the carafe completely. Serve a vibrant, tea-like, and highly articulate batch brew that rivals manual brewing.',
      id: 'Saturasi karafe sepenuhnya. Sajikan batch brew yang cerah, layaknya teh, dan sangat artikulatif yang mampu menyaingi seduhan manual.'
    }
  },
  pre_wet_hybrid_batch: {
    setup: {
      en: 'Manually pre-wet the coffee bed with a stirring paddle before sliding the basket into the machine. This eliminates all dry pockets instantly.',
      id: 'Basahi manual hamparan kopi sambil diaduk dengan dayung sebelum memasukkan keranjang ke dalam mesin. Ini melenyapkan semua kantong kering seketika.'
    },
    entry: {
      en: 'Engage machine cycle. Since coffee is blooming, initial pulses drive extraction rather than hydration.',
      id: 'Nyalakan mesin. Karena kopi sudah mekar, semprotan awal langsung mendorong ekstraksi, bukan hidrasi.'
    },
    main: {
      en: 'Let the automated sequence take over. The pre-wetting ensures absolute uniformity across the flat bed, drastically increasing extraction efficiency.',
      id: 'Biarkan urutan otomatis mengambil alih. Pembasahan awal memastikan keseragaman absolut di seluruh alas datar, secara drastis meningkatkan efisiensi ekstraksi.'
    },
    release: {
      en: 'The drawdown will be smooth and highly predictable, as fine migration was mitigated during the manual blooming phase.',
      id: 'Penirisan air akan sangat halus dan dapat diprediksi, karena migrasi partikel halus telah dicegah saat fase blooming manual.'
    },
    finish: {
      en: 'Serve an impossibly clean, hyper-efficient extraction with maximum sweetness and zero astringent channeling.',
      id: 'Sajikan ekstraksi yang luar biasa bersih, super efisien dengan rasa manis maksimal dan tanpa channeling yang sepat.'
    }
  },
  high_extraction_thermos: {
    setup: {
      en: 'Pre-heat the thermal airpot with boiling water for 5 minutes, then empty it. Load the basket with a precision-ground high dose.',
      id: 'Panaskan airpot termal dengan air mendidih selama 5 menit, lalu kosongkan. Isi keranjang dengan dosis tinggi yang digiling presisi.'
    },
    entry: {
      en: 'Begin the brew. The heavily insulated environment ensures zero thermal loss, keeping the extraction aggressive and constant.',
      id: 'Mulai menyeduh. Lingkungan berinsulasi berat memastikan tidak ada kehilangan panas, menjaga ekstraksi tetap agresif dan konstan.'
    },
    main: {
      en: 'Allow the machine to pulse heavily. The sealed thermos below captures every volatile aromatic compound immediately.',
      id: 'Biarkan mesin menyemprot kuat. Termos tertutup di bawahnya segera menangkap setiap senyawa aromatik volatil.'
    },
    release: {
      en: 'Let the basket drain completely. The closed system prevents oxidation and evaporation during the long drain phase.',
      id: 'Biarkan keranjang meniris sepenuhnya. Sistem tertutup mencegah oksidasi dan penguapan selama fase tiris yang panjang.'
    },
    finish: {
      en: 'Seal the thermos tightly. This brew is engineered to remain perfectly balanced, hot, and sweet for several hours of service.',
      id: 'Tutup rapat termos. Seduhan ini dirancang untuk tetap seimbang sempurna, panas, dan manis selama beberapa jam penyajian.'
    }
  }
};;

const SIPHON_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_vacuum_siphon: {
    setup: {
      en: 'Lock the upper glass chamber tightly into the boiling lower globe. Hook the cloth filter assembly securely to the glass tube.',
      id: 'Kunci ruang kaca atas rapat-rapat ke wadah bawah yang mendidih. Kaitkan rakitan filter kain dengan kuat ke tabung kaca.'
    },
    entry: {
      en: 'As vapor pressure drives water up, reduce heat to a simmer. Add coffee once water level stabilizes.',
      id: 'Saat tekanan uap mendorong air ke atas, kecilkan api. Masukkan kopi saat batas air sudah stabil.'
    },
    main: {
      en: 'Fold coffee gently into water with a bamboo paddle to ensure total saturation without disturbing the filter.',
      id: 'Lipat kopi perlahan ke dalam air dengan dayung bambu untuk saturasi total tanpa mengganggu filter kain.'
    },
    release: {
      en: 'Kill the heat source completely. The immediate pressure drop creates a powerful vacuum, violently pulling the liquid through the coffee bed.',
      id: 'Matikan sumber panas sepenuhnya. Penurunan tekanan yang instan menciptakan vakum kuat, menarik cairan secara dahsyat melewati hamparan kopi.'
    },
    finish: {
      en: 'Watch the grounds form a perfect dome. Serve an incredibly hot, deeply aromatic cup characterized by its flawless, syrupy clarity.',
      id: 'Perhatikan ampas kopi membentuk kubah sempurna. Sajikan secangkir kopi sangat panas dan beraroma dalam, ditandai dengan kejernihannya yang kental dan tanpa cela.'
    }
  },
  competition_triple_agitation: {
    setup: {
      en: 'Secure the filter meticulously. We are aiming for a hyper-extracted, aggressive profile, so ensure the seal is absolute.',
      id: 'Pasang filter dengan teliti. Kita menargetkan profil agresif dan ekstraksi super, jadi pastikan segelnya mutlak rapat.'
    },
    entry: {
      en: 'Drop grounds into heated upper chamber. Execute the first violent agitation for massive extraction.',
      id: 'Jatuhkan kopi ke ruang atas. Seketika lakukan agitasi keras untuk memaksa ekstraksi masif instan.'
    },
    main: {
      en: 'At 30s, execute secondary vortex stir. At 60s, execute final turbulence before removing heat.',
      id: 'Pada 30d, lakukan adukan pusaran. Pada 60d, lakukan turbulensi terakhir sebelum matikan api.'
    },
    release: {
      en: 'Cut the heat. The triple-agitation forces the fines into suspension, making the vacuum drawdown slower and far more intense.',
      id: 'Matikan api. Agitasi tiga tahap ini memaksa partikel halus melayang, membuat penarikan vakum lebih lambat dan jauh lebih intens.'
    },
    finish: {
      en: 'This brutal extraction yields a colossal, booming flavor profile with soaring intensity and massive body.',
      id: 'Ekstraksi brutal ini menghasilkan profil rasa yang kolosal dan meledak, dengan intensitas menjulang serta body yang masif.'
    }
  },
  low_temp_delicate: {
    setup: {
      en: 'Maintain the lower globe at a very low simmer. The goal is to keep the upper chamber water at exactly 88°C for a delicate extraction.',
      id: 'Jaga bola bawah pada api sangat kecil (simmer). Tujuannya adalah menjaga suhu ruang atas tetap di 88°C untuk ekstraksi yang halus.'
    },
    entry: {
      en: 'Introduce the coffee softly. The lower temperature prevents the immediate extraction of harsh tannins and bitter ash notes.',
      id: 'Masukkan kopi dengan lembut. Suhu yang lebih rendah mencegah terekstraknya tanin kasar dan rasa gosong abu secara instan.'
    },
    main: {
      en: 'Do not stir aggressively. Allow diffusion to occur naturally over a slightly extended contact time in the calm upper bath.',
      id: 'Jangan mengaduk dengan agresif. Biarkan difusi terjadi secara alami pada waktu kontak yang sedikit lebih lama di rendaman atas yang tenang.'
    },
    release: {
      en: 'Remove the heat. The slower, gentler vacuum pull protects the fragile floral and fruit esters from physical degradation.',
      id: 'Singkirkan sumber panas. Tarikan vakum yang lebih lambat dan lembut melindungi ester bunga dan buah yang rapuh dari degradasi fisik.'
    },
    finish: {
      en: 'Serve an elegant, tea-like brew. This approach transforms the typically heavy siphon into an articulate, bright masterpiece.',
      id: 'Sajikan seduhan elegan layaknya teh. Pendekatan ini mengubah siphon yang biasanya berat menjadi mahakarya yang cerah dan artikulatif.'
    }
  },
  high_body_fast_drawdown: {
    setup: {
      en: 'Use a very coarse grind and ensure the cloth filter is tightly strung. We want maximum physical flow rate.',
      id: 'Gunakan gilingan sangat kasar dan pastikan filter kain terikat kuat. Kita menginginkan laju aliran fisik yang maksimal.'
    },
    entry: {
      en: 'Add coffee at peak boiling point. We need high heat to compensate for coarse particles.',
      id: 'Tambahkan kopi di titik didih puncak. Kita butuh panas tinggi kompensasi partikel kasar.'
    },
    main: {
      en: 'Execute one massive, deep stir to wet all grounds, then leave it entirely alone. Avoid suspending any fines.',
      id: 'Lakukan satu adukan dalam dan masif untuk membasahi semua bubuk, lalu biarkan sepenuhnya. Hindari menerbangkan partikel halus.'
    },
    release: {
      en: 'Remove heat quickly. The coarse bed acts as a highly porous filter, allowing the vacuum to slam the liquid into the lower globe instantly.',
      id: 'Angkat dari api dengan cepat. Bed kasar bertindak sebagai filter berpori tinggi, membiarkan vakum membanting cairan ke bola bawah seketika.'
    },
    finish: {
      en: 'This yields a remarkably clean, heavy-bodied cup with a snappy finish, completely devoid of over-extracted bitterness.',
      id: 'Ini menghasilkan cangkir ber-body berat yang luar biasa bersih dengan akhir (finish) yang tegas, tanpa sisa pahit over-ekstraksi.'
    }
  },
  spirit_infusion_style: {
    setup: {
      en: 'A highly experimental style. Secure the upper chamber, combining coffee and aromatic botanicals or spices in the dry bed.',
      id: 'Gaya eksperimental tinggi. Pasang ruang atas, gabungkan kopi dengan botanikal aromatik atau rempah di dalam hamparan kering.'
    },
    entry: {
      en: 'Allow the vapor pressure to push the water up, violently mingling with the complex dry ingredients in the heated chamber.',
      id: 'Biarkan tekanan uap mendorong air naik, bercampur dahsyat dengan komposisi bahan kering yang kompleks di ruang yang panas.'
    },
    main: {
      en: 'Stir rhythmically. The sustained boiling heat forcefully extracts oils from both the coffee and the infused aromatics.',
      id: 'Aduk berirama. Panas mendidih yang ditahan akan mengekstrak minyak dengan kuat, baik dari kopi maupun rempah yang diinfus.'
    },
    release: {
      en: 'Kill the heat to trigger the vacuum drop. The immediate seal traps all volatile, highly evaporative aromatic compounds.',
      id: 'Matikan api untuk memicu kejatuhan vakum. Segel instan menjebak semua senyawa aromatik volatil yang mudah menguap.'
    },
    finish: {
      en: 'Serve an intensely complex, heavily aromatic sensory experience. This is coffee alchemy at its finest.',
      id: 'Sajikan pengalaman sensorik yang luar biasa kompleks dan beraroma tajam. Ini adalah alkemi kopi dalam bentuk terbaiknya.'
    }
  }
};;

const ORIGAMI_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  cone_dripper_style: {
    setup: {
      en: 'Set the conical filter into the Origami. Rinse gently to shape it without crushing the delicate paper into the ceramic grooves.',
      id: 'Pasang filter kerucut ke dalam Origami. Bilas perlahan untuk membentuknya tanpa menghancurkan kertas halus ke dalam celah keramik.'
    },
    entry: {
      en: 'Execute a precise bloom. Ensure rapid total saturation before heat escapes through the deep grooves.',
      id: 'Blooming dengan presisi. Pastikan saturasi cepat sebelum panas lepas lewat celah dalam.'
    },
    main: {
      en: 'Pour in tight circles. The fast flow rate demands constant replenishment to maintain temperature.',
      id: 'Tuang melingkar rapat. Aliran cepat Origami butuh pengisian konstan untuk menjaga suhu.'
    },
    release: {
      en: 'Let the bed drain. The aggressive bypass characteristics of the cone-in-groove setup will yield an extremely fast drawdown.',
      id: 'Biarkan hamparan meniris. Karakteristik bypass agresif dari pengaturan kerucut-dalam-celah akan menghasilkan penirisan yang sangat cepat.'
    },
    finish: {
      en: 'Serve a vibrantly bright cup. The fast flow highlights delicate acidity and distinct floral notes perfectly.',
      id: 'Sajikan secangkir kopi yang sangat cerah. Aliran cepat ini menonjolkan asiditas lembut dan karakter bunga yang khas secara sempurna.'
    }
  },
  wave_dripper_style: {
    setup: {
      en: 'Drop the flat-bottom wave filter into the Origami. The ceramic ridges naturally support the paper without restricting the lower drain holes.',
      id: 'Letakkan filter wave alas datar ke dalam Origami. Tonjolan keramik secara alami menopang kertas tanpa membatasi lubang pembuangan bawah.'
    },
    entry: {
      en: 'Execute a flat-bottom bloom. Ensure water spreads evenly across the entire surface to hydrate the bed simultaneously.',
      id: 'Lakukan blooming alas datar. Pastikan air menyebar merata ke seluruh permukaan untuk menghidrasi hamparan secara bersamaan.'
    },
    main: {
      en: 'Pulse slowly. The wave filter in Origami provides stability for deep, sweet extraction.',
      id: 'Tuang perlahan. Filter wave Origami memberi stabilitas luar biasa untuk ekstraksi yang manis.'
    },
    release: {
      en: 'Allow a steady drawdown. The geometry prevents the choking often seen in standard wave drippers.',
      id: 'Biarkan penirisan stabil. Geometrinya mencegah penyumbatan yang sering terjadi pada dripper wave standar.'
    },
    finish: {
      en: 'Swirl and serve. This yields the sweetness of a Kalita with the thermal dynamic profile of an Origami.',
      id: 'Putar dan sajikan. Ini menghasilkan rasa manis ala Kalita dipadu profil dinamis termal ala Origami.'
    }
  },
  mugen_one_pour: {
    setup: {
      en: 'Use a conical filter but grind slightly finer. We are aiming for a continuous, high-contact extraction.',
      id: 'Gunakan filter kerucut namun giling sedikit lebih halus. Kita menargetkan ekstraksi kontak tinggi yang berkelanjutan.'
    },
    entry: {
      en: 'Skip the bloom and execute a single massive pour to drown all grounds instantly.',
      id: 'Lewati blooming dan lakukan satu tuangan masif tak terputus untuk menenggelamkan semua kopi.'
    },
    main: {
      en: 'Maintain a slow, steady center pour until the entire water weight is added. Do not stop.',
      id: 'Pertahankan tuangan tengah yang lambat dan stabil hingga seluruh berat air ditambahkan. Jangan berhenti.'
    },
    release: {
      en: 'Let gravity take over. The single massive water column will push extraction heavily and consistently.',
      id: 'Biarkan gravitasi mengambil alih. Kolom air masif tunggal ini akan mendorong ekstraksi dengan berat dan konsisten.'
    },
    finish: {
      en: 'Enjoy a deeply structured, heavy-bodied cup that rivals immersion methods for sweetness.',
      id: 'Nikmati secangkir kopi ber-body berat dengan struktur mendalam yang menyaingi metode imersi dalam hal rasa manis.'
    }
  },
  iced_origami: {
    setup: {
      en: 'Prepare your server with precision ice. Seat the wave filter for maximum flow stability during this concentrated brew.',
      id: 'Siapkan wadah saji Anda dengan es presisi. Pasang filter wave. Gunakan gilingan sedang cenderung halus untuk stabilitas aliran konsentrat.'
    },
    entry: {
      en: 'Bloom the high-dose bed hot and fast. We need instant extraction before thermal loss occurs.',
      id: 'Blooming hamparan dosis tinggi panas dan cepat. Kita butuh ekstraksi instan sebelum suhu hilang.'
    },
    main: {
      en: 'Pour aggressively to keep the fine particles suspended. The Origami ridges will handle the massive bypass easily.',
      id: 'Tuang dengan agresif untuk menjaga partikel halus tetap melayang. Tonjolan Origami akan menangani bypass masif dengan mudah.'
    },
    release: {
      en: 'Watch the rapid drain directly onto the ice, freezing the volatile aromatics into the liquid instantly.',
      id: 'Saksikan aliran turun yang cepat langsung ke atas es, membekukan aromatik volatil ke dalam cairan seketika.'
    },
    finish: {
      en: 'Stir vigorously. The outcome is a hyper-bright, incredibly refreshing iced filter coffee.',
      id: 'Aduk dengan kuat. Hasilnya adalah es kopi filter yang sangat cerah dan luar biasa menyegarkan.'
    }
  },
  competition_hybrid_flow: {
    setup: {
      en: 'Seat a conical filter but prepare for a multi-stage thermal profile. Preheat the ceramic body heavily.',
      id: 'Pasang filter kerucut namun bersiaplah untuk profil termal multi-tahap. Panaskan keramik dengan intensif.'
    },
    entry: {
      en: 'Execute a massive, violently fast bloom. We are forcing immediate degassing.',
      id: 'Lakukan blooming yang masif dan luar biasa cepat. Kita memaksa degassing (pelepasan gas) instan.'
    },
    main: {
      en: 'Transition to incredibly slow, dripping center pulses. We shift from aggressive hydration to delicate percolation instantly.',
      id: 'Beralih ke pulsa tengah yang sangat lambat dan menetes. Kita pindah dari hidrasi agresif ke perkolasi halus seketika.'
    },
    release: {
      en: 'Observe the drawdown. The sudden flow shift traps the fines at the bottom while extracting pure sweetness at the top.',
      id: 'Amati penirisan. Perubahan aliran mendadak ini menjebak partikel halus di dasar sementara mengekstrak rasa manis murni di atas.'
    },
    finish: {
      en: 'Serve a championship-level cup possessing both soaring acidity and syrupy body simultaneously.',
      id: 'Sajikan secangkir kopi level kejuaraan yang memiliki asiditas menjulang sekaligus body sekental sirup.'
    }
  }
};;

const APRIL_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  april_flat_bottom_standard: {
    setup: {
      en: 'Place the April paper precisely. Rinse using minimal water to avoid adhering the filter sides to the steep brewer walls.',
      id: 'Pasang kertas April dengan presisi. Bilas menggunakan sedikit air agar sisi filter tidak menempel pada dinding brewer yang curam.'
    },
    entry: {
      en: 'Use circular blooming. The April’s unique base restricts flow, meaning the bloom water will pool heavily.',
      id: 'Gunakan blooming melingkar. Dasar April yang unik membatasi aliran, artinya air blooming akan menggenang tebal.'
    },
    main: {
      en: 'Execute large pours. The wide geometry demands significant slurry volume to extract the entire bed.',
      id: 'Lakukan tuangan besar terpisah. Geometri lebar menuntut volume seduhan untuk mengekstraksi seluruh hamparan.'
    },
    release: {
      en: 'Wait for the slow, controlled drawdown. The restricted base holes dictate the pace, creating a naturally dense extraction.',
      id: 'Tunggu penirisan lambat yang terkontrol. Lubang dasar yang terbatas mendikte kecepatan, menciptakan ekstraksi yang secara alami padat.'
    },
    finish: {
      en: 'Swirl perfectly. The April yields an impossibly sweet, highly balanced cup with structural clarity.',
      id: 'Putar sempurna. April menghasilkan cangkir yang luar biasa manis, sangat seimbang dengan kejernihan struktural.'
    }
  },
  april_continuous_slow: {
    setup: {
      en: 'Seat the filter carefully. Use a slightly coarser grind, as the prolonged contact time will extract aggressively.',
      id: 'Pasang filter dengan hati-hati. Gunakan gilingan sedikit lebih kasar, karena waktu kontak yang lama akan mengekstrak secara agresif.'
    },
    entry: {
      en: 'Bloom with zero agitation. We want the bed to remain structurally undisturbed.',
      id: 'Lakukan blooming tanpa agitasi (adukan). Kita ingin hamparan kopi secara struktural tidak terganggu.'
    },
    main: {
      en: 'Pour a continuous, remarkably slow stream dead-center. The goal is to build water depth without churning the bed below.',
      id: 'Tuang aliran lambat secara konstan tepat di tengah. Tujuannya adalah membangun kedalaman air tanpa mengaduk kopi di bawahnya.'
    },
    release: {
      en: 'Let gravity gently pull the high water column through the undisturbed bed. This is percolation in its purest form.',
      id: 'Biarkan gravitasi menarik lembut kolom air tinggi melewati hamparan yang tak terganggu. Ini adalah perkolasi dalam wujud paling murni.'
    },
    finish: {
      en: 'Expect a tea-like body with monumental sweetness and zero astringency.',
      id: 'Harapkan body menyerupai teh dengan rasa manis monumental dan tanpa rasa sepat.'
    }
  },
  competition_two_pour: {
    setup: {
      en: 'Prepare the filter. This method relies on high energy and extreme precision over exactly two massive pours.',
      id: 'Siapkan filter. Metode ini mengandalkan energi tinggi dan presisi ekstrem pada tepat dua tuangan masif.'
    },
    entry: {
      en: 'The first pour is exactly 50% of the water weight. Pour aggressively to create a turbulent, highly active slurry.',
      id: 'Tuangan pertama tepat 50% dari berat air. Tuang secara agresif untuk menciptakan seduhan yang bergolak dan sangat aktif.'
    },
    main: {
      en: 'At precisely the designated time, pour the remaining 50% with equal force. We are shock-extracting the coffee.',
      id: 'Pada waktu yang ditentukan secara presisi, tuang 50% sisanya dengan tenaga setara. Kita melakukan shock-extraction pada kopi.'
    },
    release: {
      en: 'The high volume forces a relatively fast drawdown despite the restricted base.',
      id: 'Volume tinggi memaksa penirisan relatif cepat meskipun dasar brewer memiliki pembatas.'
    },
    finish: {
      en: 'Serve an explosively vibrant cup, characterized by massive flavor separation and bright intensity.',
      id: 'Sajikan secangkir kopi dengan karakter meledak-ledak cerah, ditandai oleh separasi rasa masif dan intensitas terang.'
    }
  },
  iced_april_style: {
    setup: {
      en: 'Load your server with block ice. Place the April brewer securely on top with a rinsed filter.',
      id: 'Isi wadah saji Anda dengan es balok. Letakkan brewer April dengan aman di atasnya beserta filter yang sudah dibilas.'
    },
    entry: {
      en: 'Bloom the high dose with hot water. The flat bed ensures rapid, even hydration despite the heavy dose.',
      id: 'Blooming dosis tinggi dengan air panas. Alas datar memastikan hidrasi merata dan cepat meski dosisnya berat.'
    },
    main: {
      en: 'Execute short, concentrated hot pulses. Keep the slurry deep to maximize thermal retention before it drops onto the ice.',
      id: 'Lakukan tuangan panas pendek dan pekat. Jaga seduhan tetap dalam untuk memaksimalkan retensi termal sebelum jatuh ke atas es.'
    },
    release: {
      en: 'Watch the thick hot liquid cascade onto the ice, freezing the complex sugars into the final beverage.',
      id: 'Perhatikan cairan panas kental mengalir turun ke atas es, membekukan gula kompleks ke dalam minuman akhir.'
    },
    finish: {
      en: 'Swirl to finish chilling. The resulting iced coffee will be thick, profoundly sweet, and highly refreshing.',
      id: 'Putar untuk menyelesaikan pendinginan. Es kopi yang dihasilkan akan kental, luar biasa manis, dan sangat menyegarkan.'
    }
  },
  high_body_heavy_dose: {
    setup: {
      en: 'Use a larger dose and grind coarser. We are turning the April into a heavy-extraction device.',
      id: 'Gunakan dosis lebih besar dan giling lebih kasar. Kita mengubah April menjadi alat ekstraksi berat.'
    },
    entry: {
      en: 'Bloom patiently. A large dose requires significantly more time for water to penetrate the core.',
      id: 'Lakukan blooming dengan sabar. Dosis besar butuh waktu jauh lebih lama agar air menembus intinya.'
    },
    main: {
      en: 'Keep the water level low with multiple small pulses. This forces every drop to interact heavily with the dense bed.',
      id: 'Jaga batas air tetap rendah dengan banyak pulsa kecil. Ini memaksa setiap tetes berinteraksi berat dengan hamparan padat.'
    },
    release: {
      en: 'Allow a long, syrupy drawdown. The coarse grind prevents choking while the restricted base extends contact time.',
      id: 'Biarkan penirisan kental yang panjang. Gilingan kasar mencegah mampet, sementara dasar yang membatasi memperpanjang waktu kontak.'
    },
    finish: {
      en: 'Serve a robust, incredibly rich profile designed to showcase heavy body and intense sweetness.',
      id: 'Sajikan profil tangguh yang luar biasa kaya, dirancang untuk memamerkan body tebal dan rasa manis yang intens.'
    }
  }
};;

const MELITTA_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_melitta_one_pour: {
    setup: {
      en: 'Fold the seam of the Melitta filter flat. Rinse it carefully to adhere the paper to the steep wedge walls.',
      id: 'Lipat rata keliman filter Melitta. Bilas dengan hati-hati untuk menempelkan kertas ke dinding kerucut yang curam.'
    },
    entry: {
      en: 'Pour the entire bloom volume. The tiny hole restricts flow, essentially steeping the bloom.',
      id: 'Tuang volume blooming sepenuhnya. Lubang kecil membatasi aliran sehingga merendam kopi seketika.'
    },
    main: {
      en: 'Execute one smooth pour to fill the wedge. The Melitta manages its own flow rate via semi-immersion.',
      id: 'Tuang dengan mulus untuk memenuhi wedge. Melitta mengatur alirannya sendiri secara semi-imersif.'
    },
    release: {
      en: 'Leave it entirely alone. The small exit hole will govern the drawdown, slowly pulling the heavy extraction through the wedge.',
      id: 'Biarkan saja sepenuhnya. Lubang keluar kecil akan mengatur penirisan, perlahan menarik ekstraksi berat melewati bentuk kerucut.'
    },
    finish: {
      en: 'Serve a classic, profoundly dense cup. This vintage method provides incredible body and nostalgic sweetness.',
      id: 'Sajikan secangkir kopi klasik yang luar biasa padat. Metode lawas ini memberi body yang luar biasa dan rasa manis nostalgia.'
    }
  },
  aromaboy_style: {
    setup: {
      en: 'Use a fine grind for this micro-dose. The wedge geometry becomes heavily concentrated at small volumes.',
      id: 'Gunakan gilingan halus untuk dosis mikro ini. Geometri kerucut menjadi sangat terkonsentrasi pada volume kecil.'
    },
    entry: {
      en: 'Bloom with extreme precision. Every drop counts in a low-volume brew.',
      id: 'Lakukan blooming dengan presisi ekstrem. Setiap tetes berarti dalam seduhan volume kecil ini.'
    },
    main: {
      en: 'Pour in tight, tiny pulses. Do not wash the filter walls, keep the water strictly engaged with the central coffee mass.',
      id: 'Tuang dalam pulsa ketat dan kecil. Jangan membilas dinding filter, jaga air hanya berinteraksi dengan massa kopi tengah.'
    },
    release: {
      en: 'Watch the rapid drain. The small bed size forces a quick drawdown despite the restricted hole.',
      id: 'Perhatikan turunnya air secara cepat. Ukuran bed yang kecil memaksa penirisan kilat meskipun lubangnya terbatas.'
    },
    finish: {
      en: 'Serve a punchy, highly concentrated micro-batch that resembles espresso-like intensity.',
      id: 'Sajikan batch mikro yang tajam dan sangat terkonsentrasi menyerupai intensitas espresso.'
    }
  },
  three_pour_melitta: {
    setup: {
      en: 'Seat the filter and rinse. This method breaks the traditional single pour into three distinct thermal stages.',
      id: 'Pasang filter dan bilas. Metode ini memecah tuangan tunggal tradisional menjadi tiga tahap termal berbeda.'
    },
    entry: {
      en: 'Bloom the coffee. Stirring the bloom is recommended to ensure the wedge base has zero dry pockets.',
      id: 'Lakukan blooming. Mengaduk saat blooming sangat disarankan untuk memastikan dasar kerucut bebas dari kantong kering.'
    },
    main: {
      en: 'Pour first phase to 50%, let it drop slightly, then pour the rest to create mild agitation.',
      id: 'Tuang pertama hingga 50%, biarkan turun sedikit lalu tuang sisanya untuk menciptakan agitasi ringan.'
    },
    release: {
      en: 'Allow the final syrupy drawdown. The three pulses have extracted higher complexity than a continuous pour.',
      id: 'Biarkan penirisan kental terakhir terjadi. Tiga pulsa ini telah mengekstrak kompleksitas lebih tinggi daripada tuangan menerus.'
    },
    finish: {
      en: 'Integrate the carafe. Expect a balanced, highly structured profile with more acidity than standard Melitta brews.',
      id: 'Satukan isi karafe. Harapkan profil seimbang dan sangat terstruktur dengan asiditas lebih tinggi dari seduhan Melitta standar.'
    }
  },
  iced_melitta_brew: {
    setup: {
      en: 'Load a massive ice base into the server. The wedge shape will produce a hyper-concentrated hot liquid.',
      id: 'Masukkan dasar es batu yang masif ke dalam server. Bentuk kerucut akan menghasilkan cairan panas yang super-terkonsentrasi.'
    },
    entry: {
      en: 'Bloom quickly and hotly. We need to rip the fruit acids out of the coffee before the steep phase begins.',
      id: 'Blooming dengan cepat dan panas. Kita perlu menarik keluar asiditas buah dari kopi sebelum fase rendam dimulai.'
    },
    main: {
      en: 'Execute one slow continuous pour. The single hole bottlenecks the hot liquid, steeping it heavily.',
      id: 'Tuang lambat menerus. Lubang tunggal menahan cairan panas, merendamnya dengan berat.'
    },
    release: {
      en: 'The heavy, dark concentrate will slowly drip onto the ice, instantly cooling into a syrupy iced beverage.',
      id: 'Konsentrat tebal dan gelap akan menetes perlahan ke atas es, seketika mendingin menjadi minuman es yang kental.'
    },
    finish: {
      en: 'Swirl to melt the remaining ice. Serve a bold, uncompromising iced coffee.',
      id: 'Putar untuk mencairkan sisa es. Sajikan kopi es yang berani dan tanpa kompromi.'
    }
  },
  dense_classic_extraction: {
    setup: {
      en: 'Grind finer than normal and dose high. We are purposely slowing the Melitta to an absolute crawl.',
      id: 'Giling lebih halus dari biasanya dan gunakan dosis tinggi. Kita sengaja melambatkan Melitta hingga bergerak sangat pelan.'
    },
    entry: {
      en: 'Bloom gently. Do not agitate, as the fine particles will easily choke the single exit hole entirely.',
      id: 'Blooming dengan lembut. Jangan aduk, karena partikel halus akan dengan mudah menyumbat lubang keluar sepenuhnya.'
    },
    main: {
      en: 'Pour carefully to keep the water line low. We are executing a high-density percolation.',
      id: 'Tuang hati-hati untuk menjaga batas air rendah. Kita sedang melakukan perkolasi kepadatan tinggi.'
    },
    release: {
      en: 'Patience is required. The drawdown will take several minutes, acting like a slow-drip immersion.',
      id: 'Dibutuhkan kesabaran. Penirisan akan memakan waktu beberapa menit, bertindak layaknya imersi tetes-lambat.'
    },
    finish: {
      en: 'Serve a coffee of monumental thickness. This is an old-world profile focused purely on roast and body.',
      id: 'Sajikan kopi dengan ketebalan monumental. Ini adalah profil dunia-lama yang terfokus murni pada karakter sangrai dan body.'
    }
  }
};;

const KONO_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  kono_meimon_traditional: {
    setup: {
      en: 'Place the conical filter into the Kono. Ensure it adheres perfectly; the Kono’s lower ribs rely on an airtight seal at the top to control flow.',
      id: 'Pasang filter kerucut ke dalam Kono. Pastikan menempel sempurna; rusuk bawah Kono mengandalkan segel kedap udara di atas untuk mengatur aliran.'
    },
    entry: {
      en: 'Do not pour rapidly. Kono requires an ultra-slow bloom to hydrate the center.',
      id: 'Jangan tuang cepat. Kono mensyaratkan blooming lambat untuk menghidrasi tengah.'
    },
    main: {
      en: 'Maintain a very slow center pour. Water must permeate outward, extracting via capillary action.',
      id: 'Pertahankan tuangan tengah lambat. Air harus merembes keluar, mengekstrak via aksi kapiler.'
    },
    release: {
      en: 'Once the target volume is reached, let it drain. The airtight upper seal slows the drawdown dramatically, enhancing sweetness.',
      id: 'Setelah volume target tercapai, biarkan meniris. Segel kedap udara di atas melambatkan penirisan secara dramatis, meningkatkan rasa manis.'
    },
    finish: {
      en: 'Serve an astonishingly dense, syrupy cup. The Kono Meimon method produces unmatched body in pour-over brewing.',
      id: 'Sajikan cangkir yang luar biasa kental dan bersirup. Metode Kono Meimon menghasilkan body yang tak tertandingi dalam seduhan pour-over.'
    }
  },
  kono_dripper_standard: {
    setup: {
      en: 'Seat the filter and rinse lightly. We are utilizing the Kono as a hybrid dripper, balancing its restrictive flow with modern pouring.',
      id: 'Pasang filter dan bilas ringan. Kita menggunakan Kono sebagai dripper hibrida, menyeimbangkan aliran terbatasnya dengan tuangan modern.'
    },
    entry: {
      en: 'Execute a standard circular bloom. Ensure total wetness without flooding the restricted lower section.',
      id: 'Lakukan blooming melingkar standar. Pastikan kebasahan total tanpa membanjiri bagian bawah yang terbatas.'
    },
    main: {
      en: 'Pour in slow calculated pulses. Do not wash the filter edges to maintain the upper wall vacuum effect.',
      id: 'Tuang dalam pulsa lambat terhitung. Jangan bilas tepi filter untuk mempertahankan efek vakum dinding atas.'
    },
    release: {
      en: 'Watch the steady, controlled drawdown. The short lower ribs channel the heavy liquid cleanly into the server.',
      id: 'Amati penirisan stabil yang terkontrol. Rusuk bawah yang pendek menyalurkan cairan berat ini dengan bersih ke dalam server.'
    },
    finish: {
      en: 'Expect a highly balanced, structurally sound cup with pronounced sweetness and rounded acidity.',
      id: 'Harapkan cangkir yang sangat seimbang dan solid secara struktural dengan rasa manis menonjol dan asiditas membulat.'
    }
  },
  kono_slow_drip_body: {
    setup: {
      en: 'Prepare for absolute patience. The filter must seal tightly against the upper walls to block all bypass airflow.',
      id: 'Bersiaplah untuk kesabaran mutlak. Filter harus menyegel ketat dinding atas untuk memblokir seluruh aliran udara bypass.'
    },
    entry: {
      en: 'Drip water onto the grounds drop by drop until hydrated. This can take over a minute.',
      id: 'Teteskan air ke bubuk kopi tetes demi tetes hingga massa terhidrasi. Ini bisa memakan waktu semenit.'
    },
    main: {
      en: 'Keep water level brutally low. The extraction is forced through the dense core via osmotic pressure.',
      id: 'Jaga batas air sangat rendah. Ekstraksi dipaksa melalui inti kopi padat via tekanan osmotik.'
    },
    release: {
      en: 'The drawdown is an agonizingly slow seep. Do not agitate or tap the brewer.',
      id: 'Penirisannya adalah rembesan yang sangat lambat. Jangan mengaduk atau mengetuk brewer.'
    },
    finish: {
      en: 'Serve an essence-like concentrate. This legendary technique produces coffee that feels like liquid velvet on the palate.',
      id: 'Sajikan konsentrat layaknya esens. Teknik legendaris ini menghasilkan kopi yang terasa seperti beludru cair di lidah.'
    }
  },
  iced_kono_meimon: {
    setup: {
      en: 'Load ice into the server. The Kono’s inherently slow flow rate is ideal for building a powerful iced concentrate.',
      id: 'Isi server dengan es. Kecepatan aliran Kono yang secara alami lambat sangat ideal untuk membangun konsentrat es yang kuat.'
    },
    entry: {
      en: 'Bloom hot and center-focused. We need to instantly strip out the bright volatile aromatics from the dense grounds.',
      id: 'Blooming panas dan berpusat di tengah. Kita harus seketika menarik aromatik volatil cerah dari bubuk kopi padat ini.'
    },
    main: {
      en: 'Pour very slowly in the center. The lack of bypass ensures the hot water pulls maximum soluble mass before hitting the ice.',
      id: 'Tuang sangat lambat di tengah. Ketiadaan bypass memastikan air panas menarik massa terlarut maksimal sebelum menyentuh es.'
    },
    release: {
      en: 'The thick, syrupy hot liquid will slowly drip and flash-chill over the ice blocks.',
      id: 'Cairan panas kental dan bersirup akan menetes pelan dan mendingin kilat di atas blok es.'
    },
    finish: {
      en: 'Swirl to finish chilling. Serve a profound, heavy-bodied iced coffee with zero watery dilution.',
      id: 'Putar untuk merampungkan pendinginan. Sajikan kopi es ber-body berat yang mendalam tanpa jejak encer sama sekali.'
    }
  },
  kono_agitation_sweet: {
    setup: {
      en: 'Seat the filter but do not force an aggressive seal. We are using a coarser grind to allow some dynamic flow.',
      id: 'Pasang filter namun jangan memaksa segel yang agresif. Kita menggunakan gilingan lebih kasar untuk membiarkan aliran dinamis.'
    },
    entry: {
      en: 'Execute a fast, highly turbulent bloom. Immediately disrupt the typically calm Kono bed to unlock deep sweetness.',
      id: 'Lakukan blooming cepat bersuhu tinggi. Segera ganggu hamparan Kono yang biasanya tenang ini untuk membuka kemanisan mendalam.'
    },
    main: {
      en: 'Pour in aggressive concentric circles. The short ribs at the bottom will prevent choking despite the heavy agitation.',
      id: 'Tuang dalam lingkaran konsentris agresif. Rusuk pendek di dasar akan mencegah penyumbatan meskipun ada agitasi berat.'
    },
    release: {
      en: 'Expect a surprisingly fast drawdown for a Kono. The suspended fines will settle only at the very end.',
      id: 'Harapkan penirisan yang mengejutkan cepat untuk ukuran Kono. Partikel halus yang melayang baru akan mengendap di tahap paling akhir.'
    },
    finish: {
      en: 'Serve a radically different Kono profile: bright, highly separated, and vibrant, rather than simply heavy.',
      id: 'Sajikan profil Kono yang sama sekali berbeda: cerah, terpisah sangat baik, dan hidup, bukan sekadar berat.'
    }
  }
};;


function resolveUniversalShortTargetCue(targetProfileId?: string) {
  switch (targetProfileId) {
    case 'more_body':
      return { en: 'build a heavy, syrupy texture', id: 'membangun tekstur tebal dan berat' };
    case 'more_sweetness':
      return { en: 'extract deep, viscous sweetness', id: 'mengekstrak manis yang pekat' };
    case 'floral_transparent':
      return { en: 'protect delicate floral clarity', id: 'melindungi kejernihan floral yang lembut' };
    case 'fruit_forward':
      return { en: 'elevate vibrant fruit notes', id: 'mengangkat profil buah yang cerah' };
    case 'more_acidity':
      return { en: 'preserve bright structural acidity', id: 'mempertahankan keasaman terstruktur yang cerah' };
    case 'soft_round':
      return { en: 'create a smooth, rounded mouthfeel', id: 'menciptakan sensasi mulut yang halus dan bulat' };
    case 'dense_comforting':
      return { en: 'build a dense, comforting profile', id: 'membangun profil padat yang menenangkan' };
    case 'balance_clean':
    default:
      return { en: 'maintain absolute structural balance', id: 'mempertahankan keseimbangan struktural absolut' };
  }
}

function resolveUniversalShortRoastCue(roastLevel?: RoastLevel) {
  switch (roastLevel) {
    case 'light':
    case 'medium_light':
      return { en: 'push extraction for light roast density', id: 'dorong ekstraksi untuk kepadatan sangrai terang' };
    case 'medium_dark':
      return { en: 'manage thermal energy for medium-dark', id: 'kelola energi termal untuk sangrai medium-gelap' };
    case 'dark':
      return { en: 'limit agitation to prevent dark roast harshness', id: 'batasi agitasi untuk mencegah kepahitan sangrai gelap' };
    case 'medium':
    default:
      return { en: 'hold steady parameters for medium roast', id: 'tahan parameter stabil untuk sangrai medium' };
  }
}

function resolveContextualUniversalTutorialCopy(
  context: WorkflowTutorialContext,
  fallback: WorkflowTutorialCopy,
): WorkflowTutorialCopy {
  if (!context.targetProfileId && !context.roastLevel) return fallback;
  
  const targetCue = resolveUniversalShortTargetCue(context.targetProfileId);
  const roastCue = resolveUniversalShortRoastCue(context.roastLevel);
  
  switch (context.actionType) {
    case 'stir':
    case 'pour':
    case 'bloom':
    case 'charge':
      return {
        en: `${fallback.en} Execute to ${targetCue.en}; ${roastCue.en}.`,
        id: `${fallback.id} Lakukan untuk ${targetCue.id}; ${roastCue.id}.`,
      };
    case 'steep':
    case 'wait':
      return {
        en: `${fallback.en} Monitor carefully to ${targetCue.en}.`,
        id: `${fallback.id} Pantau saksama untuk ${targetCue.id}.`,
      };
    case 'decant':
    case 'release':
    case 'drawdown':
    case 'press':
      return {
        en: `${fallback.en} Control the flow to ${targetCue.en}.`,
        id: `${fallback.id} Kontrol aliran untuk ${targetCue.id}.`,
      };
    default:
      return fallback;
  }
}

export function resolveWorkflowTutorialDetail(context: WorkflowTutorialContext): string {
  const phase = resolveWorkflowTutorialPhase(context.actionType);
  const language = resolveWorkflowTutorialLanguage(context.language);

  if (context.methodFamily === 'french_press' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'auto' : context.recipeStyle;
    const styleProfile = FRENCH_PRESS_STYLE_TUTORIALS[styleKey];
    if (styleProfile) {
      const copy = resolveProfileTutorialCopy(styleProfile, context, phase);
      const contextualCopy = resolveContextualFrenchPressTutorialCopy(context, copy);
      return normalizeWorkflowTutorialCopy(contextualCopy[language], language);
    }
  }

  if (context.methodFamily === 'aeropress' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'standard' : context.recipeStyle;
    const styleProfile = AEROPRESS_STYLE_TUTORIALS[styleKey];
    if (styleProfile) {
      const copy = resolveProfileTutorialCopy(styleProfile, context, phase);
      const contextualCopy = resolveContextualAeroPressTutorialCopy(context, copy);
      return normalizeWorkflowTutorialCopy(contextualCopy[language], language);
    }
  }

  let profile = WORKFLOW_TUTORIALS[context.methodFamily] || WORKFLOW_TUTORIALS.v60;
  if (context.methodFamily === 'moka_pot' && context.recipeStyle) profile = MOKA_POT_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'cold_brew' && context.recipeStyle) profile = COLD_BREW_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'batch_brew' && context.recipeStyle) profile = BATCH_BREW_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'siphon' && context.recipeStyle) profile = SIPHON_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'origami' && context.recipeStyle) profile = ORIGAMI_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'april' && context.recipeStyle) profile = APRIL_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'melitta' && context.recipeStyle) profile = MELITTA_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'kono' && context.recipeStyle) profile = KONO_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'clever_dripper' && context.recipeStyle) profile = CLEVER_DRIPPER_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'chemex' && context.recipeStyle) profile = CHEMEX_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'kalita_wave' && context.recipeStyle) profile = KALITA_WAVE_STYLE_TUTORIALS[context.recipeStyle as any] || profile;
  if (context.methodFamily === 'hario_switch' && context.recipeStyle) profile = SWITCH_STYLE_TUTORIALS[context.recipeStyle as any] || profile;

  const copy = resolveProfileTutorialCopy(profile, context, phase);
  const contextualCopy = resolveContextualUniversalTutorialCopy(context, copy);
  
  return normalizeWorkflowTutorialCopy(contextualCopy[language], language);
}
