# Proposal Workflow Checklist

1. Create/update the client package under `Proposals/{Client-Folder}`.
2. Run proposal registration script to generate public ID and publish outgoing one-page URL.
3. Capture and store client contact details (email + phone) in the registry and package index.
4. Update package files with generated proposal number:
   - `00-Proposal-Index.md`
   - `06-Offer-and-Proposal.md`
   - `10-One-Page-Proposal.html`
   - client email in `communications/`
5. Add validity period (default: 7 days from sending date).
6. Confirm payment section by region in both proposal and email:
   - Egypt: Instapay account details + Instapay payment URL (include subtle footer section in one-page proposal)
   - International: payment link (include subtle note in one-page proposal)
7. Keep client email short, with one-page proposal link and payment details.
8. Write emails in normal sender-to-recipient format (greeting, clear CTA, concise close), not internal note format.
9. Format email links as action hyperlinks:
   - `👉 [View Proposal](URL)`
   - `👉 [Open Payment Link](URL)` when needed.
10. Use email subject format: `{Agency Name} x {Project/Business Name}`.
11. Use outgoing URL format: `Proposals/_Outgoing/{PROPOSAL_NUMBER}/one-page.html`.
12. Push and share final outgoing URL.
