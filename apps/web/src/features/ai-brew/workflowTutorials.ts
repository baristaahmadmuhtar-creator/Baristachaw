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
      en: 'Watch the stream, yield, and time together; this is a starting point, not a shot guarantee.',
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
      en: 'Decant with absolute immediacy into a clean serving vessel; leaving coffee in the press guarantees over-extraction.',
      id: 'Tuang pisah seketika ke dalam bejana saji bersih; membiarkan kopi di alat menjamin ekstraksi berlebih.',
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
      en: 'Preheat the brewer, rinse the supplementary paper filter meticulously, and align it perfectly to guarantee vertical plunger travel.',
      id: 'Panaskan alat, bilas filter kertas tambahan secara teliti, dan sejajarkan dengan sempurna untuk menjamin pergerakan plunger vertikal.',
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
      en: 'Seat the fluted wave filter precisely and level the bed for hydrodynamic balance.',
      id: 'Pasang filter bergelombang dengan presisi dan ratakan hamparan kopi untuk keseimbangan hidrodinamis.'
    },
    entry: {
      en: 'Saturate the flat-bottom bed uniformly without flooding lateral zones.',
      id: 'Saturasi hamparan alas datar secara seragam tanpa membanjiri zona lateral.'
    },
    main: {
      en: 'Deploy three concentric, low-agitation pulses to maintain a shallow, stable slurry depth.',
      id: 'Terapkan tiga tuangan bertahap konsentris dan beragitasi rendah untuk menjaga kedalaman campuran kopi stabil dan dangkal.'
    },
    release: {
      en: 'Permit the bed to drain unimpeded through all three ports.',
      id: 'Biarkan hamparan meniris tanpa hambatan melewati ketiga lubang.'
    },
    finish: {
      en: 'Swirl to integrate the consistently sweet flat-bottom body.',
      id: 'Putar perlahan untuk mengintegrasikan karakteristik body manis yang konsisten dari alas datar.'
    }
  },
  competition_fast_four: {
    setup: {
      en: 'Seat the wave filter precisely; ensure the geometric ridges remain uncompressed.',
      id: 'Pasang filter gelombang secara presisi; pastikan lipatan geometris tetap tidak tertekan.'
    },
    entry: {
      en: 'Execute a rapid, aggressive bloom to force total saturation instantly.',
      id: 'Lakukan blooming agresif dan cepat untuk memaksa saturasi total seketika.'
    },
    main: {
      en: 'Deliver four rapid concentric pulses; rely on the filter geometry to mitigate bypass velocity.',
      id: 'Berikan empat tuangan bertahap konsentris yang cepat; andalkan geometri filter untuk meredam kecepatan bypass.'
    },
    release: {
      en: 'Expect a highly accelerated drawdown; do not intervene mechanically.',
      id: 'Antisipasi fase turun yang sangat terakselerasi; jangan mengintervensi secara mekanis.'
    },
    finish: {
      en: 'Swirl vigorously to homogenize the bright, vibrant, heavily agitated extraction.',
      id: 'Putar dengan kuat untuk menghomogenkan ekstraksi yang cerah, ceria, dan teragitasi berat.'
    }
  },
  continuous_slow_stream: {
    setup: {
      en: 'Seat the fluted wave filter precisely and strictly level the bed.',
      id: 'Pasang filter bergelombang dengan presisi dan ratakan hamparan dengan sangat ketat.'
    },
    entry: {
      en: 'Saturate uniformly, emphasizing a calm and undisturbed degassing phase.',
      id: 'Saturasi merata, menekankan fase pelepasan gas yang tenang dan tanpa gangguan.'
    },
    main: {
      en: 'Maintain a strict, slow center pour; allow the flat bottom geometry to passively disperse the water.',
      id: 'Pertahankan tuangan pusat yang sangat lambat; biarkan geometri alas datar menyebarkan air secara pasif.'
    },
    release: {
      en: 'Permit the column to recede gently; minimal agitation yields profound sweetness.',
      id: 'Biarkan kolom air menyusut perlahan; agitasi minimal menghasilkan rasa manis yang mendalam.'
    },
    finish: {
      en: 'Swirl lightly to integrate the exceptionally sweet, viscous body.',
      id: 'Putar perlahan untuk mengintegrasikan karakteristik body kental yang sangat manis.'
    }
  },
  iced_wave: {
    setup: {
      en: 'Load the server with precision-weighed ice; seat the wave filter and level the bed.',
      id: 'Isi wadah saji dengan es yang ditimbang presisi; pasang filter gelombang dan ratakan hamparan.'
    },
    entry: {
      en: 'Deploy a highly concentrated hot bloom to shock-extract volatile aromatics.',
      id: 'Terapkan blooming panas sangat pekat untuk mengekstraksi kejut aromatik volatil.'
    },
    main: {
      en: 'Execute tight concentric pulses, aggressively dissolving dense solids into the concentrate.',
      id: 'Lakukan tuangan bertahap konsentris rapat, secara agresif melarutkan padatan pekat ke dalam konsentrat.'
    },
    release: {
      en: 'Allow the concentrate to crash directly onto the ice, locking in fragile structural acidity.',
      id: 'Biarkan konsentrat jatuh langsung ke atas es, mengunci keasaman struktural yang rapuh.'
    },
    finish: {
      en: 'Agitate the carafe until the thermal equilibrium is completely achieved.',
      id: 'Agitasi teko kaca hingga keseimbangan termal benar-benar tercapai.'
    }
  },
  high_dose_concentrate: {
    setup: {
      en: 'Seat the fluted filter, accommodating the large thermal mass of the high dose.',
      id: 'Pasang filter bergelombang, sesuaikan dengan massa termal besar dari dosis tinggi tersebut.'
    },
    entry: {
      en: 'Saturate the deep bed slowly; allow significant time for comprehensive expansion.',
      id: 'Saturasi hamparan dalam tersebut secara perlahan; berikan waktu signifikan untuk ekspansi komprehensif.'
    },
    main: {
      en: 'Deliver slow concentric rings, strictly minimizing slurry elevation to prevent bypass over the heavy dose.',
      id: 'Berikan tuangan melingkar lambat, secara ketat meminimalkan elevasi campuran untuk mencegah bypass di atas dosis berat.'
    },
    release: {
      en: 'Expect a prolonged, viscous drawdown due to bed depth; avoid any mechanical agitation.',
      id: 'Antisipasi fase turun kental yang panjang karena kedalaman hamparan; hindari agitasi mekanis apa pun.'
    },
    finish: {
      en: 'Integrate the dense syrup completely before dilution or direct service.',
      id: 'Integrasikan sirup padat ini sepenuhnya sebelum pengenceran atau penyajian langsung.'
    }
  }
};

