# Admireworks Direct Response Strategy Presentation System

## Overview

This file instructs Claude Code (or any AI coding assistant) to automatically generate a complete Direct Response Marketing Strategy as a **web-based interactive presentation** for any Admireworks client. The output is a self-contained folder with an HTML/CSS/JS presentation that can be opened in a browser, presented to clients, and versioned with comments.

---

## HOW TO USE

### Step 1: Place This File
Copy this file (`STRATEGY-SYSTEM.md`) into your client project folder alongside:
- The client brief document (PDF, DOCX, or text)
- The kick-off meeting transcript (if available)
- Any existing brand assets from the client

### Step 2: Run Phase 1 — Strategy Content Generation (Claude Opus)
Open Claude Code in the project folder and paste:

```
@STRATEGY-SYSTEM.md Generate the full Direct Response Marketing Strategy for this client. Use the client brief and any transcripts in this folder. Follow Phase 1 instructions completely. Output all strategy content as structured JSON in /strategy/content.json and generate the full web presentation in /strategy/presentation/.
```

### Step 3: Run Phase 2 — Visual Asset Generation (Google Gemini via AI Studio)
After Phase 1 is complete, Claude Code will generate a prompt file at `/strategy/phase2-image-prompts.md`. Take this file to **Google AI Studio** (using Gemini 2.0 Flash or Gemini 2.5 Pro with Imagen 3) and run each prompt to generate the images. Save them into `/strategy/presentation/assets/generated/`.

Alternatively, if you have API access, Claude Code will output a script at `/strategy/generate-images.sh` that calls the Gemini API directly.

### Step 4: Present
Open `/strategy/presentation/index.html` in your browser. Use two browser tabs:
- **Tab 1**: Presenter view (append `?mode=presenter` to URL)
- **Tab 2**: Client view (append `?mode=client` to URL)

Both tabs sync via `BroadcastChannel` API — advancing slides in presenter view advances the client view automatically.

---

## PHASE 1: STRATEGY CONTENT GENERATION

### Role & Context

You are an **Admireworks Senior Direct Response Marketing Strategist**. You specialize in the StoryBrand framework, direct response marketing, and creating high-converting funnels for businesses across the MENA region and beyond.

Admireworks is a venture services agency based in Dubai, UAE. Their brand promise: "Admirable Venture Services every time." They focus on helping entrepreneurs and businesses start, grow, and scale through strategy, brand, communications, technology, and marketing.

### Core Methodology

Every strategy you create must be grounded in:

1. **Direct Response Marketing Principles**: Every piece of content, ad, and funnel element must drive a measurable action. No vanity metrics — only conversion-focused KPIs.

2. **StoryBrand Framework (Donald Miller)**: Position the CLIENT'S CUSTOMER as the hero, the client's business as the guide. Structure messaging around:
   - **Character**: The customer and what they want
   - **Problem**: External, internal, and philosophical problems they face
   - **Guide**: The client's business (demonstrating empathy + authority)
   - **Plan**: Clear steps to engage
   - **Call to Action**: Direct and transitional CTAs
   - **Success**: What life looks like after
   - **Failure**: What happens if they don't act

3. **Admireworks Strategy Structure**: Follow the exact section order used across all Admireworks strategies (The Accounter, Zambalita Fit, QYD, Edrak):

### Strategy Sections (in exact order)

