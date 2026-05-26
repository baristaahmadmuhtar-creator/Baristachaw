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

const FRENCH_PRESS_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional: {
    setup: {
      en: 'Preheat your French Press beaker with hot water, discard the water, and add your coarsely ground coffee.',
      id: 'Panaskan terlebih dahulu French Press beaker dengan air panas, buang airnya, lalu masukkan bubuk kopi gilingan kasar.',
    },
    entry: {
      en: 'Pour hot water rapidly to saturate every grounds pocket, ensuring complete saturation.',
      id: 'Tuang air panas secara cepat untuk membasahi setiap bagian bubuk kopi, memastikan pembasahan sempurna.',
    },
    main: {
      en: 'Place the lid on the plunger cleanly but do not press down; let the immersion steep calmly.',
      id: 'Pasang tutup plunger dengan bersih tetapi jangan ditekan; biarkan rendaman (immersion) menyeduh dengan tenang.',
    },
    release: {
      en: 'Press the plunger down slowly with stable, gentle force until the mesh reaches the bottom puck.',
      id: 'Tekan plunger ke bawah secara perlahan dengan tenaga yang lembut dan stabil hingga mesh menyentuh dasar bed kopi.',
    },
    finish: {
      en: 'Decant the full beverage immediately into your cups or a carafe to prevent over-extraction and bitterness.',
      id: 'Tuang pisah seluruh seduhan segera ke dalam cangkir atau wadah terpisah untuk mencegah over-ekstraksi dan rasa pahit.',
    },
  },
  clean_decant: {
    setup: {
      en: 'Preheat the beaker, weigh your medium-coarse grounds, and start with a swift, boiling charge.',
      id: 'Panaskan beaker, timbang kopi gilingan medium-coarse, lalu mulai dengan tuangan air mendidih yang cepat.',
    },
    entry: {
      en: 'Pour boiling water swiftly over the grounds to wet all coffee evenly and maximize heat retention.',
      id: 'Tuang air mendidih dengan cepat ke atas kopi untuk membasahi kopi secara merata dan memaksimalkan retensi panas.',
    },
    main: {
      en: 'Let steep for 4 minutes. Stir the crust gently, skim the surface foam and floating oils, and let settle for 4-5 minutes.',
      id: 'Biarkan merendam 4 menit. Aduk kerak (crust) perlahan, bersihkan busa permukaan dan minyak mengapung, lalu biarkan mengendap 4-5 menit.',
    },
    release: {
      en: 'Fit the plunger and lower it just to touch the liquid surface; do not plunge down to avoid disturbing settled fines.',
      id: 'Pasang plunger dan turunkan mesh hanya sampai batas permukaan kopi; jangan ditekan ke bawah agar partikel halus dasar tidak keruh.',
    },
    finish: {
      en: 'Decant extremely slowly and gently, leaving the last bit of liquid and settled silt inside the beaker.',
      id: 'Tuang pisah sangat perlahan dan lembut, tinggalkan sedikit cairan sisa dan endapan lumpur halus di dalam beaker.',
    },
  },
  double_filter: {
    setup: {
      en: 'Warm the beaker, load your medium grounds, and prepare your pre-wet double mesh screens or paper filter insert.',
      id: 'Hangatkan beaker, masukkan kopi gilingan sedang, dan siapkan double mesh screen atau filter kertas basah.',
    },
    entry: {
      en: 'Pour water in slow circular motions to saturate the grounds evenly without channeling.',
      id: 'Tuang air secara perlahan dengan gerakan memutar lembut untuk membasahi bed kopi secara merata tanpa rongga air.',
    },
    main: {
      en: 'Steep cleanly with the lid off; give a light, gentle swirl near the end to detach grounds from the walls.',
      id: 'Rendam bersih dengan tutup terbuka; goyang memutar (swirl) lembut menjelang akhir untuk melepaskan bubuk kopi dari dinding.',
    },
    release: {
      en: 'Insert the double filter assembly, and plunge extremely slowly with uniform, light force over 30 seconds.',
      id: 'Pasang rangkaian filter ganda, lalu tekan plunger sangat lambat dengan tenaga ringan yang seragam selama 30 detik.',
    },
    finish: {
      en: 'Serve the ultra-clean, silt-free cup immediately; enjoy high clarity and round, sweet immersion body.',
      id: 'Segera sajikan cangkir yang sangat jernih bebas ampas halus; nikmati kejernihan rasa tinggi dan body immersion yang manis.',
    },
  },
  heavy_concentrate: {
    setup: {
      en: 'Warm the beaker, add a high dose of fine-medium grounds, and prepare separate hot bypass water if desired.',
      id: 'Hangatkan beaker, masukkan bubuk kopi gilingan fine-medium dosis tinggi, dan siapkan air bypass panas jika diperlukan.',
    },
    entry: {
      en: 'Pour water rapidly over the heavy dose to fully saturate the grounds, then stir vigorously 5-6 times.',
      id: 'Tuang air panas secara cepat ke bed kopi dosis tinggi agar basah sempurna, lalu segera aduk kuat 5-6 kali.',
    },
    main: {
      en: 'Let the thick concentrate steep, allowing high agitation to dissolve heavy cocoa and syrupy body compounds.',
      id: 'Biarkan konsentrat kental merendam, membiarkan agitasi kuat melarutkan body cokelat tebal dan manis karamel.',
    },
    release: {
      en: 'Press the heavy plunger steadily down to the bottom of the puck, extracting the rich soluble core.',
      id: 'Tekan plunger yang terasa berat dengan stabil hingga ke dasar bed kopi, memeras seluruh inti sari rasa kental.',
    },
    finish: {
      en: 'Serve as a rich concentrate shot, or dilute with clean bypass water to open up sweet, balanced mouthfeel.',
      id: 'Sajikan langsung sebagai konsentrat kental padat, atau encerkan dengan air bypass untuk membuka mouthfeel seimbang.',
    },
  },
  sweet_immersion: {
    setup: {
      en: 'Preheat the beaker, weigh your medium-coarse grounds, and use a moderate temperature kettle.',
      id: 'Hangatkan beaker, timbang kopi gilingan medium-coarse, dan pastikan menggunakan air bersuhu sedang.',
    },
    entry: {
      en: 'Pour water gently to promote sweetness, and stir gently exactly 2 times with a light touch.',
      id: 'Tuang air secara lembut untuk memicu rasa manis, lalu segera aduk perlahan tepat 2 kali dengan sentuhan ringan.',
    },
    main: {
      en: 'Steep quietly at a slightly lower temperature to preserve sweet caramel solubility and protect against bitterness.',
      id: 'Rendam tenang pada suhu sedikit lebih rendah untuk menjaga kelarutan manis karamel dan melindunginya dari rasa pahit.',
    },
    release: {
      en: 'Plunge extremely slowly over 30 seconds with feather-light force to avoid fines migration.',
      id: 'Tekan plunger sangat perlahan selama 30 detik dengan tenaga sangat ringan untuk menghindari perpindahan partikel halus.',
    },
    finish: {
      en: 'Decant immediately into your cups; serve a beautifully sweet, round, and highly comforting cup.',
      id: 'Tuang pisah segera ke cangkir; sajikan cangkir yang sangat manis, bulat lembut, dan sangat nyaman dinikmati.',
    },
  },
};

const AEROPRESS_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  standard: {
    setup: {
      en: 'Lock the filter cap with a rinsed paper filter onto the chamber, place it upright over your mug, and add your medium-fine grounds.',
      id: 'Kunci filter cap dengan paper filter bilas ke chamber, posisikan tegak (upright) di atas cangkir, lalu masukkan bubuk kopi medium-fine.',
    },
    entry: {
      en: 'Pour hot water decisively to saturate the bed, then start your extraction timer.',
      id: 'Tuang air panas secara mantap untuk membasahi bed kopi, lalu segera nyalakan timer ekstraksi.',
    },
    main: {
      en: 'Stir gently to integrate the slurry, insert the plunger slightly to create a vacuum seal, and let steep quietly.',
      id: 'Aduk perlahan untuk meratakan slurry kopi, pasang plunger sedikit di atas untuk membuat vakum, lalu biarkan terendam tenang.',
    },
    release: {
      en: 'Remove the vacuum seal, press down with smooth, steady pressure, and stop as soon as you hear the first hiss.',
      id: 'Lepas segel vakum, tekan plunger dengan tekanan lembut yang stabil, dan segera berhenti begitu terdengar desis pertama.',
    },
    finish: {
      en: 'Swirl your mug once to mix the sweet early concentrate with the later extraction layers before serving.',
      id: 'Putar cangkir sekali agar konsentrat manis awal menyatu dengan lapisan ekstraksi akhir sebelum disajikan.',
    },
  },
  inverted: {
    setup: {
      en: 'Assemble the plunger inside the chamber just past mark 4, stand it upside down (inverted) on a level surface, and load your grounds.',
      id: 'Pasang plunger di dalam chamber tepat melewati angka 4, posisikan terbalik (inverted) di permukaan rata, lalu masukkan bubuk kopi.',
    },
    entry: {
      en: 'Pour water slowly, saturate the grounds edge-to-edge, and stir to ensure every particle is wet.',
      id: 'Tuang air perlahan, basahi bubuk kopi dari ujung ke ujung, lalu aduk agar setiap partikel terbasahi merata.',
    },
    main: {
      en: 'Screw the filter cap with a rinsed paper filter tightly, steep calmly, then flip decisively onto your mug in one smooth motion.',
      id: 'Pasang filter cap dengan paper filter basah dengan rapat, rendam dengan tenang, lalu balikkan dengan mantap ke atas cangkir dalam satu gerakan halus.',
    },
    release: {
      en: 'Begin a slow, controlled plunge, letting the weight of your hands guide the press until you hit the grounds bed.',
      id: 'Mulai penekanan yang lambat dan terkendali, biarkan berat tangan Anda menuntun press hingga menyentuh bed kopi.',
    },
    finish: {
      en: 'Serve the full-saturation immersion cup immediately while the rich, sweet aromatics are at their peak.',
      id: 'Sajikan hasil rendaman penuh (full-saturation immersion) segera selagi aroma manis yang kaya berada di puncaknya.',
    },
  },
  bypass: {
    setup: {
      en: 'Lock the filter cap upright, add a high dose of fine grounds, and keep your bypass water separate for post-brew dilution.',
      id: 'Kunci filter cap tegak, masukkan bubuk kopi halus dosis tinggi, dan pisahkan air bypass untuk dilusi setelah seduh.',
    },
    entry: {
      en: 'Pour a small amount of hot water to brew a compact concentrate, and stir aggressively to maximize early extraction.',
      id: 'Tuang sedikit air panas untuk menyeduh konsentrat padat, lalu aduk cukup kuat untuk memaksimalkan ekstraksi awal.',
    },
    main: {
      en: 'Let the dense slurry steep briefly, maintaining high solubility contact while protecting clarity.',
      id: 'Biarkan slurry yang padat terendam singkat, pertahankan kontak kelarutan tinggi sambil tetap menjaga kejernihan.',
    },
    release: {
      en: 'Press the heavy concentrate steadily, stop strictly before the hiss to block heavy lipids, and prepare for dilution.',
      id: 'Tekan konsentrat kental secara stabil, berhenti sebelum desis untuk menahan lipid berat, lalu bersiap untuk dilusi.',
    },
    finish: {
      en: 'Pour the clean bypass water directly into your server to open up sweet, vibrant, tea-like clarity.',
      id: 'Tuang air bypass bersih langsung ke server untuk membuka kejernihan rasa yang manis, hidup, dan menyerupai teh.',
    },
  },
  no_bypass: {
    setup: {
      en: 'Lock the filter cap with a rinsed filter, add a slightly coarser dose to prevent clogging, and preheat the chamber.',
      id: 'Kunci filter cap dengan filter bilas, masukkan dosis gilingan sedikit lebih kasar agar tidak mampet, dan hangatkan chamber.',
    },
    entry: {
      en: 'Pour the full recipe volume of water directly into the chamber, saturating the entire bed at once.',
      id: 'Tuang seluruh volume air resep langsung ke dalam chamber, membasahi seluruh bed sekaligus.',
    },
    main: {
      en: 'Stir gently to settle the grounds, insert the plunger to create a vacuum seal, and allow a longer steep for full extraction.',
      id: 'Aduk perlahan agar kopi rata, pasang plunger untuk segel vakum, dan biarkan rendaman lebih lama agar ekstraksi tuntas.',
    },
    release: {
      en: 'Remove the plunger, press slowly and steadily over 30-40 seconds, letting the full chamber volume drain cleanly.',
      id: 'Lepas plunger, tekan perlahan dan stabil selama 30-40 detik, biarkan seluruh volume chamber turun habis dengan bersih.',
    },
    finish: {
      en: 'Serve the heavy-bodied, sweet, and uniform extraction cup immediately.',
      id: 'Segera sajikan cangkir hasil ekstraksi yang tebal (heavy-bodied), manis, dan sangat seragam.',
    },
  },
  bright_clean: {
    setup: {
      en: 'Insert two rinsed paper filters into the cap, lock it upright, and add your medium-coarse grounds.',
      id: 'Pasang dua paper filter bilas ke dalam cap, kunci tegak, lalu masukkan bubuk kopi gilingan medium-coarse.',
    },
    entry: {
      en: 'Pour hot water swiftly in circular motions to wet the grounds quickly and minimize early bypass.',
      id: 'Tuang air panas cepat dengan gerakan memutar untuk membasahi kopi dengan lekas dan meminimalkan bypass awal.',
    },
    main: {
      en: 'Stir gently exactly 2 times to prevent fines from migrating, cap to seal, and keep the steep short.',
      id: 'Aduk perlahan tepat 2 kali agar fines tidak berpindah, pasang cap vakum, dan jaga rendaman tetap singkat.',
    },
    release: {
      en: 'Press extremely slowly over 35-40 seconds with minimal force, and stop strictly before the first hiss.',
      id: 'Tekan sangat perlahan selama 35-40 detik dengan tenaga minimal, dan berhenti tepat sebelum desis pertama.',
    },
    finish: {
      en: 'Serve the incredibly clean, sparkling cup with clear florals and bright acidity.',
      id: 'Sajikan cangkir yang sangat jernih dan gemilang dengan aroma floral yang bersih dan acidity cerah.',
    },
  },
  sweet_body: {
    setup: {
      en: 'Lock the filter cap (use a metal filter if you prefer heavy oils), add your fine grounds, and preheat.',
      id: 'Kunci filter cap (gunakan metal filter jika menyukai minyak kopi tebal), masukkan kopi gilingan halus, lalu hangatkan.',
    },
    entry: {
      en: 'Pour hot water, make sure the grounds are fully saturated, and prepare for vigorous agitation.',
      id: 'Tuang air panas, pastikan bubuk kopi basah sempurna, dan bersiaplah untuk agitasi yang kuat.',
    },
    main: {
      en: 'Stir vigorously 5-6 times to maximize extraction, insert the plunger to seal, and allow a longer immersion.',
      id: 'Aduk kuat 5-6 kali untuk memaksimalkan ekstraksi, pasang plunger untuk menyegel, dan biarkan rendaman lebih lama.',
    },
    release: {
      en: 'Press with slow, steady force down to the absolute bottom of the puck to squeeze out sweet soluble layers.',
      id: 'Tekan dengan tenaga lambat dan stabil hingga ke bagian terbawah puck untuk memeras lapisan larutan yang manis.',
    },
    finish: {
      en: 'Stir the rich, syrupy concentrate once and serve; perfect for balancing milk or drinking rich and black.',
      id: 'Aduk konsentrat kental yang manis sirup sekali dan sajikan; sangat cocok dengan susu atau diminum hitam pekat.',
    },
  },
};

