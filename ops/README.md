# Operations (ops/)

Central hub for all Admireworks operational systems, playbooks, and internal tools.

## Contents

### `proposal-system/`
The original proposal engine — scripts for numbering, issuance, CRM tracking, payment link management, and hub generation.

**Key files:**
- `NUMBERING-SYSTEM.md` — Proposal ID format: `AWP-{CC}-{TOKEN}-{NONCE}`
- `PRICING-STRUCTURE.md` — Growth packages and pricing tiers
- `PAYMENT-RULES.md` — Region-specific payment methods
- `WORKFLOW-CHECKLIST.md` — Step-by-step proposal issuance checklist
- `scripts/` — Build scripts for dashboards and hubs
- `payments/` — Stripe config, invoice templates, payment link registry

### `proposal-playbook/`
The **canonical standard** for autonomous proposal generation — a 7-phase AI-driven workflow from research through PDF delivery.

**Key files:**
- `PLAYBOOK.md` — Master SOP (7 phases: Intake → Research → Synthesis → Architecture → Visuals → Build → PDF → QA)
- `templates/proposal-base.css` — Shared A4-paginated CSS (12 layout types)
- `scripts/generate-proposal-pdf.js` — Puppeteer PDF renderer

> **When to use which:** Use `proposal-playbook/PLAYBOOK.md` for **new proposals**. Use `proposal-system/` for **numbering, CRM tracking, and payment links** after the proposal is built.

### `strategy-system/`
Marketing strategy generation engine — 36-section StoryBrand + Direct Response framework.

**Key files:**
- `STRATEGY-SYSTEM.md` — Full specification
- `Direct-Response-Framework.md` — Playbook for DR strategy work
- `strategy-kit/` — Reusable fonts, logos, and setup instructions
- `historical-pdfs/` — Past strategy deliverables (Edrak, QYD, The Accounter, Agency Guidelines)
- `client-strategies/` — Per-client strategy drafts

### `briefing/`
Client onboarding and briefing system — questionnaires, follow-up SOPs, and gap analysis templates.

**Key files:**
- `Kickoff-Follow-Up-SOP.md` — Standard process after a client submits a brief
- `Project-Briefing-Questionnaire/` — Full questionnaire catalog with schema

### `dashboards/`
Static HTML dashboards hosted on `ops.admireworks.com` for lightweight internal reference.

**When to use:** Quick cross-device access to proposal CRM, strategies hub, and system manual without logging into `my.admireworks.com`.

**Key pages:**
- `index.html` — Internal home
- `proposals/index.html` — Proposal CRM hub (mirror)
- `strategies/index.html` — Strategies hub
- `system/INDEX.md` — System manual

> **Note:** For real-time operational data (invoices, payments, client status), always use `my.admireworks.com` (the client-portal app).
