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
    summary: { id: 'Pour-over klasik · hot & iced', en: 'Classic pour-over · hot & iced' },
    geometry: { id: 'Konikal (Kerucut 60°)', en: 'Conical (60° Cone)' },
    filter: { id: 'Kertas Tipis (V60)', en: 'Thin Paper (V60)' },
    style: { id: 'Kejernihan & Keasaman Tinggi', en: 'High Clarity & Acidity' },
    description: {
      id: 'Geometri kerucut 60 derajat dengan alur spiral khas Hario. Alat seduh paling populer di dunia untuk menonjolkan keasaman buah (acidity) dan kejernihan rasa (clarity) yang bersih. Sangat sensitif terhadap kecepatan tuang Anda—di sinilah BaristaChaw membantu menjaga konsistensi tuangan Anda.',
      en: 'Iconic 60-degree conical geometry with spiral ribs. The world\'s go-to brewer for highlighting vibrant fruit acidity and clean cup clarity. Highly sensitive to your pour rate—which is exactly where BaristaChaw guides your pouring speed to ensure consistency.',
    },
  },
  {
    name: 'Kalita Wave',
    summary: { id: 'Flat bottom · 155 / 185', en: 'Flat bottom · 155 / 185' },
    geometry: { id: 'Dasar Rata (3 Lubang)', en: 'Flat Bottom (3 Holes)' },
    filter: { id: 'Kertas Gelombang (Wave)', en: 'Wave / Ruffled Paper' },
    style: { id: 'Rasa Manis & Ekstraksi Merata', en: 'Sweetness & Even Extraction' },
    description: {
      id: 'Alat seduh dengan dasar rata dan tiga lubang pembuangan. Desain wave meminimalkan kontak kertas dengan dinding dripper untuk suhu yang lebih stabil. Sangat bersahabat (forgiving) dan menghasilkan ekstraksi yang merata dengan rasa manis (sweetness) serta body yang tebal.',
      en: 'Flat-bottom dripper with three exit holes and signature ruffled wave filters that reduce contact with the brewer wall to maintain temperature stability. Exceptionally forgiving, delivering highly uniform extractions with rich sweetness and a heavier body.',
    },
  },
  {
    name: 'Chemex',
    summary: { id: 'Clean, bold large-format brew', en: 'Clean, bold large-format brew' },
    geometry: { id: 'Konikal Kaca Tebal', en: 'Thick Glass Conical' },
    filter: { id: 'Kertas Tebal Khusus', en: 'Proprietary Heavy Paper' },
    style: { id: 'Kejernihan Sangat Tinggi (Bebas Minyak)', en: 'Ultra High Clarity (Oil-Free)' },
    description: {
      id: 'Diciptakan oleh kimiawan pada tahun 1941, menggunakan kertas saring tebal khusus yang menahan minyak kopi dan sedimen halus. Hasil seduhannya adalah cangkir paling bersih dan jernih yang pernah Anda rasakan, menonjolkan aroma bunga dan buah yang halus.',
      en: 'Designed by a chemist in 1941, utilizing heavy proprietary paper filters that trap bitter oils and fine sediments. It produces the cleanest, highest-clarity cup imaginable, showcasing delicate floral and sweet fruit notes.',
    },
  },
  {
    name: 'Clever Dripper',
    summary: { id: 'Immersion full-body release', en: 'Immersion full-body release' },
    geometry: { id: 'Trapezoid dengan Katup', en: 'Trapezoid with Valve' },
    filter: { id: 'Kertas Trapesium (Melitta)', en: 'Trapezoid Paper (Melitta)' },
    style: { id: 'Manis, Tebal, Tanpa Ampas', en: 'Sweet, Bold, Sediment-Free' },
    description: {
      id: 'Menggabungkan kepraktisan full immersion (seperti French Press) dengan kejernihan filter kertas. Kopi direndam sebelum katup dilepas saat diletakkan di atas server. Menghasilkan ekstraksi yang merata, manis, dan body tebal tanpa ampas.',
      en: 'Combines the simplicity of full immersion (like French Press) with the clean finish of a paper filter. Coffee steeps until placed on a server, releasing the drawdown valve. Delivers a sweet, full-bodied, and highly repeatable cup without sediment.',
    },
  },
  {
    name: 'AeroPress',
    summary: { id: 'Versatile press & bypass', en: 'Versatile press & bypass' },
    geometry: { id: 'Tabung Silinder Bertekanan', en: 'Pressurized Cylinder' },
    filter: { id: 'Mikro-kertas / Logam', en: 'Micro-paper / Metal Screen' },
    style: { id: 'Ekstraksi Cepat & Fleksibilitas Tinggi', en: 'Fast Extraction & High Versatility' },
    description: {
      id: 'Alat seduh portabel legendaris yang memanfaatkan tekanan piston. Sangat fleksibel—bisa menggunakan metode standar atau terbalik (inverted). Sangat baik untuk mengekstrak rasa manis yang intens dan body yang kaya dalam waktu singkat.',
      en: 'A legendary, portable chamber utilizing manual piston pressure. Highly versatile, supporting both standard and inverted methods. Excellent for extracting intense sweetness, rich body, and low bitterness in under two minutes.',
    },
  },
  {
    name: 'Switch / MUGEN',
    summary: { id: 'Hybrid immersion-drip flow', en: 'Hybrid immersion-drip flow' },
    geometry: { id: 'Hibrida / Aliran Dibatasi', en: 'Hybrid / Restricted Bypass' },
    filter: { id: 'Kertas Konikal V60', en: 'Conical Paper (V60)' },
    style: { id: 'Eksperimen Ekstraksi Manis', en: 'Sweet Extraction Experiments' },
    description: {
      id: 'Hario Switch menggunakan katup bola baja untuk beralih antara immersion dan drip pour-over. Hario Mugen membatasi aliran air untuk metode sekali tuang. Sempurna untuk bereksperimen dengan ekstraksi hibrida yang menghasilkan manis yang luar biasa.',
      en: 'The Hario Switch features a steel ball valve to transition between immersion and drip pour-over. The Hario Mugen restricts bypass for a slow, single-pour style. Perfect for hybrid extractions that highlight incredible sweetness.',
    },
  },
  {
    name: 'Origami',
    summary: { id: 'Multi-shape · S / M', en: 'Multi-shape · S / M' },
    geometry: { id: 'Lipatan Vertikal (20 Rusuk)', en: 'Vertical Folds (20 Ribs)' },
    filter: { id: 'Kerucut (V60) / Gelombang (Wave)', en: 'Conical (V60) or Wave (Kalita)' },
    style: { id: 'Aliran Cepat & Kustomisasi Filter', en: 'Fast Flow & Filter Customization' },
    description: {
      id: 'Dripper keramik/resin cantik dari Jepang dengan 20 lipatan vertikal yang menyerupai origami. Desain ini mendukung aliran udara yang cepat, memungkinkan Anda menggunakan kertas saring kerucut (V60) untuk kejernihan tinggi atau kertas gelombang (Kalita) untuk body tebal.',
      en: 'Beautiful Japanese ceramic/resin dripper with 20 vertical folds resembling origami. This layout maximizes airflow, letting you use conical filters (V60) for high acidity and clarity, or wave filters (Kalita) for a rounder, sweeter body.',
    },
  },
  {
    name: 'April Brewer',
    summary: { id: 'Scandinavian flat-bottom clarity', en: 'Scandinavian flat-bottom clarity' },
    geometry: { id: 'Dasar Rata Aliran Cepat', en: 'Fast-Flow Flat Bottom' },
    filter: { id: 'April Flat-bottom Paper', en: 'April Flat-bottom Paper' },
    style: { id: 'Kejernihan Rasa Buah & Bersih', en: 'Fruit Clarity & Clean Cup' },
    description: {
      id: 'Dirancang oleh April Coffee Roasters di Copenhagen untuk menyeduh kopi specialty modern. Aliran airnya sangat cepat dan merata, menghasilkan kejernihan rasa buah yang sangat tinggi dengan rasa manis alami biji kopi yang bersih.',
      en: 'Designed by April Coffee Roasters in Copenhagen for modern specialty coffees. Engineered for rapid, highly uniform water flow, generating exceptional fruit clarity alongside a clean, intense natural sweetness.',
    },
  },
  {
    name: 'Melitta',
    summary: { id: 'Timeless Aromaboy / 1x2', en: 'Timeless Aromaboy / 1x2' },
    geometry: { id: 'Trapesium Klasik (1 Lubang)', en: 'Classic Trapezoid (1 Hole)' },
    filter: { id: 'Kertas Trapesium (Melitta)', en: 'Trapezoid Paper (Melitta)' },
    style: { id: 'Seimbang, Klasik & Konsisten', en: 'Balanced, Classic & Reliable' },
    description: {
      id: 'Bentuk trapezoid klasik yang membatasi aliran air melalui satu lubang kecil di dasar. Desain ini memperpanjang waktu kontak air dan kopi secara alami, menghasilkan seduhan tradisional yang seimbang, manis, dan mudah dibuat di rumah.',
      en: 'Classic trapezoid design restricting water flow to a single small hole at the bottom. This naturally extends contact time, producing a traditional, comforting cup that is balanced, sweet, and highly reliable for home brewers.',
    },
  },
  {
    name: 'Kono Meimon',
    summary: { id: 'Precision controlled flow', en: 'Precision controlled flow' },
    geometry: { id: 'Konikal dengan Rusuk Pendek', en: 'Conical with Short Ribs' },
    filter: { id: 'Kertas Konikal', en: 'Conical Paper' },
    style: { id: 'Rasa Manis Intens & Body Kaya', en: 'Intense Sweetness & Rich Body' },
    description: {
      id: 'Dripper kerucut legendaris asal Jepang yang digunakan oleh para barista profesional. Rusuk pendek di bagian bawah memperlambat aliran air di akhir ekstraksi, menghasilkan rasa manis yang mendalam dan body yang kaya tanpa pahit berlebih.',
      en: 'Legendary Japanese conical dripper favored by professional baristas. Its short ribs at the base restrict airflow near the end of the brew, accentuating deep sweetness and a rich mouthfeel without extracting harsh bitterness.',
    },
  },
  {
    name: 'French Press',
    summary: { id: 'Rich full immersion body', en: 'Rich full immersion body' },
    geometry: { id: 'Tabung Rendam Penuh', en: 'Full Immersion Cylinder' },
    filter: { id: 'Kawat Logam Mesh', en: 'Metal Mesh Screen' },
    style: { id: 'Body Sangat Tebal & Tekstur Kaya', en: 'Heavy Body & Rich Texture' },
    description: {
      id: 'Metode rendam penuh (full immersion) paling klasik. Minyak kopi alami tidak tersaring oleh kertas, menghasilkan body yang sangat tebal, rasa yang padat, dan tekstur yang kaya. Kuncinya ada pada waktu kontak dan kebersihan ampas.',
      en: 'The quintessential full-immersion method. Natural coffee oils pass freely through the metal mesh filter, yielding a massive body, dense flavors, and a rich, velvety texture. Success lies in contact time and minimizing silt.',
    },
  },
  {
    name: 'Moka Pot',
    summary: { id: 'Stovetop intensity & aroma', en: 'Stovetop intensity & aroma' },
    geometry: { id: 'Logam Bertekanan Uap', en: 'Stovetop Steam Pressure' },
    filter: { id: 'Saringan Logam internal', en: 'Internal Metal Filter' },
    style: { id: 'Pekat & Intensitas Tinggi', en: 'Concentrated & High Intensity' },
    description: {
      id: 'Alat seduh kompor klasik Italia yang menghasilkan ekstraksi pekat menyerupai espresso menggunakan tekanan uap air mendidih. Menghasilkan rasa kopi yang kuat, tebal, dan sangat cocok dicampur dengan susu atau dinikmati langsung.',
      en: 'Classic Italian stovetop brewer producing a concentrated, espresso-like extraction using boiling steam pressure. Yields a bold, heavy-bodied cup that cuts beautifully through milk or stands intense on its own.',
    },
  },
  {
    name: 'Cold Brew / Toddy',
    summary: { id: 'Smooth dedicated cold brew', en: 'Smooth dedicated cold brew' },
    geometry: { id: 'Tabung Ekstraksi Dingin', en: 'Cold Extraction Chamber' },
    filter: { id: 'Felt / Kertas Tebal', en: 'Felt / Heavy Paper Filter' },
    style: { id: 'Keasaman Rendah & Manis Cokelat', en: 'Low Acidity & Chocolate Sweetness' },
    description: {
      id: 'Ekstraksi air dingin jangka panjang (12-24 jam). Menghasilkan konsentrat kopi dengan tingkat keasaman (acidity) yang sangat rendah, rasa manis cokelat yang menonjol, dan kesegaran yang lembut untuk dinikmati dengan es atau susu.',
      en: 'Long-term cold water extraction (12-24 hours). Produces a smooth coffee concentrate with exceptionally low acidity, heavy chocolate sweetness, and a clean finish, perfect over ice or blended with milk.',
    },
  },
  {
    name: 'Batch Brewer',
    summary: { id: 'Consistent machine workflow', en: 'Consistent machine workflow' },
    geometry: { id: 'Mesin Drip Otomatis', en: 'Automatic Drip Machine' },
    filter: { id: 'Kertas Keranjang (Basket)', en: 'Basket Filter Paper' },
    style: { id: 'Konsisten, Cepat & Volume Besar', en: 'Consistent, Fast & Large Volume' },
    description: {
      id: 'Mesin seduh otomatis modern yang menjaga kestabilan suhu air dan distribusi shower head secara konsisten. Sangat andal untuk menyeduh kopi dalam jumlah besar tanpa mengorbankan kejernihan dan keseimbangan rasa specialty coffee.',
      en: 'Modern automatic drip machines that maintain precise water temperature and uniform showerhead distribution. Highly reliable for brewing larger volumes while preserving the clean clarity and balance of specialty coffee.',
    },
  },
  {
    name: 'Hario Siphon',
    summary: { id: 'Theatrical vacuum brewing', en: 'Theatrical vacuum brewing' },
    geometry: { id: 'Tabung Vakum Kaca ganda', en: 'Double Glass Vacuum Chamber' },
    filter: { id: 'Kain Saring / Kertas', en: 'Cloth or Paper Filter' },
    style: { id: 'Kejernihan Murni & Suhu Panas', en: 'Pure Clarity & Hot Temperature' },
    description: {
      id: 'Menyeduh menggunakan tekanan uap dan hisapan vakum. Menghasilkan tontonan visual yang indah dan cangkir kopi filter dengan kejernihan rasa buah yang sangat murni serta suhu penyajian yang panas dan stabil.',
      en: 'Brewing via vapor pressure and vacuum suction. Creates a beautiful theatrical process while delivering a clean filter cup with pure fruit notes, brilliant temperature stability, and a silky mouthfeel.',
    },
  },
  {
    name: 'Espresso',
    summary: { id: 'High-pressure precision extraction', en: 'High-pressure precision extraction' },
    geometry: { id: 'Keranjang Portafilter Logam', en: 'Metal Portafilter Basket' },
    filter: { id: 'Keranjang Logam (Basket)', en: 'Metal Basket Filter' },
    style: { id: 'Crema Tebal & Intensitas Ekstrem', en: 'Thick Crema & Extreme Intensity' },
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
