# Admireworks Lifecycle Workflows

This document describes the default operating flow now that the internal OS is the canonical source of truth.

## Stage 1: Lead Capture

Portal:
- Create and manage leads in `my.admireworks.com/dashboard/leads`.

Repo:
- No client workspace is required yet.

## Stage 2: Internal Workspace Creation

When a lead qualifies or a discovery call is scheduled:

```bash
node scripts/scaffold-client-workspace.mjs {Client-Slug}
```

This creates the canonical internal workspace at `clients/{Client-Slug}/`.

Core rule:
- All research, strategy, messaging, and presentation work happens here first.
- Do not create or duplicate a client delivery repo at this stage.

## Stage 3: Research and Discovery

Store work in:
- `clients/{slug}/kb/` for raw context and source material
- `clients/{slug}/research/` for validated outputs
- `clients/{slug}/meetings/transcripts/` and `clients/{slug}/meetings/recordings/`
- `clients/{slug}/active_state/` for decisions, blockers, and next actions

Expected outputs:
- research report
- competitor scan
- market summary
- transcript insights

## Stage 4: Proposal

Build the proposal inside the internal workspace:
- `clients/{slug}/proposal/`

Portal:
- register proposal state in `my.admireworks.com/dashboard/proposals`

Rule:
- proposal source stays internal
- client delivery repos are still not needed

## Stage 5: Onboarding

Portal:
- create client record
- create client login
- configure billing/invoice cadence

Repo:
- continue using the internal workspace for briefing and strategy work
- use `clients/{slug}/briefing/` and `clients/{slug}/active_state/`

## Stage 6: Strategy, Messaging, and Presentation

Canonical authoring paths:
- `clients/{slug}/strategy/`
- `clients/{slug}/messaging/`
- `clients/{slug}/presentations/`

Rules:
- written strategy stays in `strategy/`
- ad copy, email flows, and WhatsApp logic stay in `messaging/`
- the presentation source stays in `presentations/`
- raw transcripts and internal notes remain in `kb/` and `meetings/`
- no full KB duplication into other repos

## Stage 7: Publish Approved Client-Safe Artifacts

Publish client-safe artifacts into the portal after review:

```bash
cd firebase
npm run publish:artifact -- \
  --client-id {client-id} \
  --client-name "{Client Name}" \
  --type strategy_doc \
  --title "{Artifact Title}" \
  --source-path "clients/{slug}/strategy/..." \
  --locale ar \
  --version v1
```

Use `opsUrl` when the output is hosted on `ops.admireworks.com`.

Portal artifact examples:
- strategy documents
- strategy presentations
- ad-copy bundles
- campaign flows
- reports

## Stage 8: Publish Static Presentations

For client-facing presentations:
- keep the source deck in `clients/{slug}/presentations/`
- build and deploy the static deck under `ops.admireworks.com`
- register the final `opsUrl` in `clientArtifacts`

## Stage 9: Execution Handoff

Only when implementation starts:
- export build-ready specs into `clients/{slug}/handoff/`
- move only those approved outputs into the client delivery repo

Delivery repos should contain:
- landing pages
- admin/product code
- deployment config
- approved implementation specs

Delivery repos should not contain:
- meeting transcripts
- internal research archives
- raw strategy notes
- internal frameworks or prompts

## Stage 10: Ongoing Client Operations

Use `my.admireworks.com` as the client-facing workspace for:
- communications
- invoices and payments
- published reports
- published strategies
- presentations
- approved copy bundles
- approved campaign flows

Continue using the internal workspace for:
- research refreshes
- strategy revisions
- new copy exploration
- new presentation drafts
- internal decision logs