```
SECTION 01: COVER PAGE
- Client name
- Strategy type: "Direct Response Marketing Strategy"
- Quarter and year
- @admireworks branding
- ADMIRE8 BY ADMIREWORKS badge

SECTION 02: STRATEGY BRIEF (Visual Overview)
- 6-box grid showing the strategy structure:
  01 Situation & Objectives
  02 Audience & Competitors
  03 Campaign Strategy
  04 Social Media Strategy
  05 Measurement & Evaluation
  06 [Context-specific 6th section]

SECTION 03: CLIENT BRIEF
- Short paragraph describing the client business
- What they do, who they serve, what makes them different

SECTION 04: CURRENT SITUATION
- Current state of the business
- Key strengths and existing advantages
- What attracts clients to them currently
- What needs to change or improve

SECTION 05: CHALLENGE (Section Divider)
- "ADMIRE8 BY ADMIREWORKS" branded divider slide

SECTION 06: BIGGEST CHALLENGE(S)
- 1-3 slides detailing the primary challenges
- Each challenge gets a headline and detailed explanation
- Frame challenges as opportunities to solve

SECTION 07: CAMPAIGN GOALS
- 3-5 strategic goals written in outcome-focused language
- Aligned with the client's business objectives

SECTION 08: OBJECTIVES
- 3-4 numbered, measurable objectives
- Include specific targets (percentages, numbers)
- Note: "All numbers will be updated after strategy approval with exact KPIs"

SECTION 09: ENVIRONMENTAL SCANNING (Section Divider)
- "ADMIRE8 BY ADMIREWORKS" branded divider slide

SECTION 10: ENVIRONMENTAL SCANNING CONTENT
- 3-6 slides with market data, statistics, and insights
- Country-specific data relevant to the client's market
- Industry-specific data (market size, trends, demographics)
- Include real statistics with sources where possible

SECTION 11: DIGITAL SCANNING (Section Divider)

SECTION 12: DIGITAL ANALYSIS
- Social media platform usage by country
- Digital behavior patterns of the target audience
- Platform-specific insights

SECTION 13: COMPETITORS ANALYSIS (Section Divider)

SECTION 14: COMPETITOR PROFILES
- 3-10 competitor slides (depending on market)
- Each competitor slide includes:
  - Competitor name/tagline
  - Key services
  - Their messaging approach
  - Why they are a competitor
  - Weakness points
  - Content/social media presence
  - Language used
  - Geographic focus

SECTION 15: PRICING COMPARISON (if applicable)
- Visual comparison table of pricing

SECTION 16: UNIQUE ADVANTAGES
- What sets the client apart from competitors

SECTION 17: COMMON CONCERNS
- Address typical customer objections

SECTION 18: MARKET GAPS
- 6-9 identified gaps in the market
- Each gap: title + short description
- Presented in 2-3 column grid layout (3 per row)

SECTION 19: MARKET OPPORTUNITIES
- Mirror the gaps with actionable opportunities
- Same grid layout as gaps
- Each opportunity directly addresses a gap

SECTION 20: PERSONA BASED ON NEEDS (Section Divider)

SECTION 21: PERSONA PROFILES
- 2-4 distinct personas
- Each persona includes:
  - Demographics (Age, Gender, Location, Income Level, Interests)
  - Psychographics (Goals, Pain Points, Challenges, Opportunities)
- Persona samples: named fictional characters with age, gender, education, income, location

SECTION 22: CAMPAIGN STRATEGY (Section Divider)

SECTION 23: ANALYSIS & FINDINGS
- Summary of key strategic findings
- Data-backed conclusions

SECTION 24: CHANNELS
- Recommended marketing channels
- Platform selection with rationale

SECTION 25: DIRECT RESPONSE FUNNEL (Section Divider)

SECTION 26: FUNNEL DESIGN
- Visual funnel diagram (numbered steps)
- Typically 3-5 steps:
  1. Social Media Ads
  2. Registration/Landing Page
  3. HVCO (High Value Content Offer) delivery
  4. Sales Page / Offer
  5. Thank You Page + Follow-up
- Include retargeting loops
- Show what happens if user does NOT convert at each step

SECTION 27: HVCO (High Value Content Offer)
- Format: Video, Webinar, Quiz, Workshop, Guide, etc.
- Hook and promise
- Content outline / topics covered
- Delivery method
- Language (Arabic/English/Bilingual)

SECTION 28: LANDING PAGES
- Registration page structure
- Sales page structure
- Thank you page structure
- Each with: Headline, Description, Hook, CTA Button text

SECTION 29: AD COPY
- 3-6 ad copy variations
- Each includes: Headline, Description, Hook (body text)
- In the appropriate language (Arabic/English/both)
- Both big ad copy and retargeting ad copy
- Persona-specific variations where applicable

SECTION 30: EMAIL/WHATSAPP SEQUENCE
- Sequence outline:
  1. Thanks for registration
  2. First reminder
  3. Second reminder
  4. Last reminder
  5. Feedback email
  6. Flash offer (48hrs)

SECTION 31: PARTNERSHIPS (if applicable)
- Suggested partnership types
- Specific partnership targets
- Benefits for partners
- Partnership funnel

SECTION 32: SOCIAL MEDIA STRATEGY (Section Divider)

SECTION 33: CONTENT DIRECTION
- Content themes and pillars
- Storytelling approach
- Content formats
- Weekly content rhythm

SECTION 34: MEASUREMENT & EVALUATION (Section Divider)

SECTION 35: CAMPAIGN TRACKING
- Website tracking metrics
- Lead metrics
- Conversion metrics
- ROAS metrics
- Reporting cadence

SECTION 36: THANK YOU / CLOSING
- "THANK YOU... For Your Attention"
- @admireworks
- Contact information:
  (+971) 4295 8666
  hello@admireworks.com
  P.O.Box/36846, DXB, UAE
  admire8.admireworks.com
- ADMIRE8 BY ADMIREWORKS badge
```

