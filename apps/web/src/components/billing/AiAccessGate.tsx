import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CreditCard, LogIn, RefreshCcw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useAccountStatus } from '../../context/AccountStatusContext';
import { useAuthModal } from '../../context/AuthModalContext';
import { useGlobalState } from '../../context/GlobalState';
import {
  BillingApiError,
  startBillingCheckout,
  submitManualPaymentProof,
  type BillingManualInvoiceResponse,
} from '../../services/billing';
import type { AccountPlan, PlanCode } from '../../services/accountStatus';
import { getCurrencyForRegion, PRICING, formatCurrency } from '../../services/billingConfig';
import { modalSpringTransition, overlayFadeTransition } from '../../utils/motionPresets';

export type AiPaidFeature = 'chat' | 'scanner' | 'search' | 'brew';

type GateMode = 'login' | 'upgrade' | 'checking';

type GateState = {
  mode: GateMode;
  source: string;
};

const PAID_PLAN_PRIORITY: PlanCode[] = ['starter', 'pro', 'team', 'enterprise'];

function formatText(template: string, replacements: Record<string, string | number>) {
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
  refreshBusy,
  onClose,
  onSignin,
  onUpgrade,
  onRefresh,
  onManualProofFileChange,
  onManualProofSubmit,
  onCopyManualAccount,
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
  refreshBusy: boolean;
  onClose: () => void;
  onSignin: () => void;
  onUpgrade: () => void;
  onRefresh: () => void | Promise<void>;
  onManualProofFileChange: (file: File | null) => void;
  onManualProofSubmit: () => void | Promise<void>;
  onCopyManualAccount: () => void | Promise<void>;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const isUpgrade = state.mode === 'upgrade';
  const planName = plan?.name || t.aiGatePlanFallbackName;
  
  const { region } = useGlobalState();
  const currency = getCurrencyForRegion(region);

  let planPrice = plan?.displayPrice || t.aiGatePriceFallback;
  if (plan && (plan.code === 'starter' || plan.code === 'pro')) {
    const tier = PRICING[plan.code]['quarterly'];
    planPrice = formatCurrency(tier.discounted[currency], currency) + ' / 3mo';
  }

  const planIncludes = plan
    ? formatText(t.aiGatePlanIncludes, {
        ai: plan.aiDailyLimit,
        scanner: plan.scannerDailyLimit,
      })
    : '';

  useEffect(() => {
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={overlayFadeTransition}
      className="fixed inset-0 z-[160]"
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
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
        className="motion-safe-surface absolute left-3 right-3 top-1/2 mx-auto w-auto max-w-md -translate-y-1/2 rounded-[1.75rem] border border-glass bg-[var(--bg-base)]/98 p-4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] outline-none sm:left-6 sm:right-6 sm:p-5"
        style={{
          maxHeight: 'min(88vh, 38rem)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[1.1rem] ${isUpgrade ? 'bg-blue-500/12 text-blue-600 dark:text-blue-300' : 'bg-amber-500/12 text-amber-600 dark:text-amber-300'}`}>
            <FeatureIcon mode={state.mode} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-tertiary">
                  {isUpgrade ? t.aiGatePlanBadge : t.signInRequired}
                </p>
                <h2 className="mt-1 text-xl font-semibold leading-tight text-primary">{title}</h2>
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
            <p className="mt-3 text-sm leading-6 text-secondary">{body}</p>
          </div>
        </div>

        {isUpgrade ? (
          <div className="mt-4 rounded-[1.35rem] border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">{planName}</p>
                <p className="mt-1 text-sm text-secondary">{planPrice}</p>
              </div>
              <span className="rounded-full bg-blue-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                {t.aiGateMinimumPlanBadge}
              </span>
            </div>
            {planIncludes ? (
              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                <ShieldCheck size={14} />
                {planIncludes}
              </p>
            ) : null}
          </div>
        ) : null}

        {checkoutError ? (
          <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            {checkoutError}
          </div>
        ) : null}

        {manualInvoice ? (
          <div className="mt-4 rounded-[1.35rem] border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-primary">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                  {t.aiGateManualPaymentTitle}
                </p>
                <p className="mt-1 font-semibold">
                  {manualInvoice.manualInvoice.amountLabel}
                </p>
                <p className="mt-1 text-xs leading-5 text-secondary">
                  {t.aiGateManualPaymentBody}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                {manualInvoice.manualInvoice.status.replace(/_/g, ' ')}
              </span>
            </div>
            <dl className="mt-3 grid gap-2 rounded-2xl border border-glass bg-[var(--bg-base)]/70 p-3">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-secondary">Bank</dt>
                <dd className="mt-0.5 font-semibold">{manualInvoice.manualInvoice.instructions.bankName}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-secondary">Account</dt>
                <dd className="mt-0.5 font-semibold">{manualInvoice.manualInvoice.instructions.accountName}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-secondary">Number</dt>
                <dd className="mt-0.5 font-mono text-base font-black">{manualInvoice.manualInvoice.instructions.accountNumber}</dd>
              </div>
            </dl>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onCopyManualAccount}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-xs font-bold text-primary"
              >
                {t.aiGateManualPaymentCopyAccount}
              </button>
              {manualInvoice.manualInvoice.instructions.whatsappUrl ? (
                <a
                  href={manualInvoice.manualInvoice.instructions.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-glass bg-[var(--bg-base)] px-3 text-xs font-bold text-primary"
                >
                  {t.aiGateManualPaymentWhatsapp}
                </a>
              ) : null}
            </div>
            <label className="mt-3 block">
              <span className="text-[10px] font-bold uppercase tracking-wide text-secondary">
                {t.aiGateManualPaymentUploadProof}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => onManualProofFileChange(event.currentTarget.files?.[0] || null)}
                className="mt-1 block w-full rounded-xl border border-glass bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold file:mr-2 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
              />
            </label>
            <button
              type="button"
              onClick={onManualProofSubmit}
              disabled={!manualProofFile || manualProofStatus === 'submitting' || manualProofStatus === 'submitted'}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-3 text-xs font-extrabold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {manualProofStatus === 'submitting'
                ? t.aiGateManualPaymentSubmitting
                : manualProofStatus === 'submitted'
                  ? t.aiGateManualPaymentSubmitted
                  : t.aiGateManualPaymentSubmitProof}
            </button>
          </div>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          {state.mode === 'login' ? (
            <button
              type="button"
              onClick={onSignin}
              className="motion-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-600"
            >
              <LogIn size={16} />
              {t.aiGateSigninCta}
            </button>
          ) : state.mode === 'checking' ? (
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
          ) : (
            <button
              type="button"
              onClick={onUpgrade}
              disabled={checkoutBusy}
              className="motion-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-600 disabled:opacity-60"
            >
              {checkoutBusy ? <RefreshCcw size={16} className="animate-spin" /> : <CreditCard size={16} />}
              {checkoutBusy ? t.opening : formatText(t.aiGateUpgradeCta, { plan: planName })}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="motion-pressable inline-flex min-h-12 items-center justify-center rounded-2xl border border-glass bg-surface-alpha px-4 text-sm font-semibold text-primary transition-colors hover:bg-[var(--bg-base)]"
          >
            {t.aiGateLaterCta}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function useAiAccessGate(feature: AiPaidFeature): {
  ensureAiAccess: (source: string) => boolean;
  hasPaidAiAccess: boolean;
  minimumPaidPlan: AccountPlan | null;
  effectivePlanCode: PlanCode | null;
  aiAccessGateModal: ReactNode;
} {
  const { t } = useGlobalState();
  const { user, isAuthenticated, isGuest, openAuthModal } = useAuthModal();
  const { snapshot, loading, refreshAccountStatus } = useAccountStatus();
  const [state, setState] = useState<GateState | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [manualInvoice, setManualInvoice] = useState<BillingManualInvoiceResponse | null>(null);
  const [manualProofFile, setManualProofFile] = useState<File | null>(null);
  const [manualProofStatus, setManualProofStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle');
  const [refreshBusy, setRefreshBusy] = useState(false);

  const featureLabel = t[`aiGateFeature${feature.slice(0, 1).toUpperCase()}${feature.slice(1)}`] || feature;
  const minimumPaidPlan = useMemo(() => findMinimumPaidPlan(snapshot?.plans), [snapshot?.plans]);
  const tokenPlanCode = normalizePlanCode(user?.planCode);
  const effectivePlanCode = normalizePlanCode(snapshot?.user.planCode || snapshot?.plan.code) || tokenPlanCode;
  const hasPaidAiAccess = isAuthenticated && !isGuest && isPaidPlanCode(effectivePlanCode);

  const close = useCallback(() => {
    setState(null);
    setCheckoutError('');
    setManualInvoice(null);
    setManualProofFile(null);
    setManualProofStatus('idle');
    setRefreshBusy(false);
  }, []);

  const openGate = useCallback((mode: GateMode, source: string) => {
    setCheckoutError('');
    setManualInvoice(null);
    setManualProofFile(null);
    setManualProofStatus('idle');
    setState({ mode, source });
  }, []);

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
  }, [effectivePlanCode, isAuthenticated, isGuest, loading, openAuthModal, openGate, snapshot, tokenPlanCode]);

  const title = state?.mode === 'login'
    ? formatText(t.aiGateLoginTitle, { feature: featureLabel })
    : state?.mode === 'checking'
      ? t.aiGateCheckingTitle
      : formatText(t.aiGateUpgradeTitle, {
          feature: featureLabel,
          plan: minimumPaidPlan?.name || t.aiGatePlanFallbackName,
        });
  const body = state?.mode === 'login'
    ? formatText(t.aiGateLoginBody, { feature: featureLabel })
    : state?.mode === 'checking'
      ? formatText(t.aiGateCheckingBody, { feature: featureLabel })
      : formatText(t.aiGateUpgradeBody, {
          feature: featureLabel,
          plan: minimumPaidPlan?.name || t.aiGatePlanFallbackName,
          price: minimumPaidPlan?.displayPrice || t.aiGatePriceFallback,
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

  const handleRefresh = useCallback(async () => {
    setRefreshBusy(true);
    setCheckoutError('');
    try {
      await refreshAccountStatus();
    } finally {
      setRefreshBusy(false);
    }
  }, [refreshAccountStatus]);

  const handleUpgrade = useCallback(async () => {
    if (!minimumPaidPlan || minimumPaidPlan.checkoutMode === 'disabled') {
      setCheckoutError(t.aiGateCheckoutUnavailable);
      return;
    }
    setCheckoutBusy(true);
    setCheckoutError('');
    try {
      const response = await startBillingCheckout(minimumPaidPlan.code as Exclude<PlanCode, 'free'>);
      if (response.mode === 'redirect' && response.url) {
        window.location.assign(response.url);
        return;
      }
      if (response.mode === 'manual_invoice') {
        setManualInvoice(response);
        setManualProofFile(null);
        setManualProofStatus('idle');
        return;
      }
      setCheckoutError(t.aiGateCheckoutUnavailable);
    } catch (error) {
      if (error instanceof BillingApiError && error.errorCode === 'billing_not_configured') {
        setCheckoutError(t.aiGateCheckoutUnavailable);
      } else {
        setCheckoutError(t.aiGateCheckoutFailed);
      }
    } finally {
      setCheckoutBusy(false);
    }
  }, [minimumPaidPlan, t.aiGateCheckoutFailed, t.aiGateCheckoutUnavailable]);

  const handleManualProofSubmit = useCallback(async () => {
    if (!manualInvoice || !manualProofFile) return;
    setCheckoutError('');
    setManualProofStatus('submitting');
    try {
      await submitManualPaymentProof({
        requestId: manualInvoice.paymentRequestId,
        mimeType: manualProofFile.type,
        sizeBytes: manualProofFile.size,
      });
      setManualProofStatus('submitted');
    } catch (error) {
      setCheckoutError(error instanceof BillingApiError
        ? `${error.message}${error.details ? `: ${error.details}` : ''}`
        : t.aiGateCheckoutFailed);
      setManualProofStatus('idle');
    }
  }, [manualInvoice, manualProofFile, t.aiGateCheckoutFailed]);

  const handleCopyManualAccount = useCallback(async () => {
    if (!manualInvoice) return;
    const { bankName, accountName, accountNumber } = manualInvoice.manualInvoice.instructions;
    await navigator.clipboard?.writeText(`${bankName}\n${accountName}\n${accountNumber}`).catch(() => undefined);
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
            refreshBusy={refreshBusy}
            onClose={close}
            onSignin={handleSignin}
            onUpgrade={handleUpgrade}
            onRefresh={handleRefresh}
            onManualProofFileChange={(file) => {
              setManualProofFile(file);
              setManualProofStatus('idle');
            }}
            onManualProofSubmit={handleManualProofSubmit}
            onCopyManualAccount={handleCopyManualAccount}
          />
        </AnimatePresence>,
        document.body,
      )
    : null;

  return { ensureAiAccess, hasPaidAiAccess, minimumPaidPlan, effectivePlanCode, aiAccessGateModal };
}
