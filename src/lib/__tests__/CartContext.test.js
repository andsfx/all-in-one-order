import { describe, it, expect } from 'vitest';
import { createCartKey, getPrice, validateMixedCart } from '../CartContext';

describe('CartContext', () => {
  describe('createCartKey', () => {
    it('generates deterministic key from variant and options', () => {
      const variant = { id: 'var-123' };
      const options = { size: 'Large', sweetness: 'Normal' };
      const key1 = createCartKey(variant, options);
      const key2 = createCartKey(variant, options);
      expect(key1).toBe(key2);
    });

    it('sorts options alphabetically for consistent keys', () => {
      const variant = { id: 'var-123' };
      const key1 = createCartKey(variant, { b: '2', a: '1' });
      const key2 = createCartKey(variant, { a: '1', b: '2' });
      expect(key1).toBe(key2);
    });

    it('generates different keys for different option values', () => {
      const variant = { id: 'var-123' };
      const key1 = createCartKey(variant, { size: 'Large' });
      const key2 = createCartKey(variant, { size: 'Regular' });
      expect(key1).not.toBe(key2);
    });

    it('generates different keys for different variants', () => {
      const options = { size: 'Large' };
      const key1 = createCartKey({ id: 'var-1' }, options);
      const key2 = createCartKey({ id: 'var-2' }, options);
      expect(key1).not.toBe(key2);
    });

    it('handles empty options', () => {
      const variant = { id: 'var-123' };
      const key = createCartKey(variant, {});
      expect(key).toBe('var-123-{}');
    });
  });

  describe('getPrice', () => {
    it('uses variant price_override as base', () => {
      const product = { price: 10000 };
      const variant = { price_override: 12000 };
      const price = getPrice(product, variant, {}, {});
      expect(price).toBe(12000);
    });

    it('falls back to product price if no override', () => {
      const product = { price: 10000 };
      const variant = {};
      const price = getPrice(product, variant, {}, {});
      expect(price).toBe(10000);
    });

    it('applies product discount to base price', () => {
      const product = { price: 10000, discount_percent: 20 };
      const variant = {};
      const price = getPrice(product, variant, {}, {});
      expect(price).toBe(8000);
    });

    it('adds option price deltas', () => {
      const product = { price: 10000 };
      const variant = {};
      const selectedOptions = { size: 'Large', sweetness: 'Extra' };
      const optionTemplates = {
        size: {
          choices: [
            { value: 'Regular', price_delta: 0 },
            { value: 'Large', price_delta: 3000 },
          ],
        },
        sweetness: {
          choices: [
            { value: 'Normal', price_delta: 0 },
            { value: 'Extra', price_delta: 500 },
          ],
        },
      };
      const price = getPrice(product, variant, selectedOptions, optionTemplates);
      expect(price).toBe(13500); // 10000 + 3000 + 500
    });

    it('handles option value as object with .value property', () => {
      const product = { price: 10000 };
      const variant = {};
      const selectedOptions = { size: { value: 'Large', label: 'Large Ice' } };
      const optionTemplates = {
        size: {
          choices: [
            { value: 'Regular', price_delta: 0 },
            { value: 'Large', price_delta: 3000 },
          ],
        },
      };
      const price = getPrice(product, variant, selectedOptions, optionTemplates);
      expect(price).toBe(13000);
    });

    it('ignores missing option templates', () => {
      const product = { price: 10000 };
      const variant = {};
      const selectedOptions = { size: 'Large', unknown: 'value' };
      const optionTemplates = {
        size: {
          choices: [{ value: 'Large', price_delta: 3000 }],
        },
      };
      const price = getPrice(product, variant, selectedOptions, optionTemplates);
      expect(price).toBe(13000);
    });

    it('ignores missing choices in template', () => {
      const product = { price: 10000 };
      const variant = {};
      const selectedOptions = { size: 'XL' };
      const optionTemplates = {
        size: {
          choices: [{ value: 'Large', price_delta: 3000 }],
        },
      };
      const price = getPrice(product, variant, selectedOptions, optionTemplates);
      expect(price).toBe(10000);
    });

    it('combines variant override, discount, and option deltas', () => {
      const product = { price: 10000, discount_percent: 10 };
      const variant = { price_override: 12000 };
      const selectedOptions = { size: 'Large' };
      const optionTemplates = {
        size: {
          choices: [{ value: 'Large', price_delta: 2000 }],
        },
      };
      const price = getPrice(product, variant, selectedOptions, optionTemplates);
      // (12000 * 0.9) + 2000 = 10800 + 2000 = 12800
      expect(price).toBe(12800);
    });
  });

  describe('validateMixedCart', () => {
    it('allows adding to empty cart', () => {
      const result = validateMixedCart([], 'coffee', {});
      expect(result.valid).toBe(true);
    });

    it('allows adding same product type', () => {
      const items = [
        { product: { product_type: 'coffee' } },
        { product: { product_type: 'coffee' } },
      ];
      const result = validateMixedCart(items, 'coffee', { allow_mixed_cart: 'false' });
      expect(result.valid).toBe(true);
    });

    it('rejects different product type when mixed cart disabled', () => {
      const items = [{ product: { product_type: 'coffee' } }];
      const result = validateMixedCart(items, 'food', { allow_mixed_cart: 'false' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Tidak bisa mencampur');
    });

    it('allows different product type when mixed cart enabled', () => {
      const items = [{ product: { product_type: 'coffee' } }];
      const result = validateMixedCart(items, 'food', { allow_mixed_cart: 'true' });
      expect(result.valid).toBe(true);
    });

    it('allows different product type when setting not specified', () => {
      const items = [{ product: { product_type: 'coffee' } }];
      const result = validateMixedCart(items, 'food', {});
      expect(result.valid).toBe(true);
    });

    it('handles multiple items with mixed types', () => {
      const items = [
        { product: { product_type: 'coffee' } },
        { product: { product_type: 'food' } },
      ];
      const result = validateMixedCart(items, 'snack', { allow_mixed_cart: 'false' });
      expect(result.valid).toBe(false);
    });
  });
});
