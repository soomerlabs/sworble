# Stackl — timed mode on the themed daily (Phase 2, unified) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.
>
> **REVISED:** design converged on a UNIFIED daily — stackl (timed) plays the SAME theme-seeded board as casual, shares one sworb (safe + 5 guesses + solved), separate leaderboards. The earlier "separate non-theme stackl board" tasks are removed. The revived clock + words-add-time are already committed (81bdbe9, 740ae6d) and carry over.

**Goal:** Add "stackl" — a 2-minute timed arcade way to play the SAME themed daily board as casual (words add time, bombs, multipliers), sharing the day's sworb (one safe, 5 guesses, one solved), with its own best-score leaderboard and a home mode-picker.

**Architecture:** Stackl (`stacklOn()`, already added) reuses the deterministic theme-seeded daily board + the Phase-1 sworb plumbing (`isClue`, `FOUND_PREFIX` safe, `guessSworb`, `SWORB_PREFIX`) — theme finds in stackl bank to the SAME shared safe and pay the same +50%. Stackl keeps `dailyMode:false` for clean separation from casual's score/run writes, and the DEAL + THEME-SEED gates gain `|| stacklOn()` so stackl still gets the deterministic themed board. Stackl adds the arcade layer (re-enabled bombs, the already-live multipliers/clock), a `STACKL_BEST_PREFIX`, a `|stackl` leaderboard partition, and a home picker. Casual is unchanged (endless, no timer, no bombs).

**Tech Stack:** `index.html` ~6377-line Claude "dc" template mirrored to `Sworble.dc.html`; pure modules + `node:assert` tests via `npm test`. No build step.

## Global Constraints

- After editing `index.html`, MIRROR: `cp index.html Sworble.dc.html && printf '\n' >> Sworble.dc.html`; `npm test` green (incl. mirror-check) before committing.
- EVERY `{{ x }}` added must be defined in the render-vals in ALL states (dc "never resolved" otherwise).
- BROWSER-VERIFY each task with claude-in-chrome: after ANY `.js` module change do a **hard reload** (`cmd+shift+r`), not just `?x=N`. The controller performs the browser checks between tasks.
- Determinism: the themed board + stackl bombs are functions of the `hashSeed(dailyKey)` day seed. Never `Math.random()` in the deterministic daily/stackl board path.
- Casual (the existing daily) MUST stay unchanged: endless, no timer, no bombs. Stackl is additive. `puzzleOn()` stays baked `true` (= the daily); `stacklOn()` (state `stacklMode`) is the orthogonal timed context.
- Naming: user-facing "stackl" / brand "sworbl"; internal identifiers `stackl*`. Do NOT rename existing `sworble_*` keys / files / globals.

## Key code map (verify line numbers before editing; the monolith shifts)

- `stacklOn() { return !!this.state.stacklMode; }` (added). `startStackl` = `this._startStackl` (mirrors `_startPractice`, ~5643) — currently sets `stacklMode:true` + `dailyMode:false`, then `newGame(true)`.
- `newGame()` ~2081: daily deterministic DEAL gate `if (this.optVal('dailyMode', true))` ~2092; THEME-SEED gate `const _pool = this.themePool(); if (_pool && this.optVal('dailyMode', true)) { ... }` (Phase-1 code, ~2160). Deal seed `hashSeed(this.dailyKey)` ~2093/2098.
- Sworb: `isClue`/found-tracking in `clearWord()` (keys off `this.dailyEntry()`); `guessSworb(input)` — cap check `st.solved || st.guessesUsed >= 3` and `guessesLeft = Math.max(0, 3 - st.guessesUsed)`; `dailyStatus().sworb` in `sworble-status.js` — `guessesLeft = Math.max(0, 3 - guessesUsed)`.
- `endRound()` ~2484 — daily-only writes gated `optVal('dailyMode', true)` (mergeDailySeven/DAILY_PREFIX/submitDaily/RUN save) → stackl (dailyMode:false) already skips them.
- Bombs: `mineQuota()` ~3195 (disable gate `if (!this.optVal('debugMine', false)) return 0;` ~3204); `syncMines()` ~3213; catch/fizzle in `clearWord()` ~3362-3421; sonar render gates ~5078/5092; help copy `htBombShow`/`htBombLine` ~5415/5465.
- Multipliers (already live in clearWord). Clock + words-add-time: DONE (`frame()` ternary, `roundSecs()`, the `stacklOn()` time-add gate).
- Store `K`: `sworble-store.js:44-59` (add `STACKL_BEST_PREFIX` near `PUZZLE_BEST_PREFIX`).
- Leaderboard stub: `lbStub` ~3985, `lbBoardId` ~3964, `lbMode` ~3965, `loadHomeLb` ~4009.
- Home dock/launch: template ~474-502; `startDaily`/`startPractice` ~5624-5652; `homeDockStyle` ~5801; `dailyNotDone`/`dailyIsDone` ~5820.

