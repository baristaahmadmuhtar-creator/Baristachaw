const fs = require('fs');
const targetFile = 'apps/web/src/features/ai-brew/workflowTutorials.ts';
let content = fs.readFileSync(targetFile, 'utf8');

function replaceDict(dictName, newContent) {
  const startRegex = new RegExp('const ' + dictName + ': Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = \\{\\s*');
  const match = content.match(startRegex);
  if (!match) return;
  let braceCount = 1;
  let index = match.index + match[0].length;
  while (braceCount > 0 && index < content.length) {
    if (content[index] === '{') braceCount++;
    if (content[index] === '}') braceCount--;
    index++;
  }
  content = content.substring(0, match.index) + newContent + content.substring(index);
}

const moka = `const MOKA_POT_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
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
};`;

const toddy = `const COLD_BREW_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
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
      en: 'Add a small amount of hot bloom water first to rapidly degas, then immediately shock it with the remaining icy water.',
      id: 'Tambahkan sedikit air panas (bloom) lebih dulu untuk mendegas cepat, lalu kejutkan seketika dengan sisa air sedingin es.'
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
      en: 'Bloom the hot water aggressively. We must extract all acidity and fruit notes instantly before the rapid drawdown ends.',
      id: 'Lakukan blooming air panas dengan agresif. Kita harus mengekstrak seluruh asiditas dan aroma buah seketika sebelum penirisan cepat berakhir.'
    },
    main: {
      en: 'Pour the hot concentrate seamlessly. Let the hot liquid fall directly onto the ice, flash-chilling on impact.',
      id: 'Tuang konsentrat panas secara berkesinambungan. Biarkan cairan panas jatuh langsung ke atas es, mendingin kilat saat bertabrakan.'
    },
    release: {
      en: 'Allow the short, intense brew to finish draining. The total contact time should be under 3 minutes.',
      id: 'Biarkan seduhan singkat nan intens ini selesai meniris. Total waktu kontak harus di bawah 3 menit.'
    },
    finish: {
      en: 'Swirl the carafe. This method locks in extreme volatile aromatics, delivering a crystalline, juicy iced coffee.',
      id: 'Putar karafe. Metode ini mengunci aromatik volatil ekstrem, memberikan kopi es yang sangat jernih (crystalline) dan berair (juicy).'
    }
  }
};`;

const batch = `const BATCH_BREW_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  sca_gold_cup: {
    setup: {
      en: 'Seat the massive paper filter carefully against the brew basket walls. Load an even, level bed of precisely ground coffee to guarantee uniform flow geometry.',
      id: 'Pasang filter kertas besar dengan hati-hati merapat ke dinding keranjang seduh. Ratakan hamparan kopi yang digiling presisi untuk menjamin geometri aliran seragam.'
    },
    entry: {
      en: 'Engage the brew cycle. The machine will deliver a calibrated spray-head dispersion, ensuring every quadrant of the coffee bed is saturated simultaneously.',
      id: 'Mulai siklus seduh. Mesin akan memberikan dispersi kepala penyemprot yang terkalibrasi, memastikan setiap kuadran hamparan kopi tersaturasi secara bersamaan.'
    },
    main: {
      en: 'Let the automated pulse-brew logic manage the slurry depth. The cycle is optimized to maintain a constant 93°C extraction environment without manual intervention.',
      id: 'Biarkan logika pulse-brew otomatis mengelola kedalaman air. Siklus ini dioptimalkan untuk menjaga lingkungan ekstraksi konstan 93°C tanpa campur tangan manual.'
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
      id: 'Siapkan keranjang dengan gilingan lebih halus untuk menaklukkan sangrai terang yang padat. Pastikan mesin sudah dipanaskan penuh untuk memberikan energi termal maksimal.'
    },
    entry: {
      en: 'Start the cycle. The machine fires high-temperature water immediately to crash through the dense cellular structure of the light roast.',
      id: 'Mulai siklus. Mesin seketika menembakkan air bersuhu tinggi untuk mendobrak struktur seluler padat dari kopi sangrai terang.'
    },
    main: {
      en: 'The spray head pulses rapidly to maintain high slurry temperature and constant agitation, maximizing the extraction of volatile floral and fruit acids.',
      id: 'Kepala semprot memompa cepat untuk menjaga suhu seduhan tinggi dan agitasi konstan, memaksimalkan ekstraksi asiditas floral dan buah volatil.'
    },
    release: {
      en: 'Monitor the drawdown. A slightly slower drain is expected and necessary to pull sufficient sweetness to balance the soaring acidity.',
      id: 'Pantau penurunan air. Aliran yang sedikit lebih lambat adalah wajar dan diperlukan untuk menarik cukup kemanisan guna menyeimbangkan asiditas yang menjulang.'
    },
    finish: {
      en: 'Integrate the carafe completely. Serve a vibrant, tea-like, and highly articulate batch brew that rivals manual pour-overs.',
      id: 'Saturasi karafe sepenuhnya. Sajikan batch brew yang cerah, layaknya teh, dan sangat artikulatif yang mampu menyaingi pour-over manual.'
    }
  },
  pre_wet_hybrid_batch: {
    setup: {
      en: 'Manually pre-wet the coffee bed with a stirring paddle before sliding the basket into the machine. This eliminates all dry pockets instantly.',
      id: 'Basahi manual hamparan kopi sambil diaduk dengan dayung sebelum memasukkan keranjang ke dalam mesin. Ini melenyapkan semua kantong kering seketika.'
    },
    entry: {
      en: 'Engage the machine cycle. Because the coffee is already blooming, the initial machine pulses immediately drive extraction rather than hydration.',
      id: 'Nyalakan siklus mesin. Karena kopi sudah mekar (blooming), semprotan awal mesin langsung mendorong ekstraksi, bukan lagi hidrasi.'
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
};`;

