# 🚀 QRIS Static Migration - Deployment Guide

**Project:** Order Kopi - QRIS Static Payment System  
**Migration:** Dynamic QRIS (Cashi.id) → Static QRIS with Unique Codes  
**Date:** 2026-05-06

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migration](#database-migration)
3. [Edge Functions Deployment](#edge-functions-deployment)
4. [Storage Bucket Setup](#storage-bucket-setup)
5. [Environment Variables](#environment-variables)
6. [Testing Checklist](#testing-checklist)
7. [Rollback Plan](#rollback-plan)
8. [Monitoring & Alerts](#monitoring--alerts)
9. [Troubleshooting](#troubleshooting)

---

## 1. Pre-Deployment Checklist

### ✅ Prerequisites

- [ ] Supabase project access (Admin role)
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Database backup completed
- [ ] Staging environment tested
- [ ] Team notified of deployment window
- [ ] Rollback plan reviewed

### ✅ Required Access

- [ ] Supabase Dashboard: https://supabase.com/dashboard
- [ ] Database credentials (connection string)
- [ ] Storage bucket permissions
- [ ] Edge Functions deployment access

### ✅ Code Review

```bash
# Verify migration file exists
ls -la supabase/migrations/007_add_qris_static.sql

# Check Edge Functions
ls -la supabase/functions/verify-payment/
ls -la supabase/functions/confirm-payment/
ls -la supabase/functions/cleanup-old-proofs/
ls -la supabase/functions/auto-cancel/

# Verify frontend changes
git diff main..qris-static-migration src/
```

---

## 2. Database Migration

### Step 1: Backup Current Database

```bash
# Using Supabase CLI
supabase db dump -f backup_before_qris_static.sql

# Or via pg_dump
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql
```

### Step 2: Apply Migration

```bash
# Navigate to project directory
cd D:\Andy\order-kopi

# Apply migration 007
supabase db push

# Or manually via SQL editor
```

**Manual SQL Execution:**

1. Open Supabase Dashboard → SQL Editor
2. Copy content from `supabase/migrations/007_add_qris_static.sql`
3. Execute the migration
4. Verify success

### Step 3: Verify Migration

```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('unique_code', 'payment_proof_url', 'payment_amount_entered', 'verified_by', 'verified_at', 'auto_verified');

-- Expected: 6 rows returned

-- Check unique index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders'
AND indexname = 'idx_orders_unique_code_date';

-- Expected: 1 row with unique index definition

-- Check constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
AND conname = 'check_unique_code_format';

-- Expected: 1 row with regex constraint
```

### Step 4: Test Unique Code Generation

```sql
-- Test unique code insertion
INSERT INTO orders (customer_name, total_amount, unique_code, status)
VALUES ('Test Customer', 50000, '1234', 'pending_verification');

-- Should succeed

-- Test duplicate code same day (should fail)
INSERT INTO orders (customer_name, total_amount, unique_code, status)
VALUES ('Test Customer 2', 60000, '1234', 'pending_verification');

-- Expected: ERROR - duplicate key value violates unique constraint

-- Test invalid code format (should fail)
INSERT INTO orders (customer_name, total_amount, unique_code, status)
VALUES ('Test Customer 3', 70000, '0123', 'pending_verification');

-- Expected: ERROR - check constraint violation

-- Cleanup test data
DELETE FROM orders WHERE customer_name LIKE 'Test Customer%';
```

---

## 3. Edge Functions Deployment

### Step 1: Install Dependencies

```bash
cd supabase/functions

# Install shared dependencies
cd _shared
npm install
cd ..
```

### Step 2: Deploy Functions

```bash
# Deploy verify-payment (handles payment proof upload)
supabase functions deploy verify-payment

# Deploy confirm-payment (admin confirmation)
supabase functions deploy confirm-payment

# Deploy cleanup-old-proofs (scheduled cleanup)
supabase functions deploy cleanup-old-proofs

# Deploy auto-cancel (cancel unpaid orders)
supabase functions deploy auto-cancel
```

### Step 3: Verify Deployment

```bash
# List deployed functions
supabase functions list

# Expected output:
# - verify-payment (deployed)
# - confirm-payment (deployed)
# - cleanup-old-proofs (deployed)
# - auto-cancel (deployed)

# Test function endpoints
curl https://your-project.supabase.co/functions/v1/verify-payment
# Expected: 405 Method Not Allowed (function exists)

curl https://your-project.supabase.co/functions/v1/confirm-payment
# Expected: 405 Method Not Allowed (function exists)
```

### Step 4: Configure Function Secrets

```bash
# Set storage bucket name (if needed)
supabase secrets set STORAGE_BUCKET=payment-proofs

# Verify secrets
supabase secrets list
```

---

## 4. Storage Bucket Setup

### Step 1: Create Storage Bucket

**Via Supabase Dashboard:**

1. Navigate to Storage → Buckets
2. Click "New Bucket"
3. Name: `payment-proofs`
4. Public: **No** (private bucket)
5. File size limit: 5 MB
6. Allowed MIME types: `image/jpeg, image/png, image/jpg`

**Via SQL:**

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false);
```

### Step 2: Configure RLS Policies

```sql
-- Allow authenticated users to upload their own payment proofs
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own payment proofs
CREATE POLICY "Users can view own payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all payment proofs
CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'admin'
  )
);

-- Allow system to delete old proofs (via service role)
CREATE POLICY "Service role can delete old proofs"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'payment-proofs');
```

### Step 3: Verify Storage Setup

```bash
# Test upload via curl
curl -X POST https://your-project.supabase.co/storage/v1/object/payment-proofs/test.jpg \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: image/jpeg" \
  --data-binary @test-image.jpg

# Expected: 200 OK with file path

# Test retrieval
curl https://your-project.supabase.co/storage/v1/object/payment-proofs/test.jpg \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Expected: 200 OK with image data

# Cleanup test file
curl -X DELETE https://your-project.supabase.co/storage/v1/object/payment-proofs/test.jpg \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

---

## 5. Environment Variables

### Frontend (.env)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Static QRIS Configuration
VITE_QRIS_ACCOUNT_NAME="Order Kopi"
VITE_QRIS_ACCOUNT_NUMBER="1234567890"
VITE_QRIS_BANK_NAME="Bank BCA"
VITE_QRIS_IMAGE_URL="/qris.jpg"
```

### Supabase Secrets

```bash
# Set via Supabase CLI
supabase secrets set STORAGE_BUCKET=payment-proofs
supabase secrets set ADMIN_NOTIFICATION_EMAIL=admin@orderkopi.com

# Verify
supabase secrets list
```

### Vercel/Netlify Environment Variables

**For Vercel:**

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_QRIS_ACCOUNT_NAME production
vercel env add VITE_QRIS_ACCOUNT_NUMBER production
vercel env add VITE_QRIS_BANK_NAME production
vercel env add VITE_QRIS_IMAGE_URL production
```

**For Netlify:**

1. Navigate to Site Settings → Environment Variables
2. Add each variable manually
3. Trigger redeploy

---

## 6. Testing Checklist

### 🧪 Unit Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- verify-payment
npm test -- confirm-payment
npm test -- unique-code-generation
```

### 🧪 Integration Tests

#### Test 1: Create Order with Unique Code

```bash
# Via frontend or API
curl -X POST https://your-app.vercel.app/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "customer_name": "Test User",
    "items": [{"product_id": 1, "quantity": 2}],
    "total_amount": 50000
  }'

# Expected response:
# {
#   "order_id": "...",
#   "unique_code": "1234",
#   "total_with_code": 51234,
#   "status": "pending_verification"
# }
```

#### Test 2: Upload Payment Proof

```bash
# Upload image
curl -X POST https://your-project.supabase.co/functions/v1/verify-payment \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "order_id=ORDER_ID" \
  -F "payment_proof=@payment-screenshot.jpg" \
  -F "amount_entered=51234"

# Expected: 200 OK with verification status
```

#### Test 3: Admin Confirmation

```bash
# Confirm payment
curl -X POST https://your-project.supabase.co/functions/v1/confirm-payment \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORDER_ID",
    "action": "approve"
  }'

# Expected: 200 OK, order status = "paid"
```

#### Test 4: Auto-Cancel Expired Orders

```bash
# Trigger auto-cancel function
curl -X POST https://your-project.supabase.co/functions/v1/auto-cancel \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"

# Expected: 200 OK with count of cancelled orders
```

#### Test 5: Cleanup Old Proofs

```bash
# Trigger cleanup function
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-old-proofs \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"

# Expected: 200 OK with count of deleted files
```

### 🧪 End-to-End Tests

```bash
# Run Playwright tests
npm run test:e2e

# Or specific scenarios
npx playwright test --grep "QRIS Static Payment Flow"
```

### ✅ Manual Testing Checklist

- [ ] Create order → unique code generated (4 digits, 1000-9999)
- [ ] Upload payment proof → file stored in bucket
- [ ] Admin dashboard → pending orders visible
- [ ] Admin confirm → order status updates to "paid"
- [ ] Admin reject → order status updates to "cancelled"
- [ ] Duplicate unique code same day → error handled
- [ ] Invalid image format → error message shown
- [ ] File size > 5MB → error message shown
- [ ] Expired order (>24h) → auto-cancelled
- [ ] Old payment proofs (>30 days) → auto-deleted

---

## 7. Rollback Plan

### 🚨 When to Rollback

- Critical bug affecting payment processing
- Data integrity issues
- Performance degradation >50%
- Security vulnerability discovered

### Step 1: Disable New Features

```bash
# Revert frontend to previous version
git revert HEAD
git push origin main

# Or rollback deployment
vercel rollback
# or
netlify rollback
```

### Step 2: Rollback Database Migration

```sql
-- Remove new columns (CAUTION: Data loss)
ALTER TABLE orders 
DROP COLUMN IF EXISTS unique_code,
DROP COLUMN IF EXISTS payment_proof_url,
DROP COLUMN IF EXISTS payment_amount_entered,
DROP COLUMN IF EXISTS verified_by,
DROP COLUMN IF EXISTS verified_at,
DROP COLUMN IF EXISTS auto_verified;

-- Drop indexes
DROP INDEX IF EXISTS idx_orders_unique_code_date;
DROP INDEX IF EXISTS idx_orders_pending_verification;
DROP INDEX IF EXISTS idx_orders_auto_verified;

-- Drop constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_unique_code_format;
```

### Step 3: Preserve Data Before Rollback

```sql
-- Backup QRIS Static data
CREATE TABLE orders_qris_static_backup AS
SELECT id, unique_code, payment_proof_url, payment_amount_entered, 
       verified_by, verified_at, auto_verified
FROM orders
WHERE unique_code IS NOT NULL;

-- Verify backup
SELECT COUNT(*) FROM orders_qris_static_backup;
```

### Step 4: Restore Previous State

```bash
# Restore database from backup
psql -h db.your-project.supabase.co -U postgres -d postgres < backup.sql

# Verify restoration
psql -h db.your-project.supabase.co -U postgres -d postgres -c "SELECT COUNT(*) FROM orders;"
```

### Step 5: Notify Stakeholders

- [ ] Send rollback notification email
- [ ] Update status page
- [ ] Post incident report
- [ ] Schedule post-mortem meeting

---

## 8. Monitoring & Alerts

### 📊 Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Order creation success rate | >99% | <95% |
| Payment proof upload success | >98% | <90% |
| Admin confirmation time | <5 min | >15 min |
| Unique code collision rate | 0% | >0% |
| Storage usage | <80% | >90% |
| Edge Function errors | <1% | >5% |

### 🔔 Supabase Dashboard Monitoring

**Database:**
- Navigate to Database → Logs
- Monitor query performance
- Check for constraint violations

**Storage:**
- Navigate to Storage → payment-proofs
- Monitor bucket size
- Check upload success rate

**Edge Functions:**
- Navigate to Edge Functions → Logs
- Monitor invocation count
- Check error rate

### 🔔 Custom Alerts (SQL)

```sql
-- Alert: High unique code collision rate
SELECT COUNT(*) as collision_attempts
FROM audit_logs
WHERE action = 'unique_code_collision'
AND created_at > NOW() - INTERVAL '1 hour';
-- Alert if > 10

-- Alert: Pending verifications > 1 hour
SELECT COUNT(*) as stale_orders
FROM orders
WHERE status = 'pending_verification'
AND created_at < NOW() - INTERVAL '1 hour';
-- Alert if > 50

-- Alert: Storage bucket > 90% full
SELECT pg_size_pretty(pg_database_size('postgres')) as db_size;
-- Alert if approaching limit
```

### 🔔 External Monitoring

**Uptime Monitoring:**
- Use UptimeRobot or Pingdom
- Monitor: https://your-app.vercel.app/health
- Alert on: >5 min downtime

**Error Tracking:**
- Sentry.io integration
- Track frontend errors
- Alert on: >10 errors/hour

**Performance Monitoring:**
- Vercel Analytics
- Monitor: Page load time, API response time
- Alert on: >3s average response time

---

## 9. Troubleshooting

### ❌ Issue: Unique Code Collision

**Symptoms:**
- Error: "duplicate key value violates unique constraint"
- Order creation fails

**Diagnosis:**
```sql
-- Check collision frequency
SELECT unique_code, COUNT(*) as count
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY unique_code
HAVING COUNT(*) > 1;
```

**Solution:**
```javascript
// Increase retry attempts in code generation
const MAX_RETRIES = 10;
for (let i = 0; i < MAX_RETRIES; i++) {
  const code = generateUniqueCode();
  try {
    await insertOrder({ ...orderData, unique_code: code });
    break;
  } catch (error) {
    if (i === MAX_RETRIES - 1) throw error;
  }
}
```

---

### ❌ Issue: Payment Proof Upload Fails

**Symptoms:**
- 413 Payload Too Large
- 415 Unsupported Media Type

**Diagnosis:**
```bash
# Check file size
ls -lh payment-proof.jpg

# Check MIME type
file --mime-type payment-proof.jpg
```

**Solution:**
```javascript
// Frontend validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large. Max 5MB.');
}
if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type. Use JPG or PNG.');
}
```

---

### ❌ Issue: Storage Bucket Full

**Symptoms:**
- Upload fails with 507 Insufficient Storage
- Slow upload performance

**Diagnosis:**
```sql
-- Check storage usage
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id = 'payment-proofs'
GROUP BY bucket_id;
```

**Solution:**
```bash
# Trigger cleanup function
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-old-proofs \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"

