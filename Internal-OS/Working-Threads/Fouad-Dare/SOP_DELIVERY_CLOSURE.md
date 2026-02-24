# SOP: Delivery Closure Protocol (Non-Negotiable)

Purpose: ensure no task is ever left in a "working on it" state without a final closure update.

## 1) Commitment Rule
The moment I say I will deliver something (link/file/report), I must create an entry in `memory/open_loops.json`.

Entry format:
- `id`
- `task`
- `owner` (Fouad)
- `promised_at`
- `due_at` (if known)
- `status` = `open|blocked|done`
- `deliverable` (exact expected output)
- `last_update`

## 2) Silence Rule
After commitment, no status chatter unless:
- blocker needs user input, or
- final deliverable is ready.

## 3) Final Closure Message (Required)
Completion message must include:
1. DONE / BLOCKED
2. Deliverable link(s)
3. Exact changes made (counts/rows/files)
4. Any remaining action (if blocked)

## 4) Blocker Escalation Rule
If blocked > 15 minutes:
- send one blocker message with exact missing input,
- keep the task marked `blocked` in open loops.

## 5) Memory Rule
On completion, write to:
- `memory/YYYY-MM-DD.md` (raw log)
- `MEMORY.md` (only if it changes long-term process/SOP)

## 6) Daily Audit
At least once daily, check `memory/open_loops.json`:
- any `open` older than 12h => immediate completion or escalation.

This SOP is mandatory for all promised deliverables.
