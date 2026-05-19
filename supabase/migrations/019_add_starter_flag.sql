ALTER TABLE products ADD COLUMN IF NOT EXISTS is_starter boolean DEFAULT false;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_starter boolean DEFAULT false;
