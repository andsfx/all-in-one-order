/**
 * Shared input validation helpers.
 *
 * All validators return a consistent shape:
 *   { ok: true, value }            -> valid; `value` is the normalized form
 *   { ok: false, message: string } -> invalid; `message` is a user-friendly Bahasa Indonesia text
 *
 * These are CONVENIENCE helpers for client-side UX. Backend remains the
 * authoritative source of truth (RLS, CHECK constraints, RPC validation).
 * Never bypass server validation based on client checks.
 */

/** Allowed image MIME types for uploads. SVG is intentionally excluded (XSS via SVG). */
export const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/** Max file size for image uploads (bytes). */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/* ------------------------------------------------------------------ */
/* Text fields                                                         */
/* ------------------------------------------------------------------ */

export function validateCustomerName(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return { ok: false, message: 'Nama wajib diisi' };
  if (value.length > 100) return { ok: false, message: 'Nama maksimal 100 karakter' };
  return { ok: true, value };
}

export function validateNote(raw) {
  const value = String(raw ?? '').trim();
  if (value.length > 500) return { ok: false, message: 'Catatan maksimal 500 karakter' };
  return { ok: true, value };
}

export function validatePhone(raw) {
  const cleaned = String(raw ?? '').trim();
  if (!cleaned) return { ok: false, message: 'Nomor telepon wajib diisi' };
  // Allow leading + and digits only after stripping common separators
  const digits = cleaned.replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(digits)) {
    return { ok: false, message: 'Nomor telepon hanya boleh berisi angka' };
  }
  const digitCount = digits.replace(/^\+/, '').length;
  if (digitCount < 8 || digitCount > 20) {
    return { ok: false, message: 'Nomor telepon harus 8-20 digit' };
  }
  return { ok: true, value: digits };
}

export function validateEmail(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return { ok: false, message: 'Email wajib diisi' };
  if (value.length > 254) return { ok: false, message: 'Email terlalu panjang' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { ok: false, message: 'Format email tidak valid' };
  }
  return { ok: true, value };
}

export function validateAddress(raw, { required = true } = {}) {
  const value = String(raw ?? '').trim();
  if (!value) {
    if (required) return { ok: false, message: 'Alamat wajib diisi' };
    return { ok: true, value: null };
  }
  if (value.length > 500) return { ok: false, message: 'Alamat maksimal 500 karakter' };
  return { ok: true, value };
}

export function validateTableNumber(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return { ok: false, message: 'Nomor meja wajib diisi' };
  if (!/^\d+$/.test(value)) return { ok: false, message: 'Nomor meja harus berupa angka' };
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 50) {
    return { ok: false, message: 'Nomor meja harus 1-50' };
  }
  return { ok: true, value: String(n) };
}

/* ------------------------------------------------------------------ */
/* Voucher                                                             */
/* ------------------------------------------------------------------ */

export function validateVoucherCode(raw) {
  const value = String(raw ?? '').trim().toUpperCase();
  if (!value) return { ok: false, message: 'Kode voucher wajib diisi' };
  if (value.length > 50) return { ok: false, message: 'Kode voucher maksimal 50 karakter' };
  // ASCII-safe: letters, digits, dash, underscore only
  if (!/^[A-Z0-9_-]+$/.test(value)) {
    return { ok: false, message: 'Kode voucher hanya boleh berisi huruf, angka, - atau _' };
  }
  return { ok: true, value };
}

/* ------------------------------------------------------------------ */
/* Numeric admin fields                                                */
/* ------------------------------------------------------------------ */

export function validatePriceInt(raw, { min = 0, max = 100_000_000, label = 'Harga' } = {}) {
  const str = String(raw ?? '').trim();
  if (!str) return { ok: false, message: `${label} wajib diisi` };
  if (!/^\d+$/.test(str)) return { ok: false, message: `${label} harus berupa angka bulat` };
  const n = parseInt(str, 10);
  if (!Number.isFinite(n)) return { ok: false, message: `${label} tidak valid` };
  if (n < min) return { ok: false, message: `${label} minimal ${min}` };
  if (n > max) return { ok: false, message: `${label} maksimal ${max.toLocaleString('id-ID')}` };
  return { ok: true, value: n };
}

export function validateDiscountPercent(raw, { allowEmpty = true } = {}) {
  const str = String(raw ?? '').trim();
  if (!str) {
    if (allowEmpty) return { ok: true, value: null };
    return { ok: false, message: 'Diskon wajib diisi' };
  }
  if (!/^\d+$/.test(str)) return { ok: false, message: 'Diskon harus berupa angka bulat' };
  const n = parseInt(str, 10);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { ok: false, message: 'Diskon harus 0-100' };
  }
  return { ok: true, value: n };
}

export function validateIntInRange(raw, { min = 0, max = Number.MAX_SAFE_INTEGER, label = 'Nilai', allowEmpty = false } = {}) {
  const str = String(raw ?? '').trim();
  if (!str) {
    if (allowEmpty) return { ok: true, value: null };
    return { ok: false, message: `${label} wajib diisi` };
  }
  if (!/^-?\d+$/.test(str)) return { ok: false, message: `${label} harus berupa angka bulat` };
  const n = parseInt(str, 10);
  if (!Number.isFinite(n)) return { ok: false, message: `${label} tidak valid` };
  if (n < min) return { ok: false, message: `${label} minimal ${min}` };
  if (n > max) return { ok: false, message: `${label} maksimal ${max.toLocaleString('id-ID')}` };
  return { ok: true, value: n };
}

/* ------------------------------------------------------------------ */
/* Image upload                                                        */
/* ------------------------------------------------------------------ */

export function validateImageMime(file, { allowed = ALLOWED_IMAGE_MIMES, maxSize = MAX_IMAGE_SIZE } = {}) {
  if (!file) return { ok: false, message: 'File belum dipilih' };
  if (!file.type || !allowed.includes(file.type)) {
    return { ok: false, message: 'Format gambar harus JPG, PNG, atau WebP' };
  }
  if (typeof file.size === 'number' && file.size > maxSize) {
    const mb = Math.round(maxSize / (1024 * 1024));
    return { ok: false, message: `Ukuran gambar maksimal ${mb}MB` };
  }
  return { ok: true, value: file };
}

/* ------------------------------------------------------------------ */
/* Generic short-text wrappers (admin name/title fields)               */
/* ------------------------------------------------------------------ */

export function validateRequiredText(raw, { max = 200, label = 'Field' } = {}) {
  const value = String(raw ?? '').trim();
  if (!value) return { ok: false, message: `${label} wajib diisi` };
  if (value.length > max) return { ok: false, message: `${label} maksimal ${max} karakter` };
  return { ok: true, value };
}
