// server.js
// Backend for the hotel housekeeping tipping app.
// Handles creating a Stripe Checkout session for a guest's tip and
// routing the funds to the hotel's connected Stripe account.

require('dotenv').config();
const express = require('express');
const path = require('path');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 3000;

// Your Stripe secret key (test key to start — swap for live key when ready)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Guest convenience fee, added ON TOP of the tip (in cents). Default $0.99.
// The housekeeper always receives 100% of the tip amount.
const SERVICE_FEE_CENTS = parseInt(process.env.SERVICE_FEE_CENTS || '99', 10);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Create a Stripe Checkout Session for a tip.
 * Expects: { hotelId, roomNumber, amountDollars }
 *
 * hotelId maps to a specific hotel's Stripe Connect account ID
 * (stored in HOTEL_ACCOUNTS below — in production this would live in a database).
 */

// TEMP: hardcoded hotel-to-Stripe-account mapping for the MVP.
// Replace with a real database lookup once you have more than one hotel.
const HOTEL_ACCOUNTS = {
  demo_hotel: process.env.DEMO_HOTEL_STRIPE_ACCOUNT_ID || 'demo',
};

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { hotelId, roomNumber, amountDollars } = req.body;

    if (!hotelId || !Object.prototype.hasOwnProperty.call(HOTEL_ACCOUNTS, hotelId)) {
      return res.status(400).json({ error: 'Unknown or missing hotel ID.' });
    }
    if (!roomNumber || typeof roomNumber !== 'string') {
      return res.status(400).json({ error: 'Room number is required.' });
    }
    const amount = parseFloat(amountDollars);
    if (!amount || amount < 1 || amount > 500) {
      return res.status(400).json({ error: 'Enter a valid tip amount between $1 and $500.' });
    }

    const amountInCents = Math.round(amount * 100);
    const connectedAccountId = HOTEL_ACCOUNTS[hotelId];

    // DEMO MODE: only route to a connected hotel account if a real one is
    // configured (not the placeholder text). This lets you demo the guest
    // payment screen before any pilot hotel has completed Connect onboarding.
    // Once you have a real acct_... ID in your .env, this automatically
    // switches to routing funds there, minus your platform fee.
    const hasRealConnectedAccount =
      connectedAccountId && connectedAccountId.startsWith('acct_') &&
      connectedAccountId !== 'acct_your_hotel_connect_account_id';

    const sessionConfig = {
      mode: 'payment',
      // Omitting payment_method_types lets Stripe automatically show
      // Apple Pay / Google Pay on supported devices, alongside card entry —
      // just enable them once in your Stripe Dashboard under
      // Settings > Payment methods. No extra code needed.
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Housekeeping tip — Room ${roomNumber}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Convenience fee',
              description: 'Your housekeeper receives 100% of your tip.',
            },
            unit_amount: SERVICE_FEE_CENTS,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          hotelId,
          roomNumber,
          tipCents: String(amountInCents),
          serviceFeeCents: String(SERVICE_FEE_CENTS),
        },
      },
      success_url: `${req.protocol}://${req.get('host')}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/?canceled=true`,
    };

    if (hasRealConnectedAccount) {
      // Routes the full tip to the hotel's connected Stripe account.
      // MaidTip keeps only the convenience fee (Stripe's processing fee
      // is paid from it).
      sessionConfig.payment_intent_data.application_fee_amount = SERVICE_FEE_CENTS;
      sessionConfig.payment_intent_data.transfer_data = {
        destination: connectedAccountId,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Something went wrong creating your tip. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Hotel tip app running on http://localhost:${PORT}`);
});