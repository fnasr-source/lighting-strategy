# Project Briefing Questionnaire

Source form: `https://tally.so/r/nPeaGQ`

Captured from the live Tally form on March 9, 2026.

This folder is the working reference for the Admireworks client briefing form. It is set up so future client material can be checked against the questionnaire without needing to reopen the form every time.

## What is here

- `question-catalog.md`: Human-readable documentation of every section, field, option set, and conditional rule.
- `questionnaire-schema.json`: Machine-readable snapshot of the live form structure.
- `brief-response-template.md`: Blank answer template that mirrors the questionnaire.
- `gap-analysis-template.md`: Blank mapping sheet for checking a client brief, strategy deck, or transcript against the questionnaire.
- `working/client-brief-notes.md`: Empty workspace for notes extracted from an incoming client brief.
- `working/strategy-notes.md`: Empty workspace for notes extracted from an incoming strategy or planning document.
- `working/mapping-review.md`: Empty workspace for the actual gap review.

## Working method

1. Put the incoming client material into this folder or point to it from here.
2. Summarize the material inside the `working/` files.
3. Map the material against `gap-analysis-template.md`.
4. Flag every item as `Present`, `Partial`, `Missing`, or `N/A`.

## Notes on the current live form

- The form has 18 pages total: intro, 16 answer pages, and thank-you.
- Persona B is conditional. It only appears when the client selects `2` personas.
- `Business Location` is a separate country selector on the Basic Information page.
- The `Digital channels` prompt says `Select all that apply`, but the extracted payload does not expose the same multi-select flag used by other multi-select questions. That should be verified in the live form before treating it as definitive.
- The `What tools/platforms do you currently use?` option list currently contains `Google Ads` twice in the live payload.
