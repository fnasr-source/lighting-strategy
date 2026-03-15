# Client Artifacts

This repo is the canonical source of truth for all internal client intelligence and strategy work.

## Split of Responsibilities
- `admireworks-internal-os/clients/{slug}/` holds the full internal workspace.
- `my.admireworks.com` shows approved, client-safe snapshots only.
- `ops.admireworks.com` hosts branded static outputs such as strategy presentations.
- Client build repos stay execution-only and should receive exports from `clients/{slug}/handoff/`, not the full KB.

## Canonical Internal Workspace

Every active client workspace should contain these folders:

| Folder | Purpose |
|---|---|
| `kb/` | Raw context, source references, internal notes |
| `research/` | Research reports, competitor scans, market intelligence |
| `strategy/` | Written strategy deliverables |
| `messaging/` | Ad copy, email flows, WhatsApp flows, campaign scripts |
| `presentations/` | Presentation source and published deck metadata |
| `communications/` | Client-safe summaries and response packs |
| `handoff/` | Execution-safe outputs for delivery repos |
| `active_state/` | Current blockers, decisions, next actions |

Supporting folders such as `briefing/`, `meetings/`, `proposal/`, and `invoices/` still live in the internal client workspace.

## Firestore Collections

The portal publishing layer uses:

| Collection | Purpose |
|---|---|
| `clientArtifacts` | Current published artifact snapshot shown in the portal |
| `clientArtifactVersions` | Version history for published snapshots |
| `clientApprovals` | Approval and change-request records tied to client artifacts |

## Artifact Types

Supported artifact types:
- `strategy_doc`
- `strategy_presentation`
- `ad_copy`
- `campaign_flow`
- `report`
- `task_bundle`
- `asset`

## Publish Rules
- Draft and working documents stay in `clients/{slug}/`.
- Publish only approved, client-safe snapshots into Firestore.
- Publish presentations from `clients/{slug}/presentations/` to `ops.admireworks.com`, then register the URL in `clientArtifacts`.
- When implementation starts, export only the approved build-ready materials into `handoff/`.

## Scripts

Scaffold a workspace:

```bash
node scripts/scaffold-client-workspace.mjs _templates Basseqat Ein-Abaya ASM-Minds
```

Publish an artifact:

```bash
cd firebase
npm run publish:artifact -- \
  --client-id basseqat \
  --client-name Basseqat \
  --type strategy_presentation \
  --title "Basseqat Direct Response Strategy" \
  --source-path "clients/Basseqat/presentations/storyos/" \
  --ops-url "https://ops.admireworks.com/presentations/basseqat/" \
  --locale ar \
  --version v1
```
