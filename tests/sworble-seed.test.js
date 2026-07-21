// tests/sworble-seed.test.js
'use strict';
const assert = require('assert');
const Seed = require('../sworble-seed.js');
const Core = require('../sworble-core.js');
const Solver = require('../sworble-solver.js');

function allCells(cols, rows) { const a = []; for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) a.push({ r, c }); return a; }
function adjacent(a, b) { return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)) === 1; }
const expand = (l) => (l === 'q' ? 'qu' : l);
// build a tile grid from a seedClueLetters letters map (non-clue cells filled with a filler)
function tilesFromLetters(letters, cols, rows) { const t = []; let id = 1; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) t.push({ id: id++, row: r, col: c, letter: letters[r + ',' + c] || 'x' }); return t; }

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
// crossing: a pre-placed 'a' can be REUSED by a new word whose path needs an 'a' there —
// stampWord may step onto an occupied cell only when its letter matches (a true crossing).
{
  // CAT across the top row of a 3x3; place BAR whose only 'a' is the shared (0,1)
  const letters = { '0,0': 'c', '0,1': 'a', '0,2': 't' };
  const path = Seed.stampWord(allCells(3, 3), { word: 'bar', rng: Core.mulberry32(5), letters });
  assert.ok(path, 'bar places (may cross the shared a)');
  assert.strictEqual(path.map(p => p.letter).join(''), 'bar');
  // never lands a letter on a cell already holding a DIFFERENT letter (crossings only on match)
  assert.ok(path.every(p => { const k = p.r + ',' + p.c; return letters[k] == null || letters[k] === p.letter; }), 'only crosses on matching letters');
}
// a word that would need a mismatched occupied cell must route around it (or fail), never clobber
{
  // fill the whole middle column with 'z'; 'aaa' cannot use any 'z' cell
  const letters = {};
  for (let r = 0; r < 3; r++) letters['' + r + ',1'] = 'z';
  const path = Seed.stampWord(allCells(3, 3), { word: 'aaa', rng: Core.mulberry32(2), letters });
  assert.ok(path, 'aaa still fits in the two free columns');
  assert.ok(path.every(p => letters[p.r + ',' + p.c] == null), 'never steps onto a mismatched z cell');
}
console.log('sworble-seed: stampWord passed');

// seedClueLetters places multiple clues, CROSSING where letters match (crossword-style)
{
  const out = Seed.seedClueLetters({ clues: ['tide', 'coral', 'wave', 'reef', 'salt'], cols: 5, rows: 6, rng: Core.mulberry32(Core.hashSeed('2026-07-21')) });
  assert.ok(out, '5 short clues fit on 5x6');
  const occupied = Object.keys(out.letters);
  const wordLen = 'tide'.length + 'coral'.length + 'wave'.length + 'reef'.length + 'salt'.length;
  // letter-sharing can only SHRINK the footprint vs disjoint (never grow it); a shared cell
  // holds ONE letter serving both clues.
  assert.ok(occupied.length <= wordLen, 'crossings never occupy MORE than the disjoint sum');
  for (const w of ['tide', 'coral', 'wave', 'reef', 'salt']) {
    assert.strictEqual(out.cluePaths[w].map(p => out.letters[p.r + ',' + p.c]).join(''), w, w + ' letters land on its path');
  }
  // every clue is genuinely FINDABLE on the resulting board (real 8-adjacency, no reuse within a word)
  const tiles = tilesFromLetters(out.letters, 5, 6);
  for (const w of ['tide', 'coral', 'wave', 'reef', 'salt']) {
    assert.ok(Solver.findWord(tiles, { word: w, expand, diag: true }), w + ' is findable on the seeded board');
  }
  // deterministic
  const out2 = Seed.seedClueLetters({ clues: ['tide', 'coral', 'wave', 'reef', 'salt'], cols: 5, rows: 6, rng: Core.mulberry32(Core.hashSeed('2026-07-21')) });
  assert.deepStrictEqual(out.cluePaths, out2.cluePaths, 'same seed -> same placement');
}
// FORCED crossing: two 3-letter words sharing all letters CANNOT fit disjoint on a 2x2 (needs
// 6 cells, only 4 exist) — so a non-null result PROVES the seeder wove them through shared cells.
{
  const out = Seed.seedClueLetters({ clues: ['are', 'ear'], cols: 2, rows: 2, rng: Core.mulberry32(9) });
  assert.ok(out, 'are+ear fit on a 2x2 only by sharing cells (crossword-style)');
  const occupied = Object.keys(out.letters).length;
  assert.ok(occupied < 6, 'shared cells: footprint (' + occupied + ') < 3+3 disjoint');
  assert.strictEqual(out.cluePaths['are'].map(p => out.letters[p.r + ',' + p.c]).join(''), 'are');
  assert.strictEqual(out.cluePaths['ear'].map(p => out.letters[p.r + ',' + p.c]).join(''), 'ear');
  // both still findable under real adjacency
  const tiles = tilesFromLetters(out.letters, 2, 2);
  assert.ok(Solver.findWord(tiles, { word: 'are', expand, diag: true }), 'are findable');
  assert.ok(Solver.findWord(tiles, { word: 'ear', expand, diag: true }), 'ear findable');
}
// still returns null when a set genuinely cannot fit (no shared letters BETWEEN words to cross on,
// and the disjoint footprint exceeds the grid)
{
  const tooMany = Seed.seedClueLetters({ clues: ['aaaaa','bbbbb','ccccc','ddddd','eeeee','fffff','ggggg'], cols: 5, rows: 6, rng: Core.mulberry32(1) });
  assert.strictEqual(tooMany, null, 'impossible pack (no cross letters, 35>30) -> null so caller reseeds/rejects');
}
console.log('sworble-seed: seedClueLetters passed');

// best-effort: packs as many as FIT, skips the rest, never null; realized = what placed
{
  const ocean = ['tide','coral','wave','reef','salt','shore','kelp','surf','foam','brine','pearl','shell'];
  const out = Seed.seedClueLettersBestEffort({ clues: ocean, cols: 5, rows: 6, rng: Core.mulberry32(Core.hashSeed('ocean|be')) });
  assert.ok(out, 'best-effort never returns null');
  const realized = Object.keys(out.cluePaths);
  assert.ok(realized.length >= 5, 'packs a healthy number (>=5) of the pool, got ' + realized.length);
  assert.ok(realized.length <= ocean.length, 'never more than the pool');
  const tiles = tilesFromLetters(out.letters, 5, 6);
  for (const w of realized) {
    assert.strictEqual(out.cluePaths[w].map(p => out.letters[p.r + ',' + p.c]).join(''), w, w + ' spelled on its path');
    assert.ok(Solver.findWord(tiles, { word: w, expand, diag: true }), w + ' findable');
  }
  // deterministic
  const out2 = Seed.seedClueLettersBestEffort({ clues: ocean, cols: 5, rows: 6, rng: Core.mulberry32(Core.hashSeed('ocean|be')) });
  assert.deepStrictEqual(out.cluePaths, out2.cluePaths, 'same seed -> same realized packing');
  // over-target: a pool of 12 packs FEWER than 12 (proves it skips, does not choke)
  assert.ok(realized.length < ocean.length, 'a 12-word pool packs fewer than 12 on 30 cells (skips the overflow)');
}
console.log('sworble-seed: seedClueLettersBestEffort passed');

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
