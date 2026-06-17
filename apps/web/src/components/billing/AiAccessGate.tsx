import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  CreditCard, LogIn, RefreshCcw, ShieldCheck, Sparkles, X,
  ArrowRight, Check, UploadCloud, ArrowLeft
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
  onUpgrade: (planCode: 'starter' | 'pro', duration: BillingDuration) => void;
  onRefresh: () => void | Promise<void>;
  onManualProofFileChange: (file: File | null) => void;
  onManualProofSubmit: () => void | Promise<void>;
  onCopyManualAccount: (accountNum?: string) => void | Promise<void>;
  step: 'pilih' | 'checkout' | 'success';
  setStep: (s: 'pilih' | 'checkout' | 'success') => void;
  selectedPlan: 'starter' | 'pro';
  setSelectedPlan: (p: 'starter' | 'pro') => void;
  selectedDuration: BillingDuration;
  setSelectedDuration: (d: BillingDuration) => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const isUpgrade = state.mode === 'upgrade';
  
  const { region } = useGlobalState();
  const currency = getCurrencyForRegion(region);

  const [copiedBankIndex, setCopiedBankIndex] = useState<number | null>(null);
  const [turnstileVerified, setTurnstileVerified] = useState(false);

  const planDisplayNames = {
    starter: 'Barista Plus',
    pro: 'Barista Pro',
  };

  const getPriceDisplay = (p = selectedPlan, d = selectedDuration): string => {
    const tier = PRICING[p][d];
    return formatCurrency(tier.discounted[currency], currency);
  };

  const durationLabels: Record<BillingDuration, string> = {
    monthly: region === 'id' ? '1 Bulan' : '1 Month',
    quarterly: region === 'id' ? '3 Bulan' : '3 Months',
    yearly: region === 'id' ? '1 Tahun' : '1 Year',
  };

  const supportWhatsappUrl = manualInvoice?.manualInvoice?.instructions?.whatsappUrl || `https://wa.me/6738270092?text=${encodeURIComponent('Halo Baristachaw, saya ingin menanyakan tentang keanggotaan.')}`;
  const supportWhatsappNumber = manualInvoice?.manualInvoice?.instructions?.whatsappNumber || "+6738270092";
  const supportInstagramUrl = manualInvoice?.manualInvoice?.instructions?.instagramUrl || "https://instagram.com/baristachaw";
  const supportInstagramHandle = manualInvoice?.manualInvoice?.instructions?.instagramHandle || "@baristachaw";

  const renderSupportLinks = () => (
    <div className="flex gap-4 justify-center mt-2.5 text-xs text-white/60">
      <a href={supportWhatsappUrl} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] font-bold hover:underline">
        WhatsApp: {supportWhatsappNumber}
      </a>
      <a href={supportInstagramUrl} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] font-bold hover:underline">
        Instagram: {supportInstagramHandle}
      </a>
    </div>
  );

  const handleCopyBankDetail = (accountNum: string, idx: number) => {
    onCopyManualAccount(accountNum);
    setCopiedBankIndex(idx);
    setTimeout(() => setCopiedBankIndex(null), 2000);
  };

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
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      >
        {/* Step 1: PILIH PLAN */}
        {step === 'pilih' && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-500">
                  {isUpgrade ? t.aiGatePlanBadge : t.signInRequired}
                </p>
                <h2 className="mt-1 text-xl font-bold leading-tight text-primary">Pilih Plan Keanggotaan</h2>
                <p className="text-xs text-secondary mt-1">Step 1 dari 3: Pilih paket terbaik Anda</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={t.close}
              >
                <X size={17} />
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-secondary">{body}</p>

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
                  className="motion-pressable inline-flex min-h-12 items-center justify-center rounded-2xl border border-glass bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
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
                  className="motion-pressable inline-flex min-h-12 items-center justify-center rounded-2xl border border-glass bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {t.aiGateLaterCta}
                </button>
              </div>
            ) : (
              <>
                {/* Duration select tabs */}
                <div className="mt-5 flex bg-white/5 p-1 rounded-xl border border-white/10">
                  {(['monthly', 'quarterly', 'yearly'] as BillingDuration[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDuration(d)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center"
                      style={{
                        background: selectedDuration === d ? '#3b82f6' : 'transparent',
                        color: selectedDuration === d ? '#ffffff' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {durationLabels[d]}
                    </button>
                  ))}
                </div>

                {/* Plan Selection list */}
                <div className="mt-4 grid gap-3">
                  {(['starter', 'pro'] as const).map((p) => {
                    const isSelected = selectedPlan === p;
                    return (
                      <div
                        key={p}
                        onClick={() => setSelectedPlan(p)}
                        className={`flex items-start justify-between p-4 rounded-2xl border cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03] ${isSelected ? 'border-[#3b82f6] bg-white/[0.04]' : 'border-white/10'}`}
                      >
                        <div className="text-left flex-1 min-w-0 pr-3">
                          <p className="font-bold text-white text-sm">
                            {planDisplayNames[p]}
                          </p>
                          <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                            {p === 'starter'
                              ? 'Guided AI tools, log brew, scanner history'
                              : 'AI Brew Coach, latte art, scan analysis, Deep mode'}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end shrink-0 justify-center">
                          <span className="font-extrabold text-[#3b82f6] text-base">
                            {getPriceDisplay(p, selectedDuration)}
                          </span>
                          <span className="text-[9px] text-white/40 mt-0.5">
                            /{selectedDuration === 'monthly' ? 'mo' : selectedDuration === 'quarterly' ? '3mo' : 'yr'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {checkoutError ? (
                  <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    {checkoutError}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <button
                    type="button"
                    onClick={() => onUpgrade(selectedPlan, selectedDuration)}
                    disabled={checkoutBusy}
                    className="motion-pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-600 disabled:opacity-60"
                  >
                    {checkoutBusy ? <RefreshCcw size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    {checkoutBusy ? t.opening : `Upgrade to ${planDisplayNames[selectedPlan]}`}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="motion-pressable inline-flex min-h-12 items-center justify-center rounded-2xl border border-glass bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
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
                  className="bg-transparent border-0 text-white cursor-pointer p-0 grid place-items-center"
                  aria-label="Kembali"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 id="register-title" className="text-xl font-bold leading-tight text-white">Checkout</h2>
                  <p className="text-xs text-white/60">Step 2 dari 3: Selesaikan pembayaran</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={t.close}
              >
                <X size={17} />
              </button>
            </div>

            {/* Selected plan summary */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 flex justify-between items-center text-sm">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Plan Pilihan</span>
              <div className="text-right">
                <strong className="text-white font-bold">{planDisplayNames[selectedPlan]}</strong>
                <span className="block text-xs text-white/60 mt-0.5">{getPriceDisplay()} / {durationLabels[selectedDuration].toLowerCase()}</span>
              </div>
            </div>

            {checkoutError ? (
              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {checkoutError}
              </div>
            ) : null}

            {/* Payment card content */}
            <div className="mt-4 flex flex-col gap-3 text-left">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-1.5 text-center">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">TOTAL TRANSFER</span>
                <strong className="text-2xl font-black text-[#3b82f6]">{manualInvoice.manualInvoice.amountLabel}</strong>
                <p className="text-xs text-white/70">
                  *Pastikan transfer sesuai hingga 3 digit terakhir{' '}
                  <strong>({manualInvoice.manualInvoice.uniqueSuffix || manualInvoice.manualInvoice.id.slice(-3).replace(/[^0-9]/g, '3')})</strong>
                </p>
              </div>

              {/* QRIS vector box */}
              <div className="flex flex-col items-center gap-1.5 mt-2">
                <div className="bg-white p-2 rounded-xl w-36 h-36">
                  <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
                    <rect x="0" y="0" width="200" height="28" fill="#E1251B" rx="4" />
                    <text x="100" y="17" fill="#ffffff" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">QRIS MANUAL</text>
                    <rect x="25" y="42" width="150" height="150" fill="none" stroke="#E1251B" strokeWidth="2" rx="4" />
                    <rect x="35" y="52" width="30" height="30" fill="#000000" />
                    <rect x="40" y="57" width="20" height="20" fill="#ffffff" />
                    <rect x="45" y="62" width="10" height="10" fill="#000000" />
                    <rect x="135" y="52" width="30" height="30" fill="#000000" />
                    <rect x="140" y="57" width="20" height="20" fill="#ffffff" />
                    <rect x="145" y="62" width="10" height="10" fill="#000000" />
                    <rect x="35" y="142" width="30" height="30" fill="#000000" />
                    <rect x="40" y="147" width="20" height="20" fill="#ffffff" />
                    <rect x="45" y="152" width="10" height="10" fill="#000000" />
                    <rect x="75" y="52" width="10" height="10" fill="#000000" />
                    <rect x="95" y="52" width="15" height="5" fill="#000000" />
                    <rect x="120" y="52" width="5" height="10" fill="#000000" />
                    <rect x="75" y="72" width="15" height="10" fill="#000000" />
                    <rect x="100" y="67" width="10" height="15" fill="#000000" />
                    <rect x="115" y="72" width="10" height="10" fill="#000000" />
                    <rect x="35" y="92" width="15" height="5" fill="#000000" />
                    <rect x="60" y="92" width="10" height="10" fill="#000000" />
                    <rect x="80" y="87" width="25" height="10" fill="#000000" />
                    <rect x="115" y="92" width="10" height="15" fill="#000000" />
                    <rect x="135" y="92" width="15" height="10" fill="#000000" />
                    <rect x="160" y="87" width="5" height="20" fill="#000000" />
                    <rect x="35" y="112" width="10" height="15" fill="#000000" />
                    <rect x="55" y="112" width="20" height="10" fill="#000000" />
                    <rect x="85" y="112" width="10" height="15" fill="#000000" />
                    <rect x="105" y="107" width="15" height="10" fill="#000000" />
                    <rect x="130" y="112" width="5" height="10" fill="#000000" />
                    <rect x="145" y="112" width="20" height="15" fill="#000000" />
                    <rect x="75" y="132" width="10" height="10" fill="#000000" />
                    <rect x="95" y="132" width="15" height="15" fill="#000000" />
                    <rect x="120" y="132" width="10" height="10" fill="#000000" />
                    <rect x="75" y="152" width="25" height="10" fill="#000000" />
                    <rect x="110" y="147" width="10" height="15" fill="#000000" />
                    <rect x="130" y="152" width="15" height="10" fill="#000000" />
                    <rect x="155" y="147" width="10" height="20" fill="#000000" />
                    <rect x="75" y="172" width="10" height="10" fill="#000000" />
                    <rect x="95" y="167" width="15" height="10" fill="#000000" />
                    <rect x="120" y="172" width="20" height="5" fill="#000000" />
                    <rect x="150" y="172" width="15" height="10" fill="#000000" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-white/50 tracking-wider">SCAN QRIS MANUAL</span>
              </div>

              {/* Dynamic banks cards */}
              {manualInvoice.manualInvoice.instructions.banks && manualInvoice.manualInvoice.instructions.banks.length > 0 ? (
                manualInvoice.manualInvoice.instructions.banks.map((bank: any, idx: number) => {
                  const isCopied = copiedBankIndex === idx;
                  return (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white text-xs">{bank.bankName}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyBankDetail(bank.accountNumber, idx)}
                          className={`text-[10px] font-bold px-2 py-1 rounded transition-colors uppercase tracking-wider ${isCopied ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <span className="font-mono text-base font-extrabold text-[#3b82f6]">{bank.accountNumber}</span>
                      <span className="text-[11px] text-white/40">{bank.accountName}</span>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 mt-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">{manualInvoice.manualInvoice.instructions.bankName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onCopyManualAccount(manualInvoice.manualInvoice.instructions.accountNumber);
                        setCopiedBankIndex(99);
                        setTimeout(() => setCopiedBankIndex(null), 2000);
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded transition-colors uppercase tracking-wider ${copiedBankIndex === 99 ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      {copiedBankIndex === 99 ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <span className="font-mono text-base font-extrabold text-[#3b82f6]">{manualInvoice.manualInvoice.instructions.accountNumber}</span>
                  <span className="text-[11px] text-white/40">{manualInvoice.manualInvoice.instructions.accountName}</span>
                </div>
              )}

              {/* Upload screenshot */}
              <div 
                className={`mt-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors bg-white/[0.01] ${manualProofFile ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/15 hover:border-[#3b82f6] hover:bg-white/[0.03]'}`}
                onClick={() => {
                  const input = document.getElementById('proof-file-input') as HTMLInputElement;
                  input?.click();
                }}
              >
                <UploadCloud className={`w-7 h-7 ${manualProofFile ? 'text-emerald-500' : 'text-white/40'}`} />
                <p className="text-xs font-semibold text-white/80">
                  {manualProofFile ? manualProofFile.name : 'Klik untuk upload screenshot'}
                </p>
                <span className="text-[10px] text-white/40">Maksimal 5MB (JPG, PNG, WebP, PDF)</span>
                <input
                  id="proof-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] || null;
                    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
                    if (file && !allowedTypes.includes(file.type)) {
                      onManualProofFileChange(null);
                      alert('Format bukti transfer harus JPG, PNG, WebP, atau PDF.');
                      return;
                    }
                    if (file && file.size > 5 * 1024 * 1024) {
                      onManualProofFileChange(null);
                      alert('Ukuran bukti transfer maksimal adalah 5MB.');
                      return;
                    }
                    onManualProofFileChange(file);
                  }}
                  className="hidden"
                />
              </div>

              {/* Manual confirmation */}
              <div 
                onClick={() => setTurnstileVerified(!turnstileVerified)}
                className="flex items-center justify-between p-3 border border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer mt-1 select-none"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${turnstileVerified ? 'border-emerald-500 bg-emerald-500' : 'border-white/20'}`}>
                    {turnstileVerified && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-xs text-white/80">Verifikasi bahwa Anda adalah manusia</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-white/70">Manual check</span>
                  <span className="block text-[9px] text-white/40">No auto charge</span>
                </div>
              </div>

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
                className="w-full min-h-12 bg-[#3b82f6] text-[#ffffff] rounded-full font-black text-sm flex items-center justify-center gap-2 hover:bg-[#60a5fa] transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2 shadow-[0_8px_20px_rgba(255,210,51,0.2)]"
              >
                {manualProofStatus === 'submitting' ? (
                  <><RefreshCcw className="w-4 h-4 animate-spin" /> Memproses...</>
                ) : (
                  <>Kirim Bukti & Tunggu Review <ArrowRight size={16} /></>
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
              <h3 className="text-xl font-black text-white">Bukti Diterima - Menunggu Review</h3>
              <p className="text-sm text-white/70 mt-2.5 leading-relaxed">
                {manualProofDelivery === 'manual_support'
                  ? 'Invoice sudah masuk antrean admin. Kirim file bukti lewat WhatsApp atau Instagram dengan ID invoice agar review lebih cepat.'
                  : 'Terima kasih. Bukti transfer Anda telah berhasil dikirim ke server Baristachaw.'}
              </p>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Admin akan memverifikasi transaksi Anda sebelum plan aktif. Jika perlu bantuan, hubungi customer service lewat WhatsApp atau Instagram di bawah.
              </p>
            </div>

            {/* Support links on success page */}
            {renderSupportLinks()}

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-12 bg-[#3b82f6] text-[#ffffff] rounded-full font-black text-sm hover:bg-[#60a5fa] transition-all mt-2"
            >
              Selesai
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
  const { t, region } = useGlobalState();
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
  const [step, setStep] = useState<'pilih' | 'checkout' | 'success'>('pilih');
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>('starter');
  const [selectedDuration, setSelectedDuration] = useState<BillingDuration>('quarterly');

  const featureLabel = t[`aiGateFeature${feature.slice(0, 1).toUpperCase()}${feature.slice(1)}`] || feature;
  const minimumPaidPlan = useMemo(() => findMinimumPaidPlan(snapshot?.plans), [snapshot?.plans]);
  const tokenPlanCode = normalizePlanCode(user?.planCode);
  const effectivePlanCode = normalizePlanCode(snapshot?.user.planCode || snapshot?.plan.code) || tokenPlanCode;
  const hasPaidAiAccess = isAuthenticated && !isGuest && isPaidPlanCode(effectivePlanCode);

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
    setStep('pilih');
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
  }, [effectivePlanCode, isAuthenticated, isGuest, loading, openAuthModal, openGate, snapshot, tokenPlanCode, feature]);

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

  const handleUpgrade = useCallback(async (planCode: 'starter' | 'pro', duration: BillingDuration) => {
    setCheckoutBusy(true);
    setCheckoutError('');
    try {
      const response = await startBillingCheckout(planCode, { duration, currency });
      if (response.mode === 'redirect' && response.url) {
        window.location.assign(response.url);
        return;
      }
      if (response.mode === 'manual_invoice') {
        setManualInvoice(response);
        setManualProofFile(null);
        setManualProofStatus('idle');
        setManualProofDelivery(null);
        setStep('checkout');
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
  }, [currency, t.aiGateCheckoutFailed, t.aiGateCheckoutUnavailable]);

  const handleManualProofSubmit = useCallback(async () => {
    if (!manualInvoice || !manualProofFile) return;
    setCheckoutError('');
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
          setCheckoutError('Upload otomatis belum berhasil. Invoice tetap masuk antrean admin; kirim file bukti lewat WhatsApp/Instagram dengan ID invoice.');
          setManualProofDelivery('manual_support');
          setManualProofStatus('submitted');
          return;
        }
      } else {
        const supportUrl = proofResponse.supportLinks?.whatsappUrl || manualInvoice.manualInvoice.instructions.whatsappUrl;
        if (supportUrl) window.open(supportUrl, '_blank', 'noopener,noreferrer');
      }
      setManualProofDelivery(proofResponse.deliveryMode);
      setManualProofStatus('submitted');
    } catch (error) {
      setCheckoutError(error instanceof BillingApiError
        ? `${error.message}${error.details ? `: ${error.details}` : ''}`
        : t.aiGateCheckoutFailed);
      setManualProofStatus('idle');
      throw error; // Re-throw to prevent step progression in UI if submit failed
    }
  }, [manualInvoice, manualProofFile, t.aiGateCheckoutFailed]);

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
          />
        </AnimatePresence>,
        document.body,
      )
    : null;

  return { ensureAiAccess, openGate, hasPaidAiAccess, minimumPaidPlan, effectivePlanCode, aiAccessGateModal };
}