const CLEVER_DRIPPER_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  classic_closed: {
    setup: {
      en: 'Confirm the base valve is locked and seat the trapezoid filter securely.',
      id: 'Pastikan katup dasar terkunci dan pasang filter trapesium dengan kuat.'
    },
    entry: {
      en: 'Introduce water rapidly, ensuring complete and immediate saturation.',
      id: 'Masukkan air dengan cepat, pastikan saturasi yang lengkap dan instan.'
    },
    main: {
      en: 'Maintain a static steep; utilize a single crust-break if structural density is insufficient.',
      id: 'Pertahankan rendaman statis; gunakan satu kali pemecahan kerak jika kepadatan struktural dirasa kurang.'
    },
    release: {
      en: 'Engage the release mechanism on the server; gravity will perform the filtration.',
      id: 'Aktifkan mekanisme pelepasan pada wadah saji; gravitasi akan melakukan filtrasi.'
    },
    finish: {
      en: 'Remove precisely upon drawdown completion to avoid late-stage bitterness.',
      id: 'Angkat tepat saat fase turun selesai untuk menghindari rasa pahit tahap akhir.'
    }
  },
  reverse_water_first: {
    setup: {
      en: 'Confirm the base valve is locked and seat the trapezoid filter securely.',
      id: 'Pastikan katup dasar terkunci dan pasang filter trapesium dengan kuat.'
    },
    entry: {
      en: 'Fill the chamber with water prior to dosing; fold the dry coffee rapidly into the thermal mass.',
      id: 'Isi ruang seduh dengan air sebelum memasukkan kopi; lipat kopi kering dengan cepat ke dalam massa termal.'
    },
    main: {
      en: 'Maintain a static steep; the water-first protocol dramatically reduces drawdown choking.',
      id: 'Pertahankan rendaman statis; protokol air-lebih-dulu secara drastis mengurangi kemacetan fase turun.'
    },
    release: {
      en: 'Engage the release mechanism on the server; gravity will perform the filtration.',
      id: 'Aktifkan mekanisme pelepasan pada wadah saji; gravitasi akan melakukan filtrasi.'
    },
    finish: {
      en: 'Remove precisely upon drawdown completion to avoid late-stage bitterness.',
      id: 'Angkat tepat saat fase turun selesai untuk menghindari rasa pahit tahap akhir.'
    }
  },
  double_stage_hybrid: {
    setup: {
      en: 'Pre-wet the filter thoroughly and lock the valve for the initial closed phase.',
      id: 'Basahi filter secara menyeluruh dan kunci katup untuk fase awal tertutup.'
    },
    entry: {
      en: 'Perform a closed bloom to saturate the bed entirely, maximizing early gas release.',
      id: 'Lakukan blooming tertutup untuk membasahi hamparan sepenuhnya, memaksimalkan pelepasan gas awal.'
    },
    main: {
      en: 'Open the valve mid-brew for an active percolation phase to push higher extraction.',
      id: 'Buka katup di pertengahan seduhan untuk fase perkolasi aktif guna mendorong ekstraksi yang lebih tinggi.'
    },
    release: {
      en: 'Allow the hybrid structure to drain freely, combining immersion body with percolation clarity.',
      id: 'Biarkan struktur hibrida meniris bebas, menggabungkan body rendaman dengan kejernihan perkolasi.'
    },
    finish: {
      en: 'Swirl the final cup to integrate the complex dual-extraction profile.',
      id: 'Putar cangkir akhir untuk menyatukan profil ekstraksi ganda yang kompleks.'
    }
  },
  iced_clever: {
    setup: {
      en: 'Load ice directly into the server; lock the dripper valve for the hot concentrate phase.',
      id: 'Masukkan es langsung ke wadah saji; kunci katup alat seduh untuk fase konsentrat panas.'
    },
    entry: {
      en: 'Steep the grounds in minimal hot water to create a hyper-dense, rapid extraction environment.',
      id: 'Rendam bubuk dalam sedikit air panas untuk menciptakan lingkungan ekstraksi cepat yang super padat.'
    },
    main: {
      en: 'Maintain the short hot steep to lock in aromatics before the rapid chill.',
      id: 'Pertahankan rendaman panas singkat untuk mengunci aromatik sebelum pendinginan cepat.'
    },
    release: {
      en: 'Release the dense concentrate directly over the ice, flashing it to preserve acidity.',
      id: 'Lepaskan konsentrat padat langsung ke atas es, mengejutkannya untuk mempertahankan keasaman.'
    },
    finish: {
      en: 'Stir vigorously to verify full thermal stabilization of the iced beverage.',
      id: 'Aduk dengan kuat untuk memverifikasi stabilisasi termal penuh pada minuman dingin.'
    }
  },
  high_dose_concentrate: {
    setup: {
      en: 'Secure the filter for a high-capacity load, ensuring the valve remains securely locked.',
      id: 'Pasang filter untuk kapasitas besar, pastikan katup tetap terkunci rapat.'
    },
    entry: {
      en: 'Saturate the massive dose heavily; agitate immediately to prevent dry pockets.',
      id: 'Basahi dosis besar secara ekstensif; agitasi seketika untuk mencegah kantung kering.'
    },
    main: {
      en: 'Execute a prolonged steep time to penetrate the thick crust and maximize total dissolved solids.',
      id: 'Lakukan waktu rendam yang panjang untuk menembus kerak tebal dan memaksimalkan total padatan terlarut.'
    },
    release: {
      en: 'Release the valve; anticipate an extended drawdown due to the extreme bed depth.',
      id: 'Lepaskan katup; antisipasi fase turun yang lama akibat kedalaman hamparan yang ekstrem.'
    },
    finish: {
      en: 'Dilute the intense concentrate to strength or serve directly over dense ice blocks.',
      id: 'Encerkan konsentrat pekat ini sesuai selera atau sajikan langsung di atas balok es padat.'
    }
  }
};

const CHEMEX_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_three_pour: {
    setup: {
      en: 'Rinse the bonded thick paper rigorously to clear the spout vent.',
      id: 'Bilas kertas tebal secara ketat untuk membersihkan ventilasi cerat.'
    },
    entry: {
      en: 'Execute a patient bloom phase; thorough saturation is critical due to filter density.',
      id: 'Lakukan fase blooming dengan sabar; saturasi menyeluruh sangat krusial karena kepadatan filter.'
    },
    main: {
      en: 'Deliver measured pulses, maintaining the water column strictly away from the upper wall.',
      id: 'Berikan tuangan bertahap yang terukur, jaga kolom air menjauh dari dinding atas.'
    },
    release: {
      en: 'Respect the extended drawdown window inherent to bonded filters.',
      id: 'Hargai durasi fase turun yang panjang pada filter kertas tebal.'
    },
    finish: {
      en: 'Gently homogenize the carafe; extended contact time naturally stratifies the layers.',
      id: 'Homogenisasi teko kaca secara perlahan; waktu kontak panjang secara alami menstratifikasi lapisan rasa.'
    }
  },
  continuous_center_pour: {
    setup: {
      en: 'Rinse the bonded thick paper rigorously to clear the spout vent.',
      id: 'Bilas kertas tebal secara ketat untuk membersihkan ventilasi cerat.'
    },
    entry: {
      en: 'Execute a patient bloom phase; thorough saturation is critical due to filter density.',
      id: 'Lakukan fase blooming dengan sabar; saturasi menyeluruh sangat krusial karena kepadatan filter.'
    },
    main: {
      en: 'Utilize a slow, continuous laminar pour to sustain high thermal mass and push clarity.',
      id: 'Gunakan tuangan laminar lambat yang kontinu untuk mempertahankan massa termal tinggi dan mendorong kejernihan.'
    },
    release: {
      en: 'Respect the extended drawdown window inherent to bonded filters.',
      id: 'Hargai durasi fase turun yang panjang pada filter kertas tebal.'
    },
    finish: {
      en: 'Gently homogenize the carafe; extended contact time naturally stratifies the layers.',
      id: 'Homogenisasi teko kaca secara perlahan; waktu kontak panjang secara alami menstratifikasi lapisan rasa.'
    }
  },
  competition_multi_pulse: {
    setup: {
      en: 'Set the thick bonded filter securely, aligning the multi-layer side precisely with the pouring spout.',
      id: 'Pasang filter tebal dengan kuat, sejajarkan sisi berlapis tepat dengan ventilasi cerat.'
    },
    entry: {
      en: 'Implement an aggressive, high-turbulence bloom to maximize gas displacement rapidly.',
      id: 'Terapkan blooming turbulensi tinggi yang agresif untuk memaksimalkan pelepasan gas secara cepat.'
    },
    main: {
      en: 'Execute precise, rhythmic multi-pulse pours to maintain a consistent shallow bed and high extraction.',
      id: 'Lakukan tuangan bertahap yang ritmis dan presisi untuk mempertahankan hamparan dangkal dan ekstraksi tinggi.'
    },
    release: {
      en: 'Allow the structured multi-stage drawdown to filter heavily into a remarkably clean cup.',
      id: 'Biarkan fase turun bertahap terstruktur menyaring kuat menjadi cangkir yang luar biasa bersih.'
    },
    finish: {
      en: 'Swirl vigorously to unify the complex micro-extractions into a cohesive profile.',
      id: 'Putar dengan kuat untuk menyatukan ekstraksi mikro yang kompleks menjadi profil yang kohesif.'
    }
  },
  iced_chemex: {
    setup: {
      en: 'Pre-weigh large ice cubes into the lower chamber; seat the filter avoiding thermal shock to the glass.',
      id: 'Timbang presisi es batu besar ke ruang bawah; pasang filter dengan menghindari kejut termal pada kaca.'
    },
    entry: {
      en: 'Bloom hot and dense to immediately capture volatile floral and fruit aromatics.',
      id: 'Lakukan blooming panas dan padat untuk segera menangkap aromatik bunga dan buah yang volatil.'
    },
    main: {
      en: 'Pour aggressively to maintain brewing temperature against the extreme cooling gradient.',
      id: 'Tuang agresif untuk mempertahankan suhu seduh di tengah gradien pendinginan yang ekstrem.'
    },
    release: {
      en: 'The heavy filter guarantees maximum clarity as the concentrate crashes directly onto ice.',
      id: 'Filter tebal menjamin kejernihan maksimum saat konsentrat membentur es secara langsung.'
    },
    finish: {
      en: 'Swirl aggressively until the thermal shock is complete and the slurry is perfectly chilled.',
      id: 'Putar agresif hingga kejut termal selesai dan campuran mendingin sempurna.'
    }
  },
  high_dose_heavy_body: {
    setup: {
      en: 'Pre-wet extensively to warm the large thermal mass of the heavy-capacity carafe.',
      id: 'Bilas ekstensif untuk memanaskan massa termal besar dari teko kaca kapasitas tinggi.'
    },
    entry: {
      en: 'Saturate the massive dose completely using a controlled, high-volume spiral pour.',
      id: 'Basahi dosis masif sepenuhnya menggunakan tuangan spiral volume tinggi yang terkontrol.'
    },
    main: {
      en: 'Push the extraction with heavy, slow continuous center-to-mid pours to drive body and sweetness.',
      id: 'Dorong ekstraksi dengan tuangan berat lambat yang kontinu untuk memicu body dan rasa manis.'
    },
    release: {
      en: 'Monitor the prolonged drawdown carefully; a flat bed ensures no late-stage astringency.',
      id: 'Pantau fase turun panjang dengan saksama; hamparan rata memastikan ketiadaan rasa sepat akhir.'
    },
    finish: {
      en: 'Integrate the heavy, layered extraction thoroughly before serving into pre-warmed cups.',
      id: 'Integrasikan ekstraksi pekat berlapis secara menyeluruh sebelum menyajikan ke cangkir hangat.'
    }
  }
};

