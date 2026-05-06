import { supabase } from './supabase';

export function useVoucher() {
  /**
   * Validate voucher code and check eligibility
   * @param {string} code - Voucher code (case-insensitive)
   * @param {number} cartTotal - Current cart total before discount
   * @returns {Promise<{valid: boolean, voucher: object|null, error: string|null}>}
   */
  async function validateVoucher(code, cartTotal) {
    if (!code || !code.trim()) {
      return { valid: false, voucher: null, error: 'Kode voucher tidak boleh kosong' };
    }

    // Fetch voucher by code (case-insensitive)
    const { data: voucher, error: fetchError } = await supabase
      .from('vouchers')
      .select('*')
      .ilike('code', code.trim())
      .single();

    if (fetchError || !voucher) {
      return { valid: false, voucher: null, error: 'Kode voucher tidak ditemukan' };
    }

    // Check if active
    if (!voucher.is_active) {
      return { valid: false, voucher: null, error: 'Voucher tidak aktif' };
    }

    // Check validity period
    const now = new Date();
    const validFrom = new Date(voucher.valid_from);
    const validTo = new Date(voucher.valid_to);
    
    if (now < validFrom) {
      return { valid: false, voucher: null, error: 'Voucher belum berlaku' };
    }
    
    if (now > validTo) {
      return { valid: false, voucher: null, error: 'Voucher sudah kadaluarsa' };
    }

    // Check usage limit
    if (voucher.usage_count >= voucher.usage_limit) {
      return { valid: false, voucher: null, error: 'Voucher sudah habis digunakan' };
    }

    // Check minimum purchase
    if (cartTotal < voucher.min_purchase) {
      return { 
        valid: false, 
        voucher: null, 
        error: `Minimum pembelian Rp ${voucher.min_purchase.toLocaleString('id-ID')}` 
      };
    }

    return { valid: true, voucher, error: null };
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

    if (voucher.type === 'bogo') {
      // Buy 1 Get 1: Find pairs of items, make cheaper one free
      // Sort items by price (ascending)
      const sortedItems = [...cartItems]
        .flatMap(item => Array(item.qty).fill(item.price))
        .sort((a, b) => a - b);

      // Calculate discount: for every 2 items, the cheaper one is free
      let discount = 0;
      for (let i = 0; i < sortedItems.length - 1; i += 2) {
        discount += sortedItems[i]; // Add cheaper item price
      }
      return discount;
    }

    if (voucher.type === 'fixed') {
      // Fixed discount: subtract fixed amount, but not more than cart total
      return Math.min(voucher.discount_value, cartTotal);
    }

    if (voucher.type === 'percentage') {
      // Percentage discount: calculate percentage of cart total
      return Math.round(cartTotal * voucher.discount_value / 100);
    }

    return 0;
  }

  return { validateVoucher, calculateDiscount };
}