---

## Task 1: Stackl plays the themed board + shares the sworb; guesses 3 → 5

**Files:** Modify `index.html` (the deal + theme-seed gates, `guessSworb`, plus `startStackl` if needed), `sworble-status.js` (guessesLeft), then mirror.

**Interfaces:** Produces: a stackl run seeds the SAME deterministic theme board as casual; theme finds bank to the shared `FOUND_PREFIX` safe + pay +50%; the sworb guess flow works from stackl; the daily cap is 5 guesses (shared).

- [ ] **Step 1: Deterministic themed board for stackl.** In `newGame()`, change the DEAL gate `if (this.optVal('dailyMode', true))` (~2092) to `if (this.optVal('dailyMode', true) || this.stacklOn())`, and the THEME-SEED gate `if (_pool && this.optVal('dailyMode', true))` (~2160) to `if (_pool && (this.optVal('dailyMode', true) || this.stacklOn()))`. Now stackl (even with `dailyMode:false`) gets the deterministic `hashSeed(dailyKey)` deal + the theme words seeded. Leave `startStackl`'s `dailyMode:false` as-is (keeps stackl OUT of casual's endRound score/run writes — verified those gate on `optVal('dailyMode')`).

- [ ] **Step 2: Guesses 3 → 5.** In `guessSworb()` change `st.guessesUsed >= 3` → `>= 5` and `Math.max(0, 3 - st.guessesUsed)` → `Math.max(0, 5 - st.guessesUsed)`. In `sworble-status.js`'s sworb block change `Math.max(0, 3 - (num(sw.guessesUsed) || 0))` → `5 -`. (Grep for any other sworb-guess `3` literal, e.g. a "3 guesses left" copy string, and update.)

- [ ] **Step 3: Verify (controller browser).** Hard-reload. Launch stackl. Confirm: the board is the SAME as casual's themed board (same tiles, same theme words findable — `c.dailyEntry().themeWords` findable on `c.liveTiles()`); spelling a theme word banks it to `sworble_found_<day>` (shared safe) and jumps the score ×1.5; `c.guessSworb('<sworb>')` works and `dailyStatus().sworb.guessesLeft` starts at 5. Launch casual → same shared safe/solved state (a hint found in stackl shows as found in casual). No errors.

- [ ] **Step 4: Mirror, test, commit.** `feat: stackl runs the themed daily board + shares the sworb safe; 5 guesses`

---

## Task 2: Re-enable bombs for stackl (sparse, themed board, deterministic)

**Files:** Modify `index.html` (`mineQuota()`, sonar render gates, help copy), then mirror.

**Interfaces:** Produces: on a stackl run, ~2 sparse bombs are planted deterministically from the day seed; the existing catch-blast (4+ word) / fizzle (≤3) mechanics fire. Casual stays bomb-free.

- [ ] **Step 1: Quota for stackl.** In `mineQuota()` (~3195) add a stackl branch before the puzzleOn branch: `if (this.stacklOn()) { if (this.state.over) return 0; return this.state.tut ? 1 : 2; }` (SPARSE — tune later). Leave the puzzleOn/`debugMine` gate (casual = 0 bombs) unchanged.

- [ ] **Step 2: Render bombs + sonar for stackl.** Add `|| this.stacklOn()` to the sonar-number/`ringGlyph` render gates (~5078, 5092, currently `this.optVal('debugMine', false)`), and make `htBombShow`/`htBombLine` (~5415/5465) show the bomb help in stackl.

- [ ] **Step 3: Verify (controller browser).** Hard-reload, launch stackl → ~2 bombs + sonar corner numbers on the board; a 4+ word through a bomb = score blast + fever (+time); a ≤3 word through = fizzle penalty (−points/−time). Reload same day → identical bomb positions (deterministic). Launch casual → NO bombs. No errors.

- [ ] **Step 4: Mirror, test, commit.** `feat: re-enable bombs for stackl (sparse, on the themed board)`

---

## Task 3: Stackl best-score storage + separate leaderboard

**Files:** Modify `sworble-store.js` (`K.STACKL_BEST_PREFIX`), `index.html` (`endRound()` best-write, `lbBoardId`/`lbMode`, a stackl leaderboard stub + surface), then mirror.

**Interfaces:** Produces: `K.STACKL_BEST_PREFIX='sworble_stackl_best_'`; a stackl run-over writes `best = max(best, score)`; a SEPARATE stackl leaderboard (`|stackl` partition, own `LB_ME_PREFIX` slot) ranked by best score.

- [ ] **Step 1: Store key.** `sworble-store.js` `K` near `PUZZLE_BEST_PREFIX` (~48): `STACKL_BEST_PREFIX: 'sworble_stackl_best_',`.

