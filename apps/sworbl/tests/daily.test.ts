// The daily deal + cascade + re-stamp, headless. Pins: deterministic deal,
// clue findability at deal time, settle geometry, and the re-stamp guarantee
// (a broken un-found clue rides back in on the refill).
import assert from 'assert';
import engine from '@sworbl/engine';
import { dealDaily, settle, restampBroken, activeClues } from '../src/game/daily';
import { COLS, ROWS, CLUE_COUNT } from '../src/game/types';

// use a date the content feed covers (dailies.json ships in-repo)
const FIXTURE = new Date('2026-07-22T12:00:00');

const deal = dealDaily(FIXTURE);
assert.ok(deal, 'fixture day deals');
assert.strictEqual(deal!.clues.length, CLUE_COUNT, 'exactly 6 realized clues');
assert.strictEqual(deal!.tiles.length, COLS * ROWS, 'full board dealt');

// determinism: a second deal is letter-identical
const deal2 = dealDaily(FIXTURE);
assert.deepStrictEqual(
  deal!.tiles.map((t) => `${t.row},${t.col}:${t.letter}`),
  deal2!.tiles.map((t) => `${t.row},${t.col}:${t.letter}`),
  'same day → byte-identical board'
);

// every realized clue is findable on the dealt board
for (const w of deal!.clues) {
  assert.ok(
    engine.solver.findWord(deal!.tiles, { word: w, expand: engine.core.expandLetter, diag: true }),
    `clue "${w}" findable at deal`
  );
}

// settle: clearing a clue's path collapses columns and rains exactly that many refills
const victim = deal!.clues[0];
const path = engine.solver.findWord(deal!.tiles, {
  word: victim, expand: engine.core.expandLetter, diag: true,
})!;
const gone = new Set(path);
const { tiles: settled, added } = settle(deal!.tiles.filter((t) => !gone.has(t.id)), deal!.nextLetter);
assert.strictEqual(settled.length, COLS * ROWS, 'board is full again after settle');
assert.strictEqual(added.length, path.length, 'refill count equals cleared count');
for (let c = 0; c < COLS; c++) {
  const rows = settled.filter((t) => t.col === c).map((t) => t.row).sort((a, b) => a - b);
  assert.deepStrictEqual(rows, Array.from({ length: ROWS }, (_, i) => i), `column ${c} has one tile per row`);
}

// re-stamp: the broken clue is findable again, and ONLY refill tiles changed
const before = new Map(settled.map((t) => [t.id, t.letter]));
const restamped = restampBroken({ deal: deal!, tiles: settled, added, unfound: [victim] });
assert.ok(
  engine.solver.findWord(restamped, { word: victim, expand: engine.core.expandLetter, diag: true }),
  'broken clue findable again after re-stamp'
);
const addedIds = new Set(added.map((t) => t.id));
for (const t of restamped) {
  if (!addedIds.has(t.id)) {
    assert.strictEqual(t.letter, before.get(t.id), 'settled tiles NEVER change letters');
  }
}

// the roundWords guard lives at the call site: an empty unfound list is a no-op
const untouched = restampBroken({ deal: deal!, tiles: settled, added, unfound: [] });
assert.strictEqual(untouched, settled, 'nothing unfound → identical reference, zero work');

// BONUS WAVES: pure derivation from the found set — 3 at a time, only once
// everything currently active is caught
{
  const core = ['a1', 'a2'];
  const extras = ['b1', 'b2', 'b3', 'b4'];
  assert.deepStrictEqual(activeClues(core, extras, []), core, 'no wave before the core is done');
  assert.deepStrictEqual(
    activeClues(core, extras, ['a1', 'a2']),
    ['a1', 'a2', 'b1', 'b2', 'b3'],
    'core cleared → wave of 3'
  );
  assert.deepStrictEqual(
    activeClues(core, extras, ['a1', 'a2', 'b1', 'b2', 'b3']),
    ['a1', 'a2', 'b1', 'b2', 'b3', 'b4'],
    'wave cleared → the remainder arrives'
  );
}

console.log('daily: deal/settle/re-stamp invariants all passed');
