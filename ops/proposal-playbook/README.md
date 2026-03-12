# Autonomous Proposal Generation System

**Purpose:** A reusable SOP/playbook and template infrastructure for generating premium Growth Partnership Proposals using Antigravity's agentic tools.

## Quick Start

To generate a new proposal for any client, use this prompt:

```
Build a Growth Partnership Proposal for [CLIENT NAME].
Use the Autonomous Proposal System playbook at ops/proposal-playbook/PLAYBOOK.md.
Reference materials: [link to meeting transcript or research folder]
```

The agent will autonomously execute all 7 phases: Intake → Research → Synthesis → Architecture → Visuals → HTML Build → PDF Generation → QA.

## Architecture

```
Autonomous-Proposal-System/
├── PLAYBOOK.md                          ← Master SOP (7-phase workflow)
├── README.md                            ← This file
├── templates/
│   ├── proposal-base.css                ← Shared A4-paginated CSS (12 layout types)
│   └── proposal-base.js                 ← Minimal shared JS
└── scripts/
    └── generate-proposal-pdf.js         ← Puppeteer PDF renderer
```

## Design System

The CSS provides 12 reusable page layouts:

| Layout | CSS Class | Purpose |
|--------|-----------|---------|
| Cover | `.page.cover` | Title page with full-bleed background |
| Credentials | `.credentials-grid` | Two-column team/company intro |
| Stats Hero | `.stats-hero-grid` | Large stat callouts (3-6 cards) |
| Audit Grid | `.audit-grid` | Score cards with color-coded ratings |
| Comparison Table | `.comparison-table` | Feature matrix |
| Insight Hero | `.page.insight-hero` | Bold statement page (dark bg) |
| Scope Cards | `.scope-grid` | 2×3 service cards with icons |
| Roadmap | `.roadmap-phases` | Phased timeline |
| Pricing | `.pricing-grid` | Tiered package cards |
| SWOT | Custom grid | 4-quadrant color-coded analysis |
| Next Steps | `.next-steps-list` | Numbered process flow |
| Closing | `.page.closing` | Dark background with contact info |

## Brand Colors

```css
--aw-navy: #001a70;      /* Admireworks primary */
--aw-gold: #cc9f53;      /* Admireworks accent */
--prop-bg-dark: #1b2e20;  /* Default proposal dark (override per client) */
--prop-bg-light: #f5f0e8; /* Default warm cream */
```

## Fonts

Uses existing AW brand fonts from `ops/proposal-system/templates/growth-packages-assets/fonts/`:
- **Jaymont** (headlines) — Medium 500, Bold 700
- **Akkurat Pro** (body) — Light 300, Regular 400, Bold 700

## PDF Generation

```bash
node scripts/generate-proposal-pdf.js <input.html> [output.pdf]
```

- Requires `puppeteer-core` (installed in `ops/proposal-system/payments/`)
- Renders A4 format with zero margins (CSS-controlled page breaks)
- `printBackground: true` for colored sections
- Waits for `networkidle0` to ensure all images load

## Per-Client Structure

Each client proposal follows this structure:

```
clients/{Client}/proposal/
├── proposal.html         ← The proposal document
├── proposal.css          ← Client-specific CSS overrides
├── proposal.pdf          ← Generated PDF
└── assets/
    ├── brand/            ← AW logos (copied from shared assets)
    ├── generated/        ← AI-generated images
    └── research/         ← Browser screenshots from audit
```

## Reference

- **Benchmark:** [Ein Abaya Growth Partnership Proposal](../drafts/Ein%20Abaya%20—%20Growth%20Partnership%20Proposal.pdf) — 11-page premium proposal
- **First Application:** [Meguiar's Egypt Proposal](../Meguiars-Egypt/proposal/) — 14-page proposal (March 2026)

---

*Created March 2026 · Admireworks*
