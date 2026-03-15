# Clients

Each folder inside `clients/` is an internal Admireworks workspace for one client.

## Canonical Rule

This repo is the source of truth for:
- raw client context
- transcripts and meeting notes
- research and strategy
- messaging and copy systems
- presentation source
- internal delivery state

Client delivery repos should receive only approved exports from `handoff/`.

## Standard Workspace Shape

```text
clients/
|- _templates/
|- {Client-Slug}/
|  |- 00-Client-Index.md
|  |- CLIENT_WORKSPACE.md
|  |- kb/
|  |- research/
|  |- strategy/
|  |- messaging/
|  |- presentations/
|  |- communications/
|  |- handoff/
|  |- active_state/
|  |- briefing/
|  |- meetings/
|  |- proposal/
|  `- invoices/
```

## Create or Normalize a Workspace

```bash
node scripts/scaffold-client-workspace.mjs _templates {Client-Slug}
```

## Folder Meanings

| Folder | Use |
|---|---|
| `kb/` | Raw internal context and reference material |
| `research/` | Validated research outputs |
| `strategy/` | Written strategy deliverables |
| `messaging/` | Ad copy, email flows, WhatsApp logic |
| `presentations/` | Presentation source and ops publishing data |
| `communications/` | Client-safe communication packs |
| `handoff/` | Approved exports for delivery repos |
| `active_state/` | Current blockers, decisions, next actions |

## Publish Model

- Publish approved artifacts into `my.admireworks.com` via `clientArtifacts`.
- Publish branded static decks to `ops.admireworks.com`.
- Never move the full internal workspace into a delivery repo.
