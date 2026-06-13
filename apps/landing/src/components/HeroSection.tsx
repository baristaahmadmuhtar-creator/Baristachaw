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
            {isId ? 'Seduh Kopi Sempurna Setiap Pagi, Tanpa Menebak-nebak.' : 'Brew the Perfect Cup Every Morning, Effortlessly.'}
          </span>
          <span className="hero-title-mobile" aria-hidden="true">
            {isId ? <>Seduh sempurna.<br />Tanpa menebak-nebak.</> : <>Brew the perfect cup.<br />Effortlessly.</>}
          </span>
        </h1>
        <p className="hero-alternate">
          {isId ? 'Brew the Perfect Cup Every Morning, Effortlessly.' : 'Seduh Kopi Sempurna Setiap Pagi, Tanpa Menebak-nebak.'}
        </p>
        <p className="hero-body">
          {isId
            ? 'Nikmati kenyamanan ritual menyeduh kopi yang nikmat dan konsisten. Asisten cerdas kami memandu Anda menyelaraskan rasa, biji kopi, dan grinder — untuk hasil cangkir terbaik, setiap hari.'
            : 'Experience the comfort of a delicious, consistent coffee ritual. Our smart assistant guides you to align flavor, beans, and grinder — for the perfect cup, every single day.'}
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
            : 'Zero hassle. Trusted by home baristas and coffee enthusiasts everywhere.'}
        </p>
      </motion.div>
      <motion.div
        className="recipe-visual"
        initial={{ opacity: 0, x: 42, rotateY: -5, filter: 'blur(8px)' }}
        animate={{ opacity: 1, x: 0, rotateY: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.95, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        aria-label={isId ? 'Alur Seduh Santai' : 'Relaxed Brewing Experience'}
      >
        <div className="recipe-topline">
          <span>{isId ? 'Teman Seduh Anda' : 'Your Brew Companion'}</span>
          <span className="confidence-chip"><ShieldCheck size={13} /> {isId ? 'Aktif' : 'Active'}</span>
        </div>
        <div className="recipe-numbers">
          <div><strong>100%</strong><span>{isId ? 'Konsisten' : 'Consistent'}</span></div>
          <div><strong>0</strong><span>{isId ? 'Tanpa Tebak' : 'No Guessing'}</span></div>
          <div><strong>Optimal</strong><span>{isId ? 'Rasa Kopi' : 'Coffee Taste'}</span></div>
        </div>
        <div className="pour-timeline">
          {[
            ['Step 1', isId ? 'Pilih Profil' : 'Select Profile', isId ? 'Sweet / Bright' : 'Sweet / Bright'],
            ['Step 2', isId ? 'Rasio Otomatis' : 'Auto Ratio', isId ? 'Dihitung untuk Anda' : 'Calculated for you'],
            ['Step 3', isId ? 'Panduan Tenang' : 'Calm Guide', isId ? 'Langkah demi langkah' : 'Step-by-step'],
            ['Step 4', isId ? 'Nikmati Hasil' : 'Sip & Smile', isId ? 'Rasa konsisten' : 'Always consistent'],
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
          <span>{isId ? 'Ritual Pagi Tenang' : 'Peaceful Morning Ritual'}</span>
          <strong>{isId ? 'Setiap Hari' : 'Every Single Day'}</strong>
        </div>
      </motion.div>
      <a className="hero-scroll" href="#engine" aria-label="Scroll to AI Brew engine">
        <span />
      </a>
    </section>
  );
}
