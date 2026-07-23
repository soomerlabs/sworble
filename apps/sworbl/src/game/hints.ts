// HINT LADDER state — owner redesign 2026-07-23 ("hidden unless earned"):
// pills start BLANK; every grant is VALIDATED AT GIVE-TIME (solver-proven
// findable on the live board — a hint must never reference dead intel).
//   1. starter nudge: 3 words spelled + 0 clues found → ONE clue reveals its
//      first letter (+ sonar ping at its proven location)
//   2. free clue: 7 words spelled + clues still unfound → one clue auto-BANKS
//      (full word — finale intel; "you'll need something for the guess round")
//   3. finale floor: entering the finale with <2 found → top up to 2
// Replaces: always-on first letters, the token economy, the mercy pulse.
import engine from '@sworbl/engine';

const { K } = engine.store;

export interface HintLadder {
  words: number; // words spelled this round
  nudged: string | null; // the clue whose first letter was revealed (or null)
  freeGiven: boolean; // the 7-word free clue fired
  floorGiven: boolean; // the finale floor top-up fired
}

const FRESH: HintLadder = { words: 0, nudged: null, freeGiven: false, floorGiven: false };

export const NUDGE_AT_WORDS = 3;
export const FREE_CLUE_AT_WORDS = 7;
export const FINALE_FLOOR = 2;

export function loadLadder(dayKey: string): HintLadder {
  const s = engine.store.getJSON(K.HINT_TOKENS_PREFIX + dayKey, null) as Partial<HintLadder> | null;
  if (!s) return { ...FRESH };
  return {
    words: Number(s.words) || 0,
    nudged: typeof s.nudged === 'string' ? s.nudged : null,
    freeGiven: !!s.freeGiven,
    floorGiven: !!s.floorGiven,
  };
}

export function saveLadder(dayKey: string, st: HintLadder): void {
  engine.store.setJSON(K.HINT_TOKENS_PREFIX + dayKey, st);
}
