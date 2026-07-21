// sworble-daily.js — pure "sworb of the day" content + guess logic. NO DOM, NO storage, NO `this`.
// Loaded via <script src> (sets window.SworbleDaily); module.exports mirrors it for tests.
(function (root) {
  'use strict';

  // Reward tiers for a correct sworb guess, scaled INVERSELY by clues found at guess time
  // (bold cold-read pays most; guessing after finding everything pays least). Tuning constants.
  var REWARD = { none: 500, few: 350, most: 200, all: 75 };

  function parseEntry(dailies, day) {
    if (!dailies || typeof dailies !== 'object') return null;
    var e = dailies[day];
    if (!e || typeof e !== 'object') return null;
    var sworb = typeof e.sworb === 'string' ? e.sworb.trim().toLowerCase() : '';
    if (!sworb) return null;
    // accept a theme-word POOL (new) or the legacy `clues` array (back-compat); no upper cap
    var raw = Array.isArray(e.themeWords) ? e.themeWords : (Array.isArray(e.clues) ? e.clues : null);
    if (!raw || !raw.length) return null;
    var themeWords = [];
    for (var i = 0; i < raw.length; i++) {
      var w = typeof raw[i] === 'string' ? raw[i].trim().toLowerCase() : '';
      if (!w) return null;
      themeWords.push(w);
    }
    return { sworb: sworb, themeWords: themeWords };
  }

  function isClue(word, entry) {
    if (!entry || !word) return false;
    var list = entry.themeWords || entry.clues || [];
    var w = String(word).toLowerCase();
    return list.indexOf(w) >= 0;
  }

  function normalize(s) { return String(s || '').toLowerCase().replace(/[^a-z]/g, ''); }
  function checkGuess(input, entry) { return !!entry && normalize(input) === entry.sworb; }

  function guessReward(cluesFound, total) {
    if (cluesFound <= 0) return REWARD.none;
    if (cluesFound >= total) return REWARD.all;
    if (cluesFound <= 2) return REWARD.few;
    return REWARD.most;
  }

  // Wordle-style per-letter feedback for a guess against the answer. Returns an array the
  // length of `guess`: 'green' (right letter, right spot), 'yellow' (in the word, wrong spot),
  // 'gray' (not in the word). Duplicate letters are handled the true-Wordle way: greens are
  // matched first, then each remaining answer letter can satisfy at most one yellow.
  function scoreGuess(guess, answer) {
    var g = String(guess || '').toLowerCase();
    var a = String(answer || '').toLowerCase();
    var res = [], used = [];
    for (var j = 0; j < a.length; j++) used[j] = false;
    for (var i = 0; i < g.length; i++) {
      if (g[i] === a[i]) { res[i] = 'green'; used[i] = true; } else res[i] = 'gray';
    }
    for (var k = 0; k < g.length; k++) {
      if (res[k] === 'green') continue;
      for (var m = 0; m < a.length; m++) {
        if (!used[m] && g[k] === a[m]) { res[k] = 'yellow'; used[m] = true; break; }
      }
    }
    return res;
  }

  var API = { parseEntry: parseEntry, isClue: isClue, checkGuess: checkGuess, guessReward: guessReward, scoreGuess: scoreGuess, REWARD: REWARD };
  root.SworbleDaily = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
