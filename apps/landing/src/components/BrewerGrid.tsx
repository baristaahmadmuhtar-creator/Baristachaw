import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollReveal } from './ScrollReveal';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { Language } from '../i18n';

interface BrewerDetail {
  name: string;
  summary: Record<Language, string>;
  geometry: Record<Language, string>;
  filter: Record<Language, string>;
  style: Record<Language, string>;
  description: Record<Language, string>;
}

const BREWERS_DATA: BrewerDetail[] = [
  {
    name: 'V60',
    summary: { id: 'Pour-over klasik · hot & iced', en: 'Classic pour-over · Hot & Iced', bn: 'Pour-over klasik · Panas & Sejuk' },
    geometry: { id: 'Konikal (Kerucut 60°)', en: 'Conical (60° Angle)', bn: 'Konikal (Sudut 60°)' },
    filter: { id: 'Kertas Tipis (V60)', en: 'Conical Paper Filter', bn: 'Penapis Kertas Konikal' },
    style: { id: 'Kejernihan & Keasaman Tinggi', en: 'Vibrant Acidity & Clean Clarity', bn: 'Keasidan Segar & Kejernihan Bersih' },
    description: {
      id: 'Geometri kerucut 60 derajat dengan alur spiral khas Hario. Alat seduh paling populer di dunia untuk menonjolkan keasaman buah (acidity) dan kejernihan rasa (clarity) yang bersih. Sangat sensitif terhadap kecepatan tuang Anda—di sinilah BaristaChaw membantu menjaga konsistensi tuangan Anda.',
      en: 'Iconic 60-degree conical geometry with spiral ribs. The world\'s baseline brewer for highlighting vibrant fruit acidity and clean cup clarity. It is highly sensitive to pour rate—which is where BaristaChaw\'s real-time guides help you maintain a steady, uniform pour.',
      bn: 'Geometri kerucut 60 darjah dengan alur spiral khas Hario. Alat seduh paling popular di dunia untuk menonjolkan keasidan buah dan kejernihan rasa yang bersih. Sangat sensitif dengan kelajuan tuangan anda — di sinilah BaristaChaw membantu kita menjaga konsistensi tuangan.',
    },
  },
  {
    name: 'Kalita Wave',
    summary: { id: 'Flat bottom · 155 / 185', en: 'Flat-bottom · 155 / 185', bn: 'Dasar rata · 155 / 185' },
    geometry: { id: 'Dasar Rata (3 Lubang)', en: 'Flat-Bottom (3 exit holes)', bn: 'Dasar Rata (3 Lubang)' },
    filter: { id: 'Kertas Gelombang (Wave)', en: 'Wave-style Ruffled Filter', bn: 'Penapis Gelombang (Wave)' },
    style: { id: 'Rasa Manis & Ekstraksi Merata', en: 'Uniform Extraction & High Sweetness', bn: 'Ekstraksi Sekata & Manis Tinggi' },
    description: {
      id: 'Alat seduh dengan dasar rata dan tiga lubang pembuangan. Desain wave meminimalkan kontak kertas dengan dinding dripper untuk suhu yang lebih stabil. Sangat bersahabat (forgiving) dan menghasilkan ekstraksi yang merata dengan rasa manis (sweetness) serta body yang tebal.',
      en: 'Flat-bottom geometry with three small exit holes and signature ruffled wave filters that insulate the slurry to maintain thermal stability. Exceptionally forgiving, it delivers highly uniform extractions with rich sweetness and a rounder body.',
      bn: 'Geometri dasar rata dengan tiga lubang keluar dan penapis gelombang yang mengekalkan suhu stabil. Sangat mudah digunakan dan menghasilkan ekstraksi sekata dengan rasa manis yang kaya serta badan rasa yang penuh.',
    },
  },
  {
    name: 'Chemex',
    summary: { id: 'Clean, bold large-format brew', en: 'High-clarity, large-format filter brew', bn: 'Seduhan jernih format besar' },
    geometry: { id: 'Konikal Kaca Tebal', en: 'Conical Glass Carafe', bn: 'Karaf Kaca Konikal' },
    filter: { id: 'Kertas Tebal Khusus', en: 'Proprietary Thick Paper Filter', bn: 'Penapis Kertas Tebal Khas' },
    style: { id: 'Kejernihan Sangat Tinggi (Bebas Minyak)', en: 'Excellent Clarity & Zero Sediment', bn: 'Kejernihan Tinggi & Tiada Ampas' },
    description: {
      id: 'Diciptakan oleh kimiawan pada tahun 1941, menggunakan kertas saring tebal khusus yang menahan minyak kopi dan sedimen halus. Hasil seduhannya adalah cangkir paling bersih dan jernih yang pernah Anda rasakan, menonjolkan aroma bunga dan buah yang halus.',
      en: 'Designed by a chemist in 1941, utilizing thick, proprietary paper filters that trap bitter oils and fine sediments. It yields an incredibly clean, high-clarity cup that beautifully highlights delicate floral and sweet fruit notes.',
      bn: 'Direka oleh ahli kimia pada 1941, menggunakan penapis kertas tebal khas yang menyekat minyak pahit dan ampas halus. Menghasilkan cawan paling bersih dan jernih, menonjolkan aroma bunga dan buah yang halus.',
    },
  },
  {
    name: 'Clever Dripper',
    summary: { id: 'Immersion full-body release', en: 'Hybrid immersion & drip release', bn: 'Hibrid rendaman & titisan' },
    geometry: { id: 'Trapezoid dengan Katup', en: 'Trapezoidal Immersion Chamber', bn: 'Ruang Rendaman Trapezoid' },
    filter: { id: 'Kertas Trapesium (Melitta)', en: 'Trapezoidal Paper Filter', bn: 'Penapis Kertas Trapezoid' },
    style: { id: 'Manis, Tebal, Tanpa Ampas', en: 'Rich Body & Sediment-Free Finish', bn: 'Badan Kaya & Tiada Ampas' },
    description: {
      id: 'Menggabungkan kepraktisan full immersion (seperti French Press) dengan kejernihan filter kertas. Kopi direndam sebelum katup dilepas saat diletakkan di atas server. Menghasilkan ekstraksi yang merata, manis, dan body tebal tanpa ampas.',
      en: 'Combines the simplicity of full immersion (like a French Press) with the clean finish of a paper filter. Coffee steeps before the base valve releases the drawdown on contact with your server. Delivers a sweet, full-bodied, and highly repeatable cup.',
      bn: 'Menggabungkan kesederhanaan rendaman penuh (macam French Press) dengan kejernihan penapis kertas. Kopi direndam sebelum injap dilepaskan apabila diletakkan di atas pelayan. Menghasilkan cawan manis, penuh badan, dan mudah diulang.',
    },
  },
  {
    name: 'AeroPress',
    summary: { id: 'Versatile press & bypass', en: 'Versatile pressurized immersion', bn: 'Rendaman bertekanan serba guna' },
    geometry: { id: 'Tabung Silinder Bertekanan', en: 'Cylindrical Chamber', bn: 'Ruang Silinder' },
    filter: { id: 'Mikro-kertas / Logam', en: 'Micro-paper or Metal Mesh', bn: 'Mikro-kertas / Mesh Logam' },
    style: { id: 'Ekstraksi Cepat & Fleksibilitas Tinggi', en: 'Intense Sweetness & High Versatility', bn: 'Manis Pekat & Sangat Serba Guna' },
    description: {
      id: 'Alat seduh portabel legendaris yang memanfaatkan tekanan piston. Sangat fleksibel—bisa menggunakan metode standar atau terbalik (inverted). Sangat baik untuk mengekstrak rasa manis yang intens dan body yang kaya dalam waktu singkat.',
      en: 'A legendary, portable chamber utilizing manual piston pressure. Highly versatile, it supports both standard and inverted methods, making it excellent for extracting intense sweetness, rich body, and low bitterness in under two minutes.',
      bn: 'Alat seduh mudah alih yang lagenda, menggunakan tekanan piston tangan. Sangat serba guna — menyokong kaedah standard dan terbalik, cemerlang untuk mengekstrak rasa manis pekat dan badan kaya dalam masa kurang dua minit.',
    },
  },
  {
    name: 'Switch / MUGEN',
    summary: { id: 'Hybrid immersion-drip flow', en: 'Immersion & zero-bypass hybrid', bn: 'Hibrid rendaman & tanpa pintasan' },
    geometry: { id: 'Hibrida / Aliran Dibatasi', en: 'Conical with Valve / Single-pour', bn: 'Konikal dengan Injap / Satu Tuangan' },
    filter: { id: 'Kertas Konikal V60', en: 'Conical Paper Filter', bn: 'Penapis Kertas Konikal V60' },
    style: { id: 'Eksperimen Ekstraksi Manis', en: 'Hybrid Immersion & Clean Sweetness', bn: 'Rendaman Hibrid & Manis Bersih' },
    description: {
      id: 'Hario Switch menggunakan katup bola baja untuk beralih antara immersion dan drip pour-over. Hario Mugen membatasi aliran air untuk metode sekali tuang. Sempurna untuk bereksperimen dengan ekstraksi hibrida yang menghasilkan manis yang luar biasa.',
      en: 'The Hario Switch utilizes a steel ball valve to transition between immersion steeping and drip pour-over. The Hario Mugen features flat ribs that restrict bypass for a slow, single-pour style. Perfect for hybrid extractions.',
      bn: 'Hario Switch menggunakan injap bola keluli untuk bertukar antara rendaman dan titisan pour-over. Hario Mugen mempunyai rusuk rata yang menyekat pintasan untuk gaya satu tuangan perlahan. Sempurna untuk eksperimen ekstraksi hibrid.',
    },
  },
  {
    name: 'Origami',
    summary: { id: 'Multi-shape · S / M', en: 'Fluted cone · S / M', bn: 'Kon berlipat · S / M' },
    geometry: { id: 'Lipatan Vertikal (20 Rusuk)', en: '20-fold Conical Groove', bn: 'Alur Konikal 20 Lipatan' },
    filter: { id: 'Kerucut (V60) / Gelombang (Wave)', en: 'Conical or Wave Paper Filter', bn: 'Penapis Konikal atau Gelombang' },
    style: { id: 'Aliran Cepat & Kustomisasi Filter', en: 'Rapid Drawdown & Filter Flexibility', bn: 'Aliran Pantas & Fleksibiliti Penapis' },
    description: {
      id: 'Dripper keramik/resin cantik dari Jepang dengan 20 lipatan vertikal yang menyerupai origami. Desain ini mendukung aliran udara yang cepat, memungkinkan Anda menggunakan kertas saring kerucut (V60) untuk kejernihan tinggi atau kertas gelombang (Kalita) untuk body tebal.',
      en: 'A striking Japanese ceramic/resin dripper with 20 vertical channels that resemble folded origami. Maximize airflow to support a rapid drawdown. Use conical filters for high acidity and clarity, or wave filters for a rounder, sweeter body.',
      bn: 'Dripper seramik/resin cantik dari Jepun dengan 20 saluran menegak menyerupai origami. Reka bentuk ani menyokong aliran udara pantas. Guna penapis konikal untuk kejernihan tinggi, atau penapis gelombang untuk badan rasa yang lebih bulat dan manis.',
    },
  },
  {
    name: 'April Brewer',
    summary: { id: 'Scandinavian flat-bottom clarity', en: 'Modern flat-bottom clarity', bn: 'Kejernihan dasar rata moden' },
    geometry: { id: 'Dasar Rata Aliran Cepat', en: 'Flat-bottom (Rapid Flow)', bn: 'Dasar Rata (Aliran Pantas)' },
    filter: { id: 'April Flat-bottom Paper', en: 'April Flat-bottom Filter', bn: 'Penapis Dasar Rata April' },
    style: { id: 'Kejernihan Rasa Buah & Bersih', en: 'Exceptional Clarity & Natural Sweetness', bn: 'Kejernihan Luar Biasa & Manis Semula Jadi' },
    description: {
      id: 'Dirancang oleh April Coffee Roasters di Copenhagen untuk menyeduh kopi specialty modern. Aliran airnya sangat cepat dan merata, menghasilkan kejernihan rasa buah yang sangat tinggi dengan rasa manis alami biji kopi yang bersih.',
      en: 'Designed by April Coffee Roasters in Copenhagen specifically for modern specialty coffees. Engineered for a rapid, highly uniform drawdown, it highlights exceptional fruit clarity and clean, intense natural sweetness.',
      bn: 'Direka oleh April Coffee Roasters di Copenhagen khusus untuk kopi specialty moden. Direka bentuk untuk aliran pantas dan sekata, menonjolkan kejernihan buah yang luar biasa dan rasa manis semula jadi yang bersih.',
    },
  },
  {
    name: 'Melitta',
    summary: { id: 'Timeless Aromaboy / 1x2', en: 'Classic trapezoid extraction', bn: 'Ekstraksi trapezoid klasik' },
    geometry: { id: 'Trapesium Klasik (1 Lubang)', en: 'Trapezoidal (Single exit hole)', bn: 'Trapezoid (Satu lubang keluar)' },
    filter: { id: 'Kertas Trapesium (Melitta)', en: 'Trapezoidal Paper Filter', bn: 'Penapis Kertas Trapezoid' },
    style: { id: 'Seimbang, Klasik & Konsisten', en: 'Traditional Body & Balance', bn: 'Badan Tradisional & Seimbang' },
    description: {
      id: 'Bentuk trapezoid klasik yang membatasi aliran air melalui satu lubang kecil di dasar. Desain ini memperpanjang waktu kontak air dan kopi secara alami, menghasilkan seduhan tradisional yang seimbang, manis, dan mudah dibuat di rumah.',
      en: 'Classic trapezoid design that restricts water flow to a single exit hole at the base. This naturally extends contact time, producing a traditional, comforting cup that is balanced, sweet, and highly repeatable.',
      bn: 'Reka bentuk trapezoid klasik yang menyekat aliran air kepada satu lubang keluar di dasar. Secara semula jadi memanjangkan masa sentuhan, menghasilkan cawan tradisional yang seimbang, manis, dan mudah diulang di rumah.',
    },
  },
  {
    name: 'Kono Meimon',
    summary: { id: 'Precision controlled flow', en: 'Slow conical extraction', bn: 'Ekstraksi konikal perlahan' },
    geometry: { id: 'Konikal dengan Rusuk Pendek', en: 'Conical (Short bottom ribs)', bn: 'Konikal (Rusuk pendek bawah)' },
    filter: { id: 'Kertas Konikal', en: 'Conical Paper Filter', bn: 'Penapis Kertas Konikal' },
    style: { id: 'Rasa Manis Intens & Body Kaya', en: 'Rich Mouthfeel & Deep Sweetness', bn: 'Rasa Mulut Kaya & Manis Mendalam' },
    description: {
      id: 'Dripper kerucut legendaris asal Jepang yang digunakan oleh para barista profesional. Rusuk pendek di bagian bawah memperlambat aliran air di akhir ekstraksi, menghasilkan rasa manis yang mendalam dan body yang kaya tanpa pahit berlebih.',
      en: 'A legendary Japanese conical dripper favored by specialty professionals. Its short ribs at the bottom restrict airflow near the end of the drawdown, accentuating deep sweetness and a rich mouthfeel while keeping bitterness at bay.',
      bn: 'Dripper kerucut lagenda dari Jepun yang digemari barista profesional. Rusuk pendek di bawah menyekat aliran udara menjelang akhir proses, menonjolkan rasa manis mendalam dan rasa mulut yang kaya tanpa kepahitan berlebihan.',
    },
  },
  {
    name: 'French Press',
    summary: { id: 'Rich full immersion body', en: 'Classic full-immersion steep', bn: 'Rendaman penuh klasik' },
    geometry: { id: 'Tabung Rendam Penuh', en: 'Cylindrical Chamber', bn: 'Ruang Silinder' },
    filter: { id: 'Kawat Logam Mesh', en: 'Stainless Steel Mesh Filter', bn: 'Penapis Mesh Keluli Tahan Karat' },
    style: { id: 'Body Sangat Tebal & Tekstur Kaya', en: 'Heavy Body & Velvety Texture', bn: 'Badan Berat & Tekstur Baldu' },
    description: {
      id: 'Metode rendam penuh (full immersion) paling klasik. Minyak kopi alami tidak tersaring oleh kertas, menghasilkan body yang sangat tebal, rasa yang padat, dan tekstur yang kaya. Kuncinya ada pada waktu kontak dan kebersihan ampas.',
      en: 'The quintessential full-immersion method. Natural coffee oils pass freely through the metal mesh filter, yielding a massive body, dense flavors, and a velvety texture. Success lies in steep time and minimizing fine silt.',
      bn: 'Kaedah rendaman penuh yang paling klasik. Minyak kopi semula jadi mengalir bebas melalui penapis mesh logam, menghasilkan badan yang sangat tebal, rasa padat, dan tekstur baldu. Kuncinya ialah masa rendaman dan mengurangkan ampas halus.',
    },
  },
  {
    name: 'Moka Pot',
    summary: { id: 'Stovetop intensity & aroma', en: 'Stovetop steam extraction', bn: 'Ekstraksi wap di atas dapur' },
    geometry: { id: 'Logam Bertekanan Uap', en: 'Dual-chamber Metal Pot', bn: 'Periuk Logam Dua Ruang' },
    filter: { id: 'Saringan Logam internal', en: 'Internal Metal Filter Screen', bn: 'Penapis Logam Dalaman' },
    style: { id: 'Pekat & Intensitas Tinggi', en: 'Intense, Concentrated Cup', bn: 'Pekat & Penuh Intensiti' },
    description: {
      id: 'Alat seduh kompor klasik Italia yang menghasilkan ekstraksi pekat menyerupai espresso menggunakan tekanan uap air mendidih. Menghasilkan rasa kopi yang kuat, tebal, dan sangat cocok dicampur dengan susu atau dinikmati langsung.',
      en: 'The classic Italian stovetop icon. It uses boiling steam pressure to force water up through the coffee bed, producing a concentrated, espresso-like extraction. Yields a bold, heavy-bodied cup that cuts beautifully through milk.',
      bn: 'Ikon dapur klasik Itali. Menggunakan tekanan wap mendidih untuk memaksa air naik melalui lapisan kopi, menghasilkan ekstraksi pekat macam espresso. Menghasilkan cawan kuat dan berat yang sangat sedap dicampur susu.',
    },
  },
  {
    name: 'Cold Brew / Toddy',
    summary: { id: 'Smooth dedicated cold brew', en: 'Smooth cold-steep concentrate', bn: 'Konsentrat rendaman sejuk' },
    geometry: { id: 'Tabung Ekstraksi Dingin', en: 'Deep Immersion Chamber', bn: 'Ruang Rendaman Dalam' },
    filter: { id: 'Felt / Kertas Tebal', en: 'Thick Felt or Paper Filter', bn: 'Penapis Felt atau Kertas Tebal' },
    style: { id: 'Keasaman Rendah & Manis Cokelat', en: 'Ultra-Low Acidity & Sweetness', bn: 'Keasidan Sangat Rendah & Manis' },
    description: {
      id: 'Ekstraksi air dingin jangka panjang (12-24 jam). Menghasilkan konsentrat kopi dengan tingkat keasaman (acidity) yang sangat rendah, rasa manis cokelat yang menonjol, dan kesegaran yang lembut untuk dinikmati dengan es atau susu.',
      en: 'A long-term cold water extraction process (12-24 hours). It produces a smooth coffee concentrate with exceptionally low acidity, heavy chocolate sweetness, and a clean finish, perfect over ice or with milk.',
      bn: 'Proses ekstraksi air sejuk jangka panjang (12-24 jam). Menghasilkan konsentrat kopi lembut dengan keasidan sangat rendah, rasa manis coklat yang menonjol, dan pengakhiran bersih — sempurna dengan ais atau susu.',
    },
  },
  {
    name: 'Batch Brewer',
    summary: { id: 'Consistent machine workflow', en: 'Consistent drip machine workflow', bn: 'Aliran kerja mesin titisan konsisten' },
    geometry: { id: 'Mesin Drip Otomatis', en: 'Flat-bottom or Cone Basket', bn: 'Bakul Dasar Rata atau Kon' },
    filter: { id: 'Kertas Keranjang (Basket)', en: 'Basket Paper Filter', bn: 'Penapis Kertas Bakul' },
    style: { id: 'Konsisten, Cepat & Volume Besar', en: 'Consistent Quality in Large Batches', bn: 'Kualiti Konsisten dalam Kuantiti Besar' },
    description: {
      id: 'Mesin seduh otomatis modern yang menjaga kestabilan suhu air dan distribusi shower head secara konsisten. Sangat andal untuk menyeduh kopi dalam jumlah besar tanpa mengorbankan kejernihan dan keseimbangan rasa specialty coffee.',
      en: 'Modern automatic drip machines that maintain precise water temperature and uniform showerhead distribution. Highly reliable for brewing larger volumes while preserving the clean clarity and balance of specialty coffee.',
      bn: 'Mesin titisan automatik moden yang mengekalkan suhu air tepat dan taburan pancuran sekata. Sangat boleh dipercayai untuk menyeduh kuantiti besar sambil mengekalkan kejernihan dan keseimbangan rasa kopi specialty.',
    },
  },
  {
    name: 'Hario Siphon',
    summary: { id: 'Theatrical vacuum brewing', en: 'Theatrical vacuum extraction', bn: 'Ekstraksi vakum yang menarik' },
    geometry: { id: 'Tabung Vakum Kaca ganda', en: 'Dual Glass Chambers', bn: 'Ruang Kaca Berkembar' },
    filter: { id: 'Kain Saring / Kertas', en: 'Cloth or Paper Filter Disc', bn: 'Cakera Penapis Kain atau Kertas' },
    style: { id: 'Kejernihan Murni & Suhu Panas', en: 'Vibrant Clarity & Silky Mouthfeel', bn: 'Kejernihan Segar & Rasa Mulut Sutera' },
    description: {
      id: 'Menyeduh menggunakan tekanan uap dan hisapan vakum. Menghasilkan tontonan visual yang indah dan cangkir kopi filter dengan kejernihan rasa buah yang sangat murni serta suhu penyajian yang panas dan stabil.',
      en: 'Brewing via vapor pressure and vacuum suction. Beyond the beautiful theatrical process, it delivers a clean filter cup with pure fruit notes, brilliant temperature stability, and an exceptionally silky mouthfeel.',
      bn: 'Menyeduh melalui tekanan wap dan sedutan vakum. Selain proses visual yang indah, menghasilkan cawan penapis bersih dengan nota buah murni, kestabilan suhu cemerlang, dan rasa mulut sutera yang luar biasa.',
    },
  },
  {
    name: 'Espresso',
    summary: { id: 'High-pressure precision extraction', en: 'High-pressure precision extraction', bn: 'Ekstraksi tekanan tinggi yang tepat' },
    geometry: { id: 'Keranjang Portafilter Logam', en: 'Precision Portafilter Basket', bn: 'Bakul Portafilter Tepat' },
    filter: { id: 'Keranjang Logam (Basket)', en: 'Stainless Steel Basket', bn: 'Bakul Keluli Tahan Karat' },
    style: { id: 'Crema Tebal & Intensitas Ekstrem', en: 'Thick Crema & Intense Concentration', bn: 'Crema Tebal & Kepekatan Penuh' },
    description: {
      id: 'Ekstraksi bertekanan tinggi (9 bar) dalam waktu singkat (20-30 detik). Menghasilkan crema keemasan yang kaya, body yang sangat tebal, aroma yang pekat, dan konsentrasi rasa manis serta keasaman kopi yang intens.',
      en: 'High-pressure (9 bar) extraction in a brief window (20-30 seconds). Generates a rich, golden crema, an intense concentration of sweetness and acidity, and a heavy, velvety texture that serves as the foundation for espresso drinks.',
      bn: 'Ekstraksi bertekanan tinggi (9 bar) dalam masa singkat (20-30 saat). Menghasilkan crema keemasan yang kaya, kepekatan rasa manis dan keasidan yang kuat, serta tekstur baldu berat yang menjadi asas minuman espresso.',
    },
  },
];

