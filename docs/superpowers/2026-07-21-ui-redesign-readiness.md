# UI Redesign Readiness — sworbl (casual + stacks)

Date: 2026-07-21. Synthesized from two audits (state/mode/lifecycle + UI-surface/vestigial) of the
play-loop changes this session. Verdict: **READY to start the redesign** once the score-model
decisions below are made — the foundation is solid, two must-fix bugs are already fixed, and the
reusable UI core is strong. Cruft to clear is well-scoped and mostly deletion.

## Verdict

**Foundation: solid.** Determinism is clean, the pure modules are coherent + tested, the storage-key
partitioning is airtight after the two fixes below. The one thing that's genuinely muddy is the
**score model** (what a "stacks score" is, and the sworb-bonus persistence) — that's a design
decision to settle before a UI commits to a score display, not a structural blocker.

## Must-fixes found by the audit — ALREADY FIXED + verified

- **#1 (HIGH) — stacks didn't bank hints.** `checkTargetCatch` (sole writer of the shared `FOUND_PREFIX`
  safe) was gated on `dailyMode`, so a theme word found in stacks glowed + paid +50% but never
  banked or ticked the counter — breaking the "collect hints across rounds" loop the whole design
  rests on. Fixed: gate is now `dailyMode || stacklOn()` (commit 2794e69). This is the exact bug the
  user hit ("found 'fork' in stacks, clue fan didn't update").
- **#2 (MED-HIGH) — a finished stacks round wiped casual's saved run.** `endRound()` called
  `clearRunState()` (removes the shared `RUN_PREFIX+dailyKey`) unconditionally; the earlier C1 fix
  only covered the newGame path. Fixed: gated on `dailyMode` (commit f26afda) — stacks is
  session-only and never owns a run snapshot.

## The clean state/mode contract the redesign can rely on

- **Mode identity = the pair `(dailyMode-opt, stacklMode-state)`**, three valid contexts:
  `(true,false)` = casual daily · `(false,true)` = stacks · `(false,false)` = practice/warmup.
  **`puzzleOn()` is a retired always-`true` switch — ignore it; treat every `!puzzleOn()` branch as
  dead.** `armedMode` ('casual'|'stacks') is the home picker's session-only selection (chooses which
  launcher the swipe-up calls) — not a run flag.
- **Deterministic** board + bombs from `hashSeed(dailyKey)` / `hashSeed(dailyKey+'|sworb')`, shared
  identically by casual + stacks. Only `startPractice` uses `Math.random`. Keep `themeTarget` (dev
  knob, default 8) fixed in production.
