Read and execute this migration:

Source folder to ingest: `draft-peviews/`

Goals:
1. Import the `genco` preview work into this repo's previews structure.
2. Import Admireworks branding from `draft-peviews/_handoff/admireworks-brand-kit/`.
3. Keep all output aligned with Admireworks visual system (colors, fonts, tone, layout patterns).
4. Extract what is needed into this repo's normal structure, then remove the temporary `draft-peviews/` folder.

Detailed requirements:
- Audit and map all pages/assets from:
  - `draft-peviews/genco/index.html`
  - `draft-peviews/genco/presentation/index.html`
  - `draft-peviews/genco/redesigns/*.html`
  - `draft-peviews/genco/assets/**`
- Create/merge them into the target previews architecture used in this repo (no broken links).
- In the target brand system:
  - Use navy `#001A70` and gold `#CC9F53` as primary colors.
  - Use `Jaymont` for display headings.
  - Use `Akkurat Pro` for body/UI text.
  - Use `Noor` for Arabic text where needed.
  - Use `Logo.png` and `Brandmark.png` from the imported brand kit.
- Rebuild shared stylesheet tokens (or theme config) to centralize brand settings.
- Ensure mobile optimization on all imported pages (no horizontal scroll at 360px width).
- Validate links and asset paths after migration.
- Output a final inventory table:
  - migrated file
  - destination path
  - status

Brand references:
- `draft-peviews/_handoff/brand-references/Admireworks-Agency_Guidelines V1 - 2022.pdf`
- `draft-peviews/_handoff/brand-references/lighting-business-presentation-theme.css`
- `draft-peviews/_handoff/brand-references/lighting-business-final-presentation-reference.html`

Acceptance checks:
1. All migrated preview pages load correctly from their new paths.
2. All pages use the Admireworks theme tokens.
3. Fonts and logos are wired correctly.
4. Mobile layout is clean on iPhone/Android widths.
5. `draft-peviews/` is removed after migration and verification.
