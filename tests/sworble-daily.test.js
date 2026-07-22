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

// --- NEW: clueFor(word, entry) -> clue|null — a spelled word banks a clue if it STARTS
// WITH the clue (trims/trimmed/trimming -> "trim"; seedy -> "seed"); isClue becomes a thin
// wrapper (!!clueFor(...)); longest matching clue wins when more than one prefixes the word ---
{
  const kitchen = { sworb: 'kitchen', themeWords: ['trim', 'seed', 'seeds', 'oven'] };

  // exact hit
  assert.strictEqual(D.clueFor('trim', kitchen), 'trim', 'exact match returns the clue');
  assert.strictEqual(D.clueFor('TRIM', kitchen), 'trim', 'case-insensitive');

  // extension hits (trims/trimmed/trimming all bank "trim")
  assert.strictEqual(D.clueFor('trims', kitchen), 'trim', 'trims -> trim');
  assert.strictEqual(D.clueFor('trimmed', kitchen), 'trim', 'trimmed -> trim');
  assert.strictEqual(D.clueFor('trimming', kitchen), 'trim', 'trimming -> trim');

  // non-prefix miss: "roster" does NOT start with "rose" (rost vs rose)
  const beach = { sworb: 'beach', themeWords: ['rose'] };
  assert.strictEqual(D.clueFor('roster', beach), null, 'roster does not start with rose -> miss');

  // longest match wins: both "seed" and "seeds" are clues; spelling "seeds" should bank
  // "seeds" (the longer/more specific match), not "seed"
  assert.strictEqual(D.clueFor('seeds', kitchen), 'seeds', 'longest matching clue wins (seeds over seed)');
  assert.strictEqual(D.clueFor('seedy', kitchen), 'seed', 'seedy -> seed (only "seed" prefixes it)');
  assert.strictEqual(D.clueFor('seed', kitchen), 'seed', 'exact "seed" still matches "seed"');

  // null entry / word safety
  assert.strictEqual(D.clueFor('trim', null), null, 'null entry -> null');
  assert.strictEqual(D.clueFor('', kitchen), null, 'empty word -> null');
  assert.strictEqual(D.clueFor(null, kitchen), null, 'null word -> null');

  // isClue is now a thin wrapper around clueFor (back-compat)
  assert.strictEqual(D.isClue('trims', kitchen), true, 'isClue: extension counts as a clue');
  assert.strictEqual(D.isClue('roster', beach), false, 'isClue: non-prefix still a miss');
  assert.strictEqual(D.isClue('TIDE', e), true, 'isClue: still works against the original fixture');
  assert.strictEqual(D.isClue('shore', e), false);
}

// --- bankClue(found, clue) -> found' — the FOUND_PREFIX banking dedup used by
// checkTargetCatch: append a NEWLY-caught clue exactly once, and treat a clue EXTENSION
// (trims/trimmed/trimming all resolve to the same clueFor() match) as the same bank, not a
// second entry. The split-brain glow/bank class of bug has bitten twice — pinning it. ---
{
  const empty = [];
  const first = D.bankClue(empty, 'trim');
  assert.deepStrictEqual(first, ['trim'], 'a fresh clue gets appended');
  assert.notStrictEqual(first, empty, 'never mutates the input array (immutable: returns a new array)');
  assert.deepStrictEqual(empty, [], 'the original found list is untouched');

  const withTrim = ['trim'];
  const dup = D.bankClue(withTrim, 'trim');
  assert.strictEqual(dup, withTrim, 'exact repeat -> same reference back, nothing banked (dedup)');

  // extension-banks-clue: "trims"/"trimmed" all resolve to clueFor's match ("trim") BEFORE
  // reaching bankClue — so a repeat extension is just another bankClue(list, 'trim') call,
  // which must dedupe identically to a repeat exact spell.
  const afterExtension = D.bankClue(withTrim, 'trim'); // caller already resolved "trims" -> "trim" via clueFor
  assert.strictEqual(afterExtension, withTrim, 'extension of an already-banked clue is still a no-op');

  const multi = D.bankClue(['trim', 'seed'], 'oven');
  assert.deepStrictEqual(multi, ['trim', 'seed', 'oven'], 'appends after existing entries, order preserved');

  assert.deepStrictEqual(D.bankClue(null, 'trim'), ['trim'], 'null found list is treated as empty, never throws');
  assert.deepStrictEqual(D.bankClue(['trim'], null), ['trim'], 'falsy clue -> no-op, list unchanged');
  assert.deepStrictEqual(D.bankClue(['trim'], ''), ['trim'], 'empty-string clue -> no-op');
}
console.log('sworble-daily: bankClue passed');

console.log('sworble-daily: all passed');
