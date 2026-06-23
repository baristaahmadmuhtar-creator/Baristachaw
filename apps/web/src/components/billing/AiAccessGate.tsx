import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  CreditCard, LogIn, RefreshCcw, ShieldCheck, Sparkles, X,
  ArrowRight, Check, UploadCloud, ArrowLeft, MessageCircle, Instagram
} from 'lucide-react';
import { useAccountStatus } from '../../context/AccountStatusContext';
import { useAuthModal } from '../../context/AuthModalContext';
import { useGlobalState } from '../../context/GlobalState';
import {
  BillingApiError,
  startBillingCheckout,
  submitManualPaymentProof,
  type BillingManualInvoiceResponse,
  type BillingDuration,
} from '../../services/billing';
import type { AccountPlan, PlanCode } from '../../services/accountStatus';
import { getCurrencyForRegion, formatCurrency } from '../../services/billingConfig';
import {
  BILLING_PENDING_STORAGE_KEY,
  buildPendingManualPaymentMarker,
  getMvpUpgradeOptions,
  parsePendingManualPaymentMarker,
  shouldBlockDuplicateManualPayment,
  type MvpPaidPlanCode,
} from '@baristachaw/shared/billingFlow';
import { modalSpringTransition, overlayFadeTransition } from '../../utils/motionPresets';
import { useDynamicPricing } from '../../hooks/useDynamicPricing';

export type AiPaidFeature = 'chat' | 'scanner' | 'search' | 'brew';
type ManualInvoiceBank = NonNullable<BillingManualInvoiceResponse['manualInvoice']['instructions']['banks']>[number];

type GateMode = 'login' | 'upgrade' | 'checking';
type CheckoutStep = 'pilih' | 'checkout' | 'success' | 'pending';

type GateState = {
  mode: GateMode;
  source: string;
};

const PAID_PLAN_PRIORITY: PlanCode[] = ['starter', 'pro', 'team', 'enterprise'];

function readPendingManualPaymentMarkerRaw(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(BILLING_PENDING_STORAGE_KEY);
  } catch {
    return null;
  }
}

function formatText(template: string | undefined | null, replacements: Record<string, string | number>) {
  if (!template) return '';
  return Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function normalizePlanCode(value: unknown): PlanCode | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'free' || normalized === 'starter' || normalized === 'pro' || normalized === 'team' || normalized === 'enterprise') {
    return normalized;
  }
  return null;
}

function isPaidPlanCode(value: PlanCode | null | undefined): value is Exclude<PlanCode, 'free'> {
  return Boolean(value && value !== 'free');
}

