# 🧪 Testing Checklist - Order Kopi Security Features

**Last Updated:** 3 Mei 2026  
**Features:** Session Token, Rate Limiting, Token Refresh, Audit Logging

---

## ✅ Pre-Testing Setup

### 1. Database Migration
- [ ] Run `supabase/migrations/001_add_session_token.sql`
- [ ] Run `supabase/migrations/002_add_audit_logging.sql`
- [ ] Verify tables exist:
```sql
select table_name from information_schema.tables 
where table_schema = 'public' 
and table_name in ('orders', 'audit_logs');
```

### 2. Verify RLS Policies
```sql
-- Check orders policies
select policyname, cmd from pg_policies 
where tablename = 'orders';

-- Expected policies:
-- "Customers can view their own orders" (SELECT)
-- "Customers can update their own orders" (UPDATE)
-- "Anyone can create orders" (INSERT)
-- "Authenticated users can delete orders" (DELETE)

-- Check audit_logs policies
select policyname from pg_policies 
where tablename = 'audit_logs';

-- Expected: "Only authenticated users can view audit logs"
```

### 3. Deploy Frontend
```bash
npm run build
# Or push to GitHub for Netlify auto-deploy
```

---

## 🔐 Test 1: Session Token Generation

### Test 1.1: Token Created on First Visit
**Steps:**
1. Open browser in incognito mode
2. Navigate to `http://localhost:5173`
3. Open DevTools Console
4. Run:
```javascript
localStorage.getItem('order_session_token')
```

**Expected Result:**
- ✅ Returns UUID string (e.g., `"abc-123-def-456"`)
- ✅ Token is 36 characters long

**Actual Result:** ___________

---

### Test 1.2: Token Persists Across Page Reloads
**Steps:**
1. Note the token from Test 1.1
2. Refresh the page (F5)
3. Check token again:
```javascript
localStorage.getItem('order_session_token')
```

**Expected Result:**
- ✅ Same token as before (not regenerated)

**Actual Result:** ___________

---

### Test 1.3: Token Expiry Timestamp Set
**Steps:**
```javascript
const expiry = localStorage.getItem('order_session_expiry');
const expiryDate = new Date(parseInt(expiry));
const now = new Date();
const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60);

console.log('Token expires in:', hoursUntilExpiry.toFixed(2), 'hours');
console.log('Expiry date:', expiryDate.toLocaleString());
```

**Expected Result:**
- ✅ Expiry is ~24 hours from now
- ✅ Expiry timestamp is valid

**Actual Result:** ___________

---

## 🛡️ Test 2: Order Isolation

### Test 2.1: Customer Can View Own Order
**Steps:**
1. Place an order (note the Order ID, e.g., `ORD-0001`)
2. Navigate to `/order/ORD-0001`
3. Verify order details are visible

**Expected Result:**
- ✅ Order details displayed correctly
- ✅ Customer name, items, total visible

**Actual Result:** ___________

---

### Test 2.2: Customer Cannot View Other's Order
**Steps:**
1. Note your current token:
```javascript
const myToken = localStorage.getItem('order_session_token');
console.log('My token:', myToken);
```

2. Change token to fake value:
```javascript
localStorage.setItem('order_session_token', 'fake-token-12345');
```

3. Try to access the same order: `/order/ORD-0001`

**Expected Result:**
- ✅ Order not found / "Pesanan Tidak Ditemukan"
- ✅ Cannot see order details

**Actual Result:** ___________

4. Restore original token:
```javascript
localStorage.setItem('order_session_token', myToken);
```

---

### Test 2.3: Customer Cannot Update Other's Order
**Steps:**
1. Get another order ID (from admin dashboard or database)
2. Try to update it via console:
```javascript
const { data, error } = await supabase
  .from('orders')
  .update({ status: 'cancelled' })
  .eq('id', 'ORD-0002'); // Different order

console.log('Error:', error);
```

