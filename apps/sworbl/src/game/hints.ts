// HINT AIDS state — per-day token bank under the engine's HINT_TOKENS_PREFIX.
// Decisions are the ENGINE's (hintTokenEvents, mercyPulseShouldFire,
// firstUnfoundClue); this module only persists what happened.
// Owner-locked design (2026-07-23): token spend = SONAR PING on the clue's
// STARTING TILE (a compass, not an answer — the full-path glow was retired);
// mercy pulse auto-pings token-free. Full minesweeper deduction: mode backlog.
import engine from '@sworbl/engine';

const { K } = engine.store;

export interface TokenState {
  count: number; // spendable tokens right now
  granted: number; // lifetime grants this round (guards the one-per-round rule)
  mercyFired: boolean;
  words: number; // words spelled this round (the earn threshold input)
}

const FRESH: TokenState = { count: 0, granted: 0, mercyFired: false, words: 0 };

export function loadTokens(dayKey: string): TokenState {
  const s = engine.store.getJSON(K.HINT_TOKENS_PREFIX + dayKey, null) as Partial<TokenState> | null;
  if (!s) return { ...FRESH };
  return {
    count: Number(s.count) || 0,
    granted: Number(s.granted) || 0,
    mercyFired: !!s.mercyFired,
    words: Number(s.words) || 0,
  };
}

export function saveTokens(dayKey: string, st: TokenState): void {
  engine.store.setJSON(K.HINT_TOKENS_PREFIX + dayKey, st);
}
