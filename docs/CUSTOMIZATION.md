# Kustomisasi

## Ganti Warna Utama

Edit `src/index.css`, cari bagian CSS variables:

```css
--color-primary: oklch(0.45 0.15 160); /* Hijau tua */
```

Ganti dengan warna yang kamu inginkan. Contoh:

```css
--color-primary: oklch(0.55 0.2 25); /* Merah-coklat */
--color-primary: oklch(0.5 0.15 280); /* Ungu */
--color-primary: oklch(0.45 0.12 30); /* Coklat kopi */
```

## Ganti Font

1. Edit `index.html`, ganti link Google Fonts
2. Edit `src/index.css`, ganti `--font-sans`

Contoh ganti ke font lain:
```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

```css
/* index.css */
--font-sans: 'Inter', sans-serif;
```

## Tambah Menu

Login sebagai admin, buka **Kelola Menu**, klik tombol **"+"** untuk tambah produk baru.

### Field Produk
- **Nama:** Nama produk (contoh: "Cappuccino")
- **Kategori:** Pilih atau buat kategori baru
- **Harga:** Harga dasar (Regular)
- **Harga Small:** Opsional, harga untuk ukuran Small
- **Harga Large:** Opsional, harga untuk ukuran Large
- **Foto:** Upload gambar produk (WebP recommended)
- **Diskon:** Set diskon % (opsional, harga coret otomatis muncul)

## Tambah Cabang

Login sebagai admin, buka **Kelola Cabang**, tambah cabang baru.

## Ganti QRIS Image

Login sebagai admin, buka **Settings**, pilih **QRIS & WhatsApp**, upload gambar QRIS static baru.

## Ganti Jam Operasional

Login sebagai admin, buka **Settings**, atur jam buka dan tutup per hari.

> Toko otomatis ditutup di luar jam operasional. Customer tetap bisa lihat menu tapi tidak bisa order.

## Setup Telegram Notifikasi

1. Buat bot via [@BotFather](https://t.me/BotFather) di Telegram
2. Dapatkan **Bot Token**
3. Dapatkan **Chat ID** (kirim pesan ke bot, lalu akses `https://api.telegram.org/bot<TOKEN>/getUpdates`)
4. Set secrets di Supabase:
```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN=your-bot-token TELEGRAM_CHAT_ID=your-chat-id
```
5. Deploy edge function:
```bash
npx supabase functions deploy confirm-payment --no-verify-jwt
```

Setelah setup, admin akan mendapat notifikasi Telegram setiap kali pembayaran dikonfirmasi.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) |
| Icons | Lucide React |
| Font | Plus Jakarta Sans |
| Hosting | Netlify (atau platform lain yang support SPA) |
| PWA | vite-plugin-pwa |
