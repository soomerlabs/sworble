// Persistence + boot routing, headless (node → the engine store's in-memory
// fallback backing). Pins: consumed-first ordering, snapshot round-trips,
// result-then-lock, the earnedMs fuel bank, and snapshot rejection rules.
import assert from 'assert';
import engine from '@sworbl/engine';
import {
  loadDay, saveProgress, finishDay, saveRun, loadRun, clearRun, saveSheetOpen,
  wasSheetOpen, type RunSnap,
  saveFinaleProgress, loadFinaleProgress, clearFinaleProgress, loadDayWords, resetDay,
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

// ---- kill-window fix #1: the spelled-word history rides the snapshot ----
clearRun(day);
saveRun(snap({ words: [{ word: 'quartz', pts: 110 }] }));
assert.deepStrictEqual(
  loadRun(day)?.words,
  [{ word: 'quartz', pts: 110 }],
  'superlatives survive a kill via the snapshot'
);
clearRun(day);
saveRun(snap({}));
assert.deepStrictEqual(loadRun(day)?.words, [], 'legacy snapshots (no words) load as empty history');

// ---- sheet-open restoration flag: day-keyed, stale flags self-clean ----
saveSheetOpen(day);
assert.strictEqual(wasSheetOpen(day), true, 'same-day flag restores the sheet');
assert.strictEqual(wasSheetOpen('2099-01-02'), false, 'next-day flag NEVER restores');
assert.strictEqual(wasSheetOpen(day), false, 'stale flag was discarded at read (self-clean)');
saveSheetOpen(day);
saveSheetOpen(null);
assert.strictEqual(wasSheetOpen(day), false, 'cleared flag stays cleared');

// ---- PARKED FINALE INTEL (the not-yet valve) ----
{
  const d2 = '2099-02-01';
  const prog = {
    rows: [{ letters: ['s', 't', 'o', 'r', 'm'], colors: ['gray', 'yellow', 'gray', 'gray', 'gray'] }],
    slots: ['', 't', '', '', ''],
    colors: [null, 'yellow', null, null, null],
    guessesUsed: 2,
  };
  saveFinaleProgress(d2, prog);
  assert.deepStrictEqual(loadFinaleProgress(d2), prog, 'parked intel round-trips');
  // the spent guesses are LAW even without a completed finale
  assert.strictEqual(loadDay(d2).sworb?.guessesUsed, 2, 'guess counter persists with the park');
  assert.strictEqual(loadDay(d2).sworb?.solved, false, 'parked ≠ solved');
  // a SOLVED day never gets its sworb overwritten by a late park
  engine.store.setJSON('sworbl_sworb_' + d2, { guessesUsed: 3, solved: true, bonus: 320 });
  saveFinaleProgress(d2, { ...prog, guessesUsed: 4 });
  assert.strictEqual(loadDay(d2).sworb?.solved, true, 'solved sworb survives a stray park');
  clearFinaleProgress(d2);
  assert.strictEqual(loadFinaleProgress(d2), null, 'spent intel clears');
  // resetDay wipes the park too
  saveFinaleProgress(d2, prog);
  resetDay(d2);
  assert.strictEqual(loadFinaleProgress(d2), null, 'resetDay clears parked intel');
}
console.log('persist: parked finale intel pinned');

// ---- loadDayWords dedupes on read (the duplicate-key crash class) ----
{
  const d3 = '2099-03-01';
  engine.store.setJSON('sworbl_rn_daywords_' + d3, [
    { word: 'gusty', pts: 100 },
    { word: 'foggy', pts: 80 },
    { word: 'gusty', pts: 140 },
  ]);
  const words = loadDayWords(d3);
  assert.strictEqual(words.length, 2, 'dupes collapse');
  assert.strictEqual(words.find((w) => w.word === 'gusty')?.pts, 140, 'best pts wins');
}
console.log('persist: day-words dedupe pinned');

console.log('persist: all round-trip + routing tests passed');
