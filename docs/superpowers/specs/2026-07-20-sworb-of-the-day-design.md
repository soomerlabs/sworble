# Sworb of the Day — design spec

Status: approved design, prototype scope (GitHub Pages, no backend).
Date: 2026-07-20.

## Summary

A daily theme layer on top of the existing scoring run. Each day has a hidden **sworb**
(a theme word, e.g. `OCEAN`) and **5 clue words** that belong to it (`TIDE, CORAL, WAVE,
REEF, SALT`). The clue words come from static content and are **seeded onto the board**,
guaranteed spellable. This INVERTS the existing `ensureDailyTargets` (which today derives
the day's collectible words FROM a random board): the clues now come first and the board
is built around them. The found/collectible tracking and UI from that system are reused;
only the source of the words changes. The scoring run is unchanged and never stops; the
sworb is theme-as-scoring-intel plus a side bet.

## Core loop (theme-as-scoring-intel)

- Play a normal daily scoring run (word budget, big words — all as today).
- Spelling one of the 5 clue words **lights it as a clue, pays a +50% bonus, and ticks a
  clue counter (X/5)**. Finding clues both scores and teaches the theme.
- At any time you may spend one of **3 daily sworb-guesses** (a resource SEPARATE from the
  word budget — guessing never costs you a word) to name the theme.
- The correct-guess bonus **scales inversely with clues found at guess time**: cold-read
  at 0 clues = biggest bonus; guess after all 5 found = smallest (you clearly knew).
- A wrong guess burns one of the 3 and the run continues. Running out of guesses locks
  the sworb for the day (unsolved); a correct guess locks it (solved).

The tension this creates: hunt clues for word-bonus points but shrink your guess payoff,
or gamble the guess early for the jackpot. Deduction and collection reinforce rather than
compete, and knowing the theme never ends the run — it points you at the day's big words.

### Confirmed design choices

- The **sworb is the category, not a board word.** `OCEAN` is not spelled on the board;
  the 5 clue words are.
- **You always guess to claim the sworb.** Finding all 5 clues makes the guess a gimme
  (and a small bonus) but never auto-solves.
- **Only the 5 curated clue words glow/bonus/count.** A valid on-theme word outside the 5
  (e.g. `SHORE`) does nothing. Framed like Connections: you hunt today's specific 5. This
  keeps content cheap (5 words/day) and detection trivial. Revisit a broader glow set only
  if testing shows the "no glow on a legit theme word" moment stings.

## The AI question (explicitly: there is none at runtime)

Glow detection is a **set-membership string match** — "is the spelled word in today's
5-word clue list?" Deterministic, no model, no network, identical on every device.

AI is confined to **offline content authoring**: an LLM proposes theme + candidate words;
a human curates to the day's 5 (in-dictionary, short, spellable); the result is committed
as static JSON. Non-determinism is acceptable there because the output is approved once
(the NYT Connections model — editorial curation, not live generation).

## Components

### 1. Content: `dailies.json` (static, in repo)

```json
{
  "2026-07-21": { "sworb": "ocean", "clues": ["tide", "coral", "wave", "reef", "salt"] }
}
```

- ~30 days authored ahead, committed. Identical for everyone; no network.
- Clue words: lowercase, in `dictionary.txt`, spellable on a sworble grid. Length is the
  primary difficulty lever — a day may be all-4-letter (gentle) or mix in a 6–7 letter word
  (harder). An optional `"difficulty"` tag per day is allowed.
- The answer is visible in the JSON — acceptable for a prototype (Wordle shipped this way
  for years). Hash/obfuscate later if it matters.

### 2. Board seeding + persistent clues (the real engineering risk, build first)

The day's 5 clue words must be **findable throughout the run**, not just at the start —
sworble is a falling-tile game, so this has two parts.

**(a) Opening-board placement.** Board is 5×6 = 30 cells, 8-directional (diagonal)
adjacency. Placing 5 words of ~4–6 letters (~25 letters) is a loose pack. Algorithm:

- For each clue word, lay it as a self-avoiding path: seeded start cell, then walk to a
  seeded unused neighbor per letter, backtracking on a dead end.
- Keep the 5 words on disjoint cells for the prototype (no letter-sharing to reason
  about); fill the remaining ~5 cells from the existing seeded bag with vowel/consonant
  balancing.
- **Verify with `sworble-solver.js`** that all 5 are findable under real game adjacency.
- On failure, reseed deterministically (`seed' = hash(seed, attempt)`) and retry — every
  player runs the identical retry and lands the identical board. Runs in ms; effectively
  never fails at this density.

**(b) Persistence across drops (confirmed choice).** All 5 clues stay findable for the
whole run. When a board mutation (a clear + drop) makes an unfound clue word unreachable,
the engine **injects its missing letters into the upcoming drop queue** so the word
becomes reachable again within a few rows. Re-verify findability with the solver after each
mutation.

- **Determinism model change:** the drop queue moves from a static pre-dealt array to a
  deterministic *function of the move sequence* — "same moves → same injected re-drops →
  same board." Fairness holds (identical play yields identical boards) and server
  replay-verification still works (replay the moves). This is a NEW determinism surface;
  pinned tests (`tests/sworble-core.test.js` style) must cover the injection, not just the
  opening deal.
- Scope discipline for the prototype: the injection only needs to *restore reachability*
  (get the missing letters back within N drops), not place them optimally. Don't gold-plate.

This is the highest-risk, highest-complexity piece and is built and verified before any
scoring/UI work — an unreachable clue breaks the day for everyone.

### 2b. Difficulty is a separate, deterministic dial

Findability is guaranteed by construction; how *buried* a clue is, is tunable — so
"findable but not easy" is the whole point, and the finding is the challenge:

- **Word length (the AI lever):** all-4-letter clue sets = a gentle day; a 6–7 letter
  clue rewards sharper players. Authored per day in `dailies.json`, free.
- **Path tortuosity:** the placement RNG can bias toward twistier self-avoiding paths on
  harder days (a straight line is obvious; a back-tracking snake is not).
- **Decoy fill:** surrounding letters can be chosen to create near-miss paths that
  camouflage the real one.

All deterministic from the day seed. Difficulty tiers can be tagged in the content and/or
derived from clue-word lengths.

### 3. `sworble-daily.js` (new pure module, TDD)

Pure, unit-tested, same house style as core/status/run/net. Responsibilities:

- Parse/validate a `dailies.json` entry for a given day (shape + word sanity → null on bad
  data, game falls back to a plain daily with no sworb).
- `isClue(word, entry)` — membership check driving the glow/bonus.
- `guessReward(cluesFound, total)` — the inverse-scaling bonus (tiers: 0 clues = max …
  all found = min; exact numbers are tuning constants).
- `checkGuess(input, entry)` — normalize + compare against the sworb.
- Compute sworb status from stored state (clues found, guesses used, solved).

### 4. Scoring + state

- Word-commit path: if `isClue`, apply +50% bonus, mark found (extends the existing
  `sworble_found_<day>` tracking), tick the counter.
- New store keys (registered in `sworble-store.js`): a per-day sworb-state blob —
  `{ guesses_used, solved, correct, bonus_awarded }` — keyed like the other per-day
  prefixes. Locked once solved or guesses exhausted.
- The **daily-status selector (`sworble-status.js`) gains sworb status** so home, in-game,
  and result surfaces read clues-found / guesses-left / solved / bonus from ONE place
  (the same rule that fixed the earlier display bugs).

### 5. Surfaces

- **Home:** clue progress (X/5) + a "guess the sworb" entry when guesses remain; once
  solved, reveal the sworb and the earned bonus.
- **In-game:** clue glow on found clue words (distinct aura/outline, not a tile-color
  change), the X/5 counter, and a guess entry point.
- **Result recap:** the sworb reveal + the bonus earned, alongside the existing seven.

### 6. Backend seam (build-better-later)

- `dailies.json` → `GET /sworble/v1/daily/?date=…` with no game-code change (same shape).
- Sworb guess results ride the existing submit/queue path (`sworble-net.js`) when a backend
  exists; local-only until then.
- Guess-scaling and clue bonuses stay client-side (they're deterministic from board +
  content), so the server can replay-verify them exactly like the seven.

## Out of scope (prototype)

- Broader/semantic glow set (only the 5).
- Answer obfuscation.
- Any backend endpoint (static JSON only).
- Leaderboard integration of the sworb bonus (it flows into the existing score; a dedicated
  sworb-streak or solve-rate board is a later idea).

## Build order (highest risk first)

1. **Board seeding + persistent-clue engine**, with pinned determinism tests covering both
   the opening placement AND the move-driven re-injection. This is the make-or-break piece;
   verify it in isolation before building anything on top.
2. `sworble-daily.js` pure module + tests (content parse, isClue, guessReward, checkGuess).
3. Scoring/state wiring (+50% clue bonus, sworb state keys) + selector integration.
4. Surfaces (in-game glow/counter/guess, home, result).
5. Author ~30 days of `dailies.json` content, mixing difficulty via clue-word length.
6. Browser-verify the full loop; commit.
