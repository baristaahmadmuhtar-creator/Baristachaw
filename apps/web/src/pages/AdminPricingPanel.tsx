import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit2, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { ConfirmActionDialog } from '../components/ConfirmActionDialog';
import {
  AdminApiError,
  fetchAdminPrices,
  fetchAdminPromos,
  createAdminPrice,
  updateAdminPrice,
  deleteAdminPrice,
  createAdminPromo,
  updateAdminPromo,
  deleteAdminPromo,
  type AdminPlanPrice,
  type AdminPromoCode,
} from '../services/adminApi';
import type { AdminCopy } from './adminLocalization';

const OPERATOR_NOTE_MIN_LENGTH = 12;
const PRICE_DURATIONS = ['monthly', 'quarterly', 'yearly'] as const;
const PLAN_CODES = ['starter', 'pro', 'team', 'enterprise'] as const;
const CURRENCIES = ['idr', 'bnd', 'myr', 'sgd', 'usd', 'eur', 'aud'] as const;

type PriceDraft = Partial<AdminPlanPrice>;
type PromoDraft = Partial<AdminPromoCode>;
type PendingDelete =
  | { kind: 'price'; id: string; label: string }
  | { kind: 'promo'; code: string; label: string };

function cleanOperatorNote(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function hasOperatorNote(value: unknown): boolean {
  return cleanOperatorNote(value).length >= OPERATOR_NOTE_MIN_LENGTH;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toLocaleString();
}

function formatError(error: unknown): { message: string; detail?: string; requestId?: string } {
  if (error instanceof AdminApiError) {
    return {
      message: error.message,
      detail: error.details || error.errorCode,
      requestId: error.requestId,
    };
  }
  return { message: error instanceof Error ? error.message : 'Admin pricing request failed' };
}

function newPriceDraft(): PriceDraft {
  return {
    planCode: 'starter',
    duration: 'monthly',
    currency: 'idr',
    originalPrice: 0,
    discountPrice: null,
    isActive: true,
    operatorNote: '',
  };
}

function newPromoDraft(): PromoDraft {
  return {
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    validFrom: null,
    validUntil: null,
    maxUses: 100,
    currentUses: 0,
    validPlanCodes: [],
    validDurations: [],
    isActive: true,
    operatorNote: '',
  };
}

function pricePayload(draft: PriceDraft): Partial<AdminPlanPrice> {
  return {
    planCode: draft.planCode,
    duration: draft.duration,
    currency: String(draft.currency || '').toLowerCase(),
    originalPrice: Number(draft.originalPrice || 0),
    discountPrice: draft.discountPrice === null || draft.discountPrice === undefined || Number.isNaN(Number(draft.discountPrice))
      ? null
      : Number(draft.discountPrice),
    isActive: draft.isActive !== false,
    operatorNote: cleanOperatorNote(draft.operatorNote),
  };
}

function promoPayload(draft: PromoDraft): Partial<AdminPromoCode> {
  return {
    code: String(draft.code || '').toUpperCase().trim(),
    discountType: draft.discountType === 'fixed_amount' ? 'fixed_amount' : 'percentage',
    discountValue: Number(draft.discountValue || 0),
    validFrom: draft.validFrom || null,
    validUntil: draft.validUntil || null,
    maxUses: draft.maxUses === null || draft.maxUses === undefined ? null : Number(draft.maxUses),
    currentUses: Math.max(0, Number(draft.currentUses || 0)),
    validPlanCodes: draft.validPlanCodes || [],
    validDurations: draft.validDurations || [],
    isActive: draft.isActive !== false,
    operatorNote: cleanOperatorNote(draft.operatorNote),
  };
}

function splitCsv(value: string): string[] {
  return value
    .split(/[\n,]+/g)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

export function AdminPricingPanel({ admin }: { admin: AdminCopy }) {
  const [prices, setPrices] = useState<AdminPlanPrice[]>([]);
  const [promos, setPromos] = useState<AdminPromoCode[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; detail?: string; requestId?: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<PriceDraft | null>(null);
  const [editingPromo, setEditingPromo] = useState<PromoDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleteNote, setDeleteNote] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteBusy = Boolean(pendingDelete && busyKey === `delete:${pendingDelete.kind}:${pendingDelete.kind === 'price' ? pendingDelete.id : pendingDelete.code}`);

  const sortedPrices = useMemo(() => [...prices].sort((a, b) => `${a.planCode}:${a.duration}:${a.currency}`.localeCompare(`${b.planCode}:${b.duration}:${b.currency}`)), [prices]);
  const sortedPromos = useMemo(() => [...promos].sort((a, b) => a.code.localeCompare(b.code)), [promos]);

  const loadData = async () => {
    setError(null);
    try {
      const [fetchedPrices, fetchedPromos] = await Promise.all([
        fetchAdminPrices(),
        fetchAdminPromos(),
      ]);
      setPrices(fetchedPrices);
      setPromos(fetchedPromos);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  async function savePrice() {
    if (!editingPrice) return;
    const payload = pricePayload(editingPrice);
    if (!payload.planCode || !payload.duration || !payload.currency || !Number.isFinite(payload.originalPrice)) {
      setFormError(admin.text('priceValidationRequired'));
      return;
    }
    if (!hasOperatorNote(payload.operatorNote)) {
      setFormError(admin.text('operatorNoteRequired'));
      return;
    }

    setBusyKey(`price:${editingPrice.id || 'new'}`);
    setFormError(null);
    setError(null);
    try {
      if (editingPrice.id) await updateAdminPrice(editingPrice.id, payload);
      else await createAdminPrice(payload);
      setEditingPrice(null);
      await loadData();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function savePromo() {
    if (!editingPromo) return;
    const payload = promoPayload(editingPromo);
    if (!payload.code || payload.code.length < 4 || !payload.discountType || !Number.isFinite(payload.discountValue) || Number(payload.discountValue) <= 0) {
      setFormError(admin.text('promoValidationRequired'));
      return;
    }
    if (!hasOperatorNote(payload.operatorNote)) {
      setFormError(admin.text('operatorNoteRequired'));
      return;
    }

    setBusyKey(`promo:${editingPromo.code || 'new'}`);
    setFormError(null);
    setError(null);
    try {
      if (editingPromo.id || promos.some((promo) => promo.code === payload.code)) await updateAdminPromo(payload.code!, payload);
      else await createAdminPromo(payload);
      setEditingPromo(null);
      await loadData();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    if (!hasOperatorNote(deleteNote)) {
      setDeleteError(admin.text('operatorNoteRequired'));
      return;
    }

    const key = `delete:${pendingDelete.kind}:${pendingDelete.kind === 'price' ? pendingDelete.id : pendingDelete.code}`;
    setBusyKey(key);
    setDeleteError(null);
    setError(null);
    try {
      if (pendingDelete.kind === 'price') await deleteAdminPrice(pendingDelete.id, deleteNote);
      else await deleteAdminPromo(pendingDelete.code, deleteNote);
      setPendingDelete(null);
      setDeleteNote('');
      await loadData();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusyKey(null);
    }
  }

  const closeDeleteDialog = () => {
    if (deleteBusy) return;
    setPendingDelete(null);
    setDeleteNote('');
    setDeleteError(null);
  };

  if (initialLoading && !prices.length && !promos.length) {
    return (
      <div className="flex h-28 items-center justify-center" aria-label={admin.text('pricingOperations')}>
        <RefreshCw size={22} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6" data-testid="admin-pricing-panel">
      <div className="flex flex-col gap-3 border-t border-glass pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-primary">{admin.text('pricingOperations')}</h3>
          <p className="mt-1 text-sm leading-6 text-secondary">{admin.text('pricingOperationsSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={Boolean(busyKey)}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-glass bg-surface-alpha px-3 text-xs font-semibold text-primary transition-colors hover:bg-surface-alpha-hover disabled:opacity-60"
        >
          <RefreshCw size={14} className={busyKey ? 'animate-spin' : ''} />
          {admin.text('refresh')}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">
          <p className="font-semibold">{error.message}</p>
          {error.detail ? <p className="mt-1 text-xs opacity-85">{error.detail}</p> : null}
          {error.requestId ? <p className="mt-1 font-mono text-[11px] opacity-80">requestId: {error.requestId}</p> : null}
        </div>
      ) : null}

      <section className="space-y-3" aria-labelledby="admin-dynamic-pricing-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 id="admin-dynamic-pricing-title" className="text-sm font-bold text-primary">{admin.text('dynamicPricing')}</h4>
            <p className="mt-0.5 text-xs text-secondary">{admin.text('dynamicPricingSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingPromo(null);
              setEditingPrice(newPriceDraft());
              setFormError(null);
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={14} />
            {admin.text('addPrice')}
          </button>
        </div>

        {editingPrice ? (
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-3">
            {formError ? (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold text-amber-700 dark:text-amber-300" role="alert">
                {formError}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-secondary">
                {admin.text('plan')}
                <select
                  value={editingPrice.planCode || 'starter'}
                  onChange={(event) => setEditingPrice({ ...editingPrice, planCode: event.currentTarget.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                >
                  {PLAN_CODES.map((code) => <option key={code} value={code}>{admin.enumLabel(code)}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('duration')}
                <select
                  value={editingPrice.duration || 'monthly'}
                  onChange={(event) => setEditingPrice({ ...editingPrice, duration: event.currentTarget.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                >
                  {PRICE_DURATIONS.map((duration) => <option key={duration} value={duration}>{admin.enumLabel(duration)}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('currency')}
                <select
                  value={String(editingPrice.currency || 'idr').toLowerCase()}
                  onChange={(event) => setEditingPrice({ ...editingPrice, currency: event.currentTarget.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                >
                  {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency.toUpperCase()}</option>)}
                </select>
              </label>
              <label className="flex items-end gap-2 text-xs font-semibold text-secondary">
                <span className="flex-1">
                  {admin.text('active')}
                  <input
                    type="checkbox"
                    checked={editingPrice.isActive !== false}
                    onChange={(event) => setEditingPrice({ ...editingPrice, isActive: event.currentTarget.checked })}
                    className="mt-3 h-5 w-5 rounded border-glass text-blue-600"
                  />
                </span>
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('originalPrice')}
                <input
                  type="number"
                  min="0"
                  value={editingPrice.originalPrice ?? 0}
                  onChange={(event) => setEditingPrice({ ...editingPrice, originalPrice: Number(event.currentTarget.value) })}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('discountPrice')}
                <input
                  type="number"
                  min="0"
                  value={editingPrice.discountPrice ?? ''}
                  onChange={(event) => setEditingPrice({ ...editingPrice, discountPrice: event.currentTarget.value === '' ? null : Number(event.currentTarget.value) })}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                />
              </label>
              <label className="sm:col-span-2 text-xs font-semibold text-secondary">
                {admin.text('operatorNote')}
                <input
                  value={editingPrice.operatorNote || ''}
                  onChange={(event) => setEditingPrice({ ...editingPrice, operatorNote: event.currentTarget.value })}
                  placeholder={admin.text('operatorNotePlaceholder')}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPrice(null)}
                disabled={Boolean(busyKey)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-glass bg-surface-alpha px-3 text-xs font-semibold text-primary transition-colors hover:bg-surface-alpha-hover disabled:opacity-60"
              >
                <X size={14} />
                {admin.text('cancel')}
              </button>
              <button
                type="button"
                onClick={() => void savePrice()}
                disabled={Boolean(busyKey)}
                className="inline-flex h-9 min-w-28 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {busyKey?.startsWith('price:') ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {admin.text('savePrice')}
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm text-secondary">
            <thead className="border-y border-glass text-xs font-bold uppercase text-primary">
              <tr>
                <th className="px-3 py-2">{admin.text('plan')}</th>
                <th className="px-3 py-2">{admin.text('duration')}</th>
                <th className="px-3 py-2">{admin.text('currency')}</th>
                <th className="px-3 py-2 text-right">{admin.text('originalPrice')}</th>
                <th className="px-3 py-2 text-right">{admin.text('discountPrice')}</th>
                <th className="px-3 py-2 text-center">{admin.text('status')}</th>
                <th className="px-3 py-2 text-center">{admin.text('manage')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPrices.map((price) => (
                <tr key={price.id} className="border-b border-glass last:border-0 hover:bg-surface-alpha">
                  <td className="px-3 py-2 font-semibold text-primary">{admin.enumLabel(price.planCode)}</td>
                  <td className="px-3 py-2">{admin.enumLabel(price.duration)}</td>
                  <td className="px-3 py-2 font-semibold text-primary">{price.currency.toUpperCase()}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(price.originalPrice)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-300">{formatNumber(price.discountPrice)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-alpha px-2 py-1 text-[11px] font-semibold text-primary">
                      {price.isActive ? <CheckCircle2 size={12} className="text-emerald-500" /> : null}
                      {price.isActive ? admin.text('active') : admin.text('inactive')}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPromo(null);
                          setEditingPrice({ ...price, operatorNote: '' });
                          setFormError(null);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-500/10"
                        aria-label={`${admin.text('edit')} ${price.planCode} ${price.duration}`}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingDelete({ kind: 'price', id: price.id, label: `${price.planCode} ${price.duration} ${price.currency.toUpperCase()}` });
                          setDeleteNote('');
                          setDeleteError(null);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-500/10"
                        aria-label={`${admin.text('delete')} ${price.planCode} ${price.duration}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedPrices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-secondary">{admin.text('activePricesEmpty')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 border-t border-glass pt-5" aria-labelledby="admin-promo-codes-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 id="admin-promo-codes-title" className="text-sm font-bold text-primary">{admin.text('promoCodes')}</h4>
            <p className="mt-0.5 text-xs text-secondary">{admin.text('promoCodesSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingPrice(null);
              setEditingPromo(newPromoDraft());
              setFormError(null);
            }}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={14} />
            {admin.text('addPromo')}
          </button>
        </div>

        {editingPromo ? (
          <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-3">
            {formError ? (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold text-amber-700 dark:text-amber-300" role="alert">
                {formError}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-secondary">
                {admin.text('promoCode')}
                <input
                  value={editingPromo.code || ''}
                  disabled={Boolean(editingPromo.id)}
                  onChange={(event) => setEditingPromo({ ...editingPromo, code: event.currentTarget.value.toUpperCase() })}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm font-bold tracking-widest text-primary disabled:opacity-70"
                  placeholder="NEWUSER2026"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('discountType')}
                <select
                  value={editingPromo.discountType || 'percentage'}
                  onChange={(event) => setEditingPromo({ ...editingPromo, discountType: event.currentTarget.value as AdminPromoCode['discountType'] })}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                >
                  <option value="percentage">{admin.text('percentageDiscount')}</option>
                  <option value="fixed_amount">{admin.text('fixedAmountDiscount')}</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('discountValue')}
                <input
                  type="number"
                  min="0"
                  value={editingPromo.discountValue ?? 0}
                  onChange={(event) => setEditingPromo({ ...editingPromo, discountValue: Number(event.currentTarget.value) })}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('maxUses')}
                <input
                  type="number"
                  min="1"
                  value={editingPromo.maxUses ?? ''}
                  onChange={(event) => setEditingPromo({ ...editingPromo, maxUses: event.currentTarget.value === '' ? null : Number(event.currentTarget.value) })}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('validUntil')}
                <input
                  type="date"
                  value={editingPromo.validUntil ? editingPromo.validUntil.slice(0, 10) : ''}
                  onChange={(event) => setEditingPromo({ ...editingPromo, validUntil: event.currentTarget.value ? `${event.currentTarget.value}T23:59:59.000Z` : null })}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('validPlanCodes')}
                <input
                  value={(editingPromo.validPlanCodes || []).join(', ')}
                  onChange={(event) => setEditingPromo({ ...editingPromo, validPlanCodes: splitCsv(event.currentTarget.value) })}
                  placeholder="starter, pro"
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('validDurations')}
                <input
                  value={(editingPromo.validDurations || []).join(', ')}
                  onChange={(event) => setEditingPromo({ ...editingPromo, validDurations: splitCsv(event.currentTarget.value) })}
                  placeholder="monthly, yearly"
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                />
              </label>
              <label className="text-xs font-semibold text-secondary">
                {admin.text('active')}
                <input
                  type="checkbox"
                  checked={editingPromo.isActive !== false}
                  onChange={(event) => setEditingPromo({ ...editingPromo, isActive: event.currentTarget.checked })}
                  className="mt-3 h-5 w-5 rounded border-glass text-blue-600"
                />
              </label>
              <label className="sm:col-span-2 lg:col-span-4 text-xs font-semibold text-secondary">
                {admin.text('operatorNote')}
                <input
                  value={editingPromo.operatorNote || ''}
                  onChange={(event) => setEditingPromo({ ...editingPromo, operatorNote: event.currentTarget.value })}
                  placeholder={admin.text('operatorNotePlaceholder')}
                  className="mt-1 h-9 w-full rounded-lg border border-glass bg-[var(--bg-base)] px-2 text-sm text-primary"
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPromo(null)}
                disabled={Boolean(busyKey)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-glass bg-surface-alpha px-3 text-xs font-semibold text-primary transition-colors hover:bg-surface-alpha-hover disabled:opacity-60"
              >
                <X size={14} />
                {admin.text('cancel')}
              </button>
              <button
                type="button"
                onClick={() => void savePromo()}
                disabled={Boolean(busyKey)}
                className="inline-flex h-9 min-w-28 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {busyKey?.startsWith('promo:') ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {admin.text('savePromo')}
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-secondary">
            <thead className="border-y border-glass text-xs font-bold uppercase text-primary">
              <tr>
                <th className="px-3 py-2">{admin.text('promoCode')}</th>
                <th className="px-3 py-2">{admin.text('discount')}</th>
                <th className="px-3 py-2 text-right">{admin.text('currentUses')}</th>
                <th className="px-3 py-2">{admin.text('validUntil')}</th>
                <th className="px-3 py-2 text-center">{admin.text('status')}</th>
                <th className="px-3 py-2 text-center">{admin.text('manage')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPromos.map((promo) => {
                const exhausted = promo.maxUses !== null && promo.currentUses >= promo.maxUses;
                return (
                  <tr key={promo.code} className="border-b border-glass last:border-0 hover:bg-surface-alpha">
                    <td className="px-3 py-2 font-bold tracking-widest text-primary">{promo.code}</td>
                    <td className="px-3 py-2">
                      {promo.discountType === 'percentage' ? `${promo.discountValue}%` : formatNumber(promo.discountValue)}
                    </td>
                    <td className="px-3 py-2 text-right">{promo.currentUses} / {promo.maxUses ?? '-'}</td>
                    <td className="px-3 py-2">{promo.validUntil ? admin.date(promo.validUntil) : '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-alpha px-2 py-1 text-[11px] font-semibold text-primary">
                        {promo.isActive && !exhausted ? <CheckCircle2 size={12} className="text-emerald-500" /> : null}
                        {promo.isActive && !exhausted ? admin.text('active') : exhausted ? admin.text('exhausted') : admin.text('inactive')}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPrice(null);
                            setEditingPromo({ ...promo, operatorNote: '' });
                            setFormError(null);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-500/10"
                          aria-label={`${admin.text('edit')} ${promo.code}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingDelete({ kind: 'promo', code: promo.code, label: promo.code });
                            setDeleteNote('');
                            setDeleteError(null);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-500/10"
                          aria-label={`${admin.text('delete')} ${promo.code}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedPromos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-secondary">{admin.text('promosEmpty')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.kind === 'price' ? admin.text('deletePriceTitle') : admin.text('deletePromoTitle')}
        description={(pendingDelete?.kind === 'price' ? admin.text('deletePriceDescription') : admin.text('deletePromoDescription')).replace('{item}', pendingDelete?.label || '')}
        confirmLabel={admin.text('confirmDelete')}
        cancelLabel={admin.text('cancel')}
        busy={deleteBusy}
        destructive
        testId="admin-pricing-delete-dialog"
        onCancel={closeDeleteDialog}
        onConfirm={confirmDelete}
      >
        <label className="block text-xs font-semibold text-secondary">
          {admin.text('operatorNote')}
          <textarea
            value={deleteNote}
            onChange={(event) => {
              setDeleteNote(event.currentTarget.value);
              setDeleteError(null);
            }}
            placeholder={admin.text('operatorNotePlaceholder')}
            className="mt-1 min-h-20 w-full resize-y rounded-lg border border-glass bg-[var(--bg-base)] px-3 py-2 text-sm text-primary"
          />
        </label>
        {deleteError ? <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{deleteError}</p> : null}
      </ConfirmActionDialog>
    </div>
  );
}
