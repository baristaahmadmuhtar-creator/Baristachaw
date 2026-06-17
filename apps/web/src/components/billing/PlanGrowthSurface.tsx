import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { ArrowRight, Check, CreditCard, Crown, Gauge, RefreshCw, ShieldCheck, Sparkles, X } from '../icons';
import type { AccountPlan, AccountStatusSnapshot, PlanCode } from '../../services/accountStatus';
import { BillingApiError, planDisplayName, startBillingCheckout, submitManualPaymentProof, type BillingManualInvoiceResponse } from '../../services/billing';
import { getCurrencyForRegion, PLAN_CATALOG, PRICING, formatCurrency } from '../../services/billingConfig';
import { useGlobalState } from '../../context/GlobalState';
import { modalSpringTransition, overlayFadeTransition } from '../../utils/motionPresets';
import { CustomSelect } from '../ui/CustomSelect';

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

function catalogFeatures(planCode: 'free' | 'starter' | 'pro' | 'team'): string[] {
  return PLAN_CATALOG.find((plan) => plan.code === planCode)?.features || [];
}

function getRegionName(region: string): string {
  switch (region) {
    case 'id': return 'Indonesia';
    case 'bn': return 'Brunei';
    case 'my': return 'Malaysia';
    case 'sg': return 'Singapore';
    case 'eu': return 'Europe';
    case 'au': return 'Australia';
    case 'us': return 'United States';
    default: return 'Global';
  }
}

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
  planCode,
  duration,
  region,
  currentPlanCode,
  recommended,
  busy,
  onChoose,
  t,
  language,
  locale,
}: {
  planCode: 'free' | 'starter' | 'pro' | 'team';
  duration: 'monthly' | 'quarterly' | 'yearly';
  region: any;
  currentPlanCode: PlanCode;
  recommended: boolean;
  busy: boolean;
  onChoose: (planCode: string) => void;
  t: Record<string, string>;
  language: string;
  locale: string;
}) {
  const active = currentPlanCode === planCode;
  const isFree = planCode === 'free';
  const currency = getCurrencyForRegion(region);

  const getPlanDetails = () => {
    switch (planCode) {
      case 'free': return {
        name: t.homePlanNameFree || 'Gratis',
        badge: t.homePlanBadgeFree || 'Basic',
        priceLabel: t.homePlanFreePrice || 'Free',
        periodLabel: t.homePlanFreePeriod || 'Forever',
        features: catalogFeatures('free'),
        ctaLabel: t.homePlanContinueFree || 'Continue Free',
        style: 'border-glass bg-surface-alpha'
      };
      case 'starter': {
        const tier = PRICING.starter[duration];
        return {
          name: t.homePlanNameStarter || 'Starter',
          badge: t.homePlanBadgeStarter || 'Popular',
          priceOriginal: formatCurrency(tier.original[currency], currency),
          priceMain: formatCurrency(tier.discounted[currency], currency),
          discountPct: tier.discountPct,
          saveLabel: tier.saveLabel[language as keyof typeof tier.saveLabel] || tier.saveLabel.en,
          features: catalogFeatures('starter'),
          ctaLabel: active ? t.homePlanActive : t.homePlanSelect.replace('{plan}', 'Starter'),
          style: recommended ? 'border-blue-500/45 bg-blue-50/10 dark:bg-blue-900/10 shadow-[0_18px_45px_rgba(37,99,235,0.18)]' : 'border-glass bg-surface-alpha'
        };
      }
      case 'pro': {
        const tier = PRICING.pro[duration];
        return {
          name: t.homePlanNamePro || 'Barista Pro',
          badge: t.homePlanBadgePro || 'Premium',
          priceOriginal: formatCurrency(tier.original[currency], currency),
          priceMain: formatCurrency(tier.discounted[currency], currency),
          discountPct: tier.discountPct,
          saveLabel: tier.saveLabel[language as keyof typeof tier.saveLabel] || tier.saveLabel.en,
          features: catalogFeatures('pro'),
          ctaLabel: active ? t.homePlanActive : t.homePlanSelect.replace('{plan}', 'Pro'),
          style: 'border-purple-500/30 bg-slate-900 shadow-[0_18px_45px_rgba(168,85,247,0.18)]'
        };
      }
      case 'team': return {
        name: t.homePlanNameTeam || 'Team',
        badge: t.homePlanBadgeTeam || 'For Cafes',
        priceLabel: t.homePlanTeamPrice || 'Custom',
        periodLabel: t.homePlanTeamPeriod || 'Billing',
        features: catalogFeatures('team'),
        ctaLabel: active ? t.homePlanActive : t.homePlanSelect.replace('{plan}', 'Team'),
        style: 'border-glass bg-slate-50 dark:bg-slate-800'
      };
    }
  };

  const details = getPlanDetails();
  const isDark = planCode === 'pro';

  return (
    <article
      data-testid={`plan-card-${planCode}`}
      className={`relative flex min-h-[18rem] flex-col rounded-[20px] border p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${details.style} ${isDark ? 'text-white' : 'text-primary'}`}
    >
      {planCode === 'starter' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-br from-amber-400 to-amber-500 px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest text-black shadow-md">
          {t.homePlanBestValue || 'Best Value'}
        </div>
      )}

      <span className={`text-[11px] font-extrabold uppercase tracking-widest ${isDark ? 'text-purple-300' : 'text-blue-600 dark:text-blue-400'}`}>
        {details.badge}
      </span>
      <h3 className="mb-4 mt-2 text-2xl font-bold tracking-tight">
        {details.name}
      </h3>

      <div className="mb-4 flex min-h-[56px] flex-wrap items-baseline gap-1.5">
        {'priceOriginal' in details && details.discountPct! > 0 && (
          <span className={`w-full text-sm font-semibold line-through ${isDark ? 'text-white/40' : 'text-secondary/60'}`}>
            {details.priceOriginal}
          </span>
        )}
        <strong className="text-[28px] font-extrabold tracking-tight">
          {'priceMain' in details ? details.priceMain : details.priceLabel}
        </strong>
        <span className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-secondary'}`}>
          {'priceMain' in details ? `/ ${duration === 'monthly' ? 'mo' : duration === 'quarterly' ? '3mo' : 'yr'}` : details.periodLabel}
        </span>
      </div>

      {'discountPct' in details && details.discountPct! > 0 && (
        <div className={`mb-4 w-fit rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide text-white shadow-sm ${isDark ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'}`}>
          {details.saveLabel}
        </div>
      )}

      <ul className={`mb-6 mt-2 flex flex-1 flex-col gap-3 text-sm ${isDark ? 'text-white/70' : 'text-secondary'}`}>
        {details.features.map((feature: string, idx: number) => (
          <li key={idx} className="flex items-start gap-2">
            <Check size={16} className={`mt-0.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-blue-500'}`} variant="glyph" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onChoose(planCode)}
        disabled={busy || active}
        className={`mt-auto inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-1.5 px-5 text-sm font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
          isDark 
            ? 'border-transparent bg-gradient-to-br from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30 hover:from-purple-700 hover:to-purple-600' 
            : planCode === 'starter'
              ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700'
              : 'border-blue-600 bg-transparent text-blue-600 hover:bg-blue-600 hover:text-white'
        }`}
      >
        {busy ? <RefreshCw size={16} className="animate-spin" variant="glyph" /> : null}
        {details.ctaLabel}
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
  const [busyPlanCode, setBusyPlanCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [duration, setDuration] = useState<'monthly' | 'quarterly' | 'yearly'>('quarterly');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [manualInvoice, setManualInvoice] = useState<BillingManualInvoiceResponse | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('barista_manual_checkout_state');
        if (saved) return JSON.parse(saved).manualInvoice || null;
      } catch (e) {}
    }
    return null;
  });
  const [manualProofFile, setManualProofFile] = useState<File | null>(null);
  const [manualProofStatus, setManualProofStatus] = useState<'idle' | 'submitting' | 'submitted'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('barista_manual_checkout_state');
        if (saved) return JSON.parse(saved).manualProofStatus || 'idle';
      } catch (e) {}
    }
    return 'idle';
  });
  const [manualProofDelivery, setManualProofDelivery] = useState<'direct_upload' | 'manual_support' | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('barista_manual_checkout_state');
        if (saved) return JSON.parse(saved).manualProofDelivery || null;
      } catch (e) {}
    }
    return null;
  });
  const [checkoutStep, setCheckoutStep] = useState<'choose' | 'checkout' | 'success'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('barista_manual_checkout_state');
        if (saved) return JSON.parse(saved).checkoutStep || 'choose';
      } catch (e) {}
    }
    return 'choose';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (checkoutStep === 'success' || checkoutStep === 'checkout') {
      localStorage.setItem('barista_manual_checkout_state', JSON.stringify({
        manualInvoice,
        manualProofStatus,
        manualProofDelivery,
        checkoutStep,
      }));
    } else {
      localStorage.removeItem('barista_manual_checkout_state');
    }
  }, [checkoutStep, manualInvoice, manualProofStatus, manualProofDelivery]);
  
  const modalRef = useRef<HTMLDivElement | null>(null);
  const isRtl = direction === 'rtl';

  const { region, setRegion } = useGlobalState();

  const displayPlans = useMemo(() => snapshot ? resolveDisplayPlans(snapshot) : [], [snapshot]);
  const recommendedPlan = useMemo(() => snapshot ? resolveRecommendedPlan(snapshot) : null, [snapshot]);
  const currentPlanCode = snapshot?.user.planCode || snapshot?.plan.code || 'free';
  const currentPlan = displayPlans.find((plan) => plan.code === currentPlanCode) || snapshot?.plan || null;
  const showUpgradeFraming = currentPlanCode === 'free' || snapshot?.recommendedUpgrade.action === 'checkout';
  const showCompactPaidSurface = !showUpgradeFraming;
  const hasActivePaidPlan = currentPlanCode !== 'free';

  useEffect(() => {
    if (!isOpen) return;
    setActionError('');
    if (manualProofStatus === 'submitted') {
      setCheckoutStep('success');
    } else {
      setManualProofStatus('idle');
      setCheckoutStep(manualInvoice ? 'checkout' : 'choose');
    }
    const timer = window.setTimeout(() => modalRef.current?.focus(), 30);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, manualInvoice, onClose]);

  useEffect(() => {
    if (isOpen) return;
    setActionError('');
    if (manualProofStatus !== 'submitted') {
      setManualInvoice(null);
      setManualProofFile(null);
      setManualProofStatus('idle');
      setManualProofDelivery(null);
      setCheckoutStep('choose');
    }
  }, [isOpen, manualProofStatus]);

  if (!snapshot || !recommendedPlan || !currentPlan) return null;

  const handleChoosePlan = async (planCode: string) => {
    setActionError('');
    setManualInvoice(null);
    setManualProofFile(null);
    setManualProofStatus('idle');
    setManualProofDelivery(null);
    setCheckoutStep('choose');
    if (planCode === 'free') {
      onClose();
      return;
    }

    setBusyPlanCode(planCode);
    try {
      const currency = getCurrencyForRegion(region);
      const response = await startBillingCheckout(planCode as Exclude<PlanCode, 'free'>, {
        duration,
        currency,
        ...(promoApplied && promoCode.trim() ? { promoCode: promoCode.trim() } : {}),
      });
      if (response.mode === 'redirect' && response.url) {
        window.location.assign(response.url);
        return;
      }
      if (response.mode === 'manual_invoice') {
        setManualInvoice(response);
        setCheckoutStep('checkout');
        return;
      }
      setActionError(t.homePlanCheckoutFailed || 'Checkout failed');
    } catch (error) {
      setActionError(t.homePlanCheckoutFailed || 'Checkout failed');
    } finally {
      setBusyPlanCode(null);
    }
  };

  const handleProofSubmit = async () => {
    if (!manualInvoice || !manualProofFile) return;
    setActionError('');
    setManualProofStatus('submitting');
    try {
      const proofResponse = await submitManualPaymentProof({
        requestId: manualInvoice.paymentRequestId,
        mimeType: manualProofFile.type,
        sizeBytes: manualProofFile.size,
      });
      if (proofResponse.uploadUrl) {
        const uploadResponse = await fetch(proofResponse.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': manualProofFile.type },
          body: manualProofFile,
        });
        if (!uploadResponse.ok) {
          const supportUrl = proofResponse.supportLinks?.whatsappUrl || manualInvoice.manualInvoice.instructions.whatsappUrl;
          if (supportUrl) window.open(supportUrl, '_blank', 'noopener,noreferrer');
          setActionError('Upload otomatis belum berhasil. Invoice tetap masuk antrean admin; kirim file bukti lewat WhatsApp/Instagram dengan ID invoice.');
          setManualProofDelivery('manual_support');
          setManualProofStatus('submitted');
          setCheckoutStep('success');
          return;
        }
      } else {
        const supportUrl = proofResponse.supportLinks?.whatsappUrl || manualInvoice.manualInvoice.instructions.whatsappUrl;
        if (supportUrl) window.open(supportUrl, '_blank', 'noopener,noreferrer');
      }
      setManualProofDelivery(proofResponse.deliveryMode);
      setManualProofStatus('submitted');
      setCheckoutStep('success');
    } catch (error) {
      const message = error instanceof BillingApiError
        ? `${error.message}${error.details ? `: ${error.details}` : ''}`
        : (t.homePlanCheckoutFailed || 'Checkout failed');
      setActionError(message);
      setManualProofStatus('idle');
    }
  };

  const copyManualAccount = async () => {
    if (!manualInvoice) return;
    const { bankName, accountName, accountNumber } = manualInvoice.manualInvoice.instructions;
    const text = `${bankName}\n${accountName}\n${accountNumber}`;
    await navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  const handlePromoApply = () => {
    if (promoCode.trim().length >= 4) {
      setPromoApplied(true);
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
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                  {checkoutStep === 'choose' ? t.homePlanCatalogEyebrow : checkoutStep === 'success' ? 'Berhasil' : 'Checkout'}
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-primary sm:text-2xl">
                  {checkoutStep === 'choose' ? t.homePlanCatalogTitle : checkoutStep === 'success' ? 'Menunggu Peninjauan' : 'Selesaikan Pembayaran'}
                </h2>
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

            <div className="overflow-y-auto px-5 py-6 sm:px-6" style={{ WebkitOverflowScrolling: 'touch' }}>
              
              {checkoutStep === 'choose' && !hasActivePaidPlan ? (
                <div className="mx-auto mb-8 flex w-fit justify-center gap-1 rounded-full bg-surface-alpha p-1 border border-glass shadow-sm">
                  {(['monthly', 'quarterly', 'yearly'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                        duration === d
                          ? 'bg-blue-600 text-white shadow-[0_6px_20px_rgba(37,99,235,0.35)]'
                          : 'text-secondary hover:text-primary'
                      }`}
                    >
                      {d === 'monthly' ? '1 Month' : d === 'quarterly' ? '3 Months' : '1 Year'}
                      {d === 'yearly' && (
                        <span className="inline-block animate-[chipPulse_2s_ease-in-out_infinite] rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-black">
                          BEST
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : null}

              {actionError ? (
                <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/12 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {actionError}
                </div>
              ) : null}

              {checkoutStep === 'checkout' && manualInvoice ? (
                <div className="mb-6 rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4 text-sm text-primary">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                        Step 2 dari 3
                      </p>
                      <h3 className="mt-1 text-lg font-black tracking-tight">
                        {manualInvoice.manualInvoice.amountLabel} for {planDisplayName(manualInvoice.planCode)}
                      </h3>
                      <p className="mt-1 max-w-2xl text-secondary">
                        Transfer manually, attach proof, then wait for admin verification. Paid entitlement is not active until this payment is marked verified paid.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-amber-500/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                      {manualInvoice.manualInvoice.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setManualInvoice(null);
                      setManualProofFile(null);
                      setManualProofStatus('idle');
                      setCheckoutStep('choose');
                    }}
                    className="mt-4 inline-flex min-h-9 items-center justify-center rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-sm font-bold text-primary transition-colors hover:bg-surface-alpha"
                  >
                    Back to plans
                  </button>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="rounded-xl border border-glass bg-[var(--bg-base)]/70 p-3">
                      <dl className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-secondary">Bank</dt>
                          <dd className="mt-1 font-bold">{manualInvoice.manualInvoice.instructions.bankName}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-secondary">Account name</dt>
                          <dd className="mt-1 font-bold">{manualInvoice.manualInvoice.instructions.accountName}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-secondary">Account number</dt>
                          <dd className="mt-1 font-mono text-base font-black">{manualInvoice.manualInvoice.instructions.accountNumber}</dd>
                        </div>
                      </dl>
                    </div>
                    <button
                      type="button"
                      onClick={copyManualAccount}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-600 bg-blue-600 px-4 font-extrabold text-white transition-colors hover:bg-blue-700"
                    >
                      Copy account
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-secondary">Upload proof</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0] || null;
                          const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
                          if (file && !allowedTypes.includes(file.type)) {
                            setActionError('Format bukti transfer harus JPG, PNG, WebP, atau PDF.');
                            setManualProofFile(null);
                            setManualProofStatus('idle');
                            setManualProofDelivery(null);
                            return;
                          }
                          if (file && file.size > 5 * 1024 * 1024) {
                            setActionError('Ukuran bukti transfer maksimal adalah 5MB.');
                            setManualProofFile(null);
                            setManualProofStatus('idle');
                            setManualProofDelivery(null);
                            return;
                          }
                          setActionError('');
                          setManualProofFile(file);
                          setManualProofStatus('idle');
                          setManualProofDelivery(null);
                        }}
                        className="mt-1 block w-full rounded-xl border border-glass bg-[var(--bg-base)]/70 px-3 py-2 text-sm font-semibold text-primary file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white"
                      />
                    </label>
                    {manualInvoice.manualInvoice.instructions.whatsappUrl ? (
                      <a
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-glass bg-[var(--bg-base)] px-4 font-bold text-primary transition-colors hover:bg-surface-alpha"
                        href={manualInvoice.manualInvoice.instructions.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open WhatsApp
                      </a>
                    ) : null}
                    {manualInvoice.manualInvoice.instructions.instagramUrl ? (
                      <a
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-glass bg-[var(--bg-base)] px-4 font-bold text-primary transition-colors hover:bg-surface-alpha"
                        href={manualInvoice.manualInvoice.instructions.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Instagram CS
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleProofSubmit}
                      disabled={!manualProofFile || manualProofStatus === 'submitting' || manualProofStatus === 'submitted'}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 font-extrabold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {manualProofStatus === 'submitting' ? 'Submitting...' : 'Kirim Bukti & Tunggu Review'}
                    </button>
                  </div>
                </div>
              ) : null}

              {checkoutStep === 'success' ? (
                <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-center text-primary">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500/10 text-emerald-600">
                    <Check size={28} />
                  </div>
                  <h3 className="mt-4 text-xl font-black">Bukti Diterima - Menunggu Review</h3>
                  <p className="mt-2 text-sm leading-6 text-secondary">
                    {manualProofDelivery === 'manual_support'
                      ? 'Invoice sudah masuk antrean admin. Kirim file bukti lewat WhatsApp atau Instagram dengan ID invoice agar review lebih cepat.'
                      : 'Admin sedang memverifikasi transaksi Anda. Harap tunggu hingga proses review selesai sebelum plan aktif.'}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 font-extrabold text-white transition-colors hover:bg-blue-700"
                  >
                    Tutup
                  </button>
                </div>
              ) : null}

              {checkoutStep === 'choose' ? (
                hasActivePaidPlan ? (
                  <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-blue-500/25 bg-blue-500/10 p-5 text-center text-primary shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-500/10 text-blue-600">
                      <ShieldCheck size={28} />
                    </div>
                    <h3 className="mt-4 text-xl font-black">Paket Anda Sedang Aktif</h3>
                    <p className="mt-2 text-sm leading-6 text-secondary">
                      Anda saat ini berlangganan paket <strong className="text-primary">{planDisplayName(currentPlanCode)}</strong>. Untuk menghindari tumpang tindih tagihan, fitur penggantian paket dikunci sementara. Silakan tunggu hingga siklus tagihan Anda berakhir untuk mengganti, memperbarui, atau beralih ke paket lain.
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-6 font-extrabold text-white transition-colors hover:bg-blue-700 shadow-md"
                    >
                      Kembali
                    </button>
                  </div>
                ) : (
                <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {(['free', 'starter', 'pro', 'team'] as const).map((code) => (
                  <PlanCard
                    key={code}
                    planCode={code}
                    duration={duration}
                    region={region}
                    currentPlanCode={currentPlanCode}
                    recommended={code === recommendedPlan.code && code !== currentPlanCode}
                    busy={busyPlanCode === code}
                    onChoose={handleChoosePlan}
                    t={t}
                    language={language}
                    locale={locale}
                  />
                ))}
              </div>

              {/* Promo Code Section */}
              <div className="mt-10 flex flex-col items-center gap-3 border-t border-glass pt-8">
                <p className="text-sm font-semibold text-secondary">Have a promo code?</p>
                <div className="flex w-full max-w-[380px] overflow-hidden rounded-xl border-1.5 border-glass transition-colors focus-within:border-blue-500">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); }}
                    className="flex-1 bg-[var(--bg-base)] px-4 py-3 text-sm font-bold tracking-widest text-primary outline-none"
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={handlePromoApply}
                    disabled={promoCode.trim().length < 4}
                    className="bg-blue-600 px-5 text-sm font-extrabold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                  >
                    {promoApplied ? 'Applied' : 'Apply'}
                  </button>
                </div>
                {promoApplied && (
                  <p className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check size={14} variant="glyph" /> Code accepted
                  </p>
                )}
              </div>
                </>
                )
              ) : null}

              {/* Region Selector */}
              <div className="mt-8 flex justify-end">
                <div className="w-44">
                  <CustomSelect
                    value={region}
                    onChange={(val) => setRegion(val as any)}
                    position="top"
                    options={[
                      { value: 'id', label: 'Indonesia' },
                      { value: 'bn', label: 'Brunei' },
                      { value: 'my', label: 'Malaysia' },
                      { value: 'sg', label: 'Singapore' },
                      { value: 'au', label: 'Australia' },
                      { value: 'eu', label: 'Europe' },
                      { value: 'us', label: 'United States' },
                      { value: 'global', label: 'Global' }
                    ]}
                  />
                </div>
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
            {!showUpgradeFraming && t.homePlanPaidBody ? (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-secondary">
                {t.homePlanPaidBody
                  .replace('{plan}', formatPlanName(currentPlan, language))
                  .replace('{recommendedPlan}', formatPlanName(recommendedPlan, language))}
              </p>
            ) : null}
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
