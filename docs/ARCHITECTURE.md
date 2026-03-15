# Admireworks Platform Architecture

## Overview

Admireworks now operates with four explicit layers:

1. `clients/{slug}/` inside `admireworks-internal-os` is the canonical internal workspace.
2. `my.admireworks.com` is the authenticated portal for internal teams and clients.
3. `ops.admireworks.com` is the branded static publishing layer.
4. Client-specific build repos are execution-only repos for shipped code.

The internal workspace is where research, strategy, messaging, and presentation work happens. The portal and ops layer should receive approved snapshots only.

## Architecture Map

```text
admireworks-internal-os/
|- clients/{slug}/
|  |- kb/
|  |- research/
|  |- strategy/
|  |- messaging/
|  |- presentations/
|  |- communications/
|  |- handoff/
|  `- active_state/
|- apps/client-portal/          -> my.admireworks.com
|- ops/                         -> ops.admireworks.com source systems
|- firebase/                    -> Firestore admin scripts + publish tooling
`- scripts/                     -> local workspace scaffolding
```

## Responsibility Split

### Internal Client Workspace
Use this for:
- briefs and kickoff material
- meeting transcripts and recordings
- research and competitor scans
- written strategy
- ad copy, email flows, WhatsApp flows
- presentation source
- decision logs and blockers
- approved handoff exports

### my.admireworks.com
Use this for:
- client-safe artifact snapshots
- client communication threads
- billing, invoices, payments
- campaign/reporting visibility
- future client approvals and task views

### ops.admireworks.com
Use this for:
- strategy presentations
- branded static reports or one-page summaries
- shareable outputs that should live under the Admireworks brand

### Delivery Repos
Use these only for:
- landing pages
- admin/product code
- deployment config
- runtime assets
- approved implementation specs imported from `handoff/`

## Portal Application Structure

```text
apps/client-portal/
|- src/app/dashboard/
|  |- reports/
|  |- strategies/
|  |- presentations/
|  |- ad-copies/
|  |- campaign-flows/
|  |- communications/
|  `- ...other operational areas
|- src/lib/firestore.ts
|- src/lib/client-artifacts.ts
`- src/contexts/AuthContext.tsx
```

## Security Model

- Owners and admins can see all clients and manage artifacts.
- Team users are scoped to assigned clients.
- Client logins can only see artifacts and communications for their linked client records.
- `clientArtifacts` are readable by clients only when `visibility == client`.
- Raw internal files stay in the repo and are never exposed directly through the portal.

## Publishing Flow

1. Build or update the working material in `clients/{slug}/`.
2. Approve the client-safe output.
3. Publish a portal record into `clientArtifacts`.
4. If the asset is static and branded, publish it to `ops.admireworks.com` and store the `opsUrl`.
5. If engineering execution is starting, export only the approved build-ready spec into `handoff/` and then into the delivery repo.
