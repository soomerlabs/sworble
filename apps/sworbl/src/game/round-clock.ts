// The round clock, extracted PURE (modules decide, screens act): accumulated
// elapsed ms + the time-fuel bank, immutable state transitions, engine-derived
// remaining. play.tsx holds one ClockState ref and calls these.
import engine from '@sworbl/engine';

export interface ClockState {
  elapsedBaseMs: number; // accumulated while previously live
  liveStartAt: number; // 0 = not running; else the timestamp live began
  earnedMs: number; // the time-fuel bank (cap enforced at grant time)
}

export interface ClockTuning {
  baseSecs: number;
  capSecs: number;
}

export function mkClock(fromSnap?: { boardElapsedMs: number; earnedMs: number }): ClockState {
  return {
    elapsedBaseMs: fromSnap?.boardElapsedMs ?? 0,
    liveStartAt: 0,
    earnedMs: fromSnap?.earnedMs ?? 0,
  };
}

export function clockStart(c: ClockState, now: number): ClockState {
  return c.liveStartAt ? c : { ...c, liveStartAt: now };
}

// pause folds live time into the base — pausing twice is a no-op
export function clockPause(c: ClockState, now: number): ClockState {
  if (!c.liveStartAt) return c;
  return { ...c, elapsedBaseMs: c.elapsedBaseMs + (now - c.liveStartAt), liveStartAt: 0 };
}

export function clockElapsedMs(c: ClockState, now: number): number {
  return c.elapsedBaseMs + (c.liveStartAt ? now - c.liveStartAt : 0);
}

export function clockEffSecs(c: ClockState, t: ClockTuning): number {
  return t.baseSecs + c.earnedMs / 1000;
}

export function clockRemaining(c: ClockState, now: number, t: ClockTuning): number {
  return engine.run.remainingSecs(clockEffSecs(c, t), clockElapsedMs(c, now));
}

// a word lands: the ENGINE decides the grant (length curve, clue bonus, cap)
export function clockGrant(
  c: ClockState,
  word: { len: number; isClue: boolean },
  t: ClockTuning
): { clock: ClockState; grantMs: number } {
  const grantMs = engine.run.timeForWord({
    len: word.len,
    isClue: word.isClue,
    earnedMs: c.earnedMs,
    baseSecs: t.baseSecs,
    capSecs: t.capSecs,
  });
  return grantMs > 0 ? { clock: { ...c, earnedMs: c.earnedMs + grantMs }, grantMs } : { clock: c, grantMs: 0 };
}
