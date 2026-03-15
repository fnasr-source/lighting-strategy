# Build-Ready Implementation Plan — Basseqat

## Build Sequence (from IMPLEMENTATION_BASELINE.md)
1. ✅ Source ingestion and approval-ready docs — Complete
2. ✅ Project profile and module selection — Complete
3. 🔨 Implementation plan — This document
4. ⬜ Reusable admin and backend baseline
5. ⬜ Client-specific funnel implementation
6. ⬜ Launch verification and health checks

---

## Module Implementation Map

### Module 1: Dashboard
| Field | Detail |
|---|---|
| Purpose | Bird's-eye view of funnel health, lead volume, messaging activity, and campaign performance |
| Data | Firestore: `leads` (aggregated counts by source, status, date), `campaignFlows` (active/paused), `adCopies` (status), WhatsApp metrics |
| Roles | superadmin, admin: full access. owner: full access. sales_manager: read-only dashboard. viewer: read-only |
| Screens | Dashboard home: KPI cards, lead trend chart, channel breakdown, active campaigns, recent activity feed |
| Actions | View metrics, filter by date range, export snapshot |
| Dependencies | Leads module, CRM module, WhatsApp module |
| Seed data | Demo KPI cards with zero values |
| Risks | Dashboard usefulness depends on real data flow; will be empty until ads launch |
| Verification | KPI cards render with zero state; charts render with empty data; role-based access enforced |

---

### Module 2: Leads
| Field | Detail |
|---|---|
| Purpose | Central lead registry — capture, track, assign, and manage all incoming leads |
| Data | Firestore: `leads` collection — fields: name, phone, email, source, utm_source, utm_medium, utm_campaign, status (new/contacted/qualified/converted/lost), assignedTo, createdAt, updatedAt, notes, tags |
| Roles | superadmin, admin: full CRUD. owner: full CRUD. sales_manager: assign, edit, view. sales_agent: view assigned leads only, update status. viewer: read-only |
| Screens | Lead list (filterable, sortable, searchable), lead detail view, lead import (CSV), lead export |
| Actions | Create lead, edit lead, assign lead, change status, add notes, bulk assign, filter by source/status/date |
| Dependencies | Landing page form submission, WhatsApp conversation tracking, Meta Lead Ads (if used) |
| Seed data | 5 demo leads with varied statuses and sources |
| Risks | Lead deduplication logic needed (same phone from ads and WhatsApp) |
| Verification | CRUD operations work; role-based filtering works; CSV import/export works; UTM tracking captures correctly |

---

### Module 3: CRM
| Field | Detail |
|---|---|
| Purpose | Sales pipeline management — deal stages, task assignment, follow-up tracking, team performance |
| Data | Firestore: `deals` collection — fields: leadId, dealStage (discovery/proposal/negotiation/visit/closed-won/closed-lost), assignedTo, value, notes, tasks[], updatedAt. Additional: `tasks` subcollection per deal |
| Roles | superadmin, admin: full access. owner: pipeline overview + deal creation. sales_manager: manage team deals, reassign. sales_agent: own assigned deals only. viewer: read-only |
| Screens | Pipeline view (kanban), deal detail, task list, team performance summary |
| Actions | Create deal, move between stages, assign/reassign, add tasks, add notes, log activities |
| Dependencies | Leads module (lead → deal conversion) |
| Seed data | Demo pipeline with one deal per stage |
| Risks | Pipeline stages must match real sales process — confirm with client |
| Verification | Kanban drag-and-drop works; deal creation from lead works; role-based access enforced |

---

### Module 4: Campaign Flows
| Field | Detail |
|---|---|
| Purpose | Visual review and approval of multi-step campaign flows (email, WhatsApp, retargeting sequences) |
| Data | Firestore: `campaignFlows` — fields: name, type (email/whatsapp/retargeting), status (draft/review/approved/live), steps[], createdBy, approvedBy, notes |
| Roles | superadmin, admin: create, edit, approve. owner: review, approve. sales_manager: view. viewer: view |
| Screens | Flow list, flow detail (step-by-step view), flow approval |
| Actions | Create flow, edit steps, submit for review, approve/reject, add notes |
| Dependencies | Messaging module (for template linking) |
| Seed data | Draft WhatsApp nurture flow and email follow-up flow |
| Risks | Flow execution engine is separate from review — review module only |
| Verification | Flow creation works; approval workflow works; role-based access enforced |

---

### Module 5: Ad Copy Review
| Field | Detail |
|---|---|
| Purpose | Structured review and approval of ad copy drafts before launch |
| Data | Firestore: `adCopies` — fields: angle, variant, text, headline, cta, status (draft/review/approved/rejected/live), reviewNotes, createdBy, reviewedBy |
| Roles | superadmin, admin: create, edit, review, approve. owner: review, approve. viewer: view |
| Screens | Ad copy list (grouped by angle), copy detail with review form, copy comparison view |
| Actions | Create copy, submit for review, approve/reject with notes, mark as live |
| Dependencies | None (standalone review module) |
| Seed data | 15 ad copy variants from ad-copy-drafts.md |
| Risks | None significant |
| Verification | Copy creation works; review workflow works; status filtering works |

---

