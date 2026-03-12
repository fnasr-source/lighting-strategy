---
description: Set up a new Firebase project for a full-funnel client
---

# Setup Client Firebase Project Workflow

## When to Use
When an active client needs their own landing pages, admin area, and payment system — a separate Firebase project.

## Prerequisites
- Client is active (Stage 4+)
- Scope includes: landing pages, admin, payment processing
- Stripe account ready (same Admireworks Stripe account, shared keys)

## Steps

1. **Create the Firebase project**:
   - Go to Firebase Console → Add Project
   - Name: `{client-slug}-app` (e.g., `edrak-space-app`)
   - Enable: Authentication, Firestore, Hosting, Storage

2. **Read the transfer SOP**:
   - View `docs/stripe-transfer-sop-prompt.md`
   - This contains the ready-to-paste prompt for setting up payment architecture

3. **Copy the client-portal scaffold**:
   - Clone the Next.js App Router structure from `apps/client-portal/`
   - Adjust branding tokens:
     - `BRAND_NAME`, `BRAND_TAGLINE`
     - `BRAND_PRIMARY_COLOR`, `BRAND_ACCENT_COLOR`
     - `BRAND_EMAIL`, `BRAND_PHONE`, `BRAND_ADDRESS`

4. **Configure environment**:
   - Copy `.env.example` and fill in new Firebase + same Stripe keys
   - Set up App Hosting or Vercel deployment
   - Configure Stripe webhook endpoint for new domain

5. **Set up authentication**:
   - Enable Email/Password + Google sign-in
   - Create admin user(s)

6. **Configure Firestore rules**:
   - Copy and adapt `firestore.rules` from this project
   - Adjust for client-specific collections

7. **Deploy and verify**:
   - `npm run build` → ensure clean build
   - Test payment flow end-to-end
   - Verify email notifications via Resend

## Secrets to Copy (Same Stripe Account)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  ← same
STRIPE_SECRET_KEY                    ← same
RESEND_API_KEY                       ← same (or new for client domain)
```

## Post-Setup
- Document the new project in `clients/{Client-Name}/00-Client-Index.md`
- Add Firebase project ID and live URL