const SWITCH_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  hybrid_balanced: {
    setup: {
      en: 'Close the valve, place a rinsed paper filter, add medium-fine grounds, and preheat the glass server.',
      id: 'Tutup katup, pasang paper filter bilas, masukkan kopi gilingan medium-fine, dan hangatkan server kaca.',
    },
    entry: {
      en: 'Pour the bloom water with the valve closed, saturating all grounds evenly to build sweet initial compounds.',
      id: 'Tuang air bloom dalam kondisi katup tertutup, membasahi bubuk kopi merata untuk membentuk senyawa manis awal.',
    },
    main: {
      en: 'Add the remaining closed-phase water to steep, letting controlled immersion extract balanced sweetness.',
      id: 'Tambahkan sisa air fase tertutup untuk merendam, membiarkan rendaman terkendali mengekstrak kemanisan yang seimbang.',
    },
    release: {
      en: 'Open the valve decisively to release the concentrate, then continue with open percolation for a clean finish.',
      id: 'Buka katup secara mantap untuk mengalirkan konsentrat, lalu lanjutkan dengan perkolasi terbuka untuk akhir yang bersih.',
    },
    finish: {
      en: 'Let the final water drain completely, mix the server thoroughly, and serve a beautifully balanced cup.',
      id: 'Biarkan air akhir turun habis sempurna, aduk server hingga tercampur rata, lalu sajikan cangkir yang seimbang.',
    },
  },
  hybrid_bright_clean: {
    setup: {
      en: 'Keep the valve open, rinse your paper filter thoroughly, add medium grounds, and preheat the brewer.',
      id: 'Biarkan katup terbuka, bilas paper filter dengan bersih, masukkan kopi gilingan medium, dan hangatkan brewer.',
    },
    entry: {
      en: 'Perform an open bloom and early pour to wash out bright acids and volatile floral aromatics cleanly.',
      id: 'Lakukan bloom terbuka dan tuangan awal untuk mengalirkan asam cerah (acidity) dan aroma floral yang bersih.',
    },
    main: {
      en: 'Close the valve briefly mid-brew, pouring center-focused to capture sweet fruits without pushing heavy body.',
      id: 'Tutup katup singkat di tengah seduhan, tuang fokus di tengah untuk menangkap rasa buah manis tanpa menambah body tebal.',
    },
    release: {
      en: 'Open the valve early and let the drawdown run swiftly, preventing late-extraction bitterness.',
      id: 'Buka katup lebih awal dan biarkan air turun dengan cepat, mencegah rasa pahit akibat ekstraksi akhir yang berlebih.',
    },
    finish: {
      en: 'Remove the brewer once the water clears, swirl the server, and enjoy a sparkling, clean cup.',
      id: 'Angkat brewer begitu aliran air habis, putar server perlahan, dan nikmati cangkir yang bersih dan gemilang.',
    },
  },
  immersion_sweet: {
    setup: {
      en: 'Close the valve tightly, seat the paper filter, and add your medium-coarse grounds.',
      id: 'Tutup katup rapat-rapat, pasang paper filter, dan masukkan bubuk kopi gilingan medium-coarse.',
    },
    entry: {
      en: 'Pour the bloom water gently to preserve sweet sugars, and avoid any harsh agitation on the coffee bed.',
      id: 'Tuang air bloom secara perlahan untuk mempertahankan senyawa gula manis, dan hindari agitasi kasar pada bed kopi.',
    },
    main: {
      en: 'Fill the remaining volume with the valve closed, letting the coffee steep quietly for full sweet solubility.',
      id: 'Isi sisa volume air dalam kondisi katup tertutup, biarkan kopi merendam tenang untuk kelarutan manis yang optimal.',
    },
    release: {
      en: 'Release the valve gently, allowing the sweet liquid to drain smoothly without disturbing the bed.',
      id: 'Buka katup dengan lembut, biarkan cairan manis mengalir turun dengan lancar tanpa mengganggu kestabilan bed kopi.',
    },
    finish: {
      en: 'Decant immediately after the drawdown clears; serve an incredibly sweet, round, and low-bitterness cup.',
      id: 'Tuang segera setelah air turun habis; sajikan cangkir yang sangat manis, bulat lembut, dan berbitterness rendah.',
    },
  },
  immersion_heavy_body: {
    setup: {
      en: 'Close the valve, rinse your filter, add a high dose of fine-medium grounds, and prepare a preheated server.',
      id: 'Tutup katup, bilas filter kertas, masukkan kopi dosis tinggi gilingan fine-medium, dan siapkan server yang hangat.',
    },
    entry: {
      en: 'Charge the chamber rapidly with hot water to wet the dense bed, and stir gently 2-3 times to integrate.',
      id: 'Isi ruang dengan air panas secara cepat untuk membasahi bed yang padat, lalu aduk perlahan 2-3 kali agar rata.',
    },
    main: {
      en: 'Steep for an extended duration, letting high-temperature water dissolve rich chocolate and deep body compounds.',
      id: 'Rendam lebih lama, membiarkan air bersuhu tinggi melarutkan rasa cokelat pekat dan senyawa body yang tebal.',
    },
    release: {
      en: 'Open the valve completely, letting gravity draw down the heavy concentrate until the grounds bed is exposed.',
      id: 'Buka katup sepenuhnya, biarkan gravitasi menarik turun konsentrat tebal hingga bed kopi terlihat kering.',
    },
    finish: {
      en: 'Swirl the rich server intensely to blend the heavy oils, and serve a bold, syrupy cup immediately.',
      id: 'Putar server yang berisi konsentrat kental agar minyak kopi menyatu, lalu segera sajikan cangkir yang bold dan bersirup.',
    },
  },
  v60_mode: {
    setup: {
      en: 'Open the valve from the very beginning, seat the paper filter, add medium-fine grounds, and preheat glass.',
      id: 'Buka katup sejak awal, pasang paper filter, masukkan kopi gilingan medium-fine, dan hangatkan server kaca.',
    },
    entry: {
      en: 'Pour the bloom water with the valve open, using center-to-mid spirals to wet all grounds evenly.',
      id: 'Tuang air bloom dalam kondisi katup terbuka, gunakan gerakan spiral tengah-ke-samping untuk membasahi bed merata.',
    },
    main: {
      en: 'Build the extraction volume with concentric pours, keeping a steady water level and agile flow.',
      id: 'Bangun volume ekstraksi dengan tuangan memutar (concentric), jaga ketinggian air tetap stabil dan aliran lancar.',
    },
    release: {
      en: 'Maintain an open valve throughout the brew, letting the percolation run naturally without any valve shifts.',
      id: 'Pertahankan katup terbuka sepanjang penyeduhan, biarkan perkolasi berjalan alami tanpa perubahan posisi katup.',
    },
    finish: {
      en: 'Let the drawdown finish cleanly, discard the filter, and serve a sparkling cup with high clarity.',
      id: 'Biarkan air turun selesai bersih, buang filter, lalu sajikan cangkir yang jernih dengan clarity tinggi.',
    },
  },
  iced_hybrid: {
    setup: {
      en: 'Close the valve, preheat the brewer, add medium grounds, and weigh the measured ice directly into the server.',
      id: 'Tutup katup, hangatkan brewer, masukkan kopi gilingan medium, dan timbang es batu terukur langsung di dalam server.',
    },
    entry: {
      en: 'Pour hot bloom water over the closed chamber, creating a highly concentrated extract to melt the ice efficiently.',
      id: 'Tuang air bloom panas ke ruang tertutup, membuat konsentrat padat untuk mencairkan es secara efisien nantinya.',
    },
    main: {
      en: 'Fill the chamber to target with the valve closed, steeping to extract deep sweetness and combat dilution.',
      id: 'Isi ruang sesuai target dengan katup tertutup, merendam kopi untuk mendapat rasa manis pekat demi menahan dilusi es.',
    },
    release: {
      en: 'Open the valve and release the hot, rich concentrate directly over the ice cubes in the server.',
      id: 'Buka katup dan alirkan konsentrat panas yang pekat langsung di atas es batu di dalam server.',
    },
    finish: {
      en: 'Stir the server vigorously for 5-8 seconds to flash-chill the coffee, and serve over fresh ice immediately.',
      id: 'Aduk server dengan kuat selama 5-8 detik untuk mendinginkan kopi seketika, lalu segera sajikan di atas es segar.',
    },
  },
  mugen_everyday_hybrid: {
    setup: {
      en: 'Close the valve on the MUGEN, seat your paper filter tightly against the flat ribs, and add medium-coarse grounds.',
      id: 'Tutup katup pada MUGEN, pasang paper filter rapat pada rib datar, dan masukkan kopi gilingan medium-coarse.',
    },
    entry: {
      en: 'Pour a compact bloom with the valve closed, saturating all grounds in the low-bypass chamber.',
      id: 'Tuang bloom padat dengan katup tertutup, membasahi bubuk kopi merata di dalam ruang low-bypass MUGEN.',
    },
    main: {
      en: 'Perform a single, steady pour to target with the valve closed, allowing MUGEN\'s slow bypass to build uniform sweetness.',
      id: 'Lakukan satu tuangan stabil hingga target dengan katup tertutup, membiarkan aliran lambat MUGEN membentuk rasa manis merata.',
    },
    release: {
      en: 'Open the valve decisively and let the single-pour extract draw down slowly through the flat ribs.',
      id: 'Buka katup secara mantap dan biarkan hasil ekstraksi satu tuangan turun perlahan melalui rib datar MUGEN.',
    },
    finish: {
      en: 'Allow the drawdown to finish cleanly, remove the MUGEN, swirl the server, and enjoy a rich everyday cup.',
      id: 'Biarkan air turun selesai bersih, angkat MUGEN, putar server, lalu nikmati cangkir harian yang kaya rasa.',
    },
  },
};

