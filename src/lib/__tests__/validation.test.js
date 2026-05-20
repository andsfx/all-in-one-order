import { describe, expect, it } from 'vitest';
import {
  validateCustomerName,
  validateNote,
  validatePhone,
  validateEmail,
  validateTableNumber,
  validateVoucherCode,
  validatePriceInt,
  validateDiscountPercent,
  validateImageMime,
} from '../validation';

describe('validateCustomerName', () => {
  it('valid name returns ok', () => {
    const result = validateCustomerName('Budi');
    expect(result).toEqual({ ok: true, value: 'Budi' });
  });

  it('empty name returns error', () => {
    const result = validateCustomerName('');
    expect(result).toEqual({ ok: false, message: 'Nama wajib diisi' });
  });

  it('name over 100 chars returns error', () => {
    const result = validateCustomerName('a'.repeat(101));
    expect(result).toEqual({ ok: false, message: 'Nama maksimal 100 karakter' });
  });

  it('trims whitespace', () => {
    const result = validateCustomerName('  Budi  ');
    expect(result).toEqual({ ok: true, value: 'Budi' });
  });
});

describe('validateNote', () => {
  it('valid note returns ok', () => {
    const result = validateNote('Extra pedas');
    expect(result).toEqual({ ok: true, value: 'Extra pedas' });
  });

  it('empty note returns ok', () => {
    const result = validateNote('');
    expect(result).toEqual({ ok: true, value: '' });
  });

  it('note over 500 chars returns error', () => {
    const result = validateNote('a'.repeat(501));
    expect(result).toEqual({ ok: false, message: 'Catatan maksimal 500 karakter' });
  });
});

describe('validatePhone', () => {
  it('valid phone returns ok', () => {
    const result = validatePhone('081234567890');
    expect(result).toEqual({ ok: true, value: '081234567890' });
  });

  it('phone with + prefix returns ok', () => {
    const result = validatePhone('+6281234567890');
    expect(result).toEqual({ ok: true, value: '+6281234567890' });
  });

  it('phone with separators returns cleaned digits', () => {
    const result = validatePhone('0812-3456-7890');
    expect(result).toEqual({ ok: true, value: '081234567890' });
  });

  it('empty phone returns error', () => {
    const result = validatePhone('');
    expect(result).toEqual({ ok: false, message: 'Nomor telepon wajib diisi' });
  });

  it('phone with letters returns error', () => {
    const result = validatePhone('0812abc');
    expect(result).toEqual({ ok: false, message: 'Nomor telepon hanya boleh berisi angka' });
  });

  it('phone under 8 digits returns error', () => {
    const result = validatePhone('1234567');
    expect(result).toEqual({ ok: false, message: 'Nomor telepon harus 8-20 digit' });
  });

  it('phone over 20 digits returns error', () => {
    const result = validatePhone('123456789012345678901');
    expect(result).toEqual({ ok: false, message: 'Nomor telepon harus 8-20 digit' });
  });
});

describe('validateEmail', () => {
  it('valid email returns ok', () => {
    const result = validateEmail('user@example.com');
    expect(result).toEqual({ ok: true, value: 'user@example.com' });
  });

  it('empty email returns error', () => {
    const result = validateEmail('');
    expect(result).toEqual({ ok: false, message: 'Email wajib diisi' });
  });

  it('email over 254 chars returns error', () => {
    const result = validateEmail('a'.repeat(250) + '@example.com');
    expect(result).toEqual({ ok: false, message: 'Email terlalu panjang' });
  });

  it('invalid email format returns error', () => {
    const result = validateEmail('notanemail');
    expect(result).toEqual({ ok: false, message: 'Format email tidak valid' });
  });
});

describe('validateTableNumber', () => {
  it('valid table number returns ok', () => {
    const result = validateTableNumber('5');
    expect(result).toEqual({ ok: true, value: '5' });
  });

  it('empty table number returns error', () => {
    const result = validateTableNumber('');
    expect(result).toEqual({ ok: false, message: 'Nomor meja wajib diisi' });
  });

  it('non-numeric table number returns error', () => {
    const result = validateTableNumber('abc');
    expect(result).toEqual({ ok: false, message: 'Nomor meja harus berupa angka' });
  });

  it('table number below 1 returns error', () => {
    const result = validateTableNumber('0');
    expect(result).toEqual({ ok: false, message: 'Nomor meja harus 1-50' });
  });

  it('table number above 50 returns error', () => {
    const result = validateTableNumber('51');
    expect(result).toEqual({ ok: false, message: 'Nomor meja harus 1-50' });
  });
});

