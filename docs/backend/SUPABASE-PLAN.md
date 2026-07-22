# sworble → Supabase readiness audit + plan

**Status:** plan / not started. Docs-only. Owner intent: once the game is solid, use
Supabase for **auth** (anonymous-first), **leaderboards**, **profile**, and **app-settings
sync** — "a real app people can compete on."

> ⚠️ **Read the blocking concern (§0) first.** There is already a committed backend contract
> (`docs/SOOMER_BACKEND_CONTRACT.md`) targeting a Soomer/Django backend. This plan describes
> Supabase as the concrete backend that *fulfils* that contract; it does not silently replace
> it. Pick one before any schema work — building both is wasted effort.

---

## 0. Blocking concern — reconcile with the existing contract FIRST

`docs/SOOMER_BACKEND_CONTRACT.md` already specifies:

- A **Soomer/Django** app (`sworble/`, tenant schema, `PublicRequestMixin`) as the server.
- A header-only anon identity: a per-device `player_id` UUID in `X-Soomer-Application-ID`
  context, **no JWT** for v1, with a later `/sworble/v1/player/claim/` upgrade path.
- Paths `/sworble/v1/leaderboard/` + `/sworble/v1/leaderboard/submit/`, snake_case,
  trailing-slash — and the web client (`sworble-net.js` → `SoomerNet`) **deliberately mirrors
  the KMP `soomer-sdk`** so iOS/Android reuse the same contract.

Supabase is architecturally divergent from that on two axes:

| Axis | Soomer contract (today) | Supabase |
|---|---|---|
| Identity | device `player_id` UUID in a header, no auth | GoTrue **JWT**; `signInAnonymously` mints a real `auth.users` row |
| API surface | hand-built `/sworble/v1/*` REST | PostgREST (`/rest/v1/<table>`) + RPC + GoTrue `/auth/v1/*` |
| Cross-client | one KMP SDK all clients mirror | supabase-js / PostgREST per client |

**Decision required (owner):** does Supabase **replace** the Soomer/Django backend, or does
Soomer-api stay the backend of record and Supabase is not adopted? This plan assumes
*replace*. If Soomer-api stays, most of §1–§3 is moot and the existing contract already
covers it. **Do not build both.** Everything below is written so that even under "replace",
the client's `sworble-net.js` outbox/retry/typed-error machinery survives intact (§3) — that
work is not wasted either way.

---

## 1. What survives contact with Supabase

The existing client is in unusually good shape for a backend swap. Audit of `sworble-net.js`:

**Survives as-is (high value, keep):**

- **The durable outbox.** `enqueue`/`readQueue`/`writeQueue`/`flushQueue` — one entry per
  `(date, mode)`, newest-wins, hard-capped at 14, drains on boot/tab-visible/pre-fetch. This
  is exactly the offline write-queue Supabase writes need. **Zero changes to the queue shape.**
- **`SoomerNet.fetchJSON` network semantics.** 30s timeout via `AbortController`, 3× exponential
  backoff on 5xx/408/429/network, typed `{ kind }` errors, no-retry on plain 4xx. PostgREST and
  GoTrue return standard HTTP status codes, so this transport layer works against Supabase
  endpoints untouched — only the base URL and headers change.
- **The degrade-to-local contract.** Unconfigured (`appId: ''`) → everything returns
  `null`/`false` and the game runs fully local on the seeded stub. Same behaviour maps to
  "no Supabase URL/anon key configured."
- **`validateBoard` strict parsing.** Remote payload → local stub shape, `null` on any
  structural surprise. Reused verbatim against the leaderboard **view/RPC** response (we shape
  the view to emit `display_name`/`score`, or add a `count`/`me` wrapper — see §1 schema).

**Needs a thin adapter layer (not a rewrite):**

- **Headers.** Today: `X-Soomer-Application-ID` + `X-Soomer-Application-Version`. Supabase
  wants `apikey: <anon key>` + `Authorization: Bearer <jwt>`. This is a header-map swap inside
  `fetchJSON` (or a `SupabaseNet` sibling to `SoomerNet` that reuses the same retry loop).
