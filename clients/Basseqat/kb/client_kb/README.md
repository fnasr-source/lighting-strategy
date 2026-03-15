# Client Knowledge Base

This is the canonical intake layer for all client context.

## Purpose
- keep raw source material searchable
- separate source capture from interpreted decisions
- let IDE agents work from a stable structure
- make strategy and copy generation traceable to real client inputs

## Structure
```text
docs/client_kb/
  INDEX.md
  MISSING_INPUTS.md
  README.md
  MIGRATION_LOG.md
  briefs/
  meetings/
  meetings/raw/
  whatsapp/
  plans/
  templates/
```

## Rules
- Raw transcripts go in `meetings/raw/`.
- Structured meeting notes go in `meetings/`.
- Briefs, forms, and kickoff material go in `briefs/`.
- WhatsApp clarifications and approvals go in `whatsapp/`.
- Execution plans derived from meetings go in `plans/`.
- Track missing client information in `MISSING_INPUTS.md`.
- Before strategy or implementation work, review `MISSING_INPUTS.md` and ask for any critical blockers.
