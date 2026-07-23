// THE LEXICON (owner: "every word a user has ever gotten — as many as
// possible for STATUS") — the lifetime collection. One compact map:
// word → best points ever paid. Appended at day-finish; the count is the
// status number, and the TITLE ladder gives it teeth.
import engine from '@sworbl/engine';
import { type BestWord } from '@/game/persist';

const LEX_KEY = 'sworbl_rn_lexicon';

export function loadLexicon(): Record<string, number> {
  const v = engine.store.getJSON(LEX_KEY, null) as Record<string, number> | null;
  return v && typeof v === 'object' ? v : {};
}

export function recordWords(words: BestWord[]): void {
  if (!words.length) return;
  const lex = loadLexicon();
  let changed = false;
  for (const w of words) {
    if (!(w.word in lex) || w.pts > lex[w.word]) {
      lex[w.word] = w.pts;
      changed = true;
    }
  }
  if (changed) engine.store.setJSON(LEX_KEY, lex);
}

export function lexiconCount(): number {
  return Object.keys(loadLexicon()).length;
}

// the STATUS ladder — climbing it is the collection's whole point
const TITLES: [number, string][] = [
  [1000, 'word cartographer'],
  [500, 'lexicon keeper'],
  [250, 'wordsmith'],
  [100, 'collector'],
  [25, 'word scout'],
  [0, 'fresh eyes'],
];

export function titleFor(count: number): string {
  for (const [floor, title] of TITLES) if (count >= floor) return title;
  return 'fresh eyes';
}

// next rung: [wordsToGo, nextTitle] — null at the summit
export function nextTitle(count: number): [number, string] | null {
  const above = [...TITLES].reverse().find(([floor]) => floor > count);
  return above ? [above[0] - count, above[1]] : null;
}
