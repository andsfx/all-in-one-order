-- Migration 018: Update create_order_atomic RPC to support fulfillment fields
-- Adds fulfillment_type, delivery_address, delivery_phone, delivery_email, table_number

-- Step 1: Add table_number column to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS table_number text;

-- Step 2: Drop old function
DROP FUNCTION IF EXISTS create_order_atomic(TEXT, INT, TEXT, INT, TEXT, JSONB, TEXT, TEXT, BIGINT, BIGINT, INT);

-- Recreate with fulfillment fields
CREATE OR REPLACE FUNCTION create_order_atomic(
  p_customer_name TEXT,
  p_total INT,
  p_unique_code TEXT,
  p_amount_to_pay INT,
  p_session_token TEXT,
  p_items JSONB,
  p_note TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'qris',
  p_branch_id BIGINT DEFAULT NULL,
  p_voucher_id BIGINT DEFAULT NULL,
  p_discount_amount INT DEFAULT 0,
  p_fulfillment_type fulfillment_type DEFAULT 'dine_in',
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_phone TEXT DEFAULT NULL,
  p_delivery_email TEXT DEFAULT NULL,
  p_table_number TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order_id TEXT;
  v_item JSONB;
BEGIN
  -- 1. Generate order ID atomically
  UPDATE order_counter
  SET last_number = last_number + 1
  WHERE id = 1
  RETURNING 'ORD-' || lpad(last_number::text, 4, '0') INTO v_order_id;

  -- 2. Insert order with fulfillment fields
  INSERT INTO orders (
    id, customer_name, note, total, unique_code, amount_to_pay,
    status, payment_method, branch_id, session_token,
    voucher_id, discount_amount,
    fulfillment_type, delivery_address, delivery_phone, delivery_email, table_number
  ) VALUES (
    v_order_id, p_customer_name, p_note, p_total, p_unique_code, p_amount_to_pay,
    'pending_payment', p_payment_method, p_branch_id, p_session_token,
    p_voucher_id, p_discount_amount,
    p_fulfillment_type, p_delivery_address, p_delivery_phone, p_delivery_email, p_table_number
  );

  -- 3. Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id, product_id, product_name, qty, size, sweetness, ice_cube, price_at_order
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::bigint,
      v_item->>'product_name',
      (v_item->>'qty')::int,
      v_item->>'size',
      v_item->>'sweetness',
      v_item->>'ice_cube',
      (v_item->>'price_at_order')::int
    );
  END LOOP;

  -- 4. Return order data
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'status', 'pending_payment',
    'total', p_total,
    'amount_to_pay', p_amount_to_pay,
    'unique_code', p_unique_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_order_atomic(
  TEXT, INT, TEXT, INT, TEXT, JSONB, TEXT, TEXT, BIGINT, BIGINT, INT, fulfillment_type, TEXT, TEXT, TEXT, TEXT
) TO anon;
GRANT EXECUTE ON FUNCTION create_order_atomic(
  TEXT, INT, TEXT, INT, TEXT, JSONB, TEXT, TEXT, BIGINT, BIGINT, INT, fulfillment_type, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
