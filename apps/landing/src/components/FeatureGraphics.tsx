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
            <span>{isId ? 'Cerdas & Otomatis' : 'Smart & Automatic'}</span>
            <h3>{isId ? 'Semua faktor penting—mulai dari jenis biji kopi hingga tingkat gilingan—dianalisis otomatis untuk kenyamanan Anda.' : 'All critical factors—from coffee beans to grind size—are automatically analyzed for your convenience.'}</h3>
          </div>
          <div className="input-output-graphic" aria-hidden="true">
            <div className="input-stack">
              {(isId ? ['Biji Pilihan', 'Roast Level', 'Rasa Manis', 'Alat Seduh V60'] : ['Premium Beans', 'Roast Level', 'Sweet Profile', 'V60 Brewer']).map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className="logic-beam"><FlaskConical /></div>
            <div className="output-stack">
              <strong>{isId ? 'Suhu Pas' : 'Ideal Temp'}</strong>
              <strong>{isId ? 'Gilingan Pas' : 'Right Grind'}</strong>
              <strong>{isId ? 'Langkah Bloom' : 'Bloom Step'}</strong>
              <strong>{isId ? 'Waktu Seduh' : 'Brew Time'}</strong>
            </div>
          </div>
        </article>
        <article className="feature-split feature-workflow">
          <div className="feature-copy">
            <span>{isId ? 'Alur Seduh Santai' : 'Relaxed Brew Flow'}</span>
            <h3>{isId ? 'Panduan yang mengalir alami, memandu Anda dari persiapan hingga sesapan pertama.' : 'A naturally flowing guide, leading you from prep to the first sip.'}</h3>
          </div>
          <ol className="workflow-rail">
            {(isId ? ['Persiapan', 'Aroma Bloom', 'Ekstraksi', 'Penyelesaian', 'Nikmati'] : ['Prep', 'Aroma Bloom', 'Extraction', 'Finish', 'Enjoy']).map((step, index) => (
              <li key={step}><i>{index + 1}</i><span>{step}</span></li>
            ))}
          </ol>
        </article>
        <article className="feature-split feature-confidence">
          <div className="feature-copy">
            <span>{isId ? 'Jaminan Kepuasan' : 'Satisfaction Assurance'}</span>
            <h3>{isId ? 'Memberikan kejelasan informasi sehingga Anda selalu percaya diri dengan hasil seduhan Anda.' : 'Providing clear parameters so you can always brew with complete peace of mind.'}</h3>
          </div>
          <div className="confidence-list">
            <span><CheckCircle2 /> {isId ? 'Referensi Resmi' : 'Official Reference'}</span>
            <span><ShieldCheck /> {isId ? 'Kurasi Barista' : 'Barista Curated'}</span>
            <span><CircleDashed /> {isId ? 'Rekomendasi Cerdas' : 'Smart Suggestion'}</span>
            <span><FlaskConical /> {isId ? 'Kalibrasi Rasa' : 'Flavor Calibration'}</span>
          </div>
        </article>
        <article className="feature-large feature-coach">
          <div className="coach-avatar"><Bot /></div>
          <div className="coach-dialogue">
            <p className="coach-user">{isId ? 'Rasanya tipis dan asam kosong.' : 'The cup tastes thin and hollow-sour.'}</p>
            <p className="coach-ai">{isId ? 'Jangan cemas. Coba giling sedikit lebih halus untuk mengeluarkan rasa manis alami biji kopi Anda, lalu seduh kembali.' : 'No worries. Try grinding slightly finer to bring out the natural sweetness of your beans, then brew again.'}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