const MOKA_POT_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  low_temp_controlled: {
    setup: {
      en: 'Maintain a minimal initial water temperature to deliberately slow the pressure curve.',
      id: 'Pertahankan suhu air awal yang minim untuk sengaja memperlambat kurva tekanan.'
    },
    entry: {
      en: 'Use low thermal energy to stretch the extraction window for maximum sweetness.',
      id: 'Gunakan energi termal rendah untuk memperpanjang waktu ekstraksi demi rasa manis maksimal.'
    },
    main: {
      en: 'Control the flow so it emerges as a thick, continuous syrupy thread.',
      id: 'Kendalikan aliran agar muncul sebagai benang sirup tebal yang kontinu.'
    },
    release: {
      en: 'Halt the process before any violent sputtering introduces harsh astringency.',
      id: 'Hentikan proses sebelum semburan keras memasukkan rasa sepat yang tajam.'
    },
    finish: {
      en: 'Integrate the concentrated extraction smoothly before dividing into warmed cups.',
      id: 'Integrasikan ekstraksi konsentrat dengan mulus sebelum membaginya ke cangkir hangat.'
    }
  },
  iced_moka_concentrate: {
    setup: {
      en: 'Prepare a dense dose for a potent concentrate designed to survive ice dilution.',
      id: 'Siapkan dosis padat untuk konsentrat kuat yang dirancang bertahan dari pengenceran es.'
    },
    entry: {
      en: 'Extract aggressively to pull heavy origin characteristics rapidly.',
      id: 'Ekstrak secara agresif untuk menarik karakteristik asal yang pekat dengan cepat.'
    },
    main: {
      en: 'Monitor the dark extrusion; you need maximum body to punch through the chill.',
      id: 'Pantau ekstrusi gelap; Anda butuh body maksimal untuk menembus suhu dingin.'
    },
    release: {
      en: 'Stop the flow early to capture only the sweetest, most concentrated phase.',
      id: 'Hentikan aliran lebih awal untuk menangkap hanya fase paling manis dan terkonsentrasi.'
    },
    finish: {
      en: 'Pour the intense shot directly over pristine ice blocks for instant chilling.',
      id: 'Tuang tegukan intens langsung di atas balok es murni untuk pendinginan instan.'
    }
  },
  high_yield_robust: {
    setup: {
      en: 'Pack the basket slightly firmer to increase resistance and drive up contact time.',
      id: 'Padatkan keranjang sedikit lebih kuat untuk menaikkan resistensi dan waktu kontak.'
    },
    entry: {
      en: 'Apply strong heat to force water through the compacted bed efficiently.',
      id: 'Berikan panas kuat untuk memaksa air melewati hamparan padat secara efisien.'
    },
    main: {
      en: 'Allow the extraction to push a higher volume, maximizing total dissolved material.',
      id: 'Biarkan ekstraksi mendorong volume lebih tinggi, memaksimalkan total material terlarut.'
    },
    release: {
      en: 'Cut the heat just as the flow accelerates, capturing the full spectrum of heavy notes.',
      id: 'Matikan pemanas tepat saat aliran bertambah cepat, menangkap spektrum penuh nada berat.'
    },
    finish: {
      en: 'Stir well; this profile delivers an exceptionally heavy and robust structure.',
      id: 'Aduk rata; profil ini memberikan struktur yang luar biasa berat dan kokoh.'
    }
  },
  traditional_stovetop: {
    setup: {
      en: 'Fill boiler precisely below the valve; dose loosely without compression.',
      id: 'Isi boiler persis di bawah katup; masukkan kopi longgar tanpa kompresi.'
    },
    entry: {
      en: 'Apply moderate thermal energy to build vapor pressure linearly.',
      id: 'Berikan energi termal moderat untuk membangun tekanan uap secara linear.'
    },
    main: {
      en: 'Monitor the spout; target a steady, honey-like viscous extrusion.',
      id: 'Pantau cerat alat; targetkan ekstrusi stabil yang kental seperti madu.'
    },
    release: {
      en: 'Quench the boiler rapidly in cold water immediately upon sputtering.',
      id: 'Dinginkan boiler dengan cepat di air dingin tepat saat muncul semburan gas.'
    },
    finish: {
      en: 'Homogenize the aggressive extraction profile before service.',
      id: 'Homogenisasi profil ekstraksi yang agresif sebelum disajikan.'
    }
  },
  preheated_boiler: {
    setup: {
      en: 'Charge the boiler with pre-boiled water to minimize ground thermal degradation; handle with caution.',
      id: 'Isi boiler dengan air yang sudah mendidih untuk meminimalkan degradasi termal kopi; tangani dengan hati-hati.'
    },
    entry: {
      en: 'Seal the hot chamber and apply low heat; pressure will build almost instantaneously.',
      id: 'Tutup ruang panas dan gunakan api kecil; tekanan akan terbangun seketika.'
    },
    main: {
      en: 'Monitor the spout; target a steady, honey-like viscous extrusion.',
      id: 'Pantau cerat alat; targetkan ekstrusi stabil yang kental seperti madu.'
    },
    release: {
      en: 'Quench the boiler rapidly in cold water immediately upon sputtering.',
      id: 'Dinginkan boiler dengan cepat di air dingin tepat saat muncul semburan gas.'
    },
    finish: {
      en: 'Homogenize the aggressive extraction profile before service.',
      id: 'Homogenisasi profil ekstraksi yang agresif sebelum disajikan.'
    }
  }
};

