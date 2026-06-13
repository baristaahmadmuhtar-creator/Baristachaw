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
      body: 'Enter your beans, choose your flavor, and select your grinder. In seconds, AI crafts a precise brewing guide — from water temperature to grind size.',
      link: APP_LINKS.aiBrew,
      cta: 'Try AI Brew',
    },
    {
      icon: Clock,
      badge: 'FREE',
      title: 'Brew Timer',
      body: 'Interactive timer with step-by-step guidance. Bloom, first pour, second pour — everything is timed so you just follow along.',
      link: APP_LINKS.home + '/tools?tab=timer',
      cta: 'Open Timer',
    },
    {
      icon: Gauge,
      badge: 'FREE',
      title: 'Ratio Calculator',
      body: 'Calculate the ideal coffee-to-water ratio, convert grind sizes to your grinder settings, and adjust volume to taste — all on one screen.',
      link: APP_LINKS.home + '/tools?tab=ratio',
      cta: 'Open Calculator',
    },
    {
      icon: Settings,
      badge: 'FREE',
      title: 'Grind Size Calculator',
      body: 'Easily convert grind sizes between different grinder models. Select your grinder and get the exact click settings for your chosen brewing method.',
      link: APP_LINKS.home + '/tools?tab=ratio&panel=grind-size',
      cta: 'Open Grinder Calc',
    },
    {
      icon: MessageSquare,
      badge: 'AI',
      title: 'AI Coffee Coach',
      body: 'Ask anything about coffee. Cup too bitter? New beans? New grinder? AI Coach is ready to help you find the answer.',
      link: APP_LINKS.home + '/chat',
      cta: 'Ask AI Coach',
    },
    {
      icon: BookOpen,
      badge: 'FREE',
      title: 'Recipe Collection',
      body: 'Save your favorite recipes and come back anytime. Build a personal recipe library that is always at your fingertips.',
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
                : 'Everything You Need, in One App.'}
            </h2>
            <p>
              {isId
                ? 'Dari kalkulator rasio yang gratis hingga AI Brew yang cerdas — setiap alat dirancang agar ritual kopi Anda lebih mudah dan menyenangkan.'
                : 'From a free ratio calculator to smart AI Brew — every tool is designed to make your coffee ritual easier and more enjoyable.'}
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
