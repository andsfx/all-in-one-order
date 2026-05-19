#!/usr/bin/env node
/**
 * migrate-coffee-to-variants.js
 * 
 * Idempotent migration script to convert existing coffee products into
 * the generalized product variant + option template system.
 * 
 * What it does:
 * 1. Sets all existing products to product_type = 'beverage'
 * 2. Creates reusable option templates: Sweetness, Ice Cube
 * 3. Creates product variants for Regular Ice and Large Ice (if price_large exists)
 * 4. Links option templates to products via product_option_templates
 * 
 * Idempotency:
 * - Upserts templates by name
 * - Creates variants only if SKU doesn't exist
 * - Links templates only if mapping doesn't exist
 * 
 * Usage:
 *   SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/migrate-coffee-to-variants.js
 *   OR
 *   VITE_SUPABASE_URL=<url> VITE_SUPABASE_ANON_KEY=<key> node scripts/migrate-coffee-to-variants.js
 */

import { createClient } from '@supabase/supabase-js';

// Read environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[ERROR] Missing environment variables:');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('   OR VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Template definitions
const SWEETNESS_TEMPLATE = {
  name: 'Sweetness',
  type: 'single',
  choices: [
    { label: 'Normal Sweet', value: 'Normal Sweet', price_delta: 0 },
    { label: 'Less Sweet', value: 'Less Sweet', price_delta: 0 }
  ]
};

const ICE_CUBE_TEMPLATE = {
  name: 'Ice Cube',
  type: 'single',
  choices: [
    { label: 'Normal Ice', value: 'Normal Ice', price_delta: 0 },
    { label: 'Less Ice', value: 'Less Ice', price_delta: 0 },
    { label: 'More Ice', value: 'More Ice', price_delta: 0 }
  ]
};

