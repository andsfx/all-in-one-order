# Troubleshooting

## Order tidak muncul setelah dibuat

**Penyebab:** Session token hilang atau berubah

**Solusi:**
1. Cek localStorage: `localStorage.getItem('order_session_token')`
2. Jangan clear browser data setelah order
3. Gunakan browser yang sama untuk cek order

---

## "Terlalu banyak pesanan" error

**Penyebab:** Rate limit tercapai (5 order/jam)

**Solusi:**
1. Tunggu 1 jam untuk reset otomatis
2. Atau reset manual (testing only):
```javascript
localStorage.removeItem('order_rate_limit');
```

---

## Admin tidak bisa lihat order

**Penyebab:** RLS policy tidak aktif atau user belum authenticated

**Solusi:**
1. Pastikan sudah login sebagai admin
2. Cek di Supabase Dashboard → Authentication → Users
3. Verifikasi RLS policies aktif:
```sql
select policyname from pg_policies where tablename = 'orders';
```

---

## Migration error saat update database

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

## Unique code collision error

**Penyebab:** Duplicate unique code generated (very rare with 0-500 range)

**Solusi:**
1. Check database constraint is active
2. Verify migration 007 applied correctly
3. System will auto-regenerate code if collision detected

---

## Payment proof upload fails

**Penyebab:** File too large or invalid format

**Solusi:**
1. Max file size: 5MB
2. Allowed formats: JPEG, PNG, WebP
3. Image will auto-compress to 2048px max
4. Check browser console for detailed error

---

## Auto-verification not working

**Penyebab:** Amount mismatch or fraud detection triggered

**Solusi:**
1. Verify customer paid EXACT amount (including unique code)
2. Check if customer has >3 auto-verified orders (fraud threshold)
3. Admin can manually verify from dashboard
4. Check audit logs for verification attempts

---

## Edge Function deployment fails

**Penyebab:** Missing secrets or wrong project ref

**Solusi:**
1. Verify project is linked: `npx supabase projects list`
2. Check required secrets are set: `npx supabase secrets list`
3. Make sure `ALLOWED_ORIGINS` matches your domain
4. Try with `--debug` flag for detailed error:
```bash
npx supabase functions deploy verify-payment --no-verify-jwt --debug
```

---

## CORS error on API calls

**Penyebab:** Domain not in ALLOWED_ORIGINS

**Solusi:**
1. Update `ALLOWED_ORIGINS` in Supabase secrets:
```bash
npx supabase secrets set ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```
2. Trailing slashes are automatically normalized
3. Redeploy edge functions after updating secrets

---

## Real-time updates not working

**Penyebab:** Supabase realtime subscription not active

**Solusi:**
1. Check Supabase Dashboard → Database → Replication
2. Make sure `orders` table has realtime enabled
3. Verify RLS policies allow the subscription
4. Admin dashboard also calls `fetchOrders()` explicitly after order creation as fallback
