# Clients

All client work lives here, from initial lead research through active delivery.

## Lifecycle Stages

Each client folder tracks its stage in `00-Client-Index.md`:

| Stage | Portal Status | What Happens |
|---|---|---|
| **1. Lead** | `leads` collection | Initial contact; no folder yet (portal only) |
| **2. Research** | Lead → `qualified` | Folder created from `_templates/`; research & competitor scan |
| **3. Proposal** | `proposals` collection | Proposal generated (PLAYBOOK.md workflow); one-page + PDF + pricing |
| **4. Active** | Client → `active` | Onboarding, briefing, campaign setup, invoicing |
| **5. Ongoing** | `invoices`, `payments` | Recurring billing, reports, meeting recordings, strategy updates |

## Folder Structure

```
clients/
├── _templates/          ← Copy this to start a new client folder
├── {Client-Name}/       ← One folder per client (use PascalCase-Hyphenated)
│   ├── 00-Client-Index.md
│   ├── briefing/
│   ├── research/
│   ├── proposal/
│   ├── communications/
│   ├── meetings/
│   ├── invoices/
│   └── campaign/
└── README.md            ← This file
```

## How to Start a New Client Folder

```bash
cp -r clients/_templates clients/{Client-Name}
```

Then update `00-Client-Index.md` with the client's details.

## Where Does What Go?

| Content Type | Location |
|---|---|
| Meeting transcripts | `meetings/transcripts/` |
| Meeting recordings | `meetings/recordings/` |
| Research reports | `research/` |
| Proposal documents (HTML/PDF) | `proposal/` |
| Emails, WhatsApp drafts | `communications/` |
| Static invoices (HTML) | `invoices/` |
| Campaign assets | `campaign/` |
| Client brief / questionnaire | `briefing/` |

> **Note:** Live operational data (invoices, payments, leads) lives in **Firestore** and is managed through `my.admireworks.com`. This folder holds source documents, research, and file-based deliverables.
