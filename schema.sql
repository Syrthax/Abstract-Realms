-- Abstract Realms D1 Schema

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  base_price REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price_modifier REAL NOT NULL DEFAULT 1.0
);

-- Stock table
CREATE TABLE IF NOT EXISTS stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (material_id) REFERENCES materials(id),
  UNIQUE(product_id, material_id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  material_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  total_price REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- Seed data: Products
INSERT INTO products (name, description, base_price) VALUES
  ('T-Shirt', 'Custom printed t-shirt', 499),
  ('Mug', 'Custom printed ceramic mug', 299),
  ('Poster', 'High quality art poster', 199),
  ('Phone Case', 'Custom phone case', 399);

-- Seed data: Materials
INSERT INTO materials (name, price_modifier) VALUES
  ('Standard', 1.0),
  ('Premium', 1.5),
  ('Deluxe', 2.0);

-- Seed data: Stock
INSERT INTO stock (product_id, material_id, quantity) VALUES
  (1, 1, 50), (1, 2, 30), (1, 3, 10),
  (2, 1, 100), (2, 2, 50), (2, 3, 20),
  (3, 1, 200), (3, 2, 100), (3, 3, 50),
  (4, 1, 75), (4, 2, 40), (4, 3, 15);
