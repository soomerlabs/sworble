// DEV-ONLY runtime flags (hard-fenced: release builds read constants).
import engine from '@sworbl/engine';

// __DEV__ is a bundler global — absent under the Node test runner
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const AUDIT_KEY = 'sworbl_rn_dev_audit';

// CLUE AUDIT overlay: revealed clue chips under the board; tap → the solver
// proves the path live (flash) or refuses (red shake). The fairness lens.
export function getClueAudit(): boolean {
  if (!IS_DEV) return false;
  return engine.store.getJSON(AUDIT_KEY, false) === true;
}

export function setClueAudit(v: boolean): void {
  if (!IS_DEV) return;
  engine.store.setJSON(AUDIT_KEY, v);
}

// COUNT-IN STALL STRESS: deliberately blocks the JS thread across the GO
// beat so a single interval tick straddles the whole release..unmount
// window — the exact conditions of the count-in freeze. With the fix, the
// board still wakes (late); without it, this reproduced the freeze on demand.
const STALL_KEY = 'sworbl_rn_dev_stall';

export function getCountInStall(): boolean {
  if (!IS_DEV) return false;
  return engine.store.getJSON(STALL_KEY, false) === true;
}

export function setCountInStall(v: boolean): void {
  if (!IS_DEV) return;
  engine.store.setJSON(STALL_KEY, v);
}
