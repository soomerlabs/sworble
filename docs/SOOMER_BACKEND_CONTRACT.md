# sworble ↔ Soomer backend contract

sworble is a Soomer app: one `Application` row on soomer-api, identified everywhere by its
UUID. This web client (and future SDK-based iOS/Android clients) all send that UUID as
`X-Soomer-Application-ID`. This doc is the contract the web client already speaks (see
`sworble-net.js`) and the spec for the new `sworble/` Django app that serves it.

## Provisioning (one-time)

1. Create an `Application` (public schema): slug `sworble`, name "sworble". Note the UUID.
2. Web goes live by setting it in `index.html`:
   `const SOOMER_APP = { appId: '<uuid>', environment: 'prod', appVersion: '0.1.0' }`.
3. When mobile ships, fill `bundle_id` / `apple_id` / `apple_team_id` /
   `android_sha256_fingerprint` on the same row — that's the whole cross-client association.
4. Optional: add the Soomer Sight beacon to index.html with `data-app-id="<uuid>"`.

## Client conventions (already implemented in sworble-net.js)

- Headers on every request: `Content-Type: application/json`,
  `X-Soomer-Application-ID: <uuid>`, `X-Soomer-Application-Version: <semver>`.
- Base URLs: prod `https://api.soomerlabs.com` · dev `https://api.dev.soomerlabs.com` ·
  local `http://localhost:8000` (mirrors soomer-sdk `Environment`).
- snake_case JSON, trailing-slash paths, 30s timeout, 3× exponential retry on
  5xx/408/429/network (mirrors the SDK's Ktor config).
- Anonymous identity: a stable per-device `player_id` UUID (localStorage
  `sworble_player_id`), sent with every submit and board fetch. No JWT required for v1.
- Durable outbox: failed/offline submits queue in localStorage (`sworble_pending_submits`,
  one entry per date+mode, newest wins) and flush on boot / tab-visible / before board reads.

## Endpoints to build (new Django app `sworble/`, tenant schema, `PublicRequestMixin`)

### `GET /sworble/v1/leaderboard/?date=YYYY-MM-DD&mode=puzzle&player_id=<uuid>`

Day's board. Response (client validates strictly; unknown fields ignored):

```json
{
  "entries": [ { "display_name": "OTTO", "score": 4774 } ],
  "me":      { "display_name": "PHIL", "score": 15, "rank": 17 },
  "count": 18
}
```

- `entries`: top N (client shows top 20) sorted desc.
- `me`: the row for `player_id`, or null if none submitted.
- Anon throttles (`anon_burst`/`anon_sustained`) apply.

### `POST /sworble/v1/leaderboard/submit/`

```json
{
  "date": "2026-07-20", "mode": "puzzle",
  "player_id": "<uuid>", "display_name": "PHIL",
  "score": 15,
  "seven": [ { "word": "apt", "pts": 15 } ]
}
```

- Upsert per (application, date, mode, player_id) keeping the best score. 201 on accept.
- `display_name`: server-side profanity/length validation (client pre-validates: 2-12
  chars A-Z0-9, profanity list) — display only, NOT identity.
- **`seven` is proof-of-play.** The daily board is fully deterministic
  (`sworble-core.js` seed pipeline — pinned by tests/sworble-core.test.js), so the server
  can verify asynchronously: rebuild the day's board from the seed, check each word is
  findable (`sworble-solver.js` runs in Node) and in `dictionary.txt`, recompute the
  score. Accept-then-verify: accept instantly, flag/purge failures async. Ship v1 without
  the verifier if needed — the payload already carries everything it will need.

### Later: `POST /sworble/v1/player/claim/` (AuthenticatedRequestMixin)

Body `{ "player_id": "<uuid>" }`, JWT identifies the Soomer account. Binds the anonymous
player_id (and all its scores) to the account — the upgrade path from anonymous play to
accounts/cross-device/mobile without any data migration.

### Later: `GET /sworble/v1/daily/?date=YYYY-MM-DD`

Sworb-of-the-day content (theme word + clue words). Static-JSON-in-repo works first;
this endpoint replaces it when content management moves server-side.

## What the client does while unconfigured (`appId: ''`)

Exactly today's behavior: seeded local bots + the player's own localStorage entry, and
every real submit queues in the outbox — so scores earned before the backend exists get
delivered once it does.
