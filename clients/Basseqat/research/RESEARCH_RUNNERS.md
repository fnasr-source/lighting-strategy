# Research Runners

Use this file with `docs/research/research-requests.json` to automate repeatable research tasks.

## Purpose
- execute provider-backed research without inventing ad hoc workflows
- save raw outputs in the repo
- generate lightweight markdown findings for human review
- update `docs/research/source-log.md` automatically

## Main Command
```bash
npm run research:run
```

Provider-specific commands:
```bash
npm run research:run:firecrawl
npm run research:run:exa
npm run research:run:tavily
```

## Config File
Edit:
- `docs/research/research-requests.json`

Each task should define:
- `id`
- `enabled`
- `provider`
- `query`
- `supports`

Optional fields:
- `maxResults`
- `country`
- `location`
- `searchDepth`
- `includeDomains`
- `excludeDomains`
- `notes`

## Output Locations
- raw provider JSON: `docs/research/data/`
- generated markdown findings: `docs/research/findings/`
- source citations: `docs/research/source-log.md`

## Rule
Automation gathers evidence and organizes it.
Humans still decide:
- what matters
- what is weak
- what is inference
- what actually belongs in the strategy
