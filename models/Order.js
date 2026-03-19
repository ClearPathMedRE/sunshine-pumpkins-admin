const db = require('../config/database');

const VALID_TRANSITIONS = {
  booked: ['photo_requested', 'cancelled'],
  photo_requested: ['design_prep', 'cancelled'],
  design_prep: ['scheduled', 'cancelled'],
  scheduled: ['installed', 'cancelled'],
  installed: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

const Order = {
  list({ status, package_id, season, delivery_window, marketId, page = 1, limit = 25 } = {}) {
    let where = [];
    let params = [];

    if (status) { where.push('o.status = ?'); params.push(status); }
    if (package_id) { where.push('o.package_id = ?'); params.push(package_id); }
    if (season) { where.push('o.season = ?'); params.push(season); }
    if (delivery_window) { where.push('o.delivery_window = ?'); params.push(delivery_window); }
    if (marketId) { where.push('c.market_id = ?'); params.push(marketId); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (page - 1) * limit;

    // When marketId is provided, use INNER JOIN to ensure we only count/return orders with matching customers
    const joinType = marketId ? 'JOIN' : 'LEFT JOIN';

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM orders o
      ${joinType} customers c ON o.customer_id = c.id
      ${whereClause}
    `).get(...params).count;

    const rows = db.prepare(`
      SELECT o.*, c.first_name, c.last_name, c.email as customer_email, c.phone as customer_phone
      FROM orders o
      ${joinType} customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { rows, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findById(id) {
    const order = db.prepare(`
      SELECT o.*, c.first_name, c.last_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(id);
    if (!order) return null;

    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY item_type, name').all(id);
    order.notes = db.prepare(`
      SELECT n.*, u.name as user_name FROM order_notes n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.order_id = ? ORDER BY n.created_at DESC
    `).all(id);
    order.status_history = db.prepare(`
      SELECT h.*, u.name as user_name FROM order_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.order_id = ? ORDER BY h.created_at DESC
    `).all(id);
    order.schedule = db.prepare('SELECT * FROM schedule_assignments WHERE order_id = ? ORDER BY scheduled_date').all(id);

    return order;
  },

  create({ customer_id, stripe_session_id, stripe_payment_intent, package_id, package_name, package_price, subtotal, total, delivery_window, season }) {
    const result = db.prepare(`
      INSERT INTO orders (customer_id, stripe_session_id, stripe_payment_intent, package_id, package_name, package_price, subtotal, total, delivery_window, season)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customer_id, stripe_session_id || null, stripe_payment_intent || null, package_id || null, package_name, package_price, subtotal, total, delivery_window || '', season || 2026);

    const orderId = result.lastInsertRowid;

    db.prepare('INSERT INTO order_status_history (order_id, from_status, to_status, note) VALUES (?, NULL, ?, ?)').run(orderId, 'booked', 'Order created');

    return orderId;
  },

  addItem(orderId, { item_type, reference_id, name, price, quantity }) {
    db.prepare('INSERT INTO order_items (order_id, item_type, reference_id, name, price, quantity) VALUES (?, ?, ?, ?, ?, ?)').run(orderId, item_type, reference_id || null, name, price, quantity || 1);
  },

  updateStatus(orderId, newStatus, userId, note) {
    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId);
    if (!order) return false;

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) return false;

    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, orderId);

    if (newStatus === 'cancelled') {
      db.prepare("UPDATE orders SET cancelled_at = datetime('now'), cancel_reason = ? WHERE id = ?").run(note || '', orderId);
    }

    db.prepare('INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?)').run(orderId, order.status, newStatus, userId, note || '');

    return true;
  },

  addNote(orderId, userId, note) {
    db.prepare('INSERT INTO order_notes (order_id, user_id, note) VALUES (?, ?, ?)').run(orderId, userId, note);
  },

  amend(orderId, { package_id, package_name, package_price, total }) {
    db.prepare("UPDATE orders SET package_id=?, package_name=?, package_price=?, total=?, updated_at=datetime('now') WHERE id=?").run(package_id, package_name, package_price, total, orderId);
    // Remove old package item and re-add
    db.prepare("DELETE FROM order_items WHERE order_id = ? AND item_type = 'package'").run(orderId);
    db.prepare("INSERT INTO order_items (order_id, item_type, reference_id, name, price) VALUES (?, 'package', ?, ?, ?)").run(orderId, package_id, package_name, package_price);
  },

  recentOrders(limit = 10, marketId = null) {
    let conditions = [];
    let params = [];

    if (marketId) {
      conditions.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit);

    return db.prepare(`
      SELECT o.*, c.first_name, c.last_name FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.created_at DESC LIMIT ?
    `).all(...params);
  },

  upcomingInstalls(days = 7, marketId = null) {
    let conditions = ["o.status = 'scheduled'", "s.scheduled_date BETWEEN date('now') AND date('now', '+' || ? || ' days')"];
    let params = [days];

    if (marketId) {
      conditions.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    return db.prepare(`
      SELECT o.*, c.first_name, c.last_name, s.scheduled_date, s.time_slot, s.assigned_to
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN schedule_assignments s ON s.order_id = o.id
      ${whereClause}
      ORDER BY s.scheduled_date
    `).all(...params);
  }
};

module.exports = Order;
