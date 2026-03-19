const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { requireAdmin } = require('../middleware/auth');

// GET /packages
router.get('/packages', (req, res, next) => {
  try {
    const packages = Package.listPackages().map(p => ({
      ...p,
      features: p.features ? JSON.parse(p.features) : []
    }));
    const addons = Package.listAddons();

    res.renderPage('packages/list', {
      pageTitle: 'Packages & Add-ons',
      packages,
      addons
    });
  } catch (err) {
    next(err);
  }
});

// GET /packages/:id/edit
router.get('/packages/:id/edit', requireAdmin, (req, res, next) => {
  try {
    const pkg = Package.findPackageById(req.params.id);
    if (!pkg) {
      req.session.flash = { type: 'danger', message: 'Package not found.' };
      return res.redirect('/packages');
    }
    pkg.features = pkg.features ? JSON.parse(pkg.features) : [];

    res.renderPage('packages/edit-package', {
      pageTitle: `Edit ${pkg.name}`,
      pkg
    });
  } catch (err) {
    next(err);
  }
});

// POST /packages/:id
router.post('/packages/:id', requireAdmin, (req, res, next) => {
  try {
    const { name, description, price, features, estimated_cogs_low, estimated_cogs_high } = req.body;
    const featuresArray = features ? features.split('\n').map(f => f.trim()).filter(Boolean) : [];
    Package.updatePackage(req.params.id, {
      name, description,
      price: parseFloat(price),
      features: JSON.stringify(featuresArray),
      estimated_cogs_low: parseFloat(estimated_cogs_low) || 0,
      estimated_cogs_high: parseFloat(estimated_cogs_high) || 0
    });
    req.session.flash = { type: 'success', message: 'Package updated successfully.' };
    res.redirect('/packages');
  } catch (err) {
    console.error('Package update error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to update package.' };
    res.redirect(`/packages/${req.params.id}/edit`);
  }
});

// GET /addons/:id/edit
router.get('/addons/:id/edit', requireAdmin, (req, res, next) => {
  try {
    const addon = Package.findAddonById(req.params.id);
    if (!addon) {
      req.session.flash = { type: 'danger', message: 'Add-on not found.' };
      return res.redirect('/packages');
    }

    res.renderPage('packages/edit-addon', {
      pageTitle: `Edit ${addon.name}`,
      addon
    });
  } catch (err) {
    next(err);
  }
});

// POST /addons/:id
router.post('/addons/:id', requireAdmin, (req, res, next) => {
  try {
    const { name, description, price, estimated_cogs_low, estimated_cogs_high } = req.body;
    Package.updateAddon(req.params.id, {
      name, description,
      price: parseFloat(price),
      estimated_cogs_low: parseFloat(estimated_cogs_low) || 0,
      estimated_cogs_high: parseFloat(estimated_cogs_high) || 0
    });
    req.session.flash = { type: 'success', message: 'Add-on updated successfully.' };
    res.redirect('/packages');
  } catch (err) {
    console.error('Addon update error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to update add-on.' };
    res.redirect(`/addons/${req.params.id}/edit`);
  }
});

module.exports = router;
