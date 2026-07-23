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

// ---- SWIPE-TO-GUESS (the finale's glide keyboard) ----
// Decode a glide over the keys into a guess candidate. The finale stacks the
// deck: we KNOW the word length and the locked greens, so the candidate space
// is tiny compared to real swipe-typing. Rules:
//   • candidate length = answer length, first/last letters = first/last keys
//   • the word (doubles collapsed — a glide can't dwell twice) must appear as
//     a SUBSEQUENCE of the glided key sequence
//   • locked greens must match their positions
//   • rank: shortest detour (seq length − word length), commons win ties
export function decodeSwipe(args: {
  seq: string[]; // keys crossed, in order, deduped consecutively (lowercase)
  len: number;
  greens: (string | null)[]; // locked letters by position (null = free)
  words: Iterable<string>; // the dictionary
  commons?: Set<string>; // starter list — tie-break toward human words
}): string | null {
  const { seq, len, greens, words, commons } = args;
  if (seq.length < 2) return null;
  const first = seq[0];
  const last = seq[seq.length - 1];

  const collapse = (w: string) => w.replace(/(.)\1+/g, '$1');
  const isSubseq = (needle: string, hay: string[]) => {
    let i = 0;
    for (const ch of hay) {
      if (ch === needle[i]) i++;
      if (i === needle.length) return true;
    }
    return i === needle.length;
  };

  let best: string | null = null;
  let bestScore = Infinity;
  for (const w of words) {
    if (w.length !== len) continue;
    if (w[0] !== first || w[len - 1] !== last) continue;
    let ok = true;
    for (let i = 0; i < len; i++) {
      if (greens[i] && w[i] !== greens[i]) { ok = false; break; }
    }
    if (!ok) continue;
    if (!isSubseq(collapse(w), seq)) continue;
    const score = (seq.length - len) - (commons?.has(w) ? 100 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = w;
    }
  }
  return best;
}
