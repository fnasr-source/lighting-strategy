# Admireworks Platform — Development Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Firebase CLI (`npm i -g firebase-tools`)
- Git

## Quick Start

```bash
# Clone
git clone https://github.com/fnasr-source/admireworks-internal-os.git
cd admireworks-internal-os

# Install dependencies
cd apps/client-portal && npm install

# Set up environment
cp .env.example .env.local
# Fill in: Firebase, Stripe, Resend keys

# Run dev server
npm run dev
# → http://localhost:3002
```

## Environment Variables

Create `.env.local` in `apps/client-portal/`:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (for API routes)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend (email)
RESEND_API_KEY=

# Scheduling (Google Calendar)
SCHEDULING_ENCRYPTION_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
GOOGLE_WEBHOOK_SECRET=

# Cron
CRON_SECRET=admireworks-cron-2026

# Base URL
NEXT_PUBLIC_BASE_URL=https://my.admireworks.com
```

## Project Structure

```
apps/client-portal/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── dashboard/    # Admin + client dashboard
│   │   ├── invoice/      # Public invoice page
│   │   ├── login/        # Auth
│   │   └── api/          # API routes
│   ├── lib/
│   │   ├── firestore.ts  # ⭐ All types + CRUD services
│   │   └── firebase.ts   # Firebase client config
│   └── contexts/
│       └── AuthContext.tsx # Auth + roles + permissions
└── public/
```

## Key Files

| File | What it does |
|---|---|
| `src/lib/firestore.ts` | All data types, services, permissions |
| `src/contexts/AuthContext.tsx` | Auth state, profile loading, role checks |
| `src/app/dashboard/layout.tsx` | Role-filtered sidebar navigation |
| `src/app/invoice/[id]/page.tsx` | Public invoice with Stripe + InstaPay |
| `src/app/api/cron/invoices/route.ts` | Automated billing cron |

## Adding a New Feature

1. **Define types** in `firestore.ts`
2. **Add CRUD service** in `firestore.ts` (follow existing patterns)
3. **Create page** in `src/app/dashboard/[feature]/page.tsx`
4. **Add nav item** in `src/app/dashboard/layout.tsx` with permission
5. **Build and test**: `npm run build`

## Deployment

Pushes to `main` auto-deploy via Vercel.

```bash
# Manual deploy
npm run build
# Deploy happens automatically via GitHub → Vercel
```

## Git Guardrails

This repo is configured to block `git push` when the worktree is dirty.

Why:
- a push only sends committed changes,
- local modified/untracked files can otherwise be left behind across chats and sessions.

Expected workflow:
1. Run `git status`
2. Commit or stash all changes
3. Push only from a clean worktree

The repo hook lives at `.githooks/pre-push`.

## Running Migration

```bash
cd firebase
node migrate-legacy.mjs
```

## Testing Cron Locally

```bash
curl -X POST http://localhost:3002/api/cron/invoices \
  -H "Authorization: Bearer admireworks-cron-2026"
```
