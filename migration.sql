-- ─────────────────────────────────────────────────────────────────────────────
-- Abstract Realms – Safe Migration
-- Run these against your Cloudflare D1 database.
-- Both statements use "ADD COLUMN IF NOT EXISTS" semantics via plain ALTER.
-- D1 is SQLite-compatible; plain ALTER TABLE ADD COLUMN is idempotent-safe
-- when the column does not yet exist (it will error if it does – run once only,
-- or use the wrangler d1 execute --command approach).
-- ─────────────────────────────────────────────────────────────────────────────

-- Feature 1: Product image URL
ALTER TABLE products ADD COLUMN image_url TEXT;

-- Feature 2: Customisable flag
ALTER TABLE products ADD COLUMN is_customizable INTEGER DEFAULT 0;
