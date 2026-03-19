const db = require('../config/database');

const Schedule = {
  getEvents(startDate, endDate) {
    return db.prepare(`
      SELECT s.*, o.id as order_id, o.package_name, o.status as order_status,
        c.first_name, c.last_name, c.address
      FROM schedule_assignments s
      JOIN orders o ON s.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE s.scheduled_date BETWEEN ? AND ?
      ORDER BY s.scheduled_date
    `).all(startDate, endDate);
  },

  getDailySlots(date) {
    return db.prepare(`
      SELECT s.*, o.id as order_id, o.package_name, o.status as order_status,
        c.first_name, c.last_name, c.address, c.phone
      FROM schedule_assignments s
      JOIN orders o ON s.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE s.scheduled_date = ?
      ORDER BY s.time_slot
    `).all(date);
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

  unscheduledOrders() {
    return db.prepare(`
      SELECT o.*, c.first_name, c.last_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.status IN ('booked', 'photo_requested', 'design_prep', 'scheduled')
        AND o.id NOT IN (SELECT order_id FROM schedule_assignments WHERE status != 'cancelled')
      ORDER BY o.created_at
    `).all();
  }
};

module.exports = Schedule;