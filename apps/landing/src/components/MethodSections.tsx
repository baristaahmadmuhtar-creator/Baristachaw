import { ScrollReveal } from './ScrollReveal';

const PROBLEMS = [
  {
    id: ['Rasa yang Selalu Berubah', 'Biji kopi yang sama, alat yang sama — tapi rasa hari ini tak pernah sama dengan kemarin.'],
    en: ['The Shifting Cup', "Same beans, same equipment — yet today's cup never quite matches yesterday's."],
  },
  {
    id: ['Kebingungan Parameter', 'Suhu air, ukuran gilingan, rasio air… terlalu banyak variabel untuk diingat sendiri.'],
    en: ['Parameter Overload', 'Water temperature, grind size, brew ratio… too many moving parts to track by yourself.'],
  },
  {
    id: ['Beda Alat, Beda Aturan', 'Setiap dripper punya karakter unik. Teknik yang pas untuk V60 belum tentu cocok untuk Kalita.'],
    en: ['Brewer Variances', 'Every dripper has its own flow and bypass rate. What works for a V60 will over-extract in a Kalita Wave.'],
  },
  {
    id: ['Menyeduh Tanpa Arah', 'Kopi terlalu pahit? Terlalu asam? Anda butuh pemandu — bukan tebak-tebakan.'],
    en: ['Brewing in the Dark', "Cup too bitter? Too sour? You need diagnostic guidance — not blind guesswork."],
  },
] as const;

export function MethodSections({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <>
      <section className="problem section-shell" aria-labelledby="problem-title">
        <ScrollReveal variant="slide-up">
          <div className="problem-title-wrap">
            <p className="section-index">01 / 06</p>
            <h2 id="problem-title">{isId ? 'Mengapa Menyeduh Kopi yang Enak Terasa Begitu Sulit?' : 'Why Does Brewing Exceptional Coffee Feel So Hard?'}</h2>
            <p className="problem-subtitle">{isId ? 'Ritual pagi Anda seharusnya menenangkan, bukan membingungkan.' : 'Your morning ritual should be a moment of zen, not a puzzle.'}</p>
          </div>
        </ScrollReveal>
        <div className="problem-lines">
          {PROBLEMS.map((prob, index) => {
            const [title, body] = isId ? prob.id : prob.en;
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
            {isId
              ? 'Asisten Cerdas untuk Ritual Kopi yang Sempurna.'
              : 'Your Intelligent Companion for the Perfect Extraction.'}
          </h2>
          <p>
            {isId
              ? 'BaristaChaw menangani semua variabel rumit di balik layar. Anda tinggal fokus menikmati proses seduh dan rasa di cangkir Anda.'
              : 'BaristaChaw streamlines the complex variables behind the scenes, leaving you free to enjoy the sensory beauty of the pour.'}
          </p>
        </ScrollReveal>
        <div className="engine-panels">
          {(isId ? [
            ['Profil Rasa Personal', 'Pilih karakter rasa idaman Anda: Bright, Sweet, atau Body-forward. AI akan menyesuaikan seluruh parameter secara otomatis.'],
            ['Panduan Langkah demi Langkah', 'Alur seduh yang tenang dan terstruktur — memandu Anda kapan membasahi, menuang, dan menyajikan tanpa tergesa.'],
            ['Paham Karakter Biji Kopi', 'AI mengenali tingkat sangrai biji kopi Anda dan otomatis menyesuaikan suhu serta ukuran gilingan yang ideal.'],
            ['Kopi Es yang Tetap Kaya Rasa', 'Nikmati kopi es yang kaya rasa tanpa encer, berkat perhitungan rasio es yang presisi dari AI.'],
            ['Kompatibel dengan Grinder Anda', 'Rekomendasi gilingan langsung dikonversi ke setelan klik mesin penggiling kopi favorit Anda.'],
          ] : [
            ['Personal Flavor Profile', 'Choose your target cup profile: Bright, Sweet, or Body-forward. The system optimizes extraction variables accordingly.'],
            ['Structured Pour Flow', 'A calm, step-by-step timer guiding your pours, bloom duration, and drawdown time without any rush.'],
            ['Roast-Aware Adjustments', 'The engine detects your beans’ roast level to automatically calculate the ideal water temperature and grind target.'],
            ['Perfect Iced Coffee', 'Get rich, vibrant iced filter coffee that never tastes watery, thanks to precise ice-melt dilution math.'],
            ['Grinder Click Conversion', 'Grind recommendations are instantly translated into specific click or numerical settings for your home grinder.'],
          ]).map(([title, desc], index) => (
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
