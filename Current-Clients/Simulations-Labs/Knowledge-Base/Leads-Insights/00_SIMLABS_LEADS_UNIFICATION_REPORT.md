# Simulations Labs — Unified Leads Report

## Coverage
- Raw lead records pulled from Asana deep tasks: **70**
- Unified lead records after dedupe: **69**
- Duplicate groups collapsed: **1**

## Data Sources Unified
- Asana deep extraction (`Data-Sources/Raw/asana_deep/project_1213388383279022/tasks/*.json`)
- Instantly campaign/list metadata (`instantly_campaigns.json`, `instantly_lead_lists.json`) for outreach context

## Lead Quality Snapshot
- Leads with email: **62/69**
- Leads with company: **46/69**
- Leads with status: **68/69**
- Leads with next action: **65/69**

## Top Statuses
- New: 39
- Outreach Sent: 25
- Follow-up Needed: 4
- Unknown: 1

## Top Sources
- AI Everything Sheet: 35
- Campaigns: 21
- Cold Outreach: 10
- Demo Form: 1
- Unknown: 1
- Voice Note: 1

## Owner Distribution
- Unassigned: 30
- Sahl: 17
- Nourhan: 14
- Unknown: 8

## Priority Distribution
- B - Warm: 39
- A - Hot: 22
- C - Low: 7
- Unknown: 1

## Instantly Context (for insight readiness)
- Campaigns in snapshot: **5**
- SimLabs campaigns in snapshot: **2**
  - SimLabs | Security Professionals: status=1, open_tracking=False, link_tracking=False
  - Simlabs | CTF Organizers: status=1, open_tracking=False, link_tracking=False
- Lead lists in snapshot: **6**
- SimLabs lead lists: SimLabs - Security Engineers, SimLabs - Security Consultants, SimLabs - CTF Organizers

## Outputs
- `simlabs_unified_leads.csv`
- `simlabs_unified_leads.json`
- `simlabs_dedup_audit.json`

## Next Steps (Execution)
1. Pull per-lead Instantly analytics/events (sent, delivered, opens, replies, bounces) via live API to enrich each unified lead record.
2. Join event metrics onto this unified table using normalized email + provider lead ID map.
3. Add scoring columns (readiness, engagement, priority) and produce action queue by owner.