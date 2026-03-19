const db = require('../config/database');
const bcrypt = require('bcryptjs');

const User = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  },

  findById(id) {
    return db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(id);
  },

  authenticate(email, password) {
    const user = this.findByEmail(email);
    if (!user) return null;
    if (!bcrypt.compareSync(password, user.password_hash)) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },

  list() {
    return db.prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at').all();
  },

  create(email, password, name, role = 'staff') {
    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(email, hash, name, role);
    return result.lastInsertRowid;
  },

  update(id, { email, name, role }) {
    db.prepare('UPDATE users SET email = ?, name = ?, role = ?, updated_at = datetime(\'now\') WHERE id = ?').run(email, name, role, id);
  },

  updatePassword(id, password) {
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, id);
  }
};

module.exports = User;