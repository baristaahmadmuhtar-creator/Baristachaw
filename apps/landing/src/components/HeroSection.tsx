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
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="hero-brand">Baristachaw AI Brew</p>
        <h1 id="hero-title">
          <span className="hero-title-desktop">
            {isId ? 'Seduh lebih presisi dengan AI yang paham metode kopi.' : 'Brew smarter with AI that understands coffee methods.'}
          </span>
          <span className="hero-title-mobile" aria-hidden="true">
            {isId ? <>Seduh lebih presisi.<br />AI paham metode.</> : <>Brew smarter.<br />AI understands methods.</>}
          </span>
        </h1>
        <p className="hero-alternate">
          {isId ? 'Brew smarter with AI that understands coffee methods.' : 'Seduh lebih presisi dengan AI yang paham metode kopi.'}
        </p>
        <p className="hero-body">
          {isId
            ? 'Starting recipe method-aware untuk hot dan iced, dengan confidence yang jujur, workflow yang jelas, dan guardrail real brew.'
            : 'Method-aware starting recipes for hot and iced brewing, with honest confidence, clear workflow, and real-brew guardrails.'}
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href={APP_LINKS.aiBrew}>
            {isId ? 'Coba AI Brew' : 'Try AI Brew'} <ArrowRight size={18} />
          </a>
          <a className="button button-ghost" href={APK_URL}>
            <Download size={18} /> {isId ? 'Unduh APK' : 'Download APK'}
          </a>
          <a className="hero-register" href={APP_LINKS.register}>{isId ? 'Daftar gratis' : 'Register free'}</a>
        </div>
        <p className="hero-microcopy">
          {isId
            ? 'Dose, rasio, roast, process, varietas, grinder, water, method, dan target rasa.'
            : 'Dose, ratio, roast, process, variety, grinder, water, method, and target taste.'}
        </p>
      </motion.div>
      <motion.div
        className="recipe-visual"
        initial={{ opacity: 0, x: 38, rotateY: -5 }}
        animate={{ opacity: 1, x: 0, rotateY: 0 }}
        transition={{ duration: 0.85, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        aria-label={isId ? 'Contoh timeline recipe V60' : 'Example V60 recipe timeline'}
      >
        <div className="recipe-topline">
          <span>V60 · Sweet & clean</span>
          <span className="confidence-chip"><ShieldCheck size={13} /> Curated</span>
        </div>
        <div className="recipe-numbers">
          <div><strong>15 g</strong><span>Dose</span></div>
          <div><strong>250 g</strong><span>Water</span></div>
          <div><strong>93°C</strong><span>Temp</span></div>
        </div>
        <div className="pour-timeline">
          {[
            ['00:00', 'Bloom', '45 g'],
            ['00:45', 'Pour 1', '120 g'],
            ['01:20', 'Pour 2', '190 g'],
            ['01:55', 'Final', '250 g'],
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
          <span>{isId ? 'Target selesai' : 'Target finish'}</span>
          <strong>02:45–03:15</strong>
        </div>
      </motion.div>
      <a className="hero-scroll" href="#engine" aria-label="Scroll to AI Brew engine">
        <span />
      </a>
    </section>
  );
}
