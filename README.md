# Viewtrace

Visual observation service for geo-targeted campaigns. Time-stamped visual observations for geo-targeted campaigns. Not a guarantee. Just recorded snapshots you can reference.

## Features

- 🎯 Geo-targeted visual observations
- 📸 Time-stamped screenshots
- 💳 Stripe subscription billing (monthly/annual)
- 📊 Dashboard with usage tracking
- 🔄 Subscription management and cancellation
- 📝 Legal pages (Terms, Privacy, Acceptable Use)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Stripe account

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs (create these in your Stripe dashboard)
STRIPE_PRICE_ID_STARTER_MONTHLY=price_starter_monthly
STRIPE_PRICE_ID_STARTER_ANNUAL=price_starter_annual
STRIPE_PRICE_ID_PRO_MONTHLY=price_pro_monthly
STRIPE_PRICE_ID_PRO_ANNUAL=price_pro_annual
```

3. Configure Stripe:
   - Create a Stripe account
   - Get your API keys from the Stripe dashboard
   - Create products and prices for Starter ($49/month) and Pro ($99/month) plans
   - Update `.env` with your Stripe keys and price IDs
   - Set up webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── checkout/          # Stripe checkout session
│   │   └── webhooks/stripe/   # Stripe webhook handler
│   ├── dashboard/             # User dashboard
│   │   ├── billing/           # Billing management
│   │   └── page.tsx
│   ├── login/                 # Login page
│   ├── signup/                # Signup page
│   ├── terms/                 # Terms of Service
│   ├── privacy/               # Privacy Policy
│   ├── acceptable-use/        # Acceptable Use Policy
│   ├── layout.tsx
│   ├── page.tsx               # Landing page
│   └── globals.css
├── public/
└── package.json
```

## Stripe Setup

1. Create products in Stripe Dashboard:
   - Starter Plan ($49/month)
   - Pro Plan ($99/month)
   - Annual variants (with 2 months free discount)

2. Get Price IDs and add to `.env`

3. Set up webhook:
   - Endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

## UI Text Rules

The following text must be used exactly as specified:

- **Observation status:**
  - "Observed"
  - "Difference observed"
  - "No visible issues detected at capture time"

- **Cancellation:**
  - "Canceling will stop future billing."
  - "Access remains active until the end of the current billing period."

- **Terms checkbox:**
  - "I agree to the Terms of Service and acknowledge that results are observational only."

## License

Private - All rights reserved

