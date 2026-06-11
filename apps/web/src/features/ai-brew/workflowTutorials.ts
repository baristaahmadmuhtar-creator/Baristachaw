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
      en: 'Place the thick bonded filter with the three-layer side facing the pouring spout. Rinse thoroughly to remove paper smell and preheat the heavy glass carafe. Discard rinse water, then tare the scale.',
      id: 'Pasang filter tebal dengan sisi tiga lipatan menghadap cerat. Bilas sampai bau kertas hilang dan kaca tebal terpanaskan. Buang air bilasan, lalu tare timbangan.',
    },
    entry: {
      en: 'Bloom patiently; the thick Chemex paper slows flow naturally, so deep saturation matters more than speed. Keep water centered.',
      id: 'Bloom dengan sabar; kertas tebal Chemex alami menahan aliran, jadi saturasi dalam lebih penting dari kecepatan. Jaga air di tengah.',
    },
    main: {
      en: 'Pour center-to-mid in measured pulses; keep water off the thick paper walls and ensure the spout air channel stays clear.',
      id: 'Tuang tengah-ke-tengah luar dalam pulse terukur; jauhkan air dari dinding kertas tebal dan pastikan jalur udara cerat tetap terbuka.',
    },
    release: {
      en: 'Allow the longer drawdown window. Chemex thick filter resistance extends draining; intervene only if the surface stalls completely.',
      id: 'Beri ruang fase turun lebih panjang. Resistansi filter tebal Chemex memperpanjang penirisan; intervensi hanya bila permukaan benar-benar macet.',
    },
    finish: {
      en: 'Remove the filter before the last bitter drips. Swirl the carafe gently to integrate layered extraction before serving.',
      id: 'Angkat filter sebelum tetesan pahit terakhir. Putar karafe perlahan untuk menyatukan lapisan ekstraksi sebelum disajikan.',
    },
    iced: PAPER_FILTER_ICED,
  },
  kalita_wave: {
    setup: {
      en: 'Seat the wave filter without crushing the ridges. Rinse gently from the center to preheat the brewer and server. Level the coffee bed.',
      id: 'Pasang wave filter tanpa merusak lipatan. Bilas ringan dari tengah untuk preheat brewer dan server. Ratakan coffee bed.',
    },
    entry: {
      en: 'Bloom evenly without flooding one side; flat-bottom brewers need a level start.',
      id: 'Bloom merata ke seluruh permukaan kopi. Flat-bottom butuh awal yang rata.',
    },
    main: {
      en: 'Use low pulses from the center to center-out. Keep the slurry level consistent.',
      id: 'Pulse rendah dari tengah ke tengah-luar. Jaga slurry tetap rata.',
    },
    release: {
      en: 'Let the flat bed drain cleanly; do not shake fines into the three exit holes.',
      id: 'Biarkan bed turun rata dan bersih; jangan shake fines ke tiga lubang pembuangan.',
    },
    finish: {
      en: 'Give the server a gentle swirl to mix the flat-bed profile.',
      id: 'Finish: swirl server ringan untuk mencampur ekstraksi flat-bed.',
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
      en: 'Charge the chamber cleanly and keep the bed submerged without vigorous stirring.',
      id: 'Isi ruang dengan rapi dan jaga hamparan kopi terendam tanpa adukan kuat.',
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
      en: 'Place the rinsed filter in the Clever Dripper, ensure the release valve is fully closed on a flat table, then add coffee.',
      id: 'Pasang filter yang sudah dibilas ke Clever Dripper, pastikan katup pelepas tertutup rapat di atas meja, lalu masukkan kopi.',
    },
    entry: {
      en: 'Pour hot water closed to start immersion; ensure all coffee grounds are fully saturated with minimal agitation.',
      id: 'Tuang air panas saat katup tertutup untuk memulai imersi; pastikan semua bubuk kopi basah merata dengan agitasi minimal.',
    },
    main: {
      en: 'Close the lid to lock in heat. Let the immersion steep do the work quietly without repeated stirring.',
      id: 'Tutup rapat untuk menjaga suhu. Biarkan perendaman imersi bekerja dengan tenang tanpa perlu sering diaduk.',
    },
    release: {
      en: 'Place the Clever over the server to engage the release valve. Let the extraction drain cleanly through the paper filter.',
      id: 'Letakkan Clever di atas wadah saji untuk mengaktifkan katup pelepas. Biarkan ekstraksi meniris bersih melewati filter kertas.',
    },
    finish: {
      en: 'Remove the dripper once the release is complete. Swirl the server gently to integrate the extraction before serving.',
      id: 'Angkat dripper setelah penirisan selesai. Putar server secara perlahan untuk menyatukan hasil ekstraksi sebelum disajikan.',
    },
    iced: {
      setup: {
        en: 'Pre-load the server with clean ice. Keep all ice completely separate from the hot water in the closed dripper chamber during steep.',
        id: 'Isi wadah saji dengan es batu terlebih dahulu. Jaga es tetap terpisah sepenuhnya dari air panas di dalam dripper selama perendaman.',
      },
      main: {
        en: 'Cover and steep the hot concentrate, then place on the server to release directly over the ice.',
        id: 'Tutup dan rendam konsentrat panas, lalu letakkan di server untuk mengalirkan kopi langsung di atas es.',
      },
      finish: {
        en: 'Swirl the server to integrate the iced concentrate and melt the ice cubes evenly before serving.',
        id: 'Putar server untuk menyatukan konsentrat dingin dan melarutkan es batu secara merata sebelum disajikan.',
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
      en: 'Add the full water volume promptly and wet the coffee bed evenly.',
      id: 'Tuangkan seluruh volume air dengan cepat dan basahi hamparan kopi secara merata.',
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
      id: 'Lakukan tuangan cepat dengan turbulensi terkontrol agar seluruh bubuk kopi segera terkena air.',
    },
    main: {
      en: 'Secure the lid to trap heat and strictly avoid secondary agitation; profound sweetness relies on a completely static steeping phase.',
      id: 'Pasang tutup rapat untuk menahan panas dan hindari agitasi sekunder; rasa manis mendalam bergantung pada fase rendaman yang sepenuhnya statis.',
    },
    release: {
      en: 'Break the crust gently, skim the surface foam, and avoid pressing the sediment at the bottom.',
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
      id: 'Letakkan plunger tepat di permukaan cairan; hindari tekanan awal yang dapat mengaduk kembali partikel halus.',
    },
    finish: {
      en: 'Execute an excruciatingly slow decant, leaving the final silty sludge trapped in the brewing chamber.',
      id: 'Eksekusi tuangan yang sangat lambat, meninggalkan endapan lumpur akhir terperangkap di dalam bilik seduh.',
    },
    actions: {}
  },
  double_filter: {
    setup: {
      en: 'Preheat the brewer, rinse the additional paper filter, and align it so the plunger travels vertically.',
      id: 'Panaskan alat, bilas filter kertas tambahan, lalu sejajarkan komponen agar plunger bergerak lurus.',
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
      en: 'Apply light, continuous force for 45-60 seconds; excessive pressure can bypass or tear the paper filter.',
      id: 'Berikan tekanan ringan dan stabil selama 45-60 detik; tekanan berlebih dapat melewati atau merobek filter kertas.',
    },
    finish: {
      en: 'Decant carefully; the paper filter reduces oils and insoluble sediment in the final cup.',
      id: 'Tuang hasil seduhan dengan hati-hati; filtrasi kertas membantu mengurangi minyak dan sedimen pada cangkir akhir.',
    },
    actions: {}
  },
  heavy_concentrate: {
    setup: {
      en: 'Preheat thoroughly and leave enough chamber headroom for the higher dose.',
      id: 'Panaskan alat secara menyeluruh dan sisakan ruang chamber yang cukup untuk dosis tinggi.',
    },
    entry: {
      en: 'Pour over the full dose and stir firmly 5-6 times until no dry pockets remain.',
      id: 'Tuang air ke seluruh dosis dan aduk tegas 5-6 kali hingga tidak ada bagian kering.',
    },
    main: {
      en: 'Use the longer steep to build a chocolate-toned, full body, then avoid late agitation.',
      id: 'Gunakan rendaman lebih lama untuk membangun body penuh bernuansa cokelat, lalu hindari agitasi di tahap akhir.',
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
      en: 'Preheat the brewer and use a lower temperature with an even coarse grind for a softer profile.',
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
      en: 'Use minimal downward force and lower the metal mesh without compressing the coffee bed.',
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
      en: 'Open the valve and pour with a controlled fast flow to lift the bed and support brighter acidity.',
      id: 'Buka katup dan tuang cepat secara terkontrol untuk mengangkat hamparan kopi dan mendukung keasaman yang cerah.'
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
      id: 'Aduk hingga konsentrat tercampur merata sebelum pendinginan.'
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
      en: 'Complete an immersion bloom with even saturation and minimal mechanical stirring.',
      id: 'Lakukan blooming imersi dengan pembasahan merata dan pengadukan minimal.'
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
      en: 'Mix thoroughly; this profile targets a heavier body and softer acidity.',
      id: 'Aduk hingga merata; profil ini menargetkan body lebih tebal dan keasaman lebih lembut.'
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
      en: 'Seat the wave filter without crushing the ridges. Rinse gently from the center to preheat brewer and server. Level the coffee bed.',
      id: 'Pasang wave filter tanpa merusak lipatan. Bilas ringan dari tengah untuk preheat brewer dan server. Ratakan coffee bed.'
    },
    entry: {
      en: 'Bloom evenly to saturate the bed. The 3-hole base restricts flow, so avoid flooding.',
      id: 'Bloom merata. Dasar 3 lubang menahan aliran, pastikan bubuk basah tanpa membanjiri.'
    },
    main: {
      en: 'Apply three low-agitation pulses from the center to center-out. Keep the slurry level consistent.',
      id: 'Terapkan 3 tuang pulse rendah dari tengah ke tengah-luar. Jaga slurry tetap rata.'
    },
    release: {
      en: 'Let the bed drain clean and flat. Do not shake fines into the three exit holes.',
      id: 'Biarkan seduhan meniris rata. Jangan shake fines ke tiga lubang.'
    },
    finish: {
      en: 'Finish: gentle swirl on the server to integrate the flat-bottom extraction.',
      id: 'Finish: swirl server ringan untuk mengintegrasikan ekstraksi flat-bed.'
    }
  },
  competition_fast_four: {
    setup: {
      en: 'Seat the wave filter without crushing the ridges. Level the coffee bed meticulously.',
      id: 'Pasang wave filter tanpa merusak lipatan. Ratakan coffee bed dengan teliti.'
    },
    entry: {
      en: 'Execute a rapid, even bloom. Fast extraction demands immediate contact.',
      id: 'Lakukan bloom merata yang cepat. Ekstraksi cepat butuh kontak menyeluruh sejak awal.'
    },
    main: {
      en: 'Deliver four rapid, tight concentric pulses from center to center-out. Keep the slurry level consistent.',
      id: 'Tuang 4 pulsa cepat dari tengah ke tengah-luar. Jaga slurry tetap rata.'
    },
    release: {
      en: 'Monitor the fast drawdown and avoid moving fines into the three exit holes.',
      id: 'Perhatikan penurunan air cepat. Jangan shake fines ke tiga lubang.'
    },
    finish: {
      en: 'Finish: gentle swirl on the server. Expect bright acidity driven by rapid pulses.',
      id: 'Finish: swirl server ringan. Harapkan asiditas cerah dari ekstraksi cepat.'
    }
  },
  continuous_slow_stream: {
    setup: {
      en: 'Seat the wave filter without crushing the ridges. Level the coffee bed carefully.',
      id: 'Pasang wave filter tanpa merusak lipatan. Ratakan coffee bed dengan hati-hati.'
    },
    entry: {
      en: 'Bloom evenly. Do not agitate, let the slurry settle into a compact puck.',
      id: 'Bloom merata. Jangan agitasi, biarkan seduhan memadat perlahan.'
    },
    main: {
      en: 'Maintain a continuous low pulse from the center. We utilize the water weight without turbulence.',
      id: 'Pertahankan aliran pulse rendah dari tengah. Kita pakai berat air untuk ekstraksi stabil.'
    },
    release: {
      en: 'Let the water sink slowly through the flat bed. Do not shake fines into the three exit holes.',
      id: 'Biarkan air turun perlahan melewati flat bed. Jangan shake fines ke tiga lubang.'
    },
    finish: {
      en: 'Finish: gentle swirl on the server for a highly structured, sweet cup.',
      id: 'Finish: swirl server ringan untuk cangkir yang manis dan terstruktur.'
    }
  },
  iced_wave: {
    setup: {
      en: 'Seat the wave filter without crushing the ridges. Load ice and level the coffee bed.',
      id: 'Pasang wave filter tanpa merusak lipatan. Siapkan es dan ratakan coffee bed.'
    },
    entry: {
      en: 'Bloom evenly with hot water to unlock fruit aromatics immediately.',
      id: 'Bloom merata dengan air panas untuk melepas aroma buah seketika.'
    },
    main: {
      en: 'Pour short, low pulses from center to center-out. Keep the slurry level low and consistent.',
      id: 'Tuang pulse rendah dari tengah ke tengah-luar. Jaga slurry tetap rata dan rendah.'
    },
    release: {
      en: 'Watch the hot concentrate melt directly into the ice structure. Do not shake fines into the three exit holes.',
      id: 'Perhatikan konsentrat panas meleleh langsung ke es. Jangan shake fines ke tiga lubang.'
    },
    finish: {
      en: 'Finish: gentle swirl on the server to complete thermal exchange.',
      id: 'Finish: swirl server ringan untuk menyelesaikan pertukaran suhu.'
    }
  },
  high_dose_concentrate: {
    setup: {
      en: 'Seat the wave filter without crushing the ridges. Set a coarse grind and level the thick coffee bed.',
      id: 'Pasang wave filter tanpa merusak lipatan. Pakai gilingan kasar dan ratakan coffee bed yang tebal.'
    },
    entry: {
      en: 'Use a larger, even bloom and saturate the bed without overflowing.',
      id: 'Gunakan blooming lebih besar dan merata tanpa membuat brewer meluber.'
    },
    main: {
      en: 'Pour slowly from the center. Avoid swirling to prevent fines from migrating.',
      id: 'Tuang perlahan dari tengah. Hindari putaran agar fines tidak turun.'
    },
    release: {
      en: 'Patience is paramount. Do not shake fines into the three exit holes, it will clog.',
      id: 'Kesabaran adalah kunci. Jangan shake fines ke tiga lubang karena akan menyumbat (clog).'
    },
    finish: {
      en: 'Finish: gentle swirl on the server. Serve a rich, heavy-bodied concentrate.',
      id: 'Finish: swirl server ringan. Sajikan konsentrat kaya rasa dan tebal.'
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
      en: 'Allow the drawdown to finish without disturbance. Expect a sweet, full-bodied cup when the bed remains even.',
      id: 'Tunggu hingga air turun sepenuhnya tanpa gangguan. Hasilnya adalah cangkir ber-body penuh yang sangat manis tanpa kebocoran bypass.'
    }
  },
  reverse_water_first: {
    setup: {
      en: 'Place the filter and rinse. Crucially, leave the coffee aside—we are pouring the entire water volume into the empty filter first.',
      id: 'Pasang filter dan bilas. Sangat penting, sisihkan kopinya—kita akan menuang seluruh air ke dalam filter kosong terlebih dahulu.'
    },
    entry: {
      en: 'Add the grounds gently onto the hot water and fold them in with minimal stirring.',
      id: 'Tambahkan kopi perlahan ke permukaan air dan aduk lipat secara minimal.'
    },
    main: {
      en: 'Cover and steep. The coffee particles will slowly hydrate and sink naturally, extracting gently without ever clogging the bottom filter pores.',
      id: 'Tutup dan diamkan. Partikel kopi akan terhidrasi dan tenggelam secara alami, terekstraksi lembut tanpa pernah menyumbat pori filter bawah.'
    },
    release: {
      en: 'Engage the release valve over the server and monitor the fast drawdown.',
      id: 'Aktifkan katup di atas wadah saji dan pantau aliran turun yang cepat.'
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
      en: 'Combine both extraction stages in the carafe for a dense, layered profile.',
      id: 'Satukan kedua tahap ekstraksi di dalam karafe untuk profil padat dan berlapis.'
    }
  },
  iced_clever: {
    setup: {
      en: 'Prep the Clever Dripper. Separately, load your serving vessel with hard, large-format ice to receive the flash extraction.',
      id: 'Siapkan Clever Dripper. Secara terpisah, isi wadah saji Anda dengan es batu besar dan keras untuk menerima ekstraksi kilat.'
    },
    entry: {
      en: 'Add the hot water promptly and wet the grounds evenly during the short steep.',
      id: 'Tambahkan air panas dengan cepat dan basahi kopi secara merata selama rendaman singkat.'
    },
    main: {
      en: 'Stir firmly, then cover. The higher heat and agitation support extraction during the short contact time.',
      id: 'Aduk tegas, lalu tutup. Suhu dan agitasi yang lebih tinggi membantu ekstraksi selama waktu kontak singkat.'
    },
    release: {
      en: 'Slam the valve open directly over the ice. The violent thermal shock instantly locks in the bright, volatile acidity.',
      id: 'Buka katup langsung di atas es. Kejutan termal yang instan akan mengunci asiditas cerah dan volatil seketika.'
    },
    finish: {
      en: 'Stir the iced vessel until the temperature is even, then check concentration before serving.',
      id: 'Aduk wadah es hingga suhu seduhan merata. Jaga pelepasan tetap stabil agar konsentrat tidak keruh.'
    }
  },
  high_dose_concentrate: {
    setup: {
      en: 'Load the higher coffee dose and use a coarse grind; excess fines can slow the final release.',
      id: 'Masukkan dosis kopi yang lebih tinggi dan gunakan gilingan kasar; partikel halus berlebih dapat memperlambat pelepasan.'
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
      en: 'The result is dense and espresso-like. Serve neat or use it as a base for milk drinks.',
      id: 'Hasilnya pekat dan ber-body tebal. Sajikan langsung atau gunakan sebagai dasar minuman susu.'
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
      en: 'Set and rinse the Chemex filter thoroughly, then preheat the carafe for the multi-pulse sequence.',
      id: 'Pasang dan bilas filter Chemex dengan cukup air, lalu panaskan karafe agar suhu stabil selama urutan multi-pulsa.'
    },
    entry: {
      en: 'Drive an energetic bloom to rapidly degas the coffee, forcing immediate heat penetration into the core of the slurry.',
      id: 'Lakukan blooming dengan aliran cukup cepat untuk membasahi kopi dan membantu pelepasan gas.'
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
      en: 'This approach targets clear flavor separation and tea-like clarity, supported by the thick paper filter.',
      id: 'Metode ini menargetkan separasi rasa dan kejernihan seperti teh; filter tebal membantu menahan sedimen.'
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
      id: 'Jaga tuangan tengah tetap lambat dan hindari tepi agar aliran fokus melalui bagian dalam kerucut.'
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
      en: 'Load the Chemex with the measured ice, and place the triple-fold side of the paper toward the spout for ventilation.',
      id: 'Isi wadah Chemex yang besar dengan es segar berkualitas tinggi. Pastikan lipatan tiga filter menghadap jalur tuang agar udara dingin bisa keluar.'
    },
    entry: {
      en: 'Bloom the high-dose bed with hot water. The thick filter requires slightly more water to saturate fully.',
      id: 'Blooming dengan air panas. Filter tebal butuh air ekstra untuk saturasi total tanpa macet.'
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
      en: 'Swirl the Chemex until the drink is evenly chilled, then serve the clean iced brew.',
      id: 'Putar Chemex hingga suhu seduhan merata, lalu sajikan kopi es yang bersih.'
    }
  },
  high_dose_heavy_body: {
    setup: {
      en: 'Use a coarse grind for the larger Chemex dose and rinse with enough water to preheat the glass.',
      id: 'Gunakan gilingan kasar untuk dosis Chemex yang lebih besar dan bilas dengan cukup air untuk memanaskan kaca.'
    },
    entry: {
      en: 'Use a larger bloom and stir gently with a paddle until no dry pockets remain.',
      id: 'Gunakan blooming lebih besar dan aduk perlahan dengan dayung hingga tidak ada bagian kering.'
    },
    main: {
      en: 'Pour rhythmically in the center. Avoid washing high walls to prevent water bypassing the thick bed.',
      id: 'Tuang ritmis di tengah. Hindari dinding tinggi agar air tidak mem-bypass bed yang tebal.'
    },
    release: {
      en: 'Allow the longer drawdown to finish. Thick paper and the larger dose will naturally slow the flow.',
      id: 'Biarkan penirisan yang lebih panjang selesai. Kertas tebal dan dosis besar akan memperlambat aliran secara alami.'
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
      en: 'Fill the lower boiler with room-temperature water directly below the safety valve. Drop the coffee into the basket loosely—do not tamp it under any circumstance.',
      id: 'Isi boiler bawah dengan air suhu ruang tepat di bawah katup pengaman. Masukkan kopi ke keranjang dengan longgar—jangan pernah memadatkannya.'
    },
    entry: {
      en: 'Assemble the unit securely. Place it on low-to-medium heat. The room-temperature water will slowly build steam pressure to drive a gentle extraction.',
      id: 'Rakit alat ini dengan rapat. Letakkan di atas api kecil-sedang. Air suhu ruang akan perlahan membentuk tekanan uap untuk mendorong ekstraksi lembut.'
    },
    main: {
      en: 'Watch the chimney closely with the lid open. The extraction should emerge as a slow, dark, syrupy ooze. If it spits or surges violently, reduce the heat instantly.',
      id: 'Awasi corong dengan tutup terbuka. Ekstraksi harus muncul perlahan seperti sirup gelap. Jika menyembur atau melonjak keras, segera kecilkan api.'
    },
    release: {
      en: 'Listen for the gurgling sound. The exact moment the stream turns blond and bubbly, remove the pot completely from the heat.',
      id: 'Dengarkan suara mendidih yang khas. Tepat saat aliran berubah menjadi pucat dan bergelembung, angkat pot sepenuhnya dari sumber panas.'
    },
    finish: {
      en: 'Cool the boiler base with a wet towel to stop extraction, then serve the concentrated brew.',
      id: 'Dinginkan dasar boiler dengan handuk basah untuk menghentikan ekstraksi, lalu sajikan hasil seduhan pekat.'
    }
  },
  preheated_boiler: {
    setup: {
      en: 'Preheat the water before filling the base below the safety valve. Load the coffee evenly—do not tamp.',
      id: 'Panaskan air sebelum mengisi dasar boiler di bawah katup pengaman. Isi kopi secara merata—jangan di-tamp.'
    },
    entry: {
      en: 'Seal the top chamber tightly using silicone mitts or a towel. Set to a moderate heat source to drive an accelerated but stable pressure ramp.',
      id: 'Tutup ruang atas dengan rapat menggunakan sarung tangan silikon atau handuk. Gunakan sumber panas sedang untuk mendorong tekanan yang dipercepat namun stabil.'
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
      en: 'Cool the base to stop extraction. This approach targets sweetness and higher clarity than a traditional moka profile.',
      id: 'Hentikan seduhan dengan air dingin di alasnya. Hasilnya adalah alternatif espresso yang sangat manis dan berkejernihan tinggi.'
    }
  },
  low_temp_controlled: {
    setup: {
      en: 'Start with 70°C water in the base below the safety valve. Load the coffee loosely—do not tamp.',
      id: 'Mulai dengan air 70°C di dasar di bawah katup pengaman. Masukkan kopi secara longgar—jangan di-tamp.'
    },
    entry: {
      en: 'Place on very low heat. The prolonged buildup gently hydrates the coffee puck before the heavy pressure forces liquid through.',
      id: 'Gunakan api kecil agar kopi terhidrasi bertahap sebelum tekanan mendorong cairan ke ruang atas.'
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
      en: 'Load coffee loosely into the basket—do not tamp. Pack your serving vessel with heavy ice chunks. Note: this is an iced serving/concentrate, not a normal iced brew.',
      id: 'Masukkan kopi secara longgar ke keranjang—jangan di-tamp. Isi wadah saji Anda dengan bongkahan es berat. Catatan: ini adalah penyajian es/konsentrat, bukan seduhan es biasa.'
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
      en: 'Pour the hot concentrate promptly over the measured ice.',
      id: 'Tuang konsentrat panas segera ke atas es yang sudah ditimbang.'
    },
    finish: {
      en: 'Swirl to crash-cool. This locks in the volatile aromatics, yielding a powerful, punchy iced coffee.',
      id: 'Putar untuk mendinginkan kilat. Ini mengunci aromatik volatil, menghasilkan kopi es yang kuat dan menonjol.'
    }
  },
  high_yield_robust: {
    setup: {
      en: 'Fill the boiler to below the safety valve. Fill the basket fully with a slightly finer grind—do not tamp. High resistance increases extraction yield.',
      id: 'Isi boiler di bawah katup pengaman. Isi keranjang penuh dengan gilingan sedikit lebih halus—jangan di-tamp. Hambatan tinggi meningkatkan hasil ekstraksi.'
    },
    entry: {
      en: 'Utilize high heat. We are deliberately pushing the Moka Pot to its structural pressure limits.',
      id: 'Gunakan panas tinggi. Kita sengaja mendorong Moka Pot hingga batas tekanan strukturalnya.'
    },
    main: {
      en: 'The flow may begin slowly, then accelerate into a dense, oil-rich concentrate.',
      id: 'Aliran akan tertahan, lalu menyembur sebagai cairan yang sangat berat, berminyak, dan padat.'
    },
    release: {
      en: 'Cut the heat the instant the flow accelerates to avoid catastrophic over-extraction.',
      id: 'Matikan api seketika saat aliran mulai melaju cepat untuk menghindari over-ekstraksi parah.'
    },
    finish: {
      en: 'Quench immediately. The resulting brew is intensely robust, designed to cut through milk or heavy syrups easily.',
      id: 'Dinginkan dasar brewer untuk menghentikan ekstraksi. Hasil pekat ini cocok sebagai dasar minuman susu.'
    }
  }
};;;

