# Project Context

## Client Snapshot
- Client name: Basseqat
- Slug: basseqat
- Primary market: Egyptian expats in Saudi Arabia
- Secondary markets: Egypt (higher-ticket segment), GCC expansion later
- Core language: Arabic (Egyptian dialect for ads/WhatsApp, MSA-influenced for formal copy)
- Primary offer: Agricultural participation in date palm farming — long-term, documentation-led, proof-first investment opportunity
- Offer ladder: Core participation offer → higher-ticket tier for Egypt-based segment → possible GCC expansion
- Primary channel mix: Meta Ads (Facebook/Instagram) → landing page → WhatsApp (AI-assisted + human handoff) → retargeting

## Project Profile Snapshot
- Delivery tier: Full Growth OS (Option 3)
- Selected module set: Dashboard, Leads, CRM, Campaign Flows, Ad Copy Review, WhatsApp, Messaging Cockpit, Client Portal, Settings, Health
- Public funnel scope: Landing page, thank-you page, lead capture, WhatsApp click-through
- Admin scope: Full command center — leads, CRM pipeline, WhatsApp inbox, campaign review, reporting
- Automation scope: WhatsApp AI replies, lead assignment flows, email sequences, retargeting
- Excluded modules / deferred work: Social media management (outsourced separately), blog/editor, invoices, cohorts, webinar-specific admin

## Infrastructure Snapshot
- Firebase project ID: TBD — awaiting setup
- Firebase web app ID: TBD — awaiting setup
- App Hosting backend ID: TBD — awaiting setup
- App Hosting region: TBD — likely me-central1 or europe-west1
- Functions region: TBD
- Production branch: main
- Base domain: TBD — awaiting client domain confirmation
- Credential path: firebase/service-account.json

## Business Objective
Generate high-quality, pre-qualified leads for Basseqat's date palm agricultural participation offer. Build a trust-led performance system that attracts serious Egyptian expats in Saudi Arabia, educates them through transparent documentation and proof, pre-qualifies them before WhatsApp conversation, and moves qualified prospects toward process explanation, virtual tours, farm visits, and sales handoff. Achieve measurable qualified conversation rates and MQL rates while keeping cost per qualified conversation commercially viable.

## Customer Objective
The customer is an Egyptian expat in Saudi Arabia (40+), family-oriented, saving for Egypt, cautious and skeptical from exposure to exaggerated investment offers. They want a real, transparent, long-term agricultural opportunity with documented operations, verifiable proof, and calm human guidance — without hype, guaranteed returns language, or emotional pressure. Their desired outcome is a trusted path to participate in a serious agricultural project that gives them confidence, documentation, and a clear understanding of what they are entering.

## Project Objective
Admireworks is building the full growth operating system for Basseqat: strategy, messaging house, offer architecture, landing pages, ad campaigns, WhatsApp AI-assisted reply system, CRM, lead management pipeline, retargeting flows, and campaign performance reporting — from zero digital presence to a fully operational performance funnel.

## Core Deliverables
- Direct-response strategy (with compliance/trust guardrails)
- Messaging house (Arabic, market-native, proof-first)
- Offer architecture (trust-led, process-first, documentation-backed)
- Landing page specs (conversion-focused, high-trust design)
- Ad copy drafts (5 angles, multiple variants)
- Campaign flows (awareness → consideration → conversion → nurture)
- WhatsApp operations map (AI reply + human handoff + follow-up sequences)
- Admin command center (leads, CRM, pipeline, reporting, WhatsApp inbox)

## Initial Operational Decisions
- auth method: Firebase Auth (Google Sign-In for admins)
- admin access model: RBAC — superadmin (Admireworks), admin, owner, sales_manager, sales_agent, viewer
- payment stack: TBD — client to confirm (InstaPay for client payments confirmed)
- WhatsApp stack: WhatsApp Business API with AI-assisted replies + human escalation
- email stack: TBD — awaiting selection (likely Resend or SendGrid)
- analytics stack: Meta Pixel + server-side CAPI + UTM tracking + Firestore analytics snapshots
