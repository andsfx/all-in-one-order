import { supabase } from './supabase';
import { logError } from './logError';

export function useVoucher() {
  /**
   * Validate voucher code, check eligibility, and atomically increment usage.
   * Uses server-side RPC to prevent race conditions.
   * @param {string} code - Voucher code (case-insensitive)
   * @param {number} cartTotal - Current cart total before discount
   * @returns {Promise<{valid: boolean, voucher: object|null, error: string|null}>}
   */
  async function validateVoucher(code, cartTotal) {
    if (!code || !code.trim()) {
      return { valid: false, voucher: null, error: 'Kode voucher tidak boleh kosong' };
    }

    try {
      // Use atomic RPC: validates AND increments usage in one call
      const { data, error } = await supabase.rpc('validate_and_use_voucher', {
        p_code: code.trim(),
        p_cart_total: cartTotal,
      });

      if (error) {
        logError(error instanceof Error ? error : new Error(String(error.message || error)), { metadata: { source: 'useVoucher.validateVoucher', type: 'rpc_error' } });
        return { valid: false, voucher: null, error: 'Gagal memvalidasi voucher' };
      }

      if (!data.valid) {
        return { valid: false, voucher: null, error: data.error };
      }

      // Return voucher data with pre-calculated discount
      const voucher = {
        id: data.voucher.id,
        code: data.voucher.code,
        type: data.voucher.type,
        discount_value: data.voucher.discount_value,
        min_purchase: data.voucher.min_purchase,
      };

      // Store discount amount from server (for fixed and percentage types)
      voucher._serverDiscount = data.voucher.discount_amount;

      return { valid: true, voucher, error: null };
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), { metadata: { source: 'useVoucher.validateVoucher' } });
      return { valid: false, voucher: null, error: 'Gagal memvalidasi voucher' };
    }
  }

  /**
   * Calculate discount amount based on voucher type
   * @param {object} voucher - Voucher object from database
   * @param {array} cartItems - Array of cart items
   * @param {number} cartTotal - Cart total before discount
   * @returns {number} Discount amount in Rupiah
   */
  function calculateDiscount(voucher, cartItems, cartTotal) {
    if (!voucher) return 0;

    // Use server-calculated discount if available (for fixed and percentage)
    if (voucher._serverDiscount != null && voucher.type !== 'bogo') {
      return voucher._serverDiscount;
    }

    if (voucher.type === 'bogo') {
      // Buy 1 Get 1: Find pairs of items, make cheaper one free
      const sortedItems = [...cartItems]
        .flatMap(item => Array(item.qty).fill(item.price))
        .sort((a, b) => a - b);

      let discount = 0;
      for (let i = 0; i < sortedItems.length - 1; i += 2) {
        discount += sortedItems[i];
      }
      return discount;
    }

    if (voucher.type === 'fixed') {
      return Math.min(voucher.discount_value, cartTotal);
    }

    if (voucher.type === 'percentage') {
      return Math.round(cartTotal * voucher.discount_value / 100);
    }

    return 0;
  }

  return { validateVoucher, calculateDiscount };
}
