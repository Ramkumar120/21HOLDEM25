# 21 Holdem Gameplay Checklist

Last updated: 2026-02-22

## Working Flow
1. You report issue.
2. We implement fix.
3. We verify behavior.
4. We create local version commit(s).
5. We check item off.

## Current Baseline Versions
- Frontend: `savepoint-local-2026-02-14` @ `99e539a`
- Backend: `savepoint-local-2026-02-14` @ `8c2b976`

## Checklist

- [ ] 1. Gameplay Stability And UX Bug-Fix Pass (In Progress)
  - Known issue groups:
    - Action buttons disappearing randomly.
    - Sound sync timing is off.
    - Players/turns getting skipped.
    - Round/action timing inconsistencies.
  - Issue breakdown:
    - [ ] Stand behavior: stood players should only defend (call/fold on raise), otherwise be skipped. (Reopened 2026-02-22)
    - [ ] Sound mapping: no deal/flip sound on button press; only on actual deal/flip events.
    - [ ] 21 behavior: players on 21 can still choose raise and raise+stand (not auto-locked out of raise).
    - [x] Deck visibility at showdown stays on table.
    - [x] Round-2 mystery pot increment: first community card in round 2 adds an unexpected bet to table chips.
    - [ ] Locked-player skip flow: stand/DD players are skipped unless they must defend a raise. (Reopened 2026-02-22)
    - [x] SB/BB first-round contribution logic: blinds should only pay differential call amounts.
    - [ ] Round-2 open action prompt: no forced call when no new raise is made. (Core path fixed; edge-path QA pending)
    - [ ] Late-round BJ/21 instant-end logic should follow official rule scope.
    - [ ] Side-pot/all-in accounting and payout distribution.
    - [ ] Defend-only state should not expose raise action.
    - [ ] Post-hand auto top-up/rebuy flow when player cannot afford next blind requirement.
  - Progress log:
    - 2026-02-14 Patch A (implemented, pending live gameplay validation):
      - Reduced unintended button hiding side-effects during turn-timer resets.
      - Hardened action-button rendering for turn transitions.
      - Fixed bet-label amount mapping to use server bid fields.
      - Added `toCallAmount` in turn payload for stable call button text.
      - Added all-bust flag compatibility (`bAllPlayerBust` + `bAllPlayersBust`).
      - Reduced timer beep overlap to improve audio sync.
    - 2026-02-14 Patch B (completed):
      - Kept deck visible during showdown card reveal flow.
      - File change: `Game-Frontend/src/scenes/Level.js`
      - Code note: removed forced `close_deck_card.setVisible(false)` during declare-result reveal.
    - 2026-02-14 Patch C (implemented, pending live gameplay validation):
      - Stood players are auto-skipped when no defend action is needed.
      - Stood players only receive turn actions when a raise requires defend (`call/fold`).
      - File change: `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
    - 2026-02-14 Patch D (implemented, pending live gameplay validation):
      - Enforced locked-player defend behavior for stand/raise+stand/doubledown states.
      - Added `raise+stand` lock handling on `reqRaise` when `bTakeCard === false`.
      - File change: `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
    - 2026-02-14 Patch E (implemented, pending live gameplay validation):
      - Added persisted `bHasStood` state to survive round transitions reliably.
      - Rebuilt per-turn action list from round state, then constrained for locked players.
      - Cleared stand-lock state explicitly on table reset.
      - File changes:
        - `Game-Backend/app/game/boardManager/pokerjack/Participant/lib/Service.js`
        - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
        - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js`
    - 2026-02-21 Patch F (completed):
      - Fixed immediate table-expire/never-start path caused by stale board mappings and scheduler host-gating.
      - File changes:
        - `Game-Backend/app/routers/game/poker/lib/middlewares.js`
        - `Game-Backend/app/game/boardManager/pokerjack/Board/lib/Service.js`
        - `Game-Backend/app/game/boardManager/pokerjack/Participant/lib/Service.js`
        - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js`
        - `Game-Backend/app/utils/lib/redis.js`
    - 2026-02-21 Patch G (completed):
      - Fixed round-transition action state so round 2 opens with `check` instead of forced `call`.
      - Enforced rule-consistent action promotion after a bet in later rounds (`ck -> c`).
      - File changes:
        - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js`
        - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
      - Validation:
        - First turn after first community card: `["ck","r","f","s"]`.
        - After raise in same round: next turn actions `["c","r","f","s"]` with updated `nMinBet/toCallAmount`.
    - 2026-02-21 Patch H (completed):
      - Enforced lock-turn skipping for `stand`/`DD`: auto-skip unless defend is required after a raise.
      - Locked-player defend path now hard-limits actions to `["c","f"]`.
      - File changes:
        - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js`
        - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
      - Validation:
        - DD lock in round 2: no turn before raise.
        - After confirmed raise: locked player received `["c","f"]` only.
    - 2026-02-22 QA regression intake (new open issues):
      - SB/BB are charged full call amounts in first round.
      - Players can still receive forced call prompts in round 2 without a new raise.
      - Late-round BJ/21 can end game incorrectly.
      - Defend/lock flows are still inconsistent (`stand`/`DD`, defend player raise access).
      - Side-pot/all-in payout handling remains incomplete.
      - Post-hand top-up/rebuy flow is missing when next blind cannot be afforded.
    - 2026-02-22 Patch I (completed for PJ-0004, partial for PJ-0006):
      - Implemented differential call debit (`nMinBet - nLastBidChips`) to fix blind overcharge on call.
      - Added dynamic `toCallAmount` emission per participant turn.
      - Reset per-round contribution state on community-card round transitions.
      - File changes:
        - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
        - `Game-Backend/app/game/boardManager/pokerjack/Participant/lib/Service.js`
        - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js`
      - Validation:
        - SB preflop `toCallAmount=5`.
        - BB preflop `toCallAmount=0` with check action.
        - Round-2 first turn `toCallAmount=0` before raise; after raise, next player call amount reflects raise delta.
    - 2026-02-22 Patch J (partial for PJ-0006):
      - Prevented premature round closure immediately after BB raise.
      - Reopened turn cycle on raise so non-raisers must respond before community-card advance.
      - File change:
        - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
      - Validation:
        - BB raise to `15` produced two non-raiser response turns (each `toCallAmount=5`) before first community card.
    - 2026-02-22 Patch K (partial for PJ-0006):
      - Fixed raise debit semantics to apply as `call + raise amount` instead of replacing current bet.
      - Ensured open-seat min raise increases table bet and forces blind defenders to match raise deltas.
      - File change:
        - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
      - Validation:
        - Open-seat min raise produced `nMinBet=20`.
        - SB toCall `15`, BB toCall `10`.
  - Structured issue registry:
    - `PJ-0001` (Closed): Table expires / game does not start after players join.
      - Status: Fixed and committed in backend `8c2b976` + scheduler gate fix pending commit.
      - Validation: 3-player join reached `playing` state with cards dealt.
    - `PJ-0002` (Closed): Round 2, first community card introduces a mystery bet in pot.
      - Reported date: 2026-02-21.
      - Severity: High gameplay integrity issue.
      - Environment: Local dev (`localhost:3000` frontend, `localhost:4000` backend).
      - Repro steps:
        1. Start a table with at least 3 players.
        2. Play through round 1 until round 2 begins.
        3. Observe pot/table chips when first community card of round 2 is dealt.
      - Actual:
        - Pot increases by an unexplained amount at start of round-2 community-card phase.
        - Increment appears unrelated to explicit user action in that moment.
      - Expected:
        - No implicit carry-over bet should be added between rounds unless a defined rule explicitly charges it.
        - Pot should only change due to visible/declared actions (call/raise/stand/double/blinds per rule set).
      - Scope suspects (to verify in fix):
        - `Game-Backend/app/game/boardManager/pokerjack/Participant/index.js`
        - `Game-Backend/app/game/boardManager/pokerjack/Board/index.js`
        - Turn transition and per-round bet reset logic.
      - Resolution:
        - Restored `c -> ck` remap on round transition in `dealCommunityCard`.
        - Added `ck -> c` promotion after betting actions in later rounds.
      - Validation:
        - Deterministic socket trace confirms no forced call at round-2 start.
        - After first post-community raise, next player receives call-required action set.
    - `PJ-0003` (Open, Reopened 2026-02-22): Stand/DD players should be skipped unless defending a raise.
      - Reported date: 2026-02-21.
      - Resolution:
        - Added lock-aware auto-skip in turn assignment.
        - Locked players only receive defend actions when required.
      - Validation:
        - Locked DD player skipped before raise, then received `["c","f"]` after confirmed raise.
      - Reopen note:
        - QA reports remaining edge-path regressions; tracked for follow-up patching.
    - `PJ-0004` (Closed): SB/BB first-round call differential logic.
    - `PJ-0005` (Open): Late-round BJ/21 instant-end scope.
    - `PJ-0006` (In Progress): Round-2 forced call prompt without new raise.
    - `PJ-0007` (Open): Side-pot and all-in payout handling.
    - `PJ-0008` (Open): Defending players can still raise.
    - `PJ-0009` (Open): Post-hand auto top-up/rebuy when bankroll cannot cover next blind.
  - Definition of done:
    - Repro steps documented per bug.
    - Fix implemented and verified against repro.
    - No regression in turn flow, action visibility, and audio cues.
  - Version when complete: `TBD`

- [ ] 2. Guest Mode Entry (Backlog, Depends On #1)
  - Goal: New users should not hit a registration wall first.
  - Required behavior:
    - A user can enter as guest without creating an account first.
    - Guest can access lobby/table discovery flow.
    - If guest attempts to actually play/join a table, route them to register/login.
  - Definition of done:
    - Landing flow includes clear `Play as Guest` option.
    - Guest can browse table list without auth failure loops.
    - Join/play action enforces auth and redirects cleanly to register/login.
    - No regression for existing registered user login flow.
  - Version when complete: `TBD`

- [ ] 3. Basic Bots For Guest Experience (Backlog)
  - Note: Deferred until after Guest Mode entry is stable.
  - Version when complete: `TBD`

- [ ] 4. Full Content Review And Rewrite (Backlog)
  - Scope: Review all player-facing copy and legal/info pages.
  - Includes:
    - Terms & Conditions
    - How To Play
    - Privacy Policy
    - Game Rules
    - Any onboarding/help text shown in auth/lobby/game
  - Definition of done:
    - Content is consistent with actual game behavior and payouts.
    - No conflicting or outdated wording remains.
    - Final copy approved and merged.
  - Version when complete: `TBD`

- [ ] 5. Interactive In-Game Tutorial (Backlog, Depends On #1)
  - Goal: Teach first-time players directly on the table UI.
  - Required behavior:
    - Step-by-step guided tutorial using real table elements.
    - Blackout overlay with focus circles/spotlights on current target UI.
    - Player can go next/back/skip/replay tutorial.
  - Definition of done:
    - Tutorial works on desktop and mobile layouts.
    - No interference with live gameplay state after tutorial exits.
    - Tutorial entry point is visible and reusable.
  - Version when complete: `TBD`

- [ ] 6. Shared Chip Wallet Across Game Ecosystem (Discovery + Build)
  - Goal: Let users use one chip balance across multiple games/sites.
  - Feasibility: Yes, this is achievable.
  - Delivery phases:
    - Phase A: Architecture + auth/session model + ledger design.
    - Phase B: Backend wallet service/API integration.
    - Phase C: Frontend integration and migration rules.
  - Definition of done:
    - One source of truth for balances and transactions.
    - Cross-game spend/earn is reflected consistently.
    - Audit trail exists for every chip movement.
  - Version when complete: `TBD`