### Module 6: WhatsApp Inbox
| Field | Detail |
|---|---|
| Purpose | AI-assisted WhatsApp inbox for managing conversations with leads |
| Data | Firestore: `conversations` — fields: leadId, phone, messages[], status (active/waiting/closed), assignedTo, isAIMode, lastMessageAt. `whatsappTemplates` — fields: name, body, status, category |
| Roles | superadmin, admin: full access, AI settings. owner: view all, assign. sales_manager: view team conversations, assign. sales_agent: own conversations. viewer: read-only |
| Screens | Conversation inbox (list + chat view), AI settings, template manager, conversation assignment |
| Actions | Reply (manual or AI), assign conversation, switch AI/manual mode, create template, view conversation history |
| Dependencies | WhatsApp Business API integration, AI reply system, Leads module |
| Seed data | Demo conversation with AI + manual messages |
| Risks | WhatsApp Business API setup required; template approval by Meta; AI response quality |
| Verification | Messages send/receive; AI replies work; assignment works; template submission works |

---

### Module 7: Messaging Cockpit
| Field | Detail |
|---|---|
| Purpose | Campaign-level orchestration across WhatsApp, email, and retargeting |
| Data | Aggregated views from `campaignFlows`, `conversations`, email delivery data |
| Roles | superadmin, admin: full access. owner: overview. viewer: read-only |
| Screens | Campaign performance overview, channel comparison, active sequence status |
| Actions | View campaign performance, pause/resume sequences, filter by channel |
| Dependencies | WhatsApp module, Campaign Flows module, email integration |
| Seed data | Empty state with channel placeholders |
| Risks | Requires multiple integrations to be meaningful |
| Verification | Renders with empty state; data populates when integrations are live |

---

### Module 8: Client Portal
| Field | Detail |
|---|---|
| Purpose | Shared delivery tracking and approvals for Basseqat co-founders |
| Data | Firestore: `projectTasks` — fields: title, description, status (todo/in-progress/review/done), assignedTo, linkedDeliverable, updatedAt |
| Roles | owner: view tasks, approve deliverables. superadmin, admin: create tasks, update status |
| Screens | Task dashboard, deliverable review, approval buttons |
| Actions | View tasks, approve/request-revision, add comments |
| Dependencies | None (standalone) |
| Seed data | Demo project tasks for Basseqat onboarding milestones |
| Risks | None significant |
| Verification | Task CRUD works; approval workflow works; role-based access enforced |

---

### Module 9: Settings
| Field | Detail |
|---|---|
| Purpose | Admin user management, feature flags, WhatsApp template configuration, AI controls |
| Data | Firestore: `appConfig`, `users` |
| Roles | superadmin: full access. admin: limited settings. others: no access |
| Screens | User management, role assignment, feature toggles, WhatsApp settings, AI configuration |
| Actions | Add/remove users, assign roles, toggle features, manage WhatsApp templates, configure AI |
| Dependencies | Firebase Auth |
| Seed data | Default appConfig document |
| Risks | Must prevent lockout (superadmin break-glass access) |
| Verification | User creation works; role assignment works; feature toggles work; no lockout possible |

---

### Module 10: Health
| Field | Detail |
|---|---|
| Purpose | Prevent hidden failures — deployment checks, webhook status, queue monitoring |
| Data | System-level checks (no Firestore data) |
| Roles | superadmin, admin: full access. others: no access |
| Screens | Health dashboard with check statuses (green/yellow/red) |
| Actions | Run health check, view status history |
| Dependencies | All other modules (checks their status) |
| Seed data | N/A |
| Risks | None significant |
| Verification | All checks return status; error states display correctly |

---

## Public Funnel Implementation

### Landing Page
| Field | Detail |
|---|---|
| Spec | `docs/pages/primary-landing-page-spec.md` |
| Technology | Next.js page (Arabic, RTL, mobile-first) |
| Route | `/(public)/` — main landing page |
| Integrations | Meta Pixel, click-to-WhatsApp, UTM capture, Firestore lead creation |
| Dependencies | Proof assets from client, domain configuration |

### Thank You Page
| Field | Detail |
|---|---|
| Purpose | Post-conversion confirmation after WhatsApp click |
| Content | Confirmation message, what to expect next, brand reinforcement |
| Route | `/(public)/thank-you` |
| Integrations | Meta Pixel conversion event |

---

## Technical Stack
- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS + component system
- Auth: Firebase Auth (Google Sign-In for admins)
- Data: Firestore
- Hosting: Firebase App Hosting
- WhatsApp: WhatsApp Business API
- Email: TBD (Resend or SendGrid)
- Analytics: Meta Pixel + server-side CAPI

## Firestore Collections Summary
| Collection | Used By |
|---|---|
| `leads` | Leads, Dashboard, CRM |
| `deals` | CRM |
| `conversations` | WhatsApp Inbox |
| `whatsappTemplates` | WhatsApp Inbox, Settings |
| `campaignFlows` | Campaign Flows, Messaging Cockpit |
| `adCopies` | Ad Copy Review |
| `projectTasks` | Client Portal |
| `users` | Settings, Auth |
| `appConfig` | Settings, Health |

---

## Implementation Priority Order
1. **Firebase project setup** (project, auth, Firestore rules)
2. **Landing page** (public funnel — highest urgency for ad launch)
3. **Leads module** (to capture from landing page)
4. **WhatsApp Inbox** (primary conversion channel)
5. **CRM** (sales pipeline after WhatsApp qualification)
6. **Dashboard** (visibility into funnel health)
7. **Campaign Flows + Ad Copy Review** (approval workflows)
8. **Messaging Cockpit** (orchestration layer)
9. **Client Portal** (delivery tracking)
10. **Settings + Health** (admin and monitoring)

**Source:** IMPLEMENTATION_BASELINE.md, MODULE_BLUEPRINT.md, SCHEMA_CORE.md, PROJECT_PROFILE.md
