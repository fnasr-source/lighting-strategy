# Admireworks Internal OS

Internal operating system for managing proposals, strategy assets, and CRM-style operational tracking.

## Modules

- `Proposals/`:
  - Client proposal packages
  - Numbering and issuance system
  - Outgoing client-safe links
  - Internal CRM dashboard generator
- `Strategies/`:
  - Strategy playbooks and historical strategy assets
- `Internal-OS/`:
  - Internal dashboards for quick cross-device review
  - Central system manual and link map

## Main Entry Pages

- Internal Home: `Internal-OS/index.html`
- Proposals CRM Hub: `Proposals/_Outgoing/_internal-crm/index.html`
- Proposals Hub Mirror: `Internal-OS/proposals/index.html`
- Strategies Hub: `Internal-OS/strategies/index.html`
- System Manual: `Internal-OS/system/INDEX.md`

## Build Commands

```bash
node Proposals/_Proposal-System/scripts/build_proposals_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/build_strategies_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/build_internal_home.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
node Proposals/_Proposal-System/scripts/validate_internal_links.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
```

## Proposal Issuance (Auto-refreshes hubs)

```bash
node Proposals/_Proposal-System/scripts/create_proposal_record.js \
  --root "/Users/user/Documents/IDE Projects/Internal AW SOP" \
  --country EG \
  --send-date 2026-02-16 \
  --client "Lighting Business - Mahmoud Selim" \
  --contact-email "Mahmoudmselim95@gmail.com" \
  --contact-phone "+201022267297" \
  --source-folder "Proposals/Lighting-Business-Mahmoud" \
  --owner "Fouad Nasseredin" \
  --status READY_TO_SEND \
  --recommended-option "Option 2"
```

Use `--skip-hub-build true` only for emergency/manual runs.

## Repository Rebrand Target

- Current remote: `fnasr-source/lighting-strategy`
- Target remote name: `fnasr-source/admireworks-internal-os`

After GitHub rename is completed, regenerate hubs with:

```bash
REPO_SLUG=fnasr-source/admireworks-internal-os node Proposals/_Proposal-System/scripts/build_proposals_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
REPO_SLUG=fnasr-source/admireworks-internal-os node Proposals/_Proposal-System/scripts/build_strategies_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
REPO_SLUG=fnasr-source/admireworks-internal-os node Proposals/_Proposal-System/scripts/build_internal_home.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
```
