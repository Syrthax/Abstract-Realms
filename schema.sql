-- Abstract Realms D1 Schema
-- College stall product system: mugs, keychains, magnets, badges

DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('mug', 'keychain', 'magnet', 'badge')),
  base_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Product variants (material + shape combos for keychains, magnets, etc.)
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  material TEXT,
  shape TEXT,
  price_modifier INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  total_price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

-- Seed: Products
INSERT INTO products (id, name, category, base_price, stock, is_active) VALUES
  ('prod_mug', 'Custom Mug', 'mug', 250, 50, 1),
  ('prod_keychain', 'Custom Keychain', 'keychain', 100, 100, 1),
  ('prod_magnet', 'Fridge Magnet', 'magnet', 80, 80, 1),
  ('prod_badge', 'Custom Badge', 'badge', 50, 120, 1);

-- Seed: Keychain variants (material × shape)
INSERT INTO product_variants (id, product_id, material, shape, price_modifier, stock) VALUES
  ('var_kc_wood_heart', 'prod_keychain', 'wood', 'heart', 20, 15),
  ('var_kc_wood_double_heart', 'prod_keychain', 'wood', 'double_heart', 25, 10),
  ('var_kc_wood_oval', 'prod_keychain', 'wood', 'oval', 15, 20),
  ('var_kc_wood_guitar', 'prod_keychain', 'wood', 'guitar', 30, 10),
  ('var_kc_wood_square_curved', 'prod_keychain', 'wood', 'square_curved', 15, 15),
  ('var_kc_wood_apple_style', 'prod_keychain', 'wood', 'apple_style', 25, 10),
  ('var_kc_poly_heart', 'prod_keychain', 'polyester', 'heart', 10, 20),
  ('var_kc_poly_double_heart', 'prod_keychain', 'polyester', 'double_heart', 15, 15),
  ('var_kc_poly_oval', 'prod_keychain', 'polyester', 'oval', 10, 20),
  ('var_kc_poly_guitar', 'prod_keychain', 'polyester', 'guitar', 20, 15),
  ('var_kc_poly_square_curved', 'prod_keychain', 'polyester', 'square_curved', 10, 20),
  ('var_kc_poly_apple_style', 'prod_keychain', 'polyester', 'apple_style', 15, 15);

-- Seed: Magnet variants (shape only)
INSERT INTO product_variants (id, product_id, material, shape, price_modifier, stock) VALUES
  ('var_mag_square', 'prod_magnet', NULL, 'square', 0, 40),
  ('var_mag_circle', 'prod_magnet', NULL, 'circle', 0, 40);
