// The finale's guess transition, extracted PURE (modules decide, screens act).
// This pins the caller contract around engine.nextSlots that already bit once:
// on a miss, GREENS lock in place, YELLOWS persist as dashed hints, GRAYS clear
// to empty NOW — nextSlots expects exactly that shape as its next input.
import engine from '@sworbl/engine';

export interface GuessRow {
  letters: string[];
  colors: string[];
}

export type GuessOutcome =
  | { kind: 'reject' } // incomplete row — nothing changes
  | { kind: 'solved'; rows: GuessRow[]; usedNow: number; bonus: number }
  | { kind: 'lockout'; rows: GuessRow[]; usedNow: number }
  | {
      kind: 'miss';
      rows: GuessRow[];
      usedNow: number;
      slots: string[]; // greens + yellows carried, grays cleared
      colors: (string | null)[]; // green/yellow kept, gray → null
    };

export function applyGuess(args: {
  slots: string[];
  rows: GuessRow[];
  guessesUsed: number;
  sworb: string;
  foundCount: number;
  clueTotal: number;
}): GuessOutcome {
  const { slots, rows, guessesUsed, sworb, foundCount, clueTotal } = args;
  const len = sworb.length;
  const word = slots.join('');
  if (word.length < len || slots.some((s) => !s)) return { kind: 'reject' };

  const res = engine.daily.applySworbGuess({
    entry: { sworb },
    input: word,
    guessesUsed,
    solved: false,
    foundCount,
    total: clueTotal,
  });
  if (!res.ok) return { kind: 'reject' };

  const usedNow = res.newGuessesUsed ?? guessesUsed + 1;
  const rowColors = engine.daily.scoreGuess(word, sworb);
  const newRows = [...rows, { letters: slots.slice(), colors: rowColors }];

  if (res.nowSolved) return { kind: 'solved', rows: newRows, usedNow, bonus: res.bonus ?? 0 };
  if (res.lockedOut) return { kind: 'lockout', rows: newRows, usedNow };

  return {
    kind: 'miss',
    rows: newRows,
    usedNow,
    slots: slots.map((l, i) => (rowColors[i] === 'gray' ? '' : l)),
    colors: rowColors.map((c) => (c === 'gray' ? null : c)),
  };
}