const COLD_BREW_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  cold_drip_tower: {
    setup: {
      en: 'Calibrate the drip valve for an incredibly slow, precise dripping rate.',
      id: 'Kalibrasi katup tetes untuk tingkat tetesan yang sangat lambat dan presisi.'
    },
    entry: {
      en: 'Pre-wet the bed slightly to ensure the initial drops channel evenly.',
      id: 'Basahi hamparan sedikit untuk memastikan tetesan awal tersalurkan merata.'
    },
    main: {
      en: 'Maintain the slow drip over several hours to build a delicate, wine-like clarity.',
      id: 'Pertahankan tetesan lambat selama beberapa jam untuk membangun kejernihan layaknya anggur.'
    },
    release: {
      en: 'Adjust the valve periodically if the water head pressure decreases.',
      id: 'Sesuaikan katup secara berkala jika tekanan atas air menurun.'
    },
    finish: {
      en: 'Swirl the collection vessel to homogenize the layered slow-drip extraction.',
      id: 'Putar wadah penampung untuk menghomogenisasi ekstraksi tetes lambat yang berlapis.'
    }
  },
  double_extraction_concentrate: {
    setup: {
      en: 'Prepare a massive dose for a hyper-concentrated dual-stage steep.',
      id: 'Siapkan dosis masif untuk rendaman dua tahap yang super pekat.'
    },
    entry: {
      en: 'Initiate the first immersion phase in an ambient environment for rapid solubility.',
      id: 'Mulai fase rendaman pertama di lingkungan suhu ruang untuk kelarutan cepat.'
    },
    main: {
      en: 'Transfer to a chilled environment for the extended second phase of extraction.',
      id: 'Pindahkan ke lingkungan dingin untuk fase ekstraksi kedua yang diperpanjang.'
    },
    release: {
      en: 'Filter the dense sludge carefully to separate the heavy liquid completely.',
      id: 'Saring lumpur padat dengan hati-hati untuk memisahkan cairan kental sepenuhnya.'
    },
    finish: {
      en: 'Store the intense concentrate; dilute aggressively with chilled water before service.',
      id: 'Simpan konsentrat pekat; encerkan secara agresif dengan air dingin sebelum disajikan.'
    }
  },
  accelerated_room_temp: {
    setup: {
      en: 'Set up the vessel in a warm ambient space to drastically accelerate the steeping process.',
      id: 'Siapkan wadah di ruang bersuhu hangat untuk mempercepat proses rendaman secara drastis.'
    },
    entry: {
      en: 'Mix the dose thoroughly with room temperature water to kickstart oxidation.',
      id: 'Campur dosis secara menyeluruh dengan air suhu ruang untuk memulai oksidasi.'
    },
    main: {
      en: 'Allow the elevated temperature to cut the standard immersion time in half.',
      id: 'Biarkan suhu yang lebih tinggi memotong waktu rendaman standar menjadi setengahnya.'
    },
    release: {
      en: 'Decant early to prevent the warmer environment from extracting woody notes.',
      id: 'Tuang lebih awal untuk mencegah lingkungan hangat mengekstraksi nada kayu.'
    },
    finish: {
      en: 'Flash chill the resulting liquid immediately to lock in the bright profile.',
      id: 'Dinginkan cairan yang dihasilkan secara cepat untuk mengunci profil yang cerah.'
    }
  },
  japanese_slow_drip: {
    setup: {
      en: 'Prepare the slow-drip apparatus with a precision-leveled fine grind bed.',
      id: 'Siapkan alat tetes lambat dengan hamparan gilingan halus yang diratakan presisi.'
    },
    entry: {
      en: 'Begin the drip sequence; the initial drops will heavily saturate the upper crust.',
      id: 'Mulai urutan tetesan; tetesan awal akan sangat membasahi kerak bagian atas.'
    },
    main: {
      en: 'Let the steady percolation slowly pull out nuanced, highly aromatic compounds.',
      id: 'Biarkan perkolasi stabil secara perlahan menarik senyawa aromatik yang sangat bernuansa.'
    },
    release: {
      en: 'Monitor the drip rate; consistent timing is key to avoiding over-extraction.',
      id: 'Pantau laju tetesan; pengaturan waktu yang konsisten adalah kunci menghindari ekstraksi berlebih.'
    },
    finish: {
      en: 'Gently mix the final carafe; the result is an exceptionally crisp, clean beverage.',
      id: 'Campur teko akhir dengan lembut; hasilnya adalah minuman yang luar biasa renyah dan bersih.'
    }
  },
  classic_toddy_immersion: {
    setup: {
      en: 'Utilize an exceptionally coarse grind and a sanitized, high-volume vessel.',
      id: 'Gunakan gilingan yang sangat kasar dan wadah bervolume tinggi yang higienis.'
    },
    entry: {
      en: 'Introduce cold water incrementally; meticulously fold dry pockets beneath the surface.',
      id: 'Masukkan air dingin secara bertahap; lipat dengan teliti bagian kering ke bawah permukaan.'
    },
    main: {
      en: 'Execute a prolonged, static steep; eliminate mid-cycle mechanical agitation.',
      id: 'Lakukan rendaman statis yang panjang; hindari sama sekali pengadukan mekanis di pertengahan siklus.'
    },
    release: {
      en: 'Filter the concentrate with extreme delicacy to prevent forcing microscopic fines.',
      id: 'Saring konsentrat dengan sangat hati-hati untuk mencegah terdorongnya partikel halus mikroskopis.'
    },
    finish: {
      en: 'Dilute the intense concentrate strictly to target TDS and homogenize thoroughly.',
      id: 'Encerkan konsentrat pekat secara presisi mencapai target TDS dan homogenisasi menyeluruh.'
    }
  },
  japanese_flash_chill: {
    setup: {
      en: 'Calculate ice mass precisely and place it directly inside the receiving vessel.',
      id: 'Hitung massa es secara presisi dan letakkan langsung di dalam wadah penerima.'
    },
    entry: {
      en: 'Execute a standard hot bloom to rapidly extract highly volatile aromatics.',
      id: 'Lakukan blooming panas standar untuk mengekstrak aromatik yang sangat volatil secara cepat.'
    },
    main: {
      en: 'Brew directly over the ice mass; the immediate thermal shock locks in complex acidity.',
      id: 'Seduh langsung di atas es; kejutan termal instan mengunci keasaman kompleks.'
    },
    release: {
      en: 'Permit the hot drawdown to completely melt the target ice ratio.',
      id: 'Biarkan fase turun panas sepenuhnya mencairkan rasio es target.'
    },
    finish: {
      en: 'Homogenize immediately; serve a hyper-clean, intensely aromatic flash-chilled extraction.',
      id: 'Homogenisasi segera; sajikan ekstraksi kilat-dingin yang super bersih dan sangat aromatik.'
    }
  }
};

