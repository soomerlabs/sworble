# Phase-2 binding requirements (from the Phase-0 spike, 2026-07-22)

Full context: `docs/MOBILE-PLAN.md` at the repo root — these were paid for in
spike-hours; violating one reintroduces a bug we already met. The reference
implementation for 1/2/4/5/6 is the spike (`~/Developer/Soomer/sworbl-spike-rn`,
`src/traceWorklet.js` + `src/Board.js` + `src/Tile.js`).

1. TIER-2 INPUT: the trace/gesture hot path runs as UI-thread worklets writing
   shared values; Skia/Reanimated render from them. JS thread hears only
   discrete events (haptics, labels, commits).
2. Heading math consumes GH velocity normalized to px-per-60Hz-frame — the web
   constants assume 60Hz; raw 120Hz deltas halve hlen and gut the feel.
3. NEVER capture big objects in worklet closures — shared-value handles,
   populated after first paint (the 15k-key prefix map froze the board once).
4. Springs fire from reactions on state change, never inside per-frame
   animated-style bodies (per-frame recreation resets spring velocity → mush).
5. Mid-air tiles are not selectable; the hit-grid admits tiles on landing.
6. Commit on onEnd, cleanup on onFinalize (pointercancel parity — a stolen
   touch must never submit a word).
7. Rich visuals platform-split: `.native.tsx` (Skia) / `.tsx`|`.web.tsx`
   (DOM/SVG) — ZERO WASM in the web bundle.
8. Storage behind the injectable store backing: MMKV (native) / localStorage (web).
9. Dev builds (Xcode / `expo run:ios`) — never Expo Go.
10. Judge boot speed on Release builds only.

Engine rule (inherited): game logic lives in `@sworbl/engine` — pure, dual-export,
deterministic (same dailyKey → byte-identical board). The RN app DECIDES nothing
the engine can decide; screens act, modules decide.
