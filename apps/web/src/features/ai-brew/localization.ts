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
    case 'drawdown':
      return 'Drawdown';
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
    .replace(/\s+(?:Â·|·)\s+/g, ' · ');
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
    .replace(/^Process not specified\. No automatic process modifier was applied\.$/i, 'Proses belum ditentukan. Tidak ada modifier proses otomatis yang dipakai.')
    .replace(/^Variety not specified\. No automatic variety modifier was applied\.$/i, 'Varietas belum ditentukan. Tidak ada modifier varietas otomatis yang dipakai.')
    .replace(/^Exact device profile unavailable; family fallback was used\.$/i, 'Profil alat exact tidak tersedia; fallback family dipakai.')
    .replace(/^Bean profile left neutral; no bean-specific modifier was applied\.$/i, 'Profil bean dibiarkan netral; tidak ada modifier spesifik bean yang dipakai.')
    .replace(/^Water source: manual mineral entry\.$/i, 'Sumber air: input mineral manual.')
    .replace(/^Device profile source: (.+)\.$/i, 'Sumber profil alat: $1.')
    .replace(/^Grinder setting source: (.+)\.$/i, 'Sumber setting grinder: $1.')
    .replace(/^Using (.+) family fallback profile\.$/i, 'Menggunakan profil fallback family $1.')
    .replace(/^Bean profile modifiers active: (.+)\.$/i, (_, summary: string) => `Modifier profil bean aktif: ${localizeBeanProfileSummary(summary)}.`)
    .replace(/^(.+?) was selected as the brand baseline, then adjusted manually\.$/i, '$1 dipakai sebagai baseline brand lalu disesuaikan manual.')
    .replace(/^(.+?) brand water profile is active for this brew plan\.$/i, 'Profil air brand $1 aktif untuk brew plan ini.')
    .replace(/^(.+?) does not have a full autofill panel in this catalog version\.$/i, '$1 belum punya panel autofill lengkap di versi katalog ini.')
    .replace(/^(.+?) minerals were estimated from the water classification baseline\.$/i, 'Mineral $1 diestimasi dari baseline klasifikasi air.')
    .replace(/^Device profile was generated from the (.+) family template for (.+)\.$/i, 'Profil alat dibuat dari template family $1 untuk $2.')
    .replace(/^Exact device profile matched: (.+)\.$/i, 'Profil alat exact ditemukan: $1.')
    .replace(/^Water source: (.+) \((.+)\)\.$/i, 'Sumber air: $1 ($2).')
    .replace(/^Brew (\d+(?:\.\d+)?) ml hot over (\d+(?:\.\d+)?) ml\/g ice \((.+)\)\. Final ratio is 1:(\d+(?:\.\d+)?); hot concentrate extracts at 1:(\d+(?:\.\d+)?)\. Keep pours compact to hold sweetness and clarity\.$/i, 'Seduh $1 ml air panas di atas $2 ml/g es ($3). Rasio final 1:$4; konsentrat panas terekstraksi di 1:$5. Jaga tuangan tetap rapat untuk menjaga manis dan kejernihan.')
    .replace(/^Brew (\d+(?:\.\d+)?) ml hot over (\d+(?:\.\d+)?) ml\/g ice \((.+)\)\. Keep pours compact to hold sweetness and clarity\.$/i, 'Seduh $1 ml air panas di atas $2 ml/g es ($3). Jaga tuangan tetap rapat untuk menjaga manis dan kejernihan.')
    .replace(/^Iced split source: final beverage ratio 1:(\d+(?:\.\d+)?), hot extraction ratio 1:(\d+(?:\.\d+)?), hot\/ice (.+)\.$/i, 'Sumber split seduh es: rasio final 1:$1, rasio ekstraksi panas 1:$2, panas/es $3.')
    .replace(/^Use the full (\d+(?:\.\d+)?) ml as brew water and keep kettle near (\d+(?:\.\d+)?)(?:Â?°?|°)C with calm, center-focused pours\.$/i, 'Gunakan penuh $1 ml sebagai air seduh dan jaga kettle di sekitar $2°C dengan tuangan tenang yang fokus ke tengah.');

  const localized = normalized
    .replace(/^No verified setting yet\. Start near (.+) and bias (.+)\.$/i, 'Belum ada setting terverifikasi. Mulai di sekitar $1 lalu arahkan ke $2.')
    .replace(/^Official (.+) reference baseline for pour over style brewing; adjust slightly finer for iced and slightly coarser for larger flat-bottom beds only after taste\.$/i, 'Baseline referensi resmi $1 untuk seduh filter; geser sedikit lebih halus untuk iced dan sedikit lebih kasar untuk flat-bottom besar hanya setelah cek rasa.')
    .replace(/^Finish calmly and let the drawdown stay tidy\.$/i, 'Akhiri dengan tenang dan biarkan drawdown tetap rapi.')
    .replace(/^Open the bloom evenly and let the cone drain cleanly before the next pour\.$/i, 'Buka bloom secara merata lalu biarkan cone turun bersih sebelum tuangan berikutnya.')
    .replace(/^Push a clean center-to-mid pour and keep the cone walls quiet\.$/i, 'Dorong tuangan bersih dari tengah ke area tengah-luar dan jaga dinding cone tetap tenang.')
    .replace(/^Keep the later V60 phase centered so the cup stays transparent\.$/i, 'Jaga fase akhir V60 tetap di tengah agar cangkir tetap jernih.')
    .replace(/^Finish calmly and let the cone drain without chasing the walls\.$/i, 'Akhiri dengan tenang dan biarkan cone turun tanpa mengejar dinding.')
    .replace(/^Keep the bloom light and even so the faster cone flow stays clean\.$/i, 'Jaga bloom tetap ringan dan merata agar aliran cone yang lebih cepat tetap bersih.')
    .replace(/^Use compact pulses and keep the flow agile through the middle\.$/i, 'Gunakan pulse yang rapat dan jaga aliran tetap lincah di fase tengah.')
    .replace(/^Hold the later middle short and tidy so transparency stays high\.$/i, 'Jaga fase tengah akhir tetap singkat dan rapi agar kejernihan tetap tinggi.')
    .replace(/^Close with a light finishing pour and let the fast drawdown stay clean\.$/i, 'Tutup dengan tuangan akhir yang ringan dan biarkan drawdown cepat tetap bersih.')
    .replace(/^Keep the bloom centered and slightly deeper to establish a sweet core\.$/i, 'Jaga bloom tetap di tengah dan sedikit lebih dalam untuk membangun inti rasa manis.')
    .replace(/^Hold a tighter center pour to build sweetness with stable contact time\.$/i, 'Pertahankan tuangan tengah yang lebih rapat untuk membangun manis dengan waktu kontak yang stabil.')
    .replace(/^Carry the late middle with a narrow, steady stream\.$/i, 'Lanjutkan fase tengah akhir dengan aliran sempit dan stabil.')
    .replace(/^Finish narrow and controlled so sweetness stays intact\.$/i, 'Akhiri dengan aliran sempit dan terkontrol agar rasa manis tetap utuh.')
    .replace(/^Wet the flat bed edge to edge, then let it settle level before building the cup\.$/i, 'Basahi flat bed dari tepi ke tepi lalu biarkan rata sebelum membangun cangkir.')
    .replace(/^Keep the flat bed level with even pulses from center to edge\.$/i, 'Jaga flat bed tetap rata dengan pulse merata dari tengah ke tepi.')
    .replace(/^Protect the later middle with flat, even contact across the bed\.$/i, 'Jaga fase tengah akhir dengan kontak yang rata di seluruh bed.')
    .replace(/^Land the final water evenly to keep drawdown flat and tidy\.$/i, 'Letakkan air terakhir secara merata agar drawdown tetap rata dan rapi.')
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
    .replace(/^Finish before the filter stalls and let the drawdown stay open\.$/i, 'Akhiri sebelum filter tersendat dan biarkan drawdown tetap terbuka.')
    .replace(/^Saturate the full bed evenly and let immersion start building sweetness\.$/i, 'Saturasi seluruh bed secara merata lalu biarkan immersion mulai membangun rasa manis.')
    .replace(/^Use the middle phase to build immersion gently rather than chasing more turbulence\.$/i, 'Gunakan fase tengah untuk membangun immersion dengan tenang, bukan mengejar turbulensi tambahan.')
    .replace(/^Keep the later immersion phase quiet so the release stays clean\.$/i, 'Jaga fase immersion akhir tetap tenang agar pelepasan tetap bersih.')
    .replace(/^Open the release cleanly and let the bed drain without stirring the finish\.$/i, 'Buka pelepasan dengan bersih lalu biarkan bed turun tanpa mengaduk fase akhir.');

  return localizeBeanProfileSummary(localized);
}

export function localizeAiBrewSummary(plan: Pick<
  BrewPlan,
  'brewMode' | 'methodFamily' | 'coffeeName' | 'dripper' | 'targetProfileId' | 'targetProfileLabel' | 'recommendedRatio' | 'finalBeverageRatio' | 'hotExtractionRatio' | 'waterTempC' | 'totalTimeSeconds'
>, language?: string) {
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
  const target = localizeAiBrewTargetProfile(plan.targetProfileId, plan.targetProfileLabel, language).toLowerCase();
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
