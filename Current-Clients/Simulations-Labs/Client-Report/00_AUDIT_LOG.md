# Simulations Labs — Full Audit Log

_Generated: 2026-03-01_

## Directory Structure

```
Simulations-Labs/
├── 00_FULL_PRESERVATION_STATUS.md
├── 01_UNIFIED_INSIGHTS_SNAPSHOT.md
├── 02_DATA_DICTIONARY.md
├── 03_ASANA_SECTION_BREAKDOWN.md
├── 99_IDE_BUILD_PROMPT.md
├── README.md
├── Data-Sources/
│   └── Raw/ (21 top-level JSON + asana_deep/ with 91 task JSONs)
├── Drive-Mirror/
│   ├── 01. Account Brief - Simulations Labs/ (4 PDFs + 2 subdirs)
│   ├── 04. Marketing - Simulations Labs/ (Academy/Blogs/Media Buying/SEO/Strategy)
│   └── LARGE_FILES_POLICY.md
├── Knowledge-Base/
│   ├── 00_DRIVE_FULL_MIRROR_INDEX.md
│   ├── Asana-Deep-Dive/ (5 summary/index files)
│   ├── Drive-Documents/ (24 per-file docs)
│   └── Leads-Insights/ (unified leads CSV/JSON + report)
└── Meeting-Intelligence/
    ├── 00_STATUS.md
    ├── 01_DISCOVERY_INDEX.md
    ├── 02_YESTERDAY_ANALYSIS.md
    ├── 03_RECOMMENDATIONS.md
    ├── SIMLABS_MEETING_COVERAGE_REPORT.md
    ├── TRANSCRIPT_FILTER_AUDIT.md
    ├── UNIFIED_MEETINGS_MANIFEST.md
    ├── index.json (24 entries)
    ├── Transcripts/ (24 .md files + README)
    ├── Transcripts-Excluded/ (38 files)
    ├── Raw-Drive/ (11 files)
    ├── Raw-Fathom/ (2 files)
    └── scripts/ (2 Python scripts)
```

## Data Classification

### Structured Data (Report-Ready)
| Source | Format | Records | Confidence |
|--------|--------|---------|------------|
| Instantly campaign analytics | JSON | 2 campaigns | **High** |
| Instantly campaign config | JSON | 2 campaigns | **High** |
| Unified leads | CSV/JSON | 69 leads | **High** |
| Asana tasks (Project 1212...) | JSON | 21 tasks | **High** |
| Asana tasks (Project 1213...) | JSON | 70 tasks | **High** |
| Meeting index | JSON | 24 entries | **High** |
| Links inventory | JSON | 317 links | **Medium** |
| Systeme contacts | JSON | 10 (page 1) | **Low** |
| Systeme tags | JSON | 2 tags | **Medium** |
| Drive inventory | JSON | 24 files | **High** |

### Unstructured Data (Needs Transformation)
| Source | Format | Notes | Confidence |
|--------|--------|-------|------------|
| Meeting transcripts | Markdown | Bodies are stub (`...`) — metadata only | **Low** |
| Drive PDFs | PDF | Contain client briefs, reports — not parsed | **Medium** |
| Academy videos | MP4 | 4 video files mirrored (300MB+) | **Medium** |
| Asana links index | Markdown | 317 links with HTTP status — raw format | **Medium** |

### Missing / Blockers
| Gap | Impact | Resolution |
|-----|--------|------------|
| Instantly open/click tracking disabled | Cannot report engagement rates | Enable tracking in Instantly settings |
| Email activity endpoint empty | No per-lead event timeline | Re-pull after tracking enabled |
| Transcript content is stubs | No NLP theme extraction possible | Re-run Fathom transcript ingestion |
| Systeme contacts incomplete | Only 10 of N contacts captured | Paginate full API extraction |
| Asana sections unmapped | Cannot show pipeline stage distribution | Map sections in Asana + re-export |
| No web analytics (GA/GSC) | No website traffic / ad performance data | Pull Google Analytics + Search Console |
| No ad performance data | Cannot assess campaign ROI | Export from Google Ads dashboard |
| Performance Report CSV | Has data but content not cross-validated | Parse and validate against known metrics |
