# SimLabs Outreach Automation

This folder contains the implementation of the Simulations Labs outreach expansion plan.

## Script
- `simlabs_outreach_manager.mjs`

## Required Environment Variables
- `INSTANTLY_API_KEY`
- `APOLLO_API_KEY`

## Commands

```bash
# 1) Pull fresh Instantly snapshots + freeze baseline
node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs snapshot

# 2) Pull Apollo contacts for Educators + CTF Organizers v2
node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs enrich --target-per-segment=500

# 3) Pull Instantly-enriched contacts from outbound activity history
node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs instantly-enrich --target=1000

# 3b) Preview net-new Instantly Supersearch pools for live SimLabs segments
node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs instantly-supersearch-preview

# 3c) Request true Instantly Supersearch enrichment into active campaigns
node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs instantly-supersearch-enrich \
  --segment=security_consultants \
  --limit-per-segment=25 \
  --create-tracking-lists

# 4) Build canonical simlabs_master_leads dataset + suppression sets
node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs build-master

# 5) Generate daily scorecard
node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs scorecard

# 6) Apply campaign/list/ramp/ingestion operations
node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs apply-plan --week=1 --upload-limit=300

# 7) Continuous patch upload mode (auto-loops batches until target)
node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs patch-upload \
  --target-created=1000 \
  --batch-size=50 \
  --batch-pause-ms=15000 \
  --max-batches=200

# Full pipeline in one run
node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs run-all --week=1 --target-per-segment=500 --upload-limit=300
```

## Provider Rate-Limit Controls
Use these flags to keep runs step-by-step and below provider caps:
- `--apollo-max-per-minute=35`
- `--apollo-delay-ms=1500`
- `--apollo-segment-delay-ms=5000`
- `--instantly-max-per-minute=16`
- `--instantly-delay-ms=2000`
- `--supersearch-delay-ms=8000`
- `--request-timeout-ms=45000`

Example conservative run:
```bash
APOLLO_API_KEY=... node Current-Clients/Simulations-Labs/scripts/simlabs_outreach_manager.mjs enrich \
  --target-per-segment=500 \
  --apollo-max-per-minute=25 \
  --apollo-delay-ms=2500 \
  --apollo-segment-delay-ms=7000
```

## Dry Run
Use `--dry-run` with `apply-plan` or `run-all` to preview mutating actions.

## Instantly Supersearch Notes
- `instantly-supersearch-preview` is safe to run without credits and writes the live preview report.
- `instantly-supersearch-enrich` requires available Instantly enrichment credits.
- Keep Supersearch runs small and stepped. Recommended starting point:
  - `--limit-per-segment=25`
  - `--instantly-max-per-minute=12`
  - `--instantly-delay-ms=2500`
  - `--supersearch-delay-ms=8000`
- Tracking lists can be created with `--create-tracking-lists`, but campaign import is still performed directly against the target SimLabs campaign.

## Outputs

### Data snapshots
- `Current-Clients/Simulations-Labs/Data-Sources/Raw/instantly_campaigns_live.json`
- `Current-Clients/Simulations-Labs/Data-Sources/Raw/instantly_lead_lists_live.json`
- `Current-Clients/Simulations-Labs/Data-Sources/Raw/instantly_campaign_analytics_live_all.json`
- `Current-Clients/Simulations-Labs/Data-Sources/Raw/instantly_simlabs_campaign_analytics_live.json`
- `Current-Clients/Simulations-Labs/Data-Sources/Raw/instantly_simlabs_email_events_live.json`

### Baselines
- `Current-Clients/Simulations-Labs/Data-Sources/Baselines/snapshot_<timestamp>/...`

### Enrichment
- `Current-Clients/Simulations-Labs/Data-Sources/Raw/apollo_simlabs_enrichment_live.json`
- `Current-Clients/Simulations-Labs/Data-Sources/Raw/instantly_enriched_contacts_live.json`
- `Current-Clients/Simulations-Labs/Data-Sources/Raw/instantly_supersearch_preview_live.json`
- `Current-Clients/Simulations-Labs/Data-Sources/Raw/instantly_supersearch_enrich_live.json`
- `Current-Clients/Simulations-Labs/Knowledge-Base/Leads-Insights/Apollo-Enrichment/*.csv`
- `Current-Clients/Simulations-Labs/Knowledge-Base/Leads-Insights/instantly_enriched_contacts_live.csv`

### Canonical dataset
- `Current-Clients/Simulations-Labs/Knowledge-Base/Leads-Insights/simlabs_master_leads.json`
- `Current-Clients/Simulations-Labs/Knowledge-Base/Leads-Insights/simlabs_master_leads.csv`
- `Current-Clients/Simulations-Labs/Knowledge-Base/Leads-Insights/simlabs_suppression_sets.json`

### Reporting
- `Current-Clients/Simulations-Labs/Knowledge-Base/Leads-Insights/Daily-Scorecards/*`
- `Current-Clients/Simulations-Labs/Knowledge-Base/Leads-Insights/IMPLEMENTATION_REPORT_<date>.md`
- `Current-Clients/Simulations-Labs/Data-Sources/Raw/simlabs_patch_upload_report.json`