const KALITA_WAVE_STYLE_TUTORIALS: Record<
  Exclude<KalitaWaveRecipeStyle, 'auto'>,
  WorkflowTutorialProfile
> = {
  traditional_flat_three: {
    setup: {
      en: 'Seat the wave filter neatly and level the bed so all three holes share the flow.',
      id: 'Pasang filter wave dengan rapi dan ratakan bed agar tiga lubang berbagi aliran.',
    },
    entry: {
      en: 'Bloom evenly without flooding one side; flat-bottom brewers need a level start.',
      id: 'Bloom merata tanpa membanjiri satu sisi; flat-bottom butuh awal yang rata.',
    },
    main: {
      en: 'Use calm, distinct pours from center to mid; keep the bed even and fluted walls untouched.',
      id: 'Gunakan tuangan tenang terpisah dari tengah ke tengah-luar; bed tetap rata dan lipatan dinding jangan disentuh.',
    },
    release: {
      en: 'Let the flat bed drain cleanly; do not shake fines into the holes.',
      id: 'Biarkan bed rata turun bersih; jangan mengguncang fines ke lubang bawah.',
    },
    finish: {
      en: 'Serve after a light mix so the sweet flat-bottom body is even.',
      id: 'Sajikan setelah aduk ringan agar body manis flat-bottom terasa rata.',
    },
  },
  competition_fast_four: {
    setup: {
      en: 'Fold filter ridge edges gently to maintain high concentric bypass spacing.',
      id: 'Lipat pinggiran filter dengan lembut untuk menjaga celah bypass konsentris yang tinggi.',
    },
    entry: {
      en: 'Bloom rapidly with concentric circles; push hydration early to unlock bright fruit notes.',
      id: 'Bloom cepat dengan lingkaran konsentris; dorong hidrasi awal untuk menonjolkan note buah yang cerah.',
    },
    main: {
      en: 'Pour in fast, heavy center concentric pulses to agitate coffee actively for maximum velocity.',
      id: 'Tuang dalam pulsa konsentris tengah yang cepat dan berat untuk mengagitasi kopi aktif demi kecepatan maksimal.',
    },
    release: {
      en: 'Let the fast drawdown clear completely; the bed must settle perfectly flat.',
      id: 'Biarkan air turun yang cepat habis sepenuhnya; bed harus mengendap rata sempurna.',
    },
    finish: {
      en: 'Decant immediately to preserve high aromatic volatility and crisp acidity.',
      id: 'Tuang segera untuk menjaga aroma volatil yang tinggi dan acidity yang segar.',
    },
  },
  continuous_slow_stream: {
    setup: {
      en: 'Pre-wet the wave filter edge to edge to lock flutes firmly against the dripper wall.',
      id: 'Bilas kertas filter wave dari ujung ke ujung untuk mengunci lipatan kertas ke dinding dripper.',
    },
    entry: {
      en: 'Bloom compactly near the center, keeping the water level low and undisturbed.',
      id: 'Bloom secara ringkas dekat pusat, menjaga level air tetap rendah dan tenang.',
    },
    main: {
      en: 'Pour in an extremely slow, continuous centered stream to maintain a constant water column.',
      id: 'Tuang dalam aliran tengah yang sangat lambat dan kontinu untuk menjaga kolom air tetap konstan.',
    },
    release: {
      en: 'Allow the quiet column to draw down slowly; avoid any late swirl or agitation.',
      id: 'Biarkan kolom air yang tenang turun perlahan; hindari putaran atau agitasi akhir.',
    },
    finish: {
      en: 'Serve a sweet, heavy cup with velvety mouthfeel and syrupy body.',
      id: 'Sajikan cangkir yang manis dan berat dengan mouthfeel beludru dan body sepekat sirup.',
    },
  },
  iced_wave: {
    setup: {
      en: 'Rinse the wave filter, tare server, and put pre-weighed ice directly inside the server.',
      id: 'Bilas filter wave, tare server, dan masukkan es terukur langsung ke dalam server.',
    },
    entry: {
      en: 'Bloom hot onto the dry bed; let gassing complete quickly inside the small wave cup.',
      id: 'Bloom panas ke atas bed kering; biarkan gas keluar dengan cepat di dalam cangkir wave kecil.',
    },
    main: {
      en: 'Pour hot water in concentric center pulses, keeping extraction pekat directly onto ice.',
      id: 'Tuang air panas dalam pulsa konsentris tengah, menjaga ekstraksi pekat langsung ke atas es.',
    },
    release: {
      en: 'Allow rapid drawdown directly over ice to lock delicate fruit acids instantly.',
      id: 'Biarkan air turun cepat ke atas es untuk langsung mengunci keasaman buah yang halus.',
    },
    finish: {
      en: 'Swirl the server 5-8 seconds so the concentrate blends with melting ice evenly.',
      id: 'Putar server 5-8 detik agar konsentrat menyatu dengan es leleh secara merata.',
    },
  },
  high_dose_concentrate: {
    setup: {
      en: 'Seat the filter neatly and use a coarser grind to prevent bottom hole clogging.',
      id: 'Pasang filter dengan rapi dan gunakan gilingan lebih kasar agar lubang bawah tidak tersumbat.',
    },
    entry: {
      en: 'Bloom slowly and concentrically; ensure complete hydration of the deep dry bed.',
      id: 'Bloom lambat dan konsentris; pastikan hidrasi sempurna pada bed kering yang dalam.',
    },
    main: {
      en: 'Pour in slow, heavy pulses near the center, maintaining a low slurry level to avoid bypass.',
      id: 'Tuang dalam pulsa berat dan lambat dekat pusat, menjaga level cairan rendah untuk menghindari bypass.',
    },
    release: {
      en: 'Let the thick syrupy concentrate drain slowly; do not stir the filter walls.',
      id: 'Biarkan konsentrat kental sepekat sirup mengalir pelan; jangan mengaduk dinding filter.',
    },
    finish: {
      en: 'Serve the heavy concentrate neat, or dilute with hot water for a sweet bypass cup.',
      id: 'Sajikan konsentrat tebal secara murni, atau encerkan dengan air panas untuk cangkir manis bypass.',
    },
  },
};

const CLEVER_DRIPPER_STYLE_TUTORIALS: Record<
  Exclude<CleverDripperRecipeStyle, 'auto'>,
  WorkflowTutorialProfile
> = {
  classic_closed: {
    setup: {
      en: 'Close the valve, seat your paper filter, preheat the Clever, and add your medium grounds.',
      id: 'Tutup katup, pasang paper filter, hangatkan Clever, dan masukkan bubuk kopi gilingan medium.',
    },
    entry: {
      en: 'Pour all hot water slowly over grounds. Close the lid immediately to lock heat.',
      id: 'Tuang seluruh air panas perlahan ke atas bubuk kopi. Segera tutup penutupnya untuk menahan panas.',
    },
    main: {
      en: 'Let the closed immersion steep calmly; avoid stirring to preserve high clarity.',
      id: 'Biarkan rendaman tertutup tenang; hindari pengadukan untuk menjaga kejernihan yang tinggi.',
    },
    release: {
      en: 'Place the Clever Dripper onto your server to activate the release valve and drain.',
      id: 'Letakkan Clever Dripper di atas server untuk membuka katup pembuang dan mengalirkan kopi.',
    },
    finish: {
      en: 'Let the drawdown finish completely, remove the brewer, and serve a sweet, balanced cup.',
      id: 'Biarkan air turun selesai sepenuhnya, angkat brewer, dan sajikan cangkir yang manis dan seimbang.',
    },
  },
  reverse_water_first: {
    setup: {
      en: 'Close the valve, rinse your filter, and pour all hot water into the empty closed chamber first.',
      id: 'Tutup katup, bilas filter, dan tuangkan seluruh air panas ke dalam wadah kosong yang tertutup terlebih dahulu.',
    },
    entry: {
      en: 'Gently scatter all coffee grounds onto the water surface. Do not stir or swirl!',
      id: 'Taburkan bubuk kopi dengan lembut ke permukaan air. Jangan diaduk atau diputar!',
    },
    main: {
      en: 'Close the lid and let steep. The grounds will extract gently as they sink naturally.',
      id: 'Tutup penutupnya dan biarkan merendam. Bubuk kopi akan terekstraksi lembut saat tenggelam alami.',
    },
    release: {
      en: 'Place on server to activate release valve. The clean liquor will drain without filter clogging.',
      id: 'Letakkan di atas server untuk mengaktifkan katup pembuang. Cairan bersih akan mengalir tanpa menyumbat filter.',
    },
    finish: {
      en: 'Let it drain completely. Enjoy brilliant cup clarity and sweet, delicate flavors.',
      id: 'Biarkan mengalir keluar sepenuhnya. Nikmati kejernihan cangkir yang cemerlang dan rasa manis yang lembut.',
    },
  },
  double_stage_hybrid: {
    setup: {
      en: 'Close the valve, rinse your filter, tare the scale, and add medium grounds.',
      id: 'Tutup katup, bilas filter, tare timbangan, dan masukkan kopi gilingan medium.',
    },
    entry: {
      en: 'Pour a small closed bloom to saturate grounds evenly, capturing rich, sweet compounds.',
      id: 'Tuang air bloom tertutup sedikit untuk membasahi kopi merata, menangkap senyawa manis awal.',
    },
    main: {
      en: 'Pour the second portion in spirals with the valve open, then lift the dripper to close the valve and pour the final water.',
      id: 'Tuang porsi kedua secara spiral dengan katup terbuka, lalu angkat dripper untuk menutup katup dan tuang sisa air.',
    },
    release: {
      en: 'Steep closed briefly for sweet body, then place back on the server to activate final release.',
      id: 'Rendam tertutup singkat untuk sweet body, lalu letakkan kembali di atas server untuk rilis akhir.',
    },
    finish: {
      en: 'Let the drawdown finish completely with a level bed; enjoy high cup complexity.',
      id: 'Biarkan air turun selesai sepenuhnya dengan bed kopi rata; nikmati kompleksitas rasa tinggi.',
    },
  },
  iced_clever: {
    setup: {
      en: 'Close the valve, weigh your ice directly into the server, and add fine grounds to the Clever.',
      id: 'Tutup katup, timbang es langsung ke dalam server, dan masukkan kopi gilingan halus ke dalam Clever.',
    },
    entry: {
      en: 'Pour all hot water rapidly into the closed chamber to brew a high-heat concentrate, and stir 3 times.',
      id: 'Tuang seluruh air panas cepat ke wadah tertutup untuk membuat konsentrat panas, lalu aduk 3 kali.',
    },
    main: {
      en: 'Close the lid and steep calmly to trap all volatile fruit aromatics inside the chamber.',
      id: 'Tutup penutupnya dan rendam tenang untuk mengunci aromatik buah volatil di dalam wadah.',
    },
    release: {
      en: 'Place the Clever on the server to release the hot concentrate directly over the ice cubes.',
      id: 'Letakkan Clever di atas server untuk mengeluarkan konsentrat panas langsung ke atas es batu.',
    },
    finish: {
      en: 'Let drawdown finish completely, then swirl the server to melt the ice evenly; serve cold.',
      id: 'Biarkan air turun selesai, lalu putar server untuk melelehkan es secara merata; sajikan dingin.',
    },
  },
  high_dose_concentrate: {
    setup: {
      en: 'Close the valve, add a massive dose of coarse grounds, and preheat the chamber.',
      id: 'Tutup katup, masukkan kopi gilingan kasar dosis sangat tinggi, dan hangatkan wadah.',
    },
    entry: {
      en: 'Pour hot water slowly in circular paths over the heavy bed, and stir gently to wet all grounds.',
      id: 'Tuang air panas perlahan secara melingkar ke atas kopi dosis besar, lalu aduk perlahan agar basah merata.',
    },
    main: {
      en: 'Close the lid and let steep for an extended 3.5 minutes to maximize soluble density.',
      id: 'Tutup penutupnya dan biarkan merendam selama 3,5 menit ekstra untuk memaksimalkan densitas larutan.',
    },
    release: {
      en: 'Place on server to activate release. The coarse grind will prevent the heavy bed from clogging.',
      id: 'Letakkan di atas server untuk melepas katup. Gilingan kasar akan mencegah bed tebal tersumbat.',
    },
    finish: {
      en: 'Let the rich, syrupy concentrate drain completely. Dilute with hot water bypass if desired.',
      id: 'Biarkan konsentrat tebal sepekat sirup mengalir habis. Encerkan dengan bypass air panas jika suka.',
    },
  },
};

