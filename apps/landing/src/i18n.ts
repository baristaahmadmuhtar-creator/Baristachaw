export type Language = 'id' | 'en' | 'bn';

type TranslationSet = Record<Language, string>;

export function t(key: string, lang: Language): string {
  const entry = translations[key];
  if (!entry) {
    console.warn(`[i18n] Missing translation key: "${key}"`);
    return key;
  }
  return entry[lang] ?? entry.en ?? key;
}

export const translations: Record<string, TranslationSet> = {
  'nav.aiBrew': { id: 'AI Brew', en: 'AI Brew', bn: 'AI Brew' },
  'nav.methods': { id: 'Metode', en: 'Methods', bn: 'Kaedah' },
  'nav.download': { id: 'Unduh Aplikasi', en: 'Download', bn: 'Muat Turun Aplikasi' },
  'nav.support': { id: 'Pusat Bantuan', en: 'Support', bn: 'Pusat Bantuan' },
  'nav.login': { id: 'Masuk', en: 'Log In', bn: 'Log Masuk' },
  'nav.tryAiBrew': { id: 'Mulai AI Brew', en: 'Start AI Brew', bn: 'Mula AI Brew' },
  'nav.register': { id: 'Daftar', en: 'Register', bn: 'Daftar' },
  'nav.brewMethods': { id: 'Metode Seduh', en: 'Brew Methods', bn: 'Kaedah Seduhan' },
  'nav.downloadApp': { id: 'Unduh Aplikasi', en: 'Download App', bn: 'Muat Turun Aplikasi' },

  'hero.brand': { id: 'Baristachaw AI Brew', en: 'Baristachaw AI Brew', bn: 'Baristachaw AI Brew' },
  'hero.titleDesktop': {
    id: 'Sempurnakan Seduhan Kopi Anda Setiap Pagi, Tanpa Keraguan.',
    en: 'Master the Perfect Extraction Every Morning, Without the Guesswork.',
    bn: 'Hasilkan Secawan Kopi Sempurna Setiap Pagi, Tanpa Keraguan.',
  },
  'hero.titleMobileLine1': {
    id: 'Sempurnakan seduhan.',
    en: 'Master your brew.',
    bn: 'Sempurnakan seduhan.',
  },
  'hero.titleMobileLine2': {
    id: 'Tanpa keraguan.',
    en: 'Without the guesswork.',
    bn: 'Tanpa ragu-ragu.',
  },
  'hero.alternate': {
    id: 'Sempurnakan Seduhan Kopi Anda Setiap Pagi, Tanpa Keraguan.',
    en: 'Master the Perfect Extraction Every Morning, Without the Guesswork.',
    bn: 'Hasilkan Secawan Kopi Sempurna Setiap Pagi, Tanpa Keraguan.',
  },
  'hero.body': {
    id: 'Tingkatkan ritual kopi harian Anda dengan presisi dan konsistensi. Asisten cerdas kami menyelaraskan biji kopi, air, dan kalibrasi grinder untuk hasil ekstraksi maksimal, setiap hari.',
    en: 'Elevate your daily coffee ritual with precision and consistency. Our intelligent assistant aligns your beans, water, and grinder for the ultimate extraction, every single day.',
    bn: 'Tingkatkan ritual kopi harian biskita dengan ketepatan dan konsistensi. Pembantu pintar kami menyelaras biji kopi, profil air, dan tetapan pengisar untuk mendapatkan pengekstrakan rasa yang optimum, setiap hari.',
  },
  'hero.startBrew': { id: 'Mulai Seduh', en: 'Start Brewing', bn: 'Mula Menyeduh' },
  'hero.downloadApk': { id: 'Unduh APK', en: 'Download APK', bn: 'Muat Turun APK' },
  'hero.registerFree': { id: 'Daftar Gratis', en: 'Register Free', bn: 'Daftar Percuma' },
  'hero.microcopy': {
    id: 'Tanpa hambatan. Dipercaya oleh home brewer antusias dan profesional kopi elit.',
    en: 'Zero friction. Trusted by passionate home brewers and elite coffee professionals worldwide.',
    bn: 'Tanpa kerumitan. Dipercayai oleh para penggemar kopi dan barista profesional.',
  },
  'hero.brewSheet': { id: 'Lembar Seduh Hari Ini', en: "Today's Brew Sheet", bn: 'Lembaran Seduh Hari Ini' },
  'hero.recommended': { id: 'Rekomendasi Utama', en: 'Recommended Brew', bn: 'Seduhan Disyorkan' },
  'hero.brewRatio': { id: 'Rasio Seduh', en: 'Brew Ratio', bn: 'Nisbah Seduhan' },
  'hero.waterTemp': { id: 'Suhu Air', en: 'Water Temp', bn: 'Suhu Air' },
  'hero.pourMethod': { id: 'Metode Aliran', en: 'Pour Method', bn: 'Kaedah Tuangan' },
  'hero.blooming': { id: 'Blooming', en: 'Blooming', bn: 'Blooming' },
  'hero.bloomDesc': { id: 'Pelepasan Karbon (50g)', en: 'Degassing phase (50g)', bn: 'Fasa Pelepasan Gas (50g)' },
  'hero.pour1': { id: 'Tuangan Pertama', en: 'First Pour', bn: 'Tuangan Pertama' },
  'hero.pour1Desc': { id: 'Ekstraksi Kemanisan (120g)', en: 'Extract sweetness (120g)', bn: 'Pengekstrakan Manis (120g)' },
  'hero.pour2': { id: 'Tuangan Kedua', en: 'Second Pour', bn: 'Tuangan Kedua' },
  'hero.pour2Desc': { id: 'Pembentukan Karakter (150g)', en: 'Develop body & structure (150g)', bn: 'Pembentukan Karakter & Keseimbangan (150g)' },
  'hero.finish': { id: 'Ekstraksi Selesai', en: 'Drawdown Complete', bn: 'Pengekstrakan Selesai' },
  'hero.finishDesc': { id: 'Siap Dinikmati', en: 'Ready to serve', bn: 'Sedia untuk dinikmati' },
  'hero.targetFlavor': { id: 'Profil Rasa Sasaran', en: 'Target Flavor Profile', bn: 'Profil Rasa Sasaran' },
  'hero.flavorValue': { id: 'Manis & Asiditas Elegan', en: 'Sweet & Elegant Acidity', bn: 'Manis & Keasidan Elegan' },

  'value.index': {
    id: 'Mengapa Upgrade?',
    en: 'Why Upgrade?',
    bn: 'Kenapa Perlu Naik Taraf?'
  },
  'value.title': {
    id: 'Ubah tebak-tebakan kopi menjadi alur seduh yang presisi.',
    en: 'Transform coffee guesswork into a precision workflow.',
    bn: 'Tukarkan tekaan kopi kepada aliran kerja yang lebih tepat dan jitu.'
  },
  'value.body': {
    id: 'Baristachaw memberdayakan Anda untuk mengambil keputusan kopi lebih cerdas: kalkulasi rasio, panduan ukuran gilingan, dan AI Brew - terintegrasi dalam satu platform.',
    en: 'Baristachaw empowers you to make smarter coffee decisions: ratio calculations, grind size guidance, and AI Brew—seamlessly integrated into one platform.',
    bn: 'Baristachaw memperkasakan biskita untuk membuat keputusan kopi yang lebih pintar: pengiraan nisbah, panduan saiz gilingan, dan AI Brew - semuanya disatukan dalam satu platform.'
  },
  'value.card1.title': {
    id: 'Keyakinan di Setiap Seduhan',
    en: 'Confidence in Every Cup',
    bn: 'Keyakinan Dalam Setiap Cawan'
  },
  'value.card1.body': {
    id: 'Dapatkan panduan khusus yang dioptimalkan untuk metode, alat giling, tingkat roasting, dan profil rasa yang Anda tuju.',
    en: 'Receive tailored guidance optimized for your method, grinder, roast level, and intended flavor profile.',
    bn: 'Terima panduan khusus yang dioptimumkan untuk kaedah, pengisar, tahap panggangan, dan profil rasa yang biskita inginkan.'
  },
  'value.card2.title': {
    id: 'Akurasi Dial-In',
    en: 'Dial-In Accuracy',
    bn: 'Ketepatan Dial-In'
  },
  'value.card2.body': {
    id: 'Pangkas trial-and-error secara drastis melalui rekomendasi rasio dan panduan langkah demi langkah yang sistematis.',
    en: 'Drastically reduce trial and error through systematic ratio recommendations and step-by-step guidance.',
    bn: 'Kurangkan ralat percubaan secara drastik melalui cadangan nisbah yang bersistematik dan panduan langkah demi langkah.'
  },
  'value.card3.title': {
    id: 'Arsip Mahakarya Anda',
    en: 'Archive Your Masterpieces',
    bn: 'Arkibkan Resepi Masterpiece Biskita'
  },
  'value.card3.body': {
    id: 'Katalogkan resep, catatan penyeduhan, dan analisis AI Anda agar setiap cangkir sempurna dapat selalu direplikasi.',
    en: 'Catalog your recipes, tasting notes, and AI analysis so every perfect cup can be effortlessly replicated.',
    bn: 'Katalogkan resepi, nota rasa, dan analisis AI biskita supaya setiap cawan yang sempurna dapat diulang dengan mudah.'
  },
  'value.card4.title': {
    id: 'Tingkatkan Skala Profesionalitas',
    en: 'Scale Your Professionalism',
    bn: 'Tingkatkan Skala Profesional Biskita'
  },
  'value.card4.body': {
    id: 'Tingkatkan keanggotaan untuk akses eksklusif ke AI Coach, analitik visual mendalam, mode Deep, dan batasan tanpa kompromi.',
    en: 'Upgrade for exclusive access to AI Coach, deep visual analytics, Deep mode, and uncompromising limits.',
    bn: 'Naik taraf untuk akses eksklusif ke Jurulatih AI, analitik visual mendalam, mod Deep, dan had langganan tanpa kompromi.'
  },
  'value.ctaPrimary': {
    id: 'Mulai Gratis Sekarang',
    en: 'Start Free Now',
    bn: 'Mula Percuma Sekarang'
  },
  'value.ctaSecondary': {
    id: 'Jelajahi Paket Premium',
    en: 'Explore Premium Plans',
    bn: 'Terokai Pelan Premium'
  },
  'value.note': {
    id: 'Baristachaw menyediakan struktur analitis. Ekstraksi akhir tetap menjadi seni yang dipengaruhi oleh kualitas biji, profil air, presisi alat, dan teknik Anda.',
    en: 'Baristachaw provides an analytical framework. The final extraction remains an art influenced by bean quality, water profile, equipment precision, and your technique.',
    bn: 'Baristachaw menyediakan kerangka analisis. Pengekstrakan akhir tetap satu seni yang dipengaruhi oleh kualiti biji kopi, profil air, ketepatan peralatan, dan teknik biskita.'
  },

  'pricing.index': { id: 'Investasi', en: 'Pricing', bn: 'Pelan & Harga' },
  'pricing.title': {
    id: 'Pilih Akses Premium untuk Ritual Kopi Anda.',
    en: 'Select the Premium Access for Your Coffee Ritual.',
    bn: 'Pilih Akses Premium untuk Ritual Kopi Biskita.',
  },
  'pricing.subtitle': {
    id: 'Mulai dari penggemar kopi rumahan hingga alur kerja bar profesional — setiap paket dirancang khusus demi keunggulan ekstraksi maksimal.',
    en: 'From passionate home brewing to professional bar workflows—every tier is engineered for absolute extraction excellence.',
    bn: 'Dari pembuat kopi di rumah hingga ke aliran kerja bar profesional — setiap pelan direka khas untuk kesempurnaan pengekstrakan yang mutlak.',
  },
  'pricing.selectDuration': { id: 'Pilih siklus penagihan', en: 'Select billing cycle', bn: 'Pilih kitaran bil' },
  'pricing.1month': { id: '1 Bulan', en: '1 Month', bn: '1 Bulan' },
  'pricing.3months': { id: '3 Bulan', en: '3 Months', bn: '3 Bulan' },
  'pricing.1year': { id: '1 Tahun', en: '1 Year', bn: '1 Tahun' },
  'pricing.best': { id: 'Unggulan!', en: 'Best!', bn: 'Pilihan!' },
  'pricing.bestValue': { id: 'NILAI TERBAIK', en: 'BEST VALUE', bn: 'NILAI TERBAIK' },

  'plan.free.badge': { id: 'Gratis', en: 'Free', bn: 'Percuma' },
  'plan.free.name': { id: 'Mulai Eksplorasi', en: 'Start Exploring', bn: 'Mula Meneroka' },
  'plan.free.price': { id: 'Rp0', en: '$0', bn: '$0' },
  'plan.free.period': { id: 'Selamanya', en: 'Forever', bn: 'Selamanya' },
  'plan.free.f1': { id: 'Timer Seduh Interaktif', en: 'Interactive Brew Timer', bn: 'Pemasa Seduhan Interaktif' },
  'plan.free.f2': { id: 'Kalkulator Ukuran Gilingan', en: 'Grind Size Calculator', bn: 'Kalkulator Saiz Gilingan' },
  'plan.free.f3': { id: 'Kalkulator Rasio Kopi', en: 'Coffee Ratio Calculator', bn: 'Kalkulator Nisbah Kopi' },
  'plan.free.f4': { id: 'Koleksi Resep & Catatan', en: 'Recipe Collection & Notes', bn: 'Koleksi Resepi & Nota' },
  'plan.free.f5': { id: 'Pratinjau Scanner Dasar', en: 'Basic Scanner Preview', bn: 'Pratonton Pengimbas Asas' },
  'plan.free.cta': { id: 'Mulai Sekarang', en: 'Start Now', bn: 'Mula Sekarang' },

  'plan.plus.badge': { id: 'Barista Pemula', en: 'Barista Starter', bn: 'Barista Pemula' },
  'plan.plus.name': { id: 'Penyeduh Serius', en: 'Serious Home Barista', bn: 'Barista Rumah Serius' },
  'plan.plus.f1': { id: 'Seluruh Akses Gratis', en: 'All Free Access', bn: 'Semua Akses Percuma' },
  'plan.plus.f2': { id: 'Akses Terbatas AI Chat', en: 'Limited AI Chat Access', bn: 'Akses Chat AI Terhad' },
  'plan.plus.f3': { id: 'Mode Seduh Dasar & Lanjut', en: 'Basic & Advanced Brew Mode', bn: 'Mod Seduhan Asas & Lanjutan' },
  'plan.plus.f4': { id: 'Panduan Seduh Lite & Pro', en: 'Lite & Pro Brew Guide', bn: 'Panduan Seduh Lite & Pro' },
  'plan.plus.f5': { id: 'Prioritas Peninjauan Pembayaran', en: 'Priority Payment Review', bn: 'Keutamaan Semakan Pembayaran' },
  'plan.plus.cta': { id: 'Ambil Barista Pemula', en: 'Get Barista Starter', bn: 'Dapatkan Barista Pemula' },

  'plan.pro.badge': { id: 'Barista Pro', en: 'Barista Pro', bn: 'Barista Pro' },
  'plan.pro.name': { id: 'Barista Profesional', en: 'Professional Barista', bn: 'Barista Profesional' },
  'plan.pro.f1': { id: 'Seluruh Fitur Barista Pemula', en: 'All Barista Starter Features', bn: 'Semua Fitur Barista Pemula' },
  'plan.pro.f2': { id: 'Asisten Pelatih AI Penuh', en: 'Full AI Coach Assistant', bn: 'Pembantu Jurulatih AI Penuh' },
  'plan.pro.f3': { id: 'Analisis Kopi & Scan AI', en: 'AI Scan & Coffee Analysis', bn: 'Imbasan AI & Analisis Kopi' },
  'plan.pro.f4': { id: 'Seni Latte Berbasis AI', en: 'AI Latte Art', bn: 'Seni Latte AI' },
  'plan.pro.f5': { id: 'Seluruh Fitur Premium Terbuka', en: 'All Premium Features Unlocked', bn: 'Semua Ciri Premium Dibuka' },
  'plan.pro.cta': { id: 'Ambil Barista Pro', en: 'Get Barista Pro', bn: 'Dapatkan Barista Pro' },

  'plan.team.badge': { id: 'Tim Kafe', en: 'Cafe Team', bn: 'Pasukan Kafe' },
  'plan.team.name': { id: 'Kafe & Perusahaan', en: 'Cafe & Enterprise', bn: 'Kafe & Perusahaan' },
  'plan.team.price': { id: 'Kustom', en: 'Custom', bn: 'Khas' },
  'plan.team.period': { id: 'Hubungi kami', en: 'Contact us', bn: 'Hubungi kami' },
  'plan.team.f1': { id: 'Seluruh Fitur Barista Pro', en: 'All Barista Pro Features', bn: 'Semua Ciri Barista Pro' },
  'plan.team.f2': { id: 'Lisensi Kolaborasi Tim', en: 'Team Collaboration Seats', bn: 'Lesen Kolaborasi Pasukan' },
  'plan.team.f3': { id: 'Tinjauan Resep Bersama', en: 'Shared Recipe Review', bn: 'Semakan Resepi Bersama' },
  'plan.team.f4': { id: 'Manajemen Penagihan Admin', en: 'Admin Billing Management', bn: 'Pengurusan Bil Admin' },
  'plan.team.f5': { id: 'Dukungan Setup Eksklusif', en: 'Exclusive Setup Support', bn: 'Sokongan Setup Eksklusif' },
  'plan.team.cta': { id: 'Hubungi Kami', en: 'Contact Sales', bn: 'Hubungi Jualan' },

  'promo.label': { id: 'Memiliki kode undangan khusus?', en: 'Have an exclusive promo code?', bn: 'Mempunyai kod promo eksklusif?' },
  'promo.placeholder': { id: 'Masukkan kode promo...', en: 'Enter promo code...', bn: 'Masukkan kod promo...' },
  'promo.ariaLabel': { id: 'Kode promo', en: 'Promo code', bn: 'Kod promo' },
  'promo.applied': { id: 'Diterapkan', en: 'Applied', bn: 'Telah Diterapkan' },
  'promo.apply': { id: 'Gunakan', en: 'Apply', bn: 'Gunakan' },
  'promo.success': { id: 'Kode promo tervalidasi dan akan diterapkan pada rincian tagihan akhir.', en: 'Promo code validated and will be applied to the final billing.', bn: 'Kod promo disahkan dan akan digunakan pada bil akhir.' },

  'final.brand': { id: 'Baristachaw AI Brew', en: 'Baristachaw AI Brew', bn: 'Baristachaw AI Brew' },
  'final.title': {
    id: 'Mulailah Mengekstraksi Kopi Paling Luar Biasa Anda, Hari Ini.',
    en: 'Start Extracting Your Most Exceptional Coffee, Today.',
    bn: 'Mula Mengekstrak Kopi Paling Luar Biasa Biskita, Hari Ini.',
  },
  'final.body': {
    id: 'Bergabunglah dengan ribuan home brewer dan profesional kopi yang telah mentransformasi ritual pagi mereka dengan hasil seduhan yang presisi, kaya rasa, dan dapat direplikasi — setiap harinya.',
    en: 'Join thousands of home brewers and coffee professionals who have transformed their morning rituals with precise, deeply flavorful, and repeatable extractions — every single day.',
    bn: 'Sertai ribuan pembuat kopi rumah dan profesional yang telah mentransformasikan ritual pagi mereka dengan hasil seduhan yang jitu, penuh perisa, dan boleh direplikasi — setiap hari.',
  },
  'final.tryAiBrew': { id: 'Alami AI Brew', en: 'Experience AI Brew', bn: 'Rasai Pengalaman AI Brew' },
  'final.registerFree': { id: 'Daftar Secara Gratis', en: 'Register For Free', bn: 'Daftar Secara Percuma' },

  'footer.tagline': {
    id: 'Asisten kecerdasan buatan untuk kesempurnaan ritual ekstraksi Anda.',
    en: 'Your artificial intelligence companion for absolute extraction perfection.',
    bn: 'Pembantu kecerdasan buatan untuk kesempurnaan pengekstrakan mutlak biskita.',
  },
  'footer.copyright': {
    id: 'Kopi yang luar biasa bermula dari ritual yang terkalibrasi.',
    en: 'Exceptional coffee always begins with a calibrated ritual.',
    bn: 'Kopi yang luar biasa sentiasa bermula dengan ritual yang dikalibrasi.',
  },

  'mobileCta.tryAiBrew': { id: 'Mulai AI Brew', en: 'Start AI Brew', bn: 'Mula AI Brew' },
  'mobileCta.download': { id: 'Unduh Aplikasi', en: 'Download', bn: 'Muat Turun Aplikasi' },

  'register.title': { id: 'Pendaftaran & Langganan', en: 'Registration & Subscription', bn: 'Pendaftaran & Langganan' },
  'register.subtitle': {
    id: 'Buat akun eksklusif Anda untuk mengaktifkan paket',
    en: 'Create your exclusive account to activate the plan',
    bn: 'Daftar akaun eksklusif biskita untuk mengaktifkan pelan',
  },
  'register.loginTitle': { id: 'Akses Portal Anda', en: 'Access Your Portal', bn: 'Akses Portal Biskita' },
  'register.loginSubtitle': { id: 'Otentikasi untuk mengelola pengaturan dan paket Anda', en: 'Authenticate to manage your settings and plan', bn: 'Log masuk untuk mengurus tetapan dan pelan biskita' },
  'register.name': { id: 'Nama Lengkap', en: 'Full Name', bn: 'Nama Penuh' },
  'register.email': { id: 'Alamat Email', en: 'Email Address', bn: 'Alamat Emel' },
  'register.password': { id: 'Kata Sandi', en: 'Password', bn: 'Kata Laluan' },
  'register.submit': { id: 'Daftar & Selesaikan Pembayaran', en: 'Register & Complete Payment', bn: 'Daftar & Selesaikan Pembayaran' },
  'register.loginSubmit': { id: 'Otentikasi Masuk', en: 'Authenticate', bn: 'Sahkan Log Masuk' },
  'register.or': { id: 'atau', en: 'or', bn: 'atau' },
  'register.google': { id: 'Autentikasi Cepat via Google', en: 'Fast Authenticate via Google', bn: 'Log Masuk Pantas via Google' },
  'register.haveAccount': { id: 'Telah memiliki kredensial?', en: 'Already possess credentials?', bn: 'Sudah mempunyai kelayakan?' },
  'register.dontHaveAccount': { id: 'Belum memiliki akses?', en: 'Do not have access yet?', bn: 'Belum mempunyai akses?' },
  'register.loginLink': { id: 'Masuk Portal', en: 'Enter Portal', bn: 'Masuk Portal' },
  'register.registerLink': { id: 'Registrasi Akses', en: 'Register Access', bn: 'Daftar Akses' },
  'register.selectedPlan': { id: 'Paket Terpilih', en: 'Selected Plan', bn: 'Pelan Terpilih' },
  'register.close': { id: 'Tutup', en: 'Close', bn: 'Tutup' },
  'register.freeCta': { id: 'Inisialisasi Akses - Gratis', en: 'Initialize Access - Free', bn: 'Mulakan Akses - Percuma' },
  'register.processing': { id: 'Memproses Otentikasi...', en: 'Processing Authentication...', bn: 'Memproses Pengesahan...' },
  'nav.logout': { id: 'Keluar Portal', en: 'Exit Portal', bn: 'Keluar Portal' },
  'nav.toApp': { id: 'Masuk ke Dasbor', en: 'Enter Dashboard', bn: 'Masuk ke Papan Pemuka' },

  'download.title': { id: 'Unduh Klien Resmi', en: 'Download Official Client', bn: 'Muat Turun Pelanggan Rasmi' },
  'download.webApp': { id: 'Buka Dasbor Web', en: 'Open Web Dashboard', bn: 'Buka Papan Pemuka Web' },
  'download.android': { id: 'Unduh Paket Android (APK)', en: 'Download Android Package (APK)', bn: 'Muat Turun Pakej Android (APK)' },
  'download.androidDesc': {
    id: 'Lakukan instalasi mandiri secara langsung jika rilis perangkat lunak tersedia.',
    en: 'Perform direct self-installation when the software release artifact is available.',
    bn: 'Lakukan pemasangan secara terus apabila keluaran perisian tersedia.',
  },
  'download.webDesc': {
    id: 'Akses antarmuka penuh secara instan melalui peramban Anda, tanpa instalasi tambahan.',
    en: 'Access the full interface instantly via your browser, without extra installation.',
    bn: 'Akses antara muka penuh secara segera melalui pelayar biskita, tanpa pemasangan tambahan.',
  },
};