- **SHARED per day (keyed by `dailyKey`), fed by both modes:** `FOUND_PREFIX` (hint safe),
  `SWORB_PREFIX` (5 guesses + solved), `THEME_PREFIX`/`TARGETS_PREFIX` (realized theme set). Solving
  the sworb in either mode solves it for the day. (Now correct for writes too, post-#1.)
- **SEPARATE:** casual banks `DAILY_/SEVEN_/PUZZLE_BEST_/RUNS_/ATT_/EFF_/TIME_/DONE_PREFIX` (all
  `dailyMode`-gated); stacks banks only `STACKL_BEST_PREFIX` + the `|stackl` leaderboard partition.
- **Lifecycle:** casual is endless (`timeLeft` pinned 9999, `dailyDone()` false, snapshot resume);
  stacks ends at `timeLeft<=0`, session-only.

## Reusable UI to KEEP (strong, on-brand)

- **Board-morph A–Z tile keyboard** (`sworbKb`) — game + home surfaces.
- **Tap-to-flip stepper card** (play ⇄ sworb face, zero-board-shift crossfade).
- **Sworb guess blocks** with Wordle-persistence (`sworbGuess` + `sworbSlots`).
- **Clue fan** (candy pill / ghost dashes, drift).
- **Mode picker** (arm + swipe-to-launch).
- **Tile/candy visual language** (PALETTE, tile styles, boom-confetti, storm/aurora dock FX).
- **Podium graph** as a component (reuse once its data *basis* is fixed — see decisions).

## Vestigial cruft to CLEAR (mostly deletion — do before/during redesign)

Priority order. All line refs `index.html`; mirror to `Sworble.dc.html`.

1. **Dead sworb guess MODAL** (`~1000–1021`) + its whole render-val cluster (`openSworbModal`,
   `sworbHeaderShow`, `sworbPip*`, `sworbGuessBtnStyle`, `onSworbInput/onSworbKey/submitSworb`,
   `cancelSworb/closeSworb`, `sworbInput*Style`, `sworbClueLine/…/sworbGuessesLine/sworbShakeKey`).
   Never opened; superseded by the stepper+keyboard.
2. **Dead "swipe up to practice" dock** (`~505–516`) + the `dailyDone()`-guarded practice fallback —
   `dailyDone()` is baked false, so this never renders.
3. **Dead desktop aside** (`~331–356`, `asideStyle:{display:'none'}`) with stale classic-timer copy.
4. **Vestigial word-budget UI:** the settings **"Words per run"** stepper (`~803–812`), the HUD 4th-cell
   color threshold keyed off the never-decremented `guessesLeft` (`~6023`), and the how-to `htTimeLine`
   copy describing the removed budget (`~5527`). The budget is gone; these are its ghosts.
5. **`puzzleOn()` / `dailyDone()` baked switches** (`1391`, `2511`) — collapse them so the single live
   path is legible; delete the `!puzzleOn()`/classic arms in `htTimeLine`/`htBombLine`/`timeHudLabel`/
   `timeText`. **When you do, re-home the ≤60s low-time warning** (`~2656`, currently gated on dead
   `!puzzleOn()`) onto `stacklOn()` — stacks actually wants it.
6. **Dead `toggleDaily`** (`~5844`, referenced nowhere; also the (dailyMode,stacklMode) landmine).
7. **Seven basis vestigially retained** — the "Sworble Seven" UI is already gone, but `bestSevenTotal`/
   `mergeDailySeven`/`SEVEN_PREFIX` remain the scoring spine (feeds the podium/LB). See decision #B.
8. **`clues` alias** in `dailyEntry()` — still load-bearing (`_placeCluesInRefill`, `clueFan`,
   `sworble-status`). Convert those reads to `themeWords`, then remove the alias.
9. **Duplicate `animation` key** in `timeValStyle` (`~6020`/`6026`) — second silently wins.

## Decisions to settle BEFORE the redesign commits (need the design owner)

- **A. What is a "stacks score"?** Today, because `puzzleOn()` is baked true, `clearWord` computes
  `score = bestSevenTotal(...)` for BOTH modes — so a 2-minute stacks sprint only counts your **top-7
  words**, not a cumulative total. The spec's "rack up points, best round score" implies **cumulative**.
  Pick: cumulative arcade total for stacks (recommended, matches "blast through") vs keep best-7.
  This changes what stacks banks + shows. (Audit finding #3.)
- **B. What ranks the two leaderboards?** Casual "standings" + the full LB currently rank by **raw
  points** (the seven basis). The **theme-first rank basis** built in Phase 1
  (`dailyStatus().sworb.rank = {solved, solveTier, themeFound}`) is computed but **read by ZERO UI**.
  Decide: casual ranks by sworb-solve quality (the stated design) — and unify the two leaderboards'
  visual system (casual podium-graph vs the stacks best-score stub currently live only inside the
  over-sheet). (Audit findings #4/(d)3; also the logged "legacy full-LB shows puzzle-scale scores".)
- **C. Sworb solve-bonus persistence.** The bonus is added to `score` but not to `roundWords`, so the
  next word recomputes `score = bestSevenTotal(...)` and erases it (survives only if solving is your
  last scoring action). Fold into whatever #A decides. (Audit #4.)
- **D. Naming/concept: "sworb safe."** The home "sworb safe" row opens the **word bank** (your best
  *words*), but the design's "sworb safe" = the collected *theme hints*. Align the name or the content.
- **E. The 4th HUD cell** currently means 3 things (stacks TIME / casual WORDS / dead WARMUP) and colors
  off the dead budget. Redefine per mode explicitly as part of the redesign.

## Recommended sequence

1. (done) Fixes #1 + #2.
2. Settle decisions A–E with the design owner (they shape the score/leaderboard/HUD the UI will show).
3. Clear the vestigial cruft (§ above) — mostly deletion; collapsing `puzzleOn`/`dailyDone` first makes
   the render-vals legible for the redesign.
4. Redesign the UI on the clean contract + reusable core.
