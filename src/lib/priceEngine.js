export function calculateItemPrice(product, variant, selectedOptions = {}, optionTemplates = {}) {
  let basePrice = variant?.price_override ?? product.price;

  if (product.discount_percent && product.discount_percent > 0) {
    basePrice = Math.round(basePrice * (1 - product.discount_percent / 100));
  }

  let optionDelta = 0;
  for (const [optionName, selectedValue] of Object.entries(selectedOptions)) {
    const template = optionTemplates[optionName];
    const choiceValue = typeof selectedValue === 'object' && selectedValue !== null ? selectedValue.value : selectedValue;
    const choice = template?.choices?.find((c) => c.value === choiceValue);
    optionDelta += choice?.price_delta ?? 0;
  }

  return basePrice + optionDelta;
}
