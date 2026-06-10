const fs = require('fs');
const path = require('path');

const targetFile = 'apps/web/src/features/ai-brew/workflowTutorials.ts';
let content = fs.readFileSync(targetFile, 'utf8');

function replaceDict(dictName, newContent) {
  const startRegex = new RegExp('const ' + dictName + ': Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = \\{\\s*');
  const match = content.match(startRegex);
  if (!match) {
    console.error(dictName + ' not found!');
    return;
  }
  let braceCount = 1;
  let index = match.index + match[0].length;
  while (braceCount > 0 && index < content.length) {
    if (content[index] === '{') braceCount++;
    if (content[index] === '}') braceCount--;
    index++;
  }
  const end = index;
  content = content.substring(0, match.index) + newContent + content.substring(end);
}

const kalitaWave = `const KALITA_WAVE_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_flat_three: {
    setup: {
      en: 'Seat the fluted wave filter precisely and rinse gently to preheat the dripper without collapsing the structural ridges.',
      id: 'Pasang filter bergelombang dengan presisi dan bilas perlahan untuk memanaskan dripper tanpa merusak struktur lipatannya.'
    },
    entry: {
      en: 'Saturate the flat-bottom bed uniformly. The 3-hole base restricts flow, so ensure all grounds are wetted without flooding the lateral bypass zones.',
      id: 'Saturasi hamparan alas datar secara seragam. Dasar 3 lubang menahan aliran, jadi pastikan semua bubuk basah tanpa membanjiri zona tepi bypass.'
    },
    main: {
      en: 'Deploy three concentric, low-agitation pulses to maintain a shallow, stable slurry depth. This ensures perfectly even parallel extraction across the flat bed.',
      id: 'Terapkan tiga tuangan konsentris beragitasi rendah untuk menjaga kedalaman seduhan stabil. Ini memastikan ekstraksi paralel merata di seluruh alas datar.'
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
      id: 'Lakukan blooming cepat dan agresif untuk memaksa saturasi total seketika. Ekstraksi cepat menuntut kontak air menyeluruh sejak awal.'
    },
    main: {
      en: 'Deliver four rapid, tight concentric pulses. Rely on the filter geometry to mitigate bypass velocity while aggressively churning the dense center.',
      id: 'Berikan empat tuangan konsentris cepat dan rapat. Andalkan geometri filter untuk meredam kecepatan bypass sambil mengaduk kuat area tengah.'
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
      en: 'Pre-wet the bed gently and completely. Do not agitate; we want the slurry to settle into a deep, compact puck.',
      id: 'Basahi kopi dengan lembut dan menyeluruh. Jangan lakukan agitasi; kita ingin seduhan memadat menjadi lapisan yang dalam dan rapat.'
    },
    main: {
      en: 'Maintain an exceptionally slow, unbroken, center-biased stream. We are utilizing the water column weight to drive extraction without mechanical turbulence.',
      id: 'Pertahankan aliran sangat lambat, tak terputus, dan berpusat di tengah. Kita menggunakan berat kolom air untuk mendorong ekstraksi tanpa turbulensi mekanis.'
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
      en: 'Pour short, concentrated hot pulses. The flat bottom limits channeling, forcing every drop to wash heavily through the dense grounds.',
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
      en: 'Pour slowly and centrally. Avoid swirling or aggressive pouring, which will drive fines to the flat bottom and halt the drawdown completely.',
      id: 'Tuang perlahan di tengah. Hindari putaran atau tuangan agresif yang akan mendorong partikel halus ke dasar dan menghentikan ekstraksi total.'
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
};`;

