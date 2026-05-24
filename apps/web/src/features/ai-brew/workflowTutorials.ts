import type {
  AiBrewMethodFamily,
  WorkflowGuideActionType,
  KalitaWaveRecipeStyle,
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

export function resolveWorkflowTutorialDetail(context: WorkflowTutorialContext) {
  const phase = resolveWorkflowTutorialPhase(context.actionType);
  const language = resolveWorkflowTutorialLanguage(context.language);

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
