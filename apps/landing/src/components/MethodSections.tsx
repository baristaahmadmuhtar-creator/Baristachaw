import { Droplets, Gauge, ScanLine, ThermometerSun, Waves } from 'lucide-react';

const PROBLEMS = [
  ['Dose', 'Bloom water and pour size move with the coffee dose.'],
  ['Roast', 'Temperature, grind, agitation, and time need different limits.'],
  ['Dripper', 'Geometry and bypass change flow and drawdown.'],
  ['Water + grinder', 'Unknown inputs must lower confidence, not create certainty.'],
] as const;

export function MethodSections({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <>
      <section className="problem section-shell" aria-labelledby="problem-title">
        <div className="problem-title-wrap">
          <p className="section-index">01 / 06</p>
          <h2 id="problem-title">{isId ? 'Recipe kopi bukan sekadar angka.' : 'Coffee recipes are not just numbers.'}</h2>
        </div>
        <div className="problem-lines">
          {PROBLEMS.map(([title, body], index) => (
            <div className="problem-line" key={title}>
              <span>0{index + 1}</span>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="engine" id="engine" aria-labelledby="engine-title">
        <div className="engine-sticky">
          <p className="section-index section-index-light">02 / 06</p>
          <h2 id="engine-title">{isId ? 'AI Brew memahami metode, bukan hanya rasio.' : 'AI Brew understands the method, not just the ratio.'}</h2>
          <p>{isId ? 'Setiap output harus lolos mekanik alat, aritmetika recipe, vocabulary, dan confidence guardrail.' : 'Every output must pass brewer mechanics, recipe arithmetic, vocabulary, and confidence guardrails.'}</p>
        </div>
        <div className="engine-panels">
          <article>
            <ScanLine />
            <span>Method-aware</span>
            <h3>{isId ? 'Moka tidak diberi bloom. Cold brew bukan iced V60.' : 'Moka gets no bloom. Cold brew is not iced V60.'}</h3>
          </article>
          <article>
            <Waves />
            <span>Target taste</span>
            <h3>{isId ? 'Sweet, clean, floral, bright, round, atau body-forward.' : 'Sweet, clean, floral, bright, round, or body-forward.'}</h3>
          </article>
          <article>
            <Gauge />
            <span>Dose → bloom → pour</span>
            <h3>{isId ? 'Jumlah air dan perilaku tuang tetap konsisten dari plan ke guide.' : 'Water and pour behavior stay consistent from plan to guide.'}</h3>
          </article>
          <article>
            <Droplets />
            <span>Hot / iced</span>
            <h3>{isId ? 'Hot water + ice harus sama dengan total water.' : 'Hot water plus ice must equal total water.'}</h3>
          </article>
          <article>
            <ThermometerSun />
            <span>Roast-aware</span>
            <h3>{isId ? 'Roast mengubah batas suhu, grind, agitation, dan waktu.' : 'Roast changes temperature, grind, agitation, and time limits.'}</h3>
          </article>
        </div>
      </section>
    </>
  );
}
