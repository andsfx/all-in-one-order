-- ============================================
-- MIGRATION: Add Voucher System
-- ============================================
-- Adds vouchers table and voucher tracking to orders.
-- Supports: Buy 1 Get 1 (BOGO), Fixed Discount (Rp), Percentage Discount (%)
--
-- Date: 2026-05-05
-- ============================================

-- Create vouchers table
create table if not exists vouchers (
  id bigint generated always as identity primary key,
  code text not null unique,
  type text not null check (type in ('bogo', 'fixed', 'percentage')),
  discount_value int check (discount_value >= 0),
  min_purchase int not null default 0 check (min_purchase >= 0),
  usage_limit int not null default 1 check (usage_limit > 0),
  usage_count int not null default 0 check (usage_count >= 0),
  valid_from timestamptz not null default now(),
  valid_to timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Add voucher tracking to orders
alter table orders
  add column if not exists voucher_id bigint references vouchers(id) on delete set null,
  add column if not exists discount_amount int check (discount_amount >= 0);

-- Create index for fast voucher lookup
create index if not exists idx_vouchers_code on vouchers(code) where is_active = true;
create index if not exists idx_vouchers_active on vouchers(is_active, valid_from, valid_to);

-- Enable RLS
alter table vouchers enable row level security;

-- RLS Policies for vouchers
create policy "Anyone can view active vouchers"
  on vouchers for select
  using (is_active = true and now() between valid_from and valid_to);

create policy "Authenticated users can manage vouchers"
  on vouchers for all
  using (auth.role() = 'authenticated');
