const db = require('../config/database');

const Analytics = {
  overview(season = 2026) {
    const totals = db.prepare(`
      SELECT COUNT(*) as order_count, COALESCE(SUM(total), 0) as revenue
      FROM orders WHERE status != 'cancelled' AND season = ?
    `).get(season);

    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM orders WHERE season = ? GROUP BY status ORDER BY
      CASE status WHEN 'booked' THEN 1 WHEN 'photo_requested' THEN 2 WHEN 'design_prep' THEN 3
      WHEN 'scheduled' THEN 4 WHEN 'installed' THEN 5 WHEN 'completed' THEN 6 WHEN 'cancelled' THEN 7 END
    `).all(season);

    const avgOrderValue = db.prepare("SELECT AVG(total) as aov FROM orders WHERE status != 'cancelled' AND season = ?").get(season).aov || 0;

    const customerCount = db.prepare('SELECT COUNT(DISTINCT customer_id) as count FROM orders WHERE season = ?').get(season).count;

    return { ...totals, byStatus, avgOrderValue, customerCount };
  },

  revenueByPackage(season = 2026) {
    return db.prepare(`
      SELECT package_name, COUNT(*) as count, SUM(total) as revenue
      FROM orders WHERE status != 'cancelled' AND season = ?
      GROUP BY package_name ORDER BY revenue DESC
    `).all(season);
  },

  revenueByMonth(season = 2026) {
    return db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, SUM(total) as revenue, COUNT(*) as count
      FROM orders WHERE status != 'cancelled' AND season = ?
      GROUP BY month ORDER BY month
    `).all(season);
  },

  addonAttachRates(season = 2026) {
    const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status != 'cancelled' AND season = ?").get(season).count || 1;
    const addons = db.prepare(`
      SELECT oi.name, COUNT(*) as count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.item_type = 'addon' AND o.status != 'cancelled' AND o.season = ?
      GROUP BY oi.name ORDER BY count DESC
    `).all(season);

    return addons.map(a => ({ ...a, rate: ((a.count / totalOrders) * 100).toFixed(1) }));
  },

  sourceBreakdown(season = 2026) {
    return db.prepare(`
      SELECT COALESCE(c.source, 'unknown') as source, COUNT(*) as count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.status != 'cancelled' AND o.season = ?
      GROUP BY c.source ORDER BY count DESC
    `).all(season);
  }
};

module.exports = Analytics;