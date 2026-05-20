-- ============================================
-- MIGRATION: Harden RLS Policies (Security Audit Remediation)
-- ============================================
-- Addresses findings from Task 2 security audit:
-- 1. Replace permissive `auth.role() = 'authenticated'` with admin role check
-- 2. Add WITH CHECK clause to orders UPDATE policy
-- 3. Add ownership check to order_items INSERT policy
-- 4. Upgrade session_token policies to use session_token_hash
--
-- Date: 2026-05-20
-- ============================================

-- ============================================
-- 1. Create is_admin() helper function
-- ============================================
-- Checks JWT claims for admin role in app_metadata or user_metadata
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  ) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_admin() IS 'Returns true if current user has admin role in JWT claims';

-- ============================================
-- 2. Harden management policies (categories, products, vouchers, branches, promos, store_settings)
-- ============================================

-- Categories
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON categories;
CREATE POLICY "Admin users can manage categories"
  ON categories FOR ALL
  USING (is_admin());

-- Products
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
CREATE POLICY "Admin users can manage products"
  ON products FOR ALL
  USING (is_admin());

-- Vouchers
DROP POLICY IF EXISTS "Authenticated users can manage vouchers" ON vouchers;
CREATE POLICY "Admin users can manage vouchers"
  ON vouchers FOR ALL
  USING (is_admin());

-- Branches
DROP POLICY IF EXISTS "Authenticated users can manage branches" ON branches;
CREATE POLICY "Admin users can manage branches"
  ON branches FOR ALL
  USING (is_admin());

-- Promos
DROP POLICY IF EXISTS "Authenticated users can manage promos" ON promos;
CREATE POLICY "Admin users can manage promos"
  ON promos FOR ALL
  USING (is_admin());

-- Store Settings
DROP POLICY IF EXISTS "Authenticated users can manage store settings" ON store_settings;
CREATE POLICY "Admin users can manage store settings"
  ON store_settings FOR ALL
  USING (is_admin());

-- Option Templates (migration 017)
DROP POLICY IF EXISTS "Authenticated users can manage option templates" ON option_templates;
CREATE POLICY "Admin users can manage option templates"
  ON option_templates FOR ALL
  USING (is_admin());

-- Product Variants (migration 017)
DROP POLICY IF EXISTS "Authenticated users can manage product variants" ON product_variants;
CREATE POLICY "Admin users can manage product variants"
  ON product_variants FOR ALL
  USING (is_admin());

-- Product Option Templates (migration 017)
DROP POLICY IF EXISTS "Authenticated users can manage product option templates" ON product_option_templates;
CREATE POLICY "Admin users can manage product option templates"
  ON product_option_templates FOR ALL
  USING (is_admin());

-- ============================================
-- 3. Harden DELETE policies (orders, order_items, reviews)
-- ============================================

-- Orders DELETE
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;
CREATE POLICY "Admin users can delete orders"
  ON orders FOR DELETE
  USING (is_admin());

-- Order Items DELETE
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON order_items;
CREATE POLICY "Admin users can delete order items"
  ON order_items FOR DELETE
  USING (is_admin());

-- Reviews DELETE
DROP POLICY IF EXISTS "Authenticated users can delete reviews" ON reviews;
CREATE POLICY "Admin users can delete reviews"
  ON reviews FOR DELETE
  USING (is_admin());

-- ============================================
-- 4. Harden orders UPDATE policy with WITH CHECK clause
-- ============================================
-- Customers can only update status to 'cancelled' and cannot change session_token
-- Admins can update any field

DROP POLICY IF EXISTS "Customers can update their own orders" ON orders;

CREATE POLICY "Customers can update their own orders"
  ON orders FOR UPDATE
  USING (
    -- Admin: can update any order
    is_admin()
    -- Customer: can only update owned pending_payment orders
    OR (
      status = 'pending_payment'
      AND (
        session_token_hash = hash_session_token(
          current_setting('request.headers', true)::json->>'x-session-token'
        )
        OR session_token = current_setting('request.headers', true)::json->>'x-session-token'
      )
    )
  )
  WITH CHECK (
    -- Admin: can update any field
    is_admin()
    -- Customer: can only transition to cancelled and must keep same session_token
    OR (
      status = 'cancelled'
      AND (
        session_token_hash = hash_session_token(
          current_setting('request.headers', true)::json->>'x-session-token'
        )
        OR session_token = current_setting('request.headers', true)::json->>'x-session-token'
      )
    )
  );

-- ============================================
-- 5. Upgrade orders cancel policy to use session_token_hash
-- ============================================

DROP POLICY IF EXISTS "Customers can cancel their own pending orders" ON orders;

CREATE POLICY "Customers can cancel their own pending orders"
  ON orders FOR UPDATE
  USING (
    (
      session_token_hash = hash_session_token(
        current_setting('request.headers', true)::json->>'x-session-token'
      )
      OR session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
    AND status = 'pending_payment'
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- ============================================
-- 6. Add ownership check to order_items INSERT policy
-- ============================================
-- Prevent anon users from inserting items into someone else's order

DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;

CREATE POLICY "Customers can create order items for their own orders"
  ON order_items FOR INSERT
  WITH CHECK (
    -- Admin: can insert items into any order
    is_admin()
    -- Customer: can only insert items into orders they own
    OR EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.session_token_hash = hash_session_token(
          current_setting('request.headers', true)::json->>'x-session-token'
        )
        OR orders.session_token = current_setting('request.headers', true)::json->>'x-session-token'
      )
    )
  );

-- ============================================
-- 7. Upgrade order_items SELECT policy to use session_token_hash
-- ============================================

DROP POLICY IF EXISTS "Customers can view their own order items" ON order_items;

CREATE POLICY "Customers can view their own order items"
  ON order_items FOR SELECT
  USING (
    -- Admin: can view all order items
    is_admin()
    -- Customer: can only view items for orders they own
    OR EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        orders.session_token_hash = hash_session_token(
          current_setting('request.headers', true)::json->>'x-session-token'
        )
        OR orders.session_token = current_setting('request.headers', true)::json->>'x-session-token'
      )
    )
  );

-- ============================================
-- 8. Harden audit_logs policies
-- ============================================
-- Only admins can view/insert audit logs

DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;
CREATE POLICY "Admin users can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
CREATE POLICY "Admin users can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (is_admin());

-- ============================================
-- 9. Harden order_counter policy
-- ============================================
-- Only admins can view counter (already fixed in migration 011, but ensure consistency)

DROP POLICY IF EXISTS "Authenticated users can view counter" ON order_counter;
CREATE POLICY "Admin users can view counter"
  ON order_counter FOR SELECT
  USING (is_admin());

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration was successful:

-- 1. List all policies and verify admin checks
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- 2. Test is_admin() function
-- SELECT is_admin(); -- Should return false for anon, true for admin JWT

-- 3. Test customer order flow (requires test session token)
-- See .sisyphus/evidence/task-14-verification-scripts/ for test scripts

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- To rollback, restore policies from migrations 001-019
-- WARNING: This will restore the security vulnerabilities
