# Admireworks Direct Response Strategy Presentation System

## Overview

This file instructs Claude Code (or any AI coding assistant) to automatically generate a complete Direct Response Marketing Strategy as a **web-based interactive presentation** for any Admireworks client. The output is a self-contained folder with an HTML/CSS/JS presentation that can be opened in a browser, presented to clients, and versioned with comments.

---

## HOW TO USE

### Step 1: Place This File
Copy the `strategy-kit/` folder into your client project root alongside:
- The client brief document (PDF, DOCX, or text)
- The kick-off meeting transcript (if available)
- Any existing brand assets from the client

### Step 2: Run Phase 1 — Strategy + Presentation (Claude Opus)
Open Claude Code in the project folder and use the prompt from INSTRUCTIONS.md.

### Step 3: Run Phase 2 — Visual Assets (Google Antigravity + Nano Banana Pro)
After Phase 1, Claude generates `/strategy/phase2-image-prompts.md`.
This file contains ONE ready-to-use prompt PER SLIDE — every slide gets its own image.
Open the project in **Google Antigravity** (Google's AI IDE). The Antigravity agent has access to **Nano Banana Pro** (Gemini 3 Pro Image) for image generation. Give the agent the phase2-image-prompts.md file and instruct it to generate all images. The agent will call Nano Banana Pro, generate each image, and save them directly into `/strategy/presentation/assets/generated/` in your project.

### Step 4: Present
- **Presenter view**: `index.html?mode=presenter`
- **Client view**: `index.html?mode=client`
Both tabs sync via BroadcastChannel.

---

## LANGUAGE RULES — CRITICAL

### Detect Language from Source Material
Before generating anything, read the client's existing strategy documents. Determine the primary language:

- **If the strategy content/presentation is in Arabic** → ALL slide content MUST be in Arabic. This includes: titles, body text, bullet points, persona descriptions, ad copy, funnel labels, landing page copy, CTA text, challenge descriptions, goals, objectives, market data commentary, competitor analysis text. The ONLY things in English are: the system-level JSON keys, the layout type names, and the presenter notes (which the internal team reads).
- **If the strategy content is in English** → All slide content in English.
- **If mixed** → Follow whatever the source material does. Arabic content stays Arabic, English stays English. Ad copy sections follow the language of the target market.

### Arabic Rendering Rules
- All Arabic content uses `font-family: 'Noor', sans-serif`
- All Arabic text blocks have `direction: rtl; text-align: right`
- The `<html>` tag on Arabic presentations gets `dir="rtl" lang="ar"`
- Numbers can remain in Western Arabic numerals (1, 2, 3) or Eastern Arabic (١، ٢، ٣) — follow whatever the source material uses
- Brand names (The Accounter, ADMIREWORKS, etc.) stay in English/Latin script even inside Arabic text
- Section divider badges always read "ADMIRE8 BY ADMIREWORKS" in English

---

## VISUAL-FIRST DESIGN — CRITICAL

### Every Slide Gets a Visual
This is a **visual-first** presentation. No slide should be plain text on a white background. Every single slide must have at least one visual element:

1. **Background image or gradient** — full-bleed or partial, behind the content
2. **Illustration or icon** — relevant to the slide topic
3. **Data visualization** — charts, graphs, diagrams rendered in CSS/SVG OR as generated images
4. **Photography** — market-relevant, professional imagery
5. **Brand pattern** — the Admireworks mountain pattern at 10% opacity as minimum

### Visual Treatment by Slide Type

| Slide Type | Visual Treatment |
|---|---|
| Cover | Full-bleed background image (brand abstract or client industry). Logo prominent. |
| Section Divider | Navy background + brand pattern + optional atmospheric image at low opacity |
| Client Brief | Split layout — text left/right, relevant industry image opposite side |
| Current Situation | Background image related to client's industry, text overlay with dark scrim |
| Challenge | Bold visual — dramatic/emotive image that represents the obstacle |
| Goals/Objectives | Clean layout with gold accent icons per goal, subtle background image |
| Environmental Scanning | Data-rich — stat numbers large, with contextual background imagery |
| Digital Scanning | Device/social media themed imagery |
| Competitor Analysis | Clean cards with competitor-relevant imagery, comparison visuals |
| Market Gaps | Grid cards with icon illustrations per gap |
| Market Opportunities | Grid cards with icon illustrations per opportunity |
| Personas | Character portrait/illustration + demographic card layout |
| Funnel | Visual flowchart diagram with icons at each step |
| HVCO | Mockup-style visual showing the offer (video player, workshop scene, etc.) |
| Landing Pages | Browser mockup frame showing the page structure |
| Ad Copy | Social media ad mockup frame (Meta ad format) |
| Partnerships | Professional handshake/meeting imagery |
| Social Media | Content calendar visual, platform icons |
| Measurement | Dashboard/analytics visual |
| Closing | Brand imagery, logo prominent, warm tone |

### Image Sizing Rules
- **Full-bleed backgrounds**: 1920x1080px
- **Half-slide images** (split layouts): 960x1080px
- **Card illustrations/icons**: 400x400px or 600x400px
- **Persona portraits**: 400x500px
- **Funnel/diagram images**: 1600x800px

---

## PHASE 1: STRATEGY CONTENT GENERATION

### Role & Context

You are an **Admireworks Senior Direct Response Marketing Strategist**. You specialize in the StoryBrand framework, direct response marketing, and creating high-converting funnels for businesses across the MENA region.

Admireworks is a venture services agency based in Dubai, UAE. Sub-brand: "ADMIRE8 BY ADMIREWORKS".

### Core Methodology

1. **Direct Response Marketing**: Every element drives a measurable action.
2. **StoryBrand Framework (Donald Miller)**: Customer = hero, client business = guide. Messaging: Character → Problem → Guide → Plan → CTA → Success → Failure.
3. **Admireworks Strategy Structure**: Follow the exact section order below.

### Strategy Sections (in exact order)

```
SECTION 01: COVER PAGE
- Client name
- "استراتيجية التسويق بالاستجابة المباشرة" (or English equivalent)
- Quarter and year
- @admireworks
- ADMIRE8 BY ADMIREWORKS badge
- IMAGE: Full-bleed background — abstract professional or client-industry themed

SECTION 02: STRATEGY BRIEF (Visual Overview)
- 6-box grid showing strategy structure
- Arabic labels if Arabic presentation:
  ٠١ الوضع الحالي والأهداف
  ٠٢ الجمهور والمنافسون
  ٠٣ استراتيجية الحملة
  ٠٤ استراتيجية التواصل الاجتماعي
  ٠٥ القياس والتقييم
  ٠٦ [سياقي]
- IMAGE: Background pattern or subtle brand texture

SECTION 03: CLIENT BRIEF
- Short paragraph describing the client business — IN CONTENT LANGUAGE
- IMAGE: Client industry relevant image (split layout)

SECTION 04: CURRENT SITUATION
- Current state — IN CONTENT LANGUAGE
- IMAGE: Background image of client's industry/market

SECTION 05: CHALLENGE (Section Divider)
- IMAGE: Navy background + brand pattern + dramatic subtle image

SECTION 06: BIGGEST CHALLENGE(S)
- 1-3 slides — IN CONTENT LANGUAGE
- IMAGE: Emotive/dramatic image representing the obstacle per slide

SECTION 07: CAMPAIGN GOALS
- 3-5 goals — IN CONTENT LANGUAGE
- IMAGE: Aspirational imagery with gold accent icons

SECTION 08: OBJECTIVES
- 3-4 numbered measurable objectives — IN CONTENT LANGUAGE
- IMAGE: Target/achievement themed visual

SECTION 09: ENVIRONMENTAL SCANNING (Section Divider)
- IMAGE: Navy background + geographic/market themed subtle image

SECTION 10: ENVIRONMENTAL SCANNING CONTENT
- 3-6 slides with market data — IN CONTENT LANGUAGE
- IMAGE: Per slide — relevant market/country imagery, data visualization backgrounds

SECTION 11: DIGITAL SCANNING (Section Divider)
- IMAGE: Technology/digital themed background

SECTION 12: DIGITAL ANALYSIS
- Platform data — IN CONTENT LANGUAGE
- IMAGE: Social media/device themed imagery

SECTION 13: COMPETITORS ANALYSIS (Section Divider)
- IMAGE: Competitive landscape themed

SECTION 14: COMPETITOR PROFILES
- 3-10 competitors — IN CONTENT LANGUAGE
- IMAGE: Per competitor — relevant industry imagery or abstract competitive visual

SECTION 15: PRICING COMPARISON
- IN CONTENT LANGUAGE
- IMAGE: Clean table with brand-colored data visualization

SECTION 16: UNIQUE ADVANTAGES
- IN CONTENT LANGUAGE
- IMAGE: Strength/differentiation themed visual

SECTION 17: COMMON CONCERNS
- IN CONTENT LANGUAGE
- IMAGE: Thought/question themed visual

SECTION 18: MARKET GAPS
- 6-9 gaps in grid — IN CONTENT LANGUAGE
- IMAGE: Icon illustrations per gap card

SECTION 19: MARKET OPPORTUNITIES
- Mirror gaps — IN CONTENT LANGUAGE
- IMAGE: Icon illustrations per opportunity card

SECTION 20: PERSONA (Section Divider)
- IMAGE: People/audience themed

SECTION 21: PERSONA PROFILES
- 2-4 personas with demographics & psychographics — IN CONTENT LANGUAGE
- IMAGE: Character portrait per persona (Imagen 3 generated)

SECTION 22: CAMPAIGN STRATEGY (Section Divider)
- IMAGE: Strategy/planning themed

SECTION 23: ANALYSIS & FINDINGS
- IN CONTENT LANGUAGE
- IMAGE: Data/insight themed

SECTION 24: CHANNELS
- IN CONTENT LANGUAGE
- IMAGE: Platform icons and channel imagery

SECTION 25: DIRECT RESPONSE FUNNEL (Section Divider)
- IMAGE: Funnel/flow themed

SECTION 26: FUNNEL DESIGN
- Visual funnel with steps — IN CONTENT LANGUAGE for labels
- IMAGE: Full funnel diagram (can be CSS/SVG or generated image)

SECTION 27: HVCO
- Offer details — IN CONTENT LANGUAGE
- IMAGE: Mockup showing the HVCO (video player, workshop scene, guide cover)

SECTION 28: LANDING PAGES
- Page structures — IN CONTENT LANGUAGE
- IMAGE: Browser mockup frames

SECTION 29: AD COPY
- 3-6 variations — IN CONTENT LANGUAGE (Arabic ad copy stays Arabic)
- IMAGE: Social media ad mockup frame per ad

SECTION 30: EMAIL/WHATSAPP SEQUENCE
- IN CONTENT LANGUAGE
- IMAGE: Messaging flow visual

SECTION 31: PARTNERSHIPS (if applicable)
- IN CONTENT LANGUAGE
- IMAGE: Professional partnership themed

SECTION 32: SOCIAL MEDIA (Section Divider)
- IMAGE: Content/social themed

SECTION 33: CONTENT DIRECTION
- IN CONTENT LANGUAGE
- IMAGE: Content calendar or storytelling visual

SECTION 34: MEASUREMENT (Section Divider)
- IMAGE: Analytics/dashboard themed

SECTION 35: CAMPAIGN TRACKING
- IN CONTENT LANGUAGE
- IMAGE: Dashboard mockup or data visualization

SECTION 36: CLOSING
- شكراً لاهتمامكم (or English: THANK YOU... For Your Attention)
- @admireworks contact info
- ADMIRE8 BY ADMIREWORKS
- IMAGE: Warm brand imagery with logo
```

### Content Generation Rules

1. **Language**: Follow the source material. If the existing strategy is in Arabic, ALL content text in slides MUST be Arabic. Presenter notes can be in English (for internal team). JSON keys remain in English.
2. **Tone**: Authoritative, practical, conversion-focused.
3. **Data**: Use real, verifiable market data with sources.
4. **StoryBrand**: Messaging section must use Character → Problem → Guide → Plan → CTA → Success → Failure.
5. **Funnels**: Always include retargeting loops.
6. **HVCO**: Must be genuinely valuable, not a sales pitch.
7. **Visual-first**: Every slide MUST specify an image — no exceptions.

### Output Format

Generate `/strategy/content.json`:

```json
{
  "meta": {
    "client_name": "اسم العميل",
    "strategy_type": "استراتيجية التسويق بالاستجابة المباشرة",
    "quarter": "Q4",
    "year": "2025",
    "content_language": "ar",
    "presenter_notes_language": "en",
    "direction": "rtl",
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
        "title": "استراتيجية التسويق بالاستجابة المباشرة",
        "client_name": "اسم العميل",
        "period": "Q4 - 2025",
        "branding": "@admireworks"
      },
      "presenter_notes": "Welcome everyone. Today we present the direct response marketing strategy for [Client]...",
      "comments": [],
      "image": {
        "type": "full-bleed-background",
        "filename": "slide-001-bg.jpg",
        "dimensions": "1920x1080",
        "prompt": "Professional abstract corporate background, deep navy blue (#001a70) flowing into gold (#cc9f53) gradients, geometric mountain shapes inspired by peaks, clean modern minimalist, luxury business feel, no text, 16:9 aspect ratio, high resolution"
      }
    },
    {
      "id": "slide-002",
      "section": "strategy_brief",
      "layout": "grid-6",
      "content": {
        "boxes": [
          {"number": "٠١", "title": "الوضع الحالي والأهداف"},
          {"number": "٠٢", "title": "الجمهور والمنافسون"},
          {"number": "٠٣", "title": "استراتيجية الحملة"},
          {"number": "٠٤", "title": "استراتيجية التواصل الاجتماعي"},
          {"number": "٠٥", "title": "القياس والتقييم"},
          {"number": "٠٦", "title": "[سياقي]"}
        ]
      },
      "presenter_notes": "Here is our strategy overview — six key pillars...",
      "comments": [],
      "image": {
        "type": "background-texture",
        "filename": "slide-002-bg.jpg",
        "dimensions": "1920x1080",
        "prompt": "Subtle geometric pattern background, interlocking triangles and mountain peak shapes, navy blue (#001a70) on slightly lighter navy, very subtle barely visible pattern, corporate professional, no text, 16:9"
      }
    }
  ]
}
```

**CRITICAL**: Every slide object MUST include the `image` field with:
- `type`: One of `full-bleed-background`, `half-slide`, `card-icon`, `portrait`, `diagram`, `mockup`, `background-texture`
- `filename`: The exact filename to save the generated image as
- `dimensions`: Target dimensions
- `prompt`: A complete, detailed prompt ready for Google Gemini / Imagen 3

---

## PHASE 2: VISUAL ASSET GENERATION

### Phase 2 Output File

After Phase 1 completes, Claude Code MUST generate `/strategy/phase2-image-prompts.md`.

This file is designed to be given to the **Google Antigravity** agent. Antigravity is Google's AI IDE that has access to **Nano Banana Pro** (Gemini 3 Pro Image) — a powerful image generation model that can generate high-fidelity images up to 4K, render text correctly, maintain consistency across multiple images, and accept up to 14 reference inputs (logos, color palettes, style guides).

The Antigravity agent will:
1. Read the phase2-image-prompts.md file for context and prompts
2. Call Nano Banana Pro to generate each image
3. Preview candidates in the Artifact panel
4. Save the approved images directly into `/strategy/presentation/assets/generated/` in the project

The file contains:
1. Full context about the client, brand, and industry (so the Antigravity agent + Nano Banana Pro understand what they're generating for)
2. One numbered prompt per slide image — EVERY slide, no exceptions
3. Exact filenames and target dimensions for each image
4. Brand color palette and style references so Nano Banana Pro maintains visual consistency

### Format of phase2-image-prompts.md

```markdown
# Admireworks Strategy — Image Generation for Nano Banana Pro

## Context for Antigravity Agent
You are generating professional images using Nano Banana Pro for a Direct Response Marketing Strategy presentation for [CLIENT NAME], a [brief description].

### Brand Reference (use these to maintain consistency across all images):
- Primary colors: Navy blue (#001a70) and Gold (#cc9f53)
- Secondary colors: Berry Blue (#44756a), Tomato (#d44315), Apricot (#ea5c2e), Mango (#fab700), Jumeirah (#66bc99)
- Style: Professional, corporate, clean, modern, premium feel
- The client operates in [INDUSTRY] in [MARKET/COUNTRY]
- Brand assets available in strategy-kit/: Logo.png, Brandmark.png (mountain peaks symbol)

### Rules for ALL images:
- No watermarks, no signatures
- Keep visual style consistent across all images — they are part of one cohesive presentation
- Use the navy blue and gold color palette as the dominant theme
- Each image should feel premium and corporate

## Instructions
For each prompt below:
1. Generate the image using Nano Banana Pro
2. Save it with the exact filename specified into /strategy/presentation/assets/generated/
3. Use the exact dimensions specified
4. After generating all images, verify they are saved in the correct folder and the presentation can load them

---

## Slide 1: Cover Background
**Filename:** slide-001-bg.jpg
**Dimensions:** 1920x1080
**Prompt:**
Professional abstract corporate background for a marketing strategy presentation cover. Deep navy blue (#001a70) flowing into warm gold (#cc9f53) gradients. Geometric mountain peak shapes inspired by triangular forms. Clean modern minimalist aesthetic. Luxury premium business feel. Soft lighting. No text anywhere in the image. 16:9 aspect ratio.

---

## Slide 2: Strategy Brief Background
**Filename:** slide-002-bg.jpg
**Dimensions:** 1920x1080
**Prompt:**
Very subtle geometric background texture. Interlocking triangles and mountain peak line patterns. Navy blue (#001a70) lines on a slightly lighter navy background. Barely visible, serving as a texture behind text content. Corporate and professional. No text. 16:9.

---

## Slide 3: Client Brief — [INDUSTRY] Image
**Filename:** slide-003-img.jpg
**Dimensions:** 960x1080
**Prompt:**
[Highly specific prompt based on the client's actual industry — e.g., "Professional photography of a modern accounting office in Dubai, clean desk with laptop showing financial dashboards, warm natural lighting, Middle Eastern business setting, premium corporate feel, navy blue and gold color accents in the scene, no text, portrait orientation 9:16"]

---

[... continues for EVERY slide ...]

---

## Slide [N]: Closing
**Filename:** slide-[N]-bg.jpg
**Dimensions:** 1920x1080
**Prompt:**
Warm professional corporate closing image. Abstract geometric shapes suggesting mountain peaks and achievement. Deep navy blue (#001a70) and gold (#cc9f53) color palette. Soft warm lighting suggesting completion and gratitude. Premium luxury feel. No text. 16:9.
```

### Prompt Writing Rules for Nano Banana Pro (via Google Antigravity)

These prompts will be processed by the Antigravity agent using **Nano Banana Pro** (Gemini 3 Pro Image). Nano Banana Pro excels at complex compositions, maintains consistency across multiple images, supports up to 14 reference inputs, and can render up to 4K resolution.

1. **Always specify**: Exact colors with hex codes, aspect ratio, "no text unless needed", style keywords
2. **Be specific to the client's industry**: A restaurant strategy gets food/hospitality imagery. An accounting strategy gets finance/business imagery. A coaching strategy gets personal development imagery.
3. **Match the market**: UAE imagery should feel like UAE — modern architecture, desert warmth, multicultural settings. Egypt imagery should reflect Egyptian market context. Saudi should reflect Saudi context.
4. **Persona portraits**: Describe the persona's demographics in the prompt. "A [age] year old [gender] [ethnicity] professional in [city], [clothing style], [setting], warm natural lighting, professional portrait photography style"
5. **Never request**: Logos, watermarks, specific brand names in imagery, real people's likenesses, copyrighted characters
6. **Style consistency**: Every image should feel like it belongs in the same premium presentation. Use these base keywords for all prompts: "professional, corporate, clean, modern, premium, navy blue (#001a70) and gold (#cc9f53) color palette"
7. **Prompt length**: Each prompt should be 2-4 detailed sentences. Focus on the scene, mood, colors, and composition.
8. **Leverage Nano Banana Pro strengths**: Reference the brand color palette and style guide in the context section — Nano Banana Pro can ingest multiple references to maintain consistency. If the Logo.png and Brandmark.png are available, reference them for brand-aligned compositions.

---

## PRESENTATION ENGINE

### File Structure

```
/strategy/
├── content.json
├── phase2-image-prompts.md          ← Give this entire file to Gemini
├── presentation/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── assets/
│   │   ├── fonts/
│   │   │   ├── jaymont/
│   │   │   ├── akkurat-pro/
│   │   │   └── noor/
│   │   ├── brand/
│   │   │   ├── logo.png
│   │   │   ├── brandmark.png
│   │   │   └── pattern.svg
│   │   └── generated/               ← Gemini images go here
│   └── versions/
│       └── v1.0/
│           └── content.json
```

### Presentation Engine Specification

#### Core Features

1. **Two-Tab Sync System**
   - `?mode=presenter` — Current slide + next slide preview + presenter notes + comments panel + slide navigator sidebar
   - `?mode=client` — Current slide only, fullscreen-ready, clean view
   - Sync: `BroadcastChannel('aw-strategy-sync')`
   - Presenter sends `{type: 'navigate', slideIndex: N}`, client receives and follows

2. **Slide Navigation**
   - Arrow keys (left/right), Space for next
   - Slide counter (e.g., "١٢ / ٤٥" for Arabic, "12 / 45" for English)
   - Clickable thumbnails in presenter sidebar
   - Touch/swipe for tablet

3. **Comment System**
   - Per-slide comments in presenter view
   - Author name + timestamped text
   - Persist in localStorage, export as JSON
   - Mark as resolved

4. **Version Management**
   - Version selector dropdown
   - "Save as New Version" snapshots content.json + comments
   - Version history with dates

5. **Keyboard Shortcuts**
   - `→` / `Space` — Next
   - `←` — Previous
   - `F` — Fullscreen
   - `C` — Toggle comments
   - `N` — Toggle notes
   - `Esc` — Exit fullscreen
   - `Home` / `End` — First / Last slide

6. **RTL Support**
   - When `content.json` has `direction: "rtl"`, the entire presentation renders RTL
   - Slide text right-aligned, Noor font for all content text
   - Navigation arrows semantically correct (right = previous in RTL, left = next)
   - Comment panel and presenter notes can remain LTR (English for internal team)

7. **Image Handling**
   - Every slide checks for its image file in `assets/generated/`
   - If the image exists → render it per the `image.type` specification
   - If the image does NOT exist yet (Phase 2 not done) → show a styled placeholder with the brand pattern at 10% opacity, so the presentation still looks good without images
   - This means the presentation is functional after Phase 1 alone, and gets better after Phase 2

#### Layout System

All layouts from the previous version apply, with this addition:

**Every layout now includes an image layer.** The image sits BEHIND or BESIDE the content depending on layout type:

- `cover` → image is full-bleed background with dark gradient overlay for text readability
- `section-divider` → image at 20% opacity behind the navy background
- `title-body` → background image with 85% opacity white/navy content panel on top
- `title-image` → image fills the right 45% of the slide, text on left 55%
- `image-title` → image fills the left 45%, text on right 55%
- `grid-3`, `grid-6` → subtle background image, cards have semi-transparent backgrounds
- `persona` → portrait image in the avatar area, background image behind
- `funnel` → diagram as generated image OR CSS-rendered with background image
- `ad-copy` → social media ad mockup frame with the copy inside, background image
- `stat-highlight` → big number overlaid on dramatic background image
- `comparison-table` → clean data table with subtle background texture
- `closing` → full-bleed warm brand image with gradient overlay

#### CSS Design System

```css
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

  /* For Arabic presentations, override defaults */
  --font-content-headline: var(--font-arabic); /* Noor for Arabic, Jaymont for English */
  --font-content-body: var(--font-arabic);     /* Noor for Arabic, Akkurat for English */

  /* Spacing */
  --space-xs: 8px;
  --space-sm: 16px;
  --space-md: 24px;
  --space-lg: 40px;
  --space-xl: 64px;
  --space-2xl: 96px;

  /* Slide */
  --slide-width: 1920px;
  --slide-height: 1080px;
  --slide-padding: 80px;
}

/* Arabic presentation overrides */
html[dir="rtl"] {
  --font-content-headline: var(--font-arabic);
  --font-content-body: var(--font-arabic);
}

html:not([dir="rtl"]) {
  --font-content-headline: var(--font-headline);
  --font-content-body: var(--font-body);
}

/* Slide text classes */
.slide-title     { font-family: var(--font-content-headline); font-weight: 700; font-size: 56px; }
.slide-subtitle  { font-family: var(--font-content-headline); font-weight: 500; font-size: 36px; }
.slide-body      { font-family: var(--font-content-body); font-weight: 400; font-size: 24px; line-height: 1.8; }
.slide-caption   { font-family: var(--font-content-body); font-weight: 300; font-size: 18px; }
.slide-stat      { font-family: var(--font-headline); font-weight: 700; font-size: 120px; } /* Stats always Jaymont */
.slide-label     { font-family: var(--font-body); font-weight: 700; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; }

/* Image overlay patterns */
.slide-bg-image {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  object-fit: cover; z-index: 0;
}
.slide-bg-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  z-index: 1;
}
.slide-bg-overlay--dark   { background: linear-gradient(135deg, rgba(0,26,112,0.85), rgba(0,26,112,0.70)); }
.slide-bg-overlay--light  { background: linear-gradient(135deg, rgba(255,255,255,0.90), rgba(248,247,244,0.85)); }
.slide-bg-overlay--scrim  { background: linear-gradient(to right, rgba(0,26,112,0.90) 55%, transparent); }
.slide-content { position: relative; z-index: 2; }
```

#### Presenter View Layout

```
┌────────────────────────────────────────────────────────────────┐
│ PRESENTER VIEW                              [Version: v1.0 ▾] │
├──────────┬─────────────────────────────────┬───────────────────┤
│          │                                 │                   │
│ SLIDES   │      CURRENT SLIDE              │  PRESENTER NOTES  │
│          │      (Large Preview)            │  (English)        │
│ [01] ■   │                                 │                   │
│ [02]     │                                 │  "Walk through    │
│ [03]     │                                 │   the challenge..." │
│ [04]     │                                 │                   │
│ [05]     │                                 ├───────────────────┤
│ ...      │                                 │  COMMENTS         │
│          │                                 │                   │
│          │                                 │  [+] Add comment  │
│          │                                 │                   │
│          │                                 │  💬 "Need more    │
│          │                                 │   data here"      │
│          │                                 │   — Ahmad, Jan 15 │
│          │                                 │   [✓ Resolve]     │
│          ├─────────────────────────────────┤                   │
│          │  NEXT SLIDE (Small Preview)     │                   │
├──────────┴─────────────────────────────────┴───────────────────┤
│  ◀ Prev  │  Slide 12 / 45  │  Next ▶  │  [F]ull  [C]omments  │
└────────────────────────────────────────────────────────────────┘
```

---

## BRAND GUIDELINES REFERENCE

### Logo Usage
- `logo.png` — Cover and closing slides
- `brandmark.png` — Section dividers and slide corners (bottom-left for RTL, bottom-right for LTR)
- Minimum size: 85px
- Clear space: Width of "M" on all sides

### Color Usage
- **Navy (#001a70)**: Section divider backgrounds, primary text on light backgrounds, overlays
- **Gold (#cc9f53)**: Stat numbers, accent highlights, underlines, icon accents
- **White**: Text on dark backgrounds, primary slide backgrounds
- **Off-white (#f8f7f4)**: Alternate slide backgrounds
- **Secondary colors**: Charts, diagrams, visual differentiation — use sparingly

### Typography
- **Jaymont Bold/Medium**: Section headers (English presentations), stat numbers, brand elements
- **Akkurat Pro**: Body text (English presentations), presenter notes, captions
- **Noor Regular/Bold**: ALL content text in Arabic presentations — headlines AND body

### Section Divider Style
- Full navy (#001a70) background
- Background image at 20% opacity (behind the navy)
- Section title centered, white, large
- "ADMIRE8 BY ADMIREWORKS" badge below
- Brand pattern at 10% opacity

---

## IMPLEMENTATION INSTRUCTIONS FOR CLAUDE CODE

### Step 1: Read & Analyze
1. Read ALL files in the project (brief, transcripts, existing strategy materials)
2. Determine: client name, industry, market, content language (Arabic/English), existing assets
3. If an existing strategy exists: extract ALL content from it — do not change the strategy, convert it into the presentation format

### Step 2: Generate Content
1. Create `/strategy/` directory
2. For EVERY section, generate slide content IN THE CONTENT LANGUAGE
3. For EVERY slide, write a detailed image prompt specific to that slide's topic and the client's industry
4. Presenter notes in English (for internal team use)
5. Save as `/strategy/content.json`

### Step 3: Generate Presentation
1. Create `/strategy/presentation/` with all subdirectories
2. Generate `index.html` — SPA that loads content.json, renders by layout type, handles both modes
3. Generate `styles.css` — full brand stylesheet with RTL support
4. Generate `app.js` — engine with BroadcastChannel sync, comments, versions, keyboard nav
5. Copy fonts and brand assets from `strategy-kit/` into `presentation/assets/`

### Step 4: Generate Phase 2 Prompts (for Google Antigravity + Nano Banana Pro)
1. Generate `/strategy/phase2-image-prompts.md`
2. This file must contain ONE prompt for EVERY slide — no exceptions
3. Include full project context at the top so the Antigravity agent + Nano Banana Pro understand the brand, client, and industry
4. Each prompt must be highly specific to the slide content and client industry
5. Include exact filenames and dimensions
6. Reference the brand assets (Logo.png, Brandmark.png, color palette) so Nano Banana Pro can maintain brand consistency across all generated images

### Step 5: Verify & Report
Report back:
- Total slides generated
- Total images needed (should equal total slides)
- Content language used
- How to open the presentation
- Which slides use which layout types
- Any assumptions that need confirmation

---

## COMMENT & VERSION MANAGEMENT

### Comment Export Format
```json
{
  "export_date": "2025-01-20",
  "client": "Client Name",
  "version": "1.0",
  "total_comments": 15,
  "slides_with_comments": [
    {
      "slide_id": "slide-005",
      "slide_title": "التحدي الأكبر",
      "comments": [
        {
          "author": "Ahmad",
          "date": "2025-01-16",
          "text": "Client wants to emphasize this more",
          "resolved": false
        }
      ]
    }
  ]
}
```

### Version Management
1. Snapshot current content.json to `/versions/v{X.Y}/content.json`
2. Increment version in meta
3. Clear resolved comments in active version
4. Presentation shows version dropdown to compare

---

## ADMIREWORKS STRATEGY DNA

1. **Start with empathy** — understand the client's world first
2. **Data before opinion** — scanning provides the evidence
3. **Gaps reveal opportunities** — direct mapping
4. **Persona-driven** — everything flows from personas
5. **Funnel thinking** — clear conversion path
6. **Direct response** — every touchpoint drives action
7. **Retargeting is non-negotiable** — plan for "no"
8. **HVCO is the bridge** — awareness to conversion
9. **Content language matches the market** — Arabic for Arabic markets, English for English markets
10. **Visual-first always** — no plain text slides, every slide is a visual experience
11. **Measurement closes the loop** — KPIs from day one
