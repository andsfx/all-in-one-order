-- Migration 016: Change order customization options
-- Size: Small/Regular/Large → Regular Ice / Large Ice
-- Temp (Hot/Iced) → Sweetness (Normal Sweet / Less Sweet)
-- Sugar (Less/Normal/Extra) → Ice Cube (Normal Ice / Less Ice / More Ice)

-- Step 1: Drop old check constraints
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_size_check;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_temp_check;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_sugar_check;

-- Step 2: Rename columns: temp → sweetness, sugar → ice_cube
ALTER TABLE public.order_items RENAME COLUMN temp TO sweetness;
ALTER TABLE public.order_items RENAME COLUMN sugar TO ice_cube;

-- Step 3: Update existing data to new values
-- Size: Small → Regular Ice, Regular → Regular Ice, Large → Large Ice
UPDATE public.order_items SET size = 'Regular Ice' WHERE size IN ('Small', 'Regular');
UPDATE public.order_items SET size = 'Large Ice' WHERE size = 'Large';

-- Sweetness: Hot → Normal Sweet, Iced → Normal Sweet (default)
UPDATE public.order_items SET sweetness = 'Normal Sweet' WHERE sweetness IN ('Hot', 'Iced', 'Normal');
UPDATE public.order_items SET sweetness = 'Less Sweet' WHERE sweetness = 'Less';

-- Ice Cube: Less → Less Ice, Normal → Normal Ice, Extra → More Ice
UPDATE public.order_items SET ice_cube = 'Normal Ice' WHERE ice_cube = 'Normal';
UPDATE public.order_items SET ice_cube = 'Less Ice' WHERE ice_cube = 'Less';
UPDATE public.order_items SET ice_cube = 'More Ice' WHERE ice_cube = 'Extra';

-- Step 4: Add new check constraints
ALTER TABLE public.order_items ADD CONSTRAINT order_items_size_check
  CHECK (size = ANY (ARRAY['Regular Ice'::text, 'Large Ice'::text]));

ALTER TABLE public.order_items ADD CONSTRAINT order_items_sweetness_check
  CHECK (sweetness = ANY (ARRAY['Normal Sweet'::text, 'Less Sweet'::text]));

ALTER TABLE public.order_items ADD CONSTRAINT order_items_ice_cube_check
  CHECK (ice_cube = ANY (ARRAY['Normal Ice'::text, 'Less Ice'::text, 'More Ice'::text]));

-- Step 5: Update comments
COMMENT ON COLUMN public.order_items.size IS 'Cup size: Regular Ice or Large Ice';
COMMENT ON COLUMN public.order_items.sweetness IS 'Sweetness level: Normal Sweet or Less Sweet';
COMMENT ON COLUMN public.order_items.ice_cube IS 'Ice level: Normal Ice, Less Ice, or More Ice';

-- Step 6: Update create_order_atomic RPC to use new column names
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
  p_discount_amount INT DEFAULT 0
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

  -- 2. Insert order
  INSERT INTO orders (
    id, customer_name, note, total, unique_code, amount_to_pay,
    status, payment_method, branch_id, session_token,
    voucher_id, discount_amount
  ) VALUES (
    v_order_id, p_customer_name, p_note, p_total, p_unique_code, p_amount_to_pay,
    'pending_payment', p_payment_method, p_branch_id, p_session_token,
    p_voucher_id, p_discount_amount
  );

  -- 3. Insert order items (using new column names: sweetness, ice_cube)
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

-- Re-grant execute permissions
GRANT EXECUTE ON FUNCTION create_order_atomic(
  TEXT, INT, TEXT, INT, TEXT, JSONB, TEXT, TEXT, BIGINT, BIGINT, INT
) TO anon;
GRANT EXECUTE ON FUNCTION create_order_atomic(
  TEXT, INT, TEXT, INT, TEXT, JSONB, TEXT, TEXT, BIGINT, BIGINT, INT
) TO authenticated;
