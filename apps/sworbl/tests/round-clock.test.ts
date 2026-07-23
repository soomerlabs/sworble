// The round clock, headless: pause/resume accounting, fuel grants + the cap,
// snapshot round-trips — the math that used to live untestable inside play.tsx.
import assert from 'assert';
import {
  mkClock, clockStart, clockPause, clockElapsedMs, clockEffSecs, clockRemaining, clockGrant,
} from '../src/game/round-clock';

const T = { baseSecs: 180, capSecs: 420 };
let now = 1_000_000;

// fresh clock: full base remaining, not running
let c = mkClock();
assert.strictEqual(clockRemaining(c, now, T), 180, 'fresh clock shows the full base');
assert.strictEqual(clockElapsedMs(c, now), 0, 'nothing elapsed while idle');

// start → time flows; pause → it stops; idle gap costs nothing
c = clockStart(c, now);
now += 30_000;
assert.strictEqual(clockRemaining(c, now, T), 150, '30s live → 150 left');
c = clockPause(c, now);
now += 999_999; // a long pause
assert.strictEqual(clockElapsedMs(c, now), 30_000, 'paused time costs nothing');
c = clockPause(c, now);
assert.strictEqual(clockElapsedMs(c, now), 30_000, 'double-pause is a no-op');

// resume continues the same account
c = clockStart(c, now);
now += 10_000;
assert.strictEqual(clockRemaining(c, now, T), 140, 'resume continues: 40s spent total');

// fuel: a 5-letter clue word grants 9s + 20s
let g = clockGrant(c, { len: 5, isClue: true }, T);
c = g.clock;
assert.strictEqual(g.grantMs, 29_000, '5-letter clue = 9s + 20s bonus');
assert.strictEqual(clockRemaining(c, now, T), 169, 'grant lands on the display');

// the cap: pump grants until the Seven, then nothing more
for (let i = 0; i < 40; i++) c = clockGrant(c, { len: 7, isClue: true }, T).clock;
assert.strictEqual(clockEffSecs(c, T), 420, 'base + earned hard-capped at the Seven');
assert.strictEqual(clockGrant(c, { len: 7, isClue: true }, T).grantMs, 0, 'at the cap, grants are zero');

// snapshot round-trip: resume rebuilds the same account
const snap = { boardElapsedMs: clockElapsedMs(c, now), earnedMs: c.earnedMs };
const restored = mkClock(snap);
assert.strictEqual(
  clockRemaining(restored, now, T),
  clockRemaining(clockPause(c, now), now, T),
  'a restored clock reads identically to the paused original'
);

console.log('round-clock: pause/resume/fuel/cap/snapshot accounting all pinned');
