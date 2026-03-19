-- Settings table for simple key-value config
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Seed promo setting
INSERT OR IGNORE INTO settings (key, value) VALUES ('promo_pricing_enabled', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('promo_end_date', '2026-08-31');

-- Discount codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK(discount_type IN ('fixed', 'percent')),
  discount_value REAL NOT NULL,
  description TEXT,
  expires_at TEXT,
  max_uses INTEGER,
  times_used INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed the promo discount code
INSERT OR IGNORE INTO discount_codes (code, discount_type, discount_value, description, expires_at, max_uses, active)
VALUES ('PROMO2026', 'fixed', 0, 'Pre-book summer promotional pricing (applied automatically)', '2026-08-31', NULL, 1);

-- Referral partners
CREATE TABLE IF NOT EXISTS referral_partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  company TEXT,
  partner_type TEXT DEFAULT 'individual' CHECK(partner_type IN ('individual', 'realtor', 'business')),
  referral_code TEXT UNIQUE NOT NULL,
  kickback_hello REAL DEFAULT 25,
  kickback_spread REAL DEFAULT 50,
  kickback_harvest REAL DEFAULT 100,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Referral payouts
CREATE TABLE IF NOT EXISTS referral_payouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id INTEGER NOT NULL REFERENCES referral_partners(id),
  order_id INTEGER REFERENCES orders(id),
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'cancelled')),
  paid_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_referral_payouts_partner ON referral_payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_status ON referral_payouts(status);
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
