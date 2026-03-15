# Module Blueprint

## Included In The Starter

### Dashboard
- purpose: operator visibility into funnel, messaging, and delivery state
- must show: lead counts, campaign status, queue state, health alerts

### Leads
- purpose: central lead registry
- must support: filtering, assignment, source visibility, timeline, next action

### CRM Baseline
- purpose: pipeline and follow-up control
- must support: stages, tasks, sequence enrollment, owner assignment

### Campaign Flows Review
- purpose: structured email / WhatsApp / funnel flow approval
- must support: versions, comments, decisions, status

### Ad Copy Review
- purpose: structured copy QA and angle review
- must support: angle mapping, variants, framework visibility, approval state

### WhatsApp Inbox Baseline
- purpose: operational messaging control
- must support: conversation state, queue visibility, templates, AI status

### Messaging Cockpit Baseline
- purpose: campaign-level orchestration view
- must support: stage logic, schedule visibility, message logs, exceptions

### Client Portal / Project Tasks
- purpose: client-facing approvals and shared delivery tracking
- must support: tasks, approvals, blockers, handover notes

### Settings
- purpose: user, integration, and operational configuration
- must support: admin users, feature flags, WhatsApp templates, AI controls

### Health
- purpose: prevent hidden operational failure
- must support: config checks, deployment checks, queue checks, webhook status

## Deliberately Excluded From V1
- blog/editor
- invoices
- cohorts
- webinar-specific admin
- niche analytics modules
- vertical-specific public page implementations
- client-specific content libraries beyond documented specs

## Build Rule
Implement the recurring foundation first.
Only add niche client modules after the reusable baseline is stable and documented.
Do not assume every client gets every baseline module; confirm actual inclusion in `PROJECT_PROFILE.md`.
