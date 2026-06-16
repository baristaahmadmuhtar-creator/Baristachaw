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
  'nav.download': { id: 'Unduh', en: 'Download', bn: 'Muat Turun' },
  'nav.support': { id: 'Dukungan', en: 'Support', bn: 'Sokongan' },
  'nav.login': { id: 'Masuk', en: 'Login', bn: 'Log Masuk' },
  'nav.tryAiBrew': { id: 'Coba AI Brew', en: 'Try AI Brew', bn: 'Cuba AI Brew' },
  'nav.register': { id: 'Daftar', en: 'Register', bn: 'Daftar' },
  'nav.brewMethods': { id: 'Metode seduh', en: 'Brewing methods', bn: 'Kaedah seduhan' },
  'nav.downloadApp': { id: 'Unduh aplikasi', en: 'Download app', bn: 'Muat turun aplikasi' },

  'hero.brand': { id: 'Baristachaw AI Brew', en: 'Baristachaw AI Brew', bn: 'Baristachaw AI Brew' },
  'hero.titleDesktop': {
    id: 'Bangun rencana seduh yang lebih jelas setiap pagi.',
    en: 'Build a clearer brew plan every morning.',
    bn: 'Bina rancangan seduh yang lebih jelas setiap pagi.',
  },
  'hero.titleMobileLine1': {
    id: 'Seduh lebih jelas.',
    en: 'Brew with more clarity.',
    bn: 'Seduh lebih jelas.',
  },
  'hero.titleMobileLine2': {
    id: 'Tanpa menebak-nebak.',
    en: 'Without the guesswork.',
    bn: 'Tanpa teka-teki.',
  },
  'hero.alternate': {
    id: 'Build a clearer brew plan every morning.',
    en: 'Bangun rencana seduh yang lebih jelas setiap pagi.',
    bn: 'Build a clearer brew plan every morning.',
  },
  'hero.body': {
    id: 'Baristachaw membantu menyusun recipe, grinder, air, dan catatan rasa. Software dapat memvalidasi alur kerja dan hitungan; kualitas cup akhir tetap perlu validasi seduh nyata.',
    en: 'Baristachaw helps organize recipes, grinders, water, and taste notes. The software can validate workflow and arithmetic; final cup quality still needs real brew validation.',
    bn: 'Baristachaw membantu menyusun resipi, grinder, air, dan nota rasa. Software dapat menyemak alur kerja dan kiraan; kualiti cup akhir masih perlu validasi seduh sebenar.',
  },
  'hero.startBrew': { id: 'Mulai Seduh', en: 'Start Brewing', bn: 'Mula Seduh' },
  'hero.downloadApk': { id: 'Unduh APK', en: 'Download APK', bn: 'Muat Turun APK' },
  'hero.registerFree': { id: 'Daftar Gratis', en: 'Register Free', bn: 'Daftar Percuma' },
  'hero.microcopy': {
    id: 'Recipe adalah starting point. Hasil rasa tetap divalidasi lewat seduhan nyata.',
    en: 'Recipes are starting points. Taste still needs real brew validation.',
    bn: 'Resipi adalah titik mula. Rasa masih perlu validasi seduh sebenar.',
  },
  'hero.brewSheet': { id: 'Lembar Seduh Hari Ini', en: "Today's Brew Sheet", bn: 'Lembaran Seduh Hari Ani' },
  'hero.recommended': { id: 'Rekomendasi Awal', en: 'Starting Recipe', bn: 'Resipi Mula' },
  'hero.brewRatio': { id: 'Rasio Seduh', en: 'Brew Ratio', bn: 'Nisbah Seduhan' },
  'hero.waterTemp': { id: 'Suhu Air', en: 'Water Temp', bn: 'Suhu Air' },
  'hero.pourMethod': { id: 'Metode Aliran', en: 'Pour Method', bn: 'Kaedah Tuangan' },
  'hero.blooming': { id: 'Blooming', en: 'Blooming', bn: 'Blooming' },
  'hero.bloomDesc': { id: 'Basahi kopi (50g)', en: 'Wet coffee bed (50g)', bn: 'Basahkan kopi (50g)' },
  'hero.pour1': { id: 'Tuangan 1', en: 'First Pour', bn: 'Tuangan Pertama' },
  'hero.pour1Desc': { id: 'Bentuk rasa (120g)', en: 'Build sweetness (120g)', bn: 'Bina rasa manis (120g)' },
  'hero.pour2': { id: 'Tuangan 2', en: 'Second Pour', bn: 'Tuangan Kedua' },
  'hero.pour2Desc': { id: 'Bentuk body (150g)', en: 'Develop body (150g)', bn: 'Bina body rasa (150g)' },
  'hero.finish': { id: 'Selesai', en: 'Drawdown', bn: 'Siap' },
  'hero.finishDesc': { id: 'Catat feedback', en: 'Log feedback', bn: 'Catat feedback' },
  'hero.targetFlavor': { id: 'Target karakter rasa', en: 'Target Flavor Profile', bn: 'Sasaran Profil Rasa' },
  'hero.flavorValue': { id: 'Sweet & Sweet Acid', en: 'Sweet & Vibrant Acidity', bn: 'Manis & Asid Segar' },

  'evidence.title': {
    id: 'Metrik rilis dan audit yang bisa diverifikasi',
    en: 'Release and audit metrics you can verify',
    bn: 'Metrik rilis dan audit yang boleh disemak',
  },
  'evidence.consistency': { id: 'Target rilis saat ini', en: 'Current release target', bn: 'Sasaran rilis semasa' },
  'evidence.brewers': { id: 'Profil brewer diaudit', en: 'Brewer profiles audited', bn: 'Profil brewer diaudit' },
  'evidence.satisfaction': { id: 'Skenario audit method/style AI Brew', en: 'AI Brew method/style audit scenarios', bn: 'Skenario audit method/style AI Brew' },
  'evidence.recipes': { id: 'Skenario real-world berbasis sumber', en: 'Source-backed real-world scenarios', bn: 'Skenario real-world bersumber' },
  'evidence.guesswork': { id: 'Permission Android terlarang pada audit statis', en: 'Blocked Android permissions in static audit', bn: 'Permission Android terlarang dalam audit statik' },
  'evidence.access': { id: 'Origin WebView Android', en: 'Android WebView origin', bn: 'Origin WebView Android' },
  'evidence.instant': { id: 'Instan', en: 'Instant', bn: 'Serta-Merta' },
  'evidence.note': {
    id: 'Angka ini adalah metrik software dan gate rilis, bukan jaminan rasa. Kualitas cup akhir tetap perlu diuji dengan seduhan nyata.',
    en: 'These are software and release-gate metrics, not taste guarantees. Final cup quality still needs real brew validation.',
    bn: 'Angka ini ialah metrik software dan gate rilis, bukan jaminan rasa. Kualiti cup akhir masih perlu diuji dengan seduhan sebenar.',
  },

  'pricing.index': { id: 'Harga', en: 'Pricing', bn: 'Harga' },
  'pricing.title': {
    id: 'Pilih paket yang cocok untuk workflow seduh Anda.',
    en: 'Choose the right plan for your brew workflow.',
    bn: 'Pilih pelan yang sesuai untuk workflow seduh anda.',
  },
  'pricing.subtitle': {
    id: 'Dari home brewer hingga team cafe, setiap paket menjelaskan batas fitur, AI mode, dan review pembayaran.',
    en: 'From home brewers to cafe teams, each plan is explicit about feature access, AI modes, and payment review.',
    bn: 'Dari home brewer sampai team cafe, setiap pelan menjelaskan akses fitur, mode AI, dan review pembayaran.',
  },
  'pricing.selectDuration': { id: 'Pilih durasi', en: 'Select duration', bn: 'Pilih tempoh' },
  'pricing.1month': { id: '1 Month', en: '1 Month', bn: '1 Month' },
  'pricing.3months': { id: '3 Months', en: '3 Months', bn: '3 Months' },
  'pricing.1year': { id: '1 Year', en: '1 Year', bn: '1 Year' },
  'pricing.best': { id: 'Best!', en: 'Best!', bn: 'Best!' },
  'pricing.bestValue': { id: 'BEST VALUE', en: 'BEST VALUE', bn: 'BEST VALUE' },

  'plan.free.badge': { id: 'Free', en: 'Free', bn: 'Free' },
  'plan.free.name': { id: 'Start Exploring', en: 'Start Exploring', bn: 'Start Exploring' },
  'plan.free.price': { id: 'Free', en: 'Free', bn: 'Free' },
  'plan.free.period': { id: 'Forever', en: 'Forever', bn: 'Forever' },
  'plan.free.f1': { id: 'Interactive Brew Timer', en: 'Interactive Brew Timer', bn: 'Interactive Brew Timer' },
  'plan.free.f2': { id: 'Grind Size Calculator', en: 'Grind Size Calculator', bn: 'Grind Size Calculator' },
  'plan.free.f3': { id: 'Coffee Ratio Calculator', en: 'Coffee Ratio Calculator', bn: 'Coffee Ratio Calculator' },
  'plan.free.f4': { id: 'Recipe Collection & Notes', en: 'Recipe Collection & Notes', bn: 'Recipe Collection & Notes' },
  'plan.free.f5': { id: 'Basic scanner preview', en: 'Basic scanner preview', bn: 'Basic scanner preview' },
  'plan.free.cta': { id: 'Start Now', en: 'Start Now', bn: 'Start Now' },

  'plan.plus.badge': { id: 'Barista Plus', en: 'Barista Plus', bn: 'Barista Plus' },
  'plan.plus.name': { id: 'Serious Home Barista', en: 'Serious Home Barista', bn: 'Serious Home Barista' },
  'plan.plus.f1': { id: 'All Free features', en: 'All Free features', bn: 'All Free features' },
  'plan.plus.f2': { id: 'AI recipe guidance', en: 'AI recipe guidance', bn: 'AI recipe guidance' },
  'plan.plus.f3': { id: 'Advanced brew logging', en: 'Advanced brew logging', bn: 'Advanced brew logging' },
  'plan.plus.f4': { id: 'Scanner history', en: 'Scanner history', bn: 'Scanner history' },
  'plan.plus.f5': { id: 'Priority manual payment review', en: 'Priority manual payment review', bn: 'Priority manual payment review' },
  'plan.plus.cta': { id: 'Get Barista Plus', en: 'Get Barista Plus', bn: 'Get Barista Plus' },

  'plan.pro.badge': { id: 'Barista Pro', en: 'Barista Pro', bn: 'Barista Pro' },
  'plan.pro.name': { id: 'Professional Barista', en: 'Professional Barista', bn: 'Professional Barista' },
  'plan.pro.f1': { id: 'All Barista Plus features', en: 'All Barista Plus features', bn: 'All Barista Plus features' },
  'plan.pro.f2': { id: 'AI BREW COACH', en: 'AI BREW COACH', bn: 'AI BREW COACH' },
  'plan.pro.f3': { id: 'AI Scan & Coffee Analysis', en: 'AI Scan & Coffee Analysis', bn: 'AI Scan & Coffee Analysis' },
  'plan.pro.f4': { id: 'AI Latte Art Generator', en: 'AI Latte Art Generator', bn: 'AI Latte Art Generator' },
  'plan.pro.f5': { id: 'Deep mode with higher credit use', en: 'Deep mode with higher credit use', bn: 'Deep mode with higher credit use' },
  'plan.pro.cta': { id: 'Get Barista Pro', en: 'Get Barista Pro', bn: 'Get Barista Pro' },

  'plan.team.badge': { id: 'Cafe Team', en: 'Cafe Team', bn: 'Cafe Team' },
  'plan.team.name': { id: 'Cafe & Professional', en: 'Cafe & Professional', bn: 'Cafe & Professional' },
  'plan.team.price': { id: 'Custom', en: 'Custom', bn: 'Custom' },
  'plan.team.period': { id: 'Contact us', en: 'Contact us', bn: 'Contact us' },
  'plan.team.f1': { id: 'All Barista Pro features', en: 'All Barista Pro features', bn: 'All Barista Pro features' },
  'plan.team.f2': { id: 'Team seats', en: 'Team seats', bn: 'Team seats' },
  'plan.team.f3': { id: 'Shared recipe review', en: 'Shared recipe review', bn: 'Shared recipe review' },
  'plan.team.f4': { id: 'Admin billing review', en: 'Admin billing review', bn: 'Admin billing review' },
  'plan.team.f5': { id: 'Support-assisted setup', en: 'Support-assisted setup', bn: 'Support-assisted setup' },
  'plan.team.cta': { id: 'Contact Us', en: 'Contact Us', bn: 'Contact Us' },

  'promo.label': { id: 'Punya kode promo?', en: 'Have a promo code?', bn: 'Ada kod promo?' },
  'promo.placeholder': { id: 'Masukkan kode promo...', en: 'Enter promo code...', bn: 'Masukkan kod promo...' },
  'promo.ariaLabel': { id: 'Kode promo', en: 'Promo code', bn: 'Kod promo' },
  'promo.applied': { id: 'Applied', en: 'Applied', bn: 'Diterapkan' },
  'promo.apply': { id: 'Terapkan', en: 'Apply', bn: 'Gunakan' },
  'promo.success': { id: 'Kode promo akan diterapkan saat checkout.', en: 'Promo code will be applied at checkout.', bn: 'Kod promo akan digunakan semasa pembayaran.' },

  'final.brand': { id: 'Baristachaw AI Brew', en: 'Baristachaw AI Brew', bn: 'Baristachaw AI Brew' },
  'final.title': {
    id: 'Mulai workflow seduh yang lebih terukur hari ini.',
    en: 'Start a more measured brew workflow today.',
    bn: 'Mula workflow seduh yang lebih terukur hari ani.',
  },
  'final.body': {
    id: 'Gunakan Baristachaw untuk merapikan recipe, hitungan, dan feedback. Setelah itu, validasi rasa tetap dilakukan lewat seduhan nyata.',
    en: 'Use Baristachaw to organize recipes, arithmetic, and feedback. Taste validation still happens through real brewing.',
    bn: 'Guna Baristachaw untuk merapikan resipi, kiraan, dan feedback. Validasi rasa tetap dibuat lewat seduhan sebenar.',
  },
  'final.tryAiBrew': { id: 'Coba AI Brew', en: 'Try AI Brew', bn: 'Cuba AI Brew' },
  'final.registerFree': { id: 'Daftar Gratis', en: 'Register Free', bn: 'Daftar Percuma' },

  'footer.tagline': {
    id: 'Asisten kopi cerdas untuk workflow seduh harian.',
    en: 'An intelligent coffee companion for daily brew workflows.',
    bn: 'Pembantu kopi pintar untuk workflow seduh harian.',
  },
  'footer.copyright': {
    id: 'Kopi yang lebih baik dimulai dari catatan dan validasi nyata.',
    en: 'Better coffee starts with notes and real validation.',
    bn: 'Kopi yang lebih baik bermula dari nota dan validasi sebenar.',
  },

  'mobileCta.tryAiBrew': { id: 'Coba AI Brew', en: 'Try AI Brew', bn: 'Cuba AI Brew' },
  'mobileCta.download': { id: 'Download', en: 'Download', bn: 'Muat Turun' },

  'register.title': { id: 'Daftar & Berlangganan', en: 'Register & Subscribe', bn: 'Daftar & Langgan' },
  'register.subtitle': {
    id: 'Buat akun untuk memulai paket Anda',
    en: 'Create your account to start your plan',
    bn: 'Buat akaun untuk mula pelan anda',
  },
  'register.loginTitle': { id: 'Masuk ke Akun Anda', en: 'Log in to your Account', bn: 'Log Masuk ke Akaun' },
  'register.loginSubtitle': { id: 'Masuk untuk mengelola paket Anda', en: 'Log in to manage your plan', bn: 'Log masuk untuk mengurus pelan anda' },
  'register.name': { id: 'Nama lengkap', en: 'Full name', bn: 'Nama penuh' },
  'register.email': { id: 'Email', en: 'Email', bn: 'Emel' },
  'register.password': { id: 'Kata sandi', en: 'Password', bn: 'Kata laluan' },
  'register.submit': { id: 'Daftar & Bayar', en: 'Register & Pay', bn: 'Daftar & Bayar' },
  'register.loginSubmit': { id: 'Masuk', en: 'Log In', bn: 'Log Masuk' },
  'register.or': { id: 'atau', en: 'or', bn: 'atau' },
  'register.google': { id: 'Lanjutkan dengan Google', en: 'Continue with Google', bn: 'Teruskan dengan Google' },
  'register.haveAccount': { id: 'Sudah punya akun?', en: 'Already have an account?', bn: 'Sudah ada akaun?' },
  'register.dontHaveAccount': { id: 'Belum punya akun?', en: "Don't have an account?", bn: 'Belum ada akaun?' },
  'register.loginLink': { id: 'Masuk di sini', en: 'Log in here', bn: 'Log masuk di sini' },
  'register.registerLink': { id: 'Daftar di sini', en: 'Register here', bn: 'Daftar di sini' },
  'register.selectedPlan': { id: 'Paket dipilih', en: 'Selected plan', bn: 'Pelan dipilih' },
  'register.close': { id: 'Tutup', en: 'Close', bn: 'Tutup' },
  'register.freeCta': { id: 'Mulai Sekarang - Gratis', en: 'Start Now - Free', bn: 'Mula Sekarang - Percuma' },
  'register.processing': { id: 'Memproses...', en: 'Processing...', bn: 'Memproses...' },
  'nav.logout': { id: 'Keluar', en: 'Logout', bn: 'Keluar' },
  'nav.toApp': { id: 'Ke Aplikasi', en: 'To App', bn: 'Ke Aplikasi' },

  'download.title': { id: 'Unduh Aplikasi', en: 'Download the App', bn: 'Muat Turun Aplikasi' },
  'download.webApp': { id: 'Buka Web App', en: 'Open Web App', bn: 'Buka Aplikasi Web' },
  'download.android': { id: 'Unduh APK Android', en: 'Download Android APK', bn: 'Muat Turun APK Android' },
  'download.androidDesc': {
    id: 'Sideload langsung jika artifact rilis tersedia.',
    en: 'Direct sideload when the release artifact is available.',
    bn: 'Pasang terus jika artifact rilis tersedia.',
  },
  'download.webDesc': {
    id: 'Akses langsung lewat browser, tanpa install.',
    en: 'Access directly from your browser, no install.',
    bn: 'Akses terus dari pelayar, tanpa pasang.',
  },
};
