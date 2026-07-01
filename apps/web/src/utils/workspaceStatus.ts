import type { AccountFeatureFlag, AccountStatusSnapshot } from '../services/accountStatus';

export type WorkspaceStatusKind =
  | 'loading'
  | 'unavailable'
  | 'blocked'
  | 'maintenance'
  | 'pending_review'
  | 'past_due'
  | 'expiring'
  | 'inactive'
  | 'active'
  | 'free';

export type WorkspaceStatusModel = {
  kind: WorkspaceStatusKind;
  severity: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  label: string;
  badge: string;
  message: string;
  helper: string;
  shouldFloat: boolean;
  action: 'none' | 'checkout' | 'manage' | 'contact_support';
};

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function daysUntil(value: string | undefined): number | null {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.ceil((target - Date.now()) / 86_400_000);
}

function isManualReview(snapshot: AccountStatusSnapshot): boolean {
  if (
    snapshot.user.planCode === 'free'
    && snapshot.billing.status === 'none'
    && snapshot.billing.provider === 'none'
  ) {
    return false;
  }

  if (
    snapshot.billing.paymentActionRequired &&
    snapshot.billing.provider === 'manual'
  ) {
    return true;
  }

  if (
    snapshot.user.planCode !== 'free'
    && snapshot.billing.status === 'active'
    && snapshot.appAccess.status !== 'blocked'
  ) {
    return false;
  }

  const message = snapshot.billing.message || '';
  if (snapshot.billing.paymentActionRequired && /waiting for admin|verification|review/i.test(message)) {
    return true;
  }

  return snapshot.billing.paymentActionRequired
    && snapshot.billing.status === 'trialing';
}

