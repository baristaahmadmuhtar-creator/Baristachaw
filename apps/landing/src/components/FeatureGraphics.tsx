import { Bot, CheckCircle2, CircleDashed, FlaskConical, ShieldCheck } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import type { Language } from '../i18n';

// ── Feature section copy keyed by language ─────────────────────────────────────

const FEATURE_COPY: Record<
  Language,
  {
    sectionTitle: string;
    sectionSubtitle: string;
    personalTag: string;
    personalHeading: string;
    inputChips: string[];
    outputGrind: string;
    outputTemp: string;
    outputPours: string;
    outputFlavor: string;
    flowTag: string;
    flowHeading: string;
    flowSteps: string[];
    transparencyTag: string;
    transparencyHeading: string;
    confidenceChampion: string;
    confidenceOfficial: string;
    confidenceAi: string;
    confidenceCalibration: string;
    coachUser: string;
    coachAi: string;
  }
> = {
  id: {
    sectionTitle: 'Dirancang untuk Kenyamanan Ritual Kopi Anda.',
    sectionSubtitle:
      'Teknologi cerdas bekerja di balik layar agar Anda bisa menikmati proses seduh tanpa repot — hanya rasa terbaik di cangkir Anda.',
    personalTag: 'Sentuhan Personal',
    personalHeading:
      'Cukup beri tahu kami biji kopi, rasa yang diinginkan, dan grinder Anda. AI akan meracik panduan seduh yang presisi dalam hitungan detik.',
    inputChips: ['Ethiopia Washed', 'Medium Roast', 'Rasa Floral', 'Grinder Fellow Ode'],
    outputGrind: 'Gilingan #4.2',
    outputTemp: 'Suhu 92°C',
    outputPours: '3x Tuangan',
    outputFlavor: 'Rasa Bersih & Floral',
    flowTag: 'Alur Seduh yang Menenangkan',
    flowHeading:
      'Panduan langkah demi langkah yang tenang — dari persiapan hingga sesapan pertama, tanpa tergesa-gesa.',
    flowSteps: ['Persiapan', 'Aroma Bloom', 'Ekstraksi Tenang', 'Sentuhan Akhir', 'Sesapan Pertama'],
    transparencyTag: 'Transparansi Penuh',
    transparencyHeading:
      'Kami menunjukkan asal-usul setiap rekomendasi — apakah dari referensi barista juara, panduan resmi, atau estimasi cerdas AI.',
    confidenceChampion: 'Referensi Barista Juara Dunia',
    confidenceOfficial: 'Panduan Resmi Produsen Alat',
    confidenceAi: 'Rekomendasi Cerdas AI',
    confidenceCalibration: 'Kalibrasi Rasa Anda Sendiri',
    coachUser: 'Kopi saya hari ini terasa agak pahit dan sepet, kenapa ya?',
    coachAi:
      'Mari kita perbaiki bersama. Coba turunkan suhu air 2°C dan giling sedikit lebih kasar — seduhan berikutnya akan lebih manis dan bersih. Saya siap menemani Anda.',
  },
  en: {
    sectionTitle: 'Designed for the Comfort of Your Coffee Ritual.',
    sectionSubtitle:
      'Smart technology works behind the scenes so you can enjoy the brewing process without hassle — only the best taste in your cup.',
    personalTag: 'Personalized Touch',
    personalHeading:
      'Just tell us your beans, desired flavor, and grinder. AI crafts a precise brewing guide in seconds.',
    inputChips: ['Ethiopia Washed', 'Medium Roast', 'Floral Flavor', 'Fellow Ode Grinder'],
    outputGrind: 'Grind #4.2',
    outputTemp: 'Temp 92°C',
    outputPours: '3 Pours',
    outputFlavor: 'Clean & Floral',
    flowTag: 'A Calm Brewing Flow',
    flowHeading:
      'Calm step-by-step guidance — from prep to first sip, without any rush.',
    flowSteps: ['Preparation', 'Aroma Bloom', 'Calm Extraction', 'Finishing Touch', 'First Sip'],
    transparencyTag: 'Full Transparency',
    transparencyHeading:
      'We reveal the source behind every recommendation — whether from champion barista references, official guides, or smart AI estimates.',
    confidenceChampion: 'World Champion Barista Reference',
    confidenceOfficial: 'Official Device Manufacturer Guide',
    confidenceAi: 'Smart AI Recommendation',
    confidenceCalibration: 'Your Own Taste Calibration',
    coachUser: 'My cup tastes a bit too bitter and astringent today, why?',
    coachAi:
      "Let's fix it together. Try lowering the water temp by 2°C and grinding slightly coarser — your next cup will taste sweeter and cleaner. I'm here to help.",
  },
  bn: {
    sectionTitle: 'Direka untuk Keselesaan Ritual Kopi Anda.',
    sectionSubtitle:
      'Teknologi pintar bekerja di sebalik tabir supaya anda boleh menikmati proses seduhan tanpa kerumitan — hanya rasa terbaik dalam cawan anda.',
    personalTag: 'Sentuhan Peribadi',
    personalHeading:
      'Cukup beritahu kita biji kopi, rasa yang anda mahu, dan grinder anda. AI akan meracik panduan seduh yang tepat dalam beberapa saat.',
    inputChips: ['Ethiopia Washed', 'Medium Roast', 'Rasa Floral', 'Grinder Fellow Ode'],
    outputGrind: 'Kisaran #4.2',
    outputTemp: 'Suhu 92°C',
    outputPours: '3x Tuangan',
    outputFlavor: 'Rasa Bersih & Floral',
    flowTag: 'Alur Seduhan yang Menenangkan',
    flowHeading:
      'Panduan langkah demi langkah yang tenang — dari persiapan hingga hirupan pertama, tanpa tergesa-gesa.',
    flowSteps: ['Persiapan', 'Aroma Bloom', 'Pengekstrakan Tenang', 'Sentuhan Akhir', 'Hirupan Pertama'],
    transparencyTag: 'Ketelusan Penuh',
    transparencyHeading:
      'Kita tunjukkan asal setiap syor — sama ada dari rujukan barista juara, panduan rasmi, atau anggaran pintar AI.',
    confidenceChampion: 'Rujukan Barista Juara Dunia',
    confidenceOfficial: 'Panduan Rasmi Pengeluar Alat',
    confidenceAi: 'Syor Pintar AI',
    confidenceCalibration: 'Kalibrasi Rasa Anda Sendiri',
    coachUser: 'Kopi saya hari ani terasa agak pahit dan kelat, kenapa ya?',
    coachAi:
      'Jom kita perbaiki sama-sama. Cuba turunkan suhu air 2°C dan kisar sedikit lebih kasar — seduhan seterusnya akan lebih manis dan bersih. Saya sedia membantu anda.',
  },
};

