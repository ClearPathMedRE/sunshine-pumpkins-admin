const db = require('../config/database');

const Email = {
  log({ customer_id, order_id, template, subject, recipient_email, sent_by, status, error_message }) {
    db.prepare(`
      INSERT INTO email_log (customer_id, order_id, template, subject, recipient_email, sent_by, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customer_id || null, order_id || null, template, subject, recipient_email, sent_by || null, status || 'sent', error_message || null);
  },

  getLog({ customer_id, order_id, marketId, page = 1, limit = 50 } = {}) {
    let where = [];
    let params = [];
    if (customer_id) { where.push('e.customer_id = ?'); params.push(customer_id); }
    if (order_id) { where.push('e.order_id = ?'); params.push(order_id); }
    if (marketId) { where.push('c.market_id = ?'); params.push(marketId); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM email_log e
      LEFT JOIN customers c ON e.customer_id = c.id
      ${whereClause}
    `).get(...params).count;

    const rows = db.prepare(`
      SELECT e.*, u.name as sent_by_name, c.first_name, c.last_name
      FROM email_log e
      LEFT JOIN users u ON e.sent_by = u.id
      LEFT JOIN customers c ON e.customer_id = c.id
      ${whereClause}
      ORDER BY e.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { rows, total, page, limit, pages: Math.ceil(total / limit) };
  }
};

module.exports = Email;