- [ ] **Step 2: Bank the best.** In `endRound()` (~2484) add: `if (this.stacklOn()) { const k = K.STACKL_BEST_PREFIX + this.dailyKey; const prev = parseInt(LS.getItem(k) || '0', 10) || 0; if ((this.state.score || 0) > prev) LS.setItem(k, String(this.state.score)); }`. (Casual's daily writes already skip for stackl via the dailyMode:false gate.)

- [ ] **Step 3: Partition the leaderboard.** `lbBoardId(date)` (~3964) → `return date + (this.stacklOn() ? '|stackl' : (this.puzzleOn() ? '|puzzle' : ''));`. `lbMode()` (~3965) → return `'stackl'` when `stacklOn()`. Add a minimal `loadStacklLb()` + `state.stacklLb` modeled on `lbStub`/`loadHomeLb` (ranked by best score for `date + '|stackl'`), and a minimal surface (a card/section) rendering it — distinct from casual's standings. Every `{{ }}` defined.

- [ ] **Step 4: Verify (controller browser).** Hard-reload. Play a stackl run to time-out; note score → `localStorage['sworble_stackl_best_'+day]` = that score; replay + beat it → best updates; do worse → unchanged. Open the stackl leaderboard → shows a stub ranked by best, DISTINCT from casual standings (the `|stackl` and `|puzzle` `LB_ME_PREFIX` slots don't collide). No `{{ }}` holes, no errors.

- [ ] **Step 5: Mirror, test, commit.** `feat: stackl best-score + separate |stackl leaderboard`

---

## Task 4: Home mode picker (arm Casual / Stackl → swipe up to play)

**Files:** Modify `index.html` (home template + render-vals), then mirror.

**Interfaces:** Produces: a home picker that arms Casual or Stackl; the existing swipe-up dock launches the armed mode; shows the shared sworb progress + each mode's own stat (casual solve state; stackl today's best).

- [ ] **Step 1: Armed-mode state + picker.** Add `state.armedMode: 'casual'` (persist via opts if desired). Add two selectable cards/toggles on home — "Casual" and "Stackl" — that set `armedMode`. Style minimally (mirror existing cards).

- [ ] **Step 2: Route the swipe-up.** The dock's swipe-up/tap (`startDaily` at ~483) → route to `armedMode === 'stackl' ? this._startStackl() : this._startDaily()`. Update the dock label to reflect the armed mode. Remove the temporary stackl launch button from the earlier work.

- [ ] **Step 3: Show progress.** On/near the picker, show the SHARED sworb progress (from `dailyStatus().sworb`) + per-mode stat: casual = solve/clue state; stackl = today's best (from `STACKL_BEST_PREFIX`).

- [ ] **Step 4: Verify (controller browser).** Hard-reload home. Arm Stackl → swipe up launches a stackl run (themed board, timer, bombs). Arm Casual → swipe up launches the endless casual run. Both show the shared sworb progress; the stackl card shows today's best. No `{{ }}` holes, no errors.

- [ ] **Step 5: Mirror, test, commit.** `feat: home mode picker — arm casual/stackl, swipe up to play`

---

## Task 5: Full unified-loop verification

- [ ] **Step 1:** `npm test` green (all suites + mirror).
- [ ] **Step 2:** Browser: play BOTH modes on today's board — confirm same board + same theme; a hint found in stackl appears found in casual (shared safe); a sworb guess in either counts against the shared 5; solving in one marks solved in both.
- [ ] **Step 3:** Leaderboards: casual and stackl are separate + don't collide; stackl ranks by best score.
- [ ] **Step 4:** Stackl arcade: 2:00 clock, words add time, bombs blast/fizzle, run ends at 0, best banks + replay updates it.
- [ ] **Step 5:** Casual UNCHANGED (endless, no timer, no bombs, theme intact). Determinism: same day → identical board + bombs across two fresh loads.
- [ ] **Step 6:** Commit any fixes.

---

## Notes for the implementer

- The clock + words-add-time are DONE (`stacklOn()`, commits 81bdbe9/740ae6d). This phase: theme-board sharing (Task 1), bombs (Task 2), best/leaderboard (Task 3), picker (Task 4).
- **Shared sworb state is the crux:** ONE `FOUND_PREFIX` safe, ONE `SWORB_PREFIX` (5 guesses, solved) per `dailyKey`, fed by BOTH modes. The Phase-1 sworb code keys off `dailyEntry()`, so it "just works" once stackl seeds the theme board — verify the sharing explicitly.
- **Mode separation:** stackl keeps `dailyMode:false` so it never writes casual's score/run/leaderboard; only the DEAL + THEME gates opt stackl in (`|| stacklOn()`). Do NOT set stackl's dailyMode true (would clobber casual's saved run + pollute its score).
- Bomb tuning + the 5-guess count are constants, not contracts.
