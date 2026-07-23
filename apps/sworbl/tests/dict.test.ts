// Two-tier dictionary: starter validates instantly; applyFullDictionary swaps
// in the real 135k list (fed the actual repo file — no asset machinery needed);
// corrupt input is rejected; the trace prefix map stays pinned to the starter.
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { dict, applyFullDictionary, isFullDictionary, prefixMap } from '../src/game/dict';

// tier 1: the starter works from the first call
const starterSize = dict().size;
assert.ok(starterSize > 3000, `starter dictionary present (${starterSize} words)`);
assert.ok(dict().has('kitchen'), 'starter has common words');
assert.strictEqual(isFullDictionary(), false, 'starts on the starter tier');

// prefix map is starter-pinned — snapshot its size before any upgrade
const prefixSizeBefore = Object.keys(prefixMap()).length;

// corrupt/truncated input never downgrades validation
assert.strictEqual(applyFullDictionary('cat dog bird'), 0, 'tiny input rejected');
assert.strictEqual(isFullDictionary(), false, 'still on starter after rejection');
assert.ok(dict().has('kitchen'), 'starter untouched by rejected upgrade');

// tier 2: the REAL file upgrades validation
const real = fs.readFileSync(path.join(__dirname, '../../../dictionary.txt'), 'utf8');
const size = applyFullDictionary(real);
assert.ok(size > 130000, `full dictionary applied (${size} words)`);
assert.strictEqual(isFullDictionary(), true, 'full tier active');
assert.ok(dict().has('kitchen'), 'starter words survive the swap (subset property)');
assert.ok(dict().has('zephyrs'), 'obscure words now valid');
assert.ok(!dict().has('xq'), 'sub-3-letter junk filtered');

// the worklet prefix map must NOT balloon after the swap (starter-pinned)
assert.strictEqual(
  Object.keys(prefixMap()).length,
  prefixSizeBefore,
  'prefix map stays starter-sized after the full-dictionary swap'
);

console.log(`dict: two-tier upgrade verified (${starterSize} → ${size} words; prefix map pinned)`);
