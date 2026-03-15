# Client Workspace Template

Use the scaffold script to create or normalize internal client workspaces:

```bash
node scripts/scaffold-client-workspace.mjs _templates {Client-Slug}
```

## What This Template Represents

This template is for the canonical internal client workspace inside `admireworks-internal-os`.

It is where Admireworks keeps:
- briefs and transcripts
- research and strategy
- messaging systems
- presentation source
- blockers, decisions, and next steps
- approved handoff exports

## Important Rules

- Keep the full KB and internal reasoning here.
- Publish only approved, client-safe snapshots into `my.admireworks.com`.
- Publish branded static decks from this workspace to `ops.admireworks.com`.
- Export only execution-safe materials from `handoff/` into client build repos.
- Do not duplicate the full internal workspace into delivery repos.
