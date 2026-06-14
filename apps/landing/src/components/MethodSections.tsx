import { ScrollReveal } from './ScrollReveal';
import type { Language } from '../i18n';

const PROBLEMS = [
  {
    id: ['Rasa yang Selalu Berubah', 'Biji kopi yang sama, alat yang sama — tapi rasa hari ini tak pernah sama dengan kemarin.'],
    en: ['The Shifting Cup', "Same beans, same equipment — yet today's cup never quite matches yesterday's."],
    bn: ['Rasa yang Sentiasa Berubah', 'Biji kopi sama, alat sama — tapi rasa hari ani tidak pernah sama macam semalam.'],
  },
  {
    id: ['Kebingungan Parameter', 'Suhu air, ukuran gilingan, rasio air… terlalu banyak variabel untuk diingat sendiri.'],
    en: ['Parameter Overload', 'Water temperature, grind size, brew ratio… too many moving parts to track by yourself.'],
    bn: ['Terlalu Banyak Parameter', 'Suhu air, saiz kisaran, nisbah seduhan… terlalu banyak benda untuk diingat sendiri.'],
  },
  {
    id: ['Beda Alat, Beda Aturan', 'Setiap dripper punya karakter unik. Teknik yang pas untuk V60 belum tentu cocok untuk Kalita.'],
    en: ['Brewer Variances', 'Every dripper has its own flow and bypass rate. What works for a V60 will over-extract in a Kalita Wave.'],
    bn: ['Lain Alat, Lain Caranya', 'Setiap dripper ada karakter tersendiri. Teknik yang sesuai untuk V60 belum tentu kena untuk Kalita.'],
  },
  {
    id: ['Menyeduh Tanpa Arah', 'Kopi terlalu pahit? Terlalu asam? Anda butuh pemandu — bukan tebak-tebakan.'],
    en: ['Brewing in the Dark', "Cup too bitter? Too sour? You need diagnostic guidance — not blind guesswork."],
    bn: ['Menyeduh Tanpa Hala Tuju', 'Kopi terlalu pahit? Terlalu masam? Anda perlu panduan — bukan teka-teki.'],
  },
] as const;

const SECTION_TEXTS = {
  problemTitle: {
    id: 'Mengapa Menyeduh Kopi yang Enak Terasa Begitu Sulit?',
    en: 'Why Does Brewing Exceptional Coffee Feel So Hard?',
    bn: 'Kenapa Menyeduh Kopi yang Sedap Terasa Begitu Payah?',
  },
  problemSubtitle: {
    id: 'Ritual pagi Anda seharusnya menenangkan, bukan membingungkan.',
    en: 'Your morning ritual should be a moment of zen, not a puzzle.',
    bn: 'Ritual pagi anda sepatutnya menenangkan, bukan mengelirukan.',
  },
  engineTitle: {
    id: 'Asisten Cerdas untuk Ritual Kopi yang Sempurna.',
    en: 'Your Intelligent Companion for the Perfect Extraction.',
    bn: 'Pembantu Pintar untuk Ritual Kopi yang Sempurna.',
  },
  engineBody: {
    id: 'BaristaChaw menangani semua variabel rumit di balik layar. Anda tinggal fokus menikmati proses seduh dan rasa di cangkir Anda.',
    en: 'BaristaChaw streamlines the complex variables behind the scenes, leaving you free to enjoy the sensory beauty of the pour.',
    bn: 'BaristaChaw menguruskan semua variabel rumit di sebalik tabir. Anda tinggal fokus menikmati proses seduh dan rasa di cawan anda.',
  },
} as const;

