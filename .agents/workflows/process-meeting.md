---
description: Process a meeting recording or transcript for a client
---

# Process Meeting Workflow

## When to Use
When you have a meeting recording or transcript to process for any client.

## Steps

1. **Save the recording**:
   - Place in `clients/{Client-Name}/meetings/recordings/`
   - Naming: `{YYYY-MM-DD}-{Topic}.{ext}` (e.g., `2026-03-12-Discovery-Call.mp4`)

2. **Save or generate transcript**:
   - Place in `clients/{Client-Name}/meetings/transcripts/`
   - Naming: `{YYYY-MM-DD}-{Topic}.md`

3. **Extract insights** from the transcript:
   - Key decisions made
   - Action items
   - Client pain points (in their own words)
   - Budget or timeline signals
   - Competitive mentions
   - Follow-up questions

4. **Update or create** `clients/{Client-Name}/01-Transcript-Insights.md`:
   - Add new insights under a dated section header
   - Cross-reference with research if applicable

5. **If this is a pre-proposal meeting**, also:
   - Update `clients/{Client-Name}/00-Client-Index.md` with new contacts/info
   - Feed insights into proposal/research workflow

6. **If this is a kickoff meeting**, also:
   - Generate gap analysis against `ops/briefing/Project-Briefing-Questionnaire/`
   - Draft follow-up email per `ops/briefing/Kickoff-Follow-Up-SOP.md`

## Naming Convention
```
meetings/
├── recordings/
│   ├── 2026-03-12-Discovery-Call.mp4
│   └── 2026-03-20-Kickoff.mp4
└── transcripts/
    ├── 2026-03-12-Discovery-Call.md
    └── 2026-03-20-Kickoff.md
```
