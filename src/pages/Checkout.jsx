import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, User, MessageSquare, Loader2 } from 'lucide-react';
import { useCart } from '../lib/CartContext';
import { useOrders } from '../lib/OrderContext';
import { useStoreStatus } from '../lib/useStoreStatus';

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { isOpen, loading: storeLoading } = useStoreStatus();
  const navigate = useNavigate();

  // Redirect to home if store is closed
  useEffect(() => {
    if (!storeLoading && !isOpen) {
      navigate('/', { replace: true });
    }
  }, [storeLoading, isOpen, navigate]);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');

    if (!name.trim()) {
      setError('Nama wajib diisi');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const savedBranch = localStorage.getItem('selected-branch');
      const branchId = savedBranch ? JSON.parse(savedBranch).id : null;
      const order = await placeOrder(items, {
        name: name.trim(),
        note: note.trim(),
        paymentMethod,
        branchId,
      });
      clearCart();
      navigate(`/order/${order.id}`);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat membuat pesanan');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-accent flex items-center justify-center"><ShoppingBag size={24} className="text-primary" /></div>
        <h1 className="text-xl font-bold text-text-primary mt-4">Keranjang Kosong</h1>
        <p className="text-text-secondary mt-2 text-sm">Tambahkan menu dulu sebelum checkout.</p>
        <Link
          to="/"
          className="mt-6 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          Lihat Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="page-enter min-h-screen bg-white pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border-light px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full bg-surface-secondary text-text-secondary active:scale-95 transition-transform"
            aria-label="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Checkout</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 mt-4">
        {/* Ringkasan Pesanan */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={18} className="text-primary" />
            <h2 className="font-bold text-text-primary">Ringkasan Pesanan</h2>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {item.product.name} <span className="text-text-muted">×{item.qty}</span>
                  </p>
                  <p className="text-xs text-text-muted">
                    {item.options.size} · {item.options.temp} · {item.options.sugar}
                  </p>
                </div>
                <p className="text-sm font-semibold text-text-primary ml-3">
                  Rp {((item.price ?? item.product.price) * item.qty).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border-light flex items-center justify-between">
            <span className="font-semibold text-text-primary">Total</span>
            <span className="text-lg font-bold text-primary">
              Rp {totalPrice.toLocaleString('id-ID')}
            </span>
          </div>
        </section>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-text-primary">Informasi Pelanggan</h2>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <div>
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5 mb-1.5">
              <User size={14} /> Nama
            </label>
            <input
              id="customer-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama kamu"
              maxLength={50}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/30"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5 mb-1.5">
              <MessageSquare size={14} /> Catatan (opsional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Gula dikit aja ya..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/30 resize-none"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-text-primary mb-2">Metode Pembayaran</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  paymentMethod === 'qris'
                    ? 'bg-primary text-white'
                    : 'bg-surface-secondary text-text-secondary'
                }`}
              >
                💳 QRIS
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  paymentMethod === 'cash'
                    ? 'bg-primary text-white'
                    : 'bg-surface-secondary text-text-secondary'
                }`}
              >
                💵 Bayar di Kasir
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)] disabled:opacity-60 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Memproses...
              </>
            ) : (
              'Konfirmasi Pesanan'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