describe('validateVoucherCode', () => {
  it('valid voucher code returns ok', () => {
    const result = validateVoucherCode('PROMO2026');
    expect(result).toEqual({ ok: true, value: 'PROMO2026' });
  });

  it('lowercase voucher code returns uppercase', () => {
    const result = validateVoucherCode('promo2026');
    expect(result).toEqual({ ok: true, value: 'PROMO2026' });
  });

  it('empty voucher code returns error', () => {
    const result = validateVoucherCode('');
    expect(result).toEqual({ ok: false, message: 'Kode voucher wajib diisi' });
  });

  it('voucher code over 50 chars returns error', () => {
    const result = validateVoucherCode('A'.repeat(51));
    expect(result).toEqual({ ok: false, message: 'Kode voucher maksimal 50 karakter' });
  });

  it('voucher code with invalid chars returns error', () => {
    const result = validateVoucherCode('PROMO@2026');
    expect(result).toEqual({ ok: false, message: 'Kode voucher hanya boleh berisi huruf, angka, - atau _' });
  });
});

describe('validatePriceInt', () => {
  it('valid price returns ok', () => {
    const result = validatePriceInt('50000');
    expect(result).toEqual({ ok: true, value: 50000 });
  });

  it('empty price returns error', () => {
    const result = validatePriceInt('');
    expect(result).toEqual({ ok: false, message: 'Harga wajib diisi' });
  });

  it('non-numeric price returns error', () => {
    const result = validatePriceInt('abc');
    expect(result).toEqual({ ok: false, message: 'Harga harus berupa angka bulat' });
  });

  it('price below min returns error (negative is non-digit)', () => {
    const result = validatePriceInt('-1');
    expect(result).toEqual({ ok: false, message: 'Harga harus berupa angka bulat' });
  });

  it('price above max returns error', () => {
    const result = validatePriceInt('100000001');
    expect(result).toEqual({ ok: false, message: 'Harga maksimal 100.000.000' });
  });

  it('custom label and range works', () => {
    const result = validatePriceInt('150', { min: 100, max: 200, label: 'Biaya' });
    expect(result).toEqual({ ok: true, value: 150 });
  });
});

describe('validateDiscountPercent', () => {
  it('valid discount returns ok', () => {
    const result = validateDiscountPercent('10');
    expect(result).toEqual({ ok: true, value: 10 });
  });

  it('empty discount returns null when allowEmpty', () => {
    const result = validateDiscountPercent('', { allowEmpty: true });
    expect(result).toEqual({ ok: true, value: null });
  });

  it('empty discount returns error when not allowEmpty', () => {
    const result = validateDiscountPercent('', { allowEmpty: false });
    expect(result).toEqual({ ok: false, message: 'Diskon wajib diisi' });
  });

  it('non-numeric discount returns error', () => {
    const result = validateDiscountPercent('abc');
    expect(result).toEqual({ ok: false, message: 'Diskon harus berupa angka bulat' });
  });

  it('discount below 0 returns error (negative is non-digit)', () => {
    const result = validateDiscountPercent('-1');
    expect(result).toEqual({ ok: false, message: 'Diskon harus berupa angka bulat' });
  });

  it('discount above 100 returns error', () => {
    const result = validateDiscountPercent('101');
    expect(result).toEqual({ ok: false, message: 'Diskon harus 0-100' });
  });
});

describe('validateImageMime', () => {
  it('valid JPEG file returns ok', () => {
    const file = { type: 'image/jpeg', size: 1024 };
    const result = validateImageMime(file);
    expect(result).toEqual({ ok: true, value: file });
  });

  it('valid PNG file returns ok', () => {
    const file = { type: 'image/png', size: 1024 };
    const result = validateImageMime(file);
    expect(result).toEqual({ ok: true, value: file });
  });

  it('valid WebP file returns ok', () => {
    const file = { type: 'image/webp', size: 1024 };
    const result = validateImageMime(file);
    expect(result).toEqual({ ok: true, value: file });
  });

  it('no file returns error', () => {
    const result = validateImageMime(null);
    expect(result).toEqual({ ok: false, message: 'File belum dipilih' });
  });

  it('invalid MIME type returns error', () => {
    const file = { type: 'image/svg+xml', size: 1024 };
    const result = validateImageMime(file);
    expect(result).toEqual({ ok: false, message: 'Format gambar harus JPG, PNG, atau WebP' });
  });

  it('file over max size returns error', () => {
    const file = { type: 'image/jpeg', size: 6 * 1024 * 1024 };
    const result = validateImageMime(file);
    expect(result).toEqual({ ok: false, message: 'Ukuran gambar maksimal 5MB' });
  });
});
