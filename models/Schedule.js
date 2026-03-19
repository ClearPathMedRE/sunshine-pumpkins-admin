const db = require('../config/database');

const Schedule = {
  getEvents(startDate, endDate, marketId = null) {
    let conditions = ['s.scheduled_date BETWEEN ? AND ?'];
    let params = [startDate, endDate];

    if (marketId) {
      conditions.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    return db.prepare(`
      SELECT s.*, o.id as order_id, o.package_name, o.status as order_status,
        c.first_name, c.last_name, c.address
      FROM schedule_assignments s
      JOIN orders o ON s.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY s.scheduled_date
    `).all(...params);
  },

  getDailySlots(date, marketId = null) {
    let conditions = ['s.scheduled_date = ?'];
    let params = [date];

    if (marketId) {
      conditions.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    return db.prepare(`
      SELECT s.*, o.id as order_id, o.package_name, o.status as order_status,
        c.first_name, c.last_name, c.address, c.phone
      FROM schedule_assignments s
      JOIN orders o ON s.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY s.time_slot
    `).all(...params);
  },

  assign({ order_id, assigned_to, scheduled_date, time_slot, notes }) {
    const result = db.prepare(`
      INSERT INTO schedule_assignments (order_id, assigned_to, scheduled_date, time_slot, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(order_id, assigned_to || '', scheduled_date, time_slot || 'morning', notes || '');
    return result.lastInsertRowid;
  },

  markComplete(id) {
    db.prepare("UPDATE schedule_assignments SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(id);
  },

  unscheduledOrders(marketId = null) {
    let conditions = [
      "o.status IN ('booked', 'photo_requested', 'design_prep', 'scheduled')",
      "o.id NOT IN (SELECT order_id FROM schedule_assignments WHERE status != 'cancelled')"
    ];
    let params = [];

    if (marketId) {
      conditions.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    return db.prepare(`
      SELECT o.*, c.first_name, c.last_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ORDER BY o.created_at
    `).all(...params);
  }
};

module.exports = Schedule;
