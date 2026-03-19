const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Package = require('../models/Package');
const ReferralPartner = require('../models/ReferralPartner');
const db = require('../config/database');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST /webhooks/stripe
// Raw body parsing is applied at this route level
router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      const customerDetails = session.customer_details || {};
      const shipping = session.shipping_details || session.shipping || {};
      const address = (shipping.address) || {};
      const customFields = session.custom_fields || [];

      // Find or create customer
      const customer = Customer.findOrCreate({
        email: customerDetails.email,
        name: customerDetails.name || '',
        phone: customerDetails.phone || '',
        address_line1: address.line1 || '',
        address_line2: address.line2 || '',
        city: address.city || '',
        state: address.state || '',
        zip: address.postal_code || ''
      });

      // Extract delivery window from custom fields if present
      const deliveryWindowField = customFields.find(f =>
        f.key === 'delivery_window' || f.key === 'delivery-window'
      );
      const deliveryWindow = deliveryWindowField ? deliveryWindowField.text?.value || deliveryWindowField.value : '';

      // Determine season
      const now = new Date();
      const season = now.getFullYear().toString();

      // Create order
      const order = Order.create({
        customer_id: customer.id,
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
        amount_total: session.amount_total,
        status: 'paid',
        delivery_window: deliveryWindow,
        season,
        notes: ''
      });

      // Process line items if expanded, otherwise we match from metadata
      const lineItems = session.line_items?.data || [];
      const packages = Package.listPackages();
      const addons = Package.listAddons();

      if (lineItems.length > 0) {
        for (const item of lineItems) {
          const itemName = item.description || item.price?.product?.name || '';
          const matchedPkg = packages.find(p =>
            p.name.toLowerCase() === itemName.toLowerCase()
          );
          const matchedAddon = addons.find(a =>
            a.name.toLowerCase() === itemName.toLowerCase()
          );

          Order.addItem(order.id, {
            type: matchedPkg ? 'package' : 'addon',
            reference_id: matchedPkg ? matchedPkg.id : (matchedAddon ? matchedAddon.id : null),
            name: itemName,
            quantity: item.quantity || 1,
            unit_price: item.amount_total || item.price?.unit_amount || 0
          });
        }
      } else if (session.metadata) {
        // Fallback: use metadata to determine package
        if (session.metadata.package_slug) {
          const pkg = Package.findPackageBySlug(session.metadata.package_slug);
          if (pkg) {
            Order.addItem(order.id, {
              type: 'package',
              reference_id: pkg.id,
              name: pkg.name,
              quantity: 1,
              unit_price: session.amount_total
            });
          }
        }
      }

      // Handle referral code from metadata
      if (session.metadata && session.metadata.referral_code) {
        try {
          const partner = ReferralPartner.findByCode(session.metadata.referral_code);
          if (partner) {
            // Determine kickback amount based on package
            let kickbackAmount = partner.kickback_hello; // default
            const pkgName = (session.metadata.package_slug || '').toLowerCase();
            if (pkgName.includes('spread') || pkgName.includes('sunshine')) {
              kickbackAmount = partner.kickback_spread;
            } else if (pkgName.includes('grand') || pkgName.includes('harvest') && !pkgName.includes('hello')) {
              kickbackAmount = partner.kickback_harvest;
            }

            // Update order with referral info
            try {
              db.prepare("UPDATE orders SET referral_partner_id = ?, referral_kickback = ? WHERE id = ?").run(partner.id, kickbackAmount, order.id);
            } catch (e) {
              console.error('Failed to update order with referral info:', e.message);
            }

            // Create pending payout
            try {
              db.prepare("INSERT INTO referral_payouts (partner_id, order_id, amount, status) VALUES (?, ?, ?, 'pending')").run(partner.id, order.id, kickbackAmount);
            } catch (e) {
              console.error('Failed to create referral payout:', e.message);
            }

            console.log(`Webhook: Referral from partner ${partner.name} (${partner.referral_code}), kickback: $${kickbackAmount}`);
          }
        } catch (refErr) {
          console.error('Webhook referral processing error:', refErr);
        }
      }

      console.log(`Webhook: Created order #${order.id} for ${customer.email}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
