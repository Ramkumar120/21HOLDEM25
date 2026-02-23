# 21 Holdem Issue Tracker

Last updated: 2026-02-22

## Status legend
- `Open`: not fixed
- `In Progress`: actively being fixed
- `Blocked`: waiting on dependency or clarification
- `Closed`: fixed and validated

## Issues

### PJ-0001
- Title: Table expires / game fails to start after players join.
- Status: Closed.
- Reported: 2026-02-21.
- Resolution summary:
  - Fixed stale board join mapping and Redis JSON update race conditions.
  - Fixed local scheduler host filter so initialize timers execute without `HOST` env value.
- Backend refs:
  - Commit: `8c2b976`
  - Uncommitted follow-up: `Game-Backend/app/utils/lib/redis.js` (scheduler host-gating adjustment).

### PJ-0002
- Title: Round 2 first community card adds mystery bet to pot.
- Status: Closed.
- Reported: 2026-02-21.
- Severity: High gameplay integrity.
- Environment: Local (`localhost:3000` + `localhost:4000`).
- Repro:
  1. Start a table with 3+ players.
  2. Complete round 1 actions.
  3. Enter round 2 and observe first community card event.
- Actual:
  - Pot/table chips increase with no obvious corresponding action.
- Expected:
  - Pot only changes on explicit, rule-defined actions.
  - No hidden carry-over bet at round transition.
- Suspect areas:
  - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
  - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js`
  - Round transition + min-bet reset flow.
- Resolution summary:
  - Restored round-transition action remap in board logic: first community card now remaps `c -> ck` and `d -> s`.
  - Added post-bet action normalization in participant logic: on later rounds, active `ck` actions are promoted to `c` after bet actions (`call`, `raise`, `stand`) so check is no longer available once betting starts.
  - Validation trace confirmed:
    - First turn after first community card: `["ck","r","f","s"]` (no forced call carry-over).
    - After a raise in that round: next turn actions become `["c","r","f","s"]` with updated `nMinBet/toCallAmount`.

### PJ-0003
- Title: Stand/DD locked players should be skipped unless defending a raise.
- Status: Open (Reopened 2026-02-22).
- Reported: 2026-02-21.
- Severity: High gameplay flow integrity.
- Environment: Local (`localhost:3000` + `localhost:4000`).
- Repro:
  1. Enter a hand with 3+ players.
  2. Lock one player with `DD` (or `stand` lock path).
  3. Reach round 2 (after first community card).
  4. Observe locked-player turns before and after a new raise.
- Actual:
  - Locked players could still receive normal turns instead of being auto-skipped.
- Expected:
  - Locked players are skipped by default.
  - Locked players only receive defend actions when a new raise requires matching (`call/fold` only).
- Resolution summary:
  - Applied round-start action remap to all playing participants (including lock states), then skipped score updates for `isDoubleDownLock`.
  - Added lock-aware turn gating in `takeTurn`: if locked and no defend required, auto-pass turn; if defend required, force `["c","f"]`.
- Backend refs:
  - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js`
  - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
- Validation:
  - DD scenario trace:
    - No locked-player turn before raise in round 2.
    - After confirmed raise, locked player turn actions: `["c","f"]` with raised `toCallAmount`.
- Reopen note (2026-02-22):
  - Live QA still reports lock/defend regressions in some paths.
  - Follow-up split tracked in `PJ-0008` for defend-player raise leakage.

### PJ-0004
- Title: SB/BB call amounts are charged as full call in round 1.
- Status: Closed.
- Reported: 2026-02-22.
- Severity: High betting integrity.
- Repro:
  1. Start a new hand with at least 3 players.
  2. Observe SB/BB contributions, then choose call action in round 1.
- Actual:
  - SB/BB are debited full call amounts rather than only the required difference to match.
- Expected:
  - SB should pay only the delta to current bet.
  - BB should be able to check if no raise over BB exists.
