// tests/sworble-run.test.js — run with: node tests/sworble-run.test.js
// Covers the live-run snapshot layer (sworble-run.js): serialize -> validate round trip,
// transient-field stripping, and every rejection path validateRun guards against.
'use strict';
const assert = require('assert');
const SworbleRun = require('../sworble-run.js');
const SworbleStore = require('../sworble-store.js');

const DAY = '2026-07-20';

function liveTile(extra) {
  return Object.assign({
    id: 7, letter: 'a', row: 5, col: 2, color: 4, boost: 1, mine: true, stackColors: [2, 4],
    // transient/animation fields that must NOT survive a snapshot:
    spawn: true, dead: false, clearing: false, mergeTo: { c: 1, r: 2 }, boostFlash: true,
    stretch: {}, preLit: true, intro: true, introDelay: 0.2, dealDelay: 0.3, armed: true, armedBad: true,
  }, extra || {});
}

function validSrc(extra) {
  return Object.assign({
    day: DAY, cols: 5, rows: 6, tileSeq: 42, queueIdx: 17, juiceNext: 1,
    rngN: { rand: 3, rowRand: 8, mineRand: 2 },
    tiles: [liveTile(), liveTile({ id: 8, letter: 'b', mine: false, boost: 0, stackColors: null })],
    nextRow: [{ letter: 'e', color: 1 }, null, { letter: 't', color: 3 }],
    score: 150, guessesLeft: 12, streak: 2, maxStreak: 4,
    roundWords: [{ word: 'apt', pts: 15, colors: [0, 1, 2], best: false }],
    boardElapsedMs: 65000, bestRun: 1, bestHits: 1, bombRun: 0, mergedOnce: true,
    openingSnapshot: [{ letter: 'a', row: 5, col: 0 }],
  }, extra || {});
}

// --- store contract -------------------------------------------------------
assert.strictEqual(SworbleStore.K.RUN_PREFIX, 'sworble_run_', 'K.RUN_PREFIX must exist for the snapshot key');

// --- serializeRun ---------------------------------------------------------
{
  const src = validSrc();
  const before = JSON.stringify(src);
  const snap = SworbleRun.serializeRun(src);
  assert.ok(snap, 'valid src serializes');
  assert.strictEqual(JSON.stringify(src), before, 'serializeRun must not mutate its input');
  assert.strictEqual(snap.v, SworbleRun.RUN_VERSION);
  assert.strictEqual(snap.day, DAY);
  assert.strictEqual(snap.score, 150);
  assert.strictEqual(snap.guessesLeft, 12);
  assert.strictEqual(snap.queueIdx, 17);
  assert.strictEqual(snap.cols, 5);
  assert.strictEqual(snap.rows, 6);
  assert.strictEqual(SworbleRun.serializeRun(validSrc({ cols: undefined, rows: undefined })).cols, null, 'geometry is optional');
  assert.deepStrictEqual(snap.rngN, { rand: 3, rowRand: 8, mineRand: 2 });
  assert.strictEqual(snap.tiles.length, 2);
  const t = snap.tiles[0];
  assert.deepStrictEqual(t, { id: 7, letter: 'a', row: 5, col: 2, color: 4, boost: 1, mine: true, stackColors: [2, 4] },
    'snapshot tiles keep ONLY durable fields (no animation/transient state)');
  assert.strictEqual(snap.tiles[1].mine, false);
  assert.strictEqual(snap.tiles[1].stackColors, null);
  // JSON-safe end to end
  assert.deepStrictEqual(JSON.parse(JSON.stringify(snap)), snap, 'snapshot must survive a JSON round trip');
}
{
  // dead / clearing tiles are gone from the board — they must not be resurrected
  const snap = SworbleRun.serializeRun(validSrc({ tiles: [liveTile(), liveTile({ id: 9, dead: true }), liveTile({ id: 10, clearing: true })] }));
  assert.strictEqual(snap.tiles.length, 1, 'dead/clearing tiles are dropped from the snapshot');
}
{
  assert.strictEqual(SworbleRun.serializeRun(null), null);
  assert.strictEqual(SworbleRun.serializeRun(validSrc({ day: '' })), null, 'no day -> no snapshot');
  assert.strictEqual(SworbleRun.serializeRun(validSrc({ tiles: [] })), null, 'empty board -> no snapshot');
  assert.strictEqual(SworbleRun.serializeRun(validSrc({ guessesLeft: 0 })), null, 'spent budget -> no snapshot (run is over)');
  assert.strictEqual(SworbleRun.serializeRun(validSrc({ score: NaN })), null, 'non-finite score -> no snapshot');
}

// --- validateRun ----------------------------------------------------------
{
  const snap = SworbleRun.serializeRun(validSrc());
  const back = SworbleRun.validateRun(JSON.parse(JSON.stringify(snap)), DAY);
  assert.ok(back, 'round trip validates');
  assert.strictEqual(back.score, 150);

  assert.strictEqual(SworbleRun.validateRun(null, DAY), null);
  assert.strictEqual(SworbleRun.validateRun({}, DAY), null);
  assert.strictEqual(SworbleRun.validateRun(snap, '2026-07-21'), null, 'yesterday\'s run never restores today');
  assert.strictEqual(SworbleRun.validateRun(Object.assign({}, snap, { v: 0 }), DAY), null, 'version mismatch -> fresh deal');
  assert.strictEqual(SworbleRun.validateRun(Object.assign({}, snap, { tiles: [] }), DAY), null);
  assert.strictEqual(SworbleRun.validateRun(Object.assign({}, snap, { tiles: 'nope' }), DAY), null);
  assert.strictEqual(SworbleRun.validateRun(Object.assign({}, snap, { guessesLeft: 0 }), DAY), null);
  assert.strictEqual(SworbleRun.validateRun(Object.assign({}, snap, { rngN: null }), DAY), null);
  assert.strictEqual(SworbleRun.validateRun(Object.assign({}, snap, { queueIdx: -1 }), DAY), null);
  // corrupt tile inside an otherwise valid snapshot
  const badTile = Object.assign({}, snap, { tiles: [Object.assign({}, snap.tiles[0], { letter: 7 })] });
  assert.strictEqual(SworbleRun.validateRun(badTile, DAY), null, 'malformed tile -> reject whole snapshot');
}

// --- remainingSecs: restoreRun's remaining-round-time arithmetic (pinned — the T1 Critical
// lived exactly here: a reload must resume with REMAINING time, not a fresh full clock, and
// must never go negative) ------------------------------------------------------------------
{
  assert.strictEqual(SworbleRun.remainingSecs(300, 0), 300, 'no time elapsed -> full round');
  assert.strictEqual(SworbleRun.remainingSecs(300, 45000), 255, 'partial: 45s elapsed of 300s');
  assert.strictEqual(SworbleRun.remainingSecs(300, 300000), 0, 'fully expired -> 0, never negative');
  assert.strictEqual(SworbleRun.remainingSecs(300, 999999), 0, 'over-expired -> still 0, never negative');
  assert.strictEqual(SworbleRun.remainingSecs(30, 29900), 1, 'elapsed floors to whole seconds (29.9s -> 29s spent, 1s left)');
  assert.strictEqual(SworbleRun.remainingSecs(300, null), 300, 'null boardElapsedMs -> treated as 0 elapsed');
  assert.strictEqual(SworbleRun.remainingSecs(300, undefined), 300, 'undefined boardElapsedMs -> treated as 0 elapsed');
  assert.strictEqual(SworbleRun.remainingSecs(null, 1000), 0, 'null roundSecs -> treated as 0-length round');
}

console.log('sworble-run: all tests passed');
