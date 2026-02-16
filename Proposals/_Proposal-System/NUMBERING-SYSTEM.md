# Proposal Numbering System

## Objective
Create proposal IDs that are short, professional, and not easily enumerable from outside.

## Public Proposal Number Format
- `AWP-{COUNTRY}-{TOKEN}-{NONCE}`

Example:
- `AWP-EG-0MKC-SLK`

## What Each Part Means
- `AWP`: Admireworks Proposal prefix
- `COUNTRY`: two-letter country code (`EG`, `SA`, `AE`, ...)
- `TOKEN`: 4-character obfuscated token derived from:
  - month
  - day
  - daily sequence
- `NONCE`: 3-character random code to prevent predictable guessing

## Why This Is Better
- The ID still includes month/day/sequence at generation time.
- External viewers cannot easily infer date/order from the visible number.
- The extra nonce blocks straightforward enumeration.
- IDs remain short enough for email and URL sharing.

## Source Of Truth
Registry file:
- `proposal-registry.csv`

## Generation Command
```bash
node Proposals/_Proposal-System/scripts/create_proposal_record.js \
  --root "/Users/user/Documents/IDE Projects/Internal AW SOP" \
  --country EG \
  --send-date 2026-02-16 \
  --client "Lighting Business - Mahmoud" \
  --source-folder "Proposals/Lighting-Business-Mahmoud" \
  --owner "Fouad Nasseredin" \
  --status READY_TO_SEND \
  --recommended-option "Option 2"
```

This command:
1. Generates a new public proposal number
2. Registers it in `proposal-registry.csv`
3. Publishes one-page proposal in `Proposals/_Outgoing/{PROPOSAL_NUMBER}/`

Optional:
- Add `--publish-presentation true` only when a public presentation URL is needed.