// ── Component-specific translations ─────────────────────────────────────────
const tx = {
  sectionIndex: { id: '03 / 06', en: '03 / 06', bn: '03 / 06' },
  title: {
    id: 'Satu Asisten untuk Seluruh Koleksi Alat Seduh Anda.',
    en: 'One Companion for Your Entire Brewer Collection.',
    bn: 'Satu Pembantu untuk Semua Koleksi Alat Seduh Anda.',
  },
  subtitle: {
    id: 'Kami memiliki data 36 alat seduh legendaris dunia. Ketuk salah satu untuk melihat karakter aslinya langsung dari catatan rasa barista kami.',
    en: 'We track details for 36 iconic brewing tools. Tap any to reveal its authentic character straight from our barista flavor notes.',
    bn: 'Kita mempunyai data 36 alat seduh lagenda dunia. Ketik mana-mana satu untuk melihat karakter aslinya terus dari catatan rasa barista kita.',
  },
  geometry: { id: 'Geometri:', en: 'Geometry:', bn: 'Geometri:' },
  filter: { id: 'Kertas Saring:', en: 'Filter:', bn: 'Penapis:' },
  flavorProfile: { id: 'Karakter Rasa:', en: 'Flavor Profile:', bn: 'Profil Rasa:' },
  baristaBadge: { id: 'Catatan Barista', en: 'Barista Note', bn: 'Catatan Barista' },
} satisfies Record<string, Record<Language, string>>;

