# Workflow: Setup Client Project

## Goal
Create an execution repo only when implementation needs to begin.

## Inputs
- Approved outputs from `clients/{Client-Slug}/handoff/`
- Deployment requirements
- Product/admin scope

## Rules
- Delivery repos are execution-only.
- Never duplicate the full internal workspace into a delivery repo.
- Research, strategy, transcripts, messaging drafts, and presentation source stay in `admireworks-internal-os`.
- If something needs to be shared with engineering, export it into `handoff/` first.
