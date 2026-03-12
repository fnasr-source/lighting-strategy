## Workspace Defaults

- Firebase and Google Cloud tasks in this workspace should assume the default service account file is `/Users/user/Documents/IDE Projects/Internal AW SOP/firebase/service-account.json`.
- Before running Firebase CLI, App Hosting, Cloud Run, or Google Cloud deployment commands, export `GOOGLE_APPLICATION_CREDENTIALS=/Users/user/Documents/IDE Projects/Internal AW SOP/firebase/service-account.json` unless the user explicitly requests a different credential.
- Prefer commands that use the service account explicitly so deployments, rules updates, and admin scripts do not fall back to an interactive local login.
- When a task involves deployment, release, Firebase config changes, or production-impacting backend work, verify whether there is a matching push to GitHub required to keep remote state aligned.
- Do not leave unmentioned local-only changes after meaningful implementation work. If commit or push is not explicitly requested, state clearly that changes are still local and unpushed.
- If the user explicitly asks for end-to-end completion, include the Git steps needed to commit and push after verification, provided policy allows it.

## Project Organization

- **Client folders** live in `clients/{Client-Name}/`. Never create client work outside this directory.
- **Operational systems** (proposals, strategies, briefing, dashboards) live in `ops/`.
- **The main web app** is `apps/client-portal/` — the only production app.
- **Workflow definitions** are in `.agents/workflows/`. Check available workflows before starting any process.
- **Master AI reference** is `Claude.md` at the project root — read it for full context.
- **Lifecycle documentation** is in `docs/WORKFLOWS.md`.

## Deployment Notes

- Firebase assets and admin scripts are primarily under `firebase/`.
- The shared service account file for this workspace is checked in at `firebase/service-account.json`.
- For app code that needs the credential path, prefer `FIREBASE_SERVICE_ACCOUNT_PATH` or `GOOGLE_APPLICATION_CREDENTIALS` over hardcoding alternate locations.
- Client portal deploys automatically via Firebase App Hosting on push to `main`.
- Static dashboards deploy via GitHub Pages to `ops.admireworks.com`.

## Browser Checks

- When browser automation is requested, first determine whether the task should use the Codex browser tool or project-local Playwright/Puppeteer scripts.
- If project-local Playwright is not installed in the current package, do not assume `npx playwright` tests are available; report that gap and use the Codex browser tool when appropriate.
