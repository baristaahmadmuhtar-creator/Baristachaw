type ErrorReportInput = {
  message: string;
  name?: string;
  stack?: string;
  component?: string;
  source?: 'web' | 'pwa' | 'mobile' | 'admin';
  userId?: string;
  severity?: 'info' | 'warning' | 'critical';
  throttleMs?: number;
};

let installed = false;
let lastReportAt = 0;

function runtimeSurface(): 'web' | 'pwa' | 'admin' {
  if (typeof window === 'undefined') return 'web';
  if (window.location.pathname.startsWith('/admin')) return 'admin';
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
  return standalone ? 'pwa' : 'web';
}

function normalizeError(error: unknown): Pick<ErrorReportInput, 'message' | 'name' | 'stack'> {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || 'Client error',
      name: error.name,
      stack: error.stack,
    };
  }
  if (typeof error === 'string') return { message: error };
  return { message: 'Client error' };
}

export function reportClientError(input: ErrorReportInput) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const throttleMs = typeof input.throttleMs === 'number' ? Math.max(0, input.throttleMs) : 1_500;
  if (throttleMs > 0 && now - lastReportAt < throttleMs) return;
  lastReportAt = now;
  const { throttleMs: _throttleMs, ...reportInput } = input;

  const payload = {
    ...reportInput,
    source: input.source || runtimeSurface(),
    url: window.location.href,
    release: import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || '',
  };

  try {
    void fetch('/api/monitoring/error', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  } catch {
    // Reporting must never interrupt the user flow.
  }
}

export function installClientErrorReporting(): () => void {
  if (typeof window === 'undefined' || installed) return () => undefined;
  installed = true;

  const onError = (event: ErrorEvent) => {
    reportClientError({
      ...normalizeError(event.error || event.message),
      component: 'window_error',
    });
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportClientError({
      ...normalizeError(event.reason),
      component: 'unhandled_rejection',
    });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    installed = false;
  };
}
