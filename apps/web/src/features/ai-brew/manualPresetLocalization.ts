import type { ManualBrewPreset } from './types';
import {
  isIndonesianAiBrewLanguage,
  validateLocalizedAiBrewCopy,
} from './localization';

export interface ManualPresetDisplayCopy {
  label: string;
  summary: string;
  sourceAttribution: string;
  fallbackReason: string;
  guardrails: string[];
}

const INDONESIAN_PRESET_COPY: Record<string, { label: string; summary: string }> = {
  'inspired-george-peng-temperature-control': {
    label: 'Terinspirasi dari Kontrol Suhu George Peng',
    summary: 'Gaya kompetisi dengan suhu menurun, disesuaikan untuk alat seduh alas datar yang didukung.',
  },
  'inspired-martin-woelfl-orea-v4': {
    label: 'Terinspirasi dari Martin Woelfl OREA V4',
    summary: 'Empat tuangan cepat pada alat alas datar untuk rasa bersih, manis, dan seimbang.',
  },
  'inspired-carlos-medina-origami': {
    label: 'Terinspirasi dari Carlos Medina Origami',
    summary: 'Lima tuangan setara pada Origami untuk kejernihan buah dan rasa manis yang terkendali.',
  },
  'inspired-tetsu-kasuya-46': {
    label: 'Terinspirasi dari Tetsu Kasuya 4:6',
    summary: 'Lima tuangan bergaya 4:6 pada V60 untuk mengatur rasa manis dan body.',
  },
  'inspired-matt-winton-five-pour-v60': {
    label: 'Terinspirasi dari Matt Winton Lima Tuang V60',
    summary: 'Gaya kompetisi lima tuangan pada V60 untuk kejernihan dan keseimbangan yang mudah diulang.',
  },
  'nordic-light-roast-v60-style': {
    label: 'Gaya V60 Sangrai Terang Nordik',
    summary: 'Gaya V60 untuk sangrai terang dengan kejernihan floral dan agitasi akhir yang terjaga.',
  },
  'kalita-competition-balance-style': {
    label: 'Gaya Seimbang Kompetisi Kalita',
    summary: 'Empat tuangan terkendali pada alat alas datar untuk hamparan kopi rata dan rasa seimbang.',
  },
  'matt-perger-style-v60': {
    label: 'V60 Gaya Matt Perger',
    summary: 'Gaya V60 berkejernihan tinggi dengan pembasahan merata dan ekstraksi yang terkendali.',
  },
  'chemex-competition-clean-cup-style': {
    label: 'Gaya Cangkir Bersih Kompetisi Chemex',
    summary: 'Gaya Chemex dengan body menyerupai teh, rasa bersih, dan sedikit endapan.',
  },
  'cone-dripper-competition-brew': {
    label: 'Seduhan Kompetisi Dripper Kerucut',
    summary: 'Titik awal bergaya kompetisi dengan rasa manis dibangun lebih awal dan akhir seduhan bersih.',
  },
  'hoffmann-style-ultimate-v60': {
    label: 'Ultimate V60 Gaya Hoffmann',
    summary: 'Titik awal V60 modern yang seimbang, dengan pembasahan merata dan air turun stabil.',
  },
  'hoffmann-style-better-one-cup-v60': {
    label: 'Better 1-Cup V60 Gaya Hoffmann',
    summary: 'Gaya V60 satu cangkir dengan tuangan kecil yang mudah diulang dan akhir seduhan bersih.',
  },
  'hoffmann-style-ultimate-aeropress': {
    label: 'Ultimate AeroPress Gaya Hoffmann',
    summary: 'Gaya rendam AeroPress yang bersih dengan waktu rendam terukur dan tekanan lembut.',
  },
  'rao-style-high-extraction-v60': {
    label: 'V60 Ekstraksi Tinggi Gaya Rao',
    summary: 'Gaya V60 ekstraksi tinggi yang mengutamakan kerataan tuang dan evaluasi rasa.',
  },
  'lance-style-two-pour-v60': {
    label: 'V60 Dua Tuang Gaya Lance',
    summary: 'Gaya V60 dua tuangan dengan blooming panjang dan satu tuangan ekstraksi utama.',
  },
  'april-style-v60-flat-bottom': {
    label: 'V60 Alas Datar Gaya April',
    summary: 'Empat tuangan beragitasi rendah untuk layanan cepat dengan hasil bersih.',
  },
  'tim-wendelboe-style-aeropress': {
    label: 'AeroPress Gaya Tim Wendelboe',
    summary: 'Gaya AeroPress Nordik untuk aroma bersih dan body ringan.',
  },
  'onyx-style-v60': {
    label: 'V60 Gaya Onyx',
    summary: 'Titik awal V60 bergaya roastery untuk buah yang menonjol dan rasa manis bersih.',
  },
  'blue-bottle-chemex-style': {
    label: 'Chemex Gaya Blue Bottle',
    summary: 'Gaya klasik kafe untuk Chemex dengan body bersih dan rasa manis membulat.',
  },
  'kurasu-kyoto-style-v60': {
    label: 'V60 Gaya Kurasu Kyoto',
    summary: 'Gaya V60 Kyoto dengan tuangan bertahap terukur dan keseimbangan yang mengutamakan rasa manis.',
  },
  'rogue-wave-origami-style': {
    label: 'Origami Gaya Rogue Wave',
    summary: 'Titik awal Origami dengan empat tuangan terkendali untuk kejernihan buah.',
  },
  'manhattan-roasters-pour-over-style': {
    label: 'Pour-over Gaya Manhattan',
    summary: 'Titik awal pour-over modern untuk sangrai terang, aroma jelas, dan rasa manis transparan.',
  },
  'coffee-collective-filter-style': {
    label: 'Seduh Saring Gaya Coffee Collective',
    summary: 'Gaya roastery Nordik untuk rasa manis bersih dan keasaman yang seimbang.',
  },
  'hario-switch-hybrid-style': {
    label: 'Gaya Hybrid Hario Switch',
    summary: 'Titik awal hybrid Switch yang memadukan rasa manis rendaman dan akhir perkolasi bersih.',
  },
  'clever-dripper-immersion-style': {
    label: 'Rendaman Manis Clever',
    summary: 'Titik awal Clever yang mengutamakan rendaman agar rasa manis mudah dicapai dan mudah disesuaikan.',
  },
  'hoffmann-style-french-press': {
    label: 'French Press Gaya Hoffmann',
    summary: 'Titik awal French Press yang jernih dengan rendaman panjang, tekanan lembut, dan tuang pisah bersih.',
  },
  'modern-low-heat-moka-pot': {
    label: 'Moka Pot Modern Panas Rendah',
    summary: 'Titik awal Moka Pot dengan panas rendah dan aliran stabil untuk kopi pekat.',
  },
  'japanese-iced-v60-flash-brew': {
    label: 'Japanese Iced V60 Flash Brew',
    summary: 'V60 es ala Jepang yang menyeduh konsentrat panas langsung di atas es terukur.',
  },
  'siphon-clean-aromatic-style': {
    label: 'Gaya Siphon Bersih dan Aromatik',
    summary: 'Titik awal Siphon untuk aroma bersih dengan panas terkendali dan adukan lembut.',
  },
  'toddy-style-cold-brew-immersion': {
    label: 'Cold Brew Rendam Gaya Toddy',
    summary: 'Titik awal cold brew rendam untuk konsentrat halus dengan penyaringan bersih.',
  },
  'sweetness-focus-brew': {
    label: 'Seduhan Fokus Rasa Manis',
    summary: 'Titik awal target rasa untuk manis lebih tinggi dengan ekstraksi awal yang terkendali.',
  },
  'acidity-focus-brew': {
    label: 'Seduhan Fokus Keasaman',
    summary: 'Titik awal target rasa untuk keasaman lebih cerah dengan ritme seduh lebih singkat dan aman.',
  },
  'body-focus-brew': {
    label: 'Seduhan Fokus Body',
    summary: 'Titik awal target rasa untuk body lebih tebal dengan rasa manis dan tekstur yang terkendali.',
  },
  'clarity-focus-brew': {
    label: 'Seduhan Fokus Kejernihan',
    summary: 'Titik awal target rasa untuk kejernihan melalui pembasahan merata dan agitasi akhir yang ringan.',
  },
  'fast-brew': {
    label: 'Seduh Cepat',
    summary: 'Titik awal seduh saring manual yang mempersingkat layanan tanpa keluar dari rentang ekstraksi aman.',
  },
  'inspired-wac-championship-style': {
    label: 'Terinspirasi dari Nemo Pop WAC 2025',
    summary: 'Gaya Nemo Pop WAC 2025: 70 g air bypass di cangkir, 100 g air seduh pada 84°C, dua filter, dan tekanan singkat terkendali.',
  },
  'inspired-wac-2025-jan-ahrend': {
    label: 'Terinspirasi dari Jan Ahrend WAC 2025',
    summary: 'Gaya Jan Ahrend WAC 2025: AeroPress terbalik, 100 g air seduh, putaran terkendali, tekan hingga target hasil, lalu encerkan hingga 152 g.',
  },
  'inspired-wac-2025-dharun-vyas': {
    label: 'Terinspirasi dari Dharun Vyas WAC 2025',
    summary: 'Gaya Dharun Vyas WAC 2025: AeroPress terbalik, basahi dengan 65 g, isi ke tengah hingga 208 g, tekan stabil satu menit, lalu tambah 12 g air.',
  },
  'inspired-tetsu-kasuya-2026-ten-pour': {
    label: 'Terinspirasi dari Tetsu Kasuya 2026 10x Tuang',
    summary: 'Gaya 10x tuang Tetsu Kasuya 2026 berdasarkan laporan publik: 20 g kopi, 300 g air, sepuluh tuangan 30 g, gilingan sangat kasar, suhu tinggi, dan body tebal. Hario Neo belum tersedia, jadi V60 dipakai sebagai pengganti yang kompatibel.',
  },
  'inspired-aeropress-cold-brew-express': {
    label: 'AeroPress Cold Brew Ekspres',
    summary: 'Gaya resmi Express Cold Brew: 30 g kopi halus, 100 ml air dingin atau suhu ruang, aduk kuat selama 2 menit, lalu tekan di atas es.',
  },
};

