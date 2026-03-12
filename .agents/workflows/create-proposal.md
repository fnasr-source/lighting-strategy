---
description: Create a Growth Partnership Proposal for a client
---

# Create Proposal Workflow

## When to Use
When research is complete and it's time to create a formal proposal for a client.

## Prerequisites
- Research completed in `clients/{Client-Name}/research/`
- Meeting transcript (if available) in `clients/{Client-Name}/meetings/`

## Steps

1. **Read the Autonomous Proposal Playbook**:
   - View `ops/proposal-playbook/PLAYBOOK.md` — the canonical 7-phase SOP
   - This defines the full autonomous workflow

2. **Execute the Playbook**:

   The playbook covers 7 phases:

   **Phase 0: Intake** — Parse brief and existing research
   **Phase 1: Deep Research** — Browser + API intelligence (if not already done)
   **Phase 2: Synthesis** — Transform research into structured intelligence
   **Phase 3: Architecture** — Design 12-14 page proposal structure
   **Phase 4: Visual Assets** — Generate images and mockups
   **Phase 5: HTML/CSS Build** — Construct the proposal document
   **Phase 6: PDF Generation** — Render to polished PDF
   **Phase 7: QA** — Browser verification + content checklist

3. **All proposal files go in** `clients/{Client-Name}/proposal/`:
   ```
   proposal/
   ├── proposal.html       ← The proposal document
   ├── proposal.css        ← Client-specific CSS overrides
   ├── proposal.pdf        ← Generated PDF
   └── assets/
       ├── brand/          ← AW logos
       ├── generated/      ← AI-generated images
       └── research/       ← Browser screenshots
   ```

4. **Register the proposal** (after building):
// turbo
   ```bash
   node ops/proposal-system/scripts/create_proposal_record.js \
     --root "/Users/user/Documents/IDE Projects/Internal AW SOP" \
     --country {CC} --send-date {YYYY-MM-DD} \
     --client "{Client Name}" \
     --contact-email "{email}" --contact-phone "{phone}" \
     --source-folder "clients/{Client-Name}" \
     --owner "Fouad Nasseredin" \
     --status READY_TO_SEND \
     --recommended-option "{Option}"
   ```

5. **Generate PDF**:
// turbo
   ```bash
   node ops/proposal-playbook/scripts/generate-proposal-pdf.js \
     "clients/{Client-Name}/proposal/proposal.html" \
     "clients/{Client-Name}/proposal/{Client} — Growth Partnership Proposal.pdf"
   ```

6. **Rebuild dashboards**:
// turbo
   ```bash
   node ops/proposal-system/scripts/build_proposals_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
   node ops/proposal-system/scripts/build_internal_home.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
   ```

7. **Validate links**:
// turbo
   ```bash
   node ops/proposal-system/scripts/validate_internal_links.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
   ```

## Proposal Variants
- **V1 (Standard):** Consultative — "We + Together" tone
- **V2 (Direct Response):** AIDA framework — use when client needs immediate revenue or has "zero" market share

## Delivery
- Email subject: `Admireworks x {Client Name}`
- Link format: `👉 [View Proposal](URL)` — never raw URLs
- Egypt: Include InstaPay as payment option
- International: Include Stripe payment link
