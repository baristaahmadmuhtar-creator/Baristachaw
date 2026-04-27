export class AccountPrivacyError extends Error {
  status: number;
  errorCode?: string;
  requestId?: string;

  constructor(message: string, params: { status: number; errorCode?: string; requestId?: string }) {
    super(message);
    this.name = 'AccountPrivacyError';
    this.status = params.status;
    this.errorCode = params.errorCode;
    this.requestId = params.requestId;
  }
}

async function parseJson(response: Response): Promise<any> {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function filenameFromDisposition(value: string | null): string {
  const match = value?.match(/filename="([^"]+)"/i);
  return match?.[1] || `baristachaw-account-export-${new Date().toISOString().slice(0, 10)}.json`;
}

function downloadJsonFile(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function downloadAccountExport(): Promise<void> {
  const response = await fetch('/api/account/export', {
    method: 'GET',
    credentials: 'same-origin',
  });
  const payload = await parseJson(response);
  if (!response.ok || payload?.ok === false) {
    throw new AccountPrivacyError(payload?.error || `Account export failed with HTTP ${response.status}`, {
      status: response.status,
      errorCode: payload?.errorCode,
      requestId: payload?.requestId || response.headers.get('x-request-id') || undefined,
    });
  }
  downloadJsonFile(payload, filenameFromDisposition(response.headers.get('content-disposition')));
}

export async function requestAccountDeletion(reason = ''): Promise<{ ok: true; requestId: string; message?: string }> {
  const response = await fetch('/api/account/delete', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const payload = await parseJson(response);
  if (!response.ok || payload?.ok === false) {
    throw new AccountPrivacyError(payload?.error || `Account deletion failed with HTTP ${response.status}`, {
      status: response.status,
      errorCode: payload?.errorCode,
      requestId: payload?.requestId || response.headers.get('x-request-id') || undefined,
    });
  }
  return payload;
}
