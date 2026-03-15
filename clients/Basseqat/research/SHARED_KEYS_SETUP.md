# Shared Research Keys Setup

Use this file to keep shared internal research keys available across devices without committing live secrets into git.

## Supported Locations
The research scripts load keys from these locations in order:
1. `ADMIREWORKS_SHARED_RESEARCH_ENV`
2. `~/.admireworks/research.env`
3. `.env.research.local`
4. `.env.research`

## Recommended Cross-Device Setup
Create this file on each device:
```bash
mkdir -p ~/.admireworks
```

Then add:
```bash
~/.admireworks/research.env
```

With contents like:
```bash
FIRECRAWL_API_KEY=...
PERPLEXITY_API_KEY=...
EXA_API_KEY=...
TAVILY_API_KEY=...
GOOGLE_GEMINI_API_KEY=...
GOOGLE_GEMINI_IMAGE_MODEL_ID=...
```

## Image Model Rule
Use Nano Banana 2 / Gemini 3.1 Flash Image only for presentation image generation.
Do not switch the workflow to older Gemini image models unless explicitly requested.

## Why Not Commit Keys To The Repo
- the starter is meant to be reusable and shareable
- committed live keys are easy to leak, rotate badly, or expose in history
- a shared local env file gives the same convenience without putting secrets in git

## Team Rule
Use the same shared path on every device.
Do not commit live research keys or live Nano Banana 2 image configuration into the starter repo or client repos.