# Or manual cleanup
```

```sql
-- Delete proofs older than 30 days for paid orders
DELETE FROM storage.objects
WHERE bucket_id = 'payment-proofs'
AND created_at < NOW() - INTERVAL '30 days'
AND name IN (
  SELECT payment_proof_url FROM orders WHERE status = 'paid'
);
```

---

### ❌ Issue: Edge Function Timeout

**Symptoms:**
- 504 Gateway Timeout
- Function execution > 10 seconds

**Diagnosis:**
```bash
# Check function logs
supabase functions logs verify-payment --tail

# Look for slow queries or external API calls
```

**Solution:**
```typescript
// Add timeout to external calls
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, { signal: controller.signal });
  // ...
} finally {
  clearTimeout(timeout);
}
```

---

### ❌ Issue: RLS Policy Blocking Access

**Symptoms:**
- 403 Forbidden
- "new row violates row-level security policy"

**Diagnosis:**
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'orders';

-- Test policy as user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM orders WHERE id = 'order-id';
RESET ROLE;
```

**Solution:**
```sql
-- Update RLS policy to allow payment proof upload
CREATE POLICY "Users can update own orders with payment proof"
ON orders FOR UPDATE
TO authenticated
USING (session_token = current_setting('request.jwt.claim.session_token', true))
WITH CHECK (
  session_token = current_setting('request.jwt.claim.session_token', true) AND
  status = 'pending_verification'
);
```

