# Data Coverage Audit — Simulations Labs

Generated: 2026-03-01

## Scope Verified

- Source root: `Current-Clients/Simulations-Labs/Data-Sources/Raw/asana_deep/`
- Project `1213388383279022`:
  - `tasks/*.json`: **70 files**
  - `deep_index.json`: **70 entries**
  - Supporting files present: `project.json`, `sections.json`, `tasks_list.json`
- Project `1212055797762548`:
  - `tasks/*.json`: **21 files**
  - `deep_index.json`: **21 entries**
  - Supporting files present: `project.json`, `sections.json`, `tasks_list.json`
- Global links inventory:
  - `links_inventory.json`: **317 unique links**

## Documentation Structure Present

- `00_ASANA_DEEP_DIVE_SUMMARY.md` — extraction totals + project summary
- `01_DATA_COVERAGE_AUDIT.md` — this verification file
- `03_ASANA_LINKS_INDEX.md` — all extracted links grouped by project + status code
- `project_1213388383279022_TASK_INDEX.md` — task-by-task index
- `project_1212055797762548_TASK_INDEX.md` — task-by-task index

## Lead Data Coverage Signals

### Project `1213388383279022` (70 tasks)
- Company custom field populated in **70/70** tasks
- Status custom field populated in **70/70** tasks
- Source custom field populated in **70/70** tasks
- Email detected in task notes/text: **7/70**
- Website URL in task notes/text: **1/70**

### Project `1212055797762548` (21 tasks)
- Status custom field populated in **21/21** tasks
- Phone detected in task notes/text: **3/21**
- Website URL in task notes/text: **6/21**

## Link Health Snapshot (317 total)

- HTTP 200: **87**
- HTTP 403: **145** (mostly permission-gated/private links)
- HTTP 404: **24**
- Referenced (Google Docs/Drive skipped from crawl): **59**
- Error: **2**

## Insight Readiness

Data is suitable for insight extraction because each task is preserved as full JSON including:
- Task core fields
- Custom fields
- Comments
- Stories/activity
- Attachments
- URL extraction references

Recommended next analysis pass:
1. Normalize malformed URLs (trailing HTML artifacts like `</a` and linebreak-fragment links).
2. Build a lead-quality score using `company/status/source + recency + evidence links`.
3. Create a consolidated leads table (CSV/JSON) for direct querying and trend analysis.
