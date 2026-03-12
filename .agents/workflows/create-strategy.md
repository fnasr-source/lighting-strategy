---
description: Create a Direct Response Marketing Strategy for a client
---

# Create Strategy Workflow

## When to Use
When a client needs a full marketing strategy — a branded, interactive presentation with 36 sections.

## Prerequisites
- Client is active or in proposal stage
- Research completed in `clients/{Client-Name}/research/`

## Steps

1. **Read the Strategy System spec**:
   - View `ops/strategy-system/STRATEGY-SYSTEM.md` — the full 36-section framework

2. **Gather strategy kit assets**:
   - Fonts and logos: `ops/strategy-system/strategy-kit/`
   - Setup instructions: `ops/strategy-system/strategy-kit/INSTRUCTIONS.md`

3. **Generate strategy content** → save as `content.json`:
   - Follow the 36-section structure (Cover → Closing)
   - Use StoryBrand framework: Customer = Hero, Business = Guide
   - Apply Direct Response principles: every element drives measurable action

4. **Build the presentation**:
   - HTML/CSS/JS interactive presentation
   - Two-tab sync system (Presenter + Client views)
   - Per-slide comment system
   - Keyboard shortcuts (arrows, F, C, N)

5. **Generate visual assets** (Phase 2):
   - Create image prompts from strategy context
   - Use `generate_image` tool
   - Brand-align using AW design tokens

6. **Save deliverables**:
   - Content: `clients/{Client-Name}/campaign/strategy/content.json`
   - Presentation: `clients/{Client-Name}/campaign/strategy/index.html`
   - Assets: `clients/{Client-Name}/campaign/strategy/assets/`

7. **Update strategies hub**:
// turbo
   ```bash
   node ops/proposal-system/scripts/build_strategies_hub.js --root "/Users/user/Documents/IDE Projects/Internal AW SOP"
   ```

## Framework Reference
- **StoryBrand**: Character → Problem → Guide → Plan → CTA → Success → Failure
- **Direct Response**: DR Playbook at `ops/strategy-system/Direct-Response-Framework.md`

## Historical References
- Past strategy PDFs: `ops/strategy-system/historical-pdfs/`
