# Sworbl daily — casual + stackl, one theme, two ways to play (Phase 2)

Status: approved design (revised), prototype scope (GitHub Pages, no backend).
Date: 2026-07-21. **Supersedes** the earlier "Stackl as a separate non-theme mode" version of this
spec — the design converged on a UNIFIED daily instead.

> Part of the pivot. Phase 1 (the casual themed daily) is shipped. **This spec (Phase 2)** adds a
> **timed "stackl" way to play the SAME themed daily**, sharing one sworb, with its own leaderboard,
> plus a home mode-picker. Phase 3 (backend leaderboards, the Phase-1 score-banking follow-up,
> polish) stays out of scope.

## Summary

The daily has **one theme + one sworb of the day** on **one deterministic themed board**, playable
**two ways** — the player picks:

- **Casual** *(already built, Phase 1)* — endless, no timer. Leisurely spell words, theme words
  glow + bank as hints, guess the sworb.
- **Stackl (timed)** *(this phase)* — **unlimited 2-minute arcade rounds** on the **same themed
  board**: the clock starts at 2:00 and **good words add time**, **bombs** swing it, **streak ×
  length multipliers** reward speed. The 2-minute pressure means you can't leisurely hunt every
  theme word in one round, so you **collect hints across rounds through the day**.

**The sworb is shared:** one **sworb safe** (collected hints) + **5 guesses/day** (up from 3) + one
solved flag. A hint found in *either* mode banks to the same safe; a guess in *either* mode counts
against the same 5; solving it once (in either mode) solves it for the day. **The leaderboards are
separate:** casual ranks **solve quality** (the theme-first rank basis already built); stackl ranks
**best 2-minute round score**.

The timer *creates* the "come back all day" collection loop, and the arcade + deduction audiences
share one answer they chase their own way.

## Confirmed design decisions (brainstorm 2026-07-21)

- **One themed board, two clocks:** stackl plays the SAME theme-seeded daily board as casual — NOT
  a separate non-theme board (that earlier idea is dropped). Only the clock/bombs/scoring differ.
- **Shared sworb, own bragging:** shared safe + 5 guesses + solved (solve once, either mode);
  separate leaderboards (casual = solve quality, stackl = best round score).
- **Stackl clock:** dynamic — starts 2:00, good words add time, bombs swing it, run ends at 0.
  Unlimited replays of the same board through the day.
- **Bombs:** re-enabled for stackl (on the themed board), tuned sparse. Casual stays bomb-free.
- **Guesses:** 3 → 5 per day (shared).
- **Home:** a **mode picker** — arm Casual or Stackl, then the existing **swipe-up-to-play** launches
  the armed mode (same board engine, different context).
- **Random-board pure-arcade practice:** deferred (optional side-thing later) — not in this phase.

## Already done (carried over from the initial Stackl work)

- `stacklOn()` mode flag + the revived **2:00 countdown clock** (commit 81bdbe9) and the
  **words-add-time** clock bonus (commit 740ae6d). These are correct and reused as-is.

## Components (grounded in the current code)

### 1. Stackl runs the themed daily board (reuse Phase-1 seeding)

- On a stackl run, `newGame()` seeds the SAME theme board as the casual daily — reuse the Phase-1
  theme-seeding path (`themePool()` → best-effort theme words on the deterministic
  `hashSeed(dailyKey)` deal). Do NOT add a separate `|stackl` board seed; stackl and casual share
  the board so the same hints are present. (The earlier Task-3 "separate non-theme seed" is removed.)
- Stackl is `stacklOn()`; casual is the existing daily. Both are `dailyKey`-seeded + theme-seeded.

### 2. Shared sworb state (reuse Phase-1 plumbing)

- Theme-word finds in stackl bank to the SAME `K.FOUND_PREFIX + dailyKey` (the shared safe) via the
  existing `SworbleDaily.isClue` + found-tracking in `clearWord()` — it already keys off
  `this.dailyEntry()`, so it works in stackl unchanged. A theme find in stackl also pays the existing
  **+50%** (on top of the arcade score) AND ticks the shared counter.