**Expected Result:**
- ✅ Error: "new row violates row-level security policy"
- ✅ Update fails

**Actual Result:** ___________

---

## 🚫 Test 3: Rate Limiting

### Test 3.1: First 5 Orders Succeed
**Steps:**
1. Clear rate limit:
```javascript
localStorage.removeItem('order_rate_limit');
```

2. Place 5 orders in quick succession
3. Note which orders succeed

**Expected Result:**
- ✅ All 5 orders succeed
- ✅ No rate limit error

**Actual Result:** ___________

---

### Test 3.2: 6th Order Blocked
**Steps:**
1. Immediately try to place 6th order
2. Check for error message

**Expected Result:**
- ✅ Error: "Terlalu banyak pesanan. Silakan coba lagi dalam..."
- ✅ Shows time remaining (e.g., "59 menit")
- ✅ Order not created

**Actual Result:** ___________

---

### Test 3.3: Rate Limit Resets After 1 Hour
**Steps:**
1. Fast-forward time (for testing):
```javascript
const rateLimit = JSON.parse(localStorage.getItem('order_rate_limit'));
rateLimit.resetAt = Date.now() - 1000; // Set to past
localStorage.setItem('order_rate_limit', JSON.stringify(rateLimit));
```

2. Try to place order again

**Expected Result:**
- ✅ Order succeeds
- ✅ Rate limit counter reset to 1

**Actual Result:** ___________

---

## 🔄 Test 4: Token Refresh

### Test 4.1: Token Status Check
**Steps:**
```javascript
import { getTokenStatus } from './src/lib/sessionToken.js';
const status = getTokenStatus();
console.log(status);
```

**Expected Result:**
```javascript
{
  hasToken: true,
  isValid: true,
  expiresAt: [timestamp],
  timeRemaining: [milliseconds],
  lastActivity: [timestamp],
  timeSinceActivity: [milliseconds],
  willAutoRefresh: true/false
}
```

**Actual Result:** ___________

---

### Test 4.2: Activity Tracking
**Steps:**
1. Open DevTools Console
2. Monitor activity recording:
```javascript
// Add event listener to see activity tracking
window.addEventListener('mousedown', () => {
  console.log('Activity recorded at:', new Date().toLocaleTimeString());
});
```

3. Click around the page
4. Check last activity:
```javascript
const lastActivity = localStorage.getItem('order_last_activity');
console.log('Last activity:', new Date(parseInt(lastActivity)).toLocaleTimeString());
```

**Expected Result:**
- ✅ Activity timestamp updates on interaction
- ✅ Throttled to max 1 update per minute

**Actual Result:** ___________

---

### Test 4.3: Auto-Refresh Triggers
**Steps:**
1. Simulate token near expiry:
```javascript
const expiry = Date.now() + (1.5 * 60 * 60 * 1000); // 1.5 hours from now
localStorage.setItem('order_session_expiry', expiry.toString());
```

2. Record activity:
```javascript
localStorage.setItem('order_last_activity', Date.now().toString());
```

3. Trigger token check:
```javascript
import { getSessionToken } from './src/lib/sessionToken.js';
const token = getSessionToken();
```

4. Check if expiry extended:
```javascript
const newExpiry = localStorage.getItem('order_session_expiry');
const newExpiryDate = new Date(parseInt(newExpiry));
console.log('New expiry:', newExpiryDate.toLocaleString());
```

**Expected Result:**
- ✅ Token expiry extended to ~24 hours from now
- ✅ Console log: "Token auto-refreshed"

**Actual Result:** ___________

---

## 📝 Test 5: Audit Logging

### Test 5.1: Order Creation Logged
**Steps:**
1. Place a new order (note Order ID)
2. Login as admin
3. Navigate to `/admin/audit`
4. Search for the Order ID

**Expected Result:**
- ✅ Log entry with action "INSERT"
- ✅ Shows customer session token
- ✅ Metadata includes customer_name, total, payment_method
- ✅ Timestamp is correct

