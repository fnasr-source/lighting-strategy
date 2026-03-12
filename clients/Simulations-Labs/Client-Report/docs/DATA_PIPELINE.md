# Simulations Labs — Data Pipeline

## Input Sources

| Source | Type | Location | Refresh Method |
|--------|------|----------|---------------|
| Instantly Campaigns | API → JSON | `Data-Sources/Raw/instantly_simlabs_campaign_analytics_live.json` | Re-run Instantly API pull script |
| Instantly Config | API → JSON | `Data-Sources/Raw/instantly_simlabs_campaigns_filtered_live.json` | Re-run Instantly API pull script |
| Asana Tasks (Project 1212) | API → JSON | `Data-Sources/Raw/asana_deep/project_1212055797762548/` | Re-run Asana deep extraction |
| Asana Tasks (Project 1213) | API → JSON | `Data-Sources/Raw/asana_deep/project_1213388383279022/` | Re-run Asana deep extraction |
| Unified Leads | Processed | `Knowledge-Base/Leads-Insights/simlabs_unified_leads.json` | Re-run unification script |
| Meeting Index | API → JSON | `Meeting-Intelligence/index.json` | `python3 scripts/sync_simlabs_fathom.py` |
| Drive Inventory | API → JSON | `Data-Sources/Raw/google_drive_full_mirror_inventory.json` | Re-run Drive mirror script |
| Systeme Contacts | API → JSON | `Data-Sources/Raw/systeme_contacts_page1.json` | Paginate full Systeme API |

## Transform Steps

1. **Extract** raw JSON from `Data-Sources/Raw/`
2. **Parse** campaign analytics → compute derived metrics (reply rate, bounce rate)
3. **Parse** unified leads → aggregate by status, source, priority, owner
4. **Parse** Asana task indexes → count completed vs open
5. **Parse** meeting index → compute monthly meeting frequency
6. **Aggregate** all metrics into `Client-Report/data/report-data.json`

## Output Artifacts

| Output | Path | Format |
|--------|------|--------|
| Report data bundle | `Client-Report/data/report-data.json` | JSON |
| Main report | `Client-Report/index.html` | HTML |
| Executive version | `Client-Report/v1-executive-light/index.html` | HTML |
| Balanced version | `Client-Report/v2-balanced/index.html` | HTML |
| Deep-dive version | `Client-Report/v3-deep-dive/index.html` | HTML |

## Refresh Instructions

1. Re-pull live data from APIs (Instantly, Asana, Fathom, Systeme)
2. Place updated JSON in `Data-Sources/Raw/`
3. Re-run unification scripts
4. Re-generate `data/report-data.json` (manual or scripted)
5. Verify report renders with new data
6. Commit and push
