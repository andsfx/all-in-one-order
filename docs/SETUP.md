# Setup Guide

## Prasyarat

- [Node.js](https://nodejs.org) versi 18 atau lebih baru
- Akun [Supabase](https://supabase.com) (gratis)
- Akun [Netlify](https://netlify.com) (gratis, opsional untuk deploy)

---

## Langkah 1: Clone & Install

```bash
git clone <repo-url>
cd all-in-one-order
npm install
```

---

## Langkah 2a: Local Development (Tanpa Cloud)

Untuk development dan testing tanpa Supabase cloud:

### Prasyarat Tambahan
- [Docker Desktop](https://docker.com/products/docker-desktop) (harus running)

### Setup Supabase Lokal

```bash
npx supabase start
```

Tunggu sampai selesai (pertama kali ~2-5 menit download images). Setelah selesai, akan muncul:

```
API URL: http://127.0.0.1:54321
anon key: eyJ...
service_role key: eyJ...
Studio URL: http://127.0.0.1:54323
```

### Isi .env dengan Credentials Lokal

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key dari output di atas>
```

### Setup Database

```bash
npx supabase db reset
```

Ini akan menjalankan semua migrations + seed data otomatis.

### Buat Admin User

Buka Supabase Studio di http://127.0.0.1:54323:
1. Buka **Authentication** → **Users**
2. Klik **"Add user"** → **"Create new user"**
3. Isi email + password, centang **Auto Confirm**

Atau via SQL di Studio SQL Editor:

```sql
-- Buat admin user (ganti email/password sesuai keinginan)
SELECT supabase_auth.create_user(
  '{"email": "admin@toko.com", "password": "admin123", "email_confirm": true}'
);
```

### Jalankan Aplikasi

```bash
npm run dev
```

Buka http://localhost:5173

### Stop Supabase Lokal

```bash
npx supabase stop
```

> **Catatan**: Data lokal tetap tersimpan selama Docker volume tidak dihapus. Gunakan `npx supabase db reset` untuk reset ke state awal.

---

## Langkah 2b: Setup Database (Supabase Cloud)

> Lewati langkah ini jika menggunakan Supabase lokal (Langkah 2a).

### Untuk Database Baru:

1. Buka [supabase.com](https://supabase.com), buat project baru
2. Tunggu project selesai dibuat (sekitar 1 menit)
3. Buka **SQL Editor** (menu kiri)
4. Klik **"New query"**
5. Copy-paste **seluruh isi** file `supabase/setup.sql` ke editor
6. Klik **"Run"** (atau Ctrl+Enter)
7. Pastikan tidak ada error (hijau semua)

> File `setup.sql` sudah mencakup semua tabel, fungsi, kebijakan keamanan, storage, dan data sample. Cukup jalankan sekali.

### Untuk Database yang Sudah Ada (Migration):

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

## Langkah 3: Buat Admin User

1. Di Supabase Dashboard, buka **Authentication**, lalu **Users**
2. Klik **"Add user"**, pilih **"Create new user"**
3. Isi:
   - **Email:** email kamu (contoh: admin@tokoku.com)
   - **Password:** password yang kuat (minimal 6 karakter)
   - Centang **"Auto Confirm"**
4. Klik **"Create user"**

> Email ini yang akan dipakai untuk login ke panel admin.

---

## Langkah 4: Ambil API Keys

1. Di Supabase Dashboard, buka **Settings**, lalu **API**
2. Catat atau copy:
   - **Project URL** (contoh: `https://abcdefgh.supabase.co`)
   - **anon public key** (string panjang yang dimulai dengan `eyJ...`)

---

## Langkah 5: Environment Variables

```bash
cp .env.example .env
```

Edit file `.env`, isi dengan data dari langkah 4:

```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Langkah 6: Jalankan Aplikasi

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173) di browser.

---

## Langkah 7: Setup Toko

1. Buka [http://localhost:5173/login](http://localhost:5173/login)
2. Login dengan email dan password admin yang dibuat di Langkah 3
3. Ikuti **Setup Wizard**:
   - Pilih jenis bisnis
   - Masukkan nama toko + WhatsApp
   - Upload logo (opsional)
   - Upload QRIS
   - Pilih tipe pemenuhan
   - Atur jam operasional
   - Tambah cabang pertama
   - Klik "Buka Toko"
4. Selesai! Toko siap menerima pesanan dari pelanggan.

---

## Struktur Project

```
all-in-one-order/
├── public/              # Static assets (favicon, manifest, QRIS placeholder)
├── src/
│   ├── components/      # Komponen reusable (Cart, Toast, ProductCard, dll)
│   ├── lib/             # Context, hooks, dan utility (Auth, Cart, Orders, Store)
│   │   ├── logError.js      # Custom error logging ke Supabase
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
│   ├── config.toml      # Konfigurasi Supabase lokal
│   ├── migrations/      # Database migrations
│   ├── setup.sql        # Database setup (jalankan di SQL Editor)
│   └── functions/       # Edge Functions (opsional)
├── .env.example         # Template environment variables
├── netlify.toml         # Konfigurasi Netlify
├── package.json
└── vite.config.js
```
