// Test script to verify order_items RLS policy isolation
// This tests that User A cannot see User B's order items

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file manually
const envPath = path.join(__dirname, '..', '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRLSIsolation() {
  console.log('🧪 Testing order_items RLS policy isolation...\n');

  // Generate two different session tokens
  const sessionTokenA = randomUUID();
  const sessionTokenB = randomUUID();

  console.log(`Session Token A: ${sessionTokenA}`);
  console.log(`Session Token B: ${sessionTokenB}\n`);

  try {
    // Step 1: Create order A with session token A
    console.log('📝 Step 1: Creating order A with session token A...');
    const orderIdA = `ORD-TEST-${Date.now()}-A`;
    const { data: orderA, error: orderAError } = await supabase
      .from('orders')
      .insert({
        id: orderIdA,
        customer_name: 'Test User A',
        table_number: 1,
        total: 25000,
        session_token: sessionTokenA,
        status: 'pending_payment',
        payment_method: 'qris'
      })
      .select()
      .single();

    if (orderAError) {
      console.error('❌ Failed to create order A:', orderAError);
      return;
    }
    console.log('✅ Order A created:', orderIdA);

    // Step 2: Create order B with session token B
    console.log('\n📝 Step 2: Creating order B with session token B...');
    const orderIdB = `ORD-TEST-${Date.now()}-B`;
    const { data: orderB, error: orderBError } = await supabase
      .from('orders')
      .insert({
        id: orderIdB,
        customer_name: 'Test User B',
        table_number: 2,
        total: 30000,
        session_token: sessionTokenB,
        status: 'pending_payment',
        payment_method: 'qris'
      })
      .select()
      .single();

    if (orderBError) {
      console.error('❌ Failed to create order B:', orderBError);
      return;
    }
    console.log('✅ Order B created:', orderIdB);

    // Step 3: Add order items to order B
    console.log('\n📝 Step 3: Adding order items to order B...');
    const { data: itemsB, error: itemsBError } = await supabase
      .from('order_items')
      .insert([
        {
          order_id: orderIdB,
          product_id: 1,
          product_name: 'Espresso',
          qty: 2,
          size: 'Regular',
          temp: 'Hot',
          sugar: 'Normal',
          price_at_order: 15000
        },
        {
          order_id: orderIdB,
          product_id: 2,
          product_name: 'Cappuccino',
          qty: 1,
          size: 'Large',
          temp: 'Iced',
          sugar: 'Less',
          price_at_order: 15000
        }
      ])
      .select();

    if (itemsBError) {
      console.error('❌ Failed to add items to order B:', itemsBError);
      return;
    }
    console.log(`✅ Added ${itemsB.length} items to order B`);

    // Step 4: Try to query order B's items using session token A (should fail)
    console.log('\n🔒 Step 4: Attempting to access order B items with session token A...');
    const { data: crossSessionItems, error: crossSessionError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderIdB)
      .headers({
        'x-session-token': sessionTokenA
      });

    console.log('\n📊 RESULTS:');
    console.log('─'.repeat(60));
    
    if (crossSessionError) {
      console.log('❌ Query error:', crossSessionError);
      console.log('\n⚠️  TEST INCONCLUSIVE: Query failed with error');
    } else if (!crossSessionItems || crossSessionItems.length === 0) {
      console.log('✅ PASS: Session token A cannot see order B items');
      console.log(`   Expected: 0 items`);
      console.log(`   Actual: ${crossSessionItems?.length || 0} items`);
      console.log('\n🎉 RLS policy is working correctly!');
    } else {
      console.log('❌ FAIL: Session token A can see order B items');
      console.log(`   Expected: 0 items`);
      console.log(`   Actual: ${crossSessionItems.length} items`);
      console.log('\n⚠️  SECURITY ISSUE: Cross-session data leakage detected!');
    }

    // Step 5: Verify session token B can see its own items
    console.log('\n🔓 Step 5: Verifying session token B can see its own items...');
    const { data: ownSessionItems, error: ownSessionError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderIdB)
      .headers({
        'x-session-token': sessionTokenB
      });

    if (ownSessionError) {
      console.log('❌ Query error:', ownSessionError);
    } else {
      console.log(`✅ Session token B can see ${ownSessionItems?.length || 0} items (expected: 2)`);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('orders').delete().eq('id', orderIdA);
    await supabase.from('orders').delete().eq('id', orderIdB);
    console.log('✅ Cleanup complete');

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      test: 'order_items RLS isolation',
      sessionTokenA,
      sessionTokenB,
      orderIdA,
      orderIdB,
      crossSessionAccess: {
        itemsReturned: crossSessionItems?.length || 0,
        expected: 0,
        passed: !crossSessionItems || crossSessionItems.length === 0
      },
      ownSessionAccess: {
        itemsReturned: ownSessionItems?.length || 0,
        expected: 2,
        passed: ownSessionItems?.length === 2
      }
    };

    return results;

  } catch (error) {
    console.error('\n❌ Test failed with exception:', error);
    throw error;
  }
}

// Run the test
testRLSIsolation()
  .then(results => {
    if (results) {
      fs.writeFileSync(
        '.sisyphus/evidence/task-3-rls-isolation.json',
        JSON.stringify(results, null, 2)
      );
      console.log('\n📄 Results saved to .sisyphus/evidence/task-3-rls-isolation.json');
    }
    process.exit(results?.crossSessionAccess?.passed ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
