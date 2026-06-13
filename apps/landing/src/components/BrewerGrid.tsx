import { ScrollReveal } from './ScrollReveal';

const BREWERS = [
  ['V60', 'Pour-over klasik · hot & iced'],
  ['Kalita Wave', 'Flat bottom · 155 / 185'],
  ['Chemex', 'Clean, bold large-format brew'],
  ['Clever Dripper', 'Immersion full-body release'],
  ['AeroPress', 'Versatile press & bypass'],
  ['Switch / MUGEN', 'Hybrid immersion-drip flow'],
  ['Origami', 'Multi-shape · S / M'],
  ['April Brewer', 'Scandinavian flat-bottom clarity'],
  ['Melitta', 'Timeless Aromaboy / 1x2'],
  ['Kono Meimon', 'Precision controlled flow'],
  ['French Press', 'Rich full immersion body'],
  ['Moka Pot', 'Stovetop intensity & aroma'],
  ['Toddy', 'Smooth dedicated cold brew'],
  ['Batch Brewer', 'Consistent machine workflow'],
  ['Hario Siphon', 'Theatrical vacuum brewing'],
  ['Espresso', 'High-pressure precision extraction'],
] as const;

export function BrewerGrid({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <section className="brewers section-shell" id="brewers" aria-labelledby="brewers-title">
      <ScrollReveal variant="slide-up">
        <div className="section-heading">
          <p className="section-index">03 / 06</p>
          <div>
            <h2 id="brewers-title">{isId ? 'Satu Asisten untuk Seluruh Koleksi Alat Seduh Anda.' : 'One Companion for Your Entire Brewer Collection.'}</h2>
            <p>{isId ? '16 alat seduh legendaris dunia, masing-masing dengan panduan khusus yang telah dioptimalkan oleh AI kami.' : '16 of the world\'s most iconic brewing tools, each with a dedicated AI-optimized workflow.'}</p>
          </div>
        </div>
      </ScrollReveal>
      <div className="brewer-list">
        {BREWERS.map(([name, detail], index) => (
          <ScrollReveal key={name} delay={index * 0.03} variant="fade">
            <article className="brewer-row">
              <span className="brewer-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="brewer-glyph" aria-hidden="true">
                <i className={`brewer-shape brewer-shape-${index % 4}`} />
              </span>
              <h3>{name}</h3>
              <p>{detail}</p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
