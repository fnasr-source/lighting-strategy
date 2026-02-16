# Admireworks Proposal System

Core proposal operations module inside the internal OS.

## Mission

Create, number, publish, track, and follow up proposals in a consistent system with internal CRM visibility.

## Core Principles

- Use opaque public proposal IDs (no obvious sequence exposure).
- Keep one source of truth for issued proposals.
- Keep CRM metadata separate but linked by proposal number.
- Keep legacy proposals discoverable in the same dashboard.
- Keep payment and email rules standardized by region.
- Keep payment details in both proposal and email for Egypt clients.

## Core Files

- `proposal-registry.csv`: issued numbered proposals
- `proposal-crm.csv`: pipeline/ops metadata keyed by `proposal_number`
- `legacy-proposals.json`: historical sent proposals outside numbered flow
- `NUMBERING-SYSTEM.md`
- `WORKFLOW-CHECKLIST.md`
- `PAYMENT-RULES.md`
- `LINK-STANDARDS.md`
- `templates/`
- `scripts/`

## Dashboard Outputs

- Canonical internal CRM page: `Proposals/_Outgoing/_internal-crm/index.html`
- Mirror in internal OS: `Internal-OS/proposals/index.html`

## Builder Scripts

```bash
node Proposals/_Proposal-System/scripts/build_proposals_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/build_strategies_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/build_internal_home.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/validate_internal_links.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
```

## Proposal Number Issuance

Use:

```bash
node Proposals/_Proposal-System/scripts/create_proposal_record.js ...
```

Behavior:

1. Generates proposal number
2. Registers record in `proposal-registry.csv`
3. Publishes outgoing one-page to `Proposals/_Outgoing/{PROPOSAL_NUMBER}/`
4. Auto-refreshes internal dashboards (`build_proposals_hub`, `build_strategies_hub`, `build_internal_home`)

Optional flags:

- `--publish-presentation true`
- `--skip-hub-build true` (emergency/manual use only)
- `--repo-slug fnasr-source/lighting-strategy` (or new slug after rename)

## Legacy Intake Rule

When adding old proposals that predate numbering:

1. Add record in `legacy-proposals.json`.
2. Include all available links (HTML, PDF, offer, research).
3. Rebuild dashboards.
4. Validate links with `validate_internal_links.js`.

## Publishing Rule

Client-facing outgoing URLs should use:

- `Proposals/_Outgoing/{PROPOSAL_NUMBER}/one-page.html`

Internal review URLs should use dashboard pages.
