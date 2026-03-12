# Admireworks Internal Operating System — Master Reference

> This file is the single source of truth for any AI assistant working inside the **Admireworks Internal OS** repository. Read it before making any changes.

---

## Who Is Admireworks?

**Admireworks** is a venture services agency headquartered in **Dubai, UAE**.
- **Brand promise:** "Admirable Venture Services every time."
- **Core focus:** Helping entrepreneurs and businesses start, grow, and scale through **strategy, brand, communications, technology, and marketing**.
- **Primary markets:** UAE, Egypt, Saudi Arabia (MENA region).
- **Owner / Lead Strategist:** Fouad Nasseredin.
- **Contact:** (+971) 4295 8666 · hello@admireworks.com · P.O.Box/36846, DXB, UAE.
- **Brand identity:** ADMIRE8 BY ADMIREWORKS.
- **Agency type:** Direct Response Marketing Agency.

### Brand Design Tokens
| Token | Value |
|---|---|
| Primary Navy | `#001a70` |
| Primary Gold | `#cc9f53` |
| Berry Blue | `#44756a` |
| Tomato | `#d44315` |
| Apricot | `#ea5c2e` |
| Mango | `#fab700` |
| Jumeirah | `#66bc99` |
| Headline Font | Jaymont (serif) |
| Body Font | Akkurat Pro (sans) |
| Arabic Font | Noor (sans) |

---

## Repository Structure

```
Internal AW SOP/
├── Claude.md                         ← YOU ARE HERE
├── AGENTS.md                         ← Workspace directives for AI tools
├── README.md                         ← Build commands & quick-start
│
├── apps/
│   └── client-portal/                ← Main app — my.admireworks.com
│       └── src/app/                  ← Next.js App Router (dashboard, APIs, public pages)
│
├── clients/                          ← All client folders (lifecycle-organized)
│   ├── _templates/                   ← Copy to create a new client folder
│   └── {Client-Name}/               ← One folder per client
│       ├── 00-Client-Index.md        ← Metadata: stage, contacts, portal IDs
│       ├── briefing/                 ← Client brief responses
│       ├── research/                 ← Market research, competitor scans
│       ├── proposal/                 ← Proposal HTML, CSS, PDF, assets
│       ├── communications/           ← Emails, WhatsApp drafts
│       ├── meetings/                 ← Transcripts and recordings
│       ├── invoices/                 ← Static HTML invoices
│       └── campaign/                 ← Campaign assets and strategies
│
├── ops/                              ← Operational systems and playbooks
│   ├── proposal-playbook/            ← Canonical proposal generation SOP
│   │   ├── PLAYBOOK.md               ← 7-phase autonomous workflow
│   │   ├── templates/                ← Shared CSS and JS
│   │   └── scripts/                  ← PDF generator
│   ├── proposal-system/              ← Numbering, CRM tracking, payment links
│   │   ├── scripts/                  ← Dashboard build scripts
│   │   ├── templates/                ← Proposal and payment templates
│   │   ├── payments/                 ← Stripe config, invoice templates, registry
│   │   └── _Outgoing/               ← Published one-pagers and CRM hub
│   ├── strategy-system/              ← 36-section marketing strategy engine
│   │   ├── STRATEGY-SYSTEM.md        ← Full strategy spec
│   │   ├── strategy-kit/             ← Fonts, logos, instructions
│   │   └── historical-pdfs/          ← Past strategy deliverables
│   ├── briefing/                     ← Client onboarding and briefing
│   │   ├── Kickoff-Follow-Up-SOP.md  ← Follow-up standards
│   │   └── Project-Briefing-Questionnaire/
│   └── dashboards/                   ← Static HTML dashboards (ops.admireworks.com)
│       ├── index.html                ← Internal home
│       ├── proposals/index.html      ← Proposal CRM hub
│       └── strategies/index.html     ← Strategies hub
│
├── campaigns/                        ← Standalone campaign sites (Firebase Hosting)
│   └── lup-2026/                     ← Leading Under Pressure 2026
│
├── firebase/                         ← Admin scripts, service account, migrations
│   ├── service-account.json          ← Firebase Admin credentials
│   └── *.mjs                         ← Data migration and setup scripts
│
├── docs/                             ← Technical documentation
│   ├── ARCHITECTURE.md               ← Platform architecture and tech stack
│   ├── DATA-MODEL.md                 ← Firestore collections and schemas
│   ├── DEVELOPMENT.md                ← Dev setup guide
│   ├── WORKFLOWS.md                  ← Full lifecycle workflow reference
│   └── stripe-transfer-sop-prompt.md ← Template for replicating Stripe in new projects
│
├── .agents/workflows/                ← Agent workflow definitions
│   ├── lead-research.md              ← /lead-research
│   ├── create-proposal.md            ← /create-proposal
│   ├── issue-invoice.md              ← /issue-invoice
│   ├── onboard-client.md             ← /onboard-client
│   ├── create-strategy.md            ← /create-strategy
│   ├── process-meeting.md            ← /process-meeting
│   ├── setup-client-project.md       ← /setup-client-project
│   ├── deploy.md                     ← /deploy
│   └── generate-invoice-pdf.md       ← /generate-invoice-pdf
│
├── firebase.json                     ← Firebase Hosting config
├── firestore.rules                   ← Firestore security rules
└── firestore.indexes.json            ← Firestore composite indexes
```

