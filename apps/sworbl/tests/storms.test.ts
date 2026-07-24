// Storm boards + clue-swap collision guard, headless. Pins: daily seed
// minting (determinism, server seed law, name dealing) and the swap
// guard that ended the duplicate-pill crash.
import assert from 'assert';
import { dailyStormBoards, stormName } from '../src/game/storm-seeds';
import { applySwaps } from '../src/game/clue-swaps';

const DAY = new Date('2026-07-23T15:00:00');

// ---- daily storm boards ----
const boards = dailyStormBoards(DAY);
assert.strictEqual(boards.length, 3, 'three boards per day');

const again = dailyStormBoards(new Date('2026-07-23T23:59:00'));
assert.deepStrictEqual(boards, again, 'same day → identical boards (any hour)');

const tomorrow = dailyStormBoards(new Date('2026-07-24T00:01:00'));
assert.notDeepStrictEqual(
  boards.map((b) => b.name),
  tomorrow.map((b) => b.name),
  'new day → fresh mint (no rotation, owner law)'
);
assert.notDeepStrictEqual(
  boards.map((b) => b.seed),
  tomorrow.map((b) => b.seed),
  'new day → new seeds'
);

// every seed obeys the server's law: ^[a-z0-9-]{3,24}$
for (const b of boards.concat(tomorrow)) {
  assert.ok(/^[a-z0-9-]{3,24}$/.test(b.seed), `seed "${b.seed}" fits the server check`);
}

// names never collide within a day
assert.strictEqual(new Set(boards.map((b) => b.name)).size, 3, 'three distinct names');

// stormName resolves today's boards and passes foreign seeds through
assert.strictEqual(stormName(boards[0].seed, DAY), boards[0].name, 'today resolves');
assert.strictEqual(stormName('first-storm', DAY), 'first-storm', 'foreign seed passes through');

console.log('storms: daily mint pinned (determinism, seed law, names)');

// ---- clue-swap collision guard (the duplicate 'gusty' pill crash) ----
// a persisted swap whose replacement reappears as a NATURAL clue in a
// later round's deal must not duplicate — the swap is skipped
{
  const clues = ['windy', 'gusty', 'foggy'];
  const out = applySwaps(clues, { windy: 'gusty' });
  assert.deepStrictEqual(out, ['windy', 'gusty', 'foggy'], 'colliding swap skipped, original kept');
  assert.strictEqual(new Set(out).size, out.length, 'never a duplicate');
}
// a clean swap still applies
{
  const out = applySwaps(['windy', 'gusty'], { windy: 'hail' });
  assert.deepStrictEqual(out, ['hail', 'gusty'], 'non-colliding swap applies');
}
// two clues swapped to the SAME replacement: first wins, second keeps original
{
  const out = applySwaps(['windy', 'gusty'], { windy: 'hail', gusty: 'hail' });
  assert.deepStrictEqual(out, ['hail', 'gusty'], 'double-target collision: one swap wins');
  assert.strictEqual(new Set(out).size, out.length, 'unique floor holds');
}
console.log('storms: swap collision guard pinned');
