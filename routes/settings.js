const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const DiscountCode = require('../models/DiscountCode');
const { requireAdmin } = require('../middleware/auth');

// All settings routes require admin
router.use(requireAdmin);

// GET /settings
router.get('/', (req, res, next) => {
  try {
    const promoEnabled = Settings.isPromoEnabled();
    const promoEndDate = Settings.getPromoEndDate();
    const codes = DiscountCode.list();

    res.renderPage('settings/index', {
      pageTitle: 'Settings',
      promoEnabled,
      promoEndDate,
      codes
    });
  } catch (err) {
    next(err);
  }
});

// POST /settings/promo
router.post('/promo', (req, res, next) => {
  try {
    const { promo_enabled, promo_end_date } = req.body;
    Settings.set('promo_pricing_enabled', promo_enabled === 'on' || promo_enabled === 'true' ? 'true' : 'false');
    if (promo_end_date) {
      Settings.set('promo_end_date', promo_end_date);
    }
    req.session.flash = { type: 'success', message: 'Promo settings updated.' };
    res.redirect('/settings');
  } catch (err) {
    next(err);
  }
});

// GET /settings/codes/new
router.get('/codes/new', (req, res, next) => {
  try {
    res.renderPage('settings/code-edit', {
      pageTitle: 'New Discount Code',
      code: null
    });
  } catch (err) {
    next(err);
  }
});

// POST /settings/codes
router.post('/codes', (req, res, next) => {
  try {
    const { code, discount_type, discount_value, description, expires_at, max_uses } = req.body;
    DiscountCode.create({
      code,
      discount_type,
      discount_value: parseFloat(discount_value) || 0,
      description,
      expires_at: expires_at || null,
      max_uses: max_uses ? parseInt(max_uses) : null
    });
    req.session.flash = { type: 'success', message: 'Discount code created.' };
    res.redirect('/settings');
  } catch (err) {
    console.error('Discount code create error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to create discount code.' };
    res.redirect('/settings/codes/new');
  }
});

// POST /settings/codes/:id/toggle
router.post('/codes/:id/toggle', (req, res, next) => {
  try {
    const code = DiscountCode.findById(req.params.id);
    if (code) {
      DiscountCode.update(req.params.id, { active: code.active ? 0 : 1 });
      req.session.flash = { type: 'success', message: `Code ${code.active ? 'deactivated' : 'activated'}.` };
    }
    res.redirect('/settings');
  } catch (err) {
    next(err);
  }
});

// GET /settings/codes/:id/edit
router.get('/codes/:id/edit', (req, res, next) => {
  try {
    const code = DiscountCode.findById(req.params.id);
    if (!code) {
      req.session.flash = { type: 'danger', message: 'Discount code not found.' };
      return res.redirect('/settings');
    }
    res.renderPage('settings/code-edit', {
      pageTitle: `Edit Code: ${code.code}`,
      code
    });
  } catch (err) {
    next(err);
  }
});

// POST /settings/codes/:id
router.post('/codes/:id', (req, res, next) => {
  try {
    const { code, discount_type, discount_value, description, expires_at, max_uses, active } = req.body;
    DiscountCode.update(req.params.id, {
      code,
      discount_type,
      discount_value: parseFloat(discount_value) || 0,
      description,
      expires_at: expires_at || null,
      max_uses: max_uses ? parseInt(max_uses) : null,
      active: active === 'on' || active === '1' ? 1 : 0
    });
    req.session.flash = { type: 'success', message: 'Discount code updated.' };
    res.redirect('/settings');
  } catch (err) {
    console.error('Discount code update error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to update discount code.' };
    res.redirect(`/settings/codes/${req.params.id}/edit`);
  }
});

module.exports = router;
