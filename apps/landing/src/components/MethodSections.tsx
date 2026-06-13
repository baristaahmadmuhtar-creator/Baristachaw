import { ScrollReveal } from './ScrollReveal';

const PROBLEMS = [
  {
    id: ['Rasa yang Selalu Berubah', 'Biji kopi yang sama, alat yang sama — tapi rasa hari ini tak pernah sama dengan kemarin.'],
    en: ['The Shifting Cup', "Same beans, same tool — yet today's taste never matches yesterday's."],
  },
  {
    id: ['Kebingungan Parameter', 'Suhu air, ukuran gilingan, rasio air… terlalu banyak variabel untuk diingat sendiri.'],
    en: ['Parameter Overload', 'Water temp, grind size, brew ratio… too many variables to track on your own.'],
  },
  {
    id: ['Beda Alat, Beda Aturan', 'Setiap dripper punya karakter unik. Teknik yang pas untuk V60 belum tentu cocok untuk Kalita.'],
    en: ['Brewer Rule Confusion', 'Every dripper has its own character. What works for V60 may not suit Kalita.'],
  },
  {
    id: ['Menyeduh Tanpa Arah', 'Kopi terlalu pahit? Terlalu asam? Anda butuh pemandu — bukan tebak-tebakan.'],
    en: ['Brewing in the Dark', "Coffee too bitter? Too sour? You need a guide — not guesswork."],
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
            <h2 id="problem-title">{isId ? 'Mengapa Menyeduh Kopi yang Enak Terasa Begitu Sulit?' : 'Why Does Brewing Good Coffee Feel So Hard?'}</h2>
            <p className="problem-subtitle">{isId ? 'Ritual pagi Anda seharusnya menenangkan, bukan membingungkan.' : 'Your morning ritual should be peaceful, not confusing.'}</p>
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
              : 'Your Smart Companion for the Perfect Brew.'}
          </h2>
          <p>
            {isId
              ? 'BaristaChaw menangani semua variabel rumit di balik layar. Anda tinggal fokus menikmati proses seduh dan rasa di cangkir Anda.'
              : 'BaristaChaw handles all the complex variables behind the scenes. You just focus on enjoying the process and the taste in your cup.'}
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
            ['Personal Flavor Profile', 'Choose your dream flavor: Bright, Sweet, or Body-forward. AI adjusts every parameter automatically.'],
            ['Step-by-Step Guidance', 'Calm, structured brewing flow — guiding you when to bloom, pour, and serve at your own pace.'],
            ['Bean-Aware Intelligence', "AI recognizes your beans' roast level and automatically adjusts the ideal temperature and grind size."],
            ['Rich Iced Coffee, Never Watery', 'Enjoy iced coffee that stays rich and flavorful — thanks to precise ice dilution calculations.'],
            ['Works with Your Grinder', "Grind size recommendations are directly converted to your home grinder's click settings."],
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
