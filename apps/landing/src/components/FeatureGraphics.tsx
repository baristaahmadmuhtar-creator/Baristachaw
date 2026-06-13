import { Bot, CheckCircle2, CircleDashed, FlaskConical, ShieldCheck } from 'lucide-react';

export function FeatureGraphics({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <section className="feature-graphics section-shell" aria-labelledby="features-title">
      <div className="section-heading">
        <p className="section-index">04 / 06</p>
        <div>
          <h2 id="features-title">{isId ? 'Dirancang untuk Kenyamanan Ritual Kopi Anda.' : 'Designed for the Comfort of Your Coffee Ritual.'}</h2>
          <p>{isId ? 'Teknologi cerdas di balik layar untuk memastikan Anda mendapatkan cangkir kopi terbaik tanpa repot.' : 'Smart technology behind the scenes to ensure you get the best cup of coffee without hassle.'}</p>
        </div>
      </div>
      <div className="feature-story">
        <article className="feature-large feature-recipe">
          <div className="feature-copy">
            <span>{isId ? 'Sentuhan Personal' : 'Personalized Touch'}</span>
            <h3>{isId ? 'Beri tahu kami biji kopi, rasa yang diinginkan, dan grinder Anda. AI akan meracik parameter seduh presisi secara instan.' : 'Tell us your beans, target flavor, and grinder. Our AI instantly formulates a precise brewing guide.'}</h3>
          </div>
          <div className="input-output-graphic" aria-hidden="true">
            <div className="input-stack">
              {(isId ? ['Ethiopia Washed', 'Medium Roast', 'Rasa Floral', 'Grinder Fellow Ode'] : ['Ethiopia Washed', 'Medium Roast', 'Floral Flavor', 'Fellow Ode Grinder']).map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className="logic-beam"><FlaskConical /></div>
            <div className="output-stack">
              <strong>{isId ? 'Gilingan #4.2' : 'Grind #4.2'}</strong>
              <strong>{isId ? 'Suhu 92°C' : 'Temp 92°C'}</strong>
              <strong>{isId ? '3x Tuangan' : '3 Pours'}</strong>
              <strong>{isId ? 'Rasa Bersih' : 'Clean Taste'}</strong>
            </div>
          </div>
        </article>
        <article className="feature-split feature-workflow">
          <div className="feature-copy">
            <span>{isId ? 'Alur Seduh yang Rileks' : 'Relaxed Step-by-Step Flow'}</span>
            <h3>{isId ? 'Panduan waktu nyata yang menenangkan, memandu Anda dari persiapan hingga sesapan pertama tanpa tergesa-gesa.' : 'Interactive, calm guidance that takes you from prep to the first sip without any rush.'}</h3>
          </div>
          <ol className="workflow-rail">
            {(isId ? ['Persiapan', 'Aroma Bloom', 'Ekstraksi Tenang', 'Sentuhan Akhir', 'Sesapan Pertama'] : ['Preparation', 'Aroma Bloom', 'Calm Extraction', 'Finishing Touch', 'First Sip']).map((step, index) => (
              <li key={step}><i>{index + 1}</i><span>{step}</span></li>
            ))}
          </ol>
        </article>
        <article className="feature-split feature-confidence">
          <div className="feature-copy">
            <span>{isId ? 'Informasi yang Transparan' : 'Transparent Information'}</span>
            <h3>{isId ? 'Kami menunjukkan asal-usul resep—apakah berdasarkan referensi barista juara, panduan resmi alat, atau estimasi cerdas.' : 'We reveal the recipe origins—whether from champion barista references, official maker guides, or smart AI predictions.'}</h3>
          </div>
          <div className="confidence-list">
            <span><CheckCircle2 /> {isId ? 'Referensi Barista Juara' : 'Champion Barista Ref'}</span>
            <span><ShieldCheck /> {isId ? 'Panduan Resmi Alat' : 'Official Device Guide'}</span>
            <span><CircleDashed /> {isId ? 'Rekomendasi Cerdas AI' : 'Smart AI Prediction'}</span>
            <span><FlaskConical /> {isId ? 'Kalibrasi Rasa Mandiri' : 'Self-Taste Calibration'}</span>
          </div>
        </article>
        <article className="feature-large feature-coach">
          <div className="coach-avatar"><Bot /></div>
          <div className="coach-dialogue">
            <p className="coach-user">{isId ? 'Kopi saya terasa agak terlalu pahit dan sepet.' : 'My cup tastes a bit too bitter and astringent.'}</p>
            <p className="coach-ai">{isId ? 'Mari kita perbaiki bersama. Coba turunkan suhu air 2°C atau giling sedikit lebih kasar untuk seduhan berikutnya agar rasanya lebih manis dan bersih.' : 'Let\'s fix it together. Try lowering the water temp by 2°C or grinding slightly coarser next time for a sweeter, cleaner cup.'}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
