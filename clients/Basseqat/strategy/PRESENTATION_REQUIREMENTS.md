# Presentation Requirements

This is the required structure for any direct-response strategy deck built from this template.

## Core Rule
Do not turn a full strategy system into a short summary deck.
The presentation must translate the full direct-response strategy into a client-facing, visual-first walkthrough.

## Required Slide Groups
1. Cover / decision frame
2. Situation and objectives
3. KPI and budget frame
4. Competitor overview
5. One slide per named competitor in `docs/research/competitor-scan.md`
6. Indirect alternatives / category comparison
7. Market gaps
8. Market opportunities
9. Primary persona
10. Secondary persona or audience expansion note
11. Market and digital environment
12. Core positioning / one-liner
13. Messaging pillars / StoryBrand narrative
14. Offer architecture
15. Landing page architecture
16. Funnel design with separate stage slides when needed
17. Social/content system
18. Copy sample slides (ads, headlines, WhatsApp/email, objections)
19. Measurement / evaluation
20. Decisions needed / missing inputs / blockers

## Minimum Coverage Rules
- Competitor analysis is never one summary slide only.
- Funnel design is never one summary slide only if the written strategy has multiple stages.
- Copy work is never omitted if ad copy, WhatsApp, email, or page specs exist in the repo.
- Landing page structure must be represented visually if `docs/pages/primary-landing-page-spec.md` exists.
- Missing inputs must appear explicitly when the QA gate or active-state docs say the work is still blocked.

## Visual Rules
- Each slide must have at least one of these:
  - `image`
  - `imagePrompt`
  - `visualDirection`
- Keep visible text minimal and presentation-native.
- Use speaker notes for nuance, citations, and explanation.
- Prefer one idea per slide.
- If proof assets are missing, use abstract or documentary image prompts instead of leaving slides visually empty.

## Language Rules
- Derive presentation language from `docs/project/PROJECT_CONTEXT.md`.
- Titles, section labels, and structural headings may stay in English for internal clarity.
- Visible body content must follow the client market language.
- For Arabic-first projects, the visible body content in `summary`, `bullets`, `evidence.detail`, quotes, and `cta` must be in Arabic; do not leave those sections in English.
- Speaker notes may stay in English unless the user explicitly asks for Arabic presenter notes.
- Do not mix translated-sounding Arabic with English body copy just because the headings are in English.

## Data Rules For `apps/presentation/content/slides.json`
- `deck.structureVersion` must be set.
- Every slide must include `section`.
- Every slide must include `speakerNotes` or `summary`.
- Every major claim must include `sources` or be explicitly framed as inference.
- Every slide should include `imagePrompt` until real visuals are generated and attached.

## Allowed Compression
You may compress or merge only when the underlying strategy does not support a full section.
If you compress, say why in `speakerNotes`.

## Not Allowed
- turning 11 strategy sections into a 10-slide summary
- skipping competitor detail slides when competitor research exists
- skipping copy sample slides when copy docs exist
- inventing a new presentation UI instead of using `apps/presentation/`
- leaving the deck without any visual plan
- keeping Arabic-market decks in English body copy
- publishing or marking the deck complete before `npm run presentation:release:check` passes
