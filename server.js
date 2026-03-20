require('dotenv').config();

const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { requireAuth } = require('./middleware/auth');
const locals = require('./middleware/locals');

// Run migrations and sync admin user on startup
(function startupSync() {
  try {
    const db = require('./config/database');
    const bcrypt = require('bcryptjs');
    const fs = require('fs');

    // Run markets migration if not already applied
    try {
      const migrationPath = require('path').resolve(__dirname, 'migrations', '003_markets.sql');
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const stmt of stmts) {
          try { db.exec(stmt + ';'); } catch (e) { /* already exists */ }
        }
        console.log('Markets migration ensured.');
      }
    } catch (e) {
      console.log('Migration skip:', e.message);
    }

    // Sync admin user credentials from env
    const adminEmail = process.env.ADMIN_EMAIL || 'sunshinepumpkins1@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SunshinePumpkins2026!';
    const existing = db.prepare('SELECT id, email FROM users WHERE role = ?').get('admin');
    if (existing) {
      const hash = bcrypt.hashSync(adminPassword, 12);
      db.prepare('UPDATE users SET email = ?, password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(adminEmail, hash, existing.id);
      console.log(`Admin user synced: ${adminEmail}`);
    } else {
      const hash = bcrypt.hashSync(adminPassword, 12);
      db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
        .run(adminEmail, hash, 'Admin', 'admin');
      console.log(`Admin user created: ${adminEmail}`);
    }
  } catch (e) {
    console.error('Startup sync error:', e.message);
  }
})();

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Stripe webhook needs raw body — mount BEFORE json/urlencoded parsers
const webhookRoutes = require('./routes/webhooks');
app.use('/webhooks', webhookRoutes);

// Security
app.use(helmet({
  contentSecurityPolicy: false
}));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Sessions
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.sqlite',
    dir: path.join(__dirname, 'data')
  }),
  secret: process.env.SESSION_SECRET || 'pumpkin-admin-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Locals middleware (currentUser, flash, currentPath)
app.use(locals);

// Layout rendering helper
app.use((req, res, next) => {
  const originalRender = res.render.bind(res);
  res.renderPage = function(view, pageLocals = {}) {
    originalRender(view, pageLocals, (err, html) => {
      if (err) return next(err);
      originalRender('layout', { ...pageLocals, body: html });
    });
  };
  next();
});

// Auth routes (no requireAuth)
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);

// Apply requireAuth to all routes below
app.use(requireAuth);

// Protected routes
const dashboardRoutes = require('./routes/dashboard');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const packageRoutes = require('./routes/packages');
const scheduleRoutes = require('./routes/schedule');
const emailRoutes = require('./routes/emails');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const referralRoutes = require('./routes/referrals');

app.use('/', dashboardRoutes);
app.use('/orders', orderRoutes);
app.use('/customers', customerRoutes);
app.use('/', packageRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/emails', emailRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/users', userRoutes);
app.use('/settings', settingsRoutes);
app.use('/referrals', referralRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).renderPage('errors/404', { pageTitle: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).renderPage('errors/500', { pageTitle: 'Server Error', error: process.env.NODE_ENV === 'development' ? err : {} });
});

app.listen(PORT, () => {
  console.log(`Sunshine Pumpkins Admin running on port ${PORT}`);
});

module.exports = app;