const COLD_BREW_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  classic_toddy_immersion: {
    setup: {
      en: 'Secure the rubber stopper and insert the reusable felt filter. Add alternating layers of coarse coffee and cold water to prevent dry pockets.',
      id: 'Pasang stopper karet dan filter felt wadah Toddy. Tambahkan lapisan kopi giling coarse (kasar) dan air dingin bertahap agar tidak ada dry pocket.'
    },
    entry: {
      en: 'Pour water slowly to submerge all grounds. Do not aggressively or repeatedly stir to avoid clogging the filter.',
      id: 'Tuang air secara perlahan agar kopi basah. Jangan lakukan adukan agresif berulang agar filter felt tidak tersumbat.'
    },
    main: {
      en: 'Steep the mixture at room temperature or in the fridge for 12 to 24 hours. The slow immersion pulls out sweet, low-acid compounds.',
      id: 'Rendam campuran kopi pada suhu ruang atau lemari es selama 12-24 jam. Imersi dingin ini menarik rasa manis yang sangat rendah asam.'
    },
    release: {
      en: 'Pull the stopper from the bottom over a decanter. Let the heavy concentrate drain slowly and filter gently through the felt pad.',
      id: 'Cabut stopper karet di atas decanter. Biarkan konsentrat tebal meniris perlahan dan tersaring lembut melalui filter felt.'
    },
    finish: {
      en: 'Store concentrate cold. Serve with a dilution ratio of 1 part concentrate to 2 parts water or milk as a starting point. For hot serving, dilute with hot water (no hot brewing).',
      id: 'Simpan konsentrat di tempat dingin. Sajikan dengan rasio pengenceran (contoh: 1 bagian konsentrat ke 2 bagian air atau susu) sebagai awal. Untuk sajian panas, encerkan dengan air panas (bukan seduh panas).'
    }
  },
  cold_drip_tower: {
    setup: {
      en: 'Assemble the tower and pre-wet the paper filter over the coffee bed for even drip distribution.',
      id: 'Rakit menara kaca. Basahi filter kertas di atas hamparan kopi untuk memastikan distribusi air yang sampurna dari katup atas.'
    },
    entry: {
      en: 'Set upper valve to one drop per second. The initial drops must slowly hydrate the entire column of grounds.',
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
      en: 'Swirl the final carafe, then serve neat or over ice after checking strength and dilution.',
      id: 'Putar karafe, lalu sajikan langsung atau dengan es setelah memeriksa kekuatan dan pengenceran.'
    }
  },
  double_extraction_concentrate: {
    setup: {
      en: 'Secure the Toddy stopper and felt filter. Load coarse coffee and cold water in alternating stages to prevent dry pockets.',
      id: 'Pasang stopper Toddy dan filter felt. Masukkan kopi coarse (kasar) dan air dingin secara bertahap agar terhindar dari dry pocket.'
    },
    entry: {
      en: 'Saturate grounds completely by pouring cold water in stages. Do not stir to keep the drainage flow clear.',
      id: 'Basahi kopi secara merata dengan air dingin bertahap. Jangan diaduk agresif agar aliran penirisan tetap lancar.'
    },
    main: {
      en: 'Steep the concentrate for 12 to 24 hours total in a cold environment. Keep it cold and avoid any heated water contact.',
      id: 'Rendam konsentrat selama 12-24 jam total di dalam suhu dingin. Jaga tetap dingin dan hindari kontak air panas.'
    },
    release: {
      en: 'Pull the stopper plug to let the dense concentrate drain slowly. Filtration should be calm to avoid passing sediment.',
      id: 'Cabut stopper karet agar konsentrat pekat meniris perlahan. Biarkan penyaringan berjalan tenang tanpa adukan.'
    },
    finish: {
      en: 'Store concentrate cold. Serve diluted (e.g., 1 part concentrate to 2 parts water or milk). For hot serving: mix the concentrate with hot water (not hot brew).',
      id: 'Simpan konsentrat dalam kondisi dingin. Sajikan terencerkan (contoh: 1 bagian konsentrat ke 2 bagian air atau susu). Untuk sajian panas: campur konsentrat dengan air panas (bukan seduh panas).'
    }
  },
  accelerated_room_temp: {
    setup: {
      en: 'Secure the Toddy stopper and felt filter. Add coarse coffee and ambient room-temperature water in stages to prevent dry pockets.',
      id: 'Pasang stopper Toddy dan filter felt. Tambahkan kopi coarse (kasar) dan air suhu ruang secara bertahap agar tidak ada dry pocket.'
    },
    entry: {
      en: 'Pour water gently to wet all grounds. Perform a very brief stir at the start; do not stir repeatedly.',
      id: 'Tuang air perlahan agar membasahi seluruh kopi. Lakukan adukan ringan sekali di awal; jangan aduk agresif berulang-ulang.'
    },
    main: {
      en: 'Steep at room temperature (20-24°C) for a shortened window of 12 hours. Note: this is a fast room-temp style, confidence is lower.',
      id: 'Rendam pada suhu ruang selama 12 jam. Catatan: ini gaya suhu ruang yang cepat, tingkat keyakinan (confidence) lebih rendah.'
    },
    release: {
      en: 'Pull the stopper to let it drain slowly. Pass the liquid through a paper filter if extra clarity is desired.',
      id: 'Cabut stopper karet agar meniris perlahan. Alirkan lewat filter kertas tambahan jika ingin kejernihan ekstra.'
    },
    finish: {
      en: 'Store concentrate cold. Dilute with water or milk (1 part concentrate to 2 parts water/milk). For hot serving: combine concentrate with hot water (no hot brewing).',
      id: 'Simpan konsentrat dingin. Encerkan dengan air/susu (contoh: 1 bagian konsentrat ke 2 bagian air/susu). Untuk sajian panas: campur konsentrat dengan air panas (bukan seduh panas).'
    }
  },
  japanese_slow_drip: {
    setup: {
      en: 'Position the paper filter disk carefully on top of the packed coffee bed. Set up the drip valve and top ice-water chamber.',
      id: 'Posisikan kertas filter bundar dengan hati-hati di atas hamparan kopi. Siapkan katup tetes dan wadah air-es di bagian atas.'
    },
    entry: {
      en: 'Moisten the bed slowly with a few initial drops to prevent dry channels inside the column.',
      id: 'Basahi hamparan kopi perlahan dengan beberapa tetes awal untuk mencegah saluran kering di dalam kolom.'
    },
    main: {
      en: 'Regulate the drip rate to one drop every two seconds. The slow cold percolation takes several hours to complete.',
      id: 'Atur laju tetesan menjadi satu tetes setiap dua detik. Perkolasi dingin yang lambat ini membutuhkan waktu beberapa jam.'
    },
    release: {
      en: 'Let the ice water filter completely through the bed. The slow gravity flow maximizes clarity and sweetness.',
      id: 'Biarkan air es tersaring sepenuhnya melewati hamparan kopi. Aliran gravitasi lambat ini memaksimalkan kejernihan dan rasa manis.'
    },
    finish: {
      en: 'Swirl the collection carafe to integrate the extraction, then serve neat or over ice.',
      id: 'Putar teko penampung untuk menyatukan hasil ekstraksi, lalu sajikan langsung atau dengan es.'
    }
  }
};

