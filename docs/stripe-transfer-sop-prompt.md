# Stripe Integration Transfer SOP + Ready-to-Paste Prompt

## What is implemented in this project (audit)

This project uses **two payment patterns**:

1. **Client Portal native payment embedding (no iframe)**
- Stripe is embedded using `PaymentElement` in the invoice page.
- Main file: `apps/client-portal/src/app/invoice/[id]/page.tsx`
- Payment intent endpoint: `apps/client-portal/src/app/api/stripe/create-payment-intent/route.ts`
- Webhook handler: `apps/client-portal/src/app/api/webhooks/stripe/route.ts`
- Invoice API (read + InstaPay submission): `apps/client-portal/src/app/api/invoices/[id]/route.ts`
- Firestore records are updated on success (`invoices` + `payments` collections).

2. **Static proposal/payment-link pages**
- Branded pages link out to Stripe Payment Links.
- Template: `Proposals/_Proposal-System/payments/templates/payment-link-page.html`
- Links registry: `Proposals/_Proposal-System/payments/payment-links.csv`
- Stripe setup notes: `Proposals/_Proposal-System/payments/STRIPE-CONFIG.md`

## Secrets and config used

Use these variables in the target project so it can charge the **same Stripe account**:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Notes:
- Publishable key is already present in this project config (`apps/client-portal/apphosting.yaml`, `.env.local`).
- Secret key exists in local env/secrets in this project. Reuse that same value in the new project secret manager to keep the same Stripe account.
- Do not commit secrets to git.

## Ready-to-paste prompt for the other IDE

```text
You are working inside a new project. Implement the same Stripe invoice/payment architecture used in my source project, but with THIS project's branding (not Admireworks branding).

Goal
- Build a public invoice page with embedded Stripe card payment (no iframe).
- Keep a second payment method path for manual transfer (if local market requires it), similar to InstaPay flow.
- Use the exact Stripe account from my source project by reusing the same Stripe API keys via env secrets.
- Ensure invoice status + payment records are written to Firestore after successful payment.

Branding input
- Replace all source-brand tokens with these values:
  - BRAND_NAME: <NEW_BRAND_NAME>
  - BRAND_TAGLINE: <NEW_BRAND_TAGLINE>
  - BRAND_PRIMARY_COLOR: <HEX>
  - BRAND_ACCENT_COLOR: <HEX>
  - BRAND_EMAIL: <EMAIL>
  - BRAND_PHONE: <PHONE>
  - BRAND_ADDRESS: <ADDRESS>

Tech requirements
- Stack: Next.js App Router + TypeScript + Firebase Admin + Firestore + Stripe + Resend.
- Do NOT use iframe embeds for card checkout.
- Use `@stripe/react-stripe-js` + `@stripe/stripe-js` + `PaymentElement`.
- Use server-side Stripe calls from API routes.

Implement these routes
1) POST `/api/stripe/create-payment-intent`
- Input: `{ invoiceId }`
- Load invoice from Firestore.
- Reject if already paid.
- Reuse existing unfinished `stripePaymentIntentId` when possible.
- Create PaymentIntent with `automatic_payment_methods: { enabled: true }`.
- Add metadata: `invoiceId`, `invoiceNumber`, `clientId`.
- Save `stripePaymentIntentId` on invoice.
- Return `{ clientSecret, amount, currency }`.

2) POST `/api/webhooks/stripe`
- Handle at minimum:
  - `payment_intent.succeeded`
  - `checkout.session.completed` (fallback/compat)
  - `payment_intent.payment_failed`
- On success:
  - Mark invoice `status=paid`, set `paidAt`.
  - Insert `payments` record with method `stripe`, amount, currency, invoice refs.
  - Send payment receipt email.
- Ensure idempotency so duplicate webhook deliveries do not duplicate payment records.

3) GET/PATCH `/api/invoices/[id]`
- GET: return invoice data + company settings.
- PATCH: accept manual transfer submission payload (example: `{ paymentMethod: 'manual_transfer', reference? }`) and create pending payment record for finance review.

4) POST `/api/invoices/[id]/confirm-paid`
- Admin action endpoint.
- Sends a payment-confirmed email.

Implement UI pages
1) Public invoice page `/invoice/[id]`
- Left side: invoice summary, line items, totals, discount handling.
- Right side:
  - Embedded Stripe `PaymentElement` for card payment.
  - Optional local transfer method UI (toggle for specific currencies/regions).
- On page load:
  - Fetch invoice via `/api/invoices/[id]`.
  - If not paid, call `/api/stripe/create-payment-intent` and mount `Elements` with returned `clientSecret`.
- On submit:
  - Use `stripe.confirmPayment(...)` with return URL `?status=complete`.

2) Admin invoices page
- Create invoice.
- View invoice link `/invoice/{id}`.
- Mark paid action.

3) Admin payments page
- List payments with status/method/date/amount.

Firestore data model
- `invoices` fields:
  - `invoiceNumber`, `clientId`, `clientName`, `lineItems[]`, `subtotal`, `discount?`, `tax`, `totalDue`, `currency`, `status`, `issuedAt`, `dueDate`, `paidAt?`, `stripePaymentIntentId?`, `notes?`
- `payments` fields:
  - `clientId`, `clientName`, `invoiceId`, `invoiceNumber`, `amount`, `currency`, `method` (`stripe|manual_transfer|...`), `status` (`succeeded|pending|failed`), `stripePaymentIntentId?`, `reference?`, `paidAt`, `createdAt`

Secrets to configure in target project
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = copy from source project (same account)
- `STRIPE_SECRET_KEY` = copy from source project secure secret store (same account)
- Firebase envs (`NEXT_PUBLIC_FIREBASE_*` + admin credential)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

Stripe dashboard setup
- Create webhook endpoint to:
  - `https://<TARGET_DOMAIN>/api/webhooks/stripe`
- Subscribe to:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `checkout.session.completed`
- Apply new project branding in Stripe Branding settings (business name, logo, colors, descriptor).

Migration requirement
- If importing old invoices, map legacy Stripe payment link IDs/URLs into invoice fields and keep continuity for reporting.

Acceptance checklist (must pass)
- A newly created invoice opens at `/invoice/{id}` and renders payment form.
- Card payment completes without iframe and returns to invoice page.
- Webhook marks invoice paid and creates one payment record.
- Receipt email is sent.
- Admin dashboard reflects paid status immediately.
- Branding shown to users matches new project brand (not source brand).

Deliverables
- Code changes.
- `.env.example` updated with all required vars (no secret values).
- Short `PAYMENTS-SETUP.md` documenting setup/runbook.
- Brief test notes with one successful payment flow.
```

## Optional hardening (recommended)

The current source webhook handler parses JSON directly and does not verify Stripe signature. For stronger security in the target project, add signature verification with `stripe.webhooks.constructEvent(...)` using `STRIPE_WEBHOOK_SECRET`.
