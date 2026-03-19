const db = require('../config/database');

const DiscountCode = {
  list() {
    return db.prepare('SELECT * FROM discount_codes ORDER BY created_at DESC').all();
  },

  findByCode(code) {
    return db.prepare(`
      SELECT * FROM discount_codes
      WHERE code = ? AND active = 1
        AND (expires_at IS NULL OR expires_at >= date('now'))
        AND (max_uses IS NULL OR times_used < max_uses)
    `).get(code);
  },

  findById(id) {
    return db.prepare('SELECT * FROM discount_codes WHERE id = ?').get(id);
  },

  create({ code, discount_type, discount_value, description, expires_at, max_uses }) {
    const result = db.prepare(`
      INSERT INTO discount_codes (code, discount_type, discount_value, description, expires_at, max_uses)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      code.toUpperCase(),
      discount_type || 'fixed',
      discount_value || 0,
      description || null,
      expires_at || null,
      max_uses || null
    );
    return result.lastInsertRowid;
  },

  update(id, fields) {
    const allowed = ['code', 'discount_type', 'discount_value', 'description', 'expires_at', 'max_uses', 'active'];
    const sets = [];
    const params = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        sets.push(`${key} = ?`);
        params.push(key === 'code' ? value.toUpperCase() : value);
      }
    }

    if (sets.length === 0) return;
    params.push(id);
    db.prepare(`UPDATE discount_codes SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  },

  incrementUsage(id) {
    db.prepare('UPDATE discount_codes SET times_used = times_used + 1 WHERE id = ?').run(id);
  },

  deactivate(id) {
    db.prepare('UPDATE discount_codes SET active = 0 WHERE id = ?').run(id);
  }
};

module.exports = DiscountCode;
