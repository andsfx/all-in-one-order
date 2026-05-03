# Cashi.id Payment Integration Guide

## Overview

Integrasi Cashi.id untuk dynamic QRIS payment dengan auto-confirmation via webhook.

---

## Features

- ✅ Dynamic QRIS generation per order
- ✅ Auto-confirm payment via webhook
- ✅ Support Cash payment (fallback)
- ✅ Audit logging untuk payment events
- ✅ Session token security
- ✅ Real-time status updates

---

## Architecture

```
Customer Order (QRIS)
    ↓
Frontend calls create-cashi-payment Edge Function
    ↓
Cashi.id API generates dynamic QRIS
    ↓
Customer scans & pays
    ↓
Cashi.id sends webhook to cashi-webhook Edge Function
    ↓
Auto-update order status to 'paid'
    ↓
Real-time update to customer & admin
```

---

## Setup Instructions

### 1. Set Supabase Secrets

```bash
# Login to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Set secrets
npx supabase secrets set CASHI_API_KEY=CASHI-1AKE5VR2PAD
npx supabase secrets set CASHI_WEBHOOK_SECRET=sk_02ee564329393b25a5ea0b56bb4e7cb6
```

### 2. Deploy Edge Functions

```bash
# Deploy create-cashi-payment function
npx supabase functions deploy create-cashi-payment --no-verify-jwt

# Deploy cashi-webhook function  
npx supabase functions deploy cashi-webhook --no-verify-jwt
```

### 3. Configure Cashi.id Webhook

1. Login ke [Cashi.id Dashboard](https://cashi.id/dashboard)
2. Go to Settings → Webhooks
3. Add webhook URL:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/cashi-webhook
   ```
4. Set webhook secret: `sk_02ee564329393b25a5ea0b56bb4e7cb6`
5. Enable events: `payment.success`, `payment.failed`

### 4. Test Integration

```bash
# Test create payment
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-cashi-payment \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORD-TEST",
    "amount": 50000,
    "customer_name": "Test Customer"
  }'

# Expected response:
{
  "success": true,
  "payment_id": "cashi_xxx",
  "qris_url": "https://cashi.id/qr/xxx.png",
  "expires_at": "2026-05-03T15:00:00Z"
}
```

---

## API Endpoints

### Create Payment

**Endpoint:** `POST /functions/v1/create-cashi-payment`

**Request:**
```json
{
  "order_id": "ORD-0001",
  "amount": 50000,
  "customer_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "cashi_abc123",
  "qris_url": "https://cashi.id/qr/abc123.png",
  "expires_at": "2026-05-03T15:00:00Z"
}
```

### Webhook Handler

**Endpoint:** `POST /functions/v1/cashi-webhook`

**Payload (from Cashi.id):**
```json
{
  "event": "payment.success",
  "payment_id": "cashi_abc123",
  "order_id": "ORD-0001",
  "amount": 50000,
  "paid_at": "2026-05-03T14:30:00Z",
  "signature": "sha256_hash"
}
```

---

## Database Changes

No schema changes needed! Existing fields are used:

```sql
orders table:
- payment_id: text       -- Cashi.id transaction ID
- payment_url: text      -- Dynamic QRIS image URL
- paid_at: timestamptz   -- Payment timestamp from webhook
- payment_method: text   -- 'qris' or 'cash'
```

---

## Frontend Changes

### Checkout.jsx
- Calls `create-cashi-payment` when payment_method = 'qris'
- Stores `payment_id` and `payment_url` in order

### OrderStatus.jsx
- Shows dynamic QRIS from `order.paymentUrl`
- Falls back to static QRIS if `payment_url` is null
- Real-time updates via Supabase subscription

### Admin.jsx
- No manual "Konfirmasi Bayar" needed for QRIS
- Webhook auto-confirms payment
- Manual confirmation still available for Cash

---

## Error Handling

### Payment Creation Fails
```javascript
// Frontend shows error toast
// Order stays in 'pending_payment'
// Customer can retry or cancel
```

### Webhook Fails
```javascript
// Cashi.id retries webhook (exponential backoff)
// Admin can manually confirm if webhook never arrives
// Audit log records webhook failures
```

### QRIS Expires
```javascript
// Cashi.id QRIS expires after 15 minutes
// Customer sees "QRIS expired" message
// Can generate new QRIS or cancel order
```

---

## Testing Checklist

- [ ] Create order with QRIS payment method
- [ ] Verify dynamic QRIS appears in OrderStatus
- [ ] Test payment via Cashi.id sandbox
- [ ] Verify webhook auto-confirms payment
- [ ] Check audit log records payment event
- [ ] Test Cash payment still works
- [ ] Test QRIS expiry handling
- [ ] Test webhook signature verification
- [ ] Test concurrent payments
- [ ] Test error scenarios

---

## Monitoring

### Check Edge Function Logs

```bash
# View create-cashi-payment logs
npx supabase functions logs create-cashi-payment

# View webhook logs
npx supabase functions logs cashi-webhook
```

### Check Audit Logs

```sql
-- View payment-related audit logs
select * from audit_logs 
where table_name = 'orders' 
  and action = 'STATUS_CHANGE'
  and field_name = 'status'
  and new_value = 'paid'
order by created_at desc
limit 20;
```

---

## Troubleshooting

### QRIS Not Showing
1. Check Edge Function logs for errors
2. Verify CASHI_API_KEY is set correctly
3. Check Cashi.id API status

### Webhook Not Working
1. Verify webhook URL in Cashi.id dashboard
2. Check CASHI_WEBHOOK_SECRET matches
3. View webhook logs in Supabase
4. Test webhook manually with curl

### Payment Not Auto-Confirming
1. Check webhook signature verification
2. Verify order_id matches
3. Check database RLS policies
4. View audit logs for webhook events

---

## Migration from Static QRIS

### Before Migration
- Static QRIS uploaded in AdminSettings
- Manual payment confirmation by admin
- No payment tracking

### After Migration
- Dynamic QRIS per order
- Auto-confirmation via webhook
- Full payment audit trail
- Static QRIS removed from settings

### Rollback Plan
If Cashi.id integration fails:
1. Revert frontend to show static QRIS
2. Re-enable manual confirmation
3. Keep Edge Functions for future retry

---

## Security

- ✅ Webhook signature verification
- ✅ API key stored in Supabase secrets
- ✅ Session token for order ownership
- ✅ RLS policies on orders table
- ✅ Audit logging for all payment events

---

## Cost Estimation

**Cashi.id Fees:**
- Transaction fee: ~0.7% per transaction
- No monthly fee
- No setup fee

**Supabase Edge Functions:**
- Free tier: 500K invocations/month
- Paid: $0.50 per 1M invocations

**Example:**
- 1000 orders/month
- 2000 Edge Function calls (create + webhook)
- Cost: ~Rp 350/order (Cashi.id fee only)

---

## Support

**Cashi.id:**
- Docs: https://cashi.id/doc
- Support: support@cashi.id
- WhatsApp: +62 xxx xxx xxxx

**Order Kopi:**
- GitHub: https://github.com/andsfx/order-kopi
- Issues: https://github.com/andsfx/order-kopi/issues

---

## Next Steps

1. ✅ Deploy Edge Functions
2. ✅ Configure webhook in Cashi.id
3. ✅ Test in sandbox environment
4. ⏳ Go live in production
5. ⏳ Monitor first 100 transactions
6. ⏳ Optimize based on metrics
