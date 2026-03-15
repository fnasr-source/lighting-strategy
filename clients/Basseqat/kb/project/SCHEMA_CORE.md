# Core Schema And Module Contract

This file defines the baseline reusable contract for new client projects.

## Route Group Contract
Use one codebase with a clear split between public funnel work and admin operations.

### Public
- `/`
- client-specific funnel routes generated from approved docs
- tracking, lead capture, and thank-you routes

### Admin
- `/admin`
- `/admin/leads`
- `/admin/crm`
- `/admin/crm/pipeline`
- `/admin/crm/tasks`
- `/admin/crm/sequences`
- `/admin/campaign-flows`
- `/admin/ad-copies`
- `/admin/whatsapp`
- `/admin/messaging/cockpit`
- `/admin/client-portal`
- `/admin/settings/users`
- `/admin/settings/integrations`
- `/admin/settings/whatsapp/templates`
- `/admin/settings/whatsapp/ai`
- `/admin/health`

## Core Firestore Collections
- `users`
- `leads`
- `projectTasks`
- `campaignFlows`
- `adCopies`
- `conversationState`
- `messageLogs`
- `crmLogs`
- `appConfig`

## Recommended Extended Collections
Use these when the client implementation needs them. Do not invent parallel alternatives without reason.
- `salesTasks`
- `salesSequences`
- `sequenceEnrollments`
- `leadAssignments`
- `emailSchedules`
- `whatsappSchedules`
- `aiReplyQueue`
- `analyticsSnapshots`
- `insights`
- `activityLogs`

## Access Model
- Firebase Auth is the default auth baseline.
- Firestore allowlists should read from `appConfig/adminAccessControl` and `appConfig/main`.
- `users.userType` is required and should separate `admireworks` from `client`.
- Break-glass admin emails are allowed as a fallback, but must stay limited to Admireworks-controlled accounts only.

## `appConfig` Required Docs
### `appConfig/main`
- `maintenanceMode`
- `featureFlags`
- `superAdminEmails`
- `updatedAt`
- `updatedBy`

### `appConfig/adminAccessControl`
- `allowedEmails`
- `updatedAt`
- `updatedBy`

## `users` Fields
- `email`
- `displayName`
- `userType`: `admireworks | client`
- `adminRole`: `superadmin | admin | owner | sales_manager | sales_agent | viewer`
- `clientId`
- `isActive`
- `createdAt`
- `updatedAt`

## `leads` Recommended Fields
- `firstName`
- `lastName`
- `fullName`
- `email`
- `phone`
- `status`
- `source`
- `campaignId`
- `campaignName`
- `assignedTo`
- `lastContactAt`
- `nextActionAt`
- `tags`
- `country`
- `language`
- `utm`
- `notes`
- `createdAt`
- `updatedAt`

## `projectTasks` Fields
- `clientId`
- `title`
- `description`
- `ownerSide`: `admireworks | client`
- `status`: `pending | in_progress | done | blocked`
- `priority`: `high | medium | low`
- `section`: `client_action | team_working | approval | delivery | launch`
- `assignee`
- `dueDate`
- `commentsCount`
- `createdAt`
- `updatedAt`
- `completedAt`

## `campaignFlows` Recommended Fields
- `clientId`
- `name`
- `status`
- `audience`
- `trigger`
- `goal`
- `primaryCta`
- `awarenessLevel`
- `versionCount`
- `currentVersionId`
- `createdAt`
- `updatedAt`

## `adCopies` Recommended Fields
- `clientId`
- `campaignId`
- `assetName`
- `channel`
- `audience`
- `angle`
- `framework`
- `status`
- `hook`
- `body`
- `cta`
- `proofSource`
- `createdAt`
- `updatedAt`

## Messaging Collections
### `conversationState`
- one document per lead or conversation thread
- current stage
- next scheduled action
- ai reply state
- owner

### `messageLogs`
- inbound and outbound event record
- channel
- delivery state
- message type
- related lead / conversation id
- timestamps

### `crmLogs`
- lead-level activity timeline
- status changes
- task completion
- assignment changes
- notes and approvals

## Security Rules Baseline
The reusable baseline should support:
- public lead creation when required
- admin-only operational reads
- stricter write rules for config, approval, and logs
- Admireworks-only editing on campaign review content
- client-limited visibility only through intended portal surfaces

## Deployment Contract
- `firebase.json` should point to `firebase/firestore.rules`, `firebase/firestore.indexes.json`, and `firebase/functions`.
- App Hosting should read `apps/web/apphosting.yaml`.
- Service-account-first scripts should resolve credentials from `GOOGLE_APPLICATION_CREDENTIALS` or `firebase/service-account.json`.

## Notes
- Do not create parallel task systems in new clients.
- Do not skip `userType`; client-facing collaboration depends on it.
- Public pages are client-specific and should be generated from approved docs, not hardwired into this starter.
- Keep schema additions deliberate and document them in `docs/project/DECISIONS_LOG.md`.
