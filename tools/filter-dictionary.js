#!/usr/bin/env node
// tools/filter-dictionary.js — regenerate dictionary.txt from a raw word-list source,
// applying the EXACT same acceptance rule loadDict() (index.html) uses at runtime:
// 3-10 letters, lowercase [a-z] only. One line per word, deduped, sorted, no blank lines.
//
// Why this exists: dictionary.txt is fetched in full at boot (135k+ words, ~1.2MB
// uncompressed) and validates every word a player spells. Committing a file that's
// ALREADY filtered to exactly what the game accepts means the runtime filter in loadDict
// (index.html: `w.length >= 3 && w.length <= 10 && /^[a-z]+$/.test(w)`) is a pure no-op
// pass-through — nothing is fetched, parsed, or held in memory that the game can't use.
//
// Usage:
//   node tools/filter-dictionary.js <input-file> [output-file]
//   node tools/filter-dictionary.js dictionary.txt dictionary.txt    (in place)
//
// Default output is dictionary.txt at the repo root if omitted. Run this whenever
// dictionary.txt is regenerated from a new upstream source (a bigger/different
// Scrabble-style list, a licensing swap, etc.) — NOT needed for routine edits, since the
// committed file already satisfies this filter (verified 2026-07-22: running this tool
// against the current dictionary.txt is a byte-for-byte no-op).
'use strict';

const fs = require('fs');
const path = require('path');

const MIN_LEN = 3;
const MAX_LEN = 10;
const WORD_RE = /^[a-z]+$/;

function filterDictionary(rawText) {
  const seen = new Set();
  for (const line of rawText.split(/\r?\n/)) {
    const w = line.trim().toLowerCase();
    if (w.length >= MIN_LEN && w.length <= MAX_LEN && WORD_RE.test(w)) seen.add(w);
  }
  return Array.from(seen).sort();
}

function main(argv) {
  const inPath = argv[2];
  if (!inPath) {
    console.error('usage: node tools/filter-dictionary.js <input-file> [output-file]');
    process.exit(1);
  }
  const outPath = argv[3] || path.join(__dirname, '..', 'dictionary.txt');
  const raw = fs.readFileSync(inPath, 'utf8');
  const before = { bytes: Buffer.byteLength(raw, 'utf8'), lines: raw.split(/\r?\n/).filter(Boolean).length };
  const words = filterDictionary(raw);
  const out = words.join('\n') + '\n';
  fs.writeFileSync(outPath, out, 'utf8');
  const after = { bytes: Buffer.byteLength(out, 'utf8'), lines: words.length };
  console.log('filter-dictionary: ' + inPath + ' -> ' + outPath);
  console.log('  before: ' + before.lines.toLocaleString() + ' lines, ' + before.bytes.toLocaleString() + ' bytes');
  console.log('  after:  ' + after.lines.toLocaleString() + ' words, ' + after.bytes.toLocaleString() + ' bytes');
}

if (require.main === module) main(process.argv);

module.exports = { filterDictionary, MIN_LEN, MAX_LEN, WORD_RE };
