import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, CreditCard, Crown, Gauge, RefreshCw, ShieldCheck, Sparkles, X } from '../icons';
import type { AccountPlan, AccountStatusSnapshot, PlanCode } from '../../services/accountStatus';
import { BillingApiError, startBillingCheckout } from '../../services/billing';
import { modalSpringTransition, overlayFadeTransition } from '../../utils/motionPresets';

type PlanGrowthSurfaceProps = {
  snapshot: AccountStatusSnapshot | null;
  t: Record<string, string>;
  language: string;
  locale: string;
  direction: 'ltr' | 'rtl';
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

const currentColorIconStyle = { '--icon-glyph-color': 'currentColor' } as CSSProperties;

const PLAN_ORDER: PlanCode[] = ['free', 'starter', 'pro', 'team'];

function formatCompactNumber(value: number, locale = 'en'): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatStorage(mb: number, locale: string): string {
  if (mb >= 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: mb >= 10240 ? 0 : 1 }).format(mb / 1024)} GB`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(mb)} MB`;
}

function formatPlanName(plan: Pick<AccountPlan, 'code' | 'name'>, language: string): string {
  if (language !== 'id') return plan.name;
  const names: Record<PlanCode, string> = {
    free: 'Gratis',
    starter: 'Starter',
    pro: 'Pro',
    team: 'Tim',
    enterprise: 'Enterprise',
  };
  return names[plan.code] || plan.name;
}

function formatPlanDescription(plan: Pick<AccountPlan, 'code' | 'description'>, language: string): string {
  if (language === 'id') {
    const descriptions: Record<PlanCode, string> = {
      free: 'Cocok untuk mencoba AI kopi, pencarian dasar, dan pemindaian ringan.',
      starter: 'Untuk pengguna rutin yang ingin kuota AI dan scanner lebih lega.',
      pro: 'Untuk workflow harian, riset kopi, AI Brew, dan pemindaian visual intensif.',
      team: 'Untuk tim kecil, barista, dan operasional kedai yang butuh kontrol bersama.',
      enterprise: 'Untuk kebutuhan khusus, invoice manual, dan dukungan prioritas.',
    };
    return descriptions[plan.code] || plan.description;
  }
  if (language === 'ar') {
    const descriptions: Record<PlanCode, string> = {
      free: 'مناسب لتجربة ذكاء القهوة والبحث الأساسي والمسح الخفيف.',
      starter: 'للاستخدام المنتظم مع حصة أوسع للذكاء الاصطناعي والمسح.',
      pro: 'لسير العمل اليومي، أبحاث القهوة، AI Brew، والمسح البصري المكثف.',
      team: 'للفرق الصغيرة والباريستا وتشغيل المقاهي مع تحكم مشترك.',
      enterprise: 'لاحتياجات خاصة وفواتير يدوية ودعم أولوية.',
    };
    return descriptions[plan.code] || plan.description;
  }
  return plan.description;
}

function formatDisplayPrice(plan: Pick<AccountPlan, 'displayPrice'>, language: string): string {
  if (language === 'id') {
    return plan.displayPrice
      .replace(/^Free$/i, 'Gratis')
      .replace(/monthly/gi, 'per bulan')
      .replace(/Custom invoice/gi, 'Invoice khusus');
  }
  if (language === 'ar') {
    return plan.displayPrice
      .replace(/^Free$/i, 'مجاني')
      .replace(/monthly/gi, 'شهريًا')
      .replace(/Custom invoice/gi, 'فاتورة مخصصة');
  }
  return plan.displayPrice;
}

function localizePlanFeature(feature: string, language: string): string {
  if (language !== 'id') return feature;
  const key = feature.toLowerCase();
  const map: Record<string, string> = {
    chat: 'Obrolan AI',
    'basic scanner': 'Pemindai dasar',
    'local collection': 'Koleksi lokal',
    'higher ai quota': 'Kuota AI lebih lega',
    'ai brew journal': 'Jurnal AI Brew',
    'scanner history': 'Riwayat pemindaian',
    'deep mode': 'Mode Deep',
    'latte art edit': 'Edit latte art',
    'advanced collections': 'Koleksi lanjutan',
    'priority ai': 'Prioritas AI',
    'team seats': 'Kursi tim',
    'training notes': 'Catatan training',
    'manager controls': 'Kontrol manajer',
    'audit export': 'Ekspor audit',
  };
  return map[key] || feature;
}

