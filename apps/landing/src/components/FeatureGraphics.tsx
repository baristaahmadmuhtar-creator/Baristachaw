import { Bot, CheckCircle2, CircleDashed, FlaskConical, ShieldCheck } from 'lucide-react';

export function FeatureGraphics({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <section className="feature-graphics section-shell" aria-labelledby="features-title">
      <div className="section-heading">
        <p className="section-index">04 / 06</p>
        <div>
          <h2 id="features-title">{isId ? 'Dari input nyata ke workflow yang bisa diperiksa.' : 'From real inputs to an inspectable workflow.'}</h2>
          <p>{isId ? 'Tidak menyembunyikan asumsi di balik satu tombol generate.' : 'No hidden assumptions behind a single generate button.'}</p>
        </div>
      </div>
      <div className="feature-story">
        <article className="feature-large feature-recipe">
          <div className="feature-copy">
            <span>Recipe intelligence</span>
            <h3>{isId ? 'Dose, water, roast, process, varietas, grinder, dan target rasa bergerak bersama.' : 'Dose, water, roast, process, variety, grinder, and target taste move together.'}</h3>
          </div>
          <div className="input-output-graphic" aria-hidden="true">
            <div className="input-stack">
              {['15 g dose', 'Light roast', 'Washed', 'More sweetness'].map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className="logic-beam"><FlaskConical /></div>
            <div className="output-stack">
              <strong>93°C</strong><strong>Medium-fine</strong><strong>45 g bloom</strong><strong>02:45–03:15</strong>
            </div>
          </div>
        </article>
        <article className="feature-split feature-workflow">
          <div className="feature-copy">
            <span>Method workflow</span>
            <h3>{isId ? 'Setup. Entry. Main extraction. Finish. Taste feedback.' : 'Setup. Entry. Main extraction. Finish. Taste feedback.'}</h3>
          </div>
          <ol className="workflow-rail">
            {['Setup', 'Bloom / entry', 'Pour / steep', 'Finish', 'Taste'].map((step, index) => (
              <li key={step}><i>{index + 1}</i><span>{step}</span></li>
            ))}
          </ol>
        </article>
        <article className="feature-split feature-confidence">
          <div className="feature-copy">
            <span>Honest confidence</span>
            <h3>{isId ? 'Sumber dan ketidakpastian terlihat sebelum mulai seduh.' : 'Sources and uncertainty are visible before brewing.'}</h3>
          </div>
          <div className="confidence-list">
            <span><CheckCircle2 /> Official reference</span>
            <span><ShieldCheck /> Curated reference</span>
            <span><CircleDashed /> Estimated</span>
            <span><FlaskConical /> Real brew required</span>
          </div>
        </article>
        <article className="feature-large feature-coach">
          <div className="coach-avatar"><Bot /></div>
          <div className="coach-dialogue">
            <p className="coach-user">{isId ? 'Rasanya tipis dan asam kosong.' : 'The cup tastes thin and hollow-sour.'}</p>
            <p className="coach-ai">{isId ? 'Jangan langsung naikkan suhu. Coba grind sedikit lebih halus, ratakan bloom, lalu jaga pour kedua lebih penuh.' : 'Do not raise temperature immediately. Grind slightly finer, saturate the bloom evenly, then keep the second pour fuller.'}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
