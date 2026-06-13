import { Droplet, Settings2 } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

const WATER_BRANDS = [
  'Aqua', 'Le Minerale', 'Evian', 'Fiji', 'Volvic', 'Cleo', 'Club', 'Pristine',
  'Ades', 'VIT', 'Crystalline', 'Equil', 'Oasis', 'Ion+', 'Ron 88', 'San Pellegrino',
  'Acqua Panna', 'Dasani', 'Nestle Pure Life', 'Highland Spring', 'Icelandic Glacial',
  'Crystal Geyser', 'Spritzer', 'Jeju Samdasoo', 'Nongfu Spring', 'Total 8+',
];

const GRINDER_BRANDS = [
  'Comandante C40', '1Zpresso K-Ultra', 'Timemore C2', 'Fellow Ode', 'Fellow Opus',
  'Baratza Encore', 'KINGrinder K6', 'Timemore Chestnut X', 'Kinu M47', 'Hario Skerton',
  'Varia VS3', 'Turin DF64', 'MHW-3Bomber', 'Timemore Sculptor', 'Breville Smart Grinder',
  'Mazzer Omega', '1Zpresso JX-Pro', 'Porlex Mini', 'Latina Sumba', 'Wacaco Exagrind',
  'Mazzer Philos', 'EK Omnia', 'Lagom 01',
];

function MarqueeRow({ items, speed = 35, reverse = false }: { items: string[]; speed?: number; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="marquee-track" aria-hidden="true">
      <div
        className={`marquee-inner ${reverse ? 'marquee-reverse' : ''}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((item, i) => (
          <span className="marquee-chip" key={`${item}-${i}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export function DataShowcase({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <section className="data-showcase" aria-labelledby="data-title">
      <div className="data-showcase-inner section-shell">
        <ScrollReveal variant="dramatic">
          <div className="data-header">
            <p className="section-index section-index-light">Data</p>
            <h2 id="data-title">
              {isId
                ? 'Kami Mengenal Air dan Grinder Anda.'
                : 'We Know Your Grinder and Water Profile.'}
            </h2>
            <p>
              {isId
                ? 'BaristaChaw memiliki database profil air mineral dan grinder terlengkap di Asia Tenggara. Setiap rekomendasi disesuaikan dengan apa yang Anda gunakan di rumah.'
                : 'BaristaChaw hosts Southeast Asia\'s most comprehensive database of mineral waters and coffee grinders. Every recipe is tailored to your exact home setup.'}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="blur" delay={0.1}>
          <div className="data-stats">
            <div className="data-stat">
              <Droplet />
              <strong>111</strong>
              <span>{isId ? 'Profil Air Mineral' : 'Water Profiles'}</span>
            </div>
            <div className="data-stat">
              <Settings2 />
              <strong>250</strong>
              <span>{isId ? 'Model Grinder' : 'Grinder Models'}</span>
            </div>
            <div className="data-stat">
              <strong>36</strong>
              <span>{isId ? 'Alat Seduh' : 'Supported Brewers'}</span>
            </div>
          </div>
        </ScrollReveal>

        <div className="data-marquees">
          <div className="marquee-label">
            <Droplet size={14} />
            {isId ? 'Air Mineral' : 'Water Profiles'}
          </div>
          <MarqueeRow items={WATER_BRANDS} speed={40} />
          <div className="marquee-label" style={{ marginTop: 20 }}>
            <Settings2 size={14} />
            {isId ? 'Grinder' : 'Grinders'}
          </div>
          <MarqueeRow items={GRINDER_BRANDS} speed={35} reverse />
        </div>
      </div>
    </section>
  );
}