export function resolveWorkspaceStatus(
  params: {
    snapshot: AccountStatusSnapshot | null;
    loading: boolean;
    error: string;
    maintenance: AccountFeatureFlag[];
    language: string;
    locale: string;
    pendingManualPayment?: boolean;
  },
): WorkspaceStatusModel {
  const { snapshot, loading, maintenance, language, locale, pendingManualPayment = false } = params;
  const id = language === 'id';

  if (loading && !snapshot) {
    return {
      kind: 'loading',
      severity: 'info',
      title: id ? 'Status ruang kerja' : 'Workspace status',
      label: id ? 'Menyinkronkan' : 'Syncing',
      badge: id ? 'Live check' : 'Live check',
      message: id ? 'Sedang memeriksa plan, billing, dan fitur yang aktif.' : 'Checking your plan, billing, and active features.',
      helper: id ? 'Status akan diperbarui otomatis setelah data akun tersedia.' : 'Status updates automatically when account data is available.',
      shouldFloat: false,
      action: 'none',
    };
  }

  // A transient error from a background poll must not blank out a perfectly good, already-loaded
  // snapshot (AccountStatusContext keeps the last successful snapshot on non-auth errors). Only
  // show "unavailable" when we have never successfully loaded a snapshot at all.
  if (!snapshot) {
    return {
      kind: 'unavailable',
      severity: 'warning',
      title: id ? 'Status ruang kerja' : 'Workspace status',
      label: id ? 'Belum tersedia' : 'Unavailable',
      badge: id ? 'Mode aman' : 'Safe mode',
      message: id
        ? 'Status akun sementara belum tersedia; alat aplikasi tersimpan tetap bisa dipakai.'
        : 'Account status is temporarily unavailable; saved app tools can still be used.',
      helper: id ? 'Sinkronkan ulang untuk mengambil status terbaru dari server.' : 'Sync again to fetch the latest server status.',
      shouldFloat: true,
      action: 'none',
    };
  }

  const billing = snapshot.billing;
  const primaryMaintenance = maintenance[0];
  const staleFreeCheckoutDraft = snapshot.user.planCode === 'free'
    && billing.status === 'none'
    && billing.provider === 'none';

  if (snapshot.appAccess.status === 'blocked') {
    return {
      kind: 'blocked',
      severity: 'danger',
      title: id ? 'Akses ruang kerja dibatasi' : 'Workspace access blocked',
      label: id ? 'Diblokir' : 'Blocked',
      badge: id ? 'Perlu admin' : 'Admin required',
      message: snapshot.appAccess.message || (id ? 'Akun ini butuh review admin sebelum bisa digunakan.' : 'This account needs admin review before it can be used.'),
      helper: id ? 'Hubungi support/admin untuk membuka akses.' : 'Contact support/admin to restore access.',
      shouldFloat: true,
      action: 'contact_support',
    };
  }

  if (primaryMaintenance) {
    return {
      kind: 'maintenance',
      severity: primaryMaintenance.status === 'disabled' ? 'danger' : 'warning',
      title: id ? 'Pemeliharaan fitur aktif' : 'Feature maintenance active',
      label: primaryMaintenance.status === 'disabled'
        ? (id ? 'Nonaktif sementara' : 'Temporarily disabled')
        : (id ? 'Pemeliharaan' : 'Maintenance'),
      badge: primaryMaintenance.label,
      message: primaryMaintenance.message || (id ? `${primaryMaintenance.label} sedang dalam pemeliharaan.` : `${primaryMaintenance.label} is under maintenance.`),
      helper: maintenance.length > 1
        ? (id ? `${maintenance.length} fitur sedang dipantau admin.` : `${maintenance.length} features are being watched by admin.`)
        : (id ? 'Fitur lain tetap mengikuti status plan Anda.' : 'Other features still follow your plan status.'),
      shouldFloat: true,
      action: 'none',
    };
  }

  if (pendingManualPayment || isManualReview(snapshot)) {
    return {
      kind: 'pending_review',
      severity: 'info',
      title: id ? 'Pembayaran menunggu review' : 'Payment pending review',
      label: id ? 'Menunggu admin' : 'Admin review',
      badge: id ? 'Bukti diterima' : 'Proof received',
      message: id
        ? 'Bukti transfer sudah masuk antrean. Paket aktif setelah admin mencocokkan pembayaran.'
        : 'Your transfer proof is in the queue. The plan activates after admin verifies the payment.',
      helper: id
        ? 'Tidak perlu kirim ulang bukti atau membuat invoice baru. Hubungi dukungan jika ingin menanyakan status.'
        : 'No need to resubmit proof or create another invoice. Contact support if you need a status update.',
      shouldFloat: true,
      action: 'contact_support',
    };
  }

  if (billing.status === 'past_due' || (billing.paymentActionRequired && !staleFreeCheckoutDraft)) {
    return {
      kind: 'past_due',
      severity: 'danger',
      title: id ? 'Pembayaran perlu tindakan' : 'Payment needs action',
      label: id ? 'Tertunggak' : 'Past due',
      badge: id ? 'Akses terbatas' : 'Limited access',
      message: billing.message || (id ? 'Perbarui pembayaran agar limit berbayar tetap aktif.' : 'Update billing to keep paid limits active.'),
      helper: id ? 'Kelola pembayaran atau hubungi support jika sudah transfer.' : 'Manage billing or contact support if you have already paid.',
      shouldFloat: true,
      action: billing.paymentAction,
    };
  }

  if (billing.status === 'cancelled' || billing.status === 'expired' || billing.status === 'refunded') {
    return {
      kind: 'inactive',
      severity: 'danger',
      title: id ? 'Langganan tidak aktif' : 'Subscription inactive',
      label: id ? 'Tidak aktif' : 'Inactive',
      badge: billing.status,
      message: id ? 'Paket berbayar sudah tidak aktif. Pilih paket untuk membuka kembali fitur premium.' : 'Paid access is no longer active. Choose a plan to restore premium features.',
      helper: id ? 'Akses akan kembali ke batas paket Gratis sampai pembayaran baru aktif.' : 'Access falls back to Free limits until a new payment is active.',
      shouldFloat: true,
      action: 'checkout',
    };
  }

  const periodEndDays = daysUntil(billing.currentPeriodEnd);
  if (snapshot.user.planCode !== 'free' && billing.status === 'active' && periodEndDays !== null && periodEndDays >= 0 && periodEndDays <= 7) {
    const endLabel = formatDate(billing.currentPeriodEnd, locale);
    return {
      kind: 'expiring',
      severity: 'warning',
      title: id ? 'Langganan hampir habis' : 'Subscription ending soon',
      label: id ? `${periodEndDays} hari lagi` : `${periodEndDays} days left`,
      badge: id ? 'Perlu perpanjang' : 'Renew soon',
      message: id ? `Paket ${snapshot.plan.name} aktif sampai ${endLabel}.` : `${snapshot.plan.name} is active until ${endLabel}.`,
      helper: id ? 'Perpanjang sebelum tanggal akhir agar akses premium tidak terputus.' : 'Renew before the end date to keep premium access uninterrupted.',
      shouldFloat: true,
      action: billing.paymentAction === 'none' ? 'manage' : billing.paymentAction,
    };
  }

  if (snapshot.user.planCode !== 'free' && billing.status === 'active') {
    const endLabel = formatDate(billing.currentPeriodEnd, locale);
    return {
      kind: 'active',
      severity: 'success',
      title: id ? 'Paket aktif' : 'Plan active',
      label: id ? 'Terkonfirmasi' : 'Confirmed',
      badge: snapshot.plan.name,
      message: endLabel
        ? (id ? `Langganan ${snapshot.plan.name} aktif sampai ${endLabel}.` : `${snapshot.plan.name} is active until ${endLabel}.`)
        : (id ? `Langganan ${snapshot.plan.name} sudah dikonfirmasi.` : `${snapshot.plan.name} is confirmed.`),
      helper: id ? 'Semua limit mengikuti paket aktif Anda.' : 'All limits follow your active plan.',
      shouldFloat: false,
      action: 'none',
    };
  }

  return {
    kind: 'free',
    severity: 'info',
    title: id ? 'Paket Gratis aktif' : 'Free plan active',
    label: id ? 'Gratis' : 'Free',
    badge: id ? 'Tidak ada pembayaran' : 'No payment',
    message: '',
    helper: '',
    shouldFloat: false,
    action: 'checkout',
  };
}
