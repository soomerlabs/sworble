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

## GHOST DUELS (owner-approved 2026-07-23 — replaces "practice" as the
## third mode; same seeds, framed as "beat someone")
- **Pseudo head-to-head**: the server picks an OPPONENT'S RECORDED RUN on
  a featured seed (skill-adjacent: within ~±30% of your average). You play
  the same 3-minute board; their score climbs beside yours as a GHOST on
  a race bar, word by word. Buzzer → W/L + their best words vs yours.
  Feels live, needs no lobbies, works at any player count and any hour —
  deliberately better than real-time PvP for a small base (empty lobbies
  kill features). Real-time rooms stay a POSSIBLE future layer.
- **Global leaderboard PER SEED** stays ("who owns board s-0042") — solo
  climbing the seed board remains a valid way to play.
- Seeded deterministic boards, no archetype, no sworb/finale; score =
  word points (submit-score practice policy: keep-best per seed, delta 0).
- Server additions beyond schema v4: practice_scores gains words jsonb
  (+ optional per-word timestamps later — ghosts then replay EXACTLY);
  a pick-opponent edge function; a duel W/L record per player.
- Client: ghost race bar during the round (shared-value pair, cheap),
  duel result screen, duels entry on home. Even without timestamps,
  pacing recorded words across the 3:00 reads convincingly live.
- **DIRECT CHALLENGES (owner 2026-07-23)**: duel a SPECIFIC user — both
  consent, the server assigns a VIRGIN seed neither has seen; each plays
  on their own schedule; first finisher becomes the second's ghost;
  resolves to W/L for both. Identity via USERNAME — UNIQUE as of schema
  v5 (owner: "username is what games do"; friend codes are OUT). Rematch button =
  a de-facto series across fresh boards; formal best-of-N later.
  Server: challenges table (challenger, opponent, seed, per-side
  score/words, status, 48h expiry) + accept/decline; in-app inbox chip
  v1, push notifications later. Same submit-score validation path.

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

## GROUPS / LEAGUES (owner 2026-07-23: "3 or 4, 10, 20 people... own
## leaderboard, public or private") — generalizes duels (1v1 = group of 2)
- groups table (name unique-ish, PUBLIC browsable / PRIVATE by invite —
  join via group name or member username) + group_members join table.
- A group leaderboard is a FILTER over existing validated data — no new
  scoring paths: the group daily board (today, members only), group hard
  board, group per-seed boards. Same submit-score gate everywhere.
- Group seed events: the group plays one virgin seed; ghost race vs the
  group's current leader instead of a random stranger.
- Build after duels core (~2-3 extra sessions — tables, RLS, join/browse
  UI, filtered views).

## GUESS UX TARGET (owner 2026-07-23): THE HERO IS THE INPUT
- Tap the dashed word-of-the-day on home → the hero tiles become LIVE
  guess slots in place; the content below BLUR-REPLACES into the
  keyboard (progressive blur + crossfade, the parked-frost idiom).
- Wordle feedback colors land ON THE HERO and PERSIST as the day's
  intel (needs guess rows/colors persisted day-level, not run-level).
- Shipped now: the hero is tappable (opens the sheet guess) + a
  "tap the word to guess · N left" caption replaces the pill.

## CLIENT MODEL (day state v2)
- Day: `{ mode, roundsPlayed, bestRound, found[], sworb{guessesUsed,
  solved}, bestWords }`; day score derives: bestRound + solveBonus.
- Round end (regular): summary → home; finale is DECOUPLED — a "guess"
  action on home (and offered post-round) while guesses remain.
- Home in-progress face: rounds played, clue bank progress, best round,
  GUESS button, next-round entry through the same PLAY door.
- Streak/share/stats read the derived day score; share card gains mode.

## LIVE TUTORIAL (owner 2026-07-23, queued post-tester-wave)
A GUIDED FIRST ROUND, not a slide deck: scripted mini-board walking the
finger through the verbs — trace a word, watch the flight to the stepper,
catch a planted clue, feel the clock, one gimme guess — each step gated
on DOING it (the trace-to-play door proved teach-by-doing). Tester
confusion points become the curriculum.

## BUILD ORDER
1. schema-v4.sql + submit-score v2 (server first — old clients keep
   working through the transition).
2. Client regular-replay loop (persist v2, play-sheet round loop,
   decoupled guess, home in-progress face). The big one.
3. Hard mode (mode-choice moment + lock; mostly flags on #2).
4. Ghost duels (seed boards + ghost race bar + pick-opponent function +
   per-seed boards/featured list). ~3-4 sessions.
