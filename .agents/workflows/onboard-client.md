# Workflow: Onboard Client

## Goal
Activate the client in the portal while keeping all strategy and IP inside the internal workspace.

## Steps
1. Create or update the client record in `my.admireworks.com/dashboard/clients`.
2. Create the client login in the portal.
3. Confirm the internal workspace exists at `clients/{Client-Slug}/`.
4. Update `00-Client-Index.md` and `active_state/`.
5. Continue briefing, strategy, messaging, and presentation work in the internal workspace.
6. Publish only approved client-safe artifacts into the portal.

## Rules
- Do not hand clients the delivery repo as the source of truth.
- Do not copy the full KB, raw transcripts, or internal frameworks into delivery repos.
- If implementation starts later, export only approved materials from `handoff/`.
