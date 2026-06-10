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

const origami = `const ORIGAMI_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  cone_dripper_style: {
    setup: {
      en: 'Set the conical filter into the Origami. Rinse gently to shape it without crushing the delicate paper into the ceramic grooves.',
      id: 'Pasang filter kerucut ke dalam Origami. Bilas perlahan untuk membentuknya tanpa menghancurkan kertas halus ke dalam celah keramik.'
    },
    entry: {
      en: 'Bloom precisely. The deep grooves allow massive lateral airflow, so ensure total saturation quickly before the heat escapes.',
      id: 'Lakukan blooming dengan presisi. Celah dalam memungkinkan aliran udara lateral yang masif, jadi pastikan saturasi total dengan cepat sebelum panas lepas.'
    },
    main: {
      en: 'Pour in tight concentric circles. The Origami’s fast flow rate demands constant slurry replenishment to maintain temperature.',
      id: 'Tuang dalam lingkaran konsentris yang rapat. Laju aliran Origami yang cepat menuntut pengisian ulang campuran secara konstan untuk menjaga suhu.'
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
      en: 'Pulse slowly. Unlike the cone, the wave filter in the Origami provides remarkable stability, allowing for deep, sweet extraction.',
      id: 'Tuang secara bertahap perlahan. Berbeda dengan kerucut, filter wave dalam Origami memberi stabilitas luar biasa, memungkinkan ekstraksi yang dalam dan manis.'
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
      en: 'Skip the traditional blooming phase. We will execute one massive, unbroken pour to submerge all grounds instantly.',
      id: 'Lewati fase blooming tradisional. Kita akan mengeksekusi satu tuangan masif tak terputus untuk menenggelamkan semua kopi seketika.'
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
      id: 'Siapkan wadah saji Anda dengan es presisi. Pasang filter wave untuk stabilitas aliran maksimal selama seduhan konsentrat ini.'
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
};`;

const april = `const APRIL_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
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
      en: 'Execute large, distinct pours. The wide geometry demands significant slurry volume to ensure the entire flat bed is engaged.',
      id: 'Lakukan tuangan besar yang terpisah. Geometri lebar ini menuntut volume seduhan signifikan untuk memastikan seluruh hamparan datar terekstraksi.'
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
};`;

const melitta = `const MELITTA_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_melitta_one_pour: {
    setup: {
      en: 'Fold the seam of the Melitta filter flat. Rinse it carefully to adhere the paper to the steep wedge walls.',
      id: 'Lipat rata keliman filter Melitta. Bilas dengan hati-hati untuk menempelkan kertas ke dinding kerucut yang curam.'
    },
    entry: {
      en: 'Pour the entire bloom volume. The single tiny hole restricts flow immediately, so the bloom essentially steeps.',
      id: 'Tuang seluruh volume blooming. Satu lubang kecilnya langsung membatasi aliran, jadi blooming ini pada dasarnya merendam (steeping).'
    },
    main: {
      en: 'Execute one continuous, smooth pour to fill the wedge. The Melitta is designed for semi-immersion, managing its own flow rate.',
      id: 'Eksekusi satu tuangan berkelanjutan yang mulus untuk memenuhi kerucut. Melitta dirancang untuk semi-imersi, mengelola kecepatan alirannya sendiri.'
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
      en: 'Pour the first phase to 50%, let it drop slightly, then pour the rest. This creates mild agitation in the otherwise static brewer.',
      id: 'Tuang fase pertama hingga 50%, biarkan turun sedikit, lalu tuang sisanya. Ini menciptakan agitasi ringan di dalam brewer yang biasanya statis.'
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
      en: 'Execute one continuous slow pour to build thermal mass. The single hole will bottleneck the hot liquid, steeping it heavily.',
      id: 'Eksekusi satu tuangan lambat menerus untuk membangun massa termal. Lubang tunggal akan menahan cairan panas, merendamnya dengan berat.'
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
      en: 'Pour with extreme caution to maintain a low water level. We are executing a high-density, low-bypass percolation.',
      id: 'Tuang dengan sangat hati-hati untuk menjaga batas air tetap rendah. Kita sedang melakukan perkolasi kepadatan tinggi dengan bypass rendah.'
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
};`;

const kono = `const KONO_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  kono_meimon_traditional: {
    setup: {
      en: 'Place the conical filter into the Kono. Ensure it adheres perfectly; the Kono’s lower ribs rely on an airtight seal at the top to control flow.',
      id: 'Pasang filter kerucut ke dalam Kono. Pastikan menempel sempurna; rusuk bawah Kono mengandalkan segel kedap udara di atas untuk mengatur aliran.'
    },
    entry: {
      en: 'Do not pour rapidly. The Kono requires an ultra-slow, drop-by-drop bloom to meticulously hydrate the center of the bed.',
      id: 'Jangan tuang dengan cepat. Kono mensyaratkan blooming super-lambat, tetes demi tetes, untuk secara teliti menghidrasi tengah hamparan.'
    },
    main: {
      en: 'Maintain a painstakingly slow center pour. The water must permeate outward through the coffee puck, extracting via pure capillary action.',
      id: 'Pertahankan tuangan tengah yang sangat lambat. Air harus merembes keluar melalui gumpalan kopi, mengekstrak melalui aksi kapiler murni.'
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
      en: 'Pour in slow, calculated pulses. Avoid washing the filter edges to maintain the vacuum effect created by the smooth upper walls.',
      id: 'Tuang dalam pulsa lambat yang terhitung. Hindari membilas tepi filter untuk mempertahankan efek vakum dari dinding atas yang mulus.'
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
      en: 'Drip water onto the grounds literally one drop at a time until the entire mass is hydrated. This can take over a minute.',
      id: 'Teteskan air ke atas bubuk kopi secara harfiah satu tetes demi satu tetes hingga seluruh massa terhidrasi. Ini bisa memakan waktu semenit lebih.'
    },
    main: {
      en: 'Keep the water level brutally low. The extraction is forced entirely through the dense coffee core via osmotic pressure.',
      id: 'Jaga batas air tetap brutal rendah. Ekstraksi dipaksa seluruhnya melalui inti kopi padat via tekanan osmotik.'
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
};`;

replaceDict('ORIGAMI_STYLE_TUTORIALS', origami);
replaceDict('APRIL_STYLE_TUTORIALS', april);
replaceDict('MELITTA_STYLE_TUTORIALS', melitta);
replaceDict('KONO_STYLE_TUTORIALS', kono);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated Origami, April, Melitta, Kono.');
