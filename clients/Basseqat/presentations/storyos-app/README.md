# Presentation App

This is the qafza-derived StoryOS webinar presentation skeleton adapted for client strategy decks.

## Required Engine
All presentations in this repo must use this exact app as the base.
Do not create a separate presentation system, alternate slide renderer, or custom deck UI unless explicitly requested.
Customization should happen primarily in `content/slides.json` and, only when needed, as small improvements inside the existing app.

## Required Reading
- `docs/strategy/PRESENTATION_REQUIREMENTS.md`
- `docs/strategy/presentation-outline.md`

## What Lives Here
- `content/slides.json`: the deck content, slide metadata, and speaker notes
- `src/pages/WebinarPresentation.tsx`: the presentation engine with presenter mode
- `src/data/presentation.ts`: the JSON-to-slide model adapter
- `public/admireworks-white.png`: footer brand asset

## Local Workflow
From the repo root:

```bash
npm install --prefix apps/presentation
npm run presentation:check
npm run presentation:serve
```

Use `P` to toggle presenter mode. Use left and right arrows to move between slides.

## Image Workflow
Use Gemini image generation when slides still need visuals. This workflow must use Nano Banana 2 / Gemini 3.1 Flash Image only:

```bash
npm run presentation:images:check
npm run presentation:images:generate
npm run presentation:release:check
```

Slides should carry `imagePrompt` or `visualDirection` until real visuals are generated.
Set `GOOGLE_GEMINI_IMAGE_MODEL_ID` to the current API model ID Google exposes for Nano Banana 2 before generating images.

## Language Rule
Use `docs/project/PROJECT_CONTEXT.md` as the source of truth for deck language.
If the client is Arabic-first:
- titles and headings may remain in English
- visible body content in `summary`, `bullets`, `evidence.detail`, quotes, and `cta` must be Arabic
- speaker notes may stay English unless requested otherwise

## Build And Publish
This repo includes `.github/workflows/presentation-pages.yml`.

When the repo is on GitHub:
1. enable Pages with `GitHub Actions` as the source
2. make sure `npm run presentation:release:check` passes locally first
3. push changes to `main`
4. GitHub Actions will build the Vite app and publish `apps/presentation/dist`

## Editing Rules
- treat `content/slides.json` as the main content file
- preserve the StoryOS webinar engine unless a structural improvement is required
- keep the deck GitHub Pages compatible
- use source-backed claims only
- keep nuance and delivery guidance in `speakerNotes`
- do not compress the strategy into a shallow summary deck when the repo contains fuller source material
- do not publish or mark the deck complete unless `npm run presentation:release:check` passes