function localizeSourceAttribution(preset: ManualBrewPreset) {
  switch (preset.verificationLevel) {
    case 'official_reference':
      return 'Rujukan resmi dari sumber resep yang tercantum, disesuaikan sebagai titik awal aman di AI Brew.';
    case 'community_reference':
      return 'Rujukan komunitas dari sumber yang tercantum, disesuaikan sebagai titik awal dengan batas pengaman AI Brew.';
    case 'internal_synthesis':
      return 'Rangkuman internal AI Brew dari praktik seduh yang terdokumentasi, dengan batas pengaman metode tetap aktif.';
    case 'curated_reference':
    default:
      return 'Rujukan kurasi dari sumber yang tercantum, disesuaikan sebagai titik awal aman di AI Brew.';
  }
}

function localizeGuardrail(source: string, index: number) {
  if (/capacity|chamber|dose|overflow/i.test(source)) {
    return 'Jaga dosis dan volume air di bawah kapasitas aman alat seduh.';
  }
  if (/temperature|heat|boil/i.test(source)) {
    return 'Jaga suhu dalam rentang aman metode dan hindari panas berlebih.';
  }
  if (/drawdown|finish|time|timing|steep|press/i.test(source)) {
    return 'Jaga waktu kontak dan akhir seduhan dalam rentang metode yang masuk akal.';
  }
  if (/grinder|grind|fines/i.test(source)) {
    return 'Anggap setelan gilingan sebagai titik awal, lalu koreksi sedikit demi sedikit dari rasa di cangkir.';
  }
  if (/water|bypass|dilution|ice/i.test(source)) {
    return 'Pertahankan pembagian air, es, atau bypass sesuai resep agar rasio akhir tetap benar.';
  }
  if (/official|reproduce|claim|promise|exact|guarantee/i.test(source)) {
    return 'Gunakan preset sebagai titik awal, bukan jaminan atau salinan mutlak dari resep sumber.';
  }
  return index % 2 === 0
    ? 'Pertahankan parameter dalam batas aman metode dan sesuaikan hanya satu variabel setiap kali.'
    : 'Nilai hasil seduhan di cangkir sebelum mengubah gilingan, rasio, suhu, atau waktu.';
}

