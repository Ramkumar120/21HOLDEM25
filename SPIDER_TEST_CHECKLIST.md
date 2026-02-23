# Spider Test Checklist

Date started: 2026-02-23
Scope: `Game-BotTester` random gameplay fuzzing ("spider testing") against live backend with `test1,test2,test3`

## Goal

Run random legal gameplay actions across many hands/seats to surface crashes, invalid state transitions, stuck turns, and rules regressions.

Note: Exhaustively testing "all random sequences" is not finite in practice. We will use coverage-driven random testing with repeatable seeds and a failure checklist.

## Current Harness

- Task: `spider-random`
- Bots: `test1,test2,test3`
- Backend: `http://127.0.0.1:4000`
- Repro support:
  - `--seed <number>` for deterministic random choices
  - `--rounds <number>` target completed hands

## Run Log References

- `spider-random-run1.log` (root workspace, seed `12345`, target `6` hands, duration `300000ms`)
- `spider-random-run2.log` (root workspace, seed `12345`, target `6` hands, duration `300000ms`, after spider harness patches)
- `spider-random-run3.log` (root workspace, seed `12345`, target `6` hands, duration `180000ms`, with stall detector)
- `spider-random-run4.log` (root workspace, seed `12346`, target `6` hands, duration `180000ms`, with stall detector)
- `spider-random-run5.log` (root workspace, seed `12347`, target `6` hands, duration `180000ms`, with stall detector + early-stop on fatal spider failure)

## Findings (Observed)

### F-001: Spider-generated raise amount rejected as above max bet (backend max not exposed in turn payload)

- Status: Mixed (harness/input-model issue + possible backend payload gap)
- Runs: `spider-random-run1.log`, `spider-random-run2.log`
- User: `test2`
- Example hand/action:
  - run1 hand 2: `rs:478`
  - run2 hand 1: `r:20`
- Backend error: `Raise amount is should not be greater than max bet`
- Context captured:
  - run2 example:
    - allowed: `[c,r,f,d]`
    - `toCallAmount=10`
    - `nMinBet=10`
    - `nMaxBet=undefined` (not present in turn payload)
    - `nTableChips=15`
    - `myChips=500`

Action:
- Spider generator patched to prefer bounded raise sizes and respect `turn.nMaxBet` when present.
- Follow-up: capture/derive backend `nMaxBet` correctly before treating this as gameplay bug.

### F-002: Random campaign can stall into very long hands and hit duration timeout

- Status: Test harness issue (may also expose gameplay pacing issues later)
- Run: `spider-random-run1.log`
- Symptom: 6-hand target did not complete before `300000ms` duration limit
- Observed completion before timeout: only `1` fully declared hand (all bots logged `1/6`)

Action:
- Spider generator patched to reduce raise spam (per-bot raise throttling after repeated own turns in same hand).
- Next step is rerun and measure completed-hands throughput.

### F-003: Public-board join mismatch can split bots onto different tables

- Status: Harness issue (fixed)
- Run: early retry of `spider-random-run2.log` (initial attempt before join-retry patch)
- Symptom: bot2 joined a different public board than bot1 and runner aborted

Action:
- Bot runner patched with join retry + `leaveBoard` cleanup until all bots match the first board.

### F-004: Possible hand stall (no round result within 5-minute run window after opening actions)

- Status: Probable gameplay bug (needs reproduction and instrumentation)
- Run: `spider-random-run2.log`
- Seed: `12345`
- Symptom:
  - All 3 bots joined same board successfully
  - Hand 1 actions occurred (`r:20` rejected -> fallback `call`; `rs:10`; `call`)
  - No `spider hand complete` / `resDeclareResult` logged before duration timeout
  - Run ended only because `duration-ms=300000`

Action:
- Add spider hand-stall detector (e.g. fail if no `resDeclareResult` in `N` seconds after hand action starts).
- Reproduce with same seed after adding event trace capture around the stall.

### F-005: Confirmed hand stall after community card / missed-turn sequence (seeded repro)

- Status: Probable gameplay bug
- Run: `spider-random-run3.log`
- Seed: `12345`
- Detector: `hand-stall-timeout` (60s without `resDeclareResult`)
- Hand: `2`
- Recent event tail before stall:
  - `resRaise`
  - `resStand`
  - `resCall`
  - `resPlayerTurn`
  - `resTurnMissed`
  - `resFoldPlayer`
  - `resCommunityCard`
- State at timeout (example from `test1`):
  - `nMinBet=65`
  - `nTableChips=155`
  - `myChips=425`

Interpretation:
- Hand advanced to a community card, then failed to settle/progress to a declared result within 60s.

### F-006: Confirmed hand stall after fold + missed-turn sequence (seeded repro)

- Status: Probable gameplay bug
- Run: `spider-random-run4.log`
- Seed: `12346`
- Detector: `hand-stall-timeout` (60s without `resDeclareResult`)
- Hand: `2`
- Recent event tail before stall:
  - `resCall`
  - `resRaise`
  - `resFoldPlayer`
  - `resPlayerTurn`
  - `resTurnMissed`
  - `resFoldPlayer`
- State at timeout (example from `test1`):
  - `nMinBet=30`
  - `nTableChips=50`
  - `myChips=480`

Interpretation:
- A missed-turn/fold path can leave the hand without resolution (no community/declaration progression afterward in the captured trace).

### F-007: Recurring stall pattern reproduced on third seed; likely systemic turn-resolution bug

- Status: Probable gameplay bug
- Run: `spider-random-run5.log`
- Seed: `12347`
- Detector: `hand-stall-timeout` (60s without `resDeclareResult`)
- Key event tail:
  - `resCall`
  - `resStand`
  - `resFoldPlayer`
  - `resPlayerTurn`
  - `resTurnMissed`
  - `resFoldPlayer`
- State at timeout (reported by `test2`):
  - `nMinBet=30`
  - `nTableChips=50`
  - `myChips=468`

Interpretation:
- The stall is reproducible across multiple seeds and action mixes, not just one random sequence.

## Coverage Seen (partial)

- Run1 legal actions observed: `c`, `d`, `f`, `r`
- Run1 `rs` attempted successfully
- Run2 legal actions observed (before stall): `c`, `r`, `d`, `f`
- Run4 legal actions observed include `ck` (check) in spider mode
- `stand (s)` not yet observed as standalone action in spider runs captured here

Note:
- `ck` was observed in `run4` as a legal option, but the random action selected on that turn was `rs:10`. We have legal-option coverage for `ck`, but not a sent `check` action yet.
- `r` and `rs` were both sent successfully in later runs (`run3`/`run5`), which reduces the likelihood that the stall is caused only by invalid raise attempts.

## Next Spider Pass (planned)

1. Run `spider-random` with seed `12345` after generator patch and confirm hand throughput improves.
2. Early-stop coordination in `taskRunner` implemented and validated (`run5`).
3. Run additional seeds (`2`, `3`, `4`, `5`) to widen coverage with early-stop enabled.
4. Record every explicit backend callback error as a numbered failure (`F-xxx`) with repro seed + hand + action.
5. Separate harness-noise failures from real game-logic failures before patching gameplay.
6. Start backend-side tracing specifically around `resTurnMissed` -> `resFoldPlayer` -> next turn / community / declare-result transition.

## Command Template

```powershell
cd "d:\21HOLDEM25 LOCAL\Game-BotTester"
node src/cli.js run --users test1,test2,test3 --password Test1234! --task spider-random --rounds 6 --seed 12345 --min-bet 5 --duration-ms 300000
```