const BATCH_BREW_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  heavy_batch_catering: {
    setup: {
      en: 'Install a heavy-duty commercial filter to support the massive volume load.',
      id: 'Pasang filter komersial tugas berat untuk menopang beban volume yang masif.'
    },
    entry: {
      en: 'Ensure the spray head fully covers the large dose for even initial saturation.',
      id: 'Pastikan kepala semprotan menutupi dosis besar sepenuhnya untuk saturasi awal merata.'
    },
    main: {
      en: 'The machine will execute a prolonged continuous flow to maintain high temperatures.',
      id: 'Mesin akan menjalankan aliran kontinu panjang untuk mempertahankan suhu tinggi.'
    },
    release: {
      en: 'Wait for the final drips; large batches require extra time for complete drainage.',
      id: 'Tunggu tetesan terakhir; batch besar membutuhkan waktu ekstra untuk penirisan lengkap.'
    },
    finish: {
      en: 'Mix the thermal urn vigorously to prevent flavor stratification in large volumes.',
      id: 'Aduk teko termal dengan kuat untuk mencegah stratifikasi rasa dalam volume besar.'
    }
  },
  bright_light_roast_batch: {
    setup: {
      en: 'Use a clean white paper filter to avoid masking delicate high-altitude aromatics.',
      id: 'Gunakan filter kertas putih bersih untuk menghindari menutupi aromatik dataran tinggi yang halus.'
    },
    entry: {
      en: 'Program a distinct initial wetting phase to properly degas the dense light roast.',
      id: 'Program fase pembasahan awal yang jelas untuk membuang gas dari sangraian ringan yang padat.'
    },
    main: {
      en: 'Pulse the delivery to maintain an optimal temperature curve for acidic clarity.',
      id: 'Beri tuangan berdenyut untuk menjaga kurva suhu optimal demi kejernihan asam.'
    },
    release: {
      en: 'Allow the bright, crisp extraction to drain fully without rushing the process.',
      id: 'Biarkan ekstraksi renyah dan cerah meniris penuh tanpa mempercepat proses.'
    },
    finish: {
      en: 'Serve immediately to capture the fleeting floral and volatile fruit esters.',
      id: 'Sajikan segera untuk menangkap ester buah volatil dan bunga yang cepat pudar.'
    }
  },
  pre_wet_hybrid_batch: {
    setup: {
      en: 'Seat the filter and prepare the machine for a heavily customized manual-style profile.',
      id: 'Pasang filter dan siapkan mesin untuk profil gaya manual yang sangat disesuaikan.'
    },
    entry: {
      en: 'The initial heavy wetting phase mimics a manual immersion bloom perfectly.',
      id: 'Fase pembasahan berat awal meniru blooming rendaman manual dengan sempurna.'
    },
    main: {
      en: 'Intermittent pulses will balance the extended immersion with fresh percolation.',
      id: 'Tuangan berdenyut sesekali akan menyeimbangkan rendaman panjang dengan perkolasi segar.'
    },
    release: {
      en: 'The hybrid approach yields a slightly extended but highly controlled drainage.',
      id: 'Pendekatan hibrida ini menghasilkan penirisan yang sedikit lebih lama namun sangat terkendali.'
    },
    finish: {
      en: 'Homogenize the brew; expect a complex cup marrying body with distinct clarity.',
      id: 'Homogenisasi seduhan; harapkan cangkir kompleks yang memadukan body dengan kejernihan khas.'
    }
  },
  high_extraction_thermos: {
    setup: {
      en: 'Pre-heat the thermal carafe extensively to maintain the highly extracted profile.',
      id: 'Panaskan teko termal secara ekstensif untuk mempertahankan profil ekstraksi tinggi.'
    },
    entry: {
      en: 'Deliver water rapidly to raise the bed temperature to absolute maximum early on.',
      id: 'Berikan air dengan cepat untuk menaikkan suhu hamparan ke batas maksimum absolut sejak awal.'
    },
    main: {
      en: 'Maintain a high flow rate to force solubility across the deeply packed bed.',
      id: 'Pertahankan laju aliran tinggi untuk memaksa kelarutan melintasi hamparan yang dikemas dalam.'
    },
    release: {
      en: 'Let the heavy extraction complete its course into the insulated container.',
      id: 'Biarkan ekstraksi berat menyelesaikan jalurnya ke dalam wadah berinsulasi.'
    },
    finish: {
      en: 'Seal the thermos immediately to lock in the intense, high-yield aromatics.',
      id: 'Tutup rapat termos segera untuk mengunci aromatik hasil tinggi yang intens.'
    }
  },
  sca_gold_cup: {
    setup: {
      en: 'Distribute the grounds perfectly level and verify volumetric programming.',
      id: 'Distribusikan kopi rata sempurna dan verifikasi program volumetrik.'
    },
    entry: {
      en: 'Engage the cycle; ensure the initial showerhead dispersion provides homogenous pre-wetting.',
      id: 'Mulai siklus; pastikan dispersi awal pancuran mesin memberikan pembasahan awal homogen.'
    },
    main: {
      en: 'Observe the slurry dynamics; automated rhythm must maintain stable depth.',
      id: 'Amati dinamika campuran kopi; ritme otomatis harus mempertahankan kedalaman stabil.'
    },
    release: {
      en: 'Wait for the final hydrostatic drawdown to terminate completely.',
      id: 'Tunggu hingga penirisan hidrostatik akhir berhenti sepenuhnya.'
    },
    finish: {
      en: 'Vigorously mix the thermal carafe to integrate stratified extraction phases.',
      id: 'Aduk teko termal dengan kuat untuk mengintegrasikan fase ekstraksi yang terstratifikasi.'
    }
  }
};

const SIPHON_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  competition_triple_agitation: {
    setup: {
      en: 'Secure the tensioned filter assembly and preheat the lower globe.',
      id: 'Kunci rakitan filter bertekanan dan panaskan tabung bawah.'
    },
    entry: {
      en: 'Introduce the dose and execute the first aggressive agitation to maximize saturation.',
      id: 'Masukkan dosis dan jalankan agitasi agresif pertama untuk memaksimalkan saturasi.'
    },
    main: {
      en: 'Perform the second precise agitation mid-steep to actively disrupt thermal layers.',
      id: 'Lakukan agitasi presisi kedua di pertengahan rendaman untuk mengacaukan lapisan termal secara aktif.'
    },
    release: {
      en: 'Cut the heat and perform the final violent stir to create a perfect centrifugal dome.',
      id: 'Matikan pemanas dan lakukan adukan keras terakhir untuk menciptakan kubah sentrifugal sempurna.'
    },
    finish: {
      en: 'Watch the rapid vacuum pullback deliver an incredibly structured, competition-level cup.',
      id: 'Perhatikan tarikan vakum cepat menghasilkan cangkir tingkat kompetisi yang sangat terstruktur.'
    }
  },
  low_temp_delicate: {
    setup: {
      en: 'Secure the tensioned filter assembly and preheat the lower globe.',
      id: 'Kunci rakitan filter bertekanan dan panaskan tabung bawah.'
    },
    entry: {
      en: 'Lower the heat source significantly before introducing the coffee for a gentle start.',
      id: 'Turunkan sumber panas secara signifikan sebelum memasukkan kopi untuk awalan yang lembut.'
    },
    main: {
      en: 'Maintain barely-simmering water to extract only the most delicate, volatile esters.',
      id: 'Pertahankan air yang hampir tidak mendidih untuk mengekstraksi hanya ester volatil yang paling halus.'
    },
    release: {
      en: 'Remove the heat and allow a gentle, unforced vacuum descent.',
      id: 'Singkirkan pemanas dan biarkan penurunan vakum yang lembut dan tanpa paksaan.'
    },
    finish: {
      en: 'Serve the exceptionally tea-like, transparent extraction immediately.',
      id: 'Sajikan ekstraksi transparan yang luar biasa mirip teh ini segera.'
    }
  },
  high_body_fast_drawdown: {
    setup: {
      en: 'Secure the tensioned filter assembly and preheat the lower globe.',
      id: 'Kunci rakitan filter bertekanan dan panaskan tabung bawah.'
    },
    entry: {
      en: 'Drop the dose into rolling water and stir vigorously to force immediate extraction.',
      id: 'Masukkan dosis ke dalam air bergejolak dan aduk kuat untuk memaksa ekstraksi seketika.'
    },
    main: {
      en: 'Keep the steep time extremely brief to focus entirely on heavy early-stage compounds.',
      id: 'Jaga waktu rendaman sangat singkat untuk fokus sepenuhnya pada senyawa tahap awal yang berat.'
    },
    release: {
      en: 'Remove heat quickly and apply a cool towel to force a violently rapid vacuum drop.',
      id: 'Singkirkan panas dengan cepat dan tempelkan handuk dingin untuk memaksa penurunan vakum yang sangat cepat.'
    },
    finish: {
      en: 'The resulting cup will possess massive body and an intensely concentrated structure.',
      id: 'Cangkir yang dihasilkan akan memiliki body masif dan struktur terkonsentrasi yang intens.'
    }
  },
  spirit_infusion_style: {
    setup: {
      en: 'Secure the tensioned filter assembly and preheat the lower globe.',
      id: 'Kunci rakitan filter bertekanan dan panaskan tabung bawah.'
    },
    entry: {
      en: 'Introduce the dose alongside botanical elements into the rising liquid chamber.',
      id: 'Masukkan dosis bersama elemen botani ke dalam ruang cairan yang naik.'
    },
    main: {
      en: 'Allow the combined ingredients to steep, blending complex aromatics in the upper globe.',
      id: 'Biarkan bahan gabungan meresap, memadukan aromatik kompleks di tabung atas.'
    },
    release: {
      en: 'Cut the heat to pull the infused mixture rapidly through the tight filter.',
      id: 'Matikan pemanas untuk menarik campuran infus dengan cepat melewati filter ketat.'
    },
    finish: {
      en: 'Swirl the highly aromatic, complex botanical infusion before careful service.',
      id: 'Putar infus botani yang kompleks dan sangat aromatis sebelum disajikan dengan hati-hati.'
    }
  },
  traditional_vacuum_siphon: {
    setup: {
      en: 'Secure the tensioned filter assembly and preheat the lower globe.',
      id: 'Kunci rakitan filter bertekanan dan panaskan tabung bawah.'
    },
    entry: {
      en: 'Allow water to fully ascend and stabilize before introducing the dose with a brief stir.',
      id: 'Biarkan air sepenuhnya naik dan stabil sebelum memasukkan dosis dengan adukan singkat.'
    },
    main: {
      en: 'Modulate the thermal source to maintain a tranquil steep; avoid violent boiling.',
      id: 'Atur sumber panas untuk mempertahankan rendaman tenang; hindari didihan keras.'
    },
    release: {
      en: 'Remove the heat source entirely; atmospheric inversion will draw the liquid cleanly.',
      id: 'Tarik sumber panas sepenuhnya; inversi atmosfer akan menarik cairan dengan bersih.'
    },
    finish: {
      en: 'Dismantle carefully and agitate the lower globe gently before service.',
      id: 'Bongkar dengan hati-hati dan agitasi tabung bawah perlahan sebelum disajikan.'
    }
  }
};

