# 📖 Panduan Setup Client Order Kopi

Panduan lengkap untuk setup aplikasi Order Kopi dari awal sampai siap produksi. Ikuti langkah demi langkah dengan teliti.

---

## 🎯 Persiapan

Sebelum mulai, pastikan Anda sudah punya:

- ✅ Akun [Supabase](https://supabase.com) (gratis)
- ✅ Akun [Vercel](https://vercel.com) atau [Netlify](https://netlify.com) (gratis)
- ✅ Gambar QRIS Static dari bank/payment gateway Anda
- ✅ Email dan password untuk admin dashboard
- ✅ Node.js terinstall di komputer (untuk deploy edge functions)
- ✅ Akses ke terminal/command prompt

⚠️ **Penting**: Proses ini membutuhkan waktu 30-60 menit. Siapkan kopi dulu! ☕

---

## Step 1: Buat Project Supabase

### 1.1 Daftar dan Login
1. Buka [supabase.com](https://supabase.com)
2. Klik **Start your project** dan login dengan GitHub
3. Klik **New Project**

### 1.2 Buat Project Baru
Isi form dengan data berikut:
- **Name**: `order-kopi-production` (atau nama toko Anda)
- **Database Password**: Buat password kuat, **SIMPAN** password ini!
- **Region**: Pilih **Southeast Asia (Singapore)** untuk performa terbaik
- **Pricing Plan**: Pilih **Free** (cukup untuk 50,000 rows)

Klik **Create new project** dan tunggu 2-3 menit.

### 1.3 Ambil API Keys
Setelah project siap:
1. Buka **Settings** (ikon gear di sidebar kiri)
2. Klik **API**
3. Copy dan simpan di notepad:
   - **Project URL** (contoh: `https://abcdefgh.supabase.co`)
   - **anon public** key (key yang panjang)

⚠️ **Jangan share API keys ke orang lain!**

### 1.4 Catat Project Reference
1. Masih di **Settings**, klik **General**
2. Copy **Reference ID** (contoh: `abcdefgh`)
3. Simpan untuk nanti

---

## Step 2: Setup Database

### 2.1 Buka SQL Editor
1. Di sidebar Supabase, klik **SQL Editor**
2. Klik **New query**

### 2.2 Copy Setup Script
1. Buka file `supabase/migrations/setup.sql` dari source code Order Kopi
2. Copy **semua isi file** (dari awal sampai akhir)
3. Paste ke SQL Editor di Supabase

### 2.3 Jalankan Script
1. Klik tombol **Run** (atau tekan Ctrl+Enter)
2. Tunggu sampai muncul **Success. No rows returned**
3. Jika ada error, screenshot dan hubungi developer

✅ Database Anda sekarang sudah punya 16 tabel dan semua fungsi yang dibutuhkan!

---

## Step 3: Buat Admin User

### 3.1 Buka Authentication
1. Di sidebar Supabase, klik **Authentication**
2. Klik tab **Users**
3. Klik tombol **Add user** → **Create new user**

### 3.2 Isi Data Admin
- **Email**: Email Anda untuk login (contoh: `admin@tokokopi.com`)
- **Password**: Buat password kuat, **SIMPAN** password ini!
- **Auto Confirm User**: ✅ Centang ini (penting!)

Klik **Create user**.

⚠️ **Simpan email dan password ini dengan aman. Ini untuk login ke admin dashboard!**

---

## Step 4: Set Admin Role

User yang baru dibuat belum punya akses admin. Kita perlu set role-nya.

### 4.1 Buka SQL Editor Lagi
1. Klik **SQL Editor** di sidebar
2. Klik **New query**

### 4.2 Jalankan Command Ini
Copy dan paste command berikut, **ganti email** dengan email admin Anda:

```sql
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'), 
  '{role}', 
  '"admin"'
) 
WHERE email = 'admin@tokokopi.com';
```

⚠️ **Ganti `admin@tokokopi.com` dengan email yang Anda buat di Step 3!**

Klik **Run**. Harusnya muncul **Success**.

✅ User Anda sekarang sudah jadi admin!

---

## Step 5: Upload QRIS

### 5.1 Buka Storage
1. Di sidebar Supabase, klik **Storage**
2. Klik **Create a new bucket**

### 5.2 Buat Bucket untuk QRIS
- **Name**: `qris`
- **Public bucket**: ✅ Centang ini (penting agar gambar bisa diakses)
- **File size limit**: `5 MB`
- **Allowed MIME types**: `image/png,image/jpeg,image/jpg`

Klik **Create bucket**.

### 5.3 Upload Gambar QRIS
1. Klik bucket **qris** yang baru dibuat
2. Klik **Upload file**
3. Pilih gambar QRIS Static Anda (format PNG atau JPG)
4. Rename file jadi `qris-static.png` atau `qris-static.jpg`
5. Klik **Upload**

### 5.4 Test Akses Gambar
1. Klik file yang baru diupload
2. Klik **Get public URL**
3. Copy URL dan buka di browser baru
4. Pastikan gambar QRIS muncul

✅ QRIS Anda sudah siap dipakai!

---

## Step 6: Deploy Frontend

Sekarang kita deploy aplikasi web-nya.

### 6.1 Pilih Platform
Pilih salah satu:
- **Vercel** (recommended, lebih mudah)
- **Netlify** (alternatif bagus)

### 6.2 Deploy ke Vercel

#### A. Connect Repository
1. Login ke [vercel.com](https://vercel.com)
2. Klik **Add New** → **Project**
3. Import repository GitHub Order Kopi Anda
4. Klik **Import**

#### B. Configure Project
- **Framework Preset**: Vite
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

#### C. Tambah Environment Variables
Klik **Environment Variables** dan tambahkan:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | URL Supabase Anda (dari Step 1.3) |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase Anda (dari Step 1.3) |

⚠️ **Pastikan nama variable PERSIS seperti di atas, termasuk `VITE_` prefix!**

#### D. Deploy
1. Klik **Deploy**
2. Tunggu 2-3 menit
3. Setelah selesai, klik **Visit** untuk buka website Anda

✅ Website Anda sudah live!

### 6.3 Deploy ke Netlify (Alternatif)

#### A. Connect Repository
1. Login ke [netlify.com](https://netlify.com)
2. Klik **Add new site** → **Import an existing project**
3. Pilih **GitHub** dan authorize
4. Pilih repository Order Kopi Anda

#### B. Configure Build Settings
- **Base directory**: (kosongkan)
- **Build command**: `npm run build`
- **Publish directory**: `dist`

#### C. Tambah Environment Variables
Klik **Show advanced** → **New variable**:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | URL Supabase Anda (dari Step 1.3) |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase Anda (dari Step 1.3) |

#### D. Deploy
1. Klik **Deploy site**
2. Tunggu 2-3 menit
3. Klik URL yang muncul untuk buka website

✅ Website Anda sudah live!

---

## Step 7: Setup Edge Functions

Edge Functions adalah backend logic untuk payment verification, auto-cancel, dll.

### 7.1 Install Supabase CLI
Buka terminal/command prompt dan jalankan:

```bash
npm install -g supabase
```

Tunggu sampai selesai.

### 7.2 Login ke Supabase
```bash
npx supabase login
```

Browser akan terbuka. Login dan authorize CLI.

### 7.3 Link Project
Ganti `YOUR_PROJECT_REF` dengan Reference ID dari Step 1.4:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Contoh:
```bash
npx supabase link --project-ref abcdefgh
```

Masukkan database password yang Anda buat di Step 1.2.

### 7.4 Deploy Edge Functions
Jalankan command ini satu per satu:

```bash
npx supabase functions deploy verify-payment --no-verify-jwt
npx supabase functions deploy confirm-payment --no-verify-jwt
npx supabase functions deploy auto-cancel --no-verify-jwt
npx supabase functions deploy cleanup-old-proofs --no-verify-jwt
npx supabase functions deploy payment-webhook --no-verify-jwt
```

Setiap command butuh 10-30 detik. Tunggu sampai muncul **Deployed successfully**.

### 7.5 Set Edge Function Secrets
Jalankan command ini (ganti URL dengan URL website Anda dari Step 6):

```bash
npx supabase secrets set ALLOWED_ORIGINS="https://your-site.vercel.app,https://your-site.netlify.app"
```

Contoh:
```bash
npx supabase secrets set ALLOWED_ORIGINS="https://order-kopi.vercel.app"
```

⚠️ **Ganti dengan URL website Anda yang sebenarnya!**

✅ Edge Functions sudah deploy dan siap dipakai!

---

## Step 8: Setup Auto-Cancel

Fitur ini otomatis cancel order yang tidak dibayar dalam 15 menit.

### 8.1 Enable pg_cron Extension
1. Buka **Database** di sidebar Supabase
2. Klik **Extensions**
3. Cari **pg_cron**
4. Toggle switch jadi **ON**

### 8.2 Buat Cron Job
1. Buka **SQL Editor**
2. Klik **New query**
3. Copy dan paste command ini:

```sql
SELECT cron.schedule(
  'auto-cancel-unpaid',
  '*/5 * * * *',
  $$
  UPDATE public.orders 
  SET status = 'cancelled' 
  WHERE status = 'pending_payment' 
    AND created_at < now() - interval '15 minutes'
  $$
);
```

4. Klik **Run**

✅ Auto-cancel sudah aktif! Order yang tidak dibayar dalam 15 menit akan otomatis dibatalkan setiap 5 menit.

---

## Step 9: Setup Telegram Notifikasi (Opsional)

Fitur ini kirim notifikasi ke Telegram setiap ada order baru.

### 9.1 Buat Bot Telegram
1. Buka Telegram dan cari **@BotFather**
2. Kirim command `/newbot`
3. Ikuti instruksi:
   - Bot name: `Order Kopi Bot` (atau nama toko Anda)
   - Username: `orderkopi_bot` (harus unik dan diakhiri `_bot`)
4. Copy **Bot Token** yang diberikan (contoh: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 9.2 Dapatkan Chat ID
1. Cari bot Anda di Telegram (username yang baru dibuat)
2. Klik **Start** atau kirim pesan apa saja
3. Buka browser dan akses URL ini (ganti `YOUR_BOT_TOKEN`):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
4. Cari `"chat":{"id":` dan copy angka setelahnya (contoh: `987654321`)

### 9.3 Set Secrets di Supabase
Jalankan command ini di terminal (ganti dengan token dan chat ID Anda):

```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
npx supabase secrets set TELEGRAM_CHAT_ID="987654321"
```

### 9.4 Redeploy Edge Functions
Karena ada secret baru, redeploy functions yang pakai Telegram:

```bash
npx supabase functions deploy verify-payment --no-verify-jwt
npx supabase functions deploy confirm-payment --no-verify-jwt
```

✅ Notifikasi Telegram sudah aktif! Anda akan dapat pesan setiap ada order baru.

---

## Step 10: Konfigurasi Toko

Sekarang setup aplikasinya dari admin dashboard.

### 10.1 Login ke Admin Dashboard
1. Buka website Anda (dari Step 6)
2. Klik **Login** atau akses `/admin`
3. Login dengan email dan password admin (dari Step 3)

### 10.2 Jalankan Setup Wizard
Setelah login pertama kali, akan muncul **Setup Wizard**. Isi dengan data toko Anda:

#### Informasi Toko
- **Nama Toko**: Nama kedai kopi Anda
- **Alamat**: Alamat lengkap
- **Nomor Telepon**: Nomor WhatsApp yang bisa dihubungi
- **Jam Buka**: Contoh: `08:00 - 22:00`

#### Pengaturan Payment
- **QRIS Image URL**: Copy URL QRIS dari Step 5.4
- **Unique Code Range**: `0-500` (default, bisa diubah nanti)
- **Payment Timeout**: `15` menit (default)

#### Pengaturan Order
- **Minimum Order**: Contoh: `10000` (Rp 10.000)
- **Delivery Fee**: Contoh: `5000` (Rp 5.000) atau `0` jika gratis
- **Estimasi Waktu**: Contoh: `15-30` menit

Klik **Simpan** dan **Selesai**.

### 10.3 Tambah Kategori Produk
1. Di admin dashboard, klik **Produk** → **Kategori**
2. Klik **Tambah Kategori**
3. Contoh kategori:
   - Coffee
   - Non-Coffee
   - Snack
   - Pastry

### 10.4 Tambah Produk
1. Klik **Produk** → **Daftar Produk**
2. Klik **Tambah Produk**
3. Isi form:
   - **Nama**: Contoh: `Kopi Susu Gula Aren`
   - **Kategori**: Pilih kategori
   - **Harga**: Contoh: `25000`
   - **Deskripsi**: Deskripsi singkat
   - **Gambar**: Upload foto produk (opsional)
   - **Status**: Aktif
   - **Stok**: Tersedia

#### Opsi Kustomisasi (Otomatis)
Sistem sudah punya opsi default:
- **Ukuran Cup**: Regular Ice (gratis) / Large Ice (+Rp 7.000)
- **Sweetness**: Normal Sweet / Less Sweet
- **Ice Cube**: Normal Ice / Less Ice / More Ice

Anda bisa edit di **Pengaturan** → **Opsi Kustomisasi** nanti.

4. Klik **Simpan**

Ulangi untuk semua produk Anda.

### 10.5 Test Order
1. Logout dari admin
2. Buka homepage website
3. Coba buat order:
   - Pilih produk
   - Tambah ke keranjang
   - Checkout
   - Upload bukti bayar dummy (foto apa saja)
4. Login ke admin lagi
5. Cek apakah order muncul di **Dashboard** → **Order Baru**
6. Coba verifikasi order

✅ Jika semua lancar, aplikasi Anda sudah siap!

---

## ✅ Checklist Produksi

Sebelum buka untuk customer, pastikan semua ini sudah dicek:

### Database & Backend
- [ ] Database sudah disetup (Step 2)
- [ ] Admin user sudah dibuat dan punya role admin (Step 3-4)
- [ ] Edge functions sudah deploy semua (Step 7)
- [ ] Auto-cancel sudah aktif (Step 8)

### Frontend & Assets
- [ ] Website sudah deploy dan bisa diakses (Step 6)
- [ ] QRIS image sudah diupload dan bisa diakses public (Step 5)
- [ ] Environment variables sudah diset dengan benar (Step 6)

### Konfigurasi Toko
- [ ] Setup wizard sudah dijalankan (Step 10.2)
- [ ] Informasi toko sudah lengkap dan benar
- [ ] Kategori produk sudah dibuat (Step 10.3)
- [ ] Minimal 3-5 produk sudah ditambahkan (Step 10.4)
- [ ] Harga produk sudah benar
- [ ] Opsi kustomisasi sudah dicek (ukuran, sweetness, ice)

### Testing
- [ ] Test order dari customer side berhasil
- [ ] Upload bukti bayar berhasil
- [ ] Notifikasi order baru muncul di admin dashboard
- [ ] Verifikasi payment berhasil
- [ ] Confirm order berhasil
- [ ] Auto-cancel berjalan (tunggu 15 menit untuk test)
- [ ] Telegram notifikasi berfungsi (jika diaktifkan)

### Security
- [ ] Admin password kuat dan aman
- [ ] Database password disimpan dengan aman
- [ ] API keys tidak di-commit ke GitHub
- [ ] ALLOWED_ORIGINS sudah diset dengan benar

### Performance
- [ ] Website load cepat (< 3 detik)
- [ ] Gambar produk sudah dioptimasi (< 500KB per gambar)
- [ ] QRIS image tidak terlalu besar (< 1MB)

---

## 🔧 Troubleshooting

### Website tidak bisa diakses
**Gejala**: Error 404 atau "Site not found"

**Solusi**:
1. Cek status deploy di Vercel/Netlify dashboard
2. Pastikan build berhasil (tidak ada error merah)
3. Cek environment variables sudah diset dengan benar
4. Redeploy dengan klik **Redeploy** di dashboard

### Login admin gagal
**Gejala**: "Invalid credentials" atau "User not found"

**Solusi**:
1. Pastikan email dan password benar (cek Step 3)
2. Cek user sudah dibuat di Supabase → Authentication → Users
3. Cek role admin sudah diset (jalankan ulang SQL di Step 4)
4. Clear browser cache dan cookies, coba lagi

### Order tidak muncul di dashboard
**Gejala**: Customer buat order tapi tidak muncul di admin

**Solusi**:
1. Cek di Supabase → Table Editor → orders, apakah data masuk?
2. Jika tidak ada data, cek browser console (F12) untuk error
3. Pastikan environment variables benar (Step 6)
4. Cek RLS policies di Supabase → Authentication → Policies

### QRIS tidak muncul di halaman payment
**Gejala**: Gambar QRIS tidak load atau error

**Solusi**:
1. Cek bucket `qris` di Supabase → Storage
2. Pastikan bucket **Public** (centang saat buat bucket)
3. Cek file ada dan bisa diakses via public URL
4. Update QRIS URL di admin → Pengaturan → Payment

### Edge function error
**Gejala**: Payment verification gagal atau auto-cancel tidak jalan

**Solusi**:
1. Cek logs di Supabase → Edge Functions → pilih function → Logs
2. Pastikan semua functions sudah deploy (Step 7.4)
3. Cek secrets sudah diset (Step 7.5)
4. Redeploy function yang error:
   ```bash
   npx supabase functions deploy FUNCTION_NAME --no-verify-jwt
   ```

### Auto-cancel tidak jalan
**Gejala**: Order pending lebih dari 15 menit tapi tidak auto-cancel

**Solusi**:
1. Cek pg_cron extension sudah enabled (Step 8.1)
2. Cek cron job sudah dibuat, jalankan SQL ini:
   ```sql
   SELECT * FROM cron.job;
   ```
3. Jika tidak ada, jalankan ulang Step 8.2
4. Test manual dengan SQL:
   ```sql
   UPDATE public.orders 
   SET status = 'cancelled' 
   WHERE status = 'pending_payment' 
     AND created_at < now() - interval '15 minutes';
   ```

### Telegram notifikasi tidak masuk
**Gejala**: Order baru tidak kirim notif ke Telegram

**Solusi**:
1. Pastikan bot token dan chat ID benar (Step 9)
2. Cek secrets sudah diset:
   ```bash
   npx supabase secrets list
   ```
3. Pastikan bot sudah di-start (kirim `/start` ke bot)
4. Redeploy functions:
   ```bash
   npx supabase functions deploy verify-payment --no-verify-jwt
   npx supabase functions deploy confirm-payment --no-verify-jwt
   ```

### Unique code tidak generate
**Gejala**: Total payment tidak ada unique code (contoh: Rp 50.000 flat)

**Solusi**:
1. Cek pengaturan di admin → Pengaturan → Payment
2. Pastikan **Unique Code Range** diisi (contoh: `0-500`)
3. Cek function `generate_unique_code` ada di database:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'generate_unique_code';
   ```
4. Jika tidak ada, jalankan ulang setup.sql (Step 2)

### Build gagal di Vercel/Netlify
**Gejala**: Deploy gagal dengan error saat build

**Solusi**:
1. Cek build logs untuk error spesifik
2. Pastikan `package.json` dan `package-lock.json` ada di repo
3. Cek Node.js version di settings (gunakan v18 atau v20)
4. Coba build lokal dulu:
   ```bash
   npm install
   npm run build
   ```
5. Fix error yang muncul, commit, push, redeploy

### Database connection error
**Gejala**: "Failed to connect to database" atau timeout

**Solusi**:
1. Cek Supabase project masih aktif (buka dashboard)
2. Pastikan VITE_SUPABASE_URL benar (tidak ada typo)
3. Cek API key masih valid di Supabase → Settings → API
4. Jika project di-pause (free tier idle), buka dashboard untuk wake up

---

## 📞 Butuh Bantuan?

Jika masih ada masalah setelah ikuti troubleshooting:

1. **Screenshot error** yang muncul (browser console, build logs, dll)
2. **Catat step mana** yang bermasalah
3. **Hubungi developer** dengan info lengkap

Untuk customization lebih lanjut, baca:
- `docs/CUSTOMIZATION.md` - Cara custom tampilan, warna, logo, dll
- `docs/FEATURES.md` - Daftar lengkap fitur dan cara pakainya

---

## 🎉 Selamat!

Aplikasi Order Kopi Anda sudah siap dipakai! 

Tips untuk hari pertama:
- Monitor dashboard secara berkala
- Siapkan stok produk dengan baik
- Test payment flow beberapa kali
- Siapkan customer service untuk handle pertanyaan
- Promosikan link website ke customer

**Semoga sukses dan laris manis! ☕🚀**
