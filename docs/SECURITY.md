# Keamanan & Privacy

## Session Token System

Order Kopi menggunakan **session token** untuk melindungi privasi customer tanpa memerlukan registrasi:

### Cara Kerja
1. Setiap customer mendapat token unik saat pertama kali order
2. Token disimpan di localStorage browser
3. Customer hanya bisa akses order dengan token mereka
4. Token expire otomatis setelah 24 jam

### Keuntungan
- ✅ Tidak perlu registrasi/login
- ✅ Order terisolasi per device
- ✅ Mencegah orang lain lihat/manipulasi order kamu
- ✅ Admin tetap bisa lihat semua order

---

## Rate Limiting

Untuk mencegah spam dan abuse:
- Maksimal **5 order per jam** per device
- Counter reset otomatis setelah 1 jam
- Error message jelas jika limit tercapai

---

## Database Security (RLS)

Semua tabel menggunakan **Row Level Security (RLS)** Supabase:
- Customer hanya bisa baca/update order mereka sendiri
- Admin (authenticated) bisa akses semua data
- `error_logs` hanya bisa di-insert (frontend tidak bisa baca error log)
- Kebijakan keamanan di level database (tidak bisa di-bypass)

---

## Payment Security

- **Webhook HMAC Signature:** Semua webhook request diverifikasi dengan HMAC signature
- **Payment Proof Validation:** Magic bytes check mencegah file spoofing (bukan cuma extension check)
- **Fraud Detection:** Risk scoring 0-100 dengan pattern detection:
  - Duplicate payment proof detection
  - Rapid submission detection
  - Multiple auto-verified orders threshold
- **Concurrent Verification Protection:** Optimistic locking mencegah duplicate approvals
- **Unique Code Collision Prevention:** Database constraint + 0-500 range

---

## Audit Trail

Semua perubahan order tercatat secara immutable:
- 15+ event types (status_change, payment_verified, etc.)
- Admin-only access
- Tidak bisa dihapus atau diubah (append-only)

### Testing Security

Untuk memverifikasi keamanan sudah berjalan dengan benar, ikuti panduan di `SECURITY_TESTING.md`:

```bash
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

## Error Monitoring

Order Kopi menggunakan **custom error logging** ke Supabase, tanpa dependency eksternal.

### Cara Kerja

1. **Global error handlers** menangkap semua unhandled error & promise rejection
2. **ErrorBoundary** menangkap error di komponen React
3. Error disimpan ke tabel `error_logs` di Supabase (insert-only, frontend tidak bisa baca)
4. Lihat error di **Supabase Dashboard → Table Editor → error_logs**

### Data yang Tersimpan

| Kolom | Isi |
|-------|-----|
| `message` | Pesan error |
| `stack` | Stack trace |
| `component_stack` | React component stack (dari ErrorBoundary) |
| `url` | URL halaman saat error |
| `browser` | Chrome / Firefox / Safari / Edge |
| `os` | Windows / macOS / Android / iOS |
| `device` | Mobile / Desktop |
| `environment` | development / production |
| `metadata` | Extra data (JSON) |
| `created_at` | Waktu error |

### Manual Error Logging

Untuk log error dari kode custom:

```javascript
import { logError } from './lib/logError';

try {
  // risky operation
} catch (error) {
  logError(error, { metadata: { context: 'checkout' } });
}
```

### Auto-Cleanup

Error logs dihapus otomatis setelah 30 hari (via pg_cron). Tidak perlu maintenance manual.
