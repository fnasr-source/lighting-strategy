---
description: Research a new lead or potential client before a meeting
---

# Lead Research Workflow

## When to Use
When a potential client has been identified and you need to create a research report before a discovery call or meeting.

## Prerequisites
- Client or company name
- Website URL (if available)
- Any existing context (referral notes, LinkedIn profile, etc.)

## Steps

1. **Create the client folder** (if it doesn't exist):
// turbo
```bash
cp -r clients/_templates "clients/{Client-Name}"
```

2. **Update the client index** at `clients/{Client-Name}/00-Client-Index.md`:
   - Set Stage to `Research`
   - Fill in contacts and key links

3. **Website Audit** (use `browser_subagent`):
   - Navigate to the client's website
   - Score 1-10: Design, UX, E-commerce, SEO, Mobile, Content, Arabic/local language
   - Capture screenshots of key pages
   - Identify CMS/platform

4. **Social Media Audit** (use `browser_subagent`):
   - Check: Facebook, Instagram, TikTok, YouTube, LinkedIn
   - Record: follower count, post frequency, engagement rate, content quality
   - Capture representative screenshots

5. **Competitor Research** (use `browser_subagent` + `search_web`):
   - Identify 3-5 competitors via `"{industry}" "{country}" competitors`
   - Audit each competitor's website and social profiles
   - Build comparison matrix

6. **Market Data** (use `search_web` + `read_url_content`):
   - Search: `"{industry}" "{country}" market size growth report`
   - Extract: market size, growth rate, key trends

7. **Write Research Report**:
   - Save as `clients/{Client-Name}/research/02-Research-Report.md`
   - Follow the standard structure from `docs/WORKFLOWS.md` (Stage 2)

8. **Write Competitor Scan**:
   - Save as `clients/{Client-Name}/research/03-Competitor-Scan.md`
   - Include feature comparison matrix and positioning map

9. **Optionally generate branded HTML report**:
   - Save as `clients/{Client-Name}/research/Strategic_Market_Report.html`

## Output
- `clients/{Client-Name}/research/02-Research-Report.md`
- `clients/{Client-Name}/research/03-Competitor-Scan.md`
- Screenshots in `clients/{Client-Name}/research/assets/` (if any)
