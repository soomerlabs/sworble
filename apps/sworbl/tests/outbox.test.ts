// The outbox's headless slice: enqueue dedupe-by-day, row-id minting, and
// the practice lane's namespacing. The DRAIN's write-back-by-removal needs
// a supabase stub (unreachable headless — noted in the coverage audit);
// with no env keys configured, drainOutbox early-returns and enqueue is
// pure storage.
import assert from 'assert';
import engine from '@sworbl/engine';
import { enqueueSubmission, enqueuePractice } from '../src/net/standings-remote';

const OUTBOX_KEY = 'sworbl_rn_outbox';
const box = () => engine.store.getJSON(OUTBOX_KEY, []) as Array<{
  id?: string; day: string; seed?: string; score: number; rounds?: number; mode?: string;
}>;

engine.store.remove(OUTBOX_KEY);

// keep-one-per-day: a re-enqueue supersedes, never stacks
enqueueSubmission('2099-06-01', 100, { guessesUsed: 0, solved: false, bonus: 0 }, [], 1);
enqueueSubmission('2099-06-01', 250, { guessesUsed: 2, solved: true, bonus: 150 }, [], 3);
assert.strictEqual(box().length, 1, 'one pending row per day');
assert.strictEqual(box()[0].score, 250, 'the newest submission wins');
assert.strictEqual(box()[0].rounds, 3, 'rounds ride the row');
assert.ok(box()[0].id, 'rows carry ids (the drain matches on these)');

// distinct days coexist; ids never collide
enqueueSubmission('2099-06-02', 90, { guessesUsed: 0, solved: false, bonus: 0 }, [], 1);
assert.strictEqual(box().length, 2, 'two days, two rows');
assert.notStrictEqual(box()[0].id, box()[1].id, 'row ids are unique');

// practice namespacing: storm rows never collide with a real day
enqueuePractice('s-20990601-a', 400, [{ word: 'gale', pts: 400 }]);
assert.strictEqual(box().length, 3, 'practice adds its own row');
const pr = box().find((r) => r.mode === 'practice');
assert.strictEqual(pr?.day, 'storm:s-20990601-a', 'practice day is namespaced');
assert.strictEqual(pr?.seed, 's-20990601-a', 'seed rides for the server body');

// practice keep-best-per-seed dedupe
enqueuePractice('s-20990601-a', 500, [{ word: 'gales', pts: 500 }]);
assert.strictEqual(box().filter((r) => r.mode === 'practice').length, 1, 'one row per seed');
assert.strictEqual(box().find((r) => r.mode === 'practice')?.score, 500, 'newest practice wins');

engine.store.remove(OUTBOX_KEY);
console.log('outbox: enqueue dedupe + row ids + practice namespacing pinned');
