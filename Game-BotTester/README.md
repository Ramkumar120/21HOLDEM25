# Game-BotTester

Standalone bot-testing module for `21HOLDEM25 LOCAL`.

This is intentionally separate from `Game-Backend` / `Game-Frontend`.
It integrates through the existing public interfaces:

- REST API (`/api/v1/auth/*`, `/api/v1/poker/*`)
- Socket.IO (`reqJoinBoard`, board event channel, `reqCall/reqRaise/reqStand/...`)

## What It Gives You

- Multi-user login/join/socket setup (for test users like `test1`, `test2`, `test3`)
- Pluggable task modules for automated test behavior
- Scripted turn-by-turn action playback to reproduce bugs
- No backend code changes required

## Folder Layout

- `src/cli.js` - entry point / CLI
- `src/lib/` - API + socket wrappers + bot client
- `src/tasks/` - pluggable bot tasks
- `tasks/example-script.json` - sample scripted actions

## Quick Start (Local)

1. Install dependencies:

```powershell
cd "d:\21HOLDEM25 LOCAL\Game-BotTester"
npm install
```

2. Create env file:

```powershell
copy .env.example .env
```

3. Make sure services are running:

- Backend on `http://localhost:4000`
- Mongo on `27017`
- Redis on `6379`

4. Run a passive observer test:

```powershell
npm run run -- --users test1,test2,test3 --password Test1234! --task observe --min-bet 5 --duration-ms 60000
```

Note: the CLI defaults to the `run` command, so you only need to pass options.

## Recommended Usage Patterns

### 1) Passive table soak (safe)

Bots join and only log key game events.

```powershell
node src/cli.js run --users test1,test2,test3 --password Test1234! --task observe --min-bet 5
```

### 2) Passive action flow test (check/call/fold only)

Bots never raise/stand. Useful for turn-order and round-completion debugging.

```powershell
node src/cli.js run --users test1,test2,test3 --password Test1234! --task auto-check-call-fold --min-bet 5 --duration-ms 120000
```

### 3) Fold at first opportunity (good for quick table smoke tests)

Each bot joins and sends `fold` on the first turn where `f` is available (including round 1 if allowed by game rules).

```powershell
node src/cli.js run --users test1,test2,test3 --password Test1234! --task fold-first-opportunity --rounds 6 --min-bet 5 --duration-ms 300000
```

Use `--rounds 6` to force two full dealer/button rotation cycles with 3 bots.

### 4) Reproduce a specific bug with scripted actions

Edit `tasks/example-script.json` and run:

```powershell
node src/cli.js run --users test1,test2,test3 --password Test1234! --task scripted-actions --script .\\tasks\\example-script.json --min-bet 5
```

## Script Format

`perUser.<username>` is a queue of one action per turn.

Supported action tokens:

- `ck` or `check`
- `c` or `call`
- `f` or `fold`
- `s` or `stand`
- `d` or `dd` (double down)
- `r:200` (raise by amount)
- `rs:200` (raise + stand; sends `reqRaise` with `bTakeCard:false`)

After a user's scripted actions are exhausted, `fallback` is used:

- `auto` (default): `check -> call -> fold`
- `none`: no action

## Important Notes

- This harness uses your real backend logic and real socket events.
- It will spend chips / join tables on the test users you provide.
- If the backend build you are testing does not support `bTakeCard:false`, `rs:<amount>` may behave like a normal raise.

## Next Step (Recommended)

Add a dedicated task module per bug type, e.g.:

- `stand-defense-repro`
- `turn-order-trace`
- `double-raise-guard-test`

Each task can reuse the same `BotClient` without touching backend code.
