# Sistem Pembayaran QRIS Static

Order Kopi menggunakan QRIS Static dengan verifikasi kode unik untuk **biaya transaksi nol**. Setiap order dapat kode unik (range 0-500, contoh: Rp 50.123 untuk order Rp 50.000), dan 80%+ order terverifikasi otomatis saat jumlah pembayaran sesuai.

## Setup QRIS Static

### 1. Upload Gambar QRIS
- Login sebagai admin
- Buka Settings → QRIS & WhatsApp
- Upload gambar QRIS static (dari bank/payment provider)

### 2. Konfigurasi Storage
- Buka Supabase Dashboard → Storage
- Buat bucket: `payment-proofs` (private)
- Terapkan RLS policies (lihat [dokumentasi Security](SECURITY.md))

### 3. Deploy Edge Functions
```bash
npx supabase functions deploy verify-payment --no-verify-jwt
npx supabase functions deploy cleanup-old-proofs --no-verify-jwt
```

### 4. Set Environment Variables

Di file `.env`:
```env
VITE_ENABLE_AUTO_VERIFICATION=true
VITE_ENABLE_FRAUD_DETECTION=true
VITE_ENABLE_BULK_VERIFICATION=true
VITE_ENABLE_PAYMENT_ANALYTICS=true
```

## Alur Pembayaran

1. **Customer checkout** → Order dibuat dengan kode unik (range 0-500)
2. **Customer bayar** → Scan QRIS & bayar jumlah exact (contoh: Rp 50.123)
3. **Upload bukti** → Customer upload screenshot pembayaran
4. **Auto-verification** → Edge Function verifikasi jumlah & update status
5. **Admin notified** → Order masuk antrian untuk diproses

## Sistem Kode Unik

Setiap order dapat kode unik 0-500 yang ditambahkan ke total:
- Order Rp 50.000 → Bayar Rp 50.123 (kode unik: 123)
- Order Rp 25.000 → Bayar Rp 25.450 (kode unik: 450)
- Maksimal tambahan Rp 500 dari kode unik

### Kenapa 0-500?
- Kode unik 4 digit (1000-9999) berarti customer bayar tambahan Rp 1.000-9.999, terlalu mahal
- Range 0-500 membuat tambahan biaya maksimal Rp 500, lebih fair untuk customer
- Tetap cukup unik untuk membedakan pembayaran antar order

## Auto-Verification

80%+ order terverifikasi otomatis saat:
- Customer membayar jumlah yang sesuai (termasuk kode unik)
- Risk score rendah (< threshold)
- Tidak ada pola mencurigakan

Order yang tidak auto-verify masuk manual review oleh admin.

## Fraud Detection

Sistem mendeteksi pola mencurigakan:
- **Duplicate proof:** Bukti pembayaran yang sama dipakai berulang
- **Rapid submission:** Bukti diupload terlalu cepat setelah order
- **Multiple auto-verified:** Customer dengan terlalu banyak order auto-verified
- **Risk scoring:** 0-100, order dengan score tinggi masuk manual review

## Metode Pembayaran

| Metode | Cara | Biaya |
|--------|------|-------|
| **QRIS + Kode Unik** | Scan QRIS, bayar jumlah exact | Rp 0 (zero fees) |
| **Cash** | Bayar di kasir | Rp 0 |

## Penghematan Biaya

**Rp 24M/tahun** vs payment gateway (3-5% fees):
- Revenue Rp 500jt/tahun × 3% fee = Rp 15jt/tahun
- Revenue Rp 500jt/tahun × 5% fee = Rp 25jt/tahun
- Dengan QRIS Static: **Rp 0 fees**

## Testing

1. Buat test order
2. Catat kode unik (contoh: Rp 50.123)
3. Upload bukti pembayaran (screenshot)
4. Verify auto-verification bekerja (cek order status berubah ke "Menunggu")
