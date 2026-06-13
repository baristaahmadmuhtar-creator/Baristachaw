import { ArrowRight, Download, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { APP_LINKS, APK_URL } from '../config';

export function HeroSection({ language }: { language: 'id' | 'en' }) {
  const isId = language === 'id';
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-image" aria-hidden="true" />
      <div className="hero-wash" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
      <motion.div
        className="hero-copy"
        initial={{ opacity: 0, y: 32, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="hero-brand">Baristachaw AI Brew</p>
        <h1 id="hero-title">
          <span className="hero-title-desktop">
            {isId ? 'Seduh Kopi Sempurna Setiap Pagi, Tanpa Menebak-nebak.' : 'Brew the Perfect Cup Every Morning, Without the Guesswork.'}
          </span>
          <span className="hero-title-mobile" aria-hidden="true">
            {isId ? <>Seduh sempurna.<br />Tanpa menebak-nebak.</> : <>Brew the perfect cup.<br />Without the guesswork.</>}
          </span>
        </h1>
        <p className="hero-alternate">
          {isId ? 'Brew the Perfect Cup Every Morning, Without the Guesswork.' : 'Seduh Kopi Sempurna Setiap Pagi, Tanpa Menebak-nebak.'}
        </p>
        <p className="hero-body">
          {isId
            ? 'Nikmati kenyamanan ritual menyeduh kopi yang nikmat dan konsisten. Asisten cerdas kami memandu Anda menyelaraskan rasa, biji kopi, dan grinder — untuk hasil cangkir terbaik, setiap hari.'
            : 'Enjoy the peace of mind that comes with a consistently delicious morning coffee. Our brewing companion aligns your specific beans, water profile, and grinder settings to unlock the best possible extraction, every single day.'}
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href={APP_LINKS.aiBrew}>
            {isId ? 'Mulai Seduh' : 'Start Brewing'} <ArrowRight size={18} />
          </a>
          <a className="button button-ghost" href={APK_URL}>
            <Download size={18} /> {isId ? 'Unduh APK' : 'Download APK'}
          </a>
          <a className="hero-register" href={APP_LINKS.register}>{isId ? 'Daftar Gratis' : 'Register Free'}</a>
        </div>
        <p className="hero-microcopy">
          {isId
            ? 'Bebas ribet. Dipercaya barista rumahan dan pencinta kopi di seluruh Indonesia.'
            : 'Zero hassle. Trusted by passionate home brewers and coffee professionals alike.'}
        </p>
      </motion.div>
      <motion.div
        className="recipe-visual"
        initial={{ opacity: 0, x: 60, rotateY: -8, filter: 'blur(16px)' }}
        animate={{ opacity: 1, x: 0, rotateY: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        aria-label={isId ? 'Resep Seduh Aktif' : 'Active Brew Sheet'}
      >
        <div className="recipe-topline">
          <span>{isId ? 'Lembar Seduh Hari Ini' : "Today's Brew Sheet"}</span>
          <span className="confidence-chip">
            <ShieldCheck size={13} /> {isId ? 'Rekomendasi Utama' : 'Recommended Brew'}
          </span>
        </div>
        <div className="recipe-numbers">
          <div>
            <strong>1:15.5</strong>
            <span>{isId ? 'Rasio Seduh' : 'Brew Ratio'}</span>
          </div>
          <div>
            <strong>92°C</strong>
            <span>{isId ? 'Suhu Air' : 'Water Temp'}</span>
          </div>
          <div>
            <strong>3-Pour</strong>
            <span>{isId ? 'Metode Aliran' : 'Pour Method'}</span>
          </div>
        </div>
        <div className="pour-timeline">
          {[
            ['0:00', isId ? 'Blooming' : 'Blooming', isId ? 'Basahi Kopi (50g)' : 'Wet coffee bed (50g)'],
            ['0:40', isId ? 'Tuangan 1' : 'First Pour', isId ? 'Bentuk Rasa (120g)' : 'Extract sweetness (120g)'],
            ['1:20', isId ? 'Tuangan 2' : 'Second Pour', isId ? 'Bentuk Body (150g)' : 'Develop body (150g)'],
            ['2:30', isId ? 'Selesai' : 'Drawdown', isId ? 'Nikmati Kopi Anda' : 'Pour complete. Sip & enjoy!'],
          ].map(([time, label, value], index) => (
            <div className="pour-step" key={label}>
              <span className="pour-dot" style={{ animationDelay: `${index * 0.35}s` }} />
              <time>{time}</time>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="recipe-footer">
          <span>{isId ? 'Target Karakter Rasa' : 'Target Flavor Profile'}</span>
          <strong>{isId ? 'Sweet & Sweet Acid' : 'Sweet & Vibrant Acidity'}</strong>
        </div>
      </motion.div>
      <a className="hero-scroll" href="#engine" aria-label="Scroll to AI Brew engine">
        <span />
      </a>
    </section>
  );
}
