type TelemetryUser = {
  id?: string;
  email?: string;
  username?: string;
};

type TelemetryEventName =
  | 'screen_view'
  | 'screen_ready'
  | 'screen_error'
  | 'feature_used'
  | 'auth_started'
  | 'auth_success'
  | 'auth_started_google'
  | 'auth_success_google'
  | 'auth_fail_google'
  | 'auth_session_invalidated'
  | 'auth_session_restored'
  | 'auth_email_confirmation_required'
  | 'auth_gate_seen'
  | 'action_succeeded'
  | 'action_failed'
  | 'degraded_response_seen'
  | 'offline_gate_seen'
  | 'fallback_triggered';

let sentry: any | null = null;
let initialized = false;

export async function initTelemetry(params: { dsn?: string; environment: string; release: string }): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!params.dsn) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires,global-require
    sentry = require('@sentry/react-native');
  } catch {
    sentry = null;
  }
  if (!sentry?.init) return;

  sentry.init({
    dsn: params.dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.15,
    profilesSampleRate: 0.05,
    environment: params.environment,
    release: params.release,
  });
}

export function setTelemetryUser(user: TelemetryUser | null) {
  if (sentry?.setUser) {
    sentry.setUser(user);
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (sentry?.captureException) {
    sentry.captureException(error, context ? { extra: context } : undefined);
    return;
  }

  // Fallback logger so debugging remains possible when Sentry isn't configured.
  console.error('[telemetry] error', error, context || {});
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  if (sentry?.captureMessage) {
    sentry.captureMessage(message, context ? { extra: context } : undefined);
    return;
  }

  console.log('[telemetry] message', message, context || {});
}

export function trackEvent(name: TelemetryEventName, data?: Record<string, unknown>) {
  if (sentry?.addBreadcrumb) {
    sentry.addBreadcrumb({
      category: 'analytics',
      type: 'default',
      level: 'info',
      message: name,
      data: data || {},
    });
    return;
  }

  console.log('[telemetry] event', name, data || {});
}