function readPendingManualPaymentMarker(): boolean {
  const raw = readPendingManualPaymentMarkerRaw();
  try {
    if (!raw) return false;
    const marker = parsePendingManualPaymentMarker(raw);
    if (!marker) {
      window.localStorage.removeItem(BILLING_PENDING_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function writePendingManualPaymentMarker(paymentRequestId: string, planCode: string): void {
  if (typeof window === 'undefined') return;
  try {
    const marker = buildPendingManualPaymentMarker(paymentRequestId, planCode);
    if (marker) window.localStorage.setItem(BILLING_PENDING_STORAGE_KEY, JSON.stringify(marker));
  } catch {
    // Non-critical; server account status is the cross-device source of truth.
  }
}

function findMinimumPaidPlan(plans: AccountPlan[] | undefined): AccountPlan | null {
  const paidPlans = (plans || []).filter((plan) => plan.code !== 'free');
  const starter = paidPlans.find((plan) => plan.code === 'starter');
  if (starter) return starter;
  const sorted = paidPlans.slice().sort((a, b) => {
    const aPrice = Number.isFinite(a.priceMonthlyUsd) && a.priceMonthlyUsd > 0 ? a.priceMonthlyUsd : Number.POSITIVE_INFINITY;
    const bPrice = Number.isFinite(b.priceMonthlyUsd) && b.priceMonthlyUsd > 0 ? b.priceMonthlyUsd : Number.POSITIVE_INFINITY;
    if (aPrice !== bPrice) return aPrice - bPrice;
    return PAID_PLAN_PRIORITY.indexOf(a.code) - PAID_PLAN_PRIORITY.indexOf(b.code);
  });
  return sorted[0] || null;
}

function FeatureIcon({ mode }: { mode: GateMode }) {
  if (mode === 'login') return <LogIn size={20} />;
  if (mode === 'checking') return <RefreshCcw size={20} />;
  return <Sparkles size={20} />;
}

function AiAccessGateDialog({
  state,
  title,
  body,
  plan,
  t,
  checkoutBusy,
  checkoutError,
  manualInvoice,
  manualProofFile,
  manualProofStatus,
  manualProofDelivery,
  refreshBusy,
  onClose,
  onSignin,
  onUpgrade,
  onRefresh,
  onManualProofFileChange,
  onManualProofSubmit,
  onCopyManualAccount,
  step,
  setStep,
  selectedPlan,
  setSelectedPlan,
  selectedDuration,
  setSelectedDuration,
  effectivePlanCode,
  isPastDue,
  manageUrl,
  isRenewal,
}: {
  state: GateState;
  title: string;
  body: string;
  plan: AccountPlan | null;
  t: Record<string, string>;
  checkoutBusy: boolean;
  checkoutError: string;
  manualInvoice: BillingManualInvoiceResponse | null;
  manualProofFile: File | null;
  manualProofStatus: 'idle' | 'submitting' | 'submitted';
  manualProofDelivery: 'direct_upload' | 'manual_support' | null;
  refreshBusy: boolean;
  onClose: () => void;
  onSignin: () => void;
  onUpgrade: (planCode: MvpPaidPlanCode, duration: BillingDuration, promoCode?: string) => void;
  effectivePlanCode: PlanCode | null;
  onRefresh: () => void | Promise<void>;
  onManualProofFileChange: (file: File | null) => void;
  onManualProofSubmit: () => void | Promise<void>;
  onCopyManualAccount: (accountNum?: string) => void | Promise<void>;
  step: CheckoutStep;
  setStep: (s: CheckoutStep) => void;
  selectedPlan: MvpPaidPlanCode;
  setSelectedPlan: (p: MvpPaidPlanCode) => void;
  selectedDuration: BillingDuration;
  setSelectedDuration: (d: BillingDuration) => void;
  isPastDue?: boolean;
  manageUrl?: string;
  isRenewal?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const isUpgrade = state.mode === 'upgrade';
  
  const { region } = useGlobalState();
  const currency = getCurrencyForRegion(region);
  const { getPrice, isLoading: isPriceLoading } = useDynamicPricing();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copiedBankIndex, setCopiedBankIndex] = useState<number | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const availablePlans = useMemo(() => getMvpUpgradeOptions(effectivePlanCode || 'free'), [effectivePlanCode]);

  useEffect(() => {
    if (availablePlans.length > 0 && !availablePlans.includes(selectedPlan)) {
      setSelectedPlan(availablePlans[0]);
    }
  }, [availablePlans, selectedPlan, setSelectedPlan]);

  const planDisplayNames = {
    starter: t.billingPlanNameStarter || 'Barista Starter',
    pro: t.billingPlanNamePro || 'Barista Pro',
  };

  const getPriceDisplay = (p = selectedPlan, d = selectedDuration): string => {
    const basePrice = getPrice(p, d, currency);
    let finalPrice = basePrice;
    
    if (effectivePlanCode && effectivePlanCode === 'starter' && p === 'pro') {
      const currentPrice = effectivePlanCode === 'starter' || effectivePlanCode === 'pro'
        ? getPrice(effectivePlanCode as 'starter'|'pro', d, currency)
        : 0;
      finalPrice = Math.max(0, basePrice - currentPrice);
    }
    return formatCurrency(finalPrice, currency);
  };

  const durationLabels: Record<BillingDuration, string> = {
    monthly: t.billingDurationMonthly || '1 Month',
    quarterly: t.billingDurationQuarterly || '3 Months',
    yearly: t.billingDurationYearly || '1 Year',
  };

  const supportWhatsappUrl = manualInvoice?.manualInvoice?.instructions?.whatsappUrl || `https://wa.me/6738270092?text=${encodeURIComponent(t.billingContactSupport || 'Halo Baristachaw, saya ingin menanyakan tentang keanggotaan.')}`;
  const supportWhatsappNumber = manualInvoice?.manualInvoice?.instructions?.whatsappNumber || "+6738270092";
  const supportInstagramUrl = manualInvoice?.manualInvoice?.instructions?.instagramUrl || "https://instagram.com/baristachaw";
  const supportInstagramHandle = manualInvoice?.manualInvoice?.instructions?.instagramHandle || "@baristachaw";

  const renderSupportLinks = () => (
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      <a
        href={supportWhatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="motion-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 font-bold text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300"
        aria-label={`Hubungi WhatsApp ${supportWhatsappNumber}`}
      >
        <MessageCircle size={16} />
        WhatsApp
      </a>
      <a
        href={supportInstagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="motion-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 font-bold text-fuchsia-700 transition-colors hover:bg-fuchsia-500/15 dark:text-fuchsia-300"
        aria-label={`Hubungi Instagram ${supportInstagramHandle}`}
      >
        <Instagram size={16} />
        Instagram
      </a>
    </div>
  );

  const handleCopyBankDetail = (accountNum: string, idx: number) => {
    onCopyManualAccount(accountNum);
    setCopiedBankIndex(idx);
    setTimeout(() => setCopiedBankIndex(null), 2000);
  };

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 40);
    return () => {
      window.clearTimeout(timer);
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!dialogRef.current) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusableElements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === dialogRef.current) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={overlayFadeTransition}
      className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.97 }}
        transition={modalSpringTransition}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        data-testid="ai-access-gate-modal"
        className="motion-safe-surface relative w-full max-w-md rounded-[1.75rem] border border-glass bg-[var(--bg-elevated)]/95 backdrop-blur-2xl p-5 text-primary shadow-[0_26px_80px_rgba(0,0,0,0.55)] outline-none"
        style={{
          maxHeight: 'min(90vh, 40rem)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Pending manual payment: no plan switching or duplicate proof submission. */}
        {step === 'pending' && (
          <div className="flex flex-col gap-4 p-1 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500">
              <ShieldCheck size={28} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-500">
                {t.billingPendingAdminReview || 'Menunggu review admin'}
              </p>
              <h2 className="mt-1 text-xl font-black leading-tight text-primary">
                {t.billingProofUnderReview || 'Bukti pembayaran sedang diperiksa'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-secondary">
                {t.billingProofUnderReviewBody || 'Bukti transfer Anda sudah masuk antrean review. Jangan kirim ulang bukti atau membuat invoice baru kecuali diminta oleh support.'}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-left text-xs leading-5 text-amber-700 dark:text-amber-200">
              {t.billingPlanActiveAfterReview || 'Plan akan aktif setelah admin memverifikasi pembayaran. Jika sudah transfer dan butuh bantuan cepat, hubungi customer service.'}
            </div>
            {checkoutError ? (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {checkoutError}
              </div>
            ) : null}
            <div className="grid gap-2">
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshBusy}
                aria-busy={refreshBusy}
                className="motion-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-600 disabled:opacity-70"
              >
                <RefreshCcw size={16} className={refreshBusy ? 'animate-spin' : undefined} />
                {t.billingSyncStatus || 'Sinkronkan status'}
              </button>
              {renderSupportLinks()}
              <button
                type="button"
                onClick={onClose}
                className="motion-pressable inline-flex min-h-12 items-center justify-center rounded-2xl border border-glass bg-surface-alpha px-4 text-sm font-semibold text-primary transition-colors hover:bg-surface-alpha-hover"
              >
                {t.billingGotIt || 'Mengerti'}
              </button>
            </div>
          </div>
        )}

        {/* Step 1: PILIH PLAN */}
        {step === 'pilih' && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-500">
                  {isUpgrade ? t.aiGatePlanBadge : t.signInRequired}
                </p>
                <h2 className="mt-1 text-xl font-bold leading-tight text-primary">{t.billingChoosePlan || 'Pilih Plan Keanggotaan'}</h2>
                <p className="text-xs text-secondary mt-1">{t.billingStep1 || 'Step 1 dari 3: Pilih paket terbaik Anda'}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-alpha hover:text-primary"
                aria-label={t.close}
              >
                <X size={17} />
              </button>
            </div>

            {state.mode !== 'upgrade' && (
              <p className="mt-3 text-sm leading-6 text-secondary">{body}</p>
            )}

            {state.mode === 'login' ? (
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={onSignin}
                  className="motion-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-600"
                >
                  <LogIn size={16} />
                  {t.aiGateSigninCta}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="motion-pressable inline-flex min-h-12 items-center justify-center rounded-2xl border border-glass bg-surface-alpha px-4 text-sm font-semibold text-primary transition-colors hover:bg-surface-alpha-hover"
                >
                  {t.aiGateLaterCta}
                </button>
              </div>
            ) : state.mode === 'checking' ? (
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshBusy}
                  aria-busy={refreshBusy}
                  className="motion-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-600 disabled:opacity-70"
                >
                  <RefreshCcw size={16} className={refreshBusy ? 'animate-spin' : undefined} />
                  {t.aiGateRetryPlan}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="motion-pressable inline-flex min-h-12 items-center justify-center rounded-2xl border border-glass bg-surface-alpha px-4 text-sm font-semibold text-primary transition-colors hover:bg-surface-alpha-hover"
                >
                  {t.aiGateLaterCta}
                </button>
              </div>
            ) : (
              <>
                {/* Duration select tabs */}
                <div className="mt-5 flex rounded-xl border border-glass bg-surface-alpha p-1">
                  {(['monthly', 'quarterly', 'yearly'] as BillingDuration[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDuration(d)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center"
                      style={{
                        background: selectedDuration === d ? '#3b82f6' : 'transparent',
                        color: selectedDuration === d ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      {durationLabels[d]}
                    </button>
                  ))}
                </div>

                {/* Plan Selection list */}
                <div className="mt-4 grid gap-3">
                  {(availablePlans.length ? availablePlans : [selectedPlan]).map((p) => {
                    const isSelected = selectedPlan === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPlan(p)}
                        aria-pressed={isSelected}
                        data-testid={`ai-gate-plan-option-${p}`}
                        className={`flex w-full items-start justify-between rounded-2xl border p-4 text-left transition-all hover:bg-surface-alpha-hover ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-glass bg-surface-alpha'}`}
                      >
                        <div className="text-left flex-1 min-w-0 pr-3">
                          <p className="font-bold text-primary text-sm">
                            {planDisplayNames[p]}
                          </p>
                          <p className="text-xs text-secondary mt-1 leading-relaxed">
                            {p === 'starter'
                              ? t.billingPlanDescStarter || 'Guided AI tools, log brew, scanner history'
                              : t.billingPlanDescPro || 'AI Coach, latte art, scan analysis, Deep mode'}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end shrink-0 justify-center">
                          <span className="font-extrabold text-blue-600 text-base dark:text-blue-300">
                            {getPriceDisplay(p, selectedDuration)}
                          </span>
                          <span className="text-xs text-tertiary mt-0.5">
                            /{selectedDuration === 'monthly' ? 'mo' : selectedDuration === 'quarterly' ? '3mo' : 'yr'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-col items-center gap-3 border-t border-glass pt-4">
                  <p className="text-xs font-semibold text-secondary">{t.billingHavePromoCode || 'Have a promo code?'}</p>
                  <div className="flex w-full overflow-hidden rounded-xl border border-glass transition-colors focus-within:border-blue-500">
                    <input
                      type="text"
                      placeholder={t.billingEnterPromoCode || 'Enter code'}
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); }}
                      className="flex-1 bg-surface-alpha px-3 py-2 text-sm font-bold tracking-widest text-primary outline-none"
                      maxLength={20}
                    />
                    <button
                      type="button"
                      onClick={() => { if (promoCode.trim().length >= 4) setPromoApplied(true); }}
                      disabled={promoCode.trim().length < 4}
                      className="bg-blue-600 px-4 text-xs font-extrabold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                    >
                      {promoApplied ? (t.billingPromoApplied || 'Applied') : (t.billingApplyPromo || 'Apply')}
                    </button>
                  </div>
                  {promoApplied && (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Check size={12} /> {t.billingPromoCodeAccepted || 'Code accepted'}
                    </p>
                  )}
                </div>

                {checkoutError ? (
                  <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    {checkoutError}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
                  {isPastDue ? (
                    <a
                      href={manageUrl || supportWhatsappUrl}
                      target={manageUrl ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                      className="motion-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(217,119,6,0.25)] transition-colors hover:bg-amber-700"
                    >
                      {t.billingCompletePayment || 'Selesaikan Pembayaran'}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpgrade(selectedPlan, selectedDuration, promoApplied && promoCode.trim().length >= 4 ? promoCode.toUpperCase() : undefined)}
                      disabled={checkoutBusy || availablePlans.length === 0}
                      data-testid="ai-gate-start-checkout"
                      className="motion-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-600 disabled:opacity-60"
                    >
                      {checkoutBusy ? <RefreshCcw size={16} className="animate-spin" /> : <CreditCard size={16} />}
                      {checkoutBusy ? t.opening : isRenewal ? formatText(t.billingRenewPlan || 'Renew {plan}', { plan: planDisplayNames[selectedPlan] }) : formatText(t.billingUpgradeToPlan || 'Upgrade to {plan}', { plan: planDisplayNames[selectedPlan] })}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="motion-pressable inline-flex min-h-12 items-center justify-center rounded-2xl border border-glass bg-surface-alpha px-4 text-sm font-semibold text-primary transition-colors hover:bg-surface-alpha-hover"
                  >
                    {t.aiGateLaterCta}
                  </button>
                </div>
                {renderSupportLinks()}
              </>
            )}
          </>
        )}

        {/* Step 2: CHECKOUT */}
        {step === 'checkout' && manualInvoice && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={() => setStep('pilih')} 
                  className="grid min-h-11 min-w-11 place-items-center rounded-full text-secondary transition-colors hover:bg-surface-alpha hover:text-primary"
                  aria-label="Kembali"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 id="register-title" className="text-xl font-bold leading-tight text-primary">{t.billingCheckout || 'Checkout'}</h2>
                  <p className="text-xs text-secondary">{t.billingCheckoutStep || 'Step 2 dari 3: Selesaikan pembayaran'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-alpha hover:text-primary"
                aria-label={t.close}
              >
                <X size={17} />
              </button>
            </div>

            {/* Selected plan summary */}
            <div className="mt-4 rounded-xl border border-glass bg-surface-alpha p-3 flex justify-between items-center text-sm">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">{t.billingSelectedPlan || 'Plan Pilihan'}</span>
              <div className="text-right">
                <strong className="text-primary font-bold">{planDisplayNames[selectedPlan]}</strong>
                <span className="block text-xs text-secondary mt-0.5">{getPriceDisplay()} / {durationLabels[selectedDuration].toLowerCase()}</span>
              </div>
            </div>

            {checkoutError ? (
              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {checkoutError}
              </div>
            ) : null}

            {/* Payment card content */}
            <div className="mt-4 flex flex-col gap-3 text-left">
              <div className="bg-surface-alpha border border-glass rounded-2xl p-4 flex flex-col items-center gap-1.5 text-center">
                <span className="text-xs font-bold text-secondary uppercase tracking-widest">{t.billingTotalTransfer || 'TOTAL TRANSFER'}</span>
                <strong className="text-2xl font-black text-blue-600 dark:text-blue-300">{manualInvoice.manualInvoice.amountLabel}</strong>
                <p className="text-xs text-secondary">
                  {formatText(t.billingTransferInstruction || '*Pastikan transfer sesuai hingga 3 digit terakhir {suffix}', { suffix: manualInvoice.manualInvoice.uniqueSuffix || manualInvoice.manualInvoice.id.slice(-3).replace(/[^0-9]/g, '3') })}
                </p>
              </div>

              {manualInvoice.manualInvoice.instructions.qrisImageUrl ? (
                <div className="flex flex-col items-center gap-1.5 mt-2">
                  <div className="bg-white p-2 rounded-xl w-36 h-36">
                    <img
                      src={manualInvoice.manualInvoice.instructions.qrisImageUrl}
                      alt={manualInvoice.manualInvoice.instructions.qrisLabel || t.billingQrisManual || 'QRIS manual'}
                      className="h-full w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-xs font-bold text-secondary tracking-wider">
                    {manualInvoice.manualInvoice.instructions.qrisLabel || t.billingScanQrisManual || 'SCAN QRIS MANUAL'}
                  </span>
                </div>
              ) : null}

              {/* Dynamic banks cards */}
              {manualInvoice.manualInvoice.instructions.banks && manualInvoice.manualInvoice.instructions.banks.length > 0 ? (
                manualInvoice.manualInvoice.instructions.banks.map((bank: ManualInvoiceBank, idx: number) => {
                  const isCopied = copiedBankIndex === idx;
                  return (
                    <div key={idx} className="bg-surface-alpha border border-glass rounded-xl p-3 flex flex-col gap-1.5 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-primary text-xs">{bank.bankName}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyBankDetail(bank.accountNumber, idx)}
                          className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors uppercase tracking-wider ${isCopied ? 'bg-emerald-600 text-white' : 'bg-surface-alpha text-primary hover:bg-surface-alpha-hover'}`}
                        >
                          {isCopied ? (t.billingCopiedBank || t.billingCopied || 'Copied') : (t.billingCopy || 'Copy')}
                        </button>
                      </div>
                      <span className="font-mono text-base font-extrabold text-blue-600 dark:text-blue-300">{bank.accountNumber}</span>
                      <span className="text-xs text-secondary">{bank.accountName}</span>
                    </div>
                  );
                })
              ) : (
                <div className="bg-surface-alpha border border-glass rounded-xl p-3 flex flex-col gap-1.5 mt-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary text-xs">{manualInvoice.manualInvoice.instructions.bankName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onCopyManualAccount(manualInvoice.manualInvoice.instructions.accountNumber);
                        setCopiedBankIndex(99);
                        setTimeout(() => setCopiedBankIndex(null), 2000);
                      }}
                      className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors uppercase tracking-wider ${copiedBankIndex === 99 ? 'bg-emerald-600 text-white' : 'bg-surface-alpha text-primary hover:bg-surface-alpha-hover'}`}
                    >
                      {copiedBankIndex === 99 ? (t.billingCopiedBank || t.billingCopied || 'Copied') : (t.billingCopy || 'Copy')}
                    </button>
                  </div>
                  <span className="font-mono text-base font-extrabold text-blue-600 dark:text-blue-300">{manualInvoice.manualInvoice.instructions.accountNumber}</span>
                  <span className="text-xs text-secondary">{manualInvoice.manualInvoice.instructions.accountName}</span>
                </div>
              )}

              {/* Upload screenshot */}
              <div 
                role="button"
                tabIndex={0}
                className={`mt-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors ${manualProofFile ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-glass bg-surface-alpha hover:border-blue-500 hover:bg-surface-alpha-hover'}`}
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <UploadCloud className={`w-7 h-7 ${manualProofFile ? 'text-emerald-500' : 'text-secondary'}`} />
                <p className="text-xs font-semibold text-primary">
                  {manualProofFile ? manualProofFile.name : (t.billingClickToUploadScreenshot || 'Klik untuk upload screenshot')}
                </p>
                <span className="text-xs text-secondary">Maksimal 5MB (JPG, PNG, WebP, PDF)</span>
                <input
                  ref={fileInputRef}
                  id="proof-file-input"
                  type="file"
                  data-testid="ai-gate-proof-input"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] || null;
                    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
                    setFileError(null);
                    if (file && !allowedTypes.includes(file.type)) {
                      onManualProofFileChange(null);
                      setFileError(t.billingUploadFormatError || 'Format bukti transfer harus JPG, PNG, WebP, atau PDF.');
                      return;
                    }
                    if (file && file.size > 5 * 1024 * 1024) {
                      onManualProofFileChange(null);
                      setFileError(t.billingMaxProofSize || 'Ukuran bukti transfer maksimal adalah 5MB.');
                      return;
                    }
                    onManualProofFileChange(file);
                  }}
                  className="hidden"
                />
              </div>

              {fileError && (
                <div className="mt-1 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center" role="alert">
                  {fileError}
                </div>
              )}

              {/* Manual confirmation */}
              <button
                type="button"
                onClick={() => setTurnstileVerified(!turnstileVerified)}
                aria-pressed={turnstileVerified}
                data-testid="ai-gate-confirm-proof"
                className="flex w-full items-center justify-between p-3 border border-glass rounded-xl bg-surface-alpha hover:bg-surface-alpha-hover cursor-pointer mt-1 select-none text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${turnstileVerified ? 'border-emerald-500 bg-emerald-500' : 'border-glass'}`}>
                    {turnstileVerified && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-xs text-primary">{t.billingHumanVerification || 'Verifikasi bahwa Anda adalah manusia'}</span>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-black uppercase tracking-widest text-primary">{t.billingManualCheck || 'Manual check'}</span>
                  <span className="block text-xs text-secondary">{t.billingNoAutoCharge || 'No auto charge'}</span>
                </div>
              </button>

              {/* Support WhatsApp/Instagram */}
              {renderSupportLinks()}

              {/* Submit button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onManualProofSubmit();
                    setStep('success');
                  } catch {
                    // Error state is rendered from checkoutError.
                  }
                }}
                disabled={manualProofStatus === 'submitting' || !manualProofFile || !turnstileVerified}
                data-testid="ai-gate-submit-proof"
                className="w-full min-h-12 bg-[#3b82f6] text-[#ffffff] rounded-full font-black text-sm flex items-center justify-center gap-2 hover:bg-[#60a5fa] transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2 shadow-[0_8px_20px_rgba(255,210,51,0.2)]"
              >
                {manualProofStatus === 'submitting' ? (
                  <><RefreshCcw className="w-4 h-4 animate-spin" /> {t.billingProcess || 'Memproses...'}</>
                ) : (
                  <>{t.billingSubmitWaitReview || 'Kirim Bukti & Tunggu Review'} <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </>
        )}

        {/* Step 3: SUCCESS */}
        {step === 'success' && (
          <div className="flex flex-col items-center text-center p-3 gap-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 animate-[pulse_2s_infinite]">
              <Check size={32} strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-xl font-black text-primary">{t.billingProofReceived || 'Bukti Diterima - Menunggu Review'}</h3>
              <p className="text-sm text-secondary mt-2.5 leading-relaxed">
                {manualProofDelivery === 'manual_support'
                  ? (t.billingProofReceivedManualSupport || 'Invoice sudah masuk antrean admin. Kirim file bukti lewat WhatsApp atau Instagram dengan ID invoice agar review lebih cepat.')
                  : (t.billingProofReceivedSuccessBody || 'Terima kasih. Bukti transfer Anda telah berhasil dikirim ke server Baristachaw.')}
              </p>
              <p className="text-xs text-tertiary mt-2 leading-relaxed">
                {t.billingAdminVerifyWait || 'Admin akan memverifikasi transaksi Anda sebelum plan aktif. Jika perlu bantuan, hubungi customer service lewat WhatsApp atau Instagram di bawah.'}
              </p>
            </div>

            {/* Support links on success page */}
            {renderSupportLinks()}

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-12 bg-[#3b82f6] text-[#ffffff] rounded-full font-black text-sm hover:bg-[#60a5fa] transition-all mt-2"
            >
              {t.billingDone || 'Selesai'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function useAiAccessGate(feature: AiPaidFeature): {
  ensureAiAccess: (source: string) => boolean;
  openGate: (mode: GateMode, source: string) => void;
  hasPaidAiAccess: boolean;
  minimumPaidPlan: AccountPlan | null;
  effectivePlanCode: PlanCode | null;
  aiAccessGateModal: ReactNode;
} {
  const { t, region, language } = useGlobalState();
  const currency = getCurrencyForRegion(region);

  const { user, isAuthenticated, isGuest, openAuthModal } = useAuthModal();
  const { snapshot, loading, refreshAccountStatus } = useAccountStatus();
  
  const [state, setState] = useState<GateState | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [manualInvoice, setManualInvoice] = useState<BillingManualInvoiceResponse | null>(null);
  const [manualProofFile, setManualProofFile] = useState<File | null>(null);
  const [manualProofStatus, setManualProofStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle');
  const [manualProofDelivery, setManualProofDelivery] = useState<'direct_upload' | 'manual_support' | null>(null);
  const [refreshBusy, setRefreshBusy] = useState(false);

  // 3-step checkout states
  const [step, setStep] = useState<CheckoutStep>('pilih');
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>('starter');
  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>('quarterly');

  const featureLabel = t[`aiGateFeature${feature.slice(0, 1).toUpperCase()}${feature.slice(1)}`] || feature;
  const minimumPaidPlan = useMemo(() => findMinimumPaidPlan(snapshot?.plans), [snapshot?.plans]);
  const tokenPlanCode = normalizePlanCode(user?.planCode);
  const effectivePlanCode = normalizePlanCode(snapshot?.user?.planCode || snapshot?.plan?.code) || tokenPlanCode;
  const hasPaidAiAccess = isAuthenticated && !isGuest && isPaidPlanCode(effectivePlanCode);
  const hasPendingManualPayment = isAuthenticated && !isGuest && (
    shouldBlockDuplicateManualPayment({
      markerRaw: readPendingManualPaymentMarkerRaw(),
      billing: snapshot?.billing,
    }) || readPendingManualPaymentMarker()
  );

  useEffect(() => {
    if (minimumPaidPlan) {
      setSelectedPlan(minimumPaidPlan.code === 'pro' ? 'pro' : 'starter');
    }
  }, [minimumPaidPlan]);

  const close = useCallback(() => {
    setState(null);
    setCheckoutError('');
    setManualInvoice(null);
    setManualProofFile(null);
    setManualProofStatus('idle');
    setManualProofDelivery(null);
    setRefreshBusy(false);
    setStep('pilih');
  }, []);

  const openGate = useCallback((mode: GateMode, source: string) => {
    setCheckoutError('');
    setManualInvoice(null);
    setManualProofFile(null);
    setManualProofStatus('idle');
    setManualProofDelivery(null);
    setState({ mode, source });
    setStep(mode === 'upgrade' && hasPendingManualPayment ? 'pending' : 'pilih');
  }, [hasPendingManualPayment]);

  const ensureAiAccess = useCallback((source: string) => {
    if (!isAuthenticated || isGuest) {
      openAuthModal({ source: source as any });
      return false;
    }

    if (loading && !snapshot && !isPaidPlanCode(tokenPlanCode)) {
      openGate('checking', source);
      return false;
    }

    if (!isPaidPlanCode(effectivePlanCode)) {
      openGate('upgrade', source);
      return false;
    }

    return true;
  }, [effectivePlanCode, isAuthenticated, isGuest, loading, openAuthModal, openGate, snapshot, tokenPlanCode, feature]);

  const isRenewal = snapshot?.billing?.status === 'expired' || snapshot?.billing?.status === 'cancelled';
  const renewalRequired = isRenewal && (minimumPaidPlan?.code === tokenPlanCode || tokenPlanCode === 'pro' || tokenPlanCode === 'team');

  const title = state?.mode === 'login'
    ? formatText(t.aiGateLoginTitle, { feature: featureLabel })
    : state?.mode === 'checking'
      ? t.aiGateCheckingTitle
      : renewalRequired
        ? formatText(t.aiGateRenewTitle || 'Renew {plan} for {feature}', { feature: featureLabel, plan: minimumPaidPlan?.name || t.aiGatePlanFallbackName || '' })
        : formatText(t.aiGateUpgradeTitle, {
            feature: featureLabel,
            plan: minimumPaidPlan?.name || t.aiGatePlanFallbackName || '',
          });
          
  const body = state?.mode === 'login'
    ? formatText(t.aiGateLoginBody, { feature: featureLabel })
    : state?.mode === 'checking'
      ? formatText(t.aiGateCheckingBody, { feature: featureLabel })
      : renewalRequired
        ? formatText(t.aiGateRenewBody || 'Your plan has expired. Renew your access to continue using {feature} and other premium features.', { feature: featureLabel })
        : formatText(t.aiGateUpgradeBody, {
            feature: featureLabel,
            plan: minimumPaidPlan?.name || t.aiGatePlanFallbackName || '',
            price: minimumPaidPlan?.displayPrice || t.aiGatePriceFallback || '',
          });

  const handleSignin = useCallback(() => {
    const source = state?.source || `${feature}_ai_gate`;
    close();
    openAuthModal({ source: source as any });
  }, [close, feature, openAuthModal, state?.source]);

  useEffect(() => {
    if (state?.mode !== 'checking' || loading || !snapshot) return;
    if (hasPaidAiAccess) {
      close();
      return;
    }
    setState((current) => current?.mode === 'checking'
      ? { ...current, mode: 'upgrade' }
      : current);
  }, [close, hasPaidAiAccess, loading, snapshot, state?.mode]);

  useEffect(() => {
    if (state?.mode === 'upgrade' && hasPendingManualPayment && step !== 'pending') {
      setStep('pending');
    }
  }, [hasPendingManualPayment, state?.mode, step]);

  const handleRefresh = useCallback(async () => {
    setRefreshBusy(true);
    setCheckoutError('');
    try {
      await refreshAccountStatus();
    } finally {
      setRefreshBusy(false);
    }
  }, [refreshAccountStatus]);

  const upgradeBusyRef = useRef(false);

  const handleUpgrade = useCallback(async (planCode: 'starter' | 'pro', duration: BillingDuration, promoCode?: string) => {
    if (upgradeBusyRef.current) return;
    if (snapshot?.billing?.status === 'past_due') {
      setCheckoutError(t.aiGatePastDueError || 'Harap selesaikan tagihan tertunda Anda terlebih dahulu sebelum mengaktifkan plan baru.');
      return;
    }

    setCheckoutBusy(true);
    setCheckoutError('');
    upgradeBusyRef.current = true;
    try {
      const response = await startBillingCheckout(planCode, { duration, currency, promoCode });
      if (response.mode === 'redirect' && response.url) {
        window.location.assign(response.url);
        // Do not reset busy ref so user can't click again while redirecting
        return;
      }
      if (response.mode === 'manual_invoice') {
        setManualInvoice(response);
        setManualProofFile(null);
        setManualProofStatus('idle');
        setManualProofDelivery(null);
        setStep('checkout');
        upgradeBusyRef.current = false;
        return;
      }
      setCheckoutError(t.aiGateCheckoutUnavailable);
      upgradeBusyRef.current = false;
    } catch (error) {
      if (error instanceof BillingApiError && error.errorCode === 'billing_not_configured') {
        setCheckoutError(t.aiGateCheckoutUnavailable);
      } else {
        setCheckoutError(t.aiGateCheckoutFailed);
      }
      upgradeBusyRef.current = false;
    } finally {
      setCheckoutBusy(false);
    }
  }, [currency, snapshot, t.aiGateCheckoutFailed, t.aiGateCheckoutUnavailable, t.aiGatePastDueError]);

  const busyProofRef = useRef(false);

  const handleManualProofSubmit = useCallback(async () => {
    if (!manualInvoice || !manualProofFile || busyProofRef.current) return;
    setCheckoutError('');
    setManualProofStatus('submitting');
    busyProofRef.current = true;
    try {
      const proofResponse = await submitManualPaymentProof({
        requestId: manualInvoice.paymentRequestId,
        mimeType: manualProofFile.type,
        sizeBytes: manualProofFile.size,
      });
      writePendingManualPaymentMarker(manualInvoice.paymentRequestId, selectedPlan);
      if (proofResponse.uploadUrl) {
        const uploadResponse = await fetch(proofResponse.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': manualProofFile.type },
          body: manualProofFile,
        });
        if (!uploadResponse.ok) {
          const supportUrl = proofResponse.supportLinks?.whatsappUrl || manualInvoice.manualInvoice.instructions.whatsappUrl;
          if (supportUrl) window.open(supportUrl, '_blank', 'noopener,noreferrer');
          setCheckoutError(t.billingUploadFailedFallback || 'Automatic upload failed. Invoice is still queued; please send the proof file via WhatsApp/Instagram with the invoice ID.');
          setManualProofDelivery('manual_support');
          setManualProofStatus('submitted');
          void refreshAccountStatus();
          busyProofRef.current = false;
          return;
        }
      } else {
        const supportUrl = proofResponse.supportLinks?.whatsappUrl || manualInvoice.manualInvoice.instructions.whatsappUrl;
        if (supportUrl) window.open(supportUrl, '_blank', 'noopener,noreferrer');
      }
      setManualProofDelivery(proofResponse.deliveryMode);
      setManualProofStatus('submitted');
      void refreshAccountStatus();
      busyProofRef.current = false;
    } catch (error) {
      setCheckoutError(error instanceof BillingApiError
        ? `${error.message}${error.details ? `: ${error.details}` : ''}`
        : t.aiGateCheckoutFailed);
      setManualProofStatus('idle');
      busyProofRef.current = false;
      // Note: we don't re-throw to avoid unhandled promise rejection, UI will stay on the form
    }
  }, [manualInvoice, manualProofFile, refreshAccountStatus, selectedPlan, t.aiGateCheckoutFailed]);

  const handleCopyManualAccount = useCallback(async (accountNum?: string) => {
    if (!manualInvoice) return;
    const { bankName, accountName, accountNumber } = manualInvoice.manualInvoice.instructions;
    const toCopy = accountNum || `${bankName}\n${accountName}\n${accountNumber}`;
    await navigator.clipboard?.writeText(toCopy).catch(() => undefined);
  }, [manualInvoice]);

  const aiAccessGateModal = state && typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          <AiAccessGateDialog
            state={state}
            title={title}
            body={body}
            plan={minimumPaidPlan}
            t={t}
            checkoutBusy={checkoutBusy}
            checkoutError={checkoutError}
            manualInvoice={manualInvoice}
            manualProofFile={manualProofFile}
            manualProofStatus={manualProofStatus}
            manualProofDelivery={manualProofDelivery}
            refreshBusy={refreshBusy}
            onClose={close}
            onSignin={handleSignin}
            onUpgrade={handleUpgrade}
            onRefresh={handleRefresh}
            onManualProofFileChange={(file) => {
              setManualProofFile(file);
              setManualProofStatus('idle');
              setManualProofDelivery(null);
            }}
            onManualProofSubmit={handleManualProofSubmit}
            onCopyManualAccount={handleCopyManualAccount}
            step={step}
            setStep={setStep}
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            selectedDuration={selectedDuration}
            setSelectedDuration={setSelectedDuration}
            effectivePlanCode={effectivePlanCode}
            isPastDue={snapshot?.billing.status === 'past_due'}
            manageUrl={snapshot?.billing.manageUrl}
            isRenewal={isRenewal}
          />
        </AnimatePresence>,
        document.body,
      )
    : null;

  return {
    ensureAiAccess,
    openGate,
    hasPaidAiAccess,
    minimumPaidPlan,
    effectivePlanCode,
    aiAccessGateModal,
  };
}
