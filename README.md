# Order Kopi

**Aplikasi pemesanan kopi online untuk coffee shop — siap pakai, mudah dikustomisasi.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)

<!-- Screenshot -->
<!-- ![Order Kopi Screenshot](screenshot.png) -->

---

## Fitur

### Pelanggan
- Lihat menu dengan kategori dan pencarian
- Pilih ukuran (Small/Regular/Large), suhu (Hot/Iced), dan level gula
- Keranjang belanja dengan quantity adjustment
- Checkout dengan QRIS atau bayar di kasir (cash)
- Tracking status pesanan real-time (Bayar → Menunggu → Diproses → Siap → Selesai)
- Estimasi waktu tunggu + posisi antrian
- Rating & review setelah pesanan selesai
- Share pesanan via WhatsApp
- Pilih cabang toko
- Banner promo dinamis
- PWA — bisa di-install di HP

### Admin
- Dashboard pesanan real-time dengan filter status
- Update status pesanan (konfirmasi bayar → proses → siap → selesai)
- Kelola menu (CRUD produk + kategori, upload foto)
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

### Keamanan
- **Session Token:** Setiap customer mendapat token unik untuk tracking order
- **Order Isolation:** Customer hanya bisa akses order mereka sendiri
- **Rate Limiting:** Maksimal 5 order per jam untuk mencegah spam
- **Token Auto-Refresh:** Token otomatis extend saat user aktif (prevent expire mid-session)
- **Audit Trail:** Semua perubahan order tercatat (immutable, admin-only access)
- **RLS Policies:** Database-level security dengan Row Level Security
- **Token Expiry:** Token otomatis expire setelah 24 jam (atau extend jika aktif)

---

## Demo

