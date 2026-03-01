# Simulations Labs — Unified Meetings Manifest

## Canonical source policy
- Canonical meeting transcript source: **Fathom API filtered to Simulations Labs scope**.
- Google Drive meeting docs are treated as **supporting artifacts** (notes/recaps/transcriptions), not canonical recordings.
- De-duplication key: `recording_id` (Fathom).

## Current coverage
- Canonical SimLabs meetings in `index.json`: **36**
- Unique recording IDs: **36**
- Filtered Fathom matches: **36**
- Drive meeting-like artifacts inventoried: **6**

## Non-duplication guarantees
1. `index.json` is rebuilt from filtered Fathom output only.
2. `Transcripts/` must match `index.json` 1:1.
3. Any non-scope or legacy files are moved to `Transcripts-Excluded/`.

## Sync commands
- Refresh canonical SimLabs meetings from Fathom:
  - `python3 Current-Clients/Simulations-Labs/Meeting-Intelligence/scripts/sync_simlabs_fathom.py`
- Validate transcript folder scope:
  - `python3 Current-Clients/Simulations-Labs/Meeting-Intelligence/scripts/audit_transcripts.py`
