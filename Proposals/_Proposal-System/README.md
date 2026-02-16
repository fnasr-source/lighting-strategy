# Admireworks Proposal System

This is the master internal system for handling all client proposals.

## 1) Proposal Numbering Standard
Format:
- `AWP-{COUNTRY}-{YEAR}-{SEQUENCE}`

Example:
- `AWP-EG-2026-0001`

Rules:
- `COUNTRY` is a two-letter code (`EG`, `SA`, `AE`, etc.)
- `YEAR` is four digits
- `SEQUENCE` is 4 digits and increments per country/year

## 2) Registry Of All Proposals
Source of truth:
- `proposal-registry.csv`

For every new proposal:
1. Add a new row in `proposal-registry.csv`
2. Assign the next number
3. Add the number into the client package files (`00`, `06`, one-page proposal, email)

## 3) Required Folder Structure Per Client
Use this numbered structure in every proposal package:
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

## 4) Client-Facing Proposal Rules
- Keep options clear and mutually exclusive.
- Keep strategy inclusion explicit.
- Keep kickoff steps explicit.
- Include direct links to one-page proposal and final presentation in the email.

## 5) Payment Rules
- Egypt clients: use Instapay section from `PAYMENT-RULES.md`.
- Non-Egypt clients: include a payment link in the email.

## 6) Templates
Use templates in:
- `templates/00-Proposal-Index.template.md`
- `templates/12-Client-Email-Egypt.template.md`
- `templates/12-Client-Email-International.template.md`