- **Paths.** `/sworble/v1/leaderboard/submit/` → `POST /rest/v1/daily_results` (upsert via
  `Prefer: resolution=merge-duplicates`). `/sworble/v1/leaderboard/?date=…` →
  `GET /rest/v1/rpc/leaderboard_for_day?...` or a view select. `SworbleApi.postSubmit` and
  `fetchBoard` are the only two functions that name paths — contained blast radius.
- **Auth token lifecycle.** New concern Supabase introduces: a GoTrue access token that
  expires (~1h) and needs refresh. Add a tiny token manager (store `access_token` +
  `refresh_token`, refresh on 401). Anonymous sessions are long-lived; this is ~40 lines.

**Verdict:** ~80% of `sworble-net.js` survives. The outbox, retry, timeout, typed errors, and
local-degrade contract are all directly reusable. The work is a header/path/token adapter, not
a rewrite.

### Device-local persistence today (`sworble-store.js` key map) → server split

| Key | What it holds | Server-backed? |
|---|---|---|
| `sworble_player_id` | stable per-device UUID | **Becomes** the anon `auth.users.id` link (or a `profiles.device_id` claim) |
| `sworble_name` | display name | **profiles.display_name** (display only, not identity) |
| `sworble_best` | all-time best score | **profiles** (derivable, but cache) |
| `sworble_since` | first-seen timestamp | **profiles.created_at** |
| `sworble_bestword` / `sworble_words_total` | lifetime stats | **profiles** (aggregate) |
| `sworble_daily_<day>` | that day's best score | **daily_results.score** |
| `sworble_seven_<day>` | `{score, words:[{word,pts}]}` | **daily_results.seven** (jsonb) — proof-of-play |
| `sworble_lb_me_<board>` | local leaderboard me-row | superseded by server `me` in the board read |
| `sworble_sworb_<day>` | `{guessesUsed, solved, correct, bonus, solveTier}` | **daily_results.solved / guesses_used / solve_tier** |
| `sworble_found_<day>` | clues found (theme words) | **daily_results.clues_found** (jsonb/int) |
| `sworble_opts` | app settings | **settings** table (sync) |
| streaks | *derived* from `sworble_daily_*` history | **derived server-side** from `daily_results` (see §1 view) |
| `sworble_run_<day>` | live mid-run snapshot | **stays local** (ephemeral, per-device resume) |
| `sworble_done_<day>` / `sworble_att_<day>` / `sworble_time_<day>` | day-run state | **stays local** (day mechanics); `time` may ride the submit for plausibility only |
| `sworble_targets_*` / `sworble_theme_*` / `sworble_hint_tokens_*` | realized board / aids | **stays local** (recomputable from the seed) |
| `worddrop_muted` / `sworble_audio_claim` | device audio prefs | **stays local** |
| `sworble_pending_submits` | the outbox | **stays local** (it *is* the offline queue) |

