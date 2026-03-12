# Admireworks — Lifecycle Workflows

> Every client interaction follows a lifecycle: **Lead → Research → Proposal → Active → Ongoing**. This document is the single reference for what happens at each stage, where files go, and which tools/scripts to use.

---

## Stage 1: Lead Capture

**When:** A potential client is identified through Apollo, referral, inbound inquiry, or an event.

**Portal action:** Create a lead at `my.admireworks.com/dashboard/leads`

**Data captured:**
- Name, company, email, phone
- Source: `apollo | referral | inbound | event | other`
- Priority: `A | B | C`
- Status: `new`

**Repo action:** None yet — leads live only in Firestore until research begins.

**Workflow file:** `.agents/workflows/lead-research.md`

---

## Stage 2: Research & Pre-Meeting Preparation

**When:** A meeting is scheduled or the lead is qualified for outreach.

**Portal action:** Update lead status → `qualified`

**Repo action:** Create client folder from template:
```bash
cp -r clients/_templates clients/{Client-Name}
```

### Research Deliverables

All research goes in `clients/{Client-Name}/research/`:

| File | Contents | Source |
|---|---|---|
| `02-Research-Report.md` | Business overview, digital presence audit (website score 1-10, social audit), market analysis (size, CAGR, trends), SWOT, opportunity matrix | Browser research + web search |
| `03-Competitor-Scan.md` | 3-5 competitor profiles, feature comparison matrix (✅/❌/🟡), competitive positioning map, market opportunity assessment | Browser research |
| `Strategic_Market_Report.html` | Branded visual report (optional) | Generated from research |

### Research Report Structure (Standard)

```markdown
# Research Report: {Client Name}

## 1. Executive Summary
3-5 sentences — the "so what"

## 2. Brand / Business Overview
- What they do, who they serve
- Geographic focus and target markets

## 3. Product / Service Portfolio
- Core offerings, pricing visibility

## 4. Digital Presence Audit
### Website (score 1-10 on each)
- Design | UX | E-commerce | SEO | Mobile | Content | Arabic support
- Platform: WordPress / Shopify / Custom
- Trust signals, CTAs, pricing transparency

### Social Media
| Platform | Followers | Post Freq. | Engagement | Content Quality | Notes |
|---|---|---|---|---|---|

## 5. Market Analysis
- Market size (TAM/SAM/SOM)
- Growth rate (CAGR)
- Key trends
- Regulatory factors

## 6. SWOT Analysis
| Strengths | Weaknesses |
|---|---|
| Opportunities | Threats |

## 7. Opportunity Matrix
| Priority | Opportunity | Impact | Effort | Quick Win? |
|---|---|---|---|---|

## 8. Data Sources
- All URLs and citations
```

### Meeting Preparation

Meeting transcripts and recordings go in `clients/{Client-Name}/meetings/`:
- `meetings/transcripts/` — Full text transcripts (`.md`)
- `meetings/recordings/` — Audio/video files
- `01-Transcript-Insights.md` (root of client folder) — Key insights extracted from transcripts

### Pre-Meeting Talking Points

Every research report should end with:
- Conversation starters based on findings
- Specific questions to validate research
- Quick wins to present as credibility builders

---

## Stage 3: Proposal Creation

**When:** Research is complete and it's time to pitch the partnership.

**Portal action:** Create proposal record at `my.admireworks.com/dashboard/proposals`

### Proposal Generation (The Canonical Workflow)

Use the **Autonomous Proposal Playbook**: `ops/proposal-playbook/PLAYBOOK.md`

**Trigger prompt:**
```
Build a Growth Partnership Proposal for {CLIENT NAME}.
Use the Autonomous Proposal System playbook at ops/proposal-playbook/PLAYBOOK.md.
Reference materials: clients/{Client-Name}/research/
```

**7 Phases (all autonomous):**
1. **Intake** — Parse brief/research → `proposal/00-Client-Brief.md`
2. **Deep Research** — Browser + API intelligence → `proposal/01-Research-Raw.md`
3. **Synthesis** — Structure findings → `proposal/02-Research-Report.md` + `03-Competitor-Scan.md`
4. **Architecture** — Design 12-14 page flow
5. **Visual Assets** — Generate images → `proposal/assets/`
6. **HTML/CSS Build** — `proposal/proposal.html` + `proposal/proposal.css`
7. **PDF Generation** — `proposal/proposal.pdf`

