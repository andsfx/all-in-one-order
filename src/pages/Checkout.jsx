import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, User, MessageSquare, Loader2, AlertCircle, Tag, X, Mail, MapPin, Phone, Hash, Store } from 'lucide-react';
import { useCart } from '../lib/CartContext';
import { useOrders } from '../lib/OrderContext';
import { useStoreStatus } from '../lib/useStoreStatus';
import { useVoucher } from '../lib/useVoucher';
import { checkRateLimit, formatTimeRemaining } from '../lib/rateLimit';
import { useToast } from '../components/Toast';

/**
 * Detect fulfillment type from cart items.
 * - digital: all items are digital products
 * - delivery: any physical product present
 * - null: food/beverage only — user picks dine_in or takeaway
 */
function detectFulfillmentType(items) {
  const types = new Set(items.map((i) => i.product?.product_type).filter(Boolean));
  if (types.has('digital')) return 'digital';
  if (types.has('physical')) return 'delivery';
  // food/beverage: let user choose dine_in or takeaway
  return null;
}

/** Format item options for display, handling both old and new cart structures */
function formatItemOptions(item) {
  // New structure: selectedOptions is an object like { size: 'Large', sweetness: 'Normal' }
  if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
    return Object.values(item.selectedOptions).filter(Boolean).join(' · ');
  }
  // Old structure: item.options with size/sweetness/iceCube
  if (item.options) {
    return [item.options.size, item.options.sweetness, item.options.iceCube].filter(Boolean).join(' · ');
  }
  // Variant name fallback
  if (item.variant?.name) return item.variant.name;
  return '';
}