const chemex = `const CHEMEX_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_three_pour: {
    setup: {
      en: 'Place the thick bonded filter precisely, aligning the triple-fold against the pouring spout. Rinse extensively with hot water to remove paper taste and preheat the heavy glass.',
      id: 'Pasang filter tebal Chemex dengan presisi, sejajarkan sisi lipatan tiga di jalur penuang. Bilas ekstensif dengan air panas untuk menghilangkan rasa kertas dan memanaskan kaca tebal.'
    },
    entry: {
      en: 'Bloom patiently. Chemex paper inherently restricts flow, so total, deep saturation matters far more than pouring speed.',
      id: 'Bloom dengan sabar. Kertas Chemex secara alami menahan aliran, sehingga saturasi mendalam dan total jauh lebih penting daripada kecepatan tuang.'
    },
    main: {
      en: 'Execute measured, rhythmic pulses. Keep the water column off the high walls; Chemex rewards a calm, patient, centered flow that utilizes the deep cone.',
      id: 'Lakukan tuangan bertahap yang terukur. Jauhkan aliran dari dinding tinggi; Chemex memberi hasil terbaik dari aliran tengah yang tenang dan sabar di kerucut dalam.'
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
      en: 'Deliver tight, frequent pulses to maintain high slurry temperature and constant agitation. The thick filter will catch the fines we suspend.',
      id: 'Berikan pulsa rapat dan sering untuk menjaga suhu tinggi dan agitasi konstan. Filter tebal akan menangkap partikel halus yang kita angkat.'
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
      en: 'Maintain an exceptionally slow, absolute center pour. By never touching the edges, we force water straight down the deepest path of the cone.',
      id: 'Pertahankan tuangan tengah mutlak yang sangat lambat. Dengan tidak menyentuh tepi, kita memaksa air turun langsung melewati jalur kerucut terdalam.'
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
      en: 'Pour in sustained, heavy pulses. We are extracting a dense, hyper-sweet concentrate that must be strong enough to survive ice dilution.',
      id: 'Tuang dalam pulsa berat dan konstan. Kita sedang mengekstrak konsentrat padat dan super manis yang harus cukup kuat menahan dilusi es.'
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
      id: 'Tuang secara berat dan berirama di tengah. Hindari menyiram dinding tinggi, karena berisiko mem-bypass air melewati pinggiran bed tebal.'
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
};`;

const clever = `const CLEVER_DRIPPER_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
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
      en: 'Add the coffee grounds gently onto the surface of the hot water. Fold them in with zero aggressive stirring to prevent fine migration.',
      id: 'Tambahkan bubuk kopi perlahan ke atas permukaan air panas. Tenggelamkan perlahan tanpa adukan agresif demi mencegah migrasi partikel halus.'
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
      en: 'Execute a fast hot pour with the valve closed to aggressively saturate the bed, then immediately place it on the server to drain the bloom liquor.',
      id: 'Lakukan tuangan panas cepat dengan katup tertutup untuk saturasi agresif, lalu segera letakkan di atas server untuk menguras cairan blooming.'
    },
    main: {
      en: 'Remove from the server to snap the valve shut. Pour the remaining volume and steep securely. We have flushed the harsh gases and are now extracting pure sweetness.',
      id: 'Angkat dari server untuk menutup katup. Tuang sisa air dan rendam. Kita telah membuang gas kasar dan kini mengekstrak kemanisan murni.'
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
      id: 'Tuang volume konsentrat panas secara agresif. Kita harus mengekstrak semua aromatik larut dengan cepat sebelum waktu rendam yang singkat habis.'
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
};`;

const moka = `const MOKA_POT_STYLE_TUTORIALS: Record<string, Record<WorkflowTutorialPhase, WorkflowTutorialCopy>> = {
  traditional_stovetop: {
    setup: {
      en: 'Fill the lower boiler with boiling water directly below the safety valve. Drop the coffee into the basket loosely—do not tamp it under any circumstance.',
      id: 'Isi boiler bawah dengan air mendidih tepat di bawah katup pengaman. Masukkan kopi ke keranjang dengan longgar—jangan pernah memadatkannya.'
    },
    entry: {
      en: 'Assemble the hot unit using a towel. Place it on low-to-medium heat. The boiling base water provides immediate pressure rather than burning the coffee during a slow heat-up.',
      id: 'Rakit alat panas ini menggunakan handuk. Letakkan di atas api kecil-sedang. Air yang sudah mendidih memberi tekanan instan tanpa membakar kopi selama pemanasan.'
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
  }
};`;

replaceDict('KALITA_WAVE_STYLE_TUTORIALS', kalitaWave);
replaceDict('CHEMEX_STYLE_TUTORIALS', chemex);
replaceDict('CLEVER_DRIPPER_STYLE_TUTORIALS', clever);
replaceDict('MOKA_POT_STYLE_TUTORIALS', moka);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated Kalita, Chemex, Clever, and Moka Pot.');
