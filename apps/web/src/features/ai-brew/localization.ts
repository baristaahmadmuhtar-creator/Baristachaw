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
      return 'Buah Lebih Menonjol';
    case 'soft_round':
      return 'Lembut & Bulat';
    case 'dense_comforting':
      return 'Tebal & Nyaman';
    default:
      return fallbackLabel;
  }
}

export function localizeAiBrewStageLabel(stageId: string, language?: string) {
  if (!isIndonesianAiBrewLanguage(language)) return null;

  switch (stageId) {
    case 'validate_input':
      return 'Validasi input';
    case 'match_device_profile':
      return 'Cocokkan profil alat';
    case 'resolve_grinder_settings':
      return 'Cari setting grinder';
    case 'compute_brew_variables':
      return 'Hitung variabel seduh';
    case 'build_sequence':
      return 'Susun urutan seduh';
    case 'hybrid_ai_sequence':
      return 'Kalibrasi sequence AI';
    case 'run_standards_checks':
      return 'Jalankan cek standar';
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
  if (!isIndonesianAiBrewLanguage(language)) return label;

  switch (label.trim().toLowerCase()) {
    case 'bloom':
      return 'Bloom';
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
      return 'Tuang Akhir Target Panas';
    case 'finish':
      return 'Selesai';
    case 'charge':
      return 'Isi Air';
    case 'steep':
      return 'Steep';
    case 'press':
      return 'Tekan';
    case 'release':
    case 'release checkpoint':
      return 'Buka katup';
    case 'release over ice':
      return 'Buka katup di atas es';
    case 'drawdown':
      return 'Air turun';
    case 'heat':
      return 'Panaskan';
    case 'start brew':
      return 'Mulai Seduh';
    case 'extract':
      return 'Ekstraksi';
    case 'serve':
      return 'Sajikan';
    case 'filter':
      return 'Filter';
    case 'stop':
      return 'Stop';
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
    .replace(/^Grinder setting source: (.+)\.$/i, 'Sumber setting grinder: $1.')
    .replace(/^Using (.+) family fallback profile\.$/i, 'Menggunakan profil fallback family $1.')
    .replace(/^Bean profile modifiers active: (.+)\.$/i, (_, summary: string) => 'Modifier profil bean aktif: ' + localizeBeanProfileSummary(summary) + '.')
    .replace(/^(.+?) was selected as the brand baseline, then adjusted manually\.$/i, '$1 dipakai sebagai baseline brand lalu disesuaikan manual.')
    .replace(/^(.+?) brand water profile is active for this brew plan\.$/i, 'Profil air brand $1 aktif untuk brew plan ini.')
    .replace(/^(.+?) does not have a full autofill panel in this catalog version\.$/i, '$1 belum punya panel autofill lengkap di versi katalog ini.')
    .replace(/^(.+?) minerals were estimated from the water classification baseline\.$/i, 'Mineral $1 diestimasi dari baseline klasifikasi air.')
    .replace(/^Device profile was generated from the (.+) family template for (.+)\.$/i, 'Profil alat dibuat dari template family $1 untuk $2.')
    .replace(/^Exact device profile matched: (.+)\.$/i, 'Profil alat exact ditemukan: $1.')
    .replace(/^Operator knowledge active: (\d+) matched note\(s\) from knowledge_v1\.xlsx\.$/i, 'Knowledge operator aktif: $1 catatan cocok dari knowledge_v1.xlsx.')
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
    .replace(/^Iced split source: final beverage ratio 1:(\d+(?:\.\d+)?), hot extraction ratio 1:(\d+(?:\.\d+)?), hot\/ice (.+)\.$/i, 'Sumber split seduh es: rasio final 1:$1, rasio ekstraksi panas 1:$2, panas/es $3.')
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
    .replace(/Preheat the chamber and rinse the paper cap first, then wet the compact bed quickly so contact starts evenly\./i, 'Panaskan ruang seduh dan bilas paper cap dulu, lalu basahi bed yang padat dengan cepat agar kontak mulai merata.')
    .replace(/Press with steady pressure and stop before the final dry hiss so bitterness does not enter the cup\./i, 'Tekan dengan tekanan stabil dan berhenti sebelum hiss kering terakhir agar pahit tidak masuk ke cangkir.')
    .replace(/Use a coarse, even grind and saturate all grounds; leave the slurry quiet after the first wetting\./i, 'Gunakan grind kasar yang merata dan basahi semua bubuk; biarkan slurry tenang setelah basahan pertama.')
    .replace(/Around the late steep window, break the crust gently and skim foam or floating grounds without aggressive stirring\./i, 'Di fase steep akhir, pecah crust pelan dan skim foam atau bubuk mengambang tanpa mengaduk agresif.')
    .replace(/Press slowly, do not squeeze the bed, then decant immediately so extraction stops cleanly\./i, 'Tekan perlahan, jangan memeras bed, lalu decant segera agar ekstraksi berhenti bersih.')
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
    .replace(/^Open the release cleanly and let the bed drain without stirring the finish\.$/i, 'Buka katup dengan bersih lalu biarkan bed turun tanpa mengaduk fase akhir.');

  return localizeBeanProfileSummary(localized);
}

export function localizeAiBrewSummary(plan: Pick<
  BrewPlan,
  'brewMode' | 'methodFamily' | 'coffeeName' | 'dripper' | 'targetProfileId' | 'targetProfileLabel' | 'recommendedRatio' | 'finalBeverageRatio' | 'hotExtractionRatio' | 'waterTempC' | 'totalTimeSeconds'
> & Partial<Pick<BrewPlan, 'doseG' | 'totalWaterMl' | 'hotWaterMl' | 'iceMl'>>, language?: string) {
  const targetLabel = localizeAiBrewTargetProfile(plan.targetProfileId, plan.targetProfileLabel, language).toLowerCase();
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
    return `${englishModeLabel} plan for ${plan.coffeeName || 'your coffee'} on ${plan.dripper.name}, tuned for ${plan.targetProfileLabel.toLowerCase()} at ${englishRatioText}, ${formatBaristaTemperature(plan.waterTempC)}°C, around ${formatAiBrewTime(plan.totalTimeSeconds)}.`;
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
  return `${modeLabel} untuk ${coffeeName} dengan ${plan.dripper.name}, disetel untuk profil ${target} pada ${ratioText}, ${formatBaristaTemperature(plan.waterTempC)}°C, sekitar ${formatAiBrewTime(plan.totalTimeSeconds)}.`;
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
