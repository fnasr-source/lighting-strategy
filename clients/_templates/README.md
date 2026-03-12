# Client Folder Template

Copy this entire folder to create a new client workspace:

```bash
cp -r clients/_templates clients/{Client-Name}
```

Then:
1. Update `00-Client-Index.md` with the client's details
2. Follow the appropriate workflow from `.agents/workflows/`:
   - `lead-research.md` — for initial research on a new lead
   - `create-proposal.md` — to generate a Growth Partnership Proposal
   - `onboard-client.md` — when the client signs on

## Folder Contents

| Folder | Purpose |
|---|---|
| `briefing/` | Client brief responses, gap analysis, questionnaire |
| `research/` | Market research, competitor scan, SWOT analysis |
| `proposal/` | Proposal HTML, CSS, PDF, and visual assets |
| `communications/` | Email drafts, WhatsApp messages, follow-ups |
| `meetings/` | Transcripts and recordings |
| `invoices/` | Static HTML invoices (portal invoices are in Firestore) |
| `campaign/` | Campaign-specific assets and materials |
