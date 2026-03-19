require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const db = require('./database');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

console.log('Running migrations...');
const schema = fs.readFileSync(path.resolve(__dirname, '..', 'migrations', '001_initial_schema.sql'), 'utf8');
db.exec(schema);
console.log('Schema created.');

// Seed packages
const insertPkg = db.prepare(`
  INSERT OR IGNORE INTO packages (slug, name, price, description, features, estimated_cogs_low, estimated_cogs_high, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

insertPkg.run('harvest-hello', 'Harvest Hello', 325,
  'A charming seasonal accent — just enough pumpkin joy to make neighbors smile.',
  JSON.stringify(['Curated mix of pumpkins & gourds', 'Carving & decorative varieties', 'Professional arrangement', 'Delivery & installation included', 'Porch protection mat included']),
  115, 150, 1
);

insertPkg.run('sunshine-spread', 'Sunshine Spread', 595,
  'Our signature display — abundant, colorful, and totally Instagrammable.',
  JSON.stringify(['Generous mix of pumpkins, gourds & white pumpkins', 'Hay bale centerpiece', 'Custom color-coordinated arrangement', 'Delivery, install & design consultation', 'Porch protection mat included', 'Photo-ready styling']),
  210, 316, 2
);

insertPkg.run('grand-harvest', 'Grand Harvest', 995,
  'A showstopping statement display with premium & oversized pumpkins.',
  JSON.stringify(['Abundant pumpkins, gourds & specialty varieties', 'Oversized statement pumpkins', 'Hay bales + cornstalks', 'Priority delivery scheduling', 'Custom design consultation included', 'Priority removal scheduling']),
  428, 677, 3
);
console.log('Packages seeded.');

// Seed add-ons
const insertAddon = db.prepare(`
  INSERT OR IGNORE INTO addons (slug, name, price, description, estimated_cogs_low, estimated_cogs_high)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertAddon.run('removal', 'Post-Season Removal & Donation', 85, 'Hassle-free pickup and local donation', 35, 50);
insertAddon.run('cornstalks', 'Cornstalks (Set of 2)', 65, 'Decorative cornstalks', 18, 25);
insertAddon.run('mums', 'Mum Flowers (2 pots)', 55, 'Seasonal mum flowers', 20, 28);
insertAddon.run('photo-session', 'Professional Photo Session', 125, '15-minute session, delivered digitally', 50, 75);
insertAddon.run('business', 'Business Storefront Display', 1500, 'Custom commercial display (minimum)', 750, 1000);
console.log('Add-ons seeded.');

// Seed admin user
const adminEmail = process.env.ADMIN_EMAIL || 'admin@sunshinepumpkins.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123!';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existing) {
  const hash = bcrypt.hashSync(adminPassword, 12);
  db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
    adminEmail, hash, 'Admin', 'admin'
  );
  console.log(`Admin user created: ${adminEmail}`);
} else {
  console.log('Admin user already exists.');
}

// Add referral columns to orders (safe to fail if already exist)
const alterStatements = [
  "ALTER TABLE orders ADD COLUMN referral_partner_id INTEGER",
  "ALTER TABLE orders ADD COLUMN referral_kickback REAL DEFAULT 0",
  "ALTER TABLE orders ADD COLUMN discount_code TEXT",
  "ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0"
];
for (const stmt of alterStatements) {
  try { db.exec(stmt); } catch (e) { /* Column already exists */ }
}
console.log('Order referral columns ensured.');

// Run promo & referral migration
console.log('Running promo & referral migration...');
const promoMigration = fs.readFileSync(path.resolve(__dirname, '..', 'migrations', '002_promo_referrals.sql'), 'utf8');
db.exec(promoMigration);
console.log('Promo & referral tables created.');

console.log('Seed complete.');
process.exit(0);