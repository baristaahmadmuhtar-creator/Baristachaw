export type ManualPaymentMessageTemplateType =
  | 'payment_initiated'
  | 'proof_submitted'
  | 'proof_upload_failed_support_fallback'
  | 'upgrade_followup'
  | 'renewal_followup'
  | 'admin_review_request'
  | 'payment_problem';

export type ManualPaymentMessageInput = {
  templateType: ManualPaymentMessageTemplateType;
  paymentRequestId?: unknown;
  userId?: unknown;
  userEmail?: unknown;
  userName?: unknown;
  planCode?: unknown;
  planDisplayName?: unknown;
  duration?: unknown;
  durationLabel?: unknown;
  amount?: unknown;
  amountLabel?: unknown;
  currency?: unknown;
  promoCode?: unknown;
  uniqueSuffix?: unknown;
  status?: unknown;
  proofStatus?: unknown;
  proofFileName?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  supportChannel?: unknown;
  appUrl?: unknown;
  dashboardUrl?: unknown;
  userNote?: unknown;
};

export type ManualPaymentSupportMessage = {
  templateType: ManualPaymentMessageTemplateType;
  text: string;
  compactText: string;
  whatsappText: string;
  emailSubject: string;
  previewLabel: string;
  warnings: string[];
  requiredMissing: string[];
};

const SECRET_PATTERNS = [
  /\b(jwt|drafttoken|uploadurl|signedurl|service[_ -]?role(?:[_ -]?key)?|supabase[_ -]?service[_ -]?role[_ -]?key|authorization|bearer)\b/gi,
  /\b(sk|pk|gsk|eyJ)[a-z0-9_\-.]{12,}\b/gi,
  /https:\/\/[^\s]*(?:signed|token|upload)[^\s]*/gi,
];

const REQUIRED_FIELDS = ['paymentRequestId', 'userId', 'planCode', 'amountLabel'] as const;

function safeText(value: unknown, fallback = '', maxLength = 360): string {
  if (value === null || value === undefined) return fallback;
  const raw = typeof value === 'string' ? value : String(value);
  const normalized = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!normalized) return fallback;
  return sanitizeSecretText(normalized).slice(0, maxLength).trim() || fallback;
}

function sanitizeSecretText(value: string): string {
  let next = value;
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, '[redacted]');
  }
  return next;
}

function dash(value: unknown, maxLength = 360): string {
  return safeText(value, '-', maxLength) || '-';
}

function normalizeCurrency(value: unknown): string {
  const raw = safeText(value, '', 12).replace(/[^a-zA-Z]/g, '').toUpperCase();
  return raw || '-';
}

