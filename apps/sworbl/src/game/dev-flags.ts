// DEV-ONLY runtime flags — MEMORY-FIRST (hard lesson: on-device storage
// reads lagged same-session writes, so uncached flags read stale while the
// cached theme toggle worked fine). Memory is the in-session truth; storage
// is only persistence across launches.
import engine from '@sworbl/engine';

// __DEV__ is a bundler global — absent under the Node test runner
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

function makeFlag(key: string, def: boolean) {
  let mem: boolean | null = null;
  return {
    get(): boolean {
      if (!IS_DEV) return false;
      if (mem === null) mem = engine.store.getJSON(key, def) === true;
      return mem;
    },
    set(v: boolean): void {
      if (!IS_DEV) return;
      mem = v;
      engine.store.setJSON(key, v);
    },
  };
}

const audit = makeFlag('sworbl_rn_dev_audit', false);
const diag = makeFlag('sworbl_rn_dev_diag', false);
const short = makeFlag('sworbl_rn_dev_short', false);
const stall = makeFlag('sworbl_rn_dev_stall', false);

// CLUE AUDIT overlay: revealed chips under the board; tap → solver proof
export const getClueAudit = audit.get;
export const setClueAudit = audit.set;
// DIAGNOSTICS: the gold state readouts (off unless hunting a mystery)
export const getDiagnostics = diag.get;
export const setDiagnostics = diag.set;
// SHORT ROUNDS: 20s base clock — full loop in under a minute
export const getShortRounds = short.get;
export const setShortRounds = short.set;
// COUNT-IN STALL: freeze-repro stress (blocks JS across the GO beat)
export const getCountInStall = stall.get;
export const setCountInStall = stall.set;
