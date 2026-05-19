import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { calculateItemPrice } from './priceEngine';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'aio-cart';
const MAX_QTY = 20;

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];
    const items = JSON.parse(saved);
    if (!Array.isArray(items)) return [];
    // Migration: clear old cart format (items with hardcoded options.size or no variant)
    if (items.some((item) => item.options?.size || !item.variant)) {
      console.warn('[CartContext] Detected old cart format, clearing cart');
      return [];
    }
    return items;
  } catch {
    return [];
  }
}

export function createCartKey(variant, selectedOptions = {}) {
  const sortedOptions = Object.keys(selectedOptions)
    .sort()
    .reduce((acc, k) => ({ ...acc, [k]: selectedOptions[k] }), {});
  return `${variant.id}-${JSON.stringify(sortedOptions)}`;
}

export function getPrice(product, variant, selectedOptions = {}, optionTemplates = {}) {
  return calculateItemPrice(product, variant, selectedOptions, optionTemplates);
}

export function validateMixedCart(currentItems, newProductType, storeSettings = {}) {
  if (storeSettings.allow_mixed_cart === 'false' && currentItems.length > 0) {
    const hasMismatch = currentItems.some((item) => item.product.product_type !== newProductType);
    if (hasMismatch) {
      return {
        valid: false,
        error: 'Tidak bisa mencampur tipe produk berbeda dalam satu keranjang',
      };
    }
  }
  return { valid: true };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Clear voucher when cart changes
  useEffect(() => {
    if (appliedVoucher && items.length === 0) {
      setAppliedVoucher(null);
      setVoucherDiscount(0);
    }
  }, [items, appliedVoucher]);

  function addItem(product, variant, selectedOptions = {}, optionTemplates = {}, storeSettings = {}) {
    const validation = validateMixedCart(items, product.product_type, storeSettings);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    setItems((prev) => {
      const key = createCartKey(variant, selectedOptions);
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        if (existing.qty >= MAX_QTY) return prev;
        return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      }

      const price = getPrice(product, variant, selectedOptions, optionTemplates);
      return [...prev, { key, product, variant, selectedOptions, price, qty: 1 }];
    });
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateQty(key, qty) {
    if (qty <= 0) {
      removeItem(key);
      return;
    }
    if (qty > MAX_QTY) return;
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  }

  function clearCart() {
    setItems([]);
    setAppliedVoucher(null);
    setVoucherDiscount(0);
  }

  function applyVoucher(voucher, discount) {
    setAppliedVoucher(voucher);
    setVoucherDiscount(discount);
  }

  function removeVoucher() {
    setAppliedVoucher(null);
    setVoucherDiscount(0);
  }

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (i.price ?? i.product.price) * i.qty, 0),
    [items]
  );

  const totalPrice = useMemo(() => Math.max(0, subtotal - voucherDiscount), [subtotal, voucherDiscount]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        totalItems,
        subtotal,
        totalPrice,
        appliedVoucher,
        voucherDiscount,
        applyVoucher,
        removeVoucher,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart harus digunakan di dalam CartProvider');
  }
  return ctx;
}
