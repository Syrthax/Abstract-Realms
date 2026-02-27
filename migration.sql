-- ─────────────────────────────────────────────────────────────────────────────
-- Abstract Realms – Safe Migration (cumulative – run once only per column)
-- ─────────────────────────────────────────────────────────────────────────────

-- Session 1 columns (already applied)
-- ALTER TABLE products ADD COLUMN image_url TEXT;
-- ALTER TABLE products ADD COLUMN is_customizable INTEGER DEFAULT 0;

-- Session 2: Product detail features (already applied)
-- ALTER TABLE products ADD COLUMN cover_image_url TEXT;
-- ALTER TABLE products ADD COLUMN gallery_images_json TEXT;
-- ALTER TABLE products ADD COLUMN description TEXT;
-- ALTER TABLE products ADD COLUMN customization_fee INTEGER DEFAULT 20;

-- ALTER TABLE orders ADD COLUMN is_customized INTEGER DEFAULT 0;

-- Session 3: Invoice PDF
ALTER TABLE orders ADD COLUMN invoice_number TEXT;
