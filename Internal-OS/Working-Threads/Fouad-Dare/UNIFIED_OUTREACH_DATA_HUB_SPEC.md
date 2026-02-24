# Unified Outreach Data Hub — Implementation Spec (v1)

## Objective
Build a central control plane on Firebase/GCP where:
- Leads live in one system of record.
- Campaign execution can be delegated to providers (Instantly, Resend, HubSpot, etc.) via API.
- All events/insights flow back into one per-contact timeline and reporting layer.

## Guiding Principles
1. **Control plane internal, execution external** (initially).
2. **One canonical ID** per lead/contact across all providers.
3. **Event-first architecture** (webhooks + reconciliation polling).
4. **Idempotency everywhere** (no duplicate sends/events).
5. **Provider-agnostic adapters** (swap provider without rewriting core logic).

---

## High-Level Architecture
- **Frontend/Admin**: Firebase Hosting
- **API/Orchestration**: Cloud Functions / Cloud Run
- **DB**: Firestore
- **Blob files**: Cloud Storage
- **Queueing**: Cloud Tasks / PubSub
- **Scheduler**: Cloud Scheduler
- **Secrets**: Secret Manager
- **Monitoring**: Cloud Logging + alerting

---

## Core Collections (Firestore)

### `contacts/{contactId}`
- `contactId` (internal UUID)
- `email`
- `firstName`, `lastName`, `company`, `title`
- `source` (apollo, manual, import, etc.)
- `status` (new, active, paused, bounced, replied, won, lost)
- `tags[]`
- `ownerId`
- `createdAt`, `updatedAt`

### `campaigns/{campaignId}`
- `name`
- `provider` (instantly, resend, hubspot, internal)
- `providerCampaignId`
- `channel` (cold_email, transactional, nurture)
- `state` (draft, running, paused, completed)
- `sendPolicy` (dailyCap, sendingWindow, timezone)
- `createdAt`, `updatedAt`

### `enrollments/{enrollmentId}`
- `contactId`
- `campaignId`
- `provider`
- `providerLeadId`
- `stepIndex`
- `state` (queued, sent, delivered, opened, clicked, replied, bounced, unsubscribed)
- `lastEventAt`

### `events/{eventId}`
- `eventId` (internal)
- `idempotencyKey` (provider:eventType:providerEventId)
- `provider` (instantly/resend/hubspot)
- `providerEventId`
- `contactId`
- `campaignId`
- `enrollmentId`
- `eventType` (sent, delivered, open, click, reply, bounce, complaint, unsubscribe)
- `raw` (full payload)
- `occurredAt`, `ingestedAt`

### `provider_links/{providerLinkId}`
- `provider`
- `contactId`
- `providerContactId`
- `providerLeadId`
- `providerCampaignId`
- `createdAt`

### `inboxes/{inboxId}`
- `provider`
- `email`
- `domain`
- `healthScore` (0-100)
- `dailyCap`
- `warmupState`
- `lastBounceRate`
- `state` (active, throttled, paused)

---

## Unified Event Schema (Minimum)
Required normalized fields:
- `eventId`
- `provider`
- `providerEventId`
- `contactId`
- `campaignId`
- `eventType`
- `occurredAt`
- `idempotencyKey`
- `raw`

Event types baseline:
- `sent`, `delivered`, `open`, `click`, `reply`, `bounce`, `complaint`, `unsubscribe`

---

## Provider Adapter Contract
Each provider adapter must implement:
1. `createCampaign(payload)`
2. `upsertLeads(campaignId, leads[])`
3. `startCampaign(campaignId)` / `pauseCampaign(campaignId)`
4. `fetchEvents(cursor|from,to)`
5. `normalizeEvent(rawEvent) -> UnifiedEvent`
6. `healthCheck()`

---

## Data Flow
1. Lead import (Apollo/manual/CSV) -> `contacts`
2. Orchestrator assigns campaign + inbox policy
3. Adapter pushes to provider (Instantly/Resend)
4. Provider webhooks ingest -> normalize -> `events`
5. Reconciliation job polls provider every X min to fill gaps
6. Contact timeline + dashboards update from `events`

---

## Reliability Controls
- Queue all outbound API calls.
- Retries with exponential backoff.
- Dead-letter queue for failed jobs.
- Idempotency key on every outbound/inbound operation.
- Reconciliation polling to catch missed webhooks.

---

## Security
- API keys in Secret Manager only.
- Signed webhook verification.
- PII masking in logs.
- Role-based admin access.

---

## MVP Scope (Recommended)
### Phase 1 (2-3 weeks)
- Contacts + campaigns + enrollments data model
- Instantly adapter (push leads, start/pause)
- Event ingestion (webhook + polling)
- Basic contact timeline

### Phase 2 (2 weeks)
- Resend adapter
- Unified dashboard (campaign + contact insights)
- Inbox health monitoring

### Phase 3 (2-3 weeks)
- Reply intent classification
- Routing automation (next best action)
- Client-facing reporting views

---

## Non-Goals (v1)
- Rebuilding full SMTP/mailbox infrastructure from scratch
- Full deliverability stack replacement on day one

---

## Success Criteria
- One contact view with all provider events.
- Stable sync with <1% missing events after reconciliation.
- Campaign control from internal admin UI.
- Provider swap possible via adapter abstraction.
