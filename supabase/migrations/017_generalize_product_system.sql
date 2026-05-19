-- Migration 017: Generalize product system schema
-- Adds product types, reusable option templates, product variants, and fulfillment fields

-- Step 1: Add product type classification
CREATE TYPE product_type AS ENUM ('beverage', 'food', 'physical', 'digital');

ALTER TABLE public.products
  ADD COLUMN product_type product_type DEFAULT 'beverage';

-- Step 2: Create reusable option templates
CREATE TABLE public.option_templates (
  id bigint generated always as identity primary key,
  name text not null,
  type text not null check (type in ('single', 'multiple')),
  choices jsonb not null,
  created_at timestamptz not null default now()
);

ALTER TABLE public.option_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Option templates are viewable by everyone"
  ON public.option_templates FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage option templates"
  ON public.option_templates FOR ALL USING (auth.role() = 'authenticated');

-- Step 3: Create product variants for SKU, stock, and attributes
CREATE TABLE public.product_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  sku text not null unique,
  name text not null,
  price_override int check (price_override > 0),
  stock int default 0,
  image_url text,
  attributes jsonb,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product variants are viewable by everyone"
  ON public.product_variants FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage product variants"
  ON public.product_variants FOR ALL USING (auth.role() = 'authenticated');

-- Step 4: Extend order items for generalized selections and variants
ALTER TABLE public.order_items
  ADD COLUMN selected_options jsonb;

ALTER TABLE public.order_items
  ADD COLUMN variant_id bigint references public.product_variants(id) on delete restrict;

ALTER TABLE public.order_items
  ALTER COLUMN size DROP NOT NULL;

ALTER TABLE public.order_items
  ALTER COLUMN sweetness DROP NOT NULL;

ALTER TABLE public.order_items
  ALTER COLUMN ice_cube DROP NOT NULL;

-- Step 4.5: Create product-option template mapping
CREATE TABLE public.product_option_templates (
  product_id bigint not null references public.products(id) on delete cascade,
  option_template_id bigint not null references public.option_templates(id) on delete cascade,
  sort_order int not null default 0,
  primary key (product_id, option_template_id)
);

ALTER TABLE public.product_option_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product option templates are viewable by everyone"
  ON public.product_option_templates FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage product option templates"
  ON public.product_option_templates FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX idx_product_option_templates_product_id ON public.product_option_templates(product_id);
CREATE INDEX idx_product_option_templates_template_id ON public.product_option_templates(option_template_id);

-- Step 5: Add order fulfillment metadata
CREATE TYPE fulfillment_type AS ENUM ('dine_in', 'takeaway', 'delivery', 'digital');

ALTER TABLE public.orders
  ADD COLUMN fulfillment_type fulfillment_type DEFAULT 'dine_in';

ALTER TABLE public.orders
  ADD COLUMN delivery_address text;

ALTER TABLE public.orders
  ADD COLUMN delivery_phone text;

ALTER TABLE public.orders
  ADD COLUMN delivery_email text;

ALTER TABLE public.orders
  ADD COLUMN digital_download_url text;

-- Step 6: Add lookup indexes
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX idx_order_items_variant_id ON public.order_items(variant_id);
