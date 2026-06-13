import { Droplets, Gauge, ScanLine, ThermometerSun, Waves } from 'lucide-react';

const PROBLEMS = [
  {
    id: ['Rasa yang Selalu Berubah', 'Biji kopi yang sama, alat yang sama, tapi rasa hari ini berbeda dengan kemarin.'],
    en: ['The Shifting Cup', "Same beans, same tool, yet today's taste differs from yesterday's."],
  },
  {
    id: ['Kebingungan Parameter', 'Menyesuaikan suhu air, ukuran gilingan, dan rasio air terasa melelahkan.'],
    en: ['Parameter Overload', 'Adjusting water temp, grind size, and brew ratio feels like chemistry.'],
  },
  {
    id: ['Beda Alat, Beda Aturan', 'Setiap dripper membutuhkan teknik khusus yang sulit untuk dihafal.'],
    en: ['Brewer Rule Confusion', 'Every dripper demands a specific pour technique that is hard to memorize.'],
  },
  {
    id: ['Menyeduh Tanpa Arah', 'Saat kopi Anda terlalu pahit atau asam, Anda tidak tahu variabel mana yang salah.'],
    en: ['Brewing in the Dark', "When your cup is too bitter or sour, you don't know what to change first."],
  },
] as const;

export function MethodSections({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <>
      <section className="problem section-shell" aria-labelledby="problem-title">
        <div className="problem-title-wrap">
          <p className="section-index">01 / 06</p>
          <h2 id="problem-title">{isId ? 'Mengapa Menyeduh Kopi yang Enak Terasa Begitu Sulit?' : 'Why Does Brewing Good Coffee Feel So Hard?'}</h2>
          <p className="problem-subtitle">{isId ? 'Ritual pagi Anda seharusnya menenangkan, bukan membingungkan.' : 'Your morning ritual should be peaceful, not confusing.'}</p>
        </div>
        <div className="problem-lines">
          {PROBLEMS.map((prob, index) => {
            const [title, body] = isId ? prob.id : prob.en;
            return (
              <div className="problem-line" key={index}>
                <span>0{index + 1}</span>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="engine" id="engine" aria-labelledby="engine-title">
        <div className="engine-sticky">
          <p className="section-index section-index-light">02 / 06</p>
          <h2 id="engine-title">{isId ? 'Asisten Cerdas untuk Ritual Kopi yang Sempurna.' : 'Your Smart Companion for the Perfect Brew.'}</h2>
          <p>{isId ? 'BaristaChaw menyederhanakan semua variabel rumit di balik layar, sehingga Anda bisa fokus menikmati proses seduh dan rasa kopi Anda.' : 'BaristaChaw simplifies all complex variables behind the scenes, so you can focus on enjoying the process and tasting your cup.'}</p>
        </div>
        <div className="engine-panels">
          <article>
            <ScanLine />
            <span>{isId ? 'Profil Rasa Personalisasi' : 'Personalized Flavor'}</span>
            <h3>{isId ? 'Pilih karakter rasa idaman Anda secara instan: Bright, Sweet, atau Body-forward. AI akan menyesuaikannya.' : 'Instantly choose your dream flavor profile: Bright, Sweet, or Body-forward. Our AI adjusts it for you.'}</h3>
          </article>
          <article>
            <Waves />
            <span>{isId ? 'Panduan Waktu Nyata' : 'Real-Time Guidance'}</span>
            <h3>{isId ? 'Alur seduh langkah demi langkah yang tenang, memandu Anda kapan harus membasahi, menuang, dan menyajikan.' : 'Calm, step-by-step brewing flow that guides you when to bloom, pour, and serve.'}</h3>
          </article>
          <article>
            <Gauge />
            <span>{isId ? 'Paham Karakter Biji Kopi' : 'Bean-Aware Intelligence'}</span>
            <h3>{isId ? 'AI kami otomatis menyesuaikan suhu dan gilingan berdasarkan tingkat sangrai (roast level) biji kopi Anda.' : 'Our AI automatically optimizes water temperature and grind based on your beans\' roast level.'}</h3>
          </article>
          <article>
            <Droplets />
            <span>{isId ? 'Keseimbangan Panas & Es' : 'Hot & Iced Harmony'}</span>
            <h3>{isId ? 'Nikmati kopi es yang tetap kaya rasa tanpa encer, berkat perhitungan rasio es yang presisi.' : 'Enjoy iced coffee that stays rich and flavorful, thanks to precise ice dilution calculation.'}</h3>
          </article>
          <article>
            <ThermometerSun />
            <span>{isId ? 'Adaptif terhadap Grinder' : 'Grinder Friendly'}</span>
            <h3>{isId ? 'Mengonversi rekomendasi ukuran gilingan langsung ke setelan mesin penggiling kopi favorit Anda di rumah.' : 'Converts grind size recommendations directly to your home grinder\'s settings.'}</h3>
          </article>
        </div>
      </section>
    </>
  );
}
