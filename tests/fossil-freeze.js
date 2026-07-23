// FOSSIL FREEZE (audit 2026-07-23, weakness #5): the repo-root web app is a
// deployed FOSSIL — it serves GitHub Pages while the RN rebuild happens, and
// "frozen" must be a mechanism, not a convention. This check pins every fossil
// code file to a recorded sha256. A deliberate fossil hotfix (rare, owner-
// sanctioned, mirrored from packages/engine when critical) regenerates the
// manifest CONSCIOUSLY:  node tests/fossil-freeze.js --write
// Living code is NOT covered: packages/engine and apps/sworbl evolve freely;
// dailies.json is content (updated routinely); tests/ and docs/ are shared.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

const root = path.join(__dirname, '..');
const MANIFEST = path.join(__dirname, 'fossil-manifest.json');

const FOSSIL_FILES = [
  'index.html',
  'support.js',
  'words.js',
  'sworble-core.js',
  'sworble-daily.js',
  'sworble-flow.js',
  'sworble-net.js',
  'sworble-run.js',
  'sworble-seed.js',
  'sworble-solver.js',
  'sworble-status.js',
  'sworble-store.js',
];

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
const current = Object.fromEntries(FOSSIL_FILES.map((f) => [f, sha(f)]));

if (process.argv.includes('--write')) {
  fs.writeFileSync(MANIFEST, JSON.stringify(current, null, 2) + '\n');
  console.log('fossil-freeze: manifest regenerated (' + FOSSIL_FILES.length + ' files) — this should be a DELIBERATE, reviewed act');
  process.exit(0);
}

const recorded = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
for (const f of FOSSIL_FILES) {
  assert.ok(recorded[f], 'fossil-freeze: ' + f + ' missing from manifest — regenerate deliberately with --write');
  assert.strictEqual(
    current[f],
    recorded[f],
    'FOSSIL VIOLATION: ' + f + ' changed. The root web app is FROZEN (it serves the live site while the RN ' +
    'rebuild happens). Engine changes belong in packages/engine/. If this change is a sanctioned fossil ' +
    'hotfix, regenerate the manifest: node tests/fossil-freeze.js --write'
  );
}
console.log('fossil-freeze: ' + FOSSIL_FILES.length + ' fossil files byte-identical to manifest');
