# Ein Abaya Briefing Documentation

This folder is the working source of truth for the Ein Abaya kickoff brief and the public prefilled onboarding form.

## Purpose

The goal is to avoid sending a blank questionnaire when the project already contains useful context from:

- early discovery meetings
- the March 2026 proposal
- client and invoice records
- the partner onboarding checklist PDF
- internal notes about project scope and platform choice

The public form on `my.admireworks.com` is seeded from the machine-readable payload in this folder, while the markdown files explain where each answer came from and what still needs the client to confirm.

## Files

- `filled-client-brief-from-meetings.md`
  The canonical question-and-answer brief, rewritten in the structure of the standard Admireworks questionnaire plus the Zid launch needs.
- `gap-analysis-against-questionnaire.md`
  Canonical coverage review against `Briefing/Project-Briefing-Questionnaire/`.
- `missing-client-items.md`
  The short list of items still needed to start the Zid build well.
- `prefill-payload.json`
  The payload used by the onboarding seed script for Firestore.

## Source Material Used

- `Briefing/Project-Briefing-Questionnaire/`
- `drafts/Ein Abaya — Growth Partnership Proposal.pdf`
- `Proposals/_Proposal-System/payments/client-directory.csv`
- `Proposals/_Proposal-System/payments/invoice-registry.csv`
- `/Users/user/Downloads/Ein Abaya — Client Onboarding.pdf`
- January 21 meeting transcript
- January 26 meeting transcript
- March 1 meeting transcript

## Labeling Rules

Each answer in the filled brief is tagged with one of the following:

- `Confirmed`
- `Prefilled - please verify`
- `Missing - client input needed`
- `Deferred - not required for immediate kickoff`

`Confirmed` is used only when the repo gives high confidence that the answer is settled.

`Prefilled - please verify` is the default when the answer came from meetings or internal records but still needs client confirmation before execution.

## Scope Notes

- This version assumes the project is starting on `Zid`.
- The onboarding form is optimized for a website-first kickoff, not a full performance-marketing data dump.
- Pricing and payment-split details are intentionally excluded from the client-facing form because repo sources conflict and they are not needed to start execution.
