# Admireworks Internal OS

Admireworks Internal OS is the canonical source of truth for client knowledge, strategy, messaging, presentations, and internal delivery state.

## Core Model
- `admireworks-internal-os/clients/{slug}/` is the full internal workspace for each client.
- `my.admireworks.com` is the authenticated client workspace for approved artifacts, communication, billing, and reporting.
- `ops.admireworks.com` is the branded static publishing layer for presentations and other shareable outputs.
- Client delivery repos are execution-only. They should receive approved exports from `clients/{slug}/handoff/`, not the full KB.

## Quick Start

```bash
# Client portal dev server
cd apps/client-portal && npm install && npm run dev
# -> http://localhost:3002

# Scaffold internal client workspaces
node scripts/scaffold-client-workspace.mjs _templates Basseqat Ein-Abaya ASM-Minds
```

## Project Structure

| Directory | Purpose |
|---|---|
| `apps/client-portal/` | Main portal at `my.admireworks.com` |
| `clients/` | Canonical internal client workspaces |
| `ops/` | Operational systems, playbooks, and static publishing assets |
| `campaigns/` | Standalone campaign sites |
| `firebase/` | Admin scripts, migrations, publishing scripts |
| `scripts/` | Local workspace scaffolding and maintenance scripts |
| `docs/` | Architecture, lifecycle, and publishing documentation |
| `.agents/workflows/` | Agent workflow definitions |

## Key Documentation

| Doc | What It Covers |
|---|---|
| `Claude.md` | Master reference for AI assistants |
| `docs/CLIENT-ARTIFACTS.md` | Canonical internal workspace + portal publishing model |
| `docs/WORKFLOWS.md` | Updated lifecycle workflows using the new split |
| `docs/ARCHITECTURE.md` | System architecture across internal workspaces, portal, ops, and execution repos |
| `docs/DATA-MODEL.md` | Firestore collections and artifact publishing schema |

## Publishing Commands

```bash
# Publish an approved artifact into the portal
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

## Repository
- Internal portal: `my.admireworks.com`
- Static publishing: `ops.admireworks.com`
- Remote: `fnasr-source/admireworks-internal-os`