export default function Checkout() {
  const { items, subtotal, totalPrice, appliedVoucher, voucherDiscount, applyVoucher, removeVoucher, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { isOpen, loading: storeLoading } = useStoreStatus();
  const { validateVoucher, calculateDiscount } = useVoucher();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Redirect to home if store is closed
  useEffect(() => {
    if (!storeLoading && !isOpen) {
      navigate('/', { replace: true });
    }
  }, [storeLoading, isOpen, navigate]);

  // Detect fulfillment type from cart content
  const autoFulfillment = useMemo(() => detectFulfillmentType(items), [items]);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [voucherCode, setVoucherCode] = useState('');
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Fulfillment-specific fields
  const [fulfillmentChoice, setFulfillmentChoice] = useState('dine_in'); // for food/beverage
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');

  // Resolved fulfillment type: auto-detected or user-chosen
  const fulfillmentType = autoFulfillment || fulfillmentChoice;

  async function handleApplyVoucher() {
    if (!voucherCode.trim()) {
      addToast('Masukkan kode voucher', 'error');
      return;
    }

    setApplyingVoucher(true);
    try {
      const { valid, voucher, error: voucherError } = await validateVoucher(voucherCode, subtotal);
      
      if (!valid) {
        addToast(voucherError, 'error');
        return;
      }

      const discount = calculateDiscount(voucher, items, subtotal);
      applyVoucher(voucher, discount);
      addToast(`Voucher ${voucher.code} berhasil digunakan!`);
      setVoucherCode('');
    } catch (err) {
      addToast('Gagal memvalidasi voucher', 'error');
    } finally {
      setApplyingVoucher(false);
    }
  }

  function handleRemoveVoucher() {
    removeVoucher();
    addToast('Voucher dihapus');
  }

  function validateFulfillmentFields() {
    switch (fulfillmentType) {
      case 'digital':
        if (!deliveryEmail.trim()) return 'Email wajib diisi untuk produk digital';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryEmail.trim())) return 'Format email tidak valid';
        break;
      case 'delivery':
        if (!deliveryAddress.trim()) return 'Alamat pengiriman wajib diisi';
        if (!deliveryPhone.trim()) return 'Nomor telepon wajib diisi';
        break;
      case 'dine_in':
        if (!tableNumber.trim()) return 'Nomor meja wajib diisi';
        break;
      case 'takeaway':
        // No extra fields needed
        break;
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');

    if (!name.trim()) {
      setError('Nama wajib diisi');
      return;
    }

    // Validate fulfillment-specific fields
    const fulfillmentError = validateFulfillmentFields();
    if (fulfillmentError) {
      setError(fulfillmentError);
      return;
    }

    // Check rate limit before placing order
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      const timeRemaining = formatTimeRemaining(rateLimit.resetAt);
      setError(`Terlalu banyak pesanan. Silakan coba lagi dalam ${timeRemaining}.`);
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
        fulfillmentType,
        deliveryEmail: fulfillmentType === 'digital' ? deliveryEmail.trim() : null,
        deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress.trim() : null,
        deliveryPhone: fulfillmentType === 'delivery' ? deliveryPhone.trim() : null,
        tableNumber: fulfillmentType === 'dine_in' ? tableNumber.trim() : null,
      }, appliedVoucher, voucherDiscount);
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
        <div className="max-w-lg md:max-w-xl mx-auto flex items-center gap-3">
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

      <main className="max-w-lg md:max-w-xl mx-auto px-4 mt-4">
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
                  {formatItemOptions(item) && (
                    <p className="text-xs text-text-muted">
                      {formatItemOptions(item)}
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold text-text-primary ml-3">
                  Rp {((item.price ?? item.product.price) * item.qty).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border-light">
            {voucherDiscount > 0 && (
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-secondary">Subtotal</span>
                <span className="text-text-primary">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
            )}
            {voucherDiscount > 0 && (
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-emerald-600 font-medium">Diskon Voucher</span>
                <span className="text-emerald-600 font-semibold">-Rp {voucherDiscount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-primary">Total</span>
              <span className="text-lg font-bold text-primary">
                Rp {totalPrice.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </section>

        {/* Voucher Section */}
        <section className="mt-4 bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={18} className="text-primary" />
            <h2 className="font-bold text-text-primary">Voucher</h2>
          </div>

          {appliedVoucher ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-700">{appliedVoucher.code}</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Hemat Rp {voucherDiscount.toLocaleString('id-ID')}
                </p>
              </div>
              <button
                onClick={handleRemoveVoucher}
                className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 active:scale-95 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="Masukkan kode voucher"
                maxLength={50}
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/30 uppercase"
              />
              <button
                onClick={handleApplyVoucher}
                disabled={applyingVoucher || !voucherCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 flex items-center gap-1.5"
              >
                {applyingVoucher ? <Loader2 size={14} className="animate-spin" /> : null}
                Gunakan
              </button>
            </div>
          )}
        </section>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="font-bold text-text-primary">Informasi Pelanggan</h2>

          {error && (
            <div className="flex items-start gap-2 text-red-500 text-sm bg-red-50 px-3 py-2 rounded-xl">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
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

          {/* Fulfillment Type Selection — only for food/beverage (autoFulfillment is null) */}
          {autoFulfillment === null && (
            <div>
              <p className="text-sm font-semibold text-text-primary mb-2">Tipe Pesanan</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFulfillmentChoice('dine_in')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    fulfillmentChoice === 'dine_in'
                      ? 'bg-primary text-white'
                      : 'bg-surface-secondary text-text-secondary'
                  }`}
                >
                  <Store size={14} /> Dine In
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentChoice('takeaway')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    fulfillmentChoice === 'takeaway'
                      ? 'bg-primary text-white'
                      : 'bg-surface-secondary text-text-secondary'
                  }`}
                >
                  <ShoppingBag size={14} /> Takeaway
                </button>
              </div>
            </div>
          )}

          {/* Dine-in: Table Number */}
          {fulfillmentType === 'dine_in' && (
            <div>
              <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5 mb-1.5">
                <Hash size={14} /> Nomor Meja
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Contoh: 5"
                maxLength={10}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/30"
              />
            </div>
          )}

          {/* Digital: Email */}
          {fulfillmentType === 'digital' && (
            <div>
              <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5 mb-1.5">
                <Mail size={14} /> Email
              </label>
              <input
                type="email"
                value={deliveryEmail}
                onChange={(e) => setDeliveryEmail(e.target.value)}
                placeholder="email@contoh.com"
                maxLength={100}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/30"
              />
              <p className="text-xs text-text-muted mt-1">Produk digital akan dikirim ke email ini</p>
            </div>
          )}

          {/* Delivery: Address + Phone */}
          {fulfillmentType === 'delivery' && (
            <>
              <div>
                <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5 mb-1.5">
                  <MapPin size={14} /> Alamat Pengiriman
                </label>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Alamat lengkap untuk pengiriman"
                  rows={3}
                  maxLength={300}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/30 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary flex items-center gap-1.5 mb-1.5">
                  <Phone size={14} /> Nomor Telepon
                </label>
                <input
                  type="tel"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  maxLength={20}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-secondary text-sm text-text-primary placeholder:text-text-muted outline-none border border-transparent focus:border-primary/30"
                />
              </div>
            </>
          )}

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