### Content Generation Rules

1. **Tone**: Authoritative, practical, conversion-focused. No fluff. Every statement should lead to action.
2. **Language**: Match the client's market. If the client serves Arabic-speaking markets, ad copy and landing page content MUST be in Arabic. Strategy analysis can be in English.
3. **Data**: Use real, verifiable market data. Include statistics with approximate sources. If exact data is unavailable, use reasonable estimates clearly marked as estimates.
4. **StoryBrand Integration**: The messaging strategy section must explicitly use the StoryBrand framework elements (Character, Problem, Guide, Plan, CTA, Success, Failure).
5. **Funnel Design**: Always include retargeting loops. Never design a linear-only funnel.
6. **HVCO**: The High Value Content Offer must be genuinely valuable — not a thinly veiled sales pitch. It should solve a real micro-problem for the target audience.
7. **Bilingual Support**: For MENA clients, provide Arabic content with RTL formatting support. Use font "Noor" for Arabic text in the presentation.

### Output Format

Generate a file at `/strategy/content.json` with this structure:

```json
{
  "meta": {
    "client_name": "Client Name",
    "strategy_type": "Direct Response Marketing Strategy",
    "quarter": "Q4",
    "year": "2025",
    "language": "en",
    "rtl_support": true,
    "created_date": "2025-01-15",
    "version": "1.0",
    "versions": [
      {
        "version": "1.0",
        "date": "2025-01-15",
        "notes": "Initial strategy",
        "comments": []
      }
    ]
  },
  "slides": [
    {
      "id": "slide-001",
      "section": "cover",
      "layout": "cover",
      "content": {
        "title": "Direct Response Marketing Strategy",
        "client_name": "Client Name",
        "period": "Q4 - 2025",
        "branding": "@admireworks"
      },
      "presenter_notes": "Welcome everyone. Today we present the direct response marketing strategy for [Client Name]...",
      "comments": [],
      "image_needed": false
    },
    {
      "id": "slide-002",
      "section": "strategy_brief",
      "layout": "grid-6",
      "content": {
        "boxes": [
          {"number": "01", "title": "Situation & Objectives"},
          {"number": "02", "title": "Audience & Competitors"},
          {"number": "03", "title": "Campaign Strategy"},
          {"number": "04", "title": "Social Media Strategy"},
          {"number": "05", "title": "Measurement & Evaluation"},
          {"number": "06", "title": "Context-specific"}
        ]
      },
      "presenter_notes": "Here is our strategy overview...",
      "comments": [],
      "image_needed": false
    }
  ]
}
```

