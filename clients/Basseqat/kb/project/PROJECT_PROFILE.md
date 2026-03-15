# Project Profile

Define the operating shape of this client project before strategy and implementation planning begin.

## Project Type
- delivery tier: full-growth-os
- business model: lead generation (WhatsApp-first, high-consideration agricultural participation)
- primary outcome: qualified WhatsApp conversations → MQLs → sales handoff → farm visit / virtual tour → deal close

## Scope Decision
- public funnel scope: landing page, thank-you page, lead capture form, click-to-WhatsApp path
- admin scope: full command center — leads, CRM pipeline, WhatsApp inbox, campaign review, reporting, settings, health
- automation scope: WhatsApp AI-assisted replies, lead auto-assignment, email/WhatsApp follow-up sequences, retargeting flows
- channels in scope now: Meta Ads (Facebook/Instagram), landing page, WhatsApp, retargeting, email sequences
- channels deferred: TikTok Ads, Snapchat, Google Ads, multi-market GCC expansion

## Module Selection
Mark each module as:
- included now
- optional later
- excluded for this client

| Module | Decision | Why |
|---|---|---|
| Dashboard | included now | Client needs full visibility into funnel, leads, messaging, and delivery state from day one |
| Leads | included now | Central lead registry is core to the sales workflow — source tracking, assignment, filtering |
| CRM | included now | Pipeline management, deal stages, task assignment, sales team performance — demonstrated in meeting and explicitly requested |
| Campaign Flows | included now | Structured email/WhatsApp/funnel flow review needed for approval workflow |
| Ad Copy Review | included now | Angle-based ad testing requires structured copy QA and approval |
| WhatsApp | included now | Primary conversion channel — AI-assisted replies, human handoff, conversation state, templates |
| Messaging Cockpit | included now | Campaign-level orchestration across WhatsApp, email, and retargeting |
| Client Portal | included now | Basseqat co-founders (Khaled, Islam) will need shared delivery tracking and approvals |
| Settings | included now | Admin users, feature flags, WhatsApp templates, AI controls |
| Health | included now | Prevent hidden failures — config checks, deployment checks, queue checks, webhook status |

## Integration Selection
| Area | Decision | Notes |
|---|---|---|
| Firebase Auth | included now | Google Sign-In for admin users |
| Firestore | included now | Core data layer for leads, CRM, tasks, messaging, config |
| App Hosting | included now | Firebase App Hosting for the web app |
| WhatsApp stack | included now | WhatsApp Business API with AI reply + human escalation — replacing or competing with Genioo.do |
| Email stack | included now | Selection TBD (Resend or SendGrid) — for follow-up sequences and notifications |
| Payments | deferred | Not in scope for v1 – InstaPay is used for client payments but not prospect-facing |
| Analytics | included now | Meta Pixel, server-side CAPI, UTM tracking, Firestore analytics snapshots |

## Reuse From Past Projects
List reusable patterns that are allowed to inform this project.
Each item must be phrased as reusable method or module pattern, not as client truth.

- RBAC pattern from The Slim Game (superadmin / admin / owner / sales_manager / sales_agent / viewer)
- WhatsApp operationalization pattern from Edrak Space (conversation state, AI reply, human handoff)
- Lead assignment and CRM flow architecture from Admireworks baseline
- Campaign flow review and ad copy approval workflow from starter baseline
- Firebase App Hosting deployment pattern from monorepo baseline

## Deferred / Not In Scope
- Social media management (Basseqat will handle via separate agency per meeting agreement)
- TikTok Ads, Snapchat, Google Ads (deferred to Month 3+)
- Multi-market GCC expansion (deferred)
- Blog/editor, invoices, cohorts, webinar-specific admin
- Client-specific payment collection system

## Approval
- profile approved by: TBD — awaiting user confirmation
- approval date: TBD
