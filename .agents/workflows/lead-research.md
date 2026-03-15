# Workflow: Lead Research

## Goal
Start a canonical internal client workspace and produce the first validated research outputs.

## Steps
1. Scaffold the internal workspace:
   ```bash
   node scripts/scaffold-client-workspace.mjs {Client-Slug}
   ```
2. Update `clients/{Client-Slug}/00-Client-Index.md`.
3. Store raw notes, links, screenshots, and transcripts in:
   - `clients/{Client-Slug}/kb/`
   - `clients/{Client-Slug}/meetings/`
4. Store validated outputs in `clients/{Client-Slug}/research/`:
   - research report
   - competitor scan
   - market summary
5. Update blockers and follow-up questions in `clients/{Client-Slug}/active_state/`.

## Rules
- Do not create a delivery repo for research.
- Do not duplicate the full KB outside this repo.
- Only validated outputs belong in `research/`; raw material stays in `kb/` and `meetings/`.
