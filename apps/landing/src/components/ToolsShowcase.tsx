import { BookOpen, Clock, FlaskConical, Gauge, MessageSquare, Settings } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { APP_LINKS } from '../config';

const TOOLS = {
  id: [
    {
      icon: FlaskConical,
      badge: 'AI',
      title: 'AI Brew',
      body: 'Masukkan biji kopi, pilih rasa, dan grinder Anda. Dalam hitungan detik, AI meracik panduan seduh yang presisi — dari suhu air hingga ukuran gilingan.',
      link: APP_LINKS.aiBrew,
      cta: 'Coba AI Brew',
    },
    {
      icon: Clock,
      badge: 'GRATIS',
      title: 'Brew Timer',
      body: 'Timer interaktif dengan panduan langkah demi langkah. Bloom, tuang pertama, tuang kedua — semua diatur waktunya agar Anda tinggal mengikuti.',
      link: APP_LINKS.home + '/tools?tab=timer',
      cta: 'Buka Timer',
    },
    {
      icon: Gauge,
      badge: 'GRATIS',
      title: 'Ratio Calculator',
      body: 'Hitung rasio kopi-air yang ideal, konversi ukuran gilingan ke setelan grinder Anda, dan sesuaikan volume sesuai selera dalam satu layar.',
      link: APP_LINKS.home + '/tools?tab=ratio',
      cta: 'Buka Kalkulator',
    },
    {
      icon: Settings,
      badge: 'GRATIS',
      title: 'Kalkulator Gilingan (Grinder Calc)',
      body: 'Konversi ukuran gilingan kopi antar grinder dengan mudah. Pilih model grinder Anda dan dapatkan klik gilingan yang tepat untuk metode seduh pilihan Anda.',
      link: APP_LINKS.home + '/tools?tab=ratio&panel=grind-size',
      cta: 'Buka Kalkulator Gilingan',
    },
    {
      icon: MessageSquare,
      badge: 'AI',
      title: 'AI Coffee Coach',
      body: 'Tanya apa saja tentang kopi. Kopi terlalu pahit? Biji kopi baru? Grinder baru? AI Coach siap membantu Anda menemukan solusinya.',
      link: APP_LINKS.home + '/chat',
      cta: 'Tanya AI Coach',
    },
    {
      icon: BookOpen,
      badge: 'GRATIS',
      title: 'Koleksi Resep',
      body: 'Simpan resep favorit Anda dan kembali kapan saja. Bangun perpustakaan resep pribadi yang selalu tersedia di ujung jari.',
      link: APP_LINKS.home + '/collection',
      cta: 'Lihat Koleksi',
    },
  ],
  en: [
    {
      icon: FlaskConical,
      badge: 'AI',
      title: 'AI Brew',
      body: 'Input your beans, roast date, target flavor notes, and grinder model. In seconds, our engine crafts a custom, multi-pour recipe.',
      link: APP_LINKS.aiBrew,
      cta: 'Try AI Brew',
    },
    {
      icon: Clock,
      badge: 'FREE',
      title: 'Brew Timer',
      body: 'An intuitive timer with step-by-step pouring stages. We calculate the bloom time and flow rates so you can focus on a steady pour.',
      link: APP_LINKS.home + '/tools?tab=timer',
      cta: 'Open Timer',
    },
    {
      icon: Gauge,
      badge: 'FREE',
      title: 'Ratio Calculator',
      body: 'Dial in the perfect coffee-to-water ratio. Adjust your water volume or bean dosage dynamically to meet gold extraction standards.',
      link: APP_LINKS.home + '/tools?tab=ratio',
      cta: 'Open Calculator',
    },
    {
      icon: Settings,
      badge: 'FREE',
      title: 'Grind Size Calculator',
      body: 'Cross-reference grind settings between Comandante, 1Zpresso, Fellow Ode, and more. Instantly find the exact click target for your brewer.',
      link: APP_LINKS.home + '/tools?tab=ratio&panel=grind-size',
      cta: 'Open Grinder Calc',
    },
    {
      icon: MessageSquare,
      badge: 'AI',
      title: 'AI Coffee Coach',
      body: 'Troubleshoot your extractions in real time. If your cup tastes too dry, astringent, or sour, get instant barista troubleshooting.',
      link: APP_LINKS.home + '/chat',
      cta: 'Ask AI Coach',
    },
    {
      icon: BookOpen,
      badge: 'FREE',
      title: 'Recipe Collection',
      body: 'Keep track of your best extractions. Log your favorite recipes, water chemistries, and tasting notes in your personal brew vault.',
      link: APP_LINKS.home + '/collection',
      cta: 'View Collection',
    },
  ],
};

export function ToolsShowcase({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  const tools = isId ? TOOLS.id : TOOLS.en;

  return (
    <section className="tools-showcase section-shell" id="features" aria-labelledby="tools-title">
      <ScrollReveal variant="dramatic">
        <div className="section-heading">
          <p className="section-index">Tools</p>
          <div>
            <h2 id="tools-title">
              {isId
                ? 'Semua yang Anda Butuhkan, dalam Satu Aplikasi.'
                : 'Everything You Need for a Perfect Cup, in One App.'}
            </h2>
            <p>
              {isId
                ? 'Dari kalkulator rasio yang gratis hingga AI Brew yang cerdas — setiap alat dirancang agar ritual kopi Anda lebih mudah dan menyenangkan.'
                : 'From our free ratio calculator to intelligent AI-guided recipes, each tool is crafted to elevate your daily brewing ritual.'}
            </p>
          </div>
        </div>
      </ScrollReveal>

      <div className="tools-grid">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <ScrollReveal key={tool.title} variant="blur" delay={index * 0.07}>
              <a className="tool-card" href={tool.link}>
                <div className="tool-card-head">
                  <div className="tool-icon-wrap"><Icon size={22} /></div>
                  <span className={`tool-badge ${tool.badge === 'AI' ? 'tool-badge-ai' : ''}`}>
                    {tool.badge}
                  </span>
                </div>
                <h3>{tool.title}</h3>
                <p>{tool.body}</p>
                <span className="tool-cta">{tool.cta} →</span>
              </a>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}
