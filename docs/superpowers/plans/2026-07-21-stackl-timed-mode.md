# Stackl — 2-Minute Timed Mode (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Stackl" — a fast 2-minute time-attack mode (dynamic clock, words add time, bombs, multipliers) on a separate daily-seeded board with its own best-score + leaderboard, plus a random-board practice sub-mode — by REVIVING the engine's currently-baked-off timed-run code paths under a new mode.

**Architecture:** The timed clock, per-word time-adds, both bomb systems, and the streak/length multipliers all EXIST in `index.html` but are dead today because `puzzleOn()` is hardcoded `true` (which freezes the clock at 9999, disables time-adds via a `!puz` gate, and — with a `debugMine` gate — cuts bombs). We introduce a real mode flag + `stacklOn()` predicate and re-gate those paths on `stacklOn()`. Stackl gets its own deterministic non-theme board seed, a `STACKL_BEST_PREFIX`, and a separate leaderboard partition (`|stackl`). The Word-of-the-Day daily is unchanged (endless, no clock, no bombs). Determinism stays `(day seed, moves)`.

**Tech Stack:** Vanilla ES5-ish browser modules + `module.exports` for Node tests; `node:assert` run by `npm test`; `index.html` is a ~6377-line Claude "dc" template (`{{ bindings }}` + `<sc-if>`) mirrored byte-for-byte to `Sworble.dc.html`. No framework, no build step.

## Global Constraints

- After editing `index.html`, MIRROR it: `cp index.html Sworble.dc.html && printf '\n' >> Sworble.dc.html` (the `tests/mirror-check.js` in `npm test` enforces byte-equality).
- EVERY `{{ x }}` added to the template MUST be defined in the render-vals in ALL states, or the dc runtime warns "never resolved" / renders a literal `{{ }}` hole.
- Determinism is sacred: all randomness in the daily/stackl DAILY board comes from `SworbleCore.mulberry32(seed)` seeded off the day. Stackl PRACTICE may use `Math.random` (session-only, non-ranked) exactly like the existing practice deal. Never `Math.random()` in a ranked/deterministic path.
- BROWSER-VERIFY every task with claude-in-chrome: serve `python3 -m http.server 8737`, load `http://localhost:8737/`. The browser caches JS modules aggressively — after changing ANY `.js` module do a **hard reload** (`cmd+shift+r`), not just `?x=N` (which only busts index.html). Confirm the new code loaded before trusting a check.
- Do NOT change the Word-of-the-Day daily's behavior (endless, no clock, no bombs). Stackl is additive. `puzzleOn()` stays as-is (baked `true` = the daily); Stackl is a NEW parallel context, not a repurposing of `puzzleOn`.
- Naming: user-facing mode name is **"stackl"** (lowercase, matches the sworbl brand). Internal identifiers use `stackl` (`stacklOn`, `stacklMode`, `K.STACKL_BEST_PREFIX`). Do NOT rename existing `sworble_*` keys / `sworble-*.js` files / `Sworble*` globals — those are invisible internals; a rebrand is out of scope here.

## Key code map (from engine archaeology — verify line numbers before editing; the monolith shifts)

