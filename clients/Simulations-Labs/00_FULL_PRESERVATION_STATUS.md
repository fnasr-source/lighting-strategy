# Simulations Labs — Full Data Preservation Status

_Generated: 2026-03-01T14:53:56.160898_

## Scope completed in this pass
- Full Google Drive mirror for client folder contents into this project folder
- Per-file markdown documentation for each Drive item
- Fathom transcript corpus rebuilt and deduplicated for Simulations Labs scope
- Asana snapshots added for both the original project and the new pipeline project

## Drive mirror
- Files mirrored: **24**
- Mirror path: `Drive-Mirror/`
- File docs path: `Knowledge-Base/Drive-Documents/`
- Inventory file: `Data-Sources/Raw/google_drive_full_mirror_inventory.json`

## Asana projects included
- `1212055797762548` (`1212055797762548`): total 2, open 2, completed 0
- `1213388383279022` (`1213388383279022`): total 0, open 0, completed 0

## Anti-duplication rules now in place
1. Meetings dedupe key = `recording_id` (Fathom)
2. Transcript corpus in `Meeting-Intelligence/Transcripts/` must match `Meeting-Intelligence/index.json` 1:1
3. Non-scope items are isolated under `Transcripts-Excluded/`
4. Drive mirror inventory uses file id + hash metadata for duplicate detection

## If this folder is the only remaining artifact
- It now contains mirrored client Drive files, transcript corpus, Asana snapshots, outreach/source snapshots, and dashboard build docs.
- This is now sufficient as a single-source package for IDE-based dashboard generation.

## Asana deep extraction update
- Deep extraction completed for both Simulations Labs Asana projects:
  - `1213388383279022` (Pipeline v2)
  - `1212055797762548` (DRM - Simulations Labs; timeline-expanded)
- For each task: details, description, comments, stories, attachments were exported to raw JSON.
- External/internal links were extracted and indexed for follow-up data capture.
- See: `Knowledge-Base/Asana-Deep-Dive/` and `Data-Sources/Raw/asana_deep/`.
