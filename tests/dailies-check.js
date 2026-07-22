// tests/dailies-check.js — content guardrail: every day parses, every theme word is a real
// dictionary word, and the two-pass seed lands EXACTLY 6 theme words ("6 to find, 6 to crack
// it" — Task 2 invariant). Runs in npm test.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Core = require('../sworble-core.js');
const Seed = require('../sworble-seed.js');
const Daily = require('../sworble-daily.js');
const root = path.join(__dirname, '..');
const dailies = JSON.parse(fs.readFileSync(path.join(root, 'dailies.json'), 'utf8'));
const dict = new Set(fs.readFileSync(path.join(root, 'dictionary.txt'), 'utf8').split(/\r?\n/).map(w => w.trim()).filter(Boolean));
const CLUE_COUNT = 6;
let days = 0;
for (const day of Object.keys(dailies)) {
  const e = Daily.parseEntry(dailies, day);
  assert.ok(e, day + ': parses');
  for (const w of e.themeWords) {
    assert.ok(dict.has(w), day + ': theme word "' + w + '" is in dictionary.txt');
    assert.ok(w.length >= 3 && w.length <= 7, day + ': theme word "' + w + '" is 3-7 letters');
  }
  // simulate the SAME two-pass seed the app runs (see index.html's theme seed block): pass 1
  // best-effort packs the full candidate pool; the first 6 realized (insertion order) become
  // the target set; pass 2 re-packs a FRESH board with ONLY those 6, on a fresh rng from the
  // same seed. Content days must land cleanly on exactly 6 — a day that needs the fallback
  // (pass 2 dropping below 6) is thin/misconfigured content and must fail this check.
  const rngFactory = () => Core.mulberry32(Core.hashSeed(day + '|sworb'));
  const out = Seed.seedClueLettersTwoPass({ clues: e.themeWords, cols: 5, rows: 6, rngFactory, target: CLUE_COUNT });
  assert.ok(!out.usedFallback, day + ': two-pass seed lands cleanly on ' + CLUE_COUNT + ' clues (no fallback bonus words)');
  assert.strictEqual(out.realized.length, CLUE_COUNT, day + ': realized theme set is exactly ' + CLUE_COUNT + ' (got ' + out.realized.length + ')');
  days++;
}
console.log('dailies-check: ' + days + ' days valid, each locking exactly ' + CLUE_COUNT + ' clues');
