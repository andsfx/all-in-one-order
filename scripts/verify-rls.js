/**
 * ============================================
 * RLS Policy Verification Script
 * ============================================
 *
 * Manual verification script to validate Row Level Security policies
 * against a running local Supabase instance.
 *
 * Usage:
 *   node scripts/verify-rls.js
 *
 * Required environment variables:
 *   SUPABASE_URL           - Local Supabase URL (e.g. http://127.0.0.1:54321)
 *   SUPABASE_ANON_KEY      - Anon/public key from local Supabase
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (used to simulate admin)
 *
 * Prerequisites:
 *   - Local Supabase running (`supabase start`)
 *   - All migrations applied (including 020_harden_rls_policies.sql)
 *   - At least one category and product in the database
 *
 * This script is NOT part of automated CI. It requires a live database.
 * ============================================
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================
// Environment validation
// ============================================

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error('\nUsage:');
  console.error(
    '  SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/verify-rls.js\n'
  );
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================
// Client setup
// ============================================

/** Anon client — simulates unauthenticated customer with session token */
function createAnonClient(sessionToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: sessionToken ? { 'x-session-token': sessionToken } : {},
    },
  });
}

/** Admin client — uses service_role key to bypass RLS (simulates admin) */
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================
// Test infrastructure
// ============================================

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    results.push({ status: 'PASS', name: testName });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    results.push({ status: 'FAIL', name: testName });
    console.log(`  ❌ FAIL: ${testName}`);
  }
}

function assertError(error, testName) {
  if (error) {
    passed++;
    results.push({ status: 'PASS', name: testName });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    results.push({ status: 'FAIL', name: testName });
    console.log(`  ❌ FAIL: ${testName} (expected error but got none)`);
  }
}

// ============================================
// Helper: generate unique session token
// ============================================

function generateSessionToken() {
  return crypto.randomUUID();
}

// ============================================
// Test suites
// ============================================

async function setupTestData() {
  console.log('\n🔧 Setting up test data via admin client...\n');

  // Ensure at least one category exists
  const { data: categories } = await adminClient.from('categories').select('id').limit(1);
  let categoryId;
  if (categories && categories.length > 0) {
    categoryId = categories[0].id;
  } else {
    const { data: cat } = await adminClient
      .from('categories')
      .insert({ name: '__rls_test_category', sort_order: 9999 })
      .select('id')
      .single();
    categoryId = cat?.id;
  }

  // Ensure at least one product exists
  const { data: products } = await adminClient.from('products').select('id').limit(1);
  let productId;
  if (products && products.length > 0) {
    productId = products[0].id;
  } else {
    const { data: prod } = await adminClient
      .from('products')
      .insert({
        name: '__rls_test_product',
        price: 10000,
        category_id: categoryId,
        is_available: true,
      })
      .select('id')
      .single();
    productId = prod?.id;
  }

  return { categoryId, productId };
}

async function testAnonInsertOrder(sessionToken) {
  console.log('\n── Test: Anon can INSERT orders with session token ──');

  const client = createAnonClient(sessionToken);
  const { data, error } = await client
    .from('orders')
    .insert({
      session_token: sessionToken,
      status: 'pending_payment',
      total_amount: 25000,
      customer_name: 'RLS Test Customer',
    })
    .select('id, session_token')
    .single();

  assert(!error && data?.id, 'Anon can INSERT order with session token');
  return data?.id;
}

async function testAnonInsertOrderItemsOwn(sessionToken, orderId, productId) {
  console.log('\n── Test: Anon can INSERT order_items for own order ──');

  const client = createAnonClient(sessionToken);
  const { data, error } = await client
    .from('order_items')
    .insert({
      order_id: orderId,
      product_id: productId,
      quantity: 2,
      unit_price: 10000,
      subtotal: 20000,
    })
    .select('id')
    .single();

  assert(!error && data?.id, 'Anon can INSERT order_items for own order (session token match)');
  return data?.id;
}

async function testAnonCannotInsertOrderItemsOther(otherOrderId, productId) {
  console.log('\n── Test: Anon CANNOT INSERT order_items for another order ──');

  // Use a different session token — should NOT be able to add items to otherOrderId
  const differentToken = generateSessionToken();
  const client = createAnonClient(differentToken);
  const { error } = await client.from('order_items').insert({
    order_id: otherOrderId,
    product_id: productId,
    quantity: 1,
    unit_price: 10000,
    subtotal: 10000,
  });

  assertError(error, 'Anon CANNOT INSERT order_items for another user\'s order');
}

async function testCustomerSelectOwnOrders(sessionToken, orderId) {
  console.log('\n── Test: Customer can SELECT only own orders ──');

  const client = createAnonClient(sessionToken);
  const { data, error } = await client.from('orders').select('id');

  assert(!error, 'Customer SELECT orders does not error');
  // All returned orders should belong to this session token
  const hasOwnOrder = data?.some((o) => o.id === orderId);
  assert(hasOwnOrder, 'Customer can see own order in results');

  // Create another order with different token — should NOT appear
  const otherToken = generateSessionToken();
  const otherClient = createAnonClient(otherToken);
  const { data: otherData } = await otherClient.from('orders').select('id');
  const seesFirstOrder = otherData?.some((o) => o.id === orderId);
  assert(!seesFirstOrder, 'Other customer CANNOT see first customer\'s order');
}

