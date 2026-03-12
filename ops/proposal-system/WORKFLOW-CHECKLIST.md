# Proposal Workflow Checklist

1. Create/update the client package under `clients/{Client-Name}`.
2. Prepare one-page and proposal docs (`06`, `10`, `00` index).
3. Run `create_proposal_record.js` to generate number and publish outgoing one-page.
4. Confirm registry entry in `proposal-registry.csv`.
5. Confirm CRM entry in `proposal-crm.csv` (pipeline stage, next action, owner).
6. Confirm payment section by region in both proposal and email:
   - Egypt: Instapay account details + Instapay payment URL
   - International: payment link
7. Confirm validity period (default 7 days from send date).
8. Confirm client email format:
   - normal sender-to-recipient style
   - short CTA format
   - action links as hyperlinks
9. Confirm required action links:
   - `👉 [View Proposal](URL)`
   - `👉 [View Agreement](URL)` when using a one-page agreement/final-terms summary
   - `👉 [Pay via Instapay](URL)` for Egypt
   - `👉 [Open Payment Link](URL)` for international
10. Confirm email subject format: `{Agency Name} x {Project/Business Name}`.
11. Confirm internal dashboards refreshed:
   - `ops/proposal-system/_Outgoing/_internal-crm/index.html`
   - `ops/dashboards/proposals/index.html`
   - `ops/dashboards/index.html`
12. Run link validation:
   - `node ops/proposal-system/scripts/validate_internal_links.js --root "..."`
13. Push and share final links.

## Meeting-Aligned Commercial Revision

Use this path when the detailed proposal remains strategically useful, but the commercial terms change materially in a later meeting.

1. Keep the detailed proposal/presentation as strategic background unless it must be rewritten.
2. Document the meeting outcome in:
   - `meetings/YYYY-MM-DD-meeting-transcript.md`
   - `meetings/YYYY-MM-DD-decision-summary.md`
   - `09-Meeting-Update-YYYY-MM-DD.md`
3. Add or update:
   - `06-Offer-and-Proposal.md`
   - `10-One-Page-Proposal.html`
   - `00-Proposal-Index.md`
4. Publish the outgoing one-page and use it as the client-facing agreement/final commercial summary.
5. Update the live invoice so it reflects the agreed commercial terms, not the older proposal anchors.
6. If pricing was revised down from earlier anchors, show the original commercial anchor and the agreed price clearly on the one-page and invoice.
7. Keep the email light when the invoice already contains the detail:
   - short confirmation
   - agreement link
   - invoice link
   - kickoff note after payment

## Legacy Intake (Historical Proposals)

1. Add record in `legacy-proposals.json`.
2. Include direct links to available assets.
3. Rebuild dashboards.
4. Validate links.