**Two variants:**
- **V1 (Standard):** Consultative Growth Partnership — "We + Together" tone
- **V2 (Direct Response):** AIDA framework — pain → solution → value stack → urgency

### After the Proposal Is Built

Register it using the proposal system:
```bash
node ops/proposal-system/scripts/create_proposal_record.js \
  --root "/Users/user/Documents/IDE Projects/Internal AW SOP" \
  --country {CC} --send-date {YYYY-MM-DD} \
  --client "{Client Name}" \
  --contact-email "{email}" --contact-phone "{phone}" \
  --source-folder "clients/{Client-Name}" \
  --owner "Fouad Nasseredin" \
  --status READY_TO_SEND \
  --recommended-option "{Option}"
```

### Proposal Numbering

Format: `AWP-{CC}-{TOKEN}-{NONCE}` (e.g., `AWP-EG-0MKC-SLK`)
- `AWP` = Admireworks Proposal
- `CC` = Country code (EG, SA, AE)
- `TOKEN` = 4-char obfuscated date/sequence
- `NONCE` = 3-char random suffix

### Client-Facing Delivery

- **Email subject:** `Admireworks x {Client Name}`
- **Link format:** `👉 [View Proposal](URL)` — never raw URLs
- **Payment section:** Egypt = InstaPay, International = Stripe payment link

---

## Stage 4: Invoicing & Payment

**When:** Proposal accepted, or recurring billing cycle.

### Invoice Numbering

Format: `AWI-{YYYYMM}-{SEQ}` (e.g., `AWI-202603-001`)

### Dual-System Approach

| System | URL | Purpose |
|---|---|---|
| **Static HTML** | `ops.admireworks.com/...` | Interactive "pitch" with add-ons, promotional badges |
| **Client Portal** | `my.admireworks.com/invoice/{ID}` | Transaction: live payment state, Stripe/InstaPay |

**Rule:** Create BOTH. Static = emotional pitch; Portal = official payment capture.

### Payment Methods by Region

| Region | Method | Details |
|---|---|---|
| **Egypt (EGP)** | InstaPay | Account: `admireworks@instapay` (Fouad Nasseredin) |
| **Egypt (Cards)** | Paymob | For automated campaigns and card checkout |
| **International** | Stripe | Cards (Visa/MC/Amex), Apple Pay, Google Pay |

### Invoice Creation Workflow

1. Create invoice in Portal dashboard → `my.admireworks.com/dashboard/invoices`
2. Optionally create static HTML invoice using templates in `ops/proposal-system/payments/templates/`
3. Register payment link in `ops/proposal-system/payments/payment-links.csv`
4. Send invoice email (subject: `Admireworks x {Client} — Invoice`)
5. Payment confirmation flow:
   - **Submission:** Client clicks "I Have Made Payment" → `PATCH /api/invoices/[id]`
   - **Confirmation:** Admin marks paid → `POST /api/invoices/[id]/confirm-paid` → receipt email

### Recurring Billing

- Set up `recurringInvoices` template in Portal
- Cron job auto-generates invoices: `POST /api/cron/invoices`
- Fields: frequency (monthly/quarterly/annual), billingDay, nextDueDate

**Workflow file:** `.agents/workflows/issue-invoice.md`

---

## Stage 5: Client Onboarding

**When:** The client has signed on and paid.

### Portal Actions

1. Create client record → `my.admireworks.com/dashboard/clients`
   - Set status: `active`
   - Set region, currency, billing cadence
2. Create Firebase Auth user for client → `POST /api/admin/create-client-user`
3. Set up recurring billing → `my.admireworks.com/dashboard/billing`

### Repo Actions

1. Update `clients/{Client-Name}/00-Client-Index.md`:
   - Set stage → `Active`
   - Add Portal Client ID
   - Add invoice numbers
   - Add assigned team
2. Process client brief → `clients/{Client-Name}/briefing/`
   - Follow `ops/briefing/Kickoff-Follow-Up-SOP.md`
   - Map brief against questionnaire
   - Generate gap analysis
   - Send kickoff scheduling email

### Full-Funnel Clients (Separate Firebase Project)

