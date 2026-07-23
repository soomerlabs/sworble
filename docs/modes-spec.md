# sworbl — THE MODES SPEC (owner rulings 2026-07-23, locked)

The one-shot daily becomes three modes sharing one engine, one board
system, one validated submission path.

## REGULAR (the default daily)
- **Replayable rounds**: play the day's 3-minute board as many times as
  you want until midnight (local day roll, same as today).
- **Clues accumulate across rounds** (the day's clue bank is persistent —
  progress toward the word survives every round).
- **Score = your single BEST round + solve bonus.** Replays give more
  clue progress and more shots at a great round; grinding cannot sum
  points (owner ruling #1 — the leaderboard must never be a
  time-spent contest).
- **6 sworb guesses for the WHOLE day** (owner ruling #2), spendable
  whenever: after a round or straight from home. Found every clue and
  still can't get it? womp — no extra guesses.
- **Solving does NOT end the day** (owner ruling #3): keep playing
  rounds to raise the best-round score. The solve bonus locks in.
- **Fresh board per round** (build decision, flagged to owner): each
  round deals from seed `dayKey|r<N>` — same day, same word, same
  remaining-clue set, fresh letter layout. A static board would let
  round 2 be a memorized speedrun and would exhaust the layout's
  findable clues in one round.

## HARD (the once-a-day ritual)
- Today's exact flow: ONE round, then the guess phase immediately.
- **Declared BEFORE the first round of the day** (once you've seen the
  board, hard is meaningless) — a mode-choice moment at first launch of
  the day, locked in. One mode per player per day.
- Own leaderboard, prestige framing. Hard players then blast through
  practice boards (owner: that's the once-a-day audience's volume play).
- Tester phase: client-side lock-in. Launch hardening: server rejects a
  hard submission when prior regular round-activity exists for the day.

## PRACTICE ("storms")
- Endless seeded boards (`s-0001`, …): pure 3-minute word hunt, no
  archetype, no sworb/finale. Score = word points.
- Replayable forever; server keeps your BEST per seed.
- **Leaderboard PER SEED** ("who owns board s-0042") + your best.
- Content is any seed; a curated featured list, validated by the
  dailies-check tooling; solver can auto-pick clue words for hint parity
  (or clue-less pure hunt — decide at build).

## SERVER MODEL (schema v4)
- `submissions` gains `mode text not null default 'hard'` (existing rows
  were one-shot = hard-shaped). PK stays `(player_id, day)` — legal
  because a player is exactly ONE mode per day.
- One-shot law becomes PER-MODE POLICY in submit-score:
  hard → insert once, duplicates = delivered (today's behavior);
  regular → keep-best upsert (update only when new score > stored);
  practice → separate `practice_scores (player_id, seed)` keep-best.
- `alltime_totals` trigger gains an UPDATE arm: `total += new - old`.
- `daily_standings` view filtered/labeled by mode.

## CLIENT MODEL (day state v2)
- Day: `{ mode, roundsPlayed, bestRound, found[], sworb{guessesUsed,
  solved}, bestWords }`; day score derives: bestRound + solveBonus.
- Round end (regular): summary → home; finale is DECOUPLED — a "guess"
  action on home (and offered post-round) while guesses remain.
- Home in-progress face: rounds played, clue bank progress, best round,
  GUESS button, next-round entry through the same PLAY door.
- Streak/share/stats read the derived day score; share card gains mode.

## BUILD ORDER
1. schema-v4.sql + submit-score v2 (server first — old clients keep
   working through the transition).
2. Client regular-replay loop (persist v2, play-sheet round loop,
   decoupled guess, home in-progress face). The big one.
3. Hard mode (mode-choice moment + lock; mostly flags on #2).
4. Practice storms (seed screens, per-seed boards, featured list).
