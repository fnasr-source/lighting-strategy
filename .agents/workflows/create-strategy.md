# Workflow: Create Strategy

## Goal
Produce the full strategy system inside the internal workspace, then publish approved client-safe outputs into the portal and ops layer.

## Canonical Working Paths
- `clients/{Client-Slug}/research/`
- `clients/{Client-Slug}/strategy/`
- `clients/{Client-Slug}/messaging/`
- `clients/{Client-Slug}/presentations/`
- `clients/{Client-Slug}/active_state/`

## Standard Output Split
- Written strategy -> `strategy/`
- Ad copy, email flows, WhatsApp logic -> `messaging/`
- Presentation source -> `presentations/`
- Build-ready exports -> `handoff/`

## Publish Steps
1. Approve the written strategy and any client-facing derivatives.
2. Publish portal snapshots with `firebase/publish-client-artifact.mjs`.
3. Publish branded static presentations to `ops.admireworks.com` and store the `opsUrl` in the artifact record.
4. Export only execution-safe specs into `handoff/` if a delivery repo is needed.

## Rules
- Do not create or maintain the canonical strategy in a delivery repo.
- Do not expose raw transcripts, notes, or internal frameworks through the portal.
- Client-visible content should be an approved snapshot, not a live draft folder.
