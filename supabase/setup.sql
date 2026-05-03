-- ============================================
-- Order Kopi — Complete Database Setup
-- ============================================
-- Jalankan SELURUH file ini di Supabase SQL Editor
-- Cukup sekali jalan, semua tabel + data sample akan dibuat
-- ============================================

-- ============================================
-- 1. Categories
-- ============================================
create table categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;

create policy "Categories are viewable by everyone"
  on categories for select using (true);

create policy "Authenticated users can manage categories"
  on categories for all using (auth.role() = 'authenticated');

-- ============================================
-- 2. Products
-- ============================================
create table products (
  id bigint generated always as identity primary key,
  name text not null,
  price int not null check (price > 0),
  price_small int check (price_small > 0),
  price_large int check (price_large > 0),
  category_id bigint not null references categories(id) on delete restrict,
  description text,
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

create policy "Products are viewable by everyone"
  on products for select using (true);

create policy "Authenticated users can manage products"
  on products for all using (auth.role() = 'authenticated');

-- ============================================
-- 3. Orders
-- ============================================
create table orders (
  id text primary key, -- e.g. ORD-0001
  customer_name text not null,
  table_number int check (table_number between 1 and 50),
  note text,
  total int not null check (total >= 0),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'preparing', 'ready', 'done', 'cancelled')),
  payment_method text not null default 'qris'
    check (payment_method in ('qris', 'cash')),
  branch_id bigint,
  payment_id text,
  payment_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table orders enable row level security;

create policy "Anyone can create orders"
  on orders for insert with check (true);

create policy "Anyone can view orders"
  on orders for select using (true);

create policy "Anyone can update orders"
  on orders for update using (true);

create policy "Authenticated users can delete orders"
  on orders for delete using (auth.role() = 'authenticated');

-- ============================================
-- 4. Order Items
-- ============================================
create table order_items (
  id bigint generated always as identity primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id bigint not null references products(id) on delete restrict,
  product_name text not null,
  qty int not null check (qty > 0),
  size text not null check (size in ('Small', 'Regular', 'Large')),
  temp text not null check (temp in ('Hot', 'Iced')),
  sugar text not null check (sugar in ('Less', 'Normal', 'Extra')),
  price_at_order int not null check (price_at_order > 0),
  created_at timestamptz not null default now()
);

alter table order_items enable row level security;

create policy "Anyone can create order items"
  on order_items for insert with check (true);

create policy "Anyone can view order items"
  on order_items for select using (true);

create policy "Authenticated users can delete order items"
  on order_items for delete using (auth.role() = 'authenticated');

-- ============================================
-- 5. Order Counter + Generate ID Function
-- ============================================
create table order_counter (
  id int primary key default 1 check (id = 1),
  last_number int not null default 0
);

alter table order_counter enable row level security;

create policy "Anyone can use counter"
  on order_counter for all using (true);

insert into order_counter (id, last_number) values (1, 0);

create or replace function generate_order_id()
returns text
language plpgsql
security definer
as $$
declare
  next_num int;
begin
  update order_counter
  set last_number = last_number + 1
  where id = 1
  returning last_number into next_num;

  return 'ORD-' || lpad(next_num::text, 4, '0');
end;
$$;

-- Grant execute to anon and authenticated
grant execute on function generate_order_id() to anon;
grant execute on function generate_order_id() to authenticated;