const CHEMEX_STYLE_TUTORIALS: Record<
  Exclude<ChemexRecipeStyle, 'auto'>,
  WorkflowTutorialProfile
> = {
  traditional_three_pour: {
    setup: {
      en: 'Rinse the thick paper, align the 3-fold side with the spout, preheat, and add medium-coarse grounds.',
      id: 'Bilas kertas tebal, sejajarkan sisi 3-lipat dengan spout, hangatkan, dan masukkan kopi gilingan medium-coarse.',
    },
    entry: {
      en: 'Wet grounds gently with a balanced bloom, keeping the bed level for even gas escape.',
      id: 'Basahi kopi dengan lembut lewat bloom yang seimbang, menjaga bed rata agar gas keluar merata.',
    },
    main: {
      en: 'Pour the second portion in slow concentric rings; keep the stream off the paper walls.',
      id: 'Tuang porsi kedua dalam lingkaran konsentris lambat; jauhkan aliran air dari dinding kertas filter.',
    },
    release: {
      en: 'Pour the final portion in the center and allow a slow percolation through thick wood-fiber.',
      id: 'Tuang porsi akhir di pusat dan biarkan perkolasi lambat mengalir melewati serat kayu tebal.',
    },
    finish: {
      en: 'Let drawdown drain completely; the dense filter will ensure maximum clarity and sweetness.',
      id: 'Biarkan air turun mengalir habis; filter padat akan memastikan kejernihan dan kemanisan maksimal.',
    },
  },
  competition_multi_pulse: {
    setup: {
      en: 'Rinse the paper filter thoroughly to remove any paper taste, and add medium grounds.',
      id: 'Bilas filter kertas secara menyeluruh untuk menghilangkan rasa kertas, dan masukkan bubuk kopi medium.',
    },
    entry: {
      en: 'Bloom rapidly in tight center circles to agitate all coffee grounds actively.',
      id: 'Lakukan bloom cepat dalam lingkaran tengah yang rapat untuk mengagitasi bubuk kopi secara aktif.',
    },
    main: {
      en: 'Deliver multiple fast, concentric pulses to keep water velocity high and push extraction.',
      id: 'Lakukan beberapa pulsa konsentris cepat untuk menjaga kecepatan air tetap tinggi dan mendorong ekstraksi.',
    },
    release: {
      en: 'Complete the final short pulse cleanly; let the coffee drain rapidly to preserve fruit acids.',
      id: 'Selesaikan pulsa pendek terakhir dengan bersih; biarkan kopi mengalir cepat untuk menjaga asam buah.',
    },
    finish: {
      en: 'Snappy drawdown finishes with a level bed. Serve immediate clean and vibrant fruit notes.',
      id: 'Drawdown yang cepat berakhir dengan bed kopi yang rata. Segera sajikan aroma buah yang bersih hidup.',
    },
  },
  continuous_center_pour: {
    setup: {
      en: 'Seat the paper filter neatly, add coarsely ground coffee, and preheat the glass carafe.',
      id: 'Pasang filter kertas dengan rapi, masukkan kopi gilingan kasar, dan hangatkan carafe kaca.',
    },
    entry: {
      en: 'Wet grounds with a calm center pour to minimize agitation; skip any swirling.',
      id: 'Basahi kopi dengan tuangan tengah yang tenang untuk meminimalkan agitasi; jangan diputar.',
    },
    main: {
      en: 'Maintain a tiny, constant centered stream, keeping kettle height low and flow constant.',
      id: 'Jaga aliran tengah kontinu yang sangat kecil, posisikan ketel tetap rendah dan aliran stabil.',
    },
    release: {
      en: 'Continue the slow centered stream, letting the heavy water column settle for sweet clarity.',
      id: 'Lanjutkan aliran tengah lambat, biarkan kolom air yang berat tenang untuk kejernihan manis.',
    },
    finish: {
      en: 'Cut the pour gracefully. Allow a slow, quiet drain to yield an exceptionally sweet, balanced cup.',
      id: 'Hentikan tuangan dengan lembut. Biarkan aliran turun tenang menghasilkan cangkir seimbang yang sangat manis.',
    },
  },
  iced_chemex: {
    setup: {
      en: 'Pre-load the glass carafe with measured ice, rinse your paper filter, and add fine grounds.',
      id: 'Isi carafe kaca dengan es batu terukur, bilas filter kertas, dan masukkan kopi gilingan halus.',
    },
    entry: {
      en: 'Bloom dry grounds hot. The concentrated drippings will cool instantly over the ice below.',
      id: 'Bloom kopi kering dengan air panas. Tetesan pekat akan langsung mendingin di atas es di bawah.',
    },
    main: {
      en: 'Pour hot concentrate in slow concentric circles, keeping water off the high paper walls.',
      id: 'Tuang konsentrat panas dalam lingkaran konsentris lambat, jauhkan air dari dinding kertas tinggi.',
    },
    release: {
      en: 'Deliver the final center pour; let the hot concentrate drip directly onto the ice cubes.',
      id: 'Lakukan tuangan tengah terakhir; biarkan konsentrat panas menetes langsung ke es batu.',
    },
    finish: {
      en: 'Let the final drops drain, then swirl the carafe to melt ice evenly; serve chilled.',
      id: 'Biarkan tetesan terakhir habis, lalu putar carafe untuk melelehkan es secara merata; sajikan dingin.',
    },
  },
  high_dose_heavy_body: {
    setup: {
      en: 'Add a massive coffee dose, grind coarse, and preheat the elegant Chemex carafe thoroughly.',
      id: 'Masukkan dosis kopi sangat besar, giling kasar, dan hangatkan carafe Chemex yang elegan.',
    },
    entry: {
      en: 'Wet the thick bed slowly; let the large dose degas completely before building water height.',
      id: 'Basahi bed tebal secara lambat; biarkan dosis besar membuang gas sepenuhnya sebelum menambah tinggi air.',
    },
    main: {
      en: 'Pour in slow, thick center rings; keep water away from the paper walls to prevent bypass.',
      id: 'Tuang dalam lingkaran tengah lambat yang tebal; jauhkan air dari dinding kertas agar tidak bypass.',
    },
    release: {
      en: 'Maintain a heavy water column to wash the deep bed, yielding rich mouthfeel and oils.',
      id: 'Pertahankan kolom air yang berat untuk membasuh bed yang dalam, menghasilkan mouthfeel dan minyak kopi tebal.',
    },
    finish: {
      en: 'Allow a slow, heavy drawdown to finish. Serve neat to enjoy a deep, syrupy comforting cup.',
      id: 'Biarkan air turun yang lambat dan berat selesai. Sajikan murni untuk cangkir nyaman sepekat sirup.',
    },
  },
};


const MOKA_POT_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_stovetop: {
    setup: {
      en: 'Fill the bottom chamber with room-temperature water below the safety valve. Add grounds loosely to the basket without tamping.',
      id: 'Isi wadah bawah dengan air bersuhu ruang di bawah katup pengaman. Masukkan bubuk kopi dengan longgar ke keranjang tanpa di-tamp.'
    },
    entry: {
      en: 'Assemble the pot tightly and place it on medium heat. Keep the lid open to monitor the flow.',
      id: 'Rakit pot dengan rapat dan letakkan di atas api sedang. Biarkan penutup terbuka untuk memantau aliran.'
    },
    main: {
      en: 'Watch the dark stream emerge. Maintain steady pressure so the liquid flows like honey.',
      id: 'Perhatikan aliran gelap yang keluar. Pertahankan tekanan stabil agar cairan mengalir seperti madu.'
    },
    release: {
      en: 'As the color turns blonde and before sputtering begins, immediately cut the heat.',
      id: 'Saat warna berubah memudar dan sebelum semburan gelembung (sputter) mulai, segera matikan api.'
    },
    finish: {
      en: 'Cool the base under cold tap water to halt extraction instantly. Stir the upper chamber and serve.',
      id: 'Dinginkan wadah bawah di bawah air mengalir untuk menghentikan ekstraksi seketika. Aduk ruang atas dan sajikan.'
    }
  },
  preheated_boiler: {
    setup: {
      en: 'Pre-boil water and fill the base up to the safety line. Load the basket with medium-coarse grounds.',
      id: 'Didihkan air terlebih dahulu lalu isi wadah bawah hingga garis batas aman. Masukkan kopi gilingan medium-coarse ke keranjang.'
    },
    entry: {
      en: 'Screw the base and top together tightly using a towel to protect your hands, then place on high heat.',
      id: 'Rakit wadah bawah dan atas dengan rapat menggunakan handuk pelindung tangan, lalu letakkan di atas api besar.'
    },
    main: {
      en: 'Water will rise almost instantly. Regulate heat immediately to maintain a gentle, continuous stream.',
      id: 'Air akan naik hampir seketika. Segera kecilkan api untuk menjaga aliran yang lembut dan berkelanjutan.'
    },
    release: {
      en: 'Cut the heat as the crema becomes pale, preventing harsh steam from scorching the delicate oils.',
      id: 'Matikan api saat krema memudar, mencegah uap panas membakar kandungan minyak kopi yang halus.'
    },
    finish: {
      en: 'Submerge the pot base in an ice bath to freeze extraction. Swirl the chamber and enjoy a sweet, clean cup.',
      id: 'Celupkan bagian bawah pot ke dalam air es untuk membekukan ekstraksi. Putar ruang atas dan nikmati cangkir yang manis bersih.'
    }
  },
  low_temp_controlled: {
    setup: {
      en: 'Fill the base with warm water. Dose finely ground coffee into the funnel basket, flattening the top.',
      id: 'Isi wadah bawah dengan air hangat. Masukkan bubuk kopi gilingan halus ke dalam corong, ratakan permukaannya.'
    },
    entry: {
      en: 'Lock the assembly securely. Place on ultra-low heat to initiate a slow, low-temperature thermal buildup.',
      id: 'Kunci rakitan dengan aman. Letakkan di atas api sangat kecil untuk memulai kenaikan suhu termal yang lambat.'
    },
    main: {
      en: 'Allow the extraction to creep up slowly. The lower temperature preserves sparkling fruit acids.',
      id: 'Biarkan ekstraksi naik dengan sangat lambat. Suhu yang lebih rendah menjaga keasaman buah yang segar.'
    },
    release: {
      en: 'Pull the pot off the stove as soon as the first sigh of air begins to mix with the liquid stream.',
      id: 'Angkat pot dari kompor segera setelah tanda desau udara pertama mulai bercampur dengan aliran cairan.'
    },
    finish: {
      en: 'Wrap the boiler in a cold wet cloth. Decant the floral, sweet, and delicate stove-pressure brew.',
      id: 'Bungkus wadah bawah dengan kain basah dingin. Tuang hasil seduhan tekanan kompor yang floral dan manis lembut.'
    }
  },
  iced_moka_concentrate: {
    setup: {
      en: 'Load the server with 150g of clean ice. Fill the pot boiler below the valve, and add a heavy coffee dose.',
      id: 'Isi wadah saji dengan 150g es batu bersih. Isi wadah bawah di bawah katup, dan gunakan dosis kopi yang sangat padat.'
    },
    entry: {
      en: 'Assemble the pot tightly. Heat on medium-low to build a highly concentrated pressure-extract.',
      id: 'Rakit pot dengan rapat. Panaskan dengan api sedang-kecil untuk menghasilkan ekstraksi tekanan yang sangat pekat.'
    },
    main: {
      en: 'Maintain a very slow, dark syrupy stream. The restricted flow increases dissolved solids for ice balance.',
      id: 'Jaga aliran sirup pekat yang sangat lambat. Aliran lambat meningkatkan padatan terlarut untuk menyeimbangkan es.'
    },
    release: {
      en: 'Cut the heat at the very first sign of light-blonde cream to prevent bitter over-extracted compounds.',
      id: 'Matikan api pada tanda pertama krema berwarna terang untuk mencegah masuknya senyawa pahit over-ekstraksi.'
    },
    finish: {
      en: 'Pour the hot concentrate directly over the ice. Stir vigorously to melt and chill the intense espresso-like brew.',
      id: 'Tuang konsentrat panas langsung ke atas es. Aduk kuat-kuat untuk melelehkan dan mendinginkan seduhan padat ala espresso ini.'
    }
  },
  high_yield_robust: {
    setup: {
      en: 'Fill the base precisely to the safety valve limit. Use a slightly coarser grind and fill the basket fully.',
      id: 'Isi wadah bawah tepat batas katup pengaman. Gunakan gilingan sedikit lebih kasar dan isi keranjang penuh.'
    },
    entry: {
      en: 'Assemble the pot securely. Place on high heat to establish strong pressure build-up.',
      id: 'Rakit pot dengan aman. Letakkan di atas api besar untuk membangun tekanan uap yang kuat.'
    },
    main: {
      en: 'Maintain high heat to drive a robust, continuous flow. The water sweeps through the basket rapidly.',
      id: 'Pertahankan api besar untuk mendorong aliran kuat berkelanjutan. Air membasuh keranjang dengan cepat.'
    },
    release: {
      en: 'Keep the heat on until the spurt phase just begins, pulling maximum soluble body into the upper chamber.',
      id: 'Biarkan api menyala hingga fase semburan (spurt phase) baru mulai, menarik body larut maksimal ke ruang atas.'
    },
    finish: {
      en: 'Cool the base instantly under the tap. Stir the dark, heavy-bodied classic moka brew before serving.',
      id: 'Dinginkan bagian bawah seketika di bawah air mengalir. Aduk hasil moka klasik yang pekat dan ber-body tebal sebelum disajikan.'
    }
  }
};