async function testNonAdminCannotManageCategories() {
  console.log('\n── Test: Non-admin CANNOT manage categories ──');

  // Anon client (no auth) trying to insert a category
  const client = createAnonClient(generateSessionToken());

  const { error: insertErr } = await client
    .from('categories')
    .insert({ name: '__rls_hack_category', sort_order: 9999 });
  assertError(insertErr, 'Non-admin CANNOT INSERT categories');

  const { error: deleteErr } = await client
    .from('categories')
    .delete()
    .eq('name', '__rls_hack_category');
  assertError(deleteErr, 'Non-admin CANNOT DELETE categories');
}

async function testNonAdminCannotManageProducts() {
  console.log('\n── Test: Non-admin CANNOT manage products ──');

  const client = createAnonClient(generateSessionToken());

  const { error: insertErr } = await client
    .from('products')
    .insert({ name: '__rls_hack_product', price: 1000, is_available: true });
  assertError(insertErr, 'Non-admin CANNOT INSERT products');

  const { error: updateErr } = await client
    .from('products')
    .update({ name: '__rls_hacked' })
    .eq('name', '__rls_hack_product');
  // Even if no rows match, the policy should block the operation
  assertError(updateErr, 'Non-admin CANNOT UPDATE products');
}

async function testNonAdminCannotManageVouchers() {
  console.log('\n── Test: Non-admin CANNOT manage vouchers ──');

  const client = createAnonClient(generateSessionToken());

  const { error: insertErr } = await client
    .from('vouchers')
    .insert({ code: '__RLS_HACK', discount_type: 'percentage', discount_value: 50 });
  assertError(insertErr, 'Non-admin CANNOT INSERT vouchers');
}

async function testAdminCanManageAll(categoryId) {
  console.log('\n── Test: Admin CAN manage all tables ──');

  // Admin uses service_role which bypasses RLS entirely
  const { data: cat, error: catErr } = await adminClient
    .from('categories')
    .insert({ name: '__rls_admin_test_cat', sort_order: 9998 })
    .select('id')
    .single();
  assert(!catErr && cat?.id, 'Admin CAN INSERT categories');

  const { error: catDelErr } = await adminClient
    .from('categories')
    .delete()
    .eq('id', cat?.id);
  assert(!catDelErr, 'Admin CAN DELETE categories');

  // Admin can view all orders
  const { data: orders, error: ordErr } = await adminClient.from('orders').select('id').limit(5);
  assert(!ordErr && orders !== null, 'Admin CAN SELECT all orders');

  // Admin can insert products
  const { data: prod, error: prodErr } = await adminClient
    .from('products')
    .insert({
      name: '__rls_admin_test_prod',
      price: 5000,
      category_id: categoryId,
      is_available: true,
    })
    .select('id')
    .single();
  assert(!prodErr && prod?.id, 'Admin CAN INSERT products');

  // Cleanup
  if (prod?.id) {
    await adminClient.from('products').delete().eq('id', prod.id);
  }
}

async function testCustomerCannotDeleteOrders(sessionToken, orderId) {
  console.log('\n── Test: Customer CANNOT delete orders ──');

  const client = createAnonClient(sessionToken);
  const { error } = await client.from('orders').delete().eq('id', orderId);

  assertError(error, 'Customer CANNOT DELETE own orders');
}

// ============================================
// Cleanup
// ============================================

async function cleanup(orderId, orderItemId) {
  console.log('\n🧹 Cleaning up test data...');
  if (orderItemId) {
    await adminClient.from('order_items').delete().eq('id', orderItemId);
  }
  if (orderId) {
    await adminClient.from('orders').delete().eq('id', orderId);
  }
  // Clean up any leftover test categories/products
  await adminClient.from('categories').delete().eq('name', '__rls_test_category');
  await adminClient.from('products').delete().eq('name', '__rls_test_product');
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   RLS Policy Verification Script                ║');
  console.log('║   Target: Local Supabase                        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n🔗 Supabase URL: ${SUPABASE_URL}`);

  const { categoryId, productId } = await setupTestData();
  const sessionToken = generateSessionToken();

  let orderId;
  let orderItemId;

  try {
    // 1. Anon can INSERT orders with session token
    orderId = await testAnonInsertOrder(sessionToken);

    // 2. Anon can INSERT order_items for own order
    if (orderId) {
      orderItemId = await testAnonInsertOrderItemsOwn(sessionToken, orderId, productId);
    }

    // 3. Anon CANNOT insert order_items for another user's order
    if (orderId) {
      await testAnonCannotInsertOrderItemsOther(orderId, productId);
    }

    // 4. Customer can SELECT only own orders
    if (orderId) {
      await testCustomerSelectOwnOrders(sessionToken, orderId);
    }

    // 5. Non-admin cannot manage categories/products/vouchers
    await testNonAdminCannotManageCategories();
    await testNonAdminCannotManageProducts();
    await testNonAdminCannotManageVouchers();

    // 6. Admin CAN manage all tables
    await testAdminCanManageAll(categoryId);

    // 7. Customer CANNOT delete orders
    if (orderId) {
      await testCustomerCannotDeleteOrders(sessionToken, orderId);
    }
  } finally {
    await cleanup(orderId, orderItemId);
  }

  // ============================================
  // Summary
  // ============================================

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('══════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('⚠️  Some RLS policies did not behave as expected.');
    console.log('   Review the FAIL cases above and check migration 020_harden_rls_policies.sql\n');
    process.exit(1);
  } else {
    console.log('✅ All RLS policies verified successfully.\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\n💥 Unexpected error:', err.message);
  process.exit(2);
});
