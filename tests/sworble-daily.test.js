'use strict';
const assert = require('assert');
const D = require('../sworble-daily.js');
const dailies = { '2026-07-21': { sworb: 'ocean', clues: ['tide', 'coral', 'wave', 'reef', 'salt'] } };

const e = D.parseEntry(dailies, '2026-07-21');
assert.deepStrictEqual(e, { sworb: 'ocean', themeWords: ['tide', 'coral', 'wave', 'reef', 'salt'] });
assert.strictEqual(D.parseEntry(dailies, '2026-07-22'), null, 'missing day -> null');
assert.strictEqual(D.parseEntry({ '2026-07-21': { sworb: '', clues: [] } }, '2026-07-21'), null, 'empty -> null');
assert.strictEqual(D.parseEntry({ '2026-07-21': { sworb: 'x', clues: 'nope' } }, '2026-07-21'), null, 'bad clues -> null');

assert.strictEqual(D.isClue('TIDE', e), true);
assert.strictEqual(D.isClue('shore', e), false);

assert.strictEqual(D.checkGuess('  Ocean! ', e), true, 'normalized match');
assert.strictEqual(D.checkGuess('sea', e), false);

assert.strictEqual(D.guessReward(0, 5), 500, 'cold read = jackpot');
assert.strictEqual(D.guessReward(2, 5), 350);
assert.strictEqual(D.guessReward(4, 5), 200);
assert.strictEqual(D.guessReward(5, 5), 75, 'all clues found = gimme');

// --- scoreGuess: Wordle per-letter feedback (green/yellow/gray) ---------------------
assert.deepStrictEqual(D.scoreGuess('ocean', 'ocean'), ['green','green','green','green','green'], 'exact = all green');
assert.deepStrictEqual(D.scoreGuess('canoe', 'ocean'), ['yellow','yellow','yellow','yellow','yellow'], 'all present, all misplaced = yellow');
assert.deepStrictEqual(D.scoreGuess('xxxxx', 'ocean'), ['gray','gray','gray','gray','gray'], 'none present = gray');
assert.deepStrictEqual(D.scoreGuess('ocxxx', 'ocean'), ['green','green','gray','gray','gray'], 'prefix right = green, rest gray');
// duplicate-letter handling — answer 'reef' has E at positions 1 and 2:
assert.deepStrictEqual(D.scoreGuess('eeee', 'reef'), ['gray','green','green','gray'], 'both middle Es green; the two extra guess-Es have no answer-E left = gray');
assert.deepStrictEqual(D.scoreGuess('erxx', 'reef'), ['yellow','yellow','gray','gray'], 'E and R both present but misplaced = yellow; X absent = gray');

// --- NEW: theme-word pool (relax 5-clue cap) + back-compat clues ---
{
  // NEW shape: a pool of theme words, no 5-cap
  const pool = { '2026-08-01': { sworb: 'ocean', themeWords: ['tide','coral','wave','reef','salt','shore','kelp','surf','foam','brine','pearl','shell'] } };
  const e = D.parseEntry(pool, '2026-08-01');
  assert.strictEqual(e.sworb, 'ocean');
  assert.strictEqual(e.themeWords.length, 12, 'pool larger than 5 is accepted (cap relaxed)');
  assert.strictEqual(e.themeWords[0], 'tide');
  // BACK-COMPAT: legacy `clues` still parses, surfaced as themeWords
  const legacy = { '2026-08-02': { sworb: 'kitchen', clues: ['oven','fork','pan','dish','spoon'] } };
  const l = D.parseEntry(legacy, '2026-08-02');
  assert.deepStrictEqual(l, { sworb: 'kitchen', themeWords: ['oven','fork','pan','dish','spoon'] });
  // normalization + validation
  assert.deepStrictEqual(D.parseEntry({ x: { sworb: ' Ocean ', themeWords: [' Tide ', 'CORAL'] } }, 'x'), { sworb: 'ocean', themeWords: ['tide','coral'] });
  assert.strictEqual(D.parseEntry({ x: { sworb: 'ocean', themeWords: [] } }, 'x'), null, 'empty pool -> null');
  assert.strictEqual(D.parseEntry({ x: { sworb: 'ocean', themeWords: 'nope' } }, 'x'), null, 'non-array -> null');
  assert.strictEqual(D.parseEntry({ x: { sworb: '', themeWords: ['a'] } }, 'x'), null, 'empty sworb -> null');
  assert.strictEqual(D.parseEntry({ x: { sworb: 'ocean', themeWords: ['tide', 7] } }, 'x'), null, 'non-string entry -> null');
}

console.log('sworble-daily: all passed');
