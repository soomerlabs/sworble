'use strict';
const assert = require('assert');
const D = require('../sworble-daily.js');
const dailies = { '2026-07-21': { sworb: 'ocean', clues: ['tide', 'coral', 'wave', 'reef', 'salt'] } };

const e = D.parseEntry(dailies, '2026-07-21');
assert.deepStrictEqual(e, { sworb: 'ocean', clues: ['tide', 'coral', 'wave', 'reef', 'salt'] });
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
console.log('sworble-daily: all passed');