const ORIGAMI_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  cone_dripper_style: {
    setup: {
      en: 'Seat the conical filter meticulously to align with the vertical ribs.',
      id: 'Pasang filter kerucut secara teliti agar sejajar dengan alur vertikal.'
    },
    entry: {
      en: 'Execute a comprehensive bloom; the Origami dictates exceptionally fast flow dynamics.',
      id: 'Lakukan blooming komprehensif; Origami memaksakan dinamika aliran yang sangat cepat.'
    },
    main: {
      en: 'Maintain a highly compact and disciplined pour structure to regulate bypass.',
      id: 'Pertahankan struktur tuangan yang padat dan disiplin untuk mengatur bypass.'
    },
    release: {
      en: 'Allow the vertical flutes to clear the suspension without mechanical agitation.',
      id: 'Biarkan lekukan vertikal membersihkan suspensi tanpa agitasi mekanis.'
    },
    finish: {
      en: 'Mix the server gently and evaluate clarity and tactile weight.',
      id: 'Aduk wadah saji dengan lembut dan evaluasi kejernihan serta bobot taktil.'
    }
  },
  wave_dripper_style: {
    setup: {
      en: 'Seat the wave filter precisely inside the cone, ensuring stable flat-bottom geometry.',
      id: 'Pasang filter gelombang secara presisi di dalam kerucut, pastikan geometri alas datar stabil.'
    },
    entry: {
      en: 'Saturate evenly, taking care not to collapse the delicate paper flutes.',
      id: 'Saturasi merata, berhati-hati agar tidak meruntuhkan lekukan kertas yang rapuh.'
    },
    main: {
      en: 'Deploy concentric pulses to leverage the hybrid flow rate and build sweetness.',
      id: 'Gunakan tuangan bertahap konsentris untuk memanfaatkan laju aliran hibrida dan membangun rasa manis.'
    },
    release: {
      en: 'Allow the vertical flutes to clear the suspension without mechanical agitation.',
      id: 'Biarkan lekukan vertikal membersihkan suspensi tanpa agitasi mekanis.'
    },
    finish: {
      en: 'Mix the server gently and evaluate clarity and tactile weight.',
      id: 'Aduk wadah saji dengan lembut dan evaluasi kejernihan serta bobot taktil.'
    }
  },
  mugen_one_pour: {
    setup: {
      en: 'Seat the cone filter and establish a central divot to guide the single continuous pour.',
      id: 'Pasang filter kerucut dan buat cekungan tengah untuk memandu tuangan kontinu tunggal.'
    },
    entry: {
      en: 'Bypass traditional blooming; transition immediately into the controlled single pour.',
      id: 'Lewati blooming tradisional; transisi seketika menuju tuangan tunggal yang terkontrol.'
    },
    main: {
      en: 'Maintain an incredibly slow, unbroken central column to minimize agitation completely.',
      id: 'Pertahankan kolom tuangan tengah yang sangat lambat dan tak terputus untuk meminimalkan agitasi sepenuhnya.'
    },
    release: {
      en: 'Permit the entirely undisturbed bed to drain naturally, filtering out astringent compounds.',
      id: 'Biarkan hamparan yang sama sekali tak terganggu meniris alami, menyaring senyawa sepat.'
    },
    finish: {
      en: 'Swirl once to unite the pristine layers, revealing extreme structural clarity.',
      id: 'Putar sekali untuk menyatukan lapisan murni, mengungkapkan kejernihan struktural ekstrem.'
    }
  },
  iced_origami: {
    setup: {
      en: 'Deposit precision-weighed ice into the carafe; prepare a medium-fine grind for thermal shock.',
      id: 'Masukkan es yang ditimbang presisi ke dalam wadah; siapkan gilingan halus cenderung sedang untuk kejut termal.'
    },
    entry: {
      en: 'Bloom hot and fast to immediately aggressively extract volatile aromatics.',
      id: 'Lakukan blooming panas dan cepat untuk segera mengekstraksi agresif aromatik volatil.'
    },
    main: {
      en: 'Utilize high-velocity pulses to force maximum extraction before ice dilution compromises yield.',
      id: 'Gunakan tuangan kecepatan tinggi untuk memaksa ekstraksi maksimum sebelum pengenceran es mengorbankan hasil.'
    },
    release: {
      en: 'Ensure the concentrate crashes onto the ice structure, instantly locking in crisp acidity.',
      id: 'Pastikan konsentrat jatuh membentur struktur es, mengunci keasaman renyah secara instan.'
    },
    finish: {
      en: 'Agitate rigorously until complete thermal stabilization is verified.',
      id: 'Agitasi secara kuat hingga stabilisasi termal total diverifikasi.'
    }
  },
  competition_hybrid_flow: {
    setup: {
      en: 'Seat the filter perfectly level; this highly technical flow demands absolute symmetry.',
      id: 'Pasang filter rata sempurna; aliran sangat teknis ini menuntut simetri mutlak.'
    },
    entry: {
      en: 'Execute a turbulent, high-agitation bloom to aggressively disrupt cellular structures.',
      id: 'Lakukan blooming turbulen beragitasi tinggi untuk mengacaukan struktur seluler secara agresif.'
    },
    main: {
      en: 'Transition dynamically from rapid concentric agitation to a dead-slow center column finish.',
      id: 'Transisi secara dinamis dari agitasi konsentris cepat ke penyelesaian kolom tengah yang sangat lambat.'
    },
    release: {
      en: 'Permit the bed to settle completely flat, yielding complex acidity and heavy lingering sweetness.',
      id: 'Biarkan hamparan mengendap rata sempurna, menghasilkan keasaman kompleks dan rasa manis pekat yang tertinggal.'
    },
    finish: {
      en: 'Homogenize carefully to balance the intense dichotomy of the hybrid extraction phases.',
      id: 'Homogenisasi dengan hati-hati untuk menyeimbangkan dikotomi intens dari fase ekstraksi hibrida tersebut.'
    }
  }
};

