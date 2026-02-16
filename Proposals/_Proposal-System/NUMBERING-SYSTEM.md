# Proposal Numbering System

## Objective

Create proposal IDs that are short, professional, and non-obvious externally.

## Public Proposal Number Format

- `AWP-{COUNTRY}-{TOKEN}-{NONCE}`

Example:

- `AWP-EG-0MKC-SLK`

## Component Meaning

- `AWP`: Admireworks Proposal prefix
- `COUNTRY`: two-letter country code (`EG`, `SA`, `AE`, ...)
- `TOKEN`: 4-character obfuscated token derived from month/day/daily sequence
- `NONCE`: 3-character random code to reduce predictability

## Why This Works

- Sequence/date are used at generation time without being obvious externally.
- IDs remain short and shareable.
- External guessing risk is reduced.

## Source of Truth

- `proposal-registry.csv`

## Generation Command

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

## Command Effects

1. Generates a new public proposal number.
2. Appends entry to `proposal-registry.csv`.
3. Publishes one-page proposal in `Proposals/_Outgoing/{PROPOSAL_NUMBER}/`.
4. Rebuilds internal dashboards by default.

## Optional Flags

- `--publish-presentation true`: publish `presentation.html` alongside one-page when needed.
- `--skip-hub-build true`: skip dashboard rebuilds for emergency/manual runs.
- `--repo-slug <owner/repo>`: override repo slug used by generated links.
