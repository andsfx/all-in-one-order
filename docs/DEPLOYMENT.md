# Panduan Deployment

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

## Deploy Edge Functions

Edge Functions menyediakan fitur tambahan:
- **verify-payment**: Auto-verify pembayaran + fraud detection
- **confirm-payment**: Konfirmasi manual oleh admin + notifikasi Telegram
- **auto-cancel**: Otomatis batalkan pesanan yang tidak dibayar dalam 15 menit
- **cleanup-old-proofs**: Auto-delete payment proofs >90 hari
- **payment-webhook**: Webhook untuk payment provider (dengan HMAC signature)

### Setup:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Set secrets:

```bash
# Wajib
npx supabase secrets set ALLOWED_ORIGINS=https://your-domain.com

# Untuk webhook signature (auto-generate)
npx supabase secrets set BAYAR_WEBHOOK_SECRET=your-secret-key

# Opsional, Telegram notifications
npx supabase secrets set TELEGRAM_BOT_TOKEN=your-bot-token TELEGRAM_CHAT_ID=your-chat-id
```

Deploy semua functions:

```bash
npx supabase functions deploy verify-payment --no-verify-jwt
npx supabase functions deploy confirm-payment --no-verify-jwt
npx supabase functions deploy auto-cancel --no-verify-jwt
npx supabase functions deploy cleanup-old-proofs --no-verify-jwt
npx supabase functions deploy payment-webhook --no-verify-jwt
```

### pg_cron Jobs (Auto-cancel & Cleanup)

Di Supabase SQL Editor, jalankan:

```sql
-- Auto-cancel pesanan yang belum bayar setelah 15 menit (setiap 5 menit)
SELECT cron_schedule(
  'auto-cancel-unpaid',
  '*/5 * * * *',
  $$UPDATE public.orders SET status = 'cancelled' WHERE status = 'pending_payment' AND created_at < now() - interval '15 minutes'$$
);

-- Cleanup payment proofs >90 hari (setiap hari jam 3 AM UTC)
SELECT cron_schedule(
  'cleanup-old-proofs',
  '0 3 * * *',
  $$DELETE FROM public.payment_proofs WHERE created_at < now() - interval '90 days'$$
);
```

## Environment Variables

### Frontend (Vite)

| Variable | Wajib | Deskripsi |
|----------|-------|-----------|
| `VITE_SUPABASE_URL` | ✅ | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon public key |
| `VITE_ENABLE_AUTO_VERIFICATION` | ❌ | Enable auto-verify payment (default: true) |
| `VITE_ENABLE_FRAUD_DETECTION` | ❌ | Enable fraud detection (default: true) |
| `VITE_ENABLE_BULK_VERIFICATION` | ❌ | Enable bulk verify (default: true) |
| `VITE_ENABLE_PAYMENT_ANALYTICS` | ❌ | Enable payment analytics (default: true) |

### Edge Functions (Supabase Secrets)

| Variable | Wajib | Deskripsi |
|----------|-------|-----------|
| `ALLOWED_ORIGINS` | ✅ | Comma-separated allowed origins for CORS |
| `BAYAR_WEBHOOK_SECRET` | ❌ | HMAC secret for webhook signature |
| `TELEGRAM_BOT_TOKEN` | ❌ | Telegram bot token for notifications |
| `TELEGRAM_CHAT_ID` | ❌ | Telegram chat ID for notifications |

## Migration dari Cashi.id ke QRIS Static

Jika kamu upgrade dari Cashi.id dynamic QRIS:

### 1. Apply Database Migrations
```bash
npx supabase db reset  # Apply migrations 007+
```

### 2. Deploy Edge Functions
```bash
npx supabase functions deploy verify-payment --no-verify-jwt
npx supabase functions deploy cleanup-old-proofs --no-verify-jwt
```

### 3. Create Storage Bucket
- Go to Supabase Dashboard → Storage
- Create bucket: `payment-proofs` (private)
- Apply RLS policies (see Security docs)

### 4. Upload QRIS Image
- Login as admin
- Go to Settings → QRIS & WhatsApp
- Upload your static QRIS image

### 5. Test
- Create test order
- Upload payment proof
- Verify auto-verification works

**Cost Savings**: Rp 24M/year vs Cashi.id (3-5% fees)