export function FeatureGraphics({ language }: { language: Language }) {
  const c = FEATURE_COPY[language];
  return (
    <section className="feature-graphics section-shell" aria-labelledby="features-title">
      <ScrollReveal variant="dramatic">
        <div className="section-heading">
          <p className="section-index">04 / 06</p>
          <div>
            <h2 id="features-title">{c.sectionTitle}</h2>
            <p>{c.sectionSubtitle}</p>
          </div>
        </div>
      </ScrollReveal>
      <div className="feature-story">
        <ScrollReveal variant="blur" delay={0.05}>
          <article className="feature-large feature-recipe">
            <div className="feature-copy">
              <span>{c.personalTag}</span>
              <h3>{c.personalHeading}</h3>
            </div>
            <div className="input-output-graphic" aria-hidden="true">
              <div className="input-stack">
                {c.inputChips.map((item) => <span key={item}>{item}</span>)}
              </div>
              <div className="logic-beam"><FlaskConical /></div>
              <div className="output-stack">
                <strong>{c.outputGrind}</strong>
                <strong>{c.outputTemp}</strong>
                <strong>{c.outputPours}</strong>
                <strong>{c.outputFlavor}</strong>
              </div>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal variant="slide-up" delay={0.08}>
          <article className="feature-split feature-workflow">
            <div className="feature-copy">
              <span>{c.flowTag}</span>
              <h3>{c.flowHeading}</h3>
            </div>
            <ol className="workflow-rail">
              {c.flowSteps.map((step, index) => (
                <li key={step}><i>{index + 1}</i><span>{step}</span></li>
              ))}
            </ol>
          </article>
        </ScrollReveal>

        <ScrollReveal variant="slide-up" delay={0.08}>
          <article className="feature-split feature-confidence">
            <div className="feature-copy">
              <span>{c.transparencyTag}</span>
              <h3>{c.transparencyHeading}</h3>
            </div>
            <div className="confidence-list">
              <span><CheckCircle2 /> {c.confidenceChampion}</span>
              <span><ShieldCheck /> {c.confidenceOfficial}</span>
              <span><CircleDashed /> {c.confidenceAi}</span>
              <span><FlaskConical /> {c.confidenceCalibration}</span>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal variant="blur" delay={0.05}>
          <article className="feature-large feature-coach">
            <div className="coach-avatar"><Bot /></div>
            <div className="coach-dialogue">
              <p className="coach-user">{c.coachUser}</p>
              <p className="coach-ai">{c.coachAi}</p>
            </div>
          </article>
        </ScrollReveal>
      </div>
    </section>
  );
}
