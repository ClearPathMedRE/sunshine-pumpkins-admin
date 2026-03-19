const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Market = require('../models/Market');
const { requireAdmin } = require('../middleware/auth');

// GET /customers
router.get('/', (req, res, next) => {
  try {
    const { search, tag, page, market } = req.query;
    const marketId = market || '';
    const markets = Market.list();
    const filters = {
      search: search || undefined,
      tag: tag || undefined,
      marketId: marketId || undefined,
      page: parseInt(page) || 1,
      limit: 25
    };

    const result = Customer.list(filters);
    const tags = Customer.allTags();

    res.renderPage('customers/list', {
      pageTitle: 'Customers',
      customers: result.data || result,
      total: result.total || 0,
      page: filters.page,
      limit: filters.limit,
      filters: { search, tag },
      tags,
      markets,
      selectedMarket: marketId
    });
  } catch (err) {
    next(err);
  }
});

// GET /customers/export
router.get('/export', requireAdmin, (req, res, next) => {
  try {
    const csvData = Customer.exportCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customers-export.csv"');
    res.send(csvData);
  } catch (err) {
    next(err);
  }
});

// GET /customers/new
router.get('/new', requireAdmin, (req, res, next) => {
  try {
    const markets = Market.list();
    res.renderPage('customers/edit', {
      pageTitle: 'New Customer',
      customer: null,
      markets,
      selectedMarket: ''
    });
  } catch (err) {
    next(err);
  }
});

// POST /customers
router.post('/', requireAdmin, (req, res, next) => {
  try {
    const { email, name, phone, address_line1, address_line2, city, state, zip, notes, market_id } = req.body;
    const customer = Customer.create({
      email, name, phone,
      address_line1, address_line2, city, state, zip,
      notes, market_id: market_id || undefined
    });
    req.session.flash = { type: 'success', message: 'Customer created successfully.' };
    res.redirect(`/customers/${customer.id}`);
  } catch (err) {
    console.error('Customer create error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to create customer.' };
    res.redirect('/customers/new');
  }
});

// GET /customers/:id
router.get('/:id', (req, res, next) => {
  try {
    const customer = Customer.findById(req.params.id);
    if (!customer) {
      req.session.flash = { type: 'danger', message: 'Customer not found.' };
      return res.redirect('/customers');
    }

    const markets = Market.list();

    res.renderPage('customers/detail', {
      pageTitle: customer.name || customer.email,
      customer,
      markets,
      selectedMarket: ''
    });
  } catch (err) {
    next(err);
  }
});

// GET /customers/:id/edit
router.get('/:id/edit', requireAdmin, (req, res, next) => {
  try {
    const customer = Customer.findById(req.params.id);
    if (!customer) {
      req.session.flash = { type: 'danger', message: 'Customer not found.' };
      return res.redirect('/customers');
    }

    const markets = Market.list();

    res.renderPage('customers/edit', {
      pageTitle: `Edit ${customer.name || customer.email}`,
      customer,
      markets,
      selectedMarket: customer.market_id || ''
    });
  } catch (err) {
    next(err);
  }
});

// POST /customers/:id
router.post('/:id', requireAdmin, (req, res, next) => {
  try {
    const { email, name, phone, address_line1, address_line2, city, state, zip, notes, market_id } = req.body;
    Customer.update(req.params.id, {
      email, name, phone,
      address_line1, address_line2, city, state, zip,
      notes, market_id: market_id || undefined
    });
    req.session.flash = { type: 'success', message: 'Customer updated successfully.' };
    res.redirect(`/customers/${req.params.id}`);
  } catch (err) {
    console.error('Customer update error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to update customer.' };
    res.redirect(`/customers/${req.params.id}/edit`);
  }
});

// POST /customers/:id/tags
router.post('/:id/tags', requireAdmin, (req, res, next) => {
  try {
    const { action, tag } = req.body;
    if (action === 'add' && tag) {
      Customer.addTag(req.params.id, tag.trim());
      req.session.flash = { type: 'success', message: `Tag "${tag}" added.` };
    } else if (action === 'remove' && tag) {
      Customer.removeTag(req.params.id, tag.trim());
      req.session.flash = { type: 'success', message: `Tag "${tag}" removed.` };
    }
  } catch (err) {
    console.error('Tag error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to update tags.' };
  }
  res.redirect(`/customers/${req.params.id}`);
});

module.exports = router;
