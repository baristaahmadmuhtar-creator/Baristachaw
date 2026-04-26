import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type ConfirmActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  busy = false,
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 40);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [busy, onCancel, open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-black/42 backdrop-blur-sm"
            onClick={() => {
              if (!busy) onCancel();
            }}
          />
          <div
            className="fixed inset-0 z-[141] flex items-end justify-center pointer-events-none sm:items-center"
            style={{
              paddingTop: 'max(16px, var(--safe-top, 0px))',
              paddingBottom: 'max(16px, var(--bottom-safe-capped, 0px))',
              paddingLeft: 'max(14px, var(--safe-left, 0px))',
              paddingRight: 'max(14px, var(--safe-right, 0px))',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              className="pointer-events-auto w-full max-w-md rounded-[1.4rem] border border-glass bg-[var(--bg-base)]/96 p-4 shadow-[var(--panel-elev-2)] backdrop-blur-xl"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    destructive
                      ? 'bg-red-500/12 text-red-600 dark:text-red-300'
                      : 'bg-blue-500/12 text-blue-600 dark:text-blue-300'
                  }`}
                >
                  <AlertTriangle size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 id={titleId} className="text-base font-semibold text-primary">
                    {title}
                  </h2>
                  <p id={descriptionId} className="mt-1 text-sm leading-6 text-secondary">
                    {description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={busy}
                  aria-label={cancelLabel}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-alpha hover:text-primary disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  ref={cancelButtonRef}
                  type="button"
                  onClick={onCancel}
                  disabled={busy}
                  className="h-11 rounded-xl border border-glass bg-surface-alpha px-3 text-sm font-semibold text-primary transition-colors hover:bg-surface-alpha-hover disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={() => { void onConfirm(); }}
                  disabled={busy}
                  className={`h-11 rounded-xl px-3 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                    destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {busy ? <Loader2 size={16} className="mx-auto animate-spin" /> : confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
