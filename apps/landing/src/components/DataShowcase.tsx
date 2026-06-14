import { Droplet, Settings2 } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import type { Language } from '../i18n';

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

// ── Component-specific translations ─────────────────────────────────────────
const tx = {
  sectionIndex: { id: 'Data', en: 'Data', bn: 'Data' },
  title: {
    id: 'Kami Mengenal Air dan Grinder Anda.',
    en: 'We Know Your Grinder and Water Profile.',
    bn: 'Kita Kenal Air dan Grinder Anda.',
  },
  subtitle: {
    id: 'BaristaChaw memiliki database profil air mineral dan grinder terlengkap di Asia Tenggara. Setiap rekomendasi disesuaikan dengan apa yang Anda gunakan di rumah.',
    en: 'BaristaChaw hosts Southeast Asia\'s most comprehensive database of mineral waters and coffee grinders. Every recipe is tailored to your exact home setup.',
    bn: 'BaristaChaw mempunyai pangkalan data profil air mineral dan grinder paling lengkap di Asia Tenggara. Setiap syor disesuaikan dengan apa yang anda guna di rumah.',
  },
  statWater: { id: 'Profil Air Mineral', en: 'Water Profiles', bn: 'Profil Air Mineral' },
  statGrinder: { id: 'Model Grinder', en: 'Grinder Models', bn: 'Model Grinder' },
  statBrewer: { id: 'Alat Seduh', en: 'Supported Brewers', bn: 'Alat Seduh Disokong' },
  labelWater: { id: 'Air Mineral', en: 'Water Profiles', bn: 'Profil Air' },
  labelGrinder: { id: 'Grinder', en: 'Grinders', bn: 'Grinder' },
} satisfies Record<string, Record<Language, string>>;

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

export function DataShowcase({ language }: { language: Language }) {
  return (
    <section className="data-showcase" aria-labelledby="data-title">
      <div className="data-showcase-inner section-shell">
        <ScrollReveal variant="dramatic">
          <div className="data-header">
            <p className="section-index section-index-light">{tx.sectionIndex[language]}</p>
            <h2 id="data-title">
              {tx.title[language]}
            </h2>
            <p>
              {tx.subtitle[language]}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal variant="blur" delay={0.1}>
          <div className="data-stats">
            <div className="data-stat">
              <Droplet />
              <strong>111</strong>
              <span>{tx.statWater[language]}</span>
            </div>
            <div className="data-stat">
              <Settings2 />
              <strong>250</strong>
              <span>{tx.statGrinder[language]}</span>
            </div>
            <div className="data-stat">
              <strong>36</strong>
              <span>{tx.statBrewer[language]}</span>
            </div>
          </div>
        </ScrollReveal>

        <div className="data-marquees">
          <div className="marquee-label">
            <Droplet size={14} />
            {tx.labelWater[language]}
          </div>
          <MarqueeRow items={WATER_BRANDS} speed={40} />
          <div className="marquee-label" style={{ marginTop: 20 }}>
            <Settings2 size={14} />
            {tx.labelGrinder[language]}
          </div>
          <MarqueeRow items={GRINDER_BRANDS} speed={35} reverse />
        </div>
      </div>
    </section>
  );
}
