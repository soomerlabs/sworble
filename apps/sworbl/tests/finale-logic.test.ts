// The finale caller contract, PINNED (it already bit once, unpinned): on a
// miss, greens lock, yellows persist as hints, grays clear NOW — and the
// resulting shape must chain cleanly into engine.nextSlots for the next guess.
import assert from 'assert';
import engine from '@sworbl/engine';
import { applyGuess } from '../src/game/finale-logic';

const sworb = 'bloom';

// incomplete row → reject, nothing consumed
let out = applyGuess({ slots: ['b', 'r', '', '', ''], rows: [], guessesUsed: 0, sworb, foundCount: 4, clueTotal: 6 });
assert.strictEqual(out.kind, 'reject', 'incomplete row rejected');

// BROOM miss — the permutations-mock case
out = applyGuess({ slots: ['b', 'r', 'o', 'o', 'm'], rows: [], guessesUsed: 0, sworb, foundCount: 4, clueTotal: 6 });
assert.strictEqual(out.kind, 'miss');
if (out.kind === 'miss') {
  assert.deepStrictEqual(out.rows[0].colors, ['green', 'gray', 'green', 'green', 'green'], 'row colored per scoreGuess');
  assert.deepStrictEqual(out.slots, ['b', '', 'o', 'o', 'm'], 'grays clear NOW, greens carry');
  assert.deepStrictEqual(out.colors, ['green', null, 'green', 'green', 'green'], 'gray → null in carried colors');
  assert.strictEqual(out.usedNow, 1);

  // the carried shape must chain into nextSlots: type fills the gap, backspace
  // respects locked greens, and the full row submits to a SOLVE
  const typed = engine.daily.nextSlots({ slots: out.slots, colors: out.colors, ch: 'l', len: 5 })!;
  assert.deepStrictEqual(typed.slots, ['b', 'l', 'o', 'o', 'm'], 'nextSlots fills the cleared gap');
  const back = engine.daily.nextSlots({ slots: typed.slots, colors: typed.colors ?? [], ch: engine.daily.BACKSPACE, len: 5 })!;
  assert.deepStrictEqual(back.slots, ['b', '', 'o', 'o', 'm'], 'backspace removes only the non-green');

  const solve = applyGuess({ slots: ['b', 'l', 'o', 'o', 'm'], rows: out.rows, guessesUsed: out.usedNow, sworb, foundCount: 4, clueTotal: 6 });
  assert.strictEqual(solve.kind, 'solved');
  if (solve.kind === 'solved') {
    assert.strictEqual(solve.usedNow, 2, 'solved on guess 2');
    assert.ok(solve.bonus > 0, 'solve pays the clue-scaled bonus');
    assert.strictEqual(solve.rows.length, 2, 'both rows recorded');
  }
}

// yellow persistence: LOBBY vs BLOOM — yellows carry as hints, then wipe on type-over
out = applyGuess({ slots: ['l', 'o', 'b', 'b', 'y'], rows: [], guessesUsed: 0, sworb, foundCount: 0, clueTotal: 6 });
assert.strictEqual(out.kind, 'miss');
if (out.kind === 'miss') {
  assert.deepStrictEqual(out.rows[0].colors, ['yellow', 'yellow', 'yellow', 'gray', 'gray'], 'dup-B rule');
  assert.deepStrictEqual(out.slots, ['l', 'o', 'b', '', ''], 'yellows carry as hints');
  const typed = engine.daily.nextSlots({ slots: out.slots, colors: out.colors, ch: 'b', len: 5 })!;
  assert.deepStrictEqual(typed.slots, ['b', '', '', '', ''], 'type-over wipes the yellow hints');
}

// six misses → lockout
let rows: { letters: string[]; colors: string[] }[] = [];
let used = 0;
for (let i = 0; i < 6; i++) {
  const o = applyGuess({ slots: ['d', 'r', 'e', 'a', 'd'], rows, guessesUsed: used, sworb, foundCount: 0, clueTotal: 6 });
  if (o.kind === 'miss') {
    rows = o.rows;
    used = o.usedNow;
  } else {
    assert.strictEqual(o.kind, 'lockout', 'sixth miss locks out');
    assert.strictEqual(o.usedNow, 6);
  }
}
assert.strictEqual(used, 5, 'five misses recorded before the lockout guess');

console.log('finale-logic: caller contract pinned (miss carry, nextSlots chain, solve, lockout)');

// ---- swipe decoder ----
import { decodeSwipe } from '../src/game/finale-logic';
{
  const words = ['bloom', 'blooms', 'broom', 'begum', 'blame', 'gloom'];
  // glide b→l→o→m crossing neighbors: doubles collapse, subsequence holds
  const seq = ['b', 'g', 'h', 'j', 'k', 'l', 'o', 'i', 'o', 'k', 'm'];
  assert.strictEqual(
    decodeSwipe({ seq, len: 5, greens: [null, null, null, null, null], words }),
    'bloom',
    'glide decodes bloom (double-o collapsed)'
  );
  // greens constrain: locked g at 0 rejects bloom-shaped candidates
  assert.strictEqual(
    decodeSwipe({ seq: ['g', 'h', 'j', 'k', 'l', 'o', 'i', 'o', 'k', 'm'], len: 5, greens: ['g', null, null, null, null], words }),
    'gloom',
    'greens steer the decode'
  );
  // commons tie-break: same-shaped rivals resolve toward the starter list
  const rivals = ['blast', 'blest'];
  assert.strictEqual(
    decodeSwipe({
      seq: ['b', 'l', 'a', 'e', 's', 't'], len: 5,
      greens: [null, null, null, null, null],
      words: rivals, commons: new Set(['blast']),
    }),
    'blast',
    'commons win ties'
  );
  // nothing plausible → null (no false fills)
  assert.strictEqual(
    decodeSwipe({ seq: ['q', 'x'], len: 5, greens: [null, null, null, null, null], words }),
    null,
    'garbage glide decodes to nothing'
  );
}
console.log('finale-logic: swipe decoder pinned');
