# Simulations Labs — Publish Guide

## Target URL
```
https://ops.admireworks.com/Current-Clients/Simulations-Labs/Client-Report/
```

## GitHub Pages Configuration

### Prerequisites
- Repository is configured for GitHub Pages (currently serving at `ops.admireworks.com`)
- Pages source is set to the appropriate branch (typically `main`)
- Custom domain `ops.admireworks.com` is configured with DNS records

### Deploy Steps
1. Commit all files under `Current-Clients/Simulations-Labs/Client-Report/`
2. Push to the GitHub Pages source branch:
   ```bash
   git add Current-Clients/Simulations-Labs/Client-Report/
   git commit -m "Add Simulations Labs client report (March 2026)"
   git push origin main
   ```
3. Wait for GitHub Pages build (~1-2 minutes)
4. Verify at target URL

### Direct Share URLs
| Version | URL |
|---------|-----|
| Balanced (recommended) | `https://ops.admireworks.com/Current-Clients/Simulations-Labs/Client-Report/` |
| Executive Light | `https://ops.admireworks.com/Current-Clients/Simulations-Labs/Client-Report/v1-executive-light/` |
| Deep Dive | `https://ops.admireworks.com/Current-Clients/Simulations-Labs/Client-Report/v3-deep-dive/` |

## Post-Publish Validation
1. Open each URL in a browser
2. Verify navigation scrolls to correct sections
3. Verify charts render (campaign bars, donut charts)
4. Verify responsive behavior (resize to mobile width)
5. Verify cross-version links work
6. Verify Google Fonts load (check Inter renders)
7. Verify no console errors in DevTools

## Rollback Instructions
If issues are found after publishing:
```bash
git revert HEAD
git push origin main
```

Or to restore a previous version:
```bash
git log --oneline -5
git revert <commit-hash>
git push origin main
```

## Refresh Process
When data is updated:
1. Update source JSON files in `Data-Sources/Raw/`
2. Re-generate `Client-Report/data/report-data.json`
3. Update embedded data in `app.js` (if not loading from JSON)
4. Update date references in HTML
5. Commit and push
