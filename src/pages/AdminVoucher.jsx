import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, X, Tag, Calendar, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validateVoucherCode, validatePriceInt, validateIntInRange } from '../lib/validation';

export default function AdminVoucher() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'bogo',
    discount_value: '',
    min_purchase: '',
    usage_limit: '',
    valid_from: '',
    valid_to: '',
    is_active: true,
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  async function fetchVouchers() {
    setLoading(true);
    const { data } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });
    setVouchers(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setForm({
      code: '',
      type: 'bogo',
      discount_value: '',
      min_purchase: '0',
      usage_limit: '100',
      valid_from: now.toISOString().slice(0, 16),
      valid_to: nextMonth.toISOString().slice(0, 16),
      is_active: true,
    });
    setShowForm(true);
  }

  function openEdit(voucher) {
    setEditing(voucher);
    setForm({
      code: voucher.code,
      type: voucher.type,
      discount_value: voucher.discount_value ? String(voucher.discount_value) : '',
      min_purchase: String(voucher.min_purchase),
      usage_limit: String(voucher.usage_limit),
      valid_from: new Date(voucher.valid_from).toISOString().slice(0, 16),
      valid_to: new Date(voucher.valid_to).toISOString().slice(0, 16),
      is_active: voucher.is_active,
    });
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const codeCheck = validateVoucherCode(form.code);
      if (!codeCheck.ok) {
        alert(codeCheck.message);
        setSaving(false);
        return;
      }

      let discountValue = 0;
      if (form.type !== 'bogo') {
        if (form.type === 'percentage') {
          const discCheck = validateIntInRange(form.discount_value, { min: 1, max: 100, label: 'Diskon persen' });
          if (!discCheck.ok) { alert(discCheck.message); setSaving(false); return; }
          discountValue = discCheck.value;
        } else {
          const discCheck = validatePriceInt(form.discount_value, { min: 1, max: 100_000_000, label: 'Nilai diskon' });
          if (!discCheck.ok) { alert(discCheck.message); setSaving(false); return; }
          discountValue = discCheck.value;
        }
      }

      const minPurchaseCheck = validatePriceInt(form.min_purchase, { min: 0, max: 100_000_000, label: 'Min. pembelian' });
      if (!minPurchaseCheck.ok) { alert(minPurchaseCheck.message); setSaving(false); return; }

      const usageLimitCheck = validateIntInRange(form.usage_limit, { min: 1, max: 1_000_000, label: 'Batas penggunaan' });
      if (!usageLimitCheck.ok) { alert(usageLimitCheck.message); setSaving(false); return; }

      const payload = {
        code: codeCheck.value,
        type: form.type,
        discount_value: discountValue,
        min_purchase: minPurchaseCheck.value,
        usage_limit: usageLimitCheck.value,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_to: new Date(form.valid_to).toISOString(),
        is_active: form.is_active,
      };

      if (editing) {
        await supabase.from('vouchers').update(payload).eq('id', editing.id);
      } else {
        await supabase.from('vouchers').insert(payload);
      }

      setShowForm(false);
      fetchVouchers();
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(voucher) {
    if (!confirm(`Hapus voucher "${voucher.code}"?`)) return;
    await supabase.from('vouchers').delete().eq('id', voucher.id);
    fetchVouchers();
  }

  function getTypeLabel(type) {
    if (type === 'bogo') return 'Buy 1 Get 1';
    if (type === 'fixed') return 'Diskon Rp';
    if (type === 'percentage') return 'Diskon %';
    return type;
  }

  function getDiscountLabel(voucher) {
    if (voucher.type === 'bogo') return 'Item termurah gratis';
    if (voucher.type === 'fixed') return `Rp ${voucher.discount_value.toLocaleString('id-ID')}`;
    if (voucher.type === 'percentage') return `${voucher.discount_value}%`;
    return '-';
  }

  function isExpired(voucher) {
    return new Date(voucher.valid_to) < new Date();
  }

  function isUsedUp(voucher) {
    return voucher.usage_count >= voucher.usage_limit;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-enter min-h-screen bg-white pb-20">
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-lg font-bold text-text-primary">Kelola Voucher</h1>
          </div>
          <button
            onClick={openAdd}
            className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Plus size={16} /> Tambah
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-4">
        {vouchers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-surface-accent flex items-center justify-center mx-auto">
              <Tag size={24} className="text-primary" />
            </div>
            <p className="text-text-secondary mt-4">Belum ada voucher</p>
            <button
              onClick={openAdd}
              className="mt-4 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold active:scale-95 transition-transform"
            >
              Buat Voucher Pertama
            </button>
          </div>
        ) : (
          <section className="space-y-3">
            {vouchers.map((voucher) => {
              const expired = isExpired(voucher);
              const usedUp = isUsedUp(voucher);
              const inactive = !voucher.is_active || expired || usedUp;

              return (
                <div
                  key={voucher.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border ${
                    inactive ? 'border-border-light opacity-60' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-text-primary text-lg">{voucher.code}</h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {getTypeLabel(voucher.type)}
                        </span>
                        {!voucher.is_active && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            Nonaktif
                          </span>
                        )}
                        {expired && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                            Kadaluarsa
                          </span>
                        )}
                        {usedUp && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                            Habis
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={14} />
                          <span>Diskon: {getDiscountLabel(voucher)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={14} />
                          <span>
                            Digunakan: {voucher.usage_count}/{voucher.usage_limit} kali
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          <span>
                            Berlaku: {new Date(voucher.valid_from).toLocaleDateString('id-ID')} -{' '}
                            {new Date(voucher.valid_to).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        {voucher.min_purchase > 0 && (
                          <div className="text-xs text-text-muted">
                            Min. pembelian: Rp {voucher.min_purchase.toLocaleString('id-ID')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => openEdit(voucher)}
                        className="p-2 rounded-xl bg-surface-secondary text-text-secondary hover:bg-primary/10 hover:text-primary active:scale-95 transition-all"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(voucher)}
                        className="p-2 rounded-xl bg-surface-secondary text-text-secondary hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div
            className="bg-white w-full max-w-lg rounded-t-[28px] p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-text-primary">{editing ? 'Edit Voucher' : 'Tambah Voucher'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl bg-surface-secondary text-text-secondary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Kode Voucher</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="BOGO50"
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30 uppercase"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Tipe Voucher</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30"
                >
                  <option value="bogo">Buy 1 Get 1 (Item termurah gratis)</option>
                  <option value="fixed">Diskon Fixed (Rp)</option>
                  <option value="percentage">Diskon Persentase (%)</option>
                </select>
              </div>

              {form.type !== 'bogo' && (
                <div>
                  <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                    Nilai Diskon {form.type === 'fixed' ? '(Rp)' : '(%)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={form.type === 'percentage' ? '100' : undefined}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    placeholder={form.type === 'fixed' ? '10000' : '20'}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Minimum Pembelian (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={form.min_purchase}
                  onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                  placeholder="0"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Batas Penggunaan (kali)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.usage_limit}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                  placeholder="100"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Berlaku Dari</label>
                <input
                  type="datetime-local"
                  required
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-secondary mb-1.5 block">Berlaku Sampai</label>
                <input
                  type="datetime-local"
                  required
                  value={form.valid_to}
                  onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm border border-transparent outline-none focus:border-primary/30"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-700"
                />
                <label htmlFor="is_active" className="text-sm text-text-secondary">
                  Voucher aktif
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Menyimpan...
                  </>
                ) : editing ? (
                  'Simpan Perubahan'
                ) : (
                  'Tambah Voucher'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
