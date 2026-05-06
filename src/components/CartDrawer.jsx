import { Minus, Plus, Trash2, X, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../lib/CartContext';
import { useEscapeKey, useBodyScrollLock } from '../lib/useEscapeKey';

export default function CartDrawer({ open, onClose }) {
  const { items, removeItem, updateQty, clearCart, subtotal, totalPrice, appliedVoucher, voucherDiscount } = useCart();
  const navigate = useNavigate();

  useEscapeKey(onClose, open);
  useBodyScrollLock(open);

  if (!open) return null;

  function handleCheckout() {
    onClose();
    navigate('/checkout');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg md:max-w-xl rounded-t-[28px] p-5 animate-slide-up max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-border" /></div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-primary" />
            <h2 className="font-bold text-lg text-text-primary">Keranjang</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-surface-secondary text-text-secondary active:scale-95 transition-transform"
            aria-label="Tutup keranjang"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-surface-accent flex items-center justify-center"><ShoppingBag size={24} className="text-primary" /></div>
            <p className="text-text-muted text-sm mt-2">Keranjang masih kosong</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {items.map((item) => (
                <div key={item.key} className="bg-surface-secondary rounded-2xl p-3 flex gap-3">
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-text-primary truncate">{item.product.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {item.options.size} · {item.options.temp} · {item.options.sugar}
                    </p>
                    <p className="text-primary font-bold text-sm mt-1">
                      Rp {((item.price ?? item.product.price) * item.qty).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.key)}
                      className="text-red-400 p-1 active:scale-95 transition-transform"
                      aria-label={`Hapus ${item.product.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.key, item.qty - 1)}
                        className="w-7 h-7 rounded-lg border border-border bg-white flex items-center justify-center text-text-secondary active:scale-95 transition-transform"
                        aria-label="Kurangi"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-semibold text-text-primary w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.key, item.qty + 1)}
                        className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white active:scale-95 transition-transform"
                        aria-label="Tambah"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-border-light">
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Subtotal</span>
                  <span className="text-sm font-semibold text-text-primary">
                    Rp {subtotal.toLocaleString('id-ID')}
                  </span>
                </div>
                
                {appliedVoucher && voucherDiscount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">Diskon ({appliedVoucher.code})</span>
                    <span className="text-sm font-semibold text-green-600">
                      -Rp {voucherDiscount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-border-light">
                  <span className="text-sm font-semibold text-text-secondary">Total</span>
                  <span className="text-lg font-bold text-primary">
                    Rp {totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)]"
              >
                Lanjut ke Checkout
              </button>
              <button
                onClick={() => { clearCart(); onClose(); }}
                className="w-full mt-2.5 text-text-muted py-2.5 text-sm font-medium transition-colors hover:text-error"
              >
                Kosongkan Keranjang
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
