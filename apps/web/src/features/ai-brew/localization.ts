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
      case 'berhenti sebelum hiss':
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
      return 'Baseline estimasi';
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
    .replace(/\bStir server\b/gi, 'Aduk Server')
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

export function localizeAiBrewDynamicText(text: string, language?: string) {
  if (!isIndonesianAiBrewLanguage(language)) return text;

  const normalized = text
    .replace(/^Unknown Origin$/i, 'Asal Tidak Diketahui')
    .replace(/^No bean-profile modifier active\.$/i, 'Belum ada modifier profil bean yang aktif.')
    .replace(/^Manual mineral input is active for this brew plan\.$/i, 'Input mineral manual aktif untuk brew plan ini.')
    .replace(/^Low-TDS water may need a touch more thermal energy\.$/i, 'Air dengan TDS rendah mungkin butuh sedikit tambahan energi panas.')
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
    .replace(/^Grinder setting is estimated or fallback; calibrate by drawdown and taste\.$/i, 'Setting grinder masih estimasi atau fallback; kalibrasi dari air turun dan rasa.')
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
    .replace(/^Fallback grinder setting lowers confidence; validate with drawdown and taste\.$/i, 'Setting grinder fallback menurunkan keyakinan; validasi dengan air turun dan rasa.')
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
    .replace(/Allow a slow, heavy drawdown to finish\. Yields maximum body\./gi, 'Biarkan air turun yang lambat dan berat selesai. Menghasilkan body maksimal.');

  return localizeCriticalUiTerms(localizeBeanProfileSummary(localized));
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
    ? 'waktu shot'
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
    return `${englishModeLabel} plan for ${plan.coffeeName || 'your coffee'} on ${plan.dripper.name}, tuned for ${plan.targetProfileLabel.toLowerCase()} at ${englishRatioText}, ${formatBaristaTemperature(plan.waterTempC)}°C, ${englishTimeLabel} around ${formatAiBrewTime(tasteTimeSeconds)}.`;
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
  return `${modeLabel} untuk ${coffeeName} dengan ${plan.dripper.name}, disetel untuk profil ${target} pada ${ratioText}, ${formatBaristaTemperature(plan.waterTempC)}°C, ${indonesianTimeLabel} sekitar ${formatAiBrewTime(tasteTimeSeconds)}.`;
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
