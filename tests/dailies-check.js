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
  // best-effort packing must land a healthy number of PURE theme words (>=6), or the day is thin.
  // 30 cells hold ~7 pure short words; requiring 6 is comfortably met without any filler padding.
  const rng = Core.mulberry32(Core.hashSeed(day + '|sworb'));
  const out = Seed.seedClueLettersBestEffort({ clues: e.themeWords, cols: 5, rows: 6, rng });
  const realized = Object.keys(out.cluePaths);
  assert.ok(realized.length >= 6, day + ': best-effort packs at least 6 theme words (got ' + realized.length + ')');
  days++;
}
console.log('dailies-check: ' + days + ' days valid');
