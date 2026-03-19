const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Order = require('../models/Order');

// GET / — Dashboard
router.get('/', (req, res, next) => {
  try {
    const season = req.query.season || new Date().getFullYear().toString();
    const overview = Analytics.overview(season);
    const recentOrders = Order.recentOrders(10);
    const upcomingInstalls = Order.upcomingInstalls(7);

    res.renderPage('dashboard/index', {
      pageTitle: 'Dashboard',
      overview,
      recentOrders,
      upcomingInstalls,
      season
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
