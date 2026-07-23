// The count-in tick contract — pins the FREEZE bug (owner hit it live):
// a tick that straddles the entire GO..unmount window must still RELEASE.
import assert from 'assert';
import { countInTick } from '../src/game/count-in-tick';

const MS = { STEP2: 700, STEP1: 1400, GO: 2100 };

assert.deepStrictEqual(countInTick(0, MS), { step: '3', release: false, done: false });
assert.deepStrictEqual(countInTick(699, MS), { step: '3', release: false, done: false });
assert.deepStrictEqual(countInTick(700, MS), { step: '2', release: false, done: false });
assert.deepStrictEqual(countInTick(1400, MS), { step: '1', release: false, done: false });
assert.deepStrictEqual(countInTick(2100, MS), { step: null, release: true, done: false });
assert.deepStrictEqual(countInTick(2400, MS), { step: null, release: true, done: false });

// THE FREEZE CASE: JS stalled from 1.5s straight past the unmount deadline —
// one tick sees el=2600. The old branch order unmounted WITHOUT releasing;
// the contract demands release AND done together.
assert.deepStrictEqual(countInTick(2600, MS), { step: null, release: true, done: true });
// pathological: the very first tick lands after everything (cold stall)
assert.deepStrictEqual(countInTick(9999, MS), { step: null, release: true, done: true });

console.log('count-in: tick contract pinned (incl. the straddle-freeze case)');
