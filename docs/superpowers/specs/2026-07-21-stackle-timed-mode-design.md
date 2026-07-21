# Stackle — 2-minute timed mode (Phase 2)

Status: approved design, prototype scope (GitHub Pages, no backend).
Date: 2026-07-21.

> **Part of the 3-phase pivot** to two audiences. Phase 1 (Word of the Day daily reframe) is
> shipped. **This spec covers Phase 2 only** — the Stackle timed arcade mode. Phase 3 (the
> two-section home + mode picker + the two real leaderboards, plus the Phase-1 score-banking /
> theme-first standings follow-ups) is a separate spec and is **out of scope** here.

## Summary

Stackle is the **arcade** counterpart to the casual Word of the Day: a fast, 2-minute time-attack
on a **separate daily-seeded board** (non-theme — no sworb, no spoilers). The clock is **dynamic**
— it starts at 2:00 and good words **add time**, while **bombs swing it up or down** — so a strong
run extends itself and a sloppy one dies fast. You **blast through** as many high-scoring words as
you can; **streak × length multipliers** reward speed and long words. You can **replay** today's
board freely, and your **best score** is what ranks you on Stackle's **own daily leaderboard**. And
when you want fresh boards, **Stackle practice** serves up **random** boards with the same mechanics
— endless free-play that never touches the leaderboard.

This largely **promotes the existing timed run** (`!puzzleOn()` practice mode already has the 2:00
dynamic clock, streak multiplier, length multiplier, AND is a random-board timed run) plus
**re-enables the two bomb systems** (currently disabled/cut from the live board) and adds the
daily-board seed, best-score storage, and a separate leaderboard.

## Confirmed design decisions (from brainstorm 2026-07-21)

- **Clock:** dynamic — starts 2:00, good words add time (length-scaled), bombs add/subtract time,
  run ends at 0. (Not a hard cap; a skilled chain extends past 2:00.)
- **Bombs:** BOTH systems, re-enabled and tuned **sparse** for a 2-minute sprint — the streak mine
  (fast risk/reward) AND hidden sonar bombs (deduction).
- **Board:** a **separate** daily-deterministic board (non-theme), shared by everyone, resets daily.
- **Replay + best:** replay today's Stackle board freely; the **best** score for the day ranks.
- **Leaderboard:** a **separate** Stackle daily leaderboard, distinct from the Word-of-the-Day
  standings.
- **Two Stackle sub-modes:** the **daily board** (deterministic, shared — best run ranks) AND
  **Stackle practice** (endless **random** boards, same mechanics, **no leaderboard impact**) for
  when you want fresh boards. Practice is kept and reframed as Stackle free-play (not retired).
- **Home entry:** Phase 2 ships a **minimal launch path**; the polished **mode picker** (arm a mode,
  then "swipe up to play" launches it — same board engine, different context) is **Phase 3**.

## Core loop

- Open today's Stackle board (deterministic, shared, non-theme).
- Clock starts at 2:00, counting down.
- Spell words: each scores (length × streak multiplier) and **adds time** (length-scaled).
- **Streak mine:** on a hot streak a bomb spawns; sweep it into a **4+** word → time + score blast
  (good); hit it with a **≤3** word or leave it too long → **lose time** (bad).
- **Hidden sonar bombs:** sparse hidden bombs; corner sonar numbers hint their cells; thread a
  **long** word through one → big time/score blast; whiff → penalty.
- Run ends when the clock hits 0. Your run score is banked as today's **best** if it beats it.
- **Replay** the same board as often as you like; best score ranks you.

## Components (grounded in the current code)

### 1. Stackle board seed (new, deterministic)

- A separate daily board: `stackleKey = dayKey(date)`, seeded via
  `mulberry32(SworbleCore.hashSeed(stackleKey + '|stackle'))` — a distinct salt so it never
  matches the Word-of-the-Day board. Reuses the existing `newGame()` deal, **skipping** the theme
  seeding branch (`themePool()` path).
- Deterministic: identical board + bomb placement for everyone, every replay, resets daily.

### 2. Game mode flag

- Today's game distinguishes three contexts: Word-of-the-Day daily (`puzzleOn()` + theme),
  Stackle (`stackleOn()` — new), and warm-up/tutorial. Add a `stackleOn()` predicate and a
  `mode` notion the run carries so scoring/clock/board branch correctly. Stackle is timed
  (`!puzzleOn()`-style clock) but daily-seeded (unlike old random practice).

### 3. Dynamic clock + time-adds (reuse)

