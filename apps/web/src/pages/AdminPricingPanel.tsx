import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Tag, DollarSign, Save, X, RefreshCw } from 'lucide-react';
import {
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

export function AdminPricingPanel() {
  const [prices, setPrices] = useState<AdminPlanPrice[]>([]);
  const [promos, setPromos] = useState<AdminPromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingPrice, setEditingPrice] = useState<Partial<AdminPlanPrice> | null>(null);
  const [editingPromo, setEditingPromo] = useState<Partial<AdminPromoCode> | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedPrices, fetchedPromos] = await Promise.all([
        fetchAdminPrices(),
        fetchAdminPromos()
      ]);
      setPrices(fetchedPrices);
      setPromos(fetchedPromos);
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSavePrice = async () => {
    if (!editingPrice?.plan_code || !editingPrice?.duration || !editingPrice?.currency) {
      alert('Plan code, duration, and currency are required.');
      return;
    }
    setLoading(true);
    try {
      if (editingPrice.id) {
        await updateAdminPrice(editingPrice.id, editingPrice);
      } else {
        await createAdminPrice(editingPrice);
      }
      setEditingPrice(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save price');
      setLoading(false);
    }
  };

  const handleDeletePrice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this price?')) return;
    setLoading(true);
    try {
      await deleteAdminPrice(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete price');
      setLoading(false);
    }
  };

  const handleSavePromo = async () => {
    if (!editingPromo?.code || !editingPromo?.discount_amount) {
      alert('Promo code and discount amount are required.');
      return;
    }
    setLoading(true);
    try {
      if (editingPromo.id) {
        await updateAdminPromo(editingPromo.code, editingPromo);
      } else {
        await createAdminPromo(editingPromo);
      }
      setEditingPromo(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save promo code');
      setLoading(false);
    }
  };

  const handleDeletePromo = async (code: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    setLoading(true);
    try {
      await deleteAdminPromo(code);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete promo');
      setLoading(false);
    }
  };

  if (loading && !prices.length && !promos.length) {
    return (
      <div className="flex h-32 items-center justify-center">
        <RefreshCw size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Plan Prices Section */}
      <div className="rounded-3xl border border-glass shadow-sm backdrop-blur-md bg-[var(--bg-base)]/76 p-4 lg:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <DollarSign size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">Dynamic Pricing</h3>
              <p className="text-sm text-secondary">Manage real-time plan prices across regions.</p>
            </div>
          </div>
          <button
            onClick={() => setEditingPrice({ plan_code: 'starter', duration: 'monthly', currency: 'IDR', original_price: 0, discounted_price: 0, discount_pct: 0, save_label: { en: '', id: '' } })}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            <Plus size={16} /> Add Price
          </button>
        </div>

        {editingPrice && (
          <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-50/50 p-5 dark:bg-blue-900/10">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-secondary">Plan Code</label>
                <select
                  value={editingPrice.plan_code}
                  onChange={(e) => setEditingPrice({ ...editingPrice, plan_code: e.target.value })}
                  className="w-full rounded-lg border border-glass bg-white px-3 py-2 text-sm text-primary dark:bg-slate-800"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="team">Team</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-secondary">Duration</label>
                <select
                  value={editingPrice.duration}
                  onChange={(e) => setEditingPrice({ ...editingPrice, duration: e.target.value })}
                  className="w-full rounded-lg border border-glass bg-white px-3 py-2 text-sm text-primary dark:bg-slate-800"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-secondary">Currency</label>
                <input
                  type="text"
                  value={editingPrice.currency}
                  onChange={(e) => setEditingPrice({ ...editingPrice, currency: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-glass bg-white px-3 py-2 text-sm text-primary dark:bg-slate-800"
                  placeholder="IDR, USD"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-secondary">Original Price</label>
                <input
                  type="number"
                  value={editingPrice.original_price}
                  onChange={(e) => setEditingPrice({ ...editingPrice, original_price: Number(e.target.value) })}
                  className="w-full rounded-lg border border-glass bg-white px-3 py-2 text-sm text-primary dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-secondary">Discounted Price</label>
                <input
                  type="number"
                  value={editingPrice.discounted_price}
                  onChange={(e) => setEditingPrice({ ...editingPrice, discounted_price: Number(e.target.value) })}
                  className="w-full rounded-lg border border-glass bg-white px-3 py-2 text-sm text-primary dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-secondary">Discount %</label>
                <input
                  type="number"
                  value={editingPrice.discount_pct}
                  onChange={(e) => setEditingPrice({ ...editingPrice, discount_pct: Number(e.target.value) })}
                  className="w-full rounded-lg border border-glass bg-white px-3 py-2 text-sm text-primary dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingPrice(null)}
                className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-bold text-secondary hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={handleSavePrice}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Save size={16} /> Save Price
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-secondary">
            <thead className="border-b border-glass text-xs font-bold uppercase text-primary">
              <tr>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 text-right">Original</th>
                <th className="px-4 py-3 text-right">Discounted</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((price) => (
                <tr key={price.id} className="border-b border-glass last:border-0 hover:bg-surface-alpha">
                  <td className="px-4 py-3 font-medium text-primary capitalize">{price.plan_code}</td>
                  <td className="px-4 py-3 capitalize">{price.duration}</td>
                  <td className="px-4 py-3 font-medium text-primary">{price.currency}</td>
                  <td className="px-4 py-3 text-right line-through opacity-70">{price.original_price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">{price.discounted_price.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setEditingPrice(price)} className="text-blue-500 hover:text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeletePrice(price.id)} className="text-red-500 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {prices.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-secondary">No custom prices configured. Using static fallbacks.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promo Codes Section */}
      <div className="rounded-3xl border border-glass shadow-sm backdrop-blur-md bg-[var(--bg-base)]/76 p-4 lg:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary">Promo Codes</h3>
              <p className="text-sm text-secondary">Manage discount vouchers for checkouts.</p>
            </div>
          </div>
          <button
            onClick={() => setEditingPromo({ code: '', discount_amount: 0, discount_type: 'percent', max_uses: 100, current_uses: 0 })}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-700"
          >
            <Plus size={16} /> Add Promo
          </button>
        </div>

        {editingPromo && (
          <div className="mb-6 rounded-2xl border border-purple-500/30 bg-purple-50/50 p-5 dark:bg-purple-900/10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-secondary">Promo Code</label>
                <input
                  type="text"
                  value={editingPromo.code}
                  onChange={(e) => setEditingPromo({ ...editingPromo, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-lg border border-glass bg-white px-3 py-2 text-sm font-bold tracking-widest text-primary dark:bg-slate-800"
                  placeholder="NEWUSER2026"
                  disabled={!!editingPromo.id}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-secondary">Discount Type</label>
                <select
                  value={editingPromo.discount_type}
                  onChange={(e) => setEditingPromo({ ...editingPromo, discount_type: e.target.value as 'percent' | 'fixed' })}
                  className="w-full rounded-lg border border-glass bg-white px-3 py-2 text-sm text-primary dark:bg-slate-800"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-secondary">Discount Amount</label>
                <input
                  type="number"
                  value={editingPromo.discount_amount}
                  onChange={(e) => setEditingPromo({ ...editingPromo, discount_amount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-glass bg-white px-3 py-2 text-sm text-primary dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-secondary">Max Uses</label>
                <input
                  type="number"
                  value={editingPromo.max_uses}
                  onChange={(e) => setEditingPromo({ ...editingPromo, max_uses: Number(e.target.value) })}
                  className="w-full rounded-lg border border-glass bg-white px-3 py-2 text-sm text-primary dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingPromo(null)}
                className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-bold text-secondary hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} /> Cancel
              </button>
              <button
                onClick={handleSavePromo}
                className="flex items-center gap-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
              >
                <Save size={16} /> Save Promo
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-secondary">
            <thead className="border-b border-glass text-xs font-bold uppercase text-primary">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Uses</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => {
                const isExhausted = promo.current_uses >= promo.max_uses;
                return (
                  <tr key={promo.id} className="border-b border-glass last:border-0 hover:bg-surface-alpha">
                    <td className="px-4 py-3 font-bold tracking-widest text-primary">{promo.code}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {promo.discount_type === 'percent' ? `${promo.discount_amount}%` : promo.discount_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {promo.current_uses} / {promo.max_uses}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${isExhausted ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {isExhausted ? 'Exhausted' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setEditingPromo(promo)} className="text-blue-500 hover:text-blue-600"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeletePromo(promo.code)} className="text-red-500 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {promos.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-secondary">No promo codes active.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
