const db = require('../config/database');

const Package = {
  listPackages() {
    return db.prepare('SELECT * FROM packages ORDER BY sort_order').all();
  },

  listAddons() {
    return db.prepare('SELECT * FROM addons ORDER BY name').all();
  },

  findPackageById(id) {
    return db.prepare('SELECT * FROM packages WHERE id = ?').get(id);
  },

  findPackageBySlug(slug) {
    return db.prepare('SELECT * FROM packages WHERE slug = ?').get(slug);
  },

  findAddonById(id) {
    return db.prepare('SELECT * FROM addons WHERE id = ?').get(id);
  },

  updatePackage(id, { name, price, description, features, estimated_cogs_low, estimated_cogs_high }) {
    db.prepare(`
      UPDATE packages SET name=?, price=?, description=?, features=?, estimated_cogs_low=?, estimated_cogs_high=?, updated_at=datetime('now')
      WHERE id=?
    `).run(name, price, description, features, estimated_cogs_low, estimated_cogs_high, id);
  },

  updateAddon(id, { name, price, description, estimated_cogs_low, estimated_cogs_high }) {
    db.prepare(`
      UPDATE addons SET name=?, price=?, description=?, estimated_cogs_low=?, estimated_cogs_high=?, updated_at=datetime('now')
      WHERE id=?
    `).run(name, price, description, estimated_cogs_low, estimated_cogs_high, id);
  }
};

module.exports = Package;