function normalizePlanCode(value: unknown): string {
  return safeText(value, '', 48).toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function isoOrDash(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  const raw = safeText(value, '', 120);
  if (!raw) return '-';
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : raw;
}

export function manualPaymentPlanLabel(value: unknown): string {
  const code = normalizePlanCode(value);
  if (code === 'starter') return 'Starter';
  if (code === 'pro') return 'Pro';
  if (code === 'team') return 'Team';
  if (code === 'enterprise') return 'Enterprise';
  return 'Paket tidak diketahui';
}

export function manualPaymentDurationLabel(value: unknown): string {
  const raw = safeText(value, '', 32).toLowerCase();
  if (raw === 'monthly') return '1 bulan';
  if (raw === 'quarterly') return '3 bulan';
  if (raw === 'yearly') return '1 tahun';
  return 'Durasi tidak diketahui';
}

export function manualPaymentStatusLabel(value: unknown): string {
  const raw = safeText(value, '', 48).toLowerCase();
  if (raw === 'pending_review') return 'Menunggu pembayaran / bukti transfer';
  if (raw === 'receipt_received') return 'Bukti diterima, menunggu review admin';
  if (raw === 'verified_paid') return 'Pembayaran terverifikasi';
  if (raw === 'rejected') return 'Pembayaran ditolak';
  if (raw === 'expired') return 'Permintaan pembayaran kadaluarsa';
  return 'Status tidak diketahui';
}

export function manualPaymentProofStatusLabel(value: unknown): string {
  const raw = safeText(value, '', 48).toLowerCase();
  if (raw === 'none') return 'Belum ada bukti transfer';
  if (raw === 'metadata_only') return 'Bukti tercatat, file dikirim manual/support';
  if (raw === 'supabase_signed_upload') return 'Bukti berhasil diupload';
  if (raw === 'preview_unavailable') return 'Bukti ada, preview belum tersedia';
  return 'Status bukti tidak diketahui';
}

function resolvePlanDisplayName(planCode: string, provided: unknown): string {
  const label = safeText(provided, '', 96);
  if (label) return label;
  return manualPaymentPlanLabel(planCode);
}

function collectWarnings(input: ManualPaymentMessageInput, normalized: Record<string, string>): {
  warnings: string[];
  requiredMissing: string[];
} {
  const warnings: string[] = [];
  const requiredMissing = REQUIRED_FIELDS.filter((field) => !normalized[field]);
  for (const field of requiredMissing) warnings.push(`missing:${field}`);
  if (!normalized.userEmail) warnings.push('missing:userEmail');
  if (!normalized.userName) warnings.push('missing:userName');
  if (!normalized.promoCode) warnings.push('missing:promoCode');
  if (
    (input.templateType === 'proof_submitted'
      || input.templateType === 'admin_review_request'
      || input.templateType === 'payment_problem')
    && !normalized.proofFileName
  ) {
    warnings.push('missing:proofFileName');
  }
  return { warnings, requiredMissing };
}

function detailLines(input: {
  heading?: string;
  paymentRequestId: string;
  userId: string;
  userEmail: string;
  userName: string;
  planDisplayName: string;
  planCode: string;
  durationLabel: string;
  amountLabel: string;
  currency: string;
  promoCode: string;
  statusLabel?: string;
  proofStatusLabel?: string;
  proofFileName?: string;
  createdAtLabel?: string;
  updatedAtLabel?: string;
}): string[] {
  const lines = [
    input.heading || 'Detail Pembayaran:',
    '',
    `* Payment ID: ${input.paymentRequestId || '-'}`,
    `* User ID: ${input.userId || '-'}`,
    `* Email: ${input.userEmail || '-'}`,
    `* Nama: ${input.userName || '-'}`,
    `* Paket: ${input.planDisplayName || '-'} (${input.planCode || '-'})`,
    `* Durasi: ${input.durationLabel || '-'}`,
    `* Nominal: ${input.amountLabel || '-'}`,
    `* Mata uang: ${input.currency || '-'}`,
    `* Promo: ${input.promoCode || '-'}`,
  ];
  if (input.statusLabel) lines.push(`* Status: ${input.statusLabel}`);
  if (input.proofStatusLabel) lines.push(`* Status bukti: ${input.proofStatusLabel}`);
  if (input.proofFileName !== undefined) lines.push(`* File bukti: ${input.proofFileName || '-'}`);
  if (input.createdAtLabel) lines.push(`* Waktu request: ${input.createdAtLabel}`);
  if (input.updatedAtLabel) lines.push(`* Waktu upload: ${input.updatedAtLabel}`);
  return lines;
}

function buildText(input: ManualPaymentMessageInput, normalized: Record<string, string>): string {
  const common = {
    paymentRequestId: normalized.paymentRequestId || '-',
    userId: normalized.userId || '-',
    userEmail: normalized.userEmail || '-',
    userName: normalized.userName || '-',
    planDisplayName: normalized.planDisplayName || '-',
    planCode: normalized.planCode || '-',
    durationLabel: normalized.durationLabel || '-',
    amountLabel: normalized.amountLabel || '-',
    currency: normalized.currency || '-',
    promoCode: normalized.promoCode || '-',
  };

  if (input.templateType === 'proof_submitted') {
    return [
      'Halo Admin Baristachaw, saya sudah mengirim bukti transfer.',
      '',
      ...detailLines({
        ...common,
        proofStatusLabel: normalized.proofStatusLabel,
        proofFileName: normalized.proofFileName || '-',
        updatedAtLabel: normalized.updatedAtLabel,
      }),
      '',
      'Mohon bantu review bukti transfer ini. Jika sudah valid, mohon aktifkan paket sesuai detail di atas.',
    ].join('\n');
  }

  if (input.templateType === 'proof_upload_failed_support_fallback') {
    return [
      'Halo Admin Baristachaw, saya sudah melakukan pembayaran, tetapi upload bukti transfer di aplikasi gagal.',
      '',
      ...detailLines({
        ...common,
        statusLabel: 'Upload bukti gagal / perlu bantuan admin',
      }),
      '',
      'Saya akan kirim bukti transfer melalui chat ini. Mohon bantu cek dan aktifkan paket jika pembayaran sudah sesuai.',
    ].join('\n');
  }

  if (input.templateType === 'upgrade_followup') {
    return [
      'Halo Admin Baristachaw, saya ingin follow-up upgrade paket saya.',
      '',
      ...detailLines({
        ...common,
        heading: 'Detail Upgrade:',
        statusLabel: normalized.statusLabel,
      }).map((line) => line.replace('* Paket:', '* Paket tujuan:')),
      '',
      'Mohon bantu cek status pembayaran dan aktivasi paket saya.',
    ].join('\n');
  }

  if (input.templateType === 'renewal_followup') {
    return [
      'Halo Admin Baristachaw, saya ingin follow-up perpanjangan paket saya.',
      '',
      ...detailLines({
        ...common,
        heading: 'Detail Perpanjangan:',
        statusLabel: normalized.statusLabel,
      }),
      '',
      'Mohon bantu cek status pembayaran dan perpanjangan paket saya.',
    ].join('\n');
  }

  if (input.templateType === 'admin_review_request') {
    return [
      'Halo Admin Baristachaw, request pembayaran manual ini perlu review admin.',
      '',
      ...detailLines({
        ...common,
        statusLabel: normalized.statusLabel,
        proofStatusLabel: normalized.proofStatusLabel,
        proofFileName: normalized.proofFileName || '-',
        createdAtLabel: normalized.createdAtLabel,
        updatedAtLabel: normalized.updatedAtLabel,
      }),
      '',
      'Mohon cocokkan Payment ID, User ID, paket, durasi, nominal, dan bukti transfer sebelum aktivasi.',
    ].join('\n');
  }

  if (input.templateType === 'payment_problem') {
    return [
      'Halo Admin Baristachaw, saya butuh bantuan terkait pembayaran manual.',
      '',
      ...detailLines({
        ...common,
        statusLabel: normalized.statusLabel,
      }),
      '',
      'Masalah:',
      normalized.userNote || 'Mohon jelaskan kendala pembayaran di sini.',
      '',
      'Mohon bantu cek pembayaran saya.',
    ].join('\n');
  }

  return [
    'Halo Admin Baristachaw, saya ingin konfirmasi pembayaran manual.',
    '',
    ...detailLines({
      ...common,
      statusLabel: normalized.statusLabel,
      createdAtLabel: normalized.createdAtLabel,
    }),
    '',
    'Saya akan mengirim bukti transfer setelah pembayaran selesai.',
    'Mohon bantu cek dan aktifkan paket jika pembayaran sudah sesuai.',
  ].join('\n');
}

function buildCompactText(normalized: Record<string, string>, templateType: ManualPaymentMessageTemplateType): string {
  return [
    templateType === 'proof_upload_failed_support_fallback'
      ? 'Halo Admin Baristachaw, upload bukti di aplikasi gagal. Mohon bantu review pembayaran manual.'
      : templateType === 'proof_submitted'
        ? 'Halo Admin Baristachaw, saya sudah kirim bukti transfer. Mohon review pembayaran manual.'
        : 'Halo Admin Baristachaw, mohon bantu cek pembayaran manual saya.',
    `Payment ID: ${normalized.paymentRequestId || '-'}`,
    `User ID: ${normalized.userId || '-'}`,
    `Email: ${normalized.userEmail || '-'}`,
    `Paket: ${normalized.planDisplayName || '-'} (${normalized.planCode || '-'})`,
    `Durasi: ${normalized.durationLabel || '-'}`,
    `Nominal: ${normalized.amountLabel || '-'} ${normalized.currency || ''}`.trim(),
    `Status: ${normalized.statusLabel || '-'}`,
  ].join('\n');
}

export function buildManualPaymentSupportMessage(input: ManualPaymentMessageInput): ManualPaymentSupportMessage {
  const planCode = normalizePlanCode(input.planCode);
  const status = safeText(input.status, '', 48).toLowerCase();
  const proofStatus = safeText(input.proofStatus, input.proofFileName ? 'metadata_only' : 'none', 48).toLowerCase();
  const normalized: Record<string, string> = {
    paymentRequestId: safeText(input.paymentRequestId, '', 120),
    userId: safeText(input.userId, '', 160),
    userEmail: safeText(input.userEmail, '', 180),
    userName: safeText(input.userName, '', 120),
    planCode,
    planDisplayName: resolvePlanDisplayName(planCode, input.planDisplayName),
    durationLabel: safeText(input.durationLabel, '', 80) || manualPaymentDurationLabel(input.duration),
    amountLabel: safeText(input.amountLabel, '', 80),
    currency: normalizeCurrency(input.currency),
    promoCode: safeText(input.promoCode, '', 40),
    statusLabel: manualPaymentStatusLabel(status),
    proofStatusLabel: manualPaymentProofStatusLabel(proofStatus),
    proofFileName: safeText(input.proofFileName, '', 180),
    createdAtLabel: isoOrDash(input.createdAt),
    updatedAtLabel: isoOrDash(input.updatedAt),
    userNote: safeText(input.userNote, '', 1200),
  };
  if (!normalized.amountLabel && Number.isFinite(Number(input.amount))) {
    normalized.amountLabel = String(input.amount);
  }
  const validation = collectWarnings(input, normalized);
  const text = sanitizeSecretText(buildText(input, normalized));
  const compactText = sanitizeSecretText(buildCompactText(normalized, input.templateType));
  const emailSubjectPrefix = input.templateType === 'proof_submitted'
    ? 'Bukti pembayaran'
    : input.templateType === 'payment_problem'
      ? 'Bantuan pembayaran'
      : 'Pembayaran manual';
  return {
    templateType: input.templateType,
    text,
    compactText,
    whatsappText: encodeURIComponent(text),
    emailSubject: `${emailSubjectPrefix} ${normalized.paymentRequestId || '-'}`,
    previewLabel: `${normalized.paymentRequestId || '-'} | ${normalized.planDisplayName || '-'} | ${normalized.amountLabel || '-'}`,
    warnings: validation.warnings,
    requiredMissing: validation.requiredMissing,
  };
}

export function normalizeManualPaymentWhatsappNumber(value: unknown): string {
  return safeText(value, '', 40).replace(/[^\d]/g, '').slice(0, 20);
}

export function buildManualPaymentWhatsappUrl(
  phoneNumber: unknown,
  message: ManualPaymentSupportMessage | ManualPaymentMessageInput | string,
  options: { maxEncodedLength?: number } = {},
): string | undefined {
  const digits = normalizeManualPaymentWhatsappNumber(phoneNumber);
  if (!digits) return undefined;
  const maxEncodedLength = Math.max(200, options.maxEncodedLength || 3600);
  const fullText = typeof message === 'string'
    ? sanitizeSecretText(message)
    : 'text' in message
      ? message.text
      : buildManualPaymentSupportMessage(message).text;
  const compactText = typeof message === 'string'
    ? sanitizeSecretText(message.slice(0, 900))
    : 'compactText' in message
      ? message.compactText
      : buildManualPaymentSupportMessage(message).compactText;
  const encodedFull = encodeURIComponent(fullText);
  const encoded = encodedFull.length <= maxEncodedLength
    ? encodedFull
    : encodeURIComponent(compactText);
  return `https://wa.me/${digits}?text=${encoded}`;
}
