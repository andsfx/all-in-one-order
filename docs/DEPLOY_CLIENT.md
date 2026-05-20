# Deployment Guide: Per-Client Setup

Panduan deploy instance terpisah untuk setiap client (1 Vercel project + 1 Supabase project per client).

---

## Prerequisites

- GitHub account (untuk source code)
- Vercel account (untuk hosting frontend)
- Supabase account (untuk database per client)

---

## Step 1: Prepare Source Code (One-Time)

### 1.1 Push to GitHub

Jika belum ada repo:

```bash
gh auth login
gh repo create all-in-one-order --private --source=. --remote=origin --push
```

Atau manual:
1. Buat repo baru di GitHub (private recommended)
2. Push:
   ```bash
   git remote set-url origin https://github.com/YOUR_USERNAME/all-in-one-order.git
   git push -u origin main
   ```

### 1.2 Verify .gitignore

Pastikan `.env` tidak ter-commit:

```bash
git ls-files | grep .env
```

Jika muncul output, hapus:

```bash
git rm --cached .env
git commit -m "chore: remove .env from git"
git push
```

---

## Step 2: Setup Supabase (Per Client)

### 2.1 Create Project

1. Buka https://supabase.com/dashboard
2. Klik **"New project"**
3. Isi:
   - **Name**: `client-name-order` (contoh: `tokobudi-order`)
   - **Database Password**: Generate strong password (simpan!)
   - **Region**: Southeast Asia (Singapore)
4. Tunggu ~2 menit sampai project ready

### 2.2 Run Migrations

1. Di Supabase Dashboard, buka **SQL Editor**
2. Klik **"New query"**
3. Copy-paste **seluruh isi** `supabase/setup.sql` dari repo
4. Klik **"Run"** (Ctrl+Enter)
5. Pastikan semua hijau (no errors)

Atau via CLI (jika sudah link project):

```bash
npx supabase db push
```

### 2.3 Create Admin User

Di Supabase Dashboard:
1. Buka **Authentication** → **Users**
2. Klik **"Add user"** → **"Create new user"**
3. Isi:
   - **Email**: `admin@clientdomain.com`
   - **Password**: Strong password (share to client)
   - Centang **"Auto Confirm"**
4. Klik **"Create user"**

### 2.4 Get API Credentials

1. Buka **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...`

---

## Step 3: Deploy to Vercel (Per Client)

### 3.1 Import from GitHub

1. Buka https://vercel.com/new
2. Klik **"Import Git Repository"**
3. Pilih repo `all-in-one-order`
4. Klik **"Import"**

### 3.2 Configure Project

- **Project Name**: `client-name-order` (contoh: `tokobudi-order`)
- **Framework Preset**: Vite
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)

### 3.3 Add Environment Variables

Klik **"Environment Variables"**, tambahkan:

| Key | Value | Source |
|-----|-------|--------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Supabase Settings → API |

### 3.4 Deploy

Klik **"Deploy"**. Tunggu ~2-3 menit.

Setelah selesai, akan dapat URL: `https://client-name-order.vercel.app`

---

## Step 4: Client Handoff

Berikan ke client:

1. **Admin URL**: `https://client-name-order.vercel.app/login`
2. **Admin Email**: `admin@clientdomain.com`
3. **Admin Password**: `[password yang dibuat di Step 2.3]`
4. **Customer URL**: `https://client-name-order.vercel.app`

Instruksikan client:
1. Login ke admin
2. Ikuti Setup Wizard (8 langkah)
3. Edit produk sample sesuai menu mereka
4. Bagikan customer URL ke pelanggan

---

## Step 5: Custom Domain (Optional)

### 5.1 Di Vercel

1. Buka project → **Settings** → **Domains**
2. Klik **"Add"**
3. Masukkan domain client: `order.clientdomain.com`
4. Copy DNS records yang muncul

### 5.2 Di DNS Provider Client

Tambahkan CNAME record:

```
Type: CNAME
Name: order
Value: cname.vercel-dns.com
```

Tunggu propagasi (~5-60 menit).

---

## Troubleshooting

### Build Failed

- Check environment variables sudah benar
- Pastikan `VITE_` prefix ada
- Vercel logs: Project → Deployments → klik failed build → View Function Logs

### Database Connection Error

- Verify Supabase URL dan anon key
- Check Supabase project status (bukan paused)
- Test connection: buka `https://xxxxx.supabase.co/rest/v1/` di browser (harus return JSON)

### Admin Cannot Login

- Verify user created di Supabase Auth
- Check "Auto Confirm" was enabled
- Reset password via Supabase Dashboard

---

## Maintenance

### Update All Clients

1. Push update ke GitHub repo
2. Vercel auto-deploy semua connected projects
3. No client action needed

### Per-Client Customization

Jika client butuh custom code:
1. Fork repo untuk client tersebut
2. Deploy fork ke Vercel project client
3. Disconnect dari main repo

---

## Demo Mode

Untuk keperluan demo/showcase ke calon client:

### Setup Demo Instance

1. Buat 1 Supabase project khusus demo (contoh: `all-in-one-order-demo`)
2. Run `setup.sql` + migrations 017, 018, 019
3. Buat admin user: `demo@demo.com` / `demo123`
4. Deploy ke Vercel dengan env vars demo project
5. Share URL ke calon client

### Demo Account

```
URL: https://all-in-one-order.vercel.app
Admin: https://all-in-one-order.vercel.app/login
Email: demo@demo.com
Password: demo123
```

### Reset Demo

Setelah calon client selesai explore, reset ke kondisi awal:

**Via UI (recommended):**
1. Login admin
2. Buka **Pengaturan**
3. Scroll ke bagian "Reset Demo"
4. Ketik `DEMO` → klik "Reset Demo"
5. Wizard akan muncul kembali

**Via SQL (manual):**
```sql
DELETE FROM product_option_templates;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM product_variants;
DELETE FROM products;
DELETE FROM option_templates;
DELETE FROM categories;
UPDATE order_counter SET last_number = 0 WHERE id = 1;
DELETE FROM store_settings WHERE key NOT IN ('admin_whatsapp', 'primary_color');
INSERT INTO store_settings (key, value) VALUES
  ('store_name', 'Toko Saya'),
  ('is_open', 'true'),
  ('open_hour', '07:00'),
  ('close_hour', '22:00')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Tips Demo

- Jalankan wizard lengkap di depan calon client (impress mereka dengan auto-generate)
- Tunjukkan customer view di tab terpisah
- Buat 1 test order untuk demo flow pesanan
- Reset setelah selesai untuk visitor berikutnya
