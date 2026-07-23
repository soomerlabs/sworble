// PURE count-in tick decision — its own module so the Node test runner can
// import it without dragging react-native along.
// THE INVARIANT THAT FROZE THE BOARD (owner hit it live): release must be
// true at/after GO regardless of how late the tick lands — a tick may
// straddle the entire GO..unmount window (JS stall), and ordering unmount
// before release stranded the round in count-in with a paused clock.
export function countInTick(
  el: number,
  ms: { STEP2: number; STEP1: number; GO: number }
): { step: '3' | '2' | '1' | null; release: boolean; done: boolean } {
  if (el >= ms.GO) {
    return { step: null, release: true, done: el >= ms.GO + 400 };
  }
  return { step: el >= ms.STEP1 ? '1' : el >= ms.STEP2 ? '2' : '3', release: false, done: false };
}
