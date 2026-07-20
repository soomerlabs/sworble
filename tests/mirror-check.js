// tests/mirror-check.js — run with: node tests/mirror-check.js
// index.html and Sworble.dc.html are the SAME document (the .dc.html is the design-canvas
// source, index.html is what Pages serves). They must stay byte-identical apart from the
// trailing newline — drift means players get a stale game. CI fails the push on drift.
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const a = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\n+$/, '');
const b = fs.readFileSync(path.join(root, 'Sworble.dc.html'), 'utf8').replace(/\n+$/, '');
if (a !== b) {
  const al = a.split('\n'), bl = b.split('\n');
  let line = 0;
  while (line < Math.max(al.length, bl.length) && al[line] === bl[line]) line++;
  console.error('MIRROR DRIFT: index.html and Sworble.dc.html differ (first diff at line ' + (line + 1) + ').');
  console.error('Fix: edit ONE file, then  cp index.html Sworble.dc.html && printf \'\\n\' >> Sworble.dc.html');
  process.exit(1);
}
console.log('mirror: index.html and Sworble.dc.html match');
