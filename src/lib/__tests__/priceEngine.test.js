import { describe, it, expect } from 'vitest';
import { calculateItemPrice } from '../priceEngine';

describe('calculateItemPrice', () => {
  it('returns variant price_override when present (no options)', () => {
    const product = { price: 10000 };
    const variant = { price_override: 12000 };
    expect(calculateItemPrice(product, variant, {}, {})).toBe(12000);
  });

  it('falls back to product.price when no variant override', () => {
    const product = { price: 10000 };
    const variant = {};
    expect(calculateItemPrice(product, variant, {}, {})).toBe(10000);
  });

  it('adds option price deltas to variant price', () => {
    const product = { price: 10000 };
    const variant = { price_override: 15000 };
    const selectedOptions = { size: 'Large' };
    const optionTemplates = {
      size: {
        choices: [
          { value: 'Regular', price_delta: 0 },
          { value: 'Large', price_delta: 3000 },
        ],
      },
    };
    expect(calculateItemPrice(product, variant, selectedOptions, optionTemplates)).toBe(18000);
  });

  it('handles multiple options with positive and negative deltas', () => {
    const product = { price: 10000 };
    const variant = {};
    const selectedOptions = { size: 'Large', sweetness: 'Less' };
    const optionTemplates = {
      size: {
        choices: [
          { value: 'Regular', price_delta: 0 },
          { value: 'Large', price_delta: 5000 },
        ],
      },
      sweetness: {
        choices: [
          { value: 'Normal', price_delta: 0 },
          { value: 'Less', price_delta: -1000 },
        ],
      },
    };
    // 10000 + 5000 + (-1000) = 14000
    expect(calculateItemPrice(product, variant, selectedOptions, optionTemplates)).toBe(14000);
  });

  it('applies discount before option deltas', () => {
    const product = { price: 10000, discount_percent: 20 };
    const variant = { price_override: 12000 };
    const selectedOptions = { size: 'Large' };
    const optionTemplates = {
      size: {
        choices: [{ value: 'Large', price_delta: 2000 }],
      },
    };
    // Math.round(12000 * 0.8) + 2000 = 9600 + 2000 = 11600
    expect(calculateItemPrice(product, variant, selectedOptions, optionTemplates)).toBe(11600);
  });

  it('handles option value as object with .value property', () => {
    const product = { price: 10000 };
    const variant = {};
    const selectedOptions = { size: { value: 'Large', label: 'Large Ice' } };
    const optionTemplates = {
      size: {
        choices: [{ value: 'Large', price_delta: 3000 }],
      },
    };
    expect(calculateItemPrice(product, variant, selectedOptions, optionTemplates)).toBe(13000);
  });

  it('ignores missing option templates gracefully', () => {
    const product = { price: 10000 };
    const variant = {};
    const selectedOptions = { size: 'Large', unknown: 'value' };
    const optionTemplates = {
      size: {
        choices: [{ value: 'Large', price_delta: 3000 }],
      },
    };
    expect(calculateItemPrice(product, variant, selectedOptions, optionTemplates)).toBe(13000);
  });

  it('returns base price when selectedOptions is empty', () => {
    const product = { price: 8000 };
    const variant = {};
    expect(calculateItemPrice(product, variant)).toBe(8000);
  });
});
