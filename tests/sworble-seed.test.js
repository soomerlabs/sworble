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
