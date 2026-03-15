# Admireworks Data Model

Firestore remains the live system of record for the portal. Internal source documents stay in the repo under `clients/{slug}/`.

## Core Portal Collections

### `clients`
Client account records used for access control, billing, and reporting.

### `userProfiles`
Portal users and their role/permission model.

### `threads` / `messages`
Client communication threads and replies.

### `invoices`, `payments`, `recurringInvoices`
Billing and payment operations.

### `campaigns`, `platformConnections`, `monthlyClientRollups`, `dailyPlatformMetrics`
Campaign and reporting visibility.

## Client Artifact Publishing Collections

### `clientArtifacts`
The latest approved snapshot for a client-facing or internal artifact.

| Field | Type | Notes |
|---|---|---|
| `clientId` | string | Firestore client reference |
| `clientName` | string | Denormalized display name |
| `artifactType` | enum | `strategy_doc`, `strategy_presentation`, `ad_copy`, `campaign_flow`, `report`, `task_bundle`, `asset` |
| `title` | string | Portal-facing artifact title |
| `slug` | string | Stable publishing slug |
| `status` | enum | `draft`, `in_review`, `published`, `archived` |
| `visibility` | enum | `internal`, `client` |
| `sourcePath` | string? | Canonical repo path inside `clients/{slug}/` |
| `summary` | string? | Short client-safe summary |
| `locale` | string? | `ar`, `en`, etc. |
| `version` | string? | Human-readable version marker |
| `storageUrl` | string? | File URL for portal download |
| `opsUrl` | string? | Static branded URL on `ops.admireworks.com` |
| `publishedAt` | timestamp/string? | Publish timestamp |
| `publishedBy` | string? | User or script attribution |
| `createdAt` | timestamp | First publish time |
| `updatedAt` | timestamp | Last update time |

### `clientArtifactVersions`
Version history for published artifacts.

| Field | Type | Notes |
|---|---|---|
| `artifactId` | string | Reference to `clientArtifacts` doc |
| `clientId` | string | Firestore client reference |
| `clientName` | string | Denormalized name |
| `artifactType` | enum | Same as artifact |
| `version` | string | Version label |
| `summary` | string? | Change summary |
| `publishedBy` | string? | Attribution |
| `snapshot` | map | Snapshot of published artifact fields |
| `createdAt` | timestamp | Version creation time |

### `clientApprovals`
Approval and revision-request state for client-visible artifacts.

| Field | Type | Notes |
|---|---|---|
| `artifactId` | string | Linked artifact |
| `clientId` | string | Client scope |
| `clientName` | string | Denormalized name |
| `artifactType` | enum | Linked artifact type |
| `title` | string | Approval label |
| `status` | enum | `pending`, `approved`, `changes_requested` |
| `requestedBy` | string | User ID or email |
| `requestedByName` | string | Display name |
| `decisionBy` | string? | Reviewer identifier |
| `decisionSummary` | string? | Notes or change request |
| `createdAt` | timestamp | Request time |
| `updatedAt` | timestamp | Last decision/update time |

## Permission Model

Permissions now include both legacy reporting access and the new artifact layer:

```text
clients:read, clients:write
invoices:read, invoices:write
payments:read, payments:write
leads:read, leads:write
proposals:read, proposals:write
reports:read, reports:write
artifacts:read, artifacts:write
campaigns:read, campaigns:write
communications:read, communications:write
settings:read, settings:write
team:read, team:write
billing:read, billing:write
scheduling:read, scheduling:write
performance:read, performance:write
```

## Security Rules

- `clientArtifacts` are writable by internal users only.
- Client users can read `clientArtifacts` only when the document is scoped to one of their linked client IDs and `visibility == client`.
- `clientArtifactVersions` follow the same read/write scope.
- Messages are now scoped through their parent thread's client relationship instead of being readable to any signed-in user.
