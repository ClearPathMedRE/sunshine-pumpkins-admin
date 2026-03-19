const express = require('express');
const router = express.Router();
const ReferralPartner = require('../models/ReferralPartner');
const { requireAdmin } = require('../middleware/auth');

// GET /referrals
router.get('/', (req, res, next) => {
  try {
    const { status, page } = req.query;
    const partners = ReferralPartner.list({ status, page: parseInt(page) || 1 });
    const stats = ReferralPartner.getStats();

    res.renderPage('referrals/list', {
      pageTitle: 'Referral Partners',
      partners,
      stats,
      filterStatus: status || ''
    });
  } catch (err) {
    next(err);
  }
});

// GET /referrals/payouts
router.get('/payouts', (req, res, next) => {
  try {
    const payouts = ReferralPartner.getPendingPayouts();
    const totalPending = payouts.reduce((sum, p) => sum + p.amount, 0);

    res.renderPage('referrals/payouts', {
      pageTitle: 'Pending Payouts',
      payouts,
      totalPending
    });
  } catch (err) {
    next(err);
  }
});

// GET /referrals/new
router.get('/new', requireAdmin, (req, res, next) => {
  try {
    res.renderPage('referrals/edit', {
      pageTitle: 'New Referral Partner',
      partner: null
    });
  } catch (err) {
    next(err);
  }
});

// POST /referrals
router.post('/', requireAdmin, (req, res, next) => {
  try {
    const { name, email, phone, company, partner_type, referral_code, kickback_hello, kickback_spread, kickback_harvest, notes } = req.body;
    const code = referral_code || ReferralPartner.generateCode(name);
    ReferralPartner.create({
      name,
      email,
      phone,
      company,
      partner_type,
      referral_code: code,
      kickback_hello: parseFloat(kickback_hello) || 25,
      kickback_spread: parseFloat(kickback_spread) || 50,
      kickback_harvest: parseFloat(kickback_harvest) || 100,
      notes
    });
    req.session.flash = { type: 'success', message: 'Referral partner created.' };
    res.redirect('/referrals');
  } catch (err) {
    console.error('Referral partner create error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to create partner.' };
    res.redirect('/referrals/new');
  }
});

// GET /referrals/:id
router.get('/:id', (req, res, next) => {
  try {
    const partner = ReferralPartner.findById(req.params.id);
    if (!partner) {
      req.session.flash = { type: 'danger', message: 'Partner not found.' };
      return res.redirect('/referrals');
    }

    res.renderPage('referrals/detail', {
      pageTitle: partner.name,
      partner
    });
  } catch (err) {
    next(err);
  }
});

// GET /referrals/:id/edit
router.get('/:id/edit', requireAdmin, (req, res, next) => {
  try {
    const partner = ReferralPartner.findById(req.params.id);
    if (!partner) {
      req.session.flash = { type: 'danger', message: 'Partner not found.' };
      return res.redirect('/referrals');
    }

    res.renderPage('referrals/edit', {
      pageTitle: `Edit ${partner.name}`,
      partner
    });
  } catch (err) {
    next(err);
  }
});

// POST /referrals/:id
router.post('/:id', requireAdmin, (req, res, next) => {
  try {
    const { name, email, phone, company, partner_type, referral_code, kickback_hello, kickback_spread, kickback_harvest, status, notes } = req.body;
    ReferralPartner.update(req.params.id, {
      name,
      email,
      phone,
      company,
      partner_type,
      referral_code,
      kickback_hello: parseFloat(kickback_hello) || 25,
      kickback_spread: parseFloat(kickback_spread) || 50,
      kickback_harvest: parseFloat(kickback_harvest) || 100,
      status,
      notes
    });
    req.session.flash = { type: 'success', message: 'Partner updated.' };
    res.redirect(`/referrals/${req.params.id}`);
  } catch (err) {
    console.error('Referral partner update error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to update partner.' };
    res.redirect(`/referrals/${req.params.id}/edit`);
  }
});

// POST /referrals/payouts/:id/pay
router.post('/payouts/:id/pay', requireAdmin, (req, res, next) => {
  try {
    ReferralPartner.markPaid(req.params.id);
    req.session.flash = { type: 'success', message: 'Payout marked as paid.' };
    res.redirect('/referrals/payouts');
  } catch (err) {
    next(err);
  }
});

// POST /referrals/payouts/batch-pay
router.post('/payouts/batch-pay', requireAdmin, (req, res, next) => {
  try {
    const { payout_ids } = req.body;
    const ids = Array.isArray(payout_ids) ? payout_ids : (payout_ids ? [payout_ids] : []);
    for (const id of ids) {
      ReferralPartner.markPaid(id);
    }
    req.session.flash = { type: 'success', message: `${ids.length} payout(s) marked as paid.` };
    res.redirect('/referrals/payouts');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
