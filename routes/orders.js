const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Package = require('../models/Package');
const Market = require('../models/Market');
const { requireAdmin } = require('../middleware/auth');

// GET /orders
router.get('/', (req, res, next) => {
  try {
    const { status, package_id, season, delivery_window, page, market } = req.query;
    const marketId = market || '';
    const markets = Market.list();
    const filters = {
      status: status || undefined,
      package_id: package_id || undefined,
      season: season || undefined,
      delivery_window: delivery_window || undefined,
      marketId: marketId || undefined,
      page: parseInt(page) || 1,
      limit: 25
    };

    const result = Order.list(filters);
    const packages = Package.listPackages();

    res.renderPage('orders/list', {
      pageTitle: 'Orders',
      orders: result.data || result,
      total: result.total || 0,
      page: filters.page,
      limit: filters.limit,
      filters: { status, package_id, season, delivery_window },
      packages,
      markets,
      selectedMarket: marketId
    });
  } catch (err) {
    next(err);
  }
});

// GET /orders/:id
router.get('/:id', (req, res, next) => {
  try {
    const order = Order.findById(req.params.id);
    if (!order) {
      req.session.flash = { type: 'danger', message: 'Order not found.' };
      return res.redirect('/orders');
    }

    const packages = Package.listPackages();

    res.renderPage('orders/detail', {
      pageTitle: `Order #${order.id}`,
      order,
      packages
    });
  } catch (err) {
    next(err);
  }
});

// POST /orders/:id/status
router.post('/:id/status', (req, res, next) => {
  try {
    const { newStatus, note } = req.body;
    Order.updateStatus(req.params.id, newStatus, req.session.userId, note || '');
    req.session.flash = { type: 'success', message: `Order status updated to ${newStatus}.` };
  } catch (err) {
    console.error('Status update error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to update status.' };
  }
  res.redirect(`/orders/${req.params.id}`);
});

// POST /orders/:id/notes
router.post('/:id/notes', (req, res, next) => {
  try {
    const { note } = req.body;
    if (note && note.trim()) {
      Order.addNote(req.params.id, req.session.userId, note.trim());
      req.session.flash = { type: 'success', message: 'Note added.' };
    }
  } catch (err) {
    console.error('Add note error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to add note.' };
  }
  res.redirect(`/orders/${req.params.id}`);
});

// GET /orders/:id/edit
router.get('/:id/edit', requireAdmin, (req, res, next) => {
  try {
    const order = Order.findById(req.params.id);
    if (!order) {
      req.session.flash = { type: 'danger', message: 'Order not found.' };
      return res.redirect('/orders');
    }

    const packages = Package.listPackages();
    const addons = Package.listAddons();

    res.renderPage('orders/edit', {
      pageTitle: `Edit Order #${order.id}`,
      order,
      packages,
      addons
    });
  } catch (err) {
    next(err);
  }
});

// POST /orders/:id/edit
router.post('/:id/edit', requireAdmin, (req, res, next) => {
  try {
    const amendments = req.body;
    Order.amend(req.params.id, amendments);
    Order.addNote(req.params.id, req.session.userId, 'Order amended by admin.');
    req.session.flash = { type: 'success', message: 'Order updated successfully.' };
    res.redirect(`/orders/${req.params.id}`);
  } catch (err) {
    console.error('Order amend error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to update order.' };
    res.redirect(`/orders/${req.params.id}/edit`);
  }
});

// POST /orders/:id/cancel
router.post('/:id/cancel', requireAdmin, (req, res, next) => {
  try {
    const { reason } = req.body;
    Order.updateStatus(req.params.id, 'cancelled', req.session.userId, reason || 'Cancelled by admin.');
    req.session.flash = { type: 'success', message: 'Order cancelled.' };
  } catch (err) {
    console.error('Cancel error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to cancel order.' };
  }
  res.redirect(`/orders/${req.params.id}`);
});

module.exports = router;