- Reuse the existing timed-run clock (`timeLeft`, the per-word time bonus, the countdown in
  `frame()`). Confirm the 2:00 start (`gameSeconds` default) and the length-scaled `+time` on
  commit apply in Stackle. Run-over on `timeLeft <= 0` (the existing `endRound()` clock trigger)
  — this is the mode that KEEPS the auto-end (Phase 1 removed it only for the endless daily).

### 4. Bombs — re-enable both, tuned sparse

- **Streak mine:** the existing streak-triggered mine (spawn on streak; 4+ catch = blast bonus;
  ≤3 hit = −5s). Re-enable for `stackleOn()`; tune spawn rate for a 2-min sprint.
- **Hidden sonar bombs:** the existing hidden-bomb + sonar-number system (`mineQuota`, sonar
  counts, thread-through blast). Re-enable for `stackleOn()`, **sparse** (a low quota) so the
  sprint isn't noisy. Both were disabled/cut from the live board — this restores them **only**
  in Stackle (Word-of-the-Day stays bomb-free).
- Determinism: bomb placement is a function of the Stackle day seed.

### 5. Multipliers + scoring (reuse)

- Keep the existing **streak multiplier** and **length multiplier**. Run score = sum of word
  points (with multipliers) + bomb blast bonuses. No new scoring model — this is the arcade the
  engine already scores.

### 6. Replay + best-score storage + practice (new)

- New store key `K.STACKLE_BEST_PREFIX = 'sworble_stackle_best_'` — per-day best score
  `{ best, runs }` (or just a number). On a **daily-board** run-over, `best = max(best, runScore)`.
- Replay: launching the daily Stackle again re-deals the SAME daily board (deterministic) for a
  fresh 2:00. The best score is the leaderboard-ranking value.
- **Stackle practice:** launching practice deals a **random** board (session-only, non-deterministic
  is fine here — reuses the existing practice deal) with the same clock/bombs/multipliers. Practice
  runs **never** update `STACKLE_BEST_PREFIX` or the leaderboard — pure free-play. This is the one
  functional split between the two sub-modes.

### 7. Stackle leaderboard (separate, prototype stub)

- A **separate** daily leaderboard surface for Stackle, distinct from the Word-of-the-Day
  standings. Prototype: a local stub (like the existing standings stub) ranked by best score;
  backend later (rides the existing submit/queue seam when it exists).
- Resets daily.

### 8. Home entry (Phase 2 minimal)

- A minimal **Stackle launch card/button** on home that starts today's daily Stackle board, plus a
  secondary **"random board" (practice)** launch. Enough to play + iterate. The full two-section
  home + the **mode picker** ("arm" Word-of-the-Day or Stackle, then the existing
  **swipe-up-to-play** launches the armed mode — same board engine, different context) is **Phase 3**.

### 9. Stackle practice (reframed free-play)

- The existing `startPractice()` (random session board, timed) IS Stackle practice — keep it,
  enable the Stackle bombs + multipliers on it, and surface it as "Stackle practice / random
  board." Practice runs are pure free-play: they never write `STACKLE_BEST_PREFIX` or hit the
  leaderboard. Keep the warm-up/tutorial path. (Nothing is retired — practice is repurposed.)

## Determinism & persistence

- Board + bombs are a function of `(stackle day seed)`; every player + every replay gets the same
  board. Best score persists per day under `STACKLE_BEST_PREFIX`. Server replay-verification holds
  (score is deterministic from board + moves), consistent with the existing model.

## Out of scope (this phase)

- The **two-section home + mode picker + swipe-to-arm** launch (Phase 3).
- The **real** (backend) leaderboards for either mode; the Phase-1 score-banking + theme-first
  standings-sort follow-ups (Phase 3).
- Authoring/curating Stackle boards (they're deterministic deals — no content authoring needed).
- Any new bomb *mechanics* — only re-enabling + tuning the two that already exist.

## Build order (highest-risk first)

1. **`stackleOn()` mode + daily board seed** — a separate deterministic non-theme board, launched
   from a minimal home entry; confirm it's timed (2:00 dynamic clock) and NOT theme-seeded.
2. **Re-enable + tune the bombs** (streak mine + sparse hidden sonar) for `stackleOn()` only,
   deterministic from the Stackle seed.
3. **Best-score storage + replay** (STACKLE_BEST_PREFIX; replay re-deals the same board).
4. **Stackle leaderboard stub** (separate surface, ranked by best score).
5. **Stackle practice** — surface the existing random-board timed run as Stackle free-play (same
   bombs/multipliers), guaranteed to NEVER write the best score or hit the leaderboard.
6. Browser-verify the full loop (daily play, bombs, clock, replay, best updates, leaderboard, AND
   practice = random board that doesn't touch best/leaderboard); commit.
