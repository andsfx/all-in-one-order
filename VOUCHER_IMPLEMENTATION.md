# Voucher System Implementation Plan

## Status: Database ✅ | Frontend ⏳ | Integration ⏳

### Completed
- ✅ Database schema (vouchers table + orders.voucher_id/discount_amount)
- ✅ Migration 005_add_vouchers.sql created
- ✅ setup.sql already includes vouchers table with sample data

### Remaining Tasks

#### 1. AdminVoucher Page (src/pages/AdminVoucher.jsx)
**Pattern:** Copy AdminMenu.jsx structure
- List vouchers with: code, type, discount, usage (count/limit), validity, status
- Form fields:
  - Code (text, uppercase, required)
  - Type (select: BOGO / Fixed Rp / Percentage %)
  - Discount Value (number, required if not BOGO)
  - Min Purchase (number, Rp)
  - Usage Limit (number, times)
  - Valid From/To (datetime-local)
  - Is Active (checkbox)
- CRUD operations: Create, Edit, Delete (with confirmation)
- Show usage stats: "Used 15/100 times"

#### 2. Voucher Validation Hook (src/lib/useVoucher.js)
```javascript
export function useVoucher() {
  async function validateVoucher(code, cartTotal) {
    // 1. Fetch voucher by code (case-insensitive)
    // 2. Check is_active = true
    // 3. Check now() between valid_from and valid_to
    // 4. Check usage_count < usage_limit
    // 5. Check cartTotal >= min_purchase
    // Return: { valid: boolean, voucher: object, error: string }
  }
  
  function calculateDiscount(voucher, cartItems, cartTotal) {
    if (voucher.type === 'bogo') {
      // Find 2 cheapest items, return cheaper item's price as discount
      // If 4 items, apply to 2 pairs (return 2x cheaper prices)
    } else if (voucher.type === 'fixed') {
      return Math.min(voucher.discount_value, cartTotal);
    } else if (voucher.type === 'percentage') {
      return Math.round(cartTotal * voucher.discount_value / 100);
    }
  }
  
  return { validateVoucher, calculateDiscount };
}
```

#### 3. Update CartContext (src/lib/CartContext.jsx)
Add state:
```javascript
const [appliedVoucher, setAppliedVoucher] = useState(null);
const [voucherDiscount, setVoucherDiscount] = useState(0);
```

Add functions:
```javascript
function applyVoucher(voucher, discount) {
  setAppliedVoucher(voucher);
  setVoucherDiscount(discount);
}

function removeVoucher() {
  setAppliedVoucher(null);
  setVoucherDiscount(0);
}
```

Update totalPrice:
```javascript
const totalPrice = useMemo(() => {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  return Math.max(0, subtotal - voucherDiscount);
}, [items, voucherDiscount]);
```

Add to context value:
```javascript
{ items, addItem, ..., appliedVoucher, voucherDiscount, applyVoucher, removeVoucher, totalPrice }
```

#### 4. Update Checkout Page (src/pages/Checkout.jsx)
Add voucher UI after cart summary:
```jsx
<div className="voucher-section">
  <input 
    type="text" 
    placeholder="Kode Voucher" 
    value={voucherCode}
    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
  />
  <button onClick={handleApplyVoucher}>Gunakan</button>
  
  {appliedVoucher && (
    <div className="applied-voucher">
      <span>{appliedVoucher.code} - Diskon Rp {voucherDiscount.toLocaleString()}</span>
      <button onClick={removeVoucher}>Hapus</button>
    </div>
  )}
  
  <div className="price-breakdown">
    <div>Subtotal: Rp {subtotal.toLocaleString()}</div>
    {voucherDiscount > 0 && (
      <div className="discount">Diskon: -Rp {voucherDiscount.toLocaleString()}</div>
    )}
    <div className="total">Total: Rp {totalPrice.toLocaleString()}</div>
  </div>
</div>
```

Add validation logic:
```javascript
async function handleApplyVoucher() {
  const { valid, voucher, error } = await validateVoucher(voucherCode, subtotal);
  if (!valid) {
    addToast(error, 'error');
    return;
  }
  const discount = calculateDiscount(voucher, items, subtotal);
  applyVoucher(voucher, discount);
  addToast(`Voucher ${voucher.code} berhasil digunakan!`);
}
```

#### 5. Update OrderContext (src/lib/OrderContext.jsx)
Modify placeOrder to accept voucher:
```javascript
async function placeOrder(cartItems, customerInfo, voucher = null, discount = 0) {
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const total = Math.max(0, subtotal - discount);
  
  // Insert order with voucher_id and discount_amount
  await supabase.from('orders').insert({
    ...existing fields,
    voucher_id: voucher?.id || null,
    discount_amount: discount || 0,
    total,
  });
  
  // Increment voucher usage_count
  if (voucher) {
    await supabase.from('vouchers')
      .update({ usage_count: voucher.usage_count + 1 })
      .eq('id', voucher.id);
  }
}
```

#### 6. Add Route (src/App.jsx)
```jsx
<Route path="/admin/voucher" element={<ProtectedRoute><AdminVoucher /></ProtectedRoute>} />
```

Add navigation link in Admin layout.

#### 7. Apply Migration
```bash
supabase db push
```

### Testing Checklist
- [ ] Admin can create BOGO voucher
- [ ] Admin can create Fixed Rp voucher
- [ ] Admin can create Percentage voucher
- [ ] Customer can apply valid voucher at checkout
- [ ] Voucher validation rejects expired voucher
- [ ] Voucher validation rejects over-limit voucher
- [ ] Voucher validation rejects below min purchase
- [ ] BOGO correctly makes cheapest item free
- [ ] Fixed discount correctly subtracts amount
- [ ] Percentage discount correctly calculates %
- [ ] Order saves voucher_id and discount_amount
- [ ] Voucher usage_count increments after order
- [ ] Customer can remove applied voucher
- [ ] Order total reflects voucher discount

### Files to Create/Modify
**Create:**
- supabase/migrations/005_add_vouchers.sql ✅
- src/pages/AdminVoucher.jsx
- src/lib/useVoucher.js

**Modify:**
- src/lib/CartContext.jsx
- src/pages/Checkout.jsx
- src/lib/OrderContext.jsx
- src/App.jsx

**Already Done:**
- supabase/setup.sql (vouchers table exists)