const COLD_BREW_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  classic_toddy_immersion: {
    setup: {
      en: 'Add coarse grounds to a Toddy system with a pre-wet felt filter and stopper locked.',
      id: 'Masukkan kopi kasar ke sistem Toddy dengan filter felt basah dan sumbat terkunci.'
    },
    entry: {
      en: 'Pour cold water gently in circular flows to saturate the deep bed evenly.',
      id: 'Tuang air dingin perlahan melingkar agar membasahi seluruh bagian kopi merata.'
    },
    main: {
      en: 'Steep at room temperature or fridge for 12 to 18 hours. Let immersion extract sweet sugars.',
      id: 'Rendam di suhu ruang atau kulkas selama 12-18 jam. Biarkan immersion mengekstrak rasa manis alami.'
    },
    release: {
      en: 'Pull the bottom stopper and let the rich concentrate drain completely through the felt.',
      id: 'Cabut sumbat bawah dan biarkan konsentrat pekat mengalir keluar habis melewati felt filter.'
    },
    finish: {
      en: 'Swirl the concentrate, store in the fridge, and serve diluted with water or milk.',
      id: 'Aduk konsentrat, simpan di kulkas, dan sajikan dengan pengenceran air atau susu.'
    }
  },
  cold_drip_tower: {
    setup: {
      en: 'Place medium-coarse grounds in the glass column, insert a paper filter on top, and fill the upper reservoir with ice and water.',
      id: 'Masukkan kopi medium-coarse ke kolom kaca, pasang filter kertas di atasnya, isi tangki atas dengan es dan air.'
    },
    entry: {
      en: 'Adjust the dripper valve to exactly 1 drop per 1.5 seconds. Pre-wet the bed to start hydration.',
      id: 'Atur katup dripper tepat 1 tetes per 1,5 detik. Basahi bed kopi awal untuk memulai hidrasi.'
    },
    main: {
      en: 'Maintain steady drip rates as the water percolates slowly through the narrow column.',
      id: 'Jaga kecepatan tetesan tetap stabil saat air merembes lambat melewati kolom sempit.'
    },
    release: {
      en: 'Let the final drips pass through the bed. The slow gravity drip yields high clarity.',
      id: 'Biarkan tetesan akhir melewati bed kopi. Tetesan gravitasi yang lambat menghasilkan kejernihan tinggi.'
    },
    finish: {
      en: 'Swirl the collected iced liquor. Let it mature in a sealed bottle for 24 hours for wine-like complexity.',
      id: 'Putar cairan dingin yang tertampung. Biarkan matang di botol tertutup selama 24 jam untuk rasa kompleks mirip anggur.'
    }
  },
  double_extraction_concentrate: {
    setup: {
      en: 'Prepare a heavy dose of coarse grounds in a large jar.',
      id: 'Siapkan kopi gilingan kasar dosis ekstra tinggi di wadah besar.'
    },
    entry: {
      en: 'Pour cold water rapidly to create a thick immersion slurry, stirring to saturate completely.',
      id: 'Tuang air dingin cepat untuk membuat slurry immersion yang tebal, aduk agar basah sempurna.'
    },
    main: {
      en: 'Steep for 24 hours, giving a gentle swirl at the 12-hour mark to maximize dissolution.',
      id: 'Rendam selama 24 jam, putar wadah perlahan pada jam ke-12 untuk memaksimalkan pelarutan.'
    },
    release: {
      en: 'Double-filter through a stainless mesh first, followed by a paper pour-over filter.',
      id: 'Saring ganda dengan saringan mesh stainless terlebih dahulu, diikuti dengan filter kertas pour-over.'
    },
    finish: {
      en: 'Store the ultra-thick concentrate. Dilute with ice and milk for a bold, chocolatey cold drink.',
      id: 'Simpan konsentrat super kental ini. Encerkan dengan es dan susu untuk minuman dingin rasa cokelat tebal.'
    }
  },
  accelerated_room_temp: {
    setup: {
      en: 'Load medium grounds in an active chamber and prepare room-temperature water.',
      id: 'Masukkan kopi gilingan medium ke wadah aktif dan siapkan air bersuhu ruang.'
    },
    entry: {
      en: 'Pour water rapidly over grounds, initiating quick saturation and early dissolution.',
      id: 'Tuang air secara cepat ke kopi, memulai pembasahan lekas dan pelarutan awal.'
    },
    main: {
      en: 'Let steep at room temperature for exactly 8 hours, utilizing slightly warmer water to speed extraction.',
      id: 'Rendam di suhu ruang tepat selama 8 jam, memanfaatkan suhu sedikit lebih hangat untuk mempercepat ekstraksi.'
    },
    release: {
      en: 'Press or gravity-filter the slurry quickly to stop extraction and lock in sweet notes.',
      id: 'Tekan atau saring gravitasi slurry dengan cepat untuk menghentikan ekstraksi dan mengunci rasa manis.'
    },
    finish: {
      en: 'Chill the accelerated brew immediately in an ice bath. Serve cold for high sweetness.',
      id: 'Segera dinginkan hasil seduhan cepat ini di wadah es. Sajikan dingin untuk rasa manis tinggi.'
    }
  },
  japanese_slow_drip: {
    setup: {
      en: 'Put clean ice in the server below. Load a conical dripper with fine-medium grounds.',
      id: 'Masukkan es bersih di server bawah. Siapkan dripper kerucut dengan bubuk kopi gilingan fine-medium.'
    },
    entry: {
      en: 'Pour cold water in extremely slow dripping cycles or micro-pulses over the bed.',
      id: 'Tuang air dingin dalam siklus tetesan yang sangat lambat atau pulsa mikro di atas bed kopi.'
    },
    main: {
      en: 'Let the cold water pass slowly through the fine grounds, extracting intense sugars and acids.',
      id: 'Biarkan air dingin merembes lambat melewati bubuk kopi halus, mengekstrak gula dan asam pekat.'
    },
    release: {
      en: 'Allow the final drops to drip directly over the ice, melting it slowly for perfect dilution.',
      id: 'Biarkan tetesan akhir menetes langsung ke atas es, melelehkannya perlahan untuk pengenceran sempurna.'
    },
    finish: {
      en: 'Swirl the flash-chilled sweet liquor and serve instantly in a chilled glass.',
      id: 'Putar cairan manis dingin seketika ini dan segera sajikan di gelas dingin.'
    }
  }
};

const BATCH_BREW_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  sca_gold_cup: {
    setup: {
      en: 'Place a flat-bottom basket filter, rinse it, and level the medium-coarse bed. Select the Gold Cup profile on the brewer.',
      id: 'Pasang filter basket flat-bottom, bilas, dan ratakan bed gilingan medium-coarse. Pilih profil Gold Cup pada mesin.'
    },
    entry: {
      en: 'The automated spray head will pulse hot water, blooming the large bed evenly.',
      id: 'Kepala spray otomatis akan memancarkan air panas, melakukan bloom pada bed besar secara merata.'
    },
    main: {
      en: 'Water distributes via calculated automated showers, maintaining optimal extraction temperature between 92-96°C.',
      id: 'Air didistribusikan melalui pancuran otomatis terhitung, menjaga suhu ekstraksi optimal antara 92-96°C.'
    },
    release: {
      en: 'Let the final drawdown filter through the bed. The automated basket valve holds water for perfect contact.',
      id: 'Biarkan aliran akhir mengalir menyaring bed kopi. Katup basket otomatis menahan air untuk kontak sempurna.'
    },
    finish: {
      en: 'Swirl the thermal server gently to blend the early and late extraction layers before serving.',
      id: 'Aduk wadah thermal perlahan untuk menyatukan lapisan ekstraksi awal dan akhir sebelum disajikan.'
    }
  },
  heavy_batch_catering: {
    setup: {
      en: 'Use a large, heavy-duty basket filter. Load a massive dose of coarse grounds, ensuring a perfectly flat surface.',
      id: 'Gunakan filter basket besar kapasitas tinggi. Masukkan bubuk kopi gilingan kasar dosis besar, pastikan permukaan rata.'
    },
    entry: {
      en: 'Initiate the brew cycle. The machine begins with a long wetting pulse to hydrate the massive bed.',
      id: 'Mulai siklus seduh. Mesin akan memulai dengan pulsa pembasahan panjang untuk menghidrasi bed besar.'
    },
    main: {
      en: 'High-volume water flow sweeps the bed. The deeper column provides thermal stability for heavy solubles.',
      id: 'Aliran air volume besar membasuh bed kopi. Kolom air yang dalam memberikan stabilitas suhu untuk senyawa larut tebal.'
    },
    release: {
      en: 'Allow the extended drawdown to clear the basket. Avoid disturbing the bed to prevent clogging.',
      id: 'Biarkan drawdown yang panjang mengalir kosongkan basket. Hindari mengganggu bed agar tidak menyumbat filter.'
    },
    finish: {
      en: 'Decant into a preheated dispenser. The robust, full-bodied coffee will stay warm and flavorful for hours.',
      id: 'Pindahkan ke dispenser yang sudah dihangatkan. Kopi klasik yang bold ini akan tetap hangat dan nikmat berjam-jam.'
    }
  },
  bright_light_roast_batch: {
    setup: {
      en: 'Use a high-quality bleached paper filter. Load medium grounds and preheat the server thoroughly.',
      id: 'Gunakan filter kertas bleached berkualitas tinggi. Masukkan kopi gilingan medium dan hangatkan server secara merata.'
    },
    entry: {
      en: 'The brewer starts with a short, hot spray. The rapid wetting unlocks sparkling light-roast floral notes.',
      id: 'Mesin mulai dengan pancuran air panas singkat. Pembasahan cepat membuka aroma floral kopi light-roast yang cerah.'
    },
    main: {
      en: 'Automated fast pulsing sweeps the bed, keeping contact time short to protect delicate fruit acids.',
      id: 'Pancuran otomatis cepat membasuh bed kopi, menjaga waktu kontak tetap singkat untuk melindungi asam buah halus.'
    },
    release: {
      en: 'The final water drains rapidly through the clean paper, filtering out bitter lipids.',
      id: 'Air sisa mengalir cepat melewati kertas bersih, menyaring kandungan lipid yang pahit.'
    },
    finish: {
      en: 'Mix the carafe once. Serve immediately to enjoy sparkling acidity and high-clarity fruit notes.',
      id: 'Aduk karafe sekali. Segera sajikan untuk menikmati acidity yang hidup dan aroma buah berkejernihan tinggi.'
    }
  },
  pre_wet_hybrid_batch: {
    setup: {
      en: 'Insert the basket filter. Pre-wet the coffee grounds manually with hot water before loading the basket into the brewer.',
      id: 'Pasang filter basket. Basahi bubuk kopi secara manual terlebih dahulu dengan air panas sebelum basket dimasukkan ke mesin.'
    },
    entry: {
      en: 'Load the pre-wet basket and start the machine. The saturated bed is ready for immediate extraction.',
      id: 'Masukkan basket yang sudah dibasahi dan nyalakan mesin. Bed yang jenuh siap untuk ekstraksi instan.'
    },
    main: {
      en: 'The showerhead pours steady streams, washing out sweet sugars from the pre-saturatd grounds.',
      id: 'Pancuran mesin menuang aliran stabil, membilas rasa manis gula dari kopi yang sudah basah sejak awal.'
    },
    release: {
      en: 'Let the final drawdown pass through the stable bed, avoiding late-stage channeling.',
      id: 'Biarkan aliran akhir melewati bed kopi yang stabil, menghindari terbentuknya celah air (channeling) akhir.'
    },
    finish: {
      en: 'Swirl the server gently. Enjoy a deeply sweet, uniform cup with outstanding balance.',
      id: 'Aduk server dengan lembut. Nikmati cangkir yang sangat manis dan seragam dengan keseimbangan luar biasa.'
    }
  },
  high_extraction_thermos: {
    setup: {
      en: 'Pre-wet the paper filter. Use fine-medium grounds to increase surface area, and level the bed.',
      id: 'Bilas filter kertas. Gunakan gilingan fine-medium untuk meningkatkan luas area, lalu ratakan bed kopi.'
    },
    entry: {
      en: 'Start the brew. The machine initiates with a warm, steady bloom pulse to wet the fine grounds.',
      id: 'Mulai penyeduhan. Mesin memulai dengan pulsa bloom hangat yang stabil untuk membasahi bubuk kopi halus.'
    },
    main: {
      en: 'Slow automated pulses maintain high water levels, extending contact time for maximum extraction.',
      id: 'Pulsa otomatis lambat menjaga level air tetap tinggi, memperpanjang waktu kontak untuk ekstraksi maksimal.'
    },
    release: {
      en: 'The water drains slowly through the dense fine bed, pulling heavy sweet and chocolate compounds.',
      id: 'Air turun perlahan melewati bed halus yang padat, menarik senyawa manis karamel dan cokelat yang tebal.'
    },
    finish: {
      en: 'Swirl the thermos to integrate the heavy extract. Enjoy an intense, highly extracted black coffee.',
      id: 'Aduk termos untuk menyatukan ekstrak kental. Nikmati kopi hitam pekat dengan tingkat ekstraksi yang tinggi.'
    }
  }
};

