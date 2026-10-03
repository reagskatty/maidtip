# MaidTip — MVP

A mobile web app that lets hotel guests leave a digital tip for housekeeping.
Guest scans a QR code on a card in the room → lands on this page → enters
their room number and tip amount → pays via Stripe → 100% of the tip
(minus your small platform fee) goes to the hotel's connected Stripe account.

## How it works

1. Guest scans QR code (URL includes `?hotel=demo_hotel`)
2. Guest enters room number + amount, taps "Continue to Payment"
3. Backend creates a Stripe Checkout session and routes the payment to the
   hotel's Stripe Connect account, minus your platform fee
4. Guest pays on Stripe's secure hosted checkout page
5. Guest is redirected to a thank-you confirmation page

## What you need before this can process real money

1. **A registered business entity** (LLC recommended) — required to open a
   Stripe account.
2. **A Stripe account**, upgraded to use **Stripe Connect**
   (https://stripe.com/connect) — this is what lets you route payments from
   a guest to a third party (the hotel) instead of just to yourself.
3. **Each pilot hotel completes Stripe Connect onboarding** — Stripe will
   walk them through providing their business/bank details so they can
   receive payouts. You'll get an account ID (starts with `acct_`) once
   they're approved.
4. A place to host this app — Render, Railway, Fly.io, or Vercel are all
   simple, inexpensive options for a Node.js app like this one.
5. A real domain name (e.g. yourapp.com) so the QR code points somewhere
   permanent — don't put a temporary/test URL on printed cards.

## Setup instructions

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment template and fill in your Stripe keys
cp .env.example .env
# then edit .env with your actual Stripe test key

# 3. Run it locally
npm start

# 4. Visit http://localhost:3000 in your browser
```

## Testing payments (before going live)

Stripe's test mode lets you simulate real payments with no real money moving.
Use this test card number on the Stripe checkout page:

- Card number: 4242 4242 4242 4242
- Expiry: any future date
- CVC: any 3 digits
- ZIP: any 5 digits

## Enabling Apple Pay / Google Pay

Stripe Checkout can show an Apple Pay or Google Pay button automatically
(alongside regular card entry) when a guest's device supports it — no extra
code required. To turn it on:

1. Go to your Stripe Dashboard → Settings → Payment methods
2. Enable "Apple Pay" and "Google Pay"
3. For Apple Pay specifically, you'll also need to verify your domain once
   it's live (Stripe walks you through this in the same settings page)

That's it — guests with a wallet set up on their phone will see a one-tap
option instead of typing in a card number.

## Multiple hotels

Right now, hotel-to-Stripe-account mapping is hardcoded in `server.js` in the
`HOTEL_ACCOUNTS` object as a placeholder. Once you're piloting with more than
one property, replace this with a real database (even a simple one like
SQLite or a hosted Postgres instance) that maps a `hotelId` to:

- The hotel's Stripe Connect account ID
- The hotel's display name
- Any hotel-specific settings (suggested tip amounts, branding, etc.)

## Generating the QR code

Once this app is deployed to a real URL, generate a QR code that points to:

```
https://yourapp.com/?hotel=demo_hotel
```

Any free QR code generator (e.g. qr-code-generator.com) works for this —
just make sure the destination URL is your live, permanent app URL before
printing cards for hotel rooms.

## Going live

1. Switch your `.env` `STRIPE_SECRET_KEY` from your test key (`sk_test_...`)
   to your live key (`sk_live_...`)
2. Make sure each hotel has completed live (not test) Stripe Connect
   onboarding
3. Test one real transaction yourself before rolling out to guests

## Legal/compliance note

This code handles the payment flow, but does not replace legal advice.
Before processing real guest payments and routing tips to hotel staff,
have a lawyer review your tip-handling structure (see Fair Labor Standards
Act considerations for tip distribution) and confirm your business entity
and Stripe Connect setup meet applicable state and federal requirements.
