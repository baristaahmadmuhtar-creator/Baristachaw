import { Bot, CheckCircle2, CircleDashed, FlaskConical, ShieldCheck } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

export function FeatureGraphics({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <section className="feature-graphics section-shell" aria-labelledby="features-title">
      <ScrollReveal variant="dramatic">
        <div className="section-heading">
          <p className="section-index">04 / 06</p>
          <div>
            <h2 id="features-title">{isId ? 'Dirancang untuk Kenyamanan Ritual Kopi Anda.' : 'Designed for the Comfort of Your Coffee Ritual.'}</h2>
            <p>{isId ? 'Teknologi cerdas bekerja di balik layar agar Anda bisa menikmati proses seduh tanpa repot — hanya rasa terbaik di cangkir Anda.' : 'Smart technology works behind the scenes so you can enjoy the brewing process without hassle — only the best taste in your cup.'}</p>
          </div>
        </div>
      </ScrollReveal>
      <div className="feature-story">
        <ScrollReveal variant="blur" delay={0.05}>
          <article className="feature-large feature-recipe">
            <div className="feature-copy">
              <span>{isId ? 'Sentuhan Personal' : 'Personalized Touch'}</span>
              <h3>{isId ? 'Cukup beri tahu kami biji kopi, rasa yang diinginkan, dan grinder Anda. AI akan meracik panduan seduh yang presisi dalam hitungan detik.' : 'Just tell us your beans, desired flavor, and grinder. AI crafts a precise brewing guide in seconds.'}</h3>
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
                <strong>{isId ? 'Rasa Bersih & Floral' : 'Clean & Floral'}</strong>
              </div>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal variant="slide-up" delay={0.08}>
          <article className="feature-split feature-workflow">
            <div className="feature-copy">
              <span>{isId ? 'Alur Seduh yang Menenangkan' : 'A Calm Brewing Flow'}</span>
              <h3>{isId ? 'Panduan langkah demi langkah yang tenang — dari persiapan hingga sesapan pertama, tanpa tergesa-gesa.' : 'Calm step-by-step guidance — from prep to first sip, without any rush.'}</h3>
            </div>
            <ol className="workflow-rail">
              {(isId ? ['Persiapan', 'Aroma Bloom', 'Ekstraksi Tenang', 'Sentuhan Akhir', 'Sesapan Pertama'] : ['Preparation', 'Aroma Bloom', 'Calm Extraction', 'Finishing Touch', 'First Sip']).map((step, index) => (
                <li key={step}><i>{index + 1}</i><span>{step}</span></li>
              ))}
            </ol>
          </article>
        </ScrollReveal>

        <ScrollReveal variant="slide-up" delay={0.08}>
          <article className="feature-split feature-confidence">
            <div className="feature-copy">
              <span>{isId ? 'Transparansi Penuh' : 'Full Transparency'}</span>
              <h3>{isId ? 'Kami menunjukkan asal-usul setiap rekomendasi — apakah dari referensi barista juara, panduan resmi, atau estimasi cerdas AI.' : 'We reveal the source behind every recommendation — whether from champion barista references, official guides, or smart AI estimates.'}</h3>
            </div>
            <div className="confidence-list">
              <span><CheckCircle2 /> {isId ? 'Referensi Barista Juara Dunia' : 'World Champion Barista Reference'}</span>
              <span><ShieldCheck /> {isId ? 'Panduan Resmi Produsen Alat' : 'Official Device Manufacturer Guide'}</span>
              <span><CircleDashed /> {isId ? 'Rekomendasi Cerdas AI' : 'Smart AI Recommendation'}</span>
              <span><FlaskConical /> {isId ? 'Kalibrasi Rasa Anda Sendiri' : 'Your Own Taste Calibration'}</span>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal variant="blur" delay={0.05}>
          <article className="feature-large feature-coach">
            <div className="coach-avatar"><Bot /></div>
            <div className="coach-dialogue">
              <p className="coach-user">{isId ? 'Kopi saya hari ini terasa agak pahit dan sepet, kenapa ya?' : 'My cup tastes a bit too bitter and astringent today, why?'}</p>
              <p className="coach-ai">{isId ? 'Mari kita perbaiki bersama. Coba turunkan suhu air 2°C dan giling sedikit lebih kasar — seduhan berikutnya akan lebih manis dan bersih. Saya siap menemani Anda.' : "Let's fix it together. Try lowering the water temp by 2°C and grinding slightly coarser — your next cup will taste sweeter and cleaner. I'm here to help."}</p>
            </div>
          </article>
        </ScrollReveal>
      </div>
    </section>
  );
}