const SIPHON_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_vacuum_siphon: {
    setup: {
      en: 'Secure the cloth filter in the upper chamber. Pre-heat water in the lower bowl, then mount the upper chamber loosely.',
      id: 'Kunci filter kain di wadah atas. Hangatkan air di bowl bawah, lalu pasang wadah atas secara longgar.'
    },
    entry: {
      en: 'Heat the lower bowl until water rises fully. Add coffee and stir exactly 3 times in a circular path.',
      id: 'Panaskan bowl bawah hingga air naik penuh. Masukkan kopi dan aduk tepat 3 kali dengan gerakan melingkar.'
    },
    main: {
      en: 'Keep the flame stable to hold the water column. Let it steep for 60 seconds with steady, minimal agitation.',
      id: 'Jaga api tetap stabil untuk menahan kolom air. Biarkan merendam 60 detik dengan agitasi stabil yang minimal.'
    },
    release: {
      en: 'Turn off the heat. The cooling lower bowl creates a vacuum, drawing the coffee down through the cloth filter.',
      id: 'Matikan panas api. Dinginnya bowl bawah membuat vakum, menarik kopi turun menyaring lewat filter kain.'
    },
    finish: {
      en: 'Allow the dome-shaped crema puck to dry. Swirl the lower bowl gently and serve a classic, clean cup.',
      id: 'Biarkan ampas kopi berbentuk kubah mengering. Aduk bowl bawah perlahan dan sajikan cangkir bersih klasik.'
    }
  },
  competition_triple_agitation: {
    setup: {
      en: 'Secure the filter tightly. Boil water in the lower chamber, then lock the upper chamber securely.',
      id: 'Kunci filter dengan rapat. Didihkan air di wadah bawah, lalu kunci wadah atas dengan aman.'
    },
    entry: {
      en: 'As the water rises, add grounds and execute the first rapid, zig-zag stir to hydrate the bed instantly.',
      id: 'Saat air naik, masukkan kopi dan lakukan adukan zig-zag cepat pertama untuk menghidrasi bed seketika.'
    },
    main: {
      en: 'Perform a second gentle swirl at the 30-second mark to keep grounds suspended in the high-heat slurry.',
      id: 'Lakukan adukan memutar lembut kedua pada detik ke-30 agar bubuk kopi tetap melayang di slurry panas.'
    },
    release: {
      en: 'Turn off the heat and execute a final, rapid turbine stir. The vacuum draw begins instantly.',
      id: 'Matikan api kompor dan lakukan adukan turbin cepat terakhir. Penarikan vakum dimulai seketika.'
    },
    finish: {
      en: 'The turbine stir forms a perfect centered dome. Swirl the hot lower bowl and serve a highly aromatic cup.',
      id: 'Adukan turbin membentuk kubah tengah sempurna. Putar bowl bawah yang panas dan sajikan cangkir yang sangat harum.'
    }
  },
  low_temp_delicate: {
    setup: {
      en: 'Secure a clean paper filter in the siphon adapter. Heat water in the lower bowl, keeping a low flame.',
      id: 'Pasang filter kertas bersih di adaptor siphon. Panaskan air di bowl bawah, jaga api tetap kecil.'
    },
    entry: {
      en: 'Let water rise. Wait for the water temperature in the upper chamber to cool to 85-88°C before adding coffee.',
      id: 'Biarkan air naik. Tunggu suhu air di wadah atas turun ke 85-88°C sebelum memasukkan kopi.'
    },
    main: {
      en: 'Steep quietly. Keep agitation extremely gentle to protect delicate floral and tea-like compounds.',
      id: 'Rendam dengan tenang. Jaga agitasi sangat lembut untuk melindungi senyawa floral dan teh yang halus.'
    },
    release: {
      en: 'Cut the heat. The low temperature reduces vacuum pressure, resulting in a gentle, slower drawdown.',
      id: 'Matikan api kompor. Suhu rendah mengurangi tekanan vakum, menghasilkan penarikan turun yang lembut dan lambat.'
    },
    finish: {
      en: 'Swirl the collected liquid. Enjoy a sparkling, high-clarity siphon brew with beautiful floral acidity.',
      id: 'Putar cairan yang terkumpul. Nikmati seduhan siphon jernih berkilau dengan keasaman bunga yang indah.'
    }
  },
  high_body_fast_drawdown: {
    setup: {
      en: 'Use a clean cloth filter. Load a large dose of medium-fine grounds, and heat water in the base bowl.',
      id: 'Gunakan filter kain yang bersih. Masukkan kopi gilingan medium-fine dosis besar, dan panaskan air di bowl dasar.'
    },
    entry: {
      en: 'As water rises, add coffee and stir vigorously 5 times to saturate the dense bed completely.',
      id: 'Saat air naik, masukkan kopi dan aduk kuat-kuat 5 kali untuk membasahi bed padat secara merata.'
    },
    main: {
      en: 'Steep at a high temperature for exactly 45 seconds, promoting rapid dissolution of body-building sugars.',
      id: 'Rendam pada suhu tinggi tepat selama 45 detik, mendorong pelarutan cepat senyawa gula pembentuk body.'
    },
    release: {
      en: 'Kill the flame. The hot vacuum pulls the heavy concentrate down rapidly through the porous cloth filter.',
      id: 'Matikan api kompor. Vakum panas menarik konsentrat tebal turun cepat melewati filter kain berpori.'
    },
    finish: {
      en: 'Swirl the lower chamber intensely to integrate the rich oils. Serve a bold, syrupy cup.',
      id: 'Putar wadah bawah dengan kuat untuk menyatukan minyak tebal. Sajikan cangkir yang bold dan bersirup.'
    }
  },
  spirit_infusion_style: {
    setup: {
      en: 'Secure the filter. Add a slice of dried orange or spice to the lower bowl, then preheat water.',
      id: 'Kunci filter. Tambahkan potongan jeruk kering atau rempah ke bowl bawah, lalu panaskan air.'
    },
    entry: {
      en: 'Let water rise. Add medium-coarse grounds and stir gently once to wet all grounds.',
      id: 'Biarkan air naik. Masukkan kopi gilingan medium-coarse dan aduk lembut sekali agar basah.'
    },
    main: {
      en: 'The vapor rising from the lower bowl infuses the slurry, pulling aromatic spices into the high-heat extraction.',
      id: 'Uap yang naik dari bowl bawah meresap ke slurry, menarik aroma rempah ke ekstraksi bersuhu tinggi.'
    },
    release: {
      en: 'Remove heat. The vacuum pulls the spiced, aromatic infusion down cleanly into the lower bowl.',
      id: 'Matikan api kompor. Vakum menarik seduhan rempah yang harum turun bersih ke bowl bawah.'
    },
    finish: {
      en: 'Serve warm. The cup offers a unique, sensory, and highly complex spiced coffee experience.',
      id: 'Sajikan hangat. Cangkir ini menyajikan pengalaman kopi berempah yang unik, sensoris, dan sangat kompleks.'
    }
  }
};

const ORIGAMI_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  cone_dripper_style: {
    setup: {
      en: 'Fold a conical V60 paper filter, and seat it neatly in the Origami flutes. Level your medium-fine bed.',
      id: 'Lipat filter kertas kerucut V60, dan pasang rapi di lekukan flutes Origami. Ratakan bed gilingan medium-fine Anda.'
    },
    entry: {
      en: 'Bloom with concentric spirals, letting water bypass rapidly through the grooves for high clarity.',
      id: 'Lakukan bloom dengan gerakan spiral memutar, membiarkan air turun cepat melewati alur lekukan untuk kejernihan rasa tinggi.'
    },
    main: {
      en: 'Pour in compact centered spirals. The deep conical bed concentrates flavors, while the open ribs speed drawdown.',
      id: 'Tuang dalam spiral tengah yang ringkas. Bed kerucut yang dalam memusatkan rasa, sementara rib terbuka mempercepat aliran.'
    },
    release: {
      en: 'Allow a swift, unhindered drawdown. Keep the water level moderate to avoid high bypass.',
      id: 'Biarkan air turun cepat tanpa hambatan. Jaga ketinggian air sedang agar tidak terjadi bypass berlebih.'
    },
    finish: {
      en: 'Swirl the server once and serve. Enjoy outstanding clarity, crisp acidity, and focused fruit notes.',
      id: 'Putar server sekali lalu sajikan. Nikmati kejernihan rasa yang luar biasa, keasaman segar, dan aroma buah terfokus.'
    }
  },
  wave_dripper_style: {
    setup: {
      en: 'Seat a wave-style flat-bottom filter inside the Origami flutes. Level the bed, avoiding folding the filter ridges.',
      id: 'Pasang filter flat-bottom model wave di lekukan flutes Origami. Ratakan bed kopi, hindari menekuk lipatan kertas.'
    },
    entry: {
      en: 'Bloom gently to saturate the flat bed evenly. The flat bottom restricts flow slightly for high sweetness.',
      id: 'Bloom lembut untuk membasahi bed rata secara merata. Bagian dasar datar menahan aliran sedikit demi rasa manis tinggi.'
    },
    main: {
      en: 'Pour in slow, concentric ovals. The wave filter restricts flow, increasing dissolved sweetness and body.',
      id: 'Tuang dalam gerakan oval konsentris lambat. Filter wave menahan aliran, meningkatkan rasa manis larut dan body.'
    },
    release: {
      en: 'Let the water drain slowly. The contact time is extended compared to conical, capturing balanced cocoa sugars.',
      id: 'Biarkan air turun perlahan. Waktu kontak lebih lama dibanding kerucut, menangkap rasa gula cokelat yang seimbang.'
    },
    finish: {
      en: 'Swirl the server and serve. The cup offers beautiful sweetness, rounded body, and balanced complexity.',
      id: 'Aduk server lalu sajikan. Cangkir ini menghasilkan rasa manis yang indah, body bulat lembut, dan kompleksitas seimbang.'
    }
  },
  mugen_one_pour: {
    setup: {
      en: 'Seat a conical filter tightly inside the Origami flutes, ensuring it presses against the ceramic ribs.',
      id: 'Pasang filter kerucut rapat di lekukan flutes Origami, pastikan menempel erat pada rib keramik.'
    },
    entry: {
      en: 'Pour a rapid bloom in the center, saturating the bed instantly without high agitation.',
      id: 'Tuang bloom cepat di tengah-tengah bed kopi, membasahinya seketika tanpa agitasi yang kuat.'
    },
    main: {
      en: 'Pour all the remaining water in a single, slow centered stream. Let the slow bypass extract rich sugars.',
      id: 'Tuang seluruh sisa air dalam satu aliran tengah yang lambat. Biarkan bypass lambat mengekstrak rasa manis gula yang kaya.'
    },
    release: {
      en: 'Allow the water to draw down slowly through the tight paper. Do not stir or swirl.',
      id: 'Biarkan air turun perlahan menyaring kertas yang rapat. Jangan diaduk atau diputar.'
    },
    finish: {
      en: 'Let it drain fully. Enjoy a sweet, comforting, and highly consistent everyday cup.',
      id: 'Biarkan turun habis sempurna. Nikmati cangkir harian yang manis, nyaman, dan sangat konsisten.'
    }
  },
  iced_origami: {
    setup: {
      en: 'Place 120g of clean ice in the server. Seat a conical filter in the Origami flutes, and load fine-medium grounds.',
      id: 'Masukkan 120g es bersih ke server. Pasang filter kerucut di flutes Origami, dan gunakan kopi gilingan fine-medium.'
    },
    entry: {
      en: 'Bloom with hot water. The hot, rich concentrate will drip directly over the ice below to chill instantly.',
      id: 'Lakukan bloom dengan air panas. Konsentrat panas yang pekat akan menetes langsung ke es di bawah mendinginkannya seketika.'
    },
    main: {
      en: 'Pour in rapid, concentric hot pulses in the center. Keep the grind finer to increase soluble strength.',
      id: 'Tuang air panas dalam pulsa tengah cepat konsentris. Jaga gilingan tetap halus untuk meningkatkan kepekatan rasa.'
    },
    release: {
      en: 'The hot concentrate drains rapidly through the open flutes, locking sparkling fruit acids instantly over ice.',
      id: 'Konsentrat panas mengalir cepat melewati alur terbuka, mengunci keasaman buah segar langsung ke atas es.'
    },
    finish: {
      en: 'Swirl the server for 5 seconds to melt remaining ice. Serve a refreshing, crisp iced pour-over.',
      id: 'Putar server 5 detik untuk mencairkan sisa es. Sajikan pour-over dingin yang segar dan jernih.'
    }
  },
  competition_hybrid_flow: {
    setup: {
      en: 'Pre-wet a conical filter. Load medium grounds and prepare water at two different temperatures.',
      id: 'Bilas filter kerucut. Masukkan bubuk kopi gilingan medium dan siapkan air pada dua suhu berbeda.'
    },
    entry: {
      en: 'Bloom with high-temperature water (94°C) to push high extraction of bright acids and sweet fruit oils.',
      id: 'Bloom dengan air bersuhu tinggi (94°C) untuk mendorong ekstraksi tinggi asam cerah dan kandungan minyak buah manis.'
    },
    main: {
      en: 'Pour the second pulse with lower temperature water (88°C) to extract sugars without bitter tannins.',
      id: 'Tuang pulsa kedua dengan air bersuhu lebih rendah (88°C) untuk mengekstrak gula tanpa senyawa tanin pahit.'
    },
    release: {
      en: 'Allow the unhindered conical flutes to drain rapidly. The hybrid temperatures balance fruit and sweetness.',
      id: 'Biarkan alur kerucut tanpa hambatan mengalir cepat. Perpaduan suhu menyeimbangkan rasa buah dan manis.'
    },
    finish: {
      en: 'Swirl the server intensely. Enjoy a competition-level cup with brilliant clarity and layers of flavor.',
      id: 'Putar server dengan kuat. Nikmati cangkir kelas kompetisi dengan kejernihan rasa cemerlang dan lapisan rasa yang kaya.'
    }
  }
};

