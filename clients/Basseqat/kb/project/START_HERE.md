# Start Here: Basseqat

This is the entry point for any human or IDE agent joining the project.

## Objective
Use this repository as the single working environment for:
- client context intake
- strategy development
- copy development
- offer design
- landing page specification
- campaign flow review
- implementation planning
- client collaboration
- admin and Firebase operational setup

## Source-Of-Truth Order
1. `docs/project/PLACEHOLDER_GUIDE.md`
2. `docs/project/PROJECT_PROFILE.md`
3. `docs/project/PROJECT_CONTEXT.md`
4. `docs/project/SCHEMA_CORE.md`
5. `docs/project/IMPLEMENTATION_BASELINE.md`
6. `docs/client_kb/INDEX.md`
7. `docs/client_kb/MISSING_INPUTS.md`
8. raw files in `docs/client_kb/meetings/raw/`, `briefs/`, and `whatsapp/`
9. `docs/research/`
10. approved synthesized files in `docs/strategy/`, `docs/messaging/`, `docs/offers/`, and `docs/pages/`
11. `docs/active_state/` for what is currently being worked on

## Immediate Setup For A New Client
1. Rename placeholders.
2. Fill `PROJECT_PROFILE.md`.
3. Fill `PROJECT_CONTEXT.md`.
4. Add the project service account to `firebase/service-account.json` or set `GOOGLE_APPLICATION_CREDENTIALS`.
5. Run `npm run firebase:verify:config`.
6. Add the first brief and first transcript.
7. Update `docs/client_kb/INDEX.md`.
8. Fill `docs/client_kb/MISSING_INPUTS.md`.
9. Set research keys through `~/.admireworks/research.env`, `ADMIREWORKS_SHARED_RESEARCH_ENV`, or `.env.research.local`.
10. Run `npm run research:check`, `npm run research:firecrawl:verify`, `npm run research:exa:verify`, `npm run research:tavily:verify`, and `npm run research:run` as applicable.
   `research:check` should pass before external research begins. Standard automated research uses Perplexity plus Firecrawl or Tavily.
11. Generate or prepare `docs/research/work-order.md`.
12. Review `docs/research/RESEARCH_BUDGETING.md` and set `docs/research/research-budget.md`.
13. Review and update `docs/research/CONTAMINATION_CHECKLIST.md`.
14. Add the first implementation snapshot in `docs/active_state/README.md`.

## Missing Inputs Gate
Before any agent creates strategy, copy, implementation plans, or build tasks:
1. review `docs/client_kb/MISSING_INPUTS.md`
2. identify which critical inputs are still missing
3. ask the user for missing critical inputs before continuing if they block good work
4. complete the research layer before final strategy synthesis
5. clear the contamination checklist before presenting or operationalizing the strategy
6. stay within the documented research budget unless the user approves a deeper pass
7. do not assume the full module set; follow `PROJECT_PROFILE.md`

Do not continue into planning or implementation while critical context is still absent.

## Supporting Docs
- `docs/project/MODULE_BLUEPRINT.md`
- `docs/project/PROJECT_TYPE_MATRIX.md`
- `docs/project/SOURCE_PATTERN.md`
- `docs/project/IMPLEMENTATION_BASELINE.md`
- `docs/research/RESEARCH_BUDGETING.md`
- `docs/research/SHARED_KEYS_SETUP.md`
- `docs/research/research-budget.md`
- `docs/ops/ADMIN_AUTH_AND_APPHOSTING_RUNBOOK.md`
- `docs/research/CONTAMINATION_CHECKLIST.md`
- `docs/strategy/STRATEGY_QA_GATE.md`
