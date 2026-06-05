import type { BrewPlan } from './types';

export function isIndonesianAiBrewLanguage(language?: string) {
  return /^id(?:-|$)/i.test((language || '').trim());
}

function formatBaristaRatio(value: number) {
  if (!Number.isFinite(value)) return '--';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatBaristaTemperature(value: number) {
  if (!Number.isFinite(value)) return '--';
  return String(Math.round(value));
}

export function localizeAiBrewTargetProfile(
  targetProfileId: string,
  fallbackLabel: string,
  language?: string,
) {
  if (!isIndonesianAiBrewLanguage(language)) return fallbackLabel;

  switch (targetProfileId) {
    case 'balance_clean':
      return 'Seimbang & Bersih';
    case 'more_sweetness':
      return 'Lebih Manis';
    case 'more_acidity':
      return 'Lebih Cerah';
    case 'more_body':
      return 'Body Lebih Tebal';
    case 'floral_transparent':
      return 'Floral & Transparan';
    case 'fruit_forward':
      return 'Dominan Buah (Fruit-Forward)';
    case 'soft_round':
      return 'Lembut & Halus (Smooth)';
    case 'dense_comforting':
      return 'Tebal & Nyaman (Comforting)';
    default:
      return fallbackLabel;
  }
}

export function localizeAiBrewStageLabel(stageId: string, language?: string) {
  if (!isIndonesianAiBrewLanguage(language)) return null;

  switch (stageId) {
    case 'validate_input':
      return 'Validasi Input';
    case 'match_device_profile':
      return 'Cocokkan Profil Alat';
    case 'resolve_grinder_settings':
      return 'Cari Setting Grinder';
    case 'compute_brew_variables':
      return 'Hitung Variabel Seduh';
    case 'build_sequence':
      return 'Susun Urutan Seduh';
    case 'hybrid_ai_sequence':
      return 'Kalibrasi Sequence AI';
    case 'run_standards_checks':
      return 'Jalankan Cek Standar';
    default:
      return null;
  }
}

export function localizeAiBrewRoastLabel(roastLevel: string, language?: string) {
  if (!isIndonesianAiBrewLanguage(language)) return roastLevel;

  switch (roastLevel) {
    case 'light':
      return 'Light';
    case 'medium_light':
      return 'Medium-Light';
    case 'medium':
      return 'Medium';
    case 'medium_dark':
      return 'Medium-Dark';
    case 'dark':
      return 'Dark';
    default:
      return roastLevel;
  }
}

export function localizeAiBrewStepLabel(label: string, language?: string) {
  const normalized = label.trim().toLowerCase();

  if (!isIndonesianAiBrewLanguage(language)) {
    switch (normalized) {
      case 'tuang utama':
        return 'Main Pour';
      case 'tuang tengah':
        return 'Center Pour';
      case 'tuang kedua':
        return 'Second Pour';
      case 'tuang ketiga':
        return 'Third Pour';
      case 'tuang akhir':
        return 'Final Pour';
      case 'tuang akhir target panas':
        return 'Finish to Hot-Water Target';
      case 'bilas, panaskan, set katup':
        return 'Rinse, Preheat, Set Valve';
      case 'panaskan alat':
        return 'Preheat Brewer';
      case 'basahi merata':
        return 'Even Saturation';
      case 'rendam dingin':
        return 'Cold Steep';
      case 'filter atau tuang pisah':
        return 'Filter or Decant';
      case 'tekan pelan':
        return 'Gentle Press';
      case 'dilusi setelah filter':
        return 'Dilute After Filtering';
      case 'isi air':
        return 'Charge Water';
      case 'aduk':
        return 'Stir';
      case 'aduk ringan':
        return 'Light Stir';
      case 'aduk / putar':
        return 'Stir or Swirl';
      case 'rendam':
        return 'Steep';
      case 'tekan':
        return 'Press';
      case 'tekan sampai selesai':
        return 'Press Through';
      case 'berhenti sebelum hiss':
      case 'berhenti sebelum desis':
        return 'Stop Before Hiss';
      case 'buka katup':
        return 'Release';
      case 'buka katup di atas es':
        return 'Release Over Ice';
      case 'air turun':
        return 'Drawdown';
      case 'panaskan':
        return 'Heat';
      case 'mulai seduh':
        return 'Start Brew';
      case 'ekstraksi':
        return 'Extract';
      case 'sajikan':
        return 'Serve';
      case 'tuang pisah':
        return 'Decant';
      case 'dilusi':
        return 'Dilute';
      case 'endapkan':
        return 'Settle';
      case 'saring':
        return 'Filter';
      case 'berhenti':
        return 'Stop';
      case 'tuangan lambat kontinu':
        return 'Continuous Slow Pour';
      case 'tuangan konsentris 1':
        return 'Concentric Pour 1';
      case 'tuangan konsentris 2':
        return 'Concentric Pour 2';
      case 'tuangan konsentrat 1':
        return 'Concentrate Pour 1';
      case 'tuangan konsentrat 2':
        return 'Concentrate Pour 2';
      default:
        return label;
    }
  }

  switch (normalized) {
    case 'bloom':
      return 'Bloom';
    case 'preheat':
      return 'Panaskan Alat';
    case 'rinse and preheat':
      return 'Bilas & Panaskan';
    case 'setup':
      return 'Persiapan';
    case 'charge water':
      return 'Isi Air';
    case 'stir':
      return 'Aduk';
    case 'stir or swirl':
      return 'Aduk / Putar (Swirl)';
    case 'main pour':
      return 'Tuang Utama';
    case 'center pour':
      return 'Tuang Tengah';
    case 'mid pour':
    case 'middle pour':
      return 'Tuang Tengah';
    case 'first pulse':
    case 'pulse one':
    case 'pulse 1':
      return 'Pulse Pertama';
    case 'second pulse':
    case 'pulse two':
    case 'pulse 2':
      return 'Pulse Kedua';
    case 'third pulse':
    case 'pulse three':
    case 'pulse 3':
      return 'Pulse Ketiga';
    case 'second pour':
      return 'Tuang Kedua';
    case 'third pour':
      return 'Tuang Ketiga';
    case 'final pour':
      return 'Tuang Akhir';
    case 'finish to hot-water target':
      return 'Target Akhir Air Panas';
    case 'finish':
      return 'Selesai';
    case 'charge':
      return 'Isi Air';
    case 'steep':
      return 'Rendam (Steep)';
    case 'press':
    case 'press gently':
      return 'Tekan';
    case 'stop before hiss':
      return 'Hentikan Sebelum Desis (Hiss)';
    case 'release':
    case 'release checkpoint':
      return 'Buka Katup';
    case 'release over ice':
      return 'Buka Katup di Atas Es';
    case 'drawdown':
      return 'Air Turun';
    case 'heat':
      return 'Panaskan';
    case 'start brew':
      return 'Mulai Seduh';
    case 'extract':
      return 'Ekstraksi';
    case 'serve':
      return 'Sajikan';
    case 'decant':
      return 'Tuang Pisah (Decant)';
    case 'dilute':
      return 'Bypass (Dilusi)';
    case 'settle':
      return 'Endapkan';
    case 'filter':
      return 'Saring';
    case 'stop':
      return 'Berhenti';
    case 'pulse 4':
    case 'pulse_4':
      return 'Pulse Keempat';
    case 'continuous slow pour':
    case 'continuous_slow_pour':
      return 'Tuangan Lambat Kontinu';
    case 'concentric pour 1':
    case 'concentric_pour_1':
      return 'Tuangan Konsentris 1';
    case 'concentric pour 2':
    case 'concentric_pour_2':
      return 'Tuangan Konsentris 2';
    case 'concentrate pour 1':
    case 'concentrate_pour_1':
      return 'Tuangan Konsentrat 1';
    case 'concentrate pour 2':
    case 'concentrate_pour_2':
      return 'Tuangan Konsentrat 2';
    default:
      return label;
  }
}

export function localizeAiBrewWaterStyle(styleLabel: string, language?: string) {
  if (!isIndonesianAiBrewLanguage(language)) return styleLabel;

  switch (styleLabel.trim().toLowerCase()) {
    case 'balanced mineral input':
      return 'Mineral air seimbang';
    case 'soft / low buffer water':
      return 'Air lunak / buffer rendah';
    case 'hard / buffered water':
      return 'Air keras / buffer tinggi';
    case 'low-tds water':
      return 'Air TDS rendah';
    case 'high-tds water':
      return 'Air TDS tinggi';
    default:
      return styleLabel;
  }
}

export function localizeAiBrewWaterClassificationLabel(label: string, language?: string) {
  if (!isIndonesianAiBrewLanguage(language)) return label;

  switch (label.trim().toLowerCase()) {
    case 'zero mineral / ro':
      return 'Nol mineral / RO';
    case 'low-mineral clarity':
      return 'Mineral rendah / clean';
    case 'demineral direct experiment':
      return 'Eksperimen demineral';
    case 'alkaline caution':
      return 'Waspada alkalin';
    case 'high buffer':
      return 'Buffer tinggi';
    case 'body builder':
      return 'Pendorong body';
    case 'soft-balanced':
      return 'Lunak seimbang';
    case 'balanced':
      return 'Seimbang';
    case 'estimated baseline':
      return 'Estimasi awal';
    default:
      return label;
  }
}

function localizeBeanProfileSummary(text: string) {
  return text
    .replace(/\bunderdeveloped\b/gi, 'kurang develop')
    .replace(/\bbalanced\b/gi, 'seimbang')
    .replace(/\bdeveloped\b/gi, 'lebih develop')
    .replace(/\blow\b/gi, 'rendah')
    .replace(/\bmedium\b/gi, 'sedang')
    .replace(/\bhigh\b/gi, 'tinggi')
    .replace(/\s+(?:\u00c3\u0082\u00c2\u00b7|\u00c2\u00b7|\u00b7)\s+/g, ' \u00b7 ');
}

function localizeCriticalUiTerms(text: string) {
  return text
    .replace(/\bAdditional details\b/gi, 'Detail Tambahan')
    .replace(/\bBrew Guide\b/gi, 'Panduan Seduh')
    .replace(/\bWorkflow\b/gi, 'Alur Seduh')
    .replace(/\bExpected cup\b/gi, 'Prediksi Seduhan')
    .replace(/\bConfidence\b/gi, 'Tingkat Keyakinan')
    .replace(/\bSafety\b/gi, 'Keamanan')
    .replace(/\bRelease over ice\b/gi, 'Buka Katup di Atas Es')
    .replace(/\bRelease checkpoint\b/gi, 'Titik Buka Katup')
    .replace(/\bRelease\b/gi, 'Buka Katup')
    .replace(/\bDrawdown\b/gi, 'Air Turun')
    .replace(/\bBlocked\b/gi, 'Diblokir')
    .replace(/\bUnknown fallback\b/gi, 'Estimasi Baseline')
    .replace(/\bKnown high\b/gi, 'Terverifikasi Penuh')
    .replace(/\bPartial medium\b/gi, 'Terverifikasi Sebagian')
    .replace(/\bManual Required\b/gi, 'Perlu Manual')
    .replace(/\bHigh Buffer\b/gi, 'Buffer Tinggi')
    .replace(/\bZero Mineral\b/gi, 'Nol Mineral')
    .replace(/\bTaste feedback required\b/gi, 'Perlu Cek Rasa')
    .replace(/\bExtraction complete\b/gi, 'Ekstraksi Selesai')
    .replace(/\bNext step\b/gi, 'Langkah Berikutnya')
    .replace(/\bFinishing action\b/gi, 'Sentuhan Akhir')
    .replace(/\bServe step\b/gi, 'Langkah Penyajian')
    .replace(/\bStir server\b/gi, 'Aduk wadah saji')
    .replace(/\bTarget profile\b/gi, 'Profil Target')
    .replace(/\bWater source\b/gi, 'Sumber Air')
    .replace(/\bGrinder source\b/gi, 'Sumber Grinder')
    .replace(/\bBrewer profile\b/gi, 'Profil Alat')
    .replace(/\bFallback grinder\b/gi, 'Grinder Baseline')
    .replace(/\bFamily fallback profile\b/gi, 'Profil Keluarga Alat')
    .replace(/\bFamily fallback\b/gi, 'Profil Keluarga Alat')
    .replace(/\bFallback family\b/gi, 'Profil Keluarga Alat')
    .replace(/\bExact device profile\b/gi, 'Profil Alat Presisi')
    .replace(/\bRisk caution\b/gi, 'Peringatan Risiko')
    .replace(/\bSafe baseline\b/gi, 'Baseline Aman')
    .replace(/\bBrew plan\b/gi, 'Rencana Seduh')
    .replace(/\bRecipe\b/gi, 'Resep')
    .replace(/\bManual required\b/gi, 'Perlu Manual')
    .replace(/\bPublished\b/gi, 'Tersedia')
    .replace(/\bbrew-ready\b/gi, 'siap seduh')
    .replace(/\bNot available\b/gi, 'Belum Tersedia')
    .replace(/\bNo data\b/gi, 'Belum Ada Data')
    .replace(/\bWarning\b/gi, 'Peringatan')
    .replace(/\bReady\b/gi, 'Siap')
    .replace(/\bOfficial\b/gi, 'Resmi')
    .replace(/\bCurated\b/gi, 'Kurasi')
    .replace(/\bEstimated\b/gi, 'Estimasi')
    .replace(/\bUnknown\b/gi, 'Belum Diketahui')
    .replace(/\bGuide\b/gi, 'Panduan')
    .replace(/\btaste feedback\b/gi, 'evaluasi rasa')
    .replace(/\btaste\b/gi, 'rasa')
    .replace(/\bvalidate with\b/gi, 'validasi dengan')
    .replace(/\bStop\b/gi, 'Berhenti')
    .replace(/\bServe\b/gi, 'Sajikan')
    .replace(/\bStir\b/gi, 'Aduk');
}

function polishIndonesianBaristaCopy(text: string) {
  return text
    .replace(/\bPut measured ice in the\b/gi, 'Masukkan es terukur ke')
    .replace(/\bPut ice in the\b/gi, 'Masukkan es ke')
    .replace(/\bwet the\b/gi, 'basahi')
    .replace(/\band keep the\b/gi, 'dan jaga')
    .replace(/\bcalm during\b/gi, 'tetap tenang selama')
    .replace(/\bUse short pulses and avoid\b/gi, 'Gunakan pulse pendek dan hindari')
    .replace(/\bunsafe combination\b/gi, 'kombinasi tidak aman')
    .replace(/\bUnknown bean\b/gi, 'Bean belum diketahui')
    .replace(/\bincomplete data\b/gi, 'data belum lengkap')
    .replace(/\bnot enough data\b/gi, 'data belum cukup')
    .replace(/\bhigh confidence\b/gi, 'keyakinan tinggi')
    .replace(/\bmanual verification\b/gi, 'verifikasi manual')
    .replace(/\bmanual minerals\b/gi, 'mineral manual')
    .replace(/\bbrew plan\b/gi, 'rencana seduh')
    .replace(/\bdeterministic plan\b/gi, 'rencana deterministik')
    .replace(/\bplan timing\b/gi, 'jadwal rencana')
    .replace(/\btiming plan\b/gi, 'jadwal rencana')
    .replace(/\bworkflow\b/gi, 'alur')
    .replace(/\bstop cue\b/gi, 'tanda berhenti')
    .replace(/\bshot\b/gi, 'ekstraksi espresso')
    .replace(/\byield\b/gi, 'hasil ekstraksi')
    .replace(/\bdose\b/gi, 'dosis')
    .replace(/\bgrind\b/gi, 'gilingan')
    .replace(/\bcupping\b/gi, 'uji rasa')
    .replace(/\bknob\b/gi, 'variabel')
    .replace(/\bExtend steep contact time before release\b/gi, 'Perpanjang waktu rendam sebelum buka katup')
    .replace(/\bthen stir\b/gi, 'lalu aduk')
    .replace(/\bthen Aduk\b/gi, 'lalu aduk')
    .replace(/\bstir\b/gi, 'aduk')
    .replace(/\bpaper-filtered\b/gi, 'disaring kertas')
    .replace(/\bpaper filter\b/gi, 'filter kertas')
    .replace(/\bfilter paper\b/gi, 'filter kertas')
    .replace(/\bpaper\b/gi, 'kertas')
    .replace(/\bbrewer\/server\b/gi, 'alat seduh/wadah saji')
    .replace(/\bbrewer\b/gi, 'alat seduh')
    .replace(/\bcarafe\b/gi, 'wadah saji')
    .replace(/\bserver\b/gi, 'wadah saji')
    .replace(/\bupper chamber\b/gi, 'ruang atas')
    .replace(/\bbrew chamber\b/gi, 'ruang seduh')
    .replace(/\bchamber\b/gi, 'ruang seduh')
    .replace(/\bdry pocket\b/gi, 'bagian bubuk yang masih kering')
    .replace(/\bflat[-\s]?bottom bed\b/gi, 'hamparan flat-bottom')
    .replace(/\bflat bed\b/gi, 'hamparan flat-bottom')
    .replace(/\bcoffee bed\b/gi, 'hamparan kopi')
    .replace(/\bbed kopi\b/gi, 'hamparan kopi')
    .replace(/\bbed\b/gi, 'hamparan kopi')
    .replace(/\bslurry\b/gi, 'campuran kopi')
    .replace(/\bdrawdown\b/gi, 'air turun')
    .replace(/\brelease checkpoint\b/gi, 'titik buka katup')
    .replace(/\brelease\b/gi, 'buka katup')
    .replace(/\bvalve\b/gi, 'katup')
    .replace(/\bflow rate\b/gi, 'laju tuang')
    .replace(/\bflow\b/gi, 'aliran')
    .replace(/\bflooding\b/gi, 'air menggenang')
    .replace(/\bfines\b/gi, 'partikel halus')
    .replace(/\bpuck\b/gi, 'padatan kopi')
    .replace(/\broom temp(?:erature)?\b/gi, 'suhu ruang')
    .replace(/\bpre-wet\b/gi, 'pra-basah')
    .replace(/\bLet bloom\b/gi, 'Biarkan blooming')
    .replace(/\blet bloom\b/gi, 'biarkan blooming')
    .replace(/\bbloom phase\b/gi, 'fase blooming')
    .replace(/\bLoad\b/gi, 'Muatan')
    .replace(/\bload\b/gi, 'muatan')
    .replace(/\bsec\b/gi, 'detik')
    .replace(/\bseconds\b/gi, 'detik')
    .replace(/\bsteep\b/gi, 'rendam')
    .replace(/\bpress\b/gi, 'tekan')
    .replace(/\bhissing\b/gi, 'desis')
    .replace(/\bhiss\b/gi, 'desis')
    .replace(/\bheat\b/gi, 'panas')
    .replace(/\bsputter\b/gi, 'semburan akhir')
    .replace(/\bdecanting\b/gi, 'tuang pisah')
    .replace(/\bdecant\b/gi, 'tuang pisah')
    .replace(/\bsettle\b/gi, 'mengendap')
    .replace(/\bpulses\b/gi, 'tuangan bertahap')
    .replace(/\bpulse\b/gi, 'tuangan bertahap')
    .replace(/\bstream\b/gi, 'aliran')
    .replace(/\bcharge\b/gi, 'isi air')
    .replace(/\bmeasured\b/gi, 'terukur')
    .replace(/\bbuild pour\b/gi, 'tuangan pembentuk')
    .replace(/\bwall flow\b/gi, 'aliran dinding filter')
    .replace(/\bflat[-\s]?bottom\b/gi, 'alas datar')
    .replace(/\bconcentrate\b/gi, 'konsentrat')
    .replace(/\bbrewing\b/gi, 'penyeduhan')
    .replace(/\bstep\b/gi, 'tingkat')
    .replace(/\bfinish\b/gi, 'akhir')
    .replace(/\bclean akhir\b/gi, 'akhir rasa bersih')
    .replace(/\bopen akhir\b/gi, 'fase terbuka akhir')
    .replace(/\bclosed capture\b/gi, 'fase tertutup')
    .replace(/\bcapture\b/gi, 'menangkap')
    .replace(/\bclosed\b/gi, 'tertutup')
    .replace(/\bopen\b/gi, 'terbuka')
    .replace(/\bmuddy\b/gi, 'keruh')
    .replace(/\bservice\b/gi, 'saji')
    .replace(/\bfeedback\b/gi, 'evaluasi rasa')
    .replace(/\bcontact time\b/gi, 'waktu kontak')
    .replace(/\bcontact\b/gi, 'kontak')
    .replace(/\bbaseline\b/gi, 'titik awal')
    .replace(/\bmodifier\b/gi, 'penyesuaian')
    .replace(/\bfamily\b/gi, 'keluarga')
    .replace(/\bexact\b/gi, 'presisi')
    .replace(/\bmanual\b/gi, 'manual')
    .replace(/\bbrand\b/gi, 'brand')
    .replace(/\bimmersion\b/gi, 'rendaman')
    .replace(/\bclean cup\b/gi, 'cangkir bersih')
    .replace(/\bhigh[-\s]?clarity\b/gi, 'kejernihan tinggi')
    .replace(/\bclarity\b/gi, 'kejernihan')
    .replace(/\btransparency\b/gi, 'transparansi')
    .replace(/\bsweetness\b/gi, 'rasa manis')
    .replace(/\bfinal beverage\b/gi, 'minuman akhir')
    .replace(/\bside-channeling\b/gi, 'jalur samping')
    .replace(/\bwall-rinse\b/gi, 'bilasan dinding filter')
    .replace(/\bcenter-to-mid\b/gi, 'pusat-ke-tengah')
    .replace(/\bspray pattern\b/gi, 'pola semprotan')
    .replace(/\bspray head\b/gi, 'kepala semprot')
    .replace(/\bwater spray\b/gi, 'semprotan air')
    .replace(/\bmesh\b/gi, 'saringan')
    .replace(/\bcap\b/gi, 'tutup')
    .replace(/\bcup\b/gi, 'cangkir')
    .replace(/\biced\b/gi, 'es')
    .replace(/\bAir Turun\b/g, 'air turun')
    .replace(/\bBuka Katup\b/g, 'buka katup')
    .replace(/\bAduk\b/g, 'aduk')
    .replace(/\bbefore saji\b/gi, 'sebelum disajikan')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function localizeAiBrewDynamicText(text: string, language?: string) {
  if (!isIndonesianAiBrewLanguage(language)) return text;

  const normalized = text
    .replace(/^Unknown Origin$/i, 'Asal Tidak Diketahui')
    .replace(/^No bean-profile modifier active\.$/i, 'Belum ada modifier profil bean yang aktif.')
    .replace(/^Manual mineral input is active for this brew plan\.$/i, 'Input mineral manual aktif untuk brew plan ini.')
    .replace(/^Low-TDS water may need a touch more thermal energy\.$/i, 'Air dengan TDS rendah mungkin butuh sedikit tambahan energi panas.')
    .replace(/^Add water in stages and make sure the coarse bed is fully wet before the long steep starts\.$/i, 'Masukkan air bertahap sampai seluruh bubuk kasar basah merata sebelum rendam panjang dimulai.')
    .replace(/^Leave the vessel covered at the planned temperature; strength comes from time, not stirring\.$/i, 'Tutup wadah sesuai suhu rencana; kekuatan rasa dibangun dari waktu rendam, bukan dari adukan berulang.')
    .replace(/^Separate the concentrate from the grounds first, then dilute or serve over ice after the extraction is stopped\.$/i, 'Pisahkan konsentrat dari ampas terlebih dulu, lalu dilusi atau sajikan di atas es setelah ekstraksi berhenti.')
    .replace(/^Filter cleanly first, then dilute or serve only after the grounds are separated\.$/i, 'Saring sampai bersih terlebih dulu, lalu dilusi atau sajikan hanya setelah ampas terpisah.')
    .replace(/^Filter cleanly\.$/i, 'Saring sampai bersih.')
    .replace(/^This lighter dose needs cleaner contact and shorter idle gaps between checkpoints\.$/i, 'Dosis yang lebih ringan butuh kontak lebih rapi dan jeda antartahap yang tidak terlalu panjang.')
    .replace(/^Higher-TDS water can read fuller and heavier with the same brew settings\.$/i, 'Air dengan TDS lebih tinggi bisa terasa lebih penuh dan berat pada setting seduh yang sama.')
    .replace(/^Water hardness is below the recommended band\.$/i, 'Hardness air berada di bawah rentang rekomendasi.')
    .replace(/^Water hardness is above the recommended band\.$/i, 'Hardness air berada di atas rentang rekomendasi.')
    .replace(/^Water alkalinity is below the recommended band\.$/i, 'Alkalinitas air berada di bawah rentang rekomendasi.')
    .replace(/^Water alkalinity is above the recommended band\.$/i, 'Alkalinitas air berada di atas rentang rekomendasi.')
    .replace(/^Alkaline water can mute acidity; verify manually before treating it as filter friendly\.$/i, 'Air alkaline bisa meredam acidity. Verifikasi manual sebelum dianggap aman untuk seduh filter.')
    .replace(/^Alkaline water can mute acidity\. Verify manually before treating it as filter friendly\.$/i, 'Air alkaline bisa meredam acidity. Verifikasi manual sebelum dianggap aman untuk seduh filter.')
    .replace(/^High alkalinity\/buffer can mute acidity and flatten floral coffees\. Use lower contact time or choose manual minerals for delicate beans\.$/i, 'Alkalinity/buffer tinggi bisa meredam acidity dan membuat kopi floral terasa datar. Pakai contact time lebih rendah atau pilih manual minerals untuk bean yang delicate.')
    .replace(/^High buffer can mute acidity and flatten floral coffees\.$/i, 'Buffer tinggi bisa meredam acidity dan membuat kopi floral terasa datar.')
    .replace(/^Process not specified\. No automatic process modifier was applied\.$/i, 'Proses belum ditentukan. Tidak ada modifier proses otomatis yang dipakai.')
    .replace(/^Variety not specified\. No automatic variety modifier was applied\.$/i, 'Varietas belum ditentukan. Tidak ada modifier varietas otomatis yang dipakai.')
    .replace(/^Wet-hulled Indonesian cue: Dense & Comforting suggested\.$/i, 'Cue wet-hulled Indonesia: Tebal & Nyaman disarankan.')
    .replace(/^Canephora\/non-arabica body cue: Dense & Comforting suggested\.$/i, 'Cue body canephora/non-arabica: Tebal & Nyaman disarankan.')
    .replace(/^High-clarity variety cue: Floral & Transparent suggested\.$/i, 'Cue varietas berkejernihan tinggi: Floral & Transparan disarankan.')
    .replace(/^Washed high-altitude cue: Floral & Transparent suggested\.$/i, 'Cue washed dataran tinggi: Floral & Transparan disarankan.')
    .replace(/^Experimental high-variability process cue: Fruit-Forward suggested\.$/i, 'Cue proses eksperimental variabilitas tinggi: Buah Lebih Menonjol disarankan.')
    .replace(/^Natural or high-aroma process cue: Fruit-Forward suggested\.$/i, 'Cue proses natural atau aroma tinggi: Buah Lebih Menonjol disarankan.')
    .replace(/^Sweet\/body cue: Soft & Round suggested\.$/i, 'Cue manis/body: Lembut & Bulat disarankan.')
    .replace(/^Unknown or weak evidence: Balance & Clean suggested\.$/i, 'Bukti lemah/tidak dikenal: Seimbang & Bersih disarankan.')
    .replace(/^High variability process: use taste feedback before increasing extraction pressure\.$/i, 'Proses variabilitas tinggi: pakai feedback rasa sebelum menaikkan tekanan ekstraksi.')
    .replace(/^Sensory taxonomy cue applied as a conservative baseline, not as a fixed flavor claim\.$/i, 'Cue taxonomy sensory dipakai sebagai baseline konservatif, bukan klaim rasa pasti.')
    .replace(/^Exact device profile unavailable; family fallback was used\.$/i, 'Profil alat exact tidak tersedia; fallback family dipakai.')
    .replace(/^Bean profile left neutral; no bean-specific modifier was applied\.$/i, 'Profil bean dibiarkan netral; tidak ada modifier spesifik bean yang dipakai.')
    .replace(/^Process known: (.+)\.$/i, 'Proses diketahui: $1.')
    .replace(/^Variety known: (.+)\.$/i, 'Varietas diketahui: $1.')
    .replace(/^Roast level known: (.+)\.$/i, 'Level sangrai diketahui: $1.')
    .replace(/^Exact brewer profile matched\.$/i, 'Profil alat exact ditemukan.')
    .replace(/^Exact brewer and workflow validation passed\.$/i, 'Profil alat exact dan validasi panduan sudah lolos.')
    .replace(/^Guardrail or workflow validation blocked this combination\.$/i, 'Guardrail atau validasi panduan memblokir kombinasi ini.')
    .replace(/^Safe baseline used with caution flags\.$/i, 'Baseline aman dipakai dengan tanda hati-hati.')
    .replace(/^No process, variety, origin, or bean profile was provided\.$/i, 'Proses, varietas, asal, dan profil bean belum diisi.')
    .replace(/^Some bean detail is missing, so a safe baseline remains active\.$/i, 'Sebagian detail bean belum lengkap, jadi baseline aman tetap aktif.')
    .replace(/^Process high-variability: validate with taste feedback before increasing extraction\.$/i, 'Proses variabilitas tinggi: validasi dengan feedback rasa sebelum menaikkan ekstraksi.')
    .replace(/^Dark roast: protect bitterness with lower extraction pressure\.$/i, 'Sangrai gelap: lindungi dari pahit dengan tekanan ekstraksi lebih rendah.')
    .replace(/^Non-arabica or robusta\/canephora cue: keep bitterness protection active\.$/i, 'Cue non-arabika atau robusta/canephora: tetap aktifkan perlindungan pahit.')
    .replace(/^Water needs caution or manual verification before treating the prediction as high confidence\.$/i, 'Air perlu hati-hati atau verifikasi manual sebelum prediksi dianggap berkeyakinan tinggi.')
    .replace(/^Grinder setting is estimated or fallback; calibrate by drawdown and taste\.$/i, 'Setelan grinder masih estimasi atau fallback; kalibrasi dari air turun dan rasa.')
    .replace(/^Adjust dose, water target, brewer size, or unsafe manual preset before brewing\.$/i, 'Ubah dosis, target air, ukuran alat, atau preset manual yang tidak aman sebelum seduh.')
    .replace(/^Brew the conservative baseline, then use taste feedback before changing dose or ratio\.$/i, 'Seduh baseline konservatif dulu, lalu gunakan feedback rasa sebelum mengubah dosis atau rasio.')
    .replace(/^Use the balanced baseline, then record taste feedback after brewing\.$/i, 'Gunakan baseline seimbang, lalu catat feedback rasa setelah seduh.')
    .replace(/^Brew the plan as a strong starting point; adjust only one variable after tasting\.$/i, 'Seduh plan ini sebagai titik awal kuat; ubah satu variabel saja setelah mencicipi.')
    .replace(/^Add process, variety, roast development, or density to improve accuracy; taste feedback remains the first correction loop\.$/i, 'Tambahkan proses, varietas, development sangrai, atau densitas untuk menaikkan akurasi; feedback rasa tetap jadi koreksi pertama.')
    .replace(/^Water source: manual mineral entry\.$/i, 'Sumber air: input mineral manual.')
    .replace(/^Device profile source: (.+)\.$/i, 'Sumber profil alat: $1.')
    .replace(/^Brewer profile source: (.+)\.$/i, 'Sumber profil alat: $1.')
    .replace(/^Grinder setting source: (.+)\.$/i, 'Sumber setting grinder: $1.')
    .replace(/^Grinder source: (.+)\.$/i, 'Sumber grinder: $1.')
    .replace(/^Extraction complete\. Next step is finishing\.$/i, 'Ekstraksi selesai. Langkah berikutnya adalah sentuhan akhir (finishing).')
    .replace(/^Fallback grinder lowers confidence; validate with drawdown and taste\.$/i, 'Grinder baseline menurunkan keyakinan; kalibrasi dari air turun dan rasa.')
    .replace(/^Using (.+) family fallback profile\.$/i, 'Menggunakan profil fallback family $1.')
    .replace(/^Bean profile modifiers active: (.+)\.$/i, (_, summary: string) => 'Modifier profil bean aktif: ' + localizeBeanProfileSummary(summary) + '.')
    .replace(/^(.+?) was selected as the brand baseline, then adjusted manually\.$/i, '$1 dipakai sebagai baseline brand lalu disesuaikan manual.')
    .replace(/^(.+?) brand water profile is active for this brew plan\.$/i, 'Profil air brand $1 aktif untuk brew plan ini.')
    .replace(/^(.+?) does not have a full autofill panel in this catalog version\.$/i, '$1 belum punya panel autofill lengkap di versi katalog ini.')
    .replace(/^(.+?) minerals were estimated from the water classification baseline\.$/i, 'Mineral $1 diestimasi dari baseline klasifikasi air.')
    .replace(/^Device profile was generated from the (.+) family template for (.+)\.$/i, 'Profil alat dibuat dari template family $1 untuk $2.')
    .replace(/^Exact device profile matched: (.+)\.$/i, 'Profil alat exact ditemukan: $1.')
    .replace(/^Operator knowledge active: (\d+) matched note\(s\) from the operator knowledge layer\.$/i, 'Knowledge operator aktif: $1 catatan cocok dari layer knowledge operator.')
    .replace(/^AeroPress service floor protects medium and lighter roasts from under-extraction; preheat, then press steadily instead of using a very low kettle temperature\.$/i, 'AeroPress dinaikkan ke suhu aman agar roast medium atau lebih ringan tidak kurang ekstraksi; panaskan ruang seduh, lalu tekan stabil.')
    .replace(/^French Press temperature kept in a calm immersion band so body builds without extracting harsh fines\.$/i, 'Suhu French Press dijaga di rentang immersion yang tenang agar body terbentuk tanpa menarik fines pahit.')
    .replace(/^Delicate Geisha\/Gesha iced profile capped at 92-94.*C to protect floral aroma while keeping Japanese-style concentration\.$/i, 'Profil Geisha/Gesha es dibatasi 92-94\u00b0C agar aroma floral tetap aman sambil menjaga konsentrat Japanese style.')
    .replace(/^Structured Indonesian iced profile uses lower kettle energy so body stays sweet instead of bitter or burnt\.$/i, 'Profil es Indonesia yang body-nya tebal memakai energi kettle lebih rendah agar tetap manis, tidak pahit atau gosong.')
    .replace(/^Washed Colombia on April iced gets a little more kettle energy to lift caramel, red-apple, and citrus sweetness\.$/i, 'Washed Colombia pada April iced diberi sedikit energi kettle tambahan untuk mengangkat caramel, red apple, dan citrus sweetness.')
    .replace(/^Washed Kenya light\/medium-light profile lifted toward 94-96.*C so berry, citrus, and bergamot notes extract clearly\.$/i, 'Washed Kenya light/medium-light diarahkan ke 94-96\u00b0C agar berry, citrus, dan bergamot keluar jelas.')
    .replace(/^Washed Ethiopia\/Yirgacheffe light profile lifted toward 94-96.*C to open citrus, honey, and floral clarity\.$/i, 'Washed Ethiopia/Yirgacheffe light diarahkan ke 94-96\u00b0C untuk membuka citrus, honey, dan floral clarity.')
    .replace(/^Washed Central America light\/medium-light profile nudged toward 93-95.*C for citrus, caramel, and clean sweetness\.$/i, 'Washed Central America light/medium-light diarahkan ke 93-95\u00b0C untuk citrus, caramel, dan clean sweetness.')
    .replace(/^Bright washed highland profile uses a slightly warmer filter envelope so clarity does not turn thin\.$/i, 'Profil washed highland yang bright memakai envelope sedikit lebih panas agar clarity tidak terasa tipis.')
    .replace(/^Barista temperature calibration active: (.+)\.$/i, 'Kalibrasi suhu barista aktif: $1.')
    .replace(/^Water source: (.+) \((.+)\)\.$/i, 'Sumber air: $1 ($2).')
    .replace(/^Knowledge v1 - Gayo: body cenderung tebal dengan aroma rempah yang kuat; jaga ekstraksi cukup rapi agar body tetap manis, tidak pahit, dan tidak keruh\.$/i, 'Knowledge v1 - Gayo: body cenderung tebal dengan aroma rempah yang kuat; jaga ekstraksi cukup rapi agar body tetap manis, tidak pahit, dan tidak keruh.')
    .replace(/^Knowledge v1 - V60: gunakan tuangan spiral atau center-to-mid secara konsisten untuk ekstraksi merata; hindari mengejar dinding filter pada fase akhir\.$/i, 'Knowledge v1 - V60: gunakan tuangan spiral atau center-to-mid secara konsisten untuk ekstraksi merata; hindari mengejar dinding filter pada fase akhir.')
    .replace(/^Brew (\d+(?:\.\d+)?) ml hot over (\d+(?:\.\d+)?) ml\/g ice \((.+)\)\. Final ratio is 1:(\d+(?:\.\d+)?); hot concentrate extracts at 1:(\d+(?:\.\d+)?)\. Keep pours compact to hold sweetness and clarity\.$/i, 'Seduh $1 ml air panas di atas $2 ml/g es ($3). Rasio final 1:$4; konsentrat panas terekstraksi di 1:$5. Jaga tuangan tetap rapat untuk menjaga manis dan kejernihan.')
    .replace(/^Brew (\d+(?:\.\d+)?) ml hot over (\d+(?:\.\d+)?) ml\/g ice \((.+)\)\. Final ratio is 1:(\d+(?:\.\d+)?); hot concentrate extracts at 1:(\d+(?:\.\d+)?)\. Keep pours compact to hold sweetness and clarity, then stir the chilled server after drawdown so service is not confused with another brew step\.$/i, 'Seduh $1 ml air panas di atas $2 ml/g es ($3). Rasio final 1:$4; konsentrat panas terekstraksi di 1:$5. Jaga tuangan tetap rapat, lalu aduk server setelah air turun supaya tahap saji tidak terlihat seperti langkah seduh tambahan.')
    .replace(/^Brew (\d+(?:\.\d+)?) ml hot over (\d+(?:\.\d+)?) ml\/g ice \((.+)\)\. Keep pours compact to hold sweetness and clarity\.$/i, 'Seduh $1 ml air panas di atas $2 ml/g es ($3). Jaga tuangan tetap rapat untuk menjaga manis dan kejernihan.')
    .replace(/^Iced split source: final beverage ratio 1:(\d+(?:\.\d+)?), hot extraction ratio 1:(\d+(?:\.\d+)?), hot\/ice (.+)\.$/i, 'Sumber split seduh es: rasio final 1:$1, rasio ekstraksi 1:$2, panas/es $3.')
    .replace(/^Use the full (\d+(?:\.\d+)?) ml as brew water and keep kettle near (\d+(?:\.\d+)?).*C with calm, center-focused pours\.$/i, 'Gunakan penuh $1 ml sebagai air seduh dan jaga kettle di sekitar $2\u00b0C dengan tuangan tenang yang fokus ke tengah.');

  const localized = normalized
    .replace(/^No verified setting yet\. Start near (.+) and bias (.+)\.$/i, 'Belum ada setting terverifikasi. Mulai di sekitar $1 lalu arahkan ke $2.')
    .replace(/^(.+?) target protects acidity and clarity\.$/i, 'Target $1 menjaga keasaman dan kejernihan.')
    .replace(/^(.+?) target pushes sweetness before body\.$/i, 'Target $1 mendorong rasa manis sebelum body.')
    .replace(/^(.+?) target favors body with bitterness protection\.$/i, 'Target $1 menaikkan body dengan perlindungan pahit.')
    .replace(/^(.+?) target protects high-aroma fruit expression\.$/i, 'Target $1 menjaga ekspresi buah beraroma tinggi.')
    .replace(/^(.+?) target rounds acidity and keeps sweetness soft\.$/i, 'Target $1 membulatkan keasaman dan menjaga manis tetap lembut.')
    .replace(/^Balance target keeps acidity, sweetness, body, and clarity near baseline\.$/i, 'Target seimbang menjaga keasaman, manis, body, dan kejernihan dekat baseline.')
    .replace(/^Process (.+?) nudges (.+)\.$/i, 'Proses $1 menggeser $2.')
    .replace(/^Variety (.+?) nudges (.+)\.$/i, 'Varietas $1 menggeser $2.')
    .replace(/^(.+?) preset shapes Switch sweetness, clarity, body, and valve timing\.$/i, 'Preset $1 membentuk manis, kejernihan, body, dan timing katup Switch.')
    .replace(/^High-buffer water can mute acidity and floral clarity\.$/i, 'Air buffer tinggi bisa meredam acidity dan kejernihan floral.')
    .replace(/^Zero-mineral\/RO water should not be used without remineralization\.$/i, 'Air nol mineral/RO sebaiknya tidak dipakai tanpa remineralisasi.')
    .replace(/^Water minerals need manual verification before treating this profile as locked\.$/i, 'Mineral air perlu verifikasi manual sebelum profil ini dianggap terkunci.')
    .replace(/^Fallback grinder setting lowers confidence; validate with drawdown and taste\.$/i, 'Setelan grinder fallback menurunkan keyakinan; validasi dengan air turun dan rasa.')
    .replace(/^High-variability process needs taste feedback before stronger extraction changes\.$/i, 'Proses variabilitas tinggi perlu feedback rasa sebelum perubahan ekstraksi yang lebih kuat.')
    .replace(/^Workflow validation did not pass, so sensory prediction is not release-grade\.$/i, 'Validasi panduan belum lolos, jadi prediksi rasa belum siap dipakai.')
    .replace(/^Switch chamber validation is blocked; use the suggested safe programme before brewing\.$/i, 'Validasi ruang Switch diblokir; gunakan program aman yang disarankan sebelum seduh.')
    .replace(/^Switch chamber load is close to the safe limit; treat taste prediction as medium confidence\.$/i, 'Muatan ruang Switch mendekati batas aman; anggap prediksi rasa sebagai keyakinan sedang.')
    .replace(/^Switch preset cup profile is a curated prediction, not a guaranteed result\.$/i, 'Profil rasa preset Switch adalah prediksi kurasi, bukan hasil yang dijamin.')
    .replace(/^Valve closed\. Bloom (\d+(?:\.\d+)?) ml \((\d+(?:\.\d+)?)x dose\); pour gently and avoid aggressive swirling\.$/i, 'Katup tertutup. Bloom $1 ml ($2x dosis); tuang lembut dan jangan swirl keras.')
    .replace(/^Still closed\. Fill slowly to build body; open before it feels heavy or muddy\.$/i, 'Masih tertutup. Isi perlahan untuk body tebal; buka sebelum terasa berat atau muddy.')
    .replace(/^Still closed\. Fill the remaining water gently to promote sweetness and round body\.$/i, 'Masih tertutup. Isi sisa air dengan tenang untuk sweetness dan body bulat.')
    .replace(/^Hold closed contact time; open before flow stalls\.$/i, 'Tahan kontak tertutup secukupnya; buka sebelum flow terasa stall.')
    .replace(/^Open the valve cleanly and let the release drain without extra agitation\.$/i, 'Buka katup sekali, lalu biarkan air turun tanpa aduk ulang.')
    .replace(/^Swirl the server 5-8 seconds to integrate, then serve\. Note if body starts tasting muddy\.$/i, 'Aduk server 5-8 detik lalu sajikan. Catat jika body mulai muddy.')
    .replace(/^Swirl the server 5-8 seconds to integrate, then serve\.$/i, 'Aduk server 5-8 detik lalu sajikan.')
    .replace(/^Still closed\. Raise the chamber load to about (\d+(?:\.\d+)?) ml, then prepare for release\.$/i, 'Masih tertutup. Naikkan muatan ruang sampai sekitar $1 ml, lalu siapkan release.')
    .replace(/^Open the valve before the bed stalls; this keeps the finish clean\.$/i, 'Buka katup sebelum bed melambat berat; ini menjaga finish tetap bersih.')
    .replace(/^Valve open\. Complete the target with a steady center-to-mid pour, avoiding heavy wall-rinse\.$/i, 'Katup terbuka. Selesaikan target dengan jalur pusat-ke-tengah, tanpa wall-rinse berat.')
    .replace(/^Allow the drawdown to complete naturally; do not add extra water\.$/i, 'Biarkan drawdown selesai natural; jangan tambah air di luar target.')
    .replace(/^Valve open\. Bloom cleanly with (\d+(?:\.\d+)?) ml; keep flow low and avoid wall-rinse\.$/i, 'Katup terbuka. Bloom bersih $1 ml; jaga flow rendah dan hindari wall-rinse.')
    .replace(/^Valve open\. Build clarity with a steady stream and minimal agitation\.$/i, 'Tetap terbuka. Bangun clarity dengan aliran stabil dan agitasi minimal.')
    .replace(/^Close the valve briefly to capture late sweetness \((\d+(?:\.\d+)?)\s*ml\)\. Do not hold too long\.$/i, 'Tutup singkat hanya untuk capture sweetness akhir ($1 ml). Jangan tahan terlalu lama.')
    .replace(/^Open the valve early to keep the aroma, acidity, and clarity from being muted by body\.$/i, 'Buka katup lebih awal agar aroma, acidity, dan clarity tidak tertutup body.')
    .replace(/^Swirl the server gently and serve\.$/i, 'Aduk server singkat lalu sajikan.')
    .replace(/^Valve open from the start\. Bloom (\d+(?:\.\d+)?) ml; this is V60 mode, not immersion\.$/i, 'Katup terbuka dari awal. Bloom $1 ml; ini Mode V60, bukan immersion.')
    .replace(/^Keep the valve open and maintain a steady flow to protect clarity\.$/i, 'Jaga katup tetap terbuka dan flow stabil untuk clarity.')
    .replace(/^Complete the target volume with a clean path; do not close the valve\.$/i, 'Selesaikan target dengan jalur bersih; jangan tutup katup.')
    .replace(/^Drawdown naturally; no release checkpoint since the valve is already open\.$/i, 'Drawdown natural; tidak ada titik release karena katup sudah terbuka.')
    .replace(/^Valve closed\. Bloom the hot concentrate with (\d+(?:\.\d+)?) ml; ice is pre-weighed in the server\.$/i, 'Katup tertutup. Bloom konsentrat panas $1 ml; es sudah ditimbang di server.')
    .replace(/^Still closed\. Fill the hot concentrate target up to about (\d+(?:\.\d+)?) ml; do not add hidden bypass\.$/i, 'Masih tertutup. Isi target panas tertutup sampai sekitar $1 ml; jangan tambah bypass tersembunyi.')
    .replace(/^Open the valve and release the hot concentrate directly over the ice in the server\.$/i, 'Buka katup dan release konsentrat panas langsung ke es di server.')
    .replace(/^Valve open\. Pour only up to the hot water target; final volume is hot water \+ ice\.$/i, 'Katup terbuka. Lanjutkan hanya sampai target air panas; final beverage tetap air panas + es.')
    .replace(/^Stir the server 5-8 seconds to integrate concentrate and ice thoroughly\.$/i, 'Aduk 5-8 detik agar konsentrat dan es menyatu.')
    .replace(/^(.+?): MUGEN low-bypass is used with a cleaner open phase to boost clarity without exceeding Mugen capacity\.$/i, '$1: MUGEN low-bypass dipakai dengan fase terbuka lebih bersih agar clarity naik tanpa meniru kapasitas Switch 03.')
    .replace(/^(.+?): MUGEN low-bypass provides focus and body, keeping the 200 ml chamber safe with a conservative hybrid\.$/i, '$1: MUGEN low-bypass memberi fokus dan body, tetapi chamber 200 ml dijaga dengan hybrid konservatif.')
    .replace(/^(.+?): MUGEN low-bypass gives focused sweetness, with a safe hybrid keeping the 200 ml chamber controlled\.$/i, '$1: MUGEN low-bypass memberi sweetness terfokus; hybrid aman menjaga chamber 200 ml tetap terkendali.')
    .replace(/^(.+?): valve open from the start to maximize clarity and transparency\.$/i, '$1: katup terbuka dari awal agar clarity dan transparansi lebih tinggi.')
    .replace(/^(.+?): short closed phase to prevent acidity, aroma, and clarity from being masked by body\.$/i, '$1: fase tertutup dibuat pendek supaya acidity, aroma, dan clarity tidak tertutup body.')
    .replace(/^(.+?): larger bloom and gentle closed contact capturing sweetness without harsh swirling\.$/i, '$1: bloom lebih besar dan kontak tertutup lembut menangkap sweetness tanpa swirl keras.')
    .replace(/^(.+?): longer closed contact to enhance body, keeping chamber loads safe to avoid muddy notes\.$/i, '$1: kontak tertutup lebih panjang menaikkan body, tetapi tetap dibatasi chamber agar tidak muddy.')
    .replace(/^(.+?): medium closed capture preserving fruit sweetness, followed by an open finish to keep it clean\.$/i, '$1: closed capture sedang menjaga fruit sweetness, lalu open finish menjaga bersih.')
    .replace(/^(.+?): closed bloom capturing early sweetness, followed by an open finish to maintain a clean cup\.$/i, '$1: closed bloom menangkap sweetness awal, lalu open finish menjaga clean finish.')
    .replace(/^Full immersion requires closed chamber load of (\d+(?:\.\d+)?) ml, exceeding the safe limit of (\d+(?:\.\d+)?) ml\.$/i, 'Full immersion butuh muatan ruang tertutup $1 ml, melebihi batas aman $2 ml.')
    .replace(/^Keep the closed valve phase at (\d+(?:\.\d+)?) ml or lower; finish with the valve open\.$/i, 'Jaga fase katup tertutup di $1 ml atau lebih rendah; selesaikan dengan katup terbuka.')
    .replace(/^High-buffer water can mute bright notes; open the valve earlier if the cup tastes flat\.$/i, 'Air buffer tinggi bisa meredam rasa cerah; buka katup lebih awal jika cangkir terasa datar.')
    .replace(/^Grinder reference has low confidence; validate the drawdown before shifting recipe numbers\.$/i, 'Referensi grinder masih rendah keyakinan; validasi air turun sebelum mengubah angka resep.')
    .replace(/^Manual preset is less aligned with bright\/floral targets; clarity can drop\. Use Hybrid Bright Clean or V60 Mode for more transparency\.$/i, 'Preset manual kurang selaras dengan target cerah/floral; kejernihan bisa turun. Gunakan Hybrid Bright Clean atau Mode V60 jika ingin lebih transparan.')
    .replace(/^Manual preset is cleaner than the body target; body can taste lighter\. Use Heavy Body only if the chamber capacity is safe\.$/i, 'Preset manual lebih bersih daripada target body; body bisa lebih ringan. Gunakan Heavy Body hanya jika muatan ruang aman.')
    .replace(/^Manual V60 mode is more transparent than the sweet\/round target; sweetness can taste lighter\.$/i, 'Mode V60 manual lebih transparan daripada target manis/bulat; rasa manis bisa lebih ringan.')
    .replace(/^Peak closed chamber load of (\d+(?:\.\d+)?) ml exceeds the safe limit of (\d+(?:\.\d+)?) ml\. Use Switch 03, V60 mode, or a conservative hybrid\.$/i, 'Puncak muatan ruang tertutup $1 ml melebihi batas aman $2 ml. Gunakan Switch 03, Mode V60, atau hybrid konservatif.')
    .replace(/^Peak closed chamber load of (\d+(?:\.\d+)?) ml is close to the safe limit of (\d+(?:\.\d+)?) ml\. Open the valve before the bed stalls\.$/i, 'Puncak muatan ruang tertutup $1 ml mendekati batas aman $2 ml. Buka katup sebelum bed mulai macet.')
    .replace(/^Peak closed chamber load of (\d+(?:\.\d+)?) ml is safe below the limit of (\d+(?:\.\d+)?) ml\.$/i, 'Puncak muatan ruang tertutup $1 ml masih aman di bawah batas $2 ml.')
    .replace(/^No dose matrix row found for this dose in (.+?); use as a conservative starting point\.$/i, '$1 belum punya baris dose matrix untuk dosis ini; gunakan sebagai titik awal konservatif.')
    .replace(/^(.+?) is not safe for (.+?) (.+?): closed chamber load exceeds the safe limit of (\d+(?:\.\d+)?) ml\.$/i, '$1 tidak aman untuk $2 $3: muatan ruang tertutup melewati batas aman $4 ml.')
    .replace(/^(.+?) can be used for (.+?) (.+?), but keep chamber load below (\d+(?:\.\d+)?) ml and open earlier if the flow slows\.$/i, '$1 bisa dipakai untuk $2 $3, tetapi jaga muatan ruang di bawah $4 ml dan buka lebih awal jika flow melambat.')
    .replace(/^(.+?) is safe for (.+?) (.+?); chamber load limit is (\d+(?:\.\d+)?) ml\.$/i, '$1 aman untuk $2 $3; batas muatan ruang $4 ml.')
    .replace(/^Official (.+) reference baseline for pour over style brewing; adjust slightly finer for iced and slightly coarser for larger flat-bottom beds only after taste\.$/i, 'Baseline referensi resmi $1 untuk seduh filter; geser sedikit lebih halus untuk iced dan sedikit lebih kasar untuk flat-bottom besar hanya setelah cek rasa.')
    .replace(/^Finish calmly and let the drawdown stay tidy\.$/i, 'Akhiri dengan tenang dan biarkan air turun tetap rapi.')
    .replace(/^Stop adding water here\. Let the bed finish draining over the measured ice, then stir the server 5-8 seconds before serving\.$/i, 'Berhenti tambah air di sini. Biarkan bed selesai turun di atas es terukur, lalu aduk server 5-8 detik sebelum disajikan.')
    .replace(/^Let drawdown finish over the measured ice; stir the server after the final drips so service stays separate from brewing\.$/i, 'Biarkan air turun selesai di atas es terukur; aduk server setelah tetesan akhir agar tahap saji tetap terpisah dari seduh.')
    .replace(/^Target (\d+(?:\.\d+)?) ml hot water\. Land the final hot-water target only; the ice is intentional bypass, not another pour through the bed\.$/i, 'Target $1 ml air panas. Capai target air panas terakhir saja; es adalah bypass terukur, bukan tuangan tambahan lewat bed.')
    .replace(/^Land the final hot-water target only; the ice is intentional bypass, not another pour through the bed\.$/i, 'Capai target air panas terakhir saja; es adalah bypass terukur, bukan tuangan tambahan lewat bed.')
    .replace(/Stop adding water here\. Let the bed finish draining over the measured ice, then stir the server 5-8 seconds before serving\./i, 'Berhenti tambah air di sini. Biarkan bed selesai turun di atas es terukur, lalu aduk server 5-8 detik sebelum disajikan.')
    .replace(/Let drawdown finish over the measured ice; stir the server after the final drips so service stays separate from brewing\./i, 'Biarkan air turun selesai di atas es terukur; aduk server setelah tetesan akhir agar tahap saji tetap terpisah dari seduh.')
    .replace(/Target (\d+(?:\.\d+)?) ml hot water\. Land the final hot-water target only; the ice is intentional bypass, not another pour through the bed\./i, 'Target $1 ml air panas. Capai target air panas terakhir saja; es adalah bypass terukur, bukan tuangan tambahan lewat bed.')
    .replace(/Land the final hot-water target only; the ice is intentional bypass, not another pour through the bed\./i, 'Capai target air panas terakhir saja; es adalah bypass terukur, bukan tuangan tambahan lewat bed.')
    .replace(/Rinse the paper filter separately, discard rinse water, then put measured ice in the server before dosing coffee\. Bloom with about 2-3x coffee weight and wait 30-45 seconds before the next pour\./i, 'Bilas filter kertas terpisah, buang air bilas, lalu masukkan es terukur ke server sebelum dosis kopi. Bloom sekitar 2-3x berat kopi dan tunggu 30-45 detik sebelum tuangan berikutnya.')
    .replace(/Rinse the thick Chemex paper thoroughly and discard rinse water before dosing coffee\. Bloom with about 2-3x coffee weight and wait 30-45 seconds before building volume\./i, 'Bilas kertas Chemex tebal sampai bersih dan buang air bilas sebelum dosis kopi. Bloom sekitar 2-3x berat kopi dan tunggu 30-45 detik sebelum membangun volume.')
    .replace(/Rinse the paper filter and discard rinse water before dosing coffee\. Bloom with about 2-3x coffee weight and wait 30-45 seconds before the next pour\./i, 'Bilas filter kertas dan buang air bilas sebelum dosis kopi. Bloom sekitar 2-3x berat kopi dan tunggu 30-45 detik sebelum tuangan berikutnya.')
    .replace(/Keep the spout low and use short pulses; if the bed mounds, one gentle swirl or stir after this pour is enough\./i, 'Jaga spout rendah dan gunakan pulse pendek; jika bed menumpuk, satu swirl atau adukan ringan setelah tuangan ini sudah cukup.')
    .replace(/Pour center-to-spiral with a light hand; one small swirl is enough if the bed looks uneven\./i, 'Tuang dari tengah ke spiral dengan ringan; satu swirl kecil cukup jika bed terlihat tidak rata.')
    .replace(/Keep the stream away from the paper wall so the thick filter does not stall or create bypass\./i, 'Jauhkan aliran dari dinding kertas agar filter tebal tidak stall atau membuat bypass.')
    .replace(/Finish at the hot-water target only; let drawdown complete over ice, then stir the server 5-8 seconds before serving\./i, 'Akhiri tepat di target air panas; biarkan air turun selesai di atas es, lalu aduk server 5-8 detik sebelum saji.')
    .replace(/After the last pour, use only a small leveling swirl if needed, then let drawdown finish without wall-rinsing\./i, 'Setelah tuangan terakhir, pakai swirl kecil untuk meratakan jika perlu, lalu biarkan air turun selesai tanpa membilas dinding.')
    .replace(/Use a clean center-to-mid path and avoid wall rinsing\./gi, 'Gunakan jalur tuang bersih dari tengah ke area tengah-luar dan hindari membilas dinding filter.')
    .replace(/Pour through the center first, then widen only enough to wet the full bed; avoid riding the wall so the cone stays clean\./gi, 'Tuang dari tengah dulu, lalu lebarkan secukupnya untuk membasahi seluruh bed; hindari menyusuri dinding agar cone tetap bersih.')
    .replace(/Rinse the paper filter, preheat the brewer\/server, discard rinse water, and tare the scale before dosing coffee\./gi, 'Bilas filter kertas, panaskan brewer/server, buang air bilasan, lalu tara timbangan sebelum memasukkan kopi.')
    .replace(/Bloom with about ([\d.]+)x coffee weight and wait (\d+) seconds before the next pour\./gi, 'Bloom sekitar $1x berat kopi dan tunggu $2 detik sebelum tuangan berikutnya.')
    .replace(/Keep the bloom calm so the cup can build a sweeter middle\./gi, 'Jaga bloom tetap tenang agar rasa manis terbentuk rapi.')
    .replace(/Wet all grounds evenly and let bloom open for (\d+) seconds\./gi, 'Basahi semua bubuk secara merata dan biarkan bloom terbuka selama $1 detik.')
    .replace(/Use a steady center-to-mid path and keep the stream narrow enough to maintain a clear V60 drawdown\./gi, 'Gunakan jalur tengah-ke-mid yang stabil dan jaga aliran tetap sempit agar air turun V60 tetap bersih.')
    .replace(/Hold center-to-mid stream arc to keep percolation tempo repeatable\./gi, 'Jaga lengkung aliran tengah-ke-mid agar tempo perkolasi mudah diulang.')
    .replace(/Start with clean center saturation before widening pour path\./gi, 'Mulai dari saturasi tengah yang bersih sebelum melebarkan jalur tuang.')
    .replace(/Balance clarity and sweetness by holding consistent center-to-mid pour paths\./gi, 'Seimbangkan kejernihan dan manis dengan jalur tuang tengah-ke-mid yang konsisten.')
    .replace(/Preheat the chamber and rinse the paper cap first, then wet the compact bed quickly so contact starts evenly\./i, 'Panaskan ruang seduh dan bilas paper cap dulu, lalu basahi bed yang padat dengan cepat agar kontak mulai merata.')
    .replace(/Press with steady pressure and stop before the final dry hiss so bitterness does not enter the cup\./i, 'Tekan dengan tekanan stabil dan berhenti sebelum hiss kering terakhir agar pahit tidak masuk ke cangkir.')
    .replace(/Use a coarse, even grind and saturate all grounds; leave the slurry quiet after the first wetting\./i, 'Gunakan grind kasar yang merata dan basahi semua bubuk; biarkan slurry tenang setelah basahan pertama.')
    .replace(/Around the late steep window, break the crust gently and skim foam or floating grounds without aggressive stirring\./i, 'Di fase steep akhir, pecah crust pelan dan skim foam atau bubuk mengambang tanpa mengaduk agresif.')
    .replace(/Press slowly, do not squeeze the bed, then decant immediately so extraction stops cleanly\./i, 'Tekan perlahan, jangan memeras bed, lalu tuang pisah segera agar ekstraksi berhenti bersih.')
    .replace(/Rinse the paper and preheat the brewer first, then close the valve before adding coffee and brew water\./i, 'Bilas kertas dan panaskan brewer dulu, lalu tutup katup sebelum menambahkan kopi dan air seduh.')
    .replace(/^Open the bloom evenly and let the cone drain cleanly before the next pour\.$/i, 'Buka bloom secara merata lalu biarkan cone turun bersih sebelum tuangan berikutnya.')
    .replace(/^Push a clean center-to-mid pour and keep the cone walls quiet\.$/i, 'Dorong tuangan bersih dari tengah ke area tengah-luar dan jaga dinding cone tetap tenang.')
    .replace(/^Keep the later V60 phase centered so the cup stays transparent\.$/i, 'Jaga fase akhir V60 tetap di tengah agar cangkir tetap jernih.')
    .replace(/^Finish calmly and let the cone drain without chasing the walls\.$/i, 'Akhiri dengan tenang dan biarkan cone turun tanpa mengejar dinding.')
    .replace(/^Keep the bloom light and even so the faster cone flow stays clean\.$/i, 'Jaga bloom tetap ringan dan merata agar aliran cone yang lebih cepat tetap bersih.')
    .replace(/^Use compact pulses and keep the flow agile through the middle\.$/i, 'Gunakan pulse yang rapat dan jaga aliran tetap lincah di fase tengah.')
    .replace(/^Hold the later middle short and tidy so transparency stays high\.$/i, 'Jaga fase tengah akhir tetap singkat dan rapi agar kejernihan tetap tinggi.')
    .replace(/^Close with a light finishing pour and let the fast drawdown stay clean\.$/i, 'Tutup dengan tuangan akhir yang ringan dan biarkan air turun cepat tetap bersih.')
    .replace(/^Keep the bloom centered and slightly deeper to establish a sweet core\.$/i, 'Jaga bloom tetap di tengah dan sedikit lebih dalam untuk membangun inti rasa manis.')
    .replace(/^Hold a tighter center pour to build sweetness with stable contact time\.$/i, 'Pertahankan tuangan tengah yang lebih rapat untuk membangun manis dengan waktu kontak yang stabil.')
    .replace(/^Carry the late middle with a narrow, steady stream\.$/i, 'Lanjutkan fase tengah akhir dengan aliran sempit dan stabil.')
    .replace(/^Finish narrow and controlled so sweetness stays intact\.$/i, 'Akhiri dengan aliran sempit dan terkontrol agar rasa manis tetap utuh.')
    .replace(/^Wet the flat bed edge to edge, then let it settle level before building the cup\.$/i, 'Basahi flat bed dari tepi ke tepi lalu biarkan rata sebelum membangun cangkir.')
    .replace(/^Keep the flat bed level with even pulses from center to edge\.$/i, 'Jaga flat bed tetap rata dengan pulse merata dari tengah ke tepi.')
    .replace(/^Protect the later middle with flat, even contact across the bed\.$/i, 'Jaga fase tengah akhir dengan kontak yang rata di seluruh bed.')
    .replace(/^Land the final water evenly to keep drawdown flat and tidy\.$/i, 'Letakkan air terakhir secara merata agar air turun tetap rata dan rapi.')
    .replace(/^Open the trapezoid bed evenly so the first drain starts clean and forgiving\.$/i, 'Buka bed trapezoid secara merata agar aliran pertama mulai bersih dan mudah dikendalikan.')
    .replace(/^Keep the middle pours level and measured so the flow stays forgiving\.$/i, 'Jaga tuangan tengah tetap rata dan terukur agar aliran tetap mudah dikendalikan.')
    .replace(/^Carry the later middle with stable, level contact\.$/i, 'Lanjutkan fase tengah akhir dengan kontak yang stabil dan rata.')
    .replace(/^Finish with a tidy, level pour and let the bed drain cleanly\.$/i, 'Akhiri dengan tuangan yang rapi dan rata lalu biarkan bed turun bersih.')
    .replace(/^Use a short, even bloom and avoid excess swirl so the flat bed stays fast\.$/i, 'Gunakan bloom singkat dan merata lalu hindari swirl berlebih agar flat bed tetap cepat.')
    .replace(/^Keep the late pulses quick and even so the cup stays open\.$/i, 'Jaga pulse akhir tetap cepat dan merata agar cangkir tetap terbuka.')
    .replace(/^Finish early and clean; avoid stretching the last phase\.$/i, 'Akhiri lebih cepat dan bersih; hindari memanjangkan fase terakhir.')
    .replace(/^Fully wet the thick filter path and the coffee bed before pushing the next pour\.$/i, 'Basahi jalur filter tebal dan bed kopi sepenuhnya sebelum tuangan berikutnya.')
    .replace(/^Use a steady stream and let the thick filter manage the flow\.$/i, 'Gunakan aliran yang stabil dan biarkan filter tebal mengatur flow.')
    .replace(/^Keep the later middle open and avoid flooding the filter wall\.$/i, 'Jaga fase tengah akhir tetap terbuka dan hindari membanjiri dinding filter.')
    .replace(/^Finish before the filter stalls and let the drawdown stay open\.$/i, 'Akhiri sebelum filter tersendat dan biarkan air turun tetap terbuka.')
    .replace(/^Saturate the full bed evenly and let immersion start building sweetness\.$/i, 'Saturasi seluruh bed secara merata lalu biarkan immersion mulai membangun rasa manis.')
    .replace(/^Use the middle phase to build immersion gently rather than chasing more turbulence\.$/i, 'Gunakan fase tengah untuk membangun immersion dengan tenang, bukan mengejar turbulensi tambahan.')
    .replace(/^Keep the later immersion phase quiet so the release stays clean\.$/i, 'Jaga fase immersion akhir tetap tenang agar buka katup tetap bersih.')
    .replace(/^Open the release cleanly and let the bed drain without stirring the finish\.$/i, 'Buka katup dengan bersih lalu biarkan bed turun tanpa mengaduk fase akhir.')
    // AeroPress Masterclass Styles
    .replace(/^Assemble inverted safely and saturate the coffee bed quickly\.$/i, 'Rakit inverted dengan aman dan basahi bed kopi dengan cepat.')
    .replace(/^Use a stable inverted setup, add water decisively to cover all grounds, and keep the chamber upright-ready\.$/i, 'Gunakan posisi terbalik (inverted) yang stabil, tuang air secara mantap hingga membasahi seluruh bed, dan pastikan chamber siap dibalik.')
    .replace(/^Brew a compact concentrate and keep bypass water separate\.$/i, 'Seduh konsentrat kental yang padat dan pisahkan air bypass.')
    .replace(/^Pour hot water to wet the high-dose bed cleanly; keep bypass water reserved for post-press dilution\.$/i, 'Tuang air panas untuk membasahi kopi dosis tinggi; simpan air bypass untuk diencerkan setelah selesai ditekan.')
    .replace(/^Saturate the full-chamber upright bed edge to edge\.$/i, 'Basahi bed tegak (upright) penuh dari ujung ke ujung.')
    .replace(/^Add water decisively across the slightly coarser bed; no post-brew bypass will be used\.$/i, 'Tuang air mantap ke seluruh bed kopi gilingan sedikit lebih kasar; resep ini tidak menggunakan bypass.')
    .replace(/^Pour swiftly in circles over double rinsed paper filters\.$/i, 'Tuang cepat dengan memutar di atas filter kertas ganda yang sudah dibilas.')
    .replace(/^Use double rinsed paper filters, add water swiftly to wet grounds quickly, and establish high clarity\.$/i, 'Gunakan filter kertas ganda yang dibilas, tuang air dengan cepat agar bed lekas basah, dan bangun kejernihan rasa tinggi.')
    .replace(/^Saturate the fine grounds cleanly and prepare for agitation\.$/i, 'Basahi kopi gilingan halus secara merata dan bersiap untuk adukan.')
    .replace(/^Wet the fine grounds thoroughly, ensuring complete saturation to open high sweet solubility\.$/i, 'Basahi kopi gilingan halus dengan menyeluruh agar kelarutan rasa manis yang tinggi terekstraksi maksimal.')
    .replace(/^Saturate the compact upright bed quickly and evenly\.$/i, 'Basahi bed kopi tegak yang padat secara cepat dan merata.')
    .replace(/^Add water decisively to cover all dry grounds, and let the initial wetting lock down uniform contact\.$/i, 'Tuang air secara mantap untuk menutup seluruh bagian kering, biarkan basahan awal mengunci kontak ekstraksi yang seragam.')
    .replace(/^Stir 4 times to wet grounds, then prepare to seal\.$/i, 'Aduk 4 kali untuk membasahi kopi, lalu bersiap untuk menyegel.')
    .replace(/^Stir thoroughly to integrate all grounds, ensuring complete contact before the flip phase\.$/i, 'Aduk rata untuk menyatukan seluruh bed kopi, pastikan kontak ekstraksi terjadi sempurna sebelum fase pembalikan.')
    .replace(/^Stir vigorously 4-5 times to maximize early extraction\.$/i, 'Aduk kuat 4-5 kali untuk memaksimalkan ekstraksi awal.')
    .replace(/^Use vigorous stirring to push solubility in the compact concentrate, building a sweet, heavy core\.$/i, 'Aduk dengan kuat untuk meningkatkan kelarutan pada konsentrat padat, membangun rasa manis inti yang tebal.')
    .replace(/^Stir gently 2-3 times to settle the full slurry\.$/i, 'Aduk perlahan 2-3 kali untuk meratakan seluruh slurry.')
    .replace(/^Agitate gently to distribute water throughout the deep slurry, avoiding heavy bottom-packing\.$/i, 'Aduk lembut untuk mendistribusikan air ke seluruh slurry yang dalam, hindari kopi menumpuk terlalu padat di bawah.')
    .replace(/^Stir gently exactly 2 times to prevent fines migration\.$/i, 'Aduk perlahan tepat 2 kali untuk mencegah perpindahan partikel halus.')
    .replace(/^Agitate minimally to protect clarity; do not sweep the sides or migrate fine particles\.$/i, 'Lakukan agitasi minimal untuk melindungi kejernihan; jangan mengusap dinding kertas atau memicu perpindahan fines.')
    .replace(/^Stir vigorously 5-6 times to build heavy body\.$/i, 'Aduk kuat 5-6 kali untuk membangun body yang tebal.')
    .replace(/^Use strong circular stirring to build texture and dissolve sweet syrupy compounds\.$/i, 'Aduk memutar dengan kuat untuk membentuk tekstur rasa dan melarutkan senyawa manis yang kental.')
    .replace(/^Stir gently 3 times, then let contact settle\.$/i, 'Aduk perlahan 3 kali, lalu biarkan kontak ekstraksi merata.')
    .replace(/^Agitate in calm circular paths to integrate the slurry, then let contact time build sweet extraction\.$/i, 'Lakukan adukan melingkar yang tenang untuk menyatukan slurry, lalu biarkan waktu kontak membentuk ekstraksi manis.')
    .replace(/^Screw filter cap tightly and prepare to flip securely\.$/i, 'Kencangkan filter cap dan bersiap untuk membalikkan dengan aman.')
    .replace(/^Seal the pre-wet cap, let the inverted slurry steep, and prepare for a decisive flip\.$/i, 'Kunci cap yang sudah dibilas, biarkan slurry inverted terendam tenang, dan bersiaplah membalikkannya secara mantap.')
    .replace(/^Let concentrate steep briefly before the press\.$/i, 'Biarkan konsentrat terendam singkat sebelum ditekan.')
    .replace(/^Maintain compact, high-solubility contact; prepare separate dilution water for later\.$/i, 'Pertahankan kontak kelarutan tinggi yang padat; siapkan air dilusi terpisah untuk langkah akhir.')
    .replace(/^Seal with the plunger and allow a longer immersion steep\.$/i, 'Segel dengan plunger dan biarkan rendaman (immersion) berlangsung lebih lama.')
    .replace(/^Insert the plunger slightly to hold the full-chamber volume; let immersion work longer for sweet depth\.$/i, 'Pasang plunger sedikit untuk menahan volume penuh chamber; biarkan immersion bekerja lebih lama untuk kedalaman rasa manis.')
    .replace(/^Cap to seal and keep the steep window short\.$/i, 'Pasang plunger untuk menyegel dan jaga waktu rendam tetap singkat.')
    .replace(/^Create a vacuum seal quickly, and limit immersion contact time to protect bright acidity\.$/i, 'Buat segel vakum dengan cepat, dan batasi waktu kontak rendam untuk melindungi acidity yang cerah.')
    .replace(/^Seal with the plunger and allow a longer sweet-body immersion\.$/i, 'Segel dengan plunger dan biarkan rendam lebih lama untuk body yang manis.')
    .replace(/^Insert the plunger and extend the steep window so deep caramel and chocolate solubility completes\.$/i, 'Pasang plunger sedikit dan perpanjang waktu rendam agar ekstraksi senyawa karamel dan cokelat yang manis tuntas.')
    .replace(/^Insert the plunger slightly to create a vacuum seal\.$/i, 'Pasang plunger sedikit untuk membuat segel vakum.')
    .replace(/^Create a vacuum seal to prevent premature dripping; steep calmly to hold clear flavor\.$/i, 'Buat segel vakum untuk mencegah kopi menetes sebelum waktunya; rendam tenang untuk menjaga rasa tetap jernih.')
    .replace(/^Flip decisively and press slowly down to the grounds\.$/i, 'Balikkan secara mantap lalu tekan perlahan hingga menyentuh bed kopi.')
    .replace(/^Flip onto the server in one smooth motion, press steadily, and stop before forcing the dry hiss\.$/i, 'Balikkan ke atas server dalam satu gerakan mulus, tekan dengan stabil, dan berhenti sebelum mendesis kering.')
    .replace(/^Press steadily, stop before the hiss, and dilute\.$/i, 'Tekan secara stabil, berhenti sebelum desis, lalu encerkan.')
    .replace(/^Press the concentrate steadily, stop strictly before the hiss, then dilute with reserved bypass water\.$/i, 'Tekan konsentrat kental secara stabil, berhenti tepat sebelum desis, lalu encerkan dengan air bypass terpisah.')
    .replace(/^Remove plunger, press steadily, and drain fully\.$/i, 'Lepas plunger, tekan dengan stabil, dan biarkan tiris sepenuhnya.')
    .replace(/^Uncap, press slowly over 30-40 seconds, and let the full chamber volume drain completely\.$/i, 'Buka plunger, tekan perlahan selama 30-40 detik, dan biarkan seluruh volume chamber turun habis dengan bersih.')
    .replace(/^Press extremely slowly with minimal force, stopping before the hiss\.$/i, 'Tekan sangat perlahan dengan tenaga minimal, berhenti sebelum desis.')
    .replace(/^Press with feather-light pressure over 35-40 seconds, and stop strictly before the hiss to keep lipids locked\.$/i, 'Tekan dengan tekanan sangat ringan selama 35-40 detik, dan berhenti tepat sebelum desis untuk mengunci minyak dan lipid kopi.')
    .replace(/^Press slowly to the very bottom of the puck\.$/i, 'Tekan perlahan hingga ke bagian terbawah bed kopi.')
    .replace(/^Apply firm, stable force down to the absolute bottom of the bed to extract sweet soluble layers\.$/i, 'Berikan tenaga penekanan yang stabil hingga dasar terdalam bed kopi untuk memeras lapisan larutan yang manis.')
    .replace(/^Press steadily and stop at the first hiss\.$/i, 'Tekan secara stabil dan berhenti tepat pada desis pertama.')
    .replace(/^Press steadily over 25-35 seconds, and stop strictly at the first hiss to protect clarity\.$/i, 'Tekan secara stabil selama 25-35 detik, dan berhenti tepat pada desis pertama untuk melindungi kejernihan rasa.')
    // French Press Masterclass Styles
    .replace(/^Pour boiling water swiftly to saturate all coffee grounds\.$/i, 'Tuang air mendidih dengan cepat untuk membasahi seluruh bubuk kopi.')
    .replace(/^Pour boiling water swiftly to wet all grounds cleanly and establish a stable heat retention in the glass chamber\.$/i, 'Tuang air mendidih dengan cepat untuk membasahi kopi secara bersih dan menjaga retensi panas yang stabil pada glass chamber.')
    .replace(/^Pour water in circular motions to saturate the medium-ground bed\.$/i, 'Tuang air dengan gerakan melingkar untuk membasahi bed kopi gilingan sedang.')
    .replace(/^Pour water gently in slow circular paths to wet the medium-ground bed, promoting even wetting before the clean steep phase\.$/i, 'Tuang air secara perlahan dengan gerakan memutar lembut untuk membasahi bed kopi gilingan sedang secara merata sebelum rendaman bersih.')
    .replace(/^Pour water rapidly over the heavy dose to wet the fine grounds\.$/i, 'Tuang air secara cepat ke kopi dosis tinggi untuk membasahi gilingan halus.')
    .replace(/^Pour hot water rapidly to wet the high-dose bed; maintain maximum thermal mass inside the chamber\.$/i, 'Tuang air panas secara cepat untuk membasahi bed dosis tinggi; pertahankan massa termal maksimal di dalam chamber.')
    .replace(/^Pour water gently to promote a round, sweet extraction\.$/i, 'Tuang air secara lembut untuk memicu ekstraksi rasa manis yang bulat.')
    .replace(/^Pour water gently at a slightly lower temperature to promote high sweet solubility without dissolving bitter compounds\.$/i, 'Tuang air perlahan pada suhu sedikit lebih rendah untuk meningkatkan kelarutan manis yang tinggi tanpa mengekstraksi senyawa pahit.')
    .replace(/^Allow the crust to form undisturbed for 4 minutes\.$/i, 'Biarkan kerak kopi (crust) terbentuk tenang tanpa gangguan selama 4 menit.')
    .replace(/^Leave the chamber undisturbed while a thick, aromatic crust of coffee grounds forms at the surface\.$/i, 'Biarkan chamber tenang tanpa gangguan selagi kerak kopi (crust) yang kental dan aromatik terbentuk di permukaan.')
    .replace(/^Steep cleanly while the double filter elements are prepared\.$/i, 'Rendam tenang selagi elemen penyaring ganda disiapkan.')
    .replace(/^Allow full immersion to proceed undisturbed; prepare the double mesh or paper filter insert by pre-wetting with hot water\.$/i, 'Biarkan immersion penuh berlangsung tanpa gangguan; siapkan double mesh atau kertas saring dengan membilasnya terlebih dahulu.')
    .replace(/^Stir vigorously 5-6 times to maximize early extraction strength\.$/i, 'Aduk dengan kuat 5-6 kali untuk memaksimalkan kekuatan ekstraksi awal.')
    .replace(/^Use strong agitation early to break down the dense slurry, maximizing extraction from the concentrated bed\.$/i, 'Lakukan agitasi kuat di awal untuk memecah slurry yang padat, memaksimalkan kekuatan ekstraksi dari bed konsentrat kental.')
    .replace(/^Stir gently exactly 2 times to distribute extraction evenly\.$/i, 'Aduk perlahan tepat 2 kali untuk mendistribusikan ekstraksi secara merata.')
    .replace(/^Stir exactly twice with a light touch to distribute heat and grounds without introducing bitterness\.$/i, 'Aduk tepat dua kali dengan sentuhan ringan untuk meratakan panas dan bubuk kopi tanpa menimbulkan rasa pahit.')
    .replace(/^Stir the crust gently, skim the surface foam and floating oils\.$/i, 'Aduk kerak kopi perlahan, buang busa permukaan dan minyak yang mengapung.')
    .replace(/^Break the crust with 2-3 gentle folds, then skim the remaining light foam and floating oils from the surface to ensure high cup clarity\.$/i, 'Pecahkan kerak (crust) dengan 2-3 adukan lipat lembut, lalu bersihkan sisa busa dan minyak mengapung dari permukaan untuk kejernihan rasa tinggi.')
    .replace(/^Give a light swirl to settle the grounds before placing the plunger\.$/i, 'Goyang memutar (swirl) ringan agar bubuk kopi turun sebelum plunger dipasang.')
    .replace(/^Give a light, gentle swirl to detach grounds from the glass wall and let them settle to the bottom\.$/i, 'Goyang memutar (swirl) lembut untuk melepaskan bubuk kopi dari dinding kaca dan biarkan mengendap ke dasar.')
    .replace(/^Let the thick immersion concentrate develop body and richness\.$/i, 'Biarkan konsentrat rendam yang kental mengembangkan body dan kekayaan rasa.')
    .replace(/^Allow the high-strength immersion slurry to steep, building a syrupy mouthfeel and sweet cocoa structure\.$/i, 'Biarkan slurry immersion berkekuatan tinggi terendam tenang, membentuk mouthfeel seperti sirup dan struktur rasa cokelat manis.')
    .replace(/^Steep quietly to allow sugar compounds to fully dissolve\.$/i, 'Rendam tenang agar senyawa gula terlarut sempurna.')
    .replace(/^Steep quietly; the lower temperature protects sweet caramel and chocolate solubility\.$/i, 'Rendam tenang; suhu yang lebih rendah melindungi kelarutan senyawa manis karamel dan cokelat.')
    .replace(/^Fit plunger and lower it just to touch the liquid surface; decant gently\.$/i, 'Pasang plunger dan turunkan mesh hanya sampai menyentuh permukaan kopi; tuang pisah perlahan.')
    .replace(/^Fit the plunger and lower the mesh just to touch the surface \(do not plunge!\)\. Pour out extremely slowly to prevent churning the settled bed\.$/i, 'Pasang plunger dan turunkan mesh hanya sampai batas permukaan kopi (jangan ditekan!). Tuang pisah sangat perlahan agar bubuk kopi dasar tidak keruh.')
.replace(/^Press down slowly over 30 seconds through the double filter; serve cleanly\.$/i, 'Tekan perlahan selama 30 detik melalui filter ganda; sajikan bersih.')
    .replace(/^Press the double filter down slowly with uniform, light force over 30 seconds, trapping all fines for an ultra-clean finish\.$/i, 'Tekan filter ganda secara perlahan dengan tenaga ringan yang seragam selama 30 detik, menyaring seluruh ampas halus demi hasil akhir yang super bersih.')
    .replace(/^Press firmly to the bottom of the puck, serve as concentrate or bypass\.$/i, 'Tekan mantap hingga ke dasar bed kopi, sajikan sebagai konsentrat kental atau tambahkan bypass.')
    .replace(/^Apply firm, stable force down to the absolute bottom of the coffee puck to extract sweet soluble layers; serve as concentrate or dilute with bypass\.$/i, 'Berikan tenaga penekanan stabil hingga ke dasar bed kopi untuk memeras sisa larutan manis; sajikan kental atau encerkan dengan bypass.')
    .replace(/^Plunge extremely slowly over 30 seconds to avoid fines churning\.$/i, 'Tekan plunger sangat perlahan selama 30 detik untuk menghindari turbulensi partikel halus.')
    .replace(/^Plunge with feather-light force to avoid fines migration, and decant immediately to stop the extraction\.$/i, 'Plunge dengan tenaga sangat ringan untuk menghindari perpindahan ampas halus, lalu tuang pisah segera untuk menghentikan ekstraksi.')
    // Non-anchored substring replacements for Switch and Clever step notes, immersion details, focus cues, and practical cues
    .replace(/Valve closed\. Bloom (\d+(?:\.\d+)?) ml \((\d+(?:\.\d+)?)x dose\); pour gently and avoid aggressive swirling\./gi, 'Katup tertutup. Bloom $1 ml ($2x dosis); tuang lembut dan jangan swirl keras.')
    .replace(/Still closed\. Fill slowly to build body; open before it feels heavy or muddy\./gi, 'Masih tertutup. Isi perlahan untuk body tebal; buka sebelum terasa berat atau muddy.')
    .replace(/Still closed\. Fill the remaining water gently to promote sweetness and round body\./gi, 'Masih tertutup. Isi sisa air dengan tenang untuk sweetness dan body bulat.')
    .replace(/Hold closed contact time; open before flow stalls\./gi, 'Tahan kontak tertutup secukupnya; buka sebelum flow terasa stall.')
    .replace(/Open the valve cleanly and let the release drain without extra agitation\./gi, 'Buka katup sekali, lalu biarkan air turun tanpa aduk ulang.')
    .replace(/Swirl the server 5-8 seconds to integrate, then serve\. Note if body starts tasting muddy\./gi, 'Aduk server 5-8 detik lalu sajikan. Catat jika body mulai muddy.')
    .replace(/Swirl the server 5-8 seconds to integrate, then serve\./gi, 'Aduk server 5-8 detik lalu sajikan.')
    .replace(/Still closed\. Raise the chamber load to about (\d+(?:\.\d+)?) ml, then prepare for release\./gi, 'Masih tertutup. Naikkan muatan ruang sampai sekitar $1 ml, lalu siapkan release.')
    .replace(/Open the valve before the bed stalls; this keeps the finish clean\./gi, 'Buka katup sebelum bed melambat berat; ini menjaga finish tetap bersih.')
    .replace(/Valve open\. Complete the target with a steady center-to-mid pour, avoiding heavy wall-rinse\./gi, 'Katup terbuka. Selesaikan target dengan jalur pusat-ke-tengah, tanpa wall-rinse berat.')
    .replace(/Allow the drawdown to complete naturally; do not add extra water\./gi, 'Biarkan drawdown selesai natural; jangan tambah air di luar target.')
    .replace(/Valve open\. Bloom cleanly with (\d+(?:\.\d+)?) ml; keep flow low and avoid wall-rinse\./gi, 'Katup terbuka. Bloom bersih $1 ml; jaga flow rendah dan hindari wall-rinse.')
    .replace(/Valve open\. Build clarity with a steady stream and minimal agitation\./gi, 'Tetap terbuka. Bangun clarity dengan aliran stabil dan agitasi minimal.')
    .replace(/Close the valve briefly to capture late sweetness \((\d+(?:\.\d+)?)\s*ml\)\. Do not hold too long\./gi, 'Tutup singkat hanya untuk capture sweetness akhir ($1 ml). Jangan tahan terlalu lama.')
    .replace(/Open the valve early to keep the aroma, acidity, and clarity from being muted by body\./gi, 'Buka katup lebih awal agar aroma, acidity, dan clarity tidak tertutup body.')
    .replace(/Swirl the server gently and serve\./gi, 'Aduk server singkat lalu sajikan.')
    .replace(/Valve open from the start\. Bloom (\d+(?:\.\d+)?) ml; this is V60 mode, not immersion\./gi, 'Katup terbuka dari awal. Bloom $1 ml; ini Mode V60, bukan immersion.')
    .replace(/Keep the valve open and maintain a steady flow to protect clarity\./gi, 'Jaga katup tetap terbuka dan flow stabil untuk clarity.')
    .replace(/Complete the target volume with a clean path; do not close the valve\./gi, 'Selesaikan target dengan jalur bersih; jangan tutup katup.')
    .replace(/Drawdown naturally; no release checkpoint since the valve is already open\./gi, 'Drawdown natural; tidak ada titik release karena katup sudah terbuka.')
    .replace(/Valve closed\. Bloom the hot concentrate with (\d+(?:\.\d+)?) ml; ice is pre-weighed in the server\./gi, 'Katup tertutup. Bloom konsentrat panas $1 ml; es sudah ditimbang di server.')
    .replace(/Still closed\. Fill the hot concentrate target up to about (\d+(?:\.\d+)?) ml; do not add hidden bypass\./gi, 'Masih tertutup. Isi target panas tertutup sampai sekitar $1 ml; jangan tambah bypass tersembunyi.')
    .replace(/Open the valve and release the hot concentrate directly over the ice in the server\./gi, 'Buka katup dan release konsentrat panas langsung ke es di server.')
    .replace(/Valve open\. Pour only up to the hot water target; final volume is hot water \+ ice\./gi, 'Katup terbuka. Lanjutkan hanya sampai target air panas; final beverage tetap air panas + es.')
    .replace(/Stir the server 5-8 seconds to integrate concentrate and ice thoroughly\./gi, 'Aduk 5-8 detik agar konsentrat dan es menyatu.')
    .replace(/Keep the switch closed/gi, 'Jaga katup tetap tertutup')
    .replace(/open the switch/gi, 'buka katup')
    .replace(/Set the Hario Switch on the server/gi, 'Letakkan Hario Switch di atas server')
    .replace(/Rinse the V60-style paper, preheat the brewer\/server, and tare the scale first, then close the switch before adding coffee and brew water\./gi, 'Bilas kertas V60, panaskan brewer/server, tare timbangan, lalu tutup katup sebelum memasukkan kopi dan air.')
    .replace(/Keep the switch closed, wet the full bed evenly, and let immersion start doing the work without rushing the opening\./gi, 'Jaga katup tetap tertutup, basahi seluruh bed secara merata, dan biarkan proses immersion mulai bekerja tanpa terburu-buru.')
    .replace(/Keep the switch closed and add water calmly; let immersion carry extraction instead of forcing turbulence\./gi, 'Jaga katup tetap tertutup dan tambahkan air dengan tenang; biarkan immersion mendorong ekstraksi tanpa memaksakan agitasi berlebih.')
    .replace(/Keep the switch closed through the later contact window; avoid stirring late so the release stays clean\./gi, 'Jaga katup tetap tertutup selama kontak akhir; hindari mengaduk di fase akhir agar aliran keluar tetap bersih.')
    .replace(/Open the switch cleanly and let the bed drain on its own; do not stir, shake, or top up during the finishing drain\./gi, 'Buka katup sepenuhnya dan biarkan bed kopi turun dengan sendirinya; jangan diaduk, digoyang, atau ditambah air selama air turun.')
    .replace(/Open the switch cleanly and let the bed drain on its own; do not stir or shake the brewer during the finishing drain\./gi, 'Buka katup sepenuhnya dan biarkan bed kopi turun dengan sendirinya; jangan diaduk atau digoyang selama air turun.')
    .replace(/Keep the switch open/gi, 'Jaga katup tetap terbuka')
    .replace(/Set the Hario Switch on the server with the valve open/gi, 'Letakkan Hario Switch di atas server dengan katup terbuka')
    .replace(/Rinse the V60-style paper, preheat the brewer\/server, tare the scale, then leave the switch open before dosing coffee\./gi, 'Bilas kertas V60, panaskan brewer/server, tare timbangan, lalu biarkan katup tetap terbuka sebelum memasukkan kopi.')
    .replace(/Leave the valve open from the first bloom; this is percolation mode, not immersion\./gi, 'Biarkan katup terbuka sejak bloom pertama; ini mode perkolasi, bukan immersion.')
    .replace(/Keep the valve open and use a clean center-to-mid pour so the cup stays transparent\./gi, 'Jaga katup tetap terbuka dan gunakan tuangan tengah agar hasil seduhan tetap bersih dan jernih.')
    .replace(/Finish the hot-water target with the valve still open; do not add a fake release step\./gi, 'Selesaikan target air panas dengan katup tetap terbuka; jangan buat langkah release buatan.')
    .replace(/Let drawdown finish naturally with the valve open, then stir the server briefly\./gi, 'Biarkan drawdown selesai secara alami dengan katup terbuka, lalu aduk server singkat.')
    .replace(/Use the switch briefly closed only for capture/gi, 'Tutup katup singkat hanya untuk menangkap kehalusan manis')
    .replace(/open the switch before the cup gets heavy/gi, 'buka katup sebelum kopi terasa terlalu berat')
    .replace(/Set the Hario Switch on the server and start with open flow/gi, 'Letakkan Hario Switch di atas server dan mulai dengan aliran terbuka')
    .replace(/Rinse the V60-style paper, preheat the brewer\/server, tare the scale, then start with the valve open for a cleaner bloom\./gi, 'Bilas kertas V60, panaskan brewer/server, tare timbangan, lalu mulai dengan katup terbuka untuk bloom yang lebih bersih.')
    .replace(/Start open and gentle so acidity and florals stay clear\./gi, 'Mulai dengan katup terbuka secara perlahan agar acidity dan aroma floral tetap terjaga.')
    .replace(/Build most of the hot-water target as open percolation before the short closed capture\./gi, 'Lakukan sebagian besar target air panas dengan aliran terbuka sebelum tangkapan singkat saat katup ditutup.')
    .replace(/Close only briefly for sweetness; avoid turning the bright target into a heavy immersion cup\./gi, 'Tutup katup secara singkat hanya untuk sweetness; hindari mengubah target cerah menjadi seduhan immersion yang tebal.')
    .replace(/Open the switch before the finish flattens, then let drawdown stay clean\./gi, 'Buka katup sebelum rasa akhir menjadi datar, lalu biarkan air turun dengan bersih.')
    .replace(/Keep the switch closed for the hot concentrate/gi, 'Jaga katup tetap tertutup untuk konsentrat panas')
    .replace(/open the switch over measured ice/gi, 'buka katup di atas es yang sudah ditimbang')
    .replace(/Set the Hario Switch over a server with measured ice/gi, 'Letakkan Hario Switch di atas server berisi es terukur')
    .replace(/Rinse the V60-style paper, preheat the brewer, tare the scale, and put measured ice in the server before brewing\./gi, 'Bilas kertas V60, panaskan brewer, tare timbangan, dan masukkan es terukur ke dalam server sebelum menyeduh.')
    .replace(/Bloom as hot concentrate with the valve closed; ice is already counted in the final input\./gi, 'Bloom sebagai konsentrat panas dengan katup tertutup; es sudah diperhitungkan dalam input akhir.')
    .replace(/Add only planned hot water through the bed; do not add hidden bypass later\./gi, 'Tambahkan air panas yang direncanakan saja lewat bed kopi; jangan masukkan bypass tersembunyi setelahnya.')
    .replace(/Keep the closed phase short so the iced cup stays fresh rather than heavy\./gi, 'Jaga fase tertutup tetap pendek agar es kopi terasa segar dan tidak terlalu berat.')
    .replace(/Release hot concentrate over ice, then stir the server 5-8 seconds\./gi, 'Buka katup untuk mengalirkan konsentrat panas di atas es, lalu aduk server 5-8 detik.')
    .replace(/Use a controlled closed phase/gi, 'Gunakan fase katup tertutup yang terkontrol')
    .replace(/open the switch at the release checkpoint/gi, 'buka katup di titik release')
    .replace(/Set the Hario Switch on the server and follow the valve checkpoints/gi, 'Letakkan Hario Switch di atas server dan ikuti petunjuk katup')
    .replace(/Rinse the V60-style paper, preheat the brewer\/server, tare the scale, then close the switch for the first sweetness checkpoint\./gi, 'Bilas kertas V60, panaskan brewer/server, tare timbangan, lalu tutup katup untuk titik sweetness pertama.')
    .replace(/Close for bloom to capture sweetness, but keep the chamber load within the size guardrail\./gi, 'Tutup katup saat bloom untuk menangkap rasa manis, tetapi jaga muatan ruang tetap di dalam batas aman.')
    .replace(/Use the closed phase for sweetness, then release before the bed feels stalled\./gi, 'Gunakan fase tertutup untuk mengejar kemanisan, lalu buka katup sebelum aliran kopi macet.')
    .replace(/Finish open if the plan asks for it; this keeps the cup cleaner than a full closed hold\./gi, 'Selesaikan dengan aliran terbuka jika direncanakan; ini menjaga cangkir lebih bersih daripada rendaman penuh.')
    .replace(/Open the switch cleanly, finish the hot-water target, and avoid late heavy agitation\./gi, 'Buka katup sepenuhnya, selesaikan target air panas, dan hindari agitasi berat di akhir.')
    .replace(/Keep the Clever closed/gi, 'Jaga Clever tetap tertutup')
    .replace(/open the valve/gi, 'buka katup')
    .replace(/Place the Clever on the server/gi, 'Letakkan Clever di atas server')
    .replace(/Rinse the paper, preheat the brewer, and tare the scale first, then close the valve before adding coffee and brew water\./gi, 'Bilas kertas filter, panaskan brewer, tare timbangan, lalu tutup katup sebelum menambahkan kopi dan air.')
    .replace(/Wet the entire bed evenly and let immersion start doing the work; the opening should feel full, not rushed\./gi, 'Basahi seluruh bed kopi secara merata dan biarkan immersion bekerja; pembukaan harus terasa penuh, tidak terburu-buru.')
    .replace(/Add the next water calmly and let immersion carry extraction; there is no need to force agitation the way you would on an open dripper\./gi, 'Tambahkan air berikutnya dengan tenang dan biarkan immersion mengekstraksi; tidak perlu melakukan agitasi seperti pada dripper terbuka.')
    .replace(/Hold the later middle phase calm and avoid stirring; Clever rewards a settled bed before the release\./gi, 'Jaga fase tengah akhir tetap tenang dan hindari pengadukan; Clever memberikan rasa lebih bersih jika bed tenang sebelum dilepas.')
    .replace(/Open the valve cleanly and let the bed release on its own; do not stir or shake the brewer during the finishing drain\./gi, 'Buka katup sepenuhnya dan biarkan kopi turun dengan sendirinya; jangan diaduk atau digoyang selama aliran turun.')
    .replace(/Keep the first wetting calm so clarity stays intact\./gi, 'Jaga basahan pertama tetap tenang agar clarity tetap terjaga.')
    .replace(/Make sure all grounds are wet so the cup does not run thin later\./gi, 'Pastikan seluruh bubuk kopi basah merata agar seduhan tidak terasa tipis.')
    .replace(/Keep the first wetting calm so the cup can build a sweeter middle\./gi, 'Jaga basahan pertama tetap tenang agar cangkir bisa membangun rasa manis di tengah.')
    .replace(/Wet the grounds evenly before moving to the next checkpoint\./gi, 'Basahi bubuk kopi secara merata sebelum lanjut ke langkah berikutnya.')
    .replace(/Keep the opening gentle so clarity stays intact\./gi, 'Jaga pembukaan tetap lembut agar clarity tetap utuh.')
    .replace(/Make sure the bed is fully wet so the cup does not run thin later\./gi, 'Pastikan bed kopi basah sepenuhnya agar hasil seduhan tidak terasa tipis.')
    .replace(/Keep the bloom calm so the cup can build a sweeter middle\./gi, 'Jaga bloom tetap tenang agar cangkir bisa membangun rasa manis di tengah.')
    .replace(/Open the bed evenly before moving to the next checkpoint\./gi, 'Buka bed kopi secara merata sebelum lanjut ke langkah berikutnya.')
    .replace(/Keep the middle phase clean and avoid pushing the walls\./gi, 'Jaga fase tengah tetap bersih dan hindari menyiram dinding filter.')
    .replace(/Hold slurry depth steady through the middle phase\./gi, 'Jaga ketinggian slurry tetap stabil selama fase tengah.')
    .replace(/Use this phase to build sweetness without spiking agitation\./gi, 'Gunakan fase ini untuk membangun rasa manis tanpa lonjakan agitasi.')
    .replace(/Keep the flow stable and repeatable through the middle phase\./gi, 'Jaga aliran tetap stabil dan konsisten selama fase tengah.')
    .replace(/Let the later middle phase stay light so the finish does not flatten\./gi, 'Jaga fase tengah akhir tetap ringan agar rasa akhir tidak mendatar.')
    .replace(/Carry enough contact here to keep structure in the cup\./gi, 'Pertahankan kontak secukupnya di sini untuk menjaga struktur cangkir tetap kokoh.')
    .replace(/Keep the later middle phase level so sweetness lands cleanly\./gi, 'Jaga ketinggian air fase tengah akhir agar sweetness mendarat bersih.')
    .replace(/Keep the later middle phase controlled and level\./gi, 'Jaga fase tengah akhir tetap terkontrol dan rata.')
    .replace(/Release cleanly and avoid stirring again once the brewer is draining\./gi, 'Buka aliran dengan bersih dan hindari mengaduk kembali saat aliran kopi mulai turun.')
    .replace(/Finish the immersion phase cleanly and separate the brew from the grounds\./gi, 'Selesaikan fase immersion dengan bersih dan pisahkan seduhan kopi dari bubuknya.')
    .replace(/Finish cleanly and avoid heavy late agitation\./gi, 'Selesaikan secara bersih dan hindari agitasi berat di akhir.')
    .replace(/Finish with enough control to keep the cup dense, not muddy\./gi, 'Selesaikan dengan kontrol cukup agar cangkir terasa padat, tidak keruh.')
    .replace(/Finish calmly so the aftertaste stays sweet and round\./gi, 'Selesaikan dengan tenang agar aftertaste tetap manis dan bulat.')
    .replace(/Finish calmly and let the drawdown stay tidy\./gi, 'Selesaikan dengan tenang dan biarkan air turun dengan rapi.')
    .replace(/Traditional Flat Three-Pour uses three distinct, calm pours to keep a flat bed and a consistent, clean extraction\. Ideal for balanced sweetness\./gi, 'Traditional Flat Three-Pour menggunakan tiga tuangan tenang terpisah untuk menjaga flat bed dan ekstraksi yang konsisten serta bersih. Ideal untuk kemanisan yang seimbang.')
    .replace(/Watch for side-channeling\. Do not pour too close to the filter paper ridges to preserve the wave bypass effect\./gi, 'Waspadai side-channeling. Jangan menuang terlalu dekat dengan lipatan kertas filter agar efek bypass gelombang (wave) tetap terjaga.')
    .replace(/Competition Fast Four-Pour utilizes four fast concentric pulses to maximize water-coffee agitation, bringing out high acidity and bright clarity\./gi, 'Competition Fast Four-Pour menggunakan empat pulsa konsentris cepat untuk memaksimalkan agitasi air-kopi, menonjolkan acidity tinggi dan kejernihan yang cerah.')
    .replace(/Slurry level control is critical\. Do not let the water level rise too high, or the fast drawdown will become muddy\./gi, 'Kontrol level suspensi (slurry) sangat krusial. Jangan biarkan level air naik terlalu tinggi, atau air turun yang cepat akan menjadi keruh.')
    .replace(/Continuous Slow Stream keeps a constant water column using a gentle, slow centered flow, yielding an exceptionally sweet cup with a velvety body\./gi, 'Continuous Slow Stream menjaga kolom air tetap konstan dengan aliran tengah yang lembut dan lambat, menghasilkan cangkir yang sangat manis dengan body beludru.')
    .replace(/Maintain a steady hand\. Fluctuations in flow rate will disturb the flat bed structure and ruin extraction balance\./gi, 'Jaga tangan tetap stabil. Fluktuasi flow rate akan mengganggu struktur flat bed dan merusak keseimbangan ekstraksi.')
    .replace(/Iced Wave uses a concentrated hot extraction poured directly over pre-weighed ice, preserving bright, volatile fruit acids and clean sweetness\./gi, 'Iced Wave menggunakan ekstraksi panas pekat yang dituang langsung ke atas es terukur, menjaga asam buah volatil yang cerah dan kemanisan yang bersih.')
    .replace(/Drip path control\. Ensure the hot concentrate drips directly onto the ice core for immediate thermal locking and aroma preservation\./gi, 'Kontrol jalur tetesan. Pastikan konsentrat panas menetes langsung ke inti es untuk penguncian suhu instan dan menjaga aroma.')
    .replace(/High-Dose Concentrate extracts a rich, heavy coffee essence using a large coffee dose and a tight water ratio\. Offers deep sweetness and huge mouthfeel\./gi, 'High-Dose Concentrate mengekstrak esensi kopi yang kaya dan berat menggunakan dosis kopi besar dan rasio air yang rapat. Memberikan kemanisan mendalam dan mouthfeel tebal.')
    .replace(/Prevent clogging\. A coarser grind and zero circular agitation are required to stop the large coffee bed from stalling at the bottom holes\./gi, 'Cegah penyumbatan. Gilingan lebih kasar dan tanpa agitasi sirkular diperlukan agar bed kopi besar tidak mampet di lubang bawah.')
    .replace(/Pour aggressively in center circles to wet all grounds quickly\./gi, 'Tuang dengan agresif dalam lingkaran tengah untuk membasahi seluruh kopi dengan cepat.')
    .replace(/Deliver hot water in rapid concentric rings at the core; push hydration rapidly without letting water bypass the fluted edges\./gi, 'Alirkan air panas dalam lingkaran konsentris cepat di bagian tengah; dorong hidrasi dengan cepat tanpa membiarkan air melewati celah luar.')
    .replace(/Pour with high flow rate in tight center concentric circles to agitate deeply\./gi, 'Tuang dengan flow rate tinggi dalam lingkaran konsentris tengah yang rapat untuk agitasi mendalam.')
    .replace(/Increase flow rate to promote intense early agitation; keep the slurry level low to maximize velocity and clarity\./gi, 'Naikkan flow rate untuk memicu agitasi awal yang intens; jaga level cairan tetap rendah untuk memaksimalkan kecepatan dan kejernihan.')
    .replace(/Pour with high flow rate in tight center concentric circles, creating high extraction velocity\./gi, 'Tuang dengan flow rate tinggi dalam lingkaran konsentris tengah yang rapat, menciptakan kecepatan ekstraksi tinggi.')
    .replace(/Deliver the third quick pulse, focusing the stream entirely inside the central zone to accelerate the drawdown\./gi, 'Berikan pulsa cepat ketiga, fokuskan aliran sepenuhnya di area tengah untuk mempercepat air turun.')
    .replace(/Final rapid concentric pulse, keeping the water level low to drain quickly\./gi, 'Pulsa konsentris cepat terakhir, jaga level air tetap rendah agar mengalir turun dengan cepat.')
    .replace(/Complete the final short pulse cleanly; let the coffee drain rapidly and completely to produce a vibrant, crisp cup\./gi, 'Selesaikan pulsa pendek terakhir dengan bersih; biarkan kopi turun dengan cepat dan tuntas untuk menghasilkan cangkir yang hidup dan segar.')
    .replace(/Pour gently in the center to pre-wet the grounds\./gi, 'Tuang dengan lembut di tengah untuk membasahi awal kopi.')
    .replace(/Wet the dry coffee bed with a very gentle, low-altitude stream to avoid disturbing the flat bed\./gi, 'Basahi bed kopi kering dengan aliran yang sangat lembut dan rendah agar tidak mengganggu flat bed.')
    .replace(/Maintain an extremely low, slow, continuous centered flow\./gi, 'Jaga aliran tengah tetap sangat kecil, lambat, dan kontinu.')
    .replace(/Establish a tiny, continuous centered stream \(1\.5-2\.0 ml\/sec\)\. Keep the kettle height low to avoid introducing heavy turbulence\./gi, 'Buat aliran tengah kontinu yang sangat kecil (1.5-2.0 ml/detik). Jaga ketel tetap rendah agar tidak menimbulkan turbulensi berlebih.')
    .replace(/Keep a constant water column and steady centered stream\./gi, 'Jaga kolom air tetap konstan dan aliran tengah tetap stabil.')
    .replace(/Maintain the slow continuous pour without interruption, allowing the water column to extract evenly with minimal agitation\./gi, 'Jaga tuangan lambat kontinu tanpa jeda, membiarkan kolom air mengekstrak merata dengan agitasi minimal.')
    .replace(/Stop pouring and let the level column drain slowly\./gi, 'Hentikan tuangan dan biarkan kolom air turun perlahan.')
    .replace(/Gracefully cut the pour; allow the high-density slurry to drain slowly, extracting deep sweetness and velvety body\./gi, 'Hentikan tuangan dengan lembut; biarkan cairan berkepadatan tinggi turun perlahan, mengekstrak kemanisan mendalam dan body selembut beludru.')
    .replace(/Bloom hot onto the dry bed; let gassing complete quickly\./gi, 'Bloom panas ke atas bed kering; biarkan pelepasan gas selesai dengan cepat.')
    .replace(/Saturate the small flat bed edge-to-edge; let the gas escape rapidly so the high-density extraction starts clean\./gi, 'Basahi bed datar kecil dari ujung ke ujung; biarkan gas keluar dengan cepat agar ekstraksi berkepadatan tinggi mulai dengan bersih.')
    .replace(/Pour hot water in quick center circles, keeping slurry low and extraction concentrated\./gi, 'Tuang air panas dalam lingkaran tengah cepat, menjaga cairan tetap rendah dan ekstraksi tetap pekat.')
    .replace(/Apply a tight, rapid center pour to build solubility; the concentrate will drip directly onto the ice bed below\./gi, 'Gunakan tuangan tengah cepat yang rapat untuk membangun kelarutan; konsentrat akan menetes langsung ke es di bawah.')
    .replace(/Final concentric hot pour, draining rapidly directly onto the ice bed\./gi, 'Tuangan panas konsentris terakhir, mengalir turun dengan cepat langsung ke atas es.')
    .replace(/Top up with the remaining hot target water cleanly, ensuring high thermal locking as it drips onto the ice\./gi, 'Penuhi sisa air target panas dengan bersih, memastikan penguncian suhu tinggi saat menetes ke es.')
    .replace(/Let the final drops drain and swirl the server to melt ice completely\./gi, 'Biarkan tetesan terakhir habis dan putar server untuk melelehkan es sepenuhnya.')
    .replace(/Allow the concentrated draw to complete, then swirl the server to blend the hot extract and ice into a chilled balance\./gi, 'Biarkan aliran pekat selesai, lalu putar server untuk mencampur ekstrak panas dan es menjadi keseimbangan dingin.')
    .replace(/Wet the thick bed slowly; let gas release from the high dose\./gi, 'Basahi bed tebal secara lambat; biarkan pelepasan gas dari dosis tinggi terjadi.')
    .replace(/Pour slowly and concentric; high dose coffee packs tightly, so ensure complete water saturation before pulsing\./gi, 'Tuang dengan lambat dan konsentris; kopi dosis tinggi memadat rapat, pastikan pembasahan air sempurna sebelum mulai pulsa.')
.replace(/Pour in slow center concentric rings, keeping the slurry level low to avoid bypass\./gi, 'Tuang dalam lingkaran konsentris tengah yang lambat, menjaga level cairan tetap rendah untuk menghindari bypass.')
    .replace(/Deliver slow, heavy pulses near the center to wash the deep bed, keeping the water level low to prevent edge bypass\./gi, 'Berikan pulsa berat dan lambat dekat pusat untuk membasuh bed yang dalam, menjaga level air tetap rendah untuk mencegah bypass pinggir.')
    .replace(/Final slow concentric pour to wash the bed; avoid fluted wall agitation\./gi, 'Tuangan konsentris lambat terakhir untuk membasuh bed; hindari agitasi pada dinding bergelombang.')
    .replace(/Finish the hot water target with slow concentric circles; do not wash down fluted walls to protect clarity\./gi, 'Selesaikan air target panas dengan lingkaran konsentris lambat; jangan basuh dinding bergelombang untuk melindungi kejernihan.')
    .replace(/Let the thick, rich concentrate finish draining\./gi, 'Biarkan konsentrat tebal yang kaya selesai mengalir.')
    .replace(/Allow the syrupy concentrate to drain completely; serve neat or dilute with hot water as a clean bypass\./gi, 'Biarkan konsentrat sepekat sirup mengalir tuntas; sajikan murni atau encerkan dengan air panas sebagai bypass bersih.')
    // Clever Dripper Signature Styles
    .replace(/Classic Closed Immersion steeps the coffee fully closed with zero agitation to yield a sweet, balanced, and round body\./gi, 'Classic Closed Immersion merendam kopi sepenuhnya tertutup tanpa agitasi untuk menghasilkan body yang manis, seimbang, dan bulat.')
    .replace(/Make sure the lid is tight during steep to retain heat\. Do not agitate during the draw to keep clarity high\./gi, 'Pastikan penutup rapat saat merendam untuk menahan panas. Jangan mengagitasi saat air turun agar kejernihan tetap tinggi.')
    .replace(/Reverse Water-First Steep pours the water first, letting coffee grounds extract gently as they sink\. This eliminates filter clogging and achieves brilliant clarity\./gi, 'Reverse Water-First Steep menuangkan air terlebih dahulu, membiarkan bubuk kopi terekstraksi dengan lembut saat tenggelam. Ini menghilangkan penyumbatan filter dan menghasilkan kejernihan yang cemerlang.')
    .replace(/Avoid any stirring or swirling when adding coffee\. The grounds must float and sink naturally\./gi, 'Hindari mengaduk atau memutar saat menambahkan kopi. Bubuk kopi harus mengapung dan tenggelam secara alami.')
    .replace(/Double-Stage Steep-and-Percolate blends a closed bloom, an open percolation phase, and a final closed immersion stage to give high complexity and juicy sweetness\./gi, 'Double-Stage Steep-and-Percolate memadukan bloom tertutup, fase perkolasi terbuka, dan tahap immersion tertutup akhir untuk memberikan kompleksitas tinggi dan manis yang berair (juicy).')
    .replace(/Valve handoff timing is key\. Be prepared to lift the dripper cleanly from the server to stop the flow\./gi, 'Timing pemindahan katup adalah kunci. Bersiaplah untuk mengangkat dripper dengan bersih dari server untuk menghentikan aliran.')
    .replace(/Iced Clever steeps a tight, high-heat concentrate in a fully closed chamber before releasing it directly over ice, capturing all volatile fruit aromatics\./gi, 'Iced Clever merendam konsentrat panas yang pekat dalam wadah tertutup rapat sebelum melepasnya langsung di atas es, menangkap semua aromatik buah yang volatil.')
    .replace(/Thermal shock\. Ensure the release occurs directly over the ice cubes for immediate cooling\./gi, 'Thermal shock. Pastikan pelepasan terjadi langsung di atas es batu untuk pendinginan instan.')
    .replace(/High-Dose Concentrate uses a massive coffee-to-water ratio and an extended steep to brew a heavy, syrupy liquor reminiscent of siphon or espresso\./gi, 'High-Dose Concentrate menggunakan rasio kopi-ke-air yang sangat besar dan rendaman yang diperpanjang untuk menyeduh cairan tebal sepekat sirup yang mengingatkan pada siphon atau espresso.')
    .replace(/Prevent choking\. Do not swirl or shake the dripper during release, or the fine particles will clog the paper holes\./gi, 'Cegah penyumbatan. Jangan memutar atau menggoyang dripper saat pelepasan, atau partikel halus akan menyumbat lubang kertas.')
    // Clever Dripper step cues
    .replace(/Pour all hot water slowly over grounds\. Close the lid and let steep\./gi, 'Tuangkan semua air panas perlahan ke atas bubuk kopi. Tutup penutupnya dan biarkan merendam.')
    .replace(/Place the Clever Dripper onto your server to release the brew\./gi, 'Letakkan Clever Dripper di atas server untuk membuka katup dan mengeluarkan seduhan.')
    .replace(/Let the drawdown finish completely\. Serve immediately\./gi, 'Biarkan aliran air turun selesai sepenuhnya. Sajikan segera.')
    .replace(/Pour all hot water into the closed chamber first\./gi, 'Tuangkan semua air panas ke dalam wadah yang tertutup terlebih dahulu.')
    .replace(/Gently scatter all coffee grounds onto the water surface\. Do not stir!/gi, 'Taburkan bubuk kopi dengan lembut ke permukaan air. Jangan diaduk!')
    .replace(/Close the lid and steep\. The coffee will sink slowly and extract with absolute clarity\./gi, 'Tutup penutupnya dan rendam. Kopi akan tenggelam perlahan dan terekstraksi dengan kejernihan mutlak.')
    .replace(/Place on server to activate release valve\./gi, 'Letakkan di atas server untuk mengaktifkan katup pembuang.')
    .replace(/Let the clean liquor drain completely\./gi, 'Biarkan cairan kopi yang bersih mengalir keluar sepenuhnya.')
    .replace(/Bloom hot with the valve closed\. Wet the bed evenly\./gi, 'Bloom panas dengan katup tertutup. Basahi permukaan kopi secara merata.')
    .replace(/Place on server to release the sweet bloom liquid\./gi, 'Letakkan di atas server untuk mengeluarkan cairan bloom yang manis.')
    .replace(/Pour the second portion in gentle center spirals while keeping the valve open\./gi, 'Tuangkan porsi kedua dalam spiral tengah yang lembut dengan katup tetap terbuka.')
    .replace(/Lift the dripper from the server \(closing the valve\) and pour the final water portion\./gi, 'Angkat dripper dari server (menutup katup) dan tuangkan porsi air terakhir.')
    .replace(/Let it steep closed for 40 seconds to build body and sweetness\./gi, 'Biarkan merendam tertutup selama 40 detik untuk membangun body dan sweetness.')
    .replace(/Place back on the server to release the final rich concentrate\./gi, 'Letakkan kembali di atas server untuk mengeluarkan konsentrat kaya yang terakhir.')
    .replace(/Let the final percolation finish flat\./gi, 'Biarkan perkolasi terakhir selesai dengan permukaan rata.')
    .replace(/Pour all hot water rapidly into the closed chamber\. Stir 3 times\./gi, 'Tuangkan semua air panas dengan cepat ke dalam wadah tertutup. Aduk 3 kali.')
    .replace(/Prepare your server with pre-weighed ice\./gi, 'Siapkan server Anda dengan es yang sudah ditimbang.')
    .replace(/Place the dripper on the ice server\. Release the hot concentrate directly over the ice\./gi, 'Letakkan dripper di atas server es. Keluarkan konsentrat panas langsung ke atas es.')
    .replace(/Let it drain completely\. Swirl the server to melt the ice evenly\./gi, 'Biarkan mengalir sepenuhnya. Putar server untuk melelehkan es secara merata.')
    .replace(/Pour all hot water slowly in circular paths over the high-dose bed\. Stir gently\./gi, 'Tuangkan semua air panas perlahan dalam jalur melingkar ke atas kopi dosis tinggi. Aduk perlahan.')
    .replace(/Close the lid and let steep for an extended 3\.5 minutes to maximize density\./gi, 'Tutup penutupnya dan biarkan merendam selama 3,5 menit ekstra untuk memaksimalkan densitas.')
    .replace(/Place on server\. The coarse grind will prevent the heavy bed from clogging\./gi, 'Letakkan di atas server. Gilingan kasar akan mencegah bed tebal tersumbat.')
    .replace(/Let the rich, syrupy concentrate drain\. Serve neat or dilute with bypass\./gi, 'Biarkan konsentrat tebal sepekat sirup mengalir. Sajikan murni atau encerkan dengan bypass.')
    // Chemex Signature Styles
    .replace(/Traditional Three-Pour utilizes three balanced pours to extract sweet, clean, and clear flavors through Chemex's dense filter\./gi, 'Traditional Three-Pour menggunakan tiga tuangan seimbang untuk mengekstrak rasa manis, bersih, dan jernih melalui filter padat Chemex.')
    .replace(/Paper stick\. Ensure the 3-fold side of the filter is aligned with the pouring spout to avoid blocking air venting\./gi, 'Lipatan kertas. Pastikan sisi 3-lipat filter sejajar dengan spout penuangan untuk menghindari penyumbatan ventilasi udara.')
    .replace(/Competition Fast Multiple-Pulse uses five fast pulses to keep water velocity high, counteracting the thick filter paper to capture vibrant fruit acids\./gi, 'Competition Fast Multiple-Pulse menggunakan lima pulsa cepat untuk menjaga kecepatan air tetap tinggi, mengimbangi kertas filter tebal untuk menangkap keasaman buah yang hidup.')
    .replace(/Clogging\. If your grind is too fine, the multiple agitations will cause fine particles to lock the paper, stalling the flow\./gi, 'Penyumbatan. Jika gilingan Anda terlalu halus, beberapa agitasi akan menyebabkan partikel halus mengunci kertas filter, membuat aliran terhenti.')
    .replace(/Continuous Center-Pour maintains a steady, slow centered stream to minimize bypass through the thick paper, producing a sweet and highly balanced cup\./gi, 'Continuous Center-Pour mempertahankan aliran tengah yang lambat dan stabil untuk meminimalkan bypass melalui kertas tebal, menghasilkan hasil seduhan yang manis dan sangat seimbang.')
    .replace(/Steady flow rate is crucial\. A fluctuating stream will break the coffee bed structure and create uneven extraction lanes\./gi, 'Flow rate yang stabil sangat krusial. Aliran yang berfluktuasi akan merusak struktur bed kopi dan menciptakan jalur ekstraksi yang tidak merata.')
    .replace(/Iced Chemex uses a concentrated hot percolation dripping directly onto ice inside the elegant glass carafe, sealing in bright, crisp aromatics\./gi, 'Iced Chemex menggunakan perkolasi panas terkonsentrat yang menetes langsung ke es di dalam carafe kaca yang elegan, mengunci aromatik yang cerah dan tajam.')
    .replace(/Ice melting rate\. Ensure ice is fully pre-weighed so the final iced ratio matches your target profile\./gi, 'Laju pelelehan es. Pastikan es ditimbang sepenuhnya agar rasio es akhir sesuai dengan profil target Anda.')
    .replace(/High-Dose Heavy-Body extracts a deep, syrupy mouthfeel by combining a large coffee dose, a coarse grind, and slow centered pulses\./gi, 'High-Dose Heavy-Body mengekstrak mouthfeel tebal sepekat sirup yang mendalam dengan menggabungkan dosis kopi besar, gilingan kasar, dan pulsa tengah yang lambat.')
    .replace(/Spout bypass\. Do not pour too close to the three-fold filter spout to keep bypass water from diluting the syrupy body\./gi, 'Bypass spout. Jangan menuang terlalu dekat dengan lipatan kertas filter di bagian spout agar air bypass tidak mengencerkan body yang tebal sepekat sirup.')
    // Chemex step cues
    .replace(/Wet all grounds gently\. Keep the bloom level and wait for gas escape\./gi, 'Basahi semua kopi dengan lembut. Jaga permukaan bloom tetap rata dan tunggu pelepasan gas.')
    .replace(/Pour in slow concentric rings; keep water off the thick paper walls\./gi, 'Tuang dalam lingkaran konsentris lambat; jaga air agar tidak mengenai dinding kertas yang tebal.')
    .replace(/Gently top up in the center; allow a slow percolation through thick wood-fiber\./gi, 'Tambahkan air perlahan di bagian tengah; biarkan perkolasi lambat melalui serat kayu yang tebal.')
    .replace(/Let it drain completely\. The thick filter will ensure maximum clarity\./gi, 'Biarkan mengalir keluar sepenuhnya. Filter tebal akan memastikan kejernihan maksimal.')
    .replace(/Pour aggressively in tight center circles to agitate all grounds\./gi, 'Tuang dengan agresif dalam lingkaran tengah yang rapat untuk mengagitasi seluruh bubuk kopi.')
    .replace(/Pour quickly in the center; keep flow rate high to create extraction velocity\./gi, 'Tuang dengan cepat di bagian tengah; jaga flow rate tetap tinggi untuk menciptakan kecepatan ekstraksi.')
    .replace(/Execute a rapid concentric pulse\. The high water column will push extraction through the paper\./gi, 'Lakukan pulsa konsentris cepat. Kolom air yang tinggi akan mendorong ekstraksi melewati kertas.')
    .replace(/Fourth quick pulse; keep the center bed agitated\./gi, 'Pulsa cepat keempat; jaga bed tengah tetap teragitasi.')
    .replace(/Final fast concentric pulse\. Keep the slurry low at the end\./gi, 'Pulsa konsentris cepat terakhir. Jaga level cairan tetap rendah di akhir.')
    .replace(/Snappy drawdown finishes with a perfectly level bed\./gi, 'Drawdown yang cepat berakhir dengan bed kopi yang rata sempurna.')
    .replace(/Wet the grounds with a gentle center pour; do not swirl\./gi, 'Basahi bubuk kopi dengan tuangan tengah yang lembut; jangan diputar!')
    .replace(/Pour in a tiny, constant centered stream\. Do not let the water level rise too high\./gi, 'Tuangkan dalam aliran tengah konstan yang sangat kecil. Jangan biarkan level air naik terlalu tinggi.')
    .replace(/Stop pouring and let the heavy water column settle for sweet, syrupy clarity\./gi, 'Hentikan tuangan dan biarkan kolom air yang berat tenang untuk kejernihan manis sepekat sirup.')
    .replace(/Pour hot over dry grounds\. Ensure the glass carafe is pre-loaded with ice\./gi, 'Tuangkan air panas di atas kopi kering. Pastikan wadah kaca sudah diisi es terlebih dahulu.')
    .replace(/Final slow center pour\. The hot liquor will drip directly over the ice\./gi, 'Tuangan tengah lambat terakhir. Cairan kopi panas akan menetes langsung di atas es.')
    .replace(/Let the final drops drain and swirl the carafe to melt remaining ice\./gi, 'Biarkan tetesan terakhir habis dan putar wadah kaca untuk melelehkan sisa es.')
    .replace(/Wet the thick bed slowly; let the large dose degas completely\./gi, 'Basahi bed tebal secara lambat; biarkan dosis besar membuang gas sepenuhnya.')
    .replace(/Pour in slow, thick center rings\. A coarser grind is used to prevent bypass\./gi, 'Tuang dalam lingkaran tengah lambat yang tebal. Gilingan lebih kasar digunakan untuk mencegah bypass.')
    .replace(/Final slow center pour to wash the heavy bed without agitating the walls\./gi, 'Tuangan tengah lambat terakhir untuk membasuh bed tebal tanpa mengagitasi dinding filter.')
    .replace(/Allow a slow, heavy drawdown to finish\. Yields maximum body\./gi, 'Biarkan air turun yang lambat dan berat selesai. Menghasilkan body maksimal.')
    // Moka Pot Styles & Steps
    .replace(/Traditional Stovetop style starts with room-temperature water in the boiler\. Heat climbs slowly, producing a classic rich stovetop extraction\./gi, 'Gaya Traditional Stovetop dimulai dengan air bersuhu ruang di boiler. Panas naik secara perlahan, menghasilkan ekstraksi stovetop kaya yang klasik.')
    .replace(/Avoid over-boiling\. Sputtering\/bubbling at the end extracts bitter woody compounds\. Remove from heat early\./gi, 'Hindari mendidih berlebih. Fase semburan/gelembung di akhir mengekstrak senyawa kayu yang pahit. Angkat dari panas lebih awal.')
    .replace(/Pre-heated Boiler uses boiling water in the bottom chamber to minimize contact time between dry grounds and the hot metal, preserving delicate sweetness\./gi, 'Pre-heated Boiler menggunakan air mendidih di wadah bawah untuk meminimalkan waktu kontak antara kopi kering dan logam panas, menjaga kemanisan yang halus.')
    .replace(/Pot gets extremely hot instantly during assembly\. Use silicone mitts or a thick towel to tighten the base threads securely\./gi, 'Panci langsung menjadi sangat panas selama pemasangan. Gunakan sarung tangan silikon atau handuk tebal untuk mengencangkan wadah bawah dengan aman.')
    .replace(/Low-Temperature Controlled utilizes an Aeropress paper filter on the metal screen to increase pressure and filter out sediment, yielding an incredibly clean cup\./gi, 'Low-Temperature Controlled memanfaatkan filter kertas Aeropress pada pelat logam untuk meningkatkan tekanan dan menyaring sedimen, menghasilkan seduhan yang sangat bersih.')
    .replace(/Flow rate is very slow\. Do not increase the stove temperature to force it; excessive heat will burn the grounds against the paper filter\./gi, 'Laju aliran sangat lambat. Jangan naikkan suhu kompor untuk memaksanya; panas berlebih akan menghanguskan kopi pada filter kertas.')
    .replace(/Iced Moka Concentrate targets a highly concentrated extraction yield to prevent ice melt dilution, delivering an intense, sweet, and cold beverage\./gi, 'Iced Moka Concentrate menargetkan ekstraksi yang sangat pekat untuk mencegah pengenceran es yang meleleh, menyajikan minuman dingin yang intens dan manis.')
    .replace(/Spill hazard\. Moka concentrate is highly viscous; ensure the pouring spout is dry to avoid dripping hot coffee outside the ice cup\./gi, 'Bahaya tumpah. Konsentrat Moka sangat kental; pastikan corong tuang kering untuk menghindari tetesan kopi panas di luar cangkir es.')
    .replace(/High Yield Robust is optimized for dark roasts, using a coarser grind and larger volume to capture maximum body and rich dark-chocolate notes\./gi, 'High Yield Robust dioptimalkan untuk sangrai gelap, menggunakan gilingan lebih kasar dan volume lebih besar untuk menangkap body maksimal dan rasa cokelat gelap yang kaya.')
    .replace(/Bitterness margin\. Watch the color of the steam\. If it turns colorless\/white, remove the pot immediately to avoid excessive bitterness\./gi, 'Batas pahit. Amati warna uap. Jika berubah menjadi bening/putih, segera angkat panci untuk menghindari rasa pahit berlebih.')
    .replace(/Fill the bottom chamber with room-temperature water up to just below the safety valve\. Do not compress grounds\./gi, 'Isi wadah bawah dengan air bersuhu ruang hingga tepat di bawah katup pengaman. Jangan memadatkan kopi.')
    .replace(/Place on medium heat with open lid\. Wait for the coffee to start flowing smoothly into the upper chamber\./gi, 'Letakkan di atas api sedang dengan penutup terbuka. Tunggu hingga kopi mulai mengalir lancar ke wadah atas.')
    .replace(/When the flow turns pale yellow\/blonde or starts to sputter, immediately remove the pot from heat and cool the base\./gi, 'Saat aliran berubah kuning pucat/blonde atau mulai menyembur, segera angkat panci dari api dan dinginkan bagian bawah panci.')
    .replace(/Fill bottom boiler with freshly boiled hot water up to the safety valve\. Use a towel to assemble the hot pot securely\./gi, 'Isi boiler bawah dengan air yang baru mendidih hingga katup pengaman. Gunakan handuk untuk merakit panci panas dengan aman.')
    .replace(/Place on medium-high heat with lid open\. Flow should start within 30-45 seconds due to preheated steam pressure\./gi, 'Letakkan di atas api sedang-tinggi dengan penutup terbuka. Aliran harus dimulai dalam 30-45 detik karena tekanan uap dari air yang sudah panas.')
    .replace(/As flow turns blond, immediately quench the bottom of the pot in cold water or wrap with a cold wet towel to stop extraction\./gi, 'Saat aliran memucat (blond), segera dinginkan bagian bawah panci dalam air dingin atau bungkus dengan handuk basah dingin untuk menghentikan ekstraksi.')
    .replace(/Wet a paper Aeropress filter and stick it to the upper metal filter screen\. Fill boiler with warm water \(60.*C\)\./gi, 'Basahi kertas filter Aeropress dan tempelkan ke saringan logam atas. Isi boiler dengan air hangat (60°C).')
    .replace(/Place on ultra-low heat\. The paper filter increases back-pressure, requiring a slower, gentler rise to extract cleaner oils\./gi, 'Letakkan di atas api sangat kecil. Filter kertas menaikkan tekanan balik, membutuhkan aliran naik yang lebih lambat dan lembut untuk mengekstrak minyak kopi yang lebih bersih.')
    .replace(/Allow the viscous concentrate to pool slowly\. Remove from stove before the central steam column erupts\./gi, 'Biarkan konsentrat kental berkumpul perlahan. Angkat dari kompor sebelum semburan uap pusat meletus.')
    .replace(/Fill boiler with hot water up to 80% valve level\. Put 120g of clean ice in a serving glass ready for decanting\./gi, 'Isi boiler dengan air panas hingga 80% tingkat katup. Siapkan 120g es bersih di gelas saji untuk dituangi.')
    .replace(/Place pot on medium heat\. Grind coffee finer to restrict flow and increase extraction solids\./gi, 'Letakkan panci di atas api sedang. Giling kopi lebih halus untuk membatasi aliran dan menaikkan zat terlarut ekstraksi.')
    .replace(/Pour the first 60-80ml of dense concentrate directly over ice\. Leave the tail sputter in the pot completely\./gi, 'Tuang 60-80ml pertama konsentrat pekat langsung ke atas es. Biarkan sisa semburan akhir tetap di dalam panci.')
    .replace(/Fill boiler to maximum safety line\. Dose dark-roast coffee slightly coarser and tap basket gently to settle\./gi, 'Isi boiler hingga garis pengaman maksimum. Dosis kopi sangrai gelap sedikit lebih kasar dan ketuk basket dengan lembut untuk meratakannya.')
    .replace(/Start on low-medium heat\. Keep lid closed\. Let pressure push a high-volume robust extraction through the basket\./gi, 'Mulai dengan api kecil-sedang. Jaga penutup tetap tertutup. Biarkan tekanan mendorong ekstraksi kuat bervolume tinggi melalui basket.')
    .replace(/Allow pot to extract until the upper chamber is full\. Quench base in cold water only if sputtering becomes too dry\./gi, 'Biarkan panci mengekstrak hingga wadah atas penuh. Dinginkan wadah bawah dalam air dingin jika semburan mulai terasa terlalu kering.')
    // Cold Brew Styles & Steps
    .replace(/Classic Toddy Immersion utilizes slow room-temperature steeping and felt-filter filtration to deliver a sweet, heavy-bodied, low-acid concentrate\./gi, 'Classic Toddy Immersion menggunakan perendaman suhu ruang lambat dan filtrasi filter felt untuk menghasilkan konsentrat ber-body tebal, manis, dan rendah asam.')
    .replace(/Do not stir\. Agitating the mixture during immersion forces fine particles into the felt filter, causing clogging and extremely slow drainage\./gi, 'Jangan diaduk. Mengagitasi campuran selama perendaman memaksa partikel halus masuk ke filter felt, menyebabkan penyumbatan dan aliran turun lambat.')
    .replace(/Cold Drip Tower forces ice-cold water to percolate through the bed drop-by-drop, creating beautiful floral notes and a highly aromatic, lighter-bodied cold brew\./gi, 'Cold Drip Tower memaksa air sedingin es menetes melalui bed kopi tetes demi tetes, menciptakan aroma floral yang indah dan cold brew ber-body ringan yang sangat aromatik.')
    .replace(/Valve freeze\. The drip rate can slow down or stop entirely as the water cools or gets empty\. Monitor the drip rate every hour\./gi, 'Katup membeku. Kecepatan tetes bisa melambat atau berhenti saat air mendingin atau habis. Pantau kecepatan tetes setiap jam.')
    .replace(/Double Extraction Concentrate uses two separate coffee contact stages to bypass solubility saturation limits, producing an ultra-strong, thick concentrate\./gi, 'Double Extraction Concentrate menggunakan dua tahap kontak kopi terpisah untuk melompati batas jenuh kelarutan, menghasilkan konsentrat tebal yang sangat kuat.')
    .replace(/Spoilage risk\. Because this immersion is highly concentrated and runs for 20 hours, execute all steps in a cool environment or refrigerator\./gi, 'Risiko basi. Karena perendaman ini sangat pekat dan berjalan selama 20 jam, lakukan semua langkah di lingkungan sejuk atau lemari es.')
    .replace(/Accelerated Room Temp uses agitation and slightly warmer starting water to cut steeping time from 16 hours to 4 hours while retaining sweet chocolate notes\./gi, 'Accelerated Room Temp menggunakan agitasi dan air awal sedikit lebih hangat untuk memotong waktu rendam dari 16 jam menjadi 4 jam sambil mempertahankan rasa manis cokelat.')
    .replace(/Sediment\. Since we stir at the start, there are many suspended micro-fines\. A paper filter polish is mandatory to avoid a muddy cup\./gi, 'Sedimen. Karena kita mengaduk di awal, banyak mikro-fines yang melayang. Penyaringan kertas wajib dilakukan untuk menghindari hasil yang keruh.')
    .replace(/Japanese Slow Drip provides a crystal-clear, clean-tasting cold brew by dripping cold water directly through a narrow coffee column without recirculating\./gi, 'Japanese Slow Drip menghasilkan cold brew yang sangat jernih dan bersih dengan meneteskan air dingin langsung melalui kolom kopi sempit tanpa sirkulasi ulang.')
    .replace(/Drip block\. Evaporation or temperature variance in the room can cause the valve to stop\. Adjust the nozzle if the drip rate stops\./gi, 'Tetesan macet. Penguapan atau perbedaan suhu di ruangan dapat menyebabkan katup berhenti. Sesuaikan nosel jika tetesan berhenti.')
    .replace(/Insert the reusable felt filter into the Toddy bottom\. Pour a small splash of cold water to wet the felt\./gi, 'Masukkan filter felt yang dapat digunakan kembali ke dasar wadah Toddy. Tuang sedikit air dingin untuk membasahi felt.')
    .replace(/Pour 20% of your cold water, then add half the grounds\. Continue layering water and grounds gently without stirring\./gi, 'Tuang 20% air dingin Anda, lalu tambahkan setengah kopi. Lanjutkan menyusun lapisan air dan kopi dengan lembut tanpa diaduk.')
    .replace(/Cover and let the mixture steep at room temperature \(18-22.*C\) or in the fridge for 12 to 24 hours\./gi, 'Tutup dan biarkan campuran terendam pada suhu ruang (18-22°C) atau di lemari es selama 12 hingga 24 jam.')
    .replace(/Pull the stopper plug from the bottom and let the clean concentrate drain into the glass decanter\./gi, 'Tarik sumbat penutup dari bawah dan biarkan konsentrat bersih mengalir ke decanter kaca.')
    .replace(/Place grounds in the middle column\. Saturate with a small amount of water and put a paper filter disk on top of the bed\./gi, 'Letakkan kopi di kolom tengah. Basahi dengan sedikit air dan letakkan piringan filter kertas di atas bed kopi.')
    .replace(/Fill the upper chamber with 50% ice and 50% cold water\. Adjust the drip valve to 1 drop every 1\.5 seconds\./gi, 'Isi wadah atas dengan 50% es dan 50% air dingin. Atur katup tetes ke 1 tetes setiap 1,5 detik.')
    .replace(/Allow ice water to drip continuously over 4 to 6 hours\. Adjust flow rate mid-way if temperature changes shift flow\./gi, 'Biarkan air es menetes terus-menerus selama 4 hingga 6 jam. Atur laju aliran di tengah jalan jika perubahan suhu menggeser aliran.')
    .replace(/Wet half the grounds with 50% water\. Let steep for 8 hours for initial sugar extraction\./gi, 'Basahi setengah kopi dengan 50% air. Biarkan merendam selama 8 jam untuk ekstraksi gula awal.')
    .replace(/Add the remaining grounds and cold water\. Let steep for an additional 12 hours to compile extra high dissolved solids\./gi, 'Tambahkan sisa kopi dan air dingin. Biarkan merendam selama 12 jam tambahan untuk mengumpulkan zat terlarut ekstra tinggi.')
    .replace(/Decant completely\. Dilute concentrate 1:2 or 1:3 with water or milk before serving\./gi, 'Tuang pisah sepenuhnya. Encerkan konsentrat 1:2 atau 1:3 dengan air atau susu sebelum disajikan.')
    .replace(/Combine all grounds and warm room-temperature water \(24.*C\)\. Stir vigorously for 60 seconds to initiate fast extraction\./gi, 'Campurkan semua kopi giling dan air bersuhu ruang hangat (24°C). Aduk kuat selama 60 detik untuk memulai ekstraksi cepat.')
    .replace(/Cover and let steep for 4 hours\. Give a very gentle swirl at the 2-hour mark to keep particles suspended\./gi, 'Tutup dan biarkan merendam selama 4 jam. Putar sangat lembut pada tanda 2 jam untuk menjaga partikel tetap melayang.')
    .replace(/Pour the slurry through a fine mesh metal sieve, then pass it through a V60 paper filter to remove fine silt\./gi, 'Tuang slurry melalui saringan logam mesh halus, lalu lewati filter kertas V60 untuk membuang endapan halus.')
    .replace(/Moisten grounds inside the dripper column\. Tap to align flat\. Lay a pre-wet paper disk on top\./gi, 'Lembapkan kopi di dalam kolom dripper. Ketuk agar rata. Letakkan piringan kertas yang sudah dibasahi di atasnya.')
    .replace(/Fill top reservoir with ice water\. Calibrate slow drip valve to 1 drop every 2 seconds\./gi, 'Isi wadah atas dengan air es. Kalibrasi katup tetes lambat ke 1 tetes setiap 2 detik.')
    .replace(/Let the drip run directly into a sealed glass bottle in the fridge\. Total duration should be around 8 hours\./gi, 'Biarkan tetesan mengalir langsung ke botol kaca tertutup di lemari es. Durasi total sekitar 8 jam.')
    // Batch Brewer Styles & Steps
    .replace(/SCA Gold Cup utilizes standard flat-bottom geometry and controlled machine cycles to achieve a perfectly balanced 18-22% extraction yield\./gi, 'SCA Gold Cup memanfaatkan geometri flat-bottom standar dan siklus mesin terkendali untuk mencapai rendaman ekstraksi 18-22% yang seimbang.')
    .replace(/Check shower head alignment\. Ensure the spray head is clean and level so water is distributed evenly across the wide bed\./gi, 'Periksa keselarasan shower head. Pastikan spray head bersih dan rata agar air terbagi rata di seluruh bed lebar.')
    .replace(/Heavy Batch Catering adjusts the grind coarser and utilizes a slightly lower brewing temperature to prevent bitter over-extraction inside the coffee bed\./gi, 'Heavy Batch Catering menyesuaikan gilingan lebih kasar dan menggunakan suhu seduh sedikit lebih rendah untuk mencegah ekstraksi berlebih yang pahit di dalam bed kopi.')
    .replace(/Basket overflow\. Fine grinds in large quantities can clog the basket exit hole\. Keep grind coarse and watch the basket level\./gi, 'Keranjang meluap. Gilingan halus dalam jumlah besar dapat menyumbat lubang keluar keranjang. Jaga gilingan tetap kasar dan pantau level keranjang.')
    .replace(/Bright Light Roast Batch optimizes temperature and introduces pulsed spray patterns to force high extraction yields from hard, high-density light-roast beans\./gi, 'Bright Light Roast Batch mengoptimalkan suhu dan memperkenalkan pola semprotan berdenyut untuk memaksakan rendaman ekstraksi tinggi dari bean light-roast yang keras.')
    .replace(/Acidity balance\. If the cup tastes sour or under-extracted, check the machine's actual heating element; weak heating will ruin light roasts\./gi, 'Keseimbangan keasaman. Jika seduhan terasa asam atau kurang terekstraksi, periksa elemen pemanas mesin; pemanas yang lemah akan merusak light roast.')
    .replace(/Pre-wet Hybrid Batch combines the precision of manual blooming with the convenience of automated shower percolation, eliminating dry pockets completely\./gi, 'Pre-wet Hybrid Batch menggabungkan presisi blooming manual dengan kemudahan perkolasi shower otomatis, menghilangkan kantong kering sepenuhnya.')
    .replace(/Timing\. Ensure the manual bloom starts exactly when the grounds are dry, and turn on the machine immediately after the 60-second bloom\./gi, 'Timing. Pastikan blooming manual dimulai tepat saat kopi kering, dan nyalakan mesin segera setelah bloom 60 detik selesai.')
    .replace(/High Extraction Thermos creates a denser, stronger extraction profile designed to preserve structural intensity and sweet aroma over several hours of thermos storage\./gi, 'High Extraction Thermos membuat profil ekstraksi yang lebih padat dan kuat yang dirancang untuk menjaga intensitas struktur dan aroma manis selama beberapa jam penyimpanan termos.')
    .replace(/Stale aroma\. If left with open lids, volatile aromatic compounds escape instantly\. Seal the thermos immediately when the drawdown ends\./gi, 'Aroma apek. Jika dibiarkan dengan penutup terbuka, senyawa aromatik yang volatil akan segera lepas. Segel termos segera setelah air turun berakhir.')
    .replace(/Rinse the large paper filter with hot water to remove raw paper taste\. Pre-warm the glass\/thermal carafe, then discard rinse water\./gi, 'Bilas filter kertas keranjang besar dengan air panas untuk membuang rasa kertas. Hangatkan carafe kaca/termal, lalu buang air bilasan.')
    .replace(/Turn on brewer\. The shower head executes the first spray cycle to wet the wide bed\. Let bloom for 45 seconds\./gi, 'Nyalakan brewer. Shower head melakukan siklus semprotan pertama untuk membasahi bed lebar. Biarkan mekar (bloom) selama 45 detik.')
    .replace(/Brewer runs the continuous spray program\. The flat-bottom basket maintains a stable, level water column over grounds\./gi, 'Brewer menjalankan program semprotan kontinu. Keranjang flat-bottom mempertahankan kolom air yang stabil dan rata di atas kopi.')
    .replace(/Allow the basket to drain completely\. Swirl the carafe to integrate the stratified brew layers before serving\./gi, 'Biarkan keranjang tiris sepenuhnya. Putar carafe untuk menyatukan lapisan seduhan sebelum disajikan.')
    .replace(/Rinse the heavy paper filter thoroughly\. Shake the grounds in the basket to make the bed perfectly level\. Do not dome in the center\./gi, 'Bilas filter kertas tebal dengan bersih. Goyang kopi di keranjang agar permukaan bed rata sempurna. Jangan membuat gundukan di tengah.')
    .replace(/Optional: Manually pour 100-200ml hot water on the bed to guarantee all dry spots are saturated before machine starts\./gi, 'Opsional: Tuang manual 100-200ml air panas ke atas bed untuk menjamin seluruh area kering basah sebelum mesin dimulai.')
    .replace(/Execute machine brew program\. Water volume is high; monitor the basket to ensure it does not overflow\./gi, 'Jalankan program seduh mesin. Volume air tinggi; pantau keranjang untuk memastikan tidak meluap.')
    .replace(/Let the massive coffee bed drain slowly\. Keep the thermal carafe lid sealed tight to preserve hot steam\./gi, 'Biarkan bed kopi yang besar tiris perlahan. Jaga penutup carafe termal tertutup rapat untuk menahan uap panas.')
    .replace(/Rinse with boiling water to maximize initial machine temperature\. Dose light-roast coffee ground finer\./gi, 'Bilas dengan air mendidih untuk memaksimalkan suhu awal mesin. Gunakan kopi light-roast dengan gilingan lebih halus.')
    .replace(/First pulse cycle wets the bed\. Higher temperature water breaks down hard organic compounds in light roast\./gi, 'Siklus pulsa pertama membasahi bed. Air bersuhu lebih tinggi memecah senyawa organik keras pada light roast.')
    .replace(/Machine runs secondary spray pulses\. The intermittent pause cycles allow water to extract complex fruit acids\./gi, 'Mesin menjalankan pulsa semprotan sekunder. Siklus jeda berkala membiarkan air mengekstrak asam buah yang kompleks.')
    .replace(/Execute the final spray rinse\. The high water column agitates the dense, hard light roast grounds\./gi, 'Lakukan bilasan semprotan akhir. Kolom air tinggi mengagitasi kopi light roast yang keras dan padat.')
    .replace(/Drains quickly due to low soluble silt, resulting in high acidity and bright clarity\./gi, 'Mengalir cepat karena sedikitnya endapan halus larut, menghasilkan keasaman tinggi dan kejernihan cerah.')
    .replace(/Hot Basket Rinse/gi, 'Bilas Keranjang Panas')
    .replace(/Wet the basket filter\. Pre-warm the decanter\. Put coffee in and flatten the bed\./gi, 'Basahi filter keranjang. Hangatkan decanter. Masukkan kopi dan ratakan bed.')
    .replace(/Manually pour hot water from a kettle over the bed, stirring gently with a spoon\. Let bloom for 60 seconds with machine OFF\./gi, 'Tuang manual air panas dari kettle ke atas bed kopi, aduk perlahan dengan sendok. Biarkan mekar selama 60 detik dengan mesin MATI.')
    .replace(/Turn the machine ON\. The shower head continues the brew over a pre-wetted, fully degassed coffee bed\./gi, 'Nyalakan mesin (ON). Shower head melanjutkan seduhan di atas bed kopi yang sudah basah dan membuang gas sepenuhnya.')
    .replace(/Let the coffee drip through completely\. Excellent hybrid extraction with no dry clumps\./gi, 'Biarkan kopi menetes sepenuhnya. Ekstraksi hybrid yang luar biasa tanpa gumpalan kering.')
    .replace(/Fill the thermal thermos with hot water for 3 minutes, then empty it\. This prevents the metal body from stealing coffee temperature\./gi, 'Isi termos termal dengan air panas selama 3 menit, lalu kosongkan. Ini mencegah bodi logam menyerap suhu kopi.')
    .replace(/Concentrated Bloom/gi, 'Bloom Terkonsentrasi')
    .replace(/Shower spray starts\. The fine grind restricts flow slightly to build extra dissolved solids\./gi, 'Semprotan shower dimulai. Gilingan halus membatasi aliran sedikit untuk membangun ekstra zat terlarut.')
    .replace(/Brewer runs spray program directly into the thermal thermos\. Keep the thermos basket seal aligned\./gi, 'Brewer menjalankan program semprotan langsung ke termos termal. Jaga segel keranjang termos tetap lurus.')
    .replace(/Remove the brew basket immediately once flow stops, and seal the thermos lid tight to lock in volatiles\./gi, 'Segera lepas keranjang seduh setelah aliran berhenti, dan segel penutup termos dengan rapat untuk mengunci volatile.')
    // Siphon Styles & Steps
    .replace(/Traditional Vacuum Siphon uses two balanced paddle agitations and cloth filtration to produce an exceptionally clean, sweet, and hot cup\./gi, 'Traditional Vacuum Siphon menggunakan dua adukan paddle seimbang dan filtrasi kain untuk menghasilkan cangkir yang luar biasa bersih, manis, dan panas.')
    .replace(/Cloth filter care\. The cloth filter must be washed and stored in water in the fridge to avoid rancid coffee oil odors\./gi, 'Perawatan filter kain. Filter kain harus dicuci dan disimpan di air di lemari es untuk menghindari bau minyak kopi tengik.')
    .replace(/Competition Triple Agitation introduces three separate, intense paddle agitations to maximize solubles extraction, yielding massive body and intense sweetness\./gi, 'Competition Triple Agitation memperkenalkan tiga adukan paddle terpisah yang intens untuk memaksimalkan ekstraksi zat larut, menghasilkan body tebal dan manis yang intens.')
    .replace(/Dome checking\. Ensure the dome is uniform at the end\. An uneven dome indicates structural channeling inside the cloth filter\./gi, 'Pemeriksaan kubah. Pastikan kubah seragam di akhir. Kubah yang tidak rata menunjukkan channeling struktural di dalam filter kain.')
    .replace(/Low Temperature Delicate reduces heating to brew fragile light roasts at a cooler 86.*C, highlighting floral, tea-like, and highly volatile flavor profiles\./gi, 'Low Temperature Delicate mengurangi pemanasan untuk menyeduh light roast yang rentan pada suhu 86°C yang lebih sejuk, menonjolkan profil rasa floral, mirip teh, dan sangat volatil.')
    .replace(/Premature drop\. If you lower the heat too much, the water column will drop back to the bottom bulb before you finish brewing\. Keep heat stable\./gi, 'Turun prematur. Jika Anda menurunkan panas terlalu banyak, kolom air akan turun kembali ke tabung bawah sebelum Anda selesai menyeduh. Jaga panas tetap stabil.')
    .replace(/High Body Fast Drawdown utilizes a coarse grind and a rapid, short extraction window to capture rich aromatic oils without pulling bitter heavy tannins\./gi, 'High Body Fast Drawdown menggunakan gilingan kasar dan waktu ekstraksi pendek yang cepat untuk menangkap minyak aromatik yang kaya tanpa menarik tannin berat yang pahit.')
    .replace(/Vortex power\. Coarse grounds settle quickly\. If the vortex is too weak, grounds will trap water in the upper chamber\. Swirl firmly\./gi, 'Kekuatan pusaran. Kopi kasar mengendap cepat. Jika pusaran terlalu lemah, bubuk kopi akan menahan air di wadah atas. Putar dengan mantap.')
    .replace(/Spirit Infusion Style introduces organic botanicals or spices directly into the bottom boiler bulb, using vapor distillation to naturally infuse the coffee\./gi, 'Spirit Infusion Style memasukkan bahan organik botani atau rempah langsung ke tabung boiler bawah, menggunakan distilasi uap untuk menginfus kopi secara alami.')
    .replace(/Boiler stains\. Avoid using sticky sugary syrups inside the bottom bulb; high heat will burn the sugar, leaving persistent stains and cracking the glass\./gi, 'Noda boiler. Hindari penggunaan sirup manis lengket di dalam tabung bawah; panas tinggi akan menghanguskan gula, meninggalkan noda membandel dan meretakkan kaca.')
    .replace(/Fill bottom bulb with preheated water\. Fit the top chamber securely with pre-wet cloth filter\. Heat bottom until water rises\./gi, 'Isi tabung bawah dengan air panas. Pasang wadah atas dengan aman dengan filter kain yang basah. Panaskan wadah bawah hingga air naik.')
    .replace(/Add coffee grounds to the upper water column\. Execute a calm, circular stir with a bamboo paddle to wet all coffee\. Let steep\./gi, 'Tambahkan bubuk kopi ke kolom air atas. Lakukan adukan melingkar yang tenang dengan paddle bambu untuk membasahi semua kopi. Biarkan merendam.')
    .replace(/Stir gently one more time to break the coffee crust\. Keep heat stable to hold water in the upper chamber\./gi, 'Aduk perlahan sekali lagi untuk memecah crust kopi. Jaga panas tetap stabil agar air tertahan di wadah atas.')
    .replace(/Remove the heat source\. Execute a final rapid paddle swirl to create a vortex\. The coffee drains down as the bottom bulb cools\./gi, 'Angkat sumber panas. Lakukan putaran paddle cepat terakhir untuk membuat pusaran. Kopi mengalir turun saat tabung bawah mendingin.')
    .replace(/Heat the bottom chamber\. Let water rise\. Lower butane flame slightly to stabilize water temperature around 92.*C\./gi, 'Panaskan wadah bawah. Biarkan air naik. Turunkan api butana sedikit untuk menstabilkan suhu air di sekitar 92°C.')
    .replace(/Dump coffee in and execute a rapid back-and-forth cross stir for 10 seconds to maximize extraction velocity\./gi, 'Masukkan kopi dan lakukan adukan silang bolak-balik yang cepat selama 10 detik untuk memaksimalkan kecepatan ekstraksi.')
    .replace(/Perform a fast concentric paddle swirl to incorporate dense coffee oils floating on the slurry surface\./gi, 'Lakukan putaran paddle konsentris cepat untuk menyatukan minyak kopi tebal yang mengapung di permukaan slurry.')
    .replace(/Remove heat\. Immediately stir in a circle 10 times to form a perfect central dome\. Let vacuum suction pull the brew down\./gi, 'Angkat panas. Segera aduk melingkar 10 kali untuk membentuk kubah tengah yang sempurna. Biarkan sedotan vakum menarik seduhan turun.')
    .replace(/Wait for the final foam dome to form in the top chamber as air bubbles hiss into the bottom bulb\./gi, 'Tunggu kubah busa akhir terbentuk di wadah atas saat gelembung udara berdesis ke dalam tabung bawah.')
    .replace(/Let water rise\. Turn heat down significantly so the water column rests at a gentle 85-88.*C \(ideal for geishas\)\./gi, 'Biarkan air naik. Turunkan panas secara signifikan agar kolom air berada pada suhu 85-88°C yang lembut (ideal untuk geisha).')
    .replace(/Slowly fold the coffee grounds into the water with minimal agitation\. Keep the lid on to preserve volatile jasmine aromas\./gi, 'Lipat perlahan bubuk kopi ke dalam air dengan agitasi minimal. Pasang penutup untuk menjaga aroma melati yang volatil.')
    .replace(/Remove flame\. Wrap the bottom chamber with a damp cool cloth to gently accelerate the siphon suction without burning the coffee\./gi, 'Matikan api. Bungkus tabung bawah dengan kain basah dingin untuk mempercepat sedotan siphon dengan lembut tanpa menghanguskan kopi.')
    .replace(/Boil bottom chamber aggressively\. Let water rise\. Grind coffee coarse \(French Press size\) to ensure an ultra-fast drawdown\./gi, 'Didihkan tabung bawah secara agresif. Biarkan air naik. Giling kopi kasar (ukuran French Press) untuk memastikan air turun yang ultra-cepat.')
    .replace(/Dose grounds\. Stir 5 times in a cross pattern\. Let steep for only 30 seconds to capture sweet primary solids\./gi, 'Masukkan kopi. Aduk 5 kali dengan pola silang. Biarkan merendam hanya 30 detik untuk menangkap zat terlarut utama yang manis.')
    .replace(/Kill heat\. Stir vigorously in circles to create a strong vortex\. The coarse grounds drain down in under 20 seconds\./gi, 'Matikan api. Aduk kuat melingkar untuk membuat pusaran kuat. Kopi gilingan kasar mengalir turun dalam waktu kurang dari 20 detik.')
    .replace(/Add preheated water and clean dried orange peels or botanical herbs into the bottom bulb\. Heat until the vapor rises\./gi, 'Tambahkan air panas dan kulit jeruk kering bersih atau herbal botani ke dalam tabung bawah. Panaskan sampai uap naik.')
    .replace(/Add coffee grounds to the top chamber\. The steam rising from the bottom carries botanical volatile oils into the coffee bed\./gi, 'Tambahkan bubuk kopi ke wadah atas. Uap yang naik dari bawah membawa minyak volatil botani ke dalam bed kopi.')
    .replace(/Execute two gentle paddle folds\. Let the hybrid mixture steep\. The bottom liquid will boil and distill compounds\./gi, 'Lakukan dua lipatan paddle lembut. Biarkan campuran hybrid terendam. Cairan bawah akan mendidih dan mendistilasi senyawa.')
    .replace(/Kill heat\. Swirl paddle and let the vapor cool\. The final cup is a rich, spiced, and beautifully infused beverage\./gi, 'Matikan api. Putar paddle dan biarkan uap mendingin. Cangkir akhir adalah minuman yang kaya rasa, berempah, dan terinfus dengan indah.')
    // Origami Styles & Steps
    .replace(/Cone Dripper style utilizes standard conical papers and Origami's deep air channels to achieve a fast, high-flow drawdown, bringing out stellar floral acidity\./gi, 'Gaya Cone Dripper memanfaatkan kertas konikal standar dan saluran udara dalam Origami untuk mencapai laju air turun yang cepat, memunculkan acidity floral yang luar biasa.')
    .replace(/Fast drawdown check\. If the flow is too fast, grind slightly finer to build adequate contact pressure inside the cone bed\./gi, 'Cek air turun cepat. Jika aliran terlalu cepat, giling sedikit lebih halus untuk membangun tekanan kontak yang memadai di dalam bed cone.')
    .replace(/Wave Dripper style mounts a flat-bottom filter to restrict water flow through the bottom flutes, extending extraction contact to maximize deep sugars and heavy body\./gi, 'Gaya Wave Dripper memasang filter flat-bottom untuk membatasi aliran air melalui lubang bawah, memperpanjang kontak ekstraksi untuk memaksimalkan rasa manis mendalam dan body tebal.')
    .replace(/Crushed ridges\. Take care not to crush the wave filter's paper ridges during installation; deformed ridges will cause uneven side bypass\./gi, 'Gelombang rusak. Berhati-hatilah agar tidak merusak gelombang kertas filter wave saat pemasangan; gelombang yang rusak akan menyebabkan bypass samping tidak merata.')
    .replace(/Mugen One-Pour utilizes a slow, uninterrupted center stream with zero pulse agitations to produce a crystal-clear cup with sweet, delicate undertones\./gi, 'Mugen One-Pour memanfaatkan aliran tengah yang lambat dan tanpa jeda dengan nol agitasi pulsa untuk menghasilkan cangkir yang jernih dengan nuansa manis dan lembut.')
    .replace(/Pour speed\. If you pour too fast, water will overflow the coffee bed\. Keep the flow rate narrow and slow \(approx\. 2-3g\/second\)\./gi, 'Kecepatan tuang. Jika Anda menuang terlalu cepat, air akan meluap dari bed kopi. Jaga laju aliran tetap sempit dan lambat (sekitar 2-3g/detik).')
    .replace(/Iced Origami leverages the fast flow rate of the cone filter to drip a rich, dense concentrate rapidly over ice, preserving sparkling volatiles\./gi, 'Iced Origami memanfaatkan laju air turun filter cone yang cepat untuk meneteskan konsentrat pekat yang kaya dengan cepat di atas es, menjaga volatile yang segar.')
    .replace(/Competition Hybrid Flow combines aggressive high-flow turbulent pulses for brightness with a slow center-drip finish to extract sweet heavy oils\./gi, 'Competition Hybrid Flow menggabungkan pulsa turbulen aliran tinggi yang agresif untuk kecerahan dengan sentuhan tetesan tengah lambat untuk mengekstrak minyak berat yang manis.')
    .replace(/Over-agitation\. Stirring too aggressively in the final phase will cause extreme bitterness and bypass clogging\. Keep the final pour calm\./gi, 'Agitasi berlebih. Mengaduk terlalu agresif di fase akhir akan menyebabkan rasa pahit ekstrem dan penyumbatan bypass. Jaga tuangan akhir tetap tenang.')
    .replace(/Use a V60 cone paper filter\. Wet all grounds quickly with tight concentric circles to initiate degassing\. Wait 40 seconds\./gi, 'Gunakan filter kertas cone V60. Basahi semua bubuk dengan cepat menggunakan lingkaran konsentris rapat untuk memulai degassing. Tunggu 40 detik.')
    .replace(/Pour in slow concentric rings; the 20 deep ribs allow air to vent rapidly, facilitating a fast flow rate\./gi, 'Tuang dalam lingkaran konsentris lambat; 20 rusuk dalam membiarkan udara keluar cepat, memfasilitasi laju aliran yang cepat.')
    .replace(/Complete the volume with a gentle center pour\. Do not swirl the dripper to avoid clogging the exit hole\./gi, 'Selesaikan volume dengan tuangan tengah yang lembut. Jangan memutar (swirl) dripper untuk menghindari penyumbatan lubang keluar.')
    .replace(/Let the brew drain rapidly\. Cone filters highlight high brightness and sparkling acidity\./gi, 'Biarkan seduhan mengalir turun dengan cepat. Filter cone menonjolkan kecerahan tinggi dan acidity yang berkilau.')
    .replace(/Insert a flat-bottom Kalita Wave filter paper\. Pour warm water over the center bed\. Let it saturate evenly\./gi, 'Masukkan filter kertas Kalita Wave flat-bottom. Tuang air hangat ke atas bed tengah. Biarkan jenuh merata.')
    .replace(/Pour in a slow center concentric circle\. The wave ridges restrict bypass flow, maintaining a deep coffee column\./gi, 'Tuang dalam lingkaran konsentris tengah yang lambat. Gelombang flutes membatasi aliran bypass, menjaga kolom kopi tetap dalam.')
    .replace(/Pour gently in the center\. The flat-bottom contact creates high extraction contact time, maximizing sweetness\./gi, 'Tuang lembut di bagian tengah. Kontak flat-bottom menciptakan waktu kontak ekstraksi tinggi, memaksimalkan kemanisan.')
    .replace(/Execute a calm concentric circle to rinse the coffee bed down level\. Let drain\./gi, 'Lakukan lingkaran konsentris yang tenang untuk membasuh bed kopi hingga rata. Biarkan mengalir.')
    .replace(/Flat-bottom extraction yields heavy body, deep chocolate sweetness, and low bitterness\./gi, 'Ekstraksi flat-bottom menghasilkan body tebal, rasa manis cokelat mendalam, dan rasa pahit rendah.')
    .replace(/Use a V60 cone paper\. Rinse with hot water\. Dose coffee slightly coarser, and make a small well in the center\./gi, 'Gunakan kertas cone V60. Bilas dengan air panas. Gunakan kopi sedikit lebih kasar, dan buat lubang kecil di tengah.')
    .replace(/Pour all water continuously in a highly controlled, very slow center stream\. Total pour duration should take exactly 90 seconds\./gi, 'Tuang semua air terus-menerus dalam aliran tengah yang sangat terkontrol dan lambat. Durasi penuangan total harus memakan waktu tepat 90 detik.')
    .replace(/Let the water percolate through the bed completely\. Heavy sweetness and extreme clarity due to zero agitation\./gi, 'Biarkan air meresap melalui bed sepenuhnya. Kemanisan tebal dan kejernihan ekstrem karena nol agitasi.')
    .replace(/Fit a cone filter\. Place 130g of clean ice in the server\. Wet grounds with aggressive high-temperature concentric circles\./gi, 'Pasang filter cone. Siapkan 130g es bersih di server. Basahi kopi dengan lingkaran konsentris suhu tinggi yang agresif.')
    .replace(/Pour rapidly in the center\. High flow rate is critical to dissolve dense solids before the ice melting begins\./gi, 'Tuang cepat di bagian tengah. Laju aliran tinggi penting untuk melarutkan zat terlarut pekat sebelum pelelehan es dimulai.')
    .replace(/Execute a fast final circle to top up the volume\. The high water pressure agitates grounds deeply\./gi, 'Lakukan lingkaran akhir yang cepat untuk menambah volume. Tekanan air tinggi mengagitasi kopi secara mendalam.')
    .replace(/The concentrate drips directly over ice, chilling instantly and preserving bright, citrusy acidity\./gi, 'Konsentrat menetes langsung di atas es, mendingin instan dan menjaga acidity citrus yang cerah.')
    .replace(/Pour aggressively in center circles and stir gently 3 times with a spoon to wet all grounds\. Let bloom 35 seconds\./gi, 'Tuang agresif dalam lingkaran tengah dan aduk perlahan 3 kali dengan sendok untuk membasahi semua kopi. Let bloom 35 detik.')
    .replace(/Pour in rapid concentric circles, climbing up the dry filter walls to wash high grounds down into the slurry\./gi, 'Tuang dalam lingkaran konsentris cepat, naik ke dinding filter kering untuk membasuh kopi di atas turun ke slurry.')
    .replace(/Pour the final portion in an extremely slow, calm center stream to let the fine bed settle and extract deep sweetness\./gi, 'Tuang porsi akhir dalam aliran tengah yang sangat lambat dan tenang untuk membiarkan bed kopi mengendap dan mengekstrak manis mendalam.')
    .replace(/Allow the bed to settle completely flat\. Excellent complex acidity coupled with a sweet, long finish\./gi, 'Biarkan bed mengendap rata sempurna. Acidity kompleks luar biasa dipadukan dengan finish manis yang panjang.')
    // April Styles & Steps
    .replace(/April Flat Bottom Standard utilizes April's signature 4-pulse pattern \(balancing circular and center streams\) to achieve high clarity and a beautiful, sweet balance\./gi, 'April Flat Bottom Standard menggunakan pola 4-pulse khas April (menyeimbangkan aliran memutar dan tengah) untuk mencapai kejernihan tinggi dan keseimbangan manis yang indah.')
    .replace(/Keep stream low\. Pouring from too high will agitate grounds excessively, pushing micro-fines into the bottom paper flutes and clogging drawdown\./gi, 'Jaga aliran tetap rendah. Menuangkan dari terlalu tinggi akan mengagitasi kopi secara berlebih, mendorong fines ke flutes kertas bawah dan menyumbat air turun.')
    .replace(/April Continuous Slow relies on an extremely slow, stable pour with zero pauses to keep slurry temperature high, maximizing sweet sugar extraction\./gi, 'April Continuous Slow mengandalkan tuangan yang sangat lambat dan stabil tanpa jeda untuk menjaga suhu slurry tetap tinggi, memaksimalkan ekstraksi gula manis.')
    .replace(/April Flat Bottom Standard/gi, 'April Flat Bottom Standar')
    .replace(/April Continuous Slow/gi, 'April Kontinu Lambat')
    .replace(/Competition Two-Pour/gi, 'Dua Tuangan Kompetisi')
    .replace(/Iced April Style/gi, 'Gaya April Es')
    .replace(/High Body Heavy Dose/gi, 'Dosis Berat Body Tebal')
    .replace(/Competition Two-Pour uses two large, heavy-flow pours to create intense slurry agitation, highlighting sparkling acidity and bright tropical notes\./gi, 'Competition Two-Pour menggunakan dua tuangan bervolume besar aliran tinggi untuk membuat agitasi slurry yang intens, menonjolkan acidity yang segar dan aroma tropis yang cerah.')
    .replace(/Iced April Style extracts a highly concentrated, rich yield directly over ice, capturing sweet Scandinavian profiles in a cold, refreshing format\./gi, 'Iced April Style mengekstrak hasil seduh pekat yang kaya langsung di atas es, menangkap profil Skandinavia yang manis dalam format dingin yang menyegarkan.')
    .replace(/High Body Heavy Dose leverages tight center pulses and restricted bypass to force water through the deep coffee column, extracting heavy, chocolate-sweet compounds\./gi, 'High Body Heavy Dose memanfaatkan pulsa tengah yang rapat dan batasan bypass untuk memaksa air melewati kolom kopi yang dalam, mengekstrak senyawa cokelat manis yang tebal.')
    .replace(/Pour 50% circular and 50% center water\. Wet grounds evenly and let bloom for 35 seconds to allow gas escape\./gi, 'Tuang 50% memutar and 50% air tengah. Basahi kopi merata dan let bloom selama 35 detik untuk membuang gas.')
    .replace(/Pour in medium concentric circles; keep water stream close to the coffee bed\. Maintain slow, even flow\./gi, 'Tuang dalam lingkaran konsentris sedang; jaga aliran air tetap dekat dengan bed kopi. Jaga aliran lambat dan merata.')
    .replace(/Execute a straight center pour to push extraction in the deepest part of the flat-bottom bed\./gi, 'Lakukan tuangan tengah lurus untuk mendorong ekstraksi di bagian terdalam dari bed flat-bottom.')
    .replace(/Pour the final portion in concentric rings to wash the bed flat\. Let it drain completely\./gi, 'Tuang porsi akhir dalam lingkaran konsentris untuk membasuh bed hingga rata. Biarkan tiris sepenuhnya.')
    .replace(/Drains slowly and evenly\. Flat-bottom geometry yields exceptional sweetness and complex clean flavors\./gi, 'Mengalir turun lambat dan merata. Geometri flat-bottom menghasilkan rasa manis luar biasa dan rasa bersih yang kompleks.')
    .replace(/Pour water continuously in a highly controlled, very slow center spiral\. Avoid fast circles\. Total stream should take exactly 100 seconds\./gi, 'Tuang air terus-menerus dalam spiral tengah yang sangat terkontrol dan lambat. Hindari lingkaran cepat. Aliran total harus memakan waktu tepat 100 detik.')
    .replace(/Let the water drain through the bed completely\. The continuous flow minimizes agitation, leading to maximum sweetness\./gi, 'Biarkan air mengalir melalui bed sepenuhnya. Aliran kontinu meminimalkan agitasi, menghasilkan rasa manis maksimal.')
    .replace(/Pour aggressively in concentric circles to wet all grounds quickly\. Let bloom for 30 seconds\./gi, 'Tuang agresif dalam lingkaran konsentris untuk membasahi semua kopi dengan cepat. Let bloom selama 30 detik.')
    .replace(/Pour 60% circular, 40% center rapidly\. Build a high water column to agitate grounds deeply, forcing high acid release\./gi, 'Tuang cepat 60% memutar, 40% tengah. Bangun kolom air tinggi untuk mengagitasi kopi secara mendalam, memicu pelepasan keasaman tinggi.')
    .replace(/Execute a fast, heavy center pour\. The high head pressure extracts complex fruit notes\. Let drain\./gi, 'Lakukan tuangan tengah bervolume besar yang cepat. Tekanan air tinggi mengekstrak aroma buah yang kompleks. Biarkan tiris.')
    .replace(/Place 120g of clean ice in the server\. Pour boiling water over grounds in circular rings\. Let bloom for 30 seconds\./gi, 'Siapkan 120g es bersih di server. Tuang air mendidih ke atas kopi giling dengan gerakan memutar. Let bloom selama 30 detik.')
    .replace(/Pour rapidly in tight concentric circles to extract dense sugars\. Maintain a high temperature slurry\./gi, 'Tuang cepat dalam lingkaran konsentris rapat untuk mengekstrak gula pekat. Jaga suhu slurry hangat.')
    .replace(/Pour the final portion in the center\. The dense coffee concentrate drips directly over ice to chill instantly\./gi, 'Tuang porsi akhir di bagian tengah. Konsentrat kopi yang kental menetes langsung di atas es untuk mendingin instan.')
    .replace(/Swirl the chilled coffee to melt the remaining ice, ensuring a rich, non-watery cold pour-over\./gi, 'Putar kopi dingin untuk melelehkan sisa es, memastikan cold pour-over yang tebal dan tidak berair.')
    .replace(/Saturate the thick bed with concentric circles\. Let bloom for 40 seconds to completely de-gas the heavy coffee dose\./gi, 'Basahi bed tebal dengan lingkaran konsentris. Let bloom selama 40 detik untuk membuang gas dari dosis kopi yang berat sepenuhnya.')
    .replace(/Pour in extremely tight concentric circles around the center\. Avoid pouring near the edges to prevent bypass\./gi, 'Tuang dalam lingkaran konsentris yang sangat rapat di sekitar tengah. Hindari menuang dekat pinggir untuk mencegah bypass.')
    .replace(/Pour second portion in the center, keeping water level low to restrict bypass flow along the paper ribs\./gi, 'Tuang porsi kedua di bagian tengah, menjaga level air tetap rendah untuk membatasi aliran bypass di sepanjang rusuk kertas.')
    .replace(/Final gentle circular pulse to settle the heavy bed level\. Let drain completely\./gi, 'Pulsa memutar lembut akhir untuk meratakan bed tebal. Biarkan tiris sepenuhnya.')
    .replace(/Let the heavy bed drain fully\. Rich, creamy mouthfeel, low acidity, and heavy sweet body\./gi, 'Biarkan bed yang berat tiris sepenuhnya. Sensasi mulut yang kaya dan lembut, keasaman rendah, dan body manis yang tebal.')
    // Melitta Styles & Steps
    .replace(/Traditional Melitta One-Pour relies on the restricted bottom hole flow rate and trapezoid wedge geometry to extract coffee evenly with minimal manual pouring effort\./gi, 'Traditional Melitta One-Pour mengandalkan laju aliran lubang bawah yang terbatas dan geometri wedge trapezoid untuk mengekstrak kopi secara merata dengan upaya penuangan manual minimal.')
    .replace(/Check bottom hole blockage\. Old coffee residues inside the tiny bottom hole will restrict drainage, making drawdown extremely slow and bitter\. Clean thoroughly\./gi, 'Periksa sumbatan lubang bawah. Sisa kopi lama di dalam lubang bawah yang kecil akan membatasi aliran, membuat air turun sangat lambat dan pahit. Bersihkan secara menyeluruh.')
    .replace(/Aromaboy Style is custom-calibrated for tiny specialty coffee doses \(8-12g\), using micro oval pulses to keep the shallow bed hot and avoid under-extraction\./gi, 'Aromaboy Style dikalibrasi khusus untuk dosis kopi kecil (8-12g), menggunakan pulsa oval mikro untuk menjaga bed yang dangkal tetap hangat dan menghindari kurang ekstraksi.')
    .replace(/Bed depth\. Small doses create a very thin bed\. Keep your pour flow extremely narrow to avoid piercing the paper filter\./gi, 'Kedalaman bed. Dosis kecil membuat bed sangat tipis. Jaga aliran penuangan tetap sangat sempit agar tidak menembus kertas filter.')
    .replace(/Three Pour Melitta splits water volume into three slow oval pulses to extend contact time, maximizing sweet chocolate oils and balancing rustic body\./gi, 'Three Pour Melitta membagi volume air menjadi tiga pulsa oval lambat untuk memperpanjang waktu kontak, memaksimalkan minyak cokelat yang manis dan menyeimbangkan body yang tebal.')
    .replace(/High water line\. Avoid pouring too high on the trapezoid side ribs; water will bypass the bed entirely through the paper seams\./gi, 'Garis air tinggi. Hindari menuang terlalu tinggi pada rusuk sisi trapezoid; air akan membypass bed sepenuhnya melalui jahitan kertas.')
    .replace(/Iced Melitta Brew leverages the restricted bottom flow of the trapezoid wedge to extract a highly concentrated, rich coffee yield directly over ice\./gi, 'Iced Melitta Brew memanfaatkan aliran bawah yang terbatas dari wedge trapezoid untuk mengekstrak hasil seduh kopi yang sangat pekat langsung di atas es.')
    .replace(/Dense Classic Extraction utilizes a fine grind and extended contact time inside the trapezoid dripper to extract heavy sweet compounds, reminiscent of classic dark-chocolate roasts\./gi, 'Dense Classic Extraction menggunakan gilingan halus dan waktu kontak yang lama di dalam dripper trapezoid untuk mengekstrak senyawa manis yang tebal, mengingatkan pada sangrai cokelat gelap klasik.')
    .replace(/Dry sputtering\. If the drawdown takes too long \(over 4 minutes\), the coffee will turn dry and astringent\. Coarsen grind slightly on next attempt\./gi, 'Semburan kering. Jika air turun memakan waktu terlalu lama (lebih dari 4 menit), kopi akan terasa kering dan sepat. Giling sedikit lebih kasar pada seduhan berikutnya.')
    .replace(/Wet the trapezoidal coffee bed evenly\. Because the wedge bottom is narrow, ensure all dry corners in the bottom fold are wet\. Bloom 35 seconds\./gi, 'Basahi bed kopi trapezoid secara merata. Karena dasar wedge sempit, pastikan semua sudut kering di lipatan bawah basah. Let bloom 35 detik.')
    .replace(/Pour slowly in a long oval spiral \(matching the wedge geometry\) until the dripper is filled\. Let it drain continuously\./gi, 'Tuang perlahan dalam spiral oval panjang (sesuai geometri wedge) sampai dripper penuh. Biarkan mengalir terus-menerus.')
    .replace(/Allow water to drip through the 1 or 2 small holes at the bottom\. The trapezoid shape provides stable, classic extraction\./gi, 'Biarkan air menetes melalui 1 atau 2 lubang kecil di bagian bawah. Bentuk trapezoid menghasilkan ekstraksi klasik yang stabil.')
    .replace(/For small doses \(8-10g\), bloom gently with a tiny splash of water\. Let sit for 30 seconds\./gi, 'Untuk dosis kecil (8-10g), bloom perlahan dengan sedikit air. Diamkan selama 30 detik.')
    .replace(/Pour in a small, tight oval circle in the center\. The narrow wedge bed extracts solids efficiently\./gi, 'Tuang dalam lingkaran oval kecil yang rapat di bagian tengah. Bed wedge yang sempit mengekstrak zat terlarut secara efisien.')
    .replace(/Execute a final gentle oval pulse\. Let the small column drain rapidly\./gi, 'Lakukan pulsa oval lembut terakhir. Biarkan kolom kecil tiris dengan cepat.')
    .replace(/Let the small volume drain completely\. Classic, cozy, and highly aromatic micro-brew\./gi, 'Biarkan volume kecil mengalir sepenuhnya. Seduhan mikro klasik, nyaman, dan sangat aromatik.')
    .replace(/Pour in an oval pattern\. Wet all grounds and let bloom for 40 seconds\./gi, 'Tuang dalam pola oval. Basahi semua bubuk kopi dan let bloom selama 40 seconds.')
    .replace(/Pour in slow oval circles\. Keep water level medium\. The flat wedge walls help to extract rich, sweet chocolate notes\./gi, 'Tuang dalam lingkaran oval lambat. Jaga tingkat air sedang. Dinding wedge yang datar membantu mengekstrak minyak cokelat manis yang kaya.')
    .replace(/Pour the final portion in an oval concentric pattern\. Settle the coffee bed level and let it drain\./gi, 'Tuang porsi akhir dalam pola konsentris oval. Atur bed kopi agar rata dan biarkan mengalir.')
    .replace(/Trapezoidal wedge extraction filters out bitter tannins, delivering a smooth, comforting classic coffee\./gi, 'Ekstraksi wedge trapezoid menyaring tannin pahit, menyajikan kopi klasik yang lembut dan menenangkan.')
    .replace(/Place 120g of clean ice in the server\. Pour boiling water over grounds in an oval shape\. Let bloom for 30 seconds\./gi, 'Siapkan 120g es bersih di server. Tuang air mendidih ke atas kopi giling dalam gerakan oval. Let bloom selama 30 detik.')
    .replace(/Pour in rapid oval circles to extract dense sugars\. Keep grind finer to resist flow and increase dissolved solids\./gi, 'Tuang dalam lingkaran oval cepat untuk mengekstrak gula pekat. Giling lebih halus untuk menahan aliran dan menaikkan zat larut.')
    .replace(/Pour the final portion in the center\. The dense wedge concentrate drips directly over ice to chill instantly\./gi, 'Tuang porsi akhir di bagian tengah. Konsentrat wedge kental menetes langsung di atas es untuk mendingin instan.')
    .replace(/Swirl the chilled coffee to melt the remaining ice, ensuring a rich, non-watery cold trapezoid pour-over\./gi, 'Putar kopi dingin untuk melelehkan sisa es, memastikan cold trapezoid pour-over yang tebal dan tidak berair.')
    .replace(/Pour a tight center oval\. Let bloom for 45 seconds\. The fine grind requires extra time to degas properly\./gi, 'Tuang oval pusat yang rapat. Let bloom selama 45 detik. Gilingan halus membutuhkan waktu ekstra untuk membuang gas dengan baik.')
    .replace(/Pour in extremely slow concentric ovals\. The fine grind restricts flow, causing water to build contact time\./gi, 'Tuang dalam gerakan oval konsentris yang sangat lambat. Gilingan halus membatasi aliran, menyebabkan air membangun waktu kontak.')
    .replace(/Pour final portion slowly in the center\. Allow a long, slow percolation through the trapezoidal paper wedge\./gi, 'Tuang porsi akhir perlahan di bagian tengah. Biarkan perkolasi lambat yang panjang melalui kertas wedge trapezoid.')
    .replace(/Allow dripper to drain fully\. The long extraction window captures rich bitter-chocolate and heavy sweet notes\./gi, 'Biarkan dripper tiris sepenuhnya. Waktu ekstraksi yang lama menangkap rasa cokelat pahit yang kaya dan kemanisan tebal.')
    // Kono Meimon Styles & Steps
    .replace(/Kono Meimon Traditional/gi, 'Kono Meimon Tradisional')
    .replace(/Kono Dripper Standard/gi, 'Kono Dripper Standar')
    .replace(/Kono Slow Drip Body/gi, 'Kono Tetes Lambat')
    .replace(/Iced Kono Meimon/gi, 'Kono Meimon Es')
    .replace(/Kono Agitation Sweet/gi, 'Kono Agitasi Manis')
    .replace(/Kono Meimon Traditional uses Kono's signature "center dripping" method\. Wetting only the center initially forces water through the deepest coffee column, delivering unparalleled sweetness and heavy body\./gi, 'Kono Meimon Tradisional menggunakan metode khas "tetesan tengah" Kono. Membasahi hanya bagian tengah di awal memaksa air melewati kolom kopi terdalam, menyajikan manis tanpa tanding dan body tebal.')
    .replace(/Spill out of center\. If you pour water outside the center early on, it will bypass through the smooth upper paper, resulting in a thin, watery cup\./gi, 'Melenceng dari tengah. Jika Anda menuang air di luar bagian tengah sejak awal, air akan membypass melalui kertas atas yang halus, menghasilkan cangkir yang tipis dan berair.')
    .replace(/Kono Dripper Standard utilizes standard concentric pulsing but leverages Kono's short bottom ribs to slow down the flow rate, enhancing mouthfeel and sweetness\./gi, 'Kono Dripper Standar menggunakan pulsa konsentris standar tetapi memanfaatkan rusuk bawah Kono yang pendek untuk memperlambat laju aliran, meningkatkan rasa di mulut dan kemanisan.')
    .replace(/Bypass control\. Keep the water level moderate to avoid high-level bypass through the smooth upper cone wall\./gi, 'Kontrol bypass. Jaga level air sedang untuk menghindari bypass tingkat tinggi melalui dinding cone atas yang halus.')
    .replace(/Kono Slow Drip Body mimics cold-drip percolation by dripping hot water slowly through a tight central column, delivering a highly syrupy, heavy-bodied cup\./gi, 'Kono Tetes Lambat meniru perkolasi tetes dingin dengan meneteskan air panas secara lambat melalui kolom pusat yang rapat, menghasilkan cangkir ber-body tebal sepekat sirup.')
    .replace(/Bitter over-extraction\. Because the flow is very slow, ensure the final flush is fast and quick to prevent late bitter compounds from extracting\./gi, 'Ekstraksi pahit berlebih. Karena aliran sangat lambat, pastikan bilasan akhir berjalan cepat untuk mencegah terekstraksinya senyawa pahit akhir.')
    .replace(/Iced Kono Meimon utilizes the slow center-dripping method directly over ice to extract an incredibly sweet, syrupy concentrate before ice dilution takes place\./gi, 'Iced Kono Meimon menggunakan metode tetesan tengah lambat langsung di atas es untuk mengekstrak konsentrat manis sepekat sirup sebelum pengenceran es terjadi.')
    .replace(/Ice melting\. Use solid cold ice cubes; weak ice melts instantly during center dripping, making the beverage watery\./gi, 'Pelelehan es. Gunakan es batu dingin yang padat; es yang rapuh meleleh instan selama tetesan tengah, membuat minuman menjadi encer.')
    .replace(/Kono Agitation Sweet combines initial turbulent agitation with a slow center-drip finish to extract highly volatile sweet aromatics and complex organic oils\./gi, 'Kono Agitasi Manis menggabungkan agitasi turbulen awal dengan sentuhan tetesan tengah lambat untuk mengekstrak aromatik manis yang sangat volatil dan minyak organik kompleks.')
    .replace(/Bitter tail\. Do not agitate in the final pour; keep it calm and center-focused to avoid extracting late bitter chlorogenic acids\./gi, 'Ujung pahit. Jangan mengagitasi pada penuangan akhir; jaga tetap tenang dan fokus ke tengah untuk menghindari ekstraksi asam klorogenat pahit akhir.')
    .replace(/Drip hot water drop-by-drop strictly in the absolute center of the bed\. The top paper walls must stay completely dry\. Continue for 40 seconds\./gi, 'Teteskan air panas tetes demi tetes tepat di bagian tengah bed kopi. Dinding kertas atas harus tetap kering sepenuhnya. Lanjutkan selama 40 detik.')
    .replace(/Gradually increase flow rate in a tiny center circle \(size of a coin\)\. The coffee bed swells and forms a dome\. Let it build\./gi, 'Secara bertahap naikkan laju aliran dalam lingkaran tengah kecil (seukuran koin). Bed kopi akan mengembang dan membentuk kubah. Biarkan terbentuk.')
    .replace(/Pour in a slow widening spiral\. Do not touch the filter paper\. The water level rises, washing sweet coffee oils down\./gi, 'Tuang dalam spiral yang melebar lambat. Jangan menyentuh kertas filter. Level air naik, membasuh minyak kopi yang manis turun.')
    .replace(/Pour rapidly in a wide spiral to flush the final volume\. The smooth upper cone acts like a funnel, draining fast\./gi, 'Tuang cepat dalam spiral lebar untuk membilas volume akhir. Bagian atas cone yang halus bertindak seperti corong, tiris dengan cepat.')
    .replace(/Allow drawdown to drain\. Since the ribs are only at the bottom, water is forced through the central column, maximizing sweetness\./gi, 'Biarkan air turun mengalir. Karena rusuk hanya di bagian bawah, air dipaksa melewati kolom tengah, memaksimalkan kemanisan.')
    .replace(/Wet grounds in slow concentric circles\. Wait 40 seconds\. Kono's short ribs slow the drawdown compared to V60\./gi, 'Basahi kopi dalam lingkaran konsentris lambat. Tunggu 40 detik. Rusuk pendek Kono memperlambat air turun dibandingkan dengan V60.')
    .replace(/Pour in tight center concentric circles\. The slurry rises, extracting rich, sweet chocolate notes\./gi, 'Tuang dalam lingkaran konsentris tengah yang rapat. Slurry naik, mengekstrak rasa cokelat yang manis dan kaya.')
    .replace(/Pour the final portion evenly\. Settle the bed level and let it drain\./gi, 'Tuang porsi akhir secara merata. Atur agar bed kopi rata dan biarkan mengalir.')
    .replace(/Let the bed drain completely\. Exceptional sweetness and thick, coating mouthfeel\./gi, 'Biarkan bed tiris sepenuhnya. Kemanisan luar biasa dan sensasi mulut tebal yang menyelimuti.')
    .replace(/Drip water slowly in the absolute center\. Keep this dripping cadence for 60 seconds to pre-extract rich oils\./gi, 'Teteskan air lambat tepat di bagian tengah. Jaga ketukan tetesan ini selama 60 detik untuk mempra-ekstrak minyak kaya.')
    .replace(/Pour in a slow coin-sized spiral\. The water level must rise very slowly, keeping the slurry thick and highly concentrated\./gi, 'Tuang dalam spiral lambat seukuran koin. Tingkat air harus naik sangat lambat, menjaga slurry tetap tebal dan sangat pekat.')
    .replace(/Pour a second coin-sized spiral, holding the flow rate low\. Agitation is minimal\./gi, 'Tuang spiral kedua seukuran koin, menjaga laju aliran tetap rendah. Agitasi minimal.')
    .replace(/Pour rapidly in a wide spiral to flush the remaining volume\. Allow drawdown to drain\./gi, 'Tuang cepat dalam spiral lebar untuk membilas sisa volume. Biarkan air turun mengalir.')
    .replace(/Drains slowly\. Massive body, viscous texture, and highly sweet syrupy finish\./gi, 'Tiris lambat. Body sangat tebal, tekstur kental, dan finish manis sepekat sirup.')
    .replace(/Place 130g of clean ice in the server\. Wet the center bed with drop-by-drop boiling water\. Let bloom for 35 seconds\./gi, 'Siapkan 130g es bersih di server. Basahi bed tengah dengan air mendidih tetes demi tetes. Let bloom selama 35 detik.')
    .replace(/Pour in a slow, tight coin-sized center spiral to extract dense sugars\. Maintain a high temperature slurry\./gi, 'Tuang dalam spiral tengah yang lambat dan rapat seukuran koin untuk mengekstrak gula pekat. Jaga suhu slurry hangat.')
    .replace(/Pour a final rapid concentric ring to flush the concentrate\. Let the rich extract drop directly over ice\./gi, 'Tuang lingkaran konsentris cepat terakhir untuk membilas konsentrat. Biarkan ekstrak yang kaya menetes langsung di atas es.')
    .replace(/Swirl the server to melt ice\. Rich, aromatic, and exceptionally sweet iced Kono pour-over\./gi, 'Putar server untuk melelehkan es. Kopi es Kono yang kaya, aromatik, dan luar biasa manis.')
    .replace(/Pour rapidly in the center\. Stir gently 3 times with a spoon to agitate all grounds\. Let bloom for 35 seconds\./gi, 'Tuang cepat di bagian tengah. Aduk perlahan 3 kali dengan sendok untuk mengagitasi kopi. Let bloom selama 35 detik.')
    .replace(/Pour in rapid circular rings, creating turbulence inside the Kono bottom\. The short ribs keep slurry high\./gi, 'Tuang dalam lingkaran cepat, membuat turbulensi di dasar Kono. Rusuk yang pendek menjaga slurry tetap tinggi.')
    .replace(/Pour the final portion in an extremely slow center stream to settle the coffee bed flat and wash grounds down\./gi, 'Tuang porsi akhir dalam aliran tengah yang sangat lambat untuk meratakan bed kopi dan membasuh kopi turun.')
    .replace(/Let the bed settle completely flat\. Beautiful complex sweetness, balanced acidity, and heavy mouthfeel\./gi, 'Biarkan bed mengendap rata sempurna. Kemanisan kompleks yang indah, keasaman seimbang, dan sensasi mulut yang tebal.')
    .replace(/Allow a slow, heavy drawdown to finish\. Yields maximum body\./gi, 'Biarkan air turun yang lambat dan berat selesai. Menghasilkan body maksimal.')
    // AeroPress dynamic cues localization
    .replace(/Wet and shrink the coffee bed; due to chamber limits, bloom with 30 ml for 20s\./gi, 'Basahi dan susutkan hamparan kopi; karena batas ruang seduh, lakukan blooming dengan 30 ml selama 20 detik.')
    .replace(/Due to physical chamber limits for high volume upright brews, wet and shrink the coffee bed first by blooming with 30 ml for 20 seconds before adding the remaining water\./gi, 'Karena batas kapasitas fisik ruang seduh untuk metode tegak bervolume tinggi, basahi dan susutkan hamparan kopi dengan blooming 30 ml selama 20 detik sebelum menuang sisa air.')
    .replace(/Pour remaining water to target volume and let immersion start\./gi, 'Tuangkan sisa air sampai target volume dan biarkan rendaman dimulai.')
    .replace(/Pour the remaining water steadily to reach the target volume for the main immersion phase\./gi, 'Tuangkan sisa air secara stabil untuk mencapai target volume pada fase rendam utama.')
    .replace(/Safety Warning: Make sure the plunger is inserted at least 2 cm into the chamber before flipping the AeroPress!/gi, 'Peringatan keamanan: Pastikan penekan masuk minimal 2 cm ke dalam ruang seduh sebelum AeroPress dibalik!')
    .replace(/Safety Warning: Make sure the press plunger is inserted at least 2 cm into the AeroPress chamber before flipping!/gi, 'Peringatan keamanan: Pastikan penekan masuk minimal 2 cm ke dalam ruang seduh AeroPress sebelum dibalik!')
    .replace(/Use 5x aggressive Cross-Stir \(North-South, East-West\) to increase extraction\./gi, 'Gunakan adukan silang (Cross-Stir) 5x agresif (Utara-Selatan, Barat-Timur) untuk menaikkan ekstraksi.')
    .replace(/Stir vigorously 5 times using back-and-forth cross motions \(North-South, East-West\) to maximize kinetic energy and build body, then attach the plunger\./gi, 'Aduk kuat 5 kali menggunakan gerakan silang maju-mundur (Utara-Selatan, Barat-Timur) untuk memaksimalkan energi kinetik dan membentuk tekstur, lalu pasang penekan.')
    .replace(/Swirl gently 2 times and let the slurry settle; avoid paddle contact to keep clarity high\./gi, 'Goyang memutar lembut 2 kali dan biarkan campuran kopi tenang; hindari adukan sendok agar kejernihan tetap tinggi.')
    .replace(/Gently swirl the entire AeroPress in circular motions 2 times\. Do not stir with a spoon\/paddle to prevent fines from clogging the filter, preserving a high-clarity profile\./gi, 'Goyang memutar seluruh AeroPress perlahan 2 kali. Jangan aduk memakai sendok untuk mencegah ampas halus menyumbat filter, menjaga profil kejernihan tinggi.')
    .replace(/Use 3x intense Cross-Stir to mix the concentrate slurry\./gi, 'Gunakan adukan silang 3x intens untuk meratakan konsentrat.')
    .replace(/Stir intensely 3 times in cross directions \(North-South, East-West\) to build extraction in the small volume, then secure the plunger\./gi, 'Aduk intens 3 kali dalam arah silang (Utara-Selatan, Barat-Timur) untuk membangun ekstraksi pada volume kecil, lalu pasang penekan.')
    .replace(/Stir gently 4 times in a circular motion, then secure the cap\./gi, 'Aduk melingkar lembut 4 kali, lalu pasang penutup filter.')
    .replace(/Stir 4 times memutar \(circular\) gently, then secure the cap\./gi, 'Aduk melingkar lembut 4 kali, lalu pasang penutup filter.')
    .replace(/Stir 4 times in a calm circular motion to distribute grounds evenly in the inverted chamber before securing the filter cap\./gi, 'Aduk 4 kali dengan gerakan melingkar tenang untuk meratakan bubuk kopi di dalam chamber terbalik sebelum memasang penutup filter.')
    .replace(/Use 3x Cross-Stir to wet all grounds quickly\./gi, 'Gunakan adukan silang (Cross-Stir) 3x untuk membasahi semua bubuk kopi dengan cepat.')
    .replace(/Stir 3 times in cross directions \(North-South, East-West\) to wet the high dose coffee rapidly\./gi, 'Aduk 3 kali dalam arah silang (Utara-Selatan, Barat-Timur) untuk membasahi kopi dosis tinggi secara cepat.')
    .replace(/Use 3x gentle Cross-Stir \(North-South, East-West\) to wet all grounds\./gi, 'Gunakan adukan silang (Cross-Stir) 3x lembut (Utara-Selatan, Barat-Timur) untuk membasahi semua bubuk kopi.')
    .replace(/Stir 3 times gently in back-and-forth cross motions \(North-South, East-West\) to settle the coffee bed and ensure even extraction\./gi, 'Aduk 3 kali dengan lembut dalam gerakan silang maju-mundur (Utara-Selatan, Barat-Timur) untuk meratakan bed kopi dan menjamin ekstraksi merata.')
    .replace(/Press steadily and stop before the hiss to keep the cup clean\./gi, 'Tekan secara stabil dan berhenti sebelum desis agar cangkir tetap jernih.')
    .replace(/Press steadily with light pressure, stopping at the first hiss to keep the finish clean and limit fines carry-over\./gi, 'Tekan secara stabil dengan tekanan ringan, berhenti saat desis pertama agar akhir rasa tetap bersih dan ampas halus tidak terbawa berlebih.')
    .replace(/Press steadily with light pressure, stopping exactly when you hear the first hissing sound to avoid extracting heavier, bitter oils\./gi, 'Tekan secara stabil dengan tekanan ringan, berhenti saat desis pertama agar akhir rasa tetap bersih dan ampas halus tidak terbawa berlebih.')
    .replace(/Press concentrate steadily and stop before the hiss\./gi, 'Tekan konsentrat secara stabil dan berhenti sebelum desis.')
    .replace(/Press the concentrate steadily, stopping before the hiss to keep it sweet and clean, then dilute with bypass water in the cup\./gi, 'Tekan konsentrat secara stabil, berhenti sebelum desis untuk menjaganya manis dan bersih, lalu encerkan dengan air bypass di dalam cangkir.')
    .replace(/Press steadily and press completely through the hiss\./gi, 'Tekan secara stabil dan tekan terus hingga desis selesai.')
    .replace(/Apply steady pressure and press completely through the hiss to carry more oils and texture into the cup\./gi, 'Berikan tekanan stabil dan tekan habis melewati desis agar lebih banyak minyak dan tekstur ikut turun ke cangkir.')
    .replace(/Apply firm force and press completely through the hiss to extract the rich oils and lipids that build the body\./gi, 'Berikan tekanan stabil dan tekan habis melewati desis agar lebih banyak minyak dan tekstur ikut turun ke cangkir.')
    .replace(/Press slowly and completely through the hiss to extract sweetness and roundness from the inverted immersion\./gi, 'Tekan perlahan dan habis melewati desis untuk mengekstrak rasa manis dan kebulatan dari rendaman terbalik.')
    .replace(/Press steadily with light, constant pressure completely through the hiss to capture the full sweet range of the extraction\./gi, 'Tekan secara stabil dengan tekanan ringan yang konstan hingga habis melewati desis untuk menangkap spektrum manis ekstraksi yang utuh.');

  return polishIndonesianBaristaCopy(localizeCriticalUiTerms(localizeBeanProfileSummary(localized)));
}

export function localizeAiBrewSummary(plan: Pick<
  BrewPlan,
  'brewMode' | 'methodFamily' | 'coffeeName' | 'dripper' | 'targetProfileId' | 'targetProfileLabel' | 'recommendedRatio' | 'finalBeverageRatio' | 'hotExtractionRatio' | 'waterTempC' | 'totalTimeSeconds'
> & Partial<Pick<BrewPlan, 'doseG' | 'totalWaterMl' | 'hotWaterMl' | 'iceMl' | 'extractionEndSeconds'>>, language?: string) {
  const targetLabel = localizeAiBrewTargetProfile(plan.targetProfileId, plan.targetProfileLabel, language).toLowerCase();
  const tasteTimeSeconds = Math.max(0, Math.round(plan.extractionEndSeconds ?? plan.totalTimeSeconds));
  const isPourOverTiming = ['v60', 'chemex', 'kalita_wave', 'origami', 'april', 'melitta', 'kono'].includes(plan.methodFamily);
  const englishTimeLabel = plan.methodFamily === 'espresso'
    ? 'shot time'
    : plan.methodFamily === 'cold_brew'
      ? 'cold steep'
      : plan.methodFamily === 'french_press' || plan.methodFamily === 'clever_dripper'
        ? 'steep time'
        : isPourOverTiming
          ? plan.brewMode === 'iced' ? 'hot drawdown finish' : 'drawdown finish'
        : plan.brewMode === 'iced'
          ? 'hot extraction time'
          : 'extraction time';
  const indonesianTimeLabel = plan.methodFamily === 'espresso'
    ? 'waktu ekstraksi espresso'
    : plan.methodFamily === 'cold_brew'
      ? 'rendam dingin'
      : plan.methodFamily === 'french_press' || plan.methodFamily === 'clever_dripper'
        ? 'waktu rendam'
        : isPourOverTiming
          ? 'air turun selesai'
        : plan.brewMode === 'iced'
          ? 'waktu ekstraksi panas'
          : 'waktu ekstraksi';
  const englishRatioText = plan.brewMode === 'iced'
    ? `final ratio 1:${formatBaristaRatio(plan.finalBeverageRatio)} with hot concentrate 1:${formatBaristaRatio(plan.hotExtractionRatio)}`
    : `1:${formatBaristaRatio(plan.recommendedRatio)}`;
  const englishModeLabel = plan.methodFamily === 'cold_brew'
    ? 'Cold brew'
    : plan.methodFamily === 'espresso'
      ? 'Espresso'
      : plan.brewMode === 'iced'
        ? 'Ice brew'
        : 'Hot brew';
  if (!isIndonesianAiBrewLanguage(language)) {
    return `${englishModeLabel} plan for ${plan.coffeeName || 'your coffee'} on ${plan.dripper.name}, tuned for ${plan.targetProfileLabel.toLowerCase()} at ${englishRatioText}, ${formatBaristaTemperature(plan.waterTempC)}°C, ${englishTimeLabel} around ${formatAiBrewTimeForLanguage(tasteTimeSeconds, language)}.`;
  }

  const coffeeName = plan.coffeeName || 'kopi ini';
  const target = targetLabel;
  const ratioText = plan.brewMode === 'iced'
    ? `rasio final 1:${formatBaristaRatio(plan.finalBeverageRatio)} dan konsentrat panas 1:${formatBaristaRatio(plan.hotExtractionRatio)}`
    : `1:${formatBaristaRatio(plan.recommendedRatio)}`;
  const modeLabel = plan.methodFamily === 'cold_brew'
    ? 'Plan seduh dingin'
    : plan.methodFamily === 'espresso'
      ? 'Plan espresso'
      : plan.brewMode === 'iced'
        ? 'Plan seduh es'
        : 'Plan seduh panas';
  return `${modeLabel} untuk ${coffeeName} dengan ${plan.dripper.name}, disetel untuk profil ${target} pada ${ratioText}, ${formatBaristaTemperature(plan.waterTempC)}°C, ${indonesianTimeLabel} sekitar ${formatAiBrewTimeForLanguage(tasteTimeSeconds, language)}.`;
}

export function formatAiBrewTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  if (safeSeconds >= 3600) {
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
  }
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatAiBrewTimeForLanguage(totalSeconds: number, language?: string) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const isEnglish = String(language || '').toLowerCase().startsWith('en');
  if (isEnglish && safeSeconds >= 3600) {
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return formatAiBrewTime(safeSeconds);
}
