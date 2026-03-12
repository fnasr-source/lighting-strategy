# Prompt for IDE to Build Dashboard from this Folder

You are given the folder `Current-Clients/Simulations-Labs/` as the full source of truth.

Build a production-ready analytics dashboard with 3 tabs:
1) Executive Overview
2) Outreach (Instantly + Systeme)
3) Operations (Asana + Deliverables + Meeting Intelligence)

Requirements:
- Parse all JSON files under `Data-Sources/Raw/` and all markdown files in this folder tree.
- Create a normalized internal schema (campaigns, lists, leads, tasks, assets, meetings, tags).
- Infer relationships using names/IDs and output a confidence score per inferred join.
- Show KPI cards: total campaigns, active campaigns, lead lists, open tasks, completed tasks, overdue tasks, deliverables count, latest activity time.
- Outreach metrics: by campaign and audience segment, trend over time, alert on high bounce / low reply.
- Ops metrics: by Asana section and owner, throughput and aging.
- Intelligence panel: latest decisions/blockers from meeting intelligence markdown.
- Include data-quality panel (missing IDs, unmapped entities, stale snapshots).

Implementation constraints:
- Do not hardcode one-off values; derive from files.
- Build parser modules per source and a central harmonizer.
- Generate `dashboard_data_model.json` as output artifact describing all fields used.
- Keep UI simple, fast, and exportable (CSV/JSON).
