import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CreditCard, LogIn, RefreshCcw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useAccountStatus } from '../../context/AccountStatusContext';
import { useAuthModal } from '../../context/AuthModalContext';
import { useGlobalState } from '../../context/GlobalState';
import { BillingApiError, startBillingCheckout } from '../../services/billing';
import type { AccountPlan, PlanCode } from '../../services/accountStatus';
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
  onClose,
  onSignin,
  onUpgrade,
  onRefresh,
}: {
  state: GateState;
  title: string;
  body: string;
  plan: AccountPlan | null;
  t: Record<string, string>;
  checkoutBusy: boolean;
  checkoutError: string;
  onClose: () => void;
  onSignin: () => void;
  onUpgrade: () => void;
  onRefresh: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const isUpgrade = state.mode === 'upgrade';
  const planName = plan?.name || t.aiGatePlanFallbackName;
  const planPrice = plan?.displayPrice || t.aiGatePriceFallback;
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
              className="motion-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-600"
            >
              <RefreshCcw size={16} />
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

  const featureLabel = t[`aiGateFeature${feature.slice(0, 1).toUpperCase()}${feature.slice(1)}`] || feature;
  const minimumPaidPlan = useMemo(() => findMinimumPaidPlan(snapshot?.plans), [snapshot?.plans]);
  const tokenPlanCode = normalizePlanCode(user?.planCode);
  const effectivePlanCode = normalizePlanCode(snapshot?.user.planCode || snapshot?.plan.code) || tokenPlanCode;
  const hasPaidAiAccess = isAuthenticated && !isGuest && isPaidPlanCode(effectivePlanCode);

  const close = useCallback(() => {
    setState(null);
    setCheckoutError('');
  }, []);

  const openGate = useCallback((mode: GateMode, source: string) => {
    setCheckoutError('');
    setState({ mode, source });
  }, []);

  const ensureAiAccess = useCallback((source: string) => {
    if (!isAuthenticated || isGuest) {
      openGate('login', source);
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
  }, [effectivePlanCode, isAuthenticated, isGuest, loading, openGate, snapshot, tokenPlanCode]);

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

  const handleRefresh = useCallback(() => {
    void refreshAccountStatus();
  }, [refreshAccountStatus]);

  const handleUpgrade = useCallback(async () => {
    if (!minimumPaidPlan || minimumPaidPlan.checkoutMode === 'disabled') {
      setCheckoutError(t.aiGateCheckoutUnavailable);
      return;
    }
    if (minimumPaidPlan.checkoutMode === 'manual_invoice') {
      setCheckoutError(t.homePlanManualInvoice);
      return;
    }
    setCheckoutBusy(true);
    setCheckoutError('');
    try {
      const response = await startBillingCheckout(minimumPaidPlan.code as Exclude<PlanCode, 'free'>);
      if (response.url) {
        window.location.assign(response.url);
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
  }, [minimumPaidPlan, t.aiGateCheckoutFailed, t.aiGateCheckoutUnavailable, t.homePlanManualInvoice]);

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
            onClose={close}
            onSignin={handleSignin}
            onUpgrade={handleUpgrade}
            onRefresh={handleRefresh}
          />
        </AnimatePresence>,
        document.body,
      )
    : null;

  return { ensureAiAccess, hasPaidAiAccess, minimumPaidPlan, effectivePlanCode, aiAccessGateModal };
}