const siphon = `const SIPHON_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_vacuum_siphon: {
    setup: {
      en: 'Lock the upper glass chamber tightly into the boiling lower globe. Hook the cloth filter assembly securely to the glass tube.',
      id: 'Kunci ruang kaca atas rapat-rapat ke bola bawah yang mendidih. Kaitkan rakitan filter kain dengan kuat ke tabung kaca.'
    },
    entry: {
      en: 'As the vapor pressure drives the boiling water into the upper chamber, reduce the heat to a simmer. Add the coffee grounds once the water level stabilizes.',
      id: 'Saat tekanan uap mendorong air mendidih ke ruang atas, kecilkan api menjadi simmer. Masukkan kopi saat batas air sudah stabil.'
    },
    main: {
      en: 'Fold the coffee gently into the water with a bamboo paddle to ensure total saturation without disturbing the delicate cloth filter.',
      id: 'Tenggelamkan kopi perlahan ke dalam air dengan dayung bambu untuk memastikan saturasi total tanpa merusak filter kain yang sensitif.'
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
      en: 'Drop the grounds into the fully heated upper chamber. Instantly execute the first violent agitation to force an immediate, massive extraction.',
      id: 'Jatuhkan kopi ke ruang atas yang telah panas penuh. Seketika lakukan agitasi keras pertama untuk memaksa ekstraksi masif secara instan.'
    },
    main: {
      en: 'At 30 seconds, execute a secondary vortex stir. At 60 seconds, execute the final, aggressive turbulence right before removing the heat.',
      id: 'Pada 30 detik, lakukan adukan pusaran kedua. Pada 60 detik, lakukan turbulensi agresif terakhir tepat sebelum mematikan api.'
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
      en: 'Add coffee at peak boiling point in the upper chamber. We need high heat to compensate for the very coarse particle size.',
      id: 'Tambahkan kopi di titik didih puncak pada ruang atas. Kita butuh panas tinggi untuk mengkompensasi ukuran partikel yang sangat kasar.'
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
};`;

replaceDict('MOKA_POT_STYLE_TUTORIALS', moka);
replaceDict('COLD_BREW_STYLE_TUTORIALS', toddy);
replaceDict('BATCH_BREW_STYLE_TUTORIALS', batch);
replaceDict('SIPHON_STYLE_TUTORIALS', siphon);
fs.writeFileSync(targetFile, content);
console.log('Successfully updated Moka, Toddy, Batch, Siphon.');
