# Workspace Sync Policy

Version baseline: `1.0.0`
Date: `2026-02-23`

## Goal

Keep local workspace files and GitHub files synchronized from a single source of truth.

## Source Of Truth

- Root repo: `d:\21HOLDEM25 LOCAL`
- Commit and push from the root only
- Do not commit independently inside `Game-Backend`, `Game-Frontend`, or `Game-BotTester`

## Included Projects

- `Game-Backend`
- `Game-Frontend`
- `Game-BotTester`
- Root docs (`GAMEPLAY_CHECKLIST.md`, `ISSUE_TRACKER.md`, `WORKSPACE_RUNBOOK.md`, etc.)

## Local-Only (Ignored)

- `MANUAL_BACKUPS/`
- `*.log`
- `node_modules/`
- `.env` files

## Migration Snapshot (before monorepo conversion)

- `Game-Backend`: commit `3a115a8` (branch `savepoint-local-2026-02-14`)
- `Game-Frontend`: commit `99e539a` (branch `savepoint-local-2026-02-14`)
- `Game-BotTester`: commit `e846949` (branch `master`, tag `v0.2.0`)
- `Game-Frontend` previous remote: Bitbucket (`big-slick-fe`)

## Workflow (Required)

1. Make changes anywhere in the workspace.
2. Commit at the root repo only.
3. Push the root repo to GitHub.
4. Tag versions at the root repo (single version line).
