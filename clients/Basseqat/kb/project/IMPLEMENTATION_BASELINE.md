# Implementation Baseline

This file defines the reusable technical shape expected in new client repos created from this starter.

## Web App Baseline
- framework: Next.js App Router
- language: TypeScript
- styling: Tailwind CSS plus component system of choice
- auth: Firebase Auth
- data: Firestore
- hosting: Firebase App Hosting

## Preferred App Structure
```
apps/web/
  src/
    app/
      (public)/
      (admin)/
      api/
    components/
      admin/
      public/
      shared/
      ui/
    hooks/
    lib/
      firebase/
      crm/
      messaging/
      tracking/
      utils/
    stores/
    types/
```

## Firebase Baseline
```
firebase/
  firestore.rules
  firestore.indexes.json
  storage.rules
  functions/
    src/
      index.ts
```

## Required Local Files
- `apps/web/.env.local`
- `firebase/service-account.json` or working `GOOGLE_APPLICATION_CREDENTIALS`

## Required Shared Config
- `firebase.json`
- `apps/web/apphosting.yaml`

## Operational Guardrails
- separate public funnels from admin routes
- do not let client-specific funnel pages define the reusable admin baseline
- keep verification scripts at the root so any maintainer can run them quickly
- prefer one command center app rather than fragmented dashboards unless documented otherwise

## Build Sequence
1. source ingestion and approval-ready docs
2. project profile and module selection
3. implementation plan
4. reusable admin and backend baseline
5. client-specific funnel implementation
6. launch verification and health checks
