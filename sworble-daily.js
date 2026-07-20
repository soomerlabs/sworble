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
    if (!Array.isArray(e.clues) || !e.clues.length || e.clues.length > 5) return null;
    var clues = [];
    for (var i = 0; i < e.clues.length; i++) {
      var w = typeof e.clues[i] === 'string' ? e.clues[i].trim().toLowerCase() : '';
      if (!w) return null;
      clues.push(w);
    }
    return { sworb: sworb, clues: clues };
  }

  function isClue(word, entry) {
    if (!entry || !word) return false;
    var w = String(word).toLowerCase();
    return entry.clues.indexOf(w) >= 0;
  }

  function normalize(s) { return String(s || '').toLowerCase().replace(/[^a-z]/g, ''); }
  function checkGuess(input, entry) { return !!entry && normalize(input) === entry.sworb; }

  function guessReward(cluesFound, total) {
    if (cluesFound <= 0) return REWARD.none;
    if (cluesFound >= total) return REWARD.all;
    if (cluesFound <= 2) return REWARD.few;
    return REWARD.most;
  }

  var API = { parseEntry: parseEntry, isClue: isClue, checkGuess: checkGuess, guessReward: guessReward, REWARD: REWARD };
  root.SworbleDaily = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
