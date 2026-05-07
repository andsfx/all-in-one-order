# Sistem Voucher

Order Kopi mendukung 3 jenis voucher untuk meningkatkan penjualan dan customer engagement.

## Jenis Voucher

### 1. Buy 1 Get 1 (BOGO)
Customer beli 2 item, item termurah gratis. Berlaku kelipatan (beli 4 = 2 gratis, beli 6 = 3 gratis). Cocok untuk promo hari spesial seperti tanggal 25, weekend, atau event tertentu.

**Contoh:**
- Beli 2 Cappuccino @ Rp 25.000 → Bayar Rp 25.000 (1 gratis)
- Beli Cappuccino (Rp 25.000) + Latte (Rp 30.000) → Bayar Rp 30.000 (Cappuccino gratis)

### 2. Fixed Discount (Rp)
Potongan harga tetap dari total belanja. Bisa set minimum pembelian.

**Contoh:**
- Voucher DISKON10K: Diskon Rp 10.000 (min. belanja Rp 30.000)
- Total Rp 50.000 → Bayar Rp 40.000

### 3. Percentage Discount (%)
Potongan persentase dari total belanja. Bisa set minimum pembelian.

**Contoh:**
- Voucher HEMAT20: Diskon 20% (min. belanja Rp 40.000)
- Total Rp 50.000 → Bayar Rp 40.000

## Cara Membuat Voucher (Admin)

1. Login ke Admin Panel
2. Klik **Kelola Voucher** di menu utama
3. Klik **Tambah Voucher**
4. Isi form:
   - **Kode Voucher:** Huruf kapital, tanpa spasi (contoh: BOGO50, DISKON10K)
   - **Tipe:** Pilih BOGO, Fixed Rp, atau Percentage %
   - **Nilai Diskon:**
     - BOGO: Kosongkan (otomatis item termurah gratis)
     - Fixed: Masukkan nominal (contoh: 10000 untuk Rp 10.000)
     - Percentage: Masukkan angka 1 sampai 100 (contoh: 20 untuk 20%)
   - **Minimum Pembelian:** Rp 0 berarti tidak ada minimum
   - **Batas Penggunaan:** Berapa kali voucher bisa dipakai (contoh: 100)
   - **Periode Valid:** Dari tanggal X sampai tanggal Y
5. Klik **Simpan**

## Cara Menggunakan Voucher (Customer)

1. Tambahkan item ke keranjang
2. Klik **Lanjut ke Checkout**
3. Di bagian **Punya Voucher?**, masukkan kode voucher
4. Klik **Gunakan**
5. Jika valid, diskon otomatis teraplikasi:
   - Subtotal: Rp 62.000
   - Diskon (BOGO50): Rp 29.000
   - **Total: Rp 33.000**
6. Lanjutkan checkout seperti biasa

## Validasi Voucher

Sistem otomatis validasi:
- ✅ Kode voucher benar
- ✅ Voucher masih aktif (belum expired)
- ✅ Belum mencapai batas penggunaan
- ✅ Total belanja memenuhi minimum pembelian

Jika tidak valid, muncul error:
- ❌ "Kode voucher tidak ditemukan"
- ❌ "Voucher sudah kadaluarsa"
- ❌ "Voucher sudah habis digunakan"
- ❌ "Minimum pembelian Rp 50.000"

## Tracking Voucher

Admin bisa monitor penggunaan voucher:
- **Usage Count:** Berapa kali sudah dipakai (contoh: 45/100)
- **Status:** Active atau Inactive
- **Periode:** Valid dari tanggal berapa sampai tanggal berapa
- **Total Discount:** Berapa total diskon yang diberikan (via Laporan)

## Sample Vouchers

Setelah setup, database sudah include 3 sample vouchers:

| Kode | Tipe | Diskon | Min. Belanja | Limit | Periode |
|------|------|--------|--------------|-------|---------|
| BOGO50 | BOGO | Item termurah gratis | Rp 50.000 | 100x | 30 hari |
| DISKON10K | Fixed | Rp 10.000 | Rp 30.000 | 50x | 30 hari |
| HEMAT20 | Percentage | 20% | Rp 40.000 | 75x | 30 hari |

## Technical Details

### Database
Tabel `vouchers` dengan kolom: code, type, discount_value, min_purchase, usage_limit, usage_count, valid_from, valid_to. Menggunakan **atomic increment** untuk prevent race condition (2 user pakai voucher bersamaan). RLS policies: customer view active vouchers, admin manage all.

### Integration
- `useVoucher` hook untuk validasi dan kalkulasi diskon
- `CartContext` menyimpan applied voucher dan discount amount
- `OrderContext` save voucher_id ke order dan increment usage_count
- Voucher discount tampil di Cart Drawer dan Checkout page
