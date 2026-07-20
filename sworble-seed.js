// sworble-seed.js — pure, deterministic clue-word board seeder. NO DOM, NO storage, NO `this`.
// Stamps a word onto the grid as a self-avoiding 8-adjacent path (used for BOTH the opening
// board and re-stamping a clue broken by play). All randomness is an injected mulberry32 rng
// so the daily is identical for every player. Loaded via <script src> (sets window.SworbleSeed);
// module.exports mirrors it for tests.
(function (root) {
  'use strict';

  var DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  function key(r, c) { return r + ',' + c; }

  // Deterministic Fisher-Yates on a copy, driven by rng.
  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // Lay `word` as a self-avoiding 8-adjacent path over `cells` (a list of {r,c}), never using
  // any cell in `avoid` (Set of "r,c"). Returns [{r,c,letter}] or null. Backtracking DFS with
  // rng-shuffled start cells and neighbor order → deterministic given rng, varied across days.
  function stampWord(cells, opts) {
    var word = String(opts.word || '').toLowerCase();
    var rng = opts.rng, avoid = opts.avoid || new Set();
    if (!word) return null;
    var free = {}; // "r,c" -> {r,c} for O(1) neighbor lookup
    for (var i = 0; i < cells.length; i++) { var cc = cells[i]; var fk = key(cc.r, cc.c); if (!avoid.has(fk)) free[fk] = cc; }
    var used = new Set(); // reset per start below; walk() closes over it (function-scoped var)
    function walk(cell, idx) {
      var k = key(cell.r, cell.c);
      used.add(k);
      var here = { r: cell.r, c: cell.c, letter: word[idx] };
      if (idx === word.length - 1) return [here];
      var neigh = [];
      for (var d = 0; d < DIRS.length; d++) {
        var nr = cell.r + DIRS[d][0], nc = cell.c + DIRS[d][1], nk = key(nr, nc);
        if (free[nk] && !used.has(nk)) neigh.push(free[nk]);
      }
      neigh = shuffle(neigh, rng);
      for (var n = 0; n < neigh.length; n++) {
        var rest = walk(neigh[n], idx + 1);
        if (rest) return [here].concat(rest);
      }
      used.delete(k); // backtrack
      return null;
    }
    var starts = shuffle(Object.keys(free).map(function (k2) { return free[k2]; }), rng);
    for (var s = 0; s < starts.length; s++) {
      used = new Set();
      var path = walk(starts[s], 0);
      if (path) return path;
    }
    return null;
  }

  // Place multiple clues on disjoint self-avoiding paths. Returns { letters, cluePaths } or null if any
  // clue can't be placed. `letters` is "r,c" -> letter. `cluePaths` is { word: [{r,c}] }.
  function seedClueLetters(opts) {
    var clues = opts.clues || [], cols = opts.cols, rows = opts.rows, rng = opts.rng;
    var cells = [];
    for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) cells.push({ r: r, c: c });
    var avoid = new Set(), letters = {}, cluePaths = {};
    for (var i = 0; i < clues.length; i++) {
      var w = String(clues[i]).toLowerCase();
      var path = stampWord(cells, { word: w, rng: rng, avoid: avoid });
      if (!path) return null;
      cluePaths[w] = path.map(function (p) { return { r: p.r, c: p.c }; });
      for (var j = 0; j < path.length; j++) { var k = path[j].r + ',' + path[j].c; letters[k] = path[j].letter; avoid.add(k); }
    }
    return { letters: letters, cluePaths: cluePaths };
  }

  var API = { stampWord: stampWord, seedClueLetters: seedClueLetters, _shuffle: shuffle };
  root.SworbleSeed = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
