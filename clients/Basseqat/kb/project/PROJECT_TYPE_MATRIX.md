# Project Type Matrix

Use this matrix to avoid building the same module set for every client.

## Strategy-Only
Use when Admireworks is delivering strategy, messaging, offers, and copy without building a working admin app yet.

Typical module decision:
- include now: Campaign Flows, Ad Copy Review, Client Portal
- optional later: Dashboard, Leads, CRM, WhatsApp, Messaging Cockpit, Health
- exclude now: anything not needed for the current contract

## Funnel Build
Use when Admireworks is building the funnel plus a light internal operating layer.

Typical module decision:
- include now: Dashboard, Leads, Campaign Flows, Ad Copy Review, Settings, Health
- optional later: CRM, WhatsApp, Messaging Cockpit, Client Portal

## Full Growth OS
Use when the client needs a working internal command center across leads, follow-up, messaging, approvals, and operations.

Typical module decision:
- include now: Dashboard, Leads, CRM, Campaign Flows, Ad Copy Review, WhatsApp, Messaging Cockpit, Client Portal, Settings, Health

## Rule
Do not assume the full module set by default.
Choose the project type first, then confirm the included modules in `PROJECT_PROFILE.md`.
