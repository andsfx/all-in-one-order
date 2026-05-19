import { getPreset } from './businessPresets';

/**
 * Generate categories, option templates, and starter products from business preset.
 * All operations are idempotent - safe to call multiple times.
 */
export async function generateFromPreset(supabase, businessType, storeName) {
  try {
    const preset = getPreset(businessType);
    if (!preset) {
      return { success: false, error: `Unknown business type: ${businessType}` };
    }

    // Insert categories
    const categoryIdMap = [];
    for (let i = 0; i < preset.categories.length; i++) {
      const cat = preset.categories[i];

      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('name', cat.name)
        .eq('is_starter', true)
        .single();

      if (existing) {
        categoryIdMap[i] = existing.id;
        continue;
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: cat.name,
          sort_order: cat.sort_order,
          is_starter: true
        })
        .select('id')
        .single();

      if (error) return { success: false, error: `Category insert failed: ${error.message}` };
      categoryIdMap[i] = data.id;
    }

    // Insert option templates
    const optionTemplateIds = [];
    for (const template of preset.optionTemplates) {
      const { data: existing } = await supabase
        .from('option_templates')
        .select('id')
        .eq('name', template.name)
        .single();

      if (existing) {
        optionTemplateIds.push(existing.id);
        continue;
      }

      const { data, error } = await supabase
        .from('option_templates')
        .insert({
          name: template.name,
          type: template.type,
          choices: template.choices
        })
        .select('id')
        .single();

      if (error) return { success: false, error: `Option template insert failed: ${error.message}` };
      optionTemplateIds.push(data.id);
    }

    // Insert starter products and link option templates
    for (const product of preset.starterProducts) {
      const categoryId = categoryIdMap[product.category_index];
      if (!categoryId) {
        return { success: false, error: `Invalid category_index ${product.category_index} for product ${product.name}` };
      }

      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('name', product.name)
        .eq('is_starter', true)
        .single();

      if (existing) continue;

      const { data: insertedProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: product.name,
          price: product.price,
          category_id: categoryId,
          description: product.description || null,
          image_url: null,
          is_available: true,
          product_type: 'simple',
          discount_percent: product.discount_percent || null,
          is_starter: true
        })
        .select('id')
        .single();

      if (productError) return { success: false, error: `Product insert failed: ${productError.message}` };

      // Link option templates to product
      if (product.option_template_indices && product.option_template_indices.length > 0) {
        const links = product.option_template_indices.map(idx => ({
          product_id: insertedProduct.id,
          option_template_id: optionTemplateIds[idx]
        }));

        const { error: linkError } = await supabase
          .from('product_option_templates')
          .insert(links);

        if (linkError) return { success: false, error: `Option template link failed: ${linkError.message}` };
      }
    }

    // Save store settings
    const { error: btError } = await supabase
      .from('store_settings')
      .upsert({ key: 'business_type', value: businessType });

    if (btError) return { success: false, error: `Business type save failed: ${btError.message}` };

    const { error: ftError } = await supabase
      .from('store_settings')
      .upsert({
        key: 'active_fulfillment_types',
        value: JSON.stringify(preset.defaultFulfillment)
      });

    if (ftError) return { success: false, error: `Fulfillment types save failed: ${ftError.message}` };

    if (preset.defaultSettings && preset.defaultSettings.allow_mixed_cart !== undefined) {
      const { error: mixedError } = await supabase
        .from('store_settings')
        .upsert({
          key: 'allow_mixed_cart',
          value: String(preset.defaultSettings.allow_mixed_cart)
        });

      if (mixedError) return { success: false, error: `Mixed cart setting save failed: ${mixedError.message}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
