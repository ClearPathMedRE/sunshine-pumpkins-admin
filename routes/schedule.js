const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const Order = require('../models/Order');
const Market = require('../models/Market');
const { requireAdmin } = require('../middleware/auth');

// GET /schedule
router.get('/', (req, res, next) => {
  try {
    const marketId = req.query.market || '';
    const markets = Market.list();
    const unscheduledOrders = Schedule.unscheduledOrders();

    res.renderPage('schedule/calendar', {
      pageTitle: 'Schedule',
      unscheduledOrders,
      loadCalendar: true,
      markets,
      selectedMarket: marketId
    });
  } catch (err) {
    next(err);
  }
});

// GET /schedule/api/events — JSON for FullCalendar
router.get('/api/events', (req, res, next) => {
  try {
    const { start, end, market } = req.query;
    const marketId = market || null;
    const events = Schedule.getEvents(start, end, marketId);

    const formatted = events.map(evt => ({
      id: evt.id,
      title: evt.title || `Order #${evt.order_id}`,
      start: evt.start_time || evt.date,
      end: evt.end_time || undefined,
      color: evt.status === 'completed' ? '#28a745' : '#E8621A',
      extendedProps: {
        orderId: evt.order_id,
        status: evt.status,
        crew: evt.crew,
        notes: evt.notes
      }
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// GET /schedule/daily/:date
router.get('/daily/:date', (req, res, next) => {
  try {
    const marketId = req.query.market || null;
    const markets = Market.list();
    const slots = Schedule.getDailySlots(req.params.date, marketId);

    res.renderPage('schedule/daily', {
      pageTitle: `Schedule — ${req.params.date}`,
      date: req.params.date,
      slots,
      markets,
      selectedMarket: marketId || ''
    });
  } catch (err) {
    next(err);
  }
});

// POST /schedule/assign
router.post('/assign', requireAdmin, (req, res, next) => {
  try {
    const { order_id, date, time_slot, crew, notes } = req.body;
    Schedule.assign({ order_id, date, time_slot, crew, notes });

    // Update order status to scheduled if not already
    const order = Order.findById(order_id);
    if (order && order.status !== 'scheduled' && order.status !== 'completed') {
      Order.updateStatus(order_id, 'scheduled', req.session.userId, 'Installation scheduled.');
    }

    req.session.flash = { type: 'success', message: 'Installation scheduled successfully.' };
    res.redirect('/schedule');
  } catch (err) {
    console.error('Schedule assign error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to schedule installation.' };
    res.redirect('/schedule');
  }
});

// POST /schedule/:id/complete
router.post('/:id/complete', (req, res, next) => {
  try {
    Schedule.markComplete(req.params.id);
    req.session.flash = { type: 'success', message: 'Marked as complete.' };
  } catch (err) {
    console.error('Complete error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to mark complete.' };
  }
  res.redirect('/schedule');
});

module.exports = router;
