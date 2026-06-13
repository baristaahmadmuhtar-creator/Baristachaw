import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollReveal } from './ScrollReveal';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

interface BrewerDetail {
  name: string;
  summary: { id: string; en: string };
  geometry: { id: string; en: string };
  filter: { id: string; en: string };
  style: { id: string; en: string };
  description: { id: string; en: string };
}

const BREWERS_DATA: BrewerDetail[] = [
  {
    name: 'V60',
    summary: { id: 'Pour-over klasik · hot & iced', en: 'Classic pour-over · Hot & Iced' },
    geometry: { id: 'Konikal (Kerucut 60°)', en: 'Conical (60° Angle)' },
    filter: { id: 'Kertas Tipis (V60)', en: 'Conical Paper Filter' },
    style: { id: 'Kejernihan & Keasaman Tinggi', en: 'Vibrant Acidity & Clean Clarity' },
    description: {
      id: 'Geometri kerucut 60 derajat dengan alur spiral khas Hario. Alat seduh paling populer di dunia untuk menonjolkan keasaman buah (acidity) dan kejernihan rasa (clarity) yang bersih. Sangat sensitif terhadap kecepatan tuang Anda—di sinilah BaristaChaw membantu menjaga konsistensi tuangan Anda.',
      en: 'Iconic 60-degree conical geometry with spiral ribs. The world\'s baseline brewer for highlighting vibrant fruit acidity and clean cup clarity. It is highly sensitive to pour rate—which is where BaristaChaw\'s real-time guides help you maintain a steady, uniform pour.',
    },
  },
  {
    name: 'Kalita Wave',
    summary: { id: 'Flat bottom · 155 / 185', en: 'Flat-bottom · 155 / 185' },
    geometry: { id: 'Dasar Rata (3 Lubang)', en: 'Flat-Bottom (3 exit holes)' },
    filter: { id: 'Kertas Gelombang (Wave)', en: 'Wave-style Ruffled Filter' },
    style: { id: 'Rasa Manis & Ekstraksi Merata', en: 'Uniform Extraction & High Sweetness' },
    description: {
      id: 'Alat seduh dengan dasar rata dan tiga lubang pembuangan. Desain wave meminimalkan kontak kertas dengan dinding dripper untuk suhu yang lebih stabil. Sangat bersahabat (forgiving) dan menghasilkan ekstraksi yang merata dengan rasa manis (sweetness) serta body yang tebal.',
      en: 'Flat-bottom geometry with three small exit holes and signature ruffled wave filters that insulate the slurry to maintain thermal stability. Exceptionally forgiving, it delivers highly uniform extractions with rich sweetness and a rounder body.',
    },
  },
  {
    name: 'Chemex',
    summary: { id: 'Clean, bold large-format brew', en: 'High-clarity, large-format filter brew' },
    geometry: { id: 'Konikal Kaca Tebal', en: 'Conical Glass Carafe' },
    filter: { id: 'Kertas Tebal Khusus', en: 'Proprietary Thick Paper Filter' },
    style: { id: 'Kejernihan Sangat Tinggi (Bebas Minyak)', en: 'Excellent Clarity & Zero Sediment' },
    description: {
      id: 'Diciptakan oleh kimiawan pada tahun 1941, menggunakan kertas saring tebal khusus yang menahan minyak kopi dan sedimen halus. Hasil seduhannya adalah cangkir paling bersih dan jernih yang pernah Anda rasakan, menonjolkan aroma bunga dan buah yang halus.',
      en: 'Designed by a chemist in 1941, utilizing thick, proprietary paper filters that trap bitter oils and fine sediments. It yields an incredibly clean, high-clarity cup that beautifully highlights delicate floral and sweet fruit notes.',
    },
  },
  {
    name: 'Clever Dripper',
    summary: { id: 'Immersion full-body release', en: 'Hybrid immersion & drip release' },
    geometry: { id: 'Trapezoid dengan Katup', en: 'Trapezoidal Immersion Chamber' },
    filter: { id: 'Kertas Trapesium (Melitta)', en: 'Trapezoidal Paper Filter' },
    style: { id: 'Manis, Tebal, Tanpa Ampas', en: 'Rich Body & Sediment-Free Finish' },
    description: {
      id: 'Menggabungkan kepraktisan full immersion (seperti French Press) dengan kejernihan filter kertas. Kopi direndam sebelum katup dilepas saat diletakkan di atas server. Menghasilkan ekstraksi yang merata, manis, dan body tebal tanpa ampas.',
      en: 'Combines the simplicity of full immersion (like a French Press) with the clean finish of a paper filter. Coffee steeps before the base valve releases the drawdown on contact with your server. Delivers a sweet, full-bodied, and highly repeatable cup.',
    },
  },
  {
    name: 'AeroPress',
    summary: { id: 'Versatile press & bypass', en: 'Versatile pressurized immersion' },
    geometry: { id: 'Tabung Silinder Bertekanan', en: 'Cylindrical Chamber' },
    filter: { id: 'Mikro-kertas / Logam', en: 'Micro-paper or Metal Mesh' },
    style: { id: 'Ekstraksi Cepat & Fleksibilitas Tinggi', en: 'Intense Sweetness & High Versatility' },
    description: {
      id: 'Alat seduh portabel legendaris yang memanfaatkan tekanan piston. Sangat fleksibel—bisa menggunakan metode standar atau terbalik (inverted). Sangat baik untuk mengekstrak rasa manis yang intens dan body yang kaya dalam waktu singkat.',
      en: 'A legendary, portable chamber utilizing manual piston pressure. Highly versatile, it supports both standard and inverted methods, making it excellent for extracting intense sweetness, rich body, and low bitterness in under two minutes.',
    },
  },
  {
    name: 'Switch / MUGEN',
    summary: { id: 'Hybrid immersion-drip flow', en: 'Immersion & zero-bypass hybrid' },
    geometry: { id: 'Hibrida / Aliran Dibatasi', en: 'Conical with Valve / Single-pour' },
    filter: { id: 'Kertas Konikal V60', en: 'Conical Paper Filter' },
    style: { id: 'Eksperimen Ekstraksi Manis', en: 'Hybrid Immersion & Clean Sweetness' },
    description: {
      id: 'Hario Switch menggunakan katup bola baja untuk beralih antara immersion dan drip pour-over. Hario Mugen membatasi aliran air untuk metode sekali tuang. Sempurna untuk bereksperimen dengan ekstraksi hibrida yang menghasilkan manis yang luar biasa.',
      en: 'The Hario Switch utilizes a steel ball valve to transition between immersion steeping and drip pour-over. The Hario Mugen features flat ribs that restrict bypass for a slow, single-pour style. Perfect for hybrid extractions.',
    },
  },
  {
    name: 'Origami',
    summary: { id: 'Multi-shape · S / M', en: 'Fluted cone · S / M' },
    geometry: { id: 'Lipatan Vertikal (20 Rusuk)', en: '20-fold Conical Groove' },
    filter: { id: 'Kerucut (V60) / Gelombang (Wave)', en: 'Conical or Wave Paper Filter' },
    style: { id: 'Aliran Cepat & Kustomisasi Filter', en: 'Rapid Drawdown & Filter Flexibility' },
    description: {
      id: 'Dripper keramik/resin cantik dari Jepang dengan 20 lipatan vertikal yang menyerupai origami. Desain ini mendukung aliran udara yang cepat, memungkinkan Anda menggunakan kertas saring kerucut (V60) untuk kejernihan tinggi atau kertas gelombang (Kalita) untuk body tebal.',
      en: 'A striking Japanese ceramic/resin dripper with 20 vertical channels that resemble folded origami. Maximize airflow to support a rapid drawdown. Use conical filters for high acidity and clarity, or wave filters for a rounder, sweeter body.',
    },
  },
  {
    name: 'April Brewer',
    summary: { id: 'Scandinavian flat-bottom clarity', en: 'Modern flat-bottom clarity' },
    geometry: { id: 'Dasar Rata Aliran Cepat', en: 'Flat-bottom (Rapid Flow)' },
    filter: { id: 'April Flat-bottom Paper', en: 'April Flat-bottom Filter' },
    style: { id: 'Kejernihan Rasa Buah & Bersih', en: 'Exceptional Clarity & Natural Sweetness' },
    description: {
      id: 'Dirancang oleh April Coffee Roasters di Copenhagen untuk menyeduh kopi specialty modern. Aliran airnya sangat cepat dan merata, menghasilkan kejernihan rasa buah yang sangat tinggi dengan rasa manis alami biji kopi yang bersih.',
      en: 'Designed by April Coffee Roasters in Copenhagen specifically for modern specialty coffees. Engineered for a rapid, highly uniform drawdown, it highlights exceptional fruit clarity and clean, intense natural sweetness.',
    },
  },
  {
    name: 'Melitta',
    summary: { id: 'Timeless Aromaboy / 1x2', en: 'Classic trapezoid extraction' },
    geometry: { id: 'Trapesium Klasik (1 Lubang)', en: 'Trapezoidal (Single exit hole)' },
    filter: { id: 'Kertas Trapesium (Melitta)', en: 'Trapezoidal Paper Filter' },
    style: { id: 'Seimbang, Klasik & Konsisten', en: 'Traditional Body & Balance' },
    description: {
      id: 'Bentuk trapezoid klasik yang membatasi aliran air melalui satu lubang kecil di dasar. Desain ini memperpanjang waktu kontak air dan kopi secara alami, menghasilkan seduhan tradisional yang seimbang, manis, dan mudah dibuat di rumah.',
      en: 'Classic trapezoid design that restricts water flow to a single exit hole at the base. This naturally extends contact time, producing a traditional, comforting cup that is balanced, sweet, and highly repeatable.',
    },
  },
  {
    name: 'Kono Meimon',
    summary: { id: 'Precision controlled flow', en: 'Slow conical extraction' },
    geometry: { id: 'Konikal dengan Rusuk Pendek', en: 'Conical (Short bottom ribs)' },
    filter: { id: 'Kertas Konikal', en: 'Conical Paper Filter' },
    style: { id: 'Rasa Manis Intens & Body Kaya', en: 'Rich Mouthfeel & Deep Sweetness' },
    description: {
      id: 'Dripper kerucut legendaris asal Jepang yang digunakan oleh para barista profesional. Rusuk pendek di bagian bawah memperlambat aliran air di akhir ekstraksi, menghasilkan rasa manis yang mendalam dan body yang kaya tanpa pahit berlebih.',
      en: 'A legendary Japanese conical dripper favored by specialty professionals. Its short ribs at the bottom restrict airflow near the end of the drawdown, accentuating deep sweetness and a rich mouthfeel while keeping bitterness at bay.',
    },
  },
  {
    name: 'French Press',
    summary: { id: 'Rich full immersion body', en: 'Classic full-immersion steep' },
    geometry: { id: 'Tabung Rendam Penuh', en: 'Cylindrical Chamber' },
    filter: { id: 'Kawat Logam Mesh', en: 'Stainless Steel Mesh Filter' },
    style: { id: 'Body Sangat Tebal & Tekstur Kaya', en: 'Heavy Body & Velvety Texture' },
    description: {
      id: 'Metode rendam penuh (full immersion) paling klasik. Minyak kopi alami tidak tersaring oleh kertas, menghasilkan body yang sangat tebal, rasa yang padat, dan tekstur yang kaya. Kuncinya ada pada waktu kontak dan kebersihan ampas.',
      en: 'The quintessential full-immersion method. Natural coffee oils pass freely through the metal mesh filter, yielding a massive body, dense flavors, and a velvety texture. Success lies in steep time and minimizing fine silt.',
    },
  },
  {
    name: 'Moka Pot',
    summary: { id: 'Stovetop intensity & aroma', en: 'Stovetop steam extraction' },
    geometry: { id: 'Logam Bertekanan Uap', en: 'Dual-chamber Metal Pot' },
    filter: { id: 'Saringan Logam internal', en: 'Internal Metal Filter Screen' },
    style: { id: 'Pekat & Intensitas Tinggi', en: 'Intense, Concentrated Cup' },
    description: {
      id: 'Alat seduh kompor klasik Italia yang menghasilkan ekstraksi pekat menyerupai espresso menggunakan tekanan uap air mendidih. Menghasilkan rasa kopi yang kuat, tebal, dan sangat cocok dicampur dengan susu atau dinikmati langsung.',
      en: 'The classic Italian stovetop icon. It uses boiling steam pressure to force water up through the coffee bed, producing a concentrated, espresso-like extraction. Yields a bold, heavy-bodied cup that cuts beautifully through milk.',
    },
  },
  {
    name: 'Cold Brew / Toddy',
    summary: { id: 'Smooth dedicated cold brew', en: 'Smooth cold-steep concentrate' },
    geometry: { id: 'Tabung Ekstraksi Dingin', en: 'Deep Immersion Chamber' },
    filter: { id: 'Felt / Kertas Tebal', en: 'Thick Felt or Paper Filter' },
    style: { id: 'Keasaman Rendah & Manis Cokelat', en: 'Ultra-Low Acidity & Sweetness' },
    description: {
      id: 'Ekstraksi air dingin jangka panjang (12-24 jam). Menghasilkan konsentrat kopi dengan tingkat keasaman (acidity) yang sangat rendah, rasa manis cokelat yang menonjol, dan kesegaran yang lembut untuk dinikmati dengan es atau susu.',
      en: 'A long-term cold water extraction process (12-24 hours). It produces a smooth coffee concentrate with exceptionally low acidity, heavy chocolate sweetness, and a clean finish, perfect over ice or with milk.',
    },
  },
  {
    name: 'Batch Brewer',
    summary: { id: 'Consistent machine workflow', en: 'Consistent drip machine workflow' },
    geometry: { id: 'Mesin Drip Otomatis', en: 'Flat-bottom or Cone Basket' },
    filter: { id: 'Kertas Keranjang (Basket)', en: 'Basket Paper Filter' },
    style: { id: 'Konsisten, Cepat & Volume Besar', en: 'Consistent Quality in Large Batches' },
    description: {
      id: 'Mesin seduh otomatis modern yang menjaga kestabilan suhu air dan distribusi shower head secara konsisten. Sangat andal untuk menyeduh kopi dalam jumlah besar tanpa mengorbankan kejernihan dan keseimbangan rasa specialty coffee.',
      en: 'Modern automatic drip machines that maintain precise water temperature and uniform showerhead distribution. Highly reliable for brewing larger volumes while preserving the clean clarity and balance of specialty coffee.',
    },
  },
  {
    name: 'Hario Siphon',
    summary: { id: 'Theatrical vacuum brewing', en: 'Theatrical vacuum extraction' },
    geometry: { id: 'Tabung Vakum Kaca ganda', en: 'Dual Glass Chambers' },
    filter: { id: 'Kain Saring / Kertas', en: 'Cloth or Paper Filter Disc' },
    style: { id: 'Kejernihan Murni & Suhu Panas', en: 'Vibrant Clarity & Silky Mouthfeel' },
    description: {
      id: 'Menyeduh menggunakan tekanan uap dan hisapan vakum. Menghasilkan tontonan visual yang indah dan cangkir kopi filter dengan kejernihan rasa buah yang sangat murni serta suhu penyajian yang panas dan stabil.',
      en: 'Brewing via vapor pressure and vacuum suction. Beyond the beautiful theatrical process, it delivers a clean filter cup with pure fruit notes, brilliant temperature stability, and an exceptionally silky mouthfeel.',
    },
  },
  {
    name: 'Espresso',
    summary: { id: 'High-pressure precision extraction', en: 'High-pressure precision extraction' },
    geometry: { id: 'Keranjang Portafilter Logam', en: 'Precision Portafilter Basket' },
    filter: { id: 'Keranjang Logam (Basket)', en: 'Stainless Steel Basket' },
    style: { id: 'Crema Tebal & Intensitas Ekstrem', en: 'Thick Crema & Intense Concentration' },
    description: {
      id: 'Ekstraksi bertekanan tinggi (9 bar) dalam waktu singkat (20-30 detik). Menghasilkan crema keemasan yang kaya, body yang sangat tebal, aroma yang pekat, dan konsentrasi rasa manis serta keasaman kopi yang intens.',
      en: 'High-pressure (9 bar) extraction in a brief window (20-30 seconds). Generates a rich, golden crema, an intense concentration of sweetness and acidity, and a heavy, velvety texture that serves as the foundation for espresso drinks.',
    },
  },
];