async function main() {
  console.log('[INFO] Starting coffee-to-variants migration...\n');

  // Step 1: Set all products to beverage type
  console.log('[INFO] Step 1: Setting product_type = beverage for all products...');
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, price_large')
    .is('product_type', null);

  if (productsError) {
    console.error('[ERROR] Failed to fetch products:', productsError.message);
    process.exit(1);
  }

  if (products && products.length > 0) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ product_type: 'beverage' })
      .is('product_type', null);

    if (updateError) {
      console.error('[ERROR] Failed to update product_type:', updateError.message);
      process.exit(1);
    }
    console.log(`[OK] Updated ${products.length} products to beverage type\n`);
  } else {
    console.log('[OK] All products already have product_type set\n');
  }

  // Refetch all products for variant creation
  const { data: allProducts, error: allProductsError } = await supabase
    .from('products')
    .select('id, name, price, price_large');

  if (allProductsError) {
    console.error('[ERROR] Failed to fetch all products:', allProductsError.message);
    process.exit(1);
  }

  // Step 2: Create option templates (idempotent upsert by name)
  console.log('[INFO] Step 2: Creating option templates...');
  
  const { data: existingSweetness } = await supabase
    .from('option_templates')
    .select('id')
    .eq('name', SWEETNESS_TEMPLATE.name)
    .single();

  let sweetnessId;
  if (existingSweetness) {
    sweetnessId = existingSweetness.id;
    console.log(`[OK] Sweetness template already exists (id: ${sweetnessId})`);
  } else {
    const { data: newSweetness, error: sweetnessError } = await supabase
      .from('option_templates')
      .insert({
        name: SWEETNESS_TEMPLATE.name,
        type: SWEETNESS_TEMPLATE.type,
        choices: SWEETNESS_TEMPLATE.choices
      })
      .select('id')
      .single();

    if (sweetnessError) {
      console.error('[ERROR] Failed to create Sweetness template:', sweetnessError.message);
      process.exit(1);
    }
    sweetnessId = newSweetness.id;
    console.log(`[OK] Created Sweetness template (id: ${sweetnessId})`);
  }

  const { data: existingIceCube } = await supabase
    .from('option_templates')
    .select('id')
    .eq('name', ICE_CUBE_TEMPLATE.name)
    .single();

  let iceCubeId;
  if (existingIceCube) {
    iceCubeId = existingIceCube.id;
    console.log(`[OK] Ice Cube template already exists (id: ${iceCubeId})\n`);
  } else {
    const { data: newIceCube, error: iceCubeError } = await supabase
      .from('option_templates')
      .insert({
        name: ICE_CUBE_TEMPLATE.name,
        type: ICE_CUBE_TEMPLATE.type,
        choices: ICE_CUBE_TEMPLATE.choices
      })
      .select('id')
      .single();

    if (iceCubeError) {
      console.error('[ERROR] Failed to create Ice Cube template:', iceCubeError.message);
      process.exit(1);
    }
    iceCubeId = newIceCube.id;
    console.log(`[OK] Created Ice Cube template (id: ${iceCubeId})\n`);
  }

  // Step 3: Create product variants
  console.log('[INFO] Step 3: Creating product variants...');
  let variantsCreated = 0;
  let variantsSkipped = 0;

  for (const product of allProducts) {
    const regularSku = `${product.id}-regular`;
    const largeSku = `${product.id}-large`;

    // Check if Regular variant exists
    const { data: existingRegular } = await supabase
      .from('product_variants')
      .select('id')
      .eq('sku', regularSku)
      .single();

    if (!existingRegular) {
      const { error: regularError } = await supabase
        .from('product_variants')
        .insert({
          product_id: product.id,
          sku: regularSku,
          name: 'Regular Ice',
          price_override: product.price,
          stock: 999,
          attributes: { size: 'regular' },
          is_available: true
        });

      if (regularError) {
        console.error(`[ERROR] Failed to create Regular variant for ${product.name}:`, regularError.message);
      } else {
        variantsCreated++;
        console.log(`[OK] Created Regular variant for ${product.name}`);
      }
    } else {
      variantsSkipped++;
    }

    // Check if Large variant should be created
    if (product.price_large && product.price_large > 0) {
      const { data: existingLarge } = await supabase
        .from('product_variants')
        .select('id')
        .eq('sku', largeSku)
        .single();

      if (!existingLarge) {
        const { error: largeError } = await supabase
          .from('product_variants')
          .insert({
            product_id: product.id,
            sku: largeSku,
            name: 'Large Ice',
            price_override: product.price_large,
            stock: 999,
            attributes: { size: 'large' },
            is_available: true
          });

        if (largeError) {
          console.error(`[ERROR] Failed to create Large variant for ${product.name}:`, largeError.message);
        } else {
          variantsCreated++;
          console.log(`[OK] Created Large variant for ${product.name}`);
        }
      } else {
        variantsSkipped++;
      }
    }
  }

  console.log(`\n[INFO] Variants summary: ${variantsCreated} created, ${variantsSkipped} skipped\n`);

  // Step 4: Link option templates to products
  console.log('[INFO] Step 4: Linking option templates to products...');
  let linksCreated = 0;
  let linksSkipped = 0;

  for (const product of allProducts) {
    // Link Sweetness template
    const { data: existingSweetnessLink } = await supabase
      .from('product_option_templates')
      .select('product_id')
      .eq('product_id', product.id)
      .eq('option_template_id', sweetnessId)
      .single();

    if (!existingSweetnessLink) {
      const { error: sweetnessLinkError } = await supabase
        .from('product_option_templates')
        .insert({
          product_id: product.id,
          option_template_id: sweetnessId,
          sort_order: 0
        });

      if (sweetnessLinkError) {
        console.error(`[ERROR] Failed to link Sweetness to ${product.name}:`, sweetnessLinkError.message);
      } else {
        linksCreated++;
      }
    } else {
      linksSkipped++;
    }

    // Link Ice Cube template
    const { data: existingIceCubeLink } = await supabase
      .from('product_option_templates')
      .select('product_id')
      .eq('product_id', product.id)
      .eq('option_template_id', iceCubeId)
      .single();

    if (!existingIceCubeLink) {
      const { error: iceCubeLinkError } = await supabase
        .from('product_option_templates')
        .insert({
          product_id: product.id,
          option_template_id: iceCubeId,
          sort_order: 1
        });

      if (iceCubeLinkError) {
        console.error(`[ERROR] Failed to link Ice Cube to ${product.name}:`, iceCubeLinkError.message);
      } else {
        linksCreated++;
      }
    } else {
      linksSkipped++;
    }
  }

  console.log(`\n[INFO] Links summary: ${linksCreated} created, ${linksSkipped} skipped\n`);

  console.log('[SUCCESS] Migration complete!\n');
  console.log('Summary:');
  console.log(`  - Products migrated: ${allProducts.length}`);
  console.log(`  - Option templates: 2 (Sweetness, Ice Cube)`);
  console.log(`  - Variants created: ${variantsCreated}`);
  console.log(`  - Template links created: ${linksCreated}`);
}

main().catch((err) => {
  console.error('[FATAL] Unexpected error:', err);
  process.exit(1);
});
