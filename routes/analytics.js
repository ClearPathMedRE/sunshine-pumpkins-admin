const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Market = require('../models/Market');
const { requireAdmin } = require('../middleware/auth');

// GET /analytics
router.get('/', requireAdmin, (req, res, next) => {
  try {
    const season = req.query.season || new Date().getFullYear().toString();
    const marketId = req.query.market || '';
    const markets = Market.list();

    const overview = Analytics.overview(season, marketId || null);
    const revenueByPackage = Analytics.revenueByPackage(season, marketId || null);
    const revenueByMonth = Analytics.revenueByMonth(season, marketId || null);
    const addonAttachRates = Analytics.addonAttachRates(season, marketId || null);
    const sourceBreakdown = Analytics.sourceBreakdown(season, marketId || null);
    const revenueByMarket = Analytics.revenueByMarket(season);

    res.renderPage('analytics/index', {
      pageTitle: 'Analytics',
      season,
      overview: JSON.stringify(overview),
      revenueByPackage: JSON.stringify(revenueByPackage),
      revenueByMonth: JSON.stringify(revenueByMonth),
      addonAttachRates: JSON.stringify(addonAttachRates),
      sourceBreakdown: JSON.stringify(sourceBreakdown),
      revenueByMarket: JSON.stringify(revenueByMarket),
      markets,
      selectedMarket: marketId
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
