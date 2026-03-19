function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }
  req.session.flash = { type: 'danger', message: 'Admin access required.' };
  res.redirect('/');
}

module.exports = { requireAuth, requireAdmin };