- The sworb guess flow (`guessSworb`, the board-morph keyboard, `SWORB_PREFIX` state) is shared —
  one solved/guesses blob per `dailyKey`, used by both modes. **Bump the guess cap 3 → 5** (in
  `guessSworb`'s `guessesUsed >= 3` check and `dailyStatus().sworb.guessesLeft = 3 - used`
  → `5 - used`; grep the `3` literals tied to sworb guesses).

### 3. Stackl arcade layer (bombs + multipliers)

- **Multipliers:** the existing streak × length multipliers in `clearWord()` already apply — no
  change; they're the arcade scoring.
- **Bombs:** re-enable both bomb systems for `stacklOn()` only (the themed board), tuned sparse —
  `mineQuota()` returns a small positive count for stackl; `syncMines()` plants them; the existing
  catch-blast/fizzle in `clearWord()` fires. Casual stays bomb-free (`mineQuota()` returns 0 for the
  non-stackl daily, unchanged). Bomb placement is deterministic from the day seed.
- Sonar-number/glyph rendering + bomb help copy: enable for `stacklOn()`.

### 4. Stackl best score + leaderboard (separate)

- New store key `K.STACKL_BEST_PREFIX = 'sworble_stackl_best_'` — per-day best stackl round score.
  On a stackl run-over (`endRound()` when `stacklOn()`), `best = max(best, score)`.
- Stackl leaderboard: a SEPARATE surface ranked by best score, partitioned from casual via a
  `|stackl` board id (`lbBoardId`/`lbMode`), its own `K.LB_ME_PREFIX` slot. Prototype stub modeled
  on the existing `lbStub`; backend later.
- Casual leaderboard: the theme-first solve-quality basis (already computed in
  `dailyStatus().sworb.rank`) — its full standings-screen wiring is Phase 3, but the two boards must
  not collide (distinct partitions).

### 5. Home mode picker (Phase 2)

- A **mode picker** on home: two selectable cards/toggles — **Casual** and **Stackl** — that "arm"
  the chosen mode; the existing **swipe-up-to-play** dock then launches the armed mode
  (`startDaily()` for casual, `startStackl()` for stackl). Show the shared sworb progress + each
  mode's own stat (casual: solve state; stackl: today's best). Keep it minimal but real (this is the
  mode's front door); deeper home polish is Phase 3.

## Determinism & persistence

- Both modes share the deterministic themed board (`dailyKey` seed) + shared sworb state. Stackl
  bombs are a function of the day seed. Stackl best persists under `STACKL_BEST_PREFIX`; the shared
  sworb safe/guesses persist under the existing `FOUND_PREFIX`/`SWORB_PREFIX`. Stackl runs are
  session-only otherwise (no mid-run resume needed for a 2-min sprint). No existing-data migration
  needed (pre-release).

## Out of scope (this phase)

- Random-board pure-arcade practice (deferred).
- Backend leaderboards; the polished two-mode home + the Phase-1 daily score-banking / theme-first
  standings-sort follow-ups (Phase 3).
- The visible `sworble` → `sworbl` rebrand (separate quick pass).

## Build order (highest-risk first)

1. **Stackl runs the themed board + shares the sworb** — confirm a stackl run seeds the theme board
   (not a separate one), theme finds bank to the shared safe + pay +50%, and the sworb guess flow
   works from stackl. Bump guesses 3 → 5.
2. **Re-enable bombs for stackl** (sparse, themed board, deterministic) — casual stays bomb-free.
3. **Stackl best-score + separate leaderboard** (`STACKL_BEST_PREFIX`, `|stackl` partition).
4. **Home mode picker** — arm Casual/Stackl → swipe up to play; show shared sworb + per-mode stat.
5. Browser-verify the full unified loop (both modes on one board/sworb; shared safe + 5 guesses;
   separate leaderboards; determinism); commit.

## Notes for the implementer

- The clock + words-add-time are DONE (`stacklOn()`, commits 81bdbe9 / 740ae6d). This phase adds the
  theme-board sharing, bombs, best/leaderboard, and the picker.
- The sworb theme layer (isClue/found-safe/guess) already keys off `dailyEntry()`, so it "just works"
  in stackl once stackl seeds the theme board — the main care is the SHARED state (one safe, 5
  guesses, one solved) across both modes.
- Casual stays exactly as shipped (endless, no timer, no bombs). Stackl is additive.
