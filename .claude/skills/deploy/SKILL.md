---
name: deploy
description: Ship the latest main branch to production by merging main into the deployment branch and pushing. Pushing to deployment triggers the GitHub Actions workflow `.github/workflows/deployment_app-gamif-ai.yml`, which builds the app and deploys it to the Azure Web App `app-gamif-ai`. Use when the user asks to deploy, ship, release, or push to prod.
---

# Deploy to Production

This skill promotes the current `main` branch to production. The pipeline is:

```
main  ──merge──▶  deployment  ──push──▶  GitHub Actions  ──▶  Azure Web App (app-gamif-ai)
```

The deployment workflow is defined at `.github/workflows/deployment_app-gamif-ai.yml` and triggers on any push to `deployment`.

## Important: this is a production action

Pushing to `deployment` deploys real, user-facing code. You MUST get explicit user confirmation showing the exact commits being shipped before pushing. Do not push without confirmation, even in auto mode.

Never force-push to `deployment` and never skip pre-commit / pre-push hooks.

## Steps

Run these in order. Stop and surface any failure to the user; do not paper over errors.

1. **Verify clean working tree.** Run `git status --short`. If anything is modified or staged, stop and ask the user to commit/stash first — do not stash silently.

2. **Note the starting branch** so you can return to it at the end: `git rev-parse --abbrev-ref HEAD`.

3. **Fetch latest refs.** `git fetch origin`.

4. **Show what will be deployed.** Run `git log --oneline origin/deployment..origin/main` and show the output to the user. If the list is empty, tell the user there is nothing new to deploy and stop.

5. **Confirm with the user.** Ask explicitly: "Push these N commits to `deployment` and trigger production deploy? (yes/no)". Wait for an affirmative reply. Do not infer consent from auto mode.

6. **Check out deployment and fast-forward.**
   ```
   git checkout deployment
   git pull --ff-only origin deployment
   ```
   If `--ff-only` fails, someone pushed to `deployment` directly — stop and surface to the user, do not force.

7. **Merge main with a merge commit** (matches the existing history style on `deployment`):
   ```
   git merge --no-ff origin/main -m "Merge branch 'main' into deployment"
   ```
   If a conflict occurs, stop and ask the user to resolve. Do not auto-resolve production merge conflicts.

8. **Push.** `git push origin deployment`. If push is rejected, fetch and retry — never `--force` to `deployment`.

9. **Restore the user's starting branch.** `git checkout <starting-branch>`.

10. **Report.** Tell the user the deploy was triggered and link them to the workflow runs page so they can watch it. The Azure Web App is `app-gamif-ai` (Production slot). Mention that the build job runs `npm install && npm run build` on Node 22.x, then deploys via `azure/webapps-deploy@v3` with OIDC.

## Failure modes and what to do

| Symptom | Action |
|---|---|
| Working tree dirty | Stop. Ask user to commit or stash. |
| `origin/deployment..origin/main` is empty | Tell user nothing to deploy. Stop. |
| `git pull --ff-only origin deployment` fails | Someone pushed directly to `deployment`. Stop, surface to user. |
| Merge conflict | Stop, ask user to resolve. Do not auto-resolve. |
| Push rejected | `git fetch` and retry once. If still rejected, stop. Never force-push. |
| Pre-push hook fails | Investigate root cause and fix. Do not bypass with `--no-verify`. |

## What this skill does NOT do

- It does not deploy from any branch other than `main`. To deploy a feature branch, the user must merge it to `main` first via PR.
- It does not roll back. To revert a deploy, the user must push a revert commit through the same `main` → `deployment` path.
- It does not modify the workflow file or Azure config.
