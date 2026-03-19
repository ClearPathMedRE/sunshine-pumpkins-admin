-- Markets table for multi-market segmentation
CREATE TABLE IF NOT EXISTS markets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  zip_prefixes TEXT NOT NULL DEFAULT '[]',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Seed initial markets
INSERT OR IGNORE INTO markets (name, slug, zip_prefixes)
VALUES ('Tampa Bay', 'tampa-bay', '["337","338","346"]');

INSERT OR IGNORE INTO markets (name, slug, zip_prefixes)
VALUES ('Jacksonville', 'jacksonville', '["322","320"]');

-- Add market_id to customers (nullable for backward compat during migration)
ALTER TABLE customers ADD COLUMN market_id INTEGER REFERENCES markets(id);

-- Index for fast market-based filtering
CREATE INDEX IF NOT EXISTS idx_customers_market ON customers(market_id);
