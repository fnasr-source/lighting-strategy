# Research Tooling Stack

Use this file to keep the research system repeatable across projects.

For pricing, project budget guidance, and tool-selection rules, also read:
- `docs/research/RESEARCH_BUDGETING.md`
- `docs/research/research-budget.md`

## Recommended Default Stack

### 1. Firecrawl
Use for:
- search with scraped content
- targeted page extraction
- site crawl and page discovery

Why:
- good fit for turning websites into LLM-ready markdown
- useful for competitor pages, offer pages, landing pages, and blog scans

Env var:
- `FIRECRAWL_API_KEY`

Recommended local setup:
- store it in `.env.research.local`
- verify with `npm run research:firecrawl:verify`

## 2. Perplexity Sonar
Use for:
- web-grounded synthesis
- follow-up questioning
- fast research summaries that still cite sources

Why:
- useful as a synthesis layer after evidence has been gathered
- OpenAI-compatible request format lowers integration friction

Env var:
- `PERPLEXITY_API_KEY`

## Optional Add-Ons

### Exa
Use when you need:
- structured discovery
- async research sets
- verification-heavy entity collection

Env var:
- `EXA_API_KEY`

Recommended local setup:
- store it in `.env.research.local`
- verify with `npm run research:exa:verify`

### Tavily
Use when you need:
- agent-first search / extract / crawl workflows
- deeper LangChain-style research tooling

Env var:
- `TAVILY_API_KEY`

Recommended local setup:
- store it in `.env.research.local`
- verify with `npm run research:tavily:verify`

## Human-In-The-Loop Layer
Use Google Antigravity or browser tooling for:
- visual validation
- manual sanity checks
- reviewing pages that require human judgment
- final presentation generation and polish

## Rule
Do not rely on a single provider to do discovery, extraction, synthesis, and judgment alone.
Split the work:
- search / extract
- synthesize
- human review

## Default Operating Choice
Start with:
- Firecrawl
- Perplexity Sonar
- human review in browser

Add Exa or Tavily only when the project needs deeper discovery, verification, or agentic crawling beyond the default stack.

Use `docs/research/research-requests.json` plus `npm run research:run` to automate provider tasks into the repo.