const APRIL_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  april_flat_bottom_standard: {
    setup: {
      en: 'Set up your April flat-bottom dripper with a rinsed paper filter. Level the medium-coarse bed.',
      id: 'Siapkan April flat-bottom dripper dengan filter kertas bilas. Ratakan bed kopi gilingan medium-coarse.'
    },
    entry: {
      en: 'Pour bloom water gently in circular spirals. April rewards a highly balanced, low-agitation wet.',
      id: 'Tuang air bloom perlahan melingkar. April paling cocok dengan pembasahan seimbang dan agitasi rendah.'
    },
    main: {
      en: 'Pour in slow, concentric circles. Keep water levels low and distribute evenly to promote high clarity.',
      id: 'Tuang dalam lingkaran konsentris lambat. Jaga level air rendah dan bagi merata demi kejernihan rasa tinggi.'
    },
    release: {
      en: 'Let the flat-bottom drain naturally. The flat bed settles uniformly, preventing late channeling.',
      id: 'Biarkan flat-bottom turun alami. Bed yang rata mengendap seragam, mencegah terbentuknya celah air akhir.'
    },
    finish: {
      en: 'Swirl the server gently and serve. Enjoy Scandinavian-style clarity, sweet balance, and light body.',
      id: 'Putar server perlahan lalu sajikan. Nikmati kejernihan ala Skandinavia, manis seimbang, dan body ringan.'
    }
  },
  april_continuous_slow: {
    setup: {
      en: 'Fold the filter ridges to sit flat. Load medium grounds and preheat the dripper thoroughly.',
      id: 'Lipat filter agar terpasang datar. Masukkan kopi gilingan medium dan hangatkan dripper secara merata.'
    },
    entry: {
      en: 'Start with a centered bloom stream, keeping water flow narrow and quiet.',
      id: 'Mulai dengan aliran bloom terpusat di tengah, jaga aliran air tetap sempit dan tenang.'
    },
    main: {
      en: 'Pour in a single, continuous centered stream at a slow, steady rate. Maintain a low water column.',
      id: 'Tuang dalam satu aliran tengah kontinu dengan debit lambat dan stabil. Jaga kolom air tetap rendah.'
    },
    release: {
      en: 'Let the column drain calmly. The continuous flow minimizes agitation, maximizing sweet extraction.',
      id: 'Biarkan air turun tenang. Aliran kontinu meminimalkan agitasi, memaksimalkan ekstraksi rasa manis.'
    },
    finish: {
      en: 'Serve a clean, incredibly sweet cup with velvety mouthfeel and balanced acidity.',
      id: 'Sajikan cangkir yang bersih dan sangat manis dengan mouthfeel selembut beludru dan acidity seimbang.'
    }
  },
  competition_two_pour: {
    setup: {
      en: 'Place the paper filter, level the bed, and prepare water at a high temperature (92°C).',
      id: 'Pasang filter kertas, ratakan bed kopi, dan siapkan air bersuhu tinggi (92°C).'
    },
    entry: {
      en: 'Pour the first circle rapidly, agitating the bed actively to extract intense fruit acidity and sugars.',
      id: 'Tuang lingkaran pertama cepat, mengagitasi bed aktif untuk mengekstrak keasaman buah cerah dan gula.'
    },
    main: {
      en: 'Wait for drawdown, then pour the second circular pulse quickly. The two rapid pulses ensure high solubility.',
      id: 'Tunggu air turun, lalu tuang pulsa lingkaran kedua dengan cepat. Dua pulsa cepat menjamin kelarutan tinggi.'
    },
    release: {
      en: 'The water drains rapidly through the flat base. Keep the extraction window brief to protect clarity.',
      id: 'Air mengalir cepat melewati dasar datar. Batasi jendela ekstraksi singkat untuk melindungi kejernihan rasa.'
    },
    finish: {
      en: 'Mix the server intensely. Serve a highly complex, layered, and vibrant pour-over.',
      id: 'Aduk server dengan kuat. Sajikan pour-over yang sangat kompleks, berlapis, dan hidup.'
    }
  },
  iced_april_style: {
    setup: {
      en: 'Put 120g of clean ice in the server. Load fine grounds in the April dripper and pre-wet the filter.',
      id: 'Masukkan 120g es bersih ke server. Gunakan kopi gilingan halus di April dripper dan bilas filter kertas.'
    },
    entry: {
      en: 'Bloom hot. The concentrated drippings cool instantly over the ice cubes below, protecting volatile oils.',
      id: 'Lakukan bloom panas. Tetesan pekat langsung mendingin di atas es batu di bawah, melindungi kandungan minyak volatil.'
    },
    main: {
      en: 'Pour in rapid, concentric hot pulses in the center. Keep flow compact to build high strength.',
      id: 'Tuang dalam pulsa panas melingkar cepat di tengah. Jaga aliran ringkas untuk meningkatkan kepekatan rasa.'
    },
    release: {
      en: 'The flat base allows rapid drainage directly over ice, preventing over-extraction.',
      id: 'Dasar datar membuat air turun cepat langsung ke atas es, mencegah over-ekstraksi.'
    },
    finish: {
      en: 'Swirl the server until ice melts evenly. Serve a crisp, refreshing, and clean iced coffee.',
      id: 'Putar server hingga es meleleh merata. Sajikan kopi dingin yang segar, bersih, dan jernih.'
    }
  },
  high_body_heavy_dose: {
    setup: {
      en: 'Load a large dose of medium grounds, and preheat the clay-blue dripper and glass server.',
      id: 'Load a large dose of medium grounds, and preheat the clay-blue dripper and glass server.'
    },
    entry: {
      en: 'Bloom slowly with a larger volume of water to ensure complete saturation of the deep bed.',
      id: 'Bloom lambat dengan air volume lebih banyak untuk memastikan seluruh bed yang dalam basah sempurna.'
    },
    main: {
      en: 'Pour in slow concentric rings, maintaining a medium water level to wash the deep bed thoroughly.',
      id: 'Tuang dalam lingkaran melingkar lambat, jaga level air sedang untuk membilas bed yang dalam merata.'
    },
    release: {
      en: 'Allow a slow, uniform drawdown. The heavy column extracts rich cocoa sweetness and body.',
      id: 'Biarkan air turun seragam perlahan. Kolom air yang tebal mengekstrak rasa manis cokelat dan body yang kaya.'
    },
    finish: {
      en: 'Swirl the server intensely to integrate. Serve a bold, sweet, and comforting flat-bottom brew.',
      id: 'Putar server dengan kuat untuk menyatukan rasa. Sajikan seduhan flat-bottom yang bold, manis, dan mantap.'
    }
  }
};

