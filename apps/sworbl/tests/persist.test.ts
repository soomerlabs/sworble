// Persistence + boot routing, headless (node → the engine store's in-memory
// fallback backing). Pins: consumed-first ordering, snapshot round-trips,
// result-then-lock, the earnedMs fuel bank, and snapshot rejection rules.
import assert from 'assert';
import engine from '@sworbl/engine';
import {
  loadDay, saveProgress, finishDay, saveRun, loadRun, clearRun, type RunSnap,
} from '../src/game/persist';

const day = '2099-01-01';
const snap = (over: Partial<RunSnap> = {}): RunSnap => ({
  client: 'rn', v: 1, day, phase: 'live',
  tiles: [{ id: 1, letter: 'a', col: 0, row: 5, ci: 0 }],
  queueIdx: 7, score: 120, found: ['rose'], boardElapsedMs: 65000, earnedMs: 18000,
  guessesUsed: 0, rows: [], slots: [], colors: [],
  ...over,
});

// fresh day
let d = loadDay(day);
assert.strictEqual(d.route, 'fresh', 'untouched day routes fresh');

// live kill → resume with the fuel bank intact
saveProgress(day, 120, ['rose']);
saveRun(snap());
d = loadDay(day);
assert.strictEqual(d.route, 'resume', 'live snapshot routes resume');
assert.strictEqual(d.run!.earnedMs, 18000, 'earnedMs (time fuel) survives the round-trip');
assert.strictEqual(d.run!.queueIdx, 7, 'letter-stream position survives');

// finale kill → finale with guesses intact
saveRun(snap({ phase: 'finale', guessesUsed: 2, rows: [{ letters: ['b'], colors: ['gray'] }] }));
d = loadDay(day);
assert.strictEqual(d.route, 'finale', 'finale snapshot routes finale');
assert.strictEqual(d.run!.guessesUsed, 2, 'used guesses survive');

// day ends: result-then-lock, run cleared, consumed beats any stale snapshot
finishDay(day, 550, ['rose', 'stem'], { guessesUsed: 3, solved: true, bonus: 350 }, [
  { word: 'zephyr', pts: 210 }, { word: 'cat', pts: 30 }, { word: 'quartz', pts: 480 },
]);
assert.strictEqual(loadRun(day), null, 'finishDay clears the run snapshot');
saveRun(snap()); // adversarial: a stale snapshot reappears after the lock
d = loadDay(day);
assert.strictEqual(d.route, 'consumed', 'consumed-FIRST: a locked day NEVER resumes (zombie rule)');
assert.strictEqual(d.score, 550, 'final score persisted');
assert.deepStrictEqual(d.sworb, { guessesUsed: 3, solved: true, bonus: 350 }, 'sworb result persisted');
assert.deepStrictEqual(
  d.bestWords.map((w) => w.word),
  ['quartz', 'zephyr', 'cat'],
  'superlatives sorted by points'
);

// snapshot hygiene: wrong day / wrong client / empty tiles are all rejected
clearRun(day);
saveRun(snap({ day: '2099-01-02' }));
assert.strictEqual(loadRun(day), null, 'wrong-day snapshot rejected');
engine.store.setJSON(engine.store.K.RUN_PREFIX + day, { client: 'web', v: 1, day });
assert.strictEqual(loadRun(day), null, 'foreign-client snapshot rejected');
engine.store.setJSON(engine.store.K.RUN_PREFIX + day, snap({ tiles: [] }));
assert.strictEqual(loadRun(day), null, 'tile-less snapshot rejected');

console.log('persist: all round-trip + routing tests passed');