- `puzzleOn()` hardcoded `true` — `index.html:1361`. `roundSecs()` returns 180 when puzzleOn (`1378`). Clock frozen: `frame()` `const timeLeft = this.puzzleOn() ? 9999 : ...` — `2597`; countdown-end `if (timeLeft <= 0) this.endRound()` — `2599-2601`.
- Per-word time-add (dead, gated `!puz`): `clearWord()` `if (this.isV2() && !this.state.over && !puz) { ... roundEndAt += timeBonus*1000 }` — `3481-3494` (`+1s per letter beyond 2`; fizzle `-3s`).
- `endRound()` def `2484-2536`; only live call site today is the dev `devEndRun` button `5568`. It gates daily-only writes on `this.optVal('dailyMode', true)` (`2491,2502,2519,2532`) and writes `K.PUZZLE_BEST_PREFIX` at `2519-2520`, `submitDaily()` at `2527`.
- Hidden sonar bombs: `mineQuota()` `3195-3212`; disabling gate `if (!this.optVal('debugMine', false)) return 0;` at **`3204`**; placement `syncMines()` `3213-3265`; catch/blast + fizzle in `clearWord()` `3362-3421` (`FIZZLE_PEN=15`); `feverUntil` +10s at `3407`.
- Streak mine (dead via puzzleOn bake): non-puzzle branch of `mineQuota()` `3208-3211`.
- Multipliers: `lenMult` `3147`, `streakMult` `3149`, applied in `clearWord()` `3334-3345,3422`.
- Board deal + seed: `newGame()` `2081-2225`; daily deterministic branch `2092-2120` (deal rng `this.rand` from `hashSeed(this.dailyKey)` at `2093/2098`); practice random branch `2121-2130` (`Math.random`); theme seed (separate) `2167`.
- `startDaily`/`_startDaily` `5624-5642`; `startPractice`/`_startPractice` `5643-5652` (sets `opts.dailyMode=false`, NO `saveOpts`); home dock template `474-502`; `homeDockStyle` `5801`; `dailyNotDone`/`dailyIsDone` `5820-5821`.
- Leaderboard stub: `lbStub(date)` `3985-4001`; `lbBoardId(date)` = `date + (puzzleOn()?'|puzzle':'')` — `3964`; `lbMode()` `3965`; `loadHomeLb()` `4009-4013`; `submitDaily()` `4014-4022`.
- Store keys `K`: `sworble-store.js:29-63`; per-day prefixes `44-59` (add `STACKL_BEST_PREFIX` next to `PUZZLE_BEST_PREFIX`).

---

## Task 1: `stacklOn()` mode + revive the 2:00 clock + minimal launch

**Files:** Modify `index.html` (mode flag + `stacklOn()`, `roundSecs()`, `frame()` clock gate, `endRound()` trigger, a `startStackl` launch + a temporary dev/home button), then mirror.

**Interfaces:**
- Produces: `this.stacklOn()` → true when the current run is a Stackl run. A run-scoped flag (state `stacklMode: bool`, set at launch, carried on the run snapshot if resume is wanted — for Phase 2, session-only is fine). `startStackl()` starts a Stackl daily run.

- [ ] **Step 1: Add the mode flag + predicate.** Add `stacklOn() { return !!this.state.stacklMode; }` near `puzzleOn()` (`~1361`). Add `stacklMode: false` to the initial state (near the other run flags). Stackl is orthogonal to `puzzleOn()` (which stays baked `true` for the daily).

- [ ] **Step 2: Un-freeze the clock for Stackl.** In `frame()` (`~2597`), change `const timeLeft = this.puzzleOn() ? 9999 : ...` to:
```js
      const timeLeft = this.stacklOn()
        ? Math.max(0, (this.roundEndAt - now) / 1000)   // live countdown for Stackl
        : (this.puzzleOn() ? 9999 : Math.max(0, (this.roundEndAt - now) / 1000));
```
The existing `if (timeLeft <= 0) { this.endRound(); return; }` (`~2599`) then fires for Stackl.

- [ ] **Step 3: 2:00 for Stackl.** In `roundSecs()` (`~1378`) return the Stackl length first:
```js
  roundSecs() { return this.stacklOn() ? 120 : (this.puzzleOn() ? 180 : this.optVal('gameSeconds', 120)); }
```
Confirm `newGame()`/the clock setup (`~2202-2222`) seeds `roundEndAt` from `roundSecs()` so a Stackl run starts at 120s.