function planBenefits(plan: AccountPlan, t: Record<string, string>, language: string, locale: string): string[] {
  const generated = [
    t.homePlanBenefitAi.replace('{count}', formatCompactNumber(plan.aiDailyLimit, locale)),
    t.homePlanBenefitDeep.replace('{count}', formatCompactNumber(plan.deepDailyLimit, locale)),
    t.homePlanBenefitScanner.replace('{count}', formatCompactNumber(plan.scannerDailyLimit, locale)),
    t.homePlanBenefitStorage.replace('{size}', formatStorage(plan.storageMb, locale)),
  ];
  const feature = plan.features.map((item) => localizePlanFeature(item, language)).filter(Boolean)[0];
  return feature ? [...generated.slice(0, 3), feature] : generated.slice(0, 4);
}

function resolveDisplayPlans(snapshot: AccountStatusSnapshot): AccountPlan[] {
  const byCode = new Map(snapshot.plans.map((plan) => [plan.code, plan]));
  const ordered = PLAN_ORDER.map((code) => byCode.get(code)).filter(Boolean) as AccountPlan[];
  return ordered.length ? ordered : snapshot.plans.filter((plan) => plan.code !== 'enterprise').slice(0, 4);
}

function resolveRecommendedPlan(snapshot: AccountStatusSnapshot): AccountPlan {
  const displayPlans = resolveDisplayPlans(snapshot);
  const recommendedCode = snapshot.recommendedUpgrade.planCode !== 'free' ? snapshot.recommendedUpgrade.planCode : 'pro';
  return displayPlans.find((plan) => plan.code === recommendedCode)
    || displayPlans.find((plan) => plan.code === 'pro')
    || displayPlans.find((plan) => plan.code !== 'free')
    || displayPlans[0]
    || snapshot.plan;
}

