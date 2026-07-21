// tests/dailies-check.js — content guardrail: every day parses, every theme word is a real
// dictionary word, and a healthy number pack onto the board. Runs in npm test.
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
let days = 0;
for (const day of Object.keys(dailies)) {
  const e = Daily.parseEntry(dailies, day);
  assert.ok(e, day + ': parses');
  for (const w of e.themeWords) {
    assert.ok(dict.has(w), day + ': theme word "' + w + '" is in dictionary.txt');
    assert.ok(w.length >= 3 && w.length <= 7, day + ': theme word "' + w + '" is 3-7 letters');
  }
  // at least the default target (10) must be able to pack, or the day feels thin
  const target = Math.min(10, e.themeWords.length);
  const rng = Core.mulberry32(Core.hashSeed(day + '|sworb'));
  const out = Seed.seedClueLetters({ clues: e.themeWords.slice(0, target), cols: 5, rows: 6, rng });
  assert.ok(out, day + ': first ' + target + ' theme words pack onto the board');
  days++;
}
console.log('dailies-check: ' + days + ' days valid');