function safeLocalizedPresetText(text: string, surface: string) {
  return validateLocalizedAiBrewCopy({
    text,
    language: 'id',
    surface,
  }).safeText;
}

export function getManualPresetDisplayCopy(
  preset: ManualBrewPreset,
  language?: string,
): ManualPresetDisplayCopy {
  if (!isIndonesianAiBrewLanguage(language)) {
    return {
      label: preset.safeLabel,
      summary: preset.visibleSummary,
      sourceAttribution: preset.sourceAttribution,
      fallbackReason: preset.fallbackReason || '',
      guardrails: [...preset.guardrails],
    };
  }

  const localized = INDONESIAN_PRESET_COPY[preset.id];
  const label = localized?.label || `Preset ${preset.safeLabel.replace(/^Inspired by\s+/i, '')}`;
  const summary = localized?.summary || 'Titik awal seduh yang telah disesuaikan dengan batas pengaman metode AI Brew.';
  const fallbackReason = preset.fallbackReason
    ? 'Alat asli belum tersedia di katalog; AI Brew memakai alat kompatibel yang didukung dan tetap menerapkan batas pengaman metode.'
    : '';

  return {
    label: safeLocalizedPresetText(label, 'preset_label'),
    summary: safeLocalizedPresetText(summary, 'preset_summary'),
    sourceAttribution: safeLocalizedPresetText(localizeSourceAttribution(preset), 'preset_source'),
    fallbackReason: fallbackReason ? safeLocalizedPresetText(fallbackReason, 'preset_fallback') : '',
    guardrails: preset.guardrails.map((guardrail, index) => (
      safeLocalizedPresetText(localizeGuardrail(guardrail, index), 'warning')
    )),
  };
}