---

## Client Lifecycle

Every client follows this lifecycle. See `docs/WORKFLOWS.md` for full details.

```
Lead → Research → Proposal → Active Client → Ongoing Operations
```

| Stage | Portal | Repo |
|---|---|---|
| **1. Lead** | Create in `/dashboard/leads` | No folder yet |
| **2. Research** | Lead → `qualified` | `clients/{Client}/` created from `_templates/` |
| **3. Proposal** | Create in `/dashboard/proposals` | `proposal/` populated via PLAYBOOK.md |
| **4. Active** | Client → `active` | `00-Client-Index.md` updated, billing set up |
| **5. Ongoing** | Invoices, payments, reports | Campaign, meeting recordings, strategy updates |

---

## Module 1: Client Portal (`my.admireworks.com`)

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Vanilla CSS with design tokens |
| Backend | Next.js API Routes (serverless) |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google + Email/Password) |
| Payments | Stripe (cards, Apple/Google Pay), InstaPay (Egypt) |
| Email | Resend API |
| Storage | Firebase Storage |
| Hosting | Firebase App Hosting (GitHub auto-deploy on `main`) |

### Role-Based Access
```
┌───────────────────────────────────────────────┐
│              my.admireworks.com                │
├─────────┬──────────┬──────────┬───────────────┤
│  Owner  │  Admin   │   Team   │    Client     │
├─────────┼──────────┼──────────┼───────────────┤
│ All     │ All      │ Assigned │ Own data only │
│ +billing│ -billing │ clients  │ Reports,      │
│ settings│ settings │ only     │ invoices,     │
│         │          │          │ campaigns     │
└─────────┴──────────┴──────────┴───────────────┘
```

### Key Dashboard Sections
- **Clients** — company records, contacts, status tracking
- **Invoices** — CRUD, auto-generation, payment tracking
- **Billing** — recurring templates, cadence management
- **Payments** — Stripe + manual payment records
- **Leads** — sales pipeline (A/B/C priority)
- **Proposals** — proposal tracking and status
- **Reports** — client reporting
- **Team** — user roles, permissions, client assignments
- **Settings** — platform configuration, scheduling, integrations

### Key API Routes
| Route | Purpose |
|---|---|
| `/api/invoices/[id]` | Invoice CRUD + InstaPay submission |
| `/api/stripe/create-payment-intent` | Create Stripe PaymentIntent |
| `/api/webhooks/stripe` | Handle Stripe webhooks |
| `/api/emails/send-invoice` | Send branded invoice email |
| `/api/cron/invoices` | Auto-generate recurring invoices |
| `/api/admin/create-client-user` | Create Firebase Auth user for client |
| `/api/finance/*` | Finance tracking and alerts |
| `/api/scheduling/*` | Google Calendar booking integration |
| `/api/meta/*` | Meta Ads creatives and engagement |

---

## Module 2: Proposal System

### Autonomous Proposal Playbook (Canonical Standard)
**Location:** `ops/proposal-playbook/PLAYBOOK.md`

7-phase autonomous workflow:
1. Intake — parse brief and research
2. Deep Research — browser + API intelligence
3. Intelligence Synthesis — structured reports
4. Proposal Architecture — 12-14 page design
5. Visual Asset Generation — AI-generated images
6. HTML/CSS Build — paginated, print-ready document
7. Quality Assurance — browser + PDF verification

**Two variants:**
- **V1 (Standard):** Consultative Growth Partnership
- **V2 (Direct Response):** AIDA framework with value stack

