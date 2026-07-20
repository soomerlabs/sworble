// sworble-run.js — live-run snapshot layer: serialize/validate the mid-run state of a
// daily so a reload (or a mobile tab eviction) can restore the run exactly where it was.
// Pure data-in/data-out — NO DOM, NO storage, NO `this` (the game wires it to LS via
// SworbleStore.K.RUN_PREFIX + dayKey).
//
// Loaded via <script src> in <helmet> (sets window.SworbleRun); mirrored to
// module.exports for tests (tests/sworble-run.test.js).
//
// Restore contract: the snapshot carries everything the seeded daily needs to continue
// deterministically — the letter-queue position (queueIdx) plus CALL COUNTS for the three
// seeded RNG streams (rngN), so the game can rebuild each mulberry32 stream from the day
// seed and fast-forward it to its exact position at save time.
(function (root) {
  'use strict';

  const RUN_VERSION = 1;

  // The ONLY tile fields that survive a snapshot. Everything else (spawn/mergeTo/
  // boostFlash/stretch/intro/dealDelay/armed/...) is animation or interaction state
  // that must reset to a settled board on restore.
  function packTile(t) {
    return {
      id: t.id, letter: t.letter, row: t.row, col: t.col, color: t.color,
      boost: t.boost || 0, mine: !!t.mine, stackColors: t.stackColors || null,
    };
  }

  function isFiniteNum(n) { return typeof n === 'number' && isFinite(n); }
  function validTile(t) {
    return !!t && isFiniteNum(t.id) && typeof t.letter === 'string' && t.letter.length > 0 &&
      isFiniteNum(t.row) && isFiniteNum(t.col);
  }
  function validRngN(r) {
    return !!r && isFiniteNum(r.rand) && r.rand >= 0 && isFiniteNum(r.rowRand) && r.rowRand >= 0 &&
      isFiniteNum(r.mineRand) && r.mineRand >= 0;
  }

  // Build a JSON-safe snapshot from the live run's state, or null if the input does not
  // describe a resumable run (no day, empty board, spent budget, corrupt numbers).
  // Never mutates `src` — every array/object in the result is a fresh copy.
  function serializeRun(src) {
    if (!src || typeof src.day !== 'string' || !src.day) return null;
    if (!Array.isArray(src.tiles)) return null;
    if (!isFiniteNum(src.score) || !isFiniteNum(src.guessesLeft) || src.guessesLeft <= 0) return null;
    if (!validRngN(src.rngN)) return null;
    if (!isFiniteNum(src.queueIdx) || src.queueIdx < 0) return null;
    const tiles = src.tiles.filter(t => t && !t.dead && !t.clearing).map(packTile);
    if (!tiles.length) return null;
    return {
      v: RUN_VERSION,
      day: src.day,
      cols: isFiniteNum(src.cols) ? src.cols : null, // board geometry at save time — a
      rows: isFiniteNum(src.rows) ? src.rows : null, // restore onto a resized grid re-deals instead
      tileSeq: isFiniteNum(src.tileSeq) ? src.tileSeq : 1,
      queueIdx: src.queueIdx,
      juiceNext: isFiniteNum(src.juiceNext) ? src.juiceNext : 0,
      rngN: { rand: src.rngN.rand, rowRand: src.rngN.rowRand, mineRand: src.rngN.mineRand },
      tiles,
      nextRow: Array.isArray(src.nextRow)
        ? src.nextRow.map(c => (c ? { letter: c.letter, color: c.color } : null))
        : null,
      score: src.score,
      guessesLeft: src.guessesLeft,
      streak: isFiniteNum(src.streak) ? src.streak : 0,
      maxStreak: isFiniteNum(src.maxStreak) ? src.maxStreak : 0,
      roundWords: Array.isArray(src.roundWords)
        ? src.roundWords.map(w => ({ word: w.word, pts: w.pts, colors: Array.isArray(w.colors) ? w.colors.slice() : null, best: !!w.best }))
        : [],
      boardElapsedMs: isFiniteNum(src.boardElapsedMs) ? src.boardElapsedMs : 0,
      bestRun: isFiniteNum(src.bestRun) ? src.bestRun : 0,
      bestHits: isFiniteNum(src.bestHits) ? src.bestHits : 0,
      bombRun: isFiniteNum(src.bombRun) ? src.bombRun : 0,
      mergedOnce: !!src.mergedOnce,
      openingSnapshot: Array.isArray(src.openingSnapshot)
        ? src.openingSnapshot.map(s => ({ letter: s.letter, row: s.row, col: s.col }))
        : null,
    };
  }

  // Gate a parsed snapshot before restore: right version, right day, structurally sound.
  // Anything off -> null, and the caller deals a fresh board (never a broken restore).
  function validateRun(snap, day) {
    if (!snap || typeof snap !== 'object') return null;
    if (snap.v !== RUN_VERSION) return null;
    if (typeof day !== 'string' || snap.day !== day) return null;
    if (!Array.isArray(snap.tiles) || !snap.tiles.length || !snap.tiles.every(validTile)) return null;
    if (!isFiniteNum(snap.score) || !isFiniteNum(snap.guessesLeft) || snap.guessesLeft <= 0) return null;
    if (!validRngN(snap.rngN)) return null;
    if (!isFiniteNum(snap.queueIdx) || snap.queueIdx < 0) return null;
    if (!Array.isArray(snap.roundWords)) return null;
    return snap;
  }

  const API = { RUN_VERSION, serializeRun, validateRun };
  root.SworbleRun = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
