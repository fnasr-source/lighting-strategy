# SOP: Big Task Execution (Research + Multi-Source + Long-Running)

Purpose: avoid failures on large, multi-source operations and ensure reliable delivery.

## 1) Define Scope First (before running heavy commands)
- Goal, output format, and acceptance criteria.
- Data sources involved (email, Fathom, files, GitHub, etc.).
- Time/window filters and inclusion/exclusion rules.

## 2) Break into Phases (never one giant run)
- Phase A: Discovery (list candidate items only)
- Phase B: Validation (confirm relevant subset)
- Phase C: Extraction (fetch full data in batches)
- Phase D: Structuring (save normalized files)
- Phase E: Analysis (insights + recommendations)
- Phase F: Delivery (links + exact outputs)

## 3) Batch & Checkpoint Strategy
- Process in small batches (e.g., 10–20 records).
- Write checkpoints after each batch to `tmp/` or `memory/`.
- On crash, resume from last checkpoint (no rework).

## 4) Defensive Parsing Rules
- Treat all external fields as untrusted/variable type.
- Normalize dict/list/string/int safely before parsing.
- Use fail-soft behavior: log bad records, continue pipeline.

## 5) Runtime Safety
- Avoid single long monolithic command when possible.
- Prefer staged scripts/files over giant inline one-liners.
- If complexity is high, use sub-agent execution with explicit deliverables.

## 6) Progress Updates
- For long tasks: send periodic concise progress updates:
  - completed phase
  - remaining phase
  - blocker (if any)

## 7) Final Closure Format
- DONE/BLOCKED
- What was produced (file paths + links)
- Coverage summary (how many items processed)
- Key insights + recommendations
- Any unresolved gaps with exact reason

This SOP is mandatory for all big tasks going forward.
