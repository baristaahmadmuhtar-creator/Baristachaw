import { ArrowRight, Download, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { APK_AVAILABLE, APP_LINKS, APK_URL } from '../config';
import type { Language } from '../i18n';
import { t } from '../i18n';

export function HeroSection({ language, onRegister, user }: { language: Language; onRegister?: () => void; user?: any }) {
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
        <p className="hero-brand">{t('hero.brand', language)}</p>
        <h1 id="hero-title">
          <span className="hero-title-desktop">
            {t('hero.titleDesktop', language)}
          </span>
          <span className="hero-title-mobile" aria-hidden="true">
            {t('hero.titleMobileLine1', language)}<br />{t('hero.titleMobileLine2', language)}
          </span>
        </h1>
        <p className="hero-alternate">
          {t('hero.alternate', language)}
        </p>
        <p className="hero-body">
          {t('hero.body', language)}
        </p>
        <div className="hero-actions">
          <a 
            className="button button-primary" 
            href={APP_LINKS.aiBrew}
          >
            {user ? (language === 'id' ? 'Buka Aplikasi' : language === 'bn' ? 'Buka Aplikasi' : 'Open App') : t('hero.startBrew', language)} <ArrowRight size={18} />
          </a>
          {!user && (
            <a className="button button-ghost" href="/#pricing">
              {language === 'id' ? 'Lihat plan member' : language === 'bn' ? 'Lihat plan member' : 'See member plans'}
            </a>
          )}
        </div>
        <p className="hero-microcopy">
          {t('hero.microcopy', language)}
        </p>
      </motion.div>
      <motion.div
        className="recipe-visual"
        initial={{ opacity: 0, x: 60, rotateY: -8, filter: 'blur(16px)' }}
        animate={{ opacity: 1, x: 0, rotateY: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        aria-label={language === 'id' ? 'Resep Seduh Aktif' : language === 'bn' ? 'Resipi Seduh Aktif' : 'Active Brew Sheet'}
      >
        <div className="recipe-topline">
          <span>{t('hero.brewSheet', language)}</span>
          <span className="confidence-chip">
            <ShieldCheck size={13} /> {t('hero.recommended', language)}
          </span>
        </div>
        <div className="recipe-numbers">
          <div>
            <strong>1:15.5</strong>
            <span>{t('hero.brewRatio', language)}</span>
          </div>
          <div>
            <strong>92°C</strong>
            <span>{t('hero.waterTemp', language)}</span>
          </div>
          <div>
            <strong>3-Pour</strong>
            <span>{t('hero.pourMethod', language)}</span>
          </div>
        </div>
        <div className="pour-timeline">
          {[
            ['0:00', t('hero.blooming', language), t('hero.bloomDesc', language)],
            ['0:40', t('hero.pour1', language), t('hero.pour1Desc', language)],
            ['1:20', t('hero.pour2', language), t('hero.pour2Desc', language)],
            ['2:30', t('hero.finish', language), t('hero.finishDesc', language)],
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
          <span>{t('hero.targetFlavor', language)}</span>
          <strong>{t('hero.flavorValue', language)}</strong>
        </div>
      </motion.div>
      <a className="hero-scroll" href="#engine" aria-label="Scroll to AI Brew engine">
        <span />
      </a>
    </section>
  );
}
