# Proposal Workflow Checklist

1. Create/update the client package under `Proposals/{Client-Folder}`.
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
   - `👉 [Pay via Instapay](URL)` for Egypt
   - `👉 [Open Payment Link](URL)` for international
10. Confirm email subject format: `{Agency Name} x {Project/Business Name}`.
11. Confirm internal dashboards refreshed:
   - `Proposals/_Outgoing/_internal-crm/index.html`
   - `Internal-OS/proposals/index.html`
   - `Internal-OS/index.html`
12. Run link validation:
   - `node Proposals/_Proposal-System/scripts/validate_internal_links.js --root "..."`
13. Push and share final links.

## Legacy Intake (Historical Proposals)

1. Add record in `legacy-proposals.json`.
2. Include direct links to available assets.
3. Rebuild dashboards.
4. Validate links.