const APRIL_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  april_continuous_slow: {
    setup: {
      en: 'Ensure the flat-bed paper is perfectly seated to promote strict laminar flow.',
      id: 'Pastikan kertas alas datar terpasang sempurna untuk mendorong aliran laminar yang ketat.'
    },
    entry: {
      en: 'Initiate a gentle, full-saturation bloom to prepare the shallow bed carefully.',
      id: 'Mulai blooming dengan saturasi penuh yang lembut untuk menyiapkan hamparan dangkal dengan hati-hati.'
    },
    main: {
      en: 'Execute an incredibly slow, continuous center pour to maintain perfect thermal equilibrium.',
      id: 'Lakukan tuangan tengah kontinu yang sangat lambat untuk mempertahankan keseimbangan termal sempurna.'
    },
    release: {
      en: 'Let the steady, unagitated bed drain naturally to ensure absolute clarity.',
      id: 'Biarkan hamparan stabil tanpa agitasi meniris alami untuk memastikan kejernihan absolut.'
    },
    finish: {
      en: 'A final gentle swirl integrates the exceptionally clean, sweet extraction.',
      id: 'Pusaran lembut terakhir menyatukan ekstraksi yang luar biasa bersih dan manis.'
    }
  },
  competition_two_pour: {
    setup: {
      en: 'Ensure the flat-bed paper is perfectly seated to promote strict laminar flow.',
      id: 'Pastikan kertas alas datar terpasang sempurna untuk mendorong aliran laminar yang ketat.'
    },
    entry: {
      en: 'Execute a heavy, structured bloom pour that does double duty as early extraction.',
      id: 'Lakukan tuangan blooming terstruktur yang berat untuk sekaligus melakukan ekstraksi awal.'
    },
    main: {
      en: 'Deliver exactly one massive secondary pour, maintaining a high, consistent water column.',
      id: 'Berikan tepat satu tuangan sekunder masif, mempertahankan kolom air yang tinggi dan konsisten.'
    },
    release: {
      en: 'The high bypass design allows the large volume to drain rapidly and cleanly.',
      id: 'Desain bypass tinggi memungkinkan volume besar meniris dengan cepat dan bersih.'
    },
    finish: {
      en: 'Unify the bold layers of the cup, designed for maximum sensory impact.',
      id: 'Satukan lapisan berani dari cangkir ini, yang dirancang untuk dampak sensorik maksimal.'
    }
  },
  iced_april_style: {
    setup: {
      en: 'Place precisely weighed ice in the vessel; ensure the thin flat filter is seated.',
      id: 'Tempatkan es yang ditimbang presisi di wadah; pastikan filter datar tipis terpasang.'
    },
    entry: {
      en: 'Pour hot and aggressively to pull volatile aromatics instantly before cooling.',
      id: 'Tuang air panas secara agresif untuk menarik aromatik volatil seketika sebelum mendingin.'
    },
    main: {
      en: 'Deliver concentrated pulses to push extraction strength against the ice dilution.',
      id: 'Berikan tuangan berdenyut konsentrat untuk mendorong kekuatan ekstraksi melawan pengenceran es.'
    },
    release: {
      en: 'The rapid drawdown crashes directly onto the ice, immediately locking in crispness.',
      id: 'Fase turun cepat langsung membentur es, seketika mengunci kerenyahan.'
    },
    finish: {
      en: 'Swirl the carafe vigorously until full thermal stability is achieved.',
      id: 'Putar teko kaca dengan kuat hingga stabilitas termal penuh tercapai.'
    }
  },
  high_body_heavy_dose: {
    setup: {
      en: 'Ensure the flat-bed paper is perfectly seated to promote strict laminar flow.',
      id: 'Pastikan kertas alas datar terpasang sempurna untuk mendorong aliran laminar yang ketat.'
    },
    entry: {
      en: 'Saturate the heavy dose deliberately; an extended bloom ensures thorough penetration.',
      id: 'Basahi dosis berat secara sengaja; blooming yang diperpanjang memastikan penetrasi menyeluruh.'
    },
    main: {
      en: 'Use slow, heavy pulses to deeply agitate the large bed and drive total solubility.',
      id: 'Gunakan denyut lambat yang berat untuk sangat mengaduk hamparan besar dan memicu kelarutan total.'
    },
    release: {
      en: 'Anticipate a longer drainage phase due to the dense, high-capacity crust.',
      id: 'Antisipasi fase penirisan yang lebih lama karena kerak kapasitas tinggi yang padat.'
    },
    finish: {
      en: 'Homogenize the rich, viscous output to reveal a highly textured profile.',
      id: 'Homogenisasi keluaran yang kaya dan kental untuk mengungkap profil bertekstur tinggi.'
    }
  },
  april_flat_bottom_standard: {
    setup: {
      en: 'Level the bed perfectly; absolute initial symmetry is strictly demanded.',
      id: 'Ratakan hamparan dengan sempurna; simetri awal yang absolut sangat diwajibkan.'
    },
    entry: {
      en: 'Saturate uniformly and enforce an undisturbed initial blooming phase.',
      id: 'Saturasi secara seragam dan terapkan fase blooming awal tanpa gangguan.'
    },
    main: {
      en: 'Deliver centered, low-agitation pulses to prevent lateral flow displacement.',
      id: 'Berikan tuangan terpusat beragitasi rendah untuk mencegah pergeseran aliran lateral.'
    },
    release: {
      en: 'Permit the bed to settle completely flat before introducing kinetic actions.',
      id: 'Biarkan hamparan mengendap sepenuhnya rata sebelum memperkenalkan tindakan kinetik.'
    },
    finish: {
      en: 'Integrate the brew with a single swirl; prioritize structural sweetness.',
      id: 'Integrasikan seduhan dengan satu putaran; prioritaskan rasa manis struktural.'
    }
  }
};

const MELITTA_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  aromaboy_style: {
    setup: {
      en: 'Fold the filter seam carefully and seat it tightly into the classic wedge.',
      id: 'Lipat jahitan filter dengan hati-hati dan pasang rapat ke dalam bentuk baji klasik.'
    },
    entry: {
      en: 'Deliver a tiny, precise volume of water for a highly restricted bloom phase.',
      id: 'Berikan volume air kecil yang presisi untuk fase blooming yang sangat terbatas.'
    },
    main: {
      en: 'Pour in micro-pulses, working carefully within the extremely tight geometrical constraints.',
      id: 'Tuang dalam denyut mikro, bekerja hati-hati di dalam batasan geometris yang sangat ketat.'
    },
    release: {
      en: 'The single hole design ensures a prolonged, highly immersive drainage.',
      id: 'Desain lubang tunggal memastikan penirisan yang sangat imersif dan panjang.'
    },
    finish: {
      en: 'Enjoy the surprisingly concentrated, old-school extraction profile.',
      id: 'Nikmati profil ekstraksi bergaya klasik yang mengejutkan pekatnya.'
    }
  },
  three_pour_melitta: {
    setup: {
      en: 'Fold the filter seam carefully and seat it tightly into the classic wedge.',
      id: 'Lipat jahitan filter dengan hati-hati dan pasang rapat ke dalam bentuk baji klasik.'
    },
    entry: {
      en: 'Perform a standard bloom to thoroughly degas the deep wedge-shaped bed.',
      id: 'Lakukan blooming standar untuk membuang gas secara menyeluruh pada hamparan baji dalam.'
    },
    main: {
      en: 'Divide the remaining volume into two structured pulses to maintain bed temperature.',
      id: 'Bagi sisa volume menjadi dua denyut terstruktur untuk menjaga suhu hamparan.'
    },
    release: {
      en: 'Allow each pulse to nearly drain before the next, leveraging the slow flow rate.',
      id: 'Biarkan setiap denyut hampir meniris sebelum tuangan berikutnya, memanfaatkan laju aliran lambat.'
    },
    finish: {
      en: 'Swirl the carafe to integrate the evenly extracted layers of flavor.',
      id: 'Putar teko kaca untuk menyatukan lapisan rasa yang terekstraksi merata.'
    }
  },
  iced_melitta_brew: {
    setup: {
      en: 'Load ice cubes into the server beneath the restrictive wedge dripper.',
      id: 'Masukkan es batu ke dalam wadah saji di bawah alat seduh baji yang restriktif.'
    },
    entry: {
      en: 'Bloom with minimal hot water to create a hyper-concentrated initial slurry.',
      id: 'Lakukan blooming dengan sedikit air panas untuk menciptakan campuran awal yang sangat pekat.'
    },
    main: {
      en: 'Execute heavy, focused pours to maximize extraction yield rapidly.',
      id: 'Lakukan tuangan berat terpusat untuk memaksimalkan hasil ekstraksi secara cepat.'
    },
    release: {
      en: 'The slow drip forces an extended steep, delivering dense concentrate onto the ice.',
      id: 'Tetesan lambat memaksa rendaman panjang, memberikan konsentrat padat ke atas es.'
    },
    finish: {
      en: 'Mix vigorously to chill the intense extraction and stop thermal degradation.',
      id: 'Aduk kuat untuk mendinginkan ekstraksi pekat dan menghentikan degradasi termal.'
    }
  },
  dense_classic_extraction: {
    setup: {
      en: 'Fold the filter seam carefully and seat it tightly into the classic wedge.',
      id: 'Lipat jahitan filter dengan hati-hati dan pasang rapat ke dalam bentuk baji klasik.'
    },
    entry: {
      en: 'Saturate the grounds heavily, allowing the wedge shape to trap the early heat.',
      id: 'Basahi bubuk kopi dengan berat, biarkan bentuk baji memerangkap panas awal.'
    },
    main: {
      en: 'Use a single, massive continuous pour to submerge the bed entirely.',
      id: 'Gunakan tuangan kontinu tunggal yang masif untuk merendam hamparan sepenuhnya.'
    },
    release: {
      en: 'The restricted exit creates a near-immersion environment for a thick body.',
      id: 'Jalan keluar yang sempit menciptakan lingkungan semi-rendaman untuk body tebal.'
    },
    finish: {
      en: 'Swirl the heavy, syrupy brew; it embodies the traditional, robust diner profile.',
      id: 'Putar seduhan sirup yang berat; ini mewujudkan profil klasik yang kuat.'
    }
  },
  traditional_melitta_one_pour: {
    setup: {
      en: 'Fold the trapezoid seam securely and establish a level bed along the longitudinal axis.',
      id: 'Lipat pelipit trapesium dengan kuat dan buat hamparan sejajar sumbu longitudinal.'
    },
    entry: {
      en: 'Initiate the bloom from the central fault line outward.',
      id: 'Mulai blooming dari garis patahan tengah ke arah luar.'
    },
    main: {
      en: 'Concentrate a single continuous pour tightly along the central axis.',
      id: 'Pusatkan satu tuangan kontinu secara ketat di sepanjang sumbu tengah.'
    },
    release: {
      en: 'Allow the trapezoidal mass to drain purely by gravity.',
      id: 'Biarkan massa trapesium meniris murni karena gravitasi.'
    },
    finish: {
      en: 'Homogenize with a gentle mix to ensure layered extraction integrates perfectly.',
      id: 'Homogenisasi dengan adukan lembut agar ekstraksi berlapis terintegrasi sempurna.'
    }
  }
};