export function BrewerGrid({ language }: { language: Language }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <section className="brewers section-shell" id="brewers" aria-labelledby="brewers-title">
      <ScrollReveal variant="dramatic">
        <div className="section-heading">
          <p className="section-index">{tx.sectionIndex[language]}</p>
          <div>
            <h2 id="brewers-title">
              {tx.title[language]}
            </h2>
            <p>
              {tx.subtitle[language]}
            </p>
          </div>
        </div>
      </ScrollReveal>

      <div className="brewer-list">
        {BREWERS_DATA.map((brewer, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <ScrollReveal key={brewer.name} delay={index * 0.02} variant="fade">
              <article
                className={`brewer-row ${isExpanded ? 'brewer-expanded' : ''}`}
                onClick={() => toggleExpand(index)}
                role="button"
                aria-expanded={isExpanded}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(index);
                  }
                }}
              >
                <div className="brewer-row-header">
                  <span className="brewer-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="brewer-glyph" aria-hidden="true">
                    <i className={`brewer-shape brewer-shape-${index % 4}`} />
                  </span>
                  <div className="brewer-row-title-wrap">
                    <h3>{brewer.name}</h3>
                    <p className="brewer-row-summary">
                      {brewer.summary[language]}
                    </p>
                  </div>
                  <span className="brewer-row-toggle" aria-hidden="true">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="brewer-row-body-overflow"
                    >
                      <div className="brewer-row-body">
                        <div className="brewer-meta-grid">
                          <div>
                            <strong>{tx.geometry[language]}</strong>
                            <span>{brewer.geometry[language]}</span>
                          </div>
                          <div>
                            <strong>{tx.filter[language]}</strong>
                            <span>{brewer.filter[language]}</span>
                          </div>
                          <div>
                            <strong>{tx.flavorProfile[language]}</strong>
                            <span>{brewer.style[language]}</span>
                          </div>
                        </div>
                        <div className="brewer-barista-note">
                          <div className="barista-badge">
                            <Check size={12} />
                            <span>{tx.baristaBadge[language]}</span>
                          </div>
                          <p>{brewer.description[language]}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
