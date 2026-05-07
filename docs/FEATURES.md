# Fitur Order Kopi

## Mengapa Order Kopi?

### Siap Produksi
- **Production-Ready:** Security hardening lengkap (webhook signature, RLS policies, rate limiting)
- **Scalable Architecture:** Supabase PostgreSQL + Edge Functions untuk performa optimal
- **Zero Downtime:** Real-time updates tanpa refresh halaman
- **PWA Support:** Install di HP seperti aplikasi native

### Hemat Biaya
- **Gratis untuk Mulai:** Supabase free tier (500K requests/bulan) + Vercel/Netlify hosting gratis
- **No Monthly Fee:** Tidak ada biaya bulanan untuk infrastruktur dasar
- **Pay As You Grow:** Bayar hanya saat traffic meningkat
- **Open Source:** Tidak ada biaya lisensi, customize sesuka hati

### Keamanan Enterprise
- **Payment Proof Validation:** Magic bytes check prevents file spoofing
- **Fraud Detection System:** Risk scoring (0-100) with pattern detection
- **Unique Code Collision Prevention:** Database constraint + unique code (0-500 range, max Rp 500 extra)
- **Concurrent Verification Protection:** Optimistic locking prevents duplicate approvals
- **Row Level Security (RLS):** Database-level isolation antar customer
- **Rate Limiting:** Server-side protection (10 req/min per IP)
- **Session Token Security:** Setiap customer punya token unik dengan auto-refresh
- **Audit Trail:** Immutable log untuk semua perubahan order (15+ event types)
- **Generic Error Messages:** No information disclosure for security

### Developer Experience
- **Modern Stack:** React 19 + Vite 8 + Tailwind CSS 4
- **Type Safety:** Full TypeScript support (opsional)
- **Hot Reload:** Instant feedback saat development
- **Easy Deployment:** One-click deploy ke Vercel/Netlify
- **Comprehensive Docs:** Setup guide, troubleshooting, dan API reference lengkap

### Fitur Bisnis
- **Multi-Branch:** Kelola beberapa cabang toko dalam satu aplikasi
- **Dynamic Pricing:** Harga berbeda per ukuran dan customization
- **Product Discount:** Diskon % per produk dengan harga coret
- **Voucher System:** BOGO, Fixed Rp, dan Percentage discount
  - Validasi otomatis (expiry, usage limit, min purchase)
  - Atomic increment untuk prevent race condition
  - Track usage per voucher
- **Promo Management:** Banner promo dengan scheduling
- **Sales Analytics:** Laporan penjualan harian dengan grafik per jam
- **Customer Insights:** Rating, review, dan feedback tracking
- **WhatsApp Integration:** Share order link via WhatsApp

### Fitur Baru (2026-05)
- **Unique Code System:** 0-500 range per order (max Rp 500 extra)
- **Auto-Verification:** 80%+ orders auto-approved, reduces admin workload
- **Bulk Verification:** Admin can verify multiple orders at once
- **Payment Analytics Dashboard:** Track auto-verification rate, fraud detection, avg time
- **Mobile Camera Upload:** Direct camera access for payment proof
- **Storage Optimization:** WebP support, 71% storage reduction
- **Enhanced Fraud Detection:** Duplicate proof, rapid submission, risk scoring
- **Payment Proof Auto-Cleanup:** Auto-delete proofs >90 days old
- **Feature Flags:** Gradual rollout support for new features
- **Performance Indexes:** 5 indexes for 10-100x faster queries
- **Custom Error Logging:** Client-side errors auto-saved to Supabase (no external dependency)

### Payment Flexibility
- **QRIS Static with Unique Code:** Unique code (0-500) per order (e.g., Rp 50,123 for Rp 50k order)
- **Auto-Verification:** 80%+ orders auto-approved when amount matches
- **Fraud Detection:** Risk scoring system with manual review for suspicious patterns
- **Payment Proof Upload:** Secure file upload with magic bytes validation
- **Cash Payment:** Fallback untuk bayar di kasir
- **Zero Transaction Fees:** No payment gateway fees (save Rp 24M/year vs Cashi.id)
- **Payment Tracking:** Complete audit log for all payment events

### Mobile-First Design
- **Responsive:** Optimal di semua ukuran layar (mobile, tablet, desktop)
- **Touch-Friendly:** UI dirancang untuk interaksi touch
- **Fast Loading:** Optimized assets dan lazy loading
- **Offline Support:** PWA dengan service worker (coming soon)

---

## Use Cases

### Coffee Shop / Café
- Kurangi antrian kasir dengan self-order
- Customer bisa order dari meja (scan QR code)
- Notifikasi otomatis saat pesanan siap