**Actual Result:** ___________

---

### Test 5.2: Status Change Logged (Admin)
**Steps:**
1. As admin, change order status from "pending_payment" to "paid"
2. Check audit log for that order

**Expected Result:**
- ✅ Log entry with action "STATUS_CHANGE"
- ✅ field_name: "status"
- ✅ old_value: "pending_payment"
- ✅ new_value: "paid"
- ✅ user_type: "admin"
- ✅ user_email: [admin email]

**Actual Result:** ___________

---

### Test 5.3: Customer Cancellation Logged
**Steps:**
1. As customer, cancel an order (pending_payment only)
2. Check audit log

**Expected Result:**
- ✅ Log entry with action "STATUS_CHANGE"
- ✅ old_value: "pending_payment"
- ✅ new_value: "cancelled"
- ✅ user_type: "customer"
- ✅ session_token: [customer token]
- ✅ metadata includes reason

**Actual Result:** ___________

---

### Test 5.4: Audit Log Immutable
**Steps:**
1. Try to update an audit log entry:
```javascript
const { error } = await supabase
  .from('audit_logs')
  .update({ action: 'MODIFIED' })
  .eq('id', 1);

console.log('Error:', error);
```

**Expected Result:**
- ✅ Error: "permission denied" or policy violation
- ✅ Cannot update audit logs

**Actual Result:** ___________

---

### Test 5.5: Only Admin Can View Logs
**Steps:**
1. Logout from admin
2. Try to access `/admin/audit` directly

**Expected Result:**
- ✅ Redirected to `/login`
- ✅ Cannot view audit logs

**Actual Result:** ___________

---

## 🎨 Test 6: Admin Audit Log UI

### Test 6.1: Audit Log Page Loads
**Steps:**
1. Login as admin
2. Navigate to `/admin/audit`

**Expected Result:**
- ✅ Page loads without errors
- ✅ Shows audit log table
- ✅ Filters visible (date range, user type, action)

**Actual Result:** ___________

---

### Test 6.2: Filter by Date Range
**Steps:**
1. Select date range (e.g., today only)
2. Click "Terapkan Filter"

**Expected Result:**
- ✅ Only logs from selected date range shown
- ✅ Count updates correctly

**Actual Result:** ___________

---

### Test 6.3: Filter by User Type
**Steps:**
1. Select "Admin" from user type filter
2. Apply filter

**Expected Result:**
- ✅ Only admin actions shown
- ✅ Customer actions hidden

**Actual Result:** ___________

---

### Test 6.4: Search by Order ID
**Steps:**
1. Enter order ID in search box (e.g., "ORD-0001")
2. Press Enter

**Expected Result:**
- ✅ Only logs for that order shown
- ✅ All actions for that order visible

**Actual Result:** ___________

---

### Test 6.5: Export to CSV
**Steps:**
1. Click "Export CSV" button
2. Check downloaded file

**Expected Result:**
- ✅ CSV file downloads
- ✅ Contains all visible log entries
- ✅ Columns: Timestamp, Order ID, Action, User, Details

**Actual Result:** ___________

---

### Test 6.6: Pagination Works
**Steps:**
1. If more than 50 logs exist, check pagination
2. Click "Next" button

**Expected Result:**
- ✅ Shows next 50 logs
- ✅ Page number updates
- ✅ "Previous" button enabled

**Actual Result:** ___________

---

## 🔒 Test 7: RLS Policy Verification

### Test 7.1: Anonymous Cannot Update Orders
**Steps:**
1. Logout from admin
2. Open DevTools Console
3. Try to update any order:
```javascript
const { error } = await supabase
  .from('orders')
  .update({ total: 0 })
  .eq('id', 'ORD-0001');

console.log('Error:', error);
```

**Expected Result:**
- ✅ Error: "new row violates row-level security policy"
- ✅ Update fails

**Actual Result:** ___________

---