- [ ] **Step 4: Minimal launch.** Add `startStackl()` mirroring `startPractice` (`~5643`) but setting `stacklMode: true` in the setState (and `dailyMode:false` so the daily-only writes don't fire), then `screen:'game'`, `this.newGame(true)`. Wire a temporary launch: add a home button (a new `sc-if` branch in the dock, or reuse the dev panel) `onClick="{{ startStackl }}"` + the render-val handler. (The polished home card is Task 7; this is just to reach the mode.)

- [ ] **Step 5: Browser-verify.** Hard-reload, launch Stackl. Confirm: `c.stacklOn()===true`, the HUD clock counts DOWN from ~2:00 (not frozen), and when it hits 0 the run ends (`state.over===true`, result screen). The Word-of-the-Day daily still has NO countdown (launch it, confirm `stacklOn()===false`, clock frozen/absent). No console errors.

- [ ] **Step 6: Mirror, test, commit.** `cp index.html Sworble.dc.html && printf '\n' >> Sworble.dc.html && npm test`; commit `feat: stacklOn() mode + revive the 2:00 countdown clock + minimal launch`.

---

## Task 2: Revive per-word time-adds for Stackl

**Files:** Modify `index.html` (`clearWord()` time-bonus gate), then mirror.

- [ ] **Step 1: Re-gate the time-add.** In `clearWord()` (`~3481-3494`) the block is gated `if (this.isV2() && !this.state.over && !puz)` where `puz = this.puzzleOn()` (always true → dead). Change the gate to run for Stackl: `if (this.isV2() && !this.state.over && this.stacklOn())`. Keep the body: `timeBonus = Math.max(1, ids.length - 2); this.roundEndAt += timeBonus*1000; this.timeRoll += timeBonus;` and the fizzle `this.roundEndAt -= 3000`.

- [ ] **Step 2: Browser-verify.** Hard-reload, launch Stackl, spell a few words. Confirm the clock JUMPS UP by ~(len-2)s per word (watch `c.roundEndAt` / the HUD). A ≤3-letter word adds +1s; a longer word adds more. Daily mode: confirm words do NOT add time (clock stays absent). No errors.

- [ ] **Step 3: Mirror, test, commit.** Commit `feat: stackl words add time (revive the words-buy-time clock)`.

---

## Task 3: Separate deterministic Stackl board seed + practice random board

**Files:** Modify `index.html` (`newGame()` deal-seed branch), then mirror.

**Interfaces:**
- Produces: on a Stackl DAILY run, the tile deal is seeded by `hashSeed(this.dailyKey + '|stackl')` (a distinct salt → never the daily board), NO theme seeding. On a Stackl PRACTICE run, a random `Math.random` deal (the existing practice branch). A `this._stacklPractice` (or an opt) distinguishes daily-Stackl from practice-Stackl.

- [ ] **Step 1: Distinguish Stackl daily vs practice.** In `startStackl()` (Task 1) set `stacklMode:true` for the DAILY board; add `startStacklPractice()` that sets `stacklMode:true` + a `stacklPractice:true` flag for the RANDOM board. Add state `stacklPractice:false`.

- [ ] **Step 2: Seed the Stackl daily deal.** In `newGame()` (`~2092`), the deal currently branches on `this.optVal('dailyMode', true)`. Add a Stackl-daily branch: when `this.stacklOn() && !this.state.stacklPractice`, seed the deal streams from `SworbleCore.hashSeed(this.dailyKey + '|stackl')` (mirror the daily branch's `this.rand`/`rowRand`/letter-queue setup at `2093-2118`, swapping the seed), and SKIP the theme/sworb seeding (the `themePool()` block at `~2160`). When `this.stacklOn() && this.state.stacklPractice`, use the existing random practice branch (`2121-2130`).

- [ ] **Step 3: Browser-verify determinism + practice randomness.** Hard-reload. Launch Stackl daily twice (fresh) → identical board (`liveTiles().map(letter).join()` equal), and DIFFERENT from the Word-of-the-Day board (no theme words seeded). Launch Stackl practice twice → DIFFERENT boards (random). No errors.

- [ ] **Step 4: Mirror, test, commit.** Commit `feat: deterministic Stackl daily board seed (non-theme) + random practice board`.

---

## Task 4: Re-enable both bomb systems for Stackl (sparse)

**Files:** Modify `index.html` (`mineQuota()`, help copy), then mirror.

**Interfaces:**
- Produces: on a Stackl run, `mineQuota()` returns a small positive count (sparse); `syncMines()` plants bombs deterministically from the Stackl seed; the existing catch/blast + fizzle mechanics (`3362-3421`) fire. Word-of-the-Day + practice-daily stay bomb-free.

- [ ] **Step 1: Quota for Stackl.** In `mineQuota()` (`~3195`) add a Stackl branch BEFORE the `puzzleOn()` branch:
```js
    if (this.stacklOn()) {
      if (this.state.over) return 0;
      return this.state.tut ? 1 : 2; // SPARSE for a 2-min sprint (tune later)
    }
```
Leave the `puzzleOn()`/`debugMine` gate for the daily unchanged (daily stays bomb-free). Both bomb "flavors" share this quota + `syncMines()` placement + the `clearWord()` catch path — the streak-mine's escalation can be layered in tuning; for Task 4 the sparse hidden-sonar placement via `syncMines()`'s `topWordStarts` is the mechanic that lights up.

- [ ] **Step 2: Show the sonar numbers/glyphs for Stackl.** The `ring`/`ringGlyph`/sonar rendering is gated `this.optVal('debugMine', false)` (`~5078,5092`). Add `|| this.stacklOn()` to those gates so bombs + sonar numbers render in Stackl. Set `htBombShow`/`htBombLine` (`~5415,5465`) to show the bomb help copy in Stackl.

- [ ] **Step 3: Browser-verify.** Hard-reload, launch Stackl. Confirm ~2 bombs on the board with sonar corner numbers; sweep a 4+ word through one → score blast + fever (+time); a ≤3 word through one → fizzle penalty (−points, −3s). Reload the same Stackl day → same bomb positions (deterministic). Daily + Stackl-practice: confirm bombs behave per design (daily = none; practice = bombs present but non-ranked). No errors.

- [ ] **Step 4: Mirror, test, commit.** Commit `feat: re-enable bombs for stackl (sparse hidden-sonar + streak-mine path)`.

---

## Task 5: Best-score storage + replay (daily ranks; practice never does)

**Files:** Modify `sworble-store.js` (`K.STACKL_BEST_PREFIX`), `index.html` (`endRound()` best-write + a replay path), then mirror.

**Interfaces:**
- Produces: `K.STACKL_BEST_PREFIX = 'sworble_stackl_best_'`; on a Stackl DAILY run-over, `best = max(best, score)` is written per day. A "replay" re-deals the SAME Stackl daily board for a fresh 2:00. PRACTICE run-overs write NOTHING to best/leaderboard.

- [ ] **Step 1: Add the key.** `sworble-store.js` `K` object near `PUZZLE_BEST_PREFIX` (`~48`): `STACKL_BEST_PREFIX: 'sworble_stackl_best_',`.

- [ ] **Step 2: Bank the best on Stackl-daily run-over.** In `endRound()` (`~2484`), add a Stackl branch: `if (this.stacklOn() && !this.state.stacklPractice) { const k = K.STACKL_BEST_PREFIX + this.dailyKey; const prev = parseInt(LS.getItem(k)||'0',10)||0; if (this.state.score > prev) LS.setItem(k, String(this.state.score)); }`. Ensure the daily-only writes (`mergeDailySeven`/`PUZZLE_BEST`/`submitDaily`, gated `optVal('dailyMode')`) do NOT fire for Stackl (they won't — Stackl runs set `dailyMode:false`). PRACTICE (`stacklPractice:true`) skips the best-write.

- [ ] **Step 3: Replay.** After a Stackl-daily run-over, offer "replay" (a button on the result screen or the home Stackl card) that calls `startStackl()` again — `newGame(true)` re-deals the same deterministic board for a fresh countdown.

- [ ] **Step 4: Browser-verify.** Hard-reload. Play a Stackl daily run to time-out; note the score. Read `localStorage['sworble_stackl_best_'+dailyKey]` = that score. Replay, beat it → best updates to the higher; replay, do worse → best unchanged. Play a Stackl PRACTICE run → confirm `sworble_stackl_best_*` is NOT written and no leaderboard submit fires. No errors.

- [ ] **Step 5: Mirror, test, commit.** Commit `feat: stackl best-score storage + replay (daily ranks; practice never banks)`.

---

## Task 6: Separate Stackl leaderboard stub

**Files:** Modify `index.html` (`lbBoardId`/`lbMode` for stackl, a stackl leaderboard stub + surface), then mirror.

**Interfaces:**
- Produces: a SEPARATE Stackl daily leaderboard, ranked by best score, partitioned from the Word-of-the-Day standings (`|stackl` board id, distinct `K.LB_ME_PREFIX` cache). Prototype stub (local), backend-ready via the existing seam.

- [ ] **Step 1: Partition the board id.** `lbBoardId(date)` (`~3964`) → include a Stackl suffix when in Stackl: `return date + (this.stacklOn() ? '|stackl' : (this.puzzleOn() ? '|puzzle' : ''));`. `lbMode()` (`~3965`) → return `'stackl'` when `stacklOn()`. This keeps Stackl scores in their own `K.LB_ME_PREFIX` slot + remote `mode` partition, never colliding with the daily.

- [ ] **Step 2: A Stackl leaderboard surface.** Model a minimal Stackl standings on the existing `lbStub`/`homeLb` pattern (`3985-4013`): a `loadStacklLb()` that builds a stub ranked by best score for `date + '|stackl'`, stored in `state.stacklLb`, and a home/game surface (a card or a screen) that renders it. Keep it minimal (mirror the existing stub); the polished two-leaderboard home is Phase 3.

- [ ] **Step 3: Browser-verify.** Hard-reload. After a Stackl daily run, open the Stackl leaderboard → it shows a stub board with the player's best score placed by rank, DISTINCT from the Word-of-the-Day standings (different entries/scores; the `|stackl` `K.LB_ME_PREFIX` holds the Stackl score, the `|puzzle` one holds the daily score — they don't overwrite each other). No `{{ }}` holes, no errors.

- [ ] **Step 4: Mirror, test, commit.** Commit `feat: separate stackl leaderboard stub (|stackl partition)`.

---

## Task 7: Home entry — Stackl launch card + practice launch

**Files:** Modify `index.html` (home template + render-vals), then mirror.

- [ ] **Step 1: Stackl launch card.** Add a minimal Stackl card/button to the home screen (near the daily hero / dock) with `onClick="{{ startStackl }}"` (today's daily board) and a secondary "random board" `onClick="{{ startStacklPractice }}"`. Show today's Stackl best (from `STACKL_BEST_PREFIX`) on the card. Mirror the existing card styling; every `{{ }}` defined in render-vals.

- [ ] **Step 2: Remove the temporary Task-1 launch button** (the dev/placeholder one), now that the real card exists.

- [ ] **Step 3: Browser-verify.** Hard-reload home. The Stackl card shows + launches today's Stackl board (deterministic) and the practice option launches a random board. The card shows the stored best. The Word-of-the-Day hero + swipe-up-to-play still work. No `{{ }}` holes, no errors.

- [ ] **Step 4: Mirror, test, commit.** Commit `feat: home stackl launch card (daily + random practice)`.

---

## Task 8: Full-loop verification

- [ ] **Step 1:** `npm test` green (all suites + mirror).
- [ ] **Step 2:** Browser: full Stackl daily loop — launch from home, 2:00 counts down, words add time, ~2 bombs (blast/fizzle work), run ends at 0, best banks, replay beats/updates best, Stackl leaderboard shows it. Determinism: same Stackl day → identical board + bombs across two fresh loads.
- [ ] **Step 3:** Stackl practice: random boards, same mechanics, best/leaderboard UNTOUCHED.
- [ ] **Step 4:** Word-of-the-Day daily UNCHANGED (endless, no clock, no bombs, theme intact) — confirm no regression from the re-gating.
- [ ] **Step 5:** Commit any fixes.

---

## Notes for the implementer

- **`puzzleOn()` is baked `true` and IS the Word-of-the-Day daily** — do NOT try to "fix" it or route Stackl through `!puzzleOn()` (dead code). Stackl is a NEW orthogonal `stacklOn()` context. The three contexts: daily (`puzzleOn() && !stacklOn()`), Stackl (`stacklOn()`), warm-up/tut.
- The timed engine (clock, time-adds, bombs, multipliers) is intact but gated off — Phase 2 is re-gating on `stacklOn()`, not new mechanics. Verify each revived path in the browser (the gates are subtle).
- **Determinism split:** Stackl DAILY = deterministic (`hashSeed(dailyKey+'|stackl')`), ranks. Stackl PRACTICE = `Math.random`, never ranks. Keep that firewall (the best-write + leaderboard submit must check `!stacklPractice`).
- Bomb tuning (quota, streak-mine escalation, penalties) are constants — tune after playtesting; not contracts.
- Resume across reload is NOT required for Phase 2 (Stackl runs are session-only, like practice today). If wanted later, add a Stackl run-snapshot key.
- Rebrand (`sworble`→`sworbl` visible text) is a SEPARATE quick pass, not part of this plan.
