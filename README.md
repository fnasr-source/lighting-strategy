# Admireworks Internal OS

Internal operating system for managing the full client lifecycle: lead research, proposals, strategies, invoicing, and ongoing operations.

## Quick Start

```bash
# Client portal dev server
cd apps/client-portal && npm install && npm run dev
# → http://localhost:3002
```

## Project Structure

| Directory | Purpose |
|---|---|
| `apps/client-portal/` | Main web app — `my.admireworks.com` |
| `clients/` | All client folders (lifecycle-organized) |
| `ops/` | Operational systems: proposals, strategies, briefing, dashboards |
| `campaigns/` | Standalone campaign sites (Firebase Hosting) |
| `firebase/` | Admin scripts, service account, migrations |
| `docs/` | Technical documentation |
| `.agents/workflows/` | Agent workflow definitions |

## Key Documentation

| Doc | What It Covers |
|---|---|
| `Claude.md` | Master reference for AI assistants — read this first |
| `docs/WORKFLOWS.md` | Full client lifecycle workflows |
| `docs/ARCHITECTURE.md` | Platform architecture and tech stack |
| `docs/DATA-MODEL.md` | Firestore collections and schemas |
| `docs/DEVELOPMENT.md` | Dev setup and environment guide |

## Available Workflows

| Command | Description |
|---|---|
| `/lead-research` | Research a new lead or potential client |
| `/create-proposal` | Create a Growth Partnership Proposal |
| `/create-strategy` | Create a Direct Response Marketing Strategy |
| `/issue-invoice` | Create and send an invoice |
| `/onboard-client` | Onboard a new client after acceptance |
| `/process-meeting` | Process a meeting recording or transcript |
| `/setup-client-project` | Set up a Firebase project for full-funnel client |
| `/deploy` | Deploy changes to the live platform |

## Build Commands

```bash
# Rebuild static dashboards
node ops/proposal-system/scripts/build_proposals_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node ops/proposal-system/scripts/build_strategies_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node ops/proposal-system/scripts/build_internal_home.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"

# Validate links
node ops/proposal-system/scripts/validate_internal_links.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
```

## Repository

- **Remote:** `fnasr-source/admireworks-internal-os`
- **Client Portal:** `my.admireworks.com` (Firebase App Hosting)
- **Static Dashboards:** `ops.admireworks.com` (GitHub Pages)
