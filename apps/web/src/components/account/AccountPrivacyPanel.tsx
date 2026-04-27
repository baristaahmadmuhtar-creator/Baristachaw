import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Download, RefreshCcw, ShieldCheck, Trash2, X } from 'lucide-react';
import { useAuthModal } from '../../context/AuthModalContext';
import { AccountPrivacyError, downloadAccountExport, requestAccountDeletion } from '../../services/accountPrivacy';

type AccountPrivacyPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  t: Record<string, string>;
  direction: 'ltr' | 'rtl';
};

export function AccountPrivacyPanel({ isOpen, onClose, t, direction }: AccountPrivacyPanelProps) {
  const { user, isGuest, logout } = useAuthModal();
  const [busyAction, setBusyAction] = useState<'export' | 'delete' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const isRtl = direction === 'rtl';
  const confirmationWord = t.accountPrivacyDeleteConfirmWord || 'DELETE';
  const canDelete = isGuest || confirmText.trim() === confirmationWord;
  const accountLabel = useMemo(() => user?.email || user?.name || t.signedIn, [t.signedIn, user?.email, user?.name]);

  useEffect(() => {
    if (!isOpen) return;
    setStatusMessage('');
    setErrorMessage('');
    setReason('');
    setConfirmText('');
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 40);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyAction) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [busyAction, isOpen, onClose]);

  const handleExport = async () => {
    setBusyAction('export');
    setErrorMessage('');
    setStatusMessage('');
    try {
      await downloadAccountExport();
      setStatusMessage(t.accountPrivacyExportReady);
    } catch (error) {
      const message = error instanceof AccountPrivacyError ? error.message : t.accountPrivacyExportFailed;
      setErrorMessage(message || t.accountPrivacyExportFailed);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || busyAction) return;
    setBusyAction('delete');
    setErrorMessage('');
    setStatusMessage('');
    try {
      const result = await requestAccountDeletion(reason);
      setStatusMessage(result.message || t.accountPrivacyDeleteQueued);
      await logout();
      onClose();
    } catch (error) {
      const message = error instanceof AccountPrivacyError ? error.message : t.accountPrivacyDeleteFailed;
      setErrorMessage(message || t.accountPrivacyDeleteFailed);
    } finally {
      setBusyAction(null);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[155]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={busyAction ? undefined : onClose} aria-hidden="true" />
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label={t.accountPrivacyTitle}
          tabIndex={-1}
          dir={direction}
          data-testid="account-privacy-panel"
          className="absolute left-3 right-3 top-1/2 mx-auto flex max-h-[min(88dvh,44rem)] max-w-xl -translate-y-1/2 flex-col overflow-hidden rounded-[1.5rem] border border-glass bg-[var(--bg-elevated)] shadow-[0_26px_90px_rgba(0,0,0,0.34)] outline-none"
        >
          <div className={`flex items-start justify-between gap-4 border-b border-glass px-5 py-4 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">{t.accountPrivacyEyebrow}</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-primary">{t.accountPrivacyTitle}</h2>
              <p className="mt-1 text-sm leading-5 text-secondary">{accountLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={Boolean(busyAction)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-secondary transition-colors hover:bg-surface-alpha hover:text-primary disabled:opacity-50"
              aria-label={t.close}
            >
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-5" style={{ WebkitOverflowScrolling: 'touch' }}>
            <section className="rounded-2xl border border-glass bg-surface-alpha p-4">
              <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                  <Download size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-primary">{t.accountPrivacyExportTitle}</h3>
                  <p className="mt-1 text-sm leading-6 text-secondary">{t.accountPrivacyExportBody}</p>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={Boolean(busyAction)}
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {busyAction === 'export' ? <RefreshCcw size={16} className="animate-spin" /> : <Download size={16} />}
                    {busyAction === 'export' ? t.loading : t.accountPrivacyExportCta}
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
              <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-500/12 text-rose-600 dark:text-rose-300">
                  <Trash2 size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-primary">{t.accountPrivacyDeleteTitle}</h3>
                  <p className="mt-1 text-sm leading-6 text-secondary">{isGuest ? t.accountPrivacyGuestDeleteBody : t.accountPrivacyDeleteBody}</p>
                  {!isGuest ? (
                    <div className="mt-4 grid gap-3">
                      <label className="text-xs font-bold uppercase tracking-[0.14em] text-tertiary">
                        {t.accountPrivacyDeleteReasonLabel}
                        <textarea
                          value={reason}
                          onChange={(event) => setReason(event.currentTarget.value)}
                          className="glass-input mt-1 min-h-20 w-full rounded-2xl px-3 py-2 text-sm font-medium normal-case tracking-normal"
                          maxLength={240}
                          placeholder={t.accountPrivacyDeleteReasonPlaceholder}
                        />
                      </label>
                      <label className="text-xs font-bold uppercase tracking-[0.14em] text-tertiary">
                        {t.accountPrivacyDeleteConfirmLabel.replace('{word}', confirmationWord)}
                        <input
                          value={confirmText}
                          onChange={(event) => setConfirmText(event.currentTarget.value)}
                          className="glass-input mt-1 min-h-11 w-full rounded-2xl px-3 text-sm font-medium normal-case tracking-normal"
                          autoComplete="off"
                          inputMode="text"
                        />
                      </label>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!canDelete || Boolean(busyAction)}
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyAction === 'delete' ? <RefreshCcw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    {isGuest ? t.accountPrivacyGuestDeleteCta : t.accountPrivacyDeleteCta}
                  </button>
                </div>
              </div>
            </section>

            {statusMessage ? (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            ) : null}
            {errorMessage ? (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
