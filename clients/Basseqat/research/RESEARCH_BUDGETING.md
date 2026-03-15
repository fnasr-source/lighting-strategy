# Research Budgeting

Use this file to choose the research stack and control cost before external research starts.

Pricing changes over time. Treat this file as a working guide and verify vendor pricing before high-volume use.

As of 2026-03-13, the recommended stack is still:
- Firecrawl for search, crawl, and extraction
- Perplexity Sonar for web-grounded synthesis
- browser review for visual and judgment-heavy validation

## Official Pricing Snapshot

### Firecrawl
- Free: 500 one-time credits
- Hobby: $16/month for 3,000 credits
- Standard: $83/month for 100,000 credits
- Growth: $333/month for 500,000 credits

Useful unit costs:
- scrape: 1 credit per page
- crawl: 1 credit per page
- map: 1 credit per page
- search: 2 credits per 10 results

Best use:
- broad competitor scans
- landing-page extraction
- site crawl and evidence capture

## Perplexity
- Search API: $5 per 1,000 requests
- Sonar input: $1 per 1M tokens
- Sonar output: $1 per 1M tokens
- Sonar request fee: $5 / $8 / $12 per 1,000 requests for low / medium / high search context
- Sonar Pro request fee: $6 / $10 / $14 per 1,000 requests for low / medium / high search context

Useful interpretation:
- standard Sonar requests are usually measured in cents, not dollars, unless volume is very high
- token cost is usually secondary to request count for normal strategy work

Best use:
- synthesis after evidence is gathered
- follow-up research questions
- quick source-grounded summaries

## Exa
- Search with contents: $7 per 1,000 requests with 10 results included
- additional results beyond 10: $1 per 1,000 results
- summaries: $1 per 1,000 summaries
- contents endpoint: $1 per 1,000 pages per content type
- Exa Deep: $12 per 1,000 requests
- Exa Deep (Reasoning): $15 per 1,000 requests

Best use:
- hard discovery problems
- structured entity finding
- verification-heavy research

## Tavily
- Researcher: free, 1,000 credits/month
- Project: $30/month for 4,000 credits
- Bootstrap: $100/month for 15,000 credits
- Startup: $220/month for 38,000 credits
- Growth: $500/month for 100,000 credits
- pay as you go: $0.008 per credit

Useful unit costs:
- basic search: 1 credit
- advanced search: 2 credits
- basic extract: 1 credit per 5 successful URL extractions
- advanced extract: 2 credits per 5 successful URL extractions
- research: variable, with per-request minimums and maximums

Best use:
- agent-style search workflows
- optional extraction or crawl support
- deeper automation when the default stack is not enough

## Recommended Operating Tiers

### Lean Default
Use:
- Firecrawl Hobby or existing shared Standard account
- Perplexity Sonar
- browser review

Expected project cost:
- marginal API cost often under $5 if using a shared Firecrawl subscription
- if you dedicate a Firecrawl Hobby subscription to a single project month, around $16 plus light Perplexity usage

Use when:
- one main market
- 3 to 6 competitors
- one main persona
- one main offer path

### Standard Strategy Project
Use:
- Firecrawl Standard or shared team plan
- Perplexity Sonar or Sonar Pro for harder synthesis
- browser review

Expected project cost:
- roughly $5 to $25 marginal usage if run on shared subscriptions and normal request volume
- or the effective monthly share of Firecrawl Standard plus low single-digit or low double-digit Perplexity usage

Use when:
- multiple funnels or offers
- multilingual market
- deeper competitor scan
- more source material to normalize

### Heavy Research Project
Use:
- Firecrawl
- Perplexity
- Exa or Tavily as an approved add-on
- browser review

Expected project cost:
- usually still far below manual researcher cost, but can move into tens of dollars per project depending on search depth and workflow volume
- use only when the discovery problem is genuinely harder than the default stack

Use when:
- fragmented or opaque market
- entity discovery is difficult
- verification requirements are high
- multiple geographies or many competitors

## Decision Rule
- default to the lean stack
- add Exa only when discovery and structured verification are bottlenecks
- add Tavily only when agentic search or extraction workflows are genuinely needed
- keep human review mandatory regardless of tooling

## Quality Rule
These tools can outperform a person on speed, breadth, and repeatability of desk research.
They do not replace:
- founder interviews
- strategic judgment
- offer evaluation
- cultural nuance checks
- copy taste

Use them to improve the evidence base, not to outsource the final thinking.

## Source Links
- Firecrawl pricing: https://www.firecrawl.dev/pricing
- Firecrawl billing/credits: https://docs.firecrawl.dev/billing
- Perplexity pricing: https://docs.perplexity.ai/docs/getting-started/pricing
- Exa pricing: https://exa.ai/pricing
- Exa pricing update: https://exa.ai/docs/changelog/pricing-update
- Tavily credits and pricing: https://docs.tavily.com/documentation/api-credits
