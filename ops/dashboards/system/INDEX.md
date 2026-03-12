# Internal OS System Manual

Operational reference for Admireworks internal dashboards, proposal tracking, and strategy assets.

## Purpose

- Keep one internal operating layer for proposal execution and strategy operations.
- Keep sent proposals visible in a CRM-style dashboard.
- Keep legacy materials discoverable and linked.

## Core Dashboards

- Internal Home: `Internal-OS/index.html`
- Proposals CRM Hub (canonical): `Proposals/_Outgoing/_internal-crm/index.html`
- Proposals CRM Hub (mirror): `Internal-OS/proposals/index.html`
- Strategies Hub: `Internal-OS/strategies/index.html`

## Core Data Sources

- Sent proposals registry: `Proposals/_Proposal-System/proposal-registry.csv`
- Proposal pipeline metadata: `Proposals/_Proposal-System/proposal-crm.csv`
- Legacy proposal records: `Proposals/_Proposal-System/legacy-proposals.json`

## Link Map

Machine-readable URL index:
- `Internal-OS/system/link-map.json`

## Build and Validation Commands

```bash
node Proposals/_Proposal-System/scripts/build_proposals_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/build_strategies_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/build_internal_home.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/validate_internal_links.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
```

## Legacy Intake Rule

When adding a previously sent proposal that predates the numbered system:

1. Add a record to `legacy-proposals.json`.
2. Include as many direct links as available (one-page, PDF, offer, research).
3. Rebuild the proposals hub and internal home.
4. Validate links using `validate_internal_links.js`.

## Update Flow

1. Create or update proposal package.
2. Run `create_proposal_record.js`.
3. Confirm generated one-page in `Proposals/_Outgoing/{PROPOSAL_NUMBER}/`.
4. Confirm entry appears in proposals CRM hub.
5. Send client-facing email using template standards.
