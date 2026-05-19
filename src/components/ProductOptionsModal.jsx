import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { calculateItemPrice } from '../lib/priceEngine';

export default function ProductOptionsModal({
  product,
  variants = [],
  optionTemplates = [],
  storeSettings = {},
  isOpen,
  onClose,
  onAddToCart,
}) {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});

  // Initialize selected variant (first available variant)
  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) {
      const firstAvailable = variants.find((v) => v.is_available !== false) || variants[0];
      setSelectedVariant(firstAvailable);
    }
  }, [variants, selectedVariant]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedOptions({});
      setSelectedVariant(null);
    }
  }, [isOpen]);

  // Build option templates map for price calculation
  const optionTemplatesMap = useMemo(() => {
    const map = {};
    optionTemplates.forEach((template) => {
      map[template.name] = template;
    });
    return map;
  }, [optionTemplates]);

  // Calculate live price
  const currentPrice = useMemo(() => {
    if (!selectedVariant) return product.price;
    return calculateItemPrice(product, selectedVariant, selectedOptions, optionTemplatesMap);
  }, [product, selectedVariant, selectedOptions, optionTemplatesMap]);

  // Calculate original price (before discount)
  const originalPrice = useMemo(() => {
    if (!selectedVariant) return product.price;
    let basePrice = selectedVariant.price_override ?? product.price;
    let optionDelta = 0;
    for (const [optionName, selectedValue] of Object.entries(selectedOptions)) {
      const template = optionTemplatesMap[optionName];
      const choiceValue = typeof selectedValue === 'object' && selectedValue !== null ? selectedValue.value : selectedValue;
      const choice = template?.choices?.find((c) => c.value === choiceValue);
      optionDelta += choice?.price_delta ?? 0;
    }
    return basePrice + optionDelta;
  }, [product, selectedVariant, selectedOptions, optionTemplatesMap]);

  // Check if all required options are selected
  const requiredOptionsSelected = useMemo(() => {
    const requiredTemplates = optionTemplates.filter((t) => t.is_required);
    return requiredTemplates.every((t) => {
      const selected = selectedOptions[t.name];
      if (t.type === 'multiple') {
        return Array.isArray(selected) && selected.length > 0;
      }
      return selected != null && selected !== '';
    });
  }, [optionTemplates, selectedOptions]);

  function handleOptionChange(templateName, value, type) {
    setSelectedOptions((prev) => {
      if (type === 'multiple') {
        const current = Array.isArray(prev[templateName]) ? prev[templateName] : [];
        const exists = current.includes(value);
        return {
          ...prev,
          [templateName]: exists ? current.filter((v) => v !== value) : [...current, value],
        };
      }
      return { ...prev, [templateName]: value };
    });
  }

  function handleSubmit() {
    if (!selectedVariant || !requiredOptionsSelected) return;
    onAddToCart(product, selectedVariant, selectedOptions);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-[28px] p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-border" />
        </div>

        {/* Close button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-surface-secondary text-text-secondary"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Product header */}
        <div className="flex gap-4 mb-4">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-24 h-24 rounded-2xl object-cover"
          />
          <div>
            <h2 className="font-bold text-lg text-text-primary">{product.name}</h2>
            <p className="text-sm text-text-muted mt-0.5">{product.description}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {product.discount_percent > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  -{product.discount_percent}%
                </span>
              )}
              <p className="text-primary font-bold">
                Rp {currentPrice.toLocaleString('id-ID')}
              </p>
              {product.discount_percent > 0 && (
                <p className="text-text-muted text-sm line-through">
                  Rp {originalPrice.toLocaleString('id-ID')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Variant selector */}
        {variants.length > 1 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2.5">
              Pilih Varian
            </p>
            <div className="flex flex-col gap-2">
              {variants.map((variant) => {
                const isSelected = selectedVariant?.id === variant.id;
                const priceDiff = variant.price_override ? variant.price_override - product.price : 0;
                return (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    disabled={variant.is_available === false}
                    className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary text-white shadow-[0_2px_8px_rgba(0,96,65,0.25)]'
                        : variant.is_available === false
                        ? 'bg-surface-secondary text-text-muted opacity-50 cursor-not-allowed'
                        : 'bg-surface-secondary text-text-secondary active:scale-95'
                    }`}
                  >
                    <span>{variant.name}</span>
                    {priceDiff !== 0 && (
                      <span className={isSelected ? 'text-white' : 'text-text-muted'}>
                        {priceDiff > 0 ? '+' : ''}
                        {priceDiff.toLocaleString('id-ID')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic option templates */}
        {optionTemplates.map((template) => {
          const choices = template.choices || [];
          if (choices.length === 0) return null;

          return (
            <div key={template.name} className="mt-4">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2.5">
                {template.name}
                {template.is_required && <span className="text-red-500 ml-1">*</span>}
              </p>

              {template.type === 'single' ? (
                // Radio buttons for single selection
                <div className="flex flex-wrap gap-2">
                  {choices.map((choice) => {
                    const isSelected = selectedOptions[template.name] === choice.value;
                    return (
                      <button
                        key={choice.value}
                        onClick={() => handleOptionChange(template.name, choice.value, 'single')}
                        className={`flex-1 min-w-[calc(50%-4px)] py-2 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary text-white shadow-[0_2px_8px_rgba(0,96,65,0.25)]'
                            : 'bg-surface-secondary text-text-secondary active:scale-95'
                        }`}
                      >
                        <span>{choice.label}</span>
                        {choice.price_delta !== 0 && (
                          <span className={`ml-1 text-xs ${isSelected ? 'text-white' : 'text-text-muted'}`}>
                            {choice.price_delta > 0 ? '+' : ''}
                            {choice.price_delta.toLocaleString('id-ID')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Checkboxes for multiple selection
                <div className="flex flex-col gap-2">
                  {choices.map((choice) => {
                    const currentSelections = Array.isArray(selectedOptions[template.name])
                      ? selectedOptions[template.name]
                      : [];
                    const isSelected = currentSelections.includes(choice.value);
                    return (
                      <button
                        key={choice.value}
                        onClick={() => handleOptionChange(template.name, choice.value, 'multiple')}
                        className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary text-white shadow-[0_2px_8px_rgba(0,96,65,0.25)]'
                            : 'bg-surface-secondary text-text-secondary active:scale-95'
                        }`}
                      >
                        <span>{choice.label}</span>
                        {choice.price_delta !== 0 && (
                          <span className={isSelected ? 'text-white' : 'text-text-muted'}>
                            {choice.price_delta > 0 ? '+' : ''}
                            {choice.price_delta.toLocaleString('id-ID')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Add to cart button */}
        <button
          onClick={handleSubmit}
          disabled={!selectedVariant || !requiredOptionsSelected}
          className="w-full mt-5 bg-primary text-white py-3 rounded-full font-semibold text-sm active:scale-[0.98] transition-transform shadow-[var(--shadow-float)] disabled:opacity-50 disabled:active:scale-100"
        >
          {!requiredOptionsSelected
            ? 'Pilih opsi yang diperlukan'
            : 'Tambah ke Keranjang'}
        </button>
      </div>
    </div>
  );
}
