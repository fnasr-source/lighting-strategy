# Simulations Labs — Assumptions and Limitations

## Known Constraints

### 1. Email Engagement Tracking Disabled
- **Impact**: Open rates and click-through rates report as 0 across all campaigns
- **Root Cause**: Both Instantly campaigns have `open_tracking: false` and `link_tracking: false`
- **Implication**: Cannot assess email engagement quality; only reply and bounce data is available
- **Resolution**: Enable open + link tracking in Instantly campaign settings

### 2. Email Activity Events Not Available
- **Impact**: No per-lead event timeline (sent/opened/replied timestamps)
- **Root Cause**: API endpoint returned empty `items: []` for event-level data
- **Implication**: Cannot build engagement timeline or lead scoring based on activity
- **Resolution**: Re-pull after tracking is enabled; may require Instantly plan verification

### 3. Meeting Transcript Content Missing
- **Impact**: Cannot perform NLP/theme extraction or content analysis on meetings
- **Root Cause**: Fathom transcript ingestion captured metadata only; bodies are stub `...`
- **Implication**: Meeting frequency data is available but no qualitative insights
- **Resolution**: Re-run Fathom sync script with full transcript body fetch

### 4. Systeme.io Contacts Incomplete
- **Impact**: Only 10 contacts available (page 1 of unknown total)
- **Root Cause**: API pagination not implemented in initial extraction
- **Implication**: CRM lead funnel analysis is incomplete
- **Resolution**: Implement paginated extraction for all Systeme contacts

### 5. Asana Sections Unmapped
- **Impact**: Cannot display pipeline stage distribution
- **Root Cause**: All 70 pipeline tasks show section as "(unmapped)"
- **Implication**: Stage-based workflow analysis not possible
- **Resolution**: Map sections in Asana project, then re-export

### 6. No Web Analytics Data
- **Impact**: No website traffic, conversion, or ad performance metrics
- **Root Cause**: Google Analytics, Search Console, and Google Ads data not yet pulled
- **Implication**: Cannot assess marketing funnel effectiveness end-to-end
- **Resolution**: Connect GA/GSC APIs or export manual reports

### 7. Performance Report CSV Not Validated
- **Impact**: `Clients Performance Report - Simulations Labs.csv` exists but contents not cross-checked
- **Root Cause**: File was mirrored from Drive without parsing
- **Resolution**: Parse and validate against known client metrics

## Reporting Principles
1. **No fabricated metrics** — if data is unavailable, the report shows "Data unavailable in current snapshot"
2. **Facts vs interpretation** — every insight is labeled as "Validated" (data-backed) or "Inferred" (requires confirmation)
3. **Confidence badges** — every section carries High/Medium/Low confidence based on source quality
4. **Caveats inline** — tooltips and footnotes explain data limitations at point of display
