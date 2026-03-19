const express = require('express');
const router = express.Router();
const ejs = require('ejs');
const path = require('path');
const nodemailer = require('nodemailer');
const Email = require('../models/Email');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Market = require('../models/Market');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT) || 587,
  secure: process.env.MAIL_SECURE === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// GET /emails/compose/:orderId
router.get('/compose/:orderId', (req, res, next) => {
  try {
    const order = Order.findById(req.params.orderId);
    if (!order) {
      req.session.flash = { type: 'danger', message: 'Order not found.' };
      return res.redirect('/orders');
    }

    const customer = Customer.findById(order.customer_id);

    const templates = [
      { value: 'order-confirmation', label: 'Order Confirmation' },
      { value: 'install-scheduled', label: 'Installation Scheduled' },
      { value: 'install-reminder', label: 'Installation Reminder' },
      { value: 'install-complete', label: 'Installation Complete' },
      { value: 'custom', label: 'Custom Message' }
    ];

    res.renderPage('emails/compose', {
      pageTitle: 'Compose Email',
      order,
      customer,
      templates
    });
  } catch (err) {
    next(err);
  }
});

// POST /emails/send
router.post('/send', async (req, res, next) => {
  const { order_id, customer_id, template, subject, custom_body } = req.body;

  try {
    const order = Order.findById(order_id);
    const customer = Customer.findById(customer_id);

    if (!order || !customer) {
      req.session.flash = { type: 'danger', message: 'Order or customer not found.' };
      return res.redirect(`/orders/${order_id}`);
    }

    let html;
    if (template === 'custom') {
      html = custom_body;
    } else {
      html = await ejs.renderFile(
        path.join(__dirname, '..', 'views', 'emails', 'templates', template + '.ejs'),
        { customer, order, installDate: order.install_date || order.delivery_date }
      );
    }

    const mailOptions = {
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: customer.email,
      subject: subject || `Sunshine Pumpkins — ${template.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
      html
    };

    await transporter.sendMail(mailOptions);

    Email.log({
      customer_id: customer.id,
      order_id: order.id,
      template,
      subject: mailOptions.subject,
      recipient: customer.email,
      sent_by: req.session.userId
    });

    req.session.flash = { type: 'success', message: `Email sent to ${customer.email}.` };
    res.redirect(`/orders/${order_id}`);
  } catch (err) {
    console.error('Email send error:', err);
    req.session.flash = { type: 'danger', message: err.message || 'Failed to send email.' };
    res.redirect(`/orders/${order_id}`);
  }
});

// GET /emails/log
router.get('/log', (req, res, next) => {
  try {
    const { customer_id, order_id, page, market } = req.query;
    const marketId = market || '';
    const markets = Market.list();
    const result = Email.getLog({
      customer_id: customer_id || undefined,
      order_id: order_id || undefined,
      marketId: marketId || undefined,
      page: parseInt(page) || 1,
      limit: 25
    });

    res.renderPage('emails/log', {
      pageTitle: 'Email Log',
      emails: result.data || result,
      total: result.total || 0,
      page: parseInt(page) || 1,
      limit: 25,
      filters: { customer_id, order_id },
      markets,
      selectedMarket: marketId
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