### Proposal Numbering
Format: `AWP-{CC}-{TOKEN}-{NONCE}` (e.g., `AWP-EG-0MKC-SLK`)

### Proposal Registration
Use `ops/proposal-system/scripts/create_proposal_record.js` after building.

### Payment Rules
| Region | Method |
|---|---|
| Egypt | InstaPay: `admireworks@instapay` (Fouad Nasseredin) |
| International | Stripe payment link |

### Link Standards
- Never use raw URLs in client emails
- Format: `👉 [View Proposal](URL)`
- Email subject: `Admireworks x {Client Name}`

---

## Module 3: Strategy System

**Location:** `ops/strategy-system/STRATEGY-SYSTEM.md`

36-section StoryBrand + Direct Response framework. Interactive HTML/CSS/JS presentation with:
- Two-tab sync (Presenter + Client views)
- Per-slide comment system
- Version management

---

## Module 4: Payment & Invoicing

### Invoice Numbering
Format: `AWI-{YYYYMM}-{SEQ}` (e.g., `AWI-202603-001`)

### Dual-System Approach
| System | Purpose |
|---|---|
| Static HTML | Interactive "pitch" with promotional badges |
| Client Portal | Live payment state, Stripe/InstaPay |

### Payment Flow
1. Client views invoice → Stripe PaymentElement or InstaPay
2. Payment submitted → "Payment Submitted" email
3. Admin confirms → "Payment Confirmed" receipt email

---

## Module 5: Static Dashboards (`ops.admireworks.com`)

**When to use:** Quick cross-device access without logging into the portal.

| Dashboard | Path |
|---|---|
| Internal Home | `ops/dashboards/index.html` |
| Proposals CRM Hub | `ops/proposal-system/_Outgoing/_internal-crm/index.html` |
| Strategies Hub | `ops/dashboards/strategies/index.html` |
| System Manual | `ops/dashboards/system/INDEX.md` |

**Build commands:**
```bash
node ops/proposal-system/scripts/build_proposals_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node ops/proposal-system/scripts/build_strategies_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node ops/proposal-system/scripts/build_internal_home.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node ops/proposal-system/scripts/validate_internal_links.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
```

---

## Key Rules for AI Assistants

1. **Follow the lifecycle:** Lead → Research → Proposal → Active → Ongoing
2. **Client folders live in `clients/`:** Always use `clients/{Client-Name}/`
3. **Use workflows:** Check `.agents/workflows/` for the relevant process
4. **Keep registries in sync:** Update `proposal-registry.csv` when issuing proposals
5. **Follow payment rules by region:** Egypt = InstaPay/Paymob, International = Stripe
6. **Never expose raw URLs** in client-facing emails — use emoji + hyperlink format
7. **Rebuild dashboards** after any proposal or strategy change
8. **Validate links** before pushing
9. **Match the market language:** Arabic ad copy for Arabic-speaking markets (Noor font)
10. **Use brand design tokens** consistently (Navy #001a70, Gold #cc9f53)
11. **Follow StoryBrand framework** for all messaging and strategy work
12. **Proposal standard:** Use `ops/proposal-playbook/PLAYBOOK.md` for new proposals
13. **Research standard:** Follow the structure in `docs/WORKFLOWS.md` Stage 2

---

## Existing Clients

| Client | Stage | Key Notes |
|---|---|---|
| ASM-Minds | Proposal | One-page + PDF issued |
| Basseqat | Active | Has briefing, communications, invoices, meetings |
| Edrak | Research | Strategic market report |
| Ein-Abaya | Research | Transcript + briefing + reference PDF |
| Genco-Price-Change-Audit | Complete | Price change audit report |
| Komu-Lale | Active | Communications + invoices |
| Lighting-Business-Mahmoud | Proposal | Full 00-11 sequence, most complete example |
| MHK-Architects | Proposal | Research + competitor scan + presentation |
| Meguiars-Egypt | Proposal | Full suite including V2 (DR) proposal |
| Simulations-Labs | Active | Meeting intelligence, data sources, reports |

---

## Repository & Deployment

- **GitHub repo:** `fnasr-source/admireworks-internal-os`
- **Client Portal:** `my.admireworks.com` — Firebase App Hosting (auto-deploy on `main`)
- **Static Dashboards:** `ops.admireworks.com` — GitHub Pages
- **Campaign sites:** Firebase Hosting (manual deploy)
