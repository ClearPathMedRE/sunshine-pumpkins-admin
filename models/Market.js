const db = require('../config/database');

class Market {
  /**
   * Get all active markets (for dropdowns)
   */
  static list() {
    return db.prepare('SELECT * FROM markets WHERE active = 1 ORDER BY name').all();
  }

  /**
   * Find a market by ID
   */
  static findById(id) {
    return db.prepare('SELECT * FROM markets WHERE id = ?').get(id);
  }

  /**
   * Find a market by slug
   */
  static findBySlug(slug) {
    return db.prepare('SELECT * FROM markets WHERE slug = ?').get(slug);
  }

  /**
   * Resolve which market a customer belongs to based on ZIP code.
   * Matches first 3 characters of ZIP against each market's zip_prefixes JSON array.
   * Returns the market_id or null if no match.
   */
  static resolveMarketFromZip(zip) {
    if (!zip || zip.length < 3) return null;

    const prefix = zip.substring(0, 3);
    const markets = db.prepare('SELECT id, zip_prefixes FROM markets WHERE active = 1').all();

    for (const market of markets) {
      const prefixes = JSON.parse(market.zip_prefixes);
      if (prefixes.includes(prefix)) {
        return market.id;
      }
    }

    return null;
  }

  /**
   * Assign a customer to a market
   */
  static assignCustomer(customerId, marketId) {
    return db.prepare('UPDATE customers SET market_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(marketId, customerId);
  }

  /**
   * Auto-assign a customer to a market based on their ZIP code.
   * If no match, defaults to Tampa Bay (id=1).
   */
  static autoAssignCustomer(customerId, zip) {
    const marketId = this.resolveMarketFromZip(zip) || 1; // Default to Tampa Bay
    return this.assignCustomer(customerId, marketId);
  }
}

module.exports = Market;
