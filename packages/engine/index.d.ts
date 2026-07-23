// Type surface for the JS engine — grows as Phase 2 consumes more of the API.
// The modules themselves stay JavaScript (frozen, tested, deterministic);
// these declarations are the TS-side contract.

export interface SworbleCore {
  /** Seeded PRNG — DETERMINISM CONTRACT: output is frozen, tests pin values. */
  mulberry32(seed: number): () => number;
  /** Stable string → 32-bit int hash (daily/leaderboard seed derivation). */
  hashSeed(str: string): number;
  /** Local calendar day key, e.g. "2026-07-22". */
  dayKey(d: Date): string;
  msToNextDay(d: Date): number;
  VALUES: Record<string, number>;
  BAG: string;
  VOWELS: string;
  FRIENDLY: string;
  /** Fisher-Yates over a letter-bag string, driven by a seeded rng. */
  shuffledBag(bag: string, rng: () => number): string[];
  expandLetter(ch: string): string;
  dispLetter(ch: string): string;
  letterVal(ch: string): number;
  lenMult(n: number): number;
  streakMult(streak: number): number;
  containsFoulTerm(s: string): boolean;
}

declare const engine: {
  core: SworbleCore;
  // typed as the API gets consumed in Phase 2:
  seed: any;
  solver: any;
  daily: any;
  status: any;
  flow: any;
  run: any;
  store: any;
  net: any;
  words: { FALLBACK_WORDS: string };
};

export = engine;