function PlanCard({
  plan,
  currentPlanCode,
  recommended,
  busy,
  onChoose,
  t,
  language,
  locale,
}: {
  plan: AccountPlan;
  currentPlanCode: PlanCode;
  recommended: boolean;
  busy: boolean;
  onChoose: (plan: AccountPlan) => void;
  t: Record<string, string>;
  language: string;
  locale: string;
}) {
  const active = currentPlanCode === plan.code;
  const isFree = plan.code === 'free';
  const benefits = planBenefits(plan, t, language, locale);

  return (
    <article
      data-testid={`plan-card-${plan.code}`}
      className={`relative flex min-h-[18rem] flex-col rounded-2xl border p-4 transition-all ${
        recommended
          ? 'border-blue-500/45 bg-blue-500/10 shadow-[0_18px_45px_rgba(37,99,235,0.18)]'
          : 'border-glass bg-surface-alpha'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-primary">{formatPlanName(plan, language)}</h3>
            {recommended ? (
              <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white">
                {t.homePlanRecommended}
              </span>
            ) : null}
            {active ? (
              <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                {t.homePlanCurrent}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-5 text-secondary">{formatPlanDescription(plan, language)}</p>
        </div>
        {recommended ? <Crown className="shrink-0" size={20} variant="glyph" tone="amber" /> : null}
      </div>

      <div className="mt-4">
        <p className="text-2xl font-black tracking-tight text-primary">{formatDisplayPrice(plan, language)}</p>
        <p className="mt-1 text-xs font-semibold text-secondary">{t.homePlanPriceNote}</p>
      </div>

      <ul className="mt-4 flex flex-1 flex-col gap-2">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-sm leading-5 text-secondary">
            <Check size={15} className="mt-0.5 shrink-0" variant="glyph" tone="green" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onChoose(plan)}
        disabled={busy || active}
        className={`mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          recommended
            ? 'bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)] hover:bg-blue-700'
            : 'border border-glass bg-[var(--bg-base)]/70 text-primary hover:bg-[var(--bg-base)]'
        }`}
      >
        {busy ? (
          <RefreshCw size={16} className="animate-spin" variant="glyph" tone="ice" />
        ) : isFree ? (
          <ShieldCheck size={16} variant="glyph" tone="green" />
        ) : (
          <CreditCard
            size={16}
            variant="glyph"
            tone={recommended ? 'neutral' : 'blue'}
            style={recommended ? currentColorIconStyle : undefined}
          />
        )}
        {active ? t.homePlanActive : isFree ? t.homePlanContinueFree : t.homePlanSelect.replace('{plan}', formatPlanName(plan, language))}
      </button>
    </article>
  );
}

export function PlanGrowthSurface({
  snapshot,
  t,
  language,
  locale,
  direction,
  isOpen,
  onOpen,
  onClose,
}: PlanGrowthSurfaceProps) {
  const [busyPlanCode, setBusyPlanCode] = useState<PlanCode | null>(null);
  const [actionError, setActionError] = useState('');
  const modalRef = useRef<HTMLDivElement | null>(null);
  const isRtl = direction === 'rtl';

  const displayPlans = useMemo(() => snapshot ? resolveDisplayPlans(snapshot) : [], [snapshot]);
  const recommendedPlan = useMemo(() => snapshot ? resolveRecommendedPlan(snapshot) : null, [snapshot]);
  const currentPlanCode = snapshot?.user.planCode || snapshot?.plan.code || 'free';
  const currentPlan = displayPlans.find((plan) => plan.code === currentPlanCode) || snapshot?.plan || null;
  const showUpgradeFraming = currentPlanCode === 'free' || snapshot?.recommendedUpgrade.action === 'checkout';
  const showCompactPaidSurface = !showUpgradeFraming;

  useEffect(() => {
    if (!isOpen) return;
    setActionError('');
    const timer = window.setTimeout(() => modalRef.current?.focus(), 30);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!snapshot || !recommendedPlan || !currentPlan) return null;

  const handleChoosePlan = async (plan: AccountPlan) => {
    setActionError('');
    if (plan.code === 'free') {
      onClose();
      return;
    }

    if (plan.checkoutMode === 'manual_invoice') {
      setActionError(t.homePlanManualInvoice);
      return;
    }

    if (plan.checkoutMode === 'disabled') {
      setActionError(t.homePlanNoCheckout);
      return;
    }

    setBusyPlanCode(plan.code);
    try {
      const response = await startBillingCheckout(plan.code as Exclude<PlanCode, 'free'>);
      if (response.url) {
        window.location.assign(response.url);
        return;
      }
      setActionError(t.homePlanCheckoutFailed);
    } catch (error) {
      const message = error instanceof BillingApiError && error.errorCode === 'billing_not_configured'
        ? t.homePlanNoCheckout
        : error instanceof BillingApiError
          ? error.message
          : t.homePlanCheckoutFailed;
      setActionError(message || t.homePlanCheckoutFailed);
    } finally {
      setBusyPlanCode(null);
    }
  };

  const modal = typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayFadeTransition}
            className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.98 }}
            transition={modalSpringTransition}
            role="dialog"
            aria-modal="true"
            aria-label={t.homePlanCatalogTitle}
            tabIndex={-1}
            dir={direction}
            className="motion-safe-surface fixed z-[61] flex max-h-[calc(100dvh-1.5rem)] w-[min(72rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[1.35rem] border border-glass bg-[var(--bg-elevated)] shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
            style={{
              top: 'max(calc(var(--safe-top, 0px) + 0.5rem), 0.75rem)',
              left: '0.5rem',
              right: '0.5rem',
              marginInline: 'auto',
            }}
          >
            <div className={`flex items-start justify-between gap-4 border-b border-glass px-5 py-4 sm:px-6 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{t.homePlanCatalogEyebrow}</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-primary sm:text-2xl">{t.homePlanCatalogTitle}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-secondary">{t.homePlanCatalogBody}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-secondary transition-colors hover:bg-surface-alpha hover:text-primary"
                aria-label={t.close}
              >
                <X size={18} variant="glyph" tone="neutral" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="grid gap-3 md:grid-cols-3">
                {([
                  { icon: Sparkles, tone: 'blue', title: t.homePlanStepChoose, body: t.homePlanStepChooseBody },
                  { icon: CreditCard, tone: 'amber', title: t.homePlanStepCheckout, body: t.homePlanStepCheckoutBody },
                  { icon: ShieldCheck, tone: 'green', title: t.homePlanStepActivate, body: t.homePlanStepActivateBody },
                ] as const).map((step) => {
                  const StepIcon = step.icon;
                  return (
                    <div key={step.title} className="rounded-2xl border border-glass bg-surface-alpha p-4">
                      <StepIcon className="mb-3" size={36} variant="tile" tone={step.tone} intensity="micro" />
                      <h3 className="text-sm font-bold text-primary">{step.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-secondary">{step.body}</p>
                    </div>
                  );
                })}
              </div>

              {actionError ? (
                <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/12 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {actionError}
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                {displayPlans.map((plan) => (
                  <PlanCard
                    key={plan.code}
                    plan={plan}
                    currentPlanCode={currentPlanCode}
                    recommended={plan.code === recommendedPlan.code && plan.code !== currentPlanCode}
                    busy={busyPlanCode === plan.code}
                    onChoose={handleChoosePlan}
                    t={t}
                    language={language}
                    locale={locale}
                  />
                ))}
              </div>

              <div className={`mt-5 flex flex-col gap-3 rounded-2xl border border-glass bg-surface-alpha p-4 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between ${isRtl ? 'sm:flex-row-reverse text-right' : ''}`}>
                <div className="flex items-start gap-2">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" variant="glyph" tone="green" />
                  <p>{t.homePlanTrustLine}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-bold text-secondary transition-colors hover:bg-[var(--bg-base)] hover:text-primary"
                >
                  {t.homePlanContinueFree}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  ) : null;

  if (showCompactPaidSurface) {
    return (
      <>
        <section
          data-testid="home-plan-growth-panel"
          className="mb-6 max-w-xl lg:max-w-6xl mx-auto w-full rounded-[1.2rem] border border-glass bg-[var(--bg-elevated)]/70 px-3 py-3 shadow-[var(--panel-elev-1)]"
          dir={direction}
        >
          <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${isRtl ? 'sm:flex-row-reverse text-right' : ''}`}>
            <div className={`flex min-w-0 items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <ShieldCheck className="shrink-0" size={34} variant="tile" tone="green" intensity="micro" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-primary">
                  {t.homePlanPaidTitle.replace('{plan}', formatPlanName(currentPlan, language))}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-secondary">
                  {t.homePlanPaidProof}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpen}
              data-testid="home-plan-open-catalog"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-glass bg-[var(--bg-base)]/70 px-3 text-sm font-bold text-primary transition-colors hover:bg-[var(--bg-base)]"
            >
              <Gauge size={16} variant="glyph" tone="blue" />
              {t.homePlanCompare}
            </button>
          </div>
        </section>
        {modal}
      </>
    );
  }

  return (
    <>
      <section
        data-testid="home-plan-growth-panel"
        className="mb-6 max-w-xl lg:max-w-6xl mx-auto w-full overflow-hidden rounded-[1.35rem] border border-blue-500/20 bg-[var(--bg-elevated)]/82 p-3 shadow-[var(--panel-elev-1)] sm:p-4"
        dir={direction}
      >
        <div className={`flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ${isRtl ? 'lg:flex-row-reverse' : ''}`}>
          <div className={`min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
            <div className={`mb-2 flex flex-wrap items-center gap-2 ${isRtl ? 'justify-end' : ''}`}>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                <Sparkles size={13} variant="glyph" tone="neutral" style={currentColorIconStyle} />
                {t.homePlanGrowthEyebrow}
              </span>
              <span className="rounded-full bg-[var(--bg-base)]/70 px-3 py-1 text-xs font-bold text-secondary">
                {t.homePlanMetricCurrent}: {formatPlanName(currentPlan, language)}
              </span>
              <span className="rounded-full bg-[var(--bg-base)]/70 px-3 py-1 text-xs font-bold text-secondary">
                {showUpgradeFraming ? `${t.homePlanRecommended}: ${formatPlanName(recommendedPlan, language)}` : t.homePlanPaidProof}
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-primary sm:text-xl">
              {(showUpgradeFraming ? t.homePlanGrowthTitle : t.homePlanPaidTitle)
                .replace('{plan}', formatPlanName(currentPlan, language))
                .replace('{recommendedPlan}', formatPlanName(recommendedPlan, language))}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-secondary">
              {(showUpgradeFraming ? t.homePlanGrowthBody : t.homePlanPaidBody)
                .replace('{plan}', formatPlanName(currentPlan, language))
                .replace('{recommendedPlan}', formatPlanName(recommendedPlan, language))}
            </p>
          </div>

          <div className={`flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap ${isRtl ? 'sm:justify-end' : ''}`}>
            <button
              type="button"
              onClick={onOpen}
              data-testid="home-plan-open-catalog"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-700"
            >
              <CreditCard size={17} variant="glyph" tone="neutral" style={currentColorIconStyle} />
              {t.homePlanViewOptions}
              <ArrowRight
                size={16}
                className={isRtl ? 'rotate-180' : ''}
                variant="glyph"
                tone="neutral"
                style={currentColorIconStyle}
              />
            </button>
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-glass bg-[var(--bg-base)]/70 px-4 text-sm font-bold text-primary transition-colors hover:bg-[var(--bg-base)]"
            >
              <Gauge size={17} variant="glyph" tone="blue" />
              {t.homePlanCompare}
            </button>
          </div>
        </div>
      </section>
      {modal}
    </>
  );
}
