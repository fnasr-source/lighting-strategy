# Autonomous Proposal Generation Playbook
## The Admireworks Growth Partnership Proposal System

> **Purpose:** This playbook enables an agentic AI (Antigravity) to autonomously produce premium, visually engaging Growth Partnership Proposals from a single initial prompt — no further human interaction required.
>
> **Reference Standard:** The [Ein Abaya Growth Partnership Proposal](file:///Users/user/Documents/IDE%20Projects/Internal%20AW%20SOP/drafts/Ein%20Abaya%20—%20Growth%20Partnership%20Proposal.pdf) — an 11-page, bilingual, premium proposal with mockups, comparison tables, and consultative pricing.

---

## How to Trigger

A single prompt is all that is needed. Example:

```
Build a Growth Partnership Proposal for [CLIENT NAME].
Use the Autonomous Proposal System playbook.
Reference materials: [link to transcript, brief, or existing folder]
```

The agent will then execute Phases 0–7 below without further interaction.

---

## Phase 0: Intake — Parse the Brief

**Goal:** Extract all knowable facts from the initial prompt and any linked materials.

### Inputs (one or more of):
- Client name and industry
- Meeting transcript (`.md` file)
- Existing research files (if any)
- Client website URL
- Social media handles
- Specific pain points mentioned by the user

### Actions:
1. Read the transcript/brief and extract:
   - Client company name, key contacts, and roles
   - Industry vertical and target markets (B2B, B2C, or both)
   - Current pain points and goals (in the client's own words)
   - Product/service description
   - Geographic focus
   - Budget signals or price sensitivity
   - Competitive mentions
2. Check for existing research in `Proposals/{Client}/`
3. Check Knowledge Items for relevant industry or pattern data
4. Output: structured `00-Client-Brief.md` saved to `Proposals/{Client}/proposal/`

### Client Brief Template:
```markdown
# Client Brief: {Client Name}
**Industry:** {industry}
**Contacts:** {names, roles}
**Geography:** {target markets}
**Business Model:** {B2B / B2C / Both}
**Current Pain Points:** {list from transcript}
**Goals:** {what success looks like}
**Budget Signals:** {any pricing sensitivity}
**Existing Digital Presence:** {website, socials}
**Competitors Mentioned:** {names}
```

---

## Phase 1: Deep Research — Browser + API Intelligence

**Goal:** Build a comprehensive intelligence picture through live research.

### 1.1 Client Website Audit
**Tool:** `browser_subagent`

- Navigate to the client's website
- Capture screenshots of: homepage, product pages, contact page, about page
- Assess and score (1-10): Design, UX, E-commerce capability, SEO basics, mobile responsiveness, content quality, Arabic/local language support
- Note: pricing transparency, call-to-action quality, trust signals present
- Identify CMS/platform (WordPress, Shopify, custom, etc.)

### 1.2 Social Media Audit
**Tool:** `browser_subagent`

For each platform (Facebook, Instagram, TikTok, YouTube, LinkedIn):
- Navigate to client's profile
- Record: follower count, post frequency, engagement rate (reactions/comments vs followers)
- Assess content quality, consistency, localization
- Note: missing platforms, last post date, bio completeness
- Capture 2-3 representative screenshots

### 1.3 Competitor Research
**Tool:** `browser_subagent` + `search_web`

For 3-5 key competitors:
- Identify competitors via web search: `"{industry}" "{country}" competitors`
- Visit each competitor's website and social profiles
- Record same metrics as client audit
- Build a comparison matrix

### 1.4 Market Data Research
**Tool:** `search_web` + `read_url_content`

- Search for: `"{industry}" "{country}" market size growth report`
- Search for: `"{industry}" trends {current year}`
- Search for: `"{country}" digital marketing landscape`
- Extract: market size, growth rate (CAGR), key trends, regulatory factors
- Note source URLs for citations

### 1.5 Cultural & Regional Context
**Tool:** `search_web`

- Payment methods popular in the region (InstaPay, Fawry, Mada, etc.)
- E-commerce platform preferences (Shopify, Salla, Zid, WooCommerce)
- Social media platform preferences by country
- Language and localization requirements
- Religious/seasonal considerations (Ramadan, local holidays)

### Output:
- Save all research as `01-Research-Raw.md` in `Proposals/{Client}/proposal/`
- Save screenshots to `Proposals/{Client}/proposal/assets/research/`

---

## Phase 2: Intelligence Synthesis

**Goal:** Transform raw research into structured, narrative-ready intelligence.

### 2.1 Research Report
Create `02-Research-Report.md` with sections:
1. Executive Summary (3-5 sentences, the "so what")
2. Brand Overview (global + local entity)
3. Product/Service Portfolio
4. Digital Presence Audit (website + social scores)
5. Market Analysis (size, growth, trends)
6. Distribution/Sales Channels
7. Key Data Sources

### 2.2 Competitor Scan
Create `03-Competitor-Scan.md` with:
1. Competitive Landscape Overview
2. 3-5 Competitor Profiles (positioning, strengths, weaknesses, digital presence, threat level)
3. Feature Comparison Matrix (table with ✅/❌/🟡 symbols)
4. Competitive Positioning Map (text-based quadrant)
5. Market Opportunity Assessment

### 2.3 SWOT Analysis
Integrated into the Research Report:
- Strengths (internal advantages)
- Weaknesses (internal gaps)
- Opportunities (external possibilities)
- Threats (external risks)

### 2.4 Opportunity Matrix
Create a ranked list of specific, actionable opportunities:

| Priority | Opportunity | Impact | Effort | Quick Win? |
|----------|------------|--------|--------|------------|
| 1 | ... | High | Low | ✅ |

---

## Phase 3: Proposal Architecture

**Goal:** Design the page-by-page structure of the proposal document.

### Standard Page Flow (12-14 pages)

| Page | Layout Type | Purpose |
|------|------------|---------|
| 1 | `cover` | Title, client name, date, AW branding |
| 2 | `credentials` | Who We Are + Proven Results (establish trust) |
| 3 | `stats-hero` | Market Opportunity (big numbers, urgency) |
| 4 | `heritage` | Client's brand strengths (dignify the client) |
| 5 | `audit-grid` | Digital Audit scores (diagnose the problem) |
| 6 | `comparison-table` | Competitor Feature Matrix (show the gap) |
| 7 | `insight-hero` | "The Big Insight" — the core strategic message |
| 8 | `mockup-showcase` | Before/After or proposed experience visuals |
| 9 | `scope-cards` | 6x Scope of Work cards with icons |
| 10 | `roadmap` | 90-day phased execution plan |
| 11 | `pricing` | Investment / Service packages |
| 12 | `next-steps` | 1-5 numbered onboarding process |
| 13 | `closing` | Thank you + contact info |

### Content Mapping Rules:
- Each page should have a **clear single message**
- Use the client's **own language** from the transcript where possible
- **Bilingual sections** (if applicable): English heading + Arabic subtitle
- **Data-driven:** Every claim must reference research data
- **Visual-heavy:** At least 50% of each page should be visual (icons, stats, cards, images)

---

## Phase 4: Visual Asset Generation

**Goal:** Create all images, mockups, and visual elements needed.

### 4.1 Generated Images
**Tool:** `generate_image`

Required assets (generate with contextually appropriate prompts):

| Asset | Prompt Pattern |
|-------|---------------|
| Cover background | "Premium dark textured background with subtle geometric patterns, {brand colors}, luxury corporate feel, 1920x1080" |
| Credentials section | "Professional business team meeting, corporate photography style, warm lighting, 800x400" |
| Device mockups | "iPhone and MacBook mockup showing {client industry} mobile app/website, clean white background, premium product photography" |
| Before/After comparison | "Side-by-side comparison: left side shows basic/outdated website, right side shows modern premium website, split screen design" |
| Roadmap graphic | "90-day business roadmap visualization, timeline infographic, modern flat design, {brand colors}" |
| Scope icons | Generate or use emoji/SVG for: 🌐 Strategy, 📦 Build, 📊 Analytics, 🎯 Ads, 🤝 Community, 🎬 Content |

### 4.2 Screenshots from Research
- Crop and annotate website screenshots (red circles/arrows for issues)
- Crop social media screenshots showing engagement stats

### 4.3 Asset Organization
Save all assets to: `Proposals/{Client}/proposal/assets/`
```
assets/
├── brand/          # AW logos, brandmark
├── generated/      # AI-generated images
├── research/       # Screenshots from browser research
└── icons/          # SVG or emoji-based icons
```

---

## Phase 5: HTML/CSS Build

**Goal:** Construct the proposal as a paginated, print-ready HTML document.

### 5.1 HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{Client} — Growth Partnership Proposal | Admireworks</title>
  <link rel="stylesheet" href="../../Autonomous-Proposal-System/templates/proposal-base.css">
  <link rel="stylesheet" href="proposal.css"> <!-- Client-specific overrides -->
</head>
<body class="print-mode">
  <section class="page cover">...</section>
  <section class="page credentials">...</section>
  <!-- One <section class="page"> per page -->
</body>
</html>
```

### 5.2 CSS Architecture
Two layers:
1. **Base CSS** (`templates/proposal-base.css`): Shared across all proposals
   - A4 page sizing (210mm × 297mm)
   - `@media print` rules with `break-after: page`
   - Typography scale (Jaymont headings, Akkurat Pro body)
   - Layout utilities (`.page`, `.stats-grid`, `.scope-cards`, `.comparison-table`)
   - Print color preservation (`-webkit-print-color-adjust: exact`)

2. **Client CSS** (`proposal.css`): Per-proposal overrides
   - Client-specific color variables
   - Background images
   - Custom accent colors

### 5.3 Design System

**Color Palette (per-proposal, with defaults):**
```css
:root {
  /* AW Brand (always present) */
  --aw-navy: #001a70;
  --aw-gold: #cc9f53;
  
  /* Proposal Theme (override per client) */
  --prop-bg-dark: #1a2e1a;     /* Deep forest green (Ein Abaya style) */
  --prop-bg-light: #f5f0e8;    /* Warm cream */
  --prop-accent: #cc9f53;       /* Gold */
  --prop-text-light: #ffffff;
  --prop-text-dark: #1a1a1a;
  --prop-card-bg: #ffffff;
  --prop-success: #2ecc71;
  --prop-warning: #e74c3c;
}
```

**Page Layouts Available:**
- `cover` — Full-bleed background, centered title
- `credentials` — Two-column: team bios + venture description
- `stats-hero` — 3x large stat callouts + supporting text
- `audit-grid` — 3x score cards (green/yellow/red indicators)
- `comparison-table` — Full-width feature matrix
- `insight-hero` — Big statement + 3x supporting highlights
- `mockup-showcase` — Device images with annotations
- `scope-cards` — 2x3 grid of service cards with icons
- `roadmap` — 3-phase timeline with milestones
- `pricing-cards` — 2-3 tiered packages
- `next-steps` — Numbered process flow
- `closing` — Dark background, centered logo + contact

### 5.4 Content Writing Style
- **Headlines:** Bold, active voice, benefit-focused ("Own Car Care in Egypt")
- **Body:** Concise bullets, data-backed, no fluff
- **Numbers:** Large, bold, with context ("$1.6B — Egypt's Automotive Aftermarket")
- **Bilingual:** English primary, Arabic secondary labels where applicable
- **Tone:** Consultative partner, not vendor — "We" and "Together"

---

## Phase 6: PDF Generation

**Goal:** Render the HTML proposal into a polished PDF.

### 6.1 Generation Script
**Tool:** `run_command`

```bash
node "Proposals/Autonomous-Proposal-System/scripts/generate-proposal-pdf.js" \
  "Proposals/{Client}/proposal/proposal.html" \
  "Proposals/{Client}/proposal/{Client} — Growth Partnership Proposal.pdf"
```

### 6.2 PDF Configuration
- Format: A4 (210mm × 297mm)
- Margins: 0 (controlled in CSS)
- `printBackground: true` (critical for colored backgrounds)
- `preferCSSPageSize: true` (respect CSS page breaks)
- Viewport: 1200px width
- Wait: `networkidle0` (ensure all images loaded)

---

## Phase 7: Quality Assurance

**Goal:** Verify the proposal meets the premium standard.

### 7.1 Browser Verification
**Tool:** `browser_subagent`

Open the HTML in the browser and check:
- [ ] All pages render with correct layout
- [ ] No content overflow or cutoff
- [ ] Images load correctly
- [ ] Fonts render (Jaymont, Akkurat Pro)
- [ ] Colors match design spec
- [ ] Print preview shows clean page breaks

### 7.2 PDF Verification
**Tool:** `browser_subagent`

Open the generated PDF and check:
- [ ] All pages present (count matches expected)
- [ ] No blank pages between content
- [ ] Background colors render in PDF
- [ ] Images are sharp (not blurry/pixelated)
- [ ] Text is selectable (not rasterized)
- [ ] File size is reasonable (500KB-5MB range)

### 7.3 Content Verification Checklist
- [ ] Client name spelled correctly throughout
- [ ] All data points have research backing
- [ ] No placeholder text remaining
- [ ] Contact information is correct
- [ ] Date is current
- [ ] Pricing matches current AW growth packages
- [ ] All links (if any) are functional

### 7.4 Quality Comparison
Compare against the Ein Abaya reference on:
- [ ] Visual polish (premium feel, not "template-y")
- [ ] Information density (not too sparse, not overwhelming)
- [ ] Consultative flow (problem → diagnosis → solution → investment → next steps)
- [ ] Client dignity (positions the client positively, not just listing problems)

---

## File Structure Summary

```
Proposals/
├── Autonomous-Proposal-System/
│   ├── PLAYBOOK.md                          ← This file (the SOP)
│   ├── templates/
│   │   ├── proposal-base.css                ← Shared CSS foundation
│   │   └── proposal-base.js                 ← Minimal shared JS
│   └── scripts/
│       └── generate-proposal-pdf.js         ← Puppeteer PDF renderer
│
└── {Client}/
    └── proposal/
        ├── proposal.html                    ← The proposal document
        ├── proposal.css                     ← Client-specific CSS overrides
        ├── proposal.pdf                     ← Generated PDF output
        └── assets/
            ├── brand/                       ← AW logos
            ├── generated/                   ← AI-generated images
            └── research/                    ← Browser screenshots
```

---

## Prompt Templates for Each Phase

### Phase 1 Research Prompt (for self-use):
```
Research {Client Name} for a Growth Partnership Proposal:
1. Browse their website at {URL} — audit design, UX, e-commerce, SEO, mobile, content
2. Check their social media: Facebook, Instagram, TikTok, YouTube, LinkedIn
3. Search for 3-5 competitors in {industry} in {country}
4. Search for market data: "{industry}" "{country}" market size growth rate
5. Note payment methods and e-commerce platforms popular in {country}
Save screenshots and notes.
```

### Phase 4 Asset Generation Prompts:
```
Cover: "Elegant dark {industry theme} background, subtle geometric pattern overlay, 
        premium corporate feel, deep {brand color} tones, high-resolution texture"

Mockup: "Professional smartphone and laptop mockup displaying a modern {industry} 
         e-commerce website, clean white background, product photography style"

Comparison: "Split-screen before and after website redesign, left side: basic outdated 
            design, right side: modern premium responsive design, clean visualization"
```

---

## Estimated Autonomous Execution Time

| Phase | Estimated Time |
|-------|---------------|
| Phase 0: Intake | 2-3 minutes |
| Phase 1: Deep Research | 15-25 minutes |
| Phase 2: Synthesis | 5-10 minutes |
| Phase 3: Architecture | 3-5 minutes |
| Phase 4: Visual Assets | 10-15 minutes |
| Phase 5: HTML/CSS Build | 15-25 minutes |
| Phase 6: PDF Generation | 2-3 minutes |
| Phase 7: QA | 5-10 minutes |
| **Total** | **~60-90 minutes** |

---

*Created by Admireworks · March 2026*