- Suspect areas:
  - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js` (`call`)
  - Round contribution tracking (`nLastBidChips` semantics per round).
- Resolution summary:
  - Call amount now uses differential contribution (`max(nMinBet - nLastBidChips, 0)`), not full `nMinBet`.
  - Round transitions now reset per-round participant contributions (`nLastBidChips`) and reopen actions (`c -> ck`).
  - Turn payload now uses dynamic `toCallAmount` instead of fixed `nMinBet`.
- Validation:
  - Preflop SB turn: `toCallAmount=5`.
  - Preflop BB turn: `toCallAmount=0`, actions include `ck`.
  - Call events reflect differential chip movement (SB call event amount `5`, BB no forced debit).

### PJ-0005
- Title: Game ends immediately when 21/BJ is reached in later rounds.
- Status: Open.
- Reported: 2026-02-22.
- Severity: High rules compliance.
- Repro:
  1. Reach round 2 or later.
  2. A player reaches 21 from later-round progression.
- Actual:
  - Hand can end immediately instead of continuing under round rules.
- Expected:
  - Instant-win should follow game-rule scope, not trigger universally in later rounds.
- Suspect areas:
  - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js` (`dealCommunityCard` winner short-circuit).

### PJ-0006
- Title: Players still receive call prompt in round 2 without a new raise.
- Status: In Progress.
- Reported: 2026-02-22.
- Severity: High turn-state integrity.
- Repro:
  1. Reach round 2 start.
  2. Before any new raise in that round, inspect first turns.
- Actual:
  - Some turns show call-required actions instead of check-open actions.
- Expected:
  - If no new round bet is opened, action should be check-open state.
- Suspect areas:
  - Round transition action remap.
  - Lock-state action mutation and reuse.
- Progress note (2026-02-22):
  - Core open-round path now emits `toCallAmount=0` with `ck` before any raise.
  - After first raise, next player receives call-required state with raised `toCallAmount`.
  - Remaining QA needed on edge paths involving lock/defend transitions (`PJ-0003`, `PJ-0008`).
- Progress note (2026-02-22, Patch J):
  - Fixed preflop BB-raise premature-round-end regression by reopening turn cycle after raises.
  - Validation trace (BB raises to 15):
    - Two non-raiser response turns occurred before first community card.
    - Both responders received `toCallAmount=5` and call-capable action sets.
- Progress note (2026-02-22, Patch K):
  - Fixed raise math so an open-seat min raise applies as `call + raise`.
  - Validation trace (open-seat min raise):
    - New round bet moved to `nMinBet=20`.
    - SB/BB response turns required `toCallAmount=15` and `toCallAmount=10`.

### PJ-0007
- Title: Side-pot and all-in flow is not managed correctly.
- Status: Open.
- Reported: 2026-02-22.
- Severity: Critical payout integrity.
- Repro:
  1. Force one player all-in with smaller stack.
  2. Other players continue betting/raising.
- Actual:
  - Pot/payout behavior does not separate main vs side pot correctly.
- Expected:
  - Correct main/side pot accounting and settlement.
- Suspect areas:
  - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js` (`declareResult`)
  - Missing pot-segmentation model.

### PJ-0008
- Title: Defending players can still raise.
- Status: Open.
- Reported: 2026-02-22.
- Severity: High rules compliance.
- Repro:
  1. Put player in defend-only context (stand/DD lock, facing raise).
  2. Observe available actions.
- Actual:
  - Raise remains available in cases that should be defend-only.
- Expected:
  - Defend-only turns must be `call/fold` only.
- Suspect areas:
  - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js` (`takeTurn`, action shaping).

### PJ-0009
- Title: Post-hand bankroll/top-up logic is missing for next blind affordability.
- Status: Open.
- Reported: 2026-02-22.
- Severity: Medium UX/economy flow.
- Repro:
  1. Finish a hand with stack below required next-hand blind/buy threshold.
  2. Enter reset flow.
- Actual:
  - Player can be removed without a clean top-up/rebuy opportunity.
- Expected:
  - Post-hand top-up/rebuy path before forced leave, per product rule.
- Suspect areas:
  - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js` (`resetTable`)
  - Frontend leave/top-up prompt flow.
