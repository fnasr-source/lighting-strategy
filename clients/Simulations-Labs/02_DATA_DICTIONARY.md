# Simulations Labs — Data Dictionary for Dashboard Build

## Canonical entities
- `campaigns` (Instantly)
- `lead_lists` (Instantly)
- `sending_accounts` (Instantly)
- `asana_tasks` (Pipeline execution)
- `drive_assets` (Client files/docs)
- `meeting_transcripts` (Fathom-derived)
- `systeme_contacts` (CRM/contact base)
- `systeme_tags` (Lead segmentation taxonomy)

## Proposed joins
- `campaigns.name` ↔ naming convention tags (SimLabs segments)
- `lead_lists.name` ↔ audience segment taxonomy
- `asana_tasks.name/custom_fields` ↔ campaign or deliverable IDs
- `drive_assets` ↔ deliverable references in Asana/meeting notes
- `systeme_contacts.tags` ↔ audience segment + journey stage

## Dashboard-ready aggregates
- Outreach: sent, open, reply, positive reply, bounce (per campaign + per list + per period)
- Operations: tasks open/closed, overdue, section throughput, owner load
- Content/Assets: produced deliverables by type + freshness (last modified)
- Intelligence: recurring meeting themes, blockers, decisions