Each slide object must include:
- `id`: Unique slide identifier
- `section`: Which strategy section it belongs to
- `layout`: One of the predefined layouts (see Layout System below)
- `content`: Section-specific content object
- `presenter_notes`: What the presenter should say (visible only in presenter view)
- `comments`: Array of comment objects `{author, date, text, resolved}` — starts empty
- `image_needed`: Boolean — if true, also include `image_prompt` for Phase 2

---

## PHASE 2: VISUAL ASSET GENERATION

### Image Prompt File

After Phase 1, generate `/strategy/phase2-image-prompts.md` containing prompts optimized for **Google Imagen 3** (via Gemini 2.0 Flash or Gemini 2.5 Pro on AI Studio).

Format:

```markdown
# Phase 2: Image Generation Prompts
## Instructions
Run each prompt below in Google AI Studio using Gemini with Imagen 3.
Save each generated image with the filename specified.
Place all images in: /strategy/presentation/assets/generated/

---

### Image 1: [slide-id]
**Filename:** slide-003-bg.png
**Dimensions:** 1920x1080
**Prompt:**
[Detailed Imagen 3 prompt here - professional, brand-aligned imagery]

---

### Image 2: [slide-id]
**Filename:** slide-010-illustration.png
**Dimensions:** 800x600
**Prompt:**
[Detailed prompt]
```

### Image Prompt Guidelines for Imagen 3

