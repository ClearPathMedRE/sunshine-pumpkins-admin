const db = require('../config/database');

const Analytics = {
  overview(season = 2026, marketId = null) {
    let joins = '';
    let conditions = ["o.status != 'cancelled'", 'o.season = ?'];
    let params = [season];

    if (marketId) {
      joins = 'JOIN customers c ON o.customer_id = c.id';
      conditions.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const totals = db.prepare(`
      SELECT COUNT(*) as order_count, COALESCE(SUM(o.total), 0) as revenue
      FROM orders o ${joins} ${whereClause}
    `).get(...params);

    const byStatus = db.prepare(`
      SELECT o.status, COUNT(*) as count FROM orders o ${joins} ${whereClause} GROUP BY o.status ORDER BY
      CASE o.status WHEN 'booked' THEN 1 WHEN 'photo_requested' THEN 2 WHEN 'design_prep' THEN 3
      WHEN 'scheduled' THEN 4 WHEN 'installed' THEN 5 WHEN 'completed' THEN 6 WHEN 'cancelled' THEN 7 END
    `).all(...params);

    const avgOrderValue = db.prepare(`SELECT AVG(o.total) as aov FROM orders o ${joins} WHERE o.status != 'cancelled' AND o.season = ?${marketId ? ' AND c.market_id = ?' : ''}`).get(...params).aov || 0;

    const customerCount = db.prepare(`SELECT COUNT(DISTINCT o.customer_id) as count FROM orders o ${joins} WHERE o.season = ?${marketId ? ' AND c.market_id = ?' : ''}`).get(...params).count;

    return { ...totals, byStatus, avgOrderValue, customerCount };
  },

  revenueByPackage(season = 2026, marketId = null) {
    let joins = '';
    let conditions = ["o.status != 'cancelled'", 'o.season = ?'];
    let params = [season];

    if (marketId) {
      joins = 'JOIN customers c ON o.customer_id = c.id';
      conditions.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    return db.prepare(`
      SELECT o.package_name, COUNT(*) as count, SUM(o.total) as revenue
      FROM orders o ${joins} ${whereClause}
      GROUP BY o.package_name ORDER BY revenue DESC
    `).all(...params);
  },

  revenueByMonth(season = 2026, marketId = null) {
    let joins = '';
    let conditions = ["o.status != 'cancelled'", 'o.season = ?'];
    let params = [season];

    if (marketId) {
      joins = 'JOIN customers c ON o.customer_id = c.id';
      conditions.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    return db.prepare(`
      SELECT strftime('%Y-%m', o.created_at) as month, SUM(o.total) as revenue, COUNT(*) as count
      FROM orders o ${joins} ${whereClause}
      GROUP BY month ORDER BY month
    `).all(...params);
  },

  addonAttachRates(season = 2026, marketId = null) {
    let joins = '';
    let conditions = ["o.status != 'cancelled'", 'o.season = ?'];
    let params = [season];

    if (marketId) {
      joins = 'JOIN customers c ON o.customer_id = c.id';
      conditions.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const totalOrders = db.prepare(`SELECT COUNT(*) as count FROM orders o ${joins} ${whereClause}`).get(...params).count || 1;

    const addons = db.prepare(`
      SELECT oi.name, COUNT(*) as count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      ${marketId ? 'JOIN customers c ON o.customer_id = c.id' : ''}
      WHERE oi.item_type = 'addon' AND o.status != 'cancelled' AND o.season = ?${marketId ? ' AND c.market_id = ?' : ''}
      GROUP BY oi.name ORDER BY count DESC
    `).all(...params);

    return addons.map(a => ({ ...a, rate: ((a.count / totalOrders) * 100).toFixed(1) }));
  },

  sourceBreakdown(season = 2026, marketId = null) {
    let conditions = ["o.status != 'cancelled'", 'o.season = ?'];
    let params = [season];

    if (marketId) {
      conditions.push('c.market_id = ?');
      params.push(marketId);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    return db.prepare(`
      SELECT COALESCE(c.source, 'unknown') as source, COUNT(*) as count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      GROUP BY c.source ORDER BY count DESC
    `).all(...params);
  },

  revenueByMarket(season = 2026) {
    return db.prepare(`
      SELECT m.name as market_name, m.id as market_id,
        COUNT(*) as order_count, COALESCE(SUM(o.total), 0) as revenue,
        AVG(o.total) as avg_order_value
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN markets m ON c.market_id = m.id
      WHERE o.status != 'cancelled' AND o.season = ?
      GROUP BY c.market_id
      ORDER BY revenue DESC
    `).all(season);
  }
};

module.exports = Analytics;
