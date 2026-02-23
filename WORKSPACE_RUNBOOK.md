# 21 Hold'em Workspace Runbook

This workspace contains two independent git repositories:
- `Game-Backend`
- `Game-Frontend`

The workspace root is orchestration-only (Docker services + local logs).

## Local Services
From `d:\21HOLDEM25 LOCAL`:

```powershell
docker compose up -d
```

Services:
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

## Start Full Stack
1. Backend:
```powershell
cd d:\21HOLDEM25 LOCAL\Game-Backend
npm start
```

2. Frontend:
```powershell
cd d:\21HOLDEM25 LOCAL\Game-Frontend
npm start
```

URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## Version Control Policy
- Commit backend changes in `Game-Backend` repo.
- Commit frontend changes in `Game-Frontend` repo.
- Keep backend/frontend release tags independent:
  - `backend-vX.Y.Z`
  - `frontend-vX.Y.Z`

## Required Per-Repo Docs
- `README.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `docs/RELEASE.md`
- `.env.example`