**Live Demo:** [https://order-kopi-app.netlify.app](https://order-kopi-app.netlify.app)

---

## Cara Setup

### Prasyarat

- [Node.js](https://nodejs.org) versi 18 atau lebih baru
- Akun [Supabase](https://supabase.com) (gratis)
- Akun [Netlify](https://netlify.com) (gratis, opsional untuk deploy)

---

### Langkah 1: Clone & Install

```bash
git clone <repo-url>
cd order-kopi
npm install
```

---

### Langkah 2: Setup Database (Supabase)

#### Untuk Database Baru:

1. Buka [supabase.com](https://supabase.com) → buat project baru
2. Tunggu project selesai dibuat (~1 menit)
3. Buka **SQL Editor** (menu kiri)
4. Klik **"New query"**
5. Copy-paste **seluruh isi** file `supabase/setup.sql` ke editor
6. Klik **"Run"** (atau Ctrl+Enter)
7. Pastikan tidak ada error (hijau semua)

> File `setup.sql` sudah mencakup semua tabel, fungsi, kebijakan keamanan, storage, dan data sample. Cukup jalankan sekali.

#### Untuk Database yang Sudah Ada (Migration):

Jika kamu sudah punya database order-kopi versi lama, jalankan migration untuk menambahkan fitur session token:

1. Buka **SQL Editor** di Supabase
2. Copy-paste isi file `supabase/migrations/001_add_session_token.sql`
3. Klik **"Run"**
4. Verifikasi dengan query:
```sql
select column_name from information_schema.columns 
where table_name = 'orders' and column_name = 'session_token';
```

---

### Langkah 3: Buat Admin User

1. Di Supabase Dashboard, buka **Authentication** → **Users**
2. Klik **"Add user"** → **"Create new user"**
3. Isi:
   - **Email:** email kamu (contoh: admin@tokoku.com)
   - **Password:** password yang kuat (minimal 6 karakter)
   - Centang **"Auto Confirm"**
4. Klik **"Create user"**

> Email ini yang akan dipakai untuk login ke panel admin.

---

### Langkah 4: Ambil API Keys

1. Di Supabase Dashboard, buka **Settings** → **API**
2. Catat/copy:
   - **Project URL** (contoh: `https://abcdefgh.supabase.co`)
   - **anon public key** (string panjang yang dimulai dengan `eyJ...`)

---

### Langkah 5: Environment Variables

```bash
cp .env.example .env
```

Edit file `.env`, isi dengan data dari langkah 4:

```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Langkah 6: Jalankan Aplikasi

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173) di browser.

---

### Langkah 7: Setup Toko

1. Buka [http://localhost:5173/login](http://localhost:5173/login)
2. Login dengan email + password admin yang dibuat di Langkah 3
3. Ikuti **Setup Wizard**:
   - Masukkan nama toko
   - Upload gambar QRIS (untuk pembayaran)
   - Atur jam operasional
   - Tambahkan cabang pertama
4. Klik **"Mulai Terima Pesanan"**
5. Selesai! Toko siap menerima pesanan dari pelanggan.

---

## Deploy ke Netlify

### Cara 1: Via CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
```

Saat ditanya:
- Build command: `npm run build`
- Publish directory: `dist`

Set environment variables di Netlify Dashboard → Site settings → Environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Lalu deploy:

```bash
netlify deploy --prod
```

### Cara 2: Via GitHub (Auto Deploy)

1. Push repo ke GitHub
2. Di Netlify, klik **"Add new site"** → **"Import an existing project"**
3. Pilih repo GitHub kamu
4. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Tambahkan environment variables
6. Klik **"Deploy site"**

Setiap push ke branch `main` akan otomatis deploy.

---

## Deploy Edge Functions (Opsional)

Edge Functions menyediakan fitur tambahan:
- **confirm-payment** — Notifikasi Telegram saat pembayaran dikonfirmasi
- **auto-cancel** — Otomatis batalkan pesanan yang tidak dibayar dalam 15 menit

### Setup:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Set secrets untuk Telegram (opsional):

```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN=your-bot-token TELEGRAM_CHAT_ID=your-chat-id
```

Deploy functions:

```bash
npx supabase functions deploy confirm-payment --no-verify-jwt
npx supabase functions deploy auto-cancel --no-verify-jwt
```

> **Catatan:** Untuk auto-cancel, setup Cron Job di Supabase Dashboard → Database → Extensions → pg_cron, atau panggil endpoint secara berkala.

---

## Struktur Project

```
order-kopi/
├── public/              # Static assets (favicon, manifest, QRIS placeholder)
├── src/
│   ├── components/      # Komponen reusable (Cart, Toast, ProductCard, dll)
│   ├── lib/             # Context, hooks, dan utility (Auth, Cart, Orders, Store)
│   ├── pages/           # Halaman aplikasi
│   │   ├── Home.jsx         # Menu pelanggan
│   │   ├── Checkout.jsx     # Halaman checkout
│   │   ├── OrderStatus.jsx  # Tracking pesanan real-time
│   │   ├── Login.jsx        # Login admin
│   │   ├── Admin.jsx        # Dashboard admin
│   │   ├── AdminMenu.jsx    # Kelola menu
│   │   ├── AdminBranch.jsx  # Kelola cabang
│   │   ├── AdminPromo.jsx   # Kelola promo
│   │   ├── AdminReport.jsx  # Laporan penjualan
│   │   ├── AdminSettings.jsx # Pengaturan toko
│   │   └── SetupWizard.jsx  # Setup awal toko
│   ├── App.jsx          # Router & providers
│   ├── main.jsx         # Entry point
│   └── index.css        # Tailwind + custom CSS variables
├── supabase/
│   ├── setup.sql        # Database setup (jalankan di SQL Editor)
│   └── functions/       # Edge Functions (opsional)
├── .env.example         # Template environment variables
├── netlify.toml         # Konfigurasi Netlify
├── package.json
└── vite.config.js
```

---

## Kustomisasi

### Ganti Warna Utama

Edit `src/index.css`, cari bagian CSS variables:

```css
--color-primary: oklch(0.45 0.15 160); /* Hijau tua */
```

Ganti dengan warna yang kamu inginkan.

### Ganti Font

1. Edit `index.html` — ganti link Google Fonts
2. Edit `src/index.css` — ganti `--font-sans`

### Tambah Menu

Login sebagai admin → **Kelola Menu** → klik tombol **"+"** untuk tambah produk baru.

### Tambah Cabang

Login sebagai admin → **Kelola Cabang** → tambah cabang baru.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| Icons | Lucide React |
| Font | Plus Jakarta Sans |
| Hosting | Netlify (atau platform lain yang support SPA) |
| PWA | vite-plugin-pwa |

---

## Keamanan & Privacy

### Session Token System

Order Kopi menggunakan **session token** untuk melindungi privasi customer tanpa memerlukan registrasi:

**Cara Kerja:**
1. Setiap customer mendapat token unik saat pertama kali order
2. Token disimpan di localStorage browser
3. Customer hanya bisa akses order dengan token mereka
4. Token expire otomatis setelah 24 jam

**Keuntungan:**
- ✅ Tidak perlu registrasi/login
- ✅ Order terisolasi per device
- ✅ Mencegah orang lain lihat/manipulasi order kamu
- ✅ Admin tetap bisa lihat semua order

### Rate Limiting

Untuk mencegah spam dan abuse:
- Maksimal **5 order per jam** per device
- Counter reset otomatis setelah 1 jam
- Error message jelas jika limit tercapai

### Database Security (RLS)

Semua tabel menggunakan **Row Level Security (RLS)** Supabase:
- Customer hanya bisa baca/update order mereka sendiri
- Admin (authenticated) bisa akses semua data
- Kebijakan keamanan di level database (tidak bisa di-bypass)

### Testing Security

Untuk memverifikasi keamanan sudah berjalan dengan benar, ikuti panduan di `SECURITY_TESTING.md`:

```bash
# Lihat panduan testing
cat SECURITY_TESTING.md
```

**Test yang harus dilakukan:**
1. ✅ Session token generation
2. ✅ Order ownership isolation
3. ✅ Prevent unauthorized updates
4. ✅ Admin access verification
5. ✅ Rate limiting
6. ✅ Token expiry
7. ✅ Cross-browser isolation
8. ✅ Cancel order security

---

## Troubleshooting

### Order tidak muncul setelah dibuat

**Penyebab:** Session token hilang atau berubah

**Solusi:**
1. Cek localStorage: `localStorage.getItem('order_session_token')`
2. Jangan clear browser data setelah order
3. Gunakan browser yang sama untuk cek order

### "Terlalu banyak pesanan" error

**Penyebab:** Rate limit tercapai (5 order/jam)

**Solusi:**
1. Tunggu 1 jam untuk reset otomatis
2. Atau reset manual (testing only):
```javascript
localStorage.removeItem('order_rate_limit');
```

### Admin tidak bisa lihat order

**Penyebab:** RLS policy tidak aktif atau user belum authenticated

**Solusi:**
1. Pastikan sudah login sebagai admin
2. Cek di Supabase Dashboard → Authentication → Users
3. Verifikasi RLS policies aktif:
```sql
select policyname from pg_policies where tablename = 'orders';
```

### Migration error saat update database

**Penyebab:** Kolom `session_token` sudah ada atau policy conflict

**Solusi:**
1. Cek apakah kolom sudah ada:
```sql
select column_name from information_schema.columns 
where table_name = 'orders' and column_name = 'session_token';
```
2. Jika sudah ada, skip bagian `alter table`
3. Hanya jalankan bagian `drop policy` dan `create policy`

---

## Lisensi

MIT License — bebas digunakan untuk keperluan komersial maupun personal.

---

## Bantuan

Jika ada pertanyaan atau kendala saat setup, silakan hubungi developer.
