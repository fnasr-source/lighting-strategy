# Apollo Limitation Note

Date: 2026-03-12

## Confirmed

- The SimLabs university contacts were extracted and created in Apollo.
- The contact records exist and the review-list `label_ids` can be applied through the API.
- The corrected multichannel draft sequences now exist in Apollo.

## Limitation

- Contacts created through the Apollo contact-create API path are being stored with `disable_flag: true` in this account.
- Those disabled contacts do not behave like normal visible imported contacts in Apollo list review views.
- Because of that, the Apollo UI may still show zero or incomplete visible counts on the review lists even when the contact records and label assignments exist.

## Operational Meaning

- The extraction work is done.
- The multichannel sequence drafts are done.
- The final reviewable lead import inside Apollo still needs the standard Apollo CSV import path so the contacts become active/visible in the normal list UI.

## Ready Files

- `Knowledge-Base/Leads-Insights/Apollo-Enrichment/apollo_simlabs_university_batch_1000_2026-03-12.csv`
- `Knowledge-Base/Leads-Insights/Apollo-Enrichment/apollo_simlabs_university_batch_1000_2026-03-12.json`

## Sequence State

- The old email-only university draft sequences were archived.
- New multichannel university draft sequences were created with:
  - auto email
  - LinkedIn action item
  - call step
  - second auto email
  - LinkedIn follow-up action item
  - manual breakup email
