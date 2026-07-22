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

  // A spelled word counts as finding a clue if it STARTS WITH the clue (trims/trimmed/
  // trimming all bank "trim"; seedy banks "seed"). Returns the matched clue itself (lowercase)
  // so the caller knows exactly what to bank/dedup — not the spelled word. When more than one
  // clue prefixes the word (e.g. both "seed" and "seeds" are clues and the word is "seeds"),
  // the LONGEST matching clue wins. Returns null on no match / missing entry / empty word.
  function clueFor(word, entry) {
    if (!entry || !word) return null;
    var list = entry.themeWords || [];
    var w = String(word).toLowerCase();
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var c = String(list[i] || '').toLowerCase();
      if (c && w.indexOf(c) === 0 && (!best || c.length > best.length)) best = c;
    }
    return best;
  }
  function isClue(word, entry) { return !!clueFor(word, entry); }

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

  // FOUND_PREFIX banking, dedupe-safe: bank `clue` into `found` exactly once. The caller
  // resolves a spelled word to its clue via clueFor() first (so "trims"/"trimmed"/"trimming"
  // all arrive here as the SAME clue, "trim") — bankClue's only job is the append-once
  // arithmetic. Never mutates `found`: returns the SAME reference back when there's nothing
  // new to bank (already present, or clue is falsy), a NEW array (append) otherwise — the
  // split-brain glow/bank class of bug has bitten twice, pinning this with the caller able to
  // tell "banked" from "no-op" via reference equality.
  function bankClue(found, clue) {
    var list = Array.isArray(found) ? found : [];
    if (!clue || list.indexOf(clue) >= 0) return list;
    return list.concat([clue]);
  }

  // The finale guess decision, extracted pure from guessSworb (index.html): 6-guess cap,
  // no-op once already solved or budget exhausted, reward tiers scaled by clues found at
  // guess time, case-insensitive match (checkGuess's own normalize()). The caller
  // (index.html) still owns persistence (saveSworb) and setState — this just decides.
  //
  // args = { input, entry, guessesUsed, solved, foundCount, total }
  // -> { ok, correct, newGuessesUsed, nowSolved, lockedOut, bonus }
  //   ok=false means no fresh guess was processed (no entry today, or already
  //   solved/exhausted — a no-op resubmit never re-scores or re-banks). lockedOut is true
  //   whenever the 6-guess budget is spent after this call (already-spent no-ops, and the
  //   6th miss itself) — the caller uses it to trigger the finale's exhausted exit.
  function applySworbGuess(args) {
    var a = args || {};
    var guessesUsed = (typeof a.guessesUsed === 'number' && isFinite(a.guessesUsed) && a.guessesUsed > 0) ? a.guessesUsed : 0;
    var solved = !!a.solved;
    if (!a.entry) return { ok: false };
    if (solved || guessesUsed >= 6) return { ok: false, lockedOut: true };
    var correct = checkGuess(a.input, a.entry);
    var newGuessesUsed = Math.min(6, guessesUsed + 1); // cap at 6, defensive against overrun input
    var bonus = 0;
    if (correct) {
      var foundCount = (typeof a.foundCount === 'number' && isFinite(a.foundCount) && a.foundCount > 0) ? a.foundCount : 0;
      var total = (typeof a.total === 'number' && isFinite(a.total) && a.total > 0) ? a.total : 0;
      bonus = guessReward(foundCount, total);
    }
    return {
      ok: true, correct: correct, newGuessesUsed: newGuessesUsed, nowSolved: correct,
      lockedOut: !correct && newGuessesUsed >= 6, bonus: bonus,
    };
  }

  var API = { parseEntry: parseEntry, isClue: isClue, clueFor: clueFor, checkGuess: checkGuess, guessReward: guessReward, scoreGuess: scoreGuess, bankClue: bankClue, applySworbGuess: applySworbGuess, REWARD: REWARD };
  root.SworbleDaily = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