const MELITTA_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_melitta_one_pour: {
    setup: {
      en: 'Fold the trapezoid filter paper, seat it, and level the bed along the wedge axis.',
      id: 'Lipat kertas filter trapezoid, pasang, dan ratakan bed mengikuti sisi memanjang wedge.'
    },
    entry: {
      en: 'Bloom along the center wedge line, letting the narrow bed wake up evenly for 35 seconds.',
      id: 'Bloom mengikuti garis tengah wedge, membiarkan bed sempit membasah rata selama 35 detik.'
    },
    main: {
      en: 'Pour slowly in a single, continuous oval spiral until the dripper is filled. Let it drain.',
      id: 'Tuang lambat dalam satu spiral oval kontinu hingga dripper penuh. Biarkan air turun mengalir.'
    },
    release: {
      en: 'The trapezoid bottom hole restricts flow naturally, allowing stable extraction without manual pulsing.',
      id: 'Lubang bawah trapezoid menahan aliran alami, memberikan ekstraksi stabil tanpa pulsa manual.'
    },
    finish: {
      en: 'Swirl the server and serve. Enjoy a comforting classic cup with rich chocolate body and sweet finish.',
      id: 'Putar server lalu sajikan. Nikmati cangkir klasik yang mantap dengan body cokelat tebal dan manis di akhir.'
    }
  },
  aromaboy_style: {
    setup: {
      en: 'Set up the tiny Aromaboy or 1x1 dripper with paper filter. Load a small dose of fine grounds.',
      id: 'Siapkan dripper mungil Aromaboy atau 1x1 dengan filter kertas. Masukkan kopi gilingan halus dosis kecil.'
    },
    entry: {
      en: 'Bloom gently with a tiny splash of water. Let sit for 30 seconds.',
      id: 'Bloom lembut dengan sedikit air panas. Diamkan selama 30 sec.'
    },
    main: {
      en: 'Pour in small, tight ovals in the center. The narrow wedge bed extracts solids efficiently for micro-doses.',
      id: 'Tuang dalam gerakan oval kecil yang rapat di tengah. Bed wedge yang sempit mengekstrak sari kopi efisien untuk porsi mikro.'
    },
    release: {
      en: 'Let the small column drain rapidly. Keep the pour gentle to avoid piercing the shallow paper bed.',
      id: 'Biarkan kolom kecil mengalir turun cepat. Jaga tuangan lembut agar tidak merusak bed kertas yang dangkal.'
    },
    finish: {
      en: 'Swirl lightly. Serve a cozy, highly aromatic, and sweet micro-brew.',
      id: 'Putar ringan. Sajikan kopi seduhan mikro yang manis, wangi, dan nikmat.'
    }
  },
  three_pour_melitta: {
    setup: {
      en: 'Fold the trapezoid filter paper, seat it, and level the bed along the wedge axis.',
      id: 'Lipat kertas filter trapezoid, pasang, dan ratakan bed mengikuti sisi memanjang wedge.'
    },
    entry: {
      en: 'Bloom along the center line. Let grounds hydrate completely for 40 seconds.',
      id: 'Bloom mengikuti garis tengah. Biarkan kopi terhidrasi sempurna selama 40 detik.'
    },
    main: {
      en: 'Pour in three slow, distinct oval pulses. Keep water levels medium to avoid high edge bypass.',
      id: 'Tuang dalam tiga pulsa oval yang lambat dan terpisah. Jaga ketinggian air sedang untuk mencegah bypass tepi.'
    },
    release: {
      en: 'The trapezoid flat walls help extract sweet, comforting chocolate notes during drawdown.',
      id: 'Dinding trapezoid datar membantu mengekstrak rasa cokelat manis yang mantap selama air turun.'
    },
    finish: {
      en: 'Mix the server and serve. Enjoy a balanced, sweet classic cup with comforting rustic body.',
      id: 'Aduk server lalu sajikan. Nikmati cangkir klasik manis yang seimbang dengan body pedesaan yang mantap.'
    }
  },
  iced_melitta_brew: {
    setup: {
      en: 'Put 120g of clean ice in the server. Load fine grounds in the trapezoid dripper and preheat.',
      id: 'Masukkan 120g es bersih ke server. Gunakan kopi gilingan halus di dripper trapezoid dan hangatkan.'
    },
    entry: {
      en: 'Bloom hot. The concentrated concentrate drips directly over ice, chilling the brew instantly.',
      id: 'Lakukan bloom panas. Konsentrat yang pekat menetes langsung ke es, mendinginkan hasil seduhan seketika.'
    },
    main: {
      en: 'Pour hot water in slow concentric ovals. The restricted bottom hole increases contact time for iced strength.',
      id: 'Tuang air panas dalam gerakan oval konsentris lambat. Lubang bawah yang sempit memperlama kontak demi kepekatan es.'
    },
    release: {
      en: 'Allow the concentrated brew to drain completely directly over ice, protecting fruit sweetness.',
      id: 'Biarkan seduhan konsentrat mengalir habis langsung ke atas es, melindungi keasaman manis buah.'
    },
    finish: {
      en: 'Swirl the server until ice melts. Serve a rich, non-watery, and incredibly sweet iced trapezoid pour-over.',
      id: 'Putar server hingga es meleleh. Sajikan pour-over dingin trapezoid yang kental, manis, dan tidak encer.'
    }
  },
  dense_classic_extraction: {
    setup: {
      en: 'Load a fine grind and level the bed. Preheat the trapezoid dripper thoroughly.',
      id: 'Gunakan gilingan halus dan ratakan bed kopi. Hangatkan dripper trapezoid secara merata.'
    },
    entry: {
      en: 'Bloom along the center axis. Let grounds degas for 45 seconds to open up the fine bed.',
      id: 'Bloom sepanjang sumbu tengah. Biarkan gas keluar 45 detik agar bed halus yang padat terbuka.'
    },
    main: {
      en: 'Pour in extremely slow concentric ovals. The fine grounds restrict flow, building intense contact time.',
      id: 'Tuang dalam gerakan oval konsentris yang sangat lambat. Kopi halus membatasi aliran, memperlama waktu kontak.'
    },
    release: {
      en: 'Let the water drain slowly. The long drawdown captures heavy sweet and chocolate compounds.',
      id: 'Biarkan air turun perlahan. Fase turun yang lambat menangkap senyawa manis pekat dan rasa cokelat tebal.'
    },
    finish: {
      en: 'Swirl the server and serve. Enjoy a highly extracted classic cup with heavy mouthfeel and cocoa finish.',
      id: 'Putar server lalu sajikan. Nikmati cangkir klasik ekstraksi tinggi dengan mouthfeel tebal dan rasa cokelat di akhir.'
    }
  }
};

const KONO_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  kono_meimon_traditional: {
    setup: {
      en: 'Seat the conical paper filter tightly in the Kono dripper. Level your medium-fine bed.',
      id: 'Pasang filter kertas kerucut rapat di dripper Kono. Ratakan bed gilingan medium-fine Anda.'
    },
    entry: {
      en: 'Add water drop by drop in the very center, hydrating the lower cone without expanding the bed.',
      id: 'Masukkan air tetes demi tetes tepat di tengah-tengah, menghidrasi bagian bawah kerucut tanpa mengembangkan bed.'
    },
    main: {
      en: 'Gradually expand the drip into a tiny stream in the center. The ribs only at the bottom ensure central flow.',
      id: 'Secara bertahap tingkatkan tetesan menjadi aliran kecil di tengah. Rib hanya di dasar menjaga aliran terpusat.'
    },
    release: {
      en: 'As the bed rises, pour in a fast concentric wash to complete the volume and draw down quickly.',
      id: 'Saat bed naik, tuang memutar cepat untuk membilas sisa volume dan biarkan air turun dengan lekas.'
    },
    finish: {
      en: 'Swirl the server gently and serve. Enjoy incredible sweetness, rich syrupy body, and focused fruit.',
      id: 'Putar server perlahan lalu sajikan. Nikmati rasa manis luar biasa, body kental bersirup, dan aroma buah terfokus.'
    }
  },
  kono_dripper_standard: {
    setup: {
      en: 'Seat the conical filter, level the bed, and preheat the glass server.',
      id: 'Pasang filter kerucut, ratakan bed kopi, dan hangatkan server kaca.'
    },
    entry: {
      en: 'Bloom with concentric spirals, letting the lower ribs saturate the bed evenly.',
      id: 'Bloom dengan gerakan spiral melingkar, membiarkan alur rib bawah membasahi bed secara merata.'
    },
    main: {
      en: 'Pour in slow concentric pulses near the center, keeping water levels medium to avoid high bypass.',
      id: 'Tuang dalam pulsa konsentris lambat dekat tengah, jaga ketinggian air sedang agar tidak terjadi bypass tepi.'
    },
    release: {
      en: 'The water drains slowly through the smooth upper walls, concentrating flavors in the lower cone ribs.',
      id: 'Air mengalir perlahan melewati dinding atas yang licin, memusatkan rasa di bagian rib bawah kerucut.'
    },
    finish: {
      en: 'Swirl the server and serve. The cup offers exceptional sweetness, balanced acidity, and round mouthfeel.',
      id: 'Putar server lalu sajikan. Cangkir ini menyajikan rasa manis yang istimewa, acidity seimbang, dan mouthfeel bulat.'
    }
  },
  kono_slow_drip_body: {
    setup: {
      en: 'Use fine grounds and seat the filter tightly. Preheat the Kono dripper.',
      id: 'Gunakan gilingan halus dan pasang filter rapat-rapat. Hangatkan dripper Kono.'
    },
    entry: {
      en: 'Initiate with a long center drip phase, slowly saturating the lower puck to dissolve heavy oils.',
      id: 'Mulai dengan fase tetesan tengah yang lama, membasahi kopi bawah perlahan untuk melarutkan kandungan minyak tebal.'
    },
    main: {
      en: 'Pour in extremely slow centered ovals, keeping flow narrow to extend contact time for high body.',
      id: 'Tuang dalam oval terpusat yang sangat lambat, jaga aliran sempit untuk memperlama kontak demi body tebal.'
    },
    release: {
      en: 'Allow a slow vacuum-like drawdown through the low ribs. Keep the bed flat.',
      id: 'Biarkan air turun lambat seperti tarikan vakum melewati rib bawah. Jaga bed tetap rata.'
    },
    finish: {
      en: 'Swirl the server intensely to integrate the rich oils. Serve an exceptionally sweet, heavy cup.',
      id: 'Putar server dengan kuat untuk menyatukan rasa. Sajikan cangkir manis yang sangat kental dan berat.'
    }
  },
  iced_kono_meimon: {
    setup: {
      en: 'Put 120g of clean ice in the server. Load fine-medium grounds in the Kono dripper and preheat.',
      id: 'Masukkan 120g es bersih ke server. Gunakan kopi gilingan fine-medium di dripper Kono dan hangatkan.'
    },
    entry: {
      en: 'Bloom with hot water in the center. The concentrate drips directly over ice to chill instantly.',
      id: 'Bloom dengan air panas tepat di tengah. Konsentrat pekat menetes langsung ke es mendinginkannya seketika.'
    },
    main: {
      en: 'Pour in rapid concentric hot pulses in the center. Keep flow compact to build high strength.',
      id: 'Tuang air panas dalam pulsa tengah melingkar cepat. Jaga aliran ringkas untuk meningkatkan kepekatan rasa.'
    },
    release: {
      en: 'The smooth upper walls restrict bypass, driving all hot water through the ice-chilled bed.',
      id: 'Dinding atas yang licin mencegah bypass, mengalirkan seluruh air panas melewati bed kopi dingin.'
    },
    finish: {
      en: 'Swirl the server to melt the remaining ice. Serve a sweet, crisp, and refreshing iced Kono brew.',
      id: 'Putar server untuk melelehkan sisa es. Sajikan seduhan es Kono yang manis, segar, dan nikmat.'
    }
  },
  kono_agitation_sweet: {
    setup: {
      en: 'Seat the filter, level the bed, and prepare water at a slightly lower temperature (88°C).',
      id: 'Pasang filter, ratakan bed kopi, dan siapkan air bersuhu sedikit rendah (88°C).'
    },
    entry: {
      en: 'Bloom slowly in the center. The lower temperature preserves caramel sugars and prevents bitterness.',
      id: 'Bloom perlahan di tengah. Suhu yang lebih rendah menjaga rasa gula karamel dan mencegah rasa pahit.'
    },
    main: {
      en: 'Pour in slow, concentric ovals near the center, giving a gentle swirl at the end of the pour.',
      id: 'Tuang dalam gerakan oval lambat konsentris dekat tengah, lakukan swirl lembut di akhir tuangan.'
    },
    release: {
      en: 'The gentle swirl settles the bed level, ensuring uniform drawdown through the bottom ribs.',
      id: 'Swirl lembut meratakan bed kopi, menjamin penarikan turun yang seragam melewati rib dasar.'
    },
    finish: {
      en: 'Swirl the server and serve. Enjoy a beautifully sweet, round, and comforting cup with clear finish.',
      id: 'Putar server lalu sajikan. Nikmati cangkir yang manis, bulat lembut, dan sangat nyaman dinikmati.'
    }
  }
};

export function resolveWorkflowTutorialDetail(context: WorkflowTutorialContext) {
  const phase = resolveWorkflowTutorialPhase(context.actionType);
  const language = resolveWorkflowTutorialLanguage(context.language);

  
  if (context.methodFamily === 'moka_pot' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'traditional_stovetop' : context.recipeStyle;
    const styleProfile = MOKA_POT_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'cold_brew' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'classic_toddy_immersion' : context.recipeStyle;
    const styleProfile = COLD_BREW_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'batch_brew' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'sca_gold_cup' : context.recipeStyle;
    const styleProfile = BATCH_BREW_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'siphon' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'traditional_vacuum_siphon' : context.recipeStyle;
    const styleProfile = SIPHON_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'origami' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'cone_dripper_style' : context.recipeStyle;
    const styleProfile = ORIGAMI_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'april' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'april_flat_bottom_standard' : context.recipeStyle;
    const styleProfile = APRIL_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'melitta' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'traditional_melitta_one_pour' : context.recipeStyle;
    const styleProfile = MELITTA_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'kono' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'kono_meimon_traditional' : context.recipeStyle;
    const styleProfile = KONO_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'clever_dripper' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'classic_closed' : context.recipeStyle;
    const styleProfile = CLEVER_DRIPPER_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'chemex' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'traditional_three_pour' : context.recipeStyle;
    const styleProfile = CHEMEX_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'kalita_wave' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'traditional_flat_three' : context.recipeStyle;
    const styleProfile = KALITA_WAVE_STYLE_TUTORIALS[styleKey as any];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'french_press' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'traditional' : context.recipeStyle;
    const styleProfile = FRENCH_PRESS_STYLE_TUTORIALS[styleKey];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'aeropress' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'standard' : context.recipeStyle;
    const styleProfile = AEROPRESS_STYLE_TUTORIALS[styleKey];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  if (context.methodFamily === 'hario_switch' && context.recipeStyle) {
    const styleKey = context.recipeStyle === 'auto' ? 'hybrid_balanced' : context.recipeStyle;
    const styleProfile = SWITCH_STYLE_TUTORIALS[styleKey];
    if (styleProfile) {
      const copy = styleProfile[phase];
      if (copy) {
        return copy[language].replace(/\s+/g, ' ').trim();
      }
    }
  }

  const profile = WORKFLOW_TUTORIALS[context.methodFamily] || WORKFLOW_TUTORIALS.v60;
  const copy = profile.actions?.[context.actionType]
    || (context.brewMode === 'iced' ? profile.iced?.[phase] : undefined)
    || profile[phase]
    || profile.main;

  return copy[language].replace(/\s+/g, ' ').trim();
}
