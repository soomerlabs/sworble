# Mobile plan — the React Native era (locked 2026-07-22)

DECISION (owner): full RN rebuild, ONE codebase → iOS + Android + web (Expo + react-native-web).
Supersedes the earlier "keep web separate / Capacitor first" advice — rationale: mobile is
certain, the current web shell was scheduled for demolition anyway (Road-to-9 S2/S3), the new
screens are unbuilt (build once, in the final stack), and the real assets all transfer.

## What transfers vs dies
- TRANSFERS 100%: packages/engine (all 9 pure modules + 12 test suites + determinism contract —
  Metro imports them unchanged) · every design decision (specs/mocks/transition matrix/word-light
  rules) · content pipeline + GENERATION-PROMPT · Supabase plan · deploy/versioning discipline.
- DIES (was dying anyway): the 6.3k index.html shell · the dc-runtime black box · the CSS (the
  encoded KNOWLEDGE transfers; the syntax doesn't).

## Phase 0 — THE SPIKE (gate; ~2 days)
Prove the risky 10% before betting the codebase. Scope: the BOARD only —
- 5×6 candy tiles (Reanimated: spawn/clear/fall), swipe-path word tracing (Gesture Handler),
  one storm experiment (RN SVG gradient blobs OR Skia; measure web-export weight),
  expo-haptics on tile-lock (the whole native itch, demonstrated).
- Export the same spike via `expo export --platform web`; open in Safari/Chrome.
SUCCESS CRITERIA (measurable): 60fps tile cascade on owner's iPhone; swipe-trace feels ≤ web
(owner judgment); haptic moment feels GOOD; web export loads < 3s on residential wifi and the
board is playable in-browser; bundle weight understood (Skia WASM cost known if used).
FAIL → revisit (RN-shell-around-WebView remains the fallback; nothing lost but 2 days).

### ✅ SPIKE VERDICT: PASSED (2026-07-22, owner-judged on device)
Built same-day in `~/Developer/Soomer/sworbl-spike-rn` (outside the repo; disposable).
- Engine transferred BYTE-FOR-BYTE (sworble-core.js + words.js unmodified under Metro);
  determinism visibly held — dev server and static web export dealt identical boards+refills.
- Trace: owner verdict "feels good" — after porting the web's FULL tuned system (boardMove +
  backtrack magnet + predictive defer + transit fix + commit-to-select, constants verbatim,
  5/5 headless tests) and then WORKLET-IZING it (tier 2: whole hot path on the UI thread,
  JS only hears haptics/label/commit).
- Haptics: crescendo ramp (Soft→Heavy with chain length, owner-designed live) — the native itch, scratched.
- Storm: Skia matched the web recipe 1:1 (goo blur11 + alpha 30/-14 + feBlend + wrap blur12 +
  haze + radial mask, exact blob geometry/orbits) after plain SVG gradients FAILED the eye test.
- Web export: 381 KB gz JS + 260 KB fonts, NO WASM (SVG storm on web via .native.js split), ~90 ms local load.

PHASE-2 REQUIREMENTS extracted from the spike (binding):
1. TIER-2 INPUT ARCHITECTURE: trace/gesture hot path runs as UI-thread worklets writing shared
   values; Skia/Reanimated render from them; JS thread only receives discrete events. (RN's
   ceiling beats web's single thread — but only on this architecture.)
2. Heading math must consume GH velocity normalized to px-per-60Hz-frame — web constants assume
   60Hz pointer events; raw 120Hz deltas silently halve hlen (this WAS the "feels off").
3. Never capture big objects in worklet closures (15k-key prefix map froze the board at mount —
   pass shared-value handles, populate after first paint).
4. Springs fire from reactions on state CHANGE, never inside per-frame animated-style bodies.
5. Mid-air tiles are not selectable (web rule; grid admits tiles only after landing).
6. Commit on onEnd, cleanup on onFinalize (pointercancel parity — stolen touches must not submit).
7. Platform-split rich visuals via .native.js (Skia) / .js (DOM-CSS or SVG) — zero WASM on web.
8. Storage: MMKV (native) / localStorage (web) behind the injectable store backing.
9. Dev builds via Xcode/`expo run:ios` from day one — Expo Go is SDK-version roulette and can't
   load custom native modules anyway (owner hit this; store Expo Go lagged SDK 57).
10. Judge boot speed only on Release builds (Debug+Metro is worst-case by construction).

## Phase 1 — monorepo + engine extraction (~week)
> STARTED 2026-07-22. DEPLOY-SAFETY AMENDMENT: the frozen web app stays at the REPO ROOT
> (GitHub Pages serves root; moving index.html would break the live URL) — "apps/web" is
> the root, conceptually. packages/engine SEEDED (living copy + tests + index.d.ts;
> root modules are the frozen fossil). apps/sworbl SCAFFOLDED (Expo SDK 57, TS, Router;
> engine imported via workspace, tsc clean, web export verified; PHASE2-REQUIREMENTS.md
> carries the 10 spike rules). Root `npm test` now also runs the engine package suite.
packages/engine (sworble-core/seed/daily/status/flow/run/solver/store/net + tests, moved) ·
apps/web (current game, FROZEN — stays deployed as the public validator during the rebuild) ·
apps/sworbl (Expo, TypeScript, Expo Router). PORT NOTE: sworble-store gains an injectable
storage backing — localStorage (web) / MMKV (native, sync like-for-like). PUSH main first so
the frozen validator is the REAL game, not the pre-pivot one still live.

## Phase 2 — the RN build (~3 weeks, interleaved with Supabase)
Board port first (the spike grows up) → owner's incoming designs land as RN screens
(profile / leaderboard / settings / share+definition card) — built ONCE, in the final stack.
SUPABASE IN PARALLEL: project + schema + RLS + anon auth are dashboard/SQL work (no client
dependency) — set up during Phase 1-2; sworble-net (shared module) wires in as screens land:
shadow-writes first, leaderboard reads when that screen exists. Payload additions (solved,
guesses_used, clues_found, engine_ver) land with the wiring.

## Phase 3 — beta ladder → simultaneous launch
TestFlight + Play internal (haptics validation, friends' leaderboard = first real Supabase
data) → RNW web-at-parity replaces the frozen site when it passes the owner's eye →
PUBLIC LAUNCH: iOS + Android + web, same day, one build stamp.
LAUNCH GATES: content runway ≥30 days + CI runway monitor · anon-auth MAU math checked ·
store assets (icon exists: icon-180) · privacy labels (device-local + anon auth = easy).

## Native dividends (owner is a native iOS engineer)
expo-haptics day one; then via config plugins/native targets: Live Activity (countdown to next
puzzle), lock-screen widget (today solved-state), rich push later. The Swift itch gets scratched
where it counts — in the extras no cross-platform tool does well.
