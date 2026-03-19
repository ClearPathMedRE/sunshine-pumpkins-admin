const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /login
router.get('/login', (req, res) => {
  const error = req.session.flash_error;
  delete req.session.flash_error;
  res.render('auth/login', { error: error || null, returnTo: req.query.returnTo || '/' });
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password, returnTo } = req.body;
    const user = User.authenticate(email, password);

    if (!user) {
      req.session.flash_error = 'Invalid email or password.';
      return res.redirect('/login');
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;
    res.redirect(returnTo || '/');
  } catch (err) {
    console.error('Login error:', err);
    req.session.flash_error = 'An error occurred during login.';
    res.redirect('/login');
  }
});

// POST /logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.redirect('/login');
  });
});

module.exports = router;
