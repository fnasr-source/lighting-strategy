# Admireworks Platform — Architecture

## Overview

The Admireworks platform is a unified dashboard at `my.admireworks.com` serving both internal team operations and client-facing reporting.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Vanilla CSS with design tokens |
| **Backend** | Next.js API Routes (serverless) |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Auth (Google + Email/Password) |
| **Payments** | Stripe (cards), InstaPay (Egypt) |
| **Email** | Resend API |
| **Storage** | Firebase Storage |
| **Hosting** | Firebase App Hosting (GitHub auto-deploy on `main`) |
| **Icons** | Lucide React |

## Application Structure

```
apps/
├── client-portal/          # Main app — my.admireworks.com
│   ├── src/app/
│   │   ├── dashboard/      # Auth-protected admin/client views
│   │   │   ├── page.tsx           # Dashboard home (role-aware)
│   │   │   ├── layout.tsx         # Permission-filtered sidebar
│   │   │   ├── clients/           # Client management
│   │   │   ├── invoices/          # Invoice CRUD
│   │   │   ├── billing/           # Billing management + recurring
│   │   │   ├── payments/          # Payment tracking
│   │   │   ├── leads/             # Sales pipeline
│   │   │   ├── proposals/         # Proposal tracking
│   │   │   ├── campaigns/         # Campaign performance (Phase 2)
│   │   │   ├── integrations/      # Ad platform connections (Phase 2)
│   │   │   ├── communications/    # Client messaging (Phase 3)
│   │   │   ├── reports/           # Report management
│   │   │   ├── team/              # User & role management
│   │   │   └── settings/          # Platform settings
│   │   ├── invoice/[id]/          # Public invoice + payment page
│   │   ├── login/                 # Auth page
│   │   └── api/
│   │       ├── invoices/          # Invoice API
│   │       ├── stripe/            # Stripe integration
│   │       ├── emails/            # Email sending
│   │       ├── cron/invoices/     # Automated billing
│   │       └── webhooks/stripe    # Stripe webhook
│   ├── src/lib/
│   │   ├── firestore.ts           # All data types + CRUD services
│   │   └── firebase.ts            # Firebase client init
│   └── src/contexts/
│       └── AuthContext.tsx         # Auth + UserProfile + roles
│
clients/                        # All client work (lifecycle-organized)
├── _templates/                 # Copy to start a new client folder
└── {Client-Name}/              # One folder per client
│
ops/                            # Operational systems & playbooks
├── proposal-playbook/          # Canonical proposal generation SOP
├── proposal-system/            # Numbering, CRM, payment links
├── strategy-system/            # 36-section strategy engine
├── briefing/                   # Onboarding & questionnaires
└── dashboards/                 # Static HTML dashboards (ops.admireworks.com)
│
firebase/
├── service-account.json        # Firebase Admin credentials
└── *.mjs                       # Data migration and setup scripts
```

## Role-Based Access

```
┌─────────────────────────────────────────────────────┐
│                    my.admireworks.com                │
├─────────┬──────────┬──────────┬─────────────────────┤
│  Owner  │  Admin   │   Team   │       Client        │
├─────────┼──────────┼──────────┼─────────────────────┤
│ All     │ All      │ Assigned │ Own data only       │
│ +billing│ -billing │ clients  │ Reports, invoices,  │
│ settings│ settings │ only     │ campaigns, messages │
└─────────┴──────────┴──────────┴─────────────────────┘
```

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/invoices/[id]` | GET | Fetch invoice for public page |
| `/api/invoices/[id]` | PATCH | Update invoice (InstaPay ref) |
| `/api/invoices/[id]/confirm-paid` | POST | Admin: confirm payment received |
| `/api/stripe/create-payment-intent` | POST | Create Stripe PaymentIntent |
| `/api/stripe/create-checkout` | POST | Create Stripe Checkout |
| `/api/webhooks/stripe` | POST | Handle Stripe webhooks |
| `/api/emails/send` | POST | Send email via Resend |
| `/api/emails/send-invoice` | POST | Send branded invoice email |
| `/api/cron/invoices` | POST | Auto-generate recurring invoices |
| `/api/cron/finance-*` | POST | Finance tracking and alerts |
| `/api/cron/scheduling-*` | POST | Calendar sync and reminders |
| `/api/admin/create-client-user` | POST | Create Firebase Auth user for client |
| `/api/finance/*` | Various | Finance overview, inbox, import |
| `/api/scheduling/*` | Various | Booking slots, event types, Google Calendar |
| `/api/meta/*` | Various | Meta Ads creatives and engagement |
| `/api/ai/*` | Various | AI insights and recommendations |
