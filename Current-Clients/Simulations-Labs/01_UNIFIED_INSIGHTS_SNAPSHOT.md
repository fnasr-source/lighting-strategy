# Simulations Labs — Unified Insights Snapshot

_Last updated: 2026-03-01 13:37 UTC_

## What was consolidated in this pass
- Google Drive client folder inventory (recursive tree)
- Asana pipeline snapshot (sections + tasks)
- Instantly campaign + account + lead-list snapshots
- Systeme.io tags + contacts (first page + SimLabs candidate filtering)
- Existing Meeting Intelligence artifacts already in this repo

## Data coverage summary
- Drive items discovered: **40** (16 folders, 24 files)
- Asana tasks snapshot: **70** total | **70** open | **0** completed
- Instantly campaigns total: **5**
- Instantly SimLabs-related campaigns matched by name: **2**
- Systeme tags: **2**
- Systeme contacts fetched in page 1: **10**

## Key findings (early)
- SimLabs campaigns are present in Instantly (e.g., Security Professionals, CTF Organizers).
- Lead lists for SimLabs exist in Instantly and are ready for mapping into dashboard dimensions.
- Systeme has tags present; tagging structure can be expanded after final taxonomy approval.
- Repository already contains meeting transcript intelligence under `Meeting-Intelligence/Transcripts/`.

## Known gaps to close next
1. Pull full paginated contacts from Systeme (API pagination behavior needs endpoint-specific handling).
2. Pull Instantly activity/event-level metrics (campaign-level object available; deeper events endpoint needs confirmed route mapping).
3. Link each outreach artifact to Asana task IDs + meeting transcript references in a single relational index.
4. Add Gmail/copy inventory ingestion for client-specific outbound content corpus.

## Raw source files
- `Data-Sources/Raw/google_drive_client_folder_tree.json`
- `Data-Sources/Raw/asana_project_dashboard.json`
- `Data-Sources/Raw/asana_sections.json`
- `Data-Sources/Raw/asana_tasks_in_project.json`
- `Data-Sources/Raw/instantly_campaigns.json`
- `Data-Sources/Raw/instantly_simlabs_campaign_details.json`
- `Data-Sources/Raw/instantly_lead_lists.json`
- `Data-Sources/Raw/instantly_accounts.json`
- `Data-Sources/Raw/systeme_tags.json`
- `Data-Sources/Raw/systeme_contacts_page1.json`
- `Data-Sources/Raw/systeme_simlabs_candidates.json`
