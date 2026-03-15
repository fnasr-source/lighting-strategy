# Research Automation System

This file defines the repeatable research pipeline for every cloned client repo.

## Objective
Produce research that is:
- evidence-backed
- traceable
- reusable inside the strategy workflow
- resistant to shallow or generic output

## Pipeline
1. Intake review
2. Missing-inputs check
3. Provider readiness check
4. Budget and tool selection
5. Work-order generation
6. External research execution
7. Source logging
8. Contamination review
9. Human review
10. Strategy synthesis

## Step 1: Intake Review
Read:
- `docs/client_kb/INDEX.md`
- `docs/client_kb/MISSING_INPUTS.md`
- `docs/project/PROJECT_CONTEXT.md`

## Step 2: Missing-Inputs Check
If critical items are missing:
- update `docs/client_kb/MISSING_INPUTS.md`
- ask for the missing inputs before moving on

## Step 3: Provider Readiness
Set research keys in:
- `.env.research.local`

Run:
```bash
npm run research:check
npm run research:firecrawl:verify
npm run research:exa:verify
npm run research:tavily:verify
```

Preferred outcome:
- `PERPLEXITY_API_KEY` configured plus at least one extraction provider (`FIRECRAWL_API_KEY` or `TAVILY_API_KEY`)

Blocking outcome:
- if Perplexity or an extraction provider is missing, stop and configure the automated research stack before external research

## Step 4: Budget And Tool Selection
Create or update:
- `docs/research/research-budget.md`
- `docs/research/research-requests.json`

Decide:
- default stack vs optional add-ons
- expected project research depth
- budget cap before approval is needed
- whether lean, standard, or heavy research is justified

Default rule:
- start with Firecrawl + Perplexity + human review
- use Tavily as the extraction layer when Firecrawl is unavailable or the workflow needs Tavily's extract/crawl model
- only add Exa when the market, entity-discovery, or verification needs justify it

## Step 5: Work-Order Generation
Run:
```bash
npm run research:work-order
```

This generates:
- `docs/research/work-order.md`

## Step 6: External Research Execution
Configure the task list in:
- `docs/research/research-requests.json`

Run:
```bash
npm run research:run
```

Create or update:
- `docs/research/research-budget.md`
- `docs/research/research-report.md`
- `docs/research/competitor-scan.md`
- `docs/research/customer-language-bank.md`
- `docs/research/market-environment-scan.md`
- `docs/research/source-log.md`

Automation outputs should land in:
- `docs/research/data/`
- `docs/research/findings/`

## Step 7: Source Logging
Every meaningful research claim should have:
- source URL
- source type
- note on what it supports
- note if it is fact vs inference

## Step 8: Contamination Review
Review:
- which patterns came from this specific client
- which patterns are reusable doctrine only
- which examples, claims, or assumptions may have leaked from another client

Record the result in:
- `docs/research/CONTAMINATION_CHECKLIST.md`

## Step 9: Human Review
Review:
- claim quality
- source quality
- market fit
- contamination risk from past client assumptions

Record the result in:
- `docs/research/research-review.md`

## Step 10: Strategy Synthesis
Only after the research review is acceptable:
- move into `docs/strategy/`
- use the canonical playbook

## Failure Conditions
Stop and ask for input if:
- the offer is still unclear
- the target geography is unclear
- the primary persona is still too broad
- proof is too weak
- the market evidence is too thin to support strategy claims