const ENGINE_PANELS = {
  id: [
    ['Profil Rasa Personal', 'Pilih karakter rasa idaman Anda: Bright, Sweet, atau Body-forward. AI akan menyesuaikan seluruh parameter secara otomatis.'],
    ['Panduan Langkah demi Langkah', 'Alur seduh yang tenang dan terstruktur — memandu Anda kapan membasahi, menuang, dan menyajikan tanpa tergesa.'],
    ['Paham Karakter Biji Kopi', 'AI mengenali tingkat sangrai biji kopi Anda dan otomatis menyesuaikan suhu serta ukuran gilingan yang ideal.'],
    ['Kopi Es yang Tetap Kaya Rasa', 'Nikmati kopi es yang kaya rasa tanpa encer, berkat perhitungan rasio es yang presisi dari AI.'],
    ['Kompatibel dengan Grinder Anda', 'Rekomendasi gilingan langsung dikonversi ke setelan klik mesin penggiling kopi favorit Anda.'],
  ],
  en: [
    ['Personal Flavor Profile', 'Choose your target cup profile: Bright, Sweet, or Body-forward. The system optimizes extraction variables accordingly.'],
    ['Structured Pour Flow', 'A calm, step-by-step timer guiding your pours, bloom duration, and drawdown time without any rush.'],
    ['Roast-Aware Adjustments', 'The engine detects your beans\u2019 roast level to automatically calculate the ideal water temperature and grind target.'],
    ['Perfect Iced Coffee', 'Get rich, vibrant iced filter coffee that never tastes watery, thanks to precise ice-melt dilution math.'],
    ['Grinder Click Conversion', 'Grind recommendations are instantly translated into specific click or numerical settings for your home grinder.'],
  ],
  bn: [
    ['Profil Rasa Peribadi', 'Pilih karakter cawan idaman anda: Cerah, Manis, atau Badan Penuh. AI akan sesuaikan semua parameter secara automatik.'],
    ['Panduan Langkah demi Langkah', 'Alur seduh yang tenang dan tersusun — membimbing anda bila nak basahkan, menuang, dan menyajikan tanpa tergesa.'],
    ['Faham Karakter Biji Kopi', 'AI mengenali tahap sangai biji kopi anda dan automatik menyesuaikan suhu serta saiz kisaran yang ideal.'],
    ['Kopi Ais yang Tetap Kaya Rasa', 'Nikmati kopi ais yang kaya rasa tanpa cair, berkat pengiraan nisbah ais yang tepat dari AI.'],
    ['Serasi dengan Grinder Anda', 'Syor kisaran terus ditukarkan ke tetapan klik mesin pengisar kopi kegemaran anda.'],
  ],
} as const;

export function MethodSections({ language }: { language: Language }) {
  return (
    <>
      <section className="problem section-shell" aria-labelledby="problem-title">
        <ScrollReveal variant="slide-up">
          <div className="problem-title-wrap">
            <p className="section-index">01 / 06</p>
            <h2 id="problem-title">{SECTION_TEXTS.problemTitle[language]}</h2>
            <p className="problem-subtitle">{SECTION_TEXTS.problemSubtitle[language]}</p>
          </div>
        </ScrollReveal>
        <div className="problem-lines">
          {PROBLEMS.map((prob, index) => {
            const [title, body] = prob[language];
            return (
              <ScrollReveal key={index} delay={index * 0.08} variant="fade">
                <div className="problem-line">
                  <span>0{index + 1}</span>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      <section className="engine" id="engine" aria-labelledby="engine-title">
        <ScrollReveal variant="dramatic" className="engine-sticky">
          <p className="section-index section-index-light">02 / 06</p>
          <h2 id="engine-title">
            {SECTION_TEXTS.engineTitle[language]}
          </h2>
          <p>
            {SECTION_TEXTS.engineBody[language]}
          </p>
        </ScrollReveal>
        <div className="engine-panels">
          {ENGINE_PANELS[language].map(([title, desc], index) => (
            <ScrollReveal key={title} variant="blur" delay={index * 0.06}>
              <article>
                <span>{title.split(' ').slice(0, 2).join(' ')}</span>
                <h3>{desc}</h3>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </>
  );
}
