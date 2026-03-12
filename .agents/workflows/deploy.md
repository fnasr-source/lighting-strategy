---
description: Deploy changes to the live platform
---

# Deploy Workflow

## When to Use
When changes are ready to be pushed live — code changes, content updates, or dashboard rebuilds.

## Prerequisites
- All changes committed locally
- Clean worktree (no uncommitted changes — enforced by `.githooks/pre-push`)

// turbo-all

## Steps

### 1. Check Git Status
```bash
cd "/Users/user/Documents/IDE Projects/Internal AW SOP" && git status
```

### 2. Stage and Commit
```bash
cd "/Users/user/Documents/IDE Projects/Internal AW SOP" && git add -A && git commit -m "{descriptive message}"
```

### 3. Push to Remote
```bash
cd "/Users/user/Documents/IDE Projects/Internal AW SOP" && git push origin main
```

### 4. Verify Deployment

**Client Portal** (`my.admireworks.com`):
- Auto-deploys via Firebase App Hosting on push to `main`
- Check build status at Firebase Console → App Hosting

**Static Dashboards** (`ops.admireworks.com`):
- Auto-deploys via GitHub Pages

**Campaign Sites** (e.g., LUP 2026):
- Deploy manually via Firebase Hosting:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/Users/user/Documents/IDE Projects/Internal AW SOP/firebase/service-account.json"
cd "/Users/user/Documents/IDE Projects/Internal AW SOP" && npx firebase-tools deploy --only hosting:lup-2026
```

## Pre-Push Checklist
- [ ] `git status` shows clean worktree
- [ ] No debug/temporary code left behind
- [ ] Documentation updated if behavior changed
- [ ] Build passes: `cd apps/client-portal && npm run build`
