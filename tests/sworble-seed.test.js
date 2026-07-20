// tests/sworble-seed.test.js
'use strict';
const assert = require('assert');
const Seed = require('../sworble-seed.js');
const Core = require('../sworble-core.js');

function allCells(cols, rows) { const a = []; for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) a.push({ r, c }); return a; }
function adjacent(a, b) { return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)) === 1; }

// stampWord lays a connected self-avoiding path spelling the word
{
  const rng = Core.mulberry32(42);
  const path = Seed.stampWord(allCells(5, 6), { word: 'coral', rng });
  assert.ok(path, 'coral fits on a 5x6 grid');
  assert.strictEqual(path.map(p => p.letter).join(''), 'coral');
  assert.strictEqual(path.length, 5);
  for (let i = 1; i < path.length; i++) assert.ok(adjacent(path[i - 1], path[i]), 'each step is 8-adjacent');
  const seen = new Set(path.map(p => p.r + ',' + p.c));
  assert.strictEqual(seen.size, 5, 'no cell reused');
}
// deterministic: same rng seed -> identical path
{
  const p1 = Seed.stampWord(allCells(5, 6), { word: 'coral', rng: Core.mulberry32(42) });
  const p2 = Seed.stampWord(allCells(5, 6), { word: 'coral', rng: Core.mulberry32(42) });
  assert.deepStrictEqual(p1, p2, 'same seed -> same stamp');
}
// avoid: never touches reserved cells
{
  const avoid = new Set(['0,0', '1,0', '2,0', '3,0', '4,0', '5,0']); // reserve column 0
  const path = Seed.stampWord(allCells(5, 6), { word: 'tide', rng: Core.mulberry32(7), avoid });
  assert.ok(path, 'tide still fits avoiding column 0');
  assert.ok(path.every(p => !avoid.has(p.r + ',' + p.c)), 'avoided cells untouched');
}
// impossible: word longer than free cells -> null
{
  const only3 = [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }];
  assert.strictEqual(Seed.stampWord(only3, { word: 'coral', rng: Core.mulberry32(1) }), null);
}
console.log('sworble-seed: stampWord passed');

// seedClueLetters places multiple clues on disjoint cells
{
  const out = Seed.seedClueLetters({ clues: ['tide', 'coral', 'wave', 'reef', 'salt'], cols: 5, rows: 6, rng: Core.mulberry32(Core.hashSeed('2026-07-21')) });
  assert.ok(out, '5 short clues fit on 5x6');
  const occupied = Object.keys(out.letters);
  const wordLen = 'tide'.length + 'coral'.length + 'wave'.length + 'reef'.length + 'salt'.length;
  assert.strictEqual(occupied.length, wordLen, 'clues occupy disjoint cells (no overlap)');
  assert.strictEqual(new Set(occupied).size, occupied.length, 'no cell shared between clues');
  for (const w of ['tide', 'coral', 'wave', 'reef', 'salt']) {
    assert.strictEqual(out.cluePaths[w].map(p => out.letters[p.r + ',' + p.c]).join(''), w, w + ' letters land on its path');
  }
  // deterministic
  const out2 = Seed.seedClueLetters({ clues: ['tide', 'coral', 'wave', 'reef', 'salt'], cols: 5, rows: 6, rng: Core.mulberry32(Core.hashSeed('2026-07-21')) });
  assert.deepStrictEqual(out.cluePaths, out2.cluePaths, 'same seed -> same placement');
  // over-packed -> null (six 5-letter words = 30 cells, no room for disjoint self-avoiding paths in practice)
  const tooMany = Seed.seedClueLetters({ clues: ['aaaaa','bbbbb','ccccc','ddddd','eeeee','fffff','ggggg'], cols: 5, rows: 6, rng: Core.mulberry32(1) });
  assert.strictEqual(tooMany, null, 'impossible pack -> null so caller reseeds/rejects');
}
console.log('sworble-seed: seedClueLetters passed');

// reseedBroken: re-stamp unfindable clues
{
  // 5x6 grid, all 'x' except a broken clue. Every clue is "unfindable" per the stub predicate,
  // so reseedBroken must stamp each requested word somewhere and report the letter changes.
  const tiles = [];
  for (let c = 0; c < 5; c++) for (let r = 0; r < 6; r++) tiles.push({ row: r, col: c, letter: 'x' });
  const changes = Seed.reseedBroken({
    tiles, unfound: ['wave'], isFindable: () => false, rng: Core.mulberry32(3), reserve: new Set(),
  });
  assert.strictEqual(changes.length, 4, 'wave (4 letters) re-stamped');
  // applying the changes makes wave spell out on a connected path
  const by = {}; changes.forEach(ch => { by[ch.r + ',' + ch.c] = ch.letter; });
  assert.strictEqual(changes.map(c => c.letter).join(''), 'wave');
  for (let i = 1; i < changes.length; i++) assert.ok(Math.max(Math.abs(changes[i-1].r-changes[i].r), Math.abs(changes[i-1].c-changes[i].c)) === 1, 'connected');
  // nothing broken -> no changes
  assert.deepStrictEqual(Seed.reseedBroken({ tiles, unfound: ['wave'], isFindable: () => true, rng: Core.mulberry32(3), reserve: new Set() }), []);
}
console.log('sworble-seed: reseedBroken passed');
