# Simulations Labs — QA Checklist

## ✅ Brand Consistency
- [x] Admireworks navy (#001a70) used consistently
- [x] Gold accent (#cc9f53) used for highlights and badges
- [x] Inter font loaded via Google Fonts
- [x] Dark-mode design with proper contrast ratios
- [x] Brand icon (AW) in navigation

## ✅ Data Traceability
- [x] Every chart has a source file reference
- [x] Appendix contains full source traceability table
- [x] Confidence badges on each chart (High/Medium/Low)
- [x] "Data unavailable" marker used where tracking is disabled

## ✅ No Hallucinated Numbers
- [x] Emails sent (1,669) matches instantly_simlabs_campaign_analytics_live.json (844 + 825)
- [x] Replies (2) matches source (1 + 1)
- [x] Bounces (107) matches source (48 + 59)
- [x] Leads (69) matches simlabs_unified_leads.json
- [x] Tasks completed (19/21) matches project_1212055797762548_TASK_INDEX.md
- [x] Meetings (24) matches index.json entries
- [x] Drive assets (24) matches mirror inventory

## ✅ Accessibility & Readability
- [x] Semantic HTML (section, nav, main, footer)
- [x] Single h1 per page
- [x] Meta description present
- [x] Readable font sizes (minimum 12px)
- [x] Color contrast passes minimum thresholds
- [x] Links are descriptive

## ✅ Responsive Behavior
- [x] Breakpoints at 1024px, 768px, 480px
- [x] Chart grid collapses to single column on mobile
- [x] Navigation links hidden on mobile
- [x] KPI cards stack on small screens
- [x] Tables allow horizontal scroll

## ✅ Link Integrity
- [x] Nav links scroll to correct sections
- [x] Version cross-links work (v1 → main, v3 → main/v1)
- [x] CSS paths use relative references (../styles.css for versions)
- [x] No external dependencies except Google Fonts CDN

## ✅ Asset Paths for GitHub Pages
- [x] All paths are relative (no absolute file:// references)
- [x] CSS loaded via relative href
- [x] JS loaded via relative src
- [x] Cross-version links use relative paths
