const db = require('../config/database');

const ReferralPartner = {
  list({ status, page = 1, limit = 25 } = {}) {
    let where = [];
    let params = [];

    if (status) { where.push('rp.status = ?'); params.push(status); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const total = db.prepare(`SELECT COUNT(*) as count FROM referral_partners rp ${whereClause}`).get(...params).count;

    const rows = db.prepare(`
      SELECT rp.*,
        (SELECT COUNT(*) FROM orders o WHERE o.referral_partner_id = rp.id) as total_referrals,
        (SELECT COALESCE(SUM(rp2.amount), 0) FROM referral_payouts rp2 WHERE rp2.partner_id = rp.id AND rp2.status = 'paid') as total_earned,
        (SELECT COALESCE(SUM(rp2.amount), 0) FROM referral_payouts rp2 WHERE rp2.partner_id = rp.id AND rp2.status = 'pending') as pending_kickbacks
      FROM referral_partners rp
      ${whereClause}
      ORDER BY rp.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return { rows, total, page, limit, pages: Math.ceil(total / limit) };
  },

  findById(id) {
    const partner = db.prepare('SELECT * FROM referral_partners WHERE id = ?').get(id);
    if (!partner) return null;

    partner.orders = db.prepare(`
      SELECT o.id, o.package_name, o.total, o.created_at, o.referral_kickback,
        c.first_name, c.last_name,
        (SELECT rp2.status FROM referral_payouts rp2 WHERE rp2.order_id = o.id AND rp2.partner_id = ? LIMIT 1) as payout_status
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.referral_partner_id = ?
      ORDER BY o.created_at DESC
    `).all(id, id);

    partner.payouts = db.prepare(`
      SELECT rp.*, o.package_name, c.first_name, c.last_name
      FROM referral_payouts rp
      LEFT JOIN orders o ON rp.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE rp.partner_id = ?
      ORDER BY rp.created_at DESC
    `).all(id);

    partner.stats = {
      total_referrals: partner.orders.length,
      total_earned: partner.payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
      total_pending: partner.payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
      total_paid: partner.payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
    };

    return partner;
  },

  findByCode(referralCode) {
    return db.prepare("SELECT * FROM referral_partners WHERE referral_code = ? AND status = 'active'").get(referralCode);
  },

  create({ name, email, phone, company, partner_type, referral_code, kickback_hello, kickback_spread, kickback_harvest, notes }) {
    const result = db.prepare(`
      INSERT INTO referral_partners (name, email, phone, company, partner_type, referral_code, kickback_hello, kickback_spread, kickback_harvest, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      email || null,
      phone || null,
      company || null,
      partner_type || 'individual',
      referral_code,
      kickback_hello != null ? kickback_hello : 25,
      kickback_spread != null ? kickback_spread : 50,
      kickback_harvest != null ? kickback_harvest : 100,
      notes || null
    );
    return result.lastInsertRowid;
  },

  update(id, fields) {
    const allowed = ['name', 'email', 'phone', 'company', 'partner_type', 'referral_code', 'kickback_hello', 'kickback_spread', 'kickback_harvest', 'status', 'notes'];
    const sets = [];
    const params = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        sets.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (sets.length === 0) return;
    sets.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE referral_partners SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  },

  generateCode(name) {
    const base = name.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 6);
    let code = base;
    let suffix = 1;
    while (db.prepare('SELECT id FROM referral_partners WHERE referral_code = ?').get(code)) {
      code = base + suffix;
      suffix++;
    }
    return code;
  },

  getStats() {
    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM referral_partners) as total_partners,
        (SELECT COUNT(*) FROM orders WHERE referral_partner_id IS NOT NULL) as total_referrals,
        (SELECT COALESCE(SUM(amount), 0) FROM referral_payouts WHERE status = 'paid') as total_kickbacks,
        (SELECT COALESCE(SUM(amount), 0) FROM referral_payouts WHERE status = 'pending') as pending_payouts
    `).get();
    return stats;
  },

  getPendingPayouts() {
    return db.prepare(`
      SELECT rp.*, p.name as partner_name, p.email as partner_email,
        o.id as order_id, o.package_name, o.total as order_total, o.created_at as order_date,
        c.first_name, c.last_name
      FROM referral_payouts rp
      JOIN referral_partners p ON rp.partner_id = p.id
      LEFT JOIN orders o ON rp.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE rp.status = 'pending'
      ORDER BY rp.created_at ASC
    `).all();
  },

  markPaid(payoutId) {
    db.prepare("UPDATE referral_payouts SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(payoutId);
  }
};

module.exports = ReferralPartner;
