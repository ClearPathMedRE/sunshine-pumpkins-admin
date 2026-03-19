const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAdmin } = require('../middleware/auth');

// All user routes require admin
router.use(requireAdmin);

// GET /users
router.get('/', (req, res, next) => {
  try {
    const users = User.list();

    res.renderPage('users/list', {
      pageTitle: 'Users',
      users
    });
  } catch (err) {
    next(err);
  }
});

// GET /users/new
router.get('/new', (req, res, next) => {
  try {
    res.renderPage('users/edit', {
      pageTitle: 'New User',
      editUser: null
    });
  } catch (err) {
    next(err);
  }
});

// POST /users
router.post('/', (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    const user = User.create(email, password, name, role || 'staff');
    req.session.flash = { type: 'success', message: 'User created successfully.' };
    res.redirect('/users');
  } catch (err) {
    console.error('User create error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to create user.' };
    res.redirect('/users/new');
  }
});

// GET /users/:id/edit
router.get('/:id/edit', (req, res, next) => {
  try {
    const editUser = User.findById(req.params.id);
    if (!editUser) {
      req.session.flash = { type: 'danger', message: 'User not found.' };
      return res.redirect('/users');
    }

    res.renderPage('users/edit', {
      pageTitle: `Edit ${editUser.name || editUser.email}`,
      editUser
    });
  } catch (err) {
    next(err);
  }
});

// POST /users/:id
router.post('/:id', (req, res, next) => {
  try {
    const { email, name, role, password } = req.body;

    User.update(req.params.id, { email, name, role });

    if (password && password.trim()) {
      User.updatePassword(req.params.id, password);
    }

    req.session.flash = { type: 'success', message: 'User updated successfully.' };
    res.redirect('/users');
  } catch (err) {
    console.error('User update error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to update user.' };
    res.redirect(`/users/${req.params.id}/edit`);
  }
});

module.exports = router;
