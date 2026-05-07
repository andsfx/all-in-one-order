import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Coffee, Package, CheckCircle, ChevronRight, CreditCard, Loader2, Ban, Check, UtensilsCrossed, LogOut, BarChart3, Megaphone, Store, MapPin, Settings, FileText, Tag } from 'lucide-react';
import { useOrders } from '../lib/OrderContext';
import { useAuth } from '../lib/useAuth';
import { useStore } from '../lib/useStore';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

const STATUSES = ['Semua', 'pending_payment', 'paid', 'preparing', 'ready', 'done', 'cancelled'];

const STATUS_CONFIG = {
  pending_payment: { label: 'Belum Bayar', color: 'bg-orange-100 text-orange-700', icon: CreditCard, next: 'paid' },
  paid: { label: 'Sudah Bayar', color: 'bg-amber-100 text-amber-700', icon: Clock, next: 'preparing' },
  preparing: { label: 'Diproses', color: 'bg-blue-100 text-blue-700', icon: Coffee, next: 'ready' },
  ready: { label: 'Siap', color: 'bg-emerald-100 text-emerald-700', icon: Package, next: 'done' },
  done: { label: 'Selesai', color: 'bg-slate-100 text-slate-500', icon: CheckCircle, next: null },
  cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-500', icon: Ban, next: null },
};

