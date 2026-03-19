const db = require('../config/database');

module.exports = function (req, res, next) {
  res.locals.currentPath = req.path;
  res.locals.currentUser = null;

  if (req.session && req.session.userId) {
    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.session.userId);
    if (user) {
      res.locals.currentUser = user;
    }
  }

  // Flash messages
  if (req.session && req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  } else {
    res.locals.flash = null;
  }

  next();
};