### Test 7.2: Admin Can Update Any Order
**Steps:**
1. Login as admin
2. Try to update any order:
```javascript
const { error } = await supabase
  .from('orders')
  .update({ status: 'preparing' })
  .eq('id', 'ORD-0001');

console.log('Success:', !error);
```

**Expected Result:**
- ✅ Update succeeds
- ✅ No error

**Actual Result:** ___________

---

### Test 7.3: Customer Can Only Cancel Own Order
**Steps:**
1. As customer, try to cancel order with wrong token:
```javascript
const { error } = await supabase
  .from('orders')
  .update({ status: 'cancelled' })
  .eq('id', 'ORD-0001')
  .eq('session_token', 'wrong-token');

console.log('Error:', error);
```

**Expected Result:**
- ✅ Update fails (no rows matched)
- ✅ Order not cancelled

**Actual Result:** ___________

---

## 🐛 Test 8: Edge Cases

### Test 8.1: Token Expired
**Steps:**
1. Set token expiry to past:
```javascript
localStorage.setItem('order_session_expiry', '0');
```

2. Try to access order

**Expected Result:**
- ✅ New token generated automatically
- ✅ Old orders not accessible (different token)

**Actual Result:** ___________

---

### Test 8.2: Corrupted Token
**Steps:**
1. Set invalid token:
```javascript
localStorage.setItem('order_session_token', 'invalid-token-format');
```

2. Try to place order

**Expected Result:**
- ✅ New valid token generated
- ✅ Order creation succeeds

**Actual Result:** ___________

---

### Test 8.3: Multiple Browser Tabs
**Steps:**
1. Open order-kopi in 2 tabs
2. Place order in Tab 1
3. Try to view order in Tab 2

**Expected Result:**
- ✅ Same token in both tabs (shared localStorage)
- ✅ Order visible in both tabs

**Actual Result:** ___________

---

### Test 8.4: Cross-Browser Isolation
**Steps:**
1. Place order in Chrome (note Order ID)
2. Open Firefox
3. Try to access same order

**Expected Result:**
- ✅ Different token in Firefox
- ✅ Order not accessible (different session)

**Actual Result:** ___________

---

## 📊 Test 9: Performance

### Test 9.1: Token Check Performance
**Steps:**
```javascript
console.time('tokenCheck');
for (let i = 0; i < 1000; i++) {
  getSessionToken();
}
console.timeEnd('tokenCheck');
```

**Expected Result:**
- ✅ Completes in < 100ms
- ✅ No performance degradation

**Actual Result:** ___________

---

### Test 9.2: Activity Tracking Throttling
**Steps:**
1. Rapidly click 100 times
2. Check activity update count:
```javascript
// Should only update once per minute max
```

**Expected Result:**
- ✅ Activity recorded max 1-2 times (throttled)
- ✅ No performance impact

**Actual Result:** ___________

---

### Test 9.3: Audit Log Query Performance
**Steps:**
1. Create 100+ audit log entries
2. Query with filters:
```javascript
console.time('auditQuery');
const { data } = await getAuditLogs(0, 50, {
  dateFrom: '2026-05-01',
  dateTo: '2026-05-31'
});
console.timeEnd('auditQuery');
```

**Expected Result:**
- ✅ Query completes in < 500ms
- ✅ Pagination works smoothly

**Actual Result:** ___________

---

## ✅ Test Summary

**Total Tests:** 35  
**Passed:** ___  
**Failed:** ___  
**Skipped:** ___  

**Critical Issues Found:** ___________

**Recommendations:** ___________

---

## 🚀 Production Readiness Checklist

- [ ] All security tests passed
- [ ] All functional tests passed
- [ ] Performance tests acceptable
- [ ] Edge cases handled
- [ ] RLS policies verified
- [ ] Audit logging working
- [ ] Token refresh working
- [ ] Rate limiting working
- [ ] Admin UI functional
- [ ] Documentation complete

**Ready for Production:** ☐ YES  ☐ NO

**Sign-off:** ___________  
**Date:** ___________