export default function Admin() {
  const { orders, loading, updateStatus } = useOrders();
  const { signOut } = useAuth();
  const { settings } = useStore();
  const { addToast } = useToast();
  const [filter, setFilter] = useState('Semua');
  const [confirming, setConfirming] = useState(null);

  // Store settings
  const [storeOpen, setStoreOpen] = useState(true);
  const [openHour, setOpenHour] = useState('07:00');
  const [closeHour, setCloseHour] = useState('22:00');
  const [savingStore, setSavingStore] = useState(false);

  useEffect(() => {
    supabase.from('store_settings').select('*').then(({ data }) => {
      if (!data) return;
      for (const row of data) {
        if (row.key === 'is_open') setStoreOpen(row.value === 'true');
        if (row.key === 'open_hour') setOpenHour(row.value);
        if (row.key === 'close_hour') setCloseHour(row.value);
      }
    });
  }, []);

  async function handleToggleStore() {
    const newVal = !storeOpen;
    setStoreOpen(newVal);
    await supabase.from('store_settings').update({ value: String(newVal) }).eq('key', 'is_open');
    addToast(newVal ? 'Toko dibuka' : 'Toko ditutup');
  }

  async function handleSaveHours() {
    setSavingStore(true);
    await Promise.all([
      supabase.from('store_settings').update({ value: openHour }).eq('key', 'open_hour'),
      supabase.from('store_settings').update({ value: closeHour }).eq('key', 'close_hour'),
    ]);
    setSavingStore(false);
    addToast('Jam operasional disimpan');
  }

  const filtered = filter === 'Semua' ? orders : orders.filter((o) => o.status === filter);

  function getCount(status) {
    if (status === 'Semua') return orders.length;
    return orders.filter((o) => o.status === status).length;
  }

  return (
    <div className="page-enter min-h-screen bg-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto flex items-center gap-3">
          <Link
            to="/"
            className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold text-text-primary flex-1">Admin Dashboard</h1>
          <button onClick={signOut} className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform" aria-label="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 mt-4">
        {/* Quick Actions */}
        <section className="mb-4 space-y-3">
          <Link
            to="/admin/menu"
            className="w-full bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <UtensilsCrossed size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary text-sm">Kelola Menu</p>
              <p className="text-xs text-text-muted">Tambah, edit, hapus produk & kategori</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </Link>
          <Link
            to="/admin/report"
            className="w-full bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <BarChart3 size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary text-sm">Laporan Penjualan</p>
              <p className="text-xs text-text-muted">Revenue, top items, statistik harian</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </Link>
          <Link
            to="/admin/promo"
            className="w-full bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Megaphone size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary text-sm">Kelola Promo</p>
              <p className="text-xs text-text-muted">Tambah, edit, hapus banner promo</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </Link>
          <Link
            to="/admin/voucher"
            className="w-full bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Tag size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary text-sm">Kelola Voucher</p>
              <p className="text-xs text-text-muted">BOGO, diskon Rp, diskon %</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </Link>
          <Link
            to="/admin/branch"
            className="w-full bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <MapPin size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary text-sm">Kelola Cabang</p>
              <p className="text-xs text-text-muted">Tambah, edit, hapus lokasi cabang</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </Link>
          <Link
            to="/admin/settings"
            className="w-full bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Settings size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary text-sm">Pengaturan</p>
              <p className="text-xs text-text-muted">Branding, password, reset data</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </Link>
          <Link
            to="/admin/audit"
            className="w-full bg-white rounded-2xl p-4 shadow-[var(--shadow-card)] flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-text-primary text-sm">Audit Log</p>
              <p className="text-xs text-text-muted">Riwayat perubahan order</p>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </Link>
        </section>

        {/* Jam Operasional */}
        <section className="mb-4 bg-white rounded-2xl p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Store size={18} className="text-primary" />
              <h2 className="font-semibold text-text-primary text-sm">Jam Operasional</h2>
            </div>
            <button
              onClick={handleToggleStore}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${storeOpen ? 'bg-primary' : 'bg-border'}`}
              aria-label={storeOpen ? 'Tutup toko' : 'Buka toko'}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${storeOpen ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className={`flex items-center gap-3 ${!storeOpen ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex-1">
              <label className="text-xs font-medium text-text-muted block mb-1">Buka</label>
              <input
                type="time"
                value={openHour}
                onChange={(e) => setOpenHour(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
              />
            </div>
            <span className="text-text-muted mt-5">—</span>
            <div className="flex-1">
              <label className="text-xs font-medium text-text-muted block mb-1">Tutup</label>
              <input
                type="time"
                value={closeHour}
                onChange={(e) => setCloseHour(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-secondary text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/30"
              />
            </div>
            <button
              onClick={handleSaveHours}
              disabled={savingStore}
              className="mt-5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60"
            >
              {savingStore ? '...' : 'Simpan'}
            </button>
          </div>

          <p className={`text-xs mt-2 font-medium ${storeOpen ? 'text-success' : 'text-error'}`}>
            {storeOpen ? `Toko buka ${openHour} - ${closeHour}` : 'Toko sedang ditutup manual'}
          </p>
        </section>

        {/* Filter Tabs */}
        <section className="flex gap-2 overflow-x-auto scrollbar-hide">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary text-white'
                  : 'bg-surface-secondary text-text-secondary hover:bg-surface-accent'
              }`}
            >
              {status === 'Semua' ? 'Semua' : STATUS_CONFIG[status].label} ({getCount(status)})
            </button>
          ))}
        </section>

        {/* Orders List */}
        <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="ml-2 text-text-muted text-sm">Memuat pesanan...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl">📋</p>
              <p className="text-text-muted text-sm mt-2">Belum ada pesanan</p>
            </div>
          ) : (
            filtered.map((order) => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_payment;
              const Icon = config.icon;
              return (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-text-primary">{order.id}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(order.createdAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${config.color}`}>
                      <Icon size={12} />
                      {config.label}
                    </span>
                  </div>

                  {/* Customer */}
                  <div className="text-sm mb-3 bg-surface-secondary rounded-xl p-3">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Pelanggan</span>
                      <span className="font-medium text-text-primary">{order.customer.name}</span>
                    </div>
                    {order.customer.note && (
                      <div className="flex justify-between mt-1">
                        <span className="text-text-secondary">Catatan</span>
                        <span className="font-medium text-text-primary text-right max-w-[60%]">{order.customer.note}</span>
                      </div>
                    )}
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5 mb-3">
                    {order.items.map((item) => (
                      <div key={item.key} className="flex justify-between text-sm">
                        <span className="text-text-secondary">
                          {item.product.name} &times;{item.qty}
                        </span>
                        <span className="text-text-secondary">
                          Rp {((item.price ?? item.product.price) * item.qty).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total + Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-border-light">
                    <div>
                      <span className="font-bold text-primary">
                        Rp {(order.amountToPay ?? order.total).toLocaleString('id-ID')}
                      </span>
                      {order.uniqueCode != null && order.amountToPay > order.total && (
                        <p className="text-xs text-text-muted mt-0.5">
                          Rp {order.total.toLocaleString('id-ID')} + kode unik {order.uniqueCode}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {order.status !== 'done' && order.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            if (window.confirm('Yakin ingin membatalkan pesanan ini?')) {
                              updateStatus(order.id, 'cancelled');
                              addToast('Pesanan dibatalkan');
                            }
                          }}
                          className="flex items-center gap-1 bg-red-500 text-white px-3 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                        >
                          <Ban size={14} />
                          Batalkan
                        </button>
                      )}
                      {order.status === 'pending_payment' && (
                        <button
                          disabled={confirming === order.id}
                          onClick={async () => {
                            setConfirming(order.id);
                            try {
                              const { error } = await supabase.functions.invoke('confirm-payment', {
                                body: { order_id: order.id },
                              });
                              if (error) throw error;
                              addToast('Pembayaran dikonfirmasi');
                              // Open WhatsApp notification
                              const waNum = settings.admin_whatsapp;
                              if (waNum) {
                                const items = order.items.map(i => `• ${i.product.name} x${i.qty}`).join('\n');
                                const payAmount = order.amountToPay ?? order.total;
                                const uniquePart = order.uniqueCode != null && order.amountToPay > order.total ? ` (termasuk kode unik ${order.uniqueCode})` : '';
                                const msg = `*Pesanan Baru Dikonfirmasi!*\n\nOrder: ${order.id}\nCustomer: ${order.customer.name}\n\n${items}\n\nBayar: Rp ${payAmount.toLocaleString('id-ID')}${uniquePart}`;
                                window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
                              }
                            } catch {
                              addToast('Gagal konfirmasi pembayaran', 'error');
                            } finally {
                              setConfirming(null);
                            }
                          }}
                          className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60"
                        >
                          {confirming === order.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Konfirmasi Bayar
                        </button>
                      )}
                      {config.next && order.status !== 'pending_payment' && (
                        <button
                          onClick={() => { updateStatus(order.id, config.next); addToast(`Status diubah ke ${STATUS_CONFIG[config.next].label}`); }}
                          className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                        >
                          {STATUS_CONFIG[config.next].label}
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
