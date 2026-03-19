const db = require('../config/database');
const Market = require('./Market');

const Customer = {
  list({ search, tag, marketId, page = 1, limit = 25 } = {}) {
    let where = [];
    let params = [];

    if (search) {
      where.push("(c.first_name || ' ' || COALESCE(c.last_name,'') LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (tag) {
      where.push('EXISTS (SELECT 1 FROM customer_tags ct WHERE ct.customer_id = c.id AND ct.tag = ?)');
      params.push(tag);
    }

    if (marketId) {
      where.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const total = db.prepare(`SELECT COUNT(*) as count FROM customers c ${whereClause}`).get(...params).count;
    const rows = db.prepare(`
      SELECT c.*, m.name as market_name,
        (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as order_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE customer_id = c.id AND status != 'cancelled') as total_spend
      FROM customers c
      LEFT JOIN markets m ON c.market_id = m.id
      ${whereClause}
      ORDER BY c.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { rows, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findById(id) {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) return null;
    customer.tags = db.prepare('SELECT tag FROM customer_tags WHERE customer_id = ?').all(id).map(r => r.tag);
    customer.orders = db.prepare(`
      SELECT o.*, p.name as pkg_name FROM orders o
      LEFT JOIN packages p ON o.package_id = p.id
      WHERE o.customer_id = ? ORDER BY o.created_at DESC
    `).all(id);
    customer.total_spend = db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE customer_id = ? AND status != 'cancelled'").get(id).total;
    customer.email_log = db.prepare('SELECT * FROM email_log WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20').all(id);
    return customer;
  },

  findByEmail(email) {
    return db.prepare('SELECT * FROM customers WHERE email = ?').get(email);
  },

  findOrCreate({ email, first_name, last_name, phone, address, city, state, zip, source }) {
    let customer = this.findByEmail(email);
    if (customer) return customer;
    const result = db.prepare(`
      INSERT INTO customers (email, first_name, last_name, phone, address, city, state, zip, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(email, first_name, last_name || '', phone || '', address || '', city || 'St. Petersburg', state || 'FL', zip || '', source || 'stripe');
    const id = result.lastInsertRowid;
    Market.autoAssignCustomer(id, zip || '');
    return this.findById(id);
  },

  create({ first_name, last_name, email, phone, address, city, state, zip, neighborhood, source, notes }) {
    const result = db.prepare(`
      INSERT INTO customers (first_name, last_name, email, phone, address, city, state, zip, neighborhood, source, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(first_name, last_name || '', email || null, phone || '', address || '', city || 'St. Petersburg', state || 'FL', zip || '', neighborhood || '', source || 'manual', notes || '');
    const id = result.lastInsertRowid;
    Market.autoAssignCustomer(id, zip || '');
    return id;
  },

  update(id, fields) {
    // Check if market_id is explicitly provided
    if (fields.market_id !== undefined) {
      db.prepare(`
        UPDATE customers SET first_name=?, last_name=?, email=?, phone=?, address=?, city=?, state=?, zip=?, neighborhood=?, source=?, notes=?, market_id=?, updated_at=datetime('now')
        WHERE id=?
      `).run(fields.first_name, fields.last_name || '', fields.email || null, fields.phone || '', fields.address || '', fields.city || '', fields.state || '', fields.zip || '', fields.neighborhood || '', fields.source || '', fields.notes || '', fields.market_id, id);
    } else {
      // Fetch old ZIP before updating so we can detect changes
      const oldRecord = fields.zip ? db.prepare('SELECT zip FROM customers WHERE id = ?').get(id) : null;

      db.prepare(`
        UPDATE customers SET first_name=?, last_name=?, email=?, phone=?, address=?, city=?, state=?, zip=?, neighborhood=?, source=?, notes=?, updated_at=datetime('now')
        WHERE id=?
      `).run(fields.first_name, fields.last_name || '', fields.email || null, fields.phone || '', fields.address || '', fields.city || '', fields.state || '', fields.zip || '', fields.neighborhood || '', fields.source || '', fields.notes || '', id);

      // If ZIP changed and no explicit market_id, re-run auto-assign
      if (fields.zip && oldRecord && oldRecord.zip !== fields.zip) {
        Market.autoAssignCustomer(id, fields.zip);
      }
    }
  },

  addTag(customerId, tag) {
    db.prepare('INSERT OR IGNORE INTO customer_tags (customer_id, tag) VALUES (?, ?)').run(customerId, tag);
  },

  removeTag(customerId, tag) {
    db.prepare('DELETE FROM customer_tags WHERE customer_id = ? AND tag = ?').run(customerId, tag);
  },

  allTags() {
    return db.prepare('SELECT DISTINCT tag FROM customer_tags ORDER BY tag').all().map(r => r.tag);
  },

  exportCSV() {
    return db.prepare(`
      SELECT c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.state, c.zip, c.neighborhood, c.source,
        m.name as market_name,
        (SELECT GROUP_CONCAT(tag, ', ') FROM customer_tags WHERE customer_id = c.id) as tags,
        (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as order_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE customer_id = c.id AND status != 'cancelled') as total_spend,
        (SELECT MIN(created_at) FROM orders WHERE customer_id = c.id) as first_order,
        (SELECT MAX(created_at) FROM orders WHERE customer_id = c.id) as last_order
      FROM customers c
      LEFT JOIN markets m ON c.market_id = m.id
      ORDER BY c.last_name, c.first_name
    `).all();
  }
};

module.exports = Customer;
