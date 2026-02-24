# Simulations Labs — Meeting Intelligence Status

## Why the folder looked empty
GitHub does not keep empty folders. I created structure paths, but without committed files inside subfolders they appear missing.

## Current state
- Workspace moved to: `Current-Clients/Simulations-Labs/`
- This folder now includes tracked files for visibility and continuity.

## Scope requested by Fouad
- Gather **all Simulations Labs related meeting recaps/transcripts** from Fathom + Gmail.
- Include yesterday's meeting deep read from full transcript (not summary only).
- Save transcript assets and analysis under this folder.
- Provide actionable recommendations.

## Data sources
- Fathom API (`FATHOM_API_KEY`)
- Gmail (subjects/participants linked to Simulations Labs)

## Current blocker history
- Prior extraction runs failed due API rate limits and parsing variability in long monolithic scripts.
- New SOP in place: phased batching + checkpoints + defensive parsing.

## Next execution plan
1. Discovery list (meeting IDs + dates + source) -> `01_DISCOVERY_INDEX.md`
2. Transcript ingestion in batches -> `Transcripts/*.md`
3. Yesterday meeting deep analysis -> `02_YESTERDAY_ANALYSIS.md`
4. Consolidated recommendations -> `03_RECOMMENDATIONS.md`
