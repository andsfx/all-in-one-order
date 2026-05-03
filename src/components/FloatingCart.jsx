import { ShoppingBag } from 'lucide-react';
import { useCart } from '../lib/CartContext';

export default function FloatingCart({ onCheckout }) {
  const { totalItems, totalPrice } = useCart();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 right-5 z-50 max-w-lg mx-auto animate-slide-up">
      <button
        onClick={onCheckout}
        className="w-full bg-primary text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-[0_8px_32px_rgba(0,96,65,0.25)] active:scale-[0.98] transition-transform duration-150"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-xl p-2">
            <ShoppingBag size={18} />
          </div>
          <div className="text-left">
            <span className="font-semibold text-sm count-pop block" key={totalItems}>{totalItems} item</span>
            <span className="text-white/60 text-[10px]">Tap untuk checkout</span>
          </div>
        </div>
        <span className="font-bold text-sm">
          Rp {totalPrice.toLocaleString('id-ID')}
        </span>
      </button>
    </div>
  );
}
