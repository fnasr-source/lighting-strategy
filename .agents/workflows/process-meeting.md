# Workflow: Process Meeting

## Goal
Capture the raw meeting record, then update the internal workspace and client-safe state correctly.

## Storage Paths
- Recording: `clients/{Client-Slug}/meetings/recordings/`
- Transcript: `clients/{Client-Slug}/meetings/transcripts/`
- Distilled notes and key context: `clients/{Client-Slug}/kb/`
- Decisions, blockers, next actions: `clients/{Client-Slug}/active_state/`

## Rules
- Raw transcripts remain internal.
- Do not publish meeting transcripts directly to the client portal.
- Publish only approved summaries, decisions, or follow-up packs when they are client-safe.
