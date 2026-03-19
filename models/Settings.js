const db = require('../config/database');

const Settings = {
  get(key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },

  set(key, value) {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(key, value);
  },

  isPromoEnabled() {
    const val = Settings.get('promo_pricing_enabled');
    return val === 'true' || val === '1';
  },

  getPromoEndDate() {
    return Settings.get('promo_end_date');
  }
};

module.exports = Settings;