const BATCH_BREW_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  sca_gold_cup: {
    setup: {
      en: 'Seat the paper filter against the basket walls and level the coffee bed to support even flow.',
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
      en: 'Stir the thermal carafe gently to equalize concentration, then serve after checking taste and temperature.',
      id: 'Aduk ringan wadah termal untuk menyatukan konsentrasi seduhan, lalu sajikan setelah memeriksa suhu dan rasa.'
    }
  },
  heavy_batch_catering: {
    setup: {
      en: 'Load the catering-scale dose and grind coarser to account for the deeper coffee bed.',
      id: 'Masukkan dosis skala katering dan gunakan gilingan lebih kasar untuk menyesuaikan hamparan kopi yang lebih dalam.'
    },
    entry: {
      en: 'Initiate the long brew cycle. The initial water volume is vast, creating a prolonged, deep immersion zone within the basket.',
      id: 'Mulai siklus seduh panjang. Volume air awal sangat besar, menciptakan zona imersi dalam yang berkepanjangan di keranjang.'
    },
    main: {
      en: 'The deep bed acts as a powerful flow restrictor. The machine will pulse slowly, relying on bed depth to force high extraction yields.',
      id: 'Hamparan kopi yang dalam memperlambat aliran. Pantau waktu seduh agar ekstraksi tidak berlebihan.'
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
      en: 'Stir the batch before serving and check for clear sweetness without astringency.',
      id: 'Sajikan setelah mengaduk karafe hingga merata. Targetkan rasa manis yang jelas tanpa sepat akibat aliran tidak merata.'
    }
  },
  high_extraction_thermos: {
    setup: {
      en: 'Pre-heat the thermal airpot with boiling water for 5 minutes, then empty it. Load the basket with a precision-ground high dose.',
      id: 'Panaskan airpot termal dengan air mendidih selama 5 menit, lalu kosongkan. Isi keranjang dengan dosis tinggi yang digiling presisi.'
    },
    entry: {
      en: 'Begin the brew. The insulated environment reduces heat loss and supports a stable extraction.',
      id: 'Mulai menyeduh. Insulasi membantu mengurangi kehilangan panas dan menjaga ekstraksi tetap stabil.'
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
      en: 'Seal the thermos and monitor holding time so the brew remains balanced during service.',
      id: 'Tutup termos dengan rapat dan pantau waktu simpan agar rasa tetap seimbang selama layanan.'
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
      en: 'Watch the grounds rise into a dome, then remove the heat and serve once the brew settles.',
      id: 'Perhatikan ampas kopi membentuk kubah, lalu hentikan pemanasan dan sajikan setelah seduhan stabil.'
    }
  },
  competition_triple_agitation: {
    setup: {
      en: 'Secure the filter carefully and confirm the seal before heating.',
      id: 'Pasang filter dengan teliti dan pastikan segelnya rapat sebelum pemanasan.'
    },
    entry: {
      en: 'Add the grounds to the heated upper chamber and complete the first controlled agitation.',
      id: 'Masukkan kopi ke ruang atas yang sudah panas dan lakukan agitasi pertama secara terkontrol.'
    },
    main: {
      en: 'At 30s, execute secondary vortex stir. At 60s, execute final turbulence before removing heat.',
      id: 'Pada 30d, lakukan adukan pusaran. Pada 60d, lakukan turbulensi terakhir sebelum matikan api.'
    },
    release: {
      en: 'Cut the heat. The triple-agitation forces the fines into suspension, making the vacuum drawdown slower and far more intense.',
      id: 'Matikan api. Agitasi tiga tahap dapat memperlambat penarikan vakum, jadi pantau waktu turun.'
    },
    finish: {
      en: 'This higher-agitation extraction targets a more intense profile and heavier body.',
      id: 'Ekstraksi dengan agitasi lebih tinggi ini menargetkan profil lebih intens dan body lebih tebal.'
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
      en: 'Avoid vigorous stirring and allow diffusion during the slightly longer contact time.',
      id: 'Hindari adukan kuat dan biarkan difusi berlangsung selama waktu kontak yang sedikit lebih lama.'
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
      en: 'Stir once from the bottom to wet all grounds, then leave the slurry undisturbed.',
      id: 'Aduk sekali dari dasar untuk membasahi seluruh kopi, lalu biarkan seduhan tanpa gangguan.'
    },
    release: {
      en: 'Remove heat quickly. The coarse bed acts as a highly porous filter, allowing the vacuum to slam the liquid into the lower globe instantly.',
      id: 'Angkat dari api dengan cepat. Bed kasar bertindak sebagai filter berpori tinggi, membiarkan vakum membanting cairan ke bola bawah seketika.'
    },
    finish: {
      en: 'This yields a remarkably clean, heavy-bodied cup with a snappy finish, completely devoid of over-extracted bitterness.',
      id: 'Metode ini menargetkan body tebal dengan akhir rasa yang bersih tanpa pahit berlebih.'
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
      id: 'Sajikan setelah aroma infus menyatu dan intensitasnya tetap seimbang dengan karakter kopi.'
    }
  }
};;

