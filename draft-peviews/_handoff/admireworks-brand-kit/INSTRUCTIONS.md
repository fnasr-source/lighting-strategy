# How To Use

## Setup
Copy this entire `strategy-kit/` folder into your client project root. That's it.

---

## PROMPT 1: Give this to Claude Code (Phase 1 — Strategy + Presentation)

Open Claude Code in the client project folder and paste:

```
Read strategy-kit/STRATEGY-SYSTEM.md — it contains the complete Admireworks strategy presentation system.

Review ALL strategy files and documents in this project. A strategy already exists for this client. Your job is to convert it into a visual-first web-based presentation.

Follow STRATEGY-SYSTEM.md exactly:

1. Read every document, PDF, and file related to the strategy
2. Detect the content language — if the strategy content is in Arabic, ALL slide content (titles, body, bullets, personas, ad copy, funnels, everything) MUST be in Arabic. Only the JSON keys and presenter notes stay in English.
3. Create /strategy/ folder and generate:
   - content.json — every slide with full content in the correct language, AND an image prompt per slide
   - presentation/index.html — full single-page presentation app
   - presentation/styles.css — Admireworks brand styles, RTL support for Arabic, Noor font for Arabic content
   - presentation/app.js — slide engine with BroadcastChannel sync (presenter + client tabs), comments, versions, keyboard nav
4. Copy Fonts/, Logo.png, Brandmark.png from strategy-kit/ into presentation/assets/
5. Generate phase2-image-prompts.md — ONE image prompt for EVERY slide, with full context about the client and brand so Nano Banana Pro can generate all visuals with brand consistency

CRITICAL RULES:
- VISUAL-FIRST: Every slide must have a background image, illustration, or visual element. No plain text on white backgrounds. Use brand pattern as minimum fallback.
- LANGUAGE: Content language follows the source material. Arabic strategy = Arabic slides. English strategy = English slides. Presenter notes always English.
- IMAGES: Every slide in content.json must have an "image" field with type, filename, dimensions, and a detailed prompt specific to that slide's topic and the client's industry.
- The presentation must work immediately when opened — if Phase 2 images are not yet generated, show styled brand-pattern placeholders.
- ?mode=presenter shows: slide + notes + comments + navigator
- ?mode=client shows: clean slide only, synced from presenter tab
- Arabic presentations: html dir="rtl", Noor font, right-aligned text
```

---

## PROMPT 2: Give this to Google Antigravity (Phase 2 — Images via Nano Banana Pro)

After Claude Code finishes Phase 1, you will find a file at `/strategy/phase2-image-prompts.md`.

### Steps:
1. Open the project in **Google Antigravity**
2. Give the agent this prompt:

```
Read the file strategy/phase2-image-prompts.md — it contains the full context and image prompts for a client strategy presentation.

Use Nano Banana Pro to generate ALL the images listed in that file, one by one in order. For each image:

- Follow the exact prompt written for that slide
- Save the image with the exact filename specified in the prompt
- Save all images into strategy/presentation/assets/generated/
- Keep the style consistent across ALL images: professional, corporate, premium, clean
- Primary color palette: navy blue (#001a70) and gold (#cc9f53)
- Use the brand assets in strategy-kit/ (Logo.png, Brandmark.png) as reference for brand consistency
- Generate at the dimensions specified for each image

Start with Slide 1 and work through every slide in order. Do not skip any.
After all images are generated, confirm that all files are saved in the correct folder.
```

3. The Antigravity agent will call Nano Banana Pro, generate each image, preview it in the Artifact panel, and save it directly into your project files.

### Tips:
- Nano Banana Pro can accept up to 14 reference inputs — the brand assets (logo, colors) help maintain consistency
- If an image doesn't match the brand well, tell the agent: "Regenerate this image with more navy blue #001a70 and gold #cc9f53, more corporate and premium"
- After all images are saved, refresh the presentation in browser — they load automatically
- If you hit quota limits, split across sessions

---

## View the Presentation

Open two browser tabs:

- **Tab 1 — Presenter**: `strategy/presentation/index.html?mode=presenter`
- **Tab 2 — Client**: `strategy/presentation/index.html?mode=client`

Navigate in the presenter tab → the client tab follows automatically.

---

## Deploy to Firebase

Deploy the `strategy/presentation/` folder as your public directory. Everything is static HTML/CSS/JS — no server needed.
