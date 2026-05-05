# Manual RLS Isolation Test for order_items

## Test Setup

This test verifies that the order_items RLS policy prevents cross-session data leakage.

## Prerequisites

1. Two test orders with different session tokens
2. Order items added to one of the orders
3. Supabase REST API access

## Test Steps

### Step 1: Create Order A with Session Token A

```bash
curl -X POST "https://kmmxfqqpoipeqdcvtljv.supabase.co/rest/v1/orders" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "id": "ORD-TEST-RLS-A",
    "customer_name": "Test User A",
    "table_number": 1,
    "total": 25000,
    "session_token": "session-token-aaa",
    "status": "pending_payment",
    "payment_method": "qris"
  }'
```

### Step 2: Create Order B with Session Token B

```bash
curl -X POST "https://kmmxfqqpoipeqdcvtljv.supabase.co/rest/v1/orders" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "id": "ORD-TEST-RLS-B",
    "customer_name": "Test User B",
    "table_number": 2,
    "total": 30000,
    "session_token": "session-token-bbb",
    "status": "pending_payment",
    "payment_method": "qris"
  }'
```

### Step 3: Add Order Items to Order B

```bash
curl -X POST "https://kmmxfqqpoipeqdcvtljv.supabase.co/rest/v1/order_items" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "order_id": "ORD-TEST-RLS-B",
    "product_id": 1,
    "product_name": "Espresso",
    "qty": 2,
    "size": "Regular",
    "temp": "Hot",
    "sugar": "Normal",
    "price_at_order": 15000
  }'
```

### Step 4: Try to Access Order B Items with Session Token A (Should Fail)

```bash
curl -X GET "https://kmmxfqqpoipeqdcvtljv.supabase.co/rest/v1/order_items?order_id=eq.ORD-TEST-RLS-B" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "x-session-token: session-token-aaa"
```

**Expected Result:** Empty array `[]`

### Step 5: Verify Session Token B Can Access Its Own Items

```bash
curl -X GET "https://kmmxfqqpoipeqdcvtljv.supabase.co/rest/v1/order_items?order_id=eq.ORD-TEST-RLS-B" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "x-session-token: session-token-bbb"
```

**Expected Result:** Array with order items

## Cleanup

```bash
# Delete test orders (will cascade delete order_items)
curl -X DELETE "https://kmmxfqqpoipeqdcvtljv.supabase.co/rest/v1/orders?id=eq.ORD-TEST-RLS-A" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4"

curl -X DELETE "https://kmmxfqqpoipeqdcvtljv.supabase.co/rest/v1/orders?id=eq.ORD-TEST-RLS-B" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttbXhmcXFwb2lwZXFkY3Z0bGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTYzNTMsImV4cCI6MjA5MzI5MjM1M30.IRjJkMSiGPkW7BPDUZqx4L_Fn6tWZpOnTJoj5ijWwx4"
```

## Test Results

### Policy Implementation

The RLS policy for `order_items` has been updated from:

```sql
create policy "Anyone can view order items"
  on order_items for select using (true);
```

To:

```sql
create policy "Customers can view their own order items"
  on order_items for select
  using (
    exists (
      select 1 from orders
      where orders.id = order_items.order_id
      and orders.session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    or auth.role() = 'authenticated'
  );
```

### Security Improvement

- **Before:** Any user could view all order items (cross-session data leakage)
- **After:** Users can only view order items for orders they own (via session token) or if they are authenticated admins

### Verification Status

✅ Policy updated in `supabase/setup.sql`
✅ Policy logic matches secure pattern from migration file
✅ Admin access preserved via `auth.role() = 'authenticated'`
⚠️  Manual testing required (automated test blocked by RLS on orders table)

### Manual Test Instructions

Run the curl commands above to verify:
1. Cross-session isolation works (Step 4 returns empty array)
2. Own-session access works (Step 5 returns order items)
