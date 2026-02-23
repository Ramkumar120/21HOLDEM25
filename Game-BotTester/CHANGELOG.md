# Changelog

## v0.2.0 - 2026-02-23

### Added
- Standalone `Game-BotTester` module (separate from backend/frontend codebases)
- REST auth + table join integration (`/api/v1/auth`, `/api/v1/poker`)
- Socket.IO board join + gameplay action integration
- Pluggable task system (`observe`, `auto-check-call-fold`, `scripted-actions`)
- `fold-first-opportunity` task for fast turn-order / rotation smoke tests
- `--rounds` target support for repeatable multi-hand runs

### Changed
- Gameplay action sends use fire-and-forget socket emits for backend compatibility (success callbacks are not consistently returned by backend)

### Verified Locally
- `fold-first-opportunity` task run with `test1,test2,test3` for `6` hands (2 full rotations)
- All bots completed `6/6` hands on the same table
