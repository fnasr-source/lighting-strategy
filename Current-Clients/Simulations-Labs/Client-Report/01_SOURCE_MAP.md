# Simulations Labs — Source Map

_Generated: 2026-03-01_

Every chart and insight in the report is traceable to one or more source files below.

## Executive Summary
| Insight | Source File(s) | Freshness | Caveat |
|---------|---------------|-----------|--------|
| Total emails sent | `Data-Sources/Raw/instantly_simlabs_campaign_analytics_live.json` | 2026-03-01 | Live API pull |
| Total leads in pipeline | `Knowledge-Base/Leads-Insights/simlabs_unified_leads.json` | 2026-03-01 | Asana-derived |
| Meetings tracked | `Meeting-Intelligence/index.json` | 2026-03-01 | Fathom API |
| Asana tasks completed | `Knowledge-Base/Asana-Deep-Dive/project_1212055797762548_TASK_INDEX.md` | 2026-03-01 | Deep extraction |
| Drive assets mirrored | `Data-Sources/Raw/google_drive_full_mirror_inventory.json` | 2026-03-01 | Full mirror |

## Outreach Dashboard
| Chart | Source File(s) | Freshness | Caveat |
|-------|---------------|-----------|--------|
| Campaign performance (sent/replied/bounced) | `Data-Sources/Raw/instantly_simlabs_campaign_analytics_live.json` | 2026-03-01 | Open/click tracking **disabled** — 0 reported |
| Campaign configuration | `Data-Sources/Raw/instantly_simlabs_campaigns_filtered_live.json` | 2026-03-01 | Full sequence detail |
| Lead list breakdown | `Data-Sources/Raw/instantly_lead_lists.json` | 2026-03-01 | 6 lists total, 3 SimLabs |
| Email activity timeline | `Data-Sources/Raw/instantly_simlabs_email_activity_live.json` | 2026-03-01 | **Empty** — no events returned |

## Lead Pipeline
| Chart | Source File(s) | Freshness | Caveat |
|-------|---------------|-----------|--------|
| Lead status distribution | `Knowledge-Base/Leads-Insights/simlabs_unified_leads.json` | 2026-03-01 | 69 deduplicated leads |
| Lead source breakdown | `Knowledge-Base/Leads-Insights/00_SIMLABS_LEADS_UNIFICATION_REPORT.md` | 2026-03-01 | — |
| Lead priority distribution | `Knowledge-Base/Leads-Insights/simlabs_unified_leads.json` | 2026-03-01 | — |
| Owner distribution | `Knowledge-Base/Leads-Insights/00_SIMLABS_LEADS_UNIFICATION_REPORT.md` | 2026-03-01 | 30 unassigned |
| Lead quality metrics | `Knowledge-Base/Leads-Insights/00_SIMLABS_LEADS_UNIFICATION_REPORT.md` | 2026-03-01 | Email coverage 90% |

## Operations (Asana)
| Chart | Source File(s) | Freshness | Caveat |
|-------|---------------|-----------|--------|
| Task completion (Project 1212) | `Knowledge-Base/Asana-Deep-Dive/project_1212055797762548_TASK_INDEX.md` | 2026-03-01 | 19/21 completed |
| Pipeline tasks (Project 1213) | `Knowledge-Base/Asana-Deep-Dive/project_1213388383279022_TASK_INDEX.md` | 2026-03-01 | 70 open, 0 completed |
| Link health snapshot | `Knowledge-Base/Asana-Deep-Dive/01_DATA_COVERAGE_AUDIT.md` | 2026-03-01 | 317 links checked |
| Section/stage breakdown | `03_ASANA_SECTION_BREAKDOWN.md` | 2026-03-01 | **All unmapped** |

## Meeting Intelligence
| Chart | Source File(s) | Freshness | Caveat |
|-------|---------------|-----------|--------|
| Meeting frequency/timeline | `Meeting-Intelligence/index.json` | 2026-03-01 | 24 meetings indexed |
| Meeting coverage stats | `Meeting-Intelligence/SIMLABS_MEETING_COVERAGE_REPORT_2026-03-01.md` | 2026-03-01 | Strict filter applied |
| Transcript content/themes | `Meeting-Intelligence/Transcripts/*.md` | 2026-03-01 | **Stubs only** — no content |

## Content & Assets
| Chart | Source File(s) | Freshness | Caveat |
|-------|---------------|-----------|--------|
| Drive asset inventory | `Knowledge-Base/00_DRIVE_FULL_MIRROR_INDEX.md` | 2026-03-01 | 24 files catalogued |
| SEO artifacts | `Drive-Mirror/04. Marketing - Simulations Labs/SEO/` | 2026-03-01 | Docs present, not parsed |
| Academy content | `Drive-Mirror/04. Marketing - Simulations Labs/Academy/` | 2026-03-01 | 4 video files |
