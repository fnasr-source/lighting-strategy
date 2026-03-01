# Admireworks Internal Operating System — Master Reference

> This file is the single source of truth for any AI assistant (Claude, Gemini, etc.) working inside the **Admireworks Internal OS** repository. Read it before making any changes.

---

## Who Is Admireworks?

**Admireworks** is a venture services agency headquartered in **Dubai, UAE**.
- **Brand promise:** "Admirable Venture Services every time."
- **Core focus:** Helping entrepreneurs and businesses start, grow, and scale through **strategy, brand, communications, technology, and marketing**.
- **Primary markets:** UAE, Egypt, Saudi Arabia (MENA region).
- **Owner / Lead Strategist:** Fouad Nasseredin.
- **Contact:** (+971) 4295 8666 · hello@admireworks.com · P.O.Box/36846, DXB, UAE.
- **Brand identity:** ADMIRE8 BY ADMIREWORKS.

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
├── README.md                         ← Build commands & quick-start
├── index.html                        ← Root redirect
├── CNAME                             ← Custom domain mapping
│
├── Proposals/                        ← All client proposals
│   ├── {Client-Folder}/              ← One folder per client
│   │   └── (numbered docs 00–11, HTML, meetings/, etc.)
│   ├── _Proposal-System/             ← Proposal engine (docs, scripts, templates)
│   │   └── payments/                 ← Stripe integration, package pages, invoices
│   │       ├── STRIPE-CONFIG.md      ← Stripe account & product reference
│   │       ├── INVOICE-PATTERNS.md   ← Self-learning invoice pattern log
│   │       ├── payment-links.csv     ← Registry of all payment links
│   │       ├── payment-pages.css     ← Shared styles for payment pages
│   │       ├── packages/             ← Shareable package pages (HTML)
│   │       ├── invoices/             ← Generated per-client invoices
│   │       └── templates/            ← Invoice & payment link templates
│   └── _Outgoing/                    ← Published client-facing one-pagers
│       └── _internal-crm/            ← CRM dashboard (auto-generated)
│
├── Strategies/                       ← Strategy playbooks & assets
│   ├── STRATEGY-SYSTEM.md            ← Full strategy presentation engine spec
│   ├── Direct Response Strategy Framework Playbook.md
│   ├── Client Strategies/            ← Per-client strategy folders
│   ├── strategy-kit/                 ← Reusable fonts, logos, and INSTRUCTIONS.md
│   ├── *.pdf                         ← Historical strategy PDFs
│   └── Fonts/, Logo.png, Brandmark.png
│
├── Internal-OS/                      ← Internal dashboards
│   ├── index.html                    ← Internal home page
│   ├── proposals/index.html          ← Mirror of CRM hub
│   ├── strategies/index.html         ← Strategies hub
│   └── system/                       ← System manual & link map
│       ├── INDEX.md
│       ├── index.html
│       └── link-map.json
│
├── draft-peviews/                    ← Draft HTML previews
└── strategy/                         ← Generated strategy presentations
```

---

## Module 1: Proposal System

### Purpose
Create, number, publish, track, and follow up on client proposals through a consistent, CRM-linked workflow.

### Core Data Files (`Proposals/_Proposal-System/`)
| File | Role |
|---|---|
| `proposal-registry.csv` | Source of truth for all issued proposals |
| `proposal-crm.csv` | Pipeline/operational metadata keyed by proposal number |
| `legacy-proposals.json` | Historical proposals that predate the numbering system |

### Proposal Numbering
Format: **`AWP-{COUNTRY}-{TOKEN}-{NONCE}`** (e.g. `AWP-EG-0MKC-SLK`)
- `AWP` = Admireworks Proposal prefix
- `COUNTRY` = ISO 2-letter code (EG, SA, AE…)
- `TOKEN` = 4-char obfuscated date/sequence token
- `NONCE` = 3-char random anti-guessing suffix

### Client Proposal Folder Structure (Standard Sequence)
```
Proposals/{Client-Folder}/
├── 00-Proposal-Index.md              ← Master index with metadata
├── 01-Transcript-Insights.md         ← Kick-off call notes
├── 02-Research-Report.md             ← Market research
├── 03-Competitor-Scan.md             ← Competitor analysis
├── 04-Options-and-Recommendation.md  ← Strategic options
├── 05-Go-To-Market-Plan.md           ← GTM plan
├── 06-Offer-and-Proposal.md          ← Pricing & offer
├── 07-Presentation-Deck.md           ← Deck content
├── 08-Appendix-Sources.md            ← Data sources
├── 09-Meeting-Update-YYYY-MM-DD.md   ← Meeting notes (timestamped)
├── 10-One-Page-Proposal.html         ← Client-facing one-pager
├── 11-Final-Presentation.html        ← Branded slide deck
├── meetings/                         ← Meeting transcripts & notes
├── communications/                   ← Email drafts & follow-ups
├── assets/                           ← Fonts, logos, images
├── styles.css                        ← Presentation styles
└── app.js                            ← Presentation engine JS
```

### Proposal Workflow (Checklist)
1. Create/update client package under `Proposals/{Client-Folder}`
2. Prepare one-page and proposal documents
3. Run `create_proposal_record.js` to generate proposal number
4. Confirm entries in `proposal-registry.csv` and `proposal-crm.csv`
5. Confirm payment section (Egypt: Instapay / International: payment link)
6. Confirm validity period (default: 7 days from send date)
7. Confirm email format (subject: `{Agency} x {Project}`, CTA links with emoji)
8. Rebuild internal dashboards
9. Run link validation
10. Push and share final links

### Payment Rules
| Region | Method | Details |
|---|---|---|
| **Egypt** | Instapay | Account: `admireworks@instapay` · [Pay Link](https://ipn.eg/S/admireworks/instapay/5A1jri) |
| **Non-Egypt** | Direct payment link | Include in email body |

### Link Standards (Client-Facing)
- Never use raw URLs in client emails
- Use emoji + hyperlink format: `👉 [View Proposal](URL)`
- Email subject: `{Agency Name} x {Project/Business Name}`

---

## Module 2: Strategy System

### Purpose
Generate full **Direct Response Marketing Strategies** as web-based interactive presentations for clients, using StoryBrand framework and direct response principles.

### Core Methodology
1. **Direct Response Marketing:** Every element drives measurable action — no vanity metrics.
2. **StoryBrand Framework (Donald Miller):** Customer = Hero, Business = Guide.
   - Character → Problem → Guide → Plan → CTA → Success → Failure
3. **Admireworks Section Structure:** 36 standardized sections from Cover to Closing.

### Strategy Sections (Summary)
| # | Section |
|---|---|
| 01 | Cover Page |
| 02 | Strategy Brief (6-box visual overview) |
| 03 | Client Brief |
| 04 | Current Situation |
| 05–06 | Challenge(s) |
| 07–08 | Campaign Goals & Objectives |
| 09–10 | Environmental Scanning (market data) |
| 11–12 | Digital Scanning & Analysis |
| 13–14 | Competitor Analysis & Profiles |
| 15 | Pricing Comparison |
| 16–17 | Unique Advantages & Common Concerns |
| 18–19 | Market Gaps & Opportunities |
| 20–21 | Persona Profiles |
| 22–23 | Campaign Strategy & Findings |
| 24 | Channels |
| 25–26 | Direct Response Funnel Design |
| 27 | HVCO (High Value Content Offer) |
| 28 | Landing Pages |
| 29 | Ad Copy |
| 30 | Email/WhatsApp Sequence |
| 31 | Partnerships |
| 32–33 | Social Media Strategy & Content |
| 34–35 | Measurement & Evaluation |
| 36 | Closing / Thank You |

### Two-Phase Workflow
- **Phase 1 (AI-Generated):** Strategy content → `content.json` → HTML/CSS/JS presentation
- **Phase 2 (Visual Assets):** Image prompts → Google Imagen 3 → brand-aligned visuals

### Presentation Engine Features
- **Two-Tab Sync System:** Presenter view + Client view (via BroadcastChannel API)
- **Comment System:** Per-slide notes, timestamped, exportable
- **Version Management:** Snapshot content.json + compare versions
- **Keyboard shortcuts:** Arrow keys, F (fullscreen), C (comments), N (notes)

---

## Module 3: Internal OS (Dashboards)

### Entry Points
| Dashboard | Path |
|---|---|
| Internal Home | `Internal-OS/index.html` |
| Proposals CRM Hub | `Proposals/_Outgoing/_internal-crm/index.html` |
| Proposals CRM (mirror) | `Internal-OS/proposals/index.html` |
| Strategies Hub | `Internal-OS/strategies/index.html` |
| System Manual (html) | `Internal-OS/system/index.html` |
| System Manual (md) | `Internal-OS/system/INDEX.md` |
| Link Map | `Internal-OS/system/link-map.json` |

### Build Commands
```bash
# Rebuild all dashboards
node Proposals/_Proposal-System/scripts/build_proposals_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/build_strategies_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/build_internal_home.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"

