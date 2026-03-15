# Workflow: Create Proposal

## Goal
Build the proposal inside the internal client workspace and register the proposal state in the portal.

## Inputs
- `clients/{Client-Slug}/research/`
- `clients/{Client-Slug}/briefing/`
- `clients/{Client-Slug}/meetings/`
- `clients/{Client-Slug}/active_state/`

## Output Paths
- Source proposal files: `clients/{Client-Slug}/proposal/`
- Portal tracking: `my.admireworks.com/dashboard/proposals`

## Rules
- Proposal source stays in the internal OS.
- Do not duplicate research or strategy material into a delivery repo.
- If the proposal becomes client-visible in the portal, publish it as an approved artifact instead of exposing raw working files.