export function BrewerGrid({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <section className="brewers section-shell" id="brewers" aria-labelledby="brewers-title">
      <ScrollReveal variant="dramatic">
        <div className="section-heading">
          <p className="section-index">03 / 06</p>
          <div>
            <h2 id="brewers-title">
              {isId
                ? 'Satu Asisten untuk Seluruh Koleksi Alat Seduh Anda.'
                : 'One Companion for Your Entire Brewer Collection.'}
            </h2>
            <p>
              {isId
                ? 'Kami memiliki data 36 alat seduh legendaris dunia. Ketuk salah satu untuk melihat karakter aslinya langsung dari catatan rasa barista kami.'
                : 'We track details for 36 iconic brewing tools. Tap any to reveal its authentic character straight from our barista flavor notes.'}
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
                      {isId ? brewer.summary.id : brewer.summary.en}
                    </p>
                  </div>
                  <button className="brewer-row-toggle" aria-label="Toggle Details">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
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
                            <strong>{isId ? 'Geometri:' : 'Geometry:'}</strong>
                            <span>{isId ? brewer.geometry.id : brewer.geometry.en}</span>
                          </div>
                          <div>
                            <strong>{isId ? 'Kertas Saring:' : 'Filter:'}</strong>
                            <span>{isId ? brewer.filter.id : brewer.filter.en}</span>
                          </div>
                          <div>
                            <strong>{isId ? 'Karakter Rasa:' : 'Flavor Profile:'}</strong>
                            <span>{isId ? brewer.style.id : brewer.style.en}</span>
                          </div>
                        </div>
                        <div className="brewer-barista-note">
                          <div className="barista-badge">
                            <Check size={12} />
                            <span>{isId ? 'Catatan Barista' : 'Barista Note'}</span>
                          </div>
                          <p>{isId ? brewer.description.id : brewer.description.en}</p>
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
