// Day-state persistence — the engine's key registry (K) + typed helpers, the
// same keys the web app writes (compatibility contract; shapes match the
// SWORB_PREFIX/FOUND_PREFIX/DONE_PREFIX comments in sworble-store.js).
// Boot routing goes through engine.flow.startDailyRoute — consumed is checked
// FIRST, always (the zombie-run bug's 3-layer lesson, inherited as law).
import engine from '@sworbl/engine';

const { K } = engine.store;

export interface SworbState {
  guessesUsed: number;
  solved: boolean;
  bonus: number;
}

export interface DayState {
  route: 'consumed' | 'fresh';
  score: number;
  found: string[];
  sworb: SworbState | null;
}

export function loadDay(dayKey: string): DayState {
  const done = !!engine.store.getInt(K.DONE_PREFIX + dayKey, 0);
  const route = engine.flow.startDailyRoute({
    finale: false,
    onHome: false,
    consumed: done,
    dailyLive: false, // run-snapshot resume lands with the next increment
    over: false,
    hasTiles: false,
    finalePending: false,
  });
  return {
    route: route === 'consumed' ? 'consumed' : 'fresh',
    score: engine.store.getInt(K.DAILY_PREFIX + dayKey, 0),
    found: engine.store.getJSON(K.FOUND_PREFIX + dayKey, []) as string[],
    sworb: engine.store.getJSON(K.SWORB_PREFIX + dayKey, null) as SworbState | null,
  };
}

// live progress — cheap synchronous writes on change (MMKV/localStorage both sync)
export function saveProgress(dayKey: string, score: number, found: string[]): void {
  engine.store.set(K.DAILY_PREFIX + dayKey, score);
  engine.store.setJSON(K.FOUND_PREFIX + dayKey, found);
}

// the day ends exactly once: result + the DONE lock, in that order (a crash
// between the two leaves the day unlocked, never a locked day with no result)
export function finishDay(dayKey: string, score: number, found: string[], sworb: SworbState): void {
  engine.store.set(K.DAILY_PREFIX + dayKey, score);
  engine.store.setJSON(K.FOUND_PREFIX + dayKey, found);
  engine.store.setJSON(K.SWORB_PREFIX + dayKey, sworb);
  engine.store.set(K.DONE_PREFIX + dayKey, 1);
}
