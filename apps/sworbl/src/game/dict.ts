// Word validation + scoring, all through the engine. TWO-TIER dictionary
// (the web app's model, improved): the ~5k starter validates from the first
// frame; the FULL 135k list — bundled as an app asset, no network — swaps in
// moments after boot (loadFullDictionary in dictionary.ts). Commit-time
// callers read dict() fresh, so generosity upgrades mid-round, never mid-word.
import engine from '@sworbl/engine';

let dictCache: Set<string> | null = null;
let fullLoaded = false;

export function dict(): Set<string> {
  if (!dictCache) {
    dictCache = new Set(
      engine.words.FALLBACK_WORDS.split(/\s+/).filter((w: string) => w.length >= 3)
    );
  }
  return dictCache;
}

export function isFullDictionary(): boolean {
  return fullLoaded;
}

// the starter list as its own set (independent of the full-dict swap) — the
// glide decoder tie-breaks toward these human words
let starterCache: Set<string> | null = null;
export function starterWords(): Set<string> {
  if (!starterCache) {
    starterCache = new Set(
      engine.words.FALLBACK_WORDS.split(/\s+/).filter((w: string) => w.length >= 3)
    );
  }
  return starterCache;
}

// pure upgrade: feed the raw dictionary text, the validation set swaps to the
// full list (starter words are a subset — nothing ever becomes invalid).
// Exposed pure so tests can feed the real file without asset machinery.
export function applyFullDictionary(text: string): number {
  const full = new Set<string>();
  for (const w of text.split(/\s+/)) {
    if (w.length >= 3) full.add(w.toLowerCase());
  }
  if (full.size < 50000) return 0; // corrupt/truncated asset: keep the starter
  dictCache = full;
  fullLoaded = true;
  return full.size;
}

// ≤6-char prefixes as a PLAIN OBJECT — worklet-copyable via shared value
// (PHASE2-REQUIREMENTS #3: never capture big objects in worklet closures)
let prefixCache: Record<string, 1> | null = null;
export function prefixMap(): Record<string, 1> {
  if (!prefixCache) {
    prefixCache = {};
    // DELIBERATELY the STARTER list, never the full 135k: the trace bias
    // should nudge toward words people actually spell, and the full list's
    // obscurities would dilute the nudge AND triple the worklet-copied map.
    for (const w of engine.words.FALLBACK_WORDS.split(/\s+/)) {
      if (w.length < 3) continue;
      const n = Math.min(w.length, 6);
      for (let i = 1; i <= n; i++) prefixCache[w.slice(0, i)] = 1;
    }
  }
  return prefixCache;
}

export function scoreWord(word: string): number {
  const base = [...word].reduce((s, ch) => s + engine.core.letterVal(ch), 0);
  return Math.round(base * 10 * engine.core.lenMult(word.length));
}
