const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Order = require('../models/Order');
const Market = require('../models/Market');

// GET / — Dashboard
router.get('/', (req, res, next) => {
  try {
    const season = req.query.season || new Date().getFullYear().toString();
    const marketId = req.query.market || '';
    const markets = Market.list();
    const overview = Analytics.overview(season, marketId || null);
    const recentOrders = Order.recentOrders(10, marketId || null);
    const upcomingInstalls = Order.upcomingInstalls(7, marketId || null);

    res.renderPage('dashboard/index', {
      pageTitle: 'Dashboard',
      overview,
      recentOrders,
      upcomingInstalls,
      season,
      markets,
      selectedMarket: marketId
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