-- ============================================
-- 6. Promos
-- ============================================
create table promos (
  id bigint generated always as identity primary key,
  title text not null,
  subtitle text,
  theme text not null default 'green'
    check (theme in ('green', 'amber', 'slate')),
  image_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table promos enable row level security;

create policy "Active promos are viewable by everyone"
  on promos for select using (true);

create policy "Authenticated users can manage promos"
  on promos for all using (auth.role() = 'authenticated');

-- ============================================
-- 7. Branches
-- ============================================
create table branches (
  id bigint generated always as identity primary key,
  name text not null,
  address text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table branches enable row level security;

create policy "Active branches are viewable by everyone"
  on branches for select using (true);

create policy "Authenticated users can manage branches"
  on branches for all using (auth.role() = 'authenticated');

-- ============================================
-- 8. Reviews
-- ============================================
create table reviews (
  id bigint generated always as identity primary key,
  order_id text not null references orders(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;

create policy "Anyone can create reviews"
  on reviews for insert with check (true);

create policy "Anyone can view reviews"
  on reviews for select using (true);

create policy "Authenticated users can delete reviews"
  on reviews for delete using (auth.role() = 'authenticated');

-- ============================================
-- 9. Store Settings (Key-Value)
-- ============================================
create table store_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table store_settings enable row level security;

create policy "Store settings are viewable by everyone"
  on store_settings for select using (true);

create policy "Authenticated users can manage store settings"
  on store_settings for all using (auth.role() = 'authenticated');

-- Default store settings
insert into store_settings (key, value) values
  ('store_name', 'Order Kopi'),
  ('store_logo', ''),
  ('primary_color', '#006041'),
  ('qris_image', ''),
  ('open_hour', '07:00'),
  ('close_hour', '22:00'),
  ('is_open', 'true'),
  ('setup_completed', 'false'),
  ('admin_whatsapp', '');

-- ============================================
-- 10. Storage Buckets
-- ============================================
-- Bucket: product-images (untuk foto menu)
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

-- Bucket: store-assets (untuk logo, QRIS, dll)
insert into storage.buckets (id, name, public) values ('store-assets', 'store-assets', true);

-- Storage policies: product-images
create policy "Anyone can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Authenticated users can upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "Authenticated users can update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "Authenticated users can delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- Storage policies: store-assets
create policy "Anyone can view store assets"
  on storage.objects for select
  using (bucket_id = 'store-assets');

create policy "Authenticated users can upload store assets"
  on storage.objects for insert
  with check (bucket_id = 'store-assets' and auth.role() = 'authenticated');

create policy "Authenticated users can update store assets"
  on storage.objects for update
  using (bucket_id = 'store-assets' and auth.role() = 'authenticated');

create policy "Authenticated users can delete store assets"
  on storage.objects for delete
  using (bucket_id = 'store-assets' and auth.role() = 'authenticated');

-- ============================================
-- 11. Indexes
-- ============================================
create index idx_products_category on products(category_id);
create index idx_products_available on products(is_available);
create index idx_orders_status on orders(status);
create index idx_orders_created on orders(created_at desc);
create index idx_orders_branch on orders(branch_id);
create index idx_order_items_order on order_items(order_id);
create index idx_reviews_order on reviews(order_id);
create index idx_promos_active on promos(is_active, sort_order);
create index idx_branches_active on branches(is_active, sort_order);

-- ============================================
-- 12. Enable Realtime for Orders
-- ============================================
alter publication supabase_realtime add table orders;

-- ============================================
-- 13. Seed Data: Sample Categories
-- ============================================
insert into categories (name, sort_order) values
  ('Coffee', 1),
  ('Non-Coffee', 2),
  ('Pastry', 3);

-- ============================================
-- 14. Seed Data: Sample Products (1 per category)
-- ============================================
insert into products (name, price, price_small, price_large, category_id, description, image_url) values
  ('Caramel Latte', 28000, 24000, 32000, 1, 'Espresso dengan susu dan karamel manis', 'https://images.unsplash.com/photo-1485808191679-5f86510bd9d4?w=400&q=80'),
  ('Matcha Latte', 30000, 26000, 34000, 2, 'Matcha premium Jepang dengan susu segar', 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?w=400&q=80'),
  ('Butter Croissant', 22000, null, null, 3, 'Croissant renyah dengan mentega premium', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80');

-- ============================================
-- 15. Seed Data: Sample Branch
-- ============================================
insert into branches (name, address, is_active, sort_order) values
  ('Cabang Utama', 'Jl. Contoh No. 1, Jakarta', true, 1);

-- ============================================
-- 16. Seed Data: Sample Promo
-- ============================================
insert into promos (title, subtitle, theme, is_active, sort_order) values
  ('Grand Opening!', 'Diskon 20% untuk semua menu', 'green', true, 1);

-- ============================================
-- Setup selesai! 
-- Langkah selanjutnya:
-- 1. Buat user admin di Authentication > Users
-- 2. Isi environment variables di .env
-- 3. Jalankan: npm run dev
-- ============================================
