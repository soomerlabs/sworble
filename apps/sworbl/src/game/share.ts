// THE SHARE CARD (owner: "wordle share but sworbl style") — pure text
// builder, no RN imports (unit-tested in tests/share.test.ts).
//
//   sworbl Nº 24 · connector
//   🟪🟦⬛🟥🟨⬛ 4/6 · +2 bonus
//   ⬛⬛🟪 cracked in 3
//   4,120 pts
//
// Line 2 is the CLUE FAN as candy squares — each slot wears its palette
// color when caught, ⬛ when missed. Line 3 is the finale: ⬛ per miss,
// 🟪 the crack (or ✗ not cracked). The archetype ships in the header —
// the day is over, and the twist label markets the variety.
import { TUNING } from '@/game/tuning';

// slot → emoji square, mirroring the clue fan's PALETTE order
const SLOT_SQ = ['🟪', '🟦', '🟩', '🟥', '🟨', '🟧'];

export function puzzleNo(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  const [ey, em, ed] = TUNING.PUZZLE_EPOCH.split('-').map(Number);
  return Math.max(1, Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ey, em - 1, ed)) / 86400000) + 1);
}

export interface ShareArgs {
  dayKey: string;
  archetypeLabel: string | null; // display label, or null for untagged days
  clues: string[]; // the core 6
  found: string[]; // everything banked (may include bonus-wave words)
  solved: boolean;
  guessesUsed: number;
  score: number;
}

export function buildShareText(a: ShareArgs): string {
  const head = `sworbl Nº ${puzzleNo(a.dayKey)}${a.archetypeLabel ? ` · ${a.archetypeLabel}` : ''}`;

  const caught = a.clues.filter((c) => a.found.includes(c));
  const fan = a.clues.map((c, i) => (a.found.includes(c) ? SLOT_SQ[i % SLOT_SQ.length] : '⬛')).join('');
  const bonus = a.found.filter((w) => !a.clues.includes(w)).length;
  const clueLine = `${fan} ${caught.length}/${a.clues.length}${bonus > 0 ? ` · +${bonus} bonus` : ''}`;

  const guessLine = a.solved
    ? `${'⬛'.repeat(Math.max(0, a.guessesUsed - 1))}🟪 cracked in ${a.guessesUsed}`
    : `${'⬛'.repeat(Math.max(1, a.guessesUsed))} ✗ not cracked`;

  return `${head}\n${clueLine}\n${guessLine}\n${a.score.toLocaleString()} pts`;
}