const KONO_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  kono_dripper_standard: {
    setup: {
      en: 'Ensure the filter perfectly adheres to the smooth upper walls for airtight sealing.',
      id: 'Pastikan filter melekat sempurna pada dinding atas yang halus untuk segel kedap udara.'
    },
    entry: {
      en: 'Carefully introduce water drop by drop to initiate a highly controlled bloom.',
      id: 'Masukkan air tetes demi tetes dengan hati-hati untuk memulai blooming yang sangat terkendali.'
    },
    main: {
      en: 'Pour exclusively in the center circle; the ribbed lower half dictates the extraction flow.',
      id: 'Tuang eksklusif di lingkaran tengah; paruh bawah bergaris mendikte aliran ekstraksi.'
    },
    release: {
      en: 'The unique geometry creates a siphon effect, accelerating the final drawdown.',
      id: 'Geometri unik menciptakan efek sifon, mempercepat fase turun akhir.'
    },
    finish: {
      en: 'Integrate the cup; expect a remarkably syrupy texture with distinct sweetness.',
      id: 'Integrasikan cangkir; harapkan tekstur yang sangat menyerupai sirup dengan rasa manis yang jelas.'
    }
  },
  kono_slow_drip_body: {
    setup: {
      en: 'Ensure the filter perfectly adheres to the smooth upper walls for airtight sealing.',
      id: 'Pastikan filter melekat sempurna pada dinding atas yang halus untuk segel kedap udara.'
    },
    entry: {
      en: 'Use extreme precision to deliver minute drops, avoiding any structural disruption.',
      id: 'Gunakan presisi ekstrem untuk memberikan tetesan kecil, menghindari gangguan struktural.'
    },
    main: {
      en: 'Maintain a painstaking drop-by-drop routine until the bed is fully immersed.',
      id: 'Pertahankan rutinitas tetes demi tetes yang teliti hingga hamparan terendam penuh.'
    },
    release: {
      en: 'Allow the hyper-concentrated slurry to drain slowly through the lower ribs.',
      id: 'Biarkan campuran super pekat meniris lambat melewati garis-garis bawah.'
    },
    finish: {
      en: 'Swirl to blend the massive body and intense sweetness typical of slow-drip Kono.',
      id: 'Putar untuk memadukan body masif dan rasa manis intens khas tetes lambat Kono.'
    }
  },
  iced_kono_meimon: {
    setup: {
      en: 'Pack the carafe with precise ice blocks under the tightly sealed dripper.',
      id: 'Penuhi teko kaca dengan balok es presisi di bawah alat seduh yang tersegel rapat.'
    },
    entry: {
      en: 'Execute a fast, hot bloom to rapidly capture volatile aromatics.',
      id: 'Lakukan blooming panas yang cepat untuk menangkap aromatik volatil dengan pesat.'
    },
    main: {
      en: 'Transition to a heavier center pour, forcing rapid extraction before chilling.',
      id: 'Beralih ke tuangan tengah yang lebih berat, memaksa ekstraksi cepat sebelum pendinginan.'
    },
    release: {
      en: 'The accelerated siphon finish drops the concentrate swiftly onto the ice.',
      id: 'Fase akhir sifon yang dipercepat menjatuhkan konsentrat dengan cepat ke atas es.'
    },
    finish: {
      en: 'Agitate immediately to lock in the bright, syrupy iced profile.',
      id: 'Agitasi segera untuk mengunci profil es yang cerah dan seperti sirup.'
    }
  },
  kono_agitation_sweet: {
    setup: {
      en: 'Ensure the filter perfectly adheres to the smooth upper walls for airtight sealing.',
      id: 'Pastikan filter melekat sempurna pada dinding atas yang halus untuk segel kedap udara.'
    },
    entry: {
      en: 'Break the standard rules: use a turbulent bloom to aggressively release gases.',
      id: 'Patahkan aturan standar: gunakan blooming turbulen untuk melepaskan gas secara agresif.'
    },
    main: {
      en: 'Employ high-agitation pulses, driving up extraction yield and sweet compounds.',
      id: 'Terapkan tuangan berdenyut agitasi tinggi, memacu hasil ekstraksi dan senyawa manis.'
    },
    release: {
      en: 'The dense, agitated bed will draw down slower, maximizing contact time.',
      id: 'Hamparan padat yang teragitasi akan meniris lebih lambat, memaksimalkan waktu kontak.'
    },
    finish: {
      en: 'Homogenize thoroughly to balance the highly pushed, sweet extraction.',
      id: 'Homogenisasi secara menyeluruh untuk menyeimbangkan ekstraksi manis yang didorong kuat.'
    }
  },
  kono_meimon_traditional: {
    setup: {
      en: 'Seat the filter flush against the upper cone to exploit specific flow restrictions.',
      id: 'Pasang filter rata pada kerucut atas untuk memanfaatkan pembatasan aliran spesifik.'
    },
    entry: {
      en: 'Execute a concentrated central bloom to saturate the lower apex.',
      id: 'Lakukan blooming terpusat yang pekat untuk menyaturasi apeks bawah.'
    },
    main: {
      en: 'Maintain the pour radius tightly near the center to sustain slurry respiration.',
      id: 'Pertahankan radius tuangan ketat di dekat pusat untuk mempertahankan respirasi campuran.'
    },
    release: {
      en: 'Permit a clean drawdown; late-stage turbulence introduces severe astringency.',
      id: 'Izinkan fase turun yang bersih; turbulensi tahap akhir memicu rasa sepat parah.'
    },
    finish: {
      en: 'Swirl lightly to capture the focused sweetness characteristic of the Kono profile.',
      id: 'Putar ringan untuk menangkap rasa manis terfokus khas dari profil Kono.'
    }
  }
};


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
