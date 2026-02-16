# Admireworks Proposal System

Master internal framework for creating, numbering, publishing, and sending proposals.

## Core Principles
- Use opaque public proposal IDs (not simple year counters).
- Keep every client package in a numbered file structure.
- Keep one source of truth registry for issued proposal IDs.
- Keep payment and email rules standardized by region.
- Keep payment details present in both the client email and one-page proposal footer.
- For Egypt clients, always include the live Instapay payment URL with account details.
- Keep client contact email and phone stored in the registry and package index.
- Use action-style hyperlink formatting in client emails.

## Main Documents
- `NUMBERING-SYSTEM.md`
- `proposal-registry.csv`
- `PAYMENT-RULES.md`
- `WORKFLOW-CHECKLIST.md`
- `LINK-STANDARDS.md`
- `templates/`
- `scripts/`

## Numbering
See full spec in:
- `NUMBERING-SYSTEM.md`

## Required Metadata Per Proposal
- Proposal number
- Client name
- Client email
- Client phone
- Send date
- Valid-until date
- Outgoing URL path

## Required Client Package Structure
- `00-Proposal-Index.md`
- `01-Transcript-Insights.md`
- `02-Research-Report.md`
- `03-Competitor-Scan.md`
- `04-Options-and-Recommendation.md`
- `05-Go-To-Market-Plan.md`
- `06-Offer-and-Proposal.md`
- `07-Presentation-Deck.md`
- `08-Appendix-Sources.md`
- `09-Meeting-Update-YYYY-MM-DD.md`
- `10-One-Page-Proposal.html`
- `11-Final-Presentation.html`
- `communications/`
- `meetings/`

## Publishing Path Rule
Public links should point to:
- `Proposals/_Outgoing/{PROPOSAL_NUMBER}/`

Avoid client names in outgoing URLs.
Default published artifact is `one-page.html`.

## Link Style Standard
Do not send raw URLs in client emails.
Use:
- `👉 [View Proposal](URL)`
- `👉 [Open Payment Link](URL)`

## Email Subject Standard
Format:
- `{Agency Name} x {Project/Business Name}`

Example:
- `Admirework x Lighting Business`
