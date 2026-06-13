import { Droplets, Gauge, ScanLine, ThermometerSun, Waves } from 'lucide-react';

const PROBLEMS = [
  {
    id: ['Konsistensi Rasa', 'Rasa kopi yang berubah-ubah setiap hari membuat frustrasi.'],
    en: ['Taste Consistency', 'Inconsistent coffee taste from day to day is frustrating.'],
  },
  {
    id: ['Tebak Parameter', 'Suhu air, ukuran gilingan, dan rasio yang membingungkan.'],
    en: ['Guessing Parameters', 'Confusing water temperatures, grind sizes, and ratios.'],
  },
  {
    id: ['Alat Seduh Berbeda', 'Setiap alat membutuhkan teknik khusus yang sulit ingat.'],
    en: ['Different Brewers', 'Each brewer requires a specific technique that is hard to remember.'],
  },
  {
    id: ['Kurang Bimbingan', 'Menyeduh sendiri tanpa asisten yang memberi koreksi rasa.'],
    en: ['No Real Guidance', 'Brewing alone without an assistant to offer flavor corrections.'],
  },
] as const;

export function MethodSections({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <>
      <section className="problem section-shell" aria-labelledby="problem-title">
        <div className="problem-title-wrap">
          <p className="section-index">01 / 06</p>
          <h2 id="problem-title">{isId ? 'Masalah Klasik Saat Menyeduh Kopi' : 'Common Issues When Brewing Coffee'}</h2>
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
          <h2 id="engine-title">{isId ? 'Menghadirkan Kenyamanan di Setiap Seduhan.' : 'Bringing Comfort and Simplicity to Every Brew.'}</h2>
          <p>{isId ? 'BaristaChaw dirancang untuk mendampingi Anda menikmati ritual menyeduh, memberikan rasa tenang dan hasil kopi yang selalu konsisten.' : 'BaristaChaw is designed to accompany you in enjoying the brewing ritual, giving peace of mind and always-consistent coffee.'}</p>
        </div>
        <div className="engine-panels">
          <article>
            <ScanLine />
            <span>{isId ? 'Disesuaikan dengan Alat' : 'Tailored to Your Brewer'}</span>
            <h3>{isId ? 'Setiap alat mendapatkan perhatian khusus agar hasil ekstraksi optimal.' : 'Every brewing tool gets special attention for optimal extraction.'}</h3>
          </article>
          <article>
            <Waves />
            <span>{isId ? 'Profil Rasa Favorit' : 'Your Favorite Taste'}</span>
            <h3>{isId ? 'Pilih karakter rasa idaman Anda secara instan: Bright, Sweet, atau Body-forward.' : 'Instantly select your dream flavor profile: Bright, Sweet, or Body-forward.'}</h3>
          </article>
          <article>
            <Gauge />
            <span>{isId ? 'Ritual yang Santai' : 'Relaxed Ritual'}</span>
            <h3>{isId ? 'Langkah menyeduh disajikan dengan jelas, membuat ritual pagi Anda lebih santai.' : 'Brewing steps are presented clearly, making your morning ritual more relaxed.'}</h3>
          </article>
          <article>
            <Droplets />
            <span>{isId ? 'Segar atau Hangat' : 'Fresh or Warm'}</span>
            <h3>{isId ? 'Keseimbangan rasa yang sempurna untuk kopi panas maupun kopi es.' : 'Perfect taste balance for both hot and iced coffee.'}</h3>
          </article>
          <article>
            <ThermometerSun />
            <span>{isId ? 'Paham Karakter Biji' : 'Understands Coffee Beans'}</span>
            <h3>{isId ? 'Menyesuaikan suhu air secara otomatis untuk biji kopi light, medium, hingga dark roast.' : 'Automatically adjusts water temperature for light, medium, to dark roast coffee beans.'}</h3>
          </article>
        </div>
      </section>
    </>
  );
}