---

### ❌ Issue: Auto-Cancel Not Running

**Symptoms:**
- Expired orders not cancelled
- Cron job not triggering

**Diagnosis:**
```bash
# Check cron job configuration
supabase functions list

# Check last execution
supabase functions logs auto-cancel --tail
```

**Solution:**
```bash
# Manually trigger function
curl -X POST https://your-project.supabase.co/functions/v1/auto-cancel \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"

# Or set up pg_cron
```

```sql
-- Schedule auto-cancel every hour
SELECT cron.schedule(
  'auto-cancel-expired-orders',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/auto-cancel',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

---

## 📞 Support Contacts

**Internal Team:**
- Developer: [Your Name]
- DevOps: [DevOps Contact]
- Product: [Product Manager]

**External Support:**
- Supabase Support: https://supabase.com/support
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/andsfx/order-kopi/issues

---

## ✅ Post-Deployment Checklist

### First Hour
- [ ] Monitor Edge Function logs
- [ ] Check for database errors
- [ ] Verify first 10 orders created successfully
- [ ] Test payment proof upload
- [ ] Confirm admin dashboard accessible

### First Day
- [ ] Review 100+ transactions
- [ ] Check unique code collision rate (should be 0%)
- [ ] Monitor storage bucket usage
- [ ] Verify auto-cancel function ran
- [ ] Gather user feedback

### First Week
- [ ] Analyze payment success rate (target: >95%)
- [ ] Review admin confirmation times
- [ ] Check storage cleanup effectiveness
- [ ] Performance optimization if needed
- [ ] Update documentation based on issues

---

## 🎉 Deployment Complete

**Status:** READY FOR PRODUCTION ✅

**Next Steps:**
1. Execute deployment during low-traffic window
2. Monitor metrics for first 24 hours
3. Gather feedback from users and admins
4. Schedule post-deployment review meeting
5. Document lessons learned

---

**Last Updated:** 2026-05-06  
**Prepared By:** Kiro AI  
**Version:** 1.0.0