1. **Style**: Professional, corporate, clean. Align with Admireworks brand — navy blue (#001a70) and gold (#cc9f53) as dominant colors.
2. **Types of images needed**:
   - Section divider backgrounds (abstract geometric patterns using brand colors)
   - Persona illustrations (professional character portraits)
   - Funnel diagrams (clean, modern flowcharts)
   - Data visualization backgrounds
   - Market/industry imagery
3. **Never generate**: Text in images (text is handled by HTML/CSS), logos (use the actual logo files), screenshots of real websites.
4. **Prompt format**: Always specify "professional corporate marketing presentation slide, clean modern design, navy blue (#001a70) and gold (#cc9f53) color palette" as base context.

---

## PRESENTATION ENGINE

### File Structure to Generate

```
/strategy/
├── content.json                    # Strategy content data
├── phase2-image-prompts.md         # Imagen 3 prompts for Phase 2
├── generate-images.sh              # Optional: API script for image generation
├── presentation/
│   ├── index.html                  # Main presentation file
│   ├── styles.css                  # All presentation styles
│   ├── app.js                      # Presentation engine + sync + comments
│   ├── assets/
│   │   ├── fonts/
│   │   │   ├── jaymont/            # Copy from brand fonts
│   │   │   ├── akkurat-pro/        # Copy from brand fonts
│   │   │   └── noor/               # Copy from brand fonts
│   │   ├── brand/
│   │   │   ├── logo.png            # Admireworks logo
│   │   │   ├── brandmark.png       # Admireworks brandmark
│   │   │   └── pattern.svg         # Brand pattern (generated)
│   │   └── generated/              # Phase 2 images go here
│   └── versions/                   # Versioned snapshots
│       └── v1.0/
│           └── content.json        # Snapshot of v1.0 content
```

### Presentation Engine Specification (index.html + app.js + styles.css)

#### Core Features

1. **Two-Tab Sync System**
   - `?mode=presenter` — Shows current slide + presenter notes + comments panel + slide navigator
   - `?mode=client` — Shows current slide only, clean view, no notes
   - Sync mechanism: `BroadcastChannel('aw-strategy-sync')`
   - Presenter tab sends `{type: 'navigate', slideIndex: N}` messages
   - Client tab receives and updates accordingly
   - Both tabs work in the same browser, separate windows

2. **Slide Navigation**
   - Arrow keys (left/right) to navigate
   - Slide number indicator (e.g., "12 / 45")
   - Clickable slide thumbnails in presenter view sidebar
   - Touch/swipe support for tablet presentations

3. **Comment System**
   - In presenter view: comment panel per slide
   - Add comments with author name and text
   - Comments are timestamped
   - Comments persist in localStorage and can be exported
   - "Export Comments" button downloads a JSON file with all comments organized by slide
   - Comments can be marked as resolved

4. **Version Management**
   - Version selector dropdown in presenter view
   - "Save as New Version" button — snapshots current content.json with all comments
   - Version history panel showing all versions with dates and notes
   - Compare versions (shows which slides changed)

5. **Keyboard Shortcuts (Presenter View)**
   - `→` or `Space` — Next slide
   - `←` — Previous slide
   - `F` — Toggle fullscreen
   - `C` — Toggle comment panel
   - `N` — Toggle presenter notes
   - `Esc` — Exit fullscreen
   - `Home` — First slide
   - `End` — Last slide

#### Layout System

The presentation engine must support these slide layouts:

```
LAYOUTS:
─────────────────────────────────────────────

"cover"
┌─────────────────────────────────────────┐
│                                         │
│            [BRANDMARK]                  │
│                                         │
│     Direct Response Marketing           │
│           Strategy                      │
│                                         │
│         CLIENT NAME                     │
│          Q4 - 2025                      │
│                                         │
│         @admireworks                    │
│                                         │
└─────────────────────────────────────────┘

"section-divider"
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│         SECTION TITLE                   │
│                                         │
│         ADMIRE8                         │
│         BY ADMIREWORKS                  │
│                                         │
│                                         │
└─────────────────────────────────────────┘

"title-body"
┌─────────────────────────────────────────┐
│  Section Title                          │
│                                         │
│  Body text paragraph with key           │
│  information about the topic.           │
│  Can include multiple paragraphs.       │
│                                         │
│                                         │
└─────────────────────────────────────────┘

"title-bullets"
┌─────────────────────────────────────────┐
│  Section Title                          │
│                                         │
│  • Bullet point one                     │
│  • Bullet point two                     │
│  • Bullet point three                   │
│                                         │
│                                         │
└─────────────────────────────────────────┘

"title-image"
┌─────────────────────────────────────────┐
│  Section Title          ┌──────────┐    │
│                         │          │    │
│  Body text on the       │  IMAGE   │    │
│  left side with         │          │    │
│  key information.       │          │    │
│                         └──────────┘    │
│                                         │
└─────────────────────────────────────────┘

"image-title"
┌─────────────────────────────────────────┐
│  ┌──────────┐           Section Title   │
│  │          │                           │
│  │  IMAGE   │           Body text on    │
│  │          │           the right side  │
│  │          │           with key info.  │
│  └──────────┘                           │
│                                         │
└─────────────────────────────────────────┘

"grid-6"
┌─────────────────────────────────────────┐
│                                         │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │  01  │  │  02  │  │  03  │          │
│  │ Box1 │  │ Box2 │  │ Box3 │          │
│  └──────┘  └──────┘  └──────┘          │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │  04  │  │  05  │  │  06  │          │
│  │ Box4 │  │ Box5 │  │ Box6 │          │
│  └──────┘  └──────┘  └──────┘          │
│                                         │
└─────────────────────────────────────────┘

"grid-3"
┌─────────────────────────────────────────┐
│  Section Title                          │
│                                         │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Title    │ │ Title    │ │ Title   │ │
│  │ Body     │ │ Body     │ │ Body    │ │
│  │ text     │ │ text     │ │ text    │ │
│  └──────────┘ └──────────┘ └─────────┘ │
│                                         │
└─────────────────────────────────────────┘

"comparison-table"
┌─────────────────────────────────────────┐
│  Section Title                          │
│                                         │
│  ┌─────────┬────────┬────────┐          │
│  │ Name    │ Price  │ Notes  │          │
│  ├─────────┼────────┼────────┤          │
│  │ Comp A  │ $100   │ ...    │          │
│  │ Comp B  │ $200   │ ...    │          │
│  └─────────┴────────┴────────┘          │
│                                         │
└─────────────────────────────────────────┘

"persona"
┌─────────────────────────────────────────┐
│  Persona Name                           │
│  ┌────────┐                             │
│  │ AVATAR │  Demographics               │
│  │        │  Age: 30                     │
│  └────────┘  Gender: Male               │
│              Location: UAE              │
│                                         │
│  Psychographics                         │
│  Goals: ...                             │
│  Pain Points: ...                       │
│  Challenges: ...                        │
│                                         │
└─────────────────────────────────────────┘

"persona-samples"
┌─────────────────────────────────────────┐
│  ┌────────┐  ┌────────┐  ┌────────┐    │
│  │ Name   │  │ Name   │  │ Name   │    │
│  │ Avatar │  │ Avatar │  │ Avatar │    │
│  │ Age    │  │ Age    │  │ Age    │    │
│  │ Info   │  │ Info   │  │ Info   │    │
│  └────────┘  └────────┘  └────────┘    │
│                                         │
└─────────────────────────────────────────┘

"funnel"
┌─────────────────────────────────────────┐
│  Funnel Title                           │
│                                         │
│  [1]──→[2]──→[3]──→[4]──→[5]          │
│   │           │                         │
│   └──RETARGET─┘                         │
│                                         │
└─────────────────────────────────────────┘

"ad-copy"
┌─────────────────────────────────────────┐
│  Ad Copy [#]                            │
│                                         │
│  Headline: ...                          │
│  Description: ...                       │
│  Hook: ...                              │
│                                         │
│                                         │
└─────────────────────────────────────────┘

"stat-highlight"
┌─────────────────────────────────────────┐
│                                         │
│           [BIG NUMBER]                  │
│           557,000                       │
│     SMEs in the UAE as of 2022          │
│                                         │
│                                         │
└─────────────────────────────────────────┘

"closing"
┌─────────────────────────────────────────┐
│                                         │
│        THANK YOU...                     │
│        For Your Attention               │
│                                         │
│        @admireworks                     │
│        (+971) 4295 8666                 │
│        hello@admireworks.com            │
│        admire8.admireworks.com          │
│                                         │
│        [LOGO]                           │
│        ADMIRE8 BY ADMIREWORKS           │
│                                         │
└─────────────────────────────────────────┘

"full-image"
┌─────────────────────────────────────────┐
│                                         │
│            [FULL BLEED IMAGE]           │
│       with optional text overlay        │
│                                         │
└─────────────────────────────────────────┘
```

#### CSS Design System

```css
/* ============================================
   ADMIREWORKS STRATEGY PRESENTATION
   Design Tokens & Variables
   ============================================ */

:root {
  /* Primary Colors */
  --aw-navy: #001a70;
  --aw-gold: #cc9f53;

  /* Secondary Colors */
  --aw-berry-blue: #44756a;
  --aw-tomato: #d44315;
  --aw-apricot: #ea5c2e;
  --aw-mango: #fab700;
  --aw-jumeirah: #66bc99;

  /* Neutral Colors */
  --aw-white: #ffffff;
  --aw-off-white: #f8f7f4;
  --aw-light-gray: #e8e6e1;
  --aw-medium-gray: #9a9890;
  --aw-dark-gray: #3a3a38;
  --aw-black: #1a1a1a;

  /* Typography */
  --font-headline: 'Jaymont', serif;
  --font-body: 'Akkurat Pro', sans-serif;
  --font-arabic: 'Noor', sans-serif;
  --font-mono: 'Akkurat Pro Mono', monospace;

  /* Spacing (8px grid) */
  --space-xs: 8px;
  --space-sm: 16px;
  --space-md: 24px;
  --space-lg: 40px;
  --space-xl: 64px;
  --space-2xl: 96px;

  /* Slide Dimensions (16:9) */
  --slide-width: 1920px;
  --slide-height: 1080px;
  --slide-padding: 80px;

  /* Brand Pattern */
  --pattern-opacity: 0.10;
  --pattern-stroke: 1px;
}

/* Font Sizes for Slides */
.slide-title        { font-family: var(--font-headline); font-weight: 700; font-size: 56px; }
.slide-subtitle     { font-family: var(--font-headline); font-weight: 500; font-size: 36px; }
.slide-body         { font-family: var(--font-body); font-weight: 400; font-size: 24px; line-height: 1.6; }
.slide-caption      { font-family: var(--font-body); font-weight: 300; font-size: 18px; }
.slide-stat-number  { font-family: var(--font-headline); font-weight: 700; font-size: 120px; }
.slide-label        { font-family: var(--font-body); font-weight: 700; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; }

/* Arabic text */
[dir="rtl"], .arabic { font-family: var(--font-arabic); direction: rtl; text-align: right; }

/* Brand Pattern SVG (for backgrounds) */
/* The mountain pattern from the Admireworks logo, repeated at 10% opacity */
/* Generate as SVG in the build step */
```

#### Presenter View Layout

```
┌────────────────────────────────────────────────────────────────┐
│ PRESENTER VIEW                              [Version: v1.0 ▾] │
├──────────┬─────────────────────────────────┬───────────────────┤
│          │                                 │                   │
│ SLIDE    │      CURRENT SLIDE              │  PRESENTER NOTES  │
│ LIST     │      (Large Preview)            │                   │
│          │                                 │  "Welcome to the  │
│ [01] ■   │                                 │   strategy pres..." │
│ [02]     │                                 │                   │
│ [03]     │                                 ├───────────────────┤
│ [04]     │                                 │  COMMENTS         │
│ [05]     │                                 │                   │
│ ...      │                                 │  [+] Add comment  │
│          │                                 │                   │
│          │                                 │  💬 "Consider     │
│          │                                 │   adding more     │
│          │                                 │   data here"      │
│          │                                 │   — Ahmad, Jan 15 │
│          │                                 │   [✓ Resolve]     │
│          ├─────────────────────────────────┤                   │
│          │  NEXT SLIDE (Small Preview)     │                   │
│          │                                 │                   │
├──────────┴─────────────────────────────────┴───────────────────┤
│  ◀ Prev  │  Slide 12 / 45  │  Next ▶  │  [F]ull  [C]omments  │
└────────────────────────────────────────────────────────────────┘
```

---

## BRAND GUIDELINES REFERENCE

### Logo Usage
- Primary logo: `logo.png` — Use on cover slides and closing slides
- Brandmark: `brandmark.png` — Use on section dividers and slide corners
- Minimum size: 85px on screen
- Clear space: Width of the "M" in ADMIREWORKS on all 4 sides
- Logo placement: Bottom-left or top-left of slides

### Color Usage Rules
- **Navy (#001a70)**: Primary background for section dividers, text color on light backgrounds
- **Gold (#cc9f53)**: Accent highlights, numbers, statistics, underlines
- **White (#ffffff)**: Primary text on dark backgrounds, slide backgrounds
- **Off-white (#f8f7f4)**: Alternate slide backgrounds for visual variety
- Secondary colors: Use sparingly for charts, diagrams, and visual differentiation

### Typography Rules
- **Jaymont Bold**: Slide titles, section headers, stat numbers
- **Jaymont Medium**: Subtitles, emphasis text
- **Akkurat Pro Regular**: Body text, descriptions, presenter notes
- **Akkurat Pro Light**: Captions, labels, metadata
- **Akkurat Pro Bold**: Inline emphasis, key terms
- **Noor Regular/Bold**: All Arabic body and headline text

### Brand Pattern
- Mountain-line pattern derived from the Admireworks logomark
- Use at 10% opacity as background texture
- Blue lines on white background OR white lines on blue background
- Never at more than 10% opacity

### Section Divider Style
- Full navy blue (#001a70) background
- Section title in Jaymont Bold, white, centered
- "ADMIRE8 BY ADMIREWORKS" badge below the title
- Optional: brand pattern at 10% opacity in background

---

## IMPLEMENTATION INSTRUCTIONS FOR CLAUDE CODE

When you receive the command to generate a strategy, follow this exact sequence:

### Step 1: Read & Analyze Input
1. Read all files in the current directory (client brief, transcripts, any existing materials)
2. Identify: client name, industry, target market, language requirements, existing assets

### Step 2: Generate Strategy Content
1. Create `/strategy/` directory
2. Work through each strategy section in order
3. For each section, generate:
   - Content following the exact Admireworks format
   - Presenter notes (what to say when presenting this slide)
   - Identify which slides need generated images
4. Save complete strategy as `/strategy/content.json`

### Step 3: Generate Presentation Engine
1. Create `/strategy/presentation/` directory structure
2. Generate `index.html` — single-page application that:
   - Loads content.json
   - Renders slides based on layout type
   - Implements presenter/client view modes
   - Implements BroadcastChannel sync
   - Implements comment system with localStorage persistence
   - Implements version management
3. Generate `styles.css` — complete brand-aligned stylesheet
4. Generate `app.js` — presentation engine logic
5. Copy font files and brand assets into the assets directory

### Step 4: Generate Phase 2 Prompts
1. For each slide where `image_needed: true`, create an Imagen 3 prompt
2. Save all prompts to `/strategy/phase2-image-prompts.md`
3. Optionally generate `generate-images.sh` for API-based generation

### Step 5: Verify & Report
1. Verify all files are created
2. Provide a summary of:
   - Total slides generated
   - Number of images needed for Phase 2
   - Instructions for opening the presentation
   - Any assumptions made that need client confirmation

---

## COMMENT EXPORT FORMAT

When exporting comments, use this format:

```json
{
  "export_date": "2025-01-20",
  "client": "Client Name",
  "version": "1.0",
  "total_comments": 15,
  "slides_with_comments": [
    {
      "slide_id": "slide-005",
      "slide_title": "Biggest Challenge",
      "comments": [
        {
          "author": "Ahmad",
          "date": "2025-01-16",
          "text": "Client wants to emphasize this more strongly",
          "resolved": false
        },
        {
          "author": "Sara",
          "date": "2025-01-16",
          "text": "Agreed — add supporting data from the brief",
          "resolved": false
        }
      ]
    }
  ]
}
```

---

## VERSION MANAGEMENT

When creating a new version:
1. Snapshot current `content.json` (with all comments) to `/strategy/presentation/versions/v{X.Y}/content.json`
2. Increment version in `content.json` meta
3. Add version entry to the versions array with date and notes
4. Clear resolved comments from the active version (keep unresolved)
5. The presentation engine shows a version dropdown to compare

---

## QUICK REFERENCE: ADMIREWORKS STRATEGY DNA

Every Admireworks strategy follows this DNA:

1. **Start with empathy** — Show you understand the client's world before prescribing solutions
2. **Data before opinion** — Environmental scanning and competitor analysis provide the evidence base
3. **Gaps reveal opportunities** — Market gaps directly map to market opportunities
4. **Persona-driven** — Everything flows from deeply understood personas
5. **Funnel thinking** — Every strategy culminates in a clear conversion funnel
6. **Direct response** — Every touchpoint must drive a measurable action
7. **Retargeting is non-negotiable** — Always plan for the "no" path
8. **HVCO is the bridge** — The High Value Content Offer connects awareness to conversion
9. **Bilingual where needed** — MENA clients need Arabic content, not just English
10. **Measurement closes the loop** — Clear KPIs and tracking from day one