# Validate all links
node Proposals/_Proposal-System/scripts/validate_internal_links.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
```

---

## Existing Client Proposals

| Client | Folder | Status | Type |
|---|---|---|---|
| Basseqat | `Proposals/Basseqat/v1/` | Completed | Growth Proposal (HTML presentation + PDF) |
| Edrak (Lighting) | `Proposals/Edrak/` | Research phase | Market research + strategic report (HTML) |
| Lighting Business – Mahmoud | `Proposals/Lighting-Business-Mahmoud/` | Full proposal issued | Complete numbered proposal (00–11 sequence) |

## Existing Strategies

| Client | Location | Notes |
|---|---|---|
| Edrak | `Strategies/Edrak Strategy.pdf` | PDF strategy document |
| QYD | `Strategies/QYD Strategy.pdf` | PDF strategy document |
| The Accounter | `Strategies/V4.0 The Accounter...pdf` | Direct Response Marketing Strategy |
| The Slim Game | `Strategies/Client Strategies/The Slim Game - strategy draft/` | Strategy draft folder |

---

## Module 4: Payment & Invoicing System

### Purpose
Manage Stripe-powered payment collection, shareable package pages, and invoice generation with self-learning pattern documentation.

### Core Files (`Proposals/_Proposal-System/payments/`)
| File | Role |
|---|---|
| `STRIPE-CONFIG.md` | Stripe account setup, branding, product catalog |
| `INVOICE-PATTERNS.md` | Self-learning invoice patterns & log |
| `payment-links.csv` | Registry of all generated payment links |
| `payment-pages.css` | Shared design system for payment pages |

### Package Pages (Client-Facing)
| Page | Path |
|---|---|
| Ad Campaign Management | `packages/ad-campaign-management.html` |
| Growth System | `packages/growth-system.html` |
| Growth & Funnel Packages | `packages/growth-packages.html` |

### Templates
| Template | Path |
|---|---|
| Invoice | `templates/invoice-template.html` |
| Payment Link Page | `templates/payment-link-page.html` |

### Workflow
1. Create product/price in Stripe Dashboard
2. Generate a Stripe Payment Link
3. Copy template, replace placeholders, save to `invoices/{PROPOSAL-NUMBER}/`
4. Register in `payment-links.csv`
5. Log pattern in `INVOICE-PATTERNS.md`

### Branding Rule
Stripe account may have a different registered name. Configure **Settings → Branding** in Stripe Dashboard to display "Admireworks" on all checkout pages and receipts.

---

## Key Rules for AI Assistants

1. **Always keep `proposal-registry.csv` in sync** when issuing new proposals.
2. **Use the standard 00–11 file sequence** for new client proposal folders.
3. **Follow payment rules by region** (Egypt = Instapay, International = payment link).
4. **Never expose raw URLs** in client-facing emails — use emoji + hyperlink format.
5. **Rebuild dashboards** after any proposal or strategy change.
6. **Validate links** before pushing.
7. **Match the market language** — Arabic ad copy for Arabic-speaking markets (use Noor font).
8. **Use brand design tokens** consistently (Navy #001a70, Gold #cc9f53).
9. **Follow StoryBrand framework** for all messaging and strategy work.
10. **Research reports** should follow the pattern seen in Edrak and Lighting-Business proposals: Executive Summary → Market Analysis → Competitor Deep-Dive → Operational Challenges → Strategic Recommendations.

---

## Meeting Preparation Reports

When preparing for a client meeting (pre-proposal), create research under:
```
Proposals/{Client-Folder}/
├── 02-Research-Report.md             ← Deep business & market research
├── 03-Competitor-Scan.md             ← Competitor analysis
└── Strategic_Market_Report.html      ← Visual branded report (optional)
```

Research reports should cover:
- **Business overview** — what they do, who they serve
- **Current digital presence** — website review, social media audit
- **Competitor landscape** — direct and indirect competitors
- **Market data** — industry stats, trends, growth projections
- **SWOT or gap analysis** — strengths, weaknesses, opportunities, threats
- **Immediate recommendations** — quick wins and strategic ideas
- **Talking points** — conversation starters for the meeting

---

## Repository & Deployment

- **GitHub repo:** `fnasr-source/admireworks-internal-os`
- **GitHub Pages:** enabled (uses `CNAME` for custom domain)
- **File:** `.nojekyll` present to skip Jekyll processing