For clients getting a full funnel build (landing pages, admin, payment):
1. Create a new Firebase project
2. Use `docs/stripe-transfer-sop-prompt.md` as the template to replicate payment architecture
3. Copy client-portal patterns as needed for their specific admin

**Workflow file:** `.agents/workflows/onboard-client.md`

---

## Stage 6: Strategy Development

**When:** Client needs a full Direct Response Marketing Strategy.

### Strategy System

Full spec: `ops/strategy-system/STRATEGY-SYSTEM.md`

**36 sections** from Cover through Closing, using:
- **StoryBrand Framework:** Customer = Hero, Business = Guide
- **Direct Response Principles:** Every element drives measurable action

### Two-Phase Workflow

1. **Content Phase:** Strategy content → `content.json` → HTML/CSS/JS presentation
2. **Visual Phase:** Image prompts → brand-aligned visuals

### Presentation Features

- Two-tab sync system (Presenter + Client views via BroadcastChannel API)
- Per-slide comment system
- Version management with content.json snapshots
- Keyboard shortcuts (arrows, F, C, N)

### Strategy Kit

Brand assets for strategy presentations: `ops/strategy-system/strategy-kit/`

**Workflow file:** `.agents/workflows/create-strategy.md`

---

## Stage 7: Meeting Management

**When:** Any client meeting (discovery, kickoff, check-in, review).

### Recording Workflow

1. Obtain recording file (from Zoom, Google Meet, etc.)
2. Save to `clients/{Client-Name}/meetings/recordings/`
3. Transcribe → save to `clients/{Client-Name}/meetings/transcripts/{YYYY-MM-DD}-{Topic}.md`
4. Extract insights → update `01-Transcript-Insights.md`

### Scheduling (Portal)

- Connect Google Calendar via `/api/scheduling/google/connect`
- Create event types at `/dashboard/settings` → scheduling
- Clients book via `/book/{slug}`
- Manage bookings at `/dashboard/settings` → scheduling

**Workflow file:** `.agents/workflows/process-meeting.md`

---

## Stage 8: Campaign Management

**When:** Running ad campaigns or marketing campaigns for clients.

### Platform Integrations

- Meta Ads: Creatives API at `/api/meta/creatives`, engagement at `/api/meta/engagement`
- Campaign analytics: `/api/campaigns/{campaign}/analytics`
- Social listening: `/api/sync/social-listening`
- Platform sync: `/api/sync/platforms`

### Campaign Assets

Campaign-specific files go in `clients/{Client-Name}/campaign/`:
- Ad creatives, copy variants
- Landing page content
- Funnel documentation
- Performance reports

### Standalone Campaign Sites

Sites like `lup-2026` live in `campaigns/` and are deployed via Firebase Hosting.

---

## Quick Reference: Where Does What Go?

| Task | File Location | Portal Location |
|---|---|---|
| New lead | — | `/dashboard/leads` |
| Research report | `clients/{Client}/research/` | — |
| Meeting transcript | `clients/{Client}/meetings/transcripts/` | — |
| Meeting recording | `clients/{Client}/meetings/recordings/` | — |
| Proposal HTML/PDF | `clients/{Client}/proposal/` | `/dashboard/proposals` |
| One-page (issued) | `ops/proposal-system/_Outgoing/` | — |
| Invoice (static) | `clients/{Client}/invoices/` | `/invoice/{id}` |
| Invoice (dynamic) | — | `/dashboard/invoices` |
| Strategy presentation | `clients/{Client}/campaign/` or standalone | — |
| Email/WhatsApp drafts | `clients/{Client}/communications/` | — |
| Client brief | `clients/{Client}/briefing/` | — |
| Campaign assets | `clients/{Client}/campaign/` | `/dashboard/campaigns` |
| Payment links | `ops/proposal-system/payments/` | `/dashboard/payments` |

---

## Build & Deploy Commands

```bash
# Rebuild static dashboards
node ops/proposal-system/scripts/build_proposals_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node ops/proposal-system/scripts/build_strategies_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node ops/proposal-system/scripts/build_internal_home.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"

# Validate internal links
node ops/proposal-system/scripts/validate_internal_links.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"

# Generate proposal PDF
node ops/proposal-playbook/scripts/generate-proposal-pdf.js <input.html> [output.pdf]

# Deploy client-portal
cd apps/client-portal && npm run build
# Auto-deploys via GitHub push to main
```
