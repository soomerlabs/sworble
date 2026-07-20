// tests/sworble-core.test.js — run with: node tests/sworble-core.test.js
// ⚠ DETERMINISM CONTRACT, PINNED. mulberry32 + hashSeed + shuffledBag feed the daily
// board seed: every player must deal the IDENTICAL board for a given calendar day.
// These known values are frozen — if a change flips any of them, every daily board,
// par-bot score, and leaderboard comparison silently forks. Never "fix" a failing
// value here without deciding, on purpose, to break the daily contract.
'use strict';
const assert = require('assert');
const C = require('../sworble-core.js');

// --- mulberry32: same seed → same stream, forever ---------------------------------
{
  const r = C.mulberry32(12345);
  assert.strictEqual(r(), 0.9797282677609473);
  assert.strictEqual(r(), 0.3067522644996643);
  assert.strictEqual(r(), 0.484205421525985);
  const r2 = C.mulberry32(12345);
  assert.strictEqual(r2(), 0.9797282677609473, 'independent instances replay the identical stream');
}

// --- hashSeed: stable string → int hash (the day-seed derivation) -----------------
assert.strictEqual(C.hashSeed('2026-07-20'), 1161844537);
assert.strictEqual(C.hashSeed(''), 0);
assert.strictEqual(C.hashSeed('2026-07-20'), C.hashSeed('2026-07-20'));
assert.notStrictEqual(C.hashSeed('2026-07-20'), C.hashSeed('2026-07-21'), 'different days, different boards');

// --- dayKey: LOCAL calendar day, zero-padded --------------------------------------
assert.strictEqual(C.dayKey(new Date(2026, 6, 20)), '2026-07-20');
assert.strictEqual(C.dayKey(new Date(2026, 0, 3)), '2026-01-03');

// --- shuffledBag: seeded Fisher-Yates, quota-preserving ---------------------------
{
  assert.strictEqual(C.shuffledBag('abcde', C.mulberry32(1)).join(''), 'ecbad');
  const shuffled = C.shuffledBag(C.BAG, C.mulberry32(7)).join('');
  assert.strictEqual(shuffled.split('').sort().join(''), C.BAG.split('').sort().join(''), 'a shuffle never creates or loses letters');
}

// --- the actual daily letter queue (seed → queue pipeline, as newGame builds it) --
{
  const seedN = C.hashSeed('2026-07-20');
  const qr = C.mulberry32(seedN ^ 0x51AC1E);
  const q = C.shuffledBag(C.FRIENDLY, qr).concat(C.shuffledBag(C.BAG, qr));
  assert.strictEqual(q.slice(0, 20).join(''), 'seatigenpndolnctusah', 'the 2026-07-20 opening deal is frozen for every player');
}

// --- letter model invariants ------------------------------------------------------
assert.strictEqual(C.BAG.length, 93);
assert.strictEqual(C.FRIENDLY.length, 35);
assert.strictEqual(C.VOWELS, 'aaeeeeiiou');
assert.strictEqual(C.expandLetter('q'), 'qu', "the Q tile IS 'Qu'");
assert.strictEqual(C.expandLetter('a'), 'a');
assert.strictEqual(C.dispLetter('q'), 'Qu');
assert.strictEqual(C.dispLetter('x'), 'X');

// --- scoring primitives (the shipped curve) ---------------------------------------
assert.strictEqual(C.letterVal('q'), 10);
assert.strictEqual(C.letterVal('e'), 1);
assert.strictEqual(C.letterVal('e', 1), 2, 'a stacked twin doubles the tile');
assert.strictEqual(C.lenMult(3), 1);
assert.strictEqual(C.lenMult(4), 1.5);
assert.strictEqual(C.lenMult(5), 2.5);
assert.strictEqual(C.lenMult(6), 4);
assert.strictEqual(C.lenMult(7), 6);
assert.strictEqual(C.lenMult(9), 6, '7+ caps the curve');
assert.strictEqual(C.streakMult(0), 1);
assert.strictEqual(C.streakMult(3), 1.5);
assert.strictEqual(C.streakMult(6), 2);
assert.strictEqual(C.streakMult(30), 2, 'streak multiplier caps at 2x');

console.log('sworble-core: all tests passed');
