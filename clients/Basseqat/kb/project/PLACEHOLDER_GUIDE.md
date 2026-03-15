# Placeholder Guide

Use this file to replace starter tokens cleanly when creating a real client repo.

## Required Placeholders
- `[CLIENT_NAME]`: full client or brand name used in headings and setup docs
- `[CLIENT_SLUG]`: filesystem-safe slug for repo, app IDs, and environment naming
- `[PRIMARY_MARKET]`: main geography or market the strategy is built around
- `[SECONDARY_MARKETS]`: additional markets only if they are in scope now
- `[CORE_LANGUAGE]`: main working language for copy and operations
- `[PRIMARY_OFFER]`: the main commercial offer the funnel is designed to sell
- `[OFFER_LADDER_SUMMARY]`: short summary of core, upsell, and follow-up offers
- `[CHANNEL_MIX]`: short summary of the main acquisition and follow-up channels
- `[priority_1]`, `[priority_2]`, `[priority_3]`: current execution priorities for the active state file
- `[constraint_1]`, `[constraint_2]`: real project constraints, not generic filler
- `[YYYY-MM-DD]`: the current update date

## Rules
- replace all required placeholders before real work starts
- do not leave generic filler from another client in any document
- if a field is not known yet, state `TBD - awaiting client confirmation` instead of leaving the placeholder
- run `npm run rename:check` after setup

## High-Risk Areas
- `docs/project/PROJECT_CONTEXT.md`
- `docs/project/PROJECT_PROFILE.md`
- `docs/project/CONTINUE_PROMPT.md`
- `docs/active_state/README.md`
- `apps/web/apphosting.yaml`

## Contamination Rule
If any copied text from another client survives placeholder replacement, treat that as contamination and fix it before strategy or implementation work begins.
