const BREWERS = [
  ['V60', 'Cone · hot / iced'],
  ['Kalita Wave', '155 / 185'],
  ['Chemex', 'Clean large-format'],
  ['Clever Dripper', 'Immersion release'],
  ['AeroPress', 'Press / bypass'],
  ['Switch / MUGEN', 'Hybrid workflow'],
  ['Origami', 'S / M'],
  ['April Brewer', 'Flat-bottom'],
  ['Melitta', 'Aromaboy / 1x2'],
  ['Kono Meimon', 'Controlled flow'],
  ['French Press', 'Full immersion'],
  ['Moka Pot', 'Stovetop pressure'],
  ['Toddy', 'Dedicated cold brew'],
  ['Batch Brewer', 'Machine workflow'],
  ['Hario Siphon', 'Vacuum brewing'],
  ['Espresso', 'Pressure extraction'],
] as const;

export function BrewerGrid({ language }: { language: 'id' | 'en' }) {
  return (
    <section className="brewers section-shell" id="brewers" aria-labelledby="brewers-title">
      <div className="section-heading">
        <p className="section-index">03 / 06</p>
        <div>
          <h2 id="brewers-title">{language === 'id' ? 'Satu Asisten untuk Seluruh Koleksi Alat Seduh Anda.' : 'One Companion for Your Entire Brewer Collection.'}</h2>
          <p>{language === 'id' ? 'Kami mendukung berbagai alat seduh legendaris dunia. Dari pour-over klasik hingga espresso presisi, semua memiliki alur kerja khusus yang telah disempurnakan.' : 'We support the world\'s most iconic brewing tools. From classic pour-overs to precise espressos, each has a customized, perfected workflow.'}</p>
        </div>
      </div>
      <div className="brewer-list">
        {BREWERS.map(([name, detail], index) => (
          <article className="brewer-row" key={name}>
            <span className="brewer-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="brewer-glyph" aria-hidden="true">
              <i className={`brewer-shape brewer-shape-${index % 4}`} />
            </span>
            <h3>{name}</h3>
            <p>{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