const ORIGAMI_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  cone_dripper_style: {
    setup: {
      en: 'Set the conical filter into the Origami. Rinse gently to shape it without crushing the delicate paper into the ceramic grooves.',
      id: 'Pasang filter kerucut ke Origami dan bilas perlahan agar bentuk filter tetap rapi.'
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
      en: 'Let the bed drain and monitor the faster drawdown created by the cone-and-ridge geometry.',
      id: 'Biarkan hamparan kopi meniris dan pantau aliran cepat dari geometri filter kerucut dan rusuk.'
    },
    finish: {
      en: 'Serve a bright cup; the faster flow can emphasize delicate acidity and floral notes.',
      id: 'Sajikan cangkir yang cerah; aliran cepat ini menonjolkan keasaman lembut dan karakter bunga.'
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
      id: 'Tuang perlahan. Filter wave Origami membantu menjaga aliran stabil untuk menargetkan rasa manis.'
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
      en: 'Skip the bloom and use one continuous pour to wet all grounds evenly.',
      id: 'Lewati blooming dan gunakan satu tuangan kontinu untuk membasahi seluruh kopi secara merata.'
    },
    main: {
      en: 'Maintain a slow, steady center pour until the entire water weight is added. Do not stop.',
      id: 'Pertahankan tuangan tengah yang lambat dan stabil hingga seluruh berat air ditambahkan. Jangan berhenti.'
    },
    release: {
      en: 'Let gravity complete the drawdown while keeping the water column stable.',
      id: 'Biarkan gravitasi menyelesaikan penirisan sambil menjaga kolom air tetap stabil.'
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
      en: 'Pour with enough flow to keep fine particles moving while monitoring bypass through the Origami ridges.',
      id: 'Tuang dengan aliran cukup cepat untuk menjaga partikel halus bergerak, sambil memantau bypass melalui rusuk Origami.'
    },
    release: {
      en: 'Watch the rapid drain directly onto the ice, freezing the volatile aromatics into the liquid instantly.',
      id: 'Saksikan aliran turun yang cepat langsung ke atas es, membekukan aromatik volatil ke dalam cairan seketika.'
    },
    finish: {
      en: 'Stir until evenly chilled. This method targets a bright, clean iced filter coffee.',
      id: 'Aduk hingga suhu merata. Metode ini menargetkan kopi filter es yang cerah dan bersih.'
    }
  },
  competition_hybrid_flow: {
    setup: {
      en: 'Seat a conical filter but prepare for a multi-stage thermal profile. Preheat the ceramic body heavily.',
      id: 'Pasang filter kerucut namun bersiaplah untuk profil termal multi-tahap. Panaskan keramik dengan intensif.'
    },
    entry: {
      en: 'Use a short, fast bloom with even saturation to support degassing.',
      id: 'Lakukan blooming singkat dengan pembasahan merata untuk membantu pelepasan gas.'
    },
    main: {
      en: 'Transition to slow center pulses, moving from the initial hydration into controlled percolation.',
      id: 'Beralih ke pulsa tengah yang lambat untuk memindahkan proses dari hidrasi awal ke perkolasi terkontrol.'
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
      en: 'Swirl gently. This April method targets sweetness, balance, and clear flavor structure.',
      id: 'Putar brewer dengan lembut. Metode April ini menargetkan rasa manis, keseimbangan, dan kejernihan.'
    }
  },
  april_continuous_slow: {
    setup: {
      en: 'Seat the filter carefully and use a slightly coarser grind for the longer contact time.',
      id: 'Pasang filter dengan hati-hati dan gunakan gilingan sedikit lebih kasar untuk waktu kontak yang lebih lama.'
    },
    entry: {
      en: 'Bloom without agitation so the coffee bed remains undisturbed.',
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
      en: 'This method targets a tea-like body, clear sweetness, and low astringency.',
      id: 'Harapkan body menyerupai teh dengan rasa manis monumental dan tanpa rasa sepat.'
    }
  },
  competition_two_pour: {
    setup: {
      en: 'Prepare the filter. This method uses two measured pours with consistent flow.',
      id: 'Siapkan filter. Metode ini menggunakan dua tuangan terukur dengan aliran yang konsisten.'
    },
    entry: {
      en: 'The first pour is 50% of the water weight. Use a steady flow to create controlled turbulence.',
      id: 'Tuangan pertama adalah 50% dari berat air. Gunakan aliran stabil untuk menciptakan turbulensi terkontrol.'
    },
    main: {
      en: 'At precisely the designated time, pour the remaining 50% with equal force. We are shock-extracting the coffee.',
      id: 'Pada waktu yang ditentukan secara presisi, tuang 50% sisanya dengan tenaga setara. Kita melakukan shock-extraction pada kopi.'
    },
    release: {
      en: 'The high volume forces a relatively fast drawdown despite the restricted base.',
      id: 'Volume tinggi dapat mempercepat aliran, jadi pantau penirisan meskipun dasar brewer memiliki pembatas.'
    },
    finish: {
      en: 'Serve a bright cup with clear flavor separation and a lively profile.',
      id: 'Sajikan cangkir yang cerah dengan separasi rasa yang jelas dan profil yang hidup.'
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
      en: 'Swirl to finish chilling. The resulting iced coffee should have a fuller body and clear sweetness.',
      id: 'Putar untuk menyelesaikan pendinginan. Targetkan kopi es dengan body lebih penuh dan rasa manis yang jelas.'
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
      id: 'Jaga ketinggian air tetap rendah dengan pulsa kecil agar kontak dengan hamparan kopi tetap terkendali.'
    },
    release: {
      en: 'Allow a long, syrupy drawdown. The coarse grind prevents choking while the restricted base extends contact time.',
      id: 'Biarkan penirisan kental yang panjang. Gilingan kasar mencegah mampet, sementara dasar yang membatasi memperpanjang waktu kontak.'
    },
    finish: {
      en: 'Serve a robust profile with heavy body and pronounced sweetness.',
      id: 'Sajikan profil kuat dengan body tebal dan rasa manis yang jelas.'
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
      en: 'Serve a dense, classic cup with a rounded body and familiar sweetness.',
      id: 'Sajikan cangkir klasik yang padat dengan body bulat dan rasa manis yang familiar.'
    }
  },
  aromaboy_style: {
    setup: {
      en: 'Use a fine grind for this micro-dose. The wedge geometry becomes heavily concentrated at small volumes.',
      id: 'Gunakan gilingan halus untuk dosis mikro ini. Geometri kerucut menjadi sangat terkonsentrasi pada volume kecil.'
    },
    entry: {
      en: 'Measure the bloom carefully because this is a low-volume brew.',
      id: 'Lakukan blooming secara terukur karena volume seduhan ini kecil.'
    },
    main: {
      en: 'Pour in tight, tiny pulses. Do not wash the filter walls, keep the water strictly engaged with the central coffee mass.',
      id: 'Tuang dalam pulsa ketat dan kecil. Jangan membilas dinding filter, jaga air hanya berinteraksi dengan massa kopi tengah.'
    },
    release: {
      en: 'Watch the rapid drain. The small bed size forces a quick drawdown despite the restricted hole.',
      id: 'Pantau aliran karena hamparan kopi yang kecil dapat meniris cepat meskipun bukaan dasar terbatas.'
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
      en: 'Bloom the coffee and stir gently if needed so no dry pockets remain near the wedge base.',
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
      en: 'Load the measured ice into the server. The wedge brewer will produce a concentrated hot extraction over it.',
      id: 'Masukkan es yang sudah ditimbang ke dalam wadah saji. Brewer berbentuk kerucut akan menghasilkan ekstraksi panas yang pekat di atasnya.'
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
      en: 'Place the conical filter in the Kono and seat it evenly so the upper wall contact helps regulate flow.',
      id: 'Pasang filter kerucut ke Kono dan pastikan menempel rata agar aliran tetap terkendali.'
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
      id: 'Sajikan cangkir dengan tekstur kental dan body tebal sesuai karakter metode Kono Meimon.'
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
      en: 'Seat the filter tightly against the upper walls to limit bypass airflow before brewing.',
      id: 'Bersiaplah untuk kesabaran mutlak. Filter harus menyegel ketat dinding atas untuk memblokir seluruh aliran udara bypass.'
    },
    entry: {
      en: 'Drip water onto the grounds drop by drop until hydrated. This can take over a minute.',
      id: 'Teteskan air ke bubuk kopi tetes demi tetes hingga massa terhidrasi. Ini bisa memakan waktu semenit.'
    },
    main: {
      en: 'Keep the water level low and pour through the center of the dense coffee bed.',
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
      en: 'Swirl to finish chilling, then serve a heavy-bodied iced coffee after checking dilution.',
      id: 'Putar untuk merampungkan pendinginan. Sajikan kopi es ber-body berat yang mendalam tanpa jejak encer sama sekali.'
    }
  },
  kono_agitation_sweet: {
    setup: {
      en: 'Seat the filter without pressing it tightly against the walls. Use a coarser grind to support flow.',
      id: 'Pasang filter tanpa menekannya terlalu rapat ke dinding. Gunakan gilingan lebih kasar untuk menjaga aliran.'
    },
    entry: {
      en: 'Execute a fast, highly turbulent bloom. Immediately disrupt the typically calm Kono bed to unlock deep sweetness.',
      id: 'Lakukan blooming cepat bersuhu tinggi. Segera ganggu hamparan Kono yang biasanya tenang ini untuk membuka kemanisan mendalam.'
    },
    main: {
      en: 'Pour in controlled concentric circles and monitor flow through the short lower ribs.',
      id: 'Tuang dalam lingkaran konsentris secara terkontrol dan pantau aliran melalui rusuk pendek di dasar.'
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
