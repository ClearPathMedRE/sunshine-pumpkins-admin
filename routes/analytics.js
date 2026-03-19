const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const { requireAdmin } = require('../middleware/auth');

// GET /analytics
router.get('/', requireAdmin, (req, res, next) => {
  try {
    const season = req.query.season || new Date().getFullYear().toString();

    const overview = Analytics.overview(season);
    const revenueByPackage = Analytics.revenueByPackage(season);
    const revenueByMonth = Analytics.revenueByMonth(season);
    const addonAttachRates = Analytics.addonAttachRates(season);
    const sourceBreakdown = Analytics.sourceBreakdown(season);

    res.renderPage('analytics/index', {
      pageTitle: 'Analytics',
      season,
      overview: JSON.stringify(overview),
      revenueByPackage: JSON.stringify(revenueByPackage),
      revenueByMonth: JSON.stringify(revenueByMonth),
      addonAttachRates: JSON.stringify(addonAttachRates),
      sourceBreakdown: JSON.stringify(sourceBreakdown)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
