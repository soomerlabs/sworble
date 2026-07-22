// tests/sworble-store.test.js — run with: node tests/sworble-store.test.js
// Covers the legacy-key migration (stackle_* -> sworble_*): copy semantics, no
// overwrites, idempotence via the one-time flag. In Node the store falls back to
// its in-memory shim, so every assertion runs against a clean fake localStorage.
'use strict';
const assert = require('assert');
const S = require('../sworble-store.js');
const LS = S.LS;

assert.strictEqual(typeof S.migrateLegacy, 'function', 'store must export migrateLegacy');
assert.strictEqual(S.K.MIGRATED_STACKLE, 'sworble_migrated_stackle', 'flag key must be registered in K');
assert.strictEqual(S.K.HINT_TOKENS_PREFIX, 'sworble_hint_tokens_', 'HINT AIDS token-bank prefix must be registered in K');

// --- first run: copies every stackle_* key whose sworble_* twin is absent ---------
LS.setItem('stackle_best', '4200');
LS.setItem('stackle_name', 'PHIL');
LS.setItem('stackle_daily_2026-07-01', '900');
LS.setItem('stackle_seen_howto', '1');
LS.setItem('sworble_name', 'NEWER'); // player already progressed under the new name — never clobber
LS.setItem('worddrop_muted', '1');   // the spared legacy key is not stackle_* — untouched

const moved = S.migrateLegacy();
assert.strictEqual(moved, 3, 'best + daily + seen_howto copied; name skipped (target exists)');
assert.strictEqual(LS.getItem('sworble_best'), '4200');
assert.strictEqual(LS.getItem('sworble_daily_2026-07-01'), '900');
assert.strictEqual(LS.getItem('sworble_seen_howto'), '1');
assert.strictEqual(LS.getItem('sworble_name'), 'NEWER', 'existing sworble data wins over legacy');
assert.strictEqual(LS.getItem('stackle_best'), '4200', 'originals stay in place (rollback-safe)');
assert.strictEqual(LS.getItem('worddrop_muted'), '1');
assert.strictEqual(LS.getItem(S.K.MIGRATED_STACKLE), '1', 'one-time flag set');

// --- second run: flag short-circuits — nothing new is copied ----------------------
LS.setItem('stackle_late_arrival', 'x');
assert.strictEqual(S.migrateLegacy(), 0, 'migration never runs twice');
assert.strictEqual(LS.getItem('sworble_late_arrival'), null);

// --- age-GC: dayKeyAgeDays -----------------------------------------------------------
// now pinned to a fixed local calendar day so the test is deterministic regardless of
// when it runs (matches SworbleCore.dayKey()'s local-day construction).
const NOW = new Date(2026, 8, 19); // 2026-09-19 local
assert.strictEqual(S.dayKeyAgeDays('2026-09-19', NOW), 0, 'today is age 0');
assert.strictEqual(S.dayKeyAgeDays('2026-07-22', NOW), 59, 'exactly 59 days old');
assert.strictEqual(S.dayKeyAgeDays('2026-07-21', NOW), 60, 'exactly 60 days old');
assert.strictEqual(S.dayKeyAgeDays('2026-07-20', NOW), 61, 'exactly 61 days old');
for (const bad of ['', 'not-a-date', '2026-13-01', '2026-02-30', '26-07-20', undefined, null]) {
  assert.strictEqual(S.dayKeyAgeDays(bad, NOW), null, 'malformed/impossible date -> null: ' + bad);
}

// --- age-GC: agedDayKeys ------------------------------------------------------------
assert.strictEqual(S.AGE_GC_MAX_DAYS, 60, 'default cutoff is 60 days');
{
  const keys = [
    S.K.DAILY_PREFIX + '2026-07-22', // 59d — kept
    S.K.SEVEN_PREFIX + '2026-07-21', // 60d — kept (boundary: not OLDER than 60)
    S.K.RUNS_PREFIX + '2026-07-20',  // 61d — pruned
    S.K.LB_ME_PREFIX + '2026-07-20|puzzle', // 61d, '|mode' suffix — pruned
    S.K.LB_ME_PREFIX + '2026-09-19', // today — kept
    S.K.DONE_PREFIX + 'not-a-date',  // malformed date on a dated prefix — untouched
    S.K.BEST,                        // not a dated prefix at all — untouched
    S.K.MUTED,                       // not a dated prefix at all — untouched
    'sworble_daily_' + 'undefined',  // the OTHER malformed-key heal already owns this one; still untouched here
  ];
  const aged = S.agedDayKeys(keys, NOW);
  assert.deepStrictEqual(aged.sort(), [
    S.K.LB_ME_PREFIX + '2026-07-20|puzzle',
    S.K.RUNS_PREFIX + '2026-07-20',
  ].sort(), '61d entries (incl. the |mode suffix form) pruned; 59d/60d/malformed/non-dated all kept');

  // pure: only returns names, never itself removes anything from storage
  assert.strictEqual(keys.length, 9);
  LS.setItem(S.K.RUNS_PREFIX + '2026-07-20', 'still here');
  S.agedDayKeys(keys, NOW);
  assert.strictEqual(LS.getItem(S.K.RUNS_PREFIX + '2026-07-20'), 'still here', 'agedDayKeys never writes to storage — pure decision only, caller removes');
}

console.log('sworble-store: all tests passed');