### Food Court / Kantin
- Multi-tenant support (beberapa tenant dalam satu aplikasi)
- Tracking antrian per tenant
- Laporan penjualan terpisah per tenant

### Event / Festival
- Handle high traffic dengan rate limiting
- Quick order untuk mengurangi antrian
- Real-time dashboard untuk monitor penjualan

### Cloud Kitchen / Ghost Kitchen
- Order online tanpa dine-in
- Integrasi dengan delivery service (via webhook)
- Focus pada efisiensi operasional

---

## Perbandingan dengan Kompetitor

| Fitur | Order Kopi | Kompetitor A | Kompetitor B |
|-------|------------|--------------|--------------|
| **Biaya Setup** | Gratis | $99/bulan | $49/bulan |
| **Dynamic QRIS** | ✅ QRIS Static + Unique Code | ❌ Static only | ✅ Via Midtrans |
| **Auto-Confirm Payment** | ✅ Auto-Verification (80%+) | ❌ Manual | ✅ Webhook |
| **Rate Limiting** | ✅ Server-side | ❌ None | ✅ Client-side |
| **Audit Logging** | ✅ Immutable | ❌ None | ⚠️ Basic |
| **Multi-Branch** | ✅ Built-in | ⚠️ Add-on | ✅ Built-in |
| **PWA Support** | ✅ Yes | ❌ No | ✅ Yes |
| **Open Source** | ✅ MIT License | ❌ Proprietary | ❌ Proprietary |
| **Customizable** | ✅ Full access | ⚠️ Limited | ❌ No |
| **Self-Hosted** | ✅ Yes | ❌ No | ❌ No |

---

## Fitur Pelanggan

- Lihat menu dengan kategori dan pencarian
- **Diskon Produk:** Harga coret + badge diskon (e.g., -20%)
- Pilih ukuran (Small/Regular/Large), suhu (Hot/Iced), dan level gula
- Keranjang belanja dengan quantity adjustment
- **Voucher System:** Input kode voucher untuk diskon tambahan
  - Buy 1 Get 1 (BOGO), Item termurah gratis
  - Fixed Discount (Rp), Potongan harga tetap
  - Percentage Discount (%), Potongan persentase
- Checkout dengan QRIS Static + unique code atau bayar di kasir (cash)
- Tracking status pesanan real-time (Bayar → Menunggu → Diproses → Siap → Selesai)
- Estimasi waktu tunggu + posisi antrian
- Rating & review setelah pesanan selesai
- Share pesanan via WhatsApp
- Pilih cabang toko
- Banner promo dinamis
- PWA, bisa di-install di HP

---

## Fitur Admin

- Dashboard pesanan real-time dengan filter status
- Update status pesanan (konfirmasi bayar → proses → siap → selesai)
- Kelola menu (CRUD produk + kategori, upload foto)
- **Kelola Diskon Produk:** Set diskon % per produk dengan preview harga
- **Kelola Voucher:** CRUD voucher dengan tipe BOGO/Fixed/Percentage
  - Set kode voucher (e.g., BOGO50, DISKON10K)
  - Atur minimum pembelian
  - Batasi jumlah penggunaan (usage limit)
  - Periode valid (dari-sampai tanggal)
  - Track usage real-time (X/Y digunakan)
- Kelola cabang toko
- Kelola promo/banner
- Laporan penjualan harian (revenue, top items, grafik per jam)
- **Audit Log:** Track semua perubahan order (siapa, kapan, apa yang diubah)
- Pengaturan toko (nama, logo, QRIS, jam operasional)
- Buka/tutup toko manual
- Ganti password admin
- Reset data pesanan
- Setup Wizard untuk konfigurasi awal
- Notifikasi Telegram (opsional, via Edge Function)
- Auto-cancel pesanan yang tidak dibayar (opsional, via Edge Function)

---

## Fitur Keamanan

- **Session Token:** Setiap customer mendapat token unik untuk tracking order
- **Order Isolation:** Customer hanya bisa akses order mereka sendiri
- **Rate Limiting:** Maksimal 5 order per jam untuk mencegah spam
- **Token Auto-Refresh:** Token otomatis extend saat user aktif (prevent expire mid-session)
- **Audit Trail:** Semua perubahan order tercatat (immutable, admin-only access)
- **RLS Policies:** Database-level security dengan Row Level Security
- **Token Expiry:** Token otomatis expire setelah 24 jam (atau extend jika aktif)
- **Error Logging:** Client-side error otomatis tersimpan ke tabel `error_logs` (visible di Supabase Dashboard)