Rule of thumb: **scores, profile, settings, and the sworb solve fields go server-side; run
snapshots, day mechanics, realized-board state, and device prefs stay local** (all
recomputable from the deterministic seed, so there's nothing worth syncing).

### Known gaps already logged (carry into §7)

- **`submitScore` carries no `solved` flag.** `SworbleStatus.rankFor` already ranks
  *solved-first, score-second* locally (and `lbStub` seeds a `solved` bool per bot), but the
  wire payload (`{date, mode, player_id, display_name, score, seven}`) omits it — so
  solved-first ranking is **impossible server-side today**. Highest-priority pre-backend fix.
- **Stub scores are legacy-scale.** `lbStub` mints `1200 + rnd^1.7 * 3200` (≈1200–4400),
  which predates the current uncapped `cumulativeTotal`. Real scores and stub scores live on
  different scales — a version/epoch stamp on the payload (§7) lets the server keep them apart.

---

## 2. Schema

Postgres, one Supabase project. All money tables keyed to `auth.users.id`.

### `profiles`
```sql
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 2 and 12),
  device_id     uuid,                 -- the migrated sworble_player_id (merge key)
  best_score    int  not null default 0,
  best_word     text,
  words_total   int  not null default 0,
  created_at    timestamptz not null default now(),  -- "player since"
  updated_at    timestamptz not null default now()
);
create index profiles_device_id_idx on profiles (device_id);
```

### `daily_results` (the leaderboard fact table)
```sql
create table daily_results (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  day           date not null,
  mode          text not null default 'puzzle',
  score         int  not null check (score >= 0),
  solved        boolean not null default false,     -- GAP #1 fix: solved-first ranking
  solve_tier    int  not null default 0,            -- higher = bolder/earlier solve
  guesses_used  int  not null default 0 check (guesses_used between 0 and 6),
  clues_found   int  not null default 0,            -- count; keep the word list in `seven`/jsonb if needed
  seven         jsonb not null default '[]',        -- [{word,pts}] proof-of-play
  seconds       int,                                -- active play time (plausibility)
  engine_ver    text,                               -- board-algorithm/version epoch (GAP #2)
  app_ver       text,
  verified      smallint not null default 0,        -- 0 unverified, 1 replay-passed, -1 flagged
  created_at    timestamptz not null default now(),
  unique (user_id, day, mode)
);
create index daily_results_board_idx on daily_results (day, mode, solved desc, score desc);
```
The **share format needs** `solved` (✓/gray), `guesses_used`, `clues_found`, and `seven`
(the colored best-word row) — all captured above so a server-rendered share/OG card or
cross-device share reproduces exactly what the client shows.

### `settings`
```sql
create table settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}',          -- mirrors sworble_opts
  updated_at  timestamptz not null default now()
);
```

**Streaks:** *not a column* — derived from `daily_results` history (a gap in `day` breaks the
streak). Compute in the leaderboard/profile RPC (a `generate_series` + gap walk) or client-side
from the fetched day list, exactly as `index.html`'s local streak walk does today.

### Leaderboard read — a view or RPC (solved-first, score-second, per day)

Prefer an **RPC** so it can take `day`/`mode`/`limit`/`caller` and return the `{entries, me,
count}` shape `validateBoard` already expects (avoids client-side re-sort and a second query
for the caller's own rank):

```sql
create or replace function leaderboard_for_day(p_day date, p_mode text default 'puzzle', p_limit int default 20)
returns table (display_name text, score int, solved boolean, rank bigint)
language sql stable security definer set search_path = public as $$
  select p.display_name, d.score, d.solved,
         rank() over (order by d.solved desc, d.score desc) as rank
  from daily_results d join profiles p on p.id = d.user_id
  where d.day = p_day and d.mode = p_mode and d.verified >= 0
  order by d.solved desc, d.score desc
  limit p_limit;
$$;
```
`security definer` lets it read display_names across users without exposing the `profiles`
table wholesale. The client adds its own `me`/`count` via a second lightweight `rpc` or by
including the caller's row — shape it to `{entries:[{display_name,score,solved}], me, count}`
so `validateBoard` (extended for `solved`) accepts it unchanged.

### RLS policies

```sql
alter table profiles       enable row level security;
alter table daily_results  enable row level security;
alter table settings       enable row level security;

-- profiles: read anyone's display row (needed for the board join is via SECURITY DEFINER,
-- so profiles itself can stay owner-only), write only your own.
create policy profiles_self_rw on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- daily_results: insert/update only your OWN row; reads go through the SECURITY DEFINER RPC,
-- so no broad SELECT policy is needed (or grant a narrow read of your own rows for the UI).
create policy dr_insert_own on daily_results
  for insert with check (auth.uid() = user_id);
create policy dr_update_own on daily_results
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy dr_read_own on daily_results
  for select using (auth.uid() = user_id);

create policy settings_self_rw on settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
Net effect: **anon users can insert/update only their own results and read only the leaderboard
view — never mutate another player's row.** The board is exposed *only* through the definer RPC,
so `profiles`/`daily_results` need no world-readable SELECT.

> Anti-cheat note: RLS stops *impersonation* (you can't write as someone else) but **not
> score inflation** (you can POST any `score` for your own row). That's what §4 is for.

---

## 3. Client integration — supabase-js vs plain fetch

**RECOMMENDATION: plain `fetch` to PostgREST/GoTrue with the anon key + RLS — do NOT add
supabase-js.**

Justification:

- This is a **zero-runtime-dependency app on GitHub Pages** with **no bundler** — modules load
  via `<script src>` in the dc `<helmet>`. `supabase-js` (auth-js + postgrest-js + realtime-js,
  ~40–60 KB min+gz for just auth+postgrest) would force either a CDN script (a new external
  dependency + CSP surface) or introducing a build step this repo has deliberately avoided.
- `sworble-net.js` **already is** a hand-rolled fetch client with retry, timeout, typed errors,
  and a durable outbox — the exact machinery supabase-js would duplicate. The outbox in
  particular has no supabase-js equivalent (its retry is per-call, not a persistent queue).
- The anon key is publishable by design; **RLS does the authorization**, so plain fetch loses
  no safety. The only thing supabase-js gives that we must hand-roll is **token refresh** —
  ~40 lines (store `refresh_token`, POST `/auth/v1/token?grant_type=refresh_token` on 401,
  retry once). Cheap next to a 50 KB dependency + build pipeline.

Concretely: add a `SupabaseNet` sibling to `SoomerNet` (or parametrize `SoomerNet` with a
header-builder) that reuses the identical retry/timeout/typed-error loop; keep `SworbleApi`'s
outbox untouched; repoint `postSubmit`/`fetchBoard` at PostgREST paths.

```
signInAnonymously ─┐
                   ├─▶ GoTrue /auth/v1/*  (JWT + refresh, tiny token manager)
                   │
SworbleApi.submitScore ─▶ [existing outbox] ─▶ POST /rest/v1/daily_results (upsert)
SworbleApi.fetchBoard  ─▶ GET /rest/v1/rpc/leaderboard_for_day
        (same retry/timeout/typed-error transport from SoomerNet.fetchJSON)
```

---

## 4. Anti-cheat ladder

The deterministic engine is the anti-cheat asset. `dailyKey` → `hashSeed` → `mulberry32` →
`shuffledBag` deals an **identical board to every player**, pinned by `tests/sworble-core.test.js`
and `tests/sworble-seed.test.js`. `sworble-solver.js` runs in Node and can enumerate every
findable word on that board. So a server can *recompute anything the client claims*.

| Tier | What it does | Effort | Effectiveness |
|---|---|---|---|
| **v1 — sanity bounds** | Precompute per day: `max_theoretical` = full-solver top-7 (or cumulative) sum on the board; reject/flag `score > max_theoretical`, `guesses_used > 6`, `clues_found > themeWords.length`, negative/NaN. A DB `check` + a nightly per-day cap row. | **Low** (½ day: run the existing solver in a Node edge function once per day, store the cap) | Kills naive score inflation and impossible values. Doesn't catch "plausible but fake." |
| **v2 — plausibility** | Cross-field consistency: `score` vs the `seven` words' recomputed points; `seconds` vs word count (N words in 3s is a bot); `solved`+`solve_tier` vs `guesses_used`+`clues_found` per the `guessReward` tiers in `sworble-daily.js`; rate limits per player/day. | **Medium** (1–2 days: port scoring + reward math to the edge function) | Catches most casual tampering; a determined attacker can still craft a self-consistent payload. |
| **v3 — replay validation** | Edge function rebuilds the day's board from the seed (`sworble-seed.js` in Node), verifies **each `seven` word is actually findable on that board** (`sworble-solver.js`) and in `dictionary.txt`, recomputes the exact score, and replays the sworb guesses against the answer. Accept-then-verify: accept instantly (201), verify async, set `verified = 1`/`-1`, purge/exclude flagged rows from the board. | **Medium-High** (2–4 days: wrap the pure modules in a Deno/Node edge function + a per-submit job) | **Authoritative.** A score survives only if the words genuinely exist on the real board — the client can't fake that. This is the payoff for keeping the engine deterministic and the modules pure/Node-runnable. |

**Log from day one so v2/v3 can run retroactively:** persist `seven` (already), plus the new
`seconds`, `guesses_used`, `clues_found`, `solved`, `solve_tier`, `engine_ver`, `app_ver` on
every `daily_results` row. With those stored, replay validation can be switched on *later* and
re-scored against historical rows — nothing needs re-collection. (`docs/SOOMER_BACKEND_CONTRACT.md`
already frames this as "ship v1 without the verifier; the payload carries everything it needs.")

---

## 5. Rollout phases

| Phase | Scope | Effort |
|---|---|---|
| **0 — Foundation + shadow writes** | Create project; `profiles`/`daily_results`/`settings` + RLS + `leaderboard_for_day` RPC. Wire `signInAnonymously` + token manager. Repoint `SworbleApi.postSubmit` at `daily_results` upsert. **Stub UI stays** — real submits shadow-write while the local stub board still renders. Nothing user-visible changes; data starts accumulating. | **M** |
| **1 — Real leaderboard reads** | Point `fetchBoard` at `leaderboard_for_day`; extend `validateBoard` for `solved`; swap the stub board for the live board when configured (stub remains the offline/unconfigured fallback). Solved-first ranking now real server-side. | **S–M** |
| **2 — Profiles + settings sync** | `profiles` upsert on name change; `settings` sync (`sworble_opts` ⇄ `settings.data`, last-write-wins by `updated_at`). Profile eyebrow ("player since") reads `created_at`. | **M** |
| **3 — Identity linking + social** | `linkIdentity` (email/OAuth) onto the anon user *without losing history* (§2 auth path below); share/OG cards; friends/compare. Turn on v3 replay validation before any prize/ranking stakes. | **L** |

### Auth path (anonymous → linked, no history loss)

1. First launch → `POST /auth/v1/signup` with `signInAnonymously` semantics (GoTrue anonymous
   sign-in). Mints an `auth.users` row; create the matching `profiles` row.
2. **Device-local → server migration (first sign-in merge):** carry the existing
   `sworble_player_id` into `profiles.device_id`. On first authenticated boot, replay the
   local history into `daily_results` via the outbox path (each `sworble_seven_<day>` +
   `sworble_sworb_<day>` becomes one upsert). Streaks/results **merge, not overwrite**:
   `daily_results` upsert keeps the **best** `score` per `(user_id, day, mode)` (server
   `greatest()` on conflict), and `solved` is sticky-true (once solved, stays solved). Local
   streaks recompute from the merged history, so nothing regresses.
3. Later, user links email/OAuth → GoTrue **`linkIdentity`** attaches the new identity to the
   *same* `auth.users.id`. Because every `daily_results.user_id` already points at that id,
   **all history is retained automatically** — no data migration, no re-keying. (This is the
   Supabase-native equivalent of the contract's `/sworble/v1/player/claim/`.)

Merge-conflict edge: if a player linking an account already has a *different* server user with
history (played on two devices anon), reconcile by `device_id` → keep the higher `score` /
sticky `solved` per day, sum `words_total`, take the max streak. Do this in a one-shot
`merge_users(from, into)` RPC run inside the link flow.

---

## 6. Costs / limits (free-tier fit)

Free tier: 500 MB Postgres, ~5 GB egress/mo, **50,000 MAU auth**, 500 K edge-function
invocations/mo.

Row math: **1 `daily_results` row per player per day.** 1,000 DAU → 1,000 rows/day →
~365 K rows/year. A `daily_results` row is well under 1 KB even with `seven` jsonb; 365 K rows
≈ a few hundred MB *only if* `seven` is fat — trim `seven` to top-7 (already the case) and it's
tens of MB/year. **The 500 MB DB is not the constraint at small scale.** Egress for a 20-row
leaderboard read is trivial.

**The one scaling gotcha to watch: anonymous users count toward MAU.** Every
`signInAnonymously` mints a real `auth.users` row and counts as a monthly active user — and
abandoned anon sessions (someone plays once, never returns, clears cookies, replays) accumulate
`auth.users` rows fast. At 50 K MAU free-tier cap, a viral spike of one-and-done anonymous
players can blow the auth ceiling long before the DB fills. **Mitigation:** a scheduled job to
prune orphan anonymous users (anon, no linked identity, no `daily_results` in N days), and
watch the MAU meter, not the DB size, as the leading indicator.

---

## 7. Client changes checklist — do these NOW (pre-backend)

These make the wire payload backend-ready *before* Supabase exists, so data collected from day
one is complete and the outbox never needs a schema migration. **All additive — the outbox
shape stays stable (still one entry per `(date, mode)`, `slice(-14)` cap); old queued entries
must still POST cleanly with the new fields absent.**

**Top 3 (highest value):**

1. **Add `solved` (+ `solve_tier`) to the `submitScore` payload.** Without it, solved-first
   ranking is impossible server-side, even though `SworbleStatus.rankFor` already sorts
   solved-first locally and `lbStub` fakes a `solved` bool. Source is already in hand at the
   call site (`sworble-status.js` `dailyStatus().sworb.rank.{solved,solveTier}`). This is
   **GAP #1** and the single most important change. *(`sworble-net.js` `submitScore` +
   `index.html` `lbSubmit` ~line 4622.)*

2. **Add `guesses_used` + `clues_found` to the payload.** Needed for the share format
   (guess count, clues ✓) *and* for v2 plausibility (`solved`/`tier` must be consistent with
   guesses+clues per `guessReward`). Both are already read in `dailyStatus().sworb`
   (`guessesUsed`, `foundCount`) — thread them into `submitScore(s)`.

3. **Stamp `engine_ver` (+ `app_ver`) and `seconds` on the payload.** `engine_ver` is a
   determinism/scoring epoch tag so replay validation knows which board algorithm to replay and
   the server can separate legacy-scale scores (**GAP #2**) from current ones. `seconds`
   (`TIME_PREFIX`) enables the time-vs-words plausibility check. `app_ver` already exists as
   `SOOMER_APP.appVersion` — just include it in the body.

**Also (do alongside):**

- Extend `validateBoard` in `sworble-net.js` to accept and pass through `solved` on each entry
  (and on `me`) — currently it drops anything but `display_name`/`score`, which would silently
  discard the solved-first signal from a real board.
- Keep `player_id` in the payload as the future `profiles.device_id` merge key (it already
  rides along — don't remove it during the auth swap; it's the anon→account bridge).
- Confirm `display_name` client validation (2–12, A–Z0–9, profanity) matches the
  `profiles.display_name` check constraint so a valid local name never bounces server-side.

---

## Appendix — file map (audit trail)

- `sworble-net.js` — `SoomerNet` transport (retry/timeout/typed errors) + `SworbleApi`
  (endpoints, `validateBoard`, durable outbox). The adapter target for §3.
- `sworble-store.js` — `K` key map; `PLAYER_ID`, `PENDING_SUBMITS`, per-day prefixes (§1 split).
- `sworble-core.js` — `hashSeed`/`mulberry32`/`shuffledBag` determinism contract; scoring
  primitives (`letterVal`/`lenMult`/`streakMult`) the replay validator must mirror.
- `sworble-seed.js` / `sworble-solver.js` — Node-runnable board build + word enumeration; the
  engine that makes v3 replay validation (§4) real.
- `sworble-daily.js` — sworb guess logic + `guessReward` tiers (v2 plausibility source of truth).
- `sworble-status.js` — `rankFor` (already solved-first), `dailyStatus().sworb` (source of the
  `solved`/`solveTier`/`guessesUsed`/`foundCount` fields §7 needs to add to the payload).
- `index.html` — `lbSubmit`/`lbRemote`/`lbStub` (~4600–4670), `netApi`/`player_id` mint
  (~2787), `submitScore` call site (~4622), share text (`__shareResultInner` ~4232).
- `docs/SOOMER_BACKEND_CONTRACT.md` — the pre-existing contract to reconcile with (§0).
