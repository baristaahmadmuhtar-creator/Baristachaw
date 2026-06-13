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
            {isId ? 'Seduh Kopi Sempurna Setiap Pagi, Tanpa Tebak-Tebak.' : 'Brew the Perfect Cup Every Morning, Effortlessly.'}
          </span>
          <span className="hero-title-mobile" aria-hidden="true">
            {isId ? <>Seduh sempurna.<br />Tanpa tebak-tebak.</> : <>Brew the perfect cup.<br />Effortlessly.</>}
          </span>
        </h1>
        <p className="hero-alternate">
          {isId ? 'Brew the Perfect Cup Every Morning, Effortlessly.' : 'Seduh Kopi Sempurna Setiap Pagi, Tanpa Tebak-Tebak.'}
        </p>
        <p className="hero-body">
          {isId
            ? 'Nikmati kenyamanan menyeduh dengan asisten cerdas yang memandu setiap langkah Anda menuju cita rasa kopi impian, disesuaikan dengan biji kopi dan grinder Anda.'
            : 'Enjoy the comfort of brewing with a smart assistant guiding your every step toward your dream flavor, tailored to your beans and grinder.'}
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
            ? 'Dosis, rasio gilingan, suhu air, roast level, profil rasa, dan panduan langkah demi langkah.'
            : 'Dose, ratio, temperature, roast level, taste profile, and step-by-step guidance.'}
        </p>
      </motion.div>
      <motion.div
        className="recipe-visual"
        initial={{ opacity: 0, x: 38, rotateY: -5 }}
        animate={{ opacity: 1, x: 0, rotateY: 0 }}
        transition={{ duration: 0.85, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        aria-label={isId ? 'Alur Seduh Santai' : 'Relaxed Brewing Experience'}
      >
        <div className="recipe-topline">
          <span>{isId ? 'Profil Rasa Ideal' : 'Ideal Taste Profile'}</span>
          <span className="confidence-chip"><ShieldCheck size={13} /> {isId ? 'Konsisten' : 'Consistent'}</span>
        </div>
        <div className="recipe-numbers">
          <div><strong>100%</strong><span>{isId ? 'Rasa Konsisten' : 'Consistent Taste'}</span></div>
          <div><strong>0</strong><span>{isId ? 'Coba-Coba' : 'Guesswork'}</span></div>
          <div><strong>Sempurna</strong><span>{isId ? 'Hasil Cup' : 'Cup Result'}</span></div>
        </div>
        <div className="pour-timeline">
          {[
            ['Step 1', isId ? 'Pilih Alat' : 'Select Brewer', isId ? 'Moka, V60, dll' : 'Moka, V60, etc.'],
            ['Step 2', isId ? 'Atur Rasa' : 'Adjust Taste', isId ? 'Bright / Sweet' : 'Bright / Sweet'],
            ['Step 3', isId ? 'Ikuti AI' : 'Follow AI Guide', isId ? 'Sangat Tenang' : 'Calm Guide'],
            ['Step 4', isId ? 'Sip & Enjoy' : 'Sip & Enjoy', isId ? 'Nikmat & Rileks' : 'Relaxed & Tasty'],
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
          <span>{isId ? 'Kenyamanan Seduh' : 'Brewing Comfort'}</span>
          <strong>{isId ? 'Setiap Pagi' : 'Every Morning'}</strong>
        </div>
      </motion.div>
      <a className="hero-scroll" href="#engine" aria-label="Scroll to AI Brew engine">
        <span />
      </a>
    </section>
  );